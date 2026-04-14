param()

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $root
$staticDir = Join-Path $root 'static'
$srcWasmExec = Join-Path $root 'src\wasm_exec.js'
$staticWasmExec = Join-Path $staticDir 'wasm_exec.js'
$wasmOutput = Join-Path $staticDir 'calculator.wasm'
$goCacheDir = Join-Path $repoRoot '.gocache-wasm'

if (-not (Test-Path $staticDir)) {
  New-Item -ItemType Directory -Path $staticDir | Out-Null
}

if (-not (Test-Path $goCacheDir)) {
  New-Item -ItemType Directory -Path $goCacheDir | Out-Null
}

$env:GOTELEMETRY = 'off'
$env:GOOS = 'js'
$env:GOARCH = 'wasm'
$env:GOCACHE = $goCacheDir

Push-Location $repoRoot
try {
  & go build '-ldflags=-s -w' -v -o $wasmOutput ./wasm
  if ($LASTEXITCODE -ne 0) {
    throw "go build failed."
  }

  $goRoot = (& go env GOROOT).Trim()
  if (-not $goRoot) {
    throw 'Unable to resolve GOROOT.'
  }

  $wasmExecCandidates = @(
    (Join-Path $goRoot 'lib\wasm\wasm_exec.js'),
    (Join-Path $goRoot 'misc\wasm\wasm_exec.js')
  )

  $wasmExecPath = $wasmExecCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $wasmExecPath) {
    throw "Cannot find wasm_exec.js under GOROOT: $goRoot"
  }

  Copy-Item -LiteralPath $wasmExecPath -Destination $staticWasmExec -Force
  Copy-Item -LiteralPath $wasmExecPath -Destination $srcWasmExec -Force
} finally {
  Pop-Location
}
