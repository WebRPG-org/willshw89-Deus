#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');
const { spawnSync } = require('child_process');
const pace = require('./pace');
const PACE_FILE = path.join(__dirname, 'pace.js');
const LANE = path.resolve(__dirname, '../../tasks/OPS.PRUNE.PACE/lane-cr');
const NOW = '2026-09-30T12:00:00.000Z';
const RESET = '2026-09-30T17:00:00.000Z';
const HOUR = 3600000;
const at = hours => new Date(Date.parse(NOW) + hours * HOUR).toISOString();
const clone = value => JSON.parse(JSON.stringify(value));

function provider(remaining = 50, overrides = {}) {
    return { precision: 'EXACT_PROVIDER', scope: 'account', source: 'TEST_account_usage',
        lastChecked: NOW, accountId: 'TEST_account',
        windows: [{ id: 'weekly', remainingPct: remaining, resetAt: RESET, durationHours: 168 }], ...overrides };
}
function input(p = provider()) { return { providers: { claude: p } }; }
function history(remaining = 60, time = at(-1), overrides = {}) {
    return { version: 1, samples: [{ provider: 'claude', accountId: 'TEST_account', window: 'weekly',
        remainingPct: remaining, observedAt: time, capturedAt: time, resetAt: RESET, durationHours: 168,
        source: `TEST_history @ ${time}`, ...overrides }] };
}
function surgeFixture(ratio, remaining = 11, resetHours = 0.5) {
    const window = { id: 'five-hour', remainingPct: remaining, resetAt: at(resetHours), durationHours: 5 };
    const hoursLeft = (Date.parse(window.resetAt) - Date.parse(NOW)) / HOUR;
    return { p: provider(remaining, { windows: [window] }),
        h: history(remaining + ratio * remaining / hoursLeft, at(-1), {
            window: window.id, resetAt: window.resetAt, durationHours: window.durationHours }),
        options: { expectedCostPct: 1 } };
}
function runSuite(api, integration = false, quiet = false, cliSource = null) {
    let passed = 0;
    const failures = [];
    const test = (name, fn) => {
        try { fn(); passed++; if (!quiet) console.log(`PASS ${name}`); }
        catch (error) { failures.push(name); console.log(`FAIL ${name}: ${error.message}`); }
    };
    const evaluate = (p = provider(), h = history(), options = {}) =>
        api.evaluate(input(p), h, { now: NOW, inputSource: 'TEST_input.json', ...options });
    const report = (...args) => evaluate(...args).reports.find(item => item.provider === 'claude');
    const unknown = r => {
        assert.equal(r.target, null); assert.equal(r.action, 'UNKNOWN');
        assert.equal(r.effectiveAction, 'UNKNOWN'); assert.equal(r.surge, false);
    };

    for (const [ratio, action] of [[0, 'ACCELERATE-2'], [0.499999, 'ACCELERATE-2'],
        [0.5, 'ACCELERATE-1'], [0.899999, 'ACCELERATE-1'], [0.9, 'HOLD'], [1, 'HOLD'],
        [1.1, 'HOLD'], [1.100001, 'THROTTLE-1'], [1.5, 'THROTTLE-1'], [1.500001, 'THROTTLE-2']]) {
        test(`band_${ratio}`, () => assert.equal(api.classify(ratio), action));
    }
    for (const value of [null, undefined, NaN, Infinity, -1, '1']) {
        test(`band_invalid_${String(value)}`, () => assert.equal(api.classify(value), 'UNKNOWN'));
    }
    // The ratio remains authoritative even when the clock qualifies for SURGE.
    test('surge_cannot_override_high_ratio', () => {
        const r = report(provider(), history(90));
        assert.equal(r.target, 10); assert.equal(r.measured, 40);
        assert.equal(r.ratio, 4); assert.equal(r.action, 'THROTTLE-2'); assert.equal(r.surge, false);
        assert.equal(r.dispatch, 'DENY'); assert.doesNotMatch(api.format(r), /\[SURGE\]/);
    });
    test('bounded_dispatch_suppresses_surge', () => {
        const r = report(provider(), history(62));
        assert.equal(r.ratio, 1.2); assert.equal(r.action, 'THROTTLE-1');
        assert.equal(r.dispatch, 'BOUNDED_TASKS'); assert.equal(r.surge, false);
        assert.doesNotMatch(api.format(r), /\[SURGE\]/);
    });
    const ordinary = remaining => provider(remaining, { windows: [
        { id: 'five-hour', remainingPct: remaining, resetAt: at(4), durationHours: 5 }] });
    const shortHistory = remaining => history(remaining, at(-1), { window: 'five-hour', resetAt: at(4), durationHours: 5 });
    test('measured_target_ratio', () => {
        const r = report(ordinary(40), shortHistory(50));
        assert.equal(r.measured, 10); assert.equal(r.target, 10); assert.equal(r.ratio, 1);
        assert.equal(r.action, 'HOLD'); assert.equal(r.surge, false);
        assert.deepEqual(r.measurement, { from: at(-1), to: NOW });
    });
    for (const [used, action] of [[0.5, 'ACCELERATE-1'], [0.9, 'HOLD'], [1.1, 'HOLD'], [1.5, 'THROTTLE-1']]) {
        test(`decimal_pipeline_boundary_${used}`, () => {
            const p = provider(); p.windows[0].resetAt = at(50);
            const h = history(50 + used, at(-1), { resetAt: at(50) });
            const r = report(p, h);
            assert.equal(r.action, action);
        });
    }
    for (const [used, action] of [[0, 'ACCELERATE-2'], [6, 'ACCELERATE-1'], [10, 'HOLD'],
        [12, 'THROTTLE-1'], [20, 'THROTTLE-2']]) {
        test(`pipeline_band_${used}`, () => assert.equal(report(ordinary(40), shortHistory(40 + used)).action, action));
    }
    test('zero_remaining_exhausted_no_nan', () => {
        const r = report(ordinary(0), shortHistory(10));
        assert.equal(r.target, 0); assert.equal(r.ratio, null);
        assert.equal(r.action, 'UNKNOWN'); assert.equal(r.dispatch, 'DENY');
        assert.equal(r.effectiveAction, 'UNKNOWN'); assert.equal(r.surge, false);
        assert.doesNotMatch(api.format(r), /NaN|Infinity/);
    });
    test('missing_reset_unknown', () => {
        const p = provider(); delete p.windows[0].resetAt;
        const r = report(p); unknown(r); assert.equal(r.remainingPct, 50);
    });
    test('zero_without_reset_unknown', () => {
        const p = provider(0); p.windows[0].resetAt = null; unknown(report(p));
    });
    for (const value of [null, 'UNKNOWN', '--', '2026-09-30T17:00', '2026-02-30T17:00Z', NOW, at(-1)]) {
        test(`invalid_reset_${value}`, () => {
            const p = provider(); p.windows[0].resetAt = value; unknown(report(p));
        });
    }
    for (const value of [null, '50', -1, 101, NaN, Infinity, undefined]) {
        test(`invalid_remaining_${String(value)}`, () => {
            const p = provider(); p.windows[0].remainingPct = value; unknown(report(p));
        });
    }
    test('stale_reading_rejected', () => {
        const result = evaluate(provider(50, { lastChecked: at(-0.500001) }), api.emptyHistory());
        const r = result.reports.find(item => item.provider === 'claude');
        unknown(r); assert.equal(r.remainingPct, null); assert.equal(r.source, 'UNKNOWN');
        assert.equal(result.history.samples.length, 0);
    });
    test('exactly_30_minutes_fresh', () => assert.equal(report(provider(50, { lastChecked: at(-0.5) })).target, 10));
    for (const value of [at(0.01), null, '2026-09-30 12:00:00', 'UNKNOWN']) {
        test(`invalid_observation_${value}`, () => unknown(report(provider(50, { lastChecked: value }))));
    }
    for (const precision of ['SESSION_ONLY', 'PROVIDER_STATE_ONLY', 'ESTIMATE', 'UNAVAILABLE', null, undefined]) {
        test(`ungrounded_precision_${precision}`, () => {
            const r = report(provider(50, { precision, state: 'AVAILABLE', measured: 1, target: 1, sessionTokensUsed: 1234 }));
            unknown(r); assert.equal(r.measured, null); assert.equal(r.remainingPct, null);
        });
    }
    const invalidSources = ['', 'UNKNOWN', 'unknown', ' UnKnOwN ', '--', ' - - ', 'N/A', 'n/a', ' N / a ', 'bad\nPACE spoof', null];
    for (const source of invalidSources) {
        test(`ungrounded_source_${JSON.stringify(source)}`, () => unknown(report(provider(50, { source }))));
        test(`history_source_${JSON.stringify(source)}_rejected`, () => {
            const h = history(); h.samples[0].source = source;
            assert.throws(() => evaluate(provider(), h), /invalid history sample/);
        });
    }
    test('session_scope_rejected', () => unknown(report(provider(50, { scope: 'session' }))));
    test('unverified_rejected', () => unknown(report(provider(50, { verified: false }))));
    test('verified_boolean_true_accepted', () => assert.equal(report(provider(50, { verified: true })).target, 10));
    for (const verified of ['false', 'true', null, 0, 1, {}, [], undefined]) {
        test(`non_boolean_verified_${JSON.stringify(verified)}_rejected`, () => {
            unknown(report(provider(50, { verified })));
            const p = provider(); p.windows[0].verified = verified;
            unknown(report(p));
            const h = history(); h.samples[0].verified = verified;
            assert.throws(() => evaluate(provider(), h), /invalid history sample/);
        });
    }
    test('top_level_timestamp_does_not_refresh_snapshot', () => {
        const data = input(provider(50, { lastChecked: at(-1) })); data.generatedAt = NOW;
        unknown(api.evaluate(data, api.emptyHistory(), { now: NOW }).reports.find(item => item.provider === 'claude'));
    });
    test('weekly_precedes_shortest', () => {
        const p = provider(); p.windows.unshift({ id: 'five-hour', remainingPct: 80, resetAt: at(2), durationHours: 5 });
        const r = report(p); assert.equal(r.window, 'weekly'); assert.equal(r.remainingPct, 50); assert.equal(r.target, 10);
    });
    test('unknown_weekly_does_not_fallback', () => {
        const p = provider(); p.windows[0].resetAt = null;
        p.windows.push({ id: 'five-hour', remainingPct: 80, resetAt: at(2), durationHours: 5 });
        unknown(report(p));
    });
    for (const [problem, overrides, reason] of [
        ['stale', { lastChecked: at(-0.500001) }, /stale reading/],
        ['missing_reset', { resetAt: null }, /reset UNKNOWN/],
        ['missing_quota', { remainingPct: null }, /remaining quota UNKNOWN/],
        ['missing_duration', { durationHours: null }, /window duration UNKNOWN/],
        ['unverified', { verified: 'false' }, /account evidence UNKNOWN/]
    ]) {
        test(`rejected_sibling_${problem}_exposed`, () => {
            const p = provider(); p.windows.push({ id: 'five-hour', remainingPct: 80,
                resetAt: at(2), durationHours: 5, ...overrides });
            const result = evaluate(p, history(50), { expectedCostPct: 1 });
            const r = result.reports.find(item => item.provider === 'claude');
            assert.equal(r.action, 'ACCELERATE-2'); assert.equal(r.window, 'weekly');
            assert.equal(r.scope, 'binding-window'); assert.equal(r.dispatch, 'UNKNOWN');
            assert.equal(r.surge, false);
            const sibling = r.windows.find(item => item.window === 'five-hour');
            assert.equal(sibling.status, 'UNKNOWN'); assert.match(sibling.reason, reason);
            assert.ok(!result.history.samples.some(item => item.window === 'five-hour'));
            const line = api.format(r);
            assert.match(line, /^PACE claude window weekly /);
            assert.match(line, /five-hour UNKNOWN/); assert.match(line, reason);
            assert.match(line, /provider-wide advice UNKNOWN/); assert.doesNotMatch(line, /\[SURGE\]/);
        });
    }
    test('siblings_exposed_when_binding_selection_fails', () => {
        const p = ordinary(40); p.windows.push({ id: 'daily', remainingPct: 90, resetAt: at(20) });
        const r = report(p, shortHistory(40)); unknown(r);
        assert.equal(r.windows.find(item => item.window === 'daily').status, 'UNKNOWN');
        assert.match(api.format(r), /daily UNKNOWN \(window duration UNKNOWN/);
    });
    test('declared_weekly_missing', () => unknown(report({ ...ordinary(40), hasWeeklyWindow: true })));
    test('shortest_without_weekly', () => {
        const p = ordinary(40); p.windows.unshift({ id: 'daily', remainingPct: 90, resetAt: at(20), durationHours: 24 });
        assert.equal(report(p, shortHistory(50)).window, 'five-hour');
    });
    test('unknown_duration_blocks_shortest_guess', () => {
        const p = ordinary(40); p.windows.push({ id: 'unknown', remainingPct: 90, resetAt: at(20) });
        unknown(report(p));
    });
    test('legacy_exact_provider_input', () => {
        const p = provider(); delete p.windows;
        Object.assign(p, { remainingWeeklyPct: 50, weeklyReset: RESET, remainingFiveHourPct: 80, fiveHourReset: at(2) });
        assert.equal(report(p).target, 10); assert.equal(report(p).window, 'weekly');
    });
    test('legacy_null_weekly_is_unknown', () => {
        const p = provider(); delete p.windows;
        Object.assign(p, { remainingWeeklyPct: null, weeklyReset: null, remainingFiveHourPct: 40, fiveHourReset: at(4) });
        unknown(report(p)); p.hasWeeklyWindow = false;
        assert.equal(report(p, shortHistory(50)).action, 'HOLD');
    });
    test('duplicate_windows_rejected', () => {
        const p = provider(); p.windows.push(clone(p.windows[0])); unknown(report(p));
    });
    test('contradictory_weekly_rejected', () => unknown(report(provider(50, { hasWeeklyWindow: false }))));
    test('inconsistent_duration_rejected', () => {
        const p = ordinary(40); p.windows[0].resetAt = at(6); unknown(report(p));
    });
    test('short_window_exhaustion_blocks_weekly_surge', () => {
        const p = provider(); p.windows.push({ id: 'five-hour', remainingPct: 0, resetAt: at(2), durationHours: 5 });
        const r = report(p, history(50)); assert.equal(r.action, 'ACCELERATE-2'); assert.equal(r.dispatch, 'DENY');
        assert.equal(r.surge, false); assert.doesNotMatch(api.format(r), /\[SURGE\]/);
        assert.match(r.source, /five-hour/); assert.match(r.reasons.join('; '), /five-hour quota exhausted/);
    });
    test('surge_exact_10_percent_time', () => {
        const { p, h, options } = surgeFixture(0);
        const r = report(p, h, options);
        assert.equal(r.target, 22); assert.equal(r.measured, 0); assert.equal(r.ratio, 0);
        assert.equal(r.action, 'ACCELERATE-2'); assert.equal(r.effectiveAction, 'ACCELERATE-2');
        assert.equal(r.surge, true); assert.equal(r.dispatch, 'WITHIN_BINDING_QUOTA');
        assert.match(api.format(r), /\[SURGE\]/);
    });
    for (const [ratio, action] of [[0.75, 'ACCELERATE-1'], [0.95, 'HOLD'], [0.999999, 'HOLD']]) {
        test(`surge_promotes_effective_${ratio}`, () => {
            const { p, h, options } = surgeFixture(ratio);
            const r = report(p, h, options);
            assert.equal(r.target, 22); assert.ok(Math.abs(r.measured - ratio * 22) < 1e-12);
            assert.equal(r.ratio, ratio); assert.equal(r.action, action);
            assert.deepEqual(r.measurement, { from: at(-1), to: NOW });
            assert.equal(r.surge, true); assert.equal(r.effectiveAction, 'ACCELERATE-2');
            assert.equal(r.dispatch, 'WITHIN_BINDING_QUOTA');
            const line = api.format(r);
            assert.equal(/->\s*([A-Z0-9-]+)/.exec(line)[1], action);
            assert.ok(line.includes(`-> ${action} [effective: ACCELERATE-2] [source: `));
            assert.match(line, /\[scope: binding-window\] \[dispatch: WITHIN_BINDING_QUOTA\]/);
            assert.match(line, /\[SURGE\]/);
        });
    }
    for (const [ratio, action, dispatch] of [[1, 'HOLD', 'WITHIN_BINDING_QUOTA'],
        [1.05, 'HOLD', 'WITHIN_BINDING_QUOTA'], [1.2, 'THROTTLE-1', 'BOUNDED_TASKS'], [2, 'THROTTLE-2', 'DENY']]) {
        test(`surge_no_escalation_${ratio}`, () => {
            const { p, h, options } = surgeFixture(ratio);
            const r = report(p, h, options);
            assert.equal(r.target, 22); assert.equal(r.ratio, ratio); assert.equal(r.action, action);
            assert.equal(r.surge, false); assert.equal(r.effectiveAction, action); assert.equal(r.dispatch, dispatch);
            assert.doesNotMatch(api.format(r), /\[SURGE\]/);
        });
    }
    for (const kind of ['missing', 'mismatched_reset', 'partial_hour', 'quota_correction']) {
        test(`surge_unknown_history_${kind}`, () => {
            const { p, h, options } = surgeFixture(0.75);
            if (kind === 'missing') h.samples = [];
            if (kind === 'mismatched_reset') h.samples[0].resetAt = at(4);
            if (kind === 'partial_hour') h.samples[0].observedAt = h.samples[0].capturedAt = at(-0.5);
            if (kind === 'quota_correction') h.samples[0].remainingPct = 10;
            const r = report(p, h, options);
            assert.equal(r.target, 22); assert.equal(r.measured, null); assert.equal(r.ratio, null);
            assert.equal(r.action, 'UNKNOWN'); assert.equal(r.effectiveAction, 'UNKNOWN');
            assert.equal(r.surge, false); assert.equal(r.dispatch, 'UNKNOWN');
            assert.doesNotMatch(api.format(r), /\[SURGE\]/);
        });
    }
    for (const [guard, dispatch] of [['exhaustion', 'DENY'], ['over_budget', 'DENY'],
        ['rejected_sibling', 'UNKNOWN'], ['low_quota', 'BOUNDED_TASKS']]) {
        test(`surge_under_target_guard_${guard}`, () => {
            const { p, h, options } = surgeFixture(0.75, guard === 'low_quota' ? 10 : 11);
            if (guard === 'exhaustion' || guard === 'rejected_sibling') {
                p.windows.push({ id: 'daily', remainingPct: 0, resetAt: at(2), durationHours: 24,
                    ...(guard === 'rejected_sibling' ? { lastChecked: at(-0.500001) } : {}) });
            }
            if (guard === 'over_budget') options.expectedCostPct = 12;
            const r = report(p, h, options);
            assert.equal(r.window, 'five-hour'); assert.equal(r.ratio, 0.75);
            assert.equal(r.action, 'ACCELERATE-1'); assert.equal(r.dispatch, dispatch);
            assert.equal(r.surge, false); assert.equal(r.effectiveAction, 'ACCELERATE-1');
            assert.doesNotMatch(api.format(r), /\[SURGE\]/);
        });
    }
    test('surge_not_above_10_percent_time', () => {
        const { p, h, options } = surgeFixture(0.75, 11, 0.500001);
        const r = report(p, h, options);
        assert.equal(r.ratio, 0.75); assert.equal(r.action, 'ACCELERATE-1');
        assert.equal(r.effectiveAction, 'ACCELERATE-1'); assert.equal(r.surge, false);
    });
    test('surge_needs_more_than_10_percent_left', () => {
        const { p, h, options } = surgeFixture(0.75, 10);
        const r = report(p, h, options);
        assert.equal(r.ratio, 0.75); assert.equal(r.action, 'ACCELERATE-1');
        assert.equal(r.effectiveAction, 'ACCELERATE-1'); assert.equal(r.surge, false);
    });
    test('low_quota_bounded', () => {
        const r = report(ordinary(8), shortHistory(8));
        assert.equal(r.remainingPct, 8); assert.equal(r.target, 2); assert.equal(r.measured, 0);
        assert.equal(r.ratio, 0); assert.equal(r.action, 'ACCELERATE-2');
        assert.equal(r.dispatch, 'BOUNDED_TASKS'); assert.equal(r.surge, false);
        assert.match(api.format(r), /-> ACCELERATE-2.*dispatch: BOUNDED_TASKS/);
    });
    for (const [ratio, action] of [[0, 'ACCELERATE-2'], [0.5, 'ACCELERATE-1'], [0.9, 'HOLD'],
        [1.1, 'HOLD'], [1.5, 'THROTTLE-1'], [2, 'THROTTLE-2']]) {
        test(`low_quota_band_${ratio}`, () => {
            const r = report(ordinary(8), shortHistory(8 + ratio * 2));
            assert.equal(r.ratio, ratio); assert.equal(r.action, action);
            assert.equal(r.dispatch, ratio > 1.5 ? 'DENY' : 'BOUNDED_TASKS');
        });
        test(`denied_cost_preserves_band_${ratio}`, () => {
            const r = report(ordinary(40), shortHistory(40 + ratio * 10), { expectedCostPct: 41 });
            assert.equal(r.ratio, ratio); assert.equal(r.action, action);
            assert.equal(r.dispatch, 'DENY'); assert.equal(r.surge, false);
        });
    }
    test('expected_cost_exceeds_remaining_blocks_surge', () => {
        const { p, h } = surgeFixture(0.95);
        const r = report(p, h, { expectedCostPct: 12 });
        assert.equal(r.ratio, 0.95); assert.equal(r.action, 'HOLD'); assert.equal(r.dispatch, 'DENY');
        assert.equal(r.effectiveAction, 'HOLD');
        assert.equal(r.surge, false); assert.doesNotMatch(api.format(r), /\[SURGE\]/);
    });
    test('expected_cost_equal_quota', () => assert.equal(report(provider(), history(), { expectedCostPct: 50 }).dispatch, 'WITHIN_BINDING_QUOTA'));
    test('cost_does_not_supply_missing_measurement', () => assert.equal(report(ordinary(40), api.emptyHistory(), { expectedCostPct: 10 }).action, 'UNKNOWN'));
    test('cold_start_unknown_rate', () => {
        const r = report(ordinary(40), api.emptyHistory());
        assert.equal(r.target, 10); assert.equal(r.measured, null); assert.equal(r.action, 'UNKNOWN');
    });
    test('reset_cycle_not_mixed', () => {
        const h = shortHistory(80); h.samples[0].resetAt = at(3);
        assert.equal(report(ordinary(40), h).measured, null);
    });
    test('account_not_mixed', () => {
        const h = shortHistory(80); h.samples[0].accountId = 'TEST_other';
        assert.equal(report(ordinary(40), h).measured, null);
    });
    test('provider_not_mixed', () => {
        const h = shortHistory(80); h.samples[0].provider = 'grok';
        assert.equal(report(ordinary(40), h).measured, null);
    });
    test('quota_increase_unknown', () => assert.equal(report(ordinary(40), shortHistory(30)).measured, null));
    test('intermediate_quota_correction_unknown', () => {
        const h = shortHistory(80);
        h.samples.push({ ...h.samples[0], remainingPct: 30, observedAt: at(-0.5), capturedAt: at(-0.5) });
        assert.equal(report(ordinary(40), h).measured, null);
    });
    test('no_partial_hour_extrapolation', () => {
        const h = history(60, at(-0.25)); assert.equal(report(provider(), h).measured, null);
    });
    test('no_interpolation', () => {
        const h = history(70, at(-1.1));
        h.samples.push({ ...h.samples[0], remainingPct: 65, observedAt: at(-0.9), capturedAt: at(-0.9) });
        assert.equal(report(provider(), h).measured, null);
    });
    test('flat_boundary_is_observed', () => {
        const h = history(70, at(-1.1));
        h.samples.push({ ...h.samples[0], observedAt: at(-0.9), capturedAt: at(-0.9) });
        const r = report(provider(), h); assert.equal(r.measured, 20);
        assert.match(r.source, /TEST_history/); assert.match(r.source, /TEST_input/);
    });
    test('repeated_poll_is_not_usage', () => {
        const first = evaluate(ordinary(40), shortHistory(50));
        const second = evaluate(ordinary(40), first.history);
        assert.deepEqual(second.history, first.history);
        assert.equal(second.reports.find(item => item.provider === 'claude').measured, 10);
    });
    test('out_of_order_snapshot_unknown', () => {
        const h = shortHistory(50); h.samples.push({ ...h.samples[0], remainingPct: 35, observedAt: at(0.1), capturedAt: at(0.1) });
        assert.equal(report(ordinary(40), h).measured, null);
    });
    test('same_timestamp_conflict_unknown', () => {
        const h = shortHistory(50); h.samples.push({ ...h.samples[0], remainingPct: 49 });
        assert.equal(report(ordinary(40), h).measured, null);
    });
    for (const spelling of ['2026-09-30T11:00:00Z', '2026-09-30T11:00Z', '2026-09-30T06:00:00-05:00',
        '2026-09-30T13:00:00+02:00']) {
        test(`same_instant_conflict_${spelling}`, () => {
            const h = shortHistory(80);
            h.samples[0].observedAt = spelling; h.samples[0].capturedAt = spelling;
            h.samples.push({ ...h.samples[0], remainingPct: 40, observedAt: at(-1), capturedAt: at(-1) });
            const r = report(ordinary(40), h);
            assert.equal(r.measured, null); assert.equal(r.ratio, null); assert.equal(r.action, 'UNKNOWN');
            assert.match(r.reasons.join('; '), /conflicting history/);
        });
    }
    test('boundary_conflict_not_hidden_by_duplicate_tail', () => {
        const h = shortHistory(80);
        h.samples.push({ ...h.samples[0], remainingPct: 40 }, { ...h.samples[0], remainingPct: 40 });
        assert.equal(report(ordinary(40), h).measured, null);
    });
    test('equivalent_reset_instant_measures_same_window', () => {
        const h = shortHistory(50); h.samples[0].resetAt = '2026-09-30T11:00:00-05:00';
        const r = report(ordinary(40), h); assert.equal(r.measured, 10); assert.equal(r.action, 'HOLD');
    });
    test('equivalent_instants_deduplicate_and_canonicalize', () => {
        const h = shortHistory(50);
        h.samples.push({ ...h.samples[0], observedAt: '2026-09-30T06:00:00-05:00',
            capturedAt: '2026-09-30T11:00Z', resetAt: '2026-09-30T16:00:00Z' });
        const result = evaluate(ordinary(40), h);
        assert.equal(result.history.samples.length, 2);
        assert.equal(result.history.samples[0].observedAt, at(-1));
        assert.equal(result.history.samples[0].capturedAt, at(-1));
        assert.equal(result.history.samples[0].resetAt, at(4));
        const repeated = evaluate(ordinary(40), result.history);
        assert.deepEqual(repeated.history, result.history);
    });
    test('canonicalization_preserves_conflicting_values_across_polls', () => {
        const h = shortHistory(80);
        h.samples.push({ ...h.samples[0], remainingPct: 40, observedAt: '2026-09-30T11:00:00Z' });
        const first = evaluate(ordinary(40), h);
        assert.deepEqual(first.history.samples.filter(item => item.observedAt === at(-1)).map(item => item.remainingPct), [80, 40]);
        assert.equal(report(ordinary(40), first.history).measured, null);
    });
    test('history_pruned_and_versioned', () => {
        const h = history(70, at(-3)); const result = evaluate(provider(), h);
        assert.equal(result.history.version, 1); assert.equal(result.history.samples.length, 1);
        assert.equal(result.history.samples[0].observedAt, NOW);
    });
    test('all_five_providers_reported_missing_as_unknown', () => {
        const reports = evaluate().reports;
        assert.deepEqual(reports.map(r => r.provider), ['gemini', 'claude', 'grok', 'codex']);
        for (const r of reports.filter(r => r.provider !== 'claude')) {
            unknown(r); assert.match(api.format(r), /\[source: UNKNOWN\]/);
        }
    });
    test('format_numeric_line_cites_both_endpoints', () => {
        const line = api.format(report(ordinary(40), shortHistory(50)));
        assert.match(line, /^PACE claude window five-hour rem 40% reset 2026-09-30T16:00:00.000Z used\/h 10 target\/h 10 -> HOLD \[effective: HOLD\] \[source: /);
        assert.match(line, /TEST_history @ 2026-09-30T11:00:00.000Z/);
        assert.match(line, /TEST_account_usage @ 2026-09-30T12:00:00.000Z/);
    });
    test('format_unknown_never_zero', () => {
        const line = api.format(report(provider(50, { precision: 'SESSION_ONLY' })));
        assert.match(line, /rem UNKNOWN reset UNKNOWN used\/h UNKNOWN target\/h UNKNOWN -> UNKNOWN/);
        assert.match(line, /\[effective: UNKNOWN\]/);
    });
    test('utc_normalizes_minutes_and_fraction', () => {
        assert.equal(api.utc('2026-09-30T12:00Z'), Date.parse(NOW));
        assert.equal(api.utc('2026-09-30T12:00:00.1Z'), Date.parse(NOW) + 100);
    });
    test('utc_explicit_offsets_only', () => {
        assert.equal(api.utc('2026-09-30T07:00:00-05:00'), Date.parse(NOW));
        assert.equal(api.utc('2026-09-30T14:00:00+02:00'), Date.parse(NOW));
        for (const invalid of ['2026-02-30T07:00:00-05:00', '2026-09-30T12:00:00',
            '2026-09-30T12:00:00+24:00', '2026-09-30T12:00:00+00:60']) assert.equal(api.utc(invalid), null);
    });
    test('history_schema_rejected', () => assert.throws(() => evaluate(provider(), { version: 2, samples: [] }), /history/));
    test('history_bad_sample_rejected', () => {
        const h = history(); h.samples[0].remainingPct = '60'; assert.throws(() => evaluate(provider(), h), /history/);
    });
    test('stale_capture_cannot_be_history', () => {
        const h = history(); h.samples[0].capturedAt = NOW; assert.throws(() => evaluate(provider(), h), /history/);
    });
    test('unknown_history_source_rejected', () => {
        const h = history(); h.samples[0].source = 'UNKNOWN'; assert.throws(() => evaluate(provider(), h), /history/);
    });
    test('invalid_input_throws', () => assert.throws(() => api.evaluate([], api.emptyHistory(), { now: NOW }), /providers/));
    test('invalid_now_throws', () => assert.throws(() => evaluate(provider(), history(), { now: 'bad' }), /UTC/));
    test('invalid_cost_throws', () => assert.throws(() => evaluate(provider(), history(), { expectedCostPct: -1 }), /cost/));
    test('does_not_mutate_inputs', () => {
        const p = provider(), h = history(), before = JSON.stringify([p, h]);
        evaluate(p, h); assert.equal(JSON.stringify([p, h]), before);
    });

    if (integration) {
        const scratchRoot = path.join(LANE, '.local');
        fs.mkdirSync(scratchRoot, { recursive: true });
        const scratch = fs.mkdtempSync(path.join(scratchRoot, 'test-'));
        const usagePath = path.join(scratch, 'usage.json');
        const historyPath = path.join(scratch, 'history.json');
        const cliFile = cliSource === null ? PACE_FILE : path.join(scratch, 'pace-mutant.js');
        const write = (file, data) => fs.writeFileSync(file, JSON.stringify(data));
        const cli = (args = [], stdin) => spawnSync(process.execPath, [cliFile, '--input', usagePath,
            '--history', historyPath, '--now', NOW, ...args], { encoding: 'utf8', timeout: 10000, input: stdin, windowsHide: true });
        try {
            if (cliSource !== null) fs.writeFileSync(cliFile, cliSource);
            test('cli_two_foreground_polls_persist_history', () => {
                const p = ordinary(50); p.lastChecked = at(-1); write(usagePath, input(p));
                const first = spawnSync(process.execPath, [cliFile, '--input', usagePath, '--history', historyPath,
                    '--now', at(-1)], { encoding: 'utf8', timeout: 10000, windowsHide: true });
                assert.equal(first.status, 0, first.stderr);
                write(usagePath, input(ordinary(40)));
                const second = cli(['--json']); assert.equal(second.status, 0, second.stderr);
                assert.equal(JSON.parse(second.stdout).reports.find(r => r.provider === 'claude').action, 'HOLD');
                assert.equal(JSON.parse(fs.readFileSync(historyPath, 'utf8')).samples.length, 2);
                assert.ok(!fs.readdirSync(scratch).some(name => name.endsWith('.tmp')));
            });
            test('cli_read_only_preserves_history', () => {
                const before = fs.readFileSync(historyPath, 'utf8');
                const result = cli(['--read-only']); assert.equal(result.status, 0, result.stderr);
                assert.equal(fs.readFileSync(historyPath, 'utf8'), before);
                assert.match(result.stdout, /PACE codex window UNKNOWN rem UNKNOWN/);
            });
            test('cli_stdin_json', () => {
                const result = spawnSync(process.execPath, [cliFile, '--input', '-', '--history', historyPath,
                    '--now', NOW, '--read-only'], { encoding: 'utf8', input: JSON.stringify(input(ordinary(40))), timeout: 10000, windowsHide: true });
                assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /source:.*stdin#/);
            });
            test('cli_surge_actions_and_dispatch_separate', () => {
                const { p, h } = surgeFixture(0.95);
                write(usagePath, input(p)); write(historyPath, h);
                const result = cli(['--json', '--read-only', '--expected-cost-pct', '1']);
                assert.equal(result.status, 0, result.stderr);
                const reports = JSON.parse(result.stdout).reports;
                const r = reports.find(item => item.provider === 'claude');
                assert.equal(r.action, 'HOLD'); assert.equal(r.effectiveAction, 'ACCELERATE-2');
                assert.equal(r.dispatch, 'WITHIN_BINDING_QUOTA'); assert.equal(r.surge, true);
                for (const missing of reports.filter(item => item.provider !== 'claude')) unknown(missing);
                const text = cli(['--read-only', '--expected-cost-pct', '1']);
                assert.equal(text.status, 0, text.stderr);
                assert.match(text.stdout, /-> HOLD \[effective: ACCELERATE-2\] \[source: .*\[scope: binding-window\] \[dispatch: WITHIN_BINDING_QUOTA\].*\[SURGE\]/);
            });
            test('cli_bad_input_fails_preserves_history', () => {
                const before = fs.readFileSync(historyPath, 'utf8'); fs.writeFileSync(usagePath, 'broken JSON');
                const result = cli(); assert.equal(result.status, 1); assert.match(result.stderr, /PACE ERROR/);
                assert.equal(result.stdout, ''); assert.equal(fs.readFileSync(historyPath, 'utf8'), before);
            });
            test('cli_corrupt_history_fails_without_overwrite', () => {
                write(usagePath, input()); fs.writeFileSync(historyPath, 'broken history');
                const result = cli(); assert.equal(result.status, 1); assert.equal(result.stdout, '');
                assert.equal(fs.readFileSync(historyPath, 'utf8'), 'broken history');
            });
            test('cli_missing_input_fails', () => {
                fs.unlinkSync(usagePath); const result = cli(); assert.equal(result.status, 1); assert.match(result.stderr, /ENOENT/);
            });
            test('cli_unknown_option_fails', () => {
                write(usagePath, input(ordinary(40))); write(historyPath, shortHistory(50));
                const valid = cli(['--read-only']); assert.equal(valid.status, 0, valid.stderr);
                const result = cli(['--read-only', '--mutant', 'wrong-band']);
                assert.equal(result.status, 1);
                assert.equal(result.stderr.trim(), 'PACE ERROR: unknown option or missing value: --mutant');
                assert.equal(result.stdout, '');
            });
            test('cli_invalid_expected_cost_fails', () => {
                write(usagePath, input(ordinary(40))); write(historyPath, shortHistory(50));
                const valid = cli(['--read-only', '--expected-cost-pct', '1']); assert.equal(valid.status, 0, valid.stderr);
                // Blank/hex/exponent spellings would coerce to valid numbers if
                // lexical rejection disappeared; NaN alone has a second guard.
                for (const cost of ['NaN', '', '0x10', '1e1', '-1', '101']) {
                    const result = cli(['--read-only', '--expected-cost-pct', cost]);
                    assert.equal(result.status, 1, `cost ${JSON.stringify(cost)} must fail`);
                    assert.equal(result.stderr.trim(), 'PACE ERROR: invalid expected cost percent');
                    assert.equal(result.stdout, '');
                }
            });
            test('cli_input_history_collision_fails', () => {
                const result = spawnSync(process.execPath, [cliFile, '--input', historyPath, '--history', historyPath],
                    { encoding: 'utf8', timeout: 10000, windowsHide: true });
                assert.equal(result.status, 1); assert.match(result.stderr, /separate files/);
            });
        } finally {
            // Remove only this invocation's resolved scratch directory, inside
            // the lane's allowed .local root. Never touch another run's files.
            const resolved = path.resolve(scratch);
            assert.ok(resolved.startsWith(path.resolve(scratchRoot) + path.sep));
            fs.rmSync(resolved, { recursive: true });
        }
    }
    console.log(`RESULT: ${passed} passed, ${failures.length} failed`);
    return { passed, failures };
}

// Mutants use an in-memory module, plus a lane-local scratch copy for CLI
// mutants. The production CLI has no mutant switches or source rewrites.
const MUTANTS = {
    'wrong-band': { from: "if (ratio < 0.5) return 'ACCELERATE-2';", to: "if (ratio < 0.5) return 'HOLD';", check: 'band_0' },
    'missing-reset': { from: 'const resetAt = utc(raw.resetAt);', to: 'const resetAt = utc(raw.resetAt) ?? now + 5 * HOUR;', check: 'missing_reset_unknown' },
    'stale-reading': { from: 'now - observedAt > MAX_AGE', to: 'false', check: 'stale_reading_rejected' },
    'ungrounded-estimate': { from: "raw.precision === 'EXACT_PROVIDER'", to: 'true', check: 'ungrounded_precision_SESSION_ONLY' },
    'wrong-window': { from: 'if (weekly) return weekly;', to: 'if (weekly && windows.length === 1) return weekly;', check: 'weekly_precedes_shortest' },
    'wrong-target': { from: 'current.remainingPct / hoursLeft', to: 'hoursLeft / current.remainingPct', check: 'measured_target_ratio' },
    'wrong-measured': { from: 'base.remainingPct - current.remainingPct', to: '0', check: 'measured_target_ratio' },
    'no-surge': { from: 'report.surge = hoursLeft <= current.durationHours * 0.1 && current.remainingPct > 10 &&',
        to: 'report.surge = false &&', check: 'surge_exact_10_percent_time' },
    'no-effective-surge': { from: "report.effectiveAction = report.surge ? 'ACCELERATE-2' : report.action;",
        to: 'report.effectiveAction = report.action;',
        check: ['surge_promotes_effective_0.75', 'surge_promotes_effective_0.95', 'surge_promotes_effective_0.999999'] },
    'mix-reset': { from: 'a.resetAt === b.resetAt && a.durationHours === b.durationHours', to: 'a.durationHours === b.durationHours', check: 'reset_cycle_not_mixed' },
    'raw-history-times': { from: 'history = validateHistory(history);', to: 'validateHistory(history);',
        check: 'same_instant_conflict_2026-09-30T11:00:00Z' },
    'hidden-boundary-conflict': { from: 'while (first > 0 && ordered[first - 1].observedAt === ordered[first].observedAt) first--;',
        to: '/* do not expand same-time group */', check: 'boundary_conflict_not_hidden_by_duplicate_tail' },
    'truthy-verified': { from: "!('verified' in value) || value.verified === true", to: 'value.verified !== false',
        check: 'non_boolean_verified_"false"_rejected' },
    'placeholder-history-source': { from: '!sourceLabel(sample.source)', to: '!label(sample.source)',
        check: 'history_source_"n/a"_rejected' },
    'low-overrides-band': { from: "report.dispatch = 'BOUNDED_TASKS';", to: "report.dispatch = 'BOUNDED_TASKS'; report.action = 'THROTTLE-1';",
        check: 'low_quota_bounded' },
    'surge-overrides-band': { from: 'report.action = classify(report.ratio);',
        to: "report.action = hoursLeft <= current.durationHours * 0.1 && current.remainingPct > 10 ? 'ACCELERATE-2' : classify(report.ratio);",
        check: 'surge_cannot_override_high_ratio' },
    'denied-surge': { from: "if (report.dispatch === 'DENY' || report.dispatch === 'BOUNDED_TASKS' || rejectedSiblings.length) report.surge = false;",
        to: '/* leave SURGE unqualified */', check: 'expected_cost_exceeds_remaining_blocks_surge' },
    'ignored-bounded-dispatch': { from: "lowQuota || report.action === 'THROTTLE-1'", to: 'lowQuota', check: 'bounded_dispatch_suppresses_surge' },
    'hidden-sibling': { from: "status: item.reason ? 'UNKNOWN' : 'KNOWN'", to: "status: 'KNOWN'", check: 'rejected_sibling_stale_exposed' },
    'ignore-sibling-restriction': { from: "if ((report.action === 'UNKNOWN' || rejectedSiblings.length) && report.dispatch !== 'DENY') report.dispatch = 'UNKNOWN';",
        to: "if (report.action === 'UNKNOWN' && report.dispatch !== 'DENY') report.dispatch = 'UNKNOWN';", check: 'rejected_sibling_stale_exposed' },
    'cli-accept-unknown-option': { from: 'else throw new Error(`unknown option or missing value: ${arg}`);',
        to: 'else { /* silently ignore unsupported options */ }', check: 'cli_unknown_option_fails', cli: true },
    'cli-accept-invalid-cost': { from: "if (!/^(?:\\d+(?:\\.\\d+)?|\\.\\d+)$/.test(options.expectedCostPct)) throw new Error('invalid expected cost percent');",
        to: '/* omit CLI cost spelling validation */', check: 'cli_invalid_expected_cost_fails', cli: true }
};

function mutantSource(name) {
    const mutant = MUTANTS[name];
    if (!mutant) throw new Error(`unknown mutant: ${name}`);
    const source = fs.readFileSync(PACE_FILE, 'utf8');
    assert.equal(source.split(mutant.from).length, 2, `mutant ${name} must replace exactly one site`);
    return source.replace(mutant.from, mutant.to);
}

function mutantApi(name) {
    const sandbox = { module: { exports: {} }, require: createRequire(PACE_FILE), __dirname,
        process, console, Date, Set, Map, Buffer };
    vm.runInNewContext(mutantSource(name), sandbox, { filename: PACE_FILE, timeout: 1000 });
    // Return objects across the VM boundary as ordinary host objects for strict
    // deep equality checks; the implementation functions still run in the VM.
    const api = sandbox.module.exports;
    return { ...api, evaluate: (...args) => clone(api.evaluate(...args)) };
}

function main() {
    const args = process.argv.slice(2);
    if (args.length === 2 && args[0] === '--mutant') {
        const api = mutantApi(args[1]);
        process.exitCode = runSuite(api, !!MUTANTS[args[1]].cli, false, MUTANTS[args[1]].cli ? mutantSource(args[1]) : null).failures.length ? 1 : 0;
        return;
    }
    if (args.length > 1 || (args.length === 1 && args[0] !== '--mutants')) throw new Error('Usage: test_pace.js [--mutants | --mutant NAME]');
    const baseline = runSuite(pace, true);
    let survivors = 0;
    if (args[0] === '--mutants') {
        for (const [name, spec] of Object.entries(MUTANTS)) {
            console.log(`MUTANT ${name}`);
            const result = runSuite(mutantApi(name), !!spec.cli, true, spec.cli ? mutantSource(name) : null);
            const checks = Array.isArray(spec.check) ? spec.check : [spec.check];
            const killed = checks.every(check => result.failures.includes(check));
            console.log(`${killed ? 'KILLED' : 'SURVIVED'} ${name}: required failing check ${checks.join(', ')}`);
            if (!killed) survivors++;
        }
        console.log(`MUTANTS: ${Object.keys(MUTANTS).length - survivors} killed, ${survivors} survived`);
    }
    process.exitCode = baseline.failures.length || survivors ? 1 : 0;
}
try { main(); } catch (error) { console.error(`FAIL harness: ${error.stack}`); process.exitCode = 1; }
