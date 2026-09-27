"use strict";
// Presentation constants for on-map combat. Resolution numbers stay in UF.Rules.
// ATK_1H_SHIELD is retired and reserved. It is not a live clip.

const ROUND_MS = 6000;
const SPEEDS = [1, 2, 4, 8];
const TILE_PX = 48;
const LAYER_MIN = -16;
const LAYER_MAX = 15;
const LAYER_COUNT = 32;
const WALK_PX = 4;
const RUN_PX = 6;
const DIAGONAL_PX = 3;

const DIRECTIONS = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];

const ARMOR_STATES = ["UNARMORED", "ROBE", "LIGHT", "MEDIUM", "HEAVY"];

const LIFE_ANIMS = ["IDLE", "WALK", "WORK", "SLEEP", "SIT", "EAT", "CARRY", "HURT", "KNOCKDOWN", "DEAD"];
const ATTACK_ANIMS = ["ATK_UNARMED", "ATK_DAGGER", "ATK_1H", "ATK_2H", "ATK_POLEARM", "ATK_STAFF", "ATK_BOW", "ATK_XBOW"];
const ANIMS = LIFE_ANIMS.concat(ATTACK_ANIMS, ["CAST"]);
const RETIRED_CLIPS = ["ATK_1H_SHIELD"];

const WEAPON_GROUPS = ["unarmed", "dagger", "one-hand-sword", "two-hand", "polearm", "staff", "bow", "crossbow"];

const CLIP_BY_GROUP = {
    unarmed: "ATK_UNARMED",
    dagger: "ATK_DAGGER",
    "one-hand-sword": "ATK_1H",
    "two-hand": "ATK_2H",
    polearm: "ATK_POLEARM",
    staff: "ATK_STAFF",
    bow: "ATK_BOW",
    crossbow: "ATK_XBOW"
};

// SRD keys (slug, underscores). Thrown weapons listed here have no attack clip.
const GROUP_BY_WEAPON = {
    dagger: "dagger",
    shortsword: "one-hand-sword",
    longsword: "one-hand-sword",
    scimitar: "one-hand-sword",
    rapier: "one-hand-sword",
    sickle: "one-hand-sword",
    mace: "one-hand-sword",
    club: "one-hand-sword",
    greatclub: "two-hand",
    handaxe: "one-hand-sword",
    battleaxe: "one-hand-sword",
    greataxe: "two-hand",
    warhammer: "one-hand-sword",
    maul: "two-hand",
    greatsword: "two-hand",
    morningstar: "one-hand-sword",
    flail: "one-hand-sword",
    war_pick: "one-hand-sword",
    whip: "one-hand-sword",
    light_hammer: "one-hand-sword",
    spear: "polearm",
    glaive: "polearm",
    halberd: "polearm",
    pike: "polearm",
    lance: "polearm",
    trident: "polearm",
    quarterstaff: "staff",
    shortbow: "bow",
    longbow: "bow",
    light_crossbow: "crossbow",
    heavy_crossbow: "crossbow",
    hand_crossbow: "crossbow",
    javelin: null,
    dart: null,
    sling: null,
    net: null
};

const THROWN_NO_GROUP = { javelin: true, dart: true, sling: true, net: true };

// PM default, Owner-open: an unarmored caster wears the robe state.
const PM_CASTER_CLASSES = { wizard: true, sorcerer: true, warlock: true, cleric: true, druid: true, bard: true };

const BEHAVIOURS = ["attack-nearest", "defend", "flee", "heal"];
const HEAL_RANGE_SQUARES = 12;
const HEAL_DICE = "1d4";

const FOOTPRINT = {
    Tiny: { w: 1, h: 1, shares: true },
    Small: { w: 1, h: 1, shares: false },
    Medium: { w: 1, h: 1, shares: false },
    Large: { w: 2, h: 2, shares: false },
    Huge: { w: 3, h: 3, shares: false },
    Gargantuan: { w: 4, h: 4, shares: false }
};

// Item 36 PM defaults for the on-screen frame. Not drawn here.
const SIZE_FRAME = {
    Tiny: { w: 24, h: 24 },
    Small: { w: 36, h: 36 },
    Medium: { w: 42, h: 42 },
    Large: { w: 96, h: 48 },
    Huge: { w: 144, h: 144 },
    Gargantuan: { w: 192, h: 192 }
};

const MARKER_SHAPE = {
    selection: "square",
    faction: "triangle",
    summon: "diamond",
    lowHp: "circle"
};

const DAMAGE_COLOR = {
    bludgeoning: "#b0b0b0",
    piercing: "#d8d8d8",
    slashing: "#f2f2f2",
    fire: "#e85d04",
    cold: "#4cc9f0",
    lightning: "#f7e36b",
    thunder: "#9b5de5",
    poison: "#70e000",
    acid: "#b5e48c",
    necrotic: "#5a189a",
    radiant: "#ffd166",
    psychic: "#f72585",
    force: "#4ea8de",
    miss: "#4d7cff",
    heal: "#80ed99"
};

const ATTACK_TYPE_COLOR = {
    slash: "slashing",
    stab: "piercing",
    crush: "bludgeoning",
    ranged: "piercing",
    magic: "force"
};

const PIXEL_FONT = "DEUS_Pixel";
const SCENE = "map";

const DIR_DELTA = [
    { id: "S", dx: 0, dy: 1, numpad: 2 },
    { id: "SW", dx: -1, dy: 1, numpad: 1 },
    { id: "W", dx: -1, dy: 0, numpad: 4 },
    { id: "NW", dx: -1, dy: -1, numpad: 7 },
    { id: "N", dx: 0, dy: -1, numpad: 8 },
    { id: "NE", dx: 1, dy: -1, numpad: 9 },
    { id: "E", dx: 1, dy: 0, numpad: 6 },
    { id: "SE", dx: 1, dy: 1, numpad: 3 }
];

function slug(name) {
    return String(name == null ? "" : name)
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function layerOk(z) {
    return Number.isInteger(z) && z >= LAYER_MIN && z <= LAYER_MAX;
}

module.exports = {
    ROUND_MS, SPEEDS, TILE_PX, LAYER_MIN, LAYER_MAX, LAYER_COUNT,
    WALK_PX, RUN_PX, DIAGONAL_PX,
    DIRECTIONS, ARMOR_STATES, LIFE_ANIMS, ATTACK_ANIMS, ANIMS, RETIRED_CLIPS,
    WEAPON_GROUPS, CLIP_BY_GROUP, GROUP_BY_WEAPON, THROWN_NO_GROUP, PM_CASTER_CLASSES,
    BEHAVIOURS, HEAL_RANGE_SQUARES, HEAL_DICE,
    FOOTPRINT, SIZE_FRAME, MARKER_SHAPE, DAMAGE_COLOR, ATTACK_TYPE_COLOR, PIXEL_FONT,
    SCENE, DIR_DELTA, slug, layerOk
};
