"use strict";
// Headless capture and domestication. Plugins and tests both load this module.
// Dice come from UF.Rules. This file does not read the clock and does not call Math.random.

const { createSeededRng } = require("../rules/dice");
const defaults = require("./defaults");
const record = require("./record");
const capture = require("./capture");
const care = require("./care");
const gear = require("./gear");
const census = require("./census");
const save = require("./save");

function createTaming(rules, opts) {
    if (!rules || typeof rules.check !== "function") {
        const err = new Error("NO_RULES");
        err.code = "NO_RULES";
        err.name = "TamingError";
        throw err;
    }
    const options = opts || {};
    const cfg = defaults.cloneDefaults(options.defaults);
    cfg.humanoidTypes = options.humanoidTypes || null;
    if (typeof options.rng === "function") cfg.rng = options.rng;
    else if (options.seed != null) cfg.rng = createSeededRng(options.seed);
    else cfg.rng = null;

    return {
        config: cfg,
        attemptCapture: function (actor, target, method, call) {
            return capture.attemptCapture(rules, cfg, actor, target, method, call);
        },
        tend: function (actor, target, call) {
            return care.tend(rules, cfg, actor, target, call);
        },
        tickNeglect: function (units, hour) {
            return care.tickNeglect(cfg, units, hour);
        },
        equipmentSlots: gear.equipmentSlots,
        equip: gear.equip,
        markSaddle: gear.markSaddle,
        attacks: function (unit) { return gear.attacksOf(rules, unit); },
        statBlock: function (unit) { return gear.statBlock(rules, unit); },
        domesticRecord: function (unit) { return care.domesticRecord(cfg, unit); },
        livestockRecord: function (unit) { return care.livestockRecord(cfg, unit); },
        labourHook: care.labourHook,
        census: census.census,
        excludeWithdrawnFromSummary: census.excludeWithdrawnFromSummary,
        exportState: save.exportState,
        importState: save.importState,
        mayHunt: record.mayHunt,
        refuseHuntJob: record.refuseHuntJob,
        withdrawnFromWild: record.withdrawnFromWild
    };
}

module.exports = {
    ROLES: defaults.ROLES,
    DEFAULTS: defaults.DEFAULTS,
    QUESTIONS: defaults.QUESTIONS,
    createTaming: createTaming,
    census: census.census,
    excludeWithdrawnFromSummary: census.excludeWithdrawnFromSummary,
    mayHunt: record.mayHunt,
    refuseHuntJob: record.refuseHuntJob,
    withdrawnFromWild: record.withdrawnFromWild,
    exportState: save.exportState,
    importState: save.importState
};
