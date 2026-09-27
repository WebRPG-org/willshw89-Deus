"use strict";

const C = require("./constants");
const Grid = require("./grid");
const Move = require("./move8");
const Presentation = require("./presentation");
const UI = require("./ui");
const Engine = require("./engine");
const Rng = require("./rng");

function createBus() {
    let encounter = null;
    const ring = [];
    const bus = {
        __combatU7: true,
        enabled: false,
        ownsCombat: function () { return !!(encounter && bus.enabled); },
        start: function (opts) {
            encounter = Engine.createEngine(opts);
            bus.enabled = true;
            return encounter;
        },
        stop: function () {
            bus.enabled = false;
            encounter = null;
        },
        noteResolved: function (attacker, target, result) {
            const fb = Presentation.feedbackFromResolved(attacker, target, result);
            ring.push(fb);
            if (ring.length > 64) ring.shift();
            return fb;
        },
        recent: function () { return ring.slice(); },
        advanceFrame: function () {
            if (encounter && bus.enabled && !encounter.paused) encounter.advanceReal(1000 / 60);
        },
        project: function () { return encounter ? UI.project(encounter) : null; },
        encounter: function () { return encounter; }
    };
    return bus;
}

function attach(root) {
    const host = root || global;
    host.UF = host.UF || {};
    if (host.UF.CombatRT && host.UF.CombatRT.__combatU7) return host.UF.CombatRT;
    const bus = createBus();
    host.UF.CombatRT = bus;
    host.UF.CombatUI = {
        project: UI.project,
        command: UI.command,
        integerScale: UI.integerScale,
        auditProject: UI.auditProject
    };
    host.UF.Move8 = {
        stepPixels: Move.stepPixels,
        walkPixels: Move.walkPixels,
        allowsDiagonal: Move.allowsDiagonal,
        directionOf: Move.directionOf,
        sheetRow: Move.sheetRow,
        numpad: Move.numpad,
        directions: C.DIRECTIONS.slice()
    };
    host.DEUS = host.UF;
    return bus;
}

module.exports = {
    constants: C,
    grid: Grid,
    move8: Move,
    presentation: Presentation,
    ui: UI,
    createEngine: Engine.createEngine,
    createRng: Rng.createRng,
    attach: attach
};
