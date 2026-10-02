#!/usr/bin/env node
'use strict';
/**
 * tools/art/contact_sheet_still_charsets.js
 *
 * Evidence for an art-swap lane (DEC-085 item 5): reads the committed game sheets, not the masters, and draws every sprite in
 * tools/art/still_charsets.json the way RMMZ draws it standing: the middle column of the first row of its 3x4 block (the "stand"
 * frame), at 2x, on 3x4 tiles of 48 px, with the sidecar anchor placed on the bottom edge of the middle tile column and marked
 * with one red pixel. The eight blocks of a V8 sheet are drawn one by one. A wrong cell, frame size or anchor shows.
 *
 * Usage: node tools/art/contact_sheet_still_charsets.js <out.png> [<sprite name substring> ...]
 *   With substrings, only sprites whose name contains one of them are drawn.
 */
const fs = require('fs');
const path = require('path');
const { readPNG } = require('../png_read');
const { writePNG } = require('../png_util');

const ROOT = path.join(__dirname, '../..');
const CHARS = path.join(ROOT, 'game/img/characters');
const SCALE = 2, TILE = 48, COLS = 6, PATCH_W = TILE * 3, PATCH_H = TILE * 4, GAP = 8;

const out = process.argv[2];
if (!out) { console.error('usage: node tools/art/contact_sheet_still_charsets.js <out.png> [<sprite name substring> ...]'); process.exit(2); }
const only = process.argv.slice(3);
const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, 'still_charsets.json'), 'utf8'));

const items = [];
for (const m of mapping) {
    if (only.length && !only.some(o => m.sprite.includes(o))) continue;
    const sidecar = JSON.parse(fs.readFileSync(path.join(CHARS, m.sprite + '.json'), 'utf8'));
    const png = readPNG(path.join(CHARS, m.sprite + '.png'));
    const fw = m.frameWidth, fh = m.frameHeight;
    const blocks = m.isV8 ? 8 : 1;
    for (let k = 0; k < blocks; k++) {
        const sx = (k % 4) * 3 * fw + fw, sy = Math.floor(k / 4) * 4 * fh; // stand frame: middle column, first row of the block
        items.push({ png, sx, sy, fw, fh, anchor: sidecar.anchor || [fw / 2, fh - 1] });
    }
}
if (!items.length) { console.error('no sprite matched'); process.exit(2); }

const rows = Math.ceil(items.length / COLS);
const W = COLS * (PATCH_W * SCALE + GAP) + GAP, H = rows * (PATCH_H * SCALE + GAP) + GAP;
const buf = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) { buf[i * 4] = 40; buf[i * 4 + 1] = 44; buf[i * 4 + 2] = 48; buf[i * 4 + 3] = 255; }
const put = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const k = (y * W + x) * 4; buf[k] = c[0]; buf[k + 1] = c[1]; buf[k + 2] = c[2]; };
const dot = (ox, oy, x, y, c) => { for (let j = 0; j < SCALE; j++) for (let i = 0; i < SCALE; i++) put(ox + x * SCALE + i, oy + y * SCALE + j, c); };

items.forEach((it, n) => {
    const ox = GAP + (n % COLS) * (PATCH_W * SCALE + GAP), oy = GAP + Math.floor(n / COLS) * (PATCH_H * SCALE + GAP);
    for (let y = 0; y < PATCH_H; y++) for (let x = 0; x < PATCH_W; x++) {
        const odd = (Math.floor(x / TILE) + Math.floor(y / TILE)) % 2;
        dot(ox, oy, x, y, (x % TILE === 0 || y % TILE === 0) ? [70, 84, 52] : odd ? [92, 108, 66] : [100, 116, 72]);
    }
    const ax = PATCH_W / 2, ay = PATCH_H - 1; // anchor target: centre of the middle tile column, bottom pixel of the bottom tile row
    const dx = ax - it.anchor[0], dy = ay - it.anchor[1];
    for (let y = 0; y < it.fh; y++) for (let x = 0; x < it.fw; x++) {
        const c = it.png.px(it.sx + x, it.sy + y);
        if ((c[3] === undefined ? 255 : c[3]) < 128) continue;
        dot(ox, oy, dx + x, dy + y, c);
    }
    dot(ox, oy, ax, ay, [255, 0, 0]);
});
writePNG(out, W, H, buf);
console.log(`${out}: ${W}x${H}, ${items.length} frame(s) from ${mapping.length} mapping row(s)`);
