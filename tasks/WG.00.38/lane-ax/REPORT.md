# WG.00.38 lane-ax report

Writer: grok. Reviewer: gemini (not run here). This lane does not mark the task DONE.

## What changed

Headless capture and domestication is `game/js/sim/taming`. `DEUS_Taming.js` publishes `UF.Taming` and does not edit `plugins.js`.

`attemptCapture(actor, target, method)` requires a subdued target (restrained, grappled, trapped, subdued, or unconscious at 0 HP and not dead) and resolves Wisdom (Animal Handling) through `UF.Rules` with seeded dice. A miss leaves the animal wild. Humanoids are refused. Care (`tend`) is food plus a handling check, one point per later sim hour, into one role: pet, mount, livestock, or work. Livestock exposes a SIM.40.10 record (`domestic: true`, owner, breeding flag, product names) and does not run breeding. Work animals expose `labourHook` and do not create jobs.

Tamed creatures keep the mapped SRD stat block and natural attacks. `equipmentSlots` is empty. `equip` refuses every item, including barding. A riding saddle is `{ visual: true, slot: null, stats: null }` and does not change Armor Class or attacks.

Captive and domesticated state stores `ownerId` and `factionId` on `unit.data.taming`. `exportState` / `importState` round-trip that record. `census` counts a domesticated animal once, as domestic, and a captive as captive. Neglect exists and is off unless the data enables it.

`DEUS_Wildlife.js` is a targeted hook, not a refactor. `nearestPrey` skips held animals. Public `speciesOf` reports `prey: false` for a held grazer and does not edit the catalogue row. `hunterOf` reports a hold when the only hunter is the owner, which is the call `DEUS_Colonists.preyNear` already makes. `populationSummary` uses the taming census. The predator strike path is untouched; `tools/sim/test_wildlife_rules_damage.js` still passes.

When the plugin loads after Jobs and Ecology, `UF.Jobs.create` refuses an owner's hunt of that owner's held animal, and `UF.Ecology.population` moves held animals into the domestic or captive count. The ecology file's internal replenishment closure is not replaced.

System note: `docs/systems/DEUS_Taming.md`.

## Evidence

Commands from `tasks/WG.00.38/lane-ax/lane.json`, run from the worktree root after the code was in place. Exit code 0 on each.

### `node tools/taming/test_taming.js`

```
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
PASS wild and domestic counts do not double-count — {"wild":2,"domestic":1,"captive":1,"byRole":{"pet":1,"mount":0,"livestock":0,"work":0},"total":4}
PASS the owner may not hunt the captive or the pet
PASS another faction is not refused an explicit hunt by mayHunt
PASS hunt jobs of the owner are refused and other jobs are not
PASS an untouched summary object is returned as-is
PASS held animals leave the wild summary — {"prey":1,"monsters":0,"predators":0,"creatures":1,"bySpecies":{"deer":2,"wolf":0},"domestic":1,"captive":1}
PASS export keeps captive and domestic rows only
PASS a bad save version does not wipe state
PASS save and load round-trip the tamed state — LOADED applied 2
PASS unit data itself round-trips the taming record
PASS neglect is off unless the data enables it — CARED CARED wild DISABLED
PASS a reverted animal counts as wild again — {"wild":1,"domestic":0,"captive":0,"byRole":{"pet":0,"mount":0,"livestock":0,"work":0},"total":1}
PASS a reverted animal is omitted from the captive save
PASS the same seed repeats the check — roll 13 / 13
PASS different seeds can differ — rolls 13 / 6
PASS capture and care did not call Math.random — calls 0
PASS mutant anchors are unique
PASS wildlife strike anchor is still unique
PASS mutant skip_srd_check is caught — CAPTURED
PASS mutant allow_equipment_slot is caught — ["barding"]
PASS mutant lose_tamed_state_on_load is caught — null
PASS mutant double_count_wild is caught — {"wild":3,"domestic":1,"captive":1,"byRole":{"pet":1,"mount":0,"livestock":0,"work":0},"total":5}
PASS wildlife boots
PASS nearestPrey skips captive and domesticated animals — near 2 close null wide 2
PASS public speciesOf drops prey without editing the catalog row
PASS owner hunt jobs do not count as wild hunts
PASS wildlife census moves held animals out of wild — {"wild":2,"domestic":1,"captive":1,"byRole":{"pet":1,"mount":0,"livestock":0,"work":0},"total":4}
PASS wildlife mayHunt matches ownership
PASS the look line no longer calls a pet prey — Wolf · domesticated · pet
PASS plugin publishes UF.Taming.attemptCapture — CAPTURED / HUMANOID / HUMANOID
PASS Jobs.create refuses the owner's hunt and passes every other job — calls 3 refused null
PASS Ecology.population moves held animals and keeps an empty adjustment identical — {"prey":1,"monsters":0,"predators":0,"creatures":1,"bySpecies":{"deer":0,"hare":1},"domestic":1,"captive":0}
OK 0 failed
```

### `node tools/sim/test_wildlife_rules_damage.js`

```
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
```

### `node tools/check_deus_syntax.js`

```
Checked 59 DEUS plugin files. Errors: 0
```

## Owner questions

Open. Defaults live in `game/js/sim/taming/defaults.js` as `PM_DEFAULT`. This report does not pick an answer.

1. **OQ-AX-01.** Are the capture DCs right, or should capture be a contest against the creature? PM default: Wisdom (Animal Handling) against the SRD typical DC (knockout and trapped `easy`, grappled / restrained / subdued `medium`) plus `floor(challenge rating * 2)`.
2. **OQ-AX-02.** Are the care times right? PM default: pet 3, livestock 4, mount 5, work 6 successful tends. Each tend is a later sim hour and records 8 hours.
3. **OQ-AX-03.** Should a neglected domesticated animal revert? PM default: the rule exists and is off. When enabled, 168 hours without care returns the animal to wild.
4. **OQ-AX-04.** May one animal hold two roles? PM default: one role.
5. **OQ-AX-05.** Which species give which products? PM default: wild_sheep wool, fowl eggs, aurochs milk. Other species have no named product. Breeding stays on the SIM.40.10 hook.
6. **OQ-AX-06.** Should the saddle marker be limited to mounts? PM default: any domesticated animal may carry it. It has no slot and no stats.
7. **OQ-AX-07.** Should another faction be able to hunt owned livestock? PM default: wild-prey selection skips every held animal. An explicit hunt job is refused for the owner's faction and allowed for a different faction.
8. **OQ-AX-08.** Should predators ignore owned livestock? PM default: `predatorTick` is unchanged, so a wolf can still strike a nearby domesticated grazer. That keeps the SIM.60.07 strike test on the same code.

## Follow-ups

- **PROPOSED-AX-01.** Add a combat choice to knock a creature out at 0 HP instead of killing it. Combat files are read-only in this lane. Capture already accepts a living target at 0 HP.
- **PROPOSED-AX-02.** Debit fodder through `UF.Items` when a tend passes `food: true`. This lane takes the boolean.
- **PROPOSED-AX-03.** Let `labourHook` satisfy a haul or labour job. `DEUS_Jobs.js` is outside this lane. The `Jobs.create` alias only refuses an owner's hunt.
- **PROPOSED-AX-04.** If OQ-AX-08 is answered by taking livestock off the predator list, that change belongs in `predatorTick`.
- **PROPOSED-AX-05.** Ecology replenishment still counts held animals because it calls its internal `population` closure. This lane aliases the public `UF.Ecology.population` only. Changing the closure means editing `DEUS_Ecology.js`.

Humanoid prisoners stay SOC.40.03. Tamed creatures in party combat stay WG.00.39. No WBS ids were minted.

## Registration request

Add `DEUS_Taming` to `game/js/plugins.js` after `DEUS_Combat` (so `UF.Rules` exists), which is already after `DEUS_Jobs`, `DEUS_Wildlife`, and `DEUS_Ecology`. Do not enable it before those four. Parameters stay empty.

```json
{
  "name": "DEUS_Taming",
  "status": true,
  "description": "[DEUS Taming] Capture and domestication of creatures into pets, mounts, livestock, and work animals.",
  "parameters": {}
}
```
