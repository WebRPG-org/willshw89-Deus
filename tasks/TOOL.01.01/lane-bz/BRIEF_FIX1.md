# BRIEF ADDENDUM: TOOL.01.01 / lane-bz (Codex Review Finding F1 Resolution)

## 1. Context & Authority
- **Lane**: `lane-bz` (Task `TOOL.01.01`)
- **Writer**: `gemini`
- **Reviewer**: `codex`
- **Authority**: Owner Directive 2026-09-29 ("Codex's finding on 0be10e96 is correct: docs/art/catalogue/SCHEMA.md requires padded stratum slots (h = rows x 48 x ceil(hMax/48)), and make_blank_templates.js:347 also accepts unpadded heights. Fix it on the TOOL.01.01 lane (lane-bz), not on main").

---

## 2. Findings Resolved
- **F1 (MAJOR, introduced in 0be10e96)**:
  `make_blank_templates.js:347` permitted unpadded slot heights (`slot.h === rows * spec.frameH`), which violated `docs/art/catalogue/SCHEMA.md` and created an unpadded template sidecar that broke the catalogue builder's grid alignment contract (`SLOT_OFF_GRID`, `GEOM_HEIGHT`).

---

## 3. Implemented Corrections
1. **Strict Padded Stratum Slot Height Enforcement**:
   - `tools/art/make_blank_templates.js:347`: Restored strict equality to padded grid height:
     `const expectedSlotH = rows * Math.ceil(spec.frameH / g.tilePx) * g.tilePx;`
     `if (slot.h !== expectedSlotH) refuse('STRATUM_HEIGHT_MISMATCH', ...);`
   - Unpadded heights are strictly rejected with exit code 2 and code `STRATUM_HEIGHT_MISMATCH`.
2. **Test Fixture Updated to Padded Values**:
   - `tools/art/fixtures/templates/build_fixture.js`: Updated RAMP, EDGE, and WALL_FACE entries to compute `slotH = up(h)` / `bandH = up(geo.layerPx)`, properly padding stratum slots to the 48px tile grid.
   - `tools/art/fixtures/templates/catalogue.fixture.json`: Rebuilt from `build_fixture.js`, matching the padded grid contract.
3. **Restored Integrity Checks Kept**:
   - `cat.tileSizePx !== g.tilePx` check preserved.
   - `cat.geometry.sha256` matching `geoFile.sha256` or `geoFile.rawSha256` preserved.
4. **Falsifiability & Regression Test Coverage**:
   - `tools/art/test_blank_templates.js`:
     - Added refusal case `unpadded_stratum_slot` asserting that an unpadded raw stratum height (e.g. 19px) fails with `STRATUM_HEIGHT_MISMATCH` and exit 2.
     - Added mutant `unpadded_stratum_allowed` in `MUTANTS` verifying that relaxing the check in `make_blank_templates.js` causes `unpadded_stratum_slot` to fail, killing the mutant.
     - Updated `fixture_contract`, `stratumParamCases`, and `layerPx_param` assertions to match the padded slot height contract.

---

## 4. Verification Evidence
- `node tools/art/test_catalogue.js`: 47/47 checks passed (exit 0).
- `node tools/art/test_blank_templates.js`: 79/79 checks passed, 14 mutants killed, 0 failed (exit 0).
- `node tools/art/make_blank_templates.js --catalogue art/catalogue/catalogue.json --out art/templates --bg transparent`: 186 sheets, 2494 slots written cleanly (exit 0).
