# Archived: the span, load and rubble structural code (NAT.02.01, before DEC-083)

Archived by lane-nx3 (NAT.02.01.BRIDGE), 2026-10-01. Prune rule: archive, never delete.

DEC-083 (Owner, with its two amendments) makes structure pure connectivity: a solid block is held while a chain of face-adjacent solid blocks reaches the bottom of the world. There is no span, load, HP band or rubble. The re-plan (`docs/design/COLLAPSE_REPLAN_DEC083.md`, section 3, rows en and bv; section 12, risk 10) says the old code and the tests that certify it are archived in lane nx3.

| File here | Was | Why it is archived |
|---|---|---|
| `rooted.js` | `game/js/sim/structural/rooted.js` (lane-en, merged 4bac3eff) | Rooted support with span limits, HP bands and rated loads: the model DEC-083 removes. |
| `support.js` | `game/js/sim/structural/support.js` (lane-bv) | The tensile cantilever predicate (`evalCellSupport`). |
| `collapse.js` | `game/js/sim/structural/collapse.js` (lane-bv) | The rubble and mass-transfer stub (`executeCollapse`); AUDIT_LOG A11-1. |
| `test_structural_rooted.js` | `tools/test_structural_rooted.js` | Gate of lane-en; certifies the span model. |
| `test_structural_collapse.js` | `tools/test_structural_collapse.js` | Gate of lane-bv; certifies rubble and the fake ledger. |

The three modules at their old paths are now tombstones that export nothing (`{ archived: "<path here>" }`), because `game/js/sim/structural/index.js` still requires them and that file was outside lane-nx3's allowed paths.

Left for the PM (outside lane-nx3's allowed paths):
- `git rm tools/test_structural_rooted.js tools/test_structural_collapse.js`. After the tombstones, both fail if they are run.
- Remove the legacy and rooted lines from `game/js/sim/structural/index.js` (the `support.js`, `collapse.js` and `rooted.js` requires and their exports). Then `git rm` the three tombstones.
- Update `docs/systems/DEUS_Structural.md`, which still describes `rooted.js`.

The pkg2 block of `tools/test_package_proofs_ingame.js` (the cantilever and rubble proof) is removed in the same lane.
