> **DEC-057 (Owner, 2026-09-30): "We can nix soil for now. We can RNG monsters and flora and fauna into the world for now and refine systems later."** Soil is deferred (no soil runtime or bridge; lane-cf stops). Monsters, flora and fauna are placed by seeded random rules by biome cell and danger tier; their simulation systems come later. Space, matter, water, lava and collapse stay in scope. The upstream order below is amended accordingly.

---
trigger: always_on
description: "DEC-037 Natural World phase lock and the lean upstream-first critical path."
---

# Lean Natural World v1

The Owner's 2026-09-28 request reaffirms the DEC-037 Natural World phase lock. Existing `tasks/NAT.02.01/lane-bv/BRIEF.md` and `tasks/NAT.05.01/lane-bw/BRIEF.md` also cite it. At setup inspection, `docs/OWNER_DECISIONS.md` ended at DEC-036: do not invent the missing decision's date, historical wording, or approval evidence. The coordinator should reconcile that record with the Owner's source.

Use this dependency order when selecting already authorized work:

**Physical Space -> Physical Matter -> Water -> Geomorphology / Soil -> Climate -> Flora -> Fauna.**

Do not implement downstream runtime systems until their upstream physical contracts exist and have passed the required gates. Existing downstream lanes may retain their worktrees and evidence; their existence does not grant permission to bypass dependencies.

- **CORE:** focus implementation and review resources on a few robust physical authorities.
- **DERIVED:** prefer outcomes emerging from core systems and prove them with tests; avoid redundant feature systems.
- **ENRICHMENT:** wait.
- **PRESENTATION:** wait unless needed for verification, within existing approvals and DEC-007.
- **CIVILIZATION:** frozen. No civilization, farming, faction, or society implementation under this phase.
- **CUT / superseded:** allocate no new work.

Choose the earliest unblocked authorized dependency, finish its tests and independent review, then reassess. A blocked dependency does not authorize opening a new leaf or lane. Do not stop or destroy existing worker processes to enforce this document; surface conflicts to the coordinator.
