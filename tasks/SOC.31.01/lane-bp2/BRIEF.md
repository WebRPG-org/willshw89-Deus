# lane-bp2 Brief: SOC.31.01 Treasury Provenance Repair

**NO ART OR AUDIO WORK.**

**Lane:** lane-bp2 | **Task:** SOC.31.01 | **Branch:** task/lane-bp2 | **Writer:** Codex GPT-5.6 Sol MEDIUM | **Reviewer:** Grok | **Base:** main `368632d629bb65a773ee8c204578d7bf1ab74c61`

## Scope
Recreate the already reviewed SOC.31.01 treasury result from corrected writer tip `3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b` on a clean branch whose `lane.json` provenance is trusted by the normal merge gate. Port the substantive implementation, schema, documentation, tests, and task evidence without importing the old branch history or its manifest changes. Preserve the reviewed behavior exactly: safe-integer closure across accounts, categories, and both accounting-equation sides; atomic rejection; deterministic UTF-16 account ordering; precise integer-domain errors; immutable detached data; canonical persistence; and strict separation from physical Quartermaster stores.

Do not expand scope, invent fiscal policy, edit the manifest, merge, push, integrate other systems, or alter art/audio. If exact porting reveals a necessary difference, document it and stop rather than silently changing reviewed behavior.

## Allowed paths
- `game/data/society/treasury.schema.json`
- `game/js/sim/society/DEUS_Treasury.js`
- `docs/systems/DEUS_Treasury.md`
- `tools/society/test_treasury.js`
- `tasks/SOC.31.01/lane-bp2/**`

## Gates
- `node tools/society/test_treasury.js`
- `node tools/check_deus_syntax.js`

## Standing rules
1. Never generate, edit, request, catalogue, move, or integrate art or audio.
2. Never edit `lane.json` or `BRIEF.md`; their trusted `[pm]` opening commit must remain the only manifest history.
3. Port only the reviewed SOC.31.01 result and lane-local evidence. Do not copy old launch prompts, review files, or task manifests.
4. Verify the substantive file blobs against `3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b`, run both gates, record exact evidence, inspect scope, and commit with a `[codex]` subject. Do not merge or push.
