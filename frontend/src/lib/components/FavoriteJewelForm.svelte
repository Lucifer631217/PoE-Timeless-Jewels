<script lang="ts">
  import type { SavedJewelDraft } from '../favorite_jewels';
  import { currentUiMessages, locale, translateUi } from '../i18n';
  import { ANY_CONQUEROR } from '../skill_tree';
  import { translateConquerorName, translateJewelName } from '../zh_tw';

  export let draft: SavedJewelDraft;
  export let existing = false;
  export let onSave: (draft: SavedJewelDraft) => void;
  export let onCancel: () => void;

  const normalizeSeeds = (seeds: number[], fallbackSeed: number): number[] => {
    const values = seeds.length > 0 ? seeds : [fallbackSeed];
    return [...new Set(values)].sort((left, right) => left - right);
  };

  const summarizeSeeds = (seeds: number[]): string => {
    if (seeds.length <= 1) {
      return translateUi('favoriteSeedLabel', { seed: seeds[0] || draft.seed });
    }

    if (seeds.length <= 8) {
      return translateUi('favoriteSeedSummary', { seeds: seeds.join(', ') });
    }

    return translateUi('favoriteSeedSummaryMore', {
      seeds: seeds.slice(0, 8).join(', '),
      count: seeds.length
    });
  };

  let buildName = draft.buildName;
  let estimatedValue = draft.estimatedValue;
  let note = draft.note;

  $: normalizedSeeds = normalizeSeeds(draft.seeds, draft.seed);
  let seedSummary = '';
  $: $locale, seedSummary = summarizeSeeds(normalizedSeeds);
  $: localizedJewelLabel = translateJewelName(draft.jewel, draft.jewelLabel);
  $: localizedConquerorLabel =
    draft.conqueror === ANY_CONQUEROR ? $currentUiMessages.allConquerors : translateConquerorName(draft.conqueror);

  const handleSave = () => {
    onSave({
      ...draft,
      buildName: buildName.trim(),
      estimatedValue: estimatedValue.trim(),
      note: note.trim()
    });
  };
</script>

<div class="favorite-editor">
  <div class="editor-header">
    <div>
      <h3>{existing ? $currentUiMessages.favoriteEditorUpdate : $currentUiMessages.favoriteEditorCreate}</h3>
      <p>
        {localizedJewelLabel} / {localizedConquerorLabel} /
        {#if draft.entryType === 'group'}
          {$currentUiMessages.favoriteEditorGroup}
        {:else}
          {$currentUiMessages.favoriteEditorSingle}
        {/if}
      </p>
      <p class="seed-summary">{seedSummary}</p>
    </div>
    <button class="editor-close" type="button" on:click={onCancel}>{$currentUiMessages.close}</button>
  </div>

  <label class="editor-field">
    <span>{$currentUiMessages.buildNameLabel}</span>
    <input class="build-name-input" bind:value={buildName} placeholder={translateUi('buildNamePlaceholder')} />
  </label>

  <label class="editor-field">
    <span>{$currentUiMessages.priceLabel}</span>
    <input bind:value={estimatedValue} placeholder={translateUi('pricePlaceholder')} />
  </label>

  <label class="editor-field">
    <span>{$currentUiMessages.noteLabel}</span>
    <textarea bind:value={note} rows="3" placeholder={translateUi('notePlaceholder')}></textarea>
  </label>

  <div class="editor-actions">
    <button class="primary-action" type="button" on:click={handleSave}>
      {existing ? $currentUiMessages.saveFavoriteUpdate : $currentUiMessages.saveFavoriteCreate}
    </button>
    <button class="secondary-action" type="button" on:click={onCancel}>{$currentUiMessages.cancel}</button>
  </div>
</div>

<style>
  .favorite-editor {
    padding: 16px;
    border-radius: 20px;
    border: 1px solid rgba(200, 169, 110, 0.2);
    background: rgba(18, 18, 22, 0.85);
    backdrop-filter: blur(16px);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }

  .editor-header h3 {
    margin: 0;
    color: #e8d8b8;
    font-size: 15px;
  }

  .editor-header p {
    margin: 4px 0 0;
    color: rgba(200, 169, 110, 0.68);
    font-size: 12px;
    line-height: 1.6;
  }

  .seed-summary {
    color: #9cc3ff;
  }

  .editor-close {
    border: 1px solid rgba(200, 169, 110, 0.18);
    background: rgba(200, 169, 110, 0.08);
    color: rgba(200, 169, 110, 0.76);
    border-radius: 16px;
    padding: 8px 12px;
    transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
  }

  .editor-close:hover {
    border-color: rgba(200, 169, 110, 0.35);
    background: rgba(200, 169, 110, 0.14);
    transform: scale(0.98);
  }

  .editor-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .editor-field span {
    color: rgba(200, 169, 110, 0.72);
    font-size: 12px;
    letter-spacing: 0.04em;
  }

  .editor-field input,
  .editor-field textarea {
    border-radius: 16px;
    border: 1px solid rgba(200, 169, 110, 0.18);
    background: rgba(8, 8, 10, 0.72);
    color: #f4ead5;
    padding: 12px 14px;
    line-height: 1.6;
  }

  .editor-field .build-name-input {
    color: #67e8f9;
    text-shadow: 0 0 12px rgba(103, 232, 249, 0.18);
  }

  .editor-field .build-name-input::placeholder {
    color: rgba(103, 232, 249, 0.52);
  }

  .editor-field textarea {
    resize: vertical;
    min-height: 88px;
  }

  .editor-actions {
    display: flex;
    gap: 8px;
  }

  .primary-action,
  .secondary-action {
    border-radius: 16px;
    padding: 10px 14px;
    transition: transform 0.18s ease, opacity 0.18s ease, border-color 0.18s ease, background 0.18s ease;
  }

  .primary-action {
    background: rgba(59, 130, 246, 0.24);
    border: 1px solid rgba(59, 130, 246, 0.28);
    color: #bfdbfe;
    flex: 1;
  }

  .secondary-action {
    background: rgba(200, 169, 110, 0.08);
    border: 1px solid rgba(200, 169, 110, 0.16);
    color: rgba(200, 169, 110, 0.84);
  }

  .primary-action:hover,
  .secondary-action:hover {
    transform: scale(0.98);
  }

  @media (max-width: 768px) {
    .favorite-editor {
      padding: 14px;
      gap: 10px;
    }

    .editor-header,
    .editor-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .editor-close,
    .primary-action,
    .secondary-action {
      width: 100%;
    }
  }
</style>
