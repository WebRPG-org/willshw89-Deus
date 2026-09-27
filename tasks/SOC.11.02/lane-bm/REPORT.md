# SOC.11.02 lane-bm report

Writer: grok. Reviewer: gemini (not run by this writer). This report does not mark the task done.

## What changed

DEC-036 is now a closed data table for the nine catalogue races and the twelve catalogue classes. Every race-class pair is legal. Each race lists the three affinity classes in the decision's order. The only concrete role tag is Elf + Ranger = `tank`. Every other affinity role, the bonus, and the job-pick weight are `OWNER_TODO`. The unapproved playtest sentences are stored as text and are not applied.

| Path | Role |
|---|---|
| `game/data/society/race_class_affinity.json` | 9 races, 12 classes, 27 affinity cells, 81 other legal cells. |
| `game/data/society/race_class_affinity.schema.json` | Draft 2020-12 shape. A future Owner number fits `bonus` and `jobPickWeight`. This document's rules reject numbers. |
| `docs/systems/DEUS_RaceClassAffinity.md` | Id mapping, decided rows, readers, and the SOC.13 boundary. |
| `tools/society/test_race_class_affinity.js` | Deterministic validator, safe readers, and one in-memory negative fixture per rule. |

Class ids are `srd:class:*` (person identity and `character_options.json`). The same classes also exist as bare slugs (`fighter`) and faction-plan tokens (`FIGHTER`). Race ids are `srd:race:*`. Faction short ids use hyphens (`half-elf`). `species_reference.json` uses underscores (`half_elf`). DEC-036 spells `Half-elf` and `Half-orc`; the catalogue spells `Half-Elf` and `Half-Orc`. Both spellings are stored and tested. `NONE` stays a person-identity class and is not a row in this table.

No scheduler file, WBS row, owner decision, art path, or audio path was edited.

## Evidence

Gates run from the worktree after the edits, in the foreground. Both exited 0.

### `node tools/society/test_race_class_affinity.js`

```
PASS schema-keywords
PASS schema-keyword-gate-rejects-if if
PASS canonical-valid
PASS validation-deterministic
PASS canonical-has-no-json-numbers
PASS nine-races 9
PASS twelve-classes 12
PASS matrix-108-legal cells 108
PASS affinity-rows-27 affinities 27
PASS one-decided-role tank 1 todo 26 other 0
PASS elf-ranger-tank
PASS non-obvious-examples-owner-todo Half-elf and Half-orc affinity roles
PASS none-is-not-an-affinity-class
PASS identifier-resolution
PASS class-id-forms
PASS resolve-race-ambiguous
PASS resolve-race-unknown
PASS every-pair-admitted admitted 108 affinity 27
PASS unknown-id-is-not-a-lock
PASS non-affinity-stays-legal
PASS reader-ignores-numbers
PASS suggestions-have-no-numeric-effect
PASS scheduler-view-applies-nothing
PASS invalid-table-is-not-a-candidate-list
PASS doc-race-identifiers
PASS doc-class-identifiers
PASS doc-affinity-rows
PASS doc-decided-role
PASS doc-playtest-suggestions
PASS doc-rule-list
PASS doc-scheduler-boundary
PASS mutant schema-lock-field kills schema
PASS mutant schema-extra-root kills schema
PASS mutant schema-missing-authority kills schema
PASS mutant schema-bad-version kills schema
PASS mutant race-set kills race-set
PASS mutant race-order kills race-order
PASS mutant class-set kills class-set
PASS mutant class-order kills class-order
PASS mutant race-alias kills race-alias
PASS mutant class-alias kills class-alias
PASS mutant dec036-label kills dec036-label
PASS mutant complete-matrix kills complete-matrix
PASS mutant duplicate-cell kills duplicate-cell
PASS mutant cell-order kills cell-order
PASS mutant no-hard-lock kills no-hard-lock
PASS mutant affinity-count kills affinity-count
PASS mutant affinity-membership kills affinity-membership
PASS mutant affinity-order kills affinity-order
PASS mutant affinity-cells kills affinity-cells
PASS mutant ranger-is-tank kills ranger-is-tank
PASS mutant undecided-role kills undecided-role
PASS mutant role-distribution kills role-distribution
PASS mutant bonus-unset kills bonus-unset
PASS mutant weight-unset kills weight-unset
PASS mutant affinity-value-pairing kills affinity-value-pairing
PASS mutant suggestions-unapproved kills suggestions-unapproved
PASS every-rule-has-a-killed-mutant
PASS fixture-file-unchanged
RESULT: 59 passed, 0 failed
EXIT_AFFINITY:0
```

Each mutant failed with exactly its own code, and passed once that code was disabled. The four schema mutants are a `locked` field, an extra root property, a missing `authority`, and a numeric `schemaVersion`. `bonus-unset` writes `1` on Human Fighter. `weight-unset` writes `1.5`. `undecided-role` writes `healer` on Half-elf Fighter. `no-hard-lock` sets one legal cell to false. `dec036-label` rewrites `Half-elf` as `Half-Elf`.

The canonical file contains no JSON numbers. Readers return a null magnitude for `OWNER_TODO`, for a non-affinity null, and for a stuffed `1` or `1.5`. `schedulerView` on the valid table returns 108 included rows and applies no weight. A table with `legal: false` is rejected and does not become a candidate list.

### `node tools/check_deus_syntax.js`

```
Checked 60 DEUS plugin files. Errors: 0
```

Exit code 0.

## Open Owner values

Not decided here. Detail is in `docs/systems/DEUS_RaceClassAffinity.md`.

1. Bonus size.
2. Job-pick weight.
3. Role tags other than Elf Ranger = tank, including Half-elf Fighter/Druid/Bard and Half-orc Barbarian/Druid/Fighter.
4. Whether the unapproved playtest sentences (+1 on class main rolls, ~10% faster class XP, ~1.5x job-pick weight) are adopted.
