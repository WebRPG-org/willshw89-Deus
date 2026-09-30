"use strict";
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { runMain, createSnapshot, replaceOnce, checkChild, verifyArtifacts } = require('./test_all_animated_objects_live');

runMain(() => {
    const root = path.resolve(__dirname, '..');
    const snapshot = createSnapshot(root, 'title_menu');
    const output = path.join(snapshot, 'test_output');
    fs.mkdirSync(output, { recursive: true });
    // Install the capture only in this run's snapshot. Never edit the live plugin list.
    const testScript = `
(() => {
    const start = Scene_Title.prototype.start;
    Scene_Title.prototype.start = function() {
        start.call(this);
        setTimeout(() => {
            const fs = require('fs');
            try {
                const menu = this._commandWindow;
                if (SceneManager._scene !== this || !menu || !menu.visible || menu.openness <= 0 ||
                    !Array.isArray(menu._list) || menu._list.length === 0) {
                    throw new Error('title command menu is not visible or has no commands');
                }
                const data = SceneManager.snap().canvas.toDataURL('image/png').split(',')[1];
                fs.writeFileSync('test_output/title.title_menu_default.png', data, 'base64');
                fs.writeFileSync('test_output/results.txt', 'PASS title.menu_visible\\nRESULT: 1 passed, 0 failed (exit 0)\\n');
                process.exit(0);
            } catch (error) {
                fs.writeFileSync('test_output/results.txt', 'FAIL title.menu_visible - ' + error.message + '\\nRESULT: 0 passed, 1 failed (exit 1)\\n');
                process.exit(1);
            }
        }, 800);
    };
})();
`;
    fs.writeFileSync(path.join(snapshot, 'js', 'plugins', 'UF_TempTitleCapture.js'), testScript);
    const pluginsPath = path.join(snapshot, 'js', 'plugins.js');
    const plugins = fs.readFileSync(pluginsPath, 'utf8');
    const match = plugins.match(/var\s+\$plugins\s*=\s*\[/);
    if (!match) throw new Error('plugins.js array declaration missing');
    fs.writeFileSync(pluginsPath, replaceOnce(plugins, match[0], match[0] +
        '\n{"name":"UF_TempTitleCapture","status":true,"description":"Test capture","parameters":{}},'));
    const rmmz = process.env.RMMZ_DIR || 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ';
    const child = childProcess.spawnSync(path.join(rmmz, 'nwjs-win', 'nw.exe'),
        [snapshot, '--user-data-dir=' + path.join(snapshot, 'profile'), '--disable-background-timer-throttling'],
        { cwd: snapshot, encoding: 'utf8', timeout: 30000, windowsHide: true });
    checkChild(child, 'title capture');
    verifyArtifacts(snapshot, 'title', ['title_menu_default']);
    const review = path.join(root, 'art', 'review', 'menus');
    fs.mkdirSync(review, { recursive: true });
    fs.copyFileSync(path.join(output, 'title.title_menu_default.png'), path.join(review, 'title_menu_default.png'));
    console.log('PASS title capture: visible commands and nonempty PNG');
});
