"use strict";
// Gate for the on-map combat presentation. Every check is paired with a mutant
// the check must reject. A weakened check lets its mutant pass and fails this file.

const fs = require("fs");
const path = require("path");
const { bindRules } = require("../rules/bind");
const sim = require("../../game/js/sim/combat_rt");
const DICE = require("../../game/js/sim/rules/dice");

const C = sim.constants;
const P = sim.presentation;
const G = sim.grid;
const M = sim.move8;
const UI = sim.ui;

let passed = 0;
let failed = 0;

function check(name, cond) {
    if (cond) {
        passed++;
        console.log("PASS " + name);
    } else {
        failed++;
        console.error("FAIL " + name);
    }
}

function kills(name, good, mutantPasses) {
    check(name, good === true);
    check(name + "_mutant_killed", mutantPasses === false);
}

const rules = bindRules(global);

function make(mode, seed, rng) {
    return sim.createEngine({ rules: rules, seed: seed === undefined ? 1 : seed, mode: mode || "fortress", rng: rng });
}

function fighter(id, x, y, z, extra) {
    return Object.assign({
        id: id, x: x, y: y, z: z || 0, side: "player", weaponKey: "longsword",
        stats: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 10 },
        hp: 40, maxHp: 40, level: 1, className: "fighter", race: "human", sex: "m"
    }, extra || {});
}

function foe(id, x, y, z, extra) {
    return Object.assign({
        id: id, x: x, y: y, z: z || 0, side: "enemy", weaponKey: "scimitar",
        stats: { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
        hp: 30, maxHp: 30, level: 1, className: "fighter", race: "human", sex: "m"
    }, extra || {});
}

function constantRng(u) {
    let n = 0;
    return { next: function () { n++; return u; }, state: function () { return n; }, setState: function () {} };
}

function clockOk(factory) {
    const a = factory();
    a.setSpeed(1);
    a.advanceReal(5999);
    if (a.completedRounds !== 0) return false;
    a.advanceReal(1);
    if (a.completedRounds !== 1 || a.simMs !== 6000) return false;
    const b = factory();
    b.setSpeed(2);
    b.advanceReal(2999);
    if (b.completedRounds !== 0) return false;
    b.advanceReal(1);
    if (b.completedRounds !== 1) return false;
    const p = factory();
    p.setSpeed(1);
    p.advanceReal(1000);
    p.pause();
    const ms = p.simMs;
    p.advanceReal(50000);
    if (p.simMs !== ms || p.completedRounds !== 0) return false;
    p.resume();
    p.advanceReal(5000);
    if (p.completedRounds !== 1 || p.simMs !== 6000) return false;
    return true;
}

function brokenClock() {
    let ms = 0;
    let rounds = 0;
    return {
        setSpeed: function () {},
        advanceReal: function (dt) { ms += dt; rounds = Math.floor(ms / 5000); },
        pause: function () {},
        resume: function () {},
        get simMs() { return ms; },
        get completedRounds() { return rounds; }
    };
}

kills("clock_6s_speed_pause", clockOk(function () { return make("fortress", 1); }), clockOk(brokenClock));

function rngMatches(factory) {
    const a = factory(99);
    const b = DICE.createSeededRng(99);
    for (let i = 0; i < 8; i++) if (a() !== b()) return false;
    return true;
}
kills(
    "seeded_rng_matches_rules_dice",
    rngMatches(function (seed) { const r = sim.createRng(seed); return function () { return r.next(); }; }),
    rngMatches(function () { let n = 0; return function () { n++; return n / 10; }; })
);

function duel(mode, seed) {
    const e = make(mode, seed);
    e.addUnit(fighter("a", 0, 0, 0));
    e.addUnit(foe("b", 1, 0, 0));
    e.advanceReal(6000 * 6);
    return JSON.stringify(e.outcomes());
}
kills(
    "deterministic_both_modes",
    duel("fortress", 7) === duel("hero", 7),
    (function () {
        const hero = JSON.parse(duel("hero", 7));
        hero.units[0].hp = 1;
        return JSON.stringify(hero) === duel("fortress", 7);
    })()
);

kills(
    "same_seed_replay",
    duel("fortress", 7) === duel("fortress", 7),
    duel("fortress", 7) === duel("fortress", 8)
);

function switched() {
    const e = make("fortress", 7);
    e.addUnit(fighter("a", 0, 0, 0));
    e.addUnit(foe("b", 1, 0, 0));
    e.advanceReal(15000);
    const before = JSON.stringify(e.combatState());
    e.setMode("hero");
    const after = JSON.stringify(e.combatState());
    e.advanceReal(21000);
    const straight = make("hero", 7);
    straight.addUnit(fighter("a", 0, 0, 0));
    straight.addUnit(foe("b", 1, 0, 0));
    straight.advanceReal(36000);
    return {
        kept: before === after,
        scene: e.scene === "map",
        end: JSON.stringify(e.outcomes()) === JSON.stringify(straight.outcomes())
    };
}
function switchOk(r) { return !!(r && r.kept && r.scene && r.end); }
kills("mode_switch_keeps_combat_state", switchOk(switched()), switchOk({ kept: false, scene: true, end: true }));

function ordersSurvive() {
    const e = make("fortress", 3);
    e.addUnit(fighter("a", 0, 0, 0));
    e.addUnit(foe("b", 1, 0, 0));
    e.queueOrder("a", { type: "hold" });
    const before = JSON.stringify(e.combatState().orders);
    e.setMode("hero");
    const after = JSON.stringify(e.combatState().orders);
    e.advanceReal(6000);
    const held = e.transcript().some(function (ev) { return ev.actorId === "a" && ev.type === "hold"; });
    const other = make("hero", 3);
    other.addUnit(fighter("a", 0, 0, 0));
    other.addUnit(foe("b", 1, 0, 0));
    other.queueOrder("a", { type: "hold" });
    other.advanceReal(6000);
    return { same: before === after, held: held, end: JSON.stringify(e.outcomes()) === JSON.stringify(other.outcomes()) };
}
function ordersOk(r) { return !!(r && r.same && r.held && r.end); }
kills("orders_survive_switch", ordersOk(ordersSurvive()), ordersOk({ same: false, held: true, end: true }));

function hitLands() {
    const e = make("fortress", 1, constantRng(0.99));
    e.addUnit(fighter("a", 0, 0, 0));
    e.addUnit(foe("b", 1, 0, 0));
    e.advanceReal(6000);
    const a = e.unit("a");
    const b = e.unit("b");
    const dealt = e.transcript().reduce(function (n, ev) { return n + (ev.damage | 0); }, 0);
    const lost = (40 - a.hp) + (30 - b.hp);
    const struck = e.transcript().some(function (ev) { return ev.type === "attack" && ev.hit && ev.damage > 0 && !ev.sameZViolation; });
    return { struck: struck, dealt: dealt, lost: lost, ax: a.x, bx: b.x };
}
function hitOk(r) { return !!(r && r.struck && r.dealt === r.lost && r.lost > 0 && r.ax === 0 && r.bx === 1); }
kills("rules_hit_changes_hp", hitOk(hitLands()), hitOk({ struck: true, dealt: 1, lost: 9, ax: 0, bx: 1 }));

function crossFight() {
    const e = make("fortress", 11);
    e.addUnit(fighter("a0", 0, 0, 0, { shield: true }));
    e.addUnit(foe("b0", 1, 0, 0));
    e.addUnit(fighter("a5", 0, 0, 5));
    e.addUnit(foe("b5", 1, 0, 5, { hp: 40, maxHp: 40 }));
    e.addUnit(fighter("c", 3, 3, 0, { behaviour: "hold", className: "wizard", weaponKey: "quarterstaff" }));
    e.queueOrder("a0", { type: "attack", targetId: "b5" });
    e.queueOrder("c", { type: "spell", targetId: "b5", ability: "dex", dc: 12, dice: "1d8", damageType: "fire", radiusSquares: 1 });
    e.advanceReal(6000);
    const log = e.transcript();
    const refused = log.filter(function (ev) { return ev.actorId === "a0" && ev.targetId === "b5"; })[0];
    const spell = log.filter(function (ev) { return ev.actorId === "c" && ev.type === "spell"; })[0];
    const z0 = log.some(function (ev) { return ev.type === "attack" && ev.actorZ === 0 && ev.targetZ === 0 && !ev.sameZViolation; });
    const z5 = log.some(function (ev) { return ev.type === "attack" && ev.actorZ === 5 && ev.targetZ === 5 && !ev.sameZViolation; });
    const toB5 = log.filter(function (ev) { return ev.targetId === "b5" && !ev.sameZViolation; }).reduce(function (n, ev) { return n + (ev.damage | 0); }, 0);
    const squaresOk = spell && G.wholeSquares(spell.squares) && spell.squares.length === 9;
    const clipOk = refused && refused.clip === "ATK_1H";
    return {
        refused: !!(refused && refused.sameZViolation),
        damage: refused ? refused.damage : 1,
        effectZ: refused ? refused.effectZ : 0,
        spellZ: spell ? spell.effectZ : 0,
        squaresOk: !!squaresOk,
        z0: z0, z5: z5, clipOk: !!clipOk,
        hpOk: e.unit("b5").hp === 40 - toB5,
        scene: e.scene === "map"
    };
}
function crossOk(r) {
    return !!(r && r.refused && r.damage === 0 && r.effectZ === 5 && r.spellZ === 5 && r.squaresOk && r.z0 && r.z5 && r.clipOk && r.hpOk && r.scene);
}
kills("cross_layer_fight", crossOk(crossFight()), crossOk({ refused: true, damage: 8, effectZ: 5, spellZ: 5, squaresOk: true, z0: true, z5: true, clipOk: false, hpOk: true, scene: true }));

function behaviourOk(api) {
    const far = api.defendFar();
    const near = api.defendNear();
    const heal = api.heal();
    const flee = api.flee();
    const pick = api.nearest();
    const moved = api.fled();
    return far.type === "hold" && near.type === "attack" && heal.type === "heal" && heal.targetId === "ally"
        && flee.type === "flee" && pick.targetId === "near" && moved;
}
function realBehaviours() {
    const far = make("fortress", 1);
    far.addUnit(fighter("d", 0, 0, 0, { behaviour: "defend" }));
    far.addUnit(foe("e", 4, 0, 0));
    const near = make("fortress", 1);
    near.addUnit(fighter("d", 0, 0, 0, { behaviour: "defend" }));
    near.addUnit(foe("e", 1, 0, 0));
    const heal = make("fortress", 1);
    heal.addUnit(fighter("h", 0, 0, 0, { behaviour: "heal", className: "cleric", stats: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 } }));
    heal.addUnit(fighter("ally", 2, 0, 0, { hp: 5, maxHp: 20 }));
    heal.addUnit(foe("e", 8, 0, 0));
    const flee = make("fortress", 1);
    flee.addUnit(fighter("f", 1, 0, 0, { behaviour: "flee" }));
    flee.addUnit(foe("e", 0, 0, 0));
    const start = G.squaresApart(flee.unit("f"), flee.unit("e"));
    flee.advanceReal(6000);
    const after = G.squaresApart(flee.unit("f"), flee.unit("e"));
    const pick = make("fortress", 1);
    pick.addUnit(fighter("p", 0, 0, 0));
    pick.addUnit(foe("near", 1, 0, 0));
    pick.addUnit(foe("far", 5, 0, 0));
    return {
        defendFar: function () { return far.peekAction("d"); },
        defendNear: function () { return near.peekAction("d"); },
        heal: function () { return heal.peekAction("h"); },
        flee: function () { return flee.peekAction("f"); },
        nearest: function () { return pick.peekAction("p"); },
        fled: function () { return after > start && Number.isInteger(flee.unit("f").x) && Number.isInteger(flee.unit("f").y); }
    };
}
kills("companion_behaviours", behaviourOk(realBehaviours()), behaviourOk({
    defendFar: function () { return { type: "attack" }; },
    defendNear: function () { return { type: "attack" }; },
    heal: function () { return { type: "attack", targetId: "ally" }; },
    flee: function () { return { type: "attack" }; },
    nearest: function () { return { targetId: "far" }; },
    fled: function () { return false; }
}));

function clipSpec(clip) {
    return clip("longsword", true) === "ATK_1H"
        && clip("longsword", false) === "ATK_1H"
        && clip("dagger", true) === "ATK_DAGGER"
        && clip("greatsword", false) === "ATK_2H"
        && clip("spear", false) === "ATK_POLEARM"
        && clip("quarterstaff", false) === "ATK_STAFF"
        && clip("shortbow", false) === "ATK_BOW"
        && clip("light_crossbow", false) === "ATK_XBOW"
        && clip("unarmed", false) === "ATK_UNARMED"
        && clip("javelin", false) === null
        && C.ANIMS.indexOf("ATK_1H_SHIELD") < 0
        && C.RETIRED_CLIPS.indexOf("ATK_1H_SHIELD") >= 0;
}
function clipOf(key, shield) {
    return P.attackClip({ weaponKey: key, shield: shield });
}
kills("weapon_clips_no_shield_anim", clipSpec(clipOf), clipSpec(function (key, shield) {
    if (shield) return "ATK_1H_SHIELD";
    return clipOf(key, false);
}));

function armorSpec(state, slot, drawn) {
    const fighterHeavy = { className: "fighter", armorCategory: "heavy", race: "human", sex: "m", weaponKey: "longsword" };
    const wizard = { className: "wizard", race: "elf", sex: "f", weaponKey: "quarterstaff" };
    const wizardMail = { className: "wizard", armorCategory: "light", race: "elf", sex: "f" };
    const cloaked = { className: "fighter", cloak: true, boots: true, weaponKey: "longsword", race: "human", sex: "m" };
    const idle = slot(cloaked, "IDLE", "S", 0);
    return state(fighterHeavy) === "HEAVY" && state(wizard) === "ROBE" && state(wizardMail) === "LIGHT"
        && state(cloaked) === "UNARMORED" && idle.indexOf("FIGHTER") < 0 && idle.indexOf("fighter") < 0
        && idle.indexOf("LONGSWORD") < 0 && drawn("IDLE") === false && drawn("ATK_1H") === true
        && idle === "CH.HUMAN.M.UNARMORED.IDLE.S.F1";
}
kills(
    "armor_state_and_class_off_map",
    armorSpec(P.armorState, P.slotId, P.weaponDrawn),
    armorSpec(function (u) { return u.className === "wizard" ? "ROBE" : "UNARMORED"; }, P.slotId, P.weaponDrawn)
);

function frameSpec(fc, dur, dirs, anims) {
    if (fc("IDLE") !== 4 || fc("WALK") !== 4) return false;
    if (fc("ATK_1H") !== 6 || fc("CAST") !== 6 || fc("HURT") !== 6 || fc("KNOCKDOWN") !== 6 || fc("DEAD") !== 6) return false;
    if (dur("ATK_1H", 3) <= dur("ATK_1H", 0)) return false;
    if (!dirs || dirs.length !== 8 || dirs[1] !== "SW" || dirs.indexOf("NE") < 0) return false;
    if (!anims || anims.length !== 19) return false;
    return P.playback("WALK").length === 4 && P.playback("ATK_1H").length === 6;
}
kills(
    "frames_dirs_strike",
    frameSpec(P.frameCount, P.frameDurationMs, C.DIRECTIONS, C.ANIMS),
    frameSpec(function (a) { return a === "WALK" ? 3 : P.frameCount(a); }, function () { return 80; }, ["S", "W", "E", "N"], C.ANIMS)
);

function knockSpec(run) {
    const row = run();
    return row.knock === 2 && row.x === 1 && row.y === 0 && row.gridMoved === 0 && row.flash === true && row.flashFrame === 3
        && row.blood === true && row.number.font === "DEUS_Pixel" && row.number.scale === 1
        && row.number.color === C.DAMAGE_COLOR.slashing && row.facing === "E";
}
function realKnock() {
    const e = make("fortress", 1, constantRng(0.99));
    e.addUnit(fighter("a", 0, 0, 0));
    e.addUnit(foe("b", 1, 0, 0, { hp: 80, maxHp: 80 }));
    e.advanceReal(6000);
    const ev = e.transcript().filter(function (item) { return item.actorId === "a" && item.type === "attack"; })[0];
    const b = e.unit("b");
    return {
        knock: ev ? Math.max(Math.abs(ev.knock.x), Math.abs(ev.knock.y)) : 0,
        x: b.x, y: b.y, gridMoved: ev ? ev.gridMoved : -1, flash: ev ? ev.flash : false, flashFrame: ev ? ev.flashFrame : null,
        blood: !!(ev && ev.blood), number: ev ? ev.number : null, facing: e.unit("a").facing
    };
}
kills("knockback_cosmetic", knockSpec(realKnock), knockSpec(function () {
    const row = realKnock();
    row.x = 3;
    row.gridMoved = 1;
    return row;
}));

function pushSpec() {
    const e = make("fortress", 1, constantRng(0.99));
    e.addUnit(fighter("a", 0, 0, 0));
    e.addUnit(foe("b", 1, 0, 0, { hp: 80, maxHp: 80, behaviour: "defend" }));
    e.queueOrder("a", { type: "attack", targetId: "b", pushSquares: 1 });
    e.advanceReal(6000);
    const b = e.unit("b");
    const ev = e.transcript().filter(function (item) { return item.actorId === "a"; })[0];
    return { x: b.x, y: b.y, moved: ev ? ev.gridMoved : 0, ax: e.unit("a").x };
}
function pushOk(r) { return !!(r && r.x === 2 && r.y === 0 && r.moved === 1 && r.ax === 0); }
kills("forced_move_changes_grid", pushOk(pushSpec()), pushOk({ x: 1, y: 0, moved: 0, ax: 0 }));

function facingSpec() {
    const e = make("fortress", 1, constantRng(0.99));
    e.addUnit(fighter("a", 0, 0, 0));
    e.addUnit(foe("b", 1, -1, 0, { hp: 80, maxHp: 80 }));
    e.advanceReal(6000);
    return e.unit("a").facing;
}
function faceOk(facing) { return facing === "NE" && C.DIRECTIONS.indexOf(facing) >= 0; }
kills("eight_way_facing", faceOk(facingSpec()), faceOk("E"));

function footSpec(fp) {
    const t = fp("Tiny");
    const s = fp("Small");
    const m = fp("Medium");
    const l = fp("Large");
    const h = fp("Huge");
    const g = fp("Gargantuan");
    return t.shares === true && t.w === 1 && s.w === 1 && s.shares === false && m.w === 1 && m.h === 1
        && l.w === 2 && l.h === 2 && h.w === 3 && g.w === 4
        && C.SIZE_FRAME.Medium.h === 42 && C.SIZE_FRAME.Tiny.h === 24 && C.SIZE_FRAME.Gargantuan.w === 192;
}
kills("footprints_and_size_frames", footSpec(G.footprint), footSpec(function (size) {
    if (size === "Large") return { w: 1, h: 1, shares: false };
    return G.footprint(size);
}));

function distSpec(feet) {
    return feet(0, 0) === 0 && feet(1, 0) === 5 && feet(2, 2) === 10 && feet(3, 1) === 15 && feet(-2, 2) === 10;
}
function feet555(dx, dy) { return G.feetBetween(dx, dy); }
function feet5105(dx, dy) {
    dx = Math.abs(dx); dy = Math.abs(dy);
    const diag = Math.min(dx, dy);
    const orth = Math.max(dx, dy) - diag;
    return 5 * (orth + diag + Math.floor(diag / 2));
}
kills("distance_555", distSpec(feet555), distSpec(feet5105));

function markerSquares() {
    const list = G.disk(4, 5, -2, 2);
    return list.length === 25 && G.wholeSquares(list) && list.every(function (s) { return s.z === -2; });
}
kills("range_markers_whole_squares", markerSquares(), (function () {
    const list = G.disk(4, 5, -2, 2).map(function (s) { return { x: s.x + 0.5, y: s.y, z: s.z }; });
    return list.length === 25 && G.wholeSquares(list);
})());

function pixelSpec(walk, corner) {
    const d = walk(1, true, false);
    const done = walk(16, true, false);
    const w = walk(1, false, false);
    const r = walk(1, false, true);
    const blocked = corner(0, 0, 1, -1, function (x, y) { return !(x === 1 && y === 0); });
    const open = corner(0, 0, 1, -1, function () { return true; });
    return d.offset === 3 && d.integer && done.tiles === 1 && done.offset === 0
        && w.offset === 4 && r.offset === 6 && blocked === false && open === true;
}
kills(
    "move8_pixels_and_corners",
    pixelSpec(M.walkPixels, M.allowsDiagonal),
    pixelSpec(function (frames, diagonal, run) {
        if (diagonal) return { offset: 4, integer: true, tiles: 0, step: 4 };
        return M.walkPixels(frames, diagonal, run);
    }, function () { return true; })
);

function deathPose() {
    const e = make("fortress", 1, constantRng(0.99));
    e.addUnit(fighter("a", 0, 0, 0));
    e.addUnit(foe("b", 1, 0, 0, { hp: 5, maxHp: 5 }));
    e.advanceReal(6000);
    const b = e.unit("b");
    return { dead: b.dead, hp: b.hp, pose: b.pose };
}
function deadOk(r) { return !!(r && r.dead && r.hp === 0 && r.pose === "DEAD"); }
kills("death_pose", deadOk(deathPose()), deadOk({ dead: true, hp: 0, pose: "IDLE" }));

function missSpec() {
    const e = make("fortress", 1, constantRng(0));
    e.addUnit(fighter("a", 0, 0, 0));
    e.addUnit(foe("b", 1, 0, 0));
    e.advanceReal(6000);
    const ev = e.transcript().filter(function (item) { return item.type === "attack" && item.actorId === "a"; })[0];
    return {
        hit: ev ? ev.hit : true,
        damage: ev ? ev.damage : 1,
        blood: ev ? ev.blood === true : true,
        flash: ev ? ev.flash : true,
        text: ev && ev.number ? ev.number.text : "",
        color: ev && ev.number ? ev.number.color : "",
        hp: e.unit("b").hp,
        cx: e.unit("b").cosmetic.x
    };
}
function missOk(r) {
    return !!(r && r.hit === false && r.damage === 0 && r.blood === false && r.flash === false
        && r.text === "0" && r.color === C.DAMAGE_COLOR.miss && r.hp === 30 && r.cx === 0);
}
kills("miss_is_zero_and_uncoloured_hit", missOk(missSpec()), missOk({ hit: true, damage: 4, blood: false, flash: false, text: "0", color: C.DAMAGE_COLOR.miss, hp: 30, cx: 0 }));

function colorsDiffer(colors) {
    return colors.fire !== colors.cold && colors.slashing !== colors.fire && colors.miss !== colors.heal;
}
kills("damage_colours", colorsDiffer(C.DAMAGE_COLOR), colorsDiffer({ fire: "#fff", cold: "#fff", slashing: "#fff", miss: "#fff", heal: "#fff" }));

function overlaySpec() {
    const unit = { data: { conditions: ["prone"] }, className: "fighter" };
    const rows = P.conditionOverlays(unit);
    return {
        n: rows.length,
        per: rows[0] && rows[0].perCharacter,
        shared: rows[0] && rows[0].shared,
        id: rows[0] && rows[0].id,
        armor: P.armorState(unit)
    };
}
function overlayOk(r) { return !!(r && r.n === 1 && r.per === false && r.shared === true && r.id === "condition/prone" && r.armor === "UNARMORED"); }
kills("condition_overlay_not_a_clip", overlayOk(overlaySpec()), overlayOk({ n: 1, per: true, shared: true, id: "condition/prone", armor: "UNARMORED" }));

function layerSpec(add) {
    let low = false;
    let high = false;
    let badHigh = false;
    let badLow = false;
    try { add(-16); low = true; } catch (e) { low = false; }
    try { add(15); high = true; } catch (e) { high = false; }
    try { add(16); } catch (e) { badHigh = e.code === "BAD_LAYER"; }
    try { add(-17); } catch (e) { badLow = e.code === "BAD_LAYER"; }
    return low && high && badHigh && badLow && C.LAYER_COUNT === 32 && C.LAYER_MIN === -16 && C.LAYER_MAX === 15;
}
kills("layer_range_32", layerSpec(function (z) {
    const e = make("fortress", 1);
    e.addUnit(fighter("z" + z, 0, 0, z));
}), layerSpec(function (z) {
    if (z === 16) return;
    const e = make("fortress", 1);
    e.addUnit(fighter("z" + z, 0, 0, z));
}));

function selectSpec() {
    const e = make("fortress", 1);
    e.addUnit(fighter("ground", 2, 2, 0));
    e.addUnit(fighter("roof", 2, 2, 5, { side: "player" }));
    e.addUnit(foe("other", 9, 9, 0));
    const both = e.selectRect({ x0: 1, y0: 1, x1: 3, y1: 3, layers: [0, 5] });
    const one = e.selectRect({ x0: 1, y0: 1, x1: 3, y1: 3, layers: [0] });
    return { n: both.length, ground: both.indexOf("ground") >= 0, roof: both.indexOf("roof") >= 0, one: one.length, only: one[0] };
}
function selectOk(r) { return !!(r && r.n === 2 && r.ground && r.roof && r.one === 1 && r.only === "ground"); }
kills("multi_layer_selection", selectOk(selectSpec()), selectOk({ n: 1, ground: true, roof: false, one: 1, only: "ground" }));

function squadSpec() {
    const e = make("fortress", 1);
    e.addUnit(fighter("a", 0, 0, 0));
    e.addUnit(fighter("b", 1, 0, 0));
    e.setSquad("s1", ["a", "b"], "flee");
    return { a: e.unit("a").behaviour, b: e.unit("b").behaviour, squad: e.unit("a").squadId };
}
function squadOk(r) { return !!(r && r.a === "flee" && r.b === "flee" && r.squad === "s1"); }
kills("squad_behaviour", squadOk(squadSpec()), squadOk({ a: "attack-nearest", b: "flee", squad: "s1" }));

function uiSpec(project) {
    const ui = project();
    if (!UI.auditProject(ui)) return false;
    const shapes = ["selection", "faction", "summon", "lowHp"].map(function (role) {
        const hit = ui.markers.filter(function (m) { return m.role === role; })[0];
        return hit && hit.shape;
    });
    const unique = new Set(shapes);
    return ui.panel.className === "fighter" && ui.panel.windowSkin === "race/human"
        && ui.panel.facesetBackground === "race-bg/human"
        && shapes[0] === "square" && shapes[1] === "triangle" && shapes[2] === "diamond" && shapes[3] === "circle"
        && unique.size === 4 && ui.hero.visible === false && ui.commander.visible === true
        && ui.indicator.switchKey === "Tab" && ui.minimap.blur === false && ui.minimap.zoomOutScale === 1;
}
function realUi() {
    const e = make("fortress", 1);
    e.addUnit(fighter("a", 0, 0, 0, { hp: 5, maxHp: 20, summonedBy: "summoner", className: "fighter", race: "human" }));
    e.selectRect({ x0: 0, y0: 0, x1: 0, y1: 0, layers: [0] });
    e.setZoom("out");
    return UI.project(e);
}
kills("ui_layers_skin_markers_scale", uiSpec(realUi), uiSpec(function () {
    const ui = realUi();
    ui.scene = "battle";
    ui.battleScene = true;
    ui.panel.coversFight = true;
    ui.minimap.blur = true;
    ui.markers = ui.markers.map(function (m) { return Object.assign({}, m, { shape: "circle" }); });
    return ui;
}));

function scaleSpec(fn) {
    return fn(1920) === 2 && fn(2560) === 2 && fn(3840) === 4 && fn(1280) === 1;
}
kills("integer_scale", scaleSpec(UI.integerScale), scaleSpec(function () { return 3; }));

function heroControls() {
    const e = make("fortress", 4);
    e.addUnit(fighter("hero", 2, 2, 3));
    e.addUnit(fighter("friend", 3, 2, 3, { behaviour: "defend" }));
    e.setHero("hero");
    const before = JSON.stringify(e.combatState());
    UI.command(e, { type: "switch" });
    const mid = JSON.stringify(e.combatState());
    UI.command(e, { type: "pause-to-target", on: true });
    UI.command(e, { type: "target", unitId: "friend" });
    const ui = UI.project(e);
    return {
        mode: e.mode,
        scene: e.scene,
        kept: before === mid,
        paused: e.paused === true,
        hero: ui.hero.visible === true,
        camera: ui.hero.cameraFollows === true,
        target: ui.hero.targetId,
        commander: ui.commander.visible === false,
        companion: ui.hero.companions.some(function (c) { return c.id === "friend" && c.behaviour === "defend"; })
    };
}
function heroOk(r) {
    return !!(r && r.mode === "hero" && r.scene === "map" && r.kept && r.paused && r.hero && r.camera && r.target === "friend" && r.commander && r.companion);
}
kills("hero_switch_pause_to_target_camera", heroOk(heroControls()), heroOk({ mode: "hero", scene: "battle", kept: false, paused: true, hero: true, camera: true, target: "friend", commander: true, companion: true }));

function pluginSpec() {
    global.window = global;
    global.PluginManager = { parameters: function () { return {}; } };
    global.Game_Map = function () {};
    global.Game_Map.prototype = { update: function () {} };
    global.Game_CharacterBase = function () {};
    global.Game_CharacterBase.prototype = {
        distancePerFrame: function () { return 0.0625; },
        moveStraight: function () { return true; },
        moveDiagonally: function () { return true; }
    };
    global.Scene_Map = function () {};
    global.Scene_Map.prototype = { update: function () {} };
    global.Input = { keyMapper: {}, isTriggered: function () { return false; } };
    require("../../game/js/plugins/DEUS_Move8");
    require("../../game/js/plugins/DEUS_CombatRT");
    require("../../game/js/plugins/DEUS_CombatUI");
    const ch = new global.Game_CharacterBase();
    ch._deusMove8Diagonal = true;
    const diag = Math.round(ch.distancePerFrame() * 48);
    ch._deusMove8Diagonal = false;
    ch._deusMove8Run = false;
    const walk = Math.round(ch.distancePerFrame() * 48);
    ch._deusMove8Run = true;
    const run = Math.round(ch.distancePerFrame() * 48);
    const bus = global.UF.CombatRT;
    const note = bus.noteResolved({ weaponKey: "longsword", x: 0, y: 0 }, { z: 4, x: 1, y: 0 }, { hit: true, damage: 6, critical: false, damageType: "slashing", weaponKey: "longsword" });
    return {
        bus: !!bus.__combatU7,
        diag: diag, walk: walk, run: run,
        placeholder: note.placeholder === true,
        bitmap: note.bitmap,
        clip: note.clip,
        grid: note.gridMoved,
        z: note.z,
        dirs: global.UF.Move8.directions.length,
        key: global.Input.keyMapper[9]
    };
}
function pluginOk(r) {
    return !!(r && r.bus && r.diag === 3 && r.walk === 4 && r.run === 6 && r.placeholder && r.bitmap === null
        && r.clip === "ATK_1H" && r.grid === false && r.z === 4 && r.dirs === 8 && r.key === "deusCombatMode");
}
kills("plugins_attach", pluginOk(pluginSpec()), pluginOk({ bus: true, diag: 4, walk: 4, run: 6, placeholder: true, bitmap: null, clip: "ATK_1H_SHIELD", grid: true, z: 4, dirs: 4, key: "deusCombatMode" }));

function hookSpec(text) {
    return text.indexOf("notifyCombatRt") >= 0 && text.indexOf("ownsCombat") >= 0
        && text.indexOf("DEUS_COMBAT_RT_PRESENTATION") >= 0 && text.split("Math.random").length === 1;
}
const combatSrc = fs.readFileSync(path.join(__dirname, "..", "..", "game", "js", "plugins", "DEUS_Combat.js"), "utf8");
kills("combat_hook_present", hookSpec(combatSrc), hookSpec("function step(){ return; }"));

function filesClean(audit) {
    const root = path.join(__dirname, "..", "..");
    const files = [
        "game/js/sim/combat_rt/constants.js",
        "game/js/sim/combat_rt/rng.js",
        "game/js/sim/combat_rt/grid.js",
        "game/js/sim/combat_rt/move8.js",
        "game/js/sim/combat_rt/presentation.js",
        "game/js/sim/combat_rt/ui.js",
        "game/js/sim/combat_rt/engine.js",
        "game/js/sim/combat_rt/index.js",
        "game/js/plugins/DEUS_Move8.js",
        "game/js/plugins/DEUS_CombatRT.js",
        "game/js/plugins/DEUS_CombatUI.js",
        "docs/systems/DEUS_CombatU7.md"
    ];
    for (let i = 0; i < files.length; i++) {
        const text = fs.readFileSync(path.join(root, files[i]), "utf8");
        const problems = audit(text);
        if (problems.length) return false;
    }
    return true;
}
kills(
    "sources_have_no_generator_or_live_shield_clip",
    filesClean(P.auditSource),
    filesClean(function () { return P.auditSource("play ATK_1H_SHIELD now"); })
);

console.log("RESULT: " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
