"use strict";
// Far chunks keep counts. Re-placement comes from the world seed, not from the clock.

const { mix, hashStr } = require("./hash");
const { CELL_PX, CELLS_PER_TILE, TILE_PX } = require("./constants");

function seededAnchor(spec) {
    const h = mix([spec.seed | 0, spec.cx | 0, spec.cy | 0, spec.layer | 0, hashStr(spec.typeId), spec.index | 0]); // SEED_MIX
    const span = (spec.sizePx / CELL_PX) | 0;
    const maxCell = CELLS_PER_TILE - span;
    const cellX = maxCell <= 0 ? 0 : (h % (maxCell + 1));
    const cellY = maxCell <= 0 ? 0 : ((h >>> 8) % (maxCell + 1));
    const tileX = (spec.cx * spec.chunkTiles) + ((h >>> 16) % spec.chunkTiles);
    const tileY = (spec.cy * spec.chunkTiles) + ((h >>> 24) % spec.chunkTiles);
    return {
        tileX: tileX,
        tileY: tileY,
        cellX: cellX,
        cellY: cellY,
        xPx: tileX * TILE_PX + cellX * CELL_PX,
        yPx: tileY * TILE_PX + cellY * CELL_PX
    };
}

module.exports = { seededAnchor };
