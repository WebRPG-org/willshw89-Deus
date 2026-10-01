// The two long animals refused by PixelLab's 20-job limit on the first try (see regen2_jobs.js).
module.exports = require("./regen2_jobs.js").filter(j => ["spider-f", "sand-stalker-f"].includes(j.tag));
