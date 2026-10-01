# Reviewed-scanner restoration claim

2026-10-01: Codex resumes WG.00.44 on `task/lane-db` under MSG-PRUNE-PM-116
item 1 and the Owner ruling, "Ship reviewed scanner". Requested resume checkpoint:
`ecaea43ec9508440bf17b4d615efe15edb231600`; observed HEAD:
`c50fddfad4714d51b6cb0181ea0cd2d675bf556a` (only an operations launch record
after that checkpoint). No tracked uncommitted diff; two existing untracked
launch prompts are preserved.

Writer scope (claim released after the checks below): restore `tools/lib/vm_harness_scan.js`,
`tools/test_sim_loader.js`, `tools/bench_history_demographics.js`, and
`docs/systems/DEUS_World.md` from `06ccf8ce`; append the Owner-accepted gaps;
update this lane's report and evidence. The AST attempt remains historical.
`docs/STATUS.md` and `docs/VISION.md` are outside the expressly allowed paths,
so this bounded claim and ruling are recorded here. `lane.json` stays unchanged.
No art, push, merge, independent certification, or WBS closure.

All six manifest gates ran in separate fresh clones in the foreground,
with a 900-second timeout each, on candidate
`a018ccb53cfc0d3f0ddd1103ad13096ed80ed232`; every gate exited 0. The three restored
mutants and the headless base-overlay probe produced only their expected failures.
The runner exited 0. Existing whitespace corrections and the retraction of the
original clean-diff claim are retained. See `REPORT.md` and
`evidence/reviewed_scanner_restore/` for measured counts, command output, and the
opened NW.js screenshot. The restoration is ready for PM handoff; no independent
review or integration is claimed. Active writer claim released, 2026-10-01.
