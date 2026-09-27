# Lane AP Brief: Depth presentation demo (Owner review; every cue a toggle, off by default)

**NO ART GENERATION BY ANYONE (DEC-007).** Existing or placeholder tiles only.

**Lane:** lane-ap | **Task ID:** `DEUS-TSK-DEPTH-DEMO` (non-WBS task folder; closest existing leaf WG.00.18 "Layer-View Presentation (Owner-Led)" is NOT changed; the leaf is to be recorded by Gemini) | **Branch:** task/lane-ap | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-ap` | **Size:** L | **Base:** origin/main `1c2fcc28736566f8dd4f14ccd0633f09687e3521` | **Source:** QUEUE 12:45 CT (depth presentation demo), Owner 12:52 CT (nothing off limits if it looks good, scales, stays in budget; dynamic lighting; benchmark every option), A9c items 22 (Z-layer look core items + depth-demo renderer toggles) and 27 (integer render scale 1x/2x/3x demo toggle, nearest-neighbour). PM brief 21:10 CT (main-chat ops for the Owner).
**LAUNCH GATE MET (PM 21:10 CT):** Lane AA (WG.00.17, 32-layer) merged AND its second pass done: the Owner ruled (20:45 CT) that the Gemini 3.8 Flash final-gate review replaces the Pro second pass. Routing (Claude ~98% weekly, Codex exhausted): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author; while gemini-3.1-pro-preview is quota-blocked the Owner-authorised final gate is gemini-3.8-flash thinking HIGH, ruling 2026-09-26 20:45 CT).
**Merge rule:** the result goes to the Owner for review; NO merge without Owner sign-off on the depth rules, even after a Gemini PASS.

## allowedPaths (exact; mirrored in `tasks/DEUS-TSK-DEPTH-DEMO/lane-ap/lane.json`)
- `game/js/plugins/DEUS_DepthDemo.js`
- `game/js/plugins/DEUS_DepthCues.js`
- `game/data/DEUS_DepthDemo.json`
- `tools/depth_demo/**`
- `docs/systems/DEUS_DepthDemo.md`
- `tasks/DEUS-TSK-DEPTH-DEMO/**`
Notes: `DEUS_Depth.js`, `DEUS_Levels.js`, `DEUS_World.js`, `DEUS_Minimap.js` (Lane AA core, merged) are READ-ONLY here: hook by RMMZ-style aliasing from your own plugin files; escalate if a core change is unavoidable.
**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, Lane AD/AE/AN/AO paths, `art/**`, `game/img/**`, `docs/art/**`, `game/data/UF_AssetStandard.json`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool.

## Scope
A demo scene (or debug overlay on an existing map) with toggles for pixel-perfect depth cues, all OFF by default (DEC-011 1:1, no filters stays the default):
1. Precomputed per-layer palette shift (darker, cooler, more desaturated per layer down; baked ramps, no runtime filter).
2. Exposed cliff and wall faces where layers drop (standard RMMZ cliff/wall tiles with Z depth cues; RMMZ top-down 3/4 view, no oblique projection, A9c item 38).
3. Hard-edged drop shadows from higher layers.
4. Optional whole-pixel parallax for lower layers.
5. Depth markers / layer UI.
6. Optional crisp dynamic lighting (per-pixel or per-tile tint, no blur; torches, day/night, fire glow; additive glow layer per A9c item 21).
7. Integer render scale toggle 1x/2x/3x, nearest-neighbour (A9c item 27); no fractional zoom, no blur.
Constraints: no blur, no fractional scaling; compatible with lower-layer HP bars, spell effects on other layers, cross-layer / multi-layer selection. Geometry per A9c item 26: 1 layer = 5 ft = 48 px, quarters 12 px (flag any code still on 10 ft layers; do not change core geometry here).
**Benchmark (Owner 12:52 CT):** every toggle and useful combinations benchmarked for frame time and memory at 32 layers (-16..+15) with a large unit count; results table in `docs/systems/DEUS_DepthDemo.md` and REPORT.md for the Owner.
Follow-on NOT in scope: the dual-grid Wang terrain renderer (A9c item 34).

## Gate tests (lane.json)
- `node tools/depth_demo/test_depth_demo.js` (each toggle on/off, defaults all off, ramps baked and deterministic, whole-pixel offsets only, integer scale only; RESULT line; killed mutants)
- `node tools/test_layer_render_flat.js --suite depth` (Lane AA regression, unchanged)
- `node tools/check_deus_syntax.js`

## Registration of new plugins
Do NOT edit `game/js/plugins.js` or `game/js/plugins/DEUS_Core.js` (shared files; RMMZ editor safety). Keep headless logic loadable directly by your tests. Put the exact registration entry you need (plugin name, load order, parameters) under a `## Registration request` heading in REPORT.md; the PM applies it at merge time.

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art/audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only (the Owner generates all art in the PixelLab web UI).
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AP-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/DEUS-TSK-DEPTH-DEMO/lane-ap/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing. Every new check has a killed mutant.
7. Do not merge; do not self-certify. An independent review by a different AI family (Gemini, launched later by the PM) decides. Review: any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-ap`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.