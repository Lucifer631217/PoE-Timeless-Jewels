<script lang="ts">
  import type { SavedJewelDraft } from '../favorite_jewels';
  import { formatBilingualStatHtml } from '../skill_tree';

  export let draft: SavedJewelDraft;
  export let existing = false;
  export let onSave: (draft: SavedJewelDraft) => void;
  export let onCancel: () => void;

  let buildName = draft.buildName;
  let estimatedValue = draft.estimatedValue;
  let importantStatsText = draft.importantStats.join('\n');

  const handleSave = () => {
    onSave({
      ...draft,
      buildName: buildName.trim(),
      estimatedValue: estimatedValue.trim(),
      importantStats: importantStatsText
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    });
  };
</script>

<div class="favorite-editor">
  <div class="editor-header">
    <div>
      <h3>{existing ? '更新收藏珠寶' : '加入收藏珠寶'}</h3>
      <p>{draft.jewelLabel} / {draft.conquerorLabel} / Seed {draft.seed}</p>
    </div>
    <button class="editor-close" type="button" on:click={onCancel}>關閉</button>
  </div>

  <label class="editor-field">
    <span>流派 / 角色</span>
    <input bind:value={buildName} placeholder="例如：毒弓遊俠、冰矛秘術家" />
  </label>

  <label class="editor-field">
    <span>預估價值</span>
    <input bind:value={estimatedValue} placeholder="例如：50 Divine、3 鏡子" />
  </label>

  <label class="editor-field">
    <span>重要屬性</span>
    <textarea
      bind:value={importantStatsText}
      rows="4"
      placeholder="每行一個詞綴，也可用逗號分隔"></textarea>
  </label>

  {#if draft.snapshot.length > 0}
    <div class="editor-preview">
      <div class="preview-label">結果摘要</div>
      {#each draft.snapshot as passive}
        <div class="preview-item">
          <div class="preview-passive">{passive.passiveName}</div>
          {#if passive.stats.length > 0}
            <ul>
              {#each passive.stats as stat}
                <li>{@html formatBilingualStatHtml(stat)}</li>
              {/each}
            </ul>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <div class="editor-actions">
    <button class="primary-action" type="button" on:click={handleSave}>
      {existing ? '更新收藏' : '儲存收藏'}
    </button>
    <button class="secondary-action" type="button" on:click={onCancel}>取消</button>
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

  .editor-field span,
  .preview-label {
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

  .editor-field textarea {
    resize: vertical;
    min-height: 96px;
  }

  .editor-preview {
    border-radius: 16px;
    background: rgba(200, 169, 110, 0.05);
    border: 1px solid rgba(200, 169, 110, 0.12);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .preview-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .preview-passive {
    color: #e8d8b8;
    font-size: 12px;
    font-weight: 600;
  }

  .preview-item ul {
    margin: 0;
    padding-left: 18px;
    color: rgba(238, 226, 203, 0.84);
    font-size: 12px;
    line-height: 1.6;
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
</style>
