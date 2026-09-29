---
trigger: always_on
description: "DEUS authority, Owner approval, art freeze, engine protection, and lane isolation."
---

# DEUS authority and isolation

Read `AGENTS.md`, current Owner instructions, `docs/OWNER_DECISIONS.md`, and `docs/CANONICAL_ROLES.md` before work. This supplement records the Owner's orchestration request of 2026-09-28; newer explicit Owner instructions prevail over older role tables and briefs.

- **DEC-007:** no art generation, generator requests, or integration of newly generated art without direct Owner involvement, except generation under the Owner's 2026-09-29 PixelLab opening: OBJECTS and MAPS tools only, to complete the natural world; no Creator or Character prompts; catalogue record first, prompt per `docs/art/DEUS_ASSET_STANDARD.md`, QA vetting and then Owner sign-off (Claude presents the asset) before it enters the game (see the `AGENTS.md` banner and `docs/OWNER_DECISIONS.md` DEC-007). Older autonomous art mandates stay suspended. Evidence renders are not art. This orchestration assignment must not modify any art.
- Engine core is read-only: `game/js/rmmz_*.js`, `game/js/main.js`, `game/js/libs/**`. This setup does not authorize runtime edits.
- Obtain explicit **Owner approval before opening any new WBS leaf or lane**, widening an existing lane, or starting the next slice. A backlog row, proposed plan, free provider, Teamwork task, or Goal is not approval. Continue only an already authorized scope.
- Gemini / Antigravity remains the coordinator and integration authority. Workers do not change WBS status, certify completion, merge to main, or push without the current explicit routing/push authorization.
- One writer per file set; use the approved branch, existing lane worktree, brief, manifest, and whitelist. Verify ownership against live Git and process evidence. Keep reviews read-only until the writer has stopped; never run two writers in one lane.
- Preserve every existing worktree and active lane. Do not reset, stash, rebase, delete, prune, recreate, migrate, or repurpose another lane. Unknown ownership means hold the overlapping action and report it.

Operating steps: `tools/ops/ANTIGRAVITY.md`. Mandatory companion rules: `deus-review-policy.md`, `deus-natural-world.md`, and `deus-multiagent-routing.md` in this directory.
