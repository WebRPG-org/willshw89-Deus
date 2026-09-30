const fs = require('fs');
const path = require('path');

const { runMain, createSnapshot, replaceOnce, runSuite } = require('./test_all_animated_objects_live');

runMain(() => {
const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = createSnapshot(ROOT, 'underground_room_review');



const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'DEUS_Test.js');
let testJs = fs.readFileSync(testJsPath, 'utf8');

const hook = 'Test.suite("smoke", async t => {';
const injection = `Test.suite("smoke", async t => {
        // Set time to noon and clear DayNight underground tone for clear visual review
        if (window.$ufTime) {
            window.$ufTime.setTime(12, 0);
        }
        if (window.UF && UF.DayNight) {
            UF.DayNight.toneFor = () => [0, 0, 0, 0];
        }
        $gameScreen.startTint([0, 0, 0, 0], 1);

        // Switch to Level -1
        if (window.UF && UF.Levels && UF.Levels.setView) {
            UF.Levels.setView(-1);
            await t.waitFrames(60);

            $gameScreen.startTint([0, 0, 0, 0], 1);
            await t.waitFrames(30);

            t.screenshot("underground_noon_room");
        }
`;

testJs = replaceOnce(testJs, hook, injection);
fs.writeFileSync(testJsPath, testJs, 'utf8');

console.log('Running noon underground test...');
runSuite(ROOT, SNAPSHOT_DIR, "smoke", ["underground_noon_room"]);
fs.mkdirSync(path.join(ROOT, 'art', 'review'), { recursive: true });

const shot = path.join(SNAPSHOT_DIR, 'test_output', 'smoke.underground_noon_room.png');
if (fs.existsSync(shot)) {
    fs.copyFileSync(shot, path.join(ROOT, 'art', 'review', 'nano_underground_noon_room.png'));
    console.log('Saved screenshot to art/review/nano_underground_noon_room.png');
}

});
