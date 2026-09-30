# Lane brief: lane-cw2 (NAT.03.01), a clean repackage of lane-cw

- **Why:** merge_gate refused task/lane-cw with MANIFEST_TAMPERED. The Codex writer commit 9d8515d8 edited tasks/NAT.03.01/lane-cw/lane.json (it added its own test as a gate), and the setup commit ab15c1f9 was tagged [ops]. Only [gemini] or [pm] commits may change a lane manifest, and a branch that contains such a commit can never pass (docs: tools/governance/MERGE_GATE.md, (a) manifest).
- **What:** this [pm] commit adds the trusted manifest first. The four original lane-cw commits follow as unchanged cherry-picks (ab15c1f9, 939b98c3, 9d8515d8, 28fe2614), keeping their authors and tags. The content tree matches lane-cw's reviewed tip 28fe2614.
- **Scope and task:** exactly lane-cw's, as directed in MSG-PRUNE-PM-034: Fluid fixes (a)-(h); items held for design D2 stay out. The full brief is tasks/NAT.03.01/lane-cw/BRIEF.md.
- **Gates:** the manifest now lists the writer's test (fluid_correctness_lane_cw) as a trusted gate.
- **Review:** Grok reviews this branch's tip; the review file is named review_grok_<first 8 of the last non-review commit>.md.
- **Braintrust answerability (DEC-052):** ANSWERED on lane-cw's diff (ChatGPT Pro, ANSWER-CW, 2026-09-30). This branch carries the same content.
- **Writer:** codex (openai). **Reviewer:** grok (xai). **Packaged by:** Claude (PM), 2026-09-30.
