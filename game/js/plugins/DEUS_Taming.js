//=============================================================================
// DEUS_Taming.js - Capture and domestication of creatures
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Taming] Capture and domestication of creatures into pets, mounts, livestock, and work animals.
 * @author DEUS
 * @orderAfter DEUS_Wildlife
 * @orderAfter DEUS_Combat
 * @orderAfter DEUS_Ecology
 * @orderAfter DEUS_Jobs
 *
 * @help
 * Headless rules live in game/js/sim/taming and load through Node require.
 * UF.Taming.attemptCapture(actor, target, method) runs a Wisdom (Animal
 * Handling) check through UF.Rules. The target must already be restrained,
 * unconscious at 0 HP, trapped, or otherwise subdued.
 *
 * Humanoids are refused. Prisoners are SOC.40.03. A domesticated creature
 * whose role is allowed to fight joins party combat through UF.Taming.enlist
 * and UF.CombatRT.enlistTamed. Combat numbers stay the SRD stat block.
 * This plugin does not edit jobs or ecology files. It aliases UF.Jobs.create
 * and UF.Ecology.population when those objects are already present.
 *
 * Register this plugin after DEUS_Wildlife, DEUS_Combat, DEUS_Ecology, and
 * DEUS_Jobs. Do not edit plugins.js here; the lane report carries the entry.
 *
 * A riding saddle is a visual marker only. Creatures have no equipment slots.
 */

(() => {
    "use strict";

    const root = typeof window !== "undefined" ? window : global;
    root.DEUS = root.DEUS || {};
    root.UF = root.UF || root.DEUS;

    function loadSim() {
        if (typeof require !== "function") return null;
        const attempts = [];
        try {
            const path = require("path");
            if (typeof __dirname === "string") attempts.push(path.join(__dirname, "..", "sim", "taming"));
            if (typeof process !== "undefined" && process.cwd) {
                attempts.push(path.join(process.cwd(), "game", "js", "sim", "taming"));
            }
        } catch (err) { /* path is absent in a plain browser */ }
        attempts.push("../sim/taming");
        for (let i = 0; i < attempts.length; i++) {
            try { return require(attempts[i]); } catch (err) { /* try the next path */ }
        }
        return null;
    }

    function loadHumanoidTypes() {
        if (loadHumanoidTypes.cache) return loadHumanoidTypes.cache;
        const map = Object.create(null);
        loadHumanoidTypes.cache = map;
        if (typeof require !== "function") return map;
        try {
            const fs = require("fs");
            const path = require("path");
            const candidates = [];
            if (typeof __dirname === "string") candidates.push(path.join(__dirname, "..", "..", "data", "srd51", "creatures.json"));
            if (typeof process !== "undefined" && process.cwd) {
                candidates.push(path.join(process.cwd(), "game", "data", "srd51", "creatures.json"));
            }
            let file = null;
            for (let i = 0; i < candidates.length; i++) {
                if (candidates[i] && fs.existsSync(candidates[i])) { file = candidates[i]; break; }
            }
            if (!file) return map;
            const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
            const entries = Array.isArray(parsed) ? parsed : (parsed && parsed.entries) || [];
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                const type = entry && entry.data && entry.data.type;
                if (entry && entry.id && String(type).toLowerCase() === "humanoid") map[entry.id] = "humanoid";
            }
        } catch (err) { /* an unreadable catalogue refuses nothing extra */ }
        return map;
    }

    const sim = loadSim();
    let engine = null;

    function rulesOf() {
        return root.UF && root.UF.Rules;
    }

    function engineOf() {
        if (engine) return engine;
        if (!sim || typeof sim.createTaming !== "function") return null;
        const rules = rulesOf();
        if (!rules || typeof rules.check !== "function") return null;
        engine = sim.createTaming(rules, { humanoidTypes: loadHumanoidTypes() });
        return engine;
    }

    function speciesOfUnit(unit) {
        const wild = root.UF && root.UF.Wildlife;
        if (!wild || typeof wild.speciesById !== "function" || !unit || !unit.data) return null;
        return wild.speciesById(unit.data.species);
    }

    function installEcologyAlias() {
        const ecology = root.UF && root.UF.Ecology;
        if (!ecology || typeof ecology.population !== "function" || ecology.population._tamingAliased) return;
        if (!sim || typeof sim.excludeWithdrawnFromSummary !== "function") return;
        const prior = ecology.population;
        function population(area) {
            const raw = prior.apply(ecology, arguments);
            const world = root.UF && root.UF.World;
            if (!world || !area || typeof world.unitsInArea !== "function") return raw;
            const units = world.unitsInArea(area.x, area.y) || [];
            return sim.excludeWithdrawnFromSummary(raw, units, speciesOfUnit);
        }
        population._tamingAliased = true;
        ecology.population = population;
    }

    function installJobsAlias() {
        const jobs = root.UF && root.UF.Jobs;
        if (!jobs || typeof jobs.create !== "function" || jobs.create._tamingAliased) return;
        if (!sim || typeof sim.refuseHuntJob !== "function") return;
        const prior = jobs.create.bind(jobs);
        function create(spec) {
            const world = root.UF && root.UF.World;
            const lookup = function (id) {
                if (!world || typeof world.unit !== "function" || id == null) return null;
                return world.unit(id);
            };
            if (sim.refuseHuntJob(spec, lookup)) return null;
            return prior(spec);
        }
        create._tamingAliased = true;
        jobs.create = create;
    }

    function installHosts() {
        installEcologyAlias();
        installJobsAlias();
    }

    function noEngine(reason) {
        return { ok: false, reason: reason || "NO_RULES", record: null };
    }

    const Taming = {
        sim: sim,
        installHosts: installHosts,
        attemptCapture: function (actor, target, method, call) {
            const eng = engineOf();
            if (!eng) return noEngine("NO_RULES");
            return eng.attemptCapture(actor, target, method, call);
        },
        tend: function (actor, target, call) {
            const eng = engineOf();
            if (!eng) return noEngine("NO_RULES");
            return eng.tend(actor, target, call);
        },
        tickNeglect: function (units, hour) {
            const eng = engineOf();
            if (!eng) return [];
            return eng.tickNeglect(units, hour);
        },
        markSaddle: function (unit) {
            const eng = engineOf();
            if (!eng) return noEngine("NO_RULES");
            return eng.markSaddle(unit);
        },
        attacks: function (unit) {
            const eng = engineOf();
            return eng ? eng.attacks(unit) : [];
        },
        statBlock: function (unit) {
            const eng = engineOf();
            return eng ? eng.statBlock(unit) : null;
        },
        domesticRecord: function (unit) {
            const eng = engineOf();
            return eng ? eng.domesticRecord(unit) : null;
        },
        livestockRecord: function (unit) {
            const eng = engineOf();
            return eng ? eng.livestockRecord(unit) : null;
        },
        census: function (units) {
            return sim ? sim.census(units) : { wild: 0, domestic: 0, captive: 0, byRole: {}, total: 0 };
        },
        exportState: function (units) {
            return sim ? sim.exportState(units) : { version: 1, rows: [] };
        },
        importState: function (units, blob) {
            return sim ? sim.importState(units, blob) : { ok: false, reason: "NO_SIM", applied: 0 };
        },
        mayHunt: function (hunter, prey) {
            return sim ? sim.mayHunt(hunter, prey) : true;
        },
        equipmentSlots: function () {
            const eng = engineOf();
            return eng ? eng.equipmentSlots() : [];
        },
        equip: function () {
            return { ok: false, reason: "NO_CREATURE_GEAR", slot: null };
        },
        labourHook: function (unit) {
            const eng = engineOf();
            return eng ? eng.labourHook(unit) : null;
        },
        joinsParty: function (unit) {
            return sim ? sim.party.joinsParty(unit) : false;
        },
        combatProfile: function (unit) {
            const rules = rulesOf();
            if (!sim || !rules) return null;
            return sim.combatProfile(rules, unit);
        },
        enlist: function (engine, units) {
            const rules = rulesOf();
            if (!sim || !rules) return { added: [], refused: [{ ok: false, reason: "NO_RULES" }] };
            return sim.enlistParty(engine, rules, units);
        },
        issueOrder: function (unit, order) {
            return sim ? sim.party.issueOrder(unit, order) : { ok: false, reason: "NO_SIM", order: null };
        },
        noteDeath: function (unit, info) {
            return sim ? sim.party.noteDeath(unit, info) : { updated: false, reason: "NO_SIM", knockout: false };
        },
        questions: sim ? sim.QUESTIONS.concat(sim.PARTY_QUESTIONS || []) : []
    };

    root.DEUS.Taming = Taming;
    root.UF.Taming = Taming;
    installHosts();
    if (root.UF.Events && typeof root.UF.Events.on === "function") {
        root.UF.Events.on("world:created", installHosts);
    }
})();
