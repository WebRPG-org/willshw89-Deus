# Art council record

Every art-council round, with each judge's vote and the reason for every no (DEC-062, Owner 2026-10-01: "1 nay = no. They must all unimously vote yes", "I do want a record of why things were no'd", "A vote no MUST include a reason why").

- **Judges:** the four braintrust chats: ChatGPT Pro, Grok Heavy, Gemini Pro, MiniMax M3.
- **Rule:** a piece passes only on four YEAs. One NAY or REDO rejects it. A no without a reason is incomplete, and the PM asks that judge again.
- **The question (Owner amendment, 2026-10-01):** is the piece roughly the same quality as Ultima VII art, and consistent with it? YES, or NO with the reason. The PM confirms beforehand that the piece can be tooled (RMMZ format, seams, anchors, palette, size).
- **ART-COUNCIL-1 was judged against the earlier, stricter bar** (strict Ultima VII / EverQuest / English folklore, uniquely DEUS). Its rejections stand as records; the pieces are re-judged on the new question in ART-COUNCIL-2.
- **Full verdict texts:** `~/.deus_pm/braintrust/<date>/ART-COUNCIL-<n>_<judge>.md`, local and outside the repo.

## ART-COUNCIL-1 (2026-10-01): temperate cliffs (RMMZ A4, ten sets) and trees with stumps

The boards were made with PixelLab Bitforge (Ultima VII style images) and Pixflux. Gemini Pro and MiniMax M3 were still judging when this record was opened. Every piece below already has at least one no, so **nothing in this round passes**.

### Cliffs

| Set | ChatGPT | Grok | Outcome | Reasons for each no |
|---|---|---|---|---|
| 1 Granite | REDO | YEA | rejected | ChatGPT: the face leans toward a built stone wall: outlined blocks in vertical stacks, joints like masonry courses, and a top much finer than the face. |
| 2 Soil | REDO | REDO | rejected | ChatGPT: the face reads as brown boulders, not an earth bank. Grok: the cap is near-featureless brown that tiles as carpet, and the isolated cell reads as a potato. |
| 3 Sand over sandstone | REDO | REDO | rejected | ChatGPT: hard, crystalline, blocky face under a very quiet top. Grok: the cap is a blank tabletop, the small cells look like bread rolls, and the banding is too parallel. |
| 4 Mud | REDO | REDO | rejected | Both: a dark crater or puddle in the cap stamps a hole on every plateau, and the face reads dry and rocky rather than wet. |
| 5 Cave limestone | REDO | REDO | rejected | Both: the cave mouth is baked into a repeating face, and the cap is a flat slab. ChatGPT: white flecks read as glitter or snow. |
| 6 Lichen rock | REDO | YEA | rejected | ChatGPT: the lichen isn't visible, the closed outlines read as fitted slabs, and it overlaps granite. |
| 7 Rooted soil | YEA | REDO | rejected | Grok: the roots don't read at game scale, the cap is textureless, and it looks like a recolour of set 2. |
| 8 Banded sandstone | YEA | REDO | rejected | Grok: at 48 px it reads as masonry or layered cake, the stripes are too even and saturated, and the inner corner reads as raw meat. |
| 9 Red clay | REDO | REDO | rejected | Both: a flat red slab with dark vertical grooves that reads as bark or a palisade, and a trunk-like groove that repeats. |
| 10 Layered strata | REDO | REDO | rejected | Both: the top reads as stacked ledges or tidal pools rather than a walkable surface, and the beds read as a road cut or masonry. |

**Technical must-fix (ChatGPT; Grok disagrees):** the A4 inner-corner cell must supply four concave 24 px quarter-corners. One L-shape leaves some concave arrangements broken.

### Trees and stumps

| Piece | ChatGPT | Grok | Outcome | Reasons for each no |
|---|---|---|---|---|
| Oak tree | YEA | YEA | awaiting Gemini, MiniMax | — |
| Swamp tree | YEA | YEA | awaiting Gemini, MiniMax | — |
| Dead tree | YEA | YEA | awaiting Gemini, MiniMax | — |
| Pine tree | REDO | YEA | rejected | ChatGPT: flat foliage plates and black internal outlines read as a diagram rather than a living tree. |
| Birch tree | REDO | REDO | rejected | Both: a sparse lollipop canopy with harsh lime greens and flat cut-out leaves. |
| Apple tree | REDO | REDO | rejected | Both: a toy-round crown with lime highlights and apples stuck on the surface, in a farm-game register. |
| All twelve stumps (two per tree) | REDO | YEA for oak L, oak R and dead L; REDO or NAY for the rest | rejected | Both: generic cylinders with horizontal roots instead of THAT tree's own lower trunk and root flare. Grok voted NAY on both birch stumps: "not a stump", a tiny nub at one third of the trunk's girth. |

**Next:** the stumps are rebuilt from each tree's own trunk and root pixels; the birch, pine and apple trees are redone from these notes; and future rounds attach a real Ultima VII reference board.
