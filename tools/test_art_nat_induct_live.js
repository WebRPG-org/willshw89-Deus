const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'art_nat_live');

if (fs.existsSync(SNAPSHOT_DIR)) {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'DEUS_Test.js');
let testJs = fs.readFileSync(testJsPath, 'utf8');

const suiteCode = `
Test.suite("art_nat_live", async t => {
    await t.waitUntil(() => window.UF && UF.World && UF.World.currentArea() && window.$gameMap, 25000, "world area ready").catch(() => {});
    const W = World(), O = Objects(), area = W && W.currentArea();
    const cx = $gamePlayer.x, cy = $gamePlayer.y;

    // clear area
    for(let y = cy - 10; y < cy + 10; y++) {
        for(let x = cx - 10; x < cx + 10; x++) {
            O.setIn(area, x, y, null);
        }
    }

    // 1. Broadleaf forest (oak, birch, bush, tufts, white flowers)
    O.setIn(area, cx-4, cy-4, 'oak');
    O.setIn(area, cx-2, cy-4, 'birch');
    O.setIn(area, cx-4, cy-2, 'bush');
    O.setIn(area, cx-2, cy-2, 'grass_tuft');
    O.setIn(area, cx-3, cy-3, 'flowers_white');

    // 2. Conifer stand (pine)
    O.setIn(area, cx+4, cy-4, 'pine');
    O.setIn(area, cx+6, cy-4, 'pine');

    // 3. Swamp (swamp tree)
    O.setIn(area, cx-4, cy+4, 'tree_swamp');
    O.setIn(area, cx-2, cy+4, 'tree_swamp');

    // 4. A tree just felled, showing its own stump
    O.setIn(area, cx+4, cy+4, 'oak'); 
    
    O.refresh();
    await t.waitFrames(30);
    $gamePlayer.locate(cx, cy);
    await t.waitFrames(15);
    
    t.screenshot("live_art_nat_induct_1x");
    
    UF.Jobs.create({ type: "chop", params: { area: area, x: cx+4, y: cy+4 }, owner: "home" });
    
    const unit = UF.Colonists.create({ x: cx+5, y: cy+4, faction: 'home', type: 'colonist' });
    
    await t.waitFrames(300); // 5 seconds to chop
    t.screenshot("live_art_nat_induct_chop");
});
`;

testJs = testJs.replace('Test.run();', suiteCode + '\nTest.run();');
fs.writeFileSync(testJsPath, testJs, 'utf8');

// Ensure Test plugin is active
try {
    childProcess.execSync(`"C:\\Program Files\\nodejs\\node.exe" "${path.join(ROOT, 'tools', 'add_test_plugin.js')}" "${path.join(SNAPSHOT_DIR, 'js', 'plugins.js')}"`, { stdio: 'ignore' });
} catch (e) {}

console.log('Running test harness on snapshot...');
try {
    const output = childProcess.execSync(
        `"C:\\Program Files\\nodejs\\node.exe" "${path.join(ROOT, 'tools', 'run_tests.js')}" art_nat_live --game "${SNAPSHOT_DIR}"`,
        { stdio: 'pipe' }
    ).toString();
    console.log(output);
} catch (err) {
    console.error('Test execution failed:');
    if (err.stdout) console.log(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    process.exit(1);
}

const REVIEW_DIR = path.join(ROOT, 'art', 'review');
if (!fs.existsSync(REVIEW_DIR)) fs.mkdirSync(REVIEW_DIR, { recursive: true });

for (const name of ['live_art_nat_induct_1x', 'live_art_nat_induct_chop']) {
    const src = path.join(SNAPSHOT_DIR, 'test_output', 'art_nat_live.' + name + '.png');
    const dst = path.join(REVIEW_DIR, name + '.png');
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
        console.log("Copied " + name + " to art/review");
    } else {
        console.log("Missing screenshot: " + src);
    }
}
