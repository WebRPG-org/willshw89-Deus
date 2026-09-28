# lane-bm Brief: SOC.11.02 Race-Class Affinity Table and Job-Picking Weight

**NO ART OR AUDIO WORK.**

**Lane:** lane-bm | **Task:** SOC.11.02 | **Branch:** task/lane-bm | **Writer:** grok (grok-4.7 HIGH, mechanical data/schema) | **Reviewer:** gemini | **Base:** main `e3f7e63a54d5f9c0806938964e0b95f94555e545`

## Scope
Implement DEC-036 as canonical data and schema across all nine races and canonical classes. Preserve every race-class combination as legal. Record the three decided affinity classes per race and role distribution. Represent unresolved numeric bonus and job-pick weight values, plus unresolved non-obvious role tags, explicitly as `OWNER_TODO`; do not choose numbers or settle open classifications. Provide deterministic validation and targeted negative provocations proving completeness, schema integrity, no hard locks, exact decided rows, and safe handling of unresolved values. Document future SOC.13 candidate-weight integration without implementing or editing the scheduler.

Use `docs/OWNER_DECISIONS.md` DEC-036 and existing class/race catalogues as read-only authority. Do not invent races, classes, weights, bonuses, or role classifications. If repository class identifiers differ from display names, document and test the mapping.

## Allowed paths
- `game/data/society/race_class_affinity.json`
- `game/data/society/race_class_affinity.schema.json`
- `docs/systems/DEUS_RaceClassAffinity.md`
- `tools/society/test_race_class_affinity.js`
- `tasks/SOC.11.02/**`

## Gates
- `node tools/society/test_race_class_affinity.js`
- `node tools/check_deus_syntax.js`

## Standing rules
1. Never generate, edit, request, catalogue, move, or integrate art or audio. Never touch `art/**`, `game/img/**`, or audio paths.
2. Write only in allowedPaths. Put any out-of-scope need or owner question in this task folder and stop that part.
3. Do not modify WBS/status, owner decisions, provider status, plugin registration, ops/governance files, or another lane.
4. Run all gates and targeted provocations in the foreground and record exact evidence in REPORT.md. Never weaken an existing assertion.
5. Commit on this branch. Do not merge or push. Independent Gemini review follows PM gate verification.