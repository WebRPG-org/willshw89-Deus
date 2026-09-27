# Tamed creatures in party combat

Tamed creatures fight on the player's side (WG.00.39, DEC-033 item 3). Headless rules live in `game/js/sim/taming/party.js`. The real-time encounter is `game/js/sim/combat_rt`. `DEUS_Combat` uses the same record for the legacy tick. No art is requested or stored. The riding saddle stays the visual marker from `DEUS_Taming.md`.

## Who fights

`ROLE_FIGHTS` in `party.js` is `PM_DEFAULT`. It is not an Owner answer.

| Status | Role | Joins the party |
|---|---|---|
| `domesticated` | `pet`, `mount`, `livestock`, `work` | Yes |
| `captive` | any, including a role already chosen | No |
| `wild` | none | No |
| `dead` | any | No |

A humanoid, a colonist, or a creature whose SRD type is humanoid does not join. One role per animal is unchanged from WG.00.38.

**OQ-BG-01.** Should any domesticated role stay out of party combat? DEC-033 item 3 names no excluded role. This lane does not decide it.

**OQ-BG-02.** Care does not heal, so a creature captured at 0 HP is still stored at 0 HP when it becomes domesticated. A living tamed creature (no `data.dead` and no `data._isDying`) whose stored hp is 0, missing, or above the SRD average enters combat at that average. A stored hp from 1 through the average is kept as wounds. Should that 0 stay 0 until something heals the creature?

These WG.00.38 questions stay open. This lane does not answer them: OQ-AX-01 through OQ-AX-08. OQ-AX-04 (one role or two) and OQ-AX-06 (whether the saddle marker is only for mounts) are the ones that touch this fight.

## What the creature does in the fight

`enlist` adds each joiner to the encounter on side `player`. Enemies treat it as a party combatant: nearest-enemy selection can pick it, and a player combatant does not. It rolls initiative with `UF.Rules.initiative` and acts in the six-second round with the other units. With no other order it follows the party. The anchor is the taming record's owner when that unit is in the fight, otherwise the nearest living player unit that is not itself a tamed creature.

Hit points, Armor Class, ability scores, printed saves, and the attack's to-hit and damage expression come from the SRD 5.1 stat block `UF.Rules.creatureOf` already maps through `species_map`. Walk speed, size, and the Multiattack sentence are read from that same catalogue entry (`game/data/srd51/creatures.json`), because the rules object does not publish them. No combat number is invented. A wolf is Armor Class 13, 11 hit points, speed 40 feet, and a bite at +4 for `2d4+2`. A troll's action is bite, claw, claw.

The legacy tick in `DEUS_Combat` marks the same creature friendly, gives it the primary natural attack, and strips gear before `UF.Rules.attack`. That tick still swings once per attack. The real-time action uses the whole multiattack.

## No gear

A creature combatant has `equipmentSlots: []`. `equip` and `equipCreature` return `NO_CREATURE_GEAR`. The body passed to `UF.Rules` has no equipment, no ability-score override, no `naturalArmor`, and no saddle stats. Plate on `data.equipment` and a saddle mark whose `stats` were written in afterwards do not change Armor Class, to-hit, damage dice, hit points, or speed. The stored saddle is still `{ id: "riding_saddle", visual: true, slot: null, stats: null }` on the combat profile. `markSaddle` is unchanged.

## Death at 0 HP

A tamed creature is not a player character. At 0 HP the existing creature path applies: it dies. It does not make death saving throws, and it does not become unconscious for capture. `noteDeath` sets the taming record to `status: "dead"`, `dead: true`, and `death.knockout: false`, and sets `data.dead` and `data._isDying` on the world unit. `census` counts that creature as `dead`, not as domestic and not as wild. A creature that is already `data.dead` is refused at enlist and the record is updated the same way.

**PROPOSED-AX-01** (a combat choice to knock a creature out at 0 HP instead of killing it) is not implemented. Capture still accepts a living target at 0 HP that is not flagged dead.

## Orders

`ORDERS` is `follow`, `attack`, `hold`. The order is stored on the combat unit and on the taming record.

| Call | Result |
|---|---|
| `setOrder(id, { type: "follow" })` | Stay with the party. If an enemy is within natural reach on the same layer, attack that enemy. Otherwise spend walk speed moving toward the anchor, and stop adjacent. |
| `setOrder(id, { type: "attack", targetId })` | Attack that unit. Close with walk speed when it is out of reach. Missing `targetId` returns `NO_TARGET`. A dead or unknown target holds. |
| `setOrder(id, { type: "hold" })` | Do not move and do not attack. |
| `issueOrder(unit, order)` | The same write without an encounter. A bad type returns `BAD_ORDER`. |
| `enlist(engine, rules, units)` / `engine.enlistTamed(units)` / `UF.Taming.enlist(engine, units)` / `UF.CombatRT.enlistTamed(units)` | Add the joiners. Refused units come back with a reason. |
| `combatProfile(rules, unit)` | The stat block the fight will use: hp, ac, speed, abilities, saves, attacks, sequence, empty slots, saddle with null stats. |
| `membership(rules, unit)` / `joinsParty(unit)` | Whether this record fights. `joinsParty` does not need the rules object. |
| `noteDeath(unit, info)` | The 0 HP record update. `knockout` is false. |
| `UF.CombatRT.setOrder(id, order)` and command type `creature-order` | The encounter order. |

`peekAction` reports the persistent order. A queued `follow`, `attack`, or `hold` becomes the persistent order and is not a one-shot.

On the legacy tick, `hold` clears the combat target and does not seek. `attack` sets that target. `follow` seeks the nearest hostile, which is coarser than the real-time anchor.

## Tests

`node tools/taming_party/test_tamed_party_combat.js`

| Check | What it locks | Provocation |
|---|---|---|
| `membership` | All four domesticated roles join. A captive with a role, a wild wolf, and a humanoid do not. The wolf is side `player`, is targeted by an enemy, is not targeted by the handler, and acts in the round. | `--provoke=membership` drops the domesticated requirement. |
| `srd` | Wolf and troll numbers match the stat block. A stored wound is kept. Aboleth's printed Wisdom save is used. Initiative uses the stat block's Dexterity. The troll's action is three natural swings. | `--provoke=srd` replaces the SRD average with 99. |
| `gear_bonus` | Plate, a longsword, `naturalArmor`, and a saddle `acBonus` / `attackBonus` do not change AC, to-hit, dice, hp, or speed. Slots stay empty. | `--provoke=gear_bonus` copies the equipment onto the rules body and adds the saddle bonuses. |
| `death` | 0 HP kills the creature, updates the record, and moves the census from domestic to dead. `knockout` stays false. | `--provoke=death` leaves the record domesticated. |
| `orders` | Follow closes on the owner. Hold does not swing. Attack hits the named target. | `--provoke=orders` turns follow into hold. |

A plain run prints `PASS` for each check and `PASS provocation <name> is caught` for each mutant. `--provoke=<name>` and `--provoke-all` print `FAIL` for the broken check and `CAUGHT` when that failure happened. Exit 0 means the plain run passed, or every requested provocation was caught. Exit 1 means a check failed or a provocation did not fail its check.

`node tools/taming/test_taming.js`, `node tools/combat_rt/test_combat_rt.js`, `node tools/test_srd_combat_proof.js`, `node tools/sim/test_wildlife_rules_damage.js`, and `node tools/check_deus_syntax.js` stay as they are.

## Follow-ups

- **PROPOSED-BG-01.** Walk speed is the only speed used for steps. Fly, swim, climb, and hover are on the stat block and are not movement here. A wraith's walk is 0.
- **PROPOSED-BG-02.** Traits such as Pack Tactics, a troll's regeneration, and "dies only if it starts its turn at 0 HP and does not regenerate" are not applied. 0 HP is death.
- **PROPOSED-BG-03.** A Multiattack sentence with "or" uses the text before the first "or". A sentence that does not name the attacks, and names more than one weapon action, does not invent a sequence; the creature uses its first non-recharge attack once.
- **PROPOSED-BG-04.** The legacy tick swings once per attack. Only the real-time action runs the full multiattack.
- **PROPOSED-BG-05.** A natural attack's prone, grapple, or poison rider is still the rules-module gap. This fight does not add the condition.
- **PROPOSED-AX-01.** Knock-out instead of death at 0 HP. Not implemented.

`game/js/plugins.js` is not edited. `DEUS_Taming` and `DEUS_CombatRT` already exist; the new calls are on those objects.
