# DEUS practical orchestration

Prepared 2026-09-28 for the Owner's bounded orchestration setup request. This guide creates no WBS leaf, lane, worker, provider entitlement, or merge authority.

## Start here

1. Open the existing DEUS project at `C:\Users\snewt\OneDrive\Desktop\UF`. Read `AGENTS.md` and the five `.agents/rules/deus-*.md` files. The rules use `trigger: always_on`. Keep them as immediate children of `.agents/rules/`; rules are project instructions, not a filesystem sandbox.
2. Reconstruct current state using the read-only commands below. Match each authorized assignment to its existing lane worktree and branch. Do not create another checkout for an active lane or accept Teamwork's default new project directory.
3. Confirm Owner approval, allowed paths, upstream dependencies, writer/reviewer families, exact writer SHA, gates, and evidence location before scheduling work. Preserve other writers' claims. The coordinator owns the shared status and routing records.
4. Select one bounded authorized task. Use native Teamwork for coordination and the existing external launcher for provider diversity. Use Goal for a finite implementation or verification objective. Neither grants authority to open work, certify it, or merge it.

The official [Rules documentation](https://antigravity.google/docs/rules/) confirms filesystem discovery and the required frontmatter. The [Projects documentation](https://antigravity.google/docs/projects/) explains worktree isolation. New Worktree Mode is appropriate only for a newly approved lane after checking for a suitable existing checkout. Existing worktrees do not inherit uncommitted main-checkout rules: explicitly include the current rules in the next approved lane prompt, or have the integrator distribute the reviewed rules through normal Git integration. Do not overwrite active worktrees to propagate them.

## Live state and protected files

From a PowerShell session in UF:

```powershell
git status --short --untracked-files=all
git rev-parse HEAD origin/main
git worktree list --porcelain
git for-each-ref --format='%(refname:short) %(objectname)' refs/heads/task/
Get-Process node,claude,grok,codex,gemini,Antigravity -ErrorAction SilentlyContinue |
    Select-Object ProcessName,Id,StartTime
```

`origin/main` here is a local remote-tracking ref, not a fresh server check. Before integration, the merge gate fetches and compares the remote. Process names alone cannot prove lane ownership: match PID **and start time** with the registry and lane logs; inaccessible process details remain unknown. Do not kill or restart unknown workers.

Inspect both registry locations before a launch:

```powershell
Get-Content -LiteralPath '.\docs\telemetry\sessions\active_workers.json' -Raw
Get-Content -LiteralPath '.\docs\telemetry\sessions\provider_status.json' -Raw
Get-Content -LiteralPath 'C:\Users\snewt\.deus_worktrees\logs\registry\active_workers.json' -Raw
Get-Content -LiteralPath 'C:\Users\snewt\.deus_worktrees\logs\registry\provider_status.json' -Raw
```

A missing file is not an empty registry. Stop duplicate-launch decisions until the coordinator identifies the lane's actual registry, log root, and process. Do not merge the registries or infer availability from an old reset time. In particular, depleted prepaid credits are not proven to recover at a guessed quota-reset timestamp.

Protect every pre-existing untracked/ignored path, including local art, references, saves, secrets, prompts, telemetry and worker output. The routing rule names the untracked paths found at setup. Never use blanket staging, cleanup, hard reset, worktree removal, or output overwrite to obtain a clean checkout. No art or engine-core edits belong to this setup.

## Reuse the existing provider interface

`tools/ops/launch_worker.ps1` already supports Claude, Grok, Codex, and Gemini. It checks lane locks, branch, brief, manifest scope and counterpart family; saves the prompt; records logs/PIDs; and reports quota/scope failures. Scope violations are detected after execution, so the whitelist is not a security boundary.

Do not add a second dispatcher. The old built-in provider arguments request unrestricted execution. Use explicit reviewed `-ProviderExe` and `-ProviderArgs` for new launches. `-ProviderArgs` bypasses the built-in effort selection too: include the authorized model and supported effort in those arguments, and do not combine it with the launcher's `-Effort`.

The live PM helpers are under `C:\Users\snewt\.deus_worktrees\logs\pm_ops`. `tools/ops/pm_launch/top_models.ps1` is a separate repository copy intended for installation after review/merge. This setup does not replace either or assume they have identical contents. The local `tools/ops/minimax_cli.js` remains protected and is not a supported fifth provider.

### Manual launch procedure

Only after the preflight above, populate this template from the existing approved assignment. Do not execute it with placeholder values. `launch_worker.ps1` has no plan-only flag: invoking it starts work and writes lane evidence. The template deliberately leaves provider availability and current model choice to the coordinator.

```powershell
$repo = 'C:\Users\snewt\OneDrive\Desktop\UF'
$lane = '<existing-approved-lane>'
$worktree = '<absolute-existing-lane-worktree>'
$branch = '<existing-approved-branch>'
$brief = '<absolute-existing-BRIEF.md-inside-that-worktree>'
$prompt = '<absolute-reviewed-prompt-inside-that-worktree>'
$expectedSha = '<full-current-approved-writer-or-resume-SHA>'
$registry = '<this-lane-current-active_workers.json>'
$providerStatus = '<matching-provider_status.json>'
$logRoot = 'C:\Users\snewt\.deus_worktrees\logs'
$provider = '<claude|grok|codex|gemini>'
$role = '<writer|reviewer>'
$providerExe = '<verified-native-executable-or-node.exe>'
$providerArgs = '<reviewed-CLI-arguments-from-the-table-below>'
$stdinPrompt = $true # false for Grok's prompt-file interface

$actualBranch = & git -C $worktree branch --show-current
if ($LASTEXITCODE -ne 0 -or $actualBranch -ne $branch) { throw 'Branch mismatch' }
$actualSha = & git -C $worktree rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $actualSha -ne $expectedSha) { throw 'HEAD changed; re-check assignment' }
if (-not (Test-Path -LiteralPath $providerExe -PathType Leaf)) { throw 'Provider executable missing' }
if (-not (Test-Path -LiteralPath $prompt -PathType Leaf)) { throw 'Reviewed prompt missing' }

& "$repo\tools\ops\launch_worker.ps1" `
    -Lane $lane -Provider $provider -Role $role `
    -Worktree $worktree -BriefPath $brief -PromptFile $prompt `
    -ResumeFromSha $expectedSha -TimeoutMinutes 240 -NoCommitPrompt `
    -RegistryPath $registry -ProviderStatusPath $providerStatus -LogRoot $logRoot `
    -ProviderExe $providerExe -ProviderArgs $providerArgs `
    -ProviderStdinPrompt:$stdinPrompt
"EXIT=$LASTEXITCODE"
```

`-NoCommitPrompt` still saves a prompt file; it prevents the launcher from inserting an extra commit, especially important for a reviewer pinned to a writer SHA. Keep reviewer-launch prompts as uncommitted local evidence through integration, or preserve a copy outside the branch. If a prompt must be committed, its authorized owner commits it **before** selecting the review target and the reviewer reviews that resulting SHA. Never append a prompt commit after the verdict or include it in the review commit: the gate requires the review at branch tip and exactly one review file in that commit. A recovery SHA is informational to the launcher; the explicit HEAD check above is therefore required. The prompt must include current governance text, exact scope and stop conditions. It must not permit manifest edits, self-review or new lanes.

CLI options below were checked against locally installed help on 2026-09-28; live authentication, quota, sandbox setup and model execution were **not** tested. Replace MODEL/EFFORT with the current approved values. Recheck installed `--help` if a version changes. Permission prompts may require an attended session; never solve a blocked run by silently enabling unrestricted execution.

| Provider | Executable / arguments | Prompt |
|---|---|---|
| Claude | Native `claude.exe`; `-p --output-format stream-json --verbose --permission-mode manual --model MODEL --effort EFFORT` | stdin |
| Grok | Native `grok.exe`; `--permission-mode default --model MODEL --reasoning-effort EFFORT --prompt-file {promptFile}` | file; set stdin false |
| Codex | `node.exe`; quote the installed `@openai/codex/bin/codex.js` path, then `exec --sandbox workspace-write --json -m MODEL -c model_reasoning_effort=EFFORT -` | stdin |
| Gemini | `node.exe`; quote the installed `@google/gemini-cli/dist/index.js` path, then `--sandbox --approval-mode default --model MODEL --output-format stream-json --prompt "Read the complete lane assignment from stdin."` | stdin |

The launcher expands `{promptFile}` and quotes its path itself; do **not** add another pair of quotes around that token. Standard local npm paths are beneath `$env:APPDATA\npm\node_modules`; confirm them using `Test-Path` before launch. Resolve Node with `(Get-Command node.exe -CommandType Application).Source`. Gemini's required HIGH thinking must be confirmed in the lane's installed CLI configuration before launch; this table does not set that configuration. Grok's default permission mode is not a claim of OS sandboxing. Codex's workspace sandbox and stdin use are also documented in [non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) and the [CLI command reference](https://learn.chatgpt.com/docs/developer-commands?surface=cli).

### Manual failover

1. Capture the provider error and real exit status, branch/HEAD, uncommitted changes, logs, model/effort and any observed retry time. Confirm the old writer and child jobs have stopped; preserve their evidence and lock provenance.
2. Check current availability and DEC-032/034/035 routing. Continue another already approved unblocked lane while waiting if possible. Do not add a lane to occupy capacity.
3. Before changing family, the coordinator reconciles the manifest and reviewer assignment against **every contributor** to the implementation. Preserve history; never relabel an unsupported provider or impersonate a reviewer. A same-family reviewer makes that route ineligible. Missing eligible reviewers means hold.
4. Prepare a fresh provider-specific prompt in the existing authorized lane, citing the checkpoint SHA and instructing the new writer to read the diff before editing. Use the shared launch template with that lane's original registry/log root and explicit model/effort. Do not reuse a prompt that assumes the former provider's identity.
5. Re-run gates and obtain independent review of the resulting writer tip. Restore preferred routing only after observed recovery; never rewrite the provider credited for prior work.

`resume_queue.ps1 -AllowFailover` is not the recommended route for this setup: it does not reconcile manifest roles, contributor history, explicit model/effort arguments, or new approval boundaries. Even its `-DryRun` may touch lane locks. Do not install a schedule or poll real providers as part of this setup.

## Teamwork and Goal prompts

[Teamwork](https://antigravity.google/docs/teamwork/) is documented for paid Antigravity 2.0/CLI plans; availability in this installed session is unverified. Inspect its prepared plan before execution: retain the approved existing directory, branch and whitelist, and reject proposed new lanes until Owner approval. Its implementation/review roles do not establish different model families. The documented [custom-agent schema](https://antigravity.google/docs/subagents/) has model tiers `inherit`, `flash`, and `pro`, not arbitrary provider names. Do not invent provider YAML or depend on the legacy `define_subagent` examples in the existing specialist skill without verifying local support. Keep durable DEUS work out of temporary subagent worktrees that the platform may clean up.

Fill the placeholders, then use this bounded Teamwork request:

```text
/teamwork-preview Continue only Owner-approved task <ID>, lane <LANE>, branch <BRANCH>, existing worktree <PATH>. Read AGENTS.md and the five current .agents/rules/deus-*.md rules from the DEUS canonical checkout; include their full constraints in each delegated brief. Verify live state and ownership first. Work only on <ALLOWED PATHS>, with <UPSTREAM CONTRACTS> satisfied and gates <COMMANDS>. Coordinate existing assignments toward Lean Natural World v1. Do not open new WBS leaves or lanes, modify art or engine core, replace worktrees, or run duplicate writers. Require an independent model-family review of writer SHA <SHA> by <REVIEWER FAMILY>; native same-family review is advisory. Stop at missing authorization, dependency, provider or review gates. Report evidence and blockers. Only the authorized integrator may use merge_gate and its --no-ff merge after all checks pass.
```

Use [Goal](https://antigravity.google/docs/slash-commands/) for an individual finite assignment:

```text
/goal In the existing approved <LANE> worktree <PATH> on <BRANCH>, complete only <BOUNDED ACCEPTANCE CRITERIA> for <TASK ID> within <ALLOWED PATHS>. Read AGENTS.md, the five current DEUS rules, the brief and manifest before editing. Follow the Natural World dependency chain, DEC-007 and DEC-037. Run <GATE COMMANDS>, record real exits and writer SHA, and prepare evidence for independent <REVIEWER FAMILY> review. Do not self-certify, open work, change scope, touch art/engine core, merge or push main. Pause at the first missing authority or unsatisfied gate; report completion of this bounded objective without claiming WBS closure.
```

Goal is not a 24/7 service. Stop at the objective or a governance boundary; no scheduler/watchdog is needed. A running CLI prompt is fixed at launch, so file edits do not update an in-flight worker's instructions.

Where the installed Windows UI offers them, the [sandbox settings](https://antigravity.google/docs/sandbox) are **Settings -> Projects -> DEUS -> Enable Sandbox Mode: Enabled**, with **Terminal Command Auto Execution: Proceed in Sandbox**. These settings were documented, not changed or verified in the app. Do not select unrestricted execution to avoid prompts.

## Mandatory game translation

Every lane brief/completion report and future WBS proposal must use `tools/ops/GAME_TRANSLATION_TEMPLATE.md` under `.agents/rules/deus-game-translation.md`. Include the full code/state/RMMZ/player-world/persistence/proof chain, classify direct/world/foundational effects, name consumers, report all six bridge statuses honestly, and distinguish headless tests from in-game proof. Every overnight report includes GAME TRANSLATION STATUS. Reviewers/integrators check these before completion and reference them in merge evidence; the existing merge_gate does not parse or automatically enforce these new Markdown fields. Missing bridges stay explicit gaps and never authorize new scope.

## Review, merge, and acceptance

DEC-035 requires all manifest gate tests on the writer tip in a fresh isolated clone before Gemini review. The independent reviewer uses the exact writer SHA, matches the manifest, and records one review artifact/commit at branch tip in the form required by `tools/governance/MERGE_GATE.md`. Changes after review require another review. Native helper reviews are additional evidence, not independent-family certification.

Only the authorized integrator runs the following from UF, substituting the existing approved lane/task/branch:

```powershell
node tools/governance/merge_gate.js --lane <LANE> --manifest tasks/<TASK>/<LANE>/lane.json --branch <BRANCH> --dry-run
"EXIT=$LASTEXITCODE"
# Only after PASS, unchanged refs, and all independent approvals:
node tools/governance/merge_gate.js --lane <LANE> --manifest tasks/<TASK>/<LANE>/lane.json --branch <BRANCH>
"EXIT=$LASTEXITCODE"
```

The second command performs `git merge --no-ff`; it never pushes. A dry run fetches and executes gate tests. Never replace a refusal with a manual merge or delete protected local files to satisfy cleanliness. Stage/commit only the assigned files in an approved lane; do not commit this setup directly on main simply to work around review.

Setup inspection found the DEC-037 decision-log gap, stale status/model availability entries, separate telemetry registries and unrestricted launcher defaults. The proposed nine-file change was also checked in an isolated preview with `check_claims.js --pre-commit --agent codex`: evidence, self-certification and WBS checks passed, but the existing single-writer whitelist rejected all nine paths because the currently registered Codex lanes do not own this setup scope. The Owner's request authorizes these working-copy configuration edits; it does not make the existing machine whitelist pass. Do not widen a lane, spoof the agent, install hooks, or bypass the checker to commit them. These are explicit handoff items, not secretly repaired records. Tests of scripts and document structure do not demonstrate authenticated provider execution, Antigravity rule loading in the UI, or independent review. This setup must stay uncommitted and unmerged until the coordinator records an Owner-approved scope and obtains independent review; it grants no permission to create that scope automatically.
