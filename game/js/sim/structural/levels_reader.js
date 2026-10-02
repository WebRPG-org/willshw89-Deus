"use strict";

/**
 * game/js/sim/structural/levels_reader.js
 *
 * Block reader for a fall check (NAT.02.01 part 3). Geometry comes from the
 * injected levels, objects and isKnown. This module does not name engine globals.
 *
 * A block is one stratum (x, y, g), g = 5 * (z + 16) + s. Solid is stone, soil
 * or wood with HP above 0, constructed or not. Air, water and lava are not solid.
 * Wall and door objects are solid from the first open stratum above the cell's
 * stacked floor through S4. With anchors set, those object voxels are anchors.
 * A solid on the lowest stratum of the injected world range is an anchor.
 * Neighbours, in order: down, north, east, south, west, up. Area edges wrap.
 * An unknown area or level is neither air nor an anchor. Reads never write.
 */

const { STRATA_PER_LAYER, gOf, zOfG, sOfG } = require("./reader.js");

const STRATA = STRATA_PER_LAYER;
const MATERIAL_KEYS = Object.freeze(["air", "stone", "soil", "wood", "water", "lava"]);
const M_BUILT = 0x80;
const M_ID = 0x3f;

// Tests replace these constants. The values here are the fall rules.
const UNKNOWN_IS_UNKNOWN = true;
const WRAP_EDGES = true;
const OBJECT_VOXELS = true;
const FLOOR_IS_ANCHOR = true;

const NEIGHBOURS = Object.freeze([
    Object.freeze({ name: "down", dx: 0, dy: 0, dg: -1 }),
    Object.freeze({ name: "north", dx: 0, dy: -1, dg: 0 }),
    Object.freeze({ name: "east", dx: 1, dy: 0, dg: 0 }),
    Object.freeze({ name: "south", dx: 0, dy: 1, dg: 0 }),
    Object.freeze({ name: "west", dx: -1, dy: 0, dg: 0 }),
    Object.freeze({ name: "up", dx: 0, dy: 0, dg: 1 })
]);

const AIR_BLOCK = Object.freeze({
    state: "air", solid: false, material: null, byte: 0, hp: 0,
    constructed: false, anchor: false, source: null, objectId: null
});
const UNKNOWN_BLOCK = Object.freeze({
    state: "unknown", solid: false, material: null, byte: 0, hp: 0,
    constructed: false, anchor: false, source: null, objectId: null
});

function fail(msg) {
    throw new TypeError("structural/levels_reader: " + msg);
}

function isSolidByte(byte, hp) {
    const id = byte & M_ID;
    return id >= 1 && id <= 3 && (hp | 0) > 0;
}

function materialKey(byte) {
    return MATERIAL_KEYS[byte & M_ID] || null;
}

function byteAt(st, s) {
    if (st.bytes && st.bytes.length === STRATA) return st.bytes[s] | 0;
    const key = st.materials && st.materials[s];
    const id = key === "stone" ? 1 : key === "soil" ? 2 : key === "wood" ? 3 : key === "water" ? 4 : key === "lava" ? 5 : 0;
    let byte = id;
    if (id && st.constructed && st.constructed[s]) byte |= M_BUILT;
    return byte;
}

function hpAt(st, s, byte) {
    if (st.hp && st.hp.length === STRATA) return st.hp[s] | 0;
    return isSolidByte(byte, 1) ? 255 : 0;
}

function structuralType(type) {
    if (!type) return false;
    const tags = type.tags;
    return Array.isArray(tags) && (tags.indexOf("wall") >= 0 || tags.indexOf("door") >= 0);
}

function createLevelsReader(spec) {
    spec = spec || {};
    const levels = spec.levels;
    const objects = spec.objects || null;
    const isKnown = spec.isKnown || null;
    const world = spec.world;
    if (!levels || typeof levels.strataAt !== "function") fail("levels.strataAt is required");
    if (!world || !Number.isInteger(world.size) || world.size <= 0) fail("world.size is required");
    if (!Number.isInteger(world.zMin) || !Number.isInteger(world.zMax) || world.zMin > world.zMax) fail("world.zMin..zMax is required");
    const size = world.size;
    const areasX = world.areasX === undefined ? 1 : world.areasX;
    const areasY = world.areasY === undefined ? 1 : world.areasY;
    if (!Number.isInteger(areasX) || areasX <= 0 || !Number.isInteger(areasY) || areasY <= 0) fail("world.areasX and areasY must be positive integers");
    const zMin = world.zMin;
    const zMax = world.zMax;
    const objectAnchors = spec.anchors === true;
    const pinned = typeof spec.pinned === "function" ? spec.pinned : null;
    const useCache = spec.cache !== false;
    const cache = new Map();
    const objectCache = new Map();

    function knownAt(ax, ay, z) {
        if (typeof isKnown !== "function") return true;
        const v = isKnown(ax, ay, z);
        if (v && typeof v === "object") return v.known !== false && v.unknown !== true;
        return !!v;
    }

    function wrap(ax, ay, x, y) {
        if (!WRAP_EDGES) {
            if (x < 0 || y < 0 || x >= size || y >= size) return null;
            const axx = ((ax % areasX) + areasX) % areasX;
            const ayy = ((ay % areasY) + areasY) % areasY;
            return { ax: axx, ay: ayy, x: x, y: y };
        }
        let nx = x, ny = y, nax = ax, nay = ay;
        while (nx < 0) { nx += size; nax--; }
        while (nx >= size) { nx -= size; nax++; }
        while (ny < 0) { ny += size; nay--; }
        while (ny >= size) { ny -= size; nay++; }
        nax = ((nax % areasX) + areasX) % areasX;
        nay = ((nay % areasY) + areasY) % areasY;
        return { ax: nax, ay: nay, x: nx, y: ny };
    }

    function strataOf(ax, ay, x, y, z) {
        const key = ax + "," + ay + "," + x + "," + y + "," + z;
        if (useCache && cache.has(key)) return cache.get(key);
        const st = levels.strataAt({ area: { x: ax, y: ay }, x: x, y: y, z: z }) || null;
        if (useCache) cache.set(key, st);
        return st;
    }

    function objectOf(ax, ay, x, y, z) {
        if (!OBJECT_VOXELS || !objects || typeof objects.atIn !== "function") return null;
        const key = ax + "," + ay + "," + x + "," + y + "," + z;
        if (useCache && objectCache.has(key)) return objectCache.get(key);
        const type = objects.atIn({ x: ax, y: ay, z: z }, x, y) || null;
        const hit = structuralType(type) ? type : null;
        if (useCache) objectCache.set(key, hit);
        return hit;
    }

    function classify(ax, ay, x, y, z) {
        if (!Number.isInteger(z) || z < zMin || z > zMax) return { kind: "outside" };
        if (!knownAt(ax, ay, z)) return UNKNOWN_IS_UNKNOWN ? { kind: "unknown" } : { kind: "outside" };
        const st = strataOf(ax, ay, x, y, z);
        if (!st) return UNKNOWN_IS_UNKNOWN ? { kind: "unknown" } : { kind: "outside" };
        let fill = 0;
        const bytes = new Array(STRATA);
        const hp = new Array(STRATA);
        for (let s = 0; s < STRATA; s++) {
            const byte = byteAt(st, s);
            const h = hpAt(st, s, byte);
            bytes[s] = byte;
            hp[s] = h;
            if (fill === s && isSolidByte(byte, h)) fill = s + 1;
        }
        if (typeof st.fill === "number") fill = st.fill | 0;
        return {
            kind: "cell",
            bytes: bytes,
            hp: hp,
            fill: fill,
            connector: st.connector || null,
            object: objectOf(ax, ay, x, y, z)
        };
    }

    function blockFrom(ax, ay, x, y, z, s, cell) {
        if (!cell || cell.kind === "outside") return AIR_BLOCK;
        if (cell.kind === "unknown") return UNKNOWN_BLOCK;
        const byte = cell.bytes[s];
        const hp = cell.hp[s];
        const stratumSolid = isSolidByte(byte, hp);
        const covered = cell.object && s >= cell.fill && s < STRATA;
        if (!stratumSolid && !covered) return AIR_BLOCK;
        const fromObject = !stratumSolid && covered;
        const constructed = fromObject ? true : (byte & M_BUILT) !== 0;
        // The lowest stratum of the world range is an anchor, including a wall that
        // occupies it. The anchors switch makes every wall and door voxel an anchor.
        const anchor = (FLOOR_IS_ANCHOR && z === zMin && s === 0 && (stratumSolid || fromObject))
            || (objectAnchors && fromObject)
            || (pinned ? !!pinned(ax, ay, x, y, gOf(z, s)) : false);
        return {
            state: "solid",
            solid: true,
            material: fromObject ? (cell.object.material || null) : materialKey(byte),
            byte: fromObject ? 0 : byte,
            hp: fromObject ? 1 : hp,
            constructed: constructed,
            anchor: !!anchor,
            source: fromObject ? "object" : "stratum",
            objectId: fromObject ? (cell.object.id || null) : null
        };
    }

    function resolve(ax, ay, x, y) {
        if (!Number.isInteger(ax) || !Number.isInteger(ay) || !Number.isInteger(x) || !Number.isInteger(y)) {
            fail("coordinates must be integers");
        }
        return wrap(ax, ay, x, y);
    }

    function cell(ax, ay, x, y, z) {
        const w = resolve(ax, ay, x, y);
        if (!w) return { known: false, strata: null, fill: 0, connector: null };
        if (!Number.isInteger(z)) fail("z must be an integer");
        const got = classify(w.ax, w.ay, w.x, w.y, z);
        if (got.kind === "unknown") return { known: false, ax: w.ax, ay: w.ay, x: w.x, y: w.y, z: z, strata: null, fill: 0, connector: null };
        const strata = new Array(STRATA);
        for (let s = 0; s < STRATA; s++) strata[s] = blockFrom(w.ax, w.ay, w.x, w.y, z, s, got.kind === "cell" ? got : { kind: "outside" });
        return {
            known: true,
            ax: w.ax, ay: w.ay, x: w.x, y: w.y, z: z,
            strata: strata,
            fill: got.kind === "cell" ? got.fill : 0,
            connector: got.kind === "cell" ? got.connector : null
        };
    }

    function block(ax, ay, x, y, g) {
        if (!Number.isInteger(g)) fail("g must be an integer");
        const z = zOfG(g), s = sOfG(g);
        const w = resolve(ax, ay, x, y);
        if (!w) return UNKNOWN_IS_UNKNOWN ? UNKNOWN_BLOCK : AIR_BLOCK;
        if (z < zMin || z > zMax) return AIR_BLOCK;
        const got = classify(w.ax, w.ay, w.x, w.y, z);
        return blockFrom(w.ax, w.ay, w.x, w.y, z, s, got);
    }

    function neighbours(ax, ay, x, y, g) {
        if (!Number.isInteger(g)) fail("g must be an integer");
        const out = new Array(NEIGHBOURS.length);
        for (let i = 0; i < NEIGHBOURS.length; i++) {
            const d = NEIGHBOURS[i];
            const moved = wrap(ax, ay, x + d.dx, y + d.dy);
            if (!moved) out[i] = { name: d.name, ax: ax, ay: ay, x: x + d.dx, y: y + d.dy, g: g + d.dg, outside: true };
            else out[i] = { name: d.name, ax: moved.ax, ay: moved.ay, x: moved.x, y: moved.y, g: g + d.dg, outside: false };
        }
        return out;
    }

    // Solid bits of the five strata, objects not included. null when the cell is unknown.
    function stratumMask(ax, ay, x, y, z) {
        const w = resolve(ax, ay, x, y);
        if (!w) return null;
        if (!Number.isInteger(z) || z < zMin || z > zMax) return { solid: 0, natural: 0 };
        if (!knownAt(w.ax, w.ay, z)) return null;
        const st = strataOf(w.ax, w.ay, w.x, w.y, z);
        if (!st) return null;
        let solid = 0, natural = 0;
        for (let s = 0; s < STRATA; s++) {
            const byte = byteAt(st, s);
            const hp = hpAt(st, s, byte);
            if (!isSolidByte(byte, hp)) continue;
            solid |= 1 << s;
            if ((byte & M_BUILT) === 0) natural |= 1 << s;
        }
        return { solid: solid, natural: natural };
    }

    return {
        bounds: Object.freeze({ size: size, areasX: areasX, areasY: areasY, zMin: zMin, zMax: zMax }),
        anchors: objectAnchors,
        block: block,
        cell: cell,
        neighbours: neighbours,
        stratumMask: stratumMask,
        clearCache() { cache.clear(); objectCache.clear(); }
    };
}

module.exports = {
    STRATA: STRATA,
    MATERIAL_KEYS: MATERIAL_KEYS,
    NEIGHBOURS: NEIGHBOURS,
    gOf: gOf,
    zOfG: zOfG,
    sOfG: sOfG,
    isSolidByte: isSolidByte,
    materialKey: materialKey,
    createLevelsReader: createLevelsReader
};
