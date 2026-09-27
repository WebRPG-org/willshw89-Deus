//=============================================================================
// DEUS_CombatRT.js - On-map real-time combat with pause (U7 presentation)
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS CombatRT] On-map real-time combat. Resolution stays in UF.Rules.
 * @author DEUS
 * @orderAfter DEUS_Combat
 * @orderAfter DEUS_Move8
 *
 * @help
 * Fights stay on the map. There is no battle scene. One sim round is six
 * seconds at 1x. Pause and speed keep the same dice stream. Fortress and
 * hero mode share combat state, initiative and orders.
 * Headless engine: game/js/sim/combat_rt. Docs: docs/systems/DEUS_CombatU7.md.
 *
 * UF.CombatRT.start({ rules, seed, mode }) begins an encounter and pauses the
 * legacy combat tick while it owns the fight. UF.CombatRT.noteResolved
 * records presentation for an attack DEUS_Combat already resolved.
 * UF.CombatRT.enlistTamed(units) adds domesticated creatures on the player side.
 * UF.CombatRT.setOrder(id, { type }) is follow, attack, or hold.
 */

(() => {
    "use strict";

    function loadMod() {
        if (typeof require !== "function") return null;
        try {
            const path = require("path");
            const fs = require("fs");
            const roots = [];
            if (typeof __dirname === "string") roots.push(__dirname);
            if (typeof process !== "undefined" && typeof process.cwd === "function") roots.push(process.cwd());
            const candidates = [];
            for (let i = 0; i < roots.length; i++) {
                candidates.push(path.join(roots[i], "..", "sim", "combat_rt"));
                candidates.push(path.join(roots[i], "js", "sim", "combat_rt"));
                candidates.push(path.join(roots[i], "game", "js", "sim", "combat_rt"));
            }
            for (let i = 0; i < candidates.length; i++) {
                if (fs.existsSync(path.join(candidates[i], "index.js"))) return require(candidates[i]);
            }
        } catch (e) {
            return null;
        }
        return null;
    }

    const mod = loadMod();
    const root = typeof window !== "undefined" ? window : globalThis;
    if (!mod) {
        console.error("[DEUS_CombatRT] sim module missing");
        return;
    }
    const bus = mod.attach(root);

    if (typeof Game_Map !== "undefined" && Game_Map.prototype && !Game_Map.prototype.__deusCombatRt) {
        Game_Map.prototype.__deusCombatRt = true;
        const prev = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            if (typeof prev === "function") prev.call(this, sceneActive);
            if (sceneActive === false || !bus.enabled) return;
            try { bus.advanceFrame(); } catch (e) { console.error("[DEUS_CombatRT]", e); }
        };
    }
})();
