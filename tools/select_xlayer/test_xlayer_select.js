"use strict";
// WG.00.36. Cross-layer selection. Five checks, each with a provocation that FAILs it.
// The checks load DEUS_Select with PluginManager present and drive the live drag,
// click, group-move, level-change, and view-change paths.
//
//   node tools/select_xlayer/test_xlayer_select.js
//   node tools/select_xlayer/test_xlayer_select.js --provoke=box_visible
//   node tools/select_xlayer/test_xlayer_select.js --provoke-all
//
// No flag: every check passes, exit 0.
// --provoke=<name>: that check FAILs, exit 1.
// --provoke-all: one child per check. This process exits 0 only when every child exited 1.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const SELECT_FILE = path.join(ROOT, "game", "js", "plugins", "DEUS_Select.js");
const OVERLAY_FILE = path.join(ROOT, "game", "js", "plugins", "DEUS_LayerOverlays.js");
const X = require(SELECT_FILE);
const L = require(OVERLAY_FILE);

const NAMES = ["box_visible", "shift_layers", "group_orders", "survive", "perf"];
const args = process.argv.slice(2);
const provokeAll = args.indexOf("--provoke-all") >= 0;
const provokeArg = (args.find(function (s) { return s.indexOf("--provoke=") === 0; }) || "").slice("--provoke=".length);

function fnBody(src, name) {
    const token = "function " + name;
    const i = src.indexOf(token);
    if (i < 0) return "";
    const brace = src.indexOf("{", i);
    let depth = 0;
    for (let k = brace; k < src.length; k++) {
        const ch = src.charAt(k);
        if (ch === "{") depth++;
        else if (ch === "}") {
            depth--;
            if (depth === 0) return src.slice(i, k + 1);
        }
    }
    return "";
}

const SRC = fs.readFileSync(SELECT_FILE, "utf8");
const PLUGIN = SRC.split("typeof PluginManager")[1] || "";

function player(u) {
    return !!(u && u.data && (u.data.kind === "colonist" || u.data.faction === "player"));
}

function cover(x, y, z) {
    return x === 4 && y === 4 && z === 0;
}

function visible(x, y, z) {
    return L.cellVisible({
        x: x,
        y: y,
        z: z,
        viewZ: 0,
        maxDepth: 2,
        opaque: cover
    }) === true;
}

function worldUnits() {
    const area = { x: 0, y: 0 };
    function u(id, x, y, z, faction) {
        const fac = faction || "player";
        return { id: id, x: x, y: y, z: z, area: area, data: { faction: fac, kind: fac === "player" ? "colonist" : "person" } };
    }
    return [
        u(1, 1, 1, 0),
        u(2, 2, 2, -1),
        u(3, 4, 4, -1),
        u(4, 8, 8, 0),
        u(5, 1, 3, 0),
        u(6, 2, 2, 1),
        u(7, 2, 2, -3),
        u(8, 2, 2, -2, "allied"),
        u(9, 3, 1, 0),
        u(10, 3, 1, -1)
    ];
}

function pick(units, box) {
    const index = X.indexUnits(units);
    let calls = 0;
    const q = X.unitsInBox({
        x0: box.x0,
        y0: box.y0,
        x1: box.x1,
        y1: box.y1,
        viewZ: 0,
        maxDepth: 2,
        area: { x: 0, y: 0 },
        visible: function (x, y, z) {
            calls++;
            return visible(x, y, z);
        },
        unitsAt: function (x, y, z) { return X.unitsAt(index, 0, 0, x, y, z); },
        isPlayer: player
    });
    q.calls = calls;
    return q;
}

function has(ids, id) {
    return ids.indexOf(id) >= 0;
}

function guard(problems, fn) {
    try {
        fn();
    } catch (err) {
        const line = err && err.stack ? String(err.stack).split("\n")[0] : String(err);
        problems.push(line);
    }
}

// Live plugin: PluginManager is present, so the production closure runs.
function bootLive() {
    const list = [];
    const byId = new Map();
    const jobs = [];
    const bound = [];
    const counter = { reads: 0 };
    const counted = new Proxy(list, {
        get: function (target, key) {
            if (typeof key === "string" && /^[0-9]+$/.test(key)) counter.reads++;
            const value = target[key];
            return typeof value === "function" ? value.bind(target) : value;
        }
    });
    const listeners = {};
    const events = {
        on: function (name, fn) {
            bound.push(name);
            if (!listeners[name]) listeners[name] = [];
            listeners[name].push(fn);
        },
        emit: function (name) {
            const fns = listeners[name] || [];
            const rest = Array.prototype.slice.call(arguments, 1);
            for (let i = 0; i < fns.length; i++) fns[i].apply(null, rest);
        }
    };
    let vz = 0;
    const depth = {
        config: {
            enabled: true,
            maxDepth: 2,
            exposes: function () { return true; }
        },
        isOpen: function (ax, ay, x, y, z) {
            return !(x === 4 && y === 4 && z === 0);
        }
    };
    let standable = function () { return true; };
    let jobSeq = 0;

    function moveUnitToLevel(unit, z, x, y) {
        const fromZ = unit.z | 0;
        const fx = unit.x;
        const fy = unit.y;
        unit.z = z | 0;
        if (x != null) unit.x = x | 0;
        if (y != null) unit.y = y | 0;
        events.emit("world:unitLevelChanged", unit, fromZ, unit.z);
        if (unit.x !== fx || unit.y !== fy) {
            events.emit("world:unitMoved", unit, { x: fx, y: fy }, { x: unit.x, y: unit.y });
        }
        return true;
    }

    function follow(unit, job) {
        const steps = [];
        const target = job.target;
        let guardN = 0;
        while (guardN++ < 80 && ((unit.z | 0) !== (target.z | 0) || (unit.x | 0) !== (target.x | 0) || (unit.y | 0) !== (target.y | 0))) {
            if ((unit.z | 0) !== (target.z | 0)) {
                if ((unit.x | 0) !== 0 || (unit.y | 0) !== 0) {
                    const fx = unit.x;
                    const fy = unit.y;
                    unit.x += Math.sign(0 - unit.x);
                    unit.y += Math.sign(0 - unit.y);
                    events.emit("world:unitMoved", unit, { x: fx, y: fy }, { x: unit.x, y: unit.y });
                    steps.push({ x: unit.x | 0, y: unit.y | 0, z: unit.z | 0, via: "walk" });
                } else {
                    const nz = (unit.z | 0) + Math.sign((target.z | 0) - (unit.z | 0));
                    moveUnitToLevel(unit, nz);
                    steps.push({ x: unit.x | 0, y: unit.y | 0, z: unit.z | 0, via: "slope" });
                }
            } else {
                const fx = unit.x;
                const fy = unit.y;
                unit.x += Math.sign((target.x | 0) - unit.x);
                unit.y += Math.sign((target.y | 0) - unit.y);
                events.emit("world:unitMoved", unit, { x: fx, y: fy }, { x: unit.x, y: unit.y });
                steps.push({ x: unit.x | 0, y: unit.y | 0, z: unit.z | 0, via: "walk" });
            }
        }
        return steps;
    }

    function createJob(spec, via) {
        const job = {
            id: ++jobSeq,
            type: spec.type,
            target: spec.target,
            owner: spec.owner,
            params: spec.params || {},
            via: via,
            steps: []
        };
        jobs.push(job);
        const u = byId.get(spec.owner);
        if (u && spec.type === "move" && spec.target) job.steps = follow(u, job);
        return job;
    }

    const ctx = {
        console: console,
        performance: performance,
        process: process,
        PluginManager: { parameters: function () { return {}; } },
        Input: {
            keyMapper: {},
            isTriggered: function () { return false; },
            isPressed: function () { return false; }
        },
        TouchInput: {
            x: 0,
            y: 0,
            _x: 0,
            _y: 0,
            _shiftKey: false,
            _pressed: false,
            _currentState: { triggered: false, cancelled: false },
            isTriggered: function () { return !!(this._currentState && this._currentState.triggered); },
            isPressed: function () { return this._pressed === true; },
            isReleased: function () { return this._pressed !== true; },
            isCancelled: function () { return !!(this._currentState && this._currentState.cancelled); }
        },
        Graphics: {
            width: 816,
            height: 624,
            frameCount: 1,
            _canvas: { style: {} },
            isInsideCanvas: function () { return true; }
        },
        SoundManager: {
            playOk: function () {},
            playBuzzer: function () {},
            playCursor: function () {},
            playCancel: function () {}
        },
        SceneManager: { _scene: null },
        DataManager: { extractSaveContents: function () {} },
        $gameMessage: { isBusy: function () { return false; } },
        $gameMap: {
            canvasToMapX: function (x) { return x | 0; },
            canvasToMapY: function (y) { return y | 0; },
            isValid: function () { return true; },
            adjustX: function (x) { return x; },
            adjustY: function (y) { return y; },
            events: function () { return []; }
        },
        Sprite: function Sprite() {},
        Bitmap: function Bitmap() {},
        Window_Base: function Window_Base() {},
        Window_Command: function Window_Command() {},
        Scene_Boot: function Scene_Boot() {},
        Scene_Map: function Scene_Map() {},
        Spriteset_Map: function Spriteset_Map() {},
        Rectangle: function Rectangle() {}
    };
    ctx.window = ctx;
    ctx.globalThis = ctx;
    ctx.Sprite.prototype.initialize = function () {};
    ctx.Sprite.prototype.update = function () {};
    ctx.Window_Base.prototype.initialize = function () {};
    ctx.Window_Command.prototype.initialize = function () {};
    ctx.Scene_Boot.prototype.start = function () {};
    ctx.Scene_Map.prototype.createDisplayObjects = function () {};
    ctx.Scene_Map.prototype.isAnyWindowUnderMouse = function () { return false; };
    ctx.Scene_Map.prototype.terminate = function () {};
    ctx.Scene_Map.prototype.update = function () {};
    ctx.Scene_Map.prototype.updateOverseerControls = function () {};
    ctx.Spriteset_Map.prototype.createCharacters = function () {};
    ctx.Spriteset_Map.prototype.update = function () {};
    ctx.UF = {
        Events: events,
        Depth: depth,
        Levels: { viewZ: function () { return vz; } },
        World: {
            units: function () { return counted; },
            unit: function (id) { return byId.get(id) || null; },
            currentArea: function () { return { x: 0, y: 0 }; }
        },
        Colonists: {
            isColonist: function (u) { return !!(u && u.data && u.data.kind === "colonist"); },
            order: function (id, spec) {
                return createJob({ type: spec.type, target: spec.target, owner: id, params: spec.params }, "C.order");
            }
        },
        Jobs: {
            standable: function (area, x, y) { return standable(area, x, y); },
            list: function () { return jobs; },
            create: function (spec) { return createJob(spec, "J.create"); }
        }
    };
    ctx.DEUS = ctx.UF;
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(SELECT_FILE, "utf8"), ctx, { filename: "DEUS_Select.js" });
    vm.runInContext(fs.readFileSync(OVERLAY_FILE, "utf8"), ctx, { filename: "DEUS_LayerOverlays.js" });
    const scene = new ctx.Scene_Map();
    ctx.SceneManager._scene = scene;
    const Select = ctx.UF.Select;
    const TI = ctx.TouchInput;

    function point(x, y) {
        TI.x = x;
        TI.y = y;
        TI._x = x;
        TI._y = y;
    }

    function addUnit(spec) {
        const unit = {
            id: spec.id,
            x: spec.x | 0,
            y: spec.y | 0,
            z: spec.z | 0,
            area: spec.area || { x: 0, y: 0 },
            data: spec.data || { faction: "player", kind: "colonist" }
        };
        byId.set(unit.id, unit);
        list.push(unit);
        events.emit("world:unitAdded", unit);
        return unit;
    }

    function placeRaw(spec) {
        const unit = {
            id: spec.id,
            x: spec.x | 0,
            y: spec.y | 0,
            z: spec.z | 0,
            area: spec.area || { x: 0, y: 0 },
            data: spec.data || { faction: "player", kind: "colonist" }
        };
        byId.set(unit.id, unit);
        list.push(unit);
        return unit;
    }

    function removeUnit(id) {
        const unit = byId.get(id);
        if (!unit) return;
        byId.delete(id);
        const i = list.indexOf(unit);
        if (i >= 0) list.splice(i, 1);
        events.emit("world:unitRemoved", unit);
    }

    function reset() {
        TI._pressed = false;
        TI._shiftKey = false;
        TI._currentState = { triggered: false, cancelled: false };
        scene.update();
        Select.clearSelection();
        const ids = Array.from(byId.keys());
        for (let i = 0; i < ids.length; i++) removeUnit(ids[i]);
        jobs.length = 0;
        depth.config.enabled = true;
        depth.config.maxDepth = 2;
        depth.config.exposes = function () { return true; };
        vz = 0;
        standable = function () { return true; };
        counter.reads = 0;
    }

    function drag(x0, y0, x1, y1, shift) {
        point(x0, y0);
        TI._shiftKey = !!shift;
        TI._pressed = true;
        TI._currentState = { triggered: true, cancelled: false };
        scene.updateOverseerControls();
        point(x0 + 1, y0);
        TI._currentState = { triggered: false, cancelled: false };
        counter.reads = 0;
        scene.update();
        const startReads = counter.reads;
        point(x1, y1);
        counter.reads = 0;
        scene.update();
        const previewReads = counter.reads;
        TI._pressed = false;
        counter.reads = 0;
        scene.update();
        return {
            setupReads: startReads + previewReads,
            releaseReads: counter.reads,
            selected: Select.selected().slice()
        };
    }

    function click(x, y, shift) {
        point(x, y);
        TI._shiftKey = !!shift;
        TI._pressed = false;
        TI._currentState = { triggered: true, cancelled: false };
        scene.updateOverseerControls();
        return Select.selected().slice();
    }

    function beginDrag(x, y) {
        point(x, y);
        TI._shiftKey = false;
        TI._pressed = true;
        TI._currentState = { triggered: true, cancelled: false };
        scene.updateOverseerControls();
        point(x + 1, y);
        TI._currentState = { triggered: false, cancelled: false };
        scene.update();
    }

    function setView(z) {
        vz = z;
        events.emit("levels:viewChanged", z);
    }

    return {
        bound: bound,
        byId: byId,
        jobs: jobs,
        depth: depth,
        select: Select,
        counter: counter,
        reset: reset,
        addUnit: addUnit,
        placeRaw: placeRaw,
        removeUnit: removeUnit,
        drag: drag,
        click: click,
        beginDrag: beginDrag,
        setView: setView,
        moveUnitToLevel: moveUnitToLevel,
        setStandable: function (fn) { standable = fn; },
        loadSave: function () { ctx.DataManager.extractSaveContents({}); }
    };
}

let live = null;
let liveError = "";

function harness() {
    if (liveError) throw new Error(liveError);
    if (!live) live = bootLive();
    return live;
}

function checkBox() {
    const problems = [];
    const units = worldUnits();
    const q = pick(units, { x0: 0, y0: 0, x1: 4, y1: 4 });
    if (q.calls === 0) problems.push("cellVisible was not called");
    if (!has(q.ids, 1)) problems.push("viewed colonist missing");
    if (!has(q.ids, 2)) problems.push("visible lower colonist missing");
    if (has(q.ids, 3)) problems.push("unit under solid cover was picked");
    if (has(q.ids, 4)) problems.push("unit outside the box was picked");
    if (has(q.ids, 6)) problems.push("unit above the view was picked");
    if (has(q.ids, 7)) problems.push("unit past maxDepth was picked");
    if (has(q.ids, 8)) problems.push("allied unit was picked");
    if (PLUGIN.indexOf("cellVisible") < 0) problems.push("plugin does not call cellVisible");
    if (/for\s*\(\s*let\s+zz\s*=\s*z\s*\+\s*1/.test(PLUGIN)) problems.push("plugin copies the cover walk");
    const open = L.cellVisible({ x: 2, y: 2, z: -1, viewZ: 0, maxDepth: 2, opaque: cover });
    const shut = L.cellVisible({ x: 4, y: 4, z: -1, viewZ: 0, maxDepth: 2, opaque: cover });
    const here = L.cellVisible({ x: 4, y: 4, z: 0, viewZ: 0, maxDepth: 2, opaque: function () { return true; } });
    if (open !== true || shut !== false || here !== true) problems.push("cellVisible open=" + open + " shut=" + shut + " view=" + here);

    guard(problems, function () {
        const H = harness();
        if (H.bound.indexOf("world:unitAdded") < 0) problems.push("unit index is not bound to world:unitAdded");
        H.reset();
        const fixture = worldUnits();
        for (let i = 0; i < fixture.length; i++) H.addUnit(fixture[i]);
        let got = H.drag(0, 0, 4, 4, false).selected;
        if (has(got, 3)) problems.push("unit under solid cover was picked");
        if (!has(got, 1)) problems.push("viewed colonist missing");
        if (!has(got, 2)) problems.push("visible lower colonist missing");
        if (!has(got, 10)) problems.push("visible lower colonist missing");
        if (has(got, 4)) problems.push("unit outside the box was picked");
        if (has(got, 6)) problems.push("unit above the view was picked");
        if (has(got, 7)) problems.push("unit past maxDepth was picked");
        if (has(got, 8)) problems.push("allied unit was picked");

        H.depth.config.enabled = false;
        got = H.drag(0, 0, 4, 4, false).selected;
        if (has(got, 2) || has(got, 10) || has(got, 3)) problems.push("lower unit picked while depth drawing is off");
        if (!has(got, 1) || !has(got, 5) || !has(got, 9)) problems.push("viewed colonist missing while depth drawing is off");

        H.depth.config.enabled = true;
        got = H.drag(0, 0, 4, 4, false).selected;
        if (!has(got, 2) || !has(got, 10)) problems.push("opening did not select the lower unit after depth drawing was turned on");
        if (has(got, 3)) problems.push("unit under solid cover was picked");

        H.depth.config.enabled = false;
        got = H.drag(0, 0, 4, 4, false).selected;
        if (has(got, 2) || has(got, 10)) problems.push("lower unit stayed selectable after depth drawing was turned off");

        H.reset();
        H.addUnit({ id: 1, x: 1, y: 1, z: 0 });
        H.addUnit({ id: 2, x: 1, y: 1, z: -1 });
        H.addUnit({ id: 11, x: 1, y: 1, z: -2 });
        H.depth.config.exposes = function (z) { return z === 0; };
        got = H.drag(1, 1, 1, 1, false).selected;
        if (!has(got, 1) || !has(got, 2)) problems.push("first exposed plane was not selectable");
        if (has(got, 11)) problems.push("unit past the renderer's exposed planes was picked");
        H.depth.config.exposes = function () { return true; };
        got = H.drag(1, 1, 1, 1, false).selected;
        if (!has(got, 11)) problems.push("unit on the second exposed plane was not picked");

        H.reset();
        H.addUnit({ id: 30, x: 12, y: 12, z: -1 });
        H.addUnit({ id: 1, x: 1, y: 1, z: 0 });
        H.depth.config.enabled = false;
        got = H.click(12, 12, false);
        if (has(got, 30)) problems.push("lower unit picked while depth drawing is off");
        got = H.click(1, 1, false);
        if (!has(got, 1)) problems.push("viewed colonist missing while depth drawing is off");
        H.depth.config.enabled = true;
        got = H.click(12, 12, false);
        if (!has(got, 30)) problems.push("opening did not select the lower unit after depth drawing was turned on");
        H.depth.config.enabled = false;
        H.select.clearSelection();
        got = H.click(12, 12, false);
        if (has(got, 30)) problems.push("lower unit stayed selectable after depth drawing was turned off");
    });
    return problems;
}

function checkShift() {
    const problems = [];
    const units = worldUnits();
    const index = X.indexUnits(units);
    const at = function (x, y, z) { return X.unitsAt(index, 0, 0, x, y, z); };
    const boxA = pick(units, { x0: 1, y0: 1, x1: 1, y1: 1 });
    const boxB = pick(units, { x0: 1, y0: 3, x1: 1, y1: 3 });
    const wide = pick(units, { x0: 0, y0: 0, x1: 4, y1: 4 });
    if (boxA.ids.length !== 1 || !has(boxA.ids, 1)) problems.push("single-layer box A ids " + boxA.ids.join(","));
    const added = X.applyBox(boxA.ids, boxB.ids, true);
    const replaced = X.applyBox(boxA.ids, boxB.ids, false);
    if (added.length !== 2 || !has(added, 1) || !has(added, 5)) problems.push("shift box did not add, got " + added.join(","));
    if (replaced.length !== 1 || replaced[0] !== 5) problems.push("plain box did not replace, got " + replaced.join(","));
    const held = X.applyBox([4], wide.ids, true);
    if (!has(held, 4) || !has(held, 1) || !has(held, 2)) problems.push("shift across levels got " + held.join(","));
    if (has(held, 3)) problems.push("shift box took the buried unit");
    const lower = X.visibleUnitAt({
        viewHit: null,
        x: 3,
        y: 1,
        viewZ: 0,
        maxDepth: 2,
        visible: visible,
        unitsAt: at
    });
    if (!lower || lower.id !== 10) problems.push("click through an opening hit " + (lower && lower.id));
    let toggled = X.toggleId([], lower ? lower.id : 0);
    toggled = X.toggleId(toggled, lower ? lower.id : 0);
    if (toggled.length !== 0) problems.push("shift-click did not toggle off");
    const viewed = units.filter(function (u) { return u.id === 9; })[0];
    const prefer = X.visibleUnitAt({
        viewHit: viewed,
        x: 3,
        y: 1,
        viewZ: 0,
        maxDepth: 2,
        visible: visible,
        unitsAt: at
    });
    if (!prefer || prefer.id !== 9) problems.push("viewed unit lost the click to the unit below");
    if (SRC.indexOf('id: "chop"') < 0 || SRC.indexOf('key: "C"') < 0) problems.push("chop hotkey missing");
    if (SRC.indexOf("resolveClickUnit") < 0) problems.push("clicks do not resolve a lower unit");

    guard(problems, function () {
        const H = harness();
        H.reset();
        const fixture = worldUnits();
        for (let i = 0; i < fixture.length; i++) H.addUnit(fixture[i]);
        H.select.setSelection([4]);
        let got = H.drag(0, 0, 4, 4, true).selected;
        if (!has(got, 4) || !has(got, 1) || !has(got, 2)) problems.push("shift across levels got " + got.join(","));
        if (has(got, 3)) problems.push("shift box took the buried unit");
        got = H.drag(1, 3, 1, 3, false).selected;
        if (got.length !== 1 || got[0] !== 5) problems.push("plain box did not replace, got " + got.join(","));

        H.reset();
        H.addUnit({ id: 9, x: 3, y: 1, z: 0 });
        H.addUnit({ id: 10, x: 3, y: 1, z: -1 });
        got = H.click(3, 1, false);
        if (!has(got, 9) || has(got, 10)) problems.push("viewed unit lost the click to the unit below");
        got = H.click(3, 1, true);
        if (has(got, 9)) problems.push("shift-click did not toggle off");
        H.removeUnit(9);
        got = H.click(3, 1, true);
        if (!has(got, 10)) problems.push("click through an opening hit " + got.join(","));
        got = H.click(3, 1, true);
        if (got.length !== 0) problems.push("shift-click did not toggle off");
    });
    return problems;
}

function checkOrders() {
    const problems = [];
    const units = [
        { id: 1, x: 5, y: 5, z: 0 },
        { id: 2, x: 0, y: 0, z: -1 },
        { id: 3, x: 1, y: 0, z: -1 }
    ];
    const plan = X.planGroupOrders(units, { x: 5, y: 5, z: 0 }, {
        maxRadius: 12,
        standable: function (x, y) { return !(x === 6 && y === 5); },
        cornerFree: function () { return true; }
    });
    const orders = plan.orders;
    const seen = {};
    for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        if (o.z !== 0) problems.push("order " + o.id + " z " + o.z + " from " + o.fromZ);
        const key = o.x + "," + o.y;
        if (seen[key]) problems.push("two units share " + key);
        seen[key] = true;
        if (o.x === 6 && o.y === 5) problems.push("slot on the blocked cell");
    }
    if (orders.length !== 3) problems.push("orders " + orders.length);
    const center = orders.filter(function (o) { return o.id === 1; })[0];
    if (!center || center.x !== 5 || center.y !== 5) problems.push("nearest unit did not take the clicked cell");
    const none = X.planGroupOrders(units, { x: 5, y: 5, z: 0 }, {
        maxRadius: 0,
        standable: function () { return false; },
        cornerFree: function () { return true; }
    });
    if (none.orders.length !== 0 || none.noCell !== 3) problems.push("no free cell count " + none.noCell + " orders " + none.orders.length);
    const body = fnBody(SRC, "groupMove");
    if (body.indexOf("planGroupOrders") < 0) problems.push("groupMove does not use planGroupOrders");

    guard(problems, function () {
        const H = harness();
        H.reset();
        const u1 = H.addUnit({ id: 1, x: 5, y: 5, z: 0, data: { faction: "player", kind: "colonist" } });
        const u2 = H.addUnit({ id: 2, x: 0, y: 0, z: -1, data: { faction: "player", kind: "person" } });
        const u3 = H.addUnit({ id: 3, x: 1, y: 0, z: -1, data: { faction: "player", kind: "colonist" } });
        u1.startZ = 0;
        u2.startZ = -1;
        u3.startZ = -1;
        const areas = {};
        H.setStandable(function (area, x, y) {
            if (!areas.ground) areas.ground = area;
            return !(x === 6 && y === 6);
        });
        H.select.setSelection([1, 2, 3]);
        H.select.groupMove({ area: { x: 0, y: 0 }, x: 5, y: 5, z: 0 });
        const made = H.jobs.slice();
        if (made.length !== 3) problems.push("orders " + made.length);
        const taken = {};
        for (let i = 0; i < made.length; i++) {
            const o = made[i];
            const fromZ = H.byId.get(o.owner).startZ;
            if (!o.target || o.target.z !== 0) problems.push("order " + o.owner + " z " + (o.target && o.target.z) + " from " + fromZ);
            const key = o.target.x + "," + o.target.y;
            if (taken[key]) problems.push("two units share " + key);
            taken[key] = true;
            if (o.target.x === 6 && o.target.y === 6) problems.push("slot on the blocked cell");
        }
        const liveCenter = made.filter(function (o) { return o.owner === 1; })[0];
        if (!liveCenter || liveCenter.target.x !== 5 || liveCenter.target.y !== 5) problems.push("nearest unit did not take the clicked cell");
        if (!made.some(function (o) { return o.via === "C.order"; })) problems.push("C.order was not called");
        if (!made.some(function (o) { return o.via === "J.create"; })) problems.push("J.create was not called");
        const climbed = made.filter(function (o) { return o.owner === 2; })[0];
        if (!climbed || !climbed.steps || !climbed.steps.some(function (s) { return s.via === "slope"; })) {
            problems.push("unit 2 did not cross a slope onto the clicked level");
        }
        if ((u2.z | 0) !== 0 || (u3.z | 0) !== 0) problems.push("mixed-level path finished on z " + u2.z + "," + u3.z);
        if (!H.select.isSelected(1) || !H.select.isSelected(2) || !H.select.isSelected(3)) {
            problems.push("selection dropped a unit while the group crossed levels");
        }
        if (!areas.ground || Object.prototype.hasOwnProperty.call(areas.ground, "z")) problems.push("ground formation area changed shape");
        areas.below = null;
        H.setStandable(function (area, x, y) {
            if (!areas.below) areas.below = area;
            return !(x === 6 && y === 6);
        });
        H.select.groupMove({ area: { x: 0, y: 0 }, x: 5, y: 5, z: -1 });
        if (!areas.below || areas.below.z !== -1) problems.push("off-ground formation omitted z");
    });
    return problems;
}

function ringOf(list, id) {
    for (let i = 0; i < list.length; i++) {
        if (list[i].unitId === id && list[i].kind === "selection") return list[i];
    }
    return null;
}

function checkSurvive() {
    const problems = [];
    guard(problems, function () {
        const H = harness();
        if (H.bound.indexOf("world:unitLevelChanged") < 0) problems.push("level listener is not bound");
        if (H.bound.indexOf("levels:viewChanged") < 0) problems.push("view listener is not bound");
        H.reset();
        const u = H.addUnit({ id: 21, x: 4, y: 4, z: -1, data: { faction: "player", kind: "colonist" } });
        H.addUnit({ id: 22, x: 8, y: 8, z: 0, data: { faction: "player", kind: "colonist" } });
        H.select.setSelection([21, 22]);
        H.moveUnitToLevel(u, 0);
        const reindexed = H.drag(4, 4, 4, 4, false).selected;
        if (!has(reindexed, 21)) problems.push("level change left the unit in the old cell");
        H.moveUnitToLevel(u, -1, 0, 0);
        H.select.setSelection([21, 22]);
        H.select.groupMove({ area: { x: 0, y: 0 }, x: 3, y: 3, z: 0 });
        const job = H.jobs.filter(function (j) { return j.owner === 21; })[0];
        if (!job || !job.target || job.target.z !== 0) problems.push("order 21 z " + (job && job.target && job.target.z) + " from -1");
        if (!job.steps || !job.steps.some(function (s) { return s.via === "slope"; })) problems.push("unit 21 did not cross a slope onto the clicked level");
        if (!H.select.isSelected(21)) problems.push("selection dropped the unit that changed level");
        const target = job.target;
        H.moveUnitToLevel(u, 1);
        if (!H.select.isSelected(21) || !H.select.isSelected(22)) problems.push("selection dropped the unit that changed level");
        if (job.target !== target || job.target.z !== 0) problems.push("move order was replaced when the level changed");
        H.setView(0);
        H.beginDrag(1, 1);
        if (!H.select.box()) problems.push("drag did not start");
        H.setView(2);
        if (H.select.box()) problems.push("view change left the drag active");
        if (!H.select.isSelected(21) || !H.select.isSelected(22)) problems.push("view change cleared the group");

        global.UF.Select = H.select;
        L.reset();
        const low = { id: 21, x: 3, y: 4, z: 1, hp: 8, maxHp: 10 };
        const world = {
            revision: 1,
            viewZ: 2,
            maxDepth: 2,
            tilePx: 48,
            cues: { scale: 3, blur: true, toggles: { paletteShift: true } },
            opaque: [{ x: 4, y: 4, z: 2 }],
            units: [
                low,
                { id: 22, x: 4, y: 4, z: 1, hp: 8, maxHp: 10 },
                { id: 23, x: 3, y: 4, z: 3, hp: 8, maxHp: 10 },
                { id: 24, x: 3, y: 4, z: -1, hp: 8, maxHp: 10 }
            ]
        };
        const plan = L.sync(world);
        const ring = ringOf(plan.overlays, 21);
        if (!ring) problems.push("no selection square on the visible lower unit");
        else {
            if (ring.scale !== 1) problems.push("selection scale " + ring.scale);
            if (ring.w !== 48 || ring.h !== 48) problems.push("selection size " + ring.w + "x" + ring.h);
            if (ring.alpha !== 1 || ring.blur !== false || ring.tint != null || ring.fog !== false || ring.desaturate !== false || ring.fade !== false) {
                problems.push("selection square is filtered");
            }
            if (!Number.isInteger(ring.x) || !Number.isInteger(ring.y)) problems.push("selection square is not on a whole pixel");
            if (ring.z !== 1) problems.push("selection z " + ring.z);
        }
        if (ringOf(plan.overlays, 22)) problems.push("selection square under solid cover");
        if (ringOf(plan.overlays, 23) || ringOf(plan.overlays, 24)) problems.push("selection square outside the visible reach");
        low.z = 0;
        world.revision = 2;
        const walked = L.sync(world);
        const ring2 = ringOf(walked.overlays, 21);
        if (!ring2 || ring2.scale !== 1 || ring2.z !== 0) problems.push("square dropped or scaled after the unit changed level");
    });
    return problems;
}

function checkPerf() {
    const problems = [];
    const area = { x: 0, y: 0 };
    const units = [];
    for (let i = 0; i < 4000; i++) {
        units.push({ id: 100 + i, x: 500, y: i % 40, z: 0, area: area, data: { faction: "player", kind: "colonist" } });
    }
    units.push({ id: 1, x: 2, y: 2, z: 0, area: area, data: { faction: "player", kind: "colonist" } });
    units.push({ id: 2, x: 2, y: 2, z: -1, area: area, data: { faction: "player", kind: "colonist" } });
    units.push({ id: 3, x: 4, y: 4, z: -1, area: area, data: { faction: "player", kind: "colonist" } });
    let index = null;
    let scans = 0;
    let worst = 0;
    let ids = [];
    for (let frame = 0; frame < 30; frame++) {
        if (!index) {
            index = X.indexUnits(units);
            scans++;
        }
        const q = X.unitsInBox({
            x0: 2,
            y0: 2,
            x1: 4,
            y1: 4,
            viewZ: 0,
            maxDepth: 2,
            area: area,
            visible: function (x, y, z) { return visible(x, y, z); },
            unitsAt: function (x, y, z) { return X.unitsAt(index, 0, 0, x, y, z); },
            isPlayer: player
        });
        if (q.fullScans !== 0) problems.push("query reported a full scan");
        if (q.unitVisits > worst) worst = q.unitVisits;
        ids = q.ids;
    }
    if (scans !== 1) problems.push("index rebuilt " + scans + " times in 30 frames");
    if (worst > 8) problems.push("unit visits " + worst + " in a 3x3 box");
    if (!has(ids, 1) || !has(ids, 2) || has(ids, 3) || has(ids, 100)) problems.push("pick ids " + ids.slice(0, 8).join(","));
    const preview = fnBody(SRC, "updatePreview");
    if (/\.units\(/.test(preview)) problems.push("preview walks World.units");
    if (preview.indexOf("queryBoxUnits(activeBox, false)") < 0) problems.push("preview does not query the index");
    const commit = fnBody(SRC, "commitActiveBox");
    if (commit.indexOf("queryBoxUnits(box, true)") < 0) problems.push("commit does not refresh once");
    if (/\.units\(/.test(commit)) problems.push("commit walks World.units");

    guard(problems, function () {
        const H = harness();
        H.reset();
        for (let i = 0; i < 4000; i++) {
            H.addUnit({ id: 100 + i, x: 500, y: i % 40, z: 0 });
        }
        H.addUnit({ id: 1, x: 2, y: 2, z: 0 });
        H.addUnit({ id: 2, x: 2, y: 2, z: -1 });
        const measured = H.drag(2, 2, 2, 2, false);
        if (measured.setupReads !== 0) problems.push("1x1 setup pick world-unit reads=" + measured.setupReads);
        if (measured.releaseReads !== 0) problems.push("1x1 release pick world-unit reads=" + measured.releaseReads);
        if (!has(measured.selected, 1) || !has(measured.selected, 2)) problems.push("pick ids " + measured.selected.slice(0, 8).join(","));
        if (has(measured.selected, 100) || has(measured.selected, 4099)) problems.push("far unit was picked");

        const hidden = H.placeRaw({ id: 50, x: 9, y: 9, z: 0 });
        H.counter.reads = 0;
        const missed = H.drag(9, 9, 9, 9, false);
        if (missed.setupReads !== 0 || missed.releaseReads !== 0) {
            problems.push("1x1 release pick world-unit reads=" + missed.releaseReads + " setup=" + missed.setupReads);
        }
        if (has(missed.selected, hidden.id)) problems.push("box scanned units that were not indexed");
        H.loadSave();
        H.counter.reads = 0;
        const loaded = H.drag(9, 9, 9, 9, false);
        if (loaded.setupReads !== 0) problems.push("1x1 setup pick world-unit reads=" + loaded.setupReads);
        if (loaded.releaseReads !== 0) problems.push("1x1 release pick world-unit reads=" + loaded.releaseReads);
        if (!has(loaded.selected, 50)) problems.push("loaded unit was not selectable");
    });
    return problems;
}

const CHECKS = {
    box_visible: checkBox,
    shift_layers: checkShift,
    group_orders: checkOrders,
    survive: checkSurvive,
    perf: checkPerf
};

function report(name, problems) {
    if (problems.length) {
        console.log("FAIL " + name + " — " + problems[0]);
        return false;
    }
    console.log("PASS " + name);
    return true;
}

if (provokeAll) {
    let caught = 0;
    for (let i = 0; i < NAMES.length; i++) {
        const name = NAMES[i];
        const child = spawnSync(process.execPath, [__filename, "--provoke=" + name], { encoding: "utf8" });
        const text = (child.stdout || "") + (child.stderr || "");
        const failed = child.status !== 0 && text.indexOf("FAIL " + name) >= 0;
        console.log((failed ? "CAUGHT " : "NOT CAUGHT ") + name + " exit " + child.status);
        if (failed) caught++;
        else console.log(text.slice(0, 500));
    }
    console.log("PROVOKE-ALL: " + caught + "/" + NAMES.length + " caught");
    process.exit(caught === NAMES.length ? 0 : 1);
}

if (provokeArg && NAMES.indexOf(provokeArg) < 0) {
    console.error("unknown provocation " + provokeArg + "; known: " + NAMES.join(", "));
    process.exit(2);
}

if (provokeArg) process.env.UF_TEST_PROVOKE = "xlayer." + provokeArg;
else delete process.env.UF_TEST_PROVOKE;

try {
    live = bootLive();
} catch (err) {
    liveError = err && err.stack ? err.stack : String(err);
}

let failed = 0;
const run = provokeArg ? [provokeArg] : NAMES;
for (let i = 0; i < run.length; i++) {
    const name = run[i];
    const problems = CHECKS[name]();
    if (!report(name, problems)) failed++;
}
console.log("RESULT: " + (run.length - failed) + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
