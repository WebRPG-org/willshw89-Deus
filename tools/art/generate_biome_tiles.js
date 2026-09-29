/**
 * RETIRED / DO NOT RUN
 * generate_biome_tiles.js
 * Reason for retirement: Used the banned PixelLab tool 'create_image_pro_flash'.
 * Authority: PM Directive 0175-U & DEC-007.
 * Banned from automated execution.
 */
console.error("RETIRED: generate_biome_tiles.js is retired (used banned create_image_pro_flash per Directive 0175-U). Do not run.");
process.exit(1);

const fs = require('fs');
const path = require('path');
const https = require('https');

const tokenPath = path.resolve('.pixellab_token');
if (!fs.existsSync(tokenPath)) {
  console.error('Missing .pixellab_token');
  process.exit(1);
}
const token = fs.readFileSync(tokenPath, 'utf8').trim();

const OUT_DIR = path.resolve('art/tilesets/individual_48');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const TILES_TO_GENERATE = [
  {
    name: 'desert_sand',
    prompt: 'flat 2D top-down dry desert sand ground tile, fine golden-tan sand grains, subtle soft wind ripple texture, seamless edges, no cliff, no depth, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    name: 'pine_needles',
    prompt: 'flat 2D top-down boreal coniferous forest floor ground tile, dense layer of russet-brown pine needles and dark duff, seamless edges, no cliff, no depth, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    name: 'dry_clay',
    prompt: 'flat 2D top-down hard-baked arid cracked clay soil ground tile, pale terracotta earthy fissures, seamless edges, no cliff, no depth, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    name: 'tundra_lichen',
    prompt: 'flat 2D top-down arctic tundra gravelly soil ground tile, patches of pale olive-green and pale slate-blue lichen and hardy alpine moss, seamless edges, no cliff, no depth, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    name: 'snow_field',
    prompt: 'flat 2D top-down packed winter snow and firn ground surface tile, clean crisp white snow with subtle pale cyan-blue shadow crevices, seamless edges, no cliff, no depth, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    name: 'mountain_scree',
    prompt: 'flat 2D top-down broken grey angular stone scree and small pebble scatter ground tile, seamless edges, no cliff, no depth, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    name: 'volcanic_ash',
    prompt: 'flat 2D top-down dark basaltic volcanic ash and cinders ground tile, gritty charcoal-grey volcanic soil, seamless edges, no cliff, no depth, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    name: 'calm_water',
    prompt: 'flat 2D top-down calm clean blue freshwater surface tile, subtle gentle refractive surface ripple caustic texture, seamless edges, no cliff, no depth, 16-bit top-down RPG pixel art, Ultima VII style, flat water surface'
  },
  {
    name: 'tropical_dirt',
    prompt: 'flat 2D top-down rich dark red-brown laterite tropical jungle soil ground tile, tiny decayed leaf specks, seamless edges, no cliff, no depth, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    name: 'peat_moss',
    prompt: 'flat 2D top-down dark spongy peat moss and saturated dark swamp earth ground tile, subtle organic texture, seamless edges, no cliff, no depth, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  }
];

async function main() {
  console.log(`Starting generation of ${TILES_TO_GENERATE.length} flat 48x48 biome ground tiles...`);
  
  const jobsFile = path.join(OUT_DIR, 'tile_jobs.json');
  let jobMap = {};
  if (fs.existsSync(jobsFile)) {
    try {
      jobMap = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
    } catch (e) {}
  }

  // 1. Dispatch any missing jobs
  for (const t of TILES_TO_GENERATE) {
    const targetFile = path.join(OUT_DIR, `${t.name}.png`);
    if (fs.existsSync(targetFile)) {
      console.log(`[SKIP] Tile ${t.name}.png already exists.`);
      continue;
    }

    if (jobMap[t.name]) {
      console.log(`[RESUME] Job for ${t.name} already dispatched: ${jobMap[t.name]}`);
      continue;
    }

    console.log(`[DISPATCH] Creating 48x48 image for ${t.name}...`);
    try {
      const res = await callMcp('create_image_pro_flash', {
        description: t.prompt,
        width: 48,
        height: 48,
        no_background: false
      });
      
      let jobId = null;
      if (res && res.content) {
        const textObj = res.content.find(c => c.type === 'text');
        if (textObj && textObj.text) {
          const match = textObj.text.match(/Job ID:\s*([a-f0-9-]+)/i) || textObj.text.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
          if (match) jobId = match[1];
        }
      }
      
      if (jobId) {
        console.log(`  -> Dispatched ${t.name} with Job ID: ${jobId}`);
        jobMap[t.name] = jobId;
        fs.writeFileSync(jobsFile, JSON.stringify(jobMap, null, 2), 'utf8');
      } else {
        console.error(`  -> Failed to parse job ID for ${t.name}:`, JSON.stringify(res));
      }
    } catch (err) {
      console.error(`  -> Error dispatching ${t.name}:`, err.message);
    }

    // Small delay between calls
    await sleep(1500);
  }

  // 2. Poll jobs
  console.log('\nPolling pending jobs...');
  let allDone = false;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max

  while (!allDone && attempts < maxAttempts) {
    attempts++;
    allDone = true;

    for (const t of TILES_TO_GENERATE) {
      const targetFile = path.join(OUT_DIR, `${t.name}.png`);
      if (fs.existsSync(targetFile)) {
        continue;
      }

      const jobId = jobMap[t.name];
      if (!jobId) {
        console.warn(`No job ID for ${t.name}, skipping poll.`);
        continue;
      }

      try {
        const res = await callMcp('get_image', { job_id: jobId });
        if (res && res.content) {
          const imgObj = res.content.find(c => c.type === 'image');
          if (imgObj && imgObj.data) {
            const buf = Buffer.from(imgObj.data, 'base64');
            fs.writeFileSync(targetFile, buf);
            console.log(`[DONE] Downloaded ${t.name}.png (${buf.length} bytes, 48x48)`);
            continue;
          }

          const textObj = res.content.find(c => c.type === 'text');
          const statusText = textObj ? textObj.text.split('\n')[0] : 'unknown';
          console.log(`[WAIT] ${t.name} status: ${statusText}`);
          allDone = false;
        }
      } catch (err) {
        console.error(`  -> Poll error for ${t.name}:`, err.message);
        allDone = false;
      }

      await sleep(1000);
    }

    if (!allDone) {
      console.log(`Iteration ${attempts}/${maxAttempts} complete. Waiting 5s before next poll...`);
      await sleep(5000);
    }
  }

  console.log('\nBiome tile generation finished.');
}

main().catch(console.error);
