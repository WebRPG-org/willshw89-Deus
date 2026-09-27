//=============================================================================
// DEUS_Move8.js - Eight-direction character movement (A9c item 43)
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Move8] Eight-direction character steps on the square tile grid.
 * @author DEUS
 * @orderAfter DEUS_Movement8D
 *
 * @help
 * Characters step in eight directions. The camera stays the RMMZ top-down
 * 3/4 view. There is no oblique projection. Terrain, walls and caves stay
 * on whole tiles. A diagonal step is 3 px on each axis per frame. An
 * orthogonal walk step is 4 px per frame and a run step is 6 px per frame.
 * Sheet rows are S, SW, W, NW, N, NE, E, SE.
 * Headless math: game/js/sim/combat_rt/move8.js. Docs: docs/systems/DEUS_CombatU7.md.
 *
 * Set character._deusMove8 = false to leave a character on the stock step.
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
        console.error("[DEUS_Move8] sim module missing");
        return;
    }
    mod.attach(root);
    const Move = root.UF.Move8;
    const GB = root.Game_CharacterBase;
    if (!GB || !GB.prototype || GB.prototype.__deusMove8) return;
    GB.prototype.__deusMove8 = true;

    const prevDist = GB.prototype.distancePerFrame;
    GB.prototype.distancePerFrame = function() {
        if (this._deusMove8 === false || typeof prevDist !== "function") {
            return typeof prevDist === "function" ? prevDist.call(this) : 0;
        }
        let tile = 48;
        if (root.$gameMap && typeof root.$gameMap.tileWidth === "function") {
            const w = root.$gameMap.tileWidth();
            if (w > 0) tile = w;
        }
        const px = Move.stepPixels(!!this._deusMove8Diagonal, !!this._deusMove8Run);
        return px / tile;
    };

    const prevStraight = GB.prototype.moveStraight;
    if (typeof prevStraight === "function") {
        GB.prototype.moveStraight = function(d) {
            this._deusMove8Diagonal = false;
            return prevStraight.call(this, d);
        };
    }
    const prevDiag = GB.prototype.moveDiagonally;
    if (typeof prevDiag === "function") {
        GB.prototype.moveDiagonally = function(horz, vert) {
            this._deusMove8Diagonal = true;
            return prevDiag.call(this, horz, vert);
        };
    }

    GB.prototype.deusDir8 = function(dx, dy) {
        const dir = mod.move8.directionOf(dx, dy);
        if (!dir) return this._deusDir || "S";
        this._deusDir = dir.id;
        this._deusDir8 = dir.numpad;
        return dir.id;
    };
})();
