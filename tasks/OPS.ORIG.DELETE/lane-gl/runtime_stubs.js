'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '../../..');
const TOOLS = path.join(ROOT, 'tools');

function run(file, requireStub) {
    const output = [];
    let exitCode = null;
    const context = {
        __dirname: TOOLS,
        Buffer,
        console: {
            log: (...args) => output.push(args.join(' ')),
            error: (...args) => output.push(args.join(' '))
        },
        process: { exit: code => { exitCode = code; } },
        require: requireStub
    };
    vm.runInNewContext(fs.readFileSync(path.join(TOOLS, file), 'utf8'), context, { filename: file });
    return { output, exitCode };
}

const nature = run('verify_nature_and_cursors.js', name => {
    if (name === 'child_process') return { execSync: () => 'FILE PASS' };
    return require(name);
});
if (!nature.output.some(line => line.includes('ALL CHECKS COMPLETED!')) || nature.output.some(line => line.startsWith('FAIL:'))) {
    throw new Error('Nature/cursor non-asset stub did not complete');
}
console.log(`PASS nature/cursor stub: ${nature.output.filter(line => line.startsWith('PASS:')).length} art-check calls, completion reached`);

const male = run('verify_all_42_male_charsets.js', name => {
    if (name === 'fs') return {
        existsSync: () => true,
        readFileSync: file => file.endsWith('.json')
            ? JSON.stringify({ frameWidth: 48, frameHeight: 48, facings: ['S'], anchor: [24, 47] })
            : Buffer.alloc(0)
    };
    if (name === './png_read') return {
        decodePNG: () => ({ width: 144, height: 192, data: Buffer.alloc(144 * 192 * 4) })
    };
    return require(name);
});
if (male.exitCode !== 0 || !male.output.some(line => line.includes('AUDIT SUMMARY: 42 / 42 Charsets PASSED'))) {
    throw new Error('Male charset stub did not reach its 42-sheet summary: ' + male.output.slice(-5).join(' | '));
}
console.log('PASS male charset stub: 42/42 sidecar path reached, exit 0');
