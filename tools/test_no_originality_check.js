const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
let failed = false;

function assert(condition, message) {
    if (!condition) {
        console.error('FAIL:', message);
        failed = true;
    }
}

// 1. Files must not exist
const badFiles = [
    'tools/originality_check.js',
    'tools/check_furniture_originality.js',
    'tools/test_object_originality.js',
    'docs/systems/ORIGINALITY_CHECK.md'
];

for (const f of badFiles) {
    assert(!fs.existsSync(path.join(ROOT, f)), `File still exists: ${f}`);
}

// 2. tools/ops/quarantine.json must not name them
const qPath = path.join(ROOT, 'tools', 'ops', 'quarantine.json');
if (fs.existsSync(qPath)) {
    const qContent = fs.readFileSync(qPath, 'utf8');
    assert(!qContent.includes('originality_check'), 'quarantine.json contains originality_check');
    assert(!qContent.includes('check_furniture_originality'), 'quarantine.json contains check_furniture_originality');
    assert(!qContent.includes('test_object_originality'), 'quarantine.json contains test_object_originality');
    assert(!qContent.includes('originality_index'), 'quarantine.json contains originality_index');
}

// 3. No script under tools/ may retain the removed gate or claim it passed.
const forbiddenNames = [
    'originality_check',
    'check_furniture_originality',
    'test_object_originality',
    'originality_index'
];
const forbiddenIdentifiers = /\b(?:ORIG_CHECK|origFail|origPass|origFailCount|origResult|origRes)\b/;

function executesPng(content) {
    const calls = /\b(execSync|execFileSync)\s*\(/g;
    let call;
    while ((call = calls.exec(content)) !== null) {
        // Find the first argument, allowing path.join(...) as well as a literal.
        let depth = 0;
        let quote = null;
        let arg = '';
        for (let i = calls.lastIndex; i < content.length; i++) {
            const ch = content[i];
            if (quote) {
                arg += ch;
                if (ch === '\\') {
                    arg += content[++i] || '';
                } else if (ch === quote) {
                    quote = null;
                }
            } else if (ch === '"' || ch === "'" || ch === '`') {
                quote = ch;
                arg += ch;
            } else if (ch === '(') {
                depth++;
                arg += ch;
            } else if (ch === ')') {
                if (depth === 0) break;
                depth--;
                arg += ch;
            } else if (ch === ',' && depth === 0) {
                break;
            } else {
                arg += ch;
            }
        }

        if (call[1] === 'execFileSync') {
            if (/\.png['"`]\s*$/i.test(arg.trim()) || /\bpath\.join\([\s\S]*\.png['"`]\s*\)$/i.test(arg.trim())) return true;
        } else {
            // execSync takes a shell command. Its command token must be the PNG.
            const literal = arg.trim().match(/^(['"`])([\s\S]*)\1$/);
            if (literal && /^(?:\\?['"])?\S+\.png(?:\\?['"])?(?:\s|$)/i.test(literal[2].trim())) return true;
        }
    }
    return false;
}

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
        } else if (fullPath.endsWith('.js') && fullPath !== __filename) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const relative = path.relative(ROOT, fullPath).replace(/\\/g, '/');
            const lower = content.toLowerCase();
            for (const name of forbiddenNames) {
                assert(!lower.includes(name), `${relative} references ${name}`);
            }
            if (relative !== 'tools/art/induct_batch_10.js') {
                assert(!lower.includes('originalit'), `${relative} contains removed-check wording`);
            }
            assert(!forbiddenIdentifiers.test(content), `${relative} contains removed-check identifier`);
            assert(!content.includes('U7 Orig'), `${relative} claims U7 Orig`);
            assert(!/RESULT PASS(?:\\n|\r?\n)FILE PASS/.test(content), `${relative} contains RESULT PASS stub`);
            assert(!executesPng(content), `${relative} executes a .png file`);
            assert(!/try\s*\{\s*passed\+\+;\s*\}\s*catch\b/.test(content), `${relative} counts an empty check as PASS`);
            if (relative === 'tools/export_u7_style_dataset.js') {
                assert(!/crop',\s*'\s*'/.test(content), `${relative} has an unfinished shipping rule`);
            }
        }
    }
}
scanDir(path.join(ROOT, 'tools'));

// 4. Every changed script must parse. A failed git command is a failed guard.
try {
    const mergeBase = cp.execFileSync('git', ['merge-base', 'main', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    const diffFiles = cp.execFileSync('git', ['diff', '--name-only', mergeBase, 'HEAD', '--', 'tools'], { cwd: ROOT, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
    const workingFiles = cp.execFileSync('git', ['diff', '--name-only', '--', 'tools'], { cwd: ROOT, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
    
    for (const f of new Set([...diffFiles, ...workingFiles])) {
        if (f.endsWith('.js') && fs.existsSync(path.join(ROOT, f))) {
            try {
                cp.execFileSync(process.execPath, ['--check', f], { cwd: ROOT, stdio: 'pipe' });
            } catch (e) {
                assert(false, `Syntax error in ${f}:\n${e.stderr ? e.stderr.toString() : e.message}`);
            }
        }
    }
} catch (e) {
    console.error('FAIL: Could not check changed files syntax via git diff:', e.message);
    failed = true;
}

if (failed) {
    process.exit(1);
} else {
    console.log('PASS: No originality checks found.');
    process.exit(0);
}
