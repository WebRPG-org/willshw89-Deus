# DEUS Race-Class Affinity

**Document ID:** `DEUS-RACE-CLASS-AFFINITY-01`
**Task:** SOC.11.02 (lane-bm)
**Status:** Submitted for independent review. This lane does not mark the task done.
**Schema:** `deus-race-class-affinity/1.0.0`
**Authority:** DEC-036. Race and class ids are the existing catalogue ids named below. DEC-013 item 5 fixes the race count at nine. SOC.10.01 stores class on the person as `srd:class:*` and allows any class for any race.

No art and no audio are specified here. This file does not change WBS status, owner decisions, or the duty scheduler.

## 1. Purpose

Each of the nine races has three affinity classes. Affinity is a preference: a small bonus and a town job-pick weight, both still unset. It is not a gate. The table lists every race with every class, and every one of those 108 pairs is legal.

The canonical document is `game/data/society/race_class_affinity.json`. The shape is `game/data/society/race_class_affinity.schema.json`. Cross-record rules and the safe readers live in `tools/society/test_race_class_affinity.js`.

## 2. Files

| Path | Role |
|---|---|
| `docs/systems/DEUS_RaceClassAffinity.md` | This spec. |
| `game/data/society/race_class_affinity.schema.json` | Closed document shape. Draft 2020-12. |
| `game/data/society/race_class_affinity.json` | The nine races, twelve classes, 27 affinity cells, and 81 other legal cells. |
| `tools/society/test_race_class_affinity.js` | Validator, readers, and one negative fixture per rule. |

```
node tools/society/test_race_class_affinity.js
```

An error is `{ code, path, message }`. Schema failures use the code `schema`. Exit 0 when every check passes.

## 3. Identifier mapping

DEC-036 names races and classes in words. The repositories that already store those ids do not use one spelling.

| Form | Where it already lives | Example |
|---|---|---|
| `srd:race:*`, `srd:class:*` | `game/data/srd51/character_options.json` (`kind` race or class). Person identity stores the class form. | `srd:class:fighter` |
| Catalogue display name | `name` on those catalogue rows, and on `game/data/srd5_1/classes_reference.json` / `species_reference.json` | `Fighter`, `Half-Elf` |
| Bare class slug | `classes_reference.json` `id` | `fighter` |
| Species slug | `species_reference.json` `id`. Hyphens in the SRD slug become underscores. | `half_elf` |
| Faction short id | `DEUS_Factions.js` `SPECIES_MAP` keys | `half-elf` |
| Plan class token | `game/data/plans/faction_plan.schema.json` `$defs.classId`, except `NONE` | `FIGHTER` |
| DEC-036 spelling | The decision table. `Half-elf` and `Half-orc` differ in case from the catalogue's `Half-Elf` and `Half-Orc`. | `Half-elf` |

The affinity document stores every form on the race or class row. `resolveRace` and `resolveClass` accept any one of that row's forms and return the `srd:*` id. A token that hits two rows is `ambiguous`. A token that hits none is `unknown-id`. `NONE` is a legal person-identity class and is not an affinity row. Subraces are not races in this table.

<!-- race-identifiers -->
| Human | Human | srd:race:human | human | human |
| Dwarf | Dwarf | srd:race:dwarf | dwarf | dwarf |
| Elf | Elf | srd:race:elf | elf | elf |
| Half-elf | Half-Elf | srd:race:half-elf | half-elf | half_elf |
| Halfling | Halfling | srd:race:halfling | halfling | halfling |
| Gnome | Gnome | srd:race:gnome | gnome | gnome |
| Half-orc | Half-Orc | srd:race:half-orc | half-orc | half_orc |
| Tiefling | Tiefling | srd:race:tiefling | tiefling | tiefling |
| Dragonborn | Dragonborn | srd:race:dragonborn | dragonborn | dragonborn |
<!-- /race-identifiers -->

Columns: DEC-036 spelling, catalogue name, `raceId`, faction short id, species-reference id. Row order is the DEC-036 table.

<!-- class-identifiers -->
| Barbarian | srd:class:barbarian | barbarian | BARBARIAN |
| Bard | srd:class:bard | bard | BARD |
| Cleric | srd:class:cleric | cleric | CLERIC |
| Druid | srd:class:druid | druid | DRUID |
| Fighter | srd:class:fighter | fighter | FIGHTER |
| Monk | srd:class:monk | monk | MONK |
| Paladin | srd:class:paladin | paladin | PALADIN |
| Ranger | srd:class:ranger | ranger | RANGER |
| Rogue | srd:class:rogue | rogue | ROGUE |
| Sorcerer | srd:class:sorcerer | sorcerer | SORCERER |
| Warlock | srd:class:warlock | warlock | WARLOCK |
| Wizard | srd:class:wizard | wizard | WIZARD |
<!-- /class-identifiers -->

Columns: display name (DEC-036 and the catalogue use the same word), `classId`, bare slug, faction-plan token. Row order is the order of `kind: "class"` entries in `character_options.json`.

## 4. Document

| Field | Meaning |
|---|---|
| `schemaVersion` | `deus-race-class-affinity/1.0.0` |
| `authority` | `DEC-036` |
| `legalPolicy` | `every-combination-legal` |
| `roleDistribution` | The one-tank, one-healer, one-damage rule, and `rangerCountsAs: "tank"` |
| `unset` | Global sentinels for bonus and job-pick weight, plus the unapproved playtest notes |
| `sources` | The catalogue paths the ids were taken from |
| `races` | Nine rows, DEC-036 order |
| `classes` | Twelve rows, catalogue order |
| `affinityRows` | The three class ids per race, in the DEC-036 order |
| `cells` | One cell per race-class pair: race-major DEC-036 order, class-minor catalogue order |

A cell:

| Field | Affinity cell | Other legal cell |
|---|---|---|
| `legal` | `true` | `true` |
| `affinity` | `true` | `false` |
| `role` | `tank` or `OWNER_TODO` | `null` |
| `bonus` | `OWNER_TODO` | `null` |
| `jobPickWeight` | `OWNER_TODO` | `null` |

`null` on a non-affinity cell means that cell has no affinity bonus and no affinity weight. It is not the number 0. The schema also accepts a JSON number on `bonus` and `jobPickWeight`, and accepts `tank`, `healer`, and `damage` on `role`, so a later Owner value fits the shape. The content rules reject those values in this document.

The schema is closed. A `locked` property is not a field. The validator implements the draft 2020-12 keywords it lists and rejects any other keyword.

## 5. Decided affinity rows

<!-- dec036-affinity-rows -->
| Human | Fighter | Wizard | Cleric |
| Dwarf | Paladin | Cleric | Rogue |
| Elf | Ranger | Druid | Sorcerer |
| Half-elf | Fighter | Druid | Bard |
| Halfling | Fighter | Druid | Rogue |
| Gnome | Fighter | Cleric | Wizard |
| Half-orc | Barbarian | Druid | Fighter |
| Tiefling | Fighter | Warlock | Cleric |
| Dragonborn | Fighter | Monk | Cleric |
<!-- /dec036-affinity-rows -->

Each race has those three classes and no others. The order is the order in DEC-036. The other nine classes for that race stay in the matrix with `affinity: false` and `legal: true`.

## 6. Role tags

DEC-036 item 3 says each race favours one tank, one healer, and one damage class, and that Ranger counts as a tank. The decision names no other class's role. Filling Fighter, Cleric, Wizard, Paladin, Rogue, Druid, Bard, Barbarian, Sorcerer, Warlock, or Monk with a role would be a classification this lane does not have.

<!-- decided-roles -->
| Elf | Ranger | tank |
<!-- /decided-roles -->

That is the only concrete role tag in the file. The other 26 affinity cells, including both example rows below, store `OWNER_TODO`.

DEC-036 item 4 names these rows as examples of tags that stay open:

| Race | Affinity classes | Role on each |
|---|---|---|
| Half-elf | Fighter, Druid, Bard | `OWNER_TODO` |
| Half-orc | Barbarian, Druid, Fighter | `OWNER_TODO` |

`roleDistribution` records the rule the Owner's future tags have to meet: `one-tank-one-healer-one-damage`, roles `tank`, `healer`, `damage` in that order, and `rangerCountsAs` `tank`. This document does not claim the open cells already satisfy that rule.

## 7. Unset numbers

Bonus size and job-pick weight are `OWNER_TODO` on every affinity cell and on `unset`. The playtest notes in DEC-036 item 4 are recorded and not applied.

<!-- playtest-suggestions -->
| +1 on class main rolls |
| ~10% faster class XP |
| ~1.5x job-pick weight |
<!-- /playtest-suggestions -->

`unset.playtestSuggestions.status` is `unapproved`, `applied` is `false`, and `pendingOwnerRuling` is `true`. The statements are text. `unapprovedSuggestionEffects` returns null for the roll bonus, the XP rate, and the weight multiplier. It does not parse the statements.

`readAffinityBonus` and `readJobPickWeight` return `applied: false` and a null magnitude.

| Cell | Bonus reason | Weight reason |
|---|---|---|
| Affinity, sentinel | `OWNER_TODO` | `OWNER_TODO` |
| Not an affinity, nulls | `no-affinity` | `no-affinity` |
| A number stuffed into the cell | `unapproved` | `unapproved` |

A stuffed number is not copied into the result. The result is not 1 and not 1.5.

## 8. No hard lock

`admission(doc, race, class)` on any of the 108 pairs returns `usable: true`, `legal: true`, and `excluded: false`. Affinity does not change `legal`. An unknown token (`goblin`, `NONE`, `psion`) returns `reason: "unknown-id"` and `excluded: false`. That is an id outside the nine-by-twelve matrix, and the reader does not drop a real pair.

A cell with `legal: false` fails `no-hard-lock`. `schedulerView` then returns `ok: false` and does not emit a candidate list.

## 9. Readers

These functions are the contract. SOC.13 implements the same behavior beside the scheduler. It does not import this test file.

| Function | Result |
|---|---|
| `validateDocument(doc, options)` | Sorted errors. `options.disable` turns off named rules, including `schema`. |
| `resolveRace(doc, token)` / `resolveClass(doc, token)` | `{ ok, raceId \| classId }` or `{ ok: false, reason }`. |
| `readAffinityBonus(cell)` | `{ applied: false, value: null, reason }`. |
| `readJobPickWeight(cell)` | `{ applied: false, multiplier: null, reason }`. |
| `unapprovedSuggestionEffects(doc)` | `{ rollBonus: null, xpRate: null, weightMultiplier: null }`. |
| `admission(doc, raceToken, classToken)` | Usable only for a legal matrix pair. `excluded` stays false. |
| `schedulerView(doc)` | 108 rows when the document validates. Every row is legal, included, and has no applied bonus or weight. |

## 10. SOC.13 candidate weight

<!-- scheduler-boundary -->
SOC.13.01 reads candidate weights later. This lane does not implement the scheduler and does not apply a number while a value is OWNER_TODO.
<!-- /scheduler-boundary -->

When SOC.13.01 is built, it keeps every validated race-class pair eligible. It multiplies a job-pick weight only after an Owner decision replaces `OWNER_TODO` and this contract is updated to return that number. Until then it leaves its own base weight alone: `readJobPickWeight` reports the multiplier as not applied, and the unapproved `~1.5x` note is not a multiplier. The same holds for the class-roll bonus and the class XP rate. Role tags that are still `OWNER_TODO` are not inferred. Current Duty stays operational state (INV-SOC-02). Affinity does not write craft, office, or class.

This lane does not edit scheduler code, job assignment, or `game/js/**`.

## 11. Rules and fixtures

Each fixture mutates the canonical document in memory. Full validation must report that one code and no other. Validation with that code disabled must report nothing. The canonical file on disk is not modified.

<!-- validator-rules -->
| schema |
| race-set |
| race-order |
| class-set |
| class-order |
| race-alias |
| class-alias |
| dec036-label |
| complete-matrix |
| duplicate-cell |
| cell-order |
| no-hard-lock |
| affinity-count |
| affinity-membership |
| affinity-order |
| affinity-cells |
| ranger-is-tank |
| undecided-role |
| role-distribution |
| bonus-unset |
| weight-unset |
| affinity-value-pairing |
| suggestions-unapproved |
<!-- /validator-rules -->

`schema` has four fixtures: a `locked` field, an extra root property, a missing `authority`, and a non-string `schemaVersion`. The other rules have one fixture each. `bonus-unset` writes `1` onto Human Fighter. `weight-unset` writes `1.5`. `undecided-role` writes `healer` onto Half-elf Fighter. `dec036-label` rewrites the decision spelling `Half-elf` as the catalogue spelling `Half-Elf`.

## 12. Checks

| Check | Proves |
|---|---|
| `canonical-valid` | The authored file has zero errors. |
| `matrix-108-legal` | 108 cells, each `legal: true`. |
| `affinity-rows-27` | 27 affinity cells, matching the nine decided rows. |
| `one-decided-role` | One `tank` tag and 26 `OWNER_TODO` affinity roles. |
| `identifier-resolution` / `class-id-forms` | Every stored alias resolves to one `srd:*` id. `elf` is not `half-elf`. |
| `every-pair-admitted` | The reader admits all 108 pairs and applies no number. |
| `suggestions-have-no-numeric-effect` | The playtest sentences do not become 1, 10%, or 1.5. |
| `scheduler-view-applies-nothing` | A valid table yields 108 included candidates and no weight. |
| `mutant <id>` | The named fixture kills exactly its rule. |
| `every-rule-has-a-killed-mutant` | Schema plus every content rule has a fixture. |

There is no save key and no event. The table is static content. It is not written into a save by this lane.

## 13. Open Owner values

These stay `OWNER_TODO` until the Owner rules. This lane does not pick them.

1. Bonus size.
2. Job-pick weight.
3. Role tags other than Elf Ranger = tank, including the Half-elf and Half-orc rows.
4. Whether the three playtest sentences are adopted.
