# SOC.30.01 review (Grok) of 64e1f220d49f6baccf661ecd5fb80e05b3e664a3

Independent high-risk review of the conserved physical mint and remelt core. The writer tip under review is `64e1f220d49f6baccf661ecd5fb80e05b3e664a3` (`[codex] SOC.30.01 conserved physical minting engine`, parent `cfa6c5e8ab1d0703730420b714afa7374b73891c`). This worktree's HEAD at review time was `9f282e4ff0ced8a60bac56ee3625a7a107f25a57`, one later ops commit that adds only `tasks/SOC.30.01/lane-bo/launches/20260927_185402_prompt.txt`. `git diff 64e1f220d49f6baccf661ecd5fb80e05b3e664a3 -- game/js/plugins/DEUS_Mint.js docs/systems/DEUS_MintingEngine.md tools/society/test_minting_engine.js tasks/SOC.30.01/lane-bo/AUTHORITY_GAPS.md tasks/SOC.30.01/lane-bo/REPORT.md` was empty, so the gates and the independent probe loaded the writer-tip bytes.

## Range and allowed paths

`git merge-base refs/remotes/origin/main 64e1f220d49f6baccf661ecd5fb80e05b3e664a3` is `6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0`. The brief base is `0cbe808e8b4c94429738b1cad2f9eda98dff0989`, which is also `aa60db38^`. The lane commits are:

- `aa60db3899222b3ab522c6034d64d71c7a683544` `[pm] open SOC.30.01 conserved minting lane`
- `cfa6c5e8ab1d0703730420b714afa7374b73891c` `[ops] SOC.30.01 lane-bo launch prompt 20260927_183402 (writer codex)`
- `64e1f220d49f6baccf661ecd5fb80e05b3e664a3` `[codex] SOC.30.01 conserved physical minting engine`

`git diff --name-status 0cbe808e8b4c94429738b1cad2f9eda98dff0989 64e1f220d49f6baccf661ecd5fb80e05b3e664a3`:

```text
A	docs/systems/DEUS_MintingEngine.md
A	game/js/plugins/DEUS_Mint.js
A	tasks/SOC.30.01/lane-bo/AUTHORITY_GAPS.md
A	tasks/SOC.30.01/lane-bo/BRIEF.md
A	tasks/SOC.30.01/lane-bo/REPORT.md
A	tasks/SOC.30.01/lane-bo/lane.json
A	tasks/SOC.30.01/lane-bo/launches/20260927_183402_prompt.txt
A	tools/society/test_minting_engine.js
```

All eight paths are inside `tasks/SOC.30.01/lane-bo/lane.json` `allowedPaths`. The writer commit itself adds the engine, the system doc, the gate, `AUTHORITY_GAPS.md`, and `REPORT.md`.

`git diff --name-status 6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0 64e1f220d49f6baccf661ecd5fb80e05b3e664a3` is those eight files plus four files that already differ at the brief base and are untouched by the lane commits: `docs/OWNER_DECISIONS.md`, `docs/STATUS.md`, `docs/society/DEUS_SOCIETY_WBS.md`, `docs/telemetry/sessions/active_workers.json`. A search of that pre-lane diff for mint, metal-unit, electrum, and treasury hits only the existing "Minted SOC.*" task-opening wording. No art, audio, image, or `game/js/plugins.js` path appears in either range. `DEUS_Mint` is absent from `game/js/plugins.js`.

## Gates

Node.js v24.19.0. Both commands were run in this worktree against the writer-tip sources above.

`node tools/society/test_minting_engine.js` — exit 0.

```text
RESULT: 54 passed, 0 failed
```

That total is 48 core checks plus 6 mutation checks. The core lines include `all_denominations_exact_round_trip: cp:ok sp:ok ep:ok gp:ok pp:ok`, `electrum_preserves_equal_integer_components: {"massQuanta":8,"components":{"COPPER":0,"GOLD":4,"PLATINUM":0,"SILVER":4}}`, `integer_mass_scale_from_registered_composition: coin=2q pound=100q`, and `batch_bound_is_arithmetic_not_policy: max=4503599627370495`. Every recorded refusal fixture passed with its expected code and `unchanged=true`.

Mutation section, all killed:

```text
[PASS] mutant_mint_does_not_debit_store_killed: all_denominations_exact_round_trip
[PASS] mutant_assay_can_exceed_store_killed: refuse_assay_over_physical_stores
[PASS] mutant_assay_composition_ignored_killed: refuse_wrong_pure_assay_composition, refuse_unbalanced_electrum_assay
[PASS] mutant_denomination_material_ignored_killed: refuse_denomination_material_mismatch
[PASS] mutant_remelt_loses_one_quantum_killed: all_denominations_exact_round_trip
[PASS] mutant_batch_bound_removed_killed: refuse_unsafe_batch
```

Each of the six mutant anchors occurs once in `game/js/plugins/DEUS_Mint.js`.

`node tools/check_deus_syntax.js` — exit 0.

```text
Checked 61 DEUS plugin files. Errors: 0
```

## Independent conservation probe

A separate Node probe, not part of the lane commit, loaded `DEUS_Mint.js` with the tracked registry, `UF_WorldCatalog.json` item types, and SRD `coinsPerPound: 50`. It kept its own integer ledger (hard-coded recipes below, not `engine.measure`) and required `engine.measure` to match that ledger on every success. Caller snapshots had to be byte-identical after every refusal. Decoy fields had to survive every success: `treasury.balanceCp` 777001, `stores.goods` `{food:42, tools:7}`, `stores.abstractBalanceCp` 123456, and `stores.coinStacks[0].quantity` 99.

Compiled recipes matched the registry and SRD exchange table:

| Denomination | Metal | valueInCp | Component quanta per coin |
|---|---|---:|---|
| cp | COPPER | 1 | COPPER 2 |
| sp | SILVER | 10 | SILVER 2 |
| ep | ELECTRUM | 50 | GOLD 1, SILVER 1 |
| gp | GOLD | 100 | GOLD 2 |
| pp | PLATINUM | 1000 | PLATINUM 2 |

Scale: 2 quanta per coin, 50 coins per pound, 100 quanta per pound. `gold_coin.weight` is 0.02 and `0.02 * 50 === 1`. The engine reads that weight and does not read `gold_coin.value` (1). One metal unit is 2 quanta. One coin is one metal unit.

Exact one-coin results from lots of 400 quanta, assay mass 8, quantity 1, then a full remelt back to the same lot id:

| Path | Mass consumed and returned | Assay remainder | Lot mass after mint | Treasury value delta | Round trip |
|---|---:|---:|---:|---:|---|
| cp | 2 | 6 | 398 | +1 | lot restored, stack removed |
| sp | 2 | 6 | 398 | +10 | lot restored, stack removed |
| ep | 2 | 6 | 398 | +50 | lot restored, stack removed |
| gp | 2 | 6 | 398 | +100 | lot restored, stack removed |
| pp | 2 | 6 | 398 | +1000 | lot restored, stack removed |

Component totals were unchanged across each mint and each remelt. A frozen input minted successfully and stayed at its original mass. Two mints of the same 10-quanta gold lot both returned a 4-quanta lot; the input stayed at 10.

Remainder: a gold lot of 11, assay mass 7, quantity 3. Consumed 6, reported remainder 1, lot left at 5. World mass stayed 19. Gold component quanta stayed 12 (11 from the gold lot plus 1 from a 2-quanta electrum sibling). Silver stayed 3, copper 2, platinum 2.

Electrum: 4 ep from an electrum lot of 20, with 20 quanta of each pure metal beside it. Electrum lot left at 12. Store components were COPPER 20, GOLD 26, PLATINUM 20, SILVER 26. Treasury components were GOLD 4 and SILVER 4. Totals matched the start. Copper and platinum did not move. An electrum lot of mass 1 is rejected at `createState` with `E_STATE`. A pure gold lot of mass 1 is representable and a one-coin mint of it returns `E_INSUFFICIENT_ASSAY` with the lot still at 1.

Registry scale check: minting 100 gp from 200 gold quanta consumes 200 quanta, removes the lot, and yields quantity 100 with treasury value 10000. That is 100 metal units, which is the frozen standard's "100 units Gold" per 100 gp and the registry's `metalUnits: 1`.

Provenance and partial remelt: two gp stacks with the same faction and era, quantities 3 and 5, plus a third stack of another faction, quantity 7. Minting 2 more gp made the first stack 5 and left the others at 5 and 7. Remelting 1 coin at index 1 created a gold lot of mass 2 and left that stack at 4. Remelting the whole first stack then shifted the sealed second stack to index 0 at quantity 4 and left the other faction's stack in place. Eras 3 and 4 did not merge. A sibling silver lot stayed at 6 while a gold lot was fully consumed.

Malformed and separation refusals, each with the caller state unchanged and no `state` property on the failure:

| Case | Code |
|---|---|
| null state, circular state | E_STATE |
| array request | E_REQUEST |
| fractional, negative, or string quantity | E_BATCH_BOUNDS |
| NaN mintEra | E_PROVENANCE |
| assay components as an array, `{GOLD:4,SILVER:0}` on electrum, or an extra silver key on gold | E_ASSAY_COMPOSITION |
| assay lot id aimed at the silver lot, or at `treasury.balanceCp`, or at `goods` | E_ASSAY or E_STORES |
| pp or ep requested from a gold lot | E_MATERIAL |
| remelt with only a decoy `stores.coinStacks` | E_TREASURY |
| stackIndex 0.5 or -1 | E_TREASURY |
| remelt gp into the silver lot id | E_OUTPUT_LOT |

Authority compile refusals: `gp.metalUnits = 0.01` (the handoff's 100-coins-per-unit scale) throws `E_AUTHORITY`; `gold_coin.weight = 0.01` and `coinsPerPound = 49` throw `E_AUTHORITY_CONFLICT`; weight `1/49` throws `E_AUTHORITY` because the ratio is not a safe integer; a missing `gold_coin`, a copper/silver composition clash on one material, and `SILVER.conserved = false` are refused. No conflicting authority compiled into a usable engine.

Bounds, all exact:

- A representable gp stack of quantity `90071992547409` has value `9007199254740900`. Minting one more gp returns `E_BOUNDS` and does not change the input.
- The largest pure copper batch that fits the component multiply is quantity `2251799813685247` (mass `4503599627370494`). It mints to an empty lot and a stack of that quantity, treasury value `2251799813685247`, copper component quanta `4503599627370494`.
- A pure gold lot of mass `4503599627370496` is rejected at creation with `E_BOUNDS`.
- Electrum mass `9007199254740990` can mint quantity `180143985094819` (the value ceiling `floor(MAX_SAFE_INTEGER / 50)`). Consumed mass `360287970189638`, lot left `8646911284551352`, gold and silver component quanta each `4503599627370495`, treasury value `9007199254740950`.
- Remelting 1 gp into a gold lot of `4503599627370493` yields lot mass `4503599627370495` and an empty stack. The same remelt into a lot already at `4503599627370495` returns `E_BOUNDS` with the input unchanged.
- Three gold lots of mass `4503599627370495` can be constructed, and minting them returns `E_BOUNDS` without changing the first lot.

Seeded campaign, LCG seed `0xC0FFEE`, 2000 steps on five 500-quanta lots (origin mass 2500; origin components COPPER 500, SILVER 750, GOLD 750, PLATINUM 500, because the electrum lot contributes 250 gold and 250 silver). Result: 611 successful transforms, 1389 refusals, 0 conservation or separation failures, end mass 2500, end components equal to the origin.

Probe total: `PROBE 57 passed, 0 failed`.

## What was checked against the invariants

INV-SOC-05. Successful mint and remelt keep total mass quanta and the copper, silver, gold, and platinum component quanta unchanged. Electrum is stored as an alloy lot and counted only as equal gold and silver quanta, matching `coreResourceClasses.ELECTRUM.specialRules` and `metalUnits` `{GOLD:0.5, SILVER:0.5}`. Face value changes with the coin form and is derived from physical stacks times the registry `valueInCp`. It is not a stores balance. Refusals discard the internal copy; the caller object is not written. There is no `Math.random`, `Date.`, or `crypto.` in the plugin, and no fee, loss, or seigniorage term.

INV-SOC-06, for this leaf. `DEUS_Mint.js` contains no `balanceCp` and no `goods` identifier. Measure reports `valueInCp` only on `treasury`. Mint reads `stores.monetaryMetalLots`. Remelt reads `treasury.coinStacks[stackIndex]`. The decoy balance, goods, and store-side coin stack stayed put through the campaign. This leaf does not implement famine or food, which the invariant registry assigns to SOC.31.01 and SOC.32.01. The gap file records that those providers are absent.

## Findings

### Nit — recorded gp stack-overflow fixture never reaches the merge

- Severity: nit
- File: `tools/society/test_minting_engine.js:334`
- Evidence: the fixture sets an existing gp stack's quantity to `description.maxBatchCoins` (`4503599627370495`). At `game/js/plugins/DEUS_Mint.js:263`, normalize multiplies that quantity by `valueInCp` 100, which is outside the safe integer range, so the call returns `E_BOUNDS` before the merge at `game/js/plugins/DEUS_Mint.js:385`. The fixture's code and immutability assertions are still true. The representable ceiling is quantity `90071992547409`; minting one more coin there also returns `E_BOUNDS` and leaves the input unchanged, as measured above.
- Effect: none on mass. The refusal holds. The named fixture does not exercise the post-debit merge it describes.
- Status: open
- Verdict effect: none. This is not a mass leak, a missed refusal, or an authority invention.

No blocker, major, or minor defect was found in the mint, remelt, assay, provenance, bounds, or separation paths.

## Unresolved owner-gated authority conflicts

These are recorded in `tasks/SOC.30.01/lane-bo/AUTHORITY_GAPS.md` and were not given a new rule by this lane.

1. Metal-unit contradiction, still open. `docs/systems/DEUS_RESOURCE_ECONOMY_STANDARD.md` §8 says 100 gp contain 100 units of gold, and `game/data/DEUS_ResourceRegistry.json` `currencyAndMinting.denominations.gp.metalUnits` is `1`. `docs/handoffs/HANDOFF_DEUS_TSK_FABLE_20_ECONOMY.md` §6 says minting 100 gp consumes 1 physical gold unit, and melting 100 gp returns 1 unit. The engine follows the standard and the registry: 100 gp consume 200 quanta, which is 100 metal units. Supplying the handoff ratio `0.01` fails compilation with `E_AUTHORITY`. No conversion between those two sentences was invented.
2. No assay skill, equipment, tolerance, uncertainty, or counterfeit rule exists in the cited sources. The core requires an explicit assay whose components exactly match the registered composition. It does not price or perform an assay.
3. `UF_WorldCatalog.json` has `gold_coin` at weight 0.02 and no `copper_coin`, `silver_coin`, `electrum_coin`, or `platinum_coin` item type. The core returns the economy standard's compact provenance stacks and does not add item definitions.
4. SOC.31.01 and SOC.32.01 are not implemented here. The core keeps `stores.monetaryMetalLots` and `treasury.coinStacks` apart and does not choose office, access, or storage policy.
5. Taxes, fees, seigniorage, yield loss, and the foundry step that blends gold and silver into an electrum lot are unspecified as a procedure. The 50/50 composition is enforced for lots and coins that are already electrum. No blend, parting, fee, or loss function was added.
6. `game/js/plugins.js` is outside `allowedPaths`. `UF.Mint` is exported when the file is loaded. This review does not claim an RMMZ F5/F8 load or a global save hook.

## VERDICT: PASS
