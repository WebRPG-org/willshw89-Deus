# SOC.40.02 review (Grok)

Reviewed commit: 0aba77f2582a0673a4952f96575ca8b7ceda0038

The implementation under review is writer tip c42519986358a51bb5e46bfda4c87aed9193aa3d (`[codex] SOC.40.02 deterministic militia planner`, author `deus-codex`, 2026-09-27T19:47:04-05:00). Merge base with `main` is 368632d629bb65a773ee8c204578d7bf1ab74c61. The branch tip this review sits on is the ops launch-prompt commit above that writer tip. `git diff --stat c42519986358a51bb5e46bfda4c87aed9193aa3d 0aba77f2582a0673a4952f96575ca8b7ceda0038` is only `tasks/SOC.40.02/lane-bq/launches/20260927_195448_prompt.txt` (7 lines). The blobs of `game/js/sim/society/DEUS_Militia.js`, `tools/society/test_militia.js`, and `docs/systems/DEUS_Militia.md` are identical at both commits (`3ad63613227d2641f6b9e207a843741d90468b40`, `9da3e7ce43d2bb4510e5fc3773c08dfe88681623`, `b684032936ea1d4a4de39968454514f4e22e455f`).

Commands ran in this worktree at 0aba77f2582a0673a4952f96575ca8b7ceda0038. The working tree was clean.

## Scope

`git diff --name-only 368632d629bb65a773ee8c204578d7bf1ab74c61 0aba77f2582a0673a4952f96575ca8b7ceda0038` lists nine paths. Each matches `tasks/SOC.40.02/lane-bq/lane.json` `allowedPaths`.

| Path | Status | Allowed |
|---|---|---|
| `docs/systems/DEUS_Militia.md` | A | yes |
| `game/js/sim/society/DEUS_Militia.js` | A | yes |
| `tasks/SOC.40.02/lane-bq/BRIEF.md` | A | yes |
| `tasks/SOC.40.02/lane-bq/REPORT.md` | A | yes |
| `tasks/SOC.40.02/lane-bq/lane.json` | A | yes |
| `tasks/SOC.40.02/lane-bq/launches/20260927_185530_prompt.txt` | A | yes |
| `tasks/SOC.40.02/lane-bq/launches/20260927_195448_prompt.txt` | A | yes |
| `tasks/SOC.40.02/lane-bq/state.md` | A | yes |
| `tools/society/test_militia.js` | A | yes |

The same command limited to `art`, `game/audio`, `game/img`, and `docs/art` printed no paths. No image, audio, or catalogue file is in the delta. The module is CommonJS, exports no engine wrapper, and is not referenced from `game/js/plugins`. Its only `require` is `./identity` (`DEUS_Militia.js:6`). `defaultsFrom` and `loadUnitData` in the pre-existing identity module are not called. Selection reads `alive`, `eligibility`, `serviceStatus`, `eligiblePostIds`, caller priority, and caller tie-break. `assertIdentity` (`DEUS_Militia.js:189-209`) checks the SOC.10.01 record and does not feed craft, office, or class into assignment.

## Gates

| Command | Exit | Evidence |
|---|---|---|
| `node tools/society/test_militia.js` | 0 | `RESULT: 280 passed, 0 failed` after 29.11s. 201 baseline/negative checks and 79 source mutants. Every mutant line was `PASS`, including `mutant_fixed_half_population_ratio`, `mutant_fixed_ten_percent_population_ratio`, `mutant_population_threshold_blocks_small_factions`, `mutant_assign_dead_people`, `mutant_assign_ineligible_people`, `mutant_infer_authorization_from_fighter_class`, `mutant_drop_all_displacement_evidence`, `mutant_truncate_duty_provenance`, `mutant_skip_aggregate_capacity_guard`, `mutant_skip_aggregate_demand_guard`, `mutant_accept_ambiguous_candidate_ties`, `mutant_collapse_plan_depth_headroom`, and `mutant_validate_request_always_accepts`. |
| `node tools/check_deus_syntax.js` | 0 | `Checked 60 DEUS plugin files. Errors: 0` |
| `node --check game/js/sim/society/DEUS_Militia.js` | 0 | no stdout |
| `node --check tools/society/test_militia.js` | 0 | no stdout |

The syntax gate reads `game/js/plugins/DEUS_*.js` only. The new planner is not a plugin. The militia gate loads it in a VM with `Math.random` throwing, `Date` absent, and `require` limited to `./identity`. `node --check` covers the new file directly.

An independent probe outside the lane tree, deleted after the run, exited 0 on 18 checks against the same module. Those checks are the evidence in the sections below.

## INV-SOC-07 and the six status tokens

INV-SOC-07 in `docs/INVARIANT_REGISTRY.md` rejects a universal military/civilian ratio and lists `NONE`, `RESERVE`, `MILITIA`, `GUARD`, `PROFESSIONAL`. The parenthetical omits `ELITE_RETINUE`. The tracked sources that name the status vocabulary include it:

- `docs/society/DEUS_SOCIETY_WBS.md` SOC.40.01: `NONE`, `RESERVE`, `MILITIA`, `GUARD`, `PROFESSIONAL`, `ELITE_RETINUE`
- `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md` military service status list, same six tokens
- `docs/systems/DEUS_FactionPlans.md` obligation bucket, same six tokens, with the registry omission left as an open question

`SERVICE_STATUSES` (`DEUS_Militia.js:10-12`) is that six-token list, frozen. The probe could not push a seventh token. `isStatusAuthorized` (`DEUS_Militia.js:394-396`) is true only when the supplied token is in `policy.allowedStatuses` and is not `NONE`. `NONE` in the allowed list throws `E_POLICY` (`DEUS_Militia.js:344`). A person with `serviceStatus: "NONE"`, craft `BLACKSMITH`, office `MARSHAL`, and `srd:class:fighter` level 20, against a policy that allows every other status, produced zero assignments and refusal `NONCOMBATANT_STATUS`. No order carried `ELITE_RETINUE`. `RESERVE` and `ELITE_RETINUE` assigned only when that exact token was in `allowedStatuses`. A `MILITIA` person under an `ELITE_RETINUE`-only policy was `STATUS_NOT_AUTHORIZED`.

Demand is `requirement.requested` (`DEUS_Militia.js:420`). The limit is `Math.min(need, post.capacity)` (`DEUS_Militia.js:421`). No read of `people.length` sizes a plan. The source has no `population`, `ratio`, `Math.floor`, `Math.ceil`, or `Math.round`. The probe held population at 8 and varied requested staffing through 0, 1, and 7; assignments were 0, 1, and 7. One eligible person with requested 1 assigned 1. Populations 3, 17, and 40 with requested 3 each assigned 3. An unknown top-level `populationRatio` throws `E_INPUT`.

The lane does not edit `docs/INVARIANT_REGISTRY.md`. Following the six-token WBS and person list, and leaving the registry sentence for its owner, is the recorded boundary. It is not a derived status.

## INV-SOC-08

`displacedCivilianDuties` receives one record when an assigned person's supplied `currentDuty.category` is `CIVILIAN_ECONOMIC` (`DEUS_Militia.js:463-469`). The copy is `cloneData` of the whole duty. The probe assigned a `PROFESSIONAL` whose duty was `HARVEST_FIELD` / `CIVILIAN_ECONOMIC` with nested `crop`, a `rows` array, `expectedLoss: null`, and an extra `harvestKg` object. `canonicalStringify` of `previousDuty` matched the supplied duty. A `GUARD` on `NON_ECONOMIC` patrol was assigned, kept that duty on the order, and produced no displacement row. A dead person with a stale `eligible: true` and an economic duty, and an ineligible professional with an economic duty, produced refusals `DEAD` and `INELIGIBLE`, zero assignments, and zero displacement rows. Mutating the displacement copy left the order's `previousDuty` and the input duty unchanged. Replacing the crop id made `validatePlan` return `ok: false`.

The module does not compute production, harvest, money, or recovery loss. SOC.42.01 is the WBS owner of that calculation (`docs/society/DEUS_SOCIETY_WBS.md`). The brief puts loss calculation outside this lane. Preserving the caller duty is the lane's share of INV-SOC-08.

## Caller inputs, rejection, and determinism

Threat key, allowed statuses, alive, eligibility reason and source, eligible post ids, post kind, capacity, requested count, priority, and tie-break are required fields. Missing authority throws `E_AUTHORITY_GAP`. A policy threat key that differs from the threat throws `E_AUTHORITY_GAP`. Equal `(priority, tieBreak)` pairs inside one list throw `E_NONDETERMINISTIC_TIE` (`DEUS_Militia.js:240-250`). There is no id or insertion-order fallback.

Duplicate person ids, duplicate post ids, and eligible post ids that name no supplied post throw `E_DUPLICATE` or `E_REFERENCE`. A hostile plan that repeats a person fails `validatePlan` with `person is assigned more than once`. Post kind `TOWER` throws `E_INPUT`. People and posts whose `factionId` differs from the threat throw `E_REFERENCE` (`DEUS_Militia.js:289`, `DEUS_Militia.js:307`).

Capacity and requested counts are non-negative safe integers. Aggregates use `safeAdd` (`DEUS_Militia.js:173-177`, `295-298`, `372-375`). The probe accepted one post at `Number.MAX_SAFE_INTEGER` capacity and another at 0, with requested counts 0 and `Number.MAX_SAFE_INTEGER`. Summary `requested`, `availableCapacity`, and `unfilled` stayed on that safe integer, and the zero-demand post assigned nobody. Adding 1 to the zero requested count threw `E_POLICY`. Raising the zero capacity to 1 threw `E_INPUT`. A three-person request with capacity 1 and requested 3 assigned one person, recorded `POST_CAPACITY`, and refused the other two with `POST_CAPACITY_EXHAUSTED`. A plan that pushed a second assignment onto that post failed `validatePlan` on capacity. Zero capacity with requested 2 assigned nobody and refused both people with `POST_CAPACITY_EXHAUSTED`.

Lower caller `priority`, then lower `tieBreak`, sorts first. With tie-breaks `Number.MAX_SAFE_INTEGER` and 0 on one post of capacity 1, person 2 (tie-break 0) was selected. Reversing people, posts, allowed statuses, candidate rows, post rows, and eligible-post arrays left `canonicalStringify` unchanged. A repeated call on the same request matched. A frozen request planned successfully. A fractional capacity threw `E_INPUT` and left the request snapshot unchanged.

`copyPlainData` runs before sorting (`DEUS_Militia.js:271`). Own `__proto__` provenance survived on the displacement record, validated, and appeared in `canonicalStringify`. It did not change who was selected.

A post `source` chain of 124 wrappers around a leaf was accepted, and `validatePlan` plus `canonicalStringify` succeeded. One more wrapper threw `E_DATA`. The mutant that drops plan depth headroom from 136 to 128 is killed by `accepted_depth_boundary_roundtrips`.

## Greedy allocation

`buildPlan` walks post requirements in caller order and takes the first still-available person in caller order until `min(requested, capacity)` (`DEUS_Militia.js:417-427`). It does not backtrack.

Probe: person 1 eligible for gate 201 and wall 202 at priority 0; person 2 eligible only for wall 202 at priority 1; wall 202 has post priority 0; gate 201 has post priority 1; each post requests 1 and has capacity 1. The plan assigned `1:202` only. Person 2 was `DEMAND_SATISFIED`. Gate 201 was unfilled with `NO_AVAILABLE_PERSON`. The same canonical plan came back after reversing the input arrays. A maximum-cardinality matching would have put person 2 on the wall and person 1 on the gate. The module documents this limit (`docs/systems/DEUS_Militia.md` allocation procedure; `tasks/SOC.40.02/lane-bq/REPORT.md` decisions needed). The brief requires a deterministic trace to explicit threat, eligibility, policy, capacity, and tie-break, and it forbids inventing an optimization rule that tracked authority does not state. The greedy scan is that recorded boundary. It adds no ratio, class preference, or hidden post preference.

## What this lane leaves to a later owner

These are recorded and checked boundaries.

- How an observation becomes a threat key, which statuses answer it, who is eligible, which posts they may hold, how many slots are requested, what capacity is free, and every priority and tie-break stay caller inputs.
- `RESERVE` is not auto-activated by a crisis word in the threat key. The person spec says reserve is for existential crises. This lane does not invent the threshold. The caller lists `RESERVE` in `allowedStatuses` or the person is `STATUS_NOT_AUTHORIZED`.
- Economic loss numbers stay with SOC.42.01. The displaced duty record is the evidence handed forward.
- The registry sentence for INV-SOC-07 still omits `ELITE_RETINUE`. The invariant owner can add the word. This lane does not edit that file.
- The planner returns data. It does not register a plugin, schedule duty, move a unit, transfer equipment, resolve combat, or write a save. `docs/STATUS.md` is outside the whitelist; the task-local state file records the claim instead.

VERDICT: PASS
