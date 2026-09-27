# Independent Codex review — WG.00.39 / lane-bg

Review date: 2026-09-27. Writer: Grok. Reviewer: Codex.
Full reviewed writer hash: `fb6e4e34cb3d8f5c3ce7a9141d52794c809dcb8f`.
Branch: `task/lane-bg`. Merge base with fetched `origin/main`: `ecc7b8984a0ab1a919595c792f98a60f18872f73`.

## Identity and review boundary

Before code review, ran `git status --short`, `git branch --show-current`, `git rev-parse HEAD origin/task/lane-bg`, `git fetch origin main task/lane-bg`, repeated `git rev-parse HEAD origin/task/lane-bg`, and ran `git merge-base HEAD origin/main`. Both local HEAD and fetched remote lane tip were exactly the full reviewed writer hash, before and after fetch. Branch was task/lane-bg. Fetch succeeded. Initial worktree contained only untracked `tasks/WG.00.39/lane-bg/launches/`; those files were left untouched and are not writer evidence.

Reviewed the merge-base-to-writer diff, all 16 changed paths, BRIEF.md, lane.json, REPORT.md, the new system document, relevant existing taming/combat/rules APIs, DEC-033 and DEC-018, and the latest A10 audit entry. A10 concerns other systems and does not close this lane's acceptance gaps. Read-only probes used the reviewed implementation without patching its files. No implementation fix, merge, art generation, audio generation, worker interruption, or STATUS/WBS edit was performed. The direct instruction to write only this review supersedes the generic STATUS claim/log requirements.

## Scope table

The scope is `git diff --name-only $(git merge-base <writer> origin/main) <writer>`, not just the final commit's parent diff. A PowerShell check compared each path to the exact lane.json allowedPaths (directory /** prefixes or exact files); all returned ALLOWED=True.

| Changed path | Allowlist entry | Review coverage |
|---|---|---|
| docs/systems/DEUS_TamedPartyCombat.md | exact file | Rules, API, questions, deferrals, test claims |
| game/js/plugins/DEUS_Combat.js | exact file | Legacy side, orders, gear adapter, HP, death, surrounding tick and weapon paths |
| game/js/plugins/DEUS_CombatRT.js | exact file | Published API help and existing loader/update |
| game/js/plugins/DEUS_Taming.js | exact file | Profile/enlist/orders/death API and host loading |
| game/js/sim/combat_rt/engine.js | game/js/sim/combat_rt/** | Enlistment, actions, initiative, orders, damage, movement, natural swings, spell saves |
| game/js/sim/combat_rt/index.js | game/js/sim/combat_rt/** | Bus forwarding and encounter ownership |
| game/js/sim/combat_rt/ui.js | game/js/sim/combat_rt/** | creature-order dispatch |
| game/js/sim/taming/census.js | game/js/sim/taming/** | Dead count and public summary adjustment |
| game/js/sim/taming/index.js | game/js/sim/taming/** | Factory and module exports |
| game/js/sim/taming/party.js | game/js/sim/taming/** | Entire new module: membership, catalogue, profiles, attacks, HP, orders, death |
| game/js/sim/taming/record.js | game/js/sim/taming/** | Dead withdrawal and existing record/type semantics |
| game/js/sim/taming/save.js | game/js/sim/taming/** | Dead-record export and existing import |
| tasks/WG.00.39/lane-bg/BRIEF.md | tasks/WG.00.39/** | Full task and acceptance contract |
| tasks/WG.00.39/lane-bg/REPORT.md | tasks/WG.00.39/** | Full writer report and raw gate evidence |
| tasks/WG.00.39/lane-bg/lane.json | tasks/WG.00.39/** | Allowlist and all six gate commands |
| tools/taming_party/test_tamed_party_combat.js | tools/taming_party/** | Entire harness and all five in-memory provocations |

NO ART: no art/**, game/img/**, audio, bitmap, or generated image path appears in this diff. New engine events carry placeholder/null bitmap metadata; the changed implementation does not call an image generator. Neither the writer's tracked task folder nor REPORT.md contains screenshot evidence. No screenshot was produced during this review.

## Acceptance assessment

| Requirement | Assessment |
|---|---|
| Domesticated combat roles join player side and can be targeted/act | Headless wolf fixture passes. All four roles documented as PM_DEFAULT; OQ-BG-01 remains open. Runtime integration/follow behavior incomplete (BG-C04, BG-C07). |
| SRD HP, AC, speed, abilities, saves, attacks, damage and defenses | Core profile and troll initiative/three swings pass. Actual spell saves, mapped Multiattack and defenses fail (BG-C02, BG-C05, BG-C06). Walk-only movement is explicitly deferred. |
| Natural attacks only; no slots/gear/barding/saddle stats | Empty slots and saddle normalization pass on wolf profile. Manufactured attacks and legacy gear-dependent timing violate the requirement (BG-C01). |
| 0 HP through existing creature path; taming record/census updated | Ordinary wolf death/record/census test passes; no knock-out choice added. Troll stat-block exception is omitted (BG-C06). Stored 0 HP is restored to average as an unapproved PM default; OQ-BG-02 remains open. |
| Follow / attack target / hold; documented API | Encounter fixtures pass, but legacy numeric target IDs fail and live world orders/positions diverge (BG-C03, BG-C04). Legacy follow only seeks hostiles. |
| Every new scope check has a failing provocation, including gear bonus | Five aggregate checks have actual caught mutants; --provoke-all observed FAIL and CAUGHT for each. They do not cover the failing production paths. |
| Rules/API/questions/PROPOSED-BG follow-ups document | Present. Deferring required stat-block behavior does not satisfy it. |
| Every lane.json gate exits 0 | All six rerun and exit 0; raw output below. |
| Independent review / Gemini marks DONE | This is the requested independent Codex review, not Gemini certification or a WBS transition. No DONE change made. |
| RMMZ F5, visual evidence, F8 error check | Not checked by this reviewer; none supplied by writer. Registration/handoff is incomplete (BG-C07). |
| Regressions | Existing gates pass; legacy order and gear timing defects and new stat-block/action gaps reproduced independently. |
| NO ART | Pass for reviewed diff and reviewer actions. |

## Findings, ranked

### BG-C01 — BLOCKER — Natural-only boundary admits manufactured weapons; legacy gear changes combat timing

`party.js:95` copies every to-hit action without distinguishing a natural attack from a held weapon; `attackSequence` uses it as the creature's combat sequence. A domesticated explicit SRD Hill Giant profile is accepted and selects `greatclub` (3d8+5), with Rock also in its copied attack list. The API supports explicit SRD IDs and the giant is not an SRD humanoid. Empty equipmentSlots does not make a manufactured greatclub natural. This breaks locked DEC-033 item 3 and BRIEF scopes 2–3.

The legacy `DEUS_Combat.js:602` weapon-profile path also still reads mainHand for a creature with an explicit SRD ID and no wildlife combat row. The same tamed giant's `describeAttack` changes speed 4 -> 5 and fists -> Long sword when mainHand=sword_long is written. Stripping equipment only at Rules.attack/damage does not isolate timing, reach, ammo or weapon selection upstream. This is a real combat-number gear influence; the wolf-only gear fixture misses it. Probe A and C below are direct outputs.

### BG-C02 — MAJOR — Actual spell saves use default ability scores rather than SRD scores

`combat_rt/engine.js:573` passes the raw encounter target to Rules.savingThrow; `addUnit` retains its default all-10 data.stats for tamed units. Unlike initiative/weapon attacks, the spell path does not use Party.rulesBody. Rules.scoresOf gives explicit stats priority. A wolf's unprinted Wisdom save therefore uses +0 instead of the block's +1: fixed roll 10 against DC 11 should succeed with total 11, but the actual encounter spell reports saveOk=false and deals 5 damage. Printed aboleth Wisdom +6 still works, which explains why the writer's aboleth-only save fixture passes. Probe B reproduces the wolf failure. Scope 2 includes all ability scores and saves, not only printed saves.

### BG-C03 — MAJOR — Legacy attack-target order loses numeric world targets

`party.js:477` stringifies target IDs. `DEUS_Combat.js:322` assigns that string to combat.targetId, while `runLevelTick` builds byId with unconverted numeric u.id at line 1492 and looks up c.targetId at line 1513. A wolf ordered to attack numeric world unit 9 is set to target "9", cannot find that key, and clears its combat target instead of attacking. Probe C uses the real plugin tick, an adjacent stationary hostile, and 36 map updates: persistent order remains attack/"9", targetId becomes null, nextAttackTick stays 0, and hostile HP stays 40. The existing harness only searches for source-hook strings in the legacy plugin; it never runs this order path.

### BG-C04 — MAJOR — Encounter follow and live world orders diverge from world truth

`combat_rt/engine.js:326` and `:661` move only the encounter copy. Tamed worldUnit is retained, but position/Z is not synchronized; only damage writes HP back. Probe A has the encounter follower move from (0,0) to (5,-1) while the world creature stays (0,0). This does not demonstrate the world creature following the party, and leaving/re-enlisting restores the old position.

After enlistment, the documented `UF.Taming.issueOrder(worldUnit, {type:"hold"})` path updates the world record, but `party.orderOf` prioritizes the encounter's earlier local order. Probe A records hold on the taming record while peekAction still returns follow. Orders are thus two sources of truth despite sharing a record. The legacy follow path is separately documented as nearest-hostile seeking; it has no owner-anchor follow behavior. Scope 1 and 5 are incomplete.

### BG-C05 — MAJOR — A mapped creature's explicit two natural attacks become one

`party.js:141` recognizes counted "with its ..." clauses and "makes two [melee/ranged] attacks", but not "makes two slam attacks". The actual bog_horror mapping is the SRD Shambling Mound. Its catalogue Multiattack explicitly says it makes two slam attacks; profile.sequence is ["slam"] and multiattackParsed=false. Probe D runs the encounter and records exactly one slam for 14 damage. This is not an ambiguous choice or an invented sequence; the catalogue names both the count and the attack. PROPOSED-BG-03 cannot defer a required natural multiattack. Legacy combat also deliberately remains single-swing (documented PROPOSED-BG-04), so full natural Multiattack is not delivered there either.

### BG-C06 — MAJOR — Required stat-block defenses/death exceptions are intentionally omitted

The writer documents Pack Tactics, troll regeneration, and the troll's specific death rule as absent (`DEUS_TamedPartyCombat.md:81`, REPORT.md:31). Probe B reads the real catalogue trait: the troll regains 10 HP at the start of its turn and dies only if it starts at 0 HP and does not regenerate. `engine.js` applyDamage immediately marks every non-PC tamed creature dead and invokes noteDeath; no trait/deferred-death path runs. `party.js:517` unconditionally records death. Immediate universal death contradicts the tamed troll's stat block. Natural defenses are part of scope 2, and the generic existing 0-HP path does not override a specific SRD stat-block exception. Natural-attack condition riders are also expressly deferred. These are disclosed limitations, not accepted scope reductions.

### BG-C07 — MAJOR — Player-runtime delivery and required visual evidence are missing

The only registered relevant combat plugin in `game/js/plugins.js` is DEUS_Combat (line 157); DEUS_Taming and DEUS_CombatRT have no entries. This absence predates the lane, but the lane must supply a reviewable delivery/handoff for its new API, and REPORT.md:10 explicitly says "No registration request". `combat_rt/index.js` only starts/enlists when an external caller invokes its API; the changed files add no ordinary play encounter enlistment caller. The headless follower/multiattack transcripts have clip=null and bitmap=null. No F5 run, F8 check, relevant screenshot, or world sprite/position proof is supplied. Source/API existence alone does not meet the binding Definition of Done or prove that a tamed creature fights/follows in player gameplay. No out-of-scope registration edit is requested from this reviewer.

### BG-C08 — MINOR — Mutation coverage is narrow relative to the claims

Each new provocation mutates party.js, and each checks one aggregate scenario. None mutates the legacy numeric-ID lookup, actual spell-target adapter, world-position synchronization, natural-versus-manufactured action filter, regeneration/death exception, or named slam-count parsing. The gear mutant combines several changes at once, so catching that mutant does not independently prove each guard. Existing assertions/gates were not weakened; the new tests can fail and the mutations are genuinely caught. Their pass is useful but cannot close BG-C01–07.

## Gate evidence

All commands ran in the foreground at the exact reviewed writer tree. The six individual exits were captured immediately after each command through $LASTEXITCODE. The containing PowerShell command's exit 0 is not substituted for individual results.

Exact invocation:
```powershell
$lane = Get-Content tasks/WG.00.39/lane-bg/lane.json -Raw | ConvertFrom-Json
foreach ($gate in $lane.gateTests) {
    Write-Output ('COMMAND: ' + $gate.cmd + ' ' + ($gate.args -join ' '))
    & $gate.cmd @($gate.args)
    $gateExit = $LASTEXITCODE
    Write-Output ('EXIT=' + $gateExit)
}
node tools/taming_party/test_tamed_party_combat.js --provoke-all
Write-Output ('PROVOKE_EXIT=' + $LASTEXITCODE)
```

Raw results (unabridged):
```text
COMMAND: node tools/taming_party/test_tamed_party_combat.js
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
EXIT=0
COMMAND: node tools/taming/test_taming.js
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
EXIT=0
COMMAND: node tools/combat_rt/test_combat_rt.js
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
EXIT=0
COMMAND: node tools/test_srd_combat_proof.js
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
EXIT=0
COMMAND: node tools/sim/test_wildlife_rules_damage.js
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
EXIT=0
COMMAND: node tools/check_deus_syntax.js
Checked 60 DEUS plugin files. Errors: 0
EXIT=0
PASS provocation anchors
FAIL membership — captive joined JOIN
CAUGHT membership
FAIL srd — hp 99/99 want 11; wound 4/99; troll numbers {"ac":15,"hp":99,"speed":30}
CAUGHT srd
FAIL gear_bonus — ac 30 block 13 dirty 18; attack 7 2d4+2; equip changed numbers
CAUGHT gear_bonus
FAIL death — record {"status":"domesticated","dead":false}; census {"wild":0,"domestic":2,"captive":0,"dead":0,"byRole":{"pet":1,"mount":0,"livestock":1,"work":0},"total":2}; dead enlist left domesticated
CAUGHT death
FAIL orders — peek {"type":"hold","targetId":null}; follow position 0,0; no follow event
CAUGHT orders
RESULT: 5 provocations caught, 0 missed
PROVOKE_EXIT=0

```

## Independent read-only reproduction evidence

The following PowerShell here-strings were piped directly to Node; they did not create or change implementation/test files. EXIT=0 means the diagnostic ran, not that the implementation satisfied the expected behavior.

### Probe A

Exact command:
```powershell
@'
const fs=require('fs'); const {bindRules}=require('./tools/rules/bind'); const rules=bindRules(global); const party=require('./game/js/sim/taming/party'); const sim=require('./game/js/sim/combat_rt');
function beast(species,id,srdId){return {id,x:0,y:0,z:0,data:{kind:'creature',species,srdId,hp:10,taming:{status:'domesticated',role:'pet',ownerId:1}}};}
function enc(){return sim.createEngine({rules,seed:3,rng:{next:()=>0.5,state:()=>1}});}
const troll=beast('troll',2); const p=party.combatProfile(rules,troll); console.log('TROLL_PROFILE',JSON.stringify({reach:p.reachSquares,attacks:p.attacks,sequence:p.sequence}));
let e=enc(); e.addUnit({id:9,x:3,y:0,side:'enemy',hp:200,maxHp:200,stats:{dex:10},weaponKey:'longsword'}); e.queueOrder('9',{type:'hold'}); party.enlist(e,rules,[troll]); e.setOrder(2,{type:'attack',targetId:9}); rules._setTestRoll(15); e.advanceReal(6000); console.log('TROLL_10FT',JSON.stringify(e.transcript().filter(x=>x.actorId==='2'))); rules._clearTestRoll();
const a=beast(null,3,'srd:creature:aboleth'); e=enc(); party.enlist(e,rules,[a]); e.setOrder(3,{type:'hold'}); e.addUnit({id:9,x:6,y:0,side:'enemy',hp:200,maxHp:200,stats:{dex:10}}); e.queueOrder('9',{type:'spell',targetId:3,ability:'wis',dc:15,dice:'1d8'}); rules._setTestRoll(10); console.log('ABOLETH_EXPECTED_SAVE',JSON.stringify(rules.savingThrow(party.rulesBody(a,rules.creatureOf(a)),'wis',15,{roll:10}))); e.advanceReal(6000); console.log('ABOLETH_ACTUAL_SPELL',JSON.stringify(e.transcript().filter(x=>x.type==='spell'))); rules._clearTestRoll();
const g=beast(null,4,'srd:creature:hill-giant'); const gp=party.combatProfile(rules,g); console.log('GIANT_NATURAL_ONLY',JSON.stringify({ok:gp.ok,weaponKey:gp.weaponKey,sequence:gp.sequence,attacks:gp.attacks}));
const w=beast('wolf',5); e=enc(); e.addUnit({id:1,x:6,y:0,side:'player',hp:40,stats:{dex:10}}); party.enlist(e,rules,[w]); e.advanceReal(6000); console.log('FOLLOW_WORLD_SYNC',JSON.stringify({encounter:e.unit('5'),world:{x:w.x,y:w.y,hp:w.data.hp}})); party.issueOrder(w,{type:'hold'}); console.log('WORLD_ORDER_SYNC',JSON.stringify({record:w.data.taming.order,peek:e.peekAction(5)}));
const zero=beast('wolf',6); zero.data.hp=0; console.log('ZERO_HP',JSON.stringify({stored:zero.data.hp,profileHp:party.combatProfile(rules,zero).hp}));
'@ | node
Write-Output ('EXIT=' + $LASTEXITCODE)
```

Raw result:
```text
TROLL_PROFILE {"reach":1,"attacks":[{"name":"Bite","key":"bite","toHit":7,"dice":"1d6+4","damageType":"piercing","attackKind":"weapon","reach":5,"range":null},{"name":"Claw","key":"claw","toHit":7,"dice":"2d6+4","damageType":"slashing","attackKind":"weapon","reach":5,"range":null}],"sequence":["bite","claw","claw"]}
TROLL_10FT [{"round":0,"actorId":"2","type":"attack","targetId":"9","hit":true,"damage":32,"heal":0,"natural":15,"sameZViolation":false,"outOfRange":false,"effectZ":0,"actorZ":0,"targetZ":0,"clip":null,"targetAnim":"HURT","flash":true,"flashFrame":3,"number":{"text":"32","font":"DEUS_Pixel","native":true,"scale":1,"color":"#f2f2f2"},"knock":{"x":2,"y":2},"gridMoved":0,"placeholder":true,"bitmap":null,"damageType":"slashing","swings":[{"weaponKey":"bite","hit":true,"damage":8,"attackMod":7,"fromStatBlock":true,"natural":15},{"weaponKey":"claw","hit":true,"damage":12,"attackMod":7,"fromStatBlock":true,"natural":15},{"weaponKey":"claw","hit":true,"damage":12,"attackMod":7,"fromStatBlock":true,"natural":15}],"attackMod":7,"effectiveAC":10,"blood":true}]
ABOLETH_EXPECTED_SAVE {"ok":true,"autoFailed":false,"total":16,"roll":10,"abilityKey":"wis","abilityMod":6,"profBonus":0,"printedSave":6,"extraMod":0,"dc":15,"margin":1,"advantage":false,"disadvantage":false,"critical":false,"fumble":false}
ABOLETH_ACTUAL_SPELL [{"round":0,"actorId":"9","type":"spell","targetId":"3","hit":false,"damage":0,"heal":0,"natural":10,"sameZViolation":false,"outOfRange":false,"effectZ":0,"actorZ":0,"targetZ":0,"clip":"CAST","targetAnim":null,"flash":false,"flashFrame":null,"number":{"text":"0","font":"DEUS_Pixel","native":true,"scale":1,"color":"#4d7cff"},"knock":{"x":0,"y":0},"gridMoved":0,"placeholder":true,"bitmap":null,"damageType":"fire","saveOk":true,"squares":[{"x":0,"y":0,"z":0}]}]
GIANT_NATURAL_ONLY {"ok":true,"weaponKey":"greatclub","sequence":["greatclub"],"attacks":[{"name":"Greatclub","key":"greatclub","toHit":8,"dice":"3d8+5","damageType":"bludgeoning","attackKind":"weapon","reach":10,"range":null},{"name":"Rock","key":"rock","toHit":8,"dice":"3d10+5","damageType":"bludgeoning","attackKind":"weapon","reach":null,"range":{"normal":60,"long":240}}]}
FOLLOW_WORLD_SYNC {"encounter":{"id":"5","hp":10,"maxHp":11,"x":5,"y":-1,"z":0,"facing":"SE","pose":"WALK","dead":false,"dying":false,"behaviour":"attack-nearest","side":"player","faction":"player","race":"wolf","sex":"m","className":"","size":"Medium","weaponKey":"bite","shield":false,"tamed":true,"order":{"type":"follow","targetId":null},"equipmentSlots":[],"speedFt":40,"summonedBy":null,"squadId":null,"cosmetic":{"x":0,"y":0},"clip":null,"armor":"UNARMORED","conditions":[],"resources":null},"world":{"x":0,"y":0,"hp":10}}
WORLD_ORDER_SYNC {"record":{"type":"hold","targetId":null},"peek":{"type":"follow","targetId":"1"}}
ZERO_HP {"stored":0,"profileHp":11}
EXIT=0

```

### Probe B

Exact command:
```powershell
@'
const fs=require('fs'); const {bindRules}=require('./tools/rules/bind'); const rules=bindRules(global); const party=require('./game/js/sim/taming/party'); const sim=require('./game/js/sim/combat_rt');
const wolf={id:2,x:0,y:0,z:0,data:{kind:'creature',species:'wolf',hp:11,taming:{status:'domesticated',role:'pet',ownerId:1}}};
const e=sim.createEngine({rules,seed:3,rng:{next:()=>0.5,state:()=>1}}); party.enlist(e,rules,[wolf]); e.setOrder(2,{type:'hold'}); e.addUnit({id:9,x:6,y:0,side:'enemy',hp:200,stats:{dex:10}}); e.queueOrder('9',{type:'spell',targetId:2,ability:'wis',dc:11,dice:'1d8'}); rules._setTestRoll(10); console.log('WOLF_EXPECTED_SAVE',JSON.stringify(rules.savingThrow(party.rulesBody(wolf,rules.creatureOf(wolf)),'wis',11,{roll:10}))); e.advanceReal(6000); console.log('WOLF_ACTUAL_SPELL',JSON.stringify(e.transcript().filter(x=>x.type==='spell'))); rules._clearTestRoll();
const entries=JSON.parse(fs.readFileSync('./game/data/srd51/creatures.json','utf8')).entries;
console.log('TROLL_REGEN',JSON.stringify(entries.find(x=>x.id==='srd:creature:troll').data.traits));
'@ | node
Write-Output ('EXIT=' + $LASTEXITCODE)
```

Raw result:
```text
WOLF_EXPECTED_SAVE {"ok":true,"autoFailed":false,"total":11,"roll":10,"abilityKey":"wis","abilityMod":1,"profBonus":0,"printedSave":null,"extraMod":0,"dc":11,"margin":0,"advantage":false,"disadvantage":false,"critical":false,"fumble":false}
WOLF_ACTUAL_SPELL [{"round":0,"actorId":"9","type":"spell","targetId":"2","hit":true,"damage":5,"heal":0,"natural":10,"sameZViolation":false,"outOfRange":false,"effectZ":0,"actorZ":0,"targetZ":0,"clip":"CAST","targetAnim":null,"flash":true,"flashFrame":3,"number":{"text":"5","font":"DEUS_Pixel","native":true,"scale":1,"color":"#e85d04"},"knock":{"x":0,"y":0},"gridMoved":0,"placeholder":true,"bitmap":null,"damageType":"fire","saveOk":false,"squares":[{"x":0,"y":0,"z":0}],"blood":true}]
TROLL_REGEN [{"name":"Keen Smell","text":"The troll has advantage on Wisdom (Perception) checks that rely on smell."},{"name":"Regeneration","text":"The troll regains 10 hit points at the start of its turn. If the troll takes acid or fire damage, this trait doesn’t function at the start of the troll’s next turn. The troll dies only if it starts its turn with 0 hit points and doesn’t regenerate."}]
EXIT=0

```

### Probe C

Exact command:
```powershell
@'
const fs=require('fs'),path=require('path'); const party=require('./game/js/sim/taming/party'); const source=fs.readFileSync('./tools/test_srd_combat_proof.js','utf8'); eval(source.slice(0,source.indexOf('// Proof 1:')).replace('path.join(__dirname, "..", "game", "js", "plugins")','path.join(process.cwd(), "game", "js", "plugins")'));
const wolf={id:2,x:0,y:0,z:0,area:{x:0,y:0,z:0},data:{kind:'creature',species:'wolf',hp:11,taming:{status:'domesticated',role:'pet',ownerId:1}}};
const foe={id:9,x:1,y:0,z:0,area:{x:0,y:0,z:0},data:{kind:'person',stats:{str:10,dex:10,con:10,int:10,wis:10,cha:10},hp:40,maxHp:40,tags:['hostile'],combat:{mode:'manual',targetId:null}}};
UF.World.state.size=20; UF.World.inWorld=()=>true; UF.World.stopUnit=()=>{}; UF.World.sendUnit=()=>{}; UF.World.addUnit(wolf); UF.World.addUnit(foe); UF.Combat.testFilter=new Set([2,9]); party.issueOrder(wolf,{type:'attack',targetId:9}); for(let i=0;i<36;i++) new Game_Map().update(true); console.log('LEGACY_ORDER_AFTER_TICK',JSON.stringify({order:wolf.data.taming.order,combat:wolf.data.combat,foeHp:foe.data.hp}));
const giant={id:4,x:0,y:0,z:0,area:{x:0,y:0,z:0},data:{kind:'creature',srdId:'srd:creature:hill-giant',hp:105,taming:{status:'domesticated',role:'pet'}}}; console.log('LEGACY_UNGEARED',JSON.stringify(UF.Combat.describeAttack(giant,foe))); giant.data.equipment={mainHand:'sword_long'}; console.log('LEGACY_GEARED',JSON.stringify(UF.Combat.describeAttack(giant,foe)));
'@ | node
Write-Output ('EXIT=' + $LASTEXITCODE)
```

Raw result:
```text
--- Running SRD 5.1 Combat Proof Suite (Mutant: false) ---
LEGACY_ORDER_AFTER_TICK {"order":{"type":"attack","targetId":"9"},"combat":{"targetId":null,"nextAttackTick":0,"lastTick":-1000,"chase":null},"foeHp":40}
LEGACY_UNGEARED {"speed":4,"range":1,"style":"accurate","attackType":"crush","weapon":"fists","weaponType":null,"ranged":false,"ammo":null,"outOfAmmo":null}
LEGACY_GEARED {"speed":5,"range":1,"style":"accurate","attackType":"slash","weapon":"Long sword","weaponType":"sword_long","ranged":false,"ammo":null,"outOfAmmo":null}
EXIT=0

```

### Probe D

Exact command:
```powershell
@'
const fs=require('fs');const rules=require('./tools/rules/bind').bindRules(global),p=require('./game/js/sim/taming/party'),sim=require('./game/js/sim/combat_rt');
const mound={id:2,x:0,y:0,z:0,data:{kind:'creature',species:'bog_horror',hp:136,taming:{status:'domesticated',role:'pet'}}};const profile=p.combatProfile(rules,mound);const entry=JSON.parse(fs.readFileSync('./game/data/srd51/creatures.json','utf8')).entries.find(x=>x.id===profile.srdId);console.log('MOUND_MULTIATTACK',JSON.stringify({text:entry.data.actions.find(x=>x.name==='Multiattack').text,sequence:profile.sequence,parsed:profile.multiattackParsed}));
const e=sim.createEngine({rules,seed:3,rng:{next:()=>0.5,state:()=>1}});e.addUnit({id:9,x:3,y:0,side:'enemy',hp:200,maxHp:200,stats:{dex:10}});e.queueOrder('9',{type:'hold'});p.enlist(e,rules,[mound]);e.setOrder(2,{type:'attack',targetId:9});rules._setTestRoll(15);e.advanceReal(6000);console.log('MOUND_ACTUAL',JSON.stringify(e.transcript().filter(x=>x.actorId==='2')));rules._clearTestRoll();
'@ | node
Write-Output ('EXIT=' + $LASTEXITCODE)
```

Raw result:
```text
MOUND_MULTIATTACK {"text":"The shambling mound makes two slam attacks. If both attacks hit a Medium or smaller target, the target is grappled (escape DC 14), and the shambling mound uses its Engulf on it.","sequence":["slam"],"parsed":false}
MOUND_ACTUAL [{"round":0,"actorId":"2","type":"attack","targetId":"9","hit":true,"damage":14,"heal":0,"natural":15,"sameZViolation":false,"outOfRange":false,"effectZ":0,"actorZ":0,"targetZ":0,"clip":null,"targetAnim":"HURT","flash":true,"flashFrame":3,"number":{"text":"14","font":"DEUS_Pixel","native":true,"scale":1,"color":"#b0b0b0"},"knock":{"x":1,"y":1},"gridMoved":0,"placeholder":true,"bitmap":null,"damageType":"bludgeoning","swings":[{"weaponKey":"slam","hit":true,"damage":14,"attackMod":7,"fromStatBlock":true,"natural":15}],"attackMod":7,"effectiveAC":10,"blood":true}]
EXIT=0

```

Probe A's preliminary troll reach check and printed aboleth save were successful, not findings: the troll closes into reach before all three swings, and the printed save survives the raw-target path. They are included to distinguish discarded hypotheses from the confirmed wolf unprinted-save failure. An earlier attempted combined B/C diagnostic sliced a CRLF-only marker against LF source, accidentally ran the whole existing SRD proof suite and exited before C; that attempt provided no legacy evidence. Probe C above is the corrected standalone run, repeated with a manual stationary hostile to isolate the order lookup.

Additional read-only checks: `git diff --check <merge-base> <writer>` produced no output (exit 0); `git ls-tree -r --name-only <writer> tasks/WG.00.39` listed only BRIEF.md, REPORT.md, lane.json. No separate screenshots/evidence artifacts were present to inspect. Scope comparison returned ALLOWED=True for every row above.

## What changed

- Only tasks/WG.00.39/lane-bg/review_codex_fb6e4e34.md: independent review, full writer hash, scope checks, gate captures and defect reproductions.

## How I tested it

- All six lane.json gateTests rerun; each exit 0.
- --provoke-all: all five intentionally broken checks printed FAIL/CAUGHT; diagnostic exit 0 as documented.
- Four read-only Node probes above exercised actual encounter and legacy-plugin behavior.
- No RMMZ editor F5 or F8 run; no screenshot generated or claimed.

## Evidence

- Raw gates and probes are embedded above.
- Screenshot: none supplied or produced. No visual acceptance claim.

## Not done / known problems

- BG-C01–07 prevent acceptance; no implementation changed.
- Gate success does not cover these defects.
- Stored 0 HP becomes SRD average HP without healing (Probe A); OQ-BG-02 requires Owner resolution.
- Live encounter state retains a worldUnit object reference, contrary to the stable-ID architecture rule; world/order synchronization and save behavior need deliberate integration.
- The new gate does not exercise save/load of newly added dead-record export or persistent orders; existing taming round-trip covers captive/domesticated state only.
- Registration, player-runtime proof, screenshot and F8 checks remain absent.
- Independent Gemini sign-off/WBS transition is outside this review.

## Try it in RMMZ

1. After the integration authority resolves plugin registration and the findings, reopen the project and start F5 Playtest.
2. Domesticate a wolf with an owner, issue follow, attack a numeric-ID target, then hold; observe the world sprite and authoritative unit coordinates.
3. Exercise an actual Wisdom-save spell, a mapped bog_horror's two slams, and a troll reduced to 0 HP without fire/acid suppression.
4. Attempt creature equipment and corrupt saddle stats, compare all combat numbers including legacy timing, then save/load orders and death state.
5. Inspect F8 for new errors and capture/open the relevant screenshots.

Expected: actual world movement and orders agree with the encounter, all combat numbers/actions/defenses use the SRD block, manufactured gear has no mechanical effect, and record/census/save state agrees with the specific death rule. These expected results were not observed in RMMZ in this review.

## Decisions needed

- Return the defects to the writer; no merge recommended.
- Owner questions OQ-BG-01/OQ-BG-02 and inherited OQ-AX-01..08 remain open. This review does not decide them.
- Integration authority must supply the runtime registration/handoff and obtain required visual/editor evidence.

VERDICT: FAIL
