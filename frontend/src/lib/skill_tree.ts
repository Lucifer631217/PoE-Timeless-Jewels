import type { Translation, Node, SkillTreeData, Group, Sprite, TranslationFile } from './skill_tree_types';
import { writable } from 'svelte/store';
import { data } from './types';
import { englishFallbackTranslations, getStatDescription, translateLeagueName } from './zh_tw';
import { officialTimelessTwStatTemplates } from './timeless_tw_stat_templates';

export let skillTree: SkillTreeData;

export const drawnGroups: Record<number, Group> = {};
export const drawnNodes: Record<number, Node> = {};

export const inverseSprites: Record<string, Sprite> = {};
export const inverseSpritesActive: Record<string, Sprite> = {};

export const inverseTranslations: Record<string, Translation> = {};

export const passiveToTree: Record<number, number> = {};

export const loadSkillTree = () => {
  skillTree = JSON.parse(data.SkillTree);
  console.log('Loaded skill tree', skillTree);

  Object.keys(skillTree.groups).forEach((groupId) => {
    const group = skillTree.groups[groupId];
    group.nodes.forEach((nodeId) => {
      const node = skillTree.nodes[nodeId];

      // Do not care about proxy passives
      if (node.isProxy) {
        return;
      }

      // Do not care about class starting nodes
      if ('classStartIndex' in node) {
        return;
      }

      // Do not care about cluster jewels
      if (node.expansionJewel) {
        if (node.expansionJewel.parent) {
          return;
        }
      }

      // Do not care about blighted nodes
      if (node.isBlighted) {
        return;
      }

      // Do not care about ascendancies
      if (node.ascendancyName) {
        return;
      }

      drawnGroups[parseInt(groupId)] = group;
      drawnNodes[parseInt(nodeId)] = node;
    });
  });

  Object.keys(skillTree.sprites.keystoneInactive['0.3835'].coords).forEach(
    (c) => (inverseSprites[c] = skillTree.sprites.keystoneInactive['0.3835'])
  );
  Object.keys(skillTree.sprites.notableInactive['0.3835'].coords).forEach(
    (c) => (inverseSprites[c] = skillTree.sprites.notableInactive['0.3835'])
  );
  Object.keys(skillTree.sprites.normalInactive['0.3835'].coords).forEach(
    (c) => (inverseSprites[c] = skillTree.sprites.normalInactive['0.3835'])
  );
  Object.keys(skillTree.sprites.masteryInactive['0.3835'].coords).forEach(
    (c) => (inverseSprites[c] = skillTree.sprites.masteryInactive['0.3835'])
  );

  Object.keys(skillTree.sprites.keystoneActive['0.3835'].coords).forEach(
    (c) => (inverseSpritesActive[c] = skillTree.sprites.keystoneActive['0.3835'])
  );
  Object.keys(skillTree.sprites.notableActive['0.3835'].coords).forEach(
    (c) => (inverseSpritesActive[c] = skillTree.sprites.notableActive['0.3835'])
  );
  Object.keys(skillTree.sprites.normalActive['0.3835'].coords).forEach(
    (c) => (inverseSpritesActive[c] = skillTree.sprites.normalActive['0.3835'])
  );
  Object.keys(skillTree.sprites.masteryInactive['0.3835'].coords).forEach(
    (c) => (inverseSpritesActive[c] = skillTree.sprites.masteryInactive['0.3835'])
  );

  Object.keys(skillTree.sprites.groupBackground['0.3835'].coords).forEach(
    (c) => (inverseSprites[c] = skillTree.sprites.groupBackground['0.3835'])
  );
  Object.keys(skillTree.sprites.frame['0.3835'].coords).forEach(
    (c) => (inverseSprites[c] = skillTree.sprites.frame['0.3835'])
  );

  const translationFiles = [
    data.StatTranslationsJSON,
    data.PassiveSkillStatTranslationsJSON,
    data.PassiveSkillAuraStatTranslationsJSON
  ];

  translationFiles.forEach((f) => {
    const translations: TranslationFile = JSON.parse(f);

    translations.descriptors.forEach((t) => {
      t.ids.forEach((id) => {
        if (!(id in inverseTranslations)) {
          inverseTranslations[id] = t;
        }
      });
    });
  });

  const treeToPassive = data.TreeToPassive;
  if (treeToPassive) {
    Object.keys(treeToPassive).forEach((k) => {
      const entry = treeToPassive[parseInt(k)];
      if (entry) {
        passiveToTree[entry.Index] = parseInt(k);
      }
    });
  }
};

const indexHandlers: Record<string, number> = {
  negate: -1,
  times_twenty: 1 / 20,
  canonical_stat: 1,
  per_minute_to_per_second: 60,
  milliseconds_to_seconds: 1000,
  display_indexable_support: 1,
  divide_by_one_hundred: 100,
  milliseconds_to_seconds_2dp_if_required: 1000,
  deciseconds_to_seconds: 10,
  old_leech_percent: 1,
  old_leech_permyriad: 10000,
  times_one_point_five: 1 / 1.5,
  '30%_of_value': 100 / 30,
  divide_by_one_thousand: 1000,
  divide_by_twelve: 12,
  divide_by_six: 6,
  per_minute_to_per_second_2dp_if_required: 60,
  '60%_of_value': 100 / 60,
  double: 1 / 2,
  negate_and_double: 1 / -2,
  multiply_by_four: 1 / 4,
  per_minute_to_per_second_0dp: 60,
  milliseconds_to_seconds_0dp: 1000,
  mod_value_to_item_class: 1,
  milliseconds_to_seconds_2dp: 1000,
  multiplicative_damage_modifier: 1,
  divide_by_one_hundred_2dp: 100,
  per_minute_to_per_second_1dp: 60,
  divide_by_one_hundred_2dp_if_required: 100,
  divide_by_ten_1dp_if_required: 10,
  milliseconds_to_seconds_1dp: 1000,
  divide_by_fifty: 50,
  per_minute_to_per_second_2dp: 60,
  divide_by_ten_0dp: 10,
  divide_by_one_hundred_and_negate: -100,
  tree_expansion_jewel_passive: 1,
  passive_hash: 1,
  divide_by_ten_1dp: 10,
  affliction_reward_type: 1,
  divide_by_five: 5,
  metamorphosis_reward_description: 1,
  divide_by_two_0dp: 2,
  divide_by_fifteen_0dp: 15,
  divide_by_three: 3,
  divide_by_twenty_then_double_0dp: 10,
  divide_by_four: 4
};

export type Point = {
  x: number;
  y: number;
};

export const toCanvasCoords = (x: number, y: number, offsetX: number, offsetY: number, scaling: number): Point => ({
  x: (Math.abs(skillTree.min_x) + x + offsetX) / scaling,
  y: (Math.abs(skillTree.min_y) + y + offsetY) / scaling
});

export const rotateAroundPoint = (center: Point, target: Point, angle: number): Point => {
  const radians = (Math.PI / 180) * angle;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const nx = cos * (target.x - center.x) + sin * (target.y - center.y) + center.x;
  const ny = cos * (target.y - center.y) - sin * (target.x - center.x) + center.y;
  return {
    x: nx,
    y: ny
  };
};

export const orbit16Angles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
export const orbit40Angles = [
  0, 10, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 135, 140, 150, 160, 170, 180, 190, 200, 210, 220, 225,
  230, 240, 250, 260, 270, 280, 290, 300, 310, 315, 320, 330, 340, 350
];

export const orbitAngleAt = (orbit: number, index: number): number => {
  const nodesInOrbit = skillTree.constants.skillsPerOrbit[orbit];
  if (nodesInOrbit == 16) {
    return orbit16Angles[orbit16Angles.length - index] || 0;
  } else if (nodesInOrbit == 40) {
    return orbit40Angles[orbit40Angles.length - index] || 0;
  } else {
    return 360 - (360 / nodesInOrbit) * index;
  }
};

export const calculateNodePos = (node: Node, offsetX: number, offsetY: number, scaling: number): Point => {
  if (node.group === undefined || node.orbit === undefined || node.orbitIndex === undefined) {
    return { x: 0, y: 0 };
  }

  const targetGroup = skillTree.groups[node.group];
  const targetAngle = orbitAngleAt(node.orbit, node.orbitIndex);

  const targetGroupPos = toCanvasCoords(targetGroup.x, targetGroup.y, offsetX, offsetY, scaling);
  const targetNodePos = toCanvasCoords(
    targetGroup.x,
    targetGroup.y - skillTree.constants.orbitRadii[node.orbit],
    offsetX,
    offsetY,
    scaling
  );
  return rotateAroundPoint(targetGroupPos, targetNodePos, targetAngle);
};

export const distance = (p1: Point, p2: Point): number =>
  Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

export const formatStats = (translation: Translation, stat: number): string | undefined => {
  let selectedTranslation = -1;

  for (let i = 0; i < translation.list.length; i++) {
    const t = translation.list[i];

    let matches = true;
    if (t.conditions?.length > 0) {
      const first = t.conditions[0];
      if (first.min !== undefined) {
        if (stat < first.min) {
          matches = false;
        }
      }

      if (first.max !== undefined) {
        if (stat > first.max) {
          matches = false;
        }
      }

      if (first.negated) {
        matches = !matches;
      }
    }

    if (matches) {
      selectedTranslation = i;
      break;
    }
  }

  if (selectedTranslation == -1) {
    return undefined;
  }

  const datum = translation.list[selectedTranslation];

  let finalStat = stat;

  if (datum.index_handlers !== undefined) {
    if (Array.isArray(datum.index_handlers)) {
      if (datum.index_handlers?.length > 0) {
        datum.index_handlers[0].forEach((handler) => {
          finalStat = finalStat / (indexHandlers[handler] || 1);
        });
      }
    } else {
      Object.keys(datum.index_handlers).forEach((handler) => {
        finalStat = finalStat / (indexHandlers[handler] || 1);
      });
    }
  }

  return datum.string
    .replace(/\{0(?::(.*?)d(.*?))\}/, '$1' + finalStat.toString() + '$2')
    .replace(`{0}`, parseFloat(finalStat.toFixed(2)).toString());
};

export const baseJewelRadius = 1800;

export const getAffectedNodes = (socket: Node): Node[] => {
  const result: Node[] = [];

  const socketPos = calculateNodePos(socket, 0, 0, 1);
  for (const node of Object.values(drawnNodes)) {
    const nodePos = calculateNodePos(node, 0, 0, 1);

    if (distance(nodePos, socketPos) < baseJewelRadius) {
      result.push(node);
    }
  }

  return result;
};

type Stat = { Index: number; ID: string; Text: string };

const statCache: Record<number, Stat> = {};
export const getStat = (id: number | string): Stat => {
  const nId = typeof id === 'string' ? parseInt(id) : id;
  if (!(nId in statCache)) {
    const rawStat = data.GetStatByIndex(nId);
    if (!rawStat) {
      return { Index: nId, ID: nId.toString(), Text: nId.toString() };
    }
    statCache[nId] = rawStat;
  }
  return statCache[nId];
};

export interface StatConfig {
  min: number;
  id: number;
  weight: number;
}

export interface ReverseSearchConfig {
  jewel: number;
  conqueror: string;
  nodes: number[];
  stats: StatConfig[];
  minTotalWeight: number;
}

export interface SearchWithSeed {
  seed: number;
  weight: number;
  statCounts: Record<number, number>;
  conqueror?: string;
  skills: {
    passive: number;
    stats: { [key: string]: number };
  }[];
}

export interface SearchResults {
  grouped: { [key: number]: SearchWithSeed[] };
  raw: SearchWithSeed[];
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export type BilingualStatParts = {
  localized: string;
  english?: string;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const splitBilingualStatText = (value: string): BilingualStatParts => {
  const separator = ' / ';
  const separatorIndex = value.indexOf(separator);
  if (separatorIndex < 0) {
    return {
      localized: value
    };
  }

  const localized = value.slice(0, separatorIndex).trim();
  const english = value.slice(separatorIndex + separator.length).trim();

  return {
    localized,
    english: english || undefined
  };
};

export const formatBilingualStatHtml = (value: string): string => {
  const parts = splitBilingualStatText(value);
  const localizedHtml = escapeHtml(parts.localized);
  if (!parts.english) {
    return `<span style="color:#f4ead5">${localizedHtml}</span>`;
  }

  const keywordColors: Record<string, string> = {
    physical: '#c79d93',
    cast: '#b3f8fe',
    fire: '#ff9a77',
    cold: '#93d8ff',
    lightning: '#f8cb76',
    attack: '#da814d',
    life: '#c96e6e',
    chaos: '#d8a7d3',
    unique: '#af6025',
    critical: '#b2a7d6'
  };

  const colorizeEnglishKeywords = (raw: string): string => {
    let result = escapeHtml(raw);
    Object.entries(keywordColors).forEach(([keyword, color]) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      result = result.replace(regex, (match) => `<span style="color:${color};font-weight:600">${match}</span>`);
    });
    return result;
  };

  const englishHtml = colorizeEnglishKeywords(parts.english);
  return `<span style="color:#f4ead5">${localizedHtml}</span><span style="color:rgba(200,169,110,0.62)"> / </span><span style="color:#9cc3ff">${englishHtml}</span>`;
};

const isTranslationMatch = (value: number, condition?: { min?: number; max?: number; negated?: boolean }): boolean => {
  if (!condition) {
    return true;
  }

  let matches = true;
  if (condition.min !== undefined && value < condition.min) {
    matches = false;
  }

  if (condition.max !== undefined && value > condition.max) {
    matches = false;
  }

  if (condition.negated) {
    matches = !matches;
  }

  return matches;
};

const pickTranslationString = (translation: Translation, value?: number): string | undefined => {
  if (!translation.list || translation.list.length === 0) {
    return undefined;
  }

  if (value === undefined) {
    return translation.list[0]?.string;
  }

  for (const item of translation.list) {
    const firstCondition = item.conditions?.[0];
    if (isTranslationMatch(value, firstCondition)) {
      return item.string;
    }
  }

  return translation.list[0]?.string;
};

const normalizeTemplatePlaceholders = (template: string): string =>
  template.replace(/\{\d(?::(.*?)d(.*?))\}/g, '$1#$2').replace(/\{\d\}/g, '#');

const getEnglishStatTemplate = (id: number | string, roll?: number): string => {
  const nId = typeof id === 'string' ? parseInt(id) : id;
  const stat = getStat(nId);
  const translation = inverseTranslations[stat.ID];
  let englishTemplate = normalizeTemplatePlaceholders(stat.Text || stat.ID);

  if (translation && translation.list && translation.list.length) {
    const selectedTemplate = pickTranslationString(translation, roll);
    if (selectedTemplate) {
      englishTemplate = normalizeTemplatePlaceholders(selectedTemplate);
    }
  }

  return englishTemplate;
};

const applyRollToTemplate = (template: string, roll?: number): string => {
  if (roll === undefined) {
    return template;
  }

  return template.replace('#', roll.toString());
};

const applyValuesToTemplate = (template: string, values: string[]): string => {
  let valueIndex = 0;
  return template.replace(/#/g, () => values[valueIndex++] ?? '#');
};

const buildRenderedStatMatcher = (template: string): RegExp => {
  const pattern = escapeRegex(template).replace(/#/g, '([+-]?\\d+(?:\\.\\d+)?)');
  return new RegExp(`^${pattern}$`, 'i');
};

export const translateStat = (id: number | string, roll?: number | undefined): string => {
  const nId = typeof id === 'string' ? parseInt(id) : id;
  const translationText = getEnglishStatTemplate(nId, roll);
  // Prefer exact EN->TW template mapping first to keep bilingual lines aligned.
  const localizedTemplate =
    englishFallbackTranslations[translationText] ||
    englishFallbackTranslations[translationText.replace(/\\n/g, '\n')] ||
    englishFallbackTranslations[translationText.replace(/\n/g, '\\n')] ||
    officialTimelessTwStatTemplates[nId] ||
    getStatDescription(nId, translationText);
  if (roll !== undefined) {
    return applyRollToTemplate(localizedTemplate, roll);
  }

  return localizedTemplate;
};

export const translateStatEnglish = (id: number | string, roll?: number | undefined): string => {
  const template = getEnglishStatTemplate(id, roll);
  if (!template) {
    return '';
  }
  return applyRollToTemplate(template, roll).trim();
};

export const translateStatBilingual = (id: number | string, roll?: number | undefined): string => {
  const localized = (translateStat(id, roll) || '').trim();
  const english = (translateStatEnglish(id, roll) || '').trim();

  if (!localized && !english) {
    return '';
  }
  if (!english || localized.toLowerCase() === english.toLowerCase()) {
    return localized;
  }

  if (!localized) {
    return english;
  }

  return `${localized} / ${english}`;
};

export const translateRenderedStatBilingual = (id: number | string, englishText: string): string => {
  const trimmedEnglish = englishText.trim();
  const englishTemplate = getEnglishStatTemplate(id).trim();
  const localizedTemplate = translateStat(id).trim();

  if (!trimmedEnglish) {
    return translateStatBilingual(id);
  }

  if (trimmedEnglish.toLowerCase() === englishTemplate.toLowerCase()) {
    return translateStatBilingual(id);
  }

  const matches = trimmedEnglish.match(buildRenderedStatMatcher(englishTemplate));
  if (!matches) {
    return trimmedEnglish;
  }

  const values = matches.slice(1);
  const localized = applyValuesToTemplate(localizedTemplate, values).trim();
  if (!localized || localized.toLowerCase() === trimmedEnglish.toLowerCase()) {
    return trimmedEnglish;
  }

  return `${localized} / ${trimmedEnglish}`;
};

export const translateRenderedStatBilingualFromCandidates = (ids: number[], englishText: string): string => {
  const trimmedEnglish = englishText.trim();
  if (!trimmedEnglish || ids.length === 0) {
    return trimmedEnglish;
  }

  const matchedIds = ids.filter((id) =>
    buildRenderedStatMatcher(getEnglishStatTemplate(id).trim()).test(trimmedEnglish)
  );
  if (matchedIds.length !== 1) {
    return trimmedEnglish;
  }

  return translateRenderedStatBilingual(matchedIds[0], trimmedEnglish);
};

const maxTradeTargetsPerQuery = 180;

export type TradeOpenFeedback = {
  level: 'info' | 'warning';
  title: string;
  message: string;
  totalTabs: number;
  openedTabs: number;
  blockedTabs: number;
};

export const tradeOpenFeedback = writable<TradeOpenFeedback | null>(null);

export const clearTradeOpenFeedback = () => {
  tradeOpenFeedback.set(null);
};

const tradeStatNames: { [key: number]: { [key: string]: string } } = {
  1: {
    Ahuana: 'explicit.pseudo_timeless_jewel_ahuana',
    Xibaqua: 'explicit.pseudo_timeless_jewel_xibaqua',
    Doryani: 'explicit.pseudo_timeless_jewel_doryani',
    Zerphi: 'explicit.pseudo_timeless_jewel_zerphi'
  },
  2: {
    Kaom: 'explicit.pseudo_timeless_jewel_kaom',
    Rakiata: 'explicit.pseudo_timeless_jewel_rakiata',
    Kiloava: 'explicit.pseudo_timeless_jewel_kiloava',
    Akoya: 'explicit.pseudo_timeless_jewel_akoya'
  },
  3: {
    Deshret: 'explicit.pseudo_timeless_jewel_deshret',
    Balbala: 'explicit.pseudo_timeless_jewel_balbala',
    Asenath: 'explicit.pseudo_timeless_jewel_asenath',
    Nasima: 'explicit.pseudo_timeless_jewel_nasima'
  },
  4: {
    Venarius: 'explicit.pseudo_timeless_jewel_venarius',
    Maxarius: 'explicit.pseudo_timeless_jewel_maxarius',
    Dominus: 'explicit.pseudo_timeless_jewel_dominus',
    Avarius: 'explicit.pseudo_timeless_jewel_avarius'
  },
  5: {
    Cadiro: 'explicit.pseudo_timeless_jewel_cadiro',
    Victario: 'explicit.pseudo_timeless_jewel_victario',
    Chitus: 'explicit.pseudo_timeless_jewel_chitus',
    Caspiro: 'explicit.pseudo_timeless_jewel_caspiro'
  },
  6: {
    Vorana: 'explicit.pseudo_timeless_jewel_vorana',
    Uhtred: 'explicit.pseudo_timeless_jewel_uhtred',
    Medved: 'explicit.pseudo_timeless_jewel_medved'
  }
};

const twTradeStatNames: { [key: number]: string } = {
  1: 'explicit.stat_1153060748',
  2: 'explicit.stat_2506822474',
  3: 'explicit.stat_1583095328',
  4: 'explicit.stat_3541891041',
  5: 'explicit.stat_795000865'
};

type TradeServer = 'international' | 'tw';
export type TradeCondition = 'instant_buyout' | 'in_person_online_in_league';
export const ANY_CONQUEROR = '__any__';

type TradeStatFilter = {
  id: string;
  value: { min: number; max: number };
};

type TradeStatCategory = {
  type: 'count';
  value: { min: number };
  filters: TradeStatFilter[];
};

type TradeSeedTarget = {
  seed: number;
  statId: string;
};

const resolveTradeStatIds = (jewel: number, conqueror: string, server: TradeServer): string[] => {
  if (conqueror === ANY_CONQUEROR) {
    const allConquerorStatIds = Array.from(
      new Set(Object.values(tradeStatNames[jewel] || {}).filter((value): value is string => !!value))
    );
    if (allConquerorStatIds.length > 0) {
      return allConquerorStatIds;
    }

    if (server === 'tw') {
      const twFallback = twTradeStatNames[jewel];
      if (twFallback) {
        return [twFallback];
      }
    }
  }

  const primary = tradeStatNames[jewel]?.[conqueror];
  if (primary) {
    return [primary];
  }

  if (server === 'international') {
    return [];
  }

  const fallback = twTradeStatNames[jewel];
  return fallback ? [fallback] : [];
};

const buildTradeTargets = (
  jewel: number,
  conqueror: string,
  results: SearchWithSeed[],
  server: TradeServer
): TradeSeedTarget[] => {
  const targets: TradeSeedTarget[] = [];

  results.forEach((entry) => {
    if (!Number.isFinite(entry.seed)) {
      return;
    }

    const targetConqueror = entry.conqueror || conqueror;
    const statIds = resolveTradeStatIds(jewel, targetConqueror, server);
    statIds.forEach((statId) => {
      targets.push({
        seed: entry.seed,
        statId
      });
    });
  });

  return targets;
};

const countTradeTargetsForResult = (
  jewel: number,
  conqueror: string,
  result: SearchWithSeed,
  server: TradeServer
): number => {
  if (!Number.isFinite(result.seed)) {
    return 0;
  }

  return resolveTradeStatIds(jewel, result.conqueror || conqueror, server).length;
};

const chunkTradeResults = (
  jewel: number,
  conqueror: string,
  results: SearchWithSeed[],
  server: TradeServer
): SearchWithSeed[][] => {
  if (results.length === 0) {
    return [results];
  }

  const chunks: SearchWithSeed[][] = [];
  let currentChunk: SearchWithSeed[] = [];
  let currentTargetCount = 0;

  results.forEach((result) => {
    const targetCount = countTradeTargetsForResult(jewel, conqueror, result, server);

    if (currentChunk.length > 0 && currentTargetCount + targetCount > maxTradeTargetsPerQuery) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentTargetCount = 0;
    }

    currentChunk.push(result);
    currentTargetCount += targetCount;

    if (currentTargetCount >= maxTradeTargetsPerQuery) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentTargetCount = 0;
    }
  });

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
};

const resolveTradeStatusOption = (condition: TradeCondition): 'onlineleague' | 'securable' => {
  if (condition === 'instant_buyout') {
    return 'securable';
  }

  return 'onlineleague';
};

const constructQueryFromTargets = (targets: TradeSeedTarget[], condition: TradeCondition = 'instant_buyout') => {
  const statusOption = resolveTradeStatusOption(condition);
  const statFilters: TradeStatFilter[] = targets.map((target) => ({
    id: target.statId,
    value: {
      min: target.seed,
      max: target.seed
    }
  }));
  const stats: TradeStatCategory[] =
    statFilters.length > 0
      ? [
          {
            type: 'count',
            value: { min: 1 },
            filters: statFilters
          }
        ]
      : [];

  const query: Record<string, unknown> = {
    status: {
      option: statusOption
    },
    stats
  };

  return {
    query,
    sort: {
      price: 'asc'
    }
  };
};

export const constructQuery = (
  jewel: number,
  conqueror: string,
  results: SearchWithSeed[],
  condition: TradeCondition = 'instant_buyout',
  server: TradeServer = 'international'
) => constructQueryFromTargets(buildTradeTargets(jewel, conqueror, results, server), condition);

export const openTrade = (
  jewel: number,
  conqueror: string,
  results: SearchWithSeed[],
  platform: string,
  league: string,
  server: TradeServer = 'international',
  condition: TradeCondition = 'instant_buyout'
) => {
  if (results.length === 0) {
    clearTradeOpenFeedback();
    return {
      totalTabs: 0,
      openedTabs: 0,
      blockedTabs: 0
    };
  }

  const normalizedPlatform = !platform || typeof platform !== 'string' ? 'PC' : platform;
  const normalizedLeague = !league || typeof league !== 'string' ? 'Standard' : league;
  const resultChunks = chunkTradeResults(jewel, conqueror, results, server);
  const leagueSegment =
    server === 'tw'
      ? encodeURIComponent(translateLeagueName(normalizedLeague).trim() || translateLeagueName('Standard'))
      : encodeURIComponent(normalizedLeague.trim() || 'Standard');

  let url: URL;
  if (server === 'tw') {
    url = new URL(`https://pathofexile.tw/trade/search/${leagueSegment}`);
  } else {
    const platformSegment =
      normalizedPlatform.toUpperCase() === 'PC' ? '' : `/${encodeURIComponent(normalizedPlatform.toLowerCase())}`;
    url = new URL(`https://www.pathofexile.com/trade/search${platformSegment}/${leagueSegment}`);
  }

  const openedTabs = typeof window !== 'undefined' ? resultChunks.map(() => window.open('', '_blank')) : [];
  let openedCount = 0;
  let blockedCount = 0;

  resultChunks.forEach((chunk, index) => {
    const tradeUrl = new URL(url.toString());
    tradeUrl.searchParams.set(
      'q',
      JSON.stringify(constructQueryFromTargets(buildTradeTargets(jewel, conqueror, chunk, server), condition))
    );

    console.log('opening trade', {
      url: tradeUrl.toString(),
      batch: index + 1,
      totalBatches: resultChunks.length,
      targetCount: buildTradeTargets(jewel, conqueror, chunk, server).length,
      resultSeeds: chunk.map((entry) => `${entry.seed}:${entry.conqueror || conqueror}`)
    });

    const openedTab = openedTabs[index];
    if (openedTab && !openedTab.closed) {
      try {
        openedTab.location.replace(tradeUrl.toString());
        openedCount += 1;
        return;
      } catch {
        // Fall back to direct open below.
      }
    }

    if (typeof window !== 'undefined') {
      const directTab = window.open(tradeUrl.toString(), '_blank');
      if (directTab && !directTab.closed) {
        openedCount += 1;
      } else {
        blockedCount += 1;
      }
    }
  });

  if (typeof window !== 'undefined') {
    if (blockedCount > 0) {
      tradeOpenFeedback.set({
        level: 'warning',
        title: '交易分頁被瀏覽器擋下',
        message: `這次需要開啟 ${resultChunks.length} 個分頁，目前成功 ${openedCount} 個、被擋下 ${blockedCount} 個。請允許此網站的彈出式視窗與重新導向後再重試。`,
        totalTabs: resultChunks.length,
        openedTabs: openedCount,
        blockedTabs: blockedCount
      });
    } else if (resultChunks.length > 1) {
      tradeOpenFeedback.set({
        level: 'info',
        title: '已開啟多個交易分頁',
        message: `這次依 trade filter 上限分成 ${resultChunks.length} 個分頁，每頁最多 180 個條件。若之後沒有反應，請先允許此網站的彈出式視窗與重新導向。`,
        totalTabs: resultChunks.length,
        openedTabs: openedCount,
        blockedTabs: blockedCount
      });
    } else {
      clearTradeOpenFeedback();
    }
  }

  return {
    totalTabs: resultChunks.length,
    openedTabs: openedCount,
    blockedTabs: blockedCount
  };
};
