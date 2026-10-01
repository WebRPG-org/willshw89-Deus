'use strict';
// Execute the literal injected suites from the ordinary harness, against a
// deterministic map/renderer double. This proves assertions, not NW.js rendering.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '../../../..');
const [kind, fault] = process.argv.slice(2);
const file = kind === 'title' ? 'test_title_menu.js' : kind === 'grass' ? 'test_golden_art_review_live.js' : 'test_temperate_arid_transition_live.js';
const source = fs.readFileSync(path.join(root, 'tools', file), 'utf8');
const literal = source.match(new RegExp('const ' + (kind === 'title' ? 'testScript' : 'suiteCode') + ' = (`[\\s\\S]*?`);'));
if (!literal) throw new Error('suite literal not found');
const code = vm.runInNewContext(literal[1]);
const artifacts = new Map();
const png = fs.readFileSync(path.join(root, 'game/img/system/Window.png'));
const fakeFs = {
    existsSync: p => artifacts.has(p),
    statSync: p => ({ size: artifacts.get(p).length }),
    writeFileSync(p, data, encoding) { artifacts.set(p, Buffer.from(data, encoding)); }
};
const data = new Array(50 * 40 * 6).fill(0);
const map = { width: () => 50, height: () => 40, data: () => data, mapId: () => 1, events: () => [],
    setDisplayPos() {}, tileId: (x, y, z) => data[(z * 40 + y) * 50 + x] };
let suite;
const env = { require: id => { if (id === 'fs') return fakeFs; throw new Error('unexpected dependency ' + id); },
    Test: { suite(name, fn) { suite = { name, fn }; } },
    $gameMap: map, $gamePlayer: { locate() {} }, $gameScreen: { changeWeather() {}, startTint() {} },
    UF: { World: { addUnit() {}, units: () => [], currentArea: () => ({ x: 0, y: 0 }) } },
    SceneManager: { _scene: {}, snap: () => ({ canvas: { toDataURL: () => 'data:image/png;base64,' + png.toString('base64') } }) },
    console };
env.window = env;
async function main() {
    if (kind === 'title') {
        env.Scene_Title = function() {};
        env.Scene_Title.prototype.start = function() {};
        let exit;
        env.process = { exit: code => { exit = code; } };
        env.setTimeout = fn => fn();
        vm.runInNewContext(code, env, { filename: file });
        const scene = new env.Scene_Title();
        scene._commandWindow = { visible: fault !== 'hidden-menu', openness: 255, _list: [{ name: 'New Game' }] };
        env.SceneManager._scene = scene;
        scene.start();
        const results = artifacts.get('test_output/results.txt');
        if (!results || !Number.isInteger(exit)) throw new Error('title callback did not produce results/exit');
        console.log(results.toString());
        process.exitCode = exit;
        return;
    }
    vm.runInNewContext(code, env, { filename: file });
    let failed = 0, passed = 0;
    await suite.fn({
        waitFrames: async () => { if (fault === 'uniform-terrain') data.fill(2862, 0, 50 * 40); },
        screenshot(name) {
            const p = suite.name + '.' + name + '.png';
            if (fault !== 'missing-shot') artifacts.set(p, png);
            return p;
        },
        check(name, condition, detail) {
            if (condition) passed++; else failed++;
            console.log(`${condition ? 'PASS' : 'FAIL'} ${suite.name}.${name} - ${detail}`);
        }
    });
    console.log(`RESULT: ${passed} passed, ${failed} failed (exit ${failed ? 1 : 0})`);
    process.exitCode = failed ? 1 : 0;
}
main().catch(error => { console.error('FAIL suite execution: ' + error.stack); process.exitCode = 1; });
