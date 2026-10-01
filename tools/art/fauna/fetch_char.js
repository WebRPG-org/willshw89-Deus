// Wait for PixelLab characters to complete and save their 8 rotations. Usage: node fetch_char.js <tag>=<characterId> ...
// Writes chars/<tag>/<direction>.png and appends a genlog line per character (tool, mode, size, cost not itemised by the API).
const fs = require("fs"), https = require("https"), pl = require("./pl.js");
const get = u => new Promise((res, rej) => https.get(u, r => { if (r.statusCode >= 300 && r.headers.location) return get(r.headers.location).then(res, rej); const c = []; r.on("data", d => c.push(d)); r.on("end", () => res(Buffer.concat(c))); }).on("error", rej));
(async () => { for (const a of process.argv.slice(2)) { const [tag, id] = a.split("="), dir = __dirname + "/chars/" + tag; fs.mkdirSync(dir, { recursive: true }); const t0 = Date.now(); let t = "";
  while (Date.now() - t0 < 15 * 60 * 1000) { t = pl.text(await pl("get_character", { character_id: id })); if (/status: completed/.test(t)) break; if (/status: (failed|error)/.test(t)) { console.log(tag, "FAILED", t.slice(0, 300)); break; } await new Promise(r => setTimeout(r, 15000)); }
  const rots = [...t.matchAll(/^\s+(south|east|north|west|south-east|north-east|north-west|south-west): (https:\S+)/gm)];
  for (const [, d, u] of rots) { let buf; for (let k = 0; k < 6; k++) { buf = await get(u); if (buf.slice(1, 4).toString() === "PNG") break; await new Promise(r => setTimeout(r, 4000)); } if (buf.slice(1, 4).toString() !== "PNG") throw new Error(tag + " " + d + " not a PNG after retries"); fs.writeFileSync(dir + "/" + d + ".png", buf); }
  const meta = { tag, id, size: (t.match(/size: (\S+)/) || [])[1], view: (t.match(/view: (.+)/) || [])[1], directions: rots.length };
  fs.writeFileSync(dir + "/meta.json", JSON.stringify(meta, null, 1));
  fs.appendFileSync(__dirname + "/genlog.jsonl", JSON.stringify({ ts: new Date().toISOString(), tool: "create_character", ...meta }) + "\n");
  console.log(tag, rots.length, "rotations", meta.size); } })();
