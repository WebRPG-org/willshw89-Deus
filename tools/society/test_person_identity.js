#!/usr/bin/env node
"use strict";

/**
 * tools/society/test_person_identity.js
 *
 * Headless checks for the person identity record (INV-SOC-01, INV-SOC-02):
 * independent craft, civicOffice and class; NONE on each axis; schema validation;
 * save/load and old-save migration; Year-0 founders.
 *
 * Mutants (each must fail a check it targets): coupling one axis into another,
 * rejecting NONE, dropping a saved identity on load, copying current duty into craft.
 *
 * Usage: node tools/society/test_person_identity.js [--module]
 * --module skips the Year-0 world. The lane gate runs this file with no arguments.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..", "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const IDENTITY_PATH = path.join(ROOT, "game", "js", "sim", "society", "identity.js");
const SCHEMA_PATH = path.join(ROOT, "game", "data", "society", "person_identity.schema.json");
const DOC_PATH = path.join(ROOT, "docs", "systems", "DEUS_PersonIdentity.md");
const SRD_PATH = path.join(ROOT, "game", "data", "srd51", "character_options.json");
const SEED = 424242;
const YEAR0_PLUGINS = ["DEUS_Core", "DEUS_World", "DEUS_WorldGen", "DEUS_Factions", "DEUS_History", "DEUS_Levels",
    "DEUS_Dnd5e", "DEUS_Callings", "DEUS_HistoricalDemographics", "DEUS_Colonists"];

const Identity = require(IDENTITY_PATH);
const simHook = require("../lib/vm_sim_require"); // WG.00.44: UF.Sim.require and a 1x1 grid in the vm
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
const doc = fs.readFileSync(DOC_PATH, "utf8");

function same(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}
function clone(v) {
    return JSON.parse(JSON.stringify(v));
}
function axesExcept(record, axis) {
    if (!record || !record.class) return null;
    const copy = {
        craft: record.craft,
        civicOffice: record.civicOffice,
        class: { id: record.class.id, level: record.class.level }
    };
    if (axis === "craft") delete copy.craft;
    else if (axis === "civicOffice") delete copy.civicOffice;
    else delete copy.class;
    return copy;
}
function typeOk(spec, value) {
    const types = Array.isArray(spec) ? spec : [spec];
    return types.some(t => {
        if (t === "null") return value === null;
        if (t === "integer") return typeof value === "number" && Number.isInteger(value);
        if (t === "number") return typeof value === "number";
        if (t === "string") return typeof value === "string";
        if (t === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
        return false;
    });
}
function schemaErrors(node, value) {
    if (!node || typeof node !== "object") return [];
    const errors = [];
    if (node.not) {
        if (schemaErrors(node.not, value).length === 0) errors.push("not");
    }
    if (Object.prototype.hasOwnProperty.call(node, "const") && value !== node.const) errors.push("const");
    if (Array.isArray(node.enum) && node.enum.indexOf(value) < 0) errors.push("enum");
    if (node.type && !typeOk(node.type, value)) errors.push("type");
    if (typeof value === "number" && Number.isInteger(value)) {
        if (typeof node.minimum === "number" && value < node.minimum) errors.push("minimum");
        if (typeof node.maximum === "number" && value > node.maximum) errors.push("maximum");
    }
    const objectLike = node.type === "object" || (Array.isArray(node.type) && node.type.indexOf("object") >= 0) || node.properties || node.required;
    if (objectLike) {
        if (value === null || typeof value !== "object" || Array.isArray(value)) errors.push("object");
        else {
            const props = node.properties || {};
            if (node.additionalProperties === false) {
                for (const k of Object.keys(value)) {
                    if (!Object.prototype.hasOwnProperty.call(props, k)) errors.push("extra:" + k);
                }
            }
            for (const req of node.required || []) {
                if (!Object.prototype.hasOwnProperty.call(value, req)) errors.push("missing:" + req);
            }
            for (const k of Object.keys(props)) {
                if (!Object.prototype.hasOwnProperty.call(value, k)) continue;
                for (const e of schemaErrors(props[k], value[k])) errors.push(k + "." + e);
            }
        }
    }
    if (Array.isArray(node.allOf)) {
        for (const sub of node.allOf) for (const e of schemaErrors(sub, value)) errors.push(e);
    }
    if (node.if) {
        const matched = schemaErrors(node.if, value).length === 0;
        if (matched && node.then) for (const e of schemaErrors(node.then, value)) errors.push(e);
        if (!matched && node.else) for (const e of schemaErrors(node.else, value)) errors.push(e);
    }
    return errors;
}
function docMap() {
    const start = doc.indexOf("<!-- calling-craft-map -->");
    const end = doc.indexOf("<!-- /calling-craft-map -->");
    const map = {};
    if (start < 0 || end < start) return map;
    const lines = doc.slice(start, end).split(/\r?\n/);
    for (const line of lines) {
        const m = line.match(/^\|\s*`([a-z0-9_]+)`\s*\|\s*`([A-Z_]+)`\s*\|$/);
        if (m) map[m[1]] = m[2];
    }
    return map;
}
function srdClassIds() {
    const cat = JSON.parse(fs.readFileSync(SRD_PATH, "utf8"));
    const list = Array.isArray(cat.entries) ? cat.entries : (Array.isArray(cat) ? cat : []);
    return list.filter(e => e && e.kind === "class" && typeof e.id === "string").map(e => e.id).sort();
}
function throws(fn) {
    try { fn(); return null; }
    catch (e) { return e; }
}

function runModuleChecks(mod, docSchema) {
    const checks = [];
    const check = (name, pass, msg) => checks.push({ name, pass: !!pass, msg });
    let blank = null;
    try {
        blank = mod.create();
        check("create_defaults_none", blank.craft === "NONE" && blank.civicOffice === "NONE" && blank.class.id === "NONE" && blank.class.level === null && blank.schema === 1,
            JSON.stringify(blank));
    } catch (e) {
        check("create_defaults_none", false, e.message);
    }
    check("create_rejects_duty", !!throws(() => mod.create({ craft: "FARMER", duty: "SLEEP" })), "create accepted a duty field");

    function changed(record, axis, value) {
        try { return mod.changeAxis(record, axis, value); }
        catch (e) { return { __threw: e.message }; }
    }
    const full = mod.create({ craft: "FARMER", civicOffice: "TREASURER", class: { id: "wizard", level: 2 } });
    const before = clone(full);
    const byCraft = changed(full, "craft", "BLACKSMITH");
    const byOffice = changed(full, "civicOffice", "MARSHAL");
    const byClass = changed(full, "class", { id: "srd:class:rogue", level: 5 });
    const byNoneCraft = changed(full, "craft", "NONE");
    const byNoneOffice = changed(full, "civicOffice", "NONE");
    const byNoneClass = changed(full, "class", "NONE");
    check("input_not_mutated", same(full, before), "changeAxis wrote into the input record");
    check("change_craft_leaves_other_axes", !byCraft.__threw && same(axesExcept(byCraft, "craft"), axesExcept(before, "craft")) && byCraft.craft === "BLACKSMITH",
        JSON.stringify(byCraft));
    check("change_office_leaves_other_axes", !byOffice.__threw && same(axesExcept(byOffice, "civicOffice"), axesExcept(before, "civicOffice")) && byOffice.civicOffice === "MARSHAL",
        JSON.stringify(byOffice));
    check("change_class_leaves_other_axes", !byClass.__threw && byClass.class && same(axesExcept(byClass, "class"), axesExcept(before, "class")) && byClass.class.id === "srd:class:rogue" && byClass.class.level === 5,
        JSON.stringify(byClass));
    check("none_craft", !byNoneCraft.__threw && byNoneCraft.craft === "NONE" && same(axesExcept(byNoneCraft, "craft"), axesExcept(before, "craft")) && mod.validate(byNoneCraft).ok,
        JSON.stringify(byNoneCraft));
    check("none_office", !byNoneOffice.__threw && byNoneOffice.civicOffice === "NONE" && same(axesExcept(byNoneOffice, "civicOffice"), axesExcept(before, "civicOffice")) && mod.validate(byNoneOffice).ok,
        JSON.stringify(byNoneOffice));
    check("none_class", !byNoneClass.__threw && byNoneClass.class && byNoneClass.class.id === "NONE" && byNoneClass.class.level === null && same(axesExcept(byNoneClass, "class"), axesExcept(before, "class")) && mod.validate(byNoneClass).ok,
        JSON.stringify(byNoneClass));

    let craftLoop = !!blank;
    for (const craft of ["NONE"].concat(mod.CRAFTS)) {
        const next = blank ? changed(blank, "craft", craft) : { __threw: "no blank" };
        if (next.__threw || next.craft !== craft || next.civicOffice !== "NONE" || next.class.id !== "NONE") craftLoop = false;
    }
    check("every_craft_change_is_independent", craftLoop, "a craft change moved office or class");
    let officeLoop = !!blank;
    for (const office of ["NONE"].concat(mod.OFFICES)) {
        const next = blank ? changed(blank, "civicOffice", office) : { __threw: "no blank" };
        if (next.__threw || next.civicOffice !== office || next.craft !== "NONE" || next.class.id !== "NONE") officeLoop = false;
    }
    check("every_office_change_is_independent", officeLoop, "an office change moved craft or class");
    let classLoop = !!blank;
    for (const id of ["NONE"].concat(mod.CLASS_IDS)) {
        const next = blank ? changed(blank, "class", id === "NONE" ? "NONE" : { id, level: id.endsWith("wizard") ? 20 : 1 }) : { __threw: "no blank" };
        const level = id === "NONE" ? null : (id.endsWith("wizard") ? 20 : 1);
        if (next.__threw || next.class.id !== id || next.class.level !== level || next.craft !== "NONE" || next.civicOffice !== "NONE") classLoop = false;
    }
    check("every_class_change_is_independent", classLoop, "a class change moved craft or office");

    check("reject_bad_craft", !!throws(() => mod.changeAxis(blank, "craft", "PSION")), "bad craft was stored");
    check("reject_bad_office", !!throws(() => mod.changeAxis(blank, "civicOffice", "HEALER")), "HEALER was stored");
    check("reject_bad_class", !!throws(() => mod.changeAxis(blank, "class", "psion")), "psion was stored");
    check("reject_level_0", !!throws(() => mod.changeAxis(blank, "class", { id: "fighter", level: 0 })), "level 0 was stored");
    check("reject_level_21", !!throws(() => mod.changeAxis(blank, "class", { id: "fighter", level: 21 })), "level 21 was stored");
    check("reject_none_with_level", !!throws(() => mod.changeAxis(blank, "class", { id: "NONE", level: 1 })), "NONE carried a level");
    check("reject_class_without_level_object", !!throws(() => mod.create({ class: { id: "srd:class:fighter", level: null } })), "a class id was stored with a null level");
    check("validate_rejects_duty_field", !mod.validate(Object.assign(clone(full), { currentDuty: "SLEEP" })).ok, "duty field validated");

    const round = mod.deserialize(mod.serialize(full));
    check("serialize_round_trip", same(round, full) && mod.serialize(full).indexOf("duty") < 0, mod.serialize(full));
    check("deserialize_rejects_garbage", !!throws(() => mod.deserialize("{")), "garbage JSON validated");

    const derivedTwice = [mod.defaultsFrom({ calling: "blacksmith", rank: 1, dnd: { id: "fighter", level: 1 }, currentDuty: "HUNTER", duty: "SLEEP", job: { type: "chop" } }),
        mod.defaultsFrom({ calling: "blacksmith", rank: 1, dnd: { id: "fighter", level: 1 }, currentDuty: "HUNTER", duty: "SLEEP", job: { type: "chop" } })];
    check("defaults_deterministic", same(derivedTwice[0], derivedTwice[1]), "two derivations differed");
    check("duty_does_not_replace_craft", derivedTwice[0].craft === "BLACKSMITH" && derivedTwice[0].civicOffice === "NONE" && derivedTwice[0].class.id === "srd:class:fighter" && derivedTwice[0].class.level === 1
        && !Object.prototype.hasOwnProperty.call(derivedTwice[0], "duty") && !Object.prototype.hasOwnProperty.call(derivedTwice[0], "currentDuty"),
        JSON.stringify(derivedTwice[0]));
    const unmapped = mod.defaultsFrom({ calling: "laborer", job: { type: "mine" }, currentDuty: "chop" });
    check("unmapped_calling_is_none", unmapped.craft === "NONE" && unmapped.civicOffice === "NONE" && unmapped.class.id === "NONE", JSON.stringify(unmapped));
    const jobFallback = mod.defaultsFrom({ calling: "laborer", job: "blacksmith" });
    check("string_job_used_when_calling_does_not_map", jobFallback.craft === "BLACKSMITH", JSON.stringify(jobFallback));
    const callingWins = mod.defaultsFrom({ calling: "carpenter", job: "blacksmith" });
    check("calling_wins_over_string_job", callingWins.craft === "CARPENTER", JSON.stringify(callingWins));
    const rankLeft = mod.defaultsFrom({ calling: "mayor", rank: 1, leader: true, title: "Chief" });
    check("rank_is_not_an_office", rankLeft.craft === "NONE" && rankLeft.civicOffice === "NONE", JSON.stringify(rankLeft));
    const callingClass = mod.defaultsFrom({ calling: "cleric", dnd: { id: "fighter", level: 1 } });
    check("calling_name_is_not_the_class", callingClass.class.id === "srd:class:fighter" && callingClass.craft === "NONE", JSON.stringify(callingClass));
    const noLevel = mod.defaultsFrom({ dndClass: "wizard" });
    check("bare_class_id_is_level_1", noLevel.class.id === "srd:class:wizard" && noLevel.class.level === 1, JSON.stringify(noLevel));
    const badLevel = mod.defaultsFrom({ dnd: { id: "rogue", level: 0 } });
    check("out_of_range_level_is_none", badLevel.class.id === "NONE" && badLevel.class.level === null, JSON.stringify(badLevel));

    const saved = mod.create({ craft: "FARMER", civicOffice: "TREASURER", class: { id: "rogue", level: 4 } });
    const loaded = mod.loadUnitData({ calling: "blacksmith", rank: 1, dnd: { id: "fighter", level: 1 }, identity: saved });
    check("saved_identity_survives_load", same(loaded, saved), JSON.stringify(loaded));
    const migrated = mod.loadUnitData({ calling: { id: "lumberjack", name: "Lumberjack" }, dnd: { id: "Wizard", level: 2 } });
    check("old_save_gets_defaults", migrated.craft === "LOGGER" && migrated.class.id === "srd:class:wizard" && migrated.class.level === 2 && migrated.civicOffice === "NONE",
        JSON.stringify(migrated));
    const corrupt = mod.loadUnitData({ calling: "miner", identity: { schema: 1, craft: "PSION", civicOffice: "NONE", class: { id: "NONE", level: null } } });
    check("invalid_saved_identity_is_replaced", corrupt.craft === "MINER" && mod.validate(corrupt).ok, JSON.stringify(corrupt));

    const map = docMap();
    const mapKeys = Object.keys(map).sort();
    const modKeys = Object.keys(mod.CALLING_CRAFT).sort();
    let mapSame = mapKeys.length === modKeys.length;
    for (let i = 0; mapSame && i < mapKeys.length; i++) {
        if (mapKeys[i] !== modKeys[i] || map[mapKeys[i]] !== mod.CALLING_CRAFT[modKeys[i]]) mapSame = false;
    }
    check("doc_map_matches_module", mapSame, `doc ${mapKeys.length} module ${modKeys.length}`);

    const craftEnum = docSchema.properties.craft.enum.slice().sort();
    const officeEnum = docSchema.properties.civicOffice.enum.slice().sort();
    const classEnum = docSchema.properties.class.properties.id.enum.slice().sort();
    check("schema_craft_enum", same(craftEnum, ["NONE"].concat(mod.CRAFTS).sort()), craftEnum.join(","));
    check("schema_office_enum", same(officeEnum, ["NONE"].concat(mod.OFFICES).sort()), officeEnum.join(","));
    check("schema_class_enum", same(classEnum, ["NONE"].concat(mod.CLASS_IDS).sort()), classEnum.join(","));
    check("schema_rejects_extra", docSchema.additionalProperties === false && docSchema.properties.class.additionalProperties === false, "additionalProperties is open");
    const srd = srdClassIds();
    check("schema_matches_srd_classes", same(srd, mod.CLASS_IDS.slice().sort()), `srd ${srd.join(",")} module ${mod.CLASS_IDS.join(",")}`);

    const noneRecord = { schema: 1, craft: "NONE", civicOffice: "NONE", class: { id: "NONE", level: null } };
    const fighter = { schema: 1, craft: "HUNTER", civicOffice: "MARSHAL", class: { id: "srd:class:fighter", level: 1 } };
    check("schema_accepts_none", schemaErrors(docSchema, noneRecord).length === 0, schemaErrors(docSchema, noneRecord).join(";"));
    check("schema_accepts_fighter", schemaErrors(docSchema, fighter).length === 0, schemaErrors(docSchema, fighter).join(";"));
    check("schema_rejects_duty", schemaErrors(docSchema, Object.assign(clone(fighter), { duty: "SLEEP" })).length > 0, "schema accepted duty");
    check("schema_rejects_none_level", schemaErrors(docSchema, { schema: 1, craft: "NONE", civicOffice: "NONE", class: { id: "NONE", level: 5 } }).length > 0, "schema accepted NONE level 5");
    check("schema_rejects_null_class_level", schemaErrors(docSchema, { schema: 1, craft: "NONE", civicOffice: "NONE", class: { id: "srd:class:fighter", level: null } }).length > 0, "schema accepted a null fighter level");
    check("module_and_schema_agree", mod.validate(noneRecord).ok && mod.validate(fighter).ok, "module rejected a schema-shaped record");

    const Callings = require(path.join(PLUGINS, "DEUS_Callings.js"));
    const quota = [];
    for (let i = 0; i < 8; i++) quota.push({ data: { rank: i === 0 ? 1 : 0 } });
    Callings.assignFounderQuotas(quota, () => 0.25);
    const quotaCrafts = quota.map(u => mod.defaultsFrom(u.data).craft).sort();
    check("founder_quota_crafts", same(quotaCrafts, ["BLACKSMITH", "CARPENTER", "COOK", "HERBALIST", "LOGGER", "MINER", "NONE", "NONE"]),
        quotaCrafts.join(","));
    check("founder_quota_offices_none", quota.every(u => mod.defaultsFrom(u.data).civicOffice === "NONE"), "quota derivation wrote an office");
    return checks;
}

function applyEdits(src, edits) {
    for (const [from, to] of edits) {
        const hits = src.split(from).length - 1;
        if (hits !== 1) throw new Error(`mutant anchor found ${hits} times: ${from.slice(0, 80)}`);
        src = src.replace(from, () => to);
    }
    return src;
}

const MUTANTS = [
    {
        name: "couple_class_to_craft",
        kills: ["change_class_leaves_other_axes", "every_class_change_is_independent"],
        edits: [["        if (!normalized.ok) throw fail(\"E_CLASS\", normalized.errors[0], normalized.errors);\n        next.class = normalized.class;\n    } else throw fail(\"E_AXIS\", \"axis must be craft, civicOffice or class\");",
            "        if (!normalized.ok) throw fail(\"E_CLASS\", normalized.errors[0], normalized.errors);\n        next.class = normalized.class; next.craft = \"BLACKSMITH\";\n    } else throw fail(\"E_AXIS\", \"axis must be craft, civicOffice or class\");"]]
    },
    {
        name: "couple_craft_to_class",
        kills: ["change_craft_leaves_other_axes", "every_craft_change_is_independent"],
        edits: [["    if (axis === \"craft\") next.craft = value;", "    if (axis === \"craft\") { next.craft = value; next.class = { id: \"srd:class:fighter\", level: 1 }; }"]]
    },
    {
        name: "couple_office_to_craft",
        kills: ["change_office_leaves_other_axes", "every_office_change_is_independent"],
        edits: [["    else if (axis === \"civicOffice\") next.civicOffice = value;", "    else if (axis === \"civicOffice\") { next.civicOffice = value; next.craft = \"BLACKSMITH\"; }"]]
    },
    {
        name: "reject_none",
        kills: ["none_craft", "none_office", "none_class", "create_defaults_none"],
        edits: [
            ["    if (typeof record.craft !== \"string\" || (record.craft !== NONE && !CRAFT_SET[record.craft])) errors.push(\"craft must be NONE or a catalogue craft\");",
                "    if (typeof record.craft !== \"string\" || record.craft === NONE || !CRAFT_SET[record.craft]) errors.push(\"craft must be a catalogue craft\");"],
            ["    if (typeof record.civicOffice !== \"string\" || (record.civicOffice !== NONE && !OFFICE_SET[record.civicOffice])) errors.push(\"civicOffice must be NONE or a canonical office\");",
                "    if (typeof record.civicOffice !== \"string\" || record.civicOffice === NONE || !OFFICE_SET[record.civicOffice]) errors.push(\"civicOffice must be a canonical office\");"],
            ["        if (record.class.id === NONE) {\n            if (record.class.level !== null) errors.push(\"NONE class has no level\");\n        } else if (!CLASS_ID_SET[record.class.id]) errors.push(\"class id must be NONE or a 2014 SRD 5.1 class id\");",
                "        if (record.class.id === NONE) {\n            errors.push(\"NONE class is rejected\");\n        } else if (!CLASS_ID_SET[record.class.id]) errors.push(\"class id must be NONE or a 2014 SRD 5.1 class id\");"]
        ]
    },
    {
        name: "drop_identity_on_load",
        kills: ["saved_identity_survives_load"],
        edits: [["function loadUnitData(data) {\n    if (isObj(data) && isObj(data.identity) && validate(data.identity).ok) return copyIdentity(data.identity);\n    return defaultsFrom(data);\n}",
            "function loadUnitData(data) {\n    return defaultsFrom(data);\n}"]]
    },
    {
        name: "duty_sets_craft",
        kills: ["duty_does_not_replace_craft"],
        edits: [["    var fromCalling = craftToken(callingRaw(src));",
            "    var fromCalling = craftToken(src.currentDuty) || craftToken(src.duty) || craftToken(callingRaw(src));"]]
    },
    {
        name: "unmapped_calling_becomes_farmer",
        kills: ["unmapped_calling_is_none"],
        edits: [["    if (fromCalling) rec.craft = fromCalling;\n    else if (typeof src.job === \"string\") {",
            "    if (fromCalling) rec.craft = fromCalling;\n    else if (typeof src.job === \"string\") {"]]
    }
];

// The unmapped mutant must change behaviour. The anchor above is a no-op placeholder replaced below.
MUTANTS[MUTANTS.length - 1].edits = [[
    "    if (fromCalling) rec.craft = fromCalling;\n    else if (typeof src.job === \"string\") {\n        var fromJob = craftToken(src.job);\n        if (fromJob) rec.craft = fromJob;\n    }",
    "    if (fromCalling) rec.craft = fromCalling;\n    else if (typeof src.job === \"string\") {\n        var fromJob = craftToken(src.job);\n        if (fromJob) rec.craft = fromJob;\n    }\n    if (rec.craft === NONE) rec.craft = \"FARMER\";"
]];

function loadMutant(edits) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deus-identity-"));
    const file = path.join(dir, "identity.js");
    try {
        const src = applyEdits(fs.readFileSync(IDENTITY_PATH, "utf8"), edits);
        fs.writeFileSync(file, src);
        delete require.cache[require.resolve(file)];
        return { mod: require(file), dir };
    } catch (e) {
        fs.rmSync(dir, { recursive: true, force: true });
        throw e;
    }
}

function runMutants(baseChecks) {
    const problems = [];
    const lines = [];
    for (const mutant of MUTANTS) {
        let loaded = null;
        try {
            loaded = loadMutant(mutant.edits);
            const checks = runModuleChecks(loaded.mod, schema);
            const byName = new Map(checks.map(c => [c.name, c]));
            const killed = mutant.kills.filter(name => byName.has(name) && !byName.get(name).pass);
            const control = mutant.kills.filter(name => !baseChecks.some(c => c.name === name && c.pass));
            const ok = control.length === 0 && killed.length > 0;
            lines.push(`  [${ok ? "PASS" : "FAIL"}] mutant ${mutant.name} killed by ${killed.join(", ") || "none"}`);
            if (!ok) problems.push(`mutant ${mutant.name} ${control.length ? "control failed: " + control.join(", ") : "survived"}`);
        } catch (e) {
            lines.push(`  [FAIL] mutant ${mutant.name} threw: ${e.message}`);
            problems.push(`mutant ${mutant.name} threw`);
        } finally {
            if (loaded) fs.rmSync(loaded.dir, { recursive: true, force: true });
        }
    }
    const dropped = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
    const idx = dropped.properties.craft.enum.indexOf("NONE");
    if (idx >= 0) dropped.properties.craft.enum.splice(idx, 1);
    const none = Identity.create();
    const schemaKilled = schemaErrors(dropped, none).length > 0;
    lines.push(`  [${schemaKilled ? "PASS" : "FAIL"}] mutant schema_drops_none killed by schema_accepts_none`);
    if (!schemaKilled) problems.push("mutant schema_drops_none survived");
    return { problems, lines };
}

function readPlugin(name) {
    return fs.readFileSync(path.join(PLUGINS, name + ".js"), "utf8");
}
function tilemapStatics() {
    const core = fs.readFileSync(path.join(ROOT, "game", "js", "rmmz_core.js"), "utf8");
    const start = core.indexOf("Tilemap.TILE_ID_B = 0;");
    const table = core.indexOf("Tilemap.WATERFALL_AUTOTILE_TABLE = [");
    const end = core.indexOf("];", table) + 2;
    if (start < 0 || table < 0 || end < 2) throw new Error("rmmz_core.js Tilemap statics not found");
    return "function Tilemap() {}\n" + core.slice(start, end);
}
function loadRuntime(names) {
    const ns = {};
    const errors = [];
    const logs = [];
    const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));
    const env = {
        window: null, UF: ns, DEUS: ns, Math, performance,
        $ufWorldCatalog: catalog, $deusWorldCatalog: catalog,
        PluginManager: { parameters: () => ({}), registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false,
            makeSaveContents: () => ({}), extractSaveContents() {} },
        Input: { keyMapper: {} }, TouchInput: {}, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 }, $gameMap: { mapId: () => 0 }, $gamePlayer: {},
        $gameSystem: {}, $gameMessage: { isBusy: () => false }, ImageManager: {}, Utils: { isOptionValid: () => false },
        document: { title: "" }, addEventListener() {},
        console: {
            log(...a) { const s = a.map(x => String(x)).join(" "); if (s.includes("founder") || s.includes("UF_Colonists")) logs.push(s); },
            warn() {},
            error(...a) { errors.push(a.map(x => (x && x.stack) || String(x)).join(" ")); }
        }
    };
    env.window = env;
    const sources = names.map(n => readPlugin(n));
    const classes = new Set(["Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle"]);
    const protoRe = /\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype(?:\.([A-Za-z0-9_]+))?/g;
    for (const s of sources) for (const m of s.matchAll(protoRe)) classes.add(m[1]);
    for (const c of classes) env[c] = function() { throw new Error(`Unexpected engine construction ${c}`); };
    for (const s of sources) for (const m of s.matchAll(protoRe)) {
        if (m[2]) env[m[1]].prototype[m[2]] = () => { throw new Error(`Unexpected engine method ${m[1]}.${m[2]}`); };
    }
    simHook.install(env);
    const ctx = vm.createContext(env);
    vm.runInContext(["Math", "Object", "Array", "Number", "String", "Boolean", "Map", "Set", "JSON", "Date",
        "Uint8Array", "Uint16Array", "Int32Array", "Float32Array", "performance", "window"]
        .map(n => `const ${n} = globalThis.${n};`).join("\n"), ctx);
    vm.runInContext(tilemapStatics(), ctx, { filename: "rmmz_core.js#Tilemap-statics" });
    names.forEach((n, i) => vm.runInContext(sources[i], ctx, { filename: n + ".js", timeout: 120000 }));
    return { env, errors, logs };
}

function tally(founders) {
    const crafts = {};
    for (const u of founders) {
        const craft = u.data.identity ? u.data.identity.craft : "MISSING";
        crafts[craft] = (crafts[craft] || 0) + 1;
    }
    return crafts;
}

function runYear0() {
    const checks = [];
    const check = (name, pass, msg) => checks.push({ name, pass: !!pass, msg });
    const t0 = performance.now();
    const { env, errors, logs } = loadRuntime(YEAR0_PLUGINS);
    check("identity_module_loaded", !errors.some(e => e.includes("person identity module missing")), errors.filter(e => e.includes("identity")).join(" | ") || "module loaded");
    env.UF.NewGameSetup = { faction: "human", fogOfWar: false, seed: SEED, worldSize: 256, year: 0 };
    env.$ufTime.year = 0;
    const world = env.UF.World.newWorld(SEED);
    const units = Object.values(world.units || {});
    const people = units.filter(u => u && u.data && (u.data.kind === "colonist" || u.data.kind === "person"));
    const founders = people.filter(u => u.data.historicalFounder === true || u.data.founder === true);
    const crafts = tally(founders);
    let derivedOk = founders.length > 0;
    let classOk = founders.length > 0;
    let officeOk = founders.length > 0;
    let schemaOk = founders.length > 0;
    const bad = [];
    for (const u of founders) {
        const idn = u.data.identity;
        const again = Identity.defaultsFrom(u.data);
        if (!idn || !Identity.validate(idn).ok || !same(idn, again)) {
            derivedOk = false;
            if (bad.length < 3) bad.push(`${u.name || u.id} ${JSON.stringify(idn)} vs ${JSON.stringify(again)} calling ${JSON.stringify(u.data.calling && u.data.calling.id || u.data.calling)}`);
        }
        if (!idn || idn.civicOffice !== "NONE") officeOk = false;
        if (!idn || schemaErrors(schema, idn).length) schemaOk = false;
        const dnd = u.data.dnd;
        if (!idn || !dnd || idn.class.id !== "srd:class:" + String(dnd.id).toLowerCase() || idn.class.level !== dnd.level) classOk = false;
    }
    check("year0_founder_count", founders.length === 72, `${founders.length} historical founders, ${people.length} people, ${units.length} units (expected 72 founders); crafts ${JSON.stringify(crafts)}; errors ${errors.length}${errors.length ? ": " + errors[0].split("\n")[0] : ""}`);
    check("year0_founders_valid", derivedOk && schemaOk, bad.join(" | ") || `${founders.length} identities match derivation and the schema`);
    check("year0_founder_offices_none", officeOk, officeOk ? `${founders.length} civicOffice NONE` : "a founder civicOffice was not NONE");
    check("year0_founder_classes_follow_dnd", classOk, classOk ? `${founders.length} classes follow data.dnd` : "a founder class did not follow data.dnd");
    check("year0_identity_errors", errors.filter(e => e.includes("identity")).length === 0, errors.filter(e => e.includes("identity")).join(" | ") || "no identity errors");

    const saved = Identity.changeAxis(Identity.create({ craft: "FARMER", civicOffice: "TREASURER", class: { id: "fighter", level: 1 } }), "class", { id: "rogue", level: 4 });
    const keep = {
        version: 4, seed: SEED, size: 256, areasX: 1, areasY: 1, startArea: { x: 0, y: 0 },
        zRange: world.zRange, diffs: {}, objectDiffs: {}, nextUnitId: 2,
        units: { 1: { id: 1, name: "Aldric", data: { kind: "colonist", founder: true, calling: { id: "blacksmith" }, rank: 1, dnd: { id: "fighter", level: 1 }, identity: saved } } }
    };
    env.DataManager.extractSaveContents({ ufWorld: keep });
    const kept = env.UF.World.state.units[1].data.identity;
    check("plugin_load_keeps_saved_identity", same(kept, saved), JSON.stringify(kept));

    const old = {
        version: 4, seed: SEED, size: 256, areasX: 1, areasY: 1, startArea: { x: 0, y: 0 },
        zRange: world.zRange, diffs: {}, objectDiffs: {}, nextUnitId: 3,
        units: { 2: { id: 2, name: "Bren", data: { kind: "person", founder: true, calling: { id: "lumberjack", name: "Lumberjack" }, rank: 1, dnd: { id: "wizard", level: 1 } } } }
    };
    env.DataManager.extractSaveContents({ ufWorld: old });
    const filled = env.UF.World.state.units[2].data.identity;
    check("plugin_load_fills_old_save", filled && filled.craft === "LOGGER" && filled.civicOffice === "NONE" && filled.class.id === "srd:class:wizard" && filled.class.level === 1,
        JSON.stringify(filled));
    const ms = performance.now() - t0;
    return { checks, ms, logs, errors };
}

function main() {
    console.log("=== PERSON IDENTITY (SOC.10.01, INV-SOC-01, INV-SOC-02) ===");
    const problems = [];
    console.log("\n--- Module, schema and derivation ---");
    const moduleChecks = runModuleChecks(Identity, schema);
    for (const c of moduleChecks) {
        console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name}: ${c.msg}`);
        if (!c.pass) problems.push(`FAIL ${c.name}`);
    }
    console.log("\n--- Mutants ---");
    const mutants = runMutants(moduleChecks);
    for (const line of mutants.lines) console.log(line);
    for (const p of mutants.problems) problems.push(p);

    console.log("\n--- Year-0 founders and save/load ---");
    let year = null;
    if (process.argv.includes("--module")) {
        console.log("  skipped (--module)");
    } else try {
        year = runYear0();
        for (const c of year.checks) {
            console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name}: ${c.msg}`);
            if (!c.pass) problems.push(`FAIL ${c.name}`);
        }
        if (year.logs.length) console.log("  log: " + year.logs.join(" | "));
        const setupErrors = year.errors.filter(e => !e.includes("person identity module missing"));
        if (setupErrors.length) console.log(`  setup notes: ${setupErrors.length} console.error lines (first: ${setupErrors[0].split("\n")[0]})`);
        console.log(`  year-0 section ${year.ms.toFixed(0)} ms`);
    } catch (e) {
        console.log(`  [FAIL] year0_threw: ${e.stack || e.message}`);
        problems.push("year0 threw");
    }

    console.log("\n==================================================");
    if (problems.length) {
        console.error("TEST SUITE FAILED:");
        for (const p of problems) console.error("  " + p);
        console.log("==================================================");
        process.exit(1);
    }
    const n = moduleChecks.length + (year ? year.checks.length : 0);
    console.log(`PERSON IDENTITY PASSED: ${n} checks, ${MUTANTS.length + 1} mutants killed.`);
    console.log("==================================================");
}

main();
