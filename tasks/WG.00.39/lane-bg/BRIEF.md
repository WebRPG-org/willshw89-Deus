# Lane BG Brief: WG.00.39 Tamed creatures in party combat (SRD 5.1 stat blocks and natural attacks only; no creature gear)

**LAUNCH GATE MET (PM, 2026-09-27 ~13:10 CT):** Owner request 12:51 CT (team idle; launch the next unblocked, non-overlapping WBS tasks). Deps on main: WG.00.17 (`1c2fcc28`), SIM.60.05 SRD combat rules engine (Lane AB, `343191b5`), U7 real-time combat (Lane AN, DEUS-TSK-COMBAT-U7), taming (Lane AX, WG.00.38, `a9bd8096`). Skipped at 10:25 CT only because it builds on AX, now merged. Routing: writer grok-4.7 xhigh (multi-agent on; combat rules logic); reviewer gemini (non-author; gemini-3.8-flash thinking HIGH final gate while 3.1 Pro is quota-blocked until ~19:04 CT, DEC-034; Pro takes the gate back once it resets).

**NO ART GENERATION BY ANYONE (DEC-007).** The saddle is an existing visual marker only.

**Lane:** lane-bg | **Task ID:** WG.00.39 | **Branch:** task/lane-bg | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-bg` | **Writer:** grok (grok-4.7 xhigh) | **Reviewer:** gemini (non-author) | **Size:** M | **Base:** origin/main `ecc7b8984a0ab1a919595c792f98a60f18872f73`

## WBS row (verbatim) and Owner decision
> **WG.00.39** Tamed Creatures in Party Combat (SRD 5.1 Stat Blocks & Natural Attacks Only; No Creature Gear). Tamed creatures fight in the party using only their basic SRD 5.1 stat blocks and natural attacks and defenses. There are NO creature armor or equipment slots, no barding, and no crafted creature gear. A riding saddle is a visual marker only (no equipment slot, no mechanical stats). Dep: WG.00.17, SIM.60.05. (Owner requirement 2026-09-26 13:01 CT; DEC-033).

DEC-033 item 3 (DECIDED) is binding. Do not add any creature equipment, armor, barding, gear stat or saddle stat, even as a disabled option.

## allowedPaths (exact; mirrored in `tasks/WG.00.39/lane-bg/lane.json`)
- `game/js/sim/combat_rt/**`
- `game/js/plugins/DEUS_CombatRT.js`
- `game/js/plugins/DEUS_Combat.js`
- `game/js/sim/taming/**`
- `game/js/plugins/DEUS_Taming.js`
- `tools/taming_party/**`
- `docs/systems/DEUS_TamedPartyCombat.md`
- `tasks/WG.00.39/**`
Read only: `game/js/sim/rules/**` (UF.Rules, species_map, SRD index), `game/data/**` (SRD 5.1 data), DEUS_Wildlife.js, DEUS_Ecology.js, DEUS_Jobs.js.

## Lanes running at the same time (their files are off limits to you)
- BB (DEUS-TSK-GEOLOGY-GATE FIX2): `tools/test_geology_strata.js`, `tools/test_strata_foundation.js`
- BD (DEUS-TSK-ZRANGE-HARNESS): `tools/test_column_landforms.js`, `tools/test_vertical_worldgen_proof.js`
- BE (WG.00.21): `game/js/plugins/DEUS_Depth.js`, `game/js/plugins/DEUS_Culling.js`, `tools/occlusion/**`, `docs/systems/DEUS_OcclusionCulling.md`
- BF (WG.00.36): `game/js/plugins/DEUS_Select.js`, `game/js/plugins/DEUS_LayerOverlays.js`, `docs/systems/UF_Select.md`, `tools/select_xlayer/**`
- BG (WG.00.39): `game/js/sim/combat_rt/**`, `game/js/plugins/DEUS_CombatRT.js`, `game/js/plugins/DEUS_Combat.js`, `game/js/sim/taming/**`, `game/js/plugins/DEUS_Taming.js`, `tools/taming_party/**`, `docs/systems/DEUS_TamedPartyCombat.md`
- BH (SOC.10.03): the nine `game/data/plans/<race>.plan.json` files, `tools/plans/test_race_plans.js`
Each lane's `tasks/<task>/**` folder is its own. Everything not in your allowedPaths is read-only.

## Docs to read (only these)
- `docs/systems/DEUS_Taming.md` (capture, roles, the saddle marker, PM defaults, OQ-AX-01..08, PROPOSED-AX-01..05)
- `docs/systems/DEUS_CombatU7.md` and `docs/systems/DEUS_Rules.md` (real-time combat, SRD 5.1 rules routing)
- DEC-033 and DEC-018 in `docs/OWNER_DECISIONS.md` (read only)

## Scope
1. **Party membership.** A tamed creature whose role allows combat (per the taming record; document which roles fight, and list any role rule that is an Owner question instead of deciding it) joins the player's side in combat: it is targeted as a party combatant, takes turns / acts in the real-time loop like other party combatants, and follows the party.
2. **SRD stat block only.** Its HP, AC, speed, abilities, saves, attacks and damage come only from its SRD 5.1 stat block through UF.Rules / species_map (no invented numbers). Natural attacks and natural defenses only (multiattack, bite, claw, etc. as the stat block states).
3. **No gear.** Assert in code and tests that a creature combatant has no equipment slots and that no item, armor, barding or saddle changes any combat number. The saddle remains a visual marker.
4. **Death and 0 HP.** Use the existing SRD rules path for creatures at 0 HP; a tamed creature's death updates the taming record/census. Do not implement PROPOSED-AX-01 (knock-out choice) unless it already exists; list it.
5. **Orders.** Minimal: follow, attack target, hold. Document the API.
6. **Tests** `tools/taming_party/test_tamed_party_combat.js`: checks for (1)-(5), each with a provocation (`--provoke=<name>`, `--provoke-all`) that makes it FAIL, including one that sneaks a gear bonus in and must be caught.
7. `docs/systems/DEUS_TamedPartyCombat.md`: rules, API, tests, open Owner questions, PROPOSED-BG-NN follow-ups.

## Acceptance
- All scope items; every lane.json gate test exits 0 on your tip (paste output).
- Independent Gemini review passes; Gemini marks DONE.

## Gate tests
- `node tools/taming_party/test_tamed_party_combat.js`
- `node tools/taming/test_taming.js`
- `node tools/combat_rt/test_combat_rt.js`
- `node tools/test_srd_combat_proof.js`
- `node tools/sim/test_wildlife_rules_damage.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art or audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only. Never touch `art/**` (including the untracked `art/sprites/`) or `game/img/**`.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-BG-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the raw output with EXIT values into `tasks/WG.00.39/lane-bg/REPORT.md`.
6. Never weaken an existing assertion or gate (no loosened ranges, no removed checks, no try/catch that turns a failure into a pass, no quarantine/delisting). Keep `node tools/check_deus_syntax.js` passing. Every new check has a mutant or provocation that makes it FAIL.
7. Do not merge; do not self-certify. The PM runs your gate tests on your tip first (Owner rule, 2026-09-27 11:26 CT); an independent review by a different AI family (Gemini) then decides. Any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-bg`); never main, never force, never set DEUS_INTEGRATOR. Never edit `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, any WBS file, `docs/agents/PROVIDER_USAGE_STATUS.json`, `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `tools/ops/**` or `tools/governance/**`. A plugin registration you need goes in REPORT.md as a Registration request.
9. Final output line: `FINAL SHA: <sha>`.
