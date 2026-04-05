<script lang="ts">
  import type { SearchWithSeed, TradeCondition } from '../skill_tree';
  import { formatBilingualStatHtml, skillTree, translateStatBilingual, openTrade } from '../skill_tree';
  import { translateConquerorName } from '../zh_tw';

  export let highlight: (newSeed: number, passives: number[], conqueror?: string) => void;
  export let onSave: ((set: SearchWithSeed) => void) | undefined = undefined;
  export let set: SearchWithSeed;
  export let jewel: number;
  export let conqueror: string;
  export let platform: string;
  export let league: string;
  export let twLeague: string;
  export let tradeCondition: TradeCondition = 'instant_buyout';

  $: resultConqueror = set.conqueror || conqueror;
</script>

<div
  class="result-card"
  role="button"
  tabindex="0"
  on:click={() =>
    highlight(
      set.seed,
      set.skills.map((s) => s.passive),
      resultConqueror
    )}
  on:keydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      highlight(
        set.seed,
        set.skills.map((s) => s.passive),
        resultConqueror
      );
    }
  }}>
  <div class="result-header">
    <div class="seed-label">
      Seed {set.seed}
      {#if set.conqueror}
        <span class="weight-label">征服者 {translateConquerorName(set.conqueror)}</span>
      {/if}
      <span class="weight-label">權重 {set.weight}</span>
    </div>
    <div class="trade-actions">
      {#if onSave}
        <button class="trade-btn save-btn" on:click|stopPropagation={() => onSave?.(set)}>加入收藏</button>
      {/if}
      <button
        class="trade-btn intl-trade"
        on:click|stopPropagation={() =>
          openTrade(jewel, resultConqueror, [set], platform, league, 'international', tradeCondition)}>
        國際服交易
      </button>
      <button
        class="trade-btn tw-trade"
        on:click|stopPropagation={() =>
          openTrade(jewel, resultConqueror, [set], platform, twLeague, 'tw', tradeCondition)}>
        台服交易
      </button>
    </div>
  </div>
  {#each set.skills as skill}
    <div class="skill-item">
      <span class="skill-name">
        {skillTree.nodes[skill.passive].name}
        <span class="skill-id">({skill.passive})</span>
      </span>
      <ul class="skill-stats">
        {#each Object.keys(skill.stats) as stat}
          <li>{@html formatBilingualStatHtml(translateStatBilingual(stat, skill.stats[stat]))}</li>
        {/each}
      </ul>
    </div>
  {/each}
</div>

<style>
  .result-card {
    margin: 6px 0;
    border: 1px solid rgba(200, 169, 110, 0.2);
    background: rgba(22, 22, 26, 0.8);
    padding: 10px 12px;
    border-radius: 16px;
    cursor: pointer;
    transition:
      border-color 0.2s,
      background 0.2s,
      transform 0.18s ease;
  }

  .result-card:hover {
    border-color: rgba(200, 169, 110, 0.45);
    background: rgba(30, 28, 20, 0.85);
    transform: translateY(-1px);
  }

  .result-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .seed-label {
    font-weight: 600;
    color: #c8a96e;
    font-size: 13px;
    text-align: center;
    display: flex;
    flex-direction: column;
    line-height: 1.6;
  }

  .weight-label {
    color: rgba(200, 169, 110, 0.6);
    font-weight: 400;
    font-size: 11px;
  }

  .trade-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .trade-btn {
    padding: 5px 10px;
    border-radius: 16px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
  }

  .save-btn {
    background: rgba(16, 185, 129, 0.2);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #a7f3d0;
  }

  .save-btn:hover {
    background: rgba(16, 185, 129, 0.4);
    border-color: rgba(16, 185, 129, 0.45);
  }

  .intl-trade {
    background: rgba(59, 130, 246, 0.25);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #93c5fd;
  }

  .intl-trade:hover {
    background: rgba(59, 130, 246, 0.45);
    border-color: rgba(59, 130, 246, 0.5);
  }

  .tw-trade {
    background: rgba(249, 115, 22, 0.25);
    border: 1px solid rgba(249, 115, 22, 0.3);
    color: #fdba74;
  }

  .tw-trade:hover {
    background: rgba(249, 115, 22, 0.45);
    border-color: rgba(249, 115, 22, 0.5);
  }

  .skill-item {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid rgba(200, 169, 110, 0.08);
  }

  .skill-name {
    color: #e8d8b8;
    font-size: 12px;
    font-weight: 500;
  }

  .skill-id {
    color: rgba(200, 169, 110, 0.4);
    font-size: 10px;
    margin-left: 3px;
    font-weight: 400;
  }

  .skill-stats {
    list-style: disc;
    padding-left: 18px;
    margin-top: 3px;
    font-size: 12px;
    font-weight: 600;
    color: #d4c4a0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    line-height: 1.6;
  }
</style>
