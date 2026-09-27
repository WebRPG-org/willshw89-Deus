"use strict";
// WG.00.39 — tamed creatures in party combat.
//   node tools/taming_party/test_tamed_party_combat.js
//   node tools/taming_party/test_tamed_party_combat.js --provoke=<name>
//   node tools/taming_party/test_tamed_party_combat.js --provoke-all
//
// Names: membership, srd, gear_bonus, death, orders, natural, saves,
// target_id, legacy_lookup, order_sync, world_sync, slams, pack, regen,
// death_rule, legacy_gear, legacy_follow, runtime.
// A plain run must pass every check. It also loads each provocation and requires
// that check to fail. --provoke and --provoke-all exit 0 only when every named
// provocation makes its own check fail.

const fs = require("fs");
const path = require("path");
const Module = require("module");
const { bindRules } = require("../rules/bind");
const taming = require("../../game/js/sim/taming");
const party = require("../../game/js/sim/taming/party");
const sim = require("../../game/js/sim/combat_rt");

const ROOT = path.join(__dirname, "..", "..");
const PARTY = path.join(ROOT, "game", "js", "sim", "taming", "party.js");
const COMBAT = path.join(ROOT, "game", "js", "plugins", "DEUS_Combat.js");

const NAMES = [
    "membership", "srd", "gear_bonus", "death", "orders",
    "natural", "saves", "target_id", "legacy_lookup", "order_sync", "world_sync",
    "slams", "pack", "regen", "death_rule", "legacy_gear", "legacy_follow", "runtime"
];
const ENGINE = path.join(ROOT, "game", "js", "sim", "combat_rt", "engine.js");
const PROVOCATIONS = {
    membership: [[
        'if (!(rec && rec.status === "domesticated")) return refuse(unit, "NOT_TAMED"); // BG_MEMBERSHIP',
        'if (false) return refuse(unit, "NOT_TAMED"); // BG_MEMBERSHIP'
    ]],
    srd: [[
        "const max = rules.hitPoints(block).hp; // BG_SRD_HP",
        "const max = 99; // BG_SRD_HP"
    ]],
    gear_bonus: [[
        "    // BG_STRIP_GEAR",
        "    if (src.equipment && typeof src.equipment === \"object\") data.equipment = src.equipment;\n" +
        "    const saddleMark = src.taming && src.taming.saddleMark;\n" +
        "    if (saddleMark && saddleMark.stats && typeof saddleMark.stats.acBonus === \"number\") data.naturalArmor = saddleMark.stats.acBonus;\n" +
        "    // BG_STRIP_GEAR"
    ], [
        "    return rules.armorClass(body).ac; // BG_GEAR_AC",
        "    let ac = rules.armorClass(body).ac;\n" +
        "    const mark = unit && unit.data && unit.data.taming && unit.data.taming.saddleMark;\n" +
        "    if (mark && mark.stats && typeof mark.stats.acBonus === \"number\") ac += mark.stats.acBonus;\n" +
        "    if (unit && unit.data && unit.data.equipment && Object.keys(unit.data.equipment).length) ac += 2;\n" +
        "    return ac; // BG_GEAR_AC"
    ], [
        "    return { attackMod: att.attackMod, damageExpr: att.damageExpr, fromStatBlock: !!att.fromStatBlock, damageType: att.damageType }; // BG_GEAR_HIT",
        "    const swung = { attackMod: att.attackMod, damageExpr: att.damageExpr, fromStatBlock: !!att.fromStatBlock, damageType: att.damageType };\n" +
        "    const hitMark = unit && unit.data && unit.data.taming && unit.data.taming.saddleMark;\n" +
        "    if (hitMark && hitMark.stats && typeof hitMark.stats.attackBonus === \"number\") swung.attackMod += hitMark.stats.attackBonus;\n" +
        "    return swung; // BG_GEAR_HIT"
    ]],
    death: [[
        "    rec.status = \"dead\";\n    rec.dead = true; // BG_NOTE_DEATH",
        "    rec.status = rec.status;\n    rec.dead = false; // BG_NOTE_DEATH"
    ]],
    orders: [[
        '    return { type: "follow", targetId: anchor == null ? null : String(anchor) }; // BG_ORDER_FOLLOW',
        '    return { type: "hold", targetId: null }; // BG_ORDER_FOLLOW'
    ]],
    natural: { party: [[
        "    const actions = naturalActions(block && block.actions, rules); // BG_NATURAL_ONLY",
        "    const actions = copyActions(block && block.actions); // BG_NATURAL_ONLY"
    ]] },
    saves: { engine: [[
        "        const saveSubject = rulesCombatant(target); // BG_SPELL_SAVE",
        "        const saveSubject = target; // BG_SPELL_SAVE"
    ]] },
    target_id: { party: [[
        "    return id; // BG_TARGET_ID",
        "    return String(id); // BG_TARGET_ID"
    ]] },
    legacy_lookup: { combat: [[
        "            const t = byId.get(c.targetId); // BG_LEGACY_LOOKUP",
        "            const t = byId.get(String(c.targetId)); // BG_LEGACY_LOOKUP"
    ]] },
    order_sync: { party: [[
        "        return { type: rec.order.type, targetId: keptTarget(rec.order.type, rec.order.targetId) }; // BG_ORDER_RECORD",
        "        rec.order.type; // BG_ORDER_RECORD"
    ]] },
    world_sync: { engine: [[
        "        syncWorldUnit(unit); // BG_WORLD_SYNC",
        "        /* BG_WORLD_SYNC */"
    ]] },
    slams: { party: [[
        "    const namedAttacks = /makes\\s+(one|two|three|four|five|six|seven|eight|\\d+)\\s+([a-z]+)\\s+attacks?\\b/gi; // BG_SLAM_COUNT",
        "    const namedAttacks = /makes\\s+no-such\\s+([a-z]+)\\s+attacks?\\b/gi; // BG_SLAM_COUNT"
    ]] },
    pack: { engine: [[
        "            const pack = Party.packAdvantage(rules, actor, target, units); // BG_PACK",
        "            const pack = false; // BG_PACK"
    ]] },
    regen: { party: [[
        "    const amount = regen.hp; // BG_REGEN",
        "    const amount = 0; // BG_REGEN"
    ]] },
    death_rule: { engine: [[
        "        const deferDeath = !!(target.tamed && Party.defersDeath(target, rules)); // BG_DEATH_EXCEPTION",
        "        const deferDeath = false; // BG_DEATH_EXCEPTION"
    ]] },
    legacy_gear: { combat: [[
        "        if (tamedFriendly(unit)) { // BG_LEGACY_GEAR",
        "        if (false && tamedFriendly(unit)) { // BG_LEGACY_GEAR"
    ]] },
    legacy_follow: { combat: [[
        "            if (followTamed(u, byId, occ, size, area)) continue; // BG_LEGACY_FOLLOW",
        "            if (false && followTamed(u, byId, occ, size, area)) continue; // BG_LEGACY_FOLLOW"
    ]] },
    runtime: { combat: [[
        "            if (sceneActive !== false) driveTamedFrame(1000 / 60); // BG_RUNTIME_DELIVER",
        "            if (false && sceneActive !== false) driveTamedFrame(1000 / 60); // BG_RUNTIME_DELIVER"
    ]] }
};

const args = process.argv.slice(2);
function argValue(name) {
    const hit = args.find(function (a) { return a === "--" + name || a.indexOf("--" + name + "=") === 0; });
    if (!hit) return null;
    const eq = hit.indexOf("=");
    return eq < 0 ? true : hit.slice(eq + 1);
}
const provokeAll = args.indexOf("--provoke-all") >= 0;
const provokeName = argValue("provoke");

const rules = bindRules(global);
let passed = 0;
let failed = 0;

function say(ok, name, detail) {
    if (ok) {
        passed += 1;
        console.log("PASS " + name + (detail ? " — " + detail : ""));
    } else {
        failed += 1;
        console.log("FAIL " + name + (detail ? " — " + detail : ""));
    }
}

function constantRng(u) {
    let n = 0;
    return { next: function () { n += 1; return u; }, state: function () { return n; }, setState: function () {} };
}

function clearRoll() {
    if (typeof rules._clearTestRoll === "function") rules._clearTestRoll();
}

function handler() {
    return {
        id: 1,
        name: "Handler",
        x: 0,
        y: 0,
        data: {
            kind: "colonist",
            faction: "home",
            factionId: "home",
            level: 1,
            stats: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 },
            skillProficiencies: ["Animal Handling"]
        }
    };
}

function beast(species, id, extra) {
    const data = { kind: "creature", species: species, hp: 0 };
    const over = extra || {};
    if (over.srdId) {
        data.srdId = over.srdId;
        delete data.species;
    }
    if (over.hp != null) data.hp = over.hp;
    if (over.creatureType) data.creatureType = over.creatureType;
    if (over.stats) data.stats = over.stats;
    if (over.equipment) data.equipment = over.equipment;
    return { id: id, name: species || over.srdId, x: over.x || 0, y: over.y || 0, z: 0, data: data };
}

function domesticate(animal, role) {
    const api = taming.createTaming(rules, { seed: 1 });
    const captured = api.attemptCapture(handler(), animal, "knockout", { roll: 20, hour: 0 });
    if (!captured.ok) return captured;
    const need = api.config.carePoints[role];
    let last = null;
    for (let hour = 1; hour <= need; hour++) {
        last = api.tend(handler(), animal, { role: role, food: true, hour: hour, roll: 20 });
        if (!last.ok) return last;
    }
    return last;
}

function engineOf(partyMod, rng, ctx) {
    const create = ctx && ctx.createEngine ? ctx.createEngine : sim.createEngine;
    return create({
        rules: rules,
        seed: 3,
        rng: rng || constantRng(0.5),
        party: partyMod
    });
}

function markTamed(unit, role, ownerId) {
    unit.data.taming = {
        status: "domesticated",
        role: role || "pet",
        ownerId: ownerId == null ? 1 : ownerId,
        dead: false
    };
    return unit;
}

function specOf(name) {
    if (!name) return {};
    const spec = PROVOCATIONS[name];
    if (!spec) return null;
    if (Array.isArray(spec)) return { party: spec };
    return spec;
}

function readSwapped(file, swaps) {
    let src = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    const list = swaps || [];
    for (let i = 0; i < list.length; i++) {
        const count = src.split(list[i][0]).length - 1;
        if (count !== 1) return { error: path.basename(file) + " anchor " + i + " count " + count };
        src = src.replace(list[i][0], list[i][1]);
    }
    return { source: src };
}

function compileModule(file, swaps) {
    const read = readSwapped(file, swaps);
    if (read.error) return read;
    if (!swaps || !swaps.length) return { exports: null, source: read.source };
    const m = new Module(file);
    m.filename = file;
    m.paths = Module._nodeModulePaths(path.dirname(file));
    m._compile(read.source, file);
    return { exports: m.exports, source: read.source };
}

function loadContext(name) {
    const spec = specOf(name);
    if (spec === null) return { error: "unknown provocation " + name };
    const partyLoaded = compileModule(PARTY, spec.party || []);
    if (partyLoaded.error) return partyLoaded;
    const engineLoaded = compileModule(ENGINE, spec.engine || []);
    if (engineLoaded.error) return engineLoaded;
    const combatLoaded = readSwapped(COMBAT, spec.combat || []);
    if (combatLoaded.error) return combatLoaded;
    return {
        party: partyLoaded.exports || party,
        createEngine: engineLoaded.exports ? engineLoaded.exports.createEngine : sim.createEngine,
        combatSource: spec.combat && spec.combat.length ? combatLoaded.source : null
    };
}

function fighter(id, x, y, extra) {
    return Object.assign({
        id: id, x: x, y: y, z: 0, side: "player", weaponKey: "longsword",
        stats: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 10 },
        hp: 40, maxHp: 40, level: 1, className: "fighter"
    }, extra || {});
}

function foe(id, x, y, extra) {
    return Object.assign({
        id: id, x: x, y: y, z: 0, side: "enemy", weaponKey: "scimitar",
        stats: { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
        hp: 40, maxHp: 40, level: 1, className: "fighter"
    }, extra || {});
}

function loadParty(name) {
    return loadContext(name);
}

function wolfBite(block) {
    const actions = block.actions || [];
    for (let i = 0; i < actions.length; i++) if (actions[i].key === "bite") return actions[i];
    return null;
}

function runMembership(mod) {
    const problems = [];
    const roles = ["pet", "mount", "livestock", "work"];
    for (let i = 0; i < roles.length; i++) {
        const animal = beast("wolf", 10 + i);
        const trained = domesticate(animal, roles[i]);
        const gate = mod.membership(rules, animal);
        if (!trained || trained.ok === false) problems.push(roles[i] + " train " + (trained && trained.reason));
        else if (gate.join !== true || gate.role !== roles[i]) problems.push(roles[i] + " join " + JSON.stringify(gate));
    }
    const wild = beast("wolf", 30);
    const wildGate = mod.membership(rules, wild);
    if (wildGate.join !== false) problems.push("wild joined " + wildGate.reason);
    const captive = beast("boar", 31);
    const api = taming.createTaming(rules, { seed: 1 });
    api.attemptCapture(handler(), captive, "knockout", { roll: 20, hour: 0 });
    api.tend(handler(), captive, { role: "pet", food: true, hour: 1, roll: 20 });
    const captiveGate = mod.membership(rules, captive);
    if (captiveGate.join !== false) problems.push("captive joined " + captiveGate.reason);
    const person = beast("wolf", 32, { creatureType: "humanoid" });
    domesticate(person, "pet");
    if (mod.membership(rules, person).reason !== "HUMANOID") problems.push("humanoid " + mod.membership(rules, person).reason);

    const pet = beast("wolf", 2, { x: 0 });
    domesticate(pet, "pet");
    const enc = engineOf(mod);
    enc.addUnit(fighter(1, 5, 0));
    enc.addUnit(foe("orc", 1, 0));
    const listed = mod.enlist(enc, rules, [pet, wild]);
    if (!listed.added || listed.added.length !== 1) problems.push("enlist " + JSON.stringify(listed));
    const body = enc.unit("2");
    if (!body || body.side !== "player" || body.tamed !== true) problems.push("side " + JSON.stringify(body && { side: body.side, tamed: body.tamed }));
    const enemyPeek = enc.peekAction("orc");
    if (!enemyPeek || enemyPeek.targetId !== "2") problems.push("enemy target " + JSON.stringify(enemyPeek));
    const heroPeek = enc.peekAction("1");
    if (!heroPeek || heroPeek.targetId === "2") problems.push("hero targeted the wolf " + JSON.stringify(heroPeek));
    enc.advanceReal(6000);
    const acted = enc.transcript().some(function (ev) { return ev.actorId === "2" && ev.type !== "none"; });
    const init = enc.combatState().initiative.some(function (row) { return row.id === "2"; });
    if (!acted) problems.push("wolf did not act");
    if (!init) problems.push("wolf missing from initiative");
    const combatSrc = fs.readFileSync(COMBAT, "utf8");
    if (combatSrc.indexOf("function tamedFriendly") < 0 || combatSrc.indexOf('if (tamedFriendly(u)) return "friendly"') < 0) {
        problems.push("legacy side hook missing");
    }
    return { ok: problems.length === 0, detail: problems.join("; ") };
}

function runSrd(mod) {
    const problems = [];
    const wolf = beast("wolf", 2, { stats: { str: 30, dex: 30, con: 30, int: 30, wis: 30, cha: 30 } });
    domesticate(wolf, "pet");
    const block = rules.creatureOf(wolf);
    const bite = wolfBite(block);
    const profile = mod.combatProfile(rules, wolf);
    const expectedHp = rules.hitPoints(block).hp;
    if (!profile.ok) problems.push("profile " + profile.reason);
    if (profile.maxHp !== expectedHp || profile.hp !== expectedHp) problems.push("hp " + profile.hp + "/" + profile.maxHp + " want " + expectedHp);
    if (profile.ac !== block.ac) problems.push("ac " + profile.ac + " block " + block.ac);
    if (profile.speedFt !== 40) problems.push("speed " + profile.speedFt);
    if (!profile.abilities || profile.abilities.dex !== block.abilities.dex || profile.abilities.str !== block.abilities.str) {
        problems.push("abilities " + JSON.stringify(profile.abilities));
    }
    if (!bite || profile.weaponKey !== bite.key || profile.attackMod !== bite.toHit || profile.damageExpr !== bite.dice || profile.fromStatBlock !== true) {
        problems.push("bite " + JSON.stringify({ key: profile.weaponKey, mod: profile.attackMod, dice: profile.damageExpr, from: profile.fromStatBlock, want: bite }));
    }
    const wounded = beast("wolf", 3);
    domesticate(wounded, "pet");
    wounded.data.hp = 4;
    const hurt = mod.combatProfile(rules, wounded);
    if (!hurt.ok || hurt.hp !== 4 || hurt.maxHp !== expectedHp) problems.push("wound " + (hurt.ok ? hurt.hp + "/" + hurt.maxHp : hurt.reason));

    const troll = beast("troll", 4);
    domesticate(troll, "mount");
    const trollBlock = rules.creatureOf(troll);
    const trollProfile = mod.combatProfile(rules, troll);
    const seq = trollProfile.sequence ? trollProfile.sequence.join(",") : "";
    if (seq !== "bite,claw,claw" || trollProfile.multiattack !== true) problems.push("multiattack " + seq);
    if (trollProfile.ac !== trollBlock.ac || trollProfile.maxHp !== rules.hitPoints(trollBlock).hp || trollProfile.speedFt !== 30) {
        problems.push("troll numbers " + JSON.stringify({ ac: trollProfile.ac, hp: trollProfile.maxHp, speed: trollProfile.speedFt }));
    }

    const aboleth = beast("aboleth", 5, { srdId: "srd:creature:aboleth" });
    domesticate(aboleth, "pet");
    const abBlock = rules.creatureOf(aboleth);
    const body = mod.rulesBody(aboleth, abBlock);
    clearRoll();
    const saved = rules.savingThrow(body, "wis", 10, { roll: 10 });
    if (saved.abilityMod !== abBlock.savingThrows.wis || saved.total !== 16) {
        problems.push("save " + saved.total + " mod " + saved.abilityMod + " printed " + abBlock.savingThrows.wis);
    }

    clearRoll();
    rules._setTestRoll(10);
    const enc = engineOf(mod, constantRng(0.25));
    enc.addUnit(fighter(1, 8, 0));
    const listed = mod.enlist(enc, rules, [wolf]);
    if (!listed.added.length) problems.push("srd enlist");
    const sheet = enc.unit("2");
    if (!sheet || sheet.speedFt !== profile.speedFt) problems.push("engine speed " + (sheet && sheet.speedFt));
    enc.addUnit(foe("dummy", 3, 3, { hp: 80, maxHp: 80 }));
    enc.queueOrder("dummy", { type: "hold" });
    enc.advanceReal(6000);
    const row = enc.combatState().initiative.filter(function (item) { return item.id === "2"; })[0];
    const dexMod = rules.abilityModifier(block.abilities.dex);
    if (!row || row.total !== 10 + dexMod) problems.push("initiative " + JSON.stringify(row) + " dexMod " + dexMod);
    const swings = enc.transcript().filter(function (ev) { return ev.actorId === "2" && ev.swings; })[0];
    if (swings && swings.swings[0] && swings.swings[0].attackMod !== bite.toHit) {
        problems.push("engine attackMod " + swings.swings[0].attackMod);
    }
    const trollEnc = engineOf(mod, constantRng(0.25));
    trollEnc.addUnit(foe("bag", 2, 0, { hp: 200, maxHp: 200 }));
    trollEnc.queueOrder("bag", { type: "hold" });
    mod.enlist(trollEnc, rules, [troll]);
    trollEnc.setOrder(4, { type: "attack", targetId: "bag" });
    trollEnc.advanceReal(6000);
    const multi = trollEnc.transcript().filter(function (ev) { return ev.actorId === "4" && ev.swings && ev.swings.length; })[0];
    const keys = multi ? multi.swings.map(function (s) { return s.weaponKey; }).join(",") : "";
    if (keys !== "bite,claw,claw") problems.push("troll swings " + keys);
    else if (multi.swings.some(function (s) { return s.fromStatBlock !== true || s.attackMod !== 7; })) problems.push("troll to-hit");
    clearRoll();
    return { ok: problems.length === 0, detail: problems.join("; ") };
}

function runGear(mod) {
    const problems = [];
    const wolf = beast("wolf", 2, {
        stats: { str: 30, dex: 30, con: 30, int: 30, wis: 30, cha: 30 },
        equipment: { armor: "plate", body: "plate", mainHand: "longsword" }
    });
    domesticate(wolf, "mount");
    const marked = taming.createTaming(rules, { seed: 1 }).markSaddle(wolf);
    wolf.data.taming.saddleMark.stats = { acBonus: 5, attackBonus: 3 };
    wolf.data.naturalArmor = 4;
    const block = rules.creatureOf(wolf);
    const bite = wolfBite(block);
    const profile = mod.combatProfile(rules, wolf);
    const dirty = rules.armorClass({
        id: 2,
        data: { kind: "creature", species: "wolf", equipment: { armor: "plate", body: "plate" } }
    }).ac;
    if (dirty === block.ac) problems.push("plate did not change a geared armor class (" + dirty + ")");
    if (!profile.ok) problems.push("profile " + profile.reason);
    if (profile.ac !== block.ac) problems.push("ac " + profile.ac + " block " + block.ac + " dirty " + dirty);
    if (profile.attackMod !== bite.toHit || profile.damageExpr !== bite.dice || profile.fromStatBlock !== true) {
        problems.push("attack " + profile.attackMod + " " + profile.damageExpr);
    }
    if (profile.maxHp !== rules.hitPoints(block).hp || profile.speedFt !== 40) problems.push("hp/speed changed");
    if (!profile.equipmentSlots || profile.equipmentSlots.length !== 0) problems.push("slots " + JSON.stringify(profile.equipmentSlots));
    if (!profile.saddle || profile.saddle.stats !== null || profile.saddle.slot !== null || profile.saddle.visual !== true) {
        problems.push("saddle " + JSON.stringify(profile.saddle));
    }
    if (!marked.ok) problems.push("saddle mark " + marked.reason);
    const enc = engineOf(mod);
    enc.addUnit(fighter(1, 4, 0));
    mod.enlist(enc, rules, [wolf]);
    const view = enc.unit("2");
    if (!view || !view.equipmentSlots || view.equipmentSlots.length !== 0) problems.push("engine slots");
    const refused = enc.equipCreature("2", "barding", { id: "barding", ac: 4 });
    if (!refused || refused.ok !== false || refused.reason !== "NO_CREATURE_GEAR") problems.push("equip " + JSON.stringify(refused));
    const again = mod.combatProfile(rules, wolf);
    if (again.ac !== block.ac || again.attackMod !== bite.toHit) problems.push("equip changed numbers");
    const combatSrc = fs.readFileSync(COMBAT, "utf8");
    if (combatSrc.indexOf("function tamedBody") < 0 || combatSrc.indexOf("tamedBody(attacker)") < 0 || combatSrc.indexOf("tamedBody(target)") < 0) {
        problems.push("legacy gear strip missing");
    }
    return { ok: problems.length === 0, detail: problems.join("; ") };
}

function runDeath(mod) {
    const problems = [];
    const wolf = beast("wolf", 2);
    domesticate(wolf, "pet");
    wolf.data.hp = 1;
    const other = beast("deer", 6);
    domesticate(other, "livestock");
    const enc = engineOf(mod, constantRng(0.99));
    enc.addUnit(foe("orc", 1, 0, { hp: 50, maxHp: 50 }));
    mod.enlist(enc, rules, [wolf]);
    rules._setTestRoll(20);
    enc.advanceReal(6000);
    clearRoll();
    const view = enc.unit("2");
    if (!view || view.dead !== true || view.dying === true) problems.push("engine dead " + JSON.stringify(view && { dead: view.dead, dying: view.dying, hp: view.hp }));
    if (wolf.data.dead !== true || wolf.data.hp !== 0) problems.push("world hp " + wolf.data.hp + " dead " + wolf.data.dead);
    if (!wolf.data.taming || wolf.data.taming.status !== "dead" || wolf.data.taming.dead !== true) {
        problems.push("record " + JSON.stringify(wolf.data.taming && { status: wolf.data.taming.status, dead: wolf.data.taming.dead }));
    }
    if (!wolf.data.taming.death || wolf.data.taming.death.knockout !== false) problems.push("knockout flag");
    if (typeof mod.knockoutChoice === "function") problems.push("knockout choice exists");
    const counts = taming.census([wolf, other]);
    if (counts.dead !== 1 || counts.domestic !== 1 || counts.wild !== 0) problems.push("census " + JSON.stringify(counts));
    const already = beast("wolf", 7);
    domesticate(already, "work");
    already.data.dead = true;
    const refused = mod.enlist(engineOf(mod), rules, [already]);
    if (!refused.refused.length || refused.refused[0].reason !== "DEAD") problems.push("dead enlist " + JSON.stringify(refused));
    if (already.data.taming.status !== "dead") problems.push("dead enlist left " + already.data.taming.status);
    const combatSrc = fs.readFileSync(COMBAT, "utf8");
    if (combatSrc.indexOf("party.noteDeath") < 0) problems.push("legacy death hook missing");
    return { ok: problems.length === 0, detail: problems.join("; ") };
}

function runOrders(mod) {
    const problems = [];
    if (mod.ORDERS.join(",") !== "follow,attack,hold") problems.push("order names " + mod.ORDERS.join(","));
    const follower = beast("wolf", 2);
    domesticate(follower, "pet");
    const followEnc = engineOf(mod);
    followEnc.addUnit(fighter(1, 6, 0));
    mod.enlist(followEnc, rules, [follower]);
    const issued = followEnc.setOrder(2, { type: "follow" });
    if (!issued.ok || issued.order.type !== "follow") problems.push("follow api " + JSON.stringify(issued));
    if (followEnc.peekAction("2").type !== "follow") problems.push("peek " + JSON.stringify(followEnc.peekAction("2")));
    followEnc.advanceReal(6000);
    const moved = followEnc.unit("2");
    const apart = moved ? Math.max(Math.abs(moved.x - 6), Math.abs(moved.y - 0)) : 99;
    if (!moved || apart !== 1) problems.push("follow position " + (moved && moved.x + "," + moved.y));
    const followEvent = followEnc.transcript().some(function (ev) { return ev.actorId === "2" && ev.type === "follow"; });
    if (!followEvent) problems.push("no follow event");

    const holder = beast("wolf", 3);
    domesticate(holder, "pet");
    const holdEnc = engineOf(mod);
    holdEnc.addUnit(foe("orc", 1, 0));
    holdEnc.queueOrder("orc", { type: "hold" });
    mod.enlist(holdEnc, rules, [holder]);
    const held = holdEnc.setOrder(3, { type: "hold" });
    if (!held.ok) problems.push("hold api");
    holdEnc.advanceReal(6000);
    const heldUnit = holdEnc.unit("3");
    const heldAttack = holdEnc.transcript().some(function (ev) { return ev.actorId === "3" && ev.type === "attack"; });
    if (!heldUnit || heldUnit.x !== 0 || heldUnit.y !== 0 || heldAttack) problems.push("hold moved or attacked");

    const striker = beast("wolf", 4);
    domesticate(striker, "pet");
    const strikeEnc = engineOf(mod, constantRng(0.5));
    strikeEnc.addUnit(foe("near", 1, 0, { hp: 30, maxHp: 30 }));
    strikeEnc.addUnit(foe("far", 0, 1, { hp: 30, maxHp: 30 }));
    strikeEnc.queueOrder("near", { type: "hold" });
    strikeEnc.queueOrder("far", { type: "hold" });
    mod.enlist(strikeEnc, rules, [striker]);
    const aimed = strikeEnc.setOrder(4, { type: "attack", targetId: "far" });
    if (!aimed.ok || aimed.order.targetId !== "far") problems.push("attack api " + JSON.stringify(aimed));
    const missing = strikeEnc.setOrder(4, { type: "attack" });
    if (!missing || missing.ok !== false) problems.push("attack without target was accepted");
    strikeEnc.setOrder(4, { type: "attack", targetId: "far" });
    rules._setTestRoll(15);
    strikeEnc.advanceReal(6000);
    clearRoll();
    const hits = strikeEnc.transcript().filter(function (ev) { return ev.actorId === "4" && ev.type === "attack"; });
    if (!hits.length || hits.some(function (ev) { return ev.targetId !== "far"; })) problems.push("attack target " + JSON.stringify(hits.map(function (ev) { return ev.targetId; })));
    const nearHp = strikeEnc.unit("near").hp;
    const farHp = strikeEnc.unit("far").hp;
    if (!(farHp < 30) || nearHp !== 30) problems.push("damage near " + nearHp + " far " + farHp);
    const bad = strikeEnc.setOrder(4, { type: "graze" });
    if (!bad || bad.reason !== "BAD_ORDER") problems.push("bad order " + JSON.stringify(bad));
    return { ok: problems.length === 0, detail: problems.join("; ") };
}

function bootCombat(source) {
    const vm = require("vm");
    const context = {
        console: console,
        require: require,
        process: process,
        Buffer: Buffer,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        performance: { now: function () { return Date.now(); } },
        __dirname: path.join(ROOT, "game", "js", "plugins"),
        __filename: COMBAT
    };
    context.global = context;
    context.window = context;
    context.globalThis = context;
    context.UF = {};
    context.DEUS = context.UF;
    context.Graphics = { frameCount: 1 };
    context.Sprite = function () { this.anchor = { set: function () {} }; this.scale = { x: 1, y: 1 }; this.children = []; };
    context.Sprite.prototype = { addChild: function (child) { this.children.push(child); }, update: function () {} };
    context.Bitmap = function () { this._url = null; };
    context.PluginManager = { parameters: function () { return {}; } };
    context.Game_Map = function () {};
    context.Game_Map.prototype = { update: function () {} };
    context.Spriteset_Map = function () {};
    context.Spriteset_Map.prototype = { createCharacters: function () {} };
    context.Scene_Boot = function () {};
    context.Scene_Boot.prototype = { start: function () {} };
    context.Scene_Map = function () {};
    context.Scene_Map.prototype = { update: function () {}, isActive: function () { return false; } };
    context.Input = { keyMapper: {}, isTriggered: function () { return false; } };
    context.$ufWorldCatalog = {
        combat: {
            tickFrames: 1,
            levelOffset: 8,
            styles: { accurate: { accuracy: 3 }, aggressive: { strength: 3 }, defensive: { defence: 3 }, controlled: {}, rapid: { speed: -1 }, longrange: { range: 2 } },
            creatureStyle: "controlled",
            unarmed: { speed: 4, types: ["crush"], styles: ["accurate", "aggressive", "defensive"], reach: 1 },
            people: { attack: 1, strength: 1, defence: 1, ranged: 1, magic: 1, hitpoints: 10 },
            defaultModes: { hostile: "nearest", fleeing: "flee", other: "defend" },
            aggroRadius: 8,
            leash: 16,
            fleeRadius: 5,
            aidRadius: 10,
            regen: { hp: 0, everyTicks: 100 },
            display: { splatMs: 1000, maxSplats: 4, barHideMs: 6000, barWidth: 30 },
            aliases: { tool: "weapon", clothes: "torso" },
            quality: { bonus: [1, 1, 1, 1, 1, 1] }
        },
        items: {
            types: {
                sword_long: { id: "sword_long", name: "Long sword", weapon: { speed: 5, types: ["slash"], styles: ["accurate", "aggressive"], reach: 1 } }
            }
        },
        wildlife: { species: [] }
    };
    context.UF.Space = {
        sameArea: function (a, b) {
            return !!a && !!b && !!a.area && !!b.area && a.area.x === b.area.x && a.area.y === b.area.y;
        },
        sameZ: function (a, b) {
            const za = a && a.z !== undefined ? a.z : 0;
            const zb = b && b.z !== undefined ? b.z : 0;
            return za === zb;
        },
        zOf: function (o) { return o && o.z !== undefined ? o.z : 0; },
        chebyshev: function (a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); },
        manhattan: function (a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
    };
    context.UF.Events = { on: function () {}, emit: function () {} };
    context.UF.Items = {
        inventoryOf: function () { return []; },
        count: function () { return 0; },
        type: function (id) {
            const types = context.$ufWorldCatalog && context.$ufWorldCatalog.items && context.$ufWorldCatalog.items.types;
            return types && types[id] ? types[id] : null;
        }
    };
    const units = new Map();
    context.UF.World = {
        state: { seed: 3, size: 32 },
        unit: function (id) {
            if (units.has(id)) return units.get(id);
            const n = Number(id);
            if (typeof id === "string" && Number.isFinite(n) && units.has(n)) return units.get(n);
            if (typeof id === "number" && units.has(String(id))) return units.get(String(id));
            return null;
        },
        units: function () { return Array.from(units.values()); },
        addUnit: function (u) { units.set(u.id, u); return u; },
        removeUnit: function (id) { units.delete(id); const n = Number(id); if (Number.isFinite(n)) units.delete(n); },
        inWorld: function () { return true; },
        stopUnit: function () {},
        sendUnit: function (id, goal) {
            const u = context.UF.World.unit(id);
            if (!u || !goal) return;
            u.x = goal.x;
            u.y = goal.y;
            if (goal.z != null) u.z = goal.z;
        },
        isDisplayed: function () { return false; },
        eventOf: function () { return null; },
        hash32: function () { return 1; },
        mulberry32: function () { return function () { return 0.5; }; },
        cellFree: function () { return true; }
    };
    vm.createContext(context);
    vm.runInContext(source || fs.readFileSync(COMBAT, "utf8"), context, { filename: COMBAT });
    return context;
}

function runNatural(mod) {
    const giant = beast(null, 6, { srdId: "srd:creature:hill-giant", hp: 105 });
    markTamed(giant, "pet", 1);
    const profile = mod.combatProfile(rules, giant);
    const keys = (profile.attacks || []).map(function (a) { return a.key; });
    const problems = [];
    if (!profile.ok) problems.push("profile " + profile.reason);
    if (keys.indexOf("greatclub") >= 0 || keys.indexOf("rock") >= 0) problems.push("manufactured " + keys.join(","));
    if (profile.sequence && (profile.sequence.indexOf("greatclub") >= 0 || profile.sequence.indexOf("rock") >= 0)) {
        problems.push("sequence " + profile.sequence.join(","));
    }
    if (profile.weaponKey === "greatclub" || profile.weaponKey === "rock") problems.push("key " + profile.weaponKey);
    giant.data.equipment = { mainHand: "sword_long", armor: "plate" };
    const again = mod.combatProfile(rules, giant);
    if (!again.ok || again.ac !== profile.ac || again.weaponKey !== profile.weaponKey || again.speedFt !== profile.speedFt) {
        problems.push("equipment changed " + again.weaponKey + " ac " + again.ac);
    }
    return { ok: problems.length === 0, detail: problems.join("; ") };
}

function runSaves(mod, ctx) {
    const wolf = beast("wolf", 2, { hp: 11 });
    markTamed(wolf, "pet", 1);
    const enc = engineOf(mod, constantRng(0.5), ctx);
    enc.addUnit(foe("caster", 6, 0, { hp: 30, maxHp: 30 }));
    mod.enlist(enc, rules, [wolf]);
    enc.setOrder(2, { type: "hold" });
    enc.queueOrder("caster", { type: "spell", targetId: 2, ability: "wis", dc: 11, dice: "1d8", damageType: "fire" });
    rules._setTestRoll(10);
    enc.advanceReal(6000);
    clearRoll();
    const spell = enc.transcript().filter(function (row) { return row.type === "spell"; })[0];
    const ok = !!(spell && spell.saveOk === true && spell.damage === 0);
    return { ok: ok, detail: JSON.stringify(spell && { saveOk: spell.saveOk, damage: spell.damage }) };
}

function runTarget(mod, ctx) {
    const context = bootCombat(ctx && ctx.combatSource);
    const wolf = { id: 2, x: 0, y: 0, z: 0, area: { x: 0, y: 0, z: 0 }, data: { kind: "creature", species: "wolf", hp: 11, taming: { status: "domesticated", role: "pet", ownerId: 1, dead: false } } };
    const hostile = { id: 9, x: 1, y: 0, z: 0, area: { x: 0, y: 0, z: 0 }, data: { kind: "person", hp: 40, maxHp: 40, tags: ["hostile"], stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } } };
    context.UF.World.addUnit(wolf);
    context.UF.World.addUnit(hostile);
    context.UF.Combat.tamedEncounter = false;
    const issued = mod.issueOrder(wolf, { type: "attack", targetId: 9 });
    if (context.UF.Rules && context.UF.Rules._setTestRoll) context.UF.Rules._setTestRoll(15);
    new context.Game_Map().update(true);
    if (context.UF.Rules && context.UF.Rules._clearTestRoll) context.UF.Rules._clearTestRoll();
    const problems = [];
    if (!issued.ok || issued.order.targetId !== 9) problems.push("stored " + JSON.stringify(issued && issued.order));
    if (!wolf.data.combat || wolf.data.combat.targetId !== 9) problems.push("target " + JSON.stringify(wolf.data.combat && wolf.data.combat.targetId));
    if (!(hostile.data.hp < 40)) problems.push("hp " + hostile.data.hp);
    return { ok: problems.length === 0, detail: problems.join("; ") };
}

function runOrderSync(mod, ctx) {
    const wolf = beast("wolf", 2, { hp: 11 });
    markTamed(wolf, "pet", 1);
    const enc = engineOf(mod, null, ctx);
    enc.addUnit(fighter(1, 6, 0));
    mod.enlist(enc, rules, [wolf]);
    mod.issueOrder(wolf, { type: "hold" });
    const peek = enc.peekAction("2");
    return { ok: !!(peek && peek.type === "hold"), detail: JSON.stringify({ record: wolf.data.taming.order, peek: peek }) };
}

function runWorldSync(mod, ctx) {
    const wolf = beast("wolf", 2, { hp: 11, x: 0, y: 0 });
    markTamed(wolf, "pet", 1);
    const enc = engineOf(mod, null, ctx);
    enc.addUnit(fighter(1, 6, 0));
    mod.enlist(enc, rules, [wolf]);
    enc.setOrder(2, { type: "follow" });
    enc.advanceReal(6000);
    const view = enc.unit("2");
    const moved = wolf.x !== 0 || wolf.y !== 0;
    const matched = !!(view && wolf.x === view.x && wolf.y === view.y);
    const apart = view ? Math.max(Math.abs(view.x - 6), Math.abs(view.y - 0)) : 99;
    return { ok: moved && matched && apart === 1, detail: "world " + wolf.x + "," + wolf.y + " enc " + (view && (view.x + "," + view.y)) };
}

function runSlams(mod, ctx) {
    const mound = beast("bog_horror", 2, { hp: 136 });
    markTamed(mound, "pet", 1);
    const profile = mod.combatProfile(rules, mound);
    const seq = profile.sequence ? profile.sequence.join(",") : "";
    const enc = engineOf(mod, constantRng(0.5), ctx);
    enc.addUnit(foe("bag", 1, 0, { hp: 200, maxHp: 200 }));
    enc.queueOrder("bag", { type: "hold" });
    mod.enlist(enc, rules, [mound]);
    enc.setOrder(2, { type: "attack", targetId: "bag" });
    rules._setTestRoll(15);
    enc.advanceReal(6000);
    clearRoll();
    const ev = enc.transcript().filter(function (row) { return row.actorId === "2" && row.swings && row.swings.length; })[0];
    const keys = ev ? ev.swings.map(function (swing) { return swing.weaponKey; }).join(",") : "";
    return { ok: seq === "slam,slam" && profile.multiattackParsed === true && keys === "slam,slam", detail: "seq " + seq + " parsed " + profile.multiattackParsed + " swings " + keys };
}

function runPack(mod, ctx) {
    const attacker = beast("wolf", 2, { hp: 11, x: 1, y: 0 });
    const ally = beast("wolf", 3, { hp: 11, x: 2, y: 1 });
    markTamed(attacker, "pet", 1);
    markTamed(ally, "pet", 1);
    const enc = engineOf(mod, constantRng(0.5), ctx);
    enc.addUnit(foe("orc", 2, 0, { hp: 40, maxHp: 40 }));
    enc.queueOrder("orc", { type: "hold" });
    mod.enlist(enc, rules, [attacker, ally]);
    enc.setOrder(2, { type: "attack", targetId: "orc" });
    enc.setOrder(3, { type: "hold" });
    rules._setTestRoll(15);
    enc.advanceReal(6000);
    clearRoll();
    const ev = enc.transcript().filter(function (row) { return row.actorId === "2" && row.swings && row.swings.length; })[0];
    const advantage = !!(ev && ev.swings[0] && ev.swings[0].advantage === true);
    return { ok: advantage, detail: JSON.stringify(ev && ev.swings && ev.swings[0]) };
}

function runRegen(mod, ctx) {
    const troll = beast("troll", 4, { hp: 74 });
    markTamed(troll, "mount", 1);
    const enc = engineOf(mod, constantRng(0.25), ctx);
    mod.enlist(enc, rules, [troll]);
    enc.setOrder(4, { type: "hold" });
    enc.advanceReal(6000);
    const view = enc.unit("4");
    return { ok: !!(view && view.hp === 84 && view.dead === false), detail: "hp " + (view && view.hp) + " dead " + (view && view.dead) };
}

function runDeathRule(mod, ctx) {
    const problems = [];
    function fight(type) {
        const troll = beast("troll", 4, { hp: 84 });
        markTamed(troll, "pet", 1);
        const enc = engineOf(mod, constantRng(0.99), ctx);
        enc.addUnit(foe("mage", 8, 0, { hp: 40, maxHp: 40, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } }));
        mod.enlist(enc, rules, [troll]);
        enc.setOrder(4, { type: "hold" });
        enc.queueOrder("mage", { type: "spell", targetId: 4, ability: "wis", dc: 30, dice: "100d1", damageType: type });
        rules._setTestRoll(10);
        enc.advanceReal(6000);
        const first = { hp: enc.unit("4").hp, dead: enc.unit("4").dead, status: troll.data.taming.status };
        enc.advanceReal(6000);
        const second = {
            hp: enc.unit("4").hp,
            dead: enc.unit("4").dead,
            status: troll.data.taming.status,
            knock: troll.data.taming.death && troll.data.taming.death.knockout
        };
        clearRoll();
        return { first: first, second: second };
    }
    const slash = fight("slashing");
    if (slash.first.dead !== false || slash.first.hp !== 0 || slash.first.status !== "domesticated") problems.push("slash r1 " + JSON.stringify(slash.first));
    if (slash.second.dead !== false || slash.second.hp !== 10 || slash.second.status !== "domesticated") problems.push("slash r2 " + JSON.stringify(slash.second));
    const fire = fight("fire");
    if (fire.first.dead !== false || fire.first.hp !== 0 || fire.first.status !== "domesticated") problems.push("fire r1 " + JSON.stringify(fire.first));
    if (fire.second.dead !== true || fire.second.status !== "dead" || fire.second.knock !== false) problems.push("fire r2 " + JSON.stringify(fire.second));
    return { ok: problems.length === 0, detail: problems.join("; ") };
}

function runLegacyGear(mod, ctx) {
    const context = bootCombat(ctx && ctx.combatSource);
    const giant = { id: 4, x: 0, y: 0, z: 0, area: { x: 0, y: 0, z: 0 }, data: { kind: "creature", srdId: "srd:creature:hill-giant", hp: 105, taming: { status: "domesticated", role: "pet", ownerId: 1, dead: false } } };
    const hostile = { id: 9, x: 1, y: 0, z: 0, area: { x: 0, y: 0, z: 0 }, data: { kind: "person", hp: 40, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } } };
    const bare = context.UF.Combat.describeAttack(giant, hostile);
    giant.data.equipment = { mainHand: "sword_long" };
    const geared = context.UF.Combat.describeAttack(giant, hostile);
    const ok = JSON.stringify(bare) === JSON.stringify(geared) && bare.weapon !== "Long sword" && bare.speed === 4;
    return { ok: ok, detail: JSON.stringify({ bare: bare, geared: geared }) };
}

function runLegacyFollow(mod, ctx) {
    const context = bootCombat(ctx && ctx.combatSource);
    const owner = { id: 1, x: 6, y: 0, z: 0, area: { x: 0, y: 0, z: 0 }, data: { kind: "colonist", hp: 20, maxHp: 20, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } } };
    const wolf = { id: 2, x: 0, y: 0, z: 0, area: { x: 0, y: 0, z: 0 }, data: { kind: "creature", species: "wolf", hp: 11, taming: { status: "domesticated", role: "pet", ownerId: 1, dead: false } } };
    context.UF.World.addUnit(owner);
    context.UF.World.addUnit(wolf);
    context.UF.Combat.tamedEncounter = false;
    mod.issueOrder(wolf, { type: "follow" });
    new context.Game_Map().update(true);
    const apart = Math.max(Math.abs(wolf.x - owner.x), Math.abs(wolf.y - owner.y));
    const moved = wolf.x !== 0 || wolf.y !== 0;
    return { ok: moved && apart <= 1, detail: wolf.x + "," + wolf.y + " apart " + apart };
}

function runRuntime(mod, ctx) {
    const context = bootCombat(ctx && ctx.combatSource);
    const owner = { id: 1, x: 6, y: 0, z: 0, area: { x: 0, y: 0, z: 0 }, data: { kind: "colonist", hp: 20, maxHp: 20, faction: "player", stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } } };
    const wolf = { id: 2, x: 0, y: 0, z: 0, area: { x: 0, y: 0, z: 0 }, data: { kind: "creature", species: "wolf", hp: 11, taming: { status: "domesticated", role: "pet", ownerId: 1, dead: false } } };
    context.UF.World.addUnit(owner);
    context.UF.World.addUnit(wolf);
    mod.issueOrder(wolf, { type: "follow" });
    const map = new context.Game_Map();
    for (let i = 0; i < 420; i++) map.update(true);
    const engine = context.UF.Combat.tamedEngine && context.UF.Combat.tamedEngine();
    const snap = engine && engine.unit(wolf.id);
    const apart = snap ? Math.max(Math.abs(snap.x - 6), Math.abs(snap.y - 0)) : 99;
    const matched = !!(snap && wolf.x === snap.x && wolf.y === snap.y);
    const moved = wolf.x !== 0 || wolf.y !== 0;
    const mound = { id: 7, x: 0, y: 2, z: 0, area: { x: 0, y: 0, z: 0 }, data: { kind: "creature", species: "bog_horror", hp: 136, taming: { status: "domesticated", role: "pet", ownerId: 1, dead: false } } };
    const bag = { id: 8, x: 1, y: 2, z: 0, area: { x: 0, y: 0, z: 0 }, data: { kind: "person", hp: 80, maxHp: 80, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } } };
    if (context.UF.Rules && context.UF.Rules._setTestRoll) context.UF.Rules._setTestRoll(15);
    const swung = context.UF.Combat.resolveAttack(mound, bag, { rng: function () { return 0.5; }, bypassGcd: true });
    if (context.UF.Rules && context.UF.Rules._clearTestRoll) context.UF.Rules._clearTestRoll();
    const two = !!(swung && swung.swings && swung.swings.length === 2 && swung.swings[0].weaponKey === "slam" && swung.swings[1].weaponKey === "slam");
    return {
        ok: !!(engine && snap && moved && matched && apart <= 1 && two),
        detail: "world " + wolf.x + "," + wolf.y + " snap " + (snap && (snap.x + "," + snap.y)) + " apart " + apart + " swings " + (swung && swung.swings && swung.swings.length)
    };
}

const RUNNERS = {
    membership: runMembership,
    srd: runSrd,
    gear_bonus: runGear,
    death: runDeath,
    orders: runOrders,
    natural: runNatural,
    saves: runSaves,
    target_id: runTarget,
    legacy_lookup: runTarget,
    order_sync: runOrderSync,
    world_sync: runWorldSync,
    slams: runSlams,
    pack: runPack,
    regen: runRegen,
    death_rule: runDeathRule,
    legacy_gear: runLegacyGear,
    legacy_follow: runLegacyFollow,
    runtime: runRuntime
};

function runOne(name, ctx) {
    try {
        return RUNNERS[name](ctx.party, ctx);
    } catch (err) {
        const message = err && err.message ? err.message : String(err);
        const at = err && err.stack ? err.stack.split("\n")[1] : "";
        return { ok: false, detail: message + (at ? " " + at.trim() : "") };
    }
}

function anchorsOk() {
    const files = { party: PARTY, engine: ENGINE, combat: COMBAT };
    const problems = [];
    const names = Object.keys(PROVOCATIONS);
    for (let i = 0; i < names.length; i++) {
        const spec = specOf(names[i]);
        const kinds = ["party", "engine", "combat"];
        for (let k = 0; k < kinds.length; k++) {
            const swaps = spec[kinds[k]] || [];
            if (!swaps.length) continue;
            const src = fs.readFileSync(files[kinds[k]], "utf8").replace(/\r\n/g, "\n");
            for (let s = 0; s < swaps.length; s++) {
                const count = src.split(swaps[s][0]).length - 1;
                if (count !== 1) problems.push(names[i] + " " + kinds[k] + " count " + count + " for " + swaps[s][0].slice(0, 60));
            }
        }
    }
    return { ok: problems.length === 0, detail: problems.join("; ") };
}

function main() {
    if (provokeName && provokeName !== true && NAMES.indexOf(provokeName) < 0) {
        console.log("FAIL provoke — unknown " + provokeName + " (" + NAMES.join(", ") + ")");
        process.exit(2);
    }
    const anchor = anchorsOk();
    say(anchor.ok, "provocation anchors", anchor.detail);
    if (!anchor.ok) {
        console.log("RESULT: " + passed + " passed, " + failed + " failed");
        process.exit(1);
    }

    const selected = provokeAll ? NAMES.slice() : (provokeName && provokeName !== true ? [provokeName] : []);
    if (selected.length) {
        let missed = 0;
        for (let i = 0; i < selected.length; i++) {
            const name = selected[i];
            const loaded = loadContext(name);
            if (loaded.error) {
                missed += 1;
                console.log("MISSED " + name + " — " + loaded.error);
                continue;
            }
            const result = runOne(name, loaded);
            if (result.ok) {
                missed += 1;
                console.log("MISSED " + name + " — check still passed");
            } else {
                console.log("FAIL " + name + " — " + result.detail);
                console.log("CAUGHT " + name);
            }
        }
        console.log("RESULT: " + (selected.length - missed) + " provocations caught, " + missed + " missed");
        process.exit(missed ? 1 : 0);
    }

    const live = { party: party, createEngine: sim.createEngine, combatSource: null };
    for (let i = 0; i < NAMES.length; i++) {
        const result = runOne(NAMES[i], live);
        say(result.ok, NAMES[i], result.detail);
    }
    for (let i = 0; i < NAMES.length; i++) {
        const loaded = loadContext(NAMES[i]);
        if (loaded.error) {
            say(false, "provocation " + NAMES[i] + " is caught", loaded.error);
            continue;
        }
        const result = runOne(NAMES[i], loaded);
        say(result.ok === false, "provocation " + NAMES[i] + " is caught", result.ok ? "check still passed" : result.detail);
    }
    const questions = party.QUESTIONS || [];
    const open = questions.some(function (q) { return q.id === "OQ-BG-01" && q.question && q.pmDefault; })
        && questions.some(function (q) { return q.id === "OQ-BG-02" && q.question; });
    say(open && party.ROLE_FIGHTS.pet === true && party.ROLE_FIGHTS.mount === true && party.ROLE_FIGHTS.livestock === true && party.ROLE_FIGHTS.work === true,
        "open role questions stay listed",
        questions.map(function (q) { return q.id; }).join(","));
    console.log("RESULT: " + passed + " passed, " + failed + " failed");
    process.exit(failed ? 1 : 0);
}

main();
