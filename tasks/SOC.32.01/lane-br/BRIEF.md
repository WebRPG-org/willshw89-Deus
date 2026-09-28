# lane-br Brief: SOC.32.01 Quartermaster Physical Stockpile Allocation

**NO ART OR AUDIO WORK.**

**Lane:** lane-br | **Task:** SOC.32.01 | **Branch:** task/lane-br | **Writer:** Codex GPT-5.6 Sol HIGH | **Reviewer:** Grok | **Base:** main `368632d629bb65a773ee8c204578d7bf1ab74c61`

## Scope
Implement a deterministic, data-oriented Quartermaster allocation planner for distinct physical stocks of tools, food, raw goods, and arms. Given explicit physical stock lots, caller-supplied allocation demands, priorities, eligibility constraints, and destination capacities, produce auditable reservations, partial fills, refusals, and remaining-stock records while conserving every integer item quantity. Preserve INV-SOC-06: treasury/accounting wealth cannot satisfy physical demand.

Do not invent item types, stock quantities, ration levels, priority policy, military entitlement, spoilage, transport, container capacity, ownership, prices, exchange values, or allocation thresholds absent from tracked authority. Accept policy and inventory facts as validated caller inputs or record authority gaps. Do not edit or integrate the active mint, treasury, militia, Resources, Items, Containers, Jobs, scheduler, tax, payroll, save wiring, or plugin registration systems.

## Allowed paths
- `game/data/society/quartermaster.schema.json`
- `game/js/sim/society/DEUS_Quartermaster.js`
- `docs/systems/DEUS_Quartermaster.md`
- `tools/society/test_quartermaster.js`
- `tasks/SOC.32.01/**`

## Gates
- `node tools/society/test_quartermaster.js`
- `node tools/check_deus_syntax.js`

## Standing rules
1. Never generate, edit, request, catalogue, move, or integrate art or audio.
2. Write only in allowedPaths. Record absent authority and later integration needs in this task folder instead of guessing.
3. Keep outcomes deterministic, pure, auditable, copy-on-write, safe-integer exact, and free of clocks, randomness, filesystem, UI, or engine globals.
4. Conserve physical quantities exactly across available, reserved, allocated, refused, and remaining states. Financial accounts, prices, and abstract balances must never satisfy a stock request.
5. Every substantive validator and conservation rule needs a targeted negative fixture. Include provocations for over-allocation, duplicate lot or request IDs, fractional/unsafe quantities, nondeterministic ties, wrong item substitution, capacity overflow, treasury-as-stock, hidden mutation, and quantity loss/creation.
6. Run both gates in the foreground, record exact evidence in REPORT.md, commit on this branch, and do not merge or push. Independent cross-family review follows PM fresh-clone verification.
