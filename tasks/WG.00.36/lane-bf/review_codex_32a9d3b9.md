# Independent Codex review — WG.00.36 / lane-bf

Review date: 2026-09-27. Writer: Grok. Reviewer: Codex.
Reviewed commit: **32a9d3b907a035081e82b54b553d249a7a690536**.
Branch: `task/lane-bf`.
Merge base with fetched `origin/main`: **ecc7b8984a0ab1a919595c792f98a60f18872f73**.

## Identity and scope

Before substantive review, `git branch --show-current` returned `task/lane-bf`; `git rev-parse HEAD origin/task/lane-bf` returned the full reviewed hash twice. After `git fetch origin task/lane-bf main` the two hashes remained identical. `git merge-base origin/main 32a9d3b9` returned the base above. The pre-existing untracked `tasks/WG.00.36/lane-bf/launches/` folder was read and left untouched. Explicit review-only instructions override the standing STATUS claim/decision-log edits; no other workspace file was edited.

Read the brief, lane.json, REPORT.md, changed code, documentation and harness, and relevant selection, overlay, depth, Z-range and decision contracts. Writer evidence consists of pasted command output in REPORT.md; there is no committed lane evidence directory or cross-layer screenshot. Launch prompts are instructions, not runtime evidence.

| Changed path (base → reviewed tip) | allowedPaths match | Scope |
|---|---|---|
| game/js/plugins/DEUS_Select.js | exact path | Helpers, input picking, occupancy cache, group slots, retention listeners |
| game/js/plugins/DEUS_LayerOverlays.js | exact path | Visibility accessor and selection accessor/hash |
| docs/systems/UF_Select.md | exact path | Cross-layer contract and tests |
| tools/select_xlayer/test_xlayer_select.js | tools/select_xlayer/** | Five helper checks and provocations |
| tasks/WG.00.36/lane-bf/BRIEF.md | tasks/WG.00.36/** | Task contract |
| tasks/WG.00.36/lane-bf/lane.json | tasks/WG.00.36/** | Machine scope and gates |
| tasks/WG.00.36/lane-bf/REPORT.md | tasks/WG.00.36/** | Writer report |

A Node check compared all seven `git diff --name-only <base> <tip>` paths with lane.json exact paths/prefixes: seven PASS lines, EXIT=0. No outside-scope writer changes.

## Acceptance assessment

| Requirement | Assessment |
|---|---|
| 1. Pick visible lower cells, shared renderer rule, no solid-cover picks | Shared pointVisible walk is called; helper open/covered cases pass. **Incomplete:** rendering-disabled state still picks undrawn lower units (M1). |
| 2. Modifier selection, documented gestures, existing hotkeys | Union for Shift+drag and toggle for Shift+click are wired; viewed hit wins, otherwise highest visible lower hit. Area/player filters exist for boxes. Existing single-layer outcomes match base repeat. Live cross-layer gestures lack integration evidence (M3). |
| 3. Mixed-layer group orders, sensible targets, V68 | One formation on target Z, Chebyshev then horizontal squared distance and id; unique slots, no-free-cell count, existing encumbrance guard and order dispatch retained. Nonzero-Z standability now uses levelArea.z. Existing same-level group checks pass on tip. Actual mixed-level path traversal is not tested (M3). |
| 4. Selection/order survive layer transitions; lower ring at 1:1 | Stable selected IDs, listeners do not clear group/jobs. Overlays consult isSelected and include selection in live hash. Helper ring geometry passes. Actual slope traversal plus live input/render retention is unproven (M3). |
| 5. Cost scales with units in visible box cells, no per-frame world scan | **Fails required locality:** full world index build at drag start and release (M2). Cached intermediate queries avoid ordinary repeated scans, but rebuilding remains O(world units). |
| 6. Five checks, fail provocations, existing suite base/tip | Gates and provocations pass, base/tip comparison reproduced. Provocations exercise helper/test state rather than key production paths; M3. No existing assertions were weakened. |
| 7. API/docs/questions/follow-ups | Cross-layer docs, exact gestures, target-Z policy, PROPOSED-BF-01..03 and registration request supplied. |
| All gateTests exit 0 | Yes; raw output below. Necessary but insufficient for all scope items. |
| Independent Gemini pass / Gemini DONE | Not established by this Codex review; no WBS change or certification made. |
| NO ART / AUDIO | Pass: all seven changes are text/code; no art, image, audio, generator or generation prompt added. Existing square/bar primitives reused. Reviewer generated only allowed runtime test PNG evidence. |

## Findings

### BLOCKER

None identified.

### MAJOR M1 — Hidden lower units selectable when depth drawing is disabled

Evidence: `game/js/plugins/DEUS_Select.js:1465` (depthReach) and `:1478` (columnVisible). depthReach reads maxDepth without checking config.enabled; columnVisible uses the geometric column rule even when the renderer has no planes. In contrast, `DEUS_Depth.js:934` requires config.enabled to bind/draw lower planes; setEnabled(false) is a supported API.

Reproduced by evaluating the **actual production functions** from the occupancy/pick block in a Node VM, with UF.LayerOverlays loaded, UF.Depth.config={enabled:false,maxDepth:2}, and isOpen returning true. This is not a reimplementation of columnVisible. Output:

```
Depth enabled=false; lower cell selectable=true
```

An empty viewed cell can therefore hit/select a lower unit the player cannot see, through plain/Shift clicks or box selection. Acceptance 1 requires selection to match what the renderer draws. Gate box_visible only tests geometric cover/reach, so it misses this condition. Respect the renderer's enabled/reachable-plane state and prove disabled/on transitions in an integration check.

### MAJOR M2 — Box work still scales with the entire world population

Evidence: `game/js/plugins/DEUS_Select.js:1490` buildOcc calls World.units and XLayer.indexUnits; `:1497` ensureOcc rebuilds on force; `:1511` queryBoxUnits; commitActiveBox calls queryBoxUnits(box,true). Starting each drag resets occList. Indexing walks every world unit and allocates buckets even outside the area/box.

Using those actual production functions, a stable cached World.units array instrumented with a Proxy counted indexed unit reads for a 1×1 box, one relevant lower unit and 3,999 far-away units:

```
1x1 initial pick world-unit reads=4000
1x1 release pick world-unit reads=4000
```

Intermediate queries are local after indexing, which improves the former repeated scan. It does not meet the brief's stronger requirement that box-select cost scale with units in visible box cells rather than all world units. This limitation is accurately disclosed in writer docs but remains an acceptance gap. Use an existing localized registry or an incrementally maintained occupancy index, and measure the whole production gesture, including setup/release, rather than only its cached query.

### MAJOR M3 — Transition/group/performance gates do not prove the live requirements

Evidence: `tools/select_xlayer/test_xlayer_select.js:226` checkSurvive uses X.retain and X.viewKeeps; these functions (`DEUS_Select.js:250,259`) are trivial helpers not called by the production level/view transition paths. The provocation drops test arrays and flags rather than executing a broken production transition. Source substring checks do not require listeners to exist or fire. An empty/missing listener can pass the checks because absence of clearSelection is sufficient.

checkOrders asserts helper slot records and only checks that groupMove's source mentions planGroupOrders. It never executes mixed-level C.order/J.create, pathfinding or connector traversal. checkPerf (`:291`) constructs its own one-time cache around X.indexUnits and excludes setup population reads; fullScans is a literal zero from the helper. Its provocation changes the test fixture's caching behavior. That test passes while M2's real startup/release scans remain.

The checks can fail (provocations reproduced), but they are insufficient to establish acceptance 3–5 in live RMMZ. Add production input/event/order integration coverage with actual selection IDs, job targets, unit crossing and 1:1 lower-plane markers, including targeted production mutations. No editor F5/F8 cross-layer evidence or equivalent live cross-layer fixture was supplied.

### MINOR / integration notes

- **I1:** LayerOverlays is not registered in game/js/plugins.js on either base or tip, and Core's companion list does not load it. The fallback in columnVisible limits selection to viewed Z. The writer explicitly requested PM registration, as the brief permits, so this is an acknowledged pre-existing integration dependency rather than an unauthorized omitted plugins.js edit. Cross-layer behavior cannot be treated as available in the ordinary shipped plugin configuration until that request is applied and tested.
- **I2:** The new doc's final sentence says the existing snapshot suite must still pass, but its unchanged duplicate registration fails on base as well. REPORT.md correctly identifies that problem. Reconcile the documentation with the known baseline; do not weaken or blame those baseline failures on this lane.

## Gate evidence

Commands ran in the writer worktree at the exact writer commit; PowerShell printed EXIT=$LASTEXITCODE immediately after each Node command. No command ran against an edited implementation.

### `node tools/select_xlayer/test_xlayer_select.js`

```text
PASS box_visible
PASS shift_layers
PASS group_orders
PASS survive
PASS perf
RESULT: 5 passed, 0 failed
EXIT=0
```

### `node tools/layer_overlays/test_layer_overlays.js`

```text
PASS lower_layers_have_overlays
PASS lower_layers_have_overlays_mutant_killed
PASS scale_is_one
PASS scale_is_one_mutant_killed
PASS no_filters_tint_fog_or_fade
PASS no_filters_tint_fog_or_fade_mutant_killed
PASS whole_pixel_over_the_unit
PASS whole_pixel_over_the_unit_mutant_killed
PASS occluded_units_have_none
PASS occluded_units_have_none_mutant_killed
PASS current_layer_unchanged
PASS current_layer_unchanged_mutant_killed
PASS cues_shift_the_layer_not_the_overlay
PASS cues_shift_the_layer_not_the_overlay_mutant_killed
PASS draw_order_lower_then_higher
PASS draw_order_lower_then_higher_mutant_killed
PASS steady_frame_allocates_nothing
PASS steady_frame_allocates_nothing_mutant_killed
PASS rebuild_reuses_records
PASS rebuild_reuses_records_mutant_killed
PASS change_driven_by_revision
PASS change_driven_by_revision_mutant_killed
PASS window_and_depth_reach_cull
PASS window_and_depth_reach_cull_mutant_killed
PASS spells_status_and_combat_marks
PASS spells_status_and_combat_marks_mutant_killed
PASS number_stack_matches_combat_cap
PASS number_stack_matches_combat_cap_mutant_killed
PASS damage_colours_match_combat
PASS damage_colours_match_combat_mutant_killed
PASS plan_is_deterministic
PASS plan_is_deterministic_mutant_killed
PASS live_hook_is_a_no_op_without_pixi
PASS live_hook_is_a_no_op_without_pixi_mutant_killed
PASS depth_calls_overlay_bus
PASS depth_calls_overlay_bus_mutant_killed
PASS no_art_generation
PASS no_art_generation_mutant_killed
BENCH layers=32 units=1024 pool=144 allocations=146
BENCH buried hp=32 lowerHp=0 overlays=96 lower=0 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.716 steadyMs=
BENCH shaft-depth-2 hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.590 steadyMs=
BENCH shaft-depth-31 hp=48 lowerHp=16 overlays=144 lower=48 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.328 steadyMs=
BENCH cues-on hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=6 steadyAlloc=undefined rebuildMs=0.122 steadyMs=
BENCH steady hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=undefined steadyAlloc=0 rebuildMs=3.011 steadyMs=0.016
PASS benchmark_32_layers
PASS benchmark_32_layers_mutant_killed
RESULT: 40 passed, 0 failed
EXIT=0
```

### `node tools/check_deus_syntax.js`

```text
Checked 60 DEUS plugin files. Errors: 0
EXIT=0
```

### `node tools/select_xlayer/test_xlayer_select.js --provoke-all`

```text
CAUGHT box_visible exit 1
CAUGHT shift_layers exit 1
CAUGHT group_orders exit 1
CAUGHT survive exit 1
CAUGHT perf exit 1
PROVOKE-ALL: 5/5 caught
EXIT=0
```

## Existing select snapshot comparison

Commands (each followed by PowerShell EXIT=$LASTEXITCODE):

- Tip worktree: `node tools/test_snapshot.js --name codex_bf_tip_32a9d3b9 --plugins UF_Select --suite select`
- Detached base clone under %TEMP%\\codex_bf_base_32a9d3b9: `node tools/test_snapshot.js --name codex_bf_base_32a9d3b9 --plugins UF_Select --suite select`
- Same detached base clone, repeat: `node tools/test_snapshot.js --name codex_bf_base_repeat_32a9d3b9 --plugins UF_Select --suite select`

| Revision/run | Raw result | Node exit |
|---|---|---|
| Writer tip | RESULT: 73 passed, 23 failed (exit 1) | 1 |
| Base initial | RESULT: 65 passed, 31 failed (exit 1) | 1 |
| Base repeat | RESULT: 73 passed, 23 failed (exit 1) | 1 |

Compared PASS/FAIL check-name sequences, including repeated registrations: **96 of 96 outcomes match between tip and base repeat; zero base-pass → tip-fail**. The initial base's eight extra failures were group_move and cancel_area on each of four registrations; they disappeared on unchanged base rerun, so they are not lane regressions. The exact cause of those transient eight failures was not isolated. The harness uses a randomly seeded New Game (DEUS_Test.js:207; DEUS_World.js:521–525), chooses an arena from generated terrain, disables colonist AI but does not pause the entire simulation. The observed terrain/weather differs across runs. This limits determinism; attributing the transient differences to this lane would be unsupported.

The shared 23 failures occur in registrations 1 and 3; registrations 2 and 4 pass all 24 checks on tip and base repeat. First failing registration has zone_saved as well; third does not:

```text
box_units
shift_adds
tool_chop_area
tool_skips_ineligible
tool_obeys_unlocks
zone_saved (registration 1 only)
leave_tool
target_square_brackets
drag_release_dismisses_square
tile_deselect_right_click
tile_deselect_esc
tile_deselect_left_click
```

Pre-existing mechanism: Core synchronously requires DEUS_Select (DEUS_Core.js:79,98); requesting UF_Select loads its compatibility shim, which loads DEUS_Select as a browser script because the Core require does not populate PluginManager._scripts. Each loaded instance registers at load and again at boot (DEUS_Select.js:2534,3933 on tip). Four closures register checks, but only one selection/input closure owns effective input at a time. The failing closures observe one-unit selections and no own commit summary; the later closures observe the expected three-unit selection and summary. This matches writer explanation and base/tip observed outcomes. No baseline check was removed, relaxed or quarantined.

Raw excerpts reproduced on tip and base repeat:

```text
FAIL select.select.box_units - Selected 1 units (want col1, col2, flier): ada=true, bob=false, flier=false, allied=false, wild=false, outside=false
PASS select.select.box_units - Selected 3 units (want col1, col2, flier): ada=true, bob=true, flier=true, allied=false, wild=false, outside=false
PASS select.select.shift_adds - Shift behavior: A=1, A+B=2, plain B=1, toggle=2
PASS select.select.group_move - Group move: jobs=5 (want 5), distinct targets=5 (want 5)
PASS select.select.level_scope - Level scope: drag cancelled when view level changed = true
PASS select.select.no_errors - Errors during suite: gained 0 errors
RESULT: 73 passed, 23 failed (exit 1)
EXIT=1
```

## Additional reproduction command

The M1/M2 probe ran via a PowerShell literal here-string piped to `node -`, EXIT=0. It evaluated the writer's functions directly, with stubs for their runtime dependencies. Reproducible Node input:

```javascript
const fs = require('fs'), vm = require('vm');
const s = fs.readFileSync('game/js/plugins/DEUS_Select.js', 'utf8');
const a = s.indexOf('    let occ = null;');
const b = s.indexOf('    function bindLevelRetention()', a);
const L = require('./game/js/plugins/DEUS_LayerOverlays.js');
const X = require('./game/js/plugins/DEUS_Select.js');
let visits = 0;
const units = Array.from({length:4000}, (_, i) => ({
  id:i, area:{x:0,y:0}, x:i?200:2, y:i?200:2, z:-1,
  data:{faction:'player'}
}));
const counted = new Proxy(units, {
  get(t,k) {
    if (/^\\d+$/.test(String(k))) visits++;
    return t[k];
  }
});
const D = {config:{enabled:false,maxDepth:2},isOpen:()=>true};
const UF = {Depth:D,LayerOverlays:L};
const c = {
  window:{UF}, UF, XLayer:X,
  World:()=>({units:()=>counted}),
  isPlayerUnit:()=>true, findUnitAt:()=>null
};
vm.createContext(c);
vm.runInContext(s.slice(a,b),c);
console.log('Depth enabled=false; lower cell selectable=' +
  vm.runInContext('columnVisible({x:0,y:0},2,2,-1,0)',c));
c.box = {area:{x:0,y:0},x0:2,y0:2,x1:2,y1:2,z:0};
vm.runInContext('queryBoxUnits(box,false)',c);
console.log('1x1 initial pick world-unit reads='+visits);
visits=0;
vm.runInContext('queryBoxUnits(box,true)',c);
console.log('1x1 release pick world-unit reads='+visits);
```

## Screenshot inspection and evidence limits

Opened every PNG produced by all three snapshot runs (10 unique filenames per run; the four suite registrations overwrite those filenames). The files lived under %TEMP%\\uf_snapshots\\codex_bf_{tip,base,base_repeat}_32a9d3b9\\test_output and were deleted after inspection, before the review commit. None demonstrates a cross-layer gesture: all show the Ground view.

| Screenshot suffix (select.select.*.png) | What was actually visible |
|---|---|
| big_box | Ground arena with green box; status says pointer left map/cancelled. Does not prove a large completed cross-layer pick. |
| box_drag | Ground green rectangle, colonists and bird, with selected-unit rings in tip and base captures. |
| chop_marked | Ground trees below rectangle; status says four marked trees. |
| drag_release_dismissed | Green unit rings remain; status shows explicitly selected tile. A visible green rectangle is not proof of live internal activeBox; logged activeBox is null. |
| ground_click_no_selector | Ground scene with units and no white hover corners. |
| group_moved | Five-moving status, selected units in distinct visible positions; not cross-layer traversal proof. |
| hover_and_target_brackets | White target corners over an empty ground cell beside box. |
| stockpile_zone | Tip and initial base show cyan zone cells and 12-marked status; base repeat shows the label/status with no clearly painted cyan cells. Logs still pass the state roundtrip. Visual consistency remains unproven. |
| target_square_brackets | White ground-cell corner brackets. |
| tile_hover_selector | Ground view without the white hover selector. |

Base initial shows different upper-left rock/ice terrain from tip; base repeat shows meadow and rain. Existing sprite art is reused; these are harness renders, not newly generated art.

Editor F5 playtest and manual F8 console inspection: **not checked**. Snapshot no_errors checks pass on each registration, but that does not certify the missing cross-layer scenario. No runtime art asset, implementation fix, merge or worker stop was performed.

## What changed

- Only tasks/WG.00.36/lane-bf/review_codex_32a9d3b9.md: independent review, scope, raw gates and ranked findings.

## How I tested it

- Exact branch/ref checks and fetched merge base.
- All three lane gates, all five provocations, production-function M1/M2 probe.
- Existing select NW.js snapshot suite on tip and detached base twice; compared repeated check outcomes and opened all resulting PNGs.

## Not done / known problems

- M1–M3 remain unresolved; no implementation fixes authorized.
- PM registration dependency I1 remains; unchanged duplicate suite failures remain.
- No live cross-layer screenshot/traversal or editor playtest evidence.

## Try it in RMMZ

1. After PM registers LayerOverlays, place player units at viewed Z and a visible lower Z through an opening.
2. Plain drag, Shift+drag and Shift+click; issue a mixed-level move across an actual connector, then change view while the group walks.
3. Disable depth drawing and repeat a click/box over the lower-unit column.

Expected: only drawn visible units can be newly picked; selected IDs and job targets survive crossing/view changes; exposed lower selection squares remain 1:1. Step 3 currently violates the expected selection rule in the production-function probe.

## Decisions needed

- Return M1–M3 for correction/evidence and rerun independent review. No new Owner game-design decision is required.
- PM handles the permitted registration request and final Gemini/WBS gate separately.

VERDICT: FAIL
