"use strict";
// Same mulberry32 as game/js/sim/rules/dice.js, plus a readable state word
// so a mode switch can keep the dice stream.

function createRng(seed) {
    let a = (seed >>> 0);
    return {
        next: function next() {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        },
        state: function state() { return a >>> 0; },
        setState: function setState(s) { a = (s >>> 0); }
    };
}

module.exports = { createRng };
