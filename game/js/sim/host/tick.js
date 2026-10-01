"use strict";
// SIM.00.02a: the shared simulation tick clock (ADR-003 §3: 1 tick = 36 game-seconds, 100 ticks = 1 game hour).
// Host-agnostic: no file IO, no host global, no randomness, no frame hook. The host feeds it the absolute game
// minute; the clock turns elapsed game time into whole ticks with an integer seconds remainder, so the count never
// depends on how many events carried the time. A large jump is handed out at most maxTicksPerAdvance per call; the
// rest is owed and paid on later calls. API and rules: docs/systems/DEUS_SimTick.md.

const SAVE_VERSION = 1;
const DEFAULTS = Object.freeze({ secondsPerTick: 36, maxTicksPerAdvance: 100 });

function fail(code, msg) {
    const e = new Error(msg);
    e.code = code;
    throw e;
}
const isUInt = n => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
const isPosInt = n => isUInt(n) && n > 0;

/** A new, unarmed clock. opts: { secondsPerTick (default 36), maxTicksPerAdvance (default 100) }, positive integers. */
function createTickClock(opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    if (!isPosInt(o.secondsPerTick)) fail("E_TICK_CONFIG", `createTickClock: secondsPerTick ${o.secondsPerTick} is not a positive integer`);
    if (!isPosInt(o.maxTicksPerAdvance)) fail("E_TICK_CONFIG", `createTickClock: maxTicksPerAdvance ${o.maxTicksPerAdvance} is not a positive integer`);
    const spt = o.secondsPerTick, cap = o.maxTicksPerAdvance;

    let armed = false;
    let origin = 0;      // absolute game minute the clock was armed at
    let last = 0;        // absolute game minute of the last advance
    let remainder = 0;   // game-seconds past the last whole tick, 0..spt-1
    let owed = 0;        // ticks due but not yet handed out
    let ticks = 0;       // ticks handed out since arming
    let advances = 0;    // advanceToMinute calls while armed (one per time:minute event in the game)
    let catchUps = 0;    // advances (or drains) that hit the cap and left ticks owed
    let rebases = 0;     // advances to an earlier minute (SetTime backwards): the clock moved to it, no ticks

    /** Hands out min(owed, cap) ticks; returns how many. */
    function payOwed() {
        const n = owed < cap ? owed : cap;
        owed -= n;
        ticks += n;
        if (owed > 0) catchUps++;
        return n;
    }

    return {
        secondsPerTick: spt,
        maxTicksPerAdvance: cap,

        /** Arms (or re-arms) the clock at an absolute game minute: zero ticks, zero remainder, nothing owed. */
        arm(absMinute) {
            if (!isUInt(absMinute)) fail("E_TICK_MINUTE", `tick clock arm: minute ${absMinute} is not a whole number >= 0`);
            armed = true;
            origin = last = absMinute;
            remainder = owed = ticks = advances = catchUps = rebases = 0;
        },

        isArmed: () => armed,

        /**
         * Moves the clock to an absolute game minute and returns the ticks to run now (0..maxTicksPerAdvance).
         * Elapsed seconds = (absMinute - last) * 60 + remainder; whole ticks of it are added to what is owed, and the
         * call pays up to the cap. An earlier minute re-bases the clock there and returns 0. Unarmed: 0, nothing kept.
         */
        advanceToMinute(absMinute) {
            if (!armed) return 0;
            if (!isUInt(absMinute)) fail("E_TICK_MINUTE", `tick clock advance: minute ${absMinute} is not a whole number >= 0`);
            advances++;
            if (absMinute < last) {
                rebases++;
                last = absMinute;
                return payOwed();
            }
            const seconds = (absMinute - last) * 60 + remainder;
            if (!Number.isSafeInteger(seconds) || !Number.isSafeInteger(owed + Math.floor(seconds / spt))) {
                fail("E_TICK_RANGE", `tick clock advance: ${absMinute - last} minutes overflow the tick count`);
            }
            owed += Math.floor(seconds / spt);
            remainder = seconds % spt;
            last = absMinute;
            return payOwed();
        },

        /** Pays owed ticks without moving time: returns min(owed, maxTicksPerAdvance). */
        drain() {
            return armed ? payOwed() : 0;
        },

        tickCount: () => ticks,
        owed: () => owed,

        /** A new plain object: the clock's counters (nothing else is kept). */
        stats() {
            return { armed, secondsPerTick: spt, maxTicksPerAdvance: cap, originMinute: origin, lastMinute: last,
                remainderSeconds: remainder, owed, ticks, advances, catchUps, rebases };
        },

        /** Plain JSON data that restore() takes back exactly. */
        serialize() {
            return { v: SAVE_VERSION, secondsPerTick: spt, armed, origin, last, remainder, owed, ticks, advances, catchUps, rebases };
        },

        /** Puts back a serialize() result. Throws on a wrong version, a different secondsPerTick or a bad field. */
        restore(data) {
            if (!data || typeof data !== "object") fail("E_TICK_SAVE", "tick clock restore: no saved clock");
            if (data.v !== SAVE_VERSION) fail("E_TICK_SAVE", `tick clock restore: save version ${data.v}, expected ${SAVE_VERSION}`);
            if (data.secondsPerTick !== spt) fail("E_TICK_SAVE", `tick clock restore: saved at ${data.secondsPerTick} s per tick, this clock is ${spt}`);
            for (const k of ["origin", "last", "remainder", "owed", "ticks", "advances", "catchUps", "rebases"]) {
                if (!isUInt(data[k])) fail("E_TICK_SAVE", `tick clock restore: ${k} ${data[k]} is not a whole number >= 0`);
            }
            if (data.remainder >= spt) fail("E_TICK_SAVE", `tick clock restore: remainder ${data.remainder} >= ${spt}`);
            armed = data.armed === true;
            origin = data.origin;
            last = data.last;
            remainder = data.remainder;
            owed = data.owed;
            ticks = data.ticks;
            advances = data.advances;
            catchUps = data.catchUps;
            rebases = data.rebases;
        }
    };
}

/** The absolute game minute of a calendar reading: (day - 1) * 1440 + hour * 60 + minute (DEUS_Core's day starts at 1). */
function absoluteMinute(day, hour, minute) {
    if (!isPosInt(day) || !isUInt(hour) || !isUInt(minute)) {
        fail("E_TICK_MINUTE", `absoluteMinute: day ${day}, hour ${hour}, minute ${minute} is not a calendar reading`);
    }
    return (day - 1) * 1440 + hour * 60 + minute;
}

module.exports = { createTickClock, absoluteMinute, DEFAULTS, SAVE_VERSION };
