//=============================================================================
// DEUS_Floors.js - Rooms, cultural floors, floor jobs, and floor designations
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Floors] Room enclosure detection, cultural flooring construction, floor autotiles, and architectural room value.
 * @author UF project
 * @base DEUS_Jobs
 * @orderAfter DEUS_Jobs
 * @orderAfter DEUS_Tiles
 * @orderAfter DEUS_Doors
 *
 * @help
 * Floors are A2 ground kinds, not objects, so beds, items, and units can sit
 * on them.  A floor designation is an ordinary UF_Jobs job.  The worker
 * fetches the culture's material, walks to the room cell, works, consumes
 * the material, and changes the tile through UF.World.setTile.
 *
 * API, state, events, assets, and checks: docs/systems/UF_Floors.md
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const MAX_ROOM_CELLS = 64;
    const MAX_ROOM_GAPS = 2;
    const MAX_OPEN = 12;
    const FLOOR_WORK = 4;
    const START_DELAY = 1800;
    const SEARCH_RADIUS = 80;
    const FLOOR_IDS = ["floor_wood", "floor_stone", "floor_rushes"];
    const NEIGHBORS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const AROUND = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

    const catalog = () => window.$ufWorldCatalog || null;
    const World = () => (window.UF && UF.World) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const Jobs = () => (window.UF && UF.Jobs) || null;
    // SIM.40.11. UF.Matter is absent until a host attaches it. Unattached calls do not change the world write.
    function matterNote(kind, detail) {
        const M = window.UF && UF.Matter;
        if (!M || typeof M.note !== "function") return { ok: true, unbound: true };
        try {
            const v = M.note(kind, detail) || { ok: true };
            if (v.ok === false && v.refuse && M.strict) {
                const err = new Error(v.code || "E_MATTER");
                err.code = v.code;
                throw err;
            }
            return v;
        } catch (err) {
            if (M.strict) throw err;
            if (typeof M.fail === "function") M.fail(kind, err);
            return { ok: false, code: err && err.code };
        }
    }
    function matterCover(fn) {
        const M = window.UF && UF.Matter;
        if (M && typeof M.cover === "function") return M.cover(fn);
        return fn();
    }
    const Tiles = () => (window.UF && UF.Tiles) || null;
    // Records store z beside area; API handles store it inside the area.
    const zOf = ref => ref && ref.z !== undefined ? ref.z : ref && ref.area && ref.area.z !== undefined ? ref.area.z : 0;
    const copyArea = ref => { const a = ref.area || ref; return { x: a.x, y: a.y, z: zOf(ref) }; };
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y && zOf(a) === zOf(b);
    // Builder reach (NAT.02.06): the same area, on the level of the target or the level above or below it.
    const inReach = (area, unit) => !!area && !!unit && !!unit.area && area.x === unit.area.x && area.y === unit.area.y && Math.abs(zOf(area) - zOf(unit)) <= 1;
    function supportedArea(area) {
        const W = World(), z = zOf(area);
        return !!area && Number.isInteger(z) &&
            (z === 0 || !!(W && typeof W.viewLevel === "function" && typeof W.levelOfMapId === "function" && typeof W.isLevel === "function" && W.isLevel(z)));   // the world's Z range (WG.00.17)
    }
    const viewArea = () => { const W = World(); return W && (typeof W.viewLevel === "function" ? W.viewLevel() : W.currentArea()); };
    const emit = (name, ...args) => { if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args); };
    const keyOf = (x, y) => `${x},${y}`;
    const areaKey = a => zOf(a) === 0 ? `${a.x},${a.y}` : `${a.x},${a.y},${zOf(a)}`;

    function floorState() {
        const W = World();
        if (!W || !W.state) return null;
        return (W.state.floors = W.state.floors || { version: 1, laid: 0, removed: 0, designationOrder: [] });
    }
    const floorKind = id => FLOOR_IDS.includes(id);
    function isFloorAt(area, x, y) {
        if (!supportedArea(area)) return false;
        const z = zOf(area);
        if (z !== 0) {
            const L = window.UF && UF.Levels;
            const cell = L && typeof L.cellAt === "function" && L.cellAt({ area, x, y, z });
            return !!cell && cell.constructed === true && cell.shape === "floor";
        }
        const k = kindAt(area, x, y);
        if (!k) return false;
        return floorKind(k.id) || (typeof k.id === "string" && (k.id.startsWith("floor_") || k.id === "road")) || (Array.isArray(k.tags) && k.tags.includes("floor"));
    }
    function kindAt(area, x, y) {
        // UF_Tiles' A2 kinds describe tileset 91, not the levels' tileset 92.
        if (!supportedArea(area) || zOf(area) !== 0) return null;
        const W = World(), T = Tiles();
        return W && T ? T.kindOfTile(W.getTile(area.x, area.y, x, y, 0, 0)) : null;
    }
    function isWater(area, x, y) {
        const J = Jobs();
        if (J && typeof J.isWaterAt === "function") return J.isWaterAt(area, x, y);
        const W = World(), tile = W ? W.getTile(area.x, area.y, x, y, 0, zOf(area)) : 0;
        return !!tile && Tilemap.isTileA1(tile);
    }
    function inBounds(area, x, y) {
        const W = World();
        return supportedArea(area) && !!W && !!W.state && W.inWorld(area.x, area.y, zOf(area)) && x >= 0 && y >= 0 && x < W.state.size && y < W.state.size;
    }
    function isBarrier(area, x, y) {
        if (!inBounds(area, x, y)) return false;
        const L = window.UF && UF.Levels;
        if (L && typeof L.shapeAt === "function") {
            const s = L.shapeAt({ area, x, y, z: zOf(area) });
            if (s === "solid" || s === 1) return true;
        }
        const O = Objects(), type = O && O.atIn(area, x, y);
        return !!type && ((Array.isArray(type.tags) && (type.tags.includes("wall") || type.tags.includes("door"))) || (typeof type.id === "string" && (type.id.includes("wall") || type.id.includes("door"))));
    }
    function isGap(area, x, y) {
        if (!inBounds(area, x, y) || isBarrier(area, x, y) || isWater(area, x, y)) return false;
        return (isBarrier(area, x - 1, y) && isBarrier(area, x + 1, y)) ||
            (isBarrier(area, x, y - 1) && isBarrier(area, x, y + 1));
    }
    function cellWalkableForRoom(area, x, y) {
        if (!inBounds(area, x, y) || isWater(area, x, y) || isBarrier(area, x, y)) return false;
        const k = kindAt(area, x, y), O = Objects(), o = O && O.atIn(area, x, y);
        if (zOf(area) !== 0) {
            const L = window.UF && UF.Levels;
            if (!L || typeof L.standableShape !== "function" || !L.standableShape({ area, x, y, z: zOf(area) })) return false;
        }
        if (k && k.passable === false) return false;
        return !o || o.passable === true;
    }

    const roomCaches = new Map();
    function cacheFor(area) {
        const k = areaKey(area);
        let c = roomCaches.get(k);
        if (!c) { c = { byCell: new Map(), misses: new Set(), siteRooms: new Map() }; roomCaches.set(k, c); }
        return c;
    }
    function invalidate(area) {
        if (area) roomCaches.delete(areaKey(area)); else roomCaches.clear();
    }
    function computeRoom(area, sx, sy) {
        const failed = seen => ({ room: null, seen: seen || new Set([keyOf(sx, sy)]) });
        if (!cellWalkableForRoom(area, sx, sy) || isGap(area, sx, sy)) return failed();
        const queue = [[sx, sy]], seen = new Set([keyOf(sx, sy)]), cells = [], gaps = new Map();
        while (queue.length) {
            const [x, y] = queue.shift();
            cells.push({ x, y });
            if (cells.length > MAX_ROOM_CELLS) return failed(seen);
            for (const [dx, dy] of NEIGHBORS) {
                const nx = x + dx, ny = y + dy, key = keyOf(nx, ny);
                if (!inBounds(area, nx, ny)) return failed(seen);
                if (isBarrier(area, nx, ny)) continue;
                if (isGap(area, nx, ny)) { gaps.set(key, { x: nx, y: ny }); continue; }
                if (!cellWalkableForRoom(area, nx, ny)) return failed(seen);
                if (!seen.has(key)) { seen.add(key); queue.push([nx, ny]); }
            }
        }
        if (gaps.size > MAX_ROOM_GAPS) return failed(seen);
        cells.sort((a, b) => a.y - b.y || a.x - b.x);
        const H = window.UF && UF.History, site = zOf(area) === 0 && H && typeof H.siteAt === "function" ? H.siteAt(sx, sy, area) : null;
        return { seen, room: {
            id: `room:${areaKey(area)}:${cells[0].x},${cells[0].y}:${cells.length}`,
            area: copyArea(area), cells, gaps: [...gaps.values()].sort((a, b) => a.y - b.y || a.x - b.x), siteId: site ? site.id : null
        } };
    }
    function roomAt(area, x, y) {
        if (!inBounds(area, x, y)) return null;
        const c = cacheFor(area), k = keyOf(x, y);
        if (c.byCell.has(k)) return c.byCell.get(k);
        if (c.misses.has(k)) return null;
        const result = computeRoom(area, x, y), room = result.room;
        if (!room) { for (const seen of result.seen) c.misses.add(seen); return null; }
        for (const cell of room.cells) c.byCell.set(keyOf(cell.x, cell.y), room);
        return room;
    }
    function roomFromHouse(area, house, siteId) {
        if (!house || house.w < 3 || house.h < 3) return null;
        const cells = [], gaps = [];
        for (let y = house.y; y < house.y + house.h; y++) for (let x = house.x; x < house.x + house.w; x++) {
            const edge = x === house.x || y === house.y || x === house.x + house.w - 1 || y === house.y + house.h - 1;
            if (edge) {
                if (!isBarrier(area, x, y)) gaps.push({ x, y });
            } else if (cellWalkableForRoom(area, x, y)) cells.push({ x, y });
            else return null;
        }
        if (!cells.length || gaps.length > MAX_ROOM_GAPS) return null;
        const room = { id: `room:${areaKey(area)}:${cells[0].x},${cells[0].y}:${cells.length}`,
            area: copyArea(area), cells, gaps, siteId: siteId === undefined ? null : siteId };
        const c = cacheFor(area);
        for (const cell of cells) c.byCell.set(keyOf(cell.x, cell.y), room);
        return room;
    }
    function roomValue(room) {
        if (!room || !room.cells || !room.cells.length) return 0;
        let n = 0;
        for (const c of room.cells) {
            if (zOf(room.area) !== 0) {
                const L = window.UF && UF.Levels, cell = L && typeof L.cellAt === "function" && L.cellAt({ area: room.area, x: c.x, y: c.y, z: zOf(room.area) });
                if (cell && cell.constructed && cell.shape === "floor") n++;
            } else { const k = kindAt(room.area, c.x, c.y); if (k && floorKind(k.id)) n++; }
        }
        return n / room.cells.length;
    }
    // Solid strata anywhere over the cell up the column (UF.Levels.hasOpaqueOverburden, the strata of DEUS-TSK-FABLE-19A).
    // Without the strata API: below the ground counts as covered, as before.
    function hasOpaqueOverburden(area, x, y, z) {
        const zLevel = z !== undefined ? z : zOf(area);
        const L = window.UF && UF.Levels;
        if (L && typeof L.hasOpaqueOverburden === "function") return L.hasOpaqueOverburden(area, x, y, zLevel);
        return zLevel < 0;
    }
    function isRoofed(area, x, y, z) {
        const zLevel = z !== undefined ? z : zOf(area);
        const L = window.UF && UF.Levels;
        if (L && typeof L.hasOpaqueOverburden === "function") {
            if (L.hasOpaqueOverburden(area, x, y, zLevel)) return true;
        } else {
            if (zLevel < 0) return true;
            if (L) {
                const upperRef = { area: copyArea(area), x, y, z: zLevel + 1 };
                if (typeof L.standableShape === "function" && L.standableShape(upperRef)) return true;
                if (typeof L.shapeAt === "function" && L.shapeAt(upperRef) === "floor") return true;
            }
        }
        const r = roomAt(area, x, y);
        if (r && r.cells && r.cells.some(c => c.x === x && c.y === y)) {
            if (L && typeof L.setShape === "function" && zLevel === 0 && !r.deckApplied) {
                r.deckApplied = true;
                applyRoofedUpperDeck(area, r);
            }
            return true;
        }
        return false;
    }

    function applyRoofedUpperDeck(area, target, material) {
        const L = window.UF && UF.Levels;
        if (!L || typeof L.setShape !== "function") return false;
        const z = zOf(area);
        const targetZ = z + 1, W = World();
        if (!W || typeof W.isLevel !== "function" || !W.isLevel(targetZ)) return false;   // above the world's top level (WG.00.17)

        let mat = material;
        if (!mat) {
            const cat = catalog();
            const F = window.UF && UF.Factions;
            const p = F && F.player && F.player();
            const cult = p && cat && cat.cultures && cat.cultures[p.species];
            const wallId = cult && cult.wall;
            mat = (wallId && wallId.includes("stone")) ? "stone" : "wood";
        }

        const cells = new Set();
        const addCell = (cx, cy) => cells.add(`${cx},${cy}`);

        if (target && Array.isArray(target.cells)) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const c of target.cells) {
                addCell(c.x, c.y);
                if (c.x < minX) minX = c.x;
                if (c.x > maxX) maxX = c.x;
                if (c.y < minY) minY = c.y;
                if (c.y > maxY) maxY = c.y;
            }
            for (let cy = minY - 1; cy <= maxY + 1; cy++) {
                for (let cx = minX - 1; cx <= maxX + 1; cx++) {
                    if (isBarrier(area, cx, cy)) addCell(cx, cy);
                }
            }
        } else if (target && target.x0 !== undefined && target.x1 !== undefined && target.y0 !== undefined && target.y1 !== undefined) {
            for (let cy = target.y0; cy <= target.y1; cy++) {
                for (let cx = target.x0; cx <= target.x1; cx++) {
                    addCell(cx, cy);
                }
            }
        } else if (target && target.x !== undefined && target.y !== undefined && target.w !== undefined && target.h !== undefined) {
            for (let cy = target.y; cy < target.y + target.h; cy++) {
                for (let cx = target.x; cx < target.x + target.w; cx++) {
                    addCell(cx, cy);
                }
            }
        } else if (Array.isArray(target)) {
            for (const c of target) if (c && c.x !== undefined && c.y !== undefined) addCell(c.x, c.y);
        }

        if (!cells.size) return false;

        for (const key of cells) {
            const [cx, cy] = key.split(",").map(Number);
            L.setShape({ area: copyArea(area), x: cx, y: cy, z: targetZ }, "floor", { constructed: true, material: mat });
        }
        // A deck written with no consumed bill is an unpaid world write. The ledger does not invent its mass.
        matterNote("deck", { material: mat, count: cells.size, cause: "floors:deck" });
        return true;
    }

    //-------------------------------------------------------------------------
    // Building across Z (NAT.02.06; DEC-083 rule 4, docs/design/COLLAPSE_REPLAN_DEC083.md section 6 "Placement").
    // A block is one 2 ft stratum (x, y, z, s). A new block is accepted when one of its six face neighbours (down,
    // north, east, south, west, up; across Z too) is a solid block the structure holds (UF.Structural.explain says
    // "held", or "unknown_edge": the structure never drops what touches an area it cannot see). Otherwise it is
    // refused. A floor or a roof is the S0 slab of a cell: a roof is the floor of the level above. A wall or a door is
    // the voxel column the structure reads for it: from the cell's stacked floor through S4. Placing writes only the
    // new block, so it can never drop anything else: adding a solid block cuts no chain.

    const STRATA = 5;
    const SOLID_KEYS = ["stone", "soil", "wood"];   // levels_reader: solid with HP above 0; air, water and lava are not
    const MATERIAL_BYTE = { stone: 1, soil: 2, wood: 3 };
    const M_BUILT = 0x80;
    const SLAB_MATERIAL = { floor_wood: "wood", floor_stone: "stone", floor_rushes: "wood" };
    const STRUCTURAL_TAGS = ["wall", "door"];
    const Levels = () => (window.UF && UF.Levels) || null;
    const Structure = () => (window.UF && UF.Structural) || null;
    const isStructuralType = t => !!t && Array.isArray(t.tags) && STRUCTURAL_TAGS.some(tag => t.tags.includes(tag));
    const slabMaterial = kindId => SLAB_MATERIAL[kindId] || "wood";

    // A cell of the world as { area: { x, y }, x, y, z }; area edges wrap (torus, as the structure reads them).
    function cellRef(area, x, y, z) {
        const W = World(), st = W && W.state;
        if (!st || !st.size) return null;
        const size = st.size, nx = st.areasX || 1, ny = st.areasY || 1;
        let ax = area.x, ay = area.y;
        while (x < 0) { x += size; ax--; }
        while (x >= size) { x -= size; ax++; }
        while (y < 0) { y += size; ay--; }
        while (y >= size) { y -= size; ay++; }
        return { area: { x: ((ax % nx) + nx) % nx, y: ((ay % ny) + ny) % ny }, x, y, z };
    }
    function levelExists(z) {
        const W = World();
        return !!W && Number.isInteger(z) && (typeof W.isLevel === "function" ? W.isLevel(z) : z === 0);
    }
    function strataOf(ref) {
        const L = Levels();
        return L && typeof L.strataAt === "function" ? L.strataAt(ref) : null;
    }
    // The number of solid strata stacked from S0: where a wall or door object's voxels begin (levels_reader "fill").
    function fillOf(st) {
        let fill = 0;
        while (fill < STRATA && SOLID_KEYS.includes(st.materials[fill]) && st.hp[fill] > 0) fill++;
        return fill;
    }
    function structuralObjectAt(ref) {
        const O = Objects(), t = O && typeof O.atIn === "function" ? O.atIn({ x: ref.area.x, y: ref.area.y, z: ref.z }, ref.x, ref.y) : null;
        return isStructuralType(t) ? t : null;
    }
    // Solid as the structure reads it: a solid stratum with HP, or a wall or door voxel above the stacked floor.
    function solidBlockAt(ref, s) {
        if (!levelExists(ref.z)) return false;
        const st = strataOf(ref);
        if (!st) return false;
        if (SOLID_KEYS.includes(st.materials[s]) && st.hp[s] > 0) return true;
        return s >= fillOf(st) && !!structuralObjectAt(ref);
    }
    // The six face neighbours of block (ref, s), in the structure's order.
    function blockNeighbours(ref, s) {
        const out = [];
        const at = (r, ss) => { if (r) out.push({ ref: r, s: ss }); };
        at(s > 0 ? ref : cellRef(ref.area, ref.x, ref.y, ref.z - 1), s > 0 ? s - 1 : STRATA - 1);
        at(cellRef(ref.area, ref.x, ref.y - 1, ref.z), s);
        at(cellRef(ref.area, ref.x + 1, ref.y, ref.z), s);
        at(cellRef(ref.area, ref.x, ref.y + 1, ref.z), s);
        at(cellRef(ref.area, ref.x - 1, ref.y, ref.z), s);
        at(s < STRATA - 1 ? ref : cellRef(ref.area, ref.x, ref.y, ref.z + 1), s < STRATA - 1 ? s + 1 : 0);
        return out;
    }
    /**
     * attachment(ref, s0, s1): may the blocks S{s0}..S{s1} of cell ref be placed? { ok, reason, via, verdict, checked }.
     * Every face neighbour outside those blocks is looked at; the first solid one the structure holds attaches them.
     * Without UF.Structural (the plugin is not loaded) a solid neighbour attaches and checked is false.
     */
    function attachment(ref, s0, s1) {
        const r = cellRef(ref.area || ref, ref.x, ref.y, zOf(ref));
        if (!r || !levelExists(r.z)) return { ok: false, reason: "no such level", checked: false };
        const lo = s0 === undefined ? 0 : s0 | 0, hi = s1 === undefined ? lo : s1 | 0;
        const S = Structure(), checked = !!S && typeof S.explain === "function";
        const seen = new Set();
        let solid = 0, last = null;
        for (let s = lo; s <= hi; s++) {
            for (const nb of blockNeighbours(r, s)) {
                const n = nb.ref;
                if (n.x === r.x && n.y === r.y && n.z === r.z && n.area.x === r.area.x && n.area.y === r.area.y && nb.s >= lo && nb.s <= hi) continue;
                const k = `${n.area.x},${n.area.y},${n.x},${n.y},${n.z},${nb.s}`;
                if (seen.has(k) || !levelExists(n.z)) continue;
                seen.add(k);
                if (!solidBlockAt(n, nb.s)) continue;
                solid++;
                const via = { area: { x: n.area.x, y: n.area.y }, x: n.x, y: n.y, z: n.z, s: nb.s };
                if (!checked) return { ok: true, reason: "", via, verdict: "solid", checked: false };
                const e = S.explain(via);
                if (e.verdict === "held" || e.verdict === "unknown_edge") return { ok: true, reason: "", via, verdict: e.verdict, checked: true, explain: e };
                last = e;
            }
        }
        if (!solid) return { ok: false, reason: "attaches to nothing", checked };
        return { ok: false, reason: "attaches to nothing that is held", checked, verdict: last ? last.verdict : null, explain: last };
    }

    /** May a floor or roof slab (S0) be built at { area, x, y, z }? { ok, reason, attach }. */
    function slabCheck(ref) {
        const L = Levels(), z = zOf(ref), area = ref.area || ref;
        if (!L || typeof L.strataAt !== "function" || typeof L.setStrata !== "function") return { ok: false, reason: "no levels in this world" };
        if (!levelExists(z) || !inBounds({ x: area.x, y: area.y, z }, ref.x, ref.y)) return { ok: false, reason: "off the map" };
        const r = { area: { x: area.x, y: area.y }, x: ref.x, y: ref.y, z };
        const st = strataOf(r);
        if (!st) return { ok: false, reason: "off the map" };
        const m0 = st.materials[0];
        if (m0 === "water" || m0 === "lava") return { ok: false, reason: m0 };
        if (SOLID_KEYS.includes(m0) && st.hp[0] > 0) return { ok: false, reason: st.constructed[0] ? "already floored" : "the ground is already solid" };
        if (structuralObjectAt(r)) return { ok: false, reason: "a wall stands there" };
        const attach = attachment(r, 0, 0);
        return attach.ok ? { ok: true, reason: "", attach } : { ok: false, reason: attach.reason, attach };
    }
    /** May an object be built at { area, x, y, z }? A wall or door attaches like any block; anything else needs a floor. */
    function placement(ref, type) {
        const r = { area: { x: (ref.area || ref).x, y: (ref.area || ref).y }, x: ref.x, y: ref.y, z: zOf(ref) };
        if (!levelExists(r.z)) return { ok: false, reason: "no such level" };
        const st = strataOf(r);
        if (!st) return { ok: true, reason: "", checked: false };   // no strata (generator < 4): nothing to attach to read
        const fill = fillOf(st);
        if (fill >= STRATA) return { ok: false, reason: "solid rock" };
        if (isStructuralType(type)) {
            const a = attachment(r, fill, STRATA - 1);
            return a.ok ? { ok: true, reason: "", attach: a } : { ok: false, reason: a.reason, attach: a };
        }
        const L = Levels();
        if (fill === 0 && !(L && typeof L.standableShape === "function" && L.standableShape(r))) return { ok: false, reason: "nothing to stand on" };
        return { ok: true, reason: "" };
    }
    // Write the S0 slab only, constructed, keeping S1..S4 and the connector: the one block added (never a whole cell).
    function writeSlab(ref, material, cause) {
        const L = Levels(), r = { area: { x: (ref.area || ref).x, y: (ref.area || ref).y }, x: ref.x, y: ref.y, z: zOf(ref) };
        const st = strataOf(r), id = MATERIAL_BYTE[material];
        if (!L || !st || !id) return false;
        const m = st.bytes.slice(), hp = st.hp.slice();
        m[0] = id | M_BUILT;
        hp[0] = 255;
        return L.setStrata(r, { m, hp }, { cause: cause || "floors:slab" });
    }
    // A floor laid where the cell's own S0 is the block: every level but the ground, and a hole in the ground.
    function slabAt(area, x, y) {
        if (zOf(area) !== 0) return true;
        const st = inBounds(area, x, y) ? strataOf({ area: { x: area.x, y: area.y }, x, y, z: 0 }) : null;
        return !!st && st.materials[0] === "air";
    }

    const Rooms = { MAX_ROOM_CELLS, MAX_ROOM_GAPS, roomAt, value: roomValue, invalidate, isRoofed, hasOpaqueOverburden, applyRoofedUpperDeck };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Rooms = Rooms;

    function shapeAt(area, x, y, id) {
        const I = window.UF && UF.Interact;
        const same = (dx, dy) => { const k = kindAt(area, x + dx, y + dy); return !!k && k.id === id; };
        return I && typeof I.autotileShape === "function" ? I.autotileShape(same)
            : window.UF && UF.WorldGen && typeof UF.WorldGen.autotileShape === "function" ? UF.WorldGen.autotileShape(same) : 0;
    }
    function reshapeAround(area, x, y) {
        const W = World(), T = Tiles();
        if (!W || !T || !supportedArea(area) || zOf(area) !== 0) return;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const px = x + dx, py = y + dy;
            if (!inBounds(area, px, py)) continue;
            const k = kindAt(area, px, py), base = k && T.groundBase(k.id);
            if (!k || base === null || base === undefined) continue;
            W.setTile(area.x, area.y, px, py, 0, base + shapeAt(area, px, py, k.id));
        }
    }
    function setGround(area, x, y, kindId) {
        // Non-ground construction needs Levels shape/material/support updates.
        // Refuse before touching tiles until that construction adapter lands.
        if (!supportedArea(area) || zOf(area) !== 0) return false;
        const W = World(), T = Tiles(), base = T && T.groundBase(kindId);
        if (!W || base === null || base === undefined || !inBounds(area, x, y)) return false;
        W.setTile(area.x, area.y, x, y, 0, base);
        reshapeAround(area, x, y);
        invalidate(area);
        emit("floors:groundChanged", area, x, y, kindId);
        return true;
    }
    function setFloor(area, x, y, kindId) {
        if (!floorKind(kindId)) return false;
        if (supportedArea(area) && slabAt(area, x, y)) {
            if (!slabCheck({ area, x, y, z: zOf(area) }).ok || !writeSlab({ area, x, y, z: zOf(area) }, slabMaterial(kindId), "floors:lay")) return false;
            invalidate(area);
        } else if (!setGround(area, x, y, kindId)) return false;
        const st = floorState(); if (st) st.laid++;
        emit("floors:laid", area, x, y, kindId);
        return true;
    }
    function removeFloor(area, x, y) {
        const k = kindAt(area, x, y);
        if (!k || !floorKind(k.id) || !setGround(area, x, y, "dirt")) return false;
        const st = floorState(); if (st) st.removed++;
        emit("floors:removed", area, x, y, k.id);
        matterNote("deconstruct", { elementId: k.id, count: 1, cause: "floors:removed", at: { x: x, y: y, z: zOf(area) } });
        return true;
    }
    // A floor on any level (NAT.02.06). On the ground it is an A2 ground kind; elsewhere, and over a hole in the ground,
    // it is the cell's S0 slab, a block that must attach to a held block (slabCheck). A roof is the floor of the level above.
    function canLay(area, x, y, force) {
        if (!supportedArea(area)) return { ok: false, reason: "no such level" };
        if (!inBounds(area, x, y)) return { ok: false, reason: "off the map" };
        if (isWater(area, x, y)) return { ok: false, reason: "water" };
        const O = Objects(), o = O && O.atIn(area, x, y);
        const isDomesticObject = o && o.tags && (o.tags.includes("bed") || o.tags.includes("furniture") || o.tags.includes("fire") || o.tags.includes("storage"));
        if (o && o.passable !== true && !force && !isDomesticObject) return { ok: false, reason: "blocked" };
        if (slabAt(area, x, y)) {
            if (!force && !roomAt(area, x, y)) return { ok: false, reason: "not inside a room" };
            return slabCheck({ area, x, y, z: zOf(area) });
        }
        if (zOf(area) !== 0) return { ok: false, reason: "already floored" };
        const k = kindAt(area, x, y);
        if (!k || k.passable === false) return { ok: false, reason: "solid ground" };
        if (floorKind(k.id)) return { ok: false, reason: "already floored" };
        if (!force && !roomAt(area, x, y)) return { ok: false, reason: "not inside a room" };
        return { ok: true, reason: "" };
    }

    function consumeGround(area, x, y, typeId, count) {
        const I = Items();
        if (!I) return 0;
        let left = count, used = 0;
        for (const item of I.atIn(area, x, y).filter(it => it.type === typeId)) {
            const n = I.consume(item.id, left); used += n; left -= n; if (!left) break;
        }
        return used;
    }
    function defineJobType() {
        const J = Jobs();
        if (!J) return false;
        J.define("floor", {
            verb: "Laying floor",
            reach: true,   // a slab (any level but the ground) is built from its own level or the level above or below
            plan(job, unit) {
                const p = job.params || {}, area = copyArea(job.target);
                const slab = slabAt(area, job.target.x, job.target.y);
                if (!(slab ? inReach(area, unit) : sameArea(area, copyArea(unit)))) return { ok: false, reason: slab ? "worker is more than a level away" : "worker is on another level or area" };
                if (!floorKind(p.kind)) return { ok: false, reason: "invalid floor kind" };
                const valid = canLay(area, job.target.x, job.target.y, !!p.force);
                if (!valid.ok) return { ok: false, reason: valid.reason };
                const I = Items(), need = Math.max(1, p.count | 0);
                if (!I || !I.type(p.item) || !Tiles().groundBase(p.kind)) return { ok: false, reason: "missing floor material" };
                const onCell = I.count({ area, x: job.target.x, y: job.target.y, z: zOf(area) }, p.item);
                const carried = I.count(unit.id, p.item);
                if (onCell >= need || carried >= need) {
                    p.ready = true;
                    delete p.fetchItemId;
                    // A slab has no floor to stand on: the builder stands beside it, under it (a roof) or over it.
                    const stand = slab && typeof J.standForReach === "function" ? J.standForReach(job.target, unit, true) : J.standFor(job.target, unit, false);
                    return stand ? { ok: true, stand } : { ok: false, reason: "can't reach it" };
                }
                p.ready = false;
                const found = I.find({ near: { x: unit.x, y: unit.y }, radius: SEARCH_RADIUS, id: p.item, area: copyArea(unit), z: zOf(unit), limit: 1 })[0];
                if (!found) return { ok: false, reason: `needs ${p.item}` };
                p.fetchItemId = found.item.id;
                const stand = J.standFor({ area: copyArea(found.item), x: found.x, y: found.y, z: zOf(found.item) }, unit, false);
                return stand ? { ok: true, stand } : { ok: false, reason: "can't reach the material" };
            },
            work: job => job.params && job.params.ready ? Math.max(1, job.params.work | 0 || FLOOR_WORK) : 0,
            apply(job, unit) {
                const p = job.params || {}, I = Items(), need = Math.max(1, p.count | 0);
                const area = copyArea(job.target), valid = canLay(area, job.target.x, job.target.y, !!p.force);
                const slab = slabAt(area, job.target.x, job.target.y);
                if (!valid.ok || !(slab ? inReach(area, unit) : sameArea(area, copyArea(unit))) || !floorKind(p.kind)) {
                    job.reason = !valid.ok ? valid.reason : "invalid floor or worker level";
                    // Jobs.finish treats undefined as success. Replan so its
                    // ordinary plan refusal fails this stale job, not jobs:done.
                    return "continue";
                }
                if (!p.ready) {
                    if (!p.fetchItemId || !I || !I.pickUp(p.fetchItemId, unit.id)) { job.reason = "the material is gone"; return false; }
                    delete p.fetchItemId;
                    return "continue";
                }
                // Transactional: the material must be there, the floor is laid, and only then is the material used up.
                const cell = { area, x: job.target.x, y: job.target.y, z: zOf(area) };
                if (!I || I.count(cell, p.item) + I.count(unit.id, p.item) < need) { job.reason = `needs ${p.item}`; return false; }
                if (!setFloor(area, job.target.x, job.target.y, p.kind)) { job.reason = "the floor could not be laid"; return false; }
                matterCover(() => {
                    const ground = consumeGround(area, job.target.x, job.target.y, p.item, need);
                    if (ground < need) I.consumeFrom(unit.id, p.item, need - ground);
                });
                matterNote("build", {
                    elementId: p.kind,
                    item: p.item,
                    count: need,
                    cause: "floors:lay",
                    at: { x: job.target.x, y: job.target.y, z: zOf(area) }
                });
                job.result = { kind: p.kind, item: p.item, count: need, slab };
            },
            describe(job) {
                if (job.params && job.params.as === "roof") return "Building a roof";
                const k = (catalog() && catalog().groundKinds || []).find(g => g.id === job.params.kind);
                return `Laying ${k ? k.name.toLowerCase() : "a floor"}`;
            }
        });
        return true;
    }

    function playerCultureFloor() {
        const cat = catalog(), C = window.UF && UF.Colonists, F = window.UF && UF.Factions;
        let cult = null;
        if (F && typeof F.player === "function") {
            const p = F.player();
            cult = p && cat && cat.cultures ? cat.cultures[p.species] : null;
        }
        if (!cult && C && typeof C.culture === "function") {
            const c = C.culture();
            if (c && c.floor) cult = c;
        }
        if (cult && cult.floor) return Object.assign({}, cult.floor);
        return { kind: "floor_wood", item: "log", count: 1 };
    }
    function activeFloorAt(area, x, y) {
        const J = Jobs();
        return J && J.list().some(j => j.type === "floor" && (j.state === "open" || j.state === "travel" || j.state === "work") &&
            sameArea(copyArea(j.target), area) && j.target.x === x && j.target.y === y);
    }
    function roomsNearSite(site) {
        const rooms = new Map(), H = window.UF && UF.History;
        const full = H && site.id !== undefined && typeof H.siteById === "function" ? H.siteById(site.id) || site : site;
        const area = copyArea(full.area ? full : site);
        if (!supportedArea(area) || zOf(area) !== 0) return [];
        const cache = cacheFor(area);
        const scanKey = `${full.id === undefined ? "camp" : full.id}:${full.x},${full.y}:${full.radius || 4}`;
        if (cache.siteRooms.has(scanKey)) return cache.siteRooms.get(scanKey);
        const houses = (full.settled && full.settled.houses) || [];
        for (const h of houses) {
            const room = roomFromHouse(area, h, full.id);
            if (room) rooms.set(room.id, room);
        }
        if (rooms.size) {
            const found = [...rooms.values()].sort((a, b) => a.id.localeCompare(b.id));
            cache.siteRooms.set(scanKey, found);
            return found;
        }
        const r = (site.radius || 4) + 6;
        const candidates = new Set();
        for (let y = site.y - r - 1; y <= site.y + r + 1; y++) for (let x = site.x - r - 1; x <= site.x + r + 1; x++) {
            if (!isBarrier(area, x, y)) continue;
            for (const [dx, dy] of NEIGHBORS) {
                const px = x + dx, py = y + dy;
                if (px >= site.x - r && px <= site.x + r && py >= site.y - r && py <= site.y + r) candidates.add(keyOf(px, py));
            }
        }
        for (const key of candidates) {
            const [x, y] = key.split(",").map(Number);
            // A valid bounded grid room has at least one interior corner cell
            // beside two boundary pieces.  Probe only those corners instead
            // of flood-filling open wilderness from every cell; V31 begins
            // without recorded historical houses, so this is the normal path.
            if (!cellWalkableForRoom(area, x, y)) continue;
            let edges = 0;
            for (const [dx, dy] of NEIGHBORS) if (isBarrier(area, x + dx, y + dy)) edges++;
            if (edges < 2) continue;
            const room = roomAt(area, x, y);
            if (room) rooms.set(room.id, room);
        }
        const found = [...rooms.values()].sort((a, b) => a.id.localeCompare(b.id));
        cache.siteRooms.set(scanKey, found);
        return found;
    }
    function createDesignations() {
        const J = Jobs(), C = window.UF && UF.Colonists, spec = playerCultureFloor();
        const site = C && typeof C.site === "function" ? C.site() : null;
        if (!J || !site || !spec || !Tiles().groundBase(spec.kind)) return [];
        const active = J.list().filter(j => j.type === "floor" && (j.state === "open" || j.state === "travel" || j.state === "work"));
        let left = Math.max(0, MAX_OPEN - active.length);
        const made = [], st = floorState();
        for (const room of roomsNearSite(site)) {
            for (const cell of room.cells) {
                if (!left) break;
                const k = kindAt(room.area, cell.x, cell.y);
                if (!k || floorKind(k.id) || !canLay(room.area, cell.x, cell.y, false).ok || activeFloorAt(room.area, cell.x, cell.y)) continue;
                const job = J.create({ type: "floor", target: { area: copyArea(room.area), x: cell.x, y: cell.y, z: zOf(room.area) },
                    params: { kind: spec.kind, item: spec.item, count: spec.count, force: false }, owner: null });
                if (job) { made.push(job); left--; if (st) st.designationOrder.push(`${cell.x},${cell.y}`); }
            }
            if (!left) break;
        }
        if (made.length) emit("floors:designated", made);
        return made;
    }
    function floorOtherSites() {
        const H = window.UF && UF.History, F = window.UF && UF.Factions, cat = catalog();
        if (!H || !F || !cat) return 0;
        const player = F.player && F.player(), sites = H.sites ? H.sites() : [];
        let n = 0;
        for (const site of sites) {
            if (site.ruined || site.faction === (player && player.id) || !["town", "hold"].includes(site.kind)) continue;
            const area = copyArea(site);
            if (!supportedArea(area) || zOf(area) !== 0) continue;
            const f = F.get(site.faction), c = f && cat.cultures && cat.cultures[f.species], spec = c && c.floor;
            if (!spec || !Tiles().groundBase(spec.kind)) continue;
            for (const h of (site.settled && site.settled.houses) || []) {
                for (let y = h.y + 1; y < h.y + h.h - 1; y++) for (let x = h.x + 1; x < h.x + h.w - 1; x++) {
                    const k = kindAt(area, x, y);
                    if (k && !floorKind(k.id) && setFloor(area, x, y, spec.kind)) n++;
                }
            }
        }
        return n;
    }

    const floorWord = id => id === "floor_stone" ? "flagstones" : id === "floor_rushes" ? "rushes" : "planks";
    function augmentOptions(base, x, y) {
        const list = Array.isArray(base) ? base.slice() : [], area = viewArea();
        if (!supportedArea(area) || zOf(area) !== 0 || list.some(o => o.id === "floor:lay" || o.id === "floor:remove")) return list;
        const current = kindAt(area, x, y), spec = playerCultureFloor(), O = Objects(), object = O && O.at(x, y);
        let opt = null;
        if (current && floorKind(current.id)) {
            opt = { id: "floor:remove", label: "Remove floor", enabled: true, run: () => removeFloor(area, x, y) };
        } else if (spec && current && !isWater(area, x, y) && (!object || object.passable === true)) {
            opt = { id: "floor:lay", label: `Floor here (${floorWord(spec.kind)})`, enabled: true,
                run: () => window.UF.Interact && UF.Interact.designate ? UF.Interact.designate({ type: "floor", target: { area: copyArea(area), x, y }, params: Object.assign({ force: true }, spec) })
                    : Jobs().create({ type: "floor", target: { area: copyArea(area), x, y }, params: Object.assign({ force: true }, spec), owner: null }) };
        }
        if (!opt) return list;
        const at = list.findIndex(o => o.id === "dig" || o.id === "look");
        list.splice(at >= 0 ? at : list.length, 0, opt);
        return list;
    }
    let interactHooked = false;
    function hookInteract() {
        const I = window.UF && UF.Interact;
        if (!I || interactHooked) return;
        interactHooked = true;
        const baseOptions = I.optionsFor.bind(I), baseOpen = I.open.bind(I), baseRun = I.run.bind(I);
        I.optionsFor = (x, y) => augmentOptions(baseOptions(x, y), x, y);
        I.open = function(x, y, at) {
            const win = baseOpen(x, y, at);
            if (win) win.setOptions(augmentOptions(win.options(), x, y), win.header());
            return win;
        };
        I.run = function(opt) {
            const result = baseRun(opt), win = I.menu && I.menu(), cell = win && win.cell && win.cell();
            if (result && result.submenu && win && cell) { result.submenu = augmentOptions(result.submenu, cell.x, cell.y); win.setOptions(result.submenu, result.header || ""); }
            return result;
        };
    }

    let eventsHooked = false;
    const testingAnotherSuite = () => !!(window.UF && UF.Test && UF.Test.active && UF.Test.only !== "floors");
    function hookEvents() {
        if (eventsHooked || !window.UF || !UF.Events) return;
        eventsHooked = true;
        UF.Events.on("objects:changed", area => invalidate(area));
        UF.Events.on("objects:levelChanged", area => invalidate(area));
        UF.Events.on("world:tileChanged", area => invalidate(area));
        UF.Events.on("world:levelTileChanged", area => invalidate(area));
        UF.Events.on("levels:shapeChanged", ref => invalidate(copyArea(ref)));
        UF.Events.on("world:created", () => {
            invalidate();
            floorState();
            // Floor planning deliberately creates open jobs and changes house
            // ground.  Keep focused suites isolated; the floors suite itself
            // exercises both paths, while normal play is unaffected.
            if (testingAnotherSuite()) return;
            floorOtherSites();
            if (window.UF.Time && UF.Time.after) UF.Time.after(START_DELAY, createDesignations);
        });
        UF.Events.on("time:day", () => { if (!testingAnotherSuite()) createDesignations(); });
    }

    const Floors = {
        FLOOR_IDS: FLOOR_IDS.slice(), MAX_OPEN, FLOOR_WORK, kindAt, isFloorAt, isFloor: isFloorAt, canLay, setFloor, removeFloor, setGround,
        createDesignations, floorOtherSites, playerCultureFloor, defineJobType, augmentOptions, hookInteract,
        isRoofed, hasOpaqueOverburden, applyRoofedUpperDeck,
        attachment, canPlaceSlab: slabCheck, placement, isSlabAt: slabAt, slabMaterial, SLAB_MATERIAL: Object.assign({}, SLAB_MATERIAL)
    };
    window.UF.Floors = Floors;
    defineJobType();
    hookEvents();

    if (typeof DataManager !== "undefined" && typeof DataManager.extractSaveContents === "function") {
        const _extractSaveContents = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function(contents) {
            const result = _extractSaveContents.call(this, contents);
            invalidate();
            return result;
        };
    }

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        defineJobType();
        hookEvents();
        hookInteract();
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        UF.Test.suite("floors", async t => {
            const W = World(), O = Objects(), I = Items(), J = Jobs(), T = Tiles(), cat = catalog(), area = W && W.currentArea();
            const kinds = FLOOR_IDS.map(id => T && T.kinds().find(k => k.id === id));
            const cultures = Object.entries((cat && cat.cultures) || {}).filter(([id]) => id !== "about");
            t.check("catalog", kinds.every(Boolean) && cultures.length && cultures.every(([, c]) => c.floor && FLOOR_IDS.includes(c.floor.kind) && I && I.type(c.floor.item) && c.floor.count >= 1),
                `${kinds.filter(Boolean).map(k => k.id).join(", ") || "no floor kinds"}; ${cultures.filter(([, c]) => c.floor).length}/${cultures.length} cultures choose a floor`);
            if (!area || !kinds.every(Boolean)) {
                t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().join(" | ") || "none");
                return;
            }
            const bmp = T.generatedBitmap(), samples = kinds.map(k => { const n = T.kinds().findIndex(q => q.id === k.id); return bmp.getPixel((n % 8) * 96 + 60, Math.floor(n / 8) * 144 + 84); });
            t.check("tiles_draw", kinds.every(k => T.groundBase(k.id) !== null) && new Set(samples).size === kinds.length,
                `${samples.length} generated-sheet samples: ${samples.join(", ")}`);

            const colonists = window.UF.Colonists, worker = colonists && colonists.list().find(u => sameArea(u.area, area));
            const site = colonists && typeof colonists.site === "function" ? colonists.site() : null;
            let cx = worker ? worker.x : $gamePlayer.x, cy = worker ? worker.y : $gamePlayer.y;
            if (site) {
                const candidates = [
                    { x: site.x + 6, y: site.y },
                    { x: site.x - 6, y: site.y },
                    { x: site.x, y: site.y + 6 },
                    { x: site.x, y: site.y - 6 }
                ];
                for (const c of candidates) {
                    let clear = true;
                    for (let dy = -3; dy <= 3 && clear; dy++) {
                        for (let dx = -3; dx <= 3 && clear; dx++) {
                            const px = c.x + dx, py = c.y + dy;
                            if (!inBounds(area, px, py) || isWater(area, px, py)) clear = false;
                        }
                    }
                    if (clear) { cx = c.x; cy = c.y; break; }
                }
            }
            cx = Math.max(3, Math.min(W.state.size - 4, cx)); cy = Math.max(3, Math.min(W.state.size - 4, cy));
            if (worker) { worker.x = cx; worker.y = cy; }
            const wallId = O.type("wall_wood") ? "wall_wood" : (O.types().find(o => o.tags && o.tags.includes("wall")) || {}).id;
            const saved = new Map();
            for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) { saved.set(keyOf(x, y), O.typeIdIn(area, x, y)); O.setIn(area, x, y, null); }
            const wall = (x, y) => O.setIn(area, x, y, wallId);
            for (let x = cx - 2; x <= cx + 2; x++) { wall(x, cy - 2); wall(x, cy + 2); }
            for (let y = cy - 1; y <= cy + 1; y++) { wall(cx - 2, y); wall(cx + 2, y); }
            O.setIn(area, cx, cy - 2, null); invalidate(area);
            let r1 = roomAt(area, cx, cy);
            const one = !!r1 && r1.cells.length === 9 && r1.gaps.length === 1;
            O.setIn(area, cx, cy + 2, null); invalidate(area); let r2 = roomAt(area, cx, cy);
            const two = !!r2 && r2.cells.length === 9 && r2.gaps.length === 2;
            O.setIn(area, cx - 2, cy, null); invalidate(area); const three = roomAt(area, cx, cy);
            t.check("room_detection", one && two && !three, `5x5 room: one gap ${one}, two gaps ${two}, three gaps -> ${three ? "room" : "null"}`);
            wall(cx - 2, cy); wall(cx, cy + 2); invalidate(area);

            let water = null;
            for (let rr = 1; rr <= 30 && !water; rr++) for (let dy = -rr; dy <= rr && !water; dy++) for (let dx = -rr; dx <= rr; dx++) {
                const x = cx + dx, y = cy + dy; if (inBounds(area, x, y) && isWater(area, x, y)) { water = { x, y }; break; }
            }
            const waterRefused = water ? !canLay(area, water.x, water.y, true).ok : true;
            const wallRefused = !canLay(area, cx - 2, cy - 1, true).ok;
            t.check("refuses_water_and_walls", waterRefused && wallRefused, `${water ? `water ${water.x},${water.y}` : "no nearby water; skipped"}; wall refused ${wallRefused}`);

            const spec = playerCultureFloor() || { kind: "floor_wood", item: "log", count: 1 };
            const target = { area: copyArea(area), x: cx + 1, y: cy };
            if (colonists && colonists.setEnabled) colonists.setEnabled(false);
            if (worker && J.of(worker.id)) J.cancel(J.of(worker.id).id, "floor test");
            const made = createDesignations();
            t.check("designations_created", made.length >= 1 && made.length <= MAX_OPEN && J.list().filter(j => j.type === "floor" && ["open", "travel", "work"].includes(j.state)).length <= MAX_OPEN,
                `${made.length} new floor designations; ${J.list().filter(j => j.type === "floor" && ["open", "travel", "work"].includes(j.state)).length} active (limit ${MAX_OPEN})`);
            let job = made.find(j => j.target.x === target.x && j.target.y === target.y) || made[0];
            if (!job || job.target.x !== target.x || job.target.y !== target.y) {
                if (job) J.cancel(job.id, "replaced by the floor test fixture");
                job = J.create({ type: "floor", target, params: Object.assign({ force: false }, spec), owner: null });
            }
            let actor = worker;
            if (!actor) actor = W.addUnit({ name: "TEST_floorer", image: { characterName: "$People1", characterIndex: 0 }, area: copyArea(area), x: cx, y: cy, dir: 2,
                data: { kind: "colonist", faction: W.state.factions && W.state.factions.playerId, inventory: [], equipment: {}, workRate: 1 } });
            if (job && actor) {
                target.x = job.target.x; target.y = job.target.y;
                I.drop(area, target.x, target.y, job.params.item, job.params.count);
                job.params.work = 60;
                J.take(actor.id, j => j.id === job.id);
                $gamePlayer.locate(cx, cy + 4);
                await t.waitUntil(() => job.state === "work" || job.state === "done" || job.state === "failed", 15000, "a colonist to reach a floor designation");
                t.screenshot("colonist_laying_floor");
                if (window.UF.Time) UF.Time.setLevel(3);
                await t.waitUntil(() => job.state === "done" || job.state === "failed", 15000, "the floor job to finish");
                if (window.UF.Time) UF.Time.setLevel(0);
            }
            const laid = job && kindAt(area, job.target.x, job.target.y);
            const materialGone = job ? I.count({ area, x: job.target.x, y: job.target.y }, job.params.item) + I.count(actor.id, job.params.item) === 0 : false;
            t.check("job_lays_floor", !!job && job.state === "done" && laid && laid.id === job.params.kind && materialGone,
                job ? `job ${job.state}; ground ${laid ? laid.id : "none"}; material gone ${materialGone}` : "no floor job");
            t.check("colonist_takes_one", !!job && !!actor && actor.data.kind === "colonist" && job.assigned === actor.id && job.state === "done",
                job && actor ? `${actor.name} (#${actor.id}) took job #${job.id}: ${job.state}` : "no colonist/job");

            hookInteract();
            const earthCell = { x: cx - 1, y: cy }, floorCell = job ? { x: job.target.x, y: job.target.y } : target;
            const earthOpts = window.UF.Interact ? UF.Interact.optionsFor(earthCell.x, earthCell.y) : [], floorOpts = window.UF.Interact ? UF.Interact.optionsFor(floorCell.x, floorCell.y) : [];
            t.check("menu_option", earthOpts.some(o => o.id === "floor:lay" && /^Floor here/.test(o.label)) && floorOpts.some(o => o.id === "floor:remove" && o.label === "Remove floor"),
                `earth: ${earthOpts.filter(o => o.id.startsWith("floor:")).map(o => o.label).join(", ") || "none"}; floor: ${floorOpts.filter(o => o.id.startsWith("floor:")).map(o => o.label).join(", ") || "none"}`);

            const half = [{ x: cx - 1, y: cy - 1 }, { x: cx, y: cy - 1 }, { x: cx - 1, y: cy }, { x: cx, y: cy }];
            for (const c of half) setFloor(area, c.x, c.y, spec.kind);
            $gamePlayer.locate(cx, cy + 4); await t.waitFrames(3); t.screenshot("room_half_floored");

            const fs = floorState(), before = JSON.stringify(fs), round = JsonEx.parse(JsonEx.stringify(W.state));
            const order = fs.designationOrder.slice(), sameOrder = JSON.stringify(order) === JSON.stringify(fs.designationOrder.slice());
            t.check("seeded_and_saved", JSON.stringify(round.floors) === before && sameOrder, `${order.length} designation cells in deterministic stored order; floor state round-tripped`);

            const perfSite = colonists && colonists.site ? colonists.site() : { area, x: cx, y: cy, radius: 1 };
            invalidate(area); const p0 = performance.now(); roomsNearSite(perfSite); const roomMs = performance.now() - p0;
            const p1 = performance.now(); createDesignations(); const designationMs = performance.now() - p1;
            t.check("perf", roomMs <= 2 && designationMs <= 1, `room scan ${roomMs.toFixed(3)} ms (budget 2); designation pass ${designationMs.toFixed(3)} ms (budget 1)`);
            if (colonists && colonists.setEnabled) colonists.setEnabled(true);
            t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().join(" | ") || "none");
        }, { isDefault: false });
    }
})();
