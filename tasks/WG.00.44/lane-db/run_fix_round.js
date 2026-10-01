"use strict";
// Reproducible, foreground writer evidence for MSG-PRUNE-PM-107. No push or merge.
// node tasks/WG.00.44/lane-db/run_fix_round.js <committed-code-sha>
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHA = process.argv[2];
if (!SHA || !/^[a-f0-9]{7,40}$/.test(SHA)) throw new Error("Pass the committed code SHA");
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), "wg0044-fix-gates-"));
const EVIDENCE = path.join(__dirname, "evidence");
const chunks = [];
let problems = 0;
function log(text) { chunks.push(text); }
function run(cmd, args, cwd, env) {
    log("$ " + cmd + " " + args.join(" "));
    const result = spawnSync(cmd, args, { cwd, encoding: "utf8", windowsHide: true,
        timeout: 900000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...env } });
    log((result.stdout || "") + (result.stderr || ""));
    log("EXIT " + result.status + (result.error ? " ERROR " + result.error.message : ""));
    if (result.error) throw result.error;
    return result;
}
function clone(name, revision) {
    const cwd = path.join(WORK, name);
    const made = run("git", ["-c", "core.autocrlf=false", "-c", "core.eol=lf", "clone",
        "--shared", "--no-checkout", ROOT, cwd], ROOT);
    if (made.status !== 0) throw new Error("clone failed");
    for (const args of [["config", "core.autocrlf", "false"], ["config", "core.eol", "lf"],
        ["checkout", "--detach", revision]]) {
        if (run("git", args, cwd).status !== 0) throw new Error("clone setup failed");
    }
    run("git", ["rev-parse", "HEAD"], cwd);
    const status = run("git", ["status", "--porcelain"], cwd);
    if (status.status !== 0 || status.stdout.trim()) throw new Error("fresh clone is not clean");
    return cwd;
}
try {
    log("UTC " + new Date().toISOString() + "; Node " + process.version + "; source " + ROOT);
    log("Fresh shared clones; detached HEAD; core.autocrlf=false; core.eol=lf; each gate timeout 900s.");
    log("Gate environment: WG0044_KEEP_NW_SNAPSHOT=1; remaining environment inherited.");
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "lane.json"), "utf8"));
    let candidate;
    for (let i = 0; i < manifest.gateTests.length; i++) {
        const gate = manifest.gateTests[i];
        candidate = clone("gate-" + (i + 1), SHA);
        console.log("FOREGROUND " + gate.cmd + " " + gate.args.join(" "));
        // Keep the one NW.js snapshot so the writer can open every screenshot after the exact gate command.
        const result = run(gate.cmd, gate.args, candidate, { WG0044_KEEP_NW_SNAPSHOT: "1" });
        if (result.status !== 0) problems++;
        console.log("EXIT " + result.status);
    }
    const checks = ["vm_loader_loads_ledger", "missing_module_throws", "every_vm_harness_installs_hook",
        "scan_finds_known_harnesses", "opener_registry", "grid_pinned_by_hook"].join(",");
    const mutants = {
        return_null_on_missing: "missing_module_throws",
        fixed_list_scan: "every_vm_harness_installs_hook",
        unpinned_grid: "grid_pinned_by_hook",
        hook_wrong_sandbox: "every_vm_harness_installs_hook",
        hook_unreachable: "every_vm_harness_installs_hook",
        hook_after_eval: "every_vm_harness_installs_hook"
    };
    for (const [mutant, check] of Object.entries(mutants)) {
        console.log("FOREGROUND mutant " + mutant);
        const result = run("node", ["tools/test_sim_loader.js", "--mutant=" + mutant, "--only=" + checks], candidate);
        const red = (result.stdout || "").split(/\r?\n/).filter(line => line.startsWith("FAIL "));
        const caught = result.status === 1 && red.length === 1 && red[0].startsWith("FAIL " + check + " -");
        log("EXPECTED_NAMED_FAILURE " + mutant + " " + caught);
        if (!caught) problems++;
        console.log("EXPECTED_NAMED_FAILURE " + mutant + " " + caught);
    }
    console.log("FOREGROUND mutant checksum_all_levels");
    const checksum = run("node", ["tools/test_32_levels_generation.js", "--mutant=checksum_all_levels"], candidate);
    const checksumCaught = checksum.status === 1 && /^FAIL core_entries_only\b/m.test(checksum.stdout || "");
    log("EXPECTED_NAMED_FAILURE checksum_all_levels " + checksumCaught);
    if (!checksumCaught) problems++;
    console.log("EXPECTED_NAMED_FAILURE checksum_all_levels " + checksumCaught);
    const baseline = clone("base", "7f91efbb");
    const scanner = require(path.join(candidate, "tools/lib/vm_harness_scan.js"));
    const baseScan = scanner.scan({ root: baseline });
    log("Corrected scanner at base 7f91efbb: " + JSON.stringify(baseScan, null, 2));
    const baseFailures = baseScan.hits.filter(hit => hit.hookFailures.length > 0);
    log("BASE_HOOK_COUNT hits=" + baseScan.hits.length + " without_prior_hook=" + baseFailures.length);
    if (!baseScan.hits.length || baseFailures.length !== baseScan.hits.length) problems++;
    const tipScan = scanner.scan({ root: candidate });
    log("Corrected scanner at code tip: " + JSON.stringify(tipScan, null, 2));
    const whitespace = run("git", ["diff", "7f91efbb..HEAD", "--check"], candidate);
    if (whitespace.status !== 0) problems++;
    log("RESULT: " + problems + " unexpected failures");
} finally {
    const file = path.join(EVIDENCE, "fix_round_" + SHA.slice(0, 8) + ".txt");
    fs.writeFileSync(file, chunks.join("\n").replace(/[ \t]+$/gm, "") + "\n");
    console.log("EVIDENCE " + file);
    console.log("CLONES " + WORK);
}
process.exitCode = problems ? 1 : 0;
