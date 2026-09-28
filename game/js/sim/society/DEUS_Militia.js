"use strict";

// SOC.40.02 threat-driven mobilization planner.
// Pure data only: no host globals, clock, randomness, filesystem, UI or engine state.

var Identity = require("./identity");

var REQUEST_SCHEMA = 1;
var PLAN_SCHEMA = 1;
var SERVICE_STATUSES = Object.freeze([
    "NONE", "RESERVE", "MILITIA", "GUARD", "PROFESSIONAL", "ELITE_RETINUE"
]);
var POST_KINDS = Object.freeze(["WALL", "GATE"]);
var DUTY_CATEGORIES = Object.freeze(["CIVILIAN_ECONOMIC", "NON_ECONOMIC"]);
var MAX_TEXT = 256;
var MAX_REQUEST_DATA_DEPTH = 128;
// Orders add a small audit envelope around caller provenance. Keep explicit
// headroom so every request accepted at its boundary produces a serializable,
// self-validating plan.
var MAX_PLAN_DATA_DEPTH = MAX_REQUEST_DATA_DEPTH + 8;

function has(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}

function fail(code, path, message, details) {
    var error = new Error(code + " at " + path + ": " + message);
    error.name = "MilitiaError";
    error.code = code;
    error.path = path;
    error.errors = [{ code: code, path: path, message: message }];
    if (details !== undefined) error.details = details;
    throw error;
}

function isPlainObject(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    var prototype = Object.getPrototypeOf(value);
    if (prototype === null) return true;
    var descriptor = Object.getOwnPropertyDescriptor(prototype, "constructor");
    if (!descriptor || !has(descriptor, "value") || typeof descriptor.value !== "function") return false;
    var constructorPrototype = Object.getOwnPropertyDescriptor(descriptor.value, "prototype");
    return !!constructorPrototype && has(constructorPrototype, "value") && constructorPrototype.value === prototype &&
        Function.prototype.toString.call(descriptor.value) === Function.prototype.toString.call(Object);
}

function copyPlainData(value, path, seen, maxDepth) {
    if (maxDepth === undefined) maxDepth = MAX_PLAN_DATA_DEPTH;
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") {
        if (!Number.isFinite(value)) fail("E_DATA", path, "number must be finite");
        return Object.is(value, -0) ? 0 : value;
    }
    if (typeof value !== "object") fail("E_DATA", path, "value must be plain JSON data");
    if (Object.getOwnPropertySymbols(value).length) fail("E_DATA", path, "symbol keys are not allowed");
    if (seen.length >= maxDepth) fail("E_DATA", path, "plain data exceeds the supported nesting depth of " + maxDepth);
    if (seen.indexOf(value) >= 0) fail("E_DATA", path, "cyclic data is not allowed");
    seen.push(value);

    if (Array.isArray(value)) {
        var arrayNames = Object.getOwnPropertyNames(value);
        for (var a = 0; a < arrayNames.length; a++) {
            var arrayName = arrayNames[a];
            if (arrayName === "length") continue;
            if (!/^(0|[1-9][0-9]*)$/.test(arrayName) || Number(arrayName) >= value.length) {
                fail("E_DATA", path, "arrays may not have extra properties");
            }
            var arrayDescriptor = Object.getOwnPropertyDescriptor(value, arrayName);
            if (!arrayDescriptor || !has(arrayDescriptor, "value") || !arrayDescriptor.enumerable) {
                fail("E_DATA", path + "[" + arrayName + "]", "array entries must be enumerable data properties");
            }
        }
        var arrayCopy = [];
        for (var i = 0; i < value.length; i++) {
            if (!has(value, String(i))) fail("E_DATA", path + "[" + i + "]", "sparse arrays are not allowed");
            arrayCopy.push(copyPlainData(Object.getOwnPropertyDescriptor(value, String(i)).value, path + "[" + i + "]", seen, maxDepth));
        }
        seen.pop();
        return arrayCopy;
    }

    if (!isPlainObject(value)) fail("E_DATA", path, "objects must be plain records");
    var names = Object.getOwnPropertyNames(value).sort();
    var copy = {};
    for (var n = 0; n < names.length; n++) {
        var name = names[n];
        var descriptor = Object.getOwnPropertyDescriptor(value, name);
        if (!descriptor || !has(descriptor, "value") || !descriptor.enumerable) {
            fail("E_DATA", path + "." + name, "record fields must be enumerable data properties");
        }
        Object.defineProperty(copy, name, {
            value: copyPlainData(descriptor.value, path + "." + name, seen, maxDepth),
            enumerable: true,
            writable: true,
            configurable: true
        });
    }
    seen.pop();
    return copy;
}

function cloneData(value) {
    return copyPlainData(value, "$", [], MAX_PLAN_DATA_DEPTH);
}

function canonicalStringify(value) {
    function encode(item) {
        if (item === null) return "null";
        if (typeof item === "string") return JSON.stringify(item);
        if (typeof item === "boolean") return item ? "true" : "false";
        if (typeof item === "number") {
            if (!Number.isFinite(item)) fail("E_DATA", "$", "canonical data contains a non-finite number");
            return JSON.stringify(Object.is(item, -0) ? 0 : item);
        }
        if (Array.isArray(item)) return "[" + item.map(encode).join(",") + "]";
        if (isPlainObject(item)) {
            return "{" + Object.keys(item).sort().map(function(key) {
                return JSON.stringify(key) + ":" + encode(item[key]);
            }).join(",") + "}";
        }
        fail("E_DATA", "$", "canonical data must be plain JSON data");
    }
    return encode(copyPlainData(value, "$", [], MAX_PLAN_DATA_DEPTH));
}

function sameData(left, right) {
    return canonicalStringify(left) === canonicalStringify(right);
}

function requireObject(value, path) {
    if (!isPlainObject(value)) fail("E_INPUT", path, "must be an object");
}

function exactKeys(value, path, required, optional) {
    requireObject(value, path);
    var allowed = Object.create(null);
    var i;
    for (i = 0; i < required.length; i++) allowed[required[i]] = true;
    for (i = 0; i < optional.length; i++) allowed[optional[i]] = true;
    var keys = Object.keys(value);
    for (i = 0; i < keys.length; i++) {
        if (!has(allowed, keys[i])) fail("E_INPUT", path + "." + keys[i], "unknown field");
    }
    for (i = 0; i < required.length; i++) {
        if (!has(value, required[i])) fail("E_AUTHORITY_GAP", path + "." + required[i], "required caller-supplied value is absent");
    }
}

function requireArray(value, path) {
    if (!Array.isArray(value)) fail("E_INPUT", path, "must be an array");
}

function requireBoolean(value, path) {
    if (typeof value !== "boolean") fail("E_INPUT", path, "must be a boolean");
}

function requirePositiveId(value, path) {
    if (!isPositiveId(value)) {
        fail("E_INPUT", path, "must be a positive safe integer stable ID");
    }
}

function isPositiveId(value) {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}

function requireCount(value, path) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
        fail("E_INPUT", path, "must be a non-negative safe integer");
    }
}

function safeAdd(left, right, code, path) {
    var sum = left + right;
    if (!Number.isSafeInteger(sum)) fail(code, path, "aggregate count exceeds the safe-integer range");
    return sum;
}

function requireText(value, path) {
    if (typeof value !== "string" || value.length < 1 || value.length > MAX_TEXT) {
        fail("E_INPUT", path, "must be a string of 1.." + MAX_TEXT + " characters");
    }
}

function requireOneOf(value, choices, path) {
    if (choices.indexOf(value) < 0) fail("E_INPUT", path, "unknown value " + JSON.stringify(value));
}

function assertIdentity(identity, path) {
    exactKeys(identity, path, ["schema", "craft", "civicOffice", "class"], []);
    if (identity.schema !== Identity.VERSION) fail("E_IDENTITY", path + ".schema", "must be " + Identity.VERSION);
    if ([Identity.NONE].concat(Identity.CRAFTS).indexOf(identity.craft) < 0) {
        fail("E_IDENTITY", path + ".craft", "must be NONE or a canonical craft");
    }
    if ([Identity.NONE].concat(Identity.OFFICES).indexOf(identity.civicOffice) < 0) {
        fail("E_IDENTITY", path + ".civicOffice", "must be NONE or a canonical office");
    }
    exactKeys(identity.class, path + ".class", ["id", "level"], []);
    if (identity.class.id === Identity.NONE) {
        if (identity.class.level !== null) fail("E_IDENTITY", path + ".class.level", "NONE class must have null level");
    } else {
        if (Identity.CLASS_IDS.indexOf(identity.class.id) < 0) fail("E_IDENTITY", path + ".class.id", "must be a canonical 2014 SRD class ID");
        if (!Number.isSafeInteger(identity.class.level) || identity.class.level < 1 || identity.class.level > 20) {
            fail("E_IDENTITY", path + ".class.level", "must be an integer 1..20");
        }
    }
    var checked = Identity.validate(identity);
    if (!checked.ok) fail("E_IDENTITY", path, checked.errors.join("; "));
}

function assertCurrentDuty(duty, path) {
    if (duty === null) return;
    requireObject(duty, path);
    var required = ["id", "kind", "category", "provenance"];
    for (var i = 0; i < required.length; i++) {
        if (!has(duty, required[i])) fail("E_AUTHORITY_GAP", path + "." + required[i], "required duty provenance is absent");
    }
    requirePositiveId(duty.id, path + ".id");
    requireText(duty.kind, path + ".kind");
    requireOneOf(duty.category, DUTY_CATEGORIES, path + ".category");
    requireObject(duty.provenance, path + ".provenance");
}

function uniqueIds(records, field, path, code) {
    var seen = {};
    for (var i = 0; i < records.length; i++) {
        var id = records[i][field];
        var key = String(id);
        if (has(seen, key)) fail(code || "E_DUPLICATE", path + "[" + i + "]." + field, "duplicate stable ID " + id);
        seen[key] = true;
    }
    return seen;
}

function comparePriority(left, right) {
    if (left.priority !== right.priority) return left.priority - right.priority;
    return left.tieBreak - right.tieBreak;
}

function assertTotalOrder(rows, path) {
    var pairs = {};
    for (var i = 0; i < rows.length; i++) {
        requireCount(rows[i].priority, path + "[" + i + "].priority");
        requireCount(rows[i].tieBreak, path + "[" + i + "].tieBreak");
        var pair = rows[i].priority + ":" + rows[i].tieBreak;
        if (has(pairs, pair)) {
            fail("E_NONDETERMINISTIC_TIE", path + "[" + i + "]", "priority/tieBreak pair " + pair + " is not unique");
        }
        pairs[pair] = true;
    }
}

function exactCoverage(rows, idField, expectedIds, path) {
    var rowIds = {};
    for (var i = 0; i < rows.length; i++) {
        var key = String(rows[i][idField]);
        if (has(rowIds, key)) fail("E_DUPLICATE", path + "[" + i + "]." + idField, "duplicate stable ID " + rows[i][idField]);
        if (!has(expectedIds, key)) fail("E_REFERENCE", path + "[" + i + "]." + idField, "references an unknown ID " + rows[i][idField]);
        rowIds[key] = true;
    }
    var expected = Object.keys(expectedIds);
    if (Object.keys(rowIds).length !== expected.length) {
        fail("E_AUTHORITY_GAP", path, "must provide exactly one row for every caller-supplied record");
    }
    for (var e = 0; e < expected.length; e++) {
        if (!has(rowIds, expected[e])) fail("E_AUTHORITY_GAP", path, "is missing stable ID " + expected[e]);
    }
}

function normalizeRequest(request) {
    var raw = copyPlainData(request, "$", [], MAX_REQUEST_DATA_DEPTH);
    exactKeys(raw, "$", ["schema", "threat", "people", "posts", "policy"], []);
    if (raw.schema !== REQUEST_SCHEMA) fail("E_INPUT", "$.schema", "must be " + REQUEST_SCHEMA);

    exactKeys(raw.threat, "$.threat", ["id", "factionId", "key", "source"], []);
    requirePositiveId(raw.threat.id, "$.threat.id");
    requirePositiveId(raw.threat.factionId, "$.threat.factionId");
    requireText(raw.threat.key, "$.threat.key");
    requireObject(raw.threat.source, "$.threat.source");

    requireArray(raw.posts, "$.posts");
    var p;
    for (p = 0; p < raw.posts.length; p++) {
        var post = raw.posts[p];
        var postPath = "$.posts[" + p + "]";
        exactKeys(post, postPath, ["id", "factionId", "kind", "capacity", "source"], []);
        requirePositiveId(post.id, postPath + ".id");
        requirePositiveId(post.factionId, postPath + ".factionId");
        if (post.factionId !== raw.threat.factionId) fail("E_REFERENCE", postPath + ".factionId", "must match the threatened faction");
        requireOneOf(post.kind, POST_KINDS, postPath + ".kind");
        requireCount(post.capacity, postPath + ".capacity");
        requireObject(post.source, postPath + ".source");
    }
    var postIds = uniqueIds(raw.posts, "id", "$.posts");
    var aggregateCapacity = 0;
    for (p = 0; p < raw.posts.length; p++) {
        aggregateCapacity = safeAdd(aggregateCapacity, raw.posts[p].capacity, "E_INPUT", "$.posts");
    }

    requireArray(raw.people, "$.people");
    for (p = 0; p < raw.people.length; p++) {
        var person = raw.people[p];
        var personPath = "$.people[" + p + "]";
        exactKeys(person, personPath, ["id", "factionId", "alive", "eligibility", "serviceStatus", "eligiblePostIds", "identity", "currentDuty"], []);
        requirePositiveId(person.id, personPath + ".id");
        requirePositiveId(person.factionId, personPath + ".factionId");
        if (person.factionId !== raw.threat.factionId) fail("E_REFERENCE", personPath + ".factionId", "must match the threatened faction");
        requireBoolean(person.alive, personPath + ".alive");
        exactKeys(person.eligibility, personPath + ".eligibility", ["eligible", "reason", "source"], []);
        requireBoolean(person.eligibility.eligible, personPath + ".eligibility.eligible");
        requireText(person.eligibility.reason, personPath + ".eligibility.reason");
        requireObject(person.eligibility.source, personPath + ".eligibility.source");
        requireOneOf(person.serviceStatus, SERVICE_STATUSES, personPath + ".serviceStatus");
        requireArray(person.eligiblePostIds, personPath + ".eligiblePostIds");
        var eligibleSeen = {};
        for (var e = 0; e < person.eligiblePostIds.length; e++) {
            var eligiblePostId = person.eligiblePostIds[e];
            requirePositiveId(eligiblePostId, personPath + ".eligiblePostIds[" + e + "]");
            if (!has(postIds, String(eligiblePostId))) fail("E_REFERENCE", personPath + ".eligiblePostIds[" + e + "]", "references unknown post " + eligiblePostId);
            if (has(eligibleSeen, String(eligiblePostId))) fail("E_DUPLICATE", personPath + ".eligiblePostIds[" + e + "]", "duplicates post " + eligiblePostId);
            eligibleSeen[String(eligiblePostId)] = true;
        }
        person.eligiblePostIds.sort(function(a, b) { return a - b; });
        assertIdentity(person.identity, personPath + ".identity");
        assertCurrentDuty(person.currentDuty, personPath + ".currentDuty");
    }
    var personIds = uniqueIds(raw.people, "id", "$.people");

    exactKeys(raw.policy, "$.policy", ["schema", "id", "version", "threatKey", "authority", "allowedStatuses", "candidatePriorities", "postRequirements"], []);
    if (raw.policy.schema !== 1) fail("E_POLICY", "$.policy.schema", "must be 1");
    requireText(raw.policy.id, "$.policy.id");
    if (!Number.isSafeInteger(raw.policy.version) || raw.policy.version < 1) fail("E_POLICY", "$.policy.version", "must be a positive safe integer");
    requireText(raw.policy.threatKey, "$.policy.threatKey");
    if (raw.policy.threatKey !== raw.threat.key) {
        fail("E_AUTHORITY_GAP", "$.policy.threatKey", "policy does not authorize the supplied threat key", { threatKey: raw.threat.key });
    }
    requireObject(raw.policy.authority, "$.policy.authority");

    requireArray(raw.policy.allowedStatuses, "$.policy.allowedStatuses");
    var statusSeen = {};
    for (p = 0; p < raw.policy.allowedStatuses.length; p++) {
        var status = raw.policy.allowedStatuses[p];
        requireOneOf(status, SERVICE_STATUSES, "$.policy.allowedStatuses[" + p + "]");
        if (status === "NONE") fail("E_POLICY", "$.policy.allowedStatuses[" + p + "]", "NONE is explicitly non-combatant and cannot be authorized");
        if (has(statusSeen, status)) fail("E_DUPLICATE", "$.policy.allowedStatuses[" + p + "]", "duplicates status " + status);
        statusSeen[status] = true;
    }
    raw.policy.allowedStatuses.sort();

    requireArray(raw.policy.candidatePriorities, "$.policy.candidatePriorities");
    for (p = 0; p < raw.policy.candidatePriorities.length; p++) {
        var candidate = raw.policy.candidatePriorities[p];
        var candidatePath = "$.policy.candidatePriorities[" + p + "]";
        exactKeys(candidate, candidatePath, ["personId", "priority", "tieBreak"], []);
        requirePositiveId(candidate.personId, candidatePath + ".personId");
    }
    exactCoverage(raw.policy.candidatePriorities, "personId", personIds, "$.policy.candidatePriorities");
    assertTotalOrder(raw.policy.candidatePriorities, "$.policy.candidatePriorities");
    raw.policy.candidatePriorities.sort(comparePriority);

    requireArray(raw.policy.postRequirements, "$.policy.postRequirements");
    for (p = 0; p < raw.policy.postRequirements.length; p++) {
        var requirement = raw.policy.postRequirements[p];
        var requirementPath = "$.policy.postRequirements[" + p + "]";
        exactKeys(requirement, requirementPath, ["postId", "requested", "priority", "tieBreak"], []);
        requirePositiveId(requirement.postId, requirementPath + ".postId");
        requireCount(requirement.requested, requirementPath + ".requested");
    }
    exactCoverage(raw.policy.postRequirements, "postId", postIds, "$.policy.postRequirements");
    assertTotalOrder(raw.policy.postRequirements, "$.policy.postRequirements");
    raw.policy.postRequirements.sort(comparePriority);
    var aggregateRequested = 0;
    for (p = 0; p < raw.policy.postRequirements.length; p++) {
        aggregateRequested = safeAdd(aggregateRequested, raw.policy.postRequirements[p].requested, "E_POLICY", "$.policy.postRequirements");
    }

    raw.people.sort(function(left, right) { return left.id - right.id; });
    raw.posts.sort(function(left, right) { return left.id - right.id; });
    return raw;
}

function indexById(rows) {
    var map = {};
    for (var i = 0; i < rows.length; i++) map[String(rows[i].id)] = rows[i];
    return map;
}

function priorityById(rows, field) {
    var map = {};
    for (var i = 0; i < rows.length; i++) map[String(rows[i][field])] = rows[i];
    return map;
}

function isStatusAuthorized(person, policy) {
    return person.serviceStatus !== "NONE" && policy.allowedStatuses.indexOf(person.serviceStatus) >= 0;
}

function isPersonAvailable(person, policy, postId, assigned) {
    return person.alive && person.eligibility.eligible && isStatusAuthorized(person, policy) &&
        person.eligiblePostIds.indexOf(postId) >= 0 && !has(assigned, String(person.id));
}

function dutySnapshot(person) {
    return person.currentDuty === null ? null : cloneData(person.currentDuty);
}

function buildPlan(normalized) {
    var people = indexById(normalized.people);
    var posts = indexById(normalized.posts);
    var candidateRows = normalized.policy.candidatePriorities;
    var assigned = {};
    var assignments = [];
    var orders = [];
    var displaced = [];
    var postCounts = {};

    for (var r = 0; r < normalized.policy.postRequirements.length; r++) {
        var requirement = normalized.policy.postRequirements[r];
        var post = posts[String(requirement.postId)];
        var need = requirement.requested;
        var limit = Math.min(need, post.capacity);
        var assignedHere = 0;
        for (var c = 0; c < candidateRows.length; c++) {
            if (assignedHere >= limit) break;
            var priority = candidateRows[c];
            var person = people[String(priority.personId)];
            if (!isPersonAvailable(person, normalized.policy, post.id, assigned)) continue;
            var orderId = "MOB-" + normalized.threat.id + "-" + post.id + "-" + person.id;
            var assignment = {
                orderId: orderId,
                personId: person.id,
                postId: post.id,
                postKind: post.kind
            };
            var order = {
                orderId: orderId,
                type: "DEFEND_POST",
                threatId: normalized.threat.id,
                policyId: normalized.policy.id,
                personId: person.id,
                postId: post.id,
                postKind: post.kind,
                duty: { type: post.kind === "GATE" ? "DEFEND_GATE" : "DEFEND_WALL", postId: post.id },
                previousDuty: dutySnapshot(person),
                audit: {
                    serviceStatus: person.serviceStatus,
                    eligibility: cloneData(person.eligibility),
                    eligiblePostIds: person.eligiblePostIds.slice(),
                    candidatePriority: { priority: priority.priority, tieBreak: priority.tieBreak },
                    postRequirement: {
                        requested: requirement.requested,
                        priority: requirement.priority,
                        tieBreak: requirement.tieBreak
                    },
                    postCapacity: post.capacity,
                    postSource: cloneData(post.source)
                }
            };
            assigned[String(person.id)] = assignment;
            assignments.push(assignment);
            orders.push(order);
            assignedHere++;
            if (person.currentDuty !== null && person.currentDuty.category === "CIVILIAN_ECONOMIC") {
                displaced.push({
                    personId: person.id,
                    orderId: orderId,
                    postId: post.id,
                    previousDuty: dutySnapshot(person)
                });
            }
        }
        postCounts[String(post.id)] = assignedHere;
    }

    var unfilledPosts = [];
    var totalRequested = 0;
    var totalCapacity = 0;
    var totalUnfilled = 0;
    for (r = 0; r < normalized.policy.postRequirements.length; r++) {
        requirement = normalized.policy.postRequirements[r];
        post = posts[String(requirement.postId)];
        var filled = postCounts[String(post.id)] || 0;
        var unfilled = requirement.requested - filled;
        totalRequested = safeAdd(totalRequested, requirement.requested, "E_PLAN", "$.summary.requested");
        totalCapacity = safeAdd(totalCapacity, post.capacity, "E_PLAN", "$.summary.availableCapacity");
        totalUnfilled = safeAdd(totalUnfilled, unfilled, "E_PLAN", "$.summary.unfilled");
        if (unfilled > 0) {
            var reasons = [];
            var capacityShortfall = Math.max(0, requirement.requested - post.capacity);
            var peopleShortfall = unfilled - capacityShortfall;
            if (capacityShortfall > 0) reasons.push({ code: "POST_CAPACITY", count: capacityShortfall });
            if (peopleShortfall > 0) reasons.push({ code: "NO_AVAILABLE_PERSON", count: peopleShortfall });
            unfilledPosts.push({
                postId: post.id,
                postKind: post.kind,
                requested: requirement.requested,
                capacity: post.capacity,
                assigned: filled,
                unfilled: unfilled,
                postSource: cloneData(post.source),
                reasons: reasons
            });
        }
    }

    var refusals = [];
    for (c = 0; c < candidateRows.length; c++) {
        priority = candidateRows[c];
        person = people[String(priority.personId)];
        if (has(assigned, String(person.id))) continue;
        var reason;
        if (!person.alive) reason = "DEAD";
        else if (!person.eligibility.eligible) reason = "INELIGIBLE";
        else if (person.serviceStatus === "NONE") reason = "NONCOMBATANT_STATUS";
        else if (!isStatusAuthorized(person, normalized.policy)) reason = "STATUS_NOT_AUTHORIZED";
        else {
            var compatible = false;
            var capacityBlocked = false;
            for (r = 0; r < normalized.policy.postRequirements.length; r++) {
                requirement = normalized.policy.postRequirements[r];
                post = posts[String(requirement.postId)];
                if (requirement.requested > 0 && person.eligiblePostIds.indexOf(post.id) >= 0) {
                    compatible = true;
                    if ((postCounts[String(post.id)] || 0) >= post.capacity && requirement.requested > post.capacity) capacityBlocked = true;
                }
            }
            if (!compatible) reason = "NO_REQUESTED_POST";
            else if (capacityBlocked) reason = "POST_CAPACITY_EXHAUSTED";
            else reason = "DEMAND_SATISFIED";
        }
        refusals.push({
            personId: person.id,
            reason: reason,
            serviceStatus: person.serviceStatus,
            alive: person.alive,
            eligibility: cloneData(person.eligibility),
            eligiblePostIds: person.eligiblePostIds.slice(),
            candidatePriority: { priority: priority.priority, tieBreak: priority.tieBreak }
        });
    }

    return {
        schema: PLAN_SCHEMA,
        status: "PLANNED",
        threat: cloneData(normalized.threat),
        policy: cloneData(normalized.policy),
        orders: orders,
        assignments: assignments,
        refusals: refusals,
        unfilledPosts: unfilledPosts,
        displacedCivilianDuties: displaced,
        summary: {
            requested: totalRequested,
            availableCapacity: totalCapacity,
            assigned: assignments.length,
            refused: refusals.length,
            unfilled: totalUnfilled,
            displacedCivilianDuties: displaced.length
        }
    };
}

function planInvariantErrors(normalized, plan) {
    var errors = [];
    function problem(path, message) { errors.push({ code: "E_PLAN", path: path, message: message }); }
    var posts = indexById(normalized.posts);
    var people = indexById(normalized.people);
    var requirements = priorityById(normalized.policy.postRequirements, "postId");
    if (!isPlainObject(plan)) return [{ code: "E_PLAN", path: "$", message: "plan must be an object" }];
    if (!Array.isArray(plan.assignments) || !Array.isArray(plan.orders) || !Array.isArray(plan.displacedCivilianDuties)) {
        return [{ code: "E_PLAN", path: "$", message: "plan assignment, order and displacement collections must be arrays" }];
    }
    var assignedPeople = Object.create(null);
    var assignedOrders = Object.create(null);
    var postCounts = Object.create(null);
    for (var i = 0; i < plan.assignments.length; i++) {
        var assignment = plan.assignments[i];
        if (!isPlainObject(assignment)) { problem("$.assignments[" + i + "]", "must be an object"); continue; }
        var personKey = null;
        var postKey = null;
        if (!isPositiveId(assignment.personId)) problem("$.assignments[" + i + "].personId", "must be a positive safe integer stable ID");
        else {
            personKey = String(assignment.personId);
            if (!has(people, personKey)) problem("$.assignments[" + i + "].personId", "references unknown person");
            if (has(assignedPeople, personKey)) problem("$.assignments[" + i + "].personId", "person is assigned more than once");
            assignedPeople[personKey] = true;
        }
        if (!isPositiveId(assignment.postId)) problem("$.assignments[" + i + "].postId", "must be a positive safe integer stable ID");
        else {
            postKey = String(assignment.postId);
            if (!has(posts, postKey)) problem("$.assignments[" + i + "].postId", "references unknown post");
            postCounts[postKey] = (postCounts[postKey] || 0) + 1;
            if (has(posts, postKey) && postCounts[postKey] > posts[postKey].capacity) problem("$.assignments[" + i + "]", "post capacity is exceeded");
            if (has(requirements, postKey) && postCounts[postKey] > requirements[postKey].requested) problem("$.assignments[" + i + "]", "policy demand is exceeded");
        }
        if (typeof assignment.orderId !== "string" || !assignment.orderId.length) {
            problem("$.assignments[" + i + "].orderId", "must be a non-empty string");
        } else {
            if (has(assignedOrders, assignment.orderId)) problem("$.assignments[" + i + "].orderId", "order ID is duplicated");
            assignedOrders[assignment.orderId] = true;
        }
        if (personKey !== null && postKey !== null && has(people, personKey) && has(posts, postKey)) {
            var person = people[personKey];
            if (!isPersonAvailable(person, normalized.policy, posts[postKey].id, {})) problem("$.assignments[" + i + "]", "assigned person is dead, ineligible, unauthorized or incompatible");
        }
    }
    if (plan.orders.length !== plan.assignments.length) problem("$.orders", "must have exactly one order per assignment");
    for (i = 0; i < plan.displacedCivilianDuties.length; i++) {
        var displacement = plan.displacedCivilianDuties[i];
        if (!isPlainObject(displacement)) { problem("$.displacedCivilianDuties[" + i + "]", "must be an object"); continue; }
        if (!isPositiveId(displacement.personId)) { problem("$.displacedCivilianDuties[" + i + "].personId", "must be a positive safe integer stable ID"); continue; }
        var displacementKey = String(displacement.personId);
        if (!has(assignedPeople, displacementKey)) problem("$.displacedCivilianDuties[" + i + "]", "must reference an assigned person");
        if (!has(people, displacementKey) || people[displacementKey].currentDuty === null || people[displacementKey].currentDuty.category !== "CIVILIAN_ECONOMIC") {
            problem("$.displacedCivilianDuties[" + i + "]", "must reference a supplied civilian economic duty");
        } else if (!sameData(displacement.previousDuty, people[displacementKey].currentDuty)) {
            problem("$.displacedCivilianDuties[" + i + "].previousDuty", "does not preserve the supplied duty provenance");
        }
    }
    for (var personId in assignedPeople) {
        if (has(assignedPeople, personId)) {
            if (!has(people, personId)) continue;
            var currentDuty = people[personId].currentDuty;
            if (currentDuty !== null && currentDuty.category === "CIVILIAN_ECONOMIC") {
                var matches = 0;
                for (i = 0; i < plan.displacedCivilianDuties.length; i++) {
                    if (isPlainObject(plan.displacedCivilianDuties[i]) && plan.displacedCivilianDuties[i].personId === people[personId].id) matches++;
                }
                if (matches !== 1) problem("$.displacedCivilianDuties", "assigned civilian duty must have exactly one displacement record");
            }
        }
    }
    return errors;
}

function validateRequest(request) {
    try {
        normalizeRequest(request);
        return { ok: true, errors: [] };
    } catch (error) {
        if (error && Array.isArray(error.errors)) return { ok: false, errors: cloneData(error.errors) };
        throw error;
    }
}

function planMobilization(request) {
    var normalized = normalizeRequest(request);
    var plan = buildPlan(normalized);
    var errors = planInvariantErrors(normalized, plan);
    if (errors.length) fail("E_PLAN", "$", "planner produced an invalid plan", errors);
    return plan;
}

function validatePlan(request, plan) {
    try {
        var normalized = normalizeRequest(request);
        var copiedPlan = copyPlainData(plan, "$", [], MAX_PLAN_DATA_DEPTH);
        var errors = planInvariantErrors(normalized, copiedPlan);
        var expected = buildPlan(normalized);
        if (!sameData(copiedPlan, expected)) errors.push({ code: "E_PLAN", path: "$", message: "plan is not the canonical result for the supplied request" });
        return { ok: errors.length === 0, errors: errors };
    } catch (error) {
        if (error && Array.isArray(error.errors)) return { ok: false, errors: cloneData(error.errors) };
        throw error;
    }
}

function assertPlan(request, plan) {
    var checked = validatePlan(request, plan);
    if (!checked.ok) fail("E_PLAN", "$", checked.errors[0].message, checked.errors);
    return cloneData(plan);
}

module.exports = {
    REQUEST_SCHEMA: REQUEST_SCHEMA,
    PLAN_SCHEMA: PLAN_SCHEMA,
    SERVICE_STATUSES: SERVICE_STATUSES,
    POST_KINDS: POST_KINDS,
    DUTY_CATEGORIES: DUTY_CATEGORIES,
    validateRequest: validateRequest,
    planMobilization: planMobilization,
    validatePlan: validatePlan,
    assertPlan: assertPlan,
    canonicalStringify: canonicalStringify
};
