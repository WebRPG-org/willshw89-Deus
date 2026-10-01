// Collect every launched character whose rotations are not on disk yet (ids.txt), skipping ones still creating or deleted.
// Prints: collected / still creating / failed or deleted. Safe to run repeatedly. Usage: node collect_all.js
const fs = require("fs"), https = require("https"), pl = require("./pl.js"), D = __dirname;
const get = u => new Promise((res, rej) => https.get(u, r => { if (r.statusCode >= 300 && r.headers.location) return get(r.headers.location).then(res, rej); const c = []; r.on("data", d => c.push(d)); r.on("end", () => res(Buffer.concat(c))); }).on("error", rej));
const pairs = [...new Map((fs.readFileSync(D + "/ids.txt", "utf8").match(/[a-z0-9-]+=[0-9a-f-]{36}/g) || []).map(s => s.split("="))).entries()];
(async () => { const got = [], wait = [], bad = [];
  for (const [tag, id] of pairs) { if (fs.existsSync(D + "/chars/" + tag + "/south.png")) continue;
    const t = pl.text(await pl("get_character", { character_id: id }));
    if (/not found/i.test(t)) { bad.push(tag + " (deleted or gone)"); continue; }
    if (!/status: completed/.test(t)) { wait.push(tag + " " + ((t.match(/\((\d+%)/) || [])[1] || (t.match(/status: (\w+)/) || [])[1] || "?")); continue; }
    const rots = [...t.matchAll(/^\s+(south|east|north|west|south-east|north-east|north-west|south-west): (https:\S+)/gm)]; if (rots.length < 8) { bad.push(tag + " (completed with " + rots.length + " rotations)"); continue; }
    const dir = D + "/chars/" + tag; fs.mkdirSync(dir, { recursive: true }); let ok = true;
    for (const [, d, u] of rots) { let buf; for (let k = 0; k < 6; k++) { buf = await get(u); if (buf.slice(1, 4).toString() === "PNG") break; await new Promise(r => setTimeout(r, 4000)); } if (buf.slice(1, 4).toString() !== "PNG") { ok = false; break; } fs.writeFileSync(dir + "/" + d + ".png", buf); }
    if (ok) { fs.writeFileSync(dir + "/meta.json", JSON.stringify({ tag, id, size: (t.match(/size: (\S+)/) || [])[1], view: (t.match(/view: (.+)/) || [])[1], directions: 8 }, null, 1)); got.push(tag); } else bad.push(tag + " (download failed)"); }
  console.log("collected " + got.length + ": " + got.join(" ")); console.log("still creating " + wait.length + ": " + wait.join(", ")); console.log("failed/deleted " + bad.length + ": " + bad.join(", ")); })();
