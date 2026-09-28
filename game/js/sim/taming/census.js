"use strict";
// Captive and domesticated creatures leave the wild count.
// A domesticated creature is counted once, as domestic.

const record = require("./record");

function census(units) {
    const list = units || [];
    let wild = 0;
    let domestic = 0;
    let captive = 0;
    let dead = 0;
    const byRole = { pet: 0, mount: 0, livestock: 0, work: 0 };
    for (let i = 0; i < list.length; i++) {
        const unit = list[i];
        const data = unit && unit.data;
        if (!data || data.kind !== "creature") continue;
        const rec = data.taming;
        if (rec && (rec.status === "dead" || rec.dead === true)) {
            dead += 1; // BG_CENSUS_DEAD
        } else if (rec && rec.status === "domesticated") {
            domestic += 1; // AX_CENSUS_DOMESTIC
            if (Object.prototype.hasOwnProperty.call(byRole, rec.role)) byRole[rec.role] += 1;
        } else if (rec && rec.status === "captive") {
            captive += 1;
        } else {
            wild += 1;
        }
    }
    return {
        wild: wild,
        domestic: domestic,
        captive: captive,
        dead: dead,
        byRole: byRole,
        total: wild + domestic + captive + dead
    };
}

// Public ecology summaries count every creature. Move held animals out of those buckets.
// Returns the same object when nothing was held, so an empty world stays identical.
function excludeWithdrawnFromSummary(summary, units, speciesOf) {
    if (!summary || typeof summary !== "object") return summary;
    const list = units || [];
    let moved = 0;
    const next = {
        prey: summary.prey || 0,
        monsters: summary.monsters || 0,
        predators: summary.predators || 0,
        creatures: summary.creatures || 0,
        bySpecies: Object.assign({}, summary.bySpecies || {}),
        domestic: summary.domestic || 0,
        captive: summary.captive || 0,
        dead: summary.dead || 0
    };
    for (let i = 0; i < list.length; i++) {
        const unit = list[i];
        if (!record.withdrawnFromWild(unit)) continue;
        const sp = typeof speciesOf === "function" ? speciesOf(unit) : null;
        if (!sp) continue;
        moved += 1;
        next.creatures = Math.max(0, next.creatures - 1);
        if (next.bySpecies[sp.id]) next.bySpecies[sp.id] = Math.max(0, next.bySpecies[sp.id] - 1);
        const preyKind = !!sp.prey || sp.kind === "grazer" || sp.kind === "vermin" || sp.kind === "flier";
        if (preyKind) next.prey = Math.max(0, next.prey - 1);
        else if (sp.kind === "monster") next.monsters = Math.max(0, next.monsters - 1);
        else if (sp.kind === "predator") next.predators = Math.max(0, next.predators - 1);
        if (unit.data.taming.status === "dead" || unit.data.taming.dead === true) next.dead += 1;
        else if (unit.data.taming.status === "domesticated") next.domestic += 1;
        else next.captive += 1;
    }
    if (!moved) return summary;
    return next;
}

module.exports = {
    census: census,
    excludeWithdrawnFromSummary: excludeWithdrawnFromSummary
};
