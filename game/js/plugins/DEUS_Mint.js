//=============================================================================
// DEUS_Mint.js - Conserved physical minting and remelting
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Mint] Deterministic integer-mass mint/remelt core.
 * @author DEUS project
 *
 * @help
 * This plugin is a bounded, data-compiled transformation service. It does not
 * decide assay methods, mint authorization, fees, loss, value, or ownership.
 * See docs/systems/DEUS_MintingEngine.md for the public API and authority map.
 */

(() => {
    "use strict";

    const root = typeof window !== "undefined" ? window : globalThis;
    const EXPECTED_DENOMINATIONS = ["cp", "sp", "ep", "gp", "pp"];
    const STATE_SCHEMA_VERSION = 1;
    const MAX_SAFE = Number.MAX_SAFE_INTEGER;

    function fault(code, message) {
        const error = new Error(code + ": " + message);
        error.code = code;
        return error;
    }

    function isRecord(value) {
        return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    function has(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    function copy(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function positiveSafeInteger(value) {
        return Number.isSafeInteger(value) && value > 0;
    }

    function nonNegativeSafeInteger(value) {
        return Number.isSafeInteger(value) && value >= 0;
    }

    function add(left, right, label) {
        const value = left + right;
        if (!Number.isSafeInteger(value) || value < 0) throw fault("E_BOUNDS", label + " exceeds integer mass bounds");
        return value;
    }

    function multiply(left, right, label) {
        const value = left * right;
        if (!Number.isSafeInteger(value) || value < 0) throw fault("E_BOUNDS", label + " exceeds integer mass bounds");
        return value;
    }

    function gcd(a, b) {
        while (b !== 0) {
            const next = a % b;
            a = b;
            b = next;
        }
        return a;
    }

    function lcm(a, b) {
        return multiply(a / gcd(a, b), b, "authority denominator");
    }

    function fraction(value, label) {
        if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
            throw fault("E_AUTHORITY", label + " must be a positive finite number");
        }
        if (Number.isSafeInteger(value)) return { numerator: value, denominator: 1 };
        const text = String(value);
        if (!/^\d+\.\d+$/.test(text)) throw fault("E_AUTHORITY", label + " must use a finite decimal ratio");
        const places = text.length - text.indexOf(".") - 1;
        const denominator = 10 ** places;
        const numerator = Math.round(value * denominator);
        if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
            throw fault("E_AUTHORITY", label + " ratio exceeds integer bounds");
        }
        const divisor = gcd(numerator, denominator);
        return { numerator: numerator / divisor, denominator: denominator / divisor };
    }

    function sumFractions(parts) {
        let numerator = 0;
        let denominator = 1;
        for (const part of parts) {
            const common = lcm(denominator, part.denominator);
            numerator = multiply(numerator, common / denominator, "authority ratio") +
                multiply(part.numerator, common / part.denominator, "authority ratio");
            denominator = common;
            const divisor = gcd(numerator, denominator);
            numerator /= divisor;
            denominator /= divisor;
        }
        return { numerator, denominator };
    }

    function sameComponents(left, right) {
        const keys = Array.from(new Set(Object.keys(left).concat(Object.keys(right)))).sort();
        return keys.every(key => (left[key] || 0) === (right[key] || 0));
    }

    function compileAuthority(authority) {
        if (!isRecord(authority)) throw fault("E_AUTHORITY", "authority object is required");
        const registry = authority.resourceRegistry;
        const currency = registry && registry.currencyAndMinting;
        const sourceDenominations = currency && currency.denominations;
        if (!isRecord(sourceDenominations)) throw fault("E_AUTHORITY", "resource registry currency denominations are required");

        const raw = {};
        let quantaPerCoin = 1;
        for (const id of EXPECTED_DENOMINATIONS) {
            const definition = sourceDenominations[id];
            if (!isRecord(definition)) throw fault("E_AUTHORITY", "missing denomination " + id);
            if (typeof definition.metal !== "string" || !definition.metal) {
                throw fault("E_AUTHORITY", id + " has no registered metal");
            }
            if (!positiveSafeInteger(definition.valueInCp)) {
                throw fault("E_AUTHORITY", id + " valueInCp must be a positive safe integer");
            }
            const resourceClass = registry.coreResourceClasses && registry.coreResourceClasses[definition.metal];
            if (!isRecord(resourceClass) || resourceClass.conserved !== true) {
                throw fault("E_AUTHORITY", id + " metal " + definition.metal + " is not a conserved registered resource class");
            }

            const pieces = {};
            if (typeof definition.metalUnits === "number") {
                pieces[definition.metal] = fraction(definition.metalUnits, id + ".metalUnits");
            } else if (isRecord(definition.metalUnits) && Object.keys(definition.metalUnits).length > 0) {
                for (const component of Object.keys(definition.metalUnits).sort()) {
                    const componentClass = registry.coreResourceClasses && registry.coreResourceClasses[component];
                    if (!isRecord(componentClass) || componentClass.conserved !== true) {
                        throw fault("E_AUTHORITY", id + " component " + component + " is not a conserved registered resource class");
                    }
                    pieces[component] = fraction(definition.metalUnits[component], id + ".metalUnits." + component);
                }
            } else {
                throw fault("E_AUTHORITY", id + " has no registered metalUnits");
            }
            const total = sumFractions(Object.values(pieces));
            if (total.numerator !== total.denominator) {
                throw fault("E_AUTHORITY", id + " metalUnits do not total one registered metal unit");
            }
            for (const part of Object.values(pieces)) quantaPerCoin = lcm(quantaPerCoin, part.denominator);
            raw[id] = { definition, pieces };
        }

        const coinsPerPound = authority.coinsPerPound;
        if (!positiveSafeInteger(coinsPerPound)) {
            throw fault("E_AUTHORITY", "coinsPerPound from the tracked SRD source is required");
        }
        if (!Array.isArray(authority.itemTypes)) throw fault("E_AUTHORITY", "item registry types are required");
        const registeredCoin = authority.itemTypes.find(item => item && item.id === "gold_coin");
        if (!registeredCoin || typeof registeredCoin.weight !== "number") {
            throw fault("E_AUTHORITY", "registered gold_coin weight is required");
        }
        const registeredWeight = fraction(registeredCoin.weight, "gold_coin.weight");
        if (registeredWeight.numerator * coinsPerPound !== registeredWeight.denominator) {
            throw fault("E_AUTHORITY_CONFLICT", "registered gold_coin weight conflicts with the tracked SRD coins-per-pound rule");
        }

        const denominations = {};
        const materials = {};
        const componentSet = {};
        for (const id of EXPECTED_DENOMINATIONS) {
            const entry = raw[id];
            const components = {};
            for (const name of Object.keys(entry.pieces).sort()) {
                const part = entry.pieces[name];
                components[name] = multiply(part.numerator, quantaPerCoin / part.denominator, id + " component mass");
                componentSet[name] = true;
            }
            const denomination = {
                id,
                name: entry.definition.name,
                metal: entry.definition.metal,
                valueInCp: entry.definition.valueInCp,
                components
            };
            denominations[id] = denomination;
            if (materials[denomination.metal] && !sameComponents(materials[denomination.metal].components, components)) {
                throw fault("E_AUTHORITY_CONFLICT", "registered material " + denomination.metal + " has conflicting coin compositions");
            }
            materials[denomination.metal] = { material: denomination.metal, components: copy(components) };
        }

        const quantaPerPound = multiply(quantaPerCoin, coinsPerPound, "quanta per pound");
        return {
            denominations,
            denominationIds: EXPECTED_DENOMINATIONS.slice(),
            materials,
            componentIds: Object.keys(componentSet).sort(),
            quantaPerCoin,
            coinsPerPound,
            quantaPerPound,
            maxBatchCoins: Math.floor(MAX_SAFE / quantaPerCoin)
        };
    }

    function createEngine(authority) {
        const standard = compileAuthority(authority);

        function validateMaterialMass(material, massQuanta, label) {
            const recipe = standard.materials[material];
            if (!recipe) throw fault("E_STATE", label + " has unregistered monetary material " + material);
            if (!positiveSafeInteger(massQuanta)) throw fault("E_STATE", label + " massQuanta must be a positive safe integer");
            for (const component of Object.keys(recipe.components)) {
                const scaled = multiply(massQuanta, recipe.components[component], label + " assay mass");
                if (scaled % standard.quantaPerCoin !== 0) {
                    throw fault("E_STATE", label + " cannot represent the registered " + material + " composition in integer mass");
                }
            }
        }

        function normalizeState(input) {
            if (!isRecord(input)) throw fault("E_STATE", "mint state must be an object");
            if (has(input, "schemaVersion") && input.schemaVersion !== STATE_SCHEMA_VERSION) {
                throw fault("E_STATE", "unsupported mint state schemaVersion");
            }
            const state = copy(input);
            state.schemaVersion = STATE_SCHEMA_VERSION;
            if (state.stores === undefined) state.stores = {};
            else if (!isRecord(state.stores)) throw fault("E_STATE", "stores must be an object");
            if (state.treasury === undefined) state.treasury = {};
            else if (!isRecord(state.treasury)) throw fault("E_STATE", "treasury must be an object");
            if (state.stores.monetaryMetalLots === undefined) state.stores.monetaryMetalLots = [];
            if (state.treasury.coinStacks === undefined) state.treasury.coinStacks = [];
            if (!Array.isArray(state.stores.monetaryMetalLots)) throw fault("E_STATE", "stores.monetaryMetalLots must be an array");
            if (!Array.isArray(state.treasury.coinStacks)) throw fault("E_STATE", "treasury.coinStacks must be an array");

            const lotIds = {};
            for (let index = 0; index < state.stores.monetaryMetalLots.length; index++) {
                const lot = state.stores.monetaryMetalLots[index];
                const label = "stores.monetaryMetalLots[" + index + "]";
                if (!isRecord(lot) || typeof lot.id !== "string" || !lot.id) throw fault("E_STATE", label + " needs a stable id");
                if (lotIds[lot.id]) throw fault("E_STATE", "duplicate monetary metal lot id " + lot.id);
                lotIds[lot.id] = true;
                if (typeof lot.material !== "string") throw fault("E_STATE", label + " needs a material");
                validateMaterialMass(lot.material, lot.massQuanta, label);
            }

            for (let index = 0; index < state.treasury.coinStacks.length; index++) {
                const stack = state.treasury.coinStacks[index];
                const label = "treasury.coinStacks[" + index + "]";
                if (!isRecord(stack) || !standard.denominations[stack.denomination]) {
                    throw fault("E_STATE", label + " has an unknown denomination");
                }
                const denomination = standard.denominations[stack.denomination];
                if (stack.metal !== denomination.metal) throw fault("E_STATE", label + " metal does not match its denomination");
                if (typeof stack.mintFaction !== "string" || !stack.mintFaction) throw fault("E_STATE", label + " has no mintFaction");
                if (typeof stack.mintEra !== "number" || !Number.isFinite(stack.mintEra)) throw fault("E_STATE", label + " has no finite mintEra");
                if (!positiveSafeInteger(stack.quantity)) throw fault("E_STATE", label + " quantity must be a positive safe integer");
                multiply(stack.quantity, standard.quantaPerCoin, label + " mass");
                multiply(stack.quantity, denomination.valueInCp, label + " value");
            }
            return state;
        }

        function componentMass(material, massQuanta) {
            const out = {};
            const recipe = standard.materials[material];
            for (const component of Object.keys(recipe.components)) {
                out[component] = multiply(massQuanta, recipe.components[component], material + " component mass") /
                    standard.quantaPerCoin;
            }
            return out;
        }

        function emptyComponents() {
            const out = {};
            for (const component of standard.componentIds) out[component] = 0;
            return out;
        }

        function addComponents(target, source, label) {
            for (const component of Object.keys(source)) {
                target[component] = add(target[component] || 0, source[component], label + " " + component);
            }
        }

        function measureNormalized(state) {
            const stores = { massQuanta: 0, components: emptyComponents() };
            const treasury = { massQuanta: 0, components: emptyComponents(), valueInCp: 0 };
            for (const lot of state.stores.monetaryMetalLots) {
                stores.massQuanta = add(stores.massQuanta, lot.massQuanta, "stores mass");
                addComponents(stores.components, componentMass(lot.material, lot.massQuanta), "stores components");
            }
            for (const stack of state.treasury.coinStacks) {
                const denomination = standard.denominations[stack.denomination];
                const mass = multiply(stack.quantity, standard.quantaPerCoin, "treasury mass");
                treasury.massQuanta = add(treasury.massQuanta, mass, "treasury mass");
                for (const component of Object.keys(denomination.components)) {
                    const amount = multiply(stack.quantity, denomination.components[component], "treasury components");
                    treasury.components[component] = add(treasury.components[component] || 0, amount, "treasury components");
                }
                treasury.valueInCp = add(treasury.valueInCp,
                    multiply(stack.quantity, denomination.valueInCp, "treasury value"), "treasury value");
            }
            const total = { massQuanta: add(stores.massQuanta, treasury.massQuanta, "total mass"), components: emptyComponents() };
            addComponents(total.components, stores.components, "total components");
            addComponents(total.components, treasury.components, "total components");
            return { stores, treasury, total };
        }

        function measure(state) {
            return measureNormalized(normalizeState(state));
        }

        function refuse(code, message) {
            return { ok: false, code, message };
        }

        function assayMatches(assay, material) {
            if (!isRecord(assay.components)) return false;
            const expected = componentMass(material, assay.massQuanta);
            const actualKeys = Object.keys(assay.components).sort();
            const expectedKeys = Object.keys(expected).sort();
            if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) return false;
            let sum = 0;
            for (const component of actualKeys) {
                const amount = assay.components[component];
                if (!nonNegativeSafeInteger(amount) || amount !== expected[component]) return false;
                sum = add(sum, amount, "assay components");
            }
            return sum === assay.massQuanta;
        }

        function conservation(before, after) {
            return before.total.massQuanta === after.total.massQuanta && sameComponents(before.total.components, after.total.components);
        }

        function mint(inputState, request) {
            let state;
            try { state = normalizeState(inputState); }
            catch (error) { return refuse(error.code || "E_STATE", error.message); }
            if (!isRecord(request)) return refuse("E_REQUEST", "mint request must be an object");
            const denomination = standard.denominations[request.denomination];
            if (!denomination) return refuse("E_DENOMINATION", "unknown denomination");
            if (!positiveSafeInteger(request.quantity) || request.quantity > standard.maxBatchCoins) {
                return refuse("E_BATCH_BOUNDS", "quantity must be a positive safe bounded coin count");
            }
            if (typeof request.mintFaction !== "string" || !request.mintFaction) return refuse("E_PROVENANCE", "mintFaction is required");
            if (typeof request.mintEra !== "number" || !Number.isFinite(request.mintEra)) return refuse("E_PROVENANCE", "finite mintEra is required");
            if (!isRecord(request.assay)) return refuse("E_ASSAY_REQUIRED", "mint requires an explicit assay");

            const assay = request.assay;
            if (typeof assay.lotId !== "string" || !assay.lotId) return refuse("E_ASSAY", "assay lotId is required");
            const lotIndex = state.stores.monetaryMetalLots.findIndex(lot => lot.id === assay.lotId);
            if (lotIndex < 0) return refuse("E_STORES", "assayed lot is not in physical stores");
            const lot = state.stores.monetaryMetalLots[lotIndex];
            if (assay.material !== lot.material) return refuse("E_ASSAY", "assay material does not match the stored lot");
            if (lot.material !== denomination.metal) return refuse("E_MATERIAL", "stored monetary material does not match the denomination");
            if (!positiveSafeInteger(assay.massQuanta)) return refuse("E_ASSAY", "assay massQuanta must be a positive safe integer");
            if (assay.massQuanta > lot.massQuanta) return refuse("E_INSUFFICIENT_STORES", "assay exceeds the physical stored lot");
            try {
                if (!assayMatches(assay, lot.material)) return refuse("E_ASSAY_COMPOSITION", "assay does not match the registered material composition");
            } catch (error) {
                return refuse(error.code || "E_ASSAY", error.message);
            }

            let neededMass;
            try { neededMass = multiply(request.quantity, standard.quantaPerCoin, "mint batch mass"); }
            catch (error) { return refuse(error.code, error.message); }
            if (neededMass > assay.massQuanta) return refuse("E_INSUFFICIENT_ASSAY", "assayed mass cannot supply the requested coin batch");

            let before;
            try { before = measureNormalized(state); }
            catch (error) { return refuse(error.code || "E_BOUNDS", error.message); }
            lot.massQuanta -= neededMass;
            if (lot.massQuanta === 0) state.stores.monetaryMetalLots.splice(lotIndex, 1);

            const stacks = state.treasury.coinStacks;
            const match = stacks.find(stack => stack.denomination === request.denomination &&
                stack.metal === denomination.metal && stack.mintFaction === request.mintFaction && stack.mintEra === request.mintEra);
            try {
                if (match) match.quantity = add(match.quantity, request.quantity, "coin stack quantity");
                else stacks.push({
                    denomination: request.denomination,
                    metal: denomination.metal,
                    mintFaction: request.mintFaction,
                    mintEra: request.mintEra,
                    quantity: request.quantity
                });
                const after = measureNormalized(state);
                if (!conservation(before, after)) return refuse("E_CONSERVATION", "mint transaction did not conserve physical component mass");
                return {
                    ok: true,
                    state,
                    result: {
                        denomination: request.denomination,
                        quantity: request.quantity,
                        consumedMassQuanta: neededMass,
                        assayRemainderQuanta: assay.massQuanta - neededMass,
                        components: copy(denomination.components)
                    }
                };
            } catch (error) {
                return refuse(error.code || "E_BOUNDS", error.message);
            }
        }

        function remelt(inputState, request) {
            let state;
            try { state = normalizeState(inputState); }
            catch (error) { return refuse(error.code || "E_STATE", error.message); }
            if (!isRecord(request)) return refuse("E_REQUEST", "remelt request must be an object");
            if (!nonNegativeSafeInteger(request.stackIndex) || request.stackIndex >= state.treasury.coinStacks.length) {
                return refuse("E_TREASURY", "stackIndex must identify a physical treasury coin stack");
            }
            if (!positiveSafeInteger(request.quantity) || request.quantity > standard.maxBatchCoins) {
                return refuse("E_BATCH_BOUNDS", "quantity must be a positive safe bounded coin count");
            }
            if (typeof request.outputLotId !== "string" || !request.outputLotId) return refuse("E_OUTPUT_LOT", "stable outputLotId is required");

            const stack = state.treasury.coinStacks[request.stackIndex];
            if (request.quantity > stack.quantity) return refuse("E_INSUFFICIENT_COINS", "treasury stack cannot supply the remelt batch");
            const denomination = standard.denominations[stack.denomination];
            let returnedMass;
            try { returnedMass = multiply(request.quantity, standard.quantaPerCoin, "remelt mass"); }
            catch (error) { return refuse(error.code, error.message); }

            const existing = state.stores.monetaryMetalLots.find(lot => lot.id === request.outputLotId);
            if (existing && existing.material !== denomination.metal) {
                return refuse("E_OUTPUT_LOT", "output lot material conflicts with the remelted coin metal");
            }
            if (existing) {
                try { add(existing.massQuanta, returnedMass, "output lot mass"); }
                catch (error) { return refuse(error.code, error.message); }
            }

            let before;
            try { before = measureNormalized(state); }
            catch (error) { return refuse(error.code || "E_BOUNDS", error.message); }
            stack.quantity -= request.quantity;
            if (stack.quantity === 0) state.treasury.coinStacks.splice(request.stackIndex, 1);
            if (existing) existing.massQuanta += returnedMass;
            else state.stores.monetaryMetalLots.push({ id: request.outputLotId, material: denomination.metal, massQuanta: returnedMass });

            try {
                const after = measureNormalized(state);
                if (!conservation(before, after)) return refuse("E_CONSERVATION", "remelt transaction did not conserve physical component mass");
                return {
                    ok: true,
                    state,
                    result: {
                        denomination: stack.denomination,
                        quantity: request.quantity,
                        returnedMaterial: denomination.metal,
                        returnedMassQuanta: returnedMass,
                        components: copy(denomination.components)
                    }
                };
            } catch (error) {
                return refuse(error.code || "E_BOUNDS", error.message);
            }
        }

        function createState(input = {}) {
            return normalizeState(input);
        }

        function describe() {
            return copy({
                stateSchemaVersion: STATE_SCHEMA_VERSION,
                denominations: standard.denominations,
                denominationIds: standard.denominationIds,
                quantaPerCoin: standard.quantaPerCoin,
                coinsPerPound: standard.coinsPerPound,
                quantaPerPound: standard.quantaPerPound,
                maxBatchCoins: standard.maxBatchCoins
            });
        }

        return Object.freeze({ createState, mint, remelt, measure, describe });
    }

    const api = Object.freeze({
        STATE_SCHEMA_VERSION,
        EXPECTED_DENOMINATIONS: EXPECTED_DENOMINATIONS.slice(),
        createEngine
    });

    root.UF = root.UF || {};
    root.DEUS = root.UF;
    root.UF.Mint = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
