# DEUS Combat U7

On-map combat for the 32-layer world. Fights happen where they start. There is no separate battle scene. The view stays the RMMZ top-down 3/4 camera. There is no oblique projection.

Resolution stays in `UF.Rules` (`game/js/sim/rules`). This lane does not change that module. Attack rolls, damage, saving throws, initiative and death saves are `UF.Rules` calls with a seeded rng. The same seed and the same orders produce the same hit points, positions and log in fortress mode and in hero mode.

## Round clock

One SRD round is 6000 ms of sim time at speed 1. Speed 2 finishes a round in 3000 real ms. Pause freezes sim time, the dice word and the round phase. Resume continues the same round. Actions inside a round are spread across it in initiative order so the round reads as continuous motion. Initiative is one `UF.Rules.initiative` roll per living unit, highest total first, ties by unit id.

## Modes

Fortress and hero are control layers on the same encounter.

- Fortress gives multi-layer selection, an order bar, squad behaviours, pause and speed. Units act from their behaviour.
- Hero follows one unit. Companions keep their behaviour: attack nearest, defend, flee or heal. Pause-to-target holds the clock when a target is chosen.
- Tab, or the `mode-switch` button, changes the layer. Combat state, initiative, the round clock and queued orders stay. The scene name stays `map`.

A queued order replaces that unit's behaviour for one turn. With an empty queue the behaviour runs, so watching the same fight in either mode does not change the dice.

## Cross-layer

Units carry a Z in the merged world range, -16 through 15 (32 layers, surface 0). Selection can include several layers. A weapon attack calls `UF.Rules.attack`. That function refuses different Z and this lane applies no damage for that swing. The swing is still shown, and the marker sits on the target's layer.

A spell order calls `UF.Rules.savingThrow` and, when the save fails or the spell deals half on a success, `UF.Rules.damage`. The area marker is whole squares on the target's layer (Chebyshev disk). Horizontal distance is SRD 5-5-5: feet = 5 × max(|dx|, |dy|). A different layer does not add squares.

## Presentation

Placeholders only. No bitmap is written. Clip ids use `CH.<RACE>.<SEX>.<ARMOR>.<ANIM>.<DIR8>.F<n>`.

Armor state follows the worn category: light, medium, heavy, robe, otherwise unarmored. A cloak, boots or other gear does not change the map sprite. Class is text on the selected-unit panel, not part of the clip id.

Attack clips, one per weapon group: unarmed, dagger, one-hand sword with no shield (`ATK_1H`), two-hand, spear/polearm, staff, bow, crossbow. `ATK_1H_SHIELD` is retired. A carried shield does not change the clip. Life clips do not draw a weapon. Cast, hurt, knockdown and dead are their own clips.

Frame counts: idle 4, walk 4, every other clip 6. Directions: S, SW, W, NW, N, NE, E, SE. The strike frame (frame 4, index 3) is held twice as long as the other attack frames.

A hit shows a flash on the strike frame, a native-size `DEUS_Pixel` number coloured by damage type, and a blood ground mark with 3 fade steps. A heavy hit sets a 1 or 2 px cosmetic offset. The grid square moves only when the order names forced movement. A killing blow sets the pose to `DEAD`. Shared condition overlays are not per-character clips.

Footprints: Tiny shares a square; Small and Medium are 1; Large is 2×2; Huge is 3×3; Gargantuan is 4×4. Range and area markers are whole squares.

## Movement

`DEUS_Move8` steps characters eight ways on the square grid. Orthogonal walk is 4 px per frame, run is 6, and a diagonal is 3 px on each axis. A diagonal does not cross a blocked orthogonal corner. Destinations stay on whole tiles. Terrain is not given a diagonal move.

## UI

Both layers use one integer scale: the largest integer that still shows at least 20 tiles across a 48 px tile (2 at 1920 px wide, 4 at 3840). Window skins use that same integer. Smoothing stays off.

The selected-unit panel uses `race/<race>` as its window skin and `race-bg/<race>` as the faceset background. The panel sits beside the fight. The Z readout stays inside the fight rectangle.

Fortress zoom-out is a 1× render plus a colour-coded tile minimap. The minimap is not a blurred downscale.

Markers are shape-coded: selection square, faction triangle, summon controller diamond, low hit points circle.

## Plugins

Headless code is `game/js/sim/combat_rt` and loads under Node without RPG Maker. The plugins are `DEUS_Move8`, `DEUS_CombatRT` and `DEUS_CombatUI`. They are not listed in `game/js/plugins.js`; registration is a merge step. `DEUS_Combat.resolveAttack` notifies `UF.CombatRT.noteResolved` when that bus exists, and it skips its own tick while `UF.CombatRT.ownsCombat()` is true. Setting `DEUS_COMBAT_RT_PRESENTATION=1` attaches the bus from `DEUS_Combat` so a benchmark process can present swings without a plugins.js edit.

## Checks

`node tools/combat_rt/test_combat_rt.js` prints `RESULT: N passed, 0 failed`. Each check has a mutant the check rejects. `node tools/test_srd_combat_proof.js` and `node tools/check_deus_syntax.js` stay as they are.

## Open (not decided here)

- The 3 px diagonal step is the item 43 PM proposal used as the plugin default.
- An unarmored wizard, sorcerer, warlock, cleric, druid or bard uses the robe state. That caster list is a PM default.
- Javelin, dart, sling and net have no attack clip.
- Other one-handed melee weapons use the `ATK_1H` clip. The drawn weapon in that clip is the one-hand sword with no shield.
- The panel shows the class name. It does not add a portrait.
- A weapon attack across Z deals no damage because `UF.Rules` refuses it. A cross-Z weapon hit would be a rules change.
- Whether a difference in Z should add to range is open. Horizontal distance ignores Z.
- Knockback uses a presentation threshold: 1 px from 8 damage, 2 px from a critical or from 15 damage. The grid does not move from that offset.
- Item 27 names 3× on 1440p and 4K. The 20-tile rule yields 2× at 2560 px wide and 4× at 3840. This lane uses the 20-tile rule.
- The low-hit-point marker turns on at half hit points.
- Companion heal rolls `1d4` plus Wisdom, out to 60 feet, through the rules dice helper.
- The -16..+15 split is the merged world range this lane reads. The split itself is not re-decided here.
