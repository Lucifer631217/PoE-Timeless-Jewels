<script lang="ts">
  import type { SavedJewelEntry } from '../favorite_jewels';
  import { createTradeSeedResult } from '../favorite_jewels';
  import { openTrade, type TradeCondition } from '../skill_tree';

  export let entry: SavedJewelEntry;
  export let league = 'Standard';
  export let twLeague = 'Standard';
  export let tradeCondition: TradeCondition = 'instant_buyout';
  export let onEdit: (entry: SavedJewelEntry) => void;
  export let onDelete: (entry: SavedJewelEntry) => void;

  const summarizeSeeds = (seeds: number[]): string => {
    if (seeds.length <= 1) {
      return `Seed ${seeds[0]}`;
    }

    if (seeds.length <= 8) {
      return `Seed ${seeds.join(', ')}`;
    }

    return `Seed ${seeds.slice(0, 8).join(', ')} ... 共 ${seeds.length} 顆`;
  };

  $: normalizedSeeds = entry.seeds.length > 0 ? entry.seeds : [entry.seed];
  $: groupSeedTotal = Math.max(normalizedSeeds.length, entry.seedTotal || normalizedSeeds.length);
  $: tradeSeeds =
    entry.tradeTargets && entry.tradeTargets.length > 0
      ? entry.tradeTargets.map((target) => createTradeSeedResult(target.seed, target.conqueror))
      : normalizedSeeds.map((seed) => createTradeSeedResult(seed));
  $: seedSummary = summarizeSeeds(normalizedSeeds);
</script>

<div class="favorite-card" class:is-group={entry.entryType === 'group'}>
  <div class="favorite-top">
    <div>
      <div class="favorite-title">{entry.jewelLabel}</div>
      <div class="favorite-meta">
        <span>{entry.conquerorLabel}</span>
        {#if entry.entryType === 'group'}
          <span>群組收藏 / 共 {groupSeedTotal} 顆</span>
        {:else}
          <span>Seed {entry.seed}</span>
        {/if}
        {#if entry.buildName}
          <span class="build-name">{entry.buildName}</span>
        {/if}
      </div>
      {#if entry.entryType === 'group'}
        <div class="seed-summary">{seedSummary}</div>
      {/if}
    </div>
    <div class="favorite-actions">
      <button type="button" on:click={() => onEdit(entry)}>編輯</button>
      <button type="button" class="danger" on:click={() => onDelete(entry)}>刪除</button>
    </div>
  </div>

  <div class="meta-panel">
    {#if entry.estimatedValue}
      <div class="value-pill">估價：{entry.estimatedValue}</div>
    {/if}

    {#if entry.note}
      <div class="note-block">
        <span class="note-label">備註</span>
        <p>{entry.note}</p>
      </div>
    {/if}
  </div>

  <div class="trade-row">
    <button
      type="button"
      class="intl-trade"
      on:click={() =>
        openTrade(entry.jewel, entry.conqueror, tradeSeeds, 'PC', league, 'international', tradeCondition)}>
      {entry.entryType === 'group' ? '本組國際服交易' : '國際服交易'}
    </button>
    <button
      type="button"
      class="tw-trade"
      on:click={() => openTrade(entry.jewel, entry.conqueror, tradeSeeds, 'PC', twLeague, 'tw', tradeCondition)}>
      {entry.entryType === 'group' ? '本組台服交易' : '台服交易'}
    </button>
  </div>
</div>

<style>
  .favorite-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border-radius: 20px;
    background: rgba(16, 16, 20, 0.85);
    border: 1px solid rgba(200, 169, 110, 0.16);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
  }

  .favorite-card.is-group {
    border-color: rgba(59, 130, 246, 0.24);
    box-shadow: 0 12px 30px rgba(18, 53, 98, 0.22);
  }

  .favorite-top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .favorite-title {
    color: #f1e2c1;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.6;
  }

  .favorite-meta {
    margin-top: 4px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    color: rgba(200, 169, 110, 0.68);
    font-size: 12px;
    line-height: 1.6;
  }

  .seed-summary {
    margin-top: 4px;
    color: #9cc3ff;
    font-size: 12px;
    line-height: 1.6;
  }

  .build-name {
    color: #67e8f9;
    font-weight: 700;
    text-shadow: 0 0 10px rgba(103, 232, 249, 0.22);
  }

  .favorite-actions {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .favorite-actions button,
  .trade-row button {
    border-radius: 16px;
    padding: 8px 12px;
    transition:
      transform 0.18s ease,
      border-color 0.18s ease,
      background 0.18s ease;
  }

  .favorite-actions button {
    border: 1px solid rgba(200, 169, 110, 0.16);
    background: rgba(200, 169, 110, 0.08);
    color: rgba(200, 169, 110, 0.84);
  }

  .favorite-actions .danger {
    border-color: rgba(239, 68, 68, 0.22);
    background: rgba(239, 68, 68, 0.14);
    color: #fca5a5;
  }

  .meta-panel {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: stretch;
  }

  .value-pill {
    border-radius: 999px;
    padding: 6px 12px;
    background: rgba(59, 130, 246, 0.14);
    border: 1px solid rgba(59, 130, 246, 0.18);
    color: #bfdbfe;
    font-size: 12px;
    width: fit-content;
    min-height: 34px;
    display: inline-flex;
    align-items: center;
  }

  .note-block {
    border-radius: 14px;
    padding: 8px 10px;
    border: 1px solid rgba(200, 169, 110, 0.14);
    background: rgba(200, 169, 110, 0.06);
    color: #ead8b4;
    min-width: min(100%, 420px);
    flex: 1;
  }

  .note-label {
    display: block;
    font-size: 11px;
    color: rgba(200, 169, 110, 0.72);
    letter-spacing: 0.04em;
    margin-bottom: 4px;
  }

  .note-block p {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .trade-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .intl-trade {
    background: rgba(59, 130, 246, 0.25);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #93c5fd;
    flex: 1;
  }

  .tw-trade {
    background: rgba(249, 115, 22, 0.25);
    border: 1px solid rgba(249, 115, 22, 0.3);
    color: #fdba74;
    flex: 1;
  }

  .favorite-actions button:hover,
  .trade-row button:hover {
    transform: scale(0.98);
  }

  @media (max-width: 768px) {
    .favorite-card {
      padding: 14px;
      gap: 10px;
    }

    .favorite-top {
      flex-direction: column;
    }

    .favorite-actions {
      width: 100%;
    }

    .favorite-actions button,
    .trade-row button {
      flex: 1 1 100%;
      width: 100%;
    }
  }
</style>
