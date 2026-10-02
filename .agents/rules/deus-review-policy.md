---
trigger: always_on
description: "DEUS zero self-certification, independent family review, and fail-closed integration."
---

# Review and integration

- **DEC-089 Modification:** Mandatory cross-family LLM review is dropped for non-core logic. If a lane passes merge_gate.js tests and scope checks, it is eligible for merge. For core logic requiring architectural review, the reviewer does not need to re-run tests; merge_gate.js is the sole test enforcer.
- **Zero self-certification (Core Logic):** an implementer cannot approve their own work, directly or through another instance of the same model family. Native Teamwork review and a Codex subagent review do not by themselves prove cross-family independence.
- Record actual provider, model family, role, reviewed writer SHA, review artifact/commit, test commands, real exit codes, and timestamps. A reviewer forms the first verdict from the actual diff and independent evidence. Test output alone is not a review verdict.
- Follow DEC-035: run every manifest gate test on the writer tip in a fresh isolated clone before Gemini review. Failing tests return to the writer/fix pass; never manufacture PASS evidence. Re-review after implementation changes.
- A WBS closure requires an independent closure verdict recorded before the coordinator's completion edit. Never backdate, impersonate a reviewer, or change a manifest to make one's own work count as reviewed.
- The authorized integrator runs `node tools/governance/merge_gate.js --lane <lane> --manifest tasks/<task>/<lane>/lane.json --dry-run`, then the same gate without `--dry-run` only after all checks pass. The gate performs `git merge --no-ff`; do not bypass it with a direct merge, cherry-pick, squash, forced PASS, or mutant switches. The gate's dry run fetches refs and executes tests; it is not an offline inspection.
- Check `main`, lane tips, remote state, and local changes again before integration. Preserve protected untracked files even if a cleanliness check refuses. A gate refusal is a blocker to resolve through the coordinator, never permission to delete local files or weaken checks. Only the authorized integrator pushes main after inspecting the merge.
- Record factual outcomes and unresolved defects. No eligible independent reviewer means hold for review; keep useful in-scope work moving where possible.
