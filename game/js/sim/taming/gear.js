"use strict";
// DEC-033: a tamed creature keeps its SRD stat block and natural attacks.
// There are no equipment slots, no barding, and no crafted creature gear.
// A riding saddle is a visual marker: no slot and no stats.

const record = require("./record");
const SADDLE = require("./defaults").DEFAULTS.saddle;

const NO_CREATURE_SLOTS = Object.freeze([]);

function equipmentSlots() {
    return NO_CREATURE_SLOTS; // AX_GEAR_SLOTS
}

function equip() {
    return { ok: false, reason: "NO_CREATURE_GEAR", slot: null };
}

function markSaddle(unit) {
    const rec = record.recordOf(unit);
    if (!rec || rec.status !== "domesticated") return { ok: false, reason: "NOT_DOMESTICATED", saddle: null };
    rec.saddleMark = {
        id: SADDLE.id,
        visual: true,
        slot: null,
        stats: null
    };
    return { ok: true, reason: "SADDLE_MARK", saddle: record.copyRecord(rec.saddleMark) };
}

function attacksOf(rules, unit) {
    if (!rules || typeof rules.creatureOf !== "function") return [];
    let block = null;
    try {
        block = rules.creatureOf(unit);
    } catch (err) {
        if (err && (err.name === "RulesError" || err.name === "DiceError")) return [];
        throw err;
    }
    if (!block || !Array.isArray(block.actions)) return [];
    const out = [];
    for (let i = 0; i < block.actions.length; i++) {
        const action = block.actions[i];
        out.push({
            name: action.name,
            key: action.key,
            toHit: action.toHit,
            dice: action.dice,
            damageType: action.damageType,
            attackKind: action.attackKind,
            reach: action.reach
        });
    }
    return out;
}

function statBlock(rules, unit) {
    if (!rules || typeof rules.creatureOf !== "function") return null;
    let block = null;
    try {
        block = rules.creatureOf(unit);
    } catch (err) {
        if (err && (err.name === "RulesError" || err.name === "DiceError")) return null;
        throw err;
    }
    if (!block) return null;
    const rec = record.recordOf(unit);
    return {
        id: block.id,
        name: block.name,
        abilities: block.abilities,
        ac: block.ac,
        hitPoints: block.hitPoints,
        savingThrows: block.savingThrows,
        actions: attacksOf(rules, unit),
        equipmentSlots: equipmentSlots(unit),
        saddle: rec && rec.saddleMark ? record.copyRecord(rec.saddleMark) : null
    };
}

module.exports = {
    NO_CREATURE_SLOTS: NO_CREATURE_SLOTS,
    equipmentSlots: equipmentSlots,
    equip: equip,
    markSaddle: markSaddle,
    attacksOf: attacksOf,
    statBlock: statBlock
};
