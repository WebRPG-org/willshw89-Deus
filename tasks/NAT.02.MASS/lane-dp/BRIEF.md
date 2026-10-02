# lane-dp: Ledger reservoir vocabulary, holding forms, sink cleanup, and the obsidian and peridotite rows

Plan title: "Ledger reservoir vocabulary, split held/holding forms, and catalogue collapse postings to held". The held half is dropped here under DEC-083 item 2 (Decision 1; PM to confirm): the tested design for it is kept at the end.

| Field | Value |
|---|---|
| WBS | NAT.02.MASS (SHARED; merged D2/D3 MASS), part 3 of 7 (absorbs lane-dt's obsidian row and adds the peridotite band-rock row) |
| taskId (manifest) | NAT.02.MASS |
| Branch | `task/lane-dp` |
| Manifest | `tasks/NAT.02.MASS/lane-dp/lane.json` (the PM installs it; draft below) |
| Writer -> reviewer | codex -> grok |
| Size | M |
| Wave | 3 of 19 |
| Dependencies | lane-do2 (merged `968ac67c`; it re-cut lane-do), lane-dn (merged `a3db8f93`) |
| RMMZ editor must be closed | no (`game/data/sim/` is a subfolder the editor does not load or save) |

Base: `main` at `df911859` or later (DEC-083 is recorded there; the ledger, catalogue and mass tables are integer centipounds since lane-do2). Pin the SHA you start from. Figures below are the PM drafter's runs at `6ee18bf4` (the code in the lane's files is unchanged since) in a clean clone; rerun each guard and keep-green suite at your own base before you claim FAIL-before or PASS-after.

**Decisions this brief assumes (PM to confirm before launch; the drafter's recommendation is written in):**
1. **DEC-083 (Owner, recorded 2026-10-02) item 2: no rubble accounting; matter is moved, not converted.** The parcel model (`held` host parcels of detached solid matter, `detach`/`settle`, rubble `pick`/`drop`, `break -> rubble held`, the flip of collapse postings to `held`, quench into a parcel) served the collapse design DEC-083 replaces. Its consumers lane-fo and lane-eq are on DEC-083's re-plan list; lane-du's parcel store (not on that list) is the other user, so the PM decides it with the re-plan. Recommended: drop it now (a form is cheap to add later; the catalogue flip would have to be reverted); build the rest. If the PM keeps the parcel model, restore the items listed under "Dropped" at the end.
2. **Sinks.** After deleting `world-edge`, `rain` (source) and `evaporation`, `magic` and `debug-explicit` still reach every class. Recommended: keep them as the only declared escape hatches (magic is DEC-018's open question; `debug-explicit` is what `tools/sim/test_reclaim.js:221,230` and `test_reclaim_longrun.js:103` inject to prove the audit catches a leak) and make `no_deletion_sink_conserved` fail for any other sink that reaches a conserved family (mineral, water, fe, cu, ag, au, pt, gem).
3. **Densities** (kg/m3, `PM_DEFAULT`): obsidian 2400 (3,398 kg per slice, 749,131 cp), peridotite 3300 (4,672 kg, 1,030,000 cp); strataIds 55 and 54 (54-63 are free at base). The drafter computed the cp with `kgToCp`; the test recomputes, it does not pin.
4. **`game/data/sim/mass_tables.json` joins allowedPaths** for six stump object rows only (Preconditions 5).
5. **`tools/sim/fixtures/ledger/longrun_expected.json` joins allowedPaths** for one reviewed re-pin of the long-run (Scope, long-run). The `cpPins` constant of `tools/sim/test_reclaim_longrun.js` (:37) is a one-line handoff with lane-dr (Shared files).
6. **`tools/test_zrange.js` is dropped from the gates** (the plan listed it): it is red at base on `matter_unchanged` for a reason outside this lane (Preconditions 5).
7. **Quench needs no new row:** `solidify` (lava fluid -> stone strata) already is that move, and `normalize` refuses a second row for the same move. lane-ei names `solidify`, or the PM renames it.

## PM rulings at dispatch (2026-10-02, PM; the "Decisions this brief assumes")

Base: `main` after lane-gp merged (it added the six stump rows to `game/data/sim/mass_tables.json` and made `test_zrange.js` green). Pin the SHA you start from.

1. Drop the parcel model (DEC-083 item 2): confirmed. The "Dropped by Decision 1" section stays in this brief as the record; build nothing from it.
2. Sinks: `magic` and `debug-explicit` are the only declared escape hatches; `no_deletion_sink_conserved` fails for any other sink that reaches a conserved family: confirmed.
3. `legacy-levels-write` as a source and a sink with the listed classes and forms: confirmed.
4. Densities obsidian 2400 kg/m3 (strataId 55) and peridotite 3300 kg/m3 (strataId 54), `PM_DEFAULT`, cp recomputed from `kgToCp` by the test: confirmed.
5. The six stump rows are already in `mass_tables.json` (lane-gp). The file stays in allowedPaths only for rows the obsidian and peridotite materials need; if they need none, do not touch it.
6. One reviewed re-pin of `tools/sim/fixtures/ledger/longrun_expected.json`, with the reason shown in the report: granted.
7. `tools/test_zrange.js` stays in the gates (the plan listed it; it is green after lane-gp; about 8 minutes).
8. Quench reuses `solidify`; no new row: confirmed.
9. `tools/sim/test_reclaim_longrun.js` in allowedPaths for the `cpPins` constant only: confirmed. lane-dr is cut before this lane and merges first; this lane merges `origin/main` into its branch afterwards (a normal merge), recomputes `cpPins` on the combined state and shows the reason.
10. `tools/sim/test_living_world_rules.js` as a gate: confirmed.
11. Verdicts: `CLEAN PASS`, `PASS` and `PASS WITH MINORS` are all accepted by merge_gate since lane-gk merged.

12. GAME TRANSLATION block: not required for this lane (DEC-087 item 7: the diff touches only `game/js/sim` and `game/data/sim`, which no plugin loads).

## Goal

Every DEC-040 path the designs name for water and lava is an allowed ledger transform: displaced fluid (`holding`), water's return and pore cycle, magma and the core, with no deletion sink beyond the declared escape hatches. The catalogue gains obsidian (strataId 55) and peridotite (strataId 54).

## Preconditions (checked by the drafter at `6ee18bf4`)

1. `game/js/sim/ledger_defaults.js` (209 lines): FORMS :12 (seven: strata, item, object, ruin, fluid, ice, creature), FAMILIES :25, CLASSES :40 (`lava` has form `fluid` only; `water` fluid, ice, item, creature), ROWS :71, SOURCES :156 (`magic`, `world-edge`, `debug-explicit`, `rain`), SINKS :174 (`magic`, `world-edge`, `debug-explicit`, `evaporation`), export :199 (`schema: 2`). None of the new forms exists. `ledger.js` validates a config in `normalize` (:83): transforms keep the family mix (E_FAMILY :166) and no two rows repeat a move, a source never reaches ore or a finite family without `allowFinite` (`flows`, :212-250), and `restore` refuses a snapshot taken with another config fingerprint (:634): snapshots from before this lane are refused (none ship).
2. `game/data/sim/materials.json`: 71 rows, strataIds 0-53, no obsidian or peridotite; `lava` = basalt 905,218 cp; every natural stone row has `yield` and `collapse` postings that sum to `cpPerStratum`. `game/js/sim/materials.js` `validate` (:232) checks strataIds (unique, 0-63, :312-314) and posting rows against the ledger (`transformOk`, :320). `tools/sim/migrate_mass_units.js` is the one-time mu-to-cp importer (`validateCheck` :460 checks `cpPerStratum` = `kgToCp(kgPerSlice)` and posting sums); do not run its unflagged CLI (it rewrites both tables): add rows by hand or by a small script and keep `--check` green.
3. The ledger, `materials.js` and `reclaim.js` are loaded by no plugin; `hydrology/cycle.js:34` keeps its own `RETURN` label. Class C: no F5 proof.
4. Existing tests call the flows this lane deletes. Drafter's experiment (scratch copy): deleting `world-edge`, the `rain` source and the `evaporation` sink turns 16 checks of `tools/sim/test_ledger.js` red (62 passed, 16 failed; lines :270, :559-562, :659-662, :672-673, :691, :696, :774, :796) and every `tools/sim/test_ledger_longrun.js` seed (ops at :298-316, :332, :355-356, :406-411; embedded pins `SCHEMA2_LEDGER` :617; fixture `tools/sim/fixtures/ledger/longrun_expected.json`). Re-point each to `magic`, `debug-explicit`, `legacy-levels-write` or the new rows; each must still be able to fail.
5. **Two gates are red at base for reasons outside this lane** (after lane-gh merged six stump objects and their placement): `node tools/sim/test_materials.js` fails `catalog_objects_covered` (113 passed, 1 failed): `birch_stump`, `dead_stump`, `fruit_stump`, `oak_stump`, `pine_stump` and `swamp_stump` are in `game/data/DEUS_WorldCatalog.json` but not in `mass_tables.json` `catalogIndex.objects` (`test_materials.js:209`); this lane fixes it with six object rows shaped like the existing `stump` row (wood, 1,764 cp; PM to confirm the masses). `node tools/test_zrange.js` fails `matter_unchanged` (9 passed, 1 failed, 312 s): objects 97-100 differ from the pinned geology reference in all three configurations; not bisected (lane-gh is the likely cause); its fixture is not this lane's.
6. Green at base (one run each): `check_deus_syntax` 62 files 0 errors; `test_ledger` 119/119 (10 s); `test_ledger_longrun` 18/18 (18 s); `test_reclaim` 38/38; `test_reclaim_longrun` 20/20; `test_living_world_rules`, `test_water_dynamics` PASS; `test_world_items` 86/86; `test_decay_core` 87/87; `migrate_mass_units.js --check` OK; `validate_spell_effects` exit 0.
7. Drafter's experiment, vocabulary only (new forms and rows, the three flows deleted): `test_reclaim` 38/38, `test_world_items` 86/86, `test_decay_core` 87/87, `test_living_world_rules` and `test_water_dynamics` PASS, `test_materials` the same one failure; but `tools/sim/test_reclaim_longrun.js` `pinned checksums` goes red (seed 1 `bc96db4d`, seed 2 `3ae29884` against `cpPins` `1afb4f75`, `54b9da8d`): reclaim's checksum embeds `ledger.checksum()`, which carries the config fingerprint, so any vocabulary change moves it.

## Scope

- Manifest `tasks/NAT.02.MASS/lane-dp/lane.json`, branch `task/lane-dp`, writer codex, reviewer grok; the gate commands below are its gateTests.
- `ledger_defaults.js` FORMS: add `holding` (fluid held by the water authority), `return`, `core`, `magma`, `pore`. CLASSES: `lava` gets fluid, holding, magma, core; `water` gets holding, return, pore. No solid class has `holding`.
- ROWS: `tap` lava core -> magma; `vent` lava magma -> fluid; `engulf` lava fluid -> magma; `displace`/`restore` water and lava fluid <-> holding; `exit` water fluid|holding -> return; `rain` water return -> fluid; `infiltrate` water fluid -> pore; `seep` water pore -> fluid; `release` water pore -> holding. Every row keeps the family mix; no row outputs an ore class.
- SOURCES and SINKS: delete `world-edge` (both), the `rain` source and the `evaporation` sink (the world wraps and has no edge; water leaves by `exit` and returns by `rain`). Add `legacy-levels-write` as a declared, `ownerConfirmed: false` source and sink for frozen Levels writers (classes stone, rubble, soil, sediment, wood, water, lava; forms strata, fluid; never ore or a finite family; `authority` says transitional, retired by lane-dy). Update the stale mu/du wording in the file's comments.
- Rows, by hand or script, in `materials.json`: `kind: "natural"`, ledger class `stone`, `ledgerForm: "strata"`, `kgPerSlice` = round(density x 1.41584 m3), `cpPerStratum = kgToCp(kgPerSlice)`, support, porosity and blast group from basalt (`PM_DEFAULT`), `yield` and `collapse` postings of the same shape as basalt's that sum to the row: obsidian (strataId 55, the quench output) and peridotite (strataId 54, merged D1 section 3.2's ultramafic row so lane-dg can map it; Levels ids are lane-dg's). Six stump object rows in `mass_tables.json` plus their `catalogIndex.objects` entries.
- `materials.js` only if a validator table needs the new ids or forms. Do not remove its `mu` alias emission (:88, :153-164, :178-198): `reclaim.js` reads it until lane-dr merges.
- Long-run (`test_ledger_longrun.js`): re-express each removed flow with its accounted equivalent (evaporate -> `exit`, rain -> `rain`, off-edge outflow and inflow -> `debug-explicit` or `legacy-levels-write`), update the harness's shadow model, re-pin `SCHEMA2_LEDGER` and, once, the fixture (`--write-fixture`) with written expected-state reasoning; every `fault_*_detected` kill must still fire. Never regenerate expectations in a normal run.
- Docs: `docs/systems/DEUS_Matter.md` (a Vocabulary section: forms, the holding/return/pore and core/magma cycles, the sources and sinks left and why) and `docs/systems/DEUS_Materials.md` (Ledger mapping, :43-53: the new rows and the quench move).

## Out of scope

- Callers; the core formula and `ensureCore`/`ensureChamber` (lane-dq); transactions (lane-dq); Levels material ids (lane-dg; obsidian lane-dj); quench itself (lane-ei); the host (lane-du); art rows (lane-fl); magic; any change to `ledger.js`, `reclaim.js`, `world_items` or a plugin; the `mu` alias removal (a later materials.js writer, after lane-dr).
- Anything not in Scope is out of scope (AGENTS.md Rule 1); ideas go to the PM.

## Files this lane may touch (allowedPaths)

- `game/js/sim/ledger_defaults.js`, `game/data/sim/materials.json`, `game/data/sim/mass_tables.json` (Decision 4), `game/js/sim/materials.js`
- `tools/sim/migrate_mass_units.js`, `tools/sim/test_ledger.js`, `tools/sim/test_ledger_longrun.js`, `tools/sim/fixtures/ledger/longrun_expected.json` (Decision 5), `tools/sim/test_materials.js`, `tools/sim/test_reclaim_longrun.js` (the `cpPins` constant only)
- `docs/systems/DEUS_Matter.md`, `docs/systems/DEUS_Materials.md`, `tasks/NAT.02.MASS/lane-dp/**`

merge_gate refuses the merge (SCOPE_VIOLATION) if the branch changes any other path.

### Shared files and merge order

- `ledger_defaults.js`: lane-do2 (merged) -> **lane-dp** (last writer). `materials.json`, `materials.js`, `test_materials.js`, `DEUS_Materials.md`: lane-do2 -> **lane-dp** -> lane-fu (w16, folded into lane-fj). `migrate_mass_units.js`: lane-do2 -> **lane-dp**. `test_ledger.js`, `test_ledger_longrun.js`: lane-do2 -> **lane-dp** -> lane-dq (w4). `DEUS_Matter.md`: lane-dn -> lane-do2 -> **lane-dp** -> lane-dq (w4) -> lane-du (w5). `mass_tables.json`: lane-dn, lane-do2, then this lane. Start from a base holding every earlier writer.
- **dp and dr touch one constant together:** this lane's vocabulary moves `cpPins` (Preconditions 7) and lane-dr's cp rename moves it again. Whichever lane merges second merges `origin/main` into its branch (a normal merge, no rebase), recomputes `cpPins` on the combined state and shows the reason; the PM runs both lanes' gate sets on the exact combined candidate and records the SHAs. Wave 3 runs beside lane-dd and lane-dr (DEC-078); no other shared file.

## Tests

`FAILS on main` means shown failing at your base with the new check present (it must reach a named failing assertion; a missing module or a harness exception does not count) and passing at your tip (Rule 4). New checks go into the existing owned harnesses. Use the real API: `createLedger`, `register`, `seal`, `transform`, `amount`, `familyTotal`, `assertBalanced`, `snapshot`, `restore`, `unconfirmed` (`ledger.js:706-714`). A changed JSON form with balanced untouched accounts proves nothing: show the source debit, the destination credit and exact cp.

### Must fail without the change

- `tools/sim/test_ledger.js` ::no_deletion_sink_conserved: no sink other than `magic`, `debug-explicit`, `legacy-levels-write` reaches a conserved family, and those three are `ownerConfirmed: false` with an authority text - FAILS on main
- ::water_cycle_closes: exit, rain, displace, exit from holding, infiltrate, seep, release, restore on one world: `familyTotal("water")` constant and `assertBalanced` clean at every step, end state equals start - FAILS on main
- ::pore_roundtrip: fluid -> pore -> fluid and pore -> holding -> fluid return exact cp; `snapshot`/`restore` keeps the forms apart - FAILS on main
- `tools/sim/test_materials.js` ::obsidian_row_present; ::peridotite_row_present: id, strataId, class, `cpPerStratum` = `kgToCp(kgPerSlice)`, postings close, `catalogue validates` - FAIL on main

### Guards (pass before and after)

- `test_ledger.js` ::quench_same_family: `solidify` (lava fluid -> stone strata) succeeds and keeps the mineral total; water -> stone is refused (E_FAMILY); the defaults hold no row that changes a family. Mutant `cross_family_row` must turn it red.

### Other named checks (pass at the tip)

- `test_ledger.js` ::core_tap_vent_closes (tap, vent, engulf conserve the lava family); ::holding_is_fluid_only (holding on water and lava only, none on a solid class); ::ore_never_output_still; ::wrapped_world_has_no_edge (no `world-edge`, `rain` source or `evaporation` sink); ::legacy_write_source_is_unconfirmed (`unconfirmed()` lists it).
- `test_materials.js` ::strata_ids_unique_and_under_64; ::new_row_postings_close; ::catalog_objects_covered (back to PASS with the six stump rows).

### Mutants and provocations

- `evaporation_sink_back` -> `no_deletion_sink_conserved`; `cross_family_row` (a defaults row water -> stone) -> `quench_same_family`; `solid_holding_form` (`holding` on `stone`) -> `holding_is_fluid_only`; `duplicate_strataId` (obsidian = 54) -> `strata_ids_unique_and_under_64`. Mutants edit text in memory; files on disk are never rewritten.

### Gate commands (lane.json gateTests; each runs in a fresh clone, 900 s timeout)

- `node tools/check_deus_syntax.js`; `node tools/sim/test_ledger.js`; `node tools/sim/test_ledger_longrun.js`; `node tools/sim/test_materials.js`; `node tools/sim/test_reclaim.js`; `node tools/sim/test_reclaim_longrun.js`; `node tools/world_items/test_world_items.js`; `node tools/sim/test_living_world_rules.js`; `node tools/sim/migrate_mass_units.js --check`; `node tools/sim/test_decay_core.js`; `node tools/spells/validate_spell_effects.js`. Read-only for this lane: the reclaim, world-items and decay tests (apart from the `cpPins` constant). Any red gate other than the two in Preconditions 5 goes to the PM; never substitute a shorter command or weaken a gate.

## lane.json (draft)

```json
{ "lane": "lane-dp", "taskId": "NAT.02.MASS", "branch": "task/lane-dp", "writer": "codex", "reviewer": "grok",
  "allowedPaths": ["game/js/sim/ledger_defaults.js", "game/data/sim/materials.json", "game/data/sim/mass_tables.json", "game/js/sim/materials.js",
    "tools/sim/migrate_mass_units.js", "tools/sim/test_ledger.js", "tools/sim/test_ledger_longrun.js", "tools/sim/fixtures/ledger/longrun_expected.json",
    "tools/sim/test_materials.js", "tools/sim/test_reclaim_longrun.js", "docs/systems/DEUS_Matter.md", "docs/systems/DEUS_Materials.md", "tasks/NAT.02.MASS/lane-dp/**"],
  "gateTests": [
    {"cmd":"node","args":["tools/check_deus_syntax.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/sim/test_ledger.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/sim/test_ledger_longrun.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/sim/test_materials.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/sim/test_reclaim.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/sim/test_reclaim_longrun.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/world_items/test_world_items.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/sim/test_living_world_rules.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/sim/migrate_mass_units.js","--check"],"timeoutSec":900},
    {"cmd":"node","args":["tools/sim/test_decay_core.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/spells/validate_spell_effects.js"],"timeoutSec":900} ] }
```

## F5 evidence

None: Class C. The ledger, catalogue and mass tables are loaded by no plugin, so there is no in-game scene to open (Rule 5 applies to any screenshot you do cite). The editor stays closed (DEC-059); nothing here touches `game/js/plugins.js` or an RMMZ database file. If you want a smoke run, use a snapshot copy of `game/`: `node tools/add_test_plugin.js <copy>/js/plugins.js`, then `node tools/run_tests.js smoke --game <copy>`; it proves only that no plugin broke.

## GAME TRANSLATION (class C, foundational; the diff touches `game/`)

- **Effect:** displaced and drained water and lava, returning rain, magma and obsidian can be accounted without mass appearing or vanishing (DEC-083 amendment 2: fluids stay calculated, finite and drainable); deep rock and quench have a catalogue mass. Trigger, authority, path: downstream displacement and return, pore exchange, vents and quench call `ledger.transform`; `ledger_defaults.js` declares the vocabulary, `ledger.js` enforces it, `materials.json`/`materials.js` own identity, cp and postings.
- **Bridge:** DEFERRED to lane-ec (water authority), lane-ei (quench), lane-dy (accounted Levels writers), lane-dg/dj (band-rock and obsidian ids): none is playable from this lane. Persistence: the ledger snapshot carries the config fingerprint; save wiring is theirs. Failure without it: closed fluid cycles have no destinations; band rock and obsidian have no catalogue mass. Proof: the gate commands above, headless only; in-game proof belongs to the consumers.
- Report simulation, engine bridge, presentation, input, save/load and playable verification as YES/NO with evidence; "not checked" where not observed.

## Writer and reviewer

- Writer `codex` (family codex), reviewer `grok` (family grok): different families, as merge_gate requires. Authority: DEC-031 item 1, DEC-058, `docs/CANONICAL_ROLES.md` section 2.1; DEC-078 (several lanes per provider; this lane does not wait for another lane's writer or reviewer).
- Authors `deus-codex` (tag `[codex]`) and `deus-grok` (tag `[grok]`). The review is a real launch through `tools/ops/launch_worker.ps1`; the review commit is the branch tip (one parent), touches only `tasks/NAT.02.MASS/lane-dp/review_grok_<sha8>.md`, which holds the full 40-character SHA of the last non-review commit and ends with exactly one verdict line: `VERDICT: CLEAN PASS` or `VERDICT: PASS`; `VERDICT: PASS WITH MINORS` only after lane-gk (DEC-085 item 2) merges (merge_gate at `6ee18bf4` refuses it, `tools/governance/merge_gate.js:234`; PM to confirm at launch). The reviewer runs every gate on the writer's tip in a fresh clone.

## Rules that bind this lane

- DEC-085: main takes only merges and PM commits. Commit only on `task/lane-dp`, staging only the allowedPaths (`git add <paths>`, never `-A`); push the branch; the final message ends with `FINAL SHA: <40 hex>`. The PM merges through `merge_gate` (`--no-ff`). The manifest and this brief are the PM's: a writer commit that changes either triggers MANIFEST_TAMPERED. Mail is local files.
- Mass is integer centipounds in a closed ledger (DEC-038, DEC-040); soil, decay and reclamation walks stay deferred (DEC-057, DEC-059 item 4); no art (DEC-007); engine core read-only (Rule 9); tests must be able to fail (Rule 4); two failed fixes on one problem: stop and ask (Rule 10).
- Report: one paragraph per AGENTS.md format plus the real test output and the GAME TRANSLATION block above.

## Dropped by Decision 1 (restore only if the PM keeps the parcel model)

Add FORMS `held` (host parcels of detached solid matter) and give it to every class that has a `strata` form (stone, rubble, soil, sediment, wood, humus, ash, charcoal, gem, the ores, the traces; no fluid class). Rows: `detach` C strata -> C held and `settle` C held -> C strata for each such class; `break` stone strata|object|ruin -> rubble held (keep the `-> strata` row); `pick` rubble held -> item and `drop` rubble item -> held; `quench` lava fluid -> stone held (not needed if Decision 7 holds). Flip a collapse posting to `form: "held"` when its process is `break` or `identity`, its destination form is `strata` and its destination class has `held`: 35 postings in `materials.json` and 29 object postings in `mass_tables.json` (the ones `note("collapse")` reads); postings to `item`, `object`, `ice` and the `rot` postings stay. Checks: `collapse_postings_form_held` (FAILS on main), `held_parcel_roundtrip`, and `holding_is_fluid_only` extended (no class has both forms); mutant `fluid_held_form`. Drafter's scratch experiment of exactly this flip: `test_ledger` 119/119, `test_materials` the same one failure, `test_reclaim` 38/38, `test_world_items` 86/86, `test_decay_core` 87/87; `test_reclaim_longrun` pins seed 1 `688d31b1`, seed 2 `fe6d79d8`.
