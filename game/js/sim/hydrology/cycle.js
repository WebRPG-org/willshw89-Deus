"use strict";

/**
 * game/js/sim/hydrology/cycle.js
 *
 * Project DEUS water return (NAT.03.03, lane-eb; DESIGN-D2 3.2, "Quench and rain
 * return"). One counted return inventory of water in integer centipounds
 * (DEC-038). Real exits, unplaceable water holdings, steam and evaporation credit
 * it. Each credit falls due a fixed number of ticks later and then rains back, one
 * receiver visit at a time, on the sky-exposed receivers of every area in a
 * deterministic rotation. A full receiver is passed over and the water stays
 * counted for a later visit. Only water enters: lava never becomes return water
 * (DEC-040).
 *
 * The cycle holds no cells. It reads, debits and credits sky-exposed water only
 * through the injected surface provider, and charges every provider call to the
 * authority's one step budget. Host-agnostic: no window, RMMZ or UF references,
 * no randomness; its clock is the count of authority steps.
 * Contract: docs/systems/DEUS_WaterAuthority.md, Water return.
 */

const fs = require("fs");
const path = require("path");
const units = require("../units.js");

const DATA_FILE = path.join(__dirname, "..", "..", "..", "data", "sim", "hydrology.json");
const DATA_SCHEMA = "deus.sim.hydrology/1";
const TUNING_VERSION = 1;
const SAVE_VERSION = 1;
const TUNING_KEYS = Object.freeze(["delayTicks", "rainCpPerVisit", "evaporationPeriodTicks", "evaporationCpPerReceiver"]);
const TUNING_MIN = Object.freeze({ delayTicks: 0, rainCpPerVisit: 1, evaporationPeriodTicks: 1, evaporationCpPerReceiver: 0 });

const WATER = "water";
const RETURN = "return";                          // the return inventory's account in transfer records
const CREDIT_CAUSES = Object.freeze(["exit", "steam"]);   // credits from outside; evaporation is the cycle's own
const SURFACE_METHODS = Object.freeze(["receivers", "room", "credit", "waterAt", "debit"]);

function fail(code, message) {
    const e = new Error(code + ": " + message);
    e.code = code;
    throw e;
}

function isAmount(v) { return Number.isSafeInteger(v) && v >= 0; }
function requireAmount(v, where) { if (!isAmount(v)) fail("E_AMOUNT", where + " must be a nonnegative safe integer cp, got " + String(v)); }

function cellKey(ref) { return ref.ax + "," + ref.ay + "," + ref.x + "," + ref.y + "," + ref.z; }

// The tuning in game/data/sim/hydrology.json, read on first use (an authority
// without a surface provider never reads it). Plain fs read: the file is data,
// not a module.
let fileTuning = null;
function readFileTuning() {
    if (fileTuning) return fileTuning;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (!data || data.schema !== DATA_SCHEMA) fail("E_CALIBRATION", "hydrology.json schema " + String(data && data.schema) + ", expected " + DATA_SCHEMA);
    const w = data.waterReturn || {};
    if (w.version !== TUNING_VERSION) fail("E_CALIBRATION", "hydrology.json waterReturn.version " + String(w.version) + ", expected " + TUNING_VERSION);
    const t = {};
    for (const k of TUNING_KEYS) t[k] = w[k];
    fileTuning = Object.freeze(t);
    return fileTuning;
}

// The file's tuning with the caller's overrides (tests and fixtures). Every value
// is an integer at or above its minimum.
function readTuning(override) {
    const t = Object.assign({}, readFileTuning());
    for (const k of Object.keys(override || {})) {
        if (TUNING_KEYS.indexOf(k) < 0) fail("E_CALIBRATION", "unknown waterReturn tuning " + k);
        t[k] = override[k];
    }
    for (const k of TUNING_KEYS) {
        if (!Number.isSafeInteger(t[k]) || t[k] < TUNING_MIN[k]) fail("E_CALIBRATION", "waterReturn." + k + " must be an integer >= " + TUNING_MIN[k] + ", got " + String(t[k]));
    }
    return Object.freeze(t);
}

/**
 * createCycle({ host, surface, tuning }) -> cycle
 *   host     the authority's host; its size, areasX, areasY, zMin and zMax bound receiver refs.
 *   surface  the sky-exposed water provider (contract in DEUS_WaterAuthority.md):
 *              receivers(ax, ay) -> [{ x, y, z }]  the area's receivers, stable order
 *              room(ref) -> cp      water the receiver can take now
 *              credit(ref, cp) -> cp taken, 0..cp
 *              waterAt(ref) -> cp   sky-exposed water standing at the receiver
 *              debit(ref, cp) -> cp taken, 0..cp
 *   tuning   optional overrides of hydrology.json waterReturn.
 * The authority calls service() once per step with what is left of its budget,
 * then endTick().
 */
function createCycle(options) {
    const opts = options || {};
    const host = opts.host || {};
    const world = { size: host.size, areasX: host.areasX, areasY: host.areasY, zMin: host.zMin, zMax: host.zMax };
    const areaCount = world.areasX * world.areasY;
    const surface = opts.surface;
    if (!surface || SURFACE_METHODS.some(m => typeof surface[m] !== "function")) {
        fail("E_HOST", "the surface provider needs " + SURFACE_METHODS.join(", "));
    }
    const tuning = readTuning(opts.tuning);

    let C = emptyState();

    function emptyState() {
        return {
            tick: 0,          // authority steps completed
            row: 0,           // last transfer record row of the authority
            ready: 0,         // cp due now, waiting for a receiver with room
            due: [],          // [{ at, cp }], ascending at, one per due tick, not yet due
            total: 0,         // ready + every due cp: the return inventory
            rain: { p: 0, i: 0 },                                                 // next receiver of the rotation
            evap: { next: tuning.evaporationPeriodTicks, active: false, start: 0, p: 0, i: 0 }
        };
    }

    function stamp(rec) {
        rec.row = ++C.row;
        return rec;
    }

    // Credit the return inventory, due delayTicks after the current tick. Credits
    // falling due on the same tick share one due record.
    function book(cp) {
        const at = C.tick + tuning.delayTicks;
        const last = C.due[C.due.length - 1];
        if (last && last.at === at) last.cp = units.addCp(last.cp, cp);
        else C.due.push({ at, cp });
        C.total = units.addCp(C.total, cp);
    }

    function takeReady(cp) {
        C.ready = units.subCp(C.ready, cp);
        C.total = units.subCp(C.total, cp);
    }

    /**
     * credit(cp, cause, from) -> record | null
     * The caller has debited `from` by exactly cp in the same transaction: a real
     * exit of open water (`from.key` a cell key) or an unplaceable water holding
     * ("holding:<id>"), cause "exit"; or quench steam, cause "steam". Only water:
     * any other class throws E_CLASS and changes nothing.
     */
    function credit(cp, cause, from) {
        const f = from || {};
        if (f.cls !== WATER) fail("E_CLASS", "only water returns as rain; " + String(f.cls) + " stays in its own account");
        if (CREDIT_CAUSES.indexOf(cause) < 0) fail("E_CAUSE", "return credit cause must be " + CREDIT_CAUSES.join(" or ") + ", got " + String(cause));
        if (typeof f.key !== "string" || !f.key.length || f.key === RETURN) fail("E_FROM", "a return credit names the debited account, got " + String(f.key));
        requireAmount(cp, "return credit");
        if (cp === 0) return null;
        book(cp);
        return stamp({ row: 0, cls: WATER, cp, cause, from: f.key, to: RETURN });
    }

    function hostAmount(v, max, what, ref) {
        if (!isAmount(v) || (max !== null && v > max)) fail("E_HOST", "surface." + what + " returned " + String(v) + " at " + cellKey(ref));
        return v;
    }

    /**
     * Rain on due water, then evaporation, within `budget` work units. One unit
     * per provider call: an area's receiver list (once per area per step), a
     * room or water probe, and a credit or debit. Pushes stamped records to out.
     * Returns { work, probes }.
     */
    function service(budget, out) {
        let work = 0, probes = 0;
        const lists = new Map();
        while (C.due.length && C.due[0].at <= C.tick) C.ready = units.addCp(C.ready, C.due.shift().cp);

        function receiversOf(p) {
            const have = lists.get(p);
            if (have) return have;
            if (work >= budget) return null;
            work++; probes++;
            const list = surface.receivers(p % world.areasX, Math.floor(p / world.areasX));
            if (!Array.isArray(list)) fail("E_HOST", "surface.receivers must return an array");
            lists.set(p, list);
            return list;
        }
        function refAt(p, list, i) {
            const r = list[i] || {};
            const ref = { ax: p % world.areasX, ay: Math.floor(p / world.areasX), x: r.x, y: r.y, z: r.z };
            const ok = [ref.x, ref.y, ref.z].every(Number.isSafeInteger)
                && ref.x >= 0 && ref.x < world.size && ref.y >= 0 && ref.y < world.size && ref.z >= world.zMin && ref.z <= world.zMax;
            if (!ok) fail("E_HOST", "surface.receivers(" + ref.ax + ", " + ref.ay + ")[" + i + "] is not a cell of this world: " + JSON.stringify(r));
            return ref;
        }

        // Rain: the rotation continues where it stopped, across every area, and
        // gives each receiver at most one visit per step (one lap). A visit needs
        // two units, the room probe and the credit.
        if (C.ready > 0) {
            const startI = C.rain.i;
            let entered = 0;
            while (C.ready > 0) {
                const list = receiversOf(C.rain.p);
                if (!list) break;
                if (C.rain.i >= list.length) {
                    C.rain.p = (C.rain.p + 1) % areaCount;
                    C.rain.i = 0;
                    if (++entered > areaCount) break;
                    continue;
                }
                if (entered === areaCount && C.rain.i >= startI) break;   // lap complete
                if (budget - work < 2) break;
                const ref = refAt(C.rain.p, list, C.rain.i);
                work++; probes++;
                const room = hostAmount(surface.room(ref), null, "room", ref);
                const give = Math.min(room, tuning.rainCpPerVisit, C.ready);
                if (give > 0) {
                    work++; probes++;
                    const got = hostAmount(surface.credit(ref, give), give, "credit", ref);
                    takeReady(got);
                    if (got > 0) out.push(stamp({ row: 0, cls: WATER, cp: got, cause: "rain", from: RETURN, to: cellKey(ref) }));
                }
                C.rain.i++;
            }
        }

        // Evaporation: a pass over every receiver at most once per period, taking
        // up to evaporationCpPerReceiver of the water standing there.
        const E = C.evap;
        if (!E.active && C.tick >= E.next && tuning.evaporationCpPerReceiver > 0) {
            E.active = true; E.start = C.tick; E.p = 0; E.i = 0;
        }
        while (E.active) {
            const list = receiversOf(E.p);
            if (!list) break;
            if (E.i >= list.length) {
                E.p++; E.i = 0;
                if (E.p >= areaCount) { E.active = false; E.p = 0; E.next = Math.max(E.start + tuning.evaporationPeriodTicks, C.tick + 1); }
                continue;
            }
            if (budget - work < 2) break;
            const ref = refAt(E.p, list, E.i);
            work++; probes++;
            const have = hostAmount(surface.waterAt(ref), null, "waterAt", ref);
            const take = Math.min(have, tuning.evaporationCpPerReceiver);
            if (take > 0) {
                work++; probes++;
                const got = hostAmount(surface.debit(ref, take), take, "debit", ref);
                if (got > 0) {
                    book(got);
                    out.push(stamp({ row: 0, cls: WATER, cp: got, cause: "evaporation", from: cellKey(ref), to: RETURN }));
                }
            }
            E.i++;
        }
        return { work, probes };
    }

    function endTick() { C.tick++; }

    function status() {
        let pending = 0;
        for (const d of C.due) pending = units.addCp(pending, d.cp);
        return {
            tick: C.tick,
            total: C.total,
            ready: C.ready,
            pending,
            nextDue: C.due.length ? C.due[0].at : null,
            rain: { ax: C.rain.p % world.areasX, ay: Math.floor(C.rain.p / world.areasX), i: C.rain.i },
            evaporation: { active: C.evap.active, next: C.evap.next },
            tuning
        };
    }

    // --- Persistence --------------------------------------------------------
    function serialize() {
        const t = {};
        for (const k of TUNING_KEYS) t[k] = tuning[k];
        return {
            v: SAVE_VERSION,
            tuning: t,
            tick: C.tick,
            row: C.row,
            ready: C.ready,
            due: C.due.map(d => [d.at, d.cp]),
            total: C.total,
            rain: [C.rain.p, C.rain.i],
            evap: [C.evap.next, C.evap.active ? 1 : 0, C.evap.start, C.evap.p, C.evap.i]
        };
    }

    // Validates a saved payload into a new state without touching the current one.
    function parse(data) {
        if (!data) fail("E_SAVE", "the save has no water-return payload");
        const d = data;
        if (d.v !== SAVE_VERSION) fail("E_SAVE", "unsupported water-return save version " + String(d.v));
        const t = d.tuning || {};
        if (Object.keys(t).length !== TUNING_KEYS.length || TUNING_KEYS.some(k => t[k] !== tuning[k])) {
            fail("E_CALIBRATION", "save tuning " + JSON.stringify(d.tuning) + " differs from " + JSON.stringify(tuning));
        }
        for (const k of ["tick", "row", "ready", "total"]) if (!isAmount(d[k])) fail("E_SAVE", k);
        const N = emptyState();
        N.tick = d.tick; N.row = d.row; N.ready = d.ready;
        let sum = d.ready;
        for (const e of Array.isArray(d.due) ? d.due : fail("E_SAVE", "due")) {
            const [at, cp] = Array.isArray(e) ? e : [];
            const last = N.due[N.due.length - 1];
            if (!isAmount(at) || at < d.tick || (last && at <= last.at) || !isAmount(cp) || cp === 0) fail("E_SAVE", "bad due record " + JSON.stringify(e));
            N.due.push({ at, cp });
            sum = units.addCp(sum, cp);
        }
        if (sum !== d.total) fail("E_SAVE_TOTALS", "return total " + d.total + " differs from the saved due records " + sum);
        N.total = sum;
        const r = Array.isArray(d.rain) ? d.rain : [];
        if (!Number.isSafeInteger(r[0]) || r[0] < 0 || r[0] >= areaCount || !isAmount(r[1])) fail("E_SAVE", "bad rain cursor");
        N.rain = { p: r[0], i: r[1] };
        const v = Array.isArray(d.evap) ? d.evap : [];
        if (!isAmount(v[0]) || (v[1] !== 0 && v[1] !== 1) || !isAmount(v[2]) || !Number.isSafeInteger(v[3]) || v[3] < 0 || v[3] >= areaCount || !isAmount(v[4])) fail("E_SAVE", "bad evaporation state");
        N.evap = { next: v[0], active: v[1] === 1, start: v[2], p: v[3], i: v[4] };
        return N;
    }

    function commit(state) { C = state; }

    return {
        tuning,
        tick: () => C.tick,
        total: () => C.total,
        stamp, credit, service, endTick, status,
        serialize, parse, commit
    };
}

module.exports = {
    createCycle,
    readTuning,
    DATA_FILE,
    SAVE_VERSION,
    CREDIT_CAUSES
};
