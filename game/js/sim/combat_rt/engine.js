"use strict";
// On-map real-time combat with pause. Dice, attacks, saves and damage go through
// the injected UF.Rules object. This file does not change the rules.
// Fortress and hero mode share one action picker: a queued order overrides a
// behaviour, and an empty queue uses the behaviour in either mode.

const C = require("./constants");
const G = require("./grid");
const M = require("./move8");
const P = require("./presentation");
const Rng = require("./rng");
const DICE = require("../rules/dice");

function fail(code, msg) {
    const err = new Error(code + ": " + msg);
    err.code = code;
    return err;
}

function byIdSort(a, b) {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
}

function createEngine(opts) {
    const o = opts || {};
    const rules = o.rules;
    if (!rules || typeof rules.attack !== "function" || typeof rules.damage !== "function") {
        throw fail("NO_RULES", "combat_rt needs UF.Rules");
    }
    const roundMs = C.ROUND_MS;
    const defs = rules.WEAPON_DEFS || {};
    const rng = o.rng || Rng.createRng(o.seed >>> 0);
    const rngFn = function () { return rng.next(); };
    const passable = typeof o.passable === "function" ? o.passable : function () { return true; };
    const Party = o.party || require("../taming/party");

    let mode = o.mode === "hero" ? "hero" : "fortress";
    let paused = false;
    let speed = 1;
    let timeMs = 0;
    let zoom = o.zoom === "out" ? "out" : "tactical";
    let viewportWidth = o.viewportWidth || 1920;
    let viewportHeight = o.viewportHeight || 1080;
    let heroId = o.heroId || null;
    let heroTargetId = null;
    let pauseOnTarget = false;
    const units = [];
    const index = new Map();
    const orders = new Map();
    const squads = [];
    let selection = [];
    let initiative = null;
    const opened = [];
    const schedule = [];
    const transcript = [];
    const feedback = [];
    const marks = [];

    function scale() {
        let best = 1;
        for (let s = 1; s <= 8; s++) {
            if (Math.floor(viewportWidth / (s * C.TILE_PX)) >= 20) best = s;
        }
        return best;
    }

    function get(id) { return index.get(String(id)) || null; }

    function addUnit(spec) {
        const s = spec || {};
        if (!s.id && s.id !== 0) throw fail("BAD_ID", "unit needs an id");
        const id = String(s.id);
        if (index.has(id)) throw fail("BAD_ID", "duplicate unit " + id);
        const z = s.z === undefined || s.z === null ? 0 : s.z;
        if (!C.layerOk(z)) throw fail("BAD_LAYER", "z " + z + " is outside " + C.LAYER_MIN + ".." + C.LAYER_MAX);
        const stats = Object.assign({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, s.stats || {});
        const maxHp = s.maxHp === undefined ? (s.hp === undefined ? 20 : s.hp) : s.maxHp;
        const hp = s.hp === undefined ? maxHp : s.hp;
        const unit = {
            id: id,
            name: s.name || id,
            x: s.x | 0,
            y: s.y | 0,
            z: z,
            facing: C.DIRECTIONS.indexOf(s.facing) >= 0 ? s.facing : "S",
            size: C.FOOTPRINT[s.size] ? s.size : "Medium",
            speedFt: s.speedFt === undefined ? 30 : s.speedFt | 0,
            side: s.side || "player",
            faction: s.faction || s.side || "player",
            behaviour: C.BEHAVIOURS.indexOf(s.behaviour) >= 0 ? s.behaviour : "attack-nearest",
            squadId: s.squadId || null,
            summonedBy: s.summonedBy || null,
            race: s.race || "human",
            sex: s.sex || "m",
            className: s.className || "fighter",
            armorState: s.armorState || null,
            armorCategory: s.armorCategory || null,
            weaponKey: s.weaponKey || "longsword",
            shield: !!s.shield,
            pc: !!s.pc,
            reachSquares: s.reachSquares || null,
            pose: "IDLE",
            dead: false,
            dying: false,
            cosmetic: { x: 0, y: 0 },
            area: { x: 0, y: 0, z: z },
            data: {
                hp: hp,
                maxHp: maxHp,
                level: s.level === undefined ? 1 : s.level,
                stats: stats,
                equipment: s.equipment || {},
                conditions: Array.isArray(s.conditions) ? s.conditions.slice() : [],
                kind: s.kind || (s.pc ? "person" : "creature"),
                resources: s.resources || null,
                spellSlots: s.spellSlots || null,
                deathSaves: { successes: 0, failures: 0 }
            }
        };
        if (s.worldUnit) unit.worldUnit = s.worldUnit;
        if (s.anchorHold) unit.anchorHold = true;
        if (s.tamed) {
            unit.tamed = true;
            unit.pc = false;
            unit.className = "";
            unit.shield = false;
            unit.order = Party.orderOf(s);
            unit.worldUnit = s.worldUnit || unit.worldUnit || null;
            unit.attacks = Array.isArray(s.attacks) ? s.attacks : [];
            unit.multiattack = Array.isArray(s.multiattack) ? s.multiattack.slice() : [];
            unit.equipmentSlots = [];
            unit.data.equipment = {}; // BG_ENGINE_GEAR
            unit.data.species = s.species || null;
            unit.data.srdId = s.srdId || null;
            unit.data.taming = s.taming || null;
            unit.data.kind = "creature";
            unit.data.level = null;
            if (s.weaponKey) unit.weaponKey = s.weaponKey;
            if (s.reachSquares) unit.reachSquares = s.reachSquares;
        }
        if (hp <= 0) {
            unit.data.hp = 0;
            unit.dead = !unit.pc;
            unit.dying = !!unit.pc;
            unit.pose = "DEAD";
        }
        units.push(unit);
        index.set(id, unit);
        return id;
    }

    function rangeBands(unit) {
        if (unit.tamed) {
            const reach = unit.reachSquares || 1;
            return { ranged: false, normal: reach, long: reach };
        }
        const key = C.slug(unit.weaponKey);
        const def = defs[key] || null;
        const group = P.weaponGroup(unit.weaponKey);
        const ranged = group === "bow" || group === "crossbow" || !!(def && def.ranged);
        if (!ranged) {
            let reach = 1;
            if (unit.reachSquares) reach = unit.reachSquares | 0;
            else if (def && typeof def.reach === "number") reach = Math.max(1, Math.round(def.reach / 5));
            return { ranged: false, normal: reach, long: reach };
        }
        const normal = Math.max(1, Math.floor(((def && def.range) || 80) / 5));
        const long = def && def.longRange ? Math.max(normal, Math.floor(def.longRange / 5)) : normal;
        return { ranged: true, normal: normal, long: long };
    }

    function occupied(x, y, z, ignoreId) {
        for (let i = 0; i < units.length; i++) {
            const u = units[i];
            if (u.dead || u.id === ignoreId || u.z !== z) continue;
            const squares = G.footprintSquares(u);
            for (let k = 0; k < squares.length; k++) {
                if (squares[k].x === x && squares[k].y === y) return u;
            }
        }
        return null;
    }

    function canStand(unit, x, y) {
        const squares = G.footprintSquares(unit, x, y);
        const fp = G.footprint(unit.size);
        for (let i = 0; i < squares.length; i++) {
            const s = squares[i];
            if (!passable(s.x, s.y, unit.z)) return false;
            const other = occupied(s.x, s.y, unit.z, unit.id);
            if (other && !(fp.shares && G.footprint(other.size).shares)) return false;
        }
        return true;
    }

    function nearest(unit, pred) {
        let best = null;
        for (let i = 0; i < units.length; i++) {
            const other = units[i];
            if (other.id === unit.id || other.dead || other.side === unit.side) continue;
            if (pred && !pred(other)) continue;
            const d = G.squaresApart(unit, other);
            if (!best || d < best.d || (d === best.d && other.id < best.id)) best = { other: other, d: d };
        }
        return best;
    }

    function worstAlly(unit) {
        let best = null;
        for (let i = 0; i < units.length; i++) {
            const other = units[i];
            if (other.dead || other.side !== unit.side) continue;
            if (other.data.hp >= other.data.maxHp) continue;
            if (other.z !== unit.z) continue;
            if (G.squaresApart(unit, other) > C.HEAL_RANGE_SQUARES) continue;
            const ratio = other.data.hp / other.data.maxHp;
            if (!best || ratio < best.ratio || (ratio === best.ratio && other.id < best.other.id)) {
                best = { other: other, ratio: ratio };
            }
        }
        return best ? best.other : null;
    }

    function decideBehaviour(unit) {
        const behaviour = unit.behaviour;
        if (behaviour === "flee") return { type: "flee" };
        if (behaviour === "heal") {
            const ally = worstAlly(unit);
            if (ally) return { type: "heal", targetId: ally.id };
        }
        if (behaviour === "defend") {
            const bands = rangeBands(unit);
            const near = nearest(unit, function (o) {
                return o.z === unit.z && G.squaresApart(unit, o) <= bands.normal && !bands.ranged;
            });
            if (!near && !bands.ranged) {
                const touch = nearest(unit, function (o) { return o.z === unit.z && G.squaresApart(unit, o) <= bands.normal; });
                if (touch) return { type: "attack", targetId: touch.other.id };
                return { type: "hold" };
            }
            if (near) return { type: "attack", targetId: near.other.id };
            return { type: "hold" };
        }
        const same = nearest(unit, function (o) { return o.z === unit.z; });
        const any = same || nearest(unit, null);
        if (!any) return { type: "hold" };
        return { type: "attack", targetId: any.other.id };
    }

    function partyAnchor(unit) {
        const rec = unit.data && unit.data.taming;
        if (rec && rec.ownerId != null) {
            const owner = get(String(rec.ownerId));
            if (owner && !owner.dead && owner.id !== unit.id) return owner;
        }
        let person = null;
        let ally = null;
        for (let i = 0; i < units.length; i++) {
            const other = units[i];
            if (other.id === unit.id || other.dead || other.side !== unit.side) continue;
            const d = G.squaresApart(unit, other);
            if (!other.tamed && (!person || d < person.d || (d === person.d && other.id < person.other.id))) {
                person = { other: other, d: d };
            }
            if (!ally || d < ally.d || (d === ally.d && other.id < ally.other.id)) ally = { other: other, d: d };
        }
        if (person) return person.other;
        return ally ? ally.other : null;
    }

    function tamedLook(unit) {
        return {
            living: function (id) {
                const found = get(String(id));
                return !!(found && !found.dead);
            },
            enemyInReach: function () {
                const bands = rangeBands(unit);
                const near = nearest(unit, function (o) {
                    return o.z === unit.z && G.squaresApart(unit, o) <= bands.normal;
                });
                return near ? { id: near.other.id } : null;
            },
            anchorId: function () {
                const anchor = partyAnchor(unit);
                return anchor ? anchor.id : null;
            }
        };
    }

    function peekAction(id) {
        const unit = get(id);
        if (!unit) return { type: "none" };
        if (unit.dead) return { type: "none" };
        if (unit.dying && unit.pc) return { type: "death-save" };
        if (unit.tamed) return Party.nextAction(unit, tamedLook(unit));
        const q = orders.get(id);
        if (q && q.length) return Object.assign({}, q[0]);
        return decideBehaviour(unit);
    }

    function decide(unit) {
        if (unit.dead) return { type: "none" };
        if (unit.dying && unit.pc) return { type: "death-save" };
        if (unit.anchorHold) return { type: "hold" };
        const q = orders.get(unit.id);
        if (unit.tamed) {
            if (q && q.length) {
                const next = q.shift();
                if (next && (next.type === "follow" || next.type === "hold" || next.type === "attack")) {
                    Party.issueOrder(unit, next);
                } else if (next) {
                    return next;
                }
            }
            return Party.nextAction(unit, tamedLook(unit));
        }
        if (q && q.length) return q.shift();
        return decideBehaviour(unit);
    }

    function faceToward(unit, target) {
        const dir = M.directionOf(target.x - unit.x, target.y - unit.y);
        if (dir) unit.facing = dir.id;
    }

    function tryStep(unit, dir) {
        if (!dir) return false;
        if (!M.allowsDiagonal(unit.x, unit.y, dir.dx, dir.dy, function (x, y) { return passable(x, y, unit.z); })) return false;
        const nx = unit.x + dir.dx;
        const ny = unit.y + dir.dy;
        if (!canStand(unit, nx, ny)) return false;
        unit.x = nx;
        unit.y = ny;
        unit.facing = dir.id;
        unit.pose = "WALK";
        syncWorldUnit(unit); // BG_WORLD_SYNC
        return true;
    }

    function stepBudget(unit) {
        return Math.max(0, Math.floor(unit.speedFt / 5));
    }

    function stepToward(unit, target, budget) {
        let moved = 0;
        for (let n = 0; n < budget; n++) {
            let best = null;
            for (let i = 0; i < C.DIR_DELTA.length; i++) {
                const dir = C.DIR_DELTA[i];
                const nx = unit.x + dir.dx;
                const ny = unit.y + dir.dy;
                if (!M.allowsDiagonal(unit.x, unit.y, dir.dx, dir.dy, function (x, y) { return passable(x, y, unit.z); })) continue;
                if (!canStand(unit, nx, ny)) continue;
                const fake = { x: nx, y: ny, z: unit.z, size: unit.size };
                const d = G.squaresApart(fake, target);
                if (!best || d < best.d || (d === best.d && i < best.i)) best = { dir: dir, d: d, i: i };
            }
            if (!best || best.d >= G.squaresApart(unit, target)) break;
            if (!tryStep(unit, best.dir)) break;
            moved++;
        }
        return moved;
    }

    function stepAway(unit, budget) {
        const enemy = nearest(unit, function (o) { return o.z === unit.z; }) || nearest(unit, null);
        let moved = 0;
        for (let n = 0; n < budget; n++) {
            let best = null;
            for (let i = 0; i < C.DIR_DELTA.length; i++) {
                const dir = C.DIR_DELTA[i];
                const nx = unit.x + dir.dx;
                const ny = unit.y + dir.dy;
                if (!M.allowsDiagonal(unit.x, unit.y, dir.dx, dir.dy, function (x, y) { return passable(x, y, unit.z); })) continue;
                if (!canStand(unit, nx, ny)) continue;
                let d = 0;
                if (enemy) {
                    const fake = { x: nx, y: ny, z: unit.z, size: unit.size };
                    d = G.squaresApart(fake, enemy.other);
                }
                if (!best || d > best.d || (d === best.d && i < best.i)) best = { dir: dir, d: d, i: i };
            }
            if (!best) break;
            if (enemy && best.d <= G.squaresApart(unit, enemy.other)) break;
            if (!tryStep(unit, best.dir)) break;
            moved++;
        }
        return moved;
    }

    function pushGrid(target, actor, squares) {
        const n = squares | 0;
        if (n <= 0) return 0;
        const dir = M.directionOf(target.x - actor.x, target.y - actor.y) || M.byId("S");
        let moved = 0;
        for (let i = 0; i < n; i++) {
            const nx = target.x + dir.dx;
            const ny = target.y + dir.dy;
            if (!canStand(target, nx, ny)) break;
            target.x = nx;
            target.y = ny;
            moved++;
            syncWorldUnit(target);
        }
        return moved;
    }

    function syncWorldUnit(unit) {
        const world = unit && unit.worldUnit;
        if (!world || world === unit) return;
        world.x = unit.x;
        world.y = unit.y;
        if (unit.z != null) world.z = unit.z;
        if (world.area && unit.z != null) world.area.z = unit.z;
        if (world.data && unit.data) {
            world.data.hp = unit.data.hp;
            world.data.maxHp = unit.data.maxHp;
        }
    }

    function applyDamage(target, amount, critical, damageType) {
        const dmg = Math.max(0, amount | 0);
        if (dmg > 0 && target && target.tamed) Party.noteDamageType(target, rules, damageType);
        if (target.dying && target.pc && dmg > 0) {
            target.data.deathSaves.failures += critical ? 2 : 1;
            if (target.data.deathSaves.failures >= 3) {
                target.dead = true;
                target.dying = false;
                target.pose = "DEAD";
            }
            return dmg;
        }
        const next = Math.max(0, target.data.hp - dmg);
        target.data.hp = next;
        const deferDeath = !!(target.tamed && Party.defersDeath(target, rules)); // BG_DEATH_EXCEPTION
        if (next <= 0 && !deferDeath) {
            target.data.hp = 0;
            if (target.pc) {
                target.dying = true;
                target.dead = false;
                target.pose = "KNOCKDOWN";
            } else {
                target.dead = true;
                target.dying = false;
                target.pose = "DEAD";
                if (target.tamed) Party.noteDeath(target, { cause: "hp0" });
            }
        } else if (next <= 0) {
            target.data.hp = 0;
            target.dead = false;
            target.dying = false;
            target.pose = "HURT";
        } else {
            target.pose = "HURT";
        }
        syncWorldUnit(target);
        return dmg;
    }

    function applyHeal(target, amount) {
        if (!target || target.dead) return 0;
        const gained = Math.max(0, Math.min(amount | 0, target.data.maxHp - target.data.hp));
        target.data.hp += gained;
        if (gained > 0 && target.dying) {
            target.dying = false;
            target.data.deathSaves = { successes: 0, failures: 0 };
            target.pose = "IDLE";
        }
        syncWorldUnit(target);
        return gained;
    }

    function pushEvent(event) {
        transcript.push(event);
        feedback.push(event);
        if (feedback.length > 20000) feedback.shift();
        return event;
    }

    function baseEvent(actor, slot, type) {
        return {
            round: slot.round,
            actorId: actor.id,
            type: type,
            targetId: null,
            hit: false,
            damage: 0,
            heal: 0,
            natural: null,
            sameZViolation: false,
            outOfRange: false,
            effectZ: actor.z,
            actorZ: actor.z,
            targetZ: null,
            clip: null,
            targetAnim: null,
            flash: false,
            flashFrame: null,
            number: null,
            knock: { x: 0, y: 0 },
            gridMoved: 0,
            placeholder: true,
            bitmap: null,
            damageType: null
        };
    }

    function rulesCombatant(unit) {
        if (!unit || !unit.tamed) return unit;
        return Party.rulesBody(unit);
    }

    function resolveAttack(actor, action, slot) {
        const event = baseEvent(actor, slot, "attack");
        const target = get(action.targetId);
        event.clip = P.attackClip(actor);
        if (!target || target.dead) {
            event.type = "hold";
            actor.pose = "IDLE";
            return pushEvent(event);
        }
        event.targetId = target.id;
        event.targetZ = target.z;
        event.effectZ = target.z;
        faceToward(actor, target);
        if (actor.z !== target.z) {
            const att = rules.attack(rulesCombatant(actor), rulesCombatant(target), actor.weaponKey || "unarmed", { rng: rngFn });
            event.sameZViolation = !!att.sameZViolation;
            event.hit = false;
            event.damage = 0;
            event.natural = att.natural === undefined ? null : att.natural;
            event.number = P.damageNumber(0, att.damageType || "miss", false);
            actor.pose = event.clip || "IDLE";
            return pushEvent(event);
        }
        const bands = rangeBands(actor);
        if (G.squaresApart(actor, target) > bands.long) stepToward(actor, target, stepBudget(actor));
        const dist = G.squaresApart(actor, target);
        if (dist > bands.long) {
            event.outOfRange = true;
            event.number = P.damageNumber(0, "miss", false);
            return pushEvent(event);
        }
        const call = { rng: rngFn };
        if (bands.ranged && dist > bands.normal) call.disadvantage = true;
        const att = rules.attack(rulesCombatant(actor), rulesCombatant(target), actor.weaponKey || "unarmed", call);
        if (att.sameZViolation) {
            event.sameZViolation = true;
            event.number = P.damageNumber(0, "miss", false);
            return pushEvent(event);
        }
        event.natural = att.natural;
        event.attackMod = att.attackMod;
        event.effectiveAC = att.effectiveAC;
        event.damageType = att.damageType || null;
        let damage = 0;
        if (att.hit) {
            const dmg = rules.damage(rulesCombatant(actor), rulesCombatant(target), att, { rng: rngFn });
            damage = applyDamage(target, dmg.damage, !!att.critical);
        }
        event.hit = !!att.hit;
        event.damage = damage;
        const kb = P.knockPixels(damage, !!att.critical);
        actor.cosmetic = { x: 0, y: 0 };
        target.cosmetic = P.knockVector(actor, target, kb);
        event.knock = target.cosmetic;
        let moved = 0;
        if (action.pushSquares) moved = pushGrid(target, actor, action.pushSquares);
        event.gridMoved = moved;
        event.flash = !!att.hit;
        event.flashFrame = att.hit ? 3 : null;
        event.number = P.damageNumber(damage, att.damageType || actor.weaponKey, !!att.hit);
        event.targetAnim = target.dead ? "KNOCKDOWN" : (att.hit ? "HURT" : null);
        if (target.dead) target.pose = "DEAD";
        actor.pose = event.clip || "IDLE";
        if (att.hit && damage > 0) {
            marks.push({ kind: "blood", x: target.x, y: target.y, z: target.z, fadeSteps: 3, step: 0, placeholder: true });
            event.blood = true;
        }
        return pushEvent(event);
    }

    function resolveSpell(actor, action, slot) {
        const event = baseEvent(actor, slot, "spell");
        const target = get(action.targetId);
        event.clip = "CAST";
        actor.pose = "CAST";
        if (!target || target.dead) return pushEvent(event);
        event.targetId = target.id;
        event.targetZ = target.z;
        event.effectZ = target.z;
        faceToward(actor, target);
        const saveSubject = rulesCombatant(target); // BG_SPELL_SAVE
        const save = rules.savingThrow(saveSubject, action.ability || "dex", action.dc === undefined ? 10 : action.dc, { rng: rngFn });
        event.natural = save.roll;
        event.saveOk = !!save.ok;
        let damage = 0;
        event.damageType = action.damageType || "fire";
        if (!save.ok || action.halfOnSave) {
            const rolled = rules.damage(rulesCombatant(actor), rulesCombatant(target), {
                hit: true,
                critical: false,
                damageExpr: action.dice || "1d8",
                damageType: event.damageType,
                fromStatBlock: false,
                abilityMod: 0,
                riders: []
            }, { rng: rngFn, spell: true });
            damage = rolled.damage;
            if (save.ok && action.halfOnSave) damage = Math.floor(damage / 2);
            damage = applyDamage(target, damage, false, event.damageType);
        }
        event.hit = damage > 0;
        event.damage = damage;
        event.number = P.damageNumber(damage, event.damageType, damage > 0);
        event.flash = damage > 0;
        event.flashFrame = damage > 0 ? 3 : null;
        event.squares = G.disk(target.x, target.y, target.z, action.radiusSquares || 0);
        if (damage > 0) {
            marks.push({ kind: "blood", x: target.x, y: target.y, z: target.z, fadeSteps: 3, step: 0, placeholder: true });
            event.blood = true;
        }
        return pushEvent(event);
    }

    function resolveHeal(actor, action, slot) {
        const event = baseEvent(actor, slot, "heal");
        const target = get(action.targetId) || worstAlly(actor);
        event.clip = "CAST";
        actor.pose = "CAST";
        if (!target || target.dead || target.z !== actor.z) return pushEvent(event);
        event.targetId = target.id;
        event.targetZ = target.z;
        event.effectZ = target.z;
        const rolled = DICE.rollExpression(C.HEAL_DICE, rngFn, {});
        const mod = typeof rules.modifier === "function" ? rules.modifier(actor.data.stats.wis) : 0;
        const gained = applyHeal(target, rolled.total + mod);
        event.heal = gained;
        event.hit = gained > 0;
        event.number = {
            text: String(gained),
            font: C.PIXEL_FONT,
            native: true,
            scale: 1,
            color: C.DAMAGE_COLOR.heal
        };
        return pushEvent(event);
    }

    function resolveFlee(actor, slot) {
        const event = baseEvent(actor, slot, "flee");
        event.clip = "WALK";
        stepAway(actor, stepBudget(actor));
        event.x = actor.x;
        event.y = actor.y;
        return pushEvent(event);
    }

    function resolveDeathSave(actor, slot) {
        const event = baseEvent(actor, slot, "death-save");
        const saved = rules.deathSave(actor, { rng: rngFn });
        event.natural = saved ? saved.roll : null;
        if (saved && saved.dead) {
            actor.dead = true;
            actor.dying = false;
            actor.pose = "DEAD";
        } else if (saved && saved.result === "revive") {
            actor.dying = false;
            actor.dead = false;
            actor.pose = "IDLE";
        }
        event.hit = !!(saved && saved.result === "success");
        return pushEvent(event);
    }

    function attackKeys(actor) {
        if (Array.isArray(actor.multiattack) && actor.multiattack.length) return actor.multiattack.slice();
        if (actor.weaponKey) return [actor.weaponKey];
        return [];
    }

    function resolveFollow(actor, slot) {
        const event = baseEvent(actor, slot, "follow");
        const anchor = partyAnchor(actor);
        event.targetId = anchor ? anchor.id : null;
        event.clip = "WALK";
        if (anchor && G.squaresApart(actor, anchor) > 1) stepToward(actor, anchor, stepBudget(actor));
        event.x = actor.x;
        event.y = actor.y;
        actor.pose = anchor ? "WALK" : "IDLE";
        return pushEvent(event);
    }

    function resolveNatural(actor, action, slot) {
        const event = baseEvent(actor, slot, "attack");
        const target = get(action.targetId);
        event.clip = P.attackClip(actor);
        event.swings = [];
        if (!target || target.dead) {
            event.type = "hold";
            actor.pose = "IDLE";
            return pushEvent(event);
        }
        event.targetId = target.id;
        event.targetZ = target.z;
        event.effectZ = target.z;
        faceToward(actor, target);
        const keys = attackKeys(actor);
        const actorBody = Party.rulesBody(actor);
        const targetBody = target.tamed ? Party.rulesBody(target) : target;
        if (actor.z !== target.z) {
            const att = rules.attack(actorBody, targetBody, keys[0] || "unarmed", { rng: rngFn });
            event.sameZViolation = !!att.sameZViolation;
            event.hit = false;
            event.damage = 0;
            event.natural = att.natural === undefined ? null : att.natural;
            event.attackMod = att.attackMod;
            event.effectiveAC = att.effectiveAC;
            event.number = P.damageNumber(0, att.damageType || "miss", false);
            actor.pose = event.clip || "IDLE";
            return pushEvent(event);
        }
        const bands = rangeBands(actor);
        if (G.squaresApart(actor, target) > bands.long) stepToward(actor, target, stepBudget(actor));
        if (G.squaresApart(actor, target) > bands.long) {
            event.outOfRange = true;
            event.number = P.damageNumber(0, "miss", false);
            return pushEvent(event);
        }
        let damage = 0;
        let anyHit = false;
        let last = null;
        for (let i = 0; i < keys.length; i++) {
            if (target.dead) break;
            if (G.squaresApart(actor, target) > bands.normal) break;
            const pack = Party.packAdvantage(rules, actor, target, units); // BG_PACK
            const att = rules.attack(actorBody, targetBody, keys[i], { rng: rngFn, advantage: pack });
            let dealt = 0;
            if (att.hit && !att.sameZViolation) {
                const dmg = rules.damage(actorBody, targetBody, att, { rng: rngFn });
                dealt = applyDamage(target, dmg.damage, !!att.critical, att.damageType);
                damage += dealt;
                anyHit = true;
            }
            last = att;
            event.swings.push({
                weaponKey: keys[i],
                hit: !!att.hit,
                damage: dealt,
                attackMod: att.attackMod,
                fromStatBlock: !!att.fromStatBlock,
                natural: att.natural,
                advantage: pack
            });
        }
        event.natural = last ? last.natural : null;
        event.damageType = last ? (last.damageType || null) : null;
        event.attackMod = last ? last.attackMod : null;
        event.effectiveAC = last ? last.effectiveAC : null;
        event.hit = anyHit;
        event.damage = damage;
        const kb = P.knockPixels(damage, !!(last && last.critical));
        actor.cosmetic = { x: 0, y: 0 };
        target.cosmetic = P.knockVector(actor, target, kb);
        event.knock = target.cosmetic;
        event.gridMoved = 0;
        event.flash = anyHit;
        event.flashFrame = anyHit ? 3 : null;
        event.number = P.damageNumber(damage, (last && last.damageType) || "miss", anyHit);
        event.targetAnim = target.dead ? "KNOCKDOWN" : (anyHit ? "HURT" : null);
        if (target.dead) target.pose = "DEAD";
        actor.pose = event.clip || "IDLE";
        if (anyHit && damage > 0) {
            marks.push({ kind: "blood", x: target.x, y: target.y, z: target.z, fadeSteps: 3, step: 0, placeholder: true });
            event.blood = true;
        }
        return pushEvent(event);
    }

    function resolve(actor, action, slot) {
        const type = action && action.type;
        if (type === "attack" && actor.tamed) return resolveNatural(actor, action, slot);
        if (type === "attack") return resolveAttack(actor, action, slot);
        if (type === "follow") return resolveFollow(actor, slot);
        if (type === "spell") return resolveSpell(actor, action, slot);
        if (type === "heal") return resolveHeal(actor, action, slot);
        if (type === "flee") return resolveFlee(actor, slot);
        if (type === "death-save") return resolveDeathSave(actor, slot);
        if (type === "move") {
            const event = baseEvent(actor, slot, "move");
            const goal = { x: action.x | 0, y: action.y | 0, z: actor.z, size: "Medium" };
            stepToward(actor, goal, stepBudget(actor));
            event.x = actor.x;
            event.y = actor.y;
            event.clip = "WALK";
            return pushEvent(event);
        }
        const event = baseEvent(actor, slot, "hold");
        actor.pose = actor.dead ? "DEAD" : "IDLE";
        event.clip = actor.pose;
        return pushEvent(event);
    }

    function rollInitiative() {
        const list = units.slice().sort(byIdSort);
        initiative = [];
        for (let i = 0; i < list.length; i++) {
            const u = list[i];
            if (u.dead) continue;
            const roll = rules.initiative(u.tamed ? Party.rulesBody(u) : u, { rng: rngFn });
            initiative.push({ id: u.id, total: roll.total, natural: roll.natural });
        }
        initiative.sort(function (a, b) {
            if (b.total !== a.total) return b.total - a.total;
            if (a.id < b.id) return -1;
            if (a.id > b.id) return 1;
            return 0;
        });
    }

    function openRound(r) {
        if (opened[r]) return;
        opened[r] = true;
        if (!initiative && units.length) rollInitiative();
        const actors = [];
        const rows = initiative || [];
        for (let i = 0; i < rows.length; i++) {
            const u = get(rows[i].id);
            if (u && !u.dead) actors.push(u);
        }
        const n = actors.length;
        const start = r * roundMs;
        for (let i = 0; i < n; i++) {
            const t = start + Math.floor(((i + 1) * roundMs) / (n + 1));
            schedule.push({ time: t, id: actors[i].id, round: r, seq: i, done: false });
        }
    }

    function perform(slot) {
        const unit = get(slot.id);
        if (!unit || unit.dead) {
            pushEvent(baseEvent({ id: slot.id, z: 0 }, slot, "none"));
            return;
        }
        if (unit.tamed) {
            const turn = Party.beginTurn(unit, rules); // BG_TURN_REGEN
            syncWorldUnit(unit);
            if (turn && turn.died) {
                unit.dead = true;
                unit.dying = false;
                unit.pose = "DEAD";
                if (unit.data) unit.data.hp = 0;
                syncWorldUnit(unit);
                pushEvent(baseEvent(unit, slot, "death"));
                return;
            }
            if (turn && turn.healed > 0 && unit.data && unit.data.hp > 0) {
                unit.dead = false;
                unit.dying = false;
                if (unit.pose === "DEAD" || unit.pose === "HURT") unit.pose = "IDLE";
            }
        }
        resolve(unit, decide(unit), slot);
    }

    function advanceSim(dt) {
        const target = timeMs + dt;
        let guard = 0;
        while (timeMs < target && guard++ < 1000000) {
            const r = Math.floor(timeMs / roundMs);
            openRound(r);
            let next = null;
            for (let i = 0; i < schedule.length; i++) {
                const s = schedule[i];
                if (s.done || s.round !== r) continue;
                if (!next || s.time < next.time || (s.time === next.time && s.seq < next.seq)) next = s;
            }
            const roundEnd = (r + 1) * roundMs;
            if (!next || next.time >= roundEnd) {
                timeMs = Math.min(target, roundEnd);
                continue;
            }
            if (next.time > target) {
                timeMs = target;
                return;
            }
            timeMs = next.time;
            next.done = true;
            perform(next);
        }
    }

    function snapshotUnit(u) {
        return {
            id: u.id,
            hp: u.data.hp,
            maxHp: u.data.maxHp,
            x: u.x,
            y: u.y,
            z: u.z,
            facing: u.facing,
            pose: u.pose,
            dead: !!u.dead,
            dying: !!u.dying,
            behaviour: u.behaviour,
            side: u.side,
            faction: u.faction,
            race: u.race,
            sex: u.sex,
            className: u.className,
            size: u.size,
            weaponKey: u.weaponKey,
            shield: u.shield,
            tamed: !!u.tamed,
            order: u.tamed ? Party.orderOf(u) : null,
            equipmentSlots: u.tamed ? [] : null,
            speedFt: u.speedFt,
            summonedBy: u.summonedBy,
            squadId: u.squadId,
            cosmetic: { x: u.cosmetic.x, y: u.cosmetic.y },
            clip: P.attackClip(u),
            armor: P.armorState(u),
            conditions: u.data.conditions.slice(),
            resources: u.data.resources
        };
    }

    function cloneOrders() {
        const out = {};
        orders.forEach(function (q, id) { out[id] = q.map(function (item) { return Object.assign({}, item); }); });
        return out;
    }

    function combatState() {
        return {
            simMs: timeMs,
            completedRounds: Math.floor(timeMs / roundMs),
            phaseMs: timeMs % roundMs,
            speed: speed,
            paused: paused,
            rng: rng.state(),
            initiative: (initiative || []).map(function (row) { return { id: row.id, total: row.total }; }),
            orders: cloneOrders(),
            pending: schedule.filter(function (s) { return !s.done; }).map(function (s) {
                return { time: s.time, id: s.id, round: s.round };
            }),
            units: units.map(snapshotUnit).sort(byIdSort)
        };
    }

    function outcomes() {
        return {
            units: units.map(function (u) {
                return { id: u.id, hp: u.data.hp, x: u.x, y: u.y, z: u.z, dead: !!u.dead, dying: !!u.dying };
            }).sort(byIdSort),
            log: transcript.map(function (e) {
                return {
                    round: e.round,
                    actorId: e.actorId,
                    type: e.type,
                    targetId: e.targetId,
                    hit: !!e.hit,
                    damage: e.damage | 0,
                    heal: e.heal | 0,
                    natural: e.natural === undefined ? null : e.natural,
                    sameZViolation: !!e.sameZViolation,
                    effectZ: e.effectZ,
                    actorZ: e.actorZ,
                    targetZ: e.targetZ,
                    clip: e.clip
                };
            })
        };
    }

    function camera() {
        if (mode === "hero" && heroId && get(heroId)) {
            const h = get(heroId);
            return { mode: "follow", unitId: heroId, x: h.x, y: h.y, z: h.z };
        }
        const z = units.length ? units[0].z : 0;
        return { mode: "commander", zoom: zoom, z: z, renderScale: zoom === "out" ? 1 : scale() };
    }

    function view() {
        return {
            mode: mode,
            scene: C.SCENE,
            paused: paused,
            speed: speed,
            zoom: zoom,
            scale: scale(),
            viewportWidth: viewportWidth,
            viewportHeight: viewportHeight,
            heroId: heroId,
            heroTargetId: heroTargetId,
            pauseOnTarget: pauseOnTarget,
            selection: selection.slice(),
            squads: squads.map(function (s) { return { id: s.id, behaviour: s.behaviour, memberIds: s.memberIds.slice() }; }),
            camera: camera(),
            units: units.map(snapshotUnit),
            marks: marks.slice()
        };
    }

    const api = {
        get mode() { return mode; },
        get paused() { return paused; },
        get speed() { return speed; },
        get simMs() { return timeMs; },
        get completedRounds() { return Math.floor(timeMs / roundMs); },
        get phaseMs() { return timeMs % roundMs; },
        get scene() { return C.SCENE; },
        addUnit: addUnit,
        unit: function (id) { const u = get(id); return u ? snapshotUnit(u) : null; },
        units: function () { return units.map(snapshotUnit).sort(byIdSort); },
        setMode: function (next) {
            if (next !== "fortress" && next !== "hero") throw fail("BAD_MODE", String(next));
            mode = next;
            return mode;
        },
        setSpeed: function (n) {
            const v = Number(n);
            if (!(v >= 1) || !Number.isFinite(v)) return speed;
            speed = v;
            return speed;
        },
        pause: function () { paused = true; return api; },
        resume: function () { paused = false; return api; },
        togglePause: function () { paused = !paused; return paused; },
        advanceReal: function (ms) {
            if (paused) return api;
            const dt = Number(ms);
            if (!(dt > 0)) return api;
            advanceSim(dt * speed);
            return api;
        },
        queueOrder: function (id, order) {
            if (!get(id)) throw fail("BAD_ID", "no unit " + id);
            if (!orders.has(id)) orders.set(id, []);
            orders.get(id).push(Object.assign({}, order));
            return api;
        },
        setOrder: function (id, order) {
            const u = get(id);
            if (!u || !u.tamed) return { ok: false, reason: "NOT_TAMED", order: null };
            return Party.issueOrder(u, order);
        },
        relocate: function (id, x, y, z) {
            const u = get(id);
            if (!u) return false;
            u.x = x | 0;
            u.y = y | 0;
            if (z !== undefined && z !== null) u.z = z | 0;
            return true;
        },
        enlistTamed: function (list) {
            return Party.enlist(api, rules, list);
        },
        equipCreature: function () {
            return { ok: false, reason: "NO_CREATURE_GEAR", slot: null };
        },
        setBehaviour: function (id, behaviour) {
            const u = get(id);
            if (!u || C.BEHAVIOURS.indexOf(behaviour) < 0) return false;
            u.behaviour = behaviour;
            return true;
        },
        setSquad: function (squadId, memberIds, behaviour) {
            const members = (memberIds || []).map(String);
            const b = C.BEHAVIOURS.indexOf(behaviour) >= 0 ? behaviour : "attack-nearest";
            squads.push({ id: String(squadId), behaviour: b, memberIds: members.slice() });
            for (let i = 0; i < members.length; i++) {
                const u = get(members[i]);
                if (!u) continue;
                u.squadId = String(squadId);
                u.behaviour = b;
            }
            return api;
        },
        setHero: function (id) { heroId = id ? String(id) : null; return heroId; },
        setPauseOnTarget: function (on) { pauseOnTarget = !!on; return pauseOnTarget; },
        setHeroTarget: function (id) {
            heroTargetId = id ? String(id) : null;
            if (pauseOnTarget && mode === "hero" && heroTargetId) paused = true;
            return heroTargetId;
        },
        setZoom: function (z) { zoom = z === "out" ? "out" : "tactical"; return zoom; },
        setViewport: function (w, h) {
            if (w) viewportWidth = w | 0;
            if (h) viewportHeight = h | 0;
            return scale();
        },
        selectRect: function (rect) {
            const r = rect || {};
            const x0 = Math.min(r.x0 | 0, r.x1 | 0);
            const x1 = Math.max(r.x0 | 0, r.x1 | 0);
            const y0 = Math.min(r.y0 | 0, r.y1 | 0);
            const y1 = Math.max(r.y0 | 0, r.y1 | 0);
            const layers = Array.isArray(r.layers) ? r.layers : null;
            const allow = layers ? new Set(layers) : null;
            selection = [];
            for (let i = 0; i < units.length; i++) {
                const u = units[i];
                if (u.dead) continue;
                if (allow && !allow.has(u.z)) continue;
                const squares = G.footprintSquares(u);
                let hit = false;
                for (let k = 0; k < squares.length; k++) {
                    const s = squares[k];
                    if (s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1) hit = true;
                }
                if (hit) selection.push(u.id);
            }
            selection.sort();
            return selection.slice();
        },
        peekAction: peekAction,
        combatState: combatState,
        outcomes: outcomes,
        transcript: function () { return transcript.slice(); },
        feedback: function () { return feedback.slice(); },
        marks: function () { return marks.slice(); },
        view: view,
        rngState: function () { return rng.state(); }
    };
    return api;
}

module.exports = { createEngine };
