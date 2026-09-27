"use strict";
// Capture is a Wisdom (Animal Handling) check against a subdued creature.
// The check goes through UF.Rules. Humanoids are refused (SOC.40.03).

const record = require("./record");

function fail(reason, extra) {
    const out = { ok: false, reason: reason, record: null };
    if (extra) {
        const keys = Object.keys(extra);
        for (let i = 0; i < keys.length; i++) out[keys[i]] = extra[keys[i]];
    }
    return out;
}

function challengeRating(block) {
    const rating = block && block.challenge && block.challenge.rating;
    if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 0) return 0;
    return rating;
}

function isDead(rules, unit) {
    const data = record.dataOf(unit) || {};
    if (data.dead === true || data._isDying === true) return true;
    const hp = data.hp;
    if (typeof hp !== "number" || !Number.isFinite(hp)) return false;
    let max = null;
    if (typeof data.maxHp === "number" && Number.isFinite(data.maxHp)) max = data.maxHp;
    else if (rules && typeof rules.creatureOf === "function" && typeof rules.hitPoints === "function") {
        try {
            const block = rules.creatureOf(unit);
            if (block) max = rules.hitPoints(block).hp;
        } catch (err) {
            max = null;
        }
    }
    return typeof max === "number" && hp <= -max;
}

function isUnconscious(unit) {
    if (record.hasCondition(unit, "unconscious") || record.hasCondition(unit, "incapacitated")) return true;
    const data = record.dataOf(unit) || {};
    return typeof data.hp === "number" && Number.isFinite(data.hp) && data.hp <= 0;
}

function subduedFor(unit, method) {
    const data = record.dataOf(unit) || {};
    if (method === "knockout") return isUnconscious(unit);
    if (method === "restrained") return record.hasCondition(unit, "restrained");
    if (method === "grappled") return record.hasCondition(unit, "grappled") || record.hasCondition(unit, "restrained");
    if (method === "trapped") return data.trapped === true || record.hasCondition(unit, "trapped") || record.hasCondition(unit, "restrained");
    if (method === "subdued") {
        return data.subdued === true
            || record.hasCondition(unit, "grappled")
            || record.hasCondition(unit, "restrained")
            || record.hasCondition(unit, "paralyzed")
            || record.hasCondition(unit, "stunned")
            || record.hasCondition(unit, "petrified")
            || record.hasCondition(unit, "incapacitated")
            || isUnconscious(unit);
    }
    return false;
}

function lookupBlock(rules, unit) {
    try {
        return { block: rules.creatureOf(unit), error: null };
    } catch (err) {
        if (err && (err.name === "RulesError" || err.name === "DiceError")) return { block: null, error: err };
        throw err;
    }
}

function captureDc(rules, cfg, block, method) {
    const name = cfg.captureDc && cfg.captureDc[method];
    if (name == null) return null;
    const base = rules.dc(name);
    const bonus = Math.floor(challengeRating(block) * (cfg.crDcPerPoint || 0));
    return base + bonus;
}

function attemptCapture(rules, cfg, actor, target, method, call) {
    if (!rules || typeof rules.check !== "function" || typeof rules.dc !== "function") return fail("NO_RULES");
    if (!actor || !target) return fail("MISSING");
    const methodName = record.methodKey(method);
    if (!methodName) return fail("BAD_METHOD");
    const types = cfg && cfg.humanoidTypes;
    if (record.isHumanoidUnit(target, rules, types)) return fail("HUMANOID");
    if (isDead(rules, target)) return fail("DEAD");
    if (record.withdrawnFromWild(target)) return fail("ALREADY_HELD");

    const found = lookupBlock(rules, target);
    if (!found.block) return fail("NO_SRD", { detail: found.error && found.error.code });
    if (record.blockIsHumanoid(found.block, types)) return fail("HUMANOID");
    if (isDead(rules, target)) return fail("DEAD");
    if (!subduedFor(target, methodName)) return fail("NOT_SUBDUED", { method: methodName });

    let dc;
    try {
        dc = captureDc(rules, cfg, found.block, methodName);
    } catch (err) {
        if (err && (err.name === "RulesError" || err.name === "DiceError")) return fail(err.code || "RULES");
        throw err;
    }
    if (typeof dc !== "number") return fail("BAD_METHOD");

    const opts = call || {};
    const checkCall = {
        rng: opts.rng || (cfg && cfg.rng) || null,
        roll: opts.roll,
        proficient: record.isProficient(actor, cfg.skill),
        skill: cfg.skill
    };
    try {
        const rolled = rules.check(actor, cfg.ability, dc, checkCall); // AX_SRD_CHECK
        if (!rolled || !rolled.ok) {
            return fail("CHECK_FAILED", { method: methodName, dc: dc, check: record.summarizeCheck(rolled) });
        }
        const hour = typeof opts.hour === "number" ? opts.hour : 0;
        const stored = {
            version: 1,
            status: "captive",
            role: null,
            method: methodName,
            ownerId: actor.id != null ? actor.id : null,
            factionId: record.factionOf(actor),
            carePoints: 0,
            careRequired: null,
            hoursCared: 0,
            lastCareHour: hour,
            lastTendHour: null,
            capturedAtHour: hour,
            domesticatedAtHour: null,
            saddleMark: null,
            speciesId: found.block.id
        };
        if (!target.data || typeof target.data !== "object") target.data = {};
        target.data.taming = stored;
        return {
            ok: true,
            reason: "CAPTURED",
            method: methodName,
            dc: dc,
            check: record.summarizeCheck(rolled),
            record: record.copyRecord(stored)
        };
    } catch (err) {
        if (err && (err.name === "RulesError" || err.name === "DiceError")) {
            return fail(err.code || "RULES", { method: methodName, dc: dc });
        }
        throw err;
    }
}

module.exports = {
    attemptCapture: attemptCapture,
    isDead: isDead,
    isUnconscious: isUnconscious,
    subduedFor: subduedFor,
    captureDc: captureDc
};
