---
trigger: always_on
description: "Mandatory DEUS game-behavior traceability, bridge status, headless and in-engine proof."
---

# Game translation and playability traceability

**Scope (DEC-085 item 5, Owner 2026-10-01):** this rule applies to a lane, review or report whose diff touches `game/` (code, data, or images the game loads; art lanes that place sprites under `game/img/` are in scope, and for a lane that only places or replaces art files for existing objects the in-game proof is a script-made contact sheet of the committed sheets at 2x with the anchors marked, plus an honest statement that no in-game scene was observed). A tooling, governance, mail, documentation or art-pipeline lane whose diff touches nothing under `game/` reports in one paragraph (what changed, how it was tested, what was not checked); its brief and review need no GAME TRANSLATION block, and a reviewer does not fail it for lacking one.

Owner requirement, 2026-09-28: every WBS leaf, lane, implementation, review and merge must explain how its work produces actual game or world behavior. Trace **WBS requirement -> code/data -> simulation state -> RPG Maker MZ/presentation bridge -> player/world consequence -> persistence -> proof**. Code, an API, a data structure, passing Node tests or headless simulation alone cannot establish playability.

Every lane brief and completion report must contain the **GAME TRANSLATION** block in `tools/ops/GAME_TRANSLATION_TEMPLATE.md`, with all ten fields: **Player / World Effect; Trigger; Runtime Authority; Simulation Path; Engine Bridge; Visible Result; Persistence; Failure Without This Lane; Automated Proof; In-Game Proof**. No lane is complete without it. Cite concrete paths/functions, consumer contracts, exact test commands, real results and writer SHA; distinguish planned proof from observed proof.

Classify every result:
- **A. DIRECT PLAYER-VISIBLE:** directly seen or manipulated; requires direct in-game proof.
- **B. WORLD-BEHAVIOR VISIBLE:** consequences visible in the world; requires an in-game outcome scenario.
- **C. FOUNDATIONAL / INDIRECT:** name its visible consumer(s), how corruption would appear in gameplay, and the integration test proving the consumer receives correct data. Include **CONSUMED BY GAME SYSTEMS**. If there is no foreseeable meaningful consumer, challenge CORE priority; do not unilaterally change the WBS.

Every future WBS proposal must include a concrete **WHY THE PLAYER CARES** field. Generic realism/depth claims are insufficient. A weak or missing consequence is grounds to recommend downgrading/deferment to the coordinator and Owner, never to open or change a leaf without approval.

Every lane must report **Simulation implemented; Engine bridge implemented; Presentation implemented; Input/player interaction implemented; Save/load implemented; Playable verification performed** as YES/NO, with evidence for YES and precise explanations for missing, deferred, unverified or inapplicable items. Never convert unknown into a success claim.

CORE gameplay-affecting systems require both deterministic/headless proof and engine/playtest proof where appropriate. Neither replaces the other. A foundation may complete its bounded simulation scope with its consumer defined and **Engine bridge: DEFERRED TO <specific integration>; Player-facing status: NOT YET PLAYABLE**. Name an existing authorized integration or an explicitly unapproved proposal; this requirement does not authorize presentation, runtime scope expansion, art, or a new WBS/lane. Tooling-only lanes explain their indirect assurance and mark game-runtime fields inapplicable with reasons, without inventing a game feature.

Reviewers check the chain, class, six status fields, persistence, exact SHA and both levels of proof; integration records reference that evidence. Missing bridge/playtest evidence blocks claims of gameplay completeness. No retroactive evidence or fabricated past approvals. For existing active lanes, require this block at the next coordinator-owned brief/handoff/review; do not overwrite another worker's files or interrupt a running worker to insert it.

Before Natural World v1 final Owner sign-off, require the controlled in-engine scenarios in the template: objects/containers/seams/save-load; vertical geology/seams; collapse/rubble; surface and groundwater; soil/climate/flora; and rule-driven creature spawning and despawning (cell, danger tier, light, time of day, density caps, distance), with tamed, captured, named, quest and lair creatures and creatures carrying items persisting across save/load (DEC-073). Missing or unapproved features remain explicit exit blockers, not authorization to implement them. DEC-007, DEC-037, upstream dependencies, independent-family review and the merge gate still apply.

Every overnight/morning report must include the template's **GAME TRANSLATION STATUS** section with lane, simulation behavior, in-game consequence, engine bridge/player-visible/save-load status, headless proof, in-engine proof, and the remaining step before playability. Make the difference between implemented, connected, observed, deferred and not yet playable explicit.
