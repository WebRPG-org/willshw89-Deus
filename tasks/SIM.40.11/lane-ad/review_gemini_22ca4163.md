# Independent Review: Lane AD (Task SIM.40.11)

**Reviewer:** Gemini (non-author independent review)  
**Writer:** Grok (grok-4.7 xhigh)  
**Target Commit (FINAL SHA):** `22ca41636638d47426f6f1d35b74586873c3800d`  
**Merge Base:** `1c2fcc28736566f8dd4f14ccd0633f09687e3521` (`origin/main`)  
**Lane:** `lane-ad`  
**Branch:** `task/lane-ad`  

---

## 1. SHA and Branch Verification

```
git rev-parse HEAD origin/task/lane-ad
22ca41636638d47426f6f1d35b74586873c3800d
22ca41636638d47426f6f1d35b74586873c3800d

git log -12 --format="%H %an %s"
22ca41636638d47426f6f1d35b74586873c3800d deus-grok [grok] SIM.40.11 Post matter moves and outdoor reclamation through the mass ledger
5e09b94e6df9dbd7cc78fef9bc7fdbab75ed4c5a deus-pm [pm] Open lane-ad (SIM.40.11): BRIEF.md and lane.json
1c2fcc28736566f8dd4f14ccd0633f09687e3521 deus-pm Merge task/lane-aa: WG.00.17 Z-range one setting, 32 layers (-16..+15), sparse storage, 2-ft strata (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner ruling 20:45 CT replacing the Pro second pass, VERDICT: PASS WITH NOTES (0 BLOCKER, 0 MAJOR) at 212ddf060c41925bfd5e71d88f165cc606433510 / review d2c6614f5b403d397089728f0412a7b14057b430; earlier Flash PASS 705bf9ba9e7af37d44731bcf46ca4d3ea154b61d; writer grok tip 212ddf060c41925bfd5e71d88f165cc606433510)
d2c6614f5b403d397089728f0412a7b14057b430 deus-gemini [gemini] WG.00.17 review final 212ddf06
c1bb4469772b0763dc257bf2aa6c61256532772e deus-pm Merge task/lane-al: WG.20.01 A9b+A9c items 12-43 + section F + addendum 0509 (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner ruling 20:45 CT, VERDICT: CLEAN PASS at c70736fdf535e2579bb48789e8d9057420b2dcf9 / review c17da05f9feafa15601ee13cce30505bb1683749; writer grok tip c70736fdf535e2579bb48789e8d9057420b2dcf9)
c17da05f9feafa15601ee13cce30505bb1683749 deus-gemini [gemini] WG.20.01 review c70736fd
684c9513d181a844f9a06c4f34021f40ee2cafb1 snewt [gemini] 0119-DO/0120-DP: Lane AA Pro launch quota-blocked; AA/AL reviews held until Pro reset ~2026-09-27 19:04 CT
7a5d50a319bc3ef05bb0b23692a5096aba35073a snewt [gemini] 0118-DN: Lane AL A9c item 43 FINAL recorded; review held for Pro
c70736fdf535e2579bb48789e8d9057420b2dcf9 deus-grok [grok] WG.20.01 A9c item 43 whole-sprite characters and eight directions
3d2a719741efe1941a03350731e797c7faca21f2 snewt [gemini] 0117-DM: Lane AL A9c item 43 addendum 0509 recorded
0885b8791289a030664b30dc2ec2513680c7e3db snewt [gemini] 0116-DL: Lane AL WG.20.01 A9c item 43 LAUNCHED
bdf4401abf1943637530cd5b61651feb9357e4b5 deus-pm [pm] WG.20.01 A9c item 43 addendum 0509 (Owner 17:09 CT rulings)
```

Target commit is verified as `22ca41636638d47426f6f1d35b74586873c3800d`.

---

## 2. Scope and Allowed Paths Verification

Merge base with `origin/main`: `1c2fcc28736566f8dd4f14ccd0633f09687e3521`.

### Raw `git diff --name-status 1c2fcc28736566f8dd4f14ccd0633f09687e3521 22ca41636638d47426f6f1d35b74586873c3800d`

```
A	docs/systems/DEUS_Reclamation.md
M	game/js/plugins/DEUS_Floors.js
M	game/js/plugins/DEUS_Items.js
M	game/js/plugins/DEUS_Jobs.js
M	game/js/plugins/DEUS_Objects.js
M	game/js/plugins/DEUS_Walls.js
A	game/js/sim/reclaim.js
A	tasks/SIM.40.11/lane-ad/BRIEF.md
A	tasks/SIM.40.11/lane-ad/REPORT.md
A	tasks/SIM.40.11/lane-ad/lane.json
A	tools/sim/fixtures/reclaim/checksums.json
A	tools/sim/fixtures/reclaim/schedule.json
A	tools/sim/test_reclaim.js
A	tools/sim/test_reclaim_longrun.js
```

### Scope Comparison Table

| Path | Status | Allowed by lane.json | Notes |
|---|---|---|---|
| `docs/systems/DEUS_Reclamation.md` | Added | Yes (`docs/systems/DEUS_Reclamation.md`) | Reclamation system documentation |
| `game/js/plugins/DEUS_Floors.js` | Modified | Yes (`game/js/plugins/DEUS_Floors.js`) | Reclaim/matter build, deconstruct, deck hooks |
| `game/js/plugins/DEUS_Items.js` | Modified | Yes (`game/js/plugins/DEUS_Items.js`) | Item appear/remove tracking |
| `game/js/plugins/DEUS_Jobs.js` | Modified | Yes (`game/js/plugins/DEUS_Jobs.js`) | Mine 4 slices, build post, tick post |
| `game/js/plugins/DEUS_Objects.js` | Modified | Yes (`game/js/plugins/DEUS_Objects.js`) | Guard ore before setIn, harvest post |
| `game/js/plugins/DEUS_Walls.js` | Modified | Yes (`game/js/plugins/DEUS_Walls.js`) | Export `Walls.collapse` hook |
| `game/js/sim/reclaim.js` | Added | Yes (`game/js/sim/reclaim.js`) | Pure reclamation and matter posting module |
| `tasks/SIM.40.11/lane-ad/BRIEF.md` | Added | Yes (`tasks/SIM.40.11/**`) | Task brief |
| `tasks/SIM.40.11/lane-ad/REPORT.md` | Added | Yes (`tasks/SIM.40.11/**`) | Writer report |
| `tasks/SIM.40.11/lane-ad/lane.json` | Added | Yes (`tasks/SIM.40.11/**`) | Lane specification |
| `tools/sim/fixtures/reclaim/checksums.json` | Added | Yes (`tools/sim/fixtures/reclaim/**`) | Pinned checksum fixture |
| `tools/sim/fixtures/reclaim/schedule.json` | Added | Yes (`tools/sim/fixtures/reclaim/**`) | 4000-tick event schedule fixture |
| `tools/sim/test_reclaim.js` | Added | Yes (`tools/sim/test_reclaim.js`) | Unit tests and mutation tests |
| `tools/sim/test_reclaim_longrun.js` | Added | Yes (`tools/sim/test_reclaim_longrun.js`) | 4000-tick long-run determinism test |

### Prohibited Path Verification
- `docs/STATUS.md`: NOT modified.
- `docs/OWNER_DECISIONS.md`: NOT modified.
- WBS files (`DEUS_WORLDGEN_WBS.md`, etc.): NOT modified.
- `game/js/plugins.js`: NOT modified.
- `game/js/plugins/DEUS_Core.js`: NOT modified.
- `art/**` / `game/img/**`: NOT modified (0 art generated/modified, adhering to DEC-007).
- `game/data/sim/**`: NOT modified.
- `game/js/sim/ledger.js`: NOT modified.
- `game/js/sim/materials.js`: NOT modified.
- No files modified outside `allowedPaths`.

---

## 3. Fresh Clone Gate Test Execution

All tests were executed in a fresh isolated temporary clone (`temp_clone_22ca4163`) detached at `22ca41636638d47426f6f1d35b74586873c3800d`. The clone was deleted after verification.

### Test A: `node tools/sim/test_reclaim.js`
```
PASS catalogue validates
PASS reclaim has no host calls
PASS vm load
PASS mine four slices
PASS mine keeps one floor slice
PASS mine posts the slice mass
PASS legacy two stone is not the ledger mass
PASS mine family constant
PASS soil mine stays soil
PASS build campfire
PASS collapse campfire
PASS deconstruct wall
PASS ore harvest keeps the gram
PASS unsealed ore placement is registration phase
PASS sealed ore placement is refused
PASS exempt iron stays metal
PASS gold stays scrap
PASS finite families constant
PASS bone rots to one humus block
PASS bone family constant
PASS rubble reclaims to stone
PASS wood reclaim reaches humus
PASS snapshot restore
PASS tampered place fails recount
PASS good snapshot again
PASS duplicated gram is caught
PASS leaked gram is caught
PASS sealed unpaid deck
PASS undeclared item creates nothing
PASS mutant leak gram fails the run
PASS mutant duplicated gram fails the run
PASS same seed same checksum
PASS jobs posts mine build and tick
PASS objects guard ore and post harvest
PASS floors post build deconstruct and deck
PASS items post appear and remove
PASS walls post collapse
PASS unmapped tin is not invented
RESULT: 38 passed, 0 failed
EXIT=0
```

### Test B: `node tools/sim/test_reclaim_longrun.js`
```
PASS seed 1 conserves for 4000 ticks
PASS seed 1 deterministic
PASS seed 2 conserves
PASS seeds differ
PASS seed 1 exempt iron untouched
PASS seed 1 outdoor iron is trace
PASS seed 1 gold scrap remains
PASS seed 1 ore mass unchanged
PASS seed 1 gem family unchanged
PASS seed 1 humus block formed
PASS seed 1 closure
PASS seed 2 exempt iron untouched
PASS seed 2 outdoor iron is trace
PASS seed 2 gold scrap remains
PASS seed 2 ore mass unchanged
PASS seed 2 gem family unchanged
PASS seed 2 humus block formed
PASS seed 2 closure
PASS pinned checksums
PASS injected gram fails the long run
CHECKSUM seed1 07830127
CHECKSUM seed2 d082be50
RESULT: 20 passed, 0 failed
EXIT=0
```

### Test C: `node tools/sim/test_ledger.js`
```
WG.65.15 ledger tests; node v24.19.0; files: game/js/sim/ledger.js, game/js/sim/ledger_defaults.js
PASS load_in_bare_vm_context (ECMAScript built-ins only; Math.random throws; Date removed)
PASS purity_dynamic_context_is_bare (undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,threw)
...
mutants: 42; run time 8833 ms
RESULT: 117 passed, 0 failed
EXIT=0
```

### Test D: `node tools/sim/test_materials.js`
```
PASS clean_validate
PASS determinism_checksum
PASS purity_clean
...
PASS water_thaw_du
PASS yield_lists_post
RESULT: 107 passed, 0 failed
EXIT=0
```

### Test E: `node tools/check_deus_syntax.js`
```
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

---

## 4. Verification of Implementation Details and Claims

1. **Matter Conservation & Ledger Integration:**
   - `game/js/sim/reclaim.js` uses `game/js/sim/ledger.js` as the single accounting authority without modifying `ledger.js` or `ledger_defaults.js`.
   - Masses and yields are read strictly from `game/js/sim/materials.js` (`massOf`, `yieldOf`, `billOfMaterials`, `reclaimTarget`).
   - Slices mined adhere to 32-layer Z-range geometry (4 slices mined per solid cell, retaining 1 slice as S0 floor).
2. **Reclamation Paths:**
   - Outdoor loose materials follow the published ledger transforms (`pathSteps` walking `weather:rubble->sediment`, `rot:wood->humus`, rust, lithify).
   - Exempt piles (marked `exempt: true`, e.g. items held/carried/contained/active structures) are bypassed by `eligible()`.
3. **Plugin Decoupling:**
   - In `DEUS_Jobs.js`, `DEUS_Walls.js`, `DEUS_Floors.js`, `DEUS_Objects.js`, and `DEUS_Items.js`, matter operations check `window.UF && UF.Matter`. When absent, all calls return `{ ok: true, unbound: true }` without modifying existing behavior.
4. **Purity and Determinism:**
   - `reclaim.js` has no host calls, no `Math.random`, no `Date`, no `console`.
   - Long-run deterministic checksums for seeds 1 and 2 are pinned and verified.
   - Mutants with +1 or -1 mass leak/duplicate are reliably caught by recount and baseline checks.
5. **Decisions and Policies:**
   - DEC-007 (Art Freeze): Verified, 0 art assets generated or touched.
   - DEC-011 / DEC-028 (Mass Conservation): Conserved integer `mu` strictly balanced.
   - Open Owner decisions (D-1 calendar, D-MU-UNIT, vein grade, D-TIN, etc.) are explicitly left undecided and documented.

---

## 5. Findings

- **BLOCKER:** None
- **MAJOR:** None
- **MINOR:** None

---

## 6. Verdict

VERDICT: CLEAN PASS
