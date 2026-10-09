# Endrath — live status

Updated: 2026-10-09.

- Name: Endrath.
- Live tree: `C:\Dev\DEUS`.
- Recorded HEAD: `11635cf200d269ace7d0f6c8428f0c8f3caec559`, checked before this documentation-only update.
- PM: this Endrath desk. Fable writes code; this desk commits.

## Current work

Coding is waiting. Art is the lane. The six ground parents are not locked.

| Lane | State |
|---|---|
| Art parents | open |
| WB-001 through WB-010 | superseded |

A lane is open or superseded. Do not reopen superseded blocks.

## Depth rule

| Setting | Owner decision |
|---|---|
| Z-layers | 8 |
| Height of each z-layer | 10 feet |
| Surface depth | 1 foot |
| `DEPTH_MAX` | 10 |

This depth rule is not yet in code.

## Editor rule

The PM plays in the editor. A writer may not save over `game/js/plugins.js` while that project is open. This is the whole editor rule.

- 2026-10-09 — Closed, no reordering: `DEUS_Core` loads at `plugins.js:12`, before `DEUS_World` at `plugins.js:67`. Core's companion require swallows a throw and continues through its fallback paths. `DEUS_HistoricalDemographics` fails at load because `UF.World` is not assigned yet; the boot log retains the last fallback path/error. No `plugins.js` row added.
