# Escalation: WG.00.39 plugin registration

`game/js/plugins.js` is outside this lane's allowedPaths. This lane did not edit it. The registered plugin `DEUS_Combat` already drives tamed-creature encounters, follow, numeric attack orders, natural multiattack, and world-position sync. `DEUS_Taming` and `DEUS_CombatRT` still have no entries, so `UF.Taming` and the `DEUS_CombatRT` map hook are not installed by the plugin list.

Insert the two objects below immediately after the existing `DEUS_Combat` object and before the existing `DEUS_Anim` object. Do not change any other entry. Both plugins already exist on disk.

```json
{
    "name": "DEUS_Taming",
    "status": true,
    "description": "[DEUS Taming] Capture and domestication of creatures into pets, mounts, livestock, and work animals.",
    "parameters": {}
},
{
    "name": "DEUS_CombatRT",
    "status": true,
    "description": "[DEUS CombatRT] On-map real-time combat. Resolution stays in UF.Rules.",
    "parameters": {}
}
```

`DEUS_Taming.js` declares `@orderAfter` `DEUS_Wildlife`, `DEUS_Combat`, `DEUS_Ecology`, and `DEUS_Jobs`. Those four are already earlier in `plugins.js` than `DEUS_Anim`, so this insertion point satisfies that order. `DEUS_CombatRT.js` declares `@orderAfter` `DEUS_Combat` and `DEUS_Move8` (`DEUS_Movement8D` in this file). Placing it directly after `DEUS_Taming` keeps it after `DEUS_Combat`.

No other file outside allowedPaths needs an edit for this lane.