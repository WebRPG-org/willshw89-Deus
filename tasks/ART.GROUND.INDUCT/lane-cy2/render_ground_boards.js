const fs=require('fs'),path=require('path');
const {decodePNG}=require('../../../tools/png_read');
const {writePNG}=require('../../../tools/png_util');
const kept=require('../../../tools/art/ground_kept_sets.json');
const root=path.resolve(__dirname,'../../..');
const out=path.join(__dirname,'evidence');fs.mkdirSync(out,{recursive:true});
function zoom(src,w,h,z){const dst=Buffer.alloc(w*h*z*z*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let dy=0;dy<z;dy++)for(let dx=0;dx<z;dx++){const a=(y*w+x)*4,b=((y*z+dy)*w*z+x*z+dx)*4;src.copy(dst,b,a,a+4)}return dst}
function blit(dst,dw,src,sw,x0,y0,w,h){for(let y=0;y<h;y++)src.copy(dst,((y0+y)*dw+x0)*4,y*sw*4,(y*sw+w)*4)}
const keys=Object.keys(kept.selected),cw=192,ch=96,cols=4,rows=Math.ceil(keys.length/cols),board=Buffer.alloc(cols*cw*rows*ch*4);
for(let n=0;n<keys.length;n++){const key=keys[n],id=kept.selected[key][0],dir=kept.sourceFolders.find(d=>fs.existsSync(path.join(d,id+'__00.png')));for(let t=0;t<2;t++){const file=path.join(dir,id+'__'+(t?'15':'00')+'.png'),im=decodePNG(fs.readFileSync(file));blit(board,cols*cw,zoom(im.data,48,48,2),96,(n%cols)*cw+t*96,Math.floor(n/cols)*ch,96,96)}}
writePNG(path.join(out,'source_solid_pairs_2x.png'),cols*cw,rows*ch,board);
const im=decodePNG(fs.readFileSync(path.join(root,'game/img/tilesets/Outside_A2.png')));
writePNG(path.join(out,'outside_a2_all_32_2x.png'),1536,1152,zoom(im.data,768,576,2));
console.log('rendered',keys.length,'source pairs in JSON key order; Outside A2 32-slot sheet at 2x');
