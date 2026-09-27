# SOC.11.02 Lane BM Independent Review

**Reviewer:** Gemini (gemini-cli, authorized merge gate per Owner DEC-034 / CANONICAL_ROLES.md)  
**Writer:** Grok  
**Reviewed SHA:** `f55858ceb0408960be6b524e59a8dcad15d7d6ea`  
**Base SHA:** `e3f7e63a54d5f9c0806938964e0b95f94555e545` (`main`)  
**Date:** 2026-09-27  

---

## 1. Scope & allowedPaths Verification

Merge base: `git merge-base main f55858ceb0408960be6b524e59a8dcad15d7d6ea` -> `e3f7e63a54d5f9c0806938964e0b95f94555e545`  
Diff between merge-base and writer tip: `git diff --stat e3f7e63a54d5f9c0806938964e0b95f94555e545 f55858ceb0408960be6b524e59a8dcad15d7d6ea`

| Changed Path | Status | Within allowedPaths? | Purpose |
|---|---|---|---|
| `docs/systems/DEUS_RaceClassAffinity.md` | Added | YES (`docs/systems/DEUS_RaceClassAffinity.md`) | System specification and contract documentation |
| `game/data/society/race_class_affinity.json` | Added | YES (`game/data/society/race_class_affinity.json`) | Canonical closed 9x12 race-class affinity data |
| `game/data/society/race_class_affinity.schema.json` | Added | YES (`game/data/society/race_class_affinity.schema.json`) | Draft 2020-12 JSON Schema specification |
| `tasks/SOC.11.02/lane-bm/BRIEF.md` | Added | YES (`tasks/SOC.11.02/**`) | Lane task brief |
| `tasks/SOC.11.02/lane-bm/REPORT.md` | Added | YES (`tasks/SOC.11.02/**`) | Writer lane report |
| `tasks/SOC.11.02/lane-bm/lane.json` | Added | YES (`tasks/SOC.11.02/**`) | Lane configuration |
| `tasks/SOC.11.02/lane-bm/launches/20260927_175420_prompt.txt` | Added | YES (`tasks/SOC.11.02/**`) | Writer launch prompt |
| `tools/society/test_race_class_affinity.js` | Added | YES (`tools/society/test_race_class_affinity.js`) | Test validator suite, mutation harness, readers |

- **DEC-007 Art Freeze & Audio Isolation:** Strictly respected. Zero art or audio files created, edited, moved, or deleted.
- **Allowed Paths Isolation:** All changed files match `allowedPaths` declared in `lane.json`.
- **System Integrity:** No modifications made to `game/js/rmmz_*.js`, `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, WBS files (`docs/society/DEUS_SOCIETY_WBS.md`), status ledgers (`docs/STATUS.md`), or Owner decisions (`docs/OWNER_DECISIONS.md`).
- **Scope Verdict:** STRICT PASS.

---

## 2. Gate Executions (Rerun in Foreground)

### Gate 1: `node tools/society/test_race_class_affinity.js`
- **Command:** `node tools/society/test_race_class_affinity.js`
- **Exit Code:** `0`
- **Output Excerpt:**
```text
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

### Gate 2: `node tools/check_deus_syntax.js`
- **Command:** `node tools/check_deus_syntax.js`
- **Exit Code:** `0`
- **Output:**
```text
Checked 60 DEUS plugin files. Errors: 0
```

---

## 3. Deep Contract & Invariant Verification

Independent node runtime inspection was performed directly against the schema and data artifacts:

1. **Complete 9x12 Matrix with No Hard Locks:**
   - Evaluated 9 canonical races and 12 canonical classes yielding exactly 108 cells.
   - All 108 cells are explicitly stored with `legal: true`.
   - Hard locks are structurally absent: `admission()` admits all 108 cells with `usable: true, legal: true, excluded: false`.
   - Mutation fixture `no-hard-lock` sets `legal: false` on Human Bard and is reliably killed by the validator.

2. **Exact DEC-036 Affinity Classes and Ordering:**
   - Verified that the 9 races follow the DEC-036 sequence: Human, Dwarf, Elf, Half-elf, Halfling, Gnome, Half-orc, Tiefling, Dragonborn.
   - Each race specifies exactly 3 affinity classes in `affinityRows` matching DEC-036:
     - Human: Fighter, Wizard, Cleric
     - Dwarf: Paladin, Cleric, Rogue
     - Elf: Ranger, Druid, Sorcerer
     - Half-elf: Fighter, Druid, Bard
     - Halfling: Fighter, Druid, Rogue
     - Gnome: Fighter, Cleric, Wizard
     - Half-orc: Barbarian, Druid, Fighter
     - Tiefling: Fighter, Warlock, Cleric
     - Dragonborn: Fighter, Monk, Cleric
   - In `cells`, exactly 27 cells have `affinity: true` and 81 have `affinity: false`.
   - Tested by `affinity-rows-27`, and killed by mutants `affinity-count`, `affinity-membership`, `affinity-order`, and `affinity-cells`.

3. **Role Distribution & Elf Ranger Tank Isolation:**
   - Elf Ranger is confirmed as the only concrete role tag: `{ raceId: "srd:race:elf", classId: "srd:class:ranger", role: "tank" }`.
   - All other 26 affinity cells have `role: "OWNER_TODO"`.
   - All 81 non-affinity cells have `role: null`.
   - Concrete tags (`tank`, `healer`, `damage`) are zero for all other cells.
   - Non-obvious example rows (Half-elf Fighter/Druid/Bard, Half-orc Barbarian/Druid/Fighter) are verified as `OWNER_TODO`.
   - Mutants `ranger-is-tank` and `undecided-role` are killed.

4. **Bonus & Job-Pick Weights as OWNER_TODO (No Numeric Effects):**
   - Canonical `race_class_affinity.json` contains zero JSON numbers.
   - All 27 affinity cells store `bonus: "OWNER_TODO"` and `jobPickWeight: "OWNER_TODO"`.
   - Non-affinity cells store `bonus: null` and `jobPickWeight: null`.
   - Safe readers `readAffinityBonus` and `readJobPickWeight` return `applied: false` and `value: null` / `multiplier: null`.
   - If raw numeric values are injected into cells, readers return `applied: false, value/multiplier: null, reason: "unapproved"`.
   - Mutants `bonus-unset` and `weight-unset` are killed.

5. **Deterministic Alias Resolution:**
   - Tested resolution across all identifiers:
     - Races: `srd:race:*`, DEC-036 spelling (`Half-elf`), catalogue spelling (`Half-Elf`), short id (`half-elf`), and species reference id (`half_elf`).
     - Classes: `srd:class:*`, bare slug (`fighter`), plan token (`FIGHTER`), catalogue name (`Fighter`).
   - Verified that `resolveRace(doc, "elf")` resolves to `srd:race:elf` without colliding with `half-elf`.
   - Verified that `resolveClass(doc, "NONE")` correctly returns `{ ok: false, reason: "unknown-id" }`.
   - Verified that ambiguous or unknown IDs fail cleanly without throwing or hard-locking.

6. **Invalid Data Excluded from Scheduler Candidates:**
   - `schedulerView(doc)` validates the table before emitting candidates.
   - When fed an invalid table (e.g., any cell with `legal: false`), `schedulerView` returns `{ ok: false, errors: [...] }` and emits zero candidates.
   - When valid, returns 108 rows where `weightApplied: false`, `multiplier: null`, `bonusApplied: false`, `bonus: null`.

7. **Unapproved Playtest Suggestions:**
   - In `unset.playtestSuggestions`, `status` is `"unapproved"`, `applied` is `false`, and `pendingOwnerRuling` is `true`.
   - `unapprovedSuggestionEffects(doc)` returns `null` for `rollBonus`, `xpRate`, and `weightMultiplier`.
   - Documentation in `DEUS_RaceClassAffinity.md` section 7 explicitly documents them as text without operational effect.
   - Mutant `suggestions-unapproved` is killed.

8. **Exhaustive Negative Fixtures (Mutation Coverage):**
   - Every rule in `RULE_LIST` (22 content rules) plus `schema` (4 sub-fixtures) has targeted in-memory mutation tests.
   - Each mutant fails with strictly its own designated error code, and passing is restored when that code is disabled.

---

## 4. Findings

- **BLOCKER:** None.
- **MAJOR:** None.
- **MINOR:** None.

---

## 5. Final Verdict

VERDICT: CLEAN PASS
