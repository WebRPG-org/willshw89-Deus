'use strict';
// Runs the ordinary wrapper in a child process. Only filesystem/process boundaries
// are doubled; production validators, injection code and PNG decoder stay intact.
// No NW.js, image generation, real game writes, or physical screenshot output.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Module = require('module');
const root = path.resolve(__dirname, '../../../..');
const [target, fault] = process.argv.slice(2);
const fixtures = require('./fixtures.json');
const spec = fixtures.find(row => row.file === target);
if (!spec) throw new Error('Unknown fixture target: ' + target);
const source = fs.readFileSync(path.join(root, target), 'utf8');
const memory = new Map(), directories = new Set(), cache = new Map();
let snapshot;
const key = p => path.resolve(String(p));
const missing = p => { throw new Error('ENOENT fixture: ' + p); };
// Existing licensed game PNG used only as in-memory artifact bytes, not a capture.
const png = fs.readFileSync(path.join(root, 'game/img/system/Window.png'));
const realRead = p => fs.readFileSync(p);
function read(p) {
    p = key(p);
    if (memory.has(p)) return memory.get(p);
    if (snapshot && p.startsWith(snapshot + path.sep)) {
        const rel = path.relative(snapshot, p);
        if (rel.startsWith('test_output')) return missing(p);
        let data = realRead(path.join(root, 'game', rel));
        if (fault === 'missing-hook' && /DEUS_(Test|Anim|Wildlife)\.js$/.test(p)) data = Buffer.from('// hook removed');
        return data;
    }
    if (fault === 'bag-pickup-bypass' && p.endsWith('DEUS_Bag.js')) {
        const data = realRead(p).toString();
        const anchor = 'const picked = I.pickUp(source.itemId, u.id);';
        if (!data.includes(anchor)) throw new Error('bag mutation anchor absent');
        return Buffer.from(data.replace(anchor, 'const picked = true;'));
    }
    return realRead(p);
}
const fakeFs = {
    readFileSync(p, enc) { const data = read(p); return enc ? data.toString(enc) : data; },
    writeFileSync(p, data, enc) {
        memory.set(key(p), Buffer.isBuffer(data) ? data : Buffer.from(String(data), enc));
        if (String(p).endsWith('.js')) new vm.Script(String(data), { filename: String(p) });
    },
    existsSync(p) {
        p = key(p);
        if (memory.has(p) || directories.has(p)) return true;
        if (snapshot && p.startsWith(snapshot + path.sep)) {
            const rel = path.relative(snapshot, p);
            return !rel.startsWith('test_output') && fs.existsSync(path.join(root, 'game', rel));
        }
        return fs.existsSync(p);
    },
    statSync(p) {
        const data = read(p);
        return { isFile: () => true, size: data.length };
    },
    mkdirSync(p) { directories.add(key(p)); },
    mkdtempSync(prefix) { snapshot = key(prefix + 'fixture'); directories.add(snapshot); return snapshot; },
    readdirSync(p) {
        p = key(p);
        if (p.endsWith('test_output')) return [...memory.keys()].filter(f => path.dirname(f) === p).map(f => path.basename(f));
        // Asset copying is unrelated to the result-validation contract.
        return [];
    },
    copyFileSync(src, dst) { memory.set(key(dst), read(src)); }
};
function childResult(command) {
    if (command === 'robocopy') {
        if (fault === 'stale-output') directories.add(path.join(snapshot, 'test_output'));
        return { status: fault === 'copy-error' ? 8 : 1, stdout: '', stderr: '' };
    }
    if (fault === 'child-exit') return { status: 7, stdout: '', stderr: 'fixture child crashed' };
    if (fault === 'launch-error') return { status: null, error: new Error('ENOENT fixture executable') };
    if (fault === 'timeout') return { status: null, signal: 'SIGTERM', error: new Error('ETIMEDOUT fixture') };
    const out = path.join(snapshot, 'test_output');
    directories.add(out);
    let report = `PASS ${spec.suite}.fixture_contract\nRESULT: 1 passed, 0 failed (exit 0)\n`;
    if (fault === 'fail-result') report = `FAIL ${spec.suite}.fixture_contract\nRESULT: 0 passed, 1 failed (exit 1)\n`;
    if (fault === 'error-result') report = 'ERROR renderer crashed\n' + report;
    if (fault === 'truncated-result') report = `PASS ${spec.suite}.fixture_contract\n`;
    if (fault === 'empty-result') report = '';
    if (fault === 'count-mismatch') report = `PASS ${spec.suite}.fixture_contract\nRESULT: 2 passed, 0 failed (exit 0)\n`;
    if (fault === 'wrong-suite') report = 'PASS unrelated.fixture_contract\nRESULT: 1 passed, 0 failed (exit 0)\n';
    if (fault !== 'missing-result') memory.set(path.join(out, 'results.txt'), Buffer.from(report));
    for (const shot of spec.shots) {
        if (fault === 'missing-shot' && shot === spec.shots[0]) continue;
        const data = fault === 'empty-shot' ? Buffer.alloc(0) : fault === 'invalid-shot' ? Buffer.from('not a PNG') : png;
        memory.set(path.join(out, spec.suite + '.' + shot + '.png'), data);
    }
    return { status: 0, stdout: '', stderr: '' };
}
function load(file, isMain = false) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    function localRequire(id) {
        if (id === 'fs') return fakeFs;
        if (id === 'child_process') return { spawnSync: childResult };
        if (id === './build_composite_transition_tileset') return { buildCompositeSheets() {} };
        if (id === './png_util') return { writePNG(p) { memory.set(key(p), png); } };
        if (Module.builtinModules.includes(id)) return require(id);
        return load(require.resolve(id, { paths: [path.dirname(file)] }));
    }
    localRequire.main = isMain ? mod : null;
    const body = fs.readFileSync(file, 'utf8').replace(/^#![^\n]*\n/, '');
    const context = { require: localRequire, module: mod, exports: mod.exports, __dirname: path.dirname(file),
        __filename: file, console, Buffer, process, setTimeout, clearTimeout };
    vm.runInNewContext(body, context, { filename: file, timeout: 10000 });
    return mod.exports;
}
load(path.join(root, target), true);
if (!process.exitCode) console.log('FIXTURE wrapper returned normally');
