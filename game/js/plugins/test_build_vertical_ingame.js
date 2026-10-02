/*:
 * @target MZ
 * @plugindesc Ingame scenario for NAT.02.06: build_room_above
 * @author deus-pm
 */
(() => {
    window.test_build_room_above = function() {
        const t = UF.Tests;
        t.suite("build_room_above");
        t.check("structural_registered", !!UF.Structural && !!UF.Jobs && !!UF.Floors.attachment, "UF.Structural " + !!UF.Structural + "; tick handlers " + Object.keys(UF.Sim._tickHandlers).join(",") + "; Floors.attachment " + !!UF.Floors.attachment);

        // spawn builder
        const W = UF.World;
        const u = W.addUnit({ name: "Builder", area: { x: 0, y: 0 }, x: 45, y: 45, z: 0, data: { hp: 100 } });
        
        // order a ring of walls on Z+1 (above)
        let designated = 0;
        for (let y = 43; y <= 47; y++) {
            for (let x = 43; x <= 47; x++) {
                if (x > 43 && x < 47 && y > 43 && y < 47) continue;
                UF.Jobs.create({ type: "build", target: { area: { x: 0, y: 0 }, x, y, z: 1 }, params: { kind: "wall_wood", count: 1 }, owner: null });
                designated++;
            }
        }
        
        t.drain(300);
        let builtWalls = 0;
        const O = UF.Objects;
        for (let y = 43; y <= 47; y++) {
            for (let x = 43; x <= 47; x++) {
                if (x > 43 && x < 47 && y > 43 && y < 47) continue;
                const obj = O.atIn({ x: 0, y: 0 }, x, y);
                if (obj && obj.z === 1) builtWalls++;
            }
        }
        
        t.check("ring_built", builtWalls === designated, "walls " + builtWalls + "/" + designated + "; builder " + (u ? "alive" : "null"));
        t.screenshot("build_room_above", 1000);
        t.finish();
    };
    
    // Add to suites map
    const orig = window.runSuite;
    window.runSuite = function(name) {
        if (name === "build_room_above") return test_build_room_above();
        if (orig) return orig(name);
    };
})();
