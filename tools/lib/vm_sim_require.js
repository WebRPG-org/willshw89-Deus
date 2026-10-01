"use strict";
// WG.00.44: the hook every vm harness installs before it evaluates DEUS_World, DEUS_WorldGen, DEUS_Levels or
// DEUS_Fluid (tools/lib/vm_harness_scan.js finds them; tools/test_sim_loader.js checks each one calls install()).
//
//   const simHook = require("./lib/vm_sim_require");    // path relative to the harness
//   simHook.install(sandbox);                            // after the sandbox has its PluginManager, before the plugins
//   simHook.install(sandbox, { grid: "shipped" });       // grid tests only
//
// install() does two things:
// 1. UF.Sim.require resolves in the vm. The sandbox gets DEUS_SIM_HOST (this process's require, the game folder as
//    the working directory, no runtime log), which DEUS_World's UF.Sim reads in place of a global require. The
//    sandbox's own require, process and __dirname are left as the harness made them, so plugins that probe those
//    (DEUS_Fluid's optional hydro session, for one) behave as before.
// 2. The world grid stays 1x1. The sandbox's PluginManager is replaced by one whose parameters("DEUS_World") reads
//    AreasX and AreasY "1" when the harness passes none (an explicit value is kept), so a change of the JS default in
//    DEUS_World.js changes no harness silently (plan risk 10). { grid: "shipped" } leaves PluginManager untouched.
//
// API and rules: docs/systems/DEUS_World.md -> UF.Sim.

const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const GAME_DIR = path.join(ROOT, "game");
const PINNED = Symbol.for("deus.vmSimRequire.gridPinned");
const GRID_KEYS = ["AreasX", "AreasY"];

function host() {
    return Object.freeze({ require, cwd: GAME_DIR, dirname: null, log: null });
}

function pinGrid(pm) {
    if (pm[PINNED]) return pm;
    const parameters = function (name) {
        const raw = pm.parameters.apply(pm, arguments);
        if (name !== "DEUS_World") return raw;
        // DEUS_World falls back to the old UF_World name when its own entry is empty; keep that, then pin the grid.
        const own = raw && typeof raw === "object" && Object.keys(raw).length ? raw : null;
        const legacy = own ? null : pm.parameters.call(pm, "UF_World");
        const out = Object.assign({}, own || (legacy && typeof legacy === "object" ? legacy : {}));
        for (const key of GRID_KEYS) {
            if (out[key] === undefined || out[key] === null || out[key] === "") out[key] = "1";
        }
        return out;
    };
    const pinned = Object.create(pm, { parameters: { value: parameters, enumerable: true, writable: true, configurable: true } });
    Object.defineProperty(pinned, PINNED, { value: true });
    return pinned;
}

/**
 * Installs the hook in a vm sandbox (the object given to vm.createContext, or the context itself).
 * opts.grid: "pinned" (the default) or "shipped". Returns the sandbox.
 */
function install(sandbox, opts) {
    const options = opts || {};
    const grid = options.grid === undefined ? "pinned" : options.grid;
    if (grid !== "pinned" && grid !== "shipped") throw new TypeError(`vm_sim_require.install: grid "${grid}" is not "pinned" or "shipped"`);
    if (!sandbox || (typeof sandbox !== "object" && typeof sandbox !== "function")) {
        throw new TypeError("vm_sim_require.install: no sandbox");
    }
    sandbox.DEUS_SIM_HOST = host();
    if (grid === "pinned") {
        const pm = sandbox.PluginManager;
        if (!pm || typeof pm.parameters !== "function") {
            throw new Error("vm_sim_require.install: the sandbox has no PluginManager.parameters yet; install the hook after setting it");
        }
        sandbox.PluginManager = pinGrid(pm);
    }
    return sandbox;
}

module.exports = { install, GAME_DIR, PINNED };
