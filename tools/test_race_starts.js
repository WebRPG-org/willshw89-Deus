#!/usr/bin/env node
"use strict";

// WG.62.02 race-start solver. Named checks print PASS ::name or FAIL ::name.
// A missing solver fails every check. --mutant=<name> patches the solver in
// memory; the targeted check must fail and the process must exit 1.

const fs = require("fs");
const path = require("path");
const Module = require("module");

const ROOT = path.join(__dirname, "..");
const SOLVER = path.join(ROOT, "game", "js", "sim", "starts", "place_starts.js");
const DATA = path.join(ROOT, "game", "data", "worldgen", "race_starts.json");

const EXPECTED = [
  { id: "dragonborn", family: "VOLCANIC", z: [-15, -11], centre: -13, map: [0, 0] },
  { id: "tiefling", family: "WILD", z: [-4, 0], centre: -2, map: [1, 0] },
  { id: "dwarf", family: "COLD", z: [-10, -5], centre: -8, map: [2, 0] },
  { id: "gnome", family: "WET", z: [-8, -4], centre: -5, map: [0, 1] },
  { id: "half-elf", family: "WET", z: [-2, 3], centre: 0, map: [1, 1] },
  { id: "half-orc", family: "ARID", z: [-1, 3], centre: 1, map: [2, 1] },
  { id: "halfling", family: "TEMPERATE", z: [2, 6], centre: 5, map: [0, 2], elevated: true },
  { id: "human", family: "TEMPERATE", z: [0, 4], centre: 3, map: [1, 2] },
  { id: "elf", family: "TEMPERATE", z: [5, 10], centre: 8, map: [2, 2], elevated: true }
];

const DEEPEST = ["dragonborn", "dwarf", "gnome", "tiefling", "half-elf", "half-orc", "human", "halfling", "elf"];

const TARGET = {
  bypass_validation: ["shift_blocked_rejected"],
  hardcode_minus13: ["reader_range_respected", "zrange_clip"],
  throw_on_low_ratio: ["low_ratio_accepts_degraded"],
  no_wrap: ["determinism"],
  no_z_weight: ["determinism"],
  shallow_first: ["order_deepest_first"],
  no_shift: ["shift_passes_bounded"]
};

const MUTANTS = {
  shallow_first: [
    "/*MUTANT shallow_first*/ copy.sort(function (a, b) { return a.centre - b.centre || cmpId(a, b); });",
    "/*MUTANT shallow_first*/ copy.sort(function (a, b) { return b.centre - a.centre || cmpId(a, b); });"
  ],
  throw_on_low_ratio: [
    '/*MUTANT throw_on_low_ratio*/ ctx.logs.push("home_band_degraded");',
    "/*MUTANT throw_on_low_ratio*/ throw infeasible(race, ctx.seed);"
  ],
  no_wrap: [
    "/*MUTANT no_wrap*/ if (d > half) d -= world; else if (d < -half) d += world;",
    "/*MUTANT no_wrap*/ d = d;"
  ],
  no_z_weight: [
    "/*MUTANT no_z_weight*/ const zTerm = (ctx.spec.zWeight * dz) * (ctx.spec.zWeight * dz);",
    "/*MUTANT no_z_weight*/ const zTerm = 0;"
  ],
  bypass_validation: [
    "/*MUTANT bypass_validation*/ if (Math.floor(x / ctx.spec.mapSize) !== race.map[0] || Math.floor(y / ctx.spec.mapSize) !== race.map[1]) return false; if (z < ctx.zMin || z > ctx.zMax) return false; if (!ctx.reader.walkableAt(x, y, z)) return false; if (ctx.reader.waterAt(x, y, z)) return false; return true;",
    "/*MUTANT bypass_validation*/ return true;"
  ],
  hardcode_minus13: [
    "/*MUTANT hardcode_minus13*/ if (z < ctx.zMin || z > ctx.zMax) z = z < ctx.zMin ? ctx.zMin : ctx.zMax;",
    "/*MUTANT hardcode_minus13*/ z = z;"
  ],
  no_shift: [
    "/*MUTANT no_shift*/ const shiftLimit = ctx.spec.shiftPasses;",
    "/*MUTANT no_shift*/ const shiftLimit = 0;"
  ]
};

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

function loadSolver(mutant) {
  if (!fs.existsSync(SOLVER)) {
    const err = new Error("missing " + SOLVER);
    err.code = "MODULE_MISSING";
    throw err;
  }
  let src = fs.readFileSync(SOLVER, "utf8");
  if (mutant) {
    const pair = MUTANTS[mutant];
    if (!pair) throw new Error("unknown mutant " + mutant);
    const count = src.split(pair[0]).length - 1;
    if (count !== 1) throw new Error("mutant anchor " + mutant + " count " + count);
    src = src.replace(pair[0], pair[1]);
  }
  const m = new Module(SOLVER);
  m.filename = SOLVER;
  m.paths = Module._nodeModulePaths(path.dirname(SOLVER));
  m._compile(src, SOLVER);
  return m.exports;
}

function readTable() {
  return JSON.parse(fs.readFileSync(DATA, "utf8"));
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}

function torusDelta(d, world) {
  const half = world / 2;
  if (d > half) d -= world;
  else if (d < -half) d += world;
  return d;
}

function dist2(a, b, world, zWeight) {
  const dx = torusDelta(b.x - a.x, world);
  const dy = torusDelta(b.y - a.y, world);
  const dz = b.z - a.z;
  const zw = zWeight * dz;
  return dx * dx + dy * dy + zw * zw;
}

function pairEnds(starts, world, zWeight) {
  let minD2 = 0;
  let maxD2 = 0;
  let first = true;
  for (let i = 0; i < starts.length; i++) {
    for (let j = i + 1; j < starts.length; j++) {
      const d = dist2(starts[i], starts[j], world, zWeight);
      if (first || d < minD2) minD2 = d;
      if (first || d > maxD2) maxD2 = d;
      first = false;
    }
  }
  return { minD2: minD2, maxD2: maxD2, ratio: maxD2 > 0 ? Math.sqrt(minD2 / maxD2) : 0 };
}

function zWeights(lo, hi, centre) {
  const span = hi - lo + 1;
  const zs = [];
  let sum = 0;
  for (let z = lo; z <= hi; z++) {
    let w = span - Math.abs(z - centre);
    if (w < 1) w = 1;
    zs.push({ z: z, w: w });
    sum += w;
  }
  return { zs: zs, sum: sum };
}

function pickZ(table, r) {
  let left = r;
  for (let i = 0; i < table.zs.length; i++) {
    left -= table.zs[i].w;
    if (left < 0) return table.zs[i].z;
  }
  return table.zs[table.zs.length - 1].z;
}

// Independent placement for the open-world path: deepest anchor, then 1024
// centre-window candidates, maximin, then the documented tie-breaks.
function referencePlace(seed, table, reader, zMin, zMax) {
  const spec = table.solver;
  const world = spec.mapSize * spec.grid;
  const races = table.races.slice().sort(function (a, b) {
    return a.centre - b.centre || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  });
  const placed = [];
  for (let i = 0; i < races.length; i++) {
    const race = races[i];
    const x0 = race.map[0] * spec.mapSize;
    const y0 = race.map[1] * spec.mapSize;
    const cx = x0 + spec.centreOffset;
    const cy = y0 + spec.centreOffset;
    if (i === 0) {
      let z = race.centre;
      if (z < zMin || z > zMax) z = z < zMin ? zMin : zMax;
      placed.push({ id: race.id, x: cx, y: cy, z: z });
      continue;
    }
    const rng = mulberry32((seed ^ (race.salt >>> 0)) >>> 0);
    const weights = zWeights(race.z[0], race.z[1], race.centre);
    const span = spec.centreRadius * 2 + 1;
    let best = null;
    for (let n = 0; n < spec.candidates; n++) {
      let lx = spec.centreOffset + (rng() % span) - spec.centreRadius;
      let ly = spec.centreOffset + (rng() % span) - spec.centreRadius;
      if (lx < 0) lx = 0;
      if (ly < 0) ly = 0;
      if (lx >= spec.mapSize) lx = spec.mapSize - 1;
      if (ly >= spec.mapSize) ly = spec.mapSize - 1;
      const cand = {
        x: x0 + lx,
        y: y0 + ly,
        z: pickZ(weights, rng() % weights.sum),
        ticket: rng()
      };
      if (!reader.walkableAt(cand.x, cand.y, cand.z) || reader.waterAt(cand.x, cand.y, cand.z)) continue;
      if (reader.familyAt(cand.x, cand.y, cand.z) !== race.family) continue;
      let score = 0x3fffffff;
      for (let p = 0; p < placed.length; p++) {
        const d = dist2(cand, placed[p], world, spec.zWeight);
        if (d < score) score = d;
      }
      const row = {
        c: cand,
        score: score,
        centreD: (cand.x - cx) * (cand.x - cx) + (cand.y - cy) * (cand.y - cy),
        zAbs: Math.abs(cand.z - race.centre),
        ticket: cand.ticket
      };
      if (!best || row.score > best.score || (row.score === best.score && (row.centreD < best.centreD || (row.centreD === best.centreD && (row.zAbs < best.zAbs || (row.zAbs === best.zAbs && row.ticket < best.ticket)))))) {
        best = row;
      }
    }
    if (!best) throw new Error("reference found no candidate for " + race.id);
    placed.push({ id: race.id, x: best.c.x, y: best.c.y, z: best.c.z });
  }
  return placed;
}

function openReader(table) {
  return {
    walkableAt: function () { return true; },
    waterAt: function () { return false; },
    familyAt: function (x, y) {
      const col = Math.floor(x / table.solver.mapSize);
      const row = Math.floor(y / table.solver.mapSize);
      const race = table.races.find(function (r) { return r.map[0] === col && r.map[1] === row; });
      return race ? race.family : "NONE";
    }
  };
}

function recordingReader(inner) {
  const calls = [];
  return {
    calls: calls,
    walkableAt: function (x, y, z) { calls.push(["walkableAt", x, y, z]); return inner.walkableAt(x, y, z); },
    waterAt: function (x, y, z) { return inner.waterAt(x, y, z); },
    familyAt: function (x, y, z) { return inner.familyAt(x, y, z); }
  };
}

function guardingReader(zMin, zMax, inner) {
  const seen = [];
  function guard(z) {
    seen.push(z);
    if (!Number.isInteger(z) || z < zMin || z > zMax) {
      const err = new Error("reader z " + z);
      err.code = "reader_range";
      throw err;
    }
  }
  return {
    seen: seen,
    walkableAt: function (x, y, z) { guard(z); return inner.walkableAt(x, y, z); },
    waterAt: function (x, y, z) { guard(z); return inner.waterAt(x, y, z); },
    familyAt: function (x, y, z) { guard(z); return inner.familyAt(x, y, z); }
  };
}

function raceOf(table, x, y) {
  const size = table.solver.mapSize;
  const col = Math.floor(x / size);
  const row = Math.floor(y / size);
  return table.races.find(function (r) { return r.map[0] === col && r.map[1] === row; });
}

function byId(starts, id) {
  return starts.find(function (s) { return s.id === id; });
}

let api = null;
let table = null;
let loadError = null;

function main() {
  const mutantArg = process.argv.find(function (a) { return a.indexOf("--mutant=") === 0; });
  const mutant = mutantArg ? mutantArg.slice(9) : "";
  if (mutant && !TARGET[mutant]) {
    console.error("FAIL unknown mutant " + mutant);
    process.exit(1);
  }
  try {
    api = loadSolver(mutant);
    table = readTable();
  } catch (e) {
    loadError = e;
  }

  const failed = [];
  function check(name, fn) {
    if (loadError) {
      console.log("FAIL ::" + name + ": " + loadError.message);
      failed.push(name);
      return;
    }
    try {
      fn();
      console.log("PASS ::" + name);
    } catch (e) {
      console.log("FAIL ::" + name + ": " + (e && e.message ? e.message : e));
      failed.push(name);
    }
  }

  check("nine_starts", function () {
    const result = api.placeStarts({ seed: 1, zMin: -16, zMax: 15, reader: openReader(table), table: table });
    assert(result.starts.length === 9, "count " + result.starts.length);
    const ids = result.starts.map(function (s) { return s.id; }).sort();
    const want = EXPECTED.map(function (r) { return r.id; }).sort();
    assert(ids.join() === want.join(), "ids " + ids.join());
    const dragon = byId(result.starts, "dragonborn");
    assert(dragon.x === 128 && dragon.y === 128 && dragon.z === -13, "anchor " + dragon.x + "," + dragon.y + "," + dragon.z);
  });

  check("fixed_map_assignment", function () {
    assert(table.solver.mapSize === 256 && table.solver.grid === 3, "grid");
    assert(table.solver.candidates === 1024, "candidates");
    assert(table.solver.ratioNumerator === 13 && table.solver.ratioDenominator === 20, "ratio 13/20");
    assert(table.solver.shiftCells === 32 && table.solver.shiftPasses === 4, "shift bounds");
    assert(table.solver.zWeight === 2, "z weight");
    EXPECTED.forEach(function (want) {
      const row = table.races.find(function (r) { return r.id === want.id; });
      assert(row, "missing " + want.id);
      assert(row.family === want.family, want.id + " family");
      assert(row.z[0] === want.z[0] && row.z[1] === want.z[1], want.id + " range");
      assert(row.centre === want.centre, want.id + " centre");
      assert(row.map[0] === want.map[0] && row.map[1] === want.map[1], want.id + " map");
      assert(!!row.elevated === !!want.elevated, want.id + " elevated");
    });
    const result = api.placeStarts({ seed: 4, zMin: -16, zMax: 15, reader: openReader(table), table: table });
    result.starts.forEach(function (s) {
      const want = EXPECTED.find(function (r) { return r.id === s.id; });
      const col = Math.floor(s.x / 256);
      const row = Math.floor(s.y / 256);
      assert(col === want.map[0] && row === want.map[1], s.id + " landed on " + col + "," + row);
    });
  });

  check("ratio_065_all_walkable", function () {
    for (let seed = 1; seed <= 20; seed++) {
      const result = api.placeStarts({ seed: seed, zMin: -16, zMax: 15, reader: openReader(table), table: table });
      const ends = pairEnds(result.starts, 768, 2);
      assert(ends.ratio >= 0.65, "seed " + seed + " ratio " + ends.ratio);
      assert(Math.abs(result.ratio - ends.ratio) < 1e-9, "seed " + seed + " reported ratio drifted");
    }
  });

  check("low_ratio_accepts_degraded", function () {
    const result = blockedWorld(1);
    assert(result.logs.indexOf("home_band_degraded") !== -1, "degraded not logged");
    const ends = pairEnds(result.starts, 768, 2);
    assert(ends.ratio < 0.65, "fixture was not low-ratio (" + ends.ratio + ")");
    assert(result.starts.length === 9, "starts dropped");
  });

  check("shift_passes_bounded", function () {
    const result = shiftWorld(1);
    assert(result.shiftPasses >= 1 && result.shiftPasses <= 4, "passes " + result.shiftPasses);
    assert(result.shifts.length >= 1 && result.shifts.length <= 4, "shifts " + result.shifts.length);
    result.shifts.forEach(function (s) {
      const chebyshev = Math.max(Math.abs(s.toX - s.fromX), Math.abs(s.toY - s.fromY));
      assert(chebyshev >= 1 && chebyshev <= 32, s.race + " moved " + chebyshev);
      assert(s.pass >= 1 && s.pass <= 4, "pass index");
    });
    result.starts.forEach(function (s) {
      const want = EXPECTED.find(function (r) { return r.id === s.id; });
      assert(Math.floor(s.x / 256) === want.map[0] && Math.floor(s.y / 256) === want.map[1], s.id + " left its map");
    });
  });

  check("home_band", function () {
    const result = api.placeStarts({ seed: 2, zMin: -16, zMax: 15, reader: openReader(table), table: table });
    result.starts.forEach(function (s) {
      const want = EXPECTED.find(function (r) { return r.id === s.id; });
      assert(s.z >= want.z[0] && s.z <= want.z[1], s.id + " z " + s.z + " outside " + want.z);
    });
  });

  check("no_sky", function () {
    const result = api.placeStarts({ seed: 2, zMin: -16, zMax: 15, reader: openReader(table), table: table });
    result.starts.forEach(function (s) {
      assert(s.z <= 10 && s.z < 12 && s.z >= -15, s.id + " z " + s.z);
    });
  });

  check("determinism", function () {
    const reader = openReader(table);
    const first = api.placeStarts({ seed: 11, zMin: -16, zMax: 15, reader: reader, table: table });
    for (let n = 0; n < 100; n++) {
      const again = api.placeStarts({ seed: 11, zMin: -16, zMax: 15, reader: reader, table: table });
      assert(JSON.stringify(again.starts) === JSON.stringify(first.starts), "run " + n + " diverged");
    }
    [1, 2, 7].forEach(function (seed) {
      const got = api.placeStarts({ seed: seed, zMin: -16, zMax: 15, reader: reader, table: table });
      const ref = referencePlace(seed, table, reader, -16, 15);
      got.starts.forEach(function (s) {
        const r = ref.find(function (p) { return p.id === s.id; });
        assert(r && r.x === s.x && r.y === s.y && r.z === s.z, seed + " " + s.id + " " + s.x + "," + s.y + "," + s.z + " ref " + (r ? r.x + "," + r.y + "," + r.z : "missing"));
      });
    });
  });

  check("failsafe_family", function () {
    const reader = {
      walkableAt: function () { return true; },
      waterAt: function () { return false; },
      familyAt: function (x, y) {
        if (Math.floor(x / 256) === 1 && Math.floor(y / 256) === 2) {
          return (x === 384 && y === 640) ? "VOLCANIC" : "WET";
        }
        const race = raceOf(table, x, y);
        return race ? race.family : "NONE";
      }
    };
    const result = api.placeStarts({ seed: 1, zMin: -16, zMax: 15, reader: reader, table: table });
    const human = byId(result.starts, "human");
    assert(reader.familyAt(human.x, human.y, human.z) === "WET", "human landed on " + reader.familyAt(human.x, human.y, human.z));
    const fallback = result.events.filter(function (e) { return e.race === "human" && e.reason === "centre_fallback"; });
    assert(fallback.length === 0, "skipped neighbour relax");
  });

  check("failsafe_z", function () {
    const reader = {
      walkableAt: function (x, y, z) {
        if (Math.floor(x / 256) === 1 && Math.floor(y / 256) === 2) return z === -1;
        return true;
      },
      waterAt: function () { return false; },
      familyAt: function (x, y) {
        const race = raceOf(table, x, y);
        return race ? race.family : "NONE";
      }
    };
    const result = api.placeStarts({ seed: 1, zMin: -16, zMax: 15, reader: reader, table: table });
    assert(byId(result.starts, "human").z === -1, "human z " + byId(result.starts, "human").z);
    assert(result.logs.length === 0, "logged " + result.logs.join(","));
  });

  check("failsafe_centre", function () {
    const reader = {
      walkableAt: function (x, y, z) {
        if (Math.floor(x / 256) === 1 && Math.floor(y / 256) === 2) return x === 384 && y === 640 && z === 3;
        return true;
      },
      waterAt: function () { return false; },
      familyAt: function (x, y) {
        if (Math.floor(x / 256) === 1 && Math.floor(y / 256) === 2) return "NONE";
        const race = raceOf(table, x, y);
        return race ? race.family : "NONE";
      }
    };
    const result = api.placeStarts({ seed: 1, zMin: -16, zMax: 15, reader: reader, table: table });
    const human = byId(result.starts, "human");
    assert(human.x === 384 && human.y === 640 && human.z === 3, "centre " + human.x + "," + human.y + "," + human.z);
    assert(result.events.some(function (e) { return e.race === "human" && e.reason === "centre_fallback"; }), "centre fallback not logged");
  });

  check("infeasible_throws_underground_only", function () {
    let code = "";
    try {
      api.placeStarts({
        seed: 9,
        zMin: -16,
        zMax: 15,
        table: table,
        reader: {
          walkableAt: function (x, y) { return !(Math.floor(x / 256) === 0 && Math.floor(y / 256) === 0); },
          waterAt: function () { return false; },
          familyAt: function (x, y) { const race = raceOf(table, x, y); return race ? race.family : "NONE"; }
        }
      });
    } catch (e) {
      code = e.code || "";
      assert(/worldgen_infeasible/.test(String(e.message)) || code === "worldgen_infeasible", "message " + e.message);
    }
    assert(code === "worldgen_infeasible", "underground code " + code);
    const above = api.placeStarts({
      seed: 9,
      zMin: -16,
      zMax: 15,
      table: table,
      reader: {
        walkableAt: function (x, y, z) {
          if (Math.floor(x / 256) === 2 && Math.floor(y / 256) === 2) return z === 2;
          return true;
        },
        waterAt: function () { return false; },
        familyAt: function (x, y) { const race = raceOf(table, x, y); return race ? race.family : "NONE"; }
      }
    });
    assert(byId(above.starts, "elf").z === 2, "elf z " + byId(above.starts, "elf").z);
  });

  check("elevated_home_degrades", function () {
    const reader = {
      walkableAt: function (x, y, z) {
        const col = Math.floor(x / 256);
        const row = Math.floor(y / 256);
        if (col === 2 && row === 2) return z === 2 || z === 0;
        if (col === 0 && row === 2) return z === 0 || z === -2;
        return true;
      },
      waterAt: function () { return false; },
      familyAt: function (x, y) { const race = raceOf(table, x, y); return race ? race.family : "NONE"; }
    };
    const result = api.placeStarts({ seed: 1, zMin: -16, zMax: 15, reader: reader, table: table });
    assert(byId(result.starts, "elf").z === 2, "elf z " + byId(result.starts, "elf").z);
    assert(byId(result.starts, "halfling").z === 0, "halfling z " + byId(result.starts, "halfling").z);
    ["elf", "halfling"].forEach(function (id) {
      assert(result.events.some(function (e) { return e.race === id && e.reason === "elevated_surface"; }), id + " not degraded");
    });
    assert(result.logs.indexOf("home_band_degraded") !== -1, "log missing");
  });

  check("order_deepest_first", function () {
    const reader = recordingReader(openReader(table));
    const result = api.placeStarts({ seed: 1, zMin: -16, zMax: 15, reader: reader, table: table });
    assert(result.order.join() === DEEPEST.join(), "order " + result.order.join());
    const first = reader.calls[0];
    assert(first && first[0] === "walkableAt", "no read");
    assert(Math.floor(first[1] / 256) === 0 && Math.floor(first[2] / 256) === 0 && first[3] === -13, "first read " + first.slice(1).join(","));
  });

  check("cost_bound", function () {
    const result = api.placeStarts({ seed: 1, zMin: -16, zMax: 15, reader: openReader(table), table: table });
    assert(result.distanceOps <= 100000, "ops " + result.distanceOps);
    assert(result.distanceOps >= 1024 * 28, "ops " + result.distanceOps + " below a real candidate sweep");
  });

  check("zrange_clip", function () {
    const seen = [];
    const reader = guardingReader(-4, 4, openReader(table));
    const result = api.placeStarts({ seed: 1, zMin: -4, zMax: 4, reader: reader, table: table });
    seen.push.apply(seen, reader.seen);
    assert(byId(result.starts, "dragonborn").z === -4, "dragonborn " + byId(result.starts, "dragonborn").z);
    assert(byId(result.starts, "dwarf").z === -4, "dwarf " + byId(result.starts, "dwarf").z);
    assert(byId(result.starts, "elf").z === 4, "elf " + byId(result.starts, "elf").z);
    assert(byId(result.starts, "gnome").z === -4, "gnome " + byId(result.starts, "gnome").z);
    result.starts.forEach(function (s) {
      assert(s.z >= -4 && s.z <= 4, s.id + " z " + s.z);
    });
    const halfling = byId(result.starts, "halfling");
    assert(halfling.z >= 2 && halfling.z <= 4, "halfling " + halfling.z);
    const tiefling = byId(result.starts, "tiefling");
    assert(tiefling.z >= -4 && tiefling.z <= 0, "tiefling " + tiefling.z);
    assert(seen.every(function (z) { return z >= -4 && z <= 4; }), "read outside range");
    assert(result.logs.indexOf("home_band_degraded") !== -1, "excluded intervals did not degrade");
  });

  check("shift_blocked_rejected", function () {
    const reader = blockedReader();
    const result = api.placeStarts({ seed: 3, zMin: -16, zMax: 15, reader: reader, table: table });
    result.starts.forEach(function (s) {
      assert(reader.walkableAt(s.x, s.y, s.z), s.id + " unstandable " + s.x + "," + s.y + "," + s.z);
      assert(!reader.waterAt(s.x, s.y, s.z), s.id + " in water");
      assert(s.z >= -16 && s.z <= 15, s.id + " z");
      const want = EXPECTED.find(function (r) { return r.id === s.id; });
      assert(Math.floor(s.x / 256) === want.map[0] && Math.floor(s.y / 256) === want.map[1], s.id + " off map");
    });
    assert(result.logs.indexOf("home_band_degraded") !== -1, "degradation not logged");
    assert(result.shiftPasses <= 4, "passes " + result.shiftPasses);
    assert(pairEnds(result.starts, 768, 2).ratio < 0.65, "blocked fixture was not low ratio");
  });

  check("reader_range_respected", function () {
    const reader = guardingReader(-4, 4, openReader(table));
    const result = api.placeStarts({ seed: 1, zMin: -4, zMax: 4, reader: reader, table: table });
    assert(reader.seen.indexOf(-13) === -1, "read -13");
    assert(reader.seen.every(function (z) { return z >= -4 && z <= 4; }), "read " + reader.seen.filter(function (z) { return z < -4 || z > 4; })[0]);
    assert(byId(result.starts, "dragonborn").z === -4, "dragonborn " + byId(result.starts, "dragonborn").z);
  });

  if (mutant) {
    const targets = TARGET[mutant];
    const killed = targets.every(function (name) { return failed.indexOf(name) !== -1; });
    console.log((killed ? "KILLED" : "SURVIVED") + " " + mutant + " -> " + targets.join(","));
    process.exit(killed ? 1 : 1);
  }
  if (failed.length) {
    console.log("FAILED " + failed.length + " " + failed.join(","));
    process.exit(1);
  }
  console.log("ALL CHECKS PASSED");
}

function blockedReader() {
  const only = {
    dragonborn: [255, 128],
    tiefling: [0, 128],
    dwarf: [128, 128],
    gnome: [128, 128],
    "half-elf": [128, 128],
    "half-orc": [128, 128],
    halfling: [128, 128],
    human: [128, 128],
    elf: [128, 128]
  };
  function atOnly(x, y, z) {
    const race = raceOf(table, x, y);
    if (!race) return false;
    const lx = x - race.map[0] * 256;
    const ly = y - race.map[1] * 256;
    const cell = only[race.id];
    return lx === cell[0] && ly === cell[1] && z === race.centre;
  }
  return {
    walkableAt: function (x, y, z) { return atOnly(x, y, z); },
    waterAt: function (x, y, z) { return !atOnly(x, y, z); },
    familyAt: function (x, y) {
      const race = raceOf(table, x, y);
      return race ? race.family : "NONE";
    }
  };
}

function blockedWorld(seed) {
  return api.placeStarts({ seed: seed, zMin: -16, zMax: 15, reader: blockedReader(), table: table });
}

function shiftWorld(seed) {
  const reader = {
    walkableAt: function () { return true; },
    waterAt: function () { return false; },
    familyAt: function (x, y) {
      const race = raceOf(table, x, y);
      if (!race) return "NONE";
      const lx = x - race.map[0] * 256;
      const ly = y - race.map[1] * 256;
      if (race.id === "dragonborn") return (lx >= 248 && ly >= 120 && ly <= 135) ? race.family : "NONE";
      if (race.id === "tiefling") return (lx <= 7 && ly >= 120 && ly <= 135) ? race.family : "NONE";
      return race.family;
    }
  };
  return api.placeStarts({ seed: seed, zMin: -16, zMax: 15, reader: reader, table: table });
}

main();
