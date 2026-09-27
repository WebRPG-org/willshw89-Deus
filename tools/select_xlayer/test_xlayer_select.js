"use strict";
// WG.00.36. Cross-layer selection. Five checks, each with a provocation that FAILs it.
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

function pick(units, box, provoked) {
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
            if (provoked) return true;
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

function checkBox(provoked) {
    const problems = [];
    const units = worldUnits();
    const q = pick(units, { x0: 0, y0: 0, x1: 4, y1: 4 }, provoked);
    if (!provoked && q.calls === 0) problems.push("cellVisible was not called");
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
    return problems;
}

function checkShift(provoked) {
    const problems = [];
    const units = worldUnits();
    const index = X.indexUnits(units);
    const at = function (x, y, z) { return X.unitsAt(index, 0, 0, x, y, z); };
    const boxA = pick(units, { x0: 1, y0: 1, x1: 1, y1: 1 }, false);
    const boxB = pick(units, { x0: 1, y0: 3, x1: 1, y1: 3 }, false);
    const wide = pick(units, { x0: 0, y0: 0, x1: 4, y1: 4 }, false);
    if (boxA.ids.length !== 1 || !has(boxA.ids, 1)) problems.push("single-layer box A ids " + boxA.ids.join(","));
    const added = X.applyBox(boxA.ids, boxB.ids, true);
    const replaced = X.applyBox(boxA.ids, boxB.ids, false);
    if (added.length !== 2 || !has(added, 1) || !has(added, 5)) problems.push("shift box did not add, got " + added.join(","));
    if (replaced.length !== 1 || replaced[0] !== 5) problems.push("plain box did not replace, got " + replaced.join(","));
    const shift = provoked ? false : true;
    const held = X.applyBox([4], wide.ids, shift);
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
    return problems;
}

function checkOrders(provoked) {
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
    let orders = plan.orders;
    if (provoked) {
        orders = orders.map(function (o) { return { id: o.id, x: o.x, y: o.y, z: o.fromZ, fromZ: o.fromZ }; });
    }
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
    return problems;
}

function ringOf(list, id) {
    for (let i = 0; i < list.length; i++) {
        if (list[i].unitId === id && list[i].kind === "selection") return list[i];
    }
    return null;
}

function checkSurvive(provoked) {
    const problems = [];
    const ids = [1, 2];
    const orders = [{ id: 1, x: 4, y: 5, z: 0, fromZ: -1 }];
    const ref = orders[0];
    let keptIds;
    let keptOrders;
    if (provoked) {
        keptIds = [2];
        keptOrders = [];
    } else {
        const held = X.retain(ids, orders, 1, 1);
        keptIds = held.selected;
        keptOrders = held.orders;
    }
    if (keptIds.indexOf(1) < 0) problems.push("selection dropped the unit that changed level");
    if (!keptOrders[0] || keptOrders[0] !== ref || keptOrders[0].z !== 0) problems.push("move order was replaced when the level changed");
    const viewed = provoked ? [] : X.viewKeeps(ids);
    if (viewed.length !== ids.length || viewed[0] !== 1 || viewed[1] !== 2) problems.push("view change cleared the group");
    const selected = { low: !provoked, buried: !provoked };
    global.UF.Select = {
        isSelected: function (id) { return selected[id] === true; }
    };
    L.reset();
    const low = { id: "low", x: 3, y: 4, z: 1, hp: 8, maxHp: 10 };
    const world = {
        revision: 1,
        viewZ: 2,
        maxDepth: 2,
        tilePx: 48,
        cues: { scale: 3, blur: true, toggles: { paletteShift: true } },
        opaque: [{ x: 4, y: 4, z: 2 }],
        units: [
            low,
            { id: "buried", x: 4, y: 4, z: 1, hp: 8, maxHp: 10 },
            { id: "above", x: 3, y: 4, z: 3, hp: 8, maxHp: 10 },
            { id: "deep", x: 3, y: 4, z: -1, hp: 8, maxHp: 10 }
        ]
    };
    const plan = L.sync(world);
    const ring = ringOf(plan.overlays, "low");
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
    if (ringOf(plan.overlays, "buried")) problems.push("selection square under solid cover");
    if (ringOf(plan.overlays, "above") || ringOf(plan.overlays, "deep")) problems.push("selection square outside the visible reach");
    low.z = 0;
    world.revision = 2;
    const walked = L.sync(world);
    const ring2 = ringOf(walked.overlays, "low");
    if (!ring2 || ring2.scale !== 1 || ring2.z !== 0) problems.push("square dropped or scaled after the unit changed level");
    const levelListener = SRC.slice(SRC.indexOf('E.on("world:unitLevelChanged"'), SRC.indexOf('E.on("world:unitLevelChanged"') + 400);
    const viewListener = SRC.slice(SRC.indexOf('E.on("levels:viewChanged"'), SRC.indexOf('E.on("levels:viewChanged"') + 280);
    if (levelListener.indexOf("clearSelection") >= 0 || levelListener.indexOf("selectedGroup =") >= 0) problems.push("level change clears the group");
    if (viewListener.indexOf("clearSelection") >= 0 || viewListener.indexOf("selectedGroup =") >= 0) problems.push("view change clears the group");
    return problems;
}

function checkPerf(provoked) {
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
        if (!index || provoked) {
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
            unitsAt: function (x, y, z) {
                if (provoked) return units;
                return X.unitsAt(index, 0, 0, x, y, z);
            },
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

let failed = 0;
const run = provokeArg ? [provokeArg] : NAMES;
for (let i = 0; i < run.length; i++) {
    const name = run[i];
    const problems = CHECKS[name](provokeArg === name);
    if (!report(name, problems)) failed++;
}
console.log("RESULT: " + (run.length - failed) + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
