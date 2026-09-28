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

Hit points, Armor Class, ability scores, saves, and the attack's to-hit and damage expression come from the SRD 5.1 stat block `UF.Rules.creatureOf` already maps through `species_map`. Walk speed, size, traits, and the Multiattack sentence are read from that same catalogue entry (`game/data/srd51/creatures.json`), because the rules object does not publish them. No combat number is invented. A wolf is Armor Class 13, 11 hit points, speed 40 feet, and a bite at +4 for `2d4+2`. A troll's action is bite, claw, claw. A shambling mound's action is two slams. A spell save against a tamed creature uses `rulesBody`, so an unprinted Wisdom save uses the stat block's Wisdom and a printed save uses the printed bonus.

A stat-block action is a natural attack only when it is not an SRD weapon, not a spell attack, and not a ranged weapon attack such as a thrown rock. A hill giant's greatclub and rock are not used. Empty equipment does not make those attacks natural. Pack Tactics grants advantage when an ally who is not incapacitated is within the trait's distance of the target. Regeneration restores the hit points named in the trait at the start of the creature's turn. Acid or fire damage, when the trait says so, suppresses the next turn's regeneration. A creature dies at 0 HP unless its stat block says it dies only if it starts its turn at 0 HP and does not regenerate.

The legacy tick in `DEUS_Combat` marks the same creature friendly, gives it the natural attack, and never reads creature equipment for timing or weapon choice. That tick and the real-time action both run the full natural multiattack.

## No gear

A creature combatant has `equipmentSlots: []`. `equip` and `equipCreature` return `NO_CREATURE_GEAR`. The body passed to `UF.Rules` has no equipment, no ability-score override, no `naturalArmor`, and no saddle stats. Plate on `data.equipment` and a saddle mark whose `stats` were written in afterwards do not change Armor Class, to-hit, damage dice, hit points, speed, or the legacy swing's speed and weapon name. The stored saddle is still `{ id: "riding_saddle", visual: true, slot: null, stats: null }` on the combat profile. `markSaddle` is unchanged.

## Death at 0 HP

A tamed creature is not a player character. At 0 HP the existing creature path applies: it dies, unless its stat block says it dies only when it starts a turn at 0 HP and does not regenerate. It does not make death saving throws, and it does not become unconscious for capture. `noteDeath` sets the taming record to `status: "dead"`, `dead: true`, and `death.knockout: false`, and sets `data.dead` and `data._isDying` on the world unit. `census` counts that creature as `dead`, not as domestic and not as wild. A creature that is already `data.dead` is refused at enlist and the record is updated the same way. A troll reduced to 0 HP by damage other than the trait's suppressing types is still domesticated until its next turn, and that turn restores the regeneration amount. Fire or acid, for the troll's trait, suppresses that restoration and the troll then dies.

**PROPOSED-AX-01** (a combat choice to knock a creature out at 0 HP instead of killing it) is not implemented. Capture still accepts a living target at 0 HP that is not flagged dead.

## Orders

`ORDERS` is `follow`, `attack`, `hold`. The taming record is the order both the encounter and the world read. A numeric `targetId` stays a number, so a legacy world unit id still matches.

| Call | Result |
|---|---|
| `setOrder(id, { type: "follow" })` | Stay with the party. If an enemy is within natural reach on the same layer, attack that enemy. Otherwise spend walk speed moving toward the anchor, and stop adjacent. |
| `setOrder(id, { type: "attack", targetId })` | Attack that unit. Close with walk speed when it is out of reach. Missing `targetId` returns `NO_TARGET`. A dead or unknown target holds. |
| `setOrder(id, { type: "hold" })` | Do not move and do not attack. |
| `issueOrder(unit, order)` | The same write without an encounter. A bad type returns `BAD_ORDER`. |
| `enlist(engine, rules, units)` / `engine.enlistTamed(units)` / `UF.Taming.enlist(engine, units)` / `UF.CombatRT.enlistTamed(units)` | Add the joiners. Refused units come back with a reason. |
| `combatProfile(rules, unit)` | The stat block the fight will use: hp, ac, speed, abilities, saves, attacks, sequence, empty slots, saddle with null stats. |
| `membership(rules, unit)` / `joinsParty(unit)` | Whether this record fights. `joinsParty` does not need the rules object. |
| `noteDeath(unit, info)` | The 0 HP record update. `knockout` is false. A regeneration death exception delays this until the turn that does not regenerate. |
| `beginTurn(unit, rules)` | Start of the creature's turn. Applies regeneration or the death exception. |
| `defersDeath(unit, rules)` | True when the stat block says 0 HP is not death until a turn starts without regeneration. |
| `packAdvantage(rules, actor, target, units)` | True when Pack Tactics applies. |
| `UF.CombatRT.setOrder(id, order)` and command type `creature-order` | The encounter order, written through the same record. |

`peekAction` reports the persistent order from the taming record. A queued `follow`, `attack`, or `hold` becomes that record and is not a one-shot. `issueOrder` on the world unit is visible to an encounter that is already running.

On the legacy tick, `hold` clears the combat target and does not seek. `attack` keeps the caller's target id and swings. `follow` moves toward the owner with `sendUnit` and stops adjacent. An enemy already within one square is attacked instead. While `DEUS_Combat` can load the real-time engine, each active map frame drives that encounter for domesticated creatures, copies their position and hit points back onto the world unit, and the legacy tick does not swing those same units again. `UF.Combat.tamedEncounter = false` leaves only the legacy tick. That switch is how the headless plugin test separates the two paths.

## Tests

`node tools/taming_party/test_tamed_party_combat.js`

| Check | What it locks | Provocation |
|---|---|---|
| `membership` | All four domesticated roles join. A captive with a role, a wild wolf, and a humanoid do not. The wolf is side `player`, is targeted by an enemy, is not targeted by the handler, and acts in the round. | `--provoke=membership` drops the domesticated requirement. |
| `srd` | Wolf and troll numbers match the stat block. A stored wound is kept. Aboleth's printed Wisdom save is used. Initiative uses the stat block's Dexterity. The troll's action is three natural swings. | `--provoke=srd` replaces the SRD average with 99. |
| `gear_bonus` | Plate, a longsword, `naturalArmor`, and a saddle `acBonus` / `attackBonus` do not change AC, to-hit, dice, hp, or speed. Slots stay empty. | `--provoke=gear_bonus` copies the equipment onto the rules body and adds the saddle bonuses. |
| `death` | 0 HP kills a creature with no death exception, updates the record, and moves the census from domestic to dead. `knockout` stays false. | `--provoke=death` leaves the record domesticated. |
| `orders` | Follow closes on the owner. Hold does not swing. Attack hits the named target. | `--provoke=orders` turns follow into hold. |
| `natural` | A hill giant's greatclub and rock are not attacks. Worn equipment does not change that profile. | `--provoke=natural` copies every to-hit action, including manufactured weapons. |
| `saves` | A wolf's unprinted Wisdom save in the encounter spell path uses Wisdom 12. Roll 10 against DC 11 succeeds and deals no damage. | `--provoke=saves` passes the raw encounter unit, whose scores are 10. |
| `target_id` | `issueOrder(..., { targetId: 9 })` keeps the number 9. The legacy tick finds that world unit and deals damage. | `--provoke=target_id` stringifies the id. |
| `legacy_lookup` | The same numeric id is looked up with `byId.get` and the hostile loses hit points. | `--provoke=legacy_lookup` looks the id up as a string. |
| `order_sync` | `issueOrder(worldUnit, { type: "hold" })` after enlist makes `peekAction` return hold. | `--provoke=order_sync` ignores the taming record. |
| `world_sync` | Follow moves the encounter and the world unit to the same square, adjacent to the owner. | `--provoke=world_sync` stops copying the step onto the world unit. |
| `slams` | The bog horror's "two slam attacks" is the sequence slam, slam, and the encounter swings twice. | `--provoke=slams` stops recognizing `makes two slam attacks`. |
| `pack` | A second wolf within 5 feet of the target gives the attacker advantage on the swing record. | `--provoke=pack` forces that advantage off. |
| `regen` | A troll stored at 74 HP is at 84 after its turn. | `--provoke=regen` sets the restored amount to 0. |
| `death_rule` | Slashing damage to 0 HP leaves the troll alive, and the next turn restores 10. Fire damage to 0 HP kills it on the next turn. `knockout` stays false. | `--provoke=death_rule` treats 0 HP as immediate death. |
| `legacy_gear` | A tamed hill giant's legacy attack description stays fists at speed 4 when `mainHand` is a long sword. | `--provoke=legacy_gear` lets `mainHand` select the weapon. |
| `legacy_follow` | With the encounter driver off, one legacy tick moves the wolf adjacent to the owner. | `--provoke=legacy_follow` skips that follow step. |
| `runtime` | Map updates on the registered `DEUS_Combat` plugin enlist the wolf, move the world unit with the encounter, and `resolveAttack` on a bog horror records two slams. | `--provoke=runtime` does not drive the encounter. |

A plain run prints `PASS` for each check and `PASS provocation <name> is caught` for each mutant. `--provoke=<name>` and `--provoke-all` print `FAIL` for the broken check and `CAUGHT` when that failure happened. Exit 0 means the plain run passed, or every requested provocation was caught. Exit 1 means a check failed or a provocation did not fail its check.

`node tools/taming/test_taming.js`, `node tools/combat_rt/test_combat_rt.js`, `node tools/test_srd_combat_proof.js`, `node tools/sim/test_wildlife_rules_damage.js`, and `node tools/check_deus_syntax.js` stay as they are.

## Follow-ups

- **PROPOSED-BG-01.** Walk speed is the only speed used for steps. Fly, swim, climb, and hover are on the stat block and are not movement here. A wraith's walk is 0.
- **PROPOSED-BG-02.** Pack Tactics, regeneration, and the regeneration death exception are applied from the trait text. Lightning Absorption, Magic Resistance, and skill traits such as Keen Smell are not applied.
- **PROPOSED-BG-03.** A Multiattack sentence with "or" uses the text before the first "or". A sentence that does not name the attacks, and names more than one natural action, does not invent a sequence. A count of dice, such as `1d4` Rotting Touch attacks, or "as many bite attacks as it has heads", is not turned into a number.
- **PROPOSED-BG-05.** A natural attack's prone, grapple, or poison rider is still the rules-module gap. This fight does not add the condition.
- **PROPOSED-AX-01.** Knock-out instead of death at 0 HP. Not implemented.

`game/js/plugins.js` is not edited. `DEUS_Combat` is already registered and drives the encounter. `DEUS_Taming` and `DEUS_CombatRT` are not in that file. The registration request is `tasks/WG.00.39/lane-bg/escalation.md`. The headless runtime check loads `DEUS_Combat.js` and runs `Game_Map.update`. It does not claim an editor playtest or a screenshot.
