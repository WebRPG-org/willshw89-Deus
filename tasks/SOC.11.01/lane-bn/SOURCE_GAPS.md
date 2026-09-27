# SOC.11.01 lane-bn: source gaps and out-of-scope needs

Recorded 2026-09-27 by the writer (Fable, lane-bn). Nothing here was guessed into the data.

## G1. Primary ability is not in the tracked SRD 5.1 extraction

The brief asks for primary abilities. No tracked file in `game/data/srd51/` states one. A case-insensitive search of all six content files (`character_options`, `rules`, `spells`, `equipment`, `creatures`, `magic_items`) for `primary abilit` returns 0 matches. The validator repeats this search on every run (`PRIMARY_ABILITY_UNAVAILABLE`).

The only SRD table that pairs classes with ability scores is **Multiclassing Prerequisites** (`srd:rule:beyond-1st-level-multiclassing`, pages 56–58). It belongs to the optional multiclassing rule, and a prerequisite is not a primary ability. It was not substituted.

In the data: every class has `primaryAbility: { status: "UNAVAILABLE", reason, search }`, and `unavailableFacts` lists the field for all twelve classes.

Needs an Owner or PM ruling if a primary ability is wanted: (a) leave it unavailable; (b) take it from a named source that the Owner approves; or (c) define it as a DEUS rule outside the SRD layer.

## G2. One class-table label differs from its feature heading

The Wizard table prints `Signature Spell` at level 20. The feature heading is `Signature Spells`. The data keeps the table label and references the heading (`sourceDiscrepancies`). The source is not corrected (srd51 is read-only for this lane).

## G3. Eleven of twelve class records are `parsed`, not `verified`

The catalogue readiness is Bard `verified`, all others `parsed`. Under the Owner's readiness policy (2026-09-22), a record must be compared with the rendered page before it becomes authoritative gameplay input. Verification writes `tools/srd_extract/verification/verified.json`, which is outside this lane's allowed paths. The data records each class's readiness in `source.readiness`.

Out-of-scope need: a verification pass over the eleven `parsed` class entries (pages 8–55) before any runtime consumer treats this file as authoritative.

## G4. Deliberately not integrated

The following SRD material is left out of scope. It is not missing from the SRD:

- Multiclassing: prerequisites, proficiencies gained, and the multiclass spell-slot table. This is an optional rule.
- Starting equipment.
- Feature and subclass text. It is referenced by `features[].sourceIndex` and by SRD subclass ids.
- Spell list contents. They are referenced by `spellcasting.spellList`.
- Wizard spellbook sizes and spells learned per level. They appear in the Spellcasting text and are not structured here.

## G5. No runtime consumer

The file is data only. No plugin loads it. `game/data/srd5_1/classes_reference.json` is frozen legacy and was not read or changed. Consumers that could adopt this file later: class progression on the identity axis (PROPOSED-BA-01 in `tasks/SOC.10.01/lane-ba/REPORT.md`) and SOC.11.02 (race-class affinity, which keys on these class ids). Neither was touched.
