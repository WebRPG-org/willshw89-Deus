# Simulate-forward (dev only)

SIM.10.02. A Node CLI that copies a save, or a seeded standard Year-0 world, and runs the existing demographic history forward on the copy. It is not a plugin, it is not listed in `game/js/plugins.js`, and New Game does not call it.

INV-SIM-01: a standard New Game starts at World Year 0 with `history.simulated === false` and `history.demographics.yearsSimulated === 0`. History then unfolds in play. This tool is a separate process for development. It does not change that path.

## Usage

From the repository root:

```text
node tools/dev/sim_forward.js --seed 424242 --years 3 --output out.json
node tools/dev/sim_forward.js --input tools/sim/fixtures/sim_forward/year0_seed_424242.json --years 3 --output out.json
node tools/dev/sim_forward.js --help
```

`--seed` and `--input` are mutually exclusive. `--years` is an integer from 0 through 10000. `--years 0` writes the Year-0 copy and does not step. The fixture above is that snapshot for seed 424242.

The output is UTF-8 JSON, format `deus.sim_forward.v1`:

- `yearsRun` is the count requested for this invocation.
- `before` and `after` hold the calendar year, living population, faction roster size, living-faction count, and population by faction.
- `clock.year` is the ledger's `currentYear` after the run.
- `world` is the copied world. A later run can take this file as `--input` and continue.

Stdout is the summary. It names years run, year before and after, population before and after, faction counts before and after, and the output path.

## What it runs

The copy is advanced with `UF.HistoricalDemographics.simulate`, the annual population step `UF.History.generate` uses when an aged world is built. The CLI does not pass N into `History.generate`'s `targetYear`. That argument is the new-game age. Here the headless world is always built as a standard Year-0 new game (`UF.NewGameSetup.year === 0`), and only the copy is stepped.

After the step, the tool copies the ledger's census onto `factions.list[].population`, sets `history.years`, `history.worldAge`, and `history.simulated` from `yearsSimulated`, refreshes `demographics.living` / `demographics.graveyard`, and rewrites `history.events` in the same shape `History.materialize` publishes. Those are projections of the ledger, not a second simulation.

## Guarantees

- The input file is not opened for writing. Its bytes are the same after a successful run.
- If the output path is the input path (including two spellings of the same file), the process exits 1 and does not write it.
- Requiring the module does not simulate. The CLI runs only when it is the process entry point.
- A seeded run refuses to continue if the headless new game is not Year 0 with `simulated === false`.
- The same seed and year count produce the same output bytes.

## Limits

- The file is a JSON snapshot, not a compressed `.rmmzsave`, and the game does not load it.
- Placed units, campfires, and `history.rulers` stay as they were on the copied save. Births and deaths are in the demographic ledger. `History.materialize` will not place them again once `materialization.complete` is set, and this lane does not change that game code.
- The legacy site, war, and ruin generator, and `History.iterateWorldHistory`, are not this tool.
- A save with no `history.demographics` ledger is rejected. Current Year-0 worlds have one.
- The demographic API still refuses a run that would pass year 1000000 or a negative count. This CLI also rejects a non-integer year count and a save larger than 64 MB.
- Headless Node only. No Playtest and no NW.js.

## Guard

`node tools/sim/test_sim_forward_guard.js` runs the CLI against the fixture, checks the input bytes, compares the ledger to an in-process `HistoricalDemographics.simulate`, scans `game/` for a reference to this tool, and reruns a standard New Game. Mutants that write the input, drop the path refusal, skip the step, call `simulate` from the new-game listener, or name the tool under `game/` must fail those checks.
