#!/usr/bin/env node
"use strict";

// SOC.32.01 headless gate. The production module is loaded into a bare context;
// source mutants are in-memory only and must fail named, passing controls.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const childProcess = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const MODULE_PATH = path.join(ROOT, "game", "js", "sim", "society", "DEUS_Quartermaster.js");
const SCHEMA_PATH = path.join(ROOT, "game", "data", "society", "quartermaster.schema.json");
const DOC_PATH = path.join(ROOT, "docs", "systems", "DEUS_Quartermaster.md");
const GAP_PATH = path.join(ROOT, "tasks", "SOC.32.01", "lane-br", "AUTHORITY_GAPS.md");
const REAL_SOURCE = fs.readFileSync(MODULE_PATH, "utf8").replace(/\r\n/g, "\n");
const SCHEMA = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));

function bareContext() {
    const context = vm.constants && vm.constants.DONT_CONTEXTIFY !== undefined ?
        vm.createContext(vm.constants.DONT_CONTEXTIFY) : vm.createContext({});
    vm.runInContext('"use strict"; Math.random = function () { throw new Error("PURITY_RANDOM"); }; delete globalThis.Date; delete globalThis.console;', context);
    return context;
}

function loadModule(source) {
    const context = bareContext();
    const module = { exports: {} };
    const wrapper = vm.runInContext("(function (module, exports) {" + source + "\n})", context, {
        filename: "DEUS_Quartermaster.js",
        timeout: 5000
    });
    wrapper(module, module.exports);
    return module.exports;
}

function show(value) {
    try { return typeof value === "bigint" ? value + "n" : JSON.stringify(value); }
    catch (error) { return String(value); }
}

function stable(value) {
    if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
    if (value && typeof value === "object") {
        return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stable(value[key])).join(",") + "}";
    }
    return typeof value === "bigint" ? value + "n" : JSON.stringify(value);
}

function ok(value, message) {
    if (!value) throw new Error(message || "expected truthy value");
}

function equal(actual, expected, message) {
    if (actual !== expected) throw new Error((message || "value") + ": expected " + show(expected) + ", got " + show(actual));
}

function same(actual, expected, message) {
    const a = stable(actual);
    const e = stable(expected);
    if (a !== e) throw new Error((message || "records") + " differ:\n  actual " + a.slice(0, 500) + "\n  expect " + e.slice(0, 500));
}

function throwsCode(fn, code, message) {
    let error = null;
    try { fn(); } catch (caught) { error = caught; }
    if (!error) throw new Error((message || "call") + ": expected " + code + ", nothing was thrown");
    if (error.code !== code) {
        throw new Error((message || "call") + ": expected " + code + ", got " + (error.code || "<none>") + " " + String(error.message).slice(0, 180));
    }
    return error;
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value, seen = new Set()) {
    if (!value || typeof value !== "object" || seen.has(value)) return value;
    seen.add(value);
    for (const key of Object.keys(value)) deepFreeze(value[key], seen);
    return Object.freeze(value);
}

function lot(lotId, sourceItemId, itemId, quantity, selectionOrder, origin) {
    return {
        lotId,
        sourceItemId,
        itemId,
        quantity,
        selectionOrder,
        provenance: { origin, chain: [{ system: "TEST_ITEMS", recordId: sourceItemId }] }
    };
}

function request(requestId, itemId, quantity, priority, tieBreakOrder, eligibleLotIds, destinationId, purpose) {
    return {
        requestId,
        itemId,
        quantity,
        priority,
        tieBreakOrder,
        eligibleLotIds,
        destinationId,
        provenance: { purpose, caller: { system: "TEST_DEMANDS", recordId: requestId } }
    };
}

function destination(destinationId, availableCapacity, place) {
    return {
        destinationId,
        availableCapacity,
        provenance: { place, caller: { system: "TEST_CAPACITY", recordId: destinationId } }
    };
}

function inputOf(lots, requests, destinations) {
    return {
        schemaVersion: 1,
        kind: "DEUS_QUARTERMASTER_INPUT",
        lots,
        requests,
        destinations
    };
}

function minimalInput() {
    return inputOf(
        [lot(1, 1001, "food:ration", 5, 0, "TEST_LOT_A")],
        [request(11, "food:ration", 3, 10, 0, [1], 21, "TEST_REQUEST_A")],
        [destination(21, 3, "TEST_DEST_A")]
    );
}

function complexInput() {
    return inputOf([
        lot(101, 1001, "food:ration", 5, 20, "TEST_NORTH_GRANARY"),
        lot(102, 1002, "food:ration", 4, 10, "TEST_SOUTH_GRANARY"),
        lot(103, 1003, "tool:axe", 2, 30, "TEST_TOOL_RACK"),
        lot(104, 1004, "coin:gp", 50, 40, "TEST_PHYSICAL_COIN_CHEST"),
        lot(105, 1005, "raw:stone", 3, 50, "TEST_STONE_PILE"),
        lot(106, 1006, "arm:sword", 1, 60, "TEST_ARMORY")
    ], [
        request(301, "food:ration", 5, 100, 0, [101, 102], 201, "TEST_FEED_A"),
        request(302, "food:ration", 4, 90, 0, [101, 102], 201, "TEST_FEED_B"),
        request(303, "tool:axe", 3, 80, 0, [103], 202, "TEST_TOOL_ISSUE"),
        request(304, "food:ration", 2, 70, 0, [104], 202, "TEST_COIN_IS_NOT_FOOD"),
        request(305, "raw:stone", 2, 60, 0, [105], 203, "TEST_ZERO_CAPACITY"),
        request(306, "arm:sword", 2, 50, 0, [106], 202, "TEST_ARMS_ISSUE")
    ], [
        destination(201, 6, "TEST_KITCHEN"),
        destination(202, 4, "TEST_OUTFITTING"),
        destination(203, 0, "TEST_CLOSED_YARD")
    ]);
}

function getBy(rows, key, value) {
    const row = rows.find(candidate => candidate[key] === value);
    if (!row) throw new Error("missing " + key + "=" + value);
    return row;
}

function addBig(map, key, amount) {
    map.set(key, (map.get(key) || 0n) + BigInt(amount));
}

function independentAudit(plan) {
    const lots = new Map(plan.input.lots.map(row => [row.lotId, row]));
    const requests = new Map(plan.input.requests.map(row => [row.requestId, row]));
    const destinations = new Map(plan.input.destinations.map(row => [row.destinationId, row]));
    const byLot = new Map();
    const byRequest = new Map();
    const byDestination = new Map();
    const byItem = new Map();
    const availableByItem = new Map();
    const remainingByItem = new Map();
    const pairs = new Set();
    for (const source of lots.values()) addBig(availableByItem, source.itemId, source.quantity);
    for (const reservation of plan.reservations) {
        const source = lots.get(reservation.lotId);
        const demand = requests.get(reservation.requestId);
        const target = destinations.get(reservation.destinationId);
        ok(source && demand && target, "reservation references supplied identities");
        equal(reservation.sourceItemId, source.sourceItemId, "source item identity");
        equal(reservation.itemId, source.itemId, "reservation/source exact item");
        equal(reservation.itemId, demand.itemId, "reservation/request exact item");
        equal(reservation.destinationId, demand.destinationId, "reservation/request destination");
        ok(demand.eligibleLotIds.includes(source.lotId), "reservation lot is explicitly eligible");
        ok(Number.isSafeInteger(reservation.quantity) && reservation.quantity > 0, "reservation quantity is positive and safe");
        const pair = reservation.requestId + ":" + reservation.lotId;
        ok(!pairs.has(pair), "one reservation row per request/lot pair");
        pairs.add(pair);
        same(reservation.lotProvenance, source.provenance, "lot provenance");
        same(reservation.requestProvenance, demand.provenance, "request provenance");
        same(reservation.destinationProvenance, target.provenance, "destination provenance");
        addBig(byLot, source.lotId, reservation.quantity);
        addBig(byRequest, demand.requestId, reservation.quantity);
        addBig(byDestination, target.destinationId, reservation.quantity);
        addBig(byItem, source.itemId, reservation.quantity);
    }

    equal(plan.remainingLots.length, lots.size, "one remainder per lot, including zero and untouched lots");
    const remainderIds = new Set();
    for (const remainder of plan.remainingLots) {
        const source = lots.get(remainder.lotId);
        ok(source && !remainderIds.has(remainder.lotId), "unique supplied lot remainder");
        remainderIds.add(remainder.lotId);
        equal(remainder.sourceItemId, source.sourceItemId, "remainder source identity");
        equal(remainder.itemId, source.itemId, "remainder item identity");
        equal(remainder.availableQuantity, source.quantity, "remainder original quantity");
        same(remainder.provenance, source.provenance, "remainder provenance");
        const used = byLot.get(source.lotId) || 0n;
        equal(BigInt(remainder.reservedQuantity), used, "per-lot reserved quantity");
        equal(BigInt(source.quantity), used + BigInt(remainder.remainingQuantity), "per-lot conservation");
        ok(remainder.remainingQuantity >= 0, "nonnegative lot remainder");
        addBig(remainingByItem, source.itemId, remainder.remainingQuantity);
    }

    equal(plan.allocations.length, requests.size, "one allocation outcome per request");
    const allocationIds = new Set();
    const refusalByRequest = new Map();
    for (const refusal of plan.refusals) {
        ok(!refusalByRequest.has(refusal.requestId), "one refusal row per unfilled request");
        refusalByRequest.set(refusal.requestId, refusal);
    }
    for (const allocation of plan.allocations) {
        const demand = requests.get(allocation.requestId);
        ok(demand && !allocationIds.has(demand.requestId), "unique supplied request outcome");
        allocationIds.add(demand.requestId);
        equal(allocation.itemId, demand.itemId, "allocation item identity");
        equal(allocation.destinationId, demand.destinationId, "allocation destination identity");
        equal(allocation.requestedQuantity, demand.quantity, "allocation requested quantity");
        const filled = byRequest.get(demand.requestId) || 0n;
        equal(BigInt(allocation.allocatedQuantity), filled, "request allocation equals reservation rows");
        equal(BigInt(demand.quantity), filled + BigInt(allocation.unfilledQuantity), "per-request demand conservation");
        const expectedStatus = allocation.unfilledQuantity === 0 ? "FILLED" : (allocation.allocatedQuantity === 0 ? "REFUSED" : "PARTIAL");
        equal(allocation.status, expectedStatus, "allocation status");
        same(allocation.provenance, demand.provenance, "allocation provenance");
        const refusal = refusalByRequest.get(demand.requestId);
        if (allocation.unfilledQuantity === 0) ok(!refusal, "filled request has no refusal");
        else {
            ok(refusal, "unfilled request has a refusal");
            equal(refusal.quantity, allocation.unfilledQuantity, "refusal is unfilled demand only");
            equal(refusal.itemId, demand.itemId, "refusal item identity");
            equal(refusal.destinationId, demand.destinationId, "refusal destination identity");
            same(refusal.provenance, demand.provenance, "refusal provenance");
        }
    }
    equal(refusalByRequest.size, plan.allocations.filter(row => row.unfilledQuantity > 0).length, "no extra refusals");

    equal(plan.destinationRemainders.length, destinations.size, "one capacity remainder per destination");
    const destinationRemainderIds = new Set();
    for (const remainder of plan.destinationRemainders) {
        const target = destinations.get(remainder.destinationId);
        ok(target && !destinationRemainderIds.has(target.destinationId), "unique supplied capacity remainder");
        destinationRemainderIds.add(target.destinationId);
        equal(remainder.availableCapacity, target.availableCapacity, "original destination capacity");
        const used = byDestination.get(target.destinationId) || 0n;
        equal(BigInt(remainder.reservedCapacity), used, "destination reserved capacity");
        equal(BigInt(target.availableCapacity), used + BigInt(remainder.remainingCapacity), "destination conservation");
        ok(remainder.remainingCapacity >= 0, "nonnegative capacity remainder");
        same(remainder.provenance, target.provenance, "destination provenance");
    }

    let available = 0n;
    let reserved = 0n;
    let remaining = 0n;
    let requested = 0n;
    let refused = 0n;
    let capacityAvailable = 0n;
    let capacityReserved = 0n;
    let capacityRemaining = 0n;
    for (const source of lots.values()) available += BigInt(source.quantity);
    for (const amount of byLot.values()) reserved += amount;
    for (const row of plan.remainingLots) remaining += BigInt(row.remainingQuantity);
    for (const demand of requests.values()) requested += BigInt(demand.quantity);
    for (const row of plan.refusals) refused += BigInt(row.quantity);
    for (const target of destinations.values()) capacityAvailable += BigInt(target.availableCapacity);
    for (const amount of byDestination.values()) capacityReserved += amount;
    for (const row of plan.destinationRemainders) capacityRemaining += BigInt(row.remainingCapacity);
    equal(available, reserved + remaining, "global stock equation");
    equal(requested, reserved + refused, "global demand equation");
    equal(capacityAvailable, capacityReserved + capacityRemaining, "global capacity equation");
    equal(plan.conservation.stock.available, Number(available), "stock proof available");
    equal(plan.conservation.stock.reserved, Number(reserved), "stock proof reserved");
    equal(plan.conservation.stock.remaining, Number(remaining), "stock proof remaining");
    equal(plan.conservation.demand.requested, Number(requested), "demand proof requested");
    equal(plan.conservation.demand.allocated, Number(reserved), "demand proof allocated");
    equal(plan.conservation.demand.refused, Number(refused), "demand proof refused");
    equal(plan.conservation.capacity.available, Number(capacityAvailable), "capacity proof available");
    equal(plan.conservation.capacity.reserved, Number(capacityReserved), "capacity proof reserved");
    equal(plan.conservation.capacity.remaining, Number(capacityRemaining), "capacity proof remaining");
    equal(plan.conservation.valid, true, "conservation proof flag");

    equal(plan.conservation.byItem.length, availableByItem.size, "one proof row per supplied item id");
    const proofByItem = new Map();
    for (const proof of plan.conservation.byItem) {
        ok(availableByItem.has(proof.itemId), "proof names a supplied item id");
        ok(!proofByItem.has(proof.itemId), "item proof ids are unique");
        proofByItem.set(proof.itemId, proof);
    }
    for (const [item, amount] of availableByItem) {
        const proof = proofByItem.get(item);
        ok(proof, "item proof exists for " + item);
        equal(BigInt(proof.available), amount, "per-item available " + item);
        equal(BigInt(proof.reserved), byItem.get(item) || 0n, "per-item reserved " + item);
        equal(BigInt(proof.remaining), remainingByItem.get(item) || 0n, "per-item remaining " + item);
        equal(amount, BigInt(proof.reserved) + BigInt(proof.remaining), "per-item conservation " + item);
    }
    return true;
}

function resolveRef(root, ref) {
    if (!ref.startsWith("#/")) throw new Error("unsupported schema ref " + ref);
    let node = root;
    for (const token of ref.slice(2).split("/")) node = node[token.replace(/~1/g, "/").replace(/~0/g, "~")];
    return node;
}

function typeMatches(type, value) {
    if (type === "null") return value === null;
    if (type === "boolean") return typeof value === "boolean";
    if (type === "string") return typeof value === "string";
    if (type === "integer") return typeof value === "number" && Number.isInteger(value);
    if (type === "array") return Array.isArray(value);
    if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
    return false;
}

function schemaErrors(node, value, root = SCHEMA, at = "$") {
    if (node.$ref) return schemaErrors(resolveRef(root, node.$ref), value, root, at);
    const errors = [];
    if (node.anyOf) {
        const variants = node.anyOf.map(part => schemaErrors(part, value, root, at));
        if (!variants.some(list => list.length === 0)) errors.push(at + ":anyOf");
        return errors;
    }
    if (Object.prototype.hasOwnProperty.call(node, "const") && stable(value) !== stable(node.const)) errors.push(at + ":const");
    if (node.enum && !node.enum.some(candidate => stable(candidate) === stable(value))) errors.push(at + ":enum");
    if (node.type && !typeMatches(node.type, value)) {
        errors.push(at + ":type");
        return errors;
    }
    if (typeof value === "number") {
        if (node.minimum !== undefined && value < node.minimum) errors.push(at + ":minimum");
        if (node.maximum !== undefined && value > node.maximum) errors.push(at + ":maximum");
    }
    if (typeof value === "string") {
        if (node.minLength !== undefined && value.length < node.minLength) errors.push(at + ":minLength");
        if (node.maxLength !== undefined && value.length > node.maxLength) errors.push(at + ":maxLength");
        if (node.pattern && !(new RegExp(node.pattern)).test(value)) errors.push(at + ":pattern");
    }
    if (Array.isArray(value)) {
        if (node.minItems !== undefined && value.length < node.minItems) errors.push(at + ":minItems");
        if (node.uniqueItems) {
            const seen = new Set();
            for (const entry of value) {
                const key = stable(entry);
                if (seen.has(key)) errors.push(at + ":uniqueItems");
                seen.add(key);
            }
        }
        if (node.items) for (let i = 0; i < value.length; i++) errors.push(...schemaErrors(node.items, value[i], root, at + "[" + i + "]"));
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        const properties = node.properties || {};
        for (const required of node.required || []) {
            if (!Object.prototype.hasOwnProperty.call(value, required)) errors.push(at + "." + required + ":required");
        }
        for (const key of Object.keys(value)) {
            if (Object.prototype.hasOwnProperty.call(properties, key)) errors.push(...schemaErrors(properties[key], value[key], root, at + "." + key));
            else if (node.additionalProperties === false) errors.push(at + "." + key + ":additionalProperties");
            else if (node.additionalProperties && typeof node.additionalProperties === "object") {
                errors.push(...schemaErrors(node.additionalProperties, value[key], root, at + "." + key));
            }
        }
    }
    return errors;
}

function defineChecks(Q, schema) {
    const checks = [];
    const test = (name, fn) => checks.push({ name, fn });

    test("module_exports_closed_api", () => {
        same(Object.keys(Q).sort(), ["INPUT_KIND", "PLAN_KIND", "REFUSAL_CODES", "VERSION", "audit", "deserialize", "plan", "serialize", "validateInput", "validatePlan"].sort(), "public API");
        equal(Object.isFrozen(Q), true, "API frozen");
    });

    test("full_partial_refusal_outputs", () => {
        const plan = Q.plan(complexInput());
        const a301 = getBy(plan.allocations, "requestId", 301);
        const a302 = getBy(plan.allocations, "requestId", 302);
        const a303 = getBy(plan.allocations, "requestId", 303);
        const a304 = getBy(plan.allocations, "requestId", 304);
        const a305 = getBy(plan.allocations, "requestId", 305);
        const a306 = getBy(plan.allocations, "requestId", 306);
        same([a301.status, a301.allocatedQuantity, a301.unfilledQuantity], ["FILLED", 5, 0], "full fill");
        same([a302.status, a302.allocatedQuantity, a302.unfilledQuantity], ["PARTIAL", 1, 3], "capacity partial");
        same([a303.status, a303.allocatedQuantity, a303.unfilledQuantity], ["PARTIAL", 2, 1], "stock partial");
        same([a304.status, a304.allocatedQuantity, a304.unfilledQuantity], ["REFUSED", 0, 2], "wrong-item refusal");
        same([a305.status, a305.allocatedQuantity, a305.unfilledQuantity], ["REFUSED", 0, 2], "capacity refusal");
        same([a306.status, a306.allocatedQuantity, a306.unfilledQuantity], ["PARTIAL", 1, 1], "arms partial");
        equal(getBy(plan.refusals, "requestId", 302).code, "DESTINATION_CAPACITY_EXHAUSTED", "capacity code");
        equal(getBy(plan.refusals, "requestId", 303).code, "ELIGIBLE_EXACT_STOCK_EXHAUSTED", "stock code");
        equal(getBy(plan.refusals, "requestId", 305).code, "DESTINATION_CAPACITY_EXHAUSTED", "zero capacity code");
    });

    test("independent_per_identity_conservation", () => {
        independentAudit(Q.plan(complexInput()));
    });

    test("multiple_lots_keep_order_identity_and_provenance", () => {
        const plan = Q.plan(complexInput());
        const rows = plan.reservations.filter(row => row.requestId === 301);
        same(rows.map(row => [row.lotId, row.sourceItemId, row.quantity]), [[102, 1002, 4], [101, 1001, 1]], "explicit lot order and split");
        equal(rows[0].lotProvenance.origin, "TEST_SOUTH_GRANARY", "first lot provenance");
        equal(rows[1].lotProvenance.origin, "TEST_NORTH_GRANARY", "second lot provenance");
    });

    test("priority_and_tiebreak_are_caller_order", () => {
        const data = inputOf([lot(1, 101, "food:ration", 5, 0, "TEST_STOCK")], [
            request(12, "food:ration", 4, 7, 20, [1], 21, "TEST_TIE_LATER"),
            request(11, "food:ration", 4, 7, 10, [1], 21, "TEST_TIE_EARLIER")
        ], [destination(21, 8, "TEST_DEST")]);
        const plan = Q.plan(data);
        equal(getBy(plan.allocations, "requestId", 11).allocatedQuantity, 4, "smaller tieBreakOrder first");
        equal(getBy(plan.allocations, "requestId", 12).allocatedQuantity, 1, "later tie gets remainder");
        const higher = clone(data);
        higher.requests[0].priority = 8;
        equal(getBy(Q.plan(higher).allocations, "requestId", 12).allocatedQuantity, 4, "higher numeric priority first");
    });

    test("lot_selection_order_not_array_or_id", () => {
        const data = inputOf([
            lot(1, 101, "tool:axe", 2, 20, "TEST_LOW_ID_LATER"),
            lot(9, 109, "tool:axe", 2, 10, "TEST_HIGH_ID_EARLIER")
        ], [request(11, "tool:axe", 2, 1, 0, [1, 9], 21, "TEST_LOT_ORDER")], [destination(21, 2, "TEST_DEST")]);
        const plan = Q.plan(data);
        equal(plan.reservations.length, 1, "one source used");
        equal(plan.reservations[0].lotId, 9, "explicit selection order wins");
    });

    test("input_permutations_serialize_identically", () => {
        const first = complexInput();
        const second = clone(first);
        second.lots.reverse();
        second.requests.reverse();
        second.destinations.reverse();
        for (const demand of second.requests) demand.eligibleLotIds.reverse();
        equal(Q.serialize(Q.plan(first)), Q.serialize(Q.plan(second)), "canonical plan bytes");
    });

    test("wrong_item_and_ineligible_stock_never_substitute", () => {
        const data = inputOf([
            lot(1, 101, "coin:gp", 999, 0, "TEST_COIN"),
            lot(2, 102, "food:ration", 9, 1, "TEST_INELIGIBLE_FOOD")
        ], [request(11, "food:ration", 4, 1, 0, [1], 21, "TEST_FOOD")], [destination(21, 4, "TEST_DEST")]);
        const plan = Q.plan(data);
        equal(plan.reservations.length, 0, "no wrong or ineligible reservation");
        equal(plan.allocations[0].allocatedQuantity, 0, "no substituted allocation");
        equal(getBy(plan.remainingLots, "lotId", 1).remainingQuantity, 999, "coin unchanged");
        equal(getBy(plan.remainingLots, "lotId", 2).remainingQuantity, 9, "ineligible food unchanged");
    });

    test("treasury_field_rejected", () => {
        for (const field of ["treasuryBalance", "treasury", "wealth", "price", "prices", "balance", "balances", "accounts"]) {
            const data = inputOf([], [request(11, "food:ration", 3, 1, 0, [], 21, "TEST_EMPTY_GRANARY")],
                [destination(21, 3, "TEST_DEST")]);
            data[field] = 9007199254740991;
            throwsCode(() => Q.plan(data), "E_INPUT_FIELD", field + " is outside physical input");
        }
    });

    test("financial_values_in_provenance_have_no_supply_path", () => {
        const data = inputOf([], [request(11, "food:ration", 3, 1, 0, [], 21, "TEST_EMPTY_GRANARY")],
            [destination(21, 3, "TEST_DEST")]);
        data.requests[0].provenance.financialContext = { treasuryBalance: Number.MAX_SAFE_INTEGER, price: 1 };
        const plan = Q.plan(data);
        equal(plan.allocations[0].allocatedQuantity, 0, "opaque finance context creates no stock");
        equal(plan.refusals[0].quantity, 3, "all physical demand remains unfilled");
        independentAudit(plan);
    });

    test("shared_capacity_cross_item_bound", () => {
        const data = inputOf([
            lot(1, 101, "food:ration", 2, 0, "TEST_FOOD"),
            lot(2, 102, "tool:axe", 2, 1, "TEST_TOOL")
        ], [
            request(11, "food:ration", 2, 2, 0, [1], 21, "TEST_FIRST"),
            request(12, "tool:axe", 2, 1, 0, [2], 21, "TEST_SECOND")
        ], [destination(21, 3, "TEST_SHARED")]);
        const plan = Q.plan(data);
        equal(getBy(plan.allocations, "requestId", 11).allocatedQuantity, 2, "first item fill");
        equal(getBy(plan.allocations, "requestId", 12).allocatedQuantity, 1, "second item shares one remaining unit");
        equal(plan.destinationRemainders[0].remainingCapacity, 0, "shared capacity exhausted");
        independentAudit(plan);
    });

    test("both_constraints_refusal_code", () => {
        const data = inputOf([lot(1, 101, "tool:axe", 1, 0, "TEST_WRONG")],
            [request(11, "food:ration", 1, 1, 0, [1], 21, "TEST_BOTH")], [destination(21, 0, "TEST_FULL")]);
        equal(Q.plan(data).refusals[0].code, "STOCK_AND_DESTINATION_CAPACITY_EXHAUSTED", "both constraints reported");
    });

    test("safe_integer_max_boundary", () => {
        const max = Number.MAX_SAFE_INTEGER;
        const data = inputOf([lot(1, 101, "raw:stone", max, 0, "TEST_MAX")],
            [request(11, "raw:stone", max, max, max, [1], 21, "TEST_MAX")], [destination(21, max, "TEST_MAX")]);
        const plan = Q.plan(data);
        equal(plan.allocations[0].allocatedQuantity, max, "maximum allocated exactly");
        equal(plan.remainingLots[0].remainingQuantity, 0, "maximum remainder exact");
        independentAudit(plan);
    });

    test("input_is_not_mutated_and_frozen_input_works", () => {
        const data = complexInput();
        const before = stable(data);
        deepFreeze(data);
        Q.plan(data);
        equal(stable(data), before, "deep-frozen input unchanged");
    });

    test("input_output_and_cross_call_graphs_are_detached", () => {
        const data = complexInput();
        const first = Q.plan(data);
        const second = Q.plan(data);
        first.input.lots[0].provenance.chain[0].system = "MUTATED_OUTPUT";
        equal(data.lots.find(row => row.lotId === first.input.lots[0].lotId).provenance.chain[0].system, "TEST_ITEMS", "output cannot mutate input");
        equal(second.input.lots[0].provenance.chain[0].system, "TEST_ITEMS", "output cannot mutate another call");
        first.remainingLots[0].provenance.origin = "MUTATED_REMAINDER";
        ok(first.input.lots[0].provenance.origin !== "MUTATED_REMAINDER", "sibling output provenance detached");
        data.requests[0].provenance.purpose = "MUTATED_INPUT";
        ok(second.input.requests.find(row => row.requestId === 301).provenance.purpose !== "MUTATED_INPUT", "input cannot mutate prior output");

        first.input.destinations[0].provenance.place = "MUTATED_OUTPUT_DESTINATION";
        equal(data.destinations.find(row => row.destinationId === first.input.destinations[0].destinationId).provenance.place,
            "TEST_KITCHEN", "embedded destination cannot mutate caller input");
        equal(second.input.destinations.find(row => row.destinationId === first.input.destinations[0].destinationId).provenance.place,
            "TEST_KITCHEN", "embedded destination cannot mutate another call");

        const firstReservation = first.reservations.find(row => row.requestId === 301);
        firstReservation.requestProvenance.purpose = "MUTATED_RESERVATION_REQUEST";
        equal(first.input.requests.find(row => row.requestId === 301).provenance.purpose, "TEST_FEED_A",
            "reservation request provenance detached from embedded input");
        equal(first.reservations.filter(row => row.requestId === 301)[1].requestProvenance.purpose, "TEST_FEED_A",
            "reservation request provenance detached from sibling reservation");
        firstReservation.destinationProvenance.place = "MUTATED_RESERVATION_DESTINATION";
        equal(first.input.destinations.find(row => row.destinationId === 201).provenance.place, "MUTATED_OUTPUT_DESTINATION",
            "reservation destination provenance detached from embedded input");
        first.destinationRemainders.find(row => row.destinationId === 201).provenance.place = "MUTATED_REMAINDER_DESTINATION";
        ok(first.input.destinations.find(row => row.destinationId === 201).provenance.place !== "MUTATED_REMAINDER_DESTINATION",
            "destination remainder provenance detached from embedded input");
        first.allocations.find(row => row.requestId === 301).provenance.purpose = "MUTATED_ALLOCATION";
        equal(first.input.requests.find(row => row.requestId === 301).provenance.purpose, "TEST_FEED_A",
            "allocation provenance detached from embedded input");
        first.refusals.find(row => row.requestId === 302).provenance.purpose = "MUTATED_REFUSAL";
        equal(first.input.requests.find(row => row.requestId === 302).provenance.purpose, "TEST_FEED_B",
            "refusal provenance detached from embedded input");
    });

    test("canonical_input_preserves_every_caller_fact", () => {
        const source = complexInput();
        const embedded = Q.plan(source).input;
        equal(embedded.lots.length, source.lots.length, "all source lots embedded");
        equal(embedded.requests.length, source.requests.length, "all source requests embedded");
        equal(embedded.destinations.length, source.destinations.length, "all source destinations embedded");
        for (const row of source.lots) {
            const copy = getBy(embedded.lots, "lotId", row.lotId);
            same([copy.sourceItemId, copy.itemId, copy.quantity, copy.selectionOrder],
                [row.sourceItemId, row.itemId, row.quantity, row.selectionOrder], "lot caller facts");
            same(copy.provenance, row.provenance, "lot caller provenance");
        }
        for (const row of source.requests) {
            const copy = getBy(embedded.requests, "requestId", row.requestId);
            same([copy.itemId, copy.quantity, copy.priority, copy.tieBreakOrder, copy.destinationId],
                [row.itemId, row.quantity, row.priority, row.tieBreakOrder, row.destinationId], "request caller facts");
            same(copy.eligibleLotIds, row.eligibleLotIds.slice().sort((a, b) => a - b), "request eligibility facts");
            same(copy.provenance, row.provenance, "request caller provenance");
        }
        for (const row of source.destinations) {
            const copy = getBy(embedded.destinations, "destinationId", row.destinationId);
            equal(copy.availableCapacity, row.availableCapacity, "destination capacity fact");
            same(copy.provenance, row.provenance, "destination caller provenance");
        }
    });

    test("persisted_plan_round_trip_and_audit", () => {
        const plan = Q.plan(complexInput());
        const text = Q.serialize(plan);
        const loaded = Q.deserialize(text);
        same(loaded, plan, "round trip");
        equal(Q.serialize(loaded), text, "canonical serialization");
        const audit = Q.audit(loaded);
        equal(audit.ok, true, "audit ok");
        same(audit.conservation, plan.conservation, "audit proof");
        audit.conservation.stock.available = 0;
        equal(plan.conservation.stock.available, 65, "audit proof is detached from plan");
        equal(loaded.conservation.stock.available, 65, "audit proof is detached from loaded plan");
    });

    test("schema_accepts_generated_plan", () => {
        const errors = schemaErrors(schema, Q.plan(complexInput()), schema);
        equal(errors.length, 0, errors.join("; "));
    });

    test("schema_rejects_extra_fractional_unsafe_and_bad_item_fields", () => {
        const plan = clone(Q.plan(complexInput()));
        plan.treasury = 100;
        ok(schemaErrors(schema, plan, schema).some(error => error.includes("additionalProperties")), "extra field rejected");
        const fractional = clone(Q.plan(complexInput()));
        fractional.remainingLots[0].remainingQuantity += 0.5;
        ok(schemaErrors(schema, fractional, schema).some(error => error.includes("type")), "fraction rejected");
        const unsafe = clone(Q.plan(complexInput()));
        unsafe.remainingLots[0].remainingQuantity = Number.MAX_SAFE_INTEGER + 1;
        ok(schemaErrors(schema, unsafe, schema).some(error => error.includes("maximum")), "unsafe integer rejected");
        const badItem = clone(Q.plan(complexInput()));
        badItem.input.requests[0].itemId = "food:ration\n";
        ok(schemaErrors(schema, badItem, schema).some(error => error.includes("pattern")), "non-canonical item id rejected");
    });

    test("schema_rejects_id_bounds_closed_required_enum_and_unique_fields", () => {
        const badId = clone(Q.plan(complexInput()));
        badId.input.lots[0].lotId = 0;
        ok(schemaErrors(schema, badId, schema).some(error => error.includes("minimum")), "positive id lower bound enforced");

        const extraLot = clone(Q.plan(complexInput()));
        extraLot.input.lots[0].treasury = 1;
        ok(schemaErrors(schema, extraLot, schema).some(error => error.includes("additionalProperties")), "nested records are closed");

        const missingLotField = clone(Q.plan(complexInput()));
        delete missingLotField.input.lots[0].provenance;
        ok(schemaErrors(schema, missingLotField, schema).some(error => error.includes("required")), "nested required fields enforced");

        const badStatus = clone(Q.plan(complexInput()));
        badStatus.allocations[0].status = "UNKNOWN";
        ok(schemaErrors(schema, badStatus, schema).some(error => error.includes("enum")), "allocation status enum enforced");

        const duplicateEligibility = clone(Q.plan(complexInput()));
        duplicateEligibility.input.requests[0].eligibleLotIds = [101, 101];
        ok(schemaErrors(schema, duplicateEligibility, schema).some(error => error.includes("uniqueItems")), "eligibility IDs unique in schema");
    });

    test("persisted_tamper_created_or_lost_units_rejected", () => {
        const created = clone(Q.plan(complexInput()));
        created.remainingLots[0].remainingQuantity += 1;
        throwsCode(() => Q.serialize(created), "E_PLAN_MISMATCH", "created unit");
        const lost = clone(Q.plan(complexInput()));
        getBy(lost.remainingLots, "lotId", 104).remainingQuantity -= 1;
        throwsCode(() => Q.serialize(lost), "E_PLAN_MISMATCH", "lost untouched unit");
    });

    test("persisted_tamper_balanced_offsets_and_item_swap_rejected", () => {
        const offsets = clone(Q.plan(complexInput()));
        getBy(offsets.remainingLots, "lotId", 101).remainingQuantity += 1;
        getBy(offsets.remainingLots, "lotId", 104).remainingQuantity -= 1;
        throwsCode(() => Q.serialize(offsets), "E_PLAN_MISMATCH", "offsetting lots");
        const swapped = clone(Q.plan(complexInput()));
        swapped.reservations[0].itemId = "coin:gp";
        throwsCode(() => Q.serialize(swapped), "E_PLAN_MISMATCH", "item substitution");
    });

    test("persisted_tamper_identity_provenance_capacity_and_summary_rejected", () => {
        const cases = [
            plan => { plan.reservations[0].requestId = 999; },
            plan => { plan.remainingLots[0].provenance.origin = "FORGED"; },
            plan => { plan.destinationRemainders[0].remainingCapacity += 1; },
            plan => { plan.conservation.stock.available += 1; },
            plan => { plan.refusals.pop(); },
            plan => { plan.allocations[0].status = "PARTIAL"; }
        ];
        for (const tamper of cases) {
            const plan = clone(Q.plan(complexInput()));
            tamper(plan);
            throwsCode(() => Q.serialize(plan), "E_PLAN_MISMATCH", "persisted tamper");
        }
    });

    test("deserialize_rejects_bad_json_and_non_string", () => {
        throwsCode(() => Q.deserialize("{"), "E_PLAN_JSON", "bad JSON");
        throwsCode(() => Q.deserialize({}), "E_PLAN_JSON", "non-string");
    });

    test("deserialize_revalidates_parseable_forged_plans", () => {
        const cases = [
            ["E_PLAN_MISMATCH", plan => { plan.remainingLots[0].remainingQuantity += 1; }],
            ["E_PLAN_MISMATCH", plan => { plan.reservations.pop(); }],
            ["E_SCHEMA_VERSION", plan => { plan.schemaVersion = 2; }],
            ["E_PLAN_KIND", plan => { plan.kind = "OTHER"; }],
            ["E_QUANTITY_RANGE", plan => { plan.input.lots[0].quantity = 0; }]
        ];
        for (const [code, mutate] of cases) {
            const forged = Q.plan(minimalInput());
            mutate(forged);
            throwsCode(() => Q.deserialize(JSON.stringify(forged)), code, "parseable forged plan");
        }
    });

    test("audit_reports_invalid_plan_errors_without_conservation", () => {
        const created = Q.plan(minimalInput());
        created.remainingLots[0].remainingQuantity += 1;
        const createdAudit = Q.audit(created);
        equal(createdAudit.ok, false, "created-unit audit fails");
        ok(createdAudit.errors.some(error => error.code === "E_PLAN_MISMATCH"), "audit exposes mismatch code");
        equal(createdAudit.conservation, null, "invalid audit withholds conservation proof");

        const invalidInput = Q.plan(minimalInput());
        invalidInput.input.requests[0].quantity = 0;
        const inputAudit = Q.audit(invalidInput);
        equal(inputAudit.ok, false, "invalid embedded input audit fails");
        ok(inputAudit.errors.some(error => error.code === "E_QUANTITY_RANGE"), "audit exposes input validation code");
        equal(inputAudit.conservation, null, "invalid-input audit withholds conservation proof");
    });

    const invalid = [
        ["reject_schema_version", "E_SCHEMA_VERSION", data => { data.schemaVersion = 2; }],
        ["reject_input_kind", "E_INPUT_KIND", data => { data.kind = "OTHER"; }],
        ["reject_unknown_treasury_field", "E_INPUT_FIELD", data => { data.treasury = { balance: 999 }; }],
        ["reject_missing_lot_quantity", "E_REQUIRED_FIELD", data => { delete data.lots[0].quantity; }],
        ["reject_missing_lot_provenance", "E_REQUIRED_FIELD", data => { delete data.lots[0].provenance; }],
        ["reject_lot_price_field", "E_LOT_FIELD", data => { data.lots[0].price = 1; }],
        ["reject_request_wealth_field", "E_REQUEST_FIELD", data => { data.requests[0].wealth = 1; }],
        ["reject_destination_owner_field", "E_DESTINATION_FIELD", data => { data.destinations[0].owner = 1; }],
        ["reject_lot_record_type", "E_LOT_TYPE", data => { data.lots[0] = null; }],
        ["reject_request_record_type", "E_REQUEST_TYPE", data => { data.requests[0] = "request"; }],
        ["reject_destination_record_type", "E_DESTINATION_TYPE", data => { data.destinations[0] = 21; }],
        ["reject_lots_non_array", "E_ARRAY", data => { data.lots = {}; }],
        ["reject_requests_non_array", "E_ARRAY", data => { data.requests = {}; }],
        ["reject_destinations_non_array", "E_ARRAY", data => { data.destinations = {}; }],
        ["reject_duplicate_lot_id", "E_DUPLICATE_LOT_ID", data => { const row = lot(1, 1002, "food:ration", 1, 1, "TEST_DUP"); data.lots.push(row); }],
        ["reject_duplicate_source_item_id", "E_DUPLICATE_SOURCE_ITEM_ID", data => { data.lots.push(lot(2, 1001, "food:ration", 1, 1, "TEST_DUP_SOURCE")); }],
        ["reject_duplicate_request_id", "E_DUPLICATE_REQUEST_ID", data => { data.requests.push(request(11, "food:ration", 1, 9, 1, [1], 21, "TEST_DUP")); }],
        ["reject_duplicate_destination_id", "E_DUPLICATE_DESTINATION_ID", data => { data.destinations.push(destination(21, 1, "TEST_DUP")); }],
        ["reject_ambiguous_request_order", "E_AMBIGUOUS_REQUEST_ORDER", data => { data.requests.push(request(12, "food:ration", 1, 10, 0, [1], 21, "TEST_TIE")); }],
        ["reject_ambiguous_lot_order", "E_AMBIGUOUS_LOT_ORDER", data => { data.lots.push(lot(2, 1002, "food:ration", 1, 0, "TEST_TIE")); }],
        ["reject_fractional_quantity", "E_SAFE_QUANTITY", data => { data.lots[0].quantity = 1.5; }],
        ["reject_unsafe_quantity", "E_SAFE_QUANTITY", data => { data.lots[0].quantity = Number.MAX_SAFE_INTEGER + 1; }],
        ["reject_string_quantity", "E_SAFE_QUANTITY", data => { data.requests[0].quantity = "3"; }],
        ["reject_negative_quantity", "E_QUANTITY_RANGE", data => { data.lots[0].quantity = -1; }],
        ["reject_zero_lot_quantity", "E_QUANTITY_RANGE", data => { data.lots[0].quantity = 0; }],
        ["reject_zero_request_quantity", "E_QUANTITY_RANGE", data => { data.requests[0].quantity = 0; }],
        ["reject_negative_zero_quantity", "E_SAFE_QUANTITY", data => { data.lots[0].quantity = -0; }],
        ["reject_negative_capacity", "E_QUANTITY_RANGE", data => { data.destinations[0].availableCapacity = -1; }],
        ["reject_negative_zero_capacity", "E_SAFE_QUANTITY", data => { data.destinations[0].availableCapacity = -0; }],
        ["reject_fractional_capacity", "E_SAFE_QUANTITY", data => { data.destinations[0].availableCapacity = 1.5; }],
        ["reject_unsafe_capacity", "E_SAFE_QUANTITY", data => { data.destinations[0].availableCapacity = Number.MAX_SAFE_INTEGER + 1; }],
        ["reject_fractional_id", "E_SAFE_INTEGER", data => { data.lots[0].lotId = 1.25; }],
        ["reject_zero_lot_id", "E_POSITIVE_INTEGER", data => { data.lots[0].lotId = 0; }],
        ["reject_zero_source_item_id", "E_POSITIVE_INTEGER", data => { data.lots[0].sourceItemId = 0; }],
        ["reject_zero_request_id", "E_POSITIVE_INTEGER", data => { data.requests[0].requestId = 0; }],
        ["reject_zero_destination_id", "E_POSITIVE_INTEGER", data => { data.destinations[0].destinationId = 0; }],
        ["reject_zero_eligible_lot_id", "E_POSITIVE_INTEGER", data => { data.requests[0].eligibleLotIds = [0]; }],
        ["reject_negative_lot_order", "E_NONNEGATIVE_INTEGER", data => { data.lots[0].selectionOrder = -1; }],
        ["reject_negative_request_tiebreak", "E_NONNEGATIVE_INTEGER", data => { data.requests[0].tieBreakOrder = -1; }],
        ["reject_unsafe_priority", "E_SAFE_INTEGER", data => { data.requests[0].priority = Number.MAX_SAFE_INTEGER + 1; }],
        ["reject_negative_zero_priority", "E_SAFE_INTEGER", data => { data.requests[0].priority = -0; }],
        ["reject_unknown_eligible_lot", "E_UNKNOWN_ELIGIBLE_LOT", data => { data.requests[0].eligibleLotIds = [999]; }],
        ["reject_duplicate_eligible_lot", "E_DUPLICATE_ELIGIBLE_LOT", data => { data.requests[0].eligibleLotIds = [1, 1]; }],
        ["reject_nonarray_eligibility", "E_ARRAY", data => { data.requests[0].eligibleLotIds = {}; }],
        ["reject_unknown_destination", "E_UNKNOWN_DESTINATION", data => { data.requests[0].destinationId = 999; }],
        ["reject_string_request_destination_id", "E_SAFE_INTEGER", data => { data.requests[0].destinationId = "21"; }],
        ["reject_zero_request_destination_id", "E_POSITIVE_INTEGER", data => { data.requests[0].destinationId = 0; }],
        ["reject_fractional_request_destination_id", "E_SAFE_INTEGER", data => { data.requests[0].destinationId = 21.5; }],
        ["reject_empty_item_id", "E_ITEM_ID", data => { data.requests[0].itemId = ""; }],
        ["reject_malformed_lot_item_id", "E_ITEM_ID", data => { data.lots[0].itemId = "food ration"; }],
        ["reject_non_string_item_id", "E_ITEM_ID", data => { data.requests[0].itemId = 42; }],
        ["reject_item_id_with_whitespace", "E_ITEM_ID", data => { data.requests[0].itemId = "food ration"; }],
        ["reject_item_id_with_final_newline", "E_ITEM_ID", data => { data.requests[0].itemId = "food:ration\n"; }],
        ["reject_item_id_with_leading_punctuation", "E_ITEM_ID", data => { data.requests[0].itemId = ":food"; }],
        ["reject_overlength_item_id", "E_ITEM_ID", data => { data.requests[0].itemId = "x".repeat(129); }],
        ["reject_missing_eligibility", "E_REQUIRED_FIELD", data => { delete data.requests[0].eligibleLotIds; }],
        ["reject_fractional_provenance_number", "E_PROVENANCE_JSON", data => { data.lots[0].provenance.bad = 1.5; }],
        ["reject_unsafe_provenance_number", "E_PROVENANCE_JSON", data => { data.lots[0].provenance.bad = Number.MAX_SAFE_INTEGER + 1; }],
        ["reject_negative_zero_provenance_number", "E_PROVENANCE_JSON", data => { data.lots[0].provenance.bad = -0; }],
        ["reject_undefined_provenance_value", "E_PROVENANCE_JSON", data => { data.lots[0].provenance.bad = undefined; }],
        ["reject_function_provenance_value", "E_PROVENANCE_JSON", data => { data.lots[0].provenance.bad = function () {}; }],
        ["reject_bigint_provenance_value", "E_PROVENANCE_JSON", data => { data.lots[0].provenance.bad = 1n; }],
        ["reject_invalid_request_provenance", "E_PROVENANCE_JSON", data => { data.requests[0].provenance.bad = function () {}; }],
        ["reject_invalid_destination_provenance", "E_PROVENANCE_JSON", data => { data.destinations[0].provenance.bad = undefined; }],
        ["reject_nonordinary_provenance_object", "E_PROVENANCE_JSON", data => { data.lots[0].provenance.bad = new Date(0); }],
        ["reject_sparse_provenance_array", "E_PROVENANCE_JSON", data => { data.lots[0].provenance.bad = new Array(1); }],
        ["reject_named_provenance_array_field", "E_PROVENANCE_JSON", data => { data.lots[0].provenance.chain.extra = 1; }],
        ["reject_sparse_input_array", "E_INPUT_JSON", data => { data.lots = new Array(1); }],
        ["reject_named_input_array_field", "E_INPUT_JSON", data => { data.requests.extra = { treasury: 1 }; }],
        ["reject_input_symbol_key", "E_INPUT_JSON", data => { data[Symbol("treasury")] = 1; }],
        ["reject_lot_aggregate_overflow", "E_ARITHMETIC_UNSAFE", data => {
            data.lots[0].quantity = Number.MAX_SAFE_INTEGER;
            data.lots.push(lot(2, 1002, "food:ration", 1, 1, "TEST_OVERFLOW"));
        }],
        ["reject_request_aggregate_overflow", "E_ARITHMETIC_UNSAFE", data => {
            data.requests[0].quantity = Number.MAX_SAFE_INTEGER;
            data.requests.push(request(12, "food:ration", 1, 9, 1, [1], 21, "TEST_OVERFLOW"));
        }],
        ["reject_capacity_aggregate_overflow", "E_ARITHMETIC_UNSAFE", data => {
            data.destinations[0].availableCapacity = Number.MAX_SAFE_INTEGER;
            data.destinations.push(destination(22, 1, "TEST_OVERFLOW"));
        }]
    ];
    for (const [name, code, mutate] of invalid) {
        test(name, () => {
            const data = minimalInput();
            mutate(data);
            throwsCode(() => Q.plan(data), code, name);
        });
    }

    test("reject_input_root_type", () => {
        throwsCode(() => Q.plan(null), "E_INPUT_TYPE", "null root");
        throwsCode(() => Q.plan([]), "E_INPUT_TYPE", "array root");
        throwsCode(() => Q.plan(new Map()), "E_INPUT_TYPE", "non-record root");
    });

    test("prototype_named_unknown_fields_rejected_at_every_boundary", () => {
        const boundaries = [
            [data => data, "E_INPUT_FIELD"],
            [data => data.lots[0], "E_LOT_FIELD"],
            [data => data.requests[0], "E_REQUEST_FIELD"],
            [data => data.destinations[0], "E_DESTINATION_FIELD"]
        ];
        for (const [select, code] of boundaries) {
            for (const name of ["constructor", "toString", "__proto__"]) {
                const data = minimalInput();
                Object.defineProperty(select(data), name, {
                    value: { treasury: Number.MAX_SAFE_INTEGER },
                    enumerable: true,
                    configurable: true,
                    writable: true
                });
                throwsCode(() => Q.plan(data), code, name + " at closed boundary");
            }
        }
    });

    test("input_accessors_and_non_enumerable_fields_rejected_without_execution", () => {
        const accessor = minimalInput();
        let reads = 0;
        Object.defineProperty(accessor.lots[0], "quantity", {
            get() { reads++; return 5; },
            enumerable: true,
            configurable: true
        });
        throwsCode(() => Q.plan(accessor), "E_INPUT_JSON", "input accessor");
        equal(reads, 0, "input getter was not invoked");

        const hidden = minimalInput();
        Object.defineProperty(hidden.requests[0], "hiddenBalance", {
            value: 500,
            enumerable: false,
            configurable: true
        });
        throwsCode(() => Q.plan(hidden), "E_INPUT_JSON", "non-enumerable input field");
    });

    test("behavioral_input_array_subclasses_rejected_without_methods_running", () => {
        let mapCalls = 0;
        class InflatingLots extends Array {
            map(callback) {
                mapCalls++;
                return Array.from(this, row => callback(Object.assign({}, row, { quantity: 100 })));
            }
        }
        const mapData = minimalInput();
        const hostileLots = new InflatingLots();
        Array.prototype.push.apply(hostileLots, mapData.lots);
        mapData.lots = hostileLots;
        throwsCode(() => Q.plan(mapData), "E_INPUT_JSON", "overridden map");
        equal(mapCalls, 0, "subclass map was not invoked");
        equal(mapData.lots[0].quantity, 5, "subclass could not inflate stock");

        let sliceCalls = 0;
        class HostileEligibility extends Array {
            slice() { sliceCalls++; return [999]; }
        }
        const sliceData = minimalInput();
        const hostileEligibility = new HostileEligibility();
        Array.prototype.push.apply(hostileEligibility, sliceData.requests[0].eligibleLotIds);
        sliceData.requests[0].eligibleLotIds = hostileEligibility;
        throwsCode(() => Q.plan(sliceData), "E_INPUT_JSON", "overridden slice");
        equal(sliceCalls, 0, "subclass slice was not invoked");

        const prototypeData = minimalInput();
        Object.setPrototypeOf(prototypeData.destinations, Object.create(Array.prototype));
        throwsCode(() => Q.plan(prototypeData), "E_INPUT_JSON", "custom array prototype");

        const counterfeitMapData = minimalInput();
        let inheritedMapReads = 0;
        const counterfeitMapPrototype = Object.create(Object.prototype);
        Object.defineProperty(counterfeitMapPrototype, "constructor", { value: Array });
        Object.defineProperty(counterfeitMapPrototype, "map", {
            get() {
                inheritedMapReads++;
                counterfeitMapData.lots[0].quantity = 100;
                return Array.prototype.map;
            }
        });
        Object.setPrototypeOf(counterfeitMapData.lots, counterfeitMapPrototype);
        throwsCode(() => Q.plan(counterfeitMapData), "E_INPUT_JSON", "counterfeit Array prototype map");
        equal(inheritedMapReads, 0, "counterfeit map getter was not invoked");
        equal(counterfeitMapData.lots[0].quantity, 5, "counterfeit map could not inflate stock");

        const counterfeitSliceData = minimalInput();
        const counterfeitSlicePrototype = Object.create(Object.prototype);
        Object.defineProperty(counterfeitSlicePrototype, "constructor", { value: Array });
        Object.defineProperty(counterfeitSlicePrototype, "slice", { value: function () { return [1]; } });
        Object.setPrototypeOf(counterfeitSliceData.requests[0].eligibleLotIds, counterfeitSlicePrototype);
        throwsCode(() => Q.plan(counterfeitSliceData), "E_INPUT_JSON", "counterfeit Array prototype slice");
    });

    test("foreign_array_intrinsics_cannot_mutate_or_invent_input", () => {
        const foreignLots = vm.runInNewContext(`(() => {
            const nativeMap = Array.prototype.map;
            Array.prototype.map = function (callback) {
                this[0].quantity = 100;
                return nativeMap.call(this, callback);
            };
            return [{
                lotId: 1,
                sourceItemId: 1001,
                itemId: "food:ration",
                quantity: 5,
                selectionOrder: 0,
                provenance: { origin: "TEST_FOREIGN" }
            }];
        })()`);
        const mapData = inputOf(foreignLots,
            [request(11, "food:ration", 10, 1, 0, [1], 21, "TEST_FOREIGN_MAP")],
            [destination(21, 10, "TEST_DEST")]);
        const mapPlan = Q.plan(mapData);
        equal(mapData.lots[0].quantity, 5, "foreign map was not invoked");
        equal(mapPlan.allocations[0].allocatedQuantity, 5, "foreign map could not invent stock");
        independentAudit(mapPlan);

        const foreignEligibility = vm.runInNewContext(`(() => {
            Array.prototype.slice = function () { return [1]; };
            return [];
        })()`);
        const sliceData = inputOf([lot(1, 1001, "food:ration", 5, 0, "TEST_LOT")],
            [request(11, "food:ration", 5, 1, 0, foreignEligibility, 21, "TEST_FOREIGN_SLICE")],
            [destination(21, 5, "TEST_DEST")]);
        const slicePlan = Q.plan(sliceData);
        equal(slicePlan.allocations[0].allocatedQuantity, 0, "foreign slice could not invent eligibility");
        equal(slicePlan.remainingLots[0].remainingQuantity, 5, "ineligible stock remained untouched");
        independentAudit(slicePlan);
    });

    test("missing_fields_never_resolve_inherited_foreign_getters", () => {
        const rootContext = { counter: { reads: 0 } };
        const root = vm.runInNewContext(`(() => {
            Object.defineProperty(Object.prototype, "kind", {
                get() { counter.reads++; return "DEUS_QUARTERMASTER_INPUT"; },
                configurable: true
            });
            return { schemaVersion: 1, lots: [], requests: [], destinations: [] };
        })()`, rootContext);
        throwsCode(() => Q.plan(root), "E_REQUIRED_FIELD", "missing root field");
        equal(rootContext.counter.reads, 0, "root inherited getter was not invoked");

        const rowCases = [
            ["quantity", "lot", data => { data.lots[0] = data.foreign; }],
            ["eligibleLotIds", "request", data => { data.requests[0] = data.foreign; }],
            ["availableCapacity", "destination", data => { data.destinations[0] = data.foreign; }]
        ];
        for (const [field, kind, install] of rowCases) {
            const context = { counter: { reads: 0 } };
            const foreign = vm.runInNewContext(`(() => {
                Object.defineProperty(Object.prototype, ${JSON.stringify(field)}, {
                    get() { counter.reads++; return 100; },
                    configurable: true
                });
                if (${JSON.stringify(kind)} === "lot") return {
                    lotId: 1, sourceItemId: 1001, itemId: "food:ration", selectionOrder: 0, provenance: null
                };
                if (${JSON.stringify(kind)} === "request") return {
                    requestId: 11, itemId: "food:ration", quantity: 3, priority: 1,
                    tieBreakOrder: 0, destinationId: 21, provenance: null
                };
                return { destinationId: 21, provenance: null };
            })()`, context);
            const data = minimalInput();
            data.foreign = foreign;
            install(data);
            delete data.foreign;
            throwsCode(() => Q.plan(data), "E_REQUIRED_FIELD", "missing " + kind + " field");
            equal(context.counter.reads, 0, kind + " inherited getter was not invoked");
        }

        const planContext = { counter: { reads: 0 } };
        const planPrototype = vm.runInNewContext(`(() => {
            Object.defineProperty(Object.prototype, "schemaVersion", {
                get() { counter.reads++; return 1; },
                configurable: true
            });
            return Object.prototype;
        })()`, planContext);
        const missingPlanField = Q.plan(minimalInput());
        delete missingPlanField.schemaVersion;
        Object.setPrototypeOf(missingPlanField, planPrototype);
        throwsCode(() => Q.serialize(missingPlanField), "E_REQUIRED_FIELD", "missing plan field");
        equal(planContext.counter.reads, 0, "plan inherited getter was not invoked");
    });

    test("prior_output_cannot_poison_later_planner_array_behavior", () => {
        const exposed = Q.plan(minimalInput());
        const arrayPrototype = Object.getPrototypeOf(exposed.reservations);
        const names = ["map", "filter", "sort", "slice", "push", "pop", "indexOf"];
        const descriptors = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(arrayPrototype, name)]));
        let later;
        try {
            for (const name of names) {
                Object.defineProperty(arrayPrototype, name, {
                    value: function () { throw new Error("POISONED_ARRAY_METHOD_" + name); },
                    writable: true,
                    configurable: true
                });
            }
            later = Q.plan(complexInput());
            equal(later.conservation.valid, true, "planner emitted a valid proof under prototype poisoning");
            equal(Q.audit(later).ok, true, "later plan validates after output-realm prototype poisoning");
        } finally {
            for (const name of names) Object.defineProperty(arrayPrototype, name, descriptors.get(name));
        }
        independentAudit(later);
    });

    test("counterfeit_record_prototypes_rejected_without_getter_execution", () => {
        const data = minimalInput();
        let inheritedReads = 0;
        const counterfeitObjectPrototype = Object.create(null);
        Object.defineProperty(counterfeitObjectPrototype, "constructor", { value: Object });
        Object.defineProperty(counterfeitObjectPrototype, "quantity", {
            get() { inheritedReads++; return 100; }
        });
        delete data.lots[0].quantity;
        Object.setPrototypeOf(data.lots[0], counterfeitObjectPrototype);
        throwsCode(() => Q.plan(data), "E_INPUT_JSON", "counterfeit Object prototype");
        equal(inheritedReads, 0, "counterfeit record getter was not invoked");
    });

    test("behavioral_provenance_array_subclasses_rejected", () => {
        class HostileProvenance extends Array {}
        const data = minimalInput();
        const hostile = new HostileProvenance();
        Array.prototype.push.apply(hostile, data.lots[0].provenance.chain);
        data.lots[0].provenance.chain = hostile;
        throwsCode(() => Q.plan(data), "E_PROVENANCE_JSON", "provenance array subclass");
    });

    test("provenance_symbols_and_hidden_fields_rejected", () => {
        const objectSymbol = minimalInput();
        objectSymbol.lots[0].provenance[Symbol("hidden")] = "value";
        throwsCode(() => Q.plan(objectSymbol), "E_PROVENANCE_JSON", "provenance object symbol");

        const arraySymbol = minimalInput();
        arraySymbol.lots[0].provenance.chain[Symbol("hidden")] = "value";
        throwsCode(() => Q.plan(arraySymbol), "E_PROVENANCE_JSON", "provenance array symbol");

        const hidden = minimalInput();
        Object.defineProperty(hidden.lots[0].provenance, "hidden", {
            value: 1,
            enumerable: false,
            configurable: true
        });
        throwsCode(() => Q.plan(hidden), "E_PROVENANCE_JSON", "non-enumerable provenance field");
    });

    test("provenance_accessors_rejected_without_execution", () => {
        const objectAccessor = minimalInput();
        let objectReads = 0;
        Object.defineProperty(objectAccessor.lots[0].provenance, "hazard", {
            get() { objectReads++; return 1; },
            enumerable: true,
            configurable: true
        });
        throwsCode(() => Q.plan(objectAccessor), "E_PROVENANCE_JSON", "object accessor");
        equal(objectReads, 0, "provenance object getter was not invoked");

        const arrayAccessor = minimalInput();
        const trail = [];
        let arrayReads = 0;
        Object.defineProperty(trail, "0", {
            get() { arrayReads++; return "mutated"; },
            enumerable: true,
            configurable: true
        });
        arrayAccessor.lots[0].provenance.trail = trail;
        throwsCode(() => Q.plan(arrayAccessor), "E_PROVENANCE_JSON", "array index accessor");
        equal(arrayReads, 0, "provenance array getter was not invoked");
        equal(arrayAccessor.lots[0].quantity, 5, "getter could not mutate input quantity");
    });

    test("persisted_plan_root_version_kind_and_embedded_input_rejected", () => {
        throwsCode(() => Q.serialize(null), "E_PLAN_TYPE", "null plan root");
        const version = Q.plan(minimalInput());
        version.schemaVersion = 2;
        throwsCode(() => Q.serialize(version), "E_SCHEMA_VERSION", "plan schema version");
        const kind = Q.plan(minimalInput());
        kind.kind = "OTHER";
        throwsCode(() => Q.serialize(kind), "E_PLAN_KIND", "plan kind");
        const missing = Q.plan(minimalInput());
        delete missing.input;
        throwsCode(() => Q.serialize(missing), "E_REQUIRED_FIELD", "plan input required");
        const embedded = Q.plan(minimalInput());
        embedded.input.lots[0].quantity = 0;
        throwsCode(() => Q.serialize(embedded), "E_QUANTITY_RANGE", "embedded input revalidated");
    });

    test("persisted_plan_non_json_values_and_descriptors_rejected", () => {
        const cases = [
            plan => { plan.hazard = undefined; },
            plan => { plan.hazard = function () {}; },
            plan => { plan.hazard = 1n; },
            plan => { plan.hazard = Number.MAX_SAFE_INTEGER + 1; },
            plan => { plan.hazard = new Date(0); },
            plan => { plan.hazard = plan; },
            plan => { plan[Symbol("hazard")] = 1; },
            plan => { Object.defineProperty(plan, "hidden", { value: 1, enumerable: false, configurable: true }); }
        ];
        for (const mutate of cases) {
            const plan = Q.plan(minimalInput());
            mutate(plan);
            throwsCode(() => Q.serialize(plan), "E_PLAN_JSON", "invalid persisted JSON graph");
        }
    });

    test("persisted_plan_array_extras_symbols_and_sparse_rows_rejected", () => {
        const named = Q.plan(minimalInput());
        named.reservations.treasury = Number.MAX_SAFE_INTEGER;
        throwsCode(() => Q.serialize(named), "E_PLAN_JSON", "named array field");

        const symbol = Q.plan(minimalInput());
        symbol.allocations[Symbol("balance")] = 99;
        throwsCode(() => Q.serialize(symbol), "E_PLAN_JSON", "array symbol field");

        const sparse = Q.plan(minimalInput());
        delete sparse.reservations[0];
        throwsCode(() => Q.serialize(sparse), "E_PLAN_JSON", "sparse plan array");

        class HostilePlanRows extends Array {}
        const subclass = Q.plan(minimalInput());
        const hostileRows = new HostilePlanRows();
        Array.prototype.push.apply(hostileRows, subclass.reservations);
        subclass.reservations = hostileRows;
        throwsCode(() => Q.serialize(subclass), "E_PLAN_JSON", "plan array subclass");
    });

    test("persisted_plan_accessors_rejected_without_execution", () => {
        const objectAccessor = Q.plan(minimalInput());
        let objectReads = 0;
        Object.defineProperty(objectAccessor.conservation.stock, "available", {
            get() { objectReads++; return 5; },
            enumerable: true,
            configurable: true
        });
        throwsCode(() => Q.serialize(objectAccessor), "E_PLAN_JSON", "plan object accessor");
        equal(objectReads, 0, "plan object getter was not invoked");

        const arrayAccessor = Q.plan(minimalInput());
        let arrayReads = 0;
        Object.defineProperty(arrayAccessor.reservations, "0", {
            get() { arrayReads++; return {}; },
            enumerable: true,
            configurable: true
        });
        throwsCode(() => Q.serialize(arrayAccessor), "E_PLAN_JSON", "plan array accessor");
        equal(arrayReads, 0, "plan array getter was not invoked");
    });

    test("reject_cyclic_provenance", () => {
        const data = minimalInput();
        data.lots[0].provenance.loop = data.lots[0].provenance;
        throwsCode(() => Q.plan(data), "E_PROVENANCE_JSON", "cycle");
    });

    test("every_zero_remainder_and_untouched_lot_is_auditable", () => {
        const data = inputOf([
            lot(1, 101, "food:ration", 2, 0, "TEST_USED"),
            lot(2, 102, "tool:axe", 7, 1, "TEST_UNTOUCHED")
        ], [request(11, "food:ration", 2, 1, 0, [1], 21, "TEST_USE_ALL")], [destination(21, 2, "TEST_DEST")]);
        const plan = Q.plan(data);
        equal(getBy(plan.remainingLots, "lotId", 1).remainingQuantity, 0, "exhausted lot retained");
        equal(getBy(plan.remainingLots, "lotId", 2).remainingQuantity, 7, "untouched lot retained");
        independentAudit(plan);
    });

    return checks;
}

function runCheckList(checks) {
    const results = [];
    for (const check of checks) {
        try {
            check.fn();
            results.push({ name: check.name, pass: true, detail: "condition held" });
        } catch (error) {
            results.push({ name: check.name, pass: false, detail: String(error && (error.stack || error.message) || error).replace(/\s+/g, " ").slice(0, 600) });
        }
    }
    return results;
}

function runChecks(Q, schema = SCHEMA) {
    return runCheckList(defineChecks(Q, schema));
}

function occurrences(source, find) {
    return source.split(find).length - 1;
}

function mutateSource(edits) {
    let source = REAL_SOURCE;
    for (const [find, replacement] of edits) {
        const count = occurrences(source, find);
        if (count !== 1) throw new Error("mutant anchor occurs " + count + " times: " + find.slice(0, 120));
        source = source.replace(find, () => replacement);
    }
    return source;
}

const MUTANTS = [
    {
        name: "ignore_stock_bound",
        kills: ["full_partial_refusal_outputs", "independent_per_identity_conservation"],
        edits: [[
            "            var take = min3(needed, state.remaining, destinationState.remaining);",
            "            var take = needed < destinationState.remaining ? needed : destinationState.remaining;"
        ]]
    },
    {
        name: "ignore_capacity_bound",
        kills: ["full_partial_refusal_outputs", "shared_capacity_cross_item_bound"],
        edits: [[
            "            var take = min3(needed, state.remaining, destinationState.remaining);",
            "            var take = needed < state.remaining ? needed : state.remaining;"
        ]]
    },
    {
        name: "ignore_demand_bound",
        kills: ["full_partial_refusal_outputs", "independent_per_identity_conservation"],
        edits: [[
            "            var take = min3(needed, state.remaining, destinationState.remaining);",
            "            var take = state.remaining < destinationState.remaining ? state.remaining : destinationState.remaining;"
        ]]
    },
    {
        name: "wrong_item_substitution",
        kills: ["wrong_item_and_ineligible_stock_never_substitute", "independent_per_identity_conservation"],
        edits: [[
            "            if (eligibleState && eligibleState.lot.itemId === request.itemId) append(candidates, eligibleState);",
            "            if (eligibleState) append(candidates, eligibleState);"
        ]]
    },
    {
        name: "prototype_named_fields_accepted",
        kills: ["prototype_named_unknown_fields_rejected_at_every_boundary"],
        edits: [[
            "        if (!hasOwn(allowed, keys[i])) append(errors, issue(code, path + \".\" + keys[i], \"unknown field \" + keys[i]));",
            "        if (!allowed[keys[i]]) append(errors, issue(code, path + \".\" + keys[i], \"unknown field \" + keys[i]));"
        ]]
    },
    {
        name: "input_structure_guard_disabled",
        kills: ["input_accessors_and_non_enumerable_fields_rejected_without_execution"],
        edits: [[
            "    inputStructure(input, \"$\", errors);",
            "    // mutant: structure validation disabled"
        ]]
    },
    {
        name: "missing_root_fields_read_from_prototype",
        kills: ["missing_fields_never_resolve_inherited_foreign_getters"],
        edits: [[
            "    if (!rootComplete) return { ok: false, errors: errors };",
            "    if (false && !rootComplete) return { ok: false, errors: errors };"
        ]]
    },
    {
        name: "id_and_order_ranges_disabled",
        kills: ["reject_zero_lot_id", "reject_zero_source_item_id", "reject_zero_request_id", "reject_zero_destination_id", "reject_negative_lot_order", "reject_negative_request_tiebreak"],
        edits: [[
            "    if (minimum !== undefined && value < minimum) {",
            "    if (false && minimum !== undefined && value < minimum) {"
        ]]
    },
    {
        name: "negative_zero_numbers_accepted",
        kills: ["reject_negative_zero_quantity", "reject_negative_zero_capacity", "reject_negative_zero_priority", "reject_negative_zero_provenance_number"],
        edits: [[
            "        (value !== 0 || 1 / value === Infinity);",
            "        true;"
        ]]
    },
    {
        name: "provenance_symbols_allowed",
        kills: ["provenance_symbols_and_hidden_fields_rejected"],
        edits: [[
            "    if (symbols.length) append(errors, issue(options.code, path, options.symbolMessage));",
            "    if (false && symbols.length) append(errors, issue(options.code, path, options.symbolMessage));"
        ]]
    },
    {
        name: "persisted_json_guard_disabled",
        kills: ["persisted_plan_array_extras_symbols_and_sparse_rows_rejected"],
        edits: [[
            "    validatePersistedJson(value, \"$\", errors, []);",
            "    // mutant: persisted JSON validation disabled"
        ]]
    },
    {
        name: "item_proof_creates_balanced_unit",
        kills: ["independent_per_identity_conservation"],
        edits: [[
            "    for (i = 0; i < itemKeys.length; i++) byItem[i] = itemMap[itemKeys[i]];",
            "    for (i = 0; i < itemKeys.length; i++) byItem[i] = itemMap[itemKeys[i]];\n    if (byItem.length) { byItem[0].available += 1; byItem[0].remaining += 1; }"
        ]]
    },
    {
        name: "behavioral_array_prototypes_allowed",
        kills: ["behavioral_input_array_subclasses_rejected_without_methods_running", "behavioral_provenance_array_subclasses_rejected", "persisted_plan_array_extras_symbols_and_sparse_rows_rejected"],
        edits: [[
            "    if (array && !isPlainArray(value)) {",
            "    if (false && array && !isPlainArray(value)) {"
        ]]
    },
    {
        name: "caller_lot_map_invoked",
        kills: ["foreign_array_intrinsics_cannot_mutate_or_invent_input"],
        edits: [[
            "    for (i = 0; i < input.lots.length; i++) append(lots, copyLot(input.lots[i]));",
            "    lots = input.lots.map(copyLot);"
        ]]
    },
    {
        name: "caller_eligibility_slice_invoked",
        kills: ["foreign_array_intrinsics_cannot_mutate_or_invent_input"],
        edits: [[
            "    var eligibleLotIds = copyArray(request.eligibleLotIds);",
            "    var eligibleLotIds = request.eligibleLotIds.slice();"
        ]]
    },
    {
        name: "item_id_grammar_relaxed",
        kills: ["reject_item_id_with_whitespace", "reject_item_id_with_final_newline", "reject_item_id_with_leading_punctuation", "reject_overlength_item_id"],
        edits: [[
            "    if (typeof value !== \"string\" || !ITEM_ID.test(value)) {",
            "    if (typeof value !== \"string\" || value.length === 0) {"
        ]]
    },
    {
        name: "lot_item_id_validation_removed",
        kills: ["reject_malformed_lot_item_id"],
        edits: [[
            "            var lotItemOk = itemId(lot.itemId, lp + \".itemId\", errors);",
            "            var lotItemOk = true;"
        ]]
    },
    {
        name: "request_destination_id_validation_removed",
        kills: ["reject_string_request_destination_id", "reject_zero_request_destination_id", "reject_fractional_request_destination_id"],
        edits: [[
            "            if (safeInteger(request.destinationId, rp + \".destinationId\", errors, 1) && destinationsOk && !destinationIds[request.destinationId]) {",
            "            if (destinationsOk && !destinationIds[request.destinationId]) {"
        ]]
    },
    {
        name: "eligibility_array_validation_removed",
        kills: ["reject_nonarray_eligibility"],
        edits: [[
            "            if (denseArray(request.eligibleLotIds, rp + \".eligibleLotIds\", errors)) {",
            "            if (true) {"
        ]]
    },
    {
        name: "request_provenance_validation_removed",
        kills: ["reject_invalid_request_provenance"],
        edits: [[
            "            if (hasOwn(request, \"provenance\")) jsonValue(request.provenance, rp + \".provenance\", errors, []);",
            "            // mutant: request provenance validation removed"
        ]]
    },
    {
        name: "destination_provenance_validation_removed",
        kills: ["reject_invalid_destination_provenance"],
        edits: [[
            "            if (hasOwn(destination, \"provenance\")) jsonValue(destination.provenance, dp + \".provenance\", errors, []);",
            "            // mutant: destination provenance validation removed"
        ]]
    },
    {
        name: "request_provenance_erased",
        kills: ["canonical_input_preserves_every_caller_fact"],
        edits: [[
            "function copyRequest(request) {\n    var eligibleLotIds = copyArray(request.eligibleLotIds);\n    sortArray(eligibleLotIds, compareNumber);\n    return {\n        requestId: request.requestId,\n        itemId: request.itemId,\n        quantity: request.quantity,\n        priority: request.priority,\n        tieBreakOrder: request.tieBreakOrder,\n        eligibleLotIds: eligibleLotIds,\n        destinationId: request.destinationId,\n        provenance: cloneJson(request.provenance)\n    };\n}",
            "function copyRequest(request) {\n    var eligibleLotIds = copyArray(request.eligibleLotIds);\n    sortArray(eligibleLotIds, compareNumber);\n    return {\n        requestId: request.requestId,\n        itemId: request.itemId,\n        quantity: request.quantity,\n        priority: request.priority,\n        tieBreakOrder: request.tieBreakOrder,\n        eligibleLotIds: eligibleLotIds,\n        destinationId: request.destinationId,\n        provenance: {}\n    };\n}"
        ]]
    },
    {
        name: "destination_provenance_erased",
        kills: ["canonical_input_preserves_every_caller_fact"],
        edits: [[
            "function copyDestination(destination) {\n    return {\n        destinationId: destination.destinationId,\n        availableCapacity: destination.availableCapacity,\n        provenance: cloneJson(destination.provenance)\n    };\n}",
            "function copyDestination(destination) {\n    return {\n        destinationId: destination.destinationId,\n        availableCapacity: destination.availableCapacity,\n        provenance: {}\n    };\n}"
        ]]
    },
    {
        name: "destination_provenance_alias",
        kills: ["input_output_and_cross_call_graphs_are_detached"],
        edits: [[
            "function copyDestination(destination) {\n    return {\n        destinationId: destination.destinationId,\n        availableCapacity: destination.availableCapacity,\n        provenance: cloneJson(destination.provenance)\n    };\n}",
            "function copyDestination(destination) {\n    return {\n        destinationId: destination.destinationId,\n        availableCapacity: destination.availableCapacity,\n        provenance: destination.provenance\n    };\n}"
        ]]
    },
    {
        name: "reservation_request_provenance_alias",
        kills: ["input_output_and_cross_call_graphs_are_detached"],
        edits: [[
            "                requestProvenance: cloneJson(request.provenance),",
            "                requestProvenance: request.provenance,"
        ]]
    },
    {
        name: "deserialize_skips_validation",
        kills: ["deserialize_revalidates_parseable_forged_plans"],
        edits: [[
            "    assertPlan(value);\n    return cloneJson(value);",
            "    return cloneJson(value);"
        ]]
    },
    {
        name: "audit_forces_success",
        kills: ["audit_reports_invalid_plan_errors_without_conservation"],
        edits: [[
            "        ok: checked.ok,",
            "        ok: true,"
        ]]
    },
    {
        name: "audit_conservation_alias",
        kills: ["persisted_plan_round_trip_and_audit"],
        edits: [[
            "        conservation: checked.ok ? cloneJson(value.conservation) : null",
            "        conservation: checked.ok ? value.conservation : null"
        ]]
    },
    {
        name: "duplicate_lot_id_accepted",
        kills: ["reject_duplicate_lot_id"],
        edits: [[
            "                if (lotIds[lot.lotId]) append(errors, issue(\"E_DUPLICATE_LOT_ID\", lp + \".lotId\", \"lotId is duplicated\"));",
            "                if (false && lotIds[lot.lotId]) append(errors, issue(\"E_DUPLICATE_LOT_ID\", lp + \".lotId\", \"lotId is duplicated\"));"
        ]]
    },
    {
        name: "duplicate_request_id_accepted",
        kills: ["reject_duplicate_request_id"],
        edits: [[
            "                if (requestIds[request.requestId]) append(errors, issue(\"E_DUPLICATE_REQUEST_ID\", rp + \".requestId\", \"requestId is duplicated\"));",
            "                if (false && requestIds[request.requestId]) append(errors, issue(\"E_DUPLICATE_REQUEST_ID\", rp + \".requestId\", \"requestId is duplicated\"));"
        ]]
    },
    {
        name: "duplicate_source_item_id_accepted",
        kills: ["reject_duplicate_source_item_id"],
        edits: [[
            "                if (sourceIds[lot.sourceItemId]) append(errors, issue(\"E_DUPLICATE_SOURCE_ITEM_ID\", lp + \".sourceItemId\", \"physical sourceItemId is duplicated\"));",
            "                if (false && sourceIds[lot.sourceItemId]) append(errors, issue(\"E_DUPLICATE_SOURCE_ITEM_ID\", lp + \".sourceItemId\", \"physical sourceItemId is duplicated\"));"
        ]]
    },
    {
        name: "unsafe_quantity_accepted",
        kills: ["reject_unsafe_quantity", "reject_unsafe_capacity"],
        edits: [[
            "function quantity(value, path, errors, allowZero) {\n    if (!isCanonicalSafeInteger(value)) {",
            "function quantity(value, path, errors, allowZero) {\n    if (typeof value !== \"number\" || !Number.isInteger(value)) {"
        ]]
    },
    {
        name: "fractional_quantity_rounded",
        kills: ["reject_fractional_quantity"],
        edits: [[
            "function quantity(value, path, errors, allowZero) {\n    if (!isCanonicalSafeInteger(value)) {\n        append(errors, issue(\"E_SAFE_QUANTITY\", path, \"quantity must be a safe integer\"));",
            "function quantity(value, path, errors, allowZero) {\n    value = typeof value === \"number\" ? Math.floor(value) : value;\n    if (!isCanonicalSafeInteger(value)) {\n        append(errors, issue(\"E_SAFE_QUANTITY\", path, \"quantity must be a safe integer\"));"
        ]]
    },
    {
        name: "ambiguous_request_tie_accepted",
        kills: ["reject_ambiguous_request_order"],
        edits: [[
            "                if (requestOrders[orderKey]) append(errors, issue(\"E_AMBIGUOUS_REQUEST_ORDER\", rp + \".tieBreakOrder\", \"priority and tieBreakOrder pair must be unique\"));",
            "                if (false && requestOrders[orderKey]) append(errors, issue(\"E_AMBIGUOUS_REQUEST_ORDER\", rp + \".tieBreakOrder\", \"priority and tieBreakOrder pair must be unique\"));"
        ]]
    },
    {
        name: "priority_reversed",
        kills: ["priority_and_tiebreak_are_caller_order"],
        edits: [[
            "    if (a.priority !== b.priority) return a.priority > b.priority ? -1 : 1;",
            "    if (a.priority !== b.priority) return a.priority < b.priority ? -1 : 1;"
        ]]
    },
    {
        name: "lot_order_ignored",
        kills: ["lot_selection_order_not_array_or_id", "multiple_lots_keep_order_identity_and_provenance"],
        edits: [[
            "            return compareNumber(a.lot.selectionOrder, b.lot.selectionOrder);",
            "            return compareNumber(a.lot.lotId, b.lot.lotId);"
        ]]
    },
    {
        name: "input_output_alias",
        kills: ["input_output_and_cross_call_graphs_are_detached", "input_permutations_serialize_identically"],
        edits: [[
            "    var canonical = canonicalInput(input);",
            "    var canonical = input;"
        ]]
    },
    {
        name: "create_one_unit",
        kills: ["independent_per_identity_conservation", "persisted_plan_round_trip_and_audit"],
        edits: [[
            "            remainingQuantity: state.remaining,",
            "            remainingQuantity: state.remaining + 1,"
        ]]
    },
    {
        name: "lose_one_unit",
        kills: ["independent_per_identity_conservation", "persisted_plan_round_trip_and_audit"],
        edits: [[
            "            remainingQuantity: state.remaining,",
            "            remainingQuantity: state.remaining - 1,"
        ]]
    },
    {
        name: "capacity_resets_each_request",
        kills: ["shared_capacity_cross_item_bound", "independent_per_identity_conservation"],
        edits: [[
            "        var destinationState = destinationStates.get(request.destinationId);\n        var needed = request.quantity;",
            "        var destinationState = destinationStates.get(request.destinationId);\n        destinationState.remaining = destinationState.destination.availableCapacity;\n        var needed = request.quantity;"
        ]]
    },
    {
        name: "treasury_as_stock_fallback",
        kills: ["treasury_field_rejected", "financial_values_in_provenance_have_no_supply_path"],
        edits: [
            [
                "        { schemaVersion: 1, kind: 1, lots: 1, requests: 1, destinations: 1 },",
                "        { schemaVersion: 1, kind: 1, lots: 1, requests: 1, destinations: 1, treasury: 1, treasuryBalance: 1, wealth: 1, price: 1, prices: 1, balance: 1, balances: 1, accounts: 1 },"
            ],
            [
                "        var allocatedQuantity = request.quantity - needed;",
                "        if (needed > 0 && candidates.length === 0 && (input.treasuryBalance > 0 || (request.provenance.financialContext && request.provenance.financialContext.treasuryBalance > 0))) needed = 0;\n        var allocatedQuantity = request.quantity - needed;"
            ],
            [
                "            capacityAvailable === capacityReserved + capacityRemaining && reserved === allocated",
                "            capacityAvailable === capacityReserved + capacityRemaining"
            ]
        ]
    },
    {
        name: "shallow_lot_provenance_copy",
        kills: ["input_output_and_cross_call_graphs_are_detached"],
        edits: [[
            "function copyLot(lot) {\n    return {\n        lotId: lot.lotId,\n        sourceItemId: lot.sourceItemId,\n        itemId: lot.itemId,\n        quantity: lot.quantity,\n        selectionOrder: lot.selectionOrder,\n        provenance: cloneJson(lot.provenance)\n    };\n}",
            "function copyLot(lot) {\n    return {\n        lotId: lot.lotId,\n        sourceItemId: lot.sourceItemId,\n        itemId: lot.itemId,\n        quantity: lot.quantity,\n        selectionOrder: lot.selectionOrder,\n        provenance: lot.provenance\n    };\n}"
        ]]
    }
];

const SCHEMA_MUTANTS = [
    {
        name: "positive_ids_allow_zero",
        kills: ["schema_rejects_id_bounds_closed_required_enum_and_unique_fields"],
        mutate: schema => { schema.$defs.positiveId.minimum = 0; }
    },
    {
        name: "lot_allows_unknown_fields",
        kills: ["schema_rejects_id_bounds_closed_required_enum_and_unique_fields"],
        mutate: schema => { schema.$defs.lot.additionalProperties = true; }
    },
    {
        name: "lot_has_no_required_fields",
        kills: ["schema_rejects_id_bounds_closed_required_enum_and_unique_fields"],
        mutate: schema => { schema.$defs.lot.required = []; }
    },
    {
        name: "allocation_status_unbounded",
        kills: ["schema_rejects_id_bounds_closed_required_enum_and_unique_fields"],
        mutate: schema => { delete schema.$defs.allocation.properties.status.enum; }
    },
    {
        name: "eligibility_ids_not_unique",
        kills: ["schema_rejects_id_bounds_closed_required_enum_and_unique_fields"],
        mutate: schema => { schema.$defs.request.properties.eligibleLotIds.uniqueItems = false; }
    }
];

let passed = 0;
let failed = 0;
function report(name, pass, detail) {
    const line = (pass ? "PASS " : "FAIL ") + name + (detail ? ": " + detail : "");
    (pass ? console.log : console.error)(line);
    if (pass) passed++;
    else failed++;
}

function provokeHarnessFailure() {
    const results = runCheckList([{
        name: "deliberate_failing_fixture",
        fn: function () { equal("actual", "expected", "deliberate harness provocation"); }
    }]);
    for (const result of results) report(result.name, result.pass, result.detail);
    console.log("RESULT: " + passed + " passed, " + failed + " failed");
    process.exit(failed === 0 ? 0 : 1);
}

function main() {
    console.log("=== SOC.32.01 QUARTERMASTER PHYSICAL ALLOCATION ===");
    const started = process.hrtime.bigint();
    let Q;
    try {
        Q = loadModule(REAL_SOURCE);
        report("module_loads_in_bare_context", true, "no host dependency used during load");
    } catch (error) {
        report("module_loads_in_bare_context", false, String(error.stack || error));
        console.log("RESULT: " + passed + " passed, " + failed + " failed");
        process.exit(1);
    }

    const forbidden = [
        /\bwindow\b/, /\bdocument\b/, /\bglobalThis\b/, /\bprocess\b/, /\brequire\s*\(/,
        /\bDate\b/, /Math\s*\.\s*random/, /\bconsole\b/, /\bsetTimeout\b/, /\bsetInterval\b/,
        /\bDataManager\b/, /\bPluginManager\b/, /\bSceneManager\b/, /\$game[A-Za-z0-9_]*/
    ];
    const purityHits = forbidden.filter(pattern => pattern.test(REAL_SOURCE)).map(pattern => String(pattern));
    report("source_has_no_clock_random_filesystem_ui_or_engine_path", purityHits.length === 0, purityHits.length ? purityHits.join(", ") : "forbidden host identifiers absent");

    const docsExist = fs.existsSync(DOC_PATH) && fs.existsSync(GAP_PATH);
    report("contract_and_authority_gap_records_exist", docsExist, docsExist ? "both tracked documents readable" : "missing system contract or authority gaps");

    const baseline = runChecks(Q);
    for (const result of baseline) report(result.name, result.pass, result.detail);

    const provocation = childProcess.spawnSync(process.execPath, [__filename, "--provoke-failure"], {
        cwd: ROOT,
        encoding: "utf8",
        windowsHide: true
    });
    const provocationOutput = String(provocation.stdout || "") + String(provocation.stderr || "");
    const provocationWorked = provocation.status === 1 &&
        provocationOutput.includes("FAIL deliberate_failing_fixture") &&
        provocationOutput.includes("RESULT: 0 passed, 1 failed");
    report("harness_real_failure_path_exits_nonzero", provocationWorked,
        provocationWorked ? "child runner emitted named FAIL and RESULT: 0 passed, 1 failed with exit 1" :
            "status=" + provocation.status + " output=" + provocationOutput.replace(/\s+/g, " ").slice(0, 240));

    const baselineByName = new Map(baseline.map(result => [result.name, result]));
    if (baseline.every(result => result.pass)) {
        for (const mutant of MUTANTS) {
            let source;
            try {
                source = mutateSource(mutant.edits);
            } catch (error) {
                report("mutant_" + mutant.name + "_killed", false, error.message);
                continue;
            }
            let mutantQ;
            try {
                mutantQ = loadModule(source);
            } catch (error) {
                report("mutant_" + mutant.name + "_killed", false, "mutant failed to load: " + String(error.message).slice(0, 180));
                continue;
            }
            const results = runChecks(mutantQ);
            const resultByName = new Map(results.map(result => [result.name, result]));
            const badControls = mutant.kills.filter(name => !baselineByName.has(name) || !baselineByName.get(name).pass);
            const killers = mutant.kills.filter(name => resultByName.has(name) && !resultByName.get(name).pass);
            const survivedTargets = mutant.kills.filter(name => !resultByName.has(name));
            const killed = badControls.length === 0 && survivedTargets.length === 0 && killers.length > 0;
            report("mutant_" + mutant.name + "_killed", killed,
                killed ? "failed named control(s): " + killers.join(", ") :
                    "bad baseline=" + badControls.join(",") + " missing=" + survivedTargets.join(",") + " killers=" + killers.join(","));
        }
        for (const mutant of SCHEMA_MUTANTS) {
            const mutantSchema = clone(SCHEMA);
            mutant.mutate(mutantSchema);
            const results = runChecks(Q, mutantSchema);
            const resultByName = new Map(results.map(result => [result.name, result]));
            const badControls = mutant.kills.filter(name => !baselineByName.has(name) || !baselineByName.get(name).pass);
            const killers = mutant.kills.filter(name => resultByName.has(name) && !resultByName.get(name).pass);
            const survivedTargets = mutant.kills.filter(name => !resultByName.has(name));
            const killed = badControls.length === 0 && survivedTargets.length === 0 && killers.length > 0;
            report("schema_mutant_" + mutant.name + "_killed", killed,
                killed ? "failed named control(s): " + killers.join(", ") :
                    "bad baseline=" + badControls.join(",") + " missing=" + survivedTargets.join(",") + " killers=" + killers.join(","));
        }
    } else {
        report("mutants_require_clean_baseline", false, "one or more real-module checks failed");
    }

    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    console.log("checks include " + baseline.length + " real-module conditions, " + MUTANTS.length +
        " source mutants, and " + SCHEMA_MUTANTS.length + " schema mutants; " + elapsedMs.toFixed(0) + " ms");
    console.log("RESULT: " + passed + " passed, " + failed + " failed");
    process.exit(failed === 0 ? 0 : 1);
}

if (process.argv.includes("--provoke-failure")) provokeHarnessFailure();
else main();
