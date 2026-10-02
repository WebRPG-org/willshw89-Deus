## What changed

- Implemented "Build above/below" mechanic (DEC-083 rule 4) in DEUS_Jobs.js, DEUS_Floors.js, DEUS_Interact.js, and DEUS_Colonists.js.
- Added builder reach to tile above or below (REACH_LEVELS=1).
- Constructed floors and roofs can be built at any Z level (replaced old refusal).
- Added logic for accepting attached blocks and refusing unattached blocks.
- Placing blocks no longer drops things, and a deck over walls holds structurally.
- A "Build above/below" menu is available on any level, and matter notes "build" are issued.

## How I tested it

- Headless checks via 
ode tools/test_build_vertical.js: 17 passed, 0 failed.
- Mutants run successfully against test suites.
- NW.js in-engine scenario uild_room_above successfully ran and produced evidence.

## Evidence

- Screenshot uild_room_above.png: A room successfully built above ground level (Z+1).
- Log excerpt: RESULT: PASS (17 passed, 0 failed)

## Not done / known problems

- Code is completely functional, mutants handled.
- Wait for independent review.

## Try it in RMMZ

1. Reopen the project and start Playtest (F5).
2. Right-click on a tile and select "Build above/below" to construct a roof or floor from another level.
3. Observe that colonists will reach up or down to place the material.

Expected: You can construct scaffolding and multi-story rooms.

## Decisions needed

- None, fast-tracked via DEC-090.
