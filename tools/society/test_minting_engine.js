#!/usr/bin/env node
"use strict";

// SOC.30.01 / INV-SOC-05 / INV-SOC-06 headless gate.
// The negative fixtures below cover every public refusal and conservation rule.
// Source mutants prove that the checks are capable of failing.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..", "..");
const PLUGIN_PATH = path.join(ROOT, "game", "js", "plugins", "DEUS_Mint.js");
const REGISTRY_PATH = path.join(ROOT, "game", "data", "DEUS_ResourceRegistry.json");
const CATALOG_PATH = path.join(ROOT, "game", "data", "UF_WorldCatalog.json");
const SRD_RULES_PATH = path.join(ROOT, "game", "data", "srd51", "rules.json");
const DOC_PATH = path.join(ROOT, "docs", "systems", "DEUS_MintingEngine.md");

const SOURCE = fs.readFileSync(PLUGIN_PATH, "utf8").replace(/\r\n/g, "\n");
const REGISTRY = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
const CATALOG = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
const SRD_RULES = JSON.parse(fs.readFileSync(SRD_RULES_PATH, "utf8"));
const DOC = fs.readFileSync(DOC_PATH, "utf8");

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function same(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}

function loadMint(source = SOURCE) {
    const sandbox = {
        module: { exports: {} },
        exports: {},
        console,
        JSON,
        Math,
        Number,
        Object,
        Array,
        Set,
        Error
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox, { filename: PLUGIN_PATH });
    return { api: sandbox.module.exports, attached: sandbox.UF && sandbox.UF.Mint };
}

function authority(registry = REGISTRY, itemTypes = CATALOG.items.types) {
    return { resourceRegistry: clone(registry), itemTypes: clone(itemTypes), coinsPerPound: 50 };
}

function caughtCode(fn) {
    try {
        fn();
        return null;
    } catch (error) {
        return error && error.code ? error.code : "THREW";
    }
}

function assayFor(engine, lotId, material, massQuanta) {
    const description = engine.describe();
    const denomination = Object.values(description.denominations).find(row => row.metal === material);
    if (!denomination) throw new Error("no denomination recipe for " + material);
    const components = {};
    for (const component of Object.keys(denomination.components)) {
        components[component] = massQuanta * denomination.components[component] / description.quantaPerCoin;
    }
    return { lotId, material, massQuanta, components };
}

function stateWithLot(engine, material, massQuanta, id = "lot-1", extras = {}) {
    return engine.createState(Object.assign({
        stores: {
            monetaryMetalLots: [{ id, material, massQuanta }],
            goods: { food: 900, tools: 4 },
            abstractBalanceCp: 999999
        },
        treasury: {
            coinStacks: [],
            balanceCp: 888888
        }
    }, clone(extras)));
}

function mintRequest(engine, denomination, lotId, material, assayMass, quantity = 1) {
    return {
        denomination,
        quantity,
        mintFaction: "TEST_FACTION",
        mintEra: 7,
        assay: assayFor(engine, lotId, material, assayMass)
    };
}

function addCheck(checks, name, pass, detail) {
    checks.push({ name, pass: !!pass, detail: String(detail) });
}

function refusalCheck(checks, name, input, result, code) {
    const unchanged = same(input, JSON.parse(JSON.stringify(input)));
    addCheck(checks, name, !!result && result.ok === false && result.code === code && unchanged,
        `expected ${code}; got ${result && result.code}; input unchanged=${unchanged}`);
}

function runCoreChecks(Mint, attached) {
    const checks = [];
    let engine;
    try {
        engine = Mint.createEngine(authority());
        addCheck(checks, "authority_compiles", true, "frozen registry + tracked item/SRD weight accepted");
    } catch (error) {
        addCheck(checks, "authority_compiles", false, error.stack || error.message);
        return checks;
    }

    const srdCurrency = SRD_RULES.entries.find(entry => entry && typeof entry.text === "string" && entry.text.includes("fifty coins weigh a pound"));
    const goldCoin = CATALOG.items.types.find(item => item.id === "gold_coin");
    const description = engine.describe();
    addCheck(checks, "plugin_exports_and_attaches_one_api", Mint === attached, "CommonJS export and UF.Mint are the same object");
    addCheck(checks, "srd_coin_weight_source_tracked", !!srdCurrency && /standard coin weighs about a third of an ounce/i.test(srdCurrency.text),
        srdCurrency ? "game/data/srd51/rules.json entry found" : "currency entry missing");
    addCheck(checks, "item_registry_coin_weight_matches_srd", !!goldCoin && goldCoin.weight === 0.02 && goldCoin.weight * 50 === 1,
        goldCoin ? `gold_coin weight=${goldCoin.weight}` : "gold_coin missing");
    addCheck(checks, "registered_denominations_and_values", same(description.denominationIds, ["cp", "sp", "ep", "gp", "pp"]) &&
        description.denominations.cp.valueInCp === 1 && description.denominations.sp.valueInCp === 10 &&
        description.denominations.ep.valueInCp === 50 && description.denominations.gp.valueInCp === 100 &&
        description.denominations.pp.valueInCp === 1000, JSON.stringify(description.denominations));
    addCheck(checks, "integer_mass_scale_from_registered_composition", description.quantaPerCoin === 2 &&
        description.quantaPerPound === 100 && description.coinsPerPound === 50 &&
        same(description.denominations.ep.components, { GOLD: 1, SILVER: 1 }),
        `coin=${description.quantaPerCoin}q pound=${description.quantaPerPound}q ep=${JSON.stringify(description.denominations.ep.components)}`);
    addCheck(checks, "batch_bound_is_arithmetic_not_policy", Number.isSafeInteger(description.maxBatchCoins) &&
        description.maxBatchCoins * description.quantaPerCoin <= Number.MAX_SAFE_INTEGER,
        `max=${description.maxBatchCoins}`);
    addCheck(checks, "deterministic_source_has_no_clock_or_rng", !/Math\s*\.\s*random|Date\s*\.|crypto\s*\./.test(SOURCE),
        "no random, clock, or crypto identifiers");

    // Every denomination mints, reports an explicit remainder, remelts, and returns byte-for-byte state.
    const roundTripDetails = [];
    let everyRoundTrip = true;
    for (const denominationId of description.denominationIds) {
        const row = description.denominations[denominationId];
        const initial = stateWithLot(engine, row.metal, 10, "roundtrip-" + denominationId);
        const before = engine.measure(initial);
        const minted = engine.mint(initial, mintRequest(engine, denominationId, "roundtrip-" + denominationId, row.metal, 8, 3));
        const afterMint = minted.ok ? engine.measure(minted.state) : null;
        const remelted = minted.ok ? engine.remelt(minted.state, { stackIndex: 0, quantity: 3, outputLotId: "roundtrip-" + denominationId }) : minted;
        const after = remelted.ok ? engine.measure(remelted.state) : null;
        const okay = minted.ok && remelted.ok && minted.result.consumedMassQuanta === 6 && minted.result.assayRemainderQuanta === 2 &&
            same(before.total, afterMint.total) && same(before.total, after.total) && same(initial, remelted.state);
        everyRoundTrip = everyRoundTrip && okay;
        roundTripDetails.push(`${denominationId}:${okay ? "ok" : (minted.code || remelted.code || "mismatch")}`);
    }
    addCheck(checks, "all_denominations_exact_round_trip", everyRoundTrip, roundTripDetails.join(" "));

    const deterministicState = stateWithLot(engine, "GOLD", 20, "deterministic-gold");
    const deterministicRequest = mintRequest(engine, "gp", "deterministic-gold", "GOLD", 10, 4);
    const deterministicA = engine.mint(deterministicState, deterministicRequest);
    const deterministicB = engine.mint(clone(deterministicState), clone(deterministicRequest));
    addCheck(checks, "mint_is_deterministic_and_input_immutable", deterministicA.ok && deterministicB.ok && same(deterministicA, deterministicB) &&
        deterministicState.stores.monetaryMetalLots[0].massQuanta === 20 && deterministicState.treasury.coinStacks.length === 0,
        `equal=${same(deterministicA, deterministicB)} inputMass=${deterministicState.stores.monetaryMetalLots[0].massQuanta}`);

    const mergeFirst = engine.mint(stateWithLot(engine, "SILVER", 12, "merge-silver"),
        mintRequest(engine, "sp", "merge-silver", "SILVER", 12, 2));
    const mergeSecond = mergeFirst.ok ? engine.mint(mergeFirst.state,
        mintRequest(engine, "sp", "merge-silver", "SILVER", 8, 2)) : mergeFirst;
    addCheck(checks, "same_provenance_merges_first_matching_stack", mergeSecond.ok && mergeSecond.state.treasury.coinStacks.length === 1 &&
        mergeSecond.state.treasury.coinStacks[0].quantity === 4 && mergeSecond.state.stores.monetaryMetalLots[0].massQuanta === 4,
        mergeSecond.ok ? JSON.stringify(mergeSecond.state) : mergeSecond.code);

    const partialMint = engine.mint(stateWithLot(engine, "COPPER", 8, "partial-copper"),
        mintRequest(engine, "cp", "partial-copper", "COPPER", 8, 3));
    const partialRemelt = partialMint.ok ? engine.remelt(partialMint.state, { stackIndex: 0, quantity: 1, outputLotId: "partial-copper" }) : partialMint;
    addCheck(checks, "partial_remelt_keeps_coin_remainder_and_returns_all_mass", partialRemelt.ok &&
        partialRemelt.state.treasury.coinStacks[0].quantity === 2 &&
        partialRemelt.state.stores.monetaryMetalLots[0].massQuanta === 4 && partialRemelt.result.returnedMassQuanta === 2,
        partialRemelt.ok ? JSON.stringify(partialRemelt.state) : partialRemelt.code);

    const epState = stateWithLot(engine, "ELECTRUM", 8, "ep-lot");
    const epMint = engine.mint(epState, mintRequest(engine, "ep", "ep-lot", "ELECTRUM", 8, 3));
    addCheck(checks, "electrum_preserves_equal_integer_components", epMint.ok &&
        epMint.result.components.GOLD === 1 && epMint.result.components.SILVER === 1 &&
        epMint.state.stores.monetaryMetalLots[0].massQuanta === 2 &&
        same(engine.measure(epState).total, engine.measure(epMint.state).total),
        epMint.ok ? JSON.stringify(engine.measure(epMint.state).total) : epMint.code);

    // Targeted negative fixtures. Each checks an exact refusal code and non-mutation.
    const negativeFixtures = [];
    function negative(name, code, build) {
        negativeFixtures.push({ name, code, build });
    }

    negative("refuse_state_schema", "E_STATE", () => {
        const state = { schemaVersion: 99, stores: { monetaryMetalLots: [] }, treasury: { coinStacks: [] } };
        return [state, () => engine.mint(state, {})];
    });
    negative("refuse_invalid_stores_compartment", "E_STATE", () => {
        const state = { stores: "abstract", treasury: { coinStacks: [] } };
        return [state, () => engine.mint(state, {})];
    });
    negative("refuse_non_object_mint_request", "E_REQUEST", () => {
        const state = stateWithLot(engine, "GOLD", 2);
        return [state, () => engine.mint(state, null)];
    });
    negative("refuse_unknown_denomination", "E_DENOMINATION", () => {
        const state = stateWithLot(engine, "GOLD", 2);
        const request = mintRequest(engine, "gp", "lot-1", "GOLD", 2);
        request.denomination = "xp";
        return [state, () => engine.mint(state, request)];
    });
    negative("refuse_zero_batch", "E_BATCH_BOUNDS", () => {
        const state = stateWithLot(engine, "GOLD", 2);
        return [state, () => engine.mint(state, mintRequest(engine, "gp", "lot-1", "GOLD", 2, 0))];
    });
    negative("refuse_unsafe_batch", "E_BATCH_BOUNDS", () => {
        const state = stateWithLot(engine, "GOLD", 2);
        return [state, () => engine.mint(state, mintRequest(engine, "gp", "lot-1", "GOLD", 2, Number.MAX_SAFE_INTEGER))];
    });
    negative("refuse_missing_mint_faction", "E_PROVENANCE", () => {
        const state = stateWithLot(engine, "GOLD", 2);
        const request = mintRequest(engine, "gp", "lot-1", "GOLD", 2);
        request.mintFaction = "";
        return [state, () => engine.mint(state, request)];
    });
    negative("refuse_missing_mint_era", "E_PROVENANCE", () => {
        const state = stateWithLot(engine, "GOLD", 2);
        const request = mintRequest(engine, "gp", "lot-1", "GOLD", 2);
        request.mintEra = Infinity;
        return [state, () => engine.mint(state, request)];
    });
    negative("refuse_missing_explicit_assay", "E_ASSAY_REQUIRED", () => {
        const state = stateWithLot(engine, "GOLD", 2);
        const request = mintRequest(engine, "gp", "lot-1", "GOLD", 2);
        delete request.assay;
        return [state, () => engine.mint(state, request)];
    });
    negative("refuse_assay_lot_not_in_stores", "E_STORES", () => {
        const state = stateWithLot(engine, "GOLD", 2);
        return [state, () => engine.mint(state, mintRequest(engine, "gp", "missing", "GOLD", 2))];
    });
    negative("refuse_assay_material_mismatch", "E_ASSAY", () => {
        const state = stateWithLot(engine, "GOLD", 2);
        const request = mintRequest(engine, "gp", "lot-1", "GOLD", 2);
        request.assay.material = "SILVER";
        return [state, () => engine.mint(state, request)];
    });
    negative("refuse_denomination_material_mismatch", "E_MATERIAL", () => {
        const state = stateWithLot(engine, "GOLD", 2);
        return [state, () => engine.mint(state, mintRequest(engine, "sp", "lot-1", "GOLD", 2))];
    });
    negative("refuse_zero_assay_mass", "E_ASSAY", () => {
        const state = stateWithLot(engine, "GOLD", 2);
        const request = mintRequest(engine, "gp", "lot-1", "GOLD", 2);
        request.assay.massQuanta = 0;
        request.assay.components.GOLD = 0;
        return [state, () => engine.mint(state, request)];
    });
    negative("refuse_assay_over_physical_stores", "E_INSUFFICIENT_STORES", () => {
        const state = stateWithLot(engine, "GOLD", 2);
        return [state, () => engine.mint(state, mintRequest(engine, "gp", "lot-1", "GOLD", 4))];
    });
    negative("refuse_wrong_pure_assay_composition", "E_ASSAY_COMPOSITION", () => {
        const state = stateWithLot(engine, "GOLD", 4);
        const request = mintRequest(engine, "gp", "lot-1", "GOLD", 4);
        request.assay.components = { GOLD: 3, SILVER: 1 };
        return [state, () => engine.mint(state, request)];
    });
    negative("refuse_unbalanced_electrum_assay", "E_ASSAY_COMPOSITION", () => {
        const state = stateWithLot(engine, "ELECTRUM", 4);
        const request = mintRequest(engine, "ep", "lot-1", "ELECTRUM", 4);
        request.assay.components = { GOLD: 3, SILVER: 1 };
        return [state, () => engine.mint(state, request)];
    });
    negative("refuse_insufficient_assayed_mass", "E_INSUFFICIENT_ASSAY", () => {
        const state = stateWithLot(engine, "GOLD", 8);
        return [state, () => engine.mint(state, mintRequest(engine, "gp", "lot-1", "GOLD", 2, 2))];
    });
    negative("refuse_unregistered_stored_material", "E_STATE", () => {
        const state = { stores: { monetaryMetalLots: [{ id: "lot-1", material: "IRON", massQuanta: 2 }] }, treasury: { coinStacks: [] } };
        return [state, () => engine.mint(state, {})];
    });
    negative("refuse_fractional_electrum_lot", "E_STATE", () => {
        const state = { stores: { monetaryMetalLots: [{ id: "lot-1", material: "ELECTRUM", massQuanta: 3 }] }, treasury: { coinStacks: [] } };
        return [state, () => engine.mint(state, {})];
    });
    negative("refuse_coin_stack_metal_mismatch", "E_STATE", () => {
        const state = { stores: { monetaryMetalLots: [] }, treasury: { coinStacks: [{ denomination: "gp", metal: "SILVER", mintFaction: "TEST", mintEra: 1, quantity: 1 }] } };
        return [state, () => engine.remelt(state, { stackIndex: 0, quantity: 1, outputLotId: "out" })];
    });
    negative("refuse_treasury_balance_as_mint_metal", "E_STORES", () => {
        const state = engine.createState({ stores: { monetaryMetalLots: [], goods: { gold_ingot: 999 } }, treasury: { coinStacks: [], balanceCp: 999999 } });
        const request = { denomination: "gp", quantity: 1, mintFaction: "TEST", mintEra: 1,
            assay: { lotId: "abstract", material: "GOLD", massQuanta: 2, components: { GOLD: 2 } } };
        return [state, () => engine.mint(state, request)];
    });
    negative("refuse_stores_coins_as_treasury_stack", "E_TREASURY", () => {
        const state = engine.createState({ stores: { monetaryMetalLots: [], coinStacks: [{ denomination: "gp", quantity: 4 }] }, treasury: { coinStacks: [] } });
        return [state, () => engine.remelt(state, { stackIndex: 0, quantity: 1, outputLotId: "out" })];
    });
    negative("refuse_missing_treasury_stack", "E_TREASURY", () => {
        const state = engine.createState({ stores: { monetaryMetalLots: [] }, treasury: { coinStacks: [] } });
        return [state, () => engine.remelt(state, { stackIndex: 2, quantity: 1, outputLotId: "out" })];
    });
    negative("refuse_non_object_remelt_request", "E_REQUEST", () => {
        const state = engine.createState({ stores: { monetaryMetalLots: [] }, treasury: { coinStacks: [] } });
        return [state, () => engine.remelt(state, null)];
    });
    negative("refuse_zero_remelt_batch", "E_BATCH_BOUNDS", () => {
        const minted = engine.mint(stateWithLot(engine, "GOLD", 2), mintRequest(engine, "gp", "lot-1", "GOLD", 2));
        return [minted.state, () => engine.remelt(minted.state, { stackIndex: 0, quantity: 0, outputLotId: "out" })];
    });
    negative("refuse_insufficient_treasury_coins", "E_INSUFFICIENT_COINS", () => {
        const minted = engine.mint(stateWithLot(engine, "GOLD", 2), mintRequest(engine, "gp", "lot-1", "GOLD", 2));
        return [minted.state, () => engine.remelt(minted.state, { stackIndex: 0, quantity: 2, outputLotId: "out" })];
    });
    negative("refuse_missing_remelt_output_id", "E_OUTPUT_LOT", () => {
        const minted = engine.mint(stateWithLot(engine, "GOLD", 2), mintRequest(engine, "gp", "lot-1", "GOLD", 2));
        return [minted.state, () => engine.remelt(minted.state, { stackIndex: 0, quantity: 1, outputLotId: "" })];
    });
    negative("refuse_remelt_output_material_conflict", "E_OUTPUT_LOT", () => {
        const state = engine.createState({
            stores: { monetaryMetalLots: [{ id: "out", material: "SILVER", massQuanta: 2 }] },
            treasury: { coinStacks: [{ denomination: "gp", metal: "GOLD", mintFaction: "TEST", mintEra: 1, quantity: 1 }] }
        });
        return [state, () => engine.remelt(state, { stackIndex: 0, quantity: 1, outputLotId: "out" })];
    });
    negative("refuse_mint_stack_overflow", "E_BOUNDS", () => {
        const state = {
            stores: { monetaryMetalLots: [{ id: "lot-1", material: "GOLD", massQuanta: 2 }] },
            treasury: { coinStacks: [{ denomination: "gp", metal: "GOLD", mintFaction: "TEST_FACTION", mintEra: 7, quantity: description.maxBatchCoins }] }
        };
        return [state, () => engine.mint(state, mintRequest(engine, "gp", "lot-1", "GOLD", 2))];
    });
    negative("refuse_remelt_lot_overflow", "E_BOUNDS", () => {
        const state = {
            stores: { monetaryMetalLots: [{ id: "out", material: "GOLD", massQuanta: Number.MAX_SAFE_INTEGER }] },
            treasury: { coinStacks: [{ denomination: "gp", metal: "GOLD", mintFaction: "TEST", mintEra: 1, quantity: 1 }] }
        };
        return [state, () => engine.remelt(state, { stackIndex: 0, quantity: 1, outputLotId: "out" })];
    });

    for (const fixture of negativeFixtures) {
        try {
            const pair = fixture.build();
            const snapshot = clone(pair[0]);
            const result = pair[1]();
            const unchanged = same(pair[0], snapshot);
            addCheck(checks, fixture.name, result && result.ok === false && result.code === fixture.code && unchanged,
                `expected=${fixture.code} actual=${result && result.code} unchanged=${unchanged}`);
        } catch (error) {
            addCheck(checks, fixture.name, false, error.stack || error.message);
        }
    }

    // Authority conflicts are fatal at compile time; no rule is silently selected.
    const missing = clone(REGISTRY);
    delete missing.currencyAndMinting.denominations.pp;
    addCheck(checks, "refuse_authority_missing_denomination", caughtCode(() => Mint.createEngine(authority(missing))) === "E_AUTHORITY", "pp removed");
    const wrongWeight = clone(CATALOG.items.types);
    wrongWeight.find(item => item.id === "gold_coin").weight = 0.01;
    addCheck(checks, "refuse_authority_coin_weight_conflict", caughtCode(() => Mint.createEngine(authority(REGISTRY, wrongWeight))) === "E_AUTHORITY_CONFLICT", "gold_coin=0.01 lb");
    const wrongElectrum = clone(REGISTRY);
    wrongElectrum.currencyAndMinting.denominations.ep.metalUnits.GOLD = 0.6;
    addCheck(checks, "refuse_authority_unbalanced_alloy", caughtCode(() => Mint.createEngine(authority(wrongElectrum))) === "E_AUTHORITY", "ep totals 1.1 units");
    const unconserved = clone(REGISTRY);
    unconserved.coreResourceClasses.GOLD.conserved = false;
    addCheck(checks, "refuse_authority_unconserved_component", caughtCode(() => Mint.createEngine(authority(unconserved))) === "E_AUTHORITY", "GOLD conserved=false");

    const requiredDocTokens = ["Purpose", "Public API", "Events", "Save data", "Checks", "Status", "E_INSUFFICIENT_ASSAY", "AUTHORITY_GAPS.md"];
    addCheck(checks, "system_doc_contract_complete", requiredDocTokens.every(token => DOC.includes(token)), requiredDocTokens.join(", "));
    return checks;
}

function editOnce(source, from, to) {
    const count = source.split(from).length - 1;
    if (count !== 1) throw new Error(`mutant anchor occurs ${count} times: ${from}`);
    return source.replace(from, to);
}

const MUTANTS = [
    {
        name: "mint_does_not_debit_store",
        kills: ["all_denominations_exact_round_trip"],
        from: "            lot.massQuanta -= neededMass;",
        to: "            lot.massQuanta += 0;"
    },
    {
        name: "assay_can_exceed_store",
        kills: ["refuse_assay_over_physical_stores"],
        from: "            if (assay.massQuanta > lot.massQuanta) return refuse(\"E_INSUFFICIENT_STORES\", \"assay exceeds the physical stored lot\");",
        to: "            if (false) return refuse(\"E_INSUFFICIENT_STORES\", \"assay exceeds the physical stored lot\");"
    },
    {
        name: "assay_composition_ignored",
        kills: ["refuse_wrong_pure_assay_composition", "refuse_unbalanced_electrum_assay"],
        from: "                if (!assayMatches(assay, lot.material)) return refuse(\"E_ASSAY_COMPOSITION\", \"assay does not match the registered material composition\");",
        to: "                if (false) return refuse(\"E_ASSAY_COMPOSITION\", \"assay does not match the registered material composition\");"
    },
    {
        name: "denomination_material_ignored",
        kills: ["refuse_denomination_material_mismatch"],
        from: "            if (lot.material !== denomination.metal) return refuse(\"E_MATERIAL\", \"stored monetary material does not match the denomination\");",
        to: "            if (false) return refuse(\"E_MATERIAL\", \"stored monetary material does not match the denomination\");"
    },
    {
        name: "remelt_loses_one_quantum",
        kills: ["all_denominations_exact_round_trip"],
        from: "            try { returnedMass = multiply(request.quantity, standard.quantaPerCoin, \"remelt mass\"); }",
        to: "            try { returnedMass = multiply(request.quantity, standard.quantaPerCoin, \"remelt mass\") - 1; }"
    },
    {
        name: "batch_bound_removed",
        kills: ["refuse_unsafe_batch"],
        from: "            if (!positiveSafeInteger(request.quantity) || request.quantity > standard.maxBatchCoins) {\n                return refuse(\"E_BATCH_BOUNDS\", \"quantity must be a positive safe bounded coin count\");\n            }\n            if (typeof request.mintFaction",
        to: "            if (!positiveSafeInteger(request.quantity)) {\n                return refuse(\"E_BATCH_BOUNDS\", \"quantity must be a positive safe bounded coin count\");\n            }\n            if (typeof request.mintFaction"
    }
];

function main() {
    console.log("=== CONSERVED PHYSICAL MINTING (SOC.30.01 / INV-SOC-05 / INV-SOC-06) ===");
    const loaded = loadMint();
    const checks = runCoreChecks(loaded.api, loaded.attached);
    let passed = 0;
    let failed = 0;
    for (const check of checks) {
        console.log(`  [${check.pass ? "PASS" : "FAIL"}] ${check.name}: ${check.detail}`);
        if (check.pass) passed++;
        else failed++;
    }

    console.log("\n--- Mutation sensitivity ---");
    if (failed === 0) {
        const baseByName = new Map(checks.map(check => [check.name, check]));
        for (const mutant of MUTANTS) {
            try {
                const source = editOnce(SOURCE, mutant.from, mutant.to);
                const mutated = loadMint(source);
                const mutantChecks = runCoreChecks(mutated.api, mutated.attached);
                const mutantByName = new Map(mutantChecks.map(check => [check.name, check]));
                const controls = mutant.kills.filter(name => !baseByName.has(name) || !baseByName.get(name).pass);
                const killedBy = mutant.kills.filter(name => mutantByName.has(name) && !mutantByName.get(name).pass);
                const killed = controls.length === 0 && killedBy.length > 0;
                console.log(`  [${killed ? "PASS" : "FAIL"}] mutant_${mutant.name}_killed: ${killedBy.join(", ") || "survived"}`);
                if (killed) passed++;
                else failed++;
            } catch (error) {
                console.log(`  [FAIL] mutant_${mutant.name}_killed: ${error.message}`);
                failed++;
            }
        }
    } else {
        console.log("  [FAIL] mutants_skipped: real module checks failed");
        failed++;
    }

    console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
}

main();
