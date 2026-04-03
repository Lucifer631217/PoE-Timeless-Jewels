<script lang="ts">
  import type { SavedJewelEntry } from '../favorite_jewels';
  import { createTradeSeedResult } from '../favorite_jewels';
  import { formatBilingualStatHtml, openTrade, type TradeCondition } from '../skill_tree';

  export let entry: SavedJewelEntry;
  export let league = 'Standard';
  export let twLeague = 'Standard';
  export let tradeCondition: TradeCondition = 'instant_buyout';
  export let onEdit: (entry: SavedJewelEntry) => void;
  export let onDelete: (entry: SavedJewelEntry) => void;
</script>

<div class="favorite-card">
  <div class="favorite-top">
    <div>
      <div class="favorite-title">{entry.jewelLabel}</div>
      <div class="favorite-meta">
        <span>{entry.conquerorLabel}</span>
        <span>Seed {entry.seed}</span>
        {#if entry.buildName}
          <span>{entry.buildName}</span>
        {/if}
      </div>
    </div>
    <div class="favorite-actions">
      <button type="button" on:click={() => onEdit(entry)}>編輯</button>
      <button type="button" class="danger" on:click={() => onDelete(entry)}>刪除</button>
    </div>
  </div>

  {#if entry.estimatedValue}
    <div class="value-pill">預估價值：{entry.estimatedValue}</div>
  {/if}

  {#if entry.importantStats.length > 0}
    <div class="stats-row">
      {#each entry.importantStats as stat}
        <span>{@html formatBilingualStatHtml(stat)}</span>
      {/each}
    </div>
  {/if}

  {#if entry.snapshot.length > 0}
    <div class="snapshot-list">
      {#each entry.snapshot.slice(0, 4) as passive}
        <div class="snapshot-item">
          <div class="snapshot-passive">{passive.passiveName}</div>
          {#if passive.stats.length > 0}
            <ul>
              {#each passive.stats.slice(0, 3) as stat}
                <li>{@html formatBilingualStatHtml(stat)}</li>
              {/each}
            </ul>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <div class="trade-row">
    <button
      type="button"
      class="intl-trade"
      on:click={() =>
        openTrade(entry.jewel, entry.conqueror, [createTradeSeedResult(entry.seed)], 'PC', league, 'international', tradeCondition)}>
      國際服交易
    </button>
    <button
      type="button"
      class="tw-trade"
      on:click={() =>
        openTrade(entry.jewel, entry.conqueror, [createTradeSeedResult(entry.seed)], 'PC', twLeague, 'tw', tradeCondition)}>
      台服交易
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

  .favorite-actions {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .favorite-actions button,
  .trade-row button {
    border-radius: 16px;
    padding: 8px 12px;
    transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
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

  .value-pill {
    width: fit-content;
    border-radius: 999px;
    padding: 6px 12px;
    background: rgba(59, 130, 246, 0.14);
    border: 1px solid rgba(59, 130, 246, 0.18);
    color: #bfdbfe;
    font-size: 12px;
  }

  .stats-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .stats-row span {
    border-radius: 999px;
    padding: 6px 10px;
    background: rgba(200, 169, 110, 0.08);
    color: #ead8b4;
    border: 1px solid rgba(200, 169, 110, 0.14);
    font-size: 12px;
    line-height: 1.5;
  }

  .snapshot-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .snapshot-item {
    border-radius: 16px;
    padding: 10px 12px;
    background: rgba(200, 169, 110, 0.04);
    border: 1px solid rgba(200, 169, 110, 0.12);
  }

  .snapshot-passive {
    color: #f1e2c1;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .snapshot-item ul {
    margin: 0;
    padding-left: 18px;
    color: rgba(238, 226, 203, 0.82);
    font-size: 12px;
    line-height: 1.6;
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
</style>
