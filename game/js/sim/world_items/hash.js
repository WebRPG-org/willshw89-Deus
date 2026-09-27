"use strict";
// Deterministic mix. The function does not draw a random number and does not read the clock.

function mix32(n) {
    n = n >>> 0;
    n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
    n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
    return (n ^ (n >>> 16)) >>> 0;
}

function hashStr(s) {
    let h = 0x811c9dc5;
    const str = String(s);
    for (let i = 0; i < str.length; i++) h = mix32(h ^ str.charCodeAt(i));
    return h >>> 0;
}

function mix(parts) {
    let h = 0x811c9dc5;
    for (let i = 0; i < parts.length; i++) h = mix32(h ^ (parts[i] >>> 0));
    return h >>> 0;
}

module.exports = { mix32, hashStr, mix };
