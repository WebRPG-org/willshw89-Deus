"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..", "..");
const MODULE_PATH = path.join(ROOT, "game", "js", "sim", "society", "DEUS_Militia.js");
const IDENTITY_PATH = path.join(ROOT, "game", "js", "sim", "society", "identity.js");
const MODULE_SOURCE = fs.readFileSync(MODULE_PATH, "utf8").replace(/\r\n/g, "\n");
const IDENTITY_SOURCE = fs.readFileSync(IDENTITY_PATH, "utf8").replace(/\r\n/g, "\n");

function loadSource(source, filename, dependency) {
    const guardedMath = Object.create(Math);
    Object.defineProperty(guardedMath, "random", {
        value() { throw new Error("Math.random is forbidden in the militia planner"); },
        enumerable: true,
        writable: false,
        configurable: false
    });
    const sandbox = {
        module: { exports: {} },
        exports: {},
        require(specifier) {
            if (specifier === "./identity" && dependency) return dependency;
            throw new Error(`forbidden require ${specifier}`);
        },
        Math: guardedMath,
        Date: undefined,
        performance: undefined,
        process: undefined,
        console: undefined,
        window: undefined,
        document: undefined,
        setTimeout: undefined,
        setInterval: undefined
    };
    vm.runInNewContext(source, sandbox, { filename, timeout: 5000 });
    return sandbox.module.exports;
}

function loadModule(source = MODULE_SOURCE) {
    const identity = loadSource(IDENTITY_SOURCE, "identity.js", null);
    return loadSource(source, "DEUS_Militia.js", identity);
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function stable(value) {
    if (value === null) return "null";
    if (typeof value === "string") return JSON.stringify(value);
    if (typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stable(value[key])).join(",") + "}";
}

function same(left, right) {
    return stable(left) === stable(right);
}

function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    return value;
}

function identity(craft = "NONE", civicOffice = "NONE", classId = "NONE", level = null) {
    return { schema: 1, craft, civicOffice, class: { id: classId, level } };
}

function eligibility(eligible, reason) {
    return { eligible, reason, source: { authority: "TEST_CALLER", decisionId: eligible ? 1 : 2 } };
}

function duty(id, kind, category, provenance) {
    return { id, kind, category, provenance };
}

function person(id, options = {}) {
    return {
        id,
        factionId: options.factionId === undefined ? 7 : options.factionId,
        alive: options.alive === undefined ? true : options.alive,
        eligibility: options.eligibility || eligibility(true, "CALLER_ELIGIBLE"),
        serviceStatus: options.serviceStatus || "MILITIA",
        eligiblePostIds: options.eligiblePostIds ? options.eligiblePostIds.slice() : [201],
        identity: options.identity || identity(),
        currentDuty: options.currentDuty === undefined ? null : options.currentDuty
    };
}

function baseRequest() {
    const people = [
        person(101, {
            serviceStatus: "MILITIA",
            eligiblePostIds: [202, 201],
            identity: identity("BLACKSMITH", "TREASURER", "srd:class:fighter", 3),
            currentDuty: duty(501, "FORGE_PICKAXES", "CIVILIAN_ECONOMIC", {
                jobId: 7001,
                workstationId: 8101,
                target: { item: "pickaxe", count: 0 },
                note: null
            })
        }),
        person(102, {
            serviceStatus: "GUARD",
            eligiblePostIds: [201],
            identity: identity("NONE", "NONE", "srd:class:rogue", 2),
            currentDuty: duty(502, "PATROL_MARKET", "NON_ECONOMIC", { routeId: 9001 })
        }),
        person(103, {
            serviceStatus: "PROFESSIONAL",
            eligiblePostIds: [202],
            identity: identity("FARMER", "NONE", "NONE", null),
            currentDuty: duty(503, "HARVEST_FIELD", "CIVILIAN_ECONOMIC", {
                jobId: 7003,
                fieldId: 8202,
                crop: { id: "barley", ripeRows: 4 },
                expectedLoss: null
            })
        }),
        person(104, {
            alive: false,
            serviceStatus: "MILITIA",
            eligiblePostIds: [201],
            currentDuty: duty(504, "MILL_GRAIN", "CIVILIAN_ECONOMIC", { jobId: 7004 })
        }),
        person(105, {
            eligibility: eligibility(false, "CALLER_PROTECTED_DUTY"),
            serviceStatus: "RESERVE",
            eligiblePostIds: [202],
            currentDuty: duty(505, "TEND_PATIENT", "CIVILIAN_ECONOMIC", { patientId: 991 })
        }),
        person(106, {
            serviceStatus: "NONE",
            eligiblePostIds: [201],
            identity: identity("NONE", "NONE", "srd:class:fighter", 4)
        }),
        person(107, {
            serviceStatus: "RESERVE",
            eligiblePostIds: [202],
            identity: identity("CARPENTER", "MARSHAL", "srd:class:wizard", 1)
        })
    ];
    return {
        schema: 1,
        threat: {
            id: 301,
            factionId: 7,
            key: "TEST_RAID_WEST",
            source: { eventId: 401, observer: "TEST_SCOUT", confidenceBasis: { sightings: 2 } }
        },
        people,
        posts: [
            { id: 201, factionId: 7, kind: "GATE", capacity: 1, source: { structureId: 601 } },
            { id: 202, factionId: 7, kind: "WALL", capacity: 2, source: { structureId: 602 } },
            { id: 203, factionId: 7, kind: "WALL", capacity: 0, source: { structureId: 603 } }
        ],
        policy: {
            schema: 1,
            id: "TEST_MOBILIZATION_POLICY",
            version: 4,
            threatKey: "TEST_RAID_WEST",
            authority: { decisionId: "TEST_POLICY_4", issuedBy: "TEST_CALLER" },
            allowedStatuses: ["PROFESSIONAL", "MILITIA", "GUARD"],
            candidatePriorities: [
                { personId: 104, priority: 0, tieBreak: 10 },
                { personId: 105, priority: 0, tieBreak: 20 },
                { personId: 106, priority: 0, tieBreak: 30 },
                { personId: 107, priority: 0, tieBreak: 40 },
                { personId: 101, priority: 1, tieBreak: 10 },
                { personId: 102, priority: 1, tieBreak: 20 },
                { personId: 103, priority: 1, tieBreak: 30 }
            ],
            postRequirements: [
                { postId: 201, requested: 1, priority: 0, tieBreak: 10 },
                { postId: 202, requested: 2, priority: 0, tieBreak: 20 },
                { postId: 203, requested: 1, priority: 1, tieBreak: 10 }
            ]
        }
    };
}

function populationRequest(count, requested, capacity = count) {
    const req = {
        schema: 1,
        threat: { id: 330, factionId: 9, key: "TEST_EXPLICIT_THREAT", source: { eventId: 430 } },
        people: [],
        posts: [{ id: 290, factionId: 9, kind: "GATE", capacity, source: { structureId: 690 } }],
        policy: {
            schema: 1,
            id: "TEST_EXPLICIT_POLICY",
            version: 1,
            threatKey: "TEST_EXPLICIT_THREAT",
            authority: { decisionId: "TEST_RATIO_PROVOCATION" },
            allowedStatuses: ["MILITIA"],
            candidatePriorities: [],
            postRequirements: [{ postId: 290, requested, priority: 0, tieBreak: 0 }]
        }
    };
    for (let i = 0; i < count; i++) {
        const id = 1001 + i;
        req.people.push({
            id,
            factionId: 9,
            alive: true,
            eligibility: eligibility(true, "CALLER_ELIGIBLE"),
            serviceStatus: "MILITIA",
            eligiblePostIds: [290],
            identity: identity(i % 2 ? "FARMER" : "NONE", "NONE", i % 3 ? "NONE" : "srd:class:fighter", i % 3 ? null : 1),
            currentDuty: null
        });
        req.policy.candidatePriorities.push({ personId: id, priority: 0, tieBreak: i });
    }
    return req;
}

function throwsCode(fn, code) {
    try {
        fn();
        return { pass: false, message: `did not throw ${code}` };
    } catch (error) {
        return { pass: error && error.code === code, message: `${error && error.code}: ${error && error.message}` };
    }
}

function result(pass, message) {
    return { pass: !!pass, message: String(message === undefined ? "" : message) };
}

function runChecks(mod) {
    const checks = [];
    function check(name, body) {
        try {
            const outcome = body();
            checks.push({ name, pass: !!outcome.pass, message: outcome.message });
        } catch (error) {
            checks.push({ name, pass: false, message: error && (error.stack || error.message) || String(error) });
        }
    }
    function invalid(name, code, mutate) {
        check(name, () => {
            const req = baseRequest();
            mutate(req);
            const planned = throwsCode(() => mod.planMobilization(req), code);
            let validated;
            try { validated = mod.validateRequest(req); }
            catch (error) { return result(false, `validateRequest threw ${error && error.stack || error}`); }
            const validationPass = validated && validated.ok === false && Array.isArray(validated.errors) &&
                validated.errors.length > 0 && validated.errors[0].code === code;
            return result(planned.pass && validationPass,
                `${planned.message}; validateRequest=${stable(validated)}`);
        });
    }

    check("baseline_plan_is_auditable", () => {
        const plan = mod.planMobilization(baseRequest());
        const pairs = plan.assignments.map(a => `${a.personId}:${a.postId}`).join(",");
        return result(plan.status === "PLANNED" && pairs === "101:201,103:202" && plan.orders.length === 2,
            `${pairs}; ${plan.orders.length} orders`);
    });
    check("plan_schema_and_status_are_exact", () => {
        const plan = mod.planMobilization(baseRequest());
        return result(plan.schema === 1 && plan.status === "PLANNED", `schema=${plan.schema}; status=${plan.status}`);
    });
    check("assignment_records_are_exact", () => {
        const plan = mod.planMobilization(baseRequest());
        const expected = [
            { orderId: "MOB-301-201-101", personId: 101, postId: 201, postKind: "GATE" },
            { orderId: "MOB-301-202-103", personId: 103, postId: 202, postKind: "WALL" }
        ];
        return result(same(plan.assignments, expected), stable(plan.assignments));
    });
    check("order_links_are_coherent", () => {
        const plan = mod.planMobilization(baseRequest());
        const pass = plan.orders.length === plan.assignments.length && plan.orders.every(order => {
            const assignment = plan.assignments.find(row => row.orderId === order.orderId);
            const dutyType = order.postKind === "GATE" ? "DEFEND_GATE" : "DEFEND_WALL";
            return assignment && order.type === "DEFEND_POST" && order.threatId === 301 &&
                order.policyId === "TEST_MOBILIZATION_POLICY" && order.personId === assignment.personId &&
                order.postId === assignment.postId && order.postKind === assignment.postKind &&
                same(order.duty, { type: dutyType, postId: order.postId });
        });
        return result(pass, stable(plan.orders.map(row => ({
            orderId: row.orderId, personId: row.personId, postId: row.postId,
            postKind: row.postKind, duty: row.duty
        }))));
    });
    check("order_audit_preserves_decisive_inputs", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        const order = plan.orders.find(row => row.personId === 101);
        const sourcePerson = req.people.find(row => row.id === 101);
        const sourcePost = req.posts.find(row => row.id === 201);
        const expectedPriority = req.policy.candidatePriorities.find(row => row.personId === 101);
        const expectedRequirement = req.policy.postRequirements.find(row => row.postId === 201);
        const pass = order && order.type === "DEFEND_POST" && order.threatId === req.threat.id &&
            order.policyId === req.policy.id && order.postKind === "GATE" &&
            same(order.duty, { type: "DEFEND_GATE", postId: 201 }) && same(order.previousDuty, sourcePerson.currentDuty) &&
            order.audit.serviceStatus === sourcePerson.serviceStatus && same(order.audit.eligibility, sourcePerson.eligibility) &&
            same(order.audit.eligiblePostIds, [201, 202]) &&
            same(order.audit.candidatePriority, { priority: expectedPriority.priority, tieBreak: expectedPriority.tieBreak }) &&
            same(order.audit.postRequirement, {
                requested: expectedRequirement.requested,
                priority: expectedRequirement.priority,
                tieBreak: expectedRequirement.tieBreak
            }) && order.audit.postCapacity === sourcePost.capacity && same(order.audit.postSource, sourcePost.source);
        return result(pass, stable(order));
    });
    check("plan_context_preserves_threat_and_policy_authority", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        return result(same(plan.threat, req.threat) && same(plan.policy.authority, req.policy.authority) &&
            plan.policy.id === req.policy.id && plan.policy.version === req.policy.version, `${stable(plan.threat)} / ${stable(plan.policy.authority)}`);
    });
    check("policy_context_preserves_complete_decision", () => {
        const plan = mod.planMobilization(baseRequest());
        const policy = plan.policy;
        return result(same(policy.allowedStatuses, ["GUARD", "MILITIA", "PROFESSIONAL"]) &&
            same(policy.candidatePriorities.map(row => row.personId), [104, 105, 106, 107, 101, 102, 103]) &&
            same(policy.postRequirements.map(row => row.postId), [201, 202, 203]) &&
            policy.threatKey === "TEST_RAID_WEST", stable(policy));
    });
    check("summary_accounts_every_person", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        const accounted = plan.assignments.map(row => row.personId).concat(plan.refusals.map(row => row.personId));
        return result(plan.summary.assigned === plan.assignments.length && plan.summary.refused === plan.refusals.length &&
            accounted.length === req.people.length && new Set(accounted).size === req.people.length,
            `${stable(plan.summary)} accounted=${accounted.join(",")}`);
    });
    check("summary_record_is_exact", () => {
        const summary = mod.planMobilization(baseRequest()).summary;
        const expected = {
            requested: 4,
            availableCapacity: 3,
            assigned: 2,
            refused: 5,
            unfilled: 2,
            displacedCivilianDuties: 2
        };
        return result(same(summary, expected), stable(summary));
    });
    check("baseline_summary_conserves_demand", () => {
        const plan = mod.planMobilization(baseRequest());
        const s = plan.summary;
        return result(s.requested === 4 && s.assigned === 2 && s.unfilled === 2 && s.requested === s.assigned + s.unfilled,
            JSON.stringify(s));
    });
    check("dead_person_refused", () => {
        const plan = mod.planMobilization(baseRequest());
        const refusal = plan.refusals.find(r => r.personId === 104);
        return result(refusal && refusal.reason === "DEAD" && !plan.assignments.some(a => a.personId === 104), JSON.stringify(refusal));
    });
    check("dead_refusal_audit_is_exact", () => {
        const req = baseRequest();
        const refusal = mod.planMobilization(req).refusals.find(row => row.personId === 104);
        const expected = {
            personId: 104,
            reason: "DEAD",
            serviceStatus: "MILITIA",
            alive: false,
            eligibility: req.people.find(row => row.id === 104).eligibility,
            eligiblePostIds: [201],
            candidatePriority: { priority: 0, tieBreak: 10 }
        };
        return result(same(refusal, expected), stable(refusal));
    });
    check("ineligible_person_refused", () => {
        const req = baseRequest();
        req.people.find(p => p.id === 105).serviceStatus = "MILITIA";
        const plan = mod.planMobilization(req);
        const refusal = plan.refusals.find(r => r.personId === 105);
        return result(refusal && refusal.reason === "INELIGIBLE" && !plan.assignments.some(a => a.personId === 105), JSON.stringify(refusal));
    });
    check("none_status_is_noncombatant", () => {
        const plan = mod.planMobilization(baseRequest());
        const refusal = plan.refusals.find(r => r.personId === 106);
        return result(refusal && refusal.reason === "NONCOMBATANT_STATUS" && !plan.assignments.some(a => a.personId === 106), JSON.stringify(refusal));
    });
    check("unauthorized_status_refused", () => {
        const plan = mod.planMobilization(baseRequest());
        const refusal = plan.refusals.find(r => r.personId === 107);
        return result(refusal && refusal.reason === "STATUS_NOT_AUTHORIZED", JSON.stringify(refusal));
    });
    check("demand_satisfied_refusal_is_explicit", () => {
        const plan = mod.planMobilization(baseRequest());
        const refusal = plan.refusals.find(r => r.personId === 102);
        return result(refusal && refusal.reason === "DEMAND_SATISFIED", JSON.stringify(refusal));
    });
    check("unfilled_posts_separate_capacity_and_people", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        const wall = plan.unfilledPosts.find(p => p.postId === 202);
        const zero = plan.unfilledPosts.find(p => p.postId === 203);
        return result(wall && wall.unfilled === 1 && wall.reasons[0].code === "NO_AVAILABLE_PERSON" &&
            same(wall.postSource, req.posts.find(p => p.id === 202).source) &&
            zero && zero.unfilled === 1 && zero.reasons[0].code === "POST_CAPACITY" &&
            same(zero.postSource, req.posts.find(p => p.id === 203).source), JSON.stringify(plan.unfilledPosts));
    });
    check("unfilled_post_records_are_exact", () => {
        const plan = mod.planMobilization(baseRequest());
        const expected = [
            {
                postId: 202, postKind: "WALL", requested: 2, capacity: 2, assigned: 1, unfilled: 1,
                postSource: { structureId: 602 }, reasons: [{ code: "NO_AVAILABLE_PERSON", count: 1 }]
            },
            {
                postId: 203, postKind: "WALL", requested: 1, capacity: 0, assigned: 0, unfilled: 1,
                postSource: { structureId: 603 }, reasons: [{ code: "POST_CAPACITY", count: 1 }]
            }
        ];
        return result(same(plan.unfilledPosts, expected), stable(plan.unfilledPosts));
    });
    check("displacement_exact_provenance", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        const got = plan.displacedCivilianDuties;
        const expected = [101, 103].map(id => ({
            personId: id,
            orderId: plan.assignments.find(a => a.personId === id).orderId,
            postId: plan.assignments.find(a => a.personId === id).postId,
            previousDuty: req.people.find(p => p.id === id).currentDuty
        }));
        return result(same(got, expected), stable(got));
    });
    check("professional_displacement_preserved", () => {
        const plan = mod.planMobilization(baseRequest());
        const record = plan.displacedCivilianDuties.find(d => d.personId === 103);
        return result(record && record.previousDuty.provenance.crop.id === "barley" && record.previousDuty.provenance.expectedLoss === null,
            JSON.stringify(record));
    });
    check("proto_named_provenance_is_preserved", () => {
        const req = baseRequest();
        const provenance = req.people.find(p => p.id === 101).currentDuty.provenance;
        Object.defineProperty(provenance, "__proto__", {
            value: { evidenceId: 777, note: "must survive" },
            enumerable: true,
            writable: true,
            configurable: true
        });
        const plan = mod.planMobilization(req);
        const displaced = plan.displacedCivilianDuties.find(d => d.personId === 101).previousDuty.provenance;
        const checked = mod.validatePlan(req, plan);
        return result(Object.prototype.hasOwnProperty.call(displaced, "__proto__") &&
            same(displaced.__proto__, provenance.__proto__) && checked.ok &&
            mod.canonicalStringify(displaced).includes("\"__proto__\""), mod.canonicalStringify(displaced));
    });
    check("non_economic_duty_not_displaced", () => {
        const req = baseRequest();
        req.policy.candidatePriorities.find(r => r.personId === 102).priority = 1;
        req.policy.candidatePriorities.find(r => r.personId === 102).tieBreak = 5;
        req.policy.candidatePriorities.find(r => r.personId === 101).tieBreak = 10;
        const plan = mod.planMobilization(req);
        return result(plan.assignments.some(a => a.personId === 102) && !plan.displacedCivilianDuties.some(d => d.personId === 102), stable(plan.displacedCivilianDuties));
    });
    check("no_duty_does_not_invent_displacement", () => {
        const req = populationRequest(1, 1);
        const plan = mod.planMobilization(req);
        return result(plan.assignments.length === 1 && plan.orders[0].previousDuty === null && plan.displacedCivilianDuties.length === 0,
            stable(plan));
    });
    check("identity_axes_do_not_authorize", () => {
        const req = populationRequest(1, 1);
        req.people[0].serviceStatus = "RESERVE";
        req.people[0].identity = identity("BLACKSMITH", "MARSHAL", "srd:class:fighter", 20);
        req.policy.allowedStatuses = ["MILITIA"];
        const plan = mod.planMobilization(req);
        return result(plan.assignments.length === 0 && plan.refusals[0].reason === "STATUS_NOT_AUTHORIZED", stable(plan.refusals));
    });
    check("identity_changes_do_not_change_selection", () => {
        const first = populationRequest(3, 2);
        const second = clone(first);
        second.people[0].identity = identity("JEWELER", "MARSHAL", "srd:class:wizard", 20);
        second.people[1].identity = identity("NONE", "NONE", "NONE", null);
        const ids1 = mod.planMobilization(first).assignments.map(a => a.personId);
        const ids2 = mod.planMobilization(second).assignments.map(a => a.personId);
        return result(same(ids1, ids2), `${ids1} / ${ids2}`);
    });
    check("reserve_requires_explicit_authorization", () => {
        const denied = populationRequest(1, 1);
        denied.people[0].serviceStatus = "RESERVE";
        denied.policy.allowedStatuses = [];
        const allowed = clone(denied);
        allowed.policy.allowedStatuses = ["RESERVE"];
        return result(mod.planMobilization(denied).assignments.length === 0 && mod.planMobilization(allowed).assignments.length === 1,
            "denied then caller-authorized");
    });
    check("elite_retinue_token_is_consumed_not_derived", () => {
        const req = populationRequest(1, 1);
        req.people[0].serviceStatus = "ELITE_RETINUE";
        req.policy.allowedStatuses = ["ELITE_RETINUE"];
        const plan = mod.planMobilization(req);
        return result(plan.assignments.length === 1 && plan.orders[0].audit.serviceStatus === "ELITE_RETINUE", stable(plan.assignments));
    });
    check("all_six_status_records_validate", () => {
        const statuses = ["NONE", "RESERVE", "MILITIA", "GUARD", "PROFESSIONAL", "ELITE_RETINUE"];
        const outcomes = statuses.map(status => {
            const req = populationRequest(1, 1);
            req.people[0].serviceStatus = status;
            req.policy.allowedStatuses = status === "NONE" ? [] : [status];
            return mod.validateRequest(req).ok;
        });
        return result(outcomes.every(Boolean), outcomes.join(","));
    });
    check("caller_priority_controls_selection", () => {
        const req = populationRequest(2, 1);
        req.people[0].serviceStatus = "PROFESSIONAL";
        req.people[1].serviceStatus = "MILITIA";
        req.policy.allowedStatuses = ["PROFESSIONAL", "MILITIA"];
        req.policy.candidatePriorities[0] = { personId: 1001, priority: 5, tieBreak: 0 };
        req.policy.candidatePriorities[1] = { personId: 1002, priority: 0, tieBreak: 0 };
        const selected = mod.planMobilization(req).assignments[0].personId;
        return result(selected === 1002, `selected ${selected}`);
    });
    check("post_priority_controls_allocation", () => {
        const req = populationRequest(1, 1);
        req.posts.push({ id: 291, factionId: 9, kind: "WALL", capacity: 1, source: { structureId: 691 } });
        req.people[0].eligiblePostIds.push(291);
        req.policy.postRequirements[0] = { postId: 290, requested: 1, priority: 1, tieBreak: 0 };
        req.policy.postRequirements.push({ postId: 291, requested: 1, priority: 0, tieBreak: 1 });
        const plan = mod.planMobilization(req);
        return result(plan.assignments.length === 1 && plan.assignments[0].postId === 291, stable(plan.assignments));
    });
    check("post_tie_break_controls_allocation", () => {
        const req = populationRequest(1, 1);
        req.posts.push({ id: 291, factionId: 9, kind: "WALL", capacity: 1, source: { structureId: 691 } });
        req.people[0].eligiblePostIds.push(291);
        req.policy.postRequirements[0] = { postId: 290, requested: 1, priority: 0, tieBreak: 1 };
        req.policy.postRequirements.push({ postId: 291, requested: 1, priority: 0, tieBreak: 0 });
        const plan = mod.planMobilization(req);
        return result(plan.assignments.length === 1 && plan.assignments[0].postId === 291, stable(plan.assignments));
    });
    check("wall_order_uses_wall_duty", () => {
        const plan = mod.planMobilization(baseRequest());
        const order = plan.orders.find(row => row.personId === 103);
        return result(order && order.postKind === "WALL" && same(order.duty, { type: "DEFEND_WALL", postId: 202 }), stable(order));
    });
    check("post_compatibility_respected", () => {
        const req = populationRequest(1, 1);
        req.people[0].eligiblePostIds = [];
        const plan = mod.planMobilization(req);
        return result(plan.assignments.length === 0 && plan.refusals[0].reason === "NO_REQUESTED_POST", stable(plan.refusals));
    });
    check("one_person_one_post", () => {
        const req = populationRequest(1, 1);
        req.posts.push({ id: 291, factionId: 9, kind: "WALL", capacity: 1, source: { structureId: 691 } });
        req.people[0].eligiblePostIds.push(291);
        req.policy.postRequirements.push({ postId: 291, requested: 1, priority: 0, tieBreak: 1 });
        const plan = mod.planMobilization(req);
        return result(plan.assignments.length === 1 && new Set(plan.assignments.map(a => a.personId)).size === 1 && plan.summary.unfilled === 1,
            stable(plan.assignments));
    });
    check("capacity_never_overassigned", () => {
        const req = populationRequest(5, 4, 2);
        const plan = mod.planMobilization(req);
        const unfilled = plan.unfilledPosts[0];
        return result(plan.assignments.length === 2 && unfilled.unfilled === 2 && unfilled.reasons[0].code === "POST_CAPACITY",
            stable(plan));
    });
    check("unfilled_reasons_partition_shortfall", () => {
        const plan = mod.planMobilization(populationRequest(1, 3, 2));
        const unfilled = plan.unfilledPosts[0];
        const expected = [
            { code: "POST_CAPACITY", count: 1 },
            { code: "NO_AVAILABLE_PERSON", count: 1 }
        ];
        const explained = unfilled.reasons.reduce((sum, row) => sum + row.count, 0);
        return result(plan.assignments.length === 1 && unfilled.unfilled === 2 && same(unfilled.reasons, expected) && explained === unfilled.unfilled,
            stable(unfilled));
    });
    check("capacity_refusal_is_explicit", () => {
        const plan = mod.planMobilization(populationRequest(2, 2, 1));
        const refusal = plan.refusals.find(row => row.personId === 1002);
        const unfilled = plan.unfilledPosts[0];
        return result(refusal && refusal.reason === "POST_CAPACITY_EXHAUSTED" &&
            unfilled && same(unfilled.reasons, [{ code: "POST_CAPACITY", count: 1 }]),
        `${stable(refusal)} / ${stable(unfilled)}`);
    });
    check("zero_capacity_is_valid_and_audited", () => {
        const plan = mod.planMobilization(populationRequest(2, 2, 0));
        return result(plan.assignments.length === 0 && plan.unfilledPosts[0].unfilled === 2 && plan.unfilledPosts[0].reasons[0].count === 2,
            stable(plan.unfilledPosts));
    });
    check("zero_demand_mobilizes_nobody", () => {
        const plan = mod.planMobilization(populationRequest(8, 0, 8));
        return result(plan.assignments.length === 0 && plan.summary.requested === 0 && plan.summary.unfilled === 0,
            stable(plan.summary));
    });
    check("ratio_same_population_tracks_demand", () => {
        const counts = [0, 1, 3, 7, 8].map(wanted => mod.planMobilization(populationRequest(8, wanted, 8)).assignments.length);
        return result(same(counts, [0, 1, 3, 7, 8]), counts.join(","));
    });
    check("ratio_demand_seven_of_eight", () => {
        const count = mod.planMobilization(populationRequest(8, 7, 8)).assignments.length;
        return result(count === 7, `assigned ${count}`);
    });
    check("ratio_one_of_one", () => {
        const count = mod.planMobilization(populationRequest(1, 1, 1)).assignments.length;
        return result(count === 1, `assigned ${count}`);
    });
    check("ratio_same_demand_different_population", () => {
        const counts = [3, 8, 17, 101].map(size => mod.planMobilization(populationRequest(size, 3, 3)).assignments.length);
        return result(counts.every(count => count === 3), counts.join(","));
    });
    check("irrelevant_population_does_not_change_assignments", () => {
        const small = populationRequest(3, 2, 2);
        const large = clone(small);
        for (let i = 0; i < 20; i++) {
            const id = 2000 + i;
            large.people.push(person(id, {
                factionId: 9,
                alive: i % 2 !== 0,
                eligibility: eligibility(false, "CALLER_INELIGIBLE"),
                serviceStatus: "MILITIA",
                eligiblePostIds: [290]
            }));
            large.policy.candidatePriorities.push({ personId: id, priority: 10, tieBreak: i });
        }
        const a = mod.planMobilization(small).assignments.map(x => x.personId);
        const b = mod.planMobilization(large).assignments.map(x => x.personId);
        return result(same(a, b), `${a} / ${b}`);
    });
    check("deterministic_repeated_plan", () => {
        const req = baseRequest();
        const a = mod.planMobilization(req);
        const b = mod.planMobilization(req);
        return result(mod.canonicalStringify(a) === mod.canonicalStringify(b), mod.canonicalStringify(a).slice(0, 120));
    });
    check("permuted_inputs_same_plan", () => {
        const first = baseRequest();
        const second = clone(first);
        second.people.reverse();
        second.posts.reverse();
        second.policy.candidatePriorities.reverse();
        second.policy.postRequirements.reverse();
        second.policy.allowedStatuses.reverse();
        for (const p of second.people) p.eligiblePostIds.reverse();
        const a = mod.planMobilization(first);
        const b = mod.planMobilization(second);
        return result(mod.canonicalStringify(a) === mod.canonicalStringify(b), `${a.assignments.length}/${b.assignments.length}`);
    });
    check("input_not_mutated", () => {
        const req = baseRequest();
        const before = stable(req);
        mod.planMobilization(req);
        return result(stable(req) === before, "request snapshot unchanged");
    });
    check("rejected_input_not_mutated", () => {
        const req = baseRequest();
        req.posts[1].capacity = -1;
        const before = stable(req);
        try { mod.planMobilization(req); } catch (_) {}
        return result(stable(req) === before, "invalid request snapshot unchanged");
    });
    check("frozen_input_supported", () => {
        const req = deepFreeze(baseRequest());
        const plan = mod.planMobilization(req);
        return result(plan.assignments.length === 2, `${plan.assignments.length} assignments`);
    });
    check("output_duty_is_detached", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        plan.displacedCivilianDuties[0].previousDuty.provenance.target.count = 999;
        plan.orders[0].previousDuty.provenance.target.item = "changed";
        const original = req.people.find(p => p.id === 101).currentDuty.provenance.target;
        return result(original.count === 0 && original.item === "pickaxe", stable(original));
    });
    check("later_input_mutation_does_not_change_plan", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        const before = mod.canonicalStringify(plan);
        req.people[0].currentDuty.provenance.jobId = -5;
        req.threat.source.eventId = -1;
        return result(mod.canonicalStringify(plan) === before, "plan snapshot unchanged");
    });
    check("canonical_plan_validates", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        return result(mod.validatePlan(req, plan).ok, JSON.stringify(mod.validatePlan(req, plan)));
    });
    check("noncanonical_audit_is_rejected", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        plan.orders[0].audit.postCapacity = 999999;
        const checked = mod.validatePlan(req, plan);
        return result(!checked.ok && checked.errors.some(error => error.path === "$" && error.message.includes("canonical")),
            JSON.stringify(checked));
    });
    check("non_object_plan_rejected_by_guard", () => {
        const checked = mod.validatePlan(baseRequest(), []);
        return result(!checked.ok && checked.errors.some(error => error.path === "$" && error.message === "plan must be an object"),
            JSON.stringify(checked));
    });
    check("non_array_plan_collections_rejected_by_guard", () => {
        const fields = ["assignments", "orders", "displacedCivilianDuties"];
        const outcomes = fields.map(field => {
            const req = baseRequest();
            const plan = mod.planMobilization(req);
            plan[field] = {};
            const checked = mod.validatePlan(req, plan);
            return checked.errors.some(error => error.message === "plan assignment, order and displacement collections must be arrays");
        });
        return result(outcomes.every(Boolean), outcomes.join(","));
    });
    check("assert_plan_returns_detached_copy", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        const checked = mod.assertPlan(req, plan);
        checked.orders[0].audit.eligibility.reason = "CHANGED";
        return result(plan.orders[0].audit.eligibility.reason === "CALLER_ELIGIBLE", plan.orders[0].audit.eligibility.reason);
    });
    check("corrupt_duplicate_assignment_rejected", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        plan.assignments.push(clone(plan.assignments[0]));
        const checked = mod.validatePlan(req, plan);
        return result(!checked.ok && checked.errors.some(e => e.message === "person is assigned more than once"), JSON.stringify(checked));
    });
    check("corrupt_non_object_assignment_rejected", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        plan.assignments[0] = null;
        const checked = mod.validatePlan(req, plan);
        return result(!checked.ok && checked.errors.some(e => e.path === "$.assignments[0]" && e.message === "must be an object"),
            JSON.stringify(checked));
    });
    check("corrupt_assignment_scalar_fields_rejected", () => {
        const cases = [
            { field: "personId", value: 0, message: "must be a positive safe integer stable ID" },
            { field: "postId", value: 0, message: "must be a positive safe integer stable ID" },
            { field: "orderId", value: "", message: "must be a non-empty string" }
        ];
        const outcomes = cases.map(testCase => {
            const req = baseRequest();
            const plan = mod.planMobilization(req);
            plan.assignments[0][testCase.field] = testCase.value;
            const checked = mod.validatePlan(req, plan);
            return checked.errors.some(error => error.path === `$.assignments[0].${testCase.field}` && error.message === testCase.message);
        });
        return result(outcomes.every(Boolean), outcomes.join(","));
    });
    check("corrupt_unknown_person_rejected_by_guard", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        plan.assignments[0].personId = 999999;
        const checked = mod.validatePlan(req, plan);
        return result(!checked.ok && checked.errors.some(e => e.message === "references unknown person"), JSON.stringify(checked));
    });
    check("corrupt_nonexistent_post_rejected", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        plan.assignments[0].postId = 999999;
        const checked = mod.validatePlan(req, plan);
        return result(!checked.ok && checked.errors.some(e => e.message === "references unknown post"), JSON.stringify(checked));
    });
    check("corrupt_over_capacity_plan_rejected", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        plan.assignments.push({ orderId: "TEST-OVER", personId: 102, postId: 203, postKind: "WALL" });
        const checked = mod.validatePlan(req, plan);
        return result(!checked.ok && checked.errors.some(e => e.message.includes("capacity")), JSON.stringify(checked));
    });
    check("corrupt_over_demand_plan_rejected", () => {
        const req = populationRequest(2, 1, 2);
        const plan = mod.planMobilization(req);
        plan.assignments.push({ orderId: "TEST-OVER-DEMAND", personId: 1002, postId: 290, postKind: "GATE" });
        plan.orders.push(clone(plan.orders[0]));
        plan.orders[1].orderId = "TEST-OVER-DEMAND";
        plan.orders[1].personId = 1002;
        const checked = mod.validatePlan(req, plan);
        return result(!checked.ok && checked.errors.some(e => e.message === "policy demand is exceeded"), JSON.stringify(checked));
    });
    check("corrupt_duplicate_order_id_rejected", () => {
        const req = populationRequest(2, 2, 2);
        const plan = mod.planMobilization(req);
        plan.assignments[1].orderId = plan.assignments[0].orderId;
        const checked = mod.validatePlan(req, plan);
        return result(!checked.ok && checked.errors.some(e => e.message === "order ID is duplicated"), JSON.stringify(checked));
    });
    check("corrupt_unavailable_assignment_rejected", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        plan.assignments[0].personId = 104;
        const checked = mod.validatePlan(req, plan);
        return result(!checked.ok && checked.errors.some(e => e.message === "assigned person is dead, ineligible, unauthorized or incompatible"),
            JSON.stringify(checked));
    });
    check("corrupt_order_count_rejected", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        plan.orders.pop();
        const checked = mod.validatePlan(req, plan);
        return result(!checked.ok && checked.errors.some(e => e.message === "must have exactly one order per assignment"), JSON.stringify(checked));
    });
    check("corrupt_missing_displacement_rejected", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        plan.displacedCivilianDuties.pop();
        const checked = mod.validatePlan(req, plan);
        return result(!checked.ok && checked.errors.some(e => e.message === "assigned civilian duty must have exactly one displacement record"), JSON.stringify(checked));
    });
    check("corrupt_displacement_provenance_rejected", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        plan.displacedCivilianDuties[0].previousDuty.provenance = {};
        const checked = mod.validatePlan(req, plan);
        return result(!checked.ok && checked.errors.some(e => e.message === "does not preserve the supplied duty provenance"), JSON.stringify(checked));
    });
    check("corrupt_duplicate_displacement_rejected", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        plan.displacedCivilianDuties.push(clone(plan.displacedCivilianDuties[0]));
        return result(!mod.validatePlan(req, plan).ok, JSON.stringify(mod.validatePlan(req, plan)));
    });
    check("corrupt_unassigned_displacement_rejected", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        plan.displacedCivilianDuties.push({
            personId: 105,
            orderId: "TEST-NOT-ASSIGNED",
            postId: 202,
            previousDuty: clone(req.people.find(row => row.id === 105).currentDuty)
        });
        const checked = mod.validatePlan(req, plan);
        return result(!checked.ok && checked.errors.some(e => e.message === "must reference an assigned person"), JSON.stringify(checked));
    });
    check("corrupt_displacement_person_id_rejected", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        plan.displacedCivilianDuties[0].personId = 0;
        const checked = mod.validatePlan(req, plan);
        return result(!checked.ok && checked.errors.some(e => e.path === "$.displacedCivilianDuties[0].personId" &&
            e.message === "must be a positive safe integer stable ID"), JSON.stringify(checked));
    });
    check("corrupt_non_economic_displacement_rejected", () => {
        const req = baseRequest();
        req.policy.candidatePriorities.find(row => row.personId === 102).tieBreak = 5;
        const plan = mod.planMobilization(req);
        const assignment = plan.assignments.find(row => row.personId === 102);
        plan.displacedCivilianDuties.push({
            personId: 102,
            orderId: assignment.orderId,
            postId: assignment.postId,
            previousDuty: clone(req.people.find(row => row.id === 102).currentDuty)
        });
        const checked = mod.validatePlan(req, plan);
        return result(!checked.ok && checked.errors.some(e => e.message === "must reference a supplied civilian economic duty"),
            JSON.stringify(checked));
    });
    check("assert_plan_throws_on_corruption", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        plan.assignments[0].personId = 999999;
        const outcome = throwsCode(() => mod.assertPlan(req, plan), "E_PLAN");
        return result(outcome.pass, outcome.message);
    });
    check("null_displacement_returns_structured_rejection", () => {
        const req = baseRequest();
        const plan = mod.planMobilization(req);
        plan.displacedCivilianDuties.push(null);
        const checked = mod.validatePlan(req, plan);
        return result(!checked.ok && checked.errors.some(e => e.path.includes("displacedCivilianDuties")), JSON.stringify(checked));
    });
    check("non_scalar_assignment_ids_return_structured_rejection", () => {
        const fields = ["personId", "postId", "orderId"];
        const outcomes = fields.map(field => {
            const req = baseRequest();
            const plan = mod.planMobilization(req);
            plan.assignments[0][field] = { toString: null, valueOf: null };
            try { return !mod.validatePlan(req, plan).ok; }
            catch (_) { return false; }
        });
        return result(outcomes.every(Boolean), outcomes.join(","));
    });

    invalid("reject_non_object_request", "E_DATA", req => { req.policy = () => {}; });
    invalid("reject_unknown_top_field", "E_INPUT", req => { req.populationRatio = 0.5; });
    invalid("reject_unknown_reserved_top_field", "E_INPUT", req => { req.constructor = "TEST_EXTRA"; });
    invalid("reject_wrong_request_schema", "E_INPUT", req => { req.schema = 2; });
    invalid("reject_missing_threat", "E_AUTHORITY_GAP", req => { delete req.threat; });
    invalid("reject_invalid_threat_id", "E_INPUT", req => { req.threat.id = 0; });
    invalid("reject_invalid_threat_faction_id", "E_INPUT", req => { req.threat.factionId = 0; });
    invalid("reject_missing_threat_key", "E_AUTHORITY_GAP", req => { delete req.threat.key; });
    invalid("reject_empty_threat_key", "E_INPUT", req => { req.threat.key = ""; });
    invalid("reject_overlong_threat_key", "E_INPUT", req => { req.threat.key = "X".repeat(257); });
    invalid("reject_non_string_threat_key", "E_INPUT", req => { req.threat.key = 1; });
    invalid("reject_missing_threat_source", "E_AUTHORITY_GAP", req => { delete req.threat.source; });
    invalid("reject_non_object_threat_source", "E_INPUT", req => { req.threat.source = null; });
    invalid("reject_policy_threat_mismatch", "E_AUTHORITY_GAP", req => { req.policy.threatKey = "TEST_OTHER"; });
    invalid("reject_non_array_people", "E_INPUT", req => { req.people = {}; });
    invalid("reject_non_array_posts", "E_INPUT", req => { req.posts = {}; });
    invalid("reject_duplicate_person_id", "E_DUPLICATE", req => { req.people[1].id = req.people[0].id; });
    invalid("reject_invalid_person_id", "E_INPUT", req => { req.people[0].id = -1; });
    invalid("reject_foreign_person_faction", "E_REFERENCE", req => { req.people[0].factionId = 99; });
    invalid("reject_missing_alive_status", "E_AUTHORITY_GAP", req => { delete req.people[0].alive; });
    invalid("reject_non_boolean_alive", "E_INPUT", req => { req.people[0].alive = 1; });
    invalid("reject_missing_eligibility", "E_AUTHORITY_GAP", req => { delete req.people[0].eligibility; });
    invalid("reject_missing_eligibility_decision", "E_AUTHORITY_GAP", req => { delete req.people[0].eligibility.eligible; });
    invalid("reject_non_boolean_eligibility", "E_INPUT", req => { req.people[0].eligibility.eligible = "yes"; });
    invalid("reject_missing_eligibility_reason", "E_AUTHORITY_GAP", req => { delete req.people[0].eligibility.reason; });
    invalid("reject_empty_eligibility_reason", "E_INPUT", req => { req.people[0].eligibility.reason = ""; });
    invalid("reject_overlong_eligibility_reason", "E_INPUT", req => { req.people[0].eligibility.reason = "R".repeat(257); });
    invalid("reject_missing_eligibility_source", "E_AUTHORITY_GAP", req => { delete req.people[0].eligibility.source; });
    invalid("reject_non_object_eligibility_source", "E_INPUT", req => { req.people[0].eligibility.source = "TEST_CALLER"; });
    invalid("reject_missing_service_status", "E_AUTHORITY_GAP", req => { delete req.people[0].serviceStatus; });
    invalid("reject_unknown_service_status", "E_INPUT", req => { req.people[0].serviceStatus = "CONSCRIP_T"; });
    invalid("reject_missing_post_eligibility", "E_AUTHORITY_GAP", req => { delete req.people[0].eligiblePostIds; });
    invalid("reject_non_array_eligible_posts", "E_INPUT", req => { req.people[0].eligiblePostIds = 201; });
    invalid("reject_non_id_eligible_post", "E_INPUT", req => { req.people[0].eligiblePostIds = ["201"]; });
    invalid("reject_duplicate_eligible_post", "E_DUPLICATE", req => { req.people[0].eligiblePostIds = [201, 201]; });
    invalid("reject_unknown_eligible_post", "E_REFERENCE", req => { req.people[0].eligiblePostIds = [999]; });
    invalid("reject_invalid_identity", "E_IDENTITY", req => { req.people[0].identity.craft = "SOLDIER"; });
    invalid("reject_invalid_identity_schema", "E_IDENTITY", req => { req.people[0].identity.schema = 2; });
    invalid("reject_invalid_identity_office", "E_IDENTITY", req => { req.people[0].identity.civicOffice = "GENERAL"; });
    invalid("reject_invalid_identity_class", "E_IDENTITY", req => { req.people[0].identity.class.id = "srd:class:psion"; });
    invalid("reject_invalid_identity_level", "E_IDENTITY", req => { req.people[0].identity.class.level = 21; });
    invalid("reject_identity_duty_field", "E_INPUT", req => { req.people[0].identity.currentDuty = "DEFEND"; });
    invalid("reject_missing_current_duty_evidence", "E_AUTHORITY_GAP", req => { delete req.people[0].currentDuty; });
    invalid("reject_duty_missing_provenance", "E_AUTHORITY_GAP", req => { delete req.people[0].currentDuty.provenance; });
    invalid("reject_non_object_duty_provenance", "E_INPUT", req => { req.people[0].currentDuty.provenance = null; });
    invalid("reject_duty_invalid_id", "E_INPUT", req => { req.people[0].currentDuty.id = 0; });
    invalid("reject_empty_duty_kind", "E_INPUT", req => { req.people[0].currentDuty.kind = ""; });
    invalid("reject_overlong_duty_kind", "E_INPUT", req => { req.people[0].currentDuty.kind = "D".repeat(257); });
    invalid("reject_missing_duty_category", "E_AUTHORITY_GAP", req => { delete req.people[0].currentDuty.category; });
    invalid("reject_duty_invalid_category", "E_INPUT", req => { req.people[0].currentDuty.category = "MILITARY"; });
    invalid("reject_duplicate_post_id", "E_DUPLICATE", req => { req.posts[1].id = req.posts[0].id; });
    invalid("reject_missing_post_id", "E_AUTHORITY_GAP", req => { delete req.posts[0].id; });
    invalid("reject_invalid_post_id", "E_INPUT", req => { req.posts[0].id = 0; });
    invalid("reject_missing_post_faction", "E_AUTHORITY_GAP", req => { delete req.posts[0].factionId; });
    invalid("reject_foreign_post_faction", "E_REFERENCE", req => { req.posts[0].factionId = 8; });
    invalid("reject_missing_post_kind", "E_AUTHORITY_GAP", req => { delete req.posts[0].kind; });
    invalid("reject_unknown_post_kind", "E_INPUT", req => { req.posts[0].kind = "TOWER"; });
    invalid("reject_missing_post_source", "E_AUTHORITY_GAP", req => { delete req.posts[0].source; });
    invalid("reject_non_object_post_source", "E_INPUT", req => { req.posts[0].source = []; });
    invalid("reject_missing_post_capacity", "E_AUTHORITY_GAP", req => { delete req.posts[0].capacity; });
    invalid("reject_negative_post_capacity", "E_INPUT", req => { req.posts[0].capacity = -1; });
    invalid("reject_fractional_post_capacity", "E_INPUT", req => { req.posts[0].capacity = 1.5; });
    invalid("reject_string_post_capacity", "E_INPUT", req => { req.posts[0].capacity = "2"; });
    invalid("reject_nonfinite_post_capacity", "E_DATA", req => { req.posts[0].capacity = Infinity; });
    invalid("reject_unsafe_post_capacity", "E_INPUT", req => { req.posts[0].capacity = Number.MAX_SAFE_INTEGER + 1; });
    invalid("reject_unsafe_aggregate_capacity", "E_INPUT", req => {
        req.posts[0].capacity = Number.MAX_SAFE_INTEGER;
        req.posts[1].capacity = 1;
    });
    invalid("reject_missing_policy", "E_AUTHORITY_GAP", req => { delete req.policy; });
    invalid("reject_wrong_policy_schema", "E_POLICY", req => { req.policy.schema = 2; });
    invalid("reject_missing_policy_version", "E_AUTHORITY_GAP", req => { delete req.policy.version; });
    invalid("reject_zero_policy_version", "E_POLICY", req => { req.policy.version = 0; });
    invalid("reject_fractional_policy_version", "E_POLICY", req => { req.policy.version = 1.5; });
    invalid("reject_unsafe_policy_version", "E_POLICY", req => { req.policy.version = Number.MAX_SAFE_INTEGER + 1; });
    invalid("reject_empty_policy_id", "E_INPUT", req => { req.policy.id = ""; });
    invalid("reject_overlong_policy_id", "E_INPUT", req => { req.policy.id = "P".repeat(257); });
    invalid("reject_missing_policy_authority", "E_AUTHORITY_GAP", req => { delete req.policy.authority; });
    invalid("reject_non_object_policy_authority", "E_INPUT", req => { req.policy.authority = 7; });
    invalid("reject_unknown_reserved_policy_field", "E_INPUT", req => { req.policy.toString = "TEST_EXTRA"; });
    invalid("reject_missing_allowed_statuses", "E_AUTHORITY_GAP", req => { delete req.policy.allowedStatuses; });
    invalid("reject_non_array_allowed_statuses", "E_INPUT", req => { req.policy.allowedStatuses = {}; });
    invalid("reject_none_in_allowed_statuses", "E_POLICY", req => { req.policy.allowedStatuses.push("NONE"); });
    invalid("reject_duplicate_allowed_status", "E_DUPLICATE", req => { req.policy.allowedStatuses.push("MILITIA"); });
    invalid("reject_unknown_allowed_status", "E_INPUT", req => { req.policy.allowedStatuses.push("LEVY"); });
    invalid("reject_missing_candidate_priorities", "E_AUTHORITY_GAP", req => { delete req.policy.candidatePriorities; });
    invalid("reject_non_array_candidate_priorities", "E_INPUT", req => { req.policy.candidatePriorities = {}; });
    invalid("reject_missing_candidate_order", "E_AUTHORITY_GAP", req => { req.policy.candidatePriorities.pop(); });
    invalid("reject_non_id_candidate_reference", "E_INPUT", req => { req.policy.candidatePriorities[0].personId = "104"; });
    invalid("reject_unknown_candidate_reference", "E_REFERENCE", req => { req.policy.candidatePriorities[0].personId = 999; });
    invalid("reject_duplicate_candidate_reference", "E_DUPLICATE", req => { req.policy.candidatePriorities[1].personId = req.policy.candidatePriorities[0].personId; });
    invalid("reject_missing_candidate_priority", "E_AUTHORITY_GAP", req => { delete req.policy.candidatePriorities[0].priority; });
    invalid("reject_fractional_candidate_priority", "E_INPUT", req => { req.policy.candidatePriorities[0].priority = 0.5; });
    invalid("reject_missing_candidate_tie_break", "E_AUTHORITY_GAP", req => { delete req.policy.candidatePriorities[0].tieBreak; });
    invalid("reject_negative_candidate_tie_break", "E_INPUT", req => { req.policy.candidatePriorities[0].tieBreak = -1; });
    invalid("reject_fractional_candidate_tie_break", "E_INPUT", req => { req.policy.candidatePriorities[0].tieBreak = 0.5; });
    invalid("ambiguous_candidate_tie_rejected", "E_NONDETERMINISTIC_TIE", req => {
        req.policy.candidatePriorities[1].priority = req.policy.candidatePriorities[0].priority;
        req.policy.candidatePriorities[1].tieBreak = req.policy.candidatePriorities[0].tieBreak;
    });
    invalid("reject_missing_post_requirements", "E_AUTHORITY_GAP", req => { delete req.policy.postRequirements; });
    invalid("reject_non_array_post_requirements", "E_INPUT", req => { req.policy.postRequirements = {}; });
    invalid("reject_missing_post_requirement", "E_AUTHORITY_GAP", req => { req.policy.postRequirements.pop(); });
    invalid("reject_non_id_requirement_post", "E_INPUT", req => { req.policy.postRequirements[0].postId = "201"; });
    invalid("reject_unknown_requirement_post", "E_REFERENCE", req => { req.policy.postRequirements[0].postId = 999; });
    invalid("reject_duplicate_requirement_post", "E_DUPLICATE", req => { req.policy.postRequirements[1].postId = req.policy.postRequirements[0].postId; });
    invalid("reject_missing_requested_count", "E_AUTHORITY_GAP", req => { delete req.policy.postRequirements[0].requested; });
    invalid("reject_negative_requested_count", "E_INPUT", req => { req.policy.postRequirements[0].requested = -1; });
    invalid("reject_fractional_requested_count", "E_INPUT", req => { req.policy.postRequirements[0].requested = 1.25; });
    invalid("reject_nonfinite_requested_count", "E_DATA", req => { req.policy.postRequirements[0].requested = NaN; });
    invalid("reject_unsafe_requested_count", "E_INPUT", req => { req.policy.postRequirements[0].requested = Number.MAX_SAFE_INTEGER + 1; });
    invalid("reject_unsafe_aggregate_requested_count", "E_POLICY", req => {
        req.policy.postRequirements[0].requested = Number.MAX_SAFE_INTEGER;
        req.policy.postRequirements[1].requested = 1;
    });
    invalid("reject_missing_post_priority", "E_AUTHORITY_GAP", req => { delete req.policy.postRequirements[0].priority; });
    invalid("reject_negative_post_priority", "E_INPUT", req => { req.policy.postRequirements[0].priority = -1; });
    invalid("reject_fractional_post_priority", "E_INPUT", req => { req.policy.postRequirements[0].priority = 0.5; });
    invalid("reject_missing_post_tie_break", "E_AUTHORITY_GAP", req => { delete req.policy.postRequirements[0].tieBreak; });
    invalid("reject_negative_post_tie_break", "E_INPUT", req => { req.policy.postRequirements[0].tieBreak = -1; });
    invalid("reject_fractional_post_tie_break", "E_INPUT", req => { req.policy.postRequirements[0].tieBreak = 0.5; });
    invalid("ambiguous_post_tie_rejected", "E_NONDETERMINISTIC_TIE", req => {
        req.policy.postRequirements[1].priority = req.policy.postRequirements[0].priority;
        req.policy.postRequirements[1].tieBreak = req.policy.postRequirements[0].tieBreak;
    });
    invalid("reject_sparse_arrays", "E_DATA", req => { const sparse = new Array(2); sparse[1] = req.people[0]; req.people = sparse; });
    invalid("reject_array_extra_properties", "E_DATA", req => { req.people.extra = "TEST_EXTRA"; });
    invalid("reject_non_enumerable_array_entries", "E_DATA", req => {
        Object.defineProperty(req.people, "0", { value: req.people[0], enumerable: false, writable: true, configurable: true });
    });
    invalid("reject_non_enumerable_record_fields", "E_DATA", req => {
        Object.defineProperty(req.threat.source, "hidden", { value: 1, enumerable: false, writable: true, configurable: true });
    });
    invalid("reject_cyclic_data", "E_DATA", req => { req.threat.source.loop = req.threat.source; });
    invalid("reject_function_data", "E_DATA", req => { req.threat.source.callback = function() {}; });
    invalid("reject_symbol_keys", "E_DATA", req => { req.threat.source[Symbol("hidden")] = 1; });
    check("reject_getters_without_invoking_them", () => {
        const req = baseRequest();
        let reads = 0;
        Object.defineProperty(req.threat.source, "hidden", { enumerable: true, get() { reads++; return 1; } });
        const outcome = throwsCode(() => mod.planMobilization(req), "E_DATA");
        return result(outcome.pass && reads === 0, `${outcome.message}; getter reads ${reads}`);
    });
    check("reject_array_getters_without_invoking_them", () => {
        const req = baseRequest();
        let reads = 0;
        Object.defineProperty(req.people, "0", { enumerable: true, configurable: true, get() { reads++; return person(999); } });
        const outcome = throwsCode(() => mod.planMobilization(req), "E_DATA");
        const validated = mod.validateRequest(req);
        return result(outcome.pass && !validated.ok && validated.errors[0].code === "E_DATA" && reads === 0,
            `${outcome.message}; validateRequest=${stable(validated)}; getter reads ${reads}`);
    });
    check("reject_inherited_to_string_tag_without_invoking_it", () => {
        const req = baseRequest();
        let reads = 0;
        const prototype = {};
        Object.defineProperty(prototype, "constructor", { value: Object, enumerable: true });
        Object.defineProperty(prototype, Symbol.toStringTag, { get() { reads++; return "Object"; } });
        const source = Object.create(prototype);
        source.eventId = 401;
        req.threat.source = source;
        const outcome = throwsCode(() => mod.planMobilization(req), "E_DATA");
        return result(outcome.pass && reads === 0, `${outcome.message}; inherited getter reads ${reads}`);
    });
    check("reject_non_plain_records", () => {
        class Source { constructor() { this.eventId = 401; } }
        const req = baseRequest();
        req.threat.source = new Source();
        const outcome = throwsCode(() => mod.planMobilization(req), "E_DATA");
        return result(outcome.pass, outcome.message);
    });
    check("reject_excessive_plain_data_depth", () => {
        const req = baseRequest();
        let cursor = req.threat.source;
        for (let i = 0; i < 140; i++) {
            cursor.next = {};
            cursor = cursor.next;
        }
        const outcome = throwsCode(() => mod.planMobilization(req), "E_DATA");
        return result(outcome.pass, outcome.message);
    });
    check("accepted_depth_boundary_roundtrips", () => {
        const req = populationRequest(1, 1);
        let source = { leaf: 1 };
        for (let i = 0; i < 123; i++) source = { next: source };
        req.people[0].eligibility.source = source;
        const requestCheck = mod.validateRequest(req);
        const plan = mod.planMobilization(req);
        const planCheck = mod.validatePlan(req, plan);
        let serialized = false;
        try { serialized = typeof mod.canonicalStringify(plan) === "string"; }
        catch (_) { serialized = false; }
        return result(requestCheck.ok && plan.assignments.length === 1 && planCheck.ok && serialized,
            `request=${requestCheck.ok}; plan=${planCheck.ok}; serialized=${serialized}`);
    });

    return checks;
}

function applyEdits(source, edits) {
    let changed = source;
    for (const [from, to] of edits) {
        const hits = changed.split(from).length - 1;
        if (hits !== 1) throw new Error(`mutant anchor found ${hits} times: ${from.slice(0, 100)}`);
        changed = changed.replace(from, () => to);
    }
    return changed;
}

const MUTANTS = [
    {
        name: "fixed_half_population_ratio",
        kills: ["ratio_demand_seven_of_eight"],
        edits: [["        var need = requirement.requested;", "        var need = Math.min(requirement.requested, Math.floor(normalized.people.length / 2));"]]
    },
    {
        name: "fixed_ten_percent_population_ratio",
        kills: ["ratio_same_population_tracks_demand"],
        edits: [["        var need = requirement.requested;", "        var need = Math.min(requirement.requested, Math.ceil(normalized.people.length / 10));"]]
    },
    {
        name: "population_threshold_blocks_small_factions",
        kills: ["ratio_one_of_one"],
        edits: [["        var need = requirement.requested;", "        var need = normalized.people.length >= 10 ? requirement.requested : 0;"]]
    },
    {
        name: "ignore_explicit_demand",
        kills: ["zero_demand_mobilizes_nobody", "ratio_same_population_tracks_demand"],
        edits: [["        var limit = Math.min(need, post.capacity);", "        var limit = post.capacity;"]]
    },
    {
        name: "ignore_post_capacity",
        kills: ["capacity_never_overassigned"],
        edits: [["        var limit = Math.min(need, post.capacity);", "        var limit = need;"]]
    },
    {
        name: "assign_dead_people",
        kills: ["dead_person_refused"],
        edits: [["    return person.alive && person.eligibility.eligible && isStatusAuthorized(person, policy) &&", "    return person.eligibility.eligible && isStatusAuthorized(person, policy) &&"]]
    },
    {
        name: "assign_ineligible_people",
        kills: ["ineligible_person_refused"],
        edits: [["    return person.alive && person.eligibility.eligible && isStatusAuthorized(person, policy) &&", "    return person.alive && isStatusAuthorized(person, policy) &&"]]
    },
    {
        name: "infer_authorization_from_fighter_class",
        kills: ["identity_axes_do_not_authorize"],
        edits: [["    return person.serviceStatus !== \"NONE\" && policy.allowedStatuses.indexOf(person.serviceStatus) >= 0;", "    return person.serviceStatus !== \"NONE\" && (policy.allowedStatuses.indexOf(person.serviceStatus) >= 0 || person.identity.class.id === \"srd:class:fighter\");"]]
    },
    {
        name: "ignore_post_compatibility",
        kills: ["post_compatibility_respected"],
        edits: [["        person.eligiblePostIds.indexOf(postId) >= 0 && !has(assigned, String(person.id));", "        !has(assigned, String(person.id));"]]
    },
    {
        name: "assign_one_person_twice",
        kills: ["one_person_one_post"],
        edits: [["        person.eligiblePostIds.indexOf(postId) >= 0 && !has(assigned, String(person.id));", "        person.eligiblePostIds.indexOf(postId) >= 0;"]]
    },
    {
        name: "drop_all_displacement_evidence",
        kills: ["displacement_exact_provenance", "professional_displacement_preserved"],
        edits: [["            if (person.currentDuty !== null && person.currentDuty.category === \"CIVILIAN_ECONOMIC\") {", "            if (false) {"]]
    },
    {
        name: "drop_professional_displacement_evidence",
        kills: ["professional_displacement_preserved"],
        edits: [["            if (person.currentDuty !== null && person.currentDuty.category === \"CIVILIAN_ECONOMIC\") {", "            if (person.currentDuty !== null && person.currentDuty.category === \"CIVILIAN_ECONOMIC\" && person.serviceStatus !== \"PROFESSIONAL\") {"]]
    },
    {
        name: "truncate_duty_provenance",
        kills: ["displacement_exact_provenance"],
        edits: [["    return person.currentDuty === null ? null : cloneData(person.currentDuty);", "    return person.currentDuty === null ? null : { id: person.currentDuty.id, kind: person.currentDuty.kind, category: person.currentDuty.category, provenance: {} };"]]
    },
    {
        name: "alias_caller_duty",
        kills: ["output_duty_is_detached"],
        edits: [
            ["    var raw = copyPlainData(request, \"$\", [], MAX_REQUEST_DATA_DEPTH);", "    var raw = request;"],
            ["    return person.currentDuty === null ? null : cloneData(person.currentDuty);", "    return person.currentDuty;"]
        ]
    },
    {
        name: "sort_caller_input_in_place",
        kills: ["frozen_input_supported", "input_not_mutated"],
        edits: [["    var raw = copyPlainData(request, \"$\", [], MAX_REQUEST_DATA_DEPTH);", "    var raw = request;"]]
    },
    {
        name: "use_incidental_input_order",
        kills: ["permuted_inputs_same_plan"],
        edits: [["function comparePriority(left, right) {\n    if (left.priority !== right.priority) return left.priority - right.priority;\n    return left.tieBreak - right.tieBreak;\n}", "function comparePriority(left, right) {\n    return 0;\n}"]]
    },
    {
        name: "ignore_post_priority",
        kills: ["post_priority_controls_allocation", "post_tie_break_controls_allocation"],
        edits: [["    raw.policy.postRequirements.sort(comparePriority);", "    raw.policy.postRequirements.sort(function(left, right) { return left.postId - right.postId; });"]]
    },
    {
        name: "accept_ambiguous_candidate_ties",
        kills: ["ambiguous_candidate_tie_rejected"],
        edits: [["            fail(\"E_NONDETERMINISTIC_TIE\", path + \"[\" + i + \"]\", \"priority/tieBreak pair \" + pair + \" is not unique\");", "            pairs[pair] = true;"]]
    },
    {
        name: "accept_wrong_request_schema",
        kills: ["reject_wrong_request_schema"],
        edits: [["    if (raw.schema !== REQUEST_SCHEMA) fail(\"E_INPUT\", \"$.schema\", \"must be \" + REQUEST_SCHEMA);", "    if (false) fail(\"E_INPUT\", \"$.schema\", \"must be \" + REQUEST_SCHEMA);"]]
    },
    {
        name: "accept_wrong_policy_schema",
        kills: ["reject_wrong_policy_schema"],
        edits: [["    if (raw.policy.schema !== 1) fail(\"E_POLICY\", \"$.policy.schema\", \"must be 1\");", "    if (false) fail(\"E_POLICY\", \"$.policy.schema\", \"must be 1\");"]]
    },
    {
        name: "accept_invalid_policy_version",
        kills: ["reject_zero_policy_version", "reject_fractional_policy_version"],
        edits: [["    if (!Number.isSafeInteger(raw.policy.version) || raw.policy.version < 1) fail(\"E_POLICY\", \"$.policy.version\", \"must be a positive safe integer\");", "    if (false) fail(\"E_POLICY\", \"$.policy.version\", \"must be a positive safe integer\");"]]
    },
    {
        name: "accept_invalid_tie_break",
        kills: ["reject_negative_candidate_tie_break", "reject_negative_post_tie_break"],
        edits: [["        requireCount(rows[i].tieBreak, path + \"[\" + i + \"].tieBreak\");", "        if (false) requireCount(rows[i].tieBreak, path + \"[\" + i + \"].tieBreak\");"]]
    },
    {
        name: "coerce_invalid_post_priority",
        kills: ["reject_negative_post_priority", "reject_fractional_post_priority"],
        edits: [["    assertTotalOrder(raw.policy.postRequirements, \"$.policy.postRequirements\");", "    for (p = 0; p < raw.policy.postRequirements.length; p++) {\n        if (!Number.isSafeInteger(raw.policy.postRequirements[p].priority) || raw.policy.postRequirements[p].priority < 0) raw.policy.postRequirements[p].priority = 0;\n    }\n    assertTotalOrder(raw.policy.postRequirements, \"$.policy.postRequirements\");"]]
    },
    {
        name: "accept_invalid_text",
        kills: ["reject_empty_threat_key", "reject_empty_policy_id", "reject_empty_eligibility_reason", "reject_empty_duty_kind"],
        edits: [["    if (typeof value !== \"string\" || value.length < 1 || value.length > MAX_TEXT) {", "    if (false) {"]]
    },
    {
        name: "default_missing_post_source",
        kills: ["reject_missing_post_source"],
        edits: [
            ["        exactKeys(post, postPath, [\"id\", \"factionId\", \"kind\", \"capacity\", \"source\"], []);", "        exactKeys(post, postPath, [\"id\", \"factionId\", \"kind\", \"capacity\"], [\"source\"]);"],
            ["        requireObject(post.source, postPath + \".source\");", "        if (!has(post, \"source\")) post.source = {};"]
        ]
    },
    {
        name: "default_missing_post_requirement_policy",
        kills: ["reject_missing_requested_count", "reject_missing_post_priority"],
        edits: [
            ["        exactKeys(requirement, requirementPath, [\"postId\", \"requested\", \"priority\", \"tieBreak\"], []);", "        exactKeys(requirement, requirementPath, [\"postId\", \"tieBreak\"], [\"requested\", \"priority\"]);"],
            ["        requireCount(requirement.requested, requirementPath + \".requested\");", "        if (!has(requirement, \"requested\")) requirement.requested = 0;\n        if (!has(requirement, \"priority\")) requirement.priority = 0;\n        requireCount(requirement.requested, requirementPath + \".requested\");"]
        ]
    },
    {
        name: "unsafe_proto_property_copy",
        kills: ["proto_named_provenance_is_preserved"],
        edits: [["        Object.defineProperty(copy, name, {\n            value: copyPlainData(descriptor.value, path + \".\" + name, seen, maxDepth),\n            enumerable: true,\n            writable: true,\n            configurable: true\n        });", "        copy[name] = copyPlainData(descriptor.value, path + \".\" + name, seen, maxDepth);"]]
    },
    {
        name: "skip_aggregate_capacity_guard",
        kills: ["reject_unsafe_aggregate_capacity"],
        edits: [["        aggregateCapacity = safeAdd(aggregateCapacity, raw.posts[p].capacity, \"E_INPUT\", \"$.posts\");", "        aggregateCapacity += raw.posts[p].capacity;"]]
    },
    {
        name: "skip_aggregate_demand_guard",
        kills: ["reject_unsafe_aggregate_requested_count"],
        edits: [["        aggregateRequested = safeAdd(aggregateRequested, raw.policy.postRequirements[p].requested, \"E_POLICY\", \"$.policy.postRequirements\");", "        aggregateRequested += raw.policy.postRequirements[p].requested;"]]
    },
    {
        name: "erase_order_audit_capacity",
        kills: ["order_audit_preserves_decisive_inputs"],
        edits: [["                    postCapacity: post.capacity,", "                    postCapacity: null,"]]
    },
    {
        name: "wrong_defense_duty_type",
        kills: ["wall_order_uses_wall_duty"],
        edits: [["                duty: { type: post.kind === \"GATE\" ? \"DEFEND_GATE\" : \"DEFEND_WALL\", postId: post.id },", "                duty: { type: \"DEFEND_GATE\", postId: post.id },"]]
    },
    {
        name: "corrupt_assignment_post_kind",
        kills: ["assignment_records_are_exact"],
        edits: [["            var assignment = {\n                orderId: orderId,\n                personId: person.id,\n                postId: post.id,\n                postKind: post.kind\n            };", "            var assignment = {\n                orderId: orderId,\n                personId: person.id,\n                postId: post.id,\n                postKind: \"TEST_WRONG\"\n            };"]]
    },
    {
        name: "corrupt_order_post_id",
        kills: ["order_links_are_coherent"],
        edits: [["                policyId: normalized.policy.id,\n                personId: person.id,\n                postId: post.id,\n                postKind: post.kind,", "                policyId: normalized.policy.id,\n                personId: person.id,\n                postId: 999999,\n                postKind: post.kind,"]]
    },
    {
        name: "erase_threat_source",
        kills: ["plan_context_preserves_threat_and_policy_authority"],
        edits: [["        threat: cloneData(normalized.threat),", "        threat: { id: normalized.threat.id, factionId: normalized.threat.factionId, key: normalized.threat.key, source: {} },"]]
    },
    {
        name: "miscount_refusals",
        kills: ["summary_accounts_every_person"],
        edits: [["            refused: refusals.length,", "            refused: 0,"]]
    },
    {
        name: "corrupt_refusal_alive_audit",
        kills: ["dead_refusal_audit_is_exact"],
        edits: [["            serviceStatus: person.serviceStatus,\n            alive: person.alive,", "            serviceStatus: person.serviceStatus,\n            alive: true,"]]
    },
    {
        name: "corrupt_unfilled_accounting",
        kills: ["unfilled_post_records_are_exact"],
        edits: [["                requested: requirement.requested,\n                capacity: post.capacity,\n                assigned: filled,", "                requested: 999999,\n                capacity: 999999,\n                assigned: 999999,"]]
    },
    {
        name: "corrupt_summary_audit_counts",
        kills: ["summary_record_is_exact"],
        edits: [
            ["            availableCapacity: totalCapacity,", "            availableCapacity: 999999,"],
            ["            displacedCivilianDuties: displaced.length", "            displacedCivilianDuties: 999999"]
        ]
    },
    {
        name: "double_count_people_shortfall",
        kills: ["unfilled_reasons_partition_shortfall"],
        edits: [["            var peopleShortfall = unfilled - capacityShortfall;", "            var peopleShortfall = unfilled;"]]
    },
    {
        name: "mislabel_capacity_refusal",
        kills: ["capacity_refusal_is_explicit"],
        edits: [["            else if (capacityBlocked) reason = \"POST_CAPACITY_EXHAUSTED\";", "            else if (capacityBlocked) reason = \"DEMAND_SATISFIED\";"]]
    },
    {
        name: "skip_object_shape_guard",
        kills: ["reject_non_object_threat_source", "reject_non_object_eligibility_source", "reject_non_object_duty_provenance", "reject_non_object_post_source", "reject_non_object_policy_authority"],
        edits: [["    if (!isPlainObject(value)) fail(\"E_INPUT\", path, \"must be an object\");", "    if (false) fail(\"E_INPUT\", path, \"must be an object\");"]]
    },
    {
        name: "skip_candidate_priority_array_guard",
        kills: ["reject_non_array_candidate_priorities"],
        edits: [["    requireArray(raw.policy.candidatePriorities, \"$.policy.candidatePriorities\");", "    if (false) requireArray(raw.policy.candidatePriorities, \"$.policy.candidatePriorities\");"]]
    },
    {
        name: "skip_post_requirement_array_guard",
        kills: ["reject_non_array_post_requirements"],
        edits: [["    requireArray(raw.policy.postRequirements, \"$.policy.postRequirements\");", "    if (false) requireArray(raw.policy.postRequirements, \"$.policy.postRequirements\");"]]
    },
    {
        name: "skip_eligible_post_id_guard",
        kills: ["reject_non_id_eligible_post"],
        edits: [["            requirePositiveId(eligiblePostId, personPath + \".eligiblePostIds[\" + e + \"]\");", "            if (false) requirePositiveId(eligiblePostId, personPath + \".eligiblePostIds[\" + e + \"]\");"]]
    },
    {
        name: "skip_candidate_person_id_guard",
        kills: ["reject_non_id_candidate_reference"],
        edits: [["        requirePositiveId(candidate.personId, candidatePath + \".personId\");", "        if (false) requirePositiveId(candidate.personId, candidatePath + \".personId\");"]]
    },
    {
        name: "skip_requirement_post_id_guard",
        kills: ["reject_non_id_requirement_post"],
        edits: [["        requirePositiveId(requirement.postId, requirementPath + \".postId\");", "        if (false) requirePositiveId(requirement.postId, requirementPath + \".postId\");"]]
    },
    {
        name: "default_missing_post_kind",
        kills: ["reject_missing_post_kind"],
        edits: [
            ["        exactKeys(post, postPath, [\"id\", \"factionId\", \"kind\", \"capacity\", \"source\"], []);", "        exactKeys(post, postPath, [\"id\", \"factionId\", \"capacity\", \"source\"], [\"kind\"]);"],
            ["        requireOneOf(post.kind, POST_KINDS, postPath + \".kind\");", "        if (!has(post, \"kind\")) post.kind = \"GATE\";\n        requireOneOf(post.kind, POST_KINDS, postPath + \".kind\");"]
        ]
    },
    {
        name: "default_missing_eligibility_decision",
        kills: ["reject_missing_eligibility_decision"],
        edits: [
            ["        exactKeys(person.eligibility, personPath + \".eligibility\", [\"eligible\", \"reason\", \"source\"], []);", "        exactKeys(person.eligibility, personPath + \".eligibility\", [\"reason\", \"source\"], [\"eligible\"]);"],
            ["        requireBoolean(person.eligibility.eligible, personPath + \".eligibility.eligible\");", "        if (!has(person.eligibility, \"eligible\")) person.eligibility.eligible = true;\n        requireBoolean(person.eligibility.eligible, personPath + \".eligibility.eligible\");"]
        ]
    },
    {
        name: "default_missing_alive_to_true",
        kills: ["reject_missing_alive_status"],
        edits: [
            ["        exactKeys(person, personPath, [\"id\", \"factionId\", \"alive\", \"eligibility\", \"serviceStatus\", \"eligiblePostIds\", \"identity\", \"currentDuty\"], []);", "        exactKeys(person, personPath, [\"id\", \"factionId\", \"eligibility\", \"serviceStatus\", \"eligiblePostIds\", \"identity\", \"currentDuty\"], [\"alive\"]);"],
            ["        requireBoolean(person.alive, personPath + \".alive\");", "        if (!has(person, \"alive\")) person.alive = true;\n        requireBoolean(person.alive, personPath + \".alive\");"]
        ]
    },
    {
        name: "default_missing_post_eligibility",
        kills: ["reject_missing_post_eligibility"],
        edits: [
            ["        exactKeys(person, personPath, [\"id\", \"factionId\", \"alive\", \"eligibility\", \"serviceStatus\", \"eligiblePostIds\", \"identity\", \"currentDuty\"], []);", "        exactKeys(person, personPath, [\"id\", \"factionId\", \"alive\", \"eligibility\", \"serviceStatus\", \"identity\", \"currentDuty\"], [\"eligiblePostIds\"]);"],
            ["        requireArray(person.eligiblePostIds, personPath + \".eligiblePostIds\");", "        if (!has(person, \"eligiblePostIds\")) person.eligiblePostIds = raw.posts.map(function(row) { return row.id; });\n        requireArray(person.eligiblePostIds, personPath + \".eligiblePostIds\");"]
        ]
    },
    {
        name: "default_missing_current_duty_to_null",
        kills: ["reject_missing_current_duty_evidence"],
        edits: [
            ["        exactKeys(person, personPath, [\"id\", \"factionId\", \"alive\", \"eligibility\", \"serviceStatus\", \"eligiblePostIds\", \"identity\", \"currentDuty\"], []);", "        exactKeys(person, personPath, [\"id\", \"factionId\", \"alive\", \"eligibility\", \"serviceStatus\", \"eligiblePostIds\", \"identity\"], [\"currentDuty\"]);"],
            ["        assertCurrentDuty(person.currentDuty, personPath + \".currentDuty\");", "        if (!has(person, \"currentDuty\")) person.currentDuty = null;\n        assertCurrentDuty(person.currentDuty, personPath + \".currentDuty\");"]
        ]
    },
    {
        name: "default_missing_duty_category",
        kills: ["reject_missing_duty_category"],
        edits: [
            ["    var required = [\"id\", \"kind\", \"category\", \"provenance\"];", "    var required = [\"id\", \"kind\", \"provenance\"];"],
            ["    requireOneOf(duty.category, DUTY_CATEGORIES, path + \".category\");", "    if (!has(duty, \"category\")) duty.category = \"NON_ECONOMIC\";\n    requireOneOf(duty.category, DUTY_CATEGORIES, path + \".category\");"]
        ]
    },
    {
        name: "default_missing_allowed_statuses",
        kills: ["reject_missing_allowed_statuses"],
        edits: [
            ["    exactKeys(raw.policy, \"$.policy\", [\"schema\", \"id\", \"version\", \"threatKey\", \"authority\", \"allowedStatuses\", \"candidatePriorities\", \"postRequirements\"], []);", "    exactKeys(raw.policy, \"$.policy\", [\"schema\", \"id\", \"version\", \"threatKey\", \"authority\", \"candidatePriorities\", \"postRequirements\"], [\"allowedStatuses\"]);"],
            ["    requireArray(raw.policy.allowedStatuses, \"$.policy.allowedStatuses\");", "    if (!has(raw.policy, \"allowedStatuses\")) raw.policy.allowedStatuses = [\"MILITIA\"];\n    requireArray(raw.policy.allowedStatuses, \"$.policy.allowedStatuses\");"]
        ]
    },
    {
        name: "default_missing_candidate_priorities",
        kills: ["reject_missing_candidate_priorities"],
        edits: [
            ["    exactKeys(raw.policy, \"$.policy\", [\"schema\", \"id\", \"version\", \"threatKey\", \"authority\", \"allowedStatuses\", \"candidatePriorities\", \"postRequirements\"], []);", "    exactKeys(raw.policy, \"$.policy\", [\"schema\", \"id\", \"version\", \"threatKey\", \"authority\", \"allowedStatuses\", \"postRequirements\"], [\"candidatePriorities\"]);"],
            ["    requireArray(raw.policy.candidatePriorities, \"$.policy.candidatePriorities\");", "    if (!has(raw.policy, \"candidatePriorities\")) raw.policy.candidatePriorities = raw.people.map(function(row, index) { return { personId: row.id, priority: 0, tieBreak: index }; });\n    requireArray(raw.policy.candidatePriorities, \"$.policy.candidatePriorities\");"]
        ]
    },
    {
        name: "default_missing_post_requirements",
        kills: ["reject_missing_post_requirements"],
        edits: [
            ["    exactKeys(raw.policy, \"$.policy\", [\"schema\", \"id\", \"version\", \"threatKey\", \"authority\", \"allowedStatuses\", \"candidatePriorities\", \"postRequirements\"], []);", "    exactKeys(raw.policy, \"$.policy\", [\"schema\", \"id\", \"version\", \"threatKey\", \"authority\", \"allowedStatuses\", \"candidatePriorities\"], [\"postRequirements\"]);"],
            ["    requireArray(raw.policy.postRequirements, \"$.policy.postRequirements\");", "    if (!has(raw.policy, \"postRequirements\")) raw.policy.postRequirements = raw.posts.map(function(row, index) { return { postId: row.id, requested: 0, priority: 0, tieBreak: index }; });\n    requireArray(raw.policy.postRequirements, \"$.policy.postRequirements\");"]
        ]
    },
    {
        name: "allow_array_extra_properties",
        kills: ["reject_array_extra_properties"],
        edits: [["            if (!/^(0|[1-9][0-9]*)$/.test(arrayName) || Number(arrayName) >= value.length) {", "            if (false) {"]]
    },
    {
        name: "skip_array_entry_descriptor_guard",
        kills: ["reject_non_enumerable_array_entries", "reject_array_getters_without_invoking_them"],
        edits: [["            if (!arrayDescriptor || !has(arrayDescriptor, \"value\") || !arrayDescriptor.enumerable) {", "            if (false) {"]]
    },
    {
        name: "skip_record_descriptor_guard",
        kills: ["reject_non_enumerable_record_fields"],
        edits: [["        if (!descriptor || !has(descriptor, \"value\") || !descriptor.enumerable) {", "        if (false) {"]]
    },
    {
        name: "skip_unknown_person_plan_guard",
        kills: ["corrupt_unknown_person_rejected_by_guard"],
        edits: [["            if (!has(people, personKey)) problem(\"$.assignments[\" + i + \"].personId\", \"references unknown person\");", "            if (false) problem(\"$.assignments[\" + i + \"].personId\", \"references unknown person\");"]]
    },
    {
        name: "skip_unknown_post_plan_guard",
        kills: ["corrupt_nonexistent_post_rejected"],
        edits: [["            if (!has(posts, postKey)) problem(\"$.assignments[\" + i + \"].postId\", \"references unknown post\");", "            if (false) problem(\"$.assignments[\" + i + \"].postId\", \"references unknown post\");"]]
    },
    {
        name: "skip_over_demand_plan_guard",
        kills: ["corrupt_over_demand_plan_rejected"],
        edits: [["            if (has(requirements, postKey) && postCounts[postKey] > requirements[postKey].requested) problem(\"$.assignments[\" + i + \"]\", \"policy demand is exceeded\");", "            if (false) problem(\"$.assignments[\" + i + \"]\", \"policy demand is exceeded\");"]]
    },
    {
        name: "skip_duplicate_order_plan_guard",
        kills: ["corrupt_duplicate_order_id_rejected"],
        edits: [["            if (has(assignedOrders, assignment.orderId)) problem(\"$.assignments[\" + i + \"].orderId\", \"order ID is duplicated\");", "            if (false) problem(\"$.assignments[\" + i + \"].orderId\", \"order ID is duplicated\");"]]
    },
    {
        name: "skip_assignment_availability_plan_guard",
        kills: ["corrupt_unavailable_assignment_rejected"],
        edits: [["            if (!isPersonAvailable(person, normalized.policy, posts[postKey].id, {})) problem(\"$.assignments[\" + i + \"]\", \"assigned person is dead, ineligible, unauthorized or incompatible\");", "            if (false) problem(\"$.assignments[\" + i + \"]\", \"assigned person is dead, ineligible, unauthorized or incompatible\");"]]
    },
    {
        name: "skip_order_count_plan_guard",
        kills: ["corrupt_order_count_rejected"],
        edits: [["    if (plan.orders.length !== plan.assignments.length) problem(\"$.orders\", \"must have exactly one order per assignment\");", "    if (false) problem(\"$.orders\", \"must have exactly one order per assignment\");"]]
    },
    {
        name: "skip_unassigned_displacement_plan_guard",
        kills: ["corrupt_unassigned_displacement_rejected"],
        edits: [["        if (!has(assignedPeople, displacementKey)) problem(\"$.displacedCivilianDuties[\" + i + \"]\", \"must reference an assigned person\");", "        if (false) problem(\"$.displacedCivilianDuties[\" + i + \"]\", \"must reference an assigned person\");"]]
    },
    {
        name: "corrupt_output_plan_schema",
        kills: ["plan_schema_and_status_are_exact"],
        edits: [["        schema: PLAN_SCHEMA,\n        status: \"PLANNED\",", "        schema: 999,\n        status: \"PLANNED\","]]
    },
    {
        name: "erase_output_policy_decision_arrays",
        kills: ["policy_context_preserves_complete_decision"],
        edits: [["        policy: cloneData(normalized.policy),", "        policy: (function() {\n            var copiedPolicy = cloneData(normalized.policy);\n            copiedPolicy.allowedStatuses = [];\n            copiedPolicy.candidatePriorities = [];\n            copiedPolicy.postRequirements = [];\n            return copiedPolicy;\n        }()),"]]
    },
    {
        name: "skip_threat_faction_id_guard",
        kills: ["reject_invalid_threat_faction_id"],
        edits: [["    requirePositiveId(raw.threat.factionId, \"$.threat.factionId\");", "    if (false) requirePositiveId(raw.threat.factionId, \"$.threat.factionId\");"]]
    },
    {
        name: "skip_plan_root_object_guard",
        kills: ["non_object_plan_rejected_by_guard"],
        edits: [["    if (!isPlainObject(plan)) return [{ code: \"E_PLAN\", path: \"$\", message: \"plan must be an object\" }];", "    if (false) return [{ code: \"E_PLAN\", path: \"$\", message: \"plan must be an object\" }];"]]
    },
    {
        name: "skip_plan_collection_array_guard",
        kills: ["non_array_plan_collections_rejected_by_guard"],
        edits: [["    if (!Array.isArray(plan.assignments) || !Array.isArray(plan.orders) || !Array.isArray(plan.displacedCivilianDuties)) {", "    if (false) {"]]
    },
    {
        name: "skip_assignment_object_guard",
        kills: ["corrupt_non_object_assignment_rejected"],
        edits: [["        if (!isPlainObject(assignment)) { problem(\"$.assignments[\" + i + \"]\", \"must be an object\"); continue; }", "        if (false) { problem(\"$.assignments[\" + i + \"]\", \"must be an object\"); continue; }"]]
    },
    {
        name: "skip_assignment_scalar_guards",
        kills: ["corrupt_assignment_scalar_fields_rejected"],
        edits: [
            ["        if (!isPositiveId(assignment.personId)) problem(\"$.assignments[\" + i + \"].personId\", \"must be a positive safe integer stable ID\");", "        if (false) problem(\"$.assignments[\" + i + \"].personId\", \"must be a positive safe integer stable ID\");"],
            ["        if (!isPositiveId(assignment.postId)) problem(\"$.assignments[\" + i + \"].postId\", \"must be a positive safe integer stable ID\");", "        if (false) problem(\"$.assignments[\" + i + \"].postId\", \"must be a positive safe integer stable ID\");"],
            ["        if (typeof assignment.orderId !== \"string\" || !assignment.orderId.length) {", "        if (false) {"]
        ]
    },
    {
        name: "skip_displacement_person_id_guard",
        kills: ["corrupt_displacement_person_id_rejected"],
        edits: [["        if (!isPositiveId(displacement.personId)) { problem(\"$.displacedCivilianDuties[\" + i + \"].personId\", \"must be a positive safe integer stable ID\"); continue; }", "        if (false) { problem(\"$.displacedCivilianDuties[\" + i + \"].personId\", \"must be a positive safe integer stable ID\"); continue; }"]]
    },
    {
        name: "skip_displacement_economic_guard",
        kills: ["corrupt_non_economic_displacement_rejected"],
        edits: [["        if (!has(people, displacementKey) || people[displacementKey].currentDuty === null || people[displacementKey].currentDuty.category !== \"CIVILIAN_ECONOMIC\") {", "        if (false) {"]]
    },
    {
        name: "validate_request_always_accepts",
        kills: ["reject_wrong_request_schema", "reject_missing_post_source", "reject_non_array_candidate_priorities"],
        edits: [["        normalizeRequest(request);", "        return { ok: true, errors: [] };"]]
    },
    {
        name: "skip_canonical_plan_comparison",
        kills: ["noncanonical_audit_is_rejected"],
        edits: [["        if (!sameData(copiedPlan, expected)) errors.push({ code: \"E_PLAN\", path: \"$\", message: \"plan is not the canonical result for the supplied request\" });", "        if (false) errors.push({ code: \"E_PLAN\", path: \"$\", message: \"plan is not the canonical result for the supplied request\" });"]]
    },
    {
        name: "trust_inherited_schema_names",
        kills: ["reject_unknown_reserved_top_field", "reject_unknown_reserved_policy_field"],
        edits: [
            ["    var allowed = Object.create(null);", "    var allowed = {};"],
            ["        if (!has(allowed, keys[i])) fail(\"E_INPUT\", path + \".\" + keys[i], \"unknown field\");", "        if (!allowed[keys[i]]) fail(\"E_INPUT\", path + \".\" + keys[i], \"unknown field\");"]
        ]
    },
    {
        name: "invoke_inherited_to_string_tag",
        kills: ["reject_inherited_to_string_tag_without_invoking_it"],
        edits: [["function isPlainObject(value) {\n    if (typeof value !== \"object\" || value === null || Array.isArray(value)) return false;\n    var prototype = Object.getPrototypeOf(value);\n    if (prototype === null) return true;\n    var descriptor = Object.getOwnPropertyDescriptor(prototype, \"constructor\");\n    if (!descriptor || !has(descriptor, \"value\") || typeof descriptor.value !== \"function\") return false;\n    var constructorPrototype = Object.getOwnPropertyDescriptor(descriptor.value, \"prototype\");\n    return !!constructorPrototype && has(constructorPrototype, \"value\") && constructorPrototype.value === prototype &&\n        Function.prototype.toString.call(descriptor.value) === Function.prototype.toString.call(Object);\n}", "function isPlainObject(value) {\n    if (Object.prototype.toString.call(value) !== \"[object Object]\") return false;\n    var prototype = Object.getPrototypeOf(value);\n    if (prototype === null) return true;\n    var descriptor = Object.getOwnPropertyDescriptor(prototype, \"constructor\");\n    return !!descriptor && typeof descriptor.value === \"function\" && descriptor.value.name === \"Object\";\n}"]]
    },
    {
        name: "collapse_plan_depth_headroom",
        kills: ["accepted_depth_boundary_roundtrips"],
        edits: [["var MAX_PLAN_DATA_DEPTH = MAX_REQUEST_DATA_DEPTH + 8;", "var MAX_PLAN_DATA_DEPTH = MAX_REQUEST_DATA_DEPTH;"]]
    }
];

function runMutants(baseChecks) {
    const baseByName = new Map(baseChecks.map(check => [check.name, check]));
    const lines = [];
    const failures = [];
    for (const mutant of MUTANTS) {
        try {
            const source = applyEdits(MODULE_SOURCE, mutant.edits);
            const module = loadModule(source);
            const mutatedChecks = runChecks(module);
            const mutatedByName = new Map(mutatedChecks.map(check => [check.name, check]));
            const badControls = mutant.kills.filter(name => !baseByName.has(name) || !baseByName.get(name).pass);
            const killedBy = mutant.kills.filter(name => mutatedByName.has(name) && !mutatedByName.get(name).pass);
            const missingTargets = mutant.kills.filter(name => !mutatedByName.has(name));
            const pass = badControls.length === 0 && missingTargets.length === 0 && killedBy.length > 0;
            lines.push({ name: `mutant_${mutant.name}`, pass, message: pass ? `killed by ${killedBy.join(", ")}` :
                `controls=${badControls.join(",") || "ok"}; missing=${missingTargets.join(",") || "none"}; killed=${killedBy.join(",") || "none"}` });
            if (!pass) failures.push(mutant.name);
        } catch (error) {
            lines.push({ name: `mutant_${mutant.name}`, pass: false, message: `harness/load failure: ${error.stack || error.message}` });
            failures.push(mutant.name);
        }
    }
    return { checks: lines, failures };
}

function main() {
    console.log("=== SOC.40.02 DETERMINISTIC MILITIA MOBILIZATION ===");
    let module;
    try {
        module = loadModule();
    } catch (error) {
        console.error(`FAIL module_load: ${error.stack || error.message}`);
        console.log("RESULT: 0 passed, 1 failed");
        process.exit(1);
    }

    console.log("\n--- Baseline and targeted negative fixtures ---");
    const checks = runChecks(module);
    let passed = 0;
    let failed = 0;
    for (const check of checks) {
        console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}: ${check.message}`);
        if (check.pass) passed++; else failed++;
    }

    console.log("\n--- Targeted source mutants ---");
    const mutants = runMutants(checks);
    for (const check of mutants.checks) {
        console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}: ${check.message}`);
        if (check.pass) passed++; else failed++;
    }

    console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
    if (failed) process.exit(1);
}

main();
