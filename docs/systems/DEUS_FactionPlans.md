# DEUS Faction Development Plans

**Document ID:** `DEUS-FACTION-PLAN-01`
**Task:** SOC.10.02 (lane-az)
**Status:** Submitted for independent review. This lane does not mark the task done.
**Schema:** `deus-faction-plan/1.0.0`
**Authority:** DEC-015, VISION V141, DEC-013 (band identities and soft home boundaries), `docs/society/DEUS_SOCIETY_WBS.md` rows SOC.10.01–SOC.10.03, `docs/design/AUTONOMOUS_CIVILIZATION.md`, `docs/art/DEUS_RACIAL_BUILDING_BIBLE_TEMPLATE.md`, `docs/design/TECH_TREE.md` (read as an unbuilt proposal), INV-SOC-01, INV-SOC-02, INV-SOC-03.

No art and no audio are specified here (DEC-007). The racial building bible's generation-prompt section is not a field in this schema.

## 1. What a plan is

Each of the nine races will have one Faction Development Plan: structured data for how a settlement grows from a founding camp to a capital. Autonomous civilization logic and deep-history generation consume the data. This task ships the shape of that data, one structural template, and a validator. SOC.10.03 authors the nine race files. Nothing in this task places a building, assigns a person, or runs a settlement.

A plan is one JSON document validated by `game/data/plans/faction_plan.schema.json` and by the cross-record rules in `tools/plans/validate_faction_plan.js`. The schema is JSON Schema draft 2020-12. The validator implements the keywords it accepts and rejects any other keyword, so a typo cannot silently drop a constraint. Sums, order, and id references are rules beside the schema, because draft 2020-12 does not express them with the keywords this checker implements.

`schemaVersion` is `deus-faction-plan/1.0.0`. A breaking change to the document shape bumps that string.

## 2. Files

| Path | Role |
|---|---|
| `docs/systems/DEUS_FactionPlans.md` | This spec. |
| `game/data/plans/faction_plan.schema.json` | Closed document shape and the closed id sets. |
| `game/data/plans/TEMPLATE.plan.json` | One complete structural plan. Cultural strings are `OWNER_TODO`. |
| `tools/plans/validate_faction_plan.js` | Dependency-free CLI. Exit 0 when the file is valid. Exit 1 on errors. Exit 2 when the usage line is printed. |
| `tools/plans/test_faction_plan_schema.js` | The template must pass. Each fixture under `tools/plans/fixtures/` must fail, and must pass once its named rule is turned off. |
| `tools/plans/fixtures/*.json` | One mutation each, applied to the template in memory. |

```
node tools/plans/test_faction_plan_schema.js
node tools/plans/validate_faction_plan.js game/data/plans/TEMPLATE.plan.json
```

An error line is `ERROR <code> <json-pointer> - <message>`.

## 3. Document

| Field | Meaning |
|---|---|
| `documentRole` | `template` or `racePlan`. |
| `planId` | `TEMPLATE` on the template. A race plan uses a different id. |
| `raceId`, `displayName`, `lore`, `values` | Owner cultural text. On the template, each is the sentinel `OWNER_TODO`. |
| `architecture` | Link to the building-bible template, the home-layer band, and the cultural style slots. |
| `buildings` | Functional building catalogue. Each row has an id and the build-order target it serves. |
| `knowledge` | Craft and construction unlock graph. |
| `stages` | The six settlement stages, in order. |
| `expansion` | Where a new settlement may be planted. |
| `failure` | Regression and collapse. |

Race-plan cultural strings may stay `OWNER_TODO` until the Owner writes them. The template is not allowed to carry any other cultural text. The validator's rule `template-cultural-filled` enforces that. A race id string is not an enum in this schema: DEC-013 fixes the count at nine, and the id strings belong to SOC.10.03. See the open questions.

## 4. Settlement stages

The only stage ids, in this order, are `camp`, `hamlet`, `village`, `town`, `city`, `capital`. The schema enum order is that sequence. The template lists them in that sequence. A later stage's buildings, institutions, and knowledge prerequisites are a superset of the previous stage's, and a repeated building's `minCount` does not fall.

A settlement is in a stage when its population is at least `populationMin` and it meets that stage's buildings, roles, institutions, and knowledge prerequisites. Population crossing a number does not by itself create an office. INV-SOC-04: offices split when workload exceeds the hours allocated to them. The institution list is the checklist a classifier uses after that split has happened.

`populationMin` on the template:

| Stage | Minimum population | Why this baseline |
|---|---|---|
| camp | 8 | Year-0 eight founders (`docs/design/AUTONOMOUS_CIVILIZATION.md` world start; SOC.21.01's eight-founder coverage). |
| hamlet | 16 | First stage past the great-hall trigger at population above 12 (AUTONOMOUS_CIVILIZATION pillar 8). |
| village | 40 | Above the worked example of treasury overload around 35 people (`docs/society/DEUS_PERSON_AND_INSTITUTIONS.md` §7). |
| town | 120 | Engineering step. |
| city | 400 | Engineering step. |
| capital | 1200 | Engineering step. |

The last three numbers, and any race-specific replacement of the whole series, are an open question. The series is strictly increasing so the stages stay ordered.

### 4.1 Buildings

Building ids are functional. They are not cultural building names. Each catalogue row names one `priorityTarget`. Every priority target has at least one building. A stage lists the buildings required to be classified as that stage, each with `minCount` at least 1. The template uses `minCount` 1 throughout; a race plan may raise a count.

A knowledge node may unlock a building before the stage that requires it. `hearth` is unlocked with camp craft and first required at hamlet.

| Id | Priority target | First required |
|---|---|---|
| `campfire`, `shelter`, `stockpile`, `palisade`, `water_point` | shelter, shelter, storage, defense, water | camp |
| `hearth`, `food_plot`, `workshop`, `great_hall` | shelter, food, workshop, government | hamlet |
| `granary`, `infirmary` | storage, healing | village |
| `government_seat`, `temple`, `road_link`, `forge` | government, temple, road, workshop | town |
| `market`, `wall`, `gatehouse`, `archive` | market, defense, defense, government | city |
| `mint` | government | capital |

Camp includes a palisade and a water point because AUTONOMOUS_CIVILIZATION pillar 8 treats predators and distance from fresh water as conditions that can hold at the first camp. The great hall is a hamlet requirement because that stage is the first one past population 12.

### 4.2 Roles

A role is a minimum headcount on one SOC.10.01 axis: `{ "axis", "id", "minCount" }`. Axes are `craft`, `civicOffice`, and `class`. On one axis, the minimums must sum to at most `populationMin`, because one person holds one value of that axis. Minimums on different axes may describe the same people: a person has a craft and an office and a class at once (INV-SOC-01).

A craft role's id must already be unlocked by a knowledge node listed on that stage. A civic-office role's id must be one of that stage's institutions. The template's camp roles are one forager, one hunter, one cook, and the leader. Later stages add farmers, then construction and specialist crafts, then the offices that appear at that stage.

### 4.3 Institutions

An institution is an Office entity, not a person (INV-SOC-03). The id is the canonical function from `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md` §3, plus the subordinate offices that section names when workload splits a department: `TAX_COLLECTOR`, `PAYMASTER`, `CLERK`. `NONE` is a legal civic-office value on a person. It is not an institution.

Camp and hamlet require the eight founder functions named by SOC.21.01:

| WBS coverage | Institution id |
|---|---|
| Governance | `LEADER` |
| Treasury | `TREASURER` |
| Mint | `MINT_MASTER` |
| Defense | `MARSHAL` |
| Stores | `QUARTERMASTER` |
| Works | `MASTER_OF_WORKS` |
| Food | `PROVISIONER` |
| Records | `RECORDER` |

Village adds `STEWARD` and `HEALER_DIRECTOR`. Town adds `MAGISTRATE` and `ENVOY`. City adds `TRADE_MASTER`, `TAX_COLLECTOR`, and `PAYMASTER`. Capital adds `CLERK`. Those later ids are the classification checklist for a stage that already has the specialized office. The workload index, not the population figure, is what creates the office (INV-SOC-04). That runtime is PROPOSED-AZ-05.

The founder narrative in the person spec writes two offices on one person, and SOC.10.01 stores a single `civicOffice` field. This plan does not decide which reading wins. The template's camp civic mix is eight equal shares, one office each, which fits the singular field at a population of 8. See the open questions.

## 5. Unlock prerequisites

A prerequisite is `{ "kind", "id" }`.

| Kind | The id must name |
|---|---|
| `stage` | One of the six stage ids. |
| `knowledge` | A node in this plan's `knowledge` array. |
| `building` | A row in this plan's `buildings` catalogue. |
| `institution` | An institution id (not `NONE`). |

Camp has no stage prerequisite. Every later stage has exactly one, and it is the previous stage. The knowledge prerequisites on a stage are the full set required to be in that stage, not a delta. If a listed node itself requires other nodes, those nodes are listed on the same stage (`knowledge-closure`).

The template's knowledge counts, cumulative: camp 4, hamlet 8, village 11, town 20, city 28, capital 30.

## 6. Build-order priorities

Each stage has four orders: `peace`, `threat`, `famine`, `abundance`. Each order is a permutation of the closed target set:

`shelter`, `water`, `food`, `storage`, `defense`, `workshop`, `temple`, `government`, `road`, `healing`, `market`

The four orders on a stage are different from each other, so the plan actually adapts. The template also changes a posture's order as the stage advances (peace at camp starts at shelter; peace at capital starts at temple). The arrays in `TEMPLATE.plan.json` are the baseline. A race plan may replace them.

The future consumer walks the active order and builds the next unlocked, affordable building whose `priorityTarget` is that entry. A target whose buildings are not unlocked yet is skipped. This spec does not define which posture wins when two conditions hold at once. That choice is PROPOSED-AZ-01.

Threat puts `defense` first at every template stage. Famine puts `food` first. Abundance puts `workshop` first. Those are the template's baselines, visible in the file.

## 7. Occupation mix

`occupationMix` has four buckets. Three are the SOC.10.01 axes. The fourth, `obligation`, is administrative military service status. It is not an identity axis. Current Duty is operational state and is not stored on a plan (INV-SOC-02).

| Bucket | Closed set |
|---|---|
| `craft` | `NONE` and the 34 crafts in `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md` §2, in that section's family order. |
| `civicOffice` | `NONE` and the institution ids in §4.3. |
| `class` | `NONE` and the twelve 2014 SRD classes, in SRD book order: Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard. Ids are uppercase. |
| `obligation` | `NONE`, `RESERVE`, `MILITIA`, `GUARD`, `PROFESSIONAL`, `ELITE_RETINUE`. |

Each row is `{ "id", "perMyriad" }`. Within one bucket the ids are unique and the shares sum to 10000. A missing id is a zero share. `perMyriad` is an integer from 1 to 10000, so a zero share is written by omitting the row.

`NONE` is a member of `craft`, `civicOffice`, and `class`. The template uses `NONE` on `craft`, `class`, and `obligation` at every stage. Camp's civic bucket has no `NONE` row: the baseline is eight founders and eight offices. From hamlet on, `NONE` is the people who hold no office.

A positive craft share at a stage must be a craft that a knowledge node listed on that stage unlocks. The settlement's target demographic does not ask for a jeweler before jewel-work is known. Class and obligation are not gated by this knowledge graph. Class progression (levels 1–20) is SOC.11.01.

INV-SOC-07 rejects one military ratio hardcoded for every faction. These shares are per stage and per plan. A race plan replaces them. Mobilization changes Current Duty for a while (INV-SOC-08). It does not rewrite the stored mix. The duty scheduler is PROPOSED-AZ-04.

`ELITE_RETINUE` is in the person spec and in SOC.40.01. INV-SOC-07's parenthetical list stops at `PROFESSIONAL`. The schema includes the sixth status so a plan can say what the person spec already says. Whether the invariant text should gain that word is an open question. This lane does not edit the invariant registry.

The person spec says a `PROFESSIONAL`'s primary craft is soldiering. The craft catalogue has no `SOLDIER` id. This plan does not add one.

The template's shares are engineering baselines so the file validates. They are an open question for the Owner, together with the population figures.

## 8. Technology and knowledge paths

`knowledge[]` is the plan's craft and construction path. It is not the seven node names in `docs/design/TECH_TREE.md`. That document is an unbuilt design, and its node names are proposals. A later lane may map the two graphs. It must not merge them by renaming these ids (PROPOSED-AZ-07).

| | |
|---|---|
| `kind` | `construction` unlocks building ids. `craft` unlocks craft ids. |
| `prerequisites` | Other knowledge ids. The graph is acyclic. |
| `unlocks` | One or more ids of the node's own kind. |

Every catalogue building is unlocked by exactly one construction node. Every craft except `NONE` is unlocked by exactly one craft node. `NONE` is the absence of a craft, not an unlock.

Construction nodes, and the stage that first lists them:

| Node | First listed | Unlocks |
|---|---|---|
| `construct.camp` | camp | `campfire`, `shelter`, `stockpile`, `hearth` |
| `construct.defense` | camp | `palisade` |
| `construct.water` | camp | `water_point` |
| `construct.food` | hamlet | `food_plot` |
| `construct.workshop` | hamlet | `workshop` |
| `construct.hall` | hamlet | `great_hall` |
| `construct.storage` | village | `granary` |
| `construct.healing` | village | `infirmary` |
| `construct.civic` | town | `government_seat` |
| `construct.temple` | town | `temple` |
| `construct.road` | town | `road_link` |
| `construct.metalworks` | town | `forge` |
| `construct.market` | city | `market` |
| `construct.fort` | city | `wall`, `gatehouse` |
| `construct.records` | city | `archive` |
| `construct.mint` | capital | `mint` |

Craft nodes follow the same stage gates: `craft.survival` at camp (forager, hunter, cook); `craft.field` at hamlet (farmer, miller); `craft.wood` at village; stone, ore, smith, hide, and fiber at town; sustenance, learning, bow, kiln, and trade at city; `craft.fine` at capital (jeweler, glassworker, alchemist). Prerequisites are on the nodes in the template. A stage that lists a node also lists that node's prerequisites.

Faction Building level, personal skill gates, and the culture permission lists in TECH_TREE.md stay in that design. This plan's knowledge ids are the unlock list DEC-015 asks the development plan to carry.

## 9. Architectural style and the home-layer band

`architecture.bibleTemplate` is `docs/art/DEUS_RACIAL_BUILDING_BIBLE_TEMPLATE.md`. `architecture.bibleDocumentId` is `DEUS-ARCH-RACE-01`.

The cultural object fills bible sections 1–4 with Owner text. On the template every one of those strings is `OWNER_TODO`.

| Bible section | Plan fields |
|---|---|
| 1. Philosophy and silhouette | `guidingMetaphor`, `exteriorSilhouette`, `proportionRatio`, `colorKey` |
| 2. Material tiers | `tierMaterials.tier1`, `tier2`, `tier3` |
| 3. Structural components | `foundations`, `walls`, `openings`, `roofForm`, `supports` |
| 4. Interior grammar | `hearthPlacement`, `bedding`, `storagePhilosophy` |
| 5. Weathering | `universalWeathering`, fixed as `chipped`, `burned`, `ruined` |

Bible section 6 is a generation-prompt matrix. It has no field here (DEC-007).

`architecture.homeLayerBand` is the race's DEC-013 home-layer band. The legal band ids, in bottom-to-top order, are:

| Plan id | DEC-013 name |
|---|---|
| `lower-2` | Lower-2, deep caverns |
| `lower-1` | Lower-1, shallow underground |
| `surface` | Surface |
| `upper-1` | Upper-1, low sky / towers / canopy |
| `upper-2` | Upper-2, high sky / peaks / cloud realm |

The field is a string, not an enum. Three outcomes stay distinct:

| Value | Template | Race plan |
|---|---|---|
| `OWNER_TODO` | Required. | Allowed until the Owner assigns a band. |
| One of the five ids | Rejected (`template-band-assigned`). | Accepted. |
| Anything else | Rejected (`bad-band`). | Rejected (`bad-band`). |

The template therefore cannot answer which race lives on which band. DEC-013's numeric layer ends, and which biomes sit in which band, are open sub-questions. This schema stores no layer numbers and no biome ids. The decision text's PM default (−16..+15, with the five ranges written there) is recorded only as that open default.

DEC-013's home boundary is soft: people travel, trade, and fight on every layer. `expansion.hardBandLock` is `false`. `expansion.preferHomeBand` is `true`, which means a consumer prefers the assigned band when planting a settlement, and applies no band filter while the field is still `OWNER_TODO`.

WG.62.02's worldgen row names a different band table (different titles and different numeric ends). This plan follows the five DEC-013 names and stores neither numeric table. Which numbers a later worldgen lane should use is an open question.

## 10. Expansion

Distances are in cells. `distanceUnit` is `cell`. `cellFeet` is 5, from the decided DEC-013 geometry (one square is 5 ft). New-settlement distance and minimum separation are non-decreasing across the six stages.

Template baselines, in cells:

| Stage | Max distance | Min separation |
|---|---|---|
| camp | 0 | 0 |
| hamlet | 0 | 0 |
| village | 48 | 16 |
| town | 192 | 32 |
| city | 768 | 64 |
| capital | 3072 | 128 |

Camp and hamlet plant no new settlement. From village on, a new settlement may be founded within the distance, at least the separation away from an existing one. The distances are baselines and an open question.

`preferFreshWaterWithinCells` is 25 on the template, the cistern trigger in AUTONOMOUS_CIVILIZATION pillar 8 (a center more than 25 tiles from fresh water wants a water point). A race plan may use another integer. The schema allows 0 through 10000.

Founding terrain is a closed set of physical surfaces, not the 25 biomes (biome-to-band assignment is open):

| Id | Use on the template |
|---|---|
| `firm-ground`, `soft-ground`, `timber-stand`, `stone-exposure`, `cavern-floor`, `open-air` | Allowed founding surfaces at every stage. |
| `fresh-water` | Recognized. The template does not found a settlement on the water itself. |
| `steep` | Recognized. The template does not found on it. |

`open-air` means a walkable platform on a sky band, once the Owner has assigned that band. It is not a biome name. Mapping these classes onto world tiles is PROPOSED-AZ-08.

## 11. Failure

Regression steps one stage backward. Camp does not regress. Each other stage has one row whose `toStage` is the previous stage and whose `populationBelow` equals that stage's `populationMin`. The template uses `forDays` 30: the population has stayed under the stage's minimum for 30 settlement-days. One evaluation moves one stage. A capital that has fallen all the way to a camp does it by repeated steps.

Collapse is the end of the settlement. The template has three kinds, one row each:

| Id | Kind | Baseline |
|---|---|---|
| `collapse.food` | `food-stores` | Fewer than 1 day of food on hand, for 14 days. `treasurySatisfies` is false. |
| `collapse.population` | `population` | Fewer than 2 people, for 10 days. |
| `collapse.offices` | `vacant-institutions` | Every institution the current stage requires is vacant, for 60 days. |

INV-SOC-06: treasury coin is not food. A food collapse with `treasurySatisfies` true is invalid. A camp of 2 to 7 people is still a camp; the template does not collapse a settlement merely for being under the founding eight. The day counts are baselines. How long a settlement-day is in world beats is an open question. DEC-014's anti-snowball pressures (rebellion, epidemic, succession) are an open decision and are not encoded here.

## 12. Template and race plans

`game/data/plans/TEMPLATE.plan.json` is `documentRole: "template"` and `planId: "TEMPLATE"`. It is structurally complete: six stages, a full knowledge graph, expansion, and failure. Every Owner cultural string is `OWNER_TODO`, including `raceId`, `displayName`, `lore`, `values`, the bible style slots, and `homeLayerBand`.

A race plan (`documentRole: "racePlan"`) uses some other `planId`. SOC.10.03 fills nine of those files and leaves the cultural strings as `OWNER_TODO`. The Owner replaces the sentinel later. The validator accepts non-sentinel cultural text only on a race plan, so that replacement does not need a schema change.

## 13. Validator rules

`node tools/plans/validate_faction_plan.js <file>` loads `game/data/plans/faction_plan.schema.json` from the repository root relative to the script, then runs the rules below. `validatePlan(doc, { disable: ["ruleName"] })` turns one rule off. The test uses that to prove each fixture is killed by the rule it names.

| Rule | Code | What it rejects |
|---|---|---|
| schema walker | `schema` | Shape, types, enums, patterns, unexpected properties. |
| `stagesPresent` | `missing-stage` | A missing or duplicate stage id. |
| `stagesOrdered` | `stages-unordered` | The six ids out of order. |
| `stagePrerequisiteChain` | `stage-prerequisite-chain` | A stage that does not require the previous one. |
| `prerequisitesResolve` | `unknown-prerequisite` | A prerequisite id that is not in the plan or the closed set. |
| `populationMonotone` | `population-not-monotone` | A `populationMin` that does not rise. |
| `requirementsCumulative` | `requirements-not-cumulative` | A later stage that drops a building, institution, or resolved knowledge id. |
| `roleHeadcount` | `role-headcount` | Role minimums on one axis above `populationMin`. |
| `roleCraftUnlocked` | `role-not-unlocked` | A craft role before its knowledge node is listed. |
| `roleOfficeInstituted` | `role-office` | An office role that is not an institution of that stage. |
| `occupationMixSum` | `occupation-mix-sum` | Shares that do not sum to 10000, or a repeated id. |
| `mixCraftUnlocked` | `mix-craft-locked` | A craft share before its knowledge node is listed. |
| `officeMixMatches` | `office-mix` | Civic shares that are not exactly the stage's institutions, plus `NONE` if used. |
| `buildOrderPermutation` | `priority-not-permutation` | An order that is not a permutation of the eleven targets. |
| `posturesDiffer` | `build-order-not-adapted` | Two postures on one stage with the same order. |
| `unlockCoverage` | `unlock-coverage` | A building or craft unlocked by nobody, or by two nodes, or a kind mismatch. |
| `knowledgeAcyclic` | `knowledge-cycle` | A cycle in knowledge prerequisites. |
| `knowledgeClosure` | `knowledge-closure` | A listed node whose own prerequisites are not listed on that stage. |
| `stageBuildingsUnlocked` | `stage-buildings-unlocked` | A required building that is not in the catalogue or not unlocked by a listed node. |
| `priorityHasBuilding` | `priority-unbuilt` | A priority target with no catalogue building. |
| `bandId` | `bad-band` | A home-layer value that is neither `OWNER_TODO` nor a DEC-013 band id. |
| `templateBand` | `template-band-assigned` | A template that names a real band. |
| `templateCultural` | `template-cultural-filled` | A template cultural field other than `OWNER_TODO`. |
| `documentRole` | `document-role` | `planId` `TEMPLATE` on a race plan, or any other planId on the template. |
| `softHomeBand` | `soft-home-band` | `hardBandLock` true, or `preferHomeBand` false. |
| `expansionDistance` | `expansion-distance` | A missing stage row, or a distance or separation that falls. |
| `regressionAdjacent` | `regression-not-adjacent` | A regression that skips a stage, or a regression from camp. |
| `regressionThreshold` | `regression-threshold` | `populationBelow` different from that stage's `populationMin`. |
| `collapseFood` | `collapse-food` | A missing food collapse, or treasury allowed to stand in for food. |
| `collapseCoverage` | `collapse-coverage` | A missing population or vacant-institution collapse, or a duplicate kind. |

The fixtures cover the brief's required failures: a missing stage, an unknown prerequisite, a bad band, an occupation mix that does not sum, and a template cultural field filled with invented prose. Every other rule has a fixture of the same kind.

## 14. Invariants this data keeps

| Invariant | How the plan keeps it |
|---|---|
| INV-SOC-01 | Craft, civic office, and class are three distributions. A stage does not collapse a person into one job string. |
| INV-SOC-02 | Current Duty is absent. Obligation is service status, a separate bucket. |
| INV-SOC-03 | Institutions are office ids. The plan never names a holder. |
| INV-SOC-04 | The institution list classifies. It does not spawn an office at a population count. |
| INV-SOC-06 | Food collapse cannot be satisfied by the treasury. |
| INV-SOC-07 | Military shares are per stage and per plan. There is no single ratio in code. |
| INV-SOC-08 | The plan does not rewrite identity when a threat posture is active. Build order changes. The mix does not. |

## 15. Open Owner questions

This lane does not answer these.

1. Which race occupies which DEC-013 home-layer band? The template leaves `architecture.homeLayerBand` as `OWNER_TODO`.
2. Which of the 25 biomes sit in which band? (DEC-013 open sub-question.)
3. Are the numeric layer ends the PM default written in DEC-013 (−16..+15 and the five ranges there), or the different table in WG.62.02? This schema stores band ids only.
4. Are the template baselines the numbers you want: population 8 / 16 / 40 / 120 / 400 / 1200; colonization distances 0 / 0 / 48 / 192 / 768 / 3072 cells; separations 0 / 0 / 16 / 32 / 64 / 128 cells; regression at 30 days; food collapse at 14 days; population collapse below 2 for 10 days; vacant offices for 60 days; and the `perMyriad` shares in the template?
5. When threat and famine both hold, which build order applies? The plan stores four orders and does not rank them.
6. Can one person hold two Office entities? The person spec's founder example writes treasurer and mint master on one founder. SOC.10.01 stores one `civicOffice` field. The template's camp mix is one office each.
7. Should INV-SOC-07's list gain `ELITE_RETINUE`, which the person spec and SOC.40.01 already name? The schema includes it.
8. The person spec says a professional's craft is soldiering. The craft list has no `SOLDIER` id. Should one be added, and by whom?
9. How long is a plan's settlement-day in world beats?
10. DEC-014 (population budget and anti-snowball pressures) is open. This plan does not encode rebellion, epidemic, or succession.
11. TECH_TREE.md's node names are unapproved proposals. This plan uses its own knowledge ids.
12. Which id strings are the nine races for SOC.10.03? DEC-013 fixes the count. V87 names eleven peoples. This schema does not enum race ids.
13. Should a race plan be allowed to use the same build order for two postures? This schema requires the four orders on a stage to differ.

## 16. Follow-ups

These are proposals from this lane. They are not WBS ids. Where a WBS row already exists, the proposal points at that row.

| Id | Proposal |
|---|---|
| PROPOSED-AZ-01 | A runtime reads a plan and turns the active posture into build jobs. Design home: `docs/design/AUTONOMOUS_CIVILIZATION.md`. It also chooses which posture wins when two conditions hold. |
| PROPOSED-AZ-02 | Deep-history generation rolls a settlement forward under the plan (V141). |
| PROPOSED-AZ-03 | Nine race plan files, cultural strings left as `OWNER_TODO`. Existing row SOC.10.03. |
| PROPOSED-AZ-04 | The duty scheduler (existing row SOC.13.01) reads the mix. Mobilization changes Current Duty, not the stored shares. |
| PROPOSED-AZ-05 | Workload office split (existing rows SOC.22.01 and SOC.22.02) is what creates a subordinate office. The stage list only classifies. |
| PROPOSED-AZ-06 | After the Owner assigns bands, home-layer placement writes `architecture.homeLayerBand`. Existing row WG.62.02 is the worldgen side. |
| PROPOSED-AZ-07 | A faction Building tech runtime may map these knowledge ids. It does not rename them onto the TECH_TREE.md proposals. |
| PROPOSED-AZ-08 | Map the eight terrain classes onto world tiles. Biome-to-band assignment stays with the Owner. |
| PROPOSED-AZ-09 | The Owner writes the cultural strings and any per-race architectural bible. Bible section 6 stays out (DEC-007). |
| PROPOSED-AZ-10 | The person-record runtime for the three axes. Existing row SOC.10.01. |
| PROPOSED-AZ-11 | Define the settlement-day in world beats and drive the failure counters from that clock. |
