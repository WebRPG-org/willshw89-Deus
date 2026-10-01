// Owner 2026-10-01: "Any that I flat out dislike I am going to delete" (and "Im just gooing to delete any generations I dont like").
// A character missing from the Owner's PixelLab list is a rejection: write deleted.json (tag -> id) and print it. Run before every
// council packet, board and placement. Read-only against PixelLab (list_characters only).
const fs = require("fs"), pl = require("./pl.js");
(async () => { let txt = "", off = 0; for (;;) { const t = pl.text(await pl("list_characters", { limit: 50, offset: off })); txt += t; const m = t.match(/showing \d+-(\d+) of (\d+)/); if (!m || +m[1] >= +m[2]) break; off = +m[1]; }
  const pairs = (fs.readFileSync(__dirname + "/ids.txt", "utf8").match(/[a-z0-9-]+=[0-9a-f-]{36}/g) || []).map(s => s.split("="));
  const calib = { wolf: "8cf30e75-34c1-4b9c-855e-beb1ebfd5e3b", troll: "be99de8d-af0c-43da-9a1f-7bb3992aff06", spider: "5e5183f7-50ca-4986-9681-4afab888fbdc" };
  const all = pairs.concat(Object.entries(calib)), gone = Object.fromEntries(all.filter(([, id]) => !txt.includes(id)));
  fs.writeFileSync(__dirname + "/deleted.json", JSON.stringify(gone, null, 1));
  console.log("ours " + all.length + ", present " + (all.length - Object.keys(gone).length) + ", deleted (rejected): " + (Object.keys(gone).join(" ") || "none")); })();
