const fs=require('fs'),path=require('path'),cp=require('child_process');
const {decodePNG}=require('../png_read');
const {selectedTile,buildA2Block,SPECS}=require('./induct_all_ground_tiles');
const kept=require('./ground_kept_sets.json');
const ROOT=path.resolve(__dirname,'../..');
function fail(message){throw Error('[FAIL] '+message)}
function image(name,w,h){const p=path.join(ROOT,'game/img/tilesets',name);if(!fs.existsSync(p))fail('missing '+name);const im=decodePNG(fs.readFileSync(p));if(im.width!==w||im.height!==h)fail(name+' dimensions '+im.width+'x'+im.height);return im}
function block(im,slot){const out=Buffer.alloc(96*144*4),x=(slot%8)*96,y=Math.floor(slot/8)*144;for(let row=0;row<144;row++)im.data.copy(out,row*96*4,((y+row)*768+x)*4,((y+row)*768+x+96)*4);return out}
function baseline(name){return decodePNG(cp.execFileSync('git',['show','a5255704:game/img/tilesets/'+name],{cwd:ROOT,maxBuffer:8*1024*1024}))}
try{
 const blocks={};for(const [key,spec] of Object.entries(SPECS))blocks[key]=buildA2Block(selectedTile(key),spec.edge,spec.hi);
 for(const [name,selection] of [['Outside_A2.png',kept.expectedOutsideSlots],['Dungeon_A2.png',kept.expectedDungeonSlots]]){
  const actual=image(name,768,576),old=baseline(name);
  for(let slot=0;slot<32;slot++){
   const key=selection[slot];let expected=key?blocks[key]:block(old,slot);
   if(name==='Outside_A2.png'&&slot===6)expected=block(old,2);
   if(!block(actual,slot).equals(expected))fail(name+' slot '+slot+' is not '+(key||'the specified stand-in/baseline'));
  }
  console.log('[OK] '+name+' 32 slots match selected sets or retained baseline');
 }
 const a1=image('Outside_A1.png',768,576);void a1;
 const gallery=image('DEUS_GroundVar_D.png',768,768),outsideD=image('Outside_D.png',768,768);
 if(!gallery.data.equals(outsideD.data))fail('Outside_D differs from gallery');
 for(const [slot,key] of Object.entries(kept.expectedGallerySlots)){
  const i=Number(slot),tile=selectedTile(key),x=(i%8)*48,y=Math.floor(i/8)*48;
  for(let row=0;row<48;row++)if(!gallery.data.subarray(((y+row)*768+x)*4,((y+row)*768+x+48)*4).equals(tile.subarray(row*48*4,(row+1)*48*4)))fail('gallery swatch '+i+' '+key);
 }
 for(let i=0;i<256;i++){if(kept.expectedGallerySlots[i])continue;const x=(Math.floor(i/128)%2)*8*48+(i%8)*48,y=Math.floor((i%256)/8)*48;for(let row=0;row<48;row++)for(let px=x;px<x+48;px++)if(gallery.data[((y+row)*768+px)*4+3])fail('extra gallery pixel '+i)}
 console.log('[OK] gallery and Outside_D have 13 selected swatches in lane-cy slots, no other occupied cells');
}catch(e){console.error(e.message);process.exit(1)}
