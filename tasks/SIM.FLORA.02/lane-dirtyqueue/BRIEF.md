### DEUS CONCRETE TASK ASSIGNMENT
- **Task ID**: SIM.FLORA.02
- **Objective**: Implement the Factorio-style Dirty Queue for Flora (Trees & Crops).
- **Active Milestone**: Simulation
- **Authoritative Source Files**: game/js/sim/DEUS_Flora.js, 	ools/test_flora_queue.js
- **Allowed Edit Paths**: game/js/sim/DEUS_Flora.js, 	ools/test_flora_queue.js
- **Requirements**:
  1. Remove any per-tick or(let tree of allTrees) loop.
  2. Implement a global PriorityQueue or double-buffered wake array where a tree schedules its 
extGrowTime.
  3. The simulation only checks the head of the queue each tick. If 
ow >= nextGrowTime, it pops the tree, grows it, and reschedules.
  4. Write a test in 	ools/test_flora_queue.js to prove 50,000 trees can exist with zero per-tick CPU overhead.
- **Stop Boundary**: 2 failures.
