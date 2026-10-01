// Disposable snapshot harness plugin. Copy to a disposable game only.
(() => {
    'use strict';
    const T = window.UF && window.UF.Test;
    if (!T || !T.active) return;
    T.suite('ground_evidence', async t => {
        const map = $gameMap;
        const width = $dataMap.width, height = $dataMap.height;
        const scene = SceneManager._scene;
        const tilemap = scene._spriteset._tilemap;
        const camera = window.UF && UF.Camera;
        if (camera) camera.setLevel(2);
        const left = Math.max(1, Math.min(width - 9, Math.floor($gamePlayer.x) - 4));
        const top = Math.max(1, Math.min(height - 7, Math.floor($gamePlayer.y) - 3));
        const kinds = [2, 7, 15, 18, 19, 22, 24, 25];
        function paint(tiles) {
            for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) {
                const cell = (top + y) * width + left + x;
                $dataMap.data[cell] = 2816 + tiles[x] * 48;
                for (let layer = 1; layer < 4; layer++) $dataMap.data[layer * width * height + cell] = 0;
            }
            map.setDisplayPos(left, top);
            tilemap.refresh();
        }
        function groundShot(name) {
            const hidden = [...new Set(
                scene.children.filter(child => child !== scene._spriteset)
                    .concat(tilemap.children.filter(child => child !== tilemap._lowerLayer && child !== tilemap._upperLayer))
                    .concat(scene._spriteset._characterSprites)
                    .concat(scene._spriteset._weather ? [scene._spriteset._weather] : [])
            )];
            const wasVisible = hidden.map(child => child.visible);
            hidden.forEach(child => { child.visible = false; });
            t.screenshot(name);
            hidden.forEach((child, i) => { child.visible = wasVisible[i]; });
        }
        paint(kinds);
        await t.waitFrames(20);
        t.check('surface_kinds_at_2x', camera && camera.zoom() === 2 && kinds.every((kind, x) => $dataMap.data[top * width + left + x] === 2816 + kind * 48), `camera ${camera && camera.zoom()}, map ${width}x${height}, origin ${left},${top}`);
        groundShot('ground_kinds_2x');
        paint([18, 19, 18, 19, 24, 25, 24, 25]);
        await t.waitFrames(20);
        t.check('damp_dry_tiles', [18, 19, 18, 19, 24, 25, 24, 25].every((kind, x) => $dataMap.data[top * width + left + x] === 2816 + kind * 48));
        groundShot('damp_dry_2x');
        t.check('no_errors', T.errors.length === 0, T.errors.length ? T.errors[0] : 'none');
    }, { isDefault: false });
})();
