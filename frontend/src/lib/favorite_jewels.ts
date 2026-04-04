import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';
import type { SearchWithSeed } from './skill_tree';

export const FAVORITE_JEWELS_STORAGE_KEY = 'timelessJewelFavorites:v1';
export const FAVORITE_JEWELS_EXPORT_VERSION = 1;

export type FavoriteEntryType = 'single' | 'group';

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
  entryType: FavoriteEntryType;
  seed: number;
  seeds: number[];
  buildName: string;
  note: string;
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

const normalizeSeeds = (value: unknown, fallbackSeed?: unknown): number[] => {
  const seedSet = new Set<number>();

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (typeof item === 'number' && Number.isFinite(item)) {
        seedSet.add(Math.trunc(item));
      }
    });
  }

  if (typeof fallbackSeed === 'number' && Number.isFinite(fallbackSeed)) {
    seedSet.add(Math.trunc(fallbackSeed));
  }

  return [...seedSet].sort((left, right) => left - right);
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
      passive: Math.trunc(item.passive),
      passiveName: item.passiveName.trim() || item.passive.toString(),
      stats: normalizeStringArray(item.stats)
    }))
    .filter((item) => item.stats.length > 0);
};

const sanitizeEntryFromUnknown = (value: unknown): SavedJewelEntry | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.jewel !== 'number' ||
    !Number.isFinite(value.jewel) ||
    typeof value.jewelLabel !== 'string' ||
    typeof value.conqueror !== 'string' ||
    typeof value.conquerorLabel !== 'string'
  ) {
    return null;
  }

  const seeds = normalizeSeeds(value.seeds, value.seed);
  if (seeds.length === 0) {
    return null;
  }

  const legacyImportantStats = normalizeStringArray(value.importantStats);
  const rawNote = typeof value.note === 'string' ? value.note.trim() : legacyImportantStats.join('、');

  const now = new Date().toISOString();
  const createdAt = typeof value.createdAt === 'string' && value.createdAt ? value.createdAt : now;
  const updatedAt = typeof value.updatedAt === 'string' && value.updatedAt ? value.updatedAt : now;

  const declaredEntryType = value.entryType === 'group' || value.entryType === 'single' ? value.entryType : undefined;
  const entryType: FavoriteEntryType = declaredEntryType || (seeds.length > 1 ? 'group' : 'single');

  return {
    id: value.id,
    jewel: Math.trunc(value.jewel),
    jewelLabel: value.jewelLabel.trim(),
    conqueror: value.conqueror.trim(),
    conquerorLabel: value.conquerorLabel.trim(),
    entryType,
    seed: seeds[0],
    seeds,
    buildName: typeof value.buildName === 'string' ? value.buildName.trim() : '',
    note: rawNote,
    estimatedValue: typeof value.estimatedValue === 'string' ? value.estimatedValue.trim() : '',
    snapshot: sanitizeSnapshot(value.snapshot),
    createdAt,
    updatedAt
  };
};

const sanitizeEntry = (entry: SavedJewelEntry): SavedJewelEntry => {
  const sanitized = sanitizeEntryFromUnknown(entry);
  if (!sanitized) {
    throw new Error('Invalid favorite jewel entry.');
  }

  return sanitized;
};

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

    return sortEntries(entries.map(sanitizeEntryFromUnknown).filter((entry): entry is SavedJewelEntry => !!entry));
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

export const buildSavedJewelGroupId = (jewel: number, conqueror: string, seeds: number[]): string =>
  `${jewel}:${conqueror}:group:${normalizeSeeds(seeds).join(',')}`;

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
    const entry = sanitizeEntryFromUnknown(rawEntry);
    if (!entry) {
      skipped += 1;
      continue;
    }

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
