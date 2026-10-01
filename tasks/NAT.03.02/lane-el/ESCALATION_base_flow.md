# lane-el escalation: the base guard fails (AGENTS.md Rule 10, BRIEF "First step" 4)

Date: 2026-10-01. Writer: claude. Lane base: `8a254452` (task/lane-el, post-cu main `b21cfe62` + the wave-1 records and the launch prompt).

## What happened

The brief's first step is `tools/test_natural_connections_no_mint.js::authoritative_flow_conserved`, run on the unchanged base. It **fails**. The brief says that if it fails, the lane stops, makes no Fluid edit or other change to make it pass, and escalates to the PM. This lane has stopped. `game/js/plugins/DEUS_NaturalConnections.js`, `tools/test_natural_connections.js` and `docs/systems/DEUS_NaturalConnections.md` are unchanged.

## What is known (all from runs on 2026-10-01 at 8a254452)

- **UF.Fluid moves no water through any generated natural passage.** For each saved link, the test puts 6 water at the upper endpoint through `UF.Fluid.setCell`, steps `UF.Fluid.step` alone 400 times (budget 512), and measures the levels below in a 25 x 25 box. The lower levels gain 0 at every link:
  - seed 20260919 (the in-game suite's seed): 27 of 27 links, all `cliff_cave_passage` (`evidence/base_authoritative_flow.txt`);
  - seeds 20260923, 424242 and 7: 12/12, 20/20 and 28/28 (seed 7 includes 4 `natural_passage` links, from both the 0/-1 and the -1/-2 halves of its chains) (`evidence/base_authoritative_flow_other_seeds.txt`).
- **Cause:** every passage's upper endpoint has a solid bottom stratum: `["stone","air","air","air","air"]` for cliff caves, `["soil","air","air","air","air"]` for the natural chains. `UF.Levels.getStrataFluidPassage` therefore leaves the DOWN bit (8) clear (bits 38 or 54), and `UF.Fluid.fluidCanPassDown` returns false. UF.Fluid has no notion of a passage link or of the `stairDown` connector the cell carries. Its only vertical path is an open S0 over an open S4 below (`DEUS_Fluid.js` `canDrainDown`; `DEUS_Levels.js` `getStrataFluidPassage`).
- This follows from how passages are chosen. A passage endpoint must be standable (`dry()` → `standableShape`, `walkable`), so it always has a floor, and in the five-strata model a floor stops water falling. The passage geometry is not wrong for walking. It just isn't a hole as far as water is concerned.
- **The measurement works.** `::control_open_column_flows` does the same pour on a non-passage cell whose strata are set open (air S0 at z=0 over a stone-floored z=-1). It passes, with upper-level debit 6 = lower-level credit 6. Under `--mutant=disable_all_flow` (Fluid `_mutantNoGravity`) the control fails (`evidence/base_control_mutant_disable_all_flow.txt`).
- **With sim/hydro loaded, as in the game** (`--hydro`, 437 s): still 27/27 links with no water seen on the lower level at any sampled step. Seepage moved a little water into hydro stores at a few links, never to the landing (`evidence/base_authoritative_flow_hydro.txt`).
- The only thing at the base that moves "water" down a passage is the private store this lane is meant to retire: `updateFluids()` → `addFluid(lower)`. It writes `naturalConnections.fluids.cells` and sets `baseline.water[idx] = 1` without debiting the source, which is the minting.

## What is ruled out

- A harness fault: the control passes, and the mutant turns it red.
- Step count or budget: 400 x 512 for a single 6-unit pour, plus the hydro run. The earlier exploratory probe ran 3000 steps with hydro and also saw 0 reach z=-1.
- Seed-specific geometry: 4 seeds, 87 links, both link kinds.
- Hydro seepage as a substitute path: see above.

## Not checked

- F5 / NW.js. Everything above is the node VM harness (production World, WorldGen, Tiles, Objects, Levels, Floors, Fluid, Jobs, NaturalConnections; RMMZ doubles).
- A side observation, not investigated (passage geometry is out of scope): in this harness, seed 20260919 makes no 0/-1/-2 chain (`survey.tested` 0 of 18751 candidates). A sample of 2221 candidate columns had `Levels.waterAt` true at -1 (2221 of 2221) and at -2 (2211 of 2221). The in-game suite's `generated_chain` needs a chain, so it may fail on that seed. I have not checked this in F5.

## Decisions needed (PM)

The brief's settled answer ("Fluid already moves water through passages; the positive check proves it") does not hold at this base. Any of these unblocks the lane. Each one is outside what the brief lets this lane decide:

1. **Passages are not drains.** Re-word the guard so it proves that water crosses a passage level only through UF.Fluid's own faces, and that with the private store gone no passage moves water (debit = credit = 0 at a floored passage; the open-column control shows Fluid still conserves vertical flow). Then retire the private store as briefed. This is the smallest change and needs no Fluid or Levels edit. But it is a design ruling: a passage no longer carries water downhill.
2. **Fluid honours passage connectors.** UF.Fluid treats a `stairDown`/`stairUp` connector (or a passage link) as an open vertical face. That is a Fluid-core edit, which G02 excludes from this lane, so it would need its own lane, ahead of el.
3. **Passage geometry opens a fluid path.** Levels/WorldGen give a passage column an open face for water (for example an open S0 at the stair cell), while a creature can still stand on it. That is passage geometry, out of scope here, and it would also need its own lane ahead of el.

Recommendation: option 1. It matches the brief's goal (stop minting, keep creatures stepping, keep the legacy payload inert) without new physics. Whether stairwells should carry water can then be decided as its own design item.
