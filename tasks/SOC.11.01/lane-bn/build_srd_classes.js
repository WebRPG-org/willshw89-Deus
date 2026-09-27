#!/usr/bin/env node
"use strict";

/**
 * tasks/SOC.11.01/lane-bn/build_srd_classes.js
 *
 * Builds game/data/society/srd_classes.json from the tracked 2014 SRD 5.1 catalogue
 * (game/data/srd51/*.json) and the person-identity class ids (game/js/sim/society/identity.js).
 * Nothing is typed in by hand except the column-type table, the one recorded source
 * discrepancy, and the text of the unavailable-fact reason. The validator
 * (tools/society/test_srd_classes.js) re-derives every value from the sources on its own.
 *
 * Usage:
 *   node tasks/SOC.11.01/lane-bn/build_srd_classes.js           write the file
 *   node tasks/SOC.11.01/lane-bn/build_srd_classes.js --check   exit 1 if the file differs
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const OUT = path.join(ROOT, "game", "data", "society", "srd_classes.json");
const SRD_DIR = "game/data/srd51";
const SOURCE_FILES = {
    character_options: SRD_DIR + "/character_options.json",
    rules: SRD_DIR + "/rules.json",
    spells: SRD_DIR + "/spells.json",
    equipment: SRD_DIR + "/equipment.json",
    creatures: SRD_DIR + "/creatures.json",
    magic_items: SRD_DIR + "/magic_items.json"
};
const IDENTITY_PATH = "game/js/sim/society/identity.js";
const IDENTITY_SCHEMA_PATH = "game/data/society/person_identity.schema.json";

// Typed class-specific table columns. Every other column is Level, Proficiency Bonus,
// Features, or a spellcasting column.
const COLUMN_TYPES = {
    "Rages": "COUNT_OR_UNLIMITED",
    "Rage Damage": "BONUS",
    "Martial Arts": "DICE",
    "Ki Points": "COUNT",
    "Unarmored Movement": "FEET_BONUS",
    "Sneak Attack": "DICE",
    "Sorcery Points": "COUNT",
    "Invocations Known": "COUNT"
};

// Class-table labels that do not name the feature heading they stand for.
const DISCREPANCIES = [
    {
        class: "srd:class:wizard",
        level: 20,
        tableLabel: "Signature Spell",
        featureName: "Signature Spells",
        note: "The Wizard table prints 'Signature Spell'; the 20th-level feature heading is 'Signature Spells'."
    }
];

const PRIMARY_ABILITY_PATTERN = "primary abilit";
const PRIMARY_ABILITY_REASON = "No tracked SRD 5.1 file states a primary ability for any class. " +
    "The only SRD table that pairs classes with ability scores is Multiclassing Prerequisites " +
    "(srd:rule:beyond-1st-level-multiclassing), which belongs to the optional multiclassing rule and is not a primary-ability statement.";

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5 };
const ABILITIES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];
const ARMOR_ORDER = ["light", "medium", "heavy", "shield"];

function readJson(rel) {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}
function contentSha256(obj) {
    return crypto.createHash("sha256").update(JSON.stringify(obj), "utf8").digest("hex");
}
function ordinal(n) {
    const t = n % 100;
    if (t >= 11 && t <= 13) return n + "th";
    return n + ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
}
function mentionsLevel(text, level) {
    return new RegExp("\\b" + ordinal(level) + "\\b").test(text);
}
function camel(s) {
    const words = s.replace(/[^A-Za-z0-9 ]/g, "").split(" ").filter(Boolean);
    return words.map((w, i) => i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()).join("");
}
function fail(msg) {
    throw new Error(msg);
}
function src(file, entry, pathArr, quote) {
    return { file: file, entry: entry, path: pathArr, quote: quote };
}

function parseCell(type, raw) {
    if (raw === "—") return null;
    let m;
    switch (type) {
        case "COUNT":
            if (/^\d+$/.test(raw)) return Number(raw);
            break;
        case "COUNT_OR_UNLIMITED":
            if (/^\d+$/.test(raw)) return Number(raw);
            if (raw === "Unlimited") return "UNLIMITED";
            break;
        case "BONUS":
            if ((m = raw.match(/^\+(\d+)$/))) return Number(m[1]);
            break;
        case "DICE":
            if (/^\d+d\d+$/.test(raw)) return raw;
            break;
        case "FEET_BONUS":
            if ((m = raw.match(/^\+(\d+) ft\.$/))) return Number(m[1]);
            break;
        case "ORDINAL":
            if ((m = raw.match(/^(\d+)(st|nd|rd|th)$/))) return Number(m[1]);
            break;
        default:
            break;
    }
    return fail("cannot parse " + type + " cell " + JSON.stringify(raw));
}

function armorGrants(text, equipment) {
    let base = text;
    let qualifier = null;
    const q = text.match(/^(.*?) \((.+)\)$/);
    if (q) {
        base = q[1];
        qualifier = q[2];
    }
    const cats = new Set(equipment.entries.filter(e => e.kind === "armor").map(e => e.data.armorCategory));
    const body = ARMOR_ORDER.filter(c => c !== "shield" && cats.has(c));
    const grants = base === "None" ? [] : base.split(", ").map(token => {
        const low = token.toLowerCase();
        if (low === "all armor") return { token: token, armorCategories: body };
        if (low === "shields") return { token: token, armorCategories: ["shield"] };
        const m = low.match(/^(light|medium|heavy) armor$/);
        if (m && cats.has(m[1])) return { token: token, armorCategories: [m[1]] };
        return fail("unknown armor token " + token);
    });
    return { grants: grants, qualifier: qualifier };
}

function weaponPlural(name) {
    const m = name.match(/^(.+), (.+)$/);
    const n = m ? m[2] + " " + m[1] : name;
    return (n + "s").toLowerCase();
}

function weaponGrants(text, equipment) {
    if (text === "None") return [];
    const weapons = equipment.entries.filter(e => e.kind === "weapon");
    return text.split(", ").map(token => {
        const low = token.toLowerCase();
        const cat = low.match(/^(simple|martial) weapons$/);
        if (cat) return { token: token, weaponCategory: cat[1] };
        const hits = weapons.filter(w => weaponPlural(w.name) === low);
        if (hits.length !== 1) fail("weapon token " + token + " matched " + hits.length + " weapons");
        return { token: token, equipment: hits[0].id };
    });
}

function toolGroupFor(phrase, groups) {
    const low = phrase.toLowerCase();
    const hit = groups.filter(g => g.toLowerCase() === low || g.toLowerCase() + "s" === low);
    if (hit.length !== 1) fail("tool group " + phrase + " matched " + hit.length);
    return hit[0];
}

function toolGrants(text, equipment) {
    const tools = equipment.entries.filter(e => e.kind === "tool");
    const groups = Array.from(new Set(tools.map(t => t.data.group).filter(Boolean)));
    if (text === "None") return { fixed: [], choice: null };
    let m = text.match(/^(\w+) (.+) of your choice$/i);
    if (m && NUMBER_WORDS[m[1].toLowerCase()]) {
        return { fixed: [], choice: { count: NUMBER_WORDS[m[1].toLowerCase()], groups: [toolGroupFor(m[2], groups)] } };
    }
    m = text.match(/^Choose (\w+) type of (.+) or (\w+) (.+)$/);
    if (m && NUMBER_WORDS[m[1]] && m[1] === m[3]) {
        return { fixed: [], choice: { count: NUMBER_WORDS[m[1]], groups: [toolGroupFor(m[2], groups), toolGroupFor(m[4], groups)] } };
    }
    const fixed = text.split(", ").map(token => {
        const hits = tools.filter(t => t.name.toLowerCase() === token.toLowerCase());
        if (hits.length !== 1) fail("tool token " + token + " matched " + hits.length);
        return hits[0].id;
    });
    return { fixed: fixed, choice: null };
}

function skillGrants(text) {
    let m = text.match(/^Choose any (\w+)$/);
    if (m && NUMBER_WORDS[m[1]]) return { choose: NUMBER_WORDS[m[1]], from: "ANY" };
    m = text.match(/^Choose (\w+)(?: skills)? from (.+)$/);
    if (!m || !NUMBER_WORDS[m[1]]) return fail("cannot parse skills " + text);
    const list = m[2].replace(/,? and /, ", ").split(", ");
    return { choose: NUMBER_WORDS[m[1]], from: list };
}

function spellcastingFor(entry, spells) {
    const features = entry.data.features;
    const idx = features.findIndex(f => f.name === "Spellcasting" || f.name === "Pact Magic");
    if (idx < 0) return { status: "NONE", basis: "NO_SPELLCASTING_FEATURE" };
    const f = features[idx];
    const fp = ["data", "features", idx, "text"];
    const E = entry.id;
    const short = E.slice("srd:class:".length);
    const out = { status: "PRESENT", feature: f.name, featureIndex: idx, gainedAtLevel: f.level };

    const ab = f.text.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) is your spellcasting ability for your (\w+) spells/);
    if (!ab || ab[2] !== short) fail(E + " spellcasting ability");
    out.ability = ab[1];
    out.abilitySrc = src("character_options", E, fp, ab[0]);

    const lists = spells.entries.filter(s => s.kind === "spell-list" && s.data.class === short);
    if (lists.length !== 1) fail(E + " spell list count " + lists.length);
    out.spellList = lists[0].id;

    const cols = entry.data.classTable.columns;
    const slotCols = cols.filter(c => /^Spell Slots per Spell Level: \d+(st|nd|rd|th)$/.test(c));
    const pact = cols.indexOf("Slot Level") >= 0;
    out.slotModel = pact ? "PACT_SLOTS" : "SPELL_LEVEL_SLOTS";
    if (pact) {
        const li = cols.indexOf("Slot Level");
        out.maxSlotLevel = Math.max.apply(null, entry.data.classTable.rows.map(r => parseCell("ORDINAL", r[li])));
    } else {
        out.maxSlotLevel = slotCols.length;
    }
    const pc = [];
    if (cols.indexOf("Cantrips Known") >= 0) pc.push("cantripsKnown");
    if (cols.indexOf("Spells Known") >= 0) pc.push("spellsKnown");
    pc.push(pact ? "pactSlots" : "slots");
    out.progressionColumns = pc;

    const subs = f.subheadings;
    if (subs.indexOf("Preparing and Casting Spells") >= 0) {
        const m = f.text.match(/choose a number of \w+ spells(?: from your spellbook)? equal to your (\w+) modifier \+ (your \w+ level|half your \w+ level, rounded down) \(minimum of one spell\)/);
        if (!m) fail(E + " preparation formula");
        out.preparation = {
            model: "PREPARED",
            ability: m[1],
            classLevel: /^half /.test(m[2]) ? "HALF_ROUNDED_DOWN" : "FULL",
            minimum: 1,
            src: src("character_options", E, fp, m[0])
        };
    } else if (subs.indexOf("Spells Known of 1st Level and Higher") >= 0) {
        out.preparation = { model: "KNOWN", src: src("character_options", E, ["data", "features", idx, "subheadings"], JSON.stringify(subs)) };
    } else fail(E + " has neither preparation nor known model");

    const rec = f.text.match(/You regain all expended spell slots when you finish a (short or long rest|long rest)\./);
    if (!rec) fail(E + " slot recovery");
    out.slotRecovery = { rest: rec[1] === "long rest" ? "LONG_REST" : "SHORT_OR_LONG_REST", src: src("character_options", E, fp, rec[0]) };

    if (subs.indexOf("Ritual Casting") >= 0) {
        const m = f.text.match(/Ritual Casting\n\n([^\n]+)/);
        const s = m && m[1];
        let spellSource = null;
        if (s && /you know as a ritual/.test(s)) spellSource = "KNOWN";
        else if (s && /you have the spell prepared/.test(s)) spellSource = "PREPARED";
        else if (s && /you have the spell in your spellbook/.test(s)) spellSource = "IN_SPELLBOOK";
        if (!spellSource) fail(E + " ritual casting");
        out.ritualCasting = { status: "PRESENT", spellSource: spellSource, src: src("character_options", E, fp, s) };
    } else {
        out.ritualCasting = { status: "NONE", basis: "NO_RITUAL_CASTING_SUBSECTION" };
    }

    if (subs.indexOf("Spellcasting Focus") >= 0) {
        const m = f.text.match(/You can use (?:a|an) (.+?)(?: \(see “Equipment”\))? as a spellcasting focus/);
        if (!m) fail(E + " focus");
        out.focus = { status: "PRESENT", item: m[1], src: src("character_options", E, fp, m[0]) };
    } else {
        out.focus = { status: "NONE", basis: "NO_SPELLCASTING_FOCUS_SUBSECTION" };
    }
    return out;
}

function classifyLabel(label, level, classId, features, choice) {
    const byName = n => features.find(f => f.name === n);
    const exact = byName(label);
    if (exact && exact.level === level) return { label: label, kind: "FEATURE_GAINED", refs: [label] };
    if (exact && exact.level < level && mentionsLevel(exact.text, level)) return { label: label, kind: "FEATURE_ADVANCED", refs: [label] };
    let m = label.match(/^(.*) \((.+)\)$/);
    if (m && byName(m[1])) {
        const f = byName(m[1]);
        if (f.level === level) return { label: label, kind: "FEATURE_GAINED", refs: [f.name], detail: m[2] };
        if (f.level < level && mentionsLevel(f.text, level)) return { label: label, kind: "FEATURE_ADVANCED", refs: [f.name], detail: m[2] };
    }
    m = label.match(/^(.*) improvements?$/);
    if (m) {
        const refs = [];
        let ok = true;
        for (const part of m[1].split(" and ")) {
            const hits = features.filter(f => (f.name === part || f.name.indexOf(part + " ") === 0) && f.level < level && mentionsLevel(f.text, level));
            if (!hits.length) ok = false;
            for (const h of hits) refs.push(h.name);
        }
        if (ok) return { label: label, kind: "FEATURE_IMPROVED", refs: refs };
    }
    m = label.match(/^(.*) feature$/);
    if (m && choice && (choice.name === m[1] || choice.name.endsWith(" " + m[1])) && choice.level < level && mentionsLevel(choice.text, level)) {
        return { label: label, kind: "SUBCLASS_FEATURE", refs: [choice.name] };
    }
    const d = DISCREPANCIES.find(x => x.class === classId && x.level === level && x.tableLabel === label);
    if (d && byName(d.featureName) && byName(d.featureName).level === level) {
        return { label: label, kind: "FEATURE_GAINED", refs: [d.featureName] };
    }
    return fail(classId + " level " + level + ": cannot classify " + label);
}

function build() {
    const S = {};
    for (const k of Object.keys(SOURCE_FILES)) S[k] = readJson(SOURCE_FILES[k]);
    const co = S.character_options;
    const Identity = require(path.join(ROOT, IDENTITY_PATH));
    const classIds = Identity.CLASS_IDS.slice();

    const sources = {};
    for (const k of Object.keys(SOURCE_FILES)) {
        sources[k] = { path: SOURCE_FILES[k], contentSha256: contentSha256(S[k]), pdfSha256: S[k].metadata.source.sha256 };
    }

    // Unavailable-fact search: every srd51 content file, raw text, case-insensitive.
    let matches = 0;
    for (const k of Object.keys(SOURCE_FILES)) {
        const text = fs.readFileSync(path.join(ROOT, SOURCE_FILES[k]), "utf8").toLowerCase();
        let at = text.indexOf(PRIMARY_ABILITY_PATTERN);
        while (at >= 0) {
            matches++;
            at = text.indexOf(PRIMARY_ABILITY_PATTERN, at + 1);
        }
    }
    if (matches !== 0) fail("primary ability is present in the sources; it is not unavailable");

    const advEntry = S.rules.entries.find(e => e.id === "srd:rule:beyond-1st-level");
    const advIdx = advEntry.data.tables.findIndex(t => t.caption === "Character Advancement");
    const advTable = advEntry.data.tables[advIdx];
    const advancement = {
        src: src("rules", advEntry.id, ["data", "tables", advIdx, "caption"], "Character Advancement"),
        levels: advTable.rows.map(r => ({
            level: Number(r[1]),
            experiencePoints: Number(r[0].replace(/,/g, "")),
            proficiencyBonus: parseCell("BONUS", r[2])
        }))
    };

    const races = co.entries.filter(e => e.kind === "race").map(e => e.id);

    const classes = classIds.map(id => {
        const entry = co.entries.find(e => e.id === id && e.kind === "class");
        if (!entry) fail("no srd51 class entry for " + id);
        const D = entry.data;
        const E = entry.id;
        const short = E.slice("srd:class:".length);

        const hd = D.hitDie.match(/^1d(\d+)$/);
        if (!hd) fail(E + " hit die");
        const sides = Number(hd[1]);
        const h1 = D.hitPoints.level1.match(/^(\d+) \+ your (\w+) modifier$/);
        const hn = D.hitPoints.higher.match(/^(1d\d+) \(or (\d+)\) \+ your (\w+) modifier per (\w+) level after 1st$/);
        if (!h1 || !hn || hn[4] !== short) fail(E + " hit points");

        const armor = armorGrants(D.proficiencies.armor, S.equipment);
        const sub = co.entries.filter(e => e.kind === "subclass" && e.data.parentClass === entry.name);
        if (sub.length < 1) fail(E + " has no SRD subclass");
        const choiceName = sub[0].data.gainedByFeature;
        const choice = D.features.find(f => f.name === choiceName);
        if (!choice || choice.level !== sub[0].data.gainedAtLevel) fail(E + " subclass choice feature");

        const cols = D.classTable.columns;
        const fcol = cols.indexOf("Features");
        const pcol = cols.indexOf("Proficiency Bonus");
        const classCols = cols.filter(c => Object.prototype.hasOwnProperty.call(COLUMN_TYPES, c))
            .map(c => ({ key: camel(c), sourceColumn: c, valueType: COLUMN_TYPES[c] }));
        const known = new Set(["Level", "Proficiency Bonus", "Features", "Cantrips Known", "Spells Known", "Spell Slots", "Slot Level"]);
        for (const c of cols) {
            if (!known.has(c) && !COLUMN_TYPES[c] && !/^Spell Slots per Spell Level: /.test(c)) fail(E + " untyped column " + c);
        }

        const spellcasting = spellcastingFor(entry, S.spells);

        const levels = D.classTable.rows.map((row, i) => {
            const level = i + 1;
            if (row[0] !== ordinal(level)) fail(E + " row " + i + " is " + row[0]);
            const cell = row[fcol];
            const slots = cell === "—" ? [] : cell.split(", ").map(label => classifyLabel(label, level, E, D.features, choice));
            const values = {};
            for (const c of classCols) values[c.key] = parseCell(c.valueType, row[cols.indexOf(c.sourceColumn)]);
            let sc = null;
            if (spellcasting.status === "PRESENT") {
                sc = {};
                if (spellcasting.progressionColumns.indexOf("cantripsKnown") >= 0) sc.cantripsKnown = parseCell("COUNT", row[cols.indexOf("Cantrips Known")]);
                if (spellcasting.progressionColumns.indexOf("spellsKnown") >= 0) sc.spellsKnown = parseCell("COUNT", row[cols.indexOf("Spells Known")]);
                if (spellcasting.slotModel === "PACT_SLOTS") {
                    sc.pactSlots = {
                        count: parseCell("COUNT", row[cols.indexOf("Spell Slots")]),
                        slotLevel: parseCell("ORDINAL", row[cols.indexOf("Slot Level")])
                    };
                } else {
                    sc.slots = [];
                    for (let n = 1; n <= spellcasting.maxSlotLevel; n++) {
                        sc.slots.push(parseCell("COUNT", row[cols.indexOf("Spell Slots per Spell Level: " + ordinal(n))]));
                    }
                }
            }
            return {
                level: level,
                proficiencyBonus: parseCell("BONUS", row[pcol]),
                features: slots,
                classColumns: values,
                spellcasting: sc
            };
        });

        const subLevels = [choice.level];
        for (const L of levels) if (L.features.some(s => s.kind === "SUBCLASS_FEATURE")) subLevels.push(L.level);

        return {
            id: E,
            name: entry.name,
            source: {
                file: "character_options",
                entry: E,
                pages: entry.source.pages.slice(),
                heading: entry.source.heading,
                readiness: entry.readiness
            },
            hitDie: { die: "d" + sides, sides: sides, src: src("character_options", E, ["data", "hitDie"], D.hitDie) },
            hitPoints: {
                firstLevel: { base: Number(h1[1]), plusModifier: h1[2], src: src("character_options", E, ["data", "hitPoints", "level1"], D.hitPoints.level1) },
                laterLevels: { roll: hn[1], fixed: Number(hn[2]), plusModifier: hn[3], src: src("character_options", E, ["data", "hitPoints", "higher"], D.hitPoints.higher) }
            },
            primaryAbility: {
                status: "UNAVAILABLE",
                reason: PRIMARY_ABILITY_REASON,
                search: { files: Object.keys(SOURCE_FILES), pattern: PRIMARY_ABILITY_PATTERN, caseInsensitive: true, matches: 0 }
            },
            savingThrows: {
                abilities: D.savingThrows.slice(),
                src: src("character_options", E, ["data", "savingThrows"], JSON.stringify(D.savingThrows))
            },
            proficiencies: {
                armor: { grants: armor.grants, qualifier: armor.qualifier, src: src("character_options", E, ["data", "proficiencies", "armor"], D.proficiencies.armor) },
                weapons: { grants: weaponGrants(D.proficiencies.weapons, S.equipment), src: src("character_options", E, ["data", "proficiencies", "weapons"], D.proficiencies.weapons) },
                tools: Object.assign(toolGrants(D.proficiencies.tools, S.equipment), { src: src("character_options", E, ["data", "proficiencies", "tools"], D.proficiencies.tools) }),
                skills: Object.assign(skillGrants(D.proficiencies.skills), { src: src("character_options", E, ["data", "proficiencies", "skills"], D.proficiencies.skills) })
            },
            spellcasting: spellcasting,
            subclass: {
                choiceFeature: choice.name,
                choiceLevel: choice.level,
                featureLevels: subLevels,
                srdSubclasses: sub.map(s => s.id)
            },
            tableSrc: src("character_options", E, ["data", "classTable", "caption"], D.classTable.caption),
            classColumns: classCols,
            features: D.features.map((f, i) => ({ name: f.name, level: f.level, sourceIndex: i })),
            levels: levels
        };
    });

    const used = new Set();
    for (const c of classes) for (const L of c.levels) for (const s of L.features) {
        const d = DISCREPANCIES.find(x => x.class === c.id && x.level === L.level && x.tableLabel === s.label);
        if (d) used.add(d);
    }
    if (used.size !== DISCREPANCIES.length) fail("a recorded discrepancy was not used");

    return {
        schema: 1,
        task: "SOC.11.01",
        edition: "SRD 5.1 (2014)",
        license: JSON.parse(JSON.stringify(co.metadata.license)),
        sources: sources,
        identity: { module: IDENTITY_PATH, export: "CLASS_IDS", schema: IDENTITY_SCHEMA_PATH },
        characterAdvancement: advancement,
        raceClassPolicy: {
            rule: "NO_LOCKS",
            decision: "DEC-036",
            races: races,
            statement: "Every race may take every class. This file records no race condition of any kind on any class."
        },
        unavailableFacts: [
            { field: "primaryAbility", classes: classes.map(c => c.id), reason: PRIMARY_ABILITY_REASON }
        ],
        sourceDiscrepancies: DISCREPANCIES.map(d => Object.assign({}, d)),
        classes: classes
    };
}

// Arrays and objects that fit on one line are written on one line.
function format(value, indent) {
    const flat = JSON.stringify(value);
    const pad = "  ".repeat(indent);
    if (value === null || typeof value !== "object" || flat.length + pad.length <= 118) return flat;
    const inner = "  ".repeat(indent + 1);
    if (Array.isArray(value)) {
        return "[\n" + value.map(v => inner + format(v, indent + 1)).join(",\n") + "\n" + pad + "]";
    }
    const keys = Object.keys(value);
    return "{\n" + keys.map(k => inner + JSON.stringify(k) + ": " + format(value[k], indent + 1)).join(",\n") + "\n" + pad + "}";
}

function main() {
    const text = format(build(), 0) + "\n";
    if (process.argv.indexOf("--check") >= 0) {
        const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8").replace(/\r\n/g, "\n") : "";
        if (cur !== text) {
            console.log("srd_classes.json differs from a fresh build");
            process.exit(1);
        }
        console.log("srd_classes.json matches a fresh build");
        return;
    }
    fs.writeFileSync(OUT, text, "utf8");
    console.log("wrote " + path.relative(ROOT, OUT) + " (" + text.length + " chars)");
}

if (require.main === module) main();
module.exports = { build: build, format: format };
