const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const frontendDir = __dirname;
const repoRoot = path.resolve(frontendDir, '..');
const staticDir = path.join(frontendDir, 'static');
const srcDir = path.join(frontendDir, 'src');
const wasmOutput = path.join(staticDir, 'calculator.wasm');
const goCommand = process.platform === 'win32' ? 'go.exe' : 'go';
const powershellCommand =
  process.env.SystemRoot
    ? path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    : 'powershell.exe';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
    ...options
  });

  if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}

function getGoRoot() {
  if (process.platform === 'win32') {
    const result = spawnSync(
      powershellCommand,
      ['-NoProfile', '-Command', '$env:GOTELEMETRY=\'off\'; & go env GOROOT'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        windowsHide: true
      }
    );

    if (result.error) {
      process.stderr.write(`${result.error.message}\n`);
      process.exit(1);
    }

    if (result.status !== 0) {
      process.stderr.write(result.stderr || '無法取得 GOROOT。\n');
      process.exit(result.status ?? 1);
    }

    return result.stdout.trim();
  }

  const result = spawnSync(goCommand, ['env', 'GOROOT'], {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
    env: {
      ...process.env,
      GOTELEMETRY: 'off'
    }
  });

  if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.stderr.write(result.stderr || '無法取得 GOROOT。\n');
    process.exit(result.status ?? 1);
  }

  return result.stdout.trim();
}

function findWasmExec(goRoot) {
  const candidates = [
    path.join(goRoot, 'lib', 'wasm', 'wasm_exec.js'),
    path.join(goRoot, 'misc', 'wasm', 'wasm_exec.js')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  process.stderr.write(`找不到 wasm_exec.js，已檢查：\n${candidates.join('\n')}\n`);
  process.exit(1);
}

fs.mkdirSync(staticDir, { recursive: true });

const goRoot = getGoRoot();
const wasmExecPath = findWasmExec(goRoot);

if (process.platform === 'win32') {
  const buildResult = spawnSync(
    powershellCommand,
    [
      '-NoProfile',
      '-Command',
      `$env:GOOS='js'; $env:GOARCH='wasm'; $env:GOTELEMETRY='off'; & go build '-ldflags=-s -w' -v -o '${wasmOutput}' ./wasm`
    ],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      windowsHide: true
    }
  );

  if (buildResult.error) {
    process.stderr.write(`${buildResult.error.message}\n`);
    process.exit(1);
  }

  if (buildResult.status !== 0) {
    process.exit(buildResult.status ?? 1);
  }
} else {
  run(goCommand, ['build', '-ldflags=-s -w', '-v', '-o', wasmOutput, './wasm'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      GOOS: 'js',
      GOARCH: 'wasm',
      GOTELEMETRY: 'off'
    }
  });
}

fs.copyFileSync(wasmExecPath, path.join(staticDir, 'wasm_exec.js'));
fs.copyFileSync(wasmExecPath, path.join(srcDir, 'wasm_exec.js'));
