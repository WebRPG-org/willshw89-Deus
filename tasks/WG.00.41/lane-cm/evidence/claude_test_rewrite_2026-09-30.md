# lane-cm test rewrite: evidence (Claude, 2026-09-30)

Test: tools/test_deep_cuts_and_mountain_cap_wg0041.js (rewritten to answer the braintrust findings on 26f6969d).
Code under test: DEUS_Levels.js at lane-cm HEAD 26f6969d, run in a snapshot copy (git archive HEAD game/js game/data tools,
plus the rewritten test), because the worktree holds an uncommitted line that is not Claude's (bs[0].deepCuts made
non-enumerable, 08:39) and AG was running tests in the worktree at the same time.

## Plain run (node tools/test_deep_cuts_and_mountain_cap_wg0041.js)
```
PASS no_rock_z12_to_z15_seed_18 - seed 18: 0 strata other than air on +12..+15 in the start area (want 0)
PASS no_rock_z12_to_z15_seed_3 - seed 3: 0 strata other than air on +12..+15 in the start area (want 0)
PASS no_rock_z12_to_z15_seed_21 - seed 21: 0 strata other than air on +12..+15 in the start area (want 0)
PASS no_rock_z12_to_z15_seed_4 - seed 4: 0 strata other than air on +12..+15 in the start area (want 0)
PASS highlands_reached - highest natural solid level per seed: 18: +11, 3: +11, 21: +11, 4: +11 (want the highest between +7 and +11, none above +11)
PASS deep_cuts_to_bedrock - seed 18: 75 deep cuts (75 before), 73 over no core fluid, 73 carved to bedrock with four open strata (8 ft) above it; problems 0
PASS deep_cuts_core_opening - seed 18: 73/73 unguarded cuts open through the core from fromE-1 to -2 S0; obstructing strata 0
PASS deep_cuts_fluid_guard - seed 18: 2 cuts sit over core water or lava (decided before the pass); 2 left exactly as they were from -16 to +2, 0 changed
PASS same_seed_determinism_32_layers - 32 levels byte-identical across two fresh VMs
PASS cross_world_default_host - seed 18 inside a seed-3 default-range host, 15 levels: all match the fresh world
PASS cross_world_legacy_host - seed 18 inside a seed-3 legacy-range host, 15 levels: all match the fresh world

RESULT: 11 passed, 0 failed (exit 0)
exit 0
```

## Mutant sweep (node tools/test_deep_cuts_and_mountain_cap_wg0041.js --mutants)
```
BASELINE clean: exit 0, no failures
CAUGHT roof_stretch_to_15 - exit 1; designated failures: no_rock_z12_to_z15_seed_18, no_rock_z12_to_z15_seed_3, no_rock_z12_to_z15_seed_21, no_rock_z12_to_z15_seed_4, highlands_reached
CAUGHT no_stretch - exit 1; designated failures: highlands_reached
CAUGHT deep_cuts_skipped - exit 1; designated failures: deep_cuts_to_bedrock, deep_cuts_core_opening
CAUGHT core_opening_skipped - exit 1; designated failures: deep_cuts_core_opening
CAUGHT fluid_guard_removed - exit 1; designated failures: deep_cuts_fluid_guard
CAUGHT per_vm_random_roll - exit 1; designated failures: same_seed_determinism_32_layers, cross_world_default_host, cross_world_legacy_host
CAUGHT host_seed_leak - exit 1; designated failures: cross_world_default_host, cross_world_legacy_host

MUTANTS: 7/7 caught (each by its designated checks only)
exit 0
```
