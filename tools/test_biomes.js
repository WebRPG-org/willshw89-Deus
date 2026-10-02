"use strict";

// Headless checks for biome jitter and fractional IDW ecology.
// Usage: node tools/test_biomes.js

const biomes = require("../game/js/sim/worldgen/DEUS_Biomes.js");

let passed = 0;
let failed = 0;

function check(name, cond, detail) {
    if (cond) {
        passed++;
        console.log("PASS " + name + (detail ? " - " + detail : ""));
    } else {
        failed++;
        console.log("FAIL " + name + (detail ? " - " + detail : ""));
    }
}

function near(a, b, eps) {
    return Math.abs(a - b) <= eps;
}

// Midpoint of two centroids. Equal distance to both, so a true border.
function midpoint(a, b) {
    return {
        temperature: (a.temperature + b.temperature) / 2,
        rainfall: (a.rainfall + b.rainfall) / 2,
        drainage: (a.drainage + b.drainage) / 2
    };
}

try {
    // --- spatial jitter -------------------------------------------------------
    const gx = 40;
    const gy = 25;
    const jx = biomes.jitter_x(gx, gy);
    const jy = biomes.jitter_y(gx, gy);
    check("jitter_x_deterministic", biomes.jitter_x(gx, gy) === jx && biomes.jitter_y(gx, gy) === jy);
    check("jitter_bounded", jx >= -1 && jx < 1 && jy >= -1 && jy < 1, "jx " + jx + " jy " + jy);

    let jitterSpread = 0;
    let jxMin = Infinity;
    let jxMax = -Infinity;
    for (let y = 0; y < 48; y += 3) {
        for (let x = 0; x < 48; x += 3) {
            const v = biomes.jitter_x(x, y);
            if (v < jxMin) jxMin = v;
            if (v > jxMax) jxMax = v;
        }
    }
    jitterSpread = jxMax - jxMin;
    check("jitter_varies_across_space", jitterSpread > 0.4, "spread " + jitterSpread);

    const sample = biomes.jitteredSample(gx, gy);
    const expectX = gx + biomes.jitter_x(gx, gy) * 3.0;
    const expectY = gy + biomes.jitter_y(gx, gy) * 3.0;
    check("noise_sampled_at_jitter_times_3",
        sample.x === expectX && sample.y === expectY,
        "sample (" + sample.x + ", " + sample.y + ") expected (" + expectX + ", " + expectY + ")");
    check("jitter_offset_within_3_cells",
        Math.abs(sample.x - gx) <= 3 && Math.abs(sample.y - gy) <= 3);

    const seed = 20261002;
    const atCell = biomes.climateAt(seed, gx, gy);
    const atSample = biomes.sampleClimate(seed, sample.x, sample.y);
    check("climate_matches_noise_at_jittered_coordinate",
        atCell.temperature === atSample.temperature
        && atCell.rainfall === atSample.rainfall
        && atCell.drainage === atSample.drainage);

    let warped = false;
    for (let y = 0; y < 32 && !warped; y++) {
        for (let x = 0; x < 32 && !warped; x++) {
            const shifted = biomes.climateAt(seed, x, y);
            const raw = biomes.sampleClimate(seed, x, y);
            if (shifted.temperature !== raw.temperature
                || shifted.rainfall !== raw.rainfall
                || shifted.drainage !== raw.drainage) {
                warped = true;
            }
        }
    }
    check("jitter_changes_climate_sample", warped);

    const again = biomes.climateAt(seed, gx, gy);
    check("climate_deterministic",
        again.temperature === atCell.temperature
        && again.rainfall === atCell.rainfall
        && again.drainage === atCell.drainage);

    // --- IDW top 2, and fractionality of a border cell -----------------------
    const table = biomes.BIOMES;
    let border = null;
    const rejected = [];
    for (let i = 0; i < table.length && !border; i++) {
        for (let j = i + 1; j < table.length && !border; j++) {
            const climate = midpoint(table[i], table[j]);
            const blend = biomes.idwTop2(climate);
            const got = [blend.primary.id, blend.secondary.id].sort();
            const want = [table[i].id, table[j].id].sort();
            const owns = got[0] === want[0] && got[1] === want[1];
            const even = near(blend.primary.weight, 0.5, 1e-9) && near(blend.secondary.weight, 0.5, 1e-9);
            const sums = near(blend.primary.weight + blend.secondary.weight, 1, 1e-12);
            if (owns && even && sums && blend.fractional) {
                border = { climate, blend, pair: want.join("/") };
            } else {
                rejected.push(want.join("/") + " -> " + blend.primary.id + " " + blend.primary.weight.toFixed(3)
                    + " / " + blend.secondary.id + " " + blend.secondary.weight.toFixed(3));
            }
        }
    }
    check("border_cell_fractional", !!border,
        border
            ? border.pair + " weights " + border.blend.primary.weight + " / " + border.blend.secondary.weight
            : rejected.join("; "));

    if (border) {
        check("border_weights_sum_to_one",
            near(border.blend.primary.weight + border.blend.secondary.weight, 1, 1e-12));
        check("border_both_biomes_present",
            border.blend.primary.weight > biomes.BORDER_WEIGHT
            && border.blend.secondary.weight >= biomes.BORDER_WEIGHT
            && border.blend.primary.id !== border.blend.secondary.id);
        // Same cell asked twice is the same blend.
        const repeat = biomes.idwTop2(border.climate);
        check("border_cell_stable",
            repeat.primary.id === border.blend.primary.id
            && repeat.secondary.id === border.blend.secondary.id
            && repeat.primary.weight === border.blend.primary.weight
            && repeat.fractional === true);
    }

    // A cell sitting on a centroid is one biome. That is what makes the border fractional by contrast.
    const cold = table.find(b => b.id === "COLD");
    const pure = biomes.idwTop2({
        temperature: cold.temperature,
        rainfall: cold.rainfall,
        drainage: cold.drainage
    });
    check("centroid_cell_is_one_biome",
        pure.primary.id === "COLD" && pure.primary.weight === 1 && pure.secondary.weight === 0 && pure.fractional === false,
        pure.primary.id + " " + pure.primary.weight + " / " + pure.secondary.id + " " + pure.secondary.weight);

    // Inverse-distance power 2, not a linear lerp. One quarter of the way from A to B:
    // distance ratio 1:3, raw weights 1 and 1/9, blend 0.9 / 0.1.
    const pair = [
        { id: "TEMPERATE", temperature: 0.2, rainfall: 0.2, drainage: 0.2 },
        { id: "WET", temperature: 0.8, rainfall: 0.8, drainage: 0.8 }
    ];
    const quarter = {
        temperature: 0.2 + 0.6 * 0.25,
        rainfall: 0.2 + 0.6 * 0.25,
        drainage: 0.2 + 0.6 * 0.25
    };
    const weighted = biomes.idwTop2(quarter, pair);
    check("idw_power_two",
        weighted.primary.id === "TEMPERATE"
        && weighted.secondary.id === "WET"
        && near(weighted.primary.weight, 0.9, 1e-9)
        && near(weighted.secondary.weight, 0.1, 1e-9),
        weighted.primary.id + " " + weighted.primary.weight + " / " + weighted.secondary.id + " " + weighted.secondary.weight);

    // The world-cell path uses the jittered climate, then the same blend.
    const eco = biomes.ecologyAt(seed, gx, gy);
    const fromClimate = biomes.idwTop2(atCell);
    check("ecology_uses_jittered_climate",
        eco.sampleX === sample.x
        && eco.sampleY === sample.y
        && eco.primary.id === fromClimate.primary.id
        && eco.secondary.id === fromClimate.secondary.id
        && eco.primary.weight === fromClimate.primary.weight
        && eco.secondary.weight === fromClimate.secondary.weight
        && eco.fractional === fromClimate.fractional);

    let threw = false;
    try {
        biomes.idwTop2({ temperature: 0.5, rainfall: 0.5, drainage: NaN });
    } catch (err) {
        threw = err instanceof TypeError;
    }
    check("rejects_non_finite_climate", threw);
} catch (err) {
    failed++;
    console.log("FAIL harness - " + (err && err.stack ? err.stack : err));
}

console.log("RESULT: " + passed + " passed, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
