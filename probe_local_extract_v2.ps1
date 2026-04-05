param(
    [Parameter(Mandatory = $false)]
    [string]$GamePath
)

$ErrorActionPreference = "Stop"

function Resolve-GamePath {
    param([string]$Requested)

    if (-not [string]::IsNullOrWhiteSpace($Requested)) {
        return (Resolve-Path $Requested).Path
    }

    $candidates = @(
        "C:\Program Files (x86)\Grinding Gear Games\Path of Exile",
        "C:\Program Files (x86)\Steam\steamapps\common\Path of Exile",
        "C:\Program Files\Grinding Gear Games\Path of Exile",
        "C:\Games\Path of Exile",
        "D:\Games\Path of Exile",
        "D:\SteamLibrary\steamapps\common\Path of Exile"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return (Resolve-Path $candidate).Path
        }
    }

    throw "Cannot find a Path of Exile install directory. Pass -GamePath explicitly."
}

function Resolve-PogoPath {
    $candidates = @(
        (Join-Path $env:USERPROFILE "go\bin\pogo.exe"),
        (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\pogo.exe")
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return $null
}

function Write-Result {
    param(
        [string]$Status,
        [string]$Mode,
        [string]$Path,
        [string]$Message,
        [string]$NextStep
    )

    [pscustomobject]@{
        status   = $Status
        mode     = $Mode
        gamePath = $Path
        message  = $Message
        nextStep = $NextStep
    } | ConvertTo-Json -Depth 3
}

$resolvedGamePath = Resolve-GamePath -Requested $GamePath
$bundlesIndexPath = Join-Path $resolvedGamePath "Bundles2\_.index.bin"
$contentGgpkPath = Join-Path $resolvedGamePath "Content.ggpk"

if (Test-Path $bundlesIndexPath) {
    Write-Result `
        -Status "ready" `
        -Mode "bundles2" `
        -Path $resolvedGamePath `
        -Message "Detected Bundles2. The existing go-pob-data-main extraction flow can be used directly." `
        -NextStep "Run go-pob-data-main or an integration script to extract raw/translations and sync them into the repo data directory."
    exit 0
}

if (-not (Test-Path $contentGgpkPath)) {
    Write-Result `
        -Status "blocked" `
        -Mode "unknown" `
        -Path $resolvedGamePath `
        -Message "Neither Bundles2 nor Content.ggpk exists at the resolved path. This does not look like a usable PoE client data directory." `
        -NextStep "Verify that -GamePath points to the actual game install directory."
    exit 1
}

$pogoPath = Resolve-PogoPath
if ($null -eq $pogoPath) {
    Write-Result `
        -Status "blocked" `
        -Mode "ggpk" `
        -Path $resolvedGamePath `
        -Message "Detected Content.ggpk, but pogo.exe is not installed, so ggpk probing cannot continue." `
        -NextStep "Install pogo and rerun this script."
    exit 1
}

try {
    $probeOutput = & $pogoPath ls "$contentGgpkPath`:Data" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Result `
            -Status "partial" `
            -Mode "ggpk" `
            -Path $resolvedGamePath `
            -Message "pogo can read this ggpk. The next step is wiring a data2json/cat pipeline to generate the repo data files." `
            -NextStep "Add a conversion script that maps pogo output into data/*.json.gz."
        exit 0
    }

    $probeMessage = ($probeOutput | Out-String).Trim()
    Write-Result `
        -Status "blocked" `
        -Mode "ggpk" `
        -Path $resolvedGamePath `
        -Message "Detected Content.ggpk, but the current pogo build cannot open this client. Error: $probeMessage" `
        -NextStep "Use a client that exposes Bundles2, or switch to another extractor that supports this ggpk format."
    exit 1
} catch {
    Write-Result `
        -Status "blocked" `
        -Mode "ggpk" `
        -Path $resolvedGamePath `
        -Message "Detected Content.ggpk, but ggpk probing failed. Error: $($_.Exception.Message)" `
        -NextStep "Use a client that exposes Bundles2, or switch to another extractor that supports this ggpk format."
    exit 1
}
