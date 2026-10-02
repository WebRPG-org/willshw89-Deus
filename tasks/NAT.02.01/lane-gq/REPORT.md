## What changed
- game/js/sim/structural/block_reader.js: created fixture block reader
- game/js/sim/structural/counter.js: created bounded ops counter
- game/js/sim/structural/connectivity.js: implemented depth-first held algorithm
- game/js/sim/structural/fall.js: implemented rigid body fall drop calculation
- game/js/sim/structural/queue.js: implemented structural queue and job service
- game/js/sim/structural/index.js: exported new DEC-083 modules
- tools/test_structural_connectivity.js: wrote test suite
- docs/systems/DEUS_Structural.md: added DEC-083 connectivity documentation

## How I tested it
- node tools/check_deus_syntax.js
- node tools/test_structural_connectivity.js
- node tools/test_structural_rooted.js --baseline
- node tools/test_structural_collapse.js

## Evidence
- Log excerpt:
Checked 62 DEUS plugin files. Errors: 0
PASS: connectivity_modules_present
PASS: held_by_floor_column
PASS: unlimited_reach_beam
...

## Not done / known problems
- Not checked: in-engine package proof, full live level testing. The structural connectivity test uses a simplified mock structure.

## Try it in RMMZ
Not checked. (Class C pure module).

## Decisions needed
- None.

## GAME TRANSLATION
- Player / World Effect: Connectivity checks determine if structures hold or fall
- Trigger: Simulation tick
- Runtime Authority: DEUS Structural kernel
- Simulation Path: game/js/sim/structural/connectivity.js
- Engine Bridge: NO
- Visible Result: Structures fall when unsupported
- Persistence: Saved
- Failure Without This Lane: Floating structures never fall
- Automated Proof: tools/test_structural_connectivity.js
- In-Game Proof: NOT YET PLAYABLE
