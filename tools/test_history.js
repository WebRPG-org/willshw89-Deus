"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const plugin = path.resolve(__dirname, "../game/js/plugins/DEUS_HistoricalDemographics.js");
const source = fs.readFileSync(plugin, "utf8");
const worldHelpers = {
    hash32(...values) {
        let hash = 2166136261;
        for (const value of values.join(":") ) hash = Math.imul(hash ^ value.charCodeAt(0), 16777619);
        return hash >>> 0;
    },
    mulberry32(seed) {
        return () => {
            seed = (seed + 0x6d2b79f5) | 0;
            let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
            value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
            return ((value ^ value >>> 14) >>> 0) / 4294967296;
        };
    },
    zRange: () => ({ zMin: -2, zMax: 2 })
};
const environment = { UF: { World: worldHelpers } };
environment.window = environment;
vm.runInNewContext(source, environment, { filename: plugin });
const D = environment.UF.HistoricalDemographics;

const founders = [];
for (let id = 0; id < 5000; id++) {
    founders.push({ name: `TEST_Person_${id}`, gender: id % 2 ? "female" : "male", age: 25,
        familyId: `TEST_Family_${Math.floor(id / 2)}`, leader: id === 0 || id === 2500,
        title: id === 0 || id === 2500 ? "Leader" : undefined });
}
const world = { seed: 424242, size: 32, areasX: 1, areasY: 1,
    factions: { list: [{ id: "TEST_F", species: "human", culture: "TEST" },
        { id: "TEST_G", species: "human", culture: "TEST" }] },
    history: { version: 5, startYear: 1, years: 0,
        sites: [{ id: 7, faction: "TEST_F", name: "TEST_Site", kind: "camp", area: { x: 0, y: 0 },
            x: 4, y: 4, z: 0, founded: 1, ruined: null, pop: 2500 },
        { id: 8, faction: "TEST_G", name: "TEST_Site_2", kind: "camp", area: { x: 0, y: 0 },
            x: 8, y: 8, z: 0, founded: 1, ruined: null, pop: 2500 }],
        founders: { TEST_F: { site: 7, plan: founders.slice(0, 2500) },
            TEST_G: { site: 8, plan: founders.slice(2500) } } } };
const profiles = { human: { lifespan: [60, 90], reproductiveAge: [18, 55], birthChance: 0.5,
    birthSpacingYears: 1, infantMortality: 0, diseaseMortality: 0, exposureMortality: 0 } };
const names = { start: ["Tes"], male: ["ton"], female: ["ta"] };

function aligned(state) {
    assert.equal(state.hfCount, state.people.length);
    assert.deepEqual(Array.from(state.hfFactionIds), ["TEST_F", "TEST_G"]);
    assert.deepEqual(Array.from(state.hfSpeciesIds), ["human"]);
    for (const field of ["hfBirthYear", "hfDeathYear", "hfFaction", "hfSite", "hfDynasty",
        "hfPartnership", "hfMother", "hfFather", "hfLastBirthYear", "hfGender", "hfSpecies"]) {
        assert.equal(Object.prototype.toString.call(state[field]), "[object Int32Array]", field);
        assert.ok(state[field].length >= state.hfCount, `${field} capacity`);
    }
    for (let id = 0; id < state.people.length; id++) {
        const person = state.people[id];
        assert.equal(state.hfBirthYear[id], person.born);
        assert.equal(state.hfDeathYear[id], person.died === null ? -1 : person.died);
        assert.equal(state.hfFaction[id], person.factionId === "TEST_F" ? 0 : 1);
        assert.equal(state.hfSite[id], person.siteId);
        assert.equal(state.hfDynasty[id], person.dynastyId);
        assert.equal(state.hfPartnership[id], person.partnershipId === null ? -1 : person.partnershipId);
        assert.equal(state.hfMother[id], person.parents.length ? person.parents[0] : -1);
        assert.equal(state.hfFather[id], person.parents.length ? person.parents[1] : -1);
        assert.equal(state.hfLastBirthYear[id], person.lastBirthYear === null ? -1 : person.lastBirthYear);
        assert.equal(state.hfGender[id], person.gender === "female" ? 1 : 0);
        assert.equal(state.hfSpecies[id], 0);
    }
}

try {
    const unpairedWorld = JSON.parse(JSON.stringify(world));
    unpairedWorld.history.founders.TEST_F.plan = unpairedWorld.history.founders.TEST_F.plan.slice(0, 10);
    unpairedWorld.history.founders.TEST_G.plan = unpairedWorld.history.founders.TEST_G.plan.slice(0, 10);
    for (const site of unpairedWorld.history.sites) site.pop = 10;
    for (const record of Object.values(unpairedWorld.history.founders)) {
        for (const plan of record.plan) delete plan.familyId;
    }
    const unpaired = D.create(unpairedWorld, { profiles, names });
    assert.equal(unpaired.partnerships.length, 10, "unpaired founders should form ten households");
    aligned(unpaired);
    D.step(unpaired, { casualtyIds: [0] });
    aligned(unpaired);
    console.log("PASS SoA household pairing and death unlink across two factions");
    const state = D.create(world, { profiles, names });
    assert.equal(state.people.length, 5000);
    assert.equal(state.partnerships.length, 2500);
    aligned(state);
    const originalWorld = JSON.stringify(world);
    D.step(state, { casualtyIds: [0, 2500] });
    assert.equal(state.currentYear, 2);
    assert.equal(state.people[0].causeOfDeath, "violence");
    assert.equal(state.people[2500].causeOfDeath, "violence");
    assert.ok(state.people.length > 5000, "the 5,000-person simulation should include births");
    aligned(state);
    D.validate(state);
    assert.equal(JSON.stringify(world), originalWorld, "source world changed");
    const saved = JSON.stringify(state);
    assert.ok(!saved.includes("hfBirthYear"), "runtime columns leaked into save");
    const restored = JSON.parse(saved);
    D.validate(restored);
    aligned(restored);
    assert.equal(JSON.stringify(restored), saved, "rebuilding columns changed saved state");
    console.log(`PASS 5,000 founders, ${state.people.length - 5000} births, typed columns, and save reload`);
    const needle = "        demographicColumns(state);\n        return state;";
    assert.ok(source.includes(needle), "mutation target moved");
    const mutantEnvironment = { UF: { World: worldHelpers } };
    mutantEnvironment.window = mutantEnvironment;
    vm.runInNewContext(source.replace(needle, "        return state;"), mutantEnvironment);
    const mutant = mutantEnvironment.UF.HistoricalDemographics.create(world, { profiles, names });
    mutantEnvironment.UF.HistoricalDemographics.step(mutant, { casualtyIds: [0, 2500] });
    assert.throws(() => aligned(mutant), /Expected values to be strictly equal/, "missing column refresh escaped the test");
    console.log("PASS mutation check: removing the annual column refresh is detected");
    console.log("RESULT: 3 passed, 0 failed");
} catch (error) {
    console.error(`FAIL history SoA: ${error.stack || error}`);
    console.log("RESULT: 0 passed, 1 failed");
    process.exitCode = 1;
}
