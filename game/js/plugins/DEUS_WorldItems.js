//=============================================================================
// DEUS_WorldItems.js - U7-style world item placement
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS World Items] 6 px placement, surfaces, containers, 8-way item blocking, readability.
 * @author DEUS
 * @orderAfter DEUS_Containers
 * @orderAfter DEUS_Movement8D
 * @orderAfter DEUS_Items
 *
 * @help
 * Headless rules live in game/js/sim/world_items and load through Node require.
 * Sprites are resolved by slot id only. This plugin does not load images.
 * Register this plugin after DEUS_Containers. Do not edit plugins.js here;
 * the lane report carries the registration request.
 *
 * PM input defaults (Owner may override): Shift cycles a stack, PageUp holds 3x,
 * PageDown holds 4x. Large (48 px) items block tiles. Diagonal steps do not cut
 * a blocked corner.
 */

(() => {
    "use strict";

    const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this);
    root.DEUS = root.DEUS || {};
    root.UF = root.UF || root.DEUS;

    function loadSim() {
        if (typeof require !== "function") return null;
        const attempts = ["../sim/world_items"];
        try {
            const path = require("path");
            if (typeof __dirname !== "undefined") attempts.unshift(path.join(__dirname, "..", "sim", "world_items"));
            if (typeof process !== "undefined" && process.cwd) {
                attempts.push(path.join(process.cwd(), "game", "js", "sim", "world_items"));
            }
        } catch (err) { /* path is absent in a plain browser */ }
        for (let i = 0; i < attempts.length; i++) {
            try { return require(attempts[i]); } catch (err) { /* try the next path */ }
        }
        return null;
    }

    const sim = loadSim();
    let active = null;

    const WorldItems = {
        sim: sim,
        createWorld: function (opts) {
            if (!sim) throw new Error("E_SIM: world item sim is not loaded");
            return sim.createWorld(opts);
        },
        constants: sim ? sim.constants : null,
        bind: function (world) { active = world; return world; },
        active: function () { return active; },
        blocksTile: function (x, y, layer) {
            if (!active || typeof active.tileBlocked !== "function") return false;
            return active.tileBlocked(x, y, layer || 0);
        },
        onLegacySpill: function (containerId, spilled) {
            if (!active || typeof active.noteLegacySpill !== "function") return null;
            return active.noteLegacySpill(containerId, spilled);
        },
        setPointer: function (fn) { WorldItems.pointer = fn; },
        onContainerOpen: function (container) {
            if (!active || !container || container.id == null || typeof active.get !== "function") return null;
            try { active.get(container.id); } catch (err) { return null; }
            if (typeof active.doubleClick !== "function") return null;
            return active.doubleClick(container.id);
        }
    };

    root.DEUS.WorldItems = WorldItems;
    if (root.UF) root.UF.WorldItems = WorldItems;

    const Containers = root.DEUS.Containers;
    if (Containers && typeof Containers.attachU7 === "function") Containers.attachU7(WorldItems);

    if (typeof Game_CharacterBase !== "undefined" && Game_CharacterBase.prototype) {
        const prevPass = Game_CharacterBase.prototype.canPass;
        if (typeof prevPass === "function") {
            Game_CharacterBase.prototype.canPass = function (x, y, d) {
                if (!prevPass.call(this, x, y, d)) return false;
                if (typeof $gameMap === "undefined" || !$gameMap.roundXWithDirection) return true;
                const x2 = $gameMap.roundXWithDirection(x, d);
                const y2 = $gameMap.roundYWithDirection(y, d);
                if (WorldItems.blocksTile(x2, y2, this._deusLayer || 0)) return false;
                return true;
            };
        }
        const prevDiag = Game_CharacterBase.prototype.canPassDiagonally;
        if (typeof prevDiag === "function") {
            Game_CharacterBase.prototype.canPassDiagonally = function (x, y, horz, vert) {
                if (!prevDiag.call(this, x, y, horz, vert)) return false;
                if (typeof $gameMap === "undefined" || !$gameMap.roundXWithDirection) return true;
                const x2 = $gameMap.roundXWithDirection(x, horz);
                const y2 = $gameMap.roundYWithDirection(y, vert);
                const layer = this._deusLayer || 0;
                if (WorldItems.blocksTile(x2, y2, layer)) return false;
                if (WorldItems.blocksTile($gameMap.roundXWithDirection(x, horz), y, layer)) return false;
                if (WorldItems.blocksTile(x, $gameMap.roundYWithDirection(y, vert), layer)) return false;
                return true;
            };
        }
    }

    if (typeof Scene_Map !== "undefined" && Scene_Map.prototype && sim) {
        const prevUpdate = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function () {
            prevUpdate.call(this);
            const world = WorldItems.active();
            if (!world || typeof Input === "undefined") return;
            const key = sim.constants;
            if (Input.isPressed(key.ZOOM_HOLD_4)) world.setZoomHold(true, 4);
            else if (Input.isPressed(key.ZOOM_HOLD_3)) world.setZoomHold(true, 3);
            else if (world.zoom()) world.setZoomHold(false);
            if (Input.isTriggered(key.PICK_MODIFIER) && typeof WorldItems.pointer === "function") {
                const p = WorldItems.pointer();
                if (p) world.pick(p.xPx, p.yPx, p.layer || 0, { cycle: 1 });
            }
        };
    }

    if (typeof module !== "undefined" && module.exports) module.exports = WorldItems;
})();
