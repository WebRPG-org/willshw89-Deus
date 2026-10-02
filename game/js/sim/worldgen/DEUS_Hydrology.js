"use strict";

/**
 * game/js/sim/worldgen/DEUS_Hydrology.js
 *
 * WG.HYDRO.04: river courses for world generation, in two steps.
 *
 * Macro. A coarse grid of nodes, one per cellSize x cellSize tiles, each with
 * one elevation supplied by the host. findRiverPath runs A* from a high source
 * node down to the nearest low node: a sink (elevation <= seaLevel) or, in a
 * world with no sink, the lowest node (a terminal lake). A step costs 10
 * straight or 14 diagonal, plus climbPenalty per unit of rise, so a path
 * follows valleys and crosses a ridge at its gap. The heuristic is the octile
 * distance to the nearest goal (a multi-source distance transform built once
 * per grid and sea level), which never overestimates. Routing surveys the
 * original terrain; water follows only the carved bed. Repeated erosion passes
 * lower every obstructing downstream node until that bed is non-increasing.
 * The grid remains unchanged so independently planned rivers are repeatable.
 * In a landlocked world the lowest local basin holds a standing terminal lake.
 *
 * Micro. Each macro node gets a tile anchor: its cell centre plus a jitter
 * hashed from the node's absolute coordinates. Each macro segment between two
 * anchors is cut by midpoint displacement, and every displacement is hashed
 * from the absolute tile coordinates (gx, gy) of the ends of the piece being
 * cut, never from chunk-local coordinates or call order. A chunk is rasterized
 * on demand: only the macro segments binned near it are cut (memoized), and a
 * tile is river when its centre lies within halfWidth of the cut course. So two
 * chunks built separately, in any order or at any chunk size, agree at their
 * seams. With halfWidth >= 0.75 the river tiles are 4-connected.
 *
 * Wrap. With wrapX / wrapY the grid joins its opposite edges (as WorldGen's
 * noise does). Paths step across the seam; courses are kept in unwrapped
 * coordinates, hashed in wrapped ones, and drawn into a chunk at every shift
 * by the world's tile size that reaches it.
 *
 * Pure: no RMMZ, UF or window references. Nothing here is saved: courses are
 * a function of (seed, grid, options) and are rebuilt on load.
 *
 * Not in this leaf: tributaries joining (rivers are independent and may
 * cross), river width growing downstream, and wiring into DEUS_WorldGen.
 *
 * Mutants (Rule 4), process.env.MUTANT, read at call time:
 *   no_climb_penalty  rises cost nothing, so paths cross ridges
 *   no_carve          bed = raw node elevation, so the bed can climb
 *   local_coords      displacements hashed from chunk-local coordinates
 *   no_perturb        macro segments are not cut (straight courses)
 *   scan_all          rasterizeChunk tests every segment instead of its bins
 *   no_wrap_shift     courses are drawn without their wrapped copies
 *   greedy_h          the heuristic is inflated fivefold (no longer admissible)
 *   wide_cut          displacements are three times the amplitude
 */

const SCHEMA = "deus.worldgen.hydrology/1";
const SALT_ANCHOR = 0x4a7c;
const SALT_CUT = 0x6c3b;
const SALT_SOURCE = 0x51e3;
const STEP_STRAIGHT = 10;
const STEP_DIAGONAL = 14;
const MAX_DEPTH = 16;   // cut levels; a 16-tile cell needs about 4
// N, NE, E, SE, S, SW, W, NW: a fixed order, so ties resolve the same way every run.
const DIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

function mutant() {
    return typeof process !== "undefined" && process.env ? (process.env.MUTANT || "") : "";
}

function fail(code, message) {
    const e = new Error(code + ": " + message);
    e.code = code;
    throw e;
}

//-----------------------------------------------------------------------------
// Hashing: every value comes from (seed, salt, integer coordinates).

function mix(h, v) {
    h = Math.imul(h ^ (v | 0), 0x9e3779b1);
    return (h ^ (h >>> 15)) | 0;
}
function hash32(seed, salt, a, b, c, d) {
    let h = mix(mix(0x811c9dc5, seed), salt);
    h = mix(h, a); h = mix(h, b); h = mix(h, c === undefined ? 0 : c); h = mix(h, d === undefined ? 0 : d);
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
}
/** [0, 1) from (seed, salt, a, b, c, d). */
function unit(seed, salt, a, b, c, d) {
    return hash32(seed, salt, a, b, c, d) / 4294967296;
}
function mod(v, n) {
    return ((v % n) + n) % n;
}

//-----------------------------------------------------------------------------
// Binary min-heap on (f, h, seq): ties go to the smaller h, then the earlier push.

function createHeap() {
    const items = [];
    const less = (a, b) => a.f < b.f || (a.f === b.f && (a.h < b.h || (a.h === b.h && a.seq < b.seq)));
    return {
        size: () => items.length,
        push(item) {
            items.push(item);
            let i = items.length - 1;
            while (i > 0) {
                const p = (i - 1) >> 1;
                if (!less(items[i], items[p])) break;
                [items[i], items[p]] = [items[p], items[i]];
                i = p;
            }
        },
        pop() {
            const top = items[0], last = items.pop();
            if (items.length) {
                items[0] = last;
                let i = 0;
                for (;;) {
                    const l = i * 2 + 1, r = l + 1;
                    let m = i;
                    if (l < items.length && less(items[l], items[m])) m = l;
                    if (r < items.length && less(items[r], items[m])) m = r;
                    if (m === i) break;
                    [items[i], items[m]] = [items[m], items[i]];
                    i = m;
                }
            }
            return top;
        }
    };
}

//-----------------------------------------------------------------------------
// Macro grid

/**
 * createMacroGrid({ width, height, cellSize, elevation, wrapX, wrapY }) -> grid
 * elevation: an array-like of width*height values (row-major) or a function (mx, my) -> number.
 */
function createMacroGrid(o) {
    const opts = o || {};
    const w = opts.width | 0, h = opts.height | 0, cell = opts.cellSize === undefined ? 16 : opts.cellSize | 0;
    if (w < 1 || h < 1) fail("E_GRID", "width and height must be >= 1");
    if (cell < 2) fail("E_GRID", "cellSize must be >= 2");
    const elev = new Float64Array(w * h);
    const src = opts.elevation;
    for (let my = 0; my < h; my++) {
        for (let mx = 0; mx < w; mx++) {
            const v = typeof src === "function" ? src(mx, my) : src && src[my * w + mx];
            if (typeof v !== "number" || !isFinite(v)) fail("E_GRID", "elevation at " + mx + "," + my + " is not a finite number");
            elev[my * w + mx] = v;
        }
    }
    return {
        schema: SCHEMA, width: w, height: h, cellSize: cell, elev,
        wrapX: !!opts.wrapX, wrapY: !!opts.wrapY,
        tilesW: w * cell, tilesH: h * cell,
        _goalDist: new Map()
    };
}

/** Index of the neighbour of (mx, my) in direction k, or -1 off a non-wrapped edge. */
function neighbour(grid, mx, my, k) {
    let nx = mx + DIRS[k][0], ny = my + DIRS[k][1];
    if (nx < 0 || nx >= grid.width) { if (!grid.wrapX) return -1; nx = mod(nx, grid.width); }
    if (ny < 0 || ny >= grid.height) { if (!grid.wrapY) return -1; ny = mod(ny, grid.height); }
    return ny * grid.width + nx;
}

/**
 * Goals for a sea level, and the octile distance (10/14 units) from every node
 * to the nearest goal. Goals are the sinks (elevation <= seaLevel); with none,
 * the lowest node (lowest index on a tie) is the one goal, a terminal lake.
 */
function goalField(grid, seaLevel) {
    const cached = grid._goalDist.get(seaLevel);
    if (cached) return cached;
    const n = grid.width * grid.height;
    const isGoal = new Uint8Array(n);
    let any = false, lowest = 0;
    for (let i = 0; i < n; i++) {
        if (grid.elev[i] <= seaLevel) { isGoal[i] = 1; any = true; }
        if (grid.elev[i] < grid.elev[lowest]) lowest = i;
    }
    if (!any) isGoal[lowest] = 1;
    const dist = new Int32Array(n).fill(0x7fffffff);
    const heap = createHeap();
    let seq = 0;
    for (let i = 0; i < n; i++) if (isGoal[i]) { dist[i] = 0; heap.push({ f: 0, h: 0, seq: seq++, i }); }
    while (heap.size()) {
        const cur = heap.pop();
        if (cur.f !== dist[cur.i]) continue;
        const mx = cur.i % grid.width, my = (cur.i / grid.width) | 0;
        for (let k = 0; k < 8; k++) {
            const j = neighbour(grid, mx, my, k);
            if (j < 0) continue;
            const d = cur.f + (k & 1 ? STEP_DIAGONAL : STEP_STRAIGHT);
            if (d < dist[j]) { dist[j] = d; heap.push({ f: d, h: 0, seq: seq++, i: j }); }
        }
    }
    const field = { isGoal, dist, terminal: any ? "sea" : "lake" };
    grid._goalDist.set(seaLevel, field);
    return field;
}

/**
 * findRiverPath(grid, source {mx, my}, { seaLevel, climbPenalty, maxExpansions })
 * -> { ok: true, nodes: [{mx, my}], elev: [...], bed: [...], cost,
 *      terminal, lake, erosionPasses, eroded, expansions }
 *  | { ok: false, reason: "budget" | "unreachable", expansions }
 * The path starts at the source and ends at the first goal reached. Nodes are wrapped grid coordinates.
 */
function findRiverPath(grid, source, options) {
    const opts = options || {};
    if (typeof opts.seaLevel !== "number") fail("E_ARG", "options.seaLevel is required");
    const climbPenalty = mutant() === "no_climb_penalty" ? 0 : (opts.climbPenalty === undefined ? 1000 : +opts.climbPenalty);
    const n = grid.width * grid.height;
    const maxExpansions = opts.maxExpansions === undefined ? n : opts.maxExpansions | 0;
    if (!source || source.mx < 0 || source.my < 0 || source.mx >= grid.width || source.my >= grid.height) fail("E_SOURCE", "source is off the grid");
    const start = source.my * grid.width + source.mx;
    const field = goalField(grid, opts.seaLevel);
    if (field.isGoal[start]) fail("E_SOURCE", "source is already a goal (at or below the sea, or the lowest node)");

    const hScale = mutant() === "greedy_h" ? 5 : 1;
    const g = new Float64Array(n).fill(Infinity);
    const parent = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const heap = createHeap();
    let seq = 0, expansions = 0;
    g[start] = 0;
    heap.push({ f: field.dist[start] * hScale, h: field.dist[start], seq: seq++, i: start });
    while (heap.size()) {
        const cur = heap.pop();
        if (closed[cur.i]) continue;
        if (field.isGoal[cur.i]) return pathResult(grid, parent, cur.i, g[cur.i], field.terminal, expansions);
        if (expansions >= maxExpansions) return { ok: false, reason: "budget", expansions };
        closed[cur.i] = 1;
        expansions++;
        const mx = cur.i % grid.width, my = (cur.i / grid.width) | 0;
        const e0 = grid.elev[cur.i];
        for (let k = 0; k < 8; k++) {
            const j = neighbour(grid, mx, my, k);
            if (j < 0 || closed[j]) continue;
            const rise = grid.elev[j] - e0;
            const cost = g[cur.i] + (k & 1 ? STEP_DIAGONAL : STEP_STRAIGHT) + (rise > 0 ? rise * climbPenalty : 0);
            if (cost < g[j]) {
                g[j] = cost;
                parent[j] = cur.i;
                heap.push({ f: cost + field.dist[j] * hScale, h: field.dist[j], seq: seq++, i: j });
            }
        }
    }
    return { ok: false, reason: "unreachable", expansions };
}

function pathResult(grid, parent, end, cost, terminal, expansions) {
    const idx = [];
    for (let i = end; i >= 0; i = parent[i]) idx.push(i);
    idx.reverse();
    const nodes = idx.map(i => ({ mx: i % grid.width, my: (i / grid.width) | 0 }));
    const elev = idx.map(i => grid.elev[i]);
    const bed = elev.slice();
    let erosionPasses = 0, eroded = 0;
    if (mutant() !== "no_carve") {
        // A bounded number of full-path passes: each pass cuts at most one
        // eighth of the route's elevation range from each obstructing node.
        // The running waterline is the lowest bed seen upstream, including
        // earlier cuts in this pass. This models progressive canyon incision
        // without changing the terrain supplied by the caller.
        let high = elev[0], low = elev[0], needsCut = false;
        for (let k = 1; k < elev.length; k++) {
            high = Math.max(high, elev[k]);
            low = Math.min(low, elev[k]);
            if (elev[k] > low) needsCut = true;
        }
        const range = high - low;
        const step = range / 8 || range;
        if (needsCut && step > 0) {
            let obstructed;
            do {
                obstructed = false;
                let waterline = bed[0];
                for (let k = 1; k < bed.length; k++) {
                    if (bed[k] > waterline) {
                        const next = bed[k] - waterline <= step * (1 + 1e-12) ? waterline : bed[k] - step;
                        eroded += bed[k] - next;
                        bed[k] = next;
                        if (next > waterline) obstructed = true;
                    }
                    waterline = Math.min(waterline, bed[k]);
                }
                erosionPasses++;
            } while (obstructed);
        }
    }
    let lake = null;
    if (terminal === "lake") {
        const mx = end % grid.width, my = (end / grid.width) | 0;
        let rim = Infinity;
        for (let k = 0; k < 8; k++) {
            const j = neighbour(grid, mx, my, k);
            if (j >= 0 && j !== end) rim = Math.min(rim, grid.elev[j]);
        }
        const surface = rim === Infinity ? bed[bed.length - 1] : rim;
        lake = { mx, my, surface, depth: Math.max(0, surface - bed[bed.length - 1]) };
    }
    return { ok: true, nodes, elev, bed, cost, terminal, lake, erosionPasses, eroded, expansions };
}

/**
 * pickSources(grid, { seed, count, minElevation, minSpacing }) -> [{mx, my}]
 * The highest nodes at or above minElevation, highest first (a seeded hash breaks
 * ties), each at least minSpacing nodes (Chebyshev, wrap-aware) from those already picked.
 */
function pickSources(grid, options) {
    const opts = options || {};
    const seed = opts.seed | 0, count = opts.count === undefined ? 1 : opts.count | 0;
    const minE = opts.minElevation === undefined ? -Infinity : opts.minElevation;
    const spacing = opts.minSpacing === undefined ? 1 : opts.minSpacing;
    const cand = [];
    for (let i = 0; i < grid.elev.length; i++) if (grid.elev[i] >= minE) cand.push(i);
    const tie = i => hash32(seed, SALT_SOURCE, i % grid.width, (i / grid.width) | 0);
    cand.sort((a, b) => grid.elev[b] - grid.elev[a] || tie(a) - tie(b) || a - b);
    const picked = [];
    for (const i of cand) {
        if (picked.length >= count) break;
        const mx = i % grid.width, my = (i / grid.width) | 0;
        const far = picked.every(p => Math.max(axisDist(mx, p.mx, grid.width, grid.wrapX), axisDist(my, p.my, grid.height, grid.wrapY)) >= spacing);
        if (far) picked.push({ mx, my });
    }
    return picked;
}
function axisDist(a, b, size, wrap) {
    const d = Math.abs(a - b);
    return wrap ? Math.min(d, size - d) : d;
}

/**
 * planMacroRivers(grid, { sources | (seed, count, minElevation, minSpacing), seaLevel, climbPenalty, maxExpansions })
 * -> { rivers: [{ id, source, nodes, elev, bed, cost, terminal, lake,
 *                 erosionPasses, eroded }], failed: [{ source, reason }] }
 * Sources already at a goal are skipped as "at_goal".
 */
function planMacroRivers(grid, options) {
    const opts = options || {};
    const sources = opts.sources || pickSources(grid, opts);
    const field = goalField(grid, opts.seaLevel);
    const rivers = [], failed = [];
    for (const s of sources) {
        if (field.isGoal[s.my * grid.width + s.mx]) { failed.push({ source: s, reason: "at_goal" }); continue; }
        const p = findRiverPath(grid, s, opts);
        if (!p.ok) { failed.push({ source: s, reason: p.reason }); continue; }
        rivers.push({ id: rivers.length, source: { mx: s.mx, my: s.my }, nodes: p.nodes, elev: p.elev, bed: p.bed, cost: p.cost, terminal: p.terminal, lake: p.lake, erosionPasses: p.erosionPasses, eroded: p.eroded });
    }
    return { rivers, failed };
}

//-----------------------------------------------------------------------------
// Micro courses

/**
 * createMicroCourses(grid, rivers, { seed, halfWidth, amplitude, minSegment, jitter, binSize })
 * -> { rasterizeChunk(x0, y0, w, h), isRiver(gx, gy), course(id), anchors(id), maxDeviation, segmentCount }
 *
 * halfWidth   tiles from the course a tile centre may be and still be river (>= 0.75; default 1)
 * amplitude   largest midpoint displacement as a fraction of the piece's length (0..0.45; default 0.3)
 * minSegment  pieces this long or shorter are not cut further (tiles, >= 3; default 3)
 * jitter      largest anchor offset from the cell centre (tiles; default floor(cellSize / 4))
 * binSize     tile size of the segment bins that chunk queries look up (default 32)
 */
function createMicroCourses(grid, rivers, options) {
    const opts = options || {};
    const seed = opts.seed | 0;
    const cell = grid.cellSize;
    const halfWidth = opts.halfWidth === undefined ? 1 : +opts.halfWidth;
    const amplitude = opts.amplitude === undefined ? 0.3 : +opts.amplitude;
    const minSegment = opts.minSegment === undefined ? 3 : +opts.minSegment;
    const jitter = opts.jitter === undefined ? Math.floor(cell / 4) : opts.jitter | 0;
    const binSize = opts.binSize === undefined ? 32 : opts.binSize | 0;
    if (!(halfWidth >= 0.75)) fail("E_ARG", "halfWidth must be >= 0.75 (4-connected river tiles)");
    if (!(amplitude >= 0 && amplitude <= 0.45)) fail("E_ARG", "amplitude must be within 0..0.45");
    if (!(minSegment >= 3)) fail("E_ARG", "minSegment must be >= 3");
    if (jitter < 0 || jitter * 2 >= cell) fail("E_ARG", "jitter must be within 0..cellSize/2");
    if (binSize < 1) fail("E_ARG", "binSize must be >= 1");
    const W = grid.tilesW, H = grid.tilesH;
    const normX = x => grid.wrapX ? mod(x, W) : x;
    const normY = y => grid.wrapY ? mod(y, H) : y;

    // Anchors: macro nodes unwrapped along each path, then placed in tiles.
    const anchor = (ux, uy) => {
        const nx = mod(ux, grid.width), ny = mod(uy, grid.height);
        const jx = Math.floor(unit(seed, SALT_ANCHOR, nx, ny, 0) * (2 * jitter + 1)) - jitter;
        const jy = Math.floor(unit(seed, SALT_ANCHOR, nx, ny, 1) * (2 * jitter + 1)) - jitter;
        return { x: ux * cell + (cell >> 1) + jx, y: uy * cell + (cell >> 1) + jy };
    };
    const anchorLists = rivers.map(r => {
        const out = [];
        let ux = 0, uy = 0;
        r.nodes.forEach((nd, k) => {
            if (k === 0) { ux = nd.mx; uy = nd.my; } else {
                const pnx = mod(ux, grid.width), pny = mod(uy, grid.height);
                let dx = nd.mx - pnx, dy = nd.my - pny;
                if (grid.wrapX && dx > grid.width / 2) dx -= grid.width;
                if (grid.wrapX && dx < -grid.width / 2) dx += grid.width;
                if (grid.wrapY && dy > grid.height / 2) dy -= grid.height;
                if (grid.wrapY && dy < -grid.height / 2) dy += grid.height;
                ux += dx; uy += dy;
            }
            const a = anchor(ux, uy);
            out.push({ x: a.x, y: a.y, bed: r.bed[k] });
        });
        return out;
    });

    // Deviation bound for one cut macro segment of length L: each level moves the
    // midpoint at most amplitude * length (+0.71 rounding), and each level's pieces
    // are at most ratio * length (+0.71) long.
    const ratio = Math.sqrt(0.25 + amplitude * amplitude);
    let longest = 0;
    anchorLists.forEach(list => { for (let k = 1; k < list.length; k++) longest = Math.max(longest, Math.hypot(list[k].x - list[k - 1].x, list[k].y - list[k - 1].y)); });
    let maxDeviation = 0;
    for (let len = longest, depth = 0; len > minSegment && depth <= MAX_DEPTH; len = len * ratio + 0.71, depth++) maxDeviation += amplitude * len + 0.71;
    const reach = Math.ceil(maxDeviation + halfWidth + 1);

    // Segments and their bins (bin keys in wrapped tile space).
    const segs = [];
    anchorLists.forEach((list, rid) => {
        for (let k = 1; k < list.length; k++) segs.push({ rid, a: list[k - 1], b: list[k] });
    });
    const binsX = Math.ceil(W / binSize), binsY = Math.ceil(H / binSize);
    const bins = new Map();
    const binRange = (lo, hi, size, wrap, norm) => {
        const out = [];
        if (wrap && hi - lo + 1 >= size) { for (let b = 0; b * binSize < size; b++) out.push(b); return out; }
        for (let x = lo; x <= hi;) {
            const nx = norm(x);
            if (nx >= 0 && nx < size) out.push(Math.floor(nx / binSize));
            const step = nx < 0 ? -nx : Math.min(binSize - mod(nx, binSize), wrap ? size - nx : binSize);
            x += Math.max(1, step);
        }
        return Array.from(new Set(out));
    };
    segs.forEach((s, si) => {
        const bx = binRange(Math.min(s.a.x, s.b.x) - reach, Math.max(s.a.x, s.b.x) + reach, W, grid.wrapX, normX);
        const by = binRange(Math.min(s.a.y, s.b.y) - reach, Math.max(s.a.y, s.b.y) + reach, H, grid.wrapY, normY);
        for (const y of by) for (const x of bx) {
            const key = y * binsX + x;
            if (!bins.has(key)) bins.set(key, []);
            bins.get(key).push(si);
        }
    });

    // Cutting: midpoint displacement hashed from the absolute (wrapped) tile
    // coordinates of the piece's start and its extent.
    const cutCache = new Map();
    function cut(si, ox, oy) {
        const local = mutant() === "local_coords";
        if (!local && cutCache.has(si)) return cutCache.get(si);
        const s = segs[si];
        const pts = [{ x: s.a.x, y: s.a.y, bed: s.a.bed }];
        const straight = mutant() === "no_perturb";
        const amp = mutant() === "wide_cut" ? amplitude * 3 : amplitude;
        (function split(a, b, depth) {
            const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
            if (straight || len <= minSegment || depth >= MAX_DEPTH) { pts.push(b); return; }
            const hx = local ? a.x - ox : normX(a.x), hy = local ? a.y - oy : normY(a.y);
            const d = (unit(seed, SALT_CUT, hx, hy, dx * 65536 + dy) * 2 - 1) * amp * len;
            const m = { x: Math.round((a.x + b.x) / 2 - dy / len * d), y: Math.round((a.y + b.y) / 2 + dx / len * d), bed: (a.bed + b.bed) / 2 };
            if ((m.x === a.x && m.y === a.y) || (m.x === b.x && m.y === b.y)) { pts.push(b); return; }
            split(a, m, depth + 1);
            split(m, b, depth + 1);
        })(pts[0], { x: s.b.x, y: s.b.y, bed: s.b.bed }, 0);
        if (!local) cutCache.set(si, pts);
        return pts;
    }

    /**
     * rasterizeChunk(x0, y0, w, h) -> { x0, y0, w, h, river: Uint16Array (river id + 1, 0 = dry),
     *   bed: Float32Array (NaN where dry), stats: { segmentsTested } }
     * Tiles (gx, gy) with gx in [x0, x0 + w), gy in [y0, y0 + h); index (gy - y0) * w + (gx - x0).
     * Where two rivers cover a tile, the lower id and the lower bed win.
     */
    function rasterizeChunk(x0, y0, w, h) {
        const river = new Uint16Array(w * h);
        const bed = new Float32Array(w * h).fill(NaN);
        let ids;
        if (mutant() === "scan_all") ids = segs.map((_, i) => i);
        else {
            const set = new Set();
            for (const by of binRange(y0, y0 + h - 1, H, grid.wrapY, normY)) for (const bx of binRange(x0, x0 + w - 1, W, grid.wrapX, normX)) {
                const list = bins.get(by * binsX + bx);
                if (list) for (const si of list) set.add(si);
            }
            ids = Array.from(set).sort((p, q) => p - q);
        }
        const noShift = mutant() === "no_wrap_shift";
        const shiftsX = grid.wrapX && !noShift ? [-W, 0, W] : [0];
        const shiftsY = grid.wrapY && !noShift ? [-H, 0, H] : [0];
        const hw2 = halfWidth * halfWidth + 1e-9;   // a tile at exactly halfWidth is river, whatever the rounding
        for (const si of ids) {
            const pts = cut(si, x0, y0), rid = segs[si].rid;
            for (let k = 1; k < pts.length; k++) {
                const a = pts[k - 1], b = pts[k];
                const ex = b.x - a.x, ey = b.y - a.y, e2 = ex * ex + ey * ey;
                for (const sy of shiftsY) for (const sx of shiftsX) {
                    const lx = Math.max(x0, Math.ceil(Math.min(a.x, b.x) + sx - halfWidth));
                    const hx = Math.min(x0 + w - 1, Math.floor(Math.max(a.x, b.x) + sx + halfWidth));
                    const ly = Math.max(y0, Math.ceil(Math.min(a.y, b.y) + sy - halfWidth));
                    const hy = Math.min(y0 + h - 1, Math.floor(Math.max(a.y, b.y) + sy + halfWidth));
                    for (let gy = ly; gy <= hy; gy++) for (let gx = lx; gx <= hx; gx++) {
                        const px = gx - sx - a.x, py = gy - sy - a.y;
                        const t = e2 ? Math.max(0, Math.min(1, (px * ex + py * ey) / e2)) : 0;
                        const qx = px - t * ex, qy = py - t * ey;
                        if (qx * qx + qy * qy > hw2) continue;
                        const i = (gy - y0) * w + (gx - x0);
                        const b0 = a.bed + (b.bed - a.bed) * t;
                        if (!river[i] || rid + 1 < river[i]) river[i] = rid + 1;
                        if (!(bed[i] <= b0)) bed[i] = b0;
                    }
                }
            }
        }
        return { x0, y0, w, h, river, bed, stats: { segmentsTested: ids.length } };
    }

    return {
        schema: SCHEMA,
        rasterizeChunk,
        isRiver: (gx, gy) => rasterizeChunk(gx, gy, 1, 1).river[0] > 0,
        /** The whole cut course of river id, in unwrapped tile coordinates, source first. */
        course(id) {
            const out = [];
            segs.forEach((s, si) => {
                if (s.rid !== id) return;
                const pts = cut(si, 0, 0);
                for (let k = out.length ? 1 : 0; k < pts.length; k++) out.push({ x: pts[k].x, y: pts[k].y, bed: pts[k].bed });
            });
            return out;
        },
        anchors: id => (anchorLists[id] || []).map(a => ({ x: a.x, y: a.y, bed: a.bed })),
        maxDeviation,
        segmentCount: segs.length,
        halfWidth
    };
}

/** planMacroRivers then createMicroCourses with the same options: { grid, rivers, failed, micro }. */
function createRiverNetwork(grid, options) {
    const macro = planMacroRivers(grid, options);
    return { grid, rivers: macro.rivers, failed: macro.failed, micro: createMicroCourses(grid, macro.rivers, options) };
}

module.exports = {
    SCHEMA,
    createMacroGrid,
    findRiverPath,
    pickSources,
    planMacroRivers,
    createMicroCourses,
    createRiverNetwork,
    hash32,
    unit
};
