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

## Operating rules

A new file is set-kind-YYYYMMDD-id. A prompt-length name is a reject. Art lands in C:\Dev_archive\art\inbox\YYYY-MM-DD\ or it is not saved. A file enters C:\Dev\DEUS only if the game loads it.

A test, a reference, or a miss goes to C:\Dev_archive\art\junk\. It is kept so it is not regenerated. It does not enter the live tree.

One owner per system. plugins.js is the only load list. A second copy of a plugin, or a second list that loads a file plugins.js does not name, is a defect.

The Owner names the parents. A child is the nearest locked swatch of a mix of two parents. A new swatch is a defect. Alpha is 0 or 255. Dither is two existing colours, not a third hex.

Eight z-layers. Each step is darker. No #000000. A hold is a repeated stop, not a new colour.

One surface depth is one foot. A z layer is ten feet. DEPTH_MAX is 10. The overflow divisor is 31200. A full cell climbs one z. Lava stays centipounds. This is not in code yet.

One lane, then stop. The desk commits. If origin/main..HEAD is more than the authorized commit, do not push. Paste the list. A writer does not save over game/js/plugins.js while that project is open.

PixelLab output is generation, not paint. A downloaded stamp is catalogued before it is coloured. A mistooled stamp goes to junk and is kept. It is not a ground until the Owner names the parent.

A stamp is sorted by what it is, not by biome. The folders are tree, stump, timber, flora, grass, rock, ore, wall, door, furniture, workshop, container, item, person, creature, remains, water. Water is a shore prop. Open water is a tile. A file that is none of these stays in object. One file, one folder. The filename stays.

A clump cut or a resize is not a keep. It stays out of sorted until the Owner names it. An unnamed derivative goes to junk and is kept.

A sort is not an approval. PixelLab output lives under C:\Dev_archive\art\stamps\. A new save lands in C:\Dev_archive\art\inbox\YYYY-MM-DD\. A file enters C:\Dev\DEUS\game\img\ only if the game loads it.

There is no icon set. Facesets wait. An icon file is not a stamp and is not sorted into the live tree.

Eight layers, counted 1–8 from the bottom. A layer is not above or below until the build finishes. Water is placed on the lowest open cells. Rock is raised around it. Sea level is the height that leaves. Art stays z0–z7. z0 is the open surface of a column. Each closed step down takes the next shade. Layer 1 is not z0.
