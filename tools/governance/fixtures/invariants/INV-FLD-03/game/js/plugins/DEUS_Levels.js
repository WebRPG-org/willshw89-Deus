const fluidIn = (i, e0, e1) => { for (let e = e0; e < e1; e++) if (FLUID_B[getE(i, e)] === 1) return true; return false; };
for (const sh of out.shafts) {
    disc(sh.x, sh.y, sh.r, i => {
        const hi = Math.min(sh.to, top[i]);
        // Mutant: the shaft carves even when the column holds fluid.
        for (let e = sh.from; e < hi; e++) if (SOLID_B[getE(i, e)] === 1) { setE(i, e, M_AIR); changed = true; }
    });
}
