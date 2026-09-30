'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync, execFileSync } = require('child_process');
const root = path.resolve(__dirname, '../../../..');
const fixtures = require('./fixtures.json');
const rows = [];
const faults = ['child-exit', 'launch-error', 'timeout', 'copy-error', 'stale-output', 'missing-result',
    'empty-result', 'fail-result', 'error-result', 'truncated-result', 'count-mismatch', 'wrong-suite',
    'missing-shot', 'empty-shot', 'invalid-shot'];
const reasons = {
    'child-exit': /child status=7/, 'launch-error': /ENOENT fixture executable/, 'timeout': /ETIMEDOUT fixture/,
    'copy-error': /snapshot copy failed: status=8/, 'stale-output': /snapshot contains stale test_output/,
    'missing-result': /ENOENT fixture: .*results\.txt/, 'empty-result': /invalid or failed .* results:/,
    'fail-result': /invalid or failed .* results:/, 'error-result': /invalid or failed .* results:/,
    'truncated-result': /invalid or failed .* results:/, 'count-mismatch': /invalid or failed .* results:/,
    'wrong-suite': /invalid or failed .* results:/, 'missing-hook': /expected exactly one injection hook/,
    'missing-shot': /missing or empty screenshot/, 'empty-shot': /missing or empty screenshot/,
    'invalid-shot': /not a PNG/, 'bag-pickup-bypass': /AssertionError/,
    'suite-missing-shot': /FAIL golden_art_review_grass\.grass_batch1_rendered/,
    'suite-uniform-terrain': /FAIL temperate_arid_live\.temperate_arid_transition_verified/,
    'suite-hidden-menu': /FAIL title\.menu_visible - title command menu is not visible/,
    'codex-effort-floor-low': /FAIL eq codex standard \(empty\).*parent=low old=xhigh/
};
function run(file, fault, exe, args, want) {
    const child = spawnSync(exe, args, { cwd: root, encoding: 'utf8', timeout: 120000, windowsHide: true });
    const output = (child.stdout || '') + (child.stderr || '');
    const ok = !child.error && !child.signal && child.status === want &&
        (want !== 1 || (/^FAIL /m.test(output) && reasons[fault] && reasons[fault].test(output)));
    const row = { file, fault, expectedExit: want, actualExit: child.status, ok, output, command: [exe, ...args] };
    rows.push(row);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${path.basename(file)} / ${fault}: exit ${child.status}, expected ${want}`);
    return row;
}
for (const fixture of fixtures) {
    if (!fixture.suite) continue;
    const driver = path.join(__dirname, 'fixture_child.js');
    run(fixture.file, 'healthy', process.execPath, [driver, fixture.file, 'healthy'], 0);
    for (const fault of faults) run(fixture.file, fault, process.execPath, [driver, fixture.file, fault], 1);
    if (!fixture.file.includes('title_menu') && !fixture.file.includes('faction_menus')) {
        run(fixture.file, 'missing-hook', process.execPath, [driver, fixture.file, 'missing-hook'], 1);
    }
}
const bag = 'tools/test_sack_ui_and_loose_items.js';
run(bag, 'real-plugin', process.execPath, [bag], 0);
run(bag, 'bag-pickup-bypass', process.execPath, [path.join(__dirname, 'fixture_child.js'), bag, 'bag-pickup-bypass'], 1);
for (const [kind, fault, file] of [
    ['grass', 'missing-shot', 'tools/test_golden_art_review_live.js'],
    ['transition', 'uniform-terrain', 'tools/test_temperate_arid_transition_live.js'],
    ['title', 'hidden-menu', 'tools/test_title_menu.js']
]) {
    const driver = path.join(__dirname, 'suite_contract_child.js');
    run(file, 'suite-healthy', process.execPath, [driver, kind, 'healthy'], 0);
    run(file, 'suite-' + fault, process.execPath, [driver, kind, fault], 1);
}
const psFile = 'tools/ops/pm_launch/test_top_models_effort.ps1';
const ps = path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
run(psFile, 'real-library', ps, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psFile], 0);
const library = fs.readFileSync(path.join(root, 'tools/ops/pm_launch/top_models.ps1'), 'utf8');
const anchor = "'codex:standard' = 'xhigh'";
if (library.split(anchor).length !== 2) throw new Error('effort fixture anchor not unique');
const mutant = path.join(__dirname, 'top_models.invalid_effort.ps1');
fs.writeFileSync(mutant, library.replace(anchor, "'codex:standard' = 'low'").replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, ''));
run(psFile, 'codex-effort-floor-low', ps, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psFile, '-LibraryPath', mutant], 1);
const hashes = Object.fromEntries(fixtures.map(f => [f.file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f.file))).digest('hex')]));
const proof = { date: new Date().toISOString(), baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    classification: 'Headless boundary fixtures and real Bag/model-library contracts; no NW.js/F5 proof', hashes, rows };
fs.writeFileSync(path.join(__dirname, 'negative_verification.json'), JSON.stringify(proof, null, 2) + '\n');
const failed = rows.filter(row => !row.ok);
console.log(`RESULT: ${rows.length - failed.length} fixture cases passed, ${failed.length} failed; ${fixtures.length} target harnesses`);
process.exitCode = failed.length ? 1 : 0;
