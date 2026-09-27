# Lane AE Brief: SIM.50.13 Ore sprouting and fluid solver attachment bug fixes

**LAUNCH GATE MET (PM, 2026-09-26 ~21:10 CT):** (1) Lane AA (WG.00.17) merged to main after the Owner-authorised Gemini 3.8 Flash final-gate review (Owner ruling 20:45 CT); its STATUS claim row set to MERGED / write access revoked. (2) The SIM.50.02 dependency is dropped in WBS Rev 28 (Directive 0082-CE): SIM.50.13 deps = WG.00.17 only. (3) Fluid attach file confirmed on post-AA main: DEUS_Fluid.js is loaded as a companion by DEUS_Core.js (companion list) and binds itself to a function-local UF (LWGA F-05 / D-4); the binding fix (D-4 option b: bind window.UF) lives in DEUS_Fluid.js, so allowedPaths are unchanged. game/js/plugins.js and DEUS_Core.js stay FORBIDDEN (escalate if option b is not enough). Routing (Claude ~98% weekly, Codex exhausted): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-ae | **Task ID:** SIM.50.13 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`, Rev 26) | **Branch:** task/lane-ae | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-ae` | **Writer:** grok (grok-4.7 xhigh, multi-agent on) | **Reviewer:** gemini (non-author; while gemini-3.1-pro-preview is quota-blocked the Owner-authorised final gate is gemini-3.8-flash thinking HIGH, ruling 2026-09-26 20:45 CT) | **Size:** M | **Base:** origin/main `1c2fcc28736566f8dd4f14ccd0633f09687e3521` (set at open time) | **Source:** Directive 0062-BK; DEC-023, DEC-024; LWGA F-03 and F-05 / D-4 (`docs/audits/LIVING_WORLD_GAP_AUDIT.md`). PM brief prepared 2026-09-26 by main-chat ops for the Owner.

## LAUNCH GATE (all must be true)
1. Lane AA (WG.00.17) merged to main and its claim retired: DEUS_Ecology.js and DEUS_Fluid.js are in Lane AA's live write set.
2. Gemini waives or drops the WBS dependency on SIM.50.02 (PM proposal in Directive 0068-BQ: the two bug fixes do not need the SIM.50.02 deliverable). Until Gemini records that, this lane stays blocked.
3. PM confirms which file loads/attaches the fluid solver on the post-AA main and adds it to allowedPaths if it is not DEUS_Fluid.js itself.

**Provider at launch (PM 21:10 CT):** Grok writer (grok-4.7 --reasoning-effort xhigh, multi-agent on, via start_writer3.ps1 -Provider grok) / Gemini reviewer (non-author). Claude (~98% weekly) and Codex (exhausted until Tue 21:34 CT) are not used.

## allowedPaths (exact; mirrored in `tasks/SIM.50.13/lane-ae/lane.json`)
- `game/js/plugins/DEUS_Ecology.js`
- `game/js/plugins/DEUS_Fluid.js`
- `tools/sim/test_ore_sprout.js`
- `tools/sim/test_fluid_attach.js`
- `tools/sim/fixtures/sim5013/**`
- `tasks/SIM.50.13/**`

**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/sim/ledger*` (unless escalated and granted), `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool, and `art/**`.

## Scope
1. F-03: loose stones must never turn into ore. On main, DEUS_Ecology.js sprout tables (around lines 739-749) let `rocks_small` mature into `ironstone`, `copper_outcrop`, `gold_outcrop`; ore must only come from worldgen geology. Remove ore outcomes from loose-stone maturation (non-ore stone outcomes may stay if the rules allow) and prove it with a seeded long-run test.
2. F-05 / D-4: the fluid solver must attach cleanly to DEUS_Fluid on every map/layer load, and no flood fill may create water. Add a test that counts total water volume before/after attach and across flood fills and asserts equality.
3. Minimal fixes only; no refactors of either plugin.

## Acceptance
- Every lane.json gate test passes, with output pasted in REPORT.md.
- REPORT.md lists what changed, the evidence, open Owner questions and PROPOSED-AE-NN follow-ups.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).

## Gate tests
- `node tools/sim/test_ore_sprout.js`
- `node tools/sim/test_fluid_attach.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art, and never tell anyone to.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AE-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/SIM.50.13/lane-ae/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing.
7. Do not merge; do not self-certify. An independent review by a different AI family (launched later by the PM) decides.
8. Push only your own branch (`git push origin task/lane-ae`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
