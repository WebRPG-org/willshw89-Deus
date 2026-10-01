"use strict";

// NAT.02.MASS part 2: migrate materials.json and mass_tables.json to integer centipounds (cp).
// Usage:
//   node tools/sim/migrate_mass_units.js          # apply migration and write to disk
//   node tools/sim/migrate_mass_units.js --check  # verify files are already migrated integer cp (exit 0)

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const { kgToCp, gToCp, WATER_CP_PER_STRATUM } = require(path.join(ROOT, "game", "js", "sim", "units.js"));

const MAT_PATH = path.join(ROOT, "game", "data", "sim", "materials.json");
const MASS_PATH = path.join(ROOT, "game", "data", "sim", "mass_tables.json");

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }

function divRound(n, d) {
    return Math.floor((n + Math.floor(d / 2)) / d);
}

function migrate(matJson, massJson) {
    const matOrig = JSON.parse(JSON.stringify(matJson));
    const massesOrig = JSON.parse(JSON.stringify(massJson));

    // 1. Top-level mass_tables
    massesOrig.massUnit = "cp";
    delete massesOrig.muRef;

    // 2. Items
    const items = massesOrig.items;
    for (const [id, item] of Object.entries(items)) {
        if (item.massless) {
            item.massCp = 0;
        } else if (item.massMu != null) {
            item.massCp = gToCp(item.massMu);
        }
        delete item.massMu;
        if (item.catalogWeightTimes1000 != null) {
            item.catalogWeightCp = gToCp(item.catalogWeightTimes1000);
            delete item.catalogWeightTimes1000;
        }
        if (item.ledger && item.ledger.unit) {
            item.ledger.unit = "cp";
        }
    }

    // 3. Objects
    const objects = massesOrig.objects;
    for (const [id, obj] of Object.entries(objects)) {
        if (obj.massless) {
            obj.massCp = 0;
            delete obj.massMu;
            continue;
        }

        // Bill
        if (Array.isArray(obj.bill)) {
            let totalBillCp = 0;
            for (const line of obj.bill) {
                const item = items[line.item];
                if (!item) throw new Error(`Unknown item ${line.item} in object ${id} bill`);
                line.cp = line.count * item.massCp;
                delete line.mu;
                totalBillCp += line.cp;
            }
            obj.massCp = totalBillCp;

            // Lines for objects with a bill match the bill's class totals
            if (Array.isArray(obj.lines)) {
                for (const line of obj.lines) {
                    let matchingCp = 0;
                    for (const b of obj.bill) {
                        if (b.class === line.class) matchingCp += b.cp;
                    }
                    line.cp = matchingCp;
                    delete line.mu;
                }
            }
        } else if (obj.yield && obj.yield.postings && obj.yield.postings.length === 1 && obj.yield.postings[0].item && items[obj.yield.postings[0].item]) {
            // Deposit objects where mass equals item * count
            const p = obj.yield.postings[0];
            obj.massCp = p.count * items[p.item].massCp;
            if (Array.isArray(obj.lines)) {
                for (const line of obj.lines) {
                    line.cp = obj.massCp;
                    delete line.mu;
                }
            }
        } else if (id === "fruit_tree") {
            // fruit_tree has biomass (3 fruit = 198 cp) and wood (4 logs = 7056 cp)
            obj.massCp = 7254;
            if (Array.isArray(obj.lines)) {
                for (const line of obj.lines) {
                    if (line.class === "biomass") line.cp = 198;
                    else if (line.class === "wood") line.cp = 7056;
                    delete line.mu;
                }
            }
        } else if (id === "fruit_tree_bare") {
            obj.massCp = 7056;
            if (Array.isArray(obj.lines)) {
                for (const line of obj.lines) {
                    line.cp = 7056;
                    delete line.mu;
                }
            }
        } else if (id === "ironstone") {
            // ore_iron (2 * 2646 = 5292 cp) + stone (9920 cp: stone 3307 + rocks_small 6613) = 15212
            obj.massCp = 15212;
            if (Array.isArray(obj.lines)) {
                for (const line of obj.lines) {
                    if (line.class === "fe_ore") line.cp = 5292;
                    else if (line.class === "stone") line.cp = 9920;
                    delete line.mu;
                }
            }
        } else if (id === "copper_outcrop") {
            // ore_copper (2 * 2205 = 4410 cp) + stone (9920 cp: stone 3307 + rocks_small 6613) = 14330
            obj.massCp = 14330;
            if (Array.isArray(obj.lines)) {
                for (const line of obj.lines) {
                    if (line.class === "cu_ore") line.cp = 4410;
                    else if (line.class === "stone") line.cp = 9920;
                    delete line.mu;
                }
            }
        } else if (id === "gold_outcrop") {
            // gold (22 cp) + stone (9921 cp: stone 3307 + rocks_small 6614) = 9943
            obj.massCp = 9943;
            if (Array.isArray(obj.lines)) {
                for (const line of obj.lines) {
                    if (line.class === "au_ore") line.cp = 22;
                    else if (line.class === "stone") line.cp = 9921;
                    delete line.mu;
                }
            }
        } else if (obj.massMu != null) {
            obj.massCp = gToCp(obj.massMu);
            if (Array.isArray(obj.lines)) {
                if (obj.lines.length === 1) {
                    obj.lines[0].cp = obj.massCp;
                    delete obj.lines[0].mu;
                } else {
                    let totalMu = 0;
                    for (const line of obj.lines) totalMu += (line.mu || line.cp || 0);
                    let remCp = obj.massCp;
                    for (let i = 0; i < obj.lines.length; i++) {
                        const line = obj.lines[i];
                        if (i === obj.lines.length - 1) {
                            line.cp = remCp;
                        } else {
                            line.cp = Math.round(obj.massCp * (line.mu || line.cp) / totalMu);
                            remCp -= line.cp;
                        }
                        delete line.mu;
                    }
                }
            }
        }
        delete obj.massMu;

        // Yield postings
        if (obj.yield && Array.isArray(obj.yield.postings)) {
            if (id === "gold_outcrop") {
                obj.yield.postings[0].cp = 22;
                obj.yield.postings[1].cp = 22;
                obj.yield.postings[2].cp = 3307;
                obj.yield.postings[3].cp = 6614;
            } else if (id === "fruit_tree") {
                obj.yield.postings[0].cp = 198;
                obj.yield.postings[1].cp = 7056;
            } else if (id === "fruit_tree_bare") {
                obj.yield.postings[0].cp = 5292;
                obj.yield.postings[1].cp = 1764;
            } else if (id === "ironstone") {
                obj.yield.postings[0].cp = 5292;
                obj.yield.postings[1].cp = 3307;
                obj.yield.postings[2].cp = 6613;
            } else if (id === "copper_outcrop") {
                obj.yield.postings[0].cp = 4410;
                obj.yield.postings[1].cp = 3307;
                obj.yield.postings[2].cp = 6613;
            } else {
                let itemSum = 0;
                let remainderPosting = null;
                for (const p of obj.yield.postings) {
                    if (p.item && items[p.item]) {
                        p.cp = p.count * items[p.item].massCp;
                        itemSum += p.cp;
                    } else {
                        remainderPosting = p;
                    }
                    delete p.mu;
                    delete p.du;
                }
                if (remainderPosting) {
                    remainderPosting.cp = obj.massCp - itemSum;
                } else if (obj.yield.postings.length === 1 && !obj.yield.postings[0].item) {
                    obj.yield.postings[0].cp = obj.massCp;
                }
            }
            for (const p of obj.yield.postings) {
                delete p.mu;
                delete p.du;
            }
        }

        // Collapse postings
        if (obj.collapse && Array.isArray(obj.collapse.postings)) {
            if (id === "wall_brick") {
                obj.collapse.postings[0].cp = 265;
                obj.collapse.postings[1].cp = 882;
            } else if (id === "wall_ashlar") {
                obj.collapse.postings[0].cp = 265;
                obj.collapse.postings[1].cp = 1322;
            } else if (id === "gold_outcrop") {
                obj.collapse.postings[0].cp = 22;
                obj.collapse.postings[1].cp = 9921;
            } else if (id === "fruit_tree") {
                obj.collapse.postings[0].cp = 198;
                obj.collapse.postings[1].cp = 7056;
            } else if (id === "fruit_tree_bare") {
                obj.collapse.postings[0].cp = 5292;
                obj.collapse.postings[1].cp = 1764;
            } else if (id === "ironstone") {
                obj.collapse.postings[0].cp = 5292;
                obj.collapse.postings[1].cp = 9920;
            } else if (id === "copper_outcrop") {
                obj.collapse.postings[0].cp = 4410;
                obj.collapse.postings[1].cp = 9920;
            } else {
                let itemSum = 0;
                let remainderPosting = null;
                for (const p of obj.collapse.postings) {
                    if (p.item && items[p.item]) {
                        p.cp = p.count * items[p.item].massCp;
                        itemSum += p.cp;
                    } else {
                        remainderPosting = p;
                    }
                    delete p.mu;
                    delete p.du;
                }
                if (remainderPosting) {
                    remainderPosting.cp = obj.massCp - itemSum;
                } else if (obj.collapse.postings.length === 1 && !obj.collapse.postings[0].item) {
                    obj.collapse.postings[0].cp = obj.massCp;
                }
            }
            for (const p of obj.collapse.postings) {
                delete p.mu;
                delete p.du;
            }
        }
    }

    // 4. Materials
    matOrig.massUnit = "cp";
    delete matOrig.mu;

    const materials = matOrig.materials;
    const matById = {};
    for (const m of materials) matById[m.id] = m;

    for (const m of materials) {
        if (m.ledger && m.ledger.unit) {
            m.ledger.unit = "cp";
        }

        if (m.id === "water") {
            m.cpPerStratum = WATER_CP_PER_STRATUM; // 312000
            delete m.massPerSlice;
            delete m.muPerDu;
            delete m.muPerDuStatus;
            delete m.kgPerDu;
            delete m.perDuStatus;
            delete m.perDuSource;
            delete m.layerDu;
            delete m.layerDuStatus;
            delete m.layerDuSource;
            m.massStatus = "SOURCED";
            m.massSource = "docs/OWNER_DECISIONS.md DEC-038";
        } else if (m.id === "lava") {
            m.cpPerStratum = 905218; // lava = basalt 905,218
            delete m.massPerSlice;
            delete m.muPerDu;
            delete m.muPerDuStatus;
            delete m.kgPerDu;
            delete m.perDuStatus;
            if (m.solidify) {
                m.solidify.basaltCp = 905218;
                delete m.solidify.basaltKg;
                delete m.solidify.remainderRubbleKg;
            }
        } else if (m.id === "ice") {
            m.cpPerStratum = WATER_CP_PER_STRATUM; // 312000
            delete m.massPerSlice;
            delete m.duPerSlice;
        } else if (m.kgPerSlice != null) {
            m.cpPerStratum = kgToCp(m.kgPerSlice);
            if (m.ledger && m.ledger.composition) {
                let den = 0;
                for (const k of Object.keys(m.ledger.composition)) den += m.ledger.composition[k];
                if (den && m.cpPerStratum % den !== 0) {
                    m.cpPerStratum = Math.round(m.cpPerStratum / den) * den;
                }
            }
            delete m.massPerSlice;
        } else if (m.massless) {
            m.cpPerStratum = 0;
            delete m.massPerSlice;
        }

        // Support load
        if (m.supportLoadKgPerSlice != null) {
            m.supportLoadCpPerSlice = kgToCp(m.supportLoadKgPerSlice);
            delete m.supportLoadMuPerSlice;
            delete m.supportLoadMuSource;
            delete m.supportLoadMuStatus;
        }

        // Bill
        if (m.bill && Array.isArray(m.bill.lines)) {
            for (const line of m.bill.lines) {
                line.cp = m.cpPerStratum;
                delete line.mu;
            }
            m.bill.totalCp = m.cpPerStratum;
            delete m.bill.totalMu;
        }

        // speciesScale
        if (m.speciesScale) {
            for (const spId of Object.keys(m.speciesScale)) {
                const sp = matById[spId] || materials.find(x => x.id === spId);
                if (sp && sp.densityKgM3 != null) {
                    const kg = divRound(m.kgPerSlice * sp.densityKgM3, 750);
                    m.speciesScale[spId] = kgToCp(kg);
                }
            }
        }

        // Special handling for unmapped alloys / metals
        if (m.id === "tin") {
            m.unmapped.cp = m.cpPerStratum;
            delete m.unmapped.mu;
            for (const kind of ["yield", "collapse"]) {
                if (m[kind] && Array.isArray(m[kind].postings)) {
                    m[kind].postings[0].cp = 0;
                    m[kind].postings[0].unmappedCp = m.cpPerStratum;
                    delete m[kind].postings[0].mu;
                    delete m[kind].postings[0].unmappedMu;
                }
            }
        } else if (m.id === "bronze") {
            const snCp = Math.round(m.cpPerStratum * 120 / 1000);
            const cuCp = m.cpPerStratum - snCp;
            m.unmapped.cp = snCp;
            delete m.unmapped.mu;
            for (const kind of ["yield", "collapse"]) {
                if (m[kind] && Array.isArray(m[kind].postings)) {
                    m[kind].postings[0].cp = cuCp;
                    m[kind].postings[0].unmappedCp = snCp;
                    delete m[kind].postings[0].mu;
                    delete m[kind].postings[0].unmappedMu;
                }
            }
            if (m.reclaim) {
                m.reclaim.mappedCp = cuCp;
                m.reclaim.unmappedCp = snCp;
                delete m.reclaim.mappedMu;
                delete m.reclaim.unmappedMu;
            }
        } else {
            // General Yield and Collapse for materials
            for (const kind of ["yield", "collapse"]) {
                if (m[kind] && Array.isArray(m[kind].postings)) {
                    let itemSum = 0;
                    let remainderPosting = null;
                    let itemPosting = null;
                    for (const p of m[kind].postings) {
                        if (p.item && items[p.item]) {
                            itemPosting = p;
                            if (p.count != null) {
                                if (p.count * items[p.item].massCp > m.cpPerStratum) {
                                    p.count = Math.floor(m.cpPerStratum / items[p.item].massCp);
                                }
                                p.cp = p.count * items[p.item].massCp;
                            } else {
                                p.cp = m.cpPerStratum;
                            }
                            itemSum += p.cp;
                        } else {
                            remainderPosting = p;
                        }
                        delete p.mu;
                        delete p.du;
                        delete p.unmappedMu;
                    }
                    if (remainderPosting) {
                        remainderPosting.cp = m.cpPerStratum - itemSum;
                    } else if (m[kind].postings.length === 1 && !m[kind].postings[0].item) {
                        m[kind].postings[0].cp = m.cpPerStratum;
                    } else if (itemPosting && itemSum < m.cpPerStratum) {
                        const fromCls = itemPosting.fromClass || (m.ledger && m.ledger.class);
                        const fromFm = itemPosting.fromForm || m.ledgerForm || "strata";
                        let remCls = fromCls;
                        let remFm = "strata";
                        let remProc = "identity";
                        let gap = undefined;
                        let debris = undefined;

                        if (m.id === "stone_vault") {
                            remCls = "rubble";
                            remFm = "strata";
                            remProc = "break";
                        } else if (m.id === "timber_wall" || m.id === "timber_post") {
                            remCls = "wood";
                            remFm = "object";
                            remProc = "identity";
                            gap = "D-WOOD-LOOSE";
                            debris = "broken_timber";
                        } else if (m.id === "iron_grate") {
                            remCls = "fe_metal";
                            remFm = "item";
                            remProc = "salvage";
                            gap = "D-SCRAP-FORM";
                            debris = "scrap";
                        }

                        const newRem = {
                            process: remProc,
                            fromClass: fromCls,
                            fromForm: fromFm,
                            class: remCls,
                            form: remFm,
                            cp: m.cpPerStratum - itemSum,
                            note: "Sub-item remainder"
                        };
                        if (gap) newRem.gap = gap;
                        if (debris) newRem.debrisMaterial = debris;
                        m[kind].postings.push(newRem);
                    }
                }
            }
        }

        // Unmapped
        if (m.unmapped && m.unmapped.mu != null) {
            m.unmapped.cp = gToCp(m.unmapped.mu);
            delete m.unmapped.mu;
        }
    }

    return { materials: matOrig, masses: massesOrig };
}

function validateCheck(matJson, massJson) {
    if (!matJson) matJson = readJson(MAT_PATH);
    if (!massJson) massJson = readJson(MASS_PATH);
    const errors = [];
    if (matJson.massUnit !== "cp") errors.push("materials.json: massUnit must be 'cp'");
    if (matJson.mu != null) errors.push("materials.json: legacy mu block must not be present");
    if (massJson.massUnit !== "cp") errors.push("mass_tables.json: massUnit must be 'cp'");
    if (massJson.muRef != null) errors.push("mass_tables.json: legacy muRef must not be present");

    for (const m of (matJson.materials || [])) {
        if (m.massPerSlice != null) errors.push(`materials.json: ${m.id} has legacy massPerSlice`);
        if (m.muPerDu != null) errors.push(`materials.json: ${m.id} has legacy muPerDu`);
        if (m.supportLoadMuPerSlice != null) errors.push(`materials.json: ${m.id} has legacy supportLoadMuPerSlice`);
        if (m.ledger && m.ledger.unit && m.ledger.unit !== "cp") errors.push(`materials.json: ${m.id} ledger.unit must be cp`);

        if (m.id === "water") {
            if (m.cpPerStratum !== 312000) errors.push("materials.json: water cpPerStratum must be 312000");
        } else if (m.id === "lava") {
            if (m.cpPerStratum !== 905218) errors.push("materials.json: lava cpPerStratum must be 905218");
        } else if (m.id === "ice") {
            if (m.cpPerStratum !== 312000) errors.push("materials.json: ice cpPerStratum must be 312000");
        } else if (m.massless) {
            if (m.cpPerStratum !== 0) errors.push(`materials.json: ${m.id} massless cpPerStratum must be 0`);
        } else if (m.kgPerSlice != null) {
            let exp = kgToCp(m.kgPerSlice);
            if (m.ledger && m.ledger.composition) {
                let den = 0;
                for (const k of Object.keys(m.ledger.composition)) den += m.ledger.composition[k];
                if (den && exp % den !== 0) exp = Math.round(exp / den) * den;
            }
            if (m.cpPerStratum !== exp) errors.push(`materials.json: ${m.id} cpPerStratum ${m.cpPerStratum} != expected ${exp}`);
        }

        if (m.yield && Array.isArray(m.yield.postings)) {
            let sum = 0;
            for (const p of m.yield.postings) {
                if (p.mu != null || p.du != null) errors.push(`materials.json: ${m.id} yield posting has legacy mu/du`);
                sum += (p.cp || 0) + (p.unmappedCp || 0);
            }
            if (m.cpPerStratum != null && sum !== m.cpPerStratum) {
                errors.push(`materials.json: ${m.id} yield postings sum ${sum} != cpPerStratum ${m.cpPerStratum}`);
            }
        }
        if (m.collapse && Array.isArray(m.collapse.postings)) {
            let sum = 0;
            for (const p of m.collapse.postings) {
                if (p.mu != null || p.du != null) errors.push(`materials.json: ${m.id} collapse posting has legacy mu/du`);
                sum += (p.cp || 0) + (p.unmappedCp || 0);
            }
            if (m.cpPerStratum != null && sum !== m.cpPerStratum) {
                errors.push(`materials.json: ${m.id} collapse postings sum ${sum} != cpPerStratum ${m.cpPerStratum}`);
            }
        }
    }

    const items = massJson.items || {};
    for (const [id, item] of Object.entries(items)) {
        if (item.massMu != null) errors.push(`mass_tables.json: item ${id} has legacy massMu`);
        if (item.ledger && item.ledger.unit && item.ledger.unit !== "cp") errors.push(`mass_tables.json: item ${id} ledger.unit must be cp`);
    }

    const objects = massJson.objects || {};
    for (const [id, obj] of Object.entries(objects)) {
        if (obj.massMu != null) errors.push(`mass_tables.json: object ${id} has legacy massMu`);
        if (obj.bill && Array.isArray(obj.bill)) {
            let sum = 0;
            for (const b of obj.bill) {
                if (b.mu != null) errors.push(`mass_tables.json: object ${id} bill has legacy mu`);
                sum += (b.cp || 0);
            }
            if (sum !== obj.massCp) errors.push(`mass_tables.json: object ${id} bill sum ${sum} != massCp ${obj.massCp}`);
        }
        if (obj.lines && Array.isArray(obj.lines)) {
            let sum = 0;
            for (const l of obj.lines) {
                if (l.mu != null) errors.push(`mass_tables.json: object ${id} lines has legacy mu`);
                sum += (l.cp || 0);
            }
            if (sum !== obj.massCp) errors.push(`mass_tables.json: object ${id} lines sum ${sum} != massCp ${obj.massCp}`);
        }
        const startKeys = {};
        if (Array.isArray(obj.lines)) {
            for (const l of obj.lines) startKeys[l.class + "|" + (l.form || "object")] = 1;
        }
        if (obj.yield && Array.isArray(obj.yield.postings)) {
            let sum = 0;
            for (const p of obj.yield.postings) {
                if (p.mu != null) errors.push(`mass_tables.json: object ${id} yield posting has legacy mu`);
                if (startKeys[p.fromClass + "|" + (p.fromForm || "object")]) {
                    sum += (p.cp || 0);
                }
            }
            if (sum !== obj.massCp) errors.push(`mass_tables.json: object ${id} yield postings sum ${sum} != massCp ${obj.massCp}`);
        }
        if (obj.collapse && Array.isArray(obj.collapse.postings)) {
            let sum = 0;
            for (const p of obj.collapse.postings) {
                if (p.mu != null) errors.push(`mass_tables.json: object ${id} collapse posting has legacy mu`);
                if (startKeys[p.fromClass + "|" + (p.fromForm || "object")]) {
                    sum += (p.cp || 0);
                }
            }
            if (sum !== obj.massCp) errors.push(`mass_tables.json: object ${id} collapse postings sum ${sum} != massCp ${obj.massCp}`);
        }
    }

    return errors;
}

function main() {
    const isCheck = process.argv.includes("--check");
    const matRaw = fs.readFileSync(MAT_PATH, "utf8");
    const massRaw = fs.readFileSync(MASS_PATH, "utf8");
    const matJson = JSON.parse(matRaw);
    const massJson = JSON.parse(massRaw);

    if (isCheck) {
        const errors = validateCheck(matJson, massJson);
        if (errors.length === 0) {
            console.log("CHECK: OK (materials.json and mass_tables.json are integer centipounds)");
            process.exit(0);
        } else {
            console.error("CHECK: FAIL (" + errors.length + " errors)");
            for (const e of errors.slice(0, 10)) console.error("  " + e);
            process.exit(1);
        }
    }

    // Apply migration
    console.log("Migrating materials.json and mass_tables.json to integer centipounds...");
    const { materials: migratedMat, masses: migratedMasses } = migrate(matJson, massJson);

    const postErrors = validateCheck(migratedMat, migratedMasses);
    if (postErrors.length > 0) {
        console.error("MIGRATION VALIDATION FAILED (" + postErrors.length + " errors):");
        for (const e of postErrors) console.error("  " + e);
        process.exit(1);
    }

    fs.writeFileSync(MAT_PATH, JSON.stringify(migratedMat, null, 2) + "\n", "utf8");
    fs.writeFileSync(MASS_PATH, JSON.stringify(migratedMasses, null, 2) + "\n", "utf8");
    console.log("SUCCESS: Written migrated materials.json and mass_tables.json (0 validation errors)");
}

if (require.main === module) {
    main();
}

module.exports = { migrate, validateCheck };
