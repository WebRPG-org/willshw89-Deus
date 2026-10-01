"use strict";
// Evidence-only preload: copy the NW.js gate output immediately before its normal
// cleanup. Do not alter test arguments, results, exit codes, or cleanup behavior.
const fs = require("fs");
const os = require("os");
const path = require("path");
const originalRm = fs.rmSync;
const destination = process.env.WG0044_CAPTURE_DIR;
if (!destination) throw new Error("WG0044_CAPTURE_DIR is required");
fs.rmSync = function (target, options) {
    const full = typeof target === "string" ? path.resolve(target) : "";
    if (path.dirname(full) === path.resolve(os.tmpdir()) &&
        /^wg0044-nw-[A-Za-z0-9]+$/.test(path.basename(full)) && options && options.recursive) {
        const game = path.join(full, "game");
        fs.mkdirSync(destination, { recursive: true });
        for (const file of ["test_output", "game_runtime.log"]) {
            const source = path.join(game, file);
            if (fs.existsSync(source)) fs.cpSync(source, path.join(destination, file), { recursive: true });
        }
        fs.writeFileSync(path.join(destination, "snapshot_path.txt"), full + "\n");
    }
    return originalRm.apply(this, arguments);
};
