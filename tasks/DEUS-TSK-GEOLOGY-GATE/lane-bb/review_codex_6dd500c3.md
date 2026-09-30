# Independent Codex review — Lane BB

Date: 2026-09-29
Task: DEUS-TSK-GEOLOGY-GATE
Worktree: C:\Users\snewt\.deus_worktrees\lane-bb
Branch: task/lane-bb
Target: 6dd500c3c290c1f7eb8c6300a8c0bade71135949
Requested comparison base: ecc7b8984a0ab1a919595c792f98a60f18872f73
Observed main: 6329707ea68dd9abb21cccc778826e581d5baaa1
Observed merge-base with that main: 6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0
Environment: Windows PowerShell, Node v24.19.0.

VERDICT: FAIL — CHANGES REQUIRED

All five specified manifest gates exited 0. Nevertheless, independent source review and additional reproductions found two production regressions, incomplete foreign-world checksum isolation, and two broken mutation controls. A PASS or CLEAN PASS would misrepresent those findings. The positive-only verdict options in the assignment are therefore not used as merge approval.

## What changed

- This review adds only this report. No runtime, test, manifest, status, decision-log, or image file was changed.
- The assignment's explicit single-file restriction supersedes the general AGENTS.md claim/status/decision-log edit workflow for this review.
- The cumulative target diff was reviewed against the requested base, with scope also checked against the actual current-main merge-base. Two read-only subreviews checked the caller/flag and authority/reference paths; the primary reviewer independently ran the counterexamples recorded below.
- Existing untracked docs/systems/UNLOADED_SIMULATION_KERNELS_MAP.md and tasks/DEUS-TSK-GEOLOGY-GATE/lane-bb/launches/ were present before review and left untouched.

## Findings

### BB-CODEX-01 — MAJOR / P1: live biome readers omit the newly required world description

Evidence: game/js/plugins/DEUS_Levels.js:158–168, 187–193, 1719–1729; game/js/plugins/DEUS_WorldGen.js:749–779.

The changed kindGrid() returns null when its fourth argument is missing. Both columnBiomeId() and the outer-underground fallback in biomeCodeAt() still invoke it with only area coordinates and size. As a result, columnBiomeId() returns null even in coupled worlds, and biomeAt() loses the substrate biome below the core levels (below Z-2). The core -1/-2 grids still carry their generated biome arrays, hiding the error from the supplied geology gate.

The existing supplemental command node tools/worldgen/test_vertical_biome_coupling.js --smoke exited 1: seed 1 at (8,8,Z-16) returned null instead of crystal_cavern; the nine-layer test range at Z-4 returned null instead of chalk_karst. The complete output is below.

An additional before/after probe created actual generator-4 New Games, seed 18, default -16..+15 range, using unmodified runtime sources. At (100,100), the requested merge-base returned rooted_loam at -3 and deep_mine_belt at -9/-16; the target returned null at all three levels. Both VMs recorded no console errors. This violates the continued substrate labeling below Z-2 and geology coupling specified in docs/systems/DEUS_VerticalBiomes.md:5,16,35.

Required correction: pass the loaded world's description at both live-world kindGrid call sites, then retain a regression covering coupled outer underground levels and the public columnBiomeId API.

### BB-CODEX-02 — MAJOR / P1: generator-5 cache aliases absent coupling to true

Evidence: game/js/plugins/DEUS_Levels.js:133–138, 2503–2506, 4582–4591; tools/test_strata_foundation.js:259–263, 894–901.

couplingActive(desc) correctly interprets an absent verticalBiomeCoupling flag as false. volumeOf() instead defaults an absent flag to true when constructing its cache key. Thus a coupled and a flag-absent request for the same seed/geometry/generator/range share a volume key even though they require different terrain. This is introduced by the change: the merge-base key's truthiness check classified an absent flag as uncoupled.

A real DataManager save/load probe with generator 5, seed 20260923, a 64x64 one-area legacy-range fixture observed:

| State | Z-1 checksum |
|---|---|
| Coupled volume | 57a53a88 |
| Explicit uncoupled volume | d5c6326e |
| Flag absent, coupled volume already cached | 57a53a88 |
| Flag absent, cache discarded | d5c6326e |
| Flag-absent save loaded after coupled same-seed world | 57a53a88 |
| Same loaded save after discarding baseline caches | d5c6326e |

The loaded flag was absent and verticalCouplingOn() returned false, yet its terrain checksum remained coupled until cache discard. Save extraction does not clear these immutable baseline/volume caches; range synchronization resets per-level slots without eliminating this collision. The combined contract probe exited 1.

Required correction: normalize the volume key's coupling bit with the same semantics as couplingActive(). Add a generator-5 same-process load regression with both warm and cold caches. Merely testing the returned flag or loading a different seed will miss this problem.

### BB-CODEX-03 — MAJOR / P2: foreign-world checksum description is only partly honored

Evidence: game/js/plugins/DEUS_Levels.js:1076–1113; tools/test_strata_cuts_and_caves.js:480–482; tools/test_strata_foundation.js:410–425.

checksumOf() resolves a foreign description and its dimensions and passes it into generateBaseline(), but its area loops still use loaded st.areasX/st.areasY. The ground path also shadows size with st.size and calls the loaded world's WorldGen.cellInfo(). The newly calculated areasX/areasY variables are unused. The ground's live-world lattice was a pre-existing limitation; adding worldDesc has not removed it.

A controlled target world of seed 20260923, size 64, 2x1 areas, and a loaded world of seed 20260930, size 64, 1x1 areas, both generator 4 and coupling true, produced these mismatches despite explicitly passing target.World.state as the fourth argument:

| Level | Target's own checksum | Regenerated with target description in host |
|---|---|---|
| -1 | 6d96e9be | c6e2fc66 |
| 0 | bef8fc4d | fb1dd0ca |
| +1 | d5336e37 | f5c1ecfe |

The cuts suite's explicit cross-world test still calls other.checksum(z, SEED, 5) without the target description. Its worlds have matching geometry and coupling, and it excludes Z0, so it passes while these dependencies remain.

Required correction: enumerate and sample using the target description throughout, update genuine cross-world callers to pass that description, and test host/target worlds that differ in geometry and coupling. Preserve an explicit contract for Z0 instead of claiming that a seed-only check proves whole-world independence.

### BB-CODEX-04 — MAJOR / P2: two cuts/caves mutation controls no longer inject their defects

Evidence: game/js/plugins/DEUS_Levels.js:2558; tools/test_strata_cuts_and_caves.js:98,135,202–205.

The runtime carveNaturalFeatures signature gained worldDesc, but the no_features and error_injected mutants still match the old signature ending in bs. Both commands below exited 2 with “target not found” and zero checks executed:

- node tools/test_strata_cuts_and_caves.js --mutant=no_features --quiet
- node tools/test_strata_cuts_and_caves.js --mutant=error_injected --quiet

These are harness failures, not expected EXIT=1 detections of injected defects. The ordinary gate does not run this suite's mutation roster.

Required correction: update the exact mutation anchors, then demonstrate that each injected defect reaches its intended assertion and exits 1.

## Detailed answers to the four requested questions

### 1. Foreign seeds and their own world descriptions

**Not confirmed for every caller; the implementation remains incomplete.**

The private baseline(z, ax, ay, seed, gen) at DEUS_Levels.js:1046–1061 fills the foreign-seed description with loaded size, areasX, areasY, startArea, and verticalBiomeCoupling. However, its public wrapper at line 5093 exposes only (z, ax, ay). The ordinary production baseline callers read the loaded world; they do not currently use that private foreign-seed branch.

The actual foreign regeneration interface is checksum(z, seed, gen, worldDesc), exported at line 5148. Its path is checksumOf -> generateBaseline -> levelArrays/volumeOf -> generateUnderground/paintSubstrate -> paintColumnBiomes -> kindGrid -> WorldGen.columnFieldGrid. The explicit description is threaded along that generation path, including carveNaturalFeatures. WorldGen.columnFieldGrid at DEUS_WorldGen.js:540–554 uses dims(desc), whose implementation at 247–255 obtains seed, size, area counts and start coordinates from the provided description. Its sole direct production invocation at Levels:172 passes desc correctly.

Caller inventory:

| Caller | Actual behavior |
|---|---|
| Public Levels.baseline; internal geometry, NaturalConnections and Wildlife callers | Loaded world only; no foreign description required for these calls. |
| ensureWorldLevels, Levels:4511 | Loaded world's checksum. |
| verifyLevels, Levels:4568 | Explicitly passes the state being verified, normally the newly loaded world. |
| test_strata_cuts_and_caves.js:480–482 | Regenerates the first world's seed inside the second world's VM, but omits the first world's description. |
| test_strata_foundation.js:412,425 | Seed-only alternate-seed probes inherit the host configuration; they do not compare differently configured worlds. |
| In-plugin checks, Levels:5560,5623,6023,6025 | Same-world repetitions and hypothetical seed+1 probes, using inherited configuration. |
| tools/smoke_19a_playtest.js:160, invoked at 232/363 | Passes the current state's seed/generator, not a separately configured world's description. |
| Capture and zrange checks | Current-world checksum(z) calls. |
| Historical underground/vertical benchmark injection wrappers | Generator-3-specific harnesses: six-argument generation calls or forwarding via apply; not current generator-5 runtime regeneration callers. |

Consequently, there is no basis for saying that every foreign-world caller now supplies that world's description. Even providing it does not fix the remaining loaded-area loops (BB-CODEX-03). The two omitted descriptions in live biome readers also produce the independent runtime regression BB-CODEX-01.

### 2. New-game true and flag-absent-save uncoupled behavior

**New-game initialization is confirmed. Flag-absent semantics are correct in couplingActive and the generator-4 foundation fixture, but not reliable for warm generator-5 regeneration.**

- Levels.VERTICAL_BIOME_COUPLING defaults to true at DEUS_Levels.js:4916.
- World.newWorld emits world:initializing at DEUS_World.js:548.
- The Levels listener at 5200–5202 copies that default onto new state before initializing levels.
- DataManager extraction at DEUS_World.js:3346–3354 does not emit the new-game event, so old absent flags remain absent.
- couplingActive(desc) returns !!desc.verticalBiomeCoupling for a supplied object; its live-state fallback uses the same truthiness rule. Absence is false.
- The foundation suite checks new-game true versus deliberately uncoupled false, and unchanged_terrain_regenerates checks a loaded flag-absent save against uncoupled baseline bytes. Both passed in this run.
- Crucially, foundation's newWorld helper pins levelsGen = 4. This test does not cover the generator-5 volume cache, whose conflicting absent-flag key caused the actual save/load failure in BB-CODEX-02.

### 3. Accepted generator-4 re-baseline to WG.00.15

**Confirmed.**

POST_WG0015 at tools/test_strata_cuts_and_caves.js:83 is 42c3bc9a, resolving to the full commit 42c3bc9aadd72005a919b0720a3e67635cda00a9. postWG0015Sources at 210–216 reads all six compared plugin sources through git show at that commit. Both env4 and the historical envH are explicitly created with generator 4 at 448–453, with the harness's legacy range.

old_generator_unchanged at 507–522 checks all five levels' strata/connector/cap bytes, their checksums, absence of generator-5 features/caps, and migration of a pre-V80 world to generators [4,4,4,4,4]. The observed check passed. Its detailed raw checksum output is included below.

This agrees with the Owner's 2026-09-29 decision supplied in the assignment. I also inspected the corresponding VISION decision-log change on main, commit ac45886418fb051a37ce3ab298de2cc31e10e5e8, which explicitly names this reference and keeps same-seed determinism across worlds mandatory. This assertion establishes equality with the accepted post-WG.00.15 generator-4 New Game reference; it does not, by itself, prove every historical save path.

### 4. Strata versus chunk store authority and rebuilding on load

**There is one runtime baseline cell store, but the new test comment requires qualification.**

| Representation/member | Role |
|---|---|
| Generated dense strata/connector arrays | Temporary generation workspace, consumed by seal/chunkify. |
| dir | Runtime baseline chunk directory: uniform palette index or CH_MIXED. |
| mixed | Runtime material/connector arrays for nonuniform chunks; read with dir and the shared uniform palette. |
| cw | Chunk-grid width, ceil(size / 32). |
| mixedCount | Number of allocated nonuniform chunks. |
| shift / mask | Cell-coordinate indexing metadata; power-of-two shift and size-1 mask, otherwise -1. |
| Sealed baseline b.strata.m / b.conn | Lazy diagnostic/compatibility copies reconstructed from the chunk store. |
| Saved state.levels[z].strata | Sparse changed-cell records, distinct from baseline b.strata; persistent mutations over the regenerated baseline. |

seal() at DEUS_Levels.js:1299–1305 converts dense working arrays into the chunk store, deletes the dense arrays, and installs lazy getters. defineDense() at 1307–1323 rebuilds dense copies by reading storeLocate(). Runtime locate() at 1498–1514 reads a saved delta first and the chunk store otherwise. Thus the sealed runtime baseline authority is dir/mixed plus the palette, with sparse deltas layered over it. The dense b.strata.m copy is not a second mutable simulation authority.

Persistent truth is the saved world description/seed/generator plus sparse changed records. DEUS_World.js:3338–3348 saves/restores World.state; the closure-owned baselines and chunk stores are not serialized. A cold load regenerates baseline stores from that truth and constructs dense views when requested. deltaLevels() decodes saved change records for the restored state.

**Do not claim that every load rebuilds both representations.** The load path can reuse immutable baseline/volume caches in the same process. The primary reviewer's probe mutated a dense compatibility byte and observed no change through strataAt(); the save contained none of the six chunk-store members; after same-process load, both the baseline object and dense compatibility array were the same objects as before. Exact probe output is below. This cache reuse is also why BB-CODEX-02 is a real load defect.

no_parallel_authority at test_strata_cuts_and_caves.js:1129–1153 allows the existing six chunk members and checks for unknown enumerable members/oversized feature descriptors. That whitelist is compatible with the storage architecture, but it does not behaviorally prove authority or cache regeneration. The comment's WG.00.41 attribution is also inaccurate: the storage code at Levels:1204 and docs/systems/DEUS_ZRange.md attribute it to WG.00.17. This documentation/test limitation is separate from the blocking runtime findings.

## How I tested it

Each requested command ran from the specified worktree at the target commit. The shell captured $LASTEXITCODE immediately after node, printed EXIT=<code>, and exited with that code. The independent gate processes ran concurrently; their timing lines are observed headless timings, not frame-rate or isolated performance claims. The cuts/caves gate also ran its existing nested fluid and foundation suites.

| Command | Exact process EXIT | Observed result |
|---|---:|---|
| node tools/check_deus_syntax.js | 0 | 60 DEUS plugin files; 0 syntax errors |
| node tools/test_geology_strata.js | 0 | 9 passed, 0 failed |
| node tools/test_historical_carrying_capacity.js | 0 | 23 contract checks, 5 packet checks, 8 mutants detected; status PASS |
| node tools/test_strata_foundation.js | 0 | 26 passed, 0 failed |
| node tools/test_strata_cuts_and_caves.js | 0 | 28 passed, 0 failed; nested foundation/fluid suites passed |

The historical capacity suite intentionally loads its pinned candidate 18a0db6eab08f6bd7826c238b02c6a7edc1f2d4c, whose hash/byte identity is printed in its output. It is not a test of foreign-world biome regeneration.

Additional checks:

| Command/check | EXIT | Meaning |
|---|---:|---|
| node tools/worldgen/test_vertical_biome_coupling.js --smoke | 1 | Two actual biome-rule failures |
| node tools/test_strata_cuts_and_caves.js --mutant=no_features --quiet | 2 | Injection anchor missing; no assertions ran |
| node tools/test_strata_cuts_and_caves.js --mutant=error_injected --quiet | 2 | Injection anchor missing; no assertions ran |
| node tools/test_geology_strata.js --mutant=no_world | 1 | Expected negative-control rejection: Levels cannot load without World.Z_RANGES |
| In-memory foreign-description/cache/load/authority probe, printed in full below | 1 | Five failed contract comparisons; authority observations also recorded |
| In-memory target-versus-base biome probe, printed in full below | 0 | Observation-only comparison; null regression shown in output |
| git diff --check 6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0 6dd500c3c290c1f7eb8c6300a8c0bade71135949 | 0 | Lane-only patch whitespace check |

## Scope analysis

The manifest at tasks/DEUS-TSK-GEOLOGY-GATE/lane-bb/lane.json permits the six individual runtime/test files listed below and tasks/DEUS-TSK-GEOLOGY-GATE/**.

| Modified path from requested base to target | allowedPaths match |
|---|---|
| docs/STATUS.md | NO |
| game/js/plugins/DEUS_Levels.js | Exact |
| game/js/plugins/DEUS_WorldGen.js | Exact |
| tools/test_geology_strata.js | Exact |
| tools/test_historical_carrying_capacity.js | Exact |
| tools/test_strata_foundation.js | Exact |
| tools/test_strata_cuts_and_caves.js | Exact |
| tasks/DEUS-TSK-GEOLOGY-GATE/lane-bb/BRIEF.md | Task subtree |
| tasks/DEUS-TSK-GEOLOGY-GATE/lane-bb/BRIEF_FIX1.md | Task subtree |
| tasks/DEUS-TSK-GEOLOGY-GATE/lane-bb/BRIEF_FIX2.md | Task subtree |
| tasks/DEUS-TSK-GEOLOGY-GATE/lane-bb/REPORT.md | Task subtree |
| tasks/DEUS-TSK-GEOLOGY-GATE/lane-bb/escalation.md | Task subtree |
| tasks/DEUS-TSK-GEOLOGY-GATE/lane-bb/lane.json | Task subtree |

Literal requested-base result: 12 of 13 paths match; docs/STATUS.md does not. It would be inaccurate to report every modified path in that comparison as allowed.

Provenance resolves the discrepancy: git log over the requested range attributes the STATUS change to shared PM commit 6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0, “[pm] Register Lanes BD-BH and widen Lane BB FIX2 (Owner request 12:51 CT)”, imported through lane merge 7da40cae. That PM commit is also the actual merge-base with current main. Comparing current main...target excludes STATUS and leaves exactly 12 lane-specific paths, all allowed. This is inherited main history, not evidence that this target's lane writer edited STATUS out of scope. Whitespace diagnostics on the requested-base diff likewise identify the inherited STATUS lines.

The target commit alone changes only DEUS_Levels.js and test_strata_cuts_and_caves.js, both allowed. This review's report path is itself covered by the task subtree.

## Evidence

No screenshots were produced. Evidence consists of source inspection, the exact gate outputs, a failing existing biome smoke test, mutation-injection failures, and reproducible in-memory counterexamples. All outputs below were produced and inspected in this review session; line endings are normalized to LF.

### Complete requested gate output

#### node tools/check_deus_syntax.js

```text
Checked 60 DEUS plugin files. Errors: 0
EXIT=0
```

#### node tools/test_geology_strata.js

```text
INFO plugins loaded: DEUS_World.js, DEUS_WorldGen.js, DEUS_Levels.js (29 ms)
INFO world seed 1074124084, size 256, areas 1x1, zRange -2..2 (state has no zRange: legacy)
INFO space 5 ft cell, 2 ft stratum
=== Running Geological Strata Test Suite ===
PASS geology.api_present - WorldGen.geologyAt and Levels.stratumAt are defined
PASS geology.surface_strata_valid - sampled 196 cells: 5 stone types found (granite, slate, limestone, sandstone, basalt), all match catalog
PASS geology.determinism - cell (128,128) produced identical stone 'slate' across repeated calls
PASS geology.physical_properties_attached - stone Slate: density 2.65, compressiveStrength 65, workability 75
PASS geology.upper_earth_strata - Z=-1 stratum: stone 'limestone', depthBand 'upper_earth'
PASS geology.deep_earth_strata - Z=-2 stratum: stone 'slate', depthBand 'deep'
PASS geology.levels_stratum_at - Levels.stratumAt matches WorldGen.geologyAt: slate
PASS geology.cell_info_contains_geology - WorldGen.cellInfo(128,128,0) includes geology: stone 'slate'
PASS geology.levels_cell_at_contains_stratum - Levels.cellAt(64,64,-1) includes stratum: stone 'limestone'

RESULT: 9 passed, 0 failed (exit 0)
EXIT=0
```

#### node tools/test_historical_carrying_capacity.js

```text
{
  "task": "DEUS-TSK-ASTRA-14",
  "suite": "historical-carrying-capacity-contracts",
  "status": "PASS",
  "commonStatus": "PASS",
  "commonContractBasis": "Established behavior, envelope, locality, migration preservation and atomicity contracts; the reconciled ASTRA-14 identity/provenance acceptance checks are reported separately.",
  "packetStatus": "PASS",
  "packetPolicy": "Reconciled ASTRA-14 owner-approved schema/model/profile identities and canonical SHA-256 provenance contract",
  "packetChecks": [
    {
      "id": "PACKET_DEFAULT_PROFILE_TAG",
      "status": "PASS",
      "expected": {
        "profileKind": "promoted-default",
        "profileId": "v1",
        "profileVersion": "1.0.0-provisional-astra08",
        "demographicProfileVersion": "1.0.0-provisional-astra08"
      },
      "observed": {
        "profileKind": "promoted-default",
        "profileId": "v1",
        "profileVersion": "1.0.0-provisional-astra08",
        "demographicProfileVersion": "1.0.0-provisional-astra08"
      },
      "mapping": "Profile ID, calibration version and legacy demographicProfileVersion are distinct fields."
    },
    {
      "id": "PACKET_DEMOGRAPHIC_MODEL",
      "status": "PASS",
      "expected": {
        "version": 7,
        "schemaVersion": 7,
        "historyModelId": "historical_demographics_v1",
        "historyModelVersion": 1
      },
      "observed": {
        "version": 7,
        "schemaVersion": 7,
        "historyModelId": "historical_demographics_v1",
        "historyModelVersion": 1
      },
      "mapping": "Root version/schemaVersion are 7; the independently versioned historical_demographics_v1 model is version 1."
    },
    {
      "id": "PACKET_CAPACITY_MODEL_IDENTITY",
      "status": "PASS",
      "expected": {
        "capacityModelId": "local_density_v1",
        "capacityModelVersion": 1,
        "configId": "local_density_v1",
        "configVersion": 1
      },
      "observed": {
        "initial": {
          "capacityModelId": "local_density_v1",
          "capacityModelVersion": 1,
          "configId": "local_density_v1",
          "configVersion": 1
        },
        "callerIds": [
          {
            "requestedId": "TEST_UNSUPPORTED_CAPACITY",
            "rejected": true,
            "diagnostic": "HistoricalDemographics: unsupported capacityModel.id: TEST_UNSUPPORTED_CAPACITY",
            "persisted": null
          },
          {
            "requestedId": null,
            "rejected": true,
            "diagnostic": "HistoricalDemographics: unsupported capacityModel.id: null",
            "persisted": null
          },
          {
            "requestedId": 1,
            "rejected": true,
            "diagnostic": "HistoricalDemographics: unsupported capacityModel.id: 1",
            "persisted": null
          }
        ],
        "callerVersions": [
          {
            "requestedVersion": 2,
            "status": "REJECTED_WITHOUT_MUTATION",
            "diagnostic": "HistoricalDemographics: unsupported capacityModel.version: 2"
          },
          {
            "requestedVersion": null,
            "status": "REJECTED_WITHOUT_MUTATION",
            "diagnostic": "HistoricalDemographics: unsupported capacityModel.version: null"
          },
          {
            "requestedVersion": "1",
            "status": "REJECTED_WITHOUT_MUTATION",
            "diagnostic": "HistoricalDemographics: unsupported capacityModel.version: 1"
          }
        ],
        "contradictoryConfigIds": [
          {
            "rootId": "local_density_v1",
            "configId": "TEST_UNSUPPORTED_CAPACITY",
            "status": "REJECTED_WITHOUT_MUTATION",
            "diagnostic": "HistoricalDemographics: unsupported capacityModel.id: TEST_UNSUPPORTED_CAPACITY"
          },
          {
            "rootId": "local_density_v1",
            "configId": null,
            "status": "REJECTED_WITHOUT_MUTATION",
            "diagnostic": "HistoricalDemographics: unsupported capacityModel.id: null"
          },
          {
            "rootId": "local_density_v1",
            "configId": 1,
            "status": "REJECTED_WITHOUT_MUTATION",
            "diagnostic": "HistoricalDemographics: unsupported capacityModel.id: 1"
          }
        ]
      },
      "mapping": "Both root and config IDs/versions must agree, including caller-supplied capacityModel.id boundaries."
    },
    {
      "id": "PACKET_CUSTOM_CANNOT_CLAIM_V1",
      "status": "PASS",
      "expected": {
        "profileKind": "custom",
        "profileId": null,
        "profileVersion": null,
        "demographicProfileVersion": "custom"
      },
      "observed": {
        "initial": {
          "profileKind": "custom",
          "profileId": null,
          "profileVersion": null,
          "demographicProfileVersion": "custom"
        },
        "normalizedClaims": [
          {
            "claim": "v1",
            "tags": {
              "profileKind": "custom",
              "profileId": null,
              "profileVersion": null,
              "demographicProfileVersion": "custom"
            }
          },
          {
            "claim": "1.0.0-provisional-astra08",
            "tags": {
              "profileKind": "custom",
              "profileId": null,
              "profileVersion": null,
              "demographicProfileVersion": "custom"
            }
          }
        ],
        "rejectedSpoofs": [
          {
            "key": "profileKind",
            "value": "promoted-default",
            "status": "REJECTED_WITHOUT_MUTATION"
          },
          {
            "key": "demographicProfileVersion",
            "value": "1.0.0-provisional-astra08",
            "status": "REJECTED_WITHOUT_MUTATION"
          }
        ],
        "migrated": {
          "profileKind": "custom",
          "profileId": null,
          "profileVersion": null,
          "demographicProfileVersion": "custom"
        },
        "migratedHash": "3089a195939cf5d1977c0612e4c57ef380498ad98b65e07e8541d42c966b0790"
      },
      "mapping": "create and genuine v6 migration normalize all four custom tags; validate rejects the two promoted-claim fields explicitly named in the packet."
    },
    {
      "id": "PACKET_CUSTOM_PROFILE_FINGERPRINT",
      "status": "PASS",
      "expected": "Canonical parameter SHA-256 matches independent Node oracle, repeats across processes and changes with each biological parameter",
      "observed": {
        "algorithm": "Node crypto SHA-256",
        "defaultKnownHash": "e6d1fa7e53f4e606f2545bb149e0f4620127ffe5bd27cdaa30d1a772b801ba48",
        "defaultObservedHash": "e6d1fa7e53f4e606f2545bb149e0f4620127ffe5bd27cdaa30d1a772b801ba48",
        "customObservedHash": "aeb1fa42e74bad9f018b9e53578b9a32b32e7874eebc19fc6e17b720c6c0512f",
        "variants": [
          {
            "field": "lifespan[0]",
            "expected": "06e0fbdbfa1a64961a5905c307c66b2638e6570ec16adc5ca6579cf51f493a6d",
            "observed": "06e0fbdbfa1a64961a5905c307c66b2638e6570ec16adc5ca6579cf51f493a6d"
          },
          {
            "field": "lifespan[1]",
            "expected": "8c0cfa0520ad937b459426a0711f539699f493fbf4f24159714684bb02b5c8e4",
            "observed": "8c0cfa0520ad937b459426a0711f539699f493fbf4f24159714684bb02b5c8e4"
          },
          {
            "field": "reproductiveAge[0]",
            "expected": "a41218c9baacd7a46f06e11b92ae9f303808e8f2685ef97cbff999faaba19bf7",
            "observed": "a41218c9baacd7a46f06e11b92ae9f303808e8f2685ef97cbff999faaba19bf7"
          },
          {
            "field": "reproductiveAge[1]",
            "expected": "a312747b71db4a985569452ed73ecf9cf8b6ac6952eb9046cf64da6f0bed1bac",
            "observed": "a312747b71db4a985569452ed73ecf9cf8b6ac6952eb9046cf64da6f0bed1bac"
          },
          {
            "field": "birthChance",
            "expected": "def9ff6747b85b0bcb6f4096c1af56c6b8349ee55436e98fdbbef4dabfecb0f1",
            "observed": "def9ff6747b85b0bcb6f4096c1af56c6b8349ee55436e98fdbbef4dabfecb0f1"
          },
          {
            "field": "birthSpacingYears",
            "expected": "fd74bae36efdd881feae79aaa3fc2f761c2792482da5045cc90f9cb90de8f43f",
            "observed": "fd74bae36efdd881feae79aaa3fc2f761c2792482da5045cc90f9cb90de8f43f"
          },
          {
            "field": "infantMortality",
            "expected": "7fde7540ab0cb381c3a38cb5a41e70ee7af824df365c8510e6ea05b90ad13930",
            "observed": "7fde7540ab0cb381c3a38cb5a41e70ee7af824df365c8510e6ea05b90ad13930"
          },
          {
            "field": "diseaseMortality",
            "expected": "5fd7d6a63d61f10b85d2a2a4ffc7267d95e874802bf68dfebda0fc8443553ce2",
            "observed": "5fd7d6a63d61f10b85d2a2a4ffc7267d95e874802bf68dfebda0fc8443553ce2"
          },
          {
            "field": "exposureMortality",
            "expected": "d660409d0fbdb25a485e80009441cca0f45366f4769fecddbe579e8d3b5f4059",
            "observed": "d660409d0fbdb25a485e80009441cca0f45366f4769fecddbe579e8d3b5f4059"
          }
        ],
        "controls": [
          {
            "field": "lifespan[0]",
            "status": "STALE_HASH_REJECTED_BY_INDEPENDENT_ORACLE"
          },
          {
            "field": "lifespan[1]",
            "status": "STALE_HASH_REJECTED_BY_INDEPENDENT_ORACLE"
          },
          {
            "field": "reproductiveAge[0]",
            "status": "STALE_HASH_REJECTED_BY_INDEPENDENT_ORACLE"
          },
          {
            "field": "reproductiveAge[1]",
            "status": "STALE_HASH_REJECTED_BY_INDEPENDENT_ORACLE"
          },
          {
            "field": "birthChance",
            "status": "STALE_HASH_REJECTED_BY_INDEPENDENT_ORACLE"
          },
          {
            "field": "birthSpacingYears",
            "status": "STALE_HASH_REJECTED_BY_INDEPENDENT_ORACLE"
          },
          {
            "field": "infantMortality",
            "status": "STALE_HASH_REJECTED_BY_INDEPENDENT_ORACLE"
          },
          {
            "field": "diseaseMortality",
            "status": "STALE_HASH_REJECTED_BY_INDEPENDENT_ORACLE"
          },
          {
            "field": "exposureMortality",
            "status": "STALE_HASH_REJECTED_BY_INDEPENDENT_ORACLE"
          },
          {
            "field": "profileHash",
            "status": "MALFORMED_HASH_REJECTED_BY_INDEPENDENT_ORACLE"
          }
        ],
        "reorderedHash": "aeb1fa42e74bad9f018b9e53578b9a32b32e7874eebc19fc6e17b720c6c0512f",
        "freshProcess": {
          "workerPid": 36548,
          "candidate": "18a0db6eab08f6bd7826c238b02c6a7edc1f2d4c",
          "candidateSha256": "b446f3c13e1632a74c4716f7f6e665bb9ffacd46adb2f062c8b4400c8e4d8d55",
          "hashes": [
            "e6d1fa7e53f4e606f2545bb149e0f4620127ffe5bd27cdaa30d1a772b801ba48",
            "aeb1fa42e74bad9f018b9e53578b9a32b32e7874eebc19fc6e17b720c6c0512f",
            "aeb1fa42e74bad9f018b9e53578b9a32b32e7874eebc19fc6e17b720c6c0512f"
          ]
        }
      },
      "mapping": "Sorted species keys; fixed seven-field parameter order; numeric JSON values; ranges keep endpoint order. Hash controls target the independent verifier, not unspecified production hash validation."
    }
  ],
  "observedMetadata": {
    "defaults": {
      "top": {
        "version": 7,
        "schemaVersion": 7,
        "historyModelId": "historical_demographics_v1",
        "historyModelVersion": 1,
        "capacityModelId": "local_density_v1",
        "capacityModelVersion": 1,
        "demographicProfileVersion": "1.0.0-provisional-astra08",
        "profileKind": "promoted-default",
        "profileId": "v1",
        "profileVersion": "1.0.0-provisional-astra08",
        "profileHash": "e6d1fa7e53f4e606f2545bb149e0f4620127ffe5bd27cdaa30d1a772b801ba48",
        "domain": "historical",
        "seed": 0,
        "yearsSimulated": 0,
        "startYear": 1,
        "currentYear": 1,
        "dimensions": {
          "size": 256,
          "areasX": 1,
          "areasY": 1
        },
        "nextEventId": 55,
        "eventsDiscarded": 0
      },
      "config": {
        "capacityModel": {
          "id": "local_density_v1",
          "version": 1,
          "defaultBaseline": 160,
          "minimumScale": 0.1,
          "minCapacity": 60,
          "maxCapacity": 350
        },
        "recentYears": 20,
        "eventLimit": 400,
        "dynastyInheritance": "maternal",
        "compression": "deferred",
        "profileHash": "e6d1fa7e53f4e606f2545bb149e0f4620127ffe5bd27cdaa30d1a772b801ba48"
      }
    },
    "custom": {
      "top": {
        "version": 7,
        "schemaVersion": 7,
        "historyModelId": "historical_demographics_v1",
        "historyModelVersion": 1,
        "capacityModelId": "local_density_v1",
        "capacityModelVersion": 1,
        "demographicProfileVersion": "custom",
        "profileKind": "custom",
        "profileId": null,
        "profileVersion": null,
        "profileHash": "aeb1fa42e74bad9f018b9e53578b9a32b32e7874eebc19fc6e17b720c6c0512f",
        "domain": "historical",
        "seed": 0,
        "yearsSimulated": 0,
        "startYear": 1,
        "currentYear": 1,
        "dimensions": {
          "size": 256,
          "areasX": 1,
          "areasY": 1
        },
        "nextEventId": 55,
        "eventsDiscarded": 0
      },
      "config": {
        "capacityModel": {
          "id": "local_density_v1",
          "version": 1,
          "defaultBaseline": 160,
          "minimumScale": 0.1,
          "minCapacity": 60,
          "maxCapacity": 350
        },
        "recentYears": 20,
        "eventLimit": 400,
        "dynastyInheritance": "maternal",
        "compression": "deferred",
        "profileHash": "aeb1fa42e74bad9f018b9e53578b9a32b32e7874eebc19fc6e17b720c6c0512f"
      }
    },
    "validationObservations": [
      {
        "id": "ROOT_HASH_FORGED",
        "gating": false,
        "observed": "ACCEPTED",
        "diagnostic": null,
        "inputUnchanged": true
      },
      {
        "id": "CONFIG_HASH_FORGED",
        "gating": false,
        "observed": "ACCEPTED",
        "diagnostic": null,
        "inputUnchanged": true
      },
      {
        "id": "HASHES_MISSING",
        "gating": false,
        "observed": "ACCEPTED",
        "diagnostic": null,
        "inputUnchanged": true
      },
      {
        "id": "STALE_CUSTOM_BIOLOGY_HASH",
        "gating": false,
        "observed": "ACCEPTED",
        "diagnostic": null,
        "inputUnchanged": true
      },
      {
        "id": "CUSTOM_ARBITRARY_KIND_VERSION",
        "gating": false,
        "observed": "ACCEPTED",
        "diagnostic": null,
        "inputUnchanged": true
      },
      {
        "id": "CUSTOM_PROMOTED_ID_VERSION",
        "gating": false,
        "observed": "ACCEPTED",
        "diagnostic": null,
        "inputUnchanged": true
      },
      {
        "id": "DEFAULT_ID_VERSION_MISSING",
        "gating": false,
        "observed": "ACCEPTED",
        "diagnostic": null,
        "inputUnchanged": true
      },
      {
        "id": "SCHEMA_FIELD_MISSING",
        "gating": false,
        "observed": "ACCEPTED",
        "diagnostic": null,
        "inputUnchanged": true
      }
    ],
    "observationPolicy": "Nongating validation coverage observations; packet gates are the five named checks above."
  },
  "packetPassed": 5,
  "packetFailed": 0,
  "candidate": {
    "commit": "18a0db6eab08f6bd7826c238b02c6a7edc1f2d4c",
    "bootstrap": "4af58ddd486b8e5d97d24877fd1b826131724c1d",
    "sha256": "b446f3c13e1632a74c4716f7f6e665bb9ffacd46adb2f062c8b4400c8e4d8d55",
    "bytes": 53278,
    "sourceDigest": "76a8be608e656713653a55024d25f03ba8e8f7bccc48eddddb0f489c02a41c71"
  },
  "legacyFixture": {
    "commit": "931b993e60545b24bddaa71ab433ebac8e967eb8",
    "normalizedEngineSha256": "647592fc4a65b474f5f12835cee80a461d1f0c86ba847559b3ec835791471c2e",
    "years": 40
  },
  "mutant": null,
  "checks": [
    {
      "id": "DEFAULTS",
      "name": "Omitted and undefined profiles use independent expected defaults and v7 metadata",
      "status": "PASS",
      "elapsedMs": 6.339500000000044
    },
    {
      "id": "CUSTOM",
      "name": "Caller profiles remain custom and are copied without affecting later defaults",
      "status": "PASS",
      "elapsedMs": 2.3197000000000116
    },
    {
      "id": "CUSTOM_PROVENANCE",
      "name": "Caller-supplied biology cannot claim promoted profile provenance",
      "status": "PASS",
      "elapsedMs": 0.9196999999999207
    },
    {
      "id": "VALIDATE_PURE",
      "name": "validate accepts deeply frozen v7 input without any mutation",
      "status": "PASS",
      "elapsedMs": 1.934900000000198
    },
    {
      "id": "VERSIONS",
      "name": "Unknown schema and mismatched model versions reject without mutation",
      "status": "PASS",
      "elapsedMs": 11.393599999999878
    },
    {
      "id": "CAPACITY_REJECTION",
      "name": "Missing, noninteger and out-of-range capacities reject without mutation",
      "status": "PASS",
      "elapsedMs": 12.913700000000063
    },
    {
      "id": "CREATE_CAPACITY",
      "name": "create enforces explicit capacity bounds and preserves source",
      "status": "PASS",
      "elapsedMs": 5.289400000000114
    },
    {
      "id": "ABSOLUTE_CREATE_BOUNDS",
      "name": "Caller model cannot widen create's mandatory [60,350] capacity range",
      "status": "PASS",
      "elapsedMs": 0.6910000000002583
    },
    {
      "id": "ABSOLUTE_VALIDATE_BOUNDS",
      "name": "Caller model cannot widen validate's mandatory [60,350] capacity range",
      "status": "PASS",
      "elapsedMs": 3.044800000000123
    },
    {
      "id": "MODEL_INPUT_SHAPE",
      "name": "Malformed capacity-model containers are rejected at create",
      "status": "PASS",
      "elapsedMs": 1.066899999999805
    },
    {
      "id": "MODEL_VALUES",
      "name": "Malformed capacity-model numbers and inconsistent versions reject",
      "status": "PASS",
      "elapsedMs": 8.344700000000103
    },
    {
      "id": "CAPACITY_DERIVATION",
      "name": "Capacity follows the specified seeded algorithm and source IDs",
      "status": "PASS",
      "elapsedMs": 3.7789999999999964
    },
    {
      "id": "DENSITY_RATE",
      "name": "Ordinary fertility is reduced by the independent density probability",
      "status": "PASS",
      "elapsedMs": 1.6703999999999724
    },
    {
      "id": "BIRTH_ONE",
      "name": "Base birthChance=1 still obeys site density pressure",
      "status": "PASS",
      "elapsedMs": 0.5839999999998327
    },
    {
      "id": "ANNUAL_ORDER",
      "name": "Earlier births do not change later households' annual density probability",
      "status": "PASS",
      "elapsedMs": 0.6376000000000204
    },
    {
      "id": "ANNUAL_DEATHS",
      "name": "Density uses pre-death census throughout the year",
      "status": "PASS",
      "elapsedMs": 0.5781000000001768
    },
    {
      "id": "LOCAL_CAPACITY",
      "name": "Two same-species sites use their own capacities and censuses",
      "status": "PASS",
      "elapsedMs": 2.401800000000094
    },
    {
      "id": "DENSITY_FLOOR",
      "name": "At and above capacity fertility retains the nonzero 0.1 floor",
      "status": "PASS",
      "elapsedMs": 2.5850000000000364
    },
    {
      "id": "LEGACY_REQUIRES_MIGRATION",
      "name": "Real v6 states reject step/validate with explicit migration diagnostic",
      "status": "PASS",
      "elapsedMs": 427.2280999999998
    },
    {
      "id": "MIGRATION_PRESERVATION",
      "name": "Real populated v6 migration preserves all existing records and custom biology",
      "status": "PASS",
      "elapsedMs": 10.006400000000212
    },
    {
      "id": "MIGRATION_IDEMPOTENCE",
      "name": "Explicit migration is byte-idempotent on already migrated v7",
      "status": "PASS",
      "elapsedMs": 6.3935999999998785
    },
    {
      "id": "MIGRATION_REJECTION",
      "name": "Migration rejects unknown versions and malformed legacy capacity",
      "status": "PASS",
      "elapsedMs": 15.719900000000052
    },
    {
      "id": "MIGRATION_ATOMICITY",
      "name": "Malformed v6 migration rejects without changing original state or version",
      "status": "PASS",
      "elapsedMs": 24.955799999999726
    }
  ],
  "observations": [
    {
      "id": "MIGRATION_FAILURE_ATOMICITY",
      "status": "UNCHANGED",
      "detail": "ASTRA-14 retains atomic failure as the mandatory MIGRATION_ATOMICITY check.",
      "fromVersion": 6,
      "afterVersion": 6
    }
  ],
  "passed": 23,
  "failed": 0,
  "wallMs": 20350.668999999998,
  "contractWallMs": 3927.0826000000006,
  "mutants": [
    {
      "name": "no_density_pressure",
      "expectedContract": "DENSITY_RATE",
      "status": "PASS",
      "childExitCode": 1,
      "observedContract": {
        "id": "DENSITY_RATE",
        "name": "Ordinary fertility is reduced by the independent density probability",
        "status": "FAIL",
        "diagnostic": "DENSITY_RATE: DENSITY_RATE: observed births differ from independent start-population probability oracle",
        "elapsedMs": 3.29970000000003
      },
      "diagnostic": "DENSITY_RATE: DENSITY_RATE: observed births differ from independent start-population probability oracle"
    },
    {
      "name": "universal_constant",
      "expectedContract": "LOCAL_CAPACITY",
      "status": "PASS",
      "childExitCode": 1,
      "observedContract": {
        "id": "LOCAL_CAPACITY",
        "name": "Two same-species sites use their own capacities and censuses",
        "status": "FAIL",
        "diagnostic": "LOCAL_CAPACITY: LOCAL_CAPACITY: observed births differ from independent start-population probability oracle",
        "elapsedMs": 6.634700000000066
      },
      "diagnostic": "LOCAL_CAPACITY: LOCAL_CAPACITY: observed births differ from independent start-population probability oracle"
    },
    {
      "name": "live_census_order_dependent",
      "expectedContract": "ANNUAL_ORDER",
      "status": "PASS",
      "childExitCode": 1,
      "observedContract": {
        "id": "ANNUAL_ORDER",
        "name": "Earlier births do not change later households' annual density probability",
        "status": "FAIL",
        "diagnostic": "ANNUAL_ORDER: ANNUAL_ORDER: observed births differ from independent start-population probability oracle",
        "elapsedMs": 3.954099999999926
      },
      "diagnostic": "ANNUAL_ORDER: ANNUAL_ORDER: observed births differ from independent start-population probability oracle"
    },
    {
      "name": "base_birth_1_bypass",
      "expectedContract": "BIRTH_ONE",
      "status": "PASS",
      "childExitCode": 1,
      "observedContract": {
        "id": "BIRTH_ONE",
        "name": "Base birthChance=1 still obeys site density pressure",
        "status": "FAIL",
        "diagnostic": "BIRTH_ONE: BIRTH_ONE: observed births differ from independent start-population probability oracle",
        "elapsedMs": 3.4940999999998894
      },
      "diagnostic": "BIRTH_ONE: BIRTH_ONE: observed births differ from independent start-population probability oracle"
    },
    {
      "name": "unsupported_version_accepted",
      "expectedContract": "VERSIONS",
      "status": "PASS",
      "childExitCode": 1,
      "observedContract": {
        "id": "VERSIONS",
        "name": "Unknown schema and mismatched model versions reject without mutation",
        "status": "FAIL",
        "diagnostic": "VERSIONS: VERSIONS: expected rejection, got success",
        "elapsedMs": 5.345100000000002
      },
      "diagnostic": "VERSIONS: VERSIONS: expected rejection, got success"
    },
    {
      "name": "malformed_capacity_accepted",
      "expectedContract": "CAPACITY_REJECTION",
      "status": "PASS",
      "childExitCode": 1,
      "observedContract": {
        "id": "CAPACITY_REJECTION",
        "name": "Missing, noninteger and out-of-range capacities reject without mutation",
        "status": "FAIL",
        "diagnostic": "CAPACITY_REJECTION: CAPACITY_REJECTION null: expected rejection, got success",
        "elapsedMs": 6.225799999999936
      },
      "diagnostic": "CAPACITY_REJECTION: CAPACITY_REJECTION null: expected rejection, got success"
    },
    {
      "name": "migration_rewrites_custom_profile",
      "expectedContract": "MIGRATION_PRESERVATION",
      "status": "PASS",
      "childExitCode": 1,
      "observedContract": {
        "id": "MIGRATION_PRESERVATION",
        "name": "Real populated v6 migration preserves all existing records and custom biology",
        "status": "FAIL",
        "diagnostic": "MIGRATION_PRESERVATION: Migration rewrote caller's custom profiles",
        "elapsedMs": 397.90599999999995
      },
      "diagnostic": "MIGRATION_PRESERVATION: Migration rewrote caller's custom profiles"
    },
    {
      "name": "migration_non_idempotence",
      "expectedContract": "MIGRATION_IDEMPOTENCE",
      "status": "PASS",
      "childExitCode": 1,
      "observedContract": {
        "id": "MIGRATION_IDEMPOTENCE",
        "name": "Explicit migration is byte-idempotent on already migrated v7",
        "status": "FAIL",
        "diagnostic": "MIGRATION_IDEMPOTENCE: Migration changed an already migrated v7 state",
        "elapsedMs": 371.6601999999998
      },
      "diagnostic": "MIGRATION_IDEMPOTENCE: Migration changed an already migrated v7 state"
    }
  ],
  "mutantsPassed": 8,
  "mutantsFailed": 0
}
EXIT=0
```

#### node tools/test_strata_foundation.js

```text
=== DEUS-TSK-FABLE-19A strata foundation: seed 20260923 (second seed 20260930) ===
INFO newWorld 22922 ms with strata, 18256 ms pre-strata, 23569 ms uncoupled, 23557 ms legacy range; area 0,0, 256x256
INFO zRange new game -16..15 (Z_RANGES.default), legacy proof -2..2 (Z_RANGES.legacy); stratum 2 ft, 5 strata/layer, cell 5 ft
INFO coupling new game true, old-generator world false
INFO fixtures valley (196,37), valley2 (8,71), deepRock (64,10), pool (19,8), cave (13,8), cave2 (24,8), hillTop (8,8), deep2 (11,8)
PASS storage_budget - strata 1336320 B + connectors 133632 B + cached shape grids 327680 B = 1797632 B (1.71 MiB) for the 5 levels of area 0,0, limit 3500000 B; also held: biome 131072 B, shared surface grid 65536 B, legacy views built so far 0 B, total 1998336 B; flat Uint8Array 65536x5 per level true; baseline HP implicit (full) true; +1 legacy views not built before a read true
PASS generation_deterministic - checksums: old-generator -2: 1898af90/1898af90, repeat same, seed+1 differs, seed 20260930 same; old-generator -1: 3846830f/3846830f, repeat same, seed+1 differs, seed 20260930 same; old-generator 0: e51c7731/e51c7731 (WorldGen lattice); old-generator 1: fa009862/fa009862, repeat same, seed+1 differs, seed 20260930 same; old-generator 2: c548f665/c548f665, repeat same, seed+1 differs, seed 20260930 same; new game -2: repeat same, seed+1 differs, new-generator 4c8a28ca (not required to equal pre-strata 1898af90); new game -1: repeat same, seed+1 differs, new-generator e9e10c09 (not required to equal pre-strata 3846830f); new game 0: repeat same, seed+1 n/a, pre-strata same; new game 1: repeat same, seed+1 differs, pre-strata same; new game 2: repeat same, seed+1 differs, pre-strata same
PASS baseline_roundtrip - old-generator shape, material, water and biome equal the pre-strata arrays byte for byte (65536 cells, 5 levels); new game shapes and water match, and -2/-1 are one shallow-band grid
PASS solid_open_columns - 5 levels: solid 143840 (5/5 solid strata), open 53198 (5/5 air), floor 130057 (S0; 200 pools with S1..S2 water/lava), ramp 561 (S0..S2), stairs 24 (S0); wrong 0; solid strata at full HP (255) true
PASS fills_0_to_5 - +1 over the valley cell (196,37) (ground below a floor, S4 air): default zMin -16 [5/5 ok, 4/5 ok, 3/5 ok, 2/5 ok, 1/5 ok, 0/5 ok]; legacy zMin -2 [5/5 ok, 4/5 ok, 3/5 ok, 2/5 ok, 1/5 ok, 0/5 ok]; ranges true
PASS floor_on_substrate - default zMin -16: 0/5 over air open; over solid ground {"shape":"floor","top":-1,"elev":84,"mat":"stone"} (want floor, top -1, elevation 84 = ground S4, stone); 0/5 at -2 floor, elevation 69 (want floor, 69); legacy zMin -2: over solid {"shape":"floor","top":-1,"elev":14,"mat":"stone"} (want 14); at -2 open, elevation -1 (want open, -1)
PASS legacy_shapes_match - shapeCodeAt new game/pre-strata over 327680 cells (5 levels): 0 differ; cellAt material/constructed/liquid on every 97th cell of the old-generator world: 0 differ; new game surface levels: 0 differ
PASS surface_elevation_matches - 64975 columns whose surface level S holds a floor: stood-on stratum is S0, elevation (S - zMin) x 5; default zMin -16 wrong 0; legacy zMin -2 wrong 0 (legacy zMin is Z_RANGES.legacy true)
PASS headroom_walkability - ground (8,71): as generated {"shape":"floor","walk":true}; slab on +1 S0 (headroom 4) {"shape":"floor","walk":true}; ground 2/5 under the slab (headroom 3) {"shape":"solid","walk":false} (want solid, not walkable); slab removed {"shape":"floor","walk":true,"top":1}; back to the baseline {"shape":"floor","walk":true,"recorded":false} (no saved record)
PASS damage_single_stratum - hill rock on the ground (64,10): 30 dig on S2 -> HP 255 -> 191 (want 191), S1 255, S3 255; 200 more -> destroyed true: [stone,stone,air,stone,stone] HP [255,255,0,255,255]; HP left 480/480, support 0.80; shape solid (S0..S1 solid under a 1-stratum gap: headroom 1)
PASS destruction_changes_shape - cave floor at -1 (13,8), S0 soil: floor -> S0 destroyed -> open (the cell below is floor: standing on its top at elevation -1); levels:cellChanged 1
PASS damage_crosses_levels_box - box (64,10) from Z-1:S4 to Z0:S0, 500 blast: destroyed 2 on levels [-1,0]; -1 [soil,soil,soil,soil,air] HP [255,255,255,255,0], ground [air,stone,stone,stone,stone] HP [0,255,255,255,255]
PASS sphere_aoe - sphere r 3 ft at the ground's S0 over (64,10), 240 dig, linear, stratum 2 ft: default HP {"-1:0":255,"-1:1":255,"-1:2":255,"-1:3":255,"-1:4":0,"0:0":0,"0:1":85,"0:2":255,"0:3":255,"0:4":255} want {"-1:0":255,"-1:1":255,"-1:2":255,"-1:3":255,"-1:4":0,"0:0":0,"0:1":85,"0:2":255,"0:3":255,"0:4":255} (0 = destroyed); 3 strata hit (want 3), 2 destroyed (want 2), cells written 2 (want 2: this column's -1 and ground; the next cell's middle is 5 ft, outside the radius true), levels [-1,0]; legacy range 3 hit (want 3), cells 2, HP match true
PASS resistance_and_hooks - fire on stone x0.1: 10 -> HP 233; fire on wood x2: 20 -> HP 170; a stone hook returning 0: effective 0, HP 255, saw stone:blast; a "*" hook doubling 12 dig: 24 -> HP 204; impact on a pool's water stratum: fluid true, hit false, fluid hook saw [water], strata unchanged true
PASS events_on_destruction - cave floor (24,8) at -1: a small hit then a destroying one: strataDamaged 2, strataDestroyed 1 {"area":{"x":0,"y":0},"x":24,"y":8,"z":-1,"stratum":0,"material":"soil","constructed":false,"debris":"loose_earth","damageType":"dig","source":"TEST_pick"}, strataChanged 2, cellChanged at -1 after the destroying hit 1 (none for the HP-only hit true), shapeChanged 0
PASS overburden - hasOpaqueOverburden on every 3rd cell of 5 levels (109230) vs "a non-open cell anywhere above": 0 wrong; valley ground: open sky false; under a deck on +2 with +1 open true (Floors.hasOpaqueOverburden true, Floors.isRoofed true; the pre-strata isRoofed false: it looked one level up only); a stone S4 over an air gap in the cell true (+1 above it: false); deep rock at -1 roofed true
PASS shape_grids_coherent - cached grids 5, 327680 cells re-derived with the edits in place: 0 differ; column (8,71) -1/0/+1/+2 floor/open/floor/open (want floor/open/floor/open: -1 2/5, the ground dug out over it, a deck on +1, sky); after restoring: 0 differ
PASS migration_no_data_loss - pre-strata save (662 chars, 9 changed cells) loaded through DataManager.extractSaveContents: dig a -1 rock cell to a soil floor: floor/soil -> floor/soil; wall up a -1 cave floor: solid/stone -> solid/stone; wooden deck on +1 over the valley: floor/wood/built -> floor/wood/built; constructed ramp on +1: ramp/stone/built -> ramp/stone/built; stairs up at -1: stairUp/stone/water -> stairUp/stone/water; wooden deck over a -1 pool: floor/wood/built/water -> floor/wood/built/water; a hole in a +1 hilltop (open over solid ground): open/soil -> floor/stone; ground cell walled with soil: solid/soil -> solid/soil; record {"rule":"strata","to":1,"converted":9,"droppedAsBaseline":1,"invalid":0,"shapeChanged":1,"normalizedOpen":2,"errors":[]}; strataSchemaVersion 1; levels[z].cells gone true; checksums verified (0 mismatches)
PASS migration_profiles - solid_5_of_5 ok, open_0_of_5 ok, floor_S0 ok, deck_constructed ok, ramp_3_of_5 ok, stairs_S0_connector ok, pool_kept ok; e.g. ramp [stone,stone,stone,air,air] ramp, pool deck [wood,water,water,air,air]
PASS unknown_format_diagnostics - (a) strataSchemaVersion 99: console.error true, legacy cells left in place true, setShape refused true, damage refused true; (b) 5 junk legacy entries: invalid 5, console.error true, kept in unmigratedCells true, good entries applied true; (c) a corrupt strata record: console.error true, the other records read true
PASS save_load_strata_hp - ground rock (64,10) after dig: [stone,stone,stone,stone,air] HP [255,255,255,170,0]; +1 (196,37): [stone,water,air,air,air] HP [77,0,0,0,0]; same after save/load true; saved record "000101010100ffffffaa00" (22 hex digits = connector + 5 materials + 5 HP)
PASS unchanged_terrain_regenerates - saved strata records 9 = cells differing from their baseline 9 (of 327680); a fresh new game equals the new-game baselines true; flag-absent save (flag absent) equals the old roll true; +1 (196,37) set back to its baseline (5 air): record dropped true
PASS fluid_adapter - DEUS_Fluid depth 0..7 -> strata [0,1,1,2,3,4,4,5], strata 0..5 -> depth [0,1,3,4,6,7], round trip true; passage bits: pool at -1 38 (capacity 6, down false, FLUID_2_OF_5), rock 0, +2 sky 63 (capacity 7, up true, down true); repeated calls equal true
PASS no_allocation_queries - 3 windows of 400,000 rounds x 5 queries (shapeCodeAt numeric and ref, surfaceHeightAt, hasOpaqueOverburden, getStrataFluidPassage; checksum 43398750): garbage collections inside the windows 0 (want 0), heap growth 272960 / 83904 / 88976 B, least 83904 (limit 2,000,000 = 1 B per query; one 16 B object per query would be 32 MB)
PASS query_cost - shapeCodeAt (ax, ay, x, y, z) on 4096 cells over the 5 levels, 1000000 calls after a warm-up: strata 1119 ns/call, pre-strata 2817 ns/call (bound 2000 ns; the per-frame budget is measured in game)
PASS no_errors - none beyond the 3 the diagnostic check provoked
TIME 379.8 s
RESULT: 26 passed, 0 failed (exit 0)
EXIT=0
```

#### node tools/test_strata_cuts_and_caves.js

```text
=== DEUS-TSK-FABLE-19B natural cuts and all-Z caves: regression seed 18, second seed 3, seed set 18,3,21,4 ===
INFO newWorld seed 18: generator 5 14634 ms, generator 4 (same code, levelsGen 4) 23794 ms, post-WG.00.15 baseline 14586 ms; natural features 507 ms
INFO seed set built: 18, 3, 21, 4 (186 s)
PASS deterministic_same_seed - seed 18 in two vms: strata+connectors+caps per level -2:same -1:same 0:same 1:same 2:same, feature list same; regenerated inside seed 3's world: -2: e96252ee, -1: 5e3c240b, 1: eaf389b9, 2: 9998ffb2
PASS different_seeds_differ - carved columns: seed 18 4997, seed 3 2027, shared 195 (overlap 2.9 %, limit 25 %); cut anchors 19 / 8, at the same cell 0 (0 %, limit 30 %); seed 3 valid (no floating mass, caves present) true
PASS old_generator_unchanged - generator 4 (levelsGen 4) vs post-WG.00.15 baseline (42c3bc9a, 2026-09-27), seed 18: strata per level -2:same -1:same 0:same 1:same 2:same; checksums -2:9978c5f8 -1:f023c77b 0:0779462c 1:1496eea4 2:ae3e6025; no features or caps true; a pre-V80 migration's generators [4,4,4,4,4]
PASS carve_only_removes - 4 seeds, generator 4 -> 5: solid strata carved to air 57026; +2 massif fill on capped summit columns 5345; air -> matter elsewhere 0, solid material changed 0, fluid removed 0; connectors: ramps added 754, other changes on unchanged columns 0
PASS partial_heights - cut columns of seed 18 by the fill of the cell holding the new top: HEIGHT_1_OF_5 519 e.g. (72,24,-1), HEIGHT_2_OF_5 301 e.g. (77,31,-1), HEIGHT_3_OF_5 472 e.g. (76,29,-1), HEIGHT_4_OF_5 654 e.g. (71,24,-1), HEIGHT_5_OF_5 1064 e.g. (69,23,-1) (want >= 5 each); heightStateAt disagreeing 0
PASS z0_to_z1_exposure - 751 generated columns of seed 18 open from the ground down to a floor in -1; deepest (190,83): first air 5 ft, ground cell open, -1 cell floor (HEIGHT_0_OF_5), overburden false
PASS z1_to_z2_exposure - 31 generated sky-open columns of seed 18 whose -1 cell is all air over a floor in -2; deepest (194,89): first air 3 ft, -1 open, -2 floor HEIGHT_3_OF_5
PASS feature_reaches_z2 - a connected generated cut of seed 18: 207 columns, host levels [1], deepest first air 3 ft at (194,89); traced through the cut up to a column whose natural surface is the ground or higher true
PASS shallow_more_common - generated cut components over 4 seeds by realized depth: shallow (<= 4 ft) 66, deeper partial 28, exposing -1 to its S0 20, reaching -2 8 (want shallow >= 3 x reaching -2, and at least one reaching -2); 18: 23 shallow / 3 to -2; 3: 8 shallow / 1 to -2; 21: 18 shallow / 2 to -2; 4: 17 shallow / 2 to -2
PASS caves_on_all_levels - roofed generated cave floors over 4 seeds by level: 2: 930 (seed 18 (87,208)), 1: 1403 (seed 18 (47,98)), 0: 1619 (seed 18 (174,47)), -1: 1378 (seed 18 (43,205)), -2: 2181 (seed 18 (41,206))
PASS cave_free_terrain - 18: cave columns 2058 (3.14 %), massif 691 (1.05 %); 3: cave columns 1531 (2.34 %), massif 290 (0.44 %); 21: cave columns 1927 (2.94 %), massif 262 (0.40 %); 4: cave columns 1686 (2.57 %), massif 1006 (1.54 %) (limits 5 % and 3 %)
PASS traversable_terrain - 18: standable 125240/124320 (100.7 %), ground 24408/23939 (102.0 %), largest ground region 14148/14537 (97.3 %), start valley untouched true; 3: standable 128150/127194 (100.8 %), ground 39962/39468 (101.3 %), largest ground region 39557/39320 (100.6 %), start valley untouched true; 21: standable 127618/126036 (101.3 %), ground 12686/11478 (110.5 %), largest ground region 3348/3348 (100.0 %), start valley untouched true; 4: standable 123812/123627 (100.1 %), ground 15315/14346 (106.8 %), largest ground region 4442/4457 (99.7 %), start valley untouched true
PASS cave_overburden - seed 18: 2128 roofed generated cave floors (hasOpaqueOverburden true and continuousAirHeight = the air run of the strata), 2989 sky-open cut floors (no overburden, Infinity); wrong 0; network chambers roofed at their centres 47/48 (want >= 90 %: a mouth or a cut can open a few): #7 (22,201) floor 10: open to the sky
PASS cave_void_minimum - roofed generated cave voids over 4 seeds by height (ft): {"3":852,"4":1995,"5":2130,"6":1071,"7":1047,"8":301,"9":77,"10":20,"11":5,"12":8,"13":3,"14":2}; under 3 ft 0
PASS roof_breach - cave (167,31,0) under 1 ft of roof: before {"ob":true,"cl":"5","shape":"floor"}, dug 1 strata (want 1) -> {"ob":false,"cl":"Infinity","shape":"floor"}, restored {"ob":true,"cl":"5","records":0}; +2 cave (136,176,2) under a stone cap 10 ft: overburden true -> breached (true, levels:capBreached 1) false, clearance 4 -> Infinity; saved and loaded: overburden false, cap gone, saved record true; restored: overburden true, clearance 4, record kept false
PASS clearance_4_5_more - fixture column (64,30): 1 solid + 4 air under solid 4 ft (derived shape floor: the compatibility view; the clearance is the data), 5 air on -2's S4 5, across -1 and the ground 6 (airRunAt 6), up to +1 9, open sky Infinity, a 2 ft slot 2 (shape solid), solid 0, no floor -1; restored records 0; generated floors: 4 ft (176,39,0), 5 ft (167,31,0), > 5 ft 7 ft (175,46,0); 1,000,000 queries 1502 ns each, heap growth 90280 B (checksum 6075000)
PASS clearance_stops_at_fluid - fixture column (64,30): -1 stone + 4 water, ground solid: continuousAirHeight 0 (want 0), airRunAt(6) 0 (want 0); -1 stone + 2 air + 2 water: continuousAirHeight 2 (want 2), airRunAt(6) 2 (want 2); -1 stone + water + 3 air (from the floor): continuousAirHeight 0 (want 0), airRunAt(6) 0 (want 0); the same, air run from S2: continuousAirHeight 0 (want 0), airRunAt(7) 3 (want 3); -2 stone + 4 lava, -1 solid: continuousAirHeight 0 (want 0), airRunAt(1) 0 (want 0); -2 stone + 4 air, -1 solid (control): continuousAirHeight 4 (want 4), airRunAt(1) 4 (want 4); restored records 0
PASS multi_z_connectivity - 3 networks flagged multi-Z in seed 18; #6 from (202,50) floor 10 ft: 658 air strata (roofed), floors on levels [-1,0]; natural ramp connectors added 294, e.g. (71,24,-1) derived ramp
PASS shafts_keep_fluid - seed 18: 2 shafts (2 with rock under water), 0 skylights (0 with rock under water); seed 3: 3 shafts (0 with rock under water), 10 skylights (10 with rock under water); total rock strata under water: 38 (shafts 8, skylights 30), carved 0; after the carve: every planted water stratum still water, no rock under it carved
PASS no_floating_mass - solid strata not connected to bedrock or the area edge: 18: generator 5 0, generator 4 0; 3: generator 5 0, generator 4 0; 21: generator 5 0, generator 4 0; 4: generator 5 0, generator 4 0; the generator removed 2 unconnected strata in seed 18
PASS protections - 4 seeds: 208 underground founding squares and pools with their roofs, 106 cliff cave mouths with their corridors, the 12-cell area edge (0 changed), 29801 valley cells within 2 of a cut checked for surface water (0 wet)
PASS ground_holes - seed 18: 1116 open ground cells (natural cuts): rock face on layers 0 and 2, region 250, not walkable, cellInfo not walkable, no object; objects on unstandable cut cells at +1/+2 0; volumeStats.open 1116
PASS save_load - generator-5 world saved (634 chars of world state) and loaded: checksums verified (0 mismatches), the dug cave floor (223,46,-1) kept [air,air,air,air,air] (changed true); loaded into a fresh vm that had another world: its checksums regenerate and the dig is there true
PASS no_parallel_authority - baseline members beyond strata, connectors, biome, surface, caps, legacy views, chunk caches and descriptors: none; feature descriptors 11898 chars (no per-cell grid)
PASS cost - seed 18: newWorld generator 5 14634 ms vs generator 4 23794 ms (same code) vs pre-19B 14586 ms; natural features 507 ms (bound 3000); seed set newWorld 3: 14677/22719 ms, 21: 13147/25608 ms, 4: 15364/24446 ms; baselines' own memory per area (strata, connectors, biome, surface, caps) 1818520 B vs 1739776 B (caps 691 entries, ~5528 B; bound +256 KiB), with the cached shape grids and built legacy views 4473368 B vs 3870336 B; fresh save 634 vs 721 chars of world state
PASS fluid_suite - node tools/test_strata_fluid_reconciliation.js: exit 0 in 294 s; PASSED: 36; FAILED: 0; MUTANT VERIFICATION: 5/5 mutants detected.
PASS foundation_suite - node tools/test_strata_foundation.js: exit 0 in 382 s; RESULT: 26 passed, 0 failed (exit 0)
PASS no_errors - none
EVIDENCE (generated worlds; x,y in the start area; levels -2..+2; heights in ft = strata):
  1. shallow partial-height cut floor: seed 18 (77,31) level -1: HEIGHT_2_OF_5 (natural top 11 ft, cut top 7 ft)
  2. Z0 -> Z-1 cut: seed 18 (190,83): ground open, -1 floor HEIGHT_0_OF_5, first air at 5 ft (natural 16 ft), open to the sky
  3. Z-1 -> Z-2 cut: seed 18 (194,89): -1 open (all air), -2 floor HEIGHT_3_OF_5, first air 3 ft (natural 16 ft)
  4. multi-level feature reaching Z-2: seed 18, ravine (TEMP, class z2) of 207 columns spanning x 187..204, y 72..103, host levels 1, deepest (194,89) first air 3 ft
  5. Z+2 cave: seed 18 network #0 (151,180): floor first air 21 ft (level 2), clearance 4 ft, roof the ceiling cap
  6. Z+1 cave: seed 18 network #2 (53,92): floor first air 16 ft (level 1), clearance 3 ft, roof solid from 19 ft
  7. Z+0 cave: seed 18 network #5 (175,41): floor first air 10 ft (level 0), clearance 5 ft, roof solid from 15 ft
  8. Z-1 cave: seed 18 network #8 (213,174): floor first air 5 ft (level -1), clearance 5 ft, roof solid from 10 ft
  9. Z-2 cave: seed 18 network #12 (230,54): floor first air 1 ft (level -2), clearance 4 ft, roof solid from 5 ft
  11. intact physical cave roof: seed 18 (221,46) level -1: floor 5 ft, clearance 7 ft, solid roof from 12 ft to the rock top at 21 ft (9 ft thick), hasOpaqueOverburden true
  12. roof breach: seed 18 (167,31) level 0: roof 15..15 ft dug (1 strata) -> hasOpaqueOverburden true -> false, continuousAirHeight 5 -> Infinity
  12. cap breach: seed 18 (136,176) +2: +2 cave (136,176,2) under a stone cap 10 ft: overburden true -> breached (true, levels:capBreached 1) false, clearance 4 -> Infinity; saved and loaded: overburden false, cap gone, saved record true; restored: overburden true, clearance 4, record kept false
  M4. clearance 4 ft: seed 18 (176,39) level 0
  M5. clearance 5 ft: seed 18 (167,31) level 0
  M>5. clearance 7 ft: seed 18 (175,46) level 0
  10. multi-Z cave network: seed 18 network #6 (level 0, sloped passage), from (202,50) floor 10 ft one air volume of 658 strata holding floors on levels [-1,0]
TIME 382.0 s
RESULT: 28 passed, 0 failed (exit 0)
EXIT=0
```

### Supplemental regression and mutation output

#### node tools/worldgen/test_vertical_biome_coupling.js --smoke

```text
=== VERTICAL BIOME COUPLING (WG.00.15) ===

--- -16..+15 (default) ---
  [FAIL] seed 1 (1036 ms, gen 961 ms, -16..15): seed 1 (8,8,z-16) null (expected crystal_cavern, cold)
  [PASS] kinds: volcanic, wet_water, wet_land, mountain, cold, arid, forest, temperate

--- -4..+4 (test) ---
  [FAIL] seed 1 (1432 ms, gen 1344 ms, -4..4): seed 1 (8,8,z-4) null (expected chalk_karst, cold)
  [PASS] kinds: volcanic, wet_water, wet_land, mountain, cold, arid, forest, temperate

--- survey cap 12 -> 64 ---
  [PASS] seed 12 cap 64 foundAt 51 chains 1 (7762 ms): 0/-1/-2 chain

--- mutants (each must fail) ---
  [SKIP] --smoke

FAIL 2 problem(s) (12645 ms)
EXIT=1
```

#### node tools/test_strata_cuts_and_caves.js --mutant=no_features --quiet

```text
=== DEUS-TSK-FABLE-19B natural cuts and all-Z caves: regression seed 18, second seed 3, seed set 18,3,21,4, MUTANT no_features ===
HARNESS mutant no_features: target not found in DEUS_Levels.js:     function carveNaturalFeatures(seed, gen, ax, ay, size, bs) {

RESULT: 0 passed, 0 failed (exit 2)
EXIT=2
```

#### node tools/test_strata_cuts_and_caves.js --mutant=error_injected --quiet

```text
=== DEUS-TSK-FABLE-19B natural cuts and all-Z caves: regression seed 18, second seed 3, seed set 18,3,21,4, MUTANT error_injected ===
HARNESS mutant error_injected: target not found in DEUS_Levels.js:     function carveNaturalFeatures(seed, gen, ax, ay, size, bs) {

RESULT: 0 passed, 0 failed (exit 2)
EXIT=2
```

#### node tools/test_geology_strata.js --mutant=no_world

```text
MUTANT no_world: DEUS_World.js is not loaded; plugin load must fail
HARNESS plugin failed to load: DEUS_Levels.js: Cannot read properties of undefined (reading 'Z_RANGES')
RESULT: 0 passed, 1 failed (exit 1)
EXIT=1
```

### Reproducible probes without filesystem changes

These commands compile only the setup/helper prefix of the committed harness in memory. Production plugin sources are unmodified. The first probe installs small explicit world-state fixtures and exercises the actual aliased DataManager save/load path. It exits 1 when the observed foreign-world and cache contracts fail. The second creates actual New Games and compares target versus merge-base runtime sources; it is an observation script and exits 0 on successful execution.

#### Foreign description, coupling cache/load, and cell authority

```powershell
@'
const fs=require('fs'),path=require('path'),Module=require('module');
const filename=path.resolve('tools/test_strata_foundation.js');
const raw=fs.readFileSync(filename,'utf8'),marker='const SOLID = 1, FLOOR = 2';
if(!raw.includes(marker))throw Error('Harness bootstrap marker missing');
const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));
mod._compile(raw.split(marker)[0]+'\nmodule.exports={setup,currentSources,saveJson,loadJson};',filename);
const h=mod.exports;
function state(seed,areasX,gen){return {version:4,seed,size:64,areasX,areasY:1,startArea:{x:Math.floor(areasX/2),y:0},zRange:{zMin:-2,zMax:2},verticalBiomeCoupling:true,strataSchemaVersion:1,levels:Object.fromEntries([-2,-1,0,1,2].map(z=>[z,{z,gen,strata:{}}])),units:{},diffs:{},objectDiffs:{}};}
const target=h.setup(h.currentSources(),'target'),host=h.setup(h.currentSources(),'host');
target.UF.World.state=state(20260923,2,4);host.UF.World.state=state(20260930,1,4);
let failures=0;
for(const z of [-1,0,1]){const own=target.UF.Levels.checksum(z),foreign=host.UF.Levels.checksum(z,20260923,4,target.UF.World.state);console.log(JSON.stringify({probe:'foreignDescription',z,own,foreign,equal:own===foreign}));if(own!==foreign)failures++;}
const W=host.UF.World,L=host.UF.Levels;W.state=state(20260923,1,5);
const st=W.state,absent={...st};delete absent.verticalBiomeCoupling;
const on=L.checksum(-1,st.seed,5,st),off=L.checksum(-1,st.seed,5,{...st,verticalBiomeCoupling:false}),absentWarm=L.checksum(-1,st.seed,5,absent);
L.discardBaselineCache();const absentCold=L.checksum(-1,st.seed,5,absent);
const collision=absentWarm===on&&absentCold===off&&on!==off;
console.log(JSON.stringify({probe:'volumeKey',on,off,absentWarm,absentCold,collision}));if(collision)failures++;
const json=h.saveJson(host);L.discardBaselineCache();const onBeforeLoad=L.checksum(-1);
h.loadJson(host,json,w=>{delete w.verticalBiomeCoupling;});const loaded=L.checksum(-1);L.discardBaselineCache();const loadedCold=L.checksum(-1);
const wrongOnLoad=loaded===onBeforeLoad&&loaded!==loadedCold;
console.log(JSON.stringify({probe:'loadAbsent',flagAbsent:W.state.verticalBiomeCoupling===undefined,couplingActive:L.verticalCouplingOn(),onBeforeLoad,loaded,loadedCold,wrongOnLoad}));if(wrongOnLoad)failures++;
const a=W.state.startArea,b=L.baseline(-1,a.x,a.y),dense=b.strata.m,ref={area:a,x:20,y:20,z:-1};
const i=(20*W.state.size+20)*5,original=dense[i],before=JSON.stringify(L.strataAt(ref));dense[i]=original===0?1:0;const after=JSON.stringify(L.strataAt(ref));dense[i]=original;
const saved=h.saveJson(host),forbidden=['cw','dir','mixed','mixedCount','shift','mask'],keys=[];
function walk(v,p='save'){if(!v||typeof v!=='object')return;for(const k of Object.keys(v)){if(forbidden.includes(k))keys.push(p+'.'+k);walk(v[k],p+'.'+k);}}walk(JSON.parse(saved));
h.loadJson(host,saved);const loadedBaseline=L.baseline(-1,a.x,a.y);
console.log(JSON.stringify({probe:'authority',compatibilityCopyMutationChangesRuntime:before!==after,serializedChunkFields:keys,sameProcessLoadReusesBaseline:loadedBaseline===b,sameProcessLoadReusesDenseCompatibility:loadedBaseline.strata.m===dense,chunkCount:b.dir.length,mixedCount:b.mixedCount,mixedActual:b.mixed.filter(Boolean).length,errors:host.__errors}));
console.log('Contract failures='+failures);process.exitCode=failures?1:0;
'@ | node --expose-gc -
$probeExit = $LASTEXITCODE
Write-Output "EXIT=$probeExit"
exit $probeExit
```

Observed output:

```text
{"probe":"foreignDescription","z":-1,"own":"6d96e9be","foreign":"c6e2fc66","equal":false}
{"probe":"foreignDescription","z":0,"own":"bef8fc4d","foreign":"fb1dd0ca","equal":false}
{"probe":"foreignDescription","z":1,"own":"d5336e37","foreign":"f5c1ecfe","equal":false}
{"probe":"volumeKey","on":"57a53a88","off":"d5c6326e","absentWarm":"57a53a88","absentCold":"d5c6326e","collision":true}
{"probe":"loadAbsent","flagAbsent":true,"couplingActive":false,"onBeforeLoad":"57a53a88","loaded":"57a53a88","loadedCold":"d5c6326e","wrongOnLoad":true}
{"probe":"authority","compatibilityCopyMutationChangesRuntime":false,"serializedChunkFields":[],"sameProcessLoadReusesBaseline":true,"sameProcessLoadReusesDenseCompatibility":true,"chunkCount":4,"mixedCount":4,"mixedActual":4,"errors":[]}
Contract failures=5
EXIT=1
```

#### Biome regression before and after the target change

```powershell
@'
const fs=require('fs'),path=require('path'),Module=require('module'),cp=require('child_process');
const filename=path.resolve('tools/test_strata_cuts_and_caves.js');
let source=fs.readFileSync(filename,'utf8');
const marker='console.log(`=== DEUS-TSK-FABLE-19B';
if(!source.includes(marker))throw Error('Harness bootstrap marker missing');
source=source.slice(0,source.indexOf(marker))+'\nmodule.exports={setup,currentSources,newWorld,saveJson,loadJson};';
const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));mod._compile(source,filename);
const h=mod.exports;
for(const revision of ['6dd500c3','ecc7b898']){
 const src=h.currentSources();
 if(revision==='ecc7b898')for(const f of ['DEUS_Levels.js','DEUS_WorldGen.js'])src[f]=cp.execFileSync('git',['show',revision+':game/js/plugins/'+f],{encoding:'utf8',maxBuffer:64<<20});
 const e=h.setup(src,revision,'default');h.newWorld(e,18,4);
 const L=e.UF.Levels,st=e.UF.World.state;
 const rows=[-1,-3,-9,-16].map(z=>({z,columnBiomeId:L.columnBiomeId(100,100,z),biomeId:(L.biomeAt({area:st.startArea,x:100,y:100,z})||{}).id||null}));
 console.log(JSON.stringify({revision,verticalBiomeCoupling:st.verticalBiomeCoupling,zRange:st.zRange,rows,errors:e.__errors}));
}
'@ | node --expose-gc -
$probeExit = $LASTEXITCODE
Write-Output "EXIT=$probeExit"
exit $probeExit
```

Observed output:

```text
{"revision":"6dd500c3","verticalBiomeCoupling":true,"zRange":{"zMin":-16,"zMax":15},"rows":[{"z":-1,"columnBiomeId":null,"biomeId":"rooted_loam"},{"z":-3,"columnBiomeId":null,"biomeId":null},{"z":-9,"columnBiomeId":null,"biomeId":null},{"z":-16,"columnBiomeId":null,"biomeId":null}],"errors":[]}
{"revision":"ecc7b898","verticalBiomeCoupling":true,"zRange":{"zMin":-16,"zMax":15},"rows":[{"z":-1,"columnBiomeId":"rooted_loam","biomeId":"rooted_loam"},{"z":-3,"columnBiomeId":"rooted_loam","biomeId":"rooted_loam"},{"z":-9,"columnBiomeId":"deep_mine_belt","biomeId":"deep_mine_belt"},{"z":-16,"columnBiomeId":"deep_mine_belt","biomeId":"deep_mine_belt"}],"errors":[]}
EXIT=0
```

## Not done / known problems

- BB-CODEX-01 through BB-CODEX-04 remain unfixed; this assignment authorizes a review report only.
- The general claim that every foreign-world caller supplies its own description is false. The supplied same-seed tests do not cover differing descriptions.
- The foundation flag-absent check proves its generator-4 fixture, not generator-5 warm-cache load correctness.
- The no_parallel_authority whitelist is not a dynamic proof of cache reconstruction on every load.
- Full foundation/cuts mutation rosters were not rerun. Two selected cuts mutation controls failed to inject, as reported; the historical gate ran and detected its own eight mutants.
- RMMZ editor F5 Playtest, F8 console inspection, rendered appearance, and screenshots were not checked. Headless VM results do not establish those acceptance criteria.
- Scope is clean for the actual lane-only patch; the explicitly requested older-base diff includes one inherited PM path outside allowedPaths.

## Try it in RMMZ

Not run in this review session. After the fixes, the implementer should reproduce the two runtime issues with controlled development saves:

1. Start a coupled default-range New Game and inspect an underground cell below Z-2 (for example seed 18, area 0,0, local 100,100, levels -3/-9/-16).
2. In a disposable development fixture, load a flag-absent generator-5 save after a coupled world with the same seed, area geometry, and Z range has been generated in the process.
3. Compare that loaded world's regenerated baselines with a cold process loading the same save, and inspect F8 for checksum-mismatch diagnostics.

Expected: outer underground cells retain the documented column/depth biome; the flag-absent save regenerates the same uncoupled bytes regardless of previously cached worlds. These are proposed follow-up steps, not observed editor evidence.

## Decisions needed

- No new game-design decision is needed to correct the four findings; the documented coupling and determinism contracts are sufficient.
- Preserve the Owner-approved WG.00.15 reference. Return the implementation for the specific corrections and independent rerun before merge approval.
- Do not treat the five EXIT=0 manifest results or the accepted re-baseline as an overall PASS for this target.
