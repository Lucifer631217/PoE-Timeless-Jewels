<script lang="ts">
  import '../app.scss';
  import { assets } from '$app/paths';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { loadSkillTree } from '../lib/skill_tree';
  import { syncWrap } from '../lib/worker';
  import { initializeCrystalline } from '../lib/types';
  import { APP_VERSION } from '../lib/version';

  let wasmLoading = true;
  let loadError: string | null = null;
  const VERSION_CHECK_MARKER_KEY = 'app-version-reload-marker';

  // eslint-disable-next-line no-undef
  let go: any;

  async function fetchDeployedVersion(): Promise<string | null> {
    try {
      const response = await fetch(`${assets}/version.json?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!response.ok) return null;
      const payload = await response.json();
      return typeof payload?.version === 'string' ? payload.version : null;
    } catch {
      return null;
    }
  }

  async function reloadIfVersionChanged(): Promise<boolean> {
    const deployedVersion = await fetchDeployedVersion();
    if (!deployedVersion || deployedVersion === APP_VERSION) {
      sessionStorage.removeItem(VERSION_CHECK_MARKER_KEY);
      return false;
    }

    const reloadMarker = `reloaded:${deployedVersion}`;
    if (sessionStorage.getItem(VERSION_CHECK_MARKER_KEY) === reloadMarker) {
      return false;
    }

    sessionStorage.setItem(VERSION_CHECK_MARKER_KEY, reloadMarker);
    location.reload();
    return true;
  }

  async function bootWasm() {
    try {
      // @ts-ignore
      go = new globalThis.Go();
      const response = await fetch(`${assets}/calculator.wasm?v=${APP_VERSION}`);
      if (!response.ok) {
        throw new Error(`WASM 請求失敗（HTTP ${response.status}）`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('text/html')) {
        throw new Error('WASM 路徑回傳了 HTML（可能是部署 rewrite 或檔案路徑設定錯誤）');
      }

      const data = await response.arrayBuffer();
      const result = await WebAssembly.instantiate(data, go.importObject);
      go.run(result.instance);
      wasmLoading = false;
      loadError = null;
      initializeCrystalline();
      loadSkillTree();

      if (syncWrap) syncWrap.boot(data);
    } catch (error) {
      wasmLoading = false;
      loadError = error instanceof Error ? error.message : 'WASM 初始化失敗';
      console.error('[bootWasm] failed:', error);
    }
  }

  async function retryBoot() {
    wasmLoading = true;
    loadError = null;
    await bootWasm();
  }

  if (browser) {
    onMount(() => {
      let disposed = false;

      const ensureFreshRuntime = async () => {
        if (disposed) return;
        const reloading = await reloadIfVersionChanged();
        if (!reloading && wasmLoading) {
          await bootWasm();
        }
      };

      const handleFocus = () => {
        void reloadIfVersionChanged();
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          void reloadIfVersionChanged();
        }
      };

      void ensureFreshRuntime();
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        disposed = true;
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    });
  }
</script>

{#if wasmLoading}
  <div class="loading-screen">
    <div class="loading-content">
      <div class="jewel-spinner">
        <div class="jewel-ring"></div>
        <div class="jewel-core"></div>
      </div>
      <h1 class="loading-title">流亡黯道</h1>
      <h2 class="loading-subtitle">永恆珠寶計算器</h2>
      <p class="loading-text">載入中...</p>
    </div>
  </div>
{:else if loadError}
  <div class="loading-screen">
    <div class="loading-content">
      <h1 class="loading-title">載入失敗</h1>
      <p class="loading-text">{loadError}</p>
      <button class="retry-button" on:click={() => void retryBoot()}>
        重新載入
      </button>
    </div>
  </div>
{:else}
  <slot />
{/if}

<style lang="postcss">
  .loading-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    width: 100vw;
    background: radial-gradient(ellipse at center, #1a1208 0%, #0d0d0f 70%);
  }

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .jewel-spinner {
    position: relative;
    width: 64px;
    height: 64px;
    margin-bottom: 8px;
  }

  .jewel-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid transparent;
    border-top-color: #c8a96e;
    border-right-color: rgba(200, 169, 110, 0.3);
    animation: spin 1.2s linear infinite;
  }

  .jewel-core {
    position: absolute;
    inset: 14px;
    border-radius: 50%;
    background: radial-gradient(circle, #c8a96e 0%, #7a5020 60%, transparent 100%);
    opacity: 0.7;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; transform: scale(0.9); }
    50% { opacity: 0.9; transform: scale(1.1); }
  }

  .loading-title {
    font-size: 1.6rem !important;
    font-family: 'Noto Serif TC', serif !important;
    color: #c8a96e !important;
    text-shadow: 0 0 20px rgba(200, 169, 110, 0.5) !important;
    margin: 0 !important;
  }

  .loading-subtitle {
    font-size: 1rem !important;
    color: rgba(200, 169, 110, 0.7) !important;
    font-weight: 400 !important;
    margin: 0 !important;
    letter-spacing: 0.06em;
  }

  .loading-text {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.8rem;
    letter-spacing: 0.12em;
    margin-top: 4px;
    animation: blink 1.5s ease-in-out infinite;
  }

  .retry-button {
    border: 1px solid rgba(200, 169, 110, 0.45);
    border-radius: 12px;
    background: rgba(200, 169, 110, 0.12);
    color: #f0d6a6;
    padding: 8px 16px;
    font-size: 0.95rem;
    cursor: pointer;
    transition: transform 0.12s ease, background-color 0.16s ease;
  }

  .retry-button:hover {
    background: rgba(200, 169, 110, 0.2);
  }

  .retry-button:active {
    transform: scale(0.96);
  }

  @keyframes blink {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.9; }
  }
</style>
