"use strict";
// Commander and hero controls are two layers of one map screen.
// The panel sits beside the fight, and the Z readout stays in the fight rect.

const C = require("./constants");
const P = require("./presentation");

function integerScale(viewportWidth, tilePx, minTiles) {
    const tile = tilePx || C.TILE_PX;
    const min = minTiles || 20;
    const width = viewportWidth | 0;
    let best = 1;
    for (let s = 1; s <= 8; s++) {
        if (Math.floor(width / (s * tile)) >= min) best = s;
    }
    return best;
}

function rectsOverlap(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function layout(view) {
    const scale = view.scale || 1;
    const w = view.viewportWidth || 1920;
    const h = view.viewportHeight || 1080;
    const panelW = 160 * scale;
    const fight = { x: 0, y: 0, w: w - panelW, h: h };
    const panel = { x: fight.w, y: 0, w: panelW, h: Math.min(h, 220 * scale) };
    const zReadout = { x: 8 * scale, y: 8 * scale, text: "Z " + (view.camera ? view.camera.z : 0) };
    const readoutRect = { x: zReadout.x, y: zReadout.y, w: 48 * scale, h: 16 * scale };
    return {
        fight: fight,
        panel: panel,
        coversFight: rectsOverlap(fight, panel),
        zInFight: readoutRect.x + readoutRect.w <= fight.w && readoutRect.y + readoutRect.h <= fight.h,
        zReadout: zReadout,
        scale: scale,
        smoothing: false
    };
}

function markersOf(view) {
    const selected = new Set(view.selection || []);
    const out = [];
    const units = view.units || [];
    for (let i = 0; i < units.length; i++) {
        const u = units[i];
        if (u.dead) continue;
        out.push({ unitId: u.id, role: "faction", shape: C.MARKER_SHAPE.faction, colourBlindSafe: true, z: u.z });
        if (selected.has(u.id)) out.push({ unitId: u.id, role: "selection", shape: C.MARKER_SHAPE.selection, colourBlindSafe: true, z: u.z });
        if (u.summonedBy) out.push({ unitId: u.id, role: "summon", shape: C.MARKER_SHAPE.summon, colourBlindSafe: true, controllerId: u.summonedBy, z: u.z });
        if (u.maxHp > 0 && u.hp * 2 <= u.maxHp) out.push({ unitId: u.id, role: "lowHp", shape: C.MARKER_SHAPE.lowHp, colourBlindSafe: true, z: u.z });
    }
    return out;
}

function selectedUnit(view) {
    const units = view.units || [];
    const sel = view.selection || [];
    for (let i = 0; i < sel.length; i++) {
        for (let k = 0; k < units.length; k++) if (units[k].id === sel[i]) return units[k];
    }
    if (view.heroId) {
        for (let k = 0; k < units.length; k++) if (units[k].id === view.heroId) return units[k];
    }
    return units[0] || null;
}

function project(engine) {
    const view = typeof engine.view === "function" ? engine.view() : engine;
    const lay = layout(view);
    const focus = selectedUnit(view);
    const race = focus ? C.slug(focus.race || "human") : "human";
    const zoomOut = view.zoom === "out";
    const hero = view.heroId ? (view.units || []).filter(function (u) { return u.id === view.heroId; })[0] : null;
    const companions = (view.units || []).filter(function (u) {
        return u.side === (hero ? hero.side : "player") && (!hero || u.id !== hero.id) && !u.dead;
    }).map(function (u) {
        return { id: u.id, behaviour: u.behaviour };
    });
    return {
        scene: C.SCENE,
        battleScene: false,
        mode: view.mode,
        paused: !!view.paused,
        speed: view.speed,
        indicator: {
            label: view.mode === "hero" ? "HERO" : "FORTRESS",
            switchKey: "Tab",
            switchButton: "mode-switch",
            count: 1
        },
        scale: view.scale,
        smoothing: false,
        windowSkinScale: view.scale,
        layout: lay,
        markers: markersOf(view),
        commander: {
            visible: view.mode === "fortress",
            selection: (view.selection || []).slice(),
            multiLayer: true,
            orderBar: ["move", "attack", "hold", "flee", "heal"],
            squads: view.squads || [],
            pause: !!view.paused,
            speeds: C.SPEEDS.slice(),
            speed: view.speed
        },
        hero: {
            visible: view.mode === "hero",
            heroId: view.heroId || null,
            hp: hero ? hero.hp : 0,
            maxHp: hero ? hero.maxHp : 0,
            resources: hero && hero.resources ? hero.resources : null,
            actionBar: ["attack", "cast", "heal", "item"],
            spellBar: ["cast"],
            targetId: view.heroTargetId || null,
            targetIndicator: !!view.heroTargetId,
            companions: companions,
            pauseToTarget: !!view.pauseOnTarget,
            cameraFollows: !!(view.camera && view.camera.mode === "follow")
        },
        panel: {
            unitId: focus ? focus.id : null,
            race: race,
            className: focus ? (focus.className || "") : "",
            windowSkin: "race/" + race,
            facesetBackground: "race-bg/" + race,
            coversFight: lay.coversFight,
            zInFight: lay.zInFight,
            smoothing: false
        },
        minimap: {
            enabled: view.mode === "fortress",
            renderScale: zoomOut ? 1 : view.scale,
            zoomOutScale: 1,
            blur: false,
            smoothing: false,
            downscale: false,
            colourCoded: true
        },
        camera: view.camera
    };
}

function command(engine, cmd) {
    const c = cmd || {};
    if (c.type === "switch") engine.setMode(engine.mode === "hero" ? "fortress" : "hero");
    else if (c.type === "mode") engine.setMode(c.mode);
    else if (c.type === "pause") engine.pause();
    else if (c.type === "resume") engine.resume();
    else if (c.type === "toggle-pause") engine.togglePause();
    else if (c.type === "speed") engine.setSpeed(c.speed);
    else if (c.type === "behaviour") engine.setBehaviour(c.unitId, c.behaviour);
    else if (c.type === "order") engine.queueOrder(c.unitId, c.order);
    else if (c.type === "creature-order" && typeof engine.setOrder === "function") engine.setOrder(c.unitId, c.order);
    else if (c.type === "select") engine.selectRect(c.rect);
    else if (c.type === "zoom") engine.setZoom(c.zoom);
    else if (c.type === "hero") engine.setHero(c.unitId);
    else if (c.type === "pause-to-target") engine.setPauseOnTarget(!!c.on);
    else if (c.type === "target") engine.setHeroTarget(c.unitId);
    else if (c.type === "squad") engine.setSquad(c.squadId, c.memberIds, c.behaviour);
    return project(engine);
}

function auditProject(ui) {
    if (!ui || ui.scene !== "map" || ui.battleScene) return false;
    if (!ui.indicator || ui.indicator.switchKey !== "Tab" || ui.indicator.count !== 1) return false;
    if (!ui.commander || !ui.hero) return false;
    if (ui.smoothing || ui.minimap.blur || ui.minimap.downscale || ui.minimap.smoothing) return false;
    if (ui.panel.coversFight || !ui.panel.zInFight) return false;
    if (!ui.panel.windowSkin || ui.panel.windowSkin.indexOf("race/") !== 0) return false;
    if (!ui.panel.facesetBackground || ui.panel.facesetBackground.indexOf("race-bg/") !== 0) return false;
    if (ui.minimap.zoomOutScale !== 1) return false;
    return true;
}

module.exports = { integerScale, layout, markersOf, project, command, auditProject, armorState: P.armorState };
