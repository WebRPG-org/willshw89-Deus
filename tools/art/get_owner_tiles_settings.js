// get_owner_tiles_settings.js - Fetches PixelLab get_tiles_pro settings for Owner's 6 tile groups
const fs = require('fs');
const path = require('path');
const https = require('https');

const tokenPath = path.resolve('.pixellab_token');
const token = fs.readFileSync(tokenPath, 'utf8').trim();

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

function listTools() {
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
    req.write(JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', params: {}, id: 1 }));
    req.end();
  });
}

async function run() {
  const toolsRes = await listTools();
  const getTilesTool = toolsRes?.result?.tools?.find(t => t.name === 'get_tiles_pro');
  console.log('get_tiles_pro tool schema:', JSON.stringify(getTilesTool, null, 2));

  const ids = [
    '34f6bc9b-17ce-49e8-852d-ad5cd1ca9c68',
    '92ce97ee-5e8b-4a32-a84f-4ac212c2bb64',
    '5b87448c-0852-4370-bb25-a9bc78af799c',
    'aa902541-ba31-4f77-8e4b-ad530685a9d8',
    'b8b3d0b3-50be-491a-b431-f55cb63a3eb1',
    'b36d5ea3-5576-49be-a4f9-53d31c52004f'
  ];

  const results = {};
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    // try different arg keys if needed
    const argKey = getTilesTool?.inputSchema?.required?.[0] || 'tile_group_id';
    console.log(`Calling get_tiles_pro for set_${i} (${id}) using ${argKey}...`);
    const res = await callMcp('get_tiles_pro', { [argKey]: id });
    results[`set_${i}`] = {
      id,
      response: res
    };
  }

  const outDir = path.resolve('art/masters/owner/2026-09-29_biome');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'settings.json');
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Saved settings to ${outFile}`);
}

run().catch(console.error);
