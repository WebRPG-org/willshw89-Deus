"use strict";
// SIM.40.05 decay members, instant-keyed long and short heaps, sparse records,
// and the collapse / ledger hand-off. The clock formulas do not read the calendar.
// A caller passes dpy when an instant is drained. Mass moves only by an equal transfer
// or a named sink. This module does not write plugins or strata.

const clock = require("./clock");
const { createHeap } = require("./heap");
const { validate, lifeCell, scaleOf, badOutput } = require("./validate");

const TICKS = 2400;
const KIND = { member: 0, item: 1, remains: 2, food: 3, residue: 4 };
const RANK = { stage: 0, hp: 1, step: 2, remain: 3, anchor: 4, fail: 5 };
const MAX = Number.MAX_SAFE_INTEGER;

function fail(code, msg) {
    const e = new Error(msg);
    e.code = code;
    throw e;
}
function isUInt(n) { return typeof n === "number" && Number.isSafeInteger(n) && n >= 0; }
function isObj(v) { return typeof v === "object" && v !== null && !Array.isArray(v); }
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function pack(kind, id) {
    if (!isUInt(id) || id > 0x1FFFFFFF) fail("E_RANGE", "id");
    return kind * 0x20000000 + id;
}
function popcount(n) {
    let c = 0;
    let x = n & 31;
    while (x) { c += x & 1; x >>>= 1; }
    return c;
}
function canon(v) {
    if (v === null) return "null";
    if (typeof v === "number" || typeof v === "boolean") return JSON.stringify(v);
    if (typeof v === "string") return JSON.stringify(v);
    if (Array.isArray(v)) {
        const parts = [];
        for (let i = 0; i < v.length; i++) parts.push(canon(v[i]));
        return "[" + parts.join(",") + "]";
    }
    if (isObj(v)) {
        const keys = Object.keys(v).sort();
        const bits = [];
        for (let i = 0; i < keys.length; i++) bits.push(JSON.stringify(keys[i]) + ":" + canon(v[keys[i]]));
        return "{" + bits.join(",") + "}";
    }
    return "null";
}
function fnv1a(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    let s = (h >>> 0).toString(16);
    while (s.length < 8) s = "0" + s;
    return s;
}
function sumMap(m) {
    let t = 0;
    const keys = Object.keys(m);
    for (let i = 0; i < keys.length; i++) t += m[keys[i]];
    return t;
}

function layoutBytes(counts) {
    const c = counts || {};
    const members = (c.members || 0) * (40 + 4 * (c.runsEach || 0));
    const structures = (c.structures || 0) * 32;
    const sites = (c.sites || 0) * 16;
    const heap = (c.heapEntries || 0) * 12;
    const items = (c.items || 0) * (20 + (c.itemHeap === false ? 0 : 12));
    const remains = (c.remains || 0) * (36 + 12);
    const residue = (c.residueCells || 0) * 20 + (c.weatherClocks || 0) * 16;
    return {
        members: members,
        structures: structures,
        sites: sites,
        heap: heap,
        items: items,
        remains: remains,
        residue: residue,
        total: members + structures + sites + heap + items + remains + residue,
        layersUsed: 0
    };
}
function scenarioSite() {
    const row = layoutBytes({ members: 600, runsEach: 8, structures: 40, sites: 1 });
    return { members: row.members, structures: row.structures, site: row.sites, total: row.members + row.structures + row.sites };
}
function scenarioL() {
    return {
        members: 150000 * 72,
        structures: 10000 * 32,
        heapMembers: 45000 * 12,
        items: 200000 * 32,
        remains: 41700 * 48,
        eventsPerSy: 20000,
        perTickDpy1: clock.ceilDiv(20000, TICKS),
        perTickDpy20: clock.ceilDiv(20000, TICKS * 20),
        shortCap: 16,
        remainsPerSy: 2500
    };
}
function residueParts(mu, ashMilli, charMilli, kappaMilli) {
    if (!isUInt(mu) || !isUInt(ashMilli) || !isUInt(charMilli) || !isUInt(kappaMilli)) fail("E_RANGE", "residue");
    if (ashMilli > 1000 || charMilli > 1000 || kappaMilli > 1000) fail("E_RANGE", "residue");
    const ash = clock.floorDiv(clock.mul(mu, ashMilli), 1000);
    const char = clock.floorDiv(clock.mul(clock.mul(mu, charMilli), 1000 - kappaMilli), 1000000);
    if (ash + char > mu) fail("E_MASS", "residue");
    return { ash: ash, char: char, gas: mu - ash - char };
}
function rotSplit(mu, humusMilli) {
    if (!isUInt(mu) || !isUInt(humusMilli) || humusMilli > 1000) fail("E_RANGE", "rot");
    const soil = clock.floorDiv(clock.mul(mu, humusMilli), 1000);
    return { soil: soil, gas: mu - soil };
}

function createDecay(params, opts) {
    const checked = validate(params);
    if (!checked.ok) {
        const e = fail("E_SCHEMA", checked.errors.map(function (x) { return x.code + ":" + x.path; }).join("; "));
        throw e;
    }
    const opt = opts || {};
    if (!isUInt(opt.dpy) || opt.dpy < 1) fail("E_DPY", "dpy is required and is not chosen by this module");
    const dpy = opt.dpy;
    const onBreak = opt.onBreak;
    const s1Rem = params.stages.s1Rem;
    const floorRem = params.stages.foundationFloorRem;
    const steps = params.stages.steps;
    const bShort = params.scheduler.bShort;
    const cap = params.scheduler.memberCap;
    const tag04 = params.tags["OQ-R-04"];

    const records = new Map();
    const long = createHeap();
    const short = createHeap();
    const byDay = new Map();
    const residue = new Map();
    const hold = {};
    const sink = {};
    const source = {};
    let opened = 0;
    let now = 0;
    let lastTick = -1;
    let barrier = null;
    let supportVisits = 0;

    function noteDay(day, delta) {
        const n = (byDay.get(day) || 0) + delta;
        if (n === 0) byDay.delete(day);
        else byDay.set(day, n);
    }
    function dayDue(dueYt) {
        return clock.ceilDiv(clock.mul(dueYt, dpy), TICKS);
    }
    function holdKey(family, form) { return family + "|" + form; }
    function addHold(key, delta) {
        const v = (hold[key] || 0) + delta;
        if (v < 0 || v > MAX) fail("E_MASS", key);
        if (v === 0) delete hold[key];
        else hold[key] = v;
    }
    function grand() { return sumMap(hold) + sumMap(sink) - sumMap(source); }
    function openMass(family, form, mu) {
        if (!mu) return;
        if (!isUInt(mu) || typeof family !== "string" || typeof form !== "string") fail("E_RANGE", "mass");
        addHold(holdKey(family, form), mu);
        opened += mu;
    }
    function commit(rec) {
        if (!isObj(rec) || !isUInt(rec.mu)) fail("E_SCHEMA", "booking");
        if (rec.applied) fail("E_MASS", "booking already applied");
        if (rec.kind === "source" || sourceHas(rec)) fail("E_MASS", "decay does not create mass");
        if (badOutput(rec.toForm) || badOutput(rec.to) || (rec.ledger && badOutput(rec.ledger.toCls))) fail("E_ORE", "forbidden output");
        if (rec.kind === "transfer") {
            if (typeof rec.family !== "string" || typeof rec.fromForm !== "string" || typeof rec.toForm !== "string") fail("E_SCHEMA", "transfer");
            if (rec.fromForm === rec.toForm) fail("E_SCHEMA", "transfer");
            addHold(holdKey(rec.family, rec.fromForm), -rec.mu);
            addHold(holdKey(rec.family, rec.toForm), rec.mu);
        } else if (rec.kind === "sink") {
            if (typeof rec.family !== "string" || typeof rec.fromForm !== "string" || typeof rec.sink !== "string") fail("E_SCHEMA", "sink");
            addHold(holdKey(rec.family, rec.fromForm), -rec.mu);
            sink[rec.sink + "|" + rec.family] = (sink[rec.sink + "|" + rec.family] || 0) + rec.mu;
        } else fail("E_SCHEMA", "booking kind");
        rec.applied = true;
        if (grand() !== opened) fail("E_MASS", "balance");
        return rec;
    }
    function sourceHas(rec) { return rec.kind === "source"; }
    function postLedger(ledger, rec) {
        if (!isObj(rec) || rec.kind === "source") fail("E_MASS", "decay does not create mass");
        if (!isObj(rec.ledger)) fail("E_SCHEMA", "ledger row");
        if (badOutput(rec.toForm) || badOutput(rec.ledger.toCls) || badOutput(rec.ledger.cls)) fail("E_ORE", "forbidden output");
        const L = rec.ledger;
        const cause = L.cause || rec.cause;
        if (rec.kind === "transfer") ledger.transform(L.fromCls, L.fromForm, L.toCls, L.toForm, rec.mu, cause);
        else if (rec.kind === "sink") ledger.sink(L.sink, L.cls, L.form, rec.mu, cause);
        else fail("E_SCHEMA", "ledger booking");
    }

    function cellsOf(rec) {
        const out = [];
        for (let i = 0; i < rec.runs.length; i++) {
            const r = rec.runs[i];
            out.push({ x: r.x, y: r.y, z: r.z, mask: r.mask });
        }
        return out;
    }
    function checkRuns(runs) {
        if (!Array.isArray(runs)) fail("E_SCHEMA", "runs");
        if (runs.length > cap) fail("E_CAP", "cells");
        let strata = 0;
        for (let i = 0; i < runs.length; i++) {
            const r = runs[i];
            if (!isObj(r) || !isUInt(r.x) || !isUInt(r.y) || typeof r.z !== "number" || !Number.isSafeInteger(r.z)) fail("E_RANGE", "run");
            const bits = r.mask == null ? 1 : popcount(r.mask);
            strata += bits;
        }
        if (strata > cap) fail("E_CAP", "strata");
        return runs.map(function (r) { return { x: r.x, y: r.y, z: r.z, mask: r.mask == null ? 1 : (r.mask & 31) }; });
    }
    function modifiersOf(dc, spec) {
        const ftMilli = spec.ftMilli == null ? 0 : spec.ftMilli;
        const layer = spec.layer == null ? 0 : spec.layer;
        const wR = spec.wR == null ? 0 : spec.wR;
        const ft8 = spec.ft8 != null ? spec.ft8 : clock.ft8Of(dc, ftMilli, wR, layer);
        const root8 = spec.root8 != null ? spec.root8 : clock.root8Of(dc, !!spec.roots);
        const fire8 = spec.fire8 != null ? spec.fire8 : clock.fire8Of(dc, !!spec.charred);
        return { ft8: ft8, root8: root8, fire8: fire8, layer: layer };
    }
    function lifeOf(dc, ex, spec) {
        if (spec && spec.lifeYt != null) {
            if (spec.lifeYt !== clock.LIFE_INF && (!isUInt(spec.lifeYt) || spec.lifeYt < 1 || spec.lifeYt > clock.LIFE_MAX)) fail("E_LIFE_YT", "override");
            return spec.lifeYt;
        }
        const cell = lifeCell(params, dc, ex);
        if (cell.kind === "gap") fail("E_GAP", dc + " " + ex);
        if (cell.kind === "inf") return clock.LIFE_INF;
        if (cell.kind !== "finite") fail("E_LIFE", dc + " " + ex);
        const sc = scaleOf(params, dc, spec || {});
        const mod = modifiersOf(dc, spec || {});
        return clock.lifeYt(cell.milli, sc.fieldNum, sc.fieldDen, mod.ft8, mod.root8, mod.fire8);
    }
    function defaultThresholds(maxHP) {
        const out = [];
        for (let i = 1; i < steps; i++) {
            const k = Math.floor(maxHP * i / steps);
            if (k > 0 && k < maxHP && out.indexOf(k) < 0) out.push(k);
        }
        return out;
    }
    function buildPoints(rec) {
        if (rec.pointMode === "explicit") {
            return rec.pointSeed.map(function (p) { return { kind: p.kind, rem: p.rem, k: p.k, stage: p.stage, done: false }; })
                .filter(function (p) { return p.rem < rec.clock.rem0; });
        }
        const pts = [];
        const end = rec.role === "FOUNDATION" ? floorRem : 0;
        if (rec.kindName === "member" && rec.role !== "FOUNDATION") pts.push({ kind: "stage", rem: s1Rem, stage: "S1", done: false });
        const limits = rec.thresholds || [];
        for (let i = 0; i < limits.length; i++) {
            const rem = clock.thresholdRem(limits[i], rec.maxHP);
            if (rem > end) pts.push({ kind: "hp", rem: rem, k: limits[i], done: false });
        }
        pts.push({ kind: rec.role === "FOUNDATION" ? "anchor" : "fail", rem: end, done: false });
        return pts.filter(function (p) { return p.rem < rec.clock.rem0; });
    }
    function markPassed(rec) {
        for (let i = 0; i < rec.points.length; i++) {
            const p = rec.points[i];
            const c = clock.cross(rec.clock, p.rem);
            if (c !== null && c <= now) p.done = true;
        }
    }
    function nextDue(rec) {
        let best = null;
        for (let i = 0; i < rec.points.length; i++) {
            const p = rec.points[i];
            if (p.done) continue;
            const due = clock.cross(rec.clock, p.rem);
            if (due === null) continue;
            if (!best || due < best.due || (due === best.due && p.rem > best.p.rem)) best = { p: p, due: due };
        }
        return best;
    }
    function heapFor(rec) {
        if (rec.kindName === "remains" || rec.kindName === "food" || rec.dc === "FOOD") return "short";
        if (rec.clock.lifeYt !== clock.LIFE_INF && rec.clock.lifeYt < TICKS) return "short";
        return "long";
    }
    function disarm(rec) {
        if (!rec.scheduled) return;
        const heap = rec.heapName === "short" ? short : long;
        heap.remove(rec.packed);
        if (rec.heapName === "long") noteDay(rec.heapDay, -1);
        rec.scheduled = false;
    }
    function arm(rec) {
        disarm(rec);
        if (rec.maintained || rec.failed || rec.anchored) return;
        if (rec.clock.lifeYt === clock.LIFE_INF) return;
        if (rec.attended && tag04.attendedDecays !== true) return;
        const nxt = nextDue(rec);
        if (!nxt) return;
        const which = heapFor(rec);
        const day = dayDue(nxt.due);
        const entry = { dueYt: nxt.due, packed: rec.packed, day: day };
        if (which === "short") short.push(entry);
        else { long.push(entry); noteDay(day, 1); }
        rec.scheduled = true;
        rec.heapName = which;
        rec.heapDay = day;
    }
    function piece(total, moved, isLast) {
        const left = total - moved;
        if (left <= 0) return 0;
        if (isLast) return left;
        const each = clock.floorDiv(total, steps);
        return each < left ? each : left;
    }
    function bookTransfer(family, fromForm, toForm, mu, cause, owner) {
        if (!mu) return null;
        const row = { kind: "transfer", family: family, fromForm: fromForm, toForm: toForm, mu: mu, cause: cause, applied: false };
        if (owner) row.owner = owner;
        return row;
    }
    function bookSink(family, fromForm, mu, name, cause) {
        if (!mu) return null;
        return { kind: "sink", family: family, fromForm: fromForm, mu: mu, sink: name, cause: cause, applied: false };
    }

    function emit(rec, point, atYt) {
        const cells = cellsOf(rec);
        supportVisits += cells.length;
        const ev = {
            kind: point.kind === "hp" ? "hp" : point.kind,
            id: rec.id,
            recordKind: rec.kindName,
            atYt: atYt,
            structureId: rec.structureId,
            role: rec.role,
            dc: rec.dc,
            ex: rec.ex,
            band: rec.band,
            rem: clock.remAt(rec.clock, atYt),
            hp: clock.hpByte(rec.maxHP, clock.remAt(rec.clock, atYt)),
            cells: cells,
            enqueued: cells.length,
            bookings: []
        };
        if (point.kind === "stage") {
            ev.stage = point.stage || "S1";
            rec.sawStage = ev.stage;
        } else if (point.kind === "hp") {
            ev.hp = point.k;
            ev.threshold = point.k;
            rec.hpWrites += 1;
            const mu = piece(clock.floorDiv(clock.mul(rec.mass0, rec.fShedMilli || 0), 1000), rec.shedBooked, false);
            const row = bookTransfer(rec.family, "BUILT", "FINES", mu, "decay.shed");
            if (row) { commit(row); rec.shedBooked += mu; rec.shedPool += mu; ev.bookings.push(row); }
        } else if (point.kind === "step") {
            const mu = piece(rec.mass0, rec.moved, false);
            const row = bookTransfer(rec.family, "ITEM", "OXIDE", mu, "decay.corrode");
            if (row) { commit(row); rec.moved += mu; ev.bookings.push(row); }
            rec.hpWrites += 1;
        } else if (point.kind === "anchor") {
            const mu = piece(clock.floorDiv(clock.mul(rec.mass0, rec.fShedMilli || 0), 1000), rec.shedBooked, true);
            const row = bookTransfer(rec.family, "BUILT", "FINES", mu, "decay.shed");
            if (row) { commit(row); rec.shedBooked += mu; rec.shedPool += mu; ev.bookings.push(row); }
            rec.anchored = true;
            ev.anchor = true;
        } else if (point.kind === "fail" && rec.kindName === "member") {
            const mu = piece(clock.floorDiv(clock.mul(rec.mass0, rec.fShedMilli || 0), 1000), rec.shedBooked, true);
            const shed = bookTransfer(rec.family, "BUILT", "FINES", mu, "decay.shed");
            if (shed) { commit(shed); rec.shedBooked += mu; rec.shedPool += mu; ev.bookings.push(shed); }
            const left = rec.mass0 - rec.shedBooked;
            const brk = bookTransfer(rec.family, "BUILT", "RUBBLE", left, "collapse.decay", "laneQ");
            if (brk) ev.bookings.push(brk);
            ev.kind = "break";
            ev.call = "collapse.breakElement";
            rec.failed = true;
            rec.failAt = atYt;
        } else if (point.kind === "fail") {
            if (rec.corrode) {
                const mu = piece(rec.mass0, rec.moved, true);
                const row = bookTransfer(rec.family, "ITEM", "OXIDE", mu, "decay.corrode");
                if (row) { commit(row); rec.moved += mu; ev.bookings.push(row); }
            } else {
                const split = rotSplit(rec.mass0 - rec.moved, rec.humusMilli || 0);
                const soil = bookTransfer(rec.family, rec.fromForm, "SOIL-ORG", split.soil, "decay.rot");
                const gas = bookSink(rec.family, rec.fromForm, split.gas, "AIR", "decay.rot.outgas");
                if (soil) { commit(soil); ev.bookings.push(soil); }
                if (gas) { commit(gas); ev.bookings.push(gas); }
                rec.moved = rec.mass0;
            }
            rec.failed = true;
            rec.failAt = atYt;
            ev.kind = "fail";
        } else if (point.kind === "remain") {
            ev.kind = "remain";
            ev.stage = rec.stageName;
            if (rec.stageName === "FRESH") {
                const split = rotSplit(rec.softMu, params.remains.softHumusMilli);
                const soil = bookTransfer(rec.family, "REMAINS", "SOIL-ORG", split.soil, "decay.rot");
                const gas = bookSink(rec.family, "REMAINS", split.gas, "AIR", "decay.rot.outgas");
                if (soil) { commit(soil); ev.bookings.push(soil); }
                if (gas) { commit(gas); ev.bookings.push(gas); }
                rec.softMu = 0;
                rec.stageName = "SKELETAL";
                const nextMilli = params.remains.skeletalToSoilMilli[rec.ex];
                const ly = clock.lifeYt(nextMilli, 1, 1, 8, 8, 8);
                rec.clock = { t0: atYt, rem0: clock.R, lifeYt: ly };
                rec.points = [{ kind: "remain", rem: 0, done: false }];
                ev.next = "SKELETAL";
            } else {
                const bone = bookTransfer(rec.boneFamily || rec.family, "REMAINS", "SOIL-MIN", rec.boneMu, "decay.bone");
                if (bone) { commit(bone); ev.bookings.push(bone); }
                rec.boneMu = 0;
                rec.stageName = "GONE";
                rec.failed = true;
                rec.failAt = atYt;
                rec.anchorUntil = rec.born + params.remains.anchorYears * TICKS;
                ev.next = "GONE";
            }
        }
        ev.structureStage = stageOf(rec.structureId, atYt);
        return ev;
    }

    function fire(rec, due) {
        if (rec.pointMode === "remains" || (rec.points[0] && rec.points[0].kind === "remain")) {
            const p = rec.points[0];
            p.done = true;
            const ev = emit(rec, p, due);
            if (!rec.failed) arm(rec);
            return [ev];
        }
        const batch = [];
        for (let i = 0; i < rec.points.length; i++) {
            const p = rec.points[i];
            if (p.done) continue;
            const c = clock.cross(rec.clock, p.rem);
            if (c !== null && c <= due) batch.push(p);
        }
        batch.sort(function (a, b) {
            if (a.rem !== b.rem) return b.rem - a.rem;
            return (RANK[a.kind] || 9) - (RANK[b.kind] || 9);
        });
        const out = [];
        for (let i = 0; i < batch.length; i++) {
            batch[i].done = true;
            out.push(emit(rec, batch[i], due));
            if (rec.failed || rec.anchored) break;
        }
        if (!rec.failed && !rec.anchored) arm(rec);
        return out;
    }
    function take(which) {
        const heap = which === "short" ? short : long;
        const top = heap.pop();
        const rec = records.get(top.packed);
        if (which === "long") noteDay(top.day, -1);
        rec.scheduled = false;
        return fire(rec, top.dueYt);
    }
    function earliest() {
        const a = long.peek();
        const b = short.peek();
        if (!a && !b) return null;
        if (!a) return { which: "short", dueYt: b.dueYt, packed: b.packed };
        if (!b) return { which: "long", dueYt: a.dueYt, packed: a.packed };
        if (a.dueYt < b.dueYt || (a.dueYt === b.dueYt && a.packed <= b.packed)) return { which: "long", dueYt: a.dueYt, packed: a.packed };
        return { which: "short", dueYt: b.dueYt, packed: b.packed };
    }
    function acceptBreak(evs) {
        const out = [];
        for (let i = 0; i < evs.length; i++) {
            out.push(evs[i]);
            if (evs[i].kind === "break") {
                barrier = { atYt: evs[i].atYt };
                if (typeof onBreak === "function") {
                    onBreak(evs[i], api);
                    barrier = null;
                }
            }
        }
        return out;
    }
    function pump(limit) {
        const out = [];
        while (!barrier) {
            const top = earliest();
            if (!top) break;
            if (limit !== null && top.dueYt > limit) break;
            const evs = acceptBreak(take(top.which));
            for (let i = 0; i < evs.length; i++) out.push(evs[i]);
            if (barrier) break;
        }
        return out;
    }

    function stageOf(structureId, t) {
        if (structureId == null) return null;
        let roof = 0, roofFail = 0, walls = 0, wallsFail = 0, low = false;
        records.forEach(function (rec) {
            if (rec.kindName !== "member" || rec.structureId !== structureId) return;
            const dead = rec.failed || (rec.clock.lifeYt !== clock.LIFE_INF && clock.failYt(rec.clock) !== null && t >= clock.failYt(rec.clock) && rec.role !== "FOUNDATION");
            const rem = dead ? 0 : clock.remAt(rec.clock, t < rec.clock.t0 ? rec.clock.t0 : t);
            if (rem <= s1Rem) low = true;
            if (rec.role === "ROOF") { roof += rec.mass0; if (dead) roofFail += rec.mass0; }
            if (rec.role === "WALL-UPPER") { walls += 1; if (dead) wallsFail += 1; }
        });
        if (walls > 0 && wallsFail === walls) return "S4";
        if (roof > 0 && roofFail * 2 >= roof && wallsFail < walls) return "S3";
        if (low || roofFail > 0 || wallsFail > 0) return "S1";
        return "S0";
    }

    function put(rec) {
        if (records.has(rec.packed)) fail("E_DUP", "id");
        records.set(rec.packed, rec);
        if (rec.mass0 && rec.trackMass !== false) openMass(rec.family, rec.fromForm, rec.mass0);
        rec.points = buildPoints(rec);
        arm(rec);
        return rec.id;
    }
    function baseRec(kindName, spec) {
        const id = spec.id;
        const kind = KIND[kindName];
        const dc = spec.dc;
        const ex = spec.ex;
        const t0 = spec.t0 == null ? 0 : spec.t0;
        const rem0 = spec.rem0 == null ? clock.R : spec.rem0;
        if (!isUInt(t0) || !isUInt(rem0) || rem0 > clock.R || rem0 < 1) fail("E_RANGE", "clock");
        const ly = lifeOf(dc, ex, spec);
        return {
            packed: pack(kind, id),
            id: id,
            kindName: kindName,
            dc: dc,
            ex: ex,
            role: spec.role || null,
            structureId: spec.structureId == null ? null : spec.structureId,
            band: spec.band == null ? null : spec.band,
            clock: { t0: t0, rem0: rem0, lifeYt: ly },
            maxHP: spec.maxHP == null ? 120 : spec.maxHP,
            thresholds: spec.thresholds || null,
            runs: spec.runs ? checkRuns(spec.runs) : [],
            mass0: spec.massMu == null ? 0 : spec.massMu,
            family: spec.family || "UNSET",
            fromForm: spec.fromForm || "BUILT",
            fShedMilli: spec.fShedMilli == null ? ((params.classes[dc] && params.classes[dc].fShedMilli) || 0) : spec.fShedMilli,
            humusMilli: spec.humusMilli == null ? ((params.classes[dc] && params.classes[dc].humusMilli) || 0) : spec.humusMilli,
            shedBooked: 0,
            shedPool: 0,
            moved: 0,
            hpWrites: 0,
            maintained: !!spec.maintained,
            attended: !!spec.attended,
            failed: false,
            anchored: false,
            scheduled: false,
            layer: spec.layer == null ? 0 : spec.layer,
            pointMode: spec.pointMode || "member",
            pointSeed: spec.pointSeed || null,
            scale: scaleOf(params, dc, spec),
            wR: spec.wR == null ? null : spec.wR,
            ftMilli: spec.ftMilli == null ? 0 : spec.ftMilli,
            roots: !!spec.roots,
            charred: !!spec.charred,
            corrode: false
        };
    }

    function addMember(spec) {
        if (!isObj(spec)) fail("E_SCHEMA", "member");
        if (spec.maintained) {
            const rec = baseRec("member", spec);
            rec.fromForm = "BUILT";
            rec.thresholds = spec.thresholds || defaultThresholds(rec.maxHP);
            if (records.has(rec.packed)) fail("E_DUP", "id");
            records.set(rec.packed, rec);
            if (rec.mass0) openMass(rec.family, "BUILT", rec.mass0);
            rec.points = buildPoints(rec);
            return rec.id;
        }
        const rec = baseRec("member", spec);
        rec.fromForm = "BUILT";
        rec.role = spec.role;
        if (params.roles.indexOf(rec.role) < 0) fail("E_SCHEMA", "role");
        rec.thresholds = spec.thresholds || defaultThresholds(rec.maxHP);
        return put(rec);
    }
    function addItem(spec) {
        if (tag04.itemWeathering === false) return null;
        if (spec.attended && tag04.attendedDecays !== true) return null;
        const cls = params.classes[spec.dc];
        const rec = baseRec("item", spec);
        rec.fromForm = "ITEM";
        rec.kindName = spec.dc === "FOOD" ? "food" : "item";
        rec.packed = pack(spec.dc === "FOOD" ? KIND.food : KIND.item, spec.id);
        if (cls && cls.corrosionSteps) {
            rec.corrode = true;
            rec.pointMode = "explicit";
            rec.pointSeed = [
                { kind: "step", rem: 750000 },
                { kind: "step", rem: 500000 },
                { kind: "step", rem: 250000 },
                { kind: "fail", rem: 0 }
            ];
        } else {
            rec.pointMode = "explicit";
            rec.pointSeed = [{ kind: "fail", rem: 0 }];
        }
        return put(rec);
    }
    function addFood(spec) {
        const copy = {};
        Object.keys(spec).forEach(function (k) { copy[k] = spec[k]; });
        copy.dc = spec.dc || "FOOD";
        return addItem(copy);
    }
    function addRemains(spec) {
        if (spec.frozen) {
            const rec = baseRec("remains", Object.assign({}, spec, { dc: spec.dc || "FLESH", lifeYt: clock.LIFE_INF }));
            rec.kindName = "remains";
            rec.packed = pack(KIND.remains, spec.id);
            rec.clock = { t0: rec.clock.t0, rem0: clock.R, lifeYt: clock.LIFE_INF };
            rec.fromForm = "REMAINS";
            rec.family = spec.family || "ORGANIC";
            rec.softMu = spec.softMu || 0;
            rec.boneMu = spec.boneMu || 0;
            rec.stageName = "FRESH";
            rec.born = rec.clock.t0;
            rec.pointMode = "explicit";
            rec.pointSeed = [];
            rec.mass0 = 0;
            if (records.has(rec.packed)) fail("E_DUP", "id");
            records.set(rec.packed, rec);
            openMass(rec.family, "REMAINS", rec.softMu);
            if ((spec.boneFamily || "BONE") && rec.boneMu) openMass(spec.boneFamily || "BONE", "REMAINS", rec.boneMu);
            rec.boneFamily = spec.boneFamily || "BONE";
            return rec.id;
        }
        const milli = params.remains.freshToSkeletalMilli[spec.ex];
        if (!isUInt(milli)) fail("E_GAP", "remains " + spec.ex);
        const freshYt = clock.lifeYt(milli, 1, 1, 8, 8, 8);
        const rec = baseRec("remains", Object.assign({}, spec, { dc: spec.dc || "FLESH", lifeYt: freshYt, rem0: clock.R }));
        rec.kindName = "remains";
        rec.packed = pack(KIND.remains, spec.id);
        rec.clock = { t0: spec.t0 == null ? 0 : spec.t0, rem0: clock.R, lifeYt: clock.lifeYt(milli, 1, 1, 8, 8, 8) };
        rec.fromForm = "REMAINS";
        rec.family = spec.family || "ORGANIC";
        rec.boneFamily = spec.boneFamily || "BONE";
        rec.softMu = spec.softMu || 0;
        rec.boneMu = spec.boneMu || 0;
        rec.stageName = "FRESH";
        rec.born = rec.clock.t0;
        rec.pointMode = "remains";
        rec.mass0 = 0;
        if (records.has(rec.packed)) fail("E_DUP", "id");
        records.set(rec.packed, rec);
        openMass(rec.family, "REMAINS", rec.softMu);
        openMass(rec.boneFamily, "REMAINS", rec.boneMu);
        rec.points = [{ kind: "remain", rem: 0, done: false }];
        arm(rec);
        return rec.id;
    }

    function must(id, kindName) {
        const kind = KIND[kindName || "member"];
        const rec = records.get(pack(kind, id));
        if (!rec) fail("E_RANGE", "missing record");
        return rec;
    }
    function retarget(rec, nextClock, ex) {
        rec.clock = nextClock;
        if (ex) rec.ex = ex;
        rec.failed = false;
        rec.anchored = false;
        rec.points = buildPoints(rec);
        arm(rec);
        return { ok: true, clock: { t0: rec.clock.t0, rem0: rec.clock.rem0, lifeYt: rec.clock.lifeYt }, ex: rec.ex };
    }

    const api = {
        dpy: dpy,
        addMember: addMember,
        addItem: addItem,
        addFood: addFood,
        addRemains: addRemains,
        rem: function (id, t, kindName) { return clock.remAt(must(id, kindName).clock, t); },
        hp: function (id, t, kindName) {
            const rec = must(id, kindName);
            return clock.hpByte(rec.maxHP, clock.remAt(rec.clock, t));
        },
        clockOf: function (id, kindName) {
            const c = must(id, kindName).clock;
            return { t0: c.t0, rem0: c.rem0, lifeYt: c.lifeYt };
        },
        failOf: function (id, kindName) { return clock.failYt(must(id, kindName).clock); },
        inspect: function (id, kindName) {
            const rec = must(id, kindName);
            return {
                id: rec.id, kind: rec.kindName, dc: rec.dc, ex: rec.ex, role: rec.role, band: rec.band,
                structureId: rec.structureId, clock: { t0: rec.clock.t0, rem0: rec.clock.rem0, lifeYt: rec.clock.lifeYt },
                failed: rec.failed, anchored: rec.anchored, maintained: rec.maintained, scheduled: rec.scheduled,
                hpWrites: rec.hpWrites, shedBooked: rec.shedBooked, shedPool: rec.shedPool, moved: rec.moved,
                mass0: rec.mass0, stageName: rec.stageName, heapName: rec.heapName || null,
                runs: rec.runs.length, failAt: rec.failAt == null ? null : rec.failAt
            };
        },
        membersOf: function (structureId) {
            const out = [];
            records.forEach(function (rec) {
                if (rec.kindName === "member" && rec.structureId === structureId) out.push(api.inspect(rec.id, "member"));
            });
            out.sort(function (a, b) { return a.id - b.id; });
            return out;
        },
        rebase: function (id, t1, patch, kindName) {
            const rec = must(id, kindName);
            if (rec.failed) return { ok: false, code: "E_ALREADY_FAILED" };
            const spec = patch || {};
            const ex = spec.ex || rec.ex;
            const merged = {
                rR: spec.rR, cR: spec.cR,
                ft8: spec.ft8, root8: spec.root8, fire8: spec.fire8,
                lifeYt: spec.lifeYt,
                layer: spec.layer == null ? rec.layer : spec.layer,
                roots: spec.roots != null ? spec.roots : rec.roots,
                charred: spec.charred != null ? spec.charred : rec.charred,
                ftMilli: spec.ftMilli != null ? spec.ftMilli : rec.ftMilli,
                wR: spec.wR != null ? spec.wR : rec.wR
            };
            if (spec.fieldNum == null && spec.wR == null && spec.rR == null && spec.cR == null && rec.scale) {
                merged.fieldNum = rec.scale.fieldNum;
                merged.fieldDen = rec.scale.fieldDen;
            } else {
                merged.fieldNum = spec.fieldNum;
                merged.fieldDen = spec.fieldDen;
            }
            const ly = lifeOf(rec.dc, ex, merged);
            const result = clock.rebase(rec.clock, t1, ly);
            if (!result.ok) return result;
            rec.layer = merged.layer;
            rec.roots = merged.roots;
            rec.charred = merged.charred;
            rec.ftMilli = merged.ftMilli;
            if (merged.wR != null) rec.wR = merged.wR;
            rec.scale = scaleOf(params, rec.dc, merged);
            return retarget(rec, result.clock, ex);
        },
        damage: function (id, t1, k, kindName) {
            const rec = must(id, kindName);
            const result = clock.applyDamage(rec.clock, t1, k, rec.maxHP);
            if (!result.ok) return result;
            return retarget(rec, result.clock, rec.ex);
        },
        repair: function (id, t1, kindName) {
            const rec = must(id, kindName);
            const result = clock.applyRepair(rec.clock, t1);
            return retarget(rec, result.clock, rec.ex);
        },
        setMaintained: function (id, on) {
            const rec = must(id, "member");
            rec.maintained = !!on;
            if (on) disarm(rec);
            else arm(rec);
        },
        commit: commit,
        postLedger: postLedger,
        jumpTo: function (yt) {
            if (!isUInt(yt)) fail("E_RANGE", "jump");
            if (yt < now) fail("E_RANGE", "jump");
            const evs = pump(yt);
            if (barrier) {
                if (barrier.atYt > now) now = barrier.atYt;
            } else now = yt;
            return evs;
        },
        tick: function (tickIndex) {
            if (!isUInt(tickIndex) || (lastTick >= 0 && tickIndex <= lastTick)) fail("E_RANGE", "tick");
            lastTick = tickIndex;
            const out = [];
            let n = 0;
            while (n < bShort && !barrier) {
                const top = short.peek();
                if (!top || top.dueYt > clock.floorDiv(tickIndex, dpy)) break;
                const evs = acceptBreak(take("short"));
                for (let i = 0; i < evs.length; i++) out.push(evs[i]);
                n += 1;
                if (barrier) return out;
            }
            const day = clock.floorDiv(tickIndex, TICKS);
            const top = long.peek();
            if (!top || top.day > day) return out;
            const due = (function () {
                let s = 0;
                byDay.forEach(function (count, d) { if (d <= day) s += count; });
                return s;
            })();
            const budget = due === 0 ? 0 : clock.ceilDiv(due, TICKS);
            let m = 0;
            while (m < budget && !barrier) {
                const cur = long.peek();
                if (!cur || cur.day > day) break;
                const evs = acceptBreak(take("long"));
                for (let i = 0; i < evs.length; i++) out.push(evs[i]);
                m += 1;
            }
            return out;
        },
        releaseBarrier: function () { barrier = null; },
        barrier: function () { return barrier ? { atYt: barrier.atYt } : null; },
        dayDue: dayDue,
        dueTick: function (yt) { return clock.mul(yt, dpy); },
        stage: function (structureId, t) { return stageOf(structureId, t == null ? now : t); },
        balance: function () { return { hold: clone(hold), sink: clone(sink), source: clone(source), opened: opened, grand: grand() }; },
        heapSize: function () { return { long: long.size(), short: short.size() }; },
        supportVisits: function () { return supportVisits; },
        memoryBytes: function () {
            let n = 0;
            let structures = {};
            records.forEach(function (rec) {
                if (rec.kindName === "member") {
                    n += 40 + 4 * rec.runs.length;
                    if (rec.scheduled) n += 12;
                    if (rec.structureId != null) structures[rec.structureId] = 1;
                } else if (rec.kindName === "remains") {
                    n += 36;
                    if (rec.scheduled) n += 12;
                } else {
                    n += 20;
                    if (rec.scheduled) n += 12;
                }
            });
            n += Object.keys(structures).length * 32;
            residue.forEach(function (list) {
                if (list.length <= 64) n += list.length * 20;
                else n += 24576;
                for (let i = 0; i < list.length; i++) if (list[i].weather) n += 16;
            });
            return n;
        },
        addResidue: function (chunkId, entry) {
            if (typeof chunkId !== "string") fail("E_SCHEMA", "chunk");
            let list = residue.get(chunkId);
            if (!list) { list = []; residue.set(chunkId, list); }
            list.push({
                cell: entry.cell,
                ash: entry.ash || 0,
                char: entry.char || 0,
                weather: !!entry.weather
            });
        },
        abandonYt: function (dc) {
            const years = params.abandonYears[dc] != null ? params.abandonYears[dc] : params.abandonYears.DEFAULT;
            return years * TICKS;
        },
        save: function () {
            const blob = { schema: 1, now: now, opened: opened, hold: clone(hold), sink: clone(sink), members: [], items: [], remains: [], residue: [] };
            const rows = [];
            records.forEach(function (rec) { rows.push(rec); });
            rows.sort(function (a, b) { return a.packed - b.packed; });
            for (let i = 0; i < rows.length; i++) {
                const rec = rows[i];
                if (rec.kindName === "member" && rec.maintained) continue;
                const row = {
                    id: rec.id, kind: rec.kindName, dc: rec.dc, ex: rec.ex, role: rec.role, band: rec.band,
                    structureId: rec.structureId, t0: rec.clock.t0, rem0: rec.clock.rem0, lifeYt: rec.clock.lifeYt,
                    maxHP: rec.maxHP, thresholds: rec.thresholds, runs: rec.runs, mass0: rec.mass0, family: rec.family,
                    fromForm: rec.fromForm, shedBooked: rec.shedBooked, shedPool: rec.shedPool, moved: rec.moved,
                    failed: rec.failed, anchored: rec.anchored, failAt: rec.failAt == null ? null : rec.failAt,
                    stageName: rec.stageName || null, softMu: rec.softMu || 0, boneMu: rec.boneMu || 0,
                    boneFamily: rec.boneFamily || null, born: rec.born == null ? null : rec.born,
                    fShedMilli: rec.fShedMilli, humusMilli: rec.humusMilli, layer: rec.layer,
                    pointMode: rec.pointMode
                };
                if (rec.kindName === "member") blob.members.push(row);
                else if (rec.kindName === "remains") blob.remains.push(row);
                else blob.items.push(row);
            }
            residue.forEach(function (list, chunkId) { blob.residue.push({ chunkId: chunkId, entries: list }); });
            return blob;
        },
        load: function (blob) {
            if (!isObj(blob) || blob.schema !== 1) fail("E_SCHEMA", "save");
            records.clear();
            residue.clear();
            while (long.pop()) {}
            while (short.pop()) {}
            byDay.clear();
            Object.keys(hold).forEach(function (k) { delete hold[k]; });
            Object.keys(sink).forEach(function (k) { delete sink[k]; });
            Object.keys(source).forEach(function (k) { delete source[k]; });
            opened = blob.opened;
            Object.keys(blob.hold).forEach(function (k) { hold[k] = blob.hold[k]; });
            Object.keys(blob.sink || {}).forEach(function (k) { sink[k] = blob.sink[k]; });
            now = blob.now;
            const groups = [
                { list: blob.members || [], kind: "member" },
                { list: blob.items || [], kind: "item" },
                { list: blob.remains || [], kind: "remains" }
            ];
            for (let g = 0; g < groups.length; g++) {
                for (let i = 0; i < groups[g].list.length; i++) {
                    const row = groups[g].list[i];
                    const kindName = row.kind || groups[g].kind;
                    const rec = {
                        packed: pack(KIND[kindName] || KIND[groups[g].kind], row.id),
                        id: row.id,
                        kindName: kindName,
                        dc: row.dc,
                        ex: row.ex,
                        role: row.role,
                        band: row.band,
                        structureId: row.structureId,
                        clock: { t0: row.t0, rem0: row.rem0, lifeYt: row.lifeYt },
                        maxHP: row.maxHP,
                        thresholds: row.thresholds,
                        runs: row.runs || [],
                        mass0: row.mass0,
                        family: row.family,
                        fromForm: row.fromForm,
                        shedBooked: row.shedBooked,
                        shedPool: row.shedPool,
                        moved: row.moved,
                        hpWrites: 0,
                        maintained: false,
                        attended: false,
                        failed: row.failed,
                        anchored: row.anchored,
                        failAt: row.failAt,
                        scheduled: false,
                        fShedMilli: row.fShedMilli,
                        humusMilli: row.humusMilli,
                        layer: row.layer,
                        pointMode: row.pointMode,
                        corrode: !!(params.classes[row.dc] && params.classes[row.dc].corrosionSteps),
                        stageName: row.stageName,
                        softMu: row.softMu || 0,
                        boneMu: row.boneMu || 0,
                        boneFamily: row.boneFamily,
                        born: row.born
                    };
                    if (kindName === "remains" && rec.stageName === "FRESH") rec.points = [{ kind: "remain", rem: 0, done: false }];
                    else if (kindName === "remains" && rec.stageName === "SKELETAL") rec.points = [{ kind: "remain", rem: 0, done: false }];
                    else if (row.pointMode === "explicit" && params.classes[row.dc] && params.classes[row.dc].corrosionSteps) {
                        rec.pointMode = "explicit";
                        rec.pointSeed = [
                            { kind: "step", rem: 750000 },
                            { kind: "step", rem: 500000 },
                            { kind: "step", rem: 250000 },
                            { kind: "fail", rem: 0 }
                        ];
                        rec.points = buildPoints(rec);
                    } else if (kindName === "item" || kindName === "food") {
                        rec.pointMode = "explicit";
                        rec.pointSeed = [{ kind: "fail", rem: 0 }];
                        rec.points = buildPoints(rec);
                    } else rec.points = buildPoints(rec);
                    markPassed(rec);
                    records.set(rec.packed, rec);
                    if (!rec.failed) arm(rec);
                }
            }
            const chunks = blob.residue || [];
            for (let i = 0; i < chunks.length; i++) residue.set(chunks[i].chunkId, chunks[i].entries);
        },
        checksum: function () {
            const rows = [];
            records.forEach(function (rec) {
                if (rec.maintained) return;
                rows.push({
                    id: rec.id, kind: rec.kindName, ex: rec.ex, role: rec.role, failed: rec.failed, anchored: rec.anchored,
                    t0: rec.clock.t0, rem0: rec.clock.rem0, lifeYt: rec.clock.lifeYt,
                    shedBooked: rec.shedBooked, moved: rec.moved, stageName: rec.stageName || null,
                    structureId: rec.structureId, stage: rec.structureId == null ? null : stageOf(rec.structureId, now)
                });
            });
            rows.sort(function (a, b) {
                if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
                return a.id - b.id;
            });
            return fnv1a(canon({ now: now, opened: opened, hold: hold, sink: sink, rows: rows }));
        }
    };
    return api;
}

module.exports = {
    createDecay: createDecay,
    layoutBytes: layoutBytes,
    scenarioSite: scenarioSite,
    scenarioL: scenarioL,
    residueParts: residueParts,
    rotSplit: rotSplit
};
