"use strict";
// Tamed creatures on the player's side (WG.00.39, DEC-033 item 3).
// Combat numbers come from the SRD 5.1 stat block UF.Rules already resolved.
// Speed and the Multiattack sentence are read from that same catalogue entry
// because the rules object does not publish them. Nothing here invents a number.
// ROLE_FIGHTS is PM_DEFAULT. OQ-BG-01 is open. This file does not answer it.

const record = require("./record");

const ROLE_FIGHTS = Object.freeze({
    pet: true,
    mount: true,
    livestock: true,
    work: true
});

const ORDERS = Object.freeze(["follow", "attack", "hold"]);
const ORDER_SET = Object.freeze({ follow: true, attack: true, hold: true });

const COUNT_WORD = Object.freeze({
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, a: 1, an: 1
});

const QUESTIONS = Object.freeze([
    {
        id: "OQ-BG-01",
        topic: "Which tamed roles fight",
        pmDefault: "Every domesticated role joins the party: pet, mount, livestock, and work. A captive does not. DEC-033 item 3 names no role that stays out. That table is not an Owner answer.",
        question: "Should any domesticated role stay out of party combat?"
    },
    {
        id: "OQ-BG-02",
        topic: "Stored 0 HP after capture",
        pmDefault: "Care does not heal. A living tamed creature (data.dead is not set) whose stored hp is 0, missing, or above the SRD average enters at the stat block average. A stored hp from 1 through that average is kept.",
        question: "Should a creature captured at 0 HP stay at 0 HP until something heals it, instead of entering combat at the SRD average?"
    }
]);

let catalogueMap = null;

function catalogue() {
    if (catalogueMap) return catalogueMap;
    const fs = require("fs");
    const path = require("path");
    const candidates = [
        path.join(__dirname, "..", "..", "..", "data", "srd51", "creatures.json")
    ];
    if (typeof process !== "undefined" && typeof process.cwd === "function") {
        candidates.push(path.join(process.cwd(), "game", "data", "srd51", "creatures.json"));
    }
    catalogueMap = new Map();
    let file = null;
    for (let i = 0; i < candidates.length; i++) {
        if (fs.existsSync(candidates[i])) { file = candidates[i]; break; }
    }
    if (!file) return catalogueMap;
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    const entries = Array.isArray(parsed) ? parsed : (parsed && parsed.entries) || [];
    for (let i = 0; i < entries.length; i++) {
        if (entries[i] && entries[i].id) catalogueMap.set(entries[i].id, entries[i]);
    }
    return catalogueMap;
}

function entryOf(block) {
    if (!block || !block.id) return null;
    return catalogue().get(block.id) || null;
}

function compactName(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function refuse(unit, reason) {
    return {
        ok: false,
        join: false,
        id: unit && unit.id != null ? unit.id : null,
        reason: reason
    };
}

function copyAbilities(abilities) {
    if (!abilities) return null;
    return {
        str: abilities.str,
        dex: abilities.dex,
        con: abilities.con,
        int: abilities.int,
        wis: abilities.wis,
        cha: abilities.cha
    };
}

function copyActions(actions) {
    const out = [];
    const list = actions || [];
    for (let i = 0; i < list.length; i++) {
        const action = list[i];
        if (!action || action.toHit == null) continue;
        out.push({
            name: action.name,
            key: action.key,
            toHit: action.toHit,
            dice: action.dice,
            damageType: action.damageType,
            attackKind: action.attackKind,
            reach: action.reach,
            range: action.range || null
        });
    }
    return out;
}

let weaponNameSet = null;

function weaponNames() {
    if (weaponNameSet) return weaponNameSet;
    const fs = require("fs");
    const path = require("path");
    const candidates = [
        path.join(__dirname, "..", "..", "..", "data", "srd51", "equipment.json")
    ];
    if (typeof process !== "undefined" && typeof process.cwd === "function") {
        candidates.push(path.join(process.cwd(), "game", "data", "srd51", "equipment.json"));
    }
    weaponNameSet = new Set();
    let file = null;
    for (let i = 0; i < candidates.length; i++) {
        if (fs.existsSync(candidates[i])) { file = candidates[i]; break; }
    }
    if (!file) return weaponNameSet;
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    const entries = Array.isArray(parsed) ? parsed : (parsed && parsed.entries) || [];
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry || entry.kind !== "weapon" || !entry.name) continue;
        weaponNameSet.add(compactName(entry.name));
    }
    return weaponNameSet;
}

function actionNameKeys(action) {
    const head = String((action && (action.name || action.key)) || "").split("(")[0];
    const words = head.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
    const keys = [];
    if (!words.length) return keys;
    keys.push(words.join(""));
    keys.push(words[words.length - 1]);
    if (words.length >= 2) keys.push(words.slice(-2).join(""));
    return keys;
}

// A stat-block action is manufactured when it names an SRD weapon, is a spell
// attack, or is a ranged weapon attack that is not a body or produced attack
// (a thrown rock). Empty equipment does not make a greatclub natural.
function isManufacturedAction(action, rules) {
    if (!action || action.toHit == null) return true;
    if (action.attackKind === "spell") return true;
    const names = weaponNames();
    const keys = actionNameKeys(action);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (names.has(key)) return true;
        if (key.length > 1 && names.has(key.replace(/s$/, ""))) return true;
        if (rules && rules.index && typeof rules.index.weapon === "function") {
            const found = rules.index.weapon(key);
            if (found) {
                const id = String(found.id || found.name || "").toLowerCase();
                if (id.indexOf("unarmed") < 0) return true;
            }
        }
    }
    const blob = keys.join("");
    if (action.range && !/spike|spit|web|poison|quill|thorn|spine|breath|spray/.test(blob)) return true;
    return false;
}

function naturalActions(actions, rules) {
    const copied = copyActions(actions);
    const kept = [];
    for (let i = 0; i < copied.length; i++) {
        if (!isManufacturedAction(copied[i], rules)) kept.push(copied[i]);
    }
    return kept;
}

function matchKey(name, actions) {
    const raw = compactName(name);
    const forms = [raw];
    if (raw.length > 3 && raw.slice(-3) === "ves") forms.push(raw.slice(0, -3) + "f");
    if (raw.length > 1 && raw.slice(-1) === "s") forms.push(raw.slice(0, -1));
    for (let f = 0; f < forms.length; f++) {
        const want = forms[f];
        let found = null;
        let many = false;
        for (let i = 0; i < actions.length; i++) {
            const key = compactName(actions[i].key || actions[i].name);
            const keyForms = [key];
            if (key.length > 1 && key.slice(-1) === "s") keyForms.push(key.slice(0, -1));
            for (let k = 0; k < keyForms.length; k++) {
                if (keyForms[k] !== want) continue;
                if (found && found !== actions[i].key) many = true;
                found = actions[i].key;
            }
        }
        if (found && !many) return found;
    }
    return null;
}

function countWord(word) {
    const text = String(word || "").toLowerCase();
    if (Object.prototype.hasOwnProperty.call(COUNT_WORD, text)) return COUNT_WORD[text];
    const n = parseInt(text, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

// The first alternative in an "or" sentence. "two with its claws" and
// "makes two slam attacks" both name the count. A manufactured name that is
// not in the natural list is skipped. "makes two melee attacks" repeats the
// only remaining natural action when nothing was filtered out.
function parseMultiattack(text, actions, droppedManufactured) {
    if (!text) return null;
    const first = String(text).split(/\s+or\s+/i)[0];
    const named = /(\b(?:one|two|three|four|five|six|seven|eight|a|an|\d+)\b)\s+with\s+(?:its\s+|a\s+|an\s+|their\s+)?([a-z]+)/gi;
    const seq = [];
    let match;
    while ((match = named.exec(first))) {
        const n = countWord(match[1]);
        if (!n) return null;
        const key = matchKey(match[2], actions);
        if (!key) continue;
        for (let i = 0; i < n; i++) seq.push(key);
    }
    if (seq.length) return seq;
    const namedAttacks = /makes\s+(one|two|three|four|five|six|seven|eight|\d+)\s+([a-z]+)\s+attacks?\b/gi; // BG_SLAM_COUNT
    let namedHit = false;
    while ((match = namedAttacks.exec(first))) {
        const label = String(match[2] || "").toLowerCase();
        if (label === "melee" || label === "ranged") continue;
        const n = countWord(match[1]);
        if (!n) return null;
        const key = matchKey(label, actions);
        if (!key) continue;
        for (let i = 0; i < n; i++) seq.push(key);
        namedHit = true;
    }
    if (namedHit && seq.length) return seq;
    const count = first.match(/makes\s+(one|two|three|four|five|six|seven|eight|\d+)\s+(?:melee\s+|ranged\s+)?attacks?\b/i);
    if (!count || actions.length !== 1 || droppedManufactured) return null;
    const n = countWord(count[1]);
    if (!n) return null;
    const only = actions[0].key;
    const out = [];
    for (let i = 0; i < n; i++) out.push(only);
    return out;
}

function multiattackText(block) {
    const entry = entryOf(block);
    const actions = entry && entry.data && entry.data.actions;
    if (!Array.isArray(actions)) return null;
    for (let i = 0; i < actions.length; i++) {
        if (actions[i] && /^multiattack$/i.test(String(actions[i].name || ""))) return actions[i].text || "";
    }
    return null;
}

function primaryAction(actions) {
    let first = null;
    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!action || action.toHit == null) continue;
        if (!first) first = action;
        if (!/recharge/i.test(action.name || "")) return action;
    }
    return first;
}

function attackSequence(block, rules) {
    const all = copyActions(block && block.actions);
    const actions = naturalActions(block && block.actions, rules); // BG_NATURAL_ONLY
    const text = multiattackText(block);
    const parsed = text ? parseMultiattack(text, actions, actions.length !== all.length) : null;
    if (parsed && parsed.length) {
        return { attacks: actions, sequence: parsed, multiattack: true, parsed: true, text: text };
    }
    const primary = primaryAction(actions);
    return {
        attacks: actions,
        sequence: primary ? [primary.key] : [],
        multiattack: false,
        parsed: !text,
        text: text
    };
}

function walkSpeed(block) {
    const entry = entryOf(block);
    const speed = entry && entry.data && entry.data.speed;
    if (!speed || typeof speed.walk !== "number" || !Number.isFinite(speed.walk)) return null;
    return speed.walk;
}

function sizeName(block) {
    const entry = entryOf(block);
    const size = entry && entry.data && entry.data.size;
    if (typeof size !== "string" || !size) return null;
    return size;
}

function reachSquares(action) {
    if (!action) return 1;
    if (action.range) {
        const feet = String(action.range).match(/(\d+)/);
        if (feet) return Math.max(1, Math.round(parseInt(feet[1], 10) / 5));
    }
    if (typeof action.reach === "number" && Number.isFinite(action.reach)) {
        return Math.max(1, Math.round(action.reach / 5));
    }
    return 1;
}

function sequenceReach(attacks, sequence) {
    let best = 1;
    const byKey = {};
    for (let i = 0; i < attacks.length; i++) byKey[attacks[i].key] = attacks[i];
    const keys = sequence && sequence.length ? sequence : attacks.map(function (a) { return a.key; });
    for (let i = 0; i < keys.length; i++) {
        const n = reachSquares(byKey[keys[i]]);
        if (n > best) best = n;
    }
    return best;
}

function lookupBlock(rules, unit) {
    try {
        return { block: rules.creatureOf(unit), error: null };
    } catch (err) {
        if (err && (err.name === "RulesError" || err.name === "DiceError")) return { block: null, error: err };
        throw err;
    }
}

function saddleView(rec) {
    if (!rec || !rec.saddleMark) return null;
    return {
        id: rec.saddleMark.id || "riding_saddle",
        visual: true,
        slot: null,
        stats: null
    };
}

// The body UF.Rules is allowed to see. No scores, no equipment, no saddle, no naturalArmor.
function rulesBody(unit, block) {
    const src = unit && unit.data && typeof unit.data === "object" ? unit.data : {};
    const data = {
        kind: "creature",
        species: src.species || null,
        srdId: (block && block.id) || src.srdId || src.creatureId || null,
        hp: src.hp,
        maxHp: src.maxHp
    };
    // BG_STRIP_GEAR
    const z = unit && unit.z != null ? unit.z : (unit && unit.area && unit.area.z != null ? unit.area.z : 0);
    return {
        id: unit && unit.id,
        name: (block && block.name) || (unit && unit.name) || null,
        x: unit && unit.x ? unit.x : 0,
        y: unit && unit.y ? unit.y : 0,
        z: z,
        data: data
    };
}

function armorClassOf(rules, unit, block) {
    const body = rulesBody(unit, block);
    return rules.armorClass(body).ac; // BG_GEAR_AC
}

function attackModOf(rules, unit, block, key) {
    const body = rulesBody(unit, block);
    const att = rules.attack(body, body, key, { roll: 10, targetAC: block.ac });
    return { attackMod: att.attackMod, damageExpr: att.damageExpr, fromStatBlock: !!att.fromStatBlock, damageType: att.damageType }; // BG_GEAR_HIT
}

function joinsParty(unit) {
    const decision = membership(null, unit);
    return decision.join === true;
}

function livingHp(rules, unit, opts) {
    const gate = membership(rules, unit, opts);
    if (!gate.join) return null;
    const found = lookupBlock(rules, unit);
    if (!found.block) return null;
    const hp = hitPointsFor(rules, unit, found.block);
    if (hp.dead) return null;
    return { max: hp.max, hp: hp.hp, srdId: found.block.id };
}

function membership(rules, unit, opts) {
    const data = unit && unit.data && typeof unit.data === "object" ? unit.data : null;
    if (!data || data.kind !== "creature") return refuse(unit, "NOT_CREATURE");
    const humanoidTypes = opts && opts.humanoidTypes;
    if (rules && record.isHumanoidUnit(unit, rules, humanoidTypes)) return refuse(unit, "HUMANOID");
    const rec = record.recordOf(unit);
    if (data.dead === true || data._isDying === true || (rec && (rec.status === "dead" || rec.dead === true))) {
        return refuse(unit, "DEAD");
    }
    if (!(rec && rec.status === "domesticated")) return refuse(unit, "NOT_TAMED"); // BG_MEMBERSHIP
    if (!rec || !record.roleOk(rec.role) || ROLE_FIGHTS[rec.role] !== true) return refuse(unit, "ROLE");
    if (!rules || typeof rules.creatureOf !== "function" || typeof rules.hitPoints !== "function") {
        return { ok: true, join: true, id: unit.id, reason: "ROLE", role: rec.role, record: rec };
    }
    const found = lookupBlock(rules, unit);
    if (!found.block) return refuse(unit, (found.error && found.error.code) || "NO_SRD");
    if (record.blockIsHumanoid(found.block, humanoidTypes)) return refuse(unit, "HUMANOID");
    const speed = walkSpeed(found.block);
    if (speed == null) return refuse(unit, "NO_SPEED");
    return {
        ok: true,
        join: true,
        id: unit.id,
        reason: "JOIN",
        role: rec.role,
        side: "player",
        srdId: found.block.id,
        record: rec
    };
}

function hitPointsFor(rules, unit, block) {
    const max = rules.hitPoints(block).hp; // BG_SRD_HP
    const data = unit && unit.data ? unit.data : {};
    if (data.dead === true || data._isDying === true) return { max: max, hp: 0, dead: true };
    const stored = data.hp;
    let hp = max;
    if (typeof stored === "number" && Number.isFinite(stored) && stored > 0 && stored <= max) hp = stored;
    return { max: max, hp: hp, dead: false };
}

function combatProfile(rules, unit, opts) {
    const gate = membership(rules, unit, opts);
    if (!gate.join) {
        if (gate.reason === "DEAD") noteDeath(unit, { cause: "hp0" });
        return gate;
    }
    const found = lookupBlock(rules, unit);
    if (!found.block) return refuse(unit, (found.error && found.error.code) || "NO_SRD");
    const block = found.block;
    const hp = hitPointsFor(rules, unit, block);
    if (hp.dead) return refuse(unit, "DEAD");
    const seq = attackSequence(block, rules);
    const speed = walkSpeed(block);
    const size = sizeName(block);
    if (speed == null || !size) return refuse(unit, speed == null ? "NO_SPEED" : "NO_SIZE");
    const key = seq.sequence[0] || null;
    const swung = key ? attackModOf(rules, unit, block, key) : null;
    const rec = gate.record;
    return {
        ok: true,
        join: true,
        id: unit.id,
        role: gate.role,
        side: "player",
        srdId: block.id,
        name: block.name,
        size: size,
        speedFt: speed,
        maxHp: hp.max,
        hp: hp.hp,
        ac: armorClassOf(rules, unit, block),
        abilities: copyAbilities(block.abilities),
        savingThrows: block.savingThrows ? JSON.parse(JSON.stringify(block.savingThrows)) : {},
        attacks: seq.attacks,
        sequence: seq.sequence.slice(),
        multiattack: seq.multiattack,
        multiattackParsed: seq.parsed,
        weaponKey: key,
        reachSquares: sequenceReach(seq.attacks, seq.sequence),
        attackMod: swung ? swung.attackMod : null,
        damageExpr: swung ? swung.damageExpr : null,
        fromStatBlock: swung ? swung.fromStatBlock : false,
        equipmentSlots: [],
        saddle: saddleView(rec),
        defenses: defensesOf(block),
        order: orderOf(unit)
    };
}

function combatantSpec(rules, unit, opts) {
    const profile = combatProfile(rules, unit, opts);
    if (!profile.ok) return profile;
    const rec = record.recordOf(unit);
    return {
        ok: true,
        unit: {
            id: unit.id,
            name: profile.name,
            x: unit.x | 0,
            y: unit.y | 0,
            z: unit.z != null ? unit.z : (unit.area && unit.area.z != null ? unit.area.z : 0),
            size: profile.size,
            speedFt: profile.speedFt,
            side: "player",
            faction: rec && rec.factionId ? rec.factionId : "player",
            behaviour: "attack-nearest",
            order: orderOf(unit),
            tamed: true,
            worldUnit: unit,
            taming: rec,
            species: unit.data.species || null,
            srdId: profile.srdId,
            weaponKey: profile.weaponKey,
            attacks: profile.attacks,
            multiattack: profile.sequence,
            reachSquares: profile.reachSquares,
            hp: profile.hp,
            maxHp: profile.maxHp,
            pc: false,
            className: "",
            shield: false,
            equipment: {},
            race: unit.data.species || profile.name,
            kind: "creature"
        }
    };
}

function enlist(engine, rules, units, opts) {
    const list = units || [];
    const added = [];
    const refused = [];
    if (!engine || typeof engine.addUnit !== "function") {
        return { added: added, refused: [{ ok: false, join: false, reason: "NO_ENGINE" }] };
    }
    for (let i = 0; i < list.length; i++) {
        const spec = combatantSpec(rules, list[i], opts);
        if (!spec.ok) {
            refused.push(spec);
            continue;
        }
        engine.addUnit(spec.unit);
        added.push({
            id: String(spec.unit.id),
            role: record.recordOf(list[i]) && record.recordOf(list[i]).role,
            side: "player",
            srdId: spec.unit.srdId
        });
    }
    return { added: added, refused: refused };
}

// Keep a numeric world id numeric. String(9) is a different key from 9.
function keptTarget(type, id) {
    if (type !== "attack") return null;
    if (id == null || id === "") return null;
    return id; // BG_TARGET_ID
}

function sharedRecord(unit) {
    return record.recordOf(unit) || (unit && unit.worldUnit && record.recordOf(unit.worldUnit)) || null;
}

function orderOf(unit) {
    const rec = sharedRecord(unit);
    if (rec && rec.order && ORDER_SET[rec.order.type]) {
        return { type: rec.order.type, targetId: keptTarget(rec.order.type, rec.order.targetId) }; // BG_ORDER_RECORD
    }
    const local = unit && unit.order;
    if (local && ORDER_SET[local.type]) {
        return { type: local.type, targetId: keptTarget(local.type, local.targetId) };
    }
    return { type: "follow", targetId: null };
}

function issueOrder(unit, order) {
    const type = order && order.type;
    if (!ORDER_SET[type]) return { ok: false, reason: "BAD_ORDER", order: null };
    if (type === "attack" && (order.targetId == null || order.targetId === "")) {
        return { ok: false, reason: "NO_TARGET", order: null };
    }
    const next = { type: type, targetId: keptTarget(type, order && order.targetId) };
    if (unit) unit.order = { type: next.type, targetId: next.targetId };
    const rec = sharedRecord(unit);
    if (rec) rec.order = { type: next.type, targetId: next.targetId };
    return { ok: true, reason: "ORDER", order: { type: next.type, targetId: next.targetId } };
}

function nextAction(unit, look) {
    const order = orderOf(unit);
    const seen = look || {};
    if (order.type === "hold") return { type: "hold" };
    if (order.type === "attack") {
        const id = order.targetId;
        if (!id) return { type: "hold" };
        if (typeof seen.living === "function" && !seen.living(id)) return { type: "hold" };
        return { type: "attack", targetId: id, natural: true };
    }
    if (typeof seen.enemyInReach === "function") {
        const enemy = seen.enemyInReach();
        if (enemy && enemy.id != null) return { type: "attack", targetId: enemy.id, natural: true };
    }
    const anchor = typeof seen.anchorId === "function" ? seen.anchorId() : seen.anchorId;
    return { type: "follow", targetId: anchor == null ? null : String(anchor) }; // BG_ORDER_FOLLOW
}

function primaryAttackKey(unit, rules) {
    if (!rules || typeof rules.creatureOf !== "function") return null;
    const found = lookupBlock(rules, unit);
    if (!found.block) return null;
    const seq = attackSequence(found.block, rules);
    return seq.sequence.length ? seq.sequence[0] : null;
}

function traitList(block) {
    const entry = entryOf(block);
    const traits = entry && entry.data && entry.data.traits;
    return Array.isArray(traits) ? traits : [];
}

function defensesOf(block) {
    const traits = traitList(block);
    let pack = null;
    let regeneration = null;
    const damageTypes = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];
    for (let i = 0; i < traits.length; i++) {
        const trait = traits[i];
        if (!trait) continue;
        const name = String(trait.name || "");
        const text = String(trait.text || "").replace(/[’]/g, "'");
        if (/^pack tactics$/i.test(name) || /advantage on attack rolls against a creature if at least one of/i.test(text)) {
            const feet = text.match(/within\s+(\d+)\s+feet/i);
            pack = { feet: feet ? parseInt(feet[1], 10) : 5 };
        }
        if (/^regeneration$/i.test(name) || /regains\s+\d+\s+hit points at the start of its turn/i.test(text)) {
            const hpMatch = text.match(/regains\s+(\d+)\s+hit points at the start of its turn/i);
            const hp = hpMatch ? parseInt(hpMatch[1], 10) : 0;
            const suppress = [];
            const sup = text.match(/takes\s+([^.]+?)\s+damage,\s+this trait does(?:n't| not) function/i);
            if (sup) {
                const blob = sup[1].toLowerCase();
                for (let t = 0; t < damageTypes.length; t++) {
                    if (blob.indexOf(damageTypes[t]) >= 0) suppress.push(damageTypes[t]);
                }
            }
            const deathException = /dies only if it starts its turn with 0 hit points and does(?:n't| not) regenerate/i.test(text);
            if (hp > 0) regeneration = { hp: hp, suppress: suppress, deathException: deathException };
        }
    }
    return { pack: pack, regeneration: regeneration };
}

function packFeet(rules, unit) {
    const found = lookupBlock(rules, unit);
    if (!found.block) return 0;
    const pack = defensesOf(found.block).pack;
    return pack && pack.feet ? pack.feet : 0;
}

function incapacitated(unit) {
    if (!unit || unit.dead || unit.dying) return true;
    if (unit.data && (unit.data.dead === true || unit.data._isDying === true)) return true;
    if (unit.data && typeof unit.data.hp === "number" && unit.data.hp <= 0) return true;
    const list = unit.data && unit.data.conditions;
    if (!Array.isArray(list)) return false;
    for (let i = 0; i < list.length; i++) {
        const name = String((list[i] && list[i].name) || list[i] || "").toLowerCase();
        if (name === "incapacitated" || name === "paralyzed" || name === "stunned" || name === "unconscious" || name === "petrified") return true;
    }
    return false;
}

function hostileUnit(unit) {
    if (!unit) return false;
    if (unit.side === "enemy" || unit.side === "hostile") return true;
    const tags = unit.data && unit.data.tags;
    return Array.isArray(tags) && tags.indexOf("hostile") >= 0;
}

function squaresBetween(a, b) {
    if (!a || !b) return Infinity;
    return Math.max(Math.abs((a.x | 0) - (b.x | 0)), Math.abs((a.y | 0) - (b.y | 0)));
}

// Pack Tactics: advantage when an ally is within the trait's feet of the target.
function packAdvantage(rules, actor, target, units) {
    const feet = packFeet(rules, actor);
    if (!feet || !actor || !target) return false;
    const limit = Math.floor(feet / 5);
    const list = units || [];
    for (let i = 0; i < list.length; i++) {
        const ally = list[i];
        if (!ally || ally === actor || ally === target) continue;
        if (ally.id != null && (ally.id === actor.id || ally.id === target.id)) continue;
        if (incapacitated(ally) || hostileUnit(ally)) continue;
        if (ally.side && actor.side && ally.side !== actor.side) continue;
        if (squaresBetween(ally, target) <= limit) return true;
    }
    return false;
}

function defersDeath(unit, rules) {
    const found = lookupBlock(rules, unit);
    if (!found.block) return false;
    const regen = defensesOf(found.block).regeneration;
    return !!(regen && regen.deathException);
}

function noteDamageType(unit, rules, damageType) {
    if (!unit) return;
    const found = lookupBlock(rules, unit);
    if (!found.block) return;
    const regen = defensesOf(found.block).regeneration;
    if (!regen) return;
    const type = String(damageType || "").toLowerCase();
    if (regen.suppress.indexOf(type) < 0) return;
    unit.regenBlocked = true;
    if (unit.worldUnit && unit.worldUnit !== unit) unit.worldUnit.regenBlocked = true;
}

// Start of the creature's turn. Regeneration and the "dies only if it does not
// regenerate" sentence come from the stat block. The heal amount is that number.
function beginTurn(unit, rules) {
    if (!unit || !rules || unit.dead) return { healed: 0, died: false };
    if (unit.data && unit.data.dead === true) return { healed: 0, died: false };
    const found = lookupBlock(rules, unit);
    if (!found.block) return { healed: 0, died: false };
    const regen = defensesOf(found.block).regeneration;
    if (!regen) return { healed: 0, died: false };
    const blocked = !!(unit.regenBlocked || (unit.worldUnit && unit.worldUnit.regenBlocked));
    unit.regenBlocked = false;
    if (unit.worldUnit && unit.worldUnit !== unit) unit.worldUnit.regenBlocked = false;
    const hp = unit.data && typeof unit.data.hp === "number" ? unit.data.hp : 0;
    if (blocked) {
        if (hp <= 0 && regen.deathException) {
            noteDeath(unit, { cause: "no-regeneration" });
            return { healed: 0, died: true, suppressed: true };
        }
        return { healed: 0, died: false, suppressed: true };
    }
    const max = unit.data && typeof unit.data.maxHp === "number" ? unit.data.maxHp : hp;
    const amount = regen.hp; // BG_REGEN
    const gain = Math.max(0, Math.min(amount, max - hp));
    if (unit.data) unit.data.hp = hp + gain;
    if (unit.worldUnit && unit.worldUnit !== unit && unit.worldUnit.data) unit.worldUnit.data.hp = unit.data.hp;
    return { healed: gain, died: false };
}

// Existing creature path: 0 HP is death, except a stat block that says the
// creature dies only when it starts a turn at 0 and does not regenerate.
// PROPOSED-AX-01 (knock out instead) is not implemented.
function noteDeath(unit, info) {
    const bodies = [];
    if (unit) bodies.push(unit);
    if (unit && unit.worldUnit && unit.worldUnit !== unit) bodies.push(unit.worldUnit);
    let rec = null;
    for (let i = 0; i < bodies.length; i++) {
        const found = record.recordOf(bodies[i]);
        if (found) rec = found;
    }
    if (!rec) return { updated: false, reason: "NO_RECORD", knockout: false };
    const previous = rec.status;
    rec.status = "dead";
    rec.dead = true; // BG_NOTE_DEATH
    rec.death = {
        cause: (info && info.cause) || "hp0",
        knockout: false,
        rule: "srd:rule:combat-damage-and-healing",
        killerId: info && info.killerId != null ? info.killerId : null
    };
    for (let i = 0; i < bodies.length; i++) {
        if (!bodies[i].data || typeof bodies[i].data !== "object") bodies[i].data = {};
        bodies[i].data.hp = 0;
        bodies[i].data.dead = true;
        bodies[i].data._isDying = true;
    }
    return { updated: previous !== "dead", status: rec.status, knockout: false, death: rec.death };
}

module.exports = {
    ROLE_FIGHTS: ROLE_FIGHTS,
    ORDERS: ORDERS,
    QUESTIONS: QUESTIONS,
    joinsParty: joinsParty,
    livingHp: livingHp,
    membership: membership,
    rulesBody: rulesBody,
    armorClassOf: armorClassOf,
    attackModOf: attackModOf,
    combatProfile: combatProfile,
    combatantSpec: combatantSpec,
    enlist: enlist,
    orderOf: orderOf,
    issueOrder: issueOrder,
    nextAction: nextAction,
    primaryAttackKey: primaryAttackKey,
    noteDeath: noteDeath,
    attackSequence: attackSequence,
    walkSpeed: walkSpeed,
    defensesOf: defensesOf,
    packFeet: packFeet,
    packAdvantage: packAdvantage,
    defersDeath: defersDeath,
    noteDamageType: noteDamageType,
    beginTurn: beginTurn,
    naturalActions: naturalActions
};
