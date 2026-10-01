# DEUS_NaturalConnections

> Naming normalized 2026-09-30 (OPS.PRUNE.06): canonical plugin `game/js/plugins/DEUS_NaturalConnections.js`; API namespace `DEUS` (`window.UF` remains the runtime alias in `DEUS_Core.js`). Existing dated results and limitations below are retained, not re-tested by this documentation change.
> World extent: [DEC-030](../OWNER_DECISIONS.md#decision-dec-030-world-grid-and-vertical-biomes-owner--pm-delegated-2026-09-26) governs new worlds: 32 layers, -16..+15, natural terrain through +11. Older five-level references below describe historical generators or saves; they do not reduce the current range.

## Purpose

Adds saved, physically traversable natural passages between Ground, z=-1 and z=-2. It selects existing dry, supported cave columns after world founding; it does not excavate, replace biomes, remove resources, stamp buildings, or turn camera switches into creature travel. Entrances use the existing `DEUS_Levels` stock stair placeholders as sprites, including on Ground, without changing the catalog or map tiles.

Load after `DEUS_World`, `DEUS_Levels`, `DEUS_Jobs` and `DEUS_History`. Core files are untouched. Public `World.newWorld` is aliased and its original runs first: all founding listeners and initial unit seating therefore finish before passage selection. No `world:created` listener ordering is assumed.

## Public API

All cell references are `{area:{x,y},x,y,z}`. Missing z means Ground; strings, null, fractions, unsupported layers and out-of-bounds cells are rejected. These are vertical passages within one area and one x/y column, not arbitrary teleports.

| Member | Meaning |
|---|---|
| `VERSION`, `TYPE` | Save version `1`; job type `natural_travel`. |
| `generate()` | Idempotently returns the saved generation record. New worlds call this automatically. For an old save without a record, an explicit call surveys its existing natural baseline and current tile/object/shape changes. It never rerolls a saved record, including a blocked result or unknown version. Returns null if world levels are unavailable; `lastRefusal()` explains. |
| `state()` | Saved record or null. Treat as read-only outside tests. |
| `list({area?,z?})` | Detached copies of paired links touching that area/level. |
| `at(cell)` | Detached links whose endpoint exactly matches the cell. At the middle entrance of a chain, returns both its upper and lower links. |
| `reserved(cell)` | True for an endpoint or its one-cell clearance on the same level. A house/build planner can consult this without mutating passage records. |
| `travel(unitOrId, linkId)` | Assigns a dedicated owned job from the worker's current area and level. Returns the job, including a failed job with a normal reason when planning fails; null for invalid workers/links or an existing job/movement order. Does not silently replace another order. |
| `traverse(unitOrId, linkOrRoute)` | Universal creature traversal: allows any creature, wildlife, monster, or unit to physically cross between connected layers if at the passage and landing is clear. |
| `isWater(cell)` | True when the authorities call the cell water: `Levels.waterAt` (natural pools, UF.Fluid, floods) or `Jobs.isWaterAt`. Read-only; this module stores no water of its own. |
| `orderSelected(direction=-1)` | Explicit player command. `-1` descends, `1` ascends. Requires a selected player colonist. Searches nearest same-level direction-compatible endpoints, validates the path and landing, then calls `Colonists.order`. Invalid commands preserve the current job. Displays a short bottom-screen notice. |
| `lastRefusal()` | Last public command/generation refusal string or null. Job failures also have their ordinary `job.reason`. |
| `markers()` | Visible passage sprites in the current scene; useful for visual tests. Each has `_ufPassage` with its cell. |

Controls: select a player colonist, press **F6** to descend or **Shift+F6** to ascend. Press once per level. The shortcut registers only when F6 is unmapped. Orders can be issued while paused, but walking/work/traversal wait for resume. These keys do not switch the camera. Existing comma/period/Home controls remain view-only; existing follow mode can follow the traveler.

### Generation and guarantees

The survey is restricted to the current world's start area (the requested five-layer 256x256 world has one area). Its Ground anchor is an actual standable founder, preferentially from the player's Ground home. In a terrain-only world without founders, it chooses a standable central surface cell.

Candidates are ordered by distance from that anchor, then a seeded coordinate hash. Both underground baseline cells must be natural floor; GEN1's absent water arrays are supported. Final eligibility reads actual saved shapes, water, tile/object passability, unit occupancy, and an adjacent clear cell at each level. The exact Ground path must reach the endpoint; nearest-neighbor and partial paths are not accepted.

One chain is two paired links at a common column, `0 <-> -1` and `-1 <-> -2`, so the intermediate endpoints cannot be disconnected from each other. A second chain at least 48 cells away is attempted. Initial sites, settlement enclosure radii, bootstrap plan cells and retained household footprints are excluded with clearance. Household structures come from `Households.structures(h)` when available, including annexes and their entrances; older modules fall back to the main home. No terrain mutation is used to make a candidate pass.

**A safe chain is not guaranteed for every possible seed or modified save.** If no aligned, clear column is reachable from Ground, the record is `status:"blocked"` with a concrete excavation/generator-seam explanation and no links. It does not fabricate a passage. The result is retained rather than repeatedly rescanning. Explicit migration does not treat player-excavated solid-baseline cells as natural cave columns. There is no claim that each separate underground pocket or every dwarven settlement connects to a passage.

### Job semantics

`natural_travel` first walks through ordinary World pathfinding to the exact same-z source endpoint. After 60 work ticks (normal job rate applies), it checks source arrival, destination support, water, passability and occupancy again, then calls `World.moveUnitToLevel`. This emits the existing level-change event; `DEUS_Items` follows carried items to the holder's new level. The camera is not changed by this module.

On success the terminal job's target changes to the destination and its result is `{moved:true,linkId,from,to}`. On a late obstruction the handler returns `"continue"` with a saved refusal; its next plan fails normally. This is intentional: cancelling inside `Jobs.apply` would be overwritten with `done` by `Jobs.finish`. No raw move is available through this module from an arbitrary source cell. Pair validation requires adjacent allowed levels, a common area and identical x/y.

Cross-level travel is an explicit job only. Ordinary `World.sendUnit`, AI resource searches, combat, hauling and social target selection keep their existing same-level contracts. No automatic all-world route planner is claimed.

### Water (NAT.03.02, 2026-10-01)

UF.Fluid is the only water store, and it moves water only through its own cell faces. A passage endpoint is standable, so it has a floor stratum, and a floored passage is not a drain: water poured at an upper entrance spreads over its own level and never reaches the landing below (PM ruling on lane-el, option 1). This module moves, mints and stores no water. `dry()` refuses a cell `isWater` reports. Whether stairwells and natural passages should ever carry water is an open design item, not a behaviour of this module.

The private water store that used to live here (`hasFluid`, `addFluid`, `clearFluids`, `updateFluids`, the `Levels.waterAt` wrapper and the frame-30 `updateFluids()` call) was retired on 2026-10-01: it wrote water at a landing without taking any from the entrance. The frame-30 block of `Scene_Map.update` still steps creatures through passages (`stepCreatures`).

## Events

- Emits `naturalConnections:generated(savedRecord)` after a completed survey.
- Emits `naturalConnections:traversed(unit, resultCopy)` after a successful physical move.
- Emits `creature:traversed(unit, resultCopy)` as well, after `traverse()`.
- Emits no fluid events. `naturalConnections:fluidFlow` and `fluids:flow` were retired with the private water store (2026-10-01).
- Every 30th frame of `Scene_Map.update` steps idle creatures (no job, no goal, not a person or colonist) standing on a passage entrance whose landing is free. Otherwise it relies on existing Jobs update/save hooks and `world:unitLevelChanged` consumers.
- Aliases `World.newWorld`, `Scene_Boot.start`, `Spriteset_Map.createCharacters/update`, and `Scene_Map.createAllWindows/update`, always calling the original.

## Save data

`DEUS.World.state.naturalConnections`, already included in `contents.ufWorld`:

```js
{
  version: 1, seed, status: "ready" | "blocked", reason,
  anchor: {area, x, y, z: 0},
  links: [{id, chain, kind: "natural_passage", a: cell, b: cell}],
  chains: [{id, area, x, y, landings: [cell, cell, cell]}],
  survey: {candidates, tested}
}
```

A save made before 2026-10-01 may also hold `fluids: {cells: {"ax,ay:z:x,y": {type, time}}}`, the retired private water record. It is carried through load and save unchanged and inert: nothing reads it as water and nothing credits it into UF.Fluid. Converting it is the fluid save codec's job (lane-ec2, NAT.03.02 part b).

All records are plain serializable data. No renderer or runtime path is saved. In-progress traversal jobs persist through existing Jobs save data and replan on load. Loading does not add links to an old save automatically. A missing or unsupported record yields no usable links.

## Checks

`node tools/test_natural_connections.js` executes the actual new plugin and actual `DEUS_Jobs`, with terrain, World movement and UI doubles. It now has 24 checks (2026-10-01: `liquid_physics_flow` removed with the private store; `liquid_makes_landing_wet_refusing_travel` wets the landing through the fixture's own `Levels.waterAt`). The original 22 checks covered: deterministic pairing on five fixed **mock terrain** seeds; legacy arrays; post-founding protection; planned homes/enclosures and retained annexes; honest blocked results/no carving; water/blocking exclusion; save round-trip and detached queries; z-scoped reservation; real Jobs walk/work/finish; no arbitrary-source transfer; occupied and unsupported landings; late refusal not reported done; existing-order preservation; offscreen reverse travel and inventory ownership; strict adjacency/column; loaded job replanning; valid/invalid explicit player commands; non-player refusal.

Seven in-memory source mutations are available: `--mutant=arrival`, `landing`, `water`, `protection`, `adjacency`, `finish`, `annex`. These alter only the VM source string, never production files.

`node tools/test_natural_connections_no_mint.js` (NAT.03.02) runs the production World, WorldGen, Tiles, Objects, Levels, Floors, Fluid, Jobs and this plugin in a VM on generated worlds (seeds 20260919 and 7), with UF.Fluid alone (sim/hydro off). Checks: `authoritative_flow_conserved` (6 water at every link's upper endpoint, 400 `UF.Fluid.step`s: upper-level debit 0, lower credit 0; an open-column control shows debit 6 = credit 6), `floored_passage_is_not_a_drain` (both link kinds), `creatures_still_stepped`, `link_does_not_mint`, `waterAt_not_wrapped`, `private_store_gone`, `legacy_payload_round_trip`. Mutants: `disable_all_flow`, `fake_passage_flow`, `credit_legacy_payload`, `drop_legacy_payload`, `drop_step_creatures`. "Upper stays 6" is measured on the upper level, not the endpoint cell: UF.Fluid's lateral faces spread the pour over that level.

Runtime suite `natural_connections` forces seed `20260919` only for that exact `--uf-test=natural_connections` launch (`tools/run_tests.js` passes `--deus-test=...`, which does not force it). It checks generation, dry supported landings, saved links, actual visible marker pixels, physical walking and descent, offscreen deep travel with item holder **and z**, occupied landing refusal, reverse travel, actual F6 invalid-order preservation, Shift+F6 explicit ordering while paused, resume to Ground, and new harness errors. It produces Ground entrance, middle entrance and paused-order screenshots. Since 2026-10-01 `liquid_present_at_entrance` puts 6 water at the upper entrance through UF.Fluid and `liquid_flow_through_connection` steps UF.Fluid 400 times and requires Ground debit 0, lower credit 0 and a dry landing; it adds `landing_dry_after_wetting` (level -1) and `entrance_wetted` (Ground) screenshots and then restores every touched Fluid cell through `UF.Fluid.setCell`. The editor F5/F8 gate remains separate.

## Status — 2026-10-01 (NAT.03.02 lane-el)

- `tools/test_natural_connections_no_mint.js`: 7 passed, 0 failed at the tip. At the base (afaeaf69, before the change) the two guards and `creatures_still_stepped` passed and `link_does_not_mint`, `waterAt_not_wrapped`, `private_store_gone` and `legacy_payload_round_trip` failed. Each mutant turns its named check red.
- `tools/test_natural_connections.js`: 24 passed, 0 failed; its seven mutants still fail.
- NW.js snapshot, seed 20260919 forced (`--uf-test=natural_connections`): `generated_chain` FAILS at the base and at the tip. The survey tests 0 of 18103 candidates: with no chain yet, the only skip before the tested count in `generate()` is the `levels.waterAt` test on the -1/-2 cells, so every candidate was called wet. (In the node VM on the same seed, Levels' flood fill from Ground water reaches the -1 caves; not checked in NW.js.) The suite returns there. This is not caused by NAT.03.02.
- NW.js snapshot with the `DEUS_World` Seed parameter set to 7 (snapshot only): 11 passed, 4 failed, at the base and at the tip alike. Both rewritten liquid checks pass (Ground debit 0, lower credit 0, landing dry). `dry_supported_landings`, `invalid_f6_keeps_order`, `reverse_traversal` and `keyboard_order_moves_unit` fail at the base too, and have not been investigated here.

## Status — 2026-09-19

- Actual-source VM after the narrow annex-reservation follow-up: **22 passed, 0 failed**. The new retained-annex fixture selects an intersecting column when the structures API is bypassed: annex mutation **21/1**. The previous 21-check suite's six mutations were observed failing: arrival 20/1; landing 18/3; legacy-water 20/1; reservation 20/1; adjacency 20/1; finish 19/2. The annex follow-up did not change traversal or input code; the final runtime below predates only this reservation extension.
- Early NW.js snapshot `codex_connections_20260919_a`: **9/9**, seed 1566302824, before F6/extra reservation additions. Both produced PNGs were opened: a distinct stock stair mouth near the Ground camp and a blue-lit underground stair platform with the walker. Actual walk-to-entrance, both depth changes, occupied landing refusal and return completed. No new harness errors in that run.
- Final NW.js snapshot `codex_connections_20260919_f6_b`: **12/12**, fixed seed 20260919, two complete chains. Actual F6 with no deeper route kept the existing work; Shift+F6 created an owned passage order; during 40 paused render frames both progress and ticks stayed `0 -> 0` / `270 -> 270`; resuming moved the worker to Ground while the view remained -1. Item holder and z stayed with the traveler. No new harness errors.
- All three final PNGs were opened: `natural_connections.ground_entrance.png` shows a stair mouth on dry grass beside the lake; `middle_entrance.png` shows the traveler on the cave passage and its carried stone in the profile; `passage_order_paused.png` shows the paused indicator, profile action "Traversing a natural passage to Ground", and a readable bottom-screen command notice. The fixture leaves gender unset, so its profile title displays `undefined`; this is not a generated-colonist metadata claim.
- An earlier fixed-seed run `natural_links_20260919_final` failed 10/2 because the fixture made Shift and F6 newly pressed in the same RMMZ input update, leaving only Shift as `_latestButton`. Running the actual engine input-update source reproduced that result. The only fix was holding Shift for one input frame before pressing F6 in the test, matching a keyboard chord; no travel guard was weakened. The fresh 12/12 result above follows that single evidenced fix.
- No editor Playtest F5/F8 or user art approval has been performed for this module.
- New module registration, household/build reservation integration and commit are owned by the parent agent. Arbitrary later manual construction/digging can still obstruct a passage; traversal rechecks and refuses. No cave-mouth original art, universal route planning, constructed stairs/ladders, connection to +1/+2, or all-seed excavation guarantee is included.
