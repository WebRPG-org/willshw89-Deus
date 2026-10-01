// Launch fauna jobs. Usage: node launch.js <from> <to>  (indices into fauna_jobs.js). Prints tag=id pairs for fetch_char.js.
const pl = require("./pl.js"), J = require(process.env.JOBS || "./fauna_jobs.js"), [a, b] = process.argv.slice(2).map(Number), fs = require("fs");
(async () => { const ids = []; for (const j of J.slice(a, b)) { if (j.args.description.length > 2000) throw new Error(j.tag + " too long");
  const t = pl.text(await pl("create_character", j.args)); const id = (t.match(/^id: (\S+)/m) || [])[1]; console.log(j.tag, id || t.slice(0, 300), (t.match(/mode: .*/) || [""])[0]); if (id) ids.push(j.tag + "=" + id); }
  fs.appendFileSync(__dirname + "/ids.txt", ids.join(" ") + "\n"); console.log(ids.join(" ")); })();
