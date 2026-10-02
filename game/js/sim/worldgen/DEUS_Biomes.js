"use strict";

// Biome jitter and fractional ecology (WG.BIOMES.03).
//
// Climate noise is sampled at a Minecraft-style shifted coordinate
//   gx + jitter_x(gx, gy) * 3.0
//   gy + jitter_y(gx, gy) * 3.0
// so a biome border is not a straight run of the cell grid. jitter_x and
// jitter_y are a fixed spatial warp in [-1, 1); the world seed still drives
// the climate noise itself.
//
// A cell's ecology is the inverse-distance blend (power 2) of the two nearest
// DEC-030 biome centroids in continuous (temperature, rainfall, drainage).
// The two weights sum to 1. A border cell keeps a real share of both; a cell
// on a centroid is that one biome.
//
// DEC-007: no art.

const JITTER_SCALE = 32;
const IDW_POWER = 2;
// Runner-up share at or above this is a border blend, not a single biome.
const BORDER_WEIGHT = 0.2;

const SALT = Object.freeze({
    jitterX: 0xB107,
    jitterY: 0xB108,
    temperature: 0x3e3f,
    rainfall: 0x2a1f,
    drainage: 0x4d4a
});

// Wavelengths match the surface climate scales in the world catalog.
const SCALE = Object.freeze({
    temperature: 190,
    rainfall: 130,
    drainage: 90
});

// Homes in parameter space. Spread on temperature and rainfall, with drainage
// separating volcanic ash from arid ground and wet ground from temperate ground.
const BIOMES = Object.freeze([
    Object.freeze({ id: "COLD", temperature: 0.18, rainfall: 0.42, drainage: 0.58 }),
    Object.freeze({ id: "TEMPERATE", temperature: 0.52, rainfall: 0.50, drainage: 0.62 }),
    Object.freeze({ id: "WET", temperature: 0.48, rainfall: 0.86, drainage: 0.16 }),
    Object.freeze({ id: "ARID", temperature: 0.84, rainfall: 0.14, drainage: 0.78 }),
    Object.freeze({ id: "VOLCANIC", temperature: 0.90, rainfall: 0.30, drainage: 0.18 }),
    Object.freeze({ id: "WILD", temperature: 0.34, rainfall: 0.68, drainage: 0.36 })
]);

const FNV_OFFSET = 2166136261 >>> 0;

function fnv(h, part) {
    let v = part >>> 0;
    for (let i = 0; i < 4; i++) {
        h ^= v & 255;
        h = Math.imul(h, 16777619) >>> 0;
        v >>>= 8;
    }
    return h;
}

function mix(h) {
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d) >>> 0;
    return (h ^ (h >>> 12)) >>> 0;
}

function hash32(a, b, c, d) {
    return mix(fnv(fnv(fnv(fnv(FNV_OFFSET, a), b), c), d));
}

function unit(seed, salt, ix, iy) {
    return hash32(seed, salt, ix, iy) / 4294967296;
}

function smooth(t) {
    return t * t * (3 - 2 * t);
}

function finite(name, value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new TypeError(name + " must be a finite number");
    }
}

function valueNoise(seed, salt, x, y, scale) {
    const fx = x / scale;
    const fy = y / scale;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = smooth(fx - ix);
    const ty = smooth(fy - iy);
    const a = unit(seed, salt, ix, iy);
    const b = unit(seed, salt, ix + 1, iy);
    const c = unit(seed, salt, ix, iy + 1);
    const d = unit(seed, salt, ix + 1, iy + 1);
    const top = a + (b - a) * tx;
    const bottom = c + (d - c) * tx;
    return top + (bottom - top) * ty;
}

// Spatial warp at this cell, in [-1, 1). Seedless: the same warp in every world.
function jitter_x(gx, gy) {
    finite("gx", gx);
    finite("gy", gy);
    return valueNoise(0, SALT.jitterX, gx, gy, JITTER_SCALE) * 2 - 1;
}

function jitter_y(gx, gy) {
    finite("gx", gx);
    finite("gy", gy);
    return valueNoise(0, SALT.jitterY, gx, gy, JITTER_SCALE) * 2 - 1;
}

// Where climate noise is evaluated for the cell (gx, gy).
function jitteredSample(gx, gy) {
    return {
        x: gx + jitter_x(gx, gy) * 3.0,
        y: gy + jitter_y(gx, gy) * 3.0
    };
}

function sampleClimate(seed, x, y) {
    finite("seed", seed);
    finite("x", x);
    finite("y", y);
    return {
        temperature: valueNoise(seed, SALT.temperature, x, y, SCALE.temperature),
        rainfall: valueNoise(seed, SALT.rainfall, x, y, SCALE.rainfall),
        drainage: valueNoise(seed, SALT.drainage, x, y, SCALE.drainage)
    };
}

// Climate of one cell: noise at the jittered sample, not at the cell centre.
function climateAt(seed, gx, gy) {
    const sample = jitteredSample(gx, gy);
    return sampleClimate(seed, sample.x, sample.y);
}

function readClimate(climate) {
    if (!climate || typeof climate !== "object") {
        throw new TypeError("climate must be an object with temperature, rainfall and drainage");
    }
    const temperature = climate.temperature;
    const rainfall = climate.rainfall;
    const drainage = climate.drainage;
    finite("temperature", temperature);
    finite("rainfall", rainfall);
    finite("drainage", drainage);
    return { temperature, rainfall, drainage };
}

function distance3(climate, biome) {
    const dt = climate.temperature - biome.temperature;
    const dr = climate.rainfall - biome.rainfall;
    const dd = climate.drainage - biome.drainage;
    return Math.sqrt(dt * dt + dr * dr + dd * dd);
}

function centroidOf(biome, index) {
    if (!biome || typeof biome.id !== "string" || biome.id.length === 0) {
        throw new TypeError("biome " + index + " needs an id");
    }
    finite(biome.id + ".temperature", biome.temperature);
    finite(biome.id + ".rainfall", biome.rainfall);
    finite(biome.id + ".drainage", biome.drainage);
    return biome;
}

// Inverse-distance weights of the two nearest centroids. Weights sum to 1.
// An exact centroid hit assigns that biome weight 1 and the runner-up 0.
function idwTop2(climate, biomes) {
    const point = readClimate(climate);
    const table = biomes || BIOMES;
    if (!Array.isArray(table) || table.length < 2) {
        throw new TypeError("idwTop2 needs at least two biomes");
    }
    const rows = [];
    for (let i = 0; i < table.length; i++) {
        const biome = centroidOf(table[i], i);
        const distance = distance3(point, biome);
        const raw = distance === 0 ? Infinity : 1 / Math.pow(distance, IDW_POWER);
        rows.push({ id: biome.id, distance, raw });
    }
    rows.sort(function (a, b) {
        if (a.raw !== b.raw) return b.raw - a.raw;
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
    });
    const first = rows[0];
    const second = rows[1];
    let primaryWeight;
    let secondaryWeight;
    if (!Number.isFinite(first.raw)) {
        primaryWeight = 1;
        secondaryWeight = 0;
    } else {
        const sum = first.raw + second.raw;
        primaryWeight = first.raw / sum;
        secondaryWeight = second.raw / sum;
    }
    const primary = { id: first.id, weight: primaryWeight, distance: first.distance };
    const secondary = { id: second.id, weight: secondaryWeight, distance: second.distance };
    return {
        primary,
        secondary,
        fractional: secondary.weight >= BORDER_WEIGHT && primary.weight <= 1 - BORDER_WEIGHT
    };
}

// Jittered climate, then the top two biomes at that point.
function ecologyAt(seed, gx, gy) {
    const sample = jitteredSample(gx, gy);
    const climate = sampleClimate(seed, sample.x, sample.y);
    const blend = idwTop2(climate);
    return {
        gx,
        gy,
        sampleX: sample.x,
        sampleY: sample.y,
        climate,
        primary: blend.primary,
        secondary: blend.secondary,
        fractional: blend.fractional
    };
}

module.exports = {
    BIOMES,
    BORDER_WEIGHT,
    IDW_POWER,
    jitter_x,
    jitter_y,
    jitteredSample,
    sampleClimate,
    climateAt,
    idwTop2,
    ecologyAt
};
