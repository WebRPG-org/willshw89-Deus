const fs = require('fs');

const stumpImages = {
    oak_stump: '!$UF_Oak_Stump',
    swamp_stump: '!$UF_Swamp_Stump',
    dead_stump: '!$UF_Dead_Stump',
    birch_stump: '!$UF_Birch_Stump',
    pine_stump: '!$UF_Pine_Stump',
    fruit_stump: '!$UF_Fruit_Stump'
};

const treeToStump = {
    oak: 'oak_stump',
    tree_swamp: 'swamp_stump',
    dead_tree: 'dead_stump',
    birch: 'birch_stump',
    pine: 'pine_stump',
    fruit_tree: 'fruit_stump',
    fruit_tree_bare: 'fruit_stump'
};

for (const file of ['game/data/DEUS_WorldCatalog.json', 'game/data/UF_WorldCatalog.json']) {
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const objects = data.objects;
    
    const genericStump = objects.find(o => o.id === 'stump');
    if (!genericStump) {
        console.log("No generic stump found in " + file);
        continue;
    }
    
    for (const [stumpId, image] of Object.entries(stumpImages)) {
        if (!objects.find(o => o.id === stumpId)) {
            const newStump = {
                id: stumpId,
                name: stumpId.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
                image: image,
                passable: genericStump.passable,
                tags: [...(genericStump.tags || [])],
                actions: JSON.parse(JSON.stringify(genericStump.actions || {}))
            };
            objects.push(newStump);
        }
    }
    
    for (const obj of objects) {
        if (treeToStump[obj.id]) {
            if (obj.actions && obj.actions.chop) {
                obj.actions.chop.becomes = treeToStump[obj.id];
            }
        }
        if (obj.id === 'grass_tuft') {
            obj.image = '!UF_GrassTuft_V8';
        }
    }
    
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
    console.log("Updated " + file);
}
