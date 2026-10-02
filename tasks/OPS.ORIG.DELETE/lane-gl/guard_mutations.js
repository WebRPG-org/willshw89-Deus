'use strict';

// In-memory mutations keep the lane worktree and protected files untouched.
const cp = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const PRELOAD = String.raw`
const fs = require('fs');
const cp = require('child_process');
const path = require('path');
const root = process.cwd();
const target = path.join(root, process.env.GUARD_TARGET || 'tools/test_all_object_charsets.js');
const opening = new Map();
if (process.env.GUARD_OPENING === '1') {
    const changed = cp.execFileSync('git', ['diff', '--name-only', '4d416fc9', '--', 'tools'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
    for (const file of changed) {
        if (file === 'tools/test_no_originality_check.js') continue;
        opening.set(path.join(root, file), cp.execFileSync('git', ['show', '4d416fc9:' + file], { cwd: root, encoding: 'utf8' }));
    }
}
const read = fs.readFileSync;
fs.readFileSync = function (file, options) {
    const absolute = path.resolve(String(file));
    let result = opening.has(absolute) ? opening.get(absolute) : read.apply(this, arguments);
    if (absolute === target && process.env.GUARD_MUTANT_TEXT) {
        result = result.toString() + '\n' + process.env.GUARD_MUTANT_TEXT + '\n';
    }
    return options === 'utf8' || (options && options.encoding === 'utf8') ? result.toString() : result;
};
if (process.env.GUARD_FAIL_GIT === '1') {
    const exec = cp.execFileSync;
    cp.execFileSync = function (command, args) {
        if (command === 'git' && args[0] === 'merge-base') throw new Error('named git merge-base mutant');
        return exec.apply(this, arguments);
    };
}
require('./tools/test_no_originality_check.js');
`;

const cases = [
    ['removed tool', '// originality_check', 'references originality_check'],
    ['furniture tool', '// check_furniture_originality', 'references check_furniture_originality'],
    ['object test', '// test_object_originality', 'references test_object_originality'],
    ['index', '// originality_index', 'references originality_index'],
    ['word fragment', '// originality', 'contains removed-check wording'],
    ['ORIG_CHECK', 'const ORIG_CHECK = 1;', 'contains removed-check identifier'],
    ['origFail', 'const origFail = 1;', 'contains removed-check identifier'],
    ['origPass', 'const origPass = 1;', 'contains removed-check identifier'],
    ['origFailCount', 'const origFailCount = 1;', 'contains removed-check identifier'],
    ['origResult', 'const origResult = 1;', 'contains removed-check identifier'],
    ['origRes', 'const origRes = 1;', 'contains removed-check identifier'],
    ['U7 Orig', '// U7 Orig', 'claims U7 Orig'],
    ['stub', '// RESULT PASS\\nFILE PASS', 'contains RESULT PASS stub'],
    ['empty pass', 'try { passed++; } catch (err) {}', 'counts an empty check as PASS'],
    ['png execSync', "execSync('bad.png')", 'executes a .png file'],
    ['png execFileSync', "execFileSync('bad.png')", 'executes a .png file']
];

let failed = 0;
function run(name, env, expected) {
    const result = cp.spawnSync(process.execPath, ['-e', PRELOAD], {
        cwd: ROOT,
        env: { ...process.env, ...env },
        encoding: 'utf8'
    });
    const lines = (result.stderr + '\n' + result.stdout).split(/\r?\n/);
    const matched = expected.map(phrase => lines.find(line => line.includes(phrase)));
    const ok = result.status === 1 && matched.every(Boolean);
    console.log(`${ok ? 'PASS' : 'FAIL'} MUTANT ${name}: exit=${result.status}; ${matched.filter(Boolean).join(' | ')}`);
    if (!ok) {
        failed++;
        console.error(result.error || lines.slice(0, 12).join('\n'));
    }
}

run('opening commit', { GUARD_OPENING: '1' }, [
    'tools/verify_nature_and_cursors.js contains removed-check wording',
    'tools/verify_all_42_male_charsets.js claims U7 Orig',
    'tools/verify_batch6_assets.js counts an empty check as PASS',
    'tools/verify_batch4_assets.js contains removed-check wording',
    'tools/verify_all_6_male_variations.js contains removed-check wording',
    'tools/test_all_object_charsets.js contains removed-check identifier',
    'tools/build_interactive_walker_html.js contains removed-check wording',
    'tools/export_u7_style_dataset.js has an unfinished shipping rule'
]);
for (const [name, text, diagnostic] of cases) {
    run(name, { GUARD_MUTANT_TEXT: text }, [`tools/test_all_object_charsets.js ${diagnostic}`]);
}
run('git merge-base failure', { GUARD_FAIL_GIT: '1' }, ['FAIL: Could not check changed files syntax via git diff: named git merge-base mutant']);

process.exitCode = failed ? 1 : 0;
