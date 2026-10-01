// tools/test_area_generation_speed.js — WG.CELL-WRITE lane-dc.
// one_area_volume_ms: median of 3 cold first baseline(0,0,0) calls <= 5000 ms.
// no_rest_parameter_hash_on_generator_path: static, fails while hash32 or the
// generator rand/rnd wrappers still use a rest parameter, and while valueNoise
// still builds a per-corner closure.
// core_checksums_bit_identical: frozen fixture, gens 1-5, seeds 18 and 20260927,
// grids 1x1 and 3x3. Never rewrites the fixture on a normal run.
// --capture-fixture writes the fixture from the Levels source this process loaded.
// --mutant=hash_changed moves HASH_OFFSET so the fixture guard must fail.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const LEVELS_FILE = path.join(ROOT, "game", "js", "plugins", "DEUS_Levels.js");
const FIXTURE = path.join(ROOT, "tools", "fixtures", "levels", "core_checksums_gen1_5.json");
const SPEED_LIMIT_MS = 5000;
const TRIALS = 3;
const CORE = [-2, -1, 0, 1, 2];
const GENS = [1, 2, 3, 4, 5];
const SEEDS = [18, 20260927];
const GRIDS = [1, 3];
// Core checksums of a coupled seed-18 generator-5 1x1 New Game at -16..+15.
// Same bytes as BASE_LAYER_CHECKSUMS in tools/test_sparse_outer_save.js (index = z - (-16)).
const SPARSE_CORE_SEED18_GEN5 = { "-2": "95c997d4", "-1": "1ed786a5", "0": "1f5c2a72", "1": "eaf389b9", "2": "9998ffb2" };

const capture = process.argv.includes("--capture-fixture");
const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice("--mutant=".length);

const cat = JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/UF_WorldCatalog.json"), "utf8"));
const tilesets = JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/Tilesets.json"), "utf8"));

function readLevels() {
    let source = fs.readFileSync(LEVELS_FILE, "utf8");
    if (!mutant) return source;
    if (mutant !== "hash_changed") {
        console.error(`HARNESS unknown mutant ${mutant}`);
        process.exit(2);
    }
    const from = "const HASH_OFFSET = 2166136261;";
    if (source.indexOf(from) < 0 || source.indexOf(from) !== source.lastIndexOf(from)) {
        console.error("HARNESS mutant hash_changed: HASH_OFFSET target missing or not unique");
        process.exit(2);
    }
    return source.replace(from, "const HASH_OFFSET = 2166136262;");
}

function functionBody(source, name) {
    const re = new RegExp("function\\s+" + name + "\\s*\\(");
    const m = re.exec(source);
    if (!m) return null;
    const brace = source.indexOf("{", m.index);
    if (brace < 0) return null;
    let depth = 0;
    for (let i = brace; i < source.length; i++) {
        const ch = source[i];
        if (ch === "{") depth++;
        else if (ch === "}") {
            depth--;
            if (depth === 0) return source.slice(m.index, i + 1);
        }
    }
    return null;
}

function restHashHits(source) {
    const hits = [];
    const lines = source.split(/\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const n = i + 1;
        if (/function\s+hash32\w*\s*\([^)\n]*\.\.\./.test(line)) hits.push(`line ${n}: rest-parameter hash32`);
        if (line.includes("...") && /hash32/.test(line)) hits.push(`line ${n}: spread into hash32`);
        if (/\b(?:rand|rnd|rint|rfl)\s*=\s*\([^;\n]*\.\.\./.test(line)) hits.push(`line ${n}: rest rand/rnd/rint/rfl`);
        if (/\bfunction\s+(?:rand|rnd|rint|rfl)\s*\([^)\n]*\.\.\./.test(line)) hits.push(`line ${n}: rest function rand/rnd/rint/rfl`);
    }
    const noise = functionBody(source, "valueNoise");
    if (!noise) hits.push("valueNoise function missing");
    else if (noise.includes("=>")) hits.push("valueNoise still has a per-corner closure");
    return hits;
}

function makeEnv(areasX, areasY, levelsSource) {
    const env = {
        window: null, UF: {}, DEUS: {}, Math: Object.create(Math), console, performance,
        PluginManager: {
            parameters: () => ({ AreasX: String(areasX), AreasY: String(areasY) }),
            registerCommand: () => {}
        },
        DataManager: { _databaseFiles: [], onLoad: () => {}, isBattleTest: () => false, isEventTest: () => false },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        Input: { keyMapper: {} }, TouchInput: {},
        ImageManager: { loadTileset: () => ({}), loadCharacter: () => ({}), isBigCharacter: () => true },
        SceneManager: { _scene: null, goto() {} },
        Utils: { isOptionValid: () => false, encodeURI: s => s },
        Tilemap: function() {},
        $dataTilesets: tilesets,
        $ufWorldCatalog: cat,
        $deusWorldCatalog: cat,
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 8, minute: 0 },
        $gameSystem: {}, $gameScreen: { weatherType: () => "none", weatherPower: () => 0, changeWeather() {} },
        $gameTimer: {}, $gameSwitches: {}, $gameVariables: {}, $gameSelfSwitches: {}, $gameActors: {}, $gameParty: {}
    };
    env.window = env;
    env.Tilemap.TILE_ID_A1 = 2048;
    env.Tilemap.TILE_ID_A2 = 2816;
    env.Tilemap.isTileA1 = id => id >= 2048 && id < 2816;
    env.Tilemap.isWaterTile = id => env.Tilemap.isTileA1(id);
    for (const name of ["Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_Map", "Game_Player", "Game_CharacterBase", "Game_Character", "Game_Event", "Spriteset_Map", "Spriteset_Base"]) {
        env[name] = vm.runInNewContext(`(function ${name}(){})`);
        env[name].prototype.initialize = function() {};
    }
    env.Game_Character.prototype = Object.create(env.Game_CharacterBase.prototype);
    env.Game_Player.prototype = Object.create(env.Game_Character.prototype);
    env.Game_Event.prototype = Object.create(env.Game_Character.prototype);
    env.Scene_Boot.prototype.start = function() {};
    env.Scene_Boot.prototype.isReady = function() { return true; };
    env.Spriteset_Map.prototype.createCharacters = function() {};
    env.Sprite = vm.runInNewContext(`(function Sprite(bitmap) {
        this.anchor = { x: 0, y: 0, set(a, b) { this.x = a; this.y = b; } };
        this.children = []; this.parent = null; this.visible = true; this.bitmap = bitmap || null; this.x = 0; this.y = 0; this.z = 0;
    })`);
    Object.assign(env.Sprite.prototype, { update() {}, addChild(c) { c.parent = this; this.children.push(c); return c; } });
    env.Bitmap = vm.runInNewContext(`(function Bitmap(w, h) {
        this.width = w || 0; this.height = h || 0;
        this.context = { imageSmoothingEnabled: false, drawImage() {}, putImageData() {}, fillRect() {} };
        this._baseTexture = { update() {} };
    })`);
    Object.assign(env.Bitmap.prototype, { isReady() { return true; }, isError() { return false; }, clear() {}, clearRect() {}, fillRect() {}, blt() {} });
    env.Bitmap.load = () => ({ isReady: () => false, isError: () => false });
    Object.assign(env.Game_Map.prototype, {
        mapId() { return this._mapId || 0; }, width: () => 256, height: () => 256, update() {}, tileId: () => 0, tilesetFlags: () => [],
        isPassable: () => true, checkPassage: () => true
    });
    env.$gameMap = new env.Game_Map();
    env.$gamePlayer = new env.Game_Player();
    for (const f of ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Levels.js"]) {
        const src = f === "DEUS_Levels.js" ? levelsSource : fs.readFileSync(path.join(ROOT, "game/js/plugins", f), "utf8");
        vm.runInNewContext(src, env, { filename: f });
    }
    return env;
}

function areaList(n) {
    const areas = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) areas.push({ x, y });
    return areas;
}

function openWorld(env, seed, areasX, areasY) {
    const st = env.UF.World.newWorld(seed);
    const problems = [];
    if (!st) problems.push("newWorld returned nothing");
    else {
        if (st.areasX !== areasX || st.areasY !== areasY) problems.push(`world grid ${st.areasX}x${st.areasY} wanted ${areasX}x${areasY}`);
        if (st.seed !== seed) problems.push(`world seed ${st.seed} wanted ${seed}`);
        const cx = Math.floor(areasX / 2), cy = Math.floor(areasY / 2);
        if (!st.startArea || st.startArea.x !== cx || st.startArea.y !== cy) problems.push(`startArea ${JSON.stringify(st.startArea)} wanted ${cx},${cy}`);
        if (!st.zRange || st.zRange.zMin !== -16 || st.zRange.zMax !== 15) problems.push(`zRange ${JSON.stringify(st.zRange)} wanted -16..15`);
        st.verticalBiomeCoupling = true;
    }
    const desc = st && {
        seed: st.seed,
        size: st.size,
        areasX: st.areasX,
        areasY: st.areasY,
        startArea: { x: st.startArea.x, y: st.startArea.y },
        verticalBiomeCoupling: true,
        zRange: { zMin: st.zRange.zMin, zMax: st.zRange.zMax }
    };
    return { st, desc, problems };
}

function checksumCase(env, seed, gen, areasX, areasY) {
    const opened = openWorld(env, seed, areasX, areasY);
    if (opened.problems.length) return { problems: opened.problems, checksums: null, ms: 0 };
    const t0 = performance.now();
    const checksums = {};
    for (const z of CORE) checksums[String(z)] = env.UF.Levels.checksum(z, seed, gen, opened.desc);
    return { problems: [], checksums, ms: performance.now() - t0, startArea: opened.desc.startArea };
}

function collectCases(levelsSource) {
    const cases = [];
    const problems = [];
    for (const grid of GRIDS) {
        const env = makeEnv(grid, grid, levelsSource);
        for (const seed of SEEDS) for (const gen of GENS) {
            const row = checksumCase(env, seed, gen, grid, grid);
            const label = `gen ${gen} seed ${seed} ${grid}x${grid}`;
            if (row.problems.length) {
                problems.push(`${label}: ${row.problems.join("; ")}`);
                console.log(`checksum ${label} GRID_REJECT ${row.problems.join("; ")}`);
                continue;
            }
            const bad = CORE.filter(z => typeof row.checksums[String(z)] !== "string" || !/^[0-9a-f]{8}$/.test(row.checksums[String(z)]));
            if (bad.length) problems.push(`${label}: bad checksum at z ${bad.join(",")}`);
            cases.push({
                gen, seed, areasX: grid, areasY: grid,
                startArea: row.startArea,
                areas: areaList(grid),
                coreLevels: CORE.slice(),
                checksums: row.checksums
            });
            console.log(`checksum ${label} ${row.ms.toFixed(1)} ms z0 ${row.checksums["0"]}`);
        }
    }
    return { cases, problems };
}

function assertDistinct(cases) {
    const problems = [];
    const key = c => `${c.seed}:${c.areasX}:${c.gen}`;
    const by = new Map(cases.map(c => [key(c), JSON.stringify(c.checksums)]));
    for (const seed of SEEDS) for (const grid of GRIDS) {
        const vectors = GENS.map(gen => by.get(`${seed}:${grid}:${gen}`));
        for (let i = 0; i < GENS.length; i++) for (let j = i + 1; j < GENS.length; j++) {
            if (vectors[i] && vectors[i] === vectors[j]) problems.push(`gen ${GENS[i]} and gen ${GENS[j]} checksums match at seed ${seed} ${grid}x${grid}`);
        }
    }
    for (const seed of SEEDS) for (const gen of GENS) {
        const a = by.get(`${seed}:1:${gen}`), b = by.get(`${seed}:3:${gen}`);
        if (a && b && a === b) problems.push(`gen ${gen} seed ${seed} 3x3 checksums match 1x1`);
    }
    return problems;
}

function caseKey(c) {
    return `g${c.gen}_s${c.seed}_${c.areasX}x${c.areasY}`;
}

function medianOf(samples) {
    const s = samples.slice().sort((a, b) => a - b);
    return s[(s.length - 1) >> 1];
}

function timeOneArea(levelsSource) {
    const samples = [];
    for (let i = 0; i < TRIALS; i++) {
        const env = makeEnv(1, 1, levelsSource);
        const opened = openWorld(env, 18, 1, 1);
        if (opened.problems.length) {
            console.log(`one_area_volume_ms trial ${i + 1} setup ${opened.problems.join("; ")}`);
            samples.push(Number.POSITIVE_INFINITY);
            continue;
        }
        // Speed contract matches the PM probe: coupling left as newWorld wrote it
        // (undefined in this vm, no Events). The checksum cases set coupling themselves.
        opened.st.verticalBiomeCoupling = undefined;
        const t0 = performance.now();
        const b = env.UF.Levels.baseline(0, 0, 0);
        const ms = performance.now() - t0;
        const stats = env.UF.Levels.stats();
        if (!b || b.z !== 0 || !(stats.lastGenMs > 0)) {
            console.log(`one_area_volume_ms trial ${i + 1} not a cold volume z=${b && b.z} lastGenMs=${stats && stats.lastGenMs}`);
            samples.push(Number.POSITIVE_INFINITY);
        } else samples.push(ms);
        console.log(`one_area_volume_ms sample ${i + 1} ${samples[samples.length - 1].toFixed(1)} ms`);
    }
    return samples;
}

function sourceSha() {
    try {
        const { execFileSync } = require("child_process");
        return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
    } catch (_) {
        return null;
    }
}

let failed = 0;
function report(name, ok, detail) {
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " - " + detail : ""}`);
}

if (capture && mutant) {
    console.error("HARNESS --capture-fixture refuses --mutant (the fixture is the unmodified generator)");
    process.exit(2);
}

const levelsSource = readLevels();
console.log(`area generation speed${mutant ? " mutant " + mutant : ""}${capture ? " CAPTURE" : ""}`);

const restHits = restHashHits(levelsSource);
report("no_rest_parameter_hash_on_generator_path", restHits.length === 0, restHits.slice(0, 6).join("; "));

if (capture) {
    const got = collectCases(levelsSource);
    const distinct = assertDistinct(got.cases);
    const problems = got.problems.concat(distinct);
    const seed18 = got.cases.find(c => c.gen === 5 && c.seed === 18 && c.areasX === 1);
    if (!seed18) problems.push("missing gen 5 seed 18 1x1");
    else for (const z of CORE) {
        const have = seed18.checksums[String(z)];
        const want = SPARSE_CORE_SEED18_GEN5[String(z)];
        if (have !== want) problems.push(`sparse core z ${z} ${have} != ${want}`);
    }
    if (got.cases.length !== GENS.length * SEEDS.length * GRIDS.length) problems.push(`case count ${got.cases.length}`);
    if (problems.length) {
        console.error("CAPTURE refused:\n" + problems.join("\n"));
        process.exit(1);
    }
    const fixture = {
        sourceSha: sourceSha(),
        capturedOn: "2026-10-01",
        coreLevels: CORE.slice(),
        zRange: { zMin: -16, zMax: 15 },
        size: 256,
        verticalBiomeCoupling: true,
        note: "Checksums cover coreLevels only. areas lists every area coordinate folded into each checksum. startArea is the grid center. zRange -16..+15 is the New Game range (deep cuts are in the generator-5 bytes). Captured from the pre-optimization lane base; normal runs compare these bytes and do not regenerate them.",
        cases: got.cases
    };
    fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
    fs.writeFileSync(FIXTURE, JSON.stringify(fixture, null, 2) + "\n");
    console.log(`CAPTURE wrote ${FIXTURE} sha ${fixture.sourceSha} cases ${got.cases.length}`);
    process.exit(0);
}

if (mutant) {
    console.log("one_area_volume_ms SKIP mutant (the mutant's named check is core_checksums_bit_identical)");
} else {
    const samples = timeOneArea(levelsSource);
    const finite = samples.filter(n => Number.isFinite(n));
    const median = finite.length === samples.length ? medianOf(samples) : Number.POSITIVE_INFINITY;
    console.log(`one_area_volume_ms samples ${samples.map(n => Number.isFinite(n) ? n.toFixed(1) : "inf").join(" ")} median ${Number.isFinite(median) ? median.toFixed(1) : "inf"}`);
    report("one_area_volume_ms", median <= SPEED_LIMIT_MS, `median ${Number.isFinite(median) ? median.toFixed(1) : "inf"} ms, limit ${SPEED_LIMIT_MS}`);
}

if (!fs.existsSync(FIXTURE)) {
    console.error("HARNESS fixture missing: " + FIXTURE);
    process.exit(2);
}
const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const live = collectCases(levelsSource);
const problems = live.problems.concat(assertDistinct(live.cases));
if (!fixture || !Array.isArray(fixture.cases) || fixture.cases.length !== GENS.length * SEEDS.length * GRIDS.length) {
    problems.push("fixture does not hold 20 cases");
}
if (!fixture.coreLevels || JSON.stringify(fixture.coreLevels) !== JSON.stringify(CORE)) problems.push("fixture coreLevels are not -2..+2");
const wantAreas = grid => JSON.stringify(areaList(grid));
for (const c of fixture.cases || []) {
    if (JSON.stringify(c.areas) !== wantAreas(c.areasX)) problems.push(`fixture areas for ${caseKey(c)} are not the ${c.areasX}x${c.areasY} grid`);
    if (!c.startArea || c.startArea.x !== Math.floor(c.areasX / 2) || c.startArea.y !== Math.floor(c.areasY / 2)) problems.push(`fixture startArea for ${caseKey(c)}`);
}
const liveBy = new Map(live.cases.map(c => [caseKey(c), c]));
for (const c of fixture.cases || []) {
    const got = liveBy.get(caseKey(c));
    if (!got) { problems.push(`missing live ${caseKey(c)}`); continue; }
    for (const z of CORE) {
        if (got.checksums[String(z)] !== c.checksums[String(z)]) problems.push(`${caseKey(c)} z ${z} ${got.checksums[String(z)]} != ${c.checksums[String(z)]}`);
    }
}
const seed18 = (fixture.cases || []).find(c => c.gen === 5 && c.seed === 18 && c.areasX === 1);
if (!seed18) problems.push("fixture missing gen 5 seed 18 1x1");
else for (const z of CORE) {
    if (seed18.checksums[String(z)] !== SPARSE_CORE_SEED18_GEN5[String(z)]) problems.push(`fixture sparse core z ${z} ${seed18.checksums[String(z)]} != ${SPARSE_CORE_SEED18_GEN5[String(z)]}`);
}
report("core_checksums_bit_identical", problems.length === 0, problems.slice(0, 8).join("; "));

console.log(failed === 0 ? "RESULT pass" : `RESULT fail ${failed}`);
process.exit(failed === 0 ? 0 : 1);
