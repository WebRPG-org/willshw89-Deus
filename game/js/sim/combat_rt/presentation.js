"use strict";
// Placeholder presentation. No bitmaps are written and no generator is called.
// The weapon clip follows the wielded group. A shield does not change the clip.
// Idle, walk and the other life clips do not draw a weapon.

const C = require("./constants");

function frameCount(anim) {
    if (anim === "IDLE" || anim === "WALK") return 4;
    return 6;
}

function frameDurationMs(anim, frameIndex) {
    const base = 80;
    const strike = typeof anim === "string" && (anim.indexOf("ATK_") === 0 || anim === "CAST") && frameIndex === 3;
    return strike ? base * 2 : base;
}

function playback(anim) {
    const n = frameCount(anim);
    const frames = [];
    for (let i = 0; i < n; i++) frames.push(i);
    return frames;
}

function weaponGroup(weaponKey) {
    const key = C.slug(weaponKey);
    if (!key || key === "unarmed" || key === "fist" || key === "fists") return "unarmed";
    if (Object.prototype.hasOwnProperty.call(C.GROUP_BY_WEAPON, key)) return C.GROUP_BY_WEAPON[key];
    return null;
}

function attackClip(unit) {
    const group = unit && unit.weaponGroup ? unit.weaponGroup : weaponGroup(unit && unit.weaponKey);
    if (!group) return null;
    return C.CLIP_BY_GROUP[group] || null;
}

function armorState(unit) {
    const named = unit && (unit.armorState || (unit.data && unit.data.armorState));
    if (named) {
        const up = String(named).toUpperCase();
        if (C.ARMOR_STATES.indexOf(up) >= 0) return up;
    }
    const cat = String((unit && (unit.armorCategory || (unit.data && unit.data.armorCategory))) || "").toLowerCase();
    if (cat === "light") return "LIGHT";
    if (cat === "medium") return "MEDIUM";
    if (cat === "heavy") return "HEAVY";
    if (cat === "robe") return "ROBE";
    if (cat === "unarmored" || cat === "none") return "UNARMORED";
    const cls = String((unit && unit.className) || "").toLowerCase();
    if (C.PM_CASTER_CLASSES[cls]) return "ROBE";
    return "UNARMORED";
}

function sexCode(unit) {
    const s = String((unit && unit.sex) || "m").toLowerCase();
    return s === "f" || s === "female" ? "F" : "M";
}

function slotId(unit, anim, dir, frameIndex) {
    const race = C.slug(unit && unit.race ? unit.race : "human").toUpperCase();
    const armor = armorState(unit);
    const d = C.DIRECTIONS.indexOf(dir) >= 0 ? dir : "S";
    const frame = (frameIndex | 0) + 1;
    return "CH." + race + "." + sexCode(unit) + "." + armor + "." + anim + "." + d + ".F" + frame;
}

function weaponDrawn(anim) {
    return typeof anim === "string" && anim.indexOf("ATK_") === 0;
}

function knockPixels(damage, critical) {
    const d = damage | 0;
    if (!(d > 0)) return 0;
    if (critical || d >= 15) return 2;
    if (d >= 8) return 1;
    return 0;
}

function knockVector(attacker, target, px) {
    const n = px | 0;
    if (!n) return { x: 0, y: 0 };
    let sx = Math.sign((target.x | 0) - (attacker.x | 0));
    let sy = Math.sign((target.y | 0) - (attacker.y | 0));
    if (!sx && !sy) sy = 1;
    return { x: sx * n, y: sy * n };
}

function damageColor(type) {
    const key = C.ATTACK_TYPE_COLOR[type] || type || "miss";
    return C.DAMAGE_COLOR[key] || C.DAMAGE_COLOR.miss;
}

function damageNumber(amount, type, hit) {
    return {
        text: String(hit ? (amount | 0) : 0),
        font: C.PIXEL_FONT,
        native: true,
        scale: 1,
        color: hit ? damageColor(type) : C.DAMAGE_COLOR.miss
    };
}

function conditionOverlays(unit) {
    const list = unit && unit.data && Array.isArray(unit.data.conditions) ? unit.data.conditions : [];
    const out = [];
    for (let i = 0; i < list.length; i++) {
        out.push({ id: "condition/" + String(list[i]), shared: true, perCharacter: false, placeholder: true });
    }
    return out;
}

function feedbackFromResolved(attacker, target, result) {
    const r = result || {};
    const hit = !!r.hit && !r.sameZViolation;
    const damage = hit ? (r.damage | 0) : 0;
    const type = r.damageType || r.attackType || "slashing";
    const z = target && target.z !== undefined && target.z !== null ? target.z : 0;
    const kb = knockPixels(damage, !!r.critical);
    const clip = attackClip({ weaponKey: r.weaponKey || (attacker && attacker.weaponKey) || "unarmed", shield: true });
    return {
        placeholder: true,
        bitmap: null,
        z: z,
        hit: hit,
        damage: damage,
        number: damageNumber(damage, type, hit),
        flash: hit,
        flashFrame: hit ? 3 : null,
        knock: knockVector(attacker || { x: 0, y: 0 }, target || { x: 0, y: 0 }, kb),
        gridMoved: false,
        blood: hit && damage > 0 ? { kind: "blood", z: z, fadeSteps: 3, placeholder: true } : null,
        clip: clip,
        sameZViolation: !!r.sameZViolation
    };
}

function auditSource(text) {
    const src = String(text || "");
    const problems = [];
    const banned = ["pixel" + "lab", "image_" + "gen", "generate" + "Image", "dall-" + "e", "stable-" + "diffusion"];
    if (src.indexOf("Math" + ".random") >= 0) problems.push("math-random");
    for (let i = 0; i < banned.length; i++) if (src.toLowerCase().indexOf(banned[i].toLowerCase()) >= 0) problems.push("generator");
    const retiredClip = "ATK_1H" + "_SHIELD";
    if (src.indexOf(retiredClip) >= 0 && src.toLowerCase().indexOf("retired") < 0) problems.push("live-shield-clip");
    if (/one-hand \+ shield|1H\+shield|1H \+ shield/i.test(src)) problems.push("shield-group");
    if (/\boblique projection\b/i.test(src) && !/no oblique/i.test(src)) problems.push("oblique");
    return problems;
}

module.exports = {
    frameCount, frameDurationMs, playback, weaponGroup, attackClip, armorState, slotId,
    weaponDrawn, knockPixels, knockVector, damageColor, damageNumber, conditionOverlays,
    feedbackFromResolved, auditSource
};
