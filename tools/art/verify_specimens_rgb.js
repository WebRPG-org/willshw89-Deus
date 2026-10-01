const fs=require('fs'),path=require('path'),cp=require('child_process');
const {decodePNG}=require('../png_read');
const {selectedTile,buildA2Block,SPECS}=require('./induct_all_ground_tiles');
const kept=require('./ground_kept_sets.json');
const ROOT=path.resolve(__dirname,'../..');
const mutant=process.argv.find(a=>a.startsWith('--mutant='))?.split('=')[1];
function fail(message){throw Error('[FAIL] '+message)}
function image(name,w,h){const p=path.join(ROOT,'game/img/tilesets',name);if(!fs.existsSync(p))fail('missing '+name);const im=decodePNG(fs.readFileSync(p));if(im.width!==w||im.height!==h)fail(name+' dimensions '+im.width+'x'+im.height);return im}
function block(im,slot){const out=Buffer.alloc(96*144*4),x=(slot%8)*96,y=Math.floor(slot/8)*144;for(let row=0;row<144;row++)im.data.copy(out,row*96*4,((y+row)*768+x)*4,((y+row)*768+x+96)*4);return out}
function baseline(name){return decodePNG(cp.execFileSync('git',['show','a5255704:game/img/tilesets/'+name],{cwd:ROOT,maxBuffer:8*1024*1024}))}
function swatch(im,i){const out=Buffer.alloc(48*48*4),x=(Math.floor(i/128)*8+i%8)*48,y=Math.floor((i%128)/8)*48;for(let row=0;row<48;row++)im.data.copy(out,row*48*4,((y+row)*768+x)*4,((y+row)*768+x+48)*4);return out}
function masterSwatch(outside,slot){const out=Buffer.alloc(48*48*4),x=slot*96+24,y=72;for(let row=0;row<48;row++)outside.data.copy(out,row*48*4,((y+row)*768+x)*4,((y+row)*768+x+48)*4);return out}
try{
 const blocks={},tiles={};
 for(const [key,spec] of Object.entries(SPECS)){tiles[key]=selectedTile(key);blocks[key]=buildA2Block(tiles[key],spec.edge,spec.hi)}
 for(const [name,selection] of [['Outside_A2.png',kept.expectedOutsideSlots],['Dungeon_A2.png',kept.expectedDungeonSlots]]){
  const actual=image(name,768,576),old=baseline(name);
  const order=name==='Outside_A2.png'?[4,...Array.from({length:32},(_,i)=>i).filter(i=>i!==4)]:Array.from({length:32},(_,i)=>i);
  for(const slot of order){
   const key=selection[slot];
   const expected=key&&blocks[key]?blocks[key]:block(old,slot);
   let got=block(actual,slot);
   if(mutant==='outside-source'&&name==='Outside_A2.png'&&slot===4)got=blocks.shrub_soil_base;
   if(key&&!(name==='Outside_A2.png'&&slot<2)&&got.every((value,index)=>index%4!==3||value===0))fail(name+' slot '+slot+' fully transparent');
   if(!got.equals(expected))fail(name+' slot '+slot+' is not '+(key||'the specified baseline exception'));
  }
  console.log('[OK] '+name+' 32 slots match table sets, stand-ins or named baseline exceptions');
 }
 image('Outside_A1.png',768,576);
 const gallery=image('DEUS_GroundVar_D.png',768,768),outsideD=image('Outside_D.png',768,768);
 if(!gallery.data.equals(outsideD.data))fail('Outside_D differs from gallery');
 const oldOutside=baseline('Outside_A2.png');
 for(let i=0;i<256;i++){
  const key=kept.expectedGallerySlots[i],got=swatch(gallery,i);
  if(!key){if(got.some(Boolean))fail('extra gallery pixel '+i);continue}
  const expected=key==='meadow'||key==='tropical_grass'?masterSwatch(oldOutside,key==='meadow'?0:1):tiles[key];
  if(!got.equals(expected))fail('gallery swatch '+i+' '+key);
 }
 console.log('[OK] gallery and Outside_D match all 34 kept sets, two owner masters and three stand-in swatches');
}catch(e){console.error(e.message);process.exit(1)}
