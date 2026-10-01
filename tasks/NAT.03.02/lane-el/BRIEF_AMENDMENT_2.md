# lane-el (NAT.03.02) brief amendment 2: the F5 acceptance is no regression (PM ruling, 2026-10-01)

**Trigger.** The braintrust answerability check ANSWER-EL (Grok Heavy, 2026-10-01) answered MERGE: NO for one reason: the brief's F5 acceptance says `--suite natural_connections` PASSes including every in-game check, and it does not. The lane's own evidence shows why:
- seed 7, base (`evidence/f5_base_seed7/results.txt`) and tip (`evidence/f5_tip_seed7/results.txt`): 11 passed, 4 failed, the **same four** at both: `dry_supported_landings`, `invalid_f6_keeps_order`, `reverse_traversal`, `keyboard_order_moves_unit`;
- seed 20260919: `generated_chain` fails at the base and at the tip (`evidence/f5_base_natural_connections_seed20260919.txt`, `evidence/f5_tip_natural_connections_seed20260919.txt`), so the liquid checks do not run on that seed.
None of these is caused by this lane, and none is in its scope (retire the private water store; amendment 1: passages are not drains). AGENTS.md Rule 1 keeps unrelated fixes out of a lane.

**Ruling (PM, DEC-058): the brief's F5 acceptance is replaced by:**
1. On a seed whose world generates a natural chain (seed 7 in the evidence), the rewritten liquid checks `liquid_present_at_entrance` and `liquid_flow_through_connection` PASS at the tip, and the snapshot mutants `mint_into_fluid` and `isWater_ignores_levels` turn them red (`evidence/f5_tip_mutants_seed7.txt`).
2. No in-game check that passes at the base fails at the tip on the same seed (base and tip results recorded side by side), and `no_errors` passes at the tip.
3. The pre-existing failures above are recorded by the PM as a known defect in `docs/STATUS.md` (tracked defects). Fixing them needs its own lane; they do not block this lane.

**Unchanged:** amendment 1 and everything else in the brief.
