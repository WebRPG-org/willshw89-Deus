"use strict";

// Person identity (INV-SOC-01, INV-SOC-02). Pure data: no host global, no clock,
// no file reads, no randomness. Current duty is not a field of this record.

var VERSION = 1;
var NONE = "NONE";

var CRAFTS = Object.freeze([
    "FARMER", "MINER", "LOGGER", "QUARRYMAN", "HUNTER", "FISHER", "FORAGER",
    "SMELTER", "BLACKSMITH", "ARMORER", "WEAPONSMITH",
    "CARPENTER", "MASON", "WOODCARVER", "THATCHER",
    "LEATHERWORKER", "TANNER", "TAILOR", "WEAVER", "SPINNER",
    "COOK", "BREWER", "MILLER", "BUTCHER", "BAKER",
    "POTTER", "GLASSWORKER", "JEWELER", "FLETCHER", "BOWYER", "HERBALIST", "ALCHEMIST", "SCRIBE", "MERCHANT"
]);

var OFFICES = Object.freeze([
    "EXECUTIVE", "LEADER", "STEWARD", "ADMIN", "TREASURER", "MINT_MASTER",
    "MARSHAL", "QUARTERMASTER", "MASTER_OF_WORKS", "PROVISIONER", "RECORDER",
    "MAGISTRATE", "HEALER_DIRECTOR", "ENVOY", "TRADE_MASTER"
]);

var CLASS_SHORT = Object.freeze([
    "barbarian", "bard", "cleric", "druid", "fighter", "monk",
    "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard"
]);

// Clear calling-id or profession-token -> craft. Unlisted callings stay NONE.
// Primary calling wins. A string `job` is used only when the calling does not map.
// Operational duty (currentDuty, a job object, a UF job type such as "chop") is not read.
var CALLING_CRAFT = Object.freeze({
    farmer: "FARMER",
    farmhand: "FARMER",
    carpenter: "CARPENTER",
    blacksmith: "BLACKSMITH",
    mason: "MASON",
    lumberjack: "LOGGER",
    miller: "MILLER",
    fisherman: "FISHER",
    herbalist: "HERBALIST",
    butcher: "BUTCHER",
    hunter: "HUNTER",
    potter: "POTTER",
    tanner: "TANNER",
    leatherworker: "LEATHERWORKER",
    weaver: "WEAVER",
    chef: "COOK",
    spinner: "SPINNER",
    brewer: "BREWER",
    miner: "MINER",
    fletcher: "FLETCHER",
    weaponsmith: "WEAPONSMITH",
    armorsmith: "ARMORER",
    glasswright: "GLASSWORKER",
    jeweler: "JEWELER",
    alchemist: "ALCHEMIST",
    merchant: "MERCHANT"
});

var CLASS_IDS = Object.freeze(CLASS_SHORT.map(function(short) { return "srd:class:" + short; }));

var CRAFT_SET = indexOf(CRAFTS);
var OFFICE_SET = indexOf(OFFICES);
var CLASS_ID_SET = indexOf(CLASS_IDS);
var SHORT_TO_ID = (function() {
    var map = {};
    for (var i = 0; i < CLASS_SHORT.length; i++) map[CLASS_SHORT[i]] = CLASS_IDS[i];
    return map;
})();
var CRAFT_BY_SLUG = (function() {
    var map = {};
    for (var i = 0; i < CRAFTS.length; i++) map[slug(CRAFTS[i])] = CRAFTS[i];
    return map;
})();

function indexOf(list) {
    var map = {};
    for (var i = 0; i < list.length; i++) map[list[i]] = 1;
    return map;
}

function isObj(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function slug(s) {
    return String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function fail(code, message, errors) {
    var err = new Error(message || code);
    err.code = code;
    if (errors) err.errors = errors;
    return err;
}

function classIdFrom(raw) {
    if (raw === NONE) return NONE;
    if (typeof raw !== "string") return null;
    var text = raw.trim();
    if (text === NONE || text.toLowerCase() === "none") return NONE;
    if (SHORT_TO_ID[text]) return SHORT_TO_ID[text];
    var low = text.toLowerCase();
    if (SHORT_TO_ID[low]) return SHORT_TO_ID[low];
    if (low.indexOf("srd:class:") === 0 && SHORT_TO_ID[low.slice("srd:class:".length)]) return SHORT_TO_ID[low.slice("srd:class:".length)];
    return null;
}

function isLevel(n) {
    return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 20;
}

function normalizeClass(value) {
    if (value === NONE || value === null) return { ok: true, class: { id: NONE, level: null } };
    if (typeof value === "string") {
        var id = classIdFrom(value);
        if (!id) return { ok: false, errors: ["unknown class"] };
        if (id === NONE) return { ok: true, class: { id: NONE, level: null } };
        return { ok: true, class: { id: id, level: 1 } };
    }
    if (!isObj(value)) return { ok: false, errors: ["class must be a string or an object"] };
    var keys = Object.keys(value);
    for (var i = 0; i < keys.length; i++) {
        if (keys[i] !== "id" && keys[i] !== "level") return { ok: false, errors: ["unknown class field " + keys[i]] };
    }
    var id2 = classIdFrom(value.id);
    if (!id2) return { ok: false, errors: ["unknown class"] };
    if (id2 === NONE) {
        if (value.level !== undefined && value.level !== null) return { ok: false, errors: ["NONE class has no level"] };
        return { ok: true, class: { id: NONE, level: null } };
    }
    var level = value.level === undefined ? 1 : value.level;
    if (!isLevel(level)) return { ok: false, errors: ["class level must be an integer 1..20"] };
    return { ok: true, class: { id: id2, level: level } };
}

function blank() {
    return { schema: VERSION, craft: NONE, civicOffice: NONE, class: { id: NONE, level: null } };
}

function copyIdentity(record) {
    return {
        schema: record.schema,
        craft: record.craft,
        civicOffice: record.civicOffice,
        class: { id: record.class.id, level: record.class.level }
    };
}

function craftToken(raw) {
    if (typeof raw !== "string" || !raw) return null;
    if (raw === NONE) return NONE;
    var key = slug(raw);
    if (key === "none") return NONE;
    if (CALLING_CRAFT[key]) return CALLING_CRAFT[key];
    if (CRAFT_BY_SLUG[key]) return CRAFT_BY_SLUG[key];
    return null;
}

function officeToken(raw) {
    if (typeof raw !== "string" || !raw) return null;
    if (raw === NONE) return NONE;
    var upper = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (upper === NONE) return NONE;
    if (OFFICE_SET[upper]) return upper;
    return null;
}

function callingRaw(source) {
    var c = source.calling;
    if (isObj(c)) c = c.id || c.name;
    if ((c === undefined || c === null || c === "") && Array.isArray(source.callings) && source.callings.length) {
        var first = source.callings[0];
        c = isObj(first) ? (first.id || first.name) : first;
    }
    return typeof c === "string" ? c : "";
}

function validate(record) {
    var errors = [];
    if (!isObj(record)) return { ok: false, errors: ["identity must be an object"] };
    if (record.schema !== VERSION) errors.push("schema must be 1");
    var allowed = { schema: 1, craft: 1, civicOffice: 1, class: 1 };
    var keys = Object.keys(record);
    for (var i = 0; i < keys.length; i++) {
        if (!allowed[keys[i]]) errors.push("unknown field " + keys[i]);
    }
    if (typeof record.craft !== "string" || (record.craft !== NONE && !CRAFT_SET[record.craft])) errors.push("craft must be NONE or a catalogue craft");
    if (typeof record.civicOffice !== "string" || (record.civicOffice !== NONE && !OFFICE_SET[record.civicOffice])) errors.push("civicOffice must be NONE or a canonical office");
    if (!isObj(record.class)) errors.push("class must be an object");
    else {
        var classKeys = Object.keys(record.class);
        for (var c = 0; c < classKeys.length; c++) {
            if (classKeys[c] !== "id" && classKeys[c] !== "level") errors.push("unknown class field " + classKeys[c]);
        }
        if (record.class.id === NONE) {
            if (record.class.level !== null) errors.push("NONE class has no level");
        } else if (!CLASS_ID_SET[record.class.id]) errors.push("class id must be NONE or a 2014 SRD 5.1 class id");
        else if (!isLevel(record.class.level)) errors.push("class level must be an integer 1..20");
    }
    return { ok: errors.length === 0, errors: errors };
}

function create(partial) {
    if (partial == null) {
        var empty = blank();
        var emptyChecked = validate(empty);
        if (!emptyChecked.ok) throw fail("E_IDENTITY", emptyChecked.errors[0], emptyChecked.errors);
        return empty;
    }
    if (!isObj(partial)) throw fail("E_IDENTITY", "identity must be an object");
    var allowed = { schema: 1, craft: 1, civicOffice: 1, class: 1 };
    var keys = Object.keys(partial);
    for (var i = 0; i < keys.length; i++) {
        if (!allowed[keys[i]]) throw fail("E_IDENTITY", "unknown field " + keys[i]);
    }
    var rec = blank();
    if (partial.schema !== undefined) rec.schema = partial.schema;
    if (partial.craft !== undefined) rec.craft = partial.craft;
    if (partial.civicOffice !== undefined) rec.civicOffice = partial.civicOffice;
    if (partial.class !== undefined) {
        var normalized = normalizeClass(partial.class);
        if (!normalized.ok) throw fail("E_CLASS", normalized.errors[0], normalized.errors);
        rec.class = normalized.class;
    }
    var checked = validate(rec);
    if (!checked.ok) throw fail("E_IDENTITY", checked.errors[0], checked.errors);
    return rec;
}

function changeAxis(record, axis, value) {
    var checked = validate(record);
    if (!checked.ok) throw fail("E_IDENTITY", checked.errors[0], checked.errors);
    var next = copyIdentity(record);
    if (axis === "craft") next.craft = value;
    else if (axis === "civicOffice") next.civicOffice = value;
    else if (axis === "class") {
        var normalized = normalizeClass(value);
        if (!normalized.ok) throw fail("E_CLASS", normalized.errors[0], normalized.errors);
        next.class = normalized.class;
    } else throw fail("E_AXIS", "axis must be craft, civicOffice or class");
    var again = validate(next);
    if (!again.ok) throw fail("E_IDENTITY", again.errors[0], again.errors);
    return next;
}

function serialize(record) {
    var checked = validate(record);
    if (!checked.ok) throw fail("E_IDENTITY", checked.errors[0], checked.errors);
    return JSON.stringify(copyIdentity(record));
}

function deserialize(text) {
    var obj = text;
    if (typeof text === "string") {
        try { obj = JSON.parse(text); }
        catch (e) { throw fail("E_IDENTITY", "identity JSON did not parse"); }
    }
    var checked = validate(obj);
    if (!checked.ok) throw fail("E_IDENTITY", checked.errors[0], checked.errors);
    return copyIdentity(obj);
}

function defaultsFrom(source) {
    var src = isObj(source) ? source : {};
    var rec = blank();
    var fromCalling = craftToken(callingRaw(src));
    if (fromCalling) rec.craft = fromCalling;
    else if (typeof src.job === "string") {
        var fromJob = craftToken(src.job);
        if (fromJob) rec.craft = fromJob;
    }
    if (typeof src.civicOffice === "string") {
        var office = officeToken(src.civicOffice);
        if (office) rec.civicOffice = office;
    }
    var raw = null;
    var level;
    var hasLevel = false;
    if (isObj(src.dnd) && typeof src.dnd.id === "string") {
        raw = src.dnd.id;
        if (src.dnd.level !== undefined && src.dnd.level !== null) {
            level = src.dnd.level;
            hasLevel = true;
        }
    } else if (typeof src.dndClass === "string") raw = src.dndClass;
    else if (src.class !== undefined && src.class !== null) {
        var explicit = normalizeClass(src.class);
        if (explicit.ok) rec.class = explicit.class;
        return rec;
    } else if (typeof src.className === "string") raw = src.className;
    if (raw) {
        var spec = hasLevel ? { id: raw, level: level } : raw;
        var normalized = normalizeClass(spec);
        if (normalized.ok) rec.class = normalized.class;
    }
    return rec;
}

function loadUnitData(data) {
    if (isObj(data) && isObj(data.identity) && validate(data.identity).ok) return copyIdentity(data.identity);
    return defaultsFrom(data);
}

module.exports = {
    VERSION: VERSION,
    NONE: NONE,
    CRAFTS: CRAFTS,
    OFFICES: OFFICES,
    CLASS_SHORT: CLASS_SHORT,
    CLASS_IDS: CLASS_IDS,
    CALLING_CRAFT: CALLING_CRAFT,
    create: create,
    validate: validate,
    changeAxis: changeAxis,
    serialize: serialize,
    deserialize: deserialize,
    defaultsFrom: defaultsFrom,
    loadUnitData: loadUnitData
};
