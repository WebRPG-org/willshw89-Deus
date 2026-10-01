---
trigger: always_on
description: "DEUS provider failover, protected local work, and bounded Teamwork/Goal operation."
---

# Routing, preservation, and bounded autonomy

- Reconstruct live state at session start and after every merge: main/remote refs, lane branch tips, manifests, reviews, Git status including untracked files, worktrees, actual worker PID/start times, and provider evidence. Old status tables and predicted reset times are hints, not proof of availability.
- Use `tools/ops/launch_worker.ps1` as the existing common interface for Claude, Grok, Codex, and Gemini. Keep each lane's actual registry and log locations explicit. Do not add a parallel dispatcher, scheduler, watchdog, or autonomous relaunch loop for this setup.
- Follow DEC-032, DEC-034, and DEC-035 plus newer Owner routing. Preserve task quality and provider-native effort floors. Flash final review is conditional on Pro being unavailable; a historical quota-reset timestamp is not current evidence. Do not downgrade hard logic to a cheap model just to stay busy.
- On quota, rate limit, or provider failure: checkpoint the existing lane's SHA/diff, evidence, exact error, provider/model/effort, and observed retry time; establish that its writer has stopped before relaunch. Never spin retries or use failover to bypass permissions or Owner approval.
- A fallback must be available, authorized for the role, and independent of the lane's reviewer/writer as appropriate. The coordinator reconciles manifest roles and records provenance before relaunching the same bounded lane. Never rewrite prior authorship. Work authored by multiple families needs an eligible independent reviewer for the full change.
- Main is touched only by merges and the PM (DEC-085, 2026-10-01). Mail is local files, never committed (`docs/agents/mailboxes/**/*.jsonl` are gitignored); no mail windows; tooling changes go through a reviewed lane, never straight to main. merge_gate may run at any time.
- Each provider may hold several lanes at once, writing some and reviewing others (DEC-078, 2026-10-01). Launch every ready lane; lanes that run together must not share files. The braintrust is dropped for now (DEC-079): no consult or braintrust check gates a launch or a merge.
- MiniMax is temporarily re-enabled until the subscription runs out (DEC-084, 2026-10-01, suspends DEC-076). It may be launched as a worker. GPT-OSS and other providers are manual-only until a reviewed adapter and family mapping exist. Do not relabel them as one of the four supported providers to pass a gate. OpenAI is capped at gpt-6-sol, ultra effort (DEC-077). Same-family subagents may assist; they cannot supply independent cross-family certification.
- Protect all pre-existing untracked/ignored files, art, reference installs, saves, credentials, local prompts, telemetry, worker logs and process outputs. In particular preserve `art/sprites/`, `tasks/NAT.02.01/`, `tasks/NAT.05.01/`, `tasks/WG.00.41/`, `tasks/prompt_cline_minimax.txt`, `tools/ops/minimax_cli.js`, both NAT preflight documents, `tools/test_shadow_check_wg0041.js`, and `docs/telemetry/sessions/provider_status.json`. Never blanket-stage or clean the checkout. Preserve external `.deus_worktrees`, `.deus_pm`, and `pm_ops` data.
- `/teamwork-preview` and `/goal` are bounded execution aids, not new authority. Bind them to an approved existing worktree, branch, task, whitelist and acceptance commands. Pause at missing Owner approval, unmet dependencies, unavailable independent review, or completion. Carry the full current rules into old worktrees before a new session; never assume a main-checkout edit propagated to another worktree.

Exact handoff and launch procedure: `tools/ops/ANTIGRAVITY.md`.
