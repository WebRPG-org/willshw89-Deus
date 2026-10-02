"use strict";

/**
 * tools/test_hydrology.js
 *
 * WG.HYDRO.04 headless checks for game/js/sim/worldgen/DEUS_Hydrology.js:
 * macro A* river paths and the micro chunk perturbation step.
 *
 * Macro:
 *   macro_downhill_to_sea   a path runs from its high source to a sink, one 8-neighbour step at a time
 *   macro_ridge_gap         a path crosses a ridge at its gap, not over the top
 *   macro_carve_bed         repeated erosion lowers a full-width rise without changing the input terrain
 *   macro_optimal           A* cost equals an independent Dijkstra (h = 0) on rugged ground
 *   macro_wrap              with wrapX a path steps across the seam to the near sea
 *   macro_budget            maxExpansions stops a search with reason "budget"
 *   macro_landlocked        with no sea sink a path ends at a local basin with standing water depth
 *   macro_deterministic     the same inputs give the same plan; bad sources throw E_SOURCE
 *   sources_spacing         pickSources: highest first, above minElevation, spaced
 * Micro:
 *   micro_seams             one whole-world raster equals chunked rasters at 32 and 48, in shuffled order
 *   micro_bruteforce        chunked rasters equal the full cut courses drawn by this test
 *   micro_connected         every river's tiles join its source anchor to its mouth anchor (4-connected)
 *   micro_perturbed         courses are cut: more vertices than anchors, many off the anchor line
 *   micro_bounded           every course vertex is within maxDeviation of its macro segment
 *   micro_absolute_hash     a shared macro segment is cut the same in two networks (other ids, other order)
 *   micro_bed_monotone      course beds never climb; tile beds lie within the river's bed range
 *   micro_wrap_seam         a river across the x seam is river on both sides and 4-connected across it
 *   micro_locality          a chunk tests only the segments binned near it
 *   micro_args              out-of-range options throw E_ARG
 *
 * Negative controls (Rule 4): --mutant=<name> (or MUTANT=<name>) runs the checks
 * against a mutant built into the module; --all-mutants runs each mutant in a child
 * process and fails unless every mutant fails at least one check.
 * --case=<name> runs one check. Every check runs even if an earlier one fails;
 * the exit code is 1 if any check failed.
 */

const path = require("path");
const { spawnSync } = require("child_process");

const mutantArg = process.argv.find(a => a.startsWith("--mutant="));
if (mutantArg) process.env.MUTANT = mutantArg.slice("--mutant=".length);
const caseArg = process.argv.find(a => a.startsWith("--case="));
const onlyCase = caseArg ? caseArg.slice("--case=".length) : null;

const MODULE = path.join(__dirname, "..", "game", "js", "sim", "worldgen", "DEUS_Hydrology.js");
const H = require(MODULE);

const MUTANTS = ["no_climb_penalty", "no_carve", "local_coords", "no_perturb", "scan_all", "no_wrap_shift", "greedy_h", "wide_cut"];

function assert(cond, message) {
    if (!cond) throw new Error(message);
}
function mod(v, n) {
    return ((v % n) + n) % n;
}

//-----------------------------------------------------------------------------
// Fixtures

/** Rugged ground: value noise from the module's own hash, sloping down to the south, sea at the south edge. */
function ruggedGrid(w, h, seed, wrapX) {
    const lattice = (x, y) => H.unit(seed, 0x77, mod(x, Math.ceil(w / 4) + (wrapX ? 0 : 1)), y);
    const noise = (x, y) => {
        const fx = x / 4, fy = y / 4, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
        const a = lattice(ix, iy), b = lattice(ix + 1, iy), c = lattice(ix, iy + 1), d = lattice(ix + 1, iy + 1);
        return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    };
    return H.createMacroGrid({
        width: w, height: h, cellSize: 16, wrapX,
        elevation: (x, y) => 1.1 - 1.1 * y / (h - 1) + 0.35 * noise(x, y)
    });
}
const SEA = 0.12;
function worldNet(mutantFree) {
    const grid = ruggedGrid(32, 24, 4242, true);
    return H.createRiverNetwork(grid, { seed: 99, count: 5, minElevation: 0.9, minSpacing: 5, seaLevel: SEA, halfWidth: 1, amplitude: 0.3 });
}

function adjacent(grid, a, b) {
    const dx = Math.abs(a.mx - b.mx), dy = Math.abs(a.my - b.my);
    const ddx = grid.wrapX ? Math.min(dx, grid.width - dx) : dx;
    const ddy = grid.wrapY ? Math.min(dy, grid.height - dy) : dy;
    return Math.max(ddx, ddy) === 1;
}

/** Whole-world raster from fresh networks, chunked at size cs, chunks visited in a seeded shuffle. */
function chunkedRaster(makeNet, cs, shuffleSeed) {
    const net = makeNet();
    const W = net.grid.tilesW, Hh = net.grid.tilesH;
    const river = new Uint16Array(W * Hh), bed = new Float32Array(W * Hh).fill(NaN);
    const chunks = [];
    for (let y = 0; y < Hh; y += cs) for (let x = 0; x < W; x += cs) chunks.push([x, y]);
    if (shuffleSeed !== undefined) chunks.sort((p, q) => H.hash32(shuffleSeed, 1, p[0], p[1]) - H.hash32(shuffleSeed, 1, q[0], q[1]));
    for (const [x0, y0] of chunks) {
        const w = Math.min(cs, W - x0), h = Math.min(cs, Hh - y0);
        const r = net.micro.rasterizeChunk(x0, y0, w, h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            river[(y0 + y) * W + x0 + x] = r.river[y * w + x];
            bed[(y0 + y) * W + x0 + x] = r.bed[y * w + x];
        }
    }
    return { W, H: Hh, river, bed, net };
}
function sameRaster(a, b) {
    let diff = 0, first = null;
    for (let i = 0; i < a.river.length; i++) {
        const bedSame = (isNaN(a.bed[i]) && isNaN(b.bed[i])) || a.bed[i] === b.bed[i];
        if (a.river[i] !== b.river[i] || !bedSame) { diff++; if (!first) first = [i % a.W, Math.floor(i / a.W)]; }
    }
    return { diff, first };
}

/** 4-connected flood over river tiles (wrap-aware); returns the visited set. */
function flood(rast, sx, sy, wrapX, wrapY) {
    const seen = new Uint8Array(rast.W * rast.H);
    const q = [[sx, sy]];
    seen[sy * rast.W + sx] = 1;
    while (q.length) {
        const [x, y] = q.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            let nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= rast.W) { if (!wrapX) continue; nx = mod(nx, rast.W); }
            if (ny < 0 || ny >= rast.H) { if (!wrapY) continue; ny = mod(ny, rast.H); }
            const i = ny * rast.W + nx;
            if (seen[i] || !rast.river[i]) continue;
            seen[i] = 1;
            q.push([nx, ny]);
        }
    }
    return seen;
}

/** Squared distance, computed as the module does; a tile within halfWidth^2 + 1e-9 is river. */
function dist2ToSegment(p, a, b) {
    const ex = b.x - a.x, ey = b.y - a.y, e2 = ex * ex + ey * ey;
    const px = p.x - a.x, py = p.y - a.y;
    const t = e2 ? Math.max(0, Math.min(1, (px * ex + py * ey) / e2)) : 0;
    const qx = px - t * ex, qy = py - t * ey;
    return qx * qx + qy * qy;
}
function distToSegment(p, a, b) {
    const ex = b.x - a.x, ey = b.y - a.y, e2 = ex * ex + ey * ey;
    const t = e2 ? Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / e2)) : 0;
    return Math.hypot(p.x - a.x - t * ex, p.y - a.y - t * ey);
}

//-----------------------------------------------------------------------------
// Checks

const checks = [];
const check = (name, fn) => checks.push({ name, fn });

check("macro_downhill_to_sea", () => {
    const grid = H.createMacroGrid({ width: 20, height: 12, cellSize: 16, elevation: (x, y) => 1 - y / 11 + 0.01 * ((x * 7) % 3) });
    const p = H.findRiverPath(grid, { mx: 10, my: 0 }, { seaLevel: 0.05 });
    assert(p.ok, "path failed: " + p.reason);
    assert(p.terminal === "sea", "terminal " + p.terminal);
    const last = p.elev[p.elev.length - 1];
    assert(last <= 0.05, "path ends above the sea at " + last);
    assert(p.elev[0] > last + 0.5, "source " + p.elev[0] + " is not well above the mouth " + last);
    for (let k = 1; k < p.nodes.length; k++) assert(adjacent(grid, p.nodes[k - 1], p.nodes[k]), "step " + k + " is not to an 8-neighbour");
    for (let k = 0; k < p.nodes.length - 1; k++) assert(p.elev[k] > 0.05, "node " + k + " is already sea; the path should have stopped there");
    assert(p.nodes.length === 12, "a straight slope should take 12 nodes, took " + p.nodes.length);
    assert(p.erosionPasses === 0 && p.eroded === 0, "a downhill slope should need no erosion");
    assert(p.bed.every((bed, k) => bed === p.elev[k]), "a downhill slope should keep its original bed");
});

// Slope down to the south, a ridge across row 7 (+0.8) with one gap at column 17.
function ridgeGrid(gap) {
    return H.createMacroGrid({
        width: 21, height: 15, cellSize: 16,
        elevation: (x, y) => 1 - 0.9 * y / 14 + (y === 7 && x !== gap ? 0.8 : 0)
    });
}
check("macro_ridge_gap", () => {
    const grid = ridgeGrid(17);
    const p = H.findRiverPath(grid, { mx: 3, my: 0 }, { seaLevel: 0.1 + 1e-9 });
    assert(p.ok, "path failed: " + p.reason);
    const crossing = p.nodes.find(n => n.my === 7);
    assert(crossing, "path never reaches row 7");
    assert(p.nodes.filter(n => n.my === 7).every(n => n.mx === 17), "path crosses row 7 off the gap: " + JSON.stringify(p.nodes.filter(n => n.my === 7)));
    const maxRise = Math.max(...p.elev.map((e, k) => k ? e - p.elev[k - 1] : 0));
    assert(maxRise <= 0, "path climbs by " + maxRise);
    assert(p.eroded === 0, "the gap should avoid excavation");
});

check("macro_carve_bed", () => {
    const grid = ridgeGrid(-1); // no gap: the ridge must be crossed
    const original = Array.from(grid.elev);
    const p = H.findRiverPath(grid, { mx: 10, my: 0 }, { seaLevel: 0.1 + 1e-9 });
    assert(p.ok, "path failed: " + p.reason);
    const rawRise = p.elev.some((e, k) => k && e > p.elev[k - 1]);
    assert(rawRise, "fixture broken: the path never climbs, so carving is not exercised");
    for (let k = 1; k < p.bed.length; k++) assert(p.bed[k] <= p.bed[k - 1], "bed climbs at node " + k + ": " + p.bed[k - 1] + " -> " + p.bed[k]);
    for (let k = 0; k < p.bed.length; k++) assert(p.bed[k] <= p.elev[k], "bed above ground at node " + k);
    assert(p.bed[0] === p.elev[0], "bed at the source should be the source elevation");
    assert(p.erosionPasses >= 2, "the ridge should require repeated erosion passes, got " + p.erosionPasses);
    assert(p.erosionPasses <= 8, "erosion did not converge within eight passes");
    const totalCut = p.elev.reduce((sum, e, k) => sum + e - p.bed[k], 0);
    assert(Math.abs(totalCut - p.eroded) < 1e-9 && p.eroded > 0, "eroded volume does not match the cut bed");
    assert(JSON.stringify(Array.from(grid.elev)) === JSON.stringify(original), "pathfinding mutated the source terrain");
    assert(p.lake === null, "a path ending in the sea should not report a standing lake");
});

check("macro_optimal", () => {
    const grid = ruggedGrid(24, 18, 31337, false);
    const n = grid.width * grid.height, sea = SEA;
    // Independent Dijkstra (no heuristic) to any sink, same step costs.
    function dijkstra(start) {
        const g = new Float64Array(n).fill(Infinity), done = new Uint8Array(n);
        g[start] = 0;
        for (;;) {
            let best = -1;
            for (let i = 0; i < n; i++) if (!done[i] && g[i] < Infinity && (best < 0 || g[i] < g[best])) best = i;
            if (best < 0) return Infinity;
            if (grid.elev[best] <= sea) return g[best];
            done[best] = 1;
            const x = best % grid.width, y = Math.floor(best / grid.width);
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue;
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
                const j = ny * grid.width + nx, rise = grid.elev[j] - grid.elev[best];
                const c = g[best] + (dx && dy ? 14 : 10) + (rise > 0 ? rise * 1000 : 0);
                if (c < g[j]) g[j] = c;
            }
        }
    }
    let compared = 0;
    for (const s of H.pickSources(grid, { seed: 5, count: 8, minElevation: 0.6, minSpacing: 3 })) {
        const p = H.findRiverPath(grid, s, { seaLevel: sea });
        assert(p.ok, "path failed from " + JSON.stringify(s));
        const ref = dijkstra(s.my * grid.width + s.mx);
        assert(Math.abs(p.cost - ref) < 1e-6, "A* cost " + p.cost + " != Dijkstra " + ref + " from " + JSON.stringify(s));
        compared++;
    }
    assert(compared >= 6, "only " + compared + " sources compared");
});

check("macro_wrap", () => {
    const elevation = (x, y) => x === 19 ? 0 : 0.5 + 0.02 * x + 0.001 * y;
    const wrapped = H.createMacroGrid({ width: 20, height: 10, cellSize: 16, wrapX: true, elevation });
    const flat = H.createMacroGrid({ width: 20, height: 10, cellSize: 16, wrapX: false, elevation });
    const p = H.findRiverPath(wrapped, { mx: 1, my: 5 }, { seaLevel: 0.01 });
    assert(p.ok && p.nodes.length === 3, "wrapped path should be 3 nodes, got " + (p.ok ? p.nodes.length : p.reason));
    assert(p.nodes[1].mx === 0 && p.nodes[2].mx === 19, "wrapped path should step 1 -> 0 -> 19, got " + JSON.stringify(p.nodes));
    for (let k = 1; k < p.nodes.length; k++) assert(adjacent(wrapped, p.nodes[k - 1], p.nodes[k]), "wrapped step " + k + " not adjacent");
    const q = H.findRiverPath(flat, { mx: 1, my: 5 }, { seaLevel: 0.01 });
    assert(q.ok && q.nodes.length === 19, "unwrapped path should be 19 nodes, got " + (q.ok ? q.nodes.length : q.reason));
});

check("macro_budget", () => {
    const grid = H.createMacroGrid({ width: 20, height: 12, cellSize: 16, elevation: (x, y) => 1 - y / 11 });
    const p = H.findRiverPath(grid, { mx: 10, my: 0 }, { seaLevel: 0.05, maxExpansions: 3 });
    assert(!p.ok && p.reason === "budget", "expected budget stop, got " + JSON.stringify({ ok: p.ok, reason: p.reason }));
    assert(p.expansions === 3, "expansions " + p.expansions);
    const plan = H.planMacroRivers(grid, { sources: [{ mx: 10, my: 0 }], seaLevel: 0.05, maxExpansions: 3 });
    assert(plan.rivers.length === 0 && plan.failed.length === 1 && plan.failed[0].reason === "budget", "planMacroRivers should list the budget failure");
});

check("macro_landlocked", () => {
    // A bowl: lowest at (6, 4), everything above sea.
    const grid = H.createMacroGrid({ width: 13, height: 9, cellSize: 16, elevation: (x, y) => 0.5 + 0.03 * Math.hypot(x - 6, y - 4) });
    const p = H.findRiverPath(grid, { mx: 0, my: 0 }, { seaLevel: 0.1 });
    assert(p.ok, "path failed: " + p.reason);
    assert(p.terminal === "lake", "terminal " + p.terminal);
    const end = p.nodes[p.nodes.length - 1];
    assert(end.mx === 6 && end.my === 4, "should end at the bowl's lowest node, ended at " + JSON.stringify(end));
    assert(p.lake && p.lake.mx === end.mx && p.lake.my === end.my, "lake is not at the basin minimum");
    assert(Math.abs(p.lake.surface - 0.53) < 1e-9, "lake surface should reach the lowest surrounding rim");
    assert(Math.abs(p.lake.depth - 0.03) < 1e-9, "standing lake depth should be 0.03, got " + p.lake.depth);
    assert(p.bed.every((e, k) => k === 0 || e <= p.bed[k - 1]), "lake inflow bed climbs");
    const planned = H.planMacroRivers(grid, { sources: [{ mx: 0, my: 0 }], seaLevel: 0.1 });
    assert(planned.rivers.length === 1 && JSON.stringify(planned.rivers[0].lake) === JSON.stringify(p.lake), "network lost the lake metadata");
});

check("macro_deterministic", () => {
    const a = JSON.stringify(H.planMacroRivers(ruggedGrid(32, 24, 4242, true), { seed: 99, count: 5, minElevation: 0.9, minSpacing: 5, seaLevel: SEA }));
    const b = JSON.stringify(H.planMacroRivers(ruggedGrid(32, 24, 4242, true), { seed: 99, count: 5, minElevation: 0.9, minSpacing: 5, seaLevel: SEA }));
    assert(a === b, "two plans from the same inputs differ");
    const planned = JSON.parse(a);
    assert(planned.rivers.length > 0, "rugged fixture produced no rivers");
    for (const r of planned.rivers) {
        for (let k = 1; k < r.bed.length; k++) assert(r.bed[k] <= r.bed[k - 1], "planned river " + r.id + " climbs at node " + k);
    }
    const grid = ruggedGrid(32, 24, 4242, true);
    const seaIdx = grid.elev.findIndex(e => e <= SEA);
    assert(seaIdx >= 0, "fixture has no sea node");
    let code = null;
    try { H.findRiverPath(grid, { mx: seaIdx % grid.width, my: Math.floor(seaIdx / grid.width) }, { seaLevel: SEA }); } catch (e) { code = e.code; }
    assert(code === "E_SOURCE", "a source in the sea should throw E_SOURCE, got " + code);
    code = null;
    try { H.findRiverPath(grid, { mx: 40, my: 0 }, { seaLevel: SEA }); } catch (e) { code = e.code; }
    assert(code === "E_SOURCE", "an off-grid source should throw E_SOURCE, got " + code);
});

check("sources_spacing", () => {
    const grid = ruggedGrid(32, 24, 4242, true);
    const s = H.pickSources(grid, { seed: 3, count: 6, minElevation: 0.8, minSpacing: 4 });
    assert(s.length >= 3, "only " + s.length + " sources");
    let top = -Infinity;
    for (const e of grid.elev) top = Math.max(top, e);
    assert(grid.elev[s[0].my * grid.width + s[0].mx] === top, "first source is not the highest node");
    for (let i = 0; i < s.length; i++) {
        assert(grid.elev[s[i].my * grid.width + s[i].mx] >= 0.8, "source below minElevation");
        if (i) assert(grid.elev[s[i].my * grid.width + s[i].mx] <= grid.elev[s[i - 1].my * grid.width + s[i - 1].mx], "sources not highest first");
        for (let j = 0; j < i; j++) {
            const dx = Math.abs(s[i].mx - s[j].mx), dy = Math.abs(s[i].my - s[j].my);
            assert(Math.max(Math.min(dx, grid.width - dx), dy) >= 4, "sources " + i + " and " + j + " closer than 4");
        }
    }
    assert(JSON.stringify(s) === JSON.stringify(H.pickSources(grid, { seed: 3, count: 6, minElevation: 0.8, minSpacing: 4 })), "pickSources not deterministic");
});

check("micro_seams", () => {
    const whole = chunkedRaster(worldNet, 1 << 20);
    let wet = 0;
    for (const v of whole.river) if (v) wet++;
    assert(wet > 500, "fixture too dry: " + wet + " river tiles");
    for (const [cs, sh] of [[32, 1], [48, 2], [17, 3]]) {
        const r = sameRaster(whole, chunkedRaster(worldNet, cs, sh));
        assert(r.diff === 0, "chunk size " + cs + ": " + r.diff + " tiles differ from the whole raster, first at " + JSON.stringify(r.first));
    }
});

check("micro_bruteforce", () => {
    const rast = chunkedRaster(worldNet, 32, 7);
    const net = rast.net, grid = net.grid, hw = net.micro.halfWidth;
    const ref = new Uint16Array(rast.W * rast.H);
    net.rivers.forEach(r => {
        const c = net.micro.course(r.id);
        for (let k = 1; k < c.length; k++) {
            const a = c[k - 1], b = c[k];
            for (const sx of [-rast.W, 0, rast.W]) {
                for (let y = Math.ceil(Math.min(a.y, b.y) - hw); y <= Math.floor(Math.max(a.y, b.y) + hw); y++) {
                    for (let x = Math.ceil(Math.min(a.x, b.x) + sx - hw); x <= Math.floor(Math.max(a.x, b.x) + sx + hw); x++) {
                        if (x < 0 || x >= rast.W || y < 0 || y >= rast.H) continue;
                        if (dist2ToSegment({ x: x - sx, y }, a, b) > hw * hw + 1e-9) continue;
                        const i = y * rast.W + x;
                        if (!ref[i] || r.id + 1 < ref[i]) ref[i] = r.id + 1;
                    }
                }
            }
        }
    });
    let diff = 0, first = null;
    for (let i = 0; i < ref.length; i++) if (ref[i] !== rast.river[i]) { diff++; if (!first) first = [i % rast.W, Math.floor(i / rast.W), ref[i], rast.river[i]]; }
    assert(diff === 0, diff + " tiles differ from the brute-force drawing, first " + JSON.stringify(first));
    assert(grid.wrapX, "fixture should wrap");
});

check("micro_connected", () => {
    const rast = chunkedRaster(worldNet, 32);
    const net = rast.net;
    assert(net.rivers.length >= 3, "only " + net.rivers.length + " rivers");
    net.rivers.forEach(r => {
        const an = net.micro.anchors(r.id);
        const src = an[0], mouth = an[an.length - 1];
        const sx = mod(src.x, rast.W), sy = src.y, mx = mod(mouth.x, rast.W), my = mouth.y;
        assert(rast.river[sy * rast.W + sx], "river " + r.id + " source anchor tile is dry");
        assert(rast.river[my * rast.W + mx], "river " + r.id + " mouth anchor tile is dry");
        const seen = flood(rast, sx, sy, true, false);
        assert(seen[my * rast.W + mx], "river " + r.id + ": mouth not 4-connected to source");
    });
});

check("micro_perturbed", () => {
    const net = worldNet();
    net.rivers.forEach(r => {
        const c = net.micro.course(r.id), an = net.micro.anchors(r.id);
        assert(c.length >= an.length * 3, "river " + r.id + ": " + c.length + " course vertices for " + an.length + " anchors");
        let off = 0;
        for (const p of c) {
            let best = Infinity;
            for (let k = 1; k < an.length; k++) best = Math.min(best, distToSegment(p, an[k - 1], an[k]));
            if (best >= 1) off++;
        }
        assert(off >= c.length * 0.25, "river " + r.id + ": only " + off + "/" + c.length + " vertices off the anchor line");
    });
});

check("micro_bounded", () => {
    const net = worldNet();
    let worst = 0;
    net.rivers.forEach(r => {
        const an = net.micro.anchors(r.id);
        const c = net.micro.course(r.id);
        // Walk the course segment by segment: vertex j belongs to the macro segment whose cut produced it.
        let seg = 1;
        for (const p of c) {
            const d = distToSegment(p, an[seg - 1], an[seg]);
            worst = Math.max(worst, d);
            assert(d <= net.micro.maxDeviation, "river " + r.id + " vertex " + JSON.stringify(p) + " is " + d.toFixed(2) + " from its macro segment (bound " + net.micro.maxDeviation.toFixed(2) + ")");
            if (p.x === an[seg].x && p.y === an[seg].y && seg < an.length - 1) seg++;
        }
    });
    // Tighter than the bound: the cut stays within one cell of the macro line.
    assert(worst <= net.grid.cellSize, "worst deviation " + worst.toFixed(2) + " exceeds one cell (" + net.grid.cellSize + ")");
});

check("micro_absolute_hash", () => {
    const grid = ruggedGrid(32, 24, 4242, true);
    const full = H.planMacroRivers(grid, { seed: 99, count: 5, minElevation: 0.9, minSpacing: 5, seaLevel: SEA }).rivers;
    assert(full.length >= 2, "need two rivers");
    const r = full[1];
    const k = Math.floor(r.nodes.length / 2);
    // The same two macro nodes as the only river of a second network, with the same beds.
    const lone = [{ id: 0, nodes: r.nodes.slice(k, k + 2), bed: r.bed.slice(k, k + 2) }];
    const opts = { seed: 99, halfWidth: 1, amplitude: 0.3 };
    const a = H.createMicroCourses(grid, full, opts), b = H.createMicroCourses(grid, lone, opts);
    const anA = a.anchors(1), anB = b.anchors(0);
    // Same anchors up to a whole-world shift (wrap), and the same cut.
    const shift = anB[0].x - anA[k].x;
    assert(shift % grid.tilesW === 0 && anB[0].y === anA[k].y, "anchor of node " + k + " differs: " + JSON.stringify([anA[k], anB[0]]));
    const ca = a.course(1), cb = b.course(0);
    const i0 = ca.findIndex(p => p.x === anA[k].x && p.y === anA[k].y);
    const i1 = ca.findIndex((p, i) => i > i0 && p.x === anA[k + 1].x && p.y === anA[k + 1].y);
    assert(i0 >= 0 && i1 > i0, "segment not found in the full course");
    const piece = ca.slice(i0, i1 + 1).map(p => [p.x + shift, p.y]);
    assert(JSON.stringify(piece) === JSON.stringify(cb.map(p => [p.x, p.y])), "the shared segment is cut differently: " + JSON.stringify(piece.slice(0, 4)) + " vs " + JSON.stringify(cb.slice(0, 4).map(p => [p.x, p.y])));
    // A different seed cuts it differently (the hash is seeded).
    const c = H.createMicroCourses(grid, lone, Object.assign({}, opts, { seed: 100 })).course(0);
    assert(JSON.stringify(c.map(p => [p.x, p.y])) !== JSON.stringify(cb.map(p => [p.x, p.y])), "seed has no effect on the cut");
});

check("micro_bed_monotone", () => {
    const rast = chunkedRaster(worldNet, 32);
    const net = rast.net;
    let lo = Infinity, hi = -Infinity;
    net.rivers.forEach(r => {
        const c = net.micro.course(r.id);
        for (let k = 1; k < c.length; k++) assert(c[k].bed <= c[k - 1].bed, "river " + r.id + " course bed climbs at vertex " + k);
        lo = Math.min(lo, c[c.length - 1].bed);
        hi = Math.max(hi, c[0].bed);
    });
    let wet = 0;
    for (let i = 0; i < rast.river.length; i++) {
        if (!rast.river[i]) { assert(isNaN(rast.bed[i]), "dry tile has a bed"); continue; }
        wet++;
        assert(rast.bed[i] >= Math.fround(lo) - 1e-6 && rast.bed[i] <= Math.fround(hi) + 1e-6, "tile bed " + rast.bed[i] + " outside [" + lo + ", " + hi + "]");
    }
    assert(wet > 0, "no river tiles");
});

check("micro_wrap_seam", () => {
    // Sea in column 1 only. Ground rises from column 2 to 10, then falls from 11 east to 0,
    // so a source at 17 runs east over the seam (19 -> 0) to the sea.
    const elevation = (x, y) => x === 1 ? 0 : x >= 2 && x <= 10 ? 0.4 + 0.05 * x : 0.4 + 0.02 * mod(21 - x, 20) + 0.002 * y;
    const makeNet = () => {
        const grid = H.createMacroGrid({ width: 20, height: 8, cellSize: 16, wrapX: true, elevation });
        return H.createRiverNetwork(grid, { seed: 5, sources: [{ mx: 17, my: 4 }], seaLevel: 0.01, halfWidth: 1, amplitude: 0.3 });
    };
    const net = makeNet();
    assert(net.rivers.length === 1, "no river: " + JSON.stringify(net.failed));
    const nodes = net.rivers[0].nodes;
    assert(nodes.some(n => n.mx === 19) && nodes.some(n => n.mx === 0), "fixture: the macro path should cross the seam, got " + JSON.stringify(nodes));
    const rast = chunkedRaster(makeNet, 32);
    let left = 0, right = 0;
    for (let y = 0; y < rast.H; y++) { if (rast.river[y * rast.W]) left++; if (rast.river[y * rast.W + rast.W - 1]) right++; }
    assert(left > 0 && right > 0, "river missing at the seam: column 0 has " + left + ", column " + (rast.W - 1) + " has " + right);
    const an = net.micro.anchors(0);
    const src = an[0], mouth = an[an.length - 1];
    const seen = flood(rast, mod(src.x, rast.W), src.y, true, false);
    assert(seen[mouth.y * rast.W + mod(mouth.x, rast.W)], "source and mouth not 4-connected across the seam");
    const noWrapFlood = flood(rast, mod(src.x, rast.W), src.y, false, false);
    assert(!noWrapFlood[mouth.y * rast.W + mod(mouth.x, rast.W)], "fixture: the river should only connect through the seam");
});

check("micro_locality", () => {
    const net = worldNet();
    const W = net.grid.tilesW, Hh = net.grid.tilesH;
    let wetChunk = null, dryChunk = null;
    for (let y = 0; y < Hh && !(wetChunk && dryChunk); y += 32) for (let x = 0; x < W; x += 32) {
        const r = net.micro.rasterizeChunk(x, y, 32, 32);
        const wet = r.river.some(v => v > 0);
        if (wet && !wetChunk) wetChunk = r;
        if (!wet && r.stats.segmentsTested === 0 && !dryChunk) dryChunk = r;
    }
    assert(wetChunk, "no wet chunk");
    assert(wetChunk.stats.segmentsTested <= net.micro.segmentCount / 4, "a 32x32 chunk tested " + wetChunk.stats.segmentsTested + " of " + net.micro.segmentCount + " segments");
    assert(dryChunk, "no chunk tested zero segments (every chunk scanned something)");
});

check("micro_args", () => {
    const grid = ruggedGrid(8, 8, 1, false);
    for (const [opts, what] of [[{ halfWidth: 0.5 }, "halfWidth"], [{ amplitude: 0.6 }, "amplitude"], [{ minSegment: 2 }, "minSegment"], [{ jitter: 8 }, "jitter"]]) {
        let code = null;
        try { H.createMicroCourses(grid, [], opts); } catch (e) { code = e.code; }
        assert(code === "E_ARG", what + " out of range should throw E_ARG, got " + code);
    }
    let code = null;
    try { H.createMacroGrid({ width: 2, height: 2, elevation: [0, 1, NaN, 2] }); } catch (e) { code = e.code; }
    assert(code === "E_GRID", "NaN elevation should throw E_GRID, got " + code);
});

//-----------------------------------------------------------------------------
// Runner

function runChecks() {
    let passed = 0, failed = 0;
    const failedNames = [];
    for (const c of checks) {
        if (onlyCase && c.name !== onlyCase) continue;
        try {
            c.fn();
            passed++;
            console.log("PASS " + c.name);
        } catch (e) {
            failed++;
            failedNames.push(c.name);
            console.log("FAIL " + c.name + ": " + e.message);
        }
    }
    if (onlyCase && passed + failed === 0) { console.log("FAIL no check named " + onlyCase); return 1; }
    console.log((process.env.MUTANT ? "[mutant " + process.env.MUTANT + "] " : "") + passed + " passed, " + failed + " failed" + (failed ? " (" + failedNames.join(", ") + ")" : ""));
    return failed ? 1 : 0;
}

function runMutants() {
    let survivors = 0;
    for (const m of MUTANTS) {
        const env = Object.assign({}, process.env, { MUTANT: m });
        const r = spawnSync(process.execPath, [__filename], { env, encoding: "utf8" });
        const killedBy = (r.stdout.match(/^FAIL (\S+?):/gm) || []).map(s => s.slice(5, -1));
        if (r.status === 1 && killedBy.length) console.log("KILLED " + m + " by " + killedBy.join(", "));
        else { survivors++; console.log("SURVIVED " + m + " (exit " + r.status + ")" + (r.stderr ? " " + r.stderr.trim().split("\n")[0] : "")); }
    }
    console.log((MUTANTS.length - survivors) + "/" + MUTANTS.length + " mutants killed");
    return survivors ? 1 : 0;
}

process.exitCode = process.argv.includes("--all-mutants") ? runMutants() : runChecks();
