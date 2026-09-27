//=============================================================================
// DEUS_LayerOverlays.js - Lower-layer combat overlays at 1:1, no filters (DEC-011)
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS LayerOverlays] Effects, HP bars, status, and combat/spell overlays on visible lower layers at 1:1.
 * @author DEUS project
 * @base DEUS_Depth
 * @orderAfter DEUS_Depth
 * @orderAfter DEUS_CombatUI
 * @orderAfter DEUS_DepthCues
 *
 * @help
 * WG.00.35. When the player looks down through open layers, every visible lower
 * layer gets its effects, HP bars, status indicators, and combat/spell overlays
 * at 1:1 with no blur, tint, fog, desaturation, alpha fade, or scale.
 *
 * A higher opaque cell occludes them: those units get no overlay. The viewed
 * layer's own combat bars stay with DEUS_Combat. This plugin draws on the depth
 * planes only.
 *
 * Headless: require this file. sync(world) rebuilds only when world.revision
 * changes. The same revision returns the cached plan and allocates nothing.
 * Docs: docs/systems/DEUS_LayerOverlays.md.
 */

(function (root) {
    "use strict";

    const SPEC = Object.freeze({
        tilePx: 48,
        barWidth: 30,
        barBackW: 32,
        barBackH: 6,
        barFillH: 4,
        barGap: 12,
        actionGap: 6,
        actionH: 5,
        actionFillH: 3,
        defaultHead: 40,
        sections: 5,
        quarterPx: 12,
        marker: 8,
        maxNumbers: 4,
        font: "DEUS_Pixel",
        zMin: -16,
        zMax: 15
    });

    const ORDER = Object.freeze({
        effect: 0,
        spell: 1,
        rangeMarker: 2,
        selection: 3,
        status: 4,
        hpBar: 5,
        actionBar: 6,
        hitFlash: 7,
        floatingNumber: 8
    });

    // The on-map bar's own pixels (DEUS_Combat's default 30px bar). Not a depth ramp.
    const COLOR = Object.freeze({
        hpFill: Object.freeze([36, 196, 36]),
        hpFillHi: Object.freeze([120, 236, 120]),
        hpBack: Object.freeze([196, 26, 20]),
        hpFrame: Object.freeze([0, 0, 0]),
        action: Object.freeze([245, 158, 11]),
        flash: Object.freeze([255, 244, 214]),
        selection: Object.freeze([255, 220, 80]),
        range: Object.freeze([80, 160, 255]),
        spell: Object.freeze([180, 120, 255]),
        status: Object.freeze([220, 220, 220]),
        effect: Object.freeze([200, 40, 48]),
        blood: Object.freeze([140, 16, 16])
    });

    // Same hexes as game/js/sim/combat_rt/constants.js DAMAGE_COLOR.
    const DAMAGE_COLOR = Object.freeze({
        bludgeoning: "#b0b0b0",
        piercing: "#d8d8d8",
        slashing: "#f2f2f2",
        fire: "#e85d04",
        cold: "#4cc9f0",
        lightning: "#f7e36b",
        thunder: "#9b5de5",
        poison: "#70e000",
        acid: "#b5e48c",
        necrotic: "#5a189a",
        radiant: "#ffd166",
        psychic: "#f72585",
        force: "#4ea8de",
        miss: "#4d7cff",
        heal: "#80ed99"
    });

    const EMPTY_FILTERS = Object.freeze([]);
    const EMPTY_LIST = Object.freeze([]);

    const pool = [];
    let poolUsed = 0;
    const listPool = [];
    let listUsed = 0;
    let allocations = 0;
    let steadyHits = 0;
    let rebuilds = 0;

    const overlays = [];
    const plan = {
        scale: 1,
        filters: EMPTY_FILTERS,
        blur: false,
        tint: null,
        fog: false,
        desaturate: false,
        alpha: 1,
        paletteShifted: false,
        overlays: overlays,
        count: 0,
        lower: 0,
        current: 0,
        viewZ: 0,
        revision: undefined
    };

    let opaqueFn = null;
    let opaqueSet = null;
    let useFn = false;

    const shiftScratch = { x: 0, y: 0 };
    const footScratch = { x: 0, y: 0, lx: 0, ly: 0, lift: 0 };
    const geom = { x: 0, y: 0, w: 0, h: 0, fillW: 0 };

    function wipe(r) {
        r.kind = "";
        r.unitId = "";
        r.spellId = "";
        r.label = "";
        r.role = "";
        r.shape = "";
        r.z = 0;
        r.x = 0;
        r.y = 0;
        r.w = 0;
        r.h = 0;
        r.scale = 1;
        r.filters = EMPTY_FILTERS;
        r.alpha = 1;
        r.blur = false;
        r.tint = null;
        r.fog = false;
        r.desaturate = false;
        r.paletteShifted = false;
        r.color = null;
        r.back = null;
        r.fillW = 0;
        r.text = "";
        r.font = "";
        r.native = false;
        r.placeholder = true;
        r.fade = false;
        r.layerX = 0;
        r.layerY = 0;
        r.order = 0;
        r.sections = 0;
        r.between = EMPTY_LIST;
        return r;
    }

    function take() {
        let r;
        if (poolUsed < pool.length) r = pool[poolUsed];
        else {
            r = {};
            pool.push(r);
            allocations++;
        }
        poolUsed++;
        return wipe(r);
    }

    function takeList() {
        let a;
        if (listUsed < listPool.length) a = listPool[listUsed];
        else {
            a = [];
            listPool.push(a);
            allocations++;
        }
        listUsed++;
        a.length = 0;
        return a;
    }

    function cellKey(x, y, z) {
        return ((x & 4095) + ((y & 4095) << 12) + ((z & 255) << 24)) | 0;
    }

    function prepareOpaque(world) {
        useFn = typeof world.opaque === "function";
        if (useFn) {
            opaqueFn = world.opaque;
            return;
        }
        opaqueFn = null;
        if (!opaqueSet) {
            opaqueSet = new Set();
            allocations++;
        } else {
            opaqueSet.clear();
        }
        const list = world.opaque || EMPTY_LIST;
        for (let i = 0; i < list.length; i++) {
            const c = list[i];
            opaqueSet.add(cellKey(c.x | 0, c.y | 0, c.z | 0));
        }
    }

    function opaqueAt(world, x, y, z) {
        if (world && typeof world.opaque === "function") return world.opaque(x, y, z) === true;
        if (useFn) return opaqueFn(x, y, z) === true;
        return opaqueSet ? opaqueSet.has(cellKey(x, y, z)) : false;
    }

    function pointVisible(world, x, y, z) {
        if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) return false;
        if (z > world.viewZ) return false;
        if (world.maxDepth != null && (world.viewZ - z) > world.maxDepth) return false;
        const win = world.window;
        if (win && (x < win.x0 || x > win.x1 || y < win.y0 || y > win.y1)) return false;
        for (let zz = z + 1; zz <= world.viewZ; zz++) {
            if (opaqueAt(world, x, y, zz)) return false;
        }
        return true;
    }

    // The column rule Select calls. Do not copy this walk into another plugin.
    function cellVisible(query) {
        if (!query || !Number.isInteger(query.viewZ)) return false;
        return pointVisible(query, query.x, query.y, query.z);
    }

    function unitMarked(unit) {
        if (!unit) return false;
        if (unit.selected === true) return true;
        const data = unit.data;
        if (data && data.selected === true) return true;
        const S = root.UF && root.UF.Select;
        if (S && typeof S.isSelected === "function") return S.isSelected(unit.id) === true;
        return false;
    }

    function shiftOf(world, z) {
        let x = 0;
        let y = 0;
        const table = world.layerOffset;
        if (typeof table === "function") {
            const o = table(z);
            if (o) {
                x += o.x || 0;
                y += o.y || 0;
            }
        } else if (table) {
            const o = table[z];
            if (o) {
                x += o.x || 0;
                y += o.y || 0;
            }
        }
        const c = world.cues;
        if (c) {
            x += c.cameraX || 0;
            y += c.cameraY || 0;
            const t = c.toggles;
            if (t && t.parallax) {
                const depth = world.viewZ - z;
                if (depth > 0) {
                    const step = c.parallaxStepPx == null ? 1 : c.parallaxStepPx;
                    x += depth * step;
                    y += depth * step;
                }
            }
            if (t && t.cameraLayerEasing && world.cameraEase) {
                x += world.cameraEase.x || 0;
                y += world.cameraEase.y || 0;
            }
        }
        shiftScratch.x = Math.round(x);
        shiftScratch.y = Math.round(y);
    }

    function unitLift(world, unit) {
        const t = world.cues && world.cues.toggles;
        if (!t || !t.unitHeightShift) return 0;
        return (unit.quarter | 0) * SPEC.quarterPx;
    }

    function footOf(unit, world, tile) {
        if (unit.drawX != null && unit.drawY != null) {
            footScratch.x = unit.drawX;
            footScratch.y = unit.drawY;
        } else {
            footScratch.x = (unit.x + 0.5) * tile;
            footScratch.y = (unit.y + 1) * tile;
        }
        shiftOf(world, unit.z);
        footScratch.lx = shiftScratch.x;
        footScratch.ly = shiftScratch.y;
        footScratch.lift = unitLift(world, unit);
        footScratch.x = Math.round(footScratch.x + footScratch.lx);
        footScratch.y = Math.round(footScratch.y + footScratch.ly - footScratch.lift);
    }

    function writeBar(footX, footY, headDrop, hp, maxHp) {
        const head = footY - headDrop;
        geom.x = Math.round(footX - SPEC.barBackW / 2);
        geom.y = Math.round(head - SPEC.barGap);
        geom.w = SPEC.barBackW;
        geom.h = SPEC.barBackH;
        const share = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
        geom.fillW = Math.round(SPEC.barWidth * share);
    }

    function pushRec(r, z, viewZ) {
        overlays[count] = r;
        count++;
        if (z < viewZ) plan.lower++;
        else if (z === viewZ) plan.current++;
    }

    let count = 0;
    const statusScratch = { barX: 0, si: 0, z: 0, id: "", viewZ: 0 };

    function base(kind, z, order) {
        const r = take();
        r.kind = kind;
        r.z = z;
        r.order = order;
        r.scale = 1;
        r.filters = EMPTY_FILTERS;
        r.alpha = 1;
        r.blur = false;
        r.tint = null;
        r.fog = false;
        r.desaturate = false;
        r.paletteShifted = false;
        r.fade = false;
        r.layerX = shiftScratch.x;
        r.layerY = shiftScratch.y;
        return r;
    }

    function damageHex(type, hit) {
        if (!hit) return DAMAGE_COLOR.miss;
        return DAMAGE_COLOR[type] || DAMAGE_COLOR.miss;
    }

    function emitUnit(unit, world, tile) {
        if (!unit || unit.hidden || unit.dead) return;
        if (!pointVisible(world, unit.x, unit.y, unit.z)) return;
        footOf(unit, world, tile);
        const fx = footScratch.x;
        const fy = footScratch.y;
        const lx = footScratch.lx;
        const ly = footScratch.ly;
        const lift = footScratch.lift;
        const z = unit.z;
        const id = unit.id;
        const drop = unit.head != null ? unit.head : SPEC.defaultHead;
        const hp = unit.hp > 0 ? unit.hp : 0;
        const max = unit.maxHp > 0 ? unit.maxHp : 0;
        writeBar(fx, fy, drop, hp, max);
        const barX = geom.x;
        const barY = geom.y;

        const effects = unit.effects || EMPTY_LIST;
        for (let i = 0; i < effects.length; i++) {
            const fxr = effects[i];
            if (!fxr) continue;
            const r = base("effect", z, ORDER.effect);
            r.unitId = id;
            r.label = fxr.id || "";
            r.x = Math.round(unit.x * tile + lx);
            r.y = Math.round(unit.y * tile + ly - lift);
            r.w = tile;
            r.h = tile;
            r.color = COLOR.effect;
            pushRec(r, z, world.viewZ);
        }
        if (unit.blood) {
            const r = base("effect", z, ORDER.effect);
            r.unitId = id;
            r.label = "blood";
            r.role = "blood";
            r.x = Math.round(unit.x * tile + lx);
            r.y = Math.round(unit.y * tile + ly);
            r.w = tile;
            r.h = tile;
            r.color = COLOR.blood;
            r.fade = false;
            r.alpha = 1;
            pushRec(r, z, world.viewZ);
        }
        if (unit.range && unit.range.radiusTiles != null) {
            const radius = unit.range.radiusTiles | 0;
            if (radius >= 0) {
                const tiles = radius * 2 + 1;
                const r = base("rangeMarker", z, ORDER.rangeMarker);
                r.unitId = id;
                r.x = Math.round((unit.x - radius) * tile + lx);
                r.y = Math.round((unit.y - radius) * tile + ly);
                r.w = tiles * tile;
                r.h = tiles * tile;
                r.color = COLOR.range;
                r.shape = "square";
                pushRec(r, z, world.viewZ);
            }
        }
        if (unitMarked(unit)) {
            const r = base("selection", z, ORDER.selection);
            r.unitId = id;
            r.shape = "square";
            r.role = "selection";
            r.x = Math.round(unit.x * tile + lx);
            r.y = Math.round(unit.y * tile + ly - lift);
            r.w = tile;
            r.h = tile;
            r.color = COLOR.selection;
            pushRec(r, z, world.viewZ);
        }
        statusScratch.barX = barX;
        statusScratch.si = 0;
        statusScratch.z = z;
        statusScratch.id = id;
        statusScratch.viewZ = world.viewZ;
        emitStatus("faction", "triangle", "faction");
        if (unit.summonedBy) emitStatus("summon", "diamond", "summon");
        const conds = unit.conditions || EMPTY_LIST;
        for (let i = 0; i < conds.length; i++) emitStatus("condition", "mark", conds[i]);
        if (max > 0 && hp * 2 <= max) emitStatus("lowHp", "circle", "lowHp");
        if (max > 0) {
            const r = base("hpBar", z, ORDER.hpBar);
            r.unitId = id;
            r.x = barX;
            r.y = barY;
            r.w = SPEC.barBackW;
            r.h = SPEC.barBackH;
            r.fillW = geom.fillW;
            r.sections = SPEC.sections;
            r.color = COLOR.hpFill;
            r.back = COLOR.hpBack;
            pushRec(r, z, world.viewZ);
        }
        if (typeof unit.action === "number" && unit.action >= 0 && unit.action <= 1) {
            const r = base("actionBar", z, ORDER.actionBar);
            r.unitId = id;
            r.x = barX;
            r.y = barY + SPEC.actionGap;
            r.w = SPEC.barBackW;
            r.h = SPEC.actionH;
            r.fillW = Math.round(SPEC.barWidth * unit.action);
            r.color = COLOR.action;
            r.back = COLOR.hpFrame;
            pushRec(r, z, world.viewZ);
        }
        if (unit.flash) {
            const r = base("hitFlash", z, ORDER.hitFlash);
            r.unitId = id;
            r.x = fx - 8;
            r.y = fy - 32;
            r.w = 16;
            r.h = 16;
            r.color = COLOR.flash;
            r.alpha = 1;
            r.fade = false;
            pushRec(r, z, world.viewZ);
        }
        const numbers = unit.numbers || EMPTY_LIST;
        const start = numbers.length > SPEC.maxNumbers ? numbers.length - SPEC.maxNumbers : 0;
        let shown = 0;
        for (let i = start; i < numbers.length; i++) {
            const n = numbers[i];
            if (!n) continue;
            const hit = !!n.hit;
            const r = base("floatingNumber", z, ORDER.floatingNumber);
            r.unitId = id;
            r.text = String(hit ? (n.amount | 0) : 0);
            r.font = SPEC.font;
            r.native = true;
            r.color = damageHex(n.type, hit);
            r.x = barX;
            r.y = barY - 16 - shown * 12;
            r.w = 32;
            r.h = 16;
            r.label = r.text;
            shown++;
            pushRec(r, z, world.viewZ);
        }
    }

    function emitStatus(role, shape, label) {
        const r = base("status", statusScratch.z, ORDER.status);
        r.unitId = statusScratch.id;
        r.role = role;
        r.shape = shape;
        r.label = label;
        r.x = statusScratch.barX + statusScratch.si * (SPEC.marker + 2);
        r.y = geom.y - SPEC.marker - 2;
        r.w = SPEC.marker;
        r.h = SPEC.marker;
        r.color = COLOR.status;
        r.placeholder = true;
        statusScratch.si++;
        pushRec(r, statusScratch.z, statusScratch.viewZ);
    }

    function emitSpell(spell, world, tile) {
        if (!spell || !pointVisible(world, spell.x, spell.y, spell.z)) return;
        shiftOf(world, spell.z);
        const r = base("spell", spell.z, ORDER.spell);
        r.spellId = spell.id || "";
        r.x = Math.round(spell.x * tile + shiftScratch.x);
        r.y = Math.round(spell.y * tile + shiftScratch.y);
        r.w = tile;
        r.h = tile;
        r.color = COLOR.spell;
        r.blur = false;
        const cues = world.cues;
        const cross = cues && cues.toggles && cues.toggles.crossLayerEffects;
        if (cross && Number.isInteger(spell.casterZ)) {
            const list = takeList();
            const lo = spell.casterZ < spell.z ? spell.casterZ : spell.z;
            const hi = spell.casterZ > spell.z ? spell.casterZ : spell.z;
            for (let z = lo + 1; z < hi; z++) {
                if (!opaqueAt(world, spell.x, spell.y, z)) list.push(z);
            }
            r.between = list;
        } else {
            r.between = EMPTY_LIST;
        }
        pushRec(r, spell.z, world.viewZ);
    }

    function emitWorldEffect(effect, world, tile) {
        if (!effect || !pointVisible(world, effect.x, effect.y, effect.z)) return;
        shiftOf(world, effect.z);
        const r = base("effect", effect.z, ORDER.effect);
        r.label = effect.id || "";
        r.x = Math.round(effect.x * tile + shiftScratch.x);
        r.y = Math.round(effect.y * tile + shiftScratch.y);
        r.w = effect.w || tile;
        r.h = effect.h || tile;
        r.color = COLOR.effect;
        r.fade = false;
        pushRec(r, effect.z, world.viewZ);
    }

    function cmp(a, b) {
        if (a.z !== b.z) return a.z - b.z;
        if (a.order !== b.order) return a.order - b.order;
        if (a.unitId < b.unitId) return -1;
        if (a.unitId > b.unitId) return 1;
        if (a.spellId < b.spellId) return -1;
        if (a.spellId > b.spellId) return 1;
        if (a.label < b.label) return -1;
        if (a.label > b.label) return 1;
        return 0;
    }

    function rebuild(world) {
        rebuilds++;
        poolUsed = 0;
        listUsed = 0;
        count = 0;
        plan.lower = 0;
        plan.current = 0;
        prepareOpaque(world);
        const tile = world.tilePx || SPEC.tilePx;
        const units = world.units || EMPTY_LIST;
        for (let i = 0; i < units.length; i++) emitUnit(units[i], world, tile);
        const spells = world.spells || EMPTY_LIST;
        for (let i = 0; i < spells.length; i++) emitSpell(spells[i], world, tile);
        const effects = world.effects || EMPTY_LIST;
        for (let i = 0; i < effects.length; i++) emitWorldEffect(effects[i], world, tile);
        overlays.length = count;
        if (count > 1) overlays.sort(cmp);
        plan.count = count;
        plan.viewZ = world.viewZ;
        plan.scale = 1;
        plan.filters = EMPTY_FILTERS;
        plan.blur = false;
        plan.tint = null;
        plan.fog = false;
        plan.desaturate = false;
        plan.alpha = 1;
        plan.paletteShifted = false;
        plan.revision = world.revision;
    }

    function sync(world) {
        if (!world || !Number.isInteger(world.viewZ)) {
            overlays.length = 0;
            plan.count = 0;
            plan.lower = 0;
            plan.current = 0;
            plan.revision = undefined;
            return plan;
        }
        if (world.revision != null && world.revision === plan.revision) {
            steadyHits++;
            return plan;
        }
        rebuild(world);
        return plan;
    }

    function reset() {
        plan.revision = undefined;
        plan.count = 0;
        plan.lower = 0;
        plan.current = 0;
        overlays.length = 0;
        steadyHits = 0;
        rebuilds = 0;
    }

    function stats() {
        return {
            allocations: allocations,
            steadyHits: steadyHits,
            rebuilds: rebuilds,
            pool: pool.length,
            built: plan.count,
            lower: plan.lower,
            current: plan.current,
            liveSteady: liveSteady,
            livePaints: livePaints,
            liveSprites: liveSprites
        };
    }

    function tally(viewZ) {
        let hp = 0;
        let lowerHp = 0;
        let lower = 0;
        let bad = 0;
        for (let i = 0; i < overlays.length; i++) {
            const o = overlays[i];
            if (o.kind === "hpBar") {
                hp++;
                if (o.z < viewZ) lowerHp++;
            }
            if (o.z < viewZ) lower++;
            if (o.scale !== 1 || (o.filters && o.filters.length) || o.blur || o.tint || o.fog || o.desaturate || o.alpha !== 1 || o.paletteShifted) bad++;
            if (!Number.isInteger(o.x) || !Number.isInteger(o.y) || !Number.isInteger(o.w) || !Number.isInteger(o.h)) bad++;
        }
        return { hpBars: hp, lowerHpBars: lowerHp, overlays: overlays.length, lowerOverlays: lower, bad: bad };
    }

    function findBar(id, z) {
        for (let i = 0; i < overlays.length; i++) {
            const o = overlays[i];
            if (o.kind === "hpBar" && o.unitId === id && o.z === z) return o;
        }
        return null;
    }

    function nowMs() {
        if (typeof performance !== "undefined" && performance.now) return performance.now();
        return Date.now();
    }

    function makeBenchUnits() {
        const units = [];
        for (let z = SPEC.zMin; z <= SPEC.zMax; z++) {
            const baseId = (z + 16) * 32;
            for (let i = 0; i < 32; i++) {
                units.push({
                    id: baseId + i,
                    x: i % 32,
                    y: (i * 3) % 32,
                    z: z,
                    hp: 20,
                    maxHp: 40
                });
            }
        }
        return units;
    }

    function buriedOpaque(x, y, z) {
        return z === 0;
    }

    function shaftOpaque(x, y, z) {
        if (x === 0 && y === 0) return false;
        return z === 0;
    }

    function benchmark() {
        reset();
        const units = makeBenchUnits();
        const rows = [];
        function run(id, rev, maxDepth, opaque, cues) {
            const world = {
                revision: rev,
                viewZ: 0,
                maxDepth: maxDepth,
                tilePx: SPEC.tilePx,
                opaque: opaque,
                cues: cues,
                units: units
            };
            const t0 = nowMs();
            sync(world);
            const ms = nowMs() - t0;
            const row = tally(0);
            row.id = id;
            row.maxDepth = maxDepth;
            row.rebuildMs = ms;
            rows.push(row);
            return row;
        }
        run("buried", 1, 31, buriedOpaque, null);
        run("shaft-depth-2", 2, 2, shaftOpaque, null);
        const deepBar = findBar(448, -2);
        const baseX = deepBar ? deepBar.x : null;
        const baseY = deepBar ? deepBar.y : null;
        run("shaft-depth-31", 3, 31, shaftOpaque, null);
        const cue = {
            toggles: {
                parallax: true,
                paletteShift: true,
                unitHeightShift: false,
                cameraLayerEasing: false,
                crossLayerEffects: false
            },
            scale: 3,
            blur: true,
            cameraX: 0,
            cameraY: 0,
            parallaxStepPx: 3,
            lightMode: "per-pixel"
        };
        const cueRow = run("cues-on", 4, 2, shaftOpaque, cue);
        const moved = findBar(448, -2);
        cueRow.baseX = baseX;
        cueRow.baseY = baseY;
        cueRow.cueX = moved ? moved.x : null;
        cueRow.cueY = moved ? moved.y : null;
        cueRow.dx = moved && baseX != null ? moved.x - baseX : null;
        cueRow.dy = moved && baseY != null ? moved.y - baseY : null;
        cueRow.paletteShifted = moved ? moved.paletteShifted : true;
        cueRow.scale = moved ? moved.scale : 0;

        const steadyWorld = {
            revision: 20,
            viewZ: 0,
            maxDepth: 2,
            tilePx: SPEC.tilePx,
            opaque: shaftOpaque,
            units: units
        };
        const tRebuild = nowMs();
        for (let i = 0; i < 20; i++) {
            steadyWorld.revision = 100 + i;
            sync(steadyWorld);
        }
        const rebuildMs = nowMs() - tRebuild;
        steadyWorld.revision = 200;
        const first = sync(steadyWorld);
        const alloc0 = allocations;
        const tSteady = nowMs();
        for (let i = 0; i < 200; i++) sync(steadyWorld);
        const steadyMs = nowMs() - tSteady;
        const second = sync(steadyWorld);
        rows.push({
            id: "steady",
            hpBars: tally(0).hpBars,
            lowerHpBars: tally(0).lowerHpBars,
            overlays: overlays.length,
            lowerOverlays: tally(0).lowerOverlays,
            bad: tally(0).bad,
            maxDepth: 2,
            steadyAllocations: allocations - alloc0,
            samePlan: first === second,
            rebuildMs: rebuildMs,
            steadyMs: steadyMs,
            loops: 200
        });
        return {
            layers: 32,
            zMin: SPEC.zMin,
            zMax: SPEC.zMax,
            units: units.length,
            viewZ: 0,
            tilePx: SPEC.tilePx,
            pool: pool.length,
            allocations: allocations,
            rows: rows
        };
    }

    //---------------------------------------------------------------------
    // Live sprites. Created once per unit that is actually drawn. The steady
    // stamp path does not construct objects, arrays, or strings.

    let liveSteady = 0;
    let livePaints = 0;
    let liveSprites = 0;
    let notedSpells = EMPTY_LIST;
    let barBmps = null;
    const numberBmps = new Map();
    const rangeBmps = new Map();
    const hpScratch = { hp: 1, max: 1 };
    const liveCtx = { bag: null, plane: null, root: null, slot: null, bm: null };
    const dotScratch = { di: 0 };

    function placeDot() {
        const slot = liveCtx.slot;
        const bag = liveCtx.bag;
        const bm = liveCtx.bm;
        let dot = slot.dots[dotScratch.di];
        if (!dot) {
            dot = makeSprite(bm.mark);
            bag.root.addChild(dot);
            slot.dots[dotScratch.di] = dot;
        }
        dot.x = geom.x + dotScratch.di * (SPEC.marker + 2);
        dot.y = geom.y - SPEC.marker - 2;
        dot.visible = true;
        lock(dot);
        dotScratch.di++;
    }
    let stampAcc = 0;

    function noteSpells(list) {
        notedSpells = list && list.length ? list : EMPTY_LIST;
        return notedSpells.length;
    }

    function idHash(id) {
        if (typeof id === "number") return id | 0;
        if (typeof id !== "string") return 0;
        let h = 0;
        for (let i = 0; i < id.length; i++) h = Math.imul(h, 33) ^ id.charCodeAt(i);
        return h | 0;
    }

    function lock(s) {
        if (!s) return;
        if (s.filters) s.filters = null;
        if (s.alpha !== 1) s.alpha = 1;
        if (s.scale && (s.scale.x !== 1 || s.scale.y !== 1)) s.scale.set(1, 1);
        if (s.tint !== 0xffffff) s.tint = 0xffffff;
    }

    function makeSprite(bmp) {
        const s = new Sprite(bmp || null);
        s.filters = null;
        s.alpha = 1;
        s.scale.set(1, 1);
        s.tint = 0xffffff;
        s.visible = false;
        liveSprites++;
        return s;
    }

    function barBitmaps() {
        if (barBmps) return barBmps;
        if (typeof Bitmap !== "function") return null;
        const back = new Bitmap(SPEC.barBackW, SPEC.barBackH);
        back.fillRect(0, 0, SPEC.barBackW, SPEC.barBackH, "#000000");
        back.fillRect(1, 1, SPEC.barWidth, SPEC.barFillH, "#c41a14");
        for (let s = 1; s <= 4; s++) {
            const divX = 1 + Math.round(SPEC.barWidth * (s / 5));
            back.fillRect(divX, 1, 1, SPEC.barFillH, "#000000");
        }
        const fill = new Bitmap(SPEC.barWidth, SPEC.barFillH);
        fill.fillRect(0, 0, SPEC.barWidth, SPEC.barFillH, "#24c424");
        fill.fillRect(0, 0, SPEC.barWidth, 1, "#78ec78");
        for (let s = 1; s <= 4; s++) {
            const divX = Math.round(SPEC.barWidth * (s / 5));
            fill.fillRect(divX, 0, 1, SPEC.barFillH, "#000000");
        }
        const mark = new Bitmap(SPEC.marker, SPEC.marker);
        mark.fillRect(0, 0, SPEC.marker, SPEC.marker, "#dcdcdc");
        const flash = new Bitmap(16, 16);
        flash.fillRect(0, 0, 16, 16, "#fff4d6");
        const cell = new Bitmap(SPEC.tilePx, SPEC.tilePx);
        cell.fillRect(0, 0, SPEC.tilePx, 1, "#ffdc50");
        cell.fillRect(0, SPEC.tilePx - 1, SPEC.tilePx, 1, "#ffdc50");
        cell.fillRect(0, 0, 1, SPEC.tilePx, "#ffdc50");
        cell.fillRect(SPEC.tilePx - 1, 0, 1, SPEC.tilePx, "#ffdc50");
        const action = new Bitmap(SPEC.barWidth, SPEC.actionFillH);
        action.fillRect(0, 0, SPEC.barWidth, SPEC.actionFillH, "#f59e0b");
        barBmps = { back: back, fill: fill, mark: mark, flash: flash, cell: cell, action: action };
        return barBmps;
    }

    function rangeBitmap(tiles) {
        const key = tiles | 0;
        let bmp = rangeBmps.get(key);
        if (bmp) return bmp;
        if (typeof Bitmap !== "function") return null;
        const px = key * SPEC.tilePx;
        bmp = new Bitmap(px, px);
        bmp.fillRect(0, 0, px, 1, "#50a0ff");
        bmp.fillRect(0, px - 1, px, 1, "#50a0ff");
        bmp.fillRect(0, 0, 1, px, "#50a0ff");
        bmp.fillRect(px - 1, 0, 1, px, "#50a0ff");
        rangeBmps.set(key, bmp);
        return bmp;
    }

    function numberBitmap(text, color) {
        const key = text + "\n" + color;
        let bmp = numberBmps.get(key);
        if (bmp) return bmp;
        if (typeof Bitmap !== "function") return null;
        bmp = new Bitmap(32, 16);
        bmp.fontFace = SPEC.font;
        bmp.fontSize = 12;
        bmp.textColor = color;
        bmp.drawText(text, 0, 0, 32, 16, "center");
        numberBmps.set(key, bmp);
        return bmp;
    }

    function ensureBag(plane) {
        let bag = plane._ufLayerOverlays;
        if (bag) return bag;
        const box = new PIXI.Container();
        box.filters = null;
        box.alpha = 1;
        box.scale.set(1, 1);
        plane.addChild(box);
        bag = { root: box, slots: new Map(), primed: false, stamp: 0, seen: 0 };
        plane._ufLayerOverlays = bag;
        return bag;
    }

    function writeHp(u) {
        const data = u && u.data;
        let hp = 0;
        let max = 0;
        if (data) {
            if (typeof data.hp === "number") hp = data.hp;
            else if (data.dnd && typeof data.dnd.hp === "number") hp = data.dnd.hp;
            if (typeof data.maxHp === "number") max = data.maxHp;
            else if (data.dnd && typeof data.dnd.hpMax === "number") max = data.dnd.hpMax;
        }
        if (!(max > 0)) {
            hp = 1;
            max = 1;
        }
        if (hp < 0) hp = 0;
        if (hp > max) hp = max;
        hpScratch.hp = hp;
        hpScratch.max = max;
    }

    function headDropOf(sprite) {
        const frame = sprite._frame;
        const sy = sprite.scale && sprite.scale.y ? sprite.scale.y : 1;
        if (frame && frame.height && sprite.anchor) return sprite.anchor.y * frame.height * sy;
        return SPEC.defaultHead;
    }

    function columnOpen(root, plane, x, y) {
        if (!root || typeof root.skipsMainCell !== "function") return false;
        if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
        if (root.skipsMainCell(x, y) !== true) return false;
        const planes = root.planes;
        if (!planes) return true;
        const z = plane.level.z;
        for (let i = 0; i < planes.length; i++) {
            const p = planes[i];
            if (!p || p === plane || !p.level || !p.visible) continue;
            if (p.level.z <= z) continue;
            const tm = p._tilemap;
            const skip = tm && tm.skipCell;
            if (typeof skip !== "function" || skip(x, y) !== true) return false;
        }
        return true;
    }

    function hideSlot(slot) {
        slot.back.visible = false;
        slot.fill.visible = false;
        if (slot.flash) slot.flash.visible = false;
        if (slot.selection) slot.selection.visible = false;
        if (slot.range) slot.range.visible = false;
        if (slot.action) slot.action.visible = false;
        const dots = slot.dots;
        if (dots) {
            for (let i = 0; i < dots.length; i++) dots[i].visible = false;
        }
        const nums = slot.nums;
        if (nums) {
            for (let i = 0; i < nums.length; i++) nums[i].visible = false;
        }
    }

    function hashOne(sprite) {
        if (!sprite || !sprite.visible) return;
        const u = sprite._ufRef;
        stampAcc = Math.imul(stampAcc, 33) ^ idHash(u && u.id);
        stampAcc = Math.imul(stampAcc, 33) ^ (sprite.x | 0);
        stampAcc = Math.imul(stampAcc, 33) ^ (sprite.y | 0);
        stampAcc = Math.imul(stampAcc, 33) ^ (unitMarked(u) ? 1 : 0);
        const data = u && u.data;
        if (!data) return;
        stampAcc = Math.imul(stampAcc, 33) ^ (data.hp | 0);
        stampAcc = Math.imul(stampAcc, 33) ^ (data.maxHp | 0);
        stampAcc = Math.imul(stampAcc, 33) ^ (data.selected ? 1 : 0);
        stampAcc = Math.imul(stampAcc, 33) ^ (data.hitFlash ? 1 : 0);
        stampAcc = Math.imul(stampAcc, 33) ^ (data.blood ? 1 : 0);
        if (data.rangeMarker) stampAcc = Math.imul(stampAcc, 33) ^ (data.rangeMarker.radiusTiles | 0);
        if (Array.isArray(data.conditions)) {
            stampAcc = Math.imul(stampAcc, 33) ^ data.conditions.length;
            for (let i = 0; i < data.conditions.length; i++) {
                const c = data.conditions[i];
                if (typeof c !== "string") continue;
                for (let k = 0; k < c.length; k++) stampAcc = Math.imul(stampAcc, 33) ^ c.charCodeAt(k);
            }
        }
        if (Array.isArray(data.overlayNumbers)) {
            stampAcc = Math.imul(stampAcc, 33) ^ data.overlayNumbers.length;
            for (let i = 0; i < data.overlayNumbers.length; i++) {
                const n = data.overlayNumbers[i];
                if (n) stampAcc = Math.imul(stampAcc, 33) ^ (n.amount | 0) ^ (n.hit ? 1 : 0);
            }
        }
        if (Array.isArray(data.effects)) stampAcc = Math.imul(stampAcc, 33) ^ data.effects.length;
        if (data.actionRound && data.actionRound.start) {
            const dur = data.actionRound.duration || 6000;
            const elapsed = Date.now() - data.actionRound.start;
            const pct = dur > 0 ? Math.floor(elapsed * 100 / dur) : 0;
            stampAcc = Math.imul(stampAcc, 33) ^ pct;
        }
    }

    function hashPlane(plane, root) {
        stampAcc = plane._scanStamp | 0;
        const ent = plane._entities;
        stampAcc = Math.imul(stampAcc, 33) ^ (ent ? (ent.x | 0) : 0);
        stampAcc = Math.imul(stampAcc, 33) ^ (ent ? (ent.y | 0) : 0);
        if (root) {
            stampAcc = Math.imul(stampAcc, 33) ^ (root._maskRev | 0);
            stampAcc = Math.imul(stampAcc, 33) ^ (root.openStamp | 0);
        }
        plane._units.forEach(hashOne);
        const spells = notedSpells;
        for (let i = 0; i < spells.length; i++) {
            const sp = spells[i];
            if (!sp) continue;
            stampAcc = Math.imul(stampAcc, 33) ^ (sp.x | 0);
            stampAcc = Math.imul(stampAcc, 33) ^ (sp.y | 0);
            stampAcc = Math.imul(stampAcc, 33) ^ (sp.z | 0);
        }
        return stampAcc | 0;
    }

    function paintOne(sprite) {
        const bag = liveCtx.bag;
        const plane = liveCtx.plane;
        const root = liveCtx.root;
        if (!sprite || !sprite.visible) return;
        const u = sprite._ufRef;
        if (!u) return;
        const open = columnOpen(root, plane, u.x | 0, u.y | 0);
        let slot = bag.slots.get(u.id);
        if (!open) {
            if (slot) {
                hideSlot(slot);
                slot.seen = bag.seen;
            }
            return;
        }
        const bm = barBitmaps();
        if (!bm) return;
        if (!slot) {
            slot = {
                id: u.id,
                back: makeSprite(bm.back),
                fill: makeSprite(bm.fill),
                flash: null,
                selection: null,
                range: null,
                action: null,
                dots: [],
                nums: [],
                fillW: -1,
                seen: 0
            };
            bag.root.addChild(slot.back);
            bag.root.addChild(slot.fill);
            bag.slots.set(u.id, slot);
        }
        slot.seen = bag.seen;
        writeHp(u);
        writeBar(sprite.x, sprite.y, headDropOf(sprite), hpScratch.hp, hpScratch.max);
        slot.back.x = geom.x;
        slot.back.y = geom.y;
        slot.back.visible = true;
        lock(slot.back);
        slot.fill.x = geom.x + 1;
        slot.fill.y = geom.y + 1;
        if (slot.fillW !== geom.fillW) {
            const fw = geom.fillW > 0 ? geom.fillW : 0;
            if (fw > 0) slot.fill.setFrame(0, 0, fw, SPEC.barFillH);
            slot.fillW = geom.fillW;
        }
        slot.fill.visible = geom.fillW > 0;
        lock(slot.fill);
        const data = u.data || null;
        if (data && data.hitFlash) {
            if (!slot.flash) {
                slot.flash = makeSprite(bm.flash);
                bag.root.addChild(slot.flash);
            }
            slot.flash.x = Math.round(sprite.x - 8);
            slot.flash.y = Math.round(sprite.y - 32);
            slot.flash.visible = true;
            lock(slot.flash);
        } else if (slot.flash) {
            slot.flash.visible = false;
        }
        const selected = unitMarked(u);
        if (selected) {
            if (!slot.selection) {
                slot.selection = makeSprite(bm.cell);
                bag.root.addChild(slot.selection);
            }
            const tw = SPEC.tilePx;
            slot.selection.x = Math.round(sprite.x - tw / 2);
            slot.selection.y = Math.round(sprite.y - tw);
            slot.selection.visible = true;
            lock(slot.selection);
        } else if (slot.selection) {
            slot.selection.visible = false;
        }
        liveCtx.slot = slot;
        liveCtx.bm = bm;
        dotScratch.di = 0;
        placeDot();
        if (data && Array.isArray(data.conditions)) {
            for (let i = 0; i < data.conditions.length && dotScratch.di < 8; i++) placeDot();
        }
        if (hpScratch.max > 1 && hpScratch.hp * 2 <= hpScratch.max && dotScratch.di < 8) placeDot();
        if (data && (data.blood || (Array.isArray(data.effects) && data.effects.length)) && dotScratch.di < 8) placeDot();
        for (let i = dotScratch.di; i < slot.dots.length; i++) slot.dots[i].visible = false;
        const nums = data && Array.isArray(data.overlayNumbers) ? data.overlayNumbers : EMPTY_LIST;
        const nStart = nums.length > SPEC.maxNumbers ? nums.length - SPEC.maxNumbers : 0;
        let shown = 0;
        for (let i = nStart; i < nums.length; i++) {
            const n = nums[i];
            if (!n) continue;
            const hit = n.hit ? 1 : 0;
            const amt = hit ? (n.amount | 0) : 0;
            let num = slot.nums[shown];
            if (!num) {
                num = makeSprite(null);
                bag.root.addChild(num);
                slot.nums[shown] = num;
            }
            if (num._ufAmt !== amt || num._ufHit !== hit) {
                const text = String(amt);
                const color = hit ? (DAMAGE_COLOR[n.type] || DAMAGE_COLOR.miss) : DAMAGE_COLOR.miss;
                const nb = numberBitmap(text, color);
                if (nb && num.bitmap !== nb) num.bitmap = nb;
                num._ufAmt = amt;
                num._ufHit = hit;
            }
            num.x = geom.x;
            num.y = geom.y - 16 - shown * 12;
            num.visible = true;
            lock(num);
            shown++;
        }
        for (let i = shown; i < slot.nums.length; i++) slot.nums[i].visible = false;
        const radius = data && data.rangeMarker && data.rangeMarker.radiusTiles != null ? (data.rangeMarker.radiusTiles | 0) : -1;
        if (radius >= 0) {
            const tiles = radius * 2 + 1;
            const rb = rangeBitmap(tiles);
            if (!slot.range) {
                slot.range = makeSprite(rb);
                bag.root.addChild(slot.range);
            } else if (rb && slot.range.bitmap !== rb) {
                slot.range.bitmap = rb;
            }
            const tw = SPEC.tilePx;
            slot.range.x = Math.round(sprite.x - tw / 2 - radius * tw);
            slot.range.y = Math.round(sprite.y - tw - radius * tw);
            slot.range.visible = true;
            lock(slot.range);
        } else if (slot.range) {
            slot.range.visible = false;
        }
        let progress = -1;
        if (data && data.actionRound && data.actionRound.start) {
            const dur = data.actionRound.duration || 6000;
            const elapsed = Date.now() - data.actionRound.start;
            if (elapsed >= 0 && elapsed < dur) progress = elapsed / dur;
        }
        if (progress >= 0) {
            if (!slot.action) {
                slot.action = makeSprite(bm.action);
                bag.root.addChild(slot.action);
            }
            const aw = Math.round(SPEC.barWidth * progress);
            if (slot.actionW !== aw && aw > 0) {
                slot.action.setFrame(0, 0, aw, SPEC.actionFillH);
                slot.actionW = aw;
            }
            slot.action.x = geom.x + 1;
            slot.action.y = geom.y + SPEC.actionGap + 1;
            slot.action.visible = aw > 0;
            lock(slot.action);
        } else if (slot.action) {
            slot.action.visible = false;
        }
    }

    function hideStale(slot) {
        if (slot.seen !== liveCtx.bag.seen) hideSlot(slot);
    }

    function paintSpells(bag, plane, root) {
        const spells = notedSpells;
        const bm = barBitmaps();
        if (!bm || !window.$gameMap || !root || !root._cam) return;
        const map = window.$gameMap;
        const tw = map.tileWidth();
        const th = map.tileHeight();
        const cam = root._cam;
        for (let i = 0; i < spells.length; i++) {
            const sp = spells[i];
            if (!sp || sp.z !== plane.level.z) continue;
            if (!columnOpen(root, plane, sp.x | 0, sp.y | 0)) continue;
            let sprite = bag.spellSprites && bag.spellSprites[i];
            if (!sprite) {
                if (!bag.spellSprites) bag.spellSprites = [];
                sprite = makeSprite(bm.cell);
                bag.root.addChild(sprite);
                bag.spellSprites[i] = sprite;
            }
            const ax = adjustAt(sp.x, cam.x, map.width(), map.screenTileX(), map.isLoopHorizontal());
            const ay = adjustAt(sp.y, cam.y, map.height(), map.screenTileY(), map.isLoopVertical());
            sprite.x = Math.round(ax * tw);
            sprite.y = Math.round(ay * th);
            sprite.visible = true;
            lock(sprite);
        }
        if (bag.spellSprites) {
            for (let i = spells.length; i < bag.spellSprites.length; i++) {
                if (bag.spellSprites[i]) bag.spellSprites[i].visible = false;
            }
        }
    }

    function adjustAt(v, disp, mapSize, screenTiles, loop) {
        return loop && v < disp - (mapSize - screenTiles) / 2 ? v - disp + mapSize : v - disp;
    }

    function paintLive(bag, plane, root) {
        bag.seen++;
        bag.root.visible = true;
        const ent = plane._entities;
        bag.root.x = ent ? ent.x : 0;
        bag.root.y = ent ? ent.y : 0;
        lock(bag.root);
        liveCtx.bag = bag;
        liveCtx.plane = plane;
        liveCtx.root = root;
        plane._units.forEach(paintOne);
        bag.slots.forEach(hideStale);
        paintSpells(bag, plane, root);
    }

    function syncPlane(plane, root) {
        if (typeof PIXI === "undefined" || typeof Sprite !== "function") return false;
        if (!plane || !plane.visible || !plane.level || !plane._units) return false;
        const bag = ensureBag(plane);
        const stamp = hashPlane(plane, root);
        if (bag.primed && stamp === bag.stamp) {
            liveSteady++;
            return true;
        }
        bag.primed = true;
        bag.stamp = stamp;
        livePaints++;
        paintLive(bag, plane, root);
        return true;
    }

    function clearPlane(plane) {
        if (!plane) return false;
        const bag = plane._ufLayerOverlays;
        if (!bag) return false;
        bag.primed = false;
        bag.stamp = 0;
        const kids = bag.root.children;
        for (let i = 0; i < kids.length; i++) kids[i].visible = false;
        bag.root.visible = false;
        return true;
    }

    const api = {
        SPEC: SPEC,
        ORDER: ORDER,
        COLOR: COLOR,
        DAMAGE_COLOR: DAMAGE_COLOR,
        EMPTY_FILTERS: EMPTY_FILTERS,
        sync: sync,
        cellVisible: cellVisible,
        reset: reset,
        stats: stats,
        benchmark: benchmark,
        noteSpells: noteSpells,
        syncPlane: syncPlane,
        clearPlane: clearPlane
    };

    if (typeof module !== "undefined" && module.exports) module.exports = api;
    root.DEUS = root.DEUS || {};
    root.DEUS.LayerOverlays = api;
    if (!root.UF) root.UF = root.DEUS;
    root.UF.LayerOverlays = api;
})(typeof window !== "undefined" ? window : globalThis);
