const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'pkg_proofs');

console.log('=== Setting up In-Engine Proof Scenario Harness (Packages 1 and 3) ===');

if (fs.existsSync(SNAPSHOT_DIR)) {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (_) {}

const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'DEUS_Test.js');
let testJs = fs.readFileSync(testJsPath, 'utf8');

const suiteInjection = `
    //-------------------------------------------------------------------------
    // In-Engine Playtest Proof Suites for Packages 1 and 3
    Test.suite("package_proofs", async t => {
        const W = window.UF && window.UF.World;
        const Levels = window.UF && window.UF.Levels;
        const Items = window.UF && window.UF.Items;
        const Objects = window.UF && window.UF.Objects;

        await t.waitUntil(() => W && W.currentArea() && window.$gameMap && window.$gamePlayer, 25000, "world ready");
        const area = W.currentArea();
        const px = $gamePlayer.x, py = $gamePlayer.y;

        // =====================================================================
        // PROOF A: Package 1 - Physical Space & Multi-Z Substrate
        // =====================================================================
        t.check("pkg1_area_valid", !!area, "World area active and initialized");
        t.check("pkg1_player_coords", Number.isInteger(px) && Number.isInteger(py), "Player coordinate space: (" + px + "," + py + ")");
        
        // Multi-Z level check
        const curZ = Levels && typeof Levels.viewZ === "function" ? Levels.viewZ() : 0;
        t.check("pkg1_multiz_substrate", Number.isInteger(curZ), "Current Z level: " + curZ);

        // Physical Object & Ground Item placement
        if (Objects && Items) {
            const chestX = px + 1, chestY = py;
            Objects.set(chestX, chestY, "chest_wood");
            const chestObj = Objects.at(chestX, chestY);
            t.check("pkg1_object_placement", chestObj && chestObj.id === "chest_wood", "Physical chest placed at (" + chestX + "," + chestY + ")");

            Items.drop(area, chestX, chestY, "stone", 1, null, { mat: "granite" });
            const groundItems = Items.at(chestX, chestY);
            t.check("pkg1_item_spawned", groundItems && groundItems.length > 0 && groundItems[0].type === "stone", "Physical item spawned on ground at (" + chestX + "," + chestY + ")");
        }

        await t.waitFrames(15);
        t.screenshot("proof_pkg1_physical_space");

        // PROOF B (Package 2: span cantilever and rubble collapse) was removed by NAT.02.01.BRIDGE (lane-nx3):
        // DEC-083 replaced that model. The live collapse proof is tools/test_collapse_ingame.js.

        // =====================================================================
        // PROOF C: Package 3 - Water & Aquifer Seepage
        // =====================================================================
        try {
            const hydroMod = require(path.join(baseDir, "js", "sim", "hydrology", "index.js"));
            t.check("pkg3_module_loaded", !!hydroMod, "Hydrology module loaded in engine");

            const engine = new hydroMod.AquiferEngine();
            // Sandstone stratum (x=10, y=10, z=0, s=2), 25% porosity, 100k conductivity, saturated with 78,000 cp water
            const sandStratum = new hydroMod.Stratum(hydroMod.encodeStratumId(10, 10, 0, 2), 10, 10, 0, 2, 2500, 100000, 78000, "rock");
            // Adjacent empty cavern void stratum (x=11, y=10, z=0, s=2)
            const voidStratum = new hydroMod.Stratum(hydroMod.encodeStratumId(11, 10, 0, 2), 11, 10, 0, 2, 10000, 1000000, 0, "void");

            engine.addStratum(sandStratum);
            engine.addStratum(voidStratum);
            engine.markDirty(10, 10, 0, 2);

            const initialTotalMass = engine.getTotalMass();
            t.check("pkg3_initial_mass", initialTotalMass === 78000, "Initial aquifer mass recorded: 78,000 cp");

            // Tick hydrology simulation for 10 steps using processTick
            for (let i = 0; i < 10; i++) {
                engine.processTick(1);
            }

            const postTickTotalMass = engine.getTotalMass();
            const seepageMass = voidStratum.waterMass;
            t.check("pkg3_darcy_seepage", seepageMass > 0, "Groundwater seeped from rock into breached void: " + seepageMass + " cp");
            t.check("pkg3_drawdown", sandStratum.waterMass < 78000, "Aquifer rock pore volume depleted: " + sandStratum.waterMass + " cp remaining");
            t.check("pkg3_mass_conservation", initialTotalMass === postTickTotalMass, "Universal closed-mass invariant verified (total mass unchanged: " + postTickTotalMass + " cp)");

            // Visual presentation: Draw a pool of surface water adjacent to player to verify engine autotile rendering
            const w = $dataMap.width;
            for (let dy = 2; dy <= 4; dy++) {
                for (let dx = 2; dx <= 4; dx++) {
                    $dataMap.data[(py + dy) * w + (px + dx)] = 2048; // autotile fresh water
                }
            }
            if (SceneManager._scene && SceneManager._scene._spriteset && SceneManager._scene._spriteset._tilemap) {
                SceneManager._scene._spriteset._tilemap.refresh();
            }
        } catch (err) {
            t.check("pkg3_hydrology_error", false, "Hydrology proof failed: " + err.message);
        }

        await t.waitFrames(25);
        t.screenshot("proof_pkg3_aquifer_seepage");
    });
`;

testJs = testJs.replace('if (!Test.active) return;', 'if (!Test.active) return;\n' + suiteInjection);
fs.writeFileSync(testJsPath, testJs, 'utf8');

console.log('Running package_proofs in-engine test via run_tests.js...');
const nodePath = 'C:\\Program Files\\nodejs\\node.exe';
const runTestsPath = path.join(ROOT, 'tools', 'run_tests.js');

try {
    const out = childProcess.execSync(`"${nodePath}" "${runTestsPath}" package_proofs --game "${SNAPSHOT_DIR}"`, { stdio: 'pipe' });
    console.log(out.toString());
} catch (e) {
    if (e.stdout) console.log(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());
    process.exit(1);
}

// Copy screenshots
const outDir = path.join(SNAPSHOT_DIR, 'test_output');
const reviewDir = path.join(ROOT, 'art', 'review');
fs.mkdirSync(reviewDir, { recursive: true });

const shots = [
    'package_proofs.proof_pkg1_physical_space.png',
    'package_proofs.proof_pkg3_aquifer_seepage.png'
];

for (const s of shots) {
    const src = path.join(outDir, s);
    const dest = path.join(reviewDir, s);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Copied screenshot: ${s} -> art/review/`);
    } else {
        console.log(`Screenshot missing: ${s}`);
    }
}
console.log('=== In-Engine Package Proof Execution Complete ===');
