# Grok review: SOC.20.01 lane-bl correction

Reviewer: Grok. Writer: Gemini. This file is the review of writer tip `a7ba49a53a5877619726d4770266d2a27001323e`. No schema, office record, test, specification, WBS row, or status file was modified.

## Identity

Reviewed writer tip, confirmed with `git rev-parse` and `git log -1 --format=fuller`:

```
a7ba49a53a5877619726d4770266d2a27001323e
deus-gemini <willshw89@gmail.com>
[gemini] SOC.20.01 fix-review: remediate Grok review findings across schema, offices, and test suite
2026-09-27T17:59:19-05:00
parent 8381b5289bb54a5ac55a0aa41edd3e646ac11cca
```

Brief base `a768eba377deab388e5def474a0bb1752fd732c3` is the merge-base of that tip with the brief base. Merge-base of the tip with `origin/main` is `6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0`. Prior Grok failure review is `57cda559f1614e9167edb4d056e89683af49ae09` (`[grok] SOC.20.01 review 786b5084`).

Worktree `HEAD` at review time was `5b024b376bc59c88cec3cb330281e45700cbf1b6` (`[ops] SOC.20.01 lane-bl launch prompt 20260927_180356`). `git diff --stat a7ba49a53a5877619726d4770266d2a27001323e HEAD` is only `tasks/SOC.20.01/lane-bl/launches/20260927_180356_prompt.txt`. Every path in the brief-base-to-writer diff has the same blob in the worktree as in the writer tip (`FILES 28`, `BLOB_MISMATCHES 0`). `core.autocrlf` is `false`. Node is `v24.19.0`.

## Scope

Reviewed range is the lane delivery `a768eba377deab388e5def474a0bb1752fd732c3..a7ba49a53a5877619726d4770266d2a27001323e` (28 files, 3991 insertions). The writer commit itself changes 21 paths (schema, 17 office files including the manifest, the system spec, the test, and `REPORT.md`). The other seven paths are the lane brief, `lane.json`, four launch prompts, and `review_grok_786b5084.md`.

`git diff --name-only` of that range against `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, `docs/society/DEUS_SOCIETY_WBS.md`, and `docs/telemetry/sessions/active_workers.json` is empty. Those four paths differ between `origin/main` and the tip because of ancestor commits `178ef6c9` and `a768eba3`, which sit at or before the brief base. `docs/society/DEUS_SOCIETY_WBS.md` at the tip still reads `PLANNED` for SOC.20.01.

A name filter for `art/`, `game/img/`, `game/audio/`, `.png`, `.ogg`, `.wav`, `.mp3`, `WBS`, `STATUS`, `OWNER_DECISIONS`, and `plugins` on the lane range matched nothing.

| Path | Allowed by |
| --- | --- |
| `docs/systems/DEUS_FactionOffices.md` | `docs/systems/DEUS_FactionOffices.md` |
| `game/data/society/office_schema.json` | `game/data/society/office_schema.json` |
| `game/data/society/offices/*.json` (16 records + `manifest.json`) | `game/data/society/offices/**` |
| `tools/society/test_offices.js` | `tools/society/test_offices.js` |
| `tasks/SOC.20.01/**` | `tasks/SOC.20.01/**` |

Sources read against the tip: `tasks/SOC.20.01/lane-bl/BRIEF.md`, `lane.json`, `docs/OWNER_DECISIONS.md` DEC-015 (point 4, line 231) and DEC-025 (line 349), `docs/INVARIANT_REGISTRY.md` INV-SOC-01 and INV-SOC-06, `docs/systems/DEUS_PersonIdentity.md` lines 66 and 92–98, `docs/systems/DEUS_FactionPlans.md` §4.3 and open question 6, `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md` §3 and §6–§8, the prior review at `57cda559`, and the production schema plus all 16 office records. Race ids checked in `game/data/srd51/character_options.json`: `dwarf`, `elf`, `halfling`, `dragonborn`, `human`, `gnome`, `half-elf`, `half-orc`, `tiefling`.

## Commands and exits

Worktree, foreground:

| Command | Exit | Result |
| --- | --- | --- |
| `node tools/society/test_offices.js` | 0 | `TEST SUMMARY: 97 PASS, 0 FAIL`. Suite prints `PROVOCATIONS KILLED: 64/64`. |
| `node tools/check_deus_syntax.js` | 0 | `Checked 60 DEUS plugin files. Errors: 0` |

Independent probe, exit 0. The probe executed `tools/society/test_offices.js` only through the end of `validateCatalogue`, then loaded `game/data/society/office_schema.json`, all 16 office JSON files, and `manifest.json`, and called `validateOffice` / `validateCatalogue` on those objects and on clones.

| Probe | Validator result |
| --- | --- |
| 16 production records through `validateOffice` | `OFFICE_FAILS 0 OF 16` |
| production map through `validateCatalogue` | `ok=true`, 0 errors |
| manifest rows versus loaded records (`officeId`, function, department, tier, file, aliases) | `MANIFEST_DIFFS []`; aliases length 0 on all 16 rows |
| parent/subordinate walk | `RECIP_FAILS []`; parent-pointer DFS `CYCLES []` |
| ancestry keys and title strings on the 16 records | `ANCESTRY_MISSING []`, `ANCESTRY_INVENTED []`, `ANCESTRY_EXTRA []` |
| `VACANT` + `HOLDER_DECEASED` + capability 1 + `primaryHolderId` `PERSON_184` | rejected, `semantic-vacant-capability-excess` and `semantic-vacant-primary-holder-retained` |
| `SUSPENDED` + capability 0 + `primaryHolderId` `PERSON_184` | rejected, `semantic-vacant-primary-holder-retained` |
| `DORMANT` + capability 0.25 + one co-holder | rejected, capability and co-holder rules |
| `OCCUPIED` + `HOLDER_DECEASED` + capability 1.0 + `primaryHolderId` `PERSON_184` | accepted |
| `ACTING` + `HOLDER_DECEASED` + capability 0.6 + primary `PERSON_184` + acting `PERSON_227` | accepted |
| `OCCUPIED` + `HOLDER_INCAPACITATED` + capability 1.0 + primary holder | accepted |
| degradation `CURRENT_DUTY_SLEEP` and `DUTY` | accepted |
| degradation `currentDuty:DEFEND_GATE` | rejected, `pattern` and `semantic-duty-in-degradation-effects` |
| `officeId` of 65 characters | rejected, `maxLength` |
| `culturalTitles` deleted on `OFFICE_LEADER` | `validateOffice` accepted; `validateCatalogue` accepted |
| `cardinality` `SINGLE` on one record via `validateOffice` | accepted |
| `method` `APPOINTMENT` on one record via `validateOffice` | accepted |
| `baselineHoursPerWeek` 14 via `validateOffice` | accepted |
| catalogue: method `HEREDITARY`, hours 25, `allowConcurrentOffices` true, `maxHolders` 1, craft/class/age/level gates, `appointmentAuthority`, `cultureOutcomeOpen` false | each rejected on its own catalogue rule |
| catalogue: missing parent, missing subordinate, parent/subordinate direction clash, mint `TREASURY_CHEST` | rejected on `catalogue-missing-parent`, `catalogue-missing-subordinate`, `catalogue-parent-mismatch`, `catalogue-inv-soc-06-treasury-chest-leak` |
| catalogue: quartermaster `TAX_DISTRICTS`; treasurer `COMMUNAL_GRANARY` | both accepted |
| replay of the 64 shipped provocations | `REPLAY_KILLED 64 SURVIVED 0 MISMATCH 0` |
| replay of the 6 shipped catalogue fixtures | all 6 hit the rule they name |

Second probe, exit 0. A reciprocal two-cycle (`OFFICE_TAX_COLLECTOR` parent `OFFICE_PAYMASTER` and the reverse, treasurer subordinates cleared) returned `validateCatalogue` `ok=true` and no errors. A reciprocal three-cycle of tax collector, paymaster, and clerk returned `ok=true` and no errors.

## What the tip holds

Shipped records leave the owner questions named in the prior review open in the data. All 16 set `holder.cardinality` to `UNDECIDED`, `maxHolders` to null, and `allowConcurrentOffices` to null (`leader.json` lines 52–58). All 16 set `successionPolicy.method` to `OPEN_POLICY`, `appointmentAuthority` to null, and `cultureOutcomeOpen` to true. `manifest.json` stores `aliases: []` on every row. `workloadProfile.baselineHoursPerWeek` is null on every record (`treasurer.json` lines 82–83). `validateOffice` still accepts `SINGLE`, `APPOINTMENT`, and a numeric hour value, so the schema can represent a later owner answer. The catalogue checker rejects those values on the canonical map.

Cultural titles on every record use the nine DEC-025 keys `human`, `dwarf`, `elf`, `halfling`, `dragonborn`, `gnome`, `half-elf`, `half-orc`, and `tiefling`. Each value equals that office's `defaultTitle`. The defaults are functional names (`Leader`, `Treasurer`, `Mint Master`, `Director of Healing`, and the same pattern on the other offices). No `goblin` or `orc` key is present.

Every shipped record is `VACANT`, `isVacant` true, `operationalCapability` 0.0, `vacancyReason` `UNASSIGNED`, with `primaryHolderId` null, `actingHolderId` null, and `coHolderIds` `[]` (`leader.json` lines 40–55). `VACANT`, `SUSPENDED`, and `DORMANT` mutations that keep a holder id or a capability above 0 are rejected.

The 16 parent links are reciprocal. `OFFICE_LEADER` lists 12 subordinates (`leader.json` lines 79–92) and has `parentOfficeId` null. `OFFICE_MINT_MASTER` has parent `OFFICE_LEADER` (`mint_master.json` line 72) and an empty subordinate list. `OFFICE_TREASURER` lists only `OFFICE_TAX_COLLECTOR` and `OFFICE_PAYMASTER` (`treasurer.json` lines 77–80). `OFFICE_CLERK` has parent `OFFICE_RECORDER` (`clerk.json` line 74). `OFFICE_STEWARD` lists no subordinates (`steward.json` line 74). The parent walk has 15 edges and no cycle.

`OFFICE_QUARTERMASTER` domains are `WORKSHOPS` only (`quartermaster.json` lines 24–26). `OFFICE_MINT_MASTER` domains are `FOUNDRY_MINT` only (`mint_master.json` lines 24–26). `TREASURY_CHEST` is on `OFFICE_TREASURER`, `OFFICE_TAX_COLLECTOR`, and `OFFICE_PAYMASTER`. Pushing `TREASURY_CHEST` onto the quartermaster or the mint master is rejected. Eligibility arrays are empty and `minAge` / `minLevel` are null. Both recorded gates exit 0. No art or audio path is in the lane diff.

## Findings

### BLOCKER

None.

### MAJOR

1. A dead-holder reason can keep a holder and full operational capability. `validateOffice` applies the holder and capability checks only when `isVacant` is true or `status` is `VACANT`, `SUSPENDED`, or `DORMANT` (`tools/society/test_offices.js` lines 316–347). It never reads `vacancyReason`. The schema still allows `HOLDER_DECEASED` (`office_schema.json` lines 117–128). A clone of `leader.json` with `status` `OCCUPIED`, `isVacant` false, `operationalCapability` 1.0, `vacancyReason` `HOLDER_DECEASED`, and `primaryHolderId` `PERSON_184` returns `ok=true`. A clone with `status` `ACTING`, capability 0.6, the same deceased reason, `primaryHolderId` `PERSON_184`, and `actingHolderId` `PERSON_227` also returns `ok=true`. The shipped templates are vacant and clear, and the vacant/suspended/dormant mutations are rejected. The deceased-holder state the acceptance rule names is still a valid occupied office at capability 1.0.

2. Canonical ancestry coverage is not required. `titles.required` is only `defaultTitle` (`office_schema.json` line 43). `validateCatalogue` runs the nine-key and neutral-title checks only inside `if (office.titles && office.titles.culturalTitles)` (`test_offices.js` line 526). Deleting `culturalTitles` on `OFFICE_LEADER` leaves both `validateOffice` and `validateCatalogue` with `ok=true`. The shipped 16 records do contain the nine DEC-025 keys mapped to each `defaultTitle`, and the half-elf deletion fixture fails. A canonical office with no ancestry map still passes the gate.

3. Fifteen validator rules have no targeted failing fixture. The brief requires one for every validator check. The suite's 64 provocations and 6 catalogue fixtures were re-run through the extracted validator: 64/64 died on the expected rule and path, and the 6 fixtures hit. The rules below also fire when mutated, and none of those assertions names them. `maxItems` is implemented (`test_offices.js` lines 183–189) and is unused by `office_schema.json`, so it is omitted from this list.

   | Rule | Mutation result |
   | --- | --- |
   | `maxLength` | 65-character `officeId` → `maxLength` |
   | `semantic-duty-in-degradation-effects` | `currentDuty:DEFEND_GATE` emits it; the shipped provocation expects `pattern` (`test_offices.js` lines 1269–1274) |
   | `catalogue-missing-parent` | parent `OFFICE_DOES_NOT_EXIST` |
   | `catalogue-missing-subordinate` | subordinate `OFFICE_GHOST` |
   | `catalogue-parent-mismatch` | clerk listed by steward while recorder still lists clerk |
   | `catalogue-decided-max-holders` | `maxHolders` 1 |
   | `catalogue-decided-concurrent-offices` | `allowConcurrentOffices` true |
   | `catalogue-decided-succession-method` | method `HEREDITARY` |
   | `catalogue-decided-appointment-authority` | `appointmentAuthority` `OFFICE_RECORDER` |
   | `catalogue-culture-outcome-not-open` | `cultureOutcomeOpen` false |
   | `catalogue-invented-age-gate` | `minAge` 18 |
   | `catalogue-invented-craft-gate` | `requiredCrafts` `["SCRIBE"]` |
   | `catalogue-invented-class-gate` | `requiredClasses` `["bard"]` |
   | `catalogue-invented-level-gate` | `minLevel` 1 |
   | `catalogue-invented-baseline-hours` | `baselineHoursPerWeek` 25 |

   The positive `catalogue_relational_integrity` check passes because the shipped files already comply. Removing `catalogue-decided-succession-method`, `catalogue-invented-baseline-hours`, or `catalogue-invented-craft-gate` would leave that check green. Those are the guards against the prior review's cardinality, succession, hours, and craft-gate failures.

### MINOR

1. Reciprocal cycles pass the catalogue checker. Production links are a tree: reciprocal failures empty, parent-pointer cycles empty, 15 edges on 16 offices. `validateOffice` rejects only a self-parent and a self-subordinate (`test_offices.js` lines 431–444). `validateCatalogue` checks that each parent lists the child and each child names that parent (`test_offices.js` lines 477–512). A two-office cycle of tax collector and paymaster, with both directions listed and treasurer's subordinate list cleared, returns `ok=true`. A three-office cycle of tax collector, paymaster, and clerk also returns `ok=true`.

2. A schema-valid duty token stays in `degradationEffects`. The semantic check looks for lowercase `duty`, `currentDuty`, or `:` (`test_offices.js` lines 386–396). The item pattern is `^[A-Z0-9_]+$` (`office_schema.json` line 138). `DUTY` and `CURRENT_DUTY_SLEEP` match the pattern, miss the lowercase search, and are accepted. Shipped effect strings are uppercase administrative tokens and do not contain `DUTY`.

3. Three canonical records name successor offices, and every record stores one interregnum value. `method` is `OPEN_POLICY` and `cultureOutcomeOpen` is true. `leader.json` lines 63–67 set `orderOfPrecedence` to `DEPUTY`, `OFFICE_STEWARD`, `OFFICE_MARSHAL`. `treasurer.json` lines 62–65 add `OFFICE_PAYMASTER`. `recorder.json` lines 60–63 add `OFFICE_CLERK`. All 16 records set `interregnumPolicy` to `ACTING_DEPUTY` (`treasurer.json` line 74). The interregnum enum has no open token, so a valid record has to carry one of the five values.

## Verdict

The recorded gates exit 0. The 64 shipped provocations and 6 catalogue fixtures die on the rules they name. The shipped rows leave cardinality, concurrent holding, succession method, appointment authority, culture outcome, aliases, and weekly hours undecided; the nine SRD ancestries use functional titles; the shipped graph is a reciprocal tree; and the treasury chest is off the quartermaster and the mint master. The validator still accepts a deceased holder at operational capability 1.0, accepts a canonical office with no ancestry map, accepts a reciprocal cycle, and ships 15 rules with no targeted failing fixture.

VERDICT: FAIL
