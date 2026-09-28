# Grok review: SOC.20.01 lane-bl correction

Reviewer: Grok. Writer: Gemini. This file is the review of writer tip `fe0bc0730f1eb2fa5b4875b08bef62ba2c0d38cc`. No schema, office record, test, specification, WBS row, or status file was modified.

## Identity

Reviewed writer tip, confirmed with `git rev-parse` and `git log -1 --format=fuller`:

```
fe0bc0730f1eb2fa5b4875b08bef62ba2c0d38cc
deus-gemini <willshw89@gmail.com>
[gemini] SOC.20.01 close re-review findings 10debc5d
2026-09-27T18:33:32-05:00
parent 157aa46998a8e8ec4280859015ba815b270788fe
```

Brief base `a768eba377deab388e5def474a0bb1752fd732c3` is the merge-base of that tip with the brief base. Merge-base of the tip with `origin/main` is `6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0`. Prior Grok reviews are `57cda559f1614e9167edb4d056e89683af49ae09` (`[grok] SOC.20.01 review 786b5084`) and `10debc5ddc8caf35c04546cd88a401380f37ec16` (`[grok] SOC.20.01 review a7ba49a5`).

Worktree `HEAD` at review time was `3a4342c422d92787f310ee320edbdff1a965692e` (`[ops] SOC.20.01 lane-bl launch prompt 20260927_183610`). `git diff --stat fe0bc0730f1eb2fa5b4875b08bef62ba2c0d38cc HEAD` is only `tasks/SOC.20.01/lane-bl/launches/20260927_183610_prompt.txt`. Every path in the brief-base-to-writer diff has the same blob in the worktree as in the writer tip (`FILES 31`, `BLOB_MISMATCHES 0`). `core.autocrlf` is `false`. Node is `v24.19.0`.

## Scope

Reviewed range is the lane delivery `a768eba377deab388e5def474a0bb1752fd732c3..fe0bc0730f1eb2fa5b4875b08bef62ba2c0d38cc` (31 files, 4431 insertions). The writer commit itself changes 4 paths: `docs/systems/DEUS_FactionOffices.md`, `game/data/society/office_schema.json`, `tools/society/test_offices.js`, and `tasks/SOC.20.01/lane-bl/REPORT.md`. Office JSON is unchanged from `a7ba49a5`. The other paths in the range are the lane brief, `lane.json`, launch prompts, and the two earlier Grok reviews.

`git diff --name-only` of that range against `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, `docs/society/DEUS_SOCIETY_WBS.md`, and `docs/telemetry/sessions/active_workers.json` is empty. Those four paths differ between `origin/main` and the tip because of ancestor commits `178ef6c9` and `a768eba3`, which sit before the brief base. `docs/society/DEUS_SOCIETY_WBS.md` at the tip still reads `PLANNED` for SOC.20.01.

A name filter for `art/`, `game/img/`, `game/audio/`, `.png`, `.ogg`, `.wav`, `.mp3`, `WBS`, `STATUS`, `OWNER_DECISIONS`, and `plugins` on the lane range matched nothing.

| Path | Allowed by |
| --- | --- |
| `docs/systems/DEUS_FactionOffices.md` | `docs/systems/DEUS_FactionOffices.md` |
| `game/data/society/office_schema.json` | `game/data/society/office_schema.json` |
| `game/data/society/offices/*.json` (16 records + `manifest.json`) | `game/data/society/offices/**` |
| `tools/society/test_offices.js` | `tools/society/test_offices.js` |
| `tasks/SOC.20.01/**` | `tasks/SOC.20.01/**` |

Sources read against the tip: `tasks/SOC.20.01/lane-bl/BRIEF.md`, `lane.json`, the reviews at `57cda559` and `10debc5d`, `docs/OWNER_DECISIONS.md` DEC-025 (line 349), `docs/INVARIANT_REGISTRY.md` INV-SOC-03, `docs/systems/DEUS_FactionOffices.md`, `game/data/society/office_schema.json`, and `tools/society/test_offices.js`. Race ids in `game/data/srd51/character_options.json` are `dragonborn`, `dwarf`, `elf`, `gnome`, `half-elf`, `half-orc`, `halfling`, `human`, and `tiefling`.

## Commands and exits

Worktree, foreground:

| Command | Exit | Result |
| --- | --- | --- |
| `node tools/society/test_offices.js` | 0 | `TEST SUMMARY: 117 PASS, 0 FAIL`. Suite prints `PROVOCATIONS KILLED: 69/69`. |
| `node tools/check_deus_syntax.js` | 0 | `Checked 60 DEUS plugin files. Errors: 0` |

Independent probe, exit 0. The probe loaded the exported `validateOffice` and `validateCatalogue` from `tools/society/test_offices.js`, then ran the shipped fixture mutations and the 69 provocation mutations again. It also walked all 16 office records and a deceased-holder matrix.

| Probe | Result |
| --- | --- |
| 16 production records through `validateOffice` | `OFFICE_FAILS 0 OF 16` |
| production map through `validateCatalogue` | `ok=true`, 0 errors |
| manifest rows versus loaded records | `MANIFEST_DIFFS []`; `aliases` length 0 on all 16 rows |
| parent/subordinate walk | `RECIP_FAILS []`; parent-pointer cycles `[]`; 15 edges |
| ancestry keys and title strings on the 16 records | `ANCESTRY_PROBLEMS []` |
| `OCCUPIED` + `HOLDER_DECEASED` + capability 1.0 + `primaryHolderId` `PERSON_184` | rejected, only `semantic-deceased-holder-full-capability` |
| `ACTING` + `HOLDER_DECEASED` + capability 0.6 + primary `PERSON_184` + acting `PERSON_227` | rejected, only `semantic-deceased-primary-holder-retained` |
| `ACTING` + `HOLDER_DECEASED` + capability 0.6 + primary null + acting `PERSON_227` | accepted |
| `VACANT` + `HOLDER_DECEASED` + capability 0 + holders clear | accepted |
| deceased matrix, 300 states | 15 accepted; `BAD_ACCEPTED []` |
| `culturalTitles` deleted | `validateOffice` rejects `required`; `validateCatalogue` rejects `catalogue-missing-canonical-ancestry` |
| empty map, null map, missing `half-orc`, `goblin` key, title `Jarl` | catalogue rejects each |
| consistent 2-cycle (tax collector ↔ paymaster) and consistent 3-cycle (tax collector, paymaster, clerk) | both rejected, only `catalogue-hierarchy-cycle` |
| parent-pointer 2-cycle without subordinate rewiring | rejected, `catalogue-subordinate-mismatch` and `catalogue-hierarchy-cycle` |
| `DUTY`, `CURRENT_DUTY_SLEEP`, `CURRENT_DUTY_DEFEND_GATE` | rejected, `semantic-duty-in-degradation-effects` |
| 65-character and 67-character `officeId` | rejected, `maxLength`; 64-character id accepted |
| replay of the 69 shipped provocations | `REPLAY_KILLED 69 SURVIVED 0 MISMATCH 0` |
| replay of the 21 shipped catalogue fixtures | 21/21 fire only the named rule; filtering that rule leaves 0 errors |

## Prior findings

`57cda559` failed the first delivery. Those failures stay closed on this tip. All 16 records use `cardinality` `UNDECIDED`, `maxHolders` null, and `allowConcurrentOffices` null. `successionPolicy.method` is `OPEN_POLICY`, `appointmentAuthority` is null, and `cultureOutcomeOpen` is true. Manifest `aliases` are empty, and `validateOffice` still accepts `HEALER`, `EXECUTIVE`, and `ADMIN`. Cultural titles use the nine DEC-025 keys, each equal to that office's functional `defaultTitle`. Vacant, suspended, and dormant states that keep a holder or a capability above 0 are rejected. Mint's parent is `OFFICE_LEADER`. Quartermaster domains are `WORKSHOPS` only. Mint domains are `FOUNDRY_MINT` only. `TREASURY_CHEST` is on `OFFICE_TREASURER`, `OFFICE_TAX_COLLECTOR`, and `OFFICE_PAYMASTER`. Pushing the chest onto the quartermaster or the mint master is rejected. Eligibility crafts, classes, `minAge`, and `minLevel` stay empty or null, because `validateCatalogue` would reject them and the production catalogue returns ok. The kill counter increments only on a rule-and-path match (`test_offices.js` lines 1700–1728). `baselineHoursPerWeek` is null on every record. `validateOffice` still accepts `SINGLE`, `APPOINTMENT`, and a numeric hour value.

`10debc5d` failed the first correction on four points. This tip closes them:

1. A deceased holder at full capability or in `OCCUPIED` is rejected. `validateOffice` lines 400–415 emit `semantic-deceased-holder-full-capability` when `vacancyReason` is `HOLDER_DECEASED` and status is `OCCUPIED` or capability is at least 1.0. Otherwise a non-null `primaryHolderId` emits `semantic-deceased-primary-holder-retained`. The two probes that `10debc5d` accepted now return `ok=false`, each with one error. Across the matrix, every accepted `HOLDER_DECEASED` state has capability below 1, status other than `OCCUPIED`, and `primaryHolderId` null. The 15 accepted states are a clear `VACANT`, `SUSPENDED`, or `DORMANT` office at capability 0, or an `ACTING` office at 0.5, 0.6, or 0.75 with a deputy in `actingHolderId`. An occupied living holder and an occupied `HOLDER_INCAPACITATED` holder at capability 1.0 still validate. The office still survives death: `VACANT` + `HOLDER_DECEASED` + capability 0 + holders clear returns ok.

2. `culturalTitles` is required. `office_schema.json` line 43 sets `titles.required` to `defaultTitle` and `culturalTitles`. Deleting the map fails `validateOffice` with `required` and fails `validateCatalogue` with `catalogue-missing-canonical-ancestry`. An empty map, a null map, and a missing `half-orc` key fail the catalogue check. A `goblin` key and a dwarf title of `Jarl` fail it. All 16 shipped maps contain the nine SRD keys and copy `defaultTitle`. `validateOffice` still accepts a map that drops `half-elf`, because the schema types the map as open strings. The gate then runs `validateCatalogue`, which rejects that office. The half-elf deletion fixture and the omitted-map fixture both die on `catalogue-missing-canonical-ancestry` alone.

3. Reciprocal multi-office cycles are rejected. `validateCatalogue` lines 668–695 walk `parentOfficeId` and emit `catalogue-hierarchy-cycle`. A consistent tax-collector/paymaster cycle, a consistent three-office cycle, and a self-parent cycle each return only that rule. The production graph remains a tree: 15 reciprocal edges, leader parent null with 12 subordinates, mint under the leader, tax collector and paymaster under the treasurer, clerk under the recorder, and no cycle.

4. The rules `10debc5d` listed as uncovered now have isolated fixtures. Each of the 21 catalogue fixtures, including missing parent, missing subordinate, parent mismatch, the decided-owner checks, the invented gates, baseline hours, the hierarchy cycle, and omitted cultural titles, fires only its named rule. Removing that rule's errors leaves the mutant valid. `maxLength` (67-character `officeId`) and `semantic-duty-in-degradation-effects` (`CURRENT_DUTY_DEFEND_GATE`) are isolated provocations. `maxItems` is implemented in the validator and absent from `office_schema.json`, so it is not a production rule.

The interregnum note from `10debc5d` is unchanged, and this correction was required to leave succession data alone. All 16 records set `interregnumPolicy` to `ACTING_DEPUTY`. `orderOfPrecedence` names `OFFICE_STEWARD` and `OFFICE_MARSHAL` on the leader, `OFFICE_PAYMASTER` on the treasurer, and `OFFICE_CLERK` on the recorder. Every record also lists `DEPUTY`. `method` stays `OPEN_POLICY`.

## Findings

### BLOCKER

None.

### MAJOR

None.

### MINOR

1. Five production rules have a targeted provocation and no isolated mutant. The provocation still names the rule and the path, and the replay killed all 69, so deleting the rule turns that provocation red. The mutant does not become valid when only that rule is ignored.

   | Provocation | Expected rule | Other rules on the same mutant |
   | --- | --- | --- |
   | `provocation_inconsistent_vacant_flag_occupied` (lines 1329–1337) | `semantic-occupied-mismatch` | `semantic-vacant-capability-excess`, `semantic-vacant-primary-holder-retained` |
   | `provocation_inconsistent_vacant_flag_acting` (lines 1349–1356) | `semantic-acting-mismatch` | `semantic-vacant-capability-excess`, `semantic-vacant-acting-holder-retained` |
   | `provocation_single_cardinality_with_co_holders` (lines 1498–1504) | `semantic-single-cardinality-coholders` | `semantic-vacant-co-holders-retained` |
   | `provocation_max_holders_exceeded` (lines 1516–1524) | `semantic-max-holders-exceeded` | `semantic-vacant-primary-holder-retained`, `semantic-vacant-co-holders-retained` |
   | `provocation_duty_in_office` and `provocation_current_duty_in_office` (lines 1681–1691) | `semantic-duty-in-office` | `additionalProperties` |

   The occupied and acting flag mutants set `isVacant` true, so the vacant-holder block also runs. The cardinality mutants edit the vacant leader template, so vacant-holder rules also run. A `duty` or `currentDuty` key is rejected by `additionalProperties` as well as the semantic check. The other 49 production rules each have at least one mutant whose only error is that rule. That set includes every rule `10debc5d` listed as uncovered.

## Verdict

The recorded gates exit 0. The 69 shipped provocations die on the rule and path they name. The 21 catalogue fixtures are isolated. A deceased holder cannot remain `OCCUPIED`, cannot keep capability at 1.0, and cannot keep `primaryHolderId`. `culturalTitles` is required, and every canonical office carries the nine SRD ancestries at the neutral title. Consistent reciprocal cycles are rejected. Open cardinality, open succession method, empty aliases, null duty hours, the office tree, and treasury-chest separation are unchanged. The lane diff stays inside the allowed paths and contains no art or audio change. Five older provocations are targeted and not isolated. They still bind their rules by name.

VERDICT: PASS
