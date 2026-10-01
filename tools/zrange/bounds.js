"use strict";
/**
 * tools/zrange/bounds.js (WG.00.17, lane AA): the bounds test_zrange judges the sparse storage against.
 *
 * memoryBound(tall, legacy): the baseline storage of one area at a tall range minus at the legacy range -2..+2. The
 * store bytes are the chunk directories (2 B a chunk), the MIXED chunks' arrays (5 x 1024 B materials + 512 B
 * connectors = 5,632 B a chunk) and the ceiling-cap records (UF.Levels.strataMemory: dir + strata + connectors + caps).
 * A level outside the core, with nothing generated in it, costs its directory only. Generated mountain rock above +2
 * and deep cuts below -2 occupy MIXED chunks. The tall run counts both kinds among its outer MIXED chunks. So:
 *   bound = (levels(tall) - levels(legacy)) x chunks a level x 2 B  +  MIXED chunks outside the core x 5,632 B
 * The shape grids (a cache of the levels read, GRID_KEEP) and the JS heap are reported next to it, not judged.
 *
 * SAVE_BOUND: ADR-003 15.5 / BRIEF test 5: a fresh world's save at -16..+15 is at most 256 B larger in its terrain and
 * fluid parts than at -4..+4.
 */
const MIXED_CHUNK_BYTES = 1024 * 5 + 512;
const SAVE_BOUND = 256;
const storeBytes = m => m.dir + m.strata + m.connectors + m.caps;

function memoryBound(tall, legacy) {
    const extra = tall.levels - legacy.levels, chunks = tall.sparse.chunksPerLevel;
    const bytes = extra * chunks * 2 + tall.sparse.outerMixedChunks * MIXED_CHUNK_BYTES;
    return {
        bytes,
        derivation: `(${tall.levels} - ${legacy.levels} levels) x ${chunks} chunks x 2 B = ${extra * chunks * 2} B of directory + ${tall.sparse.outerMixedChunks} MIXED chunks outside the core (cap rock and deep cuts) x ${MIXED_CHUNK_BYTES} B = ${tall.sparse.outerMixedChunks * MIXED_CHUNK_BYTES} B`,
        tall: storeBytes(tall.memory), legacy: storeBytes(legacy.memory)
    };
}
module.exports = { memoryBound, storeBytes, SAVE_BOUND, MIXED_CHUNK_BYTES };
