// Processes PixelLab meadow tile outputs into master source sets and outside autotiles snapped to DEUS master palette.
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('../png_read');
const { writePNG } = require('../png_util');

const ROOT = path.resolve(__dirname, '../..');
const PALETTE_FILE = path.join(ROOT, 'art', 'palette', 'deus_master_world_palette_v1.hex');

// 1. Palette loading & snapping
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

const hexLines = fs.readFileSync(PALETTE_FILE, 'utf8').split(/\r?\n/).filter(s => s.trim().startsWith('#'));
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

// 2. Make seamless (4-way wrap with smoothstep boundary blend)
function makeSeamless(tile, w = 48, h = 48, blend = 4) {
    const out = Buffer.from(tile);
    const B = Math.min(blend, Math.floor(w / 4));

    // Horizontal seamless blend
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

    // Vertical seamless blend
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

// Bayer 8x8 matrix for micro-dithering
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

// Build 96x144 A2 Autotile Block from a 48x48 base tile
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

                    // Natural organic Euclidean boundary with Bayer 8x8 micro-dithering
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

// 3. Process all 6 tiles
const processedVariants = [];
const sourceSetDir = path.join(ROOT, 'art', 'masters', 'source_sets', 'SURFACE_SHARED_TERRAIN_MEADOW_V1_DEFAULT');
fs.mkdirSync(sourceSetDir, { recursive: true });

console.log('Processing 6 PixelLab Meadow tiles...');
for (let s = 0; s < 6; s++) {
    const rawPath = path.join(ROOT, 'art', 'staging', 'pixellab_tilesets', `set_${s}`, 'Seamless_48x48_pixel_art_ground_tile_of_temperate_15.png');
    const rawImg = decodePNG(fs.readFileSync(rawPath));

    // Seamless wrap
    const seamless = makeSeamless(rawImg.data, 48, 48, 4);

    // Palette snap
    const finalBuf = Buffer.alloc(48 * 48 * 4);
    const colSet = new Set();
    for (let i = 0; i < 48 * 48 * 4; i += 4) {
        const c = snap(seamless[i], seamless[i + 1], seamless[i + 2]);
        finalBuf[i] = c[0];
        finalBuf[i + 1] = c[1];
        finalBuf[i + 2] = c[2];
        finalBuf[i + 3] = 255;
        colSet.add((c[0] << 16) | (c[1] << 8) | c[2]);
    }

    processedVariants.push(finalBuf);

    // Save individual master variant
    const varPath = path.join(sourceSetDir, `variant_${s}.png`);
    writePNG(varPath, 48, 48, finalBuf);
    console.log(`Variant ${s}: saved to ${varPath} (Unique DEUS palette colors: ${colSet.size})`);
}

// 4. Build A2 Autotile Block using Base Variant 0 / 3
// Base Meadow tile (Set 0)
const baseMeadowTile = processedVariants[0];
const edgeColor = '#26421C'; // Dark forest olive shadow
const hiColor = '#5D7139';   // Temperate grass highlight
const a2Block = buildA2Block(baseMeadowTile, edgeColor, hiColor);

// Save individual master A2 block
const masterMeadowPath = path.join(ROOT, 'art', 'masters', 'ground_meadow.png');
writePNG(masterMeadowPath, 96, 144, a2Block);
console.log(`Saved master A2 block: ${masterMeadowPath}`);

// 5. Update Outside_A2.png
const outsideA2Path = path.join(ROOT, 'game', 'img', 'tilesets', 'Outside_A2.png');
let outsideA2Img;
if (fs.existsSync(outsideA2Path)) {
    outsideA2Img = decodePNG(fs.readFileSync(outsideA2Path));
} else {
    outsideA2Img = { width: 768, height: 576, data: Buffer.alloc(768 * 576 * 4) };
}

// Copy a2Block into (0, 0) of Outside_A2 (768x576)
for (let y = 0; y < 144; y++) {
    for (let x = 0; x < 96; x++) {
        const si = (y * 96 + x) * 4;
        const di = (y * 768 + x) * 4;
        outsideA2Img.data[di] = a2Block[si];
        outsideA2Img.data[di + 1] = a2Block[si + 1];
        outsideA2Img.data[di + 2] = a2Block[si + 2];
        outsideA2Img.data[di + 3] = a2Block[si + 3];
    }
}
writePNG(outsideA2Path, 768, 576, outsideA2Img.data);
console.log(`Updated Outside_A2.png with authentic meadow autotile at (0, 0)!`);

// 6. Build Ground Variants Sheet DEUS_GroundVar_D.png (768x768)
// Stores ground variants for Layer 1 stamp placement per DEC-045
const groundVarDPath = path.join(ROOT, 'game', 'img', 'tilesets', 'DEUS_GroundVar_D.png');
let groundVarImg;
if (fs.existsSync(groundVarDPath)) {
    try {
        groundVarImg = decodePNG(fs.readFileSync(groundVarDPath));
    } catch (_) {
        groundVarImg = { width: 768, height: 768, data: Buffer.alloc(768 * 768 * 4) };
    }
} else {
    groundVarImg = { width: 768, height: 768, data: Buffer.alloc(768 * 768 * 4) };
}

// Place the 6 meadow variants in Row 0 (Columns 0 to 5)
// In RMMZ sheet D (Tile IDs 512 + row*16 + col):
// Col 0: Variant 0 (Base lush turf)
// Col 1: Variant 1 (Grass with loam patches)
// Col 2: Variant 2 (Fine Karana plains grass)
// Col 3: Variant 3 (Calm rolling turf)
// Col 4: Variant 4 (Sunlit blade tips & tufts)
// Col 5: Variant 5 (Deep shadow thatch)
for (let s = 0; s < 6; s++) {
    const vBuf = processedVariants[s];
    const ox = s * 48;
    const oy = 0;
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const si = (y * 48 + x) * 4;
            const di = ((oy + y) * 768 + (ox + x)) * 4;
            groundVarImg.data[di] = vBuf[si];
            groundVarImg.data[di + 1] = vBuf[si + 1];
            groundVarImg.data[di + 2] = vBuf[si + 2];
            groundVarImg.data[di + 3] = vBuf[si + 3];
        }
    }
}
writePNG(groundVarDPath, 768, 768, groundVarImg.data);
console.log(`Saved DEUS_GroundVar_D.png with 6 meadow variants in Row 0!`);

console.log('SUCCESS: All 6 meadow variants inducted, autotiled, and packed into tilesets.');
