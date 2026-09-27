# WG.00.39 lane-bg report

Tamed creatures fight on the player's side using the SRD 5.1 stat block and natural attacks. There are no creature equipment slots, and a riding saddle does not change a combat number. This lane does not certify itself. The PM runs the gate tests on this tip, then Gemini reviews.

## What landed

- `game/js/sim/taming/party.js` decides membership, builds the combat profile, strips gear, parses Multiattack, stores follow / attack / hold, and records death.
- `game/js/sim/combat_rt` enlists those creatures into the six-second round. They take initiative, can be targeted, and act. A troll's action is bite, claw, claw.
- `DEUS_Combat` treats the same record as friendly on the legacy tick, uses the primary natural attack, strips gear, and calls `noteDeath` at 0 HP.
- `DEUS_Taming` and `DEUS_CombatRT` expose enlist and orders. `game/js/plugins.js` was not edited. No registration request.
- Tests: `tools/taming_party/test_tamed_party_combat.js`. Each of the five checks has a `--provoke=<name>` mutant, and the plain run requires every mutant to fail its check. `--provoke=gear_bonus` copies worn gear onto the rules body and adds saddle bonuses.
- `docs/systems/DEUS_TamedPartyCombat.md` has the rules, the API, the tests, the open questions, and the follow-ups.

## Roles

`ROLE_FIGHTS` is PM_DEFAULT, not an Owner answer. Every domesticated role joins: pet, mount, livestock, and work. A captive does not, even after a role is chosen. A wild creature does not. A dead creature does not. Humanoids do not.

## Open questions (not answered)

- **OQ-BG-01.** Should any domesticated role stay out of party combat? DEC-033 item 3 names no excluded role.
- **OQ-BG-02.** Care does not heal, so a captured creature is still stored at 0 HP when it is domesticated. A living tamed creature whose stored hp is 0, missing, or above the SRD average enters at that average. A stored hp from 1 through the average is kept. Should the stored 0 stay 0 until something heals it?
- **OQ-AX-01 through OQ-AX-08** stay open. This lane does not answer them. OQ-AX-04 (one role or two) and OQ-AX-06 (saddle marker only on mounts) are the ones that touch this fight.

## Not implemented

- **PROPOSED-AX-01.** No combat choice to knock a creature out at 0 HP. A tamed creature dies at 0 HP. `death.knockout` is false. The census moves it from domestic to dead.

## Follow-ups

- **PROPOSED-BG-01.** Only walk speed steps the creature. Fly, swim, climb, and hover are not movement here.
- **PROPOSED-BG-02.** Pack Tactics, troll regeneration, and "dies only if it does not regenerate" are not applied.
- **PROPOSED-BG-03.** A Multiattack sentence with "or" uses the text before the first "or". An unnamed choice among several attacks does not invent a sequence.
- **PROPOSED-BG-04.** The legacy tick swings once. The real-time action runs the full multiattack.
- **PROPOSED-BG-05.** Prone, grapple, and poison riders on a natural attack stay the rules-module gap.

## Gate tests

Run on this tree before the commit that adds this report. The report file is not imported by the tests.

```
===== node tools/taming_party/test_tamed_party_combat.js =====
PASS provocation anchors
PASS membership
PASS srd
PASS gear_bonus
PASS death
PASS orders
PASS provocation membership is caught — captive joined JOIN
PASS provocation srd is caught — hp 99/99 want 11; wound 4/99; troll numbers {"ac":15,"hp":99,"speed":30}
PASS provocation gear_bonus is caught — ac 30 block 13 dirty 18; attack 7 2d4+2; equip changed numbers
PASS provocation death is caught — record {"status":"domesticated","dead":false}; census {"wild":0,"domestic":2,"captive":0,"dead":0,"byRole":{"pet":1,"mount":0,"livestock":1,"work":0},"total":2}; dead enlist left domesticated
PASS provocation orders is caught — peek {"type":"hold","targetId":null}; follow position 0,0; no follow event
PASS open role questions stay listed — OQ-BG-01,OQ-BG-02
RESULT: 12 passed, 0 failed
EXIT:0

===== node tools/taming/test_taming.js =====
PASS SRD ladder — easy 10 medium 15
PASS PM capture names use that ladder
PASS owner questions are listed and not answered
PASS standing deer is not subdued — NOT_SUBDUED
PASS humanoid colonist is refused — HUMANOID
PASS SRD humanoid type is refused — HUMANOID
PASS dead deer is refused — DEAD hp -4
PASS low Animal Handling roll fails and does not capture — total 3 dc 10
PASS knockout DC follows the ladder plus challenge rating — dc 10 want 10 cr 0
PASS proficient handler adds the SRD proficiency bonus — prof 2 mod 0
PASS untrained handler has no proficiency bonus — prof 0
PASS meeting the DC captures — roll 8 total 10 dc 10
PASS a captive is not captured twice — ALREADY_HELD
PASS restrained uses the medium DC, not the knockout method — fail NOT_SUBDUED dc 15 miss CHECK_FAILED
PASS a trapped boar can be captured — CAPTURED
PASS a grappled wolf can be captured — CAPTURED dc 15
PASS a subdued hare can be captured — CAPTURED
PASS monster capture DC adds the challenge rating and still uses the check — cr 5 dc 20 need 18 CAPTURED
PASS pet progresses only with food from the owner — CAPTURED NEEDS_FOOD NOT_OWNER DOMESTICATED MAINTAINED points 3
PASS pet attacks stay on the SRD stat block and slots stay empty — srd:creature:deer actions 1 ac 13
PASS a pet is domestic without products or labour — pet
PASS saddle marker has no slot and no stats — {"id":"riding_saddle","visual":true,"slot":null,"stats":null}
PASS a worn object does not enter the creature stat block
PASS mount progresses only with food from the owner — CAPTURED NEEDS_FOOD NOT_OWNER DOMESTICATED MAINTAINED points 5
PASS mount attacks stay on the SRD stat block and slots stay empty — srd:creature:deer actions 1 ac 13
PASS a mount can carry the visual saddle only
PASS livestock progresses only with food from the owner — CAPTURED NEEDS_FOOD NOT_OWNER DOMESTICATED MAINTAINED points 4
PASS livestock attacks stay on the SRD stat block and slots stay empty — srd:creature:goat actions 1 ac 10
PASS livestock feeds the breeding hook — ["wool"]
PASS work progresses only with food from the owner — CAPTURED NEEDS_FOOD NOT_OWNER DOMESTICATED MAINTAINED points 6
PASS work attacks stay on the SRD stat block and slots stay empty — srd:creature:wolf actions 1 ac 13
PASS work animal exposes a haul hook and is not livestock — {"hauling":true,"labour":true,"ownerId":30,"factionId":"home","species":"wolf","hook":"haul"}
PASS a failed handling check consumes the hour and does not grant care — CHECK_FAILED ALREADY_TENDED CARED
PASS the training role stays the one already started — ROLE_LOCKED
PASS wild and domestic counts do not double-count — {"wild":2,"domestic":1,"captive":1,"dead":0,"byRole":{"pet":1,"mount":0,"livestock":0,"work":0},"total":4}
PASS the owner may not hunt the captive or the pet
PASS another faction is not refused an explicit hunt by mayHunt
PASS hunt jobs of the owner are refused and other jobs are not
PASS an untouched summary object is returned as-is
PASS held animals leave the wild summary — {"prey":1,"monsters":0,"predators":0,"creatures":1,"bySpecies":{"deer":2,"wolf":0},"domestic":1,"captive":1,"dead":0}
PASS export keeps captive and domestic rows only
PASS a bad save version does not wipe state
PASS save and load round-trip the tamed state — LOADED applied 2
PASS unit data itself round-trips the taming record
PASS neglect is off unless the data enables it — CARED CARED wild DISABLED
PASS a reverted animal counts as wild again — {"wild":1,"domestic":0,"captive":0,"dead":0,"byRole":{"pet":0,"mount":0,"livestock":0,"work":0},"total":1}
PASS a reverted animal is omitted from the captive save
PASS the same seed repeats the check — roll 13 / 13
PASS different seeds can differ — rolls 13 / 6
PASS capture and care did not call Math.random — calls 0
PASS mutant anchors are unique
PASS wildlife strike anchor is still unique
PASS mutant skip_srd_check is caught — CAPTURED
PASS mutant allow_equipment_slot is caught — ["barding"]
PASS mutant lose_tamed_state_on_load is caught — null
PASS mutant double_count_wild is caught — {"wild":3,"domestic":1,"captive":1,"dead":0,"byRole":{"pet":1,"mount":0,"livestock":0,"work":0},"total":5}
PASS wildlife boots
PASS nearestPrey skips captive and domesticated animals — near 2 close null wide 2
PASS public speciesOf drops prey without editing the catalog row
PASS owner hunt jobs do not count as wild hunts
PASS wildlife census moves held animals out of wild — {"wild":2,"domestic":1,"captive":1,"dead":0,"byRole":{"pet":1,"mount":0,"livestock":0,"work":0},"total":4}
PASS wildlife mayHunt matches ownership
PASS the look line no longer calls a pet prey — Wolf · domesticated · pet
PASS plugin publishes UF.Taming.attemptCapture — CAPTURED / HUMANOID / HUMANOID
PASS Jobs.create refuses the owner's hunt and passes every other job — calls 3 refused null
PASS Ecology.population moves held animals and keeps an empty adjustment identical — {"prey":1,"monsters":0,"predators":0,"creatures":1,"bySpecies":{"deer":0,"hare":1},"domestic":1,"captive":0,"dead":0}
OK 0 failed
EXIT:0

===== node tools/combat_rt/test_combat_rt.js =====
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
EXIT:0

===== node tools/test_srd_combat_proof.js =====
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
EXIT:0

===== node tools/sim/test_wildlife_rules_damage.js =====
PASS fixture species — wolf -> hare
PASS source routes the strike through UF.Rules
PASS mutant anchor is unique — count 1
PASS probe strike did not throw
PASS hit roll is a non-critical hit on bare AC — natural 10 damage 5
PASS catalog attack is outside one bite — catalog 16 maxHit 10
PASS plate turns that roll into a miss — natural 10 hp 30
PASS bare hit writes the rules damage once — hp 25 want 25 key bite calls 1/1
PASS the same hit roll repeats — hp 25 / 25
PASS natural 1 deals no damage — hp 30 state hunt natural 1
PASS same seed and frame deal the same damage — hp 30 / 30 natural 6
PASS different seeds can differ — seeds 1/101 natural 12/16 damage 9/7
PASS combat absent still uses UF.Rules once — hp 25 target null
PASS kill, yields, wildlife:kill and feeding without combat — alive false state feed until 330 kills 1 drops [{"id":"meat_raw","n":1,"x":11,"y":10},{"id":"hide","n":1,"x":11,"y":10}]
PASS kill path with combat enabled — alive false state feed until 330 kills 1 drops [{"id":"meat_raw","n":1,"x":11,"y":10},{"id":"hide","n":1,"x":11,"y":10}]
PASS combat enabled applies the rules damage once — hp -4 max 1 rules 5 swingReady false attacks 0->0
PASS combat enabled miss does not kill or swing — hp 1 state hunt swingReady false
PASS rules absent subtracts catalog attack once, deterministically — hp 14 / 14 catalog 16
PASS rules absent still kills, drops, emits and feeds — state feed until 93 drops [{"id":"meat_raw","n":1,"x":11,"y":10},{"id":"hide","n":1,"x":11,"y":10}]
PASS mutant catalog_subtraction is caught — hp 14 rules hp 25 err null
PASS mutant double_apply is caught — hp 9 rules hp 25 err null
OK 0 failed
EXIT:0

===== node tools/check_deus_syntax.js =====
Checked 60 DEUS plugin files. Errors: 0
EXIT:0
```
