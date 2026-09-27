//=============================================================================
// DEUS_CombatUI.js - Fortress and hero control layers for on-map combat
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS CombatUI] Commander and hero controls on the map screen.
 * @author DEUS
 * @orderAfter DEUS_CombatRT
 *
 * @help
 * Two control layers, one map scene. Tab (or the mode-switch button) moves
 * between fortress and hero. The selected-unit panel uses that unit's race
 * window skin and race faceset background. It does not cover the fight's
 * Z readout. Window scale is an integer. Fortress zoom-out is a 1x render
 * plus a colour-coded tile minimap, with no downscaled blur.
 * Docs: docs/systems/DEUS_CombatU7.md.
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
        console.error("[DEUS_CombatUI] sim module missing");
        return;
    }
    mod.attach(root);

    if (typeof Input !== "undefined" && Input.keyMapper && !Input.keyMapper[9]) {
        Input.keyMapper[9] = "deusCombatMode";
    }

    if (typeof Scene_Map !== "undefined" && Scene_Map.prototype && !Scene_Map.prototype.__deusCombatUi) {
        Scene_Map.prototype.__deusCombatUi = true;
        const prev = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            if (typeof prev === "function") prev.call(this);
            const RT = root.UF && root.UF.CombatRT;
            const enc = RT && typeof RT.encounter === "function" ? RT.encounter() : null;
            if (!enc || !RT.enabled) return;
            if (typeof Input !== "undefined" && Input.isTriggered && Input.isTriggered("deusCombatMode")) {
                try { root.UF.CombatUI.command(enc, { type: "switch" }); } catch (e) { console.error("[DEUS_CombatUI]", e); }
            }
        };
    }
})();
