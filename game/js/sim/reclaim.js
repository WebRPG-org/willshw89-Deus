"use strict";
// SIM.40.11 matter posts and terrain reclamation.
// The ledger (game/js/sim/ledger.js) is the only place totals change. This module does not edit it.
// It posts the SIM.40.00 yield, bill, collapse and reclaim rows, and it walks outdoor loose
// mass along reclaimTarget paths. A path step the ledger table does not contain is not invented.
// Exemption: the catalogue records DEC-028.3 with implemented false. The caller marks a pile
// exempt (claimed, carried, contained, enclosed, or an active structure). This module skips those piles.
// Calendar scale (D-1) is open: one call of tick() is one step, not a year.

const MAX = Number.MAX_SAFE_INTEGER;
const LEAK_CAP = 32;
const LOOSE_STRATA = {
    rubble: true, sediment: true, soil: true, humus: true, ash: true, charcoal: true,
    fe_trace: true, cu_trace: true, ag_trace: true
};
// Ecology maturation targets (DEUS_Ecology.js sprout table). Used when the mass table has no row.
const ORE_OBJECT_IDS = { ironstone: "fe_ore", copper_outcrop: "cu_ore", gold_outcrop: "au_ore" };
const BRIDGE_FORMS = ["object", "ruin", "strata", "item"];

function isObj(v) { return typeof v === "object" && v !== null && !Array.isArray(v); }
function isAmount(n) { return typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= MAX; }
function mul(a, b) {
    if (!isAmount(a) || !isAmount(b)) {
        const e = new Error("E_AMOUNT");
        e.name = "ReclaimError";
        e.code = "E_AMOUNT";
        throw e;
    }
    if (a > 0 && b > Math.floor(MAX / a)) {
        const e = new Error("E_AMOUNT");
        e.name = "ReclaimError";
        e.code = "E_AMOUNT";
        throw e;
    }
    return a * b;
}
function copy(v) { return JSON.parse(JSON.stringify(v)); }
function canon(v) {
    if (Array.isArray(v)) {
        let s = "[", i;
        for (i = 0; i < v.length; i++) { if (i) s += ","; s += canon(v[i]); }
        return s + "]";
    }
    if (isObj(v)) {
        const keys = Object.keys(v).sort();
        let s = "{", i;
        for (i = 0; i < keys.length; i++) {
            if (i) s += ",";
            s += JSON.stringify(keys[i]) + ":" + canon(v[keys[i]]);
        }
        return s + "}";
    }
    return JSON.stringify(v);
}
function fnv1a(text) {
    let h = 0x811c9dc5, i;
    for (i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    let s = (h >>> 0).toString(16);
    while (s.length < 8) s = "0" + s;
    return s;
}
function atOf(detail) {
    const a = detail && detail.at;
    return {
        x: a && isAmount(a.x) ? a.x : 0,
        y: a && isAmount(a.y) ? a.y : 0,
        z: a && isAmount(a.z) ? a.z : 0
    };
}

function createReclaim(opts) {
    if (!isObj(opts) || typeof opts.ledger !== "object" || opts.ledger === null || typeof opts.materials !== "object" || opts.materials === null) {
        const e = new Error("E_CONFIG");
        e.name = "ReclaimError";
        e.code = "E_CONFIG";
        throw e;
    }
    const ledger = opts.ledger;
    const materials = opts.materials;
    const data = isObj(opts.data) ? opts.data : null;
    const strict = opts.strict === true;
    const described = ledger.describe();
    const transforms = described.transforms;
    const classInfo = described.classes;
    const familyNames = Object.keys(described.families).sort();
    const catalogue = data && data.catalogue && Array.isArray(data.catalogue.materials) ? data.catalogue.materials : [];

    let places = [];
    let nextId = 1;
    let cursor = 0;
    let ticks = 0;
    let moves = 0;
    let refused = 0;
    let unpaid = 0;
    let coverDepth = 0;
    let base = null;
    const leaks = [];
    const pathCache = {};

    function die(code, msg) {
        const e = new Error(code + ": " + msg);
        e.name = "ReclaimError";
        e.code = code;
        throw e;
    }
    function remember(row) {
        leaks.push(row);
        if (leaks.length > LEAK_CAP) leaks.shift();
    }
    function soft(code, msg) {
        remember({ code: code, msg: msg });
        if (code === "E_UNPAID") unpaid++;
        if (strict) die(code, msg);
        return { ok: false, code: code, msg: msg };
    }
    function refuse(code, msg) {
        refused++;
        remember({ code: code, msg: msg, refuse: true });
        return { ok: false, refuse: true, code: code, msg: msg };
    }

    function isOreClass(cls) {
        return !!(classInfo[cls] && classInfo[cls].ore === true);
    }
    function oreOutput(fromCls, toCls) {
        return isOreClass(toCls) && toCls !== fromCls;
    }
    function objectRecord(id) {
        if (!data || !data.masses || !isObj(data.masses.objects)) return null;
        return data.masses.objects[id] || null;
    }
    function oreClassesOf(id) {
        const o = objectRecord(id);
        const out = [];
        let i, line;
        if (o && Array.isArray(o.lines)) {
            for (i = 0; i < o.lines.length; i++) {
                line = o.lines[i];
                if (line && isOreClass(line.class) && out.indexOf(line.class) < 0) out.push(line.class);
            }
        }
        if (!out.length && ORE_OBJECT_IDS[id]) out.push(ORE_OBJECT_IDS[id]);
        return out;
    }
    function canonMaterial(cls, form) {
        let i, m, fallback = null;
        for (i = 0; i < catalogue.length; i++) {
            m = catalogue[i];
            if (!m || !m.ledger || m.ledger.class !== cls || !m.reclaim || !Array.isArray(m.reclaim.path) || !m.reclaim.path.length) continue;
            if (m.ledgerForm === form) return m.id;
            if (!fallback) fallback = m.id;
        }
        return fallback;
    }
    function looseStrata(cls) { return LOOSE_STRATA[cls] === true; }

    function findRow(process, fromCls, fromForm, toCls, toForm) {
        let i, t, best = null, key, bestKey;
        for (i = 0; i < transforms.length; i++) {
            t = transforms[i];
            if (process && t.id !== process) continue;
            if (t.from !== fromCls || t.fromForm !== fromForm) continue;
            if (toCls && t.to !== toCls) continue;
            if (toForm && t.toForm !== toForm) continue;
            key = t.id + ">" + t.from + "|" + t.fromForm + ">" + t.to + "|" + t.toForm;
            bestKey = best ? best.id + ">" + best.from + "|" + best.fromForm + ">" + best.to + "|" + best.toForm : "";
            if (!best || key < bestKey) best = t;
        }
        return best;
    }

    // The integer the ledger moves. The place moves `amount`. They are the same number.
    function ledgerAmount(amount) { return amount; }
    function commitMove(fromCls, fromForm, toCls, toForm, amount, cause) {
        const n = ledgerAmount(amount);
        if (!n) return;
        if (oreOutput(fromCls, toCls)) die("E_ORE_OUTPUT", fromCls + " -> " + toCls);
        ledger.transform(fromCls, fromForm, toCls, toForm, n, cause);
        moves++;
    }

    function blankPlace(spec) {
        return {
            id: nextId++,
            elementId: spec.elementId || "",
            materialId: spec.materialId || "",
            pathId: spec.pathId || spec.materialId || "",
            cls: spec.cls,
            form: spec.form,
            cp: spec.cp,
            x: spec.x || 0,
            y: spec.y || 0,
            z: spec.z || 0,
            outdoor: spec.outdoor === true,
            exempt: spec.exempt === true,
            done: spec.done === true,
            parked: spec.parked || "",
            step: spec.step || 0
        };
    }
    function samePile(a, b) {
        return a.cls === b.cls && a.form === b.form && a.elementId === b.elementId
            && a.materialId === b.materialId && a.pathId === b.pathId
            && a.x === b.x && a.y === b.y && a.z === b.z
            && a.outdoor === b.outdoor && a.exempt === b.exempt
            && a.done === b.done && a.parked === b.parked && a.step === b.step;
    }
    function givePlace(spec) {
        const row = blankPlace(spec);
        let i;
        for (i = 0; i < places.length; i++) {
            if (places[i].cp > 0 && samePile(places[i], row)) {
                if (places[i].cp > MAX - row.cp) die("E_AMOUNT", "pile");
                places[i].cp += row.cp;
                return places[i];
            }
        }
        places.push(row);
        return row;
    }
    function available(cls, form, prefer) {
        let s = 0, i, p;
        for (i = 0; i < places.length; i++) {
            p = places[i];
            if (p.cls !== cls || p.form !== form || p.cp <= 0) continue;
            if (prefer && !prefer(p)) continue;
            s += p.cp;
        }
        return s;
    }
    function takeCp(cls, form, amount, prefer) {
        let left = amount, i, p, n;
        for (i = 0; i < places.length && left > 0; i++) {
            p = places[i];
            if (p.cls !== cls || p.form !== form || p.cp <= 0) continue;
            if (prefer && !prefer(p)) continue;
            n = p.cp < left ? p.cp : left;
            p.cp -= n;
            left -= n;
        }
        if (left !== 0) die("E_INSUFFICIENT", cls + "/" + form);
    }
    function compact() {
        const next = [];
        let i;
        for (i = 0; i < places.length; i++) if (places[i].cp > 0) next.push(places[i]);
        places = next;
    }
    function preferMaterial(materialId) {
        return function (p) { return p.materialId === materialId || p.pathId === materialId; };
    }
    function preferElement(elementId) {
        return function (p) { return p.elementId === elementId; };
    }

    function postingAmount(p) {
        if (typeof p.cp === "number") return p.cp;
        return null;
    }
    function scalePostings(list, times) {
        const out = [];
        let i, p, unit;
        for (i = 0; i < list.length; i++) {
            p = list[i];
            unit = postingAmount(p);
            if (unit === null) return { error: "E_UNIT" };
            if (unit === 0) continue;
            if (!p.fromClass || !p.class || !p.fromForm || !p.form) return null;
            out.push({
                process: p.process || "identity",
                fromCls: p.fromClass,
                fromForm: p.fromForm,
                toCls: p.class,
                toForm: p.form,
                amount: mul(unit, times),
                item: p.item || "",
                objectId: p.object || "",
                count: typeof p.count === "number" ? mul(p.count, times) : 0
            });
        }
        return out;
    }
    function yieldList(id) {
        const y = materials.yieldOf(id);
        if (!y) return null;
        if (Array.isArray(y.postings)) return y.postings;
        if (y.material && Array.isArray(y.material.postings)) return y.material.postings;
        return null;
    }

    function checkMoves(rows, cause) {
        const need = {};
        let i, m, have, k;
        for (i = 0; i < rows.length; i++) {
            m = rows[i];
            if (!m.amount || m.process === "identity") continue;
            if (oreOutput(m.fromCls, m.toCls)) return soft("E_ORE_OUTPUT", m.fromCls + " -> " + m.toCls + " (" + cause + ")");
            if (!findRow(m.process, m.fromCls, m.fromForm, m.toCls, m.toForm)) {
                return soft("E_NO_ENTRY", m.process + " " + m.fromCls + "/" + m.fromForm + " -> " + m.toCls + "/" + m.toForm);
            }
            k = m.fromCls + "|" + m.fromForm;
            need[k] = (need[k] || 0) + m.amount;
        }
        const keys = Object.keys(need).sort();
        for (i = 0; i < keys.length; i++) {
            k = keys[i].split("|");
            have = ledger.amount(k[0], k[1]);
            if (typeof have !== "number" || have < need[keys[i]]) return soft("E_INSUFFICIENT", keys[i]);
        }
        return null;
    }
    function runMoves(rows, cause) {
        let i, m;
        for (i = 0; i < rows.length; i++) {
            m = rows[i];
            if (!m.amount || m.process === "identity") continue;
            commitMove(m.fromCls, m.fromForm, m.toCls, m.toForm, m.amount, cause);
        }
    }

    function productSpec(m, sourceId, at, outdoor, exempt) {
        const same = m.fromCls === m.toCls;
        const pathId = same ? (sourceId || canonMaterial(m.toCls, m.toForm) || m.toCls) : (canonMaterial(m.toCls, m.toForm) || m.toCls);
        const solid = m.toForm === "strata" && !looseStrata(m.toCls);
        return {
            elementId: m.objectId || "",
            materialId: m.item || pathId,
            pathId: pathId,
            cls: m.toCls,
            form: m.toForm,
            cp: m.amount,
            x: at.x, y: at.y, z: at.z,
            outdoor: outdoor != null ? outdoor : (m.toForm === "item" || m.toForm === "ruin" || (m.toForm === "strata" && !solid)),
            exempt: exempt === true,
            step: 0,
            done: false
        };
    }

    function applyMaterial(materialId, list, times, cause, at, prefer) {
        const rows = scalePostings(list, times);
        if (rows && rows.error === "E_UNIT") return soft("E_UNIT", materialId);
        if (!rows) return soft("E_OPEN", materialId);
        const bad = checkMoves(rows, cause);
        if (bad) return bad;
        let i, m, need = {};
        for (i = 0; i < rows.length; i++) {
            m = rows[i];
            if (m.process === "identity") continue;
            const k = m.fromCls + "|" + m.fromForm;
            need[k] = (need[k] || 0) + m.amount;
        }
        const keys = Object.keys(need).sort();
        for (i = 0; i < keys.length; i++) {
            const parts = keys[i].split("|");
            if (available(parts[0], parts[1], prefer) < need[keys[i]]) return soft("E_INSUFFICIENT", keys[i]);
        }
        runMoves(rows, cause);
        for (i = 0; i < rows.length; i++) {
            m = rows[i];
            if (m.process === "identity") continue;
            takeCp(m.fromCls, m.fromForm, m.amount, prefer);
            givePlace(productSpec(m, materialId, at, null, false));
        }
        compact();
        return { ok: true, posted: rows.length, cause: cause };
    }

    function applyElementPostings(elementId, list, times, cause, at) {
        const o = objectRecord(elementId);
        if (!o) return soft("E_NO_DATA", elementId);
        if (o.massless) return { ok: true, massless: true, posted: 0 };
        const rows = scalePostings(list, times);
        if (rows && rows.error === "E_UNIT") return soft("E_UNIT", elementId);
        if (!rows) return soft("E_OPEN", elementId);
        const bad = checkMoves(rows, cause);
        if (bad) return bad;
        const prefer = preferElement(elementId);
        let i, m;
        const need = {};
        const held = {};
        for (i = 0; i < rows.length; i++) {
            m = rows[i];
            const k = m.fromCls + "|" + m.fromForm;
            need[k] = (need[k] || 0) + m.amount;
        }
        for (i = 0; i < places.length; i++) {
            const p = places[i];
            if (p.elementId !== elementId || p.cp <= 0) continue;
            const k = p.cls + "|" + p.form;
            held[k] = (held[k] || 0) + p.cp;
        }
        const keys = Object.keys(need).sort();
        for (i = 0; i < keys.length; i++) {
            if ((held[keys[i]] || 0) !== need[keys[i]]) return soft("E_UNBALANCED", elementId + " " + keys[i]);
        }
        runMoves(rows, cause);
        for (i = 0; i < rows.length; i++) {
            m = rows[i];
            if (m.process === "identity") continue;
            takeCp(m.fromCls, m.fromForm, m.amount, prefer);
            givePlace(productSpec(m, canonMaterial(m.toCls, m.toForm) || m.item || elementId, at, null, false));
        }
        for (i = 0; i < rows.length; i++) {
            m = rows[i];
            if (m.process !== "identity") continue;
            takeCp(m.fromCls, m.fromForm, m.amount, prefer);
            const spec = productSpec(m, canonMaterial(m.toCls, m.toForm) || elementId, at, true, false);
            spec.elementId = m.objectId || "";
            spec.cp = m.amount;
            if (m.toForm === "strata" && !looseStrata(m.toCls)) spec.outdoor = false;
            givePlace(spec);
        }
        compact();
        return { ok: true, posted: rows.length, cause: cause };
    }

    function pathSteps(materialId) {
        if (Object.prototype.hasOwnProperty.call(pathCache, materialId)) return pathCache[materialId];
        const t = materials.reclaimTarget(materialId);
        const steps = [];
        const path = t && Array.isArray(t.path) ? t.path : [];
        let i, raw, match;
        for (i = 0; i < path.length; i++) {
            raw = path[i];
            if (raw === "identity") {
                steps.push({ kind: "identity", toClass: t.ledgerClass, toForm: t.ledgerForm });
                continue;
            }
            match = /^([a-z_]+):([a-z0-9_]+)->([a-z0-9_]+)$/.exec(raw);
            if (match) {
                steps.push({ kind: "move", process: match[1], fromClass: match[2], toClass: match[3], toForm: "" });
                continue;
            }
            if (typeof raw === "string" && /^[a-z_]+$/.test(raw)) {
                steps.push({ kind: "move", process: raw, fromClass: "", toClass: t.ledgerClass || "", toForm: t.ledgerForm || "" });
                continue;
            }
            steps.push({ kind: "bad", raw: String(raw) });
        }
        pathCache[materialId] = steps;
        return steps;
    }
    function endpointOf(materialId) {
        const t = materials.reclaimTarget(materialId);
        if (!t || !t.ledgerClass || !t.ledgerForm) return null;
        return { cls: t.ledgerClass, form: t.ledgerForm };
    }
    function atEndpoint(place) {
        const e = endpointOf(place.pathId || place.materialId);
        if (!e) return false;
        return place.cls === e.cls && place.form === e.form;
    }
    function bridgeToward(place, step) {
        const fromCls = step.fromClass || place.cls;
        if (fromCls !== place.cls) return null;
        let i, form, row, bridge;
        for (i = 0; i < BRIDGE_FORMS.length; i++) {
            form = BRIDGE_FORMS[i];
            if (form === place.form) continue;
            row = findRow(step.process, fromCls, form, step.toClass || null, step.toForm || null);
            if (!row) continue;
            bridge = findRow(null, place.cls, place.form, place.cls, form);
            if (!bridge) continue;
            if (oreOutput(place.cls, bridge.to)) continue;
            return bridge;
        }
        return null;
    }
    function advance(place, cause) {
        if (place.done) return { ok: true, done: true };
        if (atEndpoint(place)) { place.done = true; return { ok: true, done: true }; }
        const steps = pathSteps(place.pathId || place.materialId);
        if (!steps.length) { place.done = true; place.parked = "no-path"; return { ok: true, blocked: "no-path" }; }
        if (place.step >= steps.length) { place.done = true; return { ok: true, done: true }; }
        const step = steps[place.step];
        if (step.kind === "bad") { place.parked = "bad-path"; place.done = true; return soft("E_OPEN", step.raw || "path"); }
        if (step.kind === "identity") {
            place.step++;
            if (place.step >= steps.length || atEndpoint(place)) place.done = true;
            return { ok: true, identity: true };
        }
        const fromCls = step.fromClass || place.cls;
        if (fromCls !== place.cls) { place.parked = "class"; return { ok: true, blocked: "class" }; }
        let row = findRow(step.process, fromCls, place.form, step.toClass || null, step.toForm || null);
        if (!row) {
            const bridge = bridgeToward(place, step);
            if (!bridge) { place.parked = "no-row"; return { ok: true, blocked: "no-row" }; }
            if (ledger.amount(place.cls, place.form) < place.cp) return soft("E_INSUFFICIENT", place.cls + "/" + place.form);
            commitMove(place.cls, place.form, bridge.to, bridge.toForm, place.cp, cause);
            place.cls = bridge.to;
            place.form = bridge.toForm;
            return { ok: true, moved: true, prep: true };
        }
        if (oreOutput(place.cls, row.to)) return refuse("E_ORE_OUTPUT", place.cls + " -> " + row.to);
        if (ledger.amount(place.cls, place.form) < place.cp) return soft("E_INSUFFICIENT", place.cls + "/" + place.form);
        commitMove(place.cls, place.form, row.to, row.toForm, place.cp, cause);
        place.cls = row.to;
        place.form = row.toForm;
        const nextMat = canonMaterial(place.cls, place.form);
        if (nextMat && step.fromClass && step.fromClass !== row.to) place.materialId = nextMat;
        place.step++;
        if (place.step >= steps.length || atEndpoint(place)) place.done = true;
        return { ok: true, moved: true };
    }

    function eligible() {
        const out = [];
        let i, p;
        for (i = 0; i < places.length; i++) {
            p = places[i];
            if (p.cp > 0 && p.outdoor && !p.exempt && !p.done && !p.parked) out.push(p);
        }
        out.sort(function (a, b) { return a.id - b.id; });
        return out;
    }
    function tick(n) {
        const count = isAmount(n) && n > 0 ? n : 1;
        let i, list, place, res, moved = 0;
        for (i = 0; i < count; i++) {
            list = eligible();
            if (list.length) {
                place = list[cursor % list.length];
                cursor++;
                res = advance(place, "reclaim:tick");
                if (res && res.ok === false && strict) die(res.code || "E_RECLAIM", res.msg || "tick");
                if (res && res.moved) moved++;
            }
            ticks++;
        }
        return { ok: true, ticks: ticks, moved: moved };
    }

    function capture() {
        base = {};
        let i;
        for (i = 0; i < familyNames.length; i++) base[familyNames[i]] = ledger.familyTotal(familyNames[i]);
    }
    function seal() {
        if (!ledger.isSealed()) ledger.seal();
        if (!base) capture();
        return { ok: true };
    }
    function mustSealed() {
        if (!ledger.isSealed() || !base) return soft("E_NOT_SEALED", "seal the ledger after world registration");
        return null;
    }

    function registerCommon(cls, form, cp, cause, spec) {
        if (!ledger.isSealed()) ledger.register(cls, form, cp, cause || "register");
        else return soft("E_SEALED", cls + "/" + form);
        givePlace(spec);
        return { ok: true, cp: cp, cls: cls, form: form };
    }
    function registerSlice(id, count, cause, opts) {
        const m = materials.material(id);
        if (!m || !m.ledger) return soft("E_NO_DATA", String(id));
        if (m.ledgerForm && m.ledgerForm !== "strata") return soft("E_FORM", id);
        if (m.unmapped) return soft("E_OPEN", (m.unmapped && m.unmapped.disagreement) || id);
        let cp;
        try { cp = materials.massOf(id, "strata", count); }
        catch (e) { return soft(e.code || "E_FORM", id); }
        if (!isAmount(cp) || cp === 0) return soft("E_OPEN", id);
        const o = opts || {};
        const at = atOf(o);
        return registerCommon(m.ledger.class, "strata", cp, cause, {
            elementId: "",
            materialId: id,
            pathId: id,
            cls: m.ledger.class,
            form: "strata",
            cp: cp,
            x: at.x, y: at.y, z: at.z,
            outdoor: o.outdoor === true,
            exempt: o.exempt !== false
        });
    }
    function registerItem(id, count, cause, opts) {
        let cp;
        try { cp = materials.massOf(id, "item", count); }
        catch (e) { return soft(e.code || "E_FORM", id); }
        if (!isAmount(cp) || cp === 0) return soft("E_OPEN", id);
        const items = data && data.masses && data.masses.items;
        const row = items && items[id];
        const cls = row && row.ledger && row.ledger.class;
        if (!cls) return soft("E_NO_DATA", id);
        const o = opts || {};
        const at = atOf(o);
        const pathId = canonMaterial(cls, "item") || id;
        return registerCommon(cls, "item", cp, cause, {
            elementId: "",
            materialId: pathId,
            pathId: pathId,
            cls: cls,
            form: "item",
            cp: cp,
            x: at.x, y: at.y, z: at.z,
            outdoor: o.outdoor !== false,
            exempt: o.exempt === true
        });
    }
    function registerObject(id, count, cause, opts) {
        const orec = objectRecord(id);
        if (!orec) return soft("E_NO_DATA", id);
        if (orec.massless) return { ok: true, massless: true };
        if (!Array.isArray(orec.lines) || !orec.lines.length) return soft("E_NO_DATA", id);
        const o = opts || {};
        const at = atOf(o);
        let i, line, cp, res;
        for (i = 0; i < orec.lines.length; i++) {
            line = orec.lines[i];
            cp = mul(line.cp, count);
            if (!cp) continue;
            res = registerCommon(line.class, line.form || "object", cp, cause, {
                elementId: id,
                materialId: canonMaterial(line.class, line.form || "object") || id,
                pathId: canonMaterial(line.class, line.form || "object") || id,
                cls: line.class,
                form: line.form || "object",
                cp: cp,
                x: at.x, y: at.y, z: at.z,
                outdoor: o.outdoor === true,
                exempt: o.exempt !== false
            });
            if (res && res.ok === false) return res;
        }
        return { ok: true };
    }
    function registerHolding(cls, form, cp, cause, opts) {
        if (!isAmount(cp) || cp === 0) return soft("E_AMOUNT", cls);
        const o = opts || {};
        const at = atOf(o);
        const pathId = o.pathId || canonMaterial(cls, form) || cls;
        return registerCommon(cls, form, cp, cause, {
            elementId: o.elementId || "",
            materialId: o.materialId || pathId,
            pathId: pathId,
            cls: cls,
            form: form,
            cp: cp,
            x: at.x, y: at.y, z: at.z,
            outdoor: o.outdoor === true,
            exempt: o.exempt === true
        });
    }

    function mine(materialId, slices, cause, detail) {
        const gate = mustSealed();
        if (gate) return gate;
        const id = resolveMaterial(materialId);
        if (!id) return soft("E_NO_DATA", String(materialId));
        const m = materials.material(id);
        if (m && m.unmapped) return soft("E_OPEN", (m.unmapped.disagreement) || "unmapped");
        const list = yieldList(id);
        if (!list) return soft("E_NO_DATA", id);
        const n = isAmount(slices) && slices > 0 ? slices : 1;
        let one = null;
        try {
            const form = list[0] && list[0].fromForm ? list[0].fromForm : "strata";
            one = materials.massOf(id, form, 1);
        } catch (e) {
            return soft(e.code || "E_FORM", id);
        }
        if (!isAmount(one)) return soft("E_OPEN", id);
        let sum = 0, i, unit;
        for (i = 0; i < list.length; i++) {
            unit = postingAmount(list[i]);
            if (unit === null) return soft("E_UNIT", id);
            if (!list[i].fromClass) continue;
            sum += unit;
        }
        const unmapped = m && m.unmapped && isAmount(m.unmapped.cp) ? m.unmapped.cp : 0;
        if (sum + unmapped !== one) return soft("E_UNBALANCED", id + " yield " + sum + " mass " + one);
        const at = atOf(detail);
        return applyMaterial(id, list, n, cause || "mine", at, preferMaterial(id));
    }
    function resolveMaterial(name) {
        if (materials.material(name)) return name;
        const text = String(name || "");
        const tail = text.indexOf(":") >= 0 ? text.split(":").pop() : text;
        if (materials.material(tail)) return tail;
        return null;
    }

    function build(detail, cause) {
        const gate = mustSealed();
        if (gate) return gate;
        const id = detail.elementId;
        const count = isAmount(detail.count) && detail.count > 0 ? detail.count : 1;
        const bill = id ? materials.billOfMaterials(id) : null;
        const at = atOf(detail);
        if (bill && Array.isArray(bill.lines) && bill.lines.length && !bill.massless) {
            const rows = [];
            let i, line;
            for (i = 0; i < bill.lines.length; i++) {
                line = bill.lines[i];
                if (!line || !line.class || !isAmount(line.cp)) return soft("E_NO_DATA", id);
                rows.push({
                    process: "build",
                    fromCls: line.class,
                    fromForm: "item",
                    toCls: line.class,
                    toForm: "object",
                    amount: mul(line.cp, count),
                    item: line.item || "",
                    objectId: id,
                    count: line.count ? mul(line.count, count) : 0
                });
            }
            const bad = checkMoves(rows, cause);
            if (bad) return bad;
            for (i = 0; i < rows.length; i++) {
                if (available(rows[i].fromCls, "item", null) < rows[i].amount) return soft("E_INSUFFICIENT", rows[i].fromCls + "/item");
            }
            runMoves(rows, cause);
            for (i = 0; i < rows.length; i++) {
                takeCp(rows[i].fromCls, "item", rows[i].amount, null);
                givePlace({
                    elementId: id,
                    materialId: canonMaterial(rows[i].toCls, "object") || id,
                    pathId: canonMaterial(rows[i].toCls, "object") || id,
                    cls: rows[i].toCls,
                    form: "object",
                    cp: rows[i].amount,
                    x: at.x, y: at.y, z: at.z,
                    outdoor: detail.outdoor === true,
                    exempt: detail.exempt !== false,
                    step: 0,
                    done: false
                });
            }
            compact();
            return { ok: true, posted: rows.length, cause: cause };
        }
        if (detail.item && isAmount(detail.count) && detail.count > 0) {
            let cp;
            try { cp = materials.massOf(detail.item, "item", detail.count); }
            catch (e) { return soft(e.code || "E_FORM", detail.item); }
            if (!isAmount(cp) || cp === 0) return soft("E_OPEN", String(detail.item));
            const items = data && data.masses && data.masses.items;
            const row = items && items[detail.item];
            const cls = row && row.ledger && row.ledger.class;
            if (!cls) return soft("E_NO_DATA", String(detail.item));
            const move = { process: "build", fromCls: cls, fromForm: "item", toCls: cls, toForm: "object", amount: cp, item: detail.item, objectId: id || detail.item, count: detail.count };
            const bad = checkMoves([move], cause);
            if (bad) return bad;
            if (available(cls, "item", null) < cp) return soft("E_INSUFFICIENT", cls + "/item");
            runMoves([move], cause);
            takeCp(cls, "item", cp, null);
            givePlace({
                elementId: id || detail.item,
                materialId: canonMaterial(cls, "object") || detail.item,
                pathId: canonMaterial(cls, "object") || detail.item,
                cls: cls,
                form: "object",
                cp: cp,
                x: at.x, y: at.y, z: at.z,
                outdoor: detail.outdoor === true,
                exempt: detail.exempt !== false
            });
            compact();
            return { ok: true, posted: 1, cause: cause };
        }
        unpaid++;
        remember({ code: "E_UNPAID", msg: cause || "build" });
        if (strict) die("E_UNPAID", cause || "build");
        return { ok: false, code: "E_UNPAID", unpaid: true };
    }

    function postElement(elementId, which, cause, detail) {
        const gate = mustSealed();
        if (gate) return gate;
        const o = objectRecord(elementId);
        if (!o) return soft("E_NO_DATA", String(elementId));
        if (o.massless) return { ok: true, massless: true };
        const block = o[which];
        if (!block || !Array.isArray(block.postings)) return soft("E_NO_DATA", elementId + " " + which);
        const count = detail && isAmount(detail.count) && detail.count > 0 ? detail.count : 1;
        return applyElementPostings(elementId, block.postings, count, cause, atOf(detail));
    }

    function noteObject(detail) {
        const toId = detail.toId || "";
        const fromId = detail.fromId || "";
        if (detail.phase === "before") {
            if (!ledger.isSealed()) return { ok: true, open: true };
            const created = oreClassesOf(toId);
            if (!created.length) return { ok: true };
            const prior = oreClassesOf(fromId);
            let i;
            for (i = 0; i < created.length; i++) if (prior.indexOf(created[i]) < 0) {
                return refuse("E_ORE_OUTPUT", toId || created[i]);
            }
            return { ok: true };
        }
        if (coverDepth > 0) return { ok: true, covered: true };
        if (fromId && !toId) return postElement(fromId, "yield", detail.cause || "objects:remove", { count: 1, at: detail.at });
        if (!fromId && toId) {
            unpaid++;
            remember({ code: "E_UNPAID", msg: "object " + toId });
            if (strict) die("E_UNPAID", toId);
            return { ok: false, code: "E_UNPAID", unpaid: true };
        }
        return { ok: true, unmapped: true };
    }

    function note(kind, detail) {
        const d = detail || {};
        const cause = d.cause || kind;
        if (kind === "tick") return tick(d.n || 1);
        if (kind === "mine") return mine(d.material || d.materialId, d.slices, cause, d);
        if (kind === "build") return build(d, cause);
        if (kind === "deconstruct") return postElement(d.elementId, "yield", cause, d);
        if (kind === "collapse") return postElement(d.elementId, "collapse", cause, d);
        if (kind === "harvest") return postElement(d.elementId, "yield", cause, d);
        if (kind === "decay") {
            const gate = mustSealed();
            if (gate) return gate;
            const place = findDecayPlace(d);
            if (!place) return soft("E_NO_PLACE", d.materialId || d.elementId || "decay");
            return advance(place, cause);
        }
        if (kind === "object") return noteObject(d);
        if (kind === "item") {
            if (coverDepth > 0) return { ok: true, covered: true };
            remember({ code: "E_UNDECLARED", msg: (d.op || "item") + " " + (d.type || "") });
            if (strict) die("E_UNDECLARED", d.type || "item");
            return { ok: false, code: "E_UNDECLARED", unmapped: true };
        }
        if (kind === "deck") {
            unpaid++;
            remember({ code: "E_UNPAID", msg: "deck " + (d.material || "") + " x" + (d.count || 0) });
            if (strict) die("E_UNPAID", "deck");
            return { ok: false, code: "E_UNPAID", unpaid: true };
        }
        return soft("E_KIND", String(kind));
    }

    function findDecayPlace(d) {
        let i, p, best = null;
        for (i = 0; i < places.length; i++) {
            p = places[i];
            if (p.cp <= 0 || p.done) continue;
            if (d.elementId && p.elementId !== d.elementId) continue;
            if (d.materialId && p.materialId !== d.materialId && p.pathId !== d.materialId) continue;
            if (!d.elementId && !d.materialId) continue;
            if (!best || p.id < best.id) best = p;
        }
        return best;
    }

    function recountMap() {
        const map = {};
        let i, p, bucket;
        for (i = 0; i < places.length; i++) {
            p = places[i];
            if (p.cp <= 0) continue;
            if (!map[p.cls]) map[p.cls] = {};
            bucket = map[p.cls];
            bucket[p.form] = (bucket[p.form] || 0) + p.cp;
        }
        return map;
    }
    function familyDrift() {
        const diffs = [];
        if (!base) return diffs;
        let i, f, actual;
        for (i = 0; i < familyNames.length; i++) {
            f = familyNames[i];
            actual = ledger.familyTotal(f);
            if (actual !== base[f]) diffs.push({ family: f, expected: base[f], actual: actual, delta: actual - base[f] });
        }
        return diffs;
    }
    function conserved() {
        const diffs = familyDrift();
        let recountOk = true;
        let recountMsg = "";
        try {
            ledger.assertBalanced(recountMap());
        } catch (e) {
            recountOk = false;
            recountMsg = e.message || String(e);
        }
        return { ok: diffs.length === 0 && recountOk && !!base, diffs: diffs, recountOk: recountOk, recountMsg: recountMsg };
    }
    function blocks() {
        const groups = {};
        let i, p, key, id, slice, names, out, g;
        for (i = 0; i < places.length; i++) {
            p = places[i];
            if (!p.done || p.form !== "strata" || p.cp <= 0) continue;
            if (p.cls !== "stone" && p.cls !== "humus") continue;
            key = p.x + "," + p.y + "," + p.z + "|" + p.cls;
            if (!groups[key]) groups[key] = { x: p.x, y: p.y, z: p.z, cls: p.cls, cp: 0, pathId: p.pathId };
            groups[key].cp += p.cp;
        }
        names = Object.keys(groups).sort();
        out = [];
        for (i = 0; i < names.length; i++) {
            g = groups[names[i]];
            id = g.cls === "humus" ? "humus" : "stone";
            try { slice = materials.massOf(id, "strata", 1); }
            catch (e) { slice = null; }
            out.push({
                x: g.x, y: g.y, z: g.z, cls: g.cls, cp: g.cp, slice: slice,
                blocks: slice ? Math.floor(g.cp / slice) : 0,
                remainder: slice ? g.cp % slice : g.cp
            });
        }
        return out;
    }
    function checksum() {
        const body = {
            ticks: ticks,
            cursor: cursor,
            ledger: ledger.checksum(),
            places: places.map(function (p) {
                return {
                    id: p.id, elementId: p.elementId, materialId: p.materialId, pathId: p.pathId,
                    cls: p.cls, form: p.form, cp: p.cp, x: p.x, y: p.y, z: p.z,
                    outdoor: p.outdoor, exempt: p.exempt, done: p.done, parked: p.parked, step: p.step
                };
            })
        };
        return fnv1a(canon(body));
    }
    function snapshot() {
        return {
            schema: 2,
            places: copy(places),
            nextId: nextId,
            cursor: cursor,
            ticks: ticks,
            moves: moves,
            refused: refused,
            unpaid: unpaid,
            base: base ? copy(base) : null,
            ledger: ledger.snapshot()
        };
    }
    function restore(snap) {
        if (isObj(snap) && snap.schema === 1) die("E_UNIT_PROVENANCE", "reclaim");
        if (!isObj(snap) || snap.schema !== 2 || !Array.isArray(snap.places)) die("E_SNAPSHOT", "reclaim");
        for (let i = 0; i < snap.places.length; i++) {
            const place = snap.places[i];
            if (!isObj(place) || !isAmount(place.cp) || Object.prototype.hasOwnProperty.call(place, "mu")) die("E_SNAPSHOT", "place cp");
        }
        ledger.restore(snap.ledger);
        places = copy(snap.places);
        nextId = snap.nextId;
        cursor = snap.cursor;
        ticks = snap.ticks;
        moves = snap.moves;
        refused = snap.refused;
        unpaid = snap.unpaid;
        base = snap.base ? copy(snap.base) : null;
        return { ok: true };
    }

    return Object.freeze({
        registerSlice: registerSlice,
        registerItem: registerItem,
        registerObject: registerObject,
        registerHolding: registerHolding,
        seal: seal,
        note: note,
        mine: function (id, slices, cause, detail) { return mine(id, slices, cause, detail || {}); },
        tick: tick,
        cover: function (fn) {
            coverDepth++;
            try { return fn(); }
            finally { coverDepth--; }
        },
        covered: function () { return coverDepth > 0; },
        conserved: conserved,
        blocks: blocks,
        places: function () { return copy(places); },
        leaks: function () { return copy(leaks); },
        checksum: checksum,
        snapshot: snapshot,
        restore: restore,
        stats: function () {
            return { ticks: ticks, moves: moves, refused: refused, unpaid: unpaid, places: places.length, strict: strict };
        }
    });
}

function install(root, session) {
    if (!isObj(root) || !session) {
        const e = new Error("E_CONFIG");
        e.name = "ReclaimError";
        e.code = "E_CONFIG";
        throw e;
    }
    if (!root.UF) root.UF = {};
    root.UF.Matter = session;
    return session;
}

module.exports = { createReclaim: createReclaim, install: install, SCHEMA: 2 };
