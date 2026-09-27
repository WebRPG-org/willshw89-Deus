"use strict";

// SOC.10.02 gate: the template validates, and each mutant fixture fails for
// exactly one rule. Run: node tools/plans/test_faction_plan_schema.js

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const {
    validatePlan,
    RULES,
    CULTURAL_PATHS,
    enumOf,
    unsupportedSchemaKeywords,
    SCHEMA_PATH,
    COLLAPSE_KINDS
} = require("./validate_faction_plan.js");

const ROOT = path.resolve(__dirname, "..", "..");
const TEMPLATE_PATH = path.join(ROOT, "game", "data", "plans", "TEMPLATE.plan.json");
const FIXTURE_DIR = path.join(__dirname, "fixtures");
const VALIDATOR = path.join(__dirname, "validate_faction_plan.js");

let failed = 0;
let passed = 0;

function pass(name) {
    passed += 1;
    console.log("PASS " + name);
}

function fail(name, detail) {
    failed += 1;
    console.error("FAIL " + name + (detail ? " - " + detail : ""));
}

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function match(el, query) {
    if (!el || typeof el !== "object") return false;
    const keys = Object.keys(query);
    for (let i = 0; i < keys.length; i++) {
        if (el[keys[i]] !== query[keys[i]]) return false;
    }
    return true;
}

function stepInto(node, part) {
    if (part && typeof part === "object") {
        if (!Array.isArray(node)) throw new Error("query on a non-array");
        for (let i = 0; i < node.length; i++) if (match(node[i], part)) return node[i];
        throw new Error("unmatched " + JSON.stringify(part));
    }
    if (node === null || typeof node !== "object" || !Object.prototype.hasOwnProperty.call(node, part)) {
        throw new Error("missing " + String(part));
    }
    return node[part];
}

function resolve(root, where) {
    let node = root;
    for (let i = 0; i < where.length; i++) node = stepInto(node, where[i]);
    return node;
}

function resolveParent(root, where) {
    let node = root;
    for (let i = 0; i < where.length - 1; i++) node = stepInto(node, where[i]);
    return { node: node, key: where[where.length - 1] };
}

function clone(v) {
    return JSON.parse(JSON.stringify(v));
}

function applyPatch(doc, patch) {
    const copy = clone(doc);
    for (let i = 0; i < patch.length; i++) {
        const op = patch[i];
        if (op.op === "set") {
            const loc = resolveParent(copy, op.where);
            if (loc.key && typeof loc.key === "object") throw new Error("set key is a query");
            loc.node[loc.key] = clone(op.value);
        } else if (op.op === "remove") {
            const loc = resolveParent(copy, op.where);
            if (loc.key && typeof loc.key === "object") {
                if (!Array.isArray(loc.node)) throw new Error("remove query on a non-array");
                let idx = -1;
                for (let j = 0; j < loc.node.length; j++) if (match(loc.node[j], loc.key)) idx = j;
                if (idx < 0) throw new Error("remove unmatched " + JSON.stringify(loc.key));
                loc.node.splice(idx, 1);
            } else {
                delete loc.node[loc.key];
            }
        } else if (op.op === "add") {
            const loc = resolveParent(copy, op.where);
            if (loc.key !== "-") throw new Error("add where must end in -");
            if (!Array.isArray(loc.node)) throw new Error("add target is not an array");
            loc.node.push(clone(op.value));
        } else if (op.op === "swap") {
            const arr = resolve(copy, op.where);
            let left = -1;
            let right = -1;
            for (let j = 0; j < arr.length; j++) {
                if (arr[j] && arr[j].id === op.left) left = j;
                if (arr[j] && arr[j].id === op.right) right = j;
            }
            if (left < 0 || right < 0) throw new Error("swap missed " + op.left + " / " + op.right);
            const tmp = arr[left];
            arr[left] = arr[right];
            arr[right] = tmp;
        } else {
            throw new Error("unknown op " + op.op);
        }
    }
    return copy;
}

function stringLeaves(obj, prefix, out) {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
        const value = obj[keys[i]];
        const next = prefix.concat(keys[i]);
        if (typeof value === "string") out.push(next.join("."));
        else if (value && typeof value === "object") stringLeaves(value, next, out);
    }
}

function main() {
    const template = readJson(TEMPLATE_PATH);
    const schemaDoc = readJson(SCHEMA_PATH);
    const unsupported = unsupportedSchemaKeywords(schemaDoc);
    if (unsupported.length === 0) pass("schema keywords are implemented");
    else fail("schema keywords are implemented", unsupported.join(", "));

    const templateErrors = validatePlan(template);
    if (templateErrors.length === 0) pass("template validates");
    else {
        fail("template validates", templateErrors.map(function (e) {
            return e.code + " " + e.path + " " + e.message;
        }).join(" || "));
    }

    const craft = enumOf("craftId");
    const office = enumOf("civicOfficeId");
    const klass = enumOf("classId");
    if (craft.indexOf("NONE") >= 0 && office.indexOf("NONE") >= 0 && klass.indexOf("NONE") >= 0) {
        pass("NONE is legal on craft, civicOffice, and class");
    } else fail("NONE is legal on craft, civicOffice, and class");
    if (craft.indexOf("SOLDIER") < 0) pass("craft set has no SOLDIER id");
    else fail("craft set has no SOLDIER id");
    if (craft.length === 35) pass("craft set is NONE plus the 34 person-spec crafts");
    else fail("craft set is NONE plus the 34 person-spec crafts", "length " + craft.length);
    if (klass.length === 13) pass("class set is NONE plus the 12 SRD classes");
    else fail("class set is NONE plus the 12 SRD classes", "length " + klass.length);

    const bandExpect = ["lower-2", "lower-1", "surface", "upper-1", "upper-2"];
    const bandGot = enumOf("bandId");
    if (bandGot.length === bandExpect.length && bandGot.every(function (id, i) { return id === bandExpect[i]; })) {
        pass("DEC-013 band ids");
    } else fail("DEC-013 band ids", bandGot.join(","));

    const stageExpect = ["camp", "hamlet", "village", "town", "city", "capital"];
    const stageGot = enumOf("stageId");
    if (stageGot.join(",") === stageExpect.join(",")) pass("six stages in order");
    else fail("six stages in order", stageGot.join(","));

    const obligation = enumOf("obligationId");
    const obligationExpect = ["NONE", "RESERVE", "MILITIA", "GUARD", "PROFESSIONAL", "ELITE_RETINUE"];
    if (obligation.join(",") === obligationExpect.join(",")) pass("obligation statuses");
    else fail("obligation statuses", obligation.join(","));

    if (template.schemaVersion === "deus-faction-plan/1.0.0" &&
        template.documentRole === "template" &&
        template.planId === "TEMPLATE" &&
        template.architecture.homeLayerBand === "OWNER_TODO" &&
        template.expansion.hardBandLock === false &&
        template.expansion.preferHomeBand === true &&
        template.expansion.cellFeet === 5 &&
        template.expansion.distanceUnit === "cell" &&
        template.expansion.preferFreshWaterWithinCells === 25) {
        pass("template sentinels and DEC-013 geometry");
    } else fail("template sentinels and DEC-013 geometry");

    const pops = { camp: 8, hamlet: 16, village: 40, town: 120, city: 400, capital: 1200 };
    let popOk = template.stages.length === 6;
    for (let i = 0; i < stageExpect.length; i++) {
        if (!template.stages[i] || template.stages[i].id !== stageExpect[i] ||
            template.stages[i].populationMin !== pops[stageExpect[i]]) popOk = false;
    }
    if (popOk) pass("template population baseline");
    else fail("template population baseline");

    const distances = [0, 0, 48, 192, 768, 3072];
    let distOk = true;
    for (let i = 0; i < stageExpect.length; i++) {
        const row = template.expansion.stages[i];
        if (!row || row.stage !== stageExpect[i] || row.maxNewSettlementDistanceCells !== distances[i]) distOk = false;
    }
    if (distOk) pass("template colonization distances");
    else fail("template colonization distances");

    const camp = template.stages[0];
    const campOffices = camp.institutions.slice().sort().join(",");
    const founder = ["LEADER", "TREASURER", "MINT_MASTER", "MARSHAL", "QUARTERMASTER",
        "MASTER_OF_WORKS", "PROVISIONER", "RECORDER"].sort().join(",");
    if (campOffices === founder) pass("camp carries the eight founder institutions");
    else fail("camp carries the eight founder institutions", campOffices);

    const leaves = [];
    stringLeaves(template.architecture.cultural, ["architecture", "cultural"], leaves);
    const tops = ["raceId", "displayName", "lore", "values"];
    for (let i = 0; i < tops.length; i++) leaves.push(tops[i]);
    let culturalOk = true;
    const listed = CULTURAL_PATHS.map(function (p) { return p.join("."); });
    if (leaves.length !== listed.length) culturalOk = false;
    for (let i = 0; i < leaves.length; i++) if (listed.indexOf(leaves[i]) < 0) culturalOk = false;
    for (let i = 0; i < CULTURAL_PATHS.length; i++) {
        let node = template;
        for (let j = 0; j < CULTURAL_PATHS[i].length; j++) node = node[CULTURAL_PATHS[i][j]];
        if (node !== "OWNER_TODO") culturalOk = false;
    }
    if (culturalOk) pass("every cultural leaf on the template is OWNER_TODO");
    else fail("every cultural leaf on the template is OWNER_TODO", leaves.join(" "));

    const banned = /pixellab|nano banana|generate_image|image model/i;
    const blob = JSON.stringify(template) + JSON.stringify(schemaDoc);
    if (!banned.test(blob)) pass("plan data has no art-generation prompt");
    else fail("plan data has no art-generation prompt");

    let postureOk = true;
    for (let i = 0; i < template.stages.length; i++) {
        const order = template.stages[i].buildOrder;
        const keys = ["peace", "threat", "famine", "abundance"];
        const seen = new Set();
        for (let k = 0; k < keys.length; k++) seen.add(order[keys[k]].join("|"));
        if (seen.size !== 4) postureOk = false;
    }
    if (postureOk) pass("each stage adapts all four postures");
    else fail("each stage adapts all four postures");

    const food = template.failure.collapse.filter(function (row) { return row.kind === "food-stores"; });
    if (food.length === 1 && food[0].treasurySatisfies === false) pass("food collapse refuses treasury");
    else fail("food collapse refuses treasury");
    const kinds = template.failure.collapse.map(function (row) { return row.kind; }).sort().join(",");
    if (kinds === COLLAPSE_KINDS.slice().sort().join(",")) pass("three collapse kinds");
    else fail("three collapse kinds", kinds);

    const names = fs.readdirSync(FIXTURE_DIR).filter(function (name) { return name.endsWith(".json"); }).sort();
    const fixtures = names.map(function (name) { return readJson(path.join(FIXTURE_DIR, name)); });
    const killed = {};
    for (let i = 0; i < fixtures.length; i++) {
        const fixture = fixtures[i];
        let doc;
        try {
            doc = applyPatch(template, fixture.patch);
        } catch (e) {
            fail("mutant " + fixture.id, "patch: " + e.message);
            continue;
        }
        const errors = validatePlan(doc);
        const hit = errors.filter(function (e) { return e.code === fixture.expect; });
        if (hit.length === 0) {
            fail("mutant " + fixture.id + " expects " + fixture.expect,
                errors.map(function (e) { return e.code + " " + e.message; }).join(" || ") || "no errors");
            continue;
        }
        if (!fixture.kills) {
            fail("mutant " + fixture.id, "no kills field");
            continue;
        }
        const off = validatePlan(doc, { disable: [fixture.kills] });
        if (off.length !== 0) {
            fail("mutant " + fixture.id + " kills " + fixture.kills,
                "still failing: " + off.map(function (e) { return e.code + " " + e.path + " " + e.message; }).join(" || "));
            continue;
        }
        killed[fixture.kills] = true;
        pass("mutant " + fixture.id + " kills " + fixture.kills + " (" + fixture.expect + ")");
    }

    const ruleNames = ["schema"].concat(Object.keys(RULES));
    const missingKill = ruleNames.filter(function (name) { return !killed[name]; });
    if (missingKill.length === 0) pass("every rule has a killed mutant");
    else fail("every rule has a killed mutant", missingKill.join(", "));

    const cliTemplate = spawnSync(process.execPath, [VALIDATOR, TEMPLATE_PATH], {
        cwd: ROOT, encoding: "utf8"
    });
    if (cliTemplate.status === 0 && cliTemplate.stdout.indexOf("OK ") === 0) pass("cli template exits 0");
    else fail("cli template exits 0", "status " + cliTemplate.status + " " + cliTemplate.stdout + cliTemplate.stderr);

    const usage = spawnSync(process.execPath, [VALIDATOR], { cwd: ROOT, encoding: "utf8" });
    if (usage.status === 2 && usage.stderr.indexOf("usage:") >= 0) pass("cli usage exits 2");
    else fail("cli usage exits 2", "status " + usage.status + " " + usage.stderr);

    const missing = fixtures.filter(function (f) { return f.id === "missing-stage"; })[0];
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "soc1002-"));
    const tmpFile = path.join(tmpDir, "missing-stage.plan.json");
    try {
        fs.writeFileSync(tmpFile, JSON.stringify(applyPatch(template, missing.patch)));
        const cliMutant = spawnSync(process.execPath, [VALIDATOR, tmpFile], { cwd: ROOT, encoding: "utf8" });
        if (cliMutant.status === 1 && cliMutant.stderr.indexOf("ERROR missing-stage") >= 0) {
            pass("cli mutant exits 1");
        } else {
            fail("cli mutant exits 1", "status " + cliMutant.status + " " + cliMutant.stderr);
        }
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    console.log(passed + " passed, " + failed + " failed");
    return failed === 0 ? 0 : 1;
}

process.exit(main());
