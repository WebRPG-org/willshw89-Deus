# lane-bo Brief: SOC.30.01 Conserved Physical Minting Engine

**NO ART OR AUDIO WORK.**

**Lane:** lane-bo | **Task:** SOC.30.01 | **Writer:** Codex (`gpt-5.6-sol`, XHIGH) | **Reviewer:** Gemini | **Base:** `0cbe808e8b4c94429738b1cad2f9eda98dff0989`

Implement a deterministic minting/remelting simulation that transforms registered physical monetary metal into cp/sp/ep/gp/pp stacks with exact integer mass conservation and no treasury/store conflation (INV-SOC-05/06). Use existing resource/item registries, SRD coin weight and denomination sources, and DEUS economy standards as read-only authority. Support bounded batches, explicit assay inputs, insufficient-material refusal, deterministic remainders/scrap, remelting, and round-trip conservation. Do not invent metal compositions, alloy ratios, coin masses, exchange values, office authorization policy, taxes, fees, loss, or seigniorage. If an essential physical standard is absent or contradictory, record the blocker in the task folder and implement only the source-grounded core.

Allowed paths: `game/js/plugins/DEUS_Mint.js`, `docs/systems/DEUS_MintingEngine.md`, `tools/society/test_minting_engine.js`, `tasks/SOC.30.01/**`.

Gates: `node tools/society/test_minting_engine.js`; `node tools/check_deus_syntax.js`.

Write only allowed paths. Add targeted negative fixtures for every conservation/refusal rule. Do not edit registries, WBS/status, decisions, provider files, art, audio, or other lanes. Do not merge or push. Commit and report the exact SHA.