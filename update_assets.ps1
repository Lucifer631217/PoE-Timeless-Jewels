param(
    [Parameter(Mandatory = $false)]
    [string]$TreeVersion,

    [Parameter(Mandatory = $true)]
    [string]$GameVersion,

    [Parameter(Mandatory = $false)]
    [switch]$AllowFallbackToLatest,

    [Parameter(Mandatory = $false)]
    [switch]$SkipGenerate
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Get-MetaVersions {
    $json = curl.exe -sL "https://go-pob-data.pages.dev/data/meta.json"
    if ([string]::IsNullOrWhiteSpace($json)) {
        throw "Cannot read go-pob-data meta.json."
    }

    $obj = $json | ConvertFrom-Json
    if (-not $obj.versions -or $obj.versions.Count -eq 0) {
        throw "go-pob-data meta.json has no versions."
    }

    return @($obj.versions)
}

function Resolve-GameVersion {
    param(
        [string[]]$AvailableVersions,
        [string]$Requested,
        [bool]$AllowFallback
    )

    if ($AvailableVersions -contains $Requested) {
        return $Requested
    }

    if (-not $AllowFallback) {
        $all = $AvailableVersions -join ", "
        throw "go-pob-data does not provide $Requested. Available: $all. Use -AllowFallbackToLatest to fallback."
    }

    $latest = $AvailableVersions |
        Sort-Object { [version]($_ + ".0") } |
        Select-Object -Last 1

    Write-Host "Warning: go-pob-data does not provide $Requested. Fallback to $latest." -ForegroundColor Yellow
    return $latest
}

function Resolve-TreeVersion {
    param(
        [string]$InputTreeVersion,
        [string]$BaseGameVersion
    )

    if (-not [string]::IsNullOrWhiteSpace($InputTreeVersion)) {
        return $InputTreeVersion
    }

    $candidates = @(
        "$BaseGameVersion.0",
        "$BaseGameVersion.0b",
        "$BaseGameVersion.0c",
        "$BaseGameVersion.0d",
        "$BaseGameVersion.0e",
        "$BaseGameVersion.0f"
    )

    foreach ($candidate in $candidates) {
        $url = "https://raw.githubusercontent.com/grindinggear/skilltree-export/$candidate/data.json"
        try {
            curl.exe -sfL "$url" -o "$env:TEMP\poe-skilltree-probe.json" | Out-Null
            Remove-Item "$env:TEMP\poe-skilltree-probe.json" -Force -ErrorAction SilentlyContinue
            return $candidate
        } catch {
            # try next candidate
        }
    }

    throw "Cannot resolve skilltree-export tree version. Please pass -TreeVersion explicitly."
}

function Download-ToFile {
    param(
        [string]$Url,
        [string]$OutFile
    )

    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutFile) | Out-Null
    Write-Host "Downloading: $Url"
    curl.exe -sfL "$Url" -o "$OutFile"
}

$availableVersions = Get-MetaVersions
$resolvedGameVersion = Resolve-GameVersion -AvailableVersions $availableVersions -Requested $GameVersion -AllowFallback:$AllowFallbackToLatest
$resolvedTreeVersion = Resolve-TreeVersion -InputTreeVersion $TreeVersion -BaseGameVersion $GameVersion

Write-Host "Using GameVersion: $resolvedGameVersion"
Write-Host "Using TreeVersion: $resolvedTreeVersion"

# SkillTree.json.gz
$treeJsonTmp = Join-Path $env:TEMP "poe-skilltree-data.json"
Download-ToFile -Url "https://raw.githubusercontent.com/grindinggear/skilltree-export/$resolvedTreeVersion/data.json" -OutFile $treeJsonTmp

New-Item -ItemType Directory -Force -Path ".\data" | Out-Null
if (Test-Path ".\data\SkillTree.json.gz") {
    Remove-Item ".\data\SkillTree.json.gz" -Force
}

$src = [System.IO.File]::OpenRead($treeJsonTmp)
$dst = [System.IO.File]::Create((Resolve-Path ".\data").Path + "\SkillTree.json.gz")
$gzip = New-Object System.IO.Compression.GZipStream($dst, [System.IO.Compression.CompressionMode]::Compress)
$src.CopyTo($gzip)
$gzip.Dispose()
$dst.Dispose()
$src.Dispose()
Remove-Item $treeJsonTmp -Force

# Raw data
Download-ToFile -Url "https://go-pob-data.pages.dev/data/$resolvedGameVersion/raw/AlternatePassiveAdditions.json.gz" -OutFile ".\data\alternate_passive_additions.json.gz"
Download-ToFile -Url "https://go-pob-data.pages.dev/data/$resolvedGameVersion/raw/AlternatePassiveSkills.json.gz" -OutFile ".\data\alternate_passive_skills.json.gz"
Download-ToFile -Url "https://go-pob-data.pages.dev/data/$resolvedGameVersion/raw/AlternateTreeVersions.json.gz" -OutFile ".\data\alternate_tree_versions.json.gz"
Download-ToFile -Url "https://go-pob-data.pages.dev/data/$resolvedGameVersion/raw/PassiveSkills.json.gz" -OutFile ".\data\passive_skills.json.gz"
Download-ToFile -Url "https://go-pob-data.pages.dev/data/$resolvedGameVersion/raw/Stats.json.gz" -OutFile ".\data\stats.json.gz"

# Stat translations (EN)
Download-ToFile -Url "https://go-pob-data.pages.dev/data/$resolvedGameVersion/stat_translations/en/stat_descriptions.json.gz" -OutFile ".\data\stat_descriptions.json.gz"
Download-ToFile -Url "https://go-pob-data.pages.dev/data/$resolvedGameVersion/stat_translations/en/passive_skill_stat_descriptions.json.gz" -OutFile ".\data\passive_skill_stat_descriptions.json.gz"
Download-ToFile -Url "https://go-pob-data.pages.dev/data/$resolvedGameVersion/stat_translations/en/passive_skill_aura_stat_descriptions.json.gz" -OutFile ".\data\passive_skill_aura_stat_descriptions.json.gz"

if (-not $SkipGenerate) {
    $goCmd = Get-Command go -ErrorAction SilentlyContinue
    if ($null -ne $goCmd) {
        Write-Host "Running go generate..."
        go generate -tags tools -x ./...
    } else {
        Write-Host "Warning: go not found, skip go generate." -ForegroundColor Yellow
    }
}

Write-Host "Done."
