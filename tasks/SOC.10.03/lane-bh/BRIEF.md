# Lane BH Brief: SOC.10.03 Nine race development plan data slots (structural copies; cultural strings OWNER_TODO)

**LAUNCH GATE MET (PM, 2026-09-27 ~13:10 CT):** Owner request 12:51 CT (team idle; launch the next unblocked, non-overlapping WBS tasks). Dep SOC.10.02 schema + template + validator merged (Lane AZ, CLEAN PASS `1228ed9d`). DEC-015 (DECIDED) mandates one data-driven plan per race with Owner-authored culture. **Mechanical lane** (data files from an existing template; no design): `lane.json` `effortClass: "mechanical"`, writer grok-4.7 at effort **high** under Owner rule (b) (2026-09-27 11:26 CT). Reviewer gemini (non-author; gemini-3.8-flash thinking HIGH final gate while 3.1 Pro is quota-blocked until ~19:04 CT, DEC-034).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-bh | **Task ID:** SOC.10.03 | **Branch:** task/lane-bh | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-bh` | **Writer:** grok (grok-4.7 high, mechanical) | **Reviewer:** gemini (non-author) | **Size:** S | **Base:** origin/main `ecc7b8984a0ab1a919595c792f98a60f18872f73`

## WBS row (verbatim, docs/society/DEUS_SOCIETY_WBS.md)
> **SOC.10.03** Nine Race Development Plan Data Slots. Author 9 baseline JSON plan files in `game/data/plans/` for the 9 races with structural schema populated; race-specific cultural lore, names, and values marked Owner TODO (DEC-015).

## allowedPaths (exact; mirrored in `tasks/SOC.10.03/lane-bh/lane.json`)
- `game/data/plans/human.plan.json`
- `game/data/plans/elf.plan.json`
- `game/data/plans/halfling.plan.json`
- `game/data/plans/dwarf.plan.json`
- `game/data/plans/gnome.plan.json`
- `game/data/plans/dragonborn.plan.json`
- `game/data/plans/half-elf.plan.json`
- `game/data/plans/half-orc.plan.json`
- `game/data/plans/tiefling.plan.json`
- `tools/plans/test_race_plans.js`
- `tasks/SOC.10.03/**`
Read only: `game/data/plans/TEMPLATE.plan.json`, `game/data/plans/faction_plan.schema.json`, `tools/plans/validate_faction_plan.js` and its fixtures (do not change the schema, template or validator).

## Lanes running at the same time (their files are off limits to you)
- BB (DEUS-TSK-GEOLOGY-GATE FIX2): `tools/test_geology_strata.js`, `tools/test_strata_foundation.js`
- BD (DEUS-TSK-ZRANGE-HARNESS): `tools/test_column_landforms.js`, `tools/test_vertical_worldgen_proof.js`
- BE (WG.00.21): `game/js/plugins/DEUS_Depth.js`, `game/js/plugins/DEUS_Culling.js`, `tools/occlusion/**`, `docs/systems/DEUS_OcclusionCulling.md`
- BF (WG.00.36): `game/js/plugins/DEUS_Select.js`, `game/js/plugins/DEUS_LayerOverlays.js`, `docs/systems/UF_Select.md`, `tools/select_xlayer/**`
- BG (WG.00.39): `game/js/sim/combat_rt/**`, `game/js/plugins/DEUS_CombatRT.js`, `game/js/plugins/DEUS_Combat.js`, `game/js/sim/taming/**`, `game/js/plugins/DEUS_Taming.js`, `tools/taming_party/**`, `docs/systems/DEUS_TamedPartyCombat.md`
- BH (SOC.10.03): the nine `game/data/plans/<race>.plan.json` files, `tools/plans/test_race_plans.js`
Each lane's `tasks/<task>/**` folder is its own. Everything not in your allowedPaths is read-only.

## Docs to read (only these)
- `docs/systems/DEUS_FactionPlans.md` (sections 2, 3, 9, 12, 13, 15)
- `game/data/plans/TEMPLATE.plan.json`, `game/data/plans/faction_plan.schema.json`
- DEC-013 item 5 (the nine races) and DEC-015 in `docs/OWNER_DECISIONS.md` (read only)

## Scope (mechanical; no invented values)
1. Create the nine files above. The file names and `planId` values are provisional PM slugs from the nine DEC-013 races (human, elf, halfling, dwarf, gnome, dragonborn, half-elf, half-orc, tiefling). Record in REPORT.md that DEUS_FactionPlans.md open question 12 (the canonical race id strings) stays open for the Owner.
2. Each file is `documentRole: "racePlan"`, a structural copy of TEMPLATE.plan.json: identical stages, buildings, roles, institutions, unlocks, build orders, occupation mix, knowledge graph, expansion and failure values. **Do not change any number or structural value per race.** A race-specific number is an Owner/design decision and is out of scope.
3. Every Owner cultural string stays the sentinel `OWNER_TODO`: `raceId`, `displayName`, `lore`, `values`, every cultural/architecture-bible text field, and `architecture.homeLayerBand` (DEC-013 home bands are open; question 1 in section 15).
4. Do not add class or race-class affinity data (the Owner's affinity table is being recorded by Gemini in a separate planning task; not this lane).
5. `tools/plans/test_race_plans.js`: (a) exactly these nine race plans exist; (b) each passes `validate_faction_plan.js`; (c) each is structurally equal to the template except `documentRole` and `planId`; (d) every cultural field and `homeLayerBand` is `OWNER_TODO`; (e) planIds are unique and none is `TEMPLATE`. Each check has a mutant/provocation that makes it FAIL (for example a changed number, a filled cultural string, a missing file, a duplicate planId).
6. REPORT.md: the files, validator output for each, test output, open Owner questions (section 15 items 1 and 12 at least), PROPOSED-BH-NN follow-ups.

## Acceptance
- All scope items; every lane.json gate test exits 0 on your tip (paste output).
- Independent Gemini review passes; Gemini marks DONE.

## Gate tests
- `node tools/plans/test_race_plans.js`
- `node tools/plans/test_faction_plan_schema.js`
- `node tools/plans/validate_faction_plan.js game/data/plans/TEMPLATE.plan.json`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art or audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only. Never touch `art/**` (including the untracked `art/sprites/`) or `game/img/**`.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-BH-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the raw output with EXIT values into `tasks/SOC.10.03/lane-bh/REPORT.md`.
6. Never weaken an existing assertion or gate (no loosened ranges, no removed checks, no try/catch that turns a failure into a pass, no quarantine/delisting). Keep `node tools/check_deus_syntax.js` passing. Every new check has a mutant or provocation that makes it FAIL.
7. Do not merge; do not self-certify. The PM runs your gate tests on your tip first (Owner rule, 2026-09-27 11:26 CT); an independent review by a different AI family (Gemini) then decides. Any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-bh`); never main, never force, never set DEUS_INTEGRATOR. Never edit `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, any WBS file, `docs/agents/PROVIDER_USAGE_STATUS.json`, `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `tools/ops/**` or `tools/governance/**`. A plugin registration you need goes in REPORT.md as a Registration request.
9. Final output line: `FINAL SHA: <sha>`.
