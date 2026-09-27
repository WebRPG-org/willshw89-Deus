const M_AIR = 0, M_STONE = 1, M_SOIL = 2, M_WOOD = 3, M_WATER = 4, M_LAVA = 5;
const STRATA_MATERIALS = Object.freeze([
    { id: M_AIR, key: "air", solid: false, fluid: false, maxHP: 0, support: 0, debris: null, resist: {} },
    { id: M_WATER, key: "water", solid: false, fluid: true, maxHP: 0, support: 0, debris: null, resist: {} },
    { id: M_LAVA, key: "lava", solid: false, fluid: true, maxHP: 0, support: 0, debris: null, resist: {} }
]);
const validMaterialByte = v => Number.isInteger(v) && v >= 0 && v <= 255 && (v === 0 || SOLID_B[v] === 1 || FLUID_B[v] === 1);
function continuousAirHeight(a, b, c, d, e) {
    while (s < STRATA) {
        if (SOLID_B[rdM[rdO + s]] === 1) return h;
        h++;
        s++;
    }
}
function airRunAt(a, b, c, d, e) {
    while (s < STRATA) {
        if (SOLID_B[rdM[rdO + s]] === 1) return h;
        h++;
        s++;
    }
}
