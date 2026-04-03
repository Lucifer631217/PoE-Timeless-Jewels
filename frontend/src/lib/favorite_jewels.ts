import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';
import type { SearchWithSeed } from './skill_tree';

export const FAVORITE_JEWELS_STORAGE_KEY = 'timelessJewelFavorites:v1';
export const FAVORITE_JEWELS_EXPORT_VERSION = 1;

export interface FavoriteSnapshotSkill {
  passive: number;
  passiveName: string;
  stats: string[];
}

export interface SavedJewelEntry {
  id: string;
  jewel: number;
  jewelLabel: string;
  conqueror: string;
  conquerorLabel: string;
  seed: number;
  buildName: string;
  importantStats: string[];
  estimatedValue: string;
  snapshot: FavoriteSnapshotSkill[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedJewelDraft extends Omit<SavedJewelEntry, 'createdAt' | 'updatedAt'> {}

export interface FavoriteJewelExportPayload {
  version: number;
  exportedAt: string;
  entries: SavedJewelEntry[];
}

export interface FavoriteJewelImportResult {
  imported: number;
  replaced: number;
  skipped: number;
  total: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
};

const isFavoriteSnapshotSkill = (value: unknown): value is FavoriteSnapshotSkill => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.passive === 'number' &&
    Number.isFinite(value.passive) &&
    typeof value.passiveName === 'string' &&
    Array.isArray(value.stats) &&
    value.stats.every((stat) => typeof stat === 'string')
  );
};

const sanitizeSnapshot = (snapshot: unknown): FavoriteSnapshotSkill[] => {
  if (!Array.isArray(snapshot)) {
    return [];
  }

  return snapshot
    .filter(isFavoriteSnapshotSkill)
    .map((item) => ({
      passive: item.passive,
      passiveName: item.passiveName.trim() || item.passive.toString(),
      stats: normalizeStringArray(item.stats)
    }))
    .filter((item) => item.stats.length > 0);
};

const isSavedJewelEntry = (value: unknown): value is SavedJewelEntry => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.jewel === 'number' &&
    typeof value.jewelLabel === 'string' &&
    typeof value.conqueror === 'string' &&
    typeof value.conquerorLabel === 'string' &&
    typeof value.seed === 'number' &&
    typeof value.buildName === 'string' &&
    Array.isArray(value.importantStats) &&
    typeof value.estimatedValue === 'string' &&
    Array.isArray(value.snapshot) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
};

const sanitizeEntry = (entry: SavedJewelEntry): SavedJewelEntry => ({
  id: entry.id,
  jewel: entry.jewel,
  jewelLabel: entry.jewelLabel.trim(),
  conqueror: entry.conqueror.trim(),
  conquerorLabel: entry.conquerorLabel.trim(),
  seed: entry.seed,
  buildName: entry.buildName.trim(),
  importantStats: normalizeStringArray(entry.importantStats),
  estimatedValue: entry.estimatedValue.trim(),
  snapshot: sanitizeSnapshot(entry.snapshot),
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt
});

const sortEntries = (entries: SavedJewelEntry[]): SavedJewelEntry[] =>
  [...entries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

const parseEntries = (raw: string | null): SavedJewelEntry[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const entries = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.entries)
        ? parsed.entries
        : [];

    return sortEntries(entries.filter(isSavedJewelEntry).map(sanitizeEntry));
  } catch {
    return [];
  }
};

const createFavoriteStore = () => {
  const store = writable<SavedJewelEntry[]>(browser ? parseEntries(localStorage.getItem(FAVORITE_JEWELS_STORAGE_KEY)) : []);

  if (browser) {
    store.subscribe((entries) => {
      const payload: FavoriteJewelExportPayload = {
        version: FAVORITE_JEWELS_EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        entries
      };

      localStorage.setItem(FAVORITE_JEWELS_STORAGE_KEY, JSON.stringify(payload));
    });
  }

  return store;
};

export const favoriteJewels = createFavoriteStore();

export const buildSavedJewelId = (jewel: number, conqueror: string, seed: number): string =>
  `${jewel}:${conqueror}:${seed}`;

export const findFavoriteJewel = (id: string): SavedJewelEntry | undefined =>
  get(favoriteJewels).find((entry) => entry.id === id);

export const upsertFavoriteJewel = (entry: SavedJewelEntry): boolean => {
  const sanitized = sanitizeEntry(entry);
  let replaced = false;

  favoriteJewels.update((entries) => {
    const index = entries.findIndex((item) => item.id === sanitized.id);
    if (index >= 0) {
      replaced = true;
      const nextEntries = [...entries];
      nextEntries[index] = sanitized;
      return sortEntries(nextEntries);
    }

    return sortEntries([sanitized, ...entries]);
  });

  return replaced;
};

export const removeFavoriteJewel = (id: string): void => {
  favoriteJewels.update((entries) => entries.filter((entry) => entry.id !== id));
};

export const serializeFavoriteJewels = (): string => {
  const payload: FavoriteJewelExportPayload = {
    version: FAVORITE_JEWELS_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    entries: get(favoriteJewels)
  };

  return JSON.stringify(payload, null, 2);
};

export const importFavoriteJewels = (text: string): FavoriteJewelImportResult => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('匯入失敗：檔案不是有效的 JSON。');
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.entries)) {
    throw new Error('匯入失敗：JSON 內容缺少 entries 陣列。');
  }

  const existingEntries = get(favoriteJewels);
  const mergedEntries = new Map(existingEntries.map((entry) => [entry.id, entry]));
  let imported = 0;
  let replaced = 0;
  let skipped = 0;

  for (const rawEntry of parsed.entries) {
    if (!isSavedJewelEntry(rawEntry)) {
      skipped += 1;
      continue;
    }

    const entry = sanitizeEntry(rawEntry);
    if (mergedEntries.has(entry.id)) {
      replaced += 1;
    } else {
      imported += 1;
    }

    mergedEntries.set(entry.id, entry);
  }

  favoriteJewels.set(sortEntries([...mergedEntries.values()]));

  return {
    imported,
    replaced,
    skipped,
    total: parsed.entries.length
  };
};

export const createTradeSeedResult = (seed: number): SearchWithSeed => ({
  seed,
  weight: 0,
  statCounts: {},
  skills: []
});
