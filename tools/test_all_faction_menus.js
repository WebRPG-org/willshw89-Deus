const fs = require('fs');
const path = require('path');

const { runMain, createSnapshot, runSuite } = require('./test_all_animated_objects_live');

runMain(() => {
const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = createSnapshot(ROOT, 'faction_menus_all');
const BRAIN_DIR = 'C:\\Users\\snewt\\.gemini\\antigravity\\brain\\f9b9af6f-1902-44c2-8bc1-fe9d0fdadb45';

console.log(`Setting up in-game faction menus test snapshot at: ${SNAPSHOT_DIR}`);

// Require the actual registered implementations; a missing plugin must fail.
const pluginsJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins.js');
const pluginsText = fs.readFileSync(pluginsJsPath, 'utf8');
for (const name of ['FactionMenus', 'Test']) {
    if (!new RegExp('"name"\\s*:\\s*"(?:DEUS_|UF_)' + name + '"\\s*,\\s*"status"\\s*:\\s*true').test(pluginsText)) {
        throw new Error(`${name} must be enabled in snapshot plugins.js`);
    }
}

// 3. Run the snapshot test with faction_menus suite
console.log('Launching NW.js test harness on snapshot for faction_menus suite...');
runSuite(ROOT, SNAPSHOT_DIR, "faction_menus", ["menu_clean_default","menu_clean_deus","menu_clean_human","menu_clean_elf","menu_clean_dwarf","menu_clean_halfling","menu_clean_gnome","menu_clean_dragonborn","menu_clean_half-elf","menu_clean_half-orc","menu_clean_tiefling"]);

// 4. Copy screenshots to game/test_output and brain artifacts folder
const gameOutDir = path.join(ROOT, 'game', 'test_output');
fs.mkdirSync(gameOutDir, { recursive: true });
const snapOutDir = path.join(SNAPSHOT_DIR, 'test_output');

if (fs.existsSync(snapOutDir)) {
    const files = fs.readdirSync(snapOutDir);
    for (const f of files) {
        if (f.endsWith('.png')) {
            const src = path.join(snapOutDir, f);
            const dst = path.join(gameOutDir, f);
            fs.copyFileSync(src, dst);
            console.log(`Copied screenshot to game/test_output/${f}`);

            if (fs.existsSync(BRAIN_DIR)) {
                fs.copyFileSync(src, path.join(BRAIN_DIR, f));
                console.log(`Copied screenshot to brain/${f}`);
            }
        }
    }
}

console.log('Done testing all faction menus!');

});
