### DEUS CONCRETE TASK ASSIGNMENT
- **Task ID**: SIM.DIR.01
- **Objective**: Implement the RimWorld-style AI Director (Drama Curve & Storyteller).
- **Active Milestone**: Simulation
- **Authoritative Source Files**: game/js/sim/DEUS_Director.js, 	ools/test_director.js
- **Allowed Edit Paths**: game/js/sim/DEUS_Director.js, 	ools/test_director.js
- **Requirements**:
  1. Build a pure function evaluateDrama(wealth, population, daysSinceLastEvent).
  2. The Director should calculate "Colony Wealth" from the active inventory cache.
  3. The Director tracks a sine-wave "Drama Curve" to alternate between safe building time and raid/event spikes.
  4. Write a headless test in 	ools/test_director.js that simulates 100 days and proves the event dispatcher fires according to the curve.
- **Stop Boundary**: 2 failures.
