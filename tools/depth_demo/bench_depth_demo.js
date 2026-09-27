// Prints the depth-demo benchmark table. Not a gate. The gate is test_depth_demo.js.
"use strict";

const Demo = require("../../game/js/plugins/DEUS_DepthDemo.js");

const iters = Number(process.argv[2] || 4);
const pixelIters = Number(process.argv[3] || 2);
const result = Demo.benchmark({ iters: iters, pixelIters: pixelIters });
console.log("layers " + result.layers + " z " + result.zMin + ".." + result.zMax + " units " + result.units + " view " + result.viewTiles.join("x"));
console.log("| case | scale | light | frame ms | buffer bytes |");
console.log("|---|---:|---|---:|---:|");
for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows[i];
    console.log("| " + row.id + " | " + row.scale + " | " + row.lightMode + " | " + row.frameMs + " | " + row.bufferBytes + " |");
}
