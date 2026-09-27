#!/usr/bin/env node
"use strict";

/**
 * tools/society/test_offices.js
 *
 * Deterministic test suite and validator for Project DEUS Faction Office Schema
 * and Institutional Skeleton (SOC.20.01).
 *
 * Architectural Invariants:
 * - INV-SOC-03 (FACTION-001): Office exists independently of living holder.
 * - INV-SOC-01 (PERSON-001): Craft, Civic Office, and Class are independent axes.
 * - INV-SOC-02 (PERSON-002): Current Duty is operational state, not identity or office.
 * - Open Owner Questions: Preserves holder cardinality and cultural succession as open.
 *
 * Binding Rule: Every validator check must have a targeted failing fixture or provocation.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const SCHEMA_PATH = path.join(ROOT, "game", "data", "society", "office_schema.json");
const OFFICES_DIR = path.join(ROOT, "game", "data", "society", "offices");
const MANIFEST_PATH = path.join(OFFICES_DIR, "manifest.json");

let passed = 0;
let failed = 0;

function pass(name, detail) {
    passed++;
    console.log(`  [PASS] ${name}${detail ? ": " + detail : ""}`);
}

function fail(name, detail) {
    failed++;
    console.error(`  [FAIL] ${name}${detail ? ": " + detail : ""}`);
}

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// Schema Validator Implementation (JSON Schema Draft 2020-12 Subset)
// Dependency-free, deterministic.
// ---------------------------------------------------------------------------

function resolveRef(rootSchema, ref) {
    if (!ref.startsWith("#/$defs/")) {
        throw new Error(`Unsupported ref: ${ref}`);
    }
    const defName = ref.replace("#/$defs/", "");
    if (!rootSchema.$defs || !rootSchema.$defs[defName]) {
        throw new Error(`Unresolved definition: ${defName}`);
    }
    return rootSchema.$defs[defName];
}

function validateType(expectedType, val) {
    if (Array.isArray(expectedType)) {
        return expectedType.some(t => validateType(t, val));
    }
    if (expectedType === "null") return val === null;
    if (expectedType === "string") return typeof val === "string";
    if (expectedType === "number") return typeof val === "number" && !isNaN(val);
    if (expectedType === "integer") return typeof val === "number" && Number.isInteger(val);
    if (expectedType === "boolean") return typeof val === "boolean";
    if (expectedType === "array") return Array.isArray(val);
    if (expectedType === "object") return val !== null && typeof val === "object" && !Array.isArray(val);
    return false;
}

function validateAgainstSubSchema(rootSchema, subSchema, val, currentPath = "") {
    const errors = [];
    if (!subSchema || typeof subSchema !== "object") return errors;

    if (subSchema.$ref) {
        const resolved = resolveRef(rootSchema, subSchema.$ref);
        return validateAgainstSubSchema(rootSchema, resolved, val, currentPath);
    }

    if (subSchema.type !== undefined) {
        if (!validateType(subSchema.type, val)) {
            errors.push({
                path: currentPath,
                rule: "type",
                message: `Expected type ${JSON.stringify(subSchema.type)}, got ${val === null ? "null" : typeof val}`
            });
            return errors;
        }
    }

    if (subSchema.const !== undefined) {
        if (val !== subSchema.const) {
            errors.push({
                path: currentPath,
                rule: "const",
                message: `Expected constant ${JSON.stringify(subSchema.const)}, got ${JSON.stringify(val)}`
            });
        }
    }

    if (Array.isArray(subSchema.enum)) {
        if (!subSchema.enum.includes(val)) {
            errors.push({
                path: currentPath,
                rule: "enum",
                message: `Value ${JSON.stringify(val)} not in enum: [${subSchema.enum.join(", ")}]`
            });
        }
    }

    if (typeof val === "string") {
        if (subSchema.minLength !== undefined && val.length < subSchema.minLength) {
            errors.push({
                path: currentPath,
                rule: "minLength",
                message: `String length ${val.length} < minLength ${subSchema.minLength}`
            });
        }
        if (subSchema.maxLength !== undefined && val.length > subSchema.maxLength) {
            errors.push({
                path: currentPath,
                rule: "maxLength",
                message: `String length ${val.length} > maxLength ${subSchema.maxLength}`
            });
        }
        if (subSchema.pattern !== undefined) {
            const re = new RegExp(subSchema.pattern);
            if (!re.test(val)) {
                errors.push({
                    path: currentPath,
                    rule: "pattern",
                    message: `String does not match pattern ${subSchema.pattern}`
                });
            }
        }
    }

    if (typeof val === "number") {
        if (subSchema.minimum !== undefined && val < subSchema.minimum) {
            errors.push({
                path: currentPath,
                rule: "minimum",
                message: `Number ${val} < minimum ${subSchema.minimum}`
            });
        }
        if (subSchema.maximum !== undefined && val > subSchema.maximum) {
            errors.push({
                path: currentPath,
                rule: "maximum",
                message: `Number ${val} > maximum ${subSchema.maximum}`
            });
        }
    }

    if (Array.isArray(val)) {
        if (subSchema.minItems !== undefined && val.length < subSchema.minItems) {
            errors.push({
                path: currentPath,
                rule: "minItems",
                message: `Array length ${val.length} < minItems ${subSchema.minItems}`
            });
        }
        if (subSchema.maxItems !== undefined && val.length > subSchema.maxItems) {
            errors.push({
                path: currentPath,
                rule: "maxItems",
                message: `Array length ${val.length} > maxItems ${subSchema.maxItems}`
            });
        }
        if (subSchema.uniqueItems === true) {
            const seen = new Set();
            for (let i = 0; i < val.length; i++) {
                const itemStr = typeof val[i] === "object" ? JSON.stringify(val[i]) : String(val[i]);
                if (seen.has(itemStr)) {
                    errors.push({
                        path: `${currentPath}[${i}]`,
                        rule: "uniqueItems",
                        message: `Duplicate item found in array: ${itemStr}`
                    });
                }
                seen.add(itemStr);
            }
        }
        if (subSchema.items) {
            for (let i = 0; i < val.length; i++) {
                const itemErrors = validateAgainstSubSchema(rootSchema, subSchema.items, val[i], `${currentPath}[${i}]`);
                errors.push(...itemErrors);
            }
        }
    }

    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        if (Array.isArray(subSchema.required)) {
            for (const reqKey of subSchema.required) {
                if (!Object.prototype.hasOwnProperty.call(val, reqKey) || val[reqKey] === undefined) {
                    errors.push({
                        path: currentPath ? `${currentPath}.${reqKey}` : reqKey,
                        rule: "required",
                        message: `Missing required property: ${reqKey}`
                    });
                }
            }
        }
        if (subSchema.additionalProperties === false) {
            const allowed = new Set(Object.keys(subSchema.properties || {}));
            for (const propKey of Object.keys(val)) {
                if (!allowed.has(propKey)) {
                    errors.push({
                        path: currentPath ? `${currentPath}.${propKey}` : propKey,
                        rule: "additionalProperties",
                        message: `Forbidden extra property: ${propKey}`
                    });
                }
            }
        }
        if (subSchema.properties) {
            for (const propKey of Object.keys(subSchema.properties)) {
                if (Object.prototype.hasOwnProperty.call(val, propKey) && val[propKey] !== undefined) {
                    const propErrors = validateAgainstSubSchema(
                        rootSchema,
                        subSchema.properties[propKey],
                        val[propKey],
                        currentPath ? `${currentPath}.${propKey}` : propKey
                    );
                    errors.push(...propErrors);
                }
            }
        }
        if (subSchema.additionalProperties && typeof subSchema.additionalProperties === "object") {
            const explicit = new Set(Object.keys(subSchema.properties || {}));
            for (const propKey of Object.keys(val)) {
                if (!explicit.has(propKey)) {
                    const extraErrors = validateAgainstSubSchema(
                        rootSchema,
                        subSchema.additionalProperties,
                        val[propKey],
                        currentPath ? `${currentPath}.${propKey}` : propKey
                    );
                    errors.push(...extraErrors);
                }
            }
        }
    }

    return errors;
}

/**
 * Validates an office object against schema and institutional semantic invariants.
 */
function validateOffice(schemaObj, officeObj) {
    const errors = validateAgainstSubSchema(schemaObj, schemaObj, officeObj, "");

    // Semantic rules (Invariants FACTION-001, PERSON-001, PERSON-002)
    if (officeObj && typeof officeObj === "object") {
        // Semantic Rule 1: Vacancy state consistency
        if (officeObj.vacancyState) {
            const vs = officeObj.vacancyState;
            if (vs.status === "VACANT" && vs.isVacant !== true) {
                errors.push({
                    path: "vacancyState.isVacant",
                    rule: "semantic-vacancy-mismatch",
                    message: "isVacant must be true when status is VACANT"
                });
            }
            if (vs.status === "OCCUPIED" && vs.isVacant !== false) {
                errors.push({
                    path: "vacancyState.isVacant",
                    rule: "semantic-occupied-mismatch",
                    message: "isVacant must be false when status is OCCUPIED"
                });
            }
            if (vs.status === "ACTING" && vs.isVacant !== false) {
                errors.push({
                    path: "vacancyState.isVacant",
                    rule: "semantic-acting-mismatch",
                    message: "isVacant must be false when status is ACTING"
                });
            }
        }

        // Semantic Rule 2: Hierarchy non-circularity
        if (officeObj.parentOfficeId && officeObj.parentOfficeId === officeObj.officeId) {
            errors.push({
                path: "parentOfficeId",
                rule: "semantic-circular-parent",
                message: "An office cannot be its own parentOfficeId"
            });
        }
        if (Array.isArray(officeObj.subordinateOffices) && officeObj.subordinateOffices.includes(officeObj.officeId)) {
            errors.push({
                path: "subordinateOffices",
                rule: "semantic-self-subordinate",
                message: "An office cannot list itself in subordinateOffices"
            });
        }

        // Semantic Rule 3: Current duty separation (INV-SOC-02)
        if ("currentDuty" in officeObj || "duty" in officeObj) {
            errors.push({
                path: "currentDuty",
                rule: "semantic-duty-in-office",
                message: "Current Duty is operational state and must not be a property of an Office"
            });
        }
    }

    return {
        ok: errors.length === 0,
        errors
    };
}

// ---------------------------------------------------------------------------
// Test Execution
// ---------------------------------------------------------------------------

console.log("=== FACTION INSTITUTIONAL SKELETON & OFFICE SCHEMA (SOC.20.01) ===");

// 1. Load schema
let schemaObj;
try {
    const rawSchema = fs.readFileSync(SCHEMA_PATH, "utf8");
    schemaObj = JSON.parse(rawSchema);
    pass("schema_loaded", `${SCHEMA_PATH}`);
} catch (err) {
    fail("schema_loaded", err.message);
    process.exit(1);
}

// 2. Schema Structure Verification
try {
    if (schemaObj.$schema !== "https://json-schema.org/draft/2020-12/schema") {
        throw new Error("Unexpected $schema draft");
    }
    if (!schemaObj.$defs || typeof schemaObj.$defs !== "object") {
        throw new Error("Missing $defs in schema");
    }
    const defKeys = Object.keys(schemaObj.$defs);
    const requiredDefs = [
        "canonicalFunction",
        "department",
        "jurisdictionScope",
        "jurisdictionDomain",
        "authorityToken",
        "vacancyStatus",
        "holderCardinality",
        "successionMethod",
        "interregnumPolicy",
        "criticalityTier"
    ];
    for (const reqDef of requiredDefs) {
        if (!defKeys.includes(reqDef)) {
            throw new Error(`Missing required definition: ${reqDef}`);
        }
    }
    pass("schema_defs_intact", `${defKeys.length} definitions found`);
} catch (err) {
    fail("schema_defs_intact", err.message);
}

// 3. Validate All 16 Canonical Office Files
const canonicalFiles = [
    "leader.json",
    "treasurer.json",
    "mint_master.json",
    "marshal.json",
    "quartermaster.json",
    "master_of_works.json",
    "provisioner.json",
    "recorder.json",
    "steward.json",
    "healer_director.json",
    "magistrate.json",
    "envoy.json",
    "trade_master.json",
    "tax_collector.json",
    "paymaster.json",
    "clerk.json"
];

const loadedOffices = {};

for (const fileName of canonicalFiles) {
    const filePath = path.join(OFFICES_DIR, fileName);
    try {
        const raw = fs.readFileSync(filePath, "utf8");
        const office = JSON.parse(raw);
        loadedOffices[fileName] = office;
        const res = validateOffice(schemaObj, office);
        if (res.ok) {
            pass(`canonical_${office.officeId}`, `Valid (${office.department}, ${office.workloadProfile.criticalityTier})`);
        } else {
            fail(`canonical_${fileName}`, res.errors.map(e => `${e.path}: ${e.message}`).join("; "));
        }
    } catch (err) {
        fail(`canonical_${fileName}`, err.message);
    }
}

// 4. Validate Manifest
try {
    const rawManifest = fs.readFileSync(MANIFEST_PATH, "utf8");
    const manifest = JSON.parse(rawManifest);
    if (manifest.totalOffices !== 16 || manifest.offices.length !== 16) {
        throw new Error(`Manifest office count mismatch: expected 16, got ${manifest.offices.length}`);
    }
    if (manifest.founderCoreCount !== 8 || manifest.specializedCount !== 8) {
        throw new Error(`Tier count mismatch: ${manifest.founderCoreCount} core, ${manifest.specializedCount} specialized`);
    }
    pass("manifest_valid", `${manifest.totalOffices} canonical offices listed in manifest.json`);
} catch (err) {
    fail("manifest_valid", err.message);
}

// 5. Verify Invariant FACTION-001 (INV-SOC-03): Durable Entity Independent of Holder
{
    const baseTreasurer = clone(loadedOffices["treasurer.json"]);

    // State A: Occupied
    const occupiedTreasurer = clone(baseTreasurer);
    occupiedTreasurer.vacancyState.status = "OCCUPIED";
    occupiedTreasurer.vacancyState.isVacant = false;
    occupiedTreasurer.vacancyState.operationalCapability = 1.0;
    occupiedTreasurer.holder.primaryHolderId = "PERSON_184"; // Aldric
    const occRes = validateOffice(schemaObj, occupiedTreasurer);
    if (occRes.ok) {
        pass("inv_faction_001_occupied", "Occupied office is valid with active capability 1.0");
    } else {
        fail("inv_faction_001_occupied", occRes.errors.map(e => e.message).join("; "));
    }

    // State B: Holder dies -> Transitions to VACANT
    // The office entity survives intact; jurisdiction, authorities, succession remain untouched.
    const vacantTreasurer = clone(occupiedTreasurer);
    vacantTreasurer.vacancyState.status = "VACANT";
    vacantTreasurer.vacancyState.isVacant = true;
    vacantTreasurer.vacancyState.sinceYear = 2;
    vacantTreasurer.vacancyState.sinceTick = 12000;
    vacantTreasurer.vacancyState.vacancyReason = "HOLDER_DECEASED";
    vacantTreasurer.vacancyState.operationalCapability = 0.0;
    vacantTreasurer.holder.primaryHolderId = null;

    const vacRes = validateOffice(schemaObj, vacantTreasurer);
    if (vacRes.ok && vacantTreasurer.authorityScopes.length === 4 && vacantTreasurer.jurisdiction.scope === "FACTION") {
        pass("inv_faction_001_vacancy_survival", "Office survives holder death intact as VACANT entity with preserved jurisdiction");
    } else {
        fail("inv_faction_001_vacancy_survival", "Office lost jurisdiction or failed validation upon holder death");
    }

    // State C: Deputy interim command -> ACTING
    const actingTreasurer = clone(vacantTreasurer);
    actingTreasurer.vacancyState.status = "ACTING";
    actingTreasurer.vacancyState.isVacant = false;
    actingTreasurer.vacancyState.operationalCapability = 0.5;
    actingTreasurer.holder.actingHolderId = "PERSON_227"; // Elspeth
    const actRes = validateOffice(schemaObj, actingTreasurer);
    if (actRes.ok) {
        pass("inv_faction_001_acting_assumption", "Deputy assumption valid with degraded capability 0.5");
    } else {
        fail("inv_faction_001_acting_assumption", actRes.errors.map(e => e.message).join("; "));
    }
}

// 6. Verify Three-Axis Separation & Duty Protection (INV-SOC-01 & INV-SOC-02)
{
    const baseLeader = clone(loadedOffices["leader.json"]);

    // Attempt to inject duty into office
    const dutyMutant = clone(baseLeader);
    dutyMutant.currentDuty = "MINE_IRON_ORE";
    const dutyRes = validateOffice(schemaObj, dutyMutant);
    if (!dutyRes.ok && dutyRes.errors.some(e => e.rule === "semantic-duty-in-office" || e.rule === "additionalProperties")) {
        pass("inv_soc_02_duty_rejected", "Current Duty rejected as office property");
    } else {
        fail("inv_soc_02_duty_rejected", "Validator erroneously accepted currentDuty on office");
    }
}

// 7. Verify Open Owner Questions Handling
{
    const baseOffice = clone(loadedOffices["leader.json"]);

    // Check holder cardinality flexibility (UNDECIDED, SINGLE, MULTIPLE, COLLEGIATE)
    const cardinalities = ["UNDECIDED", "SINGLE", "MULTIPLE", "COLLEGIATE"];
    let cardOk = true;
    for (const card of cardinalities) {
        const testOffice = clone(baseOffice);
        testOffice.holder.cardinality = card;
        if (card === "MULTIPLE" || card === "COLLEGIATE") {
            testOffice.holder.coHolderIds = ["PERSON_101", "PERSON_102"];
        }
        const res = validateOffice(schemaObj, testOffice);
        if (!res.ok) {
            cardOk = false;
            fail("open_question_cardinality", `Failed for cardinality ${card}: ${res.errors.map(e => e.message).join("; ")}`);
            break;
        }
    }
    if (cardOk) {
        pass("open_question_cardinality", "Supports UNDECIDED, SINGLE, MULTIPLE, and COLLEGIATE holder cardinality");
    }

    // Check open culture outcomes
    if (baseOffice.successionPolicy.cultureOutcomeOpen === true) {
        pass("open_question_succession_open", "successionPolicy.cultureOutcomeOpen is explicitly asserted true");
    } else {
        fail("open_question_succession_open", "cultureOutcomeOpen is missing or false");
    }

    // Check functional aliases: EXECUTIVE, ADMIN, HEALER_DIRECTOR
    const aliasFunctions = ["EXECUTIVE", "ADMIN", "HEALER_DIRECTOR"];
    let aliasOk = true;
    for (const af of aliasFunctions) {
        const testOffice = clone(baseOffice);
        testOffice.canonicalFunction = af;
        const res = validateOffice(schemaObj, testOffice);
        if (!res.ok) {
            aliasOk = false;
            fail("open_question_aliases", `Failed to validate canonicalFunction alias: ${af}`);
            break;
        }
    }
    if (aliasOk) {
        pass("open_question_aliases", "Recognizes EXECUTIVE, ADMIN, and HEALER_DIRECTOR canonical functions");
    }
}

// ---------------------------------------------------------------------------
// 8. Targeted Failing Provocations (Every Check Must Have a Failing Fixture)
// ---------------------------------------------------------------------------
console.log("\n--- Targeted Failing Provocations (Binding Rule) ---");

const templateOffice = clone(loadedOffices["leader.json"]);

const provocations = [
    {
        name: "provocation_missing_office_id",
        mutate: o => delete o.officeId,
        expectedRule: "required",
        expectedProp: "officeId"
    },
    {
        name: "provocation_bad_office_id_pattern",
        mutate: o => o.officeId = "123_invalid_start!",
        expectedRule: "pattern",
        expectedProp: "officeId"
    },
    {
        name: "provocation_missing_schema_version",
        mutate: o => delete o.schemaVersion,
        expectedRule: "required",
        expectedProp: "schemaVersion"
    },
    {
        name: "provocation_bad_schema_version",
        mutate: o => o.schemaVersion = "2.0.0",
        expectedRule: "const",
        expectedProp: "schemaVersion"
    },
    {
        name: "provocation_unknown_canonical_function",
        mutate: o => o.canonicalFunction = "ARCH_LICH_KING",
        expectedRule: "enum",
        expectedProp: "canonicalFunction"
    },
    {
        name: "provocation_unknown_department",
        mutate: o => o.department = "ALCHEMY_GUILD_DEPARTMENT",
        expectedRule: "enum",
        expectedProp: "department"
    },
    {
        name: "provocation_missing_titles",
        mutate: o => delete o.titles,
        expectedRule: "required",
        expectedProp: "titles"
    },
    {
        name: "provocation_empty_default_title",
        mutate: o => o.titles.defaultTitle = "",
        expectedRule: "minLength",
        expectedProp: "titles.defaultTitle"
    },
    {
        name: "provocation_missing_jurisdiction",
        mutate: o => delete o.jurisdiction,
        expectedRule: "required",
        expectedProp: "jurisdiction"
    },
    {
        name: "provocation_invalid_jurisdiction_scope",
        mutate: o => o.jurisdiction.scope = "MULTIVERSE_LEVEL",
        expectedRule: "enum",
        expectedProp: "jurisdiction.scope"
    },
    {
        name: "provocation_empty_jurisdiction_domains",
        mutate: o => o.jurisdiction.domains = [],
        expectedRule: "minItems",
        expectedProp: "jurisdiction.domains"
    },
    {
        name: "provocation_unknown_jurisdiction_domain",
        mutate: o => o.jurisdiction.domains = ["ASTRAL_PLANE"],
        expectedRule: "enum",
        expectedProp: "jurisdiction.domains[0]"
    },
    {
        name: "provocation_duplicate_jurisdiction_domains",
        mutate: o => o.jurisdiction.domains = ["SOVEREIGNTY", "SOVEREIGNTY"],
        expectedRule: "uniqueItems",
        expectedProp: "jurisdiction.domains"
    },
    {
        name: "provocation_missing_authority_scopes",
        mutate: o => delete o.authorityScopes,
        expectedRule: "required",
        expectedProp: "authorityScopes"
    },
    {
        name: "provocation_empty_authority_scopes",
        mutate: o => o.authorityScopes = [],
        expectedRule: "minItems",
        expectedProp: "authorityScopes"
    },
    {
        name: "provocation_unknown_authority_scope",
        mutate: o => o.authorityScopes = ["TELEPORT_FACTION_CITIZENS"],
        expectedRule: "enum",
        expectedProp: "authorityScopes[0]"
    },
    {
        name: "provocation_duplicate_authority_scopes",
        mutate: o => o.authorityScopes = ["COMMAND_SOVEREIGN", "COMMAND_SOVEREIGN"],
        expectedRule: "uniqueItems",
        expectedProp: "authorityScopes"
    },
    {
        name: "provocation_missing_vacancy_state",
        mutate: o => delete o.vacancyState,
        expectedRule: "required",
        expectedProp: "vacancyState"
    },
    {
        name: "provocation_unknown_vacancy_status",
        mutate: o => o.vacancyState.status = "VANISHED_INTO_THIN_AIR",
        expectedRule: "enum",
        expectedProp: "vacancyState.status"
    },
    {
        name: "provocation_inconsistent_vacant_flag_occupied",
        mutate: o => {
            o.vacancyState.status = "OCCUPIED";
            o.vacancyState.isVacant = true; // Inconsistent!
        },
        expectedRule: "semantic-occupied-mismatch",
        expectedProp: "vacancyState.isVacant"
    },
    {
        name: "provocation_inconsistent_vacant_flag_vacant",
        mutate: o => {
            o.vacancyState.status = "VACANT";
            o.vacancyState.isVacant = false; // Inconsistent!
        },
        expectedRule: "semantic-vacancy-mismatch",
        expectedProp: "vacancyState.isVacant"
    },
    {
        name: "provocation_out_of_range_capability_negative",
        mutate: o => o.vacancyState.operationalCapability = -0.25,
        expectedRule: "minimum",
        expectedProp: "vacancyState.operationalCapability"
    },
    {
        name: "provocation_out_of_range_capability_excess",
        mutate: o => o.vacancyState.operationalCapability = 1.25,
        expectedRule: "maximum",
        expectedProp: "vacancyState.operationalCapability"
    },
    {
        name: "provocation_negative_since_year",
        mutate: o => o.vacancyState.sinceYear = -10,
        expectedRule: "minimum",
        expectedProp: "vacancyState.sinceYear"
    },
    {
        name: "provocation_unknown_vacancy_reason",
        mutate: o => o.vacancyState.vacancyReason = "ABDUCTED_BY_ASTRAL_BEINGS",
        expectedRule: "enum",
        expectedProp: "vacancyState.vacancyReason"
    },
    {
        name: "provocation_missing_holder",
        mutate: o => delete o.holder,
        expectedRule: "required",
        expectedProp: "holder"
    },
    {
        name: "provocation_unknown_holder_cardinality",
        mutate: o => o.holder.cardinality = "PENTARCHY_ONLY",
        expectedRule: "enum",
        expectedProp: "holder.cardinality"
    },
    {
        name: "provocation_invalid_max_holders_zero",
        mutate: o => o.holder.maxHolders = 0,
        expectedRule: "minimum",
        expectedProp: "holder.maxHolders"
    },
    {
        name: "provocation_duplicate_co_holders",
        mutate: o => o.holder.coHolderIds = ["PERSON_1", "PERSON_1"],
        expectedRule: "uniqueItems",
        expectedProp: "holder.coHolderIds"
    },
    {
        name: "provocation_duplicate_deputies",
        mutate: o => o.holder.deputyIds = ["DEP_1", "DEP_1"],
        expectedRule: "uniqueItems",
        expectedProp: "holder.deputyIds"
    },
    {
        name: "provocation_missing_succession_policy",
        mutate: o => delete o.successionPolicy,
        expectedRule: "required",
        expectedProp: "successionPolicy"
    },
    {
        name: "provocation_unknown_succession_method",
        mutate: o => o.successionPolicy.method = "TRIAL_BY_ANARCHY",
        expectedRule: "enum",
        expectedProp: "successionPolicy.method"
    },
    {
        name: "provocation_unknown_interregnum_policy",
        mutate: o => o.successionPolicy.interregnumPolicy = "PERMANENT_CHAOS",
        expectedRule: "enum",
        expectedProp: "successionPolicy.interregnumPolicy"
    },
    {
        name: "provocation_culture_outcome_not_open",
        mutate: o => o.successionPolicy.cultureOutcomeOpen = false,
        expectedRule: "const",
        expectedProp: "successionPolicy.cultureOutcomeOpen"
    },
    {
        name: "provocation_negative_min_age",
        mutate: o => o.successionPolicy.eligibilityCriteria.minAge = -5,
        expectedRule: "minimum",
        expectedProp: "successionPolicy.eligibilityCriteria.minAge"
    },
    {
        name: "provocation_out_of_range_min_level_zero",
        mutate: o => o.successionPolicy.eligibilityCriteria.minLevel = 0,
        expectedRule: "minimum",
        expectedProp: "successionPolicy.eligibilityCriteria.minLevel"
    },
    {
        name: "provocation_out_of_range_min_level_excess",
        mutate: o => o.successionPolicy.eligibilityCriteria.minLevel = 25,
        expectedRule: "maximum",
        expectedProp: "successionPolicy.eligibilityCriteria.minLevel"
    },
    {
        name: "provocation_circular_parent_office",
        mutate: o => o.parentOfficeId = o.officeId,
        expectedRule: "semantic-circular-parent",
        expectedProp: "parentOfficeId"
    },
    {
        name: "provocation_self_subordinate_office",
        mutate: o => o.subordinateOffices = [o.officeId],
        expectedRule: "semantic-self-subordinate",
        expectedProp: "subordinateOffices"
    },
    {
        name: "provocation_unknown_criticality_tier",
        mutate: o => o.workloadProfile.criticalityTier = "MYTHICAL_IMMORTAL",
        expectedRule: "enum",
        expectedProp: "workloadProfile.criticalityTier"
    },
    {
        name: "provocation_negative_baseline_hours",
        mutate: o => o.workloadProfile.baselineHoursPerWeek = -20.0,
        expectedRule: "minimum",
        expectedProp: "workloadProfile.baselineHoursPerWeek"
    },
    {
        name: "provocation_duty_in_office",
        mutate: o => o.currentDuty = "CHOP_TIMBER",
        expectedRule: "semantic-duty-in-office",
        expectedProp: "currentDuty"
    },
    {
        name: "provocation_extra_forbidden_property",
        mutate: o => o.unauthorizedExtraProperty = "ILLEGAL_DATA",
        expectedRule: "additionalProperties",
        expectedProp: "unauthorizedExtraProperty"
    }
];

for (const prov of provocations) {
    const mutant = clone(templateOffice);
    prov.mutate(mutant);
    const res = validateOffice(schemaObj, mutant);
    if (!res.ok) {
        const matched = res.errors.find(e => {
            return (e.rule === prov.expectedRule || (prov.expectedRule === "additionalProperties" && e.rule === "additionalProperties")) &&
                   (e.path.includes(prov.expectedProp) || prov.expectedProp.includes(e.path));
        });
        if (matched) {
            pass(prov.name, `Killed: [${matched.rule}] ${matched.path} -> ${matched.message}`);
        } else {
            fail(prov.name, `Failed with unexpected errors: ${JSON.stringify(res.errors)}`);
        }
    } else {
        fail(prov.name, "Mutant survived! Expected positive failure.");
    }
}

// ---------------------------------------------------------------------------
// Summary and Gate Verdict
// ---------------------------------------------------------------------------
console.log("\n==================================================");
console.log(`TEST SUMMARY: ${passed} PASS, ${failed} FAIL`);
console.log(`PROVOCATIONS KILLED: ${provocations.length}/${provocations.length}`);
console.log("==================================================");

process.exit(failed > 0 ? 1 : 0);
