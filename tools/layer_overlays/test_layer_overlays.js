"use strict";
// WG.00.35. Headless overlays for visible lower layers: 1:1, no filters,
// whole-pixel positions, occluded units omitted. Each check kills a mutant.

const fs = require("fs");
const path = require("path");
const L = require("../../game/js/plugins/DEUS_LayerOverlays.js");
const Cues = require("../../game/js/plugins/DEUS_DepthCues.js");
const CombatC = require("../../game/js/sim/combat_rt/constants.js");

let passed = 0;
let failed = 0;

function check(name, cond, detail) {
    if (cond) {
        passed++;
        console.log("PASS " + name);
    } else {
        failed++;
        console.error("FAIL " + name + (detail ? " — " + detail : ""));
    }
}

function kills(name, good, bad) {
    check(name, good === true);
    check(name + "_mutant_killed", bad === false);
}

function fight() {
    return {
        revision: 1,
        viewZ: 2,
        maxDepth: 2,
        tilePx: 48,
        window: { x0: 0, y0: 0, x1: 10, y1: 10 },
        opaque: [
            { x: 4, y: 4, z: 2 },
            { x: 5, y: 5, z: 1 }
        ],
        layerOffset: { 1: { x: -24, y: -24 } },
        units: [
            {
                id: "here", x: 3, y: 4, z: 2, hp: 10, maxHp: 40, quarter: 0,
                conditions: ["poison"], selected: true, flash: true,
                numbers: [{ amount: 6, type: "slashing", hit: true }],
                range: { radiusTiles: 1 },
                effects: [{ id: "spark" }]
            },
            {
                id: "low", x: 3, y: 4, z: 1, hp: 30, maxHp: 40, quarter: 0,
                conditions: ["bless"], selected: true, flash: true, blood: true,
                action: 0.5,
                numbers: [{ amount: 4, type: "miss", hit: false }],
                range: { radiusTiles: 2 },
                effects: [{ id: "glow" }]
            },
            { id: "deep", x: 3, y: 4, z: 0, hp: 40, maxHp: 40 },
            { id: "buried", x: 4, y: 4, z: 1, hp: 10, maxHp: 10, selected: true, flash: true },
            { id: "underfloor", x: 5, y: 5, z: 0, hp: 10, maxHp: 10 },
            { id: "outside", x: 20, y: 4, z: 1, hp: 10, maxHp: 10 },
            { id: "above", x: 3, y: 4, z: 3, hp: 10, maxHp: 10 },
            { id: "far", x: 3, y: 4, z: -1, hp: 10, maxHp: 10 },
            { id: "corpse", x: 3, y: 5, z: 1, hp: 0, maxHp: 40, dead: true, selected: true, flash: true }
        ],
        spells: [
            { id: "bolt", x: 3, y: 4, z: 1, casterZ: 2 },
            { id: "buriedSpell", x: 4, y: 4, z: 1, casterZ: 2 },
            { id: "fall", x: 3, y: 4, z: 0, casterZ: 2 }
        ],
        effects: [
            { id: "mark", x: 3, y: 4, z: 0 }
        ]
    };
}

function bare() {
    return { id: "low", x: 3, y: 4, z: 0, hp: 30, maxHp: 40, quarter: 2, selected: true };
}

function baseWorld() {
    return {
        revision: 11,
        viewZ: 2,
        maxDepth: 2,
        tilePx: 48,
        units: [bare()],
        spells: [{ id: "fall", x: 3, y: 4, z: 0, casterZ: 2 }]
    };
}

function cueWorld() {
    const w = baseWorld();
    w.revision = 12;
    w.cues = {
        toggles: {
            parallax: true,
            paletteShift: true,
            unitHeightShift: true,
            cameraLayerEasing: true,
            crossLayerEffects: true
        },
        scale: 3,
        blur: true,
        cameraX: 2,
        cameraY: -4,
        parallaxStepPx: 3,
        lightMode: "per-pixel"
    };
    w.cameraEase = { x: 4, y: -8 };
    return w;
}

function find(list, id, kind) {
    for (let i = 0; i < list.length; i++) {
        if (list[i].unitId === id && list[i].kind === kind) return list[i];
    }
    return null;
}

function findLabel(list, id, label) {
    for (let i = 0; i < list.length; i++) {
        if (list[i].unitId === id && list[i].label === label) return list[i];
    }
    return null;
}

function findSpell(list, id) {
    for (let i = 0; i < list.length; i++) if (list[i].spellId === id) return list[i];
    return null;
}

function indexOf(list, pred) {
    for (let i = 0; i < list.length; i++) if (pred(list[i])) return i;
    return -1;
}

function summarize(list) {
    const parts = [];
    for (let i = 0; i < list.length; i++) {
        const o = list[i];
        parts.push(o.z + ":" + o.kind + ":" + (o.unitId || o.spellId || o.label));
    }
    return list.length + " [" + parts.join(" ") + "]";
}

function digest(list) {
    let s = "";
    for (let i = 0; i < list.length; i++) {
        const o = list[i];
        s += o.kind + ":" + o.unitId + ":" + o.spellId + ":" + o.label + ":" + o.z + ":" + o.x + ":" + o.y + ":" + o.w + ":" + o.h + ":" + o.fillW + ":" + o.scale + "|";
    }
    return s;
}

function clean(o) {
    if (!o || o.scale !== 1) return false;
    if (o.filters && o.filters.length) return false;
    if (o.blur || o.tint || o.fog || o.desaturate || o.paletteShifted) return false;
    if (o.alpha !== 1 || o.fade) return false;
    if (!Number.isInteger(o.x) || !Number.isInteger(o.y) || !Number.isInteger(o.w) || !Number.isInteger(o.h)) return false;
    return true;
}

function allClean(list) {
    if (!list || !list.length) return false;
    for (let i = 0; i < list.length; i++) if (!clean(list[i])) return false;
    return true;
}

function fightList(mod) {
    mod.reset();
    return mod.sync(fight()).overlays;
}

function lowerOk(list) {
    if (!find(list, "low", "hpBar") || !find(list, "deep", "hpBar")) return false;
    if (!find(list, "low", "hitFlash") || !find(list, "low", "floatingNumber")) return false;
    if (!find(list, "low", "selection") || !find(list, "low", "rangeMarker")) return false;
    if (!findSpell(list, "bolt") || !findSpell(list, "fall")) return false;
    let lowerHp = 0;
    for (let i = 0; i < list.length; i++) {
        if (list[i].kind === "hpBar" && list[i].z < 2) lowerHp++;
    }
    return lowerHp === 2 && list.length === 24;
}

kills("lower_layers_have_overlays", lowerOk(fightList(L)), (function () {
    const dropped = fightList(L).filter(function (o) { return o.z === 2; });
    return lowerOk(dropped);
})());

function scaleOk(mod) {
    mod.reset();
    const a = mod.sync(fight());
    const b = mod.sync(cueWorld());
    return allClean(a.overlays) && allClean(b.overlays) && a.scale === 1 && b.scale === 1;
}

kills("scale_is_one", scaleOk(L), scaleOk({
    reset: L.reset,
    sync: function (w) {
        const p = L.sync(w);
        return { scale: 0.9, overlays: p.overlays.map(function (o) { return Object.assign({}, o, { scale: 0.9 }); }) };
    }
}));

function filterOk(mod) {
    mod.reset();
    const p = mod.sync(cueWorld());
    if (p.filters && p.filters.length) return false;
    if (p.blur || p.tint || p.fog || p.desaturate || p.paletteShifted || p.alpha !== 1 || p.scale !== 1) return false;
    return allClean(p.overlays);
}

kills("no_filters_tint_fog_or_fade", filterOk(L), filterOk({
    reset: L.reset,
    sync: function (w) {
        const p = L.sync(w);
        return {
            scale: p.scale,
            filters: ["ColorMatrixFilter"],
            blur: true,
            tint: "#888888",
            fog: true,
            desaturate: true,
            paletteShifted: true,
            alpha: 0.5,
            overlays: p.overlays.map(function (o) {
                return Object.assign({}, o, { filters: ["ColorMatrixFilter"], tint: "#888888", blur: true, alpha: 0.85, fog: true });
            })
        };
    }
}));

function pixelOk(mod) {
    mod.reset();
    const list = mod.sync(fight()).overlays;
    if (!allClean(list)) return false;
    const here = find(list, "here", "hpBar");
    const low = find(list, "low", "hpBar");
    const sel = find(list, "low", "selection");
    const range = find(list, "low", "rangeMarker");
    const bolt = findSpell(list, "bolt");
    if (!here || here.x !== 152 || here.y !== 188 || here.w !== 32 || here.h !== 6 || here.fillW !== 8) return false;
    if (here.layerX !== 0 || here.layerY !== 0 || here.sections !== 5) return false;
    if (!low || low.x !== 128 || low.y !== 164 || low.fillW !== 23) return false;
    if (low.layerX !== -24 || low.layerY !== -24) return false;
    if (!sel || sel.x !== 120 || sel.y !== 168 || sel.w !== 48 || sel.h !== 48) return false;
    if (!range || range.x !== 24 || range.y !== 72 || range.w !== 240 || range.h !== 240) return false;
    if (!bolt || bolt.x !== 120 || bolt.y !== 168 || bolt.w !== 48 || bolt.z !== 1 || bolt.blur) return false;
    const fracWorld = {
        revision: 4,
        viewZ: 2,
        maxDepth: 2,
        tilePx: 48,
        units: [{ id: "frac", x: 0, y: 0, z: 2, drawX: 10.4, drawY: 20.2, head: 40, hp: 10, maxHp: 40 }]
    };
    const frac = find(mod.sync(fracWorld).overlays, "frac", "hpBar");
    if (!frac || frac.x !== -6 || frac.y !== -32) return false;
    return Number.isInteger(frac.x) && Number.isInteger(frac.y);
}

kills("whole_pixel_over_the_unit", pixelOk(L), pixelOk({
    reset: L.reset,
    sync: function (w) {
        const p = L.sync(w);
        return {
            overlays: p.overlays.map(function (o) {
                return Object.assign({}, o, { x: o.x + 0.5, layerX: o.layerX + 0.5 });
            })
        };
    }
}));

function occludedOk(list) {
    const banned = { buried: 1, underfloor: 1, outside: 1, above: 1, far: 1, corpse: 1 };
    for (let i = 0; i < list.length; i++) {
        if (banned[list[i].unitId]) return false;
        if (list[i].spellId === "buriedSpell") return false;
    }
    return !!find(list, "low", "hpBar") && !!find(list, "deep", "hpBar") && !!find(list, "here", "hpBar");
}

kills("occluded_units_have_none", occludedOk(fightList(L)), (function () {
    const extra = fightList(L).slice();
    extra.push({ kind: "hpBar", unitId: "buried", z: 1, x: 0, y: 0, w: 32, h: 6, scale: 1, filters: [], alpha: 1, blur: false, tint: null, fog: false, desaturate: false, paletteShifted: false, fade: false });
    return occludedOk(extra);
})());

function currentOk(list) {
    const here = find(list, "here", "hpBar");
    if (!here || here.z !== 2) return false;
    if (here.x !== 152 || here.y !== 188 || here.w !== 32 || here.h !== 6 || here.fillW !== 8) return false;
    if (here.sections !== 5 || here.scale !== 1 || here.alpha !== 1 || here.blur || here.fade) return false;
    if (here.filters && here.filters.length) return false;
    if (here.tint || here.fog || here.desaturate || here.paletteShifted) return false;
    if (!here.color || here.color[0] !== 36 || here.color[1] !== 196 || here.color[2] !== 36) return false;
    const num = find(list, "here", "floatingNumber");
    if (!num || num.text !== "6" || num.font !== "DEUS_Pixel" || num.native !== true || num.scale !== 1) return false;
    if (num.color !== "#f2f2f2") return false;
    return true;
}

kills("current_layer_unchanged", currentOk(fightList(L)), (function () {
    return currentOk(fightList(L).map(function (o) {
        if (o.unitId === "here" && o.kind === "hpBar") return Object.assign({}, o, { scale: 0.9, x: o.x + 3 });
        return o;
    }));
})());

function cueOk(mod) {
    mod.reset();
    const base = mod.sync(baseWorld());
    const b = find(base.overlays, "low", "hpBar");
    if (!b) return false;
    const bx = b.x;
    const by = b.y;
    const cue = mod.sync(cueWorld());
    const c = find(cue.overlays, "low", "hpBar");
    if (!c) return false;
    if (bx !== 152 || by !== 188) return false;
    if (c.x !== 164 || c.y !== 158) return false;
    if (c.x - bx !== 12 || c.y - by !== -30) return false;
    if (!clean(c) || c.paletteShifted) return false;
    if (!c.color || c.color[0] !== 36 || c.color[1] !== 196 || c.color[2] !== 36) return false;
    const spell = findSpell(cue.overlays, "fall");
    if (!spell || spell.z !== 0 || !clean(spell)) return false;
    if (!spell.between || spell.between.length !== 1 || spell.between[0] !== 1) return false;
    let copies = 0;
    for (let i = 0; i < cue.overlays.length; i++) if (cue.overlays[i].spellId === "fall") copies++;
    if (copies !== 1) return false;
    const st = Cues.defaultState();
    Cues.setToggle(st, "parallax", true);
    Cues.setParallaxStep(st, 3);
    const off = Cues.parallaxOffset(0, 2, st);
    if (!off || off.x !== 6 || off.y !== 6) return false;
    Cues.setToggle(st, "paletteShift", true);
    const demo = Cues.hpBars({ viewZ: 2, units: [{ id: "u", x: 1, y: 1, z: 0, hp: 5, quarter: 0 }] }, st);
    if (!demo[0] || demo[0].w !== 48 || demo[0].h !== 4 || demo[0].paletteShifted !== false) return false;
    if (demo[0].color.join(",") !== Cues.UI_HP.join(",")) return false;
    return allClean(cue.overlays);
}

kills("cues_shift_the_layer_not_the_overlay", cueOk(L), cueOk({
    reset: L.reset,
    sync: function (w) {
        const p = L.sync(w);
        return {
            overlays: p.overlays.map(function (o) {
                if (o.kind !== "hpBar") return o;
                return Object.assign({}, o, { paletteShifted: true, scale: w.cues ? w.cues.scale : 1, tint: "#445566", color: [10, 10, 10] });
            })
        };
    }
}));

function orderOk(list) {
    const deep = indexOf(list, function (o) { return o.unitId === "deep" && o.kind === "hpBar"; });
    const low = indexOf(list, function (o) { return o.unitId === "low" && o.kind === "hpBar"; });
    const here = indexOf(list, function (o) { return o.unitId === "here" && o.kind === "hpBar"; });
    if (!(deep >= 0 && deep < low && low < here)) return false;
    const seq = [
        function (o) { return o.unitId === "low" && o.label === "blood"; },
        function (o) { return o.spellId === "bolt"; },
        function (o) { return o.unitId === "low" && o.kind === "rangeMarker"; },
        function (o) { return o.unitId === "low" && o.kind === "selection"; },
        function (o) { return o.unitId === "low" && o.kind === "status"; },
        function (o) { return o.unitId === "low" && o.kind === "hpBar"; },
        function (o) { return o.unitId === "low" && o.kind === "actionBar"; },
        function (o) { return o.unitId === "low" && o.kind === "hitFlash"; },
        function (o) { return o.unitId === "low" && o.kind === "floatingNumber"; }
    ];
    let prev = -1;
    for (let i = 0; i < seq.length; i++) {
        const at = indexOf(list, seq[i]);
        if (at < 0 || at <= prev) return false;
        prev = at;
    }
    return true;
}

kills("draw_order_lower_then_higher", orderOk(fightList(L)), orderOk(fightList(L).slice().reverse()));

function steadyOk(mod) {
    mod.reset();
    const w = fight();
    w.revision = 7;
    mod.sync(w);
    const a = mod.stats().allocations;
    const p1 = mod.sync(w);
    const p2 = mod.sync(w);
    if (p1 !== p2 || p1.overlays !== p2.overlays) return false;
    if (mod.stats().allocations !== a) return false;
    return mod.stats().steadyHits >= 2;
}

let allocN = 0;
kills("steady_frame_allocates_nothing", steadyOk(L), steadyOk({
    reset: function () { allocN = 0; L.reset(); },
    sync: function (w) { allocN++; return L.sync(w); },
    stats: function () {
        const s = L.stats();
        return { allocations: s.allocations + allocN, steadyHits: s.steadyHits };
    }
}));

function reuseOk(mod) {
    mod.reset();
    const w = fight();
    w.revision = 1;
    mod.sync(w);
    const a = mod.stats().allocations;
    const pool = mod.stats().pool;
    w.revision = 2;
    mod.sync(w);
    return mod.stats().allocations === a && mod.stats().pool === pool && mod.stats().rebuilds >= 2;
}

kills("rebuild_reuses_records", reuseOk(L), reuseOk({
    reset: L.reset,
    sync: function (w) {
        const p = L.sync(w);
        reuseOk.n = (reuseOk.n || 0) + p.overlays.length;
        return p;
    },
    stats: function () {
        const s = L.stats();
        return { allocations: s.allocations + (reuseOk.n || 0), pool: s.pool, rebuilds: s.rebuilds };
    }
}));

function changeOk(mod) {
    mod.reset();
    const w = fight();
    w.revision = 1;
    const first = mod.sync(w);
    const bar = find(first.overlays, "here", "hpBar");
    if (!bar || bar.fillW !== 8) return false;
    let here = null;
    for (let i = 0; i < w.units.length; i++) if (w.units[i].id === "here") here = w.units[i];
    here.hp = 40;
    const mid = mod.sync(w);
    if (mid !== first) return false;
    if (find(mid.overlays, "here", "hpBar").fillW !== 8) return false;
    w.revision = 2;
    const next = mod.sync(w);
    const now = find(next.overlays, "here", "hpBar");
    return !!now && now.fillW === 30;
}

kills("change_driven_by_revision", changeOk(L), changeOk({
    reset: L.reset,
    sync: function (w) {
        if (!changeOk.cached) changeOk.cached = L.sync(w);
        return changeOk.cached;
    }
}));

function reachOk(mod) {
    mod.reset();
    const w = fight();
    w.revision = 8;
    w.maxDepth = 31;
    const list = mod.sync(w).overlays;
    if (!find(list, "far", "hpBar")) return false;
    if (find(list, "buried", "hpBar") || find(list, "outside", "hpBar") || find(list, "above", "hpBar")) return false;
    return true;
}

kills("window_and_depth_reach_cull", reachOk(L), reachOk({
    reset: L.reset,
    sync: function (w) {
        const p = L.sync(w);
        return { overlays: p.overlays.filter(function (o) { return o.z >= 0; }) };
    }
}));

function spellOk(list) {
    const bolt = findSpell(list, "bolt");
    const fall = findSpell(list, "fall");
    if (!bolt || bolt.z !== 1 || bolt.blur || bolt.scale !== 1 || (bolt.between && bolt.between.length)) return false;
    if (!fall || fall.z !== 0 || fall.blur || fall.x !== 144 || fall.y !== 192) return false;
    if (findSpell(list, "buriedSpell")) return false;
    const miss = find(list, "low", "floatingNumber");
    if (!miss || miss.text !== "0" || miss.color !== "#4d7cff" || miss.native !== true) return false;
    const blood = findLabel(list, "low", "blood");
    if (!blood || blood.fade || blood.alpha !== 1 || blood.kind !== "effect") return false;
    const act = find(list, "low", "actionBar");
    if (!act || act.x !== 128 || act.y !== 170 || act.fillW !== 15 || act.h !== 5) return false;
    return true;
}

kills("spells_status_and_combat_marks", spellOk(fightList(L)), (function () {
    return spellOk(fightList(L).map(function (o) {
        if (o.kind === "spell") return Object.assign({}, o, { blur: true, scale: 0.9 });
        return o;
    }));
})());

function capOk(mod) {
    mod.reset();
    const numbers = [];
    for (let i = 0; i < 5; i++) numbers.push({ amount: i + 1, type: "fire", hit: true });
    const w = {
        revision: 15,
        viewZ: 1,
        maxDepth: 1,
        tilePx: 48,
        units: [{ id: "n", x: 1, y: 1, z: 1, hp: 5, maxHp: 10, numbers: numbers }]
    };
    const list = mod.sync(w).overlays;
    let n = 0;
    let has1 = false;
    let has5 = false;
    for (let i = 0; i < list.length; i++) {
        if (list[i].kind !== "floatingNumber") continue;
        n++;
        if (list[i].text === "1") has1 = true;
        if (list[i].text === "5") has5 = true;
        if (list[i].scale !== 1 || list[i].font !== "DEUS_Pixel") return false;
    }
    return n === 4 && !has1 && has5;
}

kills("number_stack_matches_combat_cap", capOk(L), capOk({
    reset: L.reset,
    sync: function (w) {
        const kept = w.units[0].numbers;
        w.units[0].numbers = kept.slice(0, 5);
        const p = L.sync(w);
        if (p.overlays.length && p.overlays[0]) {
            p.overlays.push({ kind: "floatingNumber", unitId: "n", text: "1", font: "DEUS_Pixel", scale: 1, z: 1, x: 0, y: 0, w: 32, h: 16 });
        }
        return p;
    }
}));

function colorsOk(table) {
    const keys = Object.keys(CombatC.DAMAGE_COLOR);
    if (keys.length < 10) return false;
    for (let i = 0; i < keys.length; i++) {
        if (table[keys[i]] !== CombatC.DAMAGE_COLOR[keys[i]]) return false;
    }
    return table.miss === CombatC.DAMAGE_COLOR.miss && L.SPEC.font === CombatC.PIXEL_FONT && L.SPEC.barWidth === 30;
}

kills("damage_colours_match_combat", colorsOk(L.DAMAGE_COLOR), colorsOk(Object.assign({}, L.DAMAGE_COLOR, { fire: "#000000" })));

function detOk(mod) {
    mod.reset();
    const d1 = digest(mod.sync(fight()).overlays);
    mod.reset();
    const d2 = digest(mod.sync(fight()).overlays);
    return d1 === d2 && d1.length > 40;
}

let detN = 0;
kills("plan_is_deterministic", detOk(L), detOk({
    reset: function () { L.reset(); },
    sync: function (w) {
        detN++;
        const p = L.sync(w);
        if (detN === 1) return p;
        const copy = p.overlays.slice();
        if (copy[0]) copy[0] = Object.assign({}, copy[0], { x: copy[0].x + 3 });
        return { overlays: copy };
    }
}));

function liveOk(mod) {
    try {
        if (mod.syncPlane(null, null) !== false) return false;
        if (mod.syncPlane({}, {}) !== false) return false;
        if (mod.clearPlane(null) !== false) return false;
        if (mod.clearPlane({}) !== false) return false;
        return true;
    } catch (e) {
        return false;
    }
}

kills("live_hook_is_a_no_op_without_pixi", liveOk(L), liveOk({
    syncPlane: function () { throw new Error("pixi"); },
    clearPlane: function () { return false; }
}));

function hookOk(src) {
    return src.indexOf("const layerOverlays") >= 0 && src.indexOf("LO.syncPlane") >= 0 && src.indexOf("LO.clearPlane") >= 0;
}

const depthSrc = fs.readFileSync(path.join(__dirname, "..", "..", "game", "js", "plugins", "DEUS_Depth.js"), "utf8");
kills("depth_calls_overlay_bus", hookOk(depthSrc), hookOk("function updateUnits(){ return; }"));

function artOk(src) {
    if (/Math\.random/.test(src)) return false;
    if (/writeFileSync/.test(src)) return false;
    if (/\.png/i.test(src)) return false;
    if (/ColorMatrix|BlurFilter/.test(src)) return false;
    if (/\.filters\s*=\s*\[/.test(src)) return false;
    if (/scale\.set\(\s*0/.test(src)) return false;
    const low = src.toLowerCase();
    const banned = ["pixel" + "lab", "image_" + "gen", "dall-" + "e", "stable-" + "diffusion"];
    for (let i = 0; i < banned.length; i++) if (low.indexOf(banned[i]) >= 0) return false;
    return /\.filters = null/.test(src);
}

const overlaySrc = fs.readFileSync(path.join(__dirname, "..", "..", "game", "js", "plugins", "DEUS_LayerOverlays.js"), "utf8");
kills("no_art_generation", artOk(overlaySrc), artOk(overlaySrc + "\nbitmap.filters = [new PIXI.filters.ColorMatrixFilter()]; fs.writeFileSync('x.png');"));

function rowById(result, id) {
    if (!result || !result.rows) return null;
    for (let i = 0; i < result.rows.length; i++) if (result.rows[i].id === id) return result.rows[i];
    return null;
}

function benchOk(result) {
    if (!result || result.layers !== 32 || result.zMin !== -16 || result.zMax !== 15) return false;
    if (result.units !== 1024 || result.viewZ !== 0 || result.tilePx !== 48) return false;
    if (result.pool !== 144) return false;
    const buried = rowById(result, "buried");
    const mid = rowById(result, "shaft-depth-2");
    const deep = rowById(result, "shaft-depth-31");
    const cues = rowById(result, "cues-on");
    const steady = rowById(result, "steady");
    if (!buried || buried.hpBars !== 32 || buried.lowerHpBars !== 0 || buried.overlays !== 96 || buried.bad !== 0) return false;
    if (!mid || mid.hpBars !== 34 || mid.lowerHpBars !== 2 || mid.overlays !== 102 || mid.bad !== 0) return false;
    if (!deep || deep.hpBars !== 48 || deep.lowerHpBars !== 16 || deep.overlays !== 144 || deep.bad !== 0) return false;
    if (!cues || cues.hpBars !== 34 || cues.dx !== 6 || cues.dy !== 6 || cues.bad !== 0) return false;
    if (cues.paletteShifted !== false || cues.scale !== 1) return false;
    if (!steady || steady.steadyAllocations !== 0 || steady.samePlan !== true || steady.bad !== 0) return false;
    for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows[i];
        if (row.bad !== 0) return false;
        if (row.id !== "steady" && row.overlays !== row.hpBars * 3) return false;
    }
    return true;
}

let benchResult = null;
function ensureBench() {
    if (!benchResult) {
        benchResult = L.benchmark();
        console.log("BENCH layers=" + benchResult.layers + " units=" + benchResult.units + " pool=" + benchResult.pool + " allocations=" + benchResult.allocations);
        for (let i = 0; i < benchResult.rows.length; i++) {
            const row = benchResult.rows[i];
            console.log("BENCH " + row.id
                + " hp=" + row.hpBars
                + " lowerHp=" + row.lowerHpBars
                + " overlays=" + row.overlays
                + " lower=" + row.lowerOverlays
                + " bad=" + row.bad
                + " dx=" + row.dx
                + " steadyAlloc=" + row.steadyAllocations
                + " rebuildMs=" + (typeof row.rebuildMs === "number" ? row.rebuildMs.toFixed(3) : "")
                + " steadyMs=" + (typeof row.steadyMs === "number" ? row.steadyMs.toFixed(3) : ""));
        }
    }
    return benchResult;
}

kills("benchmark_32_layers", benchOk(ensureBench()), benchOk({
    layers: 32,
    zMin: -16,
    zMax: 15,
    units: 1024,
    viewZ: 0,
    tilePx: 48,
    pool: 144,
    rows: [
        { id: "buried", hpBars: 0, lowerHpBars: 0, overlays: 0, bad: 0 },
        { id: "shaft-depth-2", hpBars: 34, lowerHpBars: 0, overlays: 102, bad: 0 },
        { id: "shaft-depth-31", hpBars: 48, lowerHpBars: 16, overlays: 144, bad: 0 },
        { id: "cues-on", hpBars: 34, dx: 6, dy: 6, bad: 0, paletteShifted: false, scale: 1, overlays: 102 },
        { id: "steady", steadyAllocations: 0, samePlan: true, bad: 0, overlays: 102, hpBars: 34 }
    ]
}));

if (failed) {
    L.reset();
    const list = L.sync(fight()).overlays;
    console.error("FIGHT " + summarize(list));
}

console.log("RESULT: " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
