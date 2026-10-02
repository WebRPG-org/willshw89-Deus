# NAT.05.01 — Lean Climate Kernel Preflight Specification

- **Task ID**: `NAT.05.01`
- **Milestone**: Milestone 1 (Physical Substrate & Spatial Laws)
- **Status**: ARCHITECTURAL PREFLIGHT (Runtime implementation strictly deferred per Owner ruling)
- **Authority**: DEC-037 (Natural World Only), Owner Operating Brief 2026-09-28
- **Upstream Dependencies**: `WG.00.41` (32-Z Spatial Substrate), `NAT.02.01` (Matter), `NAT.03.01` (Authoritative Water State)

---

## 1. WHY THE PLAYER CARES

> Mountain peaks freeze and gather snow while low valleys remain lush and temperate. Crossing a mountain ridge reveals a dramatic shift from wet windward pine forests to arid leeward scrublands (rain shadow). Cold snaps freeze standing water, and crop growth halts in winter without arbitrary script events.

---

## 2. GAME TRANSLATION

```text
GAME TRANSLATION

Player / World Effect:
Temperature and humidity vary continuously across the world and across elevations. As the player climbs from Lowlands (-4..+1) to Highlands (+7..+11), ambient temperature drops predictably by -0.35°F per Z-level (~5.6°F colder at +15). Prevailing winds force moist air over mountain ranges, creating wet windward slopes and dry leeward valleys. Standing surface water freezes into ice during winter freezes.

Trigger:
Time advancement (hour/day tick in $ufTime) and spatial movement across elevations or biomes.

Runtime Authority:
game/js/sim/climate/kernel.js (Atmospheric State Authority) + DEUS_WorldGen.js (Macro fields).

Simulation Path:
evalInsolation(latitude, dayOfYear, hour) -> applyElevationLapse(baseTemp, z) -> evalOrographicMoisture(gx, gy, windVec) -> updateCellClimate().

Engine Bridge:
DEUS_Environment.js reads cell temperature/humidity to drive precipitation (snow vs rain), fog overlays, and frost autotile swaps via $gameScreen.

Visible Result:
Snow blankets highlands while rain falls in valleys. Standing pools freeze into walkable ice when temperature drops below 32°F. Trees and vegetation change types across mountain passes according to real rainfall and thermal gradients.

Persistence:
Macro climate seed and seasonal sinusoidal phase serialize into st.climate; localized temperature anomalies serialize into st.climate.anomalies. Reconstructed deterministically.

Failure Without This Lane:
Elevation has zero thermal consequence (a mountain peak at Z=+11 is as warm as sea level); weather is completely randomized without geographical logic; rain falls equally on desert valleys and rainforests; snow is a purely cosmetic skin rather than physical freezing.

Automated Proof:
tools/test_climate_kernel.js: Verifies -0.35°F/Z lapse rate across all 32 levels, confirms orographic moisture accumulation on windward mountain slopes, confirms rain shadow deficit on leeward slopes, and verifies zero drift across 365 daily cycles.

In-Game Proof:
Climb a mountain from Z=0 (valley floor, 65°F, rain) to Z=+10 (mountain summit, 28°F, snow); observe rain smoothly transition to falling snow as the 32°F boundary is crossed; observe water puddles freezing into ice at the summit; walk down the opposite leeward slope and observe dry rain shadow conditions.
```

---

## 3. Game Bridge Status

```text
Simulation implemented: NO (Design Preflight Only; runtime implementation deferred)
Engine bridge implemented: NO (Pending simulation implementation)
Presentation implemented: YES (DEUS_Environment / $gameScreen weather effects exist)
Input/player interaction implemented: NO (Weather is environmental)
Save/load implemented: NO (Schema defined below)
Playable verification performed: NO
```

---

## 4. Architectural Invariants & Formulae

### 4.1 Thermal Elevation Lapse Rate
Temperature at global elevation $Z$ is derived from sea-level temperature $T_0$ via standard environmental lapse:
$$T(z) = T_0 - \lambda \cdot z$$
Where:
- $\lambda = 0.35^\circ\text{F} \text{ per Z-level}$ ($1\text{ Z-level} = 10\text{ ft} \implies 3.5^\circ\text{F} / 100\text{ ft}$).
- At $Z = +10$ (Highlands), temperature is $-3.5^\circ\text{F}$ lower than base.
- At $Z = -10$ (Deep Caverns), geothermal gradient warms the rock: $T(z) = T_0 + \gamma \cdot |z|$ where $\gamma = 0.15^\circ\text{F} \text{/ level}$.

### 4.2 Orographic Moisture & Rain Shadow
Given prevailing wind vector $\vec{W} = (u, v)$ and terrain elevation field $h(x, y)$:
- Uplift velocity $w = \vec{W} \cdot \nabla h$.
- When $w > 0$ (air forced upwards): relative humidity rises, adiabatic cooling triggers condensation $\implies$ precipitation rate increases.
- When $w < 0$ (air descending leeward): adiabatic warming $\implies$ relative humidity drops, precipitable moisture is depleted (Rain Shadow).

