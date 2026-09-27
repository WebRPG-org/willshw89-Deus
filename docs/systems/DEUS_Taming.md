# Taming

Capture and domestication of wildlife and monsters (WG.00.38, DEC-033). Headless rules live in `game/js/sim/taming`. `DEUS_Taming.js` publishes `UF.Taming` and does not load art.

Humanoid prisoners and recruitment are SOC.40.03. Party combat with a tamed creature is WG.00.39. This lane does not edit combat files.

## API

`createTaming(rules, opts)` takes a `UF.Rules` object. `opts.seed` or `opts.rng` supplies the dice. `opts.humanoidTypes` is an id-to-type map used to refuse SRD humanoids. `opts.defaults` overrides the PM table one level deep.

| Call | Result |
|---|---|
| `attemptCapture(actor, target, method, call)` | Wisdom (Animal Handling) check. On a success the target's `data.taming.status` is `"captive"`. |
| `tend(actor, target, call)` | One care point when the owner feeds the animal and passes the handling check in a later sim hour. |
| `tickNeglect(units, hour)` | Reverts a held animal only when `neglect.enabled` is true and the quiet hours have elapsed. |
| `equipmentSlots(unit)` | Always an empty list. |
| `equip(unit, slot, item)` | Always `{ ok: false, reason: "NO_CREATURE_GEAR" }`. |
| `markSaddle(unit)` | Writes a visual saddle marker on a domesticated animal. |
| `attacks(unit)` / `statBlock(unit)` | The mapped SRD 5.1 natural attacks and stat block. |
| `domesticRecord(unit)` | `{ domestic: true, ownerId, factionId, species, role, breedingEligible, products, labour }` for a domesticated animal. |
| `livestockRecord(unit)` | That record when the role is `livestock`. This is the SIM.40.10 hook. It does not run breeding. |
| `labourHook(unit)` | `{ hauling: true, labour: true, ownerId, factionId, species }` when the role is `work`. |
| `census(units)` | `{ wild, domestic, captive, byRole, total }`. A domesticated animal is counted once, as domestic. |
| `exportState(units)` / `importState(units, blob)` | Version-1 rows for captive and domesticated animals. |
| `mayHunt(hunter, prey)` | False when the hunter's id or faction owns a captive or domesticated animal. |
| `refuseHuntJob(spec, lookup)` | True when `spec.type` is `"hunt"` and `mayHunt` is false. |

`call.roll` fixes the d20. `call.rng` is `() => number` in `[0, 1)`. `call.hour` is the sim hour. `call.food` must be true to gain a care point. `call.role` is `pet`, `mount`, `livestock`, or `work`.

The plugin forwards those calls and, when the hosts exist, aliases `UF.Jobs.create` and `UF.Ecology.population`. `world:created` installs the aliases again if those plugins were not up at load.

## Capture

The method is one of `knockout` (also `unconscious`), `restrained`, `grapple` / `grappled`, `trap` / `trapped`, or `subdue` / `subdued`.

The target has to already be in that state. Knockout means hit points are 0 or below and the animal is not dead. Dead means `data.dead`, `data._isDying`, or hit points at or below the negative of the SRD average (or `data.maxHp` when that is set). Grapple, restrained, and trapped are read off `data.conditions` or `data.trapped`. This lane does not run the grapple attack and does not add a knockout choice to combat.

The check is `UF.Rules.check(actor, "wis", dc, { skill: "animal handling", proficient, rng })`. Proficiency is added when `data.skillProficiencies` or `data.proficientSkills` lists Animal Handling. The DC is `UF.Rules.dc` of the method's ladder name plus `floor(challenge rating * crDcPerPoint)`. A miss leaves the animal wild. A second capture of a held animal returns `ALREADY_HELD` and does not roll.

A colonist, person, or other humanoid kind is refused with `HUMANOID`. An SRD stat block whose catalogue type is `humanoid` is refused the same way. A monster with a species-map stat block, including a troll, can be captured.

Rule text used by the check: `srd:rule:using-ability-scores-using-each-ability` (Wisdom, Animal Handling), `srd:rule:using-ability-scores-ability-checks` (the typical DC ladder), `srd:condition:unconscious`, `srd:condition:restrained`, `srd:condition:grappled`.

## Care and roles

One role is stored on the captive. Food without a successful handling check grants nothing. A failed check spends that sim hour. The next point needs a later hour. At the role's care-point total, status becomes `"domesticated"`. Further tends from the owner refresh `lastCareHour` so neglect, when enabled, sees the visit.

`domesticRecord` sets `domestic: true` and the owner, which is the SIM.40.10 shape for a domesticated animal. `breedingEligible` and the product list are set only for livestock. The product names are data (`wild_sheep` wool, `fowl` eggs, `aurochs` milk). Empty means no named product. Nothing in this module births offspring or posts a ledger row.

`labourHook` is the hauling and labour query for a work animal. It does not create a job.

## Gear

DEC-033 item 3: the creature keeps the species SRD stat block and its natural attacks. `equipmentSlots` is empty. `equip` refuses barding and every other item. `markSaddle` stores `{ id: "riding_saddle", visual: true, slot: null, stats: null }`. Armor Class and the attack list stay the stat block's. A value written on `data.equipment` is not copied into that block. No sprite is requested or stored.

## Counts, hunts, and saves

`census` counts a creature with no held status as wild, `"captive"` as captive, and `"domesticated"` as domestic. People are not in the total.

`DEUS_Wildlife.js` reads the same status strings. `nearestPrey` skips a held animal. For a held grazer, the public `speciesOf` copy reports `prey: false` and leaves the catalogue row unchanged. `hunterOf` returns a hold (`id: 0`, `tamingHold: true`) when the only hunter is the owner, so a colonist prey scan does not take the animal. A different faction's live hunt job is still returned. `populationSummary` uses the taming census. `mayHunt` is the same ownership rule.

`UF.Jobs.create` returns null for an owner's hunt of that owner's captive or domesticated animal. A move, a hunt of a wild animal, and another faction's hunt are passed through. `DEUS_Colonists.js` is not edited. Its `preyNear` already calls `Wildlife.speciesOf` and `Wildlife.hunterOf`. Its `preyYielding` reaches `Jobs.create`.

`UF.Ecology.population`, once aliased, moves held animals out of the prey, monster, predator, and creature buckets and adds `domestic` and `captive`. When nothing is held it returns the original object. The ecology plugin's internal `population` closure, which replenishment calls directly, is not replaced. That file is outside this lane.

`exportState` writes `{ version: 1, rows: [{ unitId, taming }] }`. `importState` copies each row onto the unit. A blob whose version is not 1 does not change units. A wild animal, including one neglect has reverted, is left out of the rows. The record is plain JSON, so a world save of `unit.data` keeps it as well.

Neglect reads `config.neglect`. The shipped table has `enabled: false`. With it on, `tickNeglect` compares the hour with `lastCareHour` and sets status from `revertsTo` (`"wild"` or, for a domesticated animal, `"captive"`).

## PM defaults

`game/js/sim/taming/defaults.js` is `PM_DEFAULT`. Tests resolve the ladder through `UF.Rules.dc` and the care totals through this table.

| Key | Value |
|---|---|
| Capture DC | knockout and trapped: `easy`. Grappled, restrained, and subdued: `medium`. Plus `floor(CR * 2)`. |
| Handling DC | `easy` |
| Care points | pet 3, livestock 4, mount 5, work 6 |
| Hours recorded per point | 8 |
| Neglect | off; 168 hours; reverts to wild |
| Products | wild_sheep wool, fowl eggs, aurochs milk |
| Saddle | visual marker, any domesticated animal |

## Owner questions

These are open. The table above is the PM default, not a ruling.

1. **OQ-AX-01.** Are the capture DCs right, or should capture be a contest against the creature?
2. **OQ-AX-02.** Are the care times right?
3. **OQ-AX-03.** Should a neglected domesticated animal revert?
4. **OQ-AX-04.** May one animal hold two roles?
5. **OQ-AX-05.** Which species give which products?
6. **OQ-AX-06.** Should the saddle marker be limited to mounts?
7. **OQ-AX-07.** Should another faction be able to hunt owned livestock? Wild-prey selection skips every held animal. An explicit hunt job is refused for the owner's faction and allowed for a different faction.
8. **OQ-AX-08.** Should predators ignore owned livestock? `predatorTick` is unchanged, so a wolf can still strike a nearby domesticated grazer. That keeps the SIM.60.07 strike path on the same code.

## Follow-ups

- **PROPOSED-AX-01.** A combat choice to knock a creature out at 0 HP instead of killing it. Combat files are read-only here. Capture already accepts a living target at 0 HP.
- **PROPOSED-AX-02.** Debit fodder through `UF.Items` when a tend passes `food: true`. This lane takes the boolean.
- **PROPOSED-AX-03.** Let `labourHook` satisfy a haul or labour job. `DEUS_Jobs.js` is outside this lane. The `Jobs.create` alias only refuses an owner's hunt.
- **PROPOSED-AX-04.** If OQ-AX-08 is answered by taking livestock off the predator list, that change belongs in `predatorTick`.
- **PROPOSED-AX-05.** Ecology replenishment still counts held animals because it calls its internal `population` closure. The public `UF.Ecology.population` is the one this lane aliases. Changing the closure means editing `DEUS_Ecology.js`.

## Tests

`node tools/taming/test_taming.js` is headless and seeded. It covers a missed and a made Animal Handling check, each role, empty equipment slots, SRD attacks, the save round trip, wild versus domestic counts, and four source mutants: skip the SRD check, allow a barding slot, drop tamed state on load, and count a domesticated animal as wild as well. `node tools/sim/test_wildlife_rules_damage.js` is unchanged.
