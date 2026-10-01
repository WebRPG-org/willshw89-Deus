# DEUS — CANONICAL AI ROLES & DIVISION OF LABOR
**Document ID:** `DEUS-GOV-ROLES-01`  
**Status:** AUTHORITATIVE & BINDING  
**Authority:** Owner Directive (2026-09-25, drafted with Grok / Incoming PM)  
**Applicability:** All AI Agents (Gemini, Claude / Fable, Grok, Codex)

---

## 1. Executive Principle & Single Authority

This document is the **single source of truth** for AI agent roles, responsibilities, and decision authorities on Project DEUS. It reconciles, supersedes, and unifies all prior role descriptions in `GEMINI.md`, `AGENTS.md`, `docs/DIVISION_OF_LABOR.md`, and `docs/WORK_QUEUE.md`. All other governance documents must point directly to this specification.

Review interval: Roles are reviewed after approximately **10 completed tasks**, using telemetry and verified output, not impressions.

---

## 2. Allocation of Roles by Aptitude

| Agent / Model | Primary Role | Core Responsibilities | Hard Constraints & Invariant Boundaries |
|---|---|---|---|
| **Gemini / Antigravity** | **Coordinator & Integration Authority** | • Orchestration, task routing, and WBS state transitions.<br>• Integration authority for all merges into `main`.<br>• Repository health, architectural alignment, and baseline profiling.<br>• Autonomous non-living art production pipeline via Google Nano Banana Pro.<br>• Telemetry monitoring and 3-minute pulse reporting. | • **Does not self-certify.** A WBS item CANNOT be marked `DONE` until an independent closure reviewer's verdict is recorded with a timestamp that precedes the `DONE` edit.<br>• Cannot close defects as `grok`. May record `FIX_READY`. |
| **Claude / Fable** | **Primary Implementer** | • Core engine leaves (`DEUS_Levels.js`, `DEUS_WorldGen.js`, `DEUS_Fluid.js`, etc.).<br>• Simulation leaves and society systems (`DEUS_Projects.js`, `DEUS_Colonists.js`, `DEUS_Jobs.js`).<br>• Primary code authoring for deep mechanics and algorithmic implementations. | • Does not modify WBS statuses directly (submits evidence packets to Coordinator).<br>• Does not edit files outside assigned worktree/lane. |
| **Grok** | **Adversarial Reviewer, Defect Closer & Lane Writer** | • Independent adversarial code audit and vulnerability identification.<br>• Failure mutation design and defect verification.<br>• Defect closure authority (`closedBy: "grok"`).<br>• Performance attack plans and boundary condition audits.<br>• Production code writer, runtime engine plugins included, in a lane whose manifest names Grok as writer: natural-world lanes (DEC-058; Section 2.1) and, while Claude is constrained, other lanes (DEC-031 item 1). | • Outside the lanes it writes, **not the author of specs, protocols, or results documents**; as a lane's writer it writes the system doc and the report its brief names.<br>• Any Grok document or report stating results **must cite the specific execution run and commit** that produced them.<br>• Writes production code only as the named writer in `tasks/<id>/<lane>/lane.json`, inside that manifest's `allowedPaths`, with a reviewer of another family (Gemini reviews Grok, DEC-031 item 1). Never reviews, or closes defects in, code it wrote.<br>• *Superseded 2026-10-01 (DEC-058; synced under DEC-051 item 2): "Does not implement production engine code."* |
| **Codex** | **Tooling & Harness Engineer; Natural-World Lane Writer** | • Bounded diagnostic tooling, test harnesses, and validation scripts.<br>• Telemetry collectors, governance parsers, and performance probes.<br>• Auxiliary automation scripts and CI/CD harnesses (when usage/model is available).<br>• Production code writer, runtime engine plugins included, in a natural-world lane whose manifest names Codex as writer (DEC-058; Section 2.1). | • Outside natural-world lanes: bounded to `tools/` and `docs/telemetry/`, and does not modify runtime engine plugins (`game/js/plugins/`).<br>• In a natural-world lane: writes only that manifest's `allowedPaths` (which may include `game/js/plugins/`, `game/js/sim/`, data subfolders of `game/data/` and `docs/systems/`), with a reviewer of another family.<br>• *Superseded 2026-10-01 for natural-world lanes (DEC-058; synced under DEC-051 item 2): the `tools/` and `docs/telemetry/` bound was absolute.* |

### 2.1 Natural-world build routing (DEC-058; WORK-GATE G02, 2026-10-01)

Applies to the lanes of the natural-world build that DEC-058 approved (the PM's build plan of 2026-09-30 as amended by the braintrust's WORK-GATE G02 verdict). Other work keeps the table above.

- **Writers:** claude, codex, gemini or grok, as each lane's `tasks/<id>/<lane>/lane.json` names. Grok and Codex may write production code, runtime engine plugins included, inside that manifest's `allowedPaths`. Authority: DEC-058 ("AG swarms the lanes (writers and reviewers from different families)") and DEC-031 item 1 (Grok writes; Gemini reviews Grok; no model reviews its own code).
- **Reviewer:** always from a different family than the writer (claude and fable are one family; gemini and antigravity are one family). `tools/governance/merge_gate.js` refuses a same-family reviewer in the manifest and a same-family review commit (`REVIEW_SAME_FAMILY`). Gemini reviews follow DEC-031 item 4.
- **D1 lanes take no Claude.** Lanes that build the merged D1 design (deep geology by band, caves and ravines, magma and the core reservoir, the D1 registration freeze, and the sparse outer save and lazy-area work that precede them: WBS WG.00.43, WG.00.45, WG.00.46, WG.00.30, WG.62.03, WG.62.04 and WG.62.05, including their WG.CELL-WRITE parts; plan lanes da, dc, dd, df, dg, dh, di, dj, dk and dl, and lane-fn's WG.62.03 part) take both writer and reviewer from codex, gemini or grok. There is no fallback to a Claude writer for these lanes. Claude stays available as writer or reviewer for the D2, D3, D4, bestiary and other natural-world lanes. (Merged D1 design, 2026-10-01, section 1; WORK-GATE G02 section 3.)
- **First D1 assignment:** lane-da (WG.00.43, WG.CELL-WRITE part 1) writer grok, reviewer gemini (WORK-GATE G02 section 2). Wave-2 D1 reconciliation (2026-10-01), as `tasks/wbs_registry.json` records them: lane-dc (WG.00.45, WG.CELL-WRITE part 2) writer grok, reviewer gemini; lane-dk (WG.62.05) writer codex, reviewer grok. Neither has a Claude writer or reviewer.
- **MiniMax is not used:** the Owner removed it from the project altogether (DEC-076, 2026-10-01, withdrawing DEC-075). merge_gate does not know its family and refuses it.
- **Unchanged:** the engine core stays read-only (AGENTS.md Rule 9); no model reviews its own family's code; evidence comes before closure (Section 3); the PM runs merge_gate with `--no-ff` (DEC-048).

---

## 3. The Independent Verification Gate

No WBS leaf, feature milestone, or defect may be declared closed without meeting the two-party verification rule:

$$\textbf{Implementation (the writer named in the lane manifest)} \;\;+\;\; \textbf{Independent Review (another model family)} \;\;+\;\; \textbf{PM Merge through merge\_gate} \;\;=\;\; \textbf{DONE}$$

*Superseded 2026-10-01 (DEC-048 item 3, DEC-058; synced under DEC-051 item 2): "Implementation (Claude/Fable or Gemini) + Independent Adversarial Audit (Grok) + Coordinator Merge (Gemini) = DONE".*

1. **Independent First Verdict**: Reviewers (of any family other than the writer's) must inspect actual git commits and execute tests independently, forming their first verdict without relying on the implementer's self-reported text.
2. **Defect Lifecycle**:
   - `OPEN`: Discovered by reviewer or test harness.
   - `FIX_READY`: Implementer commits fix and provides evidence run.
   - `CLOSED`: Reviewer independently verifies fix commit in tree and records formal closure signature with timestamp.
3. **No Retroactive Backfill**: Closure timestamps must reflect genuine verification moments; rapid sequential backfilling is prohibited.

---

## 4. File Ownership & Concurrency Boundaries

To ensure zero merge conflicts and preserve codebase integrity during parallel execution:
- **One Primary Writer per File Set**: Each active task lane possesses exclusive write access to its designated whitelist.
- **Several lanes per provider** (DEC-078, Owner 2026-10-01: "We can have each AI doing multiple lanes"): a provider may write some lanes and review others at the same time. Every lane whose brief, manifest and dependencies are ready is launched; the file-set rule above and the writer/reviewer family split still hold.
- **Published Matrix**: Active file ownership must be published in `docs/STATUS.md` prior to launching parallel work lanes.
- **Migration Freeze Protocol**: Migration or directory restructuring (e.g. copying to `C:\Dev\DEUS`) requires a synchronized **Migration Freeze** where all active lanes commit their work and pause. Zero edits may occur during file migration.

---

## 5. Pointer References

The following documents defer to and are governed by this specification:
- `GEMINI.md` → Refers to Section 2 (Gemini Role: Coordinator, Integration, Non-Living Art).
- `AGENTS.md` → Refers to Section 2 & 4 (Collaborative multi-agent boundaries).
- `docs/DIVISION_OF_LABOR.md` → Refers to Section 2 (Gemini / Fable domain split).
- `docs/WORK_QUEUE.md` → Refers to Section 3 (Routing and approval gates).
