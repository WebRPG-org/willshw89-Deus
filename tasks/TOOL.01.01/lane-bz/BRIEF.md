# BRIEF: TOOL.01.01 — Art Catalogue Schema 1.2 & Blank Template Validator

## 1. Objective & Authority
- **WBS ID**: `TOOL.01.01`
- **Lane**: `lane-bz`
- **Branch**: `task/lane-bz`
- **Writer**: `gemini` (Gemini / Antigravity)
- **Reviewer**: `grok` (Grok 4.7 Independent Reviewer)
- **Governing Authorities**:
  - `DEC-007`: Art Freeze (Art catalogue manifest, blank templates, and slot placement tooling are authorized; zero autonomous art generation).
  - `DEC-013` / `DEC-016`: Vertical geometry and scale chart authority.
  - `DEC-037`: Natural World Phase Lock.
  - `DEC-041`: Multi-Agent Orchestration Architecture.
  - Owner Directives (2026-09-28): Authorize bounded tooling lane `TOOL.01.01 / lane-bz` to close the art-catalogue factory gate.

---

## 2. Problem Statement & Root Cause
1. **Art Spec / Prompt Linkage Gap**: `catalogue.schema.json` and `build_catalogue.js` (schema 1.1.0) lack canonical fields for linking catalogue entries to their external generation prompts (`promptFile`) and production specifications (`specFile`). Without this, prompts and specs remain disconnected from the single source of truth.
2. **Stratum Validation Tooling Bug**: In `tools/art/make_blank_templates.js`, stratum slot height was asserted against unpadded `rows * spec.frameH` rather than the authoritative 48px-padded stratum grid contract (`rows * Math.ceil(spec.frameH / g.tilePx) * g.tilePx`). This generated 963 spurious validation rejections on structurally valid catalogue entries.
3. **Template Tooling Flexibility**: `make_blank_templates.js` lacked single-sheet targeting (`--sheet <sheetId>`), forcing full 85-sheet generation runs even during targeted slot inspection.

---

## 3. Required Deliverables
1. **Upgrade Catalogue Schema to 1.2.0**:
   - `art/catalogue/catalogue.schema.json`: Bump `$id` to `deus-art-catalogue/1.2.0`. Add `promptFile: { "type": ["string", "null"] }` and `specFile: { "type": ["string", "null"] }` to `entry` properties.
   - `tools/art/build_catalogue.js`: Update `SCHEMA_VERSION` to `deus-art-catalogue/1.2.0`. Add `promptFile: p.promptFile || null` and `specFile: p.specFile || null` to `entryBase()`.
   - `docs/art/catalogue/SCHEMA.md`: Document `promptFile` and `specFile` fields under schema 1.2.0.
2. **Fix Stratum Padding in `make_blank_templates.js`**:
   - Update stratum height assertion: `const expectedSlotH = rows * Math.ceil(spec.frameH / g.tilePx) * g.tilePx;`.
   - Add `--sheet <sheetId>` command line parameter to render a single atlas template and its sidecar.
3. **Canonical Linkage for Art 001**:
   - Add `art/prompts/SURFACE_SHARED_STONE_GRANITE-BOULDER_V1_DEFAULT.json` to repository.
   - Link `SURFACE_SHARED_STONE_GRANITE-BOULDER_V1_DEFAULT` in `art/catalogue/catalogue.json` to its canonical prompt file.
4. **Validation & Proof**:
   - `node tools/art/test_catalogue.js` passes all 47 checks.
   - `node tools/art/make_blank_templates.js --catalogue art/catalogue/catalogue.json --out art/templates --bg transparent` generates all 85 blank atlas sheets with zero errors.

---

## GAME TRANSLATION

WBS / Lane: TOOL.01.01 / lane-bz
Approved scope / Owner authorization reference: Owner Directive 2026-09-28 (Catalogue-first natural world art production tooling authorization)
Writer SHA / evidence date: Pending implementation (2026-09-28)
Translation Class: C FOUNDATIONAL / INDIRECT

Player / World Effect:
Indirect assurance: Enables deterministic production, placement, and verification of original pixel art assets into exact atlas slots, ensuring in-game tiles and props display pixel-perfect dimensions, palettes, and baselines without visual corruption, clipping, or missing textures.

Trigger:
Invoked during art asset production pipelines, atlas compilation, and automated CI/CD catalogue verification.

Runtime Authority:
`art/catalogue/catalogue.json` (schema `deus-art-catalogue/1.2.0`) is the single canonical source of truth for all 10,089 game art slots, dimensions, anchors, and prompt linkages.

Simulation Path:
`tools/art/build_catalogue.js` -> `art/catalogue/catalogue.json` -> `tools/art/make_blank_templates.js` -> `art/templates/*.png` / `art/templates/*.json` -> `tools/art/place_asset.js` -> `game/img/tilesets/`.

Engine Bridge:
Presentation authority bridge: In-engine character/tileset loader (`game/js/plugins/DEUS_Visuals.js` and RMMZ core graphics managers).

Visible Result:
In gameplay: Props, natural boulders, trees, and terrain autotiles display cleanly anchored to the 48px grid at correct ground baselines (row 47) without pixel shearing or seam artifacts.

Persistence:
Catalogue and template specifications are persistent repository artifacts committed under version control.

Failure Without This Lane:
Without this lane, generation prompts remain disconnected from canonical catalogue slots; the blank template generator falsely rejects 963 valid stratum slots; and newly produced art cannot be verified against authoritative catalogue slots.

Automated Proof:
1. `node tools/art/test_catalogue.js`: All 47 checks PASS (exit 0).
2. `node tools/art/make_blank_templates.js --catalogue art/catalogue/catalogue.json --out art/templates --bg transparent`: 85/85 sheets generated without errors (exit 0).

In-Game Proof:
N/A - Foundational tooling lane; game runtime verification occurs during Asset 001 (Granite Boulder) integration and in-engine playtest.

CONSUMED BY GAME SYSTEMS:
- Art Placement Tooling (`tools/art/place_asset.js`): Consumes slot coordinates and boundaries to inject pixel art into atlas textures.
- RMMZ Tile & Character Presentation (`DEUS_Visuals.js`): Displays atlas graphics in-engine. Corruption would manifest as sheared tiles, floating props, or wrong texture coordinates.

GAME BRIDGE STATUS
Simulation implemented: N/A - Tooling lane
Engine bridge implemented: YES - Standard RMMZ atlas texture mapping
Presentation implemented: YES - Atlas coordinate binding
Input/player interaction implemented: N/A - Tooling lane
Save/load implemented: N/A - Static art assets
Playable verification performed: DEFERRED TO ASSET 001 IN-ENGINE PROOF
