'use strict';
const fs = require('fs');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('No GEMINI_API_KEY');
    process.exit(1);
}

const reg = JSON.parse(fs.readFileSync('C:/Users/snewt/DEUS_backups/pixellab_2026-09-30/qa_pass_objects.json', 'utf8'));
const sample = reg.items.slice(0, 5);

const promptText = `You are an expert 16-bit pixel art classifier. Inspect each image and classify it into exactly one of these categories:
- boulders_and_rocks
- ore_veins_and_crystals
- stumps_and_logs
- trees
- bushes_and_shrubs
- flowers
- grasses_reeds_cattails
- mushrooms
- ground_patches
- bones_and_skulls
- water_plants
- cacti
- man_made
- effects

Also flag if the sprite contains:
- SQUARE_BG: square opaque background fill instead of transparent canvas
- CYAN_VEIN: electric cyan / neon teal glowing veins or facets
- NEAR_DUPLICATE: near duplicate variation

Return a valid JSON array of objects:
[
  { "index": 1, "label": "category_name", "flags": [], "reason": "concise description of visible features" }
]`;

const parts = [{ text: promptText }];

for (let i = 0; i < sample.length; i++) {
    const imgPath = sample[i].images[0];
    const b64 = fs.readFileSync(imgPath).toString('base64');
    parts.push({ text: `Image #${i + 1} (id: ${sample[i].pixellabId}):` });
    parts.push({
        inlineData: {
            mimeType: 'image/png',
            data: b64
        }
    });
}

async function run() {
    console.log('Sending request to Gemini 3.1 Pro...');
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { responseMimeType: 'application/json' }
        })
    });
    const data = await res.json();
    if (data.candidates && data.candidates[0].content) {
        console.log('Gemini 2.5 Pro Output:\n', data.candidates[0].content.parts[0].text);
    } else {
        console.log('Error/Response:', JSON.stringify(data, null, 2));
    }
}

run().catch(console.error);
