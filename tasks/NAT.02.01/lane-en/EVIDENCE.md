# lane-en evidence (NAT.02.01 part 1, rooted support topology)

Writer claude, reviewer grok. Branch `task/lane-en`. Base `196f10ee` (post lane-cu merge `b21cfe62`; NAT.02.01 reopened in `b889de90`). Class C: no F5 evidence.

All files below are real command output saved on 2026-10-01 in `evidence/`.

| File | Command and state | Result |
|---|---|---|
| `base_absence.txt` | `node tools/test_structural_rooted.js` in an export of base `196f10ee` with only the new test file added | `FAIL: rooted_modules_present` (rooted.js and reader.js missing), exit 1 |
| `base_test_structural_collapse.txt` | Legacy suite at the base (keep-green) | 5/5 PASS, exit 0 |
| `tip_full.txt` | Full gate at the tip: baseline, legacy controls, 12 mutants | 12/12 checks PASS; legacy rejected on 3/3; 12/12 mutants killed; exit 0 |
| `tip_legacy.txt` | `--legacy`: the unchanged `support.js::evalCellSupport` through the adapter | `rooted_floating_ring_fails`, `rooted_bearing_needs_root` and `rooted_cross_z_member` all FAIL, exit 1 |
| `tip_mutant_unknown_as_air.txt` | `--mutant=unknown_as_air` | `rooted_unknown_is_pending` FAIL ("ledge beside unavailable terrain verdict: got unsupported, expected pending"), exit 1 |
| `tip_mutant_reset_distance.txt` | `--mutant=reset_distance` | `rooted_distance_carried` FAIL ("ledge cell 2 dist: got 1, expected 2"; cell 3 supported), exit 1 |
| `tip_mutant_trust_flag.txt` | `--mutant=trust_flag` | `rooted_bearing_needs_root` FAIL ("X on rubble on a floating block verdict: got supported"), exit 1 |
| `tip_mutant_x_only.txt` | `--mutant=x_only` | `rooted_rotation_invariant` FAIL ("rotation 0 offset (0,-1) verdict: got unsupported"), exit 1 |
| `tip_test_structural_collapse.txt` | Legacy suite at the tip (keep-green) | 5/5 PASS, exit 0 |
| `tip_check_deus_syntax.txt` | `node tools/check_deus_syntax.js` | 62 files, 0 errors |
| `gate_fresh_clone.txt` | Both gate commands in a fresh clone of `task/lane-en` (autocrlf=true, CRLF checkout) | Both exit 0 |

Not checked: the NW.js in-engine package proof (`tools/test_package_proofs_ingame.js`).
