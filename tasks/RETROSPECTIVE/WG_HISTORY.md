# WorldGen Historical & Civilizational Generation (DEC-092)

## 1. The V8 Memory Trap
**The Flaw:** When attempting to simulate 500 years of history (Dwarf Fortress style), traditional code instantiates HistoricalFigure objects ({ name: "Jon", age: 40, faction: "Elves" }). Simulating 5,000 figures this way causes thousands of objects and string concatenations, leading to massive V8 Garbage Collection stalls and violating our < 2 MB save file budget.

## 2. Parallel Flat Arrays (Structure of Arrays)
**The Fix:** DEUS already has the mathematical demographic engine in DEUS_HistoricalDemographics.js. However, we must refactor it to track entities purely sparsely.
- We do not create objects. We allocate parallel flat arrays.
- hfBirthYear = new Int32Array(MAX_FIGURES)
- hfFaction = new Int32Array(MAX_FIGURES)
- Entities are simply integer IDs. To find Figure 1042's birth year, we query hfBirthYear[1042]. This guarantees zero GC overhead and zips down to kilobytes in the save file.

## 3. Abstract Site Simulation
**The Fix:** Sites (Towns, Ruins) are not physically loaded into memory during worldgen. They are tracked as an abstract State Machine. An annual pi.step runs through 500 simulated years instantly. If the math says a town's population hit 0 in Year 312, its state flips to RUINED. It is only when the player physically walks into that chunk 200 years later that the engine reads RUINED and generates collapsed roof strata instead of intact houses.
