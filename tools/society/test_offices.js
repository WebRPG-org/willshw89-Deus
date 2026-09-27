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
 * - INV-SOC-06 (ECON-002): Faction monetary balance (Treasurer) and physical goods
 *   (Quartermaster) are strictly separate; Treasury Chest is exclusive to Finance.
 * - Open Owner Questions: Preserves holder cardinality, multi-office concurrency,
 *   succession methods, and cultural succession as open / neutral.
 * - DEC-015 & DEC-025: All 9 canonical SRD ancestries covered with neutral titles;
 *   no invented cultural lore or non-canonical races (orc/goblin excluded).
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

// Canonical 9 SRD ancestries per DEC-025
const CANONICAL_ANCESTRIES = [
    "human",
    "dwarf",
    "elf",
    "halfling",
    "dragonborn",
    "gnome",
    "half-elf",
    "half-orc",
    "tiefling"
];

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
 * Validates an individual office object against schema and institutional semantic invariants.
 */
function validateOffice(schemaObj, officeObj) {
    const errors = validateAgainstSubSchema(schemaObj, schemaObj, officeObj, "");

    if (officeObj && typeof officeObj === "object") {
        // Semantic Rule 1: Vacancy state consistency & Fail-closed Semantics
        if (officeObj.vacancyState) {
            const vs = officeObj.vacancyState;
            if (vs.status === "VACANT" && vs.isVacant !== true) {
                errors.push({
                    path: "vacancyState.isVacant",
                    rule: "semantic-vacancy-mismatch",
                    message: "isVacant must be true when status is VACANT"
                });
            }
            if (vs.status === "SUSPENDED" && vs.isVacant !== true) {
                errors.push({
                    path: "vacancyState.isVacant",
                    rule: "semantic-suspended-mismatch",
                    message: "isVacant must be true when status is SUSPENDED"
                });
            }
            if (vs.status === "DORMANT" && vs.isVacant !== true) {
                errors.push({
                    path: "vacancyState.isVacant",
                    rule: "semantic-dormant-mismatch",
                    message: "isVacant must be true when status is DORMANT"
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

            // Fail-closed vacancy capability and holder checks
            if (vs.isVacant === true || vs.status === "VACANT" || vs.status === "SUSPENDED" || vs.status === "DORMANT") {
                if (vs.operationalCapability > 0.0) {
                    errors.push({
                        path: "vacancyState.operationalCapability",
                        rule: "semantic-vacant-capability-excess",
                        message: "A vacant/suspended/dormant office cannot retain operational capability > 0.0"
                    });
                }
                if (officeObj.holder) {
                    if (officeObj.holder.primaryHolderId !== null) {
                        errors.push({
                            path: "holder.primaryHolderId",
                            rule: "semantic-vacant-primary-holder-retained",
                            message: "A vacant office cannot retain a primaryHolderId"
                        });
                    }
                    if (officeObj.holder.actingHolderId !== null) {
                        errors.push({
                            path: "holder.actingHolderId",
                            rule: "semantic-vacant-acting-holder-retained",
                            message: "A vacant office cannot retain an actingHolderId"
                        });
                    }
                    if (Array.isArray(officeObj.holder.coHolderIds) && officeObj.holder.coHolderIds.length > 0) {
                        errors.push({
                            path: "holder.coHolderIds",
                            rule: "semantic-vacant-co-holders-retained",
                            message: "A vacant office cannot retain coHolderIds"
                        });
                    }
                }
            }

            // Occupied requirements
            if (vs.status === "OCCUPIED") {
                if (officeObj.holder && (officeObj.holder.primaryHolderId === null || typeof officeObj.holder.primaryHolderId !== "string" || officeObj.holder.primaryHolderId.length === 0)) {
                    errors.push({
                        path: "holder.primaryHolderId",
                        rule: "semantic-occupied-missing-holder",
                        message: "An OCCUPIED office must have a non-null primaryHolderId"
                    });
                }
                if (vs.operationalCapability !== 1.0) {
                    errors.push({
                        path: "vacancyState.operationalCapability",
                        rule: "semantic-occupied-capability-mismatch",
                        message: "An OCCUPIED office must have operationalCapability 1.0"
                    });
                }
            }

            // Acting requirements
            if (vs.status === "ACTING") {
                if (officeObj.holder && (officeObj.holder.actingHolderId === null || typeof officeObj.holder.actingHolderId !== "string" || officeObj.holder.actingHolderId.length === 0)) {
                    errors.push({
                        path: "holder.actingHolderId",
                        rule: "semantic-acting-missing-holder",
                        message: "An ACTING office must have a non-null actingHolderId"
                    });
                }
                if (vs.operationalCapability < 0.5 || vs.operationalCapability > 0.75) {
                    errors.push({
                        path: "vacancyState.operationalCapability",
                        rule: "semantic-acting-capability-range",
                        message: "An ACTING office must have operationalCapability between 0.5 and 0.75"
                    });
                }
            }

            // Degradation effects duty phrase rejection
            if (Array.isArray(vs.degradationEffects)) {
                for (let i = 0; i < vs.degradationEffects.length; i++) {
                    const eff = String(vs.degradationEffects[i]);
                    const upper = eff.toUpperCase();
                    if (upper.includes("DUTY") || eff.includes(":")) {
                        errors.push({
                            path: `vacancyState.degradationEffects[${i}]`,
                            rule: "semantic-duty-in-degradation-effects",
                            message: "degradationEffects cannot contain duty phrases or colon syntax"
                        });
                    }
                }
            }

            // Deceased holder consistency (INV-SOC-03)
            if (vs.vacancyReason === "HOLDER_DECEASED") {
                if (vs.status === "OCCUPIED" || vs.operationalCapability >= 1.0) {
                    errors.push({
                        path: "vacancyState.operationalCapability",
                        rule: "semantic-deceased-holder-full-capability",
                        message: "An office cannot retain full operational capability (1.0) or OCCUPIED status when vacancyReason is HOLDER_DECEASED"
                    });
                } else if (officeObj.holder && officeObj.holder.primaryHolderId !== null) {
                    errors.push({
                        path: "holder.primaryHolderId",
                        rule: "semantic-deceased-primary-holder-retained",
                        message: "An office cannot retain a primaryHolderId when vacancyReason is HOLDER_DECEASED"
                    });
                }
            }
        }

        // Semantic Rule 2: Holder Cardinality consistency
        if (officeObj.holder) {
            const h = officeObj.holder;
            if (h.cardinality === "SINGLE") {
                if (Array.isArray(h.coHolderIds) && h.coHolderIds.length > 0) {
                    errors.push({
                        path: "holder.coHolderIds",
                        rule: "semantic-single-cardinality-coholders",
                        message: "Single cardinality office cannot have co-holders"
                    });
                }
                if (h.maxHolders !== null && h.maxHolders !== 1) {
                    errors.push({
                        path: "holder.maxHolders",
                        rule: "semantic-single-cardinality-max-holders",
                        message: "Single cardinality office maxHolders must be 1 or null"
                    });
                }
            }
            if (h.maxHolders !== null && typeof h.maxHolders === "number") {
                const totalHolders = (h.primaryHolderId ? 1 : 0) + (Array.isArray(h.coHolderIds) ? h.coHolderIds.length : 0);
                if (totalHolders > h.maxHolders) {
                    errors.push({
                        path: "holder.maxHolders",
                        rule: "semantic-max-holders-exceeded",
                        message: `Holder count (${totalHolders}) exceeds maxHolders (${h.maxHolders})`
                    });
                }
            }
        }

        // Semantic Rule 3: Hierarchy non-circularity
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

        // Semantic Rule 4: Current duty separation (INV-SOC-02)
        if ("currentDuty" in officeObj || "duty" in officeObj) {
            errors.push({
                path: "currentDuty" in officeObj ? "currentDuty" : "duty",
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

/**
 * Validates catalogue-wide consistency across all 16 office records:
 * - Parent/subordinate bidirectional agreement
 * - Invariant INV-SOC-06 (Treasury Chest domain separation)
 * - Complete canonical ancestry coverage (DEC-025, DEC-015)
 * - Open owner question preservation in canonical records
 */
function validateCatalogue(officesMap) {
    const errors = [];
    const officeIds = Object.keys(officesMap);

    for (const officeId of officeIds) {
        const office = officesMap[officeId];

        // 1. Bidirectional parent / subordinate reconciliation
        if (office.parentOfficeId) {
            const parent = officesMap[office.parentOfficeId];
            if (!parent) {
                errors.push({
                    path: `${officeId}.parentOfficeId`,
                    rule: "catalogue-missing-parent",
                    message: `Parent office ${office.parentOfficeId} not found in catalogue`
                });
            } else if (!Array.isArray(parent.subordinateOffices) || !parent.subordinateOffices.includes(officeId)) {
                errors.push({
                    path: `${officeId}.parentOfficeId`,
                    rule: "catalogue-subordinate-mismatch",
                    message: `Office ${officeId} has parent ${office.parentOfficeId}, but parent does not list it in subordinateOffices`
                });
            }
        }

        if (Array.isArray(office.subordinateOffices)) {
            for (const subId of office.subordinateOffices) {
                const subOffice = officesMap[subId];
                if (!subOffice) {
                    errors.push({
                        path: `${officeId}.subordinateOffices`,
                        rule: "catalogue-missing-subordinate",
                        message: `Subordinate office ${subId} not found in catalogue`
                    });
                } else if (subOffice.parentOfficeId !== officeId) {
                    errors.push({
                        path: `${officeId}.subordinateOffices`,
                        rule: "catalogue-parent-mismatch",
                        message: `Office ${officeId} lists subordinate ${subId}, but subordinate has parentOfficeId: ${subOffice.parentOfficeId}`
                    });
                }
            }
        }

        // 2. Invariant INV-SOC-06: Treasury balance domain strictly separated from stores / assaying
        if (officeId === "OFFICE_QUARTERMASTER" || officeId === "OFFICE_MINT_MASTER") {
            if (office.jurisdiction && Array.isArray(office.jurisdiction.domains) && office.jurisdiction.domains.includes("TREASURY_CHEST")) {
                errors.push({
                    path: `${officeId}.jurisdiction.domains`,
                    rule: "catalogue-inv-soc-06-treasury-chest-leak",
                    message: `Office ${officeId} cannot have TREASURY_CHEST in jurisdiction domains (INV-SOC-06)`
                });
            }
        }

        // 3. Complete canonical ancestry coverage (DEC-025 & DEC-015)
        const ct = (office.titles && office.titles.culturalTitles) ? office.titles.culturalTitles : null;
        if (!ct) {
            errors.push({
                path: `${officeId}.titles.culturalTitles`,
                rule: "catalogue-missing-canonical-ancestry",
                message: `Office ${officeId} is missing culturalTitles map; all 9 canonical ancestries are required (DEC-025)`
            });
        } else {
            for (const ancestry of CANONICAL_ANCESTRIES) {
                if (!(ancestry in ct)) {
                    errors.push({
                        path: `${officeId}.titles.culturalTitles.${ancestry}`,
                        rule: "catalogue-missing-canonical-ancestry",
                        message: `Missing canonical ancestry key: ${ancestry}`
                    });
                } else if (office.titles && ct[ancestry] !== office.titles.defaultTitle) {
                    errors.push({
                        path: `${officeId}.titles.culturalTitles.${ancestry}`,
                        rule: "catalogue-invented-race-title",
                        message: `Cultural title for ${ancestry} ("${ct[ancestry]}") must match neutral defaultTitle ("${office.titles.defaultTitle}") to avoid inventing unapproved race lore (DEC-015)`
                    });
                }
            }
            // Ensure no non-canonical races (orc/goblin)
            for (const key of Object.keys(ct)) {
                if (!CANONICAL_ANCESTRIES.includes(key)) {
                    errors.push({
                        path: `${officeId}.titles.culturalTitles.${key}`,
                        rule: "catalogue-noncanonical-ancestry-key",
                        message: `Non-canonical ancestry key found: ${key}`
                    });
                }
            }
        }

        // 4. Open Owner Questions Preservation in canonical records
        if (office.holder) {
            if (office.holder.cardinality !== "UNDECIDED") {
                errors.push({
                    path: `${officeId}.holder.cardinality`,
                    rule: "catalogue-decided-cardinality",
                    message: `Canonical record decides holder cardinality as ${office.holder.cardinality}; must be UNDECIDED`
                });
            }
            if (office.holder.maxHolders !== null) {
                errors.push({
                    path: `${officeId}.holder.maxHolders`,
                    rule: "catalogue-decided-max-holders",
                    message: `Canonical record decides maxHolders as ${office.holder.maxHolders}; must be null`
                });
            }
            if (office.holder.allowConcurrentOffices !== null) {
                errors.push({
                    path: `${officeId}.holder.allowConcurrentOffices`,
                    rule: "catalogue-decided-concurrent-offices",
                    message: `Canonical record decides allowConcurrentOffices as ${office.holder.allowConcurrentOffices}; must be null`
                });
            }
        }

        if (office.successionPolicy) {
            if (office.successionPolicy.method !== "OPEN_POLICY") {
                errors.push({
                    path: `${officeId}.successionPolicy.method`,
                    rule: "catalogue-decided-succession-method",
                    message: `Canonical record decides succession method as ${office.successionPolicy.method}; must be OPEN_POLICY`
                });
            }
            if (office.successionPolicy.appointmentAuthority !== null) {
                errors.push({
                    path: `${officeId}.successionPolicy.appointmentAuthority`,
                    rule: "catalogue-decided-appointment-authority",
                    message: `Canonical record decides appointmentAuthority; must be null`
                });
            }
            if (office.successionPolicy.cultureOutcomeOpen !== true) {
                errors.push({
                    path: `${officeId}.successionPolicy.cultureOutcomeOpen`,
                    rule: "catalogue-culture-outcome-not-open",
                    message: `cultureOutcomeOpen must be true`
                });
            }
            if (office.successionPolicy.eligibilityCriteria) {
                const ec = office.successionPolicy.eligibilityCriteria;
                if (ec.minAge !== null) {
                    errors.push({
                        path: `${officeId}.successionPolicy.eligibilityCriteria.minAge`,
                        rule: "catalogue-invented-age-gate",
                        message: `Canonical record invents minAge ${ec.minAge}; must be null`
                    });
                }
                if (Array.isArray(ec.requiredCrafts) && ec.requiredCrafts.length > 0) {
                    errors.push({
                        path: `${officeId}.successionPolicy.eligibilityCriteria.requiredCrafts`,
                        rule: "catalogue-invented-craft-gate",
                        message: `Canonical record invents craft gate (INV-SOC-01 breach); must be empty`
                    });
                }
                if (Array.isArray(ec.requiredClasses) && ec.requiredClasses.length > 0) {
                    errors.push({
                        path: `${officeId}.successionPolicy.eligibilityCriteria.requiredClasses`,
                        rule: "catalogue-invented-class-gate",
                        message: `Canonical record invents class gate (INV-SOC-01 breach); must be empty`
                    });
                }
                if (ec.minLevel !== null) {
                    errors.push({
                        path: `${officeId}.successionPolicy.eligibilityCriteria.minLevel`,
                        rule: "catalogue-invented-level-gate",
                        message: `Canonical record invents class level gate; must be null`
                    });
                }
            }
        }

        if (office.workloadProfile && office.workloadProfile.baselineHoursPerWeek !== null) {
            errors.push({
                path: `${officeId}.workloadProfile.baselineHoursPerWeek`,
                rule: "catalogue-invented-baseline-hours",
                message: `Canonical record invents baseline hours ${office.workloadProfile.baselineHoursPerWeek}; must be null`
            });
        }
    }

    // 5. Hierarchy cycle detection across the catalogue (DFS / path walk)
    const cycleReported = new Set();
    for (const officeId of officeIds) {
        const visitedInPath = [];
        const visitedSet = new Set();
        let currId = officeId;
        while (currId) {
            if (visitedSet.has(currId)) {
                // Cycle detected
                const cycleNodes = visitedInPath.slice(visitedInPath.indexOf(currId));
                cycleNodes.sort();
                const cycleKey = cycleNodes.join("->");
                if (!cycleReported.has(cycleKey)) {
                    cycleReported.add(cycleKey);
                    errors.push({
                        path: `${currId}.parentOfficeId`,
                        rule: "catalogue-hierarchy-cycle",
                        message: `Hierarchy cycle detected involving offices: ${cycleNodes.join(", ")}`
                    });
                }
                break;
            }
            visitedInPath.push(currId);
            visitedSet.add(currId);
            const nextOffice = officesMap[currId];
            currId = nextOffice ? nextOffice.parentOfficeId : null;
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

// 3. Validate All 16 Canonical Office Files Individually
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
const officesMapById = {};

for (const fileName of canonicalFiles) {
    const filePath = path.join(OFFICES_DIR, fileName);
    try {
        const raw = fs.readFileSync(filePath, "utf8");
        const office = JSON.parse(raw);
        loadedOffices[fileName] = office;
        officesMapById[office.officeId] = office;
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

// 4. Validate Cross-Office Relational Integrity (Catalogue-Wide Check)
{
    const catRes = validateCatalogue(officesMapById);
    if (catRes.ok) {
        pass("catalogue_relational_integrity", "All 16 offices possess consistent parent/subordinate links, INV-SOC-06 domain separation, and open owner questions preservation");
    } else {
        fail("catalogue_relational_integrity", catRes.errors.map(e => `${e.path} [${e.rule}]: ${e.message}`).join("; "));
    }
}

// 5. Validate Manifest
try {
    const rawManifest = fs.readFileSync(MANIFEST_PATH, "utf8");
    const manifest = JSON.parse(rawManifest);
    if (manifest.totalOffices !== 16 || manifest.offices.length !== 16) {
        throw new Error(`Manifest office count mismatch: expected 16, got ${manifest.offices.length}`);
    }
    if (manifest.founderCoreCount !== 8 || manifest.specializedCount !== 8) {
        throw new Error(`Tier count mismatch: ${manifest.founderCoreCount} core, ${manifest.specializedCount} specialized`);
    }
    // Verify no decided aliases in manifest
    let hasDecidedAliases = false;
    for (const row of manifest.offices) {
        if (Array.isArray(row.aliases) && row.aliases.length > 0) {
            hasDecidedAliases = true;
            break;
        }
    }
    if (hasDecidedAliases) {
        fail("manifest_valid", "Manifest contains decided aliases; must remain undecided");
    } else {
        pass("manifest_valid", `${manifest.totalOffices} canonical offices listed with open aliases preserved`);
    }
} catch (err) {
    fail("manifest_valid", err.message);
}

// 6. Verify Invariant FACTION-001 (INV-SOC-03): Durable Entity Independent of Holder
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

// 7. Verify Three-Axis Separation & Duty Protection (INV-SOC-01 & INV-SOC-02)
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

// 8. Verify Open Owner Questions Handling & Canonical Functions
{
    const baseOffice = clone(loadedOffices["leader.json"]);

    // Check holder cardinality flexibility (UNDECIDED, SINGLE, MULTIPLE, COLLEGIATE)
    const cardinalities = ["UNDECIDED", "SINGLE", "MULTIPLE", "COLLEGIATE"];
    let cardOk = true;
    for (const card of cardinalities) {
        const testOffice = clone(baseOffice);
        testOffice.holder.cardinality = card;
        if (card === "MULTIPLE" || card === "COLLEGIATE") {
            testOffice.vacancyState.status = "OCCUPIED";
            testOffice.vacancyState.isVacant = false;
            testOffice.vacancyState.operationalCapability = 1.0;
            testOffice.holder.primaryHolderId = "PERSON_101";
            testOffice.holder.coHolderIds = ["PERSON_102"];
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

    // Check all canonical functions including HEALER and aliases
    const allFunctions = [
        "LEADER", "EXECUTIVE",
        "STEWARD", "ADMIN",
        "HEALER_DIRECTOR", "HEALER",
        "TREASURER", "MINT_MASTER", "MARSHAL",
        "QUARTERMASTER", "MASTER_OF_WORKS", "PROVISIONER",
        "RECORDER", "MAGISTRATE", "ENVOY",
        "TRADE_MASTER", "TAX_COLLECTOR", "PAYMASTER", "CLERK"
    ];
    let funcOk = true;
    for (const fn of allFunctions) {
        const testOffice = clone(baseOffice);
        testOffice.canonicalFunction = fn;
        const res = validateOffice(schemaObj, testOffice);
        if (!res.ok) {
            funcOk = false;
            fail("open_question_functions", `Failed to validate canonicalFunction: ${fn} (${res.errors.map(e => e.message).join(", ")})`);
            break;
        }
    }
    if (funcOk) {
        pass("open_question_functions", `All ${allFunctions.length} canonical functions (including HEALER) validate successfully`);
    }
}

// ---------------------------------------------------------------------------
// 9. Targeted Failing Fixtures for Catalogue Consistency
// ---------------------------------------------------------------------------
console.log("\n--- Targeted Failing Fixtures for Production Rules ---");

function testCatalogueFixture(name, desc, expectedRule, mutateFn) {
    const catClone = clone(officesMapById);
    mutateFn(catClone);
    const res = validateCatalogue(catClone);
    const hasExpected = !res.ok && res.errors.some(e => e.rule === expectedRule);
    const otherErrors = res.errors.filter(e => e.rule !== expectedRule);
    if (hasExpected && otherErrors.length === 0) {
        pass(name, `${desc} (isolated: ${expectedRule}, passes when disabled)`);
    } else if (!hasExpected) {
        fail(name, `Expected rule ${expectedRule} not fired. Errors: ${JSON.stringify(res.errors)}`);
    } else {
        fail(name, `Not isolated: had ${otherErrors.length} unexpected error(s): ${JSON.stringify(otherErrors)}`);
    }
}

// Fixture 1: Subordinate mismatch
testCatalogueFixture(
    "fixture_catalogue_mismatched_parent_subordinate",
    "Detected subordinate mismatch when parent omits subordinate",
    "catalogue-subordinate-mismatch",
    cat => {
        cat["OFFICE_LEADER"].subordinateOffices = cat["OFFICE_LEADER"].subordinateOffices.filter(id => id !== "OFFICE_STEWARD");
    }
);

// Fixture 2: INV-SOC-06 Quartermaster domain leak
testCatalogueFixture(
    "fixture_catalogue_quartermaster_treasury_chest",
    "Detected INV-SOC-06 violation: Quartermaster holding TREASURY_CHEST",
    "catalogue-inv-soc-06-treasury-chest-leak",
    cat => {
        cat["OFFICE_QUARTERMASTER"].jurisdiction.domains.push("TREASURY_CHEST");
    }
);

// Fixture 3: Missing canonical ancestry
testCatalogueFixture(
    "fixture_catalogue_missing_canonical_ancestry",
    "Detected missing canonical ancestry (half-elf)",
    "catalogue-missing-canonical-ancestry",
    cat => {
        delete cat["OFFICE_LEADER"].titles.culturalTitles["half-elf"];
    }
);

// Fixture 4: Non-canonical ancestry key
testCatalogueFixture(
    "fixture_catalogue_noncanonical_ancestry",
    "Detected non-canonical ancestry key (goblin)",
    "catalogue-noncanonical-ancestry-key",
    cat => {
        cat["OFFICE_LEADER"].titles.culturalTitles["goblin"] = "Chief";
    }
);

// Fixture 5: Invented race title
testCatalogueFixture(
    "fixture_catalogue_invented_race_title",
    "Detected invented race title 'Jarl' violating DEC-015",
    "catalogue-invented-race-title",
    cat => {
        cat["OFFICE_LEADER"].titles.culturalTitles["dwarf"] = "Jarl";
    }
);

// Fixture 6: Decided holder cardinality in canonical record
testCatalogueFixture(
    "fixture_catalogue_decided_cardinality",
    "Detected premature decision of holder cardinality (SINGLE instead of UNDECIDED)",
    "catalogue-decided-cardinality",
    cat => {
        cat["OFFICE_TREASURER"].holder.cardinality = "SINGLE";
    }
);

// Fixture 7: Missing parent office
testCatalogueFixture(
    "fixture_catalogue_missing_parent",
    "Detected missing parent office not found in catalogue",
    "catalogue-missing-parent",
    cat => {
        cat["OFFICE_TREASURER"].parentOfficeId = "OFFICE_DOES_NOT_EXIST";
        cat["OFFICE_LEADER"].subordinateOffices = cat["OFFICE_LEADER"].subordinateOffices.filter(id => id !== "OFFICE_TREASURER");
    }
);

// Fixture 8: Missing subordinate office
testCatalogueFixture(
    "fixture_catalogue_missing_subordinate",
    "Detected missing subordinate office not found in catalogue",
    "catalogue-missing-subordinate",
    cat => {
        cat["OFFICE_LEADER"].subordinateOffices.push("OFFICE_GHOST");
    }
);

// Fixture 9: Parent mismatch (subordinate points to different parent)
testCatalogueFixture(
    "fixture_catalogue_parent_mismatch",
    "Detected parent mismatch when office lists subordinate pointing to another parent",
    "catalogue-parent-mismatch",
    cat => {
        cat["OFFICE_STEWARD"].subordinateOffices = ["OFFICE_CLERK"];
    }
);

// Fixture 10: Decided maxHolders in canonical record
testCatalogueFixture(
    "fixture_catalogue_decided_max_holders",
    "Detected premature decision of maxHolders in canonical record",
    "catalogue-decided-max-holders",
    cat => {
        cat["OFFICE_TREASURER"].holder.maxHolders = 1;
    }
);

// Fixture 11: Decided concurrent offices in canonical record
testCatalogueFixture(
    "fixture_catalogue_decided_concurrent_offices",
    "Detected premature decision of allowConcurrentOffices in canonical record",
    "catalogue-decided-concurrent-offices",
    cat => {
        cat["OFFICE_TREASURER"].holder.allowConcurrentOffices = true;
    }
);

// Fixture 12: Decided succession method in canonical record
testCatalogueFixture(
    "fixture_catalogue_decided_succession_method",
    "Detected premature decision of succession method in canonical record",
    "catalogue-decided-succession-method",
    cat => {
        cat["OFFICE_TREASURER"].successionPolicy.method = "HEREDITARY";
    }
);

// Fixture 13: Decided appointment authority in canonical record
testCatalogueFixture(
    "fixture_catalogue_decided_appointment_authority",
    "Detected premature decision of appointmentAuthority in canonical record",
    "catalogue-decided-appointment-authority",
    cat => {
        cat["OFFICE_TREASURER"].successionPolicy.appointmentAuthority = "OFFICE_RECORDER";
    }
);

// Fixture 14: Culture outcome not open in canonical record
testCatalogueFixture(
    "fixture_catalogue_culture_outcome_not_open",
    "Detected cultureOutcomeOpen set to false in canonical record",
    "catalogue-culture-outcome-not-open",
    cat => {
        cat["OFFICE_TREASURER"].successionPolicy.cultureOutcomeOpen = false;
    }
);

// Fixture 15: Invented age gate in canonical record
testCatalogueFixture(
    "fixture_catalogue_invented_age_gate",
    "Detected invented minAge gate in canonical record",
    "catalogue-invented-age-gate",
    cat => {
        cat["OFFICE_TREASURER"].successionPolicy.eligibilityCriteria.minAge = 18;
    }
);

// Fixture 16: Invented craft gate in canonical record (INV-SOC-01 breach)
testCatalogueFixture(
    "fixture_catalogue_invented_craft_gate",
    "Detected invented requiredCrafts gate in canonical record",
    "catalogue-invented-craft-gate",
    cat => {
        cat["OFFICE_TREASURER"].successionPolicy.eligibilityCriteria.requiredCrafts = ["SCRIBE"];
    }
);

// Fixture 17: Invented class gate in canonical record (INV-SOC-01 breach)
testCatalogueFixture(
    "fixture_catalogue_invented_class_gate",
    "Detected invented requiredClasses gate in canonical record",
    "catalogue-invented-class-gate",
    cat => {
        cat["OFFICE_TREASURER"].successionPolicy.eligibilityCriteria.requiredClasses = ["bard"];
    }
);

// Fixture 18: Invented level gate in canonical record
testCatalogueFixture(
    "fixture_catalogue_invented_level_gate",
    "Detected invented minLevel gate in canonical record",
    "catalogue-invented-level-gate",
    cat => {
        cat["OFFICE_TREASURER"].successionPolicy.eligibilityCriteria.minLevel = 1;
    }
);

// Fixture 19: Invented baseline hours in canonical record
testCatalogueFixture(
    "fixture_catalogue_invented_baseline_hours",
    "Detected invented baselineHoursPerWeek in canonical record",
    "catalogue-invented-baseline-hours",
    cat => {
        cat["OFFICE_TREASURER"].workloadProfile.baselineHoursPerWeek = 25;
    }
);

// Fixture 20: Reciprocal multi-office hierarchy cycle
testCatalogueFixture(
    "fixture_catalogue_hierarchy_cycle",
    "Detected reciprocal multi-office hierarchy cycle",
    "catalogue-hierarchy-cycle",
    cat => {
        cat["OFFICE_LEADER"].subordinateOffices = cat["OFFICE_LEADER"].subordinateOffices.filter(id => id !== "OFFICE_STEWARD" && id !== "OFFICE_MARSHAL");
        cat["OFFICE_STEWARD"].parentOfficeId = "OFFICE_MARSHAL";
        cat["OFFICE_STEWARD"].subordinateOffices = ["OFFICE_MARSHAL"];
        cat["OFFICE_MARSHAL"].parentOfficeId = "OFFICE_STEWARD";
        cat["OFFICE_MARSHAL"].subordinateOffices = ["OFFICE_STEWARD"];
    }
);

// Fixture 21: Completely omitted culturalTitles map in canonical office
testCatalogueFixture(
    "fixture_catalogue_omitted_cultural_titles",
    "Detected omitted culturalTitles map in canonical office",
    "catalogue-missing-canonical-ancestry",
    cat => {
        delete cat["OFFICE_LEADER"].titles.culturalTitles;
    }
);

// ---------------------------------------------------------------------------
// 10. Targeted Failing Provocations (Every Check Must Have a Failing Fixture)
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
        name: "provocation_office_id_max_length_exceeded",
        mutate: o => o.officeId = "OFFICE_" + "A".repeat(60),
        expectedRule: "maxLength",
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
        name: "provocation_missing_canonical_function",
        mutate: o => delete o.canonicalFunction,
        expectedRule: "required",
        expectedProp: "canonicalFunction"
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
        name: "provocation_missing_cultural_titles",
        mutate: o => delete o.titles.culturalTitles,
        expectedRule: "required",
        expectedProp: "titles.culturalTitles"
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
        expectedProp: "jurisdiction.domains[1]"
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
        expectedProp: "authorityScopes[1]"
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
            o.holder.primaryHolderId = "PERSON_1";
            o.vacancyState.operationalCapability = 1.0;
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
        name: "provocation_inconsistent_vacant_flag_acting",
        mutate: o => {
            o.vacancyState.status = "ACTING";
            o.vacancyState.isVacant = true; // Inconsistent!
            o.holder.actingHolderId = "PERSON_2";
            o.vacancyState.operationalCapability = 0.5;
        },
        expectedRule: "semantic-acting-mismatch",
        expectedProp: "vacancyState.isVacant"
    },
    {
        name: "provocation_inconsistent_vacant_flag_suspended",
        mutate: o => {
            o.vacancyState.status = "SUSPENDED";
            o.vacancyState.isVacant = false; // Inconsistent!
        },
        expectedRule: "semantic-suspended-mismatch",
        expectedProp: "vacancyState.isVacant"
    },
    {
        name: "provocation_inconsistent_vacant_flag_dormant",
        mutate: o => {
            o.vacancyState.status = "DORMANT";
            o.vacancyState.isVacant = false; // Inconsistent!
        },
        expectedRule: "semantic-dormant-mismatch",
        expectedProp: "vacancyState.isVacant"
    },
    {
        name: "provocation_vacant_retains_primary_holder",
        mutate: o => {
            o.vacancyState.status = "VACANT";
            o.vacancyState.isVacant = true;
            o.holder.primaryHolderId = "PERSON_184"; // Must fail closed!
        },
        expectedRule: "semantic-vacant-primary-holder-retained",
        expectedProp: "holder.primaryHolderId"
    },
    {
        name: "provocation_vacant_retains_acting_holder",
        mutate: o => {
            o.vacancyState.status = "VACANT";
            o.vacancyState.isVacant = true;
            o.holder.actingHolderId = "PERSON_227"; // Must fail closed!
        },
        expectedRule: "semantic-vacant-acting-holder-retained",
        expectedProp: "holder.actingHolderId"
    },
    {
        name: "provocation_vacant_retains_co_holders",
        mutate: o => {
            o.vacancyState.status = "VACANT";
            o.vacancyState.isVacant = true;
            o.holder.coHolderIds = ["PERSON_100"]; // Must fail closed!
        },
        expectedRule: "semantic-vacant-co-holders-retained",
        expectedProp: "holder.coHolderIds"
    },
    {
        name: "provocation_vacant_retains_capability",
        mutate: o => {
            o.vacancyState.status = "VACANT";
            o.vacancyState.isVacant = true;
            o.vacancyState.operationalCapability = 1.0; // Must fail closed!
        },
        expectedRule: "semantic-vacant-capability-excess",
        expectedProp: "vacancyState.operationalCapability"
    },
    {
        name: "provocation_occupied_missing_primary_holder",
        mutate: o => {
            o.vacancyState.status = "OCCUPIED";
            o.vacancyState.isVacant = false;
            o.vacancyState.operationalCapability = 1.0;
            o.holder.primaryHolderId = null; // Occupied must have primary holder!
        },
        expectedRule: "semantic-occupied-missing-holder",
        expectedProp: "holder.primaryHolderId"
    },
    {
        name: "provocation_occupied_bad_capability",
        mutate: o => {
            o.vacancyState.status = "OCCUPIED";
            o.vacancyState.isVacant = false;
            o.holder.primaryHolderId = "PERSON_1";
            o.vacancyState.operationalCapability = 0.5; // Occupied must be 1.0!
        },
        expectedRule: "semantic-occupied-capability-mismatch",
        expectedProp: "vacancyState.operationalCapability"
    },
    {
        name: "provocation_acting_missing_acting_holder",
        mutate: o => {
            o.vacancyState.status = "ACTING";
            o.vacancyState.isVacant = false;
            o.vacancyState.operationalCapability = 0.5;
            o.holder.actingHolderId = null; // Acting must have acting holder!
        },
        expectedRule: "semantic-acting-missing-holder",
        expectedProp: "holder.actingHolderId"
    },
    {
        name: "provocation_acting_bad_capability_low",
        mutate: o => {
            o.vacancyState.status = "ACTING";
            o.vacancyState.isVacant = false;
            o.holder.actingHolderId = "PERSON_2";
            o.vacancyState.operationalCapability = 0.2; // Must be 0.5..0.75!
        },
        expectedRule: "semantic-acting-capability-range",
        expectedProp: "vacancyState.operationalCapability"
    },
    {
        name: "provocation_acting_bad_capability_high",
        mutate: o => {
            o.vacancyState.status = "ACTING";
            o.vacancyState.isVacant = false;
            o.holder.actingHolderId = "PERSON_2";
            o.vacancyState.operationalCapability = 0.9; // Must be 0.5..0.75!
        },
        expectedRule: "semantic-acting-capability-range",
        expectedProp: "vacancyState.operationalCapability"
    },
    {
        name: "provocation_deceased_holder_full_capability_retained",
        mutate: o => {
            o.vacancyState.status = "OCCUPIED";
            o.vacancyState.isVacant = false;
            o.vacancyState.operationalCapability = 1.0;
            o.vacancyState.vacancyReason = "HOLDER_DECEASED";
            o.holder.primaryHolderId = "PERSON_184";
        },
        expectedRule: "semantic-deceased-holder-full-capability",
        expectedProp: "vacancyState.operationalCapability"
    },
    {
        name: "provocation_deceased_holder_acting_retains_primary",
        mutate: o => {
            o.vacancyState.status = "ACTING";
            o.vacancyState.isVacant = false;
            o.vacancyState.operationalCapability = 0.5;
            o.vacancyState.vacancyReason = "HOLDER_DECEASED";
            o.holder.actingHolderId = "PERSON_227";
            o.holder.primaryHolderId = "PERSON_184";
        },
        expectedRule: "semantic-deceased-primary-holder-retained",
        expectedProp: "holder.primaryHolderId"
    },
    {
        name: "provocation_single_cardinality_with_co_holders",
        mutate: o => {
            o.holder.cardinality = "SINGLE";
            o.holder.coHolderIds = ["PERSON_10"]; // Single cardinality cannot have co-holders!
        },
        expectedRule: "semantic-single-cardinality-coholders",
        expectedProp: "holder.coHolderIds"
    },
    {
        name: "provocation_single_cardinality_bad_max_holders",
        mutate: o => {
            o.holder.cardinality = "SINGLE";
            o.holder.maxHolders = 2; // Single cardinality maxHolders must be 1!
        },
        expectedRule: "semantic-single-cardinality-max-holders",
        expectedProp: "holder.maxHolders"
    },
    {
        name: "provocation_max_holders_exceeded",
        mutate: o => {
            o.holder.cardinality = "MULTIPLE";
            o.holder.maxHolders = 1;
            o.holder.primaryHolderId = "PERSON_1";
            o.holder.coHolderIds = ["PERSON_2"]; // 2 holders > maxHolders 1!
        },
        expectedRule: "semantic-max-holders-exceeded",
        expectedProp: "holder.maxHolders"
    },
    {
        name: "provocation_duty_phrase_in_degradation_effects",
        mutate: o => {
            o.vacancyState.degradationEffects = ["CURRENT_DUTY_DEFEND_GATE"];
        },
        expectedRule: "semantic-duty-in-degradation-effects",
        expectedProp: "vacancyState.degradationEffects[0]"
    },
    {
        name: "provocation_invalid_token_pattern_in_degradation_effects",
        mutate: o => {
            o.vacancyState.degradationEffects = ["INVALID TOKEN!"];
        },
        expectedRule: "pattern",
        expectedProp: "vacancyState.degradationEffects[0]"
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
        name: "provocation_fractional_since_year",
        mutate: o => o.vacancyState.sinceYear = 1.5,
        expectedRule: "type",
        expectedProp: "vacancyState.sinceYear"
    },
    {
        name: "provocation_negative_since_tick",
        mutate: o => o.vacancyState.sinceTick = -1,
        expectedRule: "minimum",
        expectedProp: "vacancyState.sinceTick"
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
        expectedProp: "holder.coHolderIds[1]"
    },
    {
        name: "provocation_duplicate_deputies",
        mutate: o => o.holder.deputyIds = ["DEP_1", "DEP_1"],
        expectedRule: "uniqueItems",
        expectedProp: "holder.deputyIds[1]"
    },
    {
        name: "provocation_nested_additional_properties",
        mutate: o => o.holder.craft = "BLACKSMITH",
        expectedRule: "additionalProperties",
        expectedProp: "holder.craft"
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
        mutate: o => o.duty = "MINE_ORE",
        expectedRule: "semantic-duty-in-office",
        expectedProp: "duty"
    },
    {
        name: "provocation_current_duty_in_office",
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

let killedCount = 0;
for (const prov of provocations) {
    const mutant = clone(templateOffice);
    prov.mutate(mutant);
    const res = validateOffice(schemaObj, mutant);
    if (!res.ok) {
        const matched = res.errors.find(e => {
            const ruleMatches = e.rule === prov.expectedRule;
            const propMatches = e.path === prov.expectedProp ||
                (prov.expectedRule === "additionalProperties" && (e.path === prov.expectedProp || e.path.endsWith("." + prov.expectedProp)));
            return ruleMatches && propMatches;
        });
        if (matched) {
            killedCount++;
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
console.log(`PROVOCATIONS KILLED: ${killedCount}/${provocations.length}`);
console.log("==================================================");

if (require.main === module) {
    process.exit(failed > 0 ? 1 : 0);
}

module.exports = {
    validateOffice,
    validateCatalogue,
    schemaObj
};
