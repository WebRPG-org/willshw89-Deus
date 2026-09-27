"use strict";
// SIM.60.07 — a predator's adjacent strike is one UF.Rules attack.
// Catalog combat.attack is not a second damage law. Headless and seeded.
//   node tools/sim/test_wildlife_rules_damage.js
// Two source mutants (catalog subtraction restored; rules damage and catalog
// damage both applied) must fail the same oracle.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createSeededRng } = require("../../game/js/sim/rules/dice");
const { bindRules } = require("../rules/bind");

const ROOT = path.join(__dirname, "..", "..");
const PLUGIN = path.join(ROOT, "game", "js", "plugins", "DEUS_Wildlife.js");
const COMBAT = path.join(ROOT, "game", "js", "plugins", "DEUS_Combat.js");
const FIXTURE = path.join(ROOT, "tools", "sim", "fixtures", "wildlife_rules", "hunt_strike.json");
const PLUGIN_DIR = path.dirname(PLUGIN);
const SALT_PREDATOR = 0x7a;
const ANCHOR = "remainingHp = hpNow - dealt;";

const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));
const source = fs.readFileSync(PLUGIN, "utf8");

let failed = 0;
function check(name, ok, detail) {
    if (ok) console.log("PASS " + name + (detail ? " — " + detail : ""));
    else {
        failed++;
        console.log("FAIL " + name + (detail ? " — " + detail : ""));
    }
}

const FNV_OFFSET = 2166136261 >>> 0;
function fnv(h, part) {
    let v = part >>> 0;
    for (let i = 0; i < 4; i++) {
        h ^= v & 255;
        h = Math.imul(h, 16777619) >>> 0;
        v >>>= 8;
    }
    return h;
}
function hash32() {
    let h = FNV_OFFSET;
    for (let i = 0; i < arguments.length; i++) h = fnv(h, arguments[i]);
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d) >>> 0;
    return (h ^ (h >>> 12)) >>> 0;
}
function huntSeed(worldSeed, attackerId, preyId, frame) {
    return hash32(worldSeed >>> 0, SALT_PREDATOR, attackerId >>> 0, preyId >>> 0, frame >>> 0);
}

function speciesRow(id) {
    const list = catalog.wildlife && catalog.wildlife.species;
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
}

const bus = {
    events: [],
    on() {},
    emit(name, payload) { this.events.push({ name: name, payload: payload }); }
};

function installHost(g) {
    g.console = console;
    g.performance = global.performance || { now: () => 0 };
    g.process = process;
    g.Math = Math;
    function Game_Map() {}
    Game_Map.prototype.update = function() {};
    g.Game_Map = Game_Map;
    function Game_Event() {}
    Game_Event.prototype.isThrough = function() { return false; };
    g.Game_Event = Game_Event;
    function Sprite_Character() {}
    Sprite_Character.prototype.update = function() {};
    g.Sprite_Character = Sprite_Character;
    function Sprite() { this.children = []; }
    Sprite.prototype.addChild = function(child) { this.children.push(child); };
    g.Sprite = Sprite;
    function Spriteset_Map() {}
    Spriteset_Map.prototype.createCharacters = function() {};
    g.Spriteset_Map = Spriteset_Map;
    function Scene_Boot() {}
    Scene_Boot.prototype.start = function() {};
    g.Scene_Boot = Scene_Boot;
    function Scene_Map() {}
    Scene_Map.prototype.update = function() {};
    g.Scene_Map = Scene_Map;
    g.SceneManager = { _scene: null };
    g.Graphics = { frameCount: 0, boxWidth: 1280, boxHeight: 720 };
    g.Input = { keyMapper: {}, isTriggered: function() { return false; } };
    g.$ufWorldCatalog = catalog;
    g.$dataWorldCatalog = catalog;
    g.window = g;
    g.global = g;
    g.DEUS = g.UF = { Events: bus };
}

function makeWorld(seed) {
    const units = new Map();
    let nextId = 1;
    const area = { x: 0, y: 0 };
    return {
        state: { seed: seed >>> 0, size: 64 },
        _frame: 0,
        currentArea() { return area; },
        units() { return Array.from(units.values()); },
        unit(id) { return units.get(id) || null; },
        addUnit(spec) {
            const id = nextId++;
            const u = {
                id: id,
                name: spec.name,
                area: { x: spec.area.x, y: spec.area.y },
                x: spec.x,
                y: spec.y,
                z: 0,
                goal: null,
                data: Object.assign({}, spec.data)
            };
            units.set(id, u);
            return u;
        },
        removeUnit(id) { units.delete(id); },
        sendUnit() {},
        isDisplayed() { return false; }
    };
}

const worldGen = {
    cellInfo() {
        return { ground: "meadow", biomeId: "grassland_temperate", walkable: true, region: null };
    }
};

function place(world, species, x, y, data) {
    return world.addUnit({
        name: species,
        area: { x: 0, y: 0 },
        x: x,
        y: y,
        data: Object.assign({ kind: "creature", species: species, state: "idle" }, data)
    });
}

function predictRules(rules, attacker, target, worldSeed, frame) {
    const rng = createSeededRng(huntSeed(worldSeed, attacker.id, target.id, frame));
    const att = rules.attack(attacker, target, "bite", { rng: rng });
    if (!att || !att.hit) return { hit: false, damage: 0, natural: att ? att.natural : null, maxHit: att ? att.maxHit : null };
    const dmg = rules.damage(attacker, target, att, { rng: rng });
    return { hit: true, damage: dmg.damage, natural: att.natural, maxHit: att.maxHit };
}

function killEvents() {
    return bus.events.filter(e => e.name === "wildlife:kill");
}

// opts: { host, seed, frame, hp, plate, testRoll, combat, rulesPresent }
// host is the object whose UF.Wildlife is under test (global, or a mutant vm).
function strike(host, opts) {
    const UF = host.UF;
    const world = makeWorld(opts.seed);
    UF.World = world;
    UF.WorldGen = worldGen;
    const drops = [];
    UF.Items = {
        drop(area, x, y, id, n) { drops.push({ id: id, n: n | 0, x: x, y: y }); }
    };
    bus.events.length = 0;
    const wolf = place(world, fixture.predatorSpecies, 10, 10, { ai: "wander" });
    const preyData = { ai: "none", hp: opts.hp };
    if (opts.plate) preyData.equipment = { armor: fixture.plateArmor };
    const prey = place(world, fixture.preySpecies, 11, 10, preyData);
    const savedRules = UF.Rules;
    const savedCombat = UF.Combat;
    const savedEnabled = savedCombat ? savedCombat.enabled : null;
    if (opts.rulesPresent === false) UF.Rules = null;
    if (opts.combat === "absent") UF.Combat = null;
    else if (savedCombat) savedCombat.enabled = opts.combat === "on";
    const rules = UF.Rules;
    if (rules && typeof rules._setTestRoll === "function") {
        if (opts.testRoll == null) rules._clearTestRoll();
        else rules._setTestRoll(opts.testRoll);
    }
    const predicted = (opts.rulesPresent !== false && rules)
        ? predictRules(rules, wolf, prey, opts.seed, opts.frame)
        : null;
    const attacksBefore = savedCombat && savedCombat.stats ? (savedCombat.stats.attacks | 0) : 0;
    const calls = { attack: 0, damage: 0, key: null };
    let attackFn = null;
    let damageFn = null;
    if (rules && opts.rulesPresent !== false) {
        attackFn = rules.attack;
        damageFn = rules.damage;
        rules.attack = function(a, t, key, o) {
            calls.attack++;
            calls.key = key;
            return attackFn.call(rules, a, t, key, o);
        };
        rules.damage = function(a, t, att, o) {
            calls.damage++;
            return damageFn.call(rules, a, t, att, o);
        };
    }
    const random = Math.random;
    let randomCalls = 0;
    Math.random = function() {
        randomCalls++;
        return random();
    };
    let err = null;
    try {
        UF.Wildlife.stepPredator(opts.frame);
    } catch (e) {
        err = e;
    } finally {
        Math.random = random;
        if (rules && attackFn) {
            rules.attack = attackFn;
            rules.damage = damageFn;
            if (typeof rules._clearTestRoll === "function") rules._clearTestRoll();
        }
        UF.Rules = savedRules;
        UF.Combat = savedCombat;
        if (savedCombat) savedCombat.enabled = savedEnabled;
    }
    const tick = savedCombat && typeof savedCombat.tick === "function" ? (Number(savedCombat.tick()) || 0) : 0;
    const combatState = wolf.data && wolf.data.combat;
    return {
        err: err,
        wolf: wolf,
        prey: prey,
        hp: prey.data.hp,
        alive: !!world.unit(prey.id),
        drops: drops,
        kills: killEvents(),
        calls: calls,
        randomCalls: randomCalls,
        predicted: predicted,
        attacksBefore: attacksBefore,
        attacksAfter: savedCombat && savedCombat.stats ? (savedCombat.stats.attacks | 0) : 0,
        swingReady: !!(combatState && tick >= combatState.nextAttackTick && combatState.targetId === prey.id),
        targetId: combatState ? combatState.targetId : null,
        state: wolf.data.state,
        feedUntil: wolf.data.feedUntil
    };
}

function yieldsOf(id) {
    const row = speciesRow(id);
    const out = [];
    const yields = (row && row.yields) || {};
    for (const key of Object.keys(yields)) out.push({ id: key, n: yields[key] | 0 });
    return out;
}

function sameDrops(drops, want) {
    if (drops.length !== want.length) return false;
    const seen = {};
    for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        seen[d.id] = (seen[d.id] || 0) + d.n;
    }
    for (let i = 0; i < want.length; i++) {
        if (seen[want[i].id] !== want[i].n) return false;
    }
    return true;
}

installHost(global);
bindRules(global);
require(COMBAT);
require(PLUGIN);

const wolfRow = speciesRow(fixture.predatorSpecies);
const hareRow = speciesRow(fixture.preySpecies);
const catalogAttack = wolfRow && wolfRow.combat ? wolfRow.combat.attack : null;
const hareYields = yieldsOf(fixture.preySpecies);

check("fixture species", !!wolfRow && !!hareRow && hareRow.kind !== "predator",
    (wolfRow && wolfRow.id) + " -> " + (hareRow && hareRow.id));
check("source routes the strike through UF.Rules",
    source.indexOf("Rules.attack") >= 0 && source.indexOf("Rules.damage") >= 0 && source.indexOf("atkDmg") < 0);
check("mutant anchor is unique", source.split(ANCHOR).length === 2, "count " + (source.split(ANCHOR).length - 1));

const probeSeed = fixture.worldSeed >>> 0;
const probeFrame = fixture.frame | 0;
const probe = strike(global, {
    seed: probeSeed, frame: probeFrame, hp: fixture.partialHp, combat: "off", testRoll: fixture.hitRoll
});
check("probe strike did not throw", !probe.err, probe.err && probe.err.stack);
check("hit roll is a non-critical hit on bare AC",
    !!(probe.predicted && probe.predicted.hit && probe.predicted.natural !== 20 && probe.predicted.natural !== 1),
    probe.predicted ? ("natural " + probe.predicted.natural + " damage " + probe.predicted.damage) : "no prediction");
check("catalog attack is outside one bite",
    typeof catalogAttack === "number" && probe.predicted && catalogAttack > probe.predicted.maxHit && catalogAttack !== probe.predicted.damage,
    "catalog " + catalogAttack + " maxHit " + (probe.predicted && probe.predicted.maxHit));

const plate = strike(global, {
    seed: probeSeed, frame: probeFrame, hp: fixture.partialHp, plate: true, combat: "off", testRoll: fixture.hitRoll
});
check("plate turns that roll into a miss",
    !!(plate.predicted && plate.predicted.hit === false && plate.hp === fixture.partialHp && plate.alive && plate.kills.length === 0),
    plate.predicted ? ("natural " + plate.predicted.natural + " hp " + plate.hp) : "no prediction");
check("bare hit writes the rules damage once",
    !probe.err && probe.predicted && probe.predicted.hit && probe.hp === fixture.partialHp - probe.predicted.damage
        && probe.calls.attack === 1 && probe.calls.damage === 1 && probe.calls.key === "bite"
        && probe.hp !== fixture.partialHp - catalogAttack && probe.randomCalls === 0 && probe.alive,
    "hp " + probe.hp + " want " + (fixture.partialHp - (probe.predicted ? probe.predicted.damage : 0))
        + " key " + probe.calls.key + " calls " + probe.calls.attack + "/" + probe.calls.damage);
const probeAgain = strike(global, {
    seed: probeSeed, frame: probeFrame, hp: fixture.partialHp, combat: "off", testRoll: fixture.hitRoll
});
check("the same hit roll repeats",
    !probeAgain.err && probeAgain.hp === probe.hp && probeAgain.predicted && probe.predicted
        && probeAgain.predicted.damage === probe.predicted.damage && probeAgain.calls.attack === 1,
    "hp " + probe.hp + " / " + probeAgain.hp);

const miss = strike(global, {
    seed: probeSeed, frame: probeFrame, hp: fixture.partialHp, combat: "off", testRoll: fixture.missRoll
});
check("natural 1 deals no damage",
    !miss.err && miss.predicted && miss.predicted.hit === false && miss.hp === fixture.partialHp && miss.alive
        && miss.kills.length === 0 && miss.state !== "feed" && miss.calls.damage === 0 && miss.randomCalls === 0,
    "hp " + miss.hp + " state " + miss.state + " natural " + (miss.predicted && miss.predicted.natural));

const again = strike(global, {
    seed: probeSeed, frame: probeFrame, hp: fixture.partialHp, combat: "off", testRoll: null
});
const again2 = strike(global, {
    seed: probeSeed, frame: probeFrame, hp: fixture.partialHp, combat: "off", testRoll: null
});
check("same seed and frame deal the same damage",
    again.hp === again2.hp && again.predicted && again2.predicted
        && again.predicted.damage === again2.predicted.damage
        && again.predicted.natural === again2.predicted.natural
        && again.hp === fixture.partialHp - again.predicted.damage
        && again.randomCalls === 0 && again2.randomCalls === 0,
    "hp " + again.hp + " / " + again2.hp + " natural " + (again.predicted && again.predicted.natural));

let differed = false;
let differDetail = "";
for (let s = 1; s <= 12 && !differed; s++) {
    const a = strike(global, { seed: s, frame: probeFrame, hp: fixture.partialHp, combat: "off", testRoll: null });
    const b = strike(global, { seed: s + 100, frame: probeFrame, hp: fixture.partialHp, combat: "off", testRoll: null });
    if (a.predicted && b.predicted && (a.predicted.natural !== b.predicted.natural || a.predicted.damage !== b.predicted.damage)) {
        differed = a.hp === fixture.partialHp - a.predicted.damage && b.hp === fixture.partialHp - b.predicted.damage;
        differDetail = "seeds " + s + "/" + (s + 100) + " natural " + a.predicted.natural + "/" + b.predicted.natural
            + " damage " + a.predicted.damage + "/" + b.predicted.damage;
    }
}
check("different seeds can differ", differed, differDetail || "no differing pair");

const noCombat = strike(global, {
    seed: probeSeed, frame: probeFrame, hp: fixture.partialHp, combat: "absent", testRoll: fixture.hitRoll
});
check("combat absent still uses UF.Rules once",
    !noCombat.err && noCombat.predicted && noCombat.hp === fixture.partialHp - noCombat.predicted.damage
        && noCombat.calls.attack === 1 && noCombat.calls.key === "bite" && noCombat.targetId == null,
    "hp " + noCombat.hp + " target " + noCombat.targetId);

function expectKill(row, label) {
    const fed = row.state === "feed" && row.feedUntil === probeFrame + 90;
    const oneKill = row.kills.length === 1 && row.kills[0].payload && row.kills[0].payload.predator === row.wolf
        && row.kills[0].payload.prey === row.prey;
    check(label,
        !row.err && !row.alive && fed && oneKill && sameDrops(row.drops, hareYields) && row.randomCalls === 0,
        "alive " + row.alive + " state " + row.state + " until " + row.feedUntil
            + " kills " + row.kills.length + " drops " + JSON.stringify(row.drops));
}

expectKill(strike(global, {
    seed: probeSeed, frame: probeFrame, hp: fixture.killHp, combat: "off", testRoll: fixture.hitRoll
}), "kill, yields, wildlife:kill and feeding without combat");

const withCombat = strike(global, {
    seed: probeSeed, frame: probeFrame, hp: fixture.partialHp, combat: "on", testRoll: fixture.hitRoll
});
const hareMax = global.UF.Rules.hitPoints(global.UF.Rules.creatureOf(withCombat.prey)).hp;
expectKill(withCombat, "kill path with combat enabled");
check("combat enabled applies the rules damage once",
    !withCombat.err && withCombat.predicted && withCombat.predicted.hit
        && withCombat.hp === hareMax - withCombat.predicted.damage
        && withCombat.hp !== hareMax - catalogAttack
        && withCombat.hp !== hareMax - withCombat.predicted.damage - catalogAttack
        && withCombat.calls.attack === 1 && withCombat.calls.damage === 1
        && withCombat.attacksAfter === withCombat.attacksBefore
        && withCombat.targetId === withCombat.prey.id
        && withCombat.swingReady === false,
    "hp " + withCombat.hp + " max " + hareMax + " rules " + (withCombat.predicted && withCombat.predicted.damage)
        + " swingReady " + withCombat.swingReady + " attacks " + withCombat.attacksBefore + "->" + withCombat.attacksAfter);

const combatMiss = strike(global, {
    seed: probeSeed, frame: probeFrame, hp: fixture.partialHp, combat: "on", testRoll: fixture.missRoll
});
check("combat enabled miss does not kill or swing",
    !combatMiss.err && combatMiss.alive && combatMiss.predicted && combatMiss.predicted.hit === false
        && combatMiss.hp === hareMax && combatMiss.kills.length === 0 && combatMiss.drops.length === 0
        && combatMiss.state !== "feed" && combatMiss.swingReady === false
        && combatMiss.attacksAfter === combatMiss.attacksBefore && combatMiss.calls.damage === 0,
    "hp " + combatMiss.hp + " state " + combatMiss.state + " swingReady " + combatMiss.swingReady);

const catalogStrike = strike(global, {
    seed: probeSeed, frame: probeFrame, hp: fixture.partialHp, combat: "absent", rulesPresent: false
});
const catalogAgain = strike(global, {
    seed: probeSeed + 99, frame: probeFrame + 7, hp: fixture.partialHp, combat: "absent", rulesPresent: false
});
check("rules absent subtracts catalog attack once, deterministically",
    !catalogStrike.err && !catalogAgain.err
        && catalogStrike.hp === fixture.partialHp - catalogAttack
        && catalogAgain.hp === fixture.partialHp - catalogAttack
        && catalogStrike.calls.attack === 0 && catalogStrike.alive
        && catalogStrike.randomCalls === 0 && catalogAgain.randomCalls === 0,
    "hp " + catalogStrike.hp + " / " + catalogAgain.hp + " catalog " + catalogAttack);

const catalogKill = strike(global, {
    seed: 1, frame: 3, hp: catalogAttack, combat: "absent", rulesPresent: false
});
check("rules absent still kills, drops, emits and feeds",
    !catalogKill.err && !catalogKill.alive && catalogKill.state === "feed" && catalogKill.feedUntil === 3 + 90
        && catalogKill.kills.length === 1 && sameDrops(catalogKill.drops, hareYields) && catalogKill.randomCalls === 0,
    "state " + catalogKill.state + " until " + catalogKill.feedUntil + " drops " + JSON.stringify(catalogKill.drops));

function bootMutant(src) {
    const sb = {};
    installHost(sb);
    sb.require = require;
    sb.__dirname = PLUGIN_DIR;
    sb.module = { exports: {} };
    sb.exports = sb.module.exports;
    bindRules(sb);
    vm.createContext(sb);
    vm.runInContext(src, sb, { filename: PLUGIN, timeout: 20000 });
    return sb;
}

function mutantCaught(name, replacement) {
    const count = source.split(ANCHOR).length - 1;
    if (count !== 1) return { ok: false, detail: "anchor count " + count };
    const src = source.replace(ANCHOR, replacement);
    let sb = null;
    try {
        sb = bootMutant(src);
    } catch (e) {
        return { ok: false, detail: "mutant did not boot: " + (e && e.stack) };
    }
    const row = strike(sb, {
        seed: probeSeed, frame: probeFrame, hp: fixture.partialHp, combat: "absent", testRoll: fixture.hitRoll
    });
    const want = row.predicted ? fixture.partialHp - row.predicted.damage : null;
    const caught = !row.err && row.predicted && row.predicted.hit && row.hp !== want && row.calls.attack === 1;
    return {
        ok: caught,
        detail: "hp " + row.hp + " rules hp " + want + " err " + (row.err && row.err.message)
    };
}

const catalogMutant = mutantCaught("catalog_subtraction", "remainingHp = hpNow - catalogAttack(sp);");
check("mutant catalog_subtraction is caught", catalogMutant.ok, catalogMutant.detail);
const doubleMutant = mutantCaught("double_apply", "remainingHp = hpNow - dealt - catalogAttack(sp);");
check("mutant double_apply is caught", doubleMutant.ok, doubleMutant.detail);

console.log((failed === 0 ? "OK" : "FAILED") + " " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
