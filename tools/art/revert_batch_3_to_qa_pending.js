/**
 * revert_batch_3_to_qa_pending.js
 * Utility script to revert Batch 3 catalogue entries to EXISTING_UNAPPROVED / QA_PENDING.
 * Authority: PM Directive 0175-U & DEC-007 (enforce Owner sign-off ledger).
 */
const fs = require('fs');
const path = require('path');

const catPath = path.resolve('art/catalogue/catalogue.json');
const cat = JSON.parse(fs.readFileSync(catPath, 'utf8'));

const BATCH_3_IDS = [
  'SURFACE_SHARED_FLORA_WILD-GRAIN_V1_DEFAULT',
  'SURFACE_SHARED_FLORA_BUSH_V1_DEFAULT',
  'SURFACE_SHARED_FLORA_LICHEN_V1_DEFAULT',
  'LOWER1_SHARED_FLORA_CAVE-MOSS_V1_DEFAULT',
  'LOWER1_SHARED_FLORA_SPORE-REEDS_V1_DEFAULT',
  'ALL_SHARED_STONE_IRONSTONE_V1_DEFAULT',
  'ALL_SHARED_REMAINS_RUBBLE-PILLAR_V1_DEFAULT',
  'ALL_SHARED_REMAINS_SKELETON_V1_DEFAULT'
];

for (const id of BATCH_3_IDS) {
  const entry = cat.entries.find(e => e.id === id);
  if (entry) {
    entry.status = 'EXISTING_UNAPPROVED';
    entry.statusWhy = 'QA_PENDING (awaiting Owner sign-off ledger)';
    console.log(`Updated catalogue.json: ${id} -> EXISTING_UNAPPROVED (QA_PENDING)`);
  }

  const manifestPath = path.resolve(`art/masters/source_sets/${id}/manifest.json`);
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.status = 'EXISTING_UNAPPROVED';
    manifest.statusWhy = 'QA_PENDING (awaiting Owner sign-off ledger)';
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`Updated manifest.json: ${id} -> EXISTING_UNAPPROVED (QA_PENDING)`);
  }
}

fs.writeFileSync(catPath, JSON.stringify(cat, null, 2), 'utf8');
console.log('Reverted 8 batch-3 objects to QA_PENDING successfully.');
