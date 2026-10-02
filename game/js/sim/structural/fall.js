"use strict";

const { charge, BUDGET } = require("./counter.js");
const { DEFAULTS } = require("./connectivity.js");

function requireOptions(opts) {
    if (opts === undefined || opts === null) return {};
    if (typeof opts !== "object") throw new TypeError("structural/fall: opts must be an object");
    for (const key of Object.keys(opts)) {
        if (!["counter", "maxFallVoxels"].includes(key)) {
            throw new TypeError(`structural/fall: unknown option "${key}"`);
        }
    }
    return opts;
}

function vkey(x, y, g) {
    return `${x},${y},${g}`;
}

function* runFallJob(ctx, reader, component) {
    if (component.length > ctx.maxFallVoxels) {
        return { ok: false, reason: "too_large", ops: ctx.ops };
    }

    const piece = new Set();
    for (const b of component) {
        let x = b[0], y = b[1];
        if (reader.canon) {
            const c = reader.canon(x, y);
            if (c) { x = c.x; y = c.y; }
        }
        piece.add(vkey(x, y, b[2]));
    }

    // scan lowest block of each column first -> group by x,y and sort by g
    // actually, we can just sort component by g descending (lowest g is smallest? no, g increases downwards? Wait, gOf(z,s).
    // Let's check `reader.js`: z is height? Or depth? zMin=-2, zMax=2. "above zMax is open sky". So higher z = higher altitude.
    // gOf(z,s) = 64*(z+16)+s. Higher g means higher altitude?
    // Wait! "the straight-down path is explored first ... DOWN".
    // In connectivity.js I used DIRS[0] = { dx: 0, dy: 0, dg: -1 } for DOWN.
    // So smaller g is DOWN! "drop = g(b) minus g of first non-piece ... minus 1"
    // Drop is positive. So g decreases as it drops.

    let bestDrop = Infinity;
    let contact = null;

    // Group by column and find the lowest block in each column
    // Wait, the rule is: "stop scanning a block once its gap exceeds the best drop so far, and scan the lowest block of each column first."
    // Actually, we must scan ALL blocks in the component, but we can process the lowest block of each column first to shrink `bestDrop` quickly.
    
    // So let's organize columns:
    const cols = new Map();
    for (const b of component) {
        let x = b[0], y = b[1];
        if (reader.canon) {
            const c = reader.canon(x, y);
            if (c) { x = c.x; y = c.y; }
        }
        const k = `${x},${y}`;
        if (!cols.has(k)) cols.set(k, []);
        cols.get(k).push({ x, y, g: b[2] });
    }

    for (const list of cols.values()) {
        // Sort ascending by g (lowest first)
        list.sort((a, b) => a.g - b.g);
    }

    // Now iterate each block. To minimize reads, we iterate the first blocks of all columns, then second blocks, etc.
    let changed = true;
    let depth = 0;
    while (changed) {
        changed = false;
        for (const list of cols.values()) {
            if (depth >= list.length) continue;
            changed = true;
            const b = list[depth];
            let g = b.g - 1;
            let currentDrop = 0;
            
            while (true) {
                if (currentDrop > bestDrop) break; // Exceeds best drop, stop scanning this block
                
                yield* charge(ctx, "read");
                const sol = reader.solidG(b.x, b.y, g);
                if (sol === "pending") {
                    return { ok: false, reason: "unknown_below", ops: ctx.ops };
                }
                
                if (sol === true && !piece.has(vkey(b.x, b.y, g))) {
                    if (currentDrop < bestDrop) {
                        bestDrop = currentDrop;
                        contact = [b.x, b.y, g];
                    } else if (currentDrop === bestDrop) {
                        // Tie breaker for contact? The brief just says "the first non-piece solid under the binding block". Any is fine, or maybe the one with lowest g?
                        // If it's a tie, we don't strictly need to override.
                    }
                    break;
                }
                
                // If we reach the floor
                if (reader.floorG !== null && g === reader.floorG) {
                    if (currentDrop + 1 < bestDrop) {
                        bestDrop = currentDrop + 1;
                        contact = null; // World floor binds
                    }
                    break;
                }
                
                // Air or piece occupied
                g--;
                currentDrop++;
            }
        }
        depth++;
    }

    if (bestDrop === 0) {
        return { ok: false, reason: "no_room", ops: ctx.ops };
    }

    // Calculate vacated and filled
    const vacated = [];
    const filled = [];
    
    for (const b of component) {
        const destK = vkey(b[0], b[1], b[2] - bestDrop);
        if (!piece.has(destK)) {
            filled.push([b[0], b[1], b[2] - bestDrop]);
        }
        const srcK = vkey(b[0], b[1], b[2] + bestDrop);
        if (!piece.has(srcK)) { // Wait, piece is the source. If the block above us is not in piece, then WE are vacating this spot.
            // Actually, vacated is "piece positions not in filled". 
            // The destination of some other piece block could be our current position.
            // Is our current position in the destinations?
            // Destination of block at g + bestDrop is g. So if piece has g + bestDrop, our spot is filled by it.
            // If not, our spot is vacated.
            if (!piece.has(vkey(b[0], b[1], b[2] + bestDrop))) {
                vacated.push([b[0], b[1], b[2]]);
            }
        }
    }

    const sortFn = (a, b) => (a[2] - b[2]) || (a[1] - b[1]) || (a[0] - b[0]);
    vacated.sort(sortFn);
    filled.sort(sortFn);

    return { 
        ok: true, 
        drop: bestDrop, 
        blocks: component.length,
        vacated, 
        filled, 
        contact, 
        ops: ctx.ops 
    };
}

function createFallJob(reader, component, opts) {
    opts = requireOptions(opts);
    const ctx = {
        counter: null,
        ops: { read: 0, visit: 0, total: 0 },
        maxFallVoxels: opts.maxFallVoxels !== undefined ? opts.maxFallVoxels : DEFAULTS.maxFallVoxels
    };
    const gen = runFallJob(ctx, reader, component);
    let result = null, error = null, done = false;
    return {
        get done() { return done; },
        get result() { return result; },
        get ops() { return Object.assign({}, ctx.ops); },
        step(counter) {
            if (error) throw error;
            if (done) return true;
            if (!counter || typeof counter.charge !== "function") throw new TypeError("structural/fall: step needs an ops counter");
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

function planFall(reader, component, opts) {
    opts = requireOptions(opts);
    const job = createFallJob(reader, component, opts);
    let c = opts.counter;
    if (!c) {
        c = { charge: () => true };
    }
    while (!job.step(c)) {
        if (opts.counter) {
            return { pending: true, job, ops: Object.assign({}, job.ops) };
        }
    }
    return job.result;
}

module.exports = {
    createFallJob,
    planFall
};
