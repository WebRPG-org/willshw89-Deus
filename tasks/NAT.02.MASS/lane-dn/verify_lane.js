"use strict";

// Reproduce writer evidence, not a review verdict or merge_gate bypass.
// Every command is foreground/synchronous. Scratch writes stay in this lane.
const assert = require("node:assert/strict");
const cp = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const lane = __dirname;
const root = path.resolve(lane, "../../..");
const evidence = path.join(lane, "evidence");
fs.mkdirSync(evidence, { recursive: true });
const git = (...args) => cp.execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const sha = git("rev-parse", "HEAD");
const base = "3b12aed03ce7a66a4c84ec0cedc3bec453002fdc";
const created = fs.mkdtempSync(path.join(lane, "verification-"));

function run(name, command, args, cwd, expected = 0) {
    const started = new Date().toISOString();
    const result = cp.spawnSync(command, args, { cwd, encoding: "utf8", timeout: 900000, windowsHide: true });
    const log = `Date ${started}\nWriter SHA ${sha}\nCWD ${cwd}\nCommand: ${command} ${args.join(" ")}\n`
        + (result.stdout || "") + (result.stderr || "") + `\nEXIT ${result.status}\n`;
    fs.writeFileSync(path.join(evidence, name + ".txt"), log);
    process.stdout.write(log);
    if (result.error) throw result.error;
    assert.equal(result.status, expected, `${name}: unexpected exit`);
    return log;
}

function clone(name, revision) {
    const dest = path.join(created, name);
    cp.execFileSync("git", ["clone", "--quiet", "--shared", "--no-checkout", root, dest], { cwd: lane, stdio: "pipe", timeout: 900000 });
    // Checkout only code used by these headless suites, preserving an isolated
    // full Git object graph. No artwork is copied, generated or integrated.
    cp.execFileSync("git", ["-C", dest, "sparse-checkout", "set", "--no-cone", "/game/js/", "/tools/"], { stdio: "pipe" });
    cp.execFileSync("git", ["-C", dest, "-c", "core.autocrlf=false", "-c", "core.eol=lf", "-c", "core.safecrlf=false", "checkout", "--quiet", "--detach", revision], { stdio: "pipe", timeout: 900000 });
    assert.equal(cp.execFileSync("git", ["-C", dest, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(), revision);
    return dest;
}

try {
    assert.equal(git("branch", "--show-current"), "task/lane-dn");
    const manifest = JSON.parse(fs.readFileSync(path.join(lane, "lane.json"), "utf8"));
    const harness = fs.readFileSync(path.join(root, "tools/sim/test_units.js"), "utf8");
    for (let i = 0; i < manifest.gateTests.length; i++) {
        const gate = manifest.gateTests[i];
        const cwd = clone("gate-" + (i + 1), sha);
        run("gate-" + (i + 1), gate.cmd, gate.args, cwd);
    }
    // Final harness against the actual lane base: absence, not behavior proof.
    const absent = clone("base-absence", base);
    const baseHarness = path.join(absent, "tools/sim/test_units.js");
    assert(!fs.existsSync(path.join(absent, "game/js/sim/units.js")));
    fs.mkdirSync(path.dirname(baseHarness), { recursive: true });
    fs.writeFileSync(baseHarness, harness);
    run("base-final-harness-absence", "node", ["tools/sim/test_units.js"], absent, 1);

    // Disable exactly the remainder mutant's killing check in a scratch copy.
    // Keep the same four mutants: it MUST report a survivor and exit 1.
    const scratch = path.join(created, "survivor-test.js");
    const target = /    apportion_exact\(u\) \{[\s\S]*?\n    \},\n    overflow_refused/;
    assert(target.test(harness));
    const disabled = harness.replace(target, "    apportion_exact(u) {},\n    overflow_refused")
        .replace('const root = path.resolve(__dirname, "../..");', `const root = ${JSON.stringify(root)};`);
    assert.notEqual(disabled, harness);
    fs.writeFileSync(scratch, disabled);
    const negative = run("sweep-survivor-negative-control", "node", [scratch, "--mutation-sweep"], root, 1);
    assert(negative.includes("SURVIVED/INVALID apportion_drops_remainder"));
    assert(negative.includes("MUTATION RESULT: 3/4 killed; 1 survived/invalid"));

    // Additional scratch controls show the two other numeric checks turning
    // red on behavior rather than merely inheriting the missing-module error.
    for (const [name, before, after, check] of [
        ["gallons", "const CP_PER_GALLON = 834;", "const CP_PER_GALLON = 835;", "gallons_are_derived"],
        ["bound", "cellsX: 768, cellsY: 768, zLevels: 32", "cellsX: 769, cellsY: 768, zLevels: 32", "world_bound_safe"]
    ]) {
        const cwd = clone("negative-" + name, sha);
        const file = path.join(cwd, "game/js/sim/units.js");
        const source = fs.readFileSync(file, "utf8");
        assert.equal(source.split(before).length, 2);
        fs.writeFileSync(file, source.replace(before, after));
        const log = run("negative-" + name, "node", ["tools/sim/test_units.js"], cwd, 1);
        assert(log.includes("FAIL " + check));
    }
    run("syntax-units", "node", ["--check", "game/js/sim/units.js"], root);
    run("syntax-test-units", "node", ["--check", "tools/sim/test_units.js"], root);
    console.log("Writer validation finished; independent Grok review remains pending.");
} finally {
    // Only remove this invocation's own scratch directory, after validating
    // the absolute path is a direct child of the allowed lane directory.
    const resolved = path.resolve(created);
    assert.equal(path.dirname(resolved), path.resolve(lane));
    assert(path.basename(resolved).startsWith("verification-"));
    fs.rmSync(resolved, { recursive: true, force: true });
}
