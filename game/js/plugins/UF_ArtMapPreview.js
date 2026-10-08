/*:
 * @target MZ
 * @plugindesc Native playable inspection for a TEST_ART map (editor Playtest only).
 * @author Endrath Art
 *
 * @param MapId
 * @text Inspection map
 * @type number
 * @default 2
 *
 * @help
 * Place this plugin FIRST. It records the stock MZ method implementations before
 * the simulation plugins load. It changes nothing unless all three conditions
 * hold: editor Playtest (`test`), System's player start is MapId, and that map's
 * name starts with TEST_ART_. Autotests and ordinary game launches are excluded.
 *
 * The production world overrides native map starts, movement and rendering.
 * For this explicitly selected inspection session only, this plugin restores
 * the captured stock methods after the database has loaded. No engine file or
 * other plugin file is edited. Returning the editor's start to another map and
 * restarting Playtest restores the full production simulation automatically.
 *
 * Replaced methods IN THE INSPECTION SESSION ONLY: function-valued own members
 * of stock Game_*, Scene_*, Sprite_*, Spriteset_*, Window_* prototypes; Bitmap,
 * Sprite, ScreenSprite, Tilemap and Window prototypes; and the static methods of
 * DataManager, ConfigManager, SceneManager, BattleManager, ImageManager,
 * AudioManager, Input and TouchInput, except TouchInput's DOM event handlers
 * (_setupEventHandlers, _onMouse*, _onWheel, _onTouch*, _onLostFocus): those
 * are bound into document/window listeners by TouchInput.initialize() before
 * this plugin activates, so they stay as the plugins installed them, which
 * keeps DEUS_ColonyOverseer's pointer observation (notePointer/notePointerGone)
 * and its blur/leave guards. Extra plugin methods and live engine state are
 * retained. Scene_Boot.startNormalGame then opens the map directly.
 *
 * Edge panning (2026-10-07): the restore drops DEUS_ColonyOverseer's
 * Scene_Map.update alias, the only caller of its edge-pan step. This plugin
 * therefore runs, per frame, one stock Scene_Map.update and then one
 * UF.Overseer.edgePan.step(scene). The step keeps the Overseer's own decisions
 * (UF.Overseer.edgePan.blockReason: disabled, speed 0, overseer mode off, no
 * observed pointer, pointer outside the canvas, held-press threshold, UI or a
 * window under the pointer, context menu, talk, busy message, item drag) and
 * scrolls the view through $gameMap only, so arrows/WASD still walk the player
 * natively. The rest of updateOverseerControls (selection, colonist orders)
 * stays out of the inspection scene.
 *
 * Native events and tiles are used. Arrows/WASD walk, Shift runs. Tree/rock/log
 * base events block movement. The temporary inspection character reuses the
 * existing actor 3 character image in memory; Actors.json is never modified.
 * No save slot is written, and the inspection menu is disabled.
 * The map uses the project's System screen dimensions without changing them.
 */
(() => {
    "use strict";
    const p = PluginManager.parameters("UF_ArtMapPreview");
    const mapId = Number(p.MapId || 2);
    const records = [];
    // TouchInput's DOM event handlers are bound into document/window listeners by TouchInput.initialize()
    // (SceneManager.initInput), before the database loads and this plugin activates. Restoring them later
    // cannot reach those listeners; it would only desynchronise the properties from the live handlers and
    // drop DEUS_ColonyOverseer's pointer observation (notePointer / notePointerGone, what its edge pan
    // reads). They stay as the plugins installed them; the rest of TouchInput is still restored.
    const TOUCH_EVENT_HANDLERS = Object.freeze(["_setupEventHandlers", "_onMouseDown", "_onMouseMove",
        "_onMouseUp", "_onWheel", "_onTouchStart", "_onTouchMove", "_onTouchEnd", "_onTouchCancel",
        "_onLostFocus"]);
    function capture(target, skip) {
        for (const name of Object.getOwnPropertyNames(target)) {
            if (name === "constructor" || (skip && skip.includes(name))) continue;
            const descriptor = Object.getOwnPropertyDescriptor(target, name);
            if (descriptor && typeof descriptor.value === "function") {
                records.push({ target, name, descriptor });
            }
        }
    }
    /** DEUS_ColonyOverseer's public edge-pan authority (DEUS/UF.Overseer.edgePan), or null when it is not loaded. */
    function overseerEdgePan() {
        const overseer = window.UF && UF.Overseer;
        const edgePan = overseer && overseer.edgePan;
        return edgePan && typeof edgePan.step === "function" ? edgePan : null;
    }
    const prototypeNames = [];
    for (const name of Object.getOwnPropertyNames(window)) {
        if (!/^(Game_|Scene_|Sprite_|Spriteset_|Window_)/.test(name) &&
            !["Bitmap", "Sprite", "ScreenSprite", "Tilemap", "Window"].includes(name)) continue;
        const descriptor = Object.getOwnPropertyDescriptor(window, name);
        const value = descriptor && descriptor.value;
        if (typeof value === "function" && value.prototype) {
            capture(value.prototype);
            prototypeNames.push(name);
        }
    }
    for (const target of [DataManager, ConfigManager, SceneManager, BattleManager,
        ImageManager, AudioManager, Input]) capture(target);
    capture(TouchInput, TOUCH_EVENT_HANDLERS);
    const keyMapper = Object.assign({}, Input.keyMapper);
    const gamepadMapper = Object.assign({}, Input.gamepadMapper);
    const databaseReady = DataManager.isDatabaseLoaded;
    let active = false;

    function selected() {
        return Utils.isOptionValid("test") &&
            window.$dataSystem && $dataSystem.startMapId === mapId &&
            window.$dataMapInfos && $dataMapInfos[mapId] &&
            $dataMapInfos[mapId].name.startsWith("TEST_ART_");
    }

    function activate() {
        active = true;
        for (const record of records) {
            Object.defineProperty(record.target, record.name, record.descriptor);
        }
        Input.keyMapper = Object.assign({}, keyMapper, {
            65: "left", 68: "right", 87: "up", 83: "down"
        });
        Input.gamepadMapper = Object.assign({}, gamepadMapper);
        Input.clear();
        TouchInput.clear();
        Scene_Boot.prototype.startNormalGame = function() {
            this.checkPlayerLocation();
            DataManager.setupNewGame();
            const actor = $gameParty.leader();
            const sourceActor = $dataActors[3];
            if (actor && sourceActor && sourceActor.characterName) {
                actor.setCharacterImage(sourceActor.characterName, sourceActor.characterIndex);
            }
            $gamePlayer.setTransparent(false);
            $gamePlayer.setThrough(false);
            $gamePlayer.refresh();
            $gamePlayer.followers().hide();
            $gameSystem.disableMenu();
            SceneManager.goto(Scene_Map);
        };
        const mapStart = Scene_Map.prototype.start;
        Scene_Map.prototype.start = function() {
            mapStart.call(this);
            if (this._mapNameWindow) this._mapNameWindow.hide();
            console.info("[UF_ArtMapPreview] ready", {
                mapId: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y,
                width: $gameMap.width(), height: $gameMap.height(),
                events: $gameMap.events().length,
                resolution: [Graphics.width, Graphics.height],
                overseerEdgePan: !!overseerEdgePan()
            });
        };
        // The restore above put the stock Scene_Map.update back, which dropped DEUS_ColonyOverseer's update alias,
        // the only caller of its edge-pan step. Per frame: one stock map update, then one Overseer edge-pan step
        // through its public API. The step keeps the Overseer's own decisions (UF.Overseer.edgePan.blockReason:
        // disabled, speed 0, overseer mode off, no observed pointer, pointer outside the canvas, held-press
        // threshold, UI or a window under the pointer, context menu, talk, busy message, item drag) and scrolls
        // the view through $gameMap.scrollLeft/Right/Up/Down only, so arrows/WASD keep walking the player
        // natively. The rest of updateOverseerControls (selection, colonist orders) stays out of this scene.
        const mapUpdate = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            mapUpdate.call(this);
            const edgePan = overseerEdgePan();
            if (edgePan) edgePan.step(this);
        };
        window.UF_ArtMapPreview = Object.freeze({ active: true, mapId,
            restoredMethodCount: records.length, prototypeNames: prototypeNames.slice(),
            keptTouchInputHandlers: TOUCH_EVENT_HANDLERS.slice(),
            overseerEdgePan: !!overseerEdgePan() });
    }

    DataManager.isDatabaseLoaded = function() {
        const ready = databaseReady.call(this);
        if (ready && !active && selected()) activate();
        return ready;
    };
})();
