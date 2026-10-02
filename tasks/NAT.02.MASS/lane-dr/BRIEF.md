# lane-dr: reclaim and world items store and post centipounds

| Field | Value |
|---|---|
| WBS | NAT.02.MASS (SHARED; merged D2/D3 MASS), part 4 of 7 |
| taskId (manifest) | NAT.02.MASS |
| Branch | `task/lane-dr` |
| Manifest | `tasks/NAT.02.MASS/lane-dr/lane.json` (the PM installs it; draft below) |
| Writer -> reviewer | codex -> grok |
| Size | M |
| Wave | 3 of 19 |
| Dependencies | lane-do2 (merged `968ac67c`; it re-cut lane-do), lane-db (merged `1899d5ea`) |
| RMMZ editor must be closed | no |

Base: `main` at `df911859` or later (DEC-083 is recorded there; the ledger, catalogue and mass tables are integer centipounds since lane-do2). Pin the SHA you start from. Every figure below is the PM drafter's run at `6ee18bf4` in a clean clone (the code in this lane's files is unchanged since); rerun each guard and keep-green suite at your own base before you claim FAIL-before or PASS-after. This lane is the only writer of `game/js/sim/reclaim.js`.

**Rubble drops out (DEC-083, Owner, recorded on main 2026-10-02).** Item 2: no rubble accounting, matter is moved not converted; DEC-065 item 2 (natural collapse rubble reclaim-eligible and registered once) is superseded and this lane's rubble part drops out, while its centipound storage and posting of reclaim and world items stay. This lane therefore scopes only that storage and posting. The four DEC-065 item-2 checks (`natural_rubble_reclaim_eligible`, `collapse_note_posts_once`, `collapse_note_does_not_advance`, `reclaim_runtime_walk_deferred`) are not written, and the runtime-walk scan guard goes with them (PM to confirm: it protects the DEC-057 deferral of reclamation walks and could be restored on its own later). Do not change the exemption default (`reclaim.js:576`, `exempt: o.exempt !== false`), the class and lineage of any posting, or what `note("collapse")` (:815) does beyond the unit rename. The PM re-plans the structure lanes (DEC-083 re-plan list, which includes lane-fr, lane-fo and lane-eq).

## PM rulings at dispatch (2026-10-02, PM; the drafter's "PM to confirm" items)

Writer: **codex** (the plan named claude; the PM moved it to keep Claude's usage for PM work). Base: `main` at `917f2755` or later. Pin the SHA you start from.

1. Doc paths `docs/systems/DEUS_Reclamation.md` and `docs/systems/DEUS_WorldItems.md`: confirmed.
2. The DEC-057 runtime-walk scan guard goes with the DEC-065 item-2 checks (DEC-083 item 2: no rubble accounting); it may return in a lane of its own: confirmed.
3. Error codes `E_UNIT` (a posting without cp) and `E_UNIT_PROVENANCE` (a schema-1 snapshot): confirmed.
4. The `no_mu_identifiers` static scan: keep it, scoped to this lane's four `game/js/sim` files, with a short documented allowlist for identifiers that are not mass units (such as `mutant`); if it cannot be written without false hits, say so in the report and leave it out of the gate rather than weaken it.
5. `massCp` = half-up of weight x 25 / 4, and world-item save `v: 2`: confirmed.
6. `tools/world_items/bench_world_items_100k.js` stays out of allowedPaths: confirmed.
7. `cpPins` handoff: this lane merges first; lane-dp re-pins after merging `origin/main`. Record your `cpPins` values and the reason they moved in the report.
8. Verdicts: `CLEAN PASS`, `PASS` and `PASS WITH MINORS` are all accepted by merge_gate since lane-gk merged.

## Goal

`reclaim.js` and `game/js/sim/world_items` store, name and post integer centipounds (cp): no `mu`, `du` or `massMu` remains in them, and a 3-lb item posts 300 cp (it posts 3 today).

## Preconditions (checked by the drafter at `6ee18bf4`)

1. `reclaim.js` (997 lines) still names and stores mass as `mu`: `blankPlace` :185, `givePlace` :211, `available` :224, `takeMu` :234, `postingAmount` :259 (reads `p.mu`, then `p.du`), `productSpec` :324, `registerCommon` :550 (returns `{ok, mu, cls, form}`), `registerSlice` :556, `registerItem` :579, `registerObject` :603 (reads `line.mu`), `registerHolding` :630, `mine` :648, `build` :686, `postElement` :771, `blocks` :888, `checksum` :914 (field `mu`, :922), `snapshot` :929 (`schema: 1`), `restore` :943 (accepts only 1; it calls `ledger.restore` before it validates the rest), exports `SCHEMA: 1` :997.
2. lane-do2 left `materials.js` emitting `mu` aliases beside `cp` (:88, :153-164, :178-198: posting `mu`, bill `totalMu` and `elementMu`, `unmapped.mu`), and both reclaim suites feed reclaim.js adapted data: `adaptForReclaim` (`tools/sim/test_reclaim.js:20-36`, `tools/sim/test_reclaim_longrun.js:18-33`) copies `cp` to `mu` on the raw `mass_tables.json` rows. Without the adapter base reclaim.js cannot read the cp-only rows: the drafter's probe `registerObject("stump", 1, ...)` on the raw tables throws `E_AMOUNT` (`line.mu` is undefined). `materials.js` is not this lane's; do not rely on its aliases and do not remove them (a later materials.js writer does, after this lane).
3. `world_items`: `catalog.js` header :3, `row` :16 (`massMu: spec.massMu` :25) and 24 rows with a hand-set `massMu` (:54-193; the 3-lb longsword row :52-55 has `weightOz: lb(3)` = 48 and `massMu: 3`, so it books 3 cp = 0.03 lb); `world.js` `massMu` at :95 (`makeItem`), :395-397 (`postRegister`), :430-436 (surface collapse transform), :1163, :1233-1263 (burn and container spill), :1337-1341 (rot), :1442 (copy), :1482 (`serialize`), :1600 (`restoreTree`); `saveChanges` :1526 writes `v: 1` and `loadChanges` :1672 accepts only `v === 1`; `ledger_bridge.js` `recount` reads `item.massMu` (:24). `game/js/sim/units.js` exports `CP_PER_LB` (100) and `kgToCp`, no ounce converter; `OZ_PER_LB` is 16 in `world_items/constants.js`.
4. Neither `DEUS_WorldItems.js` nor `DEUS_Containers.js` is in `game/js/plugins.js`, and no plugin loads `reclaim.js`: class C, no F5 scene exists. Do not enable a plugin to manufacture a screenshot.
5. Green at base (one run each): `check_deus_syntax` 62 files 0 errors; `test_reclaim` 38/38; `test_reclaim_longrun` 20/20; `test_living_world_rules` PASS; `test_world_items` 86/86; `test_ledger` 119/119. (`test_materials` is red at base on `catalog_objects_covered`, not this lane's; lane-dp owns that fix.)

## Scope

- Manifest `tasks/NAT.02.MASS/lane-dr/lane.json`, branch `task/lane-dr`, writer claude, reviewer grok; the gate commands below are its gateTests.
- `reclaim.js`: rename the stored and public mass field `mu` to `cp` everywhere (places, `registerCommon`'s argument and result, `takeMu` -> `takeCp`, `blocks()`, the `checksum()` body, `line.cp`, `unmapped.cp`). `postingAmount` reads `p.cp` only: a posting that carries only `mu` or `du` is refused with `E_UNIT` through the module's existing error path (`soft` or `die`, as strict mode decides) and changes no place and no ledger account. Not a silent skip, not a zero posting. Snapshot schema 1 -> 2 in `snapshot()`, `restore()` and the export; `restore` validates the schema and the places first and refuses schema 1 (`E_UNIT_PROVENANCE`, as `ledger.restore` does) before it touches the session or the ledger. No conversion of old snapshots (no player saves exist).
- `world_items`: `catalog.js` derives `massCp` from `weightOz` by exact integer arithmetic, half up: `massCp = floor((weightOz * CP_PER_LB + OZ_PER_LB / 2) / OZ_PER_LB)` (6.25 cp per oz: 48 oz = 300, 8 oz = 50, 1 oz = 6, 2 oz = 13), with a safe-integer check; every hand-set `massMu` goes. `world.js` and `ledger_bridge.js` carry `massCp` in every spot of Precondition 3 (register, spill, burn, rot, copy, serialize, restore, recount); the ledger amounts are cp, `applyPlan` already passes `step.amount` to `ledger.transform`. `saveChanges` writes `v: 2`; `loadChanges` refuses a blob that is not `v: 2`, or that carries `massMu`, with `E_SAVE` before it changes any state. These stay in `world.js`: no new save or runtime bridge.
- Tests: remove both `adaptForReclaim` adapters and feed cp-only raw data; rename the field in `placeMu` (`test_reclaim.js:62`) and its uses and in `test_living_world_rules.js:547`. The long-run checksum includes field names, so `cpPins` (`test_reclaim_longrun.js:37`) change: explain the representation change, freeze reviewed cp expectations in the owned test, never regenerate in a normal run. The `no_25_over_4` and `accept_mu_records` mutants must reach a named failing assertion.
- Docs: `docs/systems/DEUS_Reclamation.md` (the `mu` wording at :5, :15, :58, :65 and the snapshot schema) and `docs/systems/DEUS_WorldItems.md` (:39: `massMu` is replaced by the weight-derived `massCp`; the save format `v: 2`) (PM to confirm these two paths; the plan lists none).

## Out of scope

- Everything under "Rubble drops out" above; parcels (lane-du, lane-fo); civilization hooks; enabling DEUS_WorldItems; runtime soil, decay or reclamation walks; new art; any edit to `ledger*.js`, `materials.js`, `materials.json`, `mass_tables.json` or units (lane-dp owns the next vocabulary and catalogue change; lane-dq owns transactions); host or plugin registration.
- Anything not in Scope is out of scope (AGENTS.md Rule 1); ideas go to the PM.

## Files this lane may touch (allowedPaths)

- `game/js/sim/reclaim.js`, `game/js/sim/world_items/catalog.js`, `game/js/sim/world_items/world.js`, `game/js/sim/world_items/ledger_bridge.js`
- `tools/sim/test_reclaim.js`, `tools/sim/test_reclaim_longrun.js`, `tools/sim/test_living_world_rules.js`, `tools/world_items/test_world_items.js`
- `docs/systems/DEUS_Reclamation.md`, `docs/systems/DEUS_WorldItems.md` (PM to confirm), `tasks/NAT.02.MASS/lane-dr/**`

merge_gate refuses the merge (SCOPE_VIOLATION) if the branch changes any other path.

### Shared files and merge order

- `reclaim.js`, `world_items/catalog.js`, `ledger_bridge.js`, `test_world_items.js`: this lane is the first and only build writer; `world_items/world.js`: lane-dr -> lane-fo (w6). `test_reclaim.js`, `test_reclaim_longrun.js`: lane-do2 (merged) -> **lane-dr** (last). `test_living_world_rules.js`: lane-db (merged) -> **lane-dr** (last).
- **dr and dp touch one constant together:** lane-dp's ledger vocabulary changes the ledger config fingerprint, which reclaim's `checksum()` embeds through `ledger.checksum()` (drafter's experiment: the pins move to `bc96db4d` and `3ae29884` with the vocabulary alone), and this lane's `mu` -> `cp` rename moves `cpPins` again. Lane-dp may re-pin `cpPins` for its own change; whichever lane merges second merges `origin/main` into its branch (a normal merge, no rebase), recomputes `cpPins` on the combined state and shows the reason, and the PM runs both lanes' gates on the exact combined candidate and records the SHAs. Wave 3 runs beside lane-dd and lane-dp (DEC-078); no other shared file.

## Tests

`FAILS on main` means shown failing at your base with the new check present (it must reach a named failing assertion; a missing module or a harness exception does not count) and passing at your tip (Rule 4). New checks go into the existing owned scripts. Use the real ledger (`createLedger`, `register`, `seal`, `transform`, `amount`, `assertBalanced`); no invented API.

### Must fail without the change

- `tools/sim/test_reclaim.js` ::reclaim_fields_are_cp: with the adapters removed, `registerObject("stump", 1, ...)` on the raw cp-only tables registers its `lines` (base throws `E_AMOUNT`); no place, `blocks()` row, `registerCommon` result or checksum body carries `mu`; `places()` carries `cp` - FAILS on main
- ::posting_amount_reads_cp: a posting with only `mu`, or only `du`, is refused `E_UNIT` and changes no place and no ledger account (compare `session.checksum()` and `ledger.checksum()` before and after) - FAILS on main (it posts the `mu`)
- `tools/world_items/test_world_items.js` ::world_item_mass_matches_weight: every catalog row's `massCp` equals half-up `weightOz x 25 / 4`; the longsword (48 oz) is 300, 1 oz is 6, 2 oz is 13 - FAILS on main (the longsword row books 3)

### Other named checks (pass at the tip)

- `test_reclaim.js` ::reclaim_old_snapshot_refused (a schema-1 snapshot is refused `E_UNIT_PROVENANCE` and the session checksum and the ledger do not change); ::reclaim_snapshot_roundtrip_cp (a schema-2 round trip continues to the same checksum); ::no_mu_identifiers (a scan of `reclaim.js` and `world_items/*.js` code with comments and strings removed finds no `mu`, `du`, `.mu`, `massMu`; it must fail on a planted file that has one).
- `test_world_items.js` ::world_item_ledger_cp (place the 3-lb longsword through `createWorld` with a real ledger, `seal()`, `amount("steel", "item") === 300`, `assertBalanced(world.ledgerRecount())`; the existing spill, burn and rot paths stay balanced); ::world_item_old_save_refused (a `v: 1` blob, and a `v: 2` blob that carries `massMu`, are refused `E_SAVE` and `saveChanges()` before and after is identical); the existing save round-trip checks run on cp-only records. These are headless proofs, not proof that a runtime bridge is connected.

### Mutants and provocations

- `no_25_over_4` (the 25/4 factor dropped) -> `world_item_mass_matches_weight`. `accept_mu_records` (`postingAmount` falls back to `p.mu`) -> `posting_amount_reads_cp`. The existing leak and duplicate injections (`test_reclaim.js:221,230,254`, `test_reclaim_longrun.js:103`) keep failing their runs. Mutants edit text in memory; files on disk are never rewritten.

### Gate commands (lane.json gateTests; each runs in a fresh clone, 900 s timeout)

- `node tools/check_deus_syntax.js`; `node tools/sim/test_reclaim.js`; `node tools/sim/test_reclaim_longrun.js`; `node tools/sim/test_living_world_rules.js`; `node tools/world_items/test_world_items.js`; `node tools/sim/test_ledger.js` (read-only keep-green). A red gate that is not yours goes to the PM; never substitute a shorter command or weaken a gate.

## lane.json (draft)

```json
{ "lane": "lane-dr", "taskId": "NAT.02.MASS", "branch": "task/lane-dr", "writer": "codex", "reviewer": "grok",
  "allowedPaths": ["game/js/sim/reclaim.js", "game/js/sim/world_items/catalog.js", "game/js/sim/world_items/world.js", "game/js/sim/world_items/ledger_bridge.js",
    "tools/sim/test_reclaim.js", "tools/sim/test_reclaim_longrun.js", "tools/sim/test_living_world_rules.js", "tools/world_items/test_world_items.js",
    "docs/systems/DEUS_Reclamation.md", "docs/systems/DEUS_WorldItems.md", "tasks/NAT.02.MASS/lane-dr/**"],
  "gateTests": [
    {"cmd":"node","args":["tools/check_deus_syntax.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/sim/test_reclaim.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/sim/test_reclaim_longrun.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/sim/test_living_world_rules.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/world_items/test_world_items.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/sim/test_ledger.js"],"timeoutSec":900} ] }
```

## F5 evidence

None: class C (Precondition 4). The editor stays closed (DEC-059) and this lane touches neither `game/js/plugins.js` nor an RMMZ database file. If you want a smoke run, use a snapshot copy of `game/`: `node tools/add_test_plugin.js <copy>/js/plugins.js`, then `node tools/run_tests.js smoke --game <copy>`; it proves only that no plugin broke. If you cite a screenshot, open it first and describe what is in it (Rule 5). Say in the report that no in-game scene was observed.

## GAME TRANSLATION (class C, foundational; the diff touches `game/`)

- **Effect:** a world item and a reclaim place carry their real weight in cp, so later collapse, spill, burn and rot postings neither inflate nor lose mass (a 3-lb item posted 3 cp before). Trigger: headless item placement, catalogue postings, or a later notification from the collapse bridge. Authority: `ledger.js` alone owns balances; `reclaim.js` owns the places; `world_items` owns each item's `massCp` and `ledgerRecount`. Path: `createReclaim` -> `register*`/`note` -> `ledger.transform`; `createWorld` -> placement -> `ledgerRecount` -> `assertBalanced`.
- **Bridge:** DEFERRED: world items and reclaim are loaded by no plugin, and the structure and collapse lanes that would drive them are being re-planned (DEC-083); `DEUS_WorldItems.js` stays disabled. Persistence: reclaim snapshot schema 2 and world-item save `v: 2`, refused when old, no conversion. Failure without it: a 3-lb item books 3 instead of 300, legacy `mu` readers miss cp postings, snapshots mix units. Proof: the gate commands above, headless only. Consumers: whatever the re-plan keeps (world items, mining and salvage postings through `note`); none is run here.
- Report simulation, engine bridge, presentation, input, save/load and playable verification as YES/NO with evidence; "not checked" where not observed.

## Writer and reviewer

- Writer `claude` (family claude), reviewer `grok` (family grok): different families, as merge_gate requires (claude and fable are one family). Authority: DEC-031 item 1, DEC-058, `docs/CANONICAL_ROLES.md` section 2.1 (D2/D3 lanes may take a Claude writer); DEC-078 (several lanes per provider; this lane does not wait for another lane's writer or reviewer).
- Authors `deus-codex` (tag `[codex]`) and `deus-grok` (tag `[grok]`). The review is a real launch through `tools/ops/launch_worker.ps1`; the review commit is the branch tip (one parent), touches only `tasks/NAT.02.MASS/lane-dr/review_grok_<sha8>.md`, which holds the full 40-character SHA of the last non-review commit and ends with exactly one verdict line: `VERDICT: CLEAN PASS` or `VERDICT: PASS`; `VERDICT: PASS WITH MINORS` only after lane-gk (DEC-085 item 2) merges (merge_gate at `6ee18bf4` refuses it, `tools/governance/merge_gate.js:234`; PM to confirm at launch). The reviewer runs every gate on the writer's tip in a fresh clone.

## Rules that bind this lane

- DEC-085: main takes only merges and PM commits. Commit only on `task/lane-dr`, staging only the allowedPaths (`git add <paths>`, never `-A`); push the branch; the final message ends with `FINAL SHA: <40 hex>`. The manifest and this brief are the PM's: a writer commit that changes either triggers MANIFEST_TAMPERED. Mail is local files. Do not leave background test processes running when you finish.
- Mass is integer centipounds in a closed ledger (DEC-038, DEC-040); soil, decay and reclamation walks stay deferred (DEC-057, DEC-059 item 4); no art (DEC-007); engine core read-only (Rule 9); tests must be able to fail (Rule 4); no per-frame full scans (Rule 14); two failed fixes on one problem: stop and ask (Rule 10).
- Report: one paragraph per AGENTS.md format plus the real test output and the GAME TRANSLATION block above.
