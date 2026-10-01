"use strict";
// WG.00.44: trace whole target-plugin source into actual VM evaluations.
// Reads alone (including hashes) and genuine partial slices are not hits. Source intervals survive
// aliases, local helpers, arrays, templates, and mutant replacements; cuts rejoined around an
// instrumentation insertion still cover the whole plugin. No filename is exempt.
// The bounded analysis never executes a harness, its require() calls, or a plugin. Acorn comes from
// the running Node distribution; a missing parser, parse error, or analysis limit throws explicitly.
// Hook proof follows sandbox identities through aliases and createContext. Installation must
// dominate each whole-source VM sink. Branch joins retain only definitely installed identities.
// Unknown branches are explored; literal-false branches are not. This is a bounded static proof.
// scan({root,dirs}) -> {root,scanned,hits:[{file,targets,evaluations,hookFailures}]}
// classify(source,{root,filename}?) -> {vm,targets,hit,evaluations,hookFailures}
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const TARGETS = ["World", "WorldGen", "Levels", "Fluid"];
const TARGET_FILE = /(?:^|[\\/])DEUS_(World|WorldGen|Levels|Fluid)(?:\.js)?$/;
const DEFAULT_ROOT = path.resolve(__dirname, "..", "..");
let parser;
function acorn() {
    if (parser) return parser;
    try {
        const source = process.binding("natives")["internal/deps/acorn/acorn/dist/acorn"];
        if (!source) throw new Error("bundled Acorn source is unavailable");
        const exports = {};
        vm.runInThisContext("(function(exports,module){" + source + "\n})", { filename: "node-bundled-acorn.js" })(exports, { exports });
        if (typeof exports.parse !== "function") throw new Error("bundled Acorn has no parse()");
        parser = exports; return parser;
    } catch (e) { throw new Error("VM_HARNESS_SCAN_PARSER: this Node distribution must expose bundled Acorn; " + e.message); }
}
// A finite union of atoms. Text atoms carry source-coordinate intervals.
const UNKNOWN = { kind: "unknown" }, U = [UNKNOWN];
const P = x => [{ kind: "primitive", value: x }];
const T = (text, spans = [], registry = false) => [{ kind: "text", text: String(text), spans, registry }];
const N = name => [{ kind: "native", name }];
const isText = a => a.kind === "text" || (a.kind === "primitive" && typeof a.value === "string");
const scalar = a => a.kind === "text" ? a.text : a.kind === "primitive" ? a.value : undefined;
const atomKeys = new WeakMap();
function key(a) {
    if (a.kind === "unknown") return "?";
    if (a.kind === "primitive") return a.kind + ":" + typeof a.value + ":" + String(a.value);
    if (a.kind === "text") {
        if (!atomKeys.has(a)) atomKeys.set(a, "t:" + a.text + ":" + a.spans.map(s => [s.target, s.lo, s.hi, s.start, s.end].join(",")).join(";"));
        return atomKeys.get(a);
    }
    if (a.kind === "function") return "f:" + a.node.start + ":" + a.scope.id;
    if (a.kind === "regex") return "r:" + a.pattern + "/" + a.flags;
    return a.kind + ":" + (a.id || a.name);
}
function union(...values) {
    const out = [], seen = new Set();
    for (const value of values) for (const atom of value || []) { const k = key(atom); if (!seen.has(k)) { seen.add(k); out.push(atom); } }
    if (out.length > 96) return out.filter(a => a.kind === "text" && a.spans.length).concat(U);
    return out.length ? out : U;
}
function truth(value) {
    let yes = false, no = false;
    for (const a of value) {
        if (a.kind === "unknown" || a.kind === "native") { yes = no = true; }
        else if (a.kind === "primitive" || a.kind === "text") { if (scalar(a)) yes = true; else no = true; }
        else yes = true;
    }
    return yes && no ? null : yes;
}
function clip(atom, start, end) {
    const text = atom.text.slice(start, end), spans = [];
    for (const s of atom.spans || []) {
        const a = Math.max(start, s.start), b = Math.min(end, s.end);
        if (a >= b || s.end === s.start) continue;
        const ratio = (s.hi - s.lo) / (s.end - s.start);
        spans.push({ ...s, lo: s.lo + (a - s.start) * ratio, hi: s.lo + (b - s.start) * ratio, start: a - start, end: b - start });
    }
    return T(text, spans, atom.registry && start === 0 && end === atom.text.length);
}
function concatenate(a, b) {
    const left = isText(a) ? String(scalar(a)) : a.kind === "primitive" ? String(a.value) : null;
    const right = isText(b) ? String(scalar(b)) : b.kind === "primitive" ? String(b.value) : null;
    if (left === null || right === null) return U;
    return T(left + right, [...(a.spans || []), ...(b.spans || []).map(s => ({ ...s, start: s.start + left.length, end: s.end + left.length }))]);
}
function completeTargets(value) {
    const targets = new Set();
    for (const atom of value) {
        if (atom.kind !== "text") continue;
        const groups = new Map();
        for (const s of atom.spans) { const group = groups.get(s.target) || []; group.push(s); groups.set(s.target, group); }
        for (const [target, spans] of groups) {
            spans.sort((a, b) => a.lo - b.lo); let end = 0;
            for (const s of spans) { if (s.lo > end + 1e-7) break; end = Math.max(end, s.hi); }
            if (spans.length && end >= spans[0].total - 1e-7) targets.add(target);
        }
    }
    return [...targets].sort();
}
function classify(source, options = {}) {
    let ast;
    try { ast = acorn().parse(source, { ecmaVersion: "latest", sourceType: "script", locations: true, allowHashBang: true, allowReturnOutsideFunction: true }); }
    catch (e) { throw new Error(`VM_HARNESS_SCAN_PARSE ${options.filename || "<source>"}: ${e.message}`); }
    let possibleEvaluation = false, possibleSource = false;
    (function findSink(node) {
        if (!node || typeof node !== "object") return;
        if (node.type === "Identifier" && ["runInContext", "runInNewContext", "Script", "compileFunction"].includes(node.name)) possibleEvaluation = true;
        if (node.type === "MemberExpression" && node.computed && node.property.type === "Literal" && ["runInContext", "runInNewContext", "Script", "compileFunction"].includes(node.property.value)) possibleEvaluation = true;
        const text = node.type === "Literal" && typeof node.value === "string" ? node.value : node.type === "TemplateElement" ? node.value.cooked : null;
        if (text && (TARGETS.includes(text) || /DEUS_|(?:^|[\\/])plugins(?:\.js)?(?:$|[\\/])/.test(text))) possibleSource = true;
        for (const [k, v] of Object.entries(node)) if (k !== "loc") { if (Array.isArray(v)) v.forEach(findSink); else if (v && typeof v === "object") findSink(v); }
    })(ast);
    // Both are necessary for the modeled constant/module-list read domain. Inspect decoded AST
    // literals and template parts, so comments and string escaping do not change the rule.
    if (!possibleEvaluation || !possibleSource) return { vm: false, targets: [], hit: false, evaluations: [], hookFailures: [] };
    const root = path.resolve(options.root || DEFAULT_ROOT);
    let serial = 0, steps = 0, depth = 0, vmFound = false;
    const began = Date.now();
    const evaluations = [], seenEvaluations = new Map(), called = new Set(), rootFunctions = [], active = new Set();
    const state = { vars: new Map(), heap: new Map(), installed: new Set(), dead: false, returned: [] };
    const makeScope = parent => ({ id: ++serial, parent, bindings: new Map() });
    const global = makeScope(null);
    const tick = node => { if (++steps > 250000 || Date.now() - began > 10000) throw new Error(`VM_HARNESS_SCAN_LIMIT ${options.filename || "<source>"}:${node?.loc?.start.line || "?"}: ${steps} steps, ${Date.now() - began} ms`); };
    function binding(scope, name, create = false) {
        for (let s = scope; s; s = s.parent) if (s.bindings.has(name)) return s.bindings.get(name);
        if (!create) return null;
        const id = ++serial; scope.bindings.set(name, id); return id;
    }
    function declare(scope, name) { if (!scope.bindings.has(name)) scope.bindings.set(name, ++serial); return scope.bindings.get(name); }
    function get(scope, name, st) {
        const id = binding(scope, name); if (id !== null) return st.vars.get(id) || U;
        if (name === "undefined") return P(undefined);
        if (name === "Infinity") return P(Infinity);
        if (name === "__dirname") return T(path.dirname(options.filename ? path.resolve(root, options.filename) : path.join(root, "tools", "fixture.js")));
        if (name === "__filename") return T(options.filename ? path.resolve(root, options.filename) : path.join(root, "tools", "fixture.js"));
        if (["require", "String", "Buffer", "Object", "Array", "JSON", "Number", "Boolean", "Set", "Map", "Math", "process", "Function"].includes(name)) return N(name);
        return U;
    }
    function freshObject(st, array = false, props) { const id = ++serial; st.heap.set(id, { array, props: new Map(props || []) }); return [{ kind: "object", id }]; }
    function arrayValue(st, items) { return freshObject(st, true, items.map((v, i) => [String(i), v]).concat([["length", P(items.length)]])); }
    function entries(value, st) {
        const out = [];
        for (const a of value) if (a.kind === "object") { const obj = st.heap.get(a.id); if (obj) for (const [k, v] of obj.props) if (/^\d+$/.test(k) || k === "*") out.push([k, v]); }
        return out;
    }
    const elements = (value, st) => union(...entries(value, st).map(e => e[1]));
    function properties(value, name, st) {
        const out = [];
        for (const a of value) {
            if (a.kind === "native") out.push(N(a.name + "." + name));
            else if (a.kind === "object") {
                const obj = st.heap.get(a.id); if (!obj) continue;
                if (name === "*") out.push(...[...obj.props].filter(([k]) => k !== "length").map(([, v]) => v));
                else out.push(obj.props.get(name) || obj.props.get("*") || U);
            } else if (name === "length" && isText(a)) out.push(P(String(scalar(a)).length));
            else if (/^\d+$/.test(name) && isText(a)) out.push(T(String(scalar(a))[Number(name)] || ""));
            else if (a.kind === "script" && name.startsWith("runIn")) out.push([{ kind: "scriptMethod", name, id: a.id, code: a.code }]);
        }
        return union(...out);
    }
    function put(value, name, v, st) { for (const a of value) if (a.kind === "object") { const obj = st.heap.get(a.id); if (obj) obj.props.set(name, name === "*" ? union(obj.props.get(name), v) : v); } }
    const names = value => [...new Set(value.map(scalar).filter(a => typeof a === "string" || typeof a === "number").map(String))];
    function member(node, scope, st) { const object = expr(node.object, scope, st), keys = node.computed ? names(expr(node.property, scope, st)) : [node.property.name]; return { object, keys: keys.length ? keys : ["*"] }; }
    function assign(node, value, scope, st, declaration = false) {
        if (!node) return;
        if (node.type === "Identifier") { const id = declaration ? declare(scope, node.name) : binding(scope, node.name, true); st.vars.set(id, value); }
        else if (node.type === "MemberExpression") { const m = member(node, scope, st); for (const k of m.keys) put(m.object, k, value, st); }
        else if (node.type === "AssignmentPattern") assign(node.left, value.some(a => a.kind !== "unknown" && !(a.kind === "primitive" && a.value === undefined)) ? value : expr(node.right, scope, st), scope, st, declaration);
        else if (node.type === "RestElement") assign(node.argument, value, scope, st, declaration);
        else if (node.type === "ArrayPattern") node.elements.forEach((p, i) => assign(p, properties(value, String(i), st), scope, st, declaration));
        else if (node.type === "ObjectPattern") for (const p of node.properties) { if (p.type === "RestElement") assign(p.argument, value, scope, st, declaration); else assign(p.value, properties(value, p.key.name || String(p.key.value), st), scope, st, declaration); }
    }
    function clone(st) { return { vars: new Map(st.vars), heap: new Map([...st.heap].map(([id, obj]) => [id, { array: obj.array, props: new Map(obj.props) }])), installed: new Set(st.installed), dead: st.dead, returned: st.returned.slice() }; }
    function merge(st, a, b) {
        st.vars = new Map([...new Set([...a.vars.keys(), ...b.vars.keys()])].map(k => [k, union(a.vars.get(k), b.vars.get(k))])); st.heap = new Map();
        for (const id of new Set([...a.heap.keys(), ...b.heap.keys()])) {
            const x = a.heap.get(id), y = b.heap.get(id);
            if (!x || !y) { const obj = x || y; st.heap.set(id, { array: obj.array, props: new Map(obj.props) }); continue; }
            st.heap.set(id, { array: x.array || y.array, props: new Map([...new Set([...x.props.keys(), ...y.props.keys()])].map(k => [k, union(x.props.get(k), y.props.get(k))])) });
        }
        st.installed = a.dead && !b.dead ? b.installed : b.dead && !a.dead ? a.installed : new Set([...a.installed].filter(id => b.installed.has(id)));
        st.dead = a.dead && b.dead; st.returned = union(a.returned, b.returned);
    }
    function hoist(body, scope, st) {
        for (const node of body || []) {
            if (node.type === "FunctionDeclaration") { const value = [{ kind: "function", node, scope }]; assign(node.id, value, scope, st, true); if (scope === global) rootFunctions.push(value[0]); }
            else if (node.type === "VariableDeclaration") for (const d of node.declarations) if (d.id.type === "Identifier") declare(scope, d.id.name);
        }
    }
    function invoke(value, args, st, at) {
        const results = [];
        for (const fn of value) {
            if (fn.kind === "native") { results.push(native(fn.name, args, st, at)); continue; }
            if (fn.kind === "scriptMethod") { record(fn.code, args[0] || U, st, at); results.push(U); continue; }
            if (fn.kind !== "function") continue;
            if (depth > 15 || active.has(fn.node)) { results.push(U); continue; }
            called.add(fn.node); active.add(fn.node); depth++;
            const local = makeScope(fn.scope), wasDead = st.dead, previousReturn = st.returned; st.dead = false; st.returned = [];
            fn.node.params.forEach((p, i) => assign(p, p.type === "RestElement" ? arrayValue(st, args.slice(i)) : args[i] || U, local, st, true));
            if (fn.node.body.type === "BlockStatement") block(fn.node.body.body, local, st); else st.returned = expr(fn.node.body, local, st);
            results.push(st.returned.length ? st.returned : P(undefined)); st.returned = previousReturn; st.dead = wasDead;
            depth--; active.delete(fn.node);
        }
        return union(...results);
    }
    function record(code, sandbox, st, node) {
        vmFound = true;
        if (code.some(a => a.kind === "text" && a.registry)) {
            const modules = registryNames.map(name => freshObject(st, false, [["name", T(name)], ["status", P(true)], ["parameters", freshObject(st)]]));
            put(sandbox, "$plugins", arrayValue(st, modules), st);
        }
        const targets = completeTargets(code); if (!targets.length) return;
        const identities = sandbox.filter(a => a.kind === "object").map(a => a.id);
        const installed = identities.length > 0 && !sandbox.some(a => a.kind === "unknown") && identities.every(id => st.installed.has(id));
        const k = node.start + ":" + targets.join(","), old = seenEvaluations.get(k);
        if (old) { old.hooked = old.hooked && installed; return; }
        const event = { line: node.loc.start.line, column: node.loc.start.column + 1, targets, hooked: installed, reason: installed ? "hook dominates evaluation on the same sandbox" : "no proven prior hook on the evaluating sandbox" };
        seenEvaluations.set(k, event); evaluations.push(event);
    }
    const sourceCache = new Map();
    function readSource(value) {
        const out = [];
        for (const raw of names(value)) {
            const normalized = raw.replace(/\\/g, "/"), match = TARGET_FILE.exec(normalized);
            if (match) {
                const target = "DEUS_" + match[1];
                if (!sourceCache.has(target)) {
                    const candidates = [path.resolve(root, raw), path.join(root, "game", "js", "plugins", target + ".js"), path.join(DEFAULT_ROOT, "game", "js", "plugins", target + ".js")];
                    const file = candidates.find(p => fs.existsSync(p) && fs.statSync(p).isFile());
                    const text = file ? fs.readFileSync(file, "utf8") : `/* ${target} */\n(function(){\nreturn 1;\n})();\n`;
                    sourceCache.set(target, T(text, [{ target, total: text.length, lo: 0, hi: text.length, start: 0, end: text.length }]));
                }
                out.push(sourceCache.get(target));
            } else if (/(?:^|\/)game\/js\/plugins\.js$/.test(normalized) || /(?:^|\/)js\/plugins\.js$/.test(normalized)) out.push(T("var $plugins = [];", [], true));
            else out.push(U);
        }
        return union(...out);
    }
    // Registry entries are data, not source executions. Names feed module-list filters.
    const registrySet = new Set(TARGETS.map(n => "DEUS_" + n));
    (function collect(node) {
        if (!node || typeof node !== "object") return;
        if (node.type === "Literal" && typeof node.value === "string") {
            if (/^DEUS_[A-Za-z0-9_]+(?:\.js)?$/.test(node.value)) registrySet.add(node.value.replace(/\.js$/, ""));
            else if (/^[A-Z][A-Za-z0-9]+$/.test(node.value) && node.value.length < 40) registrySet.add("DEUS_" + node.value);
        }
        for (const [k, v] of Object.entries(node)) if (k !== "loc") { if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === "object") collect(v); }
    })(ast);
    const registryNames = [...registrySet];
    function native(name, args, st, node) {
        if (name === "require") return union(...names(args[0] || U).map(n => {
            const base = n.replace(/^node:/, "");
            if (/(?:^|[\\/])vm_sim_require(?:\.js)?$/.test(base)) return N("simHook");
            if (base === "vm") vmFound = true;
            return N(base);
        }));
        if (name === "simHook.install") { for (const a of args[0] || []) if (a.kind === "object") st.installed.add(a.id); return args[0] || U; }
        if (name === "vm.createContext") { vmFound = true; return args[0] || freshObject(st); }
        if (["vm.runInContext", "vm.runInNewContext"].includes(name)) { record(args[0] || U, args[1] || U, st, node); return U; }
        if (name === "vm.Script") return [{ kind: "script", id: ++serial, code: args[0] || U }];
        if (name === "fs.readFileSync" || name === "fs.readFile") return readSource(args[0] || U);
        if (name === "path.join" || name === "path.resolve") {
            let out = T("");
            for (const arg of args) { const parts = []; for (const a of out) for (const b of arg) if (scalar(b) !== undefined) parts.push(T(String(scalar(a)) + "/" + String(scalar(b)))); out = union(...parts); }
            return out;
        }
        if (name === "path.dirname") return union(...names(args[0] || U).map(n => T(path.dirname(n))));
        if (["String", "Buffer.from"].includes(name)) return args[0] || T("");
        if (name === "Object.freeze" || name === "Object.seal") return args[0] || U;
        if (name === "Object.create") return freshObject(st);
        if (name === "Object.assign") { const target = args[0] || freshObject(st); for (const v of args.slice(1)) for (const a of v) if (a.kind === "object") { const obj = st.heap.get(a.id); if (obj) for (const [k, val] of obj.props) put(target, k, val, st); } return target; }
        if (["Object.keys", "Object.values", "Object.entries"].includes(name)) {
            const result = [];
            for (const a of args[0] || []) if (a.kind === "object") for (const [k, v] of (st.heap.get(a.id) || { props: new Map() }).props) {
                if (k === "length" || k === "*") continue;
                result.push(name === "Object.keys" ? T(k) : name === "Object.values" ? v : arrayValue(st, [T(k), v]));
            }
            return arrayValue(st, result);
        }
        if (name === "Set" || name === "Array.from") return arrayValue(st, entries(args[0] || U, st).map(e => e[1]));
        if (name === "Array.isArray") return P((args[0] || []).some(a => a.kind === "object" && st.heap.get(a.id)?.array));
        if (name === "JSON.parse") return (args[0] || []).some(a => a.kind === "object") ? args[0] : U;
        if (name === "JSON.stringify") return args[0] || U;
        if (name === "process.cwd") return T(root);
        if (name === "process.exit") { st.dead = true; return U; }
        if (["child_process.spawnSync", "child_process.execFileSync"].includes(name)) {
            const command = names(args[0] || U), argv = entries(args[1] || U, st).map(e => e[1]);
            if (command.includes("git") && names(argv[0] || U).includes("show")) {
                const files = union(...names(argv[1] || U).map(n => T(n.slice(n.indexOf(":") + 1))));
                const text = readSource(files);
                return name.endsWith("execFileSync") ? text : freshObject(st, false, [["stdout", text], ["status", P(0)]]);
            }
            return U;
        }
        if (name.startsWith("crypto.")) return N("hash");
        if (name === "hash.digest") return T("HASH");
        if (name.startsWith("hash.")) return N("hash");
        if (name === "Number") return union(...(args[0] || U).map(a => a.kind === "primitive" || a.kind === "text" ? P(Number(scalar(a))) : U));
        if (name === "Boolean") { const t = truth(args[0] || U); return t === null ? U : P(t); }
        return U;
    }
    function method(object, name, args, st, node) {
        const own = properties(object, name, st);
        if (own.some(a => a.kind === "function" || a.kind === "native" || a.kind === "scriptMethod")) return invoke(own, args, st, node);
        if (name === "toString" || name === "valueOf") return object;
        const array = object.some(a => a.kind === "object" && st.heap.get(a.id)?.array);
        if (array && ["map", "forEach", "filter", "find", "some", "every", "flatMap"].includes(name)) {
            const results = []; let i = 0;
            for (const [, item] of entries(object, st).slice(0, 64)) {
                const result = invoke(args[0] || U, [item, P(i++), object], st, node), t = truth(result);
                if (name === "map") results.push(result);
                if (name === "flatMap") results.push(...entries(result, st).map(e => e[1]));
                if ((name === "filter" || name === "find") && t !== false) results.push(item);
                if (name === "some" && t === true) return P(true);
                if (name === "every" && t === false) return P(false);
            }
            if (name === "find") return union(...results);
            if (name === "some" || name === "every") return U;
            return name === "forEach" ? P(undefined) : arrayValue(st, results);
        }
        if (array && name === "concat") return arrayValue(st, [...entries(object, st).map(e => e[1]), ...args.flatMap(v => entries(v, st).length ? entries(v, st).map(e => e[1]) : [v])]);
        if (array && ["push", "add", "unshift"].includes(name)) { let n = entries(object, st).length; for (const a of args) put(object, String(n++), a, st); put(object, "length", P(n), st); return name === "add" ? object : P(n); }
        if (array && ["includes", "has", "indexOf"].includes(name)) {
            const all = elements(object, st), wanted = args[0] || U;
            if (wanted.some(a => a.kind === "unknown") || all.some(a => a.kind === "unknown")) return U;
            const found = wanted.some(a => all.some(b => scalar(a) === scalar(b)));
            return name === "indexOf" ? P(found ? 0 : -1) : P(found);
        }
        if (array && name === "join") {
            let out = T(""); const sep = names(args[0] || T(","))[0] || ""; let i = 0;
            for (const [, item] of entries(object, st)) { if (i++) out = union(...out.map(a => concatenate(a, T(sep)[0]))); out = union(...out.flatMap(a => item.map(b => concatenate(a, b)))); }
            return out;
        }
        if (array && ["slice", "reverse", "sort"].includes(name)) return object;
        if (name === "exec" && object.some(a => a.kind === "regex")) return stringMethod(args[0] || U, "match", [object], st, node);
        if (name === "test" && object.some(a => a.kind === "regex")) return U;
        return stringMethod(object, name, args, st, node);
    }
    function stringMethod(object, name, args, st, node) {
        const out = [];
        for (const a0 of object) {
            if (!isText(a0)) continue;
            const a = a0.kind === "text" ? a0 : T(String(a0.value))[0], text = a.text;
            const params = args.map(v => v.length === 1 && (v[0].kind === "primitive" || v[0].kind === "text") ? scalar(v[0]) : undefined);
            if (["slice", "substring", "substr"].includes(name)) {
                if (args.some((v, i) => params[i] === undefined && !v.every(x => x.kind === "primitive" && x.value === undefined))) continue;
                let start = params[0] === undefined ? 0 : Number(params[0]), end;
                if (name === "slice") { start = start < 0 ? Math.max(0, text.length + start) : Math.min(text.length, start); end = params[1] === undefined ? text.length : Number(params[1]); end = end < 0 ? Math.max(0, text.length + end) : Math.min(text.length, end); }
                else if (name === "substring") { start = Math.min(text.length, Math.max(0, start)); end = params[1] === undefined ? text.length : Math.min(text.length, Math.max(0, Number(params[1]))); if (start > end) [start, end] = [end, start]; }
                else { start = start < 0 ? Math.max(0, text.length + start) : Math.min(text.length, start); end = params[1] === undefined ? text.length : Math.min(text.length, start + Math.max(0, Number(params[1]))); }
                out.push(clip(a, start, Math.max(start, end)));
            } else if (name === "match") {
                for (const r of args[0] || []) {
                    let regex; try { regex = r.kind === "regex" ? new RegExp(r.pattern, r.flags) : new RegExp(String(scalar(r))); } catch (_) { continue; }
                    const matches = text.match(regex);
                    if (!matches) { out.push(P(null)); continue; }
                    const items = []; let previous = 0;
                    for (const match of matches.slice(0, 64)) {
                        if (match === undefined) { items.push(P(undefined)); continue; }
                        const start = text.indexOf(match, regex.global ? previous : 0); previous = start + match.length;
                        items.push(start < 0 ? T(match) : clip(a, start, start + match.length));
                    }
                    out.push(arrayValue(st, items));
                }
            } else if (name === "replace" || name === "replaceAll") {
                const r = args[0] && args[0][0], replacement = args[1]; let next = text;
                if (r && replacement && replacement.length === 1 && isText(replacement[0])) {
                    const pattern = r.kind === "regex" ? new RegExp(r.pattern, r.flags) : scalar(r);
                    if (pattern !== undefined) { try { next = text[name](pattern, scalar(replacement[0])); } catch (_) {} }
                }
                const ratio = text.length ? next.length / text.length : 1;
                out.push(T(next, a.spans.map(s => ({ ...s, start: s.start * ratio, end: s.end * ratio })), a.registry));
            } else if (name === "indexOf" || name === "lastIndexOf") out.push(params[0] === undefined ? U : P(text[name](String(params[0]), params[1])));
            else if (name === "includes" || name === "startsWith" || name === "endsWith") out.push(params[0] === undefined ? U : P(text[name](String(params[0]))));
            else if (name === "trim" || name === "trimStart" || name === "trimEnd") { const next = text[name](), start = text.indexOf(next); out.push(clip(a, start, start + next.length)); }
            else if (name === "split") {
                if (params[0] === undefined) out.push(arrayValue(st, [[a]]));
                else { let offset = 0; const parts = text.split(String(params[0])).slice(0, 64).map(part => { const start = text.indexOf(part, offset); offset = start + part.length + String(params[0]).length; return clip(a, start, start + part.length); }); out.push(arrayValue(st, parts)); }
            } else if (name === "concat") { let v = [a]; for (const arg of args) v = union(...v.flatMap(x => arg.map(y => concatenate(x, y)))); out.push(v); }
            else if (name === "toLowerCase" || name === "toUpperCase") out.push(T(text[name]()));
            else if (name === "matchAll") out.push(arrayValue(st, []));
        }
        return union(...out);
    }
    function expr(node, scope, st) {
        if (!node) return U; tick(node);
        switch (node.type) {
            case "Literal": return node.regex ? [{ kind: "regex", pattern: node.regex.pattern, flags: node.regex.flags }] : typeof node.value === "string" ? T(node.value) : P(node.value);
            case "Identifier": return get(scope, node.name, st);
            case "ThisExpression": return U;
            case "ChainExpression": return expr(node.expression, scope, st);
            case "FunctionExpression": case "ArrowFunctionExpression": return [{ kind: "function", node, scope }];
            case "ArrayExpression": {
                const items = []; for (const e of node.elements) { if (e?.type === "SpreadElement") items.push(...entries(expr(e.argument, scope, st), st).map(x => x[1])); else items.push(e ? expr(e, scope, st) : P(undefined)); }
                return arrayValue(st, items);
            }
            case "ObjectExpression": {
                const out = freshObject(st);
                for (const p of node.properties) {
                    if (p.type === "SpreadElement") { const v = expr(p.argument, scope, st); for (const a of v) if (a.kind === "object") for (const [k, x] of st.heap.get(a.id).props) put(out, k, x, st); }
                    else { const keys = p.computed ? names(expr(p.key, scope, st)) : [p.key.name || String(p.key.value)]; const v = expr(p.value, scope, st); for (const k of keys) put(out, k, v, st); }
                }
                return out;
            }
            case "MemberExpression": { const m = member(node, scope, st); return union(...m.keys.map(k => properties(m.object, k, st))); }
            case "TemplateLiteral": {
                let out = T(node.quasis[0].value.cooked);
                node.expressions.forEach((e, i) => { const v = expr(e, scope, st); out = union(...out.flatMap(a => v.map(b => concatenate(a, b)))); out = union(...out.map(a => concatenate(a, T(node.quasis[i + 1].value.cooked)[0]))); }); return out;
            }
            case "BinaryExpression": {
                const left = expr(node.left, scope, st), right = expr(node.right, scope, st), out = [];
                for (const a of left) for (const b of right) {
                    if (node.operator === "+" && (isText(a) || isText(b))) { out.push(concatenate(a, b)); continue; }
                    if (!["text", "primitive"].includes(a.kind) || !["text", "primitive"].includes(b.kind)) { out.push(U); continue; }
                    const x = scalar(a), y = scalar(b); let result;
                    switch (node.operator) {
                        case "+": result = x + y; break; case "-": result = x - y; break; case "*": result = x * y; break; case "/": result = x / y; break; case "%": result = x % y; break;
                        case "===": case "==": result = x === y; break; case "!==": case "!=": result = x !== y; break;
                        case "<": result = x < y; break; case ">": result = x > y; break; case "<=": result = x <= y; break; case ">=": result = x >= y; break;
                        default: out.push(U); continue;
                    }
                    out.push(P(result));
                }
                return union(...out);
            }
            case "LogicalExpression": {
                const a = expr(node.left, scope, st), t = truth(a);
                if (node.operator === "&&" && t === false || node.operator === "||" && t === true) return a;
                if (node.operator === "&&" && t === true || node.operator === "||" && t === false) return expr(node.right, scope, st);
                const before = clone(st), after = clone(st), b = expr(node.right, scope, after); merge(st, before, after); return union(a, b);
            }
            case "ConditionalExpression": {
                const t = truth(expr(node.test, scope, st)); if (t !== null) return expr(t ? node.consequent : node.alternate, scope, st);
                const a = clone(st), b = clone(st), x = expr(node.consequent, scope, a), y = expr(node.alternate, scope, b); merge(st, a, b); return union(x, y);
            }
            case "AssignmentExpression": {
                const value = expr(node.right, scope, st), assigned = node.operator === "+=" ? union(...expr(node.left, scope, st).flatMap(a => value.map(b => concatenate(a, b)))) : value;
                assign(node.left, assigned, scope, st); return assigned;
            }
            case "SequenceExpression": { let out = U; for (const e of node.expressions) out = expr(e, scope, st); return out; }
            case "UnaryExpression": { const v = expr(node.argument, scope, st), t = truth(v); if (node.operator === "!") return t === null ? U : P(!t); if (node.operator === "void") return P(undefined); if (node.operator === "-") return union(...v.map(a => a.kind === "primitive" ? P(-a.value) : U)); if (node.operator === "typeof") return U; return v; }
            case "UpdateExpression": assign(node.argument, U, scope, st); return U;
            case "AwaitExpression": case "YieldExpression": return expr(node.argument, scope, st);
            case "CallExpression": case "NewExpression": {
                const args = [];
                for (const a of node.arguments) { if (a.type === "SpreadElement") args.push(...entries(expr(a.argument, scope, st), st).map(x => x[1])); else args.push(expr(a, scope, st)); }
                if (node.callee.type === "MemberExpression") { const m = member(node.callee, scope, st); return union(...m.keys.map(k => method(m.object, k, args, st, node))); }
                return invoke(expr(node.callee, scope, st), args, st, node);
            }
            case "TaggedTemplateExpression": return U;
            default: return U;
        }
    }
    function block(body, scope, st) { hoist(body, scope, st); for (const node of body) { if (st.dead) break; stmt(node, scope, st); } }
    function stmt(node, scope, st) {
        if (!node) return; tick(node);
        switch (node.type) {
            case "VariableDeclaration": for (const d of node.declarations) assign(d.id, d.init ? expr(d.init, scope, st) : U, scope, st, true); break;
            case "FunctionDeclaration": break;
            case "ExpressionStatement": expr(node.expression, scope, st); break;
            case "BlockStatement": block(node.body, makeScope(scope), st); break;
            case "ReturnStatement": st.returned = union(st.returned, node.argument ? expr(node.argument, scope, st) : P(undefined)); st.dead = true; break;
            case "ThrowStatement": expr(node.argument, scope, st); st.dead = true; break;
            case "IfStatement": {
                const t = truth(expr(node.test, scope, st));
                if (t !== null) stmt(t ? node.consequent : node.alternate, scope, st);
                else { const a = clone(st), b = clone(st); stmt(node.consequent, scope, a); stmt(node.alternate, scope, b); merge(st, a, b); } break;
            }
            case "ForOfStatement": case "ForInStatement": {
                const value = expr(node.right, scope, st), items = node.type === "ForOfStatement" ? entries(value, st).map(e => e[1]) : [];
                const iterable = items.length ? items.slice(0, 64) : [U], loop = makeScope(scope);
                for (const item of iterable) { if (node.left.type === "VariableDeclaration") assign(node.left.declarations[0].id, item, loop, st, true); else assign(node.left, item, loop, st); stmt(node.body, loop, st); if (st.dead) break; }
                break;
            }
            case "ForStatement": case "WhileStatement": case "DoWhileStatement": {
                const loop = makeScope(scope); if (node.init) node.init.type === "VariableDeclaration" ? stmt(node.init, loop, st) : expr(node.init, loop, st);
                const test = node.test ? truth(expr(node.test, loop, st)) : null;
                if (test !== false || node.type === "DoWhileStatement") { const before = clone(st), after = clone(st); stmt(node.body, loop, after); if (node.update) expr(node.update, loop, after); merge(st, before, after); } break;
            }
            case "TryStatement": {
                const a = clone(st), b = clone(st); stmt(node.block, scope, a);
                if (node.handler) { const local = makeScope(scope); assign(node.handler.param, U, local, b, true); stmt(node.handler.body, local, b); merge(st, a, b); } else Object.assign(st, a);
                if (node.finalizer) { st.dead = false; stmt(node.finalizer, scope, st); } break;
            }
            case "SwitchStatement": { expr(node.discriminant, scope, st); const states = node.cases.map(c => { const copy = clone(st); block(c.consequent, makeScope(scope), copy); return copy; }); for (const copy of states) merge(st, clone(st), copy); break; }
            case "LabeledStatement": stmt(node.body, scope, st); break;
            case "BreakStatement": case "ContinueStatement": case "EmptyStatement": case "DebuggerStatement": break;
            default: break;
        }
    }
    block(ast.body, global, state);
    // Exported/CLI-gated loaders are additional roots. Nested callbacks are reached through their
    // actual calls, retaining outer hook dominance; probing a root cannot change the main state.
    for (const fn of rootFunctions) if (!called.has(fn.node)) { const copy = clone(state); copy.dead = false; invoke([fn], fn.node.params.map(() => U), copy, fn.node); }
    const targets = [...new Set(evaluations.flatMap(e => e.targets))].sort();
    const failures = evaluations.filter(e => !e.hooked).map(e => ({ line: e.line, column: e.column, targets: e.targets, reason: e.reason }));
    return { vm: vmFound, targets, hit: targets.length > 0, evaluations, hookFailures: failures };
}
function hookFailures(source, options) { return classify(source, options).hookFailures; }
function walk(dir, out) {
    let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) { if (e.name === "node_modules" || e.name === ".git") continue; const full = path.join(dir, e.name); if (e.isDirectory()) walk(full, out); else if (e.isFile() && e.name.endsWith(".js")) out.push(full); }
}
function scan(options = {}) {
    const root = path.resolve(options.root || DEFAULT_ROOT), files = [], hits = [];
    for (const dir of options.dirs || ["tools"]) walk(path.join(root, dir), files);
    for (const full of files) {
        const source = fs.readFileSync(full, "utf8");
        // A necessary lexical prefilter only: the AST determines whether these tokens are code.
        if (!/\b(?:vm|runInContext|runInNewContext|createContext|Script)\b/.test(source)) continue;
        const file = path.relative(root, full).split(path.sep).join("/");
        if (process.env.VM_SCAN_DEBUG) console.error("VM_SCAN " + file);
        const result = classify(source, { root, filename: file });
        if (result.hit) hits.push({ file, targets: result.targets, evaluations: result.evaluations, hookFailures: result.hookFailures });
    }
    hits.sort((a, b) => a.file.localeCompare(b.file)); return { root, scanned: files.length, hits };
}
module.exports = { scan, classify, hookFailures, TARGETS };
if (require.main === module) {
    const args = process.argv.slice(2), at = args.indexOf("--root"), result = scan({ root: at >= 0 ? args[at + 1] : undefined });
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else { for (const h of result.hits) console.log(`${h.file}  ${h.targets.join(" ")}`); console.log(`${result.hits.length} hits in ${result.scanned} files under ${result.root}`); }
}
