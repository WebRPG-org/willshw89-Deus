# lane-bq Brief: SOC.40.02 Threat-Driven Militia Mobilization Engine

**NO ART OR AUDIO WORK.**

**Lane:** lane-bq | **Task:** SOC.40.02 | **Branch:** task/lane-bq | **Writer:** Codex GPT-5.6 Sol HIGH | **Reviewer:** Grok | **Base:** main `368632d629bb65a773ee8c204578d7bf1ab74c61`

## Scope
Implement a deterministic, data-oriented mobilization engine that converts explicit faction threat inputs and caller-supplied eligible-person/service-status records into auditable mobilization orders and defense-duty assignments for walls and gates. Preserve INV-SOC-07 and INV-SOC-08: never impose a fixed military/civilian ratio, and explicitly record civilian labor displaced by mobilization. Keep tactical combat, pathfinding, equipment transfer, casualty resolution, alarm presentation, and economic-loss calculation outside this lane.

Do not invent threat thresholds, force ratios, equipment availability, rank policy, protected-person policy, wall/gate capacity, response time, morale, combat statistics, or duty priority absent from tracked authority. Accept policy/capacity as explicit validated inputs or record authority gaps. Do not implement SOC.40.01 classification; consume caller-supplied status values only. Do not integrate with the scheduler, combat engine, settlement map, or UI.

## Allowed paths
- `game/js/sim/society/DEUS_Militia.js`
- `docs/systems/DEUS_Militia.md`
- `tools/society/test_militia.js`
- `tasks/SOC.40.02/**`

## Gates
- `node tools/society/test_militia.js`
- `node tools/check_deus_syntax.js`

## Standing rules
1. Never generate, edit, request, catalogue, move, or integrate art or audio.
2. Write only in allowedPaths. Record absent authority and later integration needs in this task folder instead of guessing.
3. Keep outcomes deterministic, pure, auditable, input-immutable, and free of clocks, randomness, filesystem, UI, or engine globals.
4. Never derive mobilization size from a universal population ratio. Orders must trace to explicit threat, eligibility, policy, capacity, and stable tie-breaking inputs.
5. Every substantive validation and invariant needs a targeted negative fixture. Include provocations for fixed-ratio logic, ineligible or dead persons, duplicate assignment, over-capacity posts, nonexistent posts, nondeterministic ordering, lost civilian-duty provenance, and input mutation.
6. Run both gates in the foreground, record exact evidence in REPORT.md, commit on this branch, and do not merge or push. Independent cross-family review follows PM fresh-clone verification.
