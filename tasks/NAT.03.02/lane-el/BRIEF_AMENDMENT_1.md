# lane-el (NAT.03.02) brief amendment 1: passages are not drains (PM ruling, 2026-10-01)

**Trigger.** The writer stopped at the brief's first step and escalated (`tasks/NAT.03.02/lane-el/ESCALATION_base_flow.md`, AGENTS.md Rule 10): `::authoritative_flow_conserved` fails at the unchanged base because UF.Fluid moves no water through any generated natural passage. Every passage endpoint has a solid floor stratum, so the DOWN face is closed (87 links over 4 seeds; the open-column control passes and `disable_all_flow` turns it red).

**Ruling (PM, DEC-058; braintrust DECIDE-EL, MiniMax M3, agreeing with the writer's recommendation): option 1.** A floored natural passage is not a drain. This lane retires the private water store (which mints water below without debiting above) and does not add any new way for water to cross a passage. Options 2 (a Fluid-core connector face) and 3 (passage geometry with an open fluid face) are out of this lane's scope.

**Replacement acceptance for `::authoritative_flow_conserved`** (replaces the brief's text for this guard; the first step still runs it at the base before any edit):
Water crosses a passage level only through UF.Fluid's own faces. For each saved link, put 6 water at the upper endpoint with `UF.Fluid.setCell`, step `UF.Fluid.step` alone up to the brief's budget, and assert that the upper endpoint still holds 6 (no debit) and the lower landing still holds 0 (no credit). The same pour on the open-column control cell must show upper debit 6 = lower credit 6. The guard must pass at the base and at the tip. `disable_all_flow` must turn the open-column control red while the floored-passage assertion stays 0/0.

**Added checks and mutants:**
1. `::floored_passage_is_not_a_drain` (tip): at least one seed per link kind (`cliff_cave_passage`, `natural_passage`); 6 water at the upper endpoint, 400 steps: landing stays 0, upper stays 6.
2. Mutant `fake_passage_flow`: after stepping, hand-writes +1 water at one passage landing. Must turn `::floored_passage_is_not_a_drain` red.
3. The two in-game checks in `DEUS_NaturalConnections.js` keep their names; `liquid_flow_through_connection` now asserts the landing stays dry (debit 0, credit 0). The F5 evidence says explicitly that the landing is dry after the upper entrance is wetted.

**Unchanged:** everything else in the brief (scope, allowedPaths, the legacy payload left inert for lane-ec2, the other tests and mutants). The lane's merge still waits for ADR-003 amendment A11 to be in the accepted ADR (WORK-GATE, deadline records item D).

**Design item opened (not a lane):** "Should stairwells and natural passages transmit water, and if so how?" (a Fluid connector face, a passage geometry with an open fluid face, or never). It is settled before any lane that needs water inside caves (rivers into caves, flooding).
