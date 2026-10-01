"use strict";
// Foreground evidence for MSG-PRUNE-PM-116 / Owner: "Ship reviewed scanner".
// node tasks/WG.00.44/lane-db/run_reviewed_scanner_gates.js <candidate-sha>
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..", "..", "..");
const sha = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(sha || "")) throw new Error("Pass full candidate SHA");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "wg0044-reviewed-gates-"));
const evidence = path.join(__dirname, "evidence", "reviewed_scanner_restore");
fs.mkdirSync(evidence, { recursive: true });
const logFile = path.join(evidence, "gates.txt");
fs.writeFileSync(logFile, "");
const summary = { sha, started: new Date().toISOString(), node: process.version, work, gates: [] };
function log(text) {
    fs.appendFileSync(logFile, String(text).replace(/[ \t]+$/gm, "") + "\n");
}
function run(cmd, args, cwd, env = {}, timeout = 900000) {
    log("CWD " + cwd + "\n$ " + cmd + " " + args.join(" "));
    const start = Date.now();
    const result = spawnSync(cmd, args, { cwd, encoding: "utf8", windowsHide: true,
        timeout, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...env } });
    const seconds = (Date.now() - start) / 1000;
    log((result.stdout || "") + (result.stderr || ""));
    log("EXIT " + result.status + "; seconds=" + seconds + (result.error ? "; ERROR " + result.error.message : ""));
    if (result.error) throw result.error;
    return { ...result, seconds };
}
function git(args, cwd = ROOT) {
    const result = run("git", args, cwd);
    if (result.status !== 0) throw new Error("git failed: " + args.join(" "));
    return result.stdout.trim();
}
function clone(name, revision) {
    const cwd = path.join(work, name);
    git(["-c", "core.autocrlf=false", "-c", "core.eol=lf", "clone", "--shared", "--no-checkout", ROOT, cwd]);
    for (const [key, value] of [["core.autocrlf", "false"], ["core.eol", "lf"], ["core.safecrlf", "false"]]) {
        git(["config", key, value], cwd);
    }
    git(["checkout", "--detach", revision], cwd);
    if (git(["rev-parse", "HEAD"], cwd) !== revision) throw new Error("Wrong clone HEAD");
    if (git(["status", "--porcelain"], cwd)) throw new Error("Clone is not clean");
    return cwd;
}
let problems = 0;
try {
    log(JSON.stringify(summary));
    log("One fresh shared clone per manifest gate; detached HEAD; core.autocrlf=false, core.eol=lf, core.safecrlf=false.");
    log("Foreground spawnSync; each gate timeout=900s. No gate argument changes.");
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "lane.json"), "utf8"));
    let candidate;
    for (const [i, gate] of manifest.gateTests.entries()) {
        if (gate.timeoutSec !== 900) throw new Error("Unexpected manifest timeout");
        candidate = clone("gate-" + (i + 1), sha);
        const env = {};
        if (gate.args[0] === "tools/test_sim_loader.js") {
            env.NODE_OPTIONS = [process.env.NODE_OPTIONS || "", "--require", JSON.stringify(path.join(candidate,
                "tasks/WG.00.44/lane-db/capture_gate_snapshot.js"))].join(" ").trim();
            env.WG0044_CAPTURE_DIR = path.join(evidence, "nwjs");
            log("Evidence-only environment " + JSON.stringify(env));
        }
        console.log("FOREGROUND " + gate.cmd + " " + gate.args.join(" "));
        const result = run(gate.cmd, gate.args, candidate, env, gate.timeoutSec * 1000);
        summary.gates.push({ command: [gate.cmd, ...gate.args].join(" "), cwd: candidate,
            exit: result.status, seconds: result.seconds });
        console.log("EXIT " + result.status + "; seconds=" + result.seconds);
        if (result.status !== 0) problems++;
    }
    const scan = require(path.join(candidate, "tools/lib/vm_harness_scan.js"));
    const tipScan = scan.scan({ root: candidate });
    fs.writeFileSync(path.join(evidence, "scan_tip.json"), JSON.stringify(tipScan, null, 2) + "\n");
    log("TIP_SCAN hits=" + tipScan.hits.length + "; scanned=" + tipScan.scanned);
    const baseline = clone("base", git(["rev-parse", "7f91efbb"]));
    const baseScan = scan.scan({ root: baseline });
    fs.writeFileSync(path.join(evidence, "scan_base.json"), JSON.stringify(baseScan, null, 2) + "\n");
    log("BASE_SCAN raw_base=true; hits=" + baseScan.hits.length + "; scanned=" + baseScan.scanned);
    const only = "vm_loader_loads_ledger,missing_module_throws,every_vm_harness_installs_hook,scan_finds_known_harnesses,opener_registry,grid_pinned_by_hook";
    for (const [mutant, target] of Object.entries({ return_null_on_missing: "missing_module_throws",
        fixed_list_scan: "every_vm_harness_installs_hook", unpinned_grid: "grid_pinned_by_hook" })) {
        console.log("FOREGROUND mutant " + mutant);
        const result = run("node", ["tools/test_sim_loader.js", "--mutant=" + mutant, "--only=" + only], candidate);
        const failures = result.stdout.split(/\r?\n/).filter(line => line.startsWith("FAIL "));
        const caught = result.status === 1 && failures.length === 1 && failures[0].startsWith("FAIL " + target + " -");
        log("EXPECTED_NAMED_FAILURE " + mutant + " " + caught);
        console.log("EXPECTED_NAMED_FAILURE " + mutant + " " + caught);
        if (!caught) problems++;
    }
    // Reproduce the historical 49-hit fail-before survey: only the three loader
    // test/support files are overlaid; the base runtime and harnesses stay intact.
    git(["checkout", sha, "--", "tools/test_sim_loader.js", "tools/lib/vm_harness_scan.js", "tools/lib/vm_sim_require.js"], baseline);
    const overlaid = scan.scan({ root: baseline });
    fs.writeFileSync(path.join(evidence, "scan_base_with_test.json"), JSON.stringify(overlaid, null, 2) + "\n");
    log("BASE_SCAN test_overlay=true; hits=" + overlaid.hits.length + "; scanned=" + overlaid.scanned);
    const before = run("node", ["tools/test_sim_loader.js", "--only=" + only], baseline);
    const beforeNames = before.stdout.split(/\r?\n/).filter(line => line.startsWith("FAIL ")).map(line => line.split(" ")[1]).sort();
    const expected = ["vm_loader_loads_ledger", "missing_module_throws", "every_vm_harness_installs_hook", "opener_registry"].sort();
    const caught = before.status === 1 && JSON.stringify(beforeNames) === JSON.stringify(expected);
    log("EXPECTED_HEADLESS_BASE_FAILURES " + caught);
    if (!caught) problems++;
    log("RESULT: " + problems + " unexpected failures");
} finally {
    summary.finished = new Date().toISOString();
    summary.unexpectedFailures = problems;
    fs.writeFileSync(path.join(evidence, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
    console.log("EVIDENCE " + logFile);
    console.log("CLONES " + work);
}
process.exitCode = problems ? 1 : 0;
