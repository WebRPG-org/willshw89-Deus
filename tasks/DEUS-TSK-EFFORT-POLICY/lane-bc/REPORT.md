# Lane BC report: DEUS-TSK-EFFORT-POLICY

## Import

Commit `757124779e1e38f43659fb56858c18c97d89a1a9` copies the live launcher library to `tools/ops/pm_launch/top_models.ps1` byte for byte.

- Live path: `C:\Users\snewt\.deus_worktrees\logs\pm_ops\top_models.ps1`
- SHA-256 of the live file, of that commit's working tree file, and of the git blob: `F1E271E78B140F46AE43C58DE9CAFA376827F7A433D43B2FCF9ABDBB14B2D386`
- The gate test reads the blob back with `git cat-file` and checks the same hash.

## What changed

Code commit `fec8c32b9124010524a4585c634968330936e76d` is the diff against the import. This report commit adds only `REPORT.md`.

```
 tools/ops/pm_launch/.gitattributes             |   3 +
 tools/ops/pm_launch/test_top_models_effort.ps1 | 393 +++++++++++++++++++++++++
 tools/ops/pm_launch/top_models.ps1             |  57 +++-
 3 files changed, 445 insertions(+), 8 deletions(-)
```

`Resolve-PmEffort` keeps an explicit Grok effort of `high` when all of these hold:

- provider is `grok`
- tier is `standard` (a big tier stays on the floor)
- the lane's `lane.json` `effortClass` is `mechanical` after trim and lowercase
- the lane's `lane.json` `writer` is `grok` after trim and lowercase

`Get-PmTopModelSpec` passes the lane into `Resolve-PmEffort`. Lane discovery is the same search `Resolve-PmTier` used: `$PmWorktreeRoot\<lane>\tasks\**\<lane>\lane.json`, first match. `$PmWorktreeRoot` defaults to `C:\Users\snewt\.deus_worktrees` when the file is dot-sourced. Tests assign it after dot-sourcing. Launchers leave the default.

Empty effort, `top`, `xhigh`, `medium`, and `low` stay on the existing Grok floor (`xhigh` for both tiers). Claude, Codex, Fable, and Gemini keep the imported answers. The test loads the import blob in a separate Windows PowerShell 5.1 process and compares the full spec (effort, tier, model, family, args, exe, js, multi-agent, fallback, all-limited, stdin).

`.gitattributes` sets `-text` on the launcher file so a checkout keeps the committed bytes for the PM install copy.

## Decisions

- `effortClass` matches only after `Trim()` and `ToLowerInvariant()`, then an exact compare with `mechanical`. `Mechanical `, ` mechanical `, and `MECHANICAL` match. `mechanical-extra` and `Mechanical.` do not.
- `writer` uses the same normalization and an exact compare with `grok`. ` Grok ` matches. `claude`, a missing writer, and `grok-4.7` do not.
- A missing lane, a missing `effortClass`, null, a number, a JSON array, an empty file, or invalid JSON is not mechanical, so the floor applies.
- Windows PowerShell 5.1 `Get-Content | ConvertFrom-Json` accepts a UTF-8 BOM, so a BOM file is a normal `lane.json`. A BOM file whose task id is `WG.00.17` is tier `big` and stays `xhigh`. A BOM file with a standard task id and a grok mechanical writer honours explicit `high`.
- An explicit `-TaskType` still wins over the lane task id. That is existing `Resolve-PmTier` behavior. `-TaskType standard` on a `WG.00.17` lane is tier `standard`, so rule (b) can honour `high`. With no `-TaskType`, `WG.00.17`, `SIM.60.05`, `SIM.60.06`, `SIM.40.00`, `SIM.40.11`, and `SIM.00.01` are tier `big` and stay `xhigh`. The launchers default `-TaskType` to empty, so the task id is what normally decides.
- `-TaskType routine` still selects tier `standard` and still turns Grok multi-agent off. Explicit `high` on a mechanical grok-writer lane is honoured. No effort on that lane stays `xhigh`.
- Rule (b) applies to the selected Grok model, including a fallback such as `grok-4.6`.

## Mutants

The test copies the library, plants one fault, and runs it itself. Each fault changes the answer. The real file keeps the safe answer.

| Mutant | Fault | Killed result | Real result |
| --- | --- | --- | --- |
| ignore_writer | writer check removed | non-grok writer + `high` -> `high` | `xhigh` |
| ignore_tier | standard-tier check removed | `WG.00.17` + `high` -> `high` | `xhigh` |
| ignore_effortclass | effortClass check removed | `simulation` + `high` -> `high` | `xhigh` |
| treat_malformed | missing or unreadable lane.json treated as mechanical | malformed or missing lane + `high` -> `high` | `xhigh` |
| allow_medium | explicit `medium` kept below the floor | mechanical + `medium` -> `medium` | `xhigh` |

`allow_medium` still raises `low` to `xhigh`. `ignore_effortclass` still raises `medium` to `xhigh`.

## Open Owner questions

No open Owner question is in the required reading. Rule (b) is the Owner decision of 2026-09-27 11:26 CT. This lane does not edit `docs/OWNER_DECISIONS.md` or `docs/STATUS.md`.

## Install step

After the independent Gemini review passes and the commit is merged, from a checkout of that merge:

```powershell
Copy-Item -LiteralPath 'C:\Users\snewt\.deus_worktrees\logs\pm_ops\top_models.ps1' -Destination 'C:\Users\snewt\.deus_worktrees\logs\pm_ops\top_models.ps1.bak_20260927_effortclass'
Copy-Item -LiteralPath 'tools\ops\pm_launch\top_models.ps1' -Destination 'C:\Users\snewt\.deus_worktrees\logs\pm_ops\top_models.ps1'
```

That backs the live file up to `top_models.ps1.bak_20260927_effortclass`, then copies `tools/ops/pm_launch/top_models.ps1` over the live file. `start_writer2.ps1`, `start_writer3.ps1`, `start_review.ps1`, and the Gemini pulse keep dot-sourcing the live path and need no edit.

## PROPOSED-BC-01

Add an `effortClass` line to the PM brief template and to `tools/ops/README.md` section 1. At lane opening the PM writes `"effortClass": "mechanical"` for data files, schemas, templates, catalog entries, formatting, and simple specs. Any other value, or leaving the field out, keeps the Grok `xhigh` floor.

## PROPOSED-BC-02

Gemini records rule (b) beside DEC-032 item 5 in `docs/OWNER_DECISIONS.md`. STATUS section 0 already assigns that recording.

## PROPOSED-BC-03

The live `pm_ops\top_models.ps1` and the repo copy are two files after install. A later ops change could point the launchers at the repo file so the installed copy cannot drift.

## Gate output

Commands from `tasks/DEUS-TSK-EFFORT-POLICY/lane-bc/lane.json`, run from the worktree root on the code commit above. This report does not change the code under test.

### `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/pm_launch/test_top_models_effort.ps1`

Process exit code: 0

```
PASS import blob sha256
PASS default worktree root
PASS big task list WG.00.17
PASS big task list SIM.60.05
PASS big task list SIM.60.06
PASS big task list SIM.40.00
PASS big task list SIM.40.11
PASS big task list SIM.00.01
PASS rule grok mechanical high effort
PASS rule grok mechanical high tier
PASS rule grok mechanical high multi
PASS rule grok mechanical high family
PASS rule grok mechanical high args
PASS rule grok mechanical no effort effort
PASS rule grok mechanical no effort tier
PASS rule grok mechanical no effort multi
PASS rule grok mechanical no effort family
PASS rule grok mechanical no effort args
PASS rule grok mechanical medium effort
PASS rule grok mechanical medium tier
PASS rule grok mechanical medium multi
PASS rule grok mechanical medium family
PASS rule grok mechanical medium args
PASS rule grok mechanical low effort
PASS rule grok mechanical low tier
PASS rule grok mechanical low multi
PASS rule grok mechanical low family
PASS rule grok mechanical low args
PASS rule grok mechanical xhigh effort
PASS rule grok mechanical xhigh tier
PASS rule grok mechanical xhigh multi
PASS rule grok mechanical xhigh family
PASS rule grok mechanical xhigh args
PASS rule grok mechanical top effort
PASS rule grok mechanical top tier
PASS rule grok mechanical top multi
PASS rule grok mechanical top family
PASS rule grok mechanical top args
PASS rule grok mechanical HIGH effort
PASS rule grok mechanical HIGH tier
PASS rule grok mechanical HIGH multi
PASS rule grok mechanical HIGH family
PASS rule grok mechanical HIGH args
PASS rule grok mechanical padded high effort
PASS rule grok mechanical padded high tier
PASS rule grok mechanical padded high multi
PASS rule grok mechanical padded high family
PASS rule grok mechanical padded high args
PASS rule grok non-mechanical high effort
PASS rule grok non-mechanical high tier
PASS rule grok non-mechanical high multi
PASS rule grok non-mechanical high family
PASS rule grok non-mechanical high args
PASS rule grok simulation high effort
PASS rule grok simulation high tier
PASS rule grok simulation high multi
PASS rule grok simulation high family
PASS rule grok simulation high args
PASS rule grok mechanical-extra high effort
PASS rule grok mechanical-extra high tier
PASS rule grok mechanical-extra high multi
PASS rule grok mechanical-extra high family
PASS rule grok mechanical-extra high args
PASS rule grok Mechanical-dot high effort
PASS rule grok Mechanical-dot high tier
PASS rule grok Mechanical-dot high multi
PASS rule grok Mechanical-dot high family
PASS rule grok Mechanical-dot high args
PASS rule grok Mechanical-space high effort
PASS rule grok Mechanical-space high tier
PASS rule grok Mechanical-space high multi
PASS rule grok Mechanical-space high family
PASS rule grok Mechanical-space high args
PASS rule grok trimmed mechanical high effort
PASS rule grok trimmed mechanical high tier
PASS rule grok trimmed mechanical high multi
PASS rule grok trimmed mechanical high family
PASS rule grok trimmed mechanical high args
PASS rule grok MECHANICAL high effort
PASS rule grok MECHANICAL high tier
PASS rule grok MECHANICAL high multi
PASS rule grok MECHANICAL high family
PASS rule grok MECHANICAL high args
PASS rule grok writer Grok padded high effort
PASS rule grok writer Grok padded high tier
PASS rule grok writer Grok padded high multi
PASS rule grok writer Grok padded high family
PASS rule grok writer Grok padded high args
PASS rule grok writer not grok high effort
PASS rule grok writer not grok high tier
PASS rule grok writer not grok high multi
PASS rule grok writer not grok high family
PASS rule grok writer not grok high args
PASS rule grok writer missing high effort
PASS rule grok writer missing high tier
PASS rule grok writer missing high multi
PASS rule grok writer missing high family
PASS rule grok writer missing high args
PASS rule grok writer model-name high effort
PASS rule grok writer model-name high tier
PASS rule grok writer model-name high multi
PASS rule grok writer model-name high family
PASS rule grok writer model-name high args
PASS rule grok null effortClass high effort
PASS rule grok null effortClass high tier
PASS rule grok null effortClass high multi
PASS rule grok null effortClass high family
PASS rule grok null effortClass high args
PASS rule grok numeric effortClass high effort
PASS rule grok numeric effortClass high tier
PASS rule grok numeric effortClass high multi
PASS rule grok numeric effortClass high family
PASS rule grok numeric effortClass high args
PASS rule grok malformed lane high effort
PASS rule grok malformed lane high tier
PASS rule grok malformed lane high multi
PASS rule grok malformed lane high family
PASS rule grok malformed lane high args
PASS rule grok empty lane.json high effort
PASS rule grok empty lane.json high tier
PASS rule grok empty lane.json high multi
PASS rule grok empty lane.json high family
PASS rule grok empty lane.json high args
PASS rule grok array lane.json high effort
PASS rule grok array lane.json high tier
PASS rule grok array lane.json high multi
PASS rule grok array lane.json high family
PASS rule grok array lane.json high args
PASS rule grok missing lane high effort
PASS rule grok missing lane high tier
PASS rule grok missing lane high multi
PASS rule grok missing lane high family
PASS rule grok missing lane high args
PASS rule grok bom big lane high effort
PASS rule grok bom big lane high tier
PASS rule grok bom big lane high multi
PASS rule grok bom big lane high family
PASS rule grok bom big lane high args
PASS rule grok bom standard lane high effort
PASS rule grok bom standard lane high tier
PASS rule grok bom standard lane high multi
PASS rule grok bom standard lane high family
PASS rule grok bom standard lane high args
PASS rule grok fallback model high effort
PASS rule grok fallback model high tier
PASS rule grok fallback model high multi
PASS rule grok fallback model high family
PASS rule grok fallback model high args
PASS rule grok fallback model IsFallback
PASS rule grok mechanical routine high effort
PASS rule grok mechanical routine high tier
PASS rule grok mechanical routine high multi
PASS rule grok mechanical routine high family
PASS rule grok mechanical routine high args
PASS rule grok mechanical routine no effort effort
PASS rule grok mechanical routine no effort tier
PASS rule grok mechanical routine no effort multi
PASS rule grok mechanical routine no effort family
PASS rule grok mechanical routine no effort args
PASS rule grok mechanical ordinary high effort
PASS rule grok mechanical ordinary high tier
PASS rule grok mechanical ordinary high multi
PASS rule grok mechanical ordinary high family
PASS rule grok mechanical ordinary high args
PASS rule grok mechanical explicit standard high effort
PASS rule grok mechanical explicit standard high tier
PASS rule grok mechanical explicit standard high multi
PASS rule grok mechanical explicit standard high family
PASS rule grok mechanical explicit standard high args
PASS rule grok mechanical explicit big high effort
PASS rule grok mechanical explicit big high tier
PASS rule grok mechanical explicit big high multi
PASS rule grok mechanical explicit big high family
PASS rule grok mechanical explicit big high args
PASS rule grok mechanical hard high effort
PASS rule grok mechanical hard high tier
PASS rule grok mechanical hard high multi
PASS rule grok mechanical hard high family
PASS rule grok mechanical hard high args
PASS rule grok big WG.00.17 high effort
PASS rule grok big WG.00.17 high tier
PASS rule grok big WG.00.17 high multi
PASS rule grok big WG.00.17 high family
PASS rule grok big WG.00.17 high args
PASS rule grok big SIM.60.05 high effort
PASS rule grok big SIM.60.05 high tier
PASS rule grok big SIM.60.05 high multi
PASS rule grok big SIM.60.05 high family
PASS rule grok big SIM.60.05 high args
PASS rule grok big SIM.60.06 high effort
PASS rule grok big SIM.60.06 high tier
PASS rule grok big SIM.60.06 high multi
PASS rule grok big SIM.60.06 high family
PASS rule grok big SIM.60.06 high args
PASS rule grok big SIM.40.00 high effort
PASS rule grok big SIM.40.00 high tier
PASS rule grok big SIM.40.00 high multi
PASS rule grok big SIM.40.00 high family
PASS rule grok big SIM.40.00 high args
PASS rule grok big SIM.40.11 high effort
PASS rule grok big SIM.40.11 high tier
PASS rule grok big SIM.40.11 high multi
PASS rule grok big SIM.40.11 high family
PASS rule grok big SIM.40.11 high args
PASS rule grok big SIM.00.01 high effort
PASS rule grok big SIM.00.01 high tier
PASS rule grok big SIM.00.01 high multi
PASS rule grok big SIM.00.01 high family
PASS rule grok big SIM.00.01 high args
PASS rule grok big id explicit standard high effort
PASS rule grok big id explicit standard high tier
PASS rule grok big id explicit standard high multi
PASS rule grok big id explicit standard high family
PASS rule grok big id explicit standard high args
PASS rule default root misses temp lane effort
PASS rule default root misses temp lane tier
PASS rule default root misses temp lane multi
PASS rule default root misses temp lane family
PASS rule default root misses temp lane args
PASS rule claude mechanical high effort
PASS rule claude mechanical high tier
PASS rule claude mechanical low effort
PASS rule claude mechanical max effort
PASS rule codex mechanical high effort
PASS rule gemini mechanical high effort
PASS rule fable mechanical high effort
PASS eq claude standard (empty)
PASS eq claude standard low
PASS eq claude standard medium
PASS eq claude standard high
PASS eq claude standard xhigh
PASS eq claude standard max
PASS eq claude standard top
PASS eq claude big (empty)
PASS eq claude big low
PASS eq claude big medium
PASS eq claude big high
PASS eq claude big xhigh
PASS eq claude big max
PASS eq claude big top
PASS eq claude nomodel
PASS eq fable standard (empty)
PASS eq fable standard low
PASS eq fable standard medium
PASS eq fable standard high
PASS eq fable standard xhigh
PASS eq fable standard max
PASS eq fable standard top
PASS eq fable big (empty)
PASS eq fable big low
PASS eq fable big medium
PASS eq fable big high
PASS eq fable big xhigh
PASS eq fable big max
PASS eq fable big top
PASS eq fable nomodel
PASS eq codex standard (empty)
PASS eq codex standard low
PASS eq codex standard medium
PASS eq codex standard high
PASS eq codex standard xhigh
PASS eq codex standard max
PASS eq codex standard top
PASS eq codex big (empty)
PASS eq codex big low
PASS eq codex big medium
PASS eq codex big high
PASS eq codex big xhigh
PASS eq codex big max
PASS eq codex big top
PASS eq codex nomodel
PASS eq gemini standard (empty)
PASS eq gemini standard low
PASS eq gemini standard medium
PASS eq gemini standard high
PASS eq gemini standard xhigh
PASS eq gemini standard max
PASS eq gemini standard top
PASS eq gemini big (empty)
PASS eq gemini big low
PASS eq gemini big medium
PASS eq gemini big high
PASS eq gemini big xhigh
PASS eq gemini big max
PASS eq gemini big top
PASS eq gemini nomodel
PASS eq grok standard (empty)
PASS eq grok standard low
PASS eq grok standard medium
PASS eq grok standard high
PASS eq grok standard xhigh
PASS eq grok standard max
PASS eq grok standard top
PASS eq grok big (empty)
PASS eq grok big low
PASS eq grok big medium
PASS eq grok big high
PASS eq grok big xhigh
PASS eq grok big max
PASS eq grok big top
PASS eq grok nomodel
PASS eq codex luna ultra
PASS eq codex reserve ultra
PASS eq codex sol ultra
PASS eq claude ultracode
PASS eq fable ultracode
PASS eq grok routine empty
PASS eq grok routine high no lane
PASS eq claude hard low
PASS eq claude ordinary max
PASS eq bad tasktype
PASS eq claude mech lane high
PASS eq claude mech lane max
PASS eq claude mech lane low
PASS eq codex mech lane high
PASS eq gemini mech lane high
PASS eq fable mech lane high
PASS eq grok mech medium
PASS eq grok mech low
PASS eq grok mech empty
PASS eq grok mech xhigh
PASS eq grok mech top
PASS eq grok plain high
PASS eq grok sim high
PASS eq grok notgrok high
PASS eq grok bad high
PASS eq grok nomodel empty lane
PASS cross mech high new effort
PASS cross mech high verbatim effort
PASS cross mech high model
PASS cross mech high tier
PASS cross mech high passed
PASS cross mech nomodel high new effort
PASS cross mech nomodel high verbatim effort
PASS cross mech nomodel high model
PASS cross mech nomodel high tier
PASS cross mech nomodel high passed
PASS cross space high new effort
PASS cross space high verbatim effort
PASS cross space high model
PASS cross space high tier
PASS cross space high passed
PASS cross routine high new effort
PASS cross routine high verbatim effort
PASS cross routine high model
PASS cross routine high tier
PASS cross routine high passed
PASS mutant ignore_writer killed
PASS mutant ignore_writer still honours grok writer
PASS mutant ignore_tier killed
PASS mutant ignore_tier still honours standard
PASS mutant ignore_effortclass killed
PASS mutant ignore_effortclass still raises medium
PASS mutant treat_malformed killed
PASS mutant treat_malformed missing lane killed
PASS mutant treat_malformed still honours real lane
PASS mutant allow_medium killed
PASS mutant allow_medium still raises low
PASS mutant allow_medium still honours high
EXIT 0
```

### `node tools/check_deus_syntax.js`

Process exit code: 0

```
Checked 60 DEUS plugin files. Errors: 0
```
