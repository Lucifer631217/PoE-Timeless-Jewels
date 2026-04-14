<script lang="ts">
  import { openTrade, type SearchResults, type SearchWithSeed, type TradeCondition } from '../skill_tree';
  import SearchResult from './SearchResult.svelte';
  import VirtualList from 'svelte-tiny-virtual-list';
  import { currentUiMessages, translateUi } from '../i18n';

  export let searchResults: SearchResults;
  export let highlight: (newSeed: number, passives: number[], conqueror?: string) => void;
  export let onSave: ((set: SearchWithSeed) => void) | undefined = undefined;
  export let onSaveGroup: ((sets: SearchWithSeed[]) => void) | undefined = undefined;
  export let groupResults = true;
  export let jewel: number;
  export let conqueror: string;
  export let platform: string;
  export let league: string;
  export let twLeague: string;
  export let tradeCondition: TradeCondition = 'instant_buyout';
  const computeSize = (r: SearchWithSeed) =>
    8 + 56 + r.skills.reduce((total, skill) => total + 36 + Object.keys(skill.stats).length * 24, 0);

  let expandedGroup: string | number = '';
</script>

{#if groupResults}
  <div class="group-list">
    {#each Object.keys(searchResults.grouped)
      .map((x) => parseInt(x))
      .sort((a, b) => a - b)
      .reverse() as k}
      <div class="group-header">
        <button class="group-toggle" on:click={() => (expandedGroup = expandedGroup === k ? '' : k)}>
          <span class="group-label">
            {translateUi('groupWeight', { weight: k })}
            <span class="group-count">[{searchResults.grouped[k].length}]</span>
          </span>
          <span class="group-arrow">
            {expandedGroup === k ? $currentUiMessages.collapse : $currentUiMessages.expand}
          </span>
        </button>
        <div class="group-trade-actions">
          {#if onSaveGroup}
            <button
              class="group-trade-btn group-save"
              on:click|stopPropagation={() => onSaveGroup?.(searchResults.grouped[k])}>
              {$currentUiMessages.saveGroup}
            </button>
          {/if}
          <button
            class="group-trade-btn intl-trade"
            on:click|stopPropagation={() =>
              openTrade(jewel, conqueror, searchResults.grouped[k], platform, league, 'international', tradeCondition)}>
            {$currentUiMessages.groupIntlTrade}
          </button>
          <button
            class="group-trade-btn tw-trade"
            on:click|stopPropagation={() =>
              openTrade(jewel, conqueror, searchResults.grouped[k], platform, twLeague, 'tw', tradeCondition)}>
            {$currentUiMessages.groupTwTrade}
          </button>
        </div>
      </div>

      {#if expandedGroup === k}
        <div class="group-content">
          <VirtualList
            height="auto"
            overscanCount={10}
            itemCount={searchResults.grouped[k].length}
            itemSize={searchResults.grouped[k].map(computeSize)}>
            <div slot="item" let:index let:style {style}>
              <SearchResult
                set={searchResults.grouped[k][index]}
                {highlight}
                {onSave}
                {jewel}
                {conqueror}
                {platform}
                {league}
                {twLeague}
                {tradeCondition} />
            </div>
          </VirtualList>
        </div>
      {/if}
    {/each}
  </div>
{:else}
  <div class="flat-list">
    {#if onSaveGroup && searchResults.raw.length > 0}
      <div class="flat-list-actions">
        <button class="group-trade-btn group-save" on:click={() => onSaveGroup?.(searchResults.raw)}>{$currentUiMessages.saveAll}</button>
      </div>
    {/if}
    <VirtualList
      height="auto"
      overscanCount={15}
      itemCount={searchResults.raw.length}
      itemSize={searchResults.raw.map(computeSize)}>
      <div slot="item" let:index let:style {style}>
        <SearchResult
          set={searchResults.raw[index]}
          {highlight}
          {onSave}
          {jewel}
          {conqueror}
          {platform}
          {league}
          {twLeague}
          {tradeCondition} />
      </div>
    </VirtualList>
  </div>
{/if}

<style>
  .group-list {
    display: flex;
    flex-direction: column;
    overflow: auto;
  }

  .group-header {
    font-size: 13px;
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .group-toggle {
    flex: 1;
    font-size: 13px;
    padding: 8px 14px;
    background: rgba(200, 169, 110, 0.08);
    border: 1px solid rgba(200, 169, 110, 0.2);
    border-radius: 16px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition:
      background 0.2s,
      border-color 0.2s,
      transform 0.18s ease;
    color: #e8d8b8;
  }

  .group-toggle:hover {
    background: rgba(200, 169, 110, 0.14);
    border-color: rgba(200, 169, 110, 0.35);
    transform: scale(0.99);
  }

  .group-label {
    font-weight: 500;
    color: #c8a96e;
  }

  .group-count {
    color: rgba(200, 169, 110, 0.6);
    font-weight: 400;
    font-size: 11px;
    margin-left: 4px;
  }

  .group-arrow {
    font-size: 11px;
    color: rgba(200, 169, 110, 0.72);
  }

  .group-content {
    display: flex;
    flex-direction: column;
    overflow: auto;
    min-height: 200px;
    margin-bottom: 6px;
  }

  .group-trade-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .group-trade-btn {
    padding: 6px 10px;
    border-radius: 16px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
  }

  .group-trade-btn.group-save,
  .group-trade-btn.intl-trade,
  .group-trade-btn.tw-trade {
    min-width: 120px;
  }

  .group-save {
    background: rgba(16, 185, 129, 0.2);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #a7f3d0;
  }

  .group-save:hover {
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

  .flat-list {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    overflow: auto;
  }

  .flat-list-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
  }

  @media (max-width: 768px) {
    .group-header {
      flex-direction: column;
      align-items: stretch;
    }

    .group-toggle {
      width: 100%;
      min-width: 0;
    }

    .group-label {
      min-width: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
    }

    .group-trade-actions {
      width: 100%;
      display: flex;
      flex-wrap: nowrap;
      gap: 6px;
    }

    .group-trade-btn {
      flex: 1 1 0;
      min-width: 0;
      white-space: normal;
      line-height: 1.45;
      text-align: center;
      padding: 6px 6px;
    }
  }
</style>
