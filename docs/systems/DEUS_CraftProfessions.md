# DEUS Craft & Productive Profession System Specification

**Task:** SOC.12.01 (lane-bk)  
**Standard Authority:** `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md` §2, `docs/systems/DEUS_PersonIdentity.md`, `game/data/society/person_identity.schema.json`, `game/data/plans/TEMPLATE.plan.json`, `docs/systems/DEUS_FactionPlans.md`, 2014 SRD 5.1 (`game/data/srd51/equipment.json`, `game/data/srd5_1/tools.json`, `game/data/srd51/rules.json`).  
**Author:** Gemini (lane-bk writer)  
**Independent Reviewer:** Grok (lane-bk reviewer)  
**Art/Audio Policy:** Strictly zero art or audio generation, modification, or cataloguing (DEC-007).

---

## 1. Executive Summary & Architectural Invariants

This specification governs the economic craft and productive vocation layer for Project DEUS. Every colonist, citizen, or historical founder possesses an economic vocation that defines their productive capacity within the physical economy.

The craft system is bound by five core architectural invariants:

1. **Three Independent Identity Axes (INV-SOC-01):**  
   A person's economic **Craft**, societal **Civic Office**, and martial/adventuring **Class** are three strictly decoupled, independent axes. Modifying a person's craft does not mutate their civic office or combat class.
2. **Operational Duty Decoupling (INV-SOC-02):**  
   **Current Duty** represents transient operational assignment (e.g., hauling timber, sleeping, standing guard, manning a forge). It is not an identity axis. A blacksmith assigned to haul stones or fight fires remains a blacksmith by craft.
3. **Conserved Physical Materiality (INV-ECON-01):**  
   Crafting transforms authentic physical resources (ore, logs, grain, hides, ingots) into intermediate or finished goods using real workstations. Zero magic wealth creation; zero mass leakage for conserved metals and stones.
4. **Apprentice-to-Master Competence Progression:**  
   Vocation competence advances along a standardized 4-tier ladder (`APPRENTICE` $\rightarrow$ `JOURNEYMAN` $\rightarrow$ `ARTISAN` $\rightarrow$ `MASTER`) altering labor speed and quality ceiling, without requiring combat class levels.
5. **Canonical 2014 SRD 5.1 Grounding:**  
   Where applicable, craft vocations integrate 2014 SRD 5.1 tool proficiencies (`srd:tool:*`), the 5 gp/day crafting throughput standard, and 250-day downtime training baselines.

---

## 2. The Three-Axis Identity Architecture

A person's persistent identity is stored on `unit.data.identity` complying with `game/data/society/person_identity.schema.json`:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PERSON THREE-AXIS IDENTITY RECORD                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ Axis 1: Craft ]        [ Axis 2: Civic Office ]    [ Axis 3: Class ]     │
│  Vocation / Trade         Institutional Governance    Combat / 2014 SRD     │
│  (34 Crafts or NONE)      (15 Offices or NONE)        (12 Classes or NONE)  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ Operational State: Current Duty ]                                        │
│  Transient task dispatched by SOC.13 Central Duty Scheduler                 │
│  (Hauling, Sentry, Foraging, Crafting, Medical Care, Eating, Sleeping)      │
│  * NEVER OVERWRITES OR DERIVES IDENTITY AXES *                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Craft (Axis 1):** The permanent economic trade mastered by the person. Governs recipe execution, workstation eligibility, and quality tier access.
- **Civic Office (Axis 2):** Institutional role (e.g. `TREASURER`, `MARSHAL`, `MASTER_OF_WORKS`, `MINT_MASTER`). An officer may hold any craft or `NONE`.
- **Class (Axis 3):** Combat/adventuring archetype from the 2014 SRD (`srd:class:fighter`, `srd:class:wizard`, etc.) or `NONE`. Class levels (1..20) are decoupled from craft rank.
- **Current Duty:** The immediate physical labor or behavior assigned by the duty scheduler. Current duty reads craft to prioritize tasks, but never modifies the craft axis.

---

## 3. The 34 Canonical Crafts Catalogue

The 34 crafts form a closed set defined across six vocational families in `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md` §2 and validated in `game/data/society/craft_catalogue.json`:

### 3.1 Family 1: Extractive (7 Crafts)
Harvesters of unrefined raw materials from nature, bedrock, and wilderness flora/fauna.

| Craft ID | Display Name | Primary Workstation | Primary Resource Classes | Inputs | Outputs | SRD 5.1 Tool |
|---|---|---|---|---|---|---|
| `FARMER` | Farmer | `farm_plot` | `FOOD`, `FIBER` | `seeds` | `berries`, `fruit`, `root`, `straw`, `fiber` | *None (Agricultural)* |
| `MINER` | Miner | *(Field / Strata)* | `IRON`, `COPPER`, `GOLD`, `SILVER`, `PLATINUM`, `STONE` | `stone_pick` | `ore_iron`, `ore_copper`, `gold`, `stone`, `clay`, `sand`, `gem_rough` | *None (Miner's Pick)* |
| `LOGGER` | Logger | *(Field / Forest)* | `WOOD` | `stone_axe`, `axe_iron` | `log`, `firewood` | *None (Woodcutter's Axe)* |
| `QUARRYMAN` | Quarryman | *(Field / Boulders)* | `STONE` | `stone_pick`, `stone_axe` | `stone`, `sand` | `srd:tool:masons-tools` |
| `HUNTER` | Hunter | *(Field / Wilderness)* | `FOOD`, `FIBER` | `bow_short`, `bow_long`, `arrows`, `spear` | `meat_raw`, `hide`, `bone`, `feathers` | *None (Hunting Weapons)* |
| `FISHER` | Fisher | *(Field / Shoreline)* | `FOOD` | `fiber`, `stone_knife` | `fish` | *None (Fishing Tackle)* |
| `FORAGER` | Forager | *(Field / Wilderness)* | `FOOD`, `FIBER` | *(None)* | `berries`, `fruit`, `mushroom`, `root`, `fiber`, `stone` | *None (Foraging Basket)* |

### 3.2 Family 2: Pyrometallurgical & Smiths (4 Crafts)
Smelters of metallic ores and fabricators of tools, arms, armor, and structural hardware.

| Craft ID | Display Name | Primary Workstation | Primary Resource Classes | Inputs | Outputs | SRD 5.1 Tool |
|---|---|---|---|---|---|---|
| `SMELTER` | Smelter | `furnace` | `IRON`, `COPPER`, `STEEL` | `ore_iron`, `ore_copper`, `charcoal`, `firewood` | `bar_iron`, `bar_copper`, `charcoal` | `srd:tool:smiths-tools` |
| `BLACKSMITH` | Blacksmith | `smithy`, `furnace` | `IRON`, `COPPER`, `STEEL` | `bar_iron`, `bar_copper`, `charcoal`, `log` | `hardware_iron`, `axe_iron`, `spear`, `mace` | `srd:tool:smiths-tools` |
| `ARMORER` | Armorer | `smithy` | `IRON`, `STEEL` | `bar_iron`, `leather`, `log` | `helmet_iron`, `mail_iron`, `greaves_iron`, `shield_iron` | `srd:tool:smiths-tools` |
| `WEAPONSMITH` | Weaponsmith | `smithy` | `IRON`, `STEEL` | `bar_iron`, `leather`, `log` | `dagger_iron`, `sword_short`, `sword_long`, `spear` | `srd:tool:smiths-tools` |

### 3.3 Family 3: Construction & Woodcraft (4 Crafts)
Carpenters, masons, fine woodcarvers, and thatchers creating structures, furniture, and shelters.

| Craft ID | Display Name | Primary Workstation | Primary Resource Classes | Inputs | Outputs | SRD 5.1 Tool |
|---|---|---|---|---|---|---|
| `CARPENTER` | Carpenter | `workbench` | `WOOD` | `log`, `leather`, `fiber` | `plank_dressed`, `club`, `spear`, `shield_wood` | `srd:tool:carpenters-tools` |
| `MASON` | Mason | `mason_bench` | `STONE` | `stone`, `mortar_lime` | `stone_block`, `stone_knife`, `stone_axe`, `stone_pick` | `srd:tool:masons-tools` |
| `WOODCARVER` | Woodcarver | `workbench` | `WOOD` | `log`, `plank_dressed` | `club` | `srd:tool:woodcarvers-tools` |
| `THATCHER` | Thatcher | `workbench` | `FIBER`, `WOOD` | `straw`, `fiber`, `log` | `fiber_wrap` | *None (Thatcher's Tools)* |

### 3.4 Family 4: Organic & Textiles (5 Crafts)
Curators of leather, pelts, wool, and plant fibers for clothing, protective wraps, and containers.

| Craft ID | Display Name | Primary Workstation | Primary Resource Classes | Inputs | Outputs | SRD 5.1 Tool |
|---|---|---|---|---|---|---|
| `LEATHERWORKER` | Leatherworker | `workbench` | `FIBER` | `leather`, `fiber` | `sling`, `helmet_leather`, `armor_leather`, `leggings_leather`, `pouch` | `srd:tool:leatherworkers-tools` |
| `TANNER` | Tanner | `tanning_rack` | `FIBER` | `hide` | `leather` | `srd:tool:leatherworkers-tools` |
| `TAILOR` | Tailor | `workbench` | `FIBER` | `fiber`, `hide`, `leather` | `fiber_wrap`, `hide_cloak`, `common_clothes` | `srd:tool:weavers-tools` |
| `WEAVER` | Weaver | `workbench` | `FIBER` | `fiber`, `wool` | `fiber_wrap`, `common_clothes` | `srd:tool:weavers-tools` |
| `SPINNER` | Spinner | `workbench` | `FIBER` | `wool`, `fiber` | `fiber` | `srd:tool:weavers-tools` |

### 3.5 Family 5: Sustenance & Processing (5 Crafts)
Culinary and food-processing specialists preparing staple rations, roasted meats, flour, and beverages.

| Craft ID | Display Name | Primary Workstation | Primary Resource Classes | Inputs | Outputs | SRD 5.1 Tool |
|---|---|---|---|---|---|---|
| `COOK` | Cook | `kitchen_hearth`, `campfire` | `FOOD` | `meat_raw`, `fish`, `berries`, `root`, `firewood` | `meat_cooked`, `rations` | `srd:tool:cooks-utensils` |
| `BREWER` | Brewer | `kitchen_hearth` | `FOOD`, `WATER` | `berries`, `root`, `firewood` | `rations` | `srd:tool:brewers-supplies` |
| `MILLER` | Miller | `workbench` | `FOOD` | `root`, `seeds` | `rations` | *None (Millstones)* |
| `BUTCHER` | Butcher | `kitchen_counter`, `workbench` | `FOOD` | `meat_raw` | `meat_cooked`, `bone`, `hide` | `srd:tool:cooks-utensils` |
| `BAKER` | Baker | `kitchen_hearth` | `FOOD` | `root`, `berries`, `firewood` | `rations` | `srd:tool:cooks-utensils` |

### 3.6 Family 6: Artisan & Specialized (9 Crafts)
High-precision crafts covering ceramics, glassware, jewelry, armaments fletching/bowyery, herbalism, alchemy, letters, and commerce.

| Craft ID | Display Name | Primary Workstation | Primary Resource Classes | Inputs | Outputs | SRD 5.1 Tool |
|---|---|---|---|---|---|---|
| `POTTER` | Potter | `pottery_kiln` | `STONE` | `clay`, `sand`, `firewood` | `brick_clay`, `mortar_lime` | `srd:tool:potters-tools` |
| `GLASSWORKER` | Glassworker | `furnace` | `STONE` | `sand`, `charcoal` | `sand` | `srd:tool:glassblowers-tools` |
| `JEWELER` | Jeweler | `workbench` | `GOLD`, `SILVER`, `PLATINUM` | `gem_rough`, `gold`, `gold_coin` | `gem_cut` | `srd:tool:jewelers-tools` |
| `FLETCHER` | Fletcher | `fletcher_bench` | `WOOD`, `STONE`, `IRON` | `log`, `feathers`, `stone`, `bone`, `bar_iron` | `arrows` | `srd:tool:woodcarvers-tools` |
| `BOWYER` | Bowyer | `bowyer_bench` | `WOOD`, `FIBER` | `log`, `fiber` | `bow_short`, `bow_long` | `srd:tool:woodcarvers-tools` |
| `HERBALIST` | Herbalist | `apothecary_bench` | `FOOD` | `root`, `berries`, `mushroom` | `rations` | `srd:tool:herbalism-kit` |
| `ALCHEMIST` | Alchemist | `apothecary_bench`, `furnace` | `STONE`, `IRON` | `clay`, `sand`, `charcoal`, `ore_iron`, `ore_copper` | `sand`, `charcoal` | `srd:tool:alchemists-supplies` |
| `SCRIBE` | Scribe | `workbench` | `FIBER` | `fiber`, `hide` | `pouch` | `srd:tool:calligraphers-supplies` |
| `MERCHANT` | Merchant | `shop_counter` | `COPPER`, `SILVER`, `GOLD` | `gold_coin`, `rations`, `pouch` | `gold_coin` | *None (Merchant's Scales)* |

---

## 4. Semantics of Craft: NONE

`NONE` is an authoritative, first-class citizen of the craft axis:
1. **Who Holds NONE:**
   - Dependent children, infants, and non-working elders.
   - Unspecialized general laborers and commoners who have not completed an apprenticeship.
   - Pure civic rulers, magistrates, or full-time institutional officers who do not practice a physical trade.
   - New arrivals or refugees who have not yet integrated into local craft guilds.
2. **Operational Duties for NONE:**
   Persons with `craft: "NONE"` are fully active members of the colony. They are routinely dispatched by the SOC.13 duty scheduler to:
   - Resource hauling and stockpile maintenance (`HAUL_RESOURCE`).
   - Basic wilderness gathering of sticks, loose surface stones, and wild berries (`BASIC_FORAGE`).
   - Civil defense, gate vigilance, and emergency muster (`EMERGENCY_DEFENSE`).
   - Administrative tasks and civic office responsibilities (`CIVIC_OFFICE_WORK`).
   - Rest, eating, and recreation.
3. **Axis Independence for NONE:**
   A person with `craft: "NONE"` may hold a high civic office (e.g. `LEADER`, `MAGISTRATE`, `TREASURER`) and any combat class (e.g. `srd:class:fighter` Level 10, or `NONE`).

---

## 5. Apprentice-to-Master Progression Model

Every craft vocation follows an invariant 4-tier competence progression ladder:

```text
  [ Rank 1: APPRENTICE ]  ──►  0.75x Speed | STANDARD Quality   | 250 Downtime Days
            │
  [ Rank 2: JOURNEYMAN ]  ──►  1.00x Speed | SUPERIOR Quality   | 500 Downtime Days
            │
  [ Rank 3: ARTISAN ]     ──►  1.25x Speed | EXCELLENT Quality  | 1000 Downtime Days
            │
  [ Rank 4: MASTER ]      ──►  1.50x Speed | MASTERWORK Quality | 1500 Downtime Days
```

### 5.1 Progression Tier Metrics
- **Rank 1 (`APPRENTICE`):**
  - Title: `Apprentice <DisplayName>` (e.g. Apprentice Blacksmith).
  - Efficiency Multiplier: `0.75` (takes 33% longer than baseline to complete recipe ticks).
  - Quality Access: `STANDARD` goods only.
  - Downtime Training Days: `250` days. Corresponds directly to the 2014 SRD rule for acquiring tool proficiency under an instructor (SRD 5.1 p. 187).
- **Rank 2 (`JOURNEYMAN`):**
  - Title: `Journeyman <DisplayName>`.
  - Efficiency Multiplier: `1.0` (standard baseline production speed).
  - Quality Access: `SUPERIOR` goods.
  - Downtime Training Days: `500` cumulative days.
- **Rank 3 (`ARTISAN`):**
  - Title: `Artisan <DisplayName>`.
  - Efficiency Multiplier: `1.25` (25% faster production).
  - Quality Access: `EXCELLENT` goods.
  - Downtime Training Days: `1000` cumulative days.
- **Rank 4 (`MASTER`):**
  - Title: `Master <DisplayName>`.
  - Efficiency Multiplier: `1.50` (50% faster production).
  - Quality Access: `MASTERWORK` goods.
  - Downtime Training Days: `1500` cumulative days.

### 5.2 Recipe Tick Execution Formula
When a crafter executes a recipe with base work ticks $W_{\text{base}}$:
$$\text{Effective Work Ticks} = \left\lceil \frac{W_{\text{base}}}{\text{EfficiencyMultiplier}} \right\rceil$$

For example, forging a long sword ($W_{\text{base}} = 180$ ticks):
- Apprentice (0.75): $\lceil 180 / 0.75 \rceil = 240$ ticks.
- Journeyman (1.00): $\lceil 180 / 1.00 \rceil = 180$ ticks.
- Artisan (1.25): $\lceil 180 / 1.25 \rceil = 144$ ticks.
- Master (1.50): $\lceil 180 / 1.50 \rceil = 120$ ticks.

---

## 6. Physical Production Chain & Material Conservation

Craft professions operate strictly on real physical resources declared in `game/data/DEUS_ResourceRegistry.json` and `game/data/DEUS_WorldCatalog.json`:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONSERVED PHYSICAL PRODUCTION CYCLE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ NATURAL RESERVES ]  ──(Mining / Logging / Farming)──► [ RAW STOCKPILES ] │
│  (Ore Veins, Forests,                                    (Iron Ore, Logs,   │
│   Clay, Stone Beds)                                       Seeds, Hides)     │
│                                                                 │           │
│                                                       (Smelting / Tanning)  │
│                                                                 ▼           │
│  [ FINISHED ASSETS ]   ◄──(Forging / Carpentry)────── [ REFINED MATERIALS ] │
│  (Swords, Mail, Carts,                                (Iron Bars, Planks,   │
│   Ashlar Walls, Bread)                                 Leather, Charcoal)   │
│            │                                                                │
│            └──(Wear / Destruction / Demolition)──────► [ SCRAP / SALVAGE ]  │
│                                                                 │           │
│                                                          (Remelting)        │
│                                                                 ▼           │
│                                                       [ RECYCLED BARS ]     │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Zero Free Creation:** Every bar of iron, copper, or gold requires authentic ore and charcoal.
- **Physical Workstations:** Craft tasks require physical access to proximate workstations (`furnace`, `smithy`, `workbench`, `pottery_kiln`, `mason_bench`, `tanning_rack`, `bowyer_bench`, `fletcher_bench`, `kitchen_hearth`).

---

## 7. Canonical 2014 SRD 5.1 Tool Integration

Every craft specifies its corresponding 2014 SRD 5.1 tool proficiency:

1. **Artisan's Tools & Kits:**
   - 14 DEUS crafts map directly to 2014 SRD artisan tools and kits (`srd:tool:*`):
     - `srd:tool:smiths-tools` $\rightarrow$ `SMELTER`, `BLACKSMITH`, `ARMORER`, `WEAPONSMITH`
     - `srd:tool:carpenters-tools` $\rightarrow$ `CARPENTER`
     - `srd:tool:masons-tools` $\rightarrow$ `MASON`, `QUARRYMAN`
     - `srd:tool:woodcarvers-tools` $\rightarrow$ `WOODCARVER`, `BOWYER`, `FLETCHER`
     - `srd:tool:leatherworkers-tools` $\rightarrow$ `LEATHERWORKER`, `TANNER`
     - `srd:tool:weavers-tools` $\rightarrow$ `WEAVER`, `SPINNER`, `TAILOR`
     - `srd:tool:cooks-utensils` $\rightarrow$ `COOK`, `BUTCHER`, `BAKER`
     - `srd:tool:brewers-supplies` $\rightarrow$ `BREWER`
     - `srd:tool:potters-tools` $\rightarrow$ `POTTER`
     - `srd:tool:glassblowers-tools` $\rightarrow$ `GLASSWORKER`
     - `srd:tool:jewelers-tools` $\rightarrow$ `JEWELER`
     - `srd:tool:herbalism-kit` $\rightarrow$ `HERBALIST`
     - `srd:tool:alchemists-supplies` $\rightarrow$ `ALCHEMIST`
     - `srd:tool:calligraphers-supplies` $\rightarrow$ `SCRIBE`
2. **Extractive Vocations & Simple Tools:**
   Extractive vocations (`FARMER`, `MINER`, `LOGGER`, `HUNTER`, `FISHER`, `FORAGER`, `THATCHER`, `MILLER`, `MERCHANT`) do not utilize SRD artisan tools; they employ standard equipment/gear (e.g. miner's pick, woodcutter's axe, fishing tackle, merchant's scale). Their `toolProficiency` is recorded as `null` with explicit documentation.
3. **2014 SRD Crafting Throughput Standard:**
   In accordance with the 2014 SRD (p. 187 / `srd51/rules.json`):
   - A crafter can craft items up to a total market value of **5 gp per 8-hour day of downtime**.
   - Raw materials expenditure is fixed at **half the total market value** (50% material cost).
   - Multiple proficient crafters working together combine their throughput (e.g. 3 smiths forge a 1,500 gp plate armor in 100 days instead of 300 days).

---

## 8. Calling-to-Craft Resolution & Historical Spawn

When spawning colonists or loading legacy save files lacking `unit.data.identity`, craft is derived using the strict 3-step precedence rule from `DEUS_PersonIdentity.md`:

1. **Step 1 — Primary Calling:**  
   If `data.calling` (or `data.callings[0]`) matches a key in `Identity.CALLING_CRAFT`, that craft is assigned.
2. **Step 2 — String Job Fallback:**  
   If the calling does not map, but a string `data.job` matches a calling or craft token, that craft is assigned.
3. **Step 3 — Fallback to NONE:**  
   If neither maps, or if `data.job` is an object, the craft is set to `NONE`. Under no circumstances is `currentDuty` or `duty` inspected.

### 8.1 Current Calling Mappings (26 Callings $\rightarrow$ 24 Crafts)
```text
farmer, farmhand  ──► FARMER
miner             ──► MINER
lumberjack        ──► LOGGER
hunter            ──► HUNTER
fisherman         ──► FISHER
blacksmith        ──► BLACKSMITH
armorsmith        ──► ARMORER
weaponsmith       ──► WEAPONSMITH
carpenter         ──► CARPENTER
mason             ──► MASON
leatherworker     ──► LEATHERWORKER
tanner            ──► TANNER
weaver            ──► WEAVER
spinner           ──► SPINNER
chef              ──► COOK
brewer            ──► BREWER
miller            ──► MILLER
butcher           ──► BUTCHER
potter            ──► POTTER
glasswright       ──► GLASSWORKER
jeweler           ──► JEWELER
fletcher          ──► FLETCHER
herbalist         ──► HERBALIST
alchemist         ──► ALCHEMIST
merchant          ──► MERCHANT
```

### 8.2 Resolution Status of Question 5 Unmapped Callings
`docs/systems/DEUS_PersonIdentity.md` Question 5 raised 20 callings that currently resolve to `NONE`. Their prospective canonical alignments are catalogued below:

| Calling | Current Status | Proposed Canonical Craft Mapping | Rationale |
|---|---|---|---|
| `laborer` | `NONE` | `NONE` | General unspecialized manual labor; pristine archetype of `NONE`. |
| `shepherd` | `NONE` | `FARMER` | Pastoral agriculture / animal husbandry; falls under extractive sustenance. |
| `stonecutter` | `NONE` | `QUARRYMAN` | Direct rough stone extraction and block shaping. |
| `construction_worker` | `NONE` | `CARPENTER` or `MASON` | Building assembly; assigned based on primary material. |
| `engineer` | `NONE` | `MASON` or `CARPENTER` | Structural design and mechanisms. |
| `road_builder` | `NONE` | `MASON` | Stone paving and drainage earthworks. |
| `physician` / `medic` / `surgeon` | `NONE` | `HERBALIST` | Medical care and pharmacological compounding. |
| `veterinarian` | `NONE` | `HERBALIST` or `FARMER` | Animal treatment and care. |
| `dresser` | `NONE` | `TAILOR` | Garment fitting and tailoring. |
| `shopkeeper` / `broker` | `NONE` | `MERCHANT` | Trade facilitation and commercial exchange. |
| `scholar` / `sage` / `bookkeeper` | `NONE` | `SCRIBE` | Written records, accounts, and documentation. |
| `beekeeper` | `NONE` | `FORAGER` or `FARMER` | Apiculture / honey extraction. |
| `cheesewright` | `NONE` | `COOK` | Sustenance dairy processing. |
| `stone_carver` | `NONE` | `MASON` | Architectural stone ornamentation. |
| `paperwright` | `NONE` | `SCRIBE` or `MILLER` | Fiber pulp and parchment preparation. |
| `engraver` | `NONE` | `MASON` or `JEWELER` | Fine relief carving on stone or precious metal. |

*Note: Per standing rules, these 20 callings remain mapped to `NONE` in `identity.js` until formal Owner signoff.*

---

## 9. Faction Development Plan Integration

The 34 crafts integrate into `game/data/plans/TEMPLATE.plan.json` through the 14 `kind: "craft"` knowledge nodes. Every craft is unlocked by exactly one knowledge node:

```text
  [ craft.survival ]    ──► FORAGER, HUNTER, COOK
  [ craft.field ]       ──► FARMER, MILLER
  [ craft.wood ]        ──► LOGGER, CARPENTER, WOODCARVER, THATCHER
  [ craft.stone ]       ──► QUARRYMAN, MASON
  [ craft.ore ]         ──► MINER, SMELTER
  [ craft.smith ]       ──► BLACKSMITH, ARMORER, WEAPONSMITH
  [ craft.hide ]        ──► TANNER, LEATHERWORKER
  [ craft.fiber ]       ──► WEAVER, SPINNER, TAILOR
  [ craft.sustenance ]  ──► BUTCHER, BAKER, BREWER, FISHER
  [ craft.learning ]    ──► SCRIBE, HERBALIST
  [ craft.bow ]         ──► BOWYER, FLETCHER
  [ craft.kiln ]        ──► POTTER
  [ craft.trade ]       ──► MERCHANT
  [ craft.fine ]        ──► JEWELER, GLASSWORKER, ALCHEMIST
```

Settlement expansion progressively unlocks these knowledge nodes across six stages (Camp $\rightarrow$ Hamlet $\rightarrow$ Village $\rightarrow$ Town $\rightarrow$ City $\rightarrow$ Metropolis), allowing factions to dynamically staff their economic occupations as their technological infrastructure matures.

---

## 10. Open Owner Questions (OWNER_TODO)

The following points represent architectural boundaries requiring Owner policy determinations:

1. **Craft Multi-Vocation Policy:** Can a colonist hold secondary craft proficiencies, or is the `craft` axis strictly singular? (Current schema enforces a single primary craft token).
2. **Apprentice Promotion Criteria:** What exact event triggers promotion from Apprentice to Journeyman in live simulation? Options: cumulative successful craft ticks, produced item value thresholds, or formal guild recognition.
3. **Craft Degradation & Atrophy:** Does lack of active duty labor cause craft proficiency to regress over multi-year spans, or is craft rank permanent once attained?
4. **Tool Degradation & Breakage:** Do artisan tools lose durability and require blacksmith repair/replacement over prolonged use?
5. **Formal Mapping of Question 5 Callings:** Owner confirmation to activate the proposed mappings for `laborer`, `shepherd`, `stonecutter`, `physician`, etc. in `Identity.CALLING_CRAFT`.

---

## 11. Proposed Follow-ups (PROPOSED-BK)

These items are proposed follow-ups for subsequent WBS tasks:

- **PROPOSED-BK-01:** Integrate `craft_catalogue.json` into the SOC.13 Central Duty Scheduler to prioritize work assignments based on craft rank and efficiency.
- **PROPOSED-BK-02:** Update `UF_Look` and the colonist inspection sheet to render craft display names and progression titles (e.g. "Master Blacksmith").
- **PROPOSED-BK-03:** Hook the 4 quality tiers (`STANDARD`, `SUPERIOR`, `EXCELLENT`, `MASTERWORK`) into the combat equipment stats multiplier pipeline in `UF_Combat`.
- **PROPOSED-BK-04:** Implement guild institution entities under SOC.20 that issue formal mastership charters and regulate guild apprenticeship contracts.
