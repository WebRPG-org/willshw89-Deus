#!/usr/bin/env node
'use strict';

/**
 * tools/art/induct_all_ground_tiles.js
 *
 * Places the ground set table from both Owner backup batches. Missing dry and
 * damp variants borrow their placed base block. The two base grasses come
 * from the Owner masters carried over from lane-cy.
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

const KEPT = require('./ground_kept_sets.json');
const ALLOWED = new Set(KEPT.allowedIds);
const SPECS = KEPT.specs;
const OUTSIDE_SLOTS = KEPT.expectedOutsideSlots;
const DUNGEON_SLOTS = KEPT.expectedDungeonSlots;
const GALLERY_SLOTS = KEPT.expectedGallerySlots;
const STAND_INS = [
  'Outside A2 slot 6 dry_grass_dry uses newly placed dry_grass_base block',
  'Dungeon A2 slots 3 and 4 peak_rock_dry/damp use newly placed peak_rock_base block',
  'Outside A2 slot 16 swamp_mud_base retains the main pixels: no kept base set',
  'Dungeon A2 slot 6 swamp_mud_dry retains its stock block (PM exception): no kept base set, and a blank autotile draws nothing',
  'Dungeon A2 slot 1 dug_earth retains its stock block: no kept set'
];
const OWNER_MASTERS = {
  meadow: {folder:'SURFACE_SHARED_TERRAIN_MEADOW_V1_DEFAULT',edge:'#26421C',hi:'#5D7139'},
  tropical_grass: {folder:'SURFACE_SHARED_TERRAIN_TROPICAL-GRASS_V1_DEFAULT',edge:'#1B3B18',hi:'#6E8A38'}
};

function sourceFile(id,fillTile) {
  const filename=id+'__'+String(fillTile).padStart(2,'0')+'.png';
  const matches=KEPT.sourceFolders.map(dir=>path.join(dir,filename)).filter(file=>fs.existsSync(file));
  if(matches.length!==1) throw Error('source missing or ambiguous: '+filename);
  return matches[0];
}
function validateSources() {
  if (Object.keys(SPECS).sort().join('|') !== Object.keys(KEPT.selected).sort().join('|')) throw Error('specification/selection mismatch');
  for(const [key,[id,fillTile]] of Object.entries(KEPT.selected)) {
    if(!ALLOWED.has(id) || KEPT.unusedAlternatives.includes(id)) throw Error('unapproved source '+key+': '+id);
    if(fillTile!==0 && fillTile!==15) throw Error('not a solid terrain tile: '+key);
    sourceFile(id,fillTile);
  }
}
function selectedTile(key) {
  const [id,fillTile]=KEPT.selected[key];
  const file=sourceFile(id,fillTile);
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
function ownerMasterTile(key) {
  const file=path.join(ROOT,'art/masters/source_sets',OWNER_MASTERS[key].folder,'variant_0.png');
  const img=decodePNG(fs.readFileSync(file));
  if(img.width!==48 || img.height!==48) throw Error('Owner master dimensions: '+file);
  return Buffer.from(img.data);
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
    const dir=path.join(ROOT,'art/masters/source_sets',spec.canonicalId);
    fs.mkdirSync(dir,{recursive:true});
    writePNG(path.join(dir,'variant_0.png'),48,48,tile);
    fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({
      canonicalId:spec.canonicalId,name:key,date:'2026-10-01',author:'Owner (PixelLab)',
      pixellabId:id,fillTile,palette:'deus_master_world_palette_v1.hex',
      dimensions:{width:48,height:48},sourceFolder:path.dirname(sourceFile(id,fillTile)),
      status:'EXISTING_UNAPPROVED',
      statusWhy:'Owner source selected for lane-cy2 induction; independent review pending',
      ...(key==='cave_floor' ? {runtime:{kind:'RMMZ_TILESET',file:'img/tilesets/Dungeon_A2.png',tileId:2816}} : {})
    },null,2)+'\n');
    console.log('SOURCE',key,id,fillTile);
  }
  for(const [key,spec] of Object.entries(OWNER_MASTERS)) {
    tiles[key]=ownerMasterTile(key);
    blocks[key]=buildA2Block(tiles[key],spec.edge,spec.hi);
    console.log('OWNER_MASTER',key,spec.folder);
  }
  const outside=baseline('Outside_A2.png');
  const dungeon=baseline('Dungeon_A2.png');
  for(const [slot,key] of Object.entries(OUTSIDE_SLOTS)) {
    if(!key)continue;
    const n=Number(slot);blit(outside,768,blocks[key],96,(n%8)*96,Math.floor(n/8)*144,96,144);
  }
  for(const [slot,key] of Object.entries(DUNGEON_SLOTS)) {
    if(!key)continue;
    const n=Number(slot);blit(dungeon,768,blocks[key],96,(n%8)*96,Math.floor(n/8)*144,96,144);
  }
  const outDir=path.join(ROOT,'game/img/tilesets');
  writePNG(path.join(outDir,'Outside_A2.png'),768,576,outside);
  writePNG(path.join(outDir,'Dungeon_A2.png'),768,576,dungeon);
  const gallery=Buffer.alloc(768*768*4);
  for(const [index,key] of Object.entries(GALLERY_SLOTS)) {
    const i=Number(index),x=(i%8)*48,y=Math.floor(i/8)*48;
    blit(gallery,768,tiles[key],48,x,y,48,48);
  }
  writePNG(path.join(outDir,'DEUS_GroundVar_D.png'),768,768,gallery);
  writePNG(path.join(outDir,'Outside_D.png'),768,768,gallery);
  STAND_INS.forEach(line=>console.log('STAND_IN',line));
  console.log('Inducted '+Object.keys(SPECS).length+' table-selected sets from both Owner backup folders; 2 alternatives unused.');
}
if(require.main===module)build();
module.exports={build,selectedTile,buildA2Block,SPECS,OUTSIDE_SLOTS,DUNGEON_SLOTS,GALLERY_SLOTS,STAND_INS};
