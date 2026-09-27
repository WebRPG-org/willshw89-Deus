# Lane AN report — DEUS-TSK-COMBAT-U7

Writer: grok. Reviewer: gemini (not this run). This file records what was built and the gate output. It is not a certification.

Branch `task/lane-an`. Implementation commit `7588239f067232fc66655a37148148e274a881a9`. `game/js/plugins.js` and `game/js/plugins/DEUS_Core.js` were not edited. No art or audio was generated. No WBS id was minted.

## What landed

On-map real-time combat with pause, in `game/js/sim/combat_rt` (headless) and three plugins: `DEUS_Move8`, `DEUS_CombatRT`, `DEUS_CombatUI`. Attack rolls, damage, saves, initiative and death saves go through `UF.Rules`. Fortress and hero mode share one clock, one dice stream and one order queue. A mode switch does not clear that state and does not open a battle scene.

`DEUS_Combat.js` has two hooks. `resolveAttack` calls `UF.CombatRT.noteResolved` when the bus exists, and the legacy tick returns immediately while `ownsCombat()` is true. With `DEUS_COMBAT_RT_PRESENTATION=1`, `DEUS_Combat` attaches the bus itself so a benchmark process can present swings without a `plugins.js` edit. The SRD proof was run without that variable.

System notes: `docs/systems/DEUS_CombatU7.md`.

## Registration request

Load after the plugins named here. Parameters are empty. Do not enable these until this request is applied.

```json
{
  "name": "DEUS_Move8",
  "status": true,
  "description": "[DEUS Move8] Eight-direction character steps on the square tile grid. Diagonal 3 px per axis, walk 4 px, run 6 px.",
  "parameters": {},
  "loadAfter": "DEUS_Movement8D"
}
```

```json
{
  "name": "DEUS_CombatRT",
  "status": true,
  "description": "[DEUS CombatRT] On-map real-time combat with pause. Resolution stays in UF.Rules.",
  "parameters": {},
  "loadAfter": "DEUS_Combat"
}
```

```json
{
  "name": "DEUS_CombatUI",
  "status": true,
  "description": "[DEUS CombatUI] Fortress and hero controls on the map screen. Tab switches layers.",
  "parameters": {},
  "loadAfter": "DEUS_CombatRT"
}
```

## Open (not decided here)

- The 3 px diagonal step is the item 43 PM proposal, used as the plugin default.
- An unarmored wizard, sorcerer, warlock, cleric, druid or bard uses the robe armor state. That class list is a PM default.
- Javelin, dart, sling and net have no attack clip.
- Other one-handed melee weapons use `ATK_1H`. The drawn weapon in that clip is the one-hand sword with no shield. `ATK_1H_SHIELD` is retired.
- The selected-unit panel shows the class name. It does not add a portrait.
- `UF.Rules.attack` refuses a weapon attack whose Z values differ. This lane applies no damage for that swing. A cross-Z weapon hit would be a rules change (`game/js/sim/rules` is read-only here). Cross-layer spells use `UF.Rules.savingThrow` and `UF.Rules.damage` on the target's layer.
- Whether a Z difference should add to range is open. Horizontal distance is 5-5-5 and ignores Z.
- Cosmetic knockback is 1 px from 8 damage and 2 px from a critical or from 15 damage. The grid moves only when the order names forced movement.
- Item 27 names 3× on 1440p and 4K. The "at least 20 tiles" rule yields 2× at 2560 px wide and 4× at 3840. This lane uses the 20-tile rule.
- The low-hit-point circle turns on at half hit points.
- Companion heal rolls `1d4` plus Wisdom, out to 60 feet, through the rules dice helper.
- Layers are the merged world range, -16 through 15. This lane does not re-decide that split.

## Proposed follow-up

`PROPOSED-AN-01` — if cross-Z weapon attacks should hit, that belongs in `UF.Rules`, not in this presentation layer.

## Gate: node tools/combat_rt/test_combat_rt.js

```
PASS clock_6s_speed_pause
PASS clock_6s_speed_pause_mutant_killed
PASS seeded_rng_matches_rules_dice
PASS seeded_rng_matches_rules_dice_mutant_killed
PASS deterministic_both_modes
PASS deterministic_both_modes_mutant_killed
PASS same_seed_replay
PASS same_seed_replay_mutant_killed
PASS mode_switch_keeps_combat_state
PASS mode_switch_keeps_combat_state_mutant_killed
PASS orders_survive_switch
PASS orders_survive_switch_mutant_killed
PASS rules_hit_changes_hp
PASS rules_hit_changes_hp_mutant_killed
PASS cross_layer_fight
PASS cross_layer_fight_mutant_killed
PASS companion_behaviours
PASS companion_behaviours_mutant_killed
PASS weapon_clips_no_shield_anim
PASS weapon_clips_no_shield_anim_mutant_killed
PASS armor_state_and_class_off_map
PASS armor_state_and_class_off_map_mutant_killed
PASS frames_dirs_strike
PASS frames_dirs_strike_mutant_killed
PASS knockback_cosmetic
PASS knockback_cosmetic_mutant_killed
PASS forced_move_changes_grid
PASS forced_move_changes_grid_mutant_killed
PASS eight_way_facing
PASS eight_way_facing_mutant_killed
PASS footprints_and_size_frames
PASS footprints_and_size_frames_mutant_killed
PASS distance_555
PASS distance_555_mutant_killed
PASS range_markers_whole_squares
PASS range_markers_whole_squares_mutant_killed
PASS move8_pixels_and_corners
PASS move8_pixels_and_corners_mutant_killed
PASS death_pose
PASS death_pose_mutant_killed
PASS miss_is_zero_and_uncoloured_hit
PASS miss_is_zero_and_uncoloured_hit_mutant_killed
PASS damage_colours
PASS damage_colours_mutant_killed
PASS condition_overlay_not_a_clip
PASS condition_overlay_not_a_clip_mutant_killed
PASS layer_range_32
PASS layer_range_32_mutant_killed
PASS multi_layer_selection
PASS multi_layer_selection_mutant_killed
PASS squad_behaviour
PASS squad_behaviour_mutant_killed
PASS ui_layers_skin_markers_scale
PASS ui_layers_skin_markers_scale_mutant_killed
PASS integer_scale
PASS integer_scale_mutant_killed
PASS hero_switch_pause_to_target_camera
PASS hero_switch_pause_to_target_camera_mutant_killed
PASS plugins_attach
PASS plugins_attach_mutant_killed
PASS combat_hook_present
PASS combat_hook_present_mutant_killed
PASS sources_have_no_generator_or_live_shield_clip
PASS sources_have_no_generator_or_live_shield_clip_mutant_killed
RESULT: 64 passed, 0 failed
```

Exit code 0.

## Gate: node tools/test_srd_combat_proof.js

```
--- Running SRD 5.1 Combat Proof Suite (Mutant: false) ---

[Proof 1] Weapon Key Mapping & Armor Class Integration
PASS: Long sword maps to SRD longsword
PASS: Short bow maps to SRD shortbow
PASS: Iron dagger maps to SRD dagger
PASS: Natural stab attack maps to bite
PASS: Natural slash attack maps to claws
PASS: Null weapon profile maps to unarmed
PASS: Unarmored unit AC is 10 + 3(Dex) = 13
PASS: Chain mail unit AC is 16
PASS: Plate armor + Shield AC is 18 + 2 = 20

[Proof 2] SRD 5.1 D20 Attack Roll Resolution vs AC
PASS: Attack roll 10 + 5 = 15 vs AC 16 misses
PASS: Damage on miss is 0
PASS: Defender HP unchanged after miss
PASS: Attack roll 11 + 5 = 16 vs AC 16 hits
PASS: Damage dealt on hit: 8
PASS: Defender HP reduced to 22

[Proof 3] Critical Hits & Fumbles
PASS: Natural 20 automatically hits
PASS: Natural 20 flagged as critical hit
PASS: Critical hit rolled damage >= 5 (got 19)
PASS: Natural 1 is an automatic miss (fumble)
PASS: Natural 1 flagged as fumble
PASS: Fumble deals 0 damage

[Proof 4] Same-Z Invariant Enforcement
PASS: Cross-Z attack is strictly rejected
PASS: Cross-Z attack flagged with sameZViolation
PASS: Defender on different Z suffers 0 damage

[Proof 5] Conditions Integration (Prone & Paralyzed)
PASS: Defender has prone condition
PASS: Melee attack against prone defender has Advantage
PASS: Defender has paralyzed condition
PASS: Attack hits paralyzed defender
PASS: Attack within 5 ft against paralyzed defender automatically crits

[Proof 6] Event Emission & Hitsplat Values
PASS: combat:hit event was emitted
PASS: Event specifies correct attacker
PASS: Event specifies correct target
PASS: Event damage matches resolution damage
PASS: Event hit flag is true
PASS: Event contains d20 roll

[Proof 7] Unit Death at 0 HP
PASS: Lethal attack hits
PASS: Lethal attack reports target killed
PASS: Target HP reduced to exactly 0
PASS: Target marked dead
PASS: combat:kill event was emitted

[Proof 8] Commoner default and unmapped species
PASS: A combatLevels-only unit resolves as a Commoner ()
PASS: Commoner hit points are 4, not the combatLevels pool (4)
PASS: A species with no SRD creature fails loudly (NO_SRD_MAPPING)

Results: 43 passed, 0 failed
SRD Combat Proof Suite PASSED (100%).
```

Exit code 0. Assertions were not weakened.

## Gate: node tools/check_deus_syntax.js

```
Checked 55 DEUS plugin files. Errors: 0
```

Exit code 0.

## Lane AH benchmark (report, not a gate)

Command: `node tools/bench_combat_srd.js --runs 1 --seconds 30 --mode both` with `DEUS_COMBAT_RT_PRESENTATION=1`. Measured tree `7588239f`. Exit code 0. The harness checks passed (6/6). Frame-time targets were missed on this machine in every phase, including the two base phases where SRD resolution is off, so the miss is not isolated to the presentation hook. SRD sim medians stayed under 0.2 ms.

```
=== bench_combat_srd: mode both, 30s phases, 1 run(s), 7588239f ===
  run 1: BENCH base_day_30s: 342 frames, median 74.615 ms (13.402 fps), sim 0 ms, render 4.5 ms, fullScans 0
  run 1: BENCH base_night_30s: 264 frames, median 96.955 ms (10.314 fps), sim 0 ms, render 4.33 ms, fullScans 0
  run 1: BENCH srd_day_30s: 278 frames, median 86.6 ms (11.547 fps), sim 0.185 ms, render 4.58 ms, fullScans 0
  run 1: BENCH srd_night_30s: 289 frames, median 75.665 ms (13.216 fps), sim 0.13 ms, render 4.645 ms, fullScans 0
  run 1: PASS bench_combat_srd.zero_per_frame_full_scans - fullScans 0 over 2417 driver frames, maxDue 23 of 221
  run 1: PASS bench_combat_srd.srd_stat_blocks - 221 units, 13 stat blocks, combatLevels 0
  run 1: PASS bench_combat_srd.stat_block_resolution - rules 4205 fromStatBlock 4205 hostErrors 0
  run 1: PASS bench_combat_srd.sim_and_render_split - base_day_30s sim 0 render 4.5; base_night_30s sim 0 render 4.33; srd_day_30s sim 0.185 render 4.58; srd_night_30s sim 0.13 render 4.645
  run 1: PASS bench_combat_srd.bench_finished - 4 phase(s)
  run 1: PASS bench_combat_srd.no_errors - none
  run 1: RESULT: 6 passed, 0 failed (exit 0)
  run 1: machine load quiet: CPU median 17.4 % (min 10.1, max 41.2); AI workers 3 -> 3; other nw.exe 0 / max 0
  run 1 base_day_30s frame median 74.615 ms (13.402 fps, target missed) sim 0 ms render 4.5 ms fullScans 0
  run 1 base_night_30s frame median 96.955 ms (10.314 fps, target missed) sim 0 ms render 4.33 ms fullScans 0
  run 1 srd_day_30s frame median 86.6 ms (11.547 fps, target missed) sim 0.185 ms render 4.58 ms fullScans 0
  run 1 srd_night_30s frame median 75.665 ms (13.216 fps, target missed) sim 0.13 ms render 4.645 ms fullScans 0
  run 1 resolution fullScans 0 maxDue 23 / 221 fromStatBlock 4282/4282
exit 0
```

Headless presentation cost (`node tools/combat_rt/bench_presentation.js`), 40 pairs, 10 rounds, seed `0x5eed0019`:

```
BENCH presentation pairs 40 rounds 10 attacks 549 feedback 583 wall 16.7 ms
BENCH perRound 1.67 ms
```

The harness also wrote `tasks/SIM.60.06/lane-ah/perf/combat_srd_7588239f.json`. That path is outside this lane, so the file was removed after the numbers above were copied. It was not committed.
