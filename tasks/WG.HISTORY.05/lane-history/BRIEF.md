### DEUS CONCRETE TASK ASSIGNMENT
- **Task ID**: WG.HISTORY.05
- **Objective**: Refactor Historical Demographics to SoA parallel flat arrays.
- **Active Milestone**: WorldGen
- **Authoritative Source Files**: game/js/plugins/DEUS_HistoricalDemographics.js, 	ools/test_history.js
- **Allowed Edit Paths**: game/js/plugins/DEUS_HistoricalDemographics.js, 	ools/test_history.js
- **Requirements**:
  1. Strip all Object allocation.
  2. Implement parallel Int32Array structures for tracking hfBirthYear, hfFaction, etc.
  3. Write a headless test simulating 5,000 entities in 	ools/test_history.js.
- **Stop Boundary**: 2 failures.
