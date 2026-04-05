param(
  [int]$Port = 4175,
  [switch]$SkipBuild,
  [string]$Page = 'tree.html'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$buildDir = Join-Path $root 'build'
$pagePath = if ([string]::IsNullOrWhiteSpace($Page)) { 'tree.html' } else { $Page.TrimStart('/') }
$url = "http://127.0.0.1:$Port/$pagePath"
$stateDir = Join-Path $env:TEMP 'poe-timeless-jewels-preview'
$pidFile = Join-Path $stateDir 'preview.pid'
$stdout = Join-Path $stateDir 'preview-out.log'
$stderr = Join-Path $stateDir 'preview-err.log'

Set-Location $root

if (-not (Test-Path $stateDir)) {
  New-Item -ItemType Directory -Path $stateDir | Out-Null
}

function Stop-PreviewProcess([int]$ProcessId) {
  if ($ProcessId -le 0) {
    return
  }

  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
  }
}

if (Test-Path $pidFile) {
  $existingPid = Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($existingPid -match '^\d+$') {
    Stop-PreviewProcess -ProcessId ([int]$existingPid)
  }
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

$listeners = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($listener in $listeners) {
  Stop-PreviewProcess -ProcessId $listener
}

Remove-Item -LiteralPath $stdout, $stderr -Force -ErrorAction SilentlyContinue

if (-not $SkipBuild) {
  & pnpm build
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm build failed. Cannot start local preview."
  }
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
  throw "python not found. Cannot start static preview server."
}

if (-not (Test-Path $buildDir)) {
  throw "Build directory not found: $buildDir"
}

$previewCommand = 'cd /d "' + $buildDir + '" && "' + $python.Source + '" -m http.server ' + $Port + ' --bind 127.0.0.1 1> "' + $stdout + '" 2> "' + $stderr + '"'
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = 'C:\WINDOWS\System32\cmd.exe'
$startInfo.Arguments = '/c ' + $previewCommand
$startInfo.WorkingDirectory = $buildDir
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $startInfo
$process.Start() | Out-Null

Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ascii

for ($attempt = 0; $attempt -lt 30; $attempt++) {
  Start-Sleep -Seconds 1

  if ($process.HasExited) {
    $outText = if (Test-Path $stdout) { Get-Content -LiteralPath $stdout -Raw -Encoding utf8 } else { '' }
    $errText = if (Test-Path $stderr) { Get-Content -LiteralPath $stderr -Raw -Encoding utf8 } else { '' }
    throw "Local preview exited early.`nSTDOUT:`n$outText`nSTDERR:`n$errText"
  }

  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
      Start-Process $url | Out-Null
      Write-Output "Local preview ready: $url"
      Write-Output "Preview PID: $($process.Id)"
      exit 0
    }
  } catch {
  }
}

$outText = if (Test-Path $stdout) { Get-Content -LiteralPath $stdout -Raw -Encoding utf8 } else { '' }
$errText = if (Test-Path $stderr) { Get-Content -LiteralPath $stderr -Raw -Encoding utf8 } else { '' }
throw "Timed out waiting for local preview.`nSTDOUT:`n$outText`nSTDERR:`n$errText"
