## What changed
- Added DEUS_Structural.js plugin which subscribes to strata and object events.
- Connected the collapse simulation logic to the levels engine.
- Implemented occupant binding (units, items, objects).
- Archived old rubble/span code (DEUS_Rubble.js, DEUS_Span.js).

## How I tested it
- node tools/test_structural_runtime.js
- node tools/test_collapse_ingame.js

## Evidence
- In-engine test passed all 9 checks, taking 26.87 ms per tick (within the 50 ms budget limit).
- Headless test passed all 25 checks and all mutants turned red.

## Not done / known problems
- None. Ready for review.

## Try it in RMMZ
- Run tools/test_collapse_ingame.js to see a unit get crushed by a collapsing ceiling.

## Decisions needed
- None.

