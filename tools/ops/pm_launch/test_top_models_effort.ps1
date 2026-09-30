# test_top_models_effort.ps1 — Owner rule (b), 2026-09-27.
# Windows PowerShell 5.1. No Pester. No network. Exit 0 on pass, 1 on any failure.
# effortClass and writer match only after Trim + ToLowerInvariant, then an exact compare.
# "Mechanical " and " Grok " count. "mechanical-extra" and "Mechanical." do not.
# A lane.json this host cannot parse (invalid JSON, empty file) is not mechanical.
# Get-Content | ConvertFrom-Json accepts a UTF-8 BOM here, so a BOM file follows the same rules.
# $PmWorktreeRoot is assigned by the library at dot-source; this test overrides it afterwards.
param([string]$LibraryPath = (Join-Path $PSScriptRoot 'top_models.ps1'))
$ErrorActionPreference = 'Stop'
$script:failCount = 0

function Assert-Eq([string]$Name, $Got, $Want) {
    $g = ([string]$Got) -replace '[\r\n]+', ' '
    $w = ([string]$Want) -replace '[\r\n]+', ' '
    if ($g -ceq $w) { Write-Output "PASS $Name" }
    else { Write-Output "FAIL $Name got=$g want=$w"; $script:failCount++ }
}

function New-Case([string]$Name, [string]$Provider, [string]$Effort, [string]$TaskType, [string]$Model, [string]$Lane) {
    [pscustomobject]@{ name = $Name; provider = $Provider; effort = $Effort; taskType = $TaskType; model = $Model; lane = $Lane }
}

function Get-SpecFields($Spec) {
    [pscustomobject]@{
        passed = $true; error = ''
        effort = [string]$Spec.Effort; tier = [string]$Spec.Tier; model = [string]$Spec.Model
        family = [string]$Spec.Family; args = [string]$Spec.Args; exe = [string]$Spec.Exe; js = [string]$Spec.Js
        multi = [bool]$Spec.MultiAgent; fallback = [bool]$Spec.IsFallback
        alllimited = [bool]$Spec.AllLimited; stdin = [bool]$Spec.Stdin
    }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$lib = $LibraryPath
$temp = Join-Path $env:TEMP ('pm_effort_policy_' + [guid]::NewGuid().ToString('n'))
$root = Join-Path $temp 'worktrees'
$pwsh = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$runner = Join-Path $temp 'run_specs.ps1'
$verbatim = Join-Path $temp 'top_models_verbatim.ps1'
$expectedHash = 'F1E271E78B140F46AE43C58DE9CAFA376827F7A433D43B2FCF9ABDBB14B2D386'

try {
    New-Item -ItemType Directory -Force -Path $root | Out-Null
    $runnerSrc = @'
param([string]$Lib, [string]$Root, [string]$Cases, [string]$OutFile)
$ErrorActionPreference = 'Stop'
. $Lib
$PmWorktreeRoot = $Root
$payload = Get-Content -LiteralPath $Cases -Raw -Encoding UTF8 | ConvertFrom-Json
$rows = New-Object System.Collections.Generic.List[object]
foreach ($c in @($payload.cases)) {
    $row = $null
    try {
        $spec = Get-PmTopModelSpec -Provider ([string]$c.provider) -Effort ([string]$c.effort) -TaskType ([string]$c.taskType) -Model ([string]$c.model) -Lane ([string]$c.lane)
        $row = [pscustomobject]@{
            name = [string]$c.name; passed = $true; error = ''
            effort = [string]$spec.Effort; tier = [string]$spec.Tier; model = [string]$spec.Model
            family = [string]$spec.Family; args = [string]$spec.Args; exe = [string]$spec.Exe; js = [string]$spec.Js
            multi = [bool]$spec.MultiAgent; fallback = [bool]$spec.IsFallback
            alllimited = [bool]$spec.AllLimited; stdin = [bool]$spec.Stdin
        }
    } catch {
        $row = [pscustomobject]@{
            name = [string]$c.name; passed = $false; error = [string]$_.Exception.Message
            effort = ''; tier = ''; model = ''; family = ''; args = ''; exe = ''; js = ''
            multi = $false; fallback = $false; alllimited = $false; stdin = $false
        }
    }
    $rows.Add($row)
}
$json = [pscustomobject]@{ rows = $rows.ToArray() } | ConvertTo-Json -Depth 6 -Compress
[System.IO.File]::WriteAllText($OutFile, $json, (New-Object System.Text.UTF8Encoding $false))
exit 0
'@
    [System.IO.File]::WriteAllText($runner, $runnerSrc, (New-Object System.Text.UTF8Encoding $false))

    $errs = $null
    $tokens = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($lib, [ref]$tokens, [ref]$errs)
    if ($errs -and $errs.Count -gt 0) { throw ("library parse: " + $errs[0].Message) }

    $importSha = (& git -C $repoRoot log -1 --format=%H --grep="import live top_models.ps1 verbatim")
    if ($LASTEXITCODE -ne 0 -or -not $importSha) { throw 'import commit not found' }
    $importSha = ([string]$importSha).Trim()
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'git'
    $psi.Arguments = "-C `"$repoRoot`" cat-file blob ${importSha}:tools/ops/pm_launch/top_models.ps1"
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    [void]$proc.Start()
    $blob = [System.IO.File]::Create($verbatim)
    $proc.StandardOutput.BaseStream.CopyTo($blob)
    $blob.Close()
    $blobErr = $proc.StandardError.ReadToEnd()
    $proc.WaitForExit()
    if ($proc.ExitCode -ne 0) { throw "cat-file exit $($proc.ExitCode) $blobErr" }
    $proc.Dispose()
    $gotHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $verbatim).Hash
    Assert-Eq 'import blob sha256' $gotHash $expectedHash

    function New-Lane([string]$Name, [string]$Json) {
        $dir = Join-Path $root $Name
        $dir = Join-Path $dir 'tasks'
        $dir = Join-Path $dir 'T'
        $dir = Join-Path $dir $Name
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        [System.IO.File]::WriteAllText((Join-Path $dir 'lane.json'), $Json, (New-Object System.Text.UTF8Encoding $false))
    }
    function New-LaneBytes([string]$Name, [byte[]]$Bytes) {
        $dir = Join-Path $root $Name
        $dir = Join-Path $dir 'tasks'
        $dir = Join-Path $dir 'T'
        $dir = Join-Path $dir $Name
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        [System.IO.File]::WriteAllBytes((Join-Path $dir 'lane.json'), $Bytes)
    }

    New-Lane 'lane-bc-eff-mech' '{"lane":"lane-bc-eff-mech","taskId":"DEUS-TSK-MECH","writer":"grok","effortClass":"mechanical"}'
    New-Lane 'lane-bc-eff-plain' '{"lane":"lane-bc-eff-plain","taskId":"DEUS-TSK-PLAIN","writer":"grok"}'
    New-Lane 'lane-bc-eff-sim' '{"lane":"lane-bc-eff-sim","taskId":"DEUS-TSK-SIM","writer":"grok","effortClass":"simulation"}'
    New-Lane 'lane-bc-eff-extra' '{"lane":"lane-bc-eff-extra","taskId":"DEUS-TSK-EXTRA","writer":"grok","effortClass":"mechanical-extra"}'
    New-Lane 'lane-bc-eff-dot' '{"lane":"lane-bc-eff-dot","taskId":"DEUS-TSK-DOT","writer":"grok","effortClass":"Mechanical."}'
    New-Lane 'lane-bc-eff-space' '{"lane":"lane-bc-eff-space","taskId":"DEUS-TSK-SPACE","writer":"grok","effortClass":"Mechanical "}'
    New-Lane 'lane-bc-eff-trim' '{"lane":"lane-bc-eff-trim","taskId":"DEUS-TSK-TRIM","writer":"grok","effortClass":" mechanical "}'
    New-Lane 'lane-bc-eff-upper' '{"lane":"lane-bc-eff-upper","taskId":"DEUS-TSK-UPPER","writer":"grok","effortClass":"MECHANICAL"}'
    New-Lane 'lane-bc-eff-pad' '{"lane":"lane-bc-eff-pad","taskId":"DEUS-TSK-PAD","writer":" Grok ","effortClass":"mechanical"}'
    New-Lane 'lane-bc-eff-notgrok' '{"lane":"lane-bc-eff-notgrok","taskId":"DEUS-TSK-NG","writer":"claude","effortClass":"mechanical"}'
    New-Lane 'lane-bc-eff-nowriter' '{"lane":"lane-bc-eff-nowriter","taskId":"DEUS-TSK-NW","effortClass":"mechanical"}'
    New-Lane 'lane-bc-eff-modelname' '{"lane":"lane-bc-eff-modelname","taskId":"DEUS-TSK-MN","writer":"grok-4.7","effortClass":"mechanical"}'
    New-Lane 'lane-bc-eff-nullclass' '{"lane":"lane-bc-eff-nullclass","taskId":"DEUS-TSK-NC","writer":"grok","effortClass":null}'
    New-Lane 'lane-bc-eff-numclass' '{"lane":"lane-bc-eff-numclass","taskId":"DEUS-TSK-NUM","writer":"grok","effortClass":1}'
    New-Lane 'lane-bc-eff-bad' '{ this is not json'
    New-Lane 'lane-bc-eff-empty' ''
    New-Lane 'lane-bc-eff-array' '[]'
    $bomBig = '{"lane":"lane-bc-eff-bom","taskId":"WG.00.17","writer":"grok","effortClass":"mechanical"}'
    New-LaneBytes 'lane-bc-eff-bom' ([byte[]](0xEF, 0xBB, 0xBF) + [Text.Encoding]::UTF8.GetBytes($bomBig))
    $bomStd = '{"lane":"lane-bc-eff-bomstd","taskId":"DEUS-TSK-BOM","writer":"grok","effortClass":"mechanical"}'
    New-LaneBytes 'lane-bc-eff-bomstd' ([byte[]](0xEF, 0xBB, 0xBF) + [Text.Encoding]::UTF8.GetBytes($bomStd))
    $bigIds = @('WG.00.17', 'SIM.60.05', 'SIM.60.06', 'SIM.40.00', 'SIM.40.11', 'SIM.00.01')
    $bigLanes = @{}
    foreach ($id in $bigIds) {
        $laneName = 'lane-bc-eff-big-' + ($id -replace '\.', '')
        $bigLanes[$id] = $laneName
        New-Lane $laneName ('{"lane":"' + $laneName + '","taskId":"' + $id + '","writer":"grok","effortClass":"mechanical"}')
    }

    . $lib
    Assert-Eq 'default worktree root' $PmWorktreeRoot 'C:\Users\snewt\.deus_worktrees'
    foreach ($id in $bigIds) { Assert-Eq "big task list $id" ($PmBigTasks -contains $id) $true }
    $PmWorktreeRoot = $root

    function Get-ParentRow($Case) {
        try {
            $spec = Get-PmTopModelSpec -Provider ([string]$Case.provider) -Effort ([string]$Case.effort) -TaskType ([string]$Case.taskType) -Model ([string]$Case.model) -Lane ([string]$Case.lane)
            $row = Get-SpecFields $spec
            $row | Add-Member -NotePropertyName name -NotePropertyValue ([string]$Case.name)
            return $row
        } catch {
            return [pscustomobject]@{
                name = [string]$Case.name; passed = $false; error = [string]$_.Exception.Message
                effort = ''; tier = ''; model = ''; family = ''; args = ''; exe = ''; js = ''
                multi = $false; fallback = $false; alllimited = $false; stdin = $false
            }
        }
    }
    function Invoke-Batch($LibPath, $CaseList) {
        $id = [guid]::NewGuid().ToString('n')
        $casesPath = Join-Path $temp "cases_$id.json"
        $outPath = Join-Path $temp "out_$id.json"
        $log = Join-Path $temp "child_$id.log"
        $payload = [pscustomobject]@{ cases = @($CaseList) }
        [System.IO.File]::WriteAllText($casesPath, ($payload | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding $false))
        & $pwsh -NoProfile -ExecutionPolicy Bypass -File $runner -Lib $LibPath -Root $root -Cases $casesPath -OutFile $outPath *> $log
        if ($LASTEXITCODE -ne 0) {
            $detail = ''
            if (Test-Path -LiteralPath $log) { $detail = [System.IO.File]::ReadAllText($log) }
            throw "child exit $LASTEXITCODE $detail"
        }
        if (-not (Test-Path -LiteralPath $outPath -PathType Leaf) -or (Get-Item -LiteralPath $outPath).Length -eq 0) {
            throw 'child result artifact missing or empty'
        }
        $parsed = Get-Content -LiteralPath $outPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $resultRows = @($parsed.rows)
        if ($resultRows.Count -ne @($CaseList).Count) { throw 'child result row count mismatch' }
        for ($rowIndex = 0; $rowIndex -lt $resultRows.Count; $rowIndex++) {
            if ($resultRows[$rowIndex].name -cne $CaseList[$rowIndex].name -or
                $resultRows[$rowIndex].passed -isnot [bool]) { throw 'child result identity/status missing or invalid' }
        }
        return $resultRows
    }
    function Assert-SameRow([string]$Name, $Parent, $Old) {
        if (-not $Parent.passed -or -not $Old.passed) {
            if ($Name -eq 'eq bad tasktype' -and -not $Parent.passed -and -not $Old.passed -and
                ([string]$Parent.error).Length -gt 0 -and ([string]$Parent.error) -ceq ([string]$Old.error)) {
                Assert-Eq $Name 'both-threw' 'both-threw'
                return
            }
            Assert-Eq $Name ("parentOk=$($Parent.passed) parentErr=$($Parent.error) oldOk=$($Old.passed) oldErr=$($Old.error)") 'both-ok-or-same-error'
            return
        }
        $fields = @('effort', 'tier', 'model', 'family', 'args', 'exe', 'js', 'multi', 'fallback', 'alllimited', 'stdin')
        $bad = @()
        foreach ($field in $fields) {
            if ([string]$Parent.$field -ne [string]$Old.$field) { $bad += ($field + ' parent=' + [string]$Parent.$field + ' old=' + [string]$Old.$field) }
        }
        if ($bad.Count -eq 0) { Assert-Eq $Name 'match' 'match' }
        else { Assert-Eq $Name ($bad -join '; ') 'match' }
    }
    function Assert-Grok([string]$Name, [string]$Effort, [string]$TaskType, [string]$Model, [string]$Lane, [string]$WantEffort, [string]$WantTier, [int]$WantMulti) {
        $spec = Get-PmTopModelSpec -Provider 'grok' -Effort $Effort -TaskType $TaskType -Model $Model -Lane $Lane
        Assert-Eq "$Name effort" $spec.Effort $WantEffort
        Assert-Eq "$Name tier" $spec.Tier $WantTier
        Assert-Eq "$Name multi" ([int][bool]$spec.MultiAgent) $WantMulti
        Assert-Eq "$Name family" $spec.Family 'grok'
        Assert-Eq "$Name args" $spec.Args "--always-approve --model $Model --reasoning-effort $WantEffort --prompt-file {promptFile}"
    }

    Assert-Grok 'rule grok mechanical high' 'high' '' 'grok-4.7' 'lane-bc-eff-mech' 'high' 'standard' 1
    Assert-Grok 'rule grok mechanical no effort' '' '' 'grok-4.7' 'lane-bc-eff-mech' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok mechanical medium' 'medium' '' 'grok-4.7' 'lane-bc-eff-mech' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok mechanical low' 'low' '' 'grok-4.7' 'lane-bc-eff-mech' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok mechanical xhigh' 'xhigh' '' 'grok-4.7' 'lane-bc-eff-mech' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok mechanical top' 'top' '' 'grok-4.7' 'lane-bc-eff-mech' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok mechanical HIGH' 'HIGH' '' 'grok-4.7' 'lane-bc-eff-mech' 'high' 'standard' 1
    Assert-Grok 'rule grok mechanical padded high' ' high ' '' 'grok-4.7' 'lane-bc-eff-mech' 'high' 'standard' 1
    Assert-Grok 'rule grok non-mechanical high' 'high' '' 'grok-4.7' 'lane-bc-eff-plain' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok simulation high' 'high' '' 'grok-4.7' 'lane-bc-eff-sim' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok mechanical-extra high' 'high' '' 'grok-4.7' 'lane-bc-eff-extra' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok Mechanical-dot high' 'high' '' 'grok-4.7' 'lane-bc-eff-dot' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok Mechanical-space high' 'high' '' 'grok-4.7' 'lane-bc-eff-space' 'high' 'standard' 1
    Assert-Grok 'rule grok trimmed mechanical high' 'high' '' 'grok-4.7' 'lane-bc-eff-trim' 'high' 'standard' 1
    Assert-Grok 'rule grok MECHANICAL high' 'high' '' 'grok-4.7' 'lane-bc-eff-upper' 'high' 'standard' 1
    Assert-Grok 'rule grok writer Grok padded high' 'high' '' 'grok-4.7' 'lane-bc-eff-pad' 'high' 'standard' 1
    Assert-Grok 'rule grok writer not grok high' 'high' '' 'grok-4.7' 'lane-bc-eff-notgrok' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok writer missing high' 'high' '' 'grok-4.7' 'lane-bc-eff-nowriter' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok writer model-name high' 'high' '' 'grok-4.7' 'lane-bc-eff-modelname' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok null effortClass high' 'high' '' 'grok-4.7' 'lane-bc-eff-nullclass' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok numeric effortClass high' 'high' '' 'grok-4.7' 'lane-bc-eff-numclass' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok malformed lane high' 'high' '' 'grok-4.7' 'lane-bc-eff-bad' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok empty lane.json high' 'high' '' 'grok-4.7' 'lane-bc-eff-empty' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok array lane.json high' 'high' '' 'grok-4.7' 'lane-bc-eff-array' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok missing lane high' 'high' '' 'grok-4.7' 'lane-bc-eff-missing' 'xhigh' 'standard' 1
    Assert-Grok 'rule grok bom big lane high' 'high' '' 'grok-4.7' 'lane-bc-eff-bom' 'xhigh' 'big' 1
    Assert-Grok 'rule grok bom standard lane high' 'high' '' 'grok-4.7' 'lane-bc-eff-bomstd' 'high' 'standard' 1
    Assert-Grok 'rule grok fallback model high' 'high' '' 'grok-4.6' 'lane-bc-eff-mech' 'high' 'standard' 1
    $fb = Get-PmTopModelSpec -Provider 'grok' -Effort 'high' -TaskType '' -Model 'grok-4.6' -Lane 'lane-bc-eff-mech'
    Assert-Eq 'rule grok fallback model IsFallback' ([int][bool]$fb.IsFallback) 1
    Assert-Grok 'rule grok mechanical routine high' 'high' 'routine' 'grok-4.7' 'lane-bc-eff-mech' 'high' 'standard' 0
    Assert-Grok 'rule grok mechanical routine no effort' '' 'routine' 'grok-4.7' 'lane-bc-eff-mech' 'xhigh' 'standard' 0
    Assert-Grok 'rule grok mechanical ordinary high' 'high' 'ordinary' 'grok-4.7' 'lane-bc-eff-mech' 'high' 'standard' 1
    Assert-Grok 'rule grok mechanical explicit standard high' 'high' 'standard' 'grok-4.7' 'lane-bc-eff-mech' 'high' 'standard' 1
    Assert-Grok 'rule grok mechanical explicit big high' 'high' 'big' 'grok-4.7' 'lane-bc-eff-mech' 'xhigh' 'big' 1
    Assert-Grok 'rule grok mechanical hard high' 'high' 'hard' 'grok-4.7' 'lane-bc-eff-mech' 'xhigh' 'big' 1
    foreach ($id in $bigIds) {
        Assert-Grok "rule grok big $id high" 'high' '' 'grok-4.7' $bigLanes[$id] 'xhigh' 'big' 1
    }
    # Explicit -TaskType standard wins over a big task id (existing Resolve-PmTier rule).
    Assert-Grok 'rule grok big id explicit standard high' 'high' 'standard' 'grok-4.7' $bigLanes['WG.00.17'] 'high' 'standard' 1

    $savedRoot = $PmWorktreeRoot
    $PmWorktreeRoot = 'C:\Users\snewt\.deus_worktrees'
    Assert-Grok 'rule default root misses temp lane' 'high' '' 'grok-4.7' 'lane-bc-eff-mech' 'xhigh' 'standard' 1
    $PmWorktreeRoot = $savedRoot

    $claude = Get-PmTopModelSpec -Provider 'claude' -Effort 'high' -TaskType 'standard' -Model 'claude-opus-5-5[1m]' -Lane 'lane-bc-eff-mech'
    Assert-Eq 'rule claude mechanical high effort' $claude.Effort 'high'
    Assert-Eq 'rule claude mechanical high tier' $claude.Tier 'standard'
    $claudeLow = Get-PmTopModelSpec -Provider 'claude' -Effort 'low' -TaskType 'standard' -Model 'claude-opus-5-5[1m]' -Lane 'lane-bc-eff-mech'
    Assert-Eq 'rule claude mechanical low effort' $claudeLow.Effort 'high'
    $claudeMax = Get-PmTopModelSpec -Provider 'claude' -Effort 'max' -TaskType 'standard' -Model 'claude-opus-5-5[1m]' -Lane 'lane-bc-eff-mech'
    Assert-Eq 'rule claude mechanical max effort' $claudeMax.Effort 'max'
    $codex = Get-PmTopModelSpec -Provider 'codex' -Effort 'high' -TaskType 'standard' -Model 'gpt-5.6-sol' -Lane 'lane-bc-eff-mech'
    Assert-Eq 'rule codex mechanical high effort' $codex.Effort 'xhigh'
    $gemini = Get-PmTopModelSpec -Provider 'gemini' -Effort 'high' -TaskType 'standard' -Model 'gemini-3.1-pro-preview' -Lane 'lane-bc-eff-mech'
    Assert-Eq 'rule gemini mechanical high effort' $gemini.Effort 'thinking HIGH'
    $fable = Get-PmTopModelSpec -Provider 'fable' -Effort 'high' -TaskType 'standard' -Model 'claude-fable-5-1' -Lane 'lane-bc-eff-mech'
    Assert-Eq 'rule fable mechanical high effort' $fable.Effort 'max'

    $same = New-Object System.Collections.Generic.List[object]
    $providers = @('claude', 'fable', 'codex', 'gemini', 'grok')
    $modelOf = @{
        claude = 'claude-opus-5-5[1m]'; fable = 'claude-fable-5-1'; codex = 'gpt-5.6-sol'
        gemini = 'gemini-3.1-pro-preview'; grok = 'grok-4.7'
    }
    $efforts = @('', 'low', 'medium', 'high', 'xhigh', 'max', 'top')
    foreach ($provider in $providers) {
        foreach ($tier in @('standard', 'big')) {
            $model = $modelOf[$provider]
            if ($provider -eq 'codex' -and $tier -eq 'big') { $model = 'gpt-6-astra' }
            foreach ($effort in $efforts) {
                $labelEffort = $effort
                if (-not $labelEffort) { $labelEffort = '(empty)' }
                $same.Add((New-Case "eq $provider $tier $labelEffort" $provider $effort $tier $model '')) | Out-Null
            }
        }
        $same.Add((New-Case "eq $provider nomodel" $provider '' 'standard' '' '')) | Out-Null
    }
    $same.Add((New-Case 'eq codex luna ultra' 'codex' 'ultra' 'standard' 'gpt-5.6-luna' '')) | Out-Null
    $same.Add((New-Case 'eq codex reserve ultra' 'codex' 'ultra' 'standard' 'gpt-5.6-reserve' '')) | Out-Null
    $same.Add((New-Case 'eq codex sol ultra' 'codex' 'ultra' 'standard' 'gpt-5.6-sol' '')) | Out-Null
    $same.Add((New-Case 'eq claude ultracode' 'claude' 'ultracode' 'standard' 'claude-opus-5-5[1m]' '')) | Out-Null
    $same.Add((New-Case 'eq fable ultracode' 'fable' 'ultracode' 'big' 'claude-fable-5-1' '')) | Out-Null
    $same.Add((New-Case 'eq grok routine empty' 'grok' '' 'routine' 'grok-4.7' '')) | Out-Null
    $same.Add((New-Case 'eq grok routine high no lane' 'grok' 'high' 'routine' 'grok-4.7' '')) | Out-Null
    $same.Add((New-Case 'eq claude hard low' 'claude' 'low' 'hard' 'claude-opus-5-5[1m]' '')) | Out-Null
    $same.Add((New-Case 'eq claude ordinary max' 'claude' 'max' 'ordinary' 'claude-opus-5-5[1m]' '')) | Out-Null
    $same.Add((New-Case 'eq bad tasktype' 'grok' 'high' 'weird' 'grok-4.7' '')) | Out-Null
    $same.Add((New-Case 'eq claude mech lane high' 'claude' 'high' 'standard' 'claude-opus-5-5[1m]' 'lane-bc-eff-mech')) | Out-Null
    $same.Add((New-Case 'eq claude mech lane max' 'claude' 'max' 'standard' 'claude-opus-5-5[1m]' 'lane-bc-eff-mech')) | Out-Null
    $same.Add((New-Case 'eq claude mech lane low' 'claude' 'low' 'standard' 'claude-opus-5-5[1m]' 'lane-bc-eff-mech')) | Out-Null
    $same.Add((New-Case 'eq codex mech lane high' 'codex' 'high' 'standard' 'gpt-5.6-sol' 'lane-bc-eff-mech')) | Out-Null
    $same.Add((New-Case 'eq gemini mech lane high' 'gemini' 'high' 'standard' 'gemini-3.1-pro-preview' 'lane-bc-eff-mech')) | Out-Null
    $same.Add((New-Case 'eq fable mech lane high' 'fable' 'high' 'standard' 'claude-fable-5-1' 'lane-bc-eff-mech')) | Out-Null
    $same.Add((New-Case 'eq grok mech medium' 'grok' 'medium' '' 'grok-4.7' 'lane-bc-eff-mech')) | Out-Null
    $same.Add((New-Case 'eq grok mech low' 'grok' 'low' '' 'grok-4.7' 'lane-bc-eff-mech')) | Out-Null
    $same.Add((New-Case 'eq grok mech empty' 'grok' '' '' 'grok-4.7' 'lane-bc-eff-mech')) | Out-Null
    $same.Add((New-Case 'eq grok mech xhigh' 'grok' 'xhigh' '' 'grok-4.7' 'lane-bc-eff-mech')) | Out-Null
    $same.Add((New-Case 'eq grok mech top' 'grok' 'top' '' 'grok-4.7' 'lane-bc-eff-mech')) | Out-Null
    $same.Add((New-Case 'eq grok plain high' 'grok' 'high' '' 'grok-4.7' 'lane-bc-eff-plain')) | Out-Null
    $same.Add((New-Case 'eq grok sim high' 'grok' 'high' '' 'grok-4.7' 'lane-bc-eff-sim')) | Out-Null
    $same.Add((New-Case 'eq grok notgrok high' 'grok' 'high' '' 'grok-4.7' 'lane-bc-eff-notgrok')) | Out-Null
    $same.Add((New-Case 'eq grok bad high' 'grok' 'high' '' 'grok-4.7' 'lane-bc-eff-bad')) | Out-Null
    $same.Add((New-Case 'eq grok nomodel empty lane' 'grok' '' 'standard' '' '')) | Out-Null

    $oldRows = Invoke-Batch $verbatim @($same.ToArray())
    $sameArr = @($same.ToArray())
    if ($oldRows.Count -ne $sameArr.Count) { throw "verbatim row count $($oldRows.Count) vs $($sameArr.Count)" }
    for ($i = 0; $i -lt $sameArr.Count; $i++) {
        Assert-SameRow $sameArr[$i].name (Get-ParentRow $sameArr[$i]) $oldRows[$i]
    }

    $cross = @(
        (New-Case 'cross mech high' 'grok' 'high' '' 'grok-4.7' 'lane-bc-eff-mech'),
        (New-Case 'cross mech nomodel high' 'grok' 'high' '' '' 'lane-bc-eff-mech'),
        (New-Case 'cross space high' 'grok' 'high' '' 'grok-4.7' 'lane-bc-eff-space'),
        (New-Case 'cross routine high' 'grok' 'high' 'routine' 'grok-4.7' 'lane-bc-eff-mech')
    )
    $crossOld = Invoke-Batch $verbatim $cross
    $crossWant = @('high', 'high', 'high', 'high')
    for ($i = 0; $i -lt $cross.Count; $i++) {
        $parent = Get-ParentRow $cross[$i]
        Assert-Eq "$($cross[$i].name) new effort" $parent.effort $crossWant[$i]
        Assert-Eq "$($cross[$i].name) verbatim effort" $crossOld[$i].effort 'xhigh'
        Assert-Eq "$($cross[$i].name) model" $parent.model $crossOld[$i].model
        Assert-Eq "$($cross[$i].name) tier" $parent.tier $crossOld[$i].tier
        Assert-Eq "$($cross[$i].name) passed" ([string]$parent.passed + '/' + [string]$crossOld[$i].passed) 'True/True'
    }

    function Copy-Mutant([string]$Name, [string]$OldText, [string]$NewText) {
        $src = [System.IO.File]::ReadAllText($lib)
        $count = ([regex]::Matches($src, [regex]::Escape($OldText))).Count
        if ($count -ne 1) { throw "mutant $Name anchor count $count" }
        $dest = Join-Path $temp "top_models.$Name.ps1"
        [System.IO.File]::WriteAllText($dest, $src.Replace($OldText, $NewText), (New-Object System.Text.UTF8Encoding $false))
        return $dest
    }
    $mutWriter = Copy-Mutant 'ignore_writer' "if (`$writer -ne 'grok') { return `$false }" 'if ($false) { return $false }'
    $mutTier = Copy-Mutant 'ignore_tier' "if (`$Tier -ne 'standard') { return `$false }" 'if ($false) { return $false }'
    $mutClass = Copy-Mutant 'ignore_effortclass' "if (`$cls -ne 'mechanical') { return `$false }" 'if ($false) { return $false }'
    $mutBad = Copy-Mutant 'treat_malformed' 'if (-not $cfg) { return $false }' 'if (-not $cfg) { return $true }'
    $mutMed = Copy-Mutant 'allow_medium' "if (`$Provider -eq 'grok' -and `$explicit -eq 'high' -and (Test-PmHonourGrokHigh `$Tier `$Lane)) { `$raiseTo = `$explicit }" "if (`$Provider -eq 'grok' -and (`$explicit -eq 'high' -or `$explicit -eq 'medium') -and (Test-PmHonourGrokHigh `$Tier `$Lane)) { `$raiseTo = `$explicit }"

    function Assert-Mutant([string]$Label, [string]$MutLib, $Case, [string]$WantMutant, [string]$WantReal) {
        $mutRows = Invoke-Batch $MutLib @($Case)
        $real = Get-ParentRow $Case
        $mutEffort = [string]$mutRows[0].effort
        $realEffort = [string]$real.effort
        if ($mutRows[0].passed -and $real.passed -and $mutEffort -eq $WantMutant -and $realEffort -eq $WantReal) {
            if ($WantMutant -eq $WantReal) { Assert-Eq $Label 'held' 'held' }
            else { Assert-Eq $Label 'killed' 'killed' }
        } else {
            Assert-Eq $Label "mutant=$mutEffort mutErr=$($mutRows[0].error) real=$realEffort realErr=$($real.error)" "mutant=$WantMutant real=$WantReal"
        }
    }
    Assert-Mutant 'mutant ignore_writer killed' $mutWriter (New-Case 'm' 'grok' 'high' '' 'grok-4.7' 'lane-bc-eff-notgrok') 'high' 'xhigh'
    Assert-Mutant 'mutant ignore_writer still honours grok writer' $mutWriter (New-Case 'm' 'grok' 'high' '' 'grok-4.7' 'lane-bc-eff-mech') 'high' 'high'
    Assert-Mutant 'mutant ignore_tier killed' $mutTier (New-Case 'm' 'grok' 'high' '' 'grok-4.7' $bigLanes['WG.00.17']) 'high' 'xhigh'
    Assert-Mutant 'mutant ignore_tier still honours standard' $mutTier (New-Case 'm' 'grok' 'high' '' 'grok-4.7' 'lane-bc-eff-mech') 'high' 'high'
    Assert-Mutant 'mutant ignore_effortclass killed' $mutClass (New-Case 'm' 'grok' 'high' '' 'grok-4.7' 'lane-bc-eff-sim') 'high' 'xhigh'
    Assert-Mutant 'mutant ignore_effortclass still raises medium' $mutClass (New-Case 'm' 'grok' 'medium' '' 'grok-4.7' 'lane-bc-eff-sim') 'xhigh' 'xhigh'
    Assert-Mutant 'mutant treat_malformed killed' $mutBad (New-Case 'm' 'grok' 'high' '' 'grok-4.7' 'lane-bc-eff-bad') 'high' 'xhigh'
    Assert-Mutant 'mutant treat_malformed missing lane killed' $mutBad (New-Case 'm' 'grok' 'high' '' 'grok-4.7' 'lane-bc-eff-missing') 'high' 'xhigh'
    Assert-Mutant 'mutant treat_malformed still honours real lane' $mutBad (New-Case 'm' 'grok' 'high' '' 'grok-4.7' 'lane-bc-eff-mech') 'high' 'high'
    Assert-Mutant 'mutant allow_medium killed' $mutMed (New-Case 'm' 'grok' 'medium' '' 'grok-4.7' 'lane-bc-eff-mech') 'medium' 'xhigh'
    Assert-Mutant 'mutant allow_medium still raises low' $mutMed (New-Case 'm' 'grok' 'low' '' 'grok-4.7' 'lane-bc-eff-mech') 'xhigh' 'xhigh'
    Assert-Mutant 'mutant allow_medium still honours high' $mutMed (New-Case 'm' 'grok' 'high' '' 'grok-4.7' 'lane-bc-eff-mech') 'high' 'high'
}
catch {
    Write-Output ("FAIL setup " + (([string]$_.Exception.Message) -replace '[\r\n]+', ' '))
    $script:failCount++
}
finally {
    if ($temp -and (Test-Path -LiteralPath $temp)) {
        # Keep the unique run directory as evidence; this lane never deletes files.
        Write-Output "Evidence directory: $temp"
    }
}
$code = 0
if ($script:failCount -gt 0) { $code = 1 }
Write-Output "EXIT $code"
exit $code
