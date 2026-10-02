<#
.SYNOPSIS
    Open one lane worktree from origin/main (OPS.FLOW.CUT, DEC-087).

.DESCRIPTION
    Refuses when the branch or worktree already exists, the brief is empty, the writer and reviewer
    share a family, or the manifest fails merge_gate.validateManifest. Cuts <WorktreeRoot>/<lane>
    on task/<lane> from origin/main, writes BRIEF.md and lane.json, commits as deus-pm, and pushes
    task/<lane>. With -Launch, starts launch_worker.ps1 for the writer.

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/open_lane.ps1 `
        -Lane lane-ol -Task OPS.FLOW.CUT -Writer grok -Reviewer codex -BriefFile C:\brief.md
#>
[CmdletBinding()]
param(
    [string]$Lane,
    [string]$Task,
    [string]$Writer,
    [string]$Reviewer,
    [string]$BriefFile,
    [string]$ManifestFile,
    [switch]$Launch,
    [string]$WorktreeRoot = (Join-Path $env:USERPROFILE '.deus_worktrees')
)

$ErrorActionPreference = 'Continue'

function Stop-OpenLane([string]$Reason) {
    [Console]::Error.WriteLine("open_lane: REFUSED: $Reason")
    exit 1
}

# Same families as tools/governance/merge_gate.js. pm is not a family.
function Get-OpenLaneFamily([string]$Agent) {
    switch -regex ("$Agent".ToLowerInvariant()) {
        '^(claude|fable)$' { return 'claude' }
        '^(gemini|antigravity)$' { return 'gemini' }
        '^grok$' { return 'grok' }
        '^codex$' { return 'codex' }
    }
    return $null
}

if (-not $Lane -or $Lane -notmatch '^[A-Za-z0-9._-]+$') { Stop-OpenLane '-Lane is required (letters, digits, . _ -)' }
if (-not $Task -or $Task -notmatch '^[A-Za-z0-9._-]+$') { Stop-OpenLane '-Task is required (letters, digits, . _ -)' }
if (-not $Writer) { Stop-OpenLane 'missing -Writer' }
if (-not $Reviewer) { Stop-OpenLane 'missing -Reviewer' }
if (-not $BriefFile) { Stop-OpenLane 'missing -BriefFile' }
$writerFam = Get-OpenLaneFamily $Writer
$reviewerFam = Get-OpenLaneFamily $Reviewer
if (-not $writerFam -or -not $reviewerFam) { Stop-OpenLane "writer '$Writer' and reviewer '$Reviewer' must be known agents (claude, fable, gemini, antigravity, grok, codex)" }
if ($writerFam -eq $reviewerFam) { Stop-OpenLane "writer $Writer and reviewer $Reviewer share a family ($writerFam); claude and fable are one family, as are gemini and antigravity" }

if (-not (Test-Path -LiteralPath $BriefFile -PathType Leaf)) { Stop-OpenLane "brief not found: $BriefFile" }
$briefText = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $BriefFile).ProviderPath, [Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
if (-not $briefText.Trim()) { Stop-OpenLane "brief is empty: $BriefFile" }
$heading = $null
foreach ($line in ($briefText -split '\r?\n')) {
    if ($line -match '^#') { $heading = $line; break }
}
if (-not $heading) { Stop-OpenLane 'brief has no heading' }
$title = ([regex]::Replace($heading, '^#\s*lane-[A-Za-z0-9._-]*:\s*', '')).Trim()
if (-not $title -or $title.StartsWith('#')) { Stop-OpenLane "brief heading has no title after the '# lane-..: ' prefix: $heading" }

$repo = (& git rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $repo) { Stop-OpenLane 'not inside a git work tree (run open_lane from the repository)' }
$repo = $repo.Trim()
$gateJs = Join-Path $repo 'tools\governance\merge_gate.js'
if (-not (Test-Path -LiteralPath $gateJs -PathType Leaf)) { Stop-OpenLane "merge_gate.js not found: $gateJs" }

$branch = "task/$Lane"
$localRef = (& git -C $repo rev-parse --verify --quiet "refs/heads/$branch" 2>$null)
if ($LASTEXITCODE -eq 0 -and $localRef) { Stop-OpenLane "branch $branch already exists" }
$remoteListed = (& git -C $repo ls-remote --heads origin $branch 2>$null)
if ($LASTEXITCODE -eq 0 -and "$remoteListed".Trim()) { Stop-OpenLane "branch $branch already exists on origin" }
$wt = Join-Path $WorktreeRoot $Lane
if (Test-Path -LiteralPath $wt) { Stop-OpenLane "worktree $wt already exists" }

$scratch = Join-Path ([IO.Path]::GetTempPath()) ("deus_open_lane_{0}_{1}" -f $PID, (Get-Random -Maximum 99999))
New-Item -ItemType Directory -Force -Path $scratch | Out-Null
$helper = Join-Path $scratch 'manifest.js'
$reqPath = Join-Path $scratch 'request.json'
$outManifest = Join-Path $scratch 'lane.json'
$utf8 = New-Object Text.UTF8Encoding $false
[IO.File]::WriteAllText($helper, @'
"use strict";
const fs = require("fs");
const gate = require(process.argv[2]);
const req = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

function fence(text) {
    const mark = text.search(/```json[ \t]*\r?\n/);
    if (mark < 0) return null;
    const from = text.indexOf("{", mark);
    if (from < 0) return null;
    let depth = 0, inStr = false, esc = false;
    for (let i = from; i < text.length; i++) {
        const c = text[i];
        if (inStr) {
            if (esc) esc = false;
            else if (c === "\\") esc = true;
            else if (c === '"') inStr = false;
            continue;
        }
        if (c === '"') inStr = true;
        else if (c === "{") depth++;
        else if (c === "}") {
            depth--;
            if (depth === 0) return text.slice(from, i + 1);
        }
    }
    return null;
}

let manifest;
if (req.mode === "build") {
    const block = fence(req.brief);
    if (!block) { console.error("brief has no ```json manifest block"); process.exit(1); }
    let parsed;
    try { parsed = JSON.parse(block); }
    catch (e) { console.error("brief json block: " + e.message); process.exit(1); }
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.allowedPaths) || !Array.isArray(parsed.gateTests)) {
        console.error("brief json block needs allowedPaths and gateTests arrays");
        process.exit(1);
    }
    manifest = {
        lane: req.lane, taskId: req.task, branch: "task/" + req.lane,
        writer: req.writer, reviewer: req.reviewer, push: true,
        allowedPaths: parsed.allowedPaths, gateTests: parsed.gateTests
    };
    if (parsed.hotfix === true) manifest.hotfix = true;
} else {
    try { manifest = JSON.parse(fs.readFileSync(req.manifestFile, "utf8")); }
    catch (e) { console.error("manifest file: " + e.message); process.exit(1); }
    const want = { lane: req.lane, taskId: req.task, branch: "task/" + req.lane, writer: req.writer, reviewer: req.reviewer };
    for (const k of Object.keys(want)) {
        if (manifest[k] !== want[k]) {
            console.error(k + " is " + JSON.stringify(manifest[k]) + ", expected " + JSON.stringify(want[k]));
            process.exit(1);
        }
    }
}
const errs = gate.validateManifest(manifest);
if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
fs.writeFileSync(req.out, JSON.stringify(manifest, null, 2) + "\n");
'@, $utf8)

$req = [ordered]@{
    mode = $(if ($ManifestFile) { 'check' } else { 'build' })
    brief = $briefText
    manifestFile = $ManifestFile
    lane = $Lane
    task = $Task
    writer = $Writer.ToLowerInvariant()
    reviewer = $Reviewer.ToLowerInvariant()
    out = $outManifest
}
[IO.File]::WriteAllText($reqPath, (($req | ConvertTo-Json -Compress -Depth 20)), $utf8)
& node $helper $gateJs $reqPath 2>&1 | ForEach-Object { $script:manifestErr = @($script:manifestErr) + "$_" }
if ($LASTEXITCODE -ne 0) {
    Remove-Item -LiteralPath $scratch -Recurse -Force -ErrorAction SilentlyContinue
    Stop-OpenLane ("manifest refused: " + (($script:manifestErr | Where-Object { $_ }) -join '; '))
}

if (-not (Test-Path -LiteralPath $WorktreeRoot)) { New-Item -ItemType Directory -Force -Path $WorktreeRoot | Out-Null }
& git -C $repo fetch --quiet origin
if ($LASTEXITCODE -ne 0) {
    Remove-Item -LiteralPath $scratch -Recurse -Force -ErrorAction SilentlyContinue
    Stop-OpenLane 'git fetch origin failed'
}
$remoteAgain = (& git -C $repo ls-remote --heads origin $branch 2>$null)
if ($LASTEXITCODE -eq 0 -and "$remoteAgain".Trim()) {
    Remove-Item -LiteralPath $scratch -Recurse -Force -ErrorAction SilentlyContinue
    Stop-OpenLane "branch $branch already exists on origin"
}
& git -C $repo worktree add -q -b $branch $wt 'origin/main'
if ($LASTEXITCODE -ne 0) {
    Remove-Item -LiteralPath $scratch -Recurse -Force -ErrorAction SilentlyContinue
    Stop-OpenLane "git worktree add failed for $wt"
}

function Undo-OpenLaneWorktree {
    if (Test-Path -LiteralPath $wt) { & git -C $repo worktree remove --force $wt 2>$null | Out-Null }
    & git -C $repo branch -D $branch 2>$null | Out-Null
}

try {
    $relDir = "tasks/$Task/$Lane"
    $destDir = Join-Path $wt ($relDir.Replace('/', '\'))
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    [IO.File]::WriteAllText((Join-Path $destDir 'BRIEF.md'), $briefText, $utf8)
    [IO.File]::Copy($outManifest, (Join-Path $destDir 'lane.json'), $true)
    & git -C $wt add -- "$relDir/BRIEF.md" "$relDir/lane.json"
    if ($LASTEXITCODE -ne 0) { Undo-OpenLaneWorktree; Stop-OpenLane 'git add of BRIEF.md and lane.json failed' }
    $subject = "[pm] Open $Lane ($Task, writer $($Writer.ToLowerInvariant())): $title"
    $identity = @('GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL')
    $savedId = @{}
    foreach ($k in $identity) {
        $savedId[$k] = [Environment]::GetEnvironmentVariable($k)
        [Environment]::SetEnvironmentVariable($k, $null)
    }
    try {
        # Ambient GIT_AUTHOR_* overrides -c, so those variables are cleared for this command only.
        & git -C $wt -c user.name=deus-pm -c user.email=deus-pm@local.invalid commit -q -m $subject -- "$relDir/BRIEF.md" "$relDir/lane.json"
        $commitCode = $LASTEXITCODE
    } finally {
        foreach ($k in $identity) { [Environment]::SetEnvironmentVariable($k, $savedId[$k]) }
    }
    if ($commitCode -ne 0) { Undo-OpenLaneWorktree; Stop-OpenLane "git commit failed (exit $commitCode)" }
    & git -C $wt push -q origin $branch
    if ($LASTEXITCODE -ne 0) { Undo-OpenLaneWorktree; Stop-OpenLane "git push origin $branch failed" }
} finally {
    Remove-Item -LiteralPath $scratch -Recurse -Force -ErrorAction SilentlyContinue
}

if ($Launch) {
    $launcher = Join-Path $repo 'tools\ops\launch_worker.ps1'
    if (-not (Test-Path -LiteralPath $launcher -PathType Leaf)) { Stop-OpenLane "launch_worker.ps1 not found: $launcher" }
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher -Lane $Lane -Provider $Writer.ToLowerInvariant() -Role writer -BriefPath "$relDir/BRIEF.md" -Worktree $wt -WorktreeRoot $WorktreeRoot -TimeoutMinutes 240
    exit $LASTEXITCODE
}
exit 0
