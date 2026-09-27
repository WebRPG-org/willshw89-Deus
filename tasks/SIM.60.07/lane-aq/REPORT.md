# SIM.60.07 lane-aq — UF.Rules routing for wildlife damage

Writer: grok. This report is not a certification. Gemini reviews.

## What changed

`DEUS_Wildlife.js` no longer subtracts catalog `combat.attack` beside `UF.Combat.engage`. An adjacent predator resolves one strike:

- `UF.Rules.attack`, then `UF.Rules.damage`, written onto prey hit points once.
- The rng is `createSeededRng` from `game/js/sim/rules/dice.js`. The seed is `hash32(world seed, 0x7a, predator id, prey id, frame)`. If that module cannot be required, the same mulberry32 runs inline.
- The weapon key is `Combat.resolveWeaponKey` for a natural attack when Combat is loaded (wolf stab → `bite`). Without Combat: stab → `bite`, slash → `claws`, otherwise `unarmed`.
- `UF.Combat.engage` still marks the target. It does not roll. `ensureHp` may clamp hit points to the SRD average before the roll; that clamp is not the hit. If `Combat.stats.attacks` increased inside engage, Combat already resolved the swing and wildlife does not write hit points again.
- `nextAttackTick` is held for one catalog attack-speed interval. The combat loop swings only when `tick >= nextAttackTick`, so this decision is not a second hit on the same tick. A later tick is a later attack, still through `UF.Rules`.
- When `UF.Rules.attack` is not a function, catalog `combat.attack` (or 6 when that field is missing) is subtracted once. A kill still drops yields, emits `wildlife:kill`, removes the unit, and sets `feed` until `frame + 90`.
- A `RulesError` (no SRD mapping, unknown weapon) whiffs that swing. It does not fall back onto the catalog.
- If Combat already marked the prey dead, yields are not dropped a second time. `wildlife:kill` and the feeding state still run.
- `UF.Wildlife.stepPredator(frame)` runs one predator decision for the headless gate. `Game_Map.update` still does not call the wildlife tick (Objective 2).

The in-engine `predator_hunt` assertion is unchanged: the wolf is feeding and the hare is gone. That one decision pins the d20 to 18 and then clears it, so a natural 1 cannot flake the kill check. Miss, armor class, and the seeded roll are the headless gate.

## Evidence

Wolf Bite is +4 to hit, `2d4+2` (maximum 10). Catalog `combat.attack` for the wolf is 16. The hare maps to the weasel: Armor Class 13, 1 hit point. Plate is Armor Class 18. Fixture: `tools/sim/fixtures/wildlife_rules/hunt_strike.json`.

- Roll 10, combat off, hare at 30: hit points 25. One `bite` attack and one damage call. Not 30 − 16.
- The same roll and seed again: hit points 25.
- The same roll with plate equipped: hit points stay 30. No kill.
- Roll 1: hit points stay 30. No damage call. State stays `hunt`.
- No test roll, seed `1397702471`, frame 240, twice: natural 6 and hit points 30 both times.
- Seeds 1 and 101: naturals 12 and 16, damage 9 and 7. Both hit points match that damage.
- Combat absent, rules present, roll 10: hit points 25, no combat target.
- Combat off, hare at 1, roll 10: unit removed, `meat_raw` 1 and `hide` 1 dropped once, one `wildlife:kill`, wolf `feed` until frame 330.
- Combat enabled, hare started at 30: engage clamps to the SRD maximum 1, rules damage 5, written hit points −4. One yield drop, one `wildlife:kill`, wolf feeding. `Combat.stats.attacks` stayed 0. The combat swing predicate was false.
- Combat enabled, roll 1: hit points clamped to 1, hare stays, no yields, swing predicate false.
- Rules and Combat both absent: hit points 30 → 14 on two different seeds (subtract 16, no rules call). A prey at 16 is killed, yields drop, `wildlife:kill` fires, wolf feeds until frame 93.
- Mutant that writes `hpNow - catalogAttack(sp)`: hit points 14. The rules result was 25. Caught.
- Mutant that writes `hpNow - dealt - catalogAttack(sp)`: hit points 9. The rules result was 25. Caught.
- `Math.random` was not called on these strikes.

## Gate output

`node tools/sim/test_wildlife_rules_damage.js`

```
PASS fixture species — wolf -> hare
PASS source routes the strike through UF.Rules
PASS mutant anchor is unique — count 1
PASS probe strike did not throw
PASS hit roll is a non-critical hit on bare AC — natural 10 damage 5
PASS catalog attack is outside one bite — catalog 16 maxHit 10
PASS plate turns that roll into a miss — natural 10 hp 30
PASS bare hit writes the rules damage once — hp 25 want 25 key bite calls 1/1
PASS the same hit roll repeats — hp 25 / 25
PASS natural 1 deals no damage — hp 30 state hunt natural 1
PASS same seed and frame deal the same damage — hp 30 / 30 natural 6
PASS different seeds can differ — seeds 1/101 natural 12/16 damage 9/7
PASS combat absent still uses UF.Rules once — hp 25 target null
PASS kill, yields, wildlife:kill and feeding without combat — alive false state feed until 330 kills 1 drops [{"id":"meat_raw","n":1,"x":11,"y":10},{"id":"hide","n":1,"x":11,"y":10}]
PASS kill path with combat enabled — alive false state feed until 330 kills 1 drops [{"id":"meat_raw","n":1,"x":11,"y":10},{"id":"hide","n":1,"x":11,"y":10}]
PASS combat enabled applies the rules damage once — hp -4 max 1 rules 5 swingReady false attacks 0->0
PASS combat enabled miss does not kill or swing — hp 1 state hunt swingReady false
PASS rules absent subtracts catalog attack once, deterministically — hp 14 / 14 catalog 16
PASS rules absent still kills, drops, emits and feeds — state feed until 93 drops [{"id":"meat_raw","n":1,"x":11,"y":10},{"id":"hide","n":1,"x":11,"y":10}]
PASS mutant catalog_subtraction is caught — hp 14 rules hp 25 err null
PASS mutant double_apply is caught — hp 9 rules hp 25 err null
OK 0 failed
```

`node tools/check_deus_syntax.js`

```
Checked 52 DEUS plugin files. Errors: 0
```

Both commands exited 0. Run from the worktree on the final tree, before this commit.

## Open Owner questions

Should the Objective 2 wipe of the wildlife map tick stay in force? `Game_Map.update` still does not call `tick()`, so this damage law does not run in play. This lane did not restore that hook and does not decide whether it should return.

## Follow-ups

- PROPOSED-AQ-01: If live predator hunting should run again, wire `tick()` back into `Game_Map.update` and re-check the wildlife suite's perf assertion. Not done here. Re-enabling the loop would also resume wander, flee, graze, and sleep.

## Certification

Not certified. An independent gemini review decides.
