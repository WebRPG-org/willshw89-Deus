# lane-bn Brief: SOC.11.01 2014 SRD Class Integration

**NO ART OR AUDIO WORK.**

**Lane:** lane-bn | **Task:** SOC.11.01 | **Branch:** task/lane-bn | **Writer:** Fable (`claude-fable-5-1`, MAX) | **Reviewer:** Grok | **Base:** main `6c0e33c1a7b53f2d8d55a75565906bf1b2db43a7`

## Scope
Create canonical, data-only integration for the twelve 2014 SRD 5.1 classes: Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, and Wizard. Derive hit dice, primary abilities, saving throw proficiencies, armor and weapon proficiencies, spellcasting progression, and level 1 through 20 feature slots exclusively from tracked `game/data/srd51/**` sources and existing identity identifiers. Deliver JSON data, a strict JSON schema, documentation with source traceability, and deterministic validation with targeted failing fixtures for every substantive rule.

Do not invent mechanics, subclasses, balance values, optional rules, copyrighted non-SRD content, or runtime behavior. Preserve every race-class combination as legal. If the tracked SRD extraction lacks a fact required by the requested shape, represent it explicitly as unavailable with source evidence rather than guessing. Do not edit the race-affinity lane or scheduler.

## Allowed paths
- `game/data/society/srd_classes.json`
- `game/data/society/srd_classes.schema.json`
- `docs/systems/DEUS_SRD_Classes.md`
- `tools/society/test_srd_classes.js`
- `tasks/SOC.11.01/**`

## Gates
- `node tools/society/test_srd_classes.js`
- `node tools/check_deus_syntax.js`

## Standing rules
1. Never generate, edit, request, catalogue, move, or integrate art or audio.
2. Write only in allowedPaths. Record any missing source fact or out-of-scope need in this task folder.
3. Do not modify WBS/status, owner decisions, provider status, plugin registration, ops/governance files, another lane, or `game/data/srd51/**`.
4. Every validator rule needs a targeted negative fixture. Run all gates in the foreground and record exact evidence in REPORT.md.
5. Commit on this branch. Do not merge or push. Independent cross-family review follows PM fresh-clone gate verification.