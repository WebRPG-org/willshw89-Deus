
const fs = require("fs");
const file = "game/js/plugins/DEUS_Levels.js";
let code = fs.readFileSync(file, "utf8");
code = code.replace(
    "if (b.outer) { rdM = b.dir ? AIR_CELL : STONE_CELL; rdO = 0; rdC = 0; return; }",
    "if (b.outer) { rdM = b.z < CORE.zMin ? STONE_CELL : AIR_CELL; rdO = 0; rdC = 0; return; }"
);
fs.writeFileSync(file, code);

