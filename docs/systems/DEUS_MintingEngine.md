# DEUS Minting Engine

## Purpose

`game/js/plugins/DEUS_Mint.js` is the deterministic SOC.30.01 transformation core for INV-SOC-05 and the SOC.30.01 portion of INV-SOC-06. It converts registered physical assayed monetary-metal lots in `stores.monetaryMetalLots` into compact physical coin stacks in `treasury.coinStacks`, and remelts those stacks back into registered metal lots. It has no clock, random source, per-frame update, abstract faction inventory, or fallback from treasury wealth to physical stores.

The engine compiles its rules from read-only authority supplied by its caller:

- `game/data/DEUS_ResourceRegistry.json` → denominations, `valueInCp`, registered coin metal, one metal unit per coin, conserved resource classes, and electrum's equal GOLD/SILVER composition.
- `game/data/srd51/rules.json` → five denominations and 50 standard coins per pound.
- `game/data/UF_WorldCatalog.json` → the tracked `gold_coin.weight` of `0.02` pound, checked against 50 coins per pound.
- `docs/systems/DEUS_RESOURCE_ECONOMY_STANDARD.md` §8 → physical coin stacks, provenance, and 100% remelting.
- `docs/INVARIANT_REGISTRY.md` → INV-SOC-05 and INV-SOC-06.

The registered `0.5 GOLD + 0.5 SILVER` electrum composition requires a half-metal-unit integer scale. The compiled scale is therefore two mass quanta per coin and 100 mass quanta per pound. Pure coins contain two quanta of their registered metal; an `ep` contains one GOLD quantum and one SILVER quantum. No floating-point mass participates in a transaction.

## Public API

The module is exposed as `UF.Mint` in RMMZ and as `module.exports` in Node.

### `UF.Mint.createEngine(authority)`

Compiles and validates a closed engine instance. `authority` is:

```js
{
  resourceRegistry: /* parsed game/data/DEUS_ResourceRegistry.json */,
  itemTypes: /* parsed UF_WorldCatalog.items.types */,
  coinsPerPound: 50 // read from the tracked SRD rule
}
```

Missing denominations, unconserved monetary metals, a composition that does not total one registered metal unit, or disagreement between `gold_coin.weight` and `coinsPerPound` throws a coded authority error. The engine does not silently choose between contradictory sources.

### `engine.createState(input = {})`

Returns a validated deep copy with `schemaVersion: 1` and these owned compartments:

```js
{
  schemaVersion: 1,
  stores: {
    monetaryMetalLots: [
      { id: "stable-lot-id", material: "GOLD", massQuanta: 20 }
    ]
  },
  treasury: {
    coinStacks: [
      {
        denomination: "gp",
        metal: "GOLD",
        mintFaction: "faction-id",
        mintEra: 1,
        quantity: 4
      }
    ]
  }
}
```

Sibling fields are preserved but never used as substitutes. In particular, `treasury.balanceCp`, `stores.goods`, and `stores.coinStacks` cannot fund a mint or remelt transaction.

### `engine.mint(state, request)`

Returns `{ ok: true, state, result }` on success or `{ ok: false, code, message }` on refusal. The input state is never mutated.

```js
engine.mint(state, {
  denomination: "ep",
  quantity: 3,
  mintFaction: "faction-id",
  mintEra: 1,
  assay: {
    lotId: "stable-lot-id",
    material: "ELECTRUM",
    massQuanta: 8,
    components: { GOLD: 4, SILVER: 4 }
  }
});
```

The assay is an explicit input, not a process invented by this module. It must name a physical stored lot, cannot exceed that lot, and must exactly match the registry composition. The requested whole-coin mass is removed from the lot. Any unconsumed assayed mass is reported as `result.assayRemainderQuanta` and remains in the same lot; it is never rounded away. Matching denomination/metal/faction/era stacks merge deterministically into the first matching stack.

The batch bound is only the largest count whose `quantity × quantaPerCoin` remains a JavaScript safe integer. It is an arithmetic safety bound, not a gameplay mint limit.

### `engine.remelt(state, request)`

Returns the same success/refusal envelope and does not mutate the input.

```js
engine.remelt(state, {
  stackIndex: 0,
  quantity: 2,
  outputLotId: "stable-output-lot-id"
});
```

Only a physical `treasury.coinStacks[stackIndex]` is accepted. Remelting removes exactly the requested whole coins and returns exactly `quantity × quantaPerCoin` of the stack's registered material to `stores.monetaryMetalLots`. A partial remelt leaves the remaining coins in place. A full remelt removes the empty stack. An existing output lot is used only when its material matches; otherwise the request is refused. There is no fee, loss, yield, or seigniorage calculation.

### `engine.measure(state)`

Returns separate physical measurements for `stores`, `treasury`, and their `total`:

```js
{
  stores: { massQuanta, components },
  treasury: { massQuanta, components, valueInCp },
  total: { massQuanta, components }
}
```

`treasury.valueInCp` is derived only from physical coin stacks and the registry's denomination values. It is not a stores balance and cannot satisfy any material or food requirement.

### `engine.describe()`

Returns a copy of the compiled denomination recipes and integer mass scale, including `quantaPerCoin`, `coinsPerPound`, `quantaPerPound`, and the arithmetic `maxBatchCoins`.

### Refusal codes

| Code | Meaning |
|---|---|
| `E_AUTHORITY`, `E_AUTHORITY_CONFLICT` | Required read-only sources are missing, non-conserved, incomplete, or contradictory. |
| `E_STATE` | The physical state, lot, stack, schema, or integer composition is invalid. |
| `E_REQUEST`, `E_DENOMINATION` | The operation or denomination is unknown. |
| `E_BATCH_BOUNDS`, `E_BOUNDS` | A count or derived mass/value leaves safe-integer bounds. |
| `E_PROVENANCE` | Required registry provenance fields are absent or malformed. |
| `E_ASSAY_REQUIRED`, `E_ASSAY`, `E_ASSAY_COMPOSITION` | The explicit assay is absent, does not identify the lot, or contradicts the registered material composition. |
| `E_STORES`, `E_INSUFFICIENT_STORES`, `E_INSUFFICIENT_ASSAY` | No physical stores lot exists or it/the assayed batch cannot supply the request. |
| `E_MATERIAL` | The stored monetary material cannot produce the requested denomination. |
| `E_TREASURY`, `E_INSUFFICIENT_COINS` | No physical treasury stack exists or it cannot supply the remelt request. |
| `E_OUTPUT_LOT` | Remelt output identity is absent or names a lot of another material. |
| `E_CONSERVATION` | The engine's pre/post component-mass assertion detected drift. |

Refusal occurs without changing the caller's state. No request falls back to abstract balances or unrelated physical goods.

## Events

None. This bounded core is synchronous and side-effect free with respect to its inputs. A future inventory/treasury adapter may emit domain events after it atomically installs a successful returned state; this lane does not invent those events.

## Save data

The serializable engine state shape is `schemaVersion: 1` with stable lot IDs, `stores.monetaryMetalLots`, and `treasury.coinStacks` as shown above. This lane does not register a save provider or write to the global RMMZ save object because `game/js/plugins.js`, inventory providers, treasury providers, and SOC.60 save ownership are outside its allowed paths. Callers save truth and recreate the compiled engine from the registries on load.

## Checks

`node tools/society/test_minting_engine.js` checks:

- the tracked SRD rule, item weight, registry denominations/values, and derived integer scale;
- exact mint/remelt round trips for `cp`, `sp`, `ep`, `gp`, and `pp`;
- deterministic output, input immutability, provenance merging, partial remelt, and explicit remainders;
- equal integer GOLD/SILVER electrum components;
- targeted negative fixtures for every public refusal rule, including insufficient stores/assay/coins, invalid composition, arithmetic bounds, and treasury-versus-stores separation;
- compile-time refusal of missing or contradictory authority;
- source mutants that remove stores debit, composition checks, material checks, bounds, or remelt mass, proving the checks can fail.

The repository syntax gate is `node tools/check_deus_syntax.js`.

## Status

The source-grounded transformation core and headless gate exist under SOC.30.01. The plugin is intentionally not added to `game/js/plugins.js`, because that provider file is outside this lane's `allowedPaths`. Therefore native RMMZ F5/F8, global save wiring, `UF.Items` conversion, and a live mint workshop are not claimed by this task. The item registry currently has only `gold_coin`; the engine consequently produces the economy standard's compact provenance stacks rather than inventing the four missing item definitions. Genuine source gaps and the unit conflict are recorded in `tasks/SOC.30.01/lane-bo/AUTHORITY_GAPS.md`.
