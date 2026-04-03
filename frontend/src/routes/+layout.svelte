<script lang="ts">
  import '../app.scss';
  import { assets } from '$app/paths';
  import { browser } from '$app/environment';
  import { loadSkillTree } from '../lib/skill_tree';
  import { syncWrap } from '../lib/worker';
  import { initializeCrystalline } from '../lib/types';

  let wasmLoading = true;

  // eslint-disable-next-line no-undef
  let go: any;

  if (browser) {
    // @ts-ignore
    go = new globalThis.Go();
    fetch(assets + '/calculator.wasm')
      .then((data) => data.arrayBuffer())
      .then((data) => {
        WebAssembly.instantiate(data, go.importObject).then((result) => {
          go.run(result.instance);
          wasmLoading = false;
          initializeCrystalline();
          loadSkillTree();
        });

        if (syncWrap) syncWrap.boot(data);
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

  @keyframes blink {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.9; }
  }
</style>
