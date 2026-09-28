"use strict";

// SOC.32.01: an isolated, pure planner over caller-supplied physical stock facts.
// It owns no live inventory state and performs no transfers or reservation lifecycle work.

var VERSION = 1;
var INPUT_KIND = "DEUS_QUARTERMASTER_INPUT";
var PLAN_KIND = "DEUS_QUARTERMASTER_PLAN";
var MAX_SAFE = Number.MAX_SAFE_INTEGER;
var ITEM_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}(?![\s\S])/;
var sortArrayNative = Function.prototype.call.bind(Array.prototype.sort);
var REFUSAL_CODES = Object.freeze([
    "ELIGIBLE_EXACT_STOCK_EXHAUSTED",
    "DESTINATION_CAPACITY_EXHAUSTED",
    "STOCK_AND_DESTINATION_CAPACITY_EXHAUSTED"
]);

function append(array, value) {
    array[array.length] = value;
}

function copyArray(array) {
    var copy = [];
    for (var i = 0; i < array.length; i++) copy[i] = array[i];
    return copy;
}

function sortArray(array, compare) {
    sortArrayNative(array, compare);
    return array;
}

function containsIdentity(array, value) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] === value) return true;
    }
    return false;
}

function isCanonicalSafeInteger(value) {
    return typeof value === "number" && Number.isSafeInteger(value) &&
        (value !== 0 || 1 / value === Infinity);
}

function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
}

function hasNativeConstructor(prototype, name) {
    var descriptor = prototype && Object.getOwnPropertyDescriptor(prototype, "constructor");
    if (!descriptor || !hasOwn(descriptor, "value") || typeof descriptor.value !== "function") return false;
    try {
        return descriptor.value.prototype === prototype &&
            Function.prototype.toString.call(descriptor.value) ===
            "function " + name + "() { [native code] }";
    } catch (error) {
        return false;
    }
}

function isRecord(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    var prototype;
    try {
        prototype = Object.getPrototypeOf(value);
    } catch (error) {
        return false;
    }
    if (prototype === null) return true;
    try {
        return Object.getPrototypeOf(prototype) === null && hasNativeConstructor(prototype, "Object");
    } catch (error) {
        return false;
    }
}

function isPlainArray(value) {
    if (!Array.isArray(value)) return false;
    try {
        var prototype = Object.getPrototypeOf(value);
        if (!prototype || !hasNativeConstructor(prototype, "Array")) return false;
        var objectPrototype = Object.getPrototypeOf(prototype);
        return objectPrototype !== null && Object.getPrototypeOf(objectPrototype) === null &&
            hasNativeConstructor(objectPrototype, "Object");
    } catch (error) {
        return false;
    }
}

function issue(code, path, message) {
    return { code: code, path: path, message: message };
}

function failFrom(errors) {
    var first = errors[0] || issue("E_QUARTERMASTER", "$", "quartermaster validation failed");
    var error = new Error(first.path + ": " + first.message);
    error.code = first.code;
    error.path = first.path;
    error.errors = copyArray(errors);
    return error;
}

function knownFields(record, allowed, required, path, code, errors) {
    var keys = Object.keys(record);
    var i;
    var complete = true;
    for (i = 0; i < keys.length; i++) {
        if (!hasOwn(allowed, keys[i])) append(errors, issue(code, path + "." + keys[i], "unknown field " + keys[i]));
    }
    for (i = 0; i < required.length; i++) {
        if (!hasOwn(record, required[i])) {
            append(errors, issue("E_REQUIRED_FIELD", path + "." + required[i], "required field is missing"));
            complete = false;
        }
    }
    return complete;
}

function safeInteger(value, path, errors, minimum) {
    if (!isCanonicalSafeInteger(value)) {
        append(errors, issue("E_SAFE_INTEGER", path, "must be a safe integer"));
        return false;
    }
    if (minimum !== undefined && value < minimum) {
        append(errors, issue(minimum === 1 ? "E_POSITIVE_INTEGER" : "E_NONNEGATIVE_INTEGER", path,
            minimum === 1 ? "must be a positive safe integer" : "must be a nonnegative safe integer"));
        return false;
    }
    return true;
}

function quantity(value, path, errors, allowZero) {
    if (!isCanonicalSafeInteger(value)) {
        append(errors, issue("E_SAFE_QUANTITY", path, "quantity must be a safe integer"));
        return false;
    }
    if (value < (allowZero ? 0 : 1)) {
        append(errors, issue("E_QUANTITY_RANGE", path, allowZero ? "quantity must be nonnegative" : "quantity must be positive"));
        return false;
    }
    return true;
}

function itemId(value, path, errors) {
    if (typeof value !== "string" || !ITEM_ID.test(value)) {
        append(errors, issue("E_ITEM_ID", path, "must be an exact nonempty item catalogue id"));
        return false;
    }
    return true;
}

function isArrayIndexName(name, length) {
    if (!/^(0|[1-9][0-9]*)$/.test(name)) return false;
    var index = Number(name);
    return Number.isSafeInteger(index) && index >= 0 && index < length && String(index) === name;
}

function persistedTree(value, path, errors, ancestors, options) {
    var valueType = typeof value;
    if (value === null || valueType === "string" || valueType === "boolean") return;
    if (valueType === "number") {
        if (options.checkValues && !isCanonicalSafeInteger(value)) {
            append(errors, issue(options.code, path, options.numberMessage));
        }
        return;
    }
    if (valueType !== "object") {
        if (options.checkValues) append(errors, issue(options.code, path, options.valueMessage));
        return;
    }
    if (containsIdentity(ancestors, value)) {
        append(errors, issue(options.code, path, options.cycleMessage));
        return;
    }

    var array = Array.isArray(value);
    if (array && !isPlainArray(value)) {
        append(errors, issue(options.code, path, options.arrayPrototypeMessage));
        return;
    }
    if (!array && !isRecord(value)) {
        append(errors, issue(options.code, path, options.recordMessage));
        return;
    }
    append(ancestors, value);
    var symbols = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(value) : [];
    if (symbols.length) append(errors, issue(options.code, path, options.symbolMessage));
    var names = Object.getOwnPropertyNames(value);

    if (array) {
        var lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
        var length = lengthDescriptor && lengthDescriptor.value;
        var indices = [];
        for (var a = 0; a < names.length; a++) {
            var arrayName = names[a];
            if (arrayName === "length") continue;
            if (!isArrayIndexName(arrayName, length)) {
                append(errors, issue(options.code, path + "." + arrayName, options.arrayFieldMessage));
            } else {
                append(indices, arrayName);
            }
        }
        if (indices.length !== length) append(errors, issue(options.code, path, options.sparseMessage));
        for (a = 0; a < indices.length; a++) {
            var indexName = indices[a];
            var indexDescriptor = Object.getOwnPropertyDescriptor(value, indexName);
            var indexPath = path + "[" + indexName + "]";
            if (!indexDescriptor || !indexDescriptor.enumerable || !hasOwn(indexDescriptor, "value")) {
                append(errors, issue(options.code, indexPath, options.fieldMessage));
            } else {
                persistedTree(indexDescriptor.value, indexPath, errors, ancestors, options);
            }
        }
    } else {
        for (var n = 0; n < names.length; n++) {
            var name = names[n];
            var descriptor = Object.getOwnPropertyDescriptor(value, name);
            var fieldPath = path + "." + name;
            if (!descriptor || !descriptor.enumerable || !hasOwn(descriptor, "value")) {
                append(errors, issue(options.code, fieldPath, options.fieldMessage));
            } else if (!(options.skipProvenance && name === "provenance")) {
                persistedTree(descriptor.value, fieldPath, errors, ancestors, options);
            }
        }
    }
    ancestors.length -= 1;
}

function inputStructure(value, path, errors) {
    persistedTree(value, path, errors, [], {
        code: "E_INPUT_JSON",
        checkValues: false,
        skipProvenance: true,
        numberMessage: "input numbers must be safe integers",
        valueMessage: "input contains a non-JSON value",
        cycleMessage: "input must not be cyclic",
        recordMessage: "input objects must be ordinary records",
        symbolMessage: "input records and arrays must not have symbol keys",
        arrayPrototypeMessage: "input arrays must have the ordinary Array prototype",
        arrayFieldMessage: "input arrays must not have named or non-index fields",
        sparseMessage: "input arrays must not be sparse",
        fieldMessage: "input fields must be enumerable data fields"
    });
}

function jsonValue(value, path, errors, ancestors) {
    persistedTree(value, path, errors, ancestors, {
        code: "E_PROVENANCE_JSON",
        checkValues: true,
        skipProvenance: false,
        numberMessage: "numeric provenance must be a safe integer",
        valueMessage: "provenance must contain only persisted JSON values",
        cycleMessage: "provenance must not be cyclic",
        recordMessage: "provenance objects must be ordinary records",
        symbolMessage: "provenance records and arrays must not have symbol keys",
        arrayPrototypeMessage: "provenance arrays must have the ordinary Array prototype",
        arrayFieldMessage: "provenance arrays must not have named or non-index fields",
        sparseMessage: "provenance arrays must not be sparse",
        fieldMessage: "provenance fields must be enumerable data fields"
    });
}

function denseArray(value, path, errors) {
    if (!Array.isArray(value)) {
        append(errors, issue("E_ARRAY", path, "must be an array"));
        return false;
    }
    for (var i = 0; i < value.length; i++) {
        if (!hasOwn(value, i)) {
            append(errors, issue("E_ARRAY", path + "[" + i + "]", "array must not be sparse"));
            return false;
        }
    }
    return true;
}

function checkedValidationAdd(total, add, path, errors) {
    if (total > MAX_SAFE - add) {
        append(errors, issue("E_ARITHMETIC_UNSAFE", path, "aggregate exceeds the safe-integer range"));
        return total;
    }
    return total + add;
}

function validateInput(input) {
    var errors = [];
    if (!isRecord(input)) return { ok: false, errors: [issue("E_INPUT_TYPE", "$", "input must be an object")] };
    inputStructure(input, "$", errors);
    if (errors.length) return { ok: false, errors: errors };
    var rootComplete = knownFields(input,
        { schemaVersion: 1, kind: 1, lots: 1, requests: 1, destinations: 1 },
        ["schemaVersion", "kind", "lots", "requests", "destinations"], "$", "E_INPUT_FIELD", errors);
    if (!rootComplete) return { ok: false, errors: errors };
    if (input.schemaVersion !== VERSION) append(errors, issue("E_SCHEMA_VERSION", "$.schemaVersion", "supported schemaVersion is 1"));
    if (input.kind !== INPUT_KIND) append(errors, issue("E_INPUT_KIND", "$.kind", "kind must be " + INPUT_KIND));

    var lotsOk = denseArray(input.lots, "$.lots", errors);
    var requestsOk = denseArray(input.requests, "$.requests", errors);
    var destinationsOk = denseArray(input.destinations, "$.destinations", errors);
    var lotIds = Object.create(null);
    var sourceIds = Object.create(null);
    var lotOrders = Object.create(null);
    var requestIds = Object.create(null);
    var requestOrders = Object.create(null);
    var destinationIds = Object.create(null);
    var lotTotal = 0;
    var requestTotal = 0;
    var capacityTotal = 0;
    var lotByItem = Object.create(null);
    var requestByItem = Object.create(null);
    var i;

    if (lotsOk) {
        for (i = 0; i < input.lots.length; i++) {
            var lot = input.lots[i];
            var lp = "$.lots[" + i + "]";
            if (!isRecord(lot)) {
                append(errors, issue("E_LOT_TYPE", lp, "lot must be an object"));
                continue;
            }
            if (!knownFields(lot,
                { lotId: 1, sourceItemId: 1, itemId: 1, quantity: 1, selectionOrder: 1, provenance: 1 },
                ["lotId", "sourceItemId", "itemId", "quantity", "selectionOrder", "provenance"], lp, "E_LOT_FIELD", errors)) continue;
            if (safeInteger(lot.lotId, lp + ".lotId", errors, 1)) {
                if (lotIds[lot.lotId]) append(errors, issue("E_DUPLICATE_LOT_ID", lp + ".lotId", "lotId is duplicated"));
                lotIds[lot.lotId] = true;
            }
            if (safeInteger(lot.sourceItemId, lp + ".sourceItemId", errors, 1)) {
                if (sourceIds[lot.sourceItemId]) append(errors, issue("E_DUPLICATE_SOURCE_ITEM_ID", lp + ".sourceItemId", "physical sourceItemId is duplicated"));
                sourceIds[lot.sourceItemId] = true;
            }
            var lotItemOk = itemId(lot.itemId, lp + ".itemId", errors);
            if (quantity(lot.quantity, lp + ".quantity", errors, false)) {
                lotTotal = checkedValidationAdd(lotTotal, lot.quantity, "$.lots", errors);
                if (lotItemOk) {
                    var oldLotItem = lotByItem[lot.itemId] || 0;
                    lotByItem[lot.itemId] = checkedValidationAdd(oldLotItem, lot.quantity, "$.lots(item " + lot.itemId + ")", errors);
                }
            }
            if (safeInteger(lot.selectionOrder, lp + ".selectionOrder", errors, 0)) {
                if (lotOrders[lot.selectionOrder]) append(errors, issue("E_AMBIGUOUS_LOT_ORDER", lp + ".selectionOrder", "selectionOrder must be globally unique"));
                lotOrders[lot.selectionOrder] = true;
            }
            if (hasOwn(lot, "provenance")) jsonValue(lot.provenance, lp + ".provenance", errors, []);
        }
    }

    if (destinationsOk) {
        for (i = 0; i < input.destinations.length; i++) {
            var destination = input.destinations[i];
            var dp = "$.destinations[" + i + "]";
            if (!isRecord(destination)) {
                append(errors, issue("E_DESTINATION_TYPE", dp, "destination must be an object"));
                continue;
            }
            if (!knownFields(destination,
                { destinationId: 1, availableCapacity: 1, provenance: 1 },
                ["destinationId", "availableCapacity", "provenance"], dp, "E_DESTINATION_FIELD", errors)) continue;
            if (safeInteger(destination.destinationId, dp + ".destinationId", errors, 1)) {
                if (destinationIds[destination.destinationId]) append(errors, issue("E_DUPLICATE_DESTINATION_ID", dp + ".destinationId", "destinationId is duplicated"));
                destinationIds[destination.destinationId] = true;
            }
            if (quantity(destination.availableCapacity, dp + ".availableCapacity", errors, true)) {
                capacityTotal = checkedValidationAdd(capacityTotal, destination.availableCapacity, "$.destinations", errors);
            }
            if (hasOwn(destination, "provenance")) jsonValue(destination.provenance, dp + ".provenance", errors, []);
        }
    }

    if (requestsOk) {
        for (i = 0; i < input.requests.length; i++) {
            var request = input.requests[i];
            var rp = "$.requests[" + i + "]";
            if (!isRecord(request)) {
                append(errors, issue("E_REQUEST_TYPE", rp, "request must be an object"));
                continue;
            }
            if (!knownFields(request,
                { requestId: 1, itemId: 1, quantity: 1, priority: 1, tieBreakOrder: 1, eligibleLotIds: 1, destinationId: 1, provenance: 1 },
                ["requestId", "itemId", "quantity", "priority", "tieBreakOrder", "eligibleLotIds", "destinationId", "provenance"],
                rp, "E_REQUEST_FIELD", errors)) continue;
            if (safeInteger(request.requestId, rp + ".requestId", errors, 1)) {
                if (requestIds[request.requestId]) append(errors, issue("E_DUPLICATE_REQUEST_ID", rp + ".requestId", "requestId is duplicated"));
                requestIds[request.requestId] = true;
            }
            var requestItemOk = itemId(request.itemId, rp + ".itemId", errors);
            if (quantity(request.quantity, rp + ".quantity", errors, false)) {
                requestTotal = checkedValidationAdd(requestTotal, request.quantity, "$.requests", errors);
                if (requestItemOk) {
                    var oldRequestItem = requestByItem[request.itemId] || 0;
                    requestByItem[request.itemId] = checkedValidationAdd(oldRequestItem, request.quantity, "$.requests(item " + request.itemId + ")", errors);
                }
            }
            var priorityOk = safeInteger(request.priority, rp + ".priority", errors);
            var tieOk = safeInteger(request.tieBreakOrder, rp + ".tieBreakOrder", errors, 0);
            if (priorityOk && tieOk) {
                var orderKey = request.priority + ":" + request.tieBreakOrder;
                if (requestOrders[orderKey]) append(errors, issue("E_AMBIGUOUS_REQUEST_ORDER", rp + ".tieBreakOrder", "priority and tieBreakOrder pair must be unique"));
                requestOrders[orderKey] = true;
            }
            if (safeInteger(request.destinationId, rp + ".destinationId", errors, 1) && destinationsOk && !destinationIds[request.destinationId]) {
                append(errors, issue("E_UNKNOWN_DESTINATION", rp + ".destinationId", "request names no supplied destination"));
            }
            if (denseArray(request.eligibleLotIds, rp + ".eligibleLotIds", errors)) {
                var eligible = Object.create(null);
                for (var e = 0; e < request.eligibleLotIds.length; e++) {
                    var eligibleId = request.eligibleLotIds[e];
                    var ep = rp + ".eligibleLotIds[" + e + "]";
                    if (!safeInteger(eligibleId, ep, errors, 1)) continue;
                    if (eligible[eligibleId]) append(errors, issue("E_DUPLICATE_ELIGIBLE_LOT", ep, "eligible lot reference is duplicated"));
                    eligible[eligibleId] = true;
                    if (lotsOk && !lotIds[eligibleId]) append(errors, issue("E_UNKNOWN_ELIGIBLE_LOT", ep, "eligible lot reference names no supplied lot"));
                }
            }
            if (hasOwn(request, "provenance")) jsonValue(request.provenance, rp + ".provenance", errors, []);
        }
    }
    return { ok: errors.length === 0, errors: errors };
}

function cloneJson(value) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") return value === 0 ? 0 : value;
    if (Array.isArray(value)) {
        var array = [];
        for (var a = 0; a < value.length; a++) array[a] = cloneJson(value[a]);
        return array;
    }
    var copy = {};
    var keys = Object.keys(value);
    sortArray(keys, compareString);
    for (var k = 0; k < keys.length; k++) {
        Object.defineProperty(copy, keys[k], { value: cloneJson(value[keys[k]]), enumerable: true, configurable: true, writable: true });
    }
    return copy;
}

function compareNumber(a, b) {
    return a < b ? -1 : (a > b ? 1 : 0);
}

function compareString(a, b) {
    return a < b ? -1 : (a > b ? 1 : 0);
}

function compareRequests(a, b) {
    if (a.priority !== b.priority) return a.priority > b.priority ? -1 : 1;
    return compareNumber(a.tieBreakOrder, b.tieBreakOrder);
}

function copyLot(lot) {
    return {
        lotId: lot.lotId,
        sourceItemId: lot.sourceItemId,
        itemId: lot.itemId,
        quantity: lot.quantity,
        selectionOrder: lot.selectionOrder,
        provenance: cloneJson(lot.provenance)
    };
}

function copyRequest(request) {
    var eligibleLotIds = copyArray(request.eligibleLotIds);
    sortArray(eligibleLotIds, compareNumber);
    return {
        requestId: request.requestId,
        itemId: request.itemId,
        quantity: request.quantity,
        priority: request.priority,
        tieBreakOrder: request.tieBreakOrder,
        eligibleLotIds: eligibleLotIds,
        destinationId: request.destinationId,
        provenance: cloneJson(request.provenance)
    };
}

function copyDestination(destination) {
    return {
        destinationId: destination.destinationId,
        availableCapacity: destination.availableCapacity,
        provenance: cloneJson(destination.provenance)
    };
}

function canonicalInput(input) {
    var lots = [];
    var requests = [];
    var destinations = [];
    var i;
    for (i = 0; i < input.lots.length; i++) append(lots, copyLot(input.lots[i]));
    for (i = 0; i < input.requests.length; i++) append(requests, copyRequest(input.requests[i]));
    for (i = 0; i < input.destinations.length; i++) append(destinations, copyDestination(input.destinations[i]));
    sortArray(lots, function(a, b) { return compareNumber(a.selectionOrder, b.selectionOrder); });
    sortArray(requests, compareRequests);
    sortArray(destinations, function(a, b) { return compareNumber(a.destinationId, b.destinationId); });
    return {
        schemaVersion: VERSION,
        kind: INPUT_KIND,
        lots: lots,
        requests: requests,
        destinations: destinations
    };
}

function assertInput(input) {
    var checked = validateInput(input);
    if (!checked.ok) throw failFrom(checked.errors);
    return input;
}

function min3(a, b, c) {
    var first = a < b ? a : b;
    return first < c ? first : c;
}

function safeSumField(rows, field) {
    var sum = 0;
    for (var i = 0; i < rows.length; i++) {
        var value = rows[i][field];
        if (sum > MAX_SAFE - value) throw failFrom([issue("E_ARITHMETIC_UNSAFE", "$", "generated aggregate exceeds safe-integer range")]);
        sum += value;
    }
    return sum;
}

function refusalCode(stockRemaining, capacityRemaining) {
    if (stockRemaining === 0 && capacityRemaining === 0) return "STOCK_AND_DESTINATION_CAPACITY_EXHAUSTED";
    if (capacityRemaining === 0) return "DESTINATION_CAPACITY_EXHAUSTED";
    return "ELIGIBLE_EXACT_STOCK_EXHAUSTED";
}

function makeConservation(input, reservations, allocations, refusals, remainingLots, destinationRemainders) {
    var available = safeSumField(input.lots, "quantity");
    var reserved = safeSumField(reservations, "quantity");
    var remaining = safeSumField(remainingLots, "remainingQuantity");
    var requested = safeSumField(input.requests, "quantity");
    var allocated = safeSumField(allocations, "allocatedQuantity");
    var refused = safeSumField(refusals, "quantity");
    var capacityAvailable = safeSumField(input.destinations, "availableCapacity");
    var capacityReserved = safeSumField(destinationRemainders, "reservedCapacity");
    var capacityRemaining = safeSumField(destinationRemainders, "remainingCapacity");
    var itemMap = Object.create(null);
    var i;
    for (i = 0; i < input.lots.length; i++) {
        var lot = input.lots[i];
        if (!itemMap[lot.itemId]) itemMap[lot.itemId] = { itemId: lot.itemId, available: 0, reserved: 0, remaining: 0 };
        itemMap[lot.itemId].available += lot.quantity;
    }
    for (i = 0; i < remainingLots.length; i++) {
        var remainder = remainingLots[i];
        itemMap[remainder.itemId].reserved += remainder.reservedQuantity;
        itemMap[remainder.itemId].remaining += remainder.remainingQuantity;
    }
    var itemKeys = Object.keys(itemMap);
    sortArray(itemKeys, compareString);
    var byItem = [];
    for (i = 0; i < itemKeys.length; i++) byItem[i] = itemMap[itemKeys[i]];
    return {
        stock: { available: available, reserved: reserved, remaining: remaining },
        demand: { requested: requested, allocated: allocated, refused: refused },
        capacity: { available: capacityAvailable, reserved: capacityReserved, remaining: capacityRemaining },
        byItem: byItem,
        valid: available === reserved + remaining && requested === allocated + refused &&
            capacityAvailable === capacityReserved + capacityRemaining && reserved === allocated
    };
}

function plan(input) {
    assertInput(input);
    var canonical = canonicalInput(input);
    var lotStates = new Map();
    var destinationStates = new Map();
    var i;
    for (i = 0; i < canonical.lots.length; i++) {
        var sourceLot = canonical.lots[i];
        lotStates.set(sourceLot.lotId, { lot: sourceLot, remaining: sourceLot.quantity });
    }
    for (i = 0; i < canonical.destinations.length; i++) {
        var sourceDestination = canonical.destinations[i];
        destinationStates.set(sourceDestination.destinationId, { destination: sourceDestination, remaining: sourceDestination.availableCapacity });
    }

    var reservations = [];
    var allocations = [];
    var refusals = [];
    for (i = 0; i < canonical.requests.length; i++) {
        var request = canonical.requests[i];
        var destinationState = destinationStates.get(request.destinationId);
        var needed = request.quantity;
        var candidates = [];
        for (var e = 0; e < request.eligibleLotIds.length; e++) {
            var eligibleState = lotStates.get(request.eligibleLotIds[e]);
            if (eligibleState && eligibleState.lot.itemId === request.itemId) append(candidates, eligibleState);
        }
        sortArray(candidates, function(a, b) {
            return compareNumber(a.lot.selectionOrder, b.lot.selectionOrder);
        });
        for (var c = 0; c < candidates.length && needed > 0 && destinationState.remaining > 0; c++) {
            var state = candidates[c];
            if (state.remaining === 0) continue;
            var take = min3(needed, state.remaining, destinationState.remaining);
            if (take === 0) continue;
            append(reservations, {
                lotId: state.lot.lotId,
                sourceItemId: state.lot.sourceItemId,
                requestId: request.requestId,
                itemId: request.itemId,
                destinationId: request.destinationId,
                quantity: take,
                lotProvenance: cloneJson(state.lot.provenance),
                requestProvenance: cloneJson(request.provenance),
                destinationProvenance: cloneJson(destinationState.destination.provenance)
            });
            state.remaining -= take;
            destinationState.remaining -= take;
            needed -= take;
        }
        var allocatedQuantity = request.quantity - needed;
        var status = needed === 0 ? "FILLED" : (allocatedQuantity === 0 ? "REFUSED" : "PARTIAL");
        append(allocations, {
            requestId: request.requestId,
            itemId: request.itemId,
            destinationId: request.destinationId,
            requestedQuantity: request.quantity,
            allocatedQuantity: allocatedQuantity,
            unfilledQuantity: needed,
            status: status,
            provenance: cloneJson(request.provenance)
        });
        if (needed > 0) {
            var exactRemaining = safeSumField(candidates, "remaining");
            append(refusals, {
                requestId: request.requestId,
                itemId: request.itemId,
                destinationId: request.destinationId,
                quantity: needed,
                code: refusalCode(exactRemaining, destinationState.remaining),
                provenance: cloneJson(request.provenance)
            });
        }
    }

    var remainingLots = [];
    for (i = 0; i < canonical.lots.length; i++) {
        var lot = canonical.lots[i];
        var state = lotStates.get(lot.lotId);
        append(remainingLots, {
            lotId: lot.lotId,
            sourceItemId: lot.sourceItemId,
            itemId: lot.itemId,
            availableQuantity: lot.quantity,
            reservedQuantity: lot.quantity - state.remaining,
            remainingQuantity: state.remaining,
            provenance: cloneJson(lot.provenance)
        });
    }
    var destinationRemainders = [];
    for (i = 0; i < canonical.destinations.length; i++) {
        var destination = canonical.destinations[i];
        var state = destinationStates.get(destination.destinationId);
        append(destinationRemainders, {
            destinationId: destination.destinationId,
            availableCapacity: destination.availableCapacity,
            reservedCapacity: destination.availableCapacity - state.remaining,
            remainingCapacity: state.remaining,
            provenance: cloneJson(destination.provenance)
        });
    }
    var result = {
        schemaVersion: VERSION,
        kind: PLAN_KIND,
        input: canonical,
        reservations: reservations,
        allocations: allocations,
        refusals: refusals,
        remainingLots: remainingLots,
        destinationRemainders: destinationRemainders,
        conservation: null
    };
    result.conservation = makeConservation(canonical, reservations, allocations, refusals, remainingLots, destinationRemainders);
    if (!result.conservation.valid) throw failFrom([issue("E_CONSERVATION", "$.conservation", "generated plan failed conservation")]);
    return result;
}

function firstDifference(actual, expected, path) {
    if (actual === expected) return null;
    if (typeof actual !== typeof expected || actual === null || expected === null) return path;
    if (Array.isArray(actual) || Array.isArray(expected)) {
        if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) return path;
        for (var a = 0; a < actual.length; a++) {
            var arrayDiff = firstDifference(actual[a], expected[a], path + "[" + a + "]");
            if (arrayDiff) return arrayDiff;
        }
        return null;
    }
    if (typeof actual === "object") {
        var actualKeys = Object.keys(actual);
        var expectedKeys = Object.keys(expected);
        sortArray(actualKeys, compareString);
        sortArray(expectedKeys, compareString);
        if (actualKeys.length !== expectedKeys.length) return path;
        for (var k = 0; k < expectedKeys.length; k++) {
            if (actualKeys[k] !== expectedKeys[k]) return path;
            var objectDiff = firstDifference(actual[actualKeys[k]], expected[expectedKeys[k]], path + "." + expectedKeys[k]);
            if (objectDiff) return objectDiff;
        }
        return null;
    }
    return path;
}

function validatePersistedJson(value, path, errors, ancestors) {
    persistedTree(value, path, errors, ancestors, {
        code: "E_PLAN_JSON",
        checkValues: true,
        skipProvenance: false,
        numberMessage: "persisted plan numbers must be safe integers",
        valueMessage: "persisted plan contains a non-JSON value",
        cycleMessage: "persisted plan must not be cyclic",
        recordMessage: "persisted objects must be ordinary records",
        symbolMessage: "persisted records and arrays must not have symbol keys",
        arrayPrototypeMessage: "persisted arrays must have the ordinary Array prototype",
        arrayFieldMessage: "persisted arrays must not have named or non-index fields",
        sparseMessage: "persisted arrays must not be sparse",
        fieldMessage: "persisted fields must be enumerable data fields"
    });
}

function validatePlan(value) {
    var errors = [];
    if (!isRecord(value)) return { ok: false, errors: [issue("E_PLAN_TYPE", "$", "plan must be an object")] };
    validatePersistedJson(value, "$", errors, []);
    if (errors.length) return { ok: false, errors: errors };
    if (!hasOwn(value, "schemaVersion")) append(errors, issue("E_REQUIRED_FIELD", "$.schemaVersion", "required field is missing"));
    else if (value.schemaVersion !== VERSION) append(errors, issue("E_SCHEMA_VERSION", "$.schemaVersion", "supported schemaVersion is 1"));
    if (!hasOwn(value, "kind")) append(errors, issue("E_REQUIRED_FIELD", "$.kind", "required field is missing"));
    else if (value.kind !== PLAN_KIND) append(errors, issue("E_PLAN_KIND", "$.kind", "kind must be " + PLAN_KIND));
    if (!hasOwn(value, "input")) append(errors, issue("E_REQUIRED_FIELD", "$.input", "required field is missing"));
    if (errors.length) return { ok: false, errors: errors };
    var inputChecked = validateInput(value.input);
    if (!inputChecked.ok) {
        for (var i = 0; i < inputChecked.errors.length; i++) {
            var inputError = inputChecked.errors[i];
            append(errors, issue(inputError.code, "$.input" + inputError.path.slice(1), inputError.message));
        }
        return { ok: false, errors: errors };
    }
    var expected = plan(value.input);
    var difference = firstDifference(value, expected, "$");
    if (difference) append(errors, issue("E_PLAN_MISMATCH", difference, "persisted plan does not equal the deterministic allocation and conservation proof"));
    return { ok: errors.length === 0, errors: errors };
}

function assertPlan(value) {
    var checked = validatePlan(value);
    if (!checked.ok) throw failFrom(checked.errors);
    return value;
}

function serialize(value) {
    assertPlan(value);
    return JSON.stringify(cloneJson(value));
}

function deserialize(text) {
    if (typeof text !== "string") throw failFrom([issue("E_PLAN_JSON", "$", "serialized plan must be a JSON string")]);
    var value;
    try {
        value = JSON.parse(text);
    } catch (error) {
        throw failFrom([issue("E_PLAN_JSON", "$", "serialized plan did not parse")]);
    }
    assertPlan(value);
    return cloneJson(value);
}

function audit(value) {
    var checked = validatePlan(value);
    var copiedErrors = [];
    for (var i = 0; i < checked.errors.length; i++) {
        var error = checked.errors[i];
        copiedErrors[i] = { code: error.code, path: error.path, message: error.message };
    }
    return {
        ok: checked.ok,
        errors: copiedErrors,
        conservation: checked.ok ? cloneJson(value.conservation) : null
    };
}

module.exports = Object.freeze({
    VERSION: VERSION,
    INPUT_KIND: INPUT_KIND,
    PLAN_KIND: PLAN_KIND,
    REFUSAL_CODES: REFUSAL_CODES,
    validateInput: validateInput,
    validatePlan: validatePlan,
    plan: plan,
    audit: audit,
    serialize: serialize,
    deserialize: deserialize
});
