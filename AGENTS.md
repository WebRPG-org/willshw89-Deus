# Endrath — roles

Updated: 2026-10-09.

The PM is this Endrath desk. Fable writes code. This desk commits. Gemini is not a role.

| Role | Responsibility |
|---|---|
| Owner | Sets direction. |
| Endrath PM — this desk | Maintains the live board, makes Owner-authorized commits, and plays in the RPG Maker editor. A lane is open or superseded; WB-001 through WB-010 are superseded. |
| Fable | Writes code when coding is opened and hands the changes to this desk for commit. A writer may not save over `C:\Dev\DEUS\game\js\plugins.js` while that project is open. This is the whole editor rule. |
| Grok | Reviews Fable's authored commit. Grok does not write the implementation or make that commit. |
| Codex Astra | Runs the headless test and reports its result. Does not integrate. |
| Art Astra | Judges pixels in the isolated review project. Does not touch the live tree. |

## Art boundaries

- Art does not paint into `C:\Dev\DEUS`. A review project is a copy. A broken `Actors.json` in that copy gets fixed in that copy. It is not a repo defect.
- A colour is not a ground until the Owner names it. The pure step is a mark. No parent is locked. An agent does not pick the six.
