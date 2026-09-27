# DEUS person identity

A person's craft, civic office and class are three independent fields. Each one may be `NONE`. Changing one does not change the other two (INV-SOC-01). Current duty is not one of the fields. It stays the colonist's job (INV-SOC-02).

The record is `unit.data.identity`. The shape is `game/data/society/person_identity.schema.json`. The pure module is `game/js/sim/society/identity.js`. It does not read the host, the clock, the disk or a random source. `DEUS_Colonists.js` is the only plugin that writes the record.

## Record

| Field | Values |
|---|---|
| `schema` | `1` |
| `craft` | `NONE` or a craft token from the person spec |
| `civicOffice` | `NONE` or a canonical office token from the person spec |
| `class.id` | `NONE` or a 2014 SRD 5.1 class id `srd:class:*` |
| `class.level` | `null` when the id is `NONE`. An integer `1..20` otherwise |

There is no duty field. `create` and `validate` reject any other key.

Class ids are the twelve `kind: "class"` rows in `game/data/srd51/character_options.json`: barbarian, bard, cleric, druid, fighter, monk, paladin, ranger, rogue, sorcerer, warlock, wizard. A short id (`fighter`, `Fighter`) is accepted on input and stored as `srd:class:fighter`. A string id with no level is stored at level 1, which is the only level `DEUS_Dnd5e.assignClass` writes today. A stored level outside `1..20` is not clamped. That class is left `NONE` on derivation, and `changeAxis` rejects it.

## How a missing record is filled

`loadUnitData` keeps a record that already validates. It does not re-derive from callings or from `data.dnd`. An old save with no `identity`, or a record that does not validate, is filled by `defaultsFrom`. The same input returns the same record.

Craft, in order:

1. The primary calling (`data.calling`, otherwise `data.callings[0]`), when the table below maps it.
2. Otherwise a string `data.job`, when that same table or a craft token maps it. A job object is not a profession string and is ignored.
3. Otherwise `NONE`.

`currentDuty`, `duty`, and the live job are not read.

<!-- calling-craft-map -->
| Calling or profession token | Craft |
|---|---|
| `farmer` | `FARMER` |
| `farmhand` | `FARMER` |
| `carpenter` | `CARPENTER` |
| `blacksmith` | `BLACKSMITH` |
| `mason` | `MASON` |
| `lumberjack` | `LOGGER` |
| `miller` | `MILLER` |
| `fisherman` | `FISHER` |
| `herbalist` | `HERBALIST` |
| `butcher` | `BUTCHER` |
| `hunter` | `HUNTER` |
| `potter` | `POTTER` |
| `tanner` | `TANNER` |
| `leatherworker` | `LEATHERWORKER` |
| `weaver` | `WEAVER` |
| `chef` | `COOK` |
| `spinner` | `SPINNER` |
| `brewer` | `BREWER` |
| `miner` | `MINER` |
| `fletcher` | `FLETCHER` |
| `weaponsmith` | `WEAPONSMITH` |
| `armorsmith` | `ARMORER` |
| `glasswright` | `GLASSWORKER` |
| `jeweler` | `JEWELER` |
| `alchemist` | `ALCHEMIST` |
| `merchant` | `MERCHANT` |
<!-- /calling-craft-map -->

Civic office is `NONE` unless `data.civicOffice` is already one of the canonical tokens below. Rank, title and calling are not copied onto this axis.

`EXECUTIVE`, `LEADER`, `STEWARD`, `ADMIN`, `TREASURER`, `MINT_MASTER`, `MARSHAL`, `QUARTERMASTER`, `MASTER_OF_WORKS`, `PROVISIONER`, `RECORDER`, `MAGISTRATE`, `HEALER_DIRECTOR`, `ENVOY`, `TRADE_MASTER`.

Class is copied from `data.dnd.id` and `data.dnd.level` when that id is one of the twelve SRD classes. If there is no `data.dnd` object, `data.dndClass`, then `data.class`, then `data.className` are tried, in that order. A calling whose name is also a class (`cleric`, `fighter`, `wizard`) does not set the class axis.

## Save and load

The world save stores `unit.data` inside `ufWorld`. A valid `identity` therefore round-trips with the unit. On `DataManager.extractSaveContents`, colonists migrate every `colonist`, `person` and founder: a valid record is kept, and a missing or invalid one is filled as above. The same fill runs when a colony is set up, when a child is born (after callings are assigned), when an immigrant is converted, and when a settlement actor is adopted.

A Year-0 New Game materializes the demographic ledger. Each of those people is `kind` `colonist` or `person`, with `historicalFounder: true` and `data.founder: false` (`founder` is the legacy pairing flag). The migration pass still writes an identity because of the kind. Craft follows the primary calling History sampled. Class follows `data.dnd` when that assignment ran. Civic office stays `NONE`.

`assignFounderQuotas` is a different path, used when units are flagged `data.founder`. Its primaries are mayor, carpenter, lumberjack, miner, laborer, chef, herbalist and blacksmith. Mayor and laborer have no row in the table, so those two crafts are `NONE`. The other six use the table. The demographic New Game does not take that branch.

## API

| Call | Result |
|---|---|
| `create(partial)` | A new record. Omitted axes are `NONE`. Unknown keys throw `E_IDENTITY`. |
| `validate(record)` | `{ ok, errors }`. It does not throw. |
| `changeAxis(record, axis, value)` | A new record with that one axis replaced. `axis` is `craft`, `civicOffice` or `class`. The input is not mutated. |
| `serialize(record)` | Canonical JSON of the four fields. |
| `deserialize(text)` | The record, or `E_IDENTITY` when the JSON does not validate. |
| `defaultsFrom(source)` | A derived record. Ignores duty. |
| `loadUnitData(data)` | The saved record when it validates, otherwise `defaultsFrom(data)`. |

`DEUS_Colonists.ensureIdentity(unit)` and `DEUS_Colonists.migrateIdentities(state)` are the plugin wrappers.

## Open Owner questions

These are not decided here.

1. `EXECUTIVE` / `LEADER` and `STEWARD` / `ADMIN` are both written in the person spec. The schema stores both tokens. It does not decide whether each pair is one office or two.
2. The founder illustration says `HEALER`. The office table says `HEALER_DIRECTOR`. Neither is inferred. Are they the same id?
3. A founder illustration wears two offices (`TREASURER` and `MINT_MASTER`). This record holds one `civicOffice`. Which hat is the axis, or is the field a list?
4. Is command rank 1 (V52) the civic office `LEADER`? Rank is not copied. Cultural titles (`Chief`, `Warden`, `Speaker`, `Reeve`) are not copied either.
5. Callings left at craft `NONE` because the craft they imply is not one token: `laborer`, `shepherd`, `stonecutter`, `construction_worker`, `engineer`, `road_builder`, `physician`, `medic`, `surgeon`, `veterinarian`, `dresser`, `shopkeeper`, `broker`, `scholar`, `sage`, `bookkeeper`, `beekeeper`, `cheesewright`, `stone_carver`, `paperwright`, `engraver`.
6. Callings left off the office axis: `mayor`, `sheriff`, `ambassador`, `manager`, and the noble and military callings (`lord`, `baron`, `count`, `duke`, `captain`, `knight`, `private`, `sergeant`, `commander`, `general`).
7. A calling that shares a name with an SRD class (`cleric`, `druid`, `fighter`, `wizard`, and the rest) is not copied onto `class`. Class comes only from `data.dnd` or an explicit class field.
8. CLASSES.md D2 says nobody holds a class at a New Game. The society spec's founder examples each name a class. Spawn already writes `data.dnd` through `assignClass`. This package copies that id when it is present and otherwise writes `NONE`. It does not choose which of the two documents governs Year 0.
9. When a primary calling and a string `job` both map and disagree, the calling wins. Is that the rule?

## Follow-ups

These are not WBS ids.

- PROPOSED-BA-01. Class progression (the SRD class package) should write this axis through `changeAxis` and should not edit `craft` or `civicOffice`.
- PROPOSED-BA-02. The craft catalogue package should replace this closed token list once the Owner accepts that catalogue. Unmapped callings in question 5 wait on that list.
- PROPOSED-BA-03. The office entity package owns jurisdiction and vacancy. `civicOffice` should then name an office id. This package does not create offices.
- PROPOSED-BA-04. The eight-founder office bootstrap assigns the multi-hat offices. This package does not.
- PROPOSED-BA-05. The duty scheduler must not write `unit.data.identity`.
- PROPOSED-BA-06. Military service status is a separate administrative field. It is not stored here.
- PROPOSED-BA-07. The colonist sheet can show the three axes. `describe` was left unchanged.
