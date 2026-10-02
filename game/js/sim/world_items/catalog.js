"use strict";
// SRD weights where the SRD lists them. Volumes, robe weight, key weight, crate numbers,
// surface load limits are explicit fields. Ledger mass is derived from ounce weight in centipounds.
// Slot ids are the only sprite key (AS-ID-001). WS.LONGSWORD.24.D and CN.BACKPACK.CLOSED.D
// match the standard's examples. Other ids use that grammar and are not written into the catalogue file.

const C = require("./constants");
const { CP_PER_LB } = require("../units");

const ASH = { cls: "ash", form: "strata" };
const HUMUS = { cls: "humus", form: "strata" };
const WOOD_RUIN = { cls: "wood", form: "ruin" };

function lb(n) { return Math.round(n * C.OZ_PER_LB); }
function cuft(n) { return Math.round(n * C.CUIN_PER_CUFT); }
function massCp(weightOz) {
    const scaled = weightOz * CP_PER_LB + C.OZ_PER_LB / 2;
    if (!Number.isSafeInteger(weightOz) || weightOz < 0 || !Number.isSafeInteger(scaled)) {
        throw new RangeError("E_MASS_CP: weight is outside safe integer centipounds");
    }
    return Math.floor(scaled / C.OZ_PER_LB);
}

function row(spec) {
    return {
        typeId: spec.typeId,
        name: spec.name,
        kind: spec.kind,
        sizePx: spec.sizePx,
        weightOz: spec.weightOz,
        volumeCuIn: spec.volumeCuIn,
        exteriorCuIn: spec.exteriorCuIn != null ? spec.exteriorCuIn : spec.volumeCuIn,
        massCp: massCp(spec.weightOz),
        ledgerClass: spec.ledgerClass,
        ledgerForm: spec.ledgerForm,
        slotId: spec.slotId,
        iconSlotId: spec.iconSlotId,
        portraitSlotId: spec.portraitSlotId,
        openSlotId: spec.openSlotId || null,
        facing: "D",
        onBurn: spec.onBurn || null,
        onSpill: spec.onSpill || null,
        onRot: spec.onRot || null,
        armorCategory: spec.armorCategory || null,
        tool: spec.tool || null,
        keyId: spec.keyId || null,
        capOz: spec.capOz != null ? spec.capOz : null,
        capCuIn: spec.capCuIn != null ? spec.capCuIn : null,
        interiorCells: spec.interiorCells || 0,
        surfaceQuarters: spec.surfaceQuarters != null ? spec.surfaceQuarters : null,
        loadLimitOz: spec.loadLimitOz != null ? spec.loadLimitOz : null,
        collapseOz: spec.collapseOz != null ? spec.collapseOz : null,
        decayPerTick: spec.decayPerTick || 0,
        condition: spec.condition != null ? spec.condition : null,
        scale: 1
    };
}

const RAWS = [
    row({
        typeId: "longsword", name: "Longsword", kind: "item", sizePx: 24,
        weightOz: lb(3), volumeCuIn: 200,
        ledgerClass: "steel", ledgerForm: "item",
        slotId: "WS.LONGSWORD.24.D", iconSlotId: "IC.LONGSWORD", portraitSlotId: "PT.LONGSWORD"
    }),
    row({
        typeId: "dagger", name: "Dagger", kind: "item", sizePx: 12,
        weightOz: lb(1), volumeCuIn: 20,
        ledgerClass: "steel", ledgerForm: "item",
        slotId: "WS.DAGGER.12.D", iconSlotId: "IC.DAGGER", portraitSlotId: "PT.DAGGER"
    }),
    row({
        typeId: "greatsword", name: "Greatsword", kind: "item", sizePx: 48,
        weightOz: lb(6), volumeCuIn: 400,
        ledgerClass: "steel", ledgerForm: "item",
        slotId: "WS.GREATSWORD.48.D", iconSlotId: "IC.GREATSWORD", portraitSlotId: "PT.GREATSWORD"
    }),
    row({
        typeId: "shield", name: "Shield", kind: "item", sizePx: 24,
        weightOz: lb(6), volumeCuIn: 300,
        ledgerClass: "steel", ledgerForm: "item",
        slotId: "WS.SHIELD.24.D", iconSlotId: "IC.SHIELD", portraitSlotId: "PT.SHIELD"
    }),
    row({
        typeId: "club", name: "Club", kind: "item", sizePx: 24,
        weightOz: lb(2), volumeCuIn: 80,
        ledgerClass: "wood", ledgerForm: "item", onBurn: ASH, onRot: HUMUS,
        slotId: "WS.CLUB.24.D", iconSlotId: "IC.CLUB", portraitSlotId: "PT.CLUB"
    }),
    row({
        typeId: "torch", name: "Torch", kind: "item", sizePx: 12,
        weightOz: lb(1), volumeCuIn: 40,
        ledgerClass: "wood", ledgerForm: "item", onBurn: ASH,
        slotId: "WS.TORCH.12.D", iconSlotId: "IC.TORCH", portraitSlotId: "PT.TORCH"
    }),
    row({
        typeId: "rations", name: "Rations", kind: "item", sizePx: 12,
        weightOz: lb(2), volumeCuIn: 50,
        ledgerClass: "biomass", ledgerForm: "item", onBurn: ASH, onRot: HUMUS,
        decayPerTick: 1, condition: 4,
        slotId: "WS.RATIONS.12.D", iconSlotId: "IC.RATIONS", portraitSlotId: "PT.RATIONS"
    }),
    row({
        typeId: "thieves_tools", name: "Thieves' Tools", kind: "item", sizePx: 12,
        weightOz: lb(1), volumeCuIn: 30,
        ledgerClass: "steel", ledgerForm: "item", tool: "thieves",
        slotId: "WS.THIEVES_TOOLS.12.D", iconSlotId: "IC.THIEVES_TOOLS", portraitSlotId: "PT.THIEVES_TOOLS"
    }),
    row({
        typeId: "key_brass", name: "Brass Key", kind: "item", sizePx: 12,
        weightOz: 1, volumeCuIn: 2,
        ledgerClass: "cu_metal", ledgerForm: "item", keyId: "key.brass",
        slotId: "WS.KEY_BRASS.12.D", iconSlotId: "IC.KEY_BRASS", portraitSlotId: "PT.KEY_BRASS"
    }),
    row({
        typeId: "leather", name: "Leather Armor", kind: "item", sizePx: 24,
        weightOz: lb(10), volumeCuIn: 400,
        ledgerClass: "biomass", ledgerForm: "item", onBurn: ASH, armorCategory: "LIGHT",
        slotId: "WS.LEATHER.24.D", iconSlotId: "IC.LEATHER", portraitSlotId: "PT.LEATHER"
    }),
    row({
        typeId: "chain_shirt", name: "Chain Shirt", kind: "item", sizePx: 24,
        weightOz: lb(20), volumeCuIn: 500,
        ledgerClass: "steel", ledgerForm: "item", armorCategory: "MEDIUM",
        slotId: "WS.CHAIN_SHIRT.24.D", iconSlotId: "IC.CHAIN_SHIRT", portraitSlotId: "PT.CHAIN_SHIRT"
    }),
    row({
        typeId: "chain_mail", name: "Chain Mail", kind: "item", sizePx: 48,
        weightOz: lb(55), volumeCuIn: 800,
        ledgerClass: "steel", ledgerForm: "item", armorCategory: "HEAVY",
        slotId: "WS.CHAIN_MAIL.48.D", iconSlotId: "IC.CHAIN_MAIL", portraitSlotId: "PT.CHAIN_MAIL"
    }),
    row({
        typeId: "plate", name: "Plate Armor", kind: "item", sizePx: 48,
        weightOz: lb(65), volumeCuIn: 900,
        ledgerClass: "steel", ledgerForm: "item", armorCategory: "HEAVY",
        slotId: "WS.PLATE.48.D", iconSlotId: "IC.PLATE", portraitSlotId: "PT.PLATE"
    }),
    row({
        typeId: "robe", name: "Robe", kind: "item", sizePx: 24,
        weightOz: lb(4), volumeCuIn: 250,
        ledgerClass: "biomass", ledgerForm: "item", onBurn: ASH, armorCategory: "ROBE",
        slotId: "WS.ROBE.24.D", iconSlotId: "IC.ROBE", portraitSlotId: "PT.ROBE"
    }),
    row({
        typeId: "backpack", name: "Backpack", kind: "container", sizePx: 24,
        weightOz: lb(5), volumeCuIn: cuft(1), exteriorCuIn: cuft(1),
        ledgerClass: "biomass", ledgerForm: "object", onBurn: ASH, onSpill: HUMUS,
        capOz: lb(30), capCuIn: cuft(1), interiorCells: 8,
        slotId: "CN.BACKPACK.CLOSED.D", openSlotId: "CN.BACKPACK.OPEN.D",
        iconSlotId: "IC.BACKPACK", portraitSlotId: "PT.BACKPACK"
    }),
    row({
        typeId: "sack", name: "Sack", kind: "container", sizePx: 12,
        weightOz: lb(0.5), volumeCuIn: cuft(1), exteriorCuIn: cuft(1),
        ledgerClass: "biomass", ledgerForm: "object", onBurn: ASH, onSpill: HUMUS,
        capOz: lb(30), capCuIn: cuft(1), interiorCells: 8,
        slotId: "CN.SACK.CLOSED.D", openSlotId: "CN.SACK.OPEN.D",
        iconSlotId: "IC.SACK", portraitSlotId: "PT.SACK"
    }),
    row({
        typeId: "chest", name: "Chest", kind: "container", sizePx: 48,
        weightOz: lb(25), volumeCuIn: cuft(12), exteriorCuIn: cuft(12),
        ledgerClass: "wood", ledgerForm: "object", onBurn: ASH, onSpill: WOOD_RUIN,
        capOz: lb(300), capCuIn: cuft(12), interiorCells: 16,
        slotId: "CN.CHEST.CLOSED.D", openSlotId: "CN.CHEST.OPEN.D",
        iconSlotId: "IC.CHEST", portraitSlotId: "PT.CHEST"
    }),
    row({
        typeId: "barrel", name: "Barrel", kind: "container", sizePx: 48,
        weightOz: lb(70), volumeCuIn: cuft(4), exteriorCuIn: cuft(4),
        ledgerClass: "wood", ledgerForm: "object", onBurn: ASH, onSpill: WOOD_RUIN,
        capOz: null, capCuIn: cuft(4), interiorCells: 12,
        slotId: "CN.BARREL.CLOSED.D", openSlotId: "CN.BARREL.OPEN.D",
        iconSlotId: "IC.BARREL", portraitSlotId: "PT.BARREL"
    }),
    row({
        typeId: "crate", name: "Crate", kind: "container", sizePx: 48,
        weightOz: lb(15), volumeCuIn: cuft(8), exteriorCuIn: cuft(8),
        ledgerClass: "wood", ledgerForm: "object", onBurn: ASH, onSpill: WOOD_RUIN,
        capOz: lb(200), capCuIn: cuft(8), interiorCells: 12,
        slotId: "CN.CRATE.CLOSED.D", openSlotId: "CN.CRATE.OPEN.D",
        iconSlotId: "IC.CRATE", portraitSlotId: "PT.CRATE"
    }),
    row({
        typeId: "table_wood", name: "Table", kind: "surface", sizePx: 48,
        weightOz: lb(30), volumeCuIn: cuft(2),
        ledgerClass: "wood", ledgerForm: "object", onBurn: ASH, onSpill: WOOD_RUIN,
        surfaceQuarters: 1, loadLimitOz: lb(150), collapseOz: lb(300),
        slotId: "WS.TABLE.48.D", iconSlotId: "IC.TABLE", portraitSlotId: "PT.TABLE"
    }),
    row({
        typeId: "shelf_wood", name: "Shelf", kind: "surface", sizePx: 48,
        weightOz: lb(20), volumeCuIn: cuft(1),
        ledgerClass: "wood", ledgerForm: "object", onBurn: ASH, onSpill: WOOD_RUIN,
        surfaceQuarters: 2, loadLimitOz: lb(40), collapseOz: lb(80),
        slotId: "WS.SHELF.48.D", iconSlotId: "IC.SHELF", portraitSlotId: "PT.SHELF"
    }),
    row({
        typeId: "shelf_high", name: "High Shelf", kind: "surface", sizePx: 48,
        weightOz: lb(20), volumeCuIn: cuft(1),
        ledgerClass: "wood", ledgerForm: "object", onBurn: ASH, onSpill: WOOD_RUIN,
        surfaceQuarters: 3, loadLimitOz: lb(40), collapseOz: lb(80),
        slotId: "WS.SHELF_HIGH.48.D", iconSlotId: "IC.SHELF_HIGH", portraitSlotId: "PT.SHELF_HIGH"
    })
];

const BY_ID = {};
for (let i = 0; i < RAWS.length; i++) BY_ID[RAWS[i].typeId] = Object.freeze(RAWS[i]);
Object.freeze(BY_ID);

function item(typeId) { return BY_ID[typeId] || null; }
function all() { return Object.keys(BY_ID).sort().map(function (k) { return BY_ID[k]; }); }

module.exports = { item, all, BY_ID, massCp };
