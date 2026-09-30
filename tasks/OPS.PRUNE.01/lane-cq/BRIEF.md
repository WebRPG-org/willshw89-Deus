# Lane Brief: lane-cq (OPS.PRUNE.01)

## Objective
Rebuild `docs/STATUS.md` as the authoritative Project DEUS 5-list Control Board:
- **Live**: Enabled plugins and companion files actively loaded by the engine.
- **Frozen**: Loaded systems postponed or held pending unfreeze.
- **In Review**: Task branches and lanes currently undergoing independent review.
- **Defect/Unproved**: Known defects and unproven systems tracked for resolution.
- **Archived**: Files retired or replaced, citing Owner 2026-09-30 prune ruling.

Move historical status narrative to `docs/archive/STATUS_LEDGER_20260930.md`.
Author `tools/test_control_board.js` to enforce control board integrity against regressions:
- Validates all live plugins in `game/js/plugins.js` and `DEUS_Core` companions are listed.
- Validates all archived files do not exist at original locations.
- Validates no unlisted or unregistered plugins are introduced to `game/js/plugins/`.
- Verifies failure on 4 deliberate mutants.
Register `tools/test_control_board.js` in `tools/ops/gate_tests.json`.

## Governance
- Writer: `gemini`
- Reviewer: `grok`
- Branch: `task/lane-cq`
