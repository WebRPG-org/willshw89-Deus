<#
.SYNOPSIS
    Tests for tools/ops/open_lane.ps1 (OPS.FLOW.CUT, DEC-087).

.DESCRIPTION
    Builds a throwaway bare origin and a main clone, then runs open_lane.ps1 out of process.
    Git config is isolated with GIT_CONFIG_GLOBAL / GIT_CONFIG_NOSYSTEM.

      -Only <name>[,<name>]   run only these tests
      -List                   list the test names
      -Mutants                mutation sweep
      -OpsDir / -RepoRoot     test another copy of tools/ops (used by -Mutants)
      -KeepTemp               keep the temp folder

    Exit: 0 all checks passed (or all mutants caught); 1 a check failed (or a mutant survived).
#>
[CmdletBinding()]
param(
    [string[]]$Only,
    [switch]$List,
    [switch]$Mutants,
    [string]$OpsDir,
    [string]$RepoRoot,
    [switch]$KeepTemp
)

$ErrorActionPreference = 'Continue'
if (-not $OpsDir) { $OpsDir = $PSScriptRoot }
if (-not $RepoRoot) { $RepoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')) }
$OpsDir = [IO.Path]::GetFullPath($OpsDir)
$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
$PsExe = Join-Path $PSHOME 'powershell.exe'
$Node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $Node) { $Node = 'node' }

function ConvertTo-Arg([string]$Value) {
    if ($Value -ne '' -and $Value -notmatch '[\s"]') { return $Value }
    $s = [regex]::Replace($Value, '(\\*)"', '$1$1\"')
    $s = [regex]::Replace($s, '(\\+)$', '$1$1')
    return '"' + $s + '"'
}

function Initialize-TestHarness([string]$Prefix) {
    $script:Checks = 0
    $script:Failures = New-Object System.Collections.Generic.List[string]
    $script:CurrentTest = ''
    $root = Join-Path ([IO.Path]::GetTempPath()) ("{0}_{1}_{2}" -f $Prefix, $PID, (Get-Random -Maximum 99999))
    if ($root -match '\s') { throw "temp path has spaces ($root); open_lane argument quoting assumes it does not" }
    New-Item -ItemType Directory -Force -Path $root | Out-Null
    $script:TestRoot = $root
    $script:SavedEnv = @{}
    $cleared = @('DEUS_INTEGRATOR', 'GIT_AUTHOR_NAME', 'GIT_COMMITTER_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_EMAIL')
    foreach ($k in @('GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM', 'USERPROFILE') + $cleared) { $script:SavedEnv[$k] = [Environment]::GetEnvironmentVariable($k) }
    $gc = Join-Path $root 'gitconfig_global'
    [IO.File]::WriteAllText($gc, "[user]`n`tname = deus-test`n`temail = deus-test@example.invalid`n[init]`n`tdefaultBranch = main`n[core]`n`tautocrlf = false`n")
    $env:GIT_CONFIG_GLOBAL = $gc
    $env:GIT_CONFIG_NOSYSTEM = '1'
    $env:USERPROFILE = Join-Path $root 'profile'
    foreach ($k in $cleared) { [Environment]::SetEnvironmentVariable($k, $null) }
    return $root
}

function Complete-TestHarness([switch]$Keep) {
    $leftover = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($script:TestRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and $_.ProcessId -ne $PID })
    foreach ($p in $leftover) { & taskkill.exe /PID $p.ProcessId /T /F 2>&1 | Out-Null }
    foreach ($k in $script:SavedEnv.Keys) { [Environment]::SetEnvironmentVariable($k, $script:SavedEnv[$k]) }
    if (-not $Keep) {
        Start-Sleep -Milliseconds 200
        Remove-Item -LiteralPath $script:TestRoot -Recurse -Force -ErrorAction SilentlyContinue
    } else { Write-Host "temp kept: $($script:TestRoot)" }
    return $leftover.Count
}

function Check([string]$Name, $Condition, [string]$Detail = '') {
    $script:Checks++
    if ($Condition) { Write-Host "  PASS $Name" }
    else {
        Write-Host "  FAIL $Name$(if ($Detail) { " -- $Detail" })"
        $script:Failures.Add("$($script:CurrentTest)/$Name")
    }
}

function Invoke-Proc {
    param([string]$Exe, [string[]]$Argv, [string]$Cwd, [int]$TimeoutSeconds = 180)
    $psi = New-Object Diagnostics.ProcessStartInfo
    $psi.FileName = $Exe
    $psi.Arguments = (($Argv | ForEach-Object { ConvertTo-Arg ([string]$_) }) -join ' ')
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.WorkingDirectory = $Cwd
    $p = [Diagnostics.Process]::Start($psi)
    $so = $p.StandardOutput.ReadToEndAsync()
    $se = $p.StandardError.ReadToEndAsync()
    if (-not $p.WaitForExit($TimeoutSeconds * 1000)) { & taskkill.exe /PID $p.Id /T /F 2>&1 | Out-Null; [void]$p.WaitForExit(10000) }
    [void]$so.Wait(10000); [void]$se.Wait(10000)
    return @{ Code = $p.ExitCode; Out = $so.Result; Err = $se.Result }
}

function G([string]$Dir) {
    $out = & git -C $Dir @args 2>$null
    return ((@($out) -join "`n").Trim())
}

function New-FixtureRepo([string]$Root) {
    $origin = Join-Path $Root 'origin.git'
    $main = Join-Path $Root 'main'
    & git init -q --bare -b main $origin 2>$null | Out-Null
    & git init -q -b main $main 2>$null | Out-Null
    & git -C $main remote add origin $origin 2>$null | Out-Null
    $gateSrc = Join-Path $RepoRoot 'tools\governance\merge_gate.js'
    $gateDest = Join-Path $main 'tools\governance\merge_gate.js'
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $gateDest) | Out-Null
    [IO.File]::Copy($gateSrc, $gateDest, $true)
    [IO.File]::WriteAllText((Join-Path $main 'README.md'), "test repo`n")
    & git -C $main add -A 2>$null | Out-Null
    & git -C $main commit -q -m 'fixture' 2>$null | Out-Null
    & git -C $main push -q -u origin main 2>$null | Out-Null
    return @{ Origin = $origin; Main = $main; WtRoot = (Join-Path $Root 'worktrees') }
}

function New-Brief([string]$Name, [string]$Lane, [string]$Task, [string]$Writer, [string]$Reviewer, [string]$JsonBody) {
    $path = Join-Path $script:TestRoot $Name
    $text = "# ${Lane}: open the lane from one command (DEC-087)`n`n" + "``````json`n" + $JsonBody.Trim() + "`n``````n"
    [IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding $false))
    return $path
}

function Invoke-OpenLane($Fx, [hashtable]$Params) {
    $argv = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $OpsDir 'open_lane.ps1'))
    foreach ($k in $Params.Keys) { $argv += "-$k"; $argv += [string]$Params[$k] }
    $argv += '-WorktreeRoot'; $argv += $Fx.WtRoot
    return Invoke-Proc -Exe $PsExe -Argv $argv -Cwd $Fx.Main
}

$GoodJson = @'
{
  "lane": "ignored-by-opener",
  "taskId": "IGNORED",
  "branch": "task/ignored",
  "writer": "ignored",
  "reviewer": "ignored",
  "allowedPaths": ["tools/ops/open_lane.ps1", "tasks/T.01/lane-ol/**"],
  "gateTests": [{ "cmd": "node", "args": ["tools/ops/test_open_lane.ps1"], "timeoutSec": 60 }]
}
'@

$Tests = @(
    @{ Name = 'open_lane_commits_as_pm'; Body = {
        $brief = New-Brief 'brief-ol.md' 'lane-ol' 'T.01' 'grok' 'codex' $GoodJson
        $r = Invoke-OpenLane $Fx -Params @{ Lane = 'lane-ol'; Task = 'T.01'; Writer = 'grok'; Reviewer = 'codex'; BriefFile = $brief }
        Check 'exit_0' ($r.Code -eq 0) "exit $($r.Code) stderr $($r.Err) stdout $($r.Out)"
        $wt = Join-Path $Fx.WtRoot 'lane-ol'
        Check 'worktree_exists' (Test-Path -LiteralPath (Join-Path $wt 'tasks\T.01\lane-ol\BRIEF.md'))
        Check 'author' ((G $wt log -1 --format=%an) -eq 'deus-pm') (G $wt log -1 --format=%an)
        Check 'email' ((G $wt log -1 --format=%ae) -eq 'deus-pm@local.invalid') (G $wt log -1 --format=%ae)
        $subject = G $wt log -1 --format=%s
        Check 'subject' ($subject -ceq '[pm] Open lane-ol (T.01, writer grok): open the lane from one command (DEC-087)') $subject
        $files = @(G $wt diff-tree --no-commit-id --name-only -r HEAD) -split "`n"
        Check 'files' (($files -contains 'tasks/T.01/lane-ol/BRIEF.md') -and ($files -contains 'tasks/T.01/lane-ol/lane.json') -and $files.Count -eq 2) ($files -join ', ')
        $lane = Get-Content -Raw -LiteralPath (Join-Path $wt 'tasks\T.01\lane-ol\lane.json') | ConvertFrom-Json
        Check 'push_true' ($lane.push -eq $true) (Get-Content -Raw -LiteralPath (Join-Path $wt 'tasks\T.01\lane-ol\lane.json'))
        Check 'identity' ($lane.lane -eq 'lane-ol' -and $lane.taskId -eq 'T.01' -and $lane.branch -eq 'task/lane-ol' -and $lane.writer -eq 'grok' -and $lane.reviewer -eq 'codex')
        $head = G $wt rev-parse HEAD
        $remote = G $Fx.Main ls-remote origin 'refs/heads/task/lane-ol'
        Check 'pushed' ($remote.StartsWith($head)) $remote
    } }
    @{ Name = 'open_lane_refuses_duplicate'; Body = {
        $brief = New-Brief 'brief-dup.md' 'lane-dup' 'T.01' 'grok' 'codex' ($GoodJson.Replace('lane-ol', 'lane-dup'))
        $first = Invoke-OpenLane $Fx -Params @{ Lane = 'lane-dup'; Task = 'T.01'; Writer = 'grok'; Reviewer = 'codex'; BriefFile = $brief }
        Check 'first_exit_0' ($first.Code -eq 0) "exit $($first.Code) $($first.Err)"
        $second = Invoke-OpenLane $Fx -Params @{ Lane = 'lane-dup'; Task = 'T.01'; Writer = 'grok'; Reviewer = 'codex'; BriefFile = $brief }
        Check 'exit_1' ($second.Code -eq 1) "exit $($second.Code) $($second.Err)"
        Check 'says_exists' ($second.Err -match 'already exists') $second.Err
    } }
    @{ Name = 'open_lane_refuses_empty_brief'; Body = {
        $empty = Join-Path $script:TestRoot 'empty.md'
        [IO.File]::WriteAllText($empty, "   `n")
        $r = Invoke-OpenLane $Fx -Params @{ Lane = 'lane-empty'; Task = 'T.01'; Writer = 'grok'; Reviewer = 'codex'; BriefFile = $empty }
        Check 'exit_1' ($r.Code -eq 1) "exit $($r.Code) $($r.Err)"
        Check 'says_empty' ($r.Err -match 'empty') $r.Err
        Check 'no_worktree' (-not (Test-Path -LiteralPath (Join-Path $Fx.WtRoot 'lane-empty')))
    } }
    @{ Name = 'open_lane_refuses_same_family'; Body = {
        $brief = New-Brief 'brief-fam.md' 'lane-fam' 'T.01' 'claude' 'fable' ($GoodJson.Replace('lane-ol', 'lane-fam'))
        $r = Invoke-OpenLane $Fx -Params @{ Lane = 'lane-fam'; Task = 'T.01'; Writer = 'claude'; Reviewer = 'fable'; BriefFile = $brief }
        Check 'exit_1' ($r.Code -eq 1) "exit $($r.Code) $($r.Err)"
        Check 'says_family' ($r.Err -match 'family') $r.Err
        Check 'no_worktree' (-not (Test-Path -LiteralPath (Join-Path $Fx.WtRoot 'lane-fam')))
    } }
    @{ Name = 'open_lane_refuses_bad_manifest'; Body = {
        $bad = @'
{
  "allowedPaths": [],
  "gateTests": [{ "cmd": "node", "args": ["x"], "timeoutSec": 0 }]
}
'@
        $brief = New-Brief 'brief-bad.md' 'lane-bad' 'T.01' 'grok' 'codex' $bad
        $r = Invoke-OpenLane $Fx -Params @{ Lane = 'lane-bad'; Task = 'T.01'; Writer = 'grok'; Reviewer = 'codex'; BriefFile = $brief }
        Check 'exit_1' ($r.Code -eq 1) "exit $($r.Code) $($r.Err)"
        Check 'says_manifest' ($r.Err -match 'timeoutSec|allowedPaths') $r.Err
        Check 'no_worktree' (-not (Test-Path -LiteralPath (Join-Path $Fx.WtRoot 'lane-bad')))
    } }
)

function Invoke-TestList($TestsToRun, [string[]]$OnlyNames) {
    $names = @($OnlyNames | ForEach-Object { "$_".Split(',') } | Where-Object { $_ } | ForEach-Object { $_.Trim() })
    foreach ($n in $names) { if (-not ($TestsToRun | Where-Object { $_.Name -eq $n })) { Check "known_test_$n" $false "no test named $n" } }
    foreach ($t in $TestsToRun) {
        if ($names -and $names -notcontains $t.Name) { continue }
        $script:CurrentTest = $t.Name
        Write-Host "TEST $($t.Name)"
        try { & $t.Body } catch { Check 'no_exception' $false "$($_.Exception.Message)" }
    }
}

function Write-TestSummary([int]$Leftover) {
    $script:CurrentTest = 'cleanup'
    Check 'no_leftover_processes' ($Leftover -eq 0) "$Leftover test processes were still running"
    if ($script:Failures.Count -eq 0) {
        Write-Host "RESULT: PASS ($($script:Checks) checks, 0 failed)"
        return 0
    }
    Write-Host "RESULT: FAIL ($($script:Failures.Count) of $($script:Checks) checks failed: $($script:Failures -join ', '))"
    return 1
}

function Invoke-MutantSweep($Defs) {
    $caught = 0
    $bad = @()
    foreach ($m in $Defs) {
        $dir = Join-Path ([IO.Path]::GetTempPath()) ("deus_ops_mut_{0}_{1}" -f $PID, $m.Name)
        Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        Get-ChildItem -LiteralPath $OpsDir -File | Copy-Item -Destination $dir
        $file = Join-Path $dir $m.File
        $text = [IO.File]::ReadAllText($file)
        $find = $m.Find
        $replace = $m.Replace
        if ($text.Contains("`r`n")) { $find = $find.Replace("`n", "`r`n"); $replace = $replace.Replace("`n", "`r`n") }
        $n = ([regex]::Matches($text, [regex]::Escape($find))).Count
        if ($n -ne 1) {
            Write-Host "MUTANT $($m.Name): SETUP-ERROR (the text to replace occurs $n times, expected 1)"
            $bad += $m.Name
            Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
            continue
        }
        [IO.File]::WriteAllText($file, $text.Replace($find, $replace), (New-Object Text.UTF8Encoding $false))
        $r = Invoke-Proc -Exe $PsExe -Argv @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $dir 'test_open_lane.ps1'), '-OpsDir', $dir, '-RepoRoot', $RepoRoot, '-Only', $m.Tests) -Cwd (Get-Location).Path -TimeoutSeconds 300
        $fails = @(($r.Out -split "`r?`n") | Where-Object { $_ -match '^\s+FAIL ' })
        if ($r.Code -eq 1 -and $fails.Count -gt 0) {
            $caught++
            Write-Host ("MUTANT {0}: CAUGHT (exit 1; {1})" -f $m.Name, (($fails | Select-Object -First 4) -join '; '))
        } else {
            $bad += $m.Name
            Write-Host "MUTANT $($m.Name): SURVIVED (exit $($r.Code))"
            Write-Host (($r.Out -split "`r?`n" | Select-Object -Last 8) -join "`n")
            if ($r.Err) { Write-Host $r.Err }
        }
        Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Host "MUTANTS: $caught/$($Defs.Count) caught$(if ($bad) { "; not caught: $($bad -join ', ')" })"
    if ($bad) { return 1 }
    return 0
}

$MutantDefs = @(
    @{ Name = 'open_lane_wrong_author'; File = 'open_lane.ps1'; Tests = 'open_lane_commits_as_pm'
       Find = 'user.name=deus-pm'; Replace = 'user.name=deus-wrong' }
)

if ($MyInvocation.InvocationName -eq '.') { return }
if ($List) { $Tests | ForEach-Object { $_.Name }; exit 0 }
if ($Mutants) {
    $script:TestRoot = (Get-Location).Path
    $names = @($Only | ForEach-Object { ([string]$_).Split(',') } | Where-Object { $_ })
    # A one-element Object[] of hashtables is enumerated by @(), so collect into a list.
    $selected = New-Object System.Collections.Generic.List[object]
    foreach ($m in $MutantDefs) {
        if ($names.Count -eq 0 -or ($names -contains $m.Name)) { $selected.Add($m) }
    }
    exit (Invoke-MutantSweep $selected)
}

$TestRoot = Initialize-TestHarness 'deus_ol_test'
Write-Host "test_open_lane: ops $OpsDir; temp $TestRoot"
$Fx = New-FixtureRepo $TestRoot
$leftover = 0
try {
    Invoke-TestList $Tests $Only
} finally {
    $leftover = Complete-TestHarness -Keep:$KeepTemp
}
exit (Write-TestSummary $leftover)
