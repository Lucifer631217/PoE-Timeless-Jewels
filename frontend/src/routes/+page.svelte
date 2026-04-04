<script lang="ts">
  import Select from 'svelte-select';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { base, assets } from '$app/paths';
  import { calculator, data } from '../lib/types';
  import { APP_VERSION } from '../lib/version';
  import { translateJewelName, translateConquerorName, translateAlternateSkillName } from '../lib/zh_tw';
  import { translateStat } from '../lib/skill_tree';
  const appVersion = APP_VERSION;

  const searchParams = $page.url.searchParams;

  $: jewels = data?.TimelessJewels
    ? Object.keys(data.TimelessJewels)
        .map((k) => ({
          value: parseInt(k),
          label: translateJewelName(parseInt(k), (data.TimelessJewels as any)[k])
        }))
        .sort((left, right) => left.value - right.value)
    : [];

  let selectedJewel: { label: string; value: number } | undefined;

  $: if (jewels.length > 0 && !selectedJewel && searchParams.has('jewel')) {
    const jewelId = searchParams.get('jewel');
    if (jewelId) selectedJewel = jewels.find((j) => j.value == parseInt(jewelId));
  }

  $: conquerors = (selectedJewel && data?.TimelessJewelConquerors && data.TimelessJewelConquerors[selectedJewel.value])
    ? Object.keys(data.TimelessJewelConquerors[selectedJewel.value]!).map((k) => ({
        value: k,
        label: translateConquerorName(k)
      }))
    : [];

  let selectedConqueror: { label: string; value: string } | undefined = searchParams.has('conqueror')
    ? {
        value: searchParams.get('conqueror') || '',
        label: translateConquerorName(searchParams.get('conqueror') || '')
      }
    : undefined;

  $: passiveSkills = data?.PassiveSkills ? Object.values(data.PassiveSkills).map((passive) => ({
    value: passive?.Index ?? 0,
    label: (passive?.Name ?? 'Unknown') + ' (' + (passive?.ID ?? 'N/A') + ')'
  })) : [];

  let selectedPassiveSkill: { label: string; value: number } | undefined;

  $: if (passiveSkills.length > 0 && !selectedPassiveSkill && searchParams.has('passive_skill')) {
    const passiveId = searchParams.get('passive_skill');
    if (passiveId) selectedPassiveSkill = passiveSkills.find((j) => j.value == parseInt(passiveId));
  }

  let seed = searchParams.has('seed') ? searchParams.get('seed') : 0;

  let result: undefined | data.AlternatePassiveSkillInformation;

  $: {
    if (selectedPassiveSkill && seed && selectedJewel && selectedConqueror && calculator?.Calculate) {
      result = calculator.Calculate(
        selectedPassiveSkill.value,
        typeof seed === 'string' ? parseInt(seed) : seed,
        selectedJewel.value,
        selectedConqueror.value
      );
    }
  }

  const updateUrl = () => {
    if (browser) {
      const params: object = {};
      selectedJewel && ((params as any).jewel = selectedJewel.value);
      selectedConqueror && ((params as any).conqueror = selectedConqueror.value);
      selectedPassiveSkill && ((params as any).passive_skill = selectedPassiveSkill.value);
      seed && ((params as any).seed = seed);

      const resultQuery = Object.keys(params)
        .map((key) => key + '=' + encodeURIComponent((params as any)[key]))
        .join('&');

      goto($page.url.pathname + '?' + resultQuery);
    }
  };
</script>

<div class="page-bg">
  <div class="page-container">
    <!-- Header -->
    <div class="page-header">
      <div class="logo-area">
        <div class="jewel-icon">◆</div>
        <div>
          <h1>永恆珠寶計算器</h1>
          <p class="subtitle">流亡黯道 · Timeless Jewel Calculator</p>
          <p class="version-chip">版本 {appVersion}</p>
        </div>
      </div>
      <a href="{base}/tree" class="tree-link">
        <span class="tree-link-icon">🌿</span>
        <span>天賦樹視圖</span>
      </a>
    </div>

    <!-- Main Card -->
    <div class="main-card themed">
      <!-- 永恆珠寶選擇 -->
      <div class="field-group">
        <h3>永恆珠寶</h3>
        <Select items={jewels} bind:value={selectedJewel} on:select={updateUrl} placeholder="選擇珠寶…" />
      </div>

      {#if selectedJewel}
        <!-- 征服者選擇 -->
        <div class="field-group">
          <div class="poe-divider"></div>
          <h3>征服者</h3>
          <Select items={conquerors} bind:value={selectedConqueror} on:select={updateUrl} placeholder="選擇征服者…" />
        </div>

        {#if selectedConqueror && data?.TimelessJewelConquerors && data.TimelessJewelConquerors[selectedJewel.value] && Object.keys(data.TimelessJewelConquerors[selectedJewel.value] ?? {}).indexOf(selectedConqueror.value) >= 0}
          <!-- 被動天賦選擇 -->
          <div class="field-group">
            <div class="poe-divider"></div>
            <h3>天賦節點</h3>
            <Select items={passiveSkills} bind:value={selectedPassiveSkill} on:select={updateUrl} placeholder="選擇天賦節點…" />
          </div>

          {#if selectedPassiveSkill}
            <!-- 種子值 -->
            <div class="field-group">
              <div class="poe-divider"></div>
              <h3>種子值</h3>
              <input
                type="number"
                bind:value={seed}
                on:blur={updateUrl}
                min={data?.TimelessJewelSeedRanges ? data.TimelessJewelSeedRanges[selectedJewel.value]?.Min : 0}
                max={data?.TimelessJewelSeedRanges ? data.TimelessJewelSeedRanges[selectedJewel.value]?.Max : 0}
                placeholder="輸入種子值…" />
              {#if data?.TimelessJewelSeedRanges && selectedJewel && (Number(seed) < (data.TimelessJewelSeedRanges[selectedJewel.value]?.Min ?? 0) || Number(seed) > (data.TimelessJewelSeedRanges[selectedJewel.value]?.Max ?? 0))}
                <div class="warning-text">
                  ⚠ 種子值必須在 {data.TimelessJewelSeedRanges[selectedJewel.value]?.Min} 到 {data.TimelessJewelSeedRanges[selectedJewel.value]?.Max} 之間
                </div>
              {/if}
            </div>

            <!-- 計算結果 -->
            {#if result}
              {#if result.AlternatePassiveSkill}
                <div class="result-section">
                  <div class="poe-divider"></div>
                  <h3>替代天賦效果</h3>
                  <div class="result-name">
                    {translateAlternateSkillName(result.AlternatePassiveSkill.Name)}
                    <span class="result-id">({result.AlternatePassiveSkill.ID})</span>
                  </div>

                  {#if result.StatRolls && result.AlternatePassiveSkill.StatsKeys && Object.keys(result.StatRolls).length > 0}
                    <ol class="stat-list">
                      {#each Object.values(result.StatRolls) as rollValue, i}
                        {@const statIndex = result.AlternatePassiveSkill.StatsKeys[i]}
                        {@const stat = data?.GetStatByIndex ? data.GetStatByIndex(statIndex) : null}
                        {#if stat}
                          <li>
                            <span class="stat-text">
                              {translateStat(statIndex, rollValue)}
                            </span>
                            <span class="stat-id">({stat.ID})</span>
                          </li>
                        {/if}
                      {/each}
                    </ol>
                  {/if}
                </div>
              {/if}

              {#if result && 'AlternatePassiveAdditionInformations' in result && (result.AlternatePassiveAdditionInformations?.length ?? 0) > 0}
                <div class="result-section">
                  <div class="poe-divider"></div>
                  <h3>附加屬性</h3>
                  <ul class="addition-list">
                    {#each result.AlternatePassiveAdditionInformations as info}
                      {#if info.AlternatePassiveAddition}
                        <li class="addition-item">
                          <span class="addition-id">{translateAlternateSkillName(info.AlternatePassiveAddition.ID)}</span>
                          <span class="addition-index">({info.AlternatePassiveAddition.Index})</span>

                          {#if info.StatRolls && info.AlternatePassiveAddition.StatsKeys && Object.keys(info.StatRolls).length > 0}
                            <ol class="stat-list">
                              {#each Object.values(info.StatRolls) as rollValue, i}
                                {@const statIndex = info.AlternatePassiveAddition.StatsKeys[i]}
                                {@const stat = data?.GetStatByIndex ? data.GetStatByIndex(statIndex) : null}
                                {#if stat}
                                  <li>
                                    <span class="stat-text">
                                      {translateStat(statIndex, rollValue)}
                                    </span>
                                    <span class="stat-id">({stat.ID})</span>
                                  </li>
                                {/if}
                              {/each}
                            </ol>
                          {/if}
                        </li>
                      {/if}
                    {/each}
                  </ul>
                </div>
              {/if}
            {/if}
          {/if}
        {/if}
      {/if}
    </div>

    <!-- Footer -->
    <div class="page-footer">
      <a href="https://github.com/Lucifer631217/PoE-Timeless-Jewels" target="_blank" rel="noopener" class="footer-link">
        此專案 GitHub
      </a>
      <a href="https://github.com/Vilsol/timeless-jewels" target="_blank" rel="noopener" class="footer-link">
        感謝原作者 Vilsol
      </a>
    </div>
  </div>
</div>

<style lang="postcss">
  .page-bg {
    min-height: 100vh;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 32px 16px;
  }

  .page-container {
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* Header */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
  }

  .logo-area {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .jewel-icon {
    font-size: 2rem;
    color: #c8a96e;
    text-shadow: 0 0 16px rgba(200, 169, 110, 0.6);
    animation: jewel-glow 3s ease-in-out infinite;
  }

  @keyframes jewel-glow {
    0%, 100% { text-shadow: 0 0 16px rgba(200, 169, 110, 0.5); }
    50% { text-shadow: 0 0 28px rgba(200, 169, 110, 0.9); }
  }

  .subtitle {
    font-size: 11px;
    color: rgba(200, 169, 110, 0.5);
    letter-spacing: 0.08em;
    margin-top: 2px;
  }

  .version-chip {
    margin-top: 6px;
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: 999px;
    border: 1px solid rgba(200, 169, 110, 0.25);
    background: rgba(200, 169, 110, 0.1);
    color: rgba(232, 216, 184, 0.9);
    font-size: 11px;
    line-height: 1.6;
    letter-spacing: 0.02em;
  }

  .tree-link {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: rgba(200, 169, 110, 0.1);
    border: 1px solid rgba(200, 169, 110, 0.25);
    border-radius: 20px;
    color: #c8a96e;
    font-size: 13px;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .tree-link:hover {
    background: rgba(200, 169, 110, 0.2);
    border-color: rgba(200, 169, 110, 0.5);
    transform: translateY(-1px);
  }

  .tree-link-icon {
    font-size: 14px;
  }

  /* Main Card */
  .main-card {
    background: rgba(18, 18, 22, 0.9);
    border: 1px solid rgba(200, 169, 110, 0.2);
    border-radius: 16px;
    padding: 24px;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.5),
      0 1px 0 rgba(200, 169, 110, 0.1) inset;
    backdrop-filter: blur(12px);
  }

  .field-group {
    margin-bottom: 4px;
    padding-bottom: 4px;
  }

  .field-group:last-child {
    margin-bottom: 0;
  }

  .poe-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(200, 169, 110, 0.3), transparent);
    margin: 16px 0 14px;
  }

  /* 警告文字 */
  .warning-text {
    margin-top: 8px;
    padding: 8px 12px;
    background: rgba(194, 65, 12, 0.15);
    border: 1px solid rgba(194, 65, 12, 0.3);
    border-radius: 8px;
    color: #f87171;
    font-size: 12px;
  }

  /* 結果區塊 */
  .result-section {
    margin-bottom: 4px;
  }

  .result-name {
    padding: 10px 14px;
    background: rgba(200, 169, 110, 0.08);
    border: 1px solid rgba(200, 169, 110, 0.2);
    border-radius: 10px;
    color: #e8d8b8;
    font-weight: 500;
    font-size: 13px;
    margin-bottom: 8px;
  }

  .result-id {
    color: rgba(200, 169, 110, 0.5);
    font-size: 11px;
    font-weight: 400;
    margin-left: 4px;
  }

  .stat-list {
    list-style: decimal;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-list li {
    padding: 4px 0;
    font-size: 12px;
    line-height: 1.5;
  }

  .stat-text {
    color: #e8d8b8;
  }

  .stat-id {
    color: rgba(200, 169, 110, 0.4);
    font-size: 10px;
    margin: 0 4px;
  }

  .addition-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    list-style: none;
    padding: 0;
  }

  .addition-item {
    padding: 10px 12px;
    background: rgba(30, 30, 36, 0.8);
    border: 1px solid rgba(200, 169, 110, 0.15);
    border-radius: 10px;
  }

  .addition-id {
    color: #e8d8b8;
    font-size: 12px;
    font-weight: 500;
  }

  .addition-index {
    color: rgba(200, 169, 110, 0.5);
    font-size: 11px;
    margin-left: 4px;
  }

  /* Footer */
  .page-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 4px;
  }

  .footer-link {
    display: flex;
    align-items: center;
    gap: 6px;
    color: rgba(200, 169, 110, 0.6);
    font-size: 12px;
    text-decoration: none;
    transition: color 0.2s;
  }

  .footer-link:hover {
    color: #c8a96e;
  }
</style>
