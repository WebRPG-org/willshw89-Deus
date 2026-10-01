#!/usr/bin/env node
'use strict';

/**
 * tools/art/induct_all_ground_tiles.js
 *
 * Inducts only the Owner's selected 2026-10-01 Tiles Pro sets. Uncovered
 * game slots retain their pre-lane pixels. The gallery holds the 13 selected
 * source swatches, and each source set receives a palette-snapped master.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { decodePNG } = require('../png_read');
const { writePNG } = require('../png_util');

const ROOT = path.resolve(__dirname, '../..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'deus_master_world_palette_v1.hex');
const ALT_PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'uf.hex');

// 1. Palette loading & CIELAB color snapping
function parseHex(s) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(s).trim());
    return m ? [(parseInt(m[1], 16) >> 16) & 255, (parseInt(m[1], 16) >> 8) & 255, parseInt(m[1], 16) & 255] : null;
}

function srgbToLab(r, g, b) {
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const R = lin(r), G = lin(g), B = lin(b);
    const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    const Y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
    const Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
    const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (t * 24389 / 27 + 16) / 116);
    const fx = f(X), fy = f(Y), fz = f(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const palFileToUse = fs.existsSync(PALETTE_FILE) ? PALETTE_FILE : ALT_PALETTE_FILE;
const hexLines = fs.readFileSync(palFileToUse, 'utf8').split(/\r?\n/).filter(s => s.trim().startsWith('#'));
const palRGB = hexLines.map(parseHex).filter(Boolean);
const palLab = palRGB.map(c => srgbToLab(...c));
const snapCache = new Map();

function snap(r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    if (snapCache.has(key)) return snapCache.get(key);
    const l = srgbToLab(r, g, b);
    let best = palRGB[0], bd = Infinity;
    for (let i = 0; i < palLab.length; i++) {
        const d = Math.hypot(l[0] - palLab[i][0], l[1] - palLab[i][1], l[2] - palLab[i][2]);
        if (d < bd) { bd = d; best = palRGB[i]; }
    }
    snapCache.set(key, best);
    return best;
}

function snapHex(hex) {
    const rgb = parseHex(hex);
    return snap(rgb[0], rgb[1], rgb[2]);
}

// 2. Seamless 48x48 wrap filter
function makeSeamless(tile, w = 48, h = 48, blend = 4) {
    const out = Buffer.from(tile);
    const B = Math.min(blend, Math.floor(w / 4));

    for (let y = 0; y < h; y++) {
        for (let c = 0; c < 3; c++) {
            const left0 = out[(y * w + 0) * 4 + c];
            const right0 = out[(y * w + (w - 1)) * 4 + c];
            const diff = left0 - right0;
            for (let i = 0; i < B; i++) {
                const u = i / B;
                const s = 1.0 - (3.0 * u * u - 2.0 * u * u * u);
                const weight = 0.5 * s;
                const leftIdx = (y * w + i) * 4 + c;
                const rightIdx = (y * w + (w - 1 - i)) * 4 + c;
                out[leftIdx] = Math.max(0, Math.min(255, Math.round(out[leftIdx] - diff * weight)));
                out[rightIdx] = Math.max(0, Math.min(255, Math.round(out[rightIdx] + diff * weight)));
            }
        }
    }

    for (let x = 0; x < w; x++) {
        for (let c = 0; c < 3; c++) {
            const top0 = out[(0 * w + x) * 4 + c];
            const bot0 = out[((h - 1) * w + x) * 4 + c];
            const diff = top0 - bot0;
            for (let i = 0; i < B; i++) {
                const u = i / B;
                const s = 1.0 - (3.0 * u * u - 2.0 * u * u * u);
                const weight = 0.5 * s;
                const topIdx = (i * w + x) * 4 + c;
                const botIdx = ((h - 1 - i) * w + x) * 4 + c;
                out[topIdx] = Math.max(0, Math.min(255, Math.round(out[topIdx] - diff * weight)));
                out[botIdx] = Math.max(0, Math.min(255, Math.round(out[botIdx] + diff * weight)));
            }
        }
    }
    return out;
}

// Bayer 8x8 micro-dither matrix
const BAYER8 = [
    [ 0.0/64, 32.0/64,  8.0/64, 40.0/64,  2.0/64, 34.0/64, 10.0/64, 42.0/64],
    [48.0/64, 16.0/64, 56.0/64, 24.0/64, 50.0/64, 18.0/64, 58.0/64, 26.0/64],
    [12.0/64, 44.0/64,  4.0/64, 36.0/64, 14.0/64, 46.0/64,  6.0/64, 38.0/64],
    [60.0/64, 28.0/64, 52.0/64, 20.0/64, 62.0/64, 30.0/64, 54.0/64, 22.0/64],
    [ 3.0/64, 35.0/64, 11.0/64, 43.0/64,  1.0/64, 33.0/64,  9.0/64, 41.0/64],
    [51.0/64, 19.0/64, 59.0/64, 27.0/64, 49.0/64, 17.0/64, 57.0/64, 25.0/64],
    [15.0/64, 47.0/64,  7.0/64, 39.0/64, 13.0/64, 45.0/64,  5.0/64, 37.0/64],
    [63.0/64, 31.0/64, 55.0/64, 23.0/64, 61.0/64, 29.0/64, 53.0/64, 21.0/64]
];

// 3. Build 96x144 A2 Autotile Block from a 48x48 base tile with organic boundary
function buildA2Block(baseTile, edgeColorHex, highlightHex) {
    const block = Buffer.alloc(96 * 144 * 4);
    const edgeColor = snapHex(edgeColorHex);
    const highlightColor = snapHex(highlightHex);

    for (let sy = 0; sy < 6; sy++) {
        for (let sx = 0; sx < 4; sx++) {
            const baseTx = (sx % 2 === 0) ? 0 : 24;
            const baseTy = (sy % 2 === 0) ? 0 : 24;

            for (let ly = 0; ly < 24; ly++) {
                for (let lx = 0; lx < 24; lx++) {
                    const srcX = baseTx + lx;
                    const srcY = baseTy + ly;
                    const si = (srcY * 48 + srcX) * 4;
                    let r = baseTile[si];
                    let g = baseTile[si + 1];
                    let b = baseTile[si + 2];

                    let d = 999.0;
                    if (sx === 0 && sy === 2) d = Math.hypot(lx + 0.5, ly + 0.5);
                    else if (sx === 3 && sy === 2) d = Math.hypot(23.5 - lx, ly + 0.5);
                    else if (sx === 0 && sy === 5) d = Math.hypot(23.5 - ly, lx + 0.5);
                    else if (sx === 3 && sy === 5) d = Math.hypot(23.5 - lx, 23.5 - ly);
                    else if (sy === 2 && (sx === 1 || sx === 2)) {
                        const localX = (sx === 1 ? lx : 24 + lx);
                        const w = Math.sin(localX * (Math.PI / 24)) * 1.2 + Math.cos(localX * (Math.PI / 12)) * 0.6;
                        d = (ly + 0.5 + w) - 6.5;
                    } else if (sy === 5 && (sx === 1 || sx === 2)) {
                        const localX = (sx === 1 ? lx : 24 + lx);
                        const w = Math.sin(localX * (Math.PI / 24)) * 1.2 + Math.cos(localX * (Math.PI / 12)) * 0.6;
                        d = (23.5 - ly + w) - 6.5;
                    } else if (sx === 0 && (sy === 3 || sy === 4)) {
                        const localY = (sy === 3 ? ly : 24 + ly);
                        const w = Math.sin(localY * (Math.PI / 24)) * 1.2 + Math.cos(localY * (Math.PI / 12)) * 0.6;
                        d = (lx + 0.5 + w) - 6.5;
                    } else if (sx === 3 && (sy === 3 || sy === 4)) {
                        const localY = (sy === 3 ? ly : 24 + ly);
                        const w = Math.sin(localY * (Math.PI / 24)) * 1.2 + Math.cos(localY * (Math.PI / 12)) * 0.6;
                        d = (23.5 - lx + w) - 6.5;
                    } else if (sx === 2 && sy === 0) {
                        d = Math.hypot(lx + 0.5, ly + 0.5) - 6.5;
                    } else if (sx === 3 && sy === 0) {
                        d = Math.hypot(23.5 - lx, ly + 0.5) - 6.5;
                    } else if (sx === 2 && sy === 1) {
                        d = Math.hypot(lx + 0.5, 23.5 - ly) - 6.5;
                    } else if (sx === 3 && sy === 1) {
                        d = Math.hypot(23.5 - lx, 23.5 - ly) - 6.5;
                    } else if (sx === 0 && sy === 0) {
                        d = 17.0 - Math.hypot(23.5 - lx, 23.5 - ly);
                    } else if (sx === 1 && sy === 0) {
                        d = 17.0 - Math.hypot(lx + 0.5, 23.5 - ly);
                    } else if (sx === 0 && sy === 1) {
                        d = 17.0 - Math.hypot(23.5 - lx, ly + 0.5);
                    } else if (sx === 1 && sy === 1) {
                        d = 17.0 - Math.hypot(lx + 0.5, ly + 0.5);
                    }

                    const bayer = BAYER8[ly & 7][lx & 7];
                    if (d <= -0.5) {
                        r = edgeColor[0]; g = edgeColor[1]; b = edgeColor[2];
                    } else if (d <= 2.5) {
                        const t = (d - (-0.5)) / 3.0;
                        const useEdge = (t + (bayer - 0.5) * 0.70) < 0.40;
                        if (useEdge) {
                            r = edgeColor[0]; g = edgeColor[1]; b = edgeColor[2];
                        } else {
                            const useHi = (t + (bayer - 0.5) * 0.70) < 0.75;
                            if (useHi) {
                                r = highlightColor[0]; g = highlightColor[1]; b = highlightColor[2];
                            }
                        }
                    }

                    const px = sx * 24 + lx;
                    const py = sy * 24 + ly;
                    const di = (py * 96 + px) * 4;
                    block[di] = r;
                    block[di + 1] = g;
                    block[di + 2] = b;
                    block[di + 3] = 255;
                }
            }
        }
    }
    return block;
}

// Only the Owner's 2026-10-01 Tiles Pro folder is an input to this induction.
// Earlier game pixels are preserved where this limited source batch has no set.
const KEPT = require('./ground_kept_sets.json');
const SOURCE_DIR = KEPT.sourceFolder;
const ALLOWED = new Set(KEPT.allowedIds);
const SPECS = {
  dry_grass_damp: { id:'SURFACE_SHARED_TERRAIN_DRY-GRASS_V1_DEFAULT', edge:'#6A5310', hi:'#B09430' },
  forest_floor_damp: { id:'SURFACE_SHARED_TERRAIN_FOREST-FLOOR_V1_DEFAULT', edge:'#261811', hi:'#5B3A26' },
  needle_floor_damp: { id:'SURFACE_SHARED_TERRAIN_NEEDLE-FLOOR_V1_DEFAULT', edge:'#1B110B', hi:'#462C18' },
  sand_damp: { id:'SURFACE_SHARED_TERRAIN_SAND_V1_DEFAULT', edge:'#6E5536', hi:'#B89C72' },
  sand_dry: { id:'SURFACE_SHARED_TERRAIN_SAND_V3_DEFAULT', edge:'#B2936B', hi:'#F6DEC0' },
  stony_dry: { id:'SURFACE_SHARED_TERRAIN_STONY_V3_DEFAULT', edge:'#625852', hi:'#B2A69E' },
  rock_damp: { id:'SURFACE_SHARED_TERRAIN_ROCK_V1_DEFAULT', edge:'#292929', hi:'#626262' },
  marsh_mud_base: { id:'SURFACE_SHARED_TERRAIN_MUD_V2_DEFAULT', edge:'#3D281D', hi:'#7D5843' },
  marsh_mud_dry: { id:'SURFACE_SHARED_TERRAIN_MUD_V3_DEFAULT', edge:'#503527', hi:'#9B7157' },
  dirt_damp: { id:'SURFACE_SHARED_TERRAIN_DIRT_V1_DEFAULT', edge:'#322213', hi:'#664A2E' },
  dirt_dry: { id:'SURFACE_SHARED_TERRAIN_DIRT_V3_DEFAULT', edge:'#4D361F', hi:'#8C6741' },
  road_trail: { id:'SURFACE_SHARED_TERRAIN_ROAD_A2_DEFAULT', edge:'#75583B', hi:'#C09C72' },
  cave_floor: { id:'ALL_SHARED_TERRAIN_CAVE-FLOOR_A2_DEFAULT', edge:'#2A2A2E', hi:'#62626A' }
};

const OUTSIDE_SLOTS = {
  7:'dry_grass_damp', 15:'marsh_mud_base', 18:'dirt_damp', 19:'dirt_dry',
  20:'forest_floor_damp', 22:'road_trail', 24:'sand_damp', 25:'sand_dry', 28:'rock_damp'
};
const DUNGEON_SLOTS = {
  0:'cave_floor', 5:'stony_dry', 7:'marsh_mud_dry', 9:'rock_damp',
  12:'dirt_damp', 14:'sand_damp'
};
// Keep lane-cy's D swatch positions so existing tile IDs retain their meanings.
const GALLERY_SLOTS = {
  dry_grass_damp:3, forest_floor_damp:9, needle_floor_damp:12,
  sand_damp:15, sand_dry:16, stony_dry:19, rock_damp:21,
  marsh_mud_base:26, marsh_mud_dry:28, dirt_damp:33, dirt_dry:34,
  road_trail:38, cave_floor:39
};
const STAND_INS = [
  'Outside A2 slot 6 dry_grass_dry uses the existing dry_grass_base block at slot 2',
  'Outside A2 unselected base and variant slots retain the pre-lane pixels, including transparent slots',
  'Dungeon A2 peak_rock_damp/dry, swamp_mud_dry and dug_earth retain the pre-lane stock blocks'
];

function validateSources() {
  const actual = fs.readdirSync(SOURCE_DIR).filter(f=>f.endsWith('.txt')).map(f=>f.slice(0,-4)).sort();
  if (actual.length !== 15 || actual.some((id,i)=>id!==[...ALLOWED].sort()[i])) throw Error('source folder differs from the 15-ID allowlist');
  if (Object.keys(SPECS).sort().join('|') !== Object.keys(KEPT.selected).sort().join('|')) throw Error('specification/selection mismatch');
  for(const [key,[id,fillTile]] of Object.entries(KEPT.selected)) {
    if(!ALLOWED.has(id) || KEPT.unusedAlternatives.includes(id)) throw Error('unapproved source '+key+': '+id);
    if(fillTile!==0 && fillTile!==15) throw Error('not a solid terrain tile: '+key);
    const image=path.join(SOURCE_DIR, id+'__'+String(fillTile).padStart(2,'0')+'.png');
    if(!fs.existsSync(image)) throw Error('missing source: '+image);
  }
}
function selectedTile(key) {
  const [id,fillTile]=KEPT.selected[key];
  const file=path.join(SOURCE_DIR,id+'__'+String(fillTile).padStart(2,'0')+'.png');
  const img=decodePNG(fs.readFileSync(file));
  if(img.width!==48 || img.height!==48) throw Error('source dimensions: '+file);
  const seamless=makeSeamless(img.data);
  const tile=Buffer.alloc(48*48*4);
  for(let i=0;i<tile.length;i+=4) {
    const rgb=snap(seamless[i],seamless[i+1],seamless[i+2]);
    tile[i]=rgb[0];tile[i+1]=rgb[1];tile[i+2]=rgb[2];tile[i+3]=255;
  }
  return tile;
}
function blit(dst,dstWidth,src,srcWidth,x0,y0,w,h) {
  for(let y=0;y<h;y++)src.copy(dst,((y0+y)*dstWidth+x0)*4,y*srcWidth*4,(y*srcWidth+w)*4);
}
function baseline(name) {
  // Fixed lane opening SHA is the pre-induction game. It remains available in gate clones.
  const bytes=cp.execFileSync('git',['show','a5255704:game/img/tilesets/'+name],{cwd:ROOT,maxBuffer:8*1024*1024});
  const img=decodePNG(bytes);
  if(img.width!==768 || img.height!==576) throw Error('baseline dimensions: '+name);
  return Buffer.from(img.data);
}
function build() {
  validateSources();
  const tiles={},blocks={};
  for(const key of Object.keys(SPECS)) {
    const spec=SPECS[key], [id,fillTile]=KEPT.selected[key];
    const tile=selectedTile(key);
    tiles[key]=tile; blocks[key]=buildA2Block(tile,spec.edge,spec.hi);
    const dir=path.join(ROOT,'art/masters/source_sets',spec.id);
    fs.mkdirSync(dir,{recursive:true});
    writePNG(path.join(dir,'variant_0.png'),48,48,tile);
    fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({
      canonicalId:spec.id,name:key,date:'2026-10-01',author:'Owner (PixelLab)',
      pixellabId:id,fillTile,palette:'deus_master_world_palette_v1.hex',
      dimensions:{width:48,height:48},sourceFolder:SOURCE_DIR,
      status:'EXISTING_UNAPPROVED',
      statusWhy:'Owner source selected for lane-cy2 induction; independent review pending',
      ...(key==='cave_floor' ? {runtime:{kind:'RMMZ_TILESET',file:'img/tilesets/Dungeon_A2.png',tileId:2816}} : {})
    },null,2)+'\n');
    console.log('SOURCE',key,id,fillTile);
  }
  const outside=baseline('Outside_A2.png');
  const dungeon=baseline('Dungeon_A2.png');
  for(const [slot,key] of Object.entries(OUTSIDE_SLOTS)) {
    const n=Number(slot);blit(outside,768,blocks[key],96,(n%8)*96,Math.floor(n/8)*144,96,144);
  }
  // The dry variant has no set in the 2026-10-01 folder; use the base block already in the game.
  const base=Buffer.alloc(96*144*4);
  for(let y=0;y<144;y++)outside.copy(base,y*96*4,(y*768+2*96)*4,(y*768+3*96)*4);
  blit(outside,768,base,96,6*96,0,96,144);
  for(const [slot,key] of Object.entries(DUNGEON_SLOTS)) {
    const n=Number(slot);blit(dungeon,768,blocks[key],96,(n%8)*96,Math.floor(n/8)*144,96,144);
  }
  const outDir=path.join(ROOT,'game/img/tilesets');
  writePNG(path.join(outDir,'Outside_A2.png'),768,576,outside);
  writePNG(path.join(outDir,'Dungeon_A2.png'),768,576,dungeon);
  const gallery=Buffer.alloc(768*768*4);
  Object.entries(GALLERY_SLOTS).forEach(([key,i])=>{const x=(i%8)*48,y=Math.floor(i/8)*48;blit(gallery,768,tiles[key],48,x,y,48,48);});
  writePNG(path.join(outDir,'DEUS_GroundVar_D.png'),768,768,gallery);
  writePNG(path.join(outDir,'Outside_D.png'),768,768,gallery);
  STAND_INS.forEach(line=>console.log('STAND_IN',line));
  console.log('Inducted '+Object.keys(SPECS).length+' selected sets from the 2026-10-01 folder; 2 alternatives unused.');
}
if(require.main===module)build();
module.exports={build,selectedTile,buildA2Block,SPECS,OUTSIDE_SLOTS,DUNGEON_SLOTS,GALLERY_SLOTS,STAND_INS};
