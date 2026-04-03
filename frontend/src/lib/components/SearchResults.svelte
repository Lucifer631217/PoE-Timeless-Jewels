<script lang="ts">
  import type { SearchResults, SearchWithSeed, TradeCondition } from '../skill_tree';
  import SearchResult from './SearchResult.svelte';
  import VirtualList from 'svelte-tiny-virtual-list';

  export let searchResults: SearchResults;
  export let highlight: (newSeed: number, passives: number[]) => void;
  export let onSave: ((set: SearchWithSeed) => void) | undefined = undefined;
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
      <button class="group-header" on:click={() => (expandedGroup = expandedGroup === k ? '' : k)}>
        <span class="group-label">
          {k} 權重
          <span class="group-count">[{searchResults.grouped[k].length}]</span>
        </span>
        <span class="group-arrow">
          {expandedGroup === k ? '▾' : '▸'}
        </span>
      </button>

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
    padding: 8px 14px;
    background: rgba(200, 169, 110, 0.08);
    border: 1px solid rgba(200, 169, 110, 0.2);
    border-radius: 16px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, transform 0.18s ease;
    color: #e8d8b8;
  }

  .group-header:hover {
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

  .flat-list {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    overflow: auto;
  }
</style>
