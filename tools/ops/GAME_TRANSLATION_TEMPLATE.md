# DEUS game translation and proof templates

Mandatory under the Owner's 2026-09-28 traceability request and `.agents/rules/deus-game-translation.md`. Fill these within the current approved scope; a template does not open a WBS leaf or authorize art, engine edits, integration, or new gameplay work. Existing work is not retrospectively declared playable by adding this document.

## Every lane brief and completion report

In a brief, describe expected behavior and planned proof. In a completion report, replace plans with observed results, exact commits, evidence paths and commands; mark anything not run explicitly. Retain all fields. Use `N/A - <specific reason>` for genuinely inapplicable details, never to conceal a missing bridge or consumer. For tooling/governance work, explain the indirect assurance it supplies and the gameplay work that relies on it.

```text
GAME TRANSLATION

WBS / Lane:
Approved scope / Owner authorization reference:
Writer SHA / evidence date:
Translation Class: A DIRECT PLAYER-VISIBLE | B WORLD-BEHAVIOR VISIBLE | C FOUNDATIONAL / INDIRECT

Player / World Effect:
What concretely changes in the game or world?

Trigger:
What action or simulation condition causes the behavior?

Runtime Authority:
Which single system owns the truth and which state fields represent it?

Simulation Path:
Which actual files, functions/modules and data calculate the result?

Engine Bridge:
Which RPG Maker MZ consumer receives, displays or uses the result?
Name the actual connection, or the specific deferred integration and its approval state.

Visible Result:
What would the player see, manipulate, or experience? What has actually been observed?

Persistence:
What survives save/load and region unload/reload? Cite schema/IDs and proof.

Failure Without This Lane:
What looks fake, breaks, or cannot happen without it?

Automated Proof:
Exact command, seed/fixture, expected invariant, observed exit/result, log, tested SHA.
Separate deterministic unit proof from the integration test of the consumer.

In-Game Proof:
Exact reproducible playtest steps, seed/scene, expected result, actual result,
evidence paths and inspected screenshots. State NOT RUN when not performed.

CONSUMED BY GAME SYSTEMS:
- Named visible consumer, contract/data received, and integration test proving delivery.
- For each foundation: how corruption would manifest in gameplay.

GAME BRIDGE STATUS
Simulation implemented: YES/NO - evidence or reason
Engine bridge implemented: YES/NO - evidence or reason
Presentation implemented: YES/NO - evidence or reason
Input/player interaction implemented: YES/NO - evidence or reason
Save/load implemented: YES/NO - evidence or reason
Playable verification performed: YES/NO - evidence or reason

Remaining step before player can experience it:
```

Use NO plus `NOT VERIFIED` when a YES has not been established. A foundation whose bridge belongs elsewhere reports, without implying downstream completion:

```text
Simulation authority: COMPLETE within <approved scope>, supported by <evidence>
Game translation consumer: DEFINED as <named system/contract>
Engine bridge: DEFERRED TO <specific existing integration or explicitly unapproved proposal>
Player-facing status: NOT YET PLAYABLE
```

A/B results require a direct playable demonstration or in-game outcome scenario before claiming those behaviors complete. C results name consumers and how corruption would affect gameplay, and supply the consumer integration test or explicitly state that it is blocked/not run. A passing headless test cannot establish the RMMZ connection; a screenshot cannot establish deterministic conservation or persistence. Do not widen a foundation lane to make these fields look complete.

## Every future WBS proposal

```text
WHY THE PLAYER CARES:
<Concrete action or world consequence, not a general realism/depth claim.>

Translation class and named consumer:
Upstream dependency / current bridge status:
Proposed scope / acceptance proof:
Owner approval: NOT YET APPROVED unless an explicit approval is cited.
```

For example, a wet permeable formation flooding an excavation while impermeable rock at the same depth does not is a concrete consequence. Heavy hunting thinning an area's creature spawns for a few in-game days before the spawn rules refill it is another (DEC-073). These are illustrative requirements, not assertions about current implementation or new scope approvals.

## Review and merge record

```text
GAME TRANSLATION REVIEW
Lane / exact writer SHA:
Brief and completion GAME TRANSLATION block references:
Class / consumer chain checked:
Deterministic proof independently checked:
RMMZ bridge / playable proof independently checked (or NOT RUN):
Persistence proof checked:
Six bridge-status fields supported by evidence:
Permitted claim: bounded foundation complete | behavior demonstrated | NOT YET PLAYABLE
Missing evidence / deferred integration / remaining approval:
Reviewer identity, actual model family, review artifact/commit and timestamp:
```

This block supplements the existing review format. It is not a replacement for the required single VERDICT line, review-commit structure, family independence or `merge_gate`. The integration record references the reviewed writer SHA and this evidence; missing fields must be resolved before lane completion or gameplay-complete claims. Preserve truthful foundation-only outcomes.

## Natural World v1 final playable exit proof

The coordinator assembles a controlled, reproducible in-engine sequence before final Owner sign-off, using approved content and known seeds. Record commands/steps, tested SHAs, expected and observed outcomes, conservation/identity checks, saved state and opened evidence. A scenario requiring unapproved work remains blocked; it does not approve that work.

| Scenario | Required observable proof |
|---|---|
| A - Physical world | Move an object; put it in a container and take it out; carry it across a region seam; save/reload; verify the same object identity, placement and count. |
| B - Vertical geology | Traverse elevation, inspect a deep cut, descend multiple Z levels and cross an underground region seam; expose existing strata and verify continuity and persistence. |
| C - Structural physics | Show a safe span surviving, remove critical support, observe collapse and physical rubble, verify mass conservation and persistent collapsed state. |
| D - Water | Observe surface runoff; inspect pre-existing groundwater, breach a saturated formation, observe inflow/pooling/equilibrium, and verify water-state persistence. Groundwater implementation still needs its own Owner approval. |
| E - Soil / climate / flora | Compare dry, wet and cold terrain, observe appropriate differences in vegetation suitability, and verify environmental state persistence. |
| F - Wildlife and monsters | Observe that spawns obey the cell, danger tier, light, time-of-day, density-cap and distance rules and the V68 passable-cell check, and that hostile monsters stay out of the radius around settlements and starts; that anonymous creatures despawn only when far away and out of sight; that heavy hunting thins an area's spawns and then recovers; that a killed lair boss stays gone while its minions refill; and that tamed, captured, named, quest and lair creatures and creatures carrying items persist with the same IDs across save/load (DEC-073). |

The pasted examples for physical objects, 32-layer worlds, support/collapse and aquifers describe intended game translation, not verification that those features are present. Actual dimensions, consumers and behavior must come from the approved lane contracts and observed runtime. No new art is required or authorized by this proof plan.

## Every overnight / morning report

```text
GAME TRANSLATION STATUS

Lane:
Simulation behavior:
In-game consequence:
Engine bridge status:
Player-visible status:
Save/load status:
Headless proof:
In-engine proof:
Remaining step before player can experience it:
```

Report the concrete consequence first, then distinguish simulation evidence from RMMZ integration and playtest evidence. For example: "Support calculation enforces the approved span rule and conserves mass in the tested fixture; engine bridge/playtest: NOT VERIFIED." Do not change that to "rock roofs collapse in the game" until observed in the game.
