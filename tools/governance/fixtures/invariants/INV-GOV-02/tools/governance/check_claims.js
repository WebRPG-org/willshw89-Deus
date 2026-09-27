function checkWhitelist(ctx, R) {
    if (frozen) { fail(`${ch.path}: frozen / read-only (${frozen.raw})`); continue; }
    if (lanes.some(l => l.globs.some(g => g.re.test(ch.path)))) continue;
    // Mutant: a path outside the writer's whitelist is accepted.
}
