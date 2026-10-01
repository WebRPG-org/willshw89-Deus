# Art council record

Every art-council round, with each judge's vote and the reason for every no (DEC-062, Owner 2026-10-01: "1 nay = no. They must all unimously vote yes", "I do want a record of why things were no'd", "A vote no MUST include a reason why").

- **Judges:** the four braintrust chats: ChatGPT Pro, Grok Heavy, Gemini Pro, MiniMax M3.
- **Rule:** a piece passes only on four YEAs. One NAY or REDO rejects it. A no without a reason is incomplete, and the PM asks that judge again.
- **The question (Owner amendment, 2026-10-01):** is the piece roughly the same quality as Ultima VII art, and consistent with it? YES, or NO with the reason. The PM confirms beforehand that the piece can be tooled (RMMZ format, seams, anchors, palette, size).
- **ART-COUNCIL-1 was judged against the earlier, stricter bar** (strict Ultima VII / EverQuest / English folklore, uniquely DEUS). Its rejections stand as records; the pieces are re-judged on the new question in ART-COUNCIL-2.
- **Full verdict texts:** `~/.deus_pm/braintrust/<date>/ART-COUNCIL-<n>_<judge>.md`, local and outside the repo.

## ART-COUNCIL-1 (2026-10-01): temperate cliffs (RMMZ A4, ten sets) and trees with stumps

The boards were made with PixelLab Bitforge (Ultima VII style images) and Pixflux. Gemini Pro and MiniMax M3 verdicts had not been collected when ART-COUNCIL-2 went out. The oak, swamp and dead trees (two YEAs each) have not passed and are re-judged in ART-COUNCIL-2. Every other piece below already has at least one no, so **nothing in this round passes**.

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
| Oak tree | YEA | YEA | not passed (2 of 4); re-judged in ART-COUNCIL-2 | — |
| Swamp tree | YEA | YEA | not passed (2 of 4); re-judged in ART-COUNCIL-2 | — |
| Dead tree | YEA | YEA | not passed (2 of 4); re-judged in ART-COUNCIL-2 | — |
| Pine tree | REDO | YEA | rejected | ChatGPT: flat foliage plates and black internal outlines read as a diagram rather than a living tree. |
| Birch tree | REDO | REDO | rejected | Both: a sparse lollipop canopy with harsh lime greens and flat cut-out leaves. |
| Apple tree | REDO | REDO | rejected | Both: a toy-round crown with lime highlights and apples stuck on the surface, in a farm-game register. |
| All twelve stumps (two per tree) | REDO | YEA for oak L, oak R and dead L; REDO or NAY for the rest | rejected | Both: generic cylinders with horizontal roots instead of THAT tree's own lower trunk and root flare. Grok voted NAY on both birch stumps: "not a stump", a tiny nub at one third of the trunk's girth. |

**Next:** the stumps are rebuilt from each tree's own trunk and root pixels; the birch, pine and apple trees are redone from these notes; and future rounds attach a real Ultima VII reference board.

## ART-COUNCIL-2 (2026-10-01): the same pieces on the simplified question, current versions

Versions judged: trees after the U7 canopy pass (birch, swamp, pine and apple recoloured to their U7 tree's canopy palette, apple B reflipped); stumps after the Pixflux pass (init 700, each cut from its own tree); cliffs v3 (sets 3, 8 and 9 rebuilt on set 1's structure with their own ramps; every flat fill mottled with each set's own tones; cliff 8 with a wider five-step ramp). Earlier rounds on older versions (ChatGPT round 1 and deltas, Grok deltas, MiniMax round 1) are in the verdict files; this table shows each judge's vote on the versions above.

| Piece | ChatGPT | Grok | MiniMax | Gemini | Outcome | Reasons for each no |
|---|---|---|---|---|---|---|
| Oak stump | YEA | YEA | YEA | YEA | **passed (4 of 4)** | — |
| Swamp stump | YEA | YEA | YEA | YEA | **passed (4 of 4)** | — |
| Dead stump | YEA | YEA | YEA | YEA | **passed (4 of 4)** | — |
| Birch stump | YEA | YEA | YEA | YEA | **passed (4 of 4)** | — |
| Apple stump | YEA | YEA | YEA | YEA | **passed (4 of 4)** | — |
| Pine stump | YEA | YEA | YEA | YEA | **passed (4 of 4)** | — |
| Oak tree | YEA | YEA | YEA | NAY | rejected | Gemini: foliage relies on uniform noisy texture rather than distinct, high-contrast leaf clusters and deep shadows. |
| Swamp tree | YEA | YEA | YEA | NAY | rejected | Gemini: spherical pillow shading; lacks chunky, separated foliage volumes. |
| Dead tree | YEA | YEA | YEA | NAY | rejected | Gemini: branches too thin and uniformly shaded, missing the thick, gnarled, high-contrast look of U7 dead wood. |
| Birch tree | YEA | YEA | YEA | NAY | rejected | Gemini: canopy shading flat and noisy, lacking directional lighting. |
| Apple tree A | YEA | YEA | YEA | NAY | rejected | Gemini: extreme pillow shading reads as a flat sphere. |
| Apple tree B | YEA | YEA | YEA | NAY | rejected | Gemini: still too spherical and homogeneously textured. |
| Pine tree | YEA | YEA | YEA | NAY | rejected | Gemini: too symmetrical and smoothly shaded; U7 conifers have irregular, highly contrasted needle tiers. |
| Cliff 1 granite | YEA | YEA | YEA | NAY | rejected | Gemini: top dominated by uniform pixel noise, lacking bold, chunky highlights and deep shadows. |
| Cliff 2 soil | YEA | YEA | YEA | NAY | rejected | Gemini: uniformly noisy texture, no distinct hand-pixelled volumes. |
| Cliff 3 sand over sandstone | YEA | YEA | YEA | NAY | rejected | Gemini: the top fill reads as a flat, noisy pattern without strong directional lighting. |
| Cliff 4 mud | YEA | YEA | YEA | NAY | rejected | Gemini: muddy shadows, lacking crisp, high-contrast dithering. |
| Cliff 5 cave limestone | YEA | YEA | YEA | NAY | rejected | Gemini: better face shapes, but lacks the deep, punchy shadows of U7. |
| Cliff 6 lichen rock | YEA | YEA | YEA | NAY | rejected | Gemini: relies on random pixel noise rather than defined clusters of light and dark. |
| Cliff 7 rooted soil | YEA | YEA | YEA | NAY | rejected | Gemini: detail density too homogeneous; needs chunkier focal points. |
| Cliff 8 banded sandstone | YEA | YEA | YEA | NAY | rejected | Gemini: banding too uniform; lacks the rugged, irregular volume of U7 rocks. |
| Cliff 9 red clay | YEA | YEA | YEA | NAY | rejected | Gemini: flat shading on the top surfaces with uniform texturing. |
| Cliff 10 layered strata | YEA | YEA | YEA | NAY | rejected | Gemini: lighting too flat; lacks U7's harsh directional highlights. |

**Conflict between judges, for the next pass:** MiniMax's round-1 NOs on the cliffs ("flat fills read as modern pixel art") led to the mottling that Gemini now rejects as "uniform pixel noise". Gemini asks for bold chunky clusters with high-contrast directional light (bright highlights, near-black shadows). The PM is calibrating with Gemini on one cliff and one tree before reworking all seventeen pieces.

**After the council:** the six stumps passed. They do not enter the game yet: their catalogue rows (the trees' DEPLETED rows) come with lane-pg, and they wait on the Owner's D2 ruling (may script-cut pixels ship after a Pixflux pass?). The PM's YEA goes in `art/APPROVALS.md` when both are settled.
