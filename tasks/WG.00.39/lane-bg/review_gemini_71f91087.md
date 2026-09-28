# Independent Gemini Review — WG.00.39 / lane-bg

Review date: 2026-09-27. Writer: Grok. Reviewer: Gemini.
Full reviewed writer hash: `71f91087d1cf2f2533be03801c22c9303602709f` (`71f91087`).
Branch: `task/lane-bg`. Merge base with `origin/main`: `ecc7b8984a0ab1a919595c792f98a60f18872f73`.

## Identity and Review Boundary

Before reviewing code and running verification checks, inspected the repository state:
- Branch: `task/lane-bg`
- Base commit: `ecc7b8984a0ab1a919595c792f98a60f18872f73`
- Writer tip: `71f91087d1cf2f2533be03801c22c9303602709f`
- Clean working directory (excluding ops launch artifacts in untracked `tasks/WG.00.39/lane-bg/launches/`).
- Full merge-base-to-writer diff was inspected (`git diff --name-only ecc7b8984a0ab1a919595c792f98a60f18872f73 71f91087`).

No implementation was patched, no merge was performed, no branch pushed, and no WBS/status file edited.

## Scope and Allowlist Verification

All 19 paths modified across the merge-base-to-writer range fall strictly within `allowedPaths` declared in `lane.json`:

| Changed Path | Allowlist Pattern | Status |
|---|---|---|
| `docs/systems/DEUS_TamedPartyCombat.md` | `docs/systems/DEUS_TamedPartyCombat.md` | ALLOWED |
| `game/js/plugins/DEUS_Combat.js` | `game/js/plugins/DEUS_Combat.js` | ALLOWED |
| `game/js/plugins/DEUS_CombatRT.js` | `game/js/plugins/DEUS_CombatRT.js` | ALLOWED |
| `game/js/plugins/DEUS_Taming.js` | `game/js/plugins/DEUS_Taming.js` | ALLOWED |
| `game/js/sim/combat_rt/engine.js` | `game/js/sim/combat_rt/**` | ALLOWED |
| `game/js/sim/combat_rt/index.js` | `game/js/sim/combat_rt/**` | ALLOWED |
| `game/js/sim/combat_rt/ui.js` | `game/js/sim/combat_rt/**` | ALLOWED |
| `game/js/sim/taming/census.js` | `game/js/sim/taming/**` | ALLOWED |
| `game/js/sim/taming/index.js` | `game/js/sim/taming/**` | ALLOWED |
| `game/js/sim/taming/party.js` | `game/js/sim/taming/**` | ALLOWED |
| `game/js/sim/taming/record.js` | `game/js/sim/taming/**` | ALLOWED |
| `game/js/sim/taming/save.js` | `game/js/sim/taming/**` | ALLOWED |
| `tasks/WG.00.39/lane-bg/BRIEF.md` | `tasks/WG.00.39/**` | ALLOWED |
| `tasks/WG.00.39/lane-bg/REPORT.md` | `tasks/WG.00.39/**` | ALLOWED |
| `tasks/WG.00.39/lane-bg/escalation.md` | `tasks/WG.00.39/**` | ALLOWED |
| `tasks/WG.00.39/lane-bg/lane.json` | `tasks/WG.00.39/**` | ALLOWED |
| `tasks/WG.00.39/lane-bg/launches/20260927_164902_prompt.txt` | `tasks/WG.00.39/**` | ALLOWED |
| `tasks/WG.00.39/lane-bg/review_codex_fb6e4e34.md` | `tasks/WG.00.39/**` | ALLOWED |
| `tools/taming_party/test_tamed_party_combat.js` | `tools/taming_party/**` | ALLOWED |

NO ART / NO AUDIO: Absolutely zero art or audio files (`art/**`, `game/img/**`, `audio/**`) were touched, created, or requested (DEC-007 compliant).

## Closure of Previous Codex Findings (fb6e4e34)

1. **BG-C01 (BLOCKER — Natural-only boundary admits manufactured weapons; legacy gear changes timing): CLOSED.**
   `party.js` filters out manufactured weapons via `isManufacturedAction`, cross-referencing `game/data/srd51/equipment.json` and dropping weapon names and thrown/ranged attacks (e.g. Hill Giant's greatclub and rock). In `DEUS_Combat.js`, `computeWeapon` routes tamed creatures strictly through `tamedWeaponProfile`, completely bypassing `slotItem(unit, "mainHand")`. A tamed Hill Giant with a Long sword equipped remains `fists` at speed 4. Equipment slots remain strictly `[]`.

2. **BG-C02 (MAJOR — Actual spell saves use default ability scores rather than SRD scores): CLOSED.**
   `combat_rt/engine.js` `resolveSpell` passes `rulesCombatant(target)` (`Party.rulesBody(target)`), which strips default `stats`. `UF.Rules.savingThrow` resolves `creatureOf(unit).abilities` from the SRD stat block. An unprinted Wisdom save for a wolf (Wis 12, +1 mod) against DC 11 on roll 10 now resolves as 10 + 1 = 11 >= 11 (`saveOk: true`, 0 damage dealt). Printed saving throws (e.g. Aboleth Wis +6) are preserved.

3. **BG-C03 (MAJOR — Legacy attack-target order loses numeric world targets): CLOSED.**
   `party.js` `keptTarget` preserves numeric IDs without stringification. `DEUS_Combat.js` preserves numeric target IDs and `byId.get(c.targetId)` successfully finds numeric unit 9, dealing damage. `engine.js` `get(id)` converts to `String(id)` internally, supporting both lookup modes.

4. **BG-C04 (MAJOR — Encounter follow and live world orders diverge from world truth): CLOSED.**
   `combat_rt/engine.js` `syncWorldUnit` synchronizes grid position (`x`, `y`, `z`) and HP back to `worldUnit` on steps, knockback, damage, heal, and turn ticks. In `party.js`, `orderOf` checks `sharedRecord(unit).order` first, so `UF.Taming.issueOrder` on the world record immediately updates `peekAction` and `decide`. Legacy `followTamed` uses `chase` toward the owner and stops adjacent.

5. **BG-C05 (MAJOR — A mapped creature's explicit two natural attacks become one): CLOSED.**
   `party.js` `parseMultiattack` recognizes `makes (count) (name) attacks`, correctly parsing "makes two slam attacks". Shambling Mound (`bog_horror`) sequence is `["slam", "slam"]`, with `multiattackParsed: true`, delivering two distinct slam swings in the encounter and in legacy `Combat.resolveAttack`.

6. **BG-C06 (MAJOR — Required stat-block defenses/death exceptions omitted): CLOSED.**
   Pack Tactics is evaluated in `Party.packAdvantage` and grants attack roll advantage in both the encounter engine and `DEUS_Combat.js`. Regeneration is evaluated in `Party.beginTurn`. The troll's stat-block death exception ("dies only if it starts its turn with 0 hit points and does not regenerate") is respected: at 0 HP from non-suppressed damage, death is deferred (`dead: false`, pose `HURT`); next turn heals 10 HP. Acid or fire damage suppresses regeneration, correctly causing death at the start of the next turn.

7. **BG-C07 (MAJOR — Player-runtime delivery and registration): CLOSED.**
   The registered plugin `game/js/plugins/DEUS_Combat.js` (line 157 in `plugins.js`) hooks `Game_Map.prototype.update` to call `driveTamedFrame(1000 / 60)`. Every frame, `driveTamedFrame` enlists domesticated pets and their owner into the real-time engine, brings in nearby hostiles, runs `advanceReal`, and synchronizes positions and HP to world units. In legacy mode (`tamedEncounter = false`), `runLevelTick` runs `followTamed`, `applyTamedOrder`, and `legacyTurnClock`. Registration for `DEUS_Taming` and `DEUS_CombatRT` is cleanly requested in `tasks/WG.00.39/lane-bg/escalation.md` without modifying out-of-scope files.

8. **BG-C08 (MINOR — Mutation coverage narrow): CLOSED.**
   18 distinct, independent provocations are implemented and verified via `--provoke-all`, confirming that each individual guard can fail and is caught.

## Verification Commands and Gate Outputs

All gate tests and provocations were independently executed in the foreground from this worktree. Every command exited with code 0:

### 1. tools/taming_party/test_tamed_party_combat.js
```text
COMMAND: node tools/taming_party/test_tamed_party_combat.js
PASS provocation anchors
PASS membership
PASS srd
PASS gear_bonus
PASS death
PASS orders
PASS natural
PASS saves — {"saveOk":true,"damage":0}
PASS target_id
PASS legacy_lookup
PASS order_sync — {"record":{"type":"hold","targetId":null},"peek":{"type":"hold"}}
PASS world_sync — world 5,-1 enc 5,-1
PASS slams — seq slam,slam parsed true swings slam,slam
PASS pack — {"weaponKey":"bite","hit":true,"damage":8,"attackMod":4,"fromStatBlock":true,"natural":15,"advantage":true}
PASS regen — hp 84 dead false
PASS death_rule
PASS legacy_gear — {"bare":{"speed":4,"range":1,"style":"accurate","attackType":"crush","weapon":"fists","weaponType":null,"ranged":false,"ammo":null,"outOfAmmo":null},"geared":{"speed":4,"range":1,"style":"accurate","attackType":"crush","weapon":"fists","weaponType":null,"ranged":false,"ammo":null,"outOfAmmo":null}}
PASS legacy_follow — 5,0 apart 1
PASS runtime — world 5,-1 snap 5,-1 apart 1 swings 2
PASS provocation membership is caught — captive joined JOIN
PASS provocation srd is caught — hp 99/99 want 11; wound 4/99; troll numbers {"ac":15,"hp":99,"speed":30}
PASS provocation gear_bonus is caught — ac 30 block 13 dirty 18; attack 7 2d4+2; equip changed numbers
PASS provocation death is caught — record {"status":"domesticated","dead":false}; census {"wild":0,"domestic":2,"captive":0,"dead":0,"byRole":{"pet":1,"mount":0,"livestock":1,"work":0},"total":2}; dead enlist left domesticated
PASS provocation orders is caught — peek {"type":"hold","targetId":null}; follow position 0,0; no follow event
PASS provocation natural is caught — manufactured greatclub,rock; sequence greatclub,greatclub; key greatclub
PASS provocation saves is caught — {"saveOk":false,"damage":5}
PASS provocation target_id is caught — stored {"type":"attack","targetId":"9"}; hp 40
PASS provocation legacy_lookup is caught — target null; hp 40
PASS provocation order_sync is caught — {"record":{"type":"hold","targetId":null},"peek":{"type":"follow","targetId":"1"}}
PASS provocation world_sync is caught — world 0,0 enc 5,-1
PASS provocation slams is caught — seq slam parsed false swings slam
PASS provocation pack is caught — {"weaponKey":"bite","hit":true,"damage":8,"attackMod":4,"fromStatBlock":true,"natural":15,"advantage":false}
PASS provocation regen is caught — hp 74 dead false
PASS provocation death_rule is caught — slash r1 {"hp":0,"dead":true,"status":"dead"}; slash r2 {"hp":0,"dead":true,"status":"dead","knock":false}; fire r1 {"hp":0,"dead":true,"status":"dead"}
PASS provocation legacy_gear is caught — {"bare":{"speed":4,"range":1,"style":"accurate","attackType":"crush","weapon":"fists","weaponType":null,"ranged":false,"ammo":null,"outOfAmmo":null},"geared":{"speed":5,"range":1,"style":"accurate","attackType":"slash","weapon":"Long sword","weaponType":"sword_long","ranged":false,"ammo":null,"outOfAmmo":null}}
PASS provocation legacy_follow is caught — 0,0 apart 6
PASS provocation runtime is caught — world 5,0 snap null apart 99 swings 2
PASS open role questions stay listed — OQ-BG-01,OQ-BG-02
RESULT: 38 passed, 0 failed
EXIT=0
```

### 2. tools/taming/test_taming.js
```text
COMMAND: node tools/taming/test_taming.js
PASS SRD ladder — easy 10 medium 15
PASS PM capture names use that ladder
...
OK 0 failed
EXIT=0
```

### 3. tools/combat_rt/test_combat_rt.js
```text
COMMAND: node tools/combat_rt/test_combat_rt.js
...
RESULT: 64 passed, 0 failed
EXIT=0
```

### 4. tools/test_srd_combat_proof.js
```text
COMMAND: node tools/test_srd_combat_proof.js
...
Results: 43 passed, 0 failed
SRD Combat Proof Suite PASSED (100%).
EXIT=0
```

### 5. tools/sim/test_wildlife_rules_damage.js
```text
COMMAND: node tools/sim/test_wildlife_rules_damage.js
...
OK 0 failed
EXIT=0
```

### 6. tools/check_deus_syntax.js
```text
COMMAND: node tools/check_deus_syntax.js
Checked 60 DEUS plugin files. Errors: 0
EXIT=0
```

### 7. Provocations Check (--provoke-all)
```text
COMMAND: node tools/taming_party/test_tamed_party_combat.js --provoke-all
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
FAIL natural — manufactured greatclub,rock; sequence greatclub,greatclub; key greatclub
CAUGHT natural
FAIL saves — {"saveOk":false,"damage":5}
CAUGHT saves
FAIL target_id — stored {"type":"attack","targetId":"9"}; hp 40
CAUGHT target_id
FAIL legacy_lookup — target null; hp 40
CAUGHT legacy_lookup
FAIL order_sync — {"record":{"type":"hold","targetId":null},"peek":{"type":"follow","targetId":"1"}}
CAUGHT order_sync
FAIL world_sync — world 0,0 enc 5,-1
CAUGHT world_sync
FAIL slams — seq slam parsed false swings slam
CAUGHT slams
FAIL pack — {"weaponKey":"bite","hit":true,"damage":8,"attackMod":4,"fromStatBlock":true,"natural":15,"advantage":false}
CAUGHT pack
FAIL regen — hp 74 dead false
CAUGHT regen
FAIL death_rule — slash r1 {"hp":0,"dead":true,"status":"dead"}; slash r2 {"hp":0,"dead":true,"status":"dead","knock":false}; fire r1 {"hp":0,"dead":true,"status":"dead"}
CAUGHT death_rule
FAIL legacy_gear — {"bare":{"speed":4,"range":1,"style":"accurate","attackType":"crush","weapon":"fists","weaponType":null,"ranged":false,"ammo":null,"outOfAmmo":null},"geared":{"speed":5,"range":1,"style":"accurate","attackType":"slash","weapon":"Long sword","weaponType":"sword_long","ranged":false,"ammo":null,"outOfAmmo":null}}
CAUGHT legacy_gear
FAIL legacy_follow — 0,0 apart 6
CAUGHT legacy_follow
FAIL runtime — world 5,0 snap null apart 99 swings 2
CAUGHT runtime
RESULT: 18 provocations caught, 0 missed
EXIT=0
```

## Independent Verification Probes

1. **Natural-Attack Isolation and Equipment Invariance**:
   Tested Hill Giant (`srd:creature:hill-giant`): actions `greatclub` and `rock` are excluded by `naturalActions(actions, rules)`. Profile attacks and sequence are empty. In legacy combat `describeAttack(bareGiant, hostile)` vs with `bareGiant.data.equipment = { mainHand: "sword_long" }`:
   `bare: fists speed 4` | `geared: fists speed 4`. Equipment has zero effect.

2. **SRD Ability Scores & Spell Saves**:
   Tested Wolf (`srd:creature:wolf`, unprinted Wis 12 / +1) subjected to DC 11 Wisdom save with roll 10:
   `{"saveOk": true, "damage": 0, "natural": 10}`. Ability scores correctly derived from SRD block.

3. **Numeric Target Identity**:
   Tested issuing order `{ type: "attack", targetId: 9 }`.
   `targetId` remains numeric `9` (type `number`). `byId.get(c.targetId)` in legacy combat ticks hits unit 9, reducing HP from 40 to 35.

4. **Order and Position Synchronization**:
   Encounter follower stepped from (0,0) toward anchor at (6,0); at tick 6000, `enc: 5, -1` and `world: 5, -1`. `syncWorldUnit` synchronizes coordinates and HP. `issueOrder(world, { type: "hold" })` immediately updates `peekAction` to `{ type: "hold" }`.

5. **Multiattack Parsing**:
   Tested Shambling Mound (`bog_horror`): "makes two slam attacks" parsed to `sequence: ["slam", "slam"]`, executing 2 distinct slam swings in the encounter transcript and legacy combat.

6. **Defenses & Death Exceptions**:
   Tested Troll (`srd:creature:troll`): Slashing damage reducing HP to 0 leaves troll alive at 0 HP (`dead: false`, `status: "domesticated"`). Start of next turn restores 10 HP. Fire damage reducing HP to 0 suppresses regeneration; start of next turn marks troll dead (`dead: true`, `cause: "no-regeneration"`).

7. **Registered Runtime Delivery**:
   `DEUS_Combat.js` is registered in `game/js/plugins.js`. Its `Game_Map.prototype.update` hook executes `driveTamedFrame(1000 / 60)` each frame, enlisting tamed units into `tamedEngine()`, stepping followers, executing natural attacks, and synchronizing position and HP back to world units.

## Findings Ranked

### BLOCKER
None.

### MAJOR
None.

### MINOR
None.

## Notes for Integration
- `tasks/WG.00.39/lane-bg/escalation.md` details the requested registration entries for `DEUS_Taming` and `DEUS_CombatRT` in `game/js/plugins.js` immediately following `DEUS_Combat`.
- Open questions OQ-BG-01 and OQ-BG-02 remain listed and unanswered per policy.

VERDICT: CLEAN PASS
