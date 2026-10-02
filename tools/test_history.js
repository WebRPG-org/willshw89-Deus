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
        familyId: `TEST_Family_${Math.floor(id / 2)}`, leader: id === 0,
        title: id === 0 ? "Leader" : undefined });
}
const world = { seed: 424242, size: 32, areasX: 1, areasY: 1,
    factions: { list: [{ id: "TEST_F", species: "human", culture: "TEST" }] },
    history: { version: 5, startYear: 1, years: 0,
        sites: [{ id: 7, faction: "TEST_F", name: "TEST_Site", kind: "camp", area: { x: 0, y: 0 },
            x: 4, y: 4, z: 0, founded: 1, ruined: null, pop: founders.length }],
        founders: { TEST_F: { site: 7, plan: founders } } } };
const profiles = { human: { lifespan: [60, 90], reproductiveAge: [18, 55], birthChance: 0.5,
    birthSpacingYears: 1, infantMortality: 0, diseaseMortality: 0, exposureMortality: 0 } };
const names = { start: ["Tes"], male: ["ton"], female: ["ta"] };

function aligned(state) {
    assert.equal(state.hfCount, state.people.length);
    for (const field of ["hfBirthYear", "hfDeathYear", "hfFaction", "hfSite", "hfDynasty",
        "hfPartnership", "hfMother", "hfFather", "hfLastBirthYear", "hfGender", "hfSpecies"]) {
        assert.equal(Object.prototype.toString.call(state[field]), "[object Int32Array]", field);
        assert.ok(state[field].length >= state.hfCount, `${field} capacity`);
    }
    for (let id = 0; id < state.people.length; id++) {
        const person = state.people[id];
        assert.equal(state.hfBirthYear[id], person.born);
        assert.equal(state.hfDeathYear[id], person.died === null ? -1 : person.died);
        assert.equal(state.hfFaction[id], 0);
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
    const state = D.create(world, { profiles, names });
    assert.equal(state.people.length, 5000);
    assert.equal(state.partnerships.length, 2500);
    aligned(state);
    const originalWorld = JSON.stringify(world);
    D.step(state, { casualtyIds: [0, 1] });
    assert.equal(state.currentYear, 2);
    assert.equal(state.people[0].causeOfDeath, "violence");
    assert.equal(state.people[1].causeOfDeath, "violence");
    assert.ok(state.people.length > 5000, "the 5,000-person simulation should include births");
    D.validate(state);
    aligned(state);
    assert.equal(JSON.stringify(world), originalWorld, "source world changed");
    const saved = JSON.stringify(state);
    assert.ok(!saved.includes("hfBirthYear"), "runtime columns leaked into save");
    const restored = JSON.parse(saved);
    D.validate(restored);
    aligned(restored);
    assert.equal(JSON.stringify(restored), saved, "rebuilding columns changed saved state");
    console.log(`PASS 5,000 founders, ${state.people.length - 5000} births, typed columns, and save reload`);
    console.log("RESULT: 1 passed, 0 failed");
} catch (error) {
    console.error(`FAIL history SoA: ${error.stack || error}`);
    console.log("RESULT: 0 passed, 1 failed");
    process.exitCode = 1;
}
