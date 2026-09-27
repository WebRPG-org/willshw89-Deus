"use strict";
// WG.00.38 — capture and domestication. Headless and seeded.
//   node tools/taming/test_taming.js
// Mutants that must fail this oracle: an equipment slot, a skipped SRD check,
// tamed state dropped on load, a tamed animal counted as wild as well.

const fs = require("fs");
const path = require("path");
const Module = require("module");
const vm = require("vm");
const { bindRules } = require("../rules/bind");
const taming = require("../../game/js/sim/taming");

const ROOT = path.join(__dirname, "..", "..");
const SIM = path.join(ROOT, "game", "js", "sim", "taming");
const PLUGIN = path.join(ROOT, "game", "js", "plugins", "DEUS_Taming.js");
const WILDLIFE = path.join(ROOT, "game", "js", "plugins", "DEUS_Wildlife.js");

const CAPTURE_ANCHOR = "const rolled = rules.check(actor, cfg.ability, dc, checkCall); // AX_SRD_CHECK";
const CAPTURE_MUTANT = "const rolled = { ok: true, total: dc, roll: 20, dc: dc, abilityMod: 0, profBonus: 0, abilityKey: cfg.ability }; // AX_SRD_CHECK";
const GEAR_ANCHOR = "return NO_CREATURE_SLOTS; // AX_GEAR_SLOTS";
const GEAR_MUTANT = "return [\"barding\"]; // AX_GEAR_SLOTS";
const LOAD_ANCHOR = "unit.data.taming = record.copyRecord(row.taming); // AX_LOAD_STATE";
const LOAD_MUTANT = "unit.data.taming = null; // AX_LOAD_STATE";
const CENSUS_ANCHOR = "domestic += 1; // AX_CENSUS_DOMESTIC";
const CENSUS_MUTANT = "domestic += 1; wild += 1; // AX_CENSUS_DOMESTIC";
const STRIKE_ANCHOR = "remainingHp = hpNow - dealt;";

let failed = 0;
function check(name, ok, detail) {
    if (ok) console.log("PASS " + name + (detail ? " — " + detail : ""));
    else {
        failed += 1;
        console.log("FAIL " + name + (detail ? " — " + detail : ""));
    }
}

function sameJson(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

function handler(over) {
    const o = over || {};
    const faction = o.faction || "home";
    return {
        id: o.id == null ? 1 : o.id,
        name: "Handler",
        data: {
            kind: "colonist",
            faction: faction,
            factionId: faction,
            level: 1,
            stats: { str: 10, dex: 10, con: 10, int: 10, wis: o.wis == null ? 10 : o.wis, cha: 10 },
            skillProficiencies: o.proficient === false ? [] : ["Animal Handling"]
        }
    };
}

function beast(species, over) {
    const o = over || {};
    const data = {
        kind: "creature",
        species: species,
        hp: o.hp == null ? 4 : o.hp
    };
    if (o.maxHp != null) data.maxHp = o.maxHp;
    if (o.conditions) data.conditions = o.conditions;
    if (o.trapped) data.trapped = true;
    if (o.subdued) data.subdued = true;
    if (o.dead) data.dead = true;
    if (o.srdId) data.srdId = o.srdId;
    if (o.creatureType) data.creatureType = o.creatureType;
    return {
        id: o.id == null ? 2 : o.id,
        name: species,
        area: { x: 0, y: 0 },
        x: o.x || 0,
        y: o.y || 0,
        data: data
    };
}

function mappedActions(block) {
    return (block.actions || []).map(function (action) {
        return {
            name: action.name,
            key: action.key,
            toHit: action.toHit,
            dice: action.dice,
            damageType: action.damageType,
            attackKind: action.attackKind,
            reach: action.reach
        };
    });
}

function loadMutant(fileName, from, to) {
    const filename = path.join(SIM, fileName);
    const real = fs.readFileSync(filename, "utf8");
    const count = real.split(from).length - 1;
    if (count !== 1) return { error: fileName + " anchor count " + count };
    const m = new Module(filename);
    m.filename = filename;
    m.paths = Module._nodeModulePaths(path.dirname(filename));
    m._compile(real.replace(from, to), filename);
    return { exports: m.exports };
}

const rules = bindRules({});
const prof = rules.proficiencyBonus(1);

check("SRD ladder", rules.dc("easy") === 10 && rules.dc("medium") === 15, "easy " + rules.dc("easy") + " medium " + rules.dc("medium"));
check("PM capture names use that ladder",
    taming.DEFAULTS.captureDc.knockout === "easy"
    && taming.DEFAULTS.captureDc.trapped === "easy"
    && taming.DEFAULTS.captureDc.restrained === "medium"
    && taming.DEFAULTS.captureDc.grappled === "medium"
    && taming.DEFAULTS.captureDc.subdued === "medium"
    && taming.DEFAULTS.handlingDc === "easy");
check("owner questions are listed and not answered",
    Array.isArray(taming.QUESTIONS) && taming.QUESTIONS.length >= 8
    && taming.QUESTIONS.every(function (q) { return q.question && q.pmDefault && q.id; }));

const random = Math.random;
let randomCalls = 0;
Math.random = function () {
    randomCalls += 1;
    return random();
};

function fresh(opts) {
    return taming.createTaming(rules, opts || {});
}

const actor = handler();
const standing = beast("deer", { id: 2, hp: 8 });
const missed = fresh().attemptCapture(actor, standing, "knockout", { roll: 20 });
check("standing deer is not subdued", missed.ok === false && missed.reason === "NOT_SUBDUED" && !standing.data.taming,
    missed.reason);

const person = { id: 7, name: "Colonist", data: { kind: "colonist", hp: 0, faction: "home", stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } } };
const personTry = fresh().attemptCapture(actor, person, "knockout", { roll: 20 });
check("humanoid colonist is refused", personTry.ok === false && personTry.reason === "HUMANOID" && !person.data.taming, personTry.reason);

const commoner = beast("deer", { id: 8, hp: 0, srdId: "srd:creature:commoner" });
delete commoner.data.species;
const commonerTry = fresh({ humanoidTypes: { "srd:creature:commoner": "humanoid" } }).attemptCapture(actor, commoner, "knockout", { roll: 20 });
check("SRD humanoid type is refused", commonerTry.ok === false && commonerTry.reason === "HUMANOID", commonerTry.reason);

const corpse = beast("deer", { id: 9, hp: -4 });
const corpseTry = fresh().attemptCapture(actor, corpse, "knockout", { roll: 20 });
check("dead deer is refused", corpseTry.ok === false && corpseTry.reason === "DEAD", corpseTry.reason + " hp " + corpse.data.hp);

const low = beast("deer", { id: 3, hp: 0 });
const lowTry = fresh().attemptCapture(actor, low, "knockout", { roll: 1, hour: 0 });
check("low Animal Handling roll fails and does not capture",
    lowTry.ok === false && lowTry.reason === "CHECK_FAILED" && lowTry.check && lowTry.check.roll === 1
    && lowTry.check.total < lowTry.dc && lowTry.check.dc === lowTry.dc && !low.data.taming,
    "total " + (lowTry.check && lowTry.check.total) + " dc " + lowTry.dc);

const deerBlock = rules.creatureOf(low);
const deerCr = deerBlock.challenge && deerBlock.challenge.rating;
const deerDc = rules.dc(taming.DEFAULTS.captureDc.knockout) + Math.floor((deerCr || 0) * taming.DEFAULTS.crDcPerPoint);
check("knockout DC follows the ladder plus challenge rating", lowTry.dc === deerDc, "dc " + lowTry.dc + " want " + deerDc + " cr " + deerCr);
check("proficient handler adds the SRD proficiency bonus", lowTry.check.profBonus === prof && lowTry.check.abilityMod === 0,
    "prof " + lowTry.check.profBonus + " mod " + lowTry.check.abilityMod);

const bare = handler({ proficient: false, id: 4 });
const bareTry = fresh().attemptCapture(bare, beast("deer", { id: 5, hp: 0 }), "knockout", { roll: 1 });
check("untrained handler has no proficiency bonus", bareTry.check && bareTry.check.profBonus === 0 && bareTry.ok === false,
    "prof " + (bareTry.check && bareTry.check.profBonus));

const winRoll = lowTry.dc - lowTry.check.abilityMod - lowTry.check.profBonus;
const caught = beast("deer", { id: 6, hp: 0 });
const won = fresh().attemptCapture(actor, caught, "knockout", { roll: winRoll, hour: 2 });
check("meeting the DC captures",
    winRoll >= 1 && winRoll <= 20 && won.ok === true && won.reason === "CAPTURED"
    && won.check.roll === winRoll && won.check.total >= won.dc
    && caught.data.taming && caught.data.taming.status === "captive"
    && caught.data.taming.ownerId === actor.id && caught.data.taming.factionId === "home"
    && caught.data.taming.saddleMark === null,
    "roll " + winRoll + " total " + (won.check && won.check.total) + " dc " + won.dc);
const again = fresh().attemptCapture(actor, caught, "knockout", { roll: 20 });
check("a captive is not captured twice", again.ok === false && again.reason === "ALREADY_HELD", again.reason);

const restrained = beast("deer", { id: 12, hp: 8, conditions: ["Restrained"] });
const restrainFail = fresh().attemptCapture(actor, restrained, "knockout", { roll: 20 });
const restrainDc = rules.dc("medium") + Math.floor((deerCr || 0) * taming.DEFAULTS.crDcPerPoint);
const restrainRoll = restrainDc - prof;
const restrainTry = fresh().attemptCapture(actor, beast("deer", { id: 13, hp: 8, conditions: ["restrained"] }), "restrained", { roll: restrainRoll });
const restrainMiss = fresh().attemptCapture(actor, beast("deer", { id: 14, hp: 8, conditions: ["restrained"] }), "restrained", { roll: restrainRoll - 1 });
check("restrained uses the medium DC, not the knockout method",
    restrainFail.reason === "NOT_SUBDUED" && restrainTry.ok === true && restrainTry.dc === restrainDc && restrainMiss.ok === false,
    "fail " + restrainFail.reason + " dc " + restrainTry.dc + " miss " + restrainMiss.reason);

const trapped = fresh().attemptCapture(actor, beast("boar", { id: 15, hp: 6, trapped: true }), "trap", { roll: winRoll });
check("a trapped boar can be captured", trapped.ok === true && trapped.method === "trapped", trapped.reason);
const grappled = fresh().attemptCapture(actor, beast("wolf", { id: 16, hp: 11, conditions: [{ name: "Grappled" }] }), "grapple", { roll: 20 });
check("a grappled wolf can be captured", grappled.ok === true && grappled.method === "grappled", grappled.reason + " dc " + grappled.dc);
const subdued = fresh().attemptCapture(actor, beast("hare", { id: 17, hp: 3, subdued: true }), "subdue", { roll: 20 });
check("a subdued hare can be captured", subdued.ok === true && subdued.record.status === "captive", subdued.reason);

const troll = beast("troll", { id: 18, hp: 0 });
const trollBlock = rules.creatureOf(troll);
const trollCr = trollBlock.challenge.rating;
const trollDc = rules.dc("easy") + Math.floor(trollCr * taming.DEFAULTS.crDcPerPoint);
const trollMiss = fresh().attemptCapture(actor, troll, "knockout", { roll: 1 });
const trollNeed = trollDc - prof;
const trollWin = fresh().attemptCapture(actor, beast("troll", { id: 19, hp: 0 }), "knockout", { roll: trollNeed });
check("monster capture DC adds the challenge rating and still uses the check",
    trollMiss.ok === false && trollMiss.dc === trollDc && trollNeed <= 20 && trollWin.ok === true && trollWin.record.speciesId === trollBlock.id,
    "cr " + trollCr + " dc " + trollMiss.dc + " need " + trollNeed + " " + trollWin.reason);

const roles = [
    { role: "pet", species: "deer" },
    { role: "mount", species: "deer" },
    { role: "livestock", species: "wild_sheep" },
    { role: "work", species: "wolf" }
];
roles.forEach(function (row) {
    const api = fresh();
    const who = handler({ id: 30 });
    const animal = beast(row.species, { id: 40 + row.role.length, hp: 0 });
    const cap = api.attemptCapture(who, animal, "knockout", { roll: 20, hour: 0 });
    const need = api.config.carePoints[row.role];
    const hungry = api.tend(who, animal, { role: row.role, food: false, hour: 1, roll: 20 });
    const stranger = api.tend(handler({ id: 99, faction: "raiders" }), animal, { role: row.role, food: true, hour: 1, roll: 20 });
    const pointsAfterHungry = animal.data.taming.carePoints;
    let last = null;
    let early = false;
    for (let hour = 1; hour <= need; hour++) {
        last = api.tend(who, animal, { role: row.role, food: true, hour: hour, roll: 20 });
        if (hour < need && animal.data.taming.status !== "captive") early = true;
    }
    const repeat = api.tend(who, animal, { role: row.role, food: true, hour: need, roll: 20 });
    const block = rules.creatureOf(animal);
    const attacks = api.attacks(animal);
    check(row.role + " progresses only with food from the owner",
        cap.ok === true && hungry.reason === "NEEDS_FOOD" && pointsAfterHungry === 0
        && stranger.reason === "NOT_OWNER" && !early && last.reason === "DOMESTICATED"
        && animal.data.taming.status === "domesticated" && animal.data.taming.role === row.role
        && animal.data.taming.carePoints === need
        && animal.data.taming.hoursCared === need * api.config.hoursPerCarePoint
        && repeat.reason === "MAINTAINED",
        [cap.reason, hungry.reason, stranger.reason, last.reason, repeat.reason, "points " + animal.data.taming.carePoints].join(" "));
    check(row.role + " attacks stay on the SRD stat block and slots stay empty",
        attacks.length === block.actions.length && sameJson(attacks, mappedActions(block))
        && api.equipmentSlots(animal).length === 0
        && api.equip(animal, "barding", { name: "barding" }).reason === "NO_CREATURE_GEAR"
        && api.statBlock(animal).ac === block.ac,
        block.id + " actions " + attacks.length + " ac " + api.statBlock(animal).ac);
    if (row.role === "livestock") {
        const hook = api.livestockRecord(animal);
        check("livestock feeds the breeding hook",
            hook && hook.domestic === true && hook.breedingEligible === true && hook.ownerId === who.id
            && sameJson(hook.products, ["wool"]) && api.labourHook(animal) === null,
            JSON.stringify(hook && hook.products));
    }
    if (row.role === "work") {
        const labour = api.labourHook(animal);
        check("work animal exposes a haul hook and is not livestock",
            labour && labour.hauling === true && labour.labour === true && labour.ownerId === who.id
            && api.livestockRecord(animal) === null && api.domesticRecord(animal).breedingEligible === false,
            JSON.stringify(labour));
    }
    if (row.role === "pet") {
        const view = api.domesticRecord(animal);
        check("a pet is domestic without products or labour",
            view && view.domestic === true && view.breedingEligible === false && view.products.length === 0 && view.labour === false
            && api.livestockRecord(animal) === null && api.markSaddle(animal).ok === true,
            view && view.role);
        const saddled = api.statBlock(animal);
        check("saddle marker has no slot and no stats",
            saddled.saddle && saddled.saddle.visual === true && saddled.saddle.slot === null && saddled.saddle.stats === null
            && saddled.ac === block.ac && sameJson(saddled.actions, attacks)
            && !animal.data.equipment && saddled.equipmentSlots.length === 0,
            JSON.stringify(saddled.saddle));
        animal.data.equipment = { armor: "barding" };
        const ignored = api.statBlock(animal);
        check("a worn object does not enter the creature stat block",
            ignored.ac === block.ac && ignored.equipmentSlots.length === 0 && sameJson(ignored.actions, attacks));
    }
    if (row.role === "mount") {
        const marked = api.markSaddle(animal);
        check("a mount can carry the visual saddle only",
            marked.ok === true && marked.saddle.stats === null && api.statBlock(animal).ac === block.ac);
    }
});

const careApi = fresh();
const pupil = beast("deer", { id: 70, hp: 0 });
careApi.attemptCapture(actor, pupil, "knockout", { roll: 20, hour: 0 });
const failedTend = careApi.tend(actor, pupil, { role: "pet", food: true, hour: 1, roll: 1 });
const pointsAfterFail = pupil.data.taming.carePoints;
const sameHour = careApi.tend(actor, pupil, { role: "pet", food: true, hour: 1, roll: 20 });
const nextHour = careApi.tend(actor, pupil, { role: "pet", food: true, hour: 2, roll: 20 });
check("a failed handling check consumes the hour and does not grant care",
    failedTend.reason === "CHECK_FAILED" && pointsAfterFail === 0
    && sameHour.reason === "ALREADY_TENDED" && nextHour.reason === "CARED" && pupil.data.taming.carePoints === 1,
    [failedTend.reason, sameHour.reason, nextHour.reason].join(" "));
const otherRole = careApi.tend(actor, pupil, { role: "mount", food: true, hour: 3, roll: 20 });
check("the training role stays the one already started", otherRole.reason === "ROLE_LOCKED" && pupil.data.taming.role === "pet", otherRole.reason);

const countsApi = fresh();
const wildA = beast("deer", { id: 81, hp: 4 });
const wildB = beast("hare", { id: 82, hp: 2 });
const pet = beast("wolf", { id: 83, hp: 0 });
const pen = beast("boar", { id: 84, hp: 0 });
countsApi.attemptCapture(actor, pet, "knockout", { roll: 20, hour: 0 });
for (let hour = 1; hour <= countsApi.config.carePoints.pet; hour++) {
    countsApi.tend(actor, pet, { role: "pet", food: true, hour: hour, roll: 20 });
}
countsApi.attemptCapture(actor, pen, "knockout", { roll: 20, hour: 0 });
const counts = countsApi.census([wildA, wildB, pet, pen, actor]);
check("wild and domestic counts do not double-count",
    counts.wild === 2 && counts.domestic === 1 && counts.captive === 1 && counts.total === 4
    && counts.byRole.pet === 1 && counts.byRole.work === 0,
    JSON.stringify(counts));

const owned = handler({ id: 1 });
const rival = handler({ id: 3, faction: "raiders" });
check("the owner may not hunt the captive or the pet",
    countsApi.mayHunt(owned, pen) === false && countsApi.mayHunt(owned, pet) === false && countsApi.mayHunt(owned, wildA) === true);
check("another faction is not refused an explicit hunt by mayHunt",
    countsApi.mayHunt(rival, pet) === true && countsApi.mayHunt(rival, wildA) === true);
check("hunt jobs of the owner are refused and other jobs are not",
    taming.refuseHuntJob({ type: "hunt", owner: owned.id, params: { unitId: pet.id } }, function (id) {
        return id === owned.id ? owned : id === pet.id ? pet : id === wildA.id ? wildA : null;
    }) === true
    && taming.refuseHuntJob({ type: "hunt", owner: rival.id, params: { unitId: pet.id } }, function (id) {
        return id === rival.id ? rival : id === pet.id ? pet : null;
    }) === false
    && taming.refuseHuntJob({ type: "move", owner: owned.id, params: { unitId: pet.id } }, function () { return pet; }) === false
    && taming.refuseHuntJob({ type: "hunt", owner: owned.id, params: { unitId: wildA.id } }, function (id) {
        return id === owned.id ? owned : wildA;
    }) === false);

const summary = { prey: 2, monsters: 0, predators: 1, creatures: 3, bySpecies: { deer: 2, wolf: 1 } };
const sameSummary = taming.excludeWithdrawnFromSummary(summary, [wildA, wildB], function (unit) {
    return { id: unit.data.species, kind: "grazer", prey: true };
});
const shifted = taming.excludeWithdrawnFromSummary(summary, [wildA, pet, pen], function (unit) {
    if (unit.data.species === "wolf") return { id: "wolf", kind: "predator", prey: false };
    return { id: unit.data.species, kind: "grazer", prey: true };
});
check("an untouched summary object is returned as-is", sameSummary === summary);
check("held animals leave the wild summary",
    shifted !== summary && shifted.prey === 1 && shifted.predators === 0 && shifted.creatures === 1
    && shifted.domestic === 1 && shifted.captive === 1 && shifted.bySpecies.deer === 2 && shifted.bySpecies.wolf === 0,
    JSON.stringify(shifted));

const snap = JSON.parse(JSON.stringify(pet.data.taming));
const blob = JSON.parse(JSON.stringify(countsApi.exportState([pet, pen, wildA])));
check("export keeps captive and domestic rows only", blob.version === 1 && blob.rows.length === 2);
pet.data.taming = null;
pen.data.taming = null;
const bad = countsApi.importState([pet], { version: 9, rows: [] });
check("a bad save version does not wipe state", bad.ok === false && pet.data.taming === null);
const loaded = countsApi.importState([pet, pen], blob);
check("save and load round-trip the tamed state",
    loaded.ok === true && loaded.applied === 2 && sameJson(pet.data.taming, snap) && pen.data.taming.status === "captive",
    loaded.reason + " applied " + loaded.applied);
const worldShape = JSON.parse(JSON.stringify(pet.data));
check("unit data itself round-trips the taming record", sameJson(worldShape.taming, snap));

const neglected = fresh({ defaults: { neglect: { enabled: true, hoursWithoutCare: 48, revertsTo: "wild" } } });
const kept = fresh();
const sheep = beast("wild_sheep", { id: 90, hp: 0 });
const sheep2 = beast("wild_sheep", { id: 91, hp: 0 });
neglected.attemptCapture(actor, sheep, "knockout", { roll: 20, hour: 0 });
kept.attemptCapture(actor, sheep2, "knockout", { roll: 20, hour: 0 });
const sheepNeed = neglected.config.carePoints.livestock;
for (let hour = 1; hour <= sheepNeed; hour++) {
    neglected.tend(actor, sheep, { role: "livestock", food: true, hour: hour, roll: 20 });
    kept.tend(actor, sheep2, { role: "livestock", food: true, hour: hour, roll: 20 });
}
const cared = neglected.tickNeglect([sheep], sheepNeed + 47);
neglected.tend(actor, sheep, { hour: sheepNeed + 10 });
const afterCare = neglected.tickNeglect([sheep], sheepNeed + 48);
const reverted = neglected.tickNeglect([sheep], sheepNeed + 10 + 48);
const still = kept.tickNeglect([sheep2], 10000);
check("neglect is off unless the data enables it",
    cared[0].reverted === false && afterCare[0].reverted === false && reverted[0].reverted === true
    && reverted[0].status === "wild" && sheep.data.taming.status === "wild"
    && still[0].reason === "DISABLED" && sheep2.data.taming.status === "domesticated",
    [cared[0].reason, afterCare[0].reason, reverted[0].status, still[0].reason].join(" "));
const afterRevert = neglected.census([sheep]);
check("a reverted animal counts as wild again", afterRevert.wild === 1 && afterRevert.domestic === 0, JSON.stringify(afterRevert));
check("a reverted animal is omitted from the captive save", neglected.exportState([sheep]).rows.length === 0);

const seedA = fresh({ seed: 42 });
const seedB = fresh({ seed: 42 });
const seedC = fresh({ seed: 99 });
const seedActor = handler();
const ra = seedA.attemptCapture(seedActor, beast("deer", { id: 2, hp: 0 }), "knockout", { hour: 0 });
const rb = seedB.attemptCapture(handler(), beast("deer", { id: 2, hp: 0 }), "knockout", { hour: 0 });
const rc = seedC.attemptCapture(handler(), beast("deer", { id: 2, hp: 0 }), "knockout", { hour: 0 });
const ra2 = seedA.attemptCapture(seedActor, beast("boar", { id: 8, hp: 0 }), "knockout");
const rb2 = seedB.attemptCapture(handler(), beast("boar", { id: 8, hp: 0 }), "knockout");
check("the same seed repeats the check", ra.ok === rb.ok && sameJson(ra.check, rb.check) && sameJson(ra2.check, rb2.check),
    "roll " + (ra.check && ra.check.roll) + " / " + (rb.check && rb.check.roll));
let differed = !!(rc.check && ra.check && rc.check.roll !== ra.check.roll);
let differDetail = "rolls " + (ra.check && ra.check.roll) + " / " + (rc.check && rc.check.roll);
if (!differed) {
    for (let seed = 1; seed <= 24 && !differed; seed++) {
        const left = fresh({ seed: seed }).attemptCapture(handler(), beast("deer", { id: 2, hp: 0 }), "knockout");
        const right = fresh({ seed: seed + 100 }).attemptCapture(handler(), beast("deer", { id: 2, hp: 0 }), "knockout");
        if (left.check && right.check && left.check.roll !== right.check.roll) {
            differed = true;
            differDetail = "seeds " + seed + "/" + (seed + 100) + " rolls " + left.check.roll + "/" + right.check.roll;
        }
    }
}
check("different seeds can differ", differed, differDetail);
check("capture and care did not call Math.random", randomCalls === 0, "calls " + randomCalls);

function anchorCount(fileName, anchor) {
    return fs.readFileSync(path.join(SIM, fileName), "utf8").split(anchor).length - 1;
}
check("mutant anchors are unique",
    anchorCount("capture.js", CAPTURE_ANCHOR) === 1
    && anchorCount("gear.js", GEAR_ANCHOR) === 1
    && anchorCount("save.js", LOAD_ANCHOR) === 1
    && anchorCount("census.js", CENSUS_ANCHOR) === 1);
check("wildlife strike anchor is still unique",
    fs.readFileSync(WILDLIFE, "utf8").split(STRIKE_ANCHOR).length === 2);

const captureMutant = loadMutant("capture.js", CAPTURE_ANCHOR, CAPTURE_MUTANT);
const skipBeast = beast("deer", { id: 61, hp: 0 });
let skipResult = null;
let skipError = captureMutant.error || null;
if (!skipError) {
    try {
        skipResult = captureMutant.exports.attemptCapture(rules, fresh().config, actor, skipBeast, "knockout", { roll: 1 });
    } catch (err) {
        skipError = err && err.stack;
    }
}
check("mutant skip_srd_check is caught",
    !skipError && lowTry.ok === false && skipResult && skipResult.ok === true && skipResult.reason === "CAPTURED",
    skipError || (skipResult && skipResult.reason));

const gearMutant = loadMutant("gear.js", GEAR_ANCHOR, GEAR_MUTANT);
check("mutant allow_equipment_slot is caught",
    !gearMutant.error && fresh().equipmentSlots().length === 0
    && gearMutant.exports && gearMutant.exports.equipmentSlots().length === 1
    && gearMutant.exports.equipmentSlots()[0] === "barding",
    gearMutant.error || JSON.stringify(gearMutant.exports && gearMutant.exports.equipmentSlots()));

const saveMutant = loadMutant("save.js", LOAD_ANCHOR, LOAD_MUTANT);
const saveUnit = beast("wolf", { id: pet.id, hp: 0 });
saveUnit.data.taming = null;
let saveError = saveMutant.error || null;
let saveApplied = null;
if (!saveError) {
    try {
        saveApplied = saveMutant.exports.importState([saveUnit], blob);
    } catch (err) {
        saveError = err && err.stack;
    }
}
check("mutant lose_tamed_state_on_load is caught",
    !saveError && saveApplied && saveApplied.ok === true && saveUnit.data.taming == null
    && pet.data.taming && pet.data.taming.status === "domesticated",
    saveError || (saveUnit.data && JSON.stringify(saveUnit.data.taming)));

const censusMutant = loadMutant("census.js", CENSUS_ANCHOR, CENSUS_MUTANT);
let censusError = censusMutant.error || null;
let censusBad = null;
if (!censusError) {
    try {
        censusBad = censusMutant.exports.census([wildA, wildB, pet, pen]);
    } catch (err) {
        censusError = err && err.stack;
    }
}
check("mutant double_count_wild is caught",
    !censusError && counts.wild === 2 && censusBad && censusBad.domestic === 1 && censusBad.wild === 3,
    censusError || JSON.stringify(censusBad));

function bootWildlife() {
    const events = [];
    const deer = {
        id: 2, name: "deer", area: { x: 0, y: 0 }, x: 9, y: 0,
        data: { kind: "creature", species: "deer", hp: 4, ai: "wander" }
    };
    const tameDeer = {
        id: 3, name: "tame deer", area: { x: 0, y: 0 }, x: 2, y: 0,
        data: { kind: "creature", species: "deer", hp: 4, taming: { status: "captive", role: null, ownerId: 1, factionId: "home" } }
    };
    const tameWolf = {
        id: 4, name: "tame wolf", area: { x: 0, y: 0 }, x: 1, y: 0,
        data: { kind: "creature", species: "wolf", hp: 11, taming: { status: "domesticated", role: "pet", ownerId: 1, factionId: "home" } }
    };
    const wildWolf = {
        id: 5, name: "wolf", area: { x: 0, y: 0 }, x: 20, y: 0,
        data: { kind: "creature", species: "wolf", hp: 11, ai: "wander" }
    };
    const owner = { id: 1, name: "owner", area: { x: 0, y: 0 }, x: 0, y: 1, data: { kind: "colonist", faction: "home", factionId: "home" } };
    const rivalUnit = { id: 6, name: "rival", area: { x: 0, y: 0 }, x: 4, y: 0, data: { kind: "colonist", faction: "raiders", factionId: "raiders" } };
    const units = [deer, tameDeer, tameWolf, wildWolf, owner, rivalUnit];
    const world = {
        state: {
            seed: 1,
            jobs: {
                list: [
                    { type: "hunt", state: "travel", params: { unitId: deer.id }, assigned: owner.id },
                    { type: "hunt", state: "travel", params: { unitId: tameDeer.id }, assigned: owner.id },
                    { type: "hunt", state: "travel", params: { unitId: tameWolf.id }, assigned: rivalUnit.id }
                ]
            }
        },
        currentArea: function () { return { x: 0, y: 0 }; },
        units: function () { return units; },
        unit: function (id) {
            for (let i = 0; i < units.length; i++) if (units[i].id === id) return units[i];
            return null;
        }
    };
    const sb = {
        console: console,
        process: process,
        require: require,
        Math: Math,
        performance: { now: function () { return 0; } },
        $ufWorldCatalog: {
            wildlife: {
                species: [
                    { id: "deer", name: "Deer", kind: "grazer", herd: [1, 1], hunt: { work: 10, flees: true } },
                    { id: "wolf", name: "Wolf", kind: "predator", herd: [1, 1], hunt: { work: 10, flees: false } }
                ]
            }
        }
    };
    function Game_Map() {}
    Game_Map.prototype.update = function () {};
    function Game_Event() {}
    Game_Event.prototype.isThrough = function () { return false; };
    function Sprite_Character() {}
    Sprite_Character.prototype.update = function () {};
    function Sprite() {}
    function Spriteset_Map() {}
    Spriteset_Map.prototype.createCharacters = function () {};
    function Scene_Boot() {}
    Scene_Boot.prototype.start = function () {};
    function Scene_Map() {}
    Scene_Map.prototype.update = function () {};
    sb.Game_Map = Game_Map;
    sb.Game_Event = Game_Event;
    sb.Sprite_Character = Sprite_Character;
    sb.Sprite = Sprite;
    sb.Spriteset_Map = Spriteset_Map;
    sb.Scene_Boot = Scene_Boot;
    sb.Scene_Map = Scene_Map;
    sb.SceneManager = { _scene: null };
    sb.Graphics = { frameCount: 0 };
    sb.DEUS = sb.UF = { Events: { on: function () {}, emit: function (name) { events.push(name); } }, World: world };
    sb.window = sb;
    sb.global = sb;
    vm.createContext(sb);
    vm.runInContext(fs.readFileSync(WILDLIFE, "utf8"), sb, { filename: WILDLIFE, timeout: 20000 });
    return { sb: sb, deer: deer, tameDeer: tameDeer, tameWolf: tameWolf, wildWolf: wildWolf, owner: owner, rival: rivalUnit };
}

let wild = null;
let wildError = null;
try {
    wild = bootWildlife();
} catch (err) {
    wildError = err && err.stack;
}
const Wl = wild && wild.sb.UF.Wildlife;
check("wildlife boots", !wildError && Wl && typeof Wl.nearestPrey === "function", wildError);
if (Wl) {
    const near = Wl.nearestPrey(0, 0, 10, false);
    const closePred = Wl.nearestPrey(0, 0, 6, true);
    const wide = Wl.nearestPrey(0, 0, 12, false);
    const summaryCounts = Wl.populationSummary();
    check("nearestPrey skips captive and domesticated animals",
        near === wild.deer && closePred === null && wide === wild.deer,
        "near " + (near && near.id) + " close " + (closePred && closePred.id) + " wide " + (wide && wide.id));
    check("public speciesOf drops prey without editing the catalog row",
        Wl.speciesOf(wild.tameDeer).prey === false && Wl.speciesOf(wild.deer).prey === true
        && Wl.speciesById("deer").prey === true && Wl.isPrey(wild.tameDeer) === false && Wl.isPrey(wild.deer) === true);
    check("owner hunt jobs do not count as wild hunts",
        Wl.hunterOf(wild.deer) === wild.owner
        && Wl.hunterOf(wild.tameDeer) && Wl.hunterOf(wild.tameDeer).id === 0
        && Wl.hunterOf(wild.tameWolf) === wild.rival);
    check("wildlife census moves held animals out of wild",
        summaryCounts.wild === 2 && summaryCounts.captive === 1 && summaryCounts.domestic === 1,
        JSON.stringify(summaryCounts));
    check("wildlife mayHunt matches ownership",
        Wl.mayHunt(wild.owner, wild.tameWolf) === false && Wl.mayHunt(wild.rival, wild.tameWolf) === true
        && Wl.mayHunt(wild.owner, wild.deer) === true);
    const described = Wl.describe(wild.tameWolf);
    const describedWild = Wl.describe(wild.deer);
    check("the look line no longer calls a pet prey",
        described && described.prey === false && described.text.indexOf("domesticated") >= 0
        && describedWild && describedWild.prey === true && describedWild.text.indexOf("prey") >= 0,
        described && described.text);
}

const pluginHost = global;
bindRules(pluginHost);
pluginHost.DEUS = pluginHost.UF;
pluginHost.window = pluginHost;
let pluginError = null;
try {
    require(PLUGIN);
} catch (err) {
    pluginError = err && err.stack;
}
const plugin = pluginHost.UF && pluginHost.UF.Taming;
const pluginDeer = beast("deer", { id: 120, hp: 0 });
const pluginCap = plugin && plugin.attemptCapture(handler(), pluginDeer, "knockout", { roll: 20, hour: 0 });
const pluginPerson = plugin && plugin.attemptCapture(handler(), { id: 121, data: { kind: "person", hp: 0, srdId: "srd:creature:commoner" } }, "knockout", { roll: 20 });
const pluginCommoner = { id: 122, name: "Commoner", data: { kind: "creature", hp: 0, srdId: "srd:creature:commoner" } };
const pluginCommonerTry = plugin && plugin.attemptCapture(handler(), pluginCommoner, "knockout", { roll: 20 });
check("plugin publishes UF.Taming.attemptCapture",
    !pluginError && pluginCap && pluginCap.ok === true && pluginDeer.data.taming.status === "captive"
    && pluginPerson && pluginPerson.reason === "HUMANOID"
    && pluginCommonerTry && pluginCommonerTry.reason === "HUMANOID" && !pluginCommoner.data.taming
    && plugin.equipmentSlots().length === 0,
    pluginError || (pluginCap && pluginCap.reason) + " / " + (pluginPerson && pluginPerson.reason) + " / " + (pluginCommonerTry && pluginCommonerTry.reason));

let jobCalls = 0;
pluginHost.UF.Jobs = {
    create: function (spec) {
        jobCalls += 1;
        return { id: jobCalls, type: spec.type, owner: spec.owner };
    }
};
const jobPet = beast("deer", { id: 130, hp: 4 });
jobPet.data.taming = { status: "domesticated", role: "pet", ownerId: 1, factionId: "home" };
const jobWild = beast("hare", { id: 131, hp: 2 });
const jobOwner = handler({ id: 1 });
const jobRival = handler({ id: 3, faction: "raiders" });
const jobMap = new Map([[1, jobOwner], [3, jobRival], [130, jobPet], [131, jobWild]]);
pluginHost.UF.World = {
    unit: function (id) { return jobMap.get(id) || null; },
    unitsInArea: function () { return [jobPet, jobWild]; }
};
pluginHost.UF.Wildlife = {
    speciesById: function (id) { return { id: id, kind: "grazer", prey: true }; }
};
const rawPop = { prey: 2, monsters: 0, predators: 0, creatures: 2, bySpecies: { deer: 1, hare: 1 } };
pluginHost.UF.Ecology = {
    population: function () { return rawPop; }
};
plugin.installHosts();
plugin.installHosts();
const refused = pluginHost.UF.Jobs.create({ type: "hunt", owner: 1, params: { unitId: 130 }, target: { area: { x: 0, y: 0 }, x: 1, y: 1 } });
const allowedRival = pluginHost.UF.Jobs.create({ type: "hunt", owner: 3, params: { unitId: 130 }, target: { area: { x: 0, y: 0 }, x: 1, y: 1 } });
const allowedWild = pluginHost.UF.Jobs.create({ type: "hunt", owner: 1, params: { unitId: 131 }, target: { area: { x: 0, y: 0 }, x: 2, y: 2 } });
const allowedMove = pluginHost.UF.Jobs.create({ type: "move", owner: 1, target: { area: { x: 0, y: 0 }, x: 3, y: 3 } });
check("Jobs.create refuses the owner's hunt and passes every other job",
    refused === null && jobCalls === 3 && allowedRival && allowedRival.type === "hunt"
    && allowedWild && allowedWild.type === "hunt" && allowedMove && allowedMove.type === "move",
    "calls " + jobCalls + " refused " + refused);

const aliased = pluginHost.UF.Ecology.population({ x: 0, y: 0 });
const quiet = { prey: 4, monsters: 1, predators: 0, creatures: 5, bySpecies: { deer: 4 } };
pluginHost.UF.World.unitsInArea = function () { return [jobWild]; };
pluginHost.UF.Ecology = { population: function () { return quiet; } };
plugin.installHosts();
const untouched = pluginHost.UF.Ecology.population({ x: 0, y: 0 });
check("Ecology.population moves held animals and keeps an empty adjustment identical",
    aliased.prey === 1 && aliased.domestic === 1 && aliased.captive === 0 && aliased.creatures === 1
    && untouched === quiet,
    JSON.stringify(aliased));

Math.random = random;

console.log((failed === 0 ? "OK" : "FAILED") + " " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
