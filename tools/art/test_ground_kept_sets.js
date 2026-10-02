'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'../..'),kept=require('./ground_kept_sets.json');
const mutant=process.argv.find(a=>a.startsWith('--mutant='))?.split('=')[1];
const only=process.argv.find(a=>a.startsWith('--only='))?.split('=')[1];
const deleted=new Set('0c163850 c0c35c89 7d4ee010 10b7c41f 98b6a1bc 6ed41dbc 40a777bc 73e6e557 ec0f0920 19506eac 3bd90e5f b21608ca 11a039a0 11d057da fdd52808 a32533f0'.split(' '));
function fail(s){throw Error('[FAIL] '+s)}
function old(rel){return cp.execFileSync('git',['show','a5255704:'+rel],{cwd:root,maxBuffer:16*1024*1024})}
function read(rel){return fs.readFileSync(path.join(root,rel))}
try{
 if(only!=='tilesets'){
  let ids=[...kept.allowedIds];if(mutant==='source-id')ids[0]='0c163850-6cd2-418e-b646-b4dadaae2173';
  if(ids.length!==36||new Set(ids).size!==36)fail('allowlist must have 34 selected and two unused alternative IDs');
  if(ids.some(id=>deleted.has(id.slice(0,8))))fail('deleted source in allowlist');
  const expectedIds=new Set([...Object.values(kept.selected).map(([id])=>id),...kept.unusedAlternatives]);
  if(expectedIds.size!==36||ids.some(id=>!expectedIds.has(id)))fail('allowlist differs from table selections and two alternatives');
  if(Object.keys(kept.selected).length!==34||kept.unusedAlternatives.length!==2)fail('selection/alternatives count');
  const converter=read('tools/art/induct_all_ground_tiles.js').toString('utf8');
  if([...deleted].some(id=>converter.includes(id)))fail('converter references deleted source');
  for(const [key,[id,fill]] of Object.entries(kept.selected)){
   const spec=kept.specs[key];if(!spec)fail('missing converter spec '+key);
   const dirs=kept.sourceFolders.filter(dir=>fs.existsSync(path.join(dir,id+'__'+String(fill).padStart(2,'0')+'.png')));
   if(dirs.length!==1)fail('missing or ambiguous selected source '+key);
   const manifest=JSON.parse(read('art/masters/source_sets/'+spec.canonicalId+'/manifest.json'));
   if(manifest.pixellabId!==id||manifest.fillTile!==fill||path.normalize(manifest.sourceFolder)!==path.normalize(dirs[0]))fail('master provenance '+key);
  }
  console.log('[OK] 34 table sets, two alternatives, deleted-ID exclusion and master sidecars');
 const mapRel='game/data/Map001.json';
 let mapHash=cp.execFileSync('git',['hash-object','--path='+mapRel,mapRel],{cwd:root}).toString('utf8').trim();
 const baseHash=cp.execFileSync('git',['rev-parse','a5255704:'+mapRel],{cwd:root}).toString('utf8').trim();
 if(mutant==='map')mapHash='mutated-map-hash';
 if(mapHash!==baseHash)fail('Map001 Git blob differs byte-for-byte from lane base');
 console.log('[OK] Map001 Git blob byte-identical to a5255704');
 }
 const rel='game/data/Tilesets.json',base=old(rel).toString('utf8'),current=read(rel).toString('utf8');
 let now=JSON.parse(current),was=JSON.parse(base);
 if(mutant==='tilesets')now[2].flags[0]++;
 if(mutant==='d-name')now[2].tilesetNames[7]='';
 if(now.length!==was.length)fail('Tilesets entry count');
 const changed=[];
 for(let i=0;i<was.length;i++){
  const a=now[i],b=was[i];
  if(JSON.stringify(a)!==JSON.stringify(b))changed.push(i);
  if(i!==2&&i!==4){if(JSON.stringify(a)!==JSON.stringify(b))fail('Tilesets entry '+i+' modified');continue}
  const copy={...a,tilesetNames:b.tilesetNames};if(JSON.stringify(copy)!==JSON.stringify(b))fail('Tilesets non-name field '+i+' modified');
  const diffs=a.tilesetNames.map((x,j)=>x===b.tilesetNames[j]?null:j).filter(x=>x!==null);
  if(diffs.length!==1||diffs[0]!==7||a.tilesetNames[7]!=='Outside_D')fail('Tilesets '+i+' D sheet must be Outside_D and be the only name change');
 }
 if(changed.join(',')!=='2,4')fail('Tilesets diff must touch exactly entries 2 and 4');
 const a=base.replace(/\r\n/g,'\n').split('\n'),b=current.replace(/\r\n/g,'\n').split('\n');
 if(a.length!==b.length)fail('Tilesets line count changed');
 for(let i=0;i<a.length;i++)if(a[i]!==b[i]&&!/^\{"id":(2|4),/.test(a[i].trim()))fail('Tilesets line '+(i+1)+' changed');
 console.log('[OK] Tilesets 2/4 load Outside_D; diff touches only those two one-line entries and their D names');
}catch(e){console.error(e.message);process.exit(1)}
