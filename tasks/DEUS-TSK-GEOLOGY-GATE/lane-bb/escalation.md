# Escalation: tools/test_strata_cuts_and_caves.js is red and outside this lane

Lane BB FIX2 repaired `tools/test_strata_foundation.js`. The lane gate `node tools/test_strata_cuts_and_caves.js` also exits 1. That file, and the plugins it loads, are not in `allowedPaths`. This lane does not edit them.

The nested check `foundation_suite` runs `node tools/test_strata_foundation.js` and is green after this repair (26 passed, exit 0). The other seven failures are in the cuts harness itself:

- `deterministic_same_seed` — regenerating inside another seed's world changes the -2/-1 checksums.
- `old_generator_unchanged` — generator 4 vs the pre-19B plugins (`19fcf0e`): -2 and -1 strata differ. Same WG.00.15 column rule as Cause B. Shapes of 0, +1, +2 still match.
- `cave_overburden` — one network chamber centre is open to the sky (47/48 roofed).
- `roof_breach` — throws `TypeError: Cannot read properties of null (reading 'material')` at line 807. `capAt` is null. `docs/systems/DEUS_ZRange.md` section 6: at -16..+15 every ceiling cap fits as strata of +3 and up, so the legacy cap record is gone. The harness has no `process`, so New Game is `Z_RANGES.default`.
- `clearance_4_5_more` — wants generated floors at 4 ft and 5 ft. A stratum is 2 ft (`DEUS_ZRange.md` section 7), so those counts are the 1 ft frame.
- `clearance_stops_at_fluid` — `airRunAt` returns 0 where the check wants the air-run length (2, 3, 4).
- `no_parallel_authority` — baseline objects now carry the WG.00.17 chunk-store fields `cw`, `dir`, `mixed`, `mixedCount`, `shift`, `mask`. The check's allowlist does not name them.

Raw FAIL lines and the EXIT value are in `REPORT.md` under the cuts gate. Follow-up: PROPOSED-BB-03.
