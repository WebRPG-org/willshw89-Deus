# top_models.ps1 - PM-owned model and effort standard for every DEUS launcher (start_writer2/3.ps1, start_review.ps1, run_gemini_pulse.ps1).
# OWNER MODEL STANDARD 2026-09-26 11:23 CT (supersedes the 08:54 "top model at max effort" rule and the 10:19 hard/ordinary/routine rule):
#   Tier "big" = the hardest or highest-risk lanes: 32-layer core (WG.00.17), SRD combat engine (SIM.60.05, SIM.60.06 bench),
#   mass ledger (SIM.40.00, SIM.40.11), ADR-003 performance (SIM.00.01). Everything else is "standard".
#   | provider | standard                        | big                              |
#   | claude   | claude-opus-5-5[1m] --effort high | claude-fable-5-1 --effort max (writer) |
#   | codex    | gpt-5.6-sol xhigh               | gpt-6-astra ultra (its top)      |
#   | gemini   | gemini-3.1-pro-preview thinking HIGH -> gemini-3.8-flash thinking HIGH (both tiers) |
#   | grok     | grok-4.7 xhigh (both tiers; grok-4.7 is the strongest model Grok Build lists)      |
# EFFORT FLOOR (Owner 11:24 CT): effort never falls below the tier standard. An -Effort below the floor is raised to it,
#   so Claude never launches below high, Codex never below xhigh, and Grok never below xhigh except Owner rule (b).
#   The same floor applies on fallback models.
# RULE (b) (Owner 2026-09-27 11:26 CT; narrows DEC-032 item 5 for mechanical lanes only):
#   An explicit Grok -Effort high is honoured only when ALL of these hold: provider grok, tier standard (never big),
#   the lane.json "effortClass" is mechanical (exact match after trim and lowercase), and the lane.json "writer" is grok
#   (exact match after trim and lowercase). That writer check keeps the exception on the writer's launch; reviewers are another family.
#   Mechanical lanes are data files, schemas, templates, catalog entries, formatting and simple specs.
#   The PM marks a lane mechanical by writing "effortClass": "mechanical" in its lane.json at lane opening.
#   medium and low are still raised to xhigh. A missing, unreadable or malformed lane.json, a missing effortClass,
#   or any other value is not mechanical, so the xhigh floor applies. Claude, Codex, Fable and Gemini are unchanged.
#   Repo copy of the live pm_ops library. Callers still dot-source the live file; the PM installs this copy over it after merge.
# FALLBACK (Owner 11:09 CT): when a model runs out, step down its tier chain (registry\model_limits.json), then return after the reset.
# MULTI-AGENT (Owner 09:20 and 11:23 CT): on by default for every provider and role:
#   Claude subagents (forced onto the session model), Codex multi_agent_v2 (~/.codex/config.toml),
#   Grok GROK_SUBAGENTS/GROK_WORKFLOWS, Gemini experimental.enableAgents with subagents pinned to the run's model.
#   The only opt-out: -TaskType routine (tiny routine or record-only jobs) turns Grok subagents/workflows off. Effort stays at the floor, except rule (b).
# Never review your own provider's code: claude+fable are one family, gemini+antigravity another (launch_worker/merge_gate enforce this).
# Get-PmTopModelSpec <provider> [-Effort e] [-TaskType big|standard|routine (legacy: hard=big, ordinary=standard)] [-Model m] [-Lane l]
#   With no -TaskType, the tier comes from -Lane's lane.json taskId (the big task list below), else standard.
# Backups: top_models.ps1.bak_20260926_effort, .bak_20260926_fallback, .bak_20260926_standard
$PmBigTasks = @('WG.00.17', 'SIM.60.05', 'SIM.60.06', 'SIM.40.00', 'SIM.40.11', 'SIM.00.01')
# Lane.json discovery root. Launchers keep this default. Tests assign $PmWorktreeRoot after dot-sourcing.
$PmWorktreeRoot = 'C:\Users\snewt\.deus_worktrees'
$PmModelChains = [ordered]@{
    'claude:standard' = @('claude-opus-5-5[1m]', 'sonnet', 'haiku')
    'claude:big'      = @('claude-fable-5-1', 'claude-opus-5-5[1m]', 'sonnet')
    'fable:standard'  = @('claude-fable-5-1', 'claude-opus-5-5[1m]', 'sonnet')
    'fable:big'       = @('claude-fable-5-1', 'claude-opus-5-5[1m]', 'sonnet')
    'codex:standard'  = @('gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna')
    'codex:big'       = @('gpt-6-astra', 'gpt-6-sol', 'gpt-5.6-sol', 'gpt-5.6-terra')
    'gemini:standard' = @('gemini-3.1-pro-preview', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash')
    'gemini:big'      = @('gemini-3.1-pro-preview', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash')
    'grok:standard'   = @('grok-4.7', 'grok-4.6', 'grok-4.5')
    'grok:big'        = @('grok-4.7', 'grok-4.6', 'grok-4.5')
}
# Effort per tier (the floor) and each provider's effort order (low to high)
$PmTierEffort = @{ 'claude:standard' = 'high'; 'claude:big' = 'max'; 'fable:standard' = 'max'; 'fable:big' = 'max'
                   'codex:standard' = 'low'; 'codex:big' = 'ultra'; 'grok:standard' = 'xhigh'; 'grok:big' = 'xhigh'
                   'gemini:standard' = 'HIGH'; 'gemini:big' = 'HIGH' }
$PmEffortOrder = @{ claude = @('low','medium','high','xhigh','max'); fable = @('low','medium','high','xhigh','max')
                    codex = @('low','medium','high','xhigh','max','ultra'); grok = @('low','medium','high','xhigh'); gemini = @('HIGH') }
$script:PmCurrentTier = 'standard'
$PmModelLimitsFile = 'C:\Users\snewt\.deus_worktrees\logs\registry\model_limits.json'
$PmProviderStatus  = 'C:\Users\snewt\.deus_worktrees\logs\registry\provider_status.json'

function Get-PmModelLimits {
    if (-not (Test-Path $PmModelLimitsFile)) { return @{} }
    try { $o = Get-Content $PmModelLimitsFile -Raw | ConvertFrom-Json } catch { return @{} }
    $h = @{}; foreach ($p in $o.PSObject.Properties) { $h[$p.Name] = $p.Value }; return $h
}
function Test-PmModelLimited([string]$Model) {
    $h = Get-PmModelLimits
    if (-not $h.ContainsKey($Model)) { return $false }
    try { return ([DateTimeOffset]::Now -lt [DateTimeOffset]::Parse([string]$h[$Model].until)) } catch { return $false }
}
function Set-PmModelLimit([string]$Model, [datetime]$Until, [string]$Reason) {
    $h = Get-PmModelLimits
    $h[$Model] = [pscustomobject]@{ until = ([DateTimeOffset]$Until).ToString('o'); reason = $Reason; set = (Get-Date).ToString('o') }
    $tmp = "$PmModelLimitsFile.tmp$PID"
    [IO.File]::WriteAllText($tmp, (([pscustomobject]$h) | ConvertTo-Json -Depth 4), (New-Object Text.UTF8Encoding $false))
    Move-Item -Force $tmp $PmModelLimitsFile
}

function Get-PmLaneConfig([string]$Lane) {
    # Same lane.json search Resolve-PmTier has always used. $null if the file is missing, unreadable or malformed.
    if (-not $Lane) { return $null }
    $root = $PmWorktreeRoot
    if (-not $root) { $root = 'C:\Users\snewt\.deus_worktrees' }
    $wt = Join-Path $root $Lane
    $lj = Get-ChildItem -Path (Join-Path $wt 'tasks') -Recurse -Filter lane.json -ErrorAction SilentlyContinue | Where-Object { $_.Directory.Name -eq $Lane } | Select-Object -First 1
    if (-not $lj) { return $null }
    try { return (Get-Content -LiteralPath $lj.FullName -Raw | ConvertFrom-Json) } catch { return $null }
}
function Test-PmHonourGrokHigh([string]$Tier, [string]$Lane) {
    # Owner rule (b). Fail safe: uncertain lane.json does not honour high.
    try {
        if ($Tier -ne 'standard') { return $false }
        $cfg = Get-PmLaneConfig $Lane
        if (-not $cfg) { return $false }
        $cls = "$($cfg.effortClass)".Trim().ToLowerInvariant()
        $writer = "$($cfg.writer)".Trim().ToLowerInvariant()
        if ($cls -ne 'mechanical') { return $false }
        if ($writer -ne 'grok') { return $false }
        return $true
    } catch { return $false }
}
function Resolve-PmTier([string]$TaskType = '', [string]$Lane = '') {
    switch ("$TaskType".Trim().ToLowerInvariant()) {
        { $_ -in 'big','hard' }                  { return 'big' }
        { $_ -in 'standard','ordinary','routine' } { return 'standard' }
        '' {
            if ($Lane) {
                try {
                    $cfg = Get-PmLaneConfig $Lane
                    if ($cfg -and ($PmBigTasks -contains $cfg.taskId)) { return 'big' }
                } catch { }
            }
            return 'standard'
        }
        default { throw "unknown -TaskType '$TaskType' (big|standard|routine)" }
    }
}
function Get-PmModelChain([string]$Provider, [string]$Tier = '') {
    if (-not $Tier) { $Tier = $script:PmCurrentTier }
    $c = $PmModelChains["${Provider}:$Tier"]; if (-not $c) { throw "no model chain for ${Provider}:$Tier" }; return ,$c
}
function Get-PmActiveModel([string]$Provider, [string]$Tier = '') {
    foreach ($m in (Get-PmModelChain $Provider $Tier)) { if (-not (Test-PmModelLimited $m)) { return $m } }
    return $null
}
function Test-PmIsTopModel([string]$Provider, [string]$Model, [string]$Tier = '') { return ((Get-PmModelChain $Provider $Tier)[0] -eq $Model) }
function Resolve-PmEffort([string]$Provider, [string]$Effort = '', [string]$Tier = 'standard', [string]$Model = '', [string]$Lane = '') {
    # Tier effort is the FLOOR. A higher explicit -Effort is honoured if the provider supports it. Anything lower is raised to the floor.
    # Rule (b): an explicit grok 'high' stays when Test-PmHonourGrokHigh is true. medium and low still rise to the floor.
    $floor = $PmTierEffort["${Provider}:$Tier"]
    if ($Provider -eq 'gemini') { return 'HIGH' }
    $order = $PmEffortOrder[$Provider]
    $e = "$Effort".Trim().ToLowerInvariant(); if ($e -eq 'top') { $e = $order[-1] }
    if ($e -eq 'ultracode' -and $Provider -in 'claude','fable') { return 'ultracode' }
    if (-not $e -or ($order -notcontains $e)) { $e = $floor }
    $explicit = "$Effort".Trim().ToLowerInvariant()
    $raiseTo = $floor
    if ($Provider -eq 'grok' -and $explicit -eq 'high' -and (Test-PmHonourGrokHigh $Tier $Lane)) { $raiseTo = $explicit }
    if ($order.IndexOf($e) -lt $order.IndexOf($raiseTo)) { $e = $raiseTo }
    # codex: luna/5.5 tiers list no 'ultra'; cap at max for them
    if ($Provider -eq 'codex' -and $e -eq 'ultra' -and $Model -match 'luna|5\.5|reserve') { $e = 'max' }
    return $e
}
function Test-PmLimitError([string]$Provider, [string]$Text) {
    # Returns $null if $Text shows no usage/quota limit; otherwise @{ Until = <datetime>; Match = <text> }.
    if (-not $Text) { return $null }
    $pat = switch -Regex ($Provider) {
        'gemini'       { 'TerminalQuotaError|exhausted your daily quota|RESOURCE_EXHAUSTED|Quota exceeded for metric' }
        'claude|fable' { 'usage limit reached|Claude AI usage limit|weekly limit|limit reached.{0,40}reset|rate_limit_error|out of extra usage|hit your limit' }
        'codex'        { 'usage limit|hit your usage limit|insufficient_quota|rate_limit_exceeded|Upgrade to Pro' }
        'grok'         { 'rate limit exceeded|quota exceeded|usage limit|insufficient credits|\b429\b' }
        default        { 'quota|usage limit|\b429\b' }
    }
    $m = [regex]::Match($Text, $pat, 'IgnoreCase')
    if (-not $m.Success) { return $null }
    $dflt = @{ gemini = 8; claude = 5; fable = 5; codex = 24; grok = 1 }[$Provider]; if (-not $dflt) { $dflt = 4 }
    $until = (Get-Date).AddHours($dflt)
    $r = [regex]::Match($Text, 'retry in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?', 'IgnoreCase')
    if ($r.Success -and ($r.Groups[1].Success -or $r.Groups[2].Success -or $r.Groups[3].Success)) {
        $h = if ($r.Groups[1].Success) { [int]$r.Groups[1].Value } else { 0 }; $mi = if ($r.Groups[2].Success) { [int]$r.Groups[2].Value } else { 0 }
        $until = (Get-Date).AddHours($h).AddMinutes($mi + 5)
    }
    return @{ Until = $until; Match = $m.Value }
}
function Add-PmModelRun([string]$Job, [string]$Provider, [string]$Model, [string]$Result, [string]$Note = '') {
    # Records which model actually ran each job in provider_status.json -> modelRuns (append-only; the newest 200 are kept).
    try {
        $rec = [pscustomobject]@{ at = (Get-Date).ToString('o'); job = $Job; provider = $Provider; model = $Model
                                  fallback = -not (Test-PmIsTopModel $Provider $Model); result = $Result; note = $Note }
        $tmpRec = Join-Path $env:TEMP ("pm_modelrun_{0}_{1}.json" -f $PID, (Get-Random))
        [IO.File]::WriteAllText($tmpRec, ($rec | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding $false))
        $js = "const fs=require('fs');const p=process.argv[1];const r=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));let o={};try{o=JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));}catch(e){if(fs.existsSync(p))throw e;}if(!Array.isArray(o.modelRuns))o.modelRuns=[];o.modelRuns.push(r);o.modelRuns=o.modelRuns.slice(-200);const t=p+'.tmp'+process.pid;fs.writeFileSync(t,JSON.stringify(o,null,2)+'\n');fs.renameSync(t,p);"
        & 'C:\Program Files\nodejs\node.exe' -e $js $PmProviderStatus $tmpRec 2>&1 | Out-Null
        Remove-Item $tmpRec -Force -ErrorAction SilentlyContinue
    } catch { }
}

function Set-PmGeminiSubagentModel([string]$Model) {
    # ~/.gemini/settings.json pins the codebase_investigator/cli_help subagents to a model. Every Gemini launcher (the pulse, and
    # start_review -Provider gemini; both hold gemini_pulse.lock) points them at its own chosen model before it starts, so a fallback
    # run never calls a model that is out of quota. The pins go back to the top model on the first run after its limit expires.
    $p = Join-Path $env:USERPROFILE '.gemini\settings.json'
    if (-not (Test-Path $p)) { return }
    $js = "const fs=require('fs');const p=process.argv[1],m=process.argv[2];const o=JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));const ov=(o.agents||{}).overrides||{};let n=0;for(const k of Object.keys(ov)){if(ov[k]&&ov[k].modelConfig&&ov[k].modelConfig.model!==m){ov[k].modelConfig.model=m;n++;}}if(n){const t=p+'.tmp'+process.pid;fs.writeFileSync(t,JSON.stringify(o,null,2)+'\n');fs.renameSync(t,p);}console.log(n);"
    & 'C:\Program Files\nodejs\node.exe' -e $js $p $Model 2>&1 | Out-Null
}
function Get-PmTopModelSpec([string]$Provider, [string]$Effort = '', [string]$TaskType = '', [string]$Model = '', [string]$Lane = '') {
    # Returns the launch spec for the tier standard: the first unlimited model in the tier chain, at an effort no lower than the floor.
    # Rule (b) is the one exception: explicit grok high on a standard mechanical grok-writer lane.
    # Every model limited: the top model comes back with .AllLimited = $true, so callers HOLD the job.
    $npm = Join-Path $env:APPDATA 'npm'
    $tier = Resolve-PmTier $TaskType $Lane
    $script:PmCurrentTier = $tier
    $allLimited = $false
    if (-not $Model) { $Model = Get-PmActiveModel $Provider $tier; if (-not $Model) { $Model = (Get-PmModelChain $Provider $tier)[0]; $allLimited = $true } }
    $isTop = Test-PmIsTopModel $Provider $Model $tier
    $eff = Resolve-PmEffort $Provider $Effort $tier $Model $Lane
    $routine = ("$TaskType".Trim().ToLowerInvariant() -eq 'routine')
    $spec = Get-PmTopModelSpecInner $Provider $eff $Model $npm $routine
    $spec.IsFallback = -not $isTop; $spec.AllLimited = $allLimited; $spec.Tier = $tier; $spec.MultiAgent = -not ($routine -and $Provider -eq 'grok')
    return $spec
}
function Get-PmTopModelSpecInner([string]$Provider, [string]$eff, [string]$Model, [string]$npm, [bool]$routine) {
    switch ($Provider) {
        { $_ -in 'claude','fable' } {
            $env:CLAUDE_CODE_EFFORT_LEVEL = $eff
            $env:CLAUDE_CODE_SUBAGENT_MODEL = $Model
            $env:CLAUDE_CODE_SUBAGENT_MODEL_FORCE = '1'
            return @{ Exe = (Join-Path $npm 'node_modules\@anthropic-ai\claude-code\bin\claude.exe'); Stdin = $true; Model = $Model; Effort = $eff; Family = 'claude'
                      Args = "-p --output-format stream-json --verbose --dangerously-skip-permissions --forward-subagent-text --model $Model --effort $eff" }
        }
        'grok' {
            $ma = if ($routine) { '0' } else { '1' }
            $env:GROK_SUBAGENTS = $ma
            $env:GROK_WORKFLOWS = $ma
            return @{ Exe = (Join-Path $env:USERPROFILE '.grok\bin\grok.exe'); Stdin = $false; Model = $Model; Effort = $eff; Family = 'grok'
                      Args = "--always-approve --model $Model --reasoning-effort $eff --prompt-file {promptFile}" }
        }
        'codex' {
            $node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
            $js = Join-Path $npm 'node_modules\@openai\codex\bin\codex.js'
            return @{ Exe = $node; Stdin = $true; Model = $Model; Effort = $eff; Family = 'codex'
                      Args = ($js + " exec --dangerously-bypass-approvals-and-sandbox --json -m $Model -c model_reasoning_effort=$eff -") }
        }
        'gemini' {
            # Own runner (run_gemini_pulse.ps1, start_review.ps1 -Provider gemini). Thinking HIGH comes from ~/.gemini/settings.json
            # modelConfigs.customOverrides for gemini-3.1-pro-preview and gemini-3.8-flash (Gemini CLI 0.61.0 has no thinking flag).
            return @{ Exe = 'C:\Program Files\nodejs\node.exe'; Js = (Join-Path $npm 'node_modules\@google\gemini-cli\bundle\gemini.js'); Stdin = $true
                      Model = $Model; Effort = 'thinking HIGH'; Family = 'gemini'
                      Args = "--approval-mode yolo --skip-trust -m $Model" }
        }
    }
    throw "unknown provider $Provider"
}