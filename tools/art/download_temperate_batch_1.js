const fs = require('fs');
const path = require('path');
const https = require('https');
const cp = require('child_process');

const tokenPath = path.resolve('.pixellab_token');
const token = fs.readFileSync(tokenPath, 'utf8').trim();

const BASE_DIR = path.resolve('art/staging/temperate_batch_1');
const TILES_DIR = path.join(BASE_DIR, 'tiles');
const OBJECTS_DIR = path.join(BASE_DIR, 'objects');

fs.mkdirSync(TILES_DIR, { recursive: true });
fs.mkdirSync(OBJECTS_DIR, { recursive: true });

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Authorization': 'Bearer ' + token } }, res => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', reject);
  });
}

// Simple worker pool
async function mapConcurrent(items, concurrency, fn) {
  const results = new Array(items.length);
  let currentIndex = 0;
  const workers = new Array(concurrency).fill(0).map(async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

async function downloadTiles() {
  console.log('=== DOWNLOADING TILES PRO (CONCURRENCY 8) ===');
  const tilesInv = JSON.parse(fs.readFileSync('art/staging/temperate_tiles_inventory.json'));
  let completed = 0;
  await mapConcurrent(tilesInv, 8, async (item, i) => {
    const outDir = path.join(TILES_DIR, item.id);
    const zipPath = path.join(outDir, 'tiles.zip');
    if (fs.existsSync(path.join(outDir, 'tile_0.png'))) {
      completed++;
      return;
    }
    fs.mkdirSync(outDir, { recursive: true });
    const url = `https://api.pixellab.ai/mcp/tiles-pro/${item.id}/download`;
    try {
      await downloadFile(url, zipPath);
      cp.execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${outDir}' -Force"`);
      fs.writeFileSync(path.join(outDir, 'desc.txt'), item.desc, 'utf8');
      completed++;
      if (completed % 5 === 0 || completed === tilesInv.length) {
        console.log(`Tiles downloaded: ${completed}/${tilesInv.length}`);
      }
    } catch (e) {
      console.error(`Error downloading tile ${item.id}:`, e.message);
    }
  });
  console.log(`Finished tiles: ${completed}/${tilesInv.length}`);
}

async function downloadObjects() {
  console.log('\n=== DOWNLOADING OBJECTS (CONCURRENCY 8) ===');
  const objs = JSON.parse(fs.readFileSync('art/staging/all_emrys_objects.json'));
  let completed = 0;
  await mapConcurrent(objs, 8, async (item, i) => {
    const outDir = path.join(OBJECTS_DIR, item.id);
    const zipPath = path.join(outDir, 'sheet.zip');
    if (fs.existsSync(outDir)) {
      const existing = fs.readdirSync(outDir, { withFileTypes: true }).filter(d => d.isFile() && d.name.endsWith('.json'));
      if (existing.length > 0) {
        completed++;
        return;
      }
    }
    fs.mkdirSync(outDir, { recursive: true });
    const url = `https://api.pixellab.ai/mcp/objects/${item.id}/spritesheet`;
    try {
      await downloadFile(url, zipPath);
      cp.execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${outDir}' -Force"`);
      completed++;
      if (completed % 20 === 0 || completed === objs.length) {
        console.log(`Objects downloaded: ${completed}/${objs.length}`);
      }
    } catch (e) {
      console.error(`Error downloading object ${item.id}:`, e.message);
    }
  });
  console.log(`Finished objects: ${completed}/${objs.length}`);
}

async function main() {
  await downloadTiles();
  await downloadObjects();
  console.log('\nALL ASSETS DOWNLOADED AND EXTRACTED.');
}

main().catch(console.error);

