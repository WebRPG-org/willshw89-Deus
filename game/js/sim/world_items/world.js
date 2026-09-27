"use strict";
// Headless world-item placement. Tests require this file. The RMMZ plugin is a thin alias.
// Sprites are slot ids only. No art is loaded here.

const C = require("./constants");
const catalog = require("./catalog");
const geom = require("./geom");
const summary = require("./summary");
const pathing = require("./pathing");
const dice = require("../rules/dice");
const bridge = require("./ledger_bridge");
const applyPlan = bridge.applyPlan;

const GEAR_SLOTS = ["ring", "amulet", "cloak", "boots", "gloves", "belt", "helmet"];
const SLOT_NAMES = ["armor", "mainHand", "offHand", "pack"].concat(GEAR_SLOTS);

function fail(code, msg) {
    const err = new Error(code + ": " + msg);
    err.code = code;
    throw err;
}

function ozFromLb(lb) {
    if (typeof lb !== "number" || !Number.isFinite(lb)) fail("E_WEIGHT", "pounds must be a finite number");
    const oz = Math.round(lb * C.OZ_PER_LB);
    if (Math.abs(lb * C.OZ_PER_LB - oz) > 1e-6) fail("E_WEIGHT", "weight is not a whole number of ounces");
    return oz;
}

function cuFromFt(ft) {
    if (typeof ft !== "number" || !Number.isFinite(ft)) fail("E_VOLUME", "cubic feet must be a finite number");
    const n = Math.round(ft * C.CUIN_PER_CUFT);
    if (Math.abs(ft * C.CUIN_PER_CUFT - n) > 1e-6) fail("E_VOLUME", "volume is not a whole number of cubic inches");
    return n;
}

function createWorld(opts) {
    opts = opts || {};
    const state = {
        seed: opts.seed | 0,
        nextId: 1,
        nextWindow: 1,
        focusSeq: 0,
        ticks: 0,
        chunkTiles: opts.chunkTiles || C.CHUNK_TILES,
        nearTiles: opts.nearTiles != null ? opts.nearTiles : C.NEAR_TILES,
        ledger: opts.ledger || null,
        items: new Map(),
        units: new Map(),
        manifests: new Map(),
        spatial: new Map(),
        itemBlocks: new Map(),
        terrain: new Set(),
        bounds: null,
        blockProvider: null,
        deposits: [],
        depositsDirty: false,
        tombstones: [],
        windows: new Map(),
        glows: [],
        viewer: null,
        hoverId: null,
        zoom: null,
        pickKey: null,
        pickIndex: 0
    };

    function must(id) {
        const item = state.items.get(id);
        if (!item) fail("E_ID", "no item " + id);
        return item;
    }
    function mustContainer(id) {
        const item = must(id);
        if (item.kind !== "container" || item.broken) fail("E_CONTAINER", "not a container: " + id);
        return item;
    }
    function mustUnit(id) {
        const unit = state.units.get(id);
        if (!unit) fail("E_UNIT", "no unit " + id);
        return unit;
    }

    function makeItem(def, spec) {
        spec = spec || {};
        const item = {
            id: spec.id != null ? spec.id : state.nextId++,
            typeId: def.typeId,
            name: def.name,
            kind: def.kind,
            sizePx: def.sizePx,
            weightOz: def.weightOz,
            volumeCuIn: def.volumeCuIn,
            exteriorCuIn: def.exteriorCuIn,
            massMu: def.massMu,
            ledgerClass: def.ledgerClass,
            ledgerForm: def.ledgerForm,
            slotId: def.slotId,
            closedSlotId: def.slotId,
            iconSlotId: def.iconSlotId,
            portraitSlotId: def.portraitSlotId,
            openSlotId: def.openSlotId,
            facing: def.facing,
            onBurn: def.onBurn,
            onSpill: def.onSpill,
            onRot: def.onRot,
            armorCategory: def.armorCategory,
            tool: def.tool,
            keyId: def.keyId,
            capOz: def.capOz,
            capCuIn: def.capCuIn,
            interiorCells: def.interiorCells,
            surfaceQuarters: def.surfaceQuarters,
            loadLimitOz: def.loadLimitOz,
            collapseOz: def.collapseOz,
            decayPerTick: def.decayPerTick,
            condition: def.condition,
            contents: [],
            parentId: null,
            heldBy: null,
            hauledBy: null,
            haulAnim: null,
            slotName: null,
            surfaceId: null,
            ownerId: null,
            theft: false,
            stolenFrom: null,
            shop: false,
            broken: false,
            opened: false,
            lock: null,
            trap: null,
            interiorX: 0,
            interiorY: 0,
            heightQuarters: 0,
            tileX: 0, tileY: 0, cellX: 0, cellY: 0, layer: 0,
            xPx: 0, yPx: 0,
            seedKey: null,
            seedChunk: null,
            massPosted: !!spec.massPosted,
            rev: 0,
            savedRev: 0,
            _spatial: null,
            _blockKeys: null
        };
        if (spec.id != null && spec.id >= state.nextId) state.nextId = spec.id + 1;
        return item;
    }

    function applyCell(item, tileX, tileY, cellX, cellY, layer) {
        if (!Number.isSafeInteger(tileX) || !Number.isSafeInteger(tileY)) fail("E_TILE", "tile coordinates must be integers");
        if (!Number.isSafeInteger(cellX) || !Number.isSafeInteger(cellY)) fail("E_CELL", "cell coordinates must be integers");
        if (cellX < 0 || cellY < 0 || cellX >= C.CELLS_PER_TILE || cellY >= C.CELLS_PER_TILE) fail("E_CELL", "cell is outside 0..7");
        item.tileX = tileX;
        item.tileY = tileY;
        item.cellX = cellX;
        item.cellY = cellY;
        item.layer = layer | 0;
        item.xPx = geom.anchorPx(tileX, cellX);
        item.yPx = geom.anchorPx(tileY, cellY);
    }

    function applyPx(item, xPx, yPx, layer) {
        const dx = geom.decodePx(xPx);
        const dy = geom.decodePx(yPx);
        applyCell(item, dx.tile, dy.tile, dx.cell, dy.cell, layer);
    }

    function chunkKey(tileX, tileY, layer) {
        const cx = Math.floor(tileX / state.chunkTiles);
        const cy = Math.floor(tileY / state.chunkTiles);
        return cx + "," + cy + "," + layer;
    }

    function indexSub(item) {
        if (!item._spatial) return;
        const set = state.spatial.get(item._spatial);
        if (set) {
            set.delete(item.id);
            if (!set.size) state.spatial.delete(item._spatial);
        }
        item._spatial = null;
    }

    function indexAdd(item) {
        if (item.parentId || item.heldBy) return;
        const key = chunkKey(item.tileX, item.tileY, item.layer);
        let set = state.spatial.get(key);
        if (!set) {
            set = new Set();
            state.spatial.set(key, set);
        }
        set.add(item.id);
        item._spatial = key;
    }

    function coveredKeys(item) {
        if (item.sizePx < 48) return [];
        if (item.parentId || item.heldBy) return [];
        const x1 = item.xPx + item.sizePx - 1;
        const y1 = item.yPx + item.sizePx - 1;
        const tx0 = Math.floor(item.xPx / C.TILE_PX);
        const tx1 = Math.floor(x1 / C.TILE_PX);
        const ty0 = Math.floor(item.yPx / C.TILE_PX);
        const ty1 = Math.floor(y1 / C.TILE_PX);
        const out = [];
        for (let x = tx0; x <= tx1; x++) {
            for (let y = ty0; y <= ty1; y++) out.push(x + "," + y + "," + item.layer);
        }
        return out;
    }

    function subBlocks(item) {
        const keys = item._blockKeys || [];
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            const n = (state.itemBlocks.get(k) || 1) - 1;
            if (n <= 0) state.itemBlocks.delete(k);
            else state.itemBlocks.set(k, n);
        }
        item._blockKeys = [];
    }

    function addBlocks(item) {
        subBlocks(item);
        const keys = coveredKeys(item);
        item._blockKeys = keys;
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            state.itemBlocks.set(k, (state.itemBlocks.get(k) || 0) + 1);
        }
    }

    function reindexAll() {
        state.spatial.clear();
        state.itemBlocks.clear();
        for (const item of state.items.values()) {
            item._spatial = null;
            item._blockKeys = [];
        }
        for (const item of state.items.values()) {
            if (!item.parentId && !item.heldBy) indexAdd(item);
            addBlocks(item);
        }
    }

    function topOf(item) {
        let top = item;
        const guard = new Set();
        while (top.parentId) {
            if (guard.has(top.id)) fail("E_CYCLE", "container cycle");
            guard.add(top.id);
            top = state.items.get(top.parentId);
            if (!top) fail("E_CYCLE", "missing parent");
        }
        return top;
    }

    function seedParts(item) {
        const cut = item.seedKey.lastIndexOf("#");
        const typeId = item.seedKey.slice(0, cut);
        const index = parseInt(item.seedKey.slice(cut + 1), 10);
        const bits = item.seedChunk.split(",");
        return {
            typeId: typeId,
            index: index,
            cx: parseInt(bits[0], 10),
            cy: parseInt(bits[1], 10),
            layer: parseInt(bits[2], 10)
        };
    }

    function writeSeedOverride(item) {
        const chunk = state.manifests.get(item.seedChunk);
        const part = seedParts(item);
        const def = catalog.item(part.typeId);
        const canon = summary.seededAnchor({
            seed: state.seed, cx: part.cx, cy: part.cy, layer: part.layer,
            typeId: part.typeId, index: part.index, sizePx: def.sizePx, chunkTiles: state.chunkTiles
        });
        const same = canon.tileX === item.tileX && canon.tileY === item.tileY && canon.cellX === item.cellX && canon.cellY === item.cellY;
        if (same) chunk.moved.delete(item.seedKey);
        else chunk.moved.set(item.seedKey, { tileX: item.tileX, tileY: item.tileY, cellX: item.cellX, cellY: item.cellY });
    }

    function touch(item) {
        if (!item) return;
        if (item.seedKey) {
            writeSeedOverride(item);
            const chunk = state.manifests.get(item.seedChunk);
            if (chunk) chunk.rev += 1;
            return;
        }
        const top = topOf(item);
        top.rev += 1;
        if (top.heldBy) {
            const unit = state.units.get(top.heldBy);
            if (unit) unit.rev += 1;
        }
    }

    function totalOz(id) {
        const item = state.items.get(id);
        let t = item.weightOz;
        for (let i = 0; i < item.contents.length; i++) {
            t += totalOz(item.contents[i]); // NEST_RECURSE
        }
        return t;
    }

    function stowCuIn(id) {
        const item = state.items.get(id);
        if (item.kind === "container") return item.exteriorCuIn; // STOW_EXTERIOR
        return item.volumeCuIn;
    }

    function containsDeep(rootId, targetId) {
        if (rootId === targetId) return true;
        const root = state.items.get(rootId);
        if (!root) return false;
        for (let i = 0; i < root.contents.length; i++) {
            if (containsDeep(root.contents[i], targetId)) return true;
        }
        return false;
    }

    function clearHeld(unit, itemId) {
        for (let i = 0; i < SLOT_NAMES.length; i++) {
            if (unit.slots[SLOT_NAMES[i]] === itemId) {
                unit.slots[SLOT_NAMES[i]] = null;
                if (SLOT_NAMES[i] === "armor") unit.armorState = "UNARMORED";
            }
        }
        if (unit.haul === itemId) unit.haul = null;
    }

    function detach(item) {
        if (item.parentId) {
            const parent = state.items.get(item.parentId);
            if (parent) parent.contents = parent.contents.filter(function (cid) { return cid !== item.id; });
            item.parentId = null;
        }
        if (item.heldBy) {
            const unit = state.units.get(item.heldBy);
            if (unit) clearHeld(unit, item.id);
            item.heldBy = null;
        }
        item.hauledBy = null;
        item.haulAnim = null;
        item.slotName = null;
        indexSub(item);
        subBlocks(item);
    }

    function erase(item, silent) {
        if (!item || !state.items.has(item.id)) return;
        const kids = item.contents ? item.contents.slice() : [];
        for (let k = 0; k < kids.length; k++) {
            const child = state.items.get(kids[k]);
            if (child) erase(child, true);
        }
        const parentId = item.parentId;
        const saved = item.savedRev > 0 && !item.parentId && !item.heldBy && !item.seedKey;
        const id = item.id;
        if (item.seedKey) {
            const chunk = state.manifests.get(item.seedChunk);
            if (chunk) {
                chunk.removed.add(item.seedKey);
                chunk.cache.delete(item.seedKey);
                chunk.moved.delete(item.seedKey);
                chunk.rev += 1;
            }
        }
        detach(item);
        subBlocks(item);
        state.items.delete(id);
        if (saved && !silent) state.tombstones.push(id);
        if (parentId) {
            const parent = state.items.get(parentId);
            if (parent) touch(parent);
        }
    }

    function postRegister(item) {
        if (!state.ledger || !item.massMu || item.massPosted) return;
        if (state.ledger.isSealed()) fail("E_SEALED", "cannot register item mass after the ledger is sealed");
        state.ledger.register(item.ledgerClass, item.ledgerForm, item.massMu, "place");
        item.massPosted = true;
    }

    function occupants(surfaceId) {
        const list = [];
        for (const item of state.items.values()) {
            if (item.surfaceId === surfaceId && item.id !== surfaceId) list.push(item);
        }
        list.sort(function (a, b) { return a.id - b.id; });
        return list;
    }

    function loadOz(surfaceId) {
        const list = occupants(surfaceId);
        let t = 0;
        for (let i = 0; i < list.length; i++) t += totalOz(list[i].id);
        return t;
    }

    function dropToGround(item) {
        item.surfaceId = null;
        item.heightQuarters = 0;
        touch(item);
    }

    function collapseSurface(surface) {
        const list = occupants(surface.id);
        const spilled = [];
        for (let i = 0; i < list.length; i++) {
            dropToGround(list[i]);
            spilled.push(list[i].id);
        }
        if (surface.massMu && surface.onSpill) {
            if (!state.ledger || !state.ledger.isSealed()) fail("E_NOT_SEALED", "collapse needs a sealed ledger");
            state.ledger.transform(surface.ledgerClass, surface.ledgerForm, surface.onSpill.cls, surface.onSpill.form, surface.massMu, "collapse");
            if (surface.onSpill.form === "strata") {
                state.deposits.push({
                    cls: surface.onSpill.cls, form: surface.onSpill.form, amount: surface.massMu,
                    tileX: surface.tileX, tileY: surface.tileY, layer: surface.layer
                });
                state.depositsDirty = true;
                erase(surface);
                return spilled;
            }
            surface.ledgerClass = surface.onSpill.cls;
            surface.ledgerForm = surface.onSpill.form;
        }
        surface.broken = true;
        surface.kind = "item";
        surface.loadLimitOz = 0;
        surface.collapseOz = 0;
        touch(surface);
        return spilled;
    }

    function spillExcess(surface, cap) {
        const spilled = [];
        const list = occupants(surface.id);
        for (let i = list.length - 1; i >= 0; i--) {
            if (loadOz(surface.id) <= cap) break;
            dropToGround(list[i]);
            spilled.push(list[i].id);
        }
        return spilled;
    }

    function enforceLoad(surfaceId) {
        const surface = state.items.get(surfaceId);
        if (!surface || surface.kind !== "surface" || surface.broken) return [];
        const cap = surface.loadLimitOz;
        const collapseAt = surface.collapseOz != null ? surface.collapseOz : cap * C.COLLAPSE_RATIO;
        const total = loadOz(surfaceId);
        if (collapseAt != null && total > collapseAt) return collapseSurface(surface);
        if (total > cap) { // LOAD_LIMIT
            return spillExcess(surface, cap);
        }
        return [];
    }

    function attachSurface(item, surfaceId) {
        const surface = state.items.get(surfaceId);
        if (!surface || surface.kind !== "surface" || surface.broken) fail("E_SURFACE", "not a living surface");
        if (item.layer !== surface.layer) fail("E_SURFACE", "surface is on another layer");
        if (item.xPx < surface.xPx || item.yPx < surface.yPx || item.xPx >= surface.xPx + surface.sizePx || item.yPx >= surface.yPx + surface.sizePx) {
            fail("E_SURFACE", "anchor is off the surface footprint");
        }
        item.surfaceId = surface.id;
        item.heightQuarters = surface.surfaceQuarters;
        touch(item);
        return enforceLoad(surface.id);
    }

    function place(spec) {
        const def = catalog.item(spec.typeId);
        if (!def) fail("E_TYPE", "unknown item " + spec.typeId);
        if (spec.scale != null && spec.scale !== 1) fail("E_SCALE", "size classes are drawn true size, with no scaling");
        const item = makeItem(def, {});
        state.items.set(item.id, item);
        const layer = spec.layer | 0;
        if (spec.xPx != null && spec.yPx != null) applyPx(item, spec.xPx, spec.yPx, layer);
        else applyCell(item, spec.tileX | 0, spec.tileY | 0, spec.cellX || 0, spec.cellY || 0, layer);
        if (spec.ownerId) item.ownerId = spec.ownerId;
        if (spec.shop) item.shop = true;
        if (spec.condition != null) item.condition = spec.condition;
        if (spec.heightQuarters != null) item.heightQuarters = spec.heightQuarters | 0;
        if (spec.loadLimitLb != null) {
            item.loadLimitOz = ozFromLb(spec.loadLimitLb);
            item.collapseOz = spec.collapseLb != null ? ozFromLb(spec.collapseLb) : item.loadLimitOz * C.COLLAPSE_RATIO;
        }
        if (spec.capLb != null) item.capOz = ozFromLb(spec.capLb);
        if (spec.capCuFt != null) item.capCuIn = cuFromFt(spec.capCuFt);
        postRegister(item);
        indexAdd(item);
        addBlocks(item);
        if (spec.surfaceId) {
            try {
                attachSurface(item, spec.surfaceId);
            } catch (err) {
                erase(item, true);
                throw err;
            }
        }
        item.rev = 1;
        item.savedRev = 0;
        return copyItem(item);
    }

    function putIn(containerId, itemId, pos) {
        const container = mustContainer(containerId);
        const item = must(itemId);
        if (container.lock && container.lock.locked) return { ok: false, reason: "locked" };
        if (containsDeep(item.id, container.id)) return { ok: false, reason: "cycle" };
        const cellX = pos && pos.cellX != null ? pos.cellX : 0;
        const cellY = pos && pos.cellY != null ? pos.cellY : 0;
        if (!Number.isSafeInteger(cellX) || !Number.isSafeInteger(cellY)) return { ok: false, reason: "cell" };
        const ix = cellX * C.CELL_PX;
        const iy = cellY * C.CELL_PX;
        const limit = container.interiorCells * C.CELL_PX;
        if (ix < 0 || iy < 0 || ix + item.sizePx > limit || iy + item.sizePx > limit) return { ok: false, reason: "interior" };
        let weight = 0;
        let volume = 0;
        for (let i = 0; i < container.contents.length; i++) {
            const cid = container.contents[i];
            if (cid === item.id) continue;
            weight += totalOz(cid);
            volume += stowCuIn(cid);
        }
        weight += totalOz(item.id);
        volume += stowCuIn(item.id);
        if (container.capOz != null && weight > container.capOz) return { ok: false, reason: "weight" };
        if (container.capCuIn != null && volume > container.capCuIn) return { ok: false, reason: "volume" };
        const parentBefore = item.parentId;
        detach(item);
        item.parentId = container.id;
        item.interiorX = ix;
        item.interiorY = iy;
        item.surfaceId = null;
        item.heightQuarters = 0;
        if (container.contents.indexOf(item.id) < 0) container.contents.push(item.id);
        touch(container);
        if (parentBefore && parentBefore !== container.id) {
            const old = state.items.get(parentBefore);
            if (old) touch(old);
        }
        return { ok: true, interiorX: ix, interiorY: iy };
    }

    function placeOnMap(item, dest) {
        const layer = dest.layer != null ? dest.layer : item.layer;
        if (dest.xPx != null && dest.yPx != null) applyPx(item, dest.xPx, dest.yPx, layer);
        else applyCell(item, dest.tileX | 0, dest.tileY | 0, dest.cellX || 0, dest.cellY || 0, layer);
        item.surfaceId = null;
        item.heightQuarters = dest.heightQuarters || 0;
        indexAdd(item);
        addBlocks(item);
    }

    function move(id, dest) {
        dest = dest || {};
        if (dest.containerId) return putIn(dest.containerId, id, dest);
        if (dest.unitId) return equip(dest.unitId, id, dest.slot);
        const item = must(id);
        if (item.parentId) {
            const parent = state.items.get(item.parentId);
            if (parent && parent.lock && parent.lock.locked) return { ok: false, reason: "locked" };
            detach(item);
        }
        subBlocks(item);
        indexSub(item);
        placeOnMap(item, dest);
        touch(item);
        if (dest.surfaceId) attachSurface(item, dest.surfaceId);
        return { ok: true, id: item.id, xPx: item.xPx, yPx: item.yPx, surfaceId: item.surfaceId, heightQuarters: item.heightQuarters };
    }

    function effectiveOwner(item) {
        if (item.ownerId) return item.ownerId;
        let cursor = item;
        const guard = new Set();
        while (cursor.parentId) {
            if (guard.has(cursor.id)) break;
            guard.add(cursor.id);
            cursor = state.items.get(cursor.parentId);
            if (!cursor) break;
            if (cursor.ownerId) return cursor.ownerId;
        }
        return null;
    }

    function steal(itemId, actor) {
        const item = must(itemId);
        const actorId = actor && actor.actorId;
        if (!actorId) fail("E_ACTOR", "steal needs an actorId");
        const parent = item.parentId ? state.items.get(item.parentId) : null;
        if (parent && parent.lock && parent.lock.locked) return { ok: false, reason: "locked" };
        const owner = effectiveOwner(item);
        const theft = !!(owner && owner !== actorId && !actor.permit);
        if (parent) {
            detach(item);
            placeOnMap(item, { tileX: parent.tileX, tileY: parent.tileY, cellX: 0, cellY: 0, layer: parent.layer });
            touch(parent);
        }
        item.ownerId = actorId;
        item.theft = theft;
        item.stolenFrom = theft ? owner : null;
        touch(item);
        return { ok: true, theft: theft, from: item.stolenFrom, ownerId: item.ownerId };
    }

    function heldIds(unit) {
        const out = [];
        const seen = new Set();
        for (let i = 0; i < SLOT_NAMES.length; i++) {
            const id = unit.slots[SLOT_NAMES[i]];
            if (id && !seen.has(id)) {
                seen.add(id);
                out.push(id);
            }
        }
        if (unit.haul && !seen.has(unit.haul)) out.push(unit.haul);
        return out;
    }

    function carriedOz(unit) {
        const ids = heldIds(unit);
        let t = 0;
        for (let i = 0; i < ids.length; i++) t += totalOz(ids[i]);
        return t;
    }

    function carryCapOz(unit) {
        return unit.str * C.CARRY_LB_PER_STR * C.OZ_PER_LB;
    }

    function slotAccepts(slot, item) {
        if (slot === "armor") return !!item.armorCategory;
        if (slot === "mainHand" || slot === "offHand") return item.kind === "item" && !item.armorCategory;
        if (slot === "pack") return item.kind === "container";
        if (GEAR_SLOTS.indexOf(slot) >= 0) return item.kind === "item" && !item.armorCategory;
        return false;
    }

    function equip(unitId, itemId, slot) {
        const unit = mustUnit(unitId);
        const item = must(itemId);
        if (SLOT_NAMES.indexOf(slot) < 0) return { ok: false, reason: "slot" };
        if (!slotAccepts(slot, item)) return { ok: false, reason: "slot" };
        if (item.parentId) {
            const parent = state.items.get(item.parentId);
            if (parent && parent.lock && parent.lock.locked) return { ok: false, reason: "locked" };
        }
        const prevId = unit.slots[slot];
        const adding = item.heldBy === unitId ? 0 : totalOz(item.id);
        const prevW = prevId && prevId !== item.id ? totalOz(prevId) : 0;
        if (carriedOz(unit) - prevW + adding > carryCapOz(unit)) return { ok: false, reason: "encumbered" };
        detach(item);
        if (prevId && prevId !== item.id) {
            const prev = state.items.get(prevId);
            if (prev) {
                detach(prev);
                placeOnMap(prev, { tileX: unit.tileX, tileY: unit.tileY, cellX: 1, cellY: 1, layer: unit.layer });
                touch(prev);
            }
        }
        unit.slots[slot] = item.id;
        item.heldBy = unitId;
        item.slotName = slot;
        if (slot === "armor") unit.armorState = item.armorCategory; // ARMOR_ONLY
        unit.rev += 1;
        touch(item);
        return { ok: true, armorState: unit.armorState, slotId: unit.slotByArmor[unit.armorState] || null };
    }

    function unequip(unitId, slot, dest) {
        const unit = mustUnit(unitId);
        const id = unit.slots[slot];
        if (!id) return { ok: false, reason: "empty" };
        const item = state.items.get(id);
        detach(item);
        if (slot === "armor") unit.armorState = "UNARMORED";
        placeOnMap(item, dest || { tileX: unit.tileX, tileY: unit.tileY, cellX: 0, cellY: 0, layer: unit.layer });
        touch(item);
        unit.rev += 1;
        return { ok: true, armorState: unit.armorState };
    }

    function beginHaul(unitId, itemId) {
        const unit = mustUnit(unitId);
        const item = must(itemId);
        if (item.kind === "surface") return { ok: false, reason: "surface" };
        if (item.parentId) {
            const parent = state.items.get(item.parentId);
            if (parent && parent.lock && parent.lock.locked) return { ok: false, reason: "locked" };
        }
        const already = item.heldBy === unitId;
        if (carriedOz(unit) + (already ? 0 : totalOz(item.id)) > carryCapOz(unit)) return { ok: false, reason: "encumbered" };
        detach(item);
        item.heldBy = unitId;
        item.hauledBy = unitId;
        item.haulAnim = C.CARRY_ANIM; // CARRY_CLIP
        unit.haul = item.id;
        unit.rev += 1;
        touch(item);
        return { ok: true, unitId: unitId, itemId: item.id, anim: item.haulAnim };
    }

    function addUnit(spec) {
        if (!spec || !spec.id) fail("E_UNIT", "unit needs an id");
        if (state.units.has(spec.id)) fail("E_UNIT", "duplicate unit " + spec.id);
        const armorState = spec.armorState || "UNARMORED";
        if (C.ARMOR_STATES.indexOf(armorState) < 0) fail("E_ARMOR", "unknown armor state " + armorState);
        const str = spec.str | 0;
        if (str < 1 || str > 30) fail("E_STR", "strength must be 1..30");
        const slots = {};
        for (let i = 0; i < SLOT_NAMES.length; i++) slots[SLOT_NAMES[i]] = null;
        const unit = {
            id: spec.id,
            str: str,
            race: spec.race || "human",
            sex: spec.sex || "male",
            tileX: spec.tileX | 0,
            tileY: spec.tileY | 0,
            layer: spec.layer | 0,
            armorState: armorState,
            slotByArmor: Object.assign({}, spec.slotByArmor || {}),
            slots: slots,
            haul: null,
            rev: 1,
            savedRev: 0
        };
        state.units.set(unit.id, unit);
        return {
            id: unit.id, str: unit.str, race: unit.race, sex: unit.sex, armorState: unit.armorState
        };
    }

    function mapSprite(unitId) {
        const unit = mustUnit(unitId);
        return {
            race: unit.race,
            sex: unit.sex,
            armorState: unit.armorState,
            slotId: unit.slotByArmor[unit.armorState] || null,
            scale: 1
        };
    }

    function actorHasKey(actor, keyId) {
        if (!keyId) return false;
        if (actor.keys && actor.keys.indexOf(keyId) >= 0) return true;
        if (actor.unitId && state.units.has(actor.unitId)) {
            const ids = heldIds(state.units.get(actor.unitId));
            for (let i = 0; i < ids.length; i++) {
                const item = state.items.get(ids[i]);
                if (item && item.keyId === keyId) return true;
            }
        }
        return false;
    }

    function actorHasTools(actor) {
        if (actor.tools && actor.tools.thieves) return true;
        if (actor.unitId && state.units.has(actor.unitId)) {
            const ids = heldIds(state.units.get(actor.unitId));
            for (let i = 0; i < ids.length; i++) {
                const item = state.items.get(ids[i]);
                if (item && item.tool === "thieves") return true;
            }
        }
        return false;
    }

    function actorMod(actor) {
        let mod = actor.dexMod || 0;
        if (actor.thievesProf) mod += actor.profBonus || 0;
        return mod;
    }

    function setLock(id, lock) {
        const container = mustContainer(id);
        const dc = lock && lock.dc | 0;
        if (dc < 1) fail("E_DC", "lock DC must be a positive integer");
        container.lock = { locked: true, dc: dc, keyId: lock.keyId || null };
        touch(container);
        return { locked: true, dc: dc, keyId: container.lock.keyId };
    }

    function setTrap(id, trap) {
        const container = mustContainer(id);
        const dc = trap && trap.dc | 0;
        if (dc < 1) fail("E_DC", "trap DC must be a positive integer");
        container.trap = { dc: dc, damage: trap.damage || "1d6", disarmed: false, triggered: false };
        touch(container);
        return { dc: dc, damage: container.trap.damage };
    }

    function tryUnlock(id, actor, rng) {
        const container = mustContainer(id);
        if (!container.lock || !container.lock.locked) return { ok: true, reason: "open" };
        if (actorHasKey(actor, container.lock.keyId)) { // KEY_OPENS
            container.lock.locked = false;
            touch(container);
            return { ok: true, reason: "key", roll: null };
        }
        if (!actorHasTools(actor)) return { ok: false, reason: "no-tools" };
        const roll = dice.rollD20(rng);
        const total = roll.natural + actorMod(actor);
        const ok = total >= container.lock.dc;
        if (ok) container.lock.locked = false;
        touch(container);
        return { ok: ok, reason: "check", roll: roll.natural, total: total, dc: container.lock.dc };
    }

    function tryDisarm(id, actor, rng) {
        const container = mustContainer(id);
        const trap = container.trap;
        if (!trap || trap.disarmed) return { ok: true, reason: "none", triggered: false };
        if (!actorHasTools(actor)) return { ok: false, reason: "no-tools", triggered: false };
        const roll = dice.rollD20(rng);
        const total = roll.natural + actorMod(actor);
        const success = total >= trap.dc;
        let triggered = false;
        if (success) trap.disarmed = true;
        else {
            triggered = total <= trap.dc - 5; // TRAP_BY_5
            if (triggered) trap.triggered = true;
        }
        touch(container);
        return { ok: success, reason: "check", roll: roll.natural, total: total, dc: trap.dc, triggered: triggered };
    }

    function windowFor(containerId) {
        for (const w of state.windows.values()) {
            if (w.containerId === containerId && w.open) return w;
        }
        return null;
    }

    function copyWindow(w) {
        const container = state.items.get(w.containerId);
        return {
            id: w.id,
            containerId: w.containerId,
            x: w.x,
            y: w.y,
            open: w.open,
            showContents: w.showContents,
            backgroundSlotId: container && container.opened && container.openSlotId ? container.openSlotId : (container ? container.slotId : null),
            sprung: !!w.sprung
        };
    }

    function openWindow(container, showContents, sprung) {
        let w = windowFor(container.id);
        if (!w) {
            w = {
                id: state.nextWindow++,
                containerId: container.id,
                x: 32 + state.windows.size * 24,
                y: 32 + state.windows.size * 24,
                open: true,
                showContents: showContents,
                sprung: !!sprung,
                focus: ++state.focusSeq
            };
            state.windows.set(w.id, w);
        } else {
            w.showContents = showContents;
            w.sprung = !!sprung;
            w.focus = ++state.focusSeq;
        }
        if (showContents) {
            container.opened = true;
            if (container.openSlotId) container.slotId = container.openSlotId;
        }
        return copyWindow(w);
    }

    function doubleClick(id) {
        const container = mustContainer(id);
        if (container.lock && container.lock.locked) return openWindow(container, false, false);
        let sprung = false;
        if (container.trap && !container.trap.disarmed && !container.trap.triggered) {
            container.trap.triggered = true;
            sprung = true;
            touch(container);
        }
        return openWindow(container, true, sprung);
    }

    function moveWindow(windowId, x, y) {
        const w = state.windows.get(windowId);
        if (!w) fail("E_WINDOW", "no window " + windowId);
        if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) fail("E_WINDOW", "window position must be whole pixels");
        w.x = x;
        w.y = y;
        return copyWindow(w);
    }

    function closeWindow(windowId) {
        const w = state.windows.get(windowId);
        if (!w) return false;
        state.windows.delete(windowId);
        const container = state.items.get(w.containerId);
        if (container && !windowFor(container.id) && container.closedSlotId) {
            container.opened = false;
            container.slotId = container.closedSlotId;
        }
        return true;
    }

    function windows() {
        const list = Array.from(state.windows.values()).sort(function (a, b) { return a.id - b.id; });
        return list.map(copyWindow);
    }

    function interiorDraw(containerId) {
        const container = mustContainer(containerId);
        const w = windowFor(container.id);
        if (!w || !w.showContents) return [];
        const out = [];
        for (let i = 0; i < container.contents.length; i++) {
            const item = state.items.get(container.contents[i]);
            out.push({
                id: item.id,
                slotId: item.slotId,
                name: item.name,
                xPx: item.interiorX,
                yPx: item.interiorY,
                w: item.sizePx,
                h: item.sizePx,
                scale: 1
            });
        }
        out.sort(function (a, b) { return a.yPx - b.yPx || a.xPx - b.xPx || a.id - b.id; });
        return out;
    }

    function glowOf(item) {
        let best = null;
        for (let i = 0; i < state.glows.length; i++) {
            const g = state.glows[i];
            if (g.layer !== item.layer) continue;
            const dist = geom.squares555(item.tileX - g.tileX, item.tileY - g.tileY);
            const bright = g.brightTiles != null ? g.brightTiles : C.TORCH_BRIGHT_TILES;
            const dim = g.dimTiles != null ? g.dimTiles : C.TORCH_DIM_TILES;
            if (dist <= bright) best = "bright";
            else if (dist <= bright + dim && best !== "bright") best = "dim";
        }
        return best;
    }

    function drawOf(item) {
        return {
            id: item.id,
            slotId: item.slotId,
            name: item.name,
            xPx: item.xPx,
            yPx: item.yPx,
            w: item.sizePx,
            h: item.sizePx,
            scale: 1,
            layer: item.layer,
            heightOffsetPx: item.heightQuarters * C.QUARTER_PX,
            bottomLine: item.yPx + item.sizePx - 1,
            shadowPx: geom.shadowPx(item.sizePx),
            glow: glowOf(item),
            outlinePx: item.id === state.hoverId ? C.OUTLINE_PX : 0
        };
    }

    function drawList(rect) {
        const layer = rect.layer | 0;
        const x0 = rect.x0 | 0;
        const y0 = rect.y0 | 0;
        const x1 = rect.x1 | 0;
        const y1 = rect.y1 | 0;
        const tx0 = Math.floor(x0 / C.TILE_PX);
        const ty0 = Math.floor(y0 / C.TILE_PX);
        const tx1 = Math.floor((x1 - 1) / C.TILE_PX);
        const ty1 = Math.floor((y1 - 1) / C.TILE_PX);
        const cx0 = Math.floor(tx0 / state.chunkTiles) - 1;
        const cy0 = Math.floor(ty0 / state.chunkTiles) - 1;
        const cx1 = Math.floor(tx1 / state.chunkTiles) + 1;
        const cy1 = Math.floor(ty1 / state.chunkTiles) + 1;
        const found = [];
        const seen = new Set();
        for (let cx = cx0; cx <= cx1; cx++) {
            for (let cy = cy0; cy <= cy1; cy++) {
                const set = state.spatial.get(cx + "," + cy + "," + layer);
                if (!set) continue;
                for (const id of set) {
                    if (seen.has(id)) continue;
                    seen.add(id);
                    const item = state.items.get(id);
                    if (!item || item.parentId || item.heldBy) continue;
                    if (item.xPx + item.sizePx <= x0 || item.yPx + item.sizePx <= y0) continue;
                    if (item.xPx >= x1 || item.yPx >= y1) continue;
                    found.push(item);
                }
            }
        }
        found.sort(geom.drawCompare);
        return found.map(drawOf);
    }

    function stackAt(xPx, yPx, layer) {
        const tileX = Math.floor(xPx / C.TILE_PX);
        const tileY = Math.floor(yPx / C.TILE_PX);
        const cx = Math.floor(tileX / state.chunkTiles);
        const cy = Math.floor(tileY / state.chunkTiles);
        const stack = [];
        const seen = new Set();
        for (let ix = cx - 1; ix <= cx + 1; ix++) {
            for (let iy = cy - 1; iy <= cy + 1; iy++) {
                const set = state.spatial.get(ix + "," + iy + "," + layer);
                if (!set) continue;
                for (const id of set) {
                    if (seen.has(id)) continue;
                    seen.add(id);
                    const item = state.items.get(id);
                    if (!item || item.parentId || item.heldBy) continue;
                    if (geom.containsPx(item, xPx, yPx)) stack.push(item);
                }
            }
        }
        stack.sort(function (a, b) { return geom.drawCompare(a, b); });
        stack.reverse(); // PICK_TOPMOST
        return stack;
    }

    function pick(xPx, yPx, layer, opts) {
        layer = layer | 0;
        const stack = stackAt(xPx, yPx, layer);
        if (!stack.length) return null;
        const cycle = opts && opts.cycle ? opts.cycle | 0 : 0;
        const key = layer + ":" + geom.snapPx(xPx) + ":" + geom.snapPx(yPx);
        let index = 0;
        if (cycle) {
            const prev = state.pickKey === key ? state.pickIndex : 0;
            index = (prev + cycle) % stack.length;
            if (index < 0) index += stack.length;
            state.pickKey = key;
            state.pickIndex = index;
        }
        const item = stack[index];
        return { itemId: item.id, name: item.name, index: index, depth: stack.length };
    }

    function hover(xPx, yPx, layer) {
        const stack = stackAt(xPx, yPx, layer | 0);
        if (!stack.length) {
            state.hoverId = null;
            return null;
        }
        state.hoverId = stack[0].id;
        return { itemId: stack[0].id, name: stack[0].name, outlinePx: C.OUTLINE_PX };
    }

    function setZoomHold(on, factor) {
        if (!on) {
            state.zoom = null;
            return { zoom: null };
        }
        if (factor !== 3 && factor !== 4) fail("E_ZOOM", "hold-to-zoom is integer 3 or 4"); // ZOOM_3_4
        state.zoom = factor;
        return { zoom: factor };
    }

    function isBlockedTile(x, y, layer) {
        if (state.bounds) {
            const b = state.bounds;
            if (x < b.x0 || y < b.y0 || x > b.x1 || y > b.y1) return true;
        }
        const key = x + "," + y + "," + layer;
        if (state.terrain.has(key)) return true;
        if (state.blockProvider && state.blockProvider(x, y, layer)) return true;
        return (state.itemBlocks.get(key) || 0) > 0;
    }

    function findPath(x0, y0, x1, y1, layer) {
        layer = layer | 0;
        return pathing.findPath({
            start: { x: x0, y: y0 },
            goal: { x: x1, y: y1 },
            blocked: function (x, y) { return isBlockedTile(x, y, layer); }
        });
    }

    function blankChunk(cx, cy, layer) {
        return {
            cx: cx, cy: cy, layer: layer,
            counts: {},
            removed: new Set(),
            moved: new Map(),
            cache: new Map(),
            expanded: false,
            rev: 0,
            savedRev: 0
        };
    }

    function addManifest(cx, cy, layer, counts) {
        if (!Number.isSafeInteger(cx) || !Number.isSafeInteger(cy) || !Number.isSafeInteger(layer)) fail("E_CHUNK", "chunk coordinates must be integers");
        const key = cx + "," + cy + "," + layer;
        let chunk = state.manifests.get(key);
        if (!chunk) {
            chunk = blankChunk(cx, cy, layer);
            state.manifests.set(key, chunk);
        }
        const types = Object.keys(counts).sort();
        for (let i = 0; i < types.length; i++) {
            const typeId = types[i];
            if (!catalog.item(typeId)) fail("E_TYPE", "unknown item " + typeId);
            const n = counts[typeId];
            if (!Number.isSafeInteger(n) || n < 0) fail("E_COUNT", "bad count for " + typeId);
            chunk.counts[typeId] = (chunk.counts[typeId] || 0) + n;
        }
        chunk.rev += 1;
        return { cx: cx, cy: cy, layer: layer, counts: Object.assign({}, chunk.counts) };
    }

    function expandChunk(cx, cy, layer) {
        const key = cx + "," + cy + "," + layer;
        const chunk = state.manifests.get(key);
        if (!chunk) fail("E_CHUNK", "no manifest at " + key);
        if (chunk.expanded) return chunkPositions(cx, cy, layer);
        const types = Object.keys(chunk.counts).sort();
        for (let t = 0; t < types.length; t++) {
            const typeId = types[t];
            const def = catalog.item(typeId);
            const n = chunk.counts[typeId];
            for (let i = 0; i < n; i++) {
                const seedKey = typeId + "#" + i;
                if (chunk.removed.has(seedKey)) continue;
                const canon = summary.seededAnchor({
                    seed: state.seed, cx: cx, cy: cy, layer: layer,
                    typeId: typeId, index: i, sizePx: def.sizePx, chunkTiles: state.chunkTiles
                });
                const pos = chunk.moved.get(seedKey) || canon;
                const item = makeItem(def, { massPosted: true });
                item.massMu = 0;
                applyCell(item, pos.tileX, pos.tileY, pos.cellX, pos.cellY, layer);
                item.seedKey = seedKey;
                item.seedChunk = key;
                item.decayPerTick = 0;
                state.items.set(item.id, item);
                chunk.cache.set(seedKey, item.id);
                indexAdd(item);
                addBlocks(item);
            }
        }
        chunk.expanded = true;
        return chunkPositions(cx, cy, layer);
    }

    function collapseChunk(cx, cy, layer) {
        const key = cx + "," + cy + "," + layer;
        const chunk = state.manifests.get(key);
        if (!chunk || !chunk.expanded) return;
        for (const seedKey of Array.from(chunk.cache.keys())) {
            const item = state.items.get(chunk.cache.get(seedKey));
            if (!item) continue;
            writeSeedOverride(item);
            subBlocks(item);
            indexSub(item);
            state.items.delete(item.id);
        }
        chunk.cache.clear();
        chunk.expanded = false;
    }

    function chunkPositions(cx, cy, layer) {
        const chunk = state.manifests.get(cx + "," + cy + "," + layer);
        if (!chunk) return [];
        const keys = Array.from(chunk.cache.keys()).sort();
        const out = [];
        for (let i = 0; i < keys.length; i++) {
            const item = state.items.get(chunk.cache.get(keys[i]));
            out.push({
                seedKey: keys[i], id: item.id,
                tileX: item.tileX, tileY: item.tileY, cellX: item.cellX, cellY: item.cellY,
                xPx: item.xPx, yPx: item.yPx
            });
        }
        return out;
    }

    function chunkNear(cx, cy) {
        if (!state.viewer) return false;
        const centerX = cx * state.chunkTiles + (state.chunkTiles >> 1);
        const centerY = cy * state.chunkTiles + (state.chunkTiles >> 1);
        const d = Math.max(Math.abs(centerX - state.viewer.tileX), Math.abs(centerY - state.viewer.tileY));
        return d <= state.nearTiles;
    }

    function setViewer(tileX, tileY, layer) {
        state.viewer = { tileX: tileX | 0, tileY: tileY | 0, layer: layer | 0 };
        for (const chunk of state.manifests.values()) {
            if (chunk.layer !== state.viewer.layer) {
                if (chunk.expanded) collapseChunk(chunk.cx, chunk.cy, chunk.layer);
                continue;
            }
            if (chunkNear(chunk.cx, chunk.cy)) {
                if (!chunk.expanded) expandChunk(chunk.cx, chunk.cy, chunk.layer);
            } else if (chunk.expanded) collapseChunk(chunk.cx, chunk.cy, chunk.layer);
        }
        return { tileX: state.viewer.tileX, tileY: state.viewer.tileY, layer: state.viewer.layer };
    }

    function planLoose(item, mode, plan, spatial, origin, index) {
        if (mode === "burn" && item.onBurn && item.massMu) {
            plan.push({
                fromCls: item.ledgerClass, fromForm: item.ledgerForm,
                toCls: item.onBurn.cls, toForm: item.onBurn.form,
                amount: item.massMu, cause: "burn-contents"
            });
            spatial.push({
                op: "deposit", id: item.id, cls: item.onBurn.cls, form: item.onBurn.form, amount: item.massMu,
                tileX: origin.tileX, tileY: origin.tileY, layer: origin.layer
            });
        } else {
            spatial.push({
                op: "ground", id: item.id, index: index,
                tileX: origin.tileX, tileY: origin.tileY, layer: origin.layer
            });
        }
    }

    function planBody(container, mode, plan, spatial, origin) {
        const outcome = mode === "burn" ? container.onBurn : container.onSpill;
        if (!outcome) fail("E_DESTROY", "no " + mode + " outcome for " + container.typeId);
        if (container.massMu) {
            plan.push({
                fromCls: container.ledgerClass, fromForm: container.ledgerForm,
                toCls: outcome.cls, toForm: outcome.form,
                amount: container.massMu, cause: mode + "-container"
            });
        }
        if (outcome.form === "strata") {
            spatial.push({
                op: "deposit", id: container.id, cls: outcome.cls, form: outcome.form, amount: container.massMu,
                tileX: origin.tileX, tileY: origin.tileY, layer: origin.layer
            });
        } else {
            spatial.push({ op: "retarget", id: container.id, cls: outcome.cls, form: outcome.form });
        }
    }

    function planTree(container, mode, plan, spatial, origin) {
        const here = origin || { tileX: container.tileX, tileY: container.tileY, layer: container.layer };
        const contents = container.contents.slice();
        for (let i = 0; i < contents.length; i++) {
            const child = state.items.get(contents[i]);
            if (!child) continue;
            if (child.kind === "container" && !child.broken) planTree(child, mode, plan, spatial, here);
            else planLoose(child, mode, plan, spatial, here, i);
        }
        planBody(container, mode, plan, spatial, here);
    }

    function applySpatial(spatial) {
        for (let i = 0; i < spatial.length; i++) {
            const op = spatial[i];
            const item = state.items.get(op.id);
            if (!item) continue;
            if (op.op === "ground") {
                detach(item);
                item.surfaceId = null;
                item.heightQuarters = 0;
                const span = item.sizePx / C.CELL_PX;
                let cell = op.index % C.CELLS_PER_TILE;
                if (cell + span > C.CELLS_PER_TILE) cell = 0;
                applyCell(item, op.tileX, op.tileY, cell, 0, op.layer);
                indexAdd(item);
                addBlocks(item);
                touch(item);
            } else if (op.op === "deposit") {
                state.deposits.push({
                    cls: op.cls, form: op.form, amount: op.amount,
                    tileX: op.tileX, tileY: op.tileY, layer: op.layer
                });
                state.depositsDirty = true;
                erase(item);
            } else if (op.op === "retarget") {
                item.contents = [];
                item.kind = "item";
                item.broken = true;
                item.ledgerClass = op.cls;
                item.ledgerForm = op.form;
                item.capOz = null;
                item.capCuIn = null;
                item.lock = null;
                item.trap = null;
                item.loadLimitOz = 0;
                touch(item);
            }
        }
    }

    function destroyContainer(id, opts) {
        const mode = opts && opts.mode;
        if (mode !== "spill" && mode !== "burn") fail("E_MODE", "destruction mode must be spill or burn");
        const container = mustContainer(id);
        if (state.ledger && !state.ledger.isSealed()) fail("E_NOT_SEALED", "seal the ledger before destruction");
        const plan = [];
        const spatial = [];
        planTree(container, mode, plan, spatial, null);
        if (state.ledger) applyPlan(state.ledger, plan); // LEDGER_POST
        applySpatial(spatial);
        mergeDeposits();
        return { ok: true, mode: mode, steps: plan.length };
    }

    function rotAway(item) {
        if (item.massMu && item.onRot) {
            if (!state.ledger || !state.ledger.isSealed()) fail("E_NOT_SEALED", "rot needs a sealed ledger");
            state.ledger.transform(item.ledgerClass, item.ledgerForm, item.onRot.cls, item.onRot.form, item.massMu, "rot");
            state.deposits.push({
                cls: item.onRot.cls, form: item.onRot.form, amount: item.massMu,
                tileX: item.tileX, tileY: item.tileY, layer: item.layer
            });
            state.depositsDirty = true;
        }
        erase(item);
    }

    function mergeDeposits() {
        const map = new Map();
        for (let i = 0; i < state.deposits.length; i++) {
            const d = state.deposits[i];
            const key = d.cls + "|" + d.form + "|" + d.tileX + "|" + d.tileY + "|" + d.layer;
            let row = map.get(key);
            if (!row) {
                row = { cls: d.cls, form: d.form, amount: 0, tileX: d.tileX, tileY: d.tileY, layer: d.layer };
                map.set(key, row);
            }
            row.amount += d.amount;
        }
        const merged = Array.from(map.values());
        merged.sort(function (a, b) {
            if (a.cls !== b.cls) return a.cls < b.cls ? -1 : 1;
            if (a.form !== b.form) return a.form < b.form ? -1 : 1;
            return a.tileX - b.tileX || a.tileY - b.tileY || a.layer - b.layer;
        });
        state.deposits = merged;
    }

    function tick() {
        state.ticks += 1;
        const list = Array.from(state.items.values());
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (item.decayPerTick && item.condition !== null && item.condition > 0) {
                item.condition -= item.decayPerTick;
                touch(item);
            }
        }
        return cleanup();
    }

    function cleanup() {
        const gone = [];
        const list = Array.from(state.items.values());
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (item.condition !== null && item.condition <= 0) gone.push(item.id); // CLUTTER_DEAD
        }
        for (let i = 0; i < gone.length; i++) {
            const item = state.items.get(gone[i]);
            if (item) rotAway(item);
        }
        mergeDeposits();
        return { removed: gone.length, deposits: state.deposits.length, tick: state.ticks };
    }

    function copyItem(item) {
        return {
            id: item.id,
            typeId: item.typeId,
            name: item.name,
            kind: item.kind,
            slotId: item.slotId,
            openSlotId: item.openSlotId,
            iconSlotId: item.iconSlotId,
            portraitSlotId: item.portraitSlotId,
            sizePx: item.sizePx,
            scale: 1,
            xPx: item.xPx,
            yPx: item.yPx,
            tileX: item.tileX,
            tileY: item.tileY,
            cellX: item.cellX,
            cellY: item.cellY,
            layer: item.layer,
            heightQuarters: item.heightQuarters,
            heightOffsetPx: item.heightQuarters * C.QUARTER_PX,
            surfaceId: item.surfaceId,
            parentId: item.parentId,
            interiorX: item.interiorX,
            interiorY: item.interiorY,
            contents: item.contents.slice(),
            ownerId: item.ownerId,
            theft: item.theft,
            stolenFrom: item.stolenFrom,
            hauledBy: item.hauledBy,
            haulAnim: item.haulAnim,
            heldBy: item.heldBy,
            condition: item.condition,
            broken: item.broken,
            shop: item.shop,
            opened: item.opened,
            lock: item.lock ? { locked: !!item.lock.locked, dc: item.lock.dc, keyId: item.lock.keyId || null } : null,
            trap: item.trap ? { dc: item.trap.dc, damage: item.trap.damage, disarmed: !!item.trap.disarmed, triggered: !!item.trap.triggered } : null,
            ledgerClass: item.ledgerClass,
            ledgerForm: item.ledgerForm,
            massMu: item.massMu,
            weightOz: item.weightOz,
            facing: item.facing,
            armorCategory: item.armorCategory,
            seedKey: item.seedKey || null
        };
    }

    function serialize(item) {
        const contents = [];
        for (let i = 0; i < item.contents.length; i++) contents.push(serialize(state.items.get(item.contents[i])));
        return {
            id: item.id,
            typeId: item.typeId,
            tileX: item.tileX,
            tileY: item.tileY,
            cellX: item.cellX,
            cellY: item.cellY,
            layer: item.layer,
            heightQuarters: item.heightQuarters,
            surfaceId: item.surfaceId,
            interiorX: item.interiorX,
            interiorY: item.interiorY,
            ownerId: item.ownerId,
            theft: !!item.theft,
            stolenFrom: item.stolenFrom,
            condition: item.condition,
            facing: item.facing,
            slotId: item.slotId,
            broken: !!item.broken,
            shop: !!item.shop,
            lock: item.lock ? { locked: !!item.lock.locked, dc: item.lock.dc, keyId: item.lock.keyId || null } : null,
            trap: item.trap ? { dc: item.trap.dc, damage: item.trap.damage, disarmed: !!item.trap.disarmed, triggered: !!item.trap.triggered } : null,
            ledgerClass: item.ledgerClass,
            ledgerForm: item.ledgerForm,
            massMu: item.massMu,
            loadLimitOz: item.loadLimitOz,
            collapseOz: item.collapseOz,
            capOz: item.capOz,
            capCuIn: item.capCuIn,
            contents: contents
        };
    }

    function serializeChunk(chunk) {
        const moved = [];
        const keys = Array.from(chunk.moved.keys()).sort();
        for (let i = 0; i < keys.length; i++) {
            const pos = chunk.moved.get(keys[i]);
            moved.push({ key: keys[i], tileX: pos.tileX, tileY: pos.tileY, cellX: pos.cellX, cellY: pos.cellY });
        }
        return {
            cx: chunk.cx, cy: chunk.cy, layer: chunk.layer,
            counts: Object.assign({}, chunk.counts),
            removed: Array.from(chunk.removed).sort(),
            moved: moved
        };
    }

    function serializeUnit(unit) {
        const slots = {};
        const held = {};
        for (let i = 0; i < SLOT_NAMES.length; i++) {
            const slot = SLOT_NAMES[i];
            const id = unit.slots[slot];
            slots[slot] = id || null;
            if (id) held[String(id)] = serialize(state.items.get(id));
        }
        let haul = null;
        if (unit.haul && !held[String(unit.haul)]) haul = serialize(state.items.get(unit.haul));
        return {
            id: unit.id, str: unit.str, race: unit.race, sex: unit.sex,
            tileX: unit.tileX, tileY: unit.tileY, layer: unit.layer,
            armorState: unit.armorState,
            slotByArmor: Object.assign({}, unit.slotByArmor),
            slots: slots, held: held, haul: haul
        };
    }

    function saveChanges() {
        const out = {
            v: 1,
            seed: state.seed,
            manifests: [],
            items: [],
            units: [],
            tombstones: state.tombstones.slice(),
            deposits: state.depositsDirty ? state.deposits.map(function (d) {
                return { cls: d.cls, form: d.form, amount: d.amount, tileX: d.tileX, tileY: d.tileY, layer: d.layer };
            }) : null
        };
        const chunkKeys = Array.from(state.manifests.keys()).sort();
        for (let i = 0; i < chunkKeys.length; i++) {
            const chunk = state.manifests.get(chunkKeys[i]);
            if (chunk.rev <= chunk.savedRev) continue;
            out.manifests.push(serializeChunk(chunk));
            chunk.savedRev = chunk.rev;
        }
        const ids = Array.from(state.items.keys()).sort(function (a, b) { return a - b; });
        for (let i = 0; i < ids.length; i++) {
            const item = state.items.get(ids[i]);
            if (item.seedKey) continue;
            if (item.parentId) continue;
            if (item.heldBy) continue;
            if (item.rev <= item.savedRev) continue; // SAVE_DIRTY_ONLY
            out.items.push(serialize(item)); // SAVE_EMIT
            item.savedRev = item.rev;
        }
        const unitIds = Array.from(state.units.keys()).sort();
        for (let i = 0; i < unitIds.length; i++) {
            const unit = state.units.get(unitIds[i]);
            if (unit.rev <= unit.savedRev) continue;
            out.units.push(serializeUnit(unit));
            unit.savedRev = unit.rev;
        }
        state.tombstones = [];
        state.depositsDirty = false;
        return out;
    }

    function restoreTree(snap, parentId, heldBy) {
        const def = catalog.item(snap.typeId);
        if (!def) fail("E_TYPE", "save names unknown item " + snap.typeId);
        let item = state.items.get(snap.id);
        if (!item) {
            item = makeItem(def, { id: snap.id, massPosted: true });
            state.items.set(item.id, item);
        }
        item.parentId = parentId;
        item.heldBy = heldBy || null;
        item.hauledBy = null;
        item.haulAnim = null;
        applyCell(item, snap.tileX, snap.tileY, snap.cellX, snap.cellY, snap.layer);
        item.heightQuarters = snap.heightQuarters || 0;
        item.surfaceId = snap.surfaceId || null;
        item.interiorX = snap.interiorX || 0;
        item.interiorY = snap.interiorY || 0;
        item.ownerId = snap.ownerId || null;
        item.theft = !!snap.theft;
        item.stolenFrom = snap.stolenFrom || null;
        if (snap.condition != null) item.condition = snap.condition;
        item.facing = snap.facing || "D";
        item.slotId = snap.slotId || item.slotId;
        item.broken = !!snap.broken;
        item.shop = !!snap.shop;
        item.lock = snap.lock ? { locked: !!snap.lock.locked, dc: snap.lock.dc | 0, keyId: snap.lock.keyId || null } : null;
        item.trap = snap.trap ? { dc: snap.trap.dc | 0, damage: snap.trap.damage || "1d6", disarmed: !!snap.trap.disarmed, triggered: !!snap.trap.triggered } : null;
        if (snap.ledgerClass) item.ledgerClass = snap.ledgerClass;
        if (snap.ledgerForm) item.ledgerForm = snap.ledgerForm;
        if (snap.massMu != null) item.massMu = snap.massMu;
        if (snap.loadLimitOz != null) item.loadLimitOz = snap.loadLimitOz;
        if (snap.collapseOz != null) item.collapseOz = snap.collapseOz;
        if (snap.capOz !== undefined) item.capOz = snap.capOz;
        if (snap.capCuIn !== undefined) item.capCuIn = snap.capCuIn;
        item.massPosted = true;
        item.seedKey = null;
        item.rev = 0;
        item.savedRev = 0;
        item.contents = [];
        const nested = snap.contents || [];
        for (let i = 0; i < nested.length; i++) {
            const child = restoreTree(nested[i], item.id, null);
            item.contents.push(child.id);
        }
        if (item.broken) item.kind = "item";
        return item;
    }

    function restoreUnit(snap) {
        let unit = state.units.get(snap.id);
        if (!unit) addUnit(snap);
        unit = state.units.get(snap.id);
        unit.str = snap.str | 0;
        unit.race = snap.race;
        unit.sex = snap.sex;
        unit.tileX = snap.tileX | 0;
        unit.tileY = snap.tileY | 0;
        unit.layer = snap.layer | 0;
        unit.armorState = snap.armorState;
        unit.slotByArmor = Object.assign({}, snap.slotByArmor || {});
        for (let i = 0; i < SLOT_NAMES.length; i++) unit.slots[SLOT_NAMES[i]] = null;
        unit.haul = null;
        const held = snap.held || {};
        const heldIds = Object.keys(held);
        for (let i = 0; i < heldIds.length; i++) {
            const child = restoreTree(held[heldIds[i]], null, unit.id);
            child.heldBy = unit.id;
        }
        const slotNames = Object.keys(snap.slots || {});
        for (let i = 0; i < slotNames.length; i++) unit.slots[slotNames[i]] = snap.slots[slotNames[i]];
        if (snap.haul) {
            const hauled = restoreTree(snap.haul, null, unit.id);
            hauled.heldBy = unit.id;
            hauled.hauledBy = unit.id;
            hauled.haulAnim = C.CARRY_ANIM;
            unit.haul = hauled.id;
        }
        unit.rev = 0;
        unit.savedRev = 0;
    }

    function applyManifest(snap) {
        const key = snap.cx + "," + snap.cy + "," + snap.layer;
        let chunk = state.manifests.get(key);
        if (!chunk) {
            chunk = blankChunk(snap.cx, snap.cy, snap.layer);
            state.manifests.set(key, chunk);
        }
        if (chunk.expanded) collapseChunk(snap.cx, snap.cy, snap.layer);
        chunk.counts = Object.assign({}, snap.counts || {});
        chunk.removed = new Set(snap.removed || []);
        chunk.moved = new Map();
        const moved = snap.moved || [];
        for (let i = 0; i < moved.length; i++) {
            const row = moved[i];
            chunk.moved.set(row.key, { tileX: row.tileX, tileY: row.tileY, cellX: row.cellX, cellY: row.cellY });
        }
        chunk.rev = 0;
        chunk.savedRev = 0;
    }

    function loadChanges(blob) {
        if (!blob || blob.v !== 1) fail("E_SAVE", "unreadable save");
        if (blob.seed !== state.seed) fail("E_SEED", "save seed does not match this world");
        const tombs = blob.tombstones || [];
        for (let i = 0; i < tombs.length; i++) {
            const item = state.items.get(tombs[i]);
            if (item) erase(item, true);
        }
        const mans = blob.manifests || [];
        for (let i = 0; i < mans.length; i++) applyManifest(mans[i]);
        const list = blob.items || [];
        for (let i = 0; i < list.length; i++) restoreTree(list[i], null, null);
        const units = blob.units || [];
        for (let i = 0; i < units.length; i++) restoreUnit(units[i]);
        if (blob.deposits) {
            state.deposits = blob.deposits.map(function (d) {
                return { cls: d.cls, form: d.form, amount: d.amount, tileX: d.tileX, tileY: d.tileY, layer: d.layer };
            });
            state.depositsDirty = false;
        }
        reindexAll();
        return { items: list.length, manifests: mans.length };
    }

    function manifestUsed(chunk) {
        const types = Object.keys(chunk.counts);
        for (let i = 0; i < types.length; i++) if (chunk.counts[types[i]] > 0) return true;
        return chunk.removed.size > 0 || chunk.moved.size > 0;
    }

    function placedCount() {
        let n = 0;
        for (const chunk of state.manifests.values()) {
            const types = Object.keys(chunk.counts);
            for (let i = 0; i < types.length; i++) n += chunk.counts[types[i]];
            n -= chunk.removed.size;
        }
        for (const item of state.items.values()) {
            if (item.seedKey) continue;
            n += 1;
        }
        return n;
    }

    function budgetCount() {
        let n = 0;
        for (const chunk of state.manifests.values()) if (manifestUsed(chunk)) n += 1;
        for (const item of state.items.values()) {
            if (item.seedKey) continue;
            if (item.parentId) continue; // BUDGET_NEST
            if (item.heldBy) continue;
            n += 1;
        }
        return n;
    }

    function memoryBytes() {
        let bytes = 256;
        bytes += state.manifests.size * 96;
        for (const chunk of state.manifests.values()) {
            bytes += Object.keys(chunk.counts).length * 32;
            bytes += chunk.removed.size * 24;
            bytes += chunk.moved.size * 32;
        }
        bytes += state.items.size * 320;
        bytes += state.deposits.length * 40;
        bytes += state.units.size * 160;
        bytes += state.spatial.size * 32;
        return bytes;
    }

    function ledgerRecount() {
        return bridge.recount(Array.from(state.items.values()), state.deposits);
    }

    function setFacing(id, facing) {
        if (C.FACINGS.indexOf(facing) < 0) fail("E_FACING", "facing must be D, U, L or R");
        const item = must(id);
        item.facing = facing;
        item.closedSlotId = geom.withFacing(item.closedSlotId || item.slotId, facing);
        if (item.openSlotId) item.openSlotId = geom.withFacing(item.openSlotId, facing);
        item.slotId = item.opened && item.openSlotId ? item.openSlotId : item.closedSlotId;
        touch(item);
        return item.slotId;
    }

    return Object.freeze({
        seed: state.seed,
        constants: C,
        snapPx: geom.snapPx,
        frameStep: pathing.frameStep,
        place: place,
        get: function (id) { return copyItem(must(id)); },
        move: move,
        drag: move,
        putIn: putIn,
        dragPreview: function (xPx, yPx) {
            return { xPx: geom.snapPx(xPx), yPx: geom.snapPx(yPx), cellPx: C.CELL_PX };
        },
        destroyContainer: destroyContainer,
        setLock: setLock,
        setTrap: setTrap,
        tryUnlock: tryUnlock,
        tryDisarm: tryDisarm,
        doubleClick: doubleClick,
        moveWindow: moveWindow,
        closeWindow: closeWindow,
        windows: windows,
        interiorDraw: interiorDraw,
        drawList: drawList,
        pick: pick,
        hover: hover,
        setZoomHold: setZoomHold,
        zoom: function () { return state.zoom; },
        addUnit: addUnit,
        equip: equip,
        unequip: unequip,
        mapSprite: mapSprite,
        beginHaul: beginHaul,
        steal: steal,
        setBlocked: function (x, y, layer, blocked) {
            const key = (x | 0) + "," + (y | 0) + "," + (layer | 0);
            if (blocked === false) state.terrain.delete(key);
            else state.terrain.add(key);
        },
        setBounds: function (b) { state.bounds = { x0: b.x0 | 0, y0: b.y0 | 0, x1: b.x1 | 0, y1: b.y1 | 0 }; },
        setBlockProvider: function (fn) { state.blockProvider = fn; },
        findPath: findPath,
        tileBlocked: function (x, y, layer) { return isBlockedTile(x | 0, y | 0, layer | 0); },
        addManifest: addManifest,
        expandChunk: expandChunk,
        collapseChunk: collapseChunk,
        chunkPositions: chunkPositions,
        setViewer: setViewer,
        addGlow: function (g) {
            state.glows.push({
                tileX: g.tileX | 0, tileY: g.tileY | 0, layer: g.layer | 0,
                brightTiles: g.brightTiles != null ? g.brightTiles : C.TORCH_BRIGHT_TILES,
                dimTiles: g.dimTiles != null ? g.dimTiles : C.TORCH_DIM_TILES
            });
        },
        setFacing: setFacing,
        tick: tick,
        cleanup: cleanup,
        saveChanges: saveChanges,
        loadChanges: loadChanges,
        ledgerRecount: ledgerRecount,
        placedCount: placedCount,
        budgetCount: budgetCount,
        memoryBytes: memoryBytes,
        carriedOz: function (unitId) { return carriedOz(mustUnit(unitId)); },
        carryCapOz: function (unitId) { return carryCapOz(mustUnit(unitId)); },
        totalOz: function (id) { return totalOz(must(id).id); },
        loadOz: loadOz,
        ticks: function () { return state.ticks; }
    });
}

module.exports = { createWorld };
