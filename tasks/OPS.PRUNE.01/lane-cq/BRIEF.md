# BRIEF: Lane CQ (L1) — Control Board Rebuild & Anti-Regression Gate Test

- **Task ID**: OPS.PRUNE.01
- **Lane**: lane-cq
- **Branch**: `task/lane-cq`
- **Writer**: gemini
- **Reviewer**: grok
- **Allowed Paths**:
  - `docs/STATUS.md`
  - `docs/archive/STATUS_LEDGER_20260930.md`
  - `tasks/OPS.PRUNE.01/lane-cq/**`
  - `tools/ops/gate_tests.json`
  - `tools/test_control_board.js`

## Objective & Rules (Owner 2026-09-30 Prune Ruling)
1. **Move pre-prune status text**:
   - Copy/move historical status content from `docs/STATUS.md` to `docs/archive/STATUS_LEDGER_20260930.md`.
2. **Rebuild `docs/STATUS.md` as Five Authoritative Lists**:
   - **Live**: Enabled plugins from `game/js/plugins.js`, companions loaded by `DEUS_Core.js:103` (`UF_Households.js`), and active simulation modules (`sim/hydro/`, `sim/rules/`, `sim/ledger/`).
   - **Frozen (loaded, postponed)**: Civilization/faction/farming systems postponed under DEC-037 Natural World lock, unlinked secondary clocks (`UF_Time.js`), and unwired DEUS plugins scheduled for L4 archival.
   - **In Review**: Active branches, lanes, and tasks currently in flight (`task/lane-*`, `task/art-temperate-induction`).
   - **Defect/Unproved**: Named known defects, unverified contracts (such as Rule 14 multi-domain time tags), and quarantined tests.
   - **Archived**: Audited table with columns: `[Original Path, Archive Path, Ruling]` citing "Owner 2026-09-30 prune ruling".
3. **Anti-Regression Gate Test (`tools/test_control_board.js`)**:
   - Fails if an enabled plugin in `plugins.js` is missing from the board.
   - Fails if a `DEUS_Core` companion (such as `UF_Households.js`) is missing from the board.
   - Fails if an open `task/*` branch is missing from the board.
   - Fails if an Archived row's original path still exists on disk.
   - Fails if `game/js/plugins` gains a file the boot does not load and the board does not name.
   - Includes mutant proof showing it is capable of failing.
4. **Register in `tools/ops/gate_tests.json`**:
   - Add `"tools/test_control_board.js"` to the permanent gate test array.

## GAME TRANSLATION
- **Player / World Effect**: Establishes absolute architectural control and visibility over every subsystem running in the game, preventing phantom scripts, dead forwarders, or orphaned systems from executing or regressing into the build.
- **Trigger**: Build validation, CI gate runs, and multi-agent task dispatch.
- **Runtime Authority**: `docs/STATUS.md` master control board and `tools/test_control_board.js` validator.
- **Simulation Path**: Ensures only audited, authorized simulation authorities are loaded by `plugins.js` and engine companions.
- **Engine Bridge**: Verifies `plugins.js` consistency with live system declarations.
- **Visible Result**: Clean, deterministic world execution without legacy code interference or unknown scripts.
- **Persistence**: Persisted across Git history and enforced on every future merge via `merge_gate`.
- **Failure Without This Lane**: Subsystems silently drift, obsolete plugins re-enter the runtime unmonitored, and dead forwarders persist indefinitely.
- **Automated Proof**: `node tools/test_control_board.js` and all gate suites.
- **In-Game Proof**: Verified clean dev console boot trace in RMMZ Playtest.

### Translation Status
- Simulation implemented: NOT APPLICABLE (Governance/control lane)
- Engine bridge implemented: YES (Validates `plugins.js` and `DEUS_Core` companion loaders)
- Presentation implemented: NOT APPLICABLE
- Input/player interaction implemented: NOT APPLICABLE
- Save/load implemented: NOT APPLICABLE
- Playable verification performed: YES (Boot and load traces verified)
