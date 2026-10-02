"use strict";

/**
 * game/js/sim/structural/commit.js
 *
 * Commit one rigid fall through the injected levels writer (NAT.02.01 part 3).
 * Cells that only lose strata are written first, then cells that receive strata,
 * each group in (z, y, x) order. Moved strata keep their material byte (the
 * constructed flag included) and their HP. A cell that loses strata has its
 * connector cleared, so stairs become plain blocks. Writes use
 * setStrata(..., { cause: "structural:fall" }). If a write is refused, earlier
 * writes are restored in reverse. Nothing here posts matter or writes fluid.
 * After a successful commit, one structure:fell event lists the changed cells.
 */

const { gOf, zOfG, sOfG, isSolidByte, materialKey, STRATA } = require("./levels_reader.js");

// Tests replace these constants. The values here are the fall rules.
const ORDER_VACATE_FIRST = true;
const EMIT_STRUCTURE_FELL = true;
const PRESERVE_BYTE = true;
const PRESERVE_HP = true;
const CLEAR_CONNECTOR = true;
const ROLLBACK_ON_REFUSAL = true;
const FALL_CAUSE = "structural:fall";
const DELETE_DISPLACED = false;

function fail(msg) {
    const err = new Error("structural/commit: " + msg);
    err.code = "E_COMMIT";
    return err;
}

function areaOf(plan) {
    const a = plan && plan.area;
    if (!a) return { x: 0, y: 0 };
    const x = a.x !== undefined ? a.x : a.ax;
    const y = a.y !== undefined ? a.y : a.ay;
    return { x: x | 0, y: y | 0 };
}

function voxelOf(b) {
    if (!b) throw fail("a fall block is missing");
    if (Number.isInteger(b.g)) return { x: b.x | 0, y: b.y | 0, g: b.g };
    if (Number.isInteger(b.z) && Number.isInteger(b.s)) return { x: b.x | 0, y: b.y | 0, g: gOf(b.z, b.s) };
    throw fail("a fall block needs g, or z and s");
}

function normalize(st) {
    if (!st) return null;
    const bytes = new Array(STRATA);
    const hp = new Array(STRATA);
    const materials = new Array(STRATA);
    for (let s = 0; s < STRATA; s++) {
        let byte = 0;
        if (st.bytes && st.bytes.length === STRATA) byte = st.bytes[s] | 0;
        else if (st.materials) {
            const key = st.materials[s];
            byte = key === "stone" ? 1 : key === "soil" ? 2 : key === "wood" ? 3 : key === "water" ? 4 : key === "lava" ? 5 : 0;
            if (byte && st.constructed && st.constructed[s]) byte |= 0x80;
        }
        const h = st.hp && st.hp.length === STRATA ? (st.hp[s] | 0) : (isSolidByte(byte, 1) ? 255 : 0);
        bytes[s] = byte;
        hp[s] = h;
        materials[s] = materialKey(byte) || "air";
    }
    return { bytes: bytes, hp: hp, materials: materials, connector: st.connector || null };
}

function specOf(bytes, hp, connector) {
    return { m: bytes.slice(), hp: hp.slice(), connector: connector ? connector : 0 };
}

function movedByte(byte) {
    return PRESERVE_BYTE ? byte : 0;
}

function movedHp(byte, hp) {
    if (!PRESERVE_BYTE) return 0;
    if (!PRESERVE_HP && isSolidByte(byte, hp)) return 1;
    return hp;
}

function byZYX(a, b) {
    return (a.z - b.z) || (a.y - b.y) || (a.x - b.x);
}

/**
 * plan: { area, drop, vacated|blocks, filled, contact }
 *   vacated/filled: [{ x, y, g }] or [{ x, y, z, s }]. filled defaults to vacated
 *   shifted down by drop strata.
 * io: { levels: { strataAt, setStrata }, events, fluid, matter }
 * Returns { ok, cause, writes, restored, event, reason }.
 */
function commitFall(plan, io) {
    if (!plan) throw fail("plan is required");
    if (!io || !io.levels || typeof io.levels.strataAt !== "function" || typeof io.levels.setStrata !== "function") {
        throw fail("io.levels.strataAt and setStrata are required");
    }
    const area = areaOf(plan);
    const vacatedIn = plan.vacated || plan.blocks || [];
    const vacated = vacatedIn.map(voxelOf);
    let filled;
    if (plan.filled) filled = plan.filled.map(voxelOf);
    else {
        const drop = plan.drop | 0;
        filled = vacated.map(v => ({ x: v.x, y: v.y, g: v.g - drop }));
    }
    if (filled.length !== vacated.length) throw fail("vacated and filled must pair one to one");
    if (vacated.length === 0) {
        return { ok: true, cause: FALL_CAUSE, writes: [], restored: false, event: null, reason: null };
    }

    const moves = vacated.map((from, i) => ({ from: from, to: filled[i] }));
    const seenFrom = new Set();
    const seenTo = new Set();
    for (let i = 0; i < moves.length; i++) {
        const fromKey = moves[i].from.x + "," + moves[i].from.y + "," + moves[i].from.g;
        const toKey = moves[i].to.x + "," + moves[i].to.y + "," + moves[i].to.g;
        if (seenFrom.has(fromKey)) return { ok: false, cause: FALL_CAUSE, writes: [], restored: false, event: null, reason: "a stratum is vacated twice" };
        if (seenTo.has(toKey)) return { ok: false, cause: FALL_CAUSE, writes: [], restored: false, event: null, reason: "two blocks land on one stratum" };
        seenFrom.add(fromKey);
        seenTo.add(toKey);
    }

    const cells = new Map();
    function entry(x, y, z) {
        const key = z + "," + y + "," + x;
        let e = cells.get(key);
        if (!e) {
            e = { x: x, y: y, z: z, vacate: [], fill: [] };
            cells.set(key, e);
        }
        return e;
    }
    for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        entry(m.from.x, m.from.y, zOfG(m.from.g)).vacate.push(sOfG(m.from.g));
        entry(m.to.x, m.to.y, zOfG(m.to.g)).fill.push({ s: sOfG(m.to.g), move: m });
    }

    for (const e of cells.values()) {
        e.before = normalize(io.levels.strataAt({ area: area, x: e.x, y: e.y, z: e.z }));
        if (!e.before) {
            return { ok: false, cause: FALL_CAUSE, writes: [], restored: false, event: null, reason: "cell (" + e.x + "," + e.y + ") at " + e.z + " cannot be read" };
        }
    }
    for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        const src = cells.get(zOfG(m.from.g) + "," + m.from.y + "," + m.from.x);
        const s = sOfG(m.from.g);
        m.byte = src.before.bytes[s];
        m.hp = src.before.hp[s];
    }
    for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        const toKey = m.to.x + "," + m.to.y + "," + m.to.g;
        if (seenFrom.has(toKey)) continue;
        const dest = cells.get(zOfG(m.to.g) + "," + m.to.y + "," + m.to.x);
        const s = sOfG(m.to.g);
        if (isSolidByte(dest.before.bytes[s], dest.before.hp[s])) {
            return { ok: false, cause: FALL_CAUSE, writes: [], restored: false, event: null, reason: "landing is occupied" };
        }
    }

    const vacateOnly = [];
    const fill = [];
    for (const e of cells.values()) {
        const bytes = e.before.bytes.slice();
        const hp = e.before.hp.slice();
        for (let i = 0; i < e.vacate.length; i++) {
            bytes[e.vacate[i]] = 0;
            hp[e.vacate[i]] = 0;
        }
        for (let i = 0; i < e.fill.length; i++) {
            const incoming = e.fill[i];
            const byte = movedByte(incoming.move.byte);
            bytes[incoming.s] = byte;
            hp[incoming.s] = movedHp(incoming.move.byte, incoming.move.hp);
            if (!isSolidByte(byte, 1)) hp[incoming.s] = 0;
        }
        const connector = (e.vacate.length > 0 && CLEAR_CONNECTOR) ? 0 : (e.before.connector || 0);
        e.spec = specOf(bytes, hp, connector);
        e.role = e.fill.length > 0 ? "fill" : "vacate";
        (e.role === "vacate" ? vacateOnly : fill).push(e);
    }
    vacateOnly.sort(byZYX);
    fill.sort(byZYX);
    const ordered = ORDER_VACATE_FIRST ? vacateOnly.concat(fill) : fill.concat(vacateOnly);

    const done = [];
    function rollback() {
        if (!ROLLBACK_ON_REFUSAL) return false;
        for (let i = done.length - 1; i >= 0; i--) {
            const e = done[i];
            io.levels.setStrata(
                { area: area, x: e.x, y: e.y, z: e.z },
                specOf(e.before.bytes, e.before.hp, e.before.connector || 0),
                { cause: FALL_CAUSE }
            );
        }
        return true;
    }

    for (let i = 0; i < ordered.length; i++) {
        const e = ordered[i];
        let res;
        try {
            res = io.levels.setStrata({ area: area, x: e.x, y: e.y, z: e.z }, e.spec, { cause: FALL_CAUSE });
        } catch (err) {
            const restored = rollback();
            return {
                ok: false, cause: FALL_CAUSE, writes: done.map(writeOf), restored: restored, event: null,
                reason: err && err.message ? err.message : "setStrata threw"
            };
        }
        const accepted = res === true || (res && res.ok === true);
        if (!accepted) {
            const restored = rollback();
            return {
                ok: false, cause: FALL_CAUSE, writes: done.map(writeOf), restored: restored, event: null,
                reason: "setStrata refused (" + e.x + "," + e.y + ") z " + e.z
            };
        }
        done.push(e);
    }

    if (DELETE_DISPLACED && io.fluid && typeof io.fluid.setCell === "function") {
        for (let i = 0; i < done.length; i++) {
            const e = done[i];
            io.fluid.setCell(area, e.x, e.y, e.z, "water", 0);
        }
    }

    const writes = done.map(writeOf);
    const payload = {
        area: area,
        cause: FALL_CAUSE,
        drop: plan.drop === undefined ? null : plan.drop,
        cells: writes,
        vacated: vacated.map(v => ({ x: v.x, y: v.y, g: v.g })),
        filled: filled.map(v => ({ x: v.x, y: v.y, g: v.g })),
        contact: plan.contact || null
    };
    let event = null;
    if (EMIT_STRUCTURE_FELL && io.events && typeof io.events.emit === "function") {
        io.events.emit("structure:fell", payload);
        event = payload;
    }
    return { ok: true, cause: FALL_CAUSE, writes: writes, restored: false, event: event, reason: null };
}

function writeOf(e) {
    return { x: e.x, y: e.y, z: e.z, role: e.role };
}

module.exports = { commitFall: commitFall, FALL_CAUSE: FALL_CAUSE };
