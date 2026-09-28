# Grok review: SOC.20.01 lane-bl faction offices

Reviewer: Grok. Writer: Gemini. This file is the review. No schema, office record, test, specification, WBS row, or status file was modified.

## Identity

Reviewed writer tip, confirmed with `git rev-parse` and `git log -1`:

```
786b50844dffc1f13ca0d0bcb61232ff6c23c6fa
deus-gemini <willshw89@gmail.com>
[gemini] SOC.20.01 faction institutional skeleton and office schema
2026-09-27 17:16:08 -0500
parent 050543283aae50181b804839ab52aa8d06757b76
```

Brief base and merge-base of that tip with `a768eba377deab388e5def474a0bb1752fd732c3` are the same commit: `a768eba377deab388e5def474a0bb1752fd732c3`.

Worktree `HEAD` at review time was `63f5eeb122801e56f6a95af24d90af29bc055d26` (`[ops] SOC.20.01 lane-bl launch prompt 20260927_172429`). `git diff --stat 786b50844dffc1f13ca0d0bcb61232ff6c23c6fa HEAD` is only `tasks/SOC.20.01/lane-bl/launches/20260927_172429_prompt.txt` (5 lines). Every path in the merge-base-to-writer diff has the same blob in the worktree as in the writer tip (`BLOB_MISMATCHES=0`, 25 files). `core.autocrlf` is `false`. Node is `v24.19.0`.

## Scope

`git diff --name-status a768eba377deab388e5def474a0bb1752fd732c3 786b50844dffc1f13ca0d0bcb61232ff6c23c6fa` is 25 additions. All sit inside `lane.json` `allowedPaths`. The writer commit itself adds the 21 implementation and report paths. The other four are the lane brief, `lane.json`, and the two writer launch prompts.

| Path | Allowed by |
| --- | --- |
| `docs/systems/DEUS_FactionOffices.md` | `docs/systems/DEUS_FactionOffices.md` |
| `game/data/society/office_schema.json` | `game/data/society/office_schema.json` |
| `game/data/society/offices/*.json` (16 records + `manifest.json`) | `game/data/society/offices/**` |
| `tools/society/test_offices.js` | `tools/society/test_offices.js` |
| `tasks/SOC.20.01/lane-bl/**` | `tasks/SOC.20.01/**` |

A name filter for `art/`, `game/img/`, `game/audio/`, `.png`, `.ogg`, `.wav`, `.mp3`, WBS, `STATUS`, `OWNER_DECISIONS`, and `plugins` matched nothing. `docs/society/DEUS_SOCIETY_WBS.md` line 73 still reads `PLANNED` for SOC.20.01. The diff does not touch it.

WBS row reviewed: SOC.20.01, "Decouple Office entity from living person; store jurisdiction, authority scopes, and succession rules on the office." Sources read against the tip: `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md` §3, §6, and §7; `docs/systems/DEUS_PersonIdentity.md`; `docs/systems/DEUS_FactionPlans.md` §4.3 and §15; `game/data/society/person_identity.schema.json`; `docs/INVARIANT_REGISTRY.md` INV-SOC-01 through INV-SOC-06; `docs/OWNER_DECISIONS.md` DEC-015 and DEC-025.

## Commands and exits

Worktree, foreground:

| Command | Exit | Result |
| --- | --- | --- |
| `node tools/society/test_offices.js` | 0 | `TEST SUMMARY: 69 PASS, 0 FAIL`. Suite prints `PROVOCATIONS KILLED: 43/43`. |
| `node tools/check_deus_syntax.js` | 0 | `Checked 60 DEUS plugin files. Errors: 0` |

Independent replay: the validator functions were compiled from `tools/society/test_offices.js` cut before its `console.log` entry point, then each of the 43 suite mutations was applied to a clone of `leader.json`. `REPLAY_TOTAL 43/43`. Each mutant died on the rule the suite names (`required`, `pattern`, `const`, `enum`, `minLength`, `minItems`, `uniqueItems`, `minimum`, `maximum`, `semantic-occupied-mismatch`, `semantic-vacancy-mismatch`, `semantic-circular-parent`, `semantic-self-subordinate`, `semantic-duty-in-office`, `additionalProperties`). Probe exit 0.

Further probes against that same validator, all on a clone of `leader.json`:

| Probe | Validator result |
| --- | --- |
| `canonicalFunction = "HEALER"` | rejected, `enum` |
| `status ACTING` with `isVacant true` | rejected, `semantic-acting-mismatch` |
| property `duty` | rejected, `additionalProperties` and `semantic-duty-in-office` |
| missing `canonicalFunction` | rejected, `required` |
| `sinceYear` 1.5 | rejected, `type` |
| `sinceTick` -1 | rejected, `minimum` |
| `holder.craft` | rejected, `additionalProperties` |
| `VACANT`, `isVacant true`, `operationalCapability` 1, `vacancyReason HOLDER_DECEASED`, `primaryHolderId PERSON_184` | accepted |
| `SUSPENDED` with `isVacant false` | accepted |
| `DORMANT` with `isVacant false` | accepted |
| `OCCUPIED` with `primaryHolderId null` | accepted |
| `ACTING` with `actingHolderId null` | accepted |
| `cardinality SINGLE`, `maxHolders` 1, two `coHolderIds` | accepted |
| `degradationEffects` `["currentDuty:DEFEND_GATE"]` | accepted |

Catalogue cross-check loaded all 16 office files. `MANIFEST_DIFFS=0`: each manifest row's `officeId`, `canonicalFunction`, `department`, `tier`, and `file` match the record. Counts: `cardinality` SINGLE 15 and UNDECIDED 1; `allowConcurrentOffices` true 16; `method` APPOINTMENT 15 and OPEN_POLICY 1. Culture-title keys on every record: `dragonborn`, `dwarf`, `elf`, `gnome`, `goblin`, `halfling`, `human`, `orc`, `tiefling`.

## What the tip holds

Jurisdiction and authority are closed objects and enums on the office. The suite's holder-death case keeps `OFFICE_TREASURER`, its four authority tokens, and `jurisdiction.scope` `FACTION` after the test itself clears the holder and sets `VACANT`. A root `currentDuty` or `duty` property is rejected. `successionPolicy.cultureOutcomeOpen` is schema `const true`, and setting `false` dies. The eight `CORE_FOUNDER` functions are `LEADER`, `TREASURER`, `MINT_MASTER`, `MARSHAL`, `QUARTERMASTER`, `MASTER_OF_WORKS`, `PROVISIONER`, and `RECORDER`, matching `DEUS_FactionPlans.md` lines 99–110. `TAX_COLLECTOR`, `PAYMASTER`, and `CLERK` are the subordinate names in the person spec §7. Both gates exit 0. No art or audio path is in the diff.

## Findings

### BLOCKER

1. Canonical records answer open owner questions the brief leaves undecided. The writer prompt and `BRIEF.md` say to store succession policy data without deciding holder cardinality or culture-specific succession outcomes. `DEUS_PersonIdentity.md` lines 96–98 leave three questions open: whether `EXECUTIVE`/`LEADER` and `STEWARD`/`ADMIN` are one office or two, whether founder `HEALER` and table `HEALER_DIRECTOR` are the same id, and whether one person holds both treasurer and mint master. `DEUS_FactionPlans.md` line 354 asks the same two-office question and does not pick a reading.

   The schema text says it does not decide (`office_schema.json` lines 4 and 144). `holder.cardinality` includes `UNDECIDED`, and `allowConcurrentOffices` allows `null`. The records decide anyway. Fifteen offices set `cardinality` `SINGLE` and `maxHolders` 1. `treasurer.json` lines 51–57 are the pattern; `leader.json` line 52 is the only `UNDECIDED`. All 16 set `allowConcurrentOffices` true, including the leader at line 58. That answers the two-office question with yes. Fifteen offices set `successionPolicy.method` to `APPOINTMENT` with a named `appointmentAuthority` (`treasurer.json` lines 60–61). Only the leader uses `OPEN_POLICY` (line 61). `cultureOutcomeOpen: true` keeps a boolean open while the method field stores a chosen mechanism.

   `manifest.json` lines 10, 74, and 82 alias `EXECUTIVE` to `OFFICE_LEADER`, `ADMIN` to `OFFICE_STEWARD`, and `HEALER` to `OFFICE_HEALER_DIRECTOR`. `docs/systems/DEUS_FactionOffices.md` lines 146–151 call those decided aliases. `HEALER` is absent from the `canonicalFunction` enum (`office_schema.json` lines 289–308). The probe rejects `canonicalFunction` `HEALER`. The suite check `open_question_aliases` (`test_offices.js` lines 514–528) tries `EXECUTIVE`, `ADMIN`, and `HEALER_DIRECTOR` only. Those three are already enum members. The check does not show that the pairs stay undecided, and it does not show that `HEALER` is a recognized function.

2. Every canonical record authors race-specific office names and assigns them to the wrong peoples. DEC-015 point 4 (`docs/OWNER_DECISIONS.md` line 231) reserves race-specific cultural lore, names, and values to the Owner. DEC-025 (`OWNER_DECISIONS.md` line 349) names the nine SRD peoples: Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling. SOC.10.04 treats goblin and orc as non-core humanoids. The person spec §3 lists cultural title variations and does not assign them to races.

   All 16 `titles.culturalTitles` maps use the keys `human`, `dwarf`, `elf`, `halfling`, `orc`, `goblin`, `dragonborn`, `gnome`, `tiefling`. Half-elf and half-orc are absent. Orc and goblin are present. The strings are new lore (`leader.json` gives human "High King", dwarf "Jarl", goblin "Chief"; `mint_master.json` gives goblin "Nugget Puncher"; `trade_master.json` gives goblin "Swindle Factor"). The schema accepts any key, so this map is a catalogue decision, not a closed race enum.

### MAJOR

1. Vacancy, holder, capability, and cardinality are not kept consistent with the specification this lane wrote. `DEUS_FactionOffices.md` line 110 says `isVacant` is true for `VACANT`, `SUSPENDED`, and `DORMANT`. Lines 201–213 say an occupied office has capability 1.0 and a primary holder, an acting office has capability 0.5–0.75 and an acting holder, and a vacant office has capability 0.0 with both holder ids null. The validator enforces only three status pairs (`test_offices.js` lines 262–282): `VACANT` implies `isVacant true`, and `OCCUPIED` and `ACTING` imply `isVacant false`. The probes above accept a deceased-holder vacancy that still names `PERSON_184` at capability 1, a suspended or dormant office with `isVacant false`, an occupied office with no holder, an acting office with no acting holder, and `SINGLE` / `maxHolders` 1 with two co-holders. The acting-flag rule has no entry in the provocations array. The suite's death case passes because the test assigns the consistent values itself, then checks that `validateOffice` returns ok and that length and scope are unchanged (`test_offices.js` lines 436–449).

2. Parent and subordinate links in the catalogue disagree, and mint is placed under the treasurer. `leader.json` lines 79–88 list eight subordinates and omit `OFFICE_HEALER_DIRECTOR`, `OFFICE_QUARTERMASTER`, and `OFFICE_TRADE_MASTER`. Those three set `parentOfficeId` to `OFFICE_LEADER` (`healer_director.json` line 81, `quartermaster.json` line 74, `trade_master.json` line 76). `steward.json` lines 75–77 and `recorder.json` lines 77–79 both list `OFFICE_CLERK`. `clerk.json` line 76 sets the parent to `OFFICE_RECORDER` only. `mint_master.json` line 77 sets the parent to `OFFICE_TREASURER`, and `treasurer.json` lines 78–82 list the mint beside `OFFICE_TAX_COLLECTOR` and `OFFICE_PAYMASTER`. Faction plans lines 99–110 and WBS SOC.21.01 treat mint as one of the eight peer founder functions. Person spec §7 names the workload splits as tax collector, paymaster, and clerk. The validator checks only a self-parent and a self-subordinate. Nothing compares the 16 records to each other.

3. Eligibility criteria invent class gates, craft gates, and an age of majority, and the array quantifier is undefined. Every office sets `minAge` 18. The person spec, the faction plan, and the SOC.20.01 WBS row do not state that age. `envoy.json` lines 63–67 require bard, paladin, or rogue at level at least 1. `healer_director.json` lines 63–71 require crafts `HERBALIST` and `ALCHEMIST` and classes cleric, druid, paladin, and bard. `marshal.json` requires fighter, paladin, ranger, or barbarian. Clerk, magistrate, master of works, mint master, paymaster, provisioner, recorder, tax collector, and trade master each require one or more crafts (`SCRIBE`, `MASON`/`CARPENTER`/`MINER`, `BLACKSMITH`/`SMELTER`/`JEWELER`, `FARMER`/`HUNTER`/`COOK`/`MILLER`, `MERCHANT`). SOC.10.01 stores one craft and one class (`person_identity.schema.json`, `DEUS_PersonIdentity.md`). `requiredCrafts` and `requiredClasses` are plain arrays with no `anyOf` or `allOf` (`office_schema.json` lines 222–233). Read as a conjunction, the healer list and the other multi-value lists cannot be satisfied by a person record. Read as alternatives, they still close succession to classes and crafts the person spec does not couple to those offices. INV-SOC-01 keeps craft, civic office, and class independent.

4. Quartermaster jurisdiction includes the treasury chest. `quartermaster.json` lines 24–27 set domains to `TREASURY_CHEST` and `WORKSHOPS`. INV-SOC-06 (`docs/INVARIANT_REGISTRY.md` line 90) separates treasurer monetary balance from quartermaster physical goods. Person spec §3 assigns the quartermaster physical inventory, tools, grain, and arms. `COMMUNAL_GRANARY` is on the provisioner. `mint_master.json` lines 24–27 also put `TREASURY_CHEST` on the mint beside `FOUNDRY_MINT`. The function table gives the mint assaying and coinage, and gives the chest's balance sheet to the treasurer.

### MINOR

1. The suite's killed count is not a count. `test_offices.js` line 830 prints `provocations.length/provocations.length` after the loop. A failed provocation still increments `failed` and exits 1, so this run's exit code is trustworthy. The printed `43/43` does not come from the kills. The match helper also treats a hit as success when `expectedProp.includes(e.path)`, so a shorter path on another rule can satisfy the assertion. The replay showed the expected rule on each of the 43. Live checks with no provocation include `semantic-acting-mismatch`, the `duty` key, missing `canonicalFunction`, a fractional `sinceYear`, a negative `sinceTick`, and nested `additionalProperties`. `BRIEF.md` requires a targeted failing fixture for every validator check.

2. `workloadProfile.baselineHoursPerWeek` stores concrete hours (mint 10, several founder offices 14, steward and tax collector 20, clerk 25) from no cited source. `degradationEffects` is an open string array. Paymaster records include `COLONIST_MORALE_DROP` and `LABOR_STRIKE_RISK`. The probe accepts a degradation string that carries a current-duty phrase. Those values are catalogue inventions on top of the structural fields.

## Verdict

The gates exit 0 and the 43 shipped provocations die on the rules they name. The canonical records still decide holder cardinality, concurrent office holding, alias pairs, succession method, and race titles, and the validator accepts vacancy and hierarchy states the lane's own specification forbids.

VERDICT: FAIL
