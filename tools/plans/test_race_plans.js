"use strict";

// SOC.10.03 gate: the nine race plans exist, each validates, each matches the
// template except documentRole and planId, and every cultural field plus
// homeLayerBand is OWNER_TODO. Plan ids are the provisional file slugs, unique,
// and none is TEMPLATE. Run: node tools/plans/test_race_plans.js

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { validatePlan, CULTURAL_PATHS } = require("./validate_faction_plan.js");

const ROOT = path.resolve(__dirname, "..", "..");
const PLANS_DIR = path.join(ROOT, "game", "data", "plans");
const TEMPLATE_PATH = path.join(PLANS_DIR, "TEMPLATE.plan.json");
const VALIDATOR = path.join(__dirname, "validate_faction_plan.js");

const RACE_SLUGS = [
    "human",
    "elf",
    "halfling",
    "dwarf",
    "gnome",
    "dragonborn",
    "half-elf",
    "half-orc",
    "tiefling"
];

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

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function racePlanNames(fileNames) {
    const names = [];
    for (let i = 0; i < fileNames.length; i++) {
        const name = fileNames[i];
        if (name.endsWith(".plan.json") && name !== "TEMPLATE.plan.json") names.push(name);
    }
    names.sort();
    return names;
}

function exactNineProblems(fileNames) {
    const got = racePlanNames(fileNames);
    const expected = RACE_SLUGS.map(function (slug) { return slug + ".plan.json"; }).sort();
    const problems = [];
    for (let i = 0; i < expected.length; i++) {
        if (got.indexOf(expected[i]) < 0) problems.push("missing " + expected[i]);
    }
    for (let i = 0; i < got.length; i++) {
        if (expected.indexOf(got[i]) < 0) problems.push("unexpected " + got[i]);
    }
    return problems;
}

function roleProblems(doc) {
    if (!doc || doc.documentRole !== "racePlan") return ["documentRole is not racePlan"];
    return [];
}

function slugProblems(slug, doc) {
    if (!doc || doc.planId !== slug) return ["planId is not " + slug];
    return [];
}

function dig(obj, parts) {
    let node = obj;
    for (let i = 0; i < parts.length; i++) {
        if (node === null || typeof node !== "object" || !Object.prototype.hasOwnProperty.call(node, parts[i])) {
            return { ok: false };
        }
        node = node[parts[i]];
    }
    return { ok: true, value: node };
}

function culturalProblems(doc) {
    const problems = [];
    for (let i = 0; i < CULTURAL_PATHS.length; i++) {
        const got = dig(doc, CULTURAL_PATHS[i]);
        if (!got.ok || got.value !== "OWNER_TODO") problems.push(CULTURAL_PATHS[i].join("."));
    }
    const band = dig(doc, ["architecture", "homeLayerBand"]);
    if (!band.ok || band.value !== "OWNER_TODO") problems.push("architecture.homeLayerBand");
    return problems;
}

function diffPath(a, b, at) {
    const here = at || "";
    if (a === b) return null;
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return here || "/";
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return here || "/";
        for (let i = 0; i < a.length; i++) {
            const child = diffPath(a[i], b[i], here + "/" + i);
            if (child) return child;
        }
        return null;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    for (let i = 0; i < keysA.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(b, keysA[i])) return here + "/" + keysA[i];
    }
    for (let i = 0; i < keysB.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(a, keysB[i])) return here + "/" + keysB[i];
    }
    for (let i = 0; i < keysA.length; i++) {
        const child = diffPath(a[keysA[i]], b[keysA[i]], here + "/" + keysA[i]);
        if (child) return child;
    }
    return null;
}

function stripIdentity(doc) {
    const copy = clone(doc);
    delete copy.documentRole;
    delete copy.planId;
    return copy;
}

function structuralProblems(race, template) {
    const where = diffPath(stripIdentity(race), stripIdentity(template));
    if (where === null) return [];
    return ["differs at " + where];
}

function planIdSetProblems(planIds) {
    const problems = [];
    const seen = Object.create(null);
    for (let i = 0; i < planIds.length; i++) {
        const id = planIds[i];
        if (id === "TEMPLATE") problems.push("TEMPLATE");
        if (Object.prototype.hasOwnProperty.call(seen, id)) problems.push("duplicate " + id);
        seen[id] = true;
    }
    return problems;
}

function stageById(doc, id) {
    for (let i = 0; i < doc.stages.length; i++) {
        if (doc.stages[i] && doc.stages[i].id === id) return doc.stages[i];
    }
    return null;
}

function errorText(errors) {
    return errors.map(function (err) { return err.code + " " + err.path; }).join(", ");
}

function main() {
    const fileNames = fs.readdirSync(PLANS_DIR);
    const nine = exactNineProblems(fileNames);
    if (nine.length === 0) pass("exactly the nine race plans");
    else fail("exactly the nine race plans", nine.join(", "));

    const missing = fileNames.filter(function (name) { return name !== "gnome.plan.json"; });
    if (exactNineProblems(missing).length > 0) pass("mutant missing gnome.plan.json");
    else fail("mutant missing gnome.plan.json", "provocation was accepted");

    const extra = fileNames.concat(["goblin.plan.json"]);
    if (exactNineProblems(extra).length > 0) pass("mutant extra goblin.plan.json");
    else fail("mutant extra goblin.plan.json", "provocation was accepted");

    const swapped = fileNames.map(function (name) {
        return name === "gnome.plan.json" ? "goblin.plan.json" : name;
    });
    if (exactNineProblems(swapped).length > 0) pass("mutant swapped gnome for goblin");
    else fail("mutant swapped gnome for goblin", "provocation was accepted");

    let template = null;
    try {
        template = readJson(TEMPLATE_PATH);
    } catch (e) {
        fail("read template", e.message);
    }

    const docs = {};
    for (let i = 0; i < RACE_SLUGS.length; i++) {
        const slug = RACE_SLUGS[i];
        try {
            docs[slug] = readJson(path.join(PLANS_DIR, slug + ".plan.json"));
        } catch (e) {
            fail("read " + slug, e.message);
        }
    }

    const roleHits = [];
    const slugHits = [];
    const validHits = [];
    const structHits = [];
    const culturalHits = [];
    for (let i = 0; i < RACE_SLUGS.length; i++) {
        const slug = RACE_SLUGS[i];
        const doc = docs[slug];
        if (!doc) continue;
        const role = roleProblems(doc);
        if (role.length) roleHits.push(slug + " " + role.join(", "));
        const slugProblem = slugProblems(slug, doc);
        if (slugProblem.length) slugHits.push(slug + " " + slugProblem.join(", "));
        if (template) {
            const struct = structuralProblems(doc, template);
            if (struct.length) structHits.push(slug + " " + struct.join(", "));
        }
        const cultural = culturalProblems(doc);
        if (cultural.length) culturalHits.push(slug + " " + cultural.join(", "));
        const errors = validatePlan(doc);
        if (errors.length) validHits.push(slug + " " + errorText(errors));
    }

    if (roleHits.length === 0 && Object.keys(docs).length === RACE_SLUGS.length) pass("each documentRole is racePlan");
    else fail("each documentRole is racePlan", roleHits.join(" || ") || "missing file");

    if (slugHits.length === 0 && Object.keys(docs).length === RACE_SLUGS.length) {
        pass("each planId is its provisional slug");
    } else fail("each planId is its provisional slug", slugHits.join(" || ") || "missing file");

    if (validHits.length === 0 && Object.keys(docs).length === RACE_SLUGS.length) pass("each race plan validates");
    else fail("each race plan validates", validHits.join(" || ") || "missing file");

    if (structHits.length === 0 && template && Object.keys(docs).length === RACE_SLUGS.length) {
        pass("structurally equal except documentRole and planId");
    } else fail("structurally equal except documentRole and planId", structHits.join(" || ") || "missing template or file");

    if (culturalHits.length === 0 && Object.keys(docs).length === RACE_SLUGS.length) {
        pass("cultural fields and homeLayerBand are OWNER_TODO");
    } else fail("cultural fields and homeLayerBand are OWNER_TODO", culturalHits.join(" || ") || "missing file");

    const planIds = [];
    for (let i = 0; i < RACE_SLUGS.length; i++) {
        if (docs[RACE_SLUGS[i]]) planIds.push(docs[RACE_SLUGS[i]].planId);
    }
    if (planIds.length === RACE_SLUGS.length && planIdSetProblems(planIds).length === 0) {
        pass("planIds are unique and none is TEMPLATE");
    } else fail("planIds are unique and none is TEMPLATE", planIdSetProblems(planIds).join(", ") || "missing file");

    let cliOk = Object.keys(docs).length === RACE_SLUGS.length;
    const cliDetail = [];
    for (let i = 0; i < RACE_SLUGS.length; i++) {
        const slug = RACE_SLUGS[i];
        const rel = path.join("game", "data", "plans", slug + ".plan.json");
        const cli = spawnSync(process.execPath, [VALIDATOR, rel], { cwd: ROOT, encoding: "utf8" });
        if (cli.status !== 0 || String(cli.stdout).indexOf("OK ") !== 0) {
            cliOk = false;
            cliDetail.push(slug + " status " + cli.status + " " + cli.stdout + cli.stderr);
        }
    }
    if (cliOk) pass("cli each race plan exits 0");
    else fail("cli each race plan exits 0", cliDetail.join(" || "));

    if (!template || !docs.human) {
        fail("mutants", "template or human plan did not load");
    } else {
        const allowed = clone(template);
        allowed.documentRole = "racePlan";
        allowed.planId = "human";
        if (structuralProblems(allowed, template).length === 0) pass("documentRole and planId may differ from the template");
        else fail("documentRole and planId may differ from the template", structuralProblems(allowed, template).join(", "));

        const roleMutant = clone(docs.human);
        roleMutant.documentRole = "template";
        const roleErr = roleProblems(roleMutant);
        const roleStruct = structuralProblems(roleMutant, template);
        const roleValid = validatePlan(roleMutant);
        if (roleErr.length > 0 && roleStruct.length === 0 && roleValid.length > 0) pass("mutant documentRole template");
        else fail("mutant documentRole template", "role " + roleErr.length + " struct " + roleStruct.join(", ") + " valid " + errorText(roleValid));

        const slugMutant = clone(docs.human);
        slugMutant.planId = "mankind";
        const renamedIds = planIds.slice();
        const humanAt = renamedIds.indexOf("human");
        if (humanAt >= 0) renamedIds[humanAt] = "mankind";
        if (humanAt >= 0 &&
            slugProblems("human", slugMutant).length > 0 &&
            structuralProblems(slugMutant, template).length === 0 &&
            planIdSetProblems(renamedIds).length === 0) {
            pass("mutant planId not the slug");
        } else {
            fail("mutant planId not the slug", "slug check, structural check, and uniqueness disagreed");
        }

        const popped = clone(docs.human);
        const hamlet = stageById(popped, "hamlet");
        if (!hamlet) fail("mutant changed populationMin", "no hamlet stage");
        else {
            hamlet.populationMin = 17;
            const poppedErrors = validatePlan(popped);
            if (poppedErrors.length > 0) pass("mutant changed populationMin fails validation");
            else fail("mutant changed populationMin fails validation", "provocation was accepted");
        }

        const drifted = clone(docs.human);
        drifted.expansion.preferFreshWaterWithinCells = 26;
        const driftStruct = structuralProblems(drifted, template);
        const driftValid = validatePlan(drifted);
        const driftCultural = culturalProblems(drifted);
        if (driftStruct.length > 0 && driftValid.length === 0 && driftCultural.length === 0) {
            pass("mutant changed preferFreshWaterWithinCells");
        } else {
            fail("mutant changed preferFreshWaterWithinCells",
                "struct " + driftStruct.join(", ") + " valid " + errorText(driftValid) + " cultural " + driftCultural.join(", "));
        }

        const affinity = clone(docs.human);
        affinity.raceClassAffinity = { FIGHTER: 1 };
        const affinityStruct = structuralProblems(affinity, template);
        const affinityCultural = culturalProblems(affinity);
        if (affinityStruct.length > 0 && affinityCultural.length === 0) pass("mutant added raceClassAffinity");
        else fail("mutant added raceClassAffinity", "struct " + affinityStruct.join(", ") + " cultural " + affinityCultural.join(", "));

        const filled = clone(docs.human);
        filled.lore = "worker-filled lore";
        const filledCultural = culturalProblems(filled);
        const filledValid = validatePlan(filled);
        if (filledCultural.length > 0 && filledValid.length === 0) pass("mutant filled cultural string");
        else fail("mutant filled cultural string", "cultural " + filledCultural.join(", ") + " valid " + errorText(filledValid));

        const banded = clone(docs.human);
        banded.architecture.homeLayerBand = "surface";
        const bandCultural = culturalProblems(banded);
        const bandValid = validatePlan(banded);
        if (bandCultural.length > 0 && bandValid.length === 0) pass("mutant homeLayerBand assigned");
        else fail("mutant homeLayerBand assigned", "cultural " + bandCultural.join(", ") + " valid " + errorText(bandValid));

        const dup = planIds.slice();
        dup[1] = dup[0];
        if (planIdSetProblems(dup).length > 0) pass("mutant duplicate planId");
        else fail("mutant duplicate planId", "provocation was accepted");

        const templated = planIds.slice();
        templated[0] = "TEMPLATE";
        if (planIdSetProblems(templated).length > 0) pass("mutant planId TEMPLATE");
        else fail("mutant planId TEMPLATE", "provocation was accepted");

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "soc1003-"));
        try {
            const cliMutant = clone(docs.human);
            const cliHamlet = stageById(cliMutant, "hamlet");
            if (!cliHamlet) {
                fail("mutant cli exits 1", "no hamlet stage");
            } else {
                cliHamlet.populationMin = 17;
                const tmpFile = path.join(tmpDir, "mutant.plan.json");
                fs.writeFileSync(tmpFile, JSON.stringify(cliMutant));
                const cli = spawnSync(process.execPath, [VALIDATOR, tmpFile], { cwd: ROOT, encoding: "utf8" });
                if (cli.status === 1 && String(cli.stderr).indexOf("ERROR ") >= 0) pass("mutant cli exits 1");
                else fail("mutant cli exits 1", "status " + cli.status + " " + cli.stdout + cli.stderr);
            }
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    }

    console.log(passed + " passed, " + failed + " failed");
    return failed === 0 ? 0 : 1;
}

process.exit(main());
