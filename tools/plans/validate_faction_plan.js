"use strict";

// SOC.10.02 faction development plan validator. Node only; no npm dependencies.
//
//   node tools/plans/validate_faction_plan.js game/data/plans/TEMPLATE.plan.json
//
// The schema walker implements the JSON Schema draft 2020-12 keywords listed in
// CONSTRAINTS and ANNOTATIONS. Any other keyword is an error, so a constraint
// cannot be skipped by a typo. Cross-record rules (order, sums, id references,
// template sentinels) live in RULES. Each rule has a killed mutant under
// tools/plans/fixtures/. Spec: docs/systems/DEUS_FactionPlans.md.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const SCHEMA_PATH = path.join(ROOT, "game", "data", "plans", "faction_plan.schema.json");

const ANNOTATIONS = new Set([
    "$schema", "$id", "$defs", "$ref", "$comment", "title", "description", "examples", "default"
]);
const CONSTRAINTS = new Set([
    "type", "properties", "required", "additionalProperties", "items", "enum", "const",
    "pattern", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum",
    "minLength", "maxLength", "minItems", "maxItems", "uniqueItems", "oneOf",
    "minProperties", "maxProperties"
]);

const CULTURAL_PATHS = [
    ["raceId"],
    ["displayName"],
    ["lore"],
    ["values"],
    ["architecture", "cultural", "guidingMetaphor"],
    ["architecture", "cultural", "exteriorSilhouette"],
    ["architecture", "cultural", "proportionRatio"],
    ["architecture", "cultural", "colorKey"],
    ["architecture", "cultural", "tierMaterials", "tier1"],
    ["architecture", "cultural", "tierMaterials", "tier2"],
    ["architecture", "cultural", "tierMaterials", "tier3"],
    ["architecture", "cultural", "foundations"],
    ["architecture", "cultural", "walls"],
    ["architecture", "cultural", "openings"],
    ["architecture", "cultural", "roofForm"],
    ["architecture", "cultural", "supports"],
    ["architecture", "cultural", "hearthPlacement"],
    ["architecture", "cultural", "bedding"],
    ["architecture", "cultural", "storagePhilosophy"]
];

const COLLAPSE_KINDS = ["food-stores", "population", "vacant-institutions"];

let schemaCache = null;
const patternCache = new Map();

function err(code, at, message) {
    return { code: code, path: at, message: message };
}

function schemaErr(at, keyword, message) {
    return { code: "schema", path: at, keyword: keyword, message: keyword + ": " + message };
}

function loadSchema() {
    const text = fs.readFileSync(SCHEMA_PATH, "utf8").replace(/^\uFEFF/, "");
    const doc = JSON.parse(text);
    const bad = unsupportedSchemaKeywords(doc);
    if (bad.length) {
        throw new Error("unsupported schema keywords: " + bad.join(", "));
    }
    return doc;
}

function schema() {
    if (!schemaCache) schemaCache = loadSchema();
    return schemaCache;
}

function enumOf(defName) {
    const def = schema().$defs && schema().$defs[defName];
    if (!def || !Array.isArray(def.enum)) {
        throw new Error("schema $defs." + defName + " has no enum");
    }
    return def.enum;
}

function stages() { return enumOf("stageId"); }
function postures() { return enumOf("postureId"); }
function priorityTargets() { return enumOf("priorityTarget"); }
function bands() { return enumOf("bandId"); }
function craftRoles() { return enumOf("craftRoleId"); }
function institutions() { return enumOf("institutionId"); }

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
        if (passed !== 1) {
            errors.push(schemaErr(pathHere, "oneOf", "matched " + passed + " branches, expected 1"));
        }
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

function isObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

function stageMap(doc) {
    if (!doc || !Array.isArray(doc.stages) || doc.stages.length !== stages().length) return null;
    const map = new Map();
    for (let i = 0; i < doc.stages.length; i++) {
        const stage = doc.stages[i];
        if (!isObject(stage) || typeof stage.id !== "string") return null;
        if (map.has(stage.id)) return null;
        map.set(stage.id, stage);
    }
    const ids = stages();
    for (let i = 0; i < ids.length; i++) if (!map.has(ids[i])) return null;
    return map;
}

function knowledgeMap(doc) {
    if (!doc || !Array.isArray(doc.knowledge)) return null;
    const map = new Map();
    for (let i = 0; i < doc.knowledge.length; i++) {
        const node = doc.knowledge[i];
        if (!isObject(node) || typeof node.id !== "string") return null;
        if (map.has(node.id)) return null;
        map.set(node.id, node);
    }
    return map;
}

function buildingIdSet(doc) {
    const set = new Set();
    if (!doc || !Array.isArray(doc.buildings)) return set;
    for (let i = 0; i < doc.buildings.length; i++) {
        const row = doc.buildings[i];
        if (row && typeof row.id === "string") set.add(row.id);
    }
    return set;
}

function stageIndex(doc, id) {
    if (!doc || !Array.isArray(doc.stages)) return -1;
    for (let i = 0; i < doc.stages.length; i++) {
        if (doc.stages[i] && doc.stages[i].id === id) return i;
    }
    return -1;
}

function knowledgePrereqSet(stage) {
    const set = new Set();
    if (!stage || !Array.isArray(stage.prerequisites)) return set;
    for (let i = 0; i < stage.prerequisites.length; i++) {
        const pre = stage.prerequisites[i];
        if (pre && pre.kind === "knowledge" && typeof pre.id === "string") set.add(pre.id);
    }
    return set;
}

function dig(obj, parts) {
    let node = obj;
    for (let i = 0; i < parts.length; i++) {
        if (!isObject(node) || !Object.prototype.hasOwnProperty.call(node, parts[i])) return { ok: false };
        node = node[parts[i]];
    }
    return { ok: true, value: node };
}

function pointer(parts) {
    return "/" + parts.map(function (p) {
        return String(p).replace(/~/g, "~0").replace(/\//g, "~1");
    }).join("/");
}

function isPermutation(arr, expected) {
    if (!Array.isArray(arr) || arr.length !== expected.length) return false;
    const a = arr.slice().sort();
    const b = expected.slice().sort();
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

function ruleStagesPresent(doc) {
    const ids = stages();
    if (!doc || !Array.isArray(doc.stages)) {
        return [err("missing-stage", "/stages", "stages must list camp, hamlet, village, town, city, and capital")];
    }
    const seen = new Set();
    const dup = [];
    for (let i = 0; i < doc.stages.length; i++) {
        const stage = doc.stages[i];
        if (!isObject(stage) || typeof stage.id !== "string") {
            return [err("missing-stage", "/stages/" + i, "stage has no id")];
        }
        if (seen.has(stage.id)) dup.push(stage.id);
        seen.add(stage.id);
    }
    const missing = [];
    for (let i = 0; i < ids.length; i++) if (!seen.has(ids[i])) missing.push(ids[i]);
    if (missing.length === 0 && dup.length === 0 && doc.stages.length === ids.length) return [];
    const parts = [];
    if (missing.length) parts.push("missing " + missing.join(", "));
    if (dup.length) parts.push("duplicate " + dup.join(", "));
    return [err("missing-stage", "/stages", parts.join("; ") || "stage list is not the six settlement stages")];
}

function ruleStagesOrdered(doc) {
    if (!stageMap(doc)) return [];
    const ids = stages();
    for (let i = 0; i < ids.length; i++) {
        if (doc.stages[i].id !== ids[i]) {
            const got = doc.stages.map(function (s) { return s.id; }).join(", ");
            return [err("stages-unordered", "/stages", "order is " + got + "; expected " + ids.join(", "))];
        }
    }
    return [];
}

function ruleStagePrerequisiteChain(doc) {
    const map = stageMap(doc);
    if (!map) return [];
    const ids = stages();
    for (let i = 0; i < doc.stages.length; i++) {
        const stage = doc.stages[i];
        if (!Array.isArray(stage.prerequisites)) return [];
        for (let j = 0; j < stage.prerequisites.length; j++) {
            const pre = stage.prerequisites[j];
            if (pre && pre.kind === "stage" && ids.indexOf(pre.id) < 0) return [];
        }
    }
    const errors = [];
    for (let i = 0; i < ids.length; i++) {
        const stage = map.get(ids[i]);
        const stagePres = [];
        for (let j = 0; j < stage.prerequisites.length; j++) {
            const pre = stage.prerequisites[j];
            if (pre && pre.kind === "stage") stagePres.push(pre.id);
        }
        const at = "/stages/" + stageIndex(doc, ids[i]) + "/prerequisites";
        if (i === 0) {
            if (stagePres.length !== 0) {
                errors.push(err("stage-prerequisite-chain", at, "camp must not require another stage"));
            }
        } else if (stagePres.length !== 1 || stagePres[0] !== ids[i - 1]) {
            errors.push(err("stage-prerequisite-chain", at,
                ids[i] + " must require the previous stage \"" + ids[i - 1] + "\""));
        }
    }
    return errors;
}

function rulePrerequisitesResolve(doc) {
    const errors = [];
    const kmap = knowledgeMap(doc);
    const buildings = buildingIdSet(doc);
    const ids = stages();
    const offices = institutions();
    if (doc && Array.isArray(doc.stages)) {
        for (let i = 0; i < doc.stages.length; i++) {
            const stage = doc.stages[i];
            if (!stage || !Array.isArray(stage.prerequisites)) continue;
            for (let j = 0; j < stage.prerequisites.length; j++) {
                const pre = stage.prerequisites[j];
                if (!pre || typeof pre.id !== "string") continue;
                const at = "/stages/" + i + "/prerequisites/" + j;
                if (pre.kind === "knowledge" && (!kmap || !kmap.has(pre.id))) {
                    errors.push(err("unknown-prerequisite", at, "knowledge id \"" + pre.id + "\" does not exist"));
                } else if (pre.kind === "building" && !buildings.has(pre.id)) {
                    errors.push(err("unknown-prerequisite", at, "building id \"" + pre.id + "\" does not exist"));
                } else if (pre.kind === "institution" && offices.indexOf(pre.id) < 0) {
                    errors.push(err("unknown-prerequisite", at, "institution id \"" + pre.id + "\" does not exist"));
                } else if (pre.kind === "stage" && ids.indexOf(pre.id) < 0) {
                    errors.push(err("unknown-prerequisite", at, "stage id \"" + pre.id + "\" does not exist"));
                }
            }
        }
    }
    if (kmap) {
        const nodes = doc.knowledge;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (!Array.isArray(node.prerequisites)) continue;
            for (let j = 0; j < node.prerequisites.length; j++) {
                const id = node.prerequisites[j];
                if (typeof id === "string" && !kmap.has(id)) {
                    errors.push(err("unknown-prerequisite", "/knowledge/" + i + "/prerequisites/" + j,
                        "knowledge id \"" + id + "\" does not exist"));
                }
            }
        }
    }
    return errors;
}

function rulePopulationMonotone(doc) {
    const map = stageMap(doc);
    if (!map) return [];
    const ids = stages();
    for (let i = 0; i < ids.length; i++) {
        if (typeof map.get(ids[i]).populationMin !== "number") return [];
    }
    for (let i = 1; i < ids.length; i++) {
        const prev = map.get(ids[i - 1]).populationMin;
        const cur = map.get(ids[i]).populationMin;
        if (cur <= prev) {
            return [err("population-not-monotone", "/stages/" + stageIndex(doc, ids[i]) + "/populationMin",
                ids[i] + " populationMin " + cur + " is not above " + ids[i - 1] + " (" + prev + ")")];
        }
    }
    return [];
}

function countMap(list, idKey) {
    if (!Array.isArray(list)) return null;
    const map = new Map();
    for (let i = 0; i < list.length; i++) {
        const row = list[i];
        if (!row || typeof row[idKey] !== "string" || typeof row.minCount !== "number") return null;
        map.set(row[idKey], row.minCount);
    }
    return map;
}

function ruleRequirementsCumulative(doc) {
    const map = stageMap(doc);
    const kmap = knowledgeMap(doc);
    if (!map || !kmap) return [];
    const ids = stages();
    const buildings = [];
    const offices = [];
    const knowledge = [];
    for (let i = 0; i < ids.length; i++) {
        const stage = map.get(ids[i]);
        const b = countMap(stage.buildings, "id");
        if (!b || !Array.isArray(stage.institutions) || !Array.isArray(stage.prerequisites)) return [];
        buildings.push(b);
        offices.push(stage.institutions.slice());
        const known = new Set();
        for (const id of knowledgePrereqSet(stage)) if (kmap.has(id)) known.add(id);
        knowledge.push(known);
    }
    const errors = [];
    for (let i = 1; i < ids.length; i++) {
        const at = "/stages/" + stageIndex(doc, ids[i]);
        const prevB = buildings[i - 1];
        const curB = buildings[i];
        for (const id of prevB.keys()) {
            if (!curB.has(id)) {
                errors.push(err("requirements-not-cumulative", at + "/buildings",
                    ids[i] + " drops building \"" + id + "\" required at " + ids[i - 1]));
            } else if (curB.get(id) < prevB.get(id)) {
                errors.push(err("requirements-not-cumulative", at + "/buildings",
                    ids[i] + " lowers the count of \"" + id + "\""));
            }
        }
        const prevO = new Set(offices[i - 1]);
        const curO = new Set(offices[i]);
        for (const id of prevO) {
            if (!curO.has(id)) {
                errors.push(err("requirements-not-cumulative", at + "/institutions",
                    ids[i] + " drops institution \"" + id + "\" required at " + ids[i - 1]));
            }
        }
        for (const id of knowledge[i - 1]) {
            if (!knowledge[i].has(id)) {
                errors.push(err("requirements-not-cumulative", at + "/prerequisites",
                    ids[i] + " drops knowledge \"" + id + "\" required at " + ids[i - 1]));
            }
        }
    }
    return errors;
}

function ruleRoleHeadcount(doc) {
    if (!doc || !Array.isArray(doc.stages)) return [];
    const errors = [];
    for (let i = 0; i < doc.stages.length; i++) {
        const stage = doc.stages[i];
        if (!stage || !Array.isArray(stage.roles) || typeof stage.populationMin !== "number") continue;
        const sums = {};
        for (let j = 0; j < stage.roles.length; j++) {
            const role = stage.roles[j];
            if (!role || typeof role.axis !== "string" || typeof role.minCount !== "number") continue;
            sums[role.axis] = (sums[role.axis] || 0) + role.minCount;
        }
        const axes = Object.keys(sums);
        for (let a = 0; a < axes.length; a++) {
            if (sums[axes[a]] > stage.populationMin) {
                errors.push(err("role-headcount", "/stages/" + i + "/roles",
                    (stage.id || String(i)) + " " + axes[a] + " minimums sum to " + sums[axes[a]] +
                    ", above populationMin " + stage.populationMin));
            }
        }
    }
    return errors;
}

function unlockIndex(doc) {
    const byBuilding = new Map();
    const byCraft = new Map();
    if (!doc || !Array.isArray(doc.knowledge)) return null;
    for (let i = 0; i < doc.knowledge.length; i++) {
        const node = doc.knowledge[i];
        if (!node || typeof node.id !== "string" || !Array.isArray(node.unlocks)) return null;
        for (let j = 0; j < node.unlocks.length; j++) {
            const u = node.unlocks[j];
            if (!u || typeof u.id !== "string") continue;
            const table = u.kind === "building" ? byBuilding : (u.kind === "craft" ? byCraft : null);
            if (!table) continue;
            if (!table.has(u.id)) table.set(u.id, []);
            table.get(u.id).push(node.id);
        }
    }
    return { byBuilding: byBuilding, byCraft: byCraft };
}

function ruleRoleCraftUnlocked(doc) {
    const map = stageMap(doc);
    const index = unlockIndex(doc);
    if (!map || !index) return [];
    const errors = [];
    const ids = stages();
    for (let i = 0; i < ids.length; i++) {
        const stage = map.get(ids[i]);
        if (!Array.isArray(stage.roles)) return [];
        const known = knowledgePrereqSet(stage);
        for (let j = 0; j < stage.roles.length; j++) {
            const role = stage.roles[j];
            if (!role || role.axis !== "craft" || typeof role.id !== "string") continue;
            const nodes = index.byCraft.get(role.id) || [];
            let hit = false;
            for (let n = 0; n < nodes.length; n++) if (known.has(nodes[n])) hit = true;
            if (!hit) {
                errors.push(err("role-not-unlocked", "/stages/" + stageIndex(doc, ids[i]) + "/roles/" + j,
                    ids[i] + " requires craft " + role.id + " before a listed knowledge node unlocks it"));
            }
        }
    }
    return errors;
}

function ruleRoleOfficeInstituted(doc) {
    const map = stageMap(doc);
    if (!map) return [];
    const errors = [];
    const ids = stages();
    for (let i = 0; i < ids.length; i++) {
        const stage = map.get(ids[i]);
        if (!Array.isArray(stage.roles) || !Array.isArray(stage.institutions)) return [];
        const have = new Set(stage.institutions);
        for (let j = 0; j < stage.roles.length; j++) {
            const role = stage.roles[j];
            if (!role || role.axis !== "civicOffice" || typeof role.id !== "string") continue;
            if (!have.has(role.id)) {
                errors.push(err("role-office", "/stages/" + stageIndex(doc, ids[i]) + "/roles/" + j,
                    ids[i] + " requires a holder for " + role.id + ", which is not an institution of that stage"));
            }
        }
    }
    return errors;
}

function ruleOccupationMixSum(doc) {
    if (!doc || !Array.isArray(doc.stages)) return [];
    const axes = ["craft", "civicOffice", "class", "obligation"];
    const errors = [];
    for (let i = 0; i < doc.stages.length; i++) {
        const stage = doc.stages[i];
        if (!stage || !isObject(stage.occupationMix)) continue;
        for (let a = 0; a < axes.length; a++) {
            const rows = stage.occupationMix[axes[a]];
            if (!Array.isArray(rows)) continue;
            let sum = 0;
            const seen = new Set();
            let bad = false;
            for (let r = 0; r < rows.length; r++) {
                const row = rows[r];
                if (!row || typeof row.perMyriad !== "number" || typeof row.id !== "string") { bad = true; break; }
                if (seen.has(row.id)) {
                    errors.push(err("occupation-mix-sum", "/stages/" + i + "/occupationMix/" + axes[a],
                        (stage.id || String(i)) + " " + axes[a] + " lists " + row.id + " more than once"));
                }
                seen.add(row.id);
                sum += row.perMyriad;
            }
            if (bad) continue;
            if (sum !== 10000) {
                errors.push(err("occupation-mix-sum", "/stages/" + i + "/occupationMix/" + axes[a],
                    (stage.id || String(i)) + " " + axes[a] + " shares sum to " + sum + ", expected 10000"));
            }
        }
    }
    return errors;
}

function ruleMixCraftUnlocked(doc) {
    const map = stageMap(doc);
    const index = unlockIndex(doc);
    if (!map || !index) return [];
    const errors = [];
    const ids = stages();
    for (let i = 0; i < ids.length; i++) {
        const stage = map.get(ids[i]);
        if (!stage.occupationMix || !Array.isArray(stage.occupationMix.craft)) continue;
        const known = knowledgePrereqSet(stage);
        const rows = stage.occupationMix.craft;
        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.id === "NONE" || typeof row.id !== "string") continue;
            const nodes = index.byCraft.get(row.id) || [];
            let hit = false;
            for (let n = 0; n < nodes.length; n++) if (known.has(nodes[n])) hit = true;
            if (!hit) {
                errors.push(err("mix-craft-locked", "/stages/" + stageIndex(doc, ids[i]) + "/occupationMix/craft/" + r,
                    ids[i] + " mix includes " + row.id + " before a listed knowledge node unlocks it"));
            }
        }
    }
    return errors;
}

function ruleOfficeMixMatches(doc) {
    const map = stageMap(doc);
    if (!map) return [];
    const errors = [];
    const ids = stages();
    for (let i = 0; i < ids.length; i++) {
        const stage = map.get(ids[i]);
        if (!Array.isArray(stage.institutions) || !stage.occupationMix || !Array.isArray(stage.occupationMix.civicOffice)) {
            continue;
        }
        const want = new Set(stage.institutions);
        const got = new Set();
        const rows = stage.occupationMix.civicOffice;
        for (let r = 0; r < rows.length; r++) {
            if (rows[r] && typeof rows[r].id === "string" && rows[r].id !== "NONE") got.add(rows[r].id);
        }
        const missing = [];
        const extra = [];
        for (const id of want) if (!got.has(id)) missing.push(id);
        for (const id of got) if (!want.has(id)) extra.push(id);
        if (missing.length || extra.length) {
            errors.push(err("office-mix", "/stages/" + stageIndex(doc, ids[i]) + "/occupationMix/civicOffice",
                ids[i] + " civicOffice mix does not match its institutions" +
                (missing.length ? "; missing " + missing.join(", ") : "") +
                (extra.length ? "; extra " + extra.join(", ") : "")));
        }
    }
    return errors;
}

function ruleBuildOrderPermutation(doc) {
    if (!doc || !Array.isArray(doc.stages)) return [];
    const targets = priorityTargets();
    const names = postures();
    const errors = [];
    for (let i = 0; i < doc.stages.length; i++) {
        const stage = doc.stages[i];
        if (!stage || !isObject(stage.buildOrder)) continue;
        for (let p = 0; p < names.length; p++) {
            const arr = stage.buildOrder[names[p]];
            if (!Array.isArray(arr)) continue;
            if (!isPermutation(arr, targets)) {
                errors.push(err("priority-not-permutation", "/stages/" + i + "/buildOrder/" + names[p],
                    (stage.id || String(i)) + " " + names[p] + " is not a permutation of the priority targets"));
            }
        }
    }
    return errors;
}

function rulePosturesDiffer(doc) {
    if (!doc || !Array.isArray(doc.stages)) return [];
    const names = postures();
    const errors = [];
    for (let i = 0; i < doc.stages.length; i++) {
        const stage = doc.stages[i];
        if (!stage || !isObject(stage.buildOrder)) continue;
        const lists = [];
        let skip = false;
        for (let p = 0; p < names.length; p++) {
            const arr = stage.buildOrder[names[p]];
            if (!Array.isArray(arr)) { skip = true; break; }
            lists.push(arr.join("|"));
        }
        if (skip) continue;
        for (let a = 0; a < lists.length; a++) {
            for (let b = a + 1; b < lists.length; b++) {
                if (lists[a] === lists[b]) {
                    errors.push(err("build-order-not-adapted", "/stages/" + i + "/buildOrder",
                        (stage.id || String(i)) + " " + names[b] + " matches " + names[a]));
                }
            }
        }
    }
    return errors;
}

function ruleUnlockCoverage(doc) {
    if (!doc || !Array.isArray(doc.knowledge) || !Array.isArray(doc.buildings)) return [];
    const errors = [];
    const seenNode = new Set();
    const byBuilding = new Map();
    const byCraft = new Map();
    for (let i = 0; i < doc.knowledge.length; i++) {
        const node = doc.knowledge[i];
        if (!node || typeof node.id !== "string" || !Array.isArray(node.unlocks)) return [];
        if (seenNode.has(node.id)) {
            errors.push(err("unlock-coverage", "/knowledge/" + i, "duplicate knowledge id \"" + node.id + "\""));
        }
        seenNode.add(node.id);
        for (let j = 0; j < node.unlocks.length; j++) {
            const u = node.unlocks[j];
            if (!u || typeof u.kind !== "string" || typeof u.id !== "string") continue;
            const at = "/knowledge/" + i + "/unlocks/" + j;
            if (node.kind === "construction" && u.kind !== "building") {
                errors.push(err("unlock-coverage", at, node.id + " is construction and unlocks a " + u.kind));
            } else if (node.kind === "craft" && u.kind !== "craft") {
                errors.push(err("unlock-coverage", at, node.id + " is craft and unlocks a " + u.kind));
            }
            const table = u.kind === "building" ? byBuilding : (u.kind === "craft" ? byCraft : null);
            if (!table) continue;
            if (!table.has(u.id)) table.set(u.id, []);
            table.get(u.id).push(node.id);
        }
    }
    const buildingIds = [];
    const seenB = new Set();
    for (let i = 0; i < doc.buildings.length; i++) {
        const id = doc.buildings[i] && doc.buildings[i].id;
        if (typeof id !== "string") continue;
        if (seenB.has(id)) errors.push(err("unlock-coverage", "/buildings/" + i, "duplicate building id \"" + id + "\""));
        seenB.add(id);
        buildingIds.push(id);
    }
    for (let i = 0; i < buildingIds.length; i++) {
        const list = byBuilding.get(buildingIds[i]) || [];
        if (list.length !== 1) {
            errors.push(err("unlock-coverage", "/buildings",
                "building \"" + buildingIds[i] + "\" is unlocked by " + (list.length ? list.join(", ") : "nobody")));
        }
    }
    for (const id of byBuilding.keys()) {
        if (!seenB.has(id)) {
            errors.push(err("unlock-coverage", "/knowledge", "unlock refers to unknown building \"" + id + "\""));
        }
    }
    const crafts = craftRoles();
    for (let i = 0; i < crafts.length; i++) {
        const list = byCraft.get(crafts[i]) || [];
        if (list.length !== 1) {
            errors.push(err("unlock-coverage", "/knowledge",
                "craft " + crafts[i] + " is unlocked by " + (list.length ? list.join(", ") : "nobody")));
        }
    }
    for (const id of byCraft.keys()) {
        if (crafts.indexOf(id) < 0) {
            errors.push(err("unlock-coverage", "/knowledge", "unlock refers to unknown craft \"" + id + "\""));
        }
    }
    return errors;
}

function ruleKnowledgeAcyclic(doc) {
    const map = knowledgeMap(doc);
    if (!map) return [];
    for (const node of map.values()) {
        if (!Array.isArray(node.prerequisites)) return [];
        for (let i = 0; i < node.prerequisites.length; i++) {
            if (typeof node.prerequisites[i] !== "string" || !map.has(node.prerequisites[i])) return [];
        }
    }
    const color = new Map();
    const errors = [];
    function visit(id, stack) {
        const state = color.get(id) || 0;
        if (state === 1) {
            errors.push(err("knowledge-cycle", "/knowledge",
                "cycle through " + stack.concat(id).join(" -> ")));
            return;
        }
        if (state === 2) return;
        color.set(id, 1);
        const node = map.get(id);
        for (let i = 0; i < node.prerequisites.length; i++) visit(node.prerequisites[i], stack.concat(id));
        color.set(id, 2);
    }
    for (const id of map.keys()) visit(id, []);
    return errors;
}

function ruleKnowledgeClosure(doc) {
    const map = stageMap(doc);
    const kmap = knowledgeMap(doc);
    if (!map || !kmap) return [];
    for (const node of kmap.values()) {
        if (!Array.isArray(node.prerequisites)) return [];
        for (let i = 0; i < node.prerequisites.length; i++) {
            if (!kmap.has(node.prerequisites[i])) return [];
        }
    }
    const errors = [];
    const ids = stages();
    for (let s = 0; s < ids.length; s++) {
        const stage = map.get(ids[s]);
        if (!Array.isArray(stage.prerequisites)) return [];
        const known = knowledgePrereqSet(stage);
        for (const id of known) {
            const node = kmap.get(id);
            if (!node) return [];
            for (let p = 0; p < node.prerequisites.length; p++) {
                const need = node.prerequisites[p];
                if (!known.has(need)) {
                    errors.push(err("knowledge-closure", "/stages/" + stageIndex(doc, ids[s]) + "/prerequisites",
                        ids[s] + " lists " + id + " without its prerequisite " + need));
                }
            }
        }
    }
    return errors;
}

function ruleStageBuildingsUnlocked(doc) {
    const map = stageMap(doc);
    const index = unlockIndex(doc);
    if (!map || !index) return [];
    const catalogue = buildingIdSet(doc);
    const errors = [];
    const ids = stages();
    for (let i = 0; i < ids.length; i++) {
        const stage = map.get(ids[i]);
        if (!Array.isArray(stage.buildings)) return [];
        const known = knowledgePrereqSet(stage);
        for (let b = 0; b < stage.buildings.length; b++) {
            const req = stage.buildings[b];
            if (!req || typeof req.id !== "string") continue;
            const at = "/stages/" + stageIndex(doc, ids[i]) + "/buildings/" + b;
            if (!catalogue.has(req.id)) {
                errors.push(err("stage-buildings-unlocked", at,
                    ids[i] + " requires building \"" + req.id + "\", which is not in the building catalogue"));
                continue;
            }
            const nodes = index.byBuilding.get(req.id) || [];
            let hit = false;
            for (let n = 0; n < nodes.length; n++) if (known.has(nodes[n])) hit = true;
            if (!hit) {
                errors.push(err("stage-buildings-unlocked", at,
                    ids[i] + " requires \"" + req.id + "\" before a listed knowledge node unlocks it"));
            }
        }
    }
    return errors;
}

function rulePriorityHasBuilding(doc) {
    if (!doc || !Array.isArray(doc.buildings)) return [];
    const seen = new Set();
    for (let i = 0; i < doc.buildings.length; i++) {
        const row = doc.buildings[i];
        if (row && typeof row.priorityTarget === "string") seen.add(row.priorityTarget);
    }
    const errors = [];
    const targets = priorityTargets();
    for (let i = 0; i < targets.length; i++) {
        if (!seen.has(targets[i])) {
            errors.push(err("priority-unbuilt", "/buildings",
                "priority target \"" + targets[i] + "\" has no building in the catalogue"));
        }
    }
    return errors;
}

function ruleBandId(doc) {
    const got = dig(doc, ["architecture", "homeLayerBand"]);
    if (!got.ok || typeof got.value !== "string") return [];
    if (got.value === "OWNER_TODO") return [];
    const allowed = bands();
    if (allowed.indexOf(got.value) >= 0) return [];
    return [err("bad-band", "/architecture/homeLayerBand",
        "\"" + got.value + "\" is not OWNER_TODO or a DEC-013 band id (" + allowed.join(", ") + ")")];
}

function ruleTemplateBand(doc) {
    if (!doc || doc.documentRole !== "template") return [];
    const got = dig(doc, ["architecture", "homeLayerBand"]);
    if (!got.ok) return [];
    if (got.value === "OWNER_TODO") return [];
    return [err("template-band-assigned", "/architecture/homeLayerBand",
        "the template must leave homeLayerBand as OWNER_TODO until the Owner assigns a DEC-013 band")];
}

function ruleTemplateCultural(doc) {
    if (!doc || doc.documentRole !== "template") return [];
    const errors = [];
    for (let i = 0; i < CULTURAL_PATHS.length; i++) {
        const got = dig(doc, CULTURAL_PATHS[i]);
        if (!got.ok) continue;
        if (got.value !== "OWNER_TODO") {
            errors.push(err("template-cultural-filled", pointer(CULTURAL_PATHS[i]),
                "template cultural field must be OWNER_TODO"));
        }
    }
    return errors;
}

function ruleDocumentRole(doc) {
    if (!doc || typeof doc.documentRole !== "string" || typeof doc.planId !== "string") return [];
    if (doc.documentRole === "template" && doc.planId !== "TEMPLATE") {
        return [err("document-role", "/planId", "a template document's planId must be TEMPLATE")];
    }
    if (doc.documentRole === "racePlan" && doc.planId === "TEMPLATE") {
        return [err("document-role", "/planId", "a race plan's planId must not be TEMPLATE")];
    }
    return [];
}

function ruleSoftHomeBand(doc) {
    if (!doc || !isObject(doc.expansion)) return [];
    const errors = [];
    if (typeof doc.expansion.hardBandLock === "boolean" && doc.expansion.hardBandLock !== false) {
        errors.push(err("soft-home-band", "/expansion/hardBandLock",
            "DEC-013 home bands are soft boundaries; hardBandLock must be false"));
    }
    if (typeof doc.expansion.preferHomeBand === "boolean" && doc.expansion.preferHomeBand !== true) {
        errors.push(err("soft-home-band", "/expansion/preferHomeBand",
            "settlements prefer the race's home band once the Owner assigns it; preferHomeBand must be true"));
    }
    return errors;
}

function ruleExpansionDistance(doc) {
    if (!doc || !isObject(doc.expansion) || !Array.isArray(doc.expansion.stages)) return [];
    const ids = stages();
    const map = new Map();
    const errors = [];
    for (let i = 0; i < doc.expansion.stages.length; i++) {
        const row = doc.expansion.stages[i];
        if (!row || typeof row.stage !== "string") continue;
        if (map.has(row.stage)) {
            errors.push(err("expansion-distance", "/expansion/stages/" + i, "duplicate expansion row for " + row.stage));
        }
        map.set(row.stage, row);
    }
    for (let i = 0; i < ids.length; i++) {
        if (!map.has(ids[i])) {
            errors.push(err("expansion-distance", "/expansion/stages", "missing expansion row for " + ids[i]));
        }
    }
    if (errors.length) return errors;
    let prevD = -1;
    let prevS = -1;
    for (let i = 0; i < ids.length; i++) {
        const row = map.get(ids[i]);
        if (typeof row.maxNewSettlementDistanceCells !== "number" || typeof row.minSeparationCells !== "number") {
            return errors;
        }
        const at = "/expansion/stages";
        if (row.maxNewSettlementDistanceCells < prevD) {
            errors.push(err("expansion-distance", at,
                ids[i] + " colonization distance " + row.maxNewSettlementDistanceCells +
                " is below the previous stage (" + prevD + ")"));
        }
        if (row.minSeparationCells < prevS) {
            errors.push(err("expansion-distance", at,
                ids[i] + " separation " + row.minSeparationCells + " is below the previous stage (" + prevS + ")"));
        }
        prevD = row.maxNewSettlementDistanceCells;
        prevS = row.minSeparationCells;
    }
    return errors;
}

function regressionRows(doc) {
    if (!doc || !isObject(doc.failure) || !Array.isArray(doc.failure.regression)) return null;
    return doc.failure.regression;
}

function ruleRegressionAdjacent(doc) {
    const map = stageMap(doc);
    const rows = regressionRows(doc);
    if (!map || !rows) return [];
    const ids = stages();
    const byFrom = new Map();
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || typeof row.fromStage !== "string") continue;
        if (!byFrom.has(row.fromStage)) byFrom.set(row.fromStage, []);
        byFrom.get(row.fromStage).push(row);
    }
    const errors = [];
    for (let i = 1; i < ids.length; i++) {
        const list = byFrom.get(ids[i]) || [];
        if (list.length !== 1) {
            errors.push(err("regression-not-adjacent", "/failure/regression",
                ids[i] + " needs exactly one regression row"));
            continue;
        }
        if (list[0].toStage !== ids[i - 1]) {
            errors.push(err("regression-not-adjacent", "/failure/regression",
                ids[i] + " regresses to \"" + list[0].toStage + "\"; the previous stage is \"" + ids[i - 1] + "\""));
        }
    }
    for (const from of byFrom.keys()) {
        if (from === ids[0]) {
            errors.push(err("regression-not-adjacent", "/failure/regression", "camp does not regress; it collapses"));
        } else if (ids.indexOf(from) < 0) {
            errors.push(err("regression-not-adjacent", "/failure/regression", "regression from unknown stage \"" + from + "\""));
        }
    }
    return errors;
}

function ruleRegressionThreshold(doc) {
    const map = stageMap(doc);
    const rows = regressionRows(doc);
    if (!map || !rows) return [];
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !map.has(row.fromStage) || !row.when || typeof row.when.populationBelow !== "number") continue;
        const min = map.get(row.fromStage).populationMin;
        if (typeof min !== "number") continue;
        if (row.when.populationBelow !== min) {
            errors.push(err("regression-threshold", "/failure/regression/" + i + "/when/populationBelow",
                row.fromStage + " regresses below " + row.when.populationBelow +
                " but its populationMin is " + min));
        }
    }
    return errors;
}

function collapseRows(doc) {
    if (!doc || !isObject(doc.failure) || !Array.isArray(doc.failure.collapse)) return null;
    return doc.failure.collapse;
}

function ruleCollapseFood(doc) {
    const rows = collapseRows(doc);
    if (!rows) return [];
    const foods = [];
    for (let i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i].kind === "food-stores") foods.push({ row: rows[i], index: i });
    }
    if (foods.length !== 1) {
        return [err("collapse-food", "/failure/collapse",
            "expected one food-stores collapse, found " + foods.length)];
    }
    if (foods[0].row.treasurySatisfies !== false) {
        return [err("collapse-food", "/failure/collapse/" + foods[0].index + "/treasurySatisfies",
            "treasury must not satisfy food stores (INV-SOC-06)")];
    }
    return [];
}

function ruleCollapseCoverage(doc) {
    const rows = collapseRows(doc);
    if (!rows) return [];
    const errors = [];
    for (let k = 0; k < COLLAPSE_KINDS.length; k++) {
        let n = 0;
        for (let i = 0; i < rows.length; i++) if (rows[i] && rows[i].kind === COLLAPSE_KINDS[k]) n += 1;
        if (n !== 1) {
            errors.push(err("collapse-coverage", "/failure/collapse",
                "expected one collapse of kind \"" + COLLAPSE_KINDS[k] + "\", found " + n));
        }
    }
    return errors;
}

const RULES = {
    stagesPresent: ruleStagesPresent,
    stagesOrdered: ruleStagesOrdered,
    stagePrerequisiteChain: ruleStagePrerequisiteChain,
    prerequisitesResolve: rulePrerequisitesResolve,
    populationMonotone: rulePopulationMonotone,
    requirementsCumulative: ruleRequirementsCumulative,
    roleHeadcount: ruleRoleHeadcount,
    roleCraftUnlocked: ruleRoleCraftUnlocked,
    roleOfficeInstituted: ruleRoleOfficeInstituted,
    occupationMixSum: ruleOccupationMixSum,
    mixCraftUnlocked: ruleMixCraftUnlocked,
    officeMixMatches: ruleOfficeMixMatches,
    buildOrderPermutation: ruleBuildOrderPermutation,
    posturesDiffer: rulePosturesDiffer,
    unlockCoverage: ruleUnlockCoverage,
    knowledgeAcyclic: ruleKnowledgeAcyclic,
    knowledgeClosure: ruleKnowledgeClosure,
    stageBuildingsUnlocked: ruleStageBuildingsUnlocked,
    priorityHasBuilding: rulePriorityHasBuilding,
    bandId: ruleBandId,
    templateBand: ruleTemplateBand,
    templateCultural: ruleTemplateCultural,
    documentRole: ruleDocumentRole,
    softHomeBand: ruleSoftHomeBand,
    expansionDistance: ruleExpansionDistance,
    regressionAdjacent: ruleRegressionAdjacent,
    regressionThreshold: ruleRegressionThreshold,
    collapseFood: ruleCollapseFood,
    collapseCoverage: ruleCollapseCoverage
};

function validatePlan(doc, opts) {
    const disable = new Set((opts && opts.disable) || []);
    const errors = [];
    if (!disable.has("schema")) {
        try {
            const found = validateAgainst(schema(), schema(), doc, "/");
            for (let i = 0; i < found.length; i++) errors.push(found[i]);
        } catch (e) {
            errors.push(err("schema", "/", e.message));
        }
    }
    const names = Object.keys(RULES);
    for (let i = 0; i < names.length; i++) {
        if (disable.has(names[i])) continue;
        let found;
        try {
            found = RULES[names[i]](doc) || [];
        } catch (e) {
            found = [err("rule-threw", "/", names[i] + ": " + e.message)];
        }
        for (let j = 0; j < found.length; j++) errors.push(found[j]);
    }
    return errors;
}

function main(argv) {
    if (argv.length !== 3) {
        console.error("usage: node tools/plans/validate_faction_plan.js <plan.json>");
        return 2;
    }
    let doc;
    try {
        const text = fs.readFileSync(path.resolve(argv[2]), "utf8").replace(/^\uFEFF/, "");
        doc = JSON.parse(text);
    } catch (e) {
        console.error("ERROR unreadable / - " + e.message);
        return 1;
    }
    let errors;
    try {
        errors = validatePlan(doc);
    } catch (e) {
        console.error("ERROR validator / - " + e.message);
        return 1;
    }
    for (let i = 0; i < errors.length; i++) {
        const e = errors[i];
        console.error("ERROR " + e.code + " " + e.path + " - " + e.message);
    }
    if (errors.length) return 1;
    console.log("OK " + argv[2]);
    return 0;
}

if (require.main === module) {
    process.exit(main(process.argv));
}

module.exports = {
    validatePlan: validatePlan,
    RULES: RULES,
    CULTURAL_PATHS: CULTURAL_PATHS,
    enumOf: enumOf,
    unsupportedSchemaKeywords: unsupportedSchemaKeywords,
    SCHEMA_PATH: SCHEMA_PATH,
    COLLAPSE_KINDS: COLLAPSE_KINDS
};
