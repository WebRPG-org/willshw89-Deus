"use strict";

/**
 * game/js/sim/worldgen/worker.js
 *
 * WG.WORLDGEN.07: an area's chunk fields, computed off the main thread.
 *
 * Fields. For every cell of an area: the two nearest biomes and the runner-up's
 * weight (DEUS_Biomes.ecologyAt, at the cell's absolute (gx, gy)), and the river
 * id and bed (DEUS_Hydrology's micro courses, when the host has set a river
 * network). They live in one buffer (a SharedArrayBuffer when the host has one)
 * whose layout is layout() below.
 *
 * Strips. The area is cut into strips of stripRows rows. Each strip has a state
 * word in the buffer's header: FREE, CLAIMED, DONE. Whoever computes a strip
 * first claims it (Atomics.compareExchange FREE -> CLAIMED), writes its rows,
 * then stores DONE. A host posts one job to every worker in its pool and may
 * run the same job itself, so the strips are shared out with no scheduler and
 * none is computed twice. A strip whose computation throws goes back to FREE.
 * Every value is a function of (seed, gx, gy, hydrology spec), so a strip is
 * the same whoever computes it.
 *
 * Three hosts, one file:
 * - A Web Worker (NW.js, the game): DEUS_Biomes.js and DEUS_Hydrology.js are
 *   read next to this file by synchronous XHR and run in their own function
 *   scope (as importScripts would put both in one global scope, where their
 *   same-named helpers would replace each other).
 * - A Node worker thread with workerData.deusChunkWorker (headless tests).
 * - A module (UF.Sim.require("worldgen/worker"), require): exports layout,
 *   views and createComputer, so the main thread runs the same code.
 *
 * Messages to a worker:
 *   { type: "config", version, hydrology }   hydrology: null or { grid, options }
 *   { type: "job", buffer, job }             job: { id, gx0, gy0, w, h, stripRows, seed, hydroVersion }
 * Messages from a worker:
 *   { type: "ready" }  { type: "done", id, computed, ms }  { type: "error", id, message, fatal }
 *
 * Pure apart from the worker glue: no RMMZ, UF or window references. Nothing
 * here is saved: fields are rebuilt from the seed.
 */

const SCHEMA = "deus.worldgen.chunkFields/1";
const FREE = 0, CLAIMED = 1, DONE = 2;

/** Byte layout of an area's fields: w x h cells cut into strips of stripRows rows. Index of a cell: y * w + x. */
function layout(w, h, stripRows) {
    w |= 0; h |= 0; stripRows |= 0;
    if (w < 1 || h < 1) throw new RangeError("chunk fields: w and h must be >= 1");
    if (stripRows < 1) throw new RangeError("chunk fields: stripRows must be >= 1");
    const cells = w * h, strips = Math.ceil(h / stripRows);
    // Widest elements first, so every view starts on its own alignment.
    const state = 0;
    const secondaryWeight = state + 4 * strips;
    const bed = secondaryWeight + 4 * cells;
    const river = bed + 4 * cells;
    const primary = river + 2 * cells;
    const secondary = primary + cells;
    const bytes = secondary + cells;
    return { schema: SCHEMA, w, h, stripRows, cells, strips, offsets: { state, secondaryWeight, bed, river, primary, secondary }, bytes };
}

/** Typed-array views of a fields buffer. */
function views(buffer, L) {
    if (!buffer || buffer.byteLength < L.bytes) throw new RangeError(`chunk fields: buffer of ${buffer ? buffer.byteLength : 0} bytes, layout needs ${L.bytes}`);
    const o = L.offsets;
    return {
        state: new Int32Array(buffer, o.state, L.strips),
        secondaryWeight: new Float32Array(buffer, o.secondaryWeight, L.cells),
        bed: new Float32Array(buffer, o.bed, L.cells),
        river: new Uint16Array(buffer, o.river, L.cells),
        primary: new Uint8Array(buffer, o.primary, L.cells),
        secondary: new Uint8Array(buffer, o.secondary, L.cells)
    };
}

/** True when every strip of the buffer is DONE. */
function complete(v) {
    for (let s = 0; s < v.state.length; s++) if (Atomics.load(v.state, s) !== DONE) return false;
    return true;
}

/**
 * A strip computer over the two sim modules: { Biomes, Hydrology }.
 * setHydrology(spec, version): spec null (no rivers) or { grid: createMacroGrid options, options: createRiverNetwork options }.
 */
function createComputer(mods) {
    const Biomes = mods && mods.Biomes, Hydrology = mods && mods.Hydrology;
    if (!Biomes || typeof Biomes.ecologyAt !== "function") throw new TypeError("chunk fields: the Biomes module is missing");
    const biomeIds = Biomes.BIOMES.map(b => b.id);
    if (biomeIds.length > 255) throw new RangeError("chunk fields: more than 255 biomes do not fit a byte");
    const indexOf = new Map(biomeIds.map((id, i) => [id, i]));
    let hydro = { version: 0, spec: null, micro: null };

    function setHydrology(spec, version) {
        hydro = { version: version | 0, spec: spec || null, micro: null };
    }
    function microCourses() {
        if (!hydro.spec) return null;
        if (!hydro.micro) {
            if (!Hydrology || typeof Hydrology.createRiverNetwork !== "function") throw new TypeError("chunk fields: a river spec is set but the Hydrology module is missing");
            const grid = Hydrology.createMacroGrid(hydro.spec.grid);
            hydro.micro = Hydrology.createRiverNetwork(grid, hydro.spec.options || {}).micro;
        }
        return hydro.micro;
    }

    /** Write rows of strip s. Doesn't touch its state word. */
    function computeStrip(v, L, job, s) {
        const w = L.w, y0 = s * L.stripRows, y1 = Math.min(L.h, y0 + L.stripRows);
        for (let y = y0; y < y1; y++) {
            const gy = job.gy0 + y;
            for (let x = 0; x < w; x++) {
                const e = Biomes.ecologyAt(job.seed, job.gx0 + x, gy);
                const i = y * w + x;
                v.primary[i] = indexOf.get(e.primary.id);
                v.secondary[i] = indexOf.get(e.secondary.id);
                v.secondaryWeight[i] = e.secondary.weight;
            }
        }
        const micro = microCourses();
        const from = y0 * w, to = y1 * w;
        if (!micro) {
            v.river.fill(0, from, to);
            v.bed.fill(NaN, from, to);
            return;
        }
        const r = micro.rasterizeChunk(job.gx0, job.gy0 + y0, w, y1 - y0);
        v.river.set(r.river, from);
        v.bed.set(r.bed, from);
    }

    /**
     * Claim and compute every FREE strip of the job's buffer. Returns the number this caller computed.
     * job.hydroVersion must be the version set here: a job made for another river spec is refused.
     */
    function runJob(buffer, job) {
        if ((job.hydroVersion | 0) !== hydro.version) throw new Error(`chunk fields: job ${job.id} wants river spec v${job.hydroVersion}, this computer has v${hydro.version}`);
        const L = layout(job.w, job.h, job.stripRows);
        const v = views(buffer, L);
        let n = 0;
        for (let s = 0; s < L.strips; s++) {
            if (Atomics.compareExchange(v.state, s, FREE, CLAIMED) !== FREE) continue;
            try {
                computeStrip(v, L, job, s);
            } catch (e) {
                Atomics.store(v.state, s, FREE);   // someone else may take it
                throw e;
            }
            Atomics.store(v.state, s, DONE);
            Atomics.notify(v.state, s);
            n++;
        }
        return n;
    }

    /** Compute strip s whatever its state and mark it DONE (a host whose worker died holding the claim). */
    function forceStrip(buffer, job, s) {
        const L = layout(job.w, job.h, job.stripRows);
        const v = views(buffer, L);
        computeStrip(v, L, job, s);
        Atomics.store(v.state, s, DONE);
    }

    return { biomeIds, setHydrology, hydroVersion: () => hydro.version, runJob, forceStrip };
}

const api = { SCHEMA, FREE, CLAIMED, DONE, layout, views, complete, createComputer };

//-----------------------------------------------------------------------------
// Worker glue

function serve(post, mods) {
    const computer = createComputer(mods);
    post({ type: "ready" });
    return function onMessage(msg) {
        if (!msg || typeof msg !== "object") return;
        if (msg.type === "config") {
            computer.setHydrology(msg.hydrology, msg.version);
            return;
        }
        if (msg.type !== "job") return;
        const t0 = Date.now();
        try {
            const computed = computer.runJob(msg.buffer, msg.job);
            post({ type: "done", id: msg.job.id, computed, ms: Date.now() - t0 });
        } catch (e) {
            post({ type: "error", id: msg.job && msg.job.id, message: String(e && e.stack || e), fatal: false });
        }
    };
}

function loadWithXhr(url) {
    const x = new XMLHttpRequest();
    x.open("GET", url, false);
    x.send();
    if ((x.status && x.status !== 200) || !x.responseText) throw new Error(`chunk worker: can't read ${url} (status ${x.status})`);
    const m = { exports: {} };
    new Function("module", "exports", x.responseText + "\n//# sourceURL=" + url)(m, m.exports);
    return m.exports;
}

const isWebWorker = typeof WorkerGlobalScope !== "undefined" && typeof self !== "undefined" && self instanceof WorkerGlobalScope;

if (isWebWorker) {
    let handler = null;
    const post = m => self.postMessage(m);
    try {
        handler = serve(post, { Biomes: loadWithXhr("DEUS_Biomes.js"), Hydrology: loadWithXhr("DEUS_Hydrology.js") });
    } catch (e) {
        post({ type: "error", id: null, message: String(e && e.stack || e), fatal: true });
    }
    self.onmessage = e => { if (handler) handler(e.data); };
} else if (typeof module === "object" && module && module.exports) {
    module.exports = api;
    let wt = null;
    try { wt = require("worker_threads"); } catch (_) { wt = null; }
    if (wt && !wt.isMainThread && wt.parentPort && wt.workerData && wt.workerData.deusChunkWorker) {
        const post = m => wt.parentPort.postMessage(m);
        let handler = null;
        try {
            handler = serve(post, { Biomes: require("./DEUS_Biomes.js"), Hydrology: require("./DEUS_Hydrology.js") });
        } catch (e) {
            post({ type: "error", id: null, message: String(e && e.stack || e), fatal: true });
        }
        wt.parentPort.on("message", m => { if (handler) handler(m); });
    }
}
