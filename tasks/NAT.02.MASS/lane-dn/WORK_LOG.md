# NAT.02.MASS part 1 / lane-dn work log

Date: 2026-10-01. Writer: codex. Reviewer: grok (not yet performed).
Base: `3b12aed03ce7a66a4c84ec0cedc3bec453002fdc`, branch `task/lane-dn`.

## Claim

IN PROGRESS: codex owns `game/js/sim/units.js`, `tools/sim/test_units.js`,
`docs/systems/DEUS_Matter.md`, and this lane's task folder for the units brief.
The direct Owner allowedPaths restriction prevents editing `docs/STATUS.md`
or `docs/VISION.md`; this local record substitutes for the usual claim and
records that precedence. No art, importers, soil, push, merge or WBS closure.

## Preconditions

- Clean worktree at launch; branch is `task/lane-dn`.
- `b21cfe62` merged lane-cu through merge_gate; present in this base and main.
- `32a2fe05` synchronized CANONICAL_ROLES 2.1 and registered NAT.02.MASS as
  a shared leaf with parts, not sub-IDs.
- `b889de90` placed the brief and manifest on main. Their content matches
  this worktree, including the mutation-sweep gate.
- Required post-cu DEUS system documents exist, including archived
  DEUS_VerticalBiomes. All three implementation paths are absent at base.
- Initial read-only overlap scan hit a BOM in an unrelated historical
  manifest; stripped BOM when parsing, without changing that file. The scan
  then found lane-co and lane-cu glob matches. Both branch tips are ancestors
  of this base; no unmerged manifest owns the three implementation paths.
  A baseline log attempt before its directory existed failed to save output;
  the recorded baseline runs were rerun after creating the lane evidence folder.
- Latest audit A11-2 concerns incompatible mass units. This foundation
  addresses the missing shared helpers; migration and audit closure remain
  downstream work. SLICES is an older civilization plan; the direct lane
  assignment and DEC-058/059 govern this natural-world work.

## Verification plan

Run baseline keep-green gates and the new harness while units.js is absent.
Then run all four manifest gates, four behavior mutants and a scratch
surviving-mutant control. All child processes are synchronous/foreground.
Fresh-clone validation stays under this lane folder. No F5 evidence is
required by the brief; no playable behavior is claimed.

## Implementation notes

- Seven default checks now pass and all four required mutants are killed.
- First implementation test run: six passed, kg_to_cp_rule failed because the
  maximum-cp decimal fixture was transcribed incorrectly. Corrected the fixture
  using `9007199254740991n * 45359237n / 10000000000n`; production conversion
  code was unchanged. Correct maximum is 40855968570201.9984383867 kg.
- WORLD_BOUND checks DEC-038's 768 x 768 x 32 envelope. The load-time proof is
  explicitly water-only; a caller-supplied material maximum plus extra reservoir
  mass permits later importers to check a real whole-world bound without
  inventing a new material density in this lane.
