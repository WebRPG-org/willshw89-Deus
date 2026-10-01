#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const root=path.resolve(__dirname,'../../..');
const rels=['game/img/tilesets/Outside_A2.png','game/img/tilesets/Dungeon_A2.png','game/data/Tilesets.json'];
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'deus-cy2-86-'));
const saved=new Map();
try {
  for(const rel of rels) {
    const target=path.join(root,rel),backup=path.join(temp,path.basename(rel));
    fs.copyFileSync(target,backup);saved.set(target,backup);
    fs.writeFileSync(target,cp.execFileSync('git',['show','86c51fd9:'+rel],{cwd:root,maxBuffer:16*1024*1024}));
  }
  for(const [label,args] of [
    ['86c51fd9 A2 RGB check',['tools/art/verify_specimens_rgb.js']],
    ['86c51fd9 D sheet check',['tools/art/test_ground_kept_sets.js','--only=tilesets']]
  ]) {
    const run=cp.spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});
    console.log(label+' exit='+run.status);
    console.log((run.stdout+run.stderr).trim());
    if(run.status!==1)throw Error(label+' failed to reject baseline');
  }
} finally {
  for(const [target,backup] of saved)fs.copyFileSync(backup,target);
  fs.rmSync(temp,{recursive:true,force:true});
}
