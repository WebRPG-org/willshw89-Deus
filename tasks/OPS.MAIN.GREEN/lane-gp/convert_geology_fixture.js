// lane-gp: re-key the geology reference census by object id instead of numeric typeId.
// Run once (node tasks/OPS.MAIN.GREEN/lane-gp/convert_geology_fixture.js) from the repository root.
// typeIds at the reference commit: 1..87 = the catalogue's objects in order, 88..96 = the nine war banners in the
// order DEUS_Objects.js appends them. Both lists are read from the reference commit itself, not from today's files.
"use strict";
const fs = require("fs");
const cp = require("child_process");
const FIXTURE = "tools/zrange/fixtures/geology_304ca7b2_seed18.json";
const REF = "304ca7b2";
const show = p => cp.execFileSync("git", ["show", `${REF}:${p}`], { encoding: "utf8", maxBuffer: 1 << 28 });

const catalogueIds = JSON.parse(show("game/data/DEUS_WorldCatalog.json")).objects.map(o => o.id);
const src = show("game/js/plugins/DEUS_Objects.js");
const block = src.slice(src.indexOf("const BANNER_SPECIES = ["), src.indexOf("for (const b of BANNER_SPECIES)"));
const bannerIds = [...block.matchAll(/id:\s*"([a-z_]+)"/g)].map(m => m[1]);
if (catalogueIds.length !== 87 || bannerIds.length !== 9) throw new Error(`unexpected counts: ${catalogueIds.length} catalogue objects, ${bannerIds.length} banners`);
const names = catalogueIds.concat(bannerIds);              // names[typeId - 1]

const data = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
let converted = 0;
for (const cfg of Object.keys(data.configs)) {
    for (const part of ["census", "censusAfter"]) {
        const census = data.configs[cfg][part];
        if (!census || !census.objects) continue;
        const out = {};
        for (const k of Object.keys(census.objects)) {
            const name = names[Number(k) - 1];
            if (!name) throw new Error(`${cfg}.${part}: typeId ${k} has no name`);
            if (name in out) throw new Error(`${cfg}.${part}: two typeIds map to ${name}`);
            out[name] = census.objects[k]; converted++;
        }
        census.objects = out;
    }
}
data.objectKeys = "object id (was numeric typeId until lane-gp; typeIds 1..87 were the catalogue in order and 88..96 the nine war banners)";
fs.writeFileSync(FIXTURE, JSON.stringify(data, null, 1) + "\n");
console.log(`converted ${converted} object counts in ${Object.keys(data.configs).join(", ")}`);
