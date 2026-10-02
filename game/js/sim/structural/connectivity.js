"use strict";

const { charge, BUDGET } = require("./counter.js");

const DEFAULTS = Object.freeze({
    readsPerTick: 512,
    maxVisits: 65536,
    maxFallVoxels: 20000,
    maxActiveJobs: 4,
    maxCommitsPerTick: 1
});

const DIRS = Object.freeze([
    { dx: 0, dy: 0, dg: -1 }, // DOWN
    { dx: 0, dy: -1, dg: 0 }, // N
    { dx: 1, dy: 0, dg: 0 },  // E
    { dx: 0, dy: 1, dg: 0 },  // S
    { dx: -1, dy: 0, dg: 0 }, // W
    { dx: 0, dy: 0, dg: 1 }   // UP
]);

function requireOptions(opts) {
    if (opts === undefined || opts === null) return {};
    if (typeof opts !== "object") throw new TypeError("structural/connectivity: opts must be an object");
    for (const key of Object.keys(opts)) {
        if (!["counter", "maxVisits", "overlay"].includes(key)) {
            throw new TypeError(`structural/connectivity: unknown option "${key}"`);
        }
    }
    return opts;
}

function vkey(x, y, g) {
    return `${x},${y},${g}`;
}

function* runHeldJob(ctx, reader, seed) {
    let sx = seed.x, sy = seed.y, sg = seed.g;
    if (reader.canon) {
        const c = reader.canon(sx, sy);
        if (c) { sx = c.x; sy = c.y; }
    }
    
    yield* charge(ctx, "read");
    let sol = ctx.overlay && ctx.overlay.x === sx && ctx.overlay.y === sy && ctx.overlay.g === sg ? true : reader.solidG(sx, sy, sg);
    if (sol !== true) {
        return { verdict: "not_solid", reason: "seed_not_solid", anchor: null, visited: 0, component: null, watch: null, ops: ctx.ops };
    }

    const maxVisits = ctx.maxVisits;
    const visited = new Set();
    const stack = [];
    const component = [];
    const watch = [];
    
    const pushNode = (x, y, g) => {
        const k = vkey(x, y, g);
        if (visited.has(k)) return;
        visited.add(k);
        stack.push({ x, y, g, dirIdx: 0 });
    };

    pushNode(sx, sy, sg);

    while (stack.length > 0) {
        const frame = stack[stack.length - 1];
        
        if (frame.dirIdx === 0) {
            yield* charge(ctx, "visit");
            if (visited.size > maxVisits) {
                return { verdict: "held", reason: "too_large", anchor: null, visited: visited.size, component: null, watch: null, ops: ctx.ops };
            }
            
            yield* charge(ctx, "read");
            const anchor = reader.anchorG(frame.x, frame.y, frame.g);
            if (anchor === true) {
                const isFloor = (reader.floorG !== null && frame.g === reader.floorG);
                return { verdict: "held", reason: isFloor ? "floor" : "certified", anchor: [frame.x, frame.y, frame.g], visited: visited.size, component: null, watch: null, ops: ctx.ops };
            } else if (anchor === "pending") {
                watch.push([frame.x, frame.y, frame.g]);
            }
            component.push(frame);
        }

        if (frame.dirIdx < DIRS.length) {
            const d = DIRS[frame.dirIdx++];
            let nx = frame.x + d.dx, ny = frame.y + d.dy, ng = frame.g + d.dg;
            if (reader.canon) {
                const c = reader.canon(nx, ny);
                if (c) { nx = c.x; ny = c.y; }
            }
            const nk = vkey(nx, ny, ng);
            if (!visited.has(nk)) {
                yield* charge(ctx, "read");
                const nSol = ctx.overlay && ctx.overlay.x === nx && ctx.overlay.y === ny && ctx.overlay.g === ng ? true : reader.solidG(nx, ny, ng);
                if (nSol === "pending") {
                    watch.push([nx, ny, ng]);
                } else if (nSol === true) {
                    pushNode(nx, ny, ng);
                }
            }
        } else {
            stack.pop();
        }
    }

    if (watch.length > 0) {
        watch.sort((a, b) => (a[2] - b[2]) || (a[1] - b[1]) || (a[0] - b[0]));
        return { verdict: "held", reason: "unknown_edge", anchor: null, visited: visited.size, component: null, watch, ops: ctx.ops };
    }

    component.sort((a, b) => (a.g - b.g) || (a.y - b.y) || (a.x - b.x));
    const compOut = component.map(c => [c.x, c.y, c.g]);
    return { verdict: "falls", reason: "no_anchor", anchor: null, visited: visited.size, component: compOut, watch: null, ops: ctx.ops };
}

function createHeldJob(reader, seed, opts) {
    opts = requireOptions(opts);
    const ctx = {
        counter: null,
        ops: { read: 0, visit: 0, total: 0 },
        maxVisits: opts.maxVisits !== undefined ? opts.maxVisits : DEFAULTS.maxVisits,
        overlay: opts.overlay
    };
    const gen = runHeldJob(ctx, reader, seed);
    let result = null, error = null, done = false;
    return {
        get done() { return done; },
        get result() { return result; },
        get ops() { return Object.assign({}, ctx.ops); },
        step(counter) {
            if (error) throw error;
            if (done) return true;
            if (!counter || typeof counter.charge !== "function") throw new TypeError("structural/connectivity: step needs an ops counter");
            ctx.counter = counter;
            try {
                const r = gen.next();
                if (r.done) { done = true; result = r.value; }
            } catch (e) {
                error = e;
                throw e;
            } finally {
                ctx.counter = null;
            }
            return done;
        }
    };
}

function evaluateHeld(reader, seed, opts) {
    opts = requireOptions(opts);
    const job = createHeldJob(reader, seed, opts);
    let c = opts.counter;
    if (!c) {
        c = { charge: () => true };
    }
    while (!job.step(c)) {
        if (opts.counter) {
            return { verdict: "pending", reason: "budget", job, ops: Object.assign({}, job.ops) };
        }
    }
    return job.result;
}

function wouldBeHeld(reader, addr, opts) {
    opts = requireOptions(opts);
    opts = Object.assign({}, opts, { overlay: addr });
    return evaluateHeld(reader, addr, opts);
}

module.exports = {
    DEFAULTS,
    createHeldJob,
    evaluateHeld,
    wouldBeHeld
};
