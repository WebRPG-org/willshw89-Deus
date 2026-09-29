/**
 * RETIRED / DO NOT RUN
 * induct_batch_10.js
 * Reason for retirement: Writes APPROVED status without an Owner YEA in art/APPROVALS.md.
 * Authority: PM Directive 0175-U, AGENTS.md Rule 6, & DEC-007.
 * Banned from automated execution.
 */
console.error("RETIRED: induct_batch_10.js is retired (writes APPROVED without a YEA per Directive 0175-U). Do not run.");
process.exit(1);

const fs = require('fs');
const path = require('path');
const { assembleV8Sheet, processFrame, loadPalette } = require('./assemble_v8_sheet');
const { decodePNG } = require('../png_read');
const { writePNG } = require('../png_util');

const ROOT_UF = path.resolve('.');
const palette = loadPalette(path.join(ROOT_UF, 'art/palette/deus_master_world_palette_v1.hex'));

const ASSETS = [
  {
    stagingName: 'sand_deposit',
    entryId: 'ALL_SHARED_STONE_SAND-DEPOSIT_V1_DEFAULT',
    runtimeName: '!UF_SandDeposit_V8',
    topologyClass: 'STATIC_VARIANT_8'
  },
  {
    stagingName: 'grass_tuft',
    entryId: 'SURFACE_SHARED_FLORA_GRASS-TUFT_V1_DEFAULT',
    runtimeName: '!UF_GrassTuft_V8',
    topologyClass: 'STATIC_VARIANT_8'
  },
  {
    stagingName: 'wildflowers',
    entryId: 'SURFACE_SHARED_FLORA_FLOWERS_V1_DEFAULT',
    runtimeName: '!UF_Flowers_V8',
    topologyClass: 'STATIC_VARIANT_8'
  },
  {
    stagingName: 'snow_bush',
    entryId: 'SURFACE_SHARED_FLORA_SNOW-BUSH_V1_DEFAULT',
    runtimeName: '!UF_SnowBush_V8',
    topologyClass: 'STATIC_VARIANT_8'
  },
  {
    stagingName: 'sapling',
    entryId: 'SURFACE_SHARED_TREE_SAPLING_V1_DEFAULT',
    runtimeName: '!UF_Sapling_V8',
    topologyClass: 'STATIC_VARIANT_8'
  },
  {
    stagingName: 'glow_caps',
    entryId: 'LOWER1_SHARED_FLORA_GLOW-CAPS_V1_DEFAULT',
    runtimeName: '!UF_GlowCaps_V8',
    topologyClass: 'STATIC_VARIANT_8'
  },
  {
    stagingName: 'stalagmite',
    entryId: 'LOWER1_SHARED_STONE_STALAGMITE_V1_DEFAULT',
    runtimeName: '!UF_Stalagmite_V8',
    topologyClass: 'STATIC_VARIANT_8'
  },
  {
    stagingName: 'crystal_small',
    entryId: 'ALL_SHARED_STONE_CRYSTAL-SMALL_V1_DEFAULT',
    runtimeName: '!UF_CrystalSmall_V8',
    topologyClass: 'STATIC_VARIANT_8'
  },
  {
    stagingName: 'rubble',
    entryId: 'ALL_SHARED_REMAINS_RUBBLE_V1_DEFAULT',
    runtimeName: '!UF_Rubble_V8',
    topologyClass: 'STATIC_VARIANT_8'
  },
  {
    stagingName: 'well',
    entryId: 'ALL_SHARED_STRUCTURE_WELL_V1_DEFAULT',
    runtimeName: '!UF_Well_V8',
    topologyClass: 'STATIC_VARIANT_8'
  }
];

function run() {
  console.log(`Starting induction for ${ASSETS.length} assets...`);

  for (const asset of ASSETS) {
    console.log(`\n========================================`);
    console.log(`Inducting ${asset.stagingName} -> ${asset.entryId}...`);

    const stagingDir = path.join(ROOT_UF, 'art/staging', `${asset.stagingName}_variants`);
    const sourceSetRel = `art/masters/source_sets/${asset.entryId}`;
    const sourceSetAbs = path.join(ROOT_UF, sourceSetRel);
    fs.mkdirSync(sourceSetAbs, { recursive: true });

    const masterVariantFiles = [];
    const sourceVariantsForCatalogue = [];
    let master0Buf = null;

    for (let i = 0; i < 8; i++) {
      const rawFile = path.join(stagingDir, `${asset.stagingName}_raw_var${i}.png`);
      if (!fs.existsSync(rawFile)) {
        throw new Error(`Missing raw file: ${rawFile}`);
      }

      const rawBuf = fs.readFileSync(rawFile);
      const img = decodePNG(rawBuf);
      const processedBuf = processFrame(img, palette, true);

      const masterFileRel = `${sourceSetRel}/variant_${i}.png`;
      const masterFileAbs = path.join(ROOT_UF, masterFileRel);
      writePNG(masterFileAbs, 48, 48, processedBuf);
      masterVariantFiles.push(masterFileAbs);

      if (i === 0) master0Buf = processedBuf;

      sourceVariantsForCatalogue.push({
        variantIndex: i,
        masterFile: masterFileRel,
        provenance: {
          sourceFacing: null,
          generator: 'pixellab',
          generationId: 'owner_batch_10',
          originalityDistance: null,
          notes: `Owner-approved variant ${i}`
        }
      });
    }

    // Single master file
    const singleMasterRel = `art/masters/${asset.entryId}.png`;
    const singleMasterAbs = path.join(ROOT_UF, singleMasterRel);
    writePNG(singleMasterAbs, 48, 48, master0Buf);
    console.log(`  Saved single master: ${singleMasterRel}`);

    // Runtime sheet
    const runtimePngRel = `game/img/characters/${asset.runtimeName}.png`;
    const runtimeJsonRel = `game/img/characters/${asset.runtimeName}.json`;
    const runtimePngAbs = path.join(ROOT_UF, runtimePngRel);
    const runtimeJsonAbs = path.join(ROOT_UF, runtimeJsonRel);

    assembleV8Sheet({
      inputFrames: masterVariantFiles,
      outPng: runtimePngAbs,
      outJson: runtimeJsonAbs,
      topologyClass: asset.topologyClass,
      palettePath: path.join(ROOT_UF, 'art/palette/deus_master_world_palette_v1.hex')
    });
    console.log(`  Compiled V8 sheet: ${runtimePngRel}`);

    // Source set manifest matching exact catalogue schema requirements
    const sourceSetManifest = {
      topologyClass: asset.topologyClass,
      variantCount: 8,
      variantSelectionMode: 'DETERMINISTIC_HASH',
      runtime: {
        kind: 'RMMZ_CHARACTER_8',
        file: `img/characters/${asset.runtimeName}.png`,
        index: 0
      },
      status: 'APPROVED',
      statusWhy: 'Owner-generated on PixelLab, ingested as 8-variant V8 sheet (DEC-007 Owner involvement)',
      sourceVariants: sourceVariantsForCatalogue
    };
    fs.writeFileSync(path.join(sourceSetAbs, 'manifest.json'), JSON.stringify(sourceSetManifest, null, 2), 'utf8');
    console.log(`  Wrote source set manifest: ${sourceSetRel}/manifest.json`);
  }

  console.log(`\nAll 10 asset manifests updated successfully.`);
}

run();
