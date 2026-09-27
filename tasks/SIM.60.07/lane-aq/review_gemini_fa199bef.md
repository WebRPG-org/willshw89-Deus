# Independent Review: SIM.60.07 (lane-aq)

- **Reviewer:** Gemini (gemini-3.8-flash thinking HIGH, non-author review per DEC-034)
- **Reviewed writer tip (FINAL SHA):** `fa199bef360629c73d6d223fa5496b62513073fc`
- **Branch:** `task/lane-aq`
- **Writer:** grok

## Git Verification
```
$ git rev-parse HEAD origin/task/lane-aq
fa199bef360629c73d6d223fa5496b62513073fc
fa199bef360629c73d6d223fa5496b62513073fc

$ git log -12 --format="%H %an %s"
fa199bef360629c73d6d223fa5496b62513073fc deus-grok [grok] SIM.60.07 Route wildlife hunt damage through UF.Rules
c76589153228d9a96916d54276ca4ef47d51c887 deus-pm [pm] Open lane-aq (SIM.60.07): BRIEF.md and lane.json
a6be423d54bd2f7d4b5a5f24f51bae73f978c4de deus-pm [pm] Retire Lane AD claim (merged); mark AN/AO/AP writers done
72c69b2f02adccad9a14653f5a5dd9db884a2f8e deus-pm Merge task/lane-ad: SIM.40.11 reclaim + ledger matter posts (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner DEC-034, VERDICT: CLEAN PASS at 22ca41636638d47426f6f1d35b74586873c3800d / review d3beb517fd0218d1a86feca7cb5784f6c10ce46a; writer grok tip 22ca41636638d47426f6f1d35b74586873c3800d)
d3beb517fd0218d1a86feca7cb5784f6c10ce46a deus-gemini [gemini] SIM.40.11 review 22ca4163: VERDICT: CLEAN PASS
aa0385e3f7d0da79d9d666b591505071592798e0 deus-pm [pm] Retire Lane AE claim (merged); record Lane AD SIM.40.11 writer done at 22ca4163
2f97fae4199b1905484ba1343d5af899cd850e04 deus-pm Merge task/lane-ae: SIM.50.13 ore sprout + fluid attach fixes (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner DEC-034, VERDICT: CLEAN PASS at ed0515bc44ce14a12e1c3760e3e2c3725e55e444 / review 0560a18bd5b103ac02db2b67563e16b8f87439a0; writer grok tip ed0515bc44ce14a12e1c3760e3e2c3725e55e444)
22ca41636638d47426f6f1d35b74586873c3800d deus-grok [grok] SIM.40.11 Post matter moves and outdoor reclamation through the mass ledger
0560a18bd5b103ac02db2b67563e16b8f87439a0 deus-gemini [gemini] SIM.50.13 review ed0515bc: CLEAN PASS
91840b91f17bc6f4bf8c622266890a820b3709c9 snewt [gemini] Record Lane AE SIM.50.13 Grok writer completion at ed0515bc; review pending
6056283a5c483c92c98c2fb32205fedfa36a1d76 snewt [gemini] 0122-DR: Record DEC-034 Owner Flash final merge gate ruling
ed0515bc44ce14a12e1c3760e3e2c3725e55e444 deus-grok [grok] SIM.50.13 Stop loose stones maturing into ore and bind the fluid solver
```

## Scope Verification

Merge base against `origin/main`: `a6be423d54bd2f7d4b5a5f24f51bae73f978c4de`

| File | Status | Within `allowedPaths` |
|---|---|---|
| `game/js/plugins/DEUS_Wildlife.js` | Modified | YES |
| `tasks/SIM.60.07/lane-aq/BRIEF.md` | Added | YES |
| `tasks/SIM.60.07/lane-aq/REPORT.md` | Added | YES |
| `tasks/SIM.60.07/lane-aq/lane.json` | Added | YES |
| `tools/sim/fixtures/wildlife_rules/hunt_strike.json` | Added | YES |
| `tools/sim/test_wildlife_rules_damage.js` | Added | YES |

- No changes to `game/js/plugins.js` or `game/js/plugins/DEUS_Core.js`.
- No changes to `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, or WBS files.
- NO ART generated, modified, or integrated (DEC-007 compliant).
- All changes strictly within `allowedPaths`.

## Gate Test Execution (Fresh Temporary Clone `.review_tmp_clone` at `fa199bef360629c73d6d223fa5496b62513073fc`)

### Test 1: `node tools/sim/test_wildlife_rules_damage.js`
- Raw Exit Code: `0`
- Output:
```
PASS fixture species — wolf -> hare
PASS source routes the strike through UF.Rules
PASS mutant anchor is unique — count 1
PASS probe strike did not throw
PASS hit roll is a non-critical hit on bare AC — natural 10 damage 5
PASS catalog attack is outside one bite — catalog 16 maxHit 10
PASS plate turns that roll into a miss — natural 10 hp 30
PASS bare hit writes the rules damage once — hp 25 want 25 key bite calls 1/1
PASS the same hit roll repeats — hp 25 / 25
PASS natural 1 deals no damage — hp 30 state hunt natural 1
PASS same seed and frame deal the same damage — hp 30 / 30 natural 6
PASS different seeds can differ — seeds 1/101 natural 12/16 damage 9/7
PASS combat absent still uses UF.Rules once — hp 25 target null
PASS kill, yields, wildlife:kill and feeding without combat — alive false state feed until 330 kills 1 drops [{"id":"meat_raw","n":1,"x":11,"y":10},{"id":"hide","n":1,"x":11,"y":10}]
PASS kill path with combat enabled — alive false state feed until 330 kills 1 drops [{"id":"meat_raw","n":1,"x":11,"y":10},{"id":"hide","n":1,"x":11,"y":10}]
PASS combat enabled applies the rules damage once — hp -4 max 1 rules 5 swingReady false attacks 0->0
PASS combat enabled miss does not kill or swing — hp 1 state hunt swingReady false
PASS rules absent subtracts catalog attack once, deterministically — hp 14 / 14 catalog 16
PASS rules absent still kills, drops, emits and feeds — state feed until 93 drops [{"id":"meat_raw","n":1,"x":11,"y":10},{"id":"hide","n":1,"x":11,"y":10}]
PASS mutant catalog_subtraction is caught — hp 14 rules hp 25 err null
PASS mutant double_apply is caught — hp 9 rules hp 25 err null
OK 0 failed
```

### Test 2: `node tools/check_deus_syntax.js`
- Raw Exit Code: `0`
- Output:
```
Checked 52 DEUS plugin files. Errors: 0
```

## Spot-Check of REPORT Claims and Implementation

1. **Routing through UF.Rules:**
   - Predator hunt attacks in `DEUS_Wildlife.js` now execute `UF.Rules.attack` and `UF.Rules.damage` using PRNG seeded by `hash32(worldSeed, SALT.predator, predator.id, prey.id, frame)`.
   - Resolves natural weapon keys (`bite`, `claws`, `unarmed`) matching `Combat.resolveWeaponKey`.
   - `RulesError` whiffs the swing cleanly without silently falling back to catalog attack.
2. **Deterministic Fallback:**
   - When `UF.Rules` is not loaded, catalog `combat.attack` (or 6 default) is subtracted once; kill, drop yields, `wildlife:kill` event, and `feed` state remain functional.
3. **No Double-Damage with Combat Enabled:**
   - Detects if `Combat.engage` rolled an attack via `C.stats.attacks`. If not rolled by engage, applies Rules damage once.
   - Holds predator swing via `holdPredatorSwing(u, sp)` adjusting `nextAttackTick` by attack speed interval, preventing immediate second attacks on the same tick.
4. **Kill and Drops Safety:**
   - Avoids duplicate item drops if target was already marked dead by combat.
5. **No Art & Minimal Scope:**
   - Zero art assets created or requested.
   - Core files and other plugin files untouched.

## Findings

- **BLOCKER:** None
- **MAJOR:** None
- **MINOR:** None

## Verdict

VERDICT: CLEAN PASS
