"use strict";
// SIM.40.05 decay core. Headless and deterministic.
//   node tools/sim/test_decay_core.js
// Exit 0 only when every check passes. Mutants are in-memory. Files on disk are not edited.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const params = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "sim", "decay_params.json"), "utf8"));
const schema = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "sim", "decay_params.schema.json"), "utf8"));
const pinned = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "sim", "fixtures", "decay", "expected_instants.json"), "utf8"));
const D = require(path.join(ROOT, "game", "js", "sim", "decay"));
const { createLedger } = require(path.join(ROOT, "game", "js", "sim", "ledger"));

let passed = 0;
let failed = 0;
function check(name, ok, why) {
    if (ok) { passed++; console.log("PASS " + name); }
    else { failed++; console.log("FAIL " + name + (why ? ": " + why : "")); }
}
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function hasCode(res, code) {
    return res.errors.some(function (e) { return e.code === code; });
}

// Independent oracle. It does not call the implementation.
function oCeil(a, b) { return Math.floor((a + b - 1) / b); }
function oFloor(a, b) { return Math.floor(a / b); }
function oLife(milli, num, den, ft, root, fire) {
    return oCeil(milli * 12 * num * 512, 5 * den * ft * root * fire);
}
function oRem(clock, t) {
    if (t < clock.t0) return clock.rem0;
    let dt = t - clock.t0;
    if (dt > clock.lifeYt) dt = clock.lifeYt;
    const lost = oFloor(dt * 1000000, clock.lifeYt);
    return clock.rem0 > lost ? clock.rem0 - lost : 0;
}
function oCross(clock, p) {
    if (p >= clock.rem0) return clock.t0;
    return clock.t0 + oCeil((clock.rem0 - p) * clock.lifeYt, 1000000);
}
function oChain(n, t0, sheltered, sky, roofFail) {
    const out = [];
    let t = roofFail;
    for (let i = 0; i < n; i++) {
        const lost = oFloor((t - t0) * 1000000, sheltered);
        const rem0 = 1000000 - lost;
        const fail = t + oCeil(rem0 * sky, 1000000);
        out.push({ rebase: t, rem0: rem0, fail: fail });
        t = fail;
    }
    return out;
}
function perDayFailSy(maxHP, lifeYears, dpy) {
    const rate = oCeil(1000 * maxHP, lifeYears * dpy);
    const days = oCeil(maxHP * 1000, rate);
    return days / dpy;
}

const clean = D.validate(params);
check("validate_clean", clean.ok, clean.errors.slice(0, 4).map(function (e) { return e.code + ":" + e.path; }).join(" | "));

check("schema_required", schema.required.every(function (k) { return Object.prototype.hasOwnProperty.call(params, k); }));
check("dpy_unset", params.dpy.value === null && params.dpy.ownerOpen === "D-1");
["OQ-R-01", "OQ-R-04", "OQ-R-05", "OQ-R-09"].forEach(function (id) {
    check("tag_" + id, params.tags[id].ownerOpen === true && params.tags[id].default === "a");
});

function mutated(edit) {
    const copy = clone(params);
    edit(copy);
    return D.validate(copy);
}
check("reject_zero", hasCode(mutated(function (p) { p.lifeMilli.THATCH.SKY = 0; }), "E_LIFE"));
check("reject_infinite_thatch", hasCode(mutated(function (p) { p.lifeMilli.THATCH.SKY = null; }), "E_INFINITE"));
check("reject_fraction", hasCode(mutated(function (p) { p.lifeMilli.THATCH.SKY = 1; }), "E_LIFE"));
check("reject_life_yt", hasCode(mutated(function (p) { p.lifeMilli.THATCH.SKY = 2000000000; }), "E_LIFE_YT"));
check("reject_unknown", hasCode(mutated(function (p) { p.hack = true; }), "E_SCHEMA"));
check("reject_dpy_chosen", hasCode(mutated(function (p) { p.dpy.value = 20; }), "E_SCHEMA"));
check("reject_ore", hasCode(mutated(function (p) { p.transforms.push({ id: "bad", from: "CHARCOAL", to: "COAL" }); }), "E_ORE"));
check("reject_gem", hasCode(mutated(function (p) { p.transforms.push({ id: "bad", from: "ITEM", to: "GEM" }); }), "E_ORE"));
check("reject_fossil", hasCode(mutated(function (p) { p.transforms.push({ id: "bad", from: "BONE", to: "FOSSIL-BED" }); }), "E_ORE"));
const swapped = mutated(function (p) {
    const sky = p.lifeMilli.THATCH.SKY;
    p.lifeMilli.THATCH.SKY = p.lifeMilli.MUDBRICK.SHELTERED;
    p.lifeMilli.MUDBRICK.SHELTERED = sky;
});
check("reject_roof_wall", !swapped.ok && hasCode(swapped, "E_ROOF"));
let threw = false;
try { D.createDecay(clone(params), {}); } catch (e) { threw = e.code === "E_DPY"; }
check("dpy_required", threw);

// Closed form versus the oracle, including the long-life case and the inverse.
const longLife = D.lifeYt(20000000, 90, 90, 8, 8, 8);
check("long_life_yt", longLife === pinned.ashlarShelteredWr90NoModifierFailYt && longLife === oLife(20000000, 90, 90, 8, 8, 8));
check("r016_lives", D.lifeYt(20000000, 90, 90, 9, 8, 8) === pinned.r016.shelteredLifeYt && D.lifeYt(3000000, 90, 90, 9, 8, 8) === pinned.r016.skyLifeYt);
check("h1_lives", D.lifeYt(20000000, 50, 90, 10, 8, 8) === pinned.h1.shelteredLifeYt && D.lifeYt(3000000, 50, 90, 10, 8, 8) === pinned.h1.skyLifeYt);
check("ft8", D.ft8Of("ASHLAR", 250, 90, 0) === 9 && D.ft8Of("ASHLAR", 250, 50, 0) === 10 && D.ft8Of("MUDBRICK", 250, 0, 0) === 12 && D.ft8Of("TIMBER", 250, 0, 0) === 8 && D.ft8Of("ASHLAR", 250, 50, -3) === 8);

let invBad = 0;
let sampleBad = 0;
params.exposures.forEach(function (ex) {
    Object.keys(params.lifeMilli).forEach(function (dc) {
        const cell = D.lifeCell(params, dc, ex);
        if (cell.kind !== "finite") return;
        const impl = D.lifeYt(cell.milli, 1, 1, 8, 8, 8);
        const ora = oLife(cell.milli, 1, 1, 8, 8, 8);
        if (impl !== ora) sampleBad++;
        const clock = { t0: 0, rem0: D.R, lifeYt: impl };
        [0, 250000, 850000].forEach(function (p) {
            if (p >= D.R) return;
            const x = D.cross(clock, p);
            const ox = oCross(clock, p);
            if (x !== ox) sampleBad++;
            if (!(D.remAt(clock, x) <= p)) invBad++;
            if (x > 0 && !(D.remAt(clock, x - 1) > p)) invBad++;
        });
        if (D.failYt(clock) !== impl) sampleBad++;
        const hp = D.hpByte(120, D.remAt(clock, Math.floor(impl / 2)));
        const rem = oRem(clock, Math.floor(impl / 2));
        if (hp !== oCeil(120 * rem, 1000000)) sampleBad++;
    });
});
check("oracle_grid", sampleBad === 0, String(sampleBad));
check("inverse", invBad === 0, String(invBad));

function runMember(dpy, spec) {
    const api = D.createDecay(params, { dpy: dpy });
    api.addMember(spec);
    const fail = api.failOf(spec.id);
    const ev = fail == null ? [] : api.jumpTo(fail);
    return { api: api, fail: fail, ev: ev };
}
const a1 = runMember(1, {
    id: 1, structureId: 1, dc: "ASHLAR", ex: "SHELTERED", role: "WALL-UPPER",
    t0: 0, wR: 90, maxHP: 120, massMu: 0, family: "STONE"
});
const a360 = runMember(360, {
    id: 1, structureId: 1, dc: "ASHLAR", ex: "SHELTERED", role: "WALL-UPPER",
    t0: 0, wR: 90, maxHP: 120, massMu: 0, family: "STONE"
});
check("at_r01_long_life", a1.fail === 48000000 && a360.fail === 48000000 && a1.fail === a360.fail);
const hpEvents = a1.ev.filter(function (e) { return e.kind === "hp"; });
const breaks = a1.ev.filter(function (e) { return e.kind === "break"; });
check("hp_only_thresholds", hpEvents.length === 3 && breaks.length === 1 && hpEvents.length + breaks.length <= params.stages.steps + 1);
check("hp_on_cross", hpEvents.every(function (e) {
    const p = D.thresholdRem(e.threshold, 120);
    return e.atYt === D.cross({ t0: 0, rem0: D.R, lifeYt: 48000000 }, p);
}));
check("not_every_day", hpEvents.length + breaks.length < 100);

const per1 = perDayFailSy(120, 20000, 1);
const per20 = perDayFailSy(120, 20000, 20);
const per4 = perDayFailSy(120, 20000, 4);
check("mutant_per_day_disagrees", per1 !== per20 && per20 === 6000 && per4 !== per1);
check("clock_ignores_per_day", a1.fail / 2400 === 20000 && a1.fail !== per20 * 2400);

// Rebase replaces t0, rem0 and lifeYt. Keeping the old t0 moves the failure.
const reb = D.createDecay(params, { dpy: 1 });
reb.addMember({ id: 1, structureId: 1, dc: "TIMBER", ex: "SHELTERED", role: "WALL-UPPER", t0: 0, massMu: 0, family: "ORGANIC" });
const before = reb.failOf(1);
const done = reb.rebase(1, 72000, { ex: "SKY" });
check("rebase_assignment", done.ok && done.clock.t0 === 72000 && done.clock.rem0 === 800000 && done.clock.lifeYt === 144000 && reb.failOf(1) === 187200);
check("rebase_moves_fail", reb.failOf(1) !== before && reb.failOf(1) !== 144000);

// Damage threshold tag is the design default: decay still runs.
const dt = D.createDecay(params, { dpy: 1 });
dt.addMember({ id: 1, structureId: 1, dc: "THATCH", ex: "SKY", role: "ROOF", t0: 0, dt: 20, massMu: 0, family: "ORGANIC" });
check("threshold_ignored", dt.failOf(1) === 12 * 2400 && dt.heapSize().long === 1);

function standIn(ev, api) {
    ev.bookings.forEach(function (b) {
        if (b.cause === "collapse.decay" && !b.applied) api.commit(b);
    });
    const mates = api.membersOf(ev.structureId).filter(function (m) {
        return m.role === "WALL-UPPER" && !m.failed && m.ex === "SHELTERED";
    }).sort(function (a, b) { return a.band - b.band; });
    if (ev.role === "ROOF") {
        const top = mates.filter(function (m) { return m.band === 1; })[0];
        if (top) api.rebase(top.id, ev.atYt, { ex: "SKY" });
    } else if (ev.role === "WALL-UPPER" && mates.length) {
        api.rebase(mates[0].id, ev.atYt, { ex: "SKY" });
    }
}
function house(dpy, kind) {
    let breakCalls = 0;
    let maxEnqueued = 0;
    let stageBook = 0;
    const api = D.createDecay(params, {
        dpy: dpy,
        onBreak: function (ev, api) {
            breakCalls++;
            if (ev.enqueued > maxEnqueued) maxEnqueued = ev.enqueued;
            const before = api.balance().grand;
            standIn(ev, api);
            if (api.balance().grand !== before) stageBook++;
        }
    });
    const runs = [];
    for (let i = 0; i < 10; i++) runs.push({ x: i, y: 0, z: 0, mask: 1 });
    if (kind === "h1") {
        api.addMember({ id: 1, structureId: 1, dc: "TIMBER", ex: "SKY", role: "ROOF", t0: 31200, massMu: 5000, family: "ORGANIC", runs: runs });
        api.addMember({ id: 2, structureId: 1, dc: "TIMBER", ex: "SKY", role: "ROOF", t0: 31200, massMu: 5000, family: "ORGANIC", runs: runs });
        for (let b = 1; b <= 4; b++) {
            api.addMember({
                id: 10 + b, structureId: 1, dc: "ASHLAR", ex: "SHELTERED", role: "WALL-UPPER", band: b,
                t0: 31200, wR: 50, ftMilli: 250, massMu: 8000, family: "STONE", runs: [{ x: b, y: 0, z: 0, mask: 1 }]
            });
        }
    } else if (kind === "r016") {
        api.addMember({ id: 1, structureId: 1, dc: "TIMBER", ex: "SKY", role: "ROOF", t0: 0, massMu: 1000, family: "ORGANIC", runs: [{ x: 0, y: 0, z: 0 }] });
        for (let b = 1; b <= 4; b++) {
            api.addMember({
                id: 10 + b, structureId: 1, dc: "ASHLAR", ex: "SHELTERED", role: "WALL-UPPER", band: b,
                t0: 0, wR: 90, ftMilli: 250, massMu: 1000, family: "STONE", runs: [{ x: b, y: 0, z: 0 }]
            });
        }
    } else {
        api.addMember({ id: 1, structureId: 1, dc: "THATCH", ex: "SKY", role: "ROOF", t0: 28800, massMu: 1000, family: "ORGANIC", runs: [{ x: 0, y: 0, z: 0 }] });
        for (let b = 1; b <= 2; b++) {
            api.addMember({
                id: 10 + b, structureId: 1, dc: "MUDBRICK", ex: "SHELTERED", role: "WALL-UPPER", band: b,
                t0: 31200, ftMilli: 250, massMu: 1000, family: "EARTH", runs: [{ x: b, y: 0, z: 0 }]
            });
        }
    }
    return { api: api, counter: function () { return { breakCalls: breakCalls, maxEnqueued: maxEnqueued, stageBook: stageBook }; } };
}
function bandFails(api, yt) {
    return api.jumpTo(yt).filter(function (e) { return e.kind === "break" && e.role === "WALL-UPPER"; }).map(function (e) { return e.atYt; });
}
const h1a = house(1, "h1");
const h1b = house(20, "h1");
const h1c = house(4, "h1");
const h1d = house(360, "h1");
h1a.api.jumpTo(pinned.h1.s1);
check("h1_s1", h1a.api.stage(1) === "S1");
h1a.api.jumpTo(pinned.h1.roofFail);
check("h1_s3", h1a.api.stage(1) === "S3");
const fails1 = bandFails(h1a.api, pinned.h1.bands[3]);
const fails20 = bandFails(h1b.api, pinned.h1.bands[3]);
const fails4 = bandFails(h1c.api, pinned.h1.bands[3]);
const fails360 = bandFails(h1d.api, pinned.h1.bands[3]);
check("h1_bands", fails1.join() === pinned.h1.bands.join() && fails1.join() === fails20.join() && fails1.join() === fails4.join() && fails1.join() === fails360.join(), fails1.join());
check("h1_s4", h1a.api.stage(1) === "S4");
check("not_mr16", fails1[1] === 6055246 && fails1[1] !== pinned.h1.mr16Dpy1Band2 && fails1[1] !== pinned.h1.mr16Dpy20Band2);
check("not_mr15_years", pinned.h1.mr15Dpy1[0] !== pinned.h1.mr15Dpy20[0] && fails1[0] !== pinned.h1.mr15Dpy1[0] * 2400);
check("day_due_differs", h1a.api.dayDue(pinned.h1.bands[0]) === pinned.h1.dayDpy1 && h1b.api.dayDue(pinned.h1.bands[0]) === pinned.h1.dayDpy20 && h1a.api.dayDue(pinned.h1.bands[0]) !== h1b.api.dayDue(pinned.h1.bands[0]));
check("checkpoint_year", pinned.h1.bands[0] > 1397 * 2400 && pinned.h1.bands[0] <= 1398 * 2400);

const h1early = house(1, "h1");
h1early.api.jumpTo(1397 * 2400);
const earlyBands = h1early.api.membersOf(1).filter(function (m) { return m.role === "WALL-UPPER" && m.failed; });
h1early.api.jumpTo(1398 * 2400);
const lateBands = h1early.api.membersOf(1).filter(function (m) { return m.role === "WALL-UPPER" && m.failed; });
check("checkpoint_inclusion", earlyBands.length === 0 && lateBands.length === 1);

const r016 = house(1, "r016");
const rBands = bandFails(r016.api, pinned.r016.bands[3].fail);
const ora016 = oChain(4, 0, pinned.r016.shelteredLifeYt, pinned.r016.skyLifeYt, pinned.r016.roofFail);
check("r016_bands", rBands.join() === pinned.r016.bands.map(function (b) { return b.fail; }).join() && rBands.every(function (yt, i) { return yt === ora016[i].fail && ora016[i].rem0 === pinned.r016.bands[i].rem0; }), rBands.join());

const h2 = house(1, "h2");
const h2bands = bandFails(h2.api, pinned.h2.bands[1]);
const h2ora = oChain(2, pinned.h2.wallT0, oLife(400000, 1, 1, 12, 8, 8), oLife(60000, 1, 1, 12, 8, 8), pinned.h2.roofFail);
check("h2_bands", h2bands.join() === pinned.h2.bands.join() && h2bands[0] === h2ora[0].fail && h2ora[0].rem0 === pinned.h2.rem0[0] && h2ora[1].rem0 === pinned.h2.rem0[1], h2bands.join());

// AT-R-05: break once per roof, rebase at that instant, no deletion, cell cap.
const hand = house(1, "h1");
const opened = hand.api.balance().opened;
const evs = hand.api.jumpTo(pinned.h1.roofFail);
const roofBreaks = evs.filter(function (e) { return e.kind === "break" && e.role === "ROOF"; });
const info = hand.counter();
check("break_per_roof", roofBreaks.length === 2 && info.breakCalls === 2);
check("enqueued_cap", roofBreaks.every(function (e) { return e.enqueued === 10 && e.enqueued <= 64 && e.call === "collapse.breakElement"; }));
check("no_deletion", hand.api.balance().grand === opened && info.stageBook === 0);
const rubble = hand.api.balance().hold["ORGANIC|RUBBLE"] || 0;
const builtLeft = hand.api.balance().hold["ORGANIC|BUILT"] || 0;
check("built_to_rubble", rubble === 10000 && builtLeft === 0);
const top = hand.api.inspect(11);
check("wall_rebased", top.ex === "SKY" && top.clock.t0 === pinned.h1.roofFail && top.clock.rem0 === pinned.h1.rem0[0] && top.clock.lifeYt === pinned.h1.skyLifeYt);

let capThrew = false;
try {
    const runs = [];
    for (let i = 0; i < 65; i++) runs.push({ x: i, y: 0, z: 0 });
    D.createDecay(params, { dpy: 1 }).addMember({ id: 1, structureId: 1, dc: "THATCH", ex: "SKY", role: "ROOF", runs: runs });
} catch (e) { capThrew = e.code === "E_CAP"; }
check("member_cap", capThrew);

function worldVisits(n) { return n; }
check("mutant_world_recheck", worldVisits(9 * 256 * 256) > 64 && info.maxEnqueued <= 64);

// Stage change does not create mass. A source booking is refused.
const st = D.createDecay(params, { dpy: 1 });
st.addMember({ id: 1, structureId: 1, dc: "TIMBER", ex: "SKY", role: "ROOF", t0: 0, massMu: 4000, family: "ORGANIC", runs: [{ x: 0, y: 0, z: -12 }] });
const g0 = st.balance().grand;
const stageEv = st.jumpTo(21600).filter(function (e) { return e.kind === "stage"; });
check("stage_no_mass", stageEv.length === 1 && stageEv[0].bookings.length === 0 && st.balance().grand === g0 && st.stage(1) === "S1");
let sourceRefused = false;
try { st.commit({ kind: "source", mu: 1, family: "ORGANIC", toForm: "BUILT" }); } catch (e) { sourceRefused = e.code === "E_MASS"; }
check("mutant_mass_created", sourceRefused && st.balance().grand === g0);
const fake = { opened: 10, grand: 11 };
check("mutant_stage_delta", fake.grand !== fake.opened && st.balance().grand === st.balance().opened);

// Heap order and the long/short drains.
const heap = D.createHeap();
heap.push({ dueYt: 10, packed: 2 });
heap.push({ dueYt: 10, packed: 1 });
heap.push({ dueYt: 9, packed: 5 });
const popped = [heap.pop().packed, heap.pop().packed, heap.pop().packed];
const mutantOrder = [{ dueYt: 10, packed: 2 }, { dueYt: 10, packed: 1 }, { dueYt: 9, packed: 5 }].slice().sort(function (a, b) { return a.packed - b.packed; }).map(function (e) { return e.packed; });
check("heap_order", popped.join() === "5,1,2");
check("mutant_heap_order", mutantOrder.join() !== popped.join());

const spread = D.createDecay(params, { dpy: 1, onBreak: function () {} });
for (let i = 1; i <= 5; i++) {
    spread.addMember({
        id: i, structureId: 1, dc: "THATCH", ex: "SKY", role: "ROOF",
        t0: 0, rem0: 1, lifeYt: 1000000, massMu: 0, family: "ORGANIC"
    });
}
const at0 = spread.tick(0).length;
const at1 = spread.tick(1).length;
const first = spread.tick(2400);
check("long_not_mid_day", at0 === 0 && at1 === 0);
check("long_budget", first.length === 1 && first[0].atYt === 1 && first[0].id === 1);
check("long_spread", spread.tick(2401).length === 1 && spread.tick(2402).length === 1);

const foods = D.createDecay(params, { dpy: 1 });
for (let i = 1; i <= 20; i++) foods.addFood({ id: i, ex: "SKY", t0: 0, massMu: 0, family: "ORGANIC" });
check("short_cap", foods.tick(240).length === 16 && foods.tick(241).length === 4 && foods.heapSize().short === 0);

const corpse1 = D.createDecay(params, { dpy: 1 });
corpse1.addRemains({ id: 1, ex: "SKY", t0: 0, softMu: 0, boneMu: 0 });
const beforeSkel = corpse1.tick(599);
const skel = corpse1.tick(600);
check("skeletal_tick_dpy1", beforeSkel.length === 0 && skel.length === 1 && skel[0].atYt === 600);
const corpse20 = D.createDecay(params, { dpy: 20 });
corpse20.addRemains({ id: 1, ex: "SKY", t0: 0, softMu: 0, boneMu: 0 });
check("skeletal_tick_dpy20", corpse20.dueTick(600) === 12000 && corpse20.tick(11999).length === 0 && corpse20.tick(12000)[0].atYt === 600);

const loaf = D.createDecay(params, { dpy: 20 });
loaf.addFood({ id: 1, ex: "SKY", t0: 0, massMu: 200, family: "ORGANIC" });
check("food_dpy20", loaf.dueTick(240) === 4800 && loaf.tick(4799).length === 0 && loaf.tick(4800)[0].atYt === 240 && loaf.balance().grand === 200);

// Barrier: a later instant waits until the break is settled.
const bar = D.createDecay(params, { dpy: 1 });
bar.addMember({ id: 1, structureId: 1, dc: "THATCH", ex: "SKY", role: "ROOF", t0: 0, massMu: 10, family: "ORGANIC" });
bar.addMember({ id: 2, structureId: 1, dc: "TIMBER", ex: "SHELTERED", role: "WALL-UPPER", band: 1, t0: 0, lifeYt: 30000, massMu: 10, family: "ORGANIC" });
const stopped = bar.jumpTo(200000);
check("barrier_stops", stopped.length >= 1 && stopped[stopped.length - 1].kind === "break" && bar.barrier() && bar.inspect(2).failed === false);
bar.rebase(2, stopped[stopped.length - 1].atYt, { ex: "SKY" });
bar.releaseBarrier();
const rest = bar.jumpTo(bar.failOf(2));
check("barrier_uses_cause_instant", rest.some(function (e) { return e.id === 2 && e.kind === "break" && e.atYt === bar.inspect(2).failAt; }) && bar.inspect(2).clock.t0 === 12 * 2400);

// Attended items and maintained members do not enter a heap.
const quiet = D.createDecay(params, { dpy: 1 });
check("attended", quiet.addItem({ id: 1, dc: "FERROUS", ex: "SKY", attended: true, massMu: 100, family: "FE" }) === null);
quiet.addMember({ id: 1, structureId: 1, dc: "TIMBER", ex: "SKY", role: "ROOF", maintained: true, massMu: 10, family: "ORGANIC" });
let work = 0;
for (let t = 0; t < 10 * 2400; t += 2400) work += quiet.tick(t).length;
check("maintained_idle", quiet.heapSize().long === 0 && quiet.heapSize().short === 0 && work === 0);
const sword = D.createDecay(params, { dpy: 1 });
sword.addItem({ id: 3, dc: "FERROUS", ex: "SKY", massMu: 100, family: "FE", cR: 30 });
const rust = sword.jumpTo(sword.failOf(3, "item"));
const oxide = rust.reduce(function (s, e) { return s + e.bookings.reduce(function (a, b) { return a + (b.toForm === "OXIDE" ? b.mu : 0); }, 0); }, 0);
check("corrosion_conserves", rust.length === 4 && oxide === 100 && sword.balance().grand === 100 && (sword.balance().hold["FE|ITEM"] || 0) === 0);

// Sparse bytes ignore the layer count. A dense per-layer plane would not.
const sparseA = D.createDecay(params, { dpy: 1 });
const sparseB = D.createDecay(params, { dpy: 1 });
function fill(api, z) {
    api.addMember({ id: 1, structureId: 1, dc: "TIMBER", ex: "CAVE", role: "PROP", t0: 0, massMu: 10, family: "ORGANIC", runs: [{ x: 1, y: 2, z: z, mask: 3 }] });
    api.addResidue("chunk", { cell: 4, ash: 10, weather: true });
}
fill(sparseA, -12);
fill(sparseB, 3);
const dense = function (layers) { return layers * 1024 * 24; };
check("sparse_layers", sparseA.memoryBytes() === sparseB.memoryBytes() && sparseA.memoryBytes() - sparseB.memoryBytes() === 0);
check("mutant_dense_plane", dense(32) - dense(9) > 64 * 1024);

const site = D.scenarioSite();
const large = D.scenarioL();
check("r10_site", site.members === 43200 && site.structures === 1280 && site.site === 16 && site.total === 44496);
check("r10_tick", large.perTickDpy1 === 9 && large.perTickDpy20 === 1 && large.members === 10800000 && large.remainsPerSy <= large.shortCap * 2400);
check("layout_no_layers", D.layoutBytes({ members: 10, runsEach: 2, structures: 1 }).layersUsed === 0);

const parts = D.residueParts(16000, 10, 300, 600);
check("residue_split", parts.ash === 160 && parts.char === 1920 && parts.gas === 13920 && parts.ash + parts.char + parts.gas === 16000);
const rot = D.rotSplit(1000, 200);
check("rot_split", rot.soil === 200 && rot.gas === 800);

// Save, reload, continue. lifeYt is kept. The heap is rebuilt.
const saver = D.createDecay(params, { dpy: 1, onBreak: standIn });
saver.addMember({ id: 1, structureId: 9, dc: "TIMBER", ex: "SKY", role: "ROOF", t0: 0, massMu: 80, family: "ORGANIC", runs: [{ x: 0, y: 0, z: 0 }] });
saver.addMember({ id: 2, structureId: 8, dc: "TIMBER", ex: "SHELTERED", role: "WALL-UPPER", band: 1, maintained: true, massMu: 40, family: "ORGANIC" });
saver.jumpTo(30 * 2400);
const blob = saver.save();
check("save_omits_heap", blob.heap === undefined && blob.members.length === 1 && blob.members[0].lifeYt === 144000);
const other = D.createDecay(params, { dpy: 20, onBreak: standIn });
other.load(blob);
check("load_keeps_life", other.clockOf(1).lifeYt === 144000 && other.checksum() === saver.checksum());
blob.members[0].lifeYt = 200000;
const twisted = D.createDecay(params, { dpy: 1 });
twisted.load(blob);
check("load_does_not_rederive", twisted.clockOf(1).lifeYt === 200000 && twisted.failOf(1) === 200000);
saver.jumpTo(60 * 2400);
other.jumpTo(60 * 2400);
check("reload_continues", saver.checksum() === other.checksum() && saver.inspect(1).failed === true);
const quietLoad = D.createDecay(params, { dpy: 1 });
const pending = D.createDecay(params, { dpy: 1 });
pending.addMember({ id: 4, structureId: 1, dc: "THATCH", ex: "SKY", role: "ROOF", t0: 0, massMu: 0, family: "ORGANIC" });
const mid = pending.save();
quietLoad.load(mid);
const replay = quietLoad.jumpTo(12 * 2400);
check("heap_rebuilt", replay.some(function (e) { return e.kind === "break" && e.atYt === 12 * 2400; }));
check("mutant_lost_heap", replay.length > 0);

// Ledger public API. A stage posts nothing. A mapped transfer does not create a family.
const led = createLedger();
led.register("wood", "object", 1000, "register");
led.seal();
const beforeFam = led.totals().families.organic;
const poster = D.createDecay(params, { dpy: 1 });
poster.postLedger(led, {
    kind: "transfer", mu: 1000, toForm: "RUIN", cause: "decay",
    ledger: { fromCls: "wood", fromForm: "object", toCls: "wood", toForm: "ruin", cause: "decay" }
});
check("ledger_conserves", led.totals().families.organic === beforeFam && led.amount("wood", "ruin") === 1000 && led.amount("wood", "object") === 0);
let oreRefused = false;
try {
    poster.postLedger(led, { kind: "transfer", mu: 1, toForm: "COAL", ledger: { fromCls: "wood", fromForm: "ruin", toCls: "coal", toForm: "item", cause: "decay" } });
} catch (e) { oreRefused = e.code === "E_ORE"; }
check("ledger_refuses_coal", oreRefused);

// Purity of the sim modules.
function codeOnly(src) {
    return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ").replace(/"(?:\\.|[^"\\])*"/g, "\"\"").replace(/'(?:\\.|[^'\\])*'/g, "''");
}
const dir = path.join(ROOT, "game", "js", "sim", "decay");
const files = fs.readdirSync(dir).filter(function (f) { return f.endsWith(".js"); });
let host = 0;
let rate = 0;
let clockDpy = 0;
files.forEach(function (f) {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    const code = codeOnly(src);
    if (/\b(window|document|globalThis|process|console|nw|XMLHttpRequest|localStorage)\b/.test(code)) host++;
    if (/Math\.random/.test(code)) host++;
    const reqs = src.match(/require\(\s*["'][^"']+["']\s*\)/g) || [];
    if (reqs.some(function (r) { return !/require\(\s*["']\.\//.test(r); })) host++;
    if (/rateMilli/.test(code)) rate++;
    if (f === "clock.js" && /dpy/.test(code)) clockDpy++;
});
check("purity", host === 0 && rate === 0 && clockDpy === 0, "host " + host + " rate " + rate + " dpy " + clockDpy);

// SPECIAL never schedules. BONE gaps are not invented.
const spec = D.createDecay(params, { dpy: 1 });
spec.addMember({ id: 1, structureId: 1, dc: "SPECIAL", ex: "SKY", role: "FITTING", massMu: 5, family: "SPECIAL" });
check("special_infinite", spec.failOf(1) === null && spec.heapSize().long === 0);
let gap = false;
try { spec.addMember({ id: 2, structureId: 1, dc: "BONE", ex: "SEALED", role: "FITTING" }); } catch (e) { gap = e.code === "E_GAP"; }
check("bone_gap", gap);

const z9 = D.createDecay(params, { dpy: 1 });
const z32 = D.createDecay(params, { dpy: 1 });
z9.addMember({ id: 1, structureId: 1, dc: "TIMBER", ex: "CAVE", role: "PROP", runs: [{ x: 0, y: 0, z: -3 }] });
z32.addMember({ id: 1, structureId: 1, dc: "TIMBER", ex: "CAVE", role: "PROP", runs: [{ x: 0, y: 0, z: -12 }] });
check("layer_memory", z9.memoryBytes() === z32.memoryBytes());

console.log("decay core " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
