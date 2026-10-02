# lane-fi (WG.65.04): World-Wide Spawner and Sky View

| Field | Value |
|---|---|
| WBS | WG.65.04 |
| Branch | \	ask/lane-fi\ |
| Manifest | \	asks/WG.65.04/lane-fi/lane.json\ |
| Writer -> reviewer | claude -> grok |

## 1. Scope
The sky view needs world-wide creature density at New Game. Implement a cheap per-area spawn pass computed directly from the world seed without building full terrain (DEC-065 stays).
1. **global_density.js**: Implement a deterministic seeded spawn density function returning approximate population counts per area chunk.
2. **index.js**: Export it.
3. **test_global_spawn_density.js**: Write tests proving it runs fast across a 100x100 area map and matches expected seeds.

## 2. The prompt
(Default launch_worker generated prompt applies; push and end with FINAL SHA).
