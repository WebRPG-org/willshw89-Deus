# Natural-world WBS id crosswalk (merged D1, WORK-GATE G02)

**Date:** 2026-10-01 · **Kept by:** the PM (Claude) · **Status:** ready to publish as `docs/worldgen/NW_ID_CROSSWALK.md` (a PM governance edit under DEC-051 item 1; WBS Rev 33 cites that path).
**Authority:** WORK-GATE G02, merged (braintrust, binding; `C:/Users/snewt/.deus_pm/braintrust/2026-10-01/WORK-GATE-G02_merged_chatgpt_pro.md`, sections 3 and 4). DEC-058 lets the PM settle design open questions; G02 says new ids need "a live-board collision check, not an Owner gate".
**Why:** the merged D1 design (`C:/Users/snewt/.deus_pm/braintrust/2026-10-01/DESIGN-D1_merged_grok_heavy.md`, sections 3.4 and 4) names its leaves WG.00.18, WG.62.02, WG.62.03, WG.62.04 and WG.62.05. Two of those ids already have other meanings on main. One id must have one completion meaning.

## 1. The crosswalk

| Merged D1 id | Canonical id | Meaning | Lanes (plan of 2026-09-30 as amended by G02) | Primary manifest |
|---|---|---|---|---|
| WG.00.18 "sparse save" | **WG.00.43** | Sparse outer save: no save entry for an unchanged outer level; one-shot migration marker `WG.00.43` | da (save and init only) | `tasks/WG.CELL-WRITE/lane-da/lane.json`, cross-referenced to WG.00.43 |
| WG.62.02 "band-correct stone" | **WG.00.30** (existing "Geology-First Worldgen Layer") | `bands.js` six-row DEC-038 table, `geologyAt`, GEN=6 `bandBaseline`, labels and material mapping, the first committed geology witness below -2 | df (D1-GEO fields), dg (CELL application and native witness). Incomplete until both are accepted | df: `tasks/WG.00.30/lane-df/`; dg: `tasks/WG.CELL-WRITE/lane-dg/`, cross-referenced to WG.00.30 |
| (none; existing leaf) | **WG.62.02** (existing "Race Home-Layer Assignment in WorldGen") | Race starts only, on the merged D4 | ez (pure solver), fb (New Game wiring), fh (reachability audit). Not complete until fh passes | `tasks/WG.62.02/<lane>/` |
| WG.62.03 "caves/ravines/shafts" | **WG.62.03** (reserved) | `voidAt`, `chunkCarveMask`, connected Lowlands-Caverns morphology, shafts folded into `voidAt` | dh (D1-GEO manifold), fn (D1-GEO home pockets; deliverable WG.64.13), di (CELL application) | dh and fn: `tasks/WG.62.03/<lane>/`; di: `tasks/WG.CELL-WRITE/lane-di/` |
| WG.62.04 "magma/core" | **WG.62.04** (reserved) | `magmaAt`, `chambersFor`, `chamberId`, `initialFluidSeeds`; chamber geometry; core and chamber accounts through MASS | dl (D1-GEO producer and WorldGen calls), dq (NAT.02.MASS part 5: `ensureCore`/`ensureChamber`), dj (CELL geometry and stamps; removes the `z === -2` lava branches) | dl: `tasks/WG.62.04/lane-dl/`; dj: `tasks/WG.CELL-WRITE/lane-dj/` |
| WG.62.05 "D1-reg freeze" | **WG.62.05** (reserved) | `registerGeologicalSources` once, `supportColumn`, `W.levelKey` kit keys; frozen before production fluid use | dk (D1-GEO; no Levels path) | `tasks/WG.62.05/lane-dk/` |
| (shared, from merged D2/D3) | **WG.CELL-WRITE** | Sole writer of `game/js/plugins/DEUS_Levels.js` | da, dc, dd, du, dw, dv, dx, dy, dz, fm, dg, di, dj, fq, eg: 15 parts, numbered in section 3 | `tasks/WG.CELL-WRITE/<lane>/` |
| (shared, from merged D2/D3) | **NAT.02.MASS** | Sole writer of the ledger, materials and shared mass arithmetic | dn, do, dp (absorbs dt and the peridotite band rock row), dr, dq (adds `ensureCore`/`ensureChamber`), ds, fu: 7 parts, numbered in section 3 | `tasks/NAT.02.MASS/<lane>/` |

Plan draft ids become **aliases only**. They are not minted as leaves and get no WBS row or registry entry:

| Draft id (PLAN.md) | Lane | Alias of |
|---|---|---|
| WG.64.07 | dg | WG.00.30 (CELL part) |
| WG.64.08 | dh | WG.62.03 (D1-GEO part) |
| WG.64.09 | di | WG.62.03 (CELL part) |
| WG.64.10 | dj | WG.62.04 (CELL part) |
| WG.64.11 | dl | WG.62.04 (D1-GEO part) |
| WG.64.12 | dk | WG.62.05 |

Retired names; do not mint them:

- **NAT.01.01.** It appears only in AG mail AG-PRUNE-022 (`docs/agents/mailboxes/fable/inbox.jsonl` line 30, `docs/agents/mailboxes/gemini/outbox.jsonl` line 29) as "WG.00.17 / NAT.01.01" for "setShape('open') hole derivation, sparse 32-layer save". The merged D1 drops it (section 2, line 34; section 3.6). The hole fix is WG.CELL-WRITE (lane-dw); the sparse save is WG.00.43 (lane-da).
- **WG.01.01, WG.01.02, WG.01.03** (Gemini Draft B). Dropped by the merged D1 (section 2, line 34).
- **WG.00.18 as "sparse save".** WG.00.18 keeps its existing meaning, Layer-View Presentation.

Unchanged ids that the plan keeps: WG.64.13 (lane-fn's D4 home-ground deliverable; the lane runs as WG.62.03 part 2 of 2, because its changes are in the D1-GEO file `caves.js`, G02 section 3), WG.00.44 (db), WG.00.45 (dc), WG.00.46 (dd), WG.00.47 (fi). All six were minted in WBS Rev 34 (section 6).

## 2. Collision check

**Method (2026-10-01).** `git grep -F -w` (fixed string, whole word) for each id on:

- main at `e6b221a3`. Only mailbox lines changed since `a3b2c3ed`, where the scan was first run, and the new mail lines contain none of these ids;
- all 78 local and remote branch refs (`git for-each-ref refs/heads refs/remotes`). That is 76 refs at the first scan, plus `task/lane-cy` and `origin/task/lane-cy`, created at 21:42 CT and scanned separately;
- main's working tree (`docs`, `tools`, `tasks`, `game/js`, `game/data`, `.agents`; md, json, jsonl and js files);
- the 24 lane worktrees under `C:/Users/snewt/.deus_worktrees` (`docs`, `tasks`, `tools`).

The registries checked by name are `tasks/wbs_registry.json` (the canonical registry, DEC-041 item 6), `docs/worldgen/DEUS_WORLDGEN_WBS.md` (Rev 32), the `docs/STATUS.md` control board and `tools/ops/active_lanes.json`.

### Ids that are new or reserved

Every id in this table had no occurrence in any place scanned, so each is **CLEAR**.

| Id | main files | Branch refs | Working tree | Worktrees |
|---|---|---|---|---|
| WG.00.43 | 0 | 0 | 0 | 0 |
| WG.00.44, WG.00.45, WG.00.46, WG.00.47 | 0 | 0 | 0 | 0 |
| WG.62.03, WG.62.04, WG.62.05 | 0 | 0 | 0 | 0 |
| WG.CELL-WRITE | 0 | 0 | 0 | 0 |
| NAT.02.MASS | 0 | 0 | 0 | 0 |
| WG.64.07 to WG.64.13 (aliases; WG.64.13 kept for fn) | 0 | 0 | 0 | 0 |
| WG.01.01, WG.01.02, WG.01.03 (retired) | 0 | 0 | not scanned | not scanned |
| NAT.02.01.RUBBLE (registered 2026-10-01, before wave 5; rescan with `git grep -F -w` over 232 refs, local and remote branches and tags: only this file, its row of ids still to register and section 6's list, 23 refs) | this row | this row | this row | this row |
| NAT.02.01.BRIDGE, NAT.02.01.WET, NAT.02.01.PROOF, SIM.00.02a, NAT.03.04 to NAT.03.07, NAT.07.02 to NAT.07.05 (later waves) | 0 | not scanned | not scanned | not scanned |

The `WG.00` sequence has a trap. `docs/worldgen/DEUS_WORLDGEN_WBS.md:5` says "Next free in WG.00 is WG.00.40", but WG.00.40 and WG.00.41 are registry leaves (`tasks/wbs_registry.json:21`, `:122-143`; merges `cdc0fb95` and `a0a44eb8`, follow-up `7bbe7f6c`). WG.00.42 is lane-cx (`tasks/WG.00.42/lane-cx/`, merge `4f16a6c9`; `docs/STATUS.md:144`). None of the three has a WBS row. The first free WG.00 id is WG.00.43. WBS Rev 33 backfills the three rows, mints WG.00.43, and sets the header's next free id to **WG.00.48**, because WG.00.44-.47 are reserved for lanes db, dc, dd and fi and are minted before wave 2. A header that said "next free WG.00.44" while those four are reserved would invite the same collision as WG.00.40.

### Ids that are already occupied

| Id | Where it appears on main | Meaning there | Ruling |
|---|---|---|---|
| **WG.00.18** | `docs/worldgen/DEUS_WORLDGEN_WBS.md:106` ("Layer-View Presentation (Owner-Led)", PLANNED), also `:642`, `:757-759`, `:766`, `:769`; `docs/audits/SRD_SPELL_EFFECT_AUDIT.md:89,1347,1388`; `docs/audits/srd_spell_effect_audit.json` (29 lines); `docs/schemas/spells/primitives.json:279,297`; `docs/schemas/spells/spell_effect.schema.json:1169`; `tasks/DEUS-TSK-DEPTH-DEMO/lane-ap/BRIEF.md:5`; `tasks/WG.00.35/lane-aw/BRIEF.md:22`; `tasks/SIM.60.01/lane-p/review_grok_c9d1ed86.md:187`; `tasks/SIM.60.02/lane-v/REPORT.md:336`. 46 hits in 9 files, no branch-only file | Presentation, every time | **Collision.** The merged D1's "WG.00.18" becomes WG.00.43 |
| **WG.62.02** | `docs/worldgen/DEUS_WORLDGEN_WBS.md:211` (the leaf row), `:493`, `:641`, `:761`, `:767`, `:769`; `docs/adr/ADR-003_sim_render_split_and_lod.md:1545`; `docs/systems/DEUS_FactionPlans.md:243,351,374`; `docs/systems/DEUS_ZRange.md:73,84`; `game/js/plugins/DEUS_Environment.js:25`; `tools/zrange/literal_map.js:113`; `tools/zrange/z_literal_allowlist.json:68,182,188`; task records under `tasks/SIM.00.01`, `tasks/SIM.40.10`, `tasks/SIM.50.11`, `tasks/SOC.10.02`, `tasks/SOC.10.03`, `tasks/WG.00.17`. 57 hits in 23 files, no branch-only file | The row is race home layers, but its scope text also lists the five band ranges. `DEUS_ZRange.md:73,84`, the `DEUS_Environment.js` header and the three allow-list reasons use it for **band work** | **Collision**, partly inside main already. WG.62.02 = race starts only; the band milestone = WG.00.30. The row gets a crosswalk note (WBS Rev 33). The stray citations are re-pointed by their owners (section 5) |
| **WG.00.30** | `docs/worldgen/DEUS_WORLDGEN_WBS.md:118` (the leaf: "Geology-First Worldgen Layer", PLANNED, dep WG.00.17), cited as a dependency at `:119` (WG.00.31) and `:121` (WG.00.33). 3 hits in 1 file, no branch-only file | Geology-first worldgen | **Same meaning; reuse.** It takes the merged D1 band milestone |
| **WG.00.17** | `docs/worldgen/DEUS_WORLDGEN_WBS.md:105` and 27 more lines there; `docs/systems/DEUS_ZRange.md` (9), `docs/systems/UF_Levels.md` (19), `docs/systems/UF_World.md` (7); `tasks/WG.00.17/lane-aa/`; merge `1c2fcc28`. 790 hits in 138 files | The 32-layer Z range | Prerequisite of WG.00.43. Merged, PASS WITH NOTES. Two known reds at main: the sparse save regressed at `a8c1e62a`, and the single-authority scan finds 5 unallowed Z literals (WBS Rev 33, row WG.00.17) |
| **WG.62.01** | `docs/worldgen/DEUS_WORLDGEN_WBS.md:210,493,606,666`; `tasks/SIM.50.11/gap-audit-people/escalation.md:22` | Canonical initial racial spawn (kit) | Reused by lane-fa (kit only); no change |
| **NAT.02.01** | `tasks/wbs_registry.json:31,111`; `docs/STATUS.md:166`; `docs/AUDIT_LOG.md` (2); `docs/OWNER_DECISIONS.md` (4); `.agents/rules/deus-natural-world.md`, `deus-multiagent-routing.md`; `game/js/sim/structural/{collapse,index,support}.js`; `tools/test_structural_collapse.js`; `tasks/NAT.02.01/lane-bv/`; mail. Branch-only: `AGENTS.md` on `task/lane-pm-streamline` and three docs, all with the same meaning | The structural support and collapse engine | Same leaf; **reopened** (WBS Rev 33; `tasks/wbs_registry.json` NAT.02.01). Parts 1-6 reuse it with "part N of M" |
| **NAT.07.01** | `tasks/wbs_registry.json:71` (PKG-07 `leaves` only; no task entry). No branch-only file | Fauna and monsters | Same leaf, re-scoped by DEC-057 to the bestiary adaptation layer |
| **PKG-02 / PKG-07** | `tasks/wbs_registry.json:24,113` / `:67` | Packages 2 and 7 | Reopened / unlocked |
| **NAT.03.02, NAT.03.03** | Mail only (AG-PRUNE-022: "NAT.03.02 (Unified Hydrology)") | Water authority | Same meaning. NAT.03.02 is registered in `tasks/wbs_registry.json` at the wave-2 D1 reconciliation (section 6; lanes el, ea, ec, ec2, ee, ef); NAT.03.03 is not registered yet. lane-el (wave 1) uses NAT.03.02 |
| **ART.NAT.01, NAT.02.02** | `docs/OWNER_DECISIONS.md:730` (DEC-046 opens both) | Natural-phenomena presentation set; barrier integrity and breach | Same meaning (2026-10-01 rescan of 232 refs at main `04b1d509`: every hit is DEC-046's meaning, in `docs/OWNER_DECISIONS.md`, in this file (this row and section 6's list of ids not reserved there), in the registry's NAT.07.01 scope ("Out: ... art rows (ART.NAT.01)") and in `task/lane-pm-streamline`'s `docs/STATUS.md:27`, whose row also names an unopened "lane-cm / cn (assigned, 0159-E)"; `lane-cm` is WG.00.41 on main, `docs/STATUS.md:154`, and the registry entry supersedes that assignment). ART.NAT.01 registered 2026-10-01 for lane-fl (wave 5, lane-er folded in); NAT.02.02 to register before lane-fj (wave 17) |

## 3. One primary manifest per dispatch

Under G02 section 3, each dispatch has one manifest. D1 Levels work runs as WG.CELL-WRITE parts that cross-reference their D1 deliverable. D1-GEO lanes get no Levels path.

| Lane | Manifest taskId | Cross-reference | Levels path |
|---|---|---|---|
| da | WG.CELL-WRITE | WG.00.43 | yes (save and init only) |
| dc | WG.CELL-WRITE | WG.00.45 | yes |
| dd | WG.CELL-WRITE | WG.00.46 | yes |
| df | WG.00.30 | - | **removed** |
| dg | WG.CELL-WRITE | WG.00.30 | yes |
| dh | WG.62.03 | - | no |
| di | WG.CELL-WRITE | WG.62.03 | yes |
| dj | WG.CELL-WRITE | WG.62.04 | yes |
| dl | WG.62.04 | - | no (WorldGen and `sim/geology/magma.js`, which moves here from dj). The plan's `sim/geology/reservoirs.js` is dropped: under G02 section 3 ("MASS provides `ensureCore`/`ensureChamber` and once-only debits through its own lanes") they are in `game/js/sim/ledger.js`, NAT.02.MASS part 5 (lane-dq) |
| dk | WG.62.05 | - | **removed** (`supportColumn` reads Levels' existing `strataAt`/`shapeAt` exports from `DEUS_WorldGen.js`) |
| fn | WG.62.03 | WG.64.13 | no (`sim/geology/caves.js`, as WG.62.03 part 2 of 2) |

Numbering, fixed once at the wave-2 D1 reconciliation (2026-10-01; G02 section 3, "renumber CELL parts once"):

- **WG.CELL-WRITE, 15 parts:** 1 da, 2 dc, 3 dd, 4 du, 5 dw, 6 dv, 7 dx, 8 dy, 9 dz, 10 fm, 11 dg, 12 di, 13 dj, 14 fq, 15 eg. Ties in one wave (du and dw in wave 5; dz and fm in wave 9) keep the plan's order. The wave-1 brief of lane-da says "part 1" with no total; that stays true.
- **NAT.02.MASS, 7 parts:** 1 dn, 2 do, 3 dp (absorbs dt), 4 dr, 5 dq, 6 ds, 7 fu.
- **WG.62.03, 2 D1-GEO parts:** 1 dh, 2 fn (deliverable WG.64.13); its CELL application is WG.CELL-WRITE part 12 (di).

Homes of the four obligations that were pending here (none adds a part, so the totals above are final):

- **df's Levels edits** (delete `DEPTH_BANDS`/`depthBandOf`, relabel `BIOMES`, band roles and Look text): lane-dg, WG.CELL-WRITE part 11, which G02 section 3 already gives "bandBaseline, labels and physical material mapping".
- **dk's Levels edit** (`supportColumn`): no Levels edit is needed. `DEUS_Levels.js` already exports read-only `strataAt` (defined at line 2011, exported at line 5059) and `shapeAt` (line 5032), so lane-dk builds `supportColumn` in `DEUS_WorldGen.js` on them.
- **ensureCore/ensureChamber:** `game/js/sim/ledger.js`, NAT.02.MASS part 5 (lane-dq: transactions, once-only openings, named sub-accounts). lane-dl calls them; the plan's `sim/geology/reservoirs.js` is dropped.
- **Band material rows:** the catalogue already has granite, basalt, slate, marble, limestone and sandstone (strataIds 32-37, `game/data/sim/materials.json`); the missing row is peridotite (merged D1's ultramafic), added by lane-dp (NAT.02.MASS part 3) beside lane-dt's obsidian. The Levels mapping (Levels ids equal to the strataIds, and the 64-slot lookup) is lane-dg's.

## 4. CELL ownership (replaces PLAN.md risk 25)

The build plan's risk 25 let eight D1 lanes edit `DEUS_Levels.js` as "serialized holders" outside WG.CELL-WRITE. G02 section 3 retires that exception ("Replace, rather than simply reaffirm, risk 25"). Replacement text for PLAN.md risk 25, the same rule that WBS Rev 33 records in the WG.CELL-WRITE row and `tasks/wbs_registry.json` records in its `ownership` field:

> 25. Levels ownership (WORK-GATE G02 section 3, recorded on main 2026-10-01). WG.CELL-WRITE is the only writer of `game/js/plugins/DEUS_Levels.js`. The Levels work of the D1 lanes da, dc, dd, dg, di and dj runs as WG.CELL-WRITE parts, each with one manifest under `tasks/WG.CELL-WRITE/<lane>/` and a cross-reference to its D1 deliverable (WG.00.43, WG.00.45, WG.00.46, WG.00.30, WG.62.03, WG.62.04). df and dk lose their Levels paths; D1-GEO owns `DEUS_WorldGen.js` and `game/js/sim/geology/*`; MASS owns the ledger and materials; W-CORE owns fluid. lane-da is the save-only CELL precursor: its predecessors are main after lane-cu and the verified WG.00.17, not the CELL dry checkpoint. The PM's ownership validator (the plan validator in the PM's working files; wave-2 D1 reconciliation, 2026-10-01) enforces CELL with no lane exception, and its `--selftest` shows that a prohibited D1 Levels edit is rejected. At merge time the same table is enforced by `tools/governance/lane_ownership.js` (proposed OPS.10.06, lane-fw) once the Owner has approved that new leaf and it has merged; until then the table is enforced at plan time only.

## 5. Citations of WG.62.02 that mean the band work

These lines use WG.62.02 for band work, the old ambiguity. Each is re-pointed to WG.00.30 by the lane that owns the file, not by a PM edit on main.

| Location | Owner | When |
|---|---|---|
| `docs/systems/DEUS_ZRange.md:73` (section 5, the `DEUS_Environment` consumer row) and `:84` (section 6, "WG.62.02 and the band work come later") | lane-dg, which rewrites sections 6 and 11 at the geology milestone (G02 section 3) | wave 10 |
| `game/js/plugins/DEUS_Environment.js:25` (header comment) | lane-df, the file's owner for the Environment `bandOf` connection (PM ruling at the wave-2 D1 reconciliation, 2026-10-01) | wave 4 |
| `tools/zrange/z_literal_allowlist.json:68,182,188` (reasons) | the allow-list writers dz, dj and eg, or the Environment owner when the entries at 182 and 188 change | when touched |
| `tools/zrange/literal_map.js:113` | none: it records the WG.00.17 base state (historical) | no change |
| `docs/systems/DEUS_FactionPlans.md:243,351,374` | none: civilization is frozen (DEC-037). The lines discuss the WG.62.02 row's band numbers, and the row keeps them | no change |
| `docs/adr/ADR-003_sim_render_split_and_lod.md:1545` | none: it means race home layers, which is correct | no change |

Until those lanes run, the WG.62.02 row's crosswalk note (WBS Rev 33) is the record of the meaning.

## 6. Reservations at the wave-2 D1 reconciliation (2026-10-01)

WORK-GATE G02 section 4, "DEADLINE wave 2": "Reserve the remaining new D1/enabling IDs with the collision crosswalk." These are the ids the natural-world plan uses that section 2 left as reserved-only or never scanned, and the two water and bestiary ids whose first lanes come first (NAT.03.02: lane-el in wave 1, lane-ea in wave 2; NAT.07.03: lane-fd in wave 2). WBS Rev 34 mints the WBS rows of WG.00.44 to WG.00.47, WG.64.13 and SIM.00.02a, and `tasks/wbs_registry.json` holds their entries. NAT.03.02 and NAT.07.03 are registry entries only: no WBS row is added for them.

**Method (2026-10-01; base: main at `5a8710b7`, the commit this change applies to).** `git grep -I -F -w -o` for every id below, in one pass, over all 225 local and remote branch refs and tags (`git for-each-ref refs/heads refs/remotes refs/tags`; a control search for WG.62.02 over the same refs returned 9,088 hits, so the search reads every ref); the same search on the committed tree at the base; `grep -rIoFw` on the 64 folders under `C:/Users/snewt/.deus_worktrees` and on `C:/Users/snewt/.deus_pm`. Since WBS Rev 33 (the wave-1 records) this file, the WBS, `docs/CANONICAL_ROLES.md` and the wave-1 briefs name most of these ids as reservations, so every branch and worktree made from main after Rev 33 shows them in those files; such hits have the meaning below and are not collisions.

| Id | Refs and tags (files) | Base tree | Worktrees | `.deus_pm` | Meaning reserved | Where |
|---|---|---|---|---|---|---|
| WG.00.44 | the WBS and this file | the same | the same | none | One sim-module loader, matter-opener registry, harness vm hook (lane-db) | WBS row, registry entry |
| WG.00.45 | `docs/CANONICAL_ROLES.md`, this file, lane-da's brief | the same | the same | none | Area generation at least twice as fast (lane-dc, CELL part 2) | WBS row, registry entry |
| WG.00.46 | the roles, the WBS, this file, lane-da's brief, telemetry | the same | the same | none | Lazy area generation and per-area checksums (lane-dd, CELL part 3) | WBS row, registry entry |
| WG.00.47 | this file | the same | the same | none | Lazy wildlife population (lane-fi) | WBS row, registry entry |
| WG.62.03, WG.62.04, WG.62.05 | the roles, the WBS, this file (and lane-da's brief for .03 and .04) | the same | the same | the D1 designs and G02 (and, for .03, the CONFIRM-A verdict), same meaning | D1 caves; magma and core; D1-reg freeze | WBS rows (Rev 33), registry entries (Rev 34) |
| WG.64.13 | this file | the same | the same | none | D4 home ground guarantee (lane-fn, run as WG.62.03 part 2) | WBS row, registry entry |
| WG.64.07 to WG.64.12 | the WBS and this file, as aliases | the same | the same | WG.64.08 and WG.64.12 in G02, as aliases | aliases, never leaves (section 1) | none |
| SIM.00.02a | this file and telemetry | the same | the same | none | One shared simulation tick (lane-dm), a slice of SIM.00.02 | WBS row, registry entry |
| NAT.03.02 | mail, telemetry, `docs/STATUS.md`, the WBS (WG.62.05's consumers), this file, lane-en's brief, lane-el's task folder, and on lane-el's branch its `DEUS_NaturalConnections.js`, doc and tests | mail, telemetry, `docs/STATUS.md`, the WBS, this file, lane-en's brief, lane-el's brief, amendments and manifest | the same as the refs | the D1, D2 and D3 designs, G02 and the work-gate verdicts, same meaning | Unified hydrology: the merged-D2 water authority (W-CORE); parts el, ea, ec, ec2, ee, ef | registry entry only |
| NAT.07.03 | none | none | none | the work-gate verdicts only | Encounter tables per biome cell and danger tier (lane-fd) | registry entry only |
| OPS.10.06 | none | none | none | the work-gate verdicts only | **Proposed, not minted:** the manifest ownership check `tools/governance/lane_ownership.js` (lane-fw). A new leaf and a process lane: its WBS row is added only after the Owner approves it, one Rev later | (after approval) WBS row |
| lane-fw | this file (the PM's ownership validator line) | the same | the same | the work-gate verdicts | The proposed OPS.10.06 lane | (after approval) its manifest `tasks/OPS.10.06/lane-fw/lane.json` |

Nothing in this section was in use with another meaning. OPS.10.05 is taken by the PM's draft of the manifest-contract lane, which is why the ownership check takes OPS.10.06.

Not reserved here, each before its first lane: NAT.03.03 to NAT.03.07, NAT.02.02, ART.NAT.01, NAT.02.01.BRIDGE, NAT.02.01.WET, NAT.02.01.PROOF, NAT.07.02, NAT.07.04, NAT.07.05, and NAT.02.01.RUBBLE (before lane-du, wave 5).
