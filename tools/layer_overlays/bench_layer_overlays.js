"use strict";
// Reprint the WG.00.35 overlay benchmark. Counts are the gate; milliseconds are one measurement.

const L = require("../../game/js/plugins/DEUS_LayerOverlays.js");
const result = L.benchmark();
console.log("layers " + result.layers + "  units " + result.units + "  pool " + result.pool);
for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows[i];
    console.log([
        row.id,
        "hp=" + row.hpBars,
        "lowerHp=" + row.lowerHpBars,
        "overlays=" + row.overlays,
        "bad=" + row.bad,
        "dx=" + row.dx,
        "steadyAlloc=" + row.steadyAllocations,
        "rebuildMs=" + (typeof row.rebuildMs === "number" ? row.rebuildMs.toFixed(3) : ""),
        "steadyMs=" + (typeof row.steadyMs === "number" ? row.steadyMs.toFixed(3) : "")
    ].join("  "));
}
