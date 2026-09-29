/**
 * inspect_next_10.js
 * Read-only inspection script for PixelLab candidate objects.
 * Authority: PM Directive 0175-U & DEC-007 (Read-only pickup).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const tokenPath = path.resolve('.pixellab_token');
if (!fs.existsSync(tokenPath)) {
  console.error('Missing .pixellab_token file');
  process.exit(1);
}
const token = fs.readFileSync(tokenPath, 'utf8').trim();

const CANDIDATES = [
  { name: 'wild_rye', sampleId: 'ba691978-6bd5-4dd8-bb3a-358f761be827' },
  { name: 'pine_sapling', sampleId: '16291c40-610e-4d7b-9854-56014957a753' },
  { name: 'mineral_stalagmite', sampleId: '974a9cc2-41d5-4049-ba55-efea007d99c7' },
  { name: 'loose_fieldstones', sampleId: '9389df5f-5bff-4a5b-8d61-300d9cfec01c' },
  { name: 'woodland_fern', sampleId: '3d3e954f-0d54-49fc-8e2a-259ddafd81b2' },
  { name: 'wild_white_flowers', sampleId: '95816c47-bb2c-4b88-92c4-1ea6ec63a047' },
  { name: 'wild_purple_flowers', sampleId: '0b16d571-4cee-429f-82cb-44836cec216d' },
  { name: 'sulfur_crust', sampleId: '11db0e68-1a6f-480b-9b4b-7a47c463cbb8' },
  { name: 'peat_mound', sampleId: 'e4e10116-9c35-42c7-968b-6ca88c46fe11' },
  { name: 'wild_herbs', sampleId: '9cd3c10a-445a-41fb-a9a3-4070dd97ec3d' }
];

function callMcp(name, args) {
  return new Promise((resolve, reject) => {
    const req = https.request('https://api.pixellab.ai/mcp', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const lines = d.split('\n');
        for (const l of lines) {
          if (l.startsWith('data: ')) {
            try { return resolve(JSON.parse(l.slice(6))); } catch (e) {}
          }
        }
        resolve(d);
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', params: { name, arguments: args || {} }, id: 1 }));
    req.end();
  });
}

async function main() {
  for (const c of CANDIDATES) {
    const res = await callMcp('get_object', { object_id: c.sampleId });
    if (res && res.result && res.result.content) {
      const text = res.result.content[0].text;
      const statusLine = text.split('\n')[0];
      const descLine = text.split('\n')[1];
      const dirMatch = text.match(/directions:\s*(\d+)/i) || text.match(/(\d+)\s*directions/i);
      console.log(`[${c.name}] id: ${c.sampleId} | ${statusLine} | ${dirMatch ? dirMatch[0] : 'dirs?'} | ${descLine.substring(0, 60)}`);
    } else {
      console.log(`[${c.name}] id: ${c.sampleId} | ERROR:`, JSON.stringify(res));
    }
  }
}

main().catch(console.error);
