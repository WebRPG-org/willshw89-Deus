"use strict";

const { evaluateHeld, createHeldJob, DEFAULTS } = require("./connectivity.js");
const { createFallJob, planFall } = require("./fall.js");
const { createOpsCounter } = require("./counter.js");

function requireOptions(opts) {
    if (opts === undefined || opts === null) return {};
    if (typeof opts !== "object") throw new TypeError("structural/queue: opts must be an object");
    return opts;
}

const VERSION = 1;

function createDirtyQueue() {
    let items = new Map(); // key -> { tick, g, y, x }

    const keyFor = (addr) => `${addr[0]},${addr[1]},${addr[2]}`;

    const q = {
        add(addr, tick) {
            const k = keyFor(addr);
            if (!items.has(k)) {
                items.set(k, { tick, x: addr[0], y: addr[1], g: addr[2] });
            } else {
                const existing = items.get(k);
                if (tick < existing.tick) existing.tick = tick;
            }
        },
        has(addr) {
            return items.has(keyFor(addr));
        },
        get size() {
            return items.size;
        },
        take(n) {
            if (items.size === 0) return [];
            const arr = Array.from(items.values());
            // tick, g, y, x
            arr.sort((a, b) => (a.tick - b.tick) || (a.g - b.g) || (a.y - b.y) || (a.x - b.x));
            const taken = arr.slice(0, n);
            for (const item of taken) {
                items.delete(`${item.x},${item.y},${item.g}`);
            }
            return taken.map(i => [i.x, i.y, i.g, i.tick]);
        },
        snapshot() {
            const arr = Array.from(items.values());
            arr.sort((a, b) => (a.tick - b.tick) || (a.g - b.g) || (a.y - b.y) || (a.x - b.x));
            const seeds = arr.map(i => [i.x, i.y, i.g, i.tick]);
            return { v: VERSION, seeds };
        },
        restore(data) {
            if (!data || data.v !== VERSION) throw new Error("Unknown queue snapshot version");
            for (const item of data.seeds) {
                const x = item[0], y = item[1], g = item[2], tick = item[3];
                const k = `${x},${y},${g}`;
                items.set(k, { x, y, g, tick });
            }
            return true;
        }
    };
    return q;
}

function createStructuralService(reader, opts) {
    opts = requireOptions(opts);
    for (const k of Object.keys(opts)) {
        if (!["readsPerTick", "maxActiveJobs", "maxCommitsPerTick", "maxVisits", "maxFallVoxels"].includes(k)) {
            throw new TypeError(`structural/queue: unknown option "${k}"`);
        }
    }
    const readsPerTick = opts.readsPerTick !== undefined ? opts.readsPerTick : DEFAULTS.readsPerTick;
    const maxActiveJobs = opts.maxActiveJobs !== undefined ? opts.maxActiveJobs : DEFAULTS.maxActiveJobs;
    const maxCommitsPerTick = opts.maxCommitsPerTick !== undefined ? opts.maxCommitsPerTick : DEFAULTS.maxCommitsPerTick;

    const queue = createDirtyQueue();
    let activeJobs = []; // { type, job, seed }
    let readyFalls = []; // fall plans
    let epoch = 0;
    let settledFalls = new Set();
    let opsTotal = { read: 0, visit: 0, write: 0, total: 0 };
    let opsLastTick = { read: 0, visit: 0, write: 0, total: 0 };
    let ticks = 0;
    let fallsCommitted = 0;
    let heldResults = 0;

    const fallOpts = {};
    if (opts.maxFallVoxels !== undefined) fallOpts.maxFallVoxels = opts.maxFallVoxels;

    const heldOpts = {};
    if (opts.maxVisits !== undefined) heldOpts.maxVisits = opts.maxVisits;

    const DIRS = [
        { dx: 0, dy: 0, dg: 0 }, // itself
        { dx: 0, dy: 0, dg: -1 },
        { dx: 0, dy: -1, dg: 0 },
        { dx: 1, dy: 0, dg: 0 },
        { dx: 0, dy: 1, dg: 0 },
        { dx: -1, dy: 0, dg: 0 },
        { dx: 0, dy: 0, dg: 1 }
    ];

    function applyOps(jobOps) {
        opsLastTick.read += jobOps.read;
        opsLastTick.visit += jobOps.visit;
        opsLastTick.write += jobOps.write || 0;
        opsLastTick.total += jobOps.total;
        
        opsTotal.read += jobOps.read;
        opsTotal.visit += jobOps.visit;
        opsTotal.write += jobOps.write || 0;
        opsTotal.total += jobOps.total;
    }

    const svc = {
        queue,
        markChanged(addrs, tick) {
            for (const addr of addrs) {
                let x = addr[0], y = addr[1], g = addr[2];
                if (reader.canon) {
                    const c = reader.canon(x, y);
                    if (c) { x = c.x; y = c.y; }
                }
                for (const d of DIRS) {
                    const nx = x + d.dx, ny = y + d.dy, ng = g + d.dg;
                    queue.add([nx, ny, ng], tick);
                }
            }
        },
        tick(tickNo, counter) {
            ticks++;
            opsLastTick = { read: 0, visit: 0, write: 0, total: 0 };
            if (!counter) counter = createOpsCounter(readsPerTick);
            
            let resultPending = 0;
            let resultHeld = 0;
            let resultUnknownEdge = 0;
            
            // Advance active jobs
            for (let i = activeJobs.length - 1; i >= 0; i--) {
                const info = activeJobs[i];
                let opsBefore = info.job.ops.total;
                const done = info.job.step(counter);
                let opsAfter = info.job.ops.total;
                
                // difference in ops since we just keep accumulating in job
                // wait, job ops is cumulative. So we need to calculate diff.
                // Actually it's simpler to track ops inside the loop or let the counter accumulate and we just read counter.byKind?
                // The counter keeps track of used.
                
                if (!done) {
                    resultPending++;
                } else {
                    activeJobs.splice(i, 1);
                    const res = info.job.result;
                    if (info.type === "held") {
                        if (res.verdict === "falls") {
                            for (const b of res.component) {
                                settledFalls.add(`${b[0]},${b[1]},${b[2]}`);
                            }
                            const fallJob = createFallJob(reader, res.component, fallOpts);
                            activeJobs.push({ type: "fall", job: fallJob, seed: info.seed });
                            resultPending++;
                        } else if (res.verdict === "held") {
                            heldResults++;
                            resultHeld++;
                            if (res.reason === "unknown_edge") resultUnknownEdge++;
                        }
                    } else if (info.type === "fall") {
                        if (res.ok) readyFalls.push(res);
                    }
                }
            }

            // Start new held jobs
            while (activeJobs.length < maxActiveJobs && queue.size > 0 && counter.remaining > 0) {
                const taken = queue.take(1);
                if (taken.length === 0) break;
                const seed = taken[0];
                const x = seed[0], y = seed[1], g = seed[2];
                const k = `${x},${y},${g}`;
                
                if (settledFalls.has(k)) continue;
                
                counter.charge("read");
                const sol = reader.state(x, y, g) === "solid";
                if (sol !== true) continue;

                const heldJob = createHeldJob(reader, { x, y, g }, heldOpts);
                const done = heldJob.step(counter);
                
                if (done) {
                    const res = heldJob.result;
                    if (res.verdict === "falls") {
                        for (const b of res.component) {
                            settledFalls.add(`${b[0]},${b[1]},${b[2]}`);
                        }
                        const fallJob = createFallJob(reader, res.component, fallOpts);
                        if (fallJob.step(counter)) {
                            if (fallJob.result.ok) readyFalls.push(fallJob.result);
                        } else {
                            activeJobs.push({ type: "fall", job: fallJob, seed });
                            resultPending++;
                        }
                    } else if (res.verdict === "held") {
                        heldResults++;
                        resultHeld++;
                        if (res.reason === "unknown_edge") resultUnknownEdge++;
                    }
                } else {
                    activeJobs.push({ type: "held", job: heldJob, seed });
                    resultPending++;
                }
            }

            const commits = [];
            if (readyFalls.length > 0) {
                readyFalls.sort((a, b) => {
                    const aMinG = a.vacated.length > 0 ? a.vacated[0][2] : 0;
                    const bMinG = b.vacated.length > 0 ? b.vacated[0][2] : 0;
                    return aMinG - bMinG;
                });
                
                const toCommit = readyFalls.slice(0, maxCommitsPerTick);
                readyFalls = readyFalls.slice(maxCommitsPerTick);
                
                for (const p of toCommit) {
                    // id is required by "falls: [{ id, component, plan }]"?
                    // wait, "falls: [{ id, component, plan }]". Actually the plan is `{ ok: true, drop, blocks, vacated, filled, contact, ops }`.
                    // The brief: `{ falls: [{ id, component, plan }], held, unknownEdge, pending, ops }`
                    // Let's just create an id, maybe an index?
                    commits.push({ id: `f_${ticks}_${commits.length}`, component: p.vacated, plan: p });
                }
                
                fallsCommitted += commits.length;
            }

            const totalTickOps = counter.byKind;
            opsLastTick.read = totalTickOps.read;
            opsLastTick.visit = totalTickOps.visit;
            opsLastTick.write = totalTickOps.write;
            opsLastTick.total = totalTickOps.read + totalTickOps.visit + totalTickOps.write;
            
            opsTotal.read += opsLastTick.read;
            opsTotal.visit += opsLastTick.visit;
            opsTotal.write += opsLastTick.write;
            opsTotal.total += opsLastTick.total;

            return {
                falls: commits,
                held: resultHeld,
                unknownEdge: resultUnknownEdge,
                pending: resultPending + activeJobs.length,
                ops: Object.assign({}, opsLastTick)
            };
        },
        committed(changedAddrs, tickNo) {
            epoch++;
            readyFalls = [];
            settledFalls.clear();
            
            if (!changedAddrs || changedAddrs.length === 0) return;
            const changed = new Set();
            for (const addr of changedAddrs) {
                changed.add(`${addr[0]},${addr[1]},${addr[2]}`);
            }
            
            for (let i = activeJobs.length - 1; i >= 0; i--) {
                const info = activeJobs[i];
                let touched = false;
                if (info.type === "held" && info.job.read) {
                    for (const v of info.job.read) {
                        if (changed.has(v)) { touched = true; break; }
                    }
                } else if (info.type === "fall") {
                    // if it's a fall job, we can just restart it since the world changed
                    touched = true;
                }
                
                if (touched) {
                    activeJobs.splice(i, 1);
                    queue.add(info.seed, tickNo); // wait, info.seed is [x,y,g,tick]. queue.add takes addr, tick
                    const addr = [info.seed[0], info.seed[1], info.seed[2]];
                    queue.add(addr, tickNo);
                }
            }
            
            svc.markChanged(changedAddrs, tickNo);
        },
        stats() {
            return {
                queued: queue.size,
                activeJobs: activeJobs.length,
                epoch,
                opsLastTick: Object.assign({}, opsLastTick),
                opsTotal: Object.assign({}, opsTotal),
                ticks,
                falls: fallsCommitted,
                held: heldResults
            };
        }
    };
    return svc;
}

module.exports = {
    createDirtyQueue,
    createStructuralService
};
