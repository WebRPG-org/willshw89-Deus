#!/usr/bin/env node
// check_race_schemes.js — readability check for the race colour schemes in docs/art/RACE_OUTFITS.md §3
// (AS-READ-002; Owner 2026-09-29 "Everything should be oriented towards readability").
// Checks: every scheme entry is a master-palette colour; the value accent clears the mean value of every
// typical ground ramp by >= 3 grayscale levels (>= 4 on the Small canvas), AS-READ-001 formula; within one
// canvas tier no two peoples share the identity hue family while their dominant values sit within 2 levels.
// Exit 1 on any breach. Validation tooling, allowed without the Owner under DEC-007 (not art).
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const masterPath = path.join(ROOT, 'art', 'palette', 'deus_master_world_palette_v1.hex');
const registryPath = path.join(ROOT, 'game', 'data', 'DEUS_PaletteRegistry.json');

const master = new Set(fs.readFileSync(masterPath, 'utf8').split(/\r?\n/).map(s => s.trim().replace(/^#/, '').toUpperCase()).filter(s => /^[0-9A-F]{6}$/.test(s)));
const val = h => { h = h.replace(/^#/, ''); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16); return Math.round((0.299 * r + 0.587 * g + 0.114 * b) / 255 * 15); };
const fam = h => { h = h.replace('#', ''); const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!mx || d / mx < 0.12) return 'GREY'; let H = 0; if (mx === r) H = ((g - b) / d) % 6; else if (mx === g) H = (b - r) / d + 2; else H = (r - g) / d + 4; H *= 60; if (H < 0) H += 360; if (H < 15 || H >= 345) return 'RED'; if (H < 40) return 'ORANGE'; if (H < 65) return 'GOLD'; if (H < 95) return 'YELLOW-GREEN'; if (H < 160) return 'GREEN'; if (H < 200) return 'TEAL'; if (H < 250) return 'BLUE'; if (H < 290) return 'VIOLET'; return 'ROSE'; };

const reg = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const rampById = {}; { const rr = reg.ramps || reg; for (const r of (Array.isArray(rr) ? rr : Object.values(rr))) rampById[r.rampId || r.id] = r; }
const GROUNDS = ['TEMP_GRASS_FERTILE', 'TEMP_GRASS_DRY', 'TEMP_SOIL_LOAM', 'TEMP_WOODLAND_FLOOR', 'TEMP_STONE_FIELDSTONE', 'WET_MUD_ANAEROBIC', 'ARID_SAND_COARSE', 'HIGH_STONE_GRANITE', 'VOLC_STONE_BASALT'];
const gv = {};
for (const g of GROUNDS) { const cols = (rampById[g] && rampById[g].hexColors) || []; if (!cols.length) { console.log('FAIL: ground ramp missing or empty: ' + g); process.exit(1); } const v = cols.map(val); gv[g] = Math.round(v.reduce((a, b) => a + b, 0) / v.length); }

// The schemes of docs/art/RACE_OUTFITS.md §3. Keep this table identical to the document.
const SCHEMES = {
  HUMAN:      { tier: 'M', dominant: '#BAB095', secondary: '#6E7A85', identity: '#356782', valueAccent: '#EDE9DE', metal: '#97A3AF', leather: '#734F2D' },
  ELF:        { tier: 'M', dominant: '#5D7C68', secondary: '#435A4B', identity: '#5D7C68', valueAccent: '#E2EFF8', metal: '#3E3E44', leather: '#6F5F34' },
  HALF_ELF:   { tier: 'M', dominant: '#834A34', secondary: '#597C93', identity: '#91B3CD', valueAccent: '#91B3CD', metal: '#5A5D63', leather: '#734F2D' },
  TIEFLING:   { tier: 'M', dominant: '#212325', secondary: '#59594F', identity: '#F26018', valueAccent: '#DC906B', metal: '#3E3E44', leather: '#312820' },
  DWARF:      { tier: 'S', dominant: '#3C474F', secondary: '#27272B', identity: '#A2713F', valueAccent: '#D0995C', metal: '#5A5D63', leather: '#583224' },
  HALFLING:   { tier: 'S', dominant: '#6C935D', secondary: '#CAC0AF', identity: '#F7C03D', valueAccent: '#F7C03D', metal: '#97A3AF', leather: '#8A7653' },
  GNOME:      { tier: 'S', dominant: '#6B5A3E', secondary: '#5B7353', identity: '#B5280D', valueAccent: '#CAC0AF', metal: '#59594F', leather: '#583224' },
  HALF_ORC:   { tier: 'L', dominant: '#27272B', secondary: '#734F2D', identity: '#C8C3B7', valueAccent: '#C8C3B7', metal: '#212325', leather: '#4E2E23' },
  DRAGONBORN: { tier: 'L', dominant: '#6D1109', secondary: '#A16147', identity: '#BE891B', valueAccent: '#FFB833', metal: '#212325', leather: '#4E2E23' },
};

// --mutant=<name> flips one rule so the check can be seen failing (Rule 4).
const mutant = (process.argv.find(a => a.startsWith('--mutant=')) || '').slice(9);
if (mutant === 'off_palette') SCHEMES.HUMAN.identity = '#123456';
if (mutant === 'low_contrast_accent') SCHEMES.GNOME.valueAccent = '#6B5A3E';
if (mutant === 'same_tier_clash') { SCHEMES.HALF_ELF.identity = '#356782'; SCHEMES.HALF_ELF.dominant = '#BAB095'; }

let fails = 0;
console.log('ground mean values: ' + JSON.stringify(gv));
for (const [race, s] of Object.entries(SCHEMES)) {
  for (const [k, h] of Object.entries(s)) { if (k === 'tier') continue; if (!master.has(h.replace('#', '').toUpperCase())) { console.log('FAIL: ' + race + ' ' + k + ' ' + h + ' is not a master-palette colour'); fails++; } }
  const minStep = s.tier === 'S' ? 4 : 3;
  const va = val(s.valueAccent);
  const bad = GROUNDS.filter(g => Math.abs(va - gv[g]) < minStep);
  console.log((bad.length ? 'FAIL: ' : 'ok:   ') + race.padEnd(11) + ' tier ' + s.tier + ' value accent v' + va + ' needs ' + minStep + ' | steps: ' + GROUNDS.map(g => Math.abs(va - gv[g])).join(' ') + (bad.length ? ' | too close to ' + bad.join(',') : ''));
  if (bad.length) fails++;
}
const byTier = {}; for (const [r, s] of Object.entries(SCHEMES)) (byTier[s.tier] = byTier[s.tier] || []).push([r, s]);
for (const [t, list] of Object.entries(byTier)) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
  const [a, sa] = list[i], [b, sb] = list[j];
  const dd = Math.abs(val(sa.dominant) - val(sb.dominant));
  const clash = fam(sa.identity) === fam(sb.identity) && dd < 3; if (clash) fails++;
  console.log((clash ? 'FAIL: ' : 'ok:   ') + 'tier ' + t + ' ' + a + ' vs ' + b + ': dominant step ' + dd + ', identity ' + fam(sa.identity) + ' vs ' + fam(sb.identity));
}
console.log(fails ? 'FAIL: ' + fails + ' breach(es)' : 'PASS: 9 schemes, ' + GROUNDS.length + ' grounds, R3 and R4 hold');
process.exit(fails ? 1 : 0);
