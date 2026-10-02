"use strict";

const { zOfG } = require("./reader.js");

/**
 * game/js/sim/structural/occupants.js
 *
 * Pure occupant plan for one fall (NAT.02.01 part 3). Nothing is written.
 * A unit in a cell that now derives solid is crushed: falling-damage dice for
 * the drop, at least 10 ft (1d6), and a survivor moves to the nearest standable
 * cell within 3 cells, then one level up or down, else the plan kills them.
 * A unit with no standing surface falls to the first standable cell in the
 * column and takes the same dice for that distance. Items move the same way
 * and are never destroyed. A non-structural object breaks to its ruin.
 * A wall or door that was part of the piece is removed and its ruin is placed
 * in the landing column.
 */

// Tests replace these constants. The values here are the fall rules.
const ITEMS_SURVIVE = true;
const MIN_FALL_FEET = 10;

function fail(msg) {
    throw new TypeError("structural/occupants: " + msg);
}

function hasTag(obj, tag) {
    return !!(obj && Array.isArray(obj.tags) && obj.tags.indexOf(tag) >= 0);
}

function isStructural(obj) {
    return obj.structural === true || hasTag(obj, "wall") || hasTag(obj, "door");
}

function cellKey(x, y, z) {
    return x + "," + y + "," + z;
}

function levelOf(voxel) {
    if (Number.isInteger(voxel.z)) return voxel.z;
    if (Number.isInteger(voxel.g)) return zOfG(voxel.g);
    fail("fall voxels need z or g");
}

function cellSet(list) {
    const out = new Set();
    for (let i = 0; i < (list || []).length; i++) {
        const c = list[i];
        out.add(cellKey(c.x | 0, c.y | 0, levelOf(c)));
    }
    return out;
}

function ring(radius) {
    const out = [];
    for (let r = 1; r <= radius; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                out.push([dx, dy]);
            }
        }
    }
    return out;
}

function planOccupants(input) {
    input = input || {};
    const queries = input.queries;
    if (!queries || typeof queries.derivesSolid !== "function" || typeof queries.standable !== "function" || typeof queries.hasStandingSurface !== "function") {
        fail("queries.derivesSolid, standable and hasStandingSurface are required");
    }
    const rules = input.rules;
    if (!rules || typeof rules.fallingDamage !== "function") fail("rules.fallingDamage is required");
    const zMin = Number.isInteger(input.zMin) ? input.zMin : 0;
    const zMax = Number.isInteger(input.zMax) ? input.zMax : zMin;
    const radius = Number.isInteger(input.radius) ? input.radius : 3;
    const levelFeet = Number.isInteger(input.levelFeet) ? input.levelFeet : 10;
    const dropFeet = Number(input.dropFeet) || 0;
    const steps = ring(radius);
    const vacated = cellSet(input.vacated);
    const wrap = typeof input.wrap === "function" ? input.wrap : function (x, y) {
        const b = input.bounds;
        if (b && (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1)) return null;
        return { x: x, y: y };
    };

    function dice(feet) {
        const used = Math.max(MIN_FALL_FEET, feet);
        const call = typeof input.rng === "function" ? { rng: input.rng } : undefined;
        const rolled = rules.fallingDamage(used, call) || {};
        return {
            dice: rolled.dice,
            count: rolled.count,
            sides: rolled.sides,
            type: rolled.type,
            feet: used,
            damage: rolled.damage,
            rolls: rolled.rolls
        };
    }

    function tryStand(x, y, z) {
        const p = wrap(x, y);
        if (!p) return null;
        if (z < zMin || z > zMax) return null;
        if (!queries.standable(p.x, p.y, z)) return null;
        return { x: p.x, y: p.y, z: z };
    }

    function nearest(x, y, z) {
        for (let i = 0; i < steps.length; i++) {
            const hit = tryStand(x + steps[i][0], y + steps[i][1], z);
            if (hit) return hit;
        }
        const vertical = [1, -1];
        for (let v = 0; v < vertical.length; v++) {
            const zz = z + vertical[v];
            const center = tryStand(x, y, zz);
            if (center) return center;
            for (let i = 0; i < steps.length; i++) {
                const hit = tryStand(x + steps[i][0], y + steps[i][1], zz);
                if (hit) return hit;
            }
        }
        return null;
    }

    function columnBelow(x, y, z) {
        for (let zz = z - 1; zz >= zMin; zz--) {
            const hit = tryStand(x, y, zz);
            if (hit) return { cell: hit, feet: (z - zz) * levelFeet };
        }
        return null;
    }

    function placeLoose(x, y, z) {
        return nearest(x, y, z) || (columnBelow(x, y, z) || {}).cell || (function () {
            const up = z < zMax ? z + 1 : z;
            return { x: x, y: y, z: up, fallback: true };
        })();
    }

    function landingOf(x, y, z) {
        const fills = [];
        const list = input.filled || [];
        for (let i = 0; i < list.length; i++) {
            if ((list[i].x | 0) === x && (list[i].y | 0) === y) fills.push(levelOf(list[i]));
        }
        if (fills.length) {
            fills.sort(function (a, b) { return a - b; });
            return { x: x, y: y, z: fills[0] };
        }
        const below = columnBelow(x, y, z);
        return below ? below.cell : { x: x, y: y, z: z };
    }

    const units = [];
    const unitList = input.units || [];
    for (let i = 0; i < unitList.length; i++) {
        const u = unitList[i];
        const x = u.x | 0, y = u.y | 0, z = u.z | 0;
        const solid = !!queries.derivesSolid(x, y, z);
        const surface = !!queries.hasStandingSurface(x, y, z);
        if (!solid && surface) continue;
        if (solid) {
            const to = nearest(x, y, z);
            units.push({
                id: u.id, effect: "crush", cause: "crushed",
                damage: dice(dropFeet), to: to, kill: !to
            });
        } else {
            const below = columnBelow(x, y, z);
            const to = below ? below.cell : null;
            const feet = below ? below.feet : (dropFeet || levelFeet);
            units.push({
                id: u.id, effect: "fall", cause: "fall",
                damage: dice(feet), to: to, kill: !to
            });
        }
    }

    const items = [];
    const itemList = input.items || [];
    for (let i = 0; i < itemList.length; i++) {
        const it = itemList[i];
        const x = it.x | 0, y = it.y | 0, z = it.z | 0;
        const solid = !!queries.derivesSolid(x, y, z);
        const surface = !!queries.hasStandingSurface(x, y, z);
        if (!solid && surface) continue;
        if (!ITEMS_SURVIVE) {
            items.push({ id: it.id, effect: "destroy", to: null, destroyed: true });
            continue;
        }
        items.push({ id: it.id, effect: "relocate", to: placeLoose(x, y, z), destroyed: false });
    }

    const objects = [];
    const objectList = input.objects || [];
    for (let i = 0; i < objectList.length; i++) {
        const o = objectList[i];
        const x = o.x | 0, y = o.y | 0, z = o.z | 0;
        const solid = !!queries.derivesSolid(x, y, z);
        const surface = !!queries.hasStandingSurface(x, y, z);
        const structural = isStructural(o);
        const inPiece = vacated.has(cellKey(x, y, z));
        const ruin = o.ruin || "rubble";
        if (structural && inPiece) {
            objects.push({ id: o.id, effect: "remove", ruin: ruin, placeAt: landingOf(x, y, z) });
            continue;
        }
        if (solid || !surface) {
            objects.push({ id: o.id, effect: "break", ruin: ruin, placeAt: placeLoose(x, y, z) });
        }
    }

    return { units: units, items: items, objects: objects, dropFeet: dropFeet };
}

module.exports = { planOccupants: planOccupants };
