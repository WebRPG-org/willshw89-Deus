/**
 * fetch_pixellab_human.js
 * Read-only pickup tool for Owner-initiated human character generations from PixelLab.
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
const charId = 'ce7de6a9-ee4b-49aa-8275-ad3cfd7efe33';

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
            try {
              const json = JSON.parse(l.slice(6));
              if (json.result) return resolve(json.result);
              if (json.error) return reject(json.error);
            } catch (e) {}
          }
        }
        resolve(d);
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name, arguments: args || {} }
    }));
    req.end();
  });
}

async function main() {
  console.log(`Fetching character ${charId}...`);
  const res = await callMcp('get_character', { character_id: charId });
  const outDir = path.resolve('art/staging/human_male_peasant');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'character_meta.json'), JSON.stringify(res, null, 2), 'utf8');
  console.log('Saved character metadata.');

  if (res && res.content) {
    for (let i = 0; i < res.content.length; i++) {
      const c = res.content[i];
      if (c.type === 'text') {
        console.log('Text content:\n', c.text.substring(0, 500));
      } else if (c.type === 'image') {
        const imgPath = path.join(outDir, `image_${i}.png`);
        fs.writeFileSync(imgPath, Buffer.from(c.data, 'base64'));
        console.log(`Saved image ${i} to ${imgPath} (${c.data.length} b64 chars)`);
      }
    }
  }
}

main().catch(console.error);
