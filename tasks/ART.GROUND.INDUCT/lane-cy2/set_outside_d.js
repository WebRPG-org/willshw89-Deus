#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const file=path.resolve(__dirname,'../../../game/data/Tilesets.json');
const raw=fs.readFileSync(file,'utf8');
const rows=JSON.parse(raw);
const newline=raw.includes('\r\n')?'\r\n':'\n';
const lines=raw.split(/\r?\n/);
for(const id of [2,4]) {
  if(rows[id]?.id!==id || rows[id].tilesetNames?.[7]!=='')throw Error('unexpected D sheet state on tileset '+id);
  rows[id].tilesetNames[7]='Outside_D';
  const line=lines.findIndex(x=>x.startsWith('{"id":'+id+','));
  if(line<0)throw Error('missing RMMZ row '+id);
  lines[line]=JSON.stringify(rows[id])+(lines[line].endsWith(',')?',':'');
}
const result=lines.join(newline);
if(JSON.parse(result)[2].tilesetNames[7]!=='Outside_D'||JSON.parse(result)[4].tilesetNames[7]!=='Outside_D')throw Error('round trip');
fs.writeFileSync(file,result);
console.log('Set Outside_D on tilesets 2 and 4 in one-line-per-tileset format');
