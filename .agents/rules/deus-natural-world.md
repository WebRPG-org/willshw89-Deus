> **DEC-059 (Owner, 2026-09-30): build straight through.** The hard Owner gate after each natural-world package is waived. The PM builds package to package and reports; the Owner can stop or change anything. The editor stays closed during the build. Fire, seasons/weather, rare geological events and structure decay are deferred. Animal migration, also deferred here, is now cut (WG.68.12, SIM.50.07): wildlife and monsters are spawned by rule instead (DEC-073, Owner 2026-10-01). The final NW v1 sign-off stays with the Owner.

> **DEC-057 (Owner, 2026-09-30): "We can nix soil for now. We can RNG monsters and flora and fauna into the world for now and refine systems later."** Soil is deferred (no soil runtime or bridge; lane-cf stops). Monsters, flora and fauna are placed by seeded random rules by biome cell and danger tier. Flora's simulation systems come later. Wildlife and monsters get no population or ecology simulation (no breeding, carrying capacity, food webs or migration): a seeded runtime spawner places and despawns them by intelligent rules (DEC-073, Owner 2026-10-01). Space, matter, water, lava and collapse stay in scope. The upstream order below is amended accordingly.

---
trigger: always_on
description: "DEC-037 Natural World phase lock and the lean upstream-first critical path."
---

# Lean Natural World v1

The Owner's 2026-09-28 request reaffirms the DEC-037 Natural World phase lock. Existing `tasks/NAT.02.01/lane-bv/BRIEF.md` and `tasks/NAT.05.01/lane-bw/BRIEF.md` also cite it. At setup inspection, `docs/OWNER_DECISIONS.md` ended at DEC-036: do not invent the missing decision's date, historical wording, or approval evidence. The coordinator should reconcile that record with the Owner's source.

Use this dependency order when selecting already authorized work:

**Physical Space -> Physical Matter -> Water -> Geomorphology / Soil -> Climate -> Flora -> Fauna.**

Fauna here is the creature spawner (DEC-073): wildlife and monsters are spawned from world-generation designations (biome-depth cell, danger tier, spawn tables, lair and den anchors) and live conditions (light, time of day, nearby counts), not from a flora or food-web simulation. Its lanes (lane-fc, lane-fe, lane-ff, lane-fi) are built in their planned waves after the physics lanes they depend on.

Do not implement downstream runtime systems until their upstream physical contracts exist and have passed the required gates. Existing downstream lanes may retain their worktrees and evidence; their existence does not grant permission to bypass dependencies.

- **CORE:** focus implementation and review resources on a few robust physical authorities.
- **DERIVED:** prefer outcomes emerging from core systems and prove them with tests; avoid redundant feature systems.
- **ENRICHMENT:** wait.
- **PRESENTATION:** wait unless needed for verification, within existing approvals and DEC-007.
- **CIVILIZATION:** frozen. No civilization, farming, faction, or society implementation under this phase.
- **CUT / superseded:** allocate no new work.

Choose the earliest unblocked authorized dependency, finish its tests and independent review, then reassess. A blocked dependency does not authorize opening a new leaf or lane. Do not stop or destroy existing worker processes to enforce this document; surface conflicts to the coordinator.
