const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

// Shared by this bounded set of live wrappers; importing never launches a test.
// Keep one result/artifact contract without adding a seventeenth tools file.
function runMain(test) {
    try { test(); }
    catch (error) {
        console.error(`FAIL ${error.stack || error}`);
        process.exitCode = 1;
    }
}

function checkChild(child, label) {
    if (child.stdout) console.log(String(child.stdout));
    if (child.stderr) console.error(String(child.stderr));
    if (child.error || child.signal || child.status !== 0) {
        throw new Error(`${label}: child status=${child.status}, signal=${child.signal || 'none'}: ${child.error || ''}`);
    }
}

function createSnapshot(root, name) {
    const snapshot = fs.mkdtempSync(path.join(os.tmpdir(), `deus_${name}_`));
    const source = path.join(root, 'game');
    // A unique directory and excluded old evidence prevent stale screenshots/results.
    // Retain snapshots for diagnosis; never remove someone else's fixed temp folder.
    const copy = childProcess.spawnSync('robocopy', [source, snapshot, '/E', '/NDL', '/NFL', '/NJH', '/NJS',
        '/nc', '/ns', '/np', '/XD', path.join(source, 'test_output'), path.join(source, 'save')],
    { encoding: 'utf8', timeout: 120000, windowsHide: true });
    // Robocopy 0..7 are successful; 8+ is a copy failure (null is launch/timeout failure).
    if (copy.error || copy.signal || !Number.isInteger(copy.status) || copy.status < 0 || copy.status >= 8) {
        throw new Error(`snapshot copy failed: status=${copy.status}: ${copy.error || copy.stderr || ''}`);
    }
    if (fs.existsSync(path.join(snapshot, 'test_output'))) throw new Error('snapshot contains stale test_output');
    return snapshot;
}

function replaceOnce(source, hook, replacement) {
    if (source.split(hook).length !== 2) throw new Error(`expected exactly one injection hook: ${hook}`);
    return source.replace(hook, () => replacement);
}

function verifyScreenshot(file) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size === 0) {
        throw new Error(`missing or empty screenshot: ${file}`);
    }
    const { decodePNG } = require('./png_read');
    const img = decodePNG(fs.readFileSync(file), file);
    if (!(img.width > 0 && img.height > 0) || !img.data.some((v, i) => i % 4 === 3 && v > 0)) {
        throw new Error(`screenshot has no visible pixels: ${file}`);
    }
}

function verifyArtifacts(snapshot, suite, shots) {
    const output = path.join(snapshot, 'test_output');
    const report = fs.readFileSync(path.join(output, 'results.txt'), 'utf8');
    const lines = report.trim().split(/\r?\n/);
    const summary = /^RESULT: (\d+) passed, (\d+) failed \(exit (\d+)\)$/.exec(lines[lines.length - 1]);
    const passes = lines.filter(line => /^PASS /.test(line));
    if (!summary || Number(summary[1]) < 1 || Number(summary[2]) !== 0 || Number(summary[3]) !== 0 ||
        Number(summary[1]) !== passes.length || lines.filter(line => /^RESULT:/.test(line)).length !== 1 ||
        /\b(?:FAIL|ERROR)\b/.test(report) || !passes.some(line => line.startsWith(`PASS ${suite}.`))) {
        throw new Error(`invalid or failed ${suite} results: ${report}`);
    }
    if (!shots.length) throw new Error(`no expected screenshots specified for ${suite}`);
    for (const shot of shots) verifyScreenshot(path.join(output, `${suite}.${shot}.png`));
}

function runSuite(root, snapshot, suite, shots) {
    const child = childProcess.spawnSync(process.execPath,
        [path.join(root, 'tools', 'run_tests.js'), suite, '--game', snapshot],
        { cwd: root, encoding: 'utf8', timeout: 270000, windowsHide: true });
    checkChild(child, suite);
    verifyArtifacts(snapshot, suite, shots);
}

module.exports = { runMain, checkChild, createSnapshot, replaceOnce, verifyScreenshot, verifyArtifacts, runSuite };

if (require.main === module) runMain(() => {

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = createSnapshot(ROOT, 'animated_objects_live');

console.log(`Setting up animated objects live test snapshot at: ${SNAPSHOT_DIR}`);

// Sync game/ to snapshot using robocopy

// Modify UF_Anim.js in snapshot to inject a live scene of all animated object categories
const animJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'DEUS_Anim.js');
let animJs = fs.readFileSync(animJsPath, 'utf8');

const hookPoint = 'const objectsBefore = cat.objects;';
const injection = `
        // Injected Live Animated Objects Showcase Test
        {
            await t.waitUntil(() => window.UF && UF.World && UF.World.currentArea() && window.$gameMap, 25000, "world area ready");
            const W = UF.World, O = UF.Objects, Anim = UF.Anim;
            const area = W.currentArea();
            const cx = Math.floor(W.state.size / 2), cy = Math.floor(W.state.size / 2);

            // Clean 12x8 area around center
            for (let dy = -4; dy <= 4; dy++) {
                for (let dx = -6; dx <= 6; dx++) {
                    O.setIn(area, cx + dx, cy + dy, null);
                }
            }

            // Move colonists clear
            const colList = (window.UF && UF.Colonists && UF.Colonists.list && UF.Colonists.list()) || [];
            for (const c of colList) {
                if (Math.abs(c.x - cx) <= 7 && Math.abs(c.y - cy) <= 5) {
                    c.x = cx; c.y = cy + 7;
                }
            }

            // Place objects from different animation categories
            // Row -2: Plants & Foliage (sway)
            O.setIn(area, cx - 5, cy - 2, "grass_tuft");
            O.setIn(area, cx - 3, cy - 2, "reeds");
            O.setIn(area, cx - 1, cy - 2, "flowers");
            O.setIn(area, cx + 1, cy - 2, "wild_grain");
            O.setIn(area, cx + 3, cy - 2, "fern");
            O.setIn(area, cx + 5, cy - 2, "berry_bush");

            // Row 0: Fire & Water
            O.setIn(area, cx - 4, cy, "bush");
            O.setIn(area, cx - 1, cy, "campfire");
            O.setIn(area, cx + 2, cy, "well");
            O.setIn(area, cx + 4, cy, "lily_pad");

            // Row +2: Cavern Flora, Fungi & Crystals
            O.setIn(area, cx - 4, cy + 2, "glow_caps");
            O.setIn(area, cx - 2, cy + 2, "cave_mushrooms");
            O.setIn(area, cx + 0, cy + 2, "cave_moss");
            O.setIn(area, cx + 2, cy + 2, "crystal");
            O.setIn(area, cx + 4, cy + 2, "crystal_spire");

            $gamePlayer.locate(cx, cy);
            await t.waitFrames(15);

            // Observe animation frames cycling across 45 frames
            const testCells = [
                { id: "campfire", x: cx - 1, y: cy, state: "lit" },
                { id: "grass_tuft", x: cx - 5, y: cy - 2, state: "sway" },
                { id: "reeds", x: cx - 3, y: cy - 2, state: "sway" },
                { id: "flowers", x: cx - 1, y: cy - 2, state: "sway" },
                { id: "glow_caps", x: cx - 4, y: cy + 2, state: "idle" },
                { id: "crystal", x: cx + 2, y: cy + 2, state: "idle" },
                { id: "well", x: cx + 2, y: cy, state: "idle" }
            ];

            const colsSeen = testCells.map(() => new Set());
            for (let f = 0; f < 45; f++) {
                await t.waitFrames(1);
                testCells.forEach((c, idx) => {
                    const info = Anim.objectAt(c.x, c.y);
                    if (info && info.col !== null && info.col !== undefined) {
                        colsSeen[idx].add(info.col);
                    }
                });
            }

            t.screenshot("live_animated_objects_scene");

            testCells.forEach((c, idx) => {
                const seen = Array.from(colsSeen[idx]).sort((a,b) => a - b);
                const animated = seen.length >= 2;
                t.check("anim_step_" + c.id, animated, c.id + " animated across frames: " + seen.join(",") + " (state " + c.state + ")");
            });
        }
`;

animJs = replaceOnce(animJs, hookPoint, injection + '\n' + hookPoint);
fs.writeFileSync(animJsPath, animJs, 'utf8');

console.log('Running live in-engine NW.js test...');
runSuite(ROOT, SNAPSHOT_DIR, "anim", ["live_animated_objects_scene"]);
fs.mkdirSync(path.join(ROOT, 'art', 'review'), { recursive: true });

// Copy screenshots to art/review/
const testOut = path.join(SNAPSHOT_DIR, 'test_output');
if (fs.existsSync(testOut)) {
    const files = fs.readdirSync(testOut);
    for (const f of files) {
        if (f.endsWith('.png')) {
            const dest = path.join(ROOT, 'art', 'review', f);
            fs.copyFileSync(path.join(testOut, f), dest);
            console.log(`Copied review screenshot to: ${dest}`);
        }
    }
}

});
