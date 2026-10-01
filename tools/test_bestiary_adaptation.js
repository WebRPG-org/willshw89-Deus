// tools/test_bestiary_adaptation.js - checks for the bestiary adaptation layer (NAT.07.01, lane-ex).
//
// Usage: node tools/test_bestiary_adaptation.js [--root <dir>] [--no-mutants] [--mutant <name>]
//
// Checks game/data/srd_adaptation/creatures.json against the pinned source rows, which this file parses itself
// (it does not reuse the builder's parser), against game/data/srd51/creatures.json and against
// game/js/sim/rules/species_map.js. Then, unless --no-mutants, it copies the inputs to a temp folder, applies
// each mutant, reruns itself there and requires the mutant's named checks to turn FAIL with exit 1.
// --mutant <name> runs only that mutant and prints the rerun's full output (evidence for a reviewer).
// Exit 0 only when every check passes and every mutant is killed.
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; };
const ROOT = path.resolve(opt("--root", path.join(__dirname, "..")));
const RUN_MUTANTS = !args.includes("--no-mutants");
const ONLY_MUTANT = opt("--mutant", null);

const P = {
    source: "docs/design/bestiary/BESTIARY_grok_heavy.md",
    pin: "docs/design/bestiary/SOURCE.json",
    registry: "tasks/wbs_registry.json",
    srd: "game/data/srd51/creatures.json",
    species: "game/js/sim/rules/species_map.js",
    builder: "tools/bestiary/build_bestiary.js",
    out: "game/data/srd_adaptation/creatures.json"
};

// The upstream SRD files as they stood at the lane base (main 125b8b0a), hashed with CRLF folded to LF.
// lane-ex reads srd51 and never writes it. A deliberate upstream change elsewhere re-pins these values.
const UPSTREAM_PINS = {
    "game/data/srd51/catalogue_manifest.json": "dce007d2893a6bc9ee03059c7280ca319aaf3c8c278eb000e13c29c18724b5cd",
    "game/data/srd51/character_options.json": "36df04b445282ff6efa1e30b59c76d723fc9b70ae71516fbf02cff619985e54f",
    "game/data/srd51/creatures.json": "f667d867284339d7ba5be71dbad19a0da7beac23ebc249b68b0d06e0fa67ed3b",
    "game/data/srd51/equipment.json": "77c4ff252d32f5c5523d6269ab806667cb4a958aa3708ef385fdfdb58430c160",
    "game/data/srd51/magic_items.json": "6ee8c44f2a1cf98832f331f62e1429c86cec18c8220d7b2f2317d54f1951d9e6",
    "game/data/srd51/rules.json": "f5f1d5d82fa2826f5109a965cfaae6db5913163c56e7cac1df7037d12b7ac351",
    "game/data/srd51/spells.json": "7372eccda0bcfd3c27e77822ef5226422b238955636ad69bbbae69ef78d58e94",
    "game/data/srd5_1/abilities.json": "470c2f6f7211d24f506a0b546ca88bf9277bf1506717e2b57b0a4cc40d7ea53c",
    "game/data/srd5_1/armor.json": "0aa1a0f513b10de571206819096d46a33f52ffbc306683f0d97915b432453077",
    "game/data/srd5_1/classes_reference.json": "e8ab02e1a709ef1c19e42999c0ab99630bf64e046ac0c42660fb1caf4ee32a6e",
    "game/data/srd5_1/combat_actions.json": "ea91be3c023a90154ce908c86f6899c8576a295b37f35b824c980b9eaaccd4dd",
    "game/data/srd5_1/conditions.json": "a360f24c1884106a08e41e06706354e5cc6560207511dd93c4b545a984fcc146",
    "game/data/srd5_1/damage_types.json": "6b23bf4333656634326870339a492344d23ccc69440cf983b6eaa78ff263db51",
    "game/data/srd5_1/magic_items_reference.json": "cc10635dd206212c152b8f203cf1ef583d0531872f035efbb048b9dac8d0383e",
    "game/data/srd5_1/monsters_reference.json": "237b0a9b2cc142924adf1ad9a772c898f136f03a31e34c172fee094ce0196e38",
    "game/data/srd5_1/rules_reference.json": "d6a91d0f6ecdb8ae355409cbabbd028836410eb73aa0cd5b7cf00164d6da0edc",
    "game/data/srd5_1/skills.json": "7889e7454cdaf23426195ca021f54711ac3251a7e224ca02f2448b086dfc1423",
    "game/data/srd5_1/species_reference.json": "41d750db761dff9090705196c0dd451402bdc441432f886bd91bf5186ff94aa3",
    "game/data/srd5_1/spells.json": "bde3f50b431f013c19e39f309aa602fc85e1080f471e36786a995e6f290523e0",
    "game/data/srd5_1/tools.json": "293d5012c3b6c4a6f691bb421dfbe5315fdd98f29210ff611f8c18e1ba5e7e8b",
    "game/data/srd5_1/weapon_properties.json": "e816848a105ebf1bc95c81c97b5b8a54797eb26daab70685a1d962c82da1608f",
    "game/data/srd5_1/weapons.json": "183c68b3283a32834aaf7f71a0b0c1a6d404af1c52c8f4b4c6237382d82bc0ef"
};

// Restated here, not imported from the builder, so a builder fault cannot hide itself.
const FAMILIES = ["VOLCANIC", "WET", "ARID", "TEMPERATE", "COLD", "WILD"];
const BANDS = ["Deep Earth", "Caverns", "Lowlands", "Uplands", "Highlands"];
const TIERS = ["T0", "T1", "T2", "T3", "T4"];
// DESIGN-D4 section 4: T0 CR 0-1/4, T1 1/2-2, T2 3-6, T3 7-12, T4 13+.
const expectedTier = cr => cr <= 0.25 ? "T0" : cr <= 2 ? "T1" : cr <= 6 ? "T2" : cr <= 12 ? "T3" : "T4";
const expectedPlacement = (role, freq) => role === "EXCLUDE" ? "none" : role === "SUMMON-ONLY" ? "summon" : freq === "lair" ? "lair" : "seeded";

const lf = s => String(s).replace(/\r\n/g, "\n");
const sha256 = s => crypto.createHash("sha256").update(s, "utf8").digest("hex");
const read = rel => {
    const f = path.join(ROOT, rel);
    if (!fs.existsSync(f)) throw new Error(`missing ${rel}`);
    return fs.readFileSync(f, "utf8");
};
const readJson = rel => JSON.parse(read(rel));

// Source rows: "<id> <ROLE> <Tn> <cells|-> <frequency|-> <note>", where a cell may contain a space ("WET/Deep Earth").
function sourceRows() {
    const lines = lf(read(P.source)).split("\n");
    const rows = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("## ")) break;
        if (!lines[i].startsWith("srd:creature:")) continue;
        const t = lines[i].split(" ");
        const id = t[0], role = t[1], tier = t[2];
        let k = 3, cellText = "";
        if (t[k] === "-") { k++; } else {
            while (k < t.length && !/^(common|uncommon|rare|lair)$/.test(t[k])) cellText += (cellText ? " " : "") + t[k++];
        }
        const freq = t[k] === "-" ? null : t[k];
        const tokens = cellText ? cellText.split(",") : [];
        rows.push({
            id, role, tier, freq, line: i + 1,
            cells: tokens.filter(c => c !== "Sky"),
            sky: tokens.includes("Sky")
        });
    }
    return rows;
}

function output() { return readJson(P.out); }
const cellStr = c => (c && typeof c === "object") ? `${c.family}/${c.band}` : String(c);

const checks = [];
const check = (name, fn) => checks.push({ name, fn });

check("source_pinned", () => {
    const bad = [];
    const got = sha256(lf(read(P.source)));
    const pin = readJson(P.pin).sha256;
    const reg = readJson(P.registry).tasks["NAT.07.01"].source.sha256;
    if (got !== pin) bad.push(`source copy hashes to ${got}, SOURCE.json pins ${pin}`);
    if (pin !== reg) bad.push(`SOURCE.json pin ${pin} differs from the registry pin ${reg}`);
    const meta = output().metadata.source.sha256;
    if (meta !== reg) bad.push(`output was built from ${meta}, registry pin is ${reg}`);
    return bad;
});

check("row_count_317", () => {
    const bad = [];
    const n = output().entries.length, s = sourceRows().length, r = readJson(P.srd).entries.length;
    if (n !== 317) bad.push(`output has ${n} rows`);
    if (s !== 317) bad.push(`source has ${s} rows`);
    if (r !== 317) bad.push(`srd51 has ${r} creatures`);
    return bad;
});

check("source_output_bijection", () => {
    const bad = [];
    const tally = (ids) => ids.reduce((m, id) => m.set(id, (m.get(id) || 0) + 1), new Map());
    const src = tally(sourceRows().map(r => r.id));
    const out = tally(output().entries.map(e => e.id));
    const srd = new Set(readJson(P.srd).entries.map(e => e.id));
    for (const [id, n] of src) if (n !== 1) bad.push(`source lists ${id} ${n} times`);
    for (const [id, n] of out) if (n !== 1) bad.push(`output has ${n} rows for ${id}`);
    for (const id of src.keys()) if (!out.has(id)) bad.push(`source ${id} has no output row`);
    for (const id of out.keys()) if (!src.has(id)) bad.push(`output row ${id} has no source row`);
    for (const id of srd) if (!src.has(id)) bad.push(`srd51 ${id} has no source row`);
    for (const id of src.keys()) if (!srd.has(id)) bad.push(`source ${id} is not an srd51 creature`);
    return bad;
});

check("tier_from_cr", () => {
    const bad = [];
    const cr = new Map(readJson(P.srd).entries.map(e => [e.id, e.data.challenge]));
    const src = new Map(sourceRows().map(r => [r.id, r]));
    for (const e of output().entries) {
        const c = cr.get(e.id);
        if (!c) { bad.push(`${e.id} not in srd51`); continue; }
        const want = expectedTier(c.rating);
        if (e.tier !== want) bad.push(`${e.id} tier ${e.tier}, CR ${c.ratingText} gives ${want}`);
        if (src.has(e.id) && src.get(e.id).tier !== want) bad.push(`${e.id} source tier ${src.get(e.id).tier}, CR ${c.ratingText} gives ${want}`);
        if (!e.cr || e.cr.rating !== c.rating || e.cr.text !== c.ratingText) bad.push(`${e.id} cr ${JSON.stringify(e.cr)} differs from srd51 ${c.ratingText}`);
    }
    return bad;
});

check("cells_valid", () => {
    const bad = [];
    const src = new Map(sourceRows().map(r => [r.id, r]));
    for (const e of output().entries) {
        if (!Array.isArray(e.cells)) { bad.push(`${e.id} cells is not a list`); continue; }
        const strs = e.cells.map(cellStr);
        for (const c of e.cells) {
            if (!c || !FAMILIES.includes(c.family) || !BANDS.includes(c.band) || Object.keys(c).length !== 2) bad.push(`${e.id} has a bad cell ${JSON.stringify(c)}`);
        }
        if (new Set(strs).size !== strs.length) bad.push(`${e.id} lists a cell twice`);
        if (typeof e.sky !== "boolean") bad.push(`${e.id} sky is not a boolean`);
        const s = src.get(e.id);
        if (s && (strs.join(",") !== s.cells.join(",") || e.sky !== s.sky)) bad.push(`${e.id} cells ${strs.join(",")}${e.sky ? "+Sky" : ""} differ from source ${s.cells.join(",")}${s.sky ? "+Sky" : ""}`);
    }
    return bad;
});

check("exclude_empty", () => {
    const bad = [];
    const src = new Map(sourceRows().map(r => [r.id, r]));
    for (const e of output().entries) {
        const s = src.get(e.id);
        if (s && e.role !== s.role) bad.push(`${e.id} role ${e.role}, source says ${s.role}`);
        const empty = e.cells.length === 0 && e.sky === false;
        if (e.role === "EXCLUDE" && !empty) bad.push(`EXCLUDE row ${e.id} has a cell`);
        if (e.role !== "EXCLUDE" && empty) bad.push(`${e.role} row ${e.id} has no cell`);
    }
    return bad;
});

check("occupancy_matches_source", () => {
    const bad = [];
    const blank = () => {
        const o = {};
        for (const f of FAMILIES) for (const b of BANDS) o[`${f}/${b}`] = Object.fromEntries(TIERS.map(t => [t, 0]));
        o.Sky = Object.fromEntries(TIERS.map(t => [t, 0]));
        return o;
    };
    const fromSource = blank();
    for (const r of sourceRows()) {
        for (const c of r.cells) { if (!fromSource[c]) { bad.push(`source row ${r.id} names unknown cell ${c}`); continue; } fromSource[c][r.tier]++; }
        if (r.sky) fromSource.Sky[r.tier]++;
    }
    const out = output();
    const fromRows = blank();
    for (const e of out.entries) {
        for (const c of e.cells) { const k = cellStr(c); if (fromRows[k]) fromRows[k][e.tier]++; }
        if (e.sky && fromRows.Sky[e.tier] !== undefined) fromRows.Sky[e.tier]++;
    }
    const meta = out.metadata.occupancy || {};
    const keys = Object.keys(fromSource);
    if (Object.keys(meta).sort().join("|") !== keys.slice().sort().join("|")) bad.push("metadata.occupancy does not list exactly the 30 cells and Sky");
    for (const k of keys) for (const t of TIERS) {
        const want = fromSource[k][t];
        if (fromRows[k][t] !== want) bad.push(`${k} ${t}: output rows give ${fromRows[k][t]}, source rows give ${want}`);
        if (!meta[k] || meta[k][t] !== want) bad.push(`${k} ${t}: metadata.occupancy says ${meta[k] && meta[k][t]}, source rows give ${want}`);
    }
    return bad;
});

check("placement_rules", () => {
    const bad = [];
    const src = new Map(sourceRows().map(r => [r.id, r]));
    const out = output();
    const rules = Object.keys(out.metadata.placementRules || {}).sort().join(",");
    if (rules !== "lair,none,seeded,summon") bad.push(`metadata.placementRules lists ${rules}`);
    for (const e of out.entries) {
        const s = src.get(e.id);
        if (!s) continue;
        if (e.frequency !== s.freq) bad.push(`${e.id} frequency ${e.frequency}, source says ${s.freq}`);
        const want = expectedPlacement(s.role, s.freq);
        if (e.placement !== want) bad.push(`${e.id} placement ${e.placement}, role ${s.role} with frequency ${s.freq} gives ${want}`);
    }
    return bad;
});

check("bodies_consistent", () => {
    const bad = [];
    const file = path.join(ROOT, P.species);
    if (!fs.existsSync(file)) throw new Error(`missing ${P.species}`);
    delete require.cache[require.resolve(file)];
    const map = require(file).SPECIES_MAP;
    const entries = output().entries;
    const bySpecies = new Map(map.map(s => [s.species, s]));
    const homes = new Map();
    for (const e of entries) {
        if (!Array.isArray(e.bodies)) { bad.push(`${e.id} bodies is not a list`); continue; }
        for (const b of e.bodies) {
            const s = bySpecies.get(b.species);
            if (!s) { bad.push(`${e.id} body ${b.species} is not in species_map`); continue; }
            if (s.srdId !== e.id) bad.push(`${e.id} body ${b.species}, species_map maps it to ${s.srdId}`);
            if (s.kind !== b.kind) bad.push(`${e.id} body ${b.species} kind ${b.kind}, species_map says ${s.kind}`);
            homes.set(b.species, (homes.get(b.species) || 0) + 1);
        }
    }
    for (const s of map) if (homes.get(s.species) !== 1) bad.push(`species ${s.species} appears as a body ${homes.get(s.species) || 0} times`);
    return bad;
});

check("build_reproducible", () => {
    const builder = path.join(ROOT, P.builder);
    if (!fs.existsSync(builder)) throw new Error(`missing ${P.builder}`);
    const r = spawnSync(process.execPath, [builder, "--check", "--root", ROOT], { encoding: "utf8" });
    return r.status === 0 ? [] : [`build_bestiary --check exit ${r.status}: ${(r.stderr || r.stdout || "").trim()}`];
});

check("srd51_untouched", () => {
    const bad = [];
    for (const dir of ["game/data/srd51", "game/data/srd5_1"]) {
        const abs = path.join(ROOT, dir);
        const have = fs.existsSync(abs) ? fs.readdirSync(abs).map(f => `${dir}/${f}`).sort() : [];
        const want = Object.keys(UPSTREAM_PINS).filter(k => k.startsWith(dir + "/")).sort();
        if (have.join("|") !== want.join("|")) bad.push(`${dir} holds ${have.length} files, the pin lists ${want.length}`);
    }
    for (const [rel, pin] of Object.entries(UPSTREAM_PINS)) {
        const f = path.join(ROOT, rel);
        if (!fs.existsSync(f)) { bad.push(`${rel} is missing`); continue; }
        const got = sha256(lf(fs.readFileSync(f, "utf8")));
        if (got !== pin) bad.push(`${rel} hashes to ${got.slice(0, 12)}, pinned ${pin.slice(0, 12)}`);
    }
    return bad;
});

check("no_old_world_name", () => {
    const bad = [];
    const walk = (v, where) => {
        if (typeof v === "string") { if (/emrys/i.test(v)) bad.push(`${where}: ${v}`); }
        else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
        else if (v && typeof v === "object") for (const k of Object.keys(v)) { if (/emrys/i.test(k)) bad.push(`key ${where}.${k}`); walk(v[k], `${where}.${k}`); }
    };
    walk(output(), "creatures.json");
    return bad;
});

function runChecks() {
    const results = [];
    for (const c of checks) {
        let bad;
        try { bad = c.fn(); } catch (e) { bad = [e.message]; }
        results.push({ name: c.name, ok: bad.length === 0, bad });
        if (bad.length === 0) console.log(`PASS ::${c.name}`);
        else console.log(`FAIL ::${c.name}: ${bad.length} problem(s); ${bad.slice(0, 3).join("; ")}${bad.length > 3 ? "; ..." : ""}`);
    }
    return results;
}

// ---- mutants ----
const COPY = [
    "docs/design/bestiary", "tasks/wbs_registry.json", "game/data/srd51", "game/data/srd5_1",
    "game/js/sim/rules/species_map.js", "tools/bestiary/build_bestiary.js", "game/data/srd_adaptation/creatures.json"
];
function copyInto(dst) {
    for (const rel of COPY) {
        const from = path.join(ROOT, rel), to = path.join(dst, rel);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.cpSync(from, to, { recursive: true });
    }
}
const editJson = (root, rel, fn) => {
    const f = path.join(root, rel);
    const doc = JSON.parse(fs.readFileSync(f, "utf8"));
    fn(doc);
    fs.writeFileSync(f, JSON.stringify(doc, null, 1) + "\n", "utf8");
};
const editText = (root, rel, from, to) => {
    const f = path.join(root, rel);
    const text = fs.readFileSync(f, "utf8");
    if (!text.includes(from)) throw new Error(`mutant patch target not found in ${rel}: ${from}`);
    fs.writeFileSync(f, text.replace(from, to), "utf8");
};
const runBuilder = (root, extra) => spawnSync(process.execPath, [path.join(root, P.builder), "--root", root].concat(extra || []), { encoding: "utf8" });

const MUTANTS = [
    { name: "dup_plus_omit", red: ["source_output_bijection"], green: ["row_count_317"],
      apply: r => editJson(r, P.out, d => { d.entries[200] = JSON.parse(JSON.stringify(d.entries[100])); }) },
    { name: "srd51_edit", red: ["srd51_untouched"],
      apply: r => editText(r, P.srd, "Mucous Cloud", "Mucus Cloud") },
    { name: "tier_shift", red: ["tier_from_cr"],
      apply: r => editJson(r, P.out, d => { d.entries.find(e => e.tier === "T2").tier = "T3"; }) },
    { name: "drop_row", red: ["row_count_317", "source_output_bijection"],
      apply: r => editJson(r, P.out, d => { d.entries.pop(); }) },
    { name: "bad_cell", red: ["cells_valid"],
      apply: r => editJson(r, P.out, d => { d.entries.find(e => e.cells.length).cells[0].band = "Midlands"; }) },
    { name: "hand_edit", red: ["build_reproducible"], builderCheckFails: true,
      apply: r => editJson(r, P.out, d => { d.entries[0].note += " (hand edit)"; }) },
    { name: "verbatim_notes", red: ["no_old_world_name"],
      apply: r => {
          editText(r, P.builder, "note: r.note.replace(WORLD_NAME_FIX[0], WORLD_NAME_FIX[1]),", "note: r.note,");
          const b = runBuilder(r);
          if (b.status !== 0) throw new Error(`mutated builder failed: ${b.stderr}`);
      } },
    // Beyond the brief's list: one mutant per remaining check, so each is seen able to fail.
    { name: "exclude_given_cell", red: ["exclude_empty"],
      apply: r => editJson(r, P.out, d => { d.entries.find(e => e.role === "EXCLUDE").sky = true; }) },
    { name: "occupancy_count", red: ["occupancy_matches_source"],
      apply: r => editJson(r, P.out, d => { d.metadata.occupancy["COLD/Deep Earth"].T1 = 2; }) },
    { name: "placement_swap", red: ["placement_rules"],
      apply: r => editJson(r, P.out, d => { d.entries.find(e => e.placement === "summon").placement = "seeded"; }) },
    { name: "body_moved", red: ["bodies_consistent"],
      apply: r => editJson(r, P.out, d => {
          const from = d.entries.find(e => e.id === "srd:creature:panther"), to = d.entries.find(e => e.id === "srd:creature:cat");
          to.bodies = to.bodies.concat(from.bodies); from.bodies = [];
      }) },
    { name: "source_byte", red: ["source_pinned", "build_reproducible"],
      apply: r => editText(r, P.source, "Mind-eel of the oldest drowned hollows", "Mind-eel of the oldest drowned hollow") }
];

function runMutants() {
    let killedAll = true;
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "bestiary-mut-"));
    try {
        const chosen = ONLY_MUTANT ? MUTANTS.filter(m => m.name === ONLY_MUTANT) : MUTANTS;
        if (!chosen.length) { console.log(`FAIL ::mutant_${ONLY_MUTANT}_killed: no such mutant`); return false; }
        for (const m of chosen) {
            const root = path.join(base, m.name);
            copyInto(root);
            let problem = null;
            try { m.apply(root); } catch (e) { problem = `could not apply: ${e.message}`; }
            if (!problem) {
                const r = spawnSync(process.execPath, [__filename, "--root", root, "--no-mutants"], { encoding: "utf8" });
                const out = r.stdout || "";
                if (ONLY_MUTANT) console.log(`--- rerun under mutant ${m.name}, exit ${r.status} ---
${out.trim()}
---`);
                const failed = new Set([...out.matchAll(/^FAIL ::(\w+)/gm)].map(x => x[1]));
                const passed = new Set([...out.matchAll(/^PASS ::(\w+)/gm)].map(x => x[1]));
                const missRed = m.red.filter(n => !failed.has(n));
                const missGreen = (m.green || []).filter(n => !passed.has(n));
                if (r.status !== 1) problem = `test exit ${r.status}, want 1`;
                else if (missRed.length) problem = `still green: ${missRed.join(", ")}`;
                else if (missGreen.length) problem = `expected to stay green but did not: ${missGreen.join(", ")}`;
                if (!problem && m.builderCheckFails) {
                    const b = runBuilder(root, ["--check"]);
                    if (ONLY_MUTANT) console.log(`build_bestiary --check under mutant ${m.name}: exit ${b.status}; ${(b.stderr || b.stdout).trim()}`);
                    if (b.status !== 1) problem = `build_bestiary --check exit ${b.status}, want 1`;
                }
                if (!problem) console.log(`PASS ::mutant_${m.name}_killed (exit 1; red: ${[...failed].join(", ")})`);
            }
            if (problem) { killedAll = false; console.log(`FAIL ::mutant_${m.name}_killed: ${problem}`); }
        }
    } finally {
        fs.rmSync(base, { recursive: true, force: true });
    }
    return killedAll;
}

console.log(`test_bestiary_adaptation: root ${ROOT}`);
const results = runChecks();
let ok = results.every(r => r.ok);
if (RUN_MUTANTS) {
    if (!ok) console.log("mutant sweep skipped: the checks must pass on the real files first");
    else ok = runMutants() && ok;
}
console.log(ok ? "test_bestiary_adaptation: all checks passed" : "test_bestiary_adaptation: FAILED");
process.exit(ok ? 0 : 1);
