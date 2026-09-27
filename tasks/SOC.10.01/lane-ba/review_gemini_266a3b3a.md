# SOC.10.01 Lane BA Independent Review

**Reviewer:** Gemini (gemini-3.8-flash, thinking HIGH, authorized merge gate per Owner DEC-034)  
**Writer:** Grok  
**Reviewed SHA:** `266a3b3a0e8e80e7521013d36c3dbc65b552ee56`  
**Base SHA:** `2755f61947610723723384ad39ad3fbc92d4679f` (origin/main)  
**Date:** 2026-09-27  

---

## 1. Scope Verification

`git merge-base origin/main 266a3b3a0e8e80e7521013d36c3dbc65b552ee56`: `2755f61947610723723384ad39ad3fbc92d4679f`  
`git diff --name-status 2755f61947610723723384ad39ad3fbc92d4679f 266a3b3a0e8e80e7521013d36c3dbc65b552ee56`

| Changed Path | Status | Within allowedPaths? | Notes |
|---|---|---|---|
| `docs/systems/DEUS_PersonIdentity.md` | Added | YES (`docs/systems/DEUS_PersonIdentity.md`) | Spec and mapping docs |
| `game/data/society/person_identity.schema.json` | Added | YES (`game/data/society/person_identity.schema.json`) | Draft 2020-12 schema |
| `game/js/plugins/DEUS_Colonists.js` | Modified | YES (`game/js/plugins/DEUS_Colonists.js`) | Minimal identity wiring & migration |
| `game/js/sim/society/identity.js` | Added | YES (`game/js/sim/society/**`) | Pure identity module |
| `tasks/SOC.10.01/lane-ba/BRIEF.md` | Added | YES (`tasks/SOC.10.01/**`) | Lane task brief |
| `tasks/SOC.10.01/lane-ba/REPORT.md` | Added | YES (`tasks/SOC.10.01/**`) | Writer report |
| `tasks/SOC.10.01/lane-ba/lane.json` | Added | YES (`tasks/SOC.10.01/**`) | Lane config |
| `tasks/SOC.10.01/lane-ba/launches/20260927_101326_prompt.txt` | Added | YES (`tasks/SOC.10.01/**`) | Launch prompt artifact |
| `tools/society/test_person_identity.js` | Added | YES (`tools/society/**`) | Automated test suite and mutant kills |

- **DEC-007 (NO ART):** Confirmed. Zero art files generated, edited, or integrated.
- **Forbidden Paths Check:** Zero changes to `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, any `*WBS*.md`, or any live sibling lane paths (AU, AV, AW, AX, AY, AZ).
- **Scope Verdict:** STRICT PASS. All modified files are strictly within `allowedPaths`.

---

## 2. Gate Tests (Executed in Isolated Temporary Clone at SHA `266a3b3a0e8e80e7521013d36c3dbc65b552ee56`)

### Gate Test A: `node tools/society/test_person_identity.js`
- **Command:** `node tools/society/test_person_identity.js`
- **Raw Exit Code:** `RAW_EXIT:0`
- **Output:**
```text
=== PERSON IDENTITY (SOC.10.01, INV-SOC-01, INV-SOC-02) ===

--- Module, schema and derivation ---
  [PASS] create_defaults_none: {"schema":1,"craft":"NONE","civicOffice":"NONE","class":{"id":"NONE","level":null}}
  [PASS] create_rejects_duty: create accepted a duty field
  [PASS] input_not_mutated: changeAxis wrote into the input record
  [PASS] change_craft_leaves_other_axes: {"schema":1,"craft":"BLACKSMITH","civicOffice":"TREASURER","class":{"id":"srd:class:wizard","level":2}}
  [PASS] change_office_leaves_other_axes: {"schema":1,"craft":"FARMER","civicOffice":"MARSHAL","class":{"id":"srd:class:wizard","level":2}}
  [PASS] change_class_leaves_other_axes: {"schema":1,"craft":"FARMER","civicOffice":"TREASURER","class":{"id":"srd:class:rogue","level":5}}
  [PASS] none_craft: {"schema":1,"craft":"NONE","civicOffice":"TREASURER","class":{"id":"srd:class:wizard","level":2}}
  [PASS] none_office: {"schema":1,"craft":"FARMER","civicOffice":"NONE","class":{"id":"srd:class:wizard","level":2}}
  [PASS] none_class: {"schema":1,"craft":"FARMER","civicOffice":"TREASURER","class":{"id":"NONE","level":null}}
  [PASS] every_craft_change_is_independent: a craft change moved office or class
  [PASS] every_office_change_is_independent: an office change moved craft or class
  [PASS] every_class_change_is_independent: a class change moved craft or office
  [PASS] reject_bad_craft: bad craft was stored
  [PASS] reject_bad_office: HEALER was stored
  [PASS] reject_bad_class: psion was stored
  [PASS] reject_level_0: level 0 was stored
  [PASS] reject_level_21: level 21 was stored
  [PASS] reject_none_with_level: NONE carried a level
  [PASS] reject_class_without_level_object: a class id was stored with a null level
  [PASS] validate_rejects_duty_field: duty field validated
  [PASS] serialize_round_trip: {"schema":1,"craft":"FARMER","civicOffice":"TREASURER","class":{"id":"srd:class:wizard","level":2}}
  [PASS] deserialize_rejects_garbage: garbage JSON validated
  [PASS] defaults_deterministic: two derivations differed
  [PASS] duty_does_not_replace_craft: {"schema":1,"craft":"BLACKSMITH","civicOffice":"NONE","class":{"id":"srd:class:fighter","level":1}}
  [PASS] unmapped_calling_is_none: {"schema":1,"craft":"NONE","civicOffice":"NONE","class":{"id":"NONE","level":null}}
  [PASS] string_job_used_when_calling_does_not_map: {"schema":1,"craft":"BLACKSMITH","civicOffice":"NONE","class":{"id":"NONE","level":null}}
  [PASS] calling_wins_over_string_job: {"schema":1,"craft":"CARPENTER","civicOffice":"NONE","class":{"id":"NONE","level":null}}
  [PASS] rank_is_not_an_office: {"schema":1,"craft":"NONE","civicOffice":"NONE","class":{"id":"NONE","level":null}}
  [PASS] calling_name_is_not_the_class: {"schema":1,"craft":"NONE","civicOffice":"NONE","class":{"id":"srd:class:fighter","level":1}}
  [PASS] bare_class_id_is_level_1: {"schema":1,"craft":"NONE","civicOffice":"NONE","class":{"id":"srd:class:wizard","level":1}}
  [PASS] out_of_range_level_is_none: {"schema":1,"craft":"NONE","civicOffice":"NONE","class":{"id":"NONE","level":null}}
  [PASS] saved_identity_survives_load: {"schema":1,"craft":"FARMER","civicOffice":"TREASURER","class":{"id":"srd:class:rogue","level":4}}
  [PASS] old_save_gets_defaults: {"schema":1,"craft":"LOGGER","civicOffice":"NONE","class":{"id":"srd:class:wizard","level":2}}
  [PASS] invalid_saved_identity_is_replaced: {"schema":1,"craft":"MINER","civicOffice":"NONE","class":{"id":"NONE","level":null}}
  [PASS] doc_map_matches_module: doc 26 module 26
  [PASS] schema_craft_enum: ALCHEMIST,ARMORER,BAKER,BLACKSMITH,BOWYER,BREWER,BUTCHER,CARPENTER,COOK,FARMER,FISHER,FLETCHER,FORAGER,GLASSWORKER,HERBALIST,HUNTER,JEWELER,LEATHERWORKER,LOGGER,MASON,MERCHANT,MILLER,MINER,NONE,POTTER,QUARRYMAN,SCRIBE,SMELTER,SPINNER,TAILOR,TANNER,THATCHER,WEAPONSMITH,WEAVER,WOODCARVER
  [PASS] schema_office_enum: ADMIN,ENVOY,EXECUTIVE,HEALER_DIRECTOR,LEADER,MAGISTRATE,MARSHAL,MASTER_OF_WORKS,MINT_MASTER,NONE,PROVISIONER,QUARTERMASTER,RECORDER,STEWARD,TRADE_MASTER,TREASURER
  [PASS] schema_class_enum: NONE,srd:class:barbarian,srd:class:bard,srd:class:cleric,srd:class:druid,srd:class:fighter,srd:class:monk,srd:class:paladin,srd:class:ranger,srd:class:rogue,srd:class:sorcerer,srd:class:warlock,srd:class:wizard
  [PASS] schema_rejects_extra: additionalProperties is open
  [PASS] schema_matches_srd_classes: srd srd:class:barbarian,srd:class:bard,srd:class:cleric,srd:class:druid,srd:class:fighter,srd:class:monk,srd:class:paladin,srd:class:ranger,srd:class:rogue,srd:class:sorcerer,srd:class:warlock,srd:class:wizard module srd:class:barbarian,srd:class:bard,srd:class:cleric,srd:class:druid,srd:class:fighter,srd:class:monk,srd:class:paladin,srd:class:ranger,srd:class:rogue,srd:class:sorcerer,srd:class:warlock,srd:class:wizard
  [PASS] schema_accepts_none: 
  [PASS] schema_accepts_fighter: 
  [PASS] schema_rejects_duty: schema accepted duty
  [PASS] schema_rejects_none_level: schema accepted NONE level 5
  [PASS] schema_rejects_null_class_level: schema accepted a null fighter level
  [PASS] module_and_schema_agree: module rejected a schema-shaped record
  [PASS] founder_quota_crafts: BLACKSMITH,CARPENTER,COOK,HERBALIST,LOGGER,MINER,NONE,NONE
  [PASS] founder_quota_offices_none: quota derivation wrote an office

--- Mutants ---
  [PASS] mutant couple_class_to_craft killed by change_class_leaves_other_axes, every_class_change_is_independent
  [PASS] mutant couple_craft_to_class killed by change_craft_leaves_other_axes, every_craft_change_is_independent
  [PASS] mutant couple_office_to_craft killed by change_office_leaves_other_axes, every_office_change_is_independent
  [PASS] mutant reject_none killed by none_craft, none_office, none_class, create_defaults_none
  [PASS] mutant drop_identity_on_load killed by saved_identity_survives_load
  [PASS] mutant duty_sets_craft killed by duty_does_not_replace_craft
  [PASS] mutant unmapped_calling_becomes_farmer killed by unmapped_calling_is_none
  [PASS] mutant schema_drops_none killed by schema_accepts_none

--- Year-0 founders and save/load ---
  [PASS] identity_module_loaded: module loaded
  [PASS] year0_founder_count: 72 historical founders, 72 people, 72 units (expected 72 founders); crafts {"MASON":3,"NONE":34,"FARMER":9,"MILLER":4,"BLACKSMITH":6,"HUNTER":4,"LOGGER":2,"FISHER":2,"CARPENTER":5,"COOK":1,"HERBALIST":1,"POTTER":1}; errors 0
  [PASS] year0_founders_valid: 72 identities match derivation and the schema
  [PASS] year0_founder_offices_none: 72 civicOffice NONE
  [PASS] year0_founder_classes_follow_dnd: 72 classes follow data.dnd
  [PASS] year0_identity_errors: no identity errors
  [PASS] plugin_load_keeps_saved_identity: {"schema":1,"craft":"FARMER","civicOffice":"TREASURER","class":{"id":"srd:class:rogue","level":4}}
  [PASS] plugin_load_fills_old_save: {"schema":1,"craft":"LOGGER","civicOffice":"NONE","class":{"id":"srd:class:wizard","level":1}}
  year-0 section 3408 ms

==================================================
PERSON IDENTITY PASSED: 56 checks, 8 mutants killed.
==================================================
```

### Gate Test B: `node tools/test_new_game_year0.js`
- **Command:** `node tools/test_new_game_year0.js`
- **Raw Exit Code:** `RAW_EXIT:0`
- **Output:**
```text
=== DEUS NEW GAME YEAR 0 TEST SUITE (INV-SIM-01 / ATK-YEAR0-001) ===

--- Section A: setup window and embark payload (DEUS_FactionMenus.js) ---
  [PASS] window_default_year_is_0: Window_NewGameSetup.currentYear() === 0 (expected 0)
  [PASS] embark_year_is_0: UF.NewGameSetup.year === 0 on untouched embark (expected 0)
  [PASS] fallback_embark_year_is_0: Fallback UF.NewGameSetup.year === 0 when window is null (expected 0)
  [PASS] key_left_at_0_stays_0: Left arrow at year 0 -> year 0, box "0", 0 cursor sounds (expected 0, "0", 0)
  [PASS] key_shift_left_clamps_to_0: Shift+Left from year 5 -> year 0, box "0" (expected 0, "0")
  [PASS] key_pagedown_clamps_to_0: PageDown from 3 -> 0, again -> 0 (expected 0, 0)
  [PASS] key_left_reaches_0_from_1: Left arrow from year 1 -> 0 (expected 0)
  [PASS] key_right_left_round_trip: 0 -> Right -> 1 -> Left -> 0 (expected 1, 0)
  [PASS] key_shift_right_clamps_999: Shift+Right from 995 -> 999 (expected 999)
  [PASS] set_year_0_is_0: setYear(0) -> 0, box "0" (expected 0, "0")
  [PASS] set_year_negative_clamps_0: setYear(-10) -> 0 (expected 0)
  [PASS] set_year_non_numeric_is_0: setYear("abc"/undefined/null/"") -> 0/0/0/0 (expected 0/0/0/0)
  [PASS] set_year_over_999_clamps: setYear(1200) -> 999 (expected 999)
  [PASS] typed_0_sets_year_0: Typing "0" over 42 -> _year 0, currentYear 0 (expected 0, 0)
  [PASS] blur_empty_box_is_0: Clearing the box then leaving it -> 0, box "0" (expected 0, "0")
  [PASS] blur_negative_or_garbage_is_0: Leaving the box holding "-5"/"abc" -> 0/0 (expected 0/0)
  [PASS] box_0_overrides_stale_year: Box "0" with stale _year 42 -> currentYear 0 (expected 0)
  [PASS] embark_payload_shape: Untouched payload {"faction":"human","year":0,"seed":1112355891,"worldSize":256,"fogOfWar":false} (expected keys faction,fogOfWar,seed,worldSize,year; integer year 0; seed 1..2147483646)
  [PASS] embark_payload_json_round_trip: JSON round trip of payload -> year 0 (expected 0, key present)
  [PASS] embark_calls_setup_new_game_once: DataManager.setupNewGame called 1 times on one embark (expected 1)
  [PASS] typed_then_decremented_embarks_0: Typed 3, Left x4, Start -> payload year 0 (expected 0)
  [PASS] embark_with_box_still_focused_is_0: Typed 12 then 0, Start without leaving the box -> payload year 0, box destroyed true (expected 0, true)

--- Section B: clock save/load keeps year 0 (DEUS_Core.js) ---
  [PASS] save_writes_year_0: makeSaveContents at year 0 -> deusTime.year 0, ufTime.year 0 (expected 0, 0)
  [PASS] load_restores_year_0: extractSaveContents of a year-0 save over clock year 7 -> 0 (expected 0)
  [PASS] legacy_uftime_save_restores_year_0: extractSaveContents of a legacy ufTime-only year-0 save -> 0 (expected 0)
  [PASS] core_loaded_without_errors: console.error calls while loading DEUS_Core: 0 (expected 0)

--- Section C: headless New Game fed the Section A payload (DEUS_Core.js, DEUS_History.js) ---
  [PASS] new_game_pipeline_ran: world:created listeners built history (true) with 0 console errors
  [PASS] new_game_clock_year_is_0: Clock year after a Year 0 New Game: 0 (expected 0)
  [PASS] new_game_save_year_is_0: deusTime.year in the first save of a Year 0 New Game: 0 (expected 0)
  [PASS] clock_constructor_keeps_year_0: new Game_DEUSTime() with UF.NewGameSetup.year 0: year 0 (expected 0)
  history after New Game: {"startYear":0,"years":0,"worldAge":0,"clockYear0":0,"demographicsCurrentYear":0,"demographicsStartYear":0,"units":72} (2681 ms)

--- Section D: Rule 4 mutation checks ---
  [PASS] mutant default_year_1 caught: 5 failing checks, targeted: window_default_year_is_0, embark_year_is_0
  [PASS] mutant fallback_year_1 caught: 1 failing checks, targeted: fallback_embark_year_is_0
  [PASS] mutant change_year_floor_1 caught: 6 failing checks, targeted: key_left_reaches_0_from_1
  [PASS] mutant change_year_no_floor caught: 4 failing checks, targeted: key_left_at_0_stays_0, key_shift_left_clamps_to_0
  [PASS] mutant set_year_floor_1 (pre-hardening code) caught: 4 failing checks, targeted: set_year_0_is_0
  [PASS] mutant current_year_ignores_box_0 (pre-hardening code) caught: 1 failing checks, targeted: box_0_overrides_stale_year
  [PASS] mutant typed_year_floor_1 caught: 2 failing checks, targeted: typed_0_sets_year_0
  [PASS] mutant blur_floor_1 caught: 2 failing checks, targeted: blur_empty_box_is_0, blur_negative_or_garbage_is_0
  [PASS] mutant payload_year_as_string caught: 6 failing checks, targeted: embark_payload_shape
  [PASS] mutant payload_drops_year_0 caught: 6 failing checks, targeted: embark_payload_json_round_trip
  [PASS] mutant save_coerces_year_0_to_1 caught: 2 failing checks, targeted: save_writes_year_0
  [PASS] mutant load_coerces_year_0_to_1 caught: 2 failing checks, targeted: load_restores_year_0, legacy_uftime_save_restores_year_0
  [PASS] mutant core_restores_or_1 (pre-ATK-YEAR0-002 code) caught: 1 failing checks, targeted: clock_constructor_keeps_year_0
  [PASS] mutant history_founds_year_0_at_1 caught: 2 failing checks, targeted: new_game_clock_year_is_0, new_game_save_year_is_0
  [PASS] mutant history_clock_floor_1 caught: 2 failing checks, targeted: new_game_clock_year_is_0, new_game_save_year_is_0
  [PASS] section_c_checks_can_pass: with the clock fed the setup year, 4/4 Section C checks pass (clock year 0, save year 0; 3899 ms)

==================================================
SETUP CONTRACT PASSED: 30 gating checks, 15 mutants caught (ATK-YEAR0-001 closure criterion).
INV-SIM-01 END-TO-END MET: clock, save and constructor all at year 0.
==================================================
```

### Gate Test C: `node tools/check_deus_syntax.js`
- **Command:** `node tools/check_deus_syntax.js`
- **Raw Exit Code:** `RAW_EXIT:0`
- **Output:**
```text
Checked 58 DEUS plugin files. Errors: 0
```

---

## 3. Spot-Check of Invariants & Design Contracts

1. **INV-SOC-01 (Three independent axes):**
   - Verified that `craft`, `civicOffice`, and `class` are mutually independent under `changeAxis()`.
   - Modifying one axis strictly leaves the other two untouched (verified by `every_craft_change_is_independent`, `every_office_change_is_independent`, `every_class_change_is_independent`).
   - Coupling mutants (`couple_class_to_craft`, `couple_craft_to_class`, `couple_office_to_craft`) were reliably killed.
2. **INV-SOC-02 (Current duty is operational state, not identity):**
   - `additionalProperties: false` in schema and module prevents `duty` or `currentDuty` from being placed on `unit.data.identity`.
   - Derivation logic in `defaultsFrom()` ignores `currentDuty`, `duty`, and job objects.
   - Tested and verified by `duty_does_not_replace_craft` and killed mutant `duty_sets_craft`.
3. **`NONE` allowed on all axes:**
   - Schema and module accept `NONE` for `craft`, `civicOffice`, and `class` (`{ id: "NONE", level: null }`).
   - If class id is `NONE`, level must be `null`. Non-NONE classes require integer level `1..20`.
   - Mutants `reject_none` and `schema_drops_none` were reliably killed.
4. **Year-0 Founders & Demographic Ledger:**
   - 72 historical founders in Year-0 New Game all receive valid `unit.data.identity` records matching schema and deterministic derivation.
   - All 72 founder civic offices are `NONE`.
   - Founder classes properly reflect `data.dnd` SRD classes.
5. **Save/Load & Migration:**
   - Saved identities survive round-trip load untouched.
   - Old saves missing `identity` are populated with deterministic defaults.
   - Corrupt saved identities are cleanly replaced with valid defaults.
   - Mutant `drop_identity_on_load` killed.

---

## 4. Findings

- **BLOCKER:** None.
- **MAJOR:** None.
- **MINOR:** None.

---

## 5. Final Verdict

VERDICT: CLEAN PASS
