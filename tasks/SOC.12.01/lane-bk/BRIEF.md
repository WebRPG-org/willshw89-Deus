# lane-bk Brief: SOC.12.01 Master Craft Catalogue

**NO ART OR AUDIO WORK.**

**Lane:** lane-bk | **Task:** SOC.12.01 | **Branch:** task/lane-bk | **Writer:** gemini (gemini-3.8-flash thinking HIGH, mechanical) | **Reviewer:** grok | **Base:** main `a768eba377deab388e5def474a0bb1752fd732c3`

## Scope
Define economic professions linked to existing DEUS production chains, applicable 2014 SRD crafting references, and novice/apprentice through master progression. Deliver catalogue, schema, documentation, and tests.

Use existing repository specifications and catalogues as read-only authority. Do not decide open Owner questions. Preserve the independent craft, civic-office, and class axes. Every validator check must have a targeted failing fixture or provocation.

## Allowed paths
- `game/data/society/craft_catalogue.json`
- `game/data/society/craft_catalogue.schema.json`
- `docs/systems/DEUS_CraftProfessions.md`
- `tools/society/test_craft_catalogue.js`
- `tasks/SOC.12.01/**`

## Gates
- `node tools/society/test_craft_catalogue.js`
- `node tools/check_deus_syntax.js`

## Standing rules
1. Never generate, edit, request, catalogue, move, or integrate art or audio. Never touch `art/**`, `game/img/**`, or audio paths.
2. Write only in allowedPaths. Put any out-of-scope need or owner question in this task folder and stop that part.
3. Do not modify WBS/status, owner decisions, provider status, plugin registration, ops/governance files, or another lane.
4. Run all gates and provocations in the foreground and record exact evidence in REPORT.md. Never weaken an existing assertion.
5. Commit on this branch. Do not merge or push. Independent Grok review follows PM gate verification.