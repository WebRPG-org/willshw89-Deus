## What changed
- `game/js/sim/starts/place_starts.js`: pure seeded solver. Nine starts, deepest first, farthest-point inside a ±6 cell window, z weight 2, at most four 32-cell shifts. A ratio still under 0.65 is accepted and logged. -13 is clamped into the world range before any reader call.
- `game/data/worldgen/race_starts.json`: the nine homes, map `[col, row]`, salts, neighbour families, and the solver constants (including `centreRadius` 6).
- `docs/systems/DEUS_RaceStarts.md`: the call, the lattice, the clip rules, the fail-safes, and why the candidate window is ±6.
- `tools/test_race_starts.js`: the eighteen named checks, plus in-memory mutants.
- `tasks/WG.62.02/lane-ez/evidence/`: fail-before, pass-after, mutant, and syntax logs from 2026-10-01.

## How I tested it
- Moved `place_starts.js` aside, ran `node tools/test_race_starts.js`, restored the file.
- `node tools/test_race_starts.js`
- `node tools/test_race_starts.js --mutant=` for `bypass_validation`, `hardcode_minus13`, `throw_on_low_ratio`, `no_wrap`, `no_z_weight`, `shallow_first`, `no_shift`.
- `node tools/check_deus_syntax.js`
- `node --check game/js/sim/starts/place_starts.js`
- A separate open-reader probe of seeds 1..20 (`zMin` -16, `zMax` 15, every cell walkable and dry, family equal to the map's race).

## Evidence
- No screenshot. This lane has no playtest path (F5 is lane-fb).
- Log excerpt, missing module (`tasks/WG.62.02/lane-ez/evidence/fail_before.txt`):

```
FAIL ::nine_starts: missing C:\Users\snewt\.deus_worktrees\lane-ez\game\js\sim\starts\place_starts.js
FAILED 18 nine_starts,fixed_map_assignment,ratio_065_all_walkable,low_ratio_accepts_degraded,shift_passes_bounded,home_band,no_sky,determinism,failsafe_family,failsafe_z,failsafe_centre,infeasible_throws_underground_only,elevated_home_degrades,order_deepest_first,cost_bound,zrange_clip,shift_blocked_rejected,reader_range_respected
EXIT:1
```

- Log excerpt, solver present (`tasks/WG.62.02/lane-ez/evidence/pass_after.txt`):

```
PASS ::reader_range_respected
ALL CHECKS PASSED
EXIT:0
```

All eighteen checks printed PASS before that line.

- Mutant excerpt (`tasks/WG.62.02/lane-ez/evidence/mutants.txt`). Each of the seven printed KILLED and EXIT:1. The blocked-shift mutant:

```
FAIL ::shift_blocked_rejected: dragonborn unstandable 191,128,-13
KILLED bypass_validation -> shift_blocked_rejected
EXIT:1
```

`hardcode_minus13` failed `::reader_range_respected` and `::zrange_clip` (`reader z -13`). `throw_on_low_ratio` failed `::low_ratio_accepts_degraded`. `no_wrap` and `no_z_weight` failed `::determinism`. `shallow_first` failed `::order_deepest_first`. `no_shift` failed `::shift_passes_bounded`.

- Syntax log: `Checked 62 DEUS plugin files. Errors: 0` and `EXIT:0`. `node --check` on the solver exited 0.
- Open-reader probe, seeds 1..20: ratio 0.6678468476745847 to 0.6736946831223736, `distanceOps` 36936 on every seed, `shiftPasses` 0, no degradation log. Seed 1 order was `dragonborn,dwarf,gnome,tiefling,half-elf,half-orc,human,halfling,elf`. Dragonborn was `128,128,-13`. Elf was `634,634,10`.

## Not done / known problems
- New Game does not call the solver. Reachability, founders, relations, and the ally hearth link are other lanes. Playtest was not run.
- `docs/systems/README.md` does not list this note. That index is outside this lane's paths.
- No `docs/STATUS.md` claim line, for the same reason.
- D4 asks for 1024 weighted `(x, y)` candidates on the assigned map. A draw across the whole map camps on wrap corners and stays near 0.35–0.45 after four shifts, so the shipped draw is uniform inside ±6 of the map centre. The whole-map spiral still runs when that window has no legal cell. `centreRadius` is data in the JSON.
- The square-candidate check (`1024 = 32²` and `256` divisible by 32) is still enforced. The draw no longer uses that grid.

## Try it in RMMZ
1. Open Playtest. Nothing in this lane is hooked to a plugin or to New Game.
Expected: the playtest is unchanged. The headless check is `node tools/test_race_starts.js` from the worktree root.

## Decisions needed
- Confirm `centreRadius` 6 as the xy weight. It is what makes seeds 1..20 clear 0.65 without a fifth shift pass. A softer weight over the whole map did not.
