"use strict";

// Pure race-start solver (WG.62.02). No world scan on the placement path:
// 1024 centre-window candidates per later race, then at most four 32-cell shifts.
// The deepest race is the anchor at its map centre. See docs/systems/DEUS_RaceStarts.md.

const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "../../../data/worldgen/race_starts.json");

function loadTable() {
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
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

function cmpId(a, b) {
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

function orderRaces(races) {
  const copy = races.slice();
  /*MUTANT shallow_first*/ copy.sort(function (a, b) { return a.centre - b.centre || cmpId(a, b); });
  return copy;
}

function specOf(table) {
  const s = table.solver;
  const strata = Math.round(Math.sqrt(s.candidates));
  if (strata * strata !== s.candidates) throw new Error("race_starts candidates must be a square");
  if (s.mapSize % strata !== 0) throw new Error("race_starts mapSize must divide into the candidate grid");
  return {
    mapSize: s.mapSize,
    grid: s.grid,
    world: s.mapSize * s.grid,
    candidates: s.candidates,
    strata: strata,
    step: s.mapSize / strata,
    centreOffset: s.centreOffset,
    centreRadius: s.centreRadius,
    ratioNumerator: s.ratioNumerator,
    ratioDenominator: s.ratioDenominator,
    shiftCells: s.shiftCells,
    shiftPasses: s.shiftPasses,
    zWeight: s.zWeight
  };
}

function infeasible(race, seed) {
  const err = new Error("worldgen_infeasible: " + (race ? race.id : "?") + " seed " + seed);
  err.code = "worldgen_infeasible";
  err.race = race ? race.id : null;
  err.seed = seed;
  return err;
}

function noteDegraded(ctx, race, reason) {
  if (reason === "low_ratio") {
    /*MUTANT throw_on_low_ratio*/ ctx.logs.push("home_band_degraded");
  } else {
    ctx.logs.push("home_band_degraded");
  }
  ctx.events.push({
    code: "home_band_degraded",
    race: race ? race.id : null,
    reason: reason
  });
}

function torusDelta(d, world) {
  const half = world / 2;
  /*MUTANT no_wrap*/ if (d > half) d -= world; else if (d < -half) d += world;
  return d;
}

function d2(ctx, x1, y1, z1, x2, y2, z2) {
  const dx = torusDelta(x2 - x1, ctx.spec.world);
  const dy = torusDelta(y2 - y1, ctx.spec.world);
  const dz = z2 - z1;
  /*MUTANT no_z_weight*/ const zTerm = (ctx.spec.zWeight * dz) * (ctx.spec.zWeight * dz);
  ctx.distanceOps += 1;
  return dx * dx + dy * dy + zTerm;
}

// min/max >= n/d  iff  minD2/maxD2 >= (n/d)^2  iff  minD2 * d * d >= maxD2 * n * n.
function meetsRatio(minD2, maxD2, spec) {
  if (!(maxD2 > 0)) return false;
  const n = spec.ratioNumerator;
  const d = spec.ratioDenominator;
  return minD2 * d * d >= maxD2 * n * n;
}

function pairStats(ctx, placed) {
  let minD2 = 0;
  let maxD2 = 0;
  let worstI = 0;
  let worstJ = 1;
  let first = true;
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const dist = d2(ctx, placed[i].x, placed[i].y, placed[i].z, placed[j].x, placed[j].y, placed[j].z);
      if (first || dist < minD2 || (dist === minD2 && (i < worstI || (i === worstI && j < worstJ)))) {
        minD2 = dist;
        worstI = i;
        worstJ = j;
      }
      if (first || dist > maxD2) maxD2 = dist;
      first = false;
    }
  }
  return { minD2: minD2, maxD2: maxD2, worstI: worstI, worstJ: worstJ };
}

function ratioBetter(a, b) {
  return a.minD2 * b.maxD2 > b.minD2 * a.maxD2;
}

function shiftFallbackAllowed(ctx, x, y, z, race) {
  /*MUTANT bypass_validation*/ if (Math.floor(x / ctx.spec.mapSize) !== race.map[0] || Math.floor(y / ctx.spec.mapSize) !== race.map[1]) return false; if (z < ctx.zMin || z > ctx.zMax) return false; if (!ctx.reader.walkableAt(x, y, z)) return false; if (ctx.reader.waterAt(x, y, z)) return false; return true;
}

function cellFamilyOk(ctx, race, x, y, z, mode) {
  if (z < ctx.zMin || z > ctx.zMax) return false;
  if (Math.floor(x / ctx.spec.mapSize) !== race.map[0] || Math.floor(y / ctx.spec.mapSize) !== race.map[1]) return false;
  if (!ctx.reader.walkableAt(x, y, z)) return false;
  if (ctx.reader.waterAt(x, y, z)) return false;
  if (mode === "any") return true;
  const fam = ctx.reader.familyAt(x, y, z);
  if (fam === race.family) return true;
  if (mode === "strict") return false;
  const list = ctx.neighbours[race.family] || [];
  return list.indexOf(fam) !== -1;
}

function visitSpiral(ctx, race, z, mode, x, y, x0, y0, mapSize) {
  if (x < x0 || x >= x0 + mapSize || y < y0 || y >= y0 + mapSize) return null;
  if (mode === "any") {
    if (shiftFallbackAllowed(ctx, x, y, z, race)) return { x: x, y: y, z: z };
    return null;
  }
  if (cellFamilyOk(ctx, race, x, y, z, mode)) return { x: x, y: y, z: z };
  return null;
}

function spiral(ctx, race, z, mode) {
  if (z < ctx.zMin || z > ctx.zMax) return null;
  const mapSize = ctx.spec.mapSize;
  const cx = race.map[0] * mapSize + ctx.spec.centreOffset;
  const cy = race.map[1] * mapSize + ctx.spec.centreOffset;
  const x0 = race.map[0] * mapSize;
  const y0 = race.map[1] * mapSize;
  // Ring order matches dy-outer, dx-inner chebyshev shells, but only the shell cells are visited.
  for (let r = 0; r < mapSize; r++) {
    for (let dy = -r; dy <= r; dy++) {
      const dxs = Math.abs(dy) === r ? null : [-r, r];
      if (dxs) {
        for (let k = 0; k < dxs.length; k++) {
          const hit = visitSpiral(ctx, race, z, mode, cx + dxs[k], cy + dy, x0, y0, mapSize);
          if (hit) return hit;
        }
      } else {
        for (let dx = -r; dx <= r; dx++) {
          const hit = visitSpiral(ctx, race, z, mode, cx + dx, cy + dy, x0, y0, mapSize);
          if (hit) return hit;
        }
      }
    }
  }
  return null;
}

// Home interval clipped to the world. An interval that misses the world entirely
// becomes the single nearest permitted boundary.
function clipHome(race, zMin, zMax) {
  const lo = race.z[0];
  const hi = race.z[1];
  const centre = race.centre;
  if (hi < zMin) return { lo: zMin, hi: zMin, centre: zMin, clippedOut: true };
  if (lo > zMax) return { lo: zMax, hi: zMax, centre: zMax, clippedOut: true };
  const clo = lo < zMin ? zMin : lo;
  const chi = hi > zMax ? zMax : hi;
  let c = centre;
  if (c < clo) c = clo;
  if (c > chi) c = chi;
  return { lo: clo, hi: chi, centre: c, clippedOut: false };
}

function zTable(lo, hi, centre) {
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

function draw(ctx, race, lo, hi, centre) {
  const rng = mulberry32((ctx.seed ^ (race.salt >>> 0)) >>> 0);
  const weights = zTable(lo, hi, centre);
  const x0 = race.map[0] * ctx.spec.mapSize;
  const y0 = race.map[1] * ctx.spec.mapSize;
  // Centre-weighted xy. A full-map farthest point on this torus sits on a wrap
  // corner; four 32-cell shifts cannot bring that layout back to ratio 0.65.
  // The central window is the support of the weight. Failures fall through to
  // a whole-map spiral, so a standable cell outside the window is still found.
  const drawn = [];
  const radius = ctx.spec.centreRadius;
  const off = ctx.spec.centreOffset;
  const span = radius * 2 + 1;
  for (let n = 0; n < ctx.spec.candidates; n++) {
    let lx = off + (rng() % span) - radius;
    let ly = off + (rng() % span) - radius;
    if (lx < 0) lx = 0;
    if (ly < 0) ly = 0;
    if (lx >= ctx.spec.mapSize) lx = ctx.spec.mapSize - 1;
    if (ly >= ctx.spec.mapSize) ly = ctx.spec.mapSize - 1;
    drawn.push({
      x: x0 + lx,
      y: y0 + ly,
      z: pickZ(weights, rng() % weights.sum),
      ticket: rng()
    });
  }
  return drawn;
}

function annotate(ctx, c) {
  c.walk = !!ctx.reader.walkableAt(c.x, c.y, c.z);
  c.water = !!ctx.reader.waterAt(c.x, c.y, c.z);
  c.fam = c.walk && !c.water ? ctx.reader.familyAt(c.x, c.y, c.z) : "";
}

function consider(ctx, race, c, mode) {
  if (!c.walk || c.water) return false;
  if (c.fam === race.family) {
    c.familyExact = 1;
    return true;
  }
  if (mode === "strict") return false;
  const list = ctx.neighbours[race.family] || [];
  if (list.indexOf(c.fam) !== -1) {
    c.familyExact = 0;
    return true;
  }
  return false;
}

function beats(a, b) {
  if (a.score !== b.score) return a.score > b.score;
  if (a.centreD !== b.centreD) return a.centreD < b.centreD;
  if (a.familyExact !== b.familyExact) return a.familyExact > b.familyExact;
  if (a.zAbs !== b.zAbs) return a.zAbs < b.zAbs;
  return a.ticket < b.ticket;
}

function selectBest(ctx, race, pool, placed, centreZ) {
  let best = null;
  const cx = race.map[0] * ctx.spec.mapSize + ctx.spec.centreOffset;
  const cy = race.map[1] * ctx.spec.mapSize + ctx.spec.centreOffset;
  for (let i = 0; i < pool.length; i++) {
    const c = pool[i];
    let score = 0x3fffffff;
    for (let p = 0; p < placed.length; p++) {
      const dist = d2(ctx, c.x, c.y, c.z, placed[p].x, placed[p].y, placed[p].z);
      if (dist < score) score = dist;
    }
    const row = {
      c: c,
      score: score,
      centreD: (c.x - cx) * (c.x - cx) + (c.y - cy) * (c.y - cy),
      familyExact: c.familyExact,
      zAbs: Math.abs(c.z - centreZ),
      ticket: c.ticket
    };
    if (!best || beats(row, best)) best = row;
  }
  return best ? { x: best.c.x, y: best.c.y, z: best.c.z } : null;
}

function pool(ctx, race, drawn, mode) {
  const out = [];
  for (let i = 0; i < drawn.length; i++) {
    if (consider(ctx, race, drawn[i], mode)) out.push(drawn[i]);
  }
  return out;
}

function placeRace(ctx, race, clip, placed) {
  const drawn = draw(ctx, race, clip.lo, clip.hi, clip.centre);
  for (let i = 0; i < drawn.length; i++) annotate(ctx, drawn[i]);
  let best = selectBest(ctx, race, pool(ctx, race, drawn, "strict"), placed, clip.centre);
  if (best) return best;
  best = selectBest(ctx, race, pool(ctx, race, drawn, "neighbour"), placed, clip.centre);
  if (best) return best;
  const lo = clip.lo - 1 < ctx.zMin ? ctx.zMin : clip.lo - 1;
  const hi = clip.hi + 1 > ctx.zMax ? ctx.zMax : clip.hi + 1;
  if (lo < clip.lo || hi > clip.hi) {
    const wide = draw(ctx, race, lo, hi, clip.centre);
    for (let i = 0; i < wide.length; i++) annotate(ctx, wide[i]);
    best = selectBest(ctx, race, pool(ctx, race, wide, "neighbour"), placed, clip.centre);
    if (best) return best;
  }
  const strictSpot = spiral(ctx, race, clip.centre, "strict");
  if (strictSpot) return strictSpot;
  const neighSpot = spiral(ctx, race, clip.centre, "neighbour");
  if (neighSpot) return neighSpot;
  const centreSpot = spiral(ctx, race, clip.centre, "any");
  if (centreSpot) {
    noteDegraded(ctx, race, "centre_fallback");
    return centreSpot;
  }
  return null;
}

// Deepest race: standable map centre at its centre z. -13 is not read until it
// sits inside [zMin, zMax].
function placeFirst(ctx, race, clip) {
  const mapSize = ctx.spec.mapSize;
  const cx = race.map[0] * mapSize + ctx.spec.centreOffset;
  const cy = race.map[1] * mapSize + ctx.spec.centreOffset;
  let z = race.centre;
  /*MUTANT hardcode_minus13*/ if (z < ctx.zMin || z > ctx.zMax) z = z < ctx.zMin ? ctx.zMin : ctx.zMax;
  const walk = ctx.reader.walkableAt(cx, cy, z);
  const water = ctx.reader.waterAt(cx, cy, z);
  const fam = ctx.reader.familyAt(cx, cy, z);
  if (walk && !water && fam === race.family) return { x: cx, y: cy, z: z };
  const strict = spiral(ctx, race, z, "strict");
  if (strict) return strict;
  const neigh = spiral(ctx, race, z, "neighbour");
  if (neigh) return neigh;
  if (shiftFallbackAllowed(ctx, cx, cy, z, race)) {
    noteDegraded(ctx, race, "centre_fallback");
    return { x: cx, y: cy, z: z };
  }
  const any = spiral(ctx, race, z, "any");
  if (any) {
    noteDegraded(ctx, race, "centre_fallback");
    return any;
  }
  return null;
}

function highestSurface(ctx, race) {
  const top = race.z[1] < ctx.zMax ? race.z[1] : ctx.zMax;
  for (let z = top; z >= ctx.zMin; z--) {
    const spot = spiral(ctx, race, z, "any");
    if (spot) return spot;
  }
  return null;
}

function underground(race) {
  return race.z[1] < 0;
}

function borderDist(ctx, from, to) {
  const mapSize = ctx.spec.mapSize;
  const lx = from.x - from.col * mapSize;
  const ly = from.y - from.row * mapSize;
  const dx = torusDelta(to.x - from.x, ctx.spec.world);
  const dy = torusDelta(to.y - from.y, ctx.spec.world);
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) return mapSize - 1 - lx;
    if (dx < 0) return lx;
    return mapSize;
  }
  if (dy > 0) return mapSize - 1 - ly;
  if (dy < 0) return ly;
  return mapSize;
}

function inwardStep(ctx, from, to) {
  const dx = torusDelta(to.x - from.x, ctx.spec.world);
  const dy = torusDelta(to.y - from.y, ctx.spec.world);
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) return { x: -1, y: 0 };
    if (dx < 0) return { x: 1, y: 0 };
    return { x: 0, y: 0 };
  }
  if (dy > 0) return { x: 0, y: -1 };
  if (dy < 0) return { x: 0, y: 1 };
  return { x: 0, y: 0 };
}

function tryShift(ctx, placed) {
  const stats = pairStats(ctx, placed);
  const i = stats.worstI;
  const j = stats.worstJ;
  const di = borderDist(ctx, placed[i], placed[j]);
  const dj = borderDist(ctx, placed[j], placed[i]);
  const order = di < dj ? [i, j] : dj < di ? [j, i] : (i > j ? [i, j] : [j, i]);
  for (let n = 0; n < order.length; n++) {
    const idx = order[n];
    const other = idx === i ? j : i;
    const step = inwardStep(ctx, placed[idx], placed[other]);
    if (step.x === 0 && step.y === 0) continue;
    let best = null;
    for (let dist = ctx.spec.shiftCells; dist >= 1; dist--) {
      const x = placed[idx].x + step.x * dist;
      const y = placed[idx].y + step.y * dist;
      const z = placed[idx].z;
      if (!shiftFallbackAllowed(ctx, x, y, z, placed[idx].race)) continue;
      const trial = placed.slice();
      trial[idx] = {
        race: placed[idx].race,
        x: x,
        y: y,
        z: z,
        col: placed[idx].col,
        row: placed[idx].row
      };
      const next = pairStats(ctx, trial);
      if (!ratioBetter(next, stats)) continue;
      if (!best || ratioBetter(next, best.stats) || (next.minD2 === best.stats.minD2 && next.maxD2 === best.stats.maxD2 && dist > best.dist)) {
        best = { idx: idx, x: x, y: y, z: z, dist: dist, stats: next };
      }
    }
    if (best) return best;
  }
  return null;
}

function runShifts(ctx, placed) {
  /*MUTANT no_shift*/ const shiftLimit = ctx.spec.shiftPasses;
  const shifts = [];
  let passes = 0;
  for (let pass = 0; pass < shiftLimit; pass++) {
    const stats = pairStats(ctx, placed);
    if (meetsRatio(stats.minD2, stats.maxD2, ctx.spec)) break;
    passes += 1;
    const move = tryShift(ctx, placed);
    if (!move) break;
    const from = placed[move.idx];
    shifts.push({
      race: from.race.id,
      pass: pass + 1,
      fromX: from.x,
      fromY: from.y,
      toX: move.x,
      toY: move.y,
      z: move.z
    });
    placed[move.idx] = {
      race: from.race,
      x: move.x,
      y: move.y,
      z: move.z,
      col: from.col,
      row: from.row
    };
  }
  const end = pairStats(ctx, placed);
  if (!meetsRatio(end.minD2, end.maxD2, ctx.spec)) noteDegraded(ctx, null, "low_ratio");
  return { passes: passes, shifts: shifts, minD2: end.minD2, maxD2: end.maxD2 };
}

function stamp(race, spot, mapSize) {
  return {
    id: race.id,
    family: race.family,
    x: spot.x,
    y: spot.y,
    z: spot.z,
    col: Math.floor(spot.x / mapSize),
    row: Math.floor(spot.y / mapSize)
  };
}

function placeStarts(options) {
  if (!options || !options.reader) throw new Error("placeStarts requires a reader");
  const table = options.table || loadTable();
  const zMin = options.zMin;
  const zMax = options.zMax;
  if (!Number.isInteger(zMin) || !Number.isInteger(zMax) || zMin > zMax) {
    throw new Error("placeStarts requires an integer world range");
  }
  const ctx = {
    seed: options.seed >>> 0,
    zMin: zMin,
    zMax: zMax,
    reader: options.reader,
    spec: specOf(table),
    neighbours: table.neighbours,
    logs: [],
    events: [],
    distanceOps: 0
  };
  const races = orderRaces(table.races);
  const placed = [];
  for (let i = 0; i < races.length; i++) {
    const race = races[i];
    const clip = clipHome(race, zMin, zMax);
    if (clip.clippedOut) noteDegraded(ctx, race, "z_clip");
    let spot = i === 0 ? placeFirst(ctx, race, clip) : placeRace(ctx, race, clip, placed);
    if (!spot) {
      if (underground(race)) throw infeasible(race, ctx.seed);
      spot = highestSurface(ctx, race);
      if (!spot) throw infeasible(race, ctx.seed);
      noteDegraded(ctx, race, race.elevated ? "elevated_surface" : "surface");
    }
    placed.push({
      race: race,
      x: spot.x,
      y: spot.y,
      z: spot.z,
      col: race.map[0],
      row: race.map[1]
    });
  }
  const shifted = runShifts(ctx, placed);
  const starts = [];
  const order = [];
  for (let i = 0; i < placed.length; i++) {
    order.push(placed[i].race.id);
    starts.push(stamp(placed[i].race, placed[i], ctx.spec.mapSize));
  }
  const ratio = shifted.maxD2 > 0 ? Math.sqrt(shifted.minD2 / shifted.maxD2) : 0;
  return {
    starts: starts,
    order: order,
    logs: ctx.logs,
    events: ctx.events,
    ratio: ratio,
    distanceOps: ctx.distanceOps,
    shiftPasses: shifted.passes,
    shifts: shifted.shifts
  };
}

module.exports = {
  loadTable: loadTable,
  placeStarts: placeStarts,
  DATA_PATH: DATA_PATH
};
