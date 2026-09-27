# SOC.30.01 lane-bo report

## What changed

- `game/js/plugins/DEUS_Mint.js`: added the registry-compiled deterministic mint/remelt core, integer component-mass accounting, explicit assay validation, immutable refusal paths, remainder retention, physical provenance stacks, and stores/treasury separation.
- `docs/systems/DEUS_MintingEngine.md`: documented authority, integer scale, state contract, public API, refusal codes, save boundary, checks, and the deliberately unwired runtime status.
- `tools/society/test_minting_engine.js`: added source checks, five-denomination round trips, targeted negative fixtures, separation tests, safe-integer bounds, and six source mutants.
- `tasks/SOC.30.01/lane-bo/AUTHORITY_GAPS.md`: recorded the contradictory metal-unit sentence and the missing assay, item-type, provider, and policy authorities without choosing new rules.

## How I tested it

- `node tools/society/test_minting_engine.js` — exit 0; 54 passed, 0 failed; six source mutants killed.
- `node tools/check_deus_syntax.js` — exit 0; 61 DEUS plugin files checked, 0 syntax errors.
- `git diff --check` — run before commit.
- Allowed-path audit against `tasks/SOC.30.01/lane-bo/lane.json` — run before commit.

## Evidence

- Screenshot: none. This lane produces no visual output, and `game/js/plugins.js` is explicitly outside `allowedPaths`, so an RMMZ screenshot would not be evidence that this unregistered plugin loaded.
- Log excerpt (focused gate, trimmed):

```text
[PASS] all_denominations_exact_round_trip: cp:ok sp:ok ep:ok gp:ok pp:ok
[PASS] electrum_preserves_equal_integer_components: {"massQuanta":8,"components":{"COPPER":0,"GOLD":4,"PLATINUM":0,"SILVER":4}}
[PASS] refuse_treasury_balance_as_mint_metal: expected=E_STORES actual=E_STORES unchanged=true
[PASS] refuse_stores_coins_as_treasury_stack: expected=E_TREASURY actual=E_TREASURY unchanged=true
[PASS] mutant_mint_does_not_debit_store_killed: all_denominations_exact_round_trip
[PASS] mutant_remelt_loses_one_quantum_killed: all_denominations_exact_round_trip
RESULT: 54 passed, 0 failed
```

- Log excerpt (syntax gate):

```text
Checked 61 DEUS plugin files. Errors: 0
```

## Not done / known problems

- Native RMMZ editor Playtest (F5) and dev-console (F8) checks were not run. The new plugin is not registered because `game/js/plugins.js` is outside this lane's allowed paths.
- No global save provider, physical workshop job, treasury owner, Quartermaster adapter, or `UF.Items` conversion was added; those files and later society leaves are outside scope.
- Only `gold_coin` exists in the item registry. Compact currency-stack metadata is implemented, but cp/sp/ep/pp item definitions were not invented.
- The frozen standard/machine registry say one metal unit per coin, while one subordinate handoff sentence says 100 gp per Gold unit. The task uses the frozen standard and machine registry and records the conflict in `AUTHORITY_GAPS.md`.
- Assay process, tolerance, office authorization, fees, taxes, seigniorage, loss, and alloy/parting workflow remain unspecified and were not invented.

## Try it in RMMZ

1. Not available as an editor Playtest step in this lane: a later authorized integration must register `DEUS_Mint` and supply the read-only registry/item/SRD authority object.

Expected: after that separate integration, `UF.Mint.createEngine(...)` exposes the documented pure transformation API; this report does not claim that integration.

## Decisions needed

- Resolve or retire the contradictory “100 gp consumes one Gold unit” handoff sentence.
- Assign later authorized ownership for assay production, the four absent item types, treasury/stores adapters, save wiring, and plugin registration.
