# Independent Review: Lane AX (WG.00.38)

- **Task ID:** WG.00.38 (Capture and domestication of creatures into pets, mounts, livestock and work animals)
- **Lane:** lane-ax
- **Writer:** grok
- **Reviewer:** gemini
- **Reviewed Tip SHA:** `3b9814adced146866a30c95df990027eb3593d25`
- **Merge Base with origin/main:** `2755f61947610723723384ad39ad3fbc92d4679f`

---

## 1. Scope Verification

Diff between merge-base `2755f61947610723723384ad39ad3fbc92d4679f` and reviewed SHA `3b9814adced146866a30c95df990027eb3593d25`:

| Status | File Path | In `lane.json` allowedPaths? | Notes |
|---|---|---|---|
| A | `docs/systems/DEUS_Taming.md` | Yes (`docs/systems/DEUS_Taming.md`) | Systems documentation |
| A | `game/js/plugins/DEUS_Taming.js` | Yes (`game/js/plugins/DEUS_Taming.js`) | Plugin entry point exposing `UF.Taming` |
| M | `game/js/plugins/DEUS_Wildlife.js` | Yes (`game/js/plugins/DEUS_Wildlife.js`) | Targeted hooks for held/domestic creatures |
| A | `game/js/sim/taming/capture.js` | Yes (`game/js/sim/taming/**`) | Subdued checks, SRD check resolution |
| A | `game/js/sim/taming/care.js` | Yes (`game/js/sim/taming/**`) | Feeding, handling checks, role progression |
| A | `game/js/sim/taming/census.js` | Yes (`game/js/sim/taming/**`) | Domestic/captive/wild counts, summary filtering |
| A | `game/js/sim/taming/defaults.js` | Yes (`game/js/sim/taming/**`) | PM defaults, tuning tables, open questions |
| A | `game/js/sim/taming/gear.js` | Yes (`game/js/sim/taming/**`) | DEC-033 gear refusal, visual saddle marker |
| A | `game/js/sim/taming/index.js` | Yes (`game/js/sim/taming/**`) | Headless simulation module factory |
| A | `game/js/sim/taming/record.js` | Yes (`game/js/sim/taming/**`) | Data accessors, condition parsing, hunt checks |
| A | `game/js/sim/taming/save.js` | Yes (`game/js/sim/taming/**`) | State serialization and deserialization |
| A | `tasks/WG.00.38/lane-ax/BRIEF.md` | Yes (`tasks/WG.00.38/**`) | Lane task specification |
| A | `tasks/WG.00.38/lane-ax/REPORT.md` | Yes (`tasks/WG.00.38/**`) | Writer implementation report |
| A | `tasks/WG.00.38/lane-ax/lane.json` | Yes (`tasks/WG.00.38/**`) | Lane definition and gate tests metadata |
| A | `tools/taming/test_taming.js` | Yes (`tools/taming/**`) | Deterministic unit tests and mutant harness |

### Forbidden Paths Check
- `game/js/plugins.js`: UNTOUCHED
- `game/js/plugins/DEUS_Core.js`: UNTOUCHED
- `art/**` / `game/img/**`: UNTOUCHED (Zero art generation; DEC-007 compliant)
- `docs/STATUS.md`: UNTOUCHED
- `docs/OWNER_DECISIONS.md`: UNTOUCHED
- `*WBS*.md`: UNTOUCHED
- Sibling live lanes (AU, AV, AW, AY, AZ, BA): UNTOUCHED

---

## 2. Gate Tests Rerun in Clean Temporary Clone

Executed inside isolated clone `.review_tmp_clone` checked out at `3b9814adced146866a30c95df990027eb3593d25`:

### a. `node tools/taming/test_taming.js`
- **Exit Code:** 0
- **Raw Output:**
```text
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

### b. `node tools/sim/test_wildlife_rules_damage.js`
- **Exit Code:** 0
- **Raw Output:**
```text
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

### c. `node tools/check_deus_syntax.js`
- **Exit Code:** 0
- **Raw Output:**
```text
Checked 59 DEUS plugin files. Errors: 0
```

---

## 3. Spot Checks of Requirements & Claims

1. **Subdued Target Prerequisite:**
   `attemptCapture` verifies target is subdued according to method: `knockout` requires unconscious (`hp <= 0` and alive); `restrained`, `grappled`, `trapped`, `subdued` check corresponding conditions. Standing deer fails with `NOT_SUBDUED`.
2. **Humanoids Refused (SOC.40.03 Out of Scope):**
   Colonists, humanoids, and SRD humanoid stat blocks are refused with `HUMANOID`. Taming records are not attached.
3. **Animal Handling Check Resolution:**
   Checks execute via `UF.Rules.check` using Wisdom (Animal Handling) against typical DC ladder plus `floor(CR * 2)`. Proficiency bonus is applied when handler is proficient. Deterministic seeded RNG verified; no unseeded `Math.random` calls.
4. **Domestication Roles & Care Progression:**
   Care requires owner identity, food, and successful handling check once per subsequent sim hour. Supports all four specified roles: `pet`, `mount`, `livestock`, and `work`. Livestock correctly exports SIM.40.10 metadata (`domestic: true`, `breedingEligible: true`, products); work animals expose `labourHook`.
5. **DEC-033 Gear Restriction:**
   Tamed creatures retain species SRD stat block and natural attacks only. `equipmentSlots()` returns empty array `[]`. `equip()` rejects items with `NO_CREATURE_GEAR`. Riding saddle marker has `{ visual: true, slot: null, stats: null }` and does not alter AC or attacks.
6. **Census & Hunting Integration:**
   Domesticated animals count as `domestic` (not double-counted as wild). `DEUS_Wildlife.js` skips captive/domestic animals in `nearestPrey`. Owner hunt jobs against owned captive/domestic creatures are refused; rival faction hunts are permitted.
7. **Save / Load Integrity:**
   `exportState` and `importState` cleanly round-trip captive and domesticated states. Invalid save versions are rejected safely.
8. **Mutants Killed:**
   All 4 mutation tests (`skip_srd_check`, `allow_equipment_slot`, `lose_tamed_state_on_load`, `double_count_wild`) are verified and killed by the test suite.

---

## 4. Findings

- **BLOCKER:** None.
- **MAJOR:** None.
- **MINOR:** None.

---

VERDICT: CLEAN PASS
