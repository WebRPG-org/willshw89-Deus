const fs = require('fs');
let text = fs.readFileSync('game/js/plugins.js', 'utf8');
const searchStr = '"name": "DEUS_Movement8D"';
let lines = text.split('\n');
let insertIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(searchStr)) {
    insertIdx = i;
    break;
  }
}
if (insertIdx !== -1) {
  while (!lines[insertIdx].includes('},')) {
    insertIdx++;
  }
  lines.splice(insertIdx + 1, 0, '  {', '    "name": "DEUS_FlowFields",', '    "status": true,', '    "description": "Flow field pathfinding for crowds",', '    "parameters": {}', '  },');
  fs.writeFileSync('game/js/plugins.js', lines.join('\n'));
  console.log('Inserted.');
}
