# lane-bl Brief: SOC.20.01 Faction Institutional Skeleton and Office Schema

**NO ART OR AUDIO WORK.**

**Lane:** lane-bl | **Task:** SOC.20.01 | **Branch:** task/lane-bl | **Writer:** gemini (gemini-3.8-flash thinking HIGH, mechanical) | **Reviewer:** grok | **Base:** main `a768eba377deab388e5def474a0bb1752fd732c3`

## Scope
Define offices as durable institutional entities independent of living holders, including jurisdiction, authority scopes, vacancy state, and succession-policy data. Deliver schema, canonical office records, documentation, and tests.

Use existing repository specifications and catalogues as read-only authority. Do not decide open Owner questions. Preserve the independent craft, civic-office, and class axes. Every validator check must have a targeted failing fixture or provocation.

## Allowed paths
- `game/data/society/office_schema.json`
- `game/data/society/offices/**`
- `docs/systems/DEUS_FactionOffices.md`
- `tools/society/test_offices.js`
- `tasks/SOC.20.01/**`

## Gates
- `node tools/society/test_offices.js`
- `node tools/check_deus_syntax.js`

## Standing rules
1. Never generate, edit, request, catalogue, move, or integrate art or audio. Never touch `art/**`, `game/img/**`, or audio paths.
2. Write only in allowedPaths. Put any out-of-scope need or owner question in this task folder and stop that part.
3. Do not modify WBS/status, owner decisions, provider status, plugin registration, ops/governance files, or another lane.
4. Run all gates and provocations in the foreground and record exact evidence in REPORT.md. Never weaken an existing assertion.
5. Commit on this branch. Do not merge or push. Independent Grok review follows PM gate verification.