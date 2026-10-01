"use strict";
// WG.00.44: finds every vm harness under tools/ that must install tools/lib/vm_sim_require.js.
//
// A hit is a tools/**/*.js file that
//   1. creates a vm context: require("vm") / require("node:vm"), runInContext, runInNewContext, createContext or
//      new vm.Script in its code (comments and string contents don't count), and
//   2. names a target plugin (DEUS_World, DEUS_WorldGen, DEUS_Levels or DEUS_Fluid) in a string: the plugin id or
//      its file name, with or without a path ("DEUS_Fluid.js", "game/js/plugins/DEUS_World.js"), or a bare
//      name ("World", "WorldGen", "Levels", "Fluid") as an element of an array literal in a file that prefixes names
//      with DEUS_ (a "DEUS_" string or a `DEUS_${...}` template) or reads from game/js/plugins, and
//   3. does not use the target's text only through a slice. A file is slice-only when every place it names a target
//      starts a declaration (const/let/var x = ...) in some enclosing block, and every use of x in that block is
//      either another declaration (followed on the same way) or the receiver of .slice / .substring / .substr /
//      .match / .exec. Inside a declaration only path and read calls carry the value on (path.join, path.resolve,
//      readFileSync, String, Buffer.from): `const r = vm.runInContext(src, ctx)` is an evaluation, not a copy. tools/sim/test_units.js, which reads DEUS_World.js and runs only the regex-cut UF.Space
//      block, is such a file. Any other use (a call argument, an evaluation, a loop, an assignment, a return) keeps
//      the file a hit, so a doubt counts as whole: a whole source transformed for a mutant (.replace) is whole, and a
//      file that names a target without evaluating it at all (tools/bench_history_demographics.js hashes
//      DEUS_World.js) is a hit too.
// The rule is the same for every file; no file name is exempt.
//
//   node tools/lib/vm_harness_scan.js [--json] [--root <repo>]   prints the hits
//   require("./vm_harness_scan").scan({ root, dirs })              -> { root, scanned, hits: [{ file, targets }] }
//   require("./vm_harness_scan").classify(source)                  -> { vm, targets, refs, sliceOnly, hit }

const fs = require("fs");
const path = require("path");

const TARGETS = ["World", "WorldGen", "Levels", "Fluid"];
const TARGET_FILE = /(?:^|[\/\\])DEUS_(World|WorldGen|Levels|Fluid)(?:\.js)?$/;
const KEYWORDS_BEFORE_REGEX = new Set(["return", "typeof", "instanceof", "case", "do", "else", "in", "of", "new", "delete", "void", "throw", "yield", "await"]);

/**
 * Splits JS source into code and literals. Comments go; every string, template and regex literal becomes a
 * placeholder __S<n>__ in `code`, with its text in literals[n] = { kind, value }. A template keeps its ${...} text.
 */
function tokenize(src) {
    const literals = [];
    let code = "";
    let i = 0;
    const n = src.length;
    let last = ""; // last significant code token (a punctuator char or a word)
    const put = (kind, value) => {
        code += `__S${literals.length}__`;
        literals.push({ kind, value });
        last = "lit";
    };
    const regexAllowed = () => last === "" || (last.length === 1 && "(,=:[!&|?{};+-*%<>~^".includes(last)) || KEYWORDS_BEFORE_REGEX.has(last);
    // Reads a template literal from just after its opening backtick; returns [value, end index].
    const readTemplate = start => {
        let j = start, value = "";
        while (j < n && src[j] !== "`") {
            if (src[j] === "\\") { value += src.slice(j, j + 2); j += 2; continue; }
            if (src[j] === "$" && src[j + 1] === "{") {
                let depth = 1, k = j + 2;
                while (k < n && depth > 0) {
                    const c = src[k];
                    if (c === "{") depth++;
                    else if (c === "}") depth--;
                    else if (c === "'" || c === "\"") { const q = c; k++; while (k < n && src[k] !== q) { if (src[k] === "\\") k++; k++; } }
                    else if (c === "`") { k = readTemplate(k + 1)[1]; continue; }
                    k++;
                }
                value += src.slice(j, k);
                j = k;
                continue;
            }
            value += src[j++];
        }
        return [value, j + 1];
    };
    while (i < n) {
        const c = src[i];
        if (c === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") i++; continue; }
        if (c === "/" && src[i + 1] === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; code += " "; continue; }
        if (c === "#" && i === 0 && src[1] === "!") { while (i < n && src[i] !== "\n") i++; continue; }
        if (c === "'" || c === "\"") {
            let j = i + 1, value = "";
            while (j < n && src[j] !== c && src[j] !== "\n") {
                if (src[j] === "\\") { value += src[j + 1] === undefined ? "" : src[j + 1]; j += 2; continue; }
                value += src[j++];
            }
            put("string", value);
            i = j + 1;
            continue;
        }
        if (c === "`") { const [value, end] = readTemplate(i + 1); put("template", value); i = end; continue; }
        if (c === "/" && regexAllowed()) {
            let j = i + 1, inClass = false;
            while (j < n && src[j] !== "\n") {
                if (src[j] === "\\") { j += 2; continue; }
                if (src[j] === "[") inClass = true;
                else if (src[j] === "]") inClass = false;
                else if (src[j] === "/" && !inClass) break;
                j++;
            }
            j++;
            while (j < n && /[a-z]/i.test(src[j])) j++;
            put("regex", src.slice(i, j));
            i = j;
            continue;
        }
        if (/[A-Za-z_$]/.test(c)) {
            let j = i;
            while (j < n && /[\w$]/.test(src[j])) j++;
            last = src.slice(i, j);
            code += last;
            i = j;
            continue;
        }
        if (/\d/.test(c)) {
            let j = i;
            while (j < n && /[\w.]/.test(src[j])) j++;
            code += src.slice(i, j);
            last = "num";
            i = j;
            continue;
        }
        if (!/\s/.test(c)) last = (c === ")" || c === "]") ? "close" : c;
        code += c;
        i++;
    }
    return { code, literals };
}


const SLICING = /^\s*\.\s*(?:slice|substring|substr|match|exec)\s*\(/;
// A use of a name: not part of a longer word and not a property (.name); a spread (...name) is a use.
const ident = name => new RegExp("(?<![\\w$])(?<!(?:^|[^.])\\.)" + name.replace(/\$/g, "\\$") + "(?![\\w$])", "g");

/** The [open, close] code offsets of every brace pair containing pos, innermost first, then the whole file. */
function regionsAround(code, pos) {
    const out = [];
    let depth = 0;
    for (let k = pos - 1; k >= 0; k--) {
        const c = code[k];
        if (c === "}") depth++;
        else if (c === "{") {
            if (depth > 0) { depth--; continue; }
            let d = 0, e = k;
            for (; e < code.length; e++) {
                if (code[e] === "{") d++;
                else if (code[e] === "}" && --d === 0) break;
            }
            out.push([k + 1, e]);
        }
    }
    out.push([0, code.length]);
    return out;
}

/** Every declarator directly in code[a, b): { names, at (binding offsets), init: [start, end] }. */
function declarators(code, a, b) {
    const out = [];
    const decl = /\b(?:const|let|var)\s+/g;
    decl.lastIndex = a;
    let m;
    while ((m = decl.exec(code)) && m.index < b) {
        let k = m.index + m[0].length;
        for (;;) {
            // The binding: a name, or a destructuring pattern whose names all receive the value.
            let names = [], at = [];
            if (code[k] === "{" || code[k] === "[") {
                let d = 0, e = k;
                for (; e < b; e++) { if ("{[".includes(code[e])) d++; else if ("}]".includes(code[e]) && --d === 0) break; }
                const pat = code.slice(k, e + 1), re = /[A-Za-z_$][\w$]*(?=\s*[,}\]=])/g;
                let p;
                while ((p = re.exec(pat))) { names.push(p[0]); at.push(k + p.index); }
                k = e + 1;
            } else {
                const id = /^[A-Za-z_$][\w$]*/.exec(code.slice(k, k + 200));
                if (!id) break;
                names = [id[0]]; at = [k];
                k += id[0].length;
            }
            while (/\s/.test(code[k])) k++;
            if (code[k] !== "=" || code[k + 1] === "=" || code[k + 1] === ">") break; // "for (const x of y)": no initializer
            const initStart = k + 1;
            let d = 0, e = initStart;
            for (; e < b; e++) {
                const c = code[e];
                if ("([{".includes(c)) d++;
                else if (")]}".includes(c)) { if (d === 0) break; d--; }
                else if (d === 0 && (c === ";" || c === ",")) break;
                else if (d === 0 && c === "\n") {
                    const before = code.slice(initStart, e).trimEnd(), after = code.slice(e).trimStart();
                    if (!/[-+*/%?:|&,=<>(\[{.!]$/.test(before) && !/^[-+*/%?:|&,=<>.)\]}]/.test(after)) break;
                }
            }
            out.push({ names, at, init: [initStart, e] });
            if (code[e] !== ",") break;
            k = e + 1;
            while (/\s/.test(code[k])) k++;
        }
    }
    return out;
}

// Calls that only carry a file name or its text on: building a path, reading the file.
const PASS_THROUGH = /^(?:(?:fs\s*\.\s*)?readFileSync|path\s*\.\s*(?:join|resolve)|String|Buffer\s*\.\s*from)$/;

/** True when code[at] sits, inside the initializer starting at `start`, in no call but PASS_THROUGH ones. */
function onlyPassThrough(code, start, at) {
    let depth = 0;
    for (let k = at - 1; k >= start; k--) {
        const c = code[k];
        if (")]}".includes(c)) depth++;
        else if ("([{".includes(c)) {
            if (depth > 0) { depth--; continue; }
            if (c !== "(") continue; // an array or object literal holds the value: followed through the declaration
            const callee = /([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*|[)\]])\s*$/.exec(code.slice(Math.max(start, k - 200), k));
            if (!callee) continue; // a grouping parenthesis
            if (!PASS_THROUGH.test(callee[1])) return false;
        }
    }
    return true;
}

/**
 * True when a target literal's text reaches nothing but slicing calls. It must start a declarator's initializer in
 * some enclosing block; from there every use of the declared name in that block must be either another declarator's
 * initializer, outside any call but a path or read one (followed on), or the receiver of .slice/.substring/.substr/
 * .match/.exec. Any other use (a call argument, an evaluation, a return, a loop, an assignment) means the whole text
 * may be evaluated.
 */
function onlySliced(code, pos) {
    for (const [a, b] of regionsAround(code, pos)) {
        const decls = declarators(code, a, b);
        const home = decls.find(d => d.init[0] <= pos && pos < d.init[1]);
        if (!home) continue;
        if (!onlyPassThrough(code, home.init[0], pos)) return false;
        const seen = new Set();
        const follow = names => {
            for (const name of names) {
                if (seen.has(name)) continue;
                seen.add(name);
                const re = ident(name);
                re.lastIndex = a;
                let m;
                while ((m = re.exec(code)) && m.index < b) {
                    const at = m.index;
                    if (decls.some(d => d.at.includes(at))) continue; // the binding itself
                    if (SLICING.test(code.slice(at + name.length, at + name.length + 40))) continue;
                    const into = decls.filter(d => d.init[0] <= at && at < d.init[1]).sort((x, y) => (y.init[0] - x.init[0]))[0];
                    if (!into || !onlyPassThrough(code, into.init[0], at)) return false;
                    if (!follow(into.names)) return false;
                }
            }
            return true;
        };
        return follow(home.names);
    }
    return false;
}

function classify(source) {
    const { code, literals } = tokenize(source);
    const placeholder = /__S(\d+)__/g;
    let vmFound = /\b(?:runInContext|runInNewContext|createContext)\s*\(/.test(code) || /\bnew\s+vm\s*\.\s*Script\b/.test(code);
    const vmRequire = /\brequire\s*\(\s*__S(\d+)__\s*\)/g;
    let m;
    while ((m = vmRequire.exec(code))) {
        const v = literals[Number(m[1])].value;
        if (v === "vm" || v === "node:vm") vmFound = true;
    }

    const refs = []; // { target, pos }: where each target is named in the code
    while ((m = placeholder.exec(code))) {
        const l = literals[Number(m[1])];
        const hit = l.kind !== "regex" && TARGET_FILE.exec(l.value);
        if (hit) refs.push({ target: `DEUS_${hit[1]}`, pos: m.index });
    }
    const prefixes = literals.some(l => (l.kind === "string" && /DEUS_$/.test(l.value)) || (l.kind === "template" && /DEUS_\$\{/.test(l.value)));
    const readsPlugins = literals.some(l => l.kind !== "regex" && (/js[\/\\]plugins/.test(l.value) || l.value === "plugins"));
    if (prefixes || readsPlugins) {
        const element = /[[,]\s*(__S(\d+)__)\s*(?=[,\]])/g;
        while ((m = element.exec(code))) {
            const l = literals[Number(m[2])];
            if (l.kind === "string" && TARGETS.includes(l.value)) refs.push({ target: `DEUS_${l.value}`, pos: m.index + m[0].indexOf(m[1]) });
        }
    }
    const targets = [...new Set(refs.map(r => r.target))].sort();
    const sliced = refs.map(r => ({ target: r.target, onlySliced: onlySliced(code, r.pos) }));
    const sliceOnly = refs.length > 0 && sliced.every(r => r.onlySliced);
    return { vm: vmFound, targets, refs: sliced, sliceOnly, hit: vmFound && refs.length > 0 && !sliceOnly };
}

function walk(dir, out) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return out; }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of entries) {
        if (e.name === "node_modules" || e.name === ".git") continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full, out);
        else if (e.isFile() && e.name.endsWith(".js")) out.push(full);
    }
    return out;
}

/** Scans <root>/<dirs> (default: the repository's tools/). Files are repo-relative with forward slashes, sorted. */
function scan(opts) {
    const options = opts || {};
    const root = path.resolve(options.root || path.join(__dirname, "..", ".."));
    const dirs = options.dirs || ["tools"];
    const files = [];
    for (const d of dirs) walk(path.join(root, d), files);
    const hits = [];
    for (const full of files) {
        const r = classify(fs.readFileSync(full, "utf8"));
        if (r.hit) hits.push({ file: path.relative(root, full).split(path.sep).join("/"), targets: r.targets });
    }
    hits.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
    return { root, scanned: files.length, hits };
}

module.exports = { scan, classify, tokenize, TARGETS };

if (require.main === module) {
    const args = process.argv.slice(2);
    const r = args.indexOf("--root");
    const result = scan({ root: r >= 0 ? args[r + 1] : undefined });
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else {
        for (const h of result.hits) console.log(`${h.file}  ${h.targets.join(" ")}`);
        console.log(`${result.hits.length} hits in ${result.scanned} files under ${result.root}`);
    }
}
