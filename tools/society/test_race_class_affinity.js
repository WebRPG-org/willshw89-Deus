#!/usr/bin/env node
"use strict";

/**
 * SOC.11.02 gate. Canonical DEC-036 table, schema walk, and one negative
 * fixture per substantive rule. A fixture must fail with that rule's code
 * only, and must pass once the code is disabled.
 *
 *   node tools/society/test_race_class_affinity.js
 *
 * DEC-036 is the only authority for affinity rows, the ranger tank tag, and
 * which values stay OWNER_TODO. Race and class ids are read from the catalogues.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const DATA_PATH = path.join(ROOT, "game", "data", "society", "race_class_affinity.json");
const SCHEMA_PATH = path.join(ROOT, "game", "data", "society", "race_class_affinity.schema.json");
const DOC_PATH = path.join(ROOT, "docs", "systems", "DEUS_RaceClassAffinity.md");
const OPTIONS_PATH = path.join(ROOT, "game", "data", "srd51", "character_options.json");
const SPECIES_PATH = path.join(ROOT, "game", "data", "srd5_1", "species_reference.json");
const CLASS_REF_PATH = path.join(ROOT, "game", "data", "srd5_1", "classes_reference.json");
const IDENTITY_SCHEMA_PATH = path.join(ROOT, "game", "data", "society", "person_identity.schema.json");
const PLAN_SCHEMA_PATH = path.join(ROOT, "game", "data", "plans", "faction_plan.schema.json");
const FACTIONS_PATH = path.join(ROOT, "game", "js", "plugins", "DEUS_Factions.js");

const SENTINEL = "OWNER_TODO";
const SUGGESTIONS = [
    "+1 on class main rolls",
    "~10% faster class XP",
    "~1.5x job-pick weight"
];

// Owner table, including the decision's own spellings (Half-elf, Half-orc).
const DEC036 = [
    { name: "Human", affinities: ["Fighter", "Wizard", "Cleric"] },
    { name: "Dwarf", affinities: ["Paladin", "Cleric", "Rogue"] },
    { name: "Elf", affinities: ["Ranger", "Druid", "Sorcerer"] },
    { name: "Half-elf", affinities: ["Fighter", "Druid", "Bard"] },
    { name: "Halfling", affinities: ["Fighter", "Druid", "Rogue"] },
    { name: "Gnome", affinities: ["Fighter", "Cleric", "Wizard"] },
    { name: "Half-orc", affinities: ["Barbarian", "Druid", "Fighter"] },
    { name: "Tiefling", affinities: ["Fighter", "Warlock", "Cleric"] },
    { name: "Dragonborn", affinities: ["Fighter", "Monk", "Cleric"] }
];

const NON_OBVIOUS = [
    { race: "Half-elf", classes: ["Fighter", "Druid", "Bard"] },
    { race: "Half-orc", classes: ["Barbarian", "Druid", "Fighter"] }
];

const ANNOTATIONS = new Set([
    "$schema", "$id", "$defs", "$ref", "$comment", "title", "description", "examples", "default"
]);
const CONSTRAINTS = new Set([
    "type", "properties", "required", "additionalProperties", "items", "enum", "const",
    "pattern", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum",
    "minLength", "maxLength", "minItems", "maxItems", "uniqueItems", "oneOf",
    "minProperties", "maxProperties"
]);

let schemaCache = null;
let catalogueCache = null;
const patternCache = new Map();

function readText(file) {
    return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function readJson(file) {
    return JSON.parse(readText(file));
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function err(code, at, message) {
    return { code: code, path: at, message: message };
}

function schemaErr(at, keyword, message) {
    return { code: "schema", path: at, keyword: keyword, message: keyword + ": " + message };
}

function schema() {
    if (!schemaCache) schemaCache = readJson(SCHEMA_PATH);
    return schemaCache;
}

function unsupportedSchemaKeywords(node, found, seen) {
    const list = found || [];
    const visit = seen || new Set();
    if (!node || typeof node !== "object") return list;
    if (visit.has(node)) return list;
    visit.add(node);
    if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) unsupportedSchemaKeywords(node[i], list, visit);
        return list;
    }
    const keys = Object.keys(node);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key === "const" || key === "enum" || key === "default" || key === "examples") continue;
        if (!ANNOTATIONS.has(key) && !CONSTRAINTS.has(key)) list.push(key);
    }
    if (node.properties) {
        const props = Object.keys(node.properties);
        for (let i = 0; i < props.length; i++) unsupportedSchemaKeywords(node.properties[props[i]], list, visit);
    }
    if (node.$defs) {
        const defs = Object.keys(node.$defs);
        for (let i = 0; i < defs.length; i++) unsupportedSchemaKeywords(node.$defs[defs[i]], list, visit);
    }
    if (node.items && typeof node.items === "object") {
        if (Array.isArray(node.items)) list.push("items-array");
        else unsupportedSchemaKeywords(node.items, list, visit);
    }
    if (node.additionalProperties && typeof node.additionalProperties === "object") {
        unsupportedSchemaKeywords(node.additionalProperties, list, visit);
    }
    if (Array.isArray(node.oneOf)) {
        for (let i = 0; i < node.oneOf.length; i++) unsupportedSchemaKeywords(node.oneOf[i], list, visit);
    }
    return list;
}

function patternTest(source, data) {
    let re = patternCache.get(source);
    if (!re) {
        re = new RegExp(source);
        patternCache.set(source, re);
    }
    re.lastIndex = 0;
    return re.test(data);
}

function typeOk(schemaType, value) {
    const types = Array.isArray(schemaType) ? schemaType : [schemaType];
    for (let i = 0; i < types.length; i++) {
        const kind = types[i];
        if (kind === "integer" && typeof value === "number" && Number.isInteger(value)) return true;
        if (kind === "number" && typeof value === "number" && !Number.isNaN(value)) return true;
        if (kind === "null" && value === null) return true;
        if (kind === "array" && Array.isArray(value)) return true;
        if (kind === "object" && value !== null && typeof value === "object" && !Array.isArray(value)) return true;
        if (kind === "string" && typeof value === "string") return true;
        if (kind === "boolean" && typeof value === "boolean") return true;
    }
    return false;
}

function deepEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
        return true;
    }
    const ka = Object.keys(a);
    if (ka.length !== Object.keys(b).length) return false;
    for (let i = 0; i < ka.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(b, ka[i])) return false;
        if (!deepEqual(a[ka[i]], b[ka[i]])) return false;
    }
    return true;
}

function resolveRef(root, ref) {
    if (typeof ref !== "string" || ref.charAt(0) !== "#" || ref.charAt(1) !== "/") return null;
    let node = root;
    const parts = ref.slice(2).split("/");
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i].replace(/~1/g, "/").replace(/~0/g, "~");
        if (!node || typeof node !== "object" || !Object.prototype.hasOwnProperty.call(node, part)) return null;
        node = node[part];
    }
    return node;
}

function uniqueItemsOk(arr) {
    const seen = new Set();
    for (let i = 0; i < arr.length; i++) {
        const key = (arr[i] !== null && typeof arr[i] === "object") ? JSON.stringify(arr[i]) : arr[i];
        if (seen.has(key)) return false;
        seen.add(key);
    }
    return true;
}

function validateAgainst(root, node, data, at) {
    const errors = [];
    const pathHere = at || "/";
    if (!node || typeof node !== "object") return errors;
    if (node.$ref) {
        const target = resolveRef(root, node.$ref);
        if (!target) {
            errors.push(schemaErr(pathHere, "$ref", "unresolved " + node.$ref));
            return errors;
        }
        return validateAgainst(root, target, data, pathHere);
    }
    if (node.oneOf) {
        let passed = 0;
        for (let i = 0; i < node.oneOf.length; i++) {
            if (validateAgainst(root, node.oneOf[i], data, pathHere).length === 0) passed += 1;
        }
        if (passed !== 1) errors.push(schemaErr(pathHere, "oneOf", "matched " + passed + " branches, expected 1"));
        return errors;
    }
    if (node.type && !typeOk(node.type, data)) {
        errors.push(schemaErr(pathHere, "type", "expected " + JSON.stringify(node.type)));
        return errors;
    }
    if (Object.prototype.hasOwnProperty.call(node, "const") && !deepEqual(data, node.const)) {
        errors.push(schemaErr(pathHere, "const", "value does not match"));
    }
    if (node.enum && node.enum.indexOf(data) < 0) {
        errors.push(schemaErr(pathHere, "enum", "value is not in the closed set"));
    }
    if (typeof data === "string") {
        if (node.pattern) {
            let ok = true;
            try { ok = patternTest(node.pattern, data); }
            catch (e) { ok = false; }
            if (!ok) errors.push(schemaErr(pathHere, "pattern", "value does not match " + node.pattern));
        }
        if (node.minLength != null && data.length < node.minLength) {
            errors.push(schemaErr(pathHere, "minLength", "length " + data.length));
        }
        if (node.maxLength != null && data.length > node.maxLength) {
            errors.push(schemaErr(pathHere, "maxLength", "length " + data.length));
        }
    }
    if (typeof data === "number") {
        if (node.minimum != null && data < node.minimum) errors.push(schemaErr(pathHere, "minimum", String(data)));
        if (node.maximum != null && data > node.maximum) errors.push(schemaErr(pathHere, "maximum", String(data)));
        if (node.exclusiveMinimum != null && data <= node.exclusiveMinimum) {
            errors.push(schemaErr(pathHere, "exclusiveMinimum", String(data)));
        }
        if (node.exclusiveMaximum != null && data >= node.exclusiveMaximum) {
            errors.push(schemaErr(pathHere, "exclusiveMaximum", String(data)));
        }
    }
    if (Array.isArray(data)) {
        if (node.minItems != null && data.length < node.minItems) {
            errors.push(schemaErr(pathHere, "minItems", "length " + data.length));
        }
        if (node.maxItems != null && data.length > node.maxItems) {
            errors.push(schemaErr(pathHere, "maxItems", "length " + data.length));
        }
        if (node.uniqueItems === true && !uniqueItemsOk(data)) {
            errors.push(schemaErr(pathHere, "uniqueItems", "duplicate item"));
        }
        if (node.items && !Array.isArray(node.items)) {
            for (let i = 0; i < data.length; i++) {
                const nested = validateAgainst(root, node.items, data[i], pathHere + "/" + i);
                for (let j = 0; j < nested.length; j++) errors.push(nested[j]);
            }
        }
    }
    if (data !== null && typeof data === "object" && !Array.isArray(data)) {
        const keys = Object.keys(data);
        if (node.minProperties != null && keys.length < node.minProperties) {
            errors.push(schemaErr(pathHere, "minProperties", String(keys.length)));
        }
        if (node.maxProperties != null && keys.length > node.maxProperties) {
            errors.push(schemaErr(pathHere, "maxProperties", String(keys.length)));
        }
        if (node.required) {
            for (let i = 0; i < node.required.length; i++) {
                if (!Object.prototype.hasOwnProperty.call(data, node.required[i])) {
                    errors.push(schemaErr(pathHere, "required", "missing " + node.required[i]));
                }
            }
        }
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const child = pathHere === "/" ? "/" + key : pathHere + "/" + key;
            if (node.properties && node.properties[key]) {
                const nested = validateAgainst(root, node.properties[key], data[key], child);
                for (let j = 0; j < nested.length; j++) errors.push(nested[j]);
            } else if (node.additionalProperties === false) {
                errors.push(schemaErr(child, "additionalProperties", "unexpected property " + key));
            } else if (node.additionalProperties && typeof node.additionalProperties === "object") {
                const nested = validateAgainst(root, node.additionalProperties, data[key], child);
                for (let j = 0; j < nested.length; j++) errors.push(nested[j]);
            }
        }
    }
    return errors;
}

function factionShortIds() {
    const src = readText(FACTIONS_PATH);
    const start = src.indexOf("const SPECIES_MAP = {");
    const end = start < 0 ? -1 : src.indexOf("};", start);
    if (start < 0 || end < 0) throw new Error("SPECIES_MAP not found in DEUS_Factions.js");
    const block = src.slice(start, end);
    const ids = [];
    const re = /(?:^|\n)\s*(?:"([^"]+)"|([A-Za-z0-9_-]+))\s*:/g;
    let match;
    while ((match = re.exec(block))) ids.push(match[1] || match[2]);
    if (ids.length !== 9) throw new Error("SPECIES_MAP parsed " + ids.length + " ids");
    return ids;
}

function catalogues() {
    if (catalogueCache) return catalogueCache;
    const options = readJson(OPTIONS_PATH);
    const entries = Array.isArray(options.entries) ? options.entries : [];
    const races = [];
    const classes = [];
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry || typeof entry.id !== "string") continue;
        if (entry.kind === "race") races.push({ id: entry.id, name: entry.name });
        if (entry.kind === "class") classes.push({ id: entry.id, name: entry.name });
    }
    const species = readJson(SPECIES_PATH).species;
    const classRef = readJson(CLASS_REF_PATH).classes;
    const planEnum = readJson(PLAN_SCHEMA_PATH).$defs.classId.enum;
    const identityEnum = readJson(IDENTITY_SCHEMA_PATH).properties.class.properties.id.enum;
    catalogueCache = {
        races: races,
        classes: classes,
        species: species,
        classRef: classRef,
        planTokens: planEnum,
        identityIds: identityEnum,
        factionShortIds: factionShortIds()
    };
    return catalogueCache;
}

function expectedRaces() {
    const cat = catalogues();
    return DEC036.map(function (row) {
        const hits = cat.races.filter(function (race) {
            return String(race.name).toLowerCase() === row.name.toLowerCase();
        });
        if (hits.length !== 1) throw new Error("DEC-036 race " + row.name + " matched " + hits.length);
        const spec = cat.species.filter(function (item) { return item.name === hits[0].name; });
        if (spec.length !== 1) throw new Error("species name " + hits[0].name + " matched " + spec.length);
        return {
            dec036Name: row.name,
            catalogueName: hits[0].name,
            raceId: hits[0].id,
            shortId: hits[0].id.slice("srd:race:".length),
            speciesReferenceId: spec[0].id,
            affinityNames: row.affinities.slice()
        };
    });
}

function expectedClasses() {
    const cat = catalogues();
    return cat.classes.map(function (row) {
        const shortId = row.id.slice("srd:class:".length);
        const ref = cat.classRef.filter(function (item) { return item.id === shortId; });
        if (ref.length !== 1) throw new Error("classes_reference " + shortId + " matched " + ref.length);
        if (ref[0].name !== row.name) throw new Error("class name " + shortId + " is " + ref[0].name);
        return {
            classId: row.id,
            dec036Name: row.name,
            catalogueName: row.name,
            shortId: shortId,
            planToken: shortId.toUpperCase()
        };
    });
}

function classIdForName(name) {
    const hits = expectedClasses().filter(function (row) { return row.dec036Name === name; });
    if (hits.length !== 1) throw new Error("class " + name);
    return hits[0].classId;
}

function sameMembers(got, expected) {
    if (!Array.isArray(got) || got.length !== expected.length) return false;
    const seen = Object.create(null);
    for (let i = 0; i < got.length; i++) {
        if (typeof got[i] !== "string" || seen[got[i]]) return false;
        seen[got[i]] = true;
    }
    for (let i = 0; i < expected.length; i++) if (!seen[expected[i]]) return false;
    return true;
}

function pairKey(raceId, classId) {
    return raceId + "\n" + classId;
}

function expectedPairs() {
    const races = expectedRaces();
    const classes = expectedClasses();
    const pairs = [];
    for (let i = 0; i < races.length; i++) {
        for (let j = 0; j < classes.length; j++) {
            pairs.push({ raceId: races[i].raceId, classId: classes[j].classId });
        }
    }
    return pairs;
}

function cellCoverage(doc) {
    if (!doc || !Array.isArray(doc.cells)) return null;
    const counts = new Map();
    for (let i = 0; i < doc.cells.length; i++) {
        const cell = doc.cells[i];
        if (!cell || typeof cell.raceId !== "string" || typeof cell.classId !== "string") return null;
        const key = pairKey(cell.raceId, cell.classId);
        counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
}

function affinityMap(doc) {
    if (!doc || !Array.isArray(doc.affinityRows)) return null;
    const map = new Map();
    for (let i = 0; i < doc.affinityRows.length; i++) {
        const row = doc.affinityRows[i];
        if (!row || typeof row.raceId !== "string" || !Array.isArray(row.classIds)) return null;
        for (let j = 0; j < row.classIds.length; j++) {
            if (typeof row.classIds[j] !== "string") return null;
        }
        if (map.has(row.raceId)) return { dup: true, map: map };
        map.set(row.raceId, row.classIds.slice());
    }
    return { dup: false, map: map };
}

function triplesOk(doc) {
    const idx = affinityMap(doc);
    if (!idx || idx.dup) return null;
    const races = expectedRaces();
    if (idx.map.size !== races.length) return null;
    for (let i = 0; i < races.length; i++) {
        const ids = idx.map.get(races[i].raceId);
        if (!ids || ids.length !== 3 || new Set(ids).size !== 3) return null;
    }
    return idx;
}

function ruleRaceSet(doc) {
    if (!doc || !Array.isArray(doc.races)) return [];
    const ids = [];
    for (let i = 0; i < doc.races.length; i++) {
        if (!doc.races[i] || typeof doc.races[i].raceId !== "string") return [];
        ids.push(doc.races[i].raceId);
    }
    const expected = expectedRaces().map(function (race) { return race.raceId; });
    if (sameMembers(ids, expected)) return [];
    return [err("race-set", "/races", "race ids are not the nine kind:race catalogue ids")];
}

function ruleRaceOrder(doc) {
    if (!doc || !Array.isArray(doc.races)) return [];
    const ids = [];
    for (let i = 0; i < doc.races.length; i++) {
        if (!doc.races[i] || typeof doc.races[i].raceId !== "string") return [];
        ids.push(doc.races[i].raceId);
    }
    const expected = expectedRaces().map(function (race) { return race.raceId; });
    // A wrong id belongs to race-set. Order runs only on the exact set.
    if (!sameMembers(ids, expected)) return [];
    for (let i = 0; i < expected.length; i++) {
        if (ids[i] !== expected[i]) {
            return [err("race-order", "/races", "race order is not the DEC-036 table order")];
        }
    }
    return [];
}

function ruleClassSet(doc) {
    if (!doc || !Array.isArray(doc.classes)) return [];
    const ids = [];
    for (let i = 0; i < doc.classes.length; i++) {
        if (!doc.classes[i] || typeof doc.classes[i].classId !== "string") return [];
        ids.push(doc.classes[i].classId);
    }
    const expected = expectedClasses().map(function (row) { return row.classId; });
    if (sameMembers(ids, expected)) return [];
    return [err("class-set", "/classes", "class ids are not the twelve kind:class catalogue ids")];
}

function ruleClassOrder(doc) {
    if (!doc || !Array.isArray(doc.classes)) return [];
    const ids = [];
    for (let i = 0; i < doc.classes.length; i++) {
        if (!doc.classes[i] || typeof doc.classes[i].classId !== "string") return [];
        ids.push(doc.classes[i].classId);
    }
    const expected = expectedClasses().map(function (row) { return row.classId; });
    if (!sameMembers(ids, expected)) return [];
    for (let i = 0; i < expected.length; i++) {
        if (ids[i] !== expected[i]) {
            return [err("class-order", "/classes", "class order is not the character_options kind:class order")];
        }
    }
    return [];
}

function ruleRaceAlias(doc) {
    if (!doc || !Array.isArray(doc.races)) return [];
    const expected = expectedRaces();
    const byId = new Map();
    for (let i = 0; i < expected.length; i++) byId.set(expected[i].raceId, expected[i]);
    const errors = [];
    let known = 0;
    for (let i = 0; i < doc.races.length; i++) {
        const row = doc.races[i];
        if (!row || typeof row.raceId !== "string") return [];
        const exp = byId.get(row.raceId);
        if (!exp) continue;
        known += 1;
        const bridge = String(row.dec036Name).toLowerCase() === String(exp.catalogueName).toLowerCase();
        if (row.catalogueName !== exp.catalogueName || row.shortId !== exp.shortId ||
            row.speciesReferenceId !== exp.speciesReferenceId || !bridge) {
            errors.push(err("race-alias", "/races/" + i, "race aliases do not match the catalogues"));
        }
    }
    if (errors.length || known !== expected.length || doc.races.length !== expected.length) return errors;
    const shorts = doc.races.map(function (row) { return row.shortId; });
    if (!sameMembers(shorts, catalogues().factionShortIds)) {
        return [err("race-alias", "/races", "short ids are not the DEUS_Factions SPECIES_MAP keys")];
    }
    return [];
}

function ruleClassAlias(doc) {
    if (!doc || !Array.isArray(doc.classes)) return [];
    const expected = expectedClasses();
    const byId = new Map();
    for (let i = 0; i < expected.length; i++) byId.set(expected[i].classId, expected[i]);
    const plan = catalogues().planTokens;
    const identity = catalogues().identityIds;
    const errors = [];
    for (let i = 0; i < doc.classes.length; i++) {
        const row = doc.classes[i];
        if (!row || typeof row.classId !== "string") return [];
        const exp = byId.get(row.classId);
        if (!exp) continue;
        const tokenOk = row.planToken === exp.planToken && plan.indexOf(row.planToken) >= 0 && row.planToken !== "NONE";
        const identityOk = identity.indexOf(row.classId) >= 0;
        if (row.catalogueName !== exp.catalogueName || row.dec036Name !== exp.dec036Name ||
            row.shortId !== exp.shortId || !tokenOk || !identityOk) {
            errors.push(err("class-alias", "/classes/" + i, "class aliases do not match the catalogues"));
        }
    }
    return errors;
}

function ruleDec036Label(doc) {
    if (!doc || !Array.isArray(doc.races)) return [];
    const names = [];
    for (let i = 0; i < doc.races.length; i++) {
        if (!doc.races[i] || typeof doc.races[i].dec036Name !== "string") return [];
        names.push(doc.races[i].dec036Name);
    }
    const expected = DEC036.map(function (row) { return row.name; });
    if (sameMembers(names, expected)) return [];
    return [err("dec036-label", "/races", "DEC-036 spellings are " + expected.join(", "))];
}

function ruleCompleteMatrix(doc) {
    const counts = cellCoverage(doc);
    if (!counts) return [];
    const expected = expectedPairs();
    const expectedKeys = new Set();
    for (let i = 0; i < expected.length; i++) {
        expectedKeys.add(pairKey(expected[i].raceId, expected[i].classId));
    }
    const missing = [];
    expectedKeys.forEach(function (key) {
        if (!counts.has(key)) missing.push(key);
    });
    const extra = [];
    counts.forEach(function (_count, key) {
        if (!expectedKeys.has(key)) extra.push(key);
    });
    if (missing.length === 0 && extra.length === 0) return [];
    return [err("complete-matrix", "/cells", "missing " + missing.length + ", extra " + extra.length)];
}

function ruleDuplicateCell(doc) {
    const counts = cellCoverage(doc);
    if (!counts) return [];
    const dups = [];
    counts.forEach(function (count, key) {
        if (count > 1) dups.push(key);
    });
    if (dups.length === 0) return [];
    return [err("duplicate-cell", "/cells", "repeated pair " + dups[0].replace("\n", " "))];
}

function ruleCellOrder(doc) {
    const counts = cellCoverage(doc);
    if (!counts || !Array.isArray(doc.cells)) return [];
    const expected = expectedPairs();
    if (doc.cells.length !== expected.length) return [];
    for (let i = 0; i < expected.length; i++) {
        const key = pairKey(expected[i].raceId, expected[i].classId);
        if (counts.get(key) !== 1) return [];
    }
    for (let i = 0; i < expected.length; i++) {
        if (doc.cells[i].raceId !== expected[i].raceId || doc.cells[i].classId !== expected[i].classId) {
            return [err("cell-order", "/cells/" + i, "cell order is not race-major DEC-036 order, class-minor catalogue order")];
        }
    }
    return [];
}

function ruleNoHardLock(doc) {
    if (!doc || !Array.isArray(doc.cells)) return [];
    const errors = [];
    for (let i = 0; i < doc.cells.length; i++) {
        const cell = doc.cells[i];
        if (!cell || !Object.prototype.hasOwnProperty.call(cell, "legal")) continue;
        if (cell.legal !== true) errors.push(err("no-hard-lock", "/cells/" + i, "race-class pair is not legal"));
    }
    return errors;
}

function ruleAffinityCount(doc) {
    const idx = affinityMap(doc);
    if (!idx) return [];
    if (idx.dup) return [err("affinity-count", "/affinityRows", "a race has two affinity rows")];
    const races = expectedRaces();
    for (let i = 0; i < races.length; i++) {
        const ids = idx.map.get(races[i].raceId);
        if (!ids || ids.length !== 3 || new Set(ids).size !== 3) {
            return [err("affinity-count", "/affinityRows", races[i].dec036Name + " does not list three distinct affinity classes")];
        }
    }
    if (idx.map.size !== races.length) {
        return [err("affinity-count", "/affinityRows", "affinity row count is not nine")];
    }
    return [];
}

function ruleAffinityMembership(doc) {
    const idx = triplesOk(doc);
    if (!idx) return [];
    const races = expectedRaces();
    for (let i = 0; i < races.length; i++) {
        const got = idx.map.get(races[i].raceId).slice().sort();
        const exp = races[i].affinityNames.map(classIdForName).sort();
        if (got.join("|") !== exp.join("|")) {
            return [err("affinity-membership", "/affinityRows", races[i].dec036Name + " affinity set is not the DEC-036 row")];
        }
    }
    return [];
}

function ruleAffinityOrder(doc) {
    const idx = triplesOk(doc);
    if (!idx) return [];
    const races = expectedRaces();
    for (let i = 0; i < races.length; i++) {
        const got = idx.map.get(races[i].raceId);
        const exp = races[i].affinityNames.map(classIdForName);
        if (got.slice().sort().join("|") !== exp.slice().sort().join("|")) return [];
    }
    for (let i = 0; i < races.length; i++) {
        const got = idx.map.get(races[i].raceId);
        const exp = races[i].affinityNames.map(classIdForName);
        if (got.join("|") !== exp.join("|")) {
            return [err("affinity-order", "/affinityRows", races[i].dec036Name + " affinity order is not the DEC-036 order")];
        }
    }
    return [];
}

function ruleAffinityCells(doc) {
    const idx = affinityMap(doc);
    if (!idx || idx.dup || !doc || !Array.isArray(doc.cells)) return [];
    const races = expectedRaces();
    for (let i = 0; i < races.length; i++) {
        if (!idx.map.has(races[i].raceId)) return [];
        const fromRow = idx.map.get(races[i].raceId).slice().sort();
        const fromCells = [];
        for (let j = 0; j < doc.cells.length; j++) {
            const cell = doc.cells[j];
            if (!cell || cell.raceId !== races[i].raceId) continue;
            if (typeof cell.affinity !== "boolean") return [];
            if (cell.affinity === true) fromCells.push(cell.classId);
        }
        fromCells.sort();
        if (fromRow.join("|") !== fromCells.join("|")) {
            return [err("affinity-cells", "/cells", races[i].dec036Name + " affinity cells do not match affinityRows")];
        }
    }
    return [];
}

function expectedCell(raceName, className) {
    const races = expectedRaces();
    const race = races.filter(function (row) { return row.dec036Name === raceName; })[0];
    return { raceId: race.raceId, classId: classIdForName(className) };
}

function ruleRangerIsTank(doc) {
    if (!doc || !Array.isArray(doc.cells)) return [];
    const target = expectedCell("Elf", "Ranger");
    let found = null;
    let at = -1;
    for (let i = 0; i < doc.cells.length; i++) {
        const cell = doc.cells[i];
        if (cell && cell.raceId === target.raceId && cell.classId === target.classId) {
            found = cell;
            at = i;
        }
    }
    if (!found) return [];
    if (found.role === "tank") return [];
    return [err("ranger-is-tank", "/cells/" + at, "Elf Ranger role is not tank")];
}

function ruleUndecidedRole(doc) {
    if (!doc || !Array.isArray(doc.cells)) return [];
    const target = expectedCell("Elf", "Ranger");
    const concrete = { tank: true, healer: true, damage: true };
    const errors = [];
    for (let i = 0; i < doc.cells.length; i++) {
        const cell = doc.cells[i];
        if (!cell || typeof cell.role !== "string" || !concrete[cell.role]) continue;
        if (cell.raceId === target.raceId && cell.classId === target.classId) continue;
        errors.push(err("undecided-role", "/cells/" + i, "role tag is not decided by DEC-036"));
    }
    return errors;
}

function ruleRoleDistribution(doc) {
    const policy = doc && doc.roleDistribution;
    if (!policy || typeof policy !== "object") return [];
    const roles = policy.roles;
    const rolesOk = Array.isArray(roles) && roles.length === 3 &&
        roles[0] === "tank" && roles[1] === "healer" && roles[2] === "damage";
    if (policy.rule === "one-tank-one-healer-one-damage" && rolesOk && policy.rangerCountsAs === "tank") {
        return [];
    }
    return [err("role-distribution", "/roleDistribution", "role rule is one tank, one healer, and one damage, and Ranger counts as a tank")];
}

function ruleBonusUnset(doc) {
    if (!doc || !Array.isArray(doc.cells)) return [];
    const errors = [];
    for (let i = 0; i < doc.cells.length; i++) {
        const cell = doc.cells[i];
        if (!cell || !Object.prototype.hasOwnProperty.call(cell, "bonus")) continue;
        if (cell.bonus === null || cell.bonus === SENTINEL) continue;
        errors.push(err("bonus-unset", "/cells/" + i + "/bonus", "bonus is not OWNER_TODO or null"));
    }
    return errors;
}

function ruleWeightUnset(doc) {
    if (!doc || !Array.isArray(doc.cells)) return [];
    const errors = [];
    for (let i = 0; i < doc.cells.length; i++) {
        const cell = doc.cells[i];
        if (!cell || !Object.prototype.hasOwnProperty.call(cell, "jobPickWeight")) continue;
        if (cell.jobPickWeight === null || cell.jobPickWeight === SENTINEL) continue;
        errors.push(err("weight-unset", "/cells/" + i + "/jobPickWeight", "job-pick weight is not OWNER_TODO or null"));
    }
    return errors;
}

function rulePairing(doc) {
    if (!doc || !Array.isArray(doc.cells)) return [];
    const errors = [];
    for (let i = 0; i < doc.cells.length; i++) {
        const cell = doc.cells[i];
        if (!cell || typeof cell.affinity !== "boolean") continue;
        const filled = cell.bonus !== null && cell.jobPickWeight !== null && cell.role !== null;
        const empty = cell.bonus === null && cell.jobPickWeight === null && cell.role === null;
        if (cell.affinity === true && !filled) {
            errors.push(err("affinity-value-pairing", "/cells/" + i, "an affinity cell is missing role, bonus, or weight"));
        }
        if (cell.affinity === false && !empty) {
            errors.push(err("affinity-value-pairing", "/cells/" + i, "a non-affinity cell carries role, bonus, or weight"));
        }
    }
    return errors;
}

function ruleSuggestions(doc) {
    const block = doc && doc.unset && doc.unset.playtestSuggestions;
    if (!block || typeof block !== "object") return [];
    const statements = block.statements;
    let exact = Array.isArray(statements) && statements.length === SUGGESTIONS.length;
    if (exact) {
        for (let i = 0; i < SUGGESTIONS.length; i++) if (statements[i] !== SUGGESTIONS[i]) exact = false;
    }
    if (block.status === "unapproved" && block.applied === false && block.pendingOwnerRuling === true && exact) {
        return [];
    }
    return [err("suggestions-unapproved", "/unset/playtestSuggestions", "playtest suggestions are unapproved and not applied")];
}

const RULE_LIST = [
    ["race-set", ruleRaceSet],
    ["race-order", ruleRaceOrder],
    ["class-set", ruleClassSet],
    ["class-order", ruleClassOrder],
    ["race-alias", ruleRaceAlias],
    ["class-alias", ruleClassAlias],
    ["dec036-label", ruleDec036Label],
    ["complete-matrix", ruleCompleteMatrix],
    ["duplicate-cell", ruleDuplicateCell],
    ["cell-order", ruleCellOrder],
    ["no-hard-lock", ruleNoHardLock],
    ["affinity-count", ruleAffinityCount],
    ["affinity-membership", ruleAffinityMembership],
    ["affinity-order", ruleAffinityOrder],
    ["affinity-cells", ruleAffinityCells],
    ["ranger-is-tank", ruleRangerIsTank],
    ["undecided-role", ruleUndecidedRole],
    ["role-distribution", ruleRoleDistribution],
    ["bonus-unset", ruleBonusUnset],
    ["weight-unset", ruleWeightUnset],
    ["affinity-value-pairing", rulePairing],
    ["suggestions-unapproved", ruleSuggestions]
];

function sortErrors(errors) {
    errors.sort(function (a, b) {
        if (a.code !== b.code) return a.code < b.code ? -1 : 1;
        if (a.path !== b.path) return a.path < b.path ? -1 : 1;
        if (a.message !== b.message) return a.message < b.message ? -1 : 1;
        return 0;
    });
    return errors;
}

function validateDocument(doc, options) {
    const disabled = {};
    const list = options && options.disable;
    if (Array.isArray(list)) {
        for (let i = 0; i < list.length; i++) disabled[list[i]] = true;
    }
    const errors = [];
    if (!disabled.schema) {
        const found = validateAgainst(schema(), schema(), doc, "/");
        for (let i = 0; i < found.length; i++) errors.push(found[i]);
    }
    for (let i = 0; i < RULE_LIST.length; i++) {
        if (disabled[RULE_LIST[i][0]]) continue;
        const found = RULE_LIST[i][1](doc);
        for (let j = 0; j < found.length; j++) errors.push(found[j]);
    }
    return sortErrors(errors);
}

function readAffinityBonus(cell) {
    if (!cell || cell.affinity !== true) return { applied: false, value: null, reason: "no-affinity" };
    if (cell.bonus === SENTINEL) return { applied: false, value: null, reason: SENTINEL };
    return { applied: false, value: null, reason: "unapproved" };
}

function readJobPickWeight(cell) {
    if (!cell || cell.affinity !== true) return { applied: false, multiplier: null, reason: "no-affinity" };
    if (cell.jobPickWeight === SENTINEL) return { applied: false, multiplier: null, reason: SENTINEL };
    return { applied: false, multiplier: null, reason: "unapproved" };
}

function unapprovedSuggestionEffects(_doc) {
    return { rollBonus: null, xpRate: null, weightMultiplier: null };
}

function resolveBy(rows, token, fields, idField) {
    if (typeof token !== "string") return { ok: false, reason: "unknown-id" };
    const hits = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        for (let j = 0; j < fields.length; j++) {
            if (row[fields[j]] === token) {
                hits.push(row[idField]);
                break;
            }
        }
    }
    if (hits.length === 1) return { ok: true, id: hits[0] };
    if (hits.length === 0) return { ok: false, reason: "unknown-id" };
    return { ok: false, reason: "ambiguous" };
}

function resolveRace(doc, token) {
    const rows = doc && Array.isArray(doc.races) ? doc.races : [];
    const found = resolveBy(rows, token, ["raceId", "shortId", "speciesReferenceId", "dec036Name", "catalogueName"], "raceId");
    if (!found.ok) return found;
    return { ok: true, raceId: found.id };
}

function resolveClass(doc, token) {
    const rows = doc && Array.isArray(doc.classes) ? doc.classes : [];
    const found = resolveBy(rows, token, ["classId", "shortId", "planToken", "dec036Name", "catalogueName"], "classId");
    if (!found.ok) return found;
    return { ok: true, classId: found.id };
}

function findCell(doc, raceId, classId) {
    if (!doc || !Array.isArray(doc.cells)) return null;
    for (let i = 0; i < doc.cells.length; i++) {
        const cell = doc.cells[i];
        if (cell && cell.raceId === raceId && cell.classId === classId) return { index: i, cell: cell };
    }
    return null;
}

function admission(doc, raceToken, classToken) {
    const race = resolveRace(doc, raceToken);
    const klass = resolveClass(doc, classToken);
    if (!race.ok || !klass.ok) return { usable: false, legal: false, excluded: false, reason: "unknown-id" };
    const found = findCell(doc, race.raceId, klass.classId);
    if (!found || found.cell.legal !== true) {
        return { usable: false, legal: false, excluded: false, reason: "table-rejected" };
    }
    return {
        usable: true,
        legal: true,
        excluded: false,
        reason: "every-combination-legal",
        affinity: found.cell.affinity === true
    };
}

function schedulerView(doc) {
    const errors = validateDocument(doc);
    if (errors.length) return { ok: false, errors: errors };
    const rows = [];
    for (let i = 0; i < doc.cells.length; i++) {
        const cell = doc.cells[i];
        const weight = readJobPickWeight(cell);
        const bonus = readAffinityBonus(cell);
        rows.push({
            raceId: cell.raceId,
            classId: cell.classId,
            legal: true,
            excluded: false,
            affinity: cell.affinity === true,
            weightApplied: weight.applied,
            multiplier: weight.multiplier,
            bonusApplied: bonus.applied,
            bonus: bonus.value
        });
    }
    return { ok: true, rows: rows };
}

function raceRow(doc, name) {
    for (let i = 0; i < doc.races.length; i++) if (doc.races[i].dec036Name === name) return doc.races[i];
    throw new Error("missing race " + name);
}

function classRow(doc, name) {
    for (let i = 0; i < doc.classes.length; i++) if (doc.classes[i].dec036Name === name) return doc.classes[i];
    throw new Error("missing class " + name);
}

function cellOf(doc, raceName, className) {
    const found = findCell(doc, raceRow(doc, raceName).raceId, classRow(doc, className).classId);
    if (!found) throw new Error("missing cell " + raceName + " " + className);
    return found;
}

function affinityRowOf(doc, raceName) {
    const raceId = raceRow(doc, raceName).raceId;
    for (let i = 0; i < doc.affinityRows.length; i++) {
        if (doc.affinityRows[i].raceId === raceId) return doc.affinityRows[i];
    }
    throw new Error("missing affinity row " + raceName);
}

function markAffinity(cell) {
    cell.affinity = true;
    cell.role = SENTINEL;
    cell.bonus = SENTINEL;
    cell.jobPickWeight = SENTINEL;
}

function clearAffinity(cell) {
    cell.affinity = false;
    cell.role = null;
    cell.bonus = null;
    cell.jobPickWeight = null;
}

const FIXTURES = [
    {
        id: "schema-lock-field",
        expect: "schema",
        mutate: function (doc) { cellOf(doc, "Human", "Barbarian").cell.locked = true; }
    },
    {
        id: "schema-extra-root",
        expect: "schema",
        mutate: function (doc) { doc.guessedBonus = 1; }
    },
    {
        id: "schema-missing-authority",
        expect: "schema",
        mutate: function (doc) { delete doc.authority; }
    },
    {
        id: "schema-bad-version",
        expect: "schema",
        mutate: function (doc) { doc.schemaVersion = 1; }
    },
    {
        id: "race-set",
        expect: "race-set",
        mutate: function (doc) { raceRow(doc, "Human").raceId = "srd:race:humanoid"; }
    },
    {
        id: "race-order",
        expect: "race-order",
        mutate: function (doc) {
            const tmp = doc.races[0];
            doc.races[0] = doc.races[1];
            doc.races[1] = tmp;
        }
    },
    {
        id: "class-set",
        expect: "class-set",
        mutate: function (doc) { classRow(doc, "Wizard").classId = "srd:class:psion"; }
    },
    {
        id: "class-order",
        expect: "class-order",
        mutate: function (doc) {
            const tmp = doc.classes[0];
            doc.classes[0] = doc.classes[1];
            doc.classes[1] = tmp;
        }
    },
    {
        id: "race-alias",
        expect: "race-alias",
        mutate: function (doc) { raceRow(doc, "Half-elf").speciesReferenceId = "half-elf"; }
    },
    {
        id: "class-alias",
        expect: "class-alias",
        mutate: function (doc) { classRow(doc, "Fighter").planToken = "FIGHTER_CLASS"; }
    },
    {
        id: "dec036-label",
        expect: "dec036-label",
        mutate: function (doc) { raceRow(doc, "Half-elf").dec036Name = "Half-Elf"; }
    },
    {
        id: "complete-matrix",
        expect: "complete-matrix",
        mutate: function (doc) { doc.cells.splice(cellOf(doc, "Human", "Bard").index, 1); }
    },
    {
        id: "duplicate-cell",
        expect: "duplicate-cell",
        mutate: function (doc) { doc.cells.push(clone(doc.cells[0])); }
    },
    {
        id: "cell-order",
        expect: "cell-order",
        mutate: function (doc) {
            const left = cellOf(doc, "Human", "Barbarian").index;
            const right = cellOf(doc, "Human", "Bard").index;
            const tmp = doc.cells[left];
            doc.cells[left] = doc.cells[right];
            doc.cells[right] = tmp;
        }
    },
    {
        id: "no-hard-lock",
        expect: "no-hard-lock",
        mutate: function (doc) { cellOf(doc, "Human", "Bard").cell.legal = false; }
    },
    {
        id: "affinity-count",
        expect: "affinity-count",
        mutate: function (doc) {
            const row = affinityRowOf(doc, "Human");
            const bard = classRow(doc, "Bard").classId;
            row.classIds = row.classIds.concat([bard]);
            markAffinity(cellOf(doc, "Human", "Bard").cell);
        }
    },
    {
        id: "affinity-membership",
        expect: "affinity-membership",
        mutate: function (doc) {
            const fighter = classRow(doc, "Fighter").classId;
            const wizard = classRow(doc, "Wizard").classId;
            const bard = classRow(doc, "Bard").classId;
            affinityRowOf(doc, "Human").classIds = [fighter, wizard, bard];
            clearAffinity(cellOf(doc, "Human", "Cleric").cell);
            markAffinity(cellOf(doc, "Human", "Bard").cell);
        }
    },
    {
        id: "affinity-order",
        expect: "affinity-order",
        mutate: function (doc) {
            const fighter = classRow(doc, "Fighter").classId;
            const wizard = classRow(doc, "Wizard").classId;
            const cleric = classRow(doc, "Cleric").classId;
            affinityRowOf(doc, "Human").classIds = [wizard, fighter, cleric];
        }
    },
    {
        id: "affinity-cells",
        expect: "affinity-cells",
        mutate: function (doc) { clearAffinity(cellOf(doc, "Human", "Wizard").cell); }
    },
    {
        id: "ranger-is-tank",
        expect: "ranger-is-tank",
        mutate: function (doc) { cellOf(doc, "Elf", "Ranger").cell.role = SENTINEL; }
    },
    {
        id: "undecided-role",
        expect: "undecided-role",
        mutate: function (doc) { cellOf(doc, "Half-elf", "Fighter").cell.role = "healer"; }
    },
    {
        id: "role-distribution",
        expect: "role-distribution",
        mutate: function (doc) { doc.roleDistribution.rangerCountsAs = "damage"; }
    },
    {
        id: "bonus-unset",
        expect: "bonus-unset",
        mutate: function (doc) { cellOf(doc, "Human", "Fighter").cell.bonus = 1; }
    },
    {
        id: "weight-unset",
        expect: "weight-unset",
        mutate: function (doc) { cellOf(doc, "Human", "Fighter").cell.jobPickWeight = 1.5; }
    },
    {
        id: "affinity-value-pairing",
        expect: "affinity-value-pairing",
        mutate: function (doc) { cellOf(doc, "Human", "Bard").cell.bonus = SENTINEL; }
    },
    {
        id: "suggestions-unapproved",
        expect: "suggestions-unapproved",
        mutate: function (doc) { doc.unset.playtestSuggestions.applied = true; }
    }
];

function codesOf(errors) {
    const codes = [];
    for (let i = 0; i < errors.length; i++) {
        if (codes.indexOf(errors[i].code) < 0) codes.push(errors[i].code);
    }
    return codes;
}

function jsonNumbers(value, at, out) {
    if (typeof value === "number") out.push(at);
    else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) jsonNumbers(value[i], at + "/" + i, out);
    } else if (value && typeof value === "object") {
        const keys = Object.keys(value);
        for (let i = 0; i < keys.length; i++) jsonNumbers(value[keys[i]], at + "/" + keys[i], out);
    }
}

function markerRows(text, startMark, endMark) {
    const start = text.indexOf(startMark);
    const end = text.indexOf(endMark);
    if (start < 0 || end < start) return null;
    const lines = text.slice(start, end).split(/\r?\n/);
    const rows = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.charAt(0) !== "|") continue;
        const cells = line.split("|").slice(1, -1).map(function (part) { return part.trim().replace(/`/g, ""); });
        if (cells.length === 1 && cells[0] === "") continue;
        rows.push(cells);
    }
    return rows;
}

function main() {
    let passed = 0;
    let failed = 0;
    function check(name, ok, detail) {
        if (ok) {
            passed += 1;
            console.log("PASS " + name + (detail ? " " + detail : ""));
        } else {
            failed += 1;
            console.error("FAIL " + name + (detail ? " " + detail : ""));
        }
    }

    const original = readText(DATA_PATH);
    const canonical = readJson(DATA_PATH);
    const docText = readText(DOC_PATH);
    const unsupported = unsupportedSchemaKeywords(schema());
    check("schema-keywords", unsupported.length === 0, unsupported.join(", "));

    const injected = clone(schema());
    injected.if = {};
    const injectedBad = unsupportedSchemaKeywords(injected);
    check("schema-keyword-gate-rejects-if", injectedBad.indexOf("if") >= 0, injectedBad.join(", "));

    const canonicalErrors = validateDocument(canonical);
    check("canonical-valid", canonicalErrors.length === 0, canonicalErrors.map(function (e) {
        return e.code + " " + e.path + " " + e.message;
    }).join(" || "));

    const again = validateDocument(canonical);
    check("validation-deterministic", JSON.stringify(canonicalErrors) === JSON.stringify(again));

    const numbers = [];
    jsonNumbers(canonical, "", numbers);
    check("canonical-has-no-json-numbers", numbers.length === 0, numbers.join(", "));

    const races = expectedRaces();
    const classes = expectedClasses();
    check("nine-races", races.length === 9 && canonical.races.length === 9, String(races.length));
    check("twelve-classes", classes.length === 12 && canonical.classes.length === 12, String(classes.length));
    check("matrix-108-legal", canonical.cells.length === 108 && canonical.cells.every(function (cell) {
        return cell.legal === true;
    }), "cells " + canonical.cells.length);

    let affinityCount = 0;
    let todoRoles = 0;
    let tankRoles = 0;
    let otherConcrete = 0;
    canonical.cells.forEach(function (cell) {
        if (cell.affinity) affinityCount += 1;
        if (cell.role === SENTINEL) todoRoles += 1;
        if (cell.role === "tank") tankRoles += 1;
        if (cell.role === "healer" || cell.role === "damage") otherConcrete += 1;
    });
    check("affinity-rows-27", affinityCount === 27, "affinities " + affinityCount);
    check("one-decided-role", tankRoles === 1 && todoRoles === 26 && otherConcrete === 0,
        "tank " + tankRoles + " todo " + todoRoles + " other " + otherConcrete);

    const elfRanger = cellOf(canonical, "Elf", "Ranger").cell;
    check("elf-ranger-tank", elfRanger.affinity === true && elfRanger.role === "tank" &&
        elfRanger.bonus === SENTINEL && elfRanger.jobPickWeight === SENTINEL);

    let examplesTodo = true;
    for (let i = 0; i < NON_OBVIOUS.length; i++) {
        const sample = NON_OBVIOUS[i];
        for (let j = 0; j < sample.classes.length; j++) {
            const cell = cellOf(canonical, sample.race, sample.classes[j]).cell;
            if (!(cell.affinity === true && cell.role === SENTINEL)) examplesTodo = false;
        }
    }
    check("non-obvious-examples-owner-todo", examplesTodo, "Half-elf and Half-orc affinity roles");

    const identityEnum = catalogues().identityIds;
    check("none-is-not-an-affinity-class", identityEnum.indexOf("NONE") >= 0 &&
        classes.every(function (row) { return row.classId !== "NONE"; }) &&
        identityEnum.indexOf("srd:class:fighter") >= 0);

    let aliasOk = true;
    const raceFields = ["raceId", "shortId", "speciesReferenceId", "dec036Name", "catalogueName"];
    for (let i = 0; i < canonical.races.length; i++) {
        const row = canonical.races[i];
        for (let j = 0; j < raceFields.length; j++) {
            const resolved = resolveRace(canonical, row[raceFields[j]]);
            if (!resolved.ok || resolved.raceId !== row.raceId) aliasOk = false;
        }
    }
    const classFields = ["classId", "shortId", "planToken", "dec036Name", "catalogueName"];
    for (let i = 0; i < canonical.classes.length; i++) {
        const row = canonical.classes[i];
        for (let j = 0; j < classFields.length; j++) {
            const resolved = resolveClass(canonical, row[classFields[j]]);
            if (!resolved.ok || resolved.classId !== row.classId) aliasOk = false;
        }
    }
    const elf = resolveRace(canonical, "elf");
    const halfElf = resolveRace(canonical, "half-elf");
    const halfElfSpell = resolveRace(canonical, "Half-elf");
    const halfElfCat = resolveRace(canonical, "Half-Elf");
    const halfElfSpecies = resolveRace(canonical, "half_elf");
    check("identifier-resolution", aliasOk && elf.ok && elf.raceId === "srd:race:elf" &&
        halfElf.ok && halfElf.raceId === "srd:race:half-elf" &&
        halfElfSpell.raceId === "srd:race:half-elf" &&
        halfElfCat.raceId === "srd:race:half-elf" &&
        halfElfSpecies.raceId === "srd:race:half-elf");

    const fighter = resolveClass(canonical, "Fighter");
    const fighterShort = resolveClass(canonical, "fighter");
    const fighterPlan = resolveClass(canonical, "FIGHTER");
    const fighterSrd = resolveClass(canonical, "srd:class:fighter");
    check("class-id-forms", fighter.classId === "srd:class:fighter" &&
        fighterShort.classId === "srd:class:fighter" &&
        fighterPlan.classId === "srd:class:fighter" &&
        fighterSrd.classId === "srd:class:fighter" &&
        resolveClass(canonical, "NONE").reason === "unknown-id");

    const ambiguous = resolveRace({
        races: [
            { raceId: "srd:race:elf", shortId: "elf", speciesReferenceId: "elf", dec036Name: "Elf", catalogueName: "Elf" },
            { raceId: "srd:race:half-elf", shortId: "elf", speciesReferenceId: "half_elf", dec036Name: "Half-elf", catalogueName: "Half-Elf" }
        ]
    }, "elf");
    check("resolve-race-ambiguous", ambiguous.ok === false && ambiguous.reason === "ambiguous");
    check("resolve-race-unknown", resolveRace(canonical, "goblin").reason === "unknown-id" &&
        resolveRace(canonical, "srd:race:goblin").reason === "unknown-id");

    let admitted = 0;
    let favoured = 0;
    for (let i = 0; i < canonical.cells.length; i++) {
        const cell = canonical.cells[i];
        const gate = admission(canonical, cell.raceId, cell.classId);
        if (gate.usable && gate.legal && gate.excluded === false) admitted += 1;
        if (gate.affinity) favoured += 1;
        const bonus = readAffinityBonus(cell);
        const weight = readJobPickWeight(cell);
        if (bonus.applied !== false || bonus.value !== null || weight.applied !== false || weight.multiplier !== null) {
            admitted = -1;
        }
    }
    check("every-pair-admitted", admitted === 108 && favoured === 27, "admitted " + admitted + " affinity " + favoured);
    const unknown = admission(canonical, "goblin", "Fighter");
    check("unknown-id-is-not-a-lock", unknown.usable === false && unknown.excluded === false && unknown.reason === "unknown-id");
    const elfWizard = admission(canonical, "Elf", "Wizard");
    check("non-affinity-stays-legal", elfWizard.usable === true && elfWizard.legal === true &&
        elfWizard.affinity === false && elfWizard.excluded === false);

    const numericCell = { affinity: true, bonus: 1, jobPickWeight: 1.5, role: SENTINEL, legal: true };
    const numericBonus = readAffinityBonus(numericCell);
    const numericWeight = readJobPickWeight(numericCell);
    check("reader-ignores-numbers", numericBonus.applied === false && numericBonus.value === null &&
        numericBonus.reason === "unapproved" && numericWeight.applied === false &&
        numericWeight.multiplier === null && numericWeight.multiplier !== 1.5 && numericWeight.multiplier !== 1);

    const effects = unapprovedSuggestionEffects(canonical);
    const stuffed = unapprovedSuggestionEffects({
        unset: { playtestSuggestions: { applied: true, statements: ["1.5"] } }
    });
    check("suggestions-have-no-numeric-effect", effects.rollBonus === null && effects.xpRate === null &&
        effects.weightMultiplier === null && stuffed.rollBonus === null && stuffed.xpRate === null &&
        stuffed.weightMultiplier === null);

    const view = schedulerView(canonical);
    const viewAgain = schedulerView(canonical);
    let viewOk = view.ok === true && view.rows.length === 108;
    if (viewOk) {
        for (let i = 0; i < view.rows.length; i++) {
            const row = view.rows[i];
            if (row.legal !== true || row.excluded !== false || row.weightApplied !== false ||
                row.multiplier !== null || row.bonusApplied !== false || row.bonus !== null) viewOk = false;
        }
    }
    check("scheduler-view-applies-nothing", viewOk && JSON.stringify(view) === JSON.stringify(viewAgain));
    const lockedView = schedulerView(clone(canonical));
    const lockedDoc = clone(canonical);
    cellOf(lockedDoc, "Elf", "Wizard").cell.legal = false;
    const rejected = schedulerView(lockedDoc);
    check("invalid-table-is-not-a-candidate-list", lockedView.ok === true && rejected.ok === false &&
        codesOf(rejected.errors).indexOf("no-hard-lock") >= 0);

    const raceTable = markerRows(docText, "<!-- race-identifiers -->", "<!-- /race-identifiers -->");
    let raceDocOk = Array.isArray(raceTable) && raceTable.length === races.length;
    if (raceDocOk) {
        for (let i = 0; i < races.length; i++) {
            const row = raceTable[i];
            const exp = races[i];
            const data = canonical.races[i];
            if (!row || row.length !== 5 || row[0] !== exp.dec036Name || row[1] !== exp.catalogueName ||
                row[2] !== exp.raceId || row[3] !== exp.shortId || row[4] !== exp.speciesReferenceId ||
                data.dec036Name !== exp.dec036Name || data.catalogueName !== exp.catalogueName ||
                data.raceId !== exp.raceId || data.shortId !== exp.shortId ||
                data.speciesReferenceId !== exp.speciesReferenceId) raceDocOk = false;
        }
    }
    check("doc-race-identifiers", raceDocOk);

    const classTable = markerRows(docText, "<!-- class-identifiers -->", "<!-- /class-identifiers -->");
    let classDocOk = Array.isArray(classTable) && classTable.length === classes.length;
    if (classDocOk) {
        for (let i = 0; i < classes.length; i++) {
            const row = classTable[i];
            const exp = classes[i];
            const data = canonical.classes[i];
            if (!row || row.length !== 4 || row[0] !== exp.dec036Name || row[1] !== exp.classId ||
                row[2] !== exp.shortId || row[3] !== exp.planToken ||
                data.classId !== exp.classId || data.planToken !== exp.planToken ||
                data.shortId !== exp.shortId || data.dec036Name !== exp.dec036Name) classDocOk = false;
        }
    }
    check("doc-class-identifiers", classDocOk);

    const affinityTable = markerRows(docText, "<!-- dec036-affinity-rows -->", "<!-- /dec036-affinity-rows -->");
    let affinityDocOk = Array.isArray(affinityTable) && affinityTable.length === DEC036.length;
    if (affinityDocOk) {
        for (let i = 0; i < DEC036.length; i++) {
            const row = affinityTable[i];
            const exp = DEC036[i];
            if (!row || row.length !== 4 || row[0] !== exp.name || row[1] !== exp.affinities[0] ||
                row[2] !== exp.affinities[1] || row[3] !== exp.affinities[2]) affinityDocOk = false;
            const dataIds = canonical.affinityRows[i].classIds;
            const expIds = exp.affinities.map(classIdForName);
            if (canonical.races[i].dec036Name !== exp.name || dataIds.join("|") !== expIds.join("|")) affinityDocOk = false;
        }
    }
    check("doc-affinity-rows", affinityDocOk);

    const roleTable = markerRows(docText, "<!-- decided-roles -->", "<!-- /decided-roles -->");
    check("doc-decided-role", Array.isArray(roleTable) && roleTable.length === 1 &&
        roleTable[0][0] === "Elf" && roleTable[0][1] === "Ranger" && roleTable[0][2] === "tank");

    const suggestionTable = markerRows(docText, "<!-- playtest-suggestions -->", "<!-- /playtest-suggestions -->");
    let suggestionDocOk = Array.isArray(suggestionTable) && suggestionTable.length === SUGGESTIONS.length;
    if (suggestionDocOk) {
        for (let i = 0; i < SUGGESTIONS.length; i++) {
            if (suggestionTable[i].length !== 1 || suggestionTable[i][0] !== SUGGESTIONS[i]) suggestionDocOk = false;
        }
    }
    check("doc-playtest-suggestions", suggestionDocOk &&
        canonical.unset.playtestSuggestions.applied === false &&
        canonical.unset.playtestSuggestions.status === "unapproved");

    const ruleTable = markerRows(docText, "<!-- validator-rules -->", "<!-- /validator-rules -->");
    const ruleNames = ["schema"].concat(RULE_LIST.map(function (pair) { return pair[0]; }));
    let ruleDocOk = Array.isArray(ruleTable) && ruleTable.length === ruleNames.length;
    if (ruleDocOk) {
        for (let i = 0; i < ruleNames.length; i++) {
            if (ruleTable[i].length !== 1 || ruleTable[i][0] !== ruleNames[i]) ruleDocOk = false;
        }
    }
    check("doc-rule-list", ruleDocOk);

    const boundaryStart = docText.indexOf("<!-- scheduler-boundary -->");
    const boundaryEnd = docText.indexOf("<!-- /scheduler-boundary -->");
    const boundary = boundaryStart >= 0 && boundaryEnd > boundaryStart ? docText.slice(boundaryStart, boundaryEnd) : "";
    check("doc-scheduler-boundary", boundary.indexOf("does not implement the scheduler") >= 0 &&
        boundary.indexOf(SENTINEL) >= 0);

    const killed = {};
    for (let i = 0; i < FIXTURES.length; i++) {
        const fixture = FIXTURES[i];
        const mutated = clone(canonical);
        try {
            fixture.mutate(mutated);
        } catch (e) {
            check("mutant " + fixture.id, false, "mutate: " + e.message);
            continue;
        }
        if (JSON.stringify(mutated) === JSON.stringify(canonical)) {
            check("mutant " + fixture.id, false, "mutation did not change the document");
            continue;
        }
        const errors = validateDocument(mutated);
        const codes = codesOf(errors);
        if (codes.length !== 1 || codes[0] !== fixture.expect) {
            check("mutant " + fixture.id, false, "codes " + (codes.join(",") || "none") + " expected " + fixture.expect +
                " :: " + errors.map(function (e) { return e.code + " " + e.path + " " + e.message; }).join(" || "));
            continue;
        }
        const off = validateDocument(mutated, { disable: [fixture.expect] });
        if (off.length !== 0) {
            check("mutant " + fixture.id, false, "still failing: " + off.map(function (e) {
                return e.code + " " + e.path + " " + e.message;
            }).join(" || "));
            continue;
        }
        killed[fixture.expect] = true;
        check("mutant " + fixture.id, true, "kills " + fixture.expect);
    }

    const missingKill = ruleNames.filter(function (name) { return !killed[name]; });
    check("every-rule-has-a-killed-mutant", missingKill.length === 0, missingKill.join(", "));
    check("fixture-file-unchanged", readText(DATA_PATH) === original);

    console.log("RESULT: " + passed + " passed, " + failed + " failed");
    console.log("EXIT_AFFINITY:" + (failed === 0 ? "0" : "1"));
    return failed === 0 ? 0 : 1;
}

module.exports = {
    validateDocument: validateDocument,
    readAffinityBonus: readAffinityBonus,
    readJobPickWeight: readJobPickWeight,
    unapprovedSuggestionEffects: unapprovedSuggestionEffects,
    resolveRace: resolveRace,
    resolveClass: resolveClass,
    admission: admission,
    schedulerView: schedulerView,
    RULE_LIST: RULE_LIST,
    SUGGESTIONS: SUGGESTIONS
};

if (require.main === module) process.exit(main());
