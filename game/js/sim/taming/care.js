"use strict";
// Care is food plus a Wisdom (Animal Handling) check, one point per later sim hour.
// Neglect is data-driven and off unless the config enables it.

const record = require("./record");

function fail(reason, rec, extra) {
    const out = { ok: false, reason: reason, record: record.copyRecord(rec), progressed: false };
    if (extra) {
        const keys = Object.keys(extra);
        for (let i = 0; i < keys.length; i++) out[keys[i]] = extra[keys[i]];
    }
    return out;
}

function productsFor(cfg, unit) {
    const species = unit && unit.data && unit.data.species;
    const table = cfg && cfg.livestockProductsBySpecies;
    const list = table && species && table[species];
    return Array.isArray(list) ? list.slice() : [];
}

function tend(rules, cfg, actor, target, call) {
    if (!rules || typeof rules.check !== "function" || typeof rules.dc !== "function") return fail("NO_RULES", null);
    const rec = record.recordOf(target);
    if (!rec || (rec.status !== "captive" && rec.status !== "domesticated")) return fail("NOT_CAPTIVE", rec);
    if (!record.sameOwner(actor, target)) return fail("NOT_OWNER", rec);
    const opts = call || {};
    const hour = typeof opts.hour === "number" ? opts.hour : null;

    if (rec.status === "domesticated") {
        if (hour != null) {
            rec.lastTendHour = hour;
            rec.lastCareHour = hour;
        }
        return {
            ok: true,
            reason: "MAINTAINED",
            record: record.copyRecord(rec),
            progressed: false
        };
    }

    const role = opts.role || rec.role;
    if (!record.roleOk(role)) return fail("NO_ROLE", rec);
    if (rec.role && rec.role !== role) return fail("ROLE_LOCKED", rec);
    if (hour != null && rec.lastTendHour != null && hour <= rec.lastTendHour) return fail("ALREADY_TENDED", rec);
    if (!opts.food) return fail("NEEDS_FOOD", rec);

    let dc;
    try {
        dc = rules.dc(cfg.handlingDc);
    } catch (err) {
        if (err && (err.name === "RulesError" || err.name === "DiceError")) return fail(err.code || "RULES", rec);
        throw err;
    }
    let rolled;
    try {
        rolled = rules.check(actor, cfg.ability, dc, {
            rng: opts.rng || (cfg && cfg.rng) || null,
            roll: opts.roll,
            proficient: record.isProficient(actor, cfg.skill),
            skill: cfg.skill
        });
    } catch (err) {
        if (err && (err.name === "RulesError" || err.name === "DiceError")) return fail(err.code || "RULES", rec);
        throw err;
    }
    if (hour != null) rec.lastTendHour = hour;
    if (!rolled || !rolled.ok) {
        return fail("CHECK_FAILED", rec, { check: record.summarizeCheck(rolled) });
    }

    rec.role = role;
    rec.careRequired = cfg.carePoints[role];
    rec.carePoints = (rec.carePoints || 0) + 1;
    rec.hoursCared = (rec.hoursCared || 0) + (cfg.hoursPerCarePoint || 0);
    if (hour != null) rec.lastCareHour = hour;
    if (rec.carePoints >= rec.careRequired) {
        rec.status = "domesticated";
        rec.domesticatedAtHour = hour;
        return {
            ok: true,
            reason: "DOMESTICATED",
            role: role,
            check: record.summarizeCheck(rolled),
            record: record.copyRecord(rec),
            progressed: true
        };
    }
    return {
        ok: true,
        reason: "CARED",
        role: role,
        check: record.summarizeCheck(rolled),
        record: record.copyRecord(rec),
        progressed: true
    };
}

function tickNeglect(cfg, units, hour) {
    const list = units || [];
    const neglect = (cfg && cfg.neglect) || {};
    const out = [];
    for (let i = 0; i < list.length; i++) {
        const unit = list[i];
        const rec = record.recordOf(unit);
        if (!rec || (rec.status !== "captive" && rec.status !== "domesticated")) {
            out.push({ id: unit && unit.id, reverted: false, reason: "WILD" });
            continue;
        }
        if (!neglect.enabled) {
            out.push({ id: unit.id, reverted: false, reason: "DISABLED" });
            continue;
        }
        const elapsed = (typeof hour === "number" ? hour : 0) - (rec.lastCareHour || 0);
        if (elapsed < (neglect.hoursWithoutCare || 0)) {
            out.push({ id: unit.id, reverted: false, reason: "CARED", elapsed: elapsed });
            continue;
        }
        const backToCaptive = neglect.revertsTo === "captive" && rec.status === "domesticated";
        if (backToCaptive) {
            rec.status = "captive";
            rec.role = null;
            rec.carePoints = 0;
            rec.careRequired = null;
            rec.domesticatedAtHour = null;
        } else {
            rec.status = "wild";
            rec.role = null;
            rec.carePoints = 0;
            rec.careRequired = null;
            rec.domesticatedAtHour = null;
        }
        out.push({ id: unit.id, reverted: true, status: rec.status, elapsed: elapsed });
    }
    return out;
}

function domesticRecord(cfg, unit) {
    const rec = record.recordOf(unit);
    if (!rec || rec.status !== "domesticated") return null;
    return {
        domestic: true,
        ownerId: rec.ownerId,
        factionId: rec.factionId,
        species: unit.data && unit.data.species || null,
        role: rec.role,
        breedingEligible: rec.role === "livestock",
        products: rec.role === "livestock" ? productsFor(cfg, unit) : [],
        labour: rec.role === "work",
        hook: "SIM.40.10"
    };
}

function livestockRecord(cfg, unit) {
    const view = domesticRecord(cfg, unit);
    if (!view || view.role !== "livestock") return null;
    return view;
}

function labourHook(unit) {
    const rec = record.recordOf(unit);
    if (!rec || rec.status !== "domesticated" || rec.role !== "work") return null;
    return {
        hauling: true,
        labour: true,
        ownerId: rec.ownerId,
        factionId: rec.factionId,
        species: unit.data && unit.data.species || null,
        hook: "haul"
    };
}

module.exports = {
    tend: tend,
    tickNeglect: tickNeglect,
    domesticRecord: domesticRecord,
    livestockRecord: livestockRecord,
    labourHook: labourHook,
    productsFor: productsFor
};
