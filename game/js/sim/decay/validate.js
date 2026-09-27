"use strict";
// SIM.40.05 decay parameter validator (AT-R-02). No schema library and no file IO.
// Infinity is legal only on the design's allow list. A roof life at SKY must be shorter
// than that template's wall life at SHELTERED. No transform output is ore, coal, gem or fossil.

const clock = require("./clock");

const EXPOSURES = ["SEALED", "SHELTERED", "SKY", "WET", "BURIED-AER", "BURIED-ANOX", "CAVE"];
const ROLES = ["ROOF", "WALL-UPPER", "WALL-BASE", "FLOOR", "FOUNDATION", "PROP", "FITTING"];
const CLASS_NAMES = [
    "ASHLAR", "RUBBLESTONE", "BRICK", "MUDBRICK", "TIMBER", "LIGHTWOOD", "THATCH",
    "TEXTILE", "FLESH", "BONE", "FERROUS", "CUPROUS", "LEADTIN", "SILVER",
    "NOBLE", "SPECIAL", "GLASS", "CERAMIC", "STONEITEM", "FOOD"
];
const INFINITE_OK = {
    ASHLAR: { SEALED: 1, "BURIED-AER": 1, "BURIED-ANOX": 1 },
    MUDBRICK: { "BURIED-AER": 1, "BURIED-ANOX": 1 },
    RUBBLESTONE: { "BURIED-AER": 1, "BURIED-ANOX": 1 },
    BRICK: { "BURIED-AER": 1, "BURIED-ANOX": 1 },
    CUPROUS: { SEALED: 1 },
    LEADTIN: { SEALED: 1 },
    SILVER: { SEALED: 1, SHELTERED: 1, "BURIED-ANOX": 1, CAVE: 1 },
    NOBLE: { ALL: 1 },
    SPECIAL: { ALL: 1 },
    GLASS: { ALL: 1 },
    CERAMIC: { ALL: 1 },
    STONEITEM: { ALL: 1 }
};
const GAP_OK = { BONE: { SEALED: 1, WET: 1 } };
const BAN = { ORE: 1, COAL: 1, GEM: 1, FOSSIL: 1, "FOSSIL-BED": 1, "FOSSIL_BED": 1 };
const TOP_KEYS = [
    "schema", "R", "ytPerSy", "dpy", "exposures", "roles", "tags", "classes", "lifeMilli",
    "stages", "maintainYears", "abandonYears", "siteAbandonYears", "upkeepShareMilli",
    "residue", "structureTemplates", "transforms", "remains", "scheduler", "lithify"
];
const TAG_IDS = ["OQ-R-01", "OQ-R-04", "OQ-R-05", "OQ-R-09"];

function isObj(v) { return typeof v === "object" && v !== null && !Array.isArray(v); }
function isUInt(n) { return typeof n === "number" && Number.isSafeInteger(n) && n >= 0; }
function push(errors, code, path, msg) { errors.push({ code: code, path: path, message: msg }); }

function infiniteOk(dc, ex) {
    const row = INFINITE_OK[dc];
    if (!row) return false;
    return row.ALL === 1 || row[ex] === 1;
}
function gapOk(dc, ex) {
    return GAP_OK[dc] && GAP_OK[dc][ex] === 1;
}
function badOutput(name) {
    if (name == null) return false;
    if (typeof name !== "string" || !name.length) return true;
    const u = name.toUpperCase();
    if (BAN[u]) return true;
    if (u.length > 4 && (u.endsWith("_ORE") || u.endsWith("-ORE"))) return true;
    return false;
}
function sameSet(list, expect) {
    if (!Array.isArray(list) || list.length !== expect.length) return false;
    for (let i = 0; i < expect.length; i++) if (list[i] !== expect[i]) return false;
    return true;
}

function cellOf(dc, ex, raw, errors) {
    const path = "lifeMilli." + dc + "." + ex;
    if (raw === null) {
        if (!infiniteOk(dc, ex)) push(errors, "E_INFINITE", path, "infinity is not allowed here");
        return;
    }
    if (isObj(raw) && raw.gap === true && Object.keys(raw).length === 1) {
        if (!gapOk(dc, ex)) push(errors, "E_SCHEMA", path, "gap is not allowed here");
        return;
    }
    if (!isUInt(raw) || raw === 0) {
        push(errors, "E_LIFE", path, "life must be a positive integer milli-year, null, or a gap");
        return;
    }
    if (raw % 5 !== 0) push(errors, "E_LIFE", path, "lifeYears * 2400 is not an integer");
}

function lifeYtAt(milli, num, den, ft8, root8, fire8) {
    try {
        return clock.lifeYt(milli, num, den, ft8, root8, fire8);
    } catch (e) {
        return e;
    }
}

function validate(params) {
    const errors = [];
    if (!isObj(params)) {
        push(errors, "E_SCHEMA", "", "params must be an object");
        return { ok: false, errors: errors };
    }
    Object.keys(params).forEach(function (k) {
        if (TOP_KEYS.indexOf(k) < 0) push(errors, "E_SCHEMA", k, "unknown field");
    });
    TOP_KEYS.forEach(function (k) {
        if (!Object.prototype.hasOwnProperty.call(params, k)) push(errors, "E_SCHEMA", k, "missing field");
    });
    if (errors.length) return { ok: false, errors: errors };

    if (params.schema !== 1) push(errors, "E_SCHEMA", "schema", "schema must be 1");
    if (params.R !== clock.R) push(errors, "E_SCHEMA", "R", "R must be 1000000");
    if (params.ytPerSy !== clock.YT_PER_SY) push(errors, "E_SCHEMA", "ytPerSy", "ytPerSy must be 2400");
    if (!isObj(params.dpy) || params.dpy.value !== null || params.dpy.ownerOpen !== "D-1") {
        push(errors, "E_SCHEMA", "dpy", "dpy stays unset (D-1)");
    }
    if (!sameSet(params.exposures, EXPOSURES)) push(errors, "E_SCHEMA", "exposures", "exposure list");
    if (!sameSet(params.roles, ROLES)) push(errors, "E_SCHEMA", "roles", "role list");

    if (!isObj(params.tags)) push(errors, "E_SCHEMA", "tags", "tags");
    else TAG_IDS.forEach(function (id) {
        const t = params.tags[id];
        if (!isObj(t) || t.ownerOpen !== true || typeof t.default !== "string" || !t.default.length) {
            push(errors, "E_SCHEMA", "tags." + id, "ownerOpen tag required");
        }
    });

    if (!isObj(params.classes) || !isObj(params.lifeMilli)) {
        push(errors, "E_SCHEMA", "classes", "classes and lifeMilli");
        return { ok: false, errors: errors };
    }
    const classKeys = Object.keys(params.classes).sort();
    const lifeKeys = Object.keys(params.lifeMilli).sort();
    if (classKeys.length !== CLASS_NAMES.length || lifeKeys.length !== CLASS_NAMES.length) {
        push(errors, "E_SCHEMA", "classes", "class set");
    }
    CLASS_NAMES.forEach(function (dc) {
        if (!isObj(params.classes[dc])) push(errors, "E_SCHEMA", "classes." + dc, "missing class");
        if (!isObj(params.lifeMilli[dc])) {
            push(errors, "E_SCHEMA", "lifeMilli." + dc, "missing life row");
            return;
        }
        const row = params.lifeMilli[dc];
        Object.keys(row).forEach(function (ex) {
            if (EXPOSURES.indexOf(ex) < 0) push(errors, "E_SCHEMA", "lifeMilli." + dc + "." + ex, "unknown exposure");
        });
        EXPOSURES.forEach(function (ex) { cellOf(dc, ex, row[ex], errors); });
        const cls = params.classes[dc];
        if (!isObj(cls)) return;
        if (cls.fShedMilli !== undefined && (!isUInt(cls.fShedMilli) || cls.fShedMilli > 1000)) {
            push(errors, "E_SCHEMA", "classes." + dc + ".fShedMilli", "fShedMilli 0..1000");
        }
        if (cls.humusMilli !== undefined && (!isUInt(cls.humusMilli) || cls.humusMilli > 1000)) {
            push(errors, "E_SCHEMA", "classes." + dc + ".humusMilli", "humusMilli 0..1000");
        }
        if (cls.scale !== undefined && cls.scale !== null) {
            if (!isObj(cls.scale) || !isUInt(cls.scale.den) || cls.scale.den < 1 || !isUInt(cls.scale.max) || cls.scale.max < 1) {
                push(errors, "E_SCHEMA", "classes." + dc + ".scale", "scale");
            }
        }
    });

    CLASS_NAMES.forEach(function (dc) {
        const cls = params.classes[dc];
        const row = params.lifeMilli[dc];
        if (!isObj(cls) || !isObj(row)) return;
        EXPOSURES.forEach(function (ex) {
            const raw = row[ex];
            if (!isUInt(raw)) return;
            const scales = [{ num: 1, den: 1 }];
            if (cls.scale && isUInt(cls.scale.den) && isUInt(cls.scale.max)) {
                scales.push({ num: cls.scale.den, den: cls.scale.den });
                scales.push({ num: cls.scale.max, den: cls.scale.den });
            }
            for (let i = 0; i < scales.length; i++) {
                const y = lifeYtAt(raw, scales[i].num, scales[i].den, 8, 8, 8);
                if (y instanceof Error || !isUInt(y) || y > clock.LIFE_MAX) {
                    push(errors, "E_LIFE_YT", "lifeMilli." + dc + "." + ex, "lifeYt exceeds 2^32-2 or is not exact");
                    break;
                }
            }
        });
    });

    const st = params.stages;
    if (!isObj(st) || st.s1Rem !== 850000 || st.foundationFloorRem !== 250000 || st.steps !== 4 || st.siteMassMilli !== 500) {
        push(errors, "E_SCHEMA", "stages", "stage thresholds");
    }
    if (!isObj(params.scheduler) || params.scheduler.ticksPerDay !== 2400 || params.scheduler.bShort !== 16 || params.scheduler.memberCap !== 64) {
        push(errors, "E_SCHEMA", "scheduler", "scheduler constants");
    }
    if (!isUInt(params.siteAbandonYears) || params.siteAbandonYears < 1) push(errors, "E_SCHEMA", "siteAbandonYears", "siteAbandonYears");
    if (params.upkeepShareMilli !== 50) push(errors, "E_SCHEMA", "upkeepShareMilli", "upkeepShareMilli");
    if (!isObj(params.maintainYears) || !isObj(params.abandonYears)) push(errors, "E_SCHEMA", "maintainYears", "maintenance tables");

    if (!isObj(params.residue)) push(errors, "E_SCHEMA", "residue", "residue");
    else {
        const rf = params.residue.fractions;
        if (!isObj(rf)) push(errors, "E_SCHEMA", "residue.fractions", "fractions");
        else Object.keys(rf).forEach(function (dc) {
            const row = rf[dc];
            if (!isObj(row) || !isUInt(row.ashMilli) || !isUInt(row.charMilli)) {
                push(errors, "E_SCHEMA", "residue.fractions." + dc, "ashMilli and charMilli");
                return;
            }
            if (row.ashMilli > 1000 || row.charMilli > 1000 || row.ashMilli + row.charMilli > 1000) {
                push(errors, "E_MASS", "residue.fractions." + dc, "ash + char at kappa 0 exceeds the input");
            }
        });
        if (!isObj(params.residue.weatherMilli)) push(errors, "E_SCHEMA", "residue.weatherMilli", "weather");
    }

    if (!Array.isArray(params.structureTemplates) || params.structureTemplates.length < 1) {
        push(errors, "E_SCHEMA", "structureTemplates", "templates");
    } else {
        params.structureTemplates.forEach(function (tpl, i) {
            const path = "structureTemplates[" + i + "]";
            if (!isObj(tpl) || CLASS_NAMES.indexOf(tpl.roof) < 0 || CLASS_NAMES.indexOf(tpl.wall) < 0) {
                push(errors, "E_SCHEMA", path, "template");
                return;
            }
            const roof = params.lifeMilli[tpl.roof] && params.lifeMilli[tpl.roof].SKY;
            const wall = params.lifeMilli[tpl.wall] && params.lifeMilli[tpl.wall].SHELTERED;
            if (!isUInt(roof)) {
                push(errors, "E_ROOF", path, "roof life at SKY must be finite");
                return;
            }
            if (wall === null) return;
            if (!isUInt(wall)) {
                push(errors, "E_ROOF", path, "wall life");
                return;
            }
            let roofY, wallY;
            try {
                roofY = clock.lifeYt(roof, 1, 1, 8, 8, 8);
                wallY = clock.lifeYt(wall, 1, 1, 8, 8, 8);
            } catch (e) {
                push(errors, "E_ROOF", path, "lifeYt");
                return;
            }
            if (roofY >= wallY) push(errors, "E_ROOF", path, "ROOF life at SKY must be shorter than WALL life at SHELTERED");
        });
    }

    if (!Array.isArray(params.transforms)) push(errors, "E_SCHEMA", "transforms", "transforms");
    else params.transforms.forEach(function (row, i) {
        const path = "transforms[" + i + "]";
        if (!isObj(row) || typeof row.id !== "string" || typeof row.from !== "string" || typeof row.to !== "string") {
            push(errors, "E_SCHEMA", path, "transform row");
            return;
        }
        if (badOutput(row.to)) push(errors, "E_ORE", path, "forbidden output " + row.to);
        if (row.output !== undefined && badOutput(row.output)) push(errors, "E_ORE", path, "forbidden output " + row.output);
    });

    if (!isObj(params.remains) || params.remains.ownerOpen !== "OQ-R-06" || params.remains.anchorYears !== 200) {
        push(errors, "E_SCHEMA", "remains", "remains table");
    } else {
        ["freshToSkeletalMilli", "skeletalToSoilMilli"].forEach(function (name) {
            const row = params.remains[name];
            if (!isObj(row)) {
                push(errors, "E_SCHEMA", "remains." + name, "missing");
                return;
            }
            Object.keys(row).forEach(function (ex) {
                if (!isUInt(row[ex]) || row[ex] === 0 || row[ex] % 5 !== 0) {
                    push(errors, "E_LIFE", "remains." + name + "." + ex, "life");
                }
            });
        });
    }

    if (!isObj(params.lithify) || params.lithify.enabled !== false || params.lithify.ownerOpen !== "OQ-R-03" || params.lithify.output !== "ROCK-SED") {
        push(errors, "E_SCHEMA", "lithify", "lithification stays off (OQ-R-03) and cannot output ore");
    }

    return { ok: errors.length === 0, errors: errors };
}

function lifeCell(params, dc, ex) {
    const row = params.lifeMilli[dc];
    if (!row || !Object.prototype.hasOwnProperty.call(row, ex)) return { kind: "missing" };
    const raw = row[ex];
    if (raw === null) return { kind: "inf" };
    if (isObj(raw) && raw.gap === true) return { kind: "gap" };
    if (isUInt(raw) && raw > 0) return { kind: "finite", milli: raw };
    return { kind: "bad" };
}

function scaleOf(params, dc, spec) {
    const cls = params.classes[dc];
    const sc = cls && cls.scale;
    if (spec && isUInt(spec.fieldNum) && isUInt(spec.fieldDen) && spec.fieldNum > 0 && spec.fieldDen > 0) {
        return { fieldNum: spec.fieldNum, fieldDen: spec.fieldDen };
    }
    if (!sc) return { fieldNum: 1, fieldDen: 1 };
    let v = null;
    if (spec && sc.field === "weatherResistance" && spec.wR != null) v = spec.wR;
    else if (spec && sc.field === "rotResistance" && spec.rR != null) v = spec.rR;
    else if (spec && sc.field === "corrosionResistance" && spec.cR != null) v = spec.cR;
    if (!isUInt(v) || v === 0) return { fieldNum: sc.den, fieldDen: sc.den };
    return { fieldNum: v, fieldDen: sc.den };
}

module.exports = {
    validate: validate,
    lifeCell: lifeCell,
    scaleOf: scaleOf,
    badOutput: badOutput,
    EXPOSURES: EXPOSURES,
    ROLES: ROLES,
    CLASS_NAMES: CLASS_NAMES
};
