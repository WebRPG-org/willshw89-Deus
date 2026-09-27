"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const TARGET_PATH = path.join(ROOT, "game", "data", "society", "craft_catalogue.json");

const catalogue = {
  schemaVersion: "deus-craft-catalogue/1.0.0",
  documentRole: "craftCatalogue",
  title: "Project DEUS Master Craft & Productive Profession Catalogue",
  standardTask: "SOC.12.01",
  authoritativePrinciples: [
    "1. Three Independent Identity Axes: A person's economic Craft, Civic Office, and combat Class are three completely independent characteristics (INV-SOC-01).",
    "2. Duty Decoupling: Current Duty describes transient operational activity and is never an identity axis or a substitute for craft vocation (INV-SOC-02).",
    "3. Physical Production Foundation: Crafts manipulate authentic physical materials, workstations, and recipes governed by strict material conservation (INV-ECON-01).",
    "4. Apprentice-to-Master Competence Progression: Independent vocation advancement through four standard tiers (Apprentice -> Journeyman -> Artisan -> Master) without combat class prerequisites.",
    "5. Canonical 2014 SRD Alignment: Tool proficiencies, 5 gp/day crafting throughput, and downtime training rules grounded in authentic 2014 SRD 5.1 references.",
    "6. Universal NONE Axis Semantics: NONE is a fully valid token on the craft axis for non-specialized persons, children, elders, or pure officeholders."
  ],
  noneSemantics: {
    token: "NONE",
    description: "Indicates that the person currently holds no specialized economic craft profession. Standard for dependent children, infirm elders, unspecialized commoners, and full-time civic leaders.",
    allowedDutyAssignments: [
      "HAUL_RESOURCE",
      "BASIC_FORAGE",
      "EMERGENCY_DEFENSE",
      "CIVIC_OFFICE_WORK",
      "SLEEP",
      "REST_RECREATION"
    ],
    independentAxes: {
      civicOfficeIndependent: true,
      classIndependent: true,
      dutyDecoupled: true
    }
  },
  callingResolutionRules: {
    precedenceOrder: [
      "1. Primary calling (data.calling, otherwise data.callings[0]) if mapped by calling-craft table",
      "2. String job (data.job) if mapped by calling-craft table or craft token",
      "3. Fallback to NONE (job objects and unmapped tokens yield NONE)"
    ],
    dutyIsolationRule: "Under no circumstance may currentDuty, duty, or live job objects overwrite or derive the craft identity axis.",
    unmappedCallingsStatus: "The 20 unmapped callings identified in DEUS_PersonIdentity.md Question 5 (e.g. laborer, shepherd, stonecutter, physician) remain mapped to NONE until explicit Owner resolution."
  },
  crafts: []
};

const craftDefs = [
  // 1. Extractive (7)
  {
    id: "FARMER",
    family: "extractive",
    displayName: "Farmer",
    description: "Cultivator of soil, tender of crops, and producer of staple grains, vegetables, and plant fibers essential for community sustenance.",
    primaryWorkstations: ["farm_plot"],
    primaryResourceClasses: ["FOOD", "FIBER"],
    productionChain: {
      inputs: ["seeds"],
      outputs: ["berries", "fruit", "root", "straw", "fiber"],
      associatedRecipes: [],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: null,
      toolName: null,
      artisanToolCategory: null,
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-practicing-a-profession",
      sourceCitation: "SRD 5.1 pp. 150, 187"
    },
    callingMappings: ["farmer", "farmhand"],
    knowledgeNode: "craft.field"
  },
  {
    id: "MINER",
    family: "extractive",
    displayName: "Miner",
    description: "Excavator of subterranean strata, ore veins, coal, and native minerals from rock faces.",
    primaryWorkstations: [],
    primaryResourceClasses: ["IRON", "COPPER", "GOLD", "SILVER", "PLATINUM", "STONE"],
    productionChain: {
      inputs: ["stone_pick"],
      outputs: ["ore_iron", "ore_copper", "gold", "stone", "clay", "sand", "gem_rough"],
      associatedRecipes: ["dig_clay", "sift_sand"],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: null,
      toolName: null,
      artisanToolCategory: null,
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-practicing-a-profession",
      sourceCitation: "SRD 5.1 pp. 150, 187"
    },
    callingMappings: ["miner"],
    knowledgeNode: "craft.ore"
  },
  {
    id: "LOGGER",
    family: "extractive",
    displayName: "Logger",
    description: "Harvester of timber, feller of trees, and provider of raw logs and firewood from forest canopies.",
    primaryWorkstations: [],
    primaryResourceClasses: ["WOOD"],
    productionChain: {
      inputs: ["stone_axe", "axe_iron"],
      outputs: ["log", "firewood"],
      associatedRecipes: ["split_firewood"],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: null,
      toolName: null,
      artisanToolCategory: null,
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-practicing-a-profession",
      sourceCitation: "SRD 5.1 pp. 150, 187"
    },
    callingMappings: ["lumberjack"],
    knowledgeNode: "craft.wood"
  },
  {
    id: "QUARRYMAN",
    family: "extractive",
    displayName: "Quarryman",
    description: "Extractor and splitter of surface and bedrock boulders into dimension stone and quarry blocks.",
    primaryWorkstations: [],
    primaryResourceClasses: ["STONE"],
    productionChain: {
      inputs: ["stone_pick", "stone_axe"],
      outputs: ["stone", "sand"],
      associatedRecipes: ["sift_sand"],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: "srd:tool:masons-tools",
      toolName: "Mason’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-practicing-a-profession",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: [],
    knowledgeNode: "craft.stone"
  },
  {
    id: "HUNTER",
    family: "extractive",
    displayName: "Hunter",
    description: "Stalker and harvester of wild game, waterfowl, and fauna for raw meat, pelts, bone, and feathers.",
    primaryWorkstations: [],
    primaryResourceClasses: ["FOOD", "FIBER"],
    productionChain: {
      inputs: ["bow_short", "bow_long", "arrows", "spear"],
      outputs: ["meat_raw", "hide", "bone", "feathers"],
      associatedRecipes: [],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: null,
      toolName: null,
      artisanToolCategory: null,
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-practicing-a-profession",
      sourceCitation: "SRD 5.1 pp. 150, 187"
    },
    callingMappings: ["hunter"],
    knowledgeNode: "craft.survival"
  },
  {
    id: "FISHER",
    family: "extractive",
    displayName: "Fisher",
    description: "Harvester of aquatic life, catching freshwater and shoreline fish for settlement sustenance.",
    primaryWorkstations: [],
    primaryResourceClasses: ["FOOD"],
    productionChain: {
      inputs: ["fiber", "stone_knife"],
      outputs: ["fish"],
      associatedRecipes: [],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: null,
      toolName: null,
      artisanToolCategory: null,
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-practicing-a-profession",
      sourceCitation: "SRD 5.1 pp. 150, 187"
    },
    callingMappings: ["fisherman"],
    knowledgeNode: "craft.sustenance"
  },
  {
    id: "FORAGER",
    family: "extractive",
    displayName: "Forager",
    description: "Gatherer of wild herbs, berries, edible fungi, tubers, reeds, and surface stones in uncultivated biomes.",
    primaryWorkstations: [],
    primaryResourceClasses: ["FOOD", "FIBER"],
    productionChain: {
      inputs: [],
      outputs: ["berries", "fruit", "mushroom", "root", "fiber", "stone"],
      associatedRecipes: [],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: null,
      toolName: null,
      artisanToolCategory: null,
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-practicing-a-profession",
      sourceCitation: "SRD 5.1 pp. 150, 187"
    },
    callingMappings: [],
    knowledgeNode: "craft.survival"
  },

  // 2. Pyrometallurgical & Smiths (4)
  {
    id: "SMELTER",
    family: "pyrometallurgical_and_smiths",
    displayName: "Smelter",
    description: "Operator of reduction furnaces and bloomeries, converting raw metallic ores into refined ingots and bars.",
    primaryWorkstations: ["furnace"],
    primaryResourceClasses: ["IRON", "COPPER", "STEEL"],
    productionChain: {
      inputs: ["ore_iron", "ore_copper", "charcoal", "firewood"],
      outputs: ["bar_iron", "bar_copper", "charcoal"],
      associatedRecipes: ["charcoal", "bar_iron", "bar_copper"],
      associatedLabors: ["furnace_operator"]
    },
    srd51Reference: {
      toolProficiency: "srd:tool:smiths-tools",
      toolName: "Smith’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: [],
    knowledgeNode: "craft.ore"
  },
  {
    id: "BLACKSMITH",
    family: "pyrometallurgical_and_smiths",
    displayName: "Blacksmith",
    description: "Artisan of iron and metal forging, shaping tools, nails, hardware, chains, and general camp ironwork.",
    primaryWorkstations: ["smithy", "furnace"],
    primaryResourceClasses: ["IRON", "COPPER", "STEEL"],
    productionChain: {
      inputs: ["bar_iron", "bar_copper", "charcoal", "log"],
      outputs: ["hardware_iron", "axe_iron", "spear", "mace"],
      associatedRecipes: ["forge_hardware", "axe_iron", "spear_iron", "mace"],
      associatedLabors: ["armorsmith", "weaponsmith"]
    },
    srd51Reference: {
      toolProficiency: "srd:tool:smiths-tools",
      toolName: "Smith’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["blacksmith"],
    knowledgeNode: "craft.smith"
  },
  {
    id: "ARMORER",
    family: "pyrometallurgical_and_smiths",
    displayName: "Armorer",
    description: "Specialist smith fabricating metallic protective gear including mail shirts, helms, greaves, and iron shields.",
    primaryWorkstations: ["smithy"],
    primaryResourceClasses: ["IRON", "STEEL"],
    productionChain: {
      inputs: ["bar_iron", "leather", "log"],
      outputs: ["helmet_iron", "mail_iron", "greaves_iron", "shield_iron"],
      associatedRecipes: ["helmet_iron", "mail_iron", "greaves_iron", "shield_iron"],
      associatedLabors: ["armorsmith"]
    },
    srd51Reference: {
      toolProficiency: "srd:tool:smiths-tools",
      toolName: "Smith’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["armorsmith"],
    knowledgeNode: "craft.smith"
  },
  {
    id: "WEAPONSMITH",
    family: "pyrometallurgical_and_smiths",
    displayName: "Weaponsmith",
    description: "Specialist blade and armaments smith forging daggers, arming swords, long swords, spearheads, and polearms.",
    primaryWorkstations: ["smithy"],
    primaryResourceClasses: ["IRON", "STEEL"],
    productionChain: {
      inputs: ["bar_iron", "leather", "log"],
      outputs: ["dagger_iron", "sword_short", "sword_long", "spear"],
      associatedRecipes: ["dagger_iron", "sword_short", "sword_long", "spear_iron"],
      associatedLabors: ["weaponsmith"]
    },
    srd51Reference: {
      toolProficiency: "srd:tool:smiths-tools",
      toolName: "Smith’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["weaponsmith"],
    knowledgeNode: "craft.smith"
  },

  // 3. Construction & Woodcraft (4)
  {
    id: "CARPENTER",
    family: "construction_and_woodcraft",
    displayName: "Carpenter",
    description: "Master of structural timber, joinery, furniture, frames, doors, and wooden defensive palisades.",
    primaryWorkstations: ["workbench"],
    primaryResourceClasses: ["WOOD"],
    productionChain: {
      inputs: ["log", "leather", "fiber"],
      outputs: ["plank_dressed", "club", "spear", "shield_wood"],
      associatedRecipes: ["plane_planks", "club", "spear_stone", "shield_wood"],
      associatedLabors: ["carpenter"]
    },
    srd51Reference: {
      toolProficiency: "srd:tool:carpenters-tools",
      toolName: "Carpenter’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["carpenter"],
    knowledgeNode: "craft.wood"
  },
  {
    id: "MASON",
    family: "construction_and_woodcraft",
    displayName: "Mason",
    description: "Shaper of stone, cutting ashlar blocks, constructing stone walls, hearths, furnaces, and permanent fortifications.",
    primaryWorkstations: ["mason_bench"],
    primaryResourceClasses: ["STONE"],
    productionChain: {
      inputs: ["stone", "mortar_lime"],
      outputs: ["stone_block", "stone_knife", "stone_axe", "stone_pick"],
      associatedRecipes: ["chisel_stone_block", "stone_knife", "stone_axe", "stone_pick"],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: "srd:tool:masons-tools",
      toolName: "Mason’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["mason"],
    knowledgeNode: "craft.stone"
  },
  {
    id: "WOODCARVER",
    family: "construction_and_woodcraft",
    displayName: "Woodcarver",
    description: "Fine artisan of wood ornamentation, detailed carvings, wooden figurines, tableware, and wooden utensils.",
    primaryWorkstations: ["workbench"],
    primaryResourceClasses: ["WOOD"],
    productionChain: {
      inputs: ["log", "plank_dressed"],
      outputs: ["club"],
      associatedRecipes: ["club"],
      associatedLabors: ["carpenter"]
    },
    srd51Reference: {
      toolProficiency: "srd:tool:woodcarvers-tools",
      toolName: "Woodcarver’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: [],
    knowledgeNode: "craft.wood"
  },
  {
    id: "THATCHER",
    family: "construction_and_woodcraft",
    displayName: "Thatcher",
    description: "Roofer and weather-sealer using reeds, straw, and sod to protect dwellings against elements.",
    primaryWorkstations: ["workbench"],
    primaryResourceClasses: ["FIBER", "WOOD"],
    productionChain: {
      inputs: ["straw", "fiber", "log"],
      outputs: ["fiber_wrap"],
      associatedRecipes: ["fiber_wrap"],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: null,
      toolName: null,
      artisanToolCategory: null,
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-practicing-a-profession",
      sourceCitation: "SRD 5.1 pp. 150, 187"
    },
    callingMappings: [],
    knowledgeNode: "craft.wood"
  },

  // 4. Organic & Textiles (5)
  {
    id: "LEATHERWORKER",
    family: "organic_and_textiles",
    displayName: "Leatherworker",
    description: "Crafter of cured leather into armor, boots, bracers, straps, pouches, and slings.",
    primaryWorkstations: ["workbench"],
    primaryResourceClasses: ["FIBER"],
    productionChain: {
      inputs: ["leather", "fiber"],
      outputs: ["sling", "helmet_leather", "armor_leather", "leggings_leather", "pouch"],
      associatedRecipes: ["sling", "helmet_leather", "armor_leather", "leggings_leather"],
      associatedLabors: ["leatherworker"]
    },
    srd51Reference: {
      toolProficiency: "srd:tool:leatherworkers-tools",
      toolName: "Leatherworker’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["leatherworker"],
    knowledgeNode: "craft.hide"
  },
  {
    id: "TANNER",
    family: "organic_and_textiles",
    displayName: "Tanner",
    description: "Processor of raw animal hides through soaking, scraping, and vegetable or salt tanning into supple leather.",
    primaryWorkstations: ["tanning_rack"],
    primaryResourceClasses: ["FIBER"],
    productionChain: {
      inputs: ["hide"],
      outputs: ["leather"],
      associatedRecipes: ["leather"],
      associatedLabors: ["tanner"]
    },
    srd51Reference: {
      toolProficiency: "srd:tool:leatherworkers-tools",
      toolName: "Leatherworker’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["tanner"],
    knowledgeNode: "craft.hide"
  },
  {
    id: "TAILOR",
    family: "organic_and_textiles",
    displayName: "Tailor",
    description: "Maker of fitted clothing, garments, cloaks, tunics, and bedding from woven fabrics and hides.",
    primaryWorkstations: ["workbench"],
    primaryResourceClasses: ["FIBER"],
    productionChain: {
      inputs: ["fiber", "hide", "leather"],
      outputs: ["fiber_wrap", "hide_cloak", "common_clothes"],
      associatedRecipes: ["fiber_wrap", "hide_cloak"],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: "srd:tool:weavers-tools",
      toolName: "Weaver’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: [],
    knowledgeNode: "craft.fiber"
  },
  {
    id: "WEAVER",
    family: "organic_and_textiles",
    displayName: "Weaver",
    description: "Loom operator weaving spun yarn, wool, and plant fiber threads into durable cloth bolts and canvas.",
    primaryWorkstations: ["workbench"],
    primaryResourceClasses: ["FIBER"],
    productionChain: {
      inputs: ["fiber", "wool"],
      outputs: ["fiber_wrap", "common_clothes"],
      associatedRecipes: ["fiber_wrap"],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: "srd:tool:weavers-tools",
      toolName: "Weaver’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["weaver"],
    knowledgeNode: "craft.fiber"
  },
  {
    id: "SPINNER",
    family: "organic_and_textiles",
    displayName: "Spinner",
    description: "Carder and spinner drawing raw wool, flax, and plant fiber into continuous yarn and thread.",
    primaryWorkstations: ["workbench"],
    primaryResourceClasses: ["FIBER"],
    productionChain: {
      inputs: ["wool", "fiber"],
      outputs: ["fiber"],
      associatedRecipes: ["fiber_wrap"],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: "srd:tool:weavers-tools",
      toolName: "Weaver’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["spinner"],
    knowledgeNode: "craft.fiber"
  },

  // 5. Sustenance & Processing (5)
  {
    id: "COOK",
    family: "sustenance_and_processing",
    displayName: "Cook",
    description: "Preparer of nourishing meals, roasted meats, stews, and preserved travel rations over hearths and campfires.",
    primaryWorkstations: ["kitchen_hearth", "campfire"],
    primaryResourceClasses: ["FOOD"],
    productionChain: {
      inputs: ["meat_raw", "fish", "berries", "root", "firewood"],
      outputs: ["meat_cooked", "rations"],
      associatedRecipes: ["cook_meat", "cook_fish"],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: "srd:tool:cooks-utensils",
      toolName: "Cook’s utensils",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["chef"],
    knowledgeNode: "craft.survival"
  },
  {
    id: "BREWER",
    family: "sustenance_and_processing",
    displayName: "Brewer",
    description: "Fermenter of grains, wild hops, and tuber starches into ales, beers, and potable preserved spirits.",
    primaryWorkstations: ["kitchen_hearth"],
    primaryResourceClasses: ["FOOD", "WATER"],
    productionChain: {
      inputs: ["berries", "root", "firewood"],
      outputs: ["rations"],
      associatedRecipes: [],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: "srd:tool:brewers-supplies",
      toolName: "Brewer’s supplies",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["brewer"],
    knowledgeNode: "craft.sustenance"
  },
  {
    id: "MILLER",
    family: "sustenance_and_processing",
    displayName: "Miller",
    description: "Operator of quern stones and millstones, grinding raw grains and tubers into flour and meal for baking.",
    primaryWorkstations: ["workbench"],
    primaryResourceClasses: ["FOOD"],
    productionChain: {
      inputs: ["root", "seeds"],
      outputs: ["rations"],
      associatedRecipes: [],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: null,
      toolName: null,
      artisanToolCategory: null,
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-practicing-a-profession",
      sourceCitation: "SRD 5.1 pp. 150, 187"
    },
    callingMappings: ["miller"],
    knowledgeNode: "craft.field"
  },
  {
    id: "BUTCHER",
    family: "sustenance_and_processing",
    displayName: "Butcher",
    description: "Dresser of carcass game and livestock into culinary cuts of meat, bones, tallow, and raw hides.",
    primaryWorkstations: ["kitchen_counter", "workbench"],
    primaryResourceClasses: ["FOOD"],
    productionChain: {
      inputs: ["meat_raw"],
      outputs: ["meat_cooked", "bone", "hide"],
      associatedRecipes: ["cook_meat"],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: "srd:tool:cooks-utensils",
      toolName: "Cook’s utensils",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["butcher"],
    knowledgeNode: "craft.sustenance"
  },
  {
    id: "BAKER",
    family: "sustenance_and_processing",
    displayName: "Baker",
    description: "Baker of flour, root starch, water, and leavening into loaves of bread, hardtack, and travel provisions.",
    primaryWorkstations: ["kitchen_hearth"],
    primaryResourceClasses: ["FOOD"],
    productionChain: {
      inputs: ["root", "berries", "firewood"],
      outputs: ["rations"],
      associatedRecipes: [],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: "srd:tool:cooks-utensils",
      toolName: "Cook’s utensils",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: [],
    knowledgeNode: "craft.sustenance"
  },

  // 6. Artisan & Specialized (9)
  {
    id: "POTTER",
    family: "artisan_and_specialized",
    displayName: "Potter",
    description: "Shaper and kiln-firer of earthen clay into durable storage vessels, ceramic jars, and structural bricks.",
    primaryWorkstations: ["pottery_kiln"],
    primaryResourceClasses: ["STONE"],
    productionChain: {
      inputs: ["clay", "sand", "firewood"],
      outputs: ["brick_clay", "mortar_lime"],
      associatedRecipes: ["fire_brick", "lime_mortar"],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: "srd:tool:potters-tools",
      toolName: "Potter’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["potter"],
    knowledgeNode: "craft.kiln"
  },
  {
    id: "GLASSWORKER",
    family: "artisan_and_specialized",
    displayName: "Glassworker",
    description: "Furnace blower of silica sand and flux into glass flasks, vials, panes, and optical lenses.",
    primaryWorkstations: ["furnace"],
    primaryResourceClasses: ["STONE"],
    productionChain: {
      inputs: ["sand", "charcoal"],
      outputs: ["sand"],
      associatedRecipes: ["sift_sand"],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: "srd:tool:glassblowers-tools",
      toolName: "Glassblower’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["glasswright"],
    knowledgeNode: "craft.fine"
  },
  {
    id: "JEWELER",
    family: "artisan_and_specialized",
    displayName: "Jeweler",
    description: "Lapidary cutter of rough gems, setter of precious stones, and craftsman of gold and silver ornamentation.",
    primaryWorkstations: ["workbench"],
    primaryResourceClasses: ["GOLD", "SILVER", "PLATINUM"],
    productionChain: {
      inputs: ["gem_rough", "gold", "gold_coin"],
      outputs: ["gem_cut"],
      associatedRecipes: [],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: "srd:tool:jewelers-tools",
      toolName: "Jeweler’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["jeweler"],
    knowledgeNode: "craft.fine"
  },
  {
    id: "FLETCHER",
    family: "artisan_and_specialized",
    displayName: "Fletcher",
    description: "Maker of arrow shafts, hafting stone, bone, or iron tips with split goose and raptor feather fletchings.",
    primaryWorkstations: ["fletcher_bench"],
    primaryResourceClasses: ["WOOD", "STONE", "IRON"],
    productionChain: {
      inputs: ["log", "feathers", "stone", "bone", "bar_iron"],
      outputs: ["arrows"],
      associatedRecipes: ["arrows_stone", "arrows_bone", "arrows_iron"],
      associatedLabors: ["fletcher"]
    },
    srd51Reference: {
      toolProficiency: "srd:tool:woodcarvers-tools",
      toolName: "Woodcarver’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["fletcher"],
    knowledgeNode: "craft.bow"
  },
  {
    id: "BOWYER",
    family: "artisan_and_specialized",
    displayName: "Bowyer",
    description: "Tiller of staves, crafting short bows, recurve long bows, and composite bows from seasoned yew and cordage.",
    primaryWorkstations: ["bowyer_bench"],
    primaryResourceClasses: ["WOOD", "FIBER"],
    productionChain: {
      inputs: ["log", "fiber"],
      outputs: ["bow_short", "bow_long"],
      associatedRecipes: ["bow_short", "bow_long"],
      associatedLabors: ["bowyer"]
    },
    srd51Reference: {
      toolProficiency: "srd:tool:woodcarvers-tools",
      toolName: "Woodcarver’s tools",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: [],
    knowledgeNode: "craft.bow"
  },
  {
    id: "HERBALIST",
    family: "artisan_and_specialized",
    displayName: "Herbalist",
    description: "Preparer of wild medicinal flora, compounding healing salves, poultices, antivenoms, and soothing tisanes.",
    primaryWorkstations: ["apothecary_bench"],
    primaryResourceClasses: ["FOOD"],
    productionChain: {
      inputs: ["root", "berries", "mushroom"],
      outputs: ["rations"],
      associatedRecipes: [],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: "srd:tool:herbalism-kit",
      toolName: "Herbalism kit",
      artisanToolCategory: "kits",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["herbalist"],
    knowledgeNode: "craft.learning"
  },
  {
    id: "ALCHEMIST",
    family: "artisan_and_specialized",
    displayName: "Alchemist",
    description: "Practitioner of proto-chemical transformation, solvent distillation, elemental extractions, and mineral reagents.",
    primaryWorkstations: ["apothecary_bench", "furnace"],
    primaryResourceClasses: ["STONE", "IRON"],
    productionChain: {
      inputs: ["clay", "sand", "charcoal", "ore_iron", "ore_copper"],
      outputs: ["sand", "charcoal"],
      associatedRecipes: ["charcoal", "sift_sand"],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: "srd:tool:alchemists-supplies",
      toolName: "Alchemist’s supplies",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: ["alchemist"],
    knowledgeNode: "craft.fine"
  },
  {
    id: "SCRIBE",
    family: "artisan_and_specialized",
    displayName: "Scribe",
    description: "Inscriber of parchment rolls, ink maker, transcriber of contracts, administrative rolls, and historical records.",
    primaryWorkstations: ["workbench"],
    primaryResourceClasses: ["FIBER"],
    productionChain: {
      inputs: ["fiber", "hide"],
      outputs: ["pouch"],
      associatedRecipes: [],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: "srd:tool:calligraphers-supplies",
      toolName: "Calligrapher’s supplies",
      artisanToolCategory: "artisan_tools",
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-crafting",
      sourceCitation: "SRD 5.1 pp. 68, 187"
    },
    callingMappings: [],
    knowledgeNode: "craft.learning"
  },
  {
    id: "MERCHANT",
    family: "artisan_and_specialized",
    displayName: "Merchant",
    description: "Facilitator of trade, valuation of goods, caravan logistics, ledger accounting, and exchange of physical coin.",
    primaryWorkstations: ["shop_counter"],
    primaryResourceClasses: ["COPPER", "SILVER", "GOLD"],
    productionChain: {
      inputs: ["gold_coin", "rations", "pouch"],
      outputs: ["gold_coin"],
      associatedRecipes: [],
      associatedLabors: []
    },
    srd51Reference: {
      toolProficiency: null,
      toolName: null,
      artisanToolCategory: null,
      craftingRate: "5 gp market value per 8-hour day with raw materials worth half market value (2014 SRD p. 187)",
      downtimeActivity: "srd:rule:downtime-activities-practicing-a-profession",
      sourceCitation: "SRD 5.1 pp. 150, 187"
    },
    callingMappings: ["merchant"],
    knowledgeNode: "craft.trade"
  }
];

for (const craft of craftDefs) {
  craft.progression = [
    {
      rank: 1,
      tier: "APPRENTICE",
      title: "Apprentice " + craft.displayName,
      efficiencyMultiplier: 0.75,
      qualityTierAccess: "STANDARD",
      downtimeTrainingDays: 250
    },
    {
      rank: 2,
      tier: "JOURNEYMAN",
      title: "Journeyman " + craft.displayName,
      efficiencyMultiplier: 1.0,
      qualityTierAccess: "SUPERIOR",
      downtimeTrainingDays: 500
    },
    {
      rank: 3,
      tier: "ARTISAN",
      title: "Artisan " + craft.displayName,
      efficiencyMultiplier: 1.25,
      qualityTierAccess: "EXCELLENT",
      downtimeTrainingDays: 1000
    },
    {
      rank: 4,
      tier: "MASTER",
      title: "Master " + craft.displayName,
      efficiencyMultiplier: 1.5,
      qualityTierAccess: "MASTERWORK",
      downtimeTrainingDays: 1500
    }
  ];

  craft.independentAxesPreservation = {
    independentOfCivicOffice: true,
    independentOfClass: true,
    dutyDecoupled: true,
    notes: "Preserves INV-SOC-01 and INV-SOC-02: holding " + craft.displayName + " craft does not constrain civic office or combat class, and operational tasks are dispatched dynamically via Current Duty."
  };

  catalogue.crafts.push(craft);
}

fs.writeFileSync(TARGET_PATH, JSON.stringify(catalogue, null, 2) + "\n", "utf8");
console.log("Successfully wrote craft_catalogue.json with " + catalogue.crafts.length + " crafts to " + TARGET_PATH);
