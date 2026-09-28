"use strict";
// DEUS-TSK-WORLD-ITEMS. Locked units from AS-SCALE-001 / AS-PLAY-001 / AS-CONT-001.
// Numbers marked PM in the system doc are defaults the Owner can override; they are not rulings.

const TILE_PX = 48;
const CELL_PX = 6;
const CELLS_PER_TILE = 8; // 6 px cells, 8 along a 48 px tile
const QUARTER_PX = 12;
const QUARTERS_PER_LAYER = 4;
const LAYER_FT = 5;
const LAYER_PX = 48;
const QUARTER_FT = 1.25;
const TICK_SEC = 6;
const TICKS_PER_MINUTE = 10;
const SIZE_CLASSES = [12, 24, 48];
const CHUNK_TILES = 16; // PM default
const NEAR_TILES = 24; // PM default, Chebyshev tile radius of full detail
const COLLAPSE_RATIO = 2; // PM default: a surface breaks at twice its load limit
const WALK_CARDINAL_PX = 4;
const RUN_CARDINAL_PX = 6;
const WALK_DIAGONAL_PX = 3; // per axis, AS-SCALE-001
const RUN_DIAGONAL_PX = 4; // PM default: 6/sqrt(2) rounded to a whole pixel
const CARRY_ANIM = "CARRY";
const ARMOR_STATES = ["UNARMORED", "ROBE", "LIGHT", "MEDIUM", "HEAVY"];
const FACINGS = ["D", "U", "L", "R"];
const ZOOM_FACTORS = [3, 4];
const OUTLINE_PX = 1;
const OZ_PER_LB = 16;
const CUIN_PER_CUFT = 1728;
const CARRY_LB_PER_STR = 15;
const TORCH_BRIGHT_TILES = 4; // 20 ft
const TORCH_DIM_TILES = 4; // another 20 ft
const PICK_MODIFIER = "shift"; // PM default
const ZOOM_HOLD_3 = "pageup"; // PM default
const ZOOM_HOLD_4 = "pagedown"; // PM default
const SHADOW_PX = { 12: 1, 24: 2, 48: 2 };
const REGION_TILES = 256;
const WORLD_REGIONS = 3;
const WORLD_TILES = 768; // 3 regions x 256 tiles
const Z_MIN = -16;
const Z_MAX = 15;

module.exports = {
    TILE_PX, CELL_PX, CELLS_PER_TILE, QUARTER_PX, QUARTERS_PER_LAYER,
    LAYER_FT, LAYER_PX, QUARTER_FT, TICK_SEC, TICKS_PER_MINUTE, SIZE_CLASSES,
    CHUNK_TILES, NEAR_TILES, COLLAPSE_RATIO,
    WALK_CARDINAL_PX, RUN_CARDINAL_PX, WALK_DIAGONAL_PX, RUN_DIAGONAL_PX,
    CARRY_ANIM, ARMOR_STATES, FACINGS, ZOOM_FACTORS, OUTLINE_PX,
    OZ_PER_LB, CUIN_PER_CUFT, CARRY_LB_PER_STR,
    TORCH_BRIGHT_TILES, TORCH_DIM_TILES,
    PICK_MODIFIER, ZOOM_HOLD_3, ZOOM_HOLD_4, SHADOW_PX,
    REGION_TILES, WORLD_REGIONS, WORLD_TILES, Z_MIN, Z_MAX
};
