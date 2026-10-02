//=============================================================================
// DEUS_Structural.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Structural] Unheld matter falls: events, shared tick, fall commit, occupants (NAT.02.01.BRIDGE).
 * @author UF project
 * @base DEUS_World
 * @orderAfter DEUS_Objects
 * @orderAfter DEUS_Items
 * @orderAfter DEUS_Combat
 * @orderAfter DEUS_Levels
 *
 * @help
 * DEC-083 (Owner): a solid block is held while a chain of face-adjacent solid
 * blocks, across Z too, reaches the bottom of the world. Otherwise it falls
 * straight down as one rigid piece to first contact. Matter is moved, never
 * converted, and what it lands on is crushed. Design:
 * docs/design/COLLAPSE_REPLAN_DEC083.md sections 6 to 8.
 *
 * A block is one 2 ft stratum (x, y, g), g = 5 * (z + 16) + s. The reader is
 * game/js/sim/structural/levels_reader.js: stone, soil and wood with HP above 0
 * are solid, and so are wall and door objects. A solid block on the lowest
 * stratum of the world range is an anchor. Nothing else is.
 *
 * How it runs:
 * - Events only enqueue. levels:strataChanged, objects:changed and
 *   objects:levelChanged queue check seeds: the six neighbours of a removed
 *   block, and a placed block. The handlers read no geometry.
 * - One handler on the shared tick: UF.Sim.onTick("structure", 50). There is
 *   no frame hook. An empty queue costs nothing (no reads, no unit scan).
 * - A check is a depth-first search from a seed, down first, that stops at the
 *   first anchor. A piece searched to the end without an anchor falls. A piece
 *   that touches an unknown area is held ("unknown_edge"). Every block read is
 *   charged to one counter of 512 reads per tick. Up to 4 checks share it
 *   round-robin and go on next tick. Running out of reads is "pending", never
 *   "falls".
 * - At most one fall is committed per tick, lowest piece first, through
 *   commitFall (game/js/sim/structural/commit.js): vacate first, then fill,
 *   through UF.Levels.setStrata with cause "structural:fall". Its written cells
 *   times 8 are charged to the counter and may put it in debt that the next
 *   ticks repay.
 * - Then the occupants (planOccupants, occupants.js): a crushed unit dies
 *   (Owner, re-plan OQ2), a unit left with no floor falls to the first cell it
 *   can stand on and takes SRD falling damage, items move and are never
 *   destroyed, and a wall or door in the piece or an object whose floor went
 *   breaks to its ruin.
 * - The fall posts nothing to the matter ledger.
 *
 * Save: contents.deusStructural = { v: 1, seeds: [[ax, ay, x, y, g], ...] },
 * the checks not done yet. Nothing is in flight between ticks; a load starts
 * the checks again from their seeds.
 *
 * window.UF.Structural:
 *   enabled        false: events are ignored and the tick does nothing
 *   mode           "live" commits falls; "observe" only counts verdicts
 *   explain(ref)   why the block at ref { area, x, y, z, s } is held or not
 *   stats()        the counters, as a new object
 *
 * No parameters. No plugin commands. The PM registers the plugin in plugins.js.
 */

(() => {
    "use strict";

    // Tests replace these constants. The values are the rules (re-plan section 11 item 4; not measured).
    const READS_PER_TICK = 512;     // block reads per tick, shared by every check
    const MAX_JOBS = 4;             // checks in progress at once
    const QUANTUM = 32;             // reads a check gets per round-robin turn
    const MAX_VISITS = 65536;       // a search past this is held, with a diagnostic
    const MAX_PIECE = 20000;        // a piece bigger than this does not fall
    const COMMITS_PER_TICK = 1;
    const OPS_PER_CELL = 8;         // reads charged per cell a commit writes
    const TICK_ORDER = 50;
    const SUBSCRIBE = true;
    const CRUSH_LETHAL = true;      // Owner 2026-10-01 (re-plan section 10, OQ2): a crushed unit dies
    const FEET_PER_STRATUM = 2;
    const FEET_PER_LEVEL = 10;
    const EXPLAIN_READS = 4096;
    const HISTORY = 64;
    const SAVE_VERSION = 1;
    const SALT_OCCUPANTS = 0x57c0;

    const UF = window.UF = window.UF || {};

    //-------------------------------------------------------------------------
    // Sim modules (UF.Sim.require; loaded once)

    let mods = null;
    function sim() {
        if (mods) return mods;
        const S = UF.Sim;
        if (!S || typeof S.require !== "function") throw new Error("DEUS_Structural: UF.Sim.require is missing (DEUS_World must load first)");
        const index = S.require("structural/index");
        const levels = S.require("structural/levels_reader");
        mods = { commitFall: index.commitFall, planOccupants: index.planOccupants, createLevelsReader: levels.createLevelsReader,
            gOf: levels.gOf, zOfG: levels.zOfG, sOfG: levels.sOfG, isSolidByte: levels.isSolidByte, STRATA: levels.STRATA };
        return mods;
    }

    const keyOf = (ax, ay, x, y, g) => ax + "," + ay + "," + x + "," + y + "," + g;
    const STRUCTURAL_TAGS = ["wall", "door"];
    // Neighbour order of the reader: down, north, east, south, west, up.
    const STEPS = [[0, 0, -1], [0, -1, 0], [1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, 0, 1]];

    //-------------------------------------------------------------------------
    // Runtime state: rebuilt from the seeds after a load, empty in a new world

    const rt = {
        queue: [], head: 0, queued: new Set(), sorted: true,
        jobs: [],
        epoch: 0,
        settled: new Set(),     // blocks found held in this epoch
        touched: [],            // block keys changed since the last service (removed blocks, neighbours of placed ones)
        watch: new Map(),       // area key -> seeds held as unknown_edge
        debt: 0
    };
    let stats = freshStats();
    function freshStats() {
        return {
            ticks: 0, idleTicks: 0, reads: 0, explainReads: 0, explains: 0,
            enqueued: 0, skipped: 0, restarts: 0,
            verdicts: { air: 0, held: 0, falls: 0, unknown_edge: 0, too_big: 0 },
            holds: { too_big_to_fall: 0, multi_area: 0, no_drop: 0, unknown_below: 0 },
            commits: 0, cellsWritten: 0, deferred: 0, refused: 0, observed: 0,
            crushed: 0, fell: 0, killed: 0, itemsMoved: 0, objectsBroken: 0,
            lastFall: null, lastVerdict: null, lastError: null, history: []
        };
    }

    function reset() {
        rt.queue = []; rt.head = 0; rt.queued.clear(); rt.sorted = true;
        rt.jobs = []; rt.epoch++; rt.settled.clear(); rt.touched.length = 0; rt.watch.clear(); rt.debt = 0;
    }

    function noteError(where, err) {
        stats.lastError = where + ": " + (err && err.message ? err.message : String(err));
        console.error("DEUS_Structural " + where + ":", err);
    }

    //-------------------------------------------------------------------------
    // The queue: deduplicated, FIFO by tick, then (g, y, x)

    function stamp() {
        return UF.Sim && typeof UF.Sim.tickCount === "function" ? UF.Sim.tickCount() : 0;
    }
    function enqueue(ax, ay, x, y, g, t) {
        const k = keyOf(ax, ay, x, y, g);
        if (rt.queued.has(k)) return;
        rt.queued.add(k);
        rt.queue.push({ ax, ay, x, y, g, k, t });
        rt.sorted = false;
        stats.enqueued++;
    }
    function pull() {
        if (!rt.sorted) {
            const rest = rt.queue.slice(rt.head);
            rest.sort((a, b) => (a.t - b.t) || (a.g - b.g) || (a.y - b.y) || (a.x - b.x) || (a.ax - b.ax) || (a.ay - b.ay));
            rt.queue = rest;
            rt.head = 0;
            rt.sorted = true;
        }
        const seed = rt.queue[rt.head++];
        rt.queued.delete(seed.k);
        if (rt.head > 1024 && rt.head * 2 > rt.queue.length) {
            rt.queue = rt.queue.slice(rt.head);
            rt.head = 0;
        }
        return seed;
    }
    const queuedCount = () => rt.queue.length - rt.head;

    //-------------------------------------------------------------------------
    // Event handlers: enqueue only (no geometry reads)

    function wrapCell(ax, ay, x, y) {
        const st = UF.World && UF.World.state;
        const size = st && st.size, nx = st && (st.areasX || 1), ny = st && (st.areasY || 1);
        if (!size) return null;
        while (x < 0) { x += size; ax--; }
        while (x >= size) { x -= size; ax++; }
        while (y < 0) { y += size; ay--; }
        while (y >= size) { y -= size; ay++; }
        return { ax: ((ax % nx) + nx) % nx, ay: ((ay % ny) + ny) % ny, x, y };
    }
    function forNeighbours(ax, ay, x, y, g, fn) {
        for (let i = 0; i < STEPS.length; i++) {
            const c = wrapCell(ax, ay, x + STEPS[i][0], y + STEPS[i][1]);
            if (c) fn(c.ax, c.ay, c.x, c.y, g + STEPS[i][2]);
        }
    }
    function removed(ax, ay, x, y, g) {
        const t = stamp();
        rt.touched.push(keyOf(ax, ay, x, y, g));
        forNeighbours(ax, ay, x, y, g, (nax, nay, nx, ny, ng) => enqueue(nax, nay, nx, ny, ng, t));
    }
    function placed(ax, ay, x, y, g) {
        enqueue(ax, ay, x, y, g, stamp());
        forNeighbours(ax, ay, x, y, g, (nax, nay, nx, ny, ng) => rt.touched.push(keyOf(nax, nay, nx, ny, ng)));
    }

    // levels:strataChanged(ref, { before, after, cause }); records are [connector, m0..m4, hp0..hp4].
    function onStrataChanged(ref, change) {
        if (!Structural.enabled || !ref || !change || !change.before || !change.after) return;
        try {
            const M = sim(), a = ref.area || { x: 0, y: 0 };
            for (let s = 0; s < M.STRATA; s++) {
                const was = M.isSolidByte(change.before[1 + s], change.before[6 + s]);
                const now = M.isSolidByte(change.after[1 + s], change.after[6 + s]);
                if (was === now) continue;
                if (was) removed(a.x, a.y, ref.x, ref.y, M.gOf(ref.z, s));
                else placed(a.x, a.y, ref.x, ref.y, M.gOf(ref.z, s));
            }
        } catch (e) {
            noteError("levels:strataChanged", e);
        }
    }

    function structuralType(id) {
        if (id === null || id === undefined || !UF.Objects) return false;
        const t = UF.Objects.type(id);
        return !!(t && Array.isArray(t.tags) && STRUCTURAL_TAGS.some(tag => t.tags.indexOf(tag) >= 0));
    }
    // objects:changed(area, x, y, fromId, toId) on the ground; objects:levelChanged(levelArea, ...) on other levels.
    function onObjectChanged(area, x, y, fromId, toId) {
        if (!Structural.enabled || !area) return;
        try {
            const from = structuralType(fromId), to = structuralType(toId);
            if (!from && !to) return;
            const M = sim(), z = area.z === undefined ? 0 : area.z;
            if (from) for (let s = 0; s < M.STRATA; s++) removed(area.x, area.y, x, y, M.gOf(z, s));
            else placed(area.x, area.y, x, y, M.gOf(z, M.STRATA - 1));
        } catch (e) {
            noteError("objects:changed", e);
        }
    }

    // A seam for 3x3 worlds (lane-dd): when an area appears, its unknown_edge checks run again.
    function onAreaGenerated(area) {
        if (!area) return;
        const k = area.x + "," + area.y, seeds = rt.watch.get(k);
        if (!seeds) return;
        rt.watch.delete(k);
        const t = stamp();
        for (const s of seeds) enqueue(s.ax, s.ay, s.x, s.y, s.g, t);
    }

    //-------------------------------------------------------------------------
    // Reading blocks (charged) and the bounded search

    function makeReader(cache) {
        const W = UF.World, st = W.state, zr = W.zRange();
        return sim().createLevelsReader({
            levels: UF.Levels,
            objects: UF.Objects ? { atIn: (a, x, y) => UF.Objects.atIn(a, x, y) } : null,
            isKnown: (ax, ay, z) => W.inWorld(ax, ay, z) && (typeof W.areaGenerated !== "function" || !!W.areaGenerated(ax, ay)),
            world: { size: st.size, zMin: zr.zMin, zMax: zr.zMax, areasX: st.areasX || 1, areasY: st.areasY || 1 },
            cache: cache !== false
        });
    }
    function read(reader, counter, ax, ay, x, y, g) {
        counter.left--;
        counter.used++;
        return reader.block(ax, ay, x, y, g);
    }
    function newJob(seed, trace) {
        return { seed, epoch: rt.epoch, visited: new Map(), stack: [], verdict: null, started: false, unknown: false,
            anchor: null, minG: Infinity, ready: false, parents: trace ? new Map() : null };
    }
    function restart(job) {
        job.visited = new Map(); job.stack = []; job.verdict = null; job.started = false; job.unknown = false;
        job.anchor = null; job.minG = Infinity; job.ready = false; job.epoch = rt.epoch;
        if (job.parents) job.parents = new Map();
        stats.restarts++;
    }
    function visit(job, k, ax, ay, x, y, g, block, parentKey) {
        const node = { k, ax, ay, x, y, g, source: block.source, i: 0, nbs: null };
        job.visited.set(k, node);
        if (g < job.minG) job.minG = g;
        if (job.parents) job.parents.set(k, parentKey);
        return node;
    }

    // Runs one check for at most `quantum` reads. Sets job.verdict when it is decided.
    function step(job, reader, counter, quantum, range) {
        let n = 0;
        if (!job.started) {
            job.started = true;
            const s = job.seed;
            const b = read(reader, counter, s.ax, s.ay, s.x, s.y, s.g);
            n++;
            if (!b.solid) { job.verdict = b.state === "unknown" ? "unknown_edge" : "air"; return; }
            const node = visit(job, s.k, s.ax, s.ay, s.x, s.y, s.g, b, null);
            if (b.anchor) { job.verdict = "held"; job.anchor = node; return; }
            job.stack.push(node);
        }
        while (job.stack.length && n < quantum && counter.left > 0) {
            const top = job.stack[job.stack.length - 1];
            if (top.i >= 6) { top.nbs = null; job.stack.pop(); continue; }
            const nbs = top.nbs || (top.nbs = reader.neighbours(top.ax, top.ay, top.x, top.y, top.g));
            const nb = nbs[top.i++];
            if (nb.g < range.gMin || nb.g > range.gMax) continue;   // outside the world range: air
            const k = keyOf(nb.ax, nb.ay, nb.x, nb.y, nb.g);
            if (job.visited.has(k)) continue;
            const b = read(reader, counter, nb.ax, nb.ay, nb.x, nb.y, nb.g);
            n++;
            if (b.state === "unknown") { job.unknown = true; continue; }
            if (!b.solid) continue;
            const node = visit(job, k, nb.ax, nb.ay, nb.x, nb.y, nb.g, b, top.k);
            if (b.anchor) { job.verdict = "held"; job.anchor = node; return; }
            if (job.visited.size > MAX_VISITS) { job.verdict = "too_big"; return; }
            job.stack.push(node);
        }
        if (!job.stack.length && !job.verdict) job.verdict = job.unknown ? "unknown_edge" : "falls";
    }

    function worldRange() {
        const zr = UF.World.zRange(), M = sim();
        return { zMin: zr.zMin, zMax: zr.zMax, gMin: M.gOf(zr.zMin, 0), gMax: M.gOf(zr.zMax, M.STRATA - 1) };
    }

    //-------------------------------------------------------------------------
    // The fall plan: the smallest gap under the piece, positions in the piece counting as free

    function planFall(job, reader, counter, range) {
        const blocks = Array.from(job.visited.values());
        if (blocks.length > MAX_PIECE) return { hold: "too_big_to_fall", size: blocks.length };
        const ax = blocks[0].ax, ay = blocks[0].ay;
        if (blocks.some(b => b.ax !== ax || b.ay !== ay)) return { hold: "multi_area", size: blocks.length };
        const strata = blocks.filter(b => b.source === "stratum").sort((a, b) => a.g - b.g);
        const objects = blocks.filter(b => b.source === "object");
        let drop = strata.length ? Infinity : 0, contact = null;
        for (const b of strata) {
            let d = 0, g = b.g - 1, hit = null;
            while (d < drop && g >= range.gMin) {
                if (!job.visited.has(keyOf(b.ax, b.ay, b.x, b.y, g))) {
                    const nb = read(reader, counter, b.ax, b.ay, b.x, b.y, g);
                    if (nb.state === "unknown") return { hold: "unknown_below", size: blocks.length };
                    if (nb.solid) { hit = { x: b.x, y: b.y, g }; break; }
                }
                d++;
                g--;
            }
            if (d < drop) { drop = d; contact = hit; }
        }
        if (strata.length && (!(drop > 0) || drop === Infinity)) return { hold: "no_drop", size: blocks.length };
        const M = sim();
        return {
            area: { x: ax, y: ay },
            drop,
            contact,
            vacated: strata.map(b => ({ x: b.x, y: b.y, g: b.g })),
            filled: strata.map(b => ({ x: b.x, y: b.y, g: b.g - drop })),
            objectCells: objects.map(b => ({ x: b.x, y: b.y, z: M.zOfG(b.g) })),
            size: blocks.length
        };
    }

    //-------------------------------------------------------------------------
    // Commit and occupants

    function matterCover(fn) {
        const Mx = UF.Matter;
        return Mx && typeof Mx.cover === "function" ? Mx.cover(fn) : fn();
    }

    function kill(u, cause) {
        const W = UF.World, C = UF.Combat;
        u.data = u.data || {};
        u.data.deathCause = cause;
        let done = false;
        if (C && typeof C.onUnitDeath === "function") {
            try { done = C.onUnitDeath(u, null) !== false; } catch (e) { noteError("onUnitDeath", e); }
        }
        if (!done && W.unit(u.id)) W.removeUnit(u.id);
        stats.killed++;
    }
    function hurt(u, dmg) {
        const d = u.data;
        if (!d || typeof d.hp !== "number" || !(dmg > 0)) return false;
        d.hp = Math.max(0, d.hp - dmg);
        const C = UF.Combat, W = UF.World;
        if (C && typeof C.addPopup === "function" && typeof W.isDisplayed === "function" && W.isDisplayed(u)) C.addPopup(u.x, u.y, "-" + dmg);
        return d.hp <= 0;
    }

    // One pass over the units of each changed level, and the items and objects of the changed cells.
    function bindOccupants(plan, res, tick, range) {
        const W = UF.World, L = UF.Levels, I = UF.Items, O = UF.Objects, M = sim();
        const ax = plan.area.x, ay = plan.area.y;
        const cells = new Map(), levels = new Set();
        const add = (x, y, z) => {
            if (z < range.zMin || z > range.zMax) return;
            const k = x + "," + y + "," + z;
            if (!cells.has(k)) cells.set(k, { x, y, z });
            levels.add(z);
        };
        for (const w of res.writes) for (let d = -1; d <= 1; d++) add(w.x, w.y, w.z + d);
        for (const c of plan.objectCells) add(c.x, c.y, c.z);
        const units = [], items = [], objects = [], objectAt = new Map();
        for (const z of levels) {
            for (const u of W.unitsInArea(ax, ay, z)) if (cells.has(u.x + "," + u.y + "," + z)) units.push({ id: u.id, x: u.x, y: u.y, z });
        }
        for (const [k, c] of cells) {
            const la = { x: ax, y: ay, z: c.z };
            if (I && typeof I.atIn === "function") for (const it of I.atIn(la, c.x, c.y)) items.push({ id: it.id, x: c.x, y: c.y, z: c.z });
            const t = O ? O.atIn(la, c.x, c.y) : null;
            if (t) {
                objects.push({ id: k, x: c.x, y: c.y, z: c.z, tags: t.tags || [], ruin: t.ruin || null });
                objectAt.set(k, c);
            }
        }
        if (!units.length && !items.length && !objects.length) return;
        const rules = UF.Rules;
        if (!rules || typeof rules.fallingDamage !== "function") {
            noteError("occupants", new Error("UF.Rules.fallingDamage is not published (DEUS_Combat): occupants were not moved"));
            return;
        }
        const ref = (x, y, z) => ({ area: { x: ax, y: ay }, x, y, z });
        const standable = (x, y, z) => L.standableShape(ref(x, y, z)) && !(O && O.blocksIn({ x: ax, y: ay, z }, x, y));
        const size = W.state.size;
        const occ = M.planOccupants({
            queries: {
                derivesSolid: (x, y, z) => L.shapeAt(ref(x, y, z)) === "solid",
                standable,
                hasStandingSurface: (x, y, z) => L.standableShape(ref(x, y, z))
            },
            rules,
            rng: W.mulberry32(W.hash32(W.state.seed >>> 0, SALT_OCCUPANTS, tick, stats.commits)),
            zMin: range.zMin, zMax: range.zMax, radius: 3, levelFeet: FEET_PER_LEVEL,
            dropFeet: plan.drop * FEET_PER_STRATUM,
            bounds: { x0: 0, y0: 0, x1: size - 1, y1: size - 1 },
            units, items, objects,
            vacated: plan.vacated.concat(plan.objectCells),
            filled: plan.filled
        });
        for (const p of occ.units) {
            const u = W.unit(p.id);
            if (!u) continue;
            if (p.to) W.moveUnitToLevel(u, p.to.z, p.to.x, p.to.y);
            if (p.effect === "crush" && CRUSH_LETHAL) {
                stats.crushed++;
                kill(u, "crushed");
                continue;
            }
            const died = hurt(u, p.damage && p.damage.damage);
            if (p.kill || died) kill(u, p.cause);
            else stats.fell++;
        }
        for (const p of occ.items) {
            if (!p.to || !I) continue;
            if (I.putDown(p.id, { x: ax, y: ay, z: p.to.z }, p.to.x, p.to.y)) stats.itemsMoved++;
        }
        if (occ.objects.length && O) {
            matterCover(() => {
                for (const p of occ.objects) {
                    const c = objectAt.get(p.id);
                    if (!c) continue;
                    O.setIn({ x: ax, y: ay, z: c.z }, c.x, c.y, null);
                    stats.objectsBroken++;
                    const at = p.placeAt;
                    if (!p.ruin || !at || !O.type(p.ruin) || !standable(at.x, at.y, at.z)) continue;
                    const la = { x: ax, y: ay, z: at.z };
                    if (!O.atIn(la, at.x, at.y)) O.setIn(la, at.x, at.y, p.ruin);
                }
            });
        }
    }

    // Commits a decided fall. Returns true when the world changed.
    function commit(job, reader, counter, tick, range) {
        const plan = planFall(job, reader, counter, range);
        if (plan.hold) {
            stats.holds[plan.hold]++;
            stats.lastVerdict = { verdict: "held", reason: plan.hold, size: plan.size, seed: job.seed.k, tick };
            return false;
        }
        let res = { ok: true, writes: [] };
        if (plan.vacated.length) {
            res = sim().commitFall({ area: plan.area, drop: plan.drop, vacated: plan.vacated, filled: plan.filled, contact: plan.contact },
                { levels: UF.Levels, events: UF.Events });
        }
        counter.left -= Math.max(1, res.writes ? res.writes.length : 0) * OPS_PER_CELL;
        if (!res.ok) {
            stats.refused++;
            stats.lastVerdict = { verdict: "refused", reason: res.reason, restored: res.restored, seed: job.seed.k, tick };
            console.warn("DEUS_Structural: a fall was refused: " + res.reason);
            return false;
        }
        stats.commits++;
        stats.cellsWritten += res.writes.length;
        stats.lastFall = { tick, area: plan.area, drop: plan.drop, blocks: plan.vacated.length, objects: plan.objectCells.length,
            cells: res.writes.length, seed: job.seed.k, contact: plan.contact };
        try {
            bindOccupants(plan, res, tick, range);
        } catch (e) {
            noteError("occupants", e);
        }
        return true;
    }

    //-------------------------------------------------------------------------
    // The tick

    // Checks whose visited set holds a changed block are stale: they start again. Held verdicts of older epochs are dropped.
    function invalidate() {
        if (!rt.touched.length) return;
        rt.epoch++;
        rt.settled.clear();
        if (rt.jobs.length) {
            const touched = new Set(rt.touched);
            for (const job of rt.jobs) {
                for (const k of touched) {
                    if (job.visited.has(k)) { restart(job); break; }
                }
            }
        }
        rt.touched.length = 0;
    }

    function finish(job, tick) {
        stats.verdicts[job.verdict]++;
        if (job.verdict === "held") {
            if (job.epoch === rt.epoch) for (const k of job.visited.keys()) rt.settled.add(k);
        } else if (job.verdict === "unknown_edge") {
            const k = job.seed.ax + "," + job.seed.ay;
            if (!rt.watch.has(k)) rt.watch.set(k, []);
            rt.watch.get(k).push(job.seed);
        } else if (job.verdict === "too_big") {
            stats.lastVerdict = { verdict: "too_big", reason: "the search passed " + MAX_VISITS + " blocks; held", seed: job.seed.k, tick };
            console.warn("DEUS_Structural: a check passed " + MAX_VISITS + " blocks and is held (" + job.seed.k + ")");
        } else if (job.verdict === "falls") {
            stats.lastVerdict = { verdict: "falls", size: job.visited.size, seed: job.seed.k, tick, mode: Structural.mode };
            if (Structural.mode !== "live") { stats.observed++; return false; }
            job.ready = true;
            return true;
        }
        return false;
    }

    // The ready fall with the lowest block goes first.
    function commitReady(reader, counter, tick, range) {
        let best = null;
        for (const job of rt.jobs) if (job.ready && (!best || job.minG < best.minG)) best = job;
        if (!best) return false;
        rt.jobs.splice(rt.jobs.indexOf(best), 1);
        const fell = commit(best, reader, counter, tick, range);
        reader.clearCache();
        invalidate();
        return fell;
    }

    function service(tick) {
        stats.ticks++;
        const range = worldRange();
        const reader = makeReader(true);
        const counter = { left: READS_PER_TICK - rt.debt, used: 0 };
        rt.debt = 0;
        invalidate();
        let commits = 0;
        const readyWaiting = () => rt.jobs.some(j => j.ready);
        if (commits < COMMITS_PER_TICK && readyWaiting() && commitReady(reader, counter, tick, range)) commits++;
        while (counter.left > 0) {
            while (rt.jobs.length < MAX_JOBS && queuedCount() > 0) {
                const seed = pull();
                if (rt.settled.has(seed.k)) { stats.skipped++; continue; }
                rt.jobs.push(newJob(seed, false));
            }
            const active = rt.jobs.filter(j => !j.ready);
            if (!active.length) break;
            for (const job of active) {
                if (counter.left <= 0) break;
                step(job, reader, counter, QUANTUM, range);
                if (!job.verdict) continue;
                if (!finish(job, tick)) rt.jobs.splice(rt.jobs.indexOf(job), 1);
            }
            if (commits < COMMITS_PER_TICK && readyWaiting() && commitReady(reader, counter, tick, range)) commits++;
        }
        if (readyWaiting() && commits >= COMMITS_PER_TICK) stats.deferred++;
        stats.reads += counter.used;
        if (counter.left < 0) rt.debt = -counter.left;
        stats.history.push({ tick, reads: counter.used, commits, debt: rt.debt, queued: queuedCount(), jobs: rt.jobs.length });
        if (stats.history.length > HISTORY) stats.history.shift();
    }

    function onTick(tick) {
        if (!Structural.enabled) return;
        if (queuedCount() === 0 && rt.jobs.length === 0 && rt.touched.length === 0 && rt.debt === 0) {
            stats.idleTicks++;
            return;
        }
        try {
            service(tick);
        } catch (e) {
            noteError("tick", e);
        }
    }

    //-------------------------------------------------------------------------
    // explain(ref): why a block is held or not (AGENTS rule 14). Its reads are not charged to the tick.

    function explain(ref) {
        stats.explains++;
        const M = sim(), W = UF.World;
        const a = (ref && ref.area) || (typeof W.currentArea === "function" ? W.currentArea() : { x: 0, y: 0 }) || { x: 0, y: 0 };
        const z = ref && Number.isInteger(ref.z) ? ref.z : 0;
        const reader = makeReader(false);
        const range = worldRange();
        let g = ref && Number.isInteger(ref.g) ? ref.g : null;
        if (g === null) {
            let s = ref && Number.isInteger(ref.s) ? ref.s : null;
            if (s === null) {
                const cell = reader.cell(a.x, a.y, ref.x, ref.y, z);
                s = 0;
                if (cell && cell.strata) for (let i = M.STRATA - 1; i >= 0; i--) if (cell.strata[i].solid) { s = i; break; }
            }
            g = M.gOf(z, s);
        }
        const seed = { ax: a.x, ay: a.y, x: ref.x, y: ref.y, g, k: keyOf(a.x, a.y, ref.x, ref.y, g) };
        const counter = { left: EXPLAIN_READS, used: 0 };
        const block = reader.block(seed.ax, seed.ay, seed.x, seed.y, seed.g);
        const job = newJob(seed, true);
        step(job, reader, counter, EXPLAIN_READS, range);
        const out = {
            ref: { area: { x: a.x, y: a.y }, x: seed.x, y: seed.y, z: M.zOfG(g), s: M.sOfG(g), g },
            block: { state: block.state, material: block.material, constructed: block.constructed, source: block.source, anchor: block.anchor },
            verdict: job.verdict || "pending",
            reads: counter.used,
            visited: job.visited.size
        };
        if (job.verdict === "held") {
            let n = 0;
            for (let k = job.anchor.k; k; k = job.parents.get(k)) n++;
            out.anchor = { x: job.anchor.x, y: job.anchor.y, z: M.zOfG(job.anchor.g), s: M.sOfG(job.anchor.g) };
            out.chain = n;
            out.reason = "held: a chain of " + n + " solid blocks reaches the bottom of the world at (" + out.anchor.x + "," + out.anchor.y + ") level " + out.anchor.z;
        } else if (job.verdict === "falls") {
            const plan = planFall(job, reader, counter, range);
            out.size = job.visited.size;
            if (plan.hold) {
                out.reason = "held: " + plan.hold.replace(/_/g, " ") + " (a piece of " + plan.size + " blocks with no anchor)";
                out.hold = plan.hold;
            } else {
                out.drop = plan.drop;
                out.dropFeet = plan.drop * FEET_PER_STRATUM;
                out.reason = "falls: " + out.size + " blocks with no chain to the bottom of the world; they drop " + out.dropFeet + " ft";
            }
        } else if (job.verdict === "unknown_edge") {
            out.reason = "held for now: the piece touches an area that is not generated";
        } else if (job.verdict === "too_big") {
            out.reason = "held: the search passed " + MAX_VISITS + " blocks";
        } else if (job.verdict === "air") {
            out.reason = "not solid";
        } else {
            out.reason = "not decided within " + EXPLAIN_READS + " reads";
        }
        stats.explainReads += counter.used;
        return out;
    }

    //-------------------------------------------------------------------------
    // Save: the seeds of the checks not done yet

    function saveSection() {
        const seeds = [];
        const seen = new Set();
        const put = s => {
            if (seen.has(s.k)) return;
            seen.add(s.k);
            seeds.push([s.ax, s.ay, s.x, s.y, s.g]);
        };
        for (const job of rt.jobs) put(job.seed);
        for (let i = rt.head; i < rt.queue.length; i++) put(rt.queue[i]);
        for (const list of rt.watch.values()) for (const s of list) put(s);
        return { v: SAVE_VERSION, seeds };
    }
    function loadSection(saved) {
        reset();
        if (!saved) return;
        if (saved.v !== SAVE_VERSION || !Array.isArray(saved.seeds)) {
            stats.lastError = "load: unknown deusStructural section " + JSON.stringify(saved.v) + "; no checks restored";
            console.warn("DEUS_Structural: " + stats.lastError);
            return;
        }
        for (const s of saved.seeds) {
            if (Array.isArray(s) && s.length === 5 && s.every(Number.isInteger)) enqueue(s[0], s[1], s[2], s[3], s[4], 0);
        }
    }

    if (typeof DataManager !== "undefined") {
        const _DataManager_makeSaveContents = DataManager.makeSaveContents;
        DataManager.makeSaveContents = function() {
            const contents = _DataManager_makeSaveContents.call(this);
            contents.deusStructural = saveSection();
            return contents;
        };
        const _DataManager_extractSaveContents = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function(contents) {
            _DataManager_extractSaveContents.call(this, contents);
            loadSection(contents && contents.deusStructural);
        };
    }

    //-------------------------------------------------------------------------
    // API and wiring

    const Structural = {
        enabled: true,
        mode: "live",
        explain,
        stats() {
            const s = JSON.parse(JSON.stringify(stats));
            s.queued = queuedCount();
            s.active = rt.jobs.length;
            s.ready = rt.jobs.filter(j => j.ready).length;
            s.epoch = rt.epoch;
            s.debt = rt.debt;
            s.watch = Array.from(rt.watch.values()).reduce((n, l) => n + l.length, 0);
            s.enabled = Structural.enabled;
            s.mode = Structural.mode;
            s.limits = { readsPerTick: READS_PER_TICK, maxJobs: MAX_JOBS, maxVisits: MAX_VISITS, maxPiece: MAX_PIECE,
                commitsPerTick: COMMITS_PER_TICK, opsPerCell: OPS_PER_CELL };
            return s;
        },
        resetStats() { stats = freshStats(); }
    };
    UF.Structural = Structural;

    if (SUBSCRIBE && UF.Events && typeof UF.Events.on === "function") {
        UF.Events.on("levels:strataChanged", onStrataChanged);
        UF.Events.on("objects:changed", onObjectChanged);
        UF.Events.on("objects:levelChanged", onObjectChanged);
        UF.Events.on("world:areaGenerated", onAreaGenerated);
    }
    if (UF.Events && typeof UF.Events.on === "function") UF.Events.on("world:created", reset);
    if (UF.Sim && typeof UF.Sim.onTick === "function") UF.Sim.onTick("structure", TICK_ORDER, onTick);
    else console.error("DEUS_Structural: UF.Sim.onTick is missing (DEUS_World must load first); nothing will fall");
})();
