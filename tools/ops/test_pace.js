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
function runSuite(api, integration = false, quiet = false) {
    let passed = 0;
    const failures = [];
    const test = (name, fn) => {
        try { fn(); passed++; if (!quiet) console.log(`PASS ${name}`); }
        catch (error) { failures.push(name); console.log(`FAIL ${name}: ${error.message}`); }
    };
    const evaluate = (p = provider(), h = history(), options = {}) =>
        api.evaluate(input(p), h, { now: NOW, inputSource: 'TEST_input.json', ...options });
    const report = (...args) => evaluate(...args).reports.find(item => item.provider === 'claude');
    const unknown = r => { assert.equal(r.target, null); assert.equal(r.action, 'UNKNOWN'); };

    for (const [ratio, action] of [[0, 'ACCELERATE-2'], [0.499999, 'ACCELERATE-2'],
        [0.5, 'ACCELERATE-1'], [0.899999, 'ACCELERATE-1'], [0.9, 'HOLD'], [1, 'HOLD'],
        [1.1, 'HOLD'], [1.100001, 'THROTTLE-1'], [1.5, 'THROTTLE-1'], [1.500001, 'THROTTLE-2']]) {
        test(`band_${ratio}`, () => assert.equal(api.classify(ratio), action));
    }
    for (const value of [null, undefined, NaN, Infinity, -1, '1']) {
        test(`band_invalid_${String(value)}`, () => assert.equal(api.classify(value), 'UNKNOWN'));
    }
    // A weekly window with > 10% left and five hours to reset is in SURGE.
    test('surge_overrides_high_ratio', () => {
        const r = report(provider(), history(90));
        assert.equal(r.target, 10); assert.equal(r.measured, 40);
        assert.equal(r.ratio, 4); assert.equal(r.action, 'ACCELERATE-2'); assert.equal(r.surge, true);
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
    for (const [used, action] of [[0, 'ACCELERATE-2'], [6, 'ACCELERATE-1'], [10, 'HOLD'],
        [12, 'THROTTLE-1'], [20, 'THROTTLE-2']]) {
        test(`pipeline_band_${used}`, () => assert.equal(report(ordinary(40), shortHistory(40 + used)).action, action));
    }
    test('zero_remaining_exhausted_no_nan', () => {
        const r = report(ordinary(0), shortHistory(10));
        assert.equal(r.target, 0); assert.equal(r.ratio, null);
        assert.equal(r.action, 'EXHAUSTED'); assert.equal(r.dispatch, 'DENY');
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
    for (const source of ['', 'UNKNOWN', '--', 'N/A', 'bad\nPACE spoof', null]) {
        test(`ungrounded_source_${JSON.stringify(source)}`, () => unknown(report(provider(50, { source }))));
    }
    test('session_scope_rejected', () => unknown(report(provider(50, { scope: 'session' }))));
    test('unverified_rejected', () => unknown(report(provider(50, { verified: false }))));
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
        const r = report(p); assert.equal(r.action, 'EXHAUSTED'); assert.equal(r.dispatch, 'DENY');
        assert.match(r.source, /five-hour/);
    });
    test('surge_exact_10_percent_time', () => {
        const p = ordinary(11); p.windows[0].resetAt = at(0.5);
        assert.equal(report(p, api.emptyHistory()).action, 'ACCELERATE-2');
    });
    test('surge_not_above_10_percent_time', () => {
        const p = ordinary(11); p.windows[0].resetAt = at(0.500001);
        assert.equal(report(p, api.emptyHistory()).action, 'UNKNOWN');
    });
    test('surge_needs_more_than_10_percent_left', () => {
        const p = ordinary(10); p.windows[0].resetAt = at(0.5);
        assert.equal(report(p, api.emptyHistory()).surge, false);
    });
    test('low_quota_bounded', () => assert.equal(report(ordinary(8), shortHistory(8)).action, 'THROTTLE-1'));
    test('expected_cost_exceeds_remaining_blocks_surge', () => {
        const r = report(provider(), history(), { expectedCostPct: 51 });
        assert.equal(r.action, 'THROTTLE-2'); assert.equal(r.dispatch, 'DENY');
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
    test('history_pruned_and_versioned', () => {
        const h = history(70, at(-3)); const result = evaluate(provider(), h);
        assert.equal(result.history.version, 1); assert.equal(result.history.samples.length, 1);
        assert.equal(result.history.samples[0].observedAt, NOW);
    });
    test('all_five_providers_reported_missing_as_unknown', () => {
        const reports = evaluate().reports;
        assert.deepEqual(reports.map(r => r.provider), ['gemini', 'claude', 'grok', 'codex', 'minimax']);
        for (const r of reports.filter(r => r.provider !== 'claude')) {
            unknown(r); assert.match(api.format(r), /\[source: UNKNOWN\]/);
        }
    });
    test('format_numeric_line_cites_both_endpoints', () => {
        const line = api.format(report(ordinary(40), shortHistory(50)));
        assert.match(line, /^PACE claude rem 40% reset 2026-09-30T16:00:00.000Z used\/h 10 target\/h 10 -> HOLD \[source: /);
        assert.match(line, /TEST_history @ 2026-09-30T11:00:00.000Z/);
        assert.match(line, /TEST_account_usage @ 2026-09-30T12:00:00.000Z/);
    });
    test('format_unknown_never_zero', () => {
        const line = api.format(report(provider(50, { precision: 'SESSION_ONLY' })));
        assert.match(line, /rem UNKNOWN reset UNKNOWN used\/h UNKNOWN target\/h UNKNOWN -> UNKNOWN/);
    });
    test('utc_normalizes_minutes_and_fraction', () => {
        assert.equal(api.utc('2026-09-30T12:00Z'), Date.parse(NOW));
        assert.equal(api.utc('2026-09-30T12:00:00.1Z'), Date.parse(NOW) + 100);
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
        const write = (file, data) => fs.writeFileSync(file, JSON.stringify(data));
        const cli = (args = [], stdin) => spawnSync(process.execPath, [PACE_FILE, '--input', usagePath,
            '--history', historyPath, '--now', NOW, ...args], { encoding: 'utf8', timeout: 10000, input: stdin, windowsHide: true });
        try {
            test('cli_two_foreground_polls_persist_history', () => {
                const p = ordinary(50); p.lastChecked = at(-1); write(usagePath, input(p));
                const first = spawnSync(process.execPath, [PACE_FILE, '--input', usagePath, '--history', historyPath,
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
                assert.match(result.stdout, /PACE minimax rem UNKNOWN/);
            });
            test('cli_stdin_json', () => {
                const result = spawnSync(process.execPath, [PACE_FILE, '--input', '-', '--history', historyPath,
                    '--now', NOW, '--read-only'], { encoding: 'utf8', input: JSON.stringify(input(ordinary(40))), timeout: 10000, windowsHide: true });
                assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /source:.*stdin#/);
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
            test('cli_unknown_option_fails', () => assert.equal(cli(['--mutant', 'wrong-band']).status, 1));
            test('cli_invalid_expected_cost_fails', () => assert.equal(cli(['--expected-cost-pct', 'NaN']).status, 1));
            test('cli_input_history_collision_fails', () => {
                const result = spawnSync(process.execPath, [PACE_FILE, '--input', historyPath, '--history', historyPath],
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

// Mutants are injected into an in-memory module. The production CLI has no
// mutant switches, and no source file is rewritten by this suite.
const MUTANTS = {
    'wrong-band': { from: "if (ratio < 0.5) return 'ACCELERATE-2';", to: "if (ratio < 0.5) return 'HOLD';", check: 'band_0' },
    'missing-reset': { from: 'const resetAt = utc(raw.resetAt);', to: 'const resetAt = utc(raw.resetAt) ?? now + 5 * HOUR;', check: 'missing_reset_unknown' },
    'stale-reading': { from: 'now - observedAt > MAX_AGE', to: 'false', check: 'stale_reading_rejected' },
    'ungrounded-estimate': { from: "raw.precision === 'EXACT_PROVIDER'", to: 'true', check: 'ungrounded_precision_SESSION_ONLY' },
    'wrong-window': { from: 'if (weekly) return weekly;', to: 'if (weekly && windows.length === 1) return weekly;', check: 'weekly_precedes_shortest' },
    'wrong-target': { from: 'current.remainingPct / hoursLeft', to: 'hoursLeft / current.remainingPct', check: 'measured_target_ratio' },
    'wrong-measured': { from: 'base.remainingPct - current.remainingPct', to: '0', check: 'measured_target_ratio' },
    'no-surge': { from: "if (report.surge) report.action = 'ACCELERATE-2';", to: '/* surge deliberately removed */', check: 'surge_overrides_high_ratio' },
    'mix-reset': { from: 'a.resetAt === b.resetAt && a.durationHours === b.durationHours', to: 'a.durationHours === b.durationHours', check: 'reset_cycle_not_mixed' }
};

function mutantApi(name) {
    const mutant = MUTANTS[name];
    if (!mutant) throw new Error(`unknown mutant: ${name}`);
    const source = fs.readFileSync(PACE_FILE, 'utf8');
    assert.equal(source.split(mutant.from).length, 2, `mutant ${name} must replace exactly one site`);
    const sandbox = { module: { exports: {} }, require: createRequire(PACE_FILE), __dirname,
        process, console, Date, Set, Map, Buffer };
    vm.runInNewContext(source.replace(mutant.from, mutant.to), sandbox, { filename: PACE_FILE, timeout: 1000 });
    // Return objects across the VM boundary as ordinary host objects for strict
    // deep equality checks; the implementation functions still run in the VM.
    const api = sandbox.module.exports;
    return { ...api, evaluate: (...args) => clone(api.evaluate(...args)) };
}

function main() {
    const args = process.argv.slice(2);
    if (args.length === 2 && args[0] === '--mutant') {
        process.exitCode = runSuite(mutantApi(args[1])).failures.length ? 1 : 0;
        return;
    }
    if (args.length > 1 || (args.length === 1 && args[0] !== '--mutants')) throw new Error('Usage: test_pace.js [--mutants | --mutant NAME]');
    const baseline = runSuite(pace, true);
    let survivors = 0;
    if (args[0] === '--mutants') {
        for (const [name, spec] of Object.entries(MUTANTS)) {
            console.log(`MUTANT ${name}`);
            const result = runSuite(mutantApi(name), false, true);
            const killed = result.failures.includes(spec.check);
            console.log(`${killed ? 'KILLED' : 'SURVIVED'} ${name}: required failing check ${spec.check}`);
            if (!killed) survivors++;
        }
        console.log(`MUTANTS: ${Object.keys(MUTANTS).length - survivors} killed, ${survivors} survived`);
    }
    process.exitCode = baseline.failures.length || survivors ? 1 : 0;
}
try { main(); } catch (error) { console.error(`FAIL harness: ${error.stack}`); process.exitCode = 1; }
