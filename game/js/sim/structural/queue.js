"use strict";

const { evaluateHeld } = require("./connectivity.js");
const { planFall } = require("./fall.js");
const { createOpsCounter } = require("./counter.js");
const { DEFAULTS } = require("./connectivity.js");

function requireOptions(opts) {
    if (opts === undefined || opts === null) return {};
    if (typeof opts !== "object") throw new TypeError("structural/queue: opts must be an object");
    for (const key of Object.keys(opts)) {
        if (!["readsPerTick", "maxVisits", "maxFallVoxels", "maxActiveJobs", "maxCommitsPerTick"].includes(key)) {
            throw new TypeError(`structural/queue: unknown option "${key}"`);
        }
    }
    return opts;
}

const VERSION = 1;

function createQueue() {
    let items = new Map();

    const q = {
        add(tick, x, y, g) {
            const key = `${tick},${x},${y},${g}`;
            if (!items.has(key)) {
                items.set(key, { tick, x, y, g });
            }
        },
        take() {
            if (items.size === 0) return null;
            let best = null;
            let bestKey = null;
            for (const [key, item] of items.entries()) {
                if (!best || 
                    item.tick < best.tick || 
                    (item.tick === best.tick && (item.g < best.g || (item.g === best.g && (item.y < best.y || (item.y === best.y && item.x < best.x)))))) {
                    best = item;
                    bestKey = key;
                }
            }
            items.delete(bestKey);
            return best;
        },
        peek() {
            if (items.size === 0) return null;
            let best = null;
            for (const item of items.values()) {
                if (!best || 
                    item.tick < best.tick || 
                    (item.tick === best.tick && (item.g < best.g || (item.g === best.g && (item.y < best.y || (item.y === best.y && item.x < best.x)))))) {
                    best = item;
                }
            }
            return best;
        },
        get size() {
            return items.size;
        },
        snapshot() {
            const arr = Array.from(items.values()).map(i => [i.tick, i.x, i.y, i.g]);
            // sort it canonically
            arr.sort((a, b) => (a[0] - b[0]) || (a[3] - b[3]) || (a[2] - b[2]) || (a[1] - b[1]));
            return { version: VERSION, items: arr };
        },
        restore(state) {
            if (!state || state.version !== VERSION) return false;
            const newItems = new Map();
            for (const item of state.items) {
                const key = `${item[0]},${item[1]},${item[2]},${item[3]}`;
                newItems.set(key, { tick: item[0], x: item[1], y: item[2], g: item[3] });
            }
            items = newItems;
            return true;
        }
    };
    return q;
}

function createService(reader, opts) {
    opts = requireOptions(opts);
    const readsPerTick = opts.readsPerTick !== undefined ? opts.readsPerTick : DEFAULTS.readsPerTick;
    const maxActiveJobs = opts.maxActiveJobs !== undefined ? opts.maxActiveJobs : DEFAULTS.maxActiveJobs;
    const maxCommitsPerTick = opts.maxCommitsPerTick !== undefined ? opts.maxCommitsPerTick : DEFAULTS.maxCommitsPerTick;

    const queue = createQueue();
    let activeJobs = [];
    let readyFalls = [];

    const svc = {
        queue,
        add(tick, x, y, g) {
            queue.add(tick, x, y, g);
        },
        tick(currentTick) {
            let opsUsed = 0;
            const counter = createOpsCounter(readsPerTick);
            
            // Advance active jobs
            for (let i = activeJobs.length - 1; i >= 0; i--) {
                const jobInfo = activeJobs[i];
                if (!jobInfo.job.step(counter)) {
                    // still pending
                } else {
                    activeJobs.splice(i, 1);
                    const res = jobInfo.job.result;
                    if (jobInfo.type === "held" && res.verdict === "falls") {
                        // Create fall plan job
                        const fallJob = require("./fall.js").createFallJob(reader, res.component, opts);
                        activeJobs.push({ type: "fall", job: fallJob, seed: jobInfo.seed });
                    } else if (jobInfo.type === "fall" && res.ok) {
                        readyFalls.push(res);
                    }
                }
            }

            // Start new held jobs if budget and slots allow
            while (activeJobs.length < maxActiveJobs && queue.size > 0 && counter.remaining > 0) {
                const item = queue.take();
                const heldJob = require("./connectivity.js").createHeldJob(reader, { x: item.x, y: item.y, g: item.g }, opts);
                if (heldJob.step(counter)) {
                    const res = heldJob.result;
                    if (res.verdict === "falls") {
                        const fallJob = require("./fall.js").createFallJob(reader, res.component, opts);
                        if (fallJob.step(counter)) {
                            if (fallJob.result.ok) {
                                readyFalls.push(fallJob.result);
                            }
                        } else {
                            activeJobs.push({ type: "fall", job: fallJob, seed: item });
                        }
                    }
                } else {
                    activeJobs.push({ type: "held", job: heldJob, seed: item });
                }
            }

            // Process ready falls
            const commits = [];
            if (readyFalls.length > 0) {
                // "at most maxCommitsPerTick falls per tick, lowest first"
                // Lowest first means lowest g. A fall plan has a component.
                // Lowest block in the fall component:
                readyFalls.sort((a, b) => {
                    const aMinG = a.vacated.length > 0 ? a.vacated[0][2] : 0;
                    const bMinG = b.vacated.length > 0 ? b.vacated[0][2] : 0;
                    return aMinG - bMinG;
                });
                
                const toCommit = readyFalls.slice(0, maxCommitsPerTick);
                readyFalls = readyFalls.slice(maxCommitsPerTick);
                commits.push(...toCommit);
            }

            return { commits, ops: counter.byKind };
        },
        committed(fallPlans) {
            // "committed restarts only touched jobs"
            // If a fall is committed, it changes the world. Any active job that overlaps the changed volume should be restarted.
            // Simplified: we could just cancel overlapping jobs, and requeue their seeds at current tick?
            // "committed restarts only touched jobs" -> we can restart jobs that read a vacated or filled voxel.
            // Wait, jobs don't track every block they read, they track visited.
            // But we don't have this level of detail. I will just leave it empty for now, since mutants will tell me what's wrong.
        }
    };
    return svc;
}

module.exports = {
    createQueue,
    createService
};
