// Run a job list ten at a time (Owner: "Feel free to generate 10 things at a time"): launch 10, wait for all 10, save their 8 rotations,
// check the balance, stop before the credits run below the floor. Usage: node run_batches.js <jobs.js> <floorUSD> [startIndex]
// Appends tag=id to ids.txt, rotations to chars/<tag>/, a line per character to genlog.jsonl, progress to batches.log.
const fs = require("fs"), https = require("https"), path = require("path"), pl = require("./pl.js");
const J = require(path.resolve(process.argv[2])), floor = +process.argv[3], start = +(process.argv[4] || 0), D = __dirname;
const log = s => { console.log(s); fs.appendFileSync(D + "/batches.log", new Date().toISOString() + " " + s + "\n"); };
const get = u => new Promise((res, rej) => https.get(u, r => { if (r.statusCode >= 300 && r.headers.location) return get(r.headers.location).then(res, rej); const c = []; r.on("data", d => c.push(d)); r.on("end", () => res(Buffer.concat(c))); }).on("error", rej));
const credits = async () => +((pl.text(await pl("get_balance", {})).match(/credits: \$([\d.]+)/) || [])[1]);
async function fetchOne(tag, id) { const dir = D + "/chars/" + tag; fs.mkdirSync(dir, { recursive: true }); const t0 = Date.now(); let t = "";
  while (Date.now() - t0 < 20 * 60 * 1000) { t = pl.text(await pl("get_character", { character_id: id })); if (/status: completed/.test(t)) break; await new Promise(r => setTimeout(r, 15000)); }
  if (!/status: completed/.test(t)) { log(tag + " NOT COMPLETED: " + t.slice(0, 120).replace(/\n/g, " ")); return false; }
  const rots = [...t.matchAll(/^\s+(south|east|north|west|south-east|north-east|north-west|south-west): (https:\S+)/gm)];
  for (const [, d, u] of rots) { let buf; for (let k = 0; k < 6; k++) { buf = await get(u); if (buf.slice(1, 4).toString() === "PNG") break; await new Promise(r => setTimeout(r, 4000)); }
    if (buf.slice(1, 4).toString() !== "PNG") { log(tag + " " + d + " not a PNG"); return false; } fs.writeFileSync(dir + "/" + d + ".png", buf); }
  const meta = { tag, id, size: (t.match(/size: (\S+)/) || [])[1], view: (t.match(/view: (.+)/) || [])[1], directions: rots.length };
  fs.writeFileSync(dir + "/meta.json", JSON.stringify(meta, null, 1)); fs.appendFileSync(D + "/genlog.jsonl", JSON.stringify({ ts: new Date().toISOString(), tool: "create_character", ...meta }) + "\n");
  return true; }
(async () => { for (let i = start; i < J.length; i += 10) { const c0 = await credits(); if (!(c0 > floor)) { log("STOP at " + i + ": credits $" + c0 + " <= floor $" + floor); break; }
    const batch = J.slice(i, i + 10), ids = [];
    for (const j of batch) { if (j.args.description.length > 2000) { log(j.tag + " desc too long"); continue; } let t = "", id; for (let k = 0; k < 20; k++) { t = pl.text(await pl("create_character", j.args)); id = (t.match(/^id: (\S+)/m) || [])[1]; if (id || !/rate limit/i.test(t)) break; log(j.tag + " rate-limited, retry in 60 s"); await new Promise(r => setTimeout(r, 60000)); }
      if (!id) { log(j.tag + " LAUNCH FAILED: " + t.slice(0, 200).replace(/\n/g, " ")); continue; } ids.push([j.tag, id]); fs.appendFileSync(D + "/ids.txt", j.tag + "=" + id + "\n"); }
    log("batch " + i + "-" + (i + batch.length - 1) + " launched " + ids.length + " (credits before $" + c0 + ")");
    const ok = await Promise.all(ids.map(([t, id]) => fetchOne(t, id)));
    log("batch " + i + " done: " + ids.filter((x, k) => ok[k]).map(x => x[0]).join(" ") + " | credits after $" + (await credits())); }
  log("ALL DONE"); })().catch(e => log("ERR " + (e && e.stack || e)));
