"use strict";
// PM_DEFAULT tuning for capture and care. Not an Owner ruling.
// Open questions are exported for the lane report; this file does not answer them.

const ROLES = Object.freeze(["pet", "mount", "livestock", "work"]);

const DEFAULTS = Object.freeze({
    version: 1,
    status: "PM_DEFAULT",
    // Wisdom (Animal Handling). SRD ids are cited; the numbers are the typical-DC ladder.
    ability: "wis",
    skill: "animal handling",
    sources: Object.freeze({
        abilityCheck: "srd:rule:using-ability-scores-ability-checks",
        animalHandling: "srd:rule:using-ability-scores-using-each-ability",
        unconscious: "srd:condition:unconscious",
        restrained: "srd:condition:restrained",
        grappled: "srd:condition:grappled",
        attack: "srd:rule:combat-making-an-attack"
    }),
    // Names resolve through UF.Rules.dc (the typical difficulty class table).
    captureDc: Object.freeze({
        knockout: "easy",
        trapped: "easy",
        grappled: "medium",
        restrained: "medium",
        subdued: "medium"
    }),
    // Added after the ladder DC. floor(challenge rating * this).
    crDcPerPoint: 2,
    handlingDc: "easy",
    // Successful tends required. One tend is one later sim hour of food plus a handling check.
    carePoints: Object.freeze({
        pet: 3,
        livestock: 4,
        mount: 5,
        work: 6
    }),
    // Recorded on the animal so a save shows time spent. Not a second gate.
    hoursPerCarePoint: 8,
    neglect: Object.freeze({
        enabled: false,
        hoursWithoutCare: 168,
        revertsTo: "wild"
    }),
    // Names only. SIM.40.10 owns breeding and harvest. Unknown species yield nothing.
    livestockProductsBySpecies: Object.freeze({
        wild_sheep: Object.freeze(["wool"]),
        fowl: Object.freeze(["eggs"]),
        aurochs: Object.freeze(["milk"])
    }),
    saddle: Object.freeze({
        id: "riding_saddle",
        visual: true,
        slot: null,
        stats: null
    })
});

const QUESTIONS = Object.freeze([
    {
        id: "OQ-AX-01",
        topic: "Capture DCs",
        pmDefault: "Wisdom (Animal Handling) against the SRD typical DC for the method (knockout and trapped: easy 10; grappled, restrained, and subdued: medium 15), plus floor(challenge rating times 2).",
        question: "Are these capture DCs right, or should capture be a contest against the creature?"
    },
    {
        id: "OQ-AX-02",
        topic: "Taming time",
        pmDefault: "Pet 3, livestock 4, mount 5, and work 6 successful tends. Each tend is a later sim hour and stands for 8 hours of care.",
        question: "Are those care times right?"
    },
    {
        id: "OQ-AX-03",
        topic: "Neglect",
        pmDefault: "Escape and reversion exist and are off. When enabled, 168 hours without care returns the animal to wild.",
        question: "Should a neglected domesticated animal revert?"
    },
    {
        id: "OQ-AX-04",
        topic: "Roles",
        pmDefault: "One role per animal: pet, mount, livestock, or work.",
        question: "May one animal hold two roles?"
    },
    {
        id: "OQ-AX-05",
        topic: "Livestock products",
        pmDefault: "wild_sheep wool, fowl eggs, aurochs milk. Every other species yields no named product. Breeding stays on the SIM.40.10 hook.",
        question: "Which species give which products?"
    },
    {
        id: "OQ-AX-06",
        topic: "Saddle marker",
        pmDefault: "Any domesticated animal may carry a riding-saddle marker. It has no slot and no stats.",
        question: "Should that marker be limited to mounts?"
    },
    {
        id: "OQ-AX-07",
        topic: "Rival hunts",
        pmDefault: "Wild-prey selection skips every captive and domesticated animal. An explicit hunt job is refused for the owner's faction and allowed for a different faction.",
        question: "Should another faction be able to hunt owned livestock?"
    },
    {
        id: "OQ-AX-08",
        topic: "Predators and livestock",
        pmDefault: "Wildlife predator hunting is unchanged, so a wolf can still strike a nearby domesticated grazer. The SIM.60.07 strike path stays as it is.",
        question: "Should predators ignore owned livestock?"
    }
]);

function cloneDefaults(over) {
    const cfg = JSON.parse(JSON.stringify(DEFAULTS));
    if (!over || typeof over !== "object") return cfg;
    const keys = Object.keys(over);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = over[key];
        const prev = cfg[key];
        if (value && typeof value === "object" && !Array.isArray(value) && prev && typeof prev === "object" && !Array.isArray(prev)) {
            const inner = Object.keys(value);
            for (let j = 0; j < inner.length; j++) prev[inner[j]] = value[inner[j]];
        } else {
            cfg[key] = value;
        }
    }
    return cfg;
}

module.exports = {
    ROLES: ROLES,
    DEFAULTS: DEFAULTS,
    QUESTIONS: QUESTIONS,
    cloneDefaults: cloneDefaults
};
