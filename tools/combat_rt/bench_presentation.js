"use strict";
// Headless presentation cost. Not a gate. The Lane AH nw.exe benchmark is separate.

const { bindRules } = require("../rules/bind");
const { createEngine } = require("../../game/js/sim/combat_rt");

const rules = bindRules({});
const pairs = 40;
const rounds = 10;
const e = createEngine({ rules: rules, seed: 0x5eed0019, mode: "fortress" });
for (let i = 0; i < pairs; i++) {
    const stats = { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 10 };
    e.addUnit({
        id: "a" + i, x: (i % 10) * 3, y: Math.floor(i / 10) * 3, z: i % 2 === 0 ? 0 : 1,
        side: "player", weaponKey: "longsword", stats: stats, hp: 30, maxHp: 30, level: 1
    });
    e.addUnit({
        id: "b" + i, x: (i % 10) * 3 + 1, y: Math.floor(i / 10) * 3, z: i % 2 === 0 ? 0 : 1,
        side: "enemy", weaponKey: "scimitar", stats: stats, hp: 30, maxHp: 30, level: 1
    });
}
const t0 = process.hrtime.bigint();
e.advanceReal(6000 * rounds);
const wallMs = Number(process.hrtime.bigint() - t0) / 1e6;
const log = e.transcript();
const attacks = log.filter(function (ev) { return ev.type === "attack"; }).length;
const feedback = e.feedback().length;
console.log("BENCH presentation pairs " + pairs + " rounds " + rounds + " attacks " + attacks + " feedback " + feedback + " wall " + wallMs.toFixed(1) + " ms");
console.log("BENCH perRound " + (wallMs / rounds).toFixed(2) + " ms");
