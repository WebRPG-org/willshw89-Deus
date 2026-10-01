#!/usr/bin/env node
'use strict';
// tools/art/test_rmmz_rows.js: done tests for the RMMZ-format catalogue rows (WG.20.03, lane-pg).
//
//   node tools/art/test_rmmz_rows.js                                   run every check (exit 1 on any FAIL)
//   UF_TEST_PROVOKE=rmmz_rows.<check> node tools/art/test_rmmz_rows.js provoke one check: it must print FAIL
//   node tools/art/test_rmmz_rows.js --mutants                         build each mutant in memory; exit 1 if one survives
//
// The oracle is tools/art/fixtures/catalogue/rmmz_rows_expected.json, transcribed from
// tasks/WG.20.03/lane-pg/ROWS.md and BRIEF.md, never from art/catalogue/rmmz_rows.json, so a row, a re-form or a
// size override dropped from the input is caught. Every check asserts its population first, so none can pass on
// an empty set. Mutants are built through build({ overrides }) and never touch a file on disk. No image is read.

const fs = require('fs');
const path = require('path');
const B = require('./build_catalogue.js');
const PA = require('./place_art.js');

const ROOT = path.resolve(__dirname, '..', '..');
const FIXTURE = path.join(__dirname, 'fixtures', 'catalogue', 'rmmz_rows_expected.json');
const PROVOKE = process.env.UF_TEST_PROVOKE || '';
const MUTANTS = process.argv.includes('--mutants');
const ROWS_SRC = B.SRC.rmmzRows || 'art/catalogue/rmmz_rows.json';
const REQUESTS = 'docs/ASSET_REQUESTS.md', DECISIONS = 'docs/OWNER_DECISIONS.md';
const NEW_SCHEMA = 'deus-art-catalogue/1.4.0';
const T = 48;
const clone = o => JSON.parse(JSON.stringify(o));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sortStr = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const readText = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const fx = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const envText = v => `${v.wMin === v.wMax ? v.wMax : v.wMin + '-' + v.wMax}x${v.hMin === v.hMax ? v.hMax : v.hMin + '-' + v.hMax}`;
const AR_IDS = ['AR-2200', 'AR-2201', 'AR-2202', 'AR-2203', 'AR-2204', 'AR-2205'];
const GROUP_OF_AR = { 'AR-2200': 'A', 'AR-2201': 'B', 'AR-2202': 'C', 'AR-2203': 'D', 'AR-2204': 'E', 'AR-2205': 'F' };
const REFORM_FIELDS = new Set(['runtime', 'rmmzForm', 'sourceIds', 'statusWhy']);

// ---------------------------------------------------------------- builds and the state a check reads
// The comparison build has no lane rows, no re-forms and no AR-2200..AR-2205 lines (rmmz_rows.append_only and the
// re-form preservation baseline).
function comparisonOverrides(root) {
    const doc = JSON.parse(fs.readFileSync(path.join(root, ROWS_SRC), 'utf8'));
    doc.rows = []; doc.reforms = [];
    const req = fs.readFileSync(path.join(root, REQUESTS), 'utf8').split('\n').filter(l => !/^\| AR-220[0-5] \|/.test(l)).join('\n');
    return { [ROWS_SRC]: JSON.stringify(doc), [REQUESTS]: req };
}
function makeState(build, opts) {
    opts = opts || {};
    const st = { build, cat: build.catalogue || { entries: [], sheets: [], outOfScope: [] }, files: build.files || {}, _cmp: opts.cmp };
    st.byId = new Map(st.cat.entries.map(e => [e.id, e]));
    Object.defineProperty(st, 'cmp', { get() {
        if (st._cmp === undefined) { try { st._cmp = B.build({ root: ROOT, overrides: comparisonOverrides(ROOT) }); } catch (e) { st._cmp = { ok: false, errors: [{ code: 'THREW', id: 'comparison', msg: e.message }], catalogue: null }; } }
        return st._cmp;
    } });
    return st;
}
let _real = null;
const realState = () => (_real = _real || makeState(B.build({ root: ROOT })));

// Real line numbers the reasons must cite (ROWS.md section 1).
function arLine(ar, text) { const L = (text || readText(REQUESTS)).split(/\r?\n/); const i = L.findIndex(l => l.startsWith(`| ${ar} |`)); return i + 1; }
function quoteLines() { const L = readText(DECISIONS).split(/\r?\n/); return fx.rulings.map(q => L.findIndex(l => l.includes(q)) + 1); }
function formText(x) {
    const s = x.rmmzForm.stock;
    if (x.rmmzForm.sheet === 'A4') return `${path.basename(x.runtime.file, '.png')} slot ${/^A4 slot (\d+):/.exec(x.runtime.slotText)[1]}, ${s ? 'format example ' + s : 'no format example'}`;
    return s ? `stock ${s}` : `DEUS ${x.rmmzForm.sheet} extension sheet, no stock slot`;
}
function expectedClause(x, ar) {
    const [l0, l1] = quoteLines();
    return `${ar} REQUESTED (${REQUESTS}:${arLine(ar)}); Owner 2026-10-01 "${fx.rulings[0]}" (${DECISIONS}:${l0}), RMMZ format (${DECISIONS}:${l1}); RMMZ form: ${formText(x)}; no art yet (DEC-007 catalogue first)`;
}
function runtimeWant(x) { return Object.assign({ kind: 'RMMZ_TILESET', file: x.runtime.file, index: null, tileId: x.runtime.tileId, slotText: x.runtime.slotText }, x.runtime.grid ? { grid: x.runtime.grid } : {}); }
const sheetOf = file => (/_(A1|A2|A3|A4|A5|B|C|D|E)\.png$/.exec(file || '') || [])[1] || null;
function cellsOf(rt) {
    if (rt.tileId >= 1536) return [rt.tileId];
    const [w, h] = (rt.grid || '1x1').split('x').map(Number);
    const out = [];
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.push(rt.tileId + dx + 8 * dy);
    return out;
}

// ---------------------------------------------------------------- check functions (state, provoked) -> {ok, detail}
function checkRow(x) {
    return (st, p) => {
        let e = st.byId.get(x.id);
        if (!e) return { ok: false, detail: 'absent from the catalogue' };
        if (p) e = Object.assign(clone(e), { runtime: Object.assign({}, e.runtime, { tileId: e.runtime.tileId + 1 }) });
        const bad = [];
        const want = (name, got, exp) => { if (!same(got, exp)) bad.push(`${name} ${JSON.stringify(got)} != ${JSON.stringify(exp)}`); };
        want('category', e.category, x.category); want('band', e.band, x.band); want('scaleRow', e.scaleRow, x.scaleRow);
        want('envelope', e.envelope, x.envelope); want('footprint', e.footprint, x.footprint); want('anchor', e.anchor, x.anchor);
        want('envelopeOverride', e.envelopeOverride === undefined ? null : e.envelopeOverride, x.envelopeOverride);
        want('footprintOverride', e.footprintOverride === undefined ? null : e.footprintOverride, x.footprintOverride);
        want('frames.cols', e.frames && e.frames.cols, x.frames);
        want('runtime', e.runtime, runtimeWant(x)); want('rmmzForm', e.rmmzForm, x.rmmzForm);
        want('paletteRampIds', e.paletteRampIds, x.paletteRampIds); want('rampBasis', e.mapping && e.mapping.rampBasis, x.rampBasis);
        want('slot', e.slot && { slotId: e.slot.slotId, w: e.slot.w, h: e.slot.h }, x.slot);
        want('status', e.status, 'MISSING');
        want('sourceIds.ar', e.sourceIds && e.sourceIds.ar, [x.ar]);
        const base = expectedClause(x, x.ar);
        if (x.envelopeOverride) {
            const pre = `${base}; size override of ${x.scaleRow} ${envText(x.chartRow)} to ${envText(x.envelopeOverride)} (WG.20.03 D4): `;
            const j = fx.judgedArt.find(a => a.id === x.id && a.current);
            const why = e.statusWhy.startsWith(pre) ? e.statusWhy.slice(pre.length) : null;
            if (why === null) bad.push(`statusWhy does not start with the reason and the size-override clause: ${JSON.stringify(e.statusWhy)}`);
            else if (!j || !why.includes(path.basename(j.file)) || !why.includes(j.sha256Prefix) || !why.includes(`${j.bbox.w}x${j.bbox.h}`)) bad.push(`overrideWhy "${why}" does not name the measured specimen ${j ? `${path.basename(j.file)} ${j.sha256Prefix} ${j.bbox.w}x${j.bbox.h}` : '(none in judgedArt)'}`);
        } else want('statusWhy', e.statusWhy, base);
        return { ok: !bad.length, detail: bad.length ? bad.join('; ') : `all fields match (${x.runtime.slotText} on ${path.basename(x.runtime.file)}, slot ${x.slot.slotId})` };
    };
}
function checkReform(x) {
    return (st, p) => {
        let e = st.byId.get(x.id);
        if (!e) return { ok: false, detail: 'absent from the catalogue' };
        if (p) { e = clone(e); e.paletteRampIds = e.paletteRampIds.map((r, i) => i === 0 ? (r === 'NEUT_COOL_GRAY' ? 'NEUT_VOID_BLACK' : 'NEUT_COOL_GRAY') : r); }
        const bad = [];
        if (!same(e.runtime, runtimeWant(x))) bad.push(`runtime ${JSON.stringify(e.runtime)} != ${JSON.stringify(runtimeWant(x))}`);
        if (!same(e.rmmzForm, x.rmmzForm)) bad.push(`rmmzForm ${JSON.stringify(e.rmmzForm)} != ${JSON.stringify(x.rmmzForm)}`);
        if (!e.slot || !same({ slotId: e.slot.slotId, w: e.slot.w, h: e.slot.h }, x.baseSlot)) bad.push(`slot ${JSON.stringify(e.slot)} is not the base slot ${JSON.stringify(x.baseSlot)}`);
        const cmp = st.cmp;
        const b = cmp && cmp.catalogue ? cmp.catalogue.entries.find(y => y.id === x.id) : null;
        if (!b) bad.push('absent from the no-rows/no-reforms comparison build');
        else {
            for (const k of new Set(Object.keys(b).concat(Object.keys(e)))) if (!REFORM_FIELDS.has(k) && !same(b[k], e[k])) bad.push(`${k} changed (${JSON.stringify(b[k])} -> ${JSON.stringify(e[k])})`);
            for (const k of new Set(Object.keys(b.sourceIds).concat(Object.keys(e.sourceIds)))) if (k !== 'ar' && !same(b.sourceIds[k], e.sourceIds[k])) bad.push(`sourceIds.${k} changed`);
            const wantAr = Array.from(new Set(b.sourceIds.ar.concat([x.ar]))).sort(sortStr);
            if (!same(e.sourceIds.ar, wantAr) || b.sourceIds.ar.includes(x.ar)) bad.push(`sourceIds.ar ${JSON.stringify(e.sourceIds.ar)} is not the previous ${JSON.stringify(b.sourceIds.ar)} plus ${x.ar} only`);
            const wantWhy = `${b.statusWhy}; ${expectedClause(x, x.ar)}`;
            if (e.statusWhy !== wantWhy) bad.push(`statusWhy is not the previous text plus the AR and ruling clause: ${JSON.stringify(e.statusWhy)}`);
        }
        return { ok: !bad.length, detail: bad.length ? bad.join('; ') : `runtime ${x.runtime.slotText} on ${path.basename(x.runtime.file)}; base slot ${x.baseSlot.slotId} kept; every other field equals the comparison build` };
    };
}
const formEntries = st => st.cat.entries.filter(e => e.rmmzForm);
const POP_FORM = fx.counts.rows + fx.counts.reforms;

const CHECKS = {
    counts: (st, p) => {
        const cmpIds = st.cmp && st.cmp.catalogue ? new Set(st.cmp.catalogue.entries.map(e => e.id)) : null;
        let forms = formEntries(st);
        if (p) forms = forms.slice(1);
        const fresh = cmpIds ? forms.filter(e => !cmpIds.has(e.id)) : [];
        const reformed = cmpIds ? forms.filter(e => cmpIds.has(e.id)) : [];
        const byGroup = {};
        for (const e of fresh) { const g = GROUP_OF_AR[e.sourceIds.ar.find(a => GROUP_OF_AR[a])]; byGroup[g] = (byGroup[g] || 0) + 1; }
        const ok = !!cmpIds && fresh.length === fx.counts.rows && same(Object.keys(byGroup).sort().reduce((o, k) => (o[k] = byGroup[k], o), {}), fx.counts.byGroup) && reformed.length === fx.counts.reforms;
        return { ok, detail: `${fresh.length} new rows (want ${fx.counts.rows}) by group ${JSON.stringify(byGroup)} (want ${JSON.stringify(fx.counts.byGroup)}); ${reformed.length} re-forms (want ${fx.counts.reforms})${cmpIds ? '' : '; no comparison build'}` };
    },
    ar_rows: (st, p) => {
        const text = readText(REQUESTS);
        const L = text.split(/\r?\n/);
        const filesOf = {};
        for (const x of fx.rows.concat(fx.reforms)) (filesOf[x.ar] = filesOf[x.ar] || new Set()).add(path.basename(x.runtime.file));
        const oos = new Set((st.cat.outOfScope || []).filter(o => o.kind === 'ar').map(o => o.sourceId));
        if (p) oos.add('AR-2204');
        const bad = [];
        let found = 0;
        for (const ar of AR_IDS) {
            const l = L.find(x => new RegExp('^\\|\\s*(~~)?' + ar + '(~~)?\\s*\\|').test(x));
            if (!l) { bad.push(`${ar} absent`); continue; }
            found++;
            const c = l.split('|').slice(1, -1).map(s => s.trim());
            if (c.length !== 5) bad.push(`${ar} has ${c.length} columns, not 5`);
            if (/~~/.test(c[0]) || /^(DELIVERED|CHECKED|APPROVED|INTEGRATED|WITHDRAWN)/.test(c[c.length - 1])) bad.push(`${ar} is not open (${c[c.length - 1].slice(0, 30)})`);
            for (const f of filesOf[ar] || []) if (!l.includes(f)) bad.push(`${ar} does not name ${f}`);
            if (oos.has(ar)) bad.push(`${ar} is in the catalogue's outOfScope`);
        }
        return { ok: found === AR_IDS.length && !bad.length, detail: `${found}/${AR_IDS.length} AR rows in ${REQUESTS}; ${bad.length ? bad.join('; ') : 'all open 5-column rows, each naming its runtime files, none out of scope'}` };
    },
    size_rows: (st, p) => {
        const want = { RMMZ_AUTOTILE_A4_TOP: [96, 144, 2, 3], RMMZ_AUTOTILE_A4_SIDE: [96, 96, 2, 2], RMMZ_TILE_48_2X2: [96, 96, 2, 2] };
        const rows = st.build.scaleRows || [];
        const bad = [];
        let n = 0;
        for (const [id, [w, h, fw, fh]] of Object.entries(want)) {
            let r = rows.find(x => x.rowId === id);
            if (r && p && id === 'RMMZ_AUTOTILE_A4_SIDE') r = Object.assign({}, r, { hMax: 120 });
            if (!r) { bad.push(`${id} absent`); continue; }
            n++;
            if (r.source !== 'RMMZ_SPEC' || r.wMin !== w || r.wMax !== w || r.wTarget !== w || r.hMin !== h || r.hMax !== h || r.hTarget !== h || r.footprint.w !== fw || r.footprint.h !== fh) bad.push(`${id} is ${r.wMin}-${r.wMax}x${r.hMin}-${r.hMax} fp ${r.footprint.w}x${r.footprint.h} (${r.source}), want ${w}x${h} fp ${fw}x${fh}`);
            if (!/derived/.test(r.ref || '') || !/rmmz_core\.js:/.test(r.ref || '')) bad.push(`${id} ref "${r.ref}" does not name its derivation`);
        }
        return { ok: n === 3 && !bad.length, detail: `${n}/3 derived RMMZ_SPEC rows; ${bad.length ? bad.join('; ') : rows.filter(x => want[x.rowId]).map(x => `${x.rowId} ${x.wMax}x${x.hMax} (${x.ref})`).join('; ')}` };
    },
    rulings_cited: (st, p) => {
        const lines = quoteLines();
        const ids = fx.rows.concat(fx.reforms).map(x => x.id);
        const bad = [];
        let n = 0;
        for (const id of ids) {
            const e = st.byId.get(id);
            if (!e) { bad.push(`${id} absent`); continue; }
            n++;
            const why = p && id === ids[0] ? e.statusWhy.replace(`${DECISIONS}:${lines[1]}`, `${DECISIONS}:0`) : e.statusWhy;
            for (const l of lines) if (!l || !why.includes(`(${DECISIONS}:${l})`)) bad.push(`${id} does not cite ${DECISIONS}:${l}`);
        }
        const src = (st.cat.sources || []).find(s => s.path === ROWS_SRC);
        if (!src || !/RMMZ_ROWS/.test(src.role)) bad.push(`${ROWS_SRC} is not pinned in catalogue.sources`);
        return { ok: n === ids.length && lines.every(l => l > 0) && !bad.length, detail: `quotes at ${DECISIONS}:${lines.join(', :')}; ${n}/${ids.length} rows and re-forms present; ${bad.length ? bad.slice(0, 4).join('; ') + (bad.length > 4 ? ` (+${bad.length - 4})` : '') : `every reason cites both lines; ${ROWS_SRC} pinned (${src.role})`}` };
    },
    schema_contract: (st, p) => {
        const schema = JSON.parse(readText('art/catalogue/catalogue.schema.json'));
        const ep = schema.$defs.entry.properties;
        const wantProps = {
            rmmzForm: { type: 'object', required: ['sheet', 'stock'], additionalProperties: false, properties: { sheet: { enum: ['A1', 'A2', 'A3', 'A4', 'A5', 'B', 'C', 'D', 'E'] }, stock: { type: ['string', 'null'] } } },
            envelopeOverride: { type: 'object', required: ['wMin', 'wMax', 'hMin', 'hMax'], additionalProperties: false, properties: { wMin: { type: 'integer', minimum: 0 }, wMax: { type: 'integer', minimum: 1 }, hMin: { type: 'integer', minimum: 0 }, hMax: { type: 'integer', minimum: 1 } } },
            footprintOverride: { type: 'object', required: ['w', 'h'], additionalProperties: false, properties: { w: { type: 'number', minimum: 0 }, h: { type: 'number', minimum: 0 } } },
        };
        if (p) delete ep.footprintOverride;
        const bad = [];
        if (!(ep.category.enum || []).includes('MARK')) bad.push('MARK not in the category enum');
        for (const [k, v] of Object.entries(wantProps)) {
            if (!same(ep[k], v)) bad.push(`${k} is ${JSON.stringify(ep[k])}`);
            if ((schema.$defs.entry.required || []).includes(k)) bad.push(`${k} is required`);
        }
        if (schema.$id !== NEW_SCHEMA || schema.properties.schemaVersion.const !== NEW_SCHEMA || B.SCHEMA_VERSION !== NEW_SCHEMA) bad.push(`versions: $id ${schema.$id}, schemaVersion.const ${schema.properties.schemaVersion.const}, SCHEMA_VERSION ${B.SCHEMA_VERSION} (want ${NEW_SCHEMA})`);
        // The validator test_catalogue.js uses, on the lane's entries and on two broken copies of an override row.
        const src = readText('tools/art/test_catalogue.js');
        const m = /function validateSchema\([\s\S]*?\n}\n/.exec(src);
        if (!m) return { ok: false, detail: 'validateSchema not found in tools/art/test_catalogue.js' };
        const validateSchema = new Function(m[0] + '; return validateSchema;')();
        const doc = ents => Object.assign({}, st.cat, { entries: ents });
        const forms = formEntries(st);
        const errs = forms.length ? validateSchema(schema, doc(forms), 20) : ['no rmmzForm entries'];
        const row = forms.find(e => e.envelopeOverride);
        let negEnv = [], negFoot = [];
        if (row) {
            const a = clone(row); a.envelopeOverride.wTarget = a.envelope.wTarget; negEnv = validateSchema(schema, doc([a]), 5);
            const b = clone(row); b.footprintOverride = { w: 1, h: 1, d: 1 }; negFoot = validateSchema(schema, doc([b]), 5);
        }
        if (errs.length) bad.push(`${errs.length} schema errors on the lane entries (${errs.slice(0, 2).join('; ')})`);
        if (negEnv.length !== 1 || negFoot.length !== 1) bad.push(`broken copies gave ${negEnv.length} and ${negFoot.length} errors, want 1 each (${negEnv.concat(negFoot).join('; ')})`);
        return { ok: forms.length === POP_FORM && !bad.length, detail: `${forms.length} rmmzForm entries (want ${POP_FORM}) validate; envelopeOverride + wTarget -> ${JSON.stringify(negEnv)}; footprintOverride + d -> ${JSON.stringify(negFoot)}${bad.length ? '; ' + bad.join('; ') : `; MARK, the three properties and ${NEW_SCHEMA} in place`}` };
    },
    envelope_admits_art: (st, p) => {
        const items = fx.judgedArt;
        const bad = [];
        for (const j of items) {
            let e = st.byId.get(j.id);
            if (!e) { bad.push(`${j.id}: absent`); continue; }
            if (p && j.id === 'SURFACE_SHARED_TREE_PINE_B-V1_DEFAULT') e = Object.assign(clone(e), { envelope: Object.assign({}, e.envelope, { wMax: 64, hMax: 104 }) });
            const v = e.envelope;
            if (!(v.wMin <= j.bbox.w && j.bbox.w <= v.wMax && v.hMin <= j.bbox.h && j.bbox.h <= v.hMax)) bad.push(`${j.id.replace('SURFACE_SHARED_TREE_', '')} ${j.bbox.w}x${j.bbox.h} (${path.basename(j.file)}) vs envelope ${envText(v)}`);
            if (!e.slot || e.slot.w / e.frames.cols < j.bbox.w || e.slot.h / e.frames.rows < j.bbox.h) bad.push(`${j.id}: ${j.bbox.w}x${j.bbox.h} does not fit one slot frame`);
        }
        return { ok: items.length === fx.counts.judgedArt && items.length === 12 && !bad.length, detail: `${items.length - bad.length}/${items.length} recorded specimen boxes admitted (recorded dimensions only; no image is read)${bad.length ? '; not admitted: ' + bad.join('; ') : ''}` };
    },
    size_overrides: (st, p) => {
        const want = fx.sizeOverrides;
        let have = st.cat.entries.filter(e => e.envelopeOverride);
        if (p) have = have.slice(1);
        const conflicts = st.files[B.OUT.conflicts] || '';
        const sec = /## \d+\. Per-row size overrides[\s\S]*?(?=\n## )/.exec(conflicts);
        const bad = [];
        const ids = new Set(have.map(e => e.id));
        for (const o of want) {
            const e = have.find(x => x.id === o.id);
            if (!e) { bad.push(`${o.id} has no envelopeOverride`); continue; }
            if (!same(e.envelopeOverride, o.envelopeOverride)) bad.push(`${o.id} override ${JSON.stringify(e.envelopeOverride)} != ${JSON.stringify(o.envelopeOverride)}`);
            if (e.scaleRow !== o.scaleRow) bad.push(`${o.id} scaleRow ${e.scaleRow}`);
            if (!e.statusWhy.includes(`; size override of ${o.scaleRow} ${envText(o.chartRow)} to ${envText(o.envelopeOverride)} (WG.20.03 D4): `)) bad.push(`${o.id} statusWhy lacks the size-override clause`);
            if (!sec || !sec[0].includes(`${o.id}: ${o.scaleRow} ${envText(o.chartRow)} (`) || !sec[0].includes(`-> ${envText(o.envelopeOverride)}`)) bad.push(`${o.id} not listed in conflicts.md "Per-row size overrides"`);
        }
        for (const id of ids) if (!want.some(o => o.id === id)) bad.push(`${id} carries an override the fixture does not list`);
        const foot = st.cat.entries.filter(e => e.footprintOverride).map(e => e.id);
        if (foot.length) bad.push(`footprintOverride on ${foot.join(', ')}`);
        return { ok: want.length === 9 && have.length === want.length && !bad.length, detail: `${have.length} entries carry envelopeOverride (want ${want.length}); footprintOverride on ${foot.length}; conflicts.md section ${sec ? 'present' : 'MISSING'}${bad.length ? '; ' + bad.join('; ') : ''}` };
    },
    rmmz_form: (st, p) => {
        let forms = formEntries(st);
        if (p) forms = forms.map((e, i) => i === 0 ? Object.assign(clone(e), { slot: Object.assign({}, e.slot, { w: e.slot.w + T }) }) : e);
        const bad = [];
        const a1 = 96, a1h = 144;
        for (const e of forms) {
            const rt = e.runtime, L = sheetOf(rt.file);
            let tw, th;
            if (L !== e.rmmzForm.sheet) { bad.push(`${e.id}: sheet ${e.rmmzForm.sheet} vs file letter ${L}`); continue; }
            if (L === 'A1') { const k = (rt.tileId - 2048) / 48; tw = (k < 2 || (k >= 4 && k % 2 === 0)) ? 3 * a1 : a1; th = a1h; if (!Number.isInteger(k) || k < 0 || k > 15) bad.push(`${e.id}: A1 id ${rt.tileId}`); }
            else if (L === 'A2') { const k = (rt.tileId - 2816) / 48; tw = 96; th = 144; if (!Number.isInteger(k) || k < 0 || k > 31) bad.push(`${e.id}: A2 id ${rt.tileId}`); }
            else if (L === 'A4') { const k = (rt.tileId - 5888) / 48; tw = 96; th = Math.floor(k / 8) % 2 ? 96 : 144; if (!Number.isInteger(k) || k < 0 || k > 47) bad.push(`${e.id}: A4 id ${rt.tileId}`); }
            else if (['B', 'C', 'D', 'E'].includes(L)) {
                const first = { B: 0, C: 256, D: 512, E: 768 }[L], local = rt.tileId - first, [w, h] = (rt.grid || '1x1').split('x').map(Number);
                if (local <= 0 || local > 255 || local % 8 + w > 8 || Math.floor((local % 128) / 8) + h > 16) bad.push(`${e.id}: ${L} local tile ${local} grid ${rt.grid || '1x1'}`);
                tw = w * T; th = h * T;
            } else { bad.push(`${e.id}: no target for ${L}`); continue; }
            if (!e.slot || e.slot.w !== tw || e.slot.h !== th) bad.push(`${e.id}: slot ${e.slot ? e.slot.w + 'x' + e.slot.h : 'none'} vs RMMZ target ${tw}x${th}`);
        }
        const rule = (st.build.errors || []).filter(x => x.code === 'RMMZ_FORM');
        if (rule.length) bad.push(`the builder reports ${rule.length} RMMZ_FORM`);
        return { ok: forms.length === POP_FORM && !bad.length, detail: `${forms.length} rmmzForm entries (want ${POP_FORM}); ${bad.length ? bad.slice(0, 4).join('; ') : 'every slot is its RMMZ target'}` };
    },
    pa_agrees: (st, p) => {
        const forms = formEntries(st);
        const plain = forms.filter(e => !e.runtime.grid), grid = forms.filter(e => e.runtime.grid);
        const bad = [];
        const pxOf = new Map(fx.rows.concat(fx.reforms).map(x => [x.id, x.px]));
        for (const e of forms) {
            const t = PA.tilesetTarget(e.runtime.tileId, T);
            if (t.error) { bad.push(`${e.id}: ${t.error}`); continue; }
            let w = e.slot.w, h = e.slot.h;
            if (p && e === plain[0]) w += T;
            if (!e.runtime.grid) { if (t.w !== w || t.h !== h) bad.push(`${e.id}: tilesetTarget ${t.w}x${t.h} vs slot ${w}x${h}`); }
            else {
                const [gw, gh] = e.runtime.grid.split('x').map(Number);
                if (t.w !== T || t.h !== T || w !== gw * T || h !== gh * T) bad.push(`${e.id}: first cell ${t.w}x${t.h}, slot ${w}x${h} vs grid ${e.runtime.grid}`);
            }
            const px = pxOf.get(e.id);
            if (px && (t.x !== px[0] || t.y !== px[1])) bad.push(`${e.id}: tilesetTarget at (${t.x},${t.y}), ROWS.md says (${px[0]},${px[1]})`);
        }
        return { ok: plain.length === 72 && grid.length === 20 && !bad.length, detail: `${plain.length} rows without a grid (want 72) and ${grid.length} grid rows (want 20) against tools/art/place_art.js tilesetTarget${bad.length ? '; ' + bad.slice(0, 4).join('; ') : '; all agree, pixel positions as in ROWS.md'}` };
    },
    tile_unique: (st, p) => {
        const claims = new Map(), dup = [];
        let forms = formEntries(st);
        if (p) forms = forms.concat([Object.assign(clone(forms[0]), { id: forms[0].id + '-COPY' })]);
        for (const e of forms) for (const c of cellsOf(e.runtime)) { const k = `${e.runtime.file}#${c}`; if (claims.has(k)) dup.push(`${k}: ${claims.get(k)} and ${e.id}`); else claims.set(k, e.id); }
        return { ok: claims.size === 134 && !dup.length, detail: `${claims.size} claimed cells (want 134); duplicates ${dup.length}${dup.length ? ': ' + dup.slice(0, 3).join('; ') : ''}` };
    },
    stock_positions: (st, p) => {
        const labels = new Map(fx.stockLabels.map(l => [`${l.sheet}#${l.index}`, l.label]));
        const counterpart = { 'DEUS_Outside_B': 'Outside_B', 'DEUS_Outside_A1': 'Outside_A1', 'DEUS_Dungeon_A1': 'Dungeon_A1', 'DEUS_Dungeon_A2': 'Dungeon_A2' };
        let pos = 0, fmt = 0;
        const bad = [];
        for (const e of formEntries(st)) {
            const s = e.rmmzForm.stock;
            if (!s) continue;
            const m = /^(\w+) (?:kind (\d+)|([\d/]+)) "([^"]+)"/.exec(s);
            if (!m) { bad.push(`${e.id}: stock "${s}" unparsed`); continue; }
            const idx = m[2] !== undefined ? [+m[2]] : m[3].split('/').map(Number);
            let label = m[4];
            if (p && e.id === 'SURFACE_SHARED_TREE_OAK_B-V1_DEPLETED') label = 'Stump (Moss)';
            for (const n of idx) if (labels.get(`${m[1]}#${n}`) !== label) bad.push(`${e.id}: "${label}" is not the frozen label of ${m[1]} ${n} ("${labels.get(`${m[1]}#${n}`)}")`);
            const base = path.basename(e.runtime.file, '.png');
            if (counterpart[base] === m[1]) {
                pos++;
                const L = sheetOf(e.runtime.file);
                const want = L === 'A1' ? [2048 + 48 * idx[0]] : L === 'A2' ? [2816 + 48 * idx[0]] : idx;
                const got = cellsOf(e.runtime);
                if (!same(got, want)) bad.push(`${e.id}: claims ${got.join('/')} but names stock ${m[1]} ${idx.join('/')}`);
            } else if (sheetOf(e.runtime.file) === 'A4' && /^(Outside|Dungeon)_A4$/.test(m[1]) && idx.length === 1) {
                fmt++;
                const k = (e.runtime.tileId - 5888) / 48;
                if (Math.floor(k / 8) % 2 !== Math.floor(idx[0] / 8) % 2) bad.push(`${e.id}: kind ${k} and format example kind ${idx[0]} differ in top/side parity`);
            } else bad.push(`${e.id}: stock ${m[1]} is neither its sheet's stock counterpart nor an A4 format example`);
        }
        return { ok: pos === 28 && fmt === 30 && !bad.length, detail: `${pos} stock positions (want 28), ${fmt} A4 format examples (want 30); ${bad.length ? bad.slice(0, 4).join('; ') : 'every label is the frozen MZ label; positions and parities hold'}` };
    },
    append_only: (st, p) => {
        const cmp = st.cmp;
        if (!cmp || !cmp.catalogue) return { ok: false, detail: 'no comparison build' };
        const base = new Map(cmp.catalogue.entries.map(e => [e.id, e]));
        let moved = 0, common = 0;
        const bad = [];
        for (const e of st.cat.entries) {
            const b = base.get(e.id);
            if (b) { common++; const s = p && common === 1 ? Object.assign({}, e.slot, { x: (e.slot ? e.slot.x : 0) + T }) : e.slot; if (!same(s, b.slot)) moved++; }
        }
        const fresh = st.cat.entries.filter(e => !base.has(e.id));
        for (const e of fresh) if (!e.slot || !/_RMMZ\d\d$/.test(e.slot.sheetId)) bad.push(`${e.id} is not on an _RMMZnn sheet`);
        for (const e of st.cat.entries) if (base.has(e.id) && e.slot && /_RMMZ\d\d$/.test(e.slot.sheetId)) bad.push(`${e.id} (an older row) is on ${e.slot.sheetId}`);
        return { ok: cmp.ok && common === cmp.catalogue.entries.length && fresh.length === fx.counts.rows && moved === 0 && !bad.length, detail: `comparison build ${cmp.ok ? 'OK' : 'FAILED ' + cmp.errors.slice(0, 2).map(x => x.code).join(',')} with ${cmp.catalogue.entries.length} entries; ${common} common entries, ${moved} slots moved; ${fresh.length} new rows (want ${fx.counts.rows})${bad.length ? '; ' + bad.slice(0, 3).join('; ') : ', all on _RMMZnn sheets'}` };
    },
};
const ROW_CHECKS = fx.rows.map(x => ['row_' + x.id, checkRow(x)]);
const REFORM_CHECKS = fx.reforms.map(x => ['reform_' + x.id, checkReform(x)]);
const ALL_CHECKS = ROW_CHECKS.concat(REFORM_CHECKS, Object.entries(CHECKS));
const runCheck = (name, st, p) => { try { return ALL_CHECKS.find(c => c[0] === name)[1](st, !!p); } catch (e) { return { ok: false, detail: 'threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 2).join(' | ') : e) }; } };

// ---------------------------------------------------------------- mutants
function rowsEdit(fn) { const d = JSON.parse(readText(ROWS_SRC)); fn(d); return { [ROWS_SRC]: JSON.stringify(d, null, 2) }; }
const findRow = (d, pred) => { const r = d.rows.find(pred); if (!r) throw new Error('mutant target row not found'); return r; };
const textEdit = (rel, from, to) => { const t = readText(rel); if (!t.includes(from)) throw new Error(`mutant anchor not in ${rel}: ${from.slice(0, 40)}`); return { [rel]: t.split(from).join(to) }; };
const lineEdit = (rel, re, fn) => { const L = readText(rel).split('\n'); const i = L.findIndex(l => re.test(l)); if (i < 0) throw new Error(`mutant line not in ${rel}`); L[i] = fn(L[i]); return { [rel]: L.join('\n') }; };
const codeKill = code => r => ({ killed: r.errors.some(e => e.code === code), detail: `build errors: ${Array.from(new Set(r.errors.map(e => e.code))).join(', ') || 'none'}${r.errors.some(e => e.code === code) ? ' (' + r.errors.find(e => e.code === code).id + ': ' + r.errors.find(e => e.code === code).msg + ')' : ''}` });
const checkKill = (...names) => r => { const st = makeState(r); const res = names.map(n => [n, runCheck(n, st, false)]); return { killed: res.every(([, x]) => !x.ok), detail: res.map(([n, x]) => `${n} ${x.ok ? 'PASS' : 'FAIL'}: ${x.detail}`).join(' || ') }; };
const MUTANTS_LIST = [
    ['drop_one_row', () => rowsEdit(d => { d.rows = d.rows.filter(r => !(r.type === 'oak' && r.state === 'DEPLETED')); }), r => {
        const k = checkKill('row_SURFACE_SHARED_TREE_OAK_B-V1_DEPLETED')(r);
        const committed = fs.readFileSync(path.join(ROOT, B.OUT.catalogue), 'utf8');
        const differs = (r.files[B.OUT.catalogue] || '') !== committed;
        return { killed: k.killed && differs, detail: `${k.detail} || fresh catalogue.json ${differs ? 'differs from' : 'EQUALS'} the committed one (--check would ${differs ? 'fail' : 'pass'})` };
    }],
    ['dup_tile', () => rowsEdit(d => { findRow(d, r => r.type === 'sapling').tileId = 156; }), r => { const a = codeKill('RMMZ_TILE_DUP')(r); const b = checkKill('stock_positions')(r); return { killed: a.killed && b.killed, detail: `${a.detail} || ${b.detail}` }; }],
    ['wrong_grid', () => rowsEdit(d => { findRow(d, r => r.type === 'oak' && r.state === 'DEFAULT').grid = '1x1'; }), codeKill('RMMZ_FORM')],
    ['side_on_top_kind', () => rowsEdit(d => { findRow(d, r => r.type === 'cliff-granite' && r.variant === 'SIDE').tileId = 6656; }), codeKill('RMMZ_FORM')],
    ['local_zero', () => rowsEdit(d => { findRow(d, r => r.type === 'steam').tileId = 768; }), codeKill('RMMZ_FORM')],
    ['half_overflow', () => rowsEdit(d => { findRow(d, r => r.type === 'canopy-broadleaf-2x2').tileId = 183; }), codeKill('RMMZ_FORM')],
    ['ar_text', () => lineEdit(REQUESTS, /^\| AR-2205 \|/, l => l.split('`DEUS_Outside_E.png`').join('the E sheet')), codeKill('RMMZ_AR_TEXT')],
    ['ruling_missing', () => textEdit(DECISIONS, fx.rulings[0], 'You may open rows'), codeKill('RULING_MISSING')],
    ['reform_has_runtime', () => rowsEdit(d => { d.reforms.push({ id: 'SURFACE_SHARED_TREE_OAK_V1_DEFAULT', ar: 'AR-2203', file: 'img/tilesets/DEUS_Outside_E.png', tileId: 830, grid: null, stock: null }); }), codeKill('REFORM_TARGET')],
    ['reform_ramp_drift', 'IN_MEMORY', null],
    ['bad_input', () => rowsEdit(d => { delete d.rows[5].state; }), codeKill('RMMZ_ROWS_INVALID')],
    ['ar_closed', () => lineEdit(REQUESTS, /^\| AR-2204 \|/, l => l.replace(/\| REQUESTED \([^|]*\) \|$/, '| CHECKED |')), codeKill('AR_MISSING')],
    ['a4_spec_height', () => lineEdit('docs/RMMZ_ASSET_SPEC.md', /^\| \*\*A4\*\* \|/, l => l.replace('768 × 720 px', '768 × 700 px')), codeKill('RMMZ_SPEC')],
    ['drop_override', () => rowsEdit(d => { const r = findRow(d, x => x.type === 'pine' && x.state === 'DEFAULT'); delete r.envelopeOverride; delete r.overrideWhy; }), checkKill('envelope_admits_art', 'size_overrides')],
    ['strip_overrides', () => rowsEdit(d => { for (const r of d.rows) { delete r.envelopeOverride; delete r.overrideWhy; } }), r => {
        const k = checkKill('envelope_admits_art')(r);
        const named = fx.sizeOverrides.every(o => k.detail.includes(o.id.replace('SURFACE_SHARED_TREE_', '') + ' '));
        return { killed: k.killed && named, detail: `${k.detail} || all ${fx.sizeOverrides.length} override rows named: ${named}` };
    }],
    ['bad_override', () => rowsEdit(d => { findRow(d, x => x.type === 'pine' && x.state === 'DEFAULT').envelopeOverride.wMin = 100; }), codeKill('RMMZ_ROWS_INVALID')],
];
function runMutants() {
    let survived = 0;
    for (const [name, make, kill] of MUTANTS_LIST) {
        let res;
        try {
            if (make === 'IN_MEMORY') {
                // A re-form item has no ramp or anchor of its own, so this mutant stands for a builder defect: the
                // built catalogue is edited in memory (one valid registry ramp of one re-formed row; slot and status kept).
                const real = realState();
                const cat = clone(real.cat);
                const id = 'SURFACE_SHARED_SHADE_HEIGHT_H1_DEFAULT';
                const v = cat.entries.find(e => e.id === id);
                const from = v.paletteRampIds.join(',');
                v.paletteRampIds = ['NEUT_COOL_GRAY'];
                const vErr = B.validateCatalogue(cat, real.build.validateCtx);
                const st = makeState(Object.assign({}, real.build, { catalogue: cat }), { cmp: real.cmp });
                const c = runCheck('reform_' + id, st, false);
                res = { killed: !c.ok && /paletteRampIds/.test(c.detail), detail: `${id} paletteRampIds ${from} -> NEUT_COOL_GRAY; validateCatalogue ${vErr.length} errors; reform_${id} ${c.ok ? 'PASS' : 'FAIL'}: ${c.detail}` };
            } else {
                const r = B.build({ root: ROOT, overrides: make() });
                res = kill(r);
            }
        } catch (e) { res = { killed: false, detail: 'threw: ' + e.message }; }
        if (!res.killed) survived++;
        console.log(`${res.killed ? 'KILLED' : 'SURVIVED'} mutant.${name}: ${res.detail}`);
    }
    console.log(`\n${MUTANTS_LIST.length - survived}/${MUTANTS_LIST.length} mutants killed`);
    return survived ? 1 : 0;
}

// ---------------------------------------------------------------- main
function main() {
    if (MUTANTS) return runMutants();
    const st = realState();
    if (!st.build.ok) console.log(`NOTE real build reported ${st.build.errors.length} errors: ${Array.from(new Set(st.build.errors.map(e => e.code))).join(', ')}`);
    const results = [];
    for (const [name] of ALL_CHECKS) {
        const p = PROVOKE === 'rmmz_rows.' + name;
        const r = runCheck(name, st, p);
        results.push(Object.assign({ name }, r));
        console.log(`${r.ok ? 'PASS' : 'FAIL'} rmmz_rows.${name}: ${r.detail}`);
    }
    if (PROVOKE && !ALL_CHECKS.some(([n]) => PROVOKE === 'rmmz_rows.' + n)) { console.log(`FAIL rmmz_rows.provoke: UF_TEST_PROVOKE=${PROVOKE} names no check`); return 1; }
    const failed = results.filter(r => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed${PROVOKE ? ` (provoked: ${PROVOKE})` : ''}`);
    return failed.length ? 1 : 0;
}
process.exit(main());
