"use strict";
// SIM.40.05 decay core. Host-agnostic. No plugin wiring and no art.

const clock = require("./clock");
const heap = require("./heap");
const validate = require("./validate");
const core = require("./core");

module.exports = {
    SCHEMA: 1,
    R: clock.R,
    YT_PER_SY: clock.YT_PER_SY,
    LIFE_INF: clock.LIFE_INF,
    LIFE_MAX: clock.LIFE_MAX,
    floorDiv: clock.floorDiv,
    ceilDiv: clock.ceilDiv,
    lifeYt: clock.lifeYt,
    remAt: clock.remAt,
    cross: clock.cross,
    failYt: clock.failYt,
    hpByte: clock.hpByte,
    thresholdRem: clock.thresholdRem,
    rebaseClock: clock.rebase,
    applyDamage: clock.applyDamage,
    applyRepair: clock.applyRepair,
    ft8Of: clock.ft8Of,
    root8Of: clock.root8Of,
    fire8Of: clock.fire8Of,
    validate: validate.validate,
    lifeCell: validate.lifeCell,
    scaleOf: validate.scaleOf,
    badOutput: validate.badOutput,
    createHeap: heap.createHeap,
    createDecay: core.createDecay,
    layoutBytes: core.layoutBytes,
    scenarioSite: core.scenarioSite,
    scenarioL: core.scenarioL,
    residueParts: core.residueParts,
    rotSplit: core.rotSplit
};
