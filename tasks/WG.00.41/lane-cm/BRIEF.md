# BRIEF: Lane CM — Subterranean Deep Cuts & DEC-030 Mountain Cap Ceiling (+11)

- **Task ID**: WG.00.41
- **Lane**: lane-cm
- **Branch**: `task/lane-cm`
- **Writer**: gemini
- **Reviewer**: grok
- **Allowed Paths**:
  - `game/js/plugins/DEUS_Levels.js`
  - `tasks/WG.00.41/lane-cm/**`

## Objective
1. Implement `materializeDeepCuts`: when the world extends below the core (`r.zMin < CORE.zMin`, e.g. -16..+15), abyssal vertical cuts plunge sheerly down through subterranean levels Z = -3..r.zMin. Bedrock floor S0 at r.zMin is preserved with 4 ft headroom (S1..S4 as `M_AIR`). Fluid in core columns is preserved.
2. In `materializeCaps`: natural rock stops at level +11; levels +12..+15 remain open air per DEC-030. No top caps poke into or above +15.

## Game Translation
- **Player / World Effect**: Deep vertical chasms cut down into subterranean depths with bedrock floors at Z=-16. Mountainous terrain naturally peaks within the highlands up to Z=+11, leaving the upper atmospheric realm (Z=+12..+15) clear as open sky.
- **Trigger**: New world generation or area level volume loading when 32-layer world is active.
- **Runtime Authority**: `UF.Levels` in `game/js/plugins/DEUS_Levels.js`.
- **Simulation Path**: `materializeCaps` and `materializeDeepCuts` during volume materialization.
- **Engine Bridge**: RMMZ level volumes and layer renderers consume strata buffers.
- **Visible Result**: Deep chasms visible when descending into caverns/abyss; mountain summits top out at +11 with sky above.
- **Persistence**: Persisted through area volume generation and strata diffs.
- **Failure Without This Lane**: Mountain caps stretch into the sky realm (+15) violating DEC-030; deep abyssal cuts stop at -2 instead of penetrating to bedrock.
- **Automated Proof**: `node tools/check_deus_syntax.js`.
- **In-Game Proof**: In-engine multi-Z inspection across Z=-16..+15.

## Checklist
- [x] Natural rock stops at +11 (DEC-030).
- [x] Levels +12..+15 remain open air.
- [x] Deep cuts plunge sheerly through Z=-3..r.zMin preserving bedrock S0.
- [x] Syntax clean (0 errors).
