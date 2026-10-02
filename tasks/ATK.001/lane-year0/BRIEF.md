# ATK-YEAR0-001: Year 0 Materialization
**Goal:** Fix world age materialization edge cases where age=0 creates divide-by-zero or negative aging.
**Requirements:**
1. Check `DEUS_History.js` and `DEUS_WorldGen.js`.
2. Ensure that Year 0 does not break world generation logic.
