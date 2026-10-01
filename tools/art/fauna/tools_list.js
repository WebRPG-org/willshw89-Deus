// List the PixelLab MCP tools and print the full schema of the named ones. Usage: node tools_list.js [name ...]
const fs = require("fs"), https = require("https");
const token = fs.readFileSync("C:/Users/snewt/OneDrive/Desktop/UF/.pixellab_token", "utf8").trim();
function rpc(method, params) { return new Promise((res, rej) => { const req = https.request("https://api.pixellab.ai/mcp", { method: "POST", headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json", "Accept": "application/json, text/event-stream" } }, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => { for (const l of d.split("\n")) if (l.startsWith("data: ")) { try { const j = JSON.parse(l.slice(6)); if (j.result !== undefined) return res(j.result); } catch (e) {} } try { res(JSON.parse(d).result); } catch (e) { res({ raw: d.slice(0, 500) }); } }); }); req.on("error", rej); req.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })); req.end(); }); }
(async () => { const r = await rpc("tools/list", {}); const want = process.argv.slice(2);
  for (const t of r.tools || []) { if (!want.length) console.log(t.name, "-", (t.description || "").split("\n")[0].slice(0, 110)); else if (want.includes(t.name)) console.log(JSON.stringify(t, null, 1)); }
  if (!r.tools) console.log(JSON.stringify(r).slice(0, 500)); })();
