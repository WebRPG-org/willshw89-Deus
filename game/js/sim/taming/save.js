"use strict";

const record = require("./record");

const VERSION = 1;

function exportState(units) {
    const rows = [];
    const list = units || [];
    for (let i = 0; i < list.length; i++) {
        const unit = list[i];
        const rec = record.recordOf(unit);
        if (!unit || unit.id == null || !rec) continue;
        if (rec.status !== "captive" && rec.status !== "domesticated" && rec.status !== "dead") continue;
        rows.push({ unitId: unit.id, taming: record.copyRecord(rec) });
    }
    return { version: VERSION, rows: rows };
}

function importState(units, blob) {
    if (!blob || blob.version !== VERSION || !Array.isArray(blob.rows)) {
        return { ok: false, reason: "BAD_VERSION", applied: 0 };
    }
    const byId = new Map();
    const list = units || [];
    for (let i = 0; i < list.length; i++) {
        if (list[i] && list[i].id != null) byId.set(list[i].id, list[i]);
    }
    let applied = 0;
    for (let r = 0; r < blob.rows.length; r++) {
        const row = blob.rows[r];
        if (!row || row.unitId == null || !row.taming) continue;
        const unit = byId.get(row.unitId);
        if (!unit) continue;
        if (!unit.data || typeof unit.data !== "object") unit.data = {};
        unit.data.taming = record.copyRecord(row.taming); // AX_LOAD_STATE
        applied += 1;
    }
    return { ok: true, reason: "LOADED", applied: applied };
}

module.exports = {
    VERSION: VERSION,
    exportState: exportState,
    importState: importState
};
