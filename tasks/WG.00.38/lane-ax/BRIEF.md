# Lane AX Brief: WG.00.38 Capture and domestication of creatures (pets, mounts, livestock, work animals)

**LAUNCH GATE MET (PM, 2026-09-27 ~10:30 CT, Owner-approved next-lane launch 09:58 CT):** WBS deps met: WG.00.17 merged `1c2fcc28`; SIM.40.10 (shared reproduction and lifecycle) DONE `8997e238`. DEC-033 is DECIDED (Owner 12:59/13:01 CT). Lane AQ (SIM.60.07, DEUS_Wildlife.js) merged `18527e9b`, so `DEUS_Wildlife.js` has no live claim. Routing (Claude weekly conserved, Codex exhausted until Tue ~9:34 PM CT): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author; gemini-3.8-flash thinking HIGH is the Owner-authorised final gate while 3.1 Pro is quota-blocked until ~19:04 CT, DEC-034).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-ax | **Task ID:** WG.00.38 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`) | **Branch:** task/lane-ax | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-ax` | **Writer:** grok (grok-4.7 xhigh, multi-agent on) | **Reviewer:** gemini (non-author) | **Size:** L | **Base:** origin/main `2755f61947610723723384ad39ad3fbc92d4679f` | **Source:** WBS row WG.00.38; DEC-033 (Owner 2026-09-26 12:59/13:01 CT).

## allowedPaths (exact; mirrored in `tasks/WG.00.38/lane-ax/lane.json`)
- `game/js/plugins/DEUS_Wildlife.js`
- `game/js/plugins/DEUS_Taming.js`
- `game/js/sim/taming/**`
- `tools/taming/**`
- `docs/systems/DEUS_Taming.md`
- `tasks/WG.00.38/**`
Notes: `DEUS_Combat.js`, `DEUS_CombatRT.js`, `game/js/sim/combat_rt/**`, `game/js/sim/rules/**`, `DEUS_Colonists.js`, `DEUS_Factions.js`, `DEUS_Ecology.js`, `DEUS_Jobs.js` are READ-ONLY here (use public APIs / RMMZ-style aliasing from your own plugin; escalate if unavoidable).

**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool (`tools/ops/**`, `tools/governance/merge_gate.js`, `tools/governance/check_claims.js`, `tools/governance/check_invariants.js`), `art/**` (including the untracked `art/sprites/`), `game/img/**`, and `game/js/sim/ledger*` (read-only; stale Lane L1 claim). Files claimed by lanes running at the same time are off limits: AU (DEUS_Fluid.js, game/js/sim/hydro/**, tools/sim/test_water_dynamics.js); AV (DEUS_Levels.js, DEUS_NaturalConnections.js, DEUS_WorldGen.js, tools/worldgen/**); AW (DEUS_Depth.js, DEUS_DepthCues.js, DEUS_CombatUI.js, DEUS_LayerOverlays.js, tools/layer_overlays/**); AY (game/js/sim/decay/**, game/data/sim/decay_params*.json, tools/sim/test_decay_core.js); AZ (game/data/plans/**, tools/plans/**); BA (DEUS_Colonists.js, game/js/sim/society/**, game/data/society/**, tools/society/**).

## Docs to read (only these)
- `docs/worldgen/DEUS_WORLDGEN_WBS.md` rows WG.00.38 and WG.00.39 (WG.00.39 is NOT in scope)
- `docs/OWNER_DECISIONS.md` DEC-033 - read only
- `docs/society/DEUS_SOCIETY_WBS.md` row SOC.40.03 (humanoid prisoners: NOT in scope here)
- `docs/design/ECOLOGY.md` and `docs/design/DF_MECHANICS.md` sections on taming/domestication, `tasks/SIM.40.10/lane-w/SIM.40.10_POPULATION_LIFECYCLE.md` (livestock lifecycle)
- `game/js/sim/rules/rules.js` (SRD checks: Animal Handling, grapple/restrained) and `docs/systems/DEUS_CombatU7.md`

## Scope
1. Wildlife and monsters can be captured and tamed into pets, mounts, livestock and work animals (DEC-033 item 2). Capture API `UF.Taming.attemptCapture(actor, target, method)` on a target that is restrained, unconscious (0 HP knocked out), trapped or otherwise subdued; resolved with SRD 5.1 checks via UF.Rules (seeded dice). Taming progresses over time with care (food, handling) to a domesticated state per role: pet, mount, livestock (feeds SIM.40.10 breeding/products), work animal (hauling/labour hook).
2. Tamed creatures keep their species SRD stat block and natural attacks only; there are NO creature armor or equipment slots, no barding and no crafted creature gear; a riding saddle is a visual marker only with no slot and no stats (DEC-033 item 3). Add a guard test for this.
3. Ownership/faction and save/load of captive and tamed state; tamed animals are no longer hunted as wild prey by their owners' colonists and no longer count toward wild population summaries (they move to a domestic count); escape/reversion if neglected is optional and data-driven.
4. Out of scope: humanoid prisoners and recruitment (SOC.40.03, WG.00.37/SOC.10.04; the paper-doll text there conflicts with the A9c item 43 art standard and needs a PM/Gemini re-scope), party combat with tamed creatures (WG.00.39), and wiring a 'knock out instead of kill' choice into combat (propose it as PROPOSED-AX-NN; combat files are read-only).
5. Test `tools/taming/test_taming.js` (headless, seeded): capture succeeds/fails by SRD check; taming progression to each role; tamed creature has no equipment slots and its attacks equal its SRD stat block; save/load round trip; wild vs domestic counts; deterministic. Mutants: allow an equipment slot, skip the SRD check, lose tamed state on load, double-count a tamed animal as wild.
6. Minimal, targeted edits to DEUS_Wildlife.js; no refactors; list open design choices (taming time, capture DCs) as data with PM defaults and Owner questions.

## Acceptance
- Every lane.json gate test passes, with output pasted in REPORT.md.
- REPORT.md lists what changed, the evidence, open Owner questions and PROPOSED-AX-NN follow-ups.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).
## Gate tests
- `node tools/taming/test_taming.js`
- `node tools/sim/test_wildlife_rules_damage.js`
- `node tools/check_deus_syntax.js`

## Registration of new plugins
Do NOT edit `game/js/plugins.js` or `game/js/plugins/DEUS_Core.js` (shared files; RMMZ editor safety). Keep headless logic loadable directly by your tests. Put the exact registration entry you need (plugin name, load order, parameters) under a `## Registration request` heading in REPORT.md; the PM applies it at merge time.

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art or audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AX-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/WG.00.38/lane-ax/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing. Every new check has a killed mutant.
7. Do not merge; do not self-certify. An independent review by a different AI family (Gemini, launched later by the PM) decides. Review: any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-ax`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
