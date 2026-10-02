# Handoff: AG (Antigravity / Gemini) takes the coordinator seat; Claude codes

**Authority:** Owner, 2026-10-02 ~02:25Z, to the PM in chat: "Nah im gonna have you code, develop a comprehensive brief for AG to take over" (recorded as DEC-088). This replaces the PM arrangement of DEC-042 and DEC-086 for the coordinator role. The Owner can change any of it in his own words at any time.

**Written by:** Claude (the outgoing PM), 2026-10-02 02:30Z, at main `d874e0be` and after. Everything below was true at that commit; re-check `git log` and the telemetry file before acting on a state claim.

---

## 1. Who does what from now on

| Seat | Who | Does | Does not |
|---|---|---|---|
| Owner | the human | decides scope, art, rulings; grades art in game (DEC-079) | |
| **Coordinator (PM)** | **AG** (the Antigravity agent, in the Antigravity chat) | the work queue; opens lanes; launches every writer and every reviewer run; runs every merge_gate; records Owner decisions in the Owner's words; keeps `docs/STATUS.md` current; reports to the Owner | write review files; edit anything in the main checkout except through a PM commit of docs or lane folders; commit tooling on main; change the shared git identity |
| Writers | **Claude** (engine and simulation lanes: `game/js/plugins`, `game/js/sim`, worldgen, physics; also tooling when asked), Codex (bounded tooling, tests, data tables, scripts), Grok (algorithmic lanes, tooling, hard tests), Gemini (AG's own agent: small focused lanes) | the lane's code, tests, mutants, REPORT.md, in the lane's worktree | edit BRIEF.md or lane.json; touch files outside allowedPaths; commit on main |
| Reviewers | Grok and Codex (and Claude for Grok/Codex-written lanes when the Owner allows the usage) | an independent review in their own launch_worker run, which writes and commits the review file | review a lane of their own family |

Family rule (merge_gate `REVIEW_SAME_FAMILY`): writer and reviewer are different families. claude = fable = one family; gemini = antigravity = one family; codex = openai; grok.

**Claude's usage is metered** (Max plan; the weekly all-models meter was at 79% at 01:35Z on 2026-10-02 with the reset on 2026-10-06 22:00Z). Give Claude the lanes that need it (engine, simulation, world generation, physics, anything that reads many plugins at once) and give routine tooling and data lanes to Codex and Grok. Launch Claude as a worker with `-Provider claude` (effort floor high); the Owner may also hand Claude a lane directly in the Claude Code app.

## 2. The rules that are not negotiable (each was broken at least once on 2026-10-01; AUDIT_LOG A12, A13)

1. **Main is touched only by merge_gate merges and PM commits** of `docs/**`, `tasks/**`, `.agents/**` (DEC-085 item 1). A PM commit is made with the PM identity per command: `git -c user.name=deus-pm -c user.email=deus-pm@local.invalid commit ...`. The pre-commit hook in the shared `.git` refuses other authors on main; never bypass it (`--no-verify` is forbidden).
2. **Never run `git config user.name` or `user.email` in the shared checkout.** It stays `deus-ops`. Every agent signs per command with `git -c`. (A13-5, A13-15.)
3. **Never edit a file in the main checkout** (`C:\Users\snewt\OneDrive\Desktop\UF`) except the docs and lane folders of a PM commit you are making right then. Tooling (`tools/**`), plugins, data: only through a lane. (A13-4, A13-10, A13-16: a live edit of `launch_worker.ps1` on 2026-10-02 broke a writer launch.) `git status` in the main checkout must show only `?? tasks/PRUNE/`.
4. **A review file is committed only by the reviewer's own launch_worker run.** Never extract a run's output and commit it yourself, under any identity (A12-1, A13-7, A13-13, A13-14). If a run ends `EXITED-NO-COMMIT`, relaunch it with a prompt that requires the file and the commit (section 6). Before merging, check: review commit author is `deus-<reviewer family>`, and the run record in `docs/telemetry/sessions/active_workers.json` for that lane and role shows `newCommits` 1 or more with `headCommit` equal to the review commit.
5. **A review prompt names the lane's current tip** (`git rev-parse HEAD` in the worktree), never an older commit (A13-12).
6. **merge_gate is the only way onto main** (`--no-ff`, DEC-048). Never merge by hand. Never force-push, never rewrite a pushed branch, never `git clean -x` (U7 reference data and local mail live untracked), never amend a pushed commit: fix with a new commit.
7. **Writers stage only their allowedPaths** (`git add <paths>`; never `-A`, `.`, `-a`). A writer that changes its own BRIEF.md or lane.json is refused by the gate (`MANIFEST_TAMPERED`); re-cut the lane instead (A13-6).
8. **Evidence is real output.** Screenshots are opened and described (AGENTS.md Rule 5; A13-9: four "tree" screenshots showed colonists). Art-swap lanes prove themselves with a script-made contact sheet (DEC-085 item 5). "Not checked" is the phrase for anything not observed.
9. **Owner decisions are recorded in the Owner's words**, as a `DEC-nnn` entry in `docs/OWNER_DECISIONS.md` (next free number after DEC-088), a few lines plus the quote (DEC-087 item 8). Relay nothing as an Owner decision that the Owner did not say.
10. **Art:** the live summary at the top of `AGENTS.md`. The Owner generates all art; the PM's PixelLab work is the Owner's hand-off; no animations; no creatures or people yet; the Owner grades art in game (DEC-079). Nothing here changes with the coordinator.
11. **Engine core is read-only:** never edit `game/js/rmmz_*.js`, `game/js/main.js`, `game/js/libs/`.
12. **Secrets:** never print, commit or mail `.pixellab_token`, API keys or tokens. Mail files and telemetry are gitignored and must stay so.
13. **Encoding:** every file an agent writes is UTF-8 without BOM, LF line endings, the file's own line endings kept. PowerShell `Set-Content`, `Out-File` and `>` write BOM + CRLF (A13-3; lane-gn's redo). Use Node `fs.writeFileSync` or the editor. A diff that shows a whole file changed for a small edit is a line-ending accident: fix it before committing.
14. **Codex model cap:** `gpt-6-sol` (DEC-077). `launch_worker.ps1` line 118 carries it; `~/.codex/config.toml` too. Never change either without the Owner's words.

## 3. The machinery

- **Repository:** `C:\Users\snewt\OneDrive\Desktop\UF` (main checkout; branch `main`). Remote `origin` (GitHub `willshw89/Deus`). Lane worktrees: `C:\Users\snewt\.deus_worktrees\<lane>` on branch `task/<lane>`; logs under `C:\Users\snewt\.deus_worktrees\logs\<lane>\`.
- **Lane manifest:** `tasks/<taskId>/<lane>/lane.json` with `lane`, `taskId`, `branch`, `writer`, `reviewer`, `push: true`, `allowedPaths` (globs), `gateTests` (`{cmd, args, timeoutSec}`), and after lane-gr: optional `serial`, `retryOnce` per test and `hotfix` per lane. Validate with `require("tools/governance/merge_gate.js").validateManifest(manifest, path)` (returns an array of errors). The brief is `tasks/<taskId>/<lane>/BRIEF.md`; the writer's report `REPORT.md`; the review `review_<tag>_<tip8>.md`.
- **Opening a lane** (today, by hand; lane-gr adds `tools/ops/open_lane.ps1`): `git worktree add C:\Users\snewt\.deus_worktrees\<lane> -b task/<lane> origin/main`; write BRIEF.md and lane.json in the worktree; validate; commit as deus-pm with subject `[pm] Open <lane> (<taskId>, writer <w>): <title>`; `git push -u origin task/<lane>`.
- **Launching a worker:** `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/launch_worker.ps1 -Lane <lane> -Provider <claude|grok|codex|gemini> -Role <writer|reviewer> -BriefPath <worktree>\tasks\<taskId>\<lane>\BRIEF.md [-PromptFile <file>] -NoCommitPrompt -TimeoutMinutes 300`, run from the main checkout. It refuses a missing brief, a live worker on the same lane, a wrong branch, or a same-family pair. The run record lands in `docs/telemetry/sessions/active_workers.json` (gitignored): `state` COMPLETED, FAILED, EXITED-NO-COMMIT, ORPHANED-CHILDREN, TIMEOUT, LOST; `headCommit`; `newCommits`. The Gemini CLI cannot run as a worker (A13-8): Gemini lanes are written by your own agent in the lane worktree, signing per command as deus-gemini, with the same rules as any writer.
- **Merging:** from the main checkout, with a clean tracked tree: `node tools/governance/merge_gate.js --lane <lane> --manifest tasks/<taskId>/<lane>/lane.json --keep-temp`; on `GATE: PASS` it merges `--no-ff` and you `git push origin main`. Reason codes in `tools/governance/MERGE_GATE.md`: MAIN_DIRTY (tracked changes in main's tree), RACE_REF_MOVED (lane tip moved, or main moved on a shared file), MANIFEST_TAMPERED, SCOPE_VIOLATION, REVIEW_NOT_LAST, REVIEW_AUTHOR, WRITER_AUTHOR, TEST_FAILED, and after lane-gr MERGE_CONFLICT and HOTFIX_SCOPE. Accepted verdicts: `CLEAN PASS`, `PASS`, `PASS WITH MINORS`. The gate runs each gate test in a fresh clone (CRLF-safe); a test that fails only under load is re-run once by itself (lane-gr) or, until then, the gate is re-run whole.
- **Mail:** `docs/agents/mailboxes/<agent>/{inbox,outbox}.jsonl` (gitignored; one UTF-8 JSON line per message, no BOM, LF). The Claude mailbox is `fable/`. Mail only what git and telemetry cannot say: a decision needed, a blocker, a ruling. No status mail.
- **Status for the Owner:** `docs/STATUS.md` is the canonical status (AGENTS.md read order). Keep a lanes table in it (lane, task, writer, reviewer, state, tip, note) and update it with each PM commit that changes a lane's state. The claude.ai "DEUS Build Board" artifact (https://claude.ai/artifact/3i1ojDhgXAKQC4JLGsQYHQ) is Claude-maintained and is frozen at this handoff; it is not yours to update.
- **Decisions and audits:** `docs/OWNER_DECISIONS.md` (DEC entries), `docs/AUDIT_LOG.md` (numbered findings graded BLOCKER / MAJOR / MINOR, with evidence; code and defect findings only, DEC-087 item 6).
- **Natural-world plan:** `tasks/wbs_registry.json` (every leaf, its parts and gates), `docs/worldgen/DEUS_WORLDGEN_WBS.md`, `docs/design/COLLAPSE_REPLAN_DEC083.md` (the structure and collapse re-plan: lanes nx1 to nx5, the eight Owner questions in section 10 and the PM defaults in section 11), `docs/design/WAVE3_BRIEF_NOTES_2026-10-02.md` (how the dd, dp and dr briefs were drafted and what was not verified). The lane-nx1 brief is `tasks/NAT.02.01/lane-gq/BRIEF.md`; nx2 to nx5 are briefed from the re-plan the same way.

## 4. The lane lifecycle, step by step

1. **Pick the next leaf** from the plan (section 3), in dependency order; re-check the base: `git log -1 origin/main`, and that the leaf's gates are green on main (run them in a clone, never in the main checkout).
2. **Write the brief** with: the table (WBS, taskId, branch, manifest, writer -> reviewer, dependencies, editor), Base SHA, Why, Scope (numbered, each item testable), Out of scope, allowedPaths, Tests (gate commands; each new check shown failing under a mutant), Rules (tag, staging, push, FINAL SHA, one-paragraph report), the `lane.json` block. For a Gemini writer add a "How to work this lane" section (the lane-gq brief is the model). Settle every design question in the brief; a writer who finds an open question stops and mails.
3. **Open the lane** (section 3) and **launch the writer**.
4. **When the writer pushes:** read `git log --format='%h %an | %s' origin/main..origin/task/<lane>`, `git diff --stat`, and the REPORT.md. Check: authors match the tag; files inside allowedPaths; no whole-file rewrites; the report quotes real output. If something is wrong, mail the writer (or relaunch with a fix prompt: the lane-gl fix prompt pattern: name the review findings, what to change, what not to touch, commit tag, push, FINAL SHA).
5. **Launch the reviewer** with the prompt of section 6 (lane-gr makes the launcher generate it; until then write it from the template). The review runs in the lane worktree at the tip.
6. **Verify the review:** file present at the tip, full TIP hash inside, one VERDICT line, author `deus-<family>`, run record `newCommits >= 1` with `headCommit` = the review commit. REJECT: launch a writer fix run, then a new review of the new tip.
7. **Merge** through merge_gate; push main; record the merge in STATUS.md. If the gate refuses: read the reason code and the kept logs; a TEST_FAILED on a known flaky check (A13-1, A13-17) may be re-run once; any other refusal is a defect to fix in the lane.
8. **After the merge:** run the suites of the lanes that share files with the merged one against main (in a clone) when more than one lane touched the same area in the same hour: tip-only gating broke main four ways on 2026-10-01 (lane-gp fixed them; lane-gr makes the gate test the merge result).

## 5. State at the handoff (2026-10-02 ~02:30Z, main `d874e0be`)

| Lane | Task | Writer -> reviewer | State | Next step for you |
|---|---|---|---|---|
| gp | OPS.MAIN.GREEN (main's four red gates) | claude -> grok | MERGED `86a51589` | none |
| gq | NAT.02.01 nx1: pure connectivity kernel, fall plan, dirty queue | gemini (your agent) -> grok | open at `d9df5f7d`, no writer commits yet | your agent writes it per its brief; then launch the Grok review |
| gn | ART.GROUND.FIX: pin the ground-art check to `a5255704` | gemini -> codex | your tip `cd876aba` has the right 5-line fix but rewrote the file CRLF+BOM (MSG-138) | redo as a new commit (LF, no BOM), then launch the Codex review |
| dr | NAT.02.MASS part 4: reclaim and world items in centipounds | codex -> grok | writer run COMPLETED with 1 commit (02:2xZ); not yet reviewed | read the diff and REPORT.md; launch the Grok review; the brief still says "writer claude" in two lines (46, 121): ignore, the manifest says codex |
| gr | OPS.FLOW.CUT: gate on the merge result, parallel suites, flaky retry, hotfix class, launcher reviewer prompt, lane opener (DEC-087) | grok -> codex | writer running since 02:21Z | when pushed: Codex review; merge; then use `open_lane.ps1` and the generated reviewer prompts |
| dd | WG.CELL-WRITE part 3: lazy area generation, per-area checksums, `levels:areaGenerated` | grok -> codex | opened `d8acc310`, writer launched 02:27Z | review when pushed; the DEC-065 merge condition is met (Owner accepted 02:09Z) |
| dp | NAT.02.MASS part 3: ledger vocabulary, sinks, obsidian and peridotite | codex -> grok | opened `fb652c4e`, writer launched 02:27Z | review when pushed; dp merges after dr and re-pins `cpPins` after merging origin/main |
| nx2..nx5 | NAT.02.01 p3, NAT.02.01.BRIDGE, NAT.02.05, NAT.02.06 | per the re-plan (nx2 grok -> codex, nx3 claude -> grok, nx4 codex -> grok, nx5 claude -> codex) | not briefed | brief from `docs/design/COLLAPSE_REPLAN_DEC083.md` sections 5 to 8, in order, each after the one before merges; Claude writes nx3 and nx5 |
| fi | DEC-080 world-wide spawner and sky view | not assigned | brief to write | the sky view wants world-wide creature density at New Game: give it a cheap per-area spawn pass computed from the seed, without building terrain (DEC-065 stays) |
| folded | eo, ep, eq, fo, fr, fv, es, et, eu, ev, ew, fk, fq, fs, ft, fp | | folded by DEC-083 | nothing; fj (water pressure breaking dams) is held on Owner question 6 |

Other open items: AUDIT A13-17 (the zrange after-1,500-updates census is timing-sensitive: find the wall-clock or unseeded-random dependence in the sim path, or make the after-updates check a conservation check); the bestiary is pinned by the Owner (do not resume until he says); the Owner's water-art grades and the wide-body humanoid question are his; PixelLab subscription generations are spent until 2026-10-26 (credits remain); the Gemini CLI is dead on OAuth and the Gemini API project is over its monthly spending cap (Owner's call).

## 6. The reviewer prompt (template; lane-gr moves it into the launcher)

Replace the angle-bracket fields. Save it as a file and pass `-PromptFile`.

```text
Review <lane> (<taskId>: <one-line title>) on branch task/<lane>. Brief: tasks/<taskId>/<lane>/BRIEF.md. Manifest: tasks/<taskId>/<lane>/lane.json. Report: tasks/<taskId>/<lane>/REPORT.md. You are the designated reviewer (<tag>); the writer family is <writer>.

TIP = the output of `git rev-parse HEAD` in this worktree. Use its full 40-character hash in your review file and review exactly that commit. `git log --format='%h %an | %s' origin/main..HEAD` shows the lane's commits.

Check, and quote command output for each point:
1. Scope: `git diff --name-status $(git merge-base origin/main HEAD) HEAD` stays inside lane.json allowedPaths; no whole-file rewrites (line endings, BOM).
2. Each numbered Scope item of the brief is done at TIP: name the file and lines for each.
3. The new or changed tests run and pass; each named mutant turns its check red (run the lane's mutation commands and quote the counts). Do not re-run every gate command: merge_gate does that.
4. REPORT.md: every number in it matches output you produced; say what it overstates or omits.
<lane-specific points>
N. `git fetch origin` then `git merge-tree --write-tree origin/main HEAD` exits 0.

Write tasks/<taskId>/<lane>/review_<tag>_<first 8 hex of TIP>.md. It must contain the full TIP hash, each check with its evidence, findings graded BLOCKER, MAJOR or MINOR (minor findings above the verdict line), and a final line "VERDICT: CLEAN PASS", "VERDICT: PASS", "VERDICT: PASS WITH MINORS" or "VERDICT: REJECT".

Commit only that file (git add that one path), with the subject "[<tag>] <taskId> <lane> review: review_<tag>_<first 8 hex of TIP>.md (VERDICT: <verdict>)". Then push task/<lane> and end with FINAL SHA. Change no other file. Never start a command in the background. Commit before you end your turn: the review file must be committed by you, in this run.
```

Writer prompts: the launcher's generated default is enough for Codex, Grok and Claude (it names the brief, the tag, staging, push and FINAL SHA). A fix run after a REJECT gets a short prompt naming the findings (section 4 step 4).

## 7. How to work with the Owner

- He decides in chat, in his own words, often in one line. Record the words; do not paraphrase into a rule he did not state. When a line is ambiguous, ask one short question with the two readings.
- Report in plain text: what merged, what is running, what is blocked and why, what needs his word. No percentages of "operational", no "verified" without evidence you saw (AGENTS.md "Banned in reports").
- He grades art in game; tell him when `game/data/*.json` or `game/img/**` changed on main so he reopens the RMMZ project (Tilesets.json and many images changed on 2026-10-01).
- Pending Owner questions you may raise when he has time: the eight collapse questions in the re-plan (section 10), each running on its default; the water-art grades; the wide-body humanoids; whether AG may change the Codex model (no, unless he says so).

## 8. Usage pacing

Each provider has its own meter. Claude: metered weekly (section 1); use it for the lanes that need it and keep its sessions short. Codex: capped at `gpt-6-sol`; one or two concurrent writers. Grok: the main reviewer; it also writes. Gemini: your agent, your budget. When a provider is exhausted, its lanes wait; do not route a Claude lane to Gemini or Codex to save time if the brief needs engine knowledge.

## 9. Your first day

1. Read this file, `AGENTS.md`, `docs/OWNER_DECISIONS.md` DEC-085 to DEC-088, `tools/governance/MERGE_GATE.md`, `tools/ops/README.md`.
2. `git status` in the main checkout: only `?? tasks/PRUNE/`. `git config user.name`: `deus-ops`.
3. lane-gn: redo your fix as a new commit (LF, no BOM); launch the Codex review with the section 6 prompt; verify; merge.
4. lane-dr: read the diff and report; launch the Grok review; verify; merge.
5. lane-gq: your agent writes it per its brief (step by step; one commit per step is fine); then the Grok review.
6. Watch dd, dp, gr in telemetry; review each when pushed (dd and dp: Codex and Grok; gr: Codex); merge in the order dr, dp (re-pin), dd, gr.
7. After gr merges: switch to `open_lane.ps1` and the generated reviewer prompts; mark flaky tests `retryOnce` in their manifests (the zrange matter_unchanged check first).
8. Brief nx2 from the re-plan; open it (grok -> codex). Write the fi brief. Add a lanes table to `docs/STATUS.md`.
9. Report to the Owner once the above is in motion, in the format of section 7.

Claude's standing offer: when a lane needs engine judgment (a brief for nx3 or nx5, a re-plan, a ruling that touches `DEUS_Levels.js` or `DEUS_Fluid.js`), ask the Owner to point Claude at it; otherwise Claude is a writer like the others.
