#!/usr/bin/env node
'use strict';

// One-shot PACE advice, not a dispatcher. Input contract and examples:
// tasks/OPS.PRUNE.PACE/lane-cr/README.md. No provider commands are executed.
const fs = require('fs');
const path = require('path');
const HOUR = 60 * 60 * 1000;
const MAX_AGE = HOUR / 2;
const MAX_SAMPLES = 4096;
const PROVIDERS = ['gemini', 'claude', 'grok', 'codex'];
const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_INPUT = path.join(ROOT, 'docs/agents/PROVIDER_USAGE_STATUS.json');
const DEFAULT_HISTORY = path.join(ROOT, 'tasks/OPS.PRUNE.PACE/lane-cr/.local/history.json');

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const pct = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
const label = value => typeof value === 'string' && value.trim() && !/[\x00-\x1f\x7f\[\]]/.test(value);
const sourceLabel = value => label(value) && !/^(UNKNOWN|--|N\/A)$/i.test(value.replace(/\s/g, ''));
// Older exact telemetry omits verified; a supplied value must be boolean true.
const verifiedEvidence = value => !('verified' in value) || value.verified === true;

// Absolute ISO times only. Validate the wall date before applying an explicit
// offset, so Date.parse cannot normalize an impossible date into valid evidence.
function utc(value) {
    if (typeof value !== 'string') return null;
    const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
    if (!m) return null;
    const canonical = `${m[1]}:${m[2] || '00'}.${(m[3] || '').padEnd(3, '0')}Z`;
    const time = Date.parse(canonical);
    if (!Number.isFinite(time) || new Date(time).toISOString() !== canonical) return null;
    if (m[4] === 'Z') return time;
    if (Number(m[6]) > 23 || Number(m[7]) > 59) return null;
    const offset = (Number(m[6]) * 60 + Number(m[7])) * 60000;
    return time - (m[5] === '+' ? offset : -offset);
}

function classify(ratio) {
    if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio < 0) return 'UNKNOWN';
    if (ratio < 0.5) return 'ACCELERATE-2';
    if (ratio < 0.9) return 'ACCELERATE-1';
    if (ratio <= 1.1) return 'HOLD';
    if (ratio <= 1.5) return 'THROTTLE-1';
    return 'THROTTLE-2';
}

function windowsFor(provider) {
    if (provider.windows !== undefined) {
        if (!Array.isArray(provider.windows) || !provider.windows.length) throw new Error('invalid windows');
        const ids = new Set();
        return provider.windows.map(window => {
            if (!object(window) || !label(window.id) || ids.has(window.id)) throw new Error('invalid/duplicate window id');
            ids.add(window.id);
            return { ...window };
        });
    }
    const windows = [];
    // Legacy telemetry emits null placeholders. A null weekly placeholder does
    // not establish that a weekly quota is absent; require an explicit false.
    if (provider.hasWeeklyWindow !== false && (provider.hasWeeklyWindow === true ||
        'remainingWeeklyPct' in provider || 'weeklyReset' in provider)) {
        windows.push({ id: 'weekly', durationHours: 168,
            remainingPct: provider.remainingWeeklyPct, resetAt: provider.weeklyReset });
    }
    if ('remainingFiveHourPct' in provider || 'fiveHourReset' in provider) {
        windows.push({ id: 'five-hour', durationHours: 5,
            remainingPct: provider.remainingFiveHourPct, resetAt: provider.fiveHourReset });
    }
    return windows;
}

function bindingWindow(windows, provider) {
    const weekly = windows.find(window => window.id === 'weekly');
    if (provider.hasWeeklyWindow === false && weekly) throw new Error('contradictory weekly window declaration');
    if (weekly) return weekly;
    if (provider.hasWeeklyWindow === true) throw new Error('weekly window missing');
    if (!windows.length || windows.some(window => !positive(window.durationHours))) {
        throw new Error('shortest window UNKNOWN');
    }
    return [...windows].sort((a, b) => a.durationHours - b.durationHours || a.id.localeCompare(b.id))[0];
}

function reading(providerId, provider, window, now, inputSource) {
    const raw = { ...provider, ...window };
    const observedAt = utc(raw.lastChecked);
    const resetAt = utc(raw.resetAt);
    const trusted = raw.precision === 'EXACT_PROVIDER' && sourceLabel(raw.source) &&
        (raw.scope === undefined || raw.scope === 'account') && verifiedEvidence(raw);
    let reason = null;
    if (!trusted) reason = 'account evidence UNKNOWN';
    else if (observedAt === null || observedAt > now) reason = 'observation time UNKNOWN/future';
    else if (now - observedAt > MAX_AGE) reason = 'stale reading (older than 30 minutes)';
    const validEvidence = reason === null;
    const remainingPct = validEvidence && pct(raw.remainingPct) ? raw.remainingPct : null;
    const reset = validEvidence && resetAt !== null && resetAt > now ? resetAt : null;
    if (!reason && remainingPct === null) reason = 'remaining quota UNKNOWN';
    if (!reason && reset === null) reason = 'reset UNKNOWN/expired';
    if (!reason && (!positive(raw.durationHours) || resetAt - observedAt > raw.durationHours * HOUR)) {
        reason = 'window duration UNKNOWN/inconsistent';
    }
    if (raw.accountId !== undefined && !label(raw.accountId)) reason = 'account id UNKNOWN';
    return {
        provider: providerId, accountId: raw.accountId || 'default', window: window.id,
        remainingPct, resetAt: reset === null ? null : new Date(reset).toISOString(),
        observedAt: observedAt === null ? null : new Date(observedAt).toISOString(),
        durationHours: positive(raw.durationHours) ? raw.durationHours : null,
        source: validEvidence ? `${inputSource}#${providerId}/${window.id} via ${raw.source} @ ${new Date(observedAt).toISOString()}` : 'UNKNOWN',
        reason
    };
}

function emptyHistory() { return { version: 1, samples: [] }; }

function validateHistory(history) {
    if (!object(history) || history.version !== 1 || !Array.isArray(history.samples) || history.samples.length > MAX_SAMPLES) {
        throw new Error('invalid history schema or sample limit');
    }
    for (const sample of history.samples) {
        if (!object(sample) || !label(sample.provider) || !label(sample.accountId) || !label(sample.window) ||
            !pct(sample.remainingPct) || !positive(sample.durationHours) || !sourceLabel(sample.source) || !verifiedEvidence(sample) ||
            utc(sample.observedAt) === null || utc(sample.resetAt) === null || utc(sample.capturedAt) === null ||
            utc(sample.capturedAt) < utc(sample.observedAt) || utc(sample.capturedAt) - utc(sample.observedAt) > MAX_AGE ||
            utc(sample.resetAt) <= utc(sample.capturedAt) ||
            utc(sample.resetAt) - utc(sample.observedAt) > sample.durationHours * HOUR) {
            throw new Error('invalid history sample; preserve file and collect a new history');
        }
    }
    // Canonicalize before identity checks, collision detection and deduplication.
    // Keep conflicting values as distinct samples; never let last-write win.
    return { ...history, samples: history.samples.map(sample => ({ ...sample,
        observedAt: new Date(utc(sample.observedAt)).toISOString(),
        capturedAt: new Date(utc(sample.capturedAt)).toISOString(),
        resetAt: new Date(utc(sample.resetAt)).toISOString()
    })) };
}

function sameWindow(a, b) {
    return a.provider === b.provider && a.accountId === b.accountId && a.window === b.window &&
        a.resetAt === b.resetAt && a.durationHours === b.durationHours;
}

function measure(current, samples) {
    const end = utc(current.observedAt);
    const start = end - HOUR;
    const peers = samples.filter(sample => sameWindow(sample, current));
    if (peers.some(sample => utc(sample.observedAt) > end)) return { measured: null, reason: 'out-of-order observation' };
    const ordered = [...peers, current].sort((a, b) => utc(a.observedAt) - utc(b.observedAt));
    // Keep one boundary sample, then every observation in the hour. A quota
    // correction/increase or conflicting same-time sample is not consumption.
    let boundary = -1;
    for (let i = 0; i < ordered.length; i++) if (utc(ordered[i].observedAt) <= start) boundary = i;
    if (boundary < 0) return { measured: null, reason: '60-minute history UNKNOWN' };
    let first = Math.max(0, boundary - 1);
    while (first > 0 && ordered[first - 1].observedAt === ordered[first].observedAt) first--;
    const relevant = ordered.slice(first);
    for (let i = 1; i < relevant.length; i++) {
        const before = relevant[i - 1], after = relevant[i];
        if (after.remainingPct > before.remainingPct ||
            (after.observedAt === before.observedAt && after.remainingPct !== before.remainingPct)) {
            return { measured: null, reason: 'quota correction/conflicting history' };
        }
    }
    const base = ordered[boundary];
    const next = ordered[boundary + 1];
    // No linear interpolation or extrapolation: an exact boundary is measured,
    // as is a flat bracket (zero quota change across that boundary).
    if (utc(base.observedAt) !== start && (!next || base.remainingPct !== next.remainingPct ||
        utc(next.observedAt) - utc(base.observedAt) > MAX_AGE)) {
        return { measured: null, reason: '60-minute boundary UNKNOWN (no estimate)' };
    }
    return { measured: base.remainingPct - current.remainingPct, reason: null,
        sources: [...new Set([base.source, ...(utc(base.observedAt) === start ? [] : [next.source]), current.source])],
        from: new Date(start).toISOString(), to: current.observedAt };
}

function evaluate(input, history = emptyHistory(), options = {}) {
    const now = options.now === undefined ? Date.now() : utc(options.now);
    if (now === null || !Number.isFinite(now)) throw new Error('now must be a valid UTC timestamp');
    if (!object(input) || !object(input.providers)) throw new Error('input must contain a providers object');
    history = validateHistory(history);
    if (options.expectedCostPct !== undefined && !pct(options.expectedCostPct)) throw new Error('invalid expected cost percent');
    const inputSource = options.inputSource || 'JSON input';
    if (!label(inputSource)) throw new Error('invalid input source label');
    const pending = [];
    const reports = [];
    for (const id of [...new Set([...PROVIDERS, ...Object.keys(input.providers)])]) {
        if (!/^[a-z][a-z0-9_-]*$/i.test(id)) throw new Error('invalid provider identifier');
        const report = { provider: id, window: null, remainingPct: null, resetAt: null,
            measured: null, target: null, ratio: null, action: 'UNKNOWN', effectiveAction: 'UNKNOWN', surge: false,
            dispatch: 'UNKNOWN', scope: 'binding-window', windows: [], source: 'UNKNOWN', reasons: [] };
        const provider = input.providers[id];
        if (!object(provider)) {
            report.reasons.push('provider account reading UNKNOWN');
            reports.push(report);
            continue;
        }
        let windows, current, readings;
        try {
            windows = windowsFor(provider);
            readings = windows.map(window => reading(id, provider, window, now, inputSource));
            report.windows = readings.map(item => ({ window: item.window,
                status: item.reason ? 'UNKNOWN' : 'KNOWN', reason: item.reason,
                remainingPct: item.remainingPct, resetAt: item.resetAt, source: item.source }));
            const binding = bindingWindow(windows, provider);
            current = readings.find(item => item.window === binding.id);
        } catch (error) {
            report.reasons.push(error.message);
            reports.push(report);
            continue;
        }
        Object.assign(report, { window: current.window, remainingPct: current.remainingPct,
            resetAt: current.resetAt, source: current.source });
        const rejectedSiblings = readings.filter(item => item.window !== current.window && item.reason);
        if (rejectedSiblings.length) report.reasons.push('provider-wide advice UNKNOWN: rejected sibling windows');
        for (const item of readings) {
            if (!item.reason) {
                const { reason, ...sample } = item;
                pending.push({ ...sample, capturedAt: new Date(now).toISOString() });
            }
        }
        if (current.reason) {
            report.reasons.push(current.reason);
            reports.push(report);
            continue;
        }
        const hoursLeft = (utc(current.resetAt) - now) / HOUR;
        report.target = current.remainingPct / hoursLeft;
        const measured = measure(current, history.samples);
        report.measured = measured.measured;
        if (measured.reason) report.reasons.push(measured.reason);
        if (measured.sources) {
            report.source = measured.sources.join('; ');
            report.measurement = { from: measured.from, to: measured.to };
        }
        // Remove arithmetic roundoff at decimal quota boundaries (e.g.
        // 50.9 - 50). Keep classification itself strict for supplied ratios.
        if (report.measured !== null && report.target > 0) {
            report.ratio = Number((report.measured / report.target).toPrecision(14));
        }
        report.action = classify(report.ratio);
        // The action is strictly the binding-window ratio band. Dispatch guards
        // cannot replace that measurement and take priority over SURGE.
        const exhausted = readings.find(item => !item.reason && item.remainingPct === 0);
        if (exhausted) {
            report.dispatch = 'DENY';
            report.source = [...new Set([report.source, exhausted.source])].join('; ');
            report.reasons.push(`${exhausted.window} quota exhausted`);
        } else if (options.expectedCostPct !== undefined) {
            // Expected cost is explicitly supplied in binding-window percentage
            // points. It is a guard, never a replacement for measured usage.
            report.dispatch = options.expectedCostPct > current.remainingPct ? 'DENY' : 'WITHIN_BINDING_QUOTA';
            if (report.dispatch === 'DENY') {
                report.reasons.push('expected cost exceeds binding quota');
            }
        }
        // LOW restricts dispatch, not the ratio band.
        const lowQuota = current.remainingPct > 0 && current.remainingPct <= 10;
        if (lowQuota) report.reasons.push('LOW quota: bounded tasks only');
        if ((lowQuota || report.action === 'THROTTLE-1') && report.dispatch !== 'DENY') {
            report.dispatch = 'BOUNDED_TASKS';
        }
        if (report.action === 'THROTTLE-2') report.dispatch = 'DENY';
        if ((report.action === 'UNKNOWN' || rejectedSiblings.length) && report.dispatch !== 'DENY') report.dispatch = 'UNKNOWN';
        // Promote only measured, under-target use near reset, after dispatch
        // restrictions are known. Keep the diagnostic band separately visible.
        report.surge = hoursLeft <= current.durationHours * 0.1 && current.remainingPct > 10 &&
            Number.isFinite(report.ratio) && report.ratio >= 0 && report.ratio < 1;
        if (report.dispatch === 'DENY' || report.dispatch === 'BOUNDED_TASKS' || rejectedSiblings.length) report.surge = false;
        report.effectiveAction = report.surge ? 'ACCELERATE-2' : report.action;
        reports.push(report);
    }
    // Keep two hours, preserving duplicate conflicts rather than silently
    // overwriting their evidence. Repeated polls of one snapshot add no usage.
    const unique = new Map();
    for (const sample of [...history.samples, ...pending]) {
        if (utc(sample.observedAt) < now - 2 * HOUR || utc(sample.observedAt) > now) continue;
        const key = JSON.stringify([sample.provider, sample.accountId, sample.window, sample.resetAt,
            sample.durationHours, sample.observedAt, sample.remainingPct, sample.source]);
        if (!unique.has(key)) unique.set(key, sample);
    }
    const samples = [...unique.values()].sort((a, b) => utc(a.observedAt) - utc(b.observedAt));
    if (samples.length > MAX_SAMPLES) throw new Error('history sample limit exceeded');
    return { version: 1, generatedAt: new Date(now).toISOString(), reports, history: { version: 1, samples } };
}

function format(report) {
    const number = value => value === null ? 'UNKNOWN' : String(Number(value.toFixed(6)));
    const rejected = report.windows.filter(item => item.status === 'UNKNOWN');
    return `PACE ${report.provider} window ${report.window || 'UNKNOWN'} rem ${report.remainingPct === null ? 'UNKNOWN' : number(report.remainingPct) + '%'} ` +
        `reset ${report.resetAt || 'UNKNOWN'} used/h ${number(report.measured)} target/h ${number(report.target)} ` +
        `-> ${report.action} [effective: ${report.effectiveAction}] [source: ${report.source}]` +
        ` [scope: ${report.scope}] [dispatch: ${report.dispatch}]` +
        (rejected.length ? ` [windows: ${rejected.map(item => `${item.window} UNKNOWN (${item.reason})`).join('; ')}]` : '') +
        (report.reasons.length ? ` [reason: ${report.reasons.join('; ')}]` : '') + (report.surge ? ' [SURGE]' : '');
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }

function writeHistory(file, history) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    let created = false;
    try {
        fs.writeFileSync(temp, JSON.stringify(history, null, 2) + '\n', { flag: 'wx' });
        created = true;
        fs.renameSync(temp, file);
    } finally {
        if (created && fs.existsSync(temp)) fs.unlinkSync(temp);
    }
}

function main(argv) {
    const options = { input: DEFAULT_INPUT, history: DEFAULT_HISTORY };
    const values = { '--input': 'input', '--history': 'history', '--now': 'now', '--expected-cost-pct': 'expectedCostPct' };
    const flags = { '--json': 'json', '--read-only': 'readOnly' };
    const seen = new Set();
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--help') {
            console.log('Usage: node tools/ops/pace.js [--input file|-] [--history file] [--read-only] [--json] [--now UTC] [--expected-cost-pct 0..100]');
            return;
        }
        if (seen.has(arg)) throw new Error(`duplicate option ${arg}`);
        seen.add(arg);
        if (flags[arg]) options[flags[arg]] = true;
        else if (values[arg] && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) options[values[arg]] = argv[++i];
        else throw new Error(`unknown option or missing value: ${arg}`);
    }
    if (options.expectedCostPct !== undefined) {
        if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(options.expectedCostPct)) throw new Error('invalid expected cost percent');
        options.expectedCostPct = Number(options.expectedCostPct);
    }
    const historyPath = path.resolve(options.history);
    if (options.input !== '-' && path.resolve(options.input).toLowerCase() === historyPath.toLowerCase()) {
        throw new Error('input and history must be separate files');
    }
    const input = options.input === '-' ? readJson(0) : readJson(options.input);
    let history = emptyHistory();
    try { history = readJson(historyPath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const result = evaluate(input, history, { ...options, inputSource: options.input === '-' ? 'stdin' : options.input.replace(/\\/g, '/') });
    if (!options.readOnly) writeHistory(historyPath, result.history);
    if (options.json) {
        const { history: localHistory, ...output } = result;
        console.log(JSON.stringify(output, null, 2));
    } else {
        for (const report of result.reports) console.log(format(report));
    }
}

module.exports = { utc, classify, evaluate, format, emptyHistory, validateHistory, main };
if (require.main === module) {
    try { main(process.argv.slice(2)); }
    catch (error) { console.error(`PACE ERROR: ${error.message}`); process.exitCode = 1; }
}
