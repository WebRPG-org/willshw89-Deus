"use strict";

const ROLES = require("./defaults").ROLES;

const HUMANOID_KINDS = {
    person: true,
    colonist: true,
    npc: true,
    guard: true,
    human: true,
    humanoid: true,
    merchant: true
};

const METHOD_ALIAS = {
    knockout: "knockout",
    unconscious: "knockout",
    restrained: "restrained",
    grapple: "grappled",
    grappled: "grappled",
    trap: "trapped",
    trapped: "trapped",
    subdue: "subdued",
    subdued: "subdued"
};

function isObj(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function dataOf(unit) {
    return unit && isObj(unit.data) ? unit.data : null;
}

function recordOf(unit) {
    const data = dataOf(unit);
    return data && isObj(data.taming) ? data.taming : null;
}

function copyRecord(rec) {
    if (!rec) return null;
    return JSON.parse(JSON.stringify(rec));
}

function withdrawnFromWild(unit) {
    const rec = recordOf(unit);
    return !!rec && (rec.status === "captive" || rec.status === "domesticated");
}

function factionOf(unit) {
    const data = dataOf(unit);
    if (!data) return null;
    if (data.factionId != null && data.factionId !== "") return data.factionId;
    if (data.faction != null && data.faction !== "") return data.faction;
    return null;
}

function sameOwner(hunter, prey) {
    const rec = recordOf(prey);
    if (!hunter || !rec) return false;
    if (hunter.id != null && rec.ownerId != null && hunter.id === rec.ownerId) return true;
    const fac = factionOf(hunter);
    return fac != null && rec.factionId != null && fac === rec.factionId;
}

// Wild animals may be hunted. An owner's colonist may not hunt that owner's captive or domesticated animal.
function mayHunt(hunter, prey) {
    if (!withdrawnFromWild(prey)) return true;
    return !sameOwner(hunter, prey);
}

function refuseHuntJob(spec, lookup) {
    if (!spec || spec.type !== "hunt" || typeof lookup !== "function") return false;
    const preyId = spec.params && spec.params.unitId;
    const prey = lookup(preyId);
    const hunter = lookup(spec.owner);
    if (!prey || !hunter) return false;
    return mayHunt(hunter, prey) === false;
}

function methodKey(method) {
    if (typeof method !== "string") return null;
    return METHOD_ALIAS[method.toLowerCase()] || null;
}

function conditionsOf(unit) {
    const data = dataOf(unit);
    if (!data) return [];
    const raw = data.conditions;
    const names = [];
    if (Array.isArray(raw)) {
        for (let i = 0; i < raw.length; i++) {
            const cond = raw[i];
            if (typeof cond === "string") names.push(cond.toLowerCase());
            else if (cond && typeof cond.name === "string") names.push(cond.name.toLowerCase());
            else if (cond && typeof cond.id === "string") names.push(String(cond.id).toLowerCase());
        }
    } else if (isObj(raw)) {
        const keys = Object.keys(raw);
        for (let i = 0; i < keys.length; i++) {
            if (raw[keys[i]]) names.push(String(keys[i]).toLowerCase());
        }
    }
    return names;
}

function hasCondition(unit, name) {
    const want = String(name).toLowerCase();
    const names = conditionsOf(unit);
    for (let i = 0; i < names.length; i++) if (names[i] === want) return true;
    return false;
}

function isHumanoidUnit(unit, rules, humanoidTypes) {
    const data = dataOf(unit) || {};
    const kind = String(data.kind || "").toLowerCase();
    if (HUMANOID_KINDS[kind]) return true;
    const labelled = String(data.creatureType || data.srdType || "").toLowerCase();
    if (labelled === "humanoid") return true;
    if (rules && typeof rules.isHumanoidDefault === "function" && rules.isHumanoidDefault(unit)) return true;
    if (humanoidTypes) {
        if (data.srdId && humanoidTypes[data.srdId] === "humanoid") return true;
        if (data.creatureId && humanoidTypes[data.creatureId] === "humanoid") return true;
    }
    return false;
}

function blockIsHumanoid(block, humanoidTypes) {
    if (!block || !humanoidTypes) return false;
    return humanoidTypes[block.id] === "humanoid";
}

function isProficient(actor, skill) {
    const data = dataOf(actor) || {};
    const want = String(skill || "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
    const lists = [data.skillProficiencies, data.proficientSkills];
    for (let L = 0; L < lists.length; L++) {
        const list = lists[L];
        if (!Array.isArray(list)) continue;
        for (let i = 0; i < list.length; i++) {
            const name = String(list[i] == null ? "" : list[i]).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
            if (name === want) return true;
            const cut = name.lastIndexOf(" ");
            if (cut >= 0 && name.slice(cut + 1) === want) return true;
        }
    }
    return false;
}

function summarizeCheck(rolled) {
    if (!rolled) return null;
    return {
        ok: !!rolled.ok,
        total: rolled.total,
        roll: rolled.roll,
        dc: rolled.dc,
        abilityMod: rolled.abilityMod,
        profBonus: rolled.profBonus,
        abilityKey: rolled.abilityKey
    };
}

function roleOk(role) {
    return typeof role === "string" && ROLES.indexOf(role) >= 0;
}

module.exports = {
    HUMANOID_KINDS: HUMANOID_KINDS,
    dataOf: dataOf,
    recordOf: recordOf,
    copyRecord: copyRecord,
    withdrawnFromWild: withdrawnFromWild,
    factionOf: factionOf,
    sameOwner: sameOwner,
    mayHunt: mayHunt,
    refuseHuntJob: refuseHuntJob,
    methodKey: methodKey,
    hasCondition: hasCondition,
    isHumanoidUnit: isHumanoidUnit,
    blockIsHumanoid: blockIsHumanoid,
    isProficient: isProficient,
    summarizeCheck: summarizeCheck,
    roleOk: roleOk
};
