# Independent Review: DEUS-TSK-COMBAT-U7 (Lane AN)

- **Reviewer:** Gemini (Independent Non-Author Reviewer; gemini-3.8-flash thinking HIGH per Owner DEC-034 final gate authorization)
- **Writer:** Grok (`deus-grok`)
- **Reviewed Tip SHA:** `96a723d8fd777d79edc11a1bee0d99cd6f9c1106`
- **Branch:** `task/lane-an`
- **Merge Base with `origin/main` (`1c2fcc28736566f8dd4f14ccd0633f09687e3521`):** `1c2fcc28736566f8dd4f14ccd0633f09687e3521`

---

## 1. Tip Verification

Verification command executed in live worktree:
```powershell
git rev-parse HEAD origin/task/lane-an; git log -12 --format="%H %an %s"
```

Raw output:
```text
96a723d8fd777d79edc11a1bee0d99cd6f9c1106
96a723d8fd777d79edc11a1bee0d99cd6f9c1106
96a723d8fd777d79edc11a1bee0d99cd6f9c1106 deus-grok [grok] DEUS-TSK-COMBAT-U7 lane report and gate output
7588239f067232fc66655a37148148e274a881a9 deus-grok [grok] DEUS-TSK-COMBAT-U7 on-map real-time combat presentation
e554d23bdfabe08adff094723fbc8b449903491a deus-pm [pm] Open lane-an (DEUS-TSK-COMBAT-U7): BRIEF.md and lane.json
1c2fcc28736566f8dd4f14ccd0633f09687e3521 deus-pm Merge task/lane-aa: WG.00.17 Z-range one setting, 32 layers (-16..+15), sparse storage, 2-ft strata (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner ruling 20:45 CT replacing the Pro second pass, VERDICT: PASS WITH NOTES (0 BLOCKER, 0 MAJOR) at 212ddf060c41925bfd5e71d88f165cc606433510 / review d2c6614f5b403d397089728f0412a7b14057b430; earlier Flash PASS 705bf9ba9e7af37d44731bcf46ca4d3ea154b61d; writer grok tip 212ddf060c41925bfd5e71d88f165cc606433510)
d2c6614f5b403d397089728f0412a7b14057b430 deus-gemini [gemini] WG.00.17 review final 212ddf06
c1bb4469772b0763dc257bf2aa6c61256532772e deus-pm Merge task/lane-al: WG.20.01 A9b+A9c items 12-43 + section F + addendum 0509 (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner ruling 20:45 CT, VERDICT: CLEAN PASS at c70736fdf535e2579bb48789e8d9057420b2dcf9 / review c17da05f9feafa15601ee13cce30505bb1683749; writer grok tip c70736fdf535e2579bb48789e8d9057420b2dcf9)
c17da05f9feafa15601ee13cce30505bb1683749 deus-gemini [gemini] WG.20.01 review c70736fd
684c9513d181a844f9a06c4f34021f40ee2cafb1 snewt [gemini] 0119-DO/0120-DP: Lane AA Pro launch quota-blocked; AA/AL reviews held until Pro reset ~2026-09-27 19:04 CT
7a5d50a319bc3ef05bb0b23692a5096aba35073a snewt [gemini] 0118-DN: Lane AL A9c item 43 FINAL recorded; review held for Pro
c70736fdf535e2579bb48789e8d9057420b2dcf9 deus-grok [grok] WG.20.01 A9c item 43 whole-sprite characters and eight directions
3d2a719741efe1941a03350731e797c7faca21f2 snewt [gemini] 0117-DM: Lane AL A9c item 43 addendum 0509 recorded
0885b8791289a030664b30dc2ec2513680c7e3db snewt [gemini] 0116-DL: Lane AL WG.20.01 A9c item 43 LAUNCHED
```

The tip is confirmed: `96a723d8fd777d79edc11a1bee0d99cd6f9c1106`.

---

## 2. Scope Verification

Executed in a detached temporary clone (`git clone -c core.autocrlf=false ...` at `96a723d8fd777d79edc11a1bee0d99cd6f9c1106`):
```powershell
git diff --name-status 1c2fcc28736566f8dd4f14ccd0633f09687e3521 96a723d8fd777d79edc11a1bee0d99cd6f9c1106
```

### Scope Table

| Status | File Path | Allowed Path Filter | In Scope? |
|---|---|---|---|
| A | `docs/systems/DEUS_CombatU7.md` | `docs/systems/DEUS_CombatU7.md` | YES |
| M | `game/js/plugins/DEUS_Combat.js` | `game/js/plugins/DEUS_Combat.js` | YES (minimal reviewed hook) |
| A | `game/js/plugins/DEUS_CombatRT.js` | `game/js/plugins/DEUS_CombatRT.js` | YES |
| A | `game/js/plugins/DEUS_CombatUI.js` | `game/js/plugins/DEUS_CombatUI.js` | YES |
| A | `game/js/plugins/DEUS_Move8.js` | `game/js/plugins/DEUS_Move8.js` | YES |
| A | `game/js/sim/combat_rt/constants.js` | `game/js/sim/combat_rt/**` | YES |
| A | `game/js/sim/combat_rt/engine.js` | `game/js/sim/combat_rt/**` | YES |
| A | `game/js/sim/combat_rt/grid.js` | `game/js/sim/combat_rt/**` | YES |
| A | `game/js/sim/combat_rt/index.js` | `game/js/sim/combat_rt/**` | YES |
| A | `game/js/sim/combat_rt/move8.js` | `game/js/sim/combat_rt/**` | YES |
| A | `game/js/sim/combat_rt/presentation.js` | `game/js/sim/combat_rt/**` | YES |
| A | `game/js/sim/combat_rt/rng.js` | `game/js/sim/combat_rt/**` | YES |
| A | `game/js/sim/combat_rt/ui.js` | `game/js/sim/combat_rt/**` | YES |
| A | `tasks/DEUS-TSK-COMBAT-U7/lane-an/BRIEF.md` | `tasks/DEUS-TSK-COMBAT-U7/**` | YES |
| A | `tasks/DEUS-TSK-COMBAT-U7/lane-an/REPORT.md` | `tasks/DEUS-TSK-COMBAT-U7/**` | YES |
| A | `tasks/DEUS-TSK-COMBAT-U7/lane-an/lane.json` | `tasks/DEUS-TSK-COMBAT-U7/**` | YES |
| A | `tools/combat_rt/bench_presentation.js` | `tools/combat_rt/**` | YES |
| A | `tools/combat_rt/test_combat_rt.js` | `tools/combat_rt/**` | YES |

### Out-of-Scope / Forbidden Files Audit
- `docs/STATUS.md`: NOT touched.
- WBS files (`*WBS*.md`): NOT touched (no WBS minted or edited).
- `docs/OWNER_DECISIONS.md`: NOT touched.
- `game/js/plugins.js`: NOT touched (registration request correctly placed in `REPORT.md` only).
- `game/js/plugins/DEUS_Core.js`: NOT touched.
- `game/js/sim/rules/**`: NOT touched (`UF.Rules` remained strictly read-only).
- `art/**`, `game/img/**`, `game/audio/**`: NOT touched (0 art/audio generated or modified).

---

## 3. Constraint and Implementation Audit

1. **NO ART (DEC-007):**
   - Confirmed: No image or audio generator was invoked, no image files were generated, edited, or committed.
   - In `presentation.js` and `engine.js`, placeholders are explicitly modeled (`placeholder: true, bitmap: null`), and source code audit confirms absence of banned generator strings.
   - ADDENDUM 0509 honored: Shields are NOT animated; `ATK_1H_SHIELD` is retired/reserved; weapon groups match exact brief (unarmed, dagger, one-hand sword without shield, two-hand, spear/polearm, staff, bow, crossbow).
2. **Layer Scaling & Presentation Integrity (DEC-011):**
   - Integer scaling (`integerScale` in `ui.js`) ensures 1:1 pixel rendering with `smoothing: false`.
   - Fortress minimap enforces `blur: false`, `downscale: false`, `smoothing: false`, `colourCoded: true`, and `zoomOutScale: 1`.
   - Audit checks (`auditProject`) assert that smoothing and blur remain disabled.
3. **SRD 5.1 Authority (DEC-027):**
   - `UF.Rules` is the sole authority for d20 attack rolls, damage expressions, saving throws, initiative, and death saves.
   - The real-time engine delegates all resolution to `rules.attack`, `rules.damage`, `rules.savingThrow`, `rules.initiative`, and `rules.deathSave`.
   - Seeded deterministic RNG ensures identical combat replay and state consistency.
   - Same-Z invariant is enforced: cross-Z weapon attacks are rejected.
   - Distance calculations strictly use SRD 5-5-5 diagonal measurement (`feetBetween(dx, dy) = 5 * max(|dx|, |dy|)`).
   - Size classes and footprints adhere to SRD specifications (Tiny shares square, Small/Medium 1x1, Large 2x2, Huge 3x3, Gargantuan 4x4).
4. **On-Map Real-Time with Pause (Ultima VII feel):**
   - No separate battle scene is opened (`scene: "map"`, `battleScene: false`).
   - Round clock runs at 6000 ms per round at 1x speed.
   - Fortress and Hero modes share the exact same clock, dice stream, and order queue. Switching modes preserves full combat state without interruption.
5. **Minimal Plugin Hooks:**
   - `DEUS_Combat.js` modification is strictly limited to minimal reviewed notification hooks (`notifyCombatRt`) and skipping the legacy tick when `ownsCombat()` is true.

---

## 4. Gate Test Verification in Fresh Temporary Clone

Executed in a detached temporary clone at commit `96a723d8fd777d79edc11a1bee0d99cd6f9c1106`:

### Gate 1: `node tools/combat_rt/test_combat_rt.js`

Command:
```powershell
node tools/combat_rt/test_combat_rt.js; Write-Output "EXIT: $LASTEXITCODE"
```

Raw output:
```text
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
EXIT: 0
```

### Gate 2: `node tools/test_srd_combat_proof.js`

Command:
```powershell
node tools/test_srd_combat_proof.js; Write-Output "EXIT: $LASTEXITCODE"
```

Raw output:
```text
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
EXIT: 0
```

### Gate 3: `node tools/check_deus_syntax.js`

Command:
```powershell
node tools/check_deus_syntax.js; Write-Output "EXIT: $LASTEXITCODE"
```

Raw output:
```text
Checked 55 DEUS plugin files. Errors: 0
EXIT: 0
```

*(Note: The brief/lane.json gate tests correspond to `test_combat_rt.js` for presentation and `test_srd_combat_proof.js` for SRD regression; both and syntax checking passed with 0 errors and EXIT 0).*

---

## 5. Findings

- **BLOCKER:** None (0)
- **MAJOR:** None (0)
- **MINOR:** None (0)

All requirements in `tasks/DEUS-TSK-COMBAT-U7/lane-an/BRIEF.md`, `lane.json`, and project directives (DEC-007, DEC-011, DEC-027) are verified and fulfilled.

---

## 6. Verdict

VERDICT: CLEAN PASS
