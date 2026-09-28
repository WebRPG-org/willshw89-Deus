#!/usr/bin/env node
"use strict";

/**
 * tools/society/test_srd_classes.js
 *
 * Validator and gate for game/data/society/srd_classes.json (SOC.11.01): the twelve 2014 SRD 5.1
 * classes. Every value in the data file is re-derived here from the tracked SRD 5.1 catalogue
 * (game/data/srd51/*.json), the person-identity class ids (game/js/sim/society/identity.js and
 * game/data/society/person_identity.schema.json), DEC-036 in docs/OWNER_DECISIONS.md, and the
 * system doc docs/systems/DEUS_SRD_Classes.md.
 *
 * A gate run has three parts, and exits 0 only when all three hold:
 *   1. Baseline: every rule passes on the committed files.
 *   2. Fixtures: each negative fixture mutates one thing and must trip exactly its target rule
 *      plus the rules it declares in `also`. A fixture that trips nothing, trips a different
 *      rule, or trips an undeclared extra rule fails the gate.
 *   3. Coverage: every rule is the target of at least one fixture.
 *
 * Usage:
 *   node tools/society/test_srd_classes.js                     gate run (baseline, fixtures, coverage)
 *   node tools/society/test_srd_classes.js --data <file>       validate another data file (rules only)
 *   node tools/society/test_srd_classes.js --list-provocations
 *   node tools/society/test_srd_classes.js --provoke <name>    apply one fixture, validate, exit 1 on failure
 *   node tools/society/test_srd_classes.js --provoke-all       run every provocation in its own process
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const DATA_PATH = path.join(ROOT, "game", "data", "society", "srd_classes.json");
const SCHEMA_PATH = path.join(ROOT, "game", "data", "society", "srd_classes.schema.json");
const DOC_PATH = path.join(ROOT, "docs", "systems", "DEUS_SRD_Classes.md");
const DECISIONS_PATH = path.join(ROOT, "docs", "OWNER_DECISIONS.md");
const IDENTITY_PATH = path.join(ROOT, "game", "js", "sim", "society", "identity.js");
const IDENTITY_SCHEMA_PATH = path.join(ROOT, "game", "data", "society", "person_identity.schema.json");
const SOURCE_PATHS = {
    character_options: "game/data/srd51/character_options.json",
    rules: "game/data/srd51/rules.json",
    spells: "game/data/srd51/spells.json",
    equipment: "game/data/srd51/equipment.json",
    creatures: "game/data/srd51/creatures.json",
    magic_items: "game/data/srd51/magic_items.json"
};
const SOURCE_KEYS = Object.keys(SOURCE_PATHS);

const DASH = "—";
const ABILITIES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];
const WORD_NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5 };
const TABLE_BASE_COLUMNS = ["Level", "Proficiency Bonus", "Features"];
const SPELL_COLUMNS = ["Cantrips Known", "Spells Known", "Spell Slots", "Slot Level"];
const SLOT_COLUMN = /^Spell Slots per Spell Level: (\d+)(?:st|nd|rd|th)$/;
const VALUE_TYPES = ["COUNT", "COUNT_OR_UNLIMITED", "BONUS", "FEET_BONUS", "DICE"];
const BODY_ARMOR = ["light", "medium", "heavy"];
// The fact each UNAVAILABLE field would have to be stated as. A different probe could hide a real match.
const UNAVAILABLE_PROBES = { primaryAbility: "primary abilit" };
const LOCK_KEY = /race|species|ancestr|lineage|prereq|requir|eligib|allow|forbid|restrict|lock/i;
const AFFINITY_KEY = /affinit|weight|jobpick|job_pick|favou?r/i;
const SCHEMA_KEYWORDS = new Set(["$schema", "$id", "$defs", "$ref", "$comment", "title", "description", "type", "enum", "const",
    "properties", "required", "additionalProperties", "items", "minItems", "maxItems", "uniqueItems", "minimum", "maximum",
    "minLength", "pattern", "oneOf", "anyOf", "allOf", "not"]);

// ---------------------------------------------------------------- small helpers

function sha256(text) {
    return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}
function same(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}
function clone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
}
function deepFreeze(o) {
    if (o && typeof o === "object" && !Object.isFrozen(o)) {
        Object.freeze(o);
        for (const k of Object.keys(o)) deepFreeze(o[k]);
    }
    return o;
}
function isObj(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}
function nth(n) {
    const t = n % 100;
    if (t >= 11 && t <= 13) return n + "th";
    const last = n % 10;
    return n + (last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th");
}
function namesLevel(text, level) {
    return new RegExp("(^|[^0-9A-Za-z])" + nth(level) + "($|[^0-9A-Za-z])").test(String(text));
}
function camelKey(s) {
    const w = s.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).map(x => x.toLowerCase());
    return w.map((x, i) => (i ? x.charAt(0).toUpperCase() + x.slice(1) : x)).join("");
}
function shortOf(classId) {
    return String(classId).replace(/^srd:class:/, "");
}
function readText(file) {
    return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

// Parse one class-table cell. Returns { ok, value }. An em dash is null for every type.
function cell(type, raw) {
    if (raw === DASH) return { ok: true, value: null };
    let m;
    if (type === "COUNT" && /^\d+$/.test(raw)) return { ok: true, value: +raw };
    if (type === "COUNT_OR_UNLIMITED") {
        if (/^\d+$/.test(raw)) return { ok: true, value: +raw };
        if (raw === "Unlimited") return { ok: true, value: "UNLIMITED" };
    }
    if (type === "BONUS" && (m = /^\+(\d+)$/.exec(raw))) return { ok: true, value: +m[1] };
    if (type === "FEET_BONUS" && (m = /^\+(\d+) ft\.$/.exec(raw))) return { ok: true, value: +m[1] };
    if (type === "DICE" && /^\d+d\d+$/.test(raw)) return { ok: true, value: raw };
    if (type === "ORDINAL" && (m = /^(\d+)(st|nd|rd|th)$/.exec(raw))) return { ok: true, value: +m[1] };
    return { ok: false, value: undefined };
}
function cellValue(type, raw) {
    const r = cell(type, raw);
    if (!r.ok) throw new Error("unparseable " + type + " cell " + JSON.stringify(raw));
    return r.value;
}

// ---------------------------------------------------------------- JSON Schema subset

function typeMatches(t, v) {
    if (t === "null") return v === null;
    if (t === "integer") return typeof v === "number" && Number.isInteger(v);
    if (t === "number") return typeof v === "number" && isFinite(v);
    if (t === "string") return typeof v === "string";
    if (t === "boolean") return typeof v === "boolean";
    if (t === "array") return Array.isArray(v);
    if (t === "object") return isObj(v);
    return false;
}
function resolveRef(root, ref) {
    if (!/^#\/\$defs\/[A-Za-z0-9_]+$/.test(ref)) throw new Error("unsupported $ref " + ref);
    const node = root.$defs && root.$defs[ref.slice(8)];
    if (!node) throw new Error("dangling $ref " + ref);
    return node;
}
function schemaErrors(root, node, value, at, out) {
    if (node === true) return out;
    if (node === false) {
        out.push(at + ": schema false");
        return out;
    }
    if (node.$ref) schemaErrors(root, resolveRef(root, node.$ref), value, at, out);
    if (node.type !== undefined) {
        const types = Array.isArray(node.type) ? node.type : [node.type];
        if (!types.some(t => typeMatches(t, value))) {
            out.push(at + ": type " + JSON.stringify(node.type));
            return out;
        }
    }
    if (Object.prototype.hasOwnProperty.call(node, "const") && !same(node.const, value)) out.push(at + ": const " + JSON.stringify(node.const));
    if (node.enum && !node.enum.some(e => same(e, value))) out.push(at + ": enum");
    if (typeof value === "number") {
        if (node.minimum !== undefined && value < node.minimum) out.push(at + ": minimum " + node.minimum);
        if (node.maximum !== undefined && value > node.maximum) out.push(at + ": maximum " + node.maximum);
    }
    if (typeof value === "string") {
        if (node.minLength !== undefined && value.length < node.minLength) out.push(at + ": minLength " + node.minLength);
        if (node.pattern !== undefined && !new RegExp(node.pattern, "u").test(value)) out.push(at + ": pattern " + node.pattern);
    }
    if (Array.isArray(value)) {
        if (node.minItems !== undefined && value.length < node.minItems) out.push(at + ": minItems " + node.minItems);
        if (node.maxItems !== undefined && value.length > node.maxItems) out.push(at + ": maxItems " + node.maxItems);
        if (node.uniqueItems) {
            const seen = new Set(value.map(v => JSON.stringify(v)));
            if (seen.size !== value.length) out.push(at + ": uniqueItems");
        }
        if (node.items !== undefined) value.forEach((v, i) => schemaErrors(root, node.items, v, at + "[" + i + "]", out));
    }
    if (isObj(value)) {
        const props = node.properties || {};
        for (const r of node.required || []) if (!Object.prototype.hasOwnProperty.call(value, r)) out.push(at + ": missing " + r);
        for (const k of Object.keys(value)) {
            if (Object.prototype.hasOwnProperty.call(props, k)) schemaErrors(root, props[k], value[k], at + "." + k, out);
            else if (node.additionalProperties === false) out.push(at + ": unexpected key " + k);
            else if (isObj(node.additionalProperties)) schemaErrors(root, node.additionalProperties, value[k], at + "." + k, out);
        }
    }
    if (node.allOf) for (const s of node.allOf) schemaErrors(root, s, value, at, out);
    if (node.anyOf && !node.anyOf.some(s => schemaErrors(root, s, value, at, []).length === 0)) out.push(at + ": anyOf");
    if (node.oneOf) {
        const n = node.oneOf.filter(s => schemaErrors(root, s, value, at, []).length === 0).length;
        if (n !== 1) out.push(at + ": oneOf matched " + n);
    }
    if (node.not && schemaErrors(root, node.not, value, at, []).length === 0) out.push(at + ": not");
    return out;
}
// Visit every subschema: fn(node, parentKeyword).
function walkSchema(node, fn, parentKeyword) {
    if (!isObj(node)) return;
    fn(node, parentKeyword);
    for (const k of ["properties", "$defs"]) if (isObj(node[k])) for (const n of Object.keys(node[k])) walkSchema(node[k][n], fn, k);
    for (const k of ["items", "not", "additionalProperties"]) if (isObj(node[k])) walkSchema(node[k], fn, k);
    for (const k of ["oneOf", "anyOf", "allOf"]) if (Array.isArray(node[k])) for (const n of node[k]) walkSchema(n, fn, k);
}

// ---------------------------------------------------------------- context

function loadContext(opts) {
    opts = opts || {};
    const src = {};
    const raw = {};
    for (const k of SOURCE_KEYS) {
        raw[k] = fs.readFileSync(path.join(ROOT, SOURCE_PATHS[k]), "utf8");
        src[k] = deepFreeze(JSON.parse(raw[k]));
    }
    const identity = require(IDENTITY_PATH);
    return {
        data: JSON.parse(fs.readFileSync(opts.data || DATA_PATH, "utf8")),
        schema: JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8")),
        doc: fs.existsSync(DOC_PATH) ? readText(DOC_PATH) : "",
        decisions: readText(DECISIONS_PATH),
        identityIds: identity.CLASS_IDS.slice(),
        identitySchema: JSON.parse(fs.readFileSync(IDENTITY_SCHEMA_PATH, "utf8")),
        src: src,
        raw: raw
    };
}
// A fixture gets its own copy of everything it may change. Sources stay frozen unless listed.
function contextFor(base, touches) {
    const ctx = Object.assign({}, base);
    ctx.data = clone(base.data);
    ctx.schema = clone(base.schema);
    ctx.identityIds = base.identityIds.slice();
    ctx.identitySchema = clone(base.identitySchema);
    ctx.src = Object.assign({}, base.src);
    ctx.raw = Object.assign({}, base.raw);
    for (const t of touches || []) if (/^src:/.test(t)) ctx.src[t.slice(4)] = clone(base.src[t.slice(4)]);
    return ctx;
}

function entries(ctx, file) {
    const f = ctx.src[file];
    return f && Array.isArray(f.entries) ? f.entries : [];
}
function entry(ctx, file, id) {
    return entries(ctx, file).find(e => e.id === id);
}
function classes(ctx) {
    return ctx.data && Array.isArray(ctx.data.classes) ? ctx.data.classes : [];
}
// Pairs of (data class, SRD class entry). A data class with no SRD entry is reported by ID_SRD_ENTRY.
function pairs(ctx) {
    const out = [];
    for (const c of classes(ctx)) {
        const e = isObj(c) ? entry(ctx, "character_options", c.id) : null;
        if (e && e.kind === "class") out.push({ c: c, e: e, D: e.data, cols: e.data.classTable.columns, rows: e.data.classTable.rows });
    }
    return out;
}
function col(p, name) {
    return p.cols.indexOf(name);
}
function levelRow(p, level) {
    return Array.isArray(p.c.levels) ? p.c.levels.find(l => isObj(l) && l.level === level) : undefined;
}
function spellFeatureIndex(D) {
    return D.features.findIndex(f => f.name === "Spellcasting" || f.name === "Pact Magic");
}
function advancementTable(ctx) {
    const e = entry(ctx, "rules", "srd:rule:beyond-1st-level");
    return e && e.data.tables.find(t => t.caption === "Character Advancement");
}
function skillsText(ctx) {
    const e = entry(ctx, "rules", "srd:rule:using-ability-scores-ability-checks");
    return e ? e.text : "";
}
function walk(value, fn, at) {
    fn(value, at || []);
    if (Array.isArray(value)) value.forEach((v, i) => walk(v, fn, (at || []).concat(i)));
    else if (isObj(value)) for (const k of Object.keys(value)) walk(value[k], fn, (at || []).concat(k));
}

// ---------------------------------------------------------------- expected values (derived from sources)

function expectedClassColumns(p) {
    return p.cols.filter(c => TABLE_BASE_COLUMNS.indexOf(c) < 0 && SPELL_COLUMNS.indexOf(c) < 0 && !SLOT_COLUMN.test(c)).map(c => {
        const i = col(p, c);
        const type = VALUE_TYPES.find(t => p.rows.every(r => cell(t, r[i]).ok));
        return { key: camelKey(c), sourceColumn: c, valueType: type || "UNPARSEABLE" };
    });
}

function expectedSpellModel(p) {
    const slotCols = p.cols.filter(c => SLOT_COLUMN.test(c));
    const pact = col(p, "Slot Level") >= 0;
    const columns = [];
    if (col(p, "Cantrips Known") >= 0) columns.push("cantripsKnown");
    if (col(p, "Spells Known") >= 0) columns.push("spellsKnown");
    columns.push(pact ? "pactSlots" : "slots");
    const maxSlotLevel = pact
        ? Math.max.apply(null, p.rows.map(r => cellValue("ORDINAL", r[col(p, "Slot Level")]) || 0))
        : slotCols.length;
    return { slotModel: pact ? "PACT_SLOTS" : "SPELL_LEVEL_SLOTS", maxSlotLevel: maxSlotLevel, progressionColumns: columns };
}

function expectedLevelSpellcasting(p, row) {
    const m = expectedSpellModel(p);
    const out = {};
    if (m.progressionColumns.indexOf("cantripsKnown") >= 0) out.cantripsKnown = cellValue("COUNT", row[col(p, "Cantrips Known")]);
    if (m.progressionColumns.indexOf("spellsKnown") >= 0) out.spellsKnown = cellValue("COUNT", row[col(p, "Spells Known")]);
    if (m.slotModel === "PACT_SLOTS") {
        out.pactSlots = { count: cellValue("COUNT", row[col(p, "Spell Slots")]), slotLevel: cellValue("ORDINAL", row[col(p, "Slot Level")]) };
    } else {
        out.slots = [];
        for (let n = 1; n <= m.maxSlotLevel; n++) out.slots.push(cellValue("COUNT", row[col(p, "Spell Slots per Spell Level: " + nth(n))]));
    }
    return out;
}

function subclassChoice(ctx, p) {
    const subs = entries(ctx, "character_options").filter(e => e.kind === "subclass" && e.data.parentClass === p.e.name);
    const byFeature = subs.length ? subs[0].data.gainedByFeature : null;
    return { subs: subs, feature: p.D.features.find(f => f.name === byFeature) || null };
}

// Returns { kind, refs, detail } or null when the label names no feature by any rule.
function expectedSlot(label, level, feats, choice) {
    const paren = /^(.+?) \(([^()]+)\)$/.exec(label);
    const base = paren ? paren[1] : label;
    const f = feats.find(x => x.name === base);
    if (f) {
        const detail = paren ? paren[2] : undefined;
        if (f.level === level) return { kind: "FEATURE_GAINED", refs: [f.name], detail: detail };
        if (f.level < level && namesLevel(f.text, level)) return { kind: "FEATURE_ADVANCED", refs: [f.name], detail: detail };
        return null;
    }
    const imp = /^(.+) improvements?$/.exec(label);
    if (imp) {
        const refs = [];
        for (const part of imp[1].split(" and ")) {
            const hit = feats.filter(x => (x.name === part || x.name.indexOf(part + " ") === 0) && x.level < level && namesLevel(x.text, level));
            if (!hit.length) return null;
            hit.forEach(h => refs.push(h.name));
        }
        return { kind: "FEATURE_IMPROVED", refs: refs };
    }
    const sub = /^(.+) feature$/.exec(label);
    if (sub && choice && (choice.name === sub[1] || choice.name.endsWith(" " + sub[1])) && choice.level < level && namesLevel(choice.text, level)) {
        return { kind: "SUBCLASS_FEATURE", refs: [choice.name] };
    }
    return null;
}

function tableLabels(p, level) {
    const raw = p.rows[level - 1][col(p, "Features")];
    return raw === DASH ? [] : raw.split(", ");
}

function unresolvedLabels(ctx) {
    const out = [];
    for (const p of pairs(ctx)) {
        const choice = subclassChoice(ctx, p).feature;
        for (let L = 1; L <= p.rows.length; L++) {
            for (const label of tableLabels(p, L)) if (!expectedSlot(label, L, p.D.features, choice)) out.push({ class: p.c.id, level: L, tableLabel: label });
        }
    }
    return out;
}

function expectedArmor(ctx, text) {
    const q = /^(.*?) \((.+)\)$/.exec(text);
    const base = q ? q[1] : text;
    const cats = new Set(entries(ctx, "equipment").filter(e => e.kind === "armor").map(e => e.data.armorCategory));
    const grants = base === "None" ? [] : base.split(", ").map(t => {
        const low = t.toLowerCase();
        if (low === "all armor") return { token: t, armorCategories: BODY_ARMOR.filter(c => cats.has(c)) };
        if (low === "shields" && cats.has("shield")) return { token: t, armorCategories: ["shield"] };
        const m = /^(\w+) armor$/.exec(low);
        if (m && BODY_ARMOR.indexOf(m[1]) >= 0 && cats.has(m[1])) return { token: t, armorCategories: [m[1]] };
        return { token: t, armorCategories: ["UNRECOGNISED"] };
    });
    return { grants: grants, qualifier: q ? q[2] : null };
}

function weaponTokenMatches(name, token) {
    const comma = /^(.+), (.+)$/.exec(name);
    const phrase = (comma ? comma[2] + " " + comma[1] : name).toLowerCase();
    return phrase + "s" === token.toLowerCase();
}

function expectedWeapons(ctx, text) {
    if (text === "None") return [];
    const weapons = entries(ctx, "equipment").filter(e => e.kind === "weapon");
    return text.split(", ").map(t => {
        const cat = /^(simple|martial) weapons$/i.exec(t);
        if (cat) return { token: t, weaponCategory: cat[1].toLowerCase() };
        const hits = weapons.filter(w => weaponTokenMatches(w.name, t));
        return { token: t, equipment: hits.length === 1 ? hits[0].id : "UNRESOLVED" };
    });
}

function expectedTools(ctx, text) {
    const tools = entries(ctx, "equipment").filter(e => e.kind === "tool");
    const groups = Array.from(new Set(tools.map(t => t.data.group).filter(Boolean)));
    const group = phrase => {
        const g = groups.filter(x => x.toLowerCase() === phrase.toLowerCase() || x.toLowerCase() + "s" === phrase.toLowerCase());
        return g.length === 1 ? g[0] : "UNRESOLVED";
    };
    if (text === "None") return { fixed: [], choice: null };
    let m = /^(\w+) (.+) of your choice$/i.exec(text);
    if (m && WORD_NUMBERS[m[1].toLowerCase()]) return { fixed: [], choice: { count: WORD_NUMBERS[m[1].toLowerCase()], groups: [group(m[2])] } };
    m = /^Choose (\w+) type of (.+) or (\w+) (.+)$/.exec(text);
    if (m && WORD_NUMBERS[m[1]] && m[1] === m[3]) return { fixed: [], choice: { count: WORD_NUMBERS[m[1]], groups: [group(m[2]), group(m[4])] } };
    return {
        fixed: text.split(", ").map(t => {
            const hit = tools.filter(x => x.name.toLowerCase() === t.toLowerCase());
            return hit.length === 1 ? hit[0].id : "UNRESOLVED";
        }),
        choice: null
    };
}

function expectedSkills(text) {
    let m = /^Choose any (\w+)$/.exec(text);
    if (m && WORD_NUMBERS[m[1]]) return { choose: WORD_NUMBERS[m[1]], from: "ANY" };
    m = /^Choose (\w+)(?: skills)? from (.+)$/.exec(text);
    if (!m || !WORD_NUMBERS[m[1]]) return { choose: -1, from: [] };
    const list = m[2].split(/, and |, | and /);
    return { choose: WORD_NUMBERS[m[1]], from: list };
}

function spellFeature(p) {
    const i = spellFeatureIndex(p.D);
    return i < 0 ? null : { index: i, f: p.D.features[i] };
}
// The facet rules check casters whose data says PRESENT. Presence itself is SPELL_PRESENCE.
function casterFeature(p) {
    return p.c.spellcasting && p.c.spellcasting.status === "PRESENT" ? spellFeature(p) : null;
}

// ---------------------------------------------------------------- rules

const RULES = [];
function rule(id, group, text, fn) {
    RULES.push({ id: id, group: group, text: text, fn: fn });
}

// Schema
rule("SCHEMA_KEYWORDS", "schema", "The schema uses only keywords this validator enforces.", (ctx, err) => {
    walkSchema(ctx.schema, node => {
        for (const k of Object.keys(node)) if (!SCHEMA_KEYWORDS.has(k)) err("unsupported schema keyword " + k);
        if (isObj(node.additionalProperties)) err("additionalProperties must be false, not a schema");
    });
});
rule("SCHEMA_STRICT", "schema", "Every object schema closes its property set (additionalProperties false).", (ctx, err) => {
    walkSchema(ctx.schema, (node, parent) => {
        const types = node.type === undefined ? [] : Array.isArray(node.type) ? node.type : [node.type];
        if (types.indexOf("object") >= 0 && node.additionalProperties !== false) err("object schema without additionalProperties false: " + JSON.stringify(Object.keys(node.properties || {})));
        if (node.properties && types.indexOf("object") < 0 && ["oneOf", "anyOf", "allOf", "not"].indexOf(parent) < 0) {
            err("properties outside a closed object schema: " + JSON.stringify(Object.keys(node.properties)));
        }
    });
});
rule("SCHEMA_VALID", "schema", "The data validates against the schema.", (ctx, err) => {
    for (const e of schemaErrors(ctx.schema, ctx.schema, ctx.data, "$", [])) err(e);
});

// Identity and ids
rule("ID_IDENTITY", "id", "Class ids and their order equal identity.js CLASS_IDS, which equals the person-identity schema enum without NONE.", (ctx, err) => {
    const ids = classes(ctx).map(c => c && c.id);
    if (!same(ids, ctx.identityIds)) err("data " + JSON.stringify(ids) + " != identity " + JSON.stringify(ctx.identityIds));
    const en = ctx.identitySchema.properties.class.properties.id.enum.filter(x => x !== "NONE");
    if (!same(en.slice().sort(), ctx.identityIds.slice().sort())) err("identity schema enum " + JSON.stringify(en) + " != identity.js");
});
rule("ID_SRD_ENTRY", "id", "Each class id names an SRD 5.1 class entry, and every SRD class entry appears once.", (ctx, err) => {
    const srd = entries(ctx, "character_options").filter(e => e.kind === "class").map(e => e.id).sort();
    const ids = classes(ctx).map(c => c && c.id);
    if (new Set(ids).size !== ids.length) err("duplicate class id");
    if (!same(ids.slice().sort(), srd)) err("class ids " + JSON.stringify(ids) + " != SRD class entries " + JSON.stringify(srd));
    for (const c of classes(ctx)) {
        const e = entry(ctx, "character_options", c.id);
        if (!e || e.kind !== "class") err(c.id + " is not an SRD class entry");
        if (!c.source || c.source.entry !== c.id) err(c.id + " source.entry is " + (c.source && c.source.entry));
    }
});

// Source parity: provenance
rule("SOURCE_HASHES", "source", "sources lists the six srd51 content files with their current content hash and PDF hash.", (ctx, err) => {
    const s = ctx.data.sources || {};
    if (!same(Object.keys(s).sort(), SOURCE_KEYS.slice().sort())) err("source keys " + JSON.stringify(Object.keys(s)));
    for (const k of SOURCE_KEYS) {
        if (!s[k]) continue;
        if (s[k].path !== SOURCE_PATHS[k]) err(k + " path " + s[k].path);
        const h = sha256(JSON.stringify(ctx.src[k]));
        if (s[k].contentSha256 !== h) err(k + " contentSha256 " + s[k].contentSha256 + " != " + h);
        if (s[k].pdfSha256 !== ctx.src[k].metadata.source.sha256) err(k + " pdfSha256 differs from the file's metadata");
    }
});
rule("SRC_TRACE", "source", "Every src resolves to an srd51 entry path whose text contains the quote (or whose JSON equals it).", (ctx, err) => {
    let n = 0;
    walk(ctx.data, (v, at) => {
        if (!isObj(v) || !Object.prototype.hasOwnProperty.call(v, "quote")) return;
        n++;
        const where = at.join(".");
        const e = ctx.src[v.file] ? entry(ctx, v.file, v.entry) : null;
        if (!e) return err(where + ": no entry " + v.file + "/" + v.entry);
        let cur = e;
        for (const k of Array.isArray(v.path) ? v.path : [null]) {
            if (cur === null || typeof cur !== "object" || !Object.prototype.hasOwnProperty.call(cur, k)) return err(where + ": path " + JSON.stringify(v.path) + " does not resolve");
            cur = cur[k];
        }
        const ok = typeof cur === "string" ? cur.indexOf(v.quote) >= 0 : JSON.stringify(cur) === v.quote;
        if (!ok) err(where + ": quote " + JSON.stringify(v.quote).slice(0, 80) + " not found at " + v.entry + " " + JSON.stringify(v.path));
    });
    if (n === 0) err("no src objects found");
});
rule("SRC_BINDING", "source", "Each src points at its own class entry and field; a src that stands for a whole field quotes it exactly.", (ctx, err) => {
    const bind = (where, sv, file, entryId, pathArr, exact, value) => {
        if (!isObj(sv)) return err(where + " has no src");
        if (sv.file !== file || sv.entry !== entryId || !same(sv.path, pathArr)) err(where + " src " + JSON.stringify([sv.file, sv.entry, sv.path]) + " != " + JSON.stringify([file, entryId, pathArr]));
        else if (exact && sv.quote !== (typeof value === "string" ? value : JSON.stringify(value))) err(where + " src quote is not the whole field");
    };
    const adv = entry(ctx, "rules", "srd:rule:beyond-1st-level");
    const ai = adv ? adv.data.tables.findIndex(t => t.caption === "Character Advancement") : -1;
    bind("characterAdvancement", (ctx.data.characterAdvancement || {}).src, "rules", "srd:rule:beyond-1st-level", ["data", "tables", ai, "caption"], true, "Character Advancement");
    for (const p of pairs(ctx)) {
        const c = p.c;
        const E = c.id;
        const pr = c.proficiencies || {};
        const hp = c.hitPoints || {};
        bind(E + " hitDie", (c.hitDie || {}).src, "character_options", E, ["data", "hitDie"], true, p.D.hitDie);
        bind(E + " hitPoints.firstLevel", (hp.firstLevel || {}).src, "character_options", E, ["data", "hitPoints", "level1"], true, p.D.hitPoints.level1);
        bind(E + " hitPoints.laterLevels", (hp.laterLevels || {}).src, "character_options", E, ["data", "hitPoints", "higher"], true, p.D.hitPoints.higher);
        bind(E + " savingThrows", (c.savingThrows || {}).src, "character_options", E, ["data", "savingThrows"], true, p.D.savingThrows);
        for (const k of ["armor", "weapons", "tools", "skills"]) bind(E + " proficiencies." + k, (pr[k] || {}).src, "character_options", E, ["data", "proficiencies", k], true, p.D.proficiencies[k]);
        bind(E + " tableSrc", c.tableSrc, "character_options", E, ["data", "classTable", "caption"], true, p.D.classTable.caption);
        const sf = casterFeature(p);
        if (!sf) continue;
        const sc = c.spellcasting;
        const text = ["data", "features", sf.index, "text"];
        bind(E + " spellcasting.abilitySrc", sc.abilitySrc, "character_options", E, text, false);
        bind(E + " spellcasting.slotRecovery", (sc.slotRecovery || {}).src, "character_options", E, text, false);
        const prep = sc.preparation || {};
        if (prep.model === "KNOWN") bind(E + " spellcasting.preparation", prep.src, "character_options", E, ["data", "features", sf.index, "subheadings"], true, sf.f.subheadings);
        else bind(E + " spellcasting.preparation", prep.src, "character_options", E, text, false);
        for (const k of ["ritualCasting", "focus"]) if ((sc[k] || {}).status === "PRESENT") bind(E + " spellcasting." + k, sc[k].src, "character_options", E, text, false);
    }
});
rule("LICENSE", "source", "license equals the SRD 5.1 license block of the source catalogue.", (ctx, err) => {
    if (!same(ctx.data.license, ctx.src.character_options.metadata.license)) err("license differs from character_options.json metadata.license");
});
rule("CLASS_META", "source", "name, pages, heading, and readiness equal the SRD entry.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const s = p.c.source || {};
        if (p.c.name !== p.e.name) err(p.c.id + " name " + p.c.name + " != " + p.e.name);
        if (s.file !== "character_options") err(p.c.id + " source.file " + s.file);
        if (!same(s.pages, p.e.source.pages)) err(p.c.id + " pages " + JSON.stringify(s.pages) + " != " + JSON.stringify(p.e.source.pages));
        if (s.heading !== p.e.source.heading) err(p.c.id + " heading " + s.heading);
        if (s.readiness !== p.e.readiness) err(p.c.id + " readiness " + s.readiness + " != " + p.e.readiness);
    }
});

// Source parity: class basics
rule("HIT_DIE", "source", "The hit die equals the SRD entry.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const m = /^1d(\d+)$/.exec(p.D.hitDie);
        const hd = p.c.hitDie || {};
        if (!m || hd.sides !== +m[1] || hd.die !== "d" + m[1]) err(p.c.id + " hit die " + JSON.stringify([hd.die, hd.sides]) + " != " + p.D.hitDie);
    }
});
rule("HIT_POINTS", "source", "Hit points equal the SRD text; the first-level base is the die size and the fixed value is the die average rounded up.", (ctx, err) => {
    const beyond = entry(ctx, "rules", "srd:rule:beyond-1st-level");
    if (!beyond || beyond.text.indexOf("which is the average result of the die roll (rounded up)") < 0) err("the rounded-up average rule is missing from srd:rule:beyond-1st-level");
    for (const p of pairs(ctx)) {
        const hp = p.c.hitPoints || {};
        const a = hp.firstLevel || {};
        const b = hp.laterLevels || {};
        const m1 = /^(\d+) \+ your (\w+) modifier$/.exec(p.D.hitPoints.level1);
        const m2 = /^(1d(\d+)) \(or (\d+)\) \+ your (\w+) modifier per (\w+) level after 1st$/.exec(p.D.hitPoints.higher);
        const sides = +(/^1d(\d+)$/.exec(p.D.hitDie) || [0, 0])[1];
        if (!m1 || a.base !== +m1[1] || a.plusModifier !== m1[2]) err(p.c.id + " first level " + JSON.stringify([a.base, a.plusModifier]) + " != " + p.D.hitPoints.level1);
        if (!m2 || b.roll !== m2[1] || b.fixed !== +m2[3] || b.plusModifier !== m2[4] || m2[5] !== shortOf(p.c.id)) err(p.c.id + " later levels " + JSON.stringify([b.roll, b.fixed, b.plusModifier]) + " != " + p.D.hitPoints.higher);
        if (a.base !== sides) err(p.c.id + " first-level base " + a.base + " is not the die size " + sides);
        if (b.fixed !== Math.ceil((sides + 1) / 2)) err(p.c.id + " fixed " + b.fixed + " is not the rounded-up average of d" + sides);
    }
});
rule("SAVING_THROWS", "source", "Saving throw proficiencies equal the SRD entry.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const got = p.c.savingThrows && p.c.savingThrows.abilities;
        if (!same(got, p.D.savingThrows)) err(p.c.id + " saves " + JSON.stringify(got) + " != " + JSON.stringify(p.D.savingThrows));
        if (!p.D.savingThrows.every(a => ABILITIES.indexOf(a) >= 0)) err(p.c.id + " source save is not an ability");
    }
});

// Completeness
rule("LEVELS_COMPLETE", "completeness", "Each class has exactly levels 1..20 in order, matching 20 SRD table rows.", (ctx, err) => {
    for (const c of classes(ctx)) {
        const lv = Array.isArray(c.levels) ? c.levels.map(l => l && l.level) : [];
        const want = Array.from({ length: 20 }, (_, i) => i + 1);
        if (!same(lv, want)) err(c.id + " levels " + JSON.stringify(lv));
    }
    for (const p of pairs(ctx)) {
        if (p.rows.length !== 20 || p.rows.some((r, i) => r[col(p, "Level")] !== nth(i + 1))) err(p.c.id + " SRD table does not list levels 1st..20th");
    }
});
rule("FEATURES_COMPLETE", "completeness", "features lists every SRD class feature with its level and source index, in source order.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const want = p.D.features.map((f, i) => ({ name: f.name, level: f.level, sourceIndex: i }));
        if (!same(p.c.features, want)) err(p.c.id + " features differ from the SRD entry (" + (Array.isArray(p.c.features) ? p.c.features.length : "none") + " vs " + want.length + ")");
    }
});
rule("FEATURES_PLACED", "completeness", "Every SRD class feature is gained by exactly one FEATURE_GAINED slot, at its own level.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const gained = [];
        for (const L of p.c.levels || []) for (const s of (L && L.features) || []) {
            if (s && s.kind === "FEATURE_GAINED") (s.refs || []).forEach(r => gained.push({ name: r, level: L.level }));
        }
        for (const f of p.D.features) {
            const at = gained.filter(g => g.name === f.name);
            if (at.length !== 1 || at[0].level !== f.level) err(p.c.id + " " + f.name + " (level " + f.level + ") gained at " + JSON.stringify(at.map(g => g.level)));
        }
        for (const g of gained) if (!p.D.features.some(f => f.name === g.name)) err(p.c.id + " gains unknown feature " + g.name);
    }
});
rule("UNAVAILABLE_REGISTRY", "completeness", "unavailableFacts lists exactly the fields marked UNAVAILABLE, per class, with the same reason.", (ctx, err) => {
    const marked = [];
    for (const c of classes(ctx)) {
        walk(c, (v, at) => {
            if (isObj(v) && v.status === "UNAVAILABLE") marked.push(c.id + "|" + at.join(".") + "|" + v.reason);
        });
    }
    const listed = [];
    for (const u of ctx.data.unavailableFacts || []) for (const id of u.classes || []) listed.push(id + "|" + u.field + "|" + u.reason);
    const a = marked.slice().sort();
    const b = listed.slice().sort();
    for (const x of a) if (b.indexOf(x) < 0) err("marked but not registered: " + x.split("|").slice(0, 2).join(" "));
    for (const x of b) if (a.indexOf(x) < 0) err("registered but not marked: " + x.split("|").slice(0, 2).join(" "));
});

// Unavailable is not none, zero, or false
rule("PRIMARY_ABILITY_UNAVAILABLE", "unavailable", "primaryAbility is UNAVAILABLE, and a case-insensitive search of all six srd51 files for its probe finds nothing.", (ctx, err) => {
    let hits = 0;
    for (const k of SOURCE_KEYS) {
        const text = String(ctx.raw[k]).toLowerCase();
        for (let i = text.indexOf(UNAVAILABLE_PROBES.primaryAbility); i >= 0; i = text.indexOf(UNAVAILABLE_PROBES.primaryAbility, i + 1)) hits++;
    }
    if (hits) err("the sources now contain '" + UNAVAILABLE_PROBES.primaryAbility + "' " + hits + " time(s); the fact is not unavailable");
    for (const c of classes(ctx)) {
        const pa = c.primaryAbility || {};
        const s = pa.search || {};
        if (pa.status !== "UNAVAILABLE") err(c.id + " primaryAbility status " + pa.status);
        if (s.pattern !== UNAVAILABLE_PROBES.primaryAbility) err(c.id + " search pattern " + JSON.stringify(s.pattern) + " is not the probe");
        if (!same((s.files || []).slice().sort(), SOURCE_KEYS.slice().sort())) err(c.id + " search files " + JSON.stringify(s.files));
        if (s.caseInsensitive !== true || s.matches !== hits) err(c.id + " search result " + s.matches + " != " + hits);
    }
});
rule("DASH_IS_NONE", "unavailable", "An em-dash table cell is null in the data (never 0), and null appears only where the table prints an em dash.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const defs = expectedClassColumns(p);
        const model = spellFeature(p) ? expectedSpellModel(p) : null;
        for (let L = 1; L <= 20; L++) {
            const row = p.rows[L - 1];
            const got = levelRow(p, L);
            if (!got) continue;
            const pairsAt = [];
            for (const d of defs) pairsAt.push([d.key, row[col(p, d.sourceColumn)], got.classColumns ? got.classColumns[d.key] : undefined]);
            if (model && isObj(got.spellcasting)) {
                const sc = got.spellcasting;
                if (col(p, "Cantrips Known") >= 0) pairsAt.push(["cantripsKnown", row[col(p, "Cantrips Known")], sc.cantripsKnown]);
                if (col(p, "Spells Known") >= 0) pairsAt.push(["spellsKnown", row[col(p, "Spells Known")], sc.spellsKnown]);
                if (model.slotModel === "PACT_SLOTS") {
                    pairsAt.push(["pactSlots.count", row[col(p, "Spell Slots")], sc.pactSlots && sc.pactSlots.count]);
                    pairsAt.push(["pactSlots.slotLevel", row[col(p, "Slot Level")], sc.pactSlots && sc.pactSlots.slotLevel]);
                } else {
                    for (let n = 1; n <= model.maxSlotLevel; n++) pairsAt.push(["slots[" + n + "]", row[col(p, "Spell Slots per Spell Level: " + nth(n))], Array.isArray(sc.slots) ? sc.slots[n - 1] : undefined]);
                }
            }
            for (const [k, raw, v] of pairsAt) {
                if (raw === DASH && v !== null) err(p.c.id + " level " + L + " " + k + ": table prints an em dash, data has " + JSON.stringify(v));
                if (raw !== DASH && v === null) err(p.c.id + " level " + L + " " + k + ": data is null, table prints " + raw);
            }
        }
    }
});

// Level progression
rule("ADVANCEMENT", "progression", "characterAdvancement equals the SRD Character Advancement table.", (ctx, err) => {
    const t = advancementTable(ctx);
    if (!t) return err("Character Advancement table missing from rules.json");
    const want = t.rows.map(r => ({ level: +r[1], experiencePoints: +r[0].replace(/,/g, ""), proficiencyBonus: cellValue("BONUS", r[2]) }));
    const got = ctx.data.characterAdvancement && ctx.data.characterAdvancement.levels;
    if (!same(got, want)) err("characterAdvancement.levels differ from the SRD table");
});
rule("PROFICIENCY_BONUS", "progression", "Each level's proficiency bonus equals the class table and the Character Advancement table.", (ctx, err) => {
    const t = advancementTable(ctx);
    for (const p of pairs(ctx)) {
        for (let L = 1; L <= 20; L++) {
            const got = levelRow(p, L);
            const fromClass = cellValue("BONUS", p.rows[L - 1][col(p, "Proficiency Bonus")]);
            const fromAdv = t ? cellValue("BONUS", t.rows[L - 1][2]) : NaN;
            if (!got || got.proficiencyBonus !== fromClass || got.proficiencyBonus !== fromAdv) err(p.c.id + " level " + L + " bonus " + (got && got.proficiencyBonus) + " (class " + fromClass + ", advancement " + fromAdv + ")");
        }
    }
});
rule("FEATURE_LABELS", "progression", "Each level's slot labels equal the SRD Features cell, in order; an em dash is an empty list.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        for (let L = 1; L <= 20; L++) {
            const got = levelRow(p, L);
            const labels = got && Array.isArray(got.features) ? got.features.map(s => s && s.label) : null;
            if (!same(labels, tableLabels(p, L))) err(p.c.id + " level " + L + " " + JSON.stringify(labels) + " != " + JSON.stringify(tableLabels(p, L)));
        }
    }
});
rule("SLOT_REFS", "progression", "Each slot's kind, refs, and detail follow from the SRD feature texts (gained, advanced where the text names the level, improved, subclass).", (ctx, err) => {
    const disc = ctx.data.sourceDiscrepancies || [];
    for (const p of pairs(ctx)) {
        const choice = subclassChoice(ctx, p).feature;
        for (const L of p.c.levels || []) {
            for (const s of (L && L.features) || []) {
                if (!isObj(s)) continue;
                let want = expectedSlot(s.label, L.level, p.D.features, choice);
                if (!want) {
                    const d = disc.find(x => x.class === p.c.id && x.level === L.level && x.tableLabel === s.label);
                    if (!d) {
                        err(p.c.id + " level " + L.level + " " + s.label + " names no feature");
                        continue;
                    }
                    want = { kind: "FEATURE_GAINED", refs: [d.featureName] };
                }
                if (s.kind !== want.kind || !same(s.refs, want.refs) || s.detail !== want.detail) {
                    err(p.c.id + " level " + L.level + " " + s.label + ": " + JSON.stringify([s.kind, s.refs, s.detail]) + " != " + JSON.stringify([want.kind, want.refs, want.detail]));
                }
                for (const r of s.refs || []) if (!p.D.features.some(f => f.name === r)) err(p.c.id + " level " + L.level + " refers to unknown feature " + r);
            }
        }
    }
});
rule("SOURCE_DISCREPANCIES", "progression", "sourceDiscrepancies lists exactly the table labels that name no feature, each tied to a feature gained at that level whose name extends the label.", (ctx, err) => {
    const need = unresolvedLabels(ctx).map(u => u.class + "|" + u.level + "|" + u.tableLabel).sort();
    const disc = ctx.data.sourceDiscrepancies || [];
    const have = disc.map(d => d.class + "|" + d.level + "|" + d.tableLabel).sort();
    if (!same(need, have)) err("needed " + JSON.stringify(need) + ", recorded " + JSON.stringify(have));
    for (const d of disc) {
        const e = entry(ctx, "character_options", d.class);
        const f = e && e.data.features.find(x => x.name === d.featureName);
        if (!f || f.level !== d.level || f.name.indexOf(d.tableLabel) !== 0) err(d.class + " discrepancy " + d.tableLabel + " -> " + d.featureName + " is not a near-identical feature gained at level " + d.level);
    }
});
rule("CLASS_COLUMNS", "progression", "Class-specific table columns are declared with their inferred type, and each level's values parse from the table cell.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const defs = expectedClassColumns(p);
        if (!same(p.c.classColumns, defs)) err(p.c.id + " classColumns " + JSON.stringify(p.c.classColumns) + " != " + JSON.stringify(defs));
        for (let L = 1; L <= 20; L++) {
            const got = levelRow(p, L);
            const want = {};
            for (const d of defs) want[d.key] = cell(d.valueType, p.rows[L - 1][col(p, d.sourceColumn)]).value;
            if (!got || !same(got.classColumns, want)) err(p.c.id + " level " + L + " " + JSON.stringify(got && got.classColumns) + " != " + JSON.stringify(want));
        }
    }
});
rule("SUBCLASS_PROGRESSION", "progression", "The subclass choice feature, its level, the subclass feature levels, and the SRD subclass ids follow from the sources.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const sc = p.c.subclass || {};
        const ch = subclassChoice(ctx, p);
        if (!ch.feature) {
            err(p.c.id + " SRD subclass choice feature not found");
            continue;
        }
        if (sc.choiceFeature !== ch.feature.name) err(p.c.id + " choiceFeature " + sc.choiceFeature + " != " + ch.feature.name);
        if (sc.choiceLevel !== ch.feature.level || ch.subs.some(s => s.data.gainedAtLevel !== ch.feature.level)) err(p.c.id + " choiceLevel " + sc.choiceLevel + " != " + ch.feature.level);
        const levels = [ch.feature.level];
        for (let L = 1; L <= 20; L++) {
            if (tableLabels(p, L).some(l => { const x = expectedSlot(l, L, p.D.features, ch.feature); return x && x.kind === "SUBCLASS_FEATURE"; })) levels.push(L);
        }
        if (!same(sc.featureLevels, levels)) err(p.c.id + " featureLevels " + JSON.stringify(sc.featureLevels) + " != " + JSON.stringify(levels));
        const ids = ch.subs.map(s => s.id);
        if (!same(sc.srdSubclasses, ids)) err(p.c.id + " srdSubclasses " + JSON.stringify(sc.srdSubclasses) + " != SRD " + JSON.stringify(ids));
    }
});

// Spellcasting
rule("SPELL_PRESENCE", "spellcasting", "Spellcasting is PRESENT exactly for classes with a Spellcasting or Pact Magic feature (name, index, level), otherwise NONE with null per-level data.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const sf = spellFeature(p);
        const sc = p.c.spellcasting || {};
        const perLevel = (p.c.levels || []).map(l => l && l.spellcasting);
        if (!sf) {
            if (!same(sc, { status: "NONE", basis: "NO_SPELLCASTING_FEATURE" })) err(p.c.id + " has no spellcasting feature but spellcasting is " + JSON.stringify(sc).slice(0, 60));
            if (perLevel.some(x => x !== null)) err(p.c.id + " has per-level spellcasting without a spellcasting feature");
        } else {
            if (sc.status !== "PRESENT" || sc.feature !== sf.f.name || sc.featureIndex !== sf.index || sc.gainedAtLevel !== sf.f.level) {
                err(p.c.id + " spellcasting " + JSON.stringify([sc.status, sc.feature, sc.featureIndex, sc.gainedAtLevel]) + " != " + JSON.stringify(["PRESENT", sf.f.name, sf.index, sf.f.level]));
            }
            if (perLevel.some(x => !isObj(x))) err(p.c.id + " is missing per-level spellcasting");
        }
    }
});
rule("SPELL_START", "spellcasting", "No level before the spellcasting feature has any spellcasting value, and the feature's level has at least one slot.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const sc = p.c.spellcasting;
        if (!sc || sc.status !== "PRESENT") continue;
        for (const L of p.c.levels || []) {
            const x = L && L.spellcasting;
            if (!isObj(x)) continue;
            const vals = [x.cantripsKnown, x.spellsKnown].concat(Array.isArray(x.slots) ? x.slots : []).concat(x.pactSlots ? [x.pactSlots.count] : []);
            const any = vals.some(v => typeof v === "number" && v > 0);
            const slots = (Array.isArray(x.slots) ? x.slots : []).concat(x.pactSlots ? [x.pactSlots.count] : []).some(v => typeof v === "number" && v > 0);
            if (L.level < sc.gainedAtLevel && any) err(p.c.id + " has spellcasting values at level " + L.level + " before gaining " + sc.feature + " at " + sc.gainedAtLevel);
            if (L.level === sc.gainedAtLevel && !slots) err(p.c.id + " has no slot at level " + L.level + " where it gains " + sc.feature);
        }
    }
});
rule("SPELL_ABILITY", "spellcasting", "The spellcasting ability is the one the feature text names for this class's spells.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const sf = casterFeature(p);
        if (!sf) continue;
        const m = /(\w+) is your spellcasting ability for your (\w+) spells/.exec(sf.f.text);
        const sc = p.c.spellcasting || {};
        if (!m || m[2] !== shortOf(p.c.id) || sc.ability !== m[1]) err(p.c.id + " ability " + sc.ability + " != " + (m && m[1]));
        const q = sc.abilitySrc && sc.abilitySrc.quote;
        if (typeof q !== "string" || q.indexOf(sc.ability + " is your spellcasting ability") !== 0) err(p.c.id + " abilitySrc quote does not state " + sc.ability);
    }
});
rule("SPELL_LIST", "spellcasting", "Each caster names the one SRD spell list for its class; the SRD has no spell list for a non-caster.", (ctx, err) => {
    const lists = entries(ctx, "spells").filter(e => e.kind === "spell-list");
    for (const p of pairs(ctx)) {
        const short = shortOf(p.c.id);
        const mine = lists.filter(l => l.data.class === short);
        const sc = p.c.spellcasting || {};
        if (spellFeature(p)) {
            if (sc.status !== "PRESENT") continue;
            if (mine.length !== 1 || sc.spellList !== mine[0].id) err(p.c.id + " spellList " + sc.spellList + " != " + JSON.stringify(mine.map(l => l.id)));
        } else if (mine.length) err(p.c.id + " is not a caster but the SRD has " + mine[0].id);
    }
});
rule("SPELL_MODEL", "spellcasting", "slotModel, maxSlotLevel, and progressionColumns follow from the class table columns.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        if (!casterFeature(p)) continue;
        const want = expectedSpellModel(p);
        const sc = p.c.spellcasting || {};
        const got = { slotModel: sc.slotModel, maxSlotLevel: sc.maxSlotLevel, progressionColumns: sc.progressionColumns };
        if (!same(got, want)) err(p.c.id + " " + JSON.stringify(got) + " != " + JSON.stringify(want));
    }
});
rule("SPELL_PROGRESSION", "spellcasting", "Each level's cantrips known, spells known, and slots equal the class table, with exactly the table's columns.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        if (!casterFeature(p)) continue;
        for (let L = 1; L <= 20; L++) {
            const got = levelRow(p, L);
            const want = expectedLevelSpellcasting(p, p.rows[L - 1]);
            if (!got || !same(got.spellcasting, want)) err(p.c.id + " level " + L + " " + JSON.stringify(got && got.spellcasting) + " != " + JSON.stringify(want));
        }
    }
});
rule("SPELL_PREPARATION", "spellcasting", "PREPARED classes carry the preparation formula from the text; KNOWN classes have the Spells Known subsection.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const sf = casterFeature(p);
        if (!sf) continue;
        const prep = (p.c.spellcasting || {}).preparation || {};
        const subs = sf.f.subheadings;
        if (subs.indexOf("Preparing and Casting Spells") >= 0) {
            const m = /equal to your (\w+) modifier \+ (half )?your (\w+) level(, rounded down)? \(minimum of (one) spell\)/.exec(sf.f.text);
            const want = m ? { model: "PREPARED", ability: m[1], classLevel: m[2] ? (m[4] ? "HALF_ROUNDED_DOWN" : "HALF") : "FULL", minimum: WORD_NUMBERS[m[5]] } : null;
            const got = { model: prep.model, ability: prep.ability, classLevel: prep.classLevel, minimum: prep.minimum };
            if (!want || m[3] !== shortOf(p.c.id) || !same(got, want)) err(p.c.id + " preparation " + JSON.stringify(got) + " != " + JSON.stringify(want));
        } else if (subs.indexOf("Spells Known of 1st Level and Higher") >= 0) {
            if (prep.model !== "KNOWN" || Object.keys(prep).sort().join() !== "model,src") err(p.c.id + " preparation " + JSON.stringify(prep).slice(0, 80) + " != KNOWN");
        } else err(p.c.id + " feature has neither a preparation nor a spells-known subsection");
    }
});
rule("SPELL_RECOVERY", "spellcasting", "Slot recovery is the rest the feature text names.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const sf = casterFeature(p);
        if (!sf) continue;
        const m = /regain all expended spell slots when you finish a (short or long|long) rest/.exec(sf.f.text);
        const want = m ? (m[1] === "long" ? "LONG_REST" : "SHORT_OR_LONG_REST") : null;
        const got = ((p.c.spellcasting || {}).slotRecovery || {}).rest;
        if (got !== want) err(p.c.id + " slotRecovery " + got + " != " + want);
    }
});
rule("SPELL_RITUAL", "spellcasting", "Ritual casting is PRESENT only with a Ritual Casting subsection, with the spell source its sentence names; otherwise NONE.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const sf = casterFeature(p);
        if (!sf) continue;
        const got = (p.c.spellcasting || {}).ritualCasting || {};
        let want = { status: "NONE", basis: "NO_RITUAL_CASTING_SUBSECTION" };
        if (sf.f.subheadings.indexOf("Ritual Casting") >= 0) {
            const para = sf.f.text.split("Ritual Casting\n\n")[1].split("\n")[0];
            const source = /spell you know as a ritual/.test(para) ? "KNOWN" : /have the spell in your spellbook/.test(para) ? "IN_SPELLBOOK" : /have the spell prepared/.test(para) ? "PREPARED" : "UNRECOGNISED";
            want = { status: "PRESENT", spellSource: source };
        }
        const cmp = got.status === "PRESENT" ? { status: got.status, spellSource: got.spellSource } : got;
        if (!same(cmp, want)) err(p.c.id + " ritualCasting " + JSON.stringify(cmp) + " != " + JSON.stringify(want));
    }
});
rule("SPELL_FOCUS", "spellcasting", "A spellcasting focus is PRESENT only with a Spellcasting Focus subsection, naming its item; otherwise NONE.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const sf = casterFeature(p);
        if (!sf) continue;
        const got = (p.c.spellcasting || {}).focus || {};
        let want = { status: "NONE", basis: "NO_SPELLCASTING_FOCUS_SUBSECTION" };
        if (sf.f.subheadings.indexOf("Spellcasting Focus") >= 0) {
            const para = sf.f.text.split("Spellcasting Focus\n\n")[1].split("\n")[0];
            const m = /^You can use an? (.+?)(?: \(see “Equipment”\))? as a spellcasting focus/.exec(para);
            want = { status: "PRESENT", item: m ? m[1] : "UNRECOGNISED" };
        }
        const cmp = got.status === "PRESENT" ? { status: got.status, item: got.item } : got;
        if (!same(cmp, want)) err(p.c.id + " focus " + JSON.stringify(cmp) + " != " + JSON.stringify(want));
    }
});

// Proficiencies
rule("PROF_ARMOR", "proficiency", "Armor proficiencies equal the SRD text: each token maps to equipment armor categories; 'None' is an empty list; a parenthetical is kept as the qualifier.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const got = (p.c.proficiencies || {}).armor || {};
        const want = expectedArmor(ctx, p.D.proficiencies.armor);
        if (!same({ grants: got.grants, qualifier: got.qualifier }, want)) err(p.c.id + " armor " + JSON.stringify([got.grants, got.qualifier]) + " != " + JSON.stringify([want.grants, want.qualifier]));
    }
});
rule("PROF_WEAPONS", "proficiency", "Weapon proficiencies equal the SRD text: categories, or named weapons resolved to SRD weapon ids.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const got = ((p.c.proficiencies || {}).weapons || {}).grants;
        const want = expectedWeapons(ctx, p.D.proficiencies.weapons);
        if (!same(got, want)) err(p.c.id + " weapons " + JSON.stringify(got) + " != " + JSON.stringify(want));
    }
});
rule("PROF_TOOLS", "proficiency", "Tool proficiencies equal the SRD text: fixed SRD tool ids, or a choice of a count from SRD tool groups.", (ctx, err) => {
    for (const p of pairs(ctx)) {
        const t = (p.c.proficiencies || {}).tools || {};
        const want = expectedTools(ctx, p.D.proficiencies.tools);
        if (!same({ fixed: t.fixed, choice: t.choice }, want)) err(p.c.id + " tools " + JSON.stringify([t.fixed, t.choice]) + " != " + JSON.stringify([want.fixed, want.choice]));
    }
});
rule("PROF_SKILLS", "proficiency", "Skill proficiencies equal the SRD text, and every named skill is in the SRD skill list.", (ctx, err) => {
    const list = skillsText(ctx);
    for (const p of pairs(ctx)) {
        const s = (p.c.proficiencies || {}).skills || {};
        const want = expectedSkills(p.D.proficiencies.skills);
        if (!same({ choose: s.choose, from: s.from }, want)) err(p.c.id + " skills " + JSON.stringify([s.choose, s.from]) + " != " + JSON.stringify([want.choose, want.from]));
        if (Array.isArray(s.from)) for (const k of s.from) if (list.indexOf("• " + k) < 0) err(p.c.id + " skill " + k + " is not in the SRD skill list");
    }
});

// No race-class locks (DEC-036)
rule("RACE_POLICY", "no-lock", "raceClassPolicy is NO_LOCKS under DEC-036 and lists exactly the SRD races; DEC-036 in OWNER_DECISIONS.md states the no-lock rule.", (ctx, err) => {
    const pol = ctx.data.raceClassPolicy || {};
    const races = entries(ctx, "character_options").filter(e => e.kind === "race").map(e => e.id);
    if (pol.rule !== "NO_LOCKS" || pol.decision !== "DEC-036") err("policy " + JSON.stringify([pol.rule, pol.decision]));
    if (!same(pol.races, races)) err("races " + JSON.stringify(pol.races) + " != SRD " + JSON.stringify(races));
    const dec = /### Decision `DEC-036`:[^\n]*No Race-Class Locks[\s\S]*?Every race can take every class without exception/.test(ctx.decisions);
    if (!dec) err("docs/OWNER_DECISIONS.md does not state DEC-036 'No Race-Class Locks'");
});
rule("NO_RACE_LOCKS", "no-lock", "Outside raceClassPolicy, no key reads as an eligibility condition and no value names a race or subrace, so all race-class pairs stay legal.", (ctx, err) => {
    const kin = entries(ctx, "character_options").filter(e => e.kind === "race" || e.kind === "subrace");
    const words = new Set();
    for (const e of kin) {
        const n = e.name.toLowerCase();
        words.add(n);
        words.add(n + "s");
        if (/f$/.test(n)) words.add(n.replace(/f$/, "ves"));
    }
    const wordRe = new RegExp("(^|[^a-z-])(" + Array.from(words).map(w => w.replace(/[-]/g, "\\-")).join("|") + ")($|[^a-z-])", "i");
    const body = Object.assign({}, ctx.data);
    delete body.raceClassPolicy;
    walk(body, (v, at) => {
        const last = at[at.length - 1];
        if (typeof last === "string" && LOCK_KEY.test(last)) err("key " + at.join(".") + " reads as an eligibility condition");
        if (typeof v === "string" && /srd:(sub)?race:/.test(v)) err(at.join(".") + " names a race id");
        else if (typeof v === "string" && wordRe.test(v)) err(at.join(".") + " names a race: " + JSON.stringify(v).slice(0, 60));
    });
});
rule("NO_AFFINITY", "no-lock", "The class data carries no affinity, weight, or favouring values; those belong to SOC.11.02.", (ctx, err) => {
    walk(ctx.data, (v, at) => {
        const last = at[at.length - 1];
        if (typeof last === "string" && AFFINITY_KEY.test(last)) err("key " + at.join(".") + " is affinity or weighting data");
    });
});

// Documentation
rule("DOC_SUMMARY", "doc", "The class summary table in docs/systems/DEUS_SRD_Classes.md equals the data.", (ctx, err) => {
    const rows = ctx.doc.split("\n").filter(l => /^\| `srd:class:/.test(l)).map(l => l.split("|").slice(1, -1).map(x => x.trim()));
    if (rows.length !== classes(ctx).length) err("doc has " + rows.length + " class rows, data has " + classes(ctx).length);
    for (const c of classes(ctx)) {
        const r = rows.find(x => x[0] === "`" + c.id + "`");
        if (!r) {
            err("doc has no row for " + c.id);
            continue;
        }
        const sc = c.spellcasting || {};
        const want = [
            "`" + c.id + "`", c.name, (c.hitDie || {}).die, ((c.savingThrows || {}).abilities || []).join(", "),
            sc.status === "PRESENT" ? sc.ability : "NONE",
            sc.status === "PRESENT" ? sc.slotModel + " " + sc.maxSlotLevel : "NONE",
            sc.status === "PRESENT" ? sc.preparation.model : "NONE",
            (c.subclass || {}).choiceFeature + " (" + (c.subclass || {}).choiceLevel + ")"
        ];
        if (!same(r, want)) err("doc row " + JSON.stringify(r) + " != " + JSON.stringify(want));
    }
});
rule("DOC_RULES", "doc", "The doc's rule table lists exactly the validator's rules.", (ctx, err) => {
    const sec = ctx.doc.split(/\n## /).find(s => /^Validator rules/.test(s)) || "";
    const ids = sec.split("\n").map(l => /^\| `([A-Z_]+)` \|/.exec(l)).filter(Boolean).map(m => m[1]);
    const want = RULES.map(r => r.id);
    for (const id of want) if (ids.indexOf(id) < 0) err("doc does not list rule " + id);
    for (const id of ids) if (want.indexOf(id) < 0) err("doc lists unknown rule " + id);
});

function validate(ctx) {
    return RULES.map(r => {
        const errors = [];
        try {
            r.fn(ctx, m => errors.push(m));
        } catch (e) {
            errors.push("threw: " + e.message);
        }
        return { id: r.id, errors: errors };
    });
}

// ---------------------------------------------------------------- negative fixtures

function C(ctx, short) {
    return ctx.data.classes.find(c => c.id === "srd:class:" + short);
}
function lv(ctx, short, level) {
    return C(ctx, short).levels[level - 1];
}

// Each fixture changes one fact. `also` lists every other rule the change must trip.
const FIXTURES = [
    // schema
    { name: "schema_unsupported_keyword", target: "SCHEMA_KEYWORDS", also: [], mutate: c => { c.schema.$defs.level.format = "int32"; } },
    { name: "schema_additional_properties_schema", target: "SCHEMA_KEYWORDS", also: ["SCHEMA_STRICT"], mutate: c => { c.schema.$defs.slot.additionalProperties = { type: "string" }; } },
    { name: "schema_open_object", target: "SCHEMA_STRICT", also: [], mutate: c => { delete c.schema.$defs.class.properties.hitDie.additionalProperties; } },
    { name: "data_extra_class_key", target: "SCHEMA_VALID", also: [], mutate: c => { C(c, "fighter").balanceNote = "TEST_invented"; } },
    { name: "data_wrong_type", target: "SCHEMA_VALID", also: ["HIT_DIE"], mutate: c => { C(c, "rogue").hitDie.sides = "8"; } },
    { name: "data_missing_required", target: "SCHEMA_VALID", also: ["SAVING_THROWS", "SRC_BINDING", "DOC_SUMMARY"], mutate: c => { delete C(c, "monk").savingThrows; } },
    { name: "data_detail_on_subclass_slot", target: "SCHEMA_VALID", also: ["SLOT_REFS"], mutate: c => { lv(c, "barbarian", 6).features[0].detail = "TEST"; } },
    // ids
    { name: "id_renamed_class", target: "ID_IDENTITY", also: ["ID_SRD_ENTRY", "SCHEMA_VALID", "DOC_SUMMARY", "UNAVAILABLE_REGISTRY"], mutate: c => { const x = C(c, "rogue"); x.id = "srd:class:thief"; x.source.entry = "srd:class:thief"; } },
    { name: "id_order_swapped", target: "ID_IDENTITY", also: [], mutate: c => { const a = c.data.classes; const t = a[0]; a[0] = a[1]; a[1] = t; } },
    { name: "id_identity_module_drift", target: "ID_IDENTITY", also: [], mutate: c => { c.identityIds.push("srd:class:artificer"); } },
    { name: "id_source_entry_points_elsewhere", target: "ID_SRD_ENTRY", also: [], mutate: c => { C(c, "bard").source.entry = "srd:class:cleric"; } },
    { name: "id_srd_gains_a_class", target: "ID_SRD_ENTRY", also: ["SOURCE_HASHES"], touches: ["src:character_options"], mutate: c => {
        const e = clone(c.src.character_options.entries.find(x => x.id === "srd:class:bard")); e.id = "srd:class:bard2"; c.src.character_options.entries.push(e);
    } },
    // provenance
    { name: "source_hash_stale", target: "SOURCE_HASHES", also: [], mutate: c => { c.data.sources.rules.contentSha256 = "0".repeat(64); } },
    { name: "source_file_changed", target: "SOURCE_HASHES", also: [], touches: ["src:equipment"], mutate: c => { c.src.equipment.entries[0].name = "TEST_changed"; } },
    { name: "trace_quote_not_in_source", target: "SRC_TRACE", also: ["SRC_BINDING"], mutate: c => { C(c, "druid").proficiencies.tools.src.quote = "Herbalism kit, poisoner's kit"; } },
    { name: "trace_sentence_invented", target: "SRC_TRACE", also: [], mutate: c => { C(c, "bard").spellcasting.abilitySrc.quote = "Charisma is your spellcasting ability for your bard songs"; } },
    { name: "trace_path_dangling", target: "SRC_TRACE", also: ["SRC_BINDING"], mutate: c => { C(c, "cleric").hitDie.src.path = ["data", "hitDice"]; } },
    { name: "src_bound_to_other_class", target: "SRC_BINDING", also: [], mutate: c => { const t = C(c, "wizard").tableSrc; t.entry = "srd:class:sorcerer"; t.quote = "The Sorcerer"; } },
    { name: "src_bound_to_other_field", target: "SRC_BINDING", also: [], mutate: c => { const t = C(c, "cleric").hitDie.src; t.path = ["dice", 0, "text"]; } },
    { name: "src_partial_quote", target: "SRC_BINDING", also: [], mutate: c => { C(c, "bard").proficiencies.weapons.src.quote = "Simple weapons"; } },
    { name: "license_attribution_dropped", target: "LICENSE", also: [], mutate: c => { c.data.license.attribution = "SRD"; } },
    { name: "class_readiness_upgraded", target: "CLASS_META", also: [], mutate: c => { C(c, "wizard").source.readiness = "verified"; } },
    { name: "class_pages_wrong", target: "CLASS_META", also: [], mutate: c => { C(c, "monk").source.pages = [26, 27]; } },
    // class basics
    { name: "hit_die_d10_barbarian", target: "HIT_DIE", also: ["DOC_SUMMARY"], mutate: c => { const h = C(c, "barbarian").hitDie; h.die = "d10"; h.sides = 10; } },
    { name: "hit_points_fixed_rounded_down", target: "HIT_POINTS", also: [], mutate: c => { C(c, "wizard").hitPoints.laterLevels.fixed = 3; } },
    { name: "saving_throws_swapped", target: "SAVING_THROWS", also: ["DOC_SUMMARY"], mutate: c => { C(c, "cleric").savingThrows.abilities = ["Wisdom", "Constitution"]; } },
    // completeness
    { name: "levels_level_20_missing", target: "LEVELS_COMPLETE", also: ["SCHEMA_VALID", "PROFICIENCY_BONUS", "FEATURE_LABELS", "CLASS_COLUMNS", "FEATURES_PLACED"],
        mutate: c => { C(c, "barbarian").levels.pop(); } },
    { name: "features_list_missing_one", target: "FEATURES_COMPLETE", also: [], mutate: c => { C(c, "sorcerer").features.splice(2, 1); } },
    { name: "features_gained_twice", target: "FEATURES_PLACED", also: ["SLOT_REFS"], mutate: c => { lv(c, "rogue", 6).features[0].kind = "FEATURE_GAINED"; } },
    { name: "features_rage_not_gained", target: "FEATURES_PLACED", also: ["SLOT_REFS"], mutate: c => { lv(c, "barbarian", 1).features[0].kind = "FEATURE_ADVANCED"; } },
    { name: "unavailable_not_registered", target: "UNAVAILABLE_REGISTRY", also: [], mutate: c => { c.data.unavailableFacts[0].classes.pop(); } },
    // unavailable is not none/zero/false
    { name: "unavailable_fact_now_in_source", target: "PRIMARY_ABILITY_UNAVAILABLE", also: [], mutate: c => { c.raw.character_options += "\nPrimary Ability: Strength"; } },
    { name: "unavailable_probe_weakened", target: "PRIMARY_ABILITY_UNAVAILABLE", also: [], mutate: c => { C(c, "fighter").primaryAbility.search.pattern = "zz primary"; } },
    { name: "unavailable_claimed_as_value", target: "PRIMARY_ABILITY_UNAVAILABLE", also: ["SCHEMA_VALID", "UNAVAILABLE_REGISTRY"],
        mutate: c => { C(c, "fighter").primaryAbility = { status: "PRESENT", abilities: ["Strength"] }; } },
    { name: "dash_as_zero_ki", target: "DASH_IS_NONE", also: ["CLASS_COLUMNS"], mutate: c => { lv(c, "monk", 1).classColumns.kiPoints = 0; } },
    { name: "dash_as_zero_slot", target: "DASH_IS_NONE", also: ["SPELL_PROGRESSION"], mutate: c => { lv(c, "wizard", 1).spellcasting.slots[1] = 0; } },
    { name: "value_as_null", target: "DASH_IS_NONE", also: ["CLASS_COLUMNS"], mutate: c => { lv(c, "sorcerer", 2).classColumns.sorceryPoints = null; } },
    // progression
    { name: "advancement_xp_changed", target: "ADVANCEMENT", also: [], mutate: c => { c.data.characterAdvancement.levels[1].experiencePoints = 250; } },
    { name: "proficiency_bonus_level_5", target: "PROFICIENCY_BONUS", also: [], mutate: c => { lv(c, "paladin", 5).proficiencyBonus = 2; } },
    { name: "proficiency_bonus_table_drift", target: "PROFICIENCY_BONUS", also: ["ADVANCEMENT", "SOURCE_HASHES"], touches: ["src:rules"],
        mutate: c => { c.src.rules.entries.find(e => e.id === "srd:rule:beyond-1st-level").data.tables[0].rows[4][2] = "+2"; } },
    { name: "labels_invented_slot", target: "FEATURE_LABELS", also: ["SLOT_REFS"], mutate: c => { lv(c, "barbarian", 11).features.push({ label: "Extra Attack", kind: "FEATURE_ADVANCED", refs: ["Extra Attack"] }); } },
    { name: "labels_emptied_level", target: "FEATURE_LABELS", also: ["FEATURES_PLACED"], mutate: c => { lv(c, "cleric", 2).features = []; } },
    { name: "slot_wrong_kind", target: "SLOT_REFS", also: [], mutate: c => { lv(c, "druid", 4).features[0].kind = "FEATURE_ADVANCED"; } },
    { name: "slot_ref_not_named_by_text", target: "SLOT_REFS", also: [], mutate: c => { lv(c, "paladin", 18).features[0].refs = ["Aura of Protection", "Divine Health"]; } },
    { name: "slot_detail_dropped", target: "SLOT_REFS", also: [], mutate: c => { delete lv(c, "fighter", 13).features[0].detail; } },
    { name: "discrepancy_record_removed", target: "SOURCE_DISCREPANCIES", also: ["SLOT_REFS"], mutate: c => { c.data.sourceDiscrepancies = []; } },
    { name: "discrepancy_record_invented", target: "SOURCE_DISCREPANCIES", also: [], mutate: c => {
        c.data.sourceDiscrepancies.push({ class: "srd:class:fighter", level: 20, tableLabel: "Extra Attack (3)", featureName: "Extra Attack", note: "TEST" });
    } },
    { name: "class_column_rages_capped", target: "CLASS_COLUMNS", also: [], mutate: c => { lv(c, "barbarian", 20).classColumns.rages = 6; } },
    { name: "class_column_type_changed", target: "CLASS_COLUMNS", also: [], mutate: c => { C(c, "rogue").classColumns[0].valueType = "COUNT"; } },
    { name: "subclass_level_dropped", target: "SUBCLASS_PROGRESSION", also: [], mutate: c => { C(c, "barbarian").subclass.featureLevels.pop(); } },
    { name: "subclass_invented", target: "SUBCLASS_PROGRESSION", also: [], mutate: c => { C(c, "barbarian").subclass.srdSubclasses.push("srd:subclass:path-of-the-totem-warrior"); } },
    // spellcasting
    { name: "spell_barbarian_casts", target: "SPELL_PRESENCE", also: ["SCHEMA_VALID", "DOC_SUMMARY"], mutate: c => { C(c, "barbarian").spellcasting = { status: "PRESENT" }; } },
    { name: "spell_wizard_none", target: "SPELL_PRESENCE", also: ["DOC_SUMMARY"], mutate: c => { C(c, "wizard").spellcasting = { status: "NONE", basis: "NO_SPELLCASTING_FEATURE" }; } },
    { name: "spell_start_moved", target: "SPELL_START", also: ["SPELL_PRESENCE"], mutate: c => { C(c, "paladin").spellcasting.gainedAtLevel = 3; } },
    { name: "spell_ability_wrong", target: "SPELL_ABILITY", also: ["DOC_SUMMARY"], mutate: c => { C(c, "cleric").spellcasting.ability = "Charisma"; } },
    { name: "spell_list_swapped", target: "SPELL_LIST", also: [], mutate: c => { C(c, "wizard").spellcasting.spellList = "srd:spell-list:sorcerer-spells"; } },
    { name: "spell_model_warlock_standard", target: "SPELL_MODEL", also: ["DOC_SUMMARY"], mutate: c => { C(c, "warlock").spellcasting.slotModel = "SPELL_LEVEL_SLOTS"; } },
    { name: "spell_model_paladin_nine", target: "SPELL_MODEL", also: ["DOC_SUMMARY"], mutate: c => { C(c, "paladin").spellcasting.maxSlotLevel = 9; } },
    { name: "spell_slot_changed", target: "SPELL_PROGRESSION", also: [], mutate: c => { lv(c, "bard", 20).spellcasting.slots[8] = 2; } },
    { name: "spell_cantrips_invented", target: "SPELL_PROGRESSION", also: [], mutate: c => { lv(c, "paladin", 5).spellcasting.cantripsKnown = 2; } },
    { name: "spell_prepared_full_level", target: "SPELL_PREPARATION", also: [], mutate: c => { C(c, "paladin").spellcasting.preparation.classLevel = "FULL"; } },
    { name: "spell_known_as_prepared", target: "SPELL_PREPARATION", also: ["DOC_SUMMARY", "SCHEMA_VALID", "SRC_BINDING"], mutate: c => { C(c, "sorcerer").spellcasting.preparation.model = "PREPARED"; } },
    { name: "spell_recovery_long", target: "SPELL_RECOVERY", also: [], mutate: c => { C(c, "warlock").spellcasting.slotRecovery.rest = "LONG_REST"; } },
    { name: "spell_ritual_invented", target: "SPELL_RITUAL", also: ["SRC_BINDING"], mutate: c => {
        C(c, "sorcerer").spellcasting.ritualCasting = { status: "PRESENT", spellSource: "KNOWN", src: clone(C(c, "bard").spellcasting.ritualCasting.src) };
    } },
    { name: "spell_ritual_source", target: "SPELL_RITUAL", also: [], mutate: c => { C(c, "wizard").spellcasting.ritualCasting.spellSource = "PREPARED"; } },
    { name: "spell_focus_invented", target: "SPELL_FOCUS", also: ["SRC_BINDING"], mutate: c => { C(c, "ranger").spellcasting.focus = clone(C(c, "druid").spellcasting.focus); } },
    // proficiencies
    { name: "armor_wizard_light", target: "PROF_ARMOR", also: [], mutate: c => { C(c, "wizard").proficiencies.armor.grants.push({ token: "Light armor", armorCategories: ["light"] }); } },
    { name: "armor_all_without_heavy", target: "PROF_ARMOR", also: [], mutate: c => { C(c, "fighter").proficiencies.armor.grants[0].armorCategories = ["light", "medium"]; } },
    { name: "armor_druid_qualifier_dropped", target: "PROF_ARMOR", also: [], mutate: c => { C(c, "druid").proficiencies.armor.qualifier = null; } },
    { name: "armor_none_as_null", target: "PROF_ARMOR", also: ["SCHEMA_VALID"], mutate: c => { C(c, "monk").proficiencies.armor.grants = null; } },
    { name: "weapons_monk_martial", target: "PROF_WEAPONS", also: [], mutate: c => { C(c, "monk").proficiencies.weapons.grants.push({ token: "martial weapons", weaponCategory: "martial" }); } },
    { name: "weapons_wrong_equipment", target: "PROF_WEAPONS", also: [], mutate: c => { C(c, "bard").proficiencies.weapons.grants[1].equipment = "srd:weapon:crossbow-light"; } },
    { name: "tools_rogue_dropped", target: "PROF_TOOLS", also: [], mutate: c => { C(c, "rogue").proficiencies.tools.fixed = []; } },
    { name: "tools_choice_count", target: "PROF_TOOLS", also: [], mutate: c => { C(c, "bard").proficiencies.tools.choice.count = 1; } },
    { name: "skills_count", target: "PROF_SKILLS", also: [], mutate: c => { C(c, "rogue").proficiencies.skills.choose = 3; } },
    { name: "skills_not_srd", target: "PROF_SKILLS", also: [], mutate: c => { C(c, "cleric").proficiencies.skills.from.push("Alchemy"); } },
    // no-lock
    { name: "race_policy_race_dropped", target: "RACE_POLICY", also: [], mutate: c => { c.data.raceClassPolicy.races.pop(); } },
    { name: "race_policy_decision_missing", target: "RACE_POLICY", also: [], mutate: c => { c.decisions = c.decisions.replace("No Race-Class Locks", "Race-Class Locks"); } },
    { name: "race_lock_key", target: "NO_RACE_LOCKS", also: ["SCHEMA_VALID"], mutate: c => { C(c, "paladin").raceRestriction = []; } },
    { name: "race_lock_value", target: "NO_RACE_LOCKS", also: [], mutate: c => { c.data.sourceDiscrepancies[0].note = "Open to elves only."; } },
    { name: "race_lock_id", target: "NO_RACE_LOCKS", also: ["PROF_ARMOR"], mutate: c => { C(c, "druid").proficiencies.armor.qualifier = "srd:race:dwarf"; } },
    { name: "affinity_weight_added", target: "NO_AFFINITY", also: ["SCHEMA_VALID"], mutate: c => { C(c, "fighter").jobPickWeight = 1.5; } },
    // doc
    { name: "doc_summary_wrong_die", target: "DOC_SUMMARY", also: [], mutate: c => { c.doc = c.doc.replace("| `srd:class:barbarian` | Barbarian | d12 |", "| `srd:class:barbarian` | Barbarian | d10 |"); } },
    { name: "doc_rule_missing", target: "DOC_RULES", also: [], mutate: c => { c.doc = c.doc.split("\n").filter(l => l.indexOf("| `NO_AFFINITY` |") !== 0).join("\n"); } }
];

// ---------------------------------------------------------------- runners

function failing(results) {
    return results.filter(r => r.errors.length).map(r => r.id);
}

function runFixture(base, fx) {
    const ctx = contextFor(base, fx.touches);
    fx.mutate(ctx);
    const results = validate(ctx);
    return { results: results, tripped: failing(results) };
}

function printResults(results) {
    for (const r of results) {
        console.log("  [" + (r.errors.length ? "FAIL" : "PASS") + "] " + r.id + (r.errors.length ? ": " + r.errors.length + " error(s)" : ""));
        for (const e of r.errors.slice(0, 4)) console.log("         " + e);
        if (r.errors.length > 4) console.log("         ... " + (r.errors.length - 4) + " more");
    }
}

function gate() {
    const t0 = Date.now();
    const base = loadContext();
    console.log("=== SRD CLASSES (SOC.11.01) ===");
    console.log("data " + path.relative(ROOT, DATA_PATH) + ", schema " + path.relative(ROOT, SCHEMA_PATH) + ", doc " + path.relative(ROOT, DOC_PATH));

    console.log("\n--- 1. Baseline: every rule on the committed files ---");
    const results = validate(base);
    printResults(results);
    const baseFail = failing(results);
    const nClasses = classes(base).length;
    const nSlots = classes(base).reduce((a, c) => a + (c.levels || []).reduce((b, l) => b + ((l && l.features) || []).length, 0), 0);
    const nRaces = ((base.data.raceClassPolicy || {}).races || []).length;
    console.log("  classes " + nClasses + ", level rows " + classes(base).reduce((a, c) => a + (c.levels || []).length, 0) + ", feature slots " + nSlots +
        ", race-class pairs with no lock " + (baseFail.indexOf("NO_RACE_LOCKS") < 0 ? nRaces * nClasses : 0) + "/" + nRaces * nClasses);

    console.log("\n--- 2. Negative fixtures: each trips exactly its target plus declared rules ---");
    const problems = [];
    const names = new Set();
    for (const fx of FIXTURES) {
        if (names.has(fx.name)) problems.push("duplicate fixture " + fx.name);
        names.add(fx.name);
        let tripped;
        try {
            tripped = runFixture(base, fx).tripped;
        } catch (e) {
            problems.push(fx.name + " threw " + e.message);
            console.log("  [FAIL] " + fx.name + " threw " + e.message);
            continue;
        }
        const want = [fx.target].concat(fx.also).sort();
        const ok = tripped.indexOf(fx.target) >= 0 && same(tripped.slice().sort(), want);
        if (!ok) problems.push(fx.name + " tripped " + JSON.stringify(tripped) + ", declared " + JSON.stringify(want));
        console.log("  [" + (ok ? "PASS" : "FAIL") + "] " + fx.name + " -> " + fx.target + (fx.also.length ? " (+" + fx.also.join(", ") + ")" : "") +
            (ok ? "" : "  tripped " + JSON.stringify(tripped)));
    }

    console.log("\n--- 3. Coverage: every rule is the target of a fixture ---");
    for (const r of RULES) {
        const n = FIXTURES.filter(f => f.target === r.id).length;
        if (!n) problems.push("rule " + r.id + " has no targeted fixture");
        console.log("  [" + (n ? "PASS" : "FAIL") + "] " + r.id + ": " + n + " fixture(s)");
    }

    const ok = baseFail.length === 0 && problems.length === 0;
    console.log("\n" + "=".repeat(60));
    if (ok) console.log("SRD CLASSES PASSED: " + RULES.length + " rules, " + FIXTURES.length + " fixtures each tripping its target (" + (Date.now() - t0) + " ms).");
    else {
        console.log("SRD CLASSES FAILED: baseline failures " + JSON.stringify(baseFail));
        for (const p of problems) console.log("  " + p);
    }
    console.log("=".repeat(60));
    return ok ? 0 : 1;
}

function provoke(name) {
    const fx = FIXTURES.find(f => f.name === name);
    if (!fx) {
        console.log("unknown provocation " + name);
        return 2;
    }
    const base = loadContext();
    const out = runFixture(base, fx);
    console.log("PROVOCATION " + fx.name + " (target " + fx.target + ")");
    printResults(out.results.filter(r => r.errors.length));
    console.log("TRIPPED " + JSON.stringify(out.tripped));
    return out.tripped.length ? 1 : 0;
}

function provokeAll() {
    let bad = 0;
    for (const fx of FIXTURES) {
        const r = spawnSync(process.execPath, [__filename, "--provoke", fx.name], { encoding: "utf8" });
        const m = /TRIPPED (\[.*\])/.exec(r.stdout || "");
        const tripped = m ? JSON.parse(m[1]) : null;
        const want = [fx.target].concat(fx.also).sort();
        const ok = r.status === 1 && tripped && same(tripped.slice().sort(), want) && (r.stdout || "").indexOf("[FAIL] " + fx.target + ":") >= 0;
        if (!ok) bad++;
        console.log("  [" + (ok ? "PASS" : "FAIL") + "] exit " + r.status + " " + fx.name + " -> " + JSON.stringify(tripped));
    }
    console.log("PROVOCATIONS " + (FIXTURES.length - bad) + "/" + FIXTURES.length + " exited 1 with exactly their declared rules failing");
    return bad ? 1 : 0;
}

function main(argv) {
    const i = argv.indexOf("--data");
    if (i >= 0) {
        const results = validate(loadContext({ data: path.resolve(argv[i + 1]) }));
        printResults(results);
        const f = failing(results);
        console.log(f.length ? "INVALID: " + f.join(", ") : "VALID: " + RULES.length + " rules pass");
        return f.length ? 1 : 0;
    }
    if (argv.indexOf("--list-provocations") >= 0) {
        for (const fx of FIXTURES) console.log(fx.name + " -> " + fx.target);
        return 0;
    }
    const p = argv.indexOf("--provoke");
    if (p >= 0) return provoke(argv[p + 1]);
    if (argv.indexOf("--provoke-all") >= 0) return provokeAll();
    return gate();
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { RULES: RULES, FIXTURES: FIXTURES, validate: validate, loadContext: loadContext, schemaErrors: schemaErrors };
