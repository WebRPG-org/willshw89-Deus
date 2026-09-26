#!/usr/bin/env node
'use strict';
// Self-test for tools/art/validate_asset_standard.js.
// Every check is shown passing on a good record and failing on a mutant of that record.
// A mutant that still passes means the check was removed or weakened.

const fs = require('fs');
const path = require('path');
const V = require('./validate_asset_standard.js');

const ROOT = path.resolve(__dirname, '..', '..');
const FIX = path.join(__dirname, 'fixtures', 'asset_standard');
const load = name => JSON.parse(fs.readFileSync(path.join(FIX, name), 'utf8'));
const standard = V.readJson(path.join(ROOT, 'game', 'data', 'UF_AssetStandard.json'));
const schema = V.readJson(path.join(ROOT, 'game', 'data', 'UF_SpellVisualTable.schema.json'));
const spells = V.readJson(path.join(ROOT, 'game', 'data', 'srd51', 'spells.json'));
const addenda = load('addenda.json');

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
    if (cond) { passed++; console.log('PASS ' + name); }
    else { failed++; console.log('FAIL ' + name + (detail ? ': ' + detail : '')); }
}
function hit(results, ruleId, status) {
    return results.some(r => r.ruleId === ruleId && r.result === status);
}
function kills(name, ruleId, goodResults, badResults) {
    check(name + '.good', hit(goodResults, ruleId, 'pass'), JSON.stringify(goodResults.filter(r => r.ruleId === ruleId)));
    check(name + '.mutant', hit(badResults, ruleId, 'violate'), JSON.stringify(badResults.filter(r => r.ruleId === ruleId)));
}

const valid = load('valid_entry.json');
kills('rows', 'AS-CRIT-001', V.checkEntry(valid, standard).results, V.checkEntry(load('missing_row.json'), standard).results);
const rowMutant = V.clone(valid);
rowMutant.declaredRows = rowMutant.declaredRows.filter(r => r !== 'death');
kills('rows-mutant', 'AS-CRIT-001', V.checkEntry(valid, standard).results, V.checkEntry(rowMutant, standard).results);

kills('frame', 'AS-CRIT-004', V.checkEntry(valid, standard).results, V.checkEntry(load('wrong_frame.json'), standard).results);
const frameMutant = V.clone(valid);
frameMutant.framePx = [32, 48];
kills('frame-mutant', 'AS-CRIT-004', V.checkEntry(valid, standard).results, V.checkEntry(frameMutant, standard).results);

kills('name', 'AS-GLOBAL-010', V.checkEntry(valid, standard).results, V.checkEntry(load('bad_name.json'), standard).results);
const nameMutant = V.clone(valid);
nameMutant.id = 'not a name';
kills('name-mutant', 'AS-GLOBAL-010', V.checkEntry(valid, standard).results, V.checkEntry(nameMutant, standard).results);

const zGood = V.clone(load('bad_zorder.json'));
zGood.paperDoll.zOrder = 6;
kills('zorder', 'AS-HUM-004', V.checkEntry(zGood, standard).results, V.checkEntry(load('bad_zorder.json'), standard).results);
const zMutant = V.clone(zGood);
zMutant.paperDoll.zOrder = 3;
kills('zorder-mutant', 'AS-HUM-004', V.checkEntry(zGood, standard).results, V.checkEntry(zMutant, standard).results);

const eight = load('eight_dir.json');
kills('eight-dir', 'AS-GLOBAL-023', V.checkEntry(valid, standard).results, V.checkEntry(eight, standard).results);
const eightMutant = V.clone(valid);
eightMutant.frames.facings = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
kills('eight-dir-mutant', 'AS-GLOBAL-023', V.checkEntry(valid, standard).results, V.checkEntry(eightMutant, standard).results);

const spellGood = schema.examples[0];
kills('spell-damage', 'AS-FX-003', V.checkSpellTable(spellGood, schema, standard), V.checkSpellTable(load('bad_spell.json'), schema, standard));
const spellMutant = V.clone(spellGood);
spellMutant.rows[0].damageTypes = ['void'];
kills('spell-damage-mutant', 'AS-FX-003', V.checkSpellTable(spellGood, schema, standard), V.checkSpellTable(spellMutant, schema, standard));

const human = V.clone(valid);
human.category = 'CHARACTER';
human.id = 'ALL_SHARED_CHARACTER_HUMAN_MALE-T0_DEFAULT';
human.sizeClass = 'Medium';
human.frameClass = 'MEDIUM';
human.declaredRows = standard.humanoidRows.slice();
const humanBad = V.clone(human);
humanBad.declaredRows = human.declaredRows.filter(r => r !== 'dodge');
kills('humanoid-rows', 'AS-HUM-009', V.checkEntry(human, standard).results, V.checkEntry(humanBad, standard).results);

const beast = V.clone(valid);
beast.sizeClass = 'Medium';
beast.frameClass = 'MEDIUM';
beast.declaredAttacks = ['bite'];
beast.declaredRows = standard.critterRows.concat(['attack-bite']);
const beastBad = V.clone(beast);
beastBad.declaredRows = standard.critterRows.slice();
kills('beast-attack', 'AS-BEAST-001', V.checkEntry(beast, standard).results, V.checkEntry(beastBad, standard).results);

const vocabBad = V.clone(valid);
vocabBad.biome = 'NOTABIOME';
kills('band-vocab', 'AS-GLOBAL-019', V.checkEntry(valid, standard).results, V.checkEntry(vocabBad, standard).results);
const legacy = V.clone(valid);
legacy.band = 'LOWER2';
legacy.biome = 'TEMP';
check('band-legacy-unknown', hit(V.checkEntry(legacy, standard).results, 'AS-GLOBAL-019', 'unknown'));

const layer = addenda.layer;
const layerCount = V.clone(layer);
layerCount.frameCount = 2;
layerCount.frames = layer.frames.slice(0, 2);
kills('pose-count', 'AS-HUM-016', V.checkLayer(layer, standard), V.checkLayer(layerCount, standard));
const layerAnchor = V.clone(layer);
delete layerAnchor.frames[1].anchor;
kills('pose-anchor', 'AS-HUM-016', V.checkLayer(layer, standard), V.checkLayer(layerAnchor, standard));
const layerAngle = V.clone(layer);
layerAngle.frames[0].anchor.angle = 'A10';
kills('pose-angle', 'AS-HUM-016', V.checkLayer(layer, standard), V.checkLayer(layerAngle, standard));
const deform = V.clone(layer);
deform.deforming = true;
deform.deformingKind = 'cape';
deform.poses = standard.poseGrid.map(p => p.id);
const deformBad = V.clone(deform);
deformBad.poses = deform.poses.filter(id => id !== 'death');
kills('deforming', 'AS-HUM-017', V.checkLayer(deform, standard), V.checkLayer(deformBad, standard));

const face = addenda.face;
const faceOrder = V.clone(face);
faceOrder.layers = ['background', 'face', 'body-base', 'hair', 'gear', 'overlay'];
kills('face-layers', 'AS-FACE-002', V.checkFace(face, standard), V.checkFace(faceOrder, standard));
const faceBg = V.clone(face);
faceBg.layers = face.layers.slice(1);
kills('face-background', 'AS-FACE-001', V.checkFace(face, standard), V.checkFace(faceBg, standard));
const faceExpr = V.clone(face);
faceExpr.expressions = face.expressions.slice().reverse();
kills('face-expressions', 'AS-FACE-003', V.checkFace(face, standard), V.checkFace(faceExpr, standard));
const faceCell = V.clone(face);
faceCell.cell = [72, 72];
kills('face-anchors', 'AS-FACE-004', V.checkFace(face, standard), V.checkFace(faceCell, standard));
const faceAnchor = V.clone(face);
delete faceAnchor.anchors.crown;
kills('face-anchor-missing', 'AS-FACE-004', V.checkFace(face, standard), V.checkFace(faceAnchor, standard));

const item = addenda.item;
const itemId = V.clone(item);
itemId.id = 'elven_plate';
itemId.artKey = 'elven_plate__elf';
kills('item-id', 'AS-ITEM-001', V.checkItem(item, standard), V.checkItem(itemId, standard));
const itemKey = V.clone(item);
itemKey.artKey = 'armor_plate_dwarf';
kills('art-key', 'AS-ITEM-002', V.checkItem(item, standard), V.checkItem(itemKey, standard));

const icon = addenda.icon;
const iconSize = V.clone(icon);
iconSize.w = 24;
kills('icon-size', 'AS-ICON-001', V.checkIcon(icon, standard), V.checkIcon(iconSize, standard));
const iconRarity = V.clone(icon);
iconRarity.rarity = 'redraw';
iconRarity.id = 'icon:item:longsword_rare';
kills('icon-rarity', 'AS-ICON-003', V.checkIcon(icon, standard), V.checkIcon(iconRarity, standard));

const node = addenda.node;
const nodeBad = V.clone(node);
nodeBad.variants = node.variants.filter(b => b !== 'WILD');
kills('resource', 'AS-NODE-001', V.checkNode(node, standard), V.checkNode(nodeBad, standard));

kills('animation', 'AS-ANIM-001', [V.animationResult(addenda.asset, standard)], [V.animationResult({ id: 'rock', animation: null, exception: null }, standard)]);
const animMutant = V.clone(addenda.staticAsset);
animMutant.exception = 'not-a-real-exception';
kills('animation-exception', 'AS-ANIM-001', [V.animationResult(addenda.staticAsset, standard)], [V.animationResult(animMutant, standard)]);

kills('remains', 'AS-REMAIN-001', V.checkRemains(addenda.remains, standard), V.checkRemains(Object.assign(V.clone(addenda.remains), { skeleton: false }), standard));
kills('carry', 'AS-HAUL-001', V.checkHaul(addenda.haul, standard), V.checkHaul(Object.assign(V.clone(addenda.haul), { carry: 'not-drawn' }), standard));
const vehBad = V.clone(addenda.vehicle);
vehBad.directions = ['S', 'W'];
kills('vehicles', 'AS-VEH-001', V.checkVehicles(addenda.vehicle, standard), V.checkVehicles(vehBad, standard));
const nightBad = V.clone(addenda.night);
nightBad.dynamicLight.blur = true;
kills('night', 'AS-LIGHT-001', V.checkNight(addenda.night), V.checkNight(nightBad));
const nameBad = V.clone(addenda.name);
nameBad.runtimeFile = 'img/characters/$UF_Layer_longsword.png';
kills('filename', 'AS-STYLE-001', V.checkName(addenda.name), V.checkName(nameBad));
kills('ui-min', 'AS-UI-003', V.checkUi(16, standard), V.checkUi(8, standard));
const bannersBad = standard.banners.slice(0, 5);
kills('map', 'AS-MAP-001', V.checkMap(standard.banners, standard), V.checkMap(bannersBad, standard));
const propsBad = standard.readableProps.filter(p => p !== 'gravestone');
kills('props', 'AS-PROP-001', V.checkProps(standard.readableProps, standard), V.checkProps(propsBad, standard));

kills('outfit-matrix', 'AS-HUM-015', V.checkMatrix(standard.outfitMatrix, standard), V.checkMatrix(standard.outfitMatrix.slice(1), standard));
const pixelBad = V.clone(standard.outfitMatrix);
pixelBad[0].pixels = 'shared';
kills('outfit-pixels', 'AS-HUM-015', V.checkMatrix(standard.outfitMatrix, standard), V.checkMatrix(pixelBad, standard));
const lifeBad = V.clone(standard.bodyTemplates);
delete lifeBad.elder;
kills('life', 'AS-HUM-019', V.checkLife(standard.bodyTemplates), V.checkLife(lifeBad));

const summonGood = V.checkSummons(spells.entries, standard.summons, standard.summonDerivation);
const extraSpell = { kind: 'spell', id: 'srd:spell:conjure-test', name: 'Conjure Test', data: { description: 'You conjure a test creature.' } };
kills('summon-map', 'AS-SUMMON-001', summonGood, V.checkSummons(spells.entries.concat([extraSpell]), standard.summons, standard.summonDerivation));
const tableBad = V.clone(standard.summons);
tableBad[0].dismiss = '';
kills('summon-parts', 'AS-SUMMON-002', summonGood, V.checkSummons(spells.entries, tableBad, standard.summonDerivation));

const skinBad = V.clone(standard.uiSkins);
skinBad.skins = skinBad.skins.filter(skin => skin.id !== 'deus-dark');
kills('skins', 'AS-UI-004', V.checkSkins(standard.uiSkins, standard), V.checkSkins(skinBad, standard));

const religionBad = V.clone(standard.religion);
religionBad.pieces = religionBad.pieces.filter(piece => piece !== 'altar');
kills('religion', 'AS-REL-001', V.checkReligion(standard.religion), V.checkReligion(religionBad));
const deityBad = V.clone(standard.religion);
deityBad.deities = [{ id: 'unnamed', holySymbolId: '' }];
kills('religion-symbol', 'AS-REL-001', V.checkReligion(standard.religion), V.checkReligion(deityBad));

const farmBad = V.clone(standard.farming);
farmBad.stages = farmBad.stages.filter(stage => stage !== 'mature');
kills('farm', 'AS-FARM-001', V.checkFarm(standard.farming), V.checkFarm(farmBad));
const foodBad = V.clone(standard.food);
foodBad.states = ['raw'];
kills('food', 'AS-FOOD-001', V.checkFood(standard.food), V.checkFood(foodBad));
kills('dungeon', 'AS-DUNG-001', V.checkClosed('AS-DUNG-001', standard.dungeonKit, standard.dungeonKit, 'dungeon'), V.checkClosed('AS-DUNG-001', standard.dungeonKit.slice(1), standard.dungeonKit, 'dungeon'));
kills('traps', 'AS-TRAP-001', V.checkClosed('AS-TRAP-001', standard.traps, standard.traps, 'traps'), V.checkClosed('AS-TRAP-001', standard.traps.slice(1), standard.traps, 'traps'));
kills('lore', 'AS-LORE-001', V.checkClosed('AS-LORE-001', standard.loreVisuals, standard.loreVisuals, 'lore'), V.checkClosed('AS-LORE-001', standard.loreVisuals.slice(1), standard.loreVisuals, 'lore'));
kills('zones', 'AS-ZONE-001', V.checkClosed('AS-ZONE-001', standard.designations, standard.designations, 'zones'), V.checkClosed('AS-ZONE-001', standard.designations.slice(1), standard.designations, 'zones'));
const sceneBad = V.clone(standard.eventScenes);
sceneBad.required = true;
kills('scenes', 'AS-SCENE-001', V.checkScenes(standard.eventScenes), V.checkScenes(sceneBad));
const marketingBad = V.clone(standard.marketing);
marketingBad.required = true;
kills('marketing', 'AS-MKTG-001', V.checkMarketing(standard.marketing), V.checkMarketing(marketingBad));

const tameArtBad = V.clone(standard.domestication);
tameArtBad.art = tameArtBad.art.filter(piece => piece !== 'cage');
kills('tame-art', 'AS-TAME-001', V.checkTame(standard.domestication), V.checkTame(tameArtBad));
const tameSlotBad = V.clone(standard.domestication);
tameSlotBad.creatureEquipmentSlots = ['barding'];
kills('tame-slots', 'AS-TAME-002', V.checkTame(standard.domestication), V.checkTame(tameSlotBad));

const varietyBad = V.clone(standard.variety);
varietyBad.surface.TEMPERATE.trees = 11;
kills('variety', 'AS-VAR-001', V.checkVariety(standard.variety, standard), V.checkVariety(varietyBad, standard));
const seasonBad = V.clone(standard.variety);
seasonBad.surface.WILD.seasons = 'redraw';
kills('variety-season', 'AS-VAR-002', V.checkVariety(standard.variety, standard), V.checkVariety(seasonBad, standard));
const flipBad = V.clone(standard.variety);
flipBad.surface.ARID.flip = true;
kills('variety-flip', 'AS-VAR-002', V.checkVariety(standard.variety, standard), V.checkVariety(flipBad, standard));

const geneBad = V.clone(standard.genes);
geneBad.perRace.human.bodyTypes.male.styles.pop();
kills('genes', 'AS-GENE-001', V.checkGenes(standard.genes, standard), V.checkGenes(geneBad, standard));

const portraitBad = V.clone(standard.portraitSample);
delete portraitBad.portrait;
kills('portrait', 'AS-PORT-001', V.checkPortrait(standard.portraitSample, standard), V.checkPortrait(portraitBad, standard));
const portraitName = V.clone(standard.portraitSample);
portraitName.portrait.file = 'portrait.png';
kills('portrait-name', 'AS-STYLE-001', V.checkPortrait(standard.portraitSample, standard), V.checkPortrait(portraitName, standard));

const headBad = V.clone(standard.headGrid.sample);
headBad.frames = headBad.frames.slice(0, 11);
kills('head-grid', 'AS-HEAD-001', V.checkHeadLayer(standard.headGrid.sample), V.checkHeadLayer(headBad));
const longBad = V.clone(standard.headGrid.longHairSample);
longBad.extras = longBad.extras.concat([{ pose: 'swing', dir: 'S' }]);
kills('head-extra', 'AS-HEAD-001', V.checkHeadLayer(standard.headGrid.longHairSample), V.checkHeadLayer(longBad));
const anchorBad = V.clone(standard.elderReuse.frames);
delete anchorBad[0].headAnchor;
kills('head-anchor', 'AS-HEAD-001', V.checkBodyAnchors(standard.elderReuse.frames, standard), V.checkBodyAnchors(anchorBad, standard));

const elderBad = V.clone(standard.elderReuse);
elderBad.garbSheet = 'elder';
kills('elder-sheet', 'AS-ELDER-001', V.checkElder(standard.elderReuse, standard), V.checkElder(elderBad, standard));
const elderGap = V.clone(standard.elderReuse);
elderGap.frames = elderGap.frames.slice(0, -1);
elderGap.frameCount = elderGap.frames.length;
kills('elder-offset', 'AS-ELDER-001', V.checkElder(standard.elderReuse, standard), V.checkElder(elderGap, standard));

const gearBad = V.clone(standard.gearPolicy.rows);
gearBad[1].silhouetteId = 'sil:longsword-elf';
kills('gear', 'AS-GEAR-001', V.checkGear(standard.gearPolicy.rows), V.checkGear(gearBad));

const mirrorBad = V.clone(addenda.mirror);
mirrorBad.symmetric = false;
kills('mirror', 'AS-MIRROR-001', V.checkMirror(addenda.mirror), V.checkMirror(mirrorBad));

const poseBad = V.clone(standard);
poseBad.humanoidRows = poseBad.humanoidRows.filter(row => row !== 'prone');
kills('poses', 'AS-POSE-001', V.checkPoses(standard), V.checkPoses(poseBad));

const six = load('biomes_six.json');
const realBiomes = V.readJson(path.join(ROOT, 'game', 'data', 'DEUS_BiomeRegistry.json'));
kills('biome-set', 'AS-BIOME-005', V.checkBiomeRegistry(six, standard, 'biomes_six.json'), V.checkBiomeRegistry(realBiomes, standard, 'DEUS_BiomeRegistry.json'));
const docsBiomes = V.readJson(path.join(ROOT, 'docs', 'art', 'DEUS_BiomeRegistry.json'));
check('biome-docs', hit(V.checkBiomeRegistry(docsBiomes, standard, 'docs'), 'AS-BIOME-005', 'violate'));

const sizeBad = V.clone(valid);
sizeBad.sizeClass = 'Gargantuan';
sizeBad.bodyShape = 'square';
sizeBad.framePx = [48, 48];
kills('size', 'AS-SIZE-001', [V.sizeResult(valid, standard)], [V.sizeResult(sizeBad, standard)]);

const sheetBad = V.clone(standard.sheetSample);
sheetBad.w = 512;
kills('sheet', 'AS-SLOT-001', V.checkSheet(standard.sheetSample, standard), V.checkSheet(sheetBad, standard));
const atlasBad = V.clone(standard.runtimeAtlas);
atlasBad.squares = [40, 40];
kills('atlas', 'AS-SLOT-001', V.checkAtlas(standard.runtimeAtlas), V.checkAtlas(atlasBad));

const pipeBad = V.clone(standard.pipelineSample);
pipeBad.scaled = true;
kills('pipeline', 'AS-PIPE-001', V.checkPipeline(standard.pipelineSample), V.checkPipeline(pipeBad));

const promptBad = V.clone(standard.promptSpecTemplates);
promptBad.categories.creature.promptText = 'not-a-field-template';
kills('prompt-fields', 'AS-PROMPT-001', V.checkPromptTemplates(standard.promptSpecTemplates), V.checkPromptTemplates(promptBad));

const logBad = V.clone(standard.generationLogSample);
delete logBad.seed;
kills('gen-log', 'AS-GEN-001', V.checkGenerationLog(standard.generationLogSample, standard.generationLog), V.checkGenerationLog(logBad, standard.generationLog));
const yieldBad = V.clone(standard.yieldSample);
delete yieldBad.costPerUsableSlot;
kills('yield', 'AS-GEN-002', V.checkYield(standard.yieldSample), V.checkYield(yieldBad));
const versionBad = V.clone(standard.promptVersionSample);
versionBad.abYieldBeatsCurrent = false;
kills('prompt-version', 'AS-GEN-003', V.checkPromptVersion(standard.promptVersionSample), V.checkPromptVersion(versionBad));
const routeBad = V.clone(standard);
routeBad.routingPolicy = V.clone(standard.routingPolicy);
routeBad.routingPolicy.objective = 'cheapest-only';
kills('generators', 'AS-GEN-004', V.checkGenerators(standard), V.checkGenerators(routeBad));

kills('paper-doll-sheet', 'AS-SRC-001', V.checkSourceSheet(load('a9b_paper_doll.json')), V.checkSourceSheet(load('a9b_paper_doll_bad.json')));
kills('source-cap', 'AS-SRC-001', V.checkSourceSheet(load('a9b_creature_strip.json')), V.checkSourceSheet(load('a9b_over_cap.json')));
kills('rmmz-size', 'AS-SRC-001', V.checkSourceSheet(load('a9b_charset.json')), V.checkSourceSheet(load('a9b_rmmz_bad.json')));
kills('stacked-large', 'AS-SRC-001', V.checkSourceSheet(load('a9b_creature_strip.json')), V.checkSourceSheet(load('a9b_stacked.json')));

const repoBad = V.clone(standard.repoStorage);
repoBad.pixelsInRepo = true;
kills('repo', 'AS-REPO-001', V.checkRepoPolicy(standard.repoStorage), V.checkRepoPolicy(repoBad));

const previewBad = V.clone(standard.ownerPreview);
previewBad.required = false;
kills('preview', 'AS-PREVIEW-001', V.checkOwnerPreview(standard.ownerPreview), V.checkOwnerPreview(previewBad));

const mixSets = V.clone(standard.layeredSets);
mixSets[0].memberGeneratorIds = [null, 'gen-a'];
kills('generator-mix', 'AS-GEN-005', V.checkGeneratorCap(standard.generatorRoster, standard.layeredSets), V.checkGeneratorCap(standard.generatorRoster, mixSets));
const capRoster = V.clone(standard.generatorRoster);
capRoster.max = 4;
kills('generator-cap', 'AS-GEN-005', V.checkGeneratorCap(standard.generatorRoster, standard.layeredSets), V.checkGeneratorCap(capRoster, standard.layeredSets));

const sexBad = V.clone(standard.sexedBodies);
sexBad.adult = ['male'];
kills('sexed-bodies', 'AS-SEX-001', V.checkSexedBodies(standard.sexedBodies, standard), V.checkSexedBodies(sexBad, standard));

const setBad = V.clone(standard.creatureSex);
setBad.dimorphic.find(entry => entry.name === 'Lion').sexes.female.saddle = false;
kills('creature-sets', 'AS-SEX-002', V.checkCreatureSex(standard.creatureSex), V.checkCreatureSex(setBad));
const noneBad = V.clone(standard.creatureSex);
noneBad.noneSamples[0].sexes = { male: { base: true, tamed: true, saddle: true } };
kills('creature-none', 'AS-SEX-002', V.checkCreatureSex(standard.creatureSex), V.checkCreatureSex(noneBad));
kills('creature-file', 'AS-SEX-002', V.checkCreatureSex(standard.creatureSex, V.readJson(path.join(ROOT, 'game', 'data', 'srd51', 'creatures.json'))), V.checkCreatureSex(standard.creatureSex, load('a9b_creatures_missing.json')));

const grammarBad = V.clone(standard.slotMap);
grammarBad.grammarSamples[0].id = 'CH.NOPE.ELF.F.00.IDLE.D.F0';
kills('slot-grammar', 'AS-ID-001', V.checkSlotIds(standard.slotMap, standard), V.checkSlotIds(grammarBad, standard));
const dupBad = V.clone(standard.slotMap);
dupBad.grammarSamples[1].id = dupBad.grammarSamples[0].id;
kills('slot-unique', 'AS-ID-001', V.checkSlotIds(standard.slotMap, standard), V.checkSlotIds(dupBad, standard));
const retiredBad = V.clone(standard.slotMap);
retiredBad.retiredIds = retiredBad.retiredIds.concat([retiredBad.sheet.cells[0].id]);
kills('slot-retired', 'AS-ID-001', V.checkSlotIds(standard.slotMap, standard), V.checkSlotIds(retiredBad, standard));
const coverBad = V.clone(standard.slotMap);
coverBad.sheet.cells = coverBad.sheet.cells.slice(0, -1);
kills('slot-coverage', 'AS-ID-001', V.checkSlotIds(standard.slotMap, standard), V.checkSlotIds(coverBad, standard));
const linkBad = V.clone(standard.slotMap);
linkBad.sheet.cells[0].catalogueId = '';
kills('slot-catalogue', 'AS-ID-001', V.checkSlotIds(standard.slotMap, standard), V.checkSlotIds(linkBad, standard));
const posBad = V.clone(standard.slotMap);
posBad.resolveBy = 'pixel-position';
kills('slot-resolve', 'AS-ID-001', V.checkSlotIds(standard.slotMap, standard), V.checkSlotIds(posBad, standard));
const patternBad = V.clone(standard.slotMap);
patternBad.grammar = V.clone(standard.slotMap.grammar);
patternBad.grammar['charset-layer'] = '^CH\\.HAIR\\.ONLY$';
kills('slot-pattern', 'AS-ID-001', V.checkSlotIds(standard.slotMap, standard), V.checkSlotIds(patternBad, standard));

const clipBad = V.clone(standard.anchorTool);
clipBad.sample.clipping = true;
kills('anchor-reject', 'AS-ANCHOR-001', V.checkAnchorAlignment(standard.anchorTool), V.checkAnchorAlignment(clipBad));
const shiftBad = V.clone(standard.anchorTool);
shiftBad.sample.shiftX = 1.5;
kills('anchor-shift', 'AS-ANCHOR-001', V.checkAnchorAlignment(standard.anchorTool), V.checkAnchorAlignment(shiftBad));

function equipView(frames) {
    return {
        equipmentAnchors: standard.equipmentAnchors,
        angles: standard.angles,
        elderReuse: { frames: frames },
        poseGrid: standard.poseGrid,
        directions: standard.directions
    };
}
const handFrames = V.clone(standard.elderReuse.frames);
delete handFrames[0].mainHand;
kills('equip-hand', 'AS-EQUIP-001', V.checkEquipmentAnchors(standard), V.checkEquipmentAnchors(equipView(handFrames)));
const drawFrames = V.clone(standard.elderReuse.frames);
drawFrames[0].drawOrder = 'behind';
kills('equip-draw', 'AS-EQUIP-001', V.checkEquipmentAnchors(standard), V.checkEquipmentAnchors(equipView(drawFrames)));

const a9cGood = V.checkA9c(standard);
function a9cBad(mutate) {
    const copy = V.clone(standard);
    mutate(copy);
    return V.checkA9c(copy);
}
kills('look', 'AS-LOOK-001', a9cGood, a9cBad(s => { s.a9c.proportion.samples[0].headPx = 20; }));
kills('proj', 'AS-PROJ-001', a9cGood, a9cBad(s => { s.a9c.projection.eightDirection = 'allowed'; }));
kills('furn', 'AS-FURN-001', a9cGood, a9cBad(s => { s.a9c.furniture.samples[1].reuse = 'flagged'; }));
kills('terr', 'AS-TERR-001', a9cGood, a9cBad(s => { s.a9c.terrain.a2Autotile = true; }));
kills('track', 'AS-TRACK-001', a9cGood, a9cBad(s => { s.a9c.groundMarks.fadeSteps = 1; }));
kills('glow', 'AS-GLOW-001', a9cGood, a9cBad(s => { delete s.a9c.lights.sources[0].radiusPx; }));
kills('depth', 'AS-DEPTH-001', a9cGood, a9cBad(s => { s.a9c.depth.toggles.pop(); }));
kills('world-sprite', 'AS-WITEM-001', a9cGood, a9cBad(s => { s.a9c.worldItems.samples[0].scaled = true; }));
kills('feature', 'AS-FEAT-001', a9cGood, a9cBad(s => { s.a9c.features.work = s.a9c.features.work.filter(id => id !== 'fish'); }));
kills('placement', 'AS-PLAY-001', a9cGood, a9cBad(s => { s.a9c.placement.sizePx = [16, 24, 48]; }));
kills('container', 'AS-CONT-001', a9cGood, a9cBad(s => { s.a9c.containers.types[0].facings = ['S']; }));
kills('scale', 'AS-SCALE-001', a9cGood, a9cBad(s => { s.geometry.layerFt = 10; }));
kills('render', 'AS-RENDER-001', a9cGood, a9cBad(s => { s.a9c.render.defaultScale = 1.5; }));
kills('cross-layer', 'AS-XLAYER-001', a9cGood, a9cBad(s => { s.a9c.crossLayer.wallBreachStages = 2; }));
kills('quarters', 'AS-QTR-001', a9cGood, a9cBad(s => { s.geometry.stratumPx = [19, 19, 19, 19, 20]; }));
kills('construction', 'AS-SITE-001', a9cGood, a9cBad(s => { s.a9c.construction.pieces = s.a9c.construction.pieces.filter(id => id !== 'scaffolding'); }));
kills('readability', 'AS-READ-001', a9cGood, a9cBad(s => { s.a9c.readability.records[0].subjectHex = s.a9c.readability.records[0].groundHex; }));
kills('palette', 'AS-PAL-001', a9cGood, a9cBad(s => { s.a9c.palette.grayMush = true; }));
kills('lock-cycle', 'AS-LOCK-001', a9cGood, a9cBad(s => { s.slotMap.frameLayout.playbackWalk = [0, 1, 2, 1]; }));
kills('lock-cap', 'AS-LOCK-001', a9cGood, a9cBad(s => { s.a9c.styleLock.colourUse[0].colours = s.masterPalette.colours.slice(0, 17); }));
kills('melee', 'AS-MELEE-001', a9cGood, a9cBad(s => { s.a9c.melee.sample.scaled = true; }));
kills('pm-mirror', 'AS-PM-001', a9cGood, a9cBad(s => { s.a9c.pmDefaults.mirror.samples.weapon.mirroredOntoHand = true; }));
kills('visible-gear', 'AS-VIS-001', a9cGood, a9cBad(s => { s.a9c.visibleGear.layerSamples.push({ layer: 'cloak', drawn: true }); }));
kills('tile-64', 'AS-SCALE-001', a9cGood, a9cBad(s => { s.geometry.tilePxNotAdopted = []; }));

function idsMatch(mdText, rules) {
    const mdIds = new Set(mdText.match(/AS-[A-Z]+-\d{3}/g) || []);
    const jsonIds = Object.keys(rules);
    return jsonIds.every(id => mdIds.has(id)) && [...mdIds].every(id => rules[id]);
}
const md = fs.readFileSync(path.join(ROOT, 'docs', 'art', 'DEUS_ASSET_STANDARD.md'), 'utf8');
const jsonIds = Object.keys(standard.rules);
check('rule-ids', idsMatch(md, standard.rules), 'set mismatch');
check('no-grimdark', !/grimdark/i.test(md) && !/grimdark/i.test(JSON.stringify(standard)));
check('no-fifth-geometry', !/fifth/i.test(JSON.stringify(standard.geometry)) && !/fifth/i.test(md));
function hexLines(file) {
    return fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => /^#?[0-9A-Fa-f]{6}$/.test(s)).map(s => (s[0] === '#' ? s : '#' + s).toUpperCase());
}
const masterFile = hexLines('art/palette/deus_master_world_palette_v1.hex');
const legacyFile = hexLines('art/palette/uf.hex');
check('master-file', masterFile.join('|') === standard.masterPalette.colours.join('|'), 'canonical list');
check('legacy-file', legacyFile.length === 256 && new Set(legacyFile).size === 250 && masterFile.every(c => legacyFile.indexOf(c) === -1));
const phrases = [
    'readable high-contrast fantasy', 'about 1/5', 'top face and a front face', 'by row, then by Z layer',
    'Eight-direction sheets stay declined', 'Diagonal movement stays free', 'symmetric flag', 'tiles-pro',
    'dual-grid', 'pebbles, tufts, cracks and leaves', 'skeleton-v3', 'create-character-v3', 'size 42',
    '2 px low', 'three-quarter isometric', 'open test', 'boot, bare, paw and hoof',
    'snow, mud, sand, blood and wet', 'additive light layer', 'whole-pixel parallax', 'camera layer easing',
    'dithered cutaways', '100,000', '6 px cells', '12, 24 and 48', '1 cu ft', '30 lb', '1.25 ft', '5-5-5',
    'Str × 15', '4 px per frame', '6 px per frame', 'nearest-neighbour', 'letterbox', 'wall breaches',
    'palette swap', 'scaffolding', 'grayscale', 'gray mush', 'LOCKED', '15:05 CT', 'about 16', 'about 32',
    'about 48', '1, 2, 1, 0', 'dawn, day, dusk, night and underground', 'colour-blind-safe',
    '10 to 20 percent', 'knockback', 'Owner may override', 'shares a square', '1.5 layers',
    'Mirroring is allowed', 'fortress', 'pixel font', 'class garb is part of the race and class base body',
    'PM assumption', 'not adopted', 'four quarters', 'table-with-items', 'true 2×', '708', '441', '216'
];
phrases.forEach(phrase => check('phrase-' + phrase, md.indexOf(phrase) !== -1, 'missing'));
const dropped = V.clone(standard);
delete dropped.rules[jsonIds[0]];
check('rule-ids-mutant', idsMatch(md, dropped.rules) === false);

const src = fs.readFileSync(path.join(__dirname, 'validate_asset_standard.js'), 'utf8');
check('no-write-api', !/writeFile|appendFile|createWriteStream|mkdirSync|unlinkSync|rmSync/.test(src));
const writes = { n: 0 };
const orig = fs.writeFileSync;
fs.writeFileSync = function () { writes.n++; return orig.apply(fs, arguments); };
V.checkEntry(valid, standard);
V.collectGlobals(standard, spells, schema);
fs.writeFileSync = orig;
check('no-write-call', writes.n === 0, 'writes ' + writes.n);

function quiet(fn) {
    const log = console.log;
    const err = console.error;
    const write = process.stdout.write;
    console.log = () => {};
    console.error = () => {};
    process.stdout.write = () => true;
    try { return fn(); }
    finally {
        console.log = log;
        console.error = err;
        process.stdout.write = write;
    }
}
const strictOk = quiet(() => V.main(['--catalogue', path.join(FIX, 'mini_catalogue.json'), '--biome-registry', path.join(FIX, 'biomes_six.json'), '--strict', '--json'], { noExit: true }));
check('cli-strict-clean', strictOk === 0, 'exit ' + strictOk);
const strictBad = quiet(() => V.main(['--catalogue', path.join(FIX, 'eight_catalogue.json'), '--strict'], { noExit: true }));
check('cli-strict-eight', strictBad === 1, 'exit ' + strictBad);

const checked = ['AS-GLOBAL-010', 'AS-GLOBAL-014', 'AS-GLOBAL-019', 'AS-GLOBAL-022', 'AS-GLOBAL-023', 'AS-CRIT-001', 'AS-CRIT-004', 'AS-BEAST-001', 'AS-HUM-004', 'AS-HUM-009', 'AS-HUM-015', 'AS-HUM-016', 'AS-HUM-017', 'AS-HUM-019', 'AS-FACE-001', 'AS-FACE-002', 'AS-FACE-003', 'AS-FACE-004', 'AS-ICON-001', 'AS-ICON-003', 'AS-ITEM-001', 'AS-ITEM-002', 'AS-NODE-001', 'AS-ANIM-001', 'AS-FX-003', 'AS-FX-005', 'AS-UI-003', 'AS-UI-004', 'AS-SUMMON-001', 'AS-SUMMON-002', 'AS-REMAIN-001', 'AS-HAUL-001', 'AS-VEH-001', 'AS-LIGHT-001', 'AS-MAP-001', 'AS-PROP-001', 'AS-STYLE-001', 'AS-REL-001', 'AS-FARM-001', 'AS-FOOD-001', 'AS-DUNG-001', 'AS-TRAP-001', 'AS-LORE-001', 'AS-SCENE-001', 'AS-ZONE-001', 'AS-MKTG-001', 'AS-TAME-001', 'AS-TAME-002', 'AS-VAR-001', 'AS-VAR-002', 'AS-GENE-001', 'AS-PORT-001', 'AS-HEAD-001', 'AS-ELDER-001', 'AS-GEAR-001', 'AS-MIRROR-001', 'AS-POSE-001', 'AS-BIOME-005', 'AS-SIZE-001', 'AS-SLOT-001', 'AS-PIPE-001', 'AS-PROMPT-001', 'AS-GEN-001', 'AS-GEN-002', 'AS-GEN-003', 'AS-GEN-004', 'AS-SRC-001', 'AS-REPO-001', 'AS-PREVIEW-001', 'AS-GEN-005', 'AS-SEX-001', 'AS-SEX-002', 'AS-ID-001', 'AS-ANCHOR-001', 'AS-EQUIP-001', 'AS-LOOK-001', 'AS-PROJ-001', 'AS-FURN-001', 'AS-TERR-001', 'AS-TRACK-001', 'AS-GLOW-001', 'AS-DEPTH-001', 'AS-WITEM-001', 'AS-FEAT-001', 'AS-PLAY-001', 'AS-CONT-001', 'AS-SCALE-001', 'AS-RENDER-001', 'AS-XLAYER-001', 'AS-QTR-001', 'AS-SITE-001', 'AS-READ-001', 'AS-PAL-001', 'AS-LOCK-001', 'AS-MELEE-001', 'AS-PM-001', 'AS-VIS-001'];
const srcHas = checked.filter(id => src.indexOf(id) === -1);
check('checks-present', srcHas.length === 0, srcHas.join(','));

console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
