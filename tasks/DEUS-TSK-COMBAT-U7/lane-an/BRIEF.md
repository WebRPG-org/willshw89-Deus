# Lane AN Brief: SRD combat engine + U7 presentation (real-time with pause, Fortress/RTS + Hero modes)

**NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-an | **Task ID:** `DEUS-TSK-COMBAT-U7` (non-WBS task folder, precedent `tasks/DEUS-TSK-AUDIO-STD`; the WBS leaf is to be recorded by Gemini) | **Branch:** task/lane-an | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-an` | **Size:** L | **Base:** origin/main `1c2fcc28736566f8dd4f14ccd0633f09687e3521` | **Source:** Owner decision 2026-09-26 15:09 CT; A9c items 20, 26, 27, 33, 35-36, 39, 43; ADDENDUM 0509 (Owner 17:09 CT). PM brief 21:10 CT (main-chat ops for the Owner).
**LAUNCH GATE MET (PM 21:10 CT):** Lane AA (WG.00.17, 32-layer renderer) merged to main after the Owner-authorised Gemini 3.8 Flash final gate. Routing (Claude ~98% weekly, Codex exhausted): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author; while gemini-3.1-pro-preview is quota-blocked the Owner-authorised final gate is gemini-3.8-flash thinking HIGH, ruling 2026-09-26 20:45 CT).
**ADDENDUM 0509 applies (Owner 17:09 CT):** shields are NOT animated; weapon groups = unarmed, dagger, one-hand sword (no shield), two-hand, spear/polearm, staff, bow, crossbow; ATK_1H replaces ATK_1H_SHIELD (retired/reserved). See tasks/WG.20.01/lane-al/refs/ADDENDUM_0509_RULINGS.md on main. (The queued text below was edited accordingly.)

## allowedPaths (exact; mirrored in `tasks/DEUS-TSK-COMBAT-U7/lane-an/lane.json`)
- `game/js/plugins/DEUS_CombatRT.js`
- `game/js/plugins/DEUS_CombatUI.js`
- `game/js/plugins/DEUS_Move8.js`
- `game/js/plugins/DEUS_Combat.js`
- `game/js/sim/combat_rt/**`
- `tools/combat_rt/**`
- `docs/systems/DEUS_CombatU7.md`
- `tasks/DEUS-TSK-COMBAT-U7/**`
Notes: `DEUS_Combat.js` (Lane AB, merged; no live claim) only for minimal, reviewed hooks. `DEUS_Move8.js` is the new 8-way character movement plugin (RMMZ; A9c item 43) and is owned by this lane (Lane AO world items consumes it read-only). `game/js/sim/rules/**` (UF.Rules) is READ-ONLY: combat resolution stays in UF.Rules; escalate if a rules change is needed.
**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `game/js/sim/rules/**`, `DEUS_Items.js`/`DEUS_Objects.js`/`DEUS_Jobs.js`/`DEUS_Walls.js`/`DEUS_Floors.js` (Lane AD), `DEUS_Ecology.js`/`DEUS_Fluid.js` (Lane AE), `DEUS_Depth.js`/`DEUS_Levels.js` (read-only), `docs/art/**`, `game/data/UF_AssetStandard.json`, `art/**`, `game/img/**`, `game/audio/**`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool.

## Scope (the queued Owner brief, reproduced below, is the authority for content)
# SRD combat engine + U7 presentation - follow-up brief (Owner decision 2026-09-26 15:09 CT)

Queued by PM 15:10 CT. **NOT launched. BLOCKED** on Lane AA (WG.00.17, 32-layer renderer) merged. Builds on the Lane AB SRD 5.1 rules engine (SIM.60.05, `UF.Rules`, merged; Lane AH SIM.60.06 benchmark) - the rules stay in UF.Rules; this lane adds real-time presentation, control modes and UI. No lane letter or WBS ID yet (leaf to be recorded via a Gemini directive). Writer Grok grok-4.7 xhigh, reviewer Gemini (non-author). No art or audio generation (placeholders only), no merging, no messaging, no WBS minting.

## Presentation (Ultima VII style)
1. **On-map real-time with pause; no separate battle scene.** Fights happen where they start, across Z layers (32-layer map; cross-layer targeting and effects).
2. **Rules underneath are SRD 5.1:** each 6-second round (1 sim tick, A9c item 26) resolves smoothly on screen as units act; d20 vs AC, saves, damage and conditions resolved behind the scenes by UF.Rules (seeded dice, deterministic).
3. **Feedback:** per-armor-state PixelLab animations (A9c item 43, Owner 16:46-16:47 CT: the attack clip of the wielded weapon group - unarmed, dagger, one-hand sword (no shield), two-hand, spear/polearm, staff, bow, crossbow - plus cast, hurt, knocked down and dead at 6 frames each; idle 4 and walk 4; all 8 directions; creatures keep the item 33 budgets), hit flashes, floating damage numbers, blood and ground marks (A9c item 20), brief knockback on heavy hits (whole-pixel, cosmetic unless the SRD effect moves the target).

- **Movement and view (A9c items 38 + 43; Owner 15:40 CT, item 43 rulings 16:10-16:41 CT):** RMMZ standard top-down 3/4 view (no oblique projection, item 38); **characters move 8-way via an RMMZ plugin with 8-direction sprites** (item 43 reverts item 38's diagonal removal for characters; diagonal step per the item 43 standard); **terrain, walls and caves stay square-grid** (rounded/ragged autotile corners); SRD 5-5-5 diagonal counting (UF.Rules) for movement, spell areas and ranges; footprints and range/area markers stay whole SRD squares on the tile grid. "U7" here means the combat feel (on-map, real-time with pause), not oblique projection.

## Two modes, one engine
4. **(a) Fortress/RTS mode:** commands from above, multi-layer selection, orders, squad stances, pause and game-speed control; units fight autonomously.
5. **(b) Hero mode:** direct real-time control of one hero, camera follows; companions use behaviour settings (attack nearest, defend, flee, heal); optional pause to target.
6. **Seamless switching** between modes (take direct control of any unit you command, release it back to autonomy) with no load or scene change; combat state, initiative/round timing and orders carry over.

## UI note: two control layers
7. **Commander layer (RTS):** selection box and multi-layer selection, order bar, stance/behaviour toggles per squad, pause + speed controls, colour-blind-safe shape-coded markers for selection, faction, summon controller and low HP (A9c item 33).
8. **Hero layer:** hero HP/resources and action/spell bar, target indicator, companion behaviour panel, pause-to-target; a clear control-mode indicator and one key/button to switch layers. Both layers use the integer-scaled window skins (A9c item 27); the selected-unit panel uses the selected unit's race window skin and its faceset uses that race's background (A9c item 43, Owner 16:40 CT) and never cover the fight's Z-layer context.

## Cross-reference: A9c items 35-36, 39, 43 (BRIEF_AL_A9C.md, Owner/PM 15:10-16:41 CT)
- **Items 35 and 39 (U7 melee swings; melee weapon rotation) - SUPERSEDED for characters by A9c item 43 (Owner 16:10-16:41 CT):** no separate weapon sprite, per-frame hand/grip anchors, fixed right-hand grip pose, rotating pre-baked weapon angle frames or shared swing poses. Each armor state's **weapon-group attack animation** (PixelLab v3; the weapon is drawn only inside that clip; groups unarmed, dagger, one-hand sword (no shield), two-hand, spear/polearm, staff, bow, crossbow, Owner may change) carries the swing; **cast, hurt, knocked down and dead** are their own per-armor-state animations (spells, bows and work tools no longer use shared body pose rows). Kept: 6-frame attack with the strike frame held a beat, hit spark on the strike frame, 1-2 px knockback on heavy hits (feedback item 3).
- **Item 43 (whole-sprite characters, Owner 16:44-16:47 CT):** per race x sex one unarmored PixelLab v3 base + 4 armor States (robe, light, medium, heavy) = 90 armor states (no per-class or commoner sprite sets; unarmored = commoners/villagers, robe = casters); each armor state has 19 animations in all 8 directions (10 life: idle, walk, work, sleep, sit, eat/drink, carry, hurt, knocked down, dead; 8 weapon-group attacks; cast); frame counts **idle 4, walk 4, all others 6**; KNOCKDOWN (on the back) and DEAD (face down) are the fall clips; **the armor state follows the worn armor category and the attack clip follows the wielded weapon group** (no other gear changes the sprite; equipment still changes SRD stats); **class shows in the portrait and the selected-unit panel**, not on the map; weapons are not drawn in idle, walk or other life clips; weapon-length drift is the main art risk (first test = one armor state with all weapon animations); moods and SRD conditions show via emote balloons, portraits and shared condition overlays, not per-character States.
- **Item 36, PM defaults (Owner-overridable):** on-screen SRD size classes and SRD combat footprints (Tiny shares, Small/Medium 1, Large 2x2, Huge 3x3, Gargantuan 4x4); range/area markers in whole SRD squares on the tile grid; one native pixel font for damage numbers and status, coloured by damage type; fortress zoom-out = 1x render plus colour-coded tile minimap, no downscaled blur (commander layer, item 7).

## Acceptance
Deterministic replay (same seed -> same outcomes in both modes); mode switch mid-fight with no state loss; cross-layer fight test; round timing = 6 s per SRD round at 1x speed; performance re-run of the Lane AH benchmark with presentation on; review: any missing item = MAJOR.


## Gate tests (lane.json)
- `node tools/combat_rt/test_combat_rt.js` (deterministic replay both modes, mid-fight mode switch with no state loss, cross-layer fight, 6 s round timing at 1x, pause/speed, companion behaviours; RESULT line; killed mutants)
- `node tools/test_srd_combat_proof.js` (Lane AB regression, unchanged)
- `node tools/check_deus_syntax.js`
Also run the Lane AH benchmark (`node tools/bench_combat_srd.js`) with presentation on and paste the numbers (report, not a gate).

## Registration of new plugins
Do NOT edit `game/js/plugins.js` or `game/js/plugins/DEUS_Core.js` (shared files; RMMZ editor safety). Keep headless logic loadable directly by your tests. Put the exact registration entry you need (plugin name, load order, parameters) under a `## Registration request` heading in REPORT.md; the PM applies it at merge time.

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art/audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only (the Owner generates all art in the PixelLab web UI).
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AN-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/DEUS-TSK-COMBAT-U7/lane-an/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing. Every new check has a killed mutant.
7. Do not merge; do not self-certify. An independent review by a different AI family (Gemini, launched later by the PM) decides. Review: any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-an`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.