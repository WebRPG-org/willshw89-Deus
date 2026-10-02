#!/usr/bin/env node
"use strict";

/**
 * tools/governance/merge_gate.js
 *
 * WG.00.12 Lane I: strict merge gate for lane branches. It reads everything it judges from git
 * objects at one checked commit (the local branch tip), never from a working tree, and refuses
 * the merge unless every condition below holds. Each refusal prints "REFUSED <CODE>: <detail>".
 *
 *   (a) MANIFEST  tasks/<id>/<lane>/lane.json exists at the tip and every commit that ever changed
 *                 it (git log <tip> -- <manifest>) is a non-merge "[gemini]" (coordinator) or "[pm]"
 *                 commit. The PM opens lanes since Owner directive 0028-AC A0 (2026-09-26 ~01:50 CT).
 *                 [pm] is trusted for manifest provenance only: it is no agent family, so a [pm]
 *                 commit is never a review and "pm" is never a valid writer or reviewer. Any other
 *                 change stops the gate at once: scope, review and tests are not evaluated and the
 *                 manifest's gateTests are never run.
 *   (a) SCOPE     every path in git diff <merge-base main> <tip> matches a manifest allowedPaths glob.
 *   (b) REVIEW    the tip is a review commit (or is followed only by PM manifest/brief re-cut commits):
 *                 one parent, subject tag of another family than the
 *                 writer (claude and fable are one family), the designated reviewer when the
 *                 manifest names one, and it touches only tasks/<id>/<lane>/review_<tag>_<sha8>.md.
 *                 That file holds the full 40-character hash of the last non-review commit on the
 *                 branch and a "VERDICT: PASS", "VERDICT: CLEAN PASS", or "VERDICT: PASS WITH MINORS"
 *                 line (and no rejecting verdict).
 *                 Every review commit's author name matches its tag family, with no grandfathering.
 *   (b2) AUTHOR   agent-tagged commits match their family author; [ops] commits are authored deus-ops
 *                 and confined to the lane task directory. Manifest author names are checked in (a).
 *                 Open-lane exceptions are read from origin/main's author_rules.json by ancestry.
 *   (c) TESTS     after manifest, authorship and review pass, a temporary no-fast-forward merge of
 *                 origin/main and the lane tip (throwaway identity) is built. Each gateTests entry then
 *                 runs with no shell in its own fresh clone of that merge, up to --jobs at a time
 *                 (default 3). An entry with "serial": true runs alone afterwards. "retryOnce": true
 *                 runs a failure once more, alone. A conflict refuses MERGE_CONFLICT before any test.
 *                 The clone is forced to core.autocrlf=false, core.eol=lf and core.safecrlf=false
 *                 before checkout, so the work-tree bytes equal the committed blobs whatever the
 *                 caller's global or system line-ending config is. An entry on the quarantine list of
 *                 tools/ops/gate_tests.json (main's copy or the tip's) refuses the gate.
 *   (b3) HOTFIX   "hotfix": true accepts a lane with no review when every allowedPath and every
 *                 commit path stays under tools/**, docs/**, tasks/** or game/data/sim/**. Otherwise
 *                 HOTFIX_SCOPE. A hotfix that has a review is judged as a normal lane.
 *   (d) PUSHED    after git fetch origin: rev-parse <branch> == rev-parse origin/<branch> ==
 *                 git ls-remote origin refs/heads/<branch>.
 *   (e) MAIN      main is checked out in a worktree with no uncommitted tracked changes and no
 *                 merge in progress, and rev-parse main == rev-parse origin/main == ls-remote main.
 *   (f) EXECUTION when all hold and --dry-run is absent: re-fetch, reconcile unrelated main moves,
 *                 then git merge --no-ff <checked sha> in main's worktree. The gate never pushes.
 *   (g) SUMMARY   a table of the raw hashes, the diff, the review, every test (command, exit code,
 *                 duration) and the checks, ending "GATE: PASS (exit 0)" or "GATE: REFUSED (exit n)".
 *
 * Usage:
 *   node tools/governance/merge_gate.js --lane <lane> --manifest tasks/<id>/<lane>/lane.json [--dry-run]
 *   options: --branch <name>   branch to merge (default task/<lane>; must equal the manifest's)
 *            --jobs <n>        how many gate tests run at once (default 3; serial entries run after)
 *            --keep-temp       keep the temporary clones and test logs
 *            --mutant=<name>   self-test only: switch one check off. Needs DEUS_MERGE_GATE_SELFTEST=1
 *                              and always runs as --dry-run.
 * Exit: 0 GATE: PASS, 1 GATE: REFUSED, 2 usage or environment error (also GATE: REFUSED).
 * Reason codes and diagnostics: tools/governance/MERGE_GATE.md.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const MAIN = "main";
const REMOTE = "origin";
const DEFAULT_TIMEOUT_SEC = 600;
const DEFAULT_JOBS = 3;
const HOTFIX_ROOTS = ["tools", "docs", "tasks", "game/data/sim"];
const TEST_MERGE_IDENTITY = {
    GIT_AUTHOR_NAME: "deus-merge-gate",
    GIT_AUTHOR_EMAIL: "deus-merge-gate@local.invalid",
    GIT_COMMITTER_NAME: "deus-merge-gate",
    GIT_COMMITTER_EMAIL: "deus-merge-gate@local.invalid"
};
const QUARANTINE_FILE = "tools/ops/gate_tests.json";
const AUTHOR_RULES_FILE = "tools/governance/author_rules.json";
const SELFTEST_ENV = "DEUS_MERGE_GATE_SELFTEST";
const LOG_TAIL_LINES = 20;

// Claude and Fable run on the same CLI, as do Gemini and Antigravity (docs/CANONICAL_ROLES.md §2).
const FAMILIES = { claude: "claude", fable: "claude", grok: "grok", codex: "codex", gemini: "gemini", antigravity: "gemini" };
// The PM's subject tag. Trusted to write lane.json (check (a)); not an agent family, so never a review.
const PM_TAG = "pm";

// Each mutant switches one check off (the two *_untrusted ones make a rule stricter instead). test_merge_gate.js
// must show every one caught by a case.
const MUTANTS = {
    manifest_provenance_off: "accept lane.json edits by any commit",
    manifest_trust_any_tag: "accept lane.json edits by a single-parent commit with any tag or none",
    manifest_trust_pm_merge: "accept lane.json edits by a [pm] merge commit",
    manifest_gemini_untrusted: "refuse lane.json edits by [gemini] commits",
    manifest_pm_untrusted: "refuse lane.json edits by [pm] commits",
    pm_review_family: "count [pm] as an agent family, so a [pm] commit can be the review",
    review_author_off: "ignore the review commit author",
    writer_author_off: "ignore agent-tagged writer commit authors",
    manifest_author_off: "ignore manifest commit authors",
    ops_scope_off: "ignore [ops] author and path restrictions",
    grandfather_by_date: "exempt commits by author date instead of ancestry",
    scope_off: "accept paths outside allowedPaths",
    review_required_off: "accept a branch with no review commit",
    review_order_off: "use the latest review commit even when other commits follow it",
    pm_above_review_any_path: "allow PM commits above a review to change code paths",
    review_family_off: "accept a review from the writer's family",
    fable_alias_off: "count fable as a family of its own",
    reviewer_designation_off: "accept a reviewer other than the manifest's",
    review_files_off: "accept a review commit that touches other files",
    review_name_off: "accept any review file name",
    review_hash_off: "skip the reviewed-hash comparison",
    verdict_off: "skip the verdict check",
    test_exit_off: "count a non-zero test exit as a pass",
    test_timeout_off: "run tests without a timeout",
    quarantine_off: "ignore the quarantine list",
    fresh_clone_off: "run tests in the current work tree instead of a clone at the tip",
    clone_autocrlf_off: "check out test clones without forcing core.autocrlf=false, core.eol=lf and core.safecrlf=false",
    push_off: "skip the local-vs-remote branch comparison",
    tracking_off: "skip the origin/<branch> tracking-ref comparison",
    main_clean_off: "skip the main work tree cleanliness check",
    main_sync_off: "skip the main == origin/main check",
    keep_failed_temp_off: "do not keep temp clones on test failure",
    fail_lines_off: "do not show up to 20 FAIL lines on test failure",
    tests_at_tip: "run gate tests on the lane tip instead of the merge of origin/main and the tip",
    sequential_only: "run gate tests one at a time",
    retry_without_flag: "retry a failed gate test once even when retryOnce is not set",
    retry_twice: "retry a failed retryOnce gate test a second time",
    hotfix_any_path: "accept a hotfix lane whose paths leave the hotfix roots"
};

const CHECKS = [
    ["REFS", "refs"],
    ["MANIFEST", "(a) manifest"],
    ["SCOPE", "(a) scope"],
    ["REVIEW", "(b) review"],
    ["AUTHOR", "(b2) authors"],
    ["TESTS", "(c) tests"],
    ["PUSHED", "(d) pushed"],
    ["MAIN", "(e) main"]
];

const active = new Set();
function mut(name) { return active.has(name); }

class UsageError extends Error {
    constructor(code, message) { super(message); this.code = code; }
}

// ---------------------------------------------------------------- git

const GIT_ENV = (() => {
    const env = Object.assign({}, process.env);
    for (const k of Object.keys(env)) {
        if (/^GIT_(DIR|WORK_TREE|INDEX_FILE|PREFIX|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|NAMESPACE|QUARANTINE_PATH)$/i.test(k)) delete env[k];
    }
    env.GIT_TERMINAL_PROMPT = "0";
    env.GCM_INTERACTIVE = "never";
    env.GIT_OPTIONAL_LOCKS = "0";
    return env;
})();

let CWD = process.cwd();

function git(args, opts = {}) {
    const env = opts.env ? Object.assign({}, GIT_ENV, opts.env) : GIT_ENV;
    const r = spawnSync("git", ["--literal-pathspecs", ...args], {
        cwd: opts.cwd || CWD, encoding: "utf8", env, maxBuffer: 256 * 1024 * 1024, windowsHide: true
    });
    if (r.error) throw new UsageError("GIT_ERROR", `cannot run git: ${r.error.message}`);
    if (opts.allowFail) return { ok: r.status === 0, status: r.status, out: r.stdout || "", err: (r.stderr || "").trim() };
    if (r.status !== 0) throw new UsageError("GIT_ERROR", `git ${args.join(" ")} failed: ${(r.stderr || "").trim()}`);
    return r.stdout;
}

function revParse(ref, cwd) {
    const r = git(["rev-parse", "-q", "--verify", `${ref}^{commit}`], { allowFail: true, cwd });
    return r.ok ? r.out.trim() : null;
}

function isAncestor(a, b) {
    return git(["merge-base", "--is-ancestor", a, b], { allowFail: true }).status === 0;
}

// One ls-remote call; ls-remote patterns match ref-name tails, so keep exact names only.
function lsRemote(refs) {
    const r = git(["ls-remote", REMOTE, ...refs], { allowFail: true });
    const found = new Map();
    if (r.ok) {
        for (const line of r.out.split("\n")) {
            const [sha, name] = line.trim().split("\t");
            if (refs.includes(name)) found.set(name, sha);
        }
    }
    return refs.map(ref => ({ sha: found.get(ref) || null, error: r.ok ? null : r.err || `exit ${r.status}` }));
}

function readBlob(rev, p) {
    const r = git(["cat-file", "blob", `${rev}:${p}`], { allowFail: true });
    return r.ok ? r.out.replace(/^﻿/, "") : null;
}

function parseNameStatus(out) {
    const t = out.split("\0").filter(s => s.length), changes = [];
    for (let i = 0; i + 1 < t.length; i += 2) changes.push({ status: t[i][0], path: t[i + 1] });
    return changes;
}

function commitInfo(sha) {
    const [h, p, s, author] = git(["show", "-s", "--format=%H%x00%P%x00%s%x00%an", sha]).replace(/\n$/, "").split("\0");
    const parents = p ? p.split(" ") : [];
    const files = parents.length ? parseNameStatus(git(["diff", "--name-status", "-z", "--no-renames", parents[0], h])) : [];
    return { sha: h, parents, subject: s, tag: subjectTag(s), author, files };
}

// ---------------------------------------------------------------- helpers

function subjectTag(subject) {
    const m = /^\[([^\]\s]+)\]/.exec(String(subject || ""));
    return m ? m[1].toLowerCase() : null;
}

function family(agent) {
    if (!agent) return null;
    const a = String(agent).trim().toLowerCase();
    if (a === "fable" && mut("fable_alias_off")) return "fable";
    if (a === PM_TAG && mut("pm_review_family")) return PM_TAG;
    return FAMILIES[a] || null;
}

// A commit may change lane.json when it has one parent and a [gemini]-family or [pm] subject tag.
function trustedManifestCommit(h) {
    if (h.parents.length > 1 && !(mut("manifest_trust_pm_merge") && h.tag === PM_TAG)) return false;
    if (mut("manifest_trust_any_tag")) return true;
    if (family(h.tag) === "gemini") return !mut("manifest_gemini_untrusted");
    if (h.tag === PM_TAG) return !mut("manifest_pm_untrusted");
    return false;
}

// "*" and "?" stay inside one path segment; "**" crosses segments; a trailing "/" means "dir/**".
function globToRegExp(glob) {
    if (typeof glob !== "string" || !glob || glob.startsWith("/") || /^[A-Za-z]:/.test(glob) || glob.includes("\\") ||
        glob.split("/").some(s => s === ".." || s === ".")) return null;
    const g = glob.endsWith("/") ? glob + "**" : glob;
    let re = "^";
    for (let i = 0; i < g.length; i++) {
        const c = g[i];
        if (c === "*" && g[i + 1] === "*") {
            i++;
            if (g[i + 1] === "/") { i++; re += "(?:.*/)?"; } else re += ".*";
        } else if (c === "*") re += "[^/]*";
        else if (c === "?") re += "[^/]";
        else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
    return new RegExp(re + "$");
}

const VERDICT_LINE_RE = /^[\s>#*_`|-]*verdict[\s*_`]*[:=]/i;
const VERDICT_PASS_RE = /^[\s>#*_`|-]*VERDICT[*_`]*:[\s*_`]*(CLEAN PASS|PASS WITH MINORS|PASS)[\s*_`.|]*$/;

// Every verdict line must pass; one other verdict anywhere refuses.
function parseVerdict(text) {
    const lines = String(text || "").split(/\r?\n/).filter(l => VERDICT_LINE_RE.test(l)).map(l => l.trim());
    const bad = lines.filter(l => !VERDICT_PASS_RE.test(l));
    return { lines, bad, pass: lines.length > 0 && bad.length === 0 };
}

function fullHashes(text) {
    return [...new Set((String(text || "").match(/\b[0-9a-fA-F]{40}\b/g) || []).map(h => h.toLowerCase()))];
}

function normPath(p) {
    return String(p).replace(/\\/g, "/").replace(/^(?:\.\/)+/, "").toLowerCase();
}

function quoteArg(a) {
    return /^[\w@%+=:,./\\-]+$/.test(a) ? a : JSON.stringify(a);
}

function sec(ms) {
    return ms == null ? "-" : `${(ms / 1000).toFixed(2)} s`;
}

function short(sha) {
    return sha ? sha.slice(0, 8) : "(none)";
}

// ---------------------------------------------------------------- report

class Report {
    constructor() {
        this.refs = [];
        this.refusals = [];
        this.skipped = new Map();
        this.notes = [];
        this.manifest = null;
        this.diff = null;
        this.review = null;
        this.tests = [];
        this.execution = "NOT RUN";
    }
    refuse(check, code, detail) { this.refusals.push({ check, code, detail }); }
    skip(check, why) { if (!this.skipped.has(check)) this.skipped.set(check, why); }
    refused() { return this.refusals.length > 0; }
    state(check) {
        const codes = [...new Set(this.refusals.filter(r => r.check === check).map(r => r.code))];
        if (codes.length) return { result: "REFUSED", codes };
        if (this.skipped.has(check)) return { result: `SKIPPED (${this.skipped.get(check)})`, codes };
        return { result: "PASS", codes };
    }
}

function table(headers, rows) {
    const cell = v => String(v == null ? "" : v).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
    return [`| ${headers.join(" | ")} |`, `|${headers.map(() => "---").join("|")}|`, ...rows.map(r => `| ${r.map(cell).join(" | ")} |`)];
}

function printReport(R, ctx, exitCode) {
    const out = [];
    out.push("");
    out.push("# DEUS merge gate summary (tools/governance/merge_gate.js)");
    out.push(...table(["Item", "Value"], [
        ["lane", ctx.lane || "-"], ["branch", ctx.branch || "-"], ["manifest", ctx.manifestPath || "-"],
        ["mode", ctx.mode || "-"], ["repository", ctx.top || "-"],
        ...(active.size ? [["mutants", `${[...active].join(", ")} (self-test only; merge disabled)`]] : [])
    ]));
    if (R.refs.length) {
        out.push("", "## Refs (raw values after git fetch origin)");
        out.push(...table(["Ref", "Command", "Hash"], R.refs.map(r => [r.label, r.cmd, r.value || "(missing)"])));
    }
    if (R.manifest) {
        out.push("", "## Manifest");
        out.push(...table(["Item", "Value"], [
            ["path", R.manifest.path], ["blob at tip", R.manifest.blob || "(missing)"],
            ...R.manifest.history.map((h, i) => [i === 0 ? "changed by" : "", `${h.sha} ${h.parents.length > 1 ? "(merge) " : ""}${h.subject}`]),
            ["writer / reviewer", R.manifest.parsed ? `${R.manifest.parsed.writer} / ${R.manifest.parsed.reviewer || "(any other family)"}` : "-"]
        ]));
    }
    if (R.diff) {
        out.push("", `## Diff (git diff --name-status ${short(R.diff.base)} ${short(R.diff.tip)}): ${R.diff.files.length} file(s)`);
        out.push(...table(["#", "Status", "Path", "In allowedPaths"], R.diff.files.map((f, i) => [i + 1, f.status, f.path, f.allowed ? "yes" : "NO"])));
    }
    if (R.review) {
        const v = R.review;
        out.push("", "## Review");
        out.push(...table(["Item", "Value"], [
            ["review commit", v.commit ? `${v.commit.sha} ${v.commit.subject}` : "(none)"],
            ["reviewer file", v.file || "(none)"],
            ["expected file", v.expectedFile || "-"],
            ["last non-review commit", v.target ? `${v.target.sha} ${v.target.subject}` : "(none)"],
            ["full hashes in file", v.hashes && v.hashes.length ? v.hashes.join(", ") : "(none)"],
            ["verdict", v.verdict && v.verdict.lines.length ? v.verdict.lines.join(" / ") : "(none)"],
            ...(v.pmAbove ? [["PM re-cut", "PM manifest/brief commits above the review; code identical"]] : [])
        ]));
    }
    if (R.tests.length) {
        const where = ctx.testedOnMerge ? "of the merge result" : "at the checked sha";
        out.push("", `## Tests (no shell; each in a fresh clone ${where})`);
        if (ctx.testedOnMerge && ctx.testTree) out.push(`tests ran on the merge result ${ctx.testTree.slice(0, 8)}`);
        out.push(...table(["#", "Command", "Timeout", "Exit", "Duration", "Result"],
            R.tests.map(t => [t.n, t.display, `${t.timeoutSec} s${t.defaultTimeout ? " (default)" : ""}`,
                t.exit == null ? "-" : t.exit, sec(t.durationMs), t.result])));
        if (R.testWallMs != null) out.push(`total wall time ${sec(R.testWallMs)}`);
        for (const t of R.tests.filter(x => x.tail)) {
            out.push("", `### Test ${t.n} output, last ${LOG_TAIL_LINES} lines`, "```", t.tail, "```");
            if (t.failLines) out.push("", `### Test ${t.n} FAIL lines (up to 20)`, "```", t.failLines, "```");
        }
    }
    out.push("", "## Checks");
    out.push(...table(["Check", "Result", "Reason codes"], [
        ...CHECKS.map(([key, label]) => { const s = R.state(key); return [label, s.result, s.codes.join(", ") || "-"]; }),
        ["(f) execution", R.execution, R.state("EXEC").codes.join(", ") || "-"]
    ]));
    for (const n of R.notes) out.push(`NOTE ${n}`);
    out.push("");
    for (const r of R.refusals) out.push(`REFUSED ${r.code}: ${r.detail}`);
    out.push(`GATE: ${exitCode === 0 ? "PASS" : "REFUSED"} (exit ${exitCode})`);
    process.stdout.write(out.join("\n") + "\n");
}

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
    const o = { lane: null, manifest: null, branch: null, dryRun: false, keepTemp: false, mutants: [], help: false, jobs: DEFAULT_JOBS };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const [flag, inline] = a.startsWith("--") && a.includes("=") ? [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)] : [a, null];
        const value = () => {
            if (inline !== null) return inline;
            if (i + 1 >= argv.length) throw new UsageError("USAGE", `${flag} needs a value`);
            return argv[++i];
        };
        if (flag === "--lane") o.lane = value();
        else if (flag === "--manifest") o.manifest = value();
        else if (flag === "--branch") o.branch = value();
        else if (flag === "--jobs") {
            const n = Number(value());
            if (!Number.isInteger(n) || n < 1) throw new UsageError("USAGE", "--jobs needs a positive integer");
            o.jobs = n;
        }
        else if (flag === "--mutant") o.mutants.push(value());
        else if (flag === "--dry-run" && inline === null) o.dryRun = true;
        else if (flag === "--keep-temp" && inline === null) o.keepTemp = true;
        else if ((flag === "--help" || flag === "-h") && inline === null) o.help = true;
        else throw new UsageError("USAGE", `unknown argument ${a}`);
    }
    if (o.help) return o;
    if (!o.lane || !/^[A-Za-z0-9._-]+$/.test(o.lane)) throw new UsageError("USAGE", "--lane <lane> is required (letters, digits, . _ -)");
    if (!o.manifest) throw new UsageError("USAGE", "--manifest tasks/<id>/<lane>/lane.json is required");
    o.branch = o.branch || `task/${o.lane}`;
    if (!/^[A-Za-z0-9._/-]+$/.test(o.branch) || o.branch === MAIN) throw new UsageError("USAGE", `--branch ${o.branch} is not a lane branch name`);
    for (const m of o.mutants) if (!MUTANTS[m]) throw new UsageError("USAGE", `unknown mutant ${m}; known: ${Object.keys(MUTANTS).join(", ")}`);
    if (o.mutants.length && process.env[SELFTEST_ENV] !== "1") {
        throw new UsageError("MUTANT_NOT_ALLOWED", `--mutant switches a check off; it runs only under the self-test (${SELFTEST_ENV}=1)`);
    }
    return o;
}

const USAGE = `Usage: node tools/governance/merge_gate.js --lane <lane> --manifest tasks/<id>/<lane>/lane.json [--dry-run]
       [--branch <name>] [--jobs <n>] [--keep-temp]
See tools/governance/MERGE_GATE.md for the checks and reason codes.`;

// ---------------------------------------------------------------- checks

function checkPushed(R, ctx) {
    const { tip, tracking, remote } = ctx.refs;
    if (remote.error) return R.refuse("REFS", "REMOTE_ERROR", `git ls-remote ${REMOTE} refs/heads/${ctx.branch} failed: ${remote.error}`);
    if (!remote.sha) {
        if (!mut("push_off")) R.refuse("PUSHED", "BRANCH_NOT_ON_REMOTE", `${REMOTE} has no refs/heads/${ctx.branch}; push the branch first`);
        return;
    }
    if (!mut("tracking_off") && tracking !== remote.sha) {
        R.refuse("PUSHED", "TRACKING_REF_STALE", `refs/remotes/${REMOTE}/${ctx.branch} is ${tracking || "(missing)"} but ls-remote reports ${remote.sha}; check remote.${REMOTE}.fetch`);
    }
    if (!tip || tip === remote.sha || mut("push_off")) return;
    const known = git(["cat-file", "-e", `${remote.sha}^{commit}`], { allowFail: true }).ok;
    if (known && isAncestor(remote.sha, tip)) {
        R.refuse("PUSHED", "BRANCH_UNPUSHED", `local ${ctx.branch} ${tip} is ahead of ${REMOTE} ${remote.sha}; push it`);
    } else if (known && isAncestor(tip, remote.sha)) {
        R.refuse("PUSHED", "BRANCH_BEHIND_REMOTE", `${REMOTE} ${ctx.branch} ${remote.sha} has commits the local ${tip} lacks`);
    } else {
        R.refuse("PUSHED", "BRANCH_DIVERGED", `local ${ctx.branch} ${tip} and ${REMOTE} ${remote.sha} have diverged${known ? "" : " (remote commit not present locally)"}`);
    }
}

function findMainWorktree() {
    const out = git(["worktree", "list", "--porcelain", "-z"]);
    const wts = [];
    let cur = null;
    for (const f of out.split("\0")) {
        if (f.startsWith("worktree ")) { cur = { path: f.slice(9) }; wts.push(cur); }
        else if (!cur || !f) continue;
        else if (f.startsWith("branch ")) cur.branch = f.slice(7);
        else if (f === "bare") cur.bare = true;
        else if (f.startsWith("prunable")) cur.prunable = true;
    }
    return wts.find(w => w.branch === `refs/heads/${MAIN}` && !w.bare) || null;
}

function mainDirt(wt) {
    const st = git(["status", "--porcelain=v1", "-z", "--untracked-files=no"], { cwd: wt.path, allowFail: true });
    if (!st.ok) return { error: st.err };
    const entries = st.out.split("\0").filter(Boolean).filter(e => /^.. /.test(e)).map(e => e.trim());
    const inProgress = ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD"].filter(h => revParse(h, wt.path));
    return { entries, inProgress };
}

function checkMain(R, ctx) {
    const { main, mainTracking, mainRemote } = ctx.refs;
    if (!main) { R.refuse("REFS", "MAIN_MISSING", `no local refs/heads/${MAIN}`); return null; }
    if (!mut("main_sync_off") && !mainRemote.error && (main !== mainTracking || main !== mainRemote.sha)) {
        R.refuse("MAIN", "MAIN_NOT_SYNCED", `${MAIN} ${main}, ${REMOTE}/${MAIN} ${mainTracking || "(missing)"}, ls-remote ${mainRemote.sha || "(missing)"} must be one commit`);
    }
    if (mainRemote.error) R.refuse("REFS", "REMOTE_ERROR", `git ls-remote ${REMOTE} refs/heads/${MAIN} failed: ${mainRemote.error}`);
    const wt = findMainWorktree();
    if (!wt || wt.prunable) {
        R.refuse("MAIN", "MAIN_NOT_CHECKED_OUT", `${MAIN} is not checked out in any worktree${wt ? ` (${wt.path} is missing)` : ""}; the gate merges in main's worktree`);
        return null;
    }
    ctx.mainWorktree = wt.path;
    R.refs.push({ label: "main worktree", cmd: "git worktree list --porcelain", value: wt.path });
    const d = mainDirt(wt);
    if (d.error) R.refuse("MAIN", "MAIN_NOT_CHECKED_OUT", `git status in ${wt.path} failed: ${d.error}`);
    else if (!mut("main_clean_off") && (d.entries.length || d.inProgress.length)) {
        const what = [...d.inProgress.map(h => `${h} present`), ...d.entries.slice(0, 10)];
        R.refuse("MAIN", "MAIN_DIRTY", `${wt.path} has uncommitted tracked changes or an operation in progress: ${what.join("; ")}${d.entries.length > 10 ? ` (+${d.entries.length - 10} more)` : ""}`);
    }
    return wt.path;
}

function validateManifest(m) {
    const errs = [];
    if (!m || typeof m !== "object" || Array.isArray(m)) return ["not a JSON object"];
    for (const k of ["lane", "taskId", "branch", "writer"]) if (typeof m[k] !== "string" || !m[k]) errs.push(`"${k}" must be a non-empty string`);
    if (m.writer && !family(m.writer)) errs.push(`writer "${m.writer}" is not a known agent (${Object.keys(FAMILIES).join(", ")})`);
    if (m.reviewer != null) {
        if (!family(m.reviewer)) errs.push(`reviewer "${m.reviewer}" is not a known agent`);
        else if (family(m.reviewer) === family(m.writer)) errs.push(`reviewer "${m.reviewer}" is in the writer's family`);
    }
    // Optional; tools/ops/launch_worker.ps1 reads it to decide whether the worker pushes its branch.
    if ("push" in m && typeof m.push !== "boolean") errs.push(`"push" must be true or false`);
    if (!Array.isArray(m.allowedPaths) || !m.allowedPaths.length) errs.push(`"allowedPaths" must be a non-empty array`);
    else for (const g of m.allowedPaths) if (!globToRegExp(g)) errs.push(`allowedPaths entry ${JSON.stringify(g)} is not a relative forward-slash glob`);
    if (!Array.isArray(m.gateTests)) errs.push(`"gateTests" must be an array`);
    else m.gateTests.forEach((t, i) => {
        if (!t || typeof t !== "object") return errs.push(`gateTests[${i}] is not an object`);
        if (typeof t.cmd !== "string" || !t.cmd.trim()) errs.push(`gateTests[${i}].cmd must be a non-empty string`);
        if (t.args != null && (!Array.isArray(t.args) || t.args.some(a => typeof a !== "string"))) errs.push(`gateTests[${i}].args must be an array of strings`);
        if (t.timeoutSec != null && !(typeof t.timeoutSec === "number" && isFinite(t.timeoutSec) && t.timeoutSec > 0)) errs.push(`gateTests[${i}].timeoutSec must be a positive number`);
        if ("serial" in t && typeof t.serial !== "boolean") errs.push(`gateTests[${i}].serial must be true or false`);
        if ("retryOnce" in t && typeof t.retryOnce !== "boolean") errs.push(`gateTests[${i}].retryOnce must be true or false`);
    });
    if ("hotfix" in m && typeof m.hotfix !== "boolean") errs.push(`"hotfix" must be true or false`);
    return errs;
}

function checkManifest(R, ctx) {
    const mp = ctx.manifestPath;
    const pm = /^tasks\/([^/]+)\/([^/]+)\/lane\.json$/.exec(mp);
    if (!pm || pm[2] !== ctx.lane) {
        R.refuse("MANIFEST", "MANIFEST_MISMATCH", `--manifest ${mp} is not tasks/<id>/${ctx.lane}/lane.json`);
        return null;
    }
    const text = readBlob(ctx.tip, mp);
    const history = git(["log", "--format=%H%x1f%P%x1f%s%x1f%an%x1e", ctx.tip, "--", mp]).split("\x1e")
        .map(s => s.replace(/^\s+/, "")).filter(Boolean)
        .map(s => { const [sha, p, subject, author] = s.split("\x1f"); return { sha, parents: p ? p.split(" ") : [], subject, author, tag: subjectTag(subject) }; });
    R.manifest = { path: mp, blob: text === null ? null : git(["rev-parse", `${ctx.tip}:${mp}`]).trim(), history, parsed: null };
    if (text === null || !history.length) {
        R.refuse("MANIFEST", "MANIFEST_MISSING", `${mp} is not in the tree of ${ctx.tip}`);
        return null;
    }
    if (!mut("manifest_provenance_off")) {
        const bad = history.filter(h => !trustedManifestCommit(h));
        for (const h of bad) {
            R.refuse("MANIFEST", "MANIFEST_TAMPERED", h.parents.length > 1
                ? `merge commit ${h.sha} "${h.subject}" changed ${mp} (differs from every parent); only single-parent [gemini] or [pm] commits may change it`
                : `${h.sha} "${h.subject}" changed ${mp}; only [gemini] or [pm] commits may change it`);
        }
        if (bad.length) return null;
    }
    if (!mut("manifest_author_off")) {
        for (const h of history) {
            if (isAncestor(h.sha, ctx.refs.mainTracking)) continue;
            if (isGrandfathered(ctx, h.sha)) continue;
            const allowed = h.tag === PM_TAG ? ["deus-pm"] : ["deus-ops", "deus-gemini"];
            if (!allowed.includes(h.author)) R.refuse("MANIFEST", "MANIFEST_AUTHOR", `${h.sha} [${h.tag}] changed ${mp}; author "${h.author}" must be ${allowed.join(" or ")}`);
        }
    }
    if (R.state("MANIFEST").codes.includes("MANIFEST_AUTHOR")) return null;
    let m;
    try { m = JSON.parse(text); } catch (e) {
        R.refuse("MANIFEST", "MANIFEST_INVALID", `${mp} at ${short(ctx.tip)} is not valid JSON: ${e.message}`);
        return null;
    }
    const errs = validateManifest(m);
    if (errs.length) { R.refuse("MANIFEST", "MANIFEST_INVALID", `${mp}: ${errs.join("; ")}`); return null; }
    const mism = [];
    if (m.lane !== ctx.lane) mism.push(`lane "${m.lane}" != --lane ${ctx.lane}`);
    if (m.taskId !== pm[1]) mism.push(`taskId "${m.taskId}" != path segment ${pm[1]}`);
    if (m.branch !== ctx.branch) mism.push(`branch "${m.branch}" != ${ctx.branch}`);
    if (mism.length) { R.refuse("MANIFEST", "MANIFEST_MISMATCH", `${mp}: ${mism.join("; ")}`); return null; }
    R.manifest.parsed = m;
    return m;
}

function checkScope(R, ctx, man) {
    const globs = man.allowedPaths.map(globToRegExp);
    const files = parseNameStatus(git(["diff", "--name-status", "-z", "--no-renames", ctx.mergeBase, ctx.tip]))
        .map(f => Object.assign(f, { allowed: globs.some(re => re.test(f.path)) }));
    R.diff = { base: ctx.mergeBase, tip: ctx.tip, files };
    const bad = files.filter(f => !f.allowed);
    if (bad.length && !mut("scope_off")) {
        R.refuse("SCOPE", "SCOPE_VIOLATION", `${bad.length} path(s) outside allowedPaths: ${bad.map(f => `${f.status} ${f.path}`).join(", ")}`);
    }
}

function loadAuthorRules() {
    const raw = readBlob(`refs/remotes/${REMOTE}/${MAIN}`, AUTHOR_RULES_FILE);
    if (raw === null) throw new UsageError("GIT_ERROR", `${AUTHOR_RULES_FILE} is missing on origin/main`);
    try {
        const data = JSON.parse(raw);
        if (data.version !== 1 || !data.grandfatheredTips || Array.isArray(data.grandfatheredTips) || typeof data.grandfatheredTips !== "object" ||
            Object.values(data.grandfatheredTips).some(v => typeof v !== "string" || !/^[0-9a-f]{40}$/.test(v))) throw new Error("expected version 1 and grandfatheredTips mapping names to full commit hashes");
        return Object.values(data.grandfatheredTips);
    } catch (e) {
        throw new UsageError("GIT_ERROR", `${AUTHOR_RULES_FILE} on origin/main is invalid: ${e.message}`);
    }
}

function isGrandfathered(ctx, sha) {
    return (ctx.grandfatheredTips || []).some(tip => {
        if (mut("grandfather_by_date")) {
            const commitTime = Number(git(["show", "-s", "--format=%at", sha]).trim());
            const tipTime = Number(git(["show", "-s", "--format=%at", tip], { allowFail: true }).out.trim());
            return Number.isFinite(tipTime) && commitTime <= tipTime;
        }
        return isAncestor(sha, tip);
    });
}

function checkCommitAuthors(R, ctx, man) {
    const dir = `tasks/${man.taskId}/${man.lane}/`;
    const reviewPath = p => p.startsWith(dir) && /^review_[^/]*\.md$/.test(p.slice(dir.length));
    const shas = git(["rev-list", ctx.tip, `^refs/remotes/${REMOTE}/${MAIN}`]).split("\n").filter(Boolean);
    for (const sha of shas) {
        const c = commitInfo(sha);
        const reviewFamily = family(c.tag);
        if (reviewFamily && c.parents.length === 1 && c.files.length > 0 &&
            c.files.every(f => reviewPath(f.path) && f.status !== "D")) {
            if (reviewFamily && c.author !== `deus-${reviewFamily}` && !mut("review_author_off"))
                R.refuse("REVIEW", "REVIEW_AUTHOR", `${sha} [${c.tag}] author "${c.author}" must be deus-${reviewFamily}`);
            continue; // review authors are never grandfathered
        }
        if (isGrandfathered(ctx, sha)) continue;
        if (c.parents.length > 1 && isAncestor(c.parents[1], ctx.refs.mainTracking)) continue; // sync from main
        const fam = family(c.tag);
        if (fam && c.author !== `deus-${fam}` && !mut("writer_author_off")) {
            const manifestOnly = fam === "gemini" && c.author === "deus-ops" && c.parents.length === 1 &&
                c.files.some(f => f.path === ctx.manifestPath) && c.files.every(f => f.path === ctx.manifestPath || f.path === `${dir}BRIEF.md`);
            if (!manifestOnly) R.refuse("AUTHOR", "WRITER_AUTHOR", `${sha} [${c.tag}] author "${c.author}" must be deus-${fam}`);
        }
        if (c.tag === "ops" && !mut("ops_scope_off")) {
            if (c.author !== "deus-ops" || c.files.some(f => !f.path.startsWith(dir)))
                R.refuse("AUTHOR", "OPS_COMMIT_SCOPE", `${sha} [ops] author "${c.author}" must be deus-ops and every changed path must be under ${dir}`);
        }
    }
}

function checkReview(R, ctx, man) {
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const dir = `tasks/${man.taskId}/${man.lane}`;
    const reviewRe = new RegExp(`^${esc(dir)}/review_[^/]*\\.md$`);
    const writerFam = family(man.writer);
    const shas = git(["rev-list", "--first-parent", ctx.tip, `^${ctx.refs.main}`]).split("\n").filter(Boolean);
    const chain = shas.map(commitInfo);
    const touches = c => c.files.some(f => reviewRe.test(f.path));
    const isReview = c => c.parents.length === 1 && c.files.length > 0 && c.files.every(f => reviewRe.test(f.path) && f.status !== "D") &&
        family(c.tag) !== null && family(c.tag) !== writerFam;
    const V = R.review = { commit: null, target: null, file: null, expectedFile: null, hashes: null, verdict: null, pmAbove: false };

    let idx = chain.length && chain[0].parents.length === 1 && touches(chain[0]) ? 0 : -1;
    if (idx < 0) {
        const at = chain.findIndex(c => c.parents.length === 1 && touches(c));
        if (at > 0) {
            const above = chain.slice(0, at);
            const reviewedTarget = chain.slice(at + 1).find(c => !isReview(c));
            const onlyPmMetadata = above.every(c => c.parents.length === 1 && c.tag === PM_TAG &&
                (mut("pm_above_review_any_path") || (c.files.length > 0 && c.files.every(f =>
                    f.path === `${dir}/BRIEF.md` || f.path === `${dir}/lane.json`))));
            // --literal-pathspecs is active in git(); inspect the full diff instead of using :! exclusions.
            const codeIdentical = reviewedTarget && (mut("pm_above_review_any_path") ||
                git(["diff", "--name-only", "-z", reviewedTarget.sha, ctx.tip]).split("\0")
                    .filter(Boolean).every(p => p.startsWith(`${dir}/`)));
            if (onlyPmMetadata && codeIdentical) { idx = at; V.pmAbove = true; }
        }
    }
    if (idx < 0 && mut("review_order_off")) idx = chain.findIndex(c => c.parents.length === 1 && touches(c));
    if (idx < 0) {
        const at = chain.findIndex(touches);
        if (at === 0) R.refuse("REVIEW", "REVIEW_COMMIT_FILES", `tip ${chain[0].sha} is a merge commit; a review commit has exactly one parent`);
        else if (at > 0) {
            R.refuse("REVIEW", "REVIEW_NOT_LAST", `review commit ${chain[at].sha} "${chain[at].subject}" is followed by ${at} commit(s): ` +
                chain.slice(0, at).map(c => `${short(c.sha)} "${c.subject}"`).join(", "));
        } else if (man.hotfix === true) {
            const why = hotfixScopeProblem(ctx, man);
            if (why && !mut("hotfix_any_path")) R.refuse("REVIEW", "HOTFIX_SCOPE", why);
            else ctx.hotfixNoReview = true;
        } else if (!mut("review_required_off")) {
            R.refuse("REVIEW", "REVIEW_MISSING", `no commit on ${ctx.branch} adds ${dir}/review_<agent>_<sha8>.md`);
        }
        return;
    }
    const rc = V.commit = chain[idx];
    const below = chain.slice(idx + 1);
    let t = 0;
    while (t < below.length && isReview(below[t])) t++;
    const target = V.target = below[t] || null;

    const fam = family(rc.tag);
    if (!fam) {
        R.refuse("REVIEW", "REVIEW_TAG_UNKNOWN", `review commit ${rc.sha} subject "${rc.subject}" has no known agent tag (${Object.keys(FAMILIES).map(a => `[${a}]`).join(", ")})` +
            (rc.tag === PM_TAG ? "; [pm] may write lane.json but never reviews" : ""));
    } else {
        if (fam === writerFam && !mut("review_family_off")) {
            R.refuse("REVIEW", "REVIEW_SAME_FAMILY", `review tag [${rc.tag}] is in the writer's family (writer ${man.writer}; claude and fable are one family)`);
        }
        if (man.reviewer && fam !== family(man.reviewer) && !mut("reviewer_designation_off")) {
            R.refuse("REVIEW", "REVIEWER_NOT_DESIGNATED", `review tag [${rc.tag}] is not the manifest's reviewer "${man.reviewer}"`);
        }
    }
    if (!target) {
        R.refuse("REVIEW", "REVIEW_NO_TARGET", `no non-review commit on ${ctx.branch} below review commit ${rc.sha}`);
        return;
    }
    const reviewFiles = rc.files.filter(f => reviewRe.test(f.path));
    const others = rc.files.filter(f => !reviewRe.test(f.path));
    if (!mut("review_files_off") && (others.length || reviewFiles.length !== 1 || reviewFiles[0].status === "D")) {
        R.refuse("REVIEW", "REVIEW_COMMIT_FILES", `review commit ${rc.sha} must add or modify exactly one ${dir}/review_<agent>_<sha8>.md and nothing else; it touches ` +
            rc.files.map(f => `${f.status} ${f.path}`).join(", "));
    }
    V.expectedFile = rc.tag ? `${dir}/review_${rc.tag}_${target.sha.slice(0, 8)}.md` : null;
    const file = reviewFiles.find(f => f.path === V.expectedFile && f.status !== "D") || reviewFiles.find(f => f.status !== "D");
    if (!file) return;
    V.file = file.path;
    if (V.expectedFile && file.path !== V.expectedFile && !mut("review_name_off")) {
        R.refuse("REVIEW", "REVIEW_FILE_NAME", `review file is ${file.path}; expected ${V.expectedFile} (review_<tag>_<first 8 of ${target.sha}>.md)`);
    }
    const text = readBlob(rc.sha, file.path) || "";
    V.hashes = fullHashes(text);
    if (!mut("review_hash_off") && !V.hashes.includes(target.sha)) {
        if (V.hashes.length) R.refuse("REVIEW", "REVIEW_WRONG_COMMIT", `${file.path} names ${V.hashes.join(", ")}; the last non-review commit is ${target.sha}`);
        else R.refuse("REVIEW", "REVIEW_HASH_MISSING", `${file.path} does not hold the full 40-character hash ${target.sha}`);
    }
    V.verdict = parseVerdict(text);
    if (!mut("verdict_off")) {
        if (!V.verdict.lines.length) R.refuse("REVIEW", "REVIEW_VERDICT_MISSING", `${file.path} has no "VERDICT: PASS" or "VERDICT: CLEAN PASS" line`);
        else if (!V.verdict.pass) R.refuse("REVIEW", "REVIEW_VERDICT_NOT_PASS", `${file.path} verdict line(s) not PASS / CLEAN PASS: ${V.verdict.bad.join(" / ")}`);
    }
}

function quarantineList(R, rev, label) {
    const text = readBlob(rev, QUARANTINE_FILE);
    if (text === null) return [];
    let j;
    try { j = JSON.parse(text); } catch (e) {
        R.refuse("TESTS", "QUARANTINE_LIST_INVALID", `${QUARANTINE_FILE} at ${label} ${short(rev)} is not valid JSON: ${e.message}`);
        return [];
    }
    const q = j && typeof j === "object" ? j.quarantine : undefined;
    if (q === undefined) return [];
    const entries = Array.isArray(q) ? q.map(e => (typeof e === "string" ? e : e && typeof e.path === "string" ? e.path : null)) : null;
    if (!entries || entries.some(e => !e)) {
        R.refuse("TESTS", "QUARANTINE_LIST_INVALID", `${QUARANTINE_FILE} at ${label} ${short(rev)}: "quarantine" must be an array of {"path": ...} or strings`);
        return [];
    }
    return entries.map(p => ({ path: p, norm: normPath(p), from: label }));
}

// A caller's global or system core.autocrlf=true smudges LF blobs into CRLF on checkout.
// core.eol=lf covers a text / text=auto path whose eol attribute is unspecified (Windows native,
// or a caller's core.eol=crlf, would otherwise write CRLF). core.safecrlf=false stops a caller's
// safecrlf from refusing that checkout. An explicit eol= attribute in the tree still wins.
const CLONE_LF = [["core.autocrlf", "false"], ["core.eol", "lf"], ["core.safecrlf", "false"]];

function cloneLfArgs() {
    if (mut("clone_autocrlf_off")) return [];
    return CLONE_LF.flatMap(([k, v]) => ["-c", `${k}=${v}`]);
}

// A hotfix path is under tools/**, docs/**, tasks/**, tools/fixtures/** (covered by tools/) or game/data/sim/**.
function hotfixLiteral(glob) {
    const cut = String(glob).search(/[*?]/);
    return (cut === -1 ? String(glob) : String(glob).slice(0, cut)).replace(/\/+$/, "");
}

function hotfixUnderRoot(literal) {
    if (!literal) return false;
    return HOTFIX_ROOTS.some(r => literal === r || literal.startsWith(r + "/"));
}

function hotfixScopeProblem(ctx, man) {
    const badGlobs = man.allowedPaths.filter(g => !hotfixUnderRoot(hotfixLiteral(g)));
    const badFiles = [];
    const shas = git(["rev-list", ctx.tip, `^${ctx.refs.main}`]).split("\n").filter(Boolean);
    for (const sha of shas) {
        const c = commitInfo(sha);
        for (const f of c.files) if (!hotfixUnderRoot(f.path)) badFiles.push(`${short(sha)} ${f.status} ${f.path}`);
    }
    if (!badGlobs.length && !badFiles.length) return null;
    const parts = ["hotfix lanes may only touch tools/**, docs/**, tasks/**, tools/fixtures/** or game/data/sim/**"];
    if (badGlobs.length) parts.push(`allowedPaths: ${badGlobs.join(", ")}`);
    if (badFiles.length) parts.push(`commits: ${badFiles.join(", ")}`);
    return parts.join("; ");
}

function gitPath(cwd, args) {
    const rel = git(["rev-parse", "--git-path", ...args], { cwd }).trim();
    return path.isAbsolute(rel) ? rel : path.resolve(cwd, rel);
}

// Alternates are not transitive. A test clone already shares the source object store (the blobs);
// the temporary merge commit and any new trees live only in the merge clone, so that object
// directory is added as a second alternate before checkout.
function addAlternate(dest, objectDir) {
    const alt = path.join(dest, ".git", "objects", "info", "alternates");
    const line = objectDir.replace(/\\/g, "/");
    let cur = fs.existsSync(alt) ? fs.readFileSync(alt, "utf8") : "";
    if (cur.split(/\r?\n/).includes(line)) return;
    if (cur && !cur.endsWith("\n")) cur += "\n";
    fs.writeFileSync(alt, cur + line + "\n");
}

function makeClone(ctx, dest, rev) {
    const lf = cloneLfArgs();
    const c = git(["clone", ...lf, "--quiet", "--shared", "--no-checkout", ctx.commonDir, dest], { allowFail: true, cwd: os.tmpdir() });
    if (!c.ok) return `git clone failed: ${c.err}`;
    if (lf.length) {
        for (const [k, v] of CLONE_LF) {
            const set = git(["config", "--local", k, v], { allowFail: true, cwd: dest });
            if (!set.ok) return `git config --local ${k} ${v} failed: ${set.err}`;
        }
    }
    let checkout = rev || ctx.tip;
    let expect = rev || ctx.tip;
    if (!rev && ctx.testedOnMerge && ctx.testMergeClone) {
        addAlternate(dest, gitPath(ctx.testMergeClone, ["objects"]));
        checkout = ctx.testRev;
        expect = ctx.testRev;
    } else if (!rev && ctx.testRev && !ctx.testedOnMerge) {
        checkout = ctx.testRev;
        expect = ctx.testRev;
    }
    const co = git([...lf, "-c", "advice.detachedHead=false", "checkout", "--quiet", "--detach", checkout], { allowFail: true, cwd: dest });
    if (!co.ok) return `git checkout ${checkout} failed: ${co.err}`;
    const head = revParse("HEAD", dest);
    return head === expect ? null : `clone HEAD is ${head}, expected ${expect}`;
}

// Temporary merge of origin/main and the lane tip. A conflict is reported and no test runs.
// tests_at_tip and fresh_clone_off leave the tests on the tip (the latter in the caller's work tree).
function prepareTestMerge(ctx) {
    if (mut("tests_at_tip") || mut("fresh_clone_off")) {
        ctx.testRev = ctx.tip;
        ctx.testedOnMerge = false;
        return null;
    }
    const base = ctx.refs.mainTracking || ctx.refs.main;
    const dest = path.join(ctx.tmp, "merge-result");
    const err = makeClone(ctx, dest, base);
    if (err) return { error: err };
    const merged = git(["merge", "--no-ff", "-m", "temporary merge of origin/main and the lane tip for gate tests", ctx.tip],
        { cwd: dest, allowFail: true, env: TEST_MERGE_IDENTITY });
    if (!merged.ok) {
        const unmerged = git(["diff", "--name-only", "--diff-filter=U"], { cwd: dest, allowFail: true });
        const names = (unmerged.out || "").split("\n").map(s => s.trim()).filter(Boolean);
        git(["merge", "--abort"], { cwd: dest, allowFail: true });
        if (names.length) return { conflict: names.join(", ") };
        return { error: `temporary merge failed: ${(merged.err || merged.out || "").split("\n").slice(-5).join(" ")}` };
    }
    const sha = revParse("HEAD", dest);
    ctx.testMergeClone = dest;
    ctx.testRev = sha;
    ctx.testTree = git(["rev-parse", `${sha}^{tree}`], { cwd: dest }).trim();
    ctx.testedOnMerge = true;
    return null;
}

function runCommand(cmd, args, cwd, timeoutMs, logFile) {
    return new Promise((resolve) => {
        let fd;
        try { fd = fs.openSync(logFile, "w"); }
        catch (e) { resolve({ error: e }); return; }
        let child;
        try {
            child = spawn(cmd, args, { cwd, env: GIT_ENV, stdio: ["ignore", fd, fd], shell: false, windowsHide: true });
        } catch (e) {
            try { fs.closeSync(fd); } catch (closeErr) { /* already closed */ }
            resolve({ error: e });
            return;
        }
        let settled = false;
        let timedOut = false;
        const timer = timeoutMs == null ? null : setTimeout(() => {
            timedOut = true;
            try { child.kill("SIGKILL"); } catch (e) { /* already exited */ }
        }, timeoutMs);
        const finish = (result) => {
            if (settled) return;
            settled = true;
            if (timer) clearTimeout(timer);
            try { fs.closeSync(fd); } catch (e) { /* already closed */ }
            resolve(result);
        };
        child.on("error", (err) => finish({ error: err, timedOut }));
        child.on("close", (status, signal) => finish({ status, signal, timedOut }));
    });
}

function readLogTail(logFile) {
    try { return fs.readFileSync(logFile, "utf8").replace(/\s+$/, "").split(/\r?\n/).slice(-LOG_TAIL_LINES).join("\n"); }
    catch (e) { return `(log unreadable: ${e.message})`; }
}

function readFailLines(logFile) {
    if (mut("fail_lines_off")) return null;
    try { return fs.readFileSync(logFile, "utf8").replace(/\s+$/, "").split(/\r?\n/).filter(l => /\bFAIL\b/.test(l)).slice(-20).join("\n") || null; }
    catch (e) { return null; }
}

function wantsRetry(spec) {
    return !!(spec && spec.retryOnce) || mut("retry_without_flag");
}

function retryLimit() {
    return mut("retry_twice") ? 2 : 1;
}

async function runPool(items, limit, worker) {
    if (!items.length) return;
    const queue = items.slice();
    const n = Math.max(1, Math.min(limit, queue.length));
    const loops = [];
    for (let i = 0; i < n; i++) {
        loops.push((async () => {
            while (queue.length) await worker(queue.shift());
        })());
    }
    await Promise.all(loops);
}

async function executeTest(R, ctx, row, attempt) {
    row.attempts = attempt + 1;
    const t = row.spec;
    const args = t.args || [];
    let cwd = ctx.top;
    if (!mut("fresh_clone_off")) {
        if (attempt === 0) {
            if (row.cloneErr) {
                row.failed = true; row.passed = false; row.terminal = true; ctx.keepTemp = true;
                row.result = "CLONE FAILED";
                row.failCode = "CLONE_FAILED";
                row.failDetail = `test ${row.n}: ${row.cloneErr}`;
                return;
            }
            cwd = row.cwd;
        } else {
            cwd = path.join(ctx.tmp, `clone-${row.n}-r${attempt}`);
            const err = makeClone(ctx, cwd);
            if (err) {
                row.failed = true; row.passed = false; row.terminal = true; ctx.keepTemp = true;
                row.result = "CLONE FAILED";
                row.failCode = "CLONE_FAILED";
                row.failDetail = `test ${row.n}: ${err}`;
                return;
            }
        }
    }
    const logFile = path.join(ctx.tmp, attempt === 0 ? `test-${row.n}.log` : `test-${row.n}-retry-${attempt}.log`);
    const label = attempt === 0 ? `test ${row.n}/${ctx.testCount}` : `test ${row.n}/${ctx.testCount} retry ${attempt}`;
    console.log(`.. ${label}: ${row.display} (timeout ${row.timeoutSec} s) in ${cwd}`);
    const t0 = process.hrtime.bigint();
    const timeoutMs = mut("test_timeout_off") ? null : Math.round(row.timeoutSec * 1000);
    const r = await runCommand(t.cmd === "node" ? process.execPath : t.cmd, args, cwd, timeoutMs, logFile);
    row.durationMs = Number(process.hrtime.bigint() - t0) / 1e6;
    row.exit = r.status == null ? (r.signal ? `signal ${r.signal}` : null) : r.status;
    const passed = !r.error && !r.timedOut && (r.status === 0 || mut("test_exit_off"));
    if (passed) {
        row.failed = false; row.passed = true; row.failCode = null; row.failDetail = null; row.tail = null; row.failLines = null;
        row.result = row.attempts > 1 ? "flaky: passed on retry" : "PASS";
        if (row.attempts > 1) ctx.keepTemp = true;
        return;
    }
    row.failed = true; row.passed = false; ctx.keepTemp = true;
    row.tail = readLogTail(logFile);
    row.failLines = readFailLines(logFile);
    if (r.timedOut || (r.error && r.error.code === "ETIMEDOUT")) {
        row.result = "TIMEOUT";
        row.failCode = "TEST_TIMEOUT";
        row.failDetail = `test ${row.n} (${row.display}) ran past its ${row.timeoutSec} s timeout and was killed`;
    } else if (r.error) {
        row.result = "SPAWN ERROR";
        row.exit = r.error.code || "error";
        row.failCode = "TEST_SPAWN_ERROR";
        row.failDetail = `test ${row.n} (${row.display}) could not start: ${r.error.message}`;
    } else {
        row.result = "FAIL";
        row.failCode = "TEST_FAILED";
        row.failDetail = `test ${row.n} (${row.display}) exited ${row.exit}`;
    }
}

async function checkTests(R, ctx, man) {
    const tests = man.gateTests;
    if (!tests.length) { R.refuse("TESTS", "TESTS_NONE", `${ctx.manifestPath} declares no gateTests`); return; }
    const quarantine = [...quarantineList(R, ctx.refs.main, MAIN), ...quarantineList(R, ctx.tip, "tip")];
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deus-merge-gate-"));
    ctx.tmp = tmp;
    ctx.testCount = tests.length;
    const rows = tests.map((t, i) => {
        const args = t.args || [];
        const row = {
            n: i + 1, display: [t.cmd, ...args].map(quoteArg).join(" "),
            timeoutSec: t.timeoutSec || DEFAULT_TIMEOUT_SEC, defaultTimeout: t.timeoutSec == null,
            exit: null, durationMs: null, result: "", tail: null, spec: t,
            attempts: 0, failed: false, passed: false, terminal: false, quarantined: false
        };
        R.tests.push(row);
        const tokens = [t.cmd, ...args].map(normPath);
        const q = mut("quarantine_off") ? null : quarantine.find(e => tokens.includes(e.norm));
        if (q) {
            row.quarantined = true;
            row.result = "QUARANTINED (not run)";
            R.refuse("TESTS", "TEST_QUARANTINED", `test ${row.n} (${row.display}) uses ${q.path}, quarantined in ${QUARANTINE_FILE} on ${q.from}`);
        }
        return row;
    });
    const runnable = rows.filter(row => !row.quarantined);
    if (!runnable.length) return;
    const prep = prepareTestMerge(ctx);
    if (prep && prep.conflict) {
        R.refuse("TESTS", "MERGE_CONFLICT", `origin/main and ${ctx.tip} conflict before tests: ${prep.conflict}`);
        return;
    }
    if (prep && prep.error) {
        R.refuse("TESTS", "CLONE_FAILED", prep.error);
        return;
    }
    if (!mut("fresh_clone_off")) {
        for (const row of runnable) {
            row.cwd = path.join(tmp, `clone-${row.n}`);
            row.cloneErr = makeClone(ctx, row.cwd);
        }
    }
    const jobs = mut("sequential_only") ? 1 : (ctx.jobs || DEFAULT_JOBS);
    const parallel = runnable.filter(row => !row.spec.serial);
    const serial = runnable.filter(row => row.spec.serial);
    const wall0 = process.hrtime.bigint();
    await runPool(parallel, jobs, (row) => executeTest(R, ctx, row, 0));
    for (const row of serial) await executeTest(R, ctx, row, 0);
    let safety = 0;
    while (safety++ < 4) {
        const due = runnable.filter(row => row.failed && !row.terminal && wantsRetry(row.spec) && row.attempts < 1 + retryLimit());
        if (!due.length) break;
        for (const row of due) await executeTest(R, ctx, row, row.attempts);
    }
    R.testWallMs = Number(process.hrtime.bigint() - wall0) / 1e6;
    for (const row of runnable) {
        if (row.passed || !row.failCode) continue;
        R.refuse("TESTS", row.failCode, row.failDetail);
    }
}

// ---------------------------------------------------------------- merge

function doMerge(R, ctx) {
    const nowTip = revParse(`refs/heads/${ctx.branch}`), nowMain = revParse(`refs/heads/${MAIN}`);
    if (nowTip !== ctx.tip) {
        R.refuse("REFS", "RACE_REF_MOVED", `${ctx.branch} moved while the gate ran: ${ctx.tip} -> ${nowTip}`);
        return;
    }
    const d = mainDirt({ path: ctx.mainWorktree });
    if (d.error || d.entries.length || d.inProgress.length) {
        R.refuse("MAIN", "MAIN_DIRTY", `${ctx.mainWorktree} changed while the gate ran`);
        return;
    }
    const refreshed = git(["fetch", "--quiet", REMOTE], { allowFail: true });
    if (!refreshed.ok) {
        R.refuse("REFS", "REMOTE_ERROR", `git fetch ${REMOTE} at merge step failed: ${refreshed.err}`);
        return;
    }
    const remoteMain = revParse(`refs/remotes/${REMOTE}/${MAIN}`);
    const tipAfterFetch = revParse(`refs/heads/${ctx.branch}`);
    const remoteTip = revParse(`refs/remotes/${REMOTE}/${ctx.branch}`);
    if (tipAfterFetch !== ctx.tip || remoteTip !== ctx.tip) {
        R.refuse("REFS", "RACE_REF_MOVED", `${ctx.branch} moved while the gate ran: checked ${ctx.tip}, local ${tipAfterFetch}, origin ${remoteTip}`);
        return;
    }
    const mainMoved = nowMain !== ctx.refs.main || remoteMain !== ctx.refs.main;
    if (mainMoved) {
        if (!remoteMain || !nowMain || !isAncestor(ctx.refs.main, remoteMain) || !isAncestor(nowMain, remoteMain)) {
            R.refuse("REFS", "RACE_REF_MOVED", `${MAIN} moved without a fast-forward from ${ctx.refs.main} to origin/main ${remoteMain}; local ${nowMain}`);
            return;
        }
        const moved = git(["diff", "--name-only", "-z", ctx.refs.main, remoteMain]).split("\0").filter(Boolean);
        const laneFiles = new Set(R.diff.files.map(f => f.path));
        const shared = moved.filter(p => laneFiles.has(p));
        if (shared.length) {
            R.refuse("REFS", "RACE_REF_MOVED", `${MAIN} moved and shares lane file(s): ${shared.join(", ")}`);
            return;
        }
        const tree = git(["merge-tree", "--write-tree", remoteMain, ctx.tip], { allowFail: true });
        if (!tree.ok) {
            R.refuse("REFS", "RACE_REF_MOVED", `${MAIN} moved; merge-tree conflict in: ${(tree.out || tree.err).trim().split("\n").slice(-8).join(" ")}`);
            return;
        }
        const ff = git(["merge", "--ff-only", remoteMain], { allowFail: true, cwd: ctx.mainWorktree });
        if (!ff.ok) {
            R.refuse("REFS", "RACE_REF_MOVED", `${MAIN} could not fast-forward to origin/main ${remoteMain}: ${ff.err || ff.out}`);
            return;
        }
        R.notes.push(`main moved while the gate ran: ${ctx.refs.main} -> ${remoteMain}; merged on top (no shared files)`);
        ctx.refs.main = remoteMain;
        R.refs.push({ label: "main at merge", cmd: `git rev-parse refs/remotes/${REMOTE}/${MAIN}`, value: remoteMain });
    }
    let msg = `Merge ${ctx.branch} at ${ctx.tip} (${ctx.taskId} ${ctx.lane}) via merge_gate`;
    if (ctx.hotfixNoReview) msg += " (hotfix, no review: DEC-087)";
    const r = git(["merge", "--no-ff", "--no-edit", "-m", msg, ctx.tip], { allowFail: true, cwd: ctx.mainWorktree });
    if (!r.ok) {
        const abort = git(["merge", "--abort"], { allowFail: true, cwd: ctx.mainWorktree });
        const back = revParse(`refs/heads/${MAIN}`) === ctx.refs.main;
        R.refuse("EXEC", "MERGE_FAILED", `git merge --no-ff ${ctx.tip} failed (exit ${r.status}): ${(r.err || r.out).split("\n").slice(-5).join(" ")}; ` +
            `merge --abort ${abort.ok ? "ok" : "failed"}, ${MAIN} ${back ? "unchanged" : "MOVED: inspect it"}`);
        R.execution = "FAILED (aborted)";
        return;
    }
    const head = revParse(`refs/heads/${MAIN}`);
    const parents = git(["rev-list", "--parents", "-n", "1", head]).trim().split(" ").slice(1);
    if (parents.length !== 2 || parents[0] !== ctx.refs.main || parents[1] !== ctx.tip) {
        R.refuse("EXEC", "MERGE_FAILED", `${MAIN} is now ${head} with parents ${parents.join(", ")}; expected ${ctx.refs.main}, ${ctx.tip}`);
        R.execution = `UNEXPECTED RESULT ${head}`;
        return;
    }
    // When main did not move, the merge tree is the tree the tests ran on. A main move is decided
    // by the checks above (lane-gk): a clean unrelated move is merged on top and the tree differs.
    if (!mainMoved && ctx.testTree) {
        const tree = git(["rev-parse", `${head}^{tree}`]).trim();
        if (tree !== ctx.testTree) {
            R.refuse("EXEC", "MERGE_FAILED", `merge tree ${tree} is not the tested tree ${ctx.testTree}`);
            R.execution = `UNEXPECTED RESULT ${head}`;
            return;
        }
    }
    R.execution = `MERGED ${head} (parents ${short(parents[0])} ${short(parents[1])}; not pushed)`;
    R.refs.push({ label: "new main", cmd: `git rev-parse refs/heads/${MAIN}`, value: head });
}

// ---------------------------------------------------------------- main

async function run(argv) {
    const R = new Report();
    const ctx = { mode: null };
    let opts;
    try {
        opts = parseArgs(argv);
    } catch (e) {
        R.refuse("REFS", e.code || "USAGE", e.message);
        CHECKS.forEach(([k]) => R.skip(k, "not run"));
        if (e.code === "USAGE") console.log(USAGE);
        printReport(R, ctx, 2);
        return 2;
    }
    if (opts.help) { console.log(USAGE); return 0; }
    for (const m of opts.mutants) active.add(m);
    const dryRun = opts.dryRun || active.size > 0;
    Object.assign(ctx, {
        lane: opts.lane, branch: opts.branch, jobs: opts.jobs,
        mode: dryRun ? (opts.dryRun ? "dry-run" : "dry-run (forced: mutants active)") : "merge"
    });
    try {
        const top = git(["rev-parse", "--show-toplevel"], { allowFail: true });
        if (!top.ok) throw new UsageError("GIT_ERROR", `${CWD} is not inside a git work tree`);
        ctx.top = path.resolve(top.out.trim());
        CWD = ctx.top;
        ctx.commonDir = path.resolve(git(["rev-parse", "--path-format=absolute", "--git-common-dir"]).trim());
        const mf = path.isAbsolute(opts.manifest) ? path.relative(ctx.top, opts.manifest) : opts.manifest;
        ctx.manifestPath = mf.replace(/\\/g, "/").replace(/^(?:\.\/)+/, "");

        const fetch = git(["fetch", "--quiet", REMOTE], { allowFail: true });
        if (!fetch.ok) R.refuse("REFS", "REMOTE_ERROR", `git fetch ${REMOTE} failed: ${fetch.err}`);
        const b = ctx.branch;
        const [remote, mainRemote] = lsRemote([`refs/heads/${b}`, `refs/heads/${MAIN}`]);
        ctx.refs = {
            tip: revParse(`refs/heads/${b}`), tracking: revParse(`refs/remotes/${REMOTE}/${b}`), remote,
            main: revParse(`refs/heads/${MAIN}`), mainTracking: revParse(`refs/remotes/${REMOTE}/${MAIN}`), mainRemote
        };
        ctx.tip = ctx.refs.tip;
        R.refs.push(
            { label: "local branch", cmd: `git rev-parse refs/heads/${b}`, value: ctx.refs.tip },
            { label: "tracking ref", cmd: `git rev-parse refs/remotes/${REMOTE}/${b}`, value: ctx.refs.tracking },
            { label: "remote branch", cmd: `git ls-remote ${REMOTE} refs/heads/${b}`, value: ctx.refs.remote.sha },
            { label: "local main", cmd: `git rev-parse refs/heads/${MAIN}`, value: ctx.refs.main },
            { label: "tracking main", cmd: `git rev-parse refs/remotes/${REMOTE}/${MAIN}`, value: ctx.refs.mainTracking },
            { label: "remote main", cmd: `git ls-remote ${REMOTE} refs/heads/${MAIN}`, value: ctx.refs.mainRemote.sha }
        );
        checkPushed(R, ctx);
        checkMain(R, ctx);

        const later = ["MANIFEST", "SCOPE", "REVIEW", "TESTS"];
        if (!ctx.tip) {
            R.refuse("REFS", "BRANCH_MISSING", `no local refs/heads/${b}`);
            later.forEach(c => R.skip(c, "no branch"));
        } else if (!ctx.refs.main) {
            later.forEach(c => R.skip(c, "no main"));
        } else {
            const mb = git(["merge-base", ctx.refs.main, ctx.tip], { allowFail: true });
            ctx.mergeBase = mb.ok ? mb.out.trim() : null;
            R.refs.push({ label: "merge-base", cmd: `git merge-base ${short(ctx.refs.main)} ${short(ctx.tip)}`, value: ctx.mergeBase },
                { label: "checked sha", cmd: "(local branch tip; every check reads this commit)", value: ctx.tip });
            if (!ctx.mergeBase) {
                R.refuse("REFS", "NO_MERGE_BASE", `${b} and ${MAIN} share no history`);
                later.forEach(c => R.skip(c, "no merge-base"));
            } else if (isAncestor(ctx.tip, ctx.refs.main)) {
                R.refuse("REFS", "NOTHING_TO_MERGE", `${b} ${ctx.tip} is already contained in ${MAIN}`);
                later.forEach(c => R.skip(c, "nothing to merge"));
            } else {
                ctx.grandfatheredTips = loadAuthorRules();
                const man = checkManifest(R, ctx);
                if (!man) ["SCOPE", "REVIEW", "TESTS"].forEach(c => R.skip(c, "manifest not trusted"));
                else {
                    ctx.taskId = man.taskId;
                    checkScope(R, ctx, man);
                    checkReview(R, ctx, man);
                    checkCommitAuthors(R, ctx, man);
                    if (["REVIEW", "AUTHOR"].some(k => R.state(k).codes.length)) R.skip("TESTS", "authorship or review refused");
                    else await checkTests(R, ctx, man);
                }
            }
        }
        if (R.refused()) R.execution = "NOT RUN (refused)";
        else if (dryRun) R.execution = `SKIPPED (${ctx.mode})`;
        else doMerge(R, ctx);
    } catch (e) {
        if (!(e instanceof UsageError)) throw e;
        R.refuse("REFS", e.code, e.message);
        CHECKS.forEach(([k]) => R.skip(k, "gate stopped by the error"));
        R.execution = "NOT RUN (error)";
        printReport(R, ctx, 2);
        cleanup(ctx, opts);
        return 2;
    }
    cleanup(ctx, opts);
    const code = R.refused() ? 1 : 0;
    printReport(R, ctx, code);
    return code;
}

function cleanup(ctx, opts) {
    if (!ctx.tmp) return;
    if (opts.keepTemp || (ctx.keepTemp && !mut("keep_failed_temp_off"))) { console.log(`.. kept temporary clones and logs in ${ctx.tmp}`); return; }
    try { fs.rmSync(ctx.tmp, { recursive: true, force: true, maxRetries: 3 }); } catch (e) { console.log(`.. NOTE temporary folder not removed: ${ctx.tmp}: ${e.message}`); }
}

module.exports = { MUTANTS, FAMILIES, PM_TAG, globToRegExp, parseVerdict, fullHashes, subjectTag, family, normPath, validateManifest, trustedManifestCommit };

if (require.main === module) {
    run(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(err => {
        console.error(err && err.stack ? err.stack : err);
        process.exitCode = 2;
    });
}
