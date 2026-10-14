param([string]$OutputDirectory = 'artifacts/baseline-review')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$targetDirectory = [IO.Path]::GetFullPath((Join-Path $projectRoot $OutputDirectory))
if (-not $targetDirectory.StartsWith($projectRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Inventory output must stay inside this repository.' }
New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
$tracked = @(& git -C $projectRoot -c core.quotepath=false diff --name-only HEAD)
if ($LASTEXITCODE -ne 0) { throw 'Tracked inventory failed.' }
$untracked = @(& git -C $projectRoot -c core.quotepath=false ls-files --others --exclude-standard)
if ($LASTEXITCODE -ne 0) { throw 'Untracked inventory failed.' }
$rows = foreach ($relative in @($tracked + $untracked | Sort-Object -Unique)) {
    $fullPath = Join-Path $projectRoot $relative
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) { continue }
    $file = Get-Item -LiteralPath $fullPath
    $group = 'Product software baseline'
    $disposition = 'Review and commit source'
    if ($relative -match '^(\.agents/|\.github/|AGENTS\.md$|engineering\.json$|scripts/(engineering-check\.mjs|review-baseline\.ps1)$|docs/(status|architecture|engineering-workflow|engineering-setup-results|baseline-review)\.)') { $group = 'Engineering workflow'; }
    elseif ($relative -match '^docs/') { $group = 'Product contracts and evidence'; }
    elseif ($relative -match '^hardware/') { $group = 'Hardware design source'; }
    if ($relative -match '/qa/tmp/|\.kicad_prl$') { $group = 'Local temporary artifacts'; $disposition = 'Keep local; exclude from Git without deleting' }
    elseif ($relative -match '^hardware/.*\.(zip|step|stl|glb|docx|pdf)$|^hardware/.*/(output|commercial-print-pack|fabrication)/') { $group = 'Hardware delivery artifacts'; $disposition = 'Hold; select authoritative revisions and artifact storage' }
    elseif ($relative -match '^docs/camera-design/references/') { $group = 'Supplier reference assets'; $disposition = 'Hold; retain provenance and redistribution terms' }
    elseif ($relative -match '^supabase/functions/') { $disposition = 'Generated deploy source; retain only with generator and consistency check' }
    elseif ($relative -match '^(CLAUDE\.md|README\.md|\.gitignore)$') { $disposition = 'Shared file; split reviewed hunks between software and workflow groups' }
    [pscustomobject]@{Path=$relative;State=$(if ($tracked -contains $relative) {'Tracked change'} else {'Untracked'});Bytes=$file.Length;Sha256=(Get-FileHash -LiteralPath $fullPath -Algorithm SHA256).Hash.ToLowerInvariant();ProposedGroup=$group;Disposition=$disposition}
}
$rows | Export-Csv -LiteralPath (Join-Path $targetDirectory 'inventory.csv') -NoTypeInformation -Encoding utf8
$summary = [ordered]@{RecordedAtUtc=[DateTime]::UtcNow.ToString('o');Head=(& git -C $projectRoot rev-parse HEAD);TrackedChanged=$tracked.Count;UntrackedListed=$untracked.Count;FilesInventoried=$rows.Count;Groups=@($rows | Group-Object ProposedGroup | ForEach-Object { @{Name=$_.Name;Files=$_.Count;Bytes=($_.Group | Measure-Object Bytes -Sum).Sum} });Limitations='Git warned that two Word-rendering temporary directories were inaccessible during this workstation review. Listing/hashes are not a full backup, secret scan, license clearance or code audit.'}
$summary | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $targetDirectory 'summary.json') -Encoding utf8
$rows | Group-Object ProposedGroup | Select-Object Name,Count | Format-Table
Write-Output "Inventory saved to $targetDirectory"
