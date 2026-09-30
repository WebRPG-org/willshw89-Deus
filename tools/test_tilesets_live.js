const fs = require('fs');
const path = require('path');

const { runMain, createSnapshot, replaceOnce, runSuite } = require('./test_all_animated_objects_live');

runMain(() => {
const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = createSnapshot(ROOT, 'tilesets_live_v2');



const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'DEUS_Test.js');
let testJs = fs.readFileSync(testJsPath, 'utf8');

const hook = 'Test.suite("smoke", async t => {';
const injection = `Test.suite("smoke", async t => {
        if (window.$ufTime) window.$ufTime.setTime(12, 0);
        if (window.UF && UF.DayNight) UF.DayNight.toneFor = () => [0, 0, 0, 0];
        $gameScreen.startTint([0, 0, 0, 0], 1);

        // --- 1. Ground Level Showcase (Water, Shorelines, Biome Tiles) ---
        if (window.UF && UF.Levels && UF.Levels.setView) {
            UF.Levels.setView(0);
            await t.waitFrames(60);
        }

        const px = $gamePlayer.x, py = $gamePlayer.y;
        const w = $dataMap.width;

        // Paint fresh water pond
        for (let dy = -10; dy <= -6; dy++) {
            for (let dx = 2; dx <= 6; dx++) {
                if ((dx === 2 || dx === 6) && (dy === -10 || dy === -6)) continue; // rounded shore
                $dataMap.data[(py + dy) * w + (px + dx)] = 2048; // Fresh water
            }
        }

        // Cobblestone / road
        for (let dy = -10; dy <= -6; dy++) {
            for (let dx = 8; dx <= 12; dx++) {
                $dataMap.data[(py + dy) * w + (px + dx)] = 3968;
            }
        }

        // Sand
        for (let dy = -14; dy <= -11; dy++) {
            for (let dx = 5; dx <= 10; dx++) {
                $dataMap.data[(py + dy) * w + (px + dx)] = 3296;
            }
        }

        if (SceneManager._scene && SceneManager._scene._spriteset && SceneManager._scene._spriteset._tilemap) {
            SceneManager._scene._spriteset._tilemap.refresh();
        }
        await t.waitFrames(45);
        t.screenshot("live_tilesets_ground_v2");

        // --- 2. Underground Level (-1) Showcase (Walls & Subterranean Floors) ---
        if (window.UF && UF.Levels && UF.Levels.setView) {
            UF.Levels.setView(-1);
            await t.waitFrames(60);
            t.screenshot("live_tilesets_underground_v2");
        }
`;

testJs = replaceOnce(testJs, hook, injection);
fs.writeFileSync(testJsPath, testJs, 'utf8');

console.log('Running live in-game showcase test for Ground and Underground (-1)...');
runSuite(ROOT, SNAPSHOT_DIR, "smoke", ["live_tilesets_ground_v2","live_tilesets_underground_v2"]);
fs.mkdirSync(path.join(ROOT, 'art', 'review'), { recursive: true });

const shotGround = path.join(SNAPSHOT_DIR, 'test_output', 'smoke.live_tilesets_ground_v2.png');
const shotUnderground = path.join(SNAPSHOT_DIR, 'test_output', 'smoke.live_tilesets_underground_v2.png');

if (fs.existsSync(shotGround)) {
    fs.copyFileSync(shotGround, path.join(ROOT, 'art', 'review', 'nano_tilesets_v2_ground.png'));
    console.log('Copied to art/review/nano_tilesets_v2_ground.png');
}

if (fs.existsSync(shotUnderground)) {
    fs.copyFileSync(shotUnderground, path.join(ROOT, 'art', 'review', 'nano_tilesets_v2_underground.png'));
    console.log('Copied to art/review/nano_tilesets_v2_underground.png');
}

});
