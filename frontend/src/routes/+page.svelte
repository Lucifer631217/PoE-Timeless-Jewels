<script lang="ts">
  import { base } from '$app/paths';
  import { APP_VERSION } from '../lib/version';
  const appVersion = APP_VERSION;
</script>

<div class="page-bg">
  <div class="hero-container">
    <header class="hero-header">
      <div class="jewel-diamond">◆</div>
      <h1 class="main-title">流亡黯道</h1>
      <h2 class="sub-title">永恆珠寶計算器</h2>
      <div class="v-chip">{appVersion}</div>
    </header>

    <main class="hero-content">
      <a href="{base}/tree" class="mega-button">
        <span class="btn-glow"></span>
        <span class="btn-label">開啟天賦樹視圖</span>
        <span class="btn-sublabel">Explore Passive Tree</span>
      </a>

      <div class="mystery-prose">
        <p>探索瓦爾遺產的祕密</p>
        <p>在古老的天賦樹上定位您的永恆珠寶</p>
        <p>計算其賦予的強大詞綴</p>
      </div>
    </main>

    <footer class="hero-footer">
      <div class="footer-group">
        <a href="https://github.com/Lucifer631217/PoE-Timeless-Jewels" target="_blank" rel="noopener" class="f-link">GITHUB</a>
        <span class="f-sep">/</span>
        <a href="https://github.com/Vilsol/timeless-jewels" target="_blank" rel="noopener" class="f-link">CREDITS</a>
      </div>
    </footer>
  </div>
</div>

<style lang="postcss">
  .page-bg {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    background: radial-gradient(circle at center, #1a1208 0%, #0d0d0f 100%);
  }

  .hero-container {
    width: 100%;
    max-width: 640px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 40px;
    text-align: center;
  }

  /* Header */
  .hero-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .jewel-diamond {
    font-size: 2.5rem;
    color: #c8a96e;
    text-shadow: 0 0 24px rgba(200, 169, 110, 0.6);
    margin-bottom: 8px;
    animation: jewel-pulse 4s ease-in-out infinite;
  }

  @keyframes jewel-pulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.1); opacity: 1; }
  }

  .main-title {
    font-family: 'Noto Serif TC', serif;
    font-size: 2.8rem;
    color: #c8a96e;
    letter-spacing: 0.2em;
    margin: 0;
    text-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);
  }

  .sub-title {
    font-size: 1.1rem;
    color: rgba(200, 169, 110, 0.6);
    font-weight: 400;
    letter-spacing: 0.1em;
    margin: 0;
  }

  .v-chip {
    padding: 2px 12px;
    background: rgba(200, 169, 110, 0.1);
    border: 1px solid rgba(200, 169, 110, 0.2);
    border-radius: 999px;
    font-size: 10px;
    color: rgba(200, 169, 110, 0.4);
    margin-top: 12px;
  }

  /* Main Content */
  .hero-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 48px;
    width: 100%;
  }

  .mega-button {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 280px;
    height: 120px;
    background: linear-gradient(135deg, #2a1f10 0%, #151109 100%);
    border: 1px solid rgba(200, 169, 110, 0.3);
    border-radius: 20px;
    text-decoration: none;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 
      0 12px 32px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(200, 169, 110, 0.1) inset;
  }

  .mega-button:hover {
    border-color: #c8a96e;
    transform: translateY(-4px);
    box-shadow: 
      0 20px 48px rgba(0, 0, 0, 0.8),
      0 0 24px rgba(200, 169, 110, 0.2);
  }

  .mega-button:active {
    transform: scale(0.96);
    transition: transform 0.1s;
  }

  .btn-label {
    font-size: 1.4rem;
    color: #e8d8b8;
    font-weight: 600;
    letter-spacing: 0.1em;
    z-index: 1;
  }

  .btn-sublabel {
    font-size: 0.75rem;
    color: rgba(200, 169, 110, 0.5);
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    z-index: 1;
  }

  .btn-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, rgba(200, 169, 110, 0.15) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .mega-button:hover .btn-glow {
    opacity: 1;
  }

  .mystery-prose {
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-family: 'Noto Serif TC', serif;
    color: rgba(232, 216, 184, 0.7);
    font-size: 1.1rem;
    line-height: 1.8;
    letter-spacing: 0.05em;
  }

  .mystery-prose p {
    margin: 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }

  /* Footer */
  .hero-footer {
    margin-top: 24px;
  }

  .footer-group {
    display: flex;
    align-items: center;
    gap: 16px;
    opacity: 0.4;
    transition: opacity 0.3s;
  }

  .footer-group:hover {
    opacity: 0.8;
  }

  .f-link {
    color: #c8a96e;
    text-decoration: none;
    font-size: 11px;
    letter-spacing: 0.2em;
  }

  .f-sep {
    color: rgba(200, 169, 110, 0.3);
    font-size: 10px;
  }

  @media (max-width: 480px) {
    .main-title { font-size: 2rem; }
    .mystery-prose { font-size: 0.95rem; }
    .mega-button { width: 240px; height: 100px; }
  }
</style>
