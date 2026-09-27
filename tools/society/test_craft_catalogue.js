#!/usr/bin/env node
"use strict";

/**
 * tools/society/test_craft_catalogue.js
 *
 * Headless test suite and validator for the DEUS Master Craft Catalogue (SOC.12.01):
 * - Draft 2020-12 schema validation
 * - 34 canonical crafts count and bijection with person identity schema
 * - Explicit semantics of craft: NONE
 * - 6 craft families distribution integrity
 * - Preservation of the three independent axes (INV-SOC-01, INV-SOC-02)
 * - 4-tier apprentice-to-master progression invariants
 * - Physical production chain linkage to DEUS catalogs and resource registry
 * - Canonical 2014 SRD 5.1 tool and crafting alignment
 * - Calling-to-craft consistency with identity.js
 * - Faction Development Plan knowledge node two-way closure
 * - Rule 4 mutation checks: 26 targeted failing fixtures/mutants killed
 *
 * Usage: node tools/society/test_craft_catalogue.js
 */

const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..", "..");
const CATALOGUE_PATH = path.join(ROOT, "game", "data", "society", "craft_catalogue.json");
const SCHEMA_PATH = path.join(ROOT, "game", "data", "society", "craft_catalogue.schema.json");
const PERSON_SCHEMA_PATH = path.join(ROOT, "game", "data", "society", "person_identity.schema.json");
const WORLD_CATALOG_PATH = path.join(ROOT, "game", "data", "DEUS_WorldCatalog.json");
const RESOURCE_REGISTRY_PATH = path.join(ROOT, "game", "data", "DEUS_ResourceRegistry.json");
const TEMPLATE_PLAN_PATH = path.join(ROOT, "game", "data", "plans", "TEMPLATE.plan.json");
const SRD_EQUIPMENT_PATH = path.join(ROOT, "game", "data", "srd51", "equipment.json");
const SRD_RULES_PATH = path.join(ROOT, "game", "data", "srd51", "rules.json");
const IDENTITY_PATH = path.join(ROOT, "game", "js", "sim", "society", "identity.js");

const rawCatalogue = fs.readFileSync(CATALOGUE_PATH, "utf8");
const catalogue = JSON.parse(rawCatalogue);
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
const personSchema = JSON.parse(fs.readFileSync(PERSON_SCHEMA_PATH, "utf8"));
const worldCat = JSON.parse(fs.readFileSync(WORLD_CATALOG_PATH, "utf8"));
const resReg = JSON.parse(fs.readFileSync(RESOURCE_REGISTRY_PATH, "utf8"));
const templatePlan = JSON.parse(fs.readFileSync(TEMPLATE_PLAN_PATH, "utf8"));
const srdEquipment = JSON.parse(fs.readFileSync(SRD_EQUIPMENT_PATH, "utf8"));
const srdRules = JSON.parse(fs.readFileSync(SRD_RULES_PATH, "utf8"));
const Identity = require(IDENTITY_PATH);

function clone(v) {
    return JSON.parse(JSON.stringify(v));
}

// --- Draft 2020-12 Schema Validator ---

function typeOk(spec, value) {
    const types = Array.isArray(spec) ? spec : [spec];
    return types.some(t => {
        if (t === "null") return value === null;
        if (t === "integer") return typeof value === "number" && Number.isInteger(value);
        if (t === "number") return typeof value === "number";
        if (t === "string") return typeof value === "string";
        if (t === "boolean") return typeof value === "boolean";
        if (t === "array") return Array.isArray(value);
        if (t === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
        return false;
    });
}

function resolveRef(root, ref) {
    if (!ref.startsWith("#/")) throw new Error("Unsupported ref: " + ref);
    const parts = ref.slice(2).split("/");
    let cur = root;
    for (const p of parts) {
        if (!cur || !Object.prototype.hasOwnProperty.call(cur, p)) throw new Error("Ref not found: " + ref);
        cur = cur[p];
    }
    return cur;
}

function schemaErrors(root, node, value, jsonPointer = "") {
    if (!node || typeof node !== "object") return [];
    if (node["$ref"]) {
        const target = resolveRef(root, node["$ref"]);
        return schemaErrors(root, target, value, jsonPointer);
    }
    const errors = [];
    if (Object.prototype.hasOwnProperty.call(node, "const") && value !== node.const) {
        errors.push(`${jsonPointer}: expected const ${JSON.stringify(node.const)}, got ${JSON.stringify(value)}`);
    }
    if (Array.isArray(node.enum) && node.enum.indexOf(value) < 0) {
        errors.push(`${jsonPointer}: value ${JSON.stringify(value)} not in enum`);
    }
    if (node.type && !typeOk(node.type, value)) {
        errors.push(`${jsonPointer}: expected type ${JSON.stringify(node.type)}, got ${typeof value}`);
    }
    if (typeof value === "number") {
        if (typeof node.minimum === "number" && value < node.minimum) errors.push(`${jsonPointer}: value < minimum`);
        if (typeof node.maximum === "number" && value > node.maximum) errors.push(`${jsonPointer}: value > maximum`);
    }
    if (typeof value === "string") {
        if (typeof node.minLength === "number" && value.length < node.minLength) errors.push(`${jsonPointer}: string length < minLength`);
        if (typeof node.maxLength === "number" && value.length > node.maxLength) errors.push(`${jsonPointer}: string length > maxLength`);
    }
    if (Array.isArray(value)) {
        if (typeof node.minItems === "number" && value.length < node.minItems) errors.push(`${jsonPointer}: array length < minItems`);
        if (typeof node.maxItems === "number" && value.length > node.maxItems) errors.push(`${jsonPointer}: array length > maxItems`);
        if (node.items) {
            value.forEach((item, idx) => {
                const sub = schemaErrors(root, node.items, item, `${jsonPointer}/${idx}`);
                errors.push(...sub);
            });
        }
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        const props = node.properties || {};
        if (node.additionalProperties === false) {
            for (const k of Object.keys(value)) {
                if (!Object.prototype.hasOwnProperty.call(props, k)) errors.push(`${jsonPointer}: unexpected property ${k}`);
            }
        }
        for (const req of (node.required || [])) {
            if (!Object.prototype.hasOwnProperty.call(value, req)) errors.push(`${jsonPointer}: missing required property ${req}`);
        }
        for (const k of Object.keys(props)) {
            if (Object.prototype.hasOwnProperty.call(value, k)) {
                const sub = schemaErrors(root, props[k], value[k], `${jsonPointer}/${k}`);
                errors.push(...sub);
            }
        }
    }
    return errors;
}

// --- Domain Checks ---

function runCatalogueChecks(cat, schemaDoc) {
    const checks = [];
    const check = (name, pass, msg) => checks.push({ name, pass: !!pass, msg });

    // 1. Schema Validation
    const sErrs = schemaErrors(schemaDoc, schemaDoc, cat, "#");
    check("schema_validates", sErrs.length === 0, sErrs.length ? sErrs[0] : "catalogue matches JSON schema");

    // 2. 34 Canonical Crafts Count & Bijection
    const crafts = Array.isArray(cat.crafts) ? cat.crafts : [];
    check("catalogue_has_34_crafts", crafts.length === 34, `found ${crafts.length} crafts (expected 34)`);

    const canonicalPersonCrafts = personSchema.properties.craft.enum.filter(c => c !== "NONE").sort();
    const catCraftIds = crafts.map(c => c.id).sort();
    const uniqueCatCraftIds = [...new Set(catCraftIds)];
    const missingInCat = canonicalPersonCrafts.filter(c => !catCraftIds.includes(c));
    const extraInCat = catCraftIds.filter(c => !canonicalPersonCrafts.includes(c));
    const isBijection = uniqueCatCraftIds.length === 34 && missingInCat.length === 0 && extraInCat.length === 0;
    check("craft_ids_match_canonical_set", isBijection,
        isBijection ? "exact 1:1 match with person identity schema 34 crafts" : `missing: ${missingInCat.join(",")}; extra: ${extraInCat.join(",")}`);

    // 3. NONE Semantics Explicitly Defined
    const noneOk = cat.noneSemantics &&
        cat.noneSemantics.token === "NONE" &&
        Array.isArray(cat.noneSemantics.allowedDutyAssignments) &&
        cat.noneSemantics.allowedDutyAssignments.length > 0 &&
        cat.noneSemantics.independentAxes &&
        cat.noneSemantics.independentAxes.civicOfficeIndependent === true &&
        cat.noneSemantics.independentAxes.classIndependent === true &&
        cat.noneSemantics.independentAxes.dutyDecoupled === true;
    check("none_semantics_explicitly_defined", noneOk, JSON.stringify(cat.noneSemantics && cat.noneSemantics.independentAxes));

    // 4. Family Distribution Exact Counts
    const familyCounts = {};
    for (const c of crafts) {
        familyCounts[c.family] = (familyCounts[c.family] || 0) + 1;
    }
    const familyExpected = {
        extractive: 7,
        pyrometallurgical_and_smiths: 4,
        construction_and_woodcraft: 4,
        organic_and_textiles: 5,
        sustenance_and_processing: 5,
        artisan_and_specialized: 9
    };
    let familyMatch = Object.keys(familyExpected).every(f => familyCounts[f] === familyExpected[f]) &&
        Object.keys(familyCounts).every(f => Object.prototype.hasOwnProperty.call(familyExpected, f));
    check("family_distribution_exact", familyMatch, JSON.stringify(familyCounts));

    // 5. Three Independent Axes Preservation & Duty Decoupling
    let axesOk = true;
    let dutyOk = true;
    for (const c of crafts) {
        const indep = c.independentAxesPreservation;
        if (!indep || indep.independentOfCivicOffice !== true || indep.independentOfClass !== true || indep.dutyDecoupled !== true) {
            axesOk = false;
        }
        if (c.civicOffice || c.class || c.currentDuty || c.duty) {
            dutyOk = false;
        }
    }
    check("three_axes_independent", axesOk && dutyOk, "all crafts assert axis independence and contain no office/class/duty couplings");

    const dutyRule = cat.callingResolutionRules && cat.callingResolutionRules.dutyIsolationRule;
    const dutyIsolated = typeof dutyRule === "string" &&
        dutyRule.length > 0 &&
        /under no circumstance|never|must not|cannot|does not|prohibits/i.test(dutyRule) &&
        /overwrite|derive|substitute/i.test(dutyRule);
    check("duty_scheduler_isolated", dutyIsolated, "calling resolution rules explicitly isolate duty from craft identity with strict negative assertion");

    // 6. 4-Tier Progression Monotonic Invariants
    const expectedTiers = ["APPRENTICE", "JOURNEYMAN", "ARTISAN", "MASTER"];
    const expectedQuality = ["STANDARD", "STANDARD", "FINE", "MASTERWORK"];
    let tierCountOk = true;
    let ranksMonotone = true;
    let efficiencyMonotone = true;
    let qualityStepped = true;
    let downtimeMonotone = true;

    for (const c of crafts) {
        if (!Array.isArray(c.progression) || c.progression.length !== 4) {
            tierCountOk = false;
            continue;
        }
        for (let i = 0; i < 4; i++) {
            const p = c.progression[i];
            if (p.rank !== i + 1 || p.tier !== expectedTiers[i]) ranksMonotone = false;
            if (p.qualityTierAccess !== expectedQuality[i]) qualityStepped = false;
            if (i > 0) {
                if (p.efficiencyMultiplier <= c.progression[i - 1].efficiencyMultiplier) efficiencyMonotone = false;
                if (p.downtimeTrainingDays < c.progression[i - 1].downtimeTrainingDays) downtimeMonotone = false;
            }
        }
    }
    check("progression_four_tiers_per_craft", tierCountOk, "every craft defines exactly 4 tiers");
    check("progression_ranks_monotone", ranksMonotone, "ranks are 1, 2, 3, 4 strictly monotone");
    check("progression_efficiency_monotone", efficiencyMonotone, "efficiency multipliers strictly increasing");
    check("progression_quality_access_stepped", qualityStepped, "quality access conforms to DEUS standard: STANDARD -> STANDARD -> FINE -> MASTERWORK");
    check("progression_downtime_days_monotone", downtimeMonotone, "training days non-decreasing across tiers");

    // 7. DEUS Production Chain & Resource Registry Alignment
    const validResClasses = new Set(Object.keys(resReg.coreResourceClasses || {}));
    const validObjects = new Set((worldCat.objects || []).map(o => o.id));
    const validRecipes = new Set(((worldCat.recipes && worldCat.recipes.list) || []).map(r => r.id));
    const validLabors = new Set(((worldCat.labors && worldCat.labors.list) || []).map(l => l.id));
    const validItems = new Set(((worldCat.items && worldCat.items.types) || []).map(i => i.id));

    let resOk = true;
    let wsOk = true;
    let recipesOk = true;
    let laborsOk = true;
    let itemsOk = true;

    for (const c of crafts) {
        for (const rc of c.primaryResourceClasses) {
            if (!validResClasses.has(rc)) resOk = false;
        }
        for (const ws of c.primaryWorkstations) {
            if (!validObjects.has(ws)) wsOk = false;
        }
        for (const r of c.productionChain.associatedRecipes) {
            if (!validRecipes.has(r)) recipesOk = false;
        }
        for (const l of c.productionChain.associatedLabors) {
            if (!validLabors.has(l)) laborsOk = false;
        }
        for (const inp of c.productionChain.inputs) {
            if (!validItems.has(inp)) itemsOk = false;
        }
        for (const out of c.productionChain.outputs) {
            if (!validItems.has(out)) itemsOk = false;
        }
    }
    check("production_resource_classes_valid", resOk, "all resource classes exist in DEUS_ResourceRegistry");
    check("production_workstations_valid", wsOk, "all workstations exist in DEUS_WorldCatalog objects");
    check("production_recipes_valid", recipesOk, "all recipes exist in DEUS_WorldCatalog recipes.list");
    check("production_labors_valid", laborsOk, "all labors exist in DEUS_WorldCatalog labors.list");
    check("production_items_valid", itemsOk, "all inputs and outputs exist in DEUS_WorldCatalog items.types");

    // 8. Production Recipes Exact Reconciliation
    let recipesReconciled = true;
    let reconciliationReason = "";
    const recipesById = new Map(((worldCat.recipes && worldCat.recipes.list) || []).map(r => [r.id, r]));

    for (const c of crafts) {
        const cited = c.productionChain.associatedRecipes;
        if (cited.length > 0) {
            const expectedInputs = new Set();
            const expectedOutputs = new Set();
            const expectedLabors = new Set();
            const requiredStations = new Set();

            for (const rId of cited) {
                const r = recipesById.get(rId);
                if (!r) {
                    recipesReconciled = false;
                    reconciliationReason = `${c.id} cites non-existent recipe ${rId}`;
                    break;
                }
                for (const inp of Object.keys(r.inputs || {})) expectedInputs.add(inp);
                for (const out of Object.keys(r.outputs || {})) expectedOutputs.add(out);
                if (r.labor) expectedLabors.add(r.labor);
                if (r.at) requiredStations.add(r.at);
            }

            const actualInputs = new Set(c.productionChain.inputs);
            const actualOutputs = new Set(c.productionChain.outputs);
            const actualLabors = new Set(c.productionChain.associatedLabors);

            for (const inp of expectedInputs) {
                if (!actualInputs.has(inp)) {
                    recipesReconciled = false;
                    reconciliationReason = `${c.id} missing recipe input ${inp}`;
                }
            }
            for (const inp of actualInputs) {
                if (!expectedInputs.has(inp)) {
                    recipesReconciled = false;
                    reconciliationReason = `${c.id} has extra input ${inp} not in cited recipes`;
                }
            }
            for (const out of expectedOutputs) {
                if (!actualOutputs.has(out)) {
                    recipesReconciled = false;
                    reconciliationReason = `${c.id} missing recipe output ${out}`;
                }
            }
            for (const out of actualOutputs) {
                if (!expectedOutputs.has(out)) {
                    recipesReconciled = false;
                    reconciliationReason = `${c.id} has extra output ${out} not in cited recipes`;
                }
            }
            for (const lab of expectedLabors) {
                if (!actualLabors.has(lab)) {
                    recipesReconciled = false;
                    reconciliationReason = `${c.id} missing required recipe labor ${lab}`;
                }
            }
            for (const st of requiredStations) {
                const matches = c.primaryWorkstations.some(wsId => {
                    if (wsId === st) return true;
                    const obj = (worldCat.objects || []).find(o => o.id === wsId);
                    return obj && (obj.tags || []).includes(st);
                });
                if (!matches) {
                    recipesReconciled = false;
                    reconciliationReason = `${c.id} workstations ${c.primaryWorkstations.join(",")} do not satisfy recipe station ${st}`;
                }
            }
        } else {
            if (c.productionChain.associatedLabors.length > 0) {
                recipesReconciled = false;
                reconciliationReason = `${c.id} has labors without recipes`;
            }
            if (c.productionChain.inputs.length > 0) {
                recipesReconciled = false;
                reconciliationReason = `${c.id} has inputs without recipes`;
            }
            if (c.productionChain.outputs.length > 0) {
                recipesReconciled = false;
                reconciliationReason = `${c.id} has outputs without recipes`;
            }
        }
    }
    check("production_recipes_reconciled", recipesReconciled,
        recipesReconciled ? "all cited recipes reconciled with inputs, outputs, stations, and labors; empty rows claim zero outputs" : reconciliationReason);

    // 9. 2014 SRD 5.1 Tool Integration & Rules Grounding
    const srdEntries = Array.isArray(srdEquipment.entries) ? srdEquipment.entries : (Array.isArray(srdEquipment) ? srdEquipment : []);
    const validSrdTools = new Set(srdEntries.filter(e => e.kind === "tool").map(e => e.id));
    const srdRuleEntries = Array.isArray(srdRules.entries) ? srdRules.entries : (Array.isArray(srdRules) ? srdRules : []);
    const validSrdRules = new Set(srdRuleEntries.map(r => r.id));

    let srdToolsOk = true;
    let srdRulesOk = true;
    let srdRateOk = true;
    for (const c of crafts) {
        const tp = c.srd51Reference.toolProficiency;
        if (tp !== null && !validSrdTools.has(tp)) srdToolsOk = false;
        const da = c.srd51Reference.downtimeActivity;
        if (!validSrdRules.has(da)) srdRulesOk = false;
        if (!c.srd51Reference.craftingRate.includes("5 gp market value per 8-hour day")) srdRateOk = false;
        if (!c.srd51Reference.craftingRate.includes("88-89")) srdRateOk = false;
    }
    check("srd51_tools_grounded", srdToolsOk, "all non-null toolProficiencies exist in srd51/equipment.json");
    check("srd51_rules_grounded", srdRulesOk, "all downtimeActivity rule IDs exist in srd51/rules.json");
    check("srd51_crafting_rate_standard", srdRateOk, "every craft cites 5 gp market value per 8-hour day rate and pp. 88-89");

    // 10. Calling Mappings Consistency (Bidirectional Closure)
    let callingMapOk = true;
    let callingReason = "";
    const catCallingMap = {};
    for (const c of crafts) {
        for (const cal of c.callingMappings) {
            catCallingMap[cal] = c.id;
        }
    }
    for (const [cal, cr] of Object.entries(Identity.CALLING_CRAFT)) {
        if (catCallingMap[cal] !== cr) {
            callingMapOk = false;
            callingReason = `Identity.CALLING_CRAFT[${cal}] = ${cr}, but catalogue has ${catCallingMap[cal]}`;
        }
    }
    for (const cal of Object.keys(catCallingMap)) {
        if (!Object.prototype.hasOwnProperty.call(Identity.CALLING_CRAFT, cal)) {
            callingMapOk = false;
            callingReason = `Catalogue defines extra calling ${cal} -> ${catCallingMap[cal]} not in Identity.CALLING_CRAFT`;
        }
    }
    check("calling_mappings_consistent", callingMapOk, callingMapOk ? "callingMappings match Identity.CALLING_CRAFT exactly without extra callings" : callingReason);

    // 11. Faction Development Plan Knowledge Closure (Two-Way)
    const planCraftNodes = new Map();
    (templatePlan.knowledge || []).filter(k => k.kind === "craft").forEach(k => {
        (k.unlocks || []).filter(u => u.kind === "craft").forEach(u => {
            planCraftNodes.set(u.id, k.id);
        });
    });
    let planClosureOk = planCraftNodes.size === 34;
    for (const c of crafts) {
        if (planCraftNodes.get(c.id) !== c.knowledgeNode) planClosureOk = false;
    }
    check("faction_knowledge_closure", planClosureOk, "two-way closure between craft catalogue and TEMPLATE.plan.json craft nodes");

    return checks;
}

// --- Rule 4: Targeted Failing Fixtures & Provocations (Mutants) ---

const MUTANTS = [
    {
        name: "mutant_drop_craft",
        kills: ["catalogue_has_34_crafts", "craft_ids_match_canonical_set"],
        mutate: cat => {
            cat.crafts = cat.crafts.filter(c => c.id !== "FARMER");
        }
    },
    {
        name: "mutant_duplicate_craft",
        kills: ["craft_ids_match_canonical_set"],
        mutate: cat => {
            const cook = cat.crafts.find(c => c.id === "COOK");
            if (cook) cook.id = "BLACKSMITH";
        }
    },
    {
        name: "mutant_alien_craft",
        kills: ["craft_ids_match_canonical_set", "schema_validates"],
        mutate: cat => {
            const miner = cat.crafts.find(c => c.id === "MINER");
            if (miner) miner.id = "PSION";
        }
    },
    {
        name: "mutant_corrupt_none_semantics",
        kills: ["none_semantics_explicitly_defined", "schema_validates"],
        mutate: cat => {
            cat.noneSemantics.token = "UNKNOWN";
        }
    },
    {
        name: "mutant_family_distribution",
        kills: ["family_distribution_exact"],
        mutate: cat => {
            const forager = cat.crafts.find(c => c.id === "FORAGER");
            if (forager) forager.family = "artisan_and_specialized";
        }
    },
    {
        name: "mutant_couple_office",
        kills: ["three_axes_independent", "schema_validates"],
        mutate: cat => {
            const smith = cat.crafts.find(c => c.id === "BLACKSMITH");
            if (smith) {
                smith.independentAxesPreservation.independentOfCivicOffice = false;
                smith.civicOffice = "MARSHAL";
            }
        }
    },
    {
        name: "mutant_couple_class",
        kills: ["three_axes_independent", "schema_validates"],
        mutate: cat => {
            const ws = cat.crafts.find(c => c.id === "WEAPONSMITH");
            if (ws) {
                ws.independentAxesPreservation.independentOfClass = false;
                ws.class = "srd:class:fighter";
            }
        }
    },
    {
        name: "mutant_duty_isolation_rewritten",
        kills: ["duty_scheduler_isolated"],
        mutate: cat => {
            cat.callingResolutionRules.dutyIsolationRule = "Duty overwrites and derives craft vocation dynamically.";
        }
    },
    {
        name: "mutant_progression_tier_count",
        kills: ["progression_four_tiers_per_craft", "schema_validates"],
        mutate: cat => {
            const carp = cat.crafts.find(c => c.id === "CARPENTER");
            if (carp) carp.progression.pop();
        }
    },
    {
        name: "mutant_progression_rank_order",
        kills: ["progression_ranks_monotone"],
        mutate: cat => {
            const mason = cat.crafts.find(c => c.id === "MASON");
            if (mason) mason.progression[3].rank = 2;
        }
    },
    {
        name: "mutant_progression_efficiency_inverted",
        kills: ["progression_efficiency_monotone"],
        mutate: cat => {
            const alch = cat.crafts.find(c => c.id === "ALCHEMIST");
            if (alch) alch.progression[3].efficiencyMultiplier = 0.5;
        }
    },
    {
        name: "mutant_progression_quality_degraded",
        kills: ["progression_quality_access_stepped"],
        mutate: cat => {
            const arm = cat.crafts.find(c => c.id === "ARMORER");
            if (arm) arm.progression[3].qualityTierAccess = "CRUDE";
        }
    },
    {
        name: "mutant_progression_downtime_inverted",
        kills: ["progression_downtime_days_monotone"],
        mutate: cat => {
            const smith = cat.crafts.find(c => c.id === "BLACKSMITH");
            if (smith) smith.progression[3].downtimeTrainingDays = 10;
        }
    },
    {
        name: "mutant_invalid_workstation",
        kills: ["production_workstations_valid"],
        mutate: cat => {
            const pot = cat.crafts.find(c => c.id === "POTTER");
            if (pot) pot.primaryWorkstations.push("magical_transmuter");
        }
    },
    {
        name: "mutant_invalid_resource_class",
        kills: ["production_resource_classes_valid"],
        mutate: cat => {
            const min = cat.crafts.find(c => c.id === "MINER");
            if (min) min.primaryResourceClasses.push("UNOBTANIUM");
        }
    },
    {
        name: "mutant_invalid_recipe",
        kills: ["production_recipes_valid", "production_recipes_reconciled"],
        mutate: cat => {
            const ws = cat.crafts.find(c => c.id === "WEAPONSMITH");
            if (ws) ws.productionChain.associatedRecipes.push("summon_demon_blade");
        }
    },
    {
        name: "mutant_invalid_labor",
        kills: ["production_labors_valid", "production_recipes_reconciled"],
        mutate: cat => {
            const sm = cat.crafts.find(c => c.id === "SMELTER");
            if (sm) sm.productionChain.associatedLabors.push("invalid_rogue_labor");
        }
    },
    {
        name: "mutant_invalid_input_item",
        kills: ["production_items_valid", "production_recipes_reconciled"],
        mutate: cat => {
            const ws = cat.crafts.find(c => c.id === "WEAPONSMITH");
            if (ws) ws.productionChain.inputs.push("mithril_dust");
        }
    },
    {
        name: "mutant_recipe_reconciliation_mismatch",
        kills: ["production_recipes_reconciled"],
        mutate: cat => {
            const arm = cat.crafts.find(c => c.id === "ARMORER");
            if (arm) arm.productionChain.outputs.push("sword_long");
        }
    },
    {
        name: "mutant_invalid_srd_tool",
        kills: ["srd51_tools_grounded"],
        mutate: cat => {
            const smith = cat.crafts.find(c => c.id === "BLACKSMITH");
            if (smith) smith.srd51Reference.toolProficiency = "srd:tool:laser-cutter";
        }
    },
    {
        name: "mutant_invalid_srd_rule_id",
        kills: ["srd51_rules_grounded"],
        mutate: cat => {
            const cook = cat.crafts.find(c => c.id === "COOK");
            if (cook) cook.srd51Reference.downtimeActivity = "srd:rule:does-not-exist";
        }
    },
    {
        name: "mutant_invalid_crafting_rate",
        kills: ["srd51_crafting_rate_standard"],
        mutate: cat => {
            const carp = cat.crafts.find(c => c.id === "CARPENTER");
            if (carp) carp.srd51Reference.craftingRate = "10 gp market value per 8-hour day";
        }
    },
    {
        name: "mutant_calling_map_mismatch",
        kills: ["calling_mappings_consistent"],
        mutate: cat => {
            const carp = cat.crafts.find(c => c.id === "CARPENTER");
            if (carp) carp.callingMappings.push("blacksmith");
        }
    },
    {
        name: "mutant_extra_calling",
        kills: ["calling_mappings_consistent"],
        mutate: cat => {
            const farmer = cat.crafts.find(c => c.id === "FARMER");
            if (farmer) farmer.callingMappings.push("shepherd");
        }
    },
    {
        name: "mutant_knowledge_node_mismatch",
        kills: ["faction_knowledge_closure"],
        mutate: cat => {
            const log = cat.crafts.find(c => c.id === "LOGGER");
            if (log) log.knowledgeNode = "craft.fine";
        }
    },
    {
        name: "mutant_schema_extra_property",
        kills: ["schema_validates"],
        mutate: cat => {
            cat.unexpectedRogueProperty = "malformed_injection";
        }
    }
];

function runMutants(baseChecks) {
    const problems = [];
    const lines = [];

    for (const m of MUTANTS) {
        try {
            const mutated = clone(catalogue);
            m.mutate(mutated);
            const checks = runCatalogueChecks(mutated, schema);
            const byName = new Map(checks.map(c => [c.name, c]));
            const killed = m.kills.filter(k => byName.has(k) && !byName.get(k).pass);
            const controlFailed = m.kills.filter(k => !baseChecks.some(c => c.name === k && c.pass));
            const ok = controlFailed.length === 0 && killed.length > 0;
            lines.push(`  [${ok ? "PASS" : "FAIL"}] mutant ${m.name} killed by ${killed.join(", ") || "none"}`);
            if (!ok) problems.push(`mutant ${m.name} ${controlFailed.length ? "control failed: " + controlFailed.join(", ") : "survived"}`);
        } catch (e) {
            lines.push(`  [FAIL] mutant ${m.name} threw: ${e.message}`);
            problems.push(`mutant ${m.name} threw: ${e.message}`);
        }
    }
    return { problems, lines };
}

function main() {
    console.log("=== DEUS MASTER CRAFT CATALOGUE (SOC.12.01) ===");
    const problems = [];
    const t0 = performance.now();

    console.log("\n--- Section 1: Baseline Catalogue & Schema Checks ---");
    const baseChecks = runCatalogueChecks(catalogue, schema);
    for (const c of baseChecks) {
        console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name}: ${c.msg}`);
        if (!c.pass) problems.push(`FAIL ${c.name}`);
    }

    console.log("\n--- Section 2: Rule 4 Targeted Failing Fixtures (Mutants) ---");
    const mutants = runMutants(baseChecks);
    for (const line of mutants.lines) console.log(line);
    for (const p of mutants.problems) problems.push(p);

    const ms = (performance.now() - t0).toFixed(1);
    console.log(`\n==================================================`);
    if (problems.length) {
        console.error("CRAFT CATALOGUE TEST SUITE FAILED:");
        for (const p of problems) console.error("  " + p);
        console.log("==================================================");
        process.exit(1);
    }
    console.log(`CRAFT CATALOGUE PASSED: ${baseChecks.length} baseline checks, ${MUTANTS.length} mutants killed (${ms} ms).`);
    console.log("==================================================");
}

main();
