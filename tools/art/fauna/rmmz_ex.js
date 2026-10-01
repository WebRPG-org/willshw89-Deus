// Cut each species' RMMZ example: the stock 3x4 character block it replaces (or the nearest stock creature), at 1x. Writes rmmz/<species>.png
const { readPNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_read.js");
const { writePNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_util.js");
const fs = require("fs"); fs.mkdirSync(__dirname + "/rmmz", { recursive: true });
const D = "C:/Program Files (x86)/Steam/steamapps/common/RPG Maker MZ/newdata/img/characters/";
const blk = (file, i) => ({ file, x: (i % 4) * 144, y: Math.floor(i / 4) * 192, w: 144, h: 192 });
const big = (file, w, h) => ({ file, x: 0, y: 0, w, h });
const MAP0 = { deer: blk("Vehicle.png", 4), boar: blk("Nature.png", 2), aurochs: blk("Vehicle.png", 4), "wild-horse": blk("Vehicle.png", 4), "wild-sheep": blk("Nature.png", 2), hare: blk("Nature.png", 1), fowl: blk("Nature.png", 1), rat: blk("Nature.png", 1), wolf: blk("Nature.png", 0), fox: blk("Nature.png", 3), wildcat: blk("Nature.png", 1), serpent: blk("Vehicle.png", 2), hawk: blk("Vehicle.png", 2), songbird: blk("Vehicle.png", 2), bat: blk("Vehicle.png", 2), troll: blk("Monster.png", 1), "bog-horror": big("$BigMonster1.png", 288, 384), "restless-dead": blk("Monster.png", 6), "giant-spider": blk("SF_Monster.png", 2), "arctic-fox": blk("Monster.png", 4), jackal: blk("Nature.png", 3), "sand-stalker": blk("SF_Monster.png", 6), "ice-wraith": blk("Monster.png", 5) };
const MAP = MAP0; for (const [k, m] of Object.entries(MAP)) { const p = readPNG(D + m.file), b = Buffer.alloc(m.w * m.h * 4);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const q = p.px(m.x + x, m.y + y), o = (y * m.w + x) * 4; b[o] = q[0]; b[o + 1] = q[1]; b[o + 2] = q[2]; b[o + 3] = q[3] === undefined ? 255 : q[3]; }
  writePNG(__dirname + "/rmmz/" + k + ".png", m.w, m.h, b); }
fs.writeFileSync(__dirname + "/rmmz/sources.json", JSON.stringify(Object.fromEntries(Object.entries(MAP).map(([k, m]) => [k, m.file + " @" + m.x + "," + m.y + " " + m.w + "x" + m.h])), null, 1));
console.log(Object.keys(MAP).length, "RMMZ examples");
