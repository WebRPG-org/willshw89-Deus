"use strict";
// SIM.40.00 material catalogue reader (DEC-028, matter conserved by weight).
//
// Host-agnostic sim module in the same sense as game/js/sim/ledger.js: CommonJS, no host global, no clock, no randomness.
// It does not load files and it does not post to the ledger. Callers pass the catalogue, the mass tables and the
// interaction matrix. validate(data, ledgerDefaults) returns named errors; it does not throw for a bad catalogue.
// Amounts are non-negative safe integers. All masses are integer centipounds (cp).
// Iteration is sorted. The same data gives the same checksum. A different catalogue gives a different checksum.

var SCHEMA = 1;
var MAX = Number.MAX_SAFE_INTEGER;
var STATUS = { SOURCED: 1, PM_DEFAULT: 1, PM_DEFAULT_UNCONFIRMED: 1, OWNER_OPEN: 1, PLACEHOLDER: 1 };
var KINDS = { natural: 1, loose: 1, constructed: 1, none: 1 };
var RUST_TO = { fe_metal: "fe_trace", cu_metal: "cu_trace", ag_metal: "ag_trace", steel: "fe_trace" };
var NOBLE = { au_metal: 1, pt_metal: 1, electrum: 1 };

function isObj(v) { return typeof v === "object" && v !== null && !Array.isArray(v); }
function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
function sortedKeys(o) { return Object.keys(o).sort(); }
function isInt(n) { return typeof n === "number" && Number.isSafeInteger(n); }
function isAmount(n) { return isInt(n) && n >= 0 && n <= MAX; }
function copy(v) { return JSON.parse(JSON.stringify(v)); }
function divRound(n, d) { return Math.floor((n + Math.floor(d / 2)) / d); }
function procOf(p) { return p["process"]; }

function kgToCp(kg) {
    if (typeof kg !== "number" || !Number.isSafeInteger(kg) || kg < 0) return 0;
    var num = BigInt(kg) * 10000000000n;
    var den = 45359237n;
    var q = num / den;
    var r = num % den;
    return Number(q + (r * 2n >= den ? 1n : 0n));
}

function canon(v) {
    if (v === null) return "null";
    if (typeof v === "number") return String(v);
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "boolean") return v ? "true" : "false";
    if (Array.isArray(v)) {
        var i, parts = [];
        for (i = 0; i < v.length; i++) parts.push(canon(v[i]));
        return "[" + parts.join(",") + "]";
    }
    if (isObj(v)) {
        var keys = sortedKeys(v), bits = [], k;
        for (k = 0; k < keys.length; k++) bits.push(JSON.stringify(keys[k]) + ":" + canon(v[keys[k]]));
        return "{" + bits.join(",") + "}";
    }
    return "null";
}
function fnv1a(text) {
    var h = 0x811c9dc5, i, c;
    for (i = 0; i < text.length; i++) {
        c = text.charCodeAt(i);
        h ^= c & 0xff;
        h = Math.imul(h, 0x01000193) >>> 0;
        h ^= c >>> 8;
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ("0000000" + h.toString(16)).slice(-8);
}

function indexMaterials(list) {
    var byId = {}, byStrata = {}, i, m;
    for (i = 0; i < list.length; i++) {
        m = list[i];
        byId[m.id] = m;
        if (typeof m.strataId === "number") byStrata[m.strataId] = m;
    }
    return { byId: byId, byStrata: byStrata };
}

function createMaterials(data) {
    var bag = isObj(data) ? data : {};
    var cat = isObj(bag.catalogue) ? bag.catalogue : {};
    var masses = isObj(bag.masses) ? bag.masses : {};
    var list = Array.isArray(cat.materials) ? cat.materials : [];
    var idx = indexMaterials(list);
    var items = isObj(masses.items) ? masses.items : {};
    var objects = isObj(masses.objects) ? masses.objects : {};

    function material(id) {
        var m = idx.byId[id];
        if (!m && (typeof id === "number" || (typeof id === "string" && id === String(Number(id))))) m = idx.byStrata[Number(id)];
        if (!m) return null;
        var res = copy(m);
        if (res.unmapped && res.unmapped.cp != null && res.unmapped.mu == null) res.unmapped.mu = res.unmapped.cp;
        return res;
    }
    function failAmount() {
        var e = new Error("E_AMOUNT");
        e.code = "E_AMOUNT";
        throw e;
    }
    function failForm() {
        var e = new Error("E_FORM");
        e.code = "E_FORM";
        throw e;
    }
    function sliceOf(m, count) {
        var slice;
        if (m.massless) return 0;
        slice = m.cpPerStratum != null ? m.cpPerStratum : m.massPerSlice;
        if (!isAmount(slice)) return null;
        if (count > 0 && slice > Math.floor(MAX / count)) failAmount();
        return slice * count;
    }
    // A strata id is readable as a slice when the ledger class has a strata form, or the record's own
    // form is ice or fluid. Bone sets strataForm.bookable false.
    function sliceReadable(m) {
        if (m.strataForm && m.strataForm.bookable === false) return false;
        if (m.ledgerForm === "strata" || m.ledgerForm === "ice" || m.ledgerForm === "fluid") return true;
        return typeof m.strataId === "number";
    }
    function massOf(id, form, count) {
        var row, m, mass;
        if (!isAmount(count)) failAmount();
        if (count === 0) return 0;
        if (form === "item") {
            row = items[id];
            if (!row) return null;
            if (row.massless) return 0;
            mass = row.massCp != null ? row.massCp : row.massMu;
            if (!isAmount(mass)) return null;
            if (mass > Math.floor(MAX / count)) failAmount();
            return mass * count;
        }
        if (form === "object" || form === "ruin") {
            row = objects[id];
            if (row) {
                if (row.massless) return 0;
                mass = row.massCp != null ? row.massCp : row.massMu;
                if (!isAmount(mass)) return null;
                if (mass > Math.floor(MAX / count)) failAmount();
                return mass * count;
            }
            m = idx.byId[id];
            if (m && m.massless) return 0;
            if (m && isAmount(m.cpPerStratum != null ? m.cpPerStratum : m.massPerSlice)) return sliceOf(m, count);
            return null;
        }
        m = idx.byId[id];
        if (!m && typeof id === "number") m = idx.byStrata[id];
        if (!m && typeof id === "string" && id === String(Number(id))) m = idx.byStrata[Number(id)];
        if (!m) return null;
        if (form !== "strata" && form !== m.ledgerForm) failForm();
        if (form === "strata" && !sliceReadable(m)) failForm();
        return sliceOf(m, count);
    }
    function yieldOf(id) {
        var m = idx.byId[id], o = objects[id];
        function aliasPostings(y) {
            if (!y || !Array.isArray(y.postings)) return y;
            var c = copy(y), i, p;
            for (i = 0; i < c.postings.length; i++) {
                p = c.postings[i];
                if (p.cp != null && p.mu == null) p.mu = p.cp;
            }
            return c;
        }
        if (m && o) return { material: m.yield ? aliasPostings(m.yield) : null, object: o.yield ? aliasPostings(o.yield) : null };
        if (m) return m.yield ? aliasPostings(m.yield) : null;
        if (o) return o.yield ? aliasPostings(o.yield) : null;
        return null;
    }
    function reclaimTarget(id) {
        var m = idx.byId[id] || idx.byStrata[id];
        if (!m || !m.reclaim) return null;
        return copy(m.reclaim);
    }
    function billOfMaterials(elementId) {
        var o = objects[elementId], m = idx.byId[elementId], lines, total, i, elemVal;
        if (o && Array.isArray(o.bill)) {
            lines = copy(o.bill);
            total = 0;
            for (i = 0; i < o.bill.length; i++) {
                if (lines[i].cp != null && lines[i].mu == null) lines[i].mu = lines[i].cp;
                total += (lines[i].cp != null ? lines[i].cp : lines[i].mu) || 0;
            }
            elemVal = o.massCp != null ? o.massCp : (o.massMu || 0);
            return {
                elementId: elementId,
                lines: lines,
                totalCp: total,
                elementCp: elemVal,
                totalMu: total,
                elementMu: elemVal,
                massless: o.massless === true,
                reason: o.reason || null
            };
        }
        if (m && m.bill && Array.isArray(m.bill.lines)) {
            var b = copy(m.bill);
            if (b.totalCp != null && b.totalMu == null) b.totalMu = b.totalCp;
            if (Array.isArray(b.lines)) {
                for (i = 0; i < b.lines.length; i++) {
                    if (b.lines[i].cp != null && b.lines[i].mu == null) b.lines[i].mu = b.lines[i].cp;
                }
            }
            return b;
        }
        return null;
    }
    function checksum() { return fnv1a(canon(bag)); }
    function describe() {
        var nMassless = 0, id;
        for (id of sortedKeys(objects)) if (objects[id].massless) nMassless++;
        return {
            schema: SCHEMA,
            materials: list.length,
            items: sortedKeys(items).length,
            objects: sortedKeys(objects).length,
            masslessObjects: nMassless,
            massUnit: cat.massUnit || "cp",
            calendar: cat.calendar ? copy(cat.calendar) : null,
            exemptionImplemented: cat.exemption ? cat.exemption.implemented === true : null
        };
    }
    return Object.freeze({
        material: material,
        massOf: massOf,
        yieldOf: yieldOf,
        reclaimTarget: reclaimTarget,
        billOfMaterials: billOfMaterials,
        validate: function (d, ledgerDefaults) { return validate(d === undefined ? bag : d, ledgerDefaults); },
        checksum: checksum,
        describe: describe
    });
}

function validate(data, ledgerDefaults) {
    var errors = [];
    function err(code, where) { errors.push(code + ": " + where); }
    if (!isObj(data) || !isObj(data.catalogue) || !isObj(data.masses) || !isObj(data.interactions)) {
        return ["E_SCHEMA: data"];
    }
    var cat = data.catalogue, masses = data.masses, ix = data.interactions;
    var ledger = ledgerDefaults;
    if (!isObj(ledger) || !isObj(ledger.classes) || !Array.isArray(ledger.transforms)) {
        return ["E_SCHEMA: ledgerDefaults"];
    }
    if (cat.schema !== SCHEMA || masses.schema !== SCHEMA || ix.schema !== SCHEMA) err("E_SCHEMA", "schema");

    if (cat.massUnit !== "cp") err("E_UNIT_STATUS", "catalogue.massUnit");
    if (masses.massUnit !== "cp") err("E_UNIT_STATUS", "masses.massUnit");
    if (cat.mu != null) err("E_UNIT_STATUS", "catalogue.mu");
    if (masses.muRef != null) err("E_UNIT_STATUS", "masses.muRef");

    var cal = cat.calendar || {};
    if (cal.status !== "OWNER_OPEN" || cal.dpy != null || cal.tickHz != null) err("E_OWNER_OPEN", "calendar");
    var geo = cat.geometry || {};
    if (has(geo, "layerCount")) err("E_LAYER_COUNT", "geometry.layerCount");
    if (!geo.legacyHalfSlice || geo.legacyHalfSlice.implemented !== false) err("E_MIGRATION", "geometry.legacyHalfSlice");
    if (!cat.exemption || cat.exemption.implemented !== false) err("E_MIGRATION", "exemption");

    var classes = ledger.classes;
    function clsOf(name) { return has(classes, name) ? classes[name] : null; }
    function isOre(name) { var c = clsOf(name); return !!(c && c.ore === true); }
    function formsOf(name) { var c = clsOf(name); return c && Array.isArray(c.forms) ? c.forms : []; }
    function familyName(name) { var c = clsOf(name); return c && typeof c.family === "string" ? c.family : null; }
    function familyUnit(name) {
        var c = clsOf(name), keys, i, fam, unit, u;
        if (!c || !ledger.families) return null;
        if (c.family) return ledger.families[c.family] ? ledger.families[c.family].unit : null;
        if (!isObj(c.composition)) return null;
        keys = sortedKeys(c.composition);
        unit = null;
        for (i = 0; i < keys.length; i++) {
            fam = ledger.families[keys[i]];
            u = fam ? fam.unit : null;
            if (!u) return null;
            if (unit && unit !== u) return null;
            unit = u;
        }
        return unit;
    }

    function statusOk(node, where) {
        var i, keys, k, v;
        if (Array.isArray(node)) {
            for (i = 0; i < node.length; i++) statusOk(node[i], where + "[" + i + "]");
            return;
        }
        if (!isObj(node)) return;
        keys = sortedKeys(node);
        for (i = 0; i < keys.length; i++) {
            k = keys[i];
            v = node[k];
            if (k === "status" || /Status$/.test(k)) {
                if (!STATUS[v]) err("E_STATUS", where + "." + k);
            } else if (isObj(v) || Array.isArray(v)) statusOk(v, where + "." + k);
        }
    }
    statusOk(cat, "catalogue");
    statusOk(masses, "masses");
    statusOk(ix, "interactions");

    if (!Array.isArray(cat.materials)) {
        err("E_SCHEMA", "materials");
        errors.sort();
        return errors;
    }
    var items = masses.items || {}, objects = masses.objects || {};
    var byId = {}, strataUsed = {}, mi, m;
    for (mi = 0; mi < cat.materials.length; mi++) {
        m = cat.materials[mi];
        if (!isObj(m) || typeof m.id !== "string") { err("E_SCHEMA", "materials[" + mi + "]"); continue; }
        if (byId[m.id]) err("E_ID", "duplicate " + m.id);
        byId[m.id] = m;
        if (m.strataId != null) {
            if (!isInt(m.strataId) || m.strataId < 0 || m.strataId > 63) err("E_ID", m.id + ".strataId");
            if (strataUsed[m.strataId]) err("E_ID", "strata " + m.strataId);
            strataUsed[m.strataId] = m.id;
        }
        if (!KINDS[m.kind]) err("E_SCHEMA", m.id + ".kind");
        checkMaterial(m);
    }

    function transformOk(p) {
        var name = procOf(p), rows, r, i;
        if (name === "identity" || name === "none") return true;
        if (!p.class) return true;
        rows = ledger.transforms;
        for (i = 0; i < rows.length; i++) {
            r = rows[i];
            if (r.id === name && r.from === p.fromClass && r.fromForms.indexOf(p.fromForm) >= 0 && r.to === p.class && r.toForms.indexOf(p.form) >= 0) return true;
        }
        return false;
    }
    function famAdd(map, cls, amount, explicit) {
        var c, keys, den, i, f, part;
        if (explicit) { map[explicit] = (map[explicit] || 0) + amount; return true; }
        c = clsOf(cls);
        if (!c) return false;
        if (c.family) { map[c.family] = (map[c.family] || 0) + amount; return true; }
        if (!isObj(c.composition)) return false;
        keys = sortedKeys(c.composition);
        den = 0;
        for (i = 0; i < keys.length; i++) den += c.composition[keys[i]];
        if (!den || amount % den !== 0) return false;
        for (i = 0; i < keys.length; i++) {
            f = keys[i];
            part = amount / den * c.composition[f];
            map[f] = (map[f] || 0) + part;
        }
        return true;
    }
    function famEqual(a, b, where) {
        var keys = {}, i, k, list;
        for (k in a) if (has(a, k)) keys[k] = 1;
        for (k in b) if (has(b, k)) keys[k] = 1;
        list = sortedKeys(keys);
        for (i = 0; i < list.length; i++) {
            k = list[i];
            if ((a[k] || 0) !== (b[k] || 0)) err("E_FAMILY_MASS", where + " " + k);
        }
    }
    function holdingsFam(h) {
        var map = {}, k, parts;
        for (k in h) if (has(h, k) && h[k]) {
            parts = k.split("|");
            if (!famAdd(map, parts[0], h[k], null)) err("E_FAMILY_MASS", "holding " + k);
        }
        return map;
    }
    function ledgerAmt(p) {
        if (p.cp != null) return isAmount(p.cp) ? p.cp : 0;
        if (p.du != null) return isAmount(p.du) ? p.du : 0;
        return isAmount(p.mu) ? p.mu : 0;
    }
    // Postings are an ordered script. Amounts taken from the original source must sum to the source
    // mass (a later step may move that same mass onward). Final holdings must keep each family.
    function checkPostings(ps, where, mass, sourceOre, startMap, sourceFamilies) {
        var i, p, h = {}, k, from, to, amt, extra, covered = 0, original = {}, taken = {}, name, unit, massCode, applied;
        massCode = where.indexOf("collapse") >= 0 ? "E_COLLAPSE_MASS" : "E_YIELD_MASS";
        for (k in startMap) if (has(startMap, k)) { h[k] = startMap[k]; original[k] = 1; }
        if (!ps) return;
        for (i = 0; i < ps.length; i++) {
            p = ps[i];
            name = procOf(p);
            if (p.mu != null || p.du != null) err("E_UNIT", where + " legacy mu/du");
            if (p.unmappedMu != null) err("E_UNIT", where + " unmappedMu");
            if (!p.class) {
                if (p.cp != null && !isAmount(p.cp)) err("E_MASS", where);
                if (p.unmappedCp != null && !isAmount(p.unmappedCp)) err("E_MASS", where + " unmapped");
                covered += (p.cp || 0) + (p.unmappedCp || 0);
                continue;
            }
            if (!clsOf(p.class)) err("E_LEDGER_CLASS", where + " " + p.class);
            else if (formsOf(p.class).indexOf(p.form) < 0) err("E_FORM", where + " " + p.class + " " + p.form);
            if (p.fromClass && clsOf(p.fromClass) && formsOf(p.fromClass).indexOf(p.fromForm) < 0) err("E_FORM", where + " from " + p.fromClass + " " + p.fromForm);
            if (!transformOk(p)) err("E_TRANSFORM", where + " " + name + " " + p.fromClass + "->" + p.class);
            if (!isAmount(p.cp)) err("E_MASS", where);
            if (p.unmappedCp != null && !isAmount(p.unmappedCp)) err("E_MASS", where + " unmapped");
            amt = ledgerAmt(p);
            extra = isAmount(p.unmappedCp) ? p.unmappedCp : 0;
            from = p.fromClass + "|" + p.fromForm;
            to = p.class + "|" + p.form;
            if (original[from]) covered += amt + extra;
            applied = (h[from] || 0) >= amt;
            if (!applied) err(massCode, where);
            else {
                h[from] = (h[from] || 0) - amt;
                h[to] = (h[to] || 0) + amt;
                if (original[from] && amt) famAdd(taken, p.class, amt, p.family || null);
            }
            if (isOre(p.class)) {
                var allowed = sourceOre && sourceOre[p.class] >= amt && p.sameClass === true;
                if (!allowed) err("E_ORE_OUTPUT", where + " " + p.class);
            }
            if (p.form === "item" && !p.item) {
                var bulkOk = p.bulk === true && procOf(p) === "identity" && p.fromForm === "item" && p.fromClass === p.class;
                var gapOk = typeof p.gap === "string" && p.gap.length > 0;
                if (!bulkOk && !gapOk) err("E_ITEM_TYPE", where + " " + p.class);
            }
        }
        checkItemCounts(ps, where);
        if (isAmount(mass) && covered !== mass) err(massCode, where);
        if (sourceFamilies) {
            famEqual(sourceFamilies, taken, where);
            famEqual(sourceFamilies, holdingsFam(h), where);
        }
    }
    function materialStart(m) {
        var start = {}, ledgerPart = m.cpPerStratum != null ? m.cpPerStratum : m.massPerSlice, key;
        var unmapped = m.unmapped ? (m.unmapped.cp != null ? m.unmapped.cp : m.unmapped.mu) : 0;
        if (isAmount(unmapped)) ledgerPart -= unmapped;
        if (ledgerPart < 0) ledgerPart = 0;
        if (m.ledger && m.ledger.class && m.ledgerForm && ledgerPart > 0) {
            key = m.ledger.class + "|" + m.ledgerForm;
            start[key] = ledgerPart;
        }
        return start;
    }
    function objectStart(row) {
        var start = {}, i, form, key, amt;
        for (i = 0; i < row.lines.length; i++) {
            form = row.lines[i].form || "object";
            key = row.lines[i].class + "|" + form;
            amt = row.lines[i].cp != null ? row.lines[i].cp : row.lines[i].mu;
            start[key] = (start[key] || 0) + (amt || 0);
        }
        return start;
    }
    function reclaimStepOk(step) {
        var parsed, proc, from, to, i, r;
        if (step === "identity" || step === "none") return true;
        parsed = /^([a-z_]+):([A-Za-z0-9_]+)->([A-Za-z0-9_]+)$/.exec(step);
        if (parsed) {
            proc = parsed[1];
            from = parsed[2];
            to = parsed[3];
            for (i = 0; i < ledger.transforms.length; i++) {
                r = ledger.transforms[i];
                if (r.id !== proc) continue;
                if (r.from === from && r.to === to) return true;
                if (r.from === r.to && r.fromForms.indexOf(from) >= 0 && r.toForms.indexOf(to) >= 0) return true;
            }
            return false;
        }
        if (/^[a-z_]+$/.test(step)) {
            for (i = 0; i < ledger.transforms.length; i++) if (ledger.transforms[i].id === step) return true;
        }
        return false;
    }
    function sourceOreOf(m) {
        var o = {}, mass = m.cpPerStratum != null ? m.cpPerStratum : m.massPerSlice;
        if (m.ledger && m.ledger.class && isOre(m.ledger.class) && isAmount(mass)) o[m.ledger.class] = mass;
        return o;
    }
    function sourceFam(m) {
        var map = {}, unmapped = 0, ledgerCp, c, mass = m.cpPerStratum != null ? m.cpPerStratum : m.massPerSlice;
        if (!isAmount(mass) || !m.ledger) return map;
        if (m.unmapped && isAmount(m.unmapped.cp != null ? m.unmapped.cp : m.unmapped.mu)) {
            unmapped = m.unmapped.cp != null ? m.unmapped.cp : m.unmapped.mu;
        }
        c = m.ledger.class;
        if (m.ledger.composition) c = m.ledger.class;
        if (!c) return map;
        ledgerCp = mass - unmapped;
        if (ledgerCp < 0) ledgerCp = 0;
        famAdd(map, c, ledgerCp, null);
        return map;
    }

    function checkMaterial(m) {
        var where = "materials." + m.id;
        if (m.massPerSlice != null) err("E_UNIT", where + " massPerSlice");
        if (m.muPerDu != null) err("E_UNIT", where + " muPerDu");
        if (m.supportLoadMuPerSlice != null) err("E_UNIT", where + " supportLoadMuPerSlice");
        var stratumMass = m.cpPerStratum != null ? m.cpPerStratum : m.massPerSlice;
        if (m.massless) {
            if (typeof m.reason !== "string" || !m.reason) err("E_MASSLESS", where);
            if (stratumMass !== 0) err("E_MASSLESS", where);
        } else if (stratumMass == null) {
            var openOk = m.massStatus === "OWNER_OPEN" || m.massStatus === "PLACEHOLDER";
            if (!openOk) err("E_MASS", where + " open");
        } else if (!isAmount(stratumMass) || stratumMass < 1) {
            err("E_MASS", where);
        }

        // CP rules
        if (m.id === "water") {
            if (stratumMass !== 312000) err("E_CP_RULE", where + " water");
        } else if (m.id === "lava") {
            if (stratumMass !== 905218) err("E_CP_RULE", where + " lava");
        } else if (m.id === "ice") {
            if (stratumMass !== 312000) err("E_CP_RULE", where + " ice");
        } else if (!m.massless && isAmount(m.kgPerSlice)) {
            var expCp = kgToCp(m.kgPerSlice);
            if (m.ledger && m.ledger.composition) {
                var den = 0, ck = sortedKeys(m.ledger.composition), ci;
                for (ci = 0; ci < ck.length; ci++) den += m.ledger.composition[ck[ci]];
                if (den && expCp % den !== 0) expCp = Math.round(expCp / den) * den;
            }
            if (stratumMass !== expCp) err("E_CP_RULE", where);
        }
        if (isAmount(m.supportLoadKgPerSlice) || isAmount(m.supportLoadCpPerSlice)) {
            if (!isAmount(m.supportLoadKgPerSlice) || !isAmount(m.supportLoadCpPerSlice) || m.supportLoadCpPerSlice !== kgToCp(m.supportLoadKgPerSlice)) {
                err("E_CP_RULE", where + " supportLoad");
            }
        }
        if (m.speciesScale && isAmount(m.kgPerSlice)) {
            var sk = sortedKeys(m.speciesScale), si, sp, expect;
            for (si = 0; si < sk.length; si++) {
                sp = byId[sk[si]];
                if (!sp || !isAmount(sp.densityKgM3)) { err("E_CP_RULE", where + " species " + sk[si]); continue; }
                expect = kgToCp(divRound(m.kgPerSlice * sp.densityKgM3, 750));
                if (m.speciesScale[sk[si]] !== expect) err("E_CP_RULE", where + " species " + sk[si]);
            }
        }
        if (m.ledger && m.ledger.class) {
            var c = clsOf(m.ledger.class);
            if (!c) err("E_LEDGER_CLASS", where + " " + m.ledger.class);
            else if (m.ledger.composition) {
                if (!c.composition) err("E_ALLOY", where);
                else {
                    var a = sortedKeys(m.ledger.composition), b = sortedKeys(c.composition), i;
                    if (a.length !== b.length) err("E_ALLOY", where);
                    for (i = 0; i < a.length; i++) if (a[i] !== b[i] || m.ledger.composition[a[i]] !== c.composition[a[i]]) err("E_ALLOY", where);
                }
                if (m.ledger.family) err("E_ALLOY", where + " family");
            } else if (m.ledger.family && c && c.family && m.ledger.family !== c.family) err("E_LEDGER_FAMILY", where);
            if (c && c.family && ledger.families && !has(ledger.families, c.family) && m.ledger.family) err("E_LEDGER_FAMILY", where);
            if (m.ledger.unit && m.ledger.unit !== "cp") err("E_UNIT", where + " ledger.unit");
            if (c && typeof m.strataId === "number") {
                var sliceForm = formsOf(m.ledger.class).indexOf("strata") >= 0 || m.ledgerForm === "ice" || m.ledgerForm === "fluid";
                if (!sliceForm && (!m.strataForm || m.strataForm.bookable !== false || typeof m.strataForm.gap !== "string" || !m.strataForm.gap)) err("E_FORM", where + " strata");
            }
        } else if (!m.massless && !m.reserved && !(m.unmapped && m.unmapped.reason)) {
            if (stratumMass != null) err("E_LEDGER_CLASS", where);
        }
        if (m.unmapped && !m.unmapped.reason) err("E_GAP_UNDECLARED", where);
        if (m.laneQPerMille && m.laneQPerMille.appliedToLedger === true) err("E_GAP_UNDECLARED", where + " applied");
        if (m.blastGroup && ix.blast && ix.blast.groups && !has(ix.blast.groups, m.blastGroup)) err("E_BLAST_GROUP", where);
        if (m.decay && m.decay.dc && !(cat.decayClasses && isObj(cat.decayClasses[m.decay.dc]))) err("E_SCHEMA", where + " decay");
        if (m.decay && m.decay.outputClass) {
            if (!clsOf(m.decay.outputClass)) err("E_LEDGER_CLASS", where + " decay");
            if (isOre(m.decay.outputClass)) err("E_ORE_OUTPUT", where + " decay");
        }
        if (m.combustion && m.combustion.ledger) {
            var L = m.combustion.ledger;
            if ((L.ashPerMille || 0) + (L.charPerMille || 0) !== 1000) err("E_COMBUSTION_MASS", where);
            if (L.ashClass && L.ashClass !== "ash") err("E_ORE_OUTPUT", where + " combustion");
            if (L.charClass && L.charClass !== "charcoal") err("E_ORE_OUTPUT", where + " combustion");
            if (L.ashPerMille && isOre("ash")) err("E_ORE_OUTPUT", where);
        }
        if (m.reclaim && m.reclaim.ledgerClass) {
            if (!clsOf(m.reclaim.ledgerClass)) err("E_LEDGER_CLASS", where + " reclaim");
            if (isOre(m.reclaim.ledgerClass)) err("E_ORE_OUTPUT", where + " reclaim " + m.reclaim.ledgerClass);
            var src = m.ledger && m.ledger.class;
            if (src && RUST_TO[src] && m.reclaim.ledgerClass !== RUST_TO[src]) err("E_METAL_RECLAIM", where);
            if (src && NOBLE[src] && m.reclaim.ledgerClass !== src) err("E_METAL_RECLAIM", where);
        }
        if (m.reclaim && m.reclaim.classByElement) {
            var ek = sortedKeys(m.reclaim.classByElement), ei;
            for (ei = 0; ei < ek.length; ei++) {
                var target = m.reclaim.classByElement[ek[ei]];
                if (isOre(target)) err("E_ORE_OUTPUT", where + " classByElement");
                if (RUST_TO[ek[ei] === "iron" ? "fe_metal" : ek[ei] === "copper" ? "cu_metal" : ek[ei] === "silver" ? "ag_metal" : ek[ei] === "steel" ? "steel" : ""]) {
                    var key = ek[ei] === "iron" ? "fe_metal" : ek[ei] === "copper" ? "cu_metal" : ek[ei] === "silver" ? "ag_metal" : "steel";
                    if (target !== RUST_TO[key]) err("E_METAL_RECLAIM", where + " " + ek[ei]);
                }
            }
        }
        if (m.bill && Array.isArray(m.bill.lines)) {
            var bs = 0, bi;
            for (bi = 0; bi < m.bill.lines.length; bi++) {
                if (m.bill.lines[bi].mu != null) err("E_UNIT", where + " bill line mu");
                bs += (m.bill.lines[bi].cp != null ? m.bill.lines[bi].cp : m.bill.lines[bi].mu) || 0;
            }
            if (isAmount(stratumMass) && bs !== stratumMass) err("E_BOM", where);
            var bTot = m.bill.totalCp != null ? m.bill.totalCp : m.bill.totalMu;
            if (bTot != null && bTot !== bs) err("E_BOM", where + " total");
        }
        if (m.bulkKgByLineage) {
            var rule = m.id === "scrap" ? 4 : 5;
            var bk = sortedKeys(m.bulkKgByLineage), bki, parent, got;
            for (bki = 0; bki < bk.length; bki++) {
                parent = byId[bk[bki]];
                if (!parent || !isAmount(parent.kgPerSlice)) continue;
                got = m.id === "scrap" ? divRound(parent.kgPerSlice, 4) : divRound(parent.kgPerSlice * 3, rule);
                if (m.bulkKgByLineage[bk[bki]] !== got) err("E_CP_RULE", where + " bulk " + bk[bki]);
            }
        }
        if (m.solidify) {
            var bas = byId[m.solidify.basaltId];
            var basExp = bas ? (bas.cpPerStratum != null ? bas.cpPerStratum : bas.massPerSlice) : null;
            if (!bas || m.solidify.basaltCp !== basExp) err("E_COLLAPSE_MASS", where + " solidify");
        }
        if (m.reclaim && Array.isArray(m.reclaim.path)) {
            var pi;
            for (pi = 0; pi < m.reclaim.path.length; pi++) {
                if (!reclaimStepOk(m.reclaim.path[pi])) err("E_PATH", where + " " + m.reclaim.path[pi]);
            }
        }
        if (isAmount(stratumMass) && !m.massless && m.ledgerForm !== "fluid") {
            var oreSrc = sourceOreOf(m);
            var start = materialStart(m);
            var fam = sourceFam(m);
            if (m.yield && m.yield.postings) checkPostings(m.yield.postings, where + " yield", stratumMass, oreSrc, start, fam);
            else err("E_YIELD_MASS", where + " missing");
            if (m.collapse && m.collapse.postings) checkPostings(m.collapse.postings, where + " collapse", stratumMass, oreSrc, start, fam);
            else err("E_COLLAPSE_MASS", where + " missing");
        }
        if (m.ledger && m.ledger.composition && isAmount(stratumMass)) {
            var den = 0, ck = sortedKeys(m.ledger.composition), ci;
            for (ci = 0; ci < ck.length; ci++) den += m.ledger.composition[ck[ci]];
            if (den && stratumMass % den !== 0) err("E_ALLOY", where + " multiple");
        }
    }

    var items = masses.items || {}, objects = masses.objects || {};
    var index = masses.catalogIndex || { items: [], objects: [] };
    var ii, oid;
    if (!Array.isArray(index.items) || !Array.isArray(index.objects)) err("E_COVERAGE", "catalogIndex");
    else {
        for (ii = 0; ii < index.items.length; ii++) if (!has(items, index.items[ii])) err("E_COVERAGE", "item " + index.items[ii]);
        for (ii = 0; ii < index.objects.length; ii++) if (!has(objects, index.objects[ii])) err("E_COVERAGE", "object " + index.objects[ii]);
        if (sortedKeys(items).length !== index.items.length) err("E_COVERAGE", "item extras");
        if (sortedKeys(objects).length !== index.objects.length) err("E_COVERAGE", "object extras");
    }
    var itemIds = sortedKeys(items);
    for (ii = 0; ii < itemIds.length; ii++) checkItem(itemIds[ii], items[itemIds[ii]]);
    var objIds = sortedKeys(objects);
    for (oid = 0; oid < objIds.length; oid++) checkObject(objIds[oid], objects[objIds[oid]]);

    function checkItem(id, row) {
        var where = "items." + id;
        if (!isObj(row)) { err("E_SCHEMA", where); return; }
        if (row.massless) {
            if (!row.reason) err("E_MASSLESS", where);
            return;
        }
        if (row.massMu != null) err("E_UNIT", where + " massMu");
        var itemMass = row.massCp != null ? row.massCp : row.massMu;
        if (!isAmount(itemMass) || itemMass < 1) err("E_MASS", where);
        if (row.catalogWeightCp != null && row.catalogWeightCp !== itemMass) err("E_ITEM_WEIGHT", where);
        if (row.catalogWeightTimes1000 != null && row.massCp == null && row.catalogWeightTimes1000 !== itemMass) err("E_ITEM_WEIGHT", where);
        if (!row.ledger || !clsOf(row.ledger.class)) err("E_LEDGER_CLASS", where);
        else if (familyName(row.ledger.class) && row.ledger.family !== familyName(row.ledger.class)) err("E_LEDGER_FAMILY", where);
        if (row.ledger && row.ledger.unit && row.ledger.unit !== "cp") err("E_UNIT", where);
    }
    function lineFam(lines) {
        var map = {}, i, amt;
        for (i = 0; i < lines.length; i++) {
            amt = lines[i].cp != null ? lines[i].cp : lines[i].mu;
            map[lines[i].family] = (map[lines[i].family] || 0) + amt;
        }
        return map;
    }
    function oreBag(lines) {
        var o = {}, i, amt;
        for (i = 0; i < lines.length; i++) {
            if (isOre(lines[i].class)) {
                amt = lines[i].cp != null ? lines[i].cp : lines[i].mu;
                o[lines[i].class] = (o[lines[i].class] || 0) + amt;
            }
        }
        return o;
    }
    function checkObject(id, row) {
        var where = "objects." + id, i, sum, b, ps, lineSum, objMass, it, itMass, bAmt;
        if (!isObj(row)) { err("E_SCHEMA", where); return; }
        if (row.massless) {
            if (typeof row.reason !== "string" || !row.reason) err("E_MASSLESS", where);
            if (row.massCp !== 0 && row.massMu !== 0) err("E_MASSLESS", where);
            return;
        }
        if (row.massMu != null) err("E_UNIT", where + " massMu");
        objMass = row.massCp != null ? row.massCp : row.massMu;
        if (!isAmount(objMass) || objMass < 1) err("E_MASS", where);
        if (!Array.isArray(row.lines)) { err("E_SCHEMA", where + " lines"); return; }
        lineSum = 0;
        for (i = 0; i < row.lines.length; i++) {
            if (row.lines[i].mu != null) err("E_UNIT", where + " line mu");
            lineSum += (row.lines[i].cp != null ? row.lines[i].cp : row.lines[i].mu) || 0;
            if (!clsOf(row.lines[i].class)) err("E_LEDGER_CLASS", where + " " + row.lines[i].class);
            else {
                if (familyName(row.lines[i].class) && row.lines[i].family !== familyName(row.lines[i].class)) err("E_LEDGER_FAMILY", where);
                var lineForm = row.lines[i].form || "object";
                if (formsOf(row.lines[i].class).indexOf(lineForm) < 0) err("E_FORM", where + " line " + row.lines[i].class + " " + lineForm);
            }
        }
        if (lineSum !== objMass) err("E_BOM", where + " lines");
        if (Array.isArray(row.bill)) {
            sum = 0;
            for (i = 0; i < row.bill.length; i++) {
                b = row.bill[i];
                if (b.mu != null) err("E_UNIT", where + " bill mu");
                it = items[b.item];
                itMass = it ? (it.massCp != null ? it.massCp : it.massMu) : null;
                bAmt = b.cp != null ? b.cp : b.mu;
                if (!it) err("E_COVERAGE", where + " bill " + b.item);
                else if (itMass != null && b.count * itMass !== bAmt) err("E_BOM", where + " " + b.item);
                sum += bAmt || 0;
            }
            if (sum !== objMass) err("E_BOM", where);
        }
        var bag = oreBag(row.lines);
        var start = objectStart(row);
        var fam = lineFam(row.lines);
        ps = row.yield && row.yield.postings;
        if (!ps) err("E_YIELD_MASS", where);
        else checkPostings(ps, where + " yield", objMass, bag, start, fam);
        ps = row.collapse && row.collapse.postings;
        if (!ps) err("E_COLLAPSE_MASS", where);
        else checkPostings(ps, where + " collapse", objMass, bag, start, fam);
    }
    function checkItemCounts(ps, where) {
        var i, p, itMass, led;
        for (i = 0; i < ps.length; i++) {
            p = ps[i];
            led = p.cp != null ? p.cp : (p.du != null && p.mu == null ? p.du : p.mu);
            if (p.item && p.count != null && items[p.item]) {
                itMass = items[p.item].massCp != null ? items[p.item].massCp : items[p.item].massMu;
                if (p.count * itMass !== led) err("E_BOM", where + " count " + p.item);
            }
        }
    }

    if (!Array.isArray(ix.rusts) || !Array.isArray(ix.erodes)) err("E_SCHEMA", "interactions");
    else {
        var r, t;
        for (r = 0; r < ix.rusts.length; r++) {
            t = ix.rusts[r];
            if (!clsOf(t.class)) err("E_LEDGER_CLASS", "rust " + t.class);
            if (t.to && isOre(t.to)) err("E_ORE_OUTPUT", "rust " + t.to);
            if (RUST_TO[t.class] && t.to !== RUST_TO[t.class]) err("E_METAL_RECLAIM", "rust " + t.class);
            if (NOBLE[t.class] && t.to) err("E_METAL_RECLAIM", "rust " + t.class);
        }
        for (r = 0; r < ix.erodes.length; r++) {
            t = ix.erodes[r];
            if (!clsOf(t.from) || !clsOf(t.to)) err("E_LEDGER_CLASS", "erode " + t.from);
            if (isOre(t.to)) err("E_ORE_OUTPUT", "erode " + t.to);
        }
    }
    errors.sort();
    var uniq = [], last = "", ui;
    for (ui = 0; ui < errors.length; ui++) if (errors[ui] !== last) { uniq.push(errors[ui]); last = errors[ui]; }
    return uniq;
}

module.exports = { createMaterials: createMaterials, validate: validate, SCHEMA: SCHEMA };
