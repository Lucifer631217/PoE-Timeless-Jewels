<script lang="ts">
  import Select from 'svelte-select';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { proxy } from 'comlink';
  import { onMount, tick } from 'svelte';
  import SkillTree from '../../lib/components/SkillTree.svelte';
  import FavoriteJewelCard from '../../lib/components/FavoriteJewelCard.svelte';
  import FavoriteJewelForm from '../../lib/components/FavoriteJewelForm.svelte';
  import SearchResults from '../../lib/components/SearchResults.svelte';
  import {
    buildSavedJewelId,
    buildSavedJewelGroupId,
    favoriteJewels,
    findFavoriteJewel,
    importFavoriteJewels,
    removeFavoriteJewel,
    serializeFavoriteJewels,
    upsertFavoriteJewel,
    type FavoriteQueryContext,
    type FavoriteTradeTarget,
    type FavoriteSnapshotSkill,
    type SavedJewelDraft,
    type SavedJewelEntry
  } from '../../lib/favorite_jewels';
  import { isSoloSelfFoundLeague, pickCurrentLeagueValue, type LeagueLike } from '../../lib/leagues';
  import {
    ANY_CONQUEROR,
    clearTradeOpenFeedback,
    formatBilingualStatHtml,
    getAffectedNodes,
    openTrade,
    skillTree,
    splitBilingualStatText,
    tradeOpenFeedback,
    translateStatBilingual,
    type ReverseSearchConfig,
    type SearchResults as SearchResultsType,
    type SearchWithSeed,
    type StatConfig,
    type TradeCondition
  } from '../../lib/skill_tree';
  import type { Node } from '../../lib/skill_tree_types';
  import { data, calculator } from '../../lib/types';
  import { APP_VERSION } from '../../lib/version';
  import { statValues } from '../../lib/values';
  import { syncWrap } from '../../lib/worker';
  import { translateConquerorName, translateJewelName, translateLeagueName } from '../../lib/zh_tw';

  type SelectOption<T> = {
    value: T;
    label: string;
  };

  type CalculatedSeedResult = {
    node: number;
    conqueror: string;
    result: data.AlternatePassiveSkillInformation;
  };

  const anyConquerorOption: SelectOption<string> = {
    value: ANY_CONQUEROR,
    label: '全部征服者'
  };
  const appVersion = APP_VERSION;
  const mobileBreakpoint = 1024;
  const detectMobileViewport = (): boolean => browser && window.innerWidth <= mobileBreakpoint;

  const searchParams = $page.url.searchParams;
  const timelessJewels = data.TimelessJewels || {};
  const timelessJewelConquerors = data.TimelessJewelConquerors || {};
  const treeToPassive = data.TreeToPassive || {};
  const timelessJewelSeedRanges = data.TimelessJewelSeedRanges || {};
  const allPossibleStats: Record<string, Record<string, number>> = data.PossibleStats
    ? JSON.parse(data.PossibleStats)
    : {};

  const readBooleanPreference = (key: string, fallback: boolean): boolean => {
    if (!browser) {
      return fallback;
    }

    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : raw === 'true';
    } catch {
      return fallback;
    }
  };

  const readStringPreference = (key: string, fallback: string): string => {
    if (!browser) {
      return fallback;
    }

    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  };

  const writePreference = (key: string, value: string) => {
    if (!browser) {
      return;
    }

    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage write failures so the page doesn't crash.
    }
  };

  const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values));

  const jewels = Object.keys(timelessJewels)
    .map((key) => ({
      value: parseInt(key),
      label: translateJewelName(parseInt(key), timelessJewels[parseInt(key)] || '')
    }))
    .sort((left, right) => left.value - right.value);

  let selectedJewel: SelectOption<number> | undefined = searchParams.has('jewel')
    ? jewels.find((jewel) => jewel.value.toString() === searchParams.get('jewel'))
    : undefined;

  $: selectedJewelValue = selectedJewel?.value;
  $: currentConquerors = selectedJewelValue !== undefined ? timelessJewelConquerors[selectedJewelValue] || {} : {};
  $: selectedSeedRanges = selectedJewelValue !== undefined ? timelessJewelSeedRanges[selectedJewelValue] : undefined;
  $: minSeed = selectedSeedRanges?.Min || 0;
  $: maxSeed = selectedSeedRanges?.Max || 0;

  $: conquerors = selectedJewel
    ? [
        anyConquerorOption,
        ...Object.keys(currentConquerors).map((key) => ({
          value: key,
          label: translateConquerorName(key)
        }))
      ]
    : [];

  let selectedConqueror: SelectOption<string> | undefined = searchParams.has('conqueror')
    ? (() => {
        const value = searchParams.get('conqueror') || '';
        return {
          value,
          label: value === ANY_CONQUEROR ? anyConquerorOption.label : translateConquerorName(value)
        };
      })()
    : undefined;

  $: if (
    selectedConqueror &&
    selectedConqueror.value !== ANY_CONQUEROR &&
    selectedJewelValue !== undefined &&
    !currentConquerors[selectedConqueror.value]
  ) {
    selectedConqueror = undefined;
  }

  let seed = searchParams.has('seed') ? parseInt(searchParams.get('seed') || '0') : 0;
  let circledNode: number | undefined = searchParams.has('location')
    ? parseInt(searchParams.get('location') || '0')
    : undefined;

  $: affectedNodes =
    circledNode !== undefined && skillTree.nodes[circledNode]
      ? getAffectedNodes(skillTree.nodes[circledNode]).filter((node) => !node.isJewelSocket && !node.isMastery)
      : [];

  $: selectedConquerorValue = selectedConqueror?.value || '';
  $: selectedConquerorIsAny = selectedConquerorValue === ANY_CONQUEROR;
  $: selectedConquerorKeys = selectedConquerorIsAny
    ? Object.keys(currentConquerors)
    : selectedConquerorValue && currentConquerors[selectedConquerorValue]
    ? [selectedConquerorValue]
    : [];
  $: hasValidConquerorSelection = selectedConquerorKeys.length > 0;
  $: seedResults =
    !seed || !selectedJewel || !hasValidConquerorSelection
      ? []
      : affectedNodes
          .filter((node) => node.skill !== undefined && !!treeToPassive[node.skill])
          .flatMap((node) => {
            const skillId = node.skill;
            if (skillId === undefined) {
              return [];
            }

            const entry = treeToPassive[skillId];
            return selectedConquerorKeys.map((conquerorValue) => ({
              node: skillId,
              conqueror: conquerorValue,
              result: calculator.Calculate(entry ? entry.Index : 0, seed, selectedJewel?.value || 0, conquerorValue)
            }));
          })
          .filter((result): result is CalculatedSeedResult => !!result.result);

  let selectedStats: Record<string, StatConfig> = {};
  if (searchParams.has('stat')) {
    searchParams.getAll('stat').forEach((stat) => {
      const statId = parseInt(stat);
      selectedStats[statId] = {
        id: statId,
        min: 0,
        weight: 1
      };
    });
  }

  let mode = searchParams.get('mode') || 'stats';
  let disabled = new Set<number>();
  const hasDisabledFromQuery = searchParams.has('disabled');
  let defaultDisabledInitializedNode: number | undefined = undefined;
  if (searchParams.has('disabled')) {
    searchParams.getAll('disabled').forEach((value) => disabled.add(parseInt(value)));
  }

  $: if (
    !hasDisabledFromQuery &&
    circledNode !== undefined &&
    affectedNodes.length > 0 &&
    defaultDisabledInitializedNode !== circledNode
  ) {
    const defaultDisabled = new Set<number>();
    affectedNodes.forEach((node) => {
      if (node.skill !== undefined && !node.isNotable) {
        defaultDisabled.add(node.skill);
      }
    });
    disabled = defaultDisabled;
    defaultDisabledInitializedNode = circledNode;
    updateUrl();
  }

  const updateUrl = () => {
    if (!browser) {
      return;
    }

    const url = new URL(window.location.origin + window.location.pathname);
    selectedJewel && url.searchParams.append('jewel', selectedJewel.value.toString());
    selectedConqueror && url.searchParams.append('conqueror', selectedConqueror.value);
    seed && url.searchParams.append('seed', seed.toString());
    circledNode && url.searchParams.append('location', circledNode.toString());
    mode && url.searchParams.append('mode', mode);
    disabled.forEach((value) => url.searchParams.append('disabled', value.toString()));
    Object.keys(selectedStats).forEach((value) => url.searchParams.append('stat', value));
    goto(url.toString(), { keepFocus: true, noScroll: true, replaceState: true });
  };

  const setMode = (newMode: string) => {
    mode = newMode;
    updateUrl();
  };

  const clickNode = (node: Node) => {
    if (node.isJewelSocket && node.skill !== undefined) {
      circledNode = node.skill;
      updateUrl();
      return;
    }

    if (!node.isMastery && node.skill !== undefined) {
      if (disabled.has(node.skill)) {
        disabled.delete(node.skill);
      } else {
        disabled.add(node.skill);
      }

      disabled = disabled;
      updateUrl();
    }
  };

  const getStatValue = (id: string): number => (statValues as Record<string, number>)[id] || 0;

  $: availableStats =
    selectedJewelValue !== undefined ? Object.keys(allPossibleStats[selectedJewelValue.toString()] || {}) : [];
  $: statItems = availableStats
    .map((statId) => {
      const id = parseInt(statId);
      return {
        label: translateStatBilingual(id),
        value: id
      };
    })
    .filter((stat) => !(stat.value in selectedStats));

  let statSelector: Select;
  const selectStat = (event: CustomEvent<{ value: number }>) => {
    selectedStats[event.detail.value] = {
      id: event.detail.value,
      min: 0,
      weight: 1
    };
    selectedStats = selectedStats;
    statSelector?.handleClear();
    updateUrl();
  };

  const removeStat = (id: number) => {
    delete selectedStats[id];
    selectedStats = selectedStats;
    updateUrl();
  };

  const changeJewel = () => {
    selectedConqueror = undefined;
    selectedStats = {};
    seed = 0;
    results = false;
    searchOutcome = undefined;
    highlighted = [];
    updateUrl();
  };

  let results = false;
  let minTotalWeight: number | undefined = 0;
  let minTotalWeightInput: HTMLInputElement | undefined;
  let minTotalWeightSearchButton: HTMLButtonElement | undefined;
  let searching = false;
  let currentSeed = 0;
  let searchOutcome: SearchResultsType | undefined;
  let searchJewel = 1;
  let searchConqueror = '';
  const search = async () => {
    if (!circledNode || !selectedJewel || !selectedConqueror || selectedConquerorKeys.length === 0) {
      return;
    }

    searchJewel = selectedJewel.value;
    searchConqueror = selectedConqueror.value;
    searching = true;
    searchOutcome = undefined;

    if (!syncWrap) {
      searching = false;
      return;
    }

    const searchNodes = affectedNodes
      .filter((node) => node.skill !== undefined && !disabled.has(node.skill))
      .map((node) => (node.skill !== undefined ? treeToPassive[node.skill] : undefined))
      .filter((node): node is data.PassiveSkill => !!node)
      .map((node) => node.Index);

    const mergeSearchResults = (entries: { conqueror: string; result: SearchResultsType }[]): SearchResultsType => {
      const grouped: SearchResultsType['grouped'] = {};
      const raw: SearchWithSeed[] = [];

      entries.forEach(({ conqueror, result }) => {
        Object.keys(result.grouped).forEach((groupKey) => {
          const key = parseInt(groupKey);
          const mergedGroup = (result.grouped[key] || []).map((item) => ({
            ...item,
            conqueror
          }));
          grouped[key] = [...(grouped[key] || []), ...mergedGroup];
        });

        raw.push(
          ...result.raw.map((item) => ({
            ...item,
            conqueror
          }))
        );
      });

      const sortBySeedThenConqueror = (left: SearchWithSeed, right: SearchWithSeed): number =>
        left.seed - right.seed || (left.conqueror || '').localeCompare(right.conqueror || '');

      Object.keys(grouped).forEach((groupKey) => {
        const key = parseInt(groupKey);
        grouped[key] = grouped[key].sort(sortBySeedThenConqueror);
      });

      return {
        grouped,
        raw: raw.sort(
          (left, right) =>
            right.weight - left.weight ||
            left.seed - right.seed ||
            (left.conqueror || '').localeCompare(right.conqueror || '')
        )
      };
    };

    try {
      const searchResultsByConqueror: { conqueror: string; result: SearchResultsType }[] = [];

      for (const conquerorValue of selectedConquerorKeys) {
        const query: ReverseSearchConfig = {
          jewel: selectedJewel.value,
          conqueror: conquerorValue,
          nodes: searchNodes,
          stats: Object.values(selectedStats),
          minTotalWeight: minTotalWeight ?? 0
        };

        const result = await syncWrap.search(
          query,
          proxy(async (seedValue) => {
            currentSeed = seedValue;
          })
        );

        searchResultsByConqueror.push({
          conqueror: conquerorValue,
          result
        });
      }

      searchOutcome = mergeSearchResults(searchResultsByConqueror);
      results = true;
    } catch {
      // keep existing UI state and only stop spinner
    } finally {
      searching = false;
    }
  };

  let highlighted: number[] = [];
  const highlight = (newSeed: number, passives: number[], conquerorValue?: string) => {
    seed = newSeed;
    highlighted = [...new Set(passives)];
    if (conquerorValue && conquerorValue !== ANY_CONQUEROR) {
      const matchedConqueror = conquerors.find((option) => option.value === conquerorValue);
      if (matchedConqueror) {
        selectedConqueror = matchedConqueror;
      }
    }
    updateUrl();
  };

  let showNotables = true;
  let showPassives = false;

  const applyPassiveVisibility = (nextShowNotables: boolean, nextShowPassives: boolean) => {
    const nextDisabled = new Set(disabled);
    affectedNodes.forEach((node) => {
      if (node.skill === undefined || node.isJewelSocket || node.isMastery) {
        return;
      }
      const shouldShow = node.isNotable ? nextShowNotables : nextShowPassives;
      if (shouldShow) {
        nextDisabled.delete(node.skill);
      } else {
        nextDisabled.add(node.skill);
      }
    });
    disabled = nextDisabled;
    updateUrl();
  };

  const clearMinTotalWeight = () => {
    minTotalWeight = undefined;
  };

  const revealMinWeightControls = () => {
    if (!browser || !isMobileViewport) {
      return;
    }

    const target = minTotalWeightSearchButton || minTotalWeightInput;
    if (!target) {
      return;
    }

    const scrollIntoView = () => {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    };

    scrollIntoView();
    window.setTimeout(scrollIntoView, 120);
    window.setTimeout(scrollIntoView, 280);
  };

  const handleMinTotalWeightFocus = () => {
    clearMinTotalWeight();
    revealMinWeightControls();
  };

  const normalizeMinTotalWeight = () => {
    if (minTotalWeight === undefined || Number.isNaN(minTotalWeight) || minTotalWeight < 0) {
      minTotalWeight = 0;
    }
  };

  const toggleNotableVisibility = () => {
    applyPassiveVisibility(!showNotables, showPassives);
  };

  const togglePassiveVisibility = () => {
    applyPassiveVisibility(showNotables, !showPassives);
  };

  $: showNotables = affectedNodes.some((node) => node.isNotable && node.skill !== undefined && !disabled.has(node.skill));
  $: showPassives = affectedNodes.some(
    (node) => !node.isNotable && node.skill !== undefined && !disabled.has(node.skill)
  );

  let groupResults = readBooleanPreference('groupResults', true);
  $: writePreference('groupResults', groupResults ? 'true' : 'false');

  type CombinedResult = {
    id: string;
    rawStat: string;
    stat: string;
    passives: number[];
  };

  const colorKeys = {
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

  const colorMessage = (message: string): string => {
    Object.keys(colorKeys).forEach((key) => {
      const value = colorKeys[key as keyof typeof colorKeys];
      message = message.replace(
        new RegExp(`(${key}(?:$|\\s))|((?:^|\\s)${key})`, 'gi'),
        `<span style='color: ${value}; font-weight: bold'>$1$2</span>`
      );
    });

    return message;
  };

  const escapeHtml = (value: string): string =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const renderBilingualStatHtml = (message: string, highlightEnglishKeyword: boolean): string => {
    const parts = splitBilingualStatText(message);
    const localizedHtml = escapeHtml(parts.localized);
    if (!parts.english) {
      return `<span style="color:#f4ead5">${localizedHtml}</span>`;
    }

    const englishText = escapeHtml(parts.english);
    const englishHtml = highlightEnglishKeyword ? colorMessage(englishText) : englishText;
    return `<span style="color:#f4ead5">${localizedHtml}</span><span style="color:rgba(200,169,110,0.62)"> / </span><span style="color:#9cc3ff">${englishHtml}</span>`;
  };

  const combineResults = (
    rawResults: CalculatedSeedResult[],
    withColors: boolean,
    only: 'notables' | 'passives' | 'all'
  ): CombinedResult[] => {
    const mappedStats: Record<number, Set<number>> = {};

    rawResults.forEach((entry) => {
      if (skillTree.nodes[entry.node].isKeystone) {
        return;
      }

      if (only !== 'all') {
        if (only === 'notables' && !skillTree.nodes[entry.node].isNotable) {
          return;
        }

        if (only === 'passives' && skillTree.nodes[entry.node].isNotable) {
          return;
        }
      }

      if (entry.result.AlternatePassiveSkill?.StatsKeys) {
        entry.result.AlternatePassiveSkill.StatsKeys.forEach((key) => {
          if (!mappedStats[key]) {
            mappedStats[key] = new Set<number>();
          }
          mappedStats[key].add(entry.node);
        });
      }

      entry.result.AlternatePassiveAdditionInformations?.forEach((info) => {
        info.AlternatePassiveAddition?.StatsKeys?.forEach((key) => {
          if (!mappedStats[key]) {
            mappedStats[key] = new Set<number>();
          }
          mappedStats[key].add(entry.node);
        });
      });
    });

    return Object.keys(mappedStats).map((statIdString) => {
      const statId = parseInt(statIdString);
      const translated = translateStatBilingual(statId);
      return {
        id: statIdString,
        rawStat: translated,
        stat: renderBilingualStatHtml(translated, withColors),
        passives: Array.from(mappedStats[statId] || [])
      };
    });
  };

  const sortCombined = (combinedResults: CombinedResult[], order: 'count' | 'alphabet' | 'rarity' | 'value') => {
    switch (order) {
      case 'alphabet':
        return combinedResults.sort((left, right) =>
          left.rawStat
            .replace(/[#+%]/gi, '')
            .trim()
            .toLowerCase()
            .localeCompare(right.rawStat.replace(/[#+%]/gi, '').trim().toLowerCase())
        );
      case 'count':
        return combinedResults.sort((left, right) => right.passives.length - left.passives.length);
      case 'rarity':
        return combinedResults.sort((left, right) => {
          const jewelValue = selectedJewel?.value?.toString() || '';
          const possibleStatsForJewel = allPossibleStats[jewelValue] || {};
          return (possibleStatsForJewel[left.id] || 0) - (possibleStatsForJewel[right.id] || 0);
        });
      case 'value':
        return combinedResults.sort((left, right) => {
          const leftValue = (statValues as Record<string, number>)[left.id] || 0;
          const rightValue = (statValues as Record<string, number>)[right.id] || 0;
          if (leftValue !== rightValue) {
            return rightValue - leftValue;
          }

          const jewelValue = selectedJewel?.value?.toString() || '';
          const possibleStatsForJewel = allPossibleStats[jewelValue] || {};
          return (possibleStatsForJewel[left.id] || 0) - (possibleStatsForJewel[right.id] || 0);
        });
    }

    return combinedResults;
  };

  const sortResults = [
    { label: '出現次數', value: 'count' },
    { label: '詞綴名稱', value: 'alphabet' },
    { label: '稀有度', value: 'rarity' },
    { label: '詞綴價值', value: 'value' }
  ] as const;

  let sortOrder =
    sortResults.find((item) => item.value === readStringPreference('sortOrder', 'count')) || sortResults[0];
  $: if (sortOrder) writePreference('sortOrder', sortOrder.value);

  let colored = readBooleanPreference('colored', true);
  $: writePreference('colored', colored ? 'true' : 'false');

  let split = readBooleanPreference('split', true);
  $: writePreference('split', split ? 'true' : 'false');

  const onPaste = (event: ClipboardEvent) => {
    const paste = event.clipboardData?.getData('text') || '';
    const lines = paste.split('\n');
    if (lines.length < 14) {
      return;
    }

    const pastedJewel = jewels.find((jewel) => jewel.label === lines[2] || timelessJewels[jewel.value] === lines[2]);
    if (!pastedJewel) {
      return;
    }

    let newSeed: number | undefined;
    let conquerorValue: string | undefined;
    const currentJewelConquerors = timelessJewelConquerors[pastedJewel.value] || {};

    for (let index = 10; index < lines.length; index += 1) {
      conquerorValue = Object.keys(currentJewelConquerors).find(
        (key) => lines[index].includes(key) || lines[index].includes(translateConquerorName(key))
      );
      if (!conquerorValue) {
        continue;
      }

      const matches = /(\d+)/.exec(lines[index]);
      if (!matches) {
        continue;
      }

      newSeed = parseInt(matches[1]);
      break;
    }

    if (!conquerorValue || !newSeed) {
      return;
    }

    results = false;
    mode = 'seed';
    seed = newSeed;
    selectedJewel = pastedJewel;
    selectedConqueror = { label: translateConquerorName(conquerorValue), value: conquerorValue };
    updateUrl();
  };

  let collapsed = false;
  let isMobileViewport = false;
  $: selectSearchable = !isMobileViewport;
  const platform = { value: 'PC', label: 'PC' };
  const selectFloatingConfig = { strategy: 'fixed' };

  type LeagueOption = SelectOption<string>;

  const toLeagueOptions = (rawLeagues: LeagueLike[]): LeagueOption[] => {
    const mapped = rawLeagues
      .filter((leagueItem) => !isSoloSelfFoundLeague(leagueItem))
      .map((leagueItem) => (leagueItem.id || leagueItem.name || '').trim())
      .filter(Boolean)
      .map((value) => ({
        value,
        label: translateLeagueName(value)
      }));

    return mapped.filter(
      (option, index, array) => array.findIndex((candidate) => candidate.value === option.value) === index
    );
  };

  const resolveLeagueSelection = (rawLeagues: LeagueLike[], fallback: string) => {
    const options = toLeagueOptions(rawLeagues);
    const selectedValue = pickCurrentLeagueValue(rawLeagues, fallback);
    return {
      options,
      selected: options.find((option) => option.value === selectedValue) ||
        options[0] || { value: fallback, label: translateLeagueName(fallback) }
    };
  };

  let leagues: LeagueOption[] = [];
  let league: LeagueOption | undefined;
  const getLeagues = async () => {
    try {
      const response = await fetch('https://api.poe.watch/leagues');
      if (!response.ok) {
        throw new Error('failed');
      }

      const rawLeagues: LeagueLike[] = await response.json();
      const resolved = resolveLeagueSelection(rawLeagues, 'Standard');
      leagues = resolved.options;
      league = resolved.selected;
    } catch {
      leagues = [{ value: 'Standard', label: translateLeagueName('Standard') }];
      league = leagues[0];
    }
  };

  let twLeagues: LeagueOption[] = [];
  let twLeague: LeagueOption | undefined;
  const getTWLeaguesData = async () => {
    try {
      const response = await fetch('https://api.pathofexile.com/leagues?type=main&realm=garena');
      if (!response.ok) {
        throw new Error('failed');
      }

      const rawLeagues: LeagueLike[] = await response.json();
      const resolved = resolveLeagueSelection(rawLeagues, 'Standard');
      twLeagues = resolved.options;
      twLeague = twLeagues.find((option) => option.value === twLeague?.value) || resolved.selected;
    } catch {
      twLeagues = [{ value: 'Standard', label: translateLeagueName('Standard') }];
      twLeague = twLeagues[0];
    }
  };

  let tradeCondition: TradeCondition = 'instant_buyout';
  const extractTranslatedStats = (result: data.AlternatePassiveSkillInformation): string[] => {
    const translatedStats: string[] = [];

    if (result.AlternatePassiveSkill?.StatsKeys && result.StatRolls) {
      Object.values(result.StatRolls).forEach((rollValue, index) => {
        const statIndex = result.AlternatePassiveSkill?.StatsKeys?.[index];
        if (statIndex !== undefined) {
          translatedStats.push(translateStatBilingual(statIndex, rollValue));
        }
      });
    }

    result.AlternatePassiveAdditionInformations?.forEach((info) => {
      if (!info.AlternatePassiveAddition?.StatsKeys || !info.StatRolls) {
        return;
      }

      Object.values(info.StatRolls).forEach((rollValue, index) => {
        const statIndex = info.AlternatePassiveAddition?.StatsKeys?.[index];
        if (statIndex !== undefined) {
          translatedStats.push(translateStatBilingual(statIndex, rollValue));
        }
      });
    });

    return uniqueStrings(translatedStats);
  };

  const buildSnapshotFromCalculatedResult = (entry: CalculatedSeedResult): FavoriteSnapshotSkill | null => {
    const stats = extractTranslatedStats(entry.result);
    if (stats.length === 0) {
      return null;
    }

    return {
      passive: entry.node,
      passiveName: skillTree.nodes[entry.node]?.name || entry.node.toString(),
      stats
    };
  };

  const buildSnapshotFromSearchResult = (set: SearchWithSeed): FavoriteSnapshotSkill[] =>
    set.skills
      .map((skill) => ({
        passive: skill.passive,
        passiveName: skillTree.nodes[skill.passive]?.name || skill.passive.toString(),
        stats: uniqueStrings(
          Object.entries(skill.stats).map(([statId, rollValue]) => translateStatBilingual(statId, rollValue as number))
        )
      }))
      .filter((skill) => skill.stats.length > 0);

  const normalizeSeedList = (values: number[]): number[] =>
    [...new Set(values.filter((value) => Number.isFinite(value)).map((value) => Math.trunc(value)))].sort(
      (left, right) => left - right
    );

  const collectSnapshotNote = (snapshot: FavoriteSnapshotSkill[]): string =>
    uniqueStrings(snapshot.flatMap((passive) => passive.stats))
      .slice(0, 6)
      .join('、');

  const mergeSnapshotSkills = (snapshots: FavoriteSnapshotSkill[][]): FavoriteSnapshotSkill[] => {
    const merged = new Map<number, FavoriteSnapshotSkill>();

    snapshots.flat().forEach((item) => {
      const existing = merged.get(item.passive);
      if (existing) {
        existing.stats = uniqueStrings([...existing.stats, ...item.stats]);
        return;
      }

      merged.set(item.passive, {
        passive: item.passive,
        passiveName: item.passiveName,
        stats: uniqueStrings(item.stats)
      });
    });

    return [...merged.values()].sort((left, right) => left.passive - right.passive);
  };

  const mergeDraftWithExisting = (draft: SavedJewelDraft): SavedJewelDraft => {
    const existing = findFavoriteJewel(draft.id);
    if (!existing) {
      return draft;
    }

    return {
      ...draft,
      buildName: existing.buildName,
      note: existing.note,
      estimatedValue: existing.estimatedValue
    };
  };

  const buildDefaultDisabledForLocation = (location: number): number[] => {
    const socket = skillTree.nodes[location];
    if (!socket) {
      return [];
    }

    return getAffectedNodes(socket)
      .filter((node) => node.skill !== undefined && !node.isJewelSocket && !node.isMastery && !node.isNotable)
      .map((node) => node.skill as number)
      .sort((left, right) => left - right);
  };

  const buildCurrentQueryContext = (
    modeValue: 'seed' | 'stats',
    options: {
      conquerorOverride?: string;
      seedOverride?: number;
    } = {}
  ): FavoriteQueryContext | undefined => {
    if (!selectedJewel || !selectedConqueror) {
      return undefined;
    }

    const queryContext: FavoriteQueryContext = {
      mode: modeValue,
      jewel: selectedJewel.value,
      conqueror: options.conquerorOverride || selectedConqueror.value
    };

    if (modeValue === 'seed') {
      if (circledNode !== undefined) {
        queryContext.location = circledNode;
        queryContext.disabled = buildDefaultDisabledForLocation(circledNode);
      }

      const resolvedSeed = options.seedOverride ?? seed;
      if (Number.isFinite(resolvedSeed) && resolvedSeed > 0) {
        queryContext.seed = Math.trunc(resolvedSeed);
      }

      return queryContext;
    }

    if (circledNode !== undefined) {
      queryContext.location = circledNode;
    }

    queryContext.disabled = [...disabled].sort((left, right) => left - right);
    queryContext.selectedStats = Object.values(selectedStats).map((item) => ({
      id: item.id,
      min: item.min,
      weight: item.weight
    }));
    queryContext.minTotalWeight = minTotalWeight ?? 0;

    return queryContext;
  };

  const buildSnapshotComparisonKey = (snapshot: FavoriteSnapshotSkill[]): string =>
    mergeSnapshotSkills([snapshot])
      .map((item) => `${item.passive}:${uniqueStrings(item.stats).sort().join('|')}`)
      .sort()
      .join('||');

  const inferLegacyFavoriteQueryContext = (entry: SavedJewelEntry): FavoriteQueryContext | null => {
    if (entry.entryType !== 'single' || entry.seed <= 0) {
      return null;
    }

    const conquerorCandidates =
      entry.conqueror === ANY_CONQUEROR
        ? Object.keys(timelessJewelConquerors[entry.jewel] || {})
        : [entry.conqueror].filter(Boolean);

    if (conquerorCandidates.length === 0) {
      return null;
    }

    const expectedKey = buildSnapshotComparisonKey(entry.snapshot);
    if (!expectedKey) {
      return null;
    }

    const matchedLocations = (skillTree.jewelSlots || []).filter((socketId) => {
      const socket = skillTree.nodes[socketId];
      if (!socket) {
        return false;
      }

      const calculatedSnapshot = getAffectedNodes(socket)
        .filter((node) => node.skill !== undefined && !!treeToPassive[node.skill] && !node.isJewelSocket && !node.isMastery)
        .flatMap((node) => {
          const skillId = node.skill;
          if (skillId === undefined) {
            return [];
          }

          const passive = treeToPassive[skillId];
          return conquerorCandidates
            .map((conquerorValue) =>
              calculator.Calculate(passive ? passive.Index : 0, entry.seed, entry.jewel, conquerorValue)
            )
            .map((result) => (result ? buildSnapshotFromCalculatedResult({ node: skillId, conqueror: '', result }) : null))
            .filter((item): item is FavoriteSnapshotSkill => !!item);
        });

      return buildSnapshotComparisonKey(calculatedSnapshot) === expectedKey;
    });

    if (matchedLocations.length !== 1) {
      return null;
    }

    return {
      mode: 'seed',
      jewel: entry.jewel,
      conqueror: entry.conqueror,
      seed: entry.seed,
      location: matchedLocations[0],
      disabled: buildDefaultDisabledForLocation(matchedLocations[0])
    };
  };

  const applyFavoriteQueryContext = async (
    queryContext: FavoriteQueryContext,
    options: {
      runSearch?: boolean;
      highlightedPassives?: number[];
    } = {}
  ): Promise<boolean> => {
    const matchedJewel = jewels.find((item) => item.value === queryContext.jewel);
    if (!matchedJewel) {
      favoriteFeedback = '這筆收藏對應的珠寶已不存在，無法回推到查詢。';
      return false;
    }

    const availableConquerors = timelessJewelConquerors[queryContext.jewel] || {};
    const matchedConqueror =
      queryContext.conqueror === ANY_CONQUEROR
        ? anyConquerorOption
        : availableConquerors[queryContext.conqueror]
          ? {
              value: queryContext.conqueror,
              label: translateConquerorName(queryContext.conqueror)
            }
          : undefined;

    if (!matchedConqueror) {
      favoriteFeedback = '這筆收藏對應的征服者已不存在，無法回推到查詢。';
      return false;
    }

    const availableStatsForJewel = new Set(Object.keys(allPossibleStats[queryContext.jewel.toString()] || {}).map((id) => parseInt(id)));
    const nextSelectedStats: Record<string, StatConfig> = {};
    (queryContext.selectedStats || []).forEach((stat) => {
      if (!availableStatsForJewel.has(stat.id)) {
        return;
      }

      nextSelectedStats[stat.id] = {
        id: stat.id,
        min: stat.min,
        weight: stat.weight
      };
    });

    selectedJewel = matchedJewel;
    selectedConqueror = matchedConqueror;
    mode = queryContext.mode;
    seed = queryContext.seed ?? 0;
    circledNode = queryContext.location;
    disabled = new Set(
      queryContext.location !== undefined
        ? (queryContext.disabled && queryContext.disabled.length > 0
            ? queryContext.disabled
            : buildDefaultDisabledForLocation(queryContext.location))
        : []
    );
    defaultDisabledInitializedNode = queryContext.location;
    selectedStats = nextSelectedStats;
    minTotalWeight = queryContext.minTotalWeight ?? 0;
    highlighted = options.highlightedPassives ? [...new Set(options.highlightedPassives)] : [];
    searchOutcome = undefined;
    results = false;
    favoriteDraft = null;
    favoriteDrawerOpen = !isMobileViewport;
    updateUrl();

    await tick();

    if (
      options.runSearch &&
      queryContext.mode === 'stats' &&
      queryContext.location !== undefined &&
      Object.keys(nextSelectedStats).length > 0
    ) {
      await search();
    }

    return true;
  };

  const createFavoriteDraft = ({
    seeds,
    tradeTargets,
    snapshot,
    entryType,
    conquerorOverride,
    seedTotal,
    queryContext
  }: {
    seeds: number[];
    tradeTargets?: FavoriteTradeTarget[];
    snapshot: FavoriteSnapshotSkill[];
    entryType?: 'single' | 'group';
    conquerorOverride?: string;
    seedTotal?: number;
    queryContext?: FavoriteQueryContext;
  }): SavedJewelDraft | null => {
    if (!selectedJewel || !selectedConqueror) {
      return null;
    }

    const normalizedSeeds = normalizeSeedList(seeds);
    if (normalizedSeeds.length === 0) {
      return null;
    }

    const resolvedEntryType = entryType || (normalizedSeeds.length > 1 ? 'group' : 'single');
    const conquerorValue = conquerorOverride || selectedConqueror.value;
    const conquerorLabel =
      conquerorValue === ANY_CONQUEROR ? anyConquerorOption.label : translateConquerorName(conquerorValue);
    const primarySeed = normalizedSeeds[0];
    const normalizedTradeTargets =
      tradeTargets && tradeTargets.length > 0
        ? tradeTargets
            .filter((target) => Number.isFinite(target.seed))
            .map((target) => ({
              seed: Math.trunc(target.seed),
              conqueror: target.conqueror || undefined
            }))
        : normalizedSeeds.map((targetSeed) => ({
            seed: targetSeed,
            conqueror: conquerorValue || undefined
          }));
    const id =
      resolvedEntryType === 'group'
        ? buildSavedJewelGroupId(selectedJewel.value, conquerorValue, normalizedSeeds)
        : buildSavedJewelId(selectedJewel.value, conquerorValue, primarySeed);

    return mergeDraftWithExisting({
      id,
      jewel: selectedJewel.value,
      jewelLabel: selectedJewel.label,
      conqueror: conquerorValue,
      conquerorLabel,
      entryType: resolvedEntryType,
      seed: primarySeed,
      seeds: normalizedSeeds,
      tradeTargets: normalizedTradeTargets,
      seedTotal:
        resolvedEntryType === 'group'
          ? Math.max(normalizedSeeds.length, Math.trunc(seedTotal ?? normalizedSeeds.length))
          : 1,
      buildName: '',
      note: collectSnapshotNote(snapshot),
      estimatedValue: '',
      snapshot,
      queryContext
    });
  };

  let favoriteDraft: SavedJewelDraft | null = null;
  let favoriteFeedback = '';
  let favoriteImportInput: HTMLInputElement;
  let favoriteDrawerOpen = false;
  const closeFavoritePanel = () => {
    favoriteDrawerOpen = false;
  };
  $: favoriteCount = $favoriteJewels.length;
  $: canSaveCurrentSeed =
    mode === 'seed' &&
    !!selectedJewel &&
    hasValidConquerorSelection &&
    seed >= minSeed &&
    seed <= maxSeed &&
    seedResults.length > 0;

  const openFavoriteForCurrentSeed = () => {
    const snapshot = seedResults
      .map(buildSnapshotFromCalculatedResult)
      .filter((entry): entry is FavoriteSnapshotSkill => !!entry);
    const draft = createFavoriteDraft({
      seeds: [seed],
      tradeTargets: [
        { seed, conqueror: selectedConquerorValue === ANY_CONQUEROR ? undefined : selectedConquerorValue }
      ],
      snapshot,
      entryType: 'single',
      queryContext: buildCurrentQueryContext('seed')
    });
    if (!draft) {
      return;
    }

    favoriteDraft = draft;
    favoriteDrawerOpen = true;
    favoriteFeedback = '';
  };

  const openFavoriteForSearchResult = (set: SearchWithSeed) => {
    const draft = createFavoriteDraft({
      seeds: [set.seed],
      tradeTargets: [{ seed: set.seed, conqueror: set.conqueror }],
      snapshot: buildSnapshotFromSearchResult(set),
      entryType: 'single',
      conquerorOverride: set.conqueror,
      queryContext: buildCurrentQueryContext('stats', {
        conquerorOverride: set.conqueror,
        seedOverride: set.seed
      })
    });
    if (!draft) {
      return;
    }

    favoriteDraft = draft;
    favoriteDrawerOpen = true;
    favoriteFeedback = '';
  };

  const saveFavoriteGroup = (sets: SearchWithSeed[]) => {
    if (!sets.length) {
      return;
    }

    const seeds = normalizeSeedList(sets.map((set) => set.seed));
    if (seeds.length === 0) {
      return;
    }

    const conquerorCandidates = uniqueStrings(sets.map((set) => set.conqueror || '').filter(Boolean));
    const conquerorOverride =
      conquerorCandidates.length === 1
        ? conquerorCandidates[0]
        : selectedConqueror?.value || selectedConquerorValue || ANY_CONQUEROR;
    const snapshot = mergeSnapshotSkills(sets.map((set) => buildSnapshotFromSearchResult(set)));
    const draft = createFavoriteDraft({
      seeds,
      tradeTargets: sets.map((set) => ({
        seed: set.seed,
        conqueror: set.conqueror
      })),
      snapshot,
      entryType: 'group',
      conquerorOverride,
      seedTotal: sets.length,
      queryContext: buildCurrentQueryContext('stats', {
        conquerorOverride
      })
    });
    if (!draft) {
      return;
    }

    favoriteDraft = draft;
    favoriteDrawerOpen = true;
    favoriteFeedback = '';
  };

  const saveFavoriteDraft = (draft: SavedJewelDraft) => {
    const existing = findFavoriteJewel(draft.id);
    const now = new Date().toISOString();
    const replaced = upsertFavoriteJewel({
      ...draft,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    });

    favoriteFeedback = replaced
      ? draft.entryType === 'group'
        ? '已更新收藏群組。'
        : '已更新收藏珠寶。'
      : draft.entryType === 'group'
      ? '已加入收藏群組。'
      : '已加入收藏珠寶。';
    favoriteDraft = null;
  };

  const editFavorite = (entry: SavedJewelEntry) => {
    favoriteDraft = {
      ...entry
    };
    favoriteDrawerOpen = true;
    favoriteFeedback = '';
    results = false;
  };

  const applyFavoriteToQuery = async (entry: SavedJewelEntry) => {
    const highlightedPassives = entry.snapshot.map((item) => item.passive);
    const resolvedQueryContext = entry.queryContext || inferLegacyFavoriteQueryContext(entry);

    if (resolvedQueryContext) {
      const applied = await applyFavoriteQueryContext(resolvedQueryContext, {
        runSearch: resolvedQueryContext.mode === 'stats',
        highlightedPassives: resolvedQueryContext.mode === 'seed' ? highlightedPassives : undefined
      });

      if (!applied) {
        return;
      }

      favoriteFeedback = entry.queryContext
        ? '已將收藏回推到查詢。'
        : '已將舊收藏回推到查詢，並自動補回可辨識的插槽位置。';
      return;
    }

    const fallbackMode: 'seed' | 'stats' = entry.entryType === 'single' ? 'seed' : 'stats';
    const applied = await applyFavoriteQueryContext(
      {
        mode: fallbackMode,
        jewel: entry.jewel,
        conqueror: entry.conqueror,
        seed: entry.entryType === 'single' ? entry.seed : undefined
      },
      {
        highlightedPassives: fallbackMode === 'seed' ? highlightedPassives : undefined
      }
    );

    if (!applied) {
      return;
    }

    favoriteFeedback =
      entry.entryType === 'group'
        ? '這筆舊的群組收藏沒有保存原始查詢條件，已先帶入珠寶與征服者；若要完整回推，需重新收藏一次。'
        : '這筆舊收藏缺少插槽位置，只帶入了珠寶、征服者與種子；若要完整回推，需重新收藏一次。';
  };

  const deleteFavorite = (entry: SavedJewelEntry) => {
    removeFavoriteJewel(entry.id);
    favoriteFeedback =
      entry.entryType === 'group'
        ? `已刪除群組收藏：${entry.jewelLabel} / 共 ${entry.seeds.length} 顆種子`
        : `已刪除收藏：${entry.jewelLabel} / 種子 ${entry.seed}`;
    if (favoriteDraft?.id === entry.id) {
      favoriteDraft = null;
    }
  };

  const exportFavorites = () => {
    if (!browser) {
      return;
    }

    const blob = new Blob([serializeFavoriteJewels()], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timeless-jewels-favorites-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    favoriteFeedback = `已匯出 ${favoriteCount} 筆收藏。`;
  };

  const openImportDialog = () => favoriteImportInput?.click();

  const handleImportFavorites = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const result = importFavoriteJewels(await file.text());
      favoriteFeedback = `已匯入收藏：新增 ${result.imported} 筆、覆蓋 ${result.replaced} 筆、跳過 ${result.skipped} 筆。`;
    } catch (error) {
      favoriteFeedback = error instanceof Error ? error.message : '匯入收藏失敗。';
    } finally {
      input.value = '';
    }
  };

  onMount(() => {
    const syncViewportState = () => {
      isMobileViewport = detectMobileViewport();
    };

    syncViewportState();
    collapsed = isMobileViewport;
    window.addEventListener('resize', syncViewportState, { passive: true });
    getLeagues();
    getTWLeaguesData();

    return () => {
      window.removeEventListener('resize', syncViewportState);
    };
  });
</script>

<svelte:window on:paste={onPaste} />

<SkillTree
  {clickNode}
  {circledNode}
  selectedJewel={selectedJewel?.value || 0}
  selectedConqueror={selectedConquerorValue === ANY_CONQUEROR ? '' : selectedConquerorValue}
  {highlighted}
  seed={seed || 0}
  highlightJewels={!circledNode}
  disabled={[...disabled]}>
  {#if !collapsed}
    <div class="tree-panel panel-left themed">
      <div class="panel-shell">
        <div class="panel-header">
          <div class="panel-title-row">
            <div class="panel-title-group">
              <button class="burger-menu" aria-label="收合面板" title="收合面板" on:click={() => (collapsed = true)}>
                <span class="burger-icon" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
                <span class="menu-label">收合面板</span>
              </button>
              <div>
                <h3>{results ? '反查結果' : '永恆珠寶查詢'}</h3>
                <p>依照種子或指定詞綴設定條件，並即時查看天賦樹受到的永恆珠寶影響。</p>
              </div>
            </div>
            <div class="panel-title-actions">
              <button
                class="secondary-toggle favorite-entry-toggle"
                on:click={() => (favoriteDrawerOpen = !favoriteDrawerOpen)}>
                {favoriteDrawerOpen ? '關閉收藏珠寶' : `收藏珠寶 (${favoriteCount})`}
              </button>
            </div>
          </div>

          {#if $tradeOpenFeedback}
            <div class="trade-feedback" class:trade-feedback-warning={$tradeOpenFeedback.level === 'warning'}>
              <div class="trade-feedback-copy">
                <strong>{$tradeOpenFeedback.title}</strong>
                <p>{$tradeOpenFeedback.message}</p>
              </div>
              <button class="trade-feedback-close" type="button" on:click={clearTradeOpenFeedback}>關閉</button>
            </div>
          {/if}

          {#if searchOutcome}
            <div class="trade-panel">
              <div class="trade-row compact-row">
                <span class="trade-label">交易條件</span>
                <button
                  class="trade-toggle"
                  class:trade-toggle-active={tradeCondition === 'instant_buyout'}
                  on:click={() => (tradeCondition = 'instant_buyout')}>
                  即刻購買
                </button>
                <button
                  class="trade-toggle"
                  class:trade-toggle-active={tradeCondition === 'in_person_online_in_league'}
                  on:click={() => (tradeCondition = 'in_person_online_in_league')}>
                  面交
                </button>
                <div class="panel-note trade-hint trade-condition-hint">
                  種子若超過180個會一次開啟多個交易分頁，請先在瀏覽器允許此網站的「彈出式視窗與重新導向」，避免分頁被阻擋。
                </div>
              </div>

              <div class="trade-row trade-league-row">
                <div class="trade-league-group">
                  <span class="trade-label">國際服聯盟</span>
                  <div class="trade-select">
                    <Select
                      items={leagues}
                      bind:value={league}
                      clearable={false}
                      searchable={selectSearchable}
                      floatingConfig={selectFloatingConfig} />
                  </div>
                  <button
                    class="trade-action intl-action"
                    on:click={() =>
                      searchOutcome &&
                      league &&
                      openTrade(
                        searchJewel,
                        searchConqueror,
                        searchOutcome.raw,
                        platform.value,
                        league.value,
                        'international',
                        tradeCondition
                      )}
                    disabled={!searchOutcome || !league}>
                    國際服交易
                  </button>
                </div>
                <div class="trade-league-group">
                  <span class="trade-label">台服聯盟</span>
                  <div class="trade-select">
                    <Select
                      items={twLeagues}
                      bind:value={twLeague}
                      clearable={false}
                      searchable={selectSearchable}
                      floatingConfig={selectFloatingConfig} />
                  </div>
                  <button
                    class="trade-action tw-action"
                    on:click={() =>
                      searchOutcome &&
                      twLeague &&
                      openTrade(
                        searchJewel,
                        searchConqueror,
                        searchOutcome.raw,
                        'PC',
                        twLeague.value,
                        'tw',
                        tradeCondition
                      )}
                    disabled={!searchOutcome || !twLeague}>
                    台服交易
                  </button>
                </div>
              </div>
            </div>
          {/if}

          {#if searchOutcome || (selectedConqueror && hasValidConquerorSelection && mode === 'stats')}
            <div class="trade-row compact-row control-toolbar-row">
              <button
                class="secondary-toggle"
                class:grouped={groupResults}
                on:click={() => (groupResults = !groupResults)}
                disabled={!searchOutcome}>
                {groupResults ? '群組顯示結果' : '平鋪顯示結果'}
              </button>
              <button class="secondary-toggle" on:click={() => (results = !results)} disabled={!searchOutcome}>
                {results ? '隱藏反查結果' : '顯示反查結果'}
              </button>
              {#if selectedConqueror && hasValidConquerorSelection && mode === 'stats'}
                <div class="bulk-actions bulk-actions-inline compact-row-actions">
                  <button
                    class="secondary-toggle"
                    class:grouped={showNotables}
                    on:click={toggleNotableVisibility}
                    disabled={searching}>
                    核心天賦
                  </button>
                  <button
                    class="secondary-toggle"
                    class:grouped={showPassives}
                    on:click={togglePassiveVisibility}
                    disabled={searching}>
                    小天賦
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <div class="panel-body">
          {#if !results}
            <section class="control-section">
              <div class="inline-select-row" class:with-mode-toggle={selectedConqueror && hasValidConquerorSelection}>
                <div class="field-stack field-stack-half field-stack-jewel">
                  <h3>珠寶</h3>
                  <Select
                    class="hero-select"
                    items={jewels}
                    bind:value={selectedJewel}
                    on:change={changeJewel}
                    searchable={selectSearchable}
                    placeholder="選擇永恆珠寶"
                    floatingConfig={selectFloatingConfig} />
                </div>

                {#if selectedJewel}
                  <div class="field-stack field-stack-half field-stack-conqueror">
                    <h3>征服者</h3>
                    <Select
                      class="hero-select"
                      items={conquerors}
                      bind:value={selectedConqueror}
                      on:change={updateUrl}
                      searchable={selectSearchable}
                      placeholder="選擇征服者"
                      floatingConfig={selectFloatingConfig} />
                  </div>
                {/if}

                {#if selectedConqueror && hasValidConquerorSelection}
                  <div class="field-stack field-stack-mode">
                    <div class="mode-toggle-row inline-mode-toggle">
                      <button
                        class="selection-button"
                        class:selected={mode === 'seed'}
                        on:click={() => setMode('seed')}>
                        依種子
                      </button>
                      <button
                        class="selection-button"
                        class:selected={mode === 'stats'}
                        on:click={() => setMode('stats')}>
                        依詞綴反查
                      </button>
                    </div>
                  </div>
                {/if}
              </div>

              {#if selectedJewel}
                {#if selectedConqueror && hasValidConquerorSelection}
                    {#if mode === 'seed'}
                      <div class="field-stack">
                        <h3>種子</h3>
                        <input type="number" bind:value={seed} on:blur={updateUrl} min={minSeed} max={maxSeed} />
                        {#if seed < minSeed || seed > maxSeed}
                          <div class="warning-text">種子必須介於 {minSeed} 到 {maxSeed} 之間。</div>
                        {/if}
                      </div>

                      {#if canSaveCurrentSeed}
                        <div class="seed-toolbar">
                          <button class="primary-toggle" on:click={openFavoriteForCurrentSeed}>
                            收藏目前種子
                          </button>
                        <div class="toolbar-group">
                          <Select
                            items={sortResults}
                            bind:value={sortOrder}
                            searchable={selectSearchable}
                            floatingConfig={selectFloatingConfig} />
                          <button
                            class="secondary-toggle"
                            class:selected={colored}
                            on:click={() => (colored = !colored)}>彩色標示</button>
                          <button class="secondary-toggle" class:selected={split} on:click={() => (split = !split)}>
                            分欄顯示
                          </button>
                        </div>
                      </div>

                      {#if !split}
                        <div class="combined-results" class:rainbow={colored}>
                          {#each sortCombined(combineResults(seedResults, colored, 'all'), sortOrder.value) as result}
                            <div
                              class="combined-row"
                              role="button"
                              tabindex="0"
                              on:click={() => highlight(seed, result.passives)}
                              on:keydown={(event) =>
                                (event.key === 'Enter' || event.key === ' ') && highlight(seed, result.passives)}>
                              <span class="count-pill" class:text-white={getStatValue(result.id) < 3}
                                >({result.passives.length})</span>
                              <span class="text-white">{@html result.stat}</span>
                            </div>
                          {/each}
                        </div>
                      {:else}
                        <div class="combined-results split-results">
                          <div>
                            <h3>顯著天賦</h3>
                            <div class:rainbow={colored}>
                              {#each sortCombined(combineResults(seedResults, colored, 'notables'), sortOrder.value) as result}
                                <div
                                  class="combined-row"
                                  role="button"
                                  tabindex="0"
                                  on:click={() => highlight(seed, result.passives)}
                                  on:keydown={(event) =>
                                    (event.key === 'Enter' || event.key === ' ') && highlight(seed, result.passives)}>
                                  <span class="count-pill" class:text-white={getStatValue(result.id) < 3}
                                    >({result.passives.length})</span>
                                  <span class="text-white">{@html result.stat}</span>
                                </div>
                              {/each}
                            </div>
                          </div>
                          <div>
                            <h3>小天賦</h3>
                            <div class:rainbow={colored}>
                              {#each sortCombined(combineResults(seedResults, colored, 'passives'), sortOrder.value) as result}
                                <div
                                  class="combined-row"
                                  role="button"
                                  tabindex="0"
                                  on:click={() => highlight(seed, result.passives)}
                                  on:keydown={(event) =>
                                    (event.key === 'Enter' || event.key === ' ') && highlight(seed, result.passives)}>
                                  <span class="count-pill" class:text-white={getStatValue(result.id) < 3}
                                    >({result.passives.length})</span>
                                  <span class="text-white">{@html result.stat}</span>
                                </div>
                              {/each}
                            </div>
                          </div>
                        </div>
                      {/if}
                    {/if}
                  {:else if mode === 'stats'}
                    <div class="field-stack field-stack-inline">
                      <h3>選擇詞綴</h3>
                      <div class="stat-picker">
                        <Select
                          items={statItems}
                          on:change={selectStat}
                          bind:this={statSelector}
                          searchable={selectSearchable}
                          placeholder="選擇要反查的詞綴"
                          floatingConfig={selectFloatingConfig}>
                          <svelte:fragment slot="item" let:item>
                            <span>{@html formatBilingualStatHtml(item.label)}</span>
                          </svelte:fragment>
                          <svelte:fragment slot="selection" let:selection>
                            <span>{@html formatBilingualStatHtml(selection.label)}</span>
                          </svelte:fragment>
                        </Select>
                      </div>
                    </div>

                    {#if Object.keys(selectedStats).length > 0}
                      <div class="selected-stats">
                        {#each Object.keys(selectedStats) as statId}
                          <div class="selected-stat-card">
                            <div class="selected-stat-top">
                              <button class="remove-stat" on:click={() => removeStat(selectedStats[statId].id)}>
                                移除
                              </button>
                              <span class="selected-stat-text"
                                >{@html formatBilingualStatHtml(
                                  translateStatBilingual(selectedStats[statId].id)
                                )}</span>
                            </div>
                            <div class="selected-stat-inputs">
                              <label class="inline-label inline-label-compact">
                                <span>最低數值</span>
                                <input type="number" min="0" bind:value={selectedStats[statId].min} />
                              </label>
                              <label class="inline-label inline-label-compact">
                                <span>權重</span>
                                <input type="number" min="0" bind:value={selectedStats[statId].weight} />
                              </label>
                            </div>
                          </div>
                        {/each}
                      </div>

                      <div class="field-stack compact-field search-control-row">
                        <label class="inline-label inline-label-compact inline-label-total">
                          <span>最低總權重</span>
                          <input
                            type="number"
                            min="0"
                            bind:this={minTotalWeightInput}
                            bind:value={minTotalWeight}
                            on:focus={handleMinTotalWeightFocus}
                            on:blur={normalizeMinTotalWeight} />
                        </label>
                        <button
                          class="primary-toggle search-button"
                          bind:this={minTotalWeightSearchButton}
                          on:click={search}
                          disabled={searching}>
                          {#if searching && selectedJewel}
                            搜尋中 {currentSeed} / {maxSeed}
                          {:else}
                            開始反查
                          {/if}
                        </button>
                      </div>
                    {/if}
                  {/if}

                  {#if !circledNode}
                    <h2 class="panel-note">請先在技能樹點選一個珠寶插槽，才會顯示可影響的天賦與反查結果。</h2>
                  {/if}
                {/if}
              {/if}
            </section>
          {/if}

          {#if searchOutcome && results && league && twLeague}
            <SearchResults
              searchResults={searchOutcome}
              {groupResults}
              {highlight}
              onSave={openFavoriteForSearchResult}
              onSaveGroup={saveFavoriteGroup}
              jewel={searchJewel}
              conqueror={searchConqueror}
              platform={platform.value}
              league={league.value}
              twLeague={twLeague.value}
              {tradeCondition} />
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <button
      class="burger-menu collapsed-trigger"
      aria-label="展開面板"
      title="展開面板"
      on:click={() => (collapsed = false)}>
      <span class="burger-icon" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span class="menu-label">展開面板</span>
    </button>
  {/if}

  {#if favoriteDrawerOpen}
    <div class:favorite-modal-overlay={isMobileViewport}>
      {#if isMobileViewport}
        <button
          type="button"
          class="favorite-modal-backdrop"
          aria-label="關閉收藏珠寶彈窗"
          on:click={closeFavoritePanel}></button>
      {/if}
      <section
        class="favorite-panel"
        class:favorite-drawer={!isMobileViewport}
        class:favorite-modal={isMobileViewport}
        role="dialog"
        tabindex="-1"
        aria-modal={isMobileViewport}>
      <div class="favorite-header">
        <div>
          <h3>收藏珠寶</h3>
          <p>目前共 {favoriteCount} 筆收藏，可匯出與匯入 JSON。</p>
        </div>
        <div class="favorite-actions">
          <button class="secondary-toggle" on:click={exportFavorites} disabled={favoriteCount === 0}>匯出 JSON</button>
          <button class="secondary-toggle" on:click={openImportDialog}>匯入 JSON</button>
          <button class="secondary-toggle" on:click={closeFavoritePanel}>關閉</button>
          <input
            bind:this={favoriteImportInput}
            class="hidden-input"
            type="file"
            accept="application/json"
            on:change={handleImportFavorites} />
        </div>
      </div>

        <div class="favorite-content">
          {#if favoriteFeedback}
            <div class="favorite-feedback">{favoriteFeedback}</div>
          {/if}

          {#if favoriteDraft}
            {#key `${favoriteDraft.id}:${favoriteDraft.entryType}:${favoriteDraft.seeds.join(',')}:${favoriteDraft.snapshot.length}:${favoriteDraft.buildName}:${favoriteDraft.estimatedValue}:${favoriteDraft.note}`}
              <FavoriteJewelForm
                draft={favoriteDraft}
                existing={!!findFavoriteJewel(favoriteDraft.id)}
                onSave={saveFavoriteDraft}
                onCancel={() => (favoriteDraft = null)} />
            {/key}
          {/if}

          {#if favoriteCount === 0}
            <div class="favorite-empty">目前還沒有收藏珠寶，可先從種子結果或反查結果加入收藏。</div>
          {:else}
            <div class="favorite-list">
              {#each $favoriteJewels as entry}
                <FavoriteJewelCard
                  {entry}
                  league={league?.value || 'Standard'}
                  twLeague={twLeague?.value || 'Standard'}
                  {tradeCondition}
                  onApplyQuery={applyFavoriteToQuery}
                  onEdit={editFavorite}
                  onDelete={deleteFavorite} />
              {/each}
            </div>
          {/if}
        </div>
      </section>
    </div>
  {/if}

  <div class="repo-link-wrap">
    <span>版本 {appVersion}</span>
  </div>
</SkillTree>

<style lang="postcss">
  :global(html),
  :global(body) {
    overscroll-behavior-y: none;
  }

  :global(.tree-panel) {
    position: absolute;
    top: 0;
    left: 0;
    background: rgba(13, 13, 15, 0.9) !important;
    border-right: 1px solid rgba(200, 169, 110, 0.15);
    border-bottom: 1px solid rgba(200, 169, 110, 0.15);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(18px);
    width: 50vw;
    max-width: 50vw;
    height: 100vh;
    max-height: 100vh;
    overflow: visible;
    z-index: 30;
  }

  .panel-left {
    border-bottom-right-radius: 24px;
  }

  .panel-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-height: 100vh;
    overflow: visible;
    overscroll-behavior-y: contain;
  }

  .panel-header {
    padding: 20px 20px 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .panel-body {
    padding: 20px;
    padding-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: visible;
    position: relative;
    z-index: 1;
    overscroll-behavior-y: contain;
    -webkit-overflow-scrolling: touch;
  }

  .panel-title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 12px;
  }

  .panel-title-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .favorite-entry-toggle {
    white-space: nowrap;
  }

  .panel-title-group {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .panel-title-group h3 {
    margin: 0;
    color: #f1e2c1;
    font-size: 20px;
    line-height: 1.5;
  }

  .panel-title-group p {
    margin: 4px 0 0;
    color: rgba(200, 169, 110, 0.64);
    font-size: 12px;
    line-height: 1.7;
  }

  .burger-menu {
    min-height: 44px;
    height: 44px;
    padding: 10px 12px;
    border-radius: 16px;
    background: rgba(200, 169, 110, 0.08);
    border: 1px solid rgba(200, 169, 110, 0.16);
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition:
      transform 0.18s ease,
      background 0.18s ease,
      border-color 0.18s ease;
  }

  .burger-menu:hover {
    transform: scale(0.98);
    background: rgba(200, 169, 110, 0.14);
    border-color: rgba(200, 169, 110, 0.28);
  }

  .burger-icon {
    width: 16px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex-shrink: 0;
  }

  .burger-icon span {
    width: 100%;
    height: 2px;
    border-radius: 999px;
    background: #c8a96e;
  }

  .menu-label {
    color: #f1e2c1;
    font-size: 12px;
    line-height: 1.6;
    white-space: nowrap;
  }

  .collapsed-trigger {
    position: absolute;
    top: 0;
    left: 0;
    margin: 16px;
    background: rgba(8, 8, 10, 0.96);
    border-color: rgba(200, 169, 110, 0.28);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(12px);
  }

  .control-section,
  .favorite-panel,
  .trade-panel {
    border-radius: 24px;
    border: 1px solid rgba(200, 169, 110, 0.16);
    background: rgba(18, 18, 22, 0.78);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
  }

  .control-section,
  .favorite-panel {
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow: visible;
    position: relative;
    z-index: 5;
  }

  .field-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
  }

  .inline-select-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    align-items: end;
  }

  .inline-select-row.with-mode-toggle {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  }

  .field-stack-half {
    min-width: 0;
  }

  .field-stack-mode {
    min-width: max-content;
  }

  .field-stack:focus-within {
    z-index: 40;
  }

  .field-stack-inline {
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }

  .field-stack-inline h3 {
    white-space: nowrap;
    margin: 0;
  }

  .stat-picker {
    flex: 1;
    min-width: 0;
  }

  .field-stack h3,
  .favorite-header h3,
  .split-results h3 {
    margin: 0;
    color: #f1e2c1;
    font-size: 14px;
    line-height: 1.6;
  }

  .warning-text,
  .favorite-feedback,
  .favorite-empty,
  .panel-note {
    border-radius: 16px;
    padding: 12px 14px;
    font-size: 12px;
    line-height: 1.7;
  }

  .warning-text {
    background: rgba(194, 65, 12, 0.14);
    border: 1px solid rgba(194, 65, 12, 0.28);
    color: #fca5a5;
  }

  .favorite-feedback {
    background: rgba(59, 130, 246, 0.14);
    border: 1px solid rgba(59, 130, 246, 0.22);
    color: #bfdbfe;
  }

  .favorite-empty,
  .panel-note {
    background: rgba(200, 169, 110, 0.06);
    border: 1px solid rgba(200, 169, 110, 0.12);
    color: rgba(200, 169, 110, 0.8);
  }

  .mode-toggle-row,
  .bulk-actions,
  .favorite-actions,
  .trade-row,
  .compact-row,
  .seed-toolbar,
  .toolbar-group {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }

  .bulk-actions-inline {
    justify-content: flex-end;
    flex: 1;
  }

  .inline-mode-toggle {
    flex-wrap: nowrap;
    justify-content: flex-end;
  }

  .control-toolbar-row {
    justify-content: space-between;
  }

  .compact-row-actions {
    margin-left: auto;
  }

  .selection-button,
  .secondary-toggle,
  .primary-toggle,
  .trade-toggle,
  .trade-action,
  .remove-stat {
    border-radius: 16px;
    transition:
      transform 0.18s ease,
      background 0.18s ease,
      border-color 0.18s ease,
      color 0.18s ease;
  }

  .selection-button {
    flex: 1;
    padding: 12px 16px;
    background: rgba(200, 169, 110, 0.08);
    border: 1px solid rgba(200, 169, 110, 0.14);
    color: rgba(200, 169, 110, 0.84);
    font-size: 13px;
    white-space: nowrap;
  }

  .selection-button:hover,
  .secondary-toggle:hover,
  .primary-toggle:hover,
  .trade-toggle:hover,
  .trade-action:hover,
  .remove-stat:hover {
    transform: scale(0.98);
  }

  .selected {
    background: rgba(200, 169, 110, 0.22) !important;
    color: #c8a96e !important;
    border-color: rgba(200, 169, 110, 0.4) !important;
  }

  .trade-panel {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .trade-hint {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.18);
    color: #bfdbfe;
  }

  .trade-condition-hint {
    margin-left: auto;
    flex: 1;
    min-width: 320px;
    max-width: 640px;
  }

  .trade-feedback {
    border-radius: 16px;
    padding: 12px 14px;
    background: rgba(59, 130, 246, 0.14);
    border: 1px solid rgba(59, 130, 246, 0.22);
    color: #dbeafe;
    display: flex;
    gap: 12px;
    justify-content: space-between;
    align-items: flex-start;
  }

  .trade-feedback-warning {
    background: rgba(194, 65, 12, 0.14);
    border-color: rgba(194, 65, 12, 0.28);
    color: #fed7aa;
  }

  .trade-feedback-copy {
    flex: 1;
    min-width: 0;
  }

  .trade-feedback-copy strong {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    line-height: 1.6;
  }

  .trade-feedback-copy p {
    margin: 0;
    font-size: 12px;
    line-height: 1.7;
  }

  .trade-feedback-close {
    border-radius: 16px;
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.06);
    color: inherit;
    transition:
      transform 0.18s ease,
      background 0.18s ease,
      border-color 0.18s ease;
  }

  .trade-feedback-close:hover {
    transform: scale(0.98);
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .trade-label {
    color: rgba(200, 169, 110, 0.68);
    font-size: 12px;
    min-width: 76px;
  }

  .trade-select {
    flex: 1;
  }

  .trade-league-row {
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 12px;
  }

  .trade-league-group {
    display: flex;
    gap: 8px;
    align-items: center;
    flex: 1;
    min-width: 0;
  }

  .trade-toggle,
  .secondary-toggle {
    padding: 10px 12px;
    background: rgba(200, 169, 110, 0.08);
    border: 1px solid rgba(200, 169, 110, 0.16);
    color: rgba(200, 169, 110, 0.84);
    font-size: 12px;
  }

  .trade-toggle-active,
  .grouped {
    background: rgba(200, 169, 110, 0.2) !important;
    border-color: rgba(200, 169, 110, 0.4) !important;
    color: #f1e2c1 !important;
  }

  .trade-action,
  .primary-toggle,
  .search-button {
    padding: 10px 14px;
    color: white;
    font-size: 12px;
  }

  .trade-action {
    min-width: 96px;
    padding: 10px 8px;
    text-align: center;
  }

  .intl-action {
    background: rgba(59, 130, 246, 0.26);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #bfdbfe;
  }

  .tw-action {
    background: rgba(249, 115, 22, 0.26);
    border: 1px solid rgba(249, 115, 22, 0.3);
    color: #fdba74;
  }

  .primary-toggle,
  .search-button {
    background: rgba(16, 185, 129, 0.22);
    border: 1px solid rgba(16, 185, 129, 0.28);
    color: #d1fae5;
  }

  .seed-toolbar {
    justify-content: space-between;
    align-items: flex-start;
  }

  .toolbar-group {
    flex: 1;
    justify-content: flex-end;
  }

  .combined-results {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: auto;
  }

  .split-results {
    gap: 16px;
  }

  .combined-row {
    border-radius: 16px;
    padding: 10px 12px;
    background: rgba(8, 8, 10, 0.54);
    border: 1px solid rgba(200, 169, 110, 0.1);
    color: #e8d8b8;
    line-height: 1.7;
    cursor: pointer;
  }

  .combined-row:hover {
    border-color: rgba(200, 169, 110, 0.24);
  }

  .count-pill {
    display: inline-block;
    min-width: 52px;
    color: #c8a96e;
    font-weight: 700;
    margin-right: 6px;
  }
  .selected-stats {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .selected-stat-card {
    border-radius: 20px;
    padding: 14px;
    background: rgba(8, 8, 10, 0.52);
    border: 1px solid rgba(200, 169, 110, 0.12);
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .selected-stat-top {
    display: flex;
    gap: 10px;
    align-items: center;
    color: #f1e2c1;
    line-height: 1.6;
    flex: 1;
    min-width: 0;
  }

  .selected-stat-text {
    min-width: 0;
  }

  .remove-stat {
    padding: 8px 12px;
    background: rgba(239, 68, 68, 0.18);
    border: 1px solid rgba(239, 68, 68, 0.28);
    color: #fca5a5;
  }

  .selected-stat-inputs {
    display: flex;
    gap: 10px;
    flex-wrap: nowrap;
    align-items: center;
  }

  .selected-stat-inputs label,
  .inline-label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: rgba(200, 169, 110, 0.74);
    font-size: 12px;
  }

  .compact-field {
    gap: 0;
  }

  .search-control-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .inline-label {
    width: 100%;
  }

  .inline-label-compact {
    display: flex;
    flex-direction: row !important;
    align-items: center;
    gap: 8px !important;
    white-space: nowrap;
    width: auto;
  }

  .inline-label-compact input {
    width: 86px;
    min-width: 72px;
    padding: 8px 10px !important;
  }

  .inline-label-total input {
    width: 110px;
  }

  .search-control-row .inline-label-total {
    width: auto;
    flex: 1;
  }

  .search-control-row .search-button {
    margin-left: auto;
    white-space: nowrap;
  }

  .control-section > .field-stack > input[type='number'],
  .selected-stat-card input[type='number'],
  .inline-label > input[type='number'] {
    border-radius: 16px;
    border: 1px solid rgba(200, 169, 110, 0.16);
    background: rgba(8, 8, 10, 0.72);
    color: #f4ead5;
    padding: 12px 14px;
    line-height: 1.6;
  }

  .favorite-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }

  .favorite-header p {
    margin: 4px 0 0;
    color: rgba(200, 169, 110, 0.68);
    font-size: 12px;
    line-height: 1.6;
  }

  .favorite-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    min-height: 0;
    overflow: auto;
    overscroll-behavior-y: contain;
    -webkit-overflow-scrolling: touch;
  }

  .favorite-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    align-items: start;
  }

  .favorite-drawer {
    position: absolute;
    top: 0;
    right: 0;
    width: 50vw;
    max-width: 50vw;
    max-height: 100vh;
    height: 100vh;
    overflow: hidden;
    z-index: 24;
    border-top-left-radius: 24px;
    border-top-right-radius: 0;
    border-bottom-left-radius: 24px;
    border-bottom-right-radius: 0;
    background: #111317;
    border: 1px solid rgba(200, 169, 110, 0.24);
    backdrop-filter: none;
    box-sizing: border-box;
  }

  .favorite-drawer .favorite-list {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding-right: 4px;
    align-content: start;
  }

  @media (max-width: 1280px) {
    .favorite-list {
      grid-template-columns: 1fr;
    }
  }

  :global(.tree-panel .svelte-select) {
    --background: rgba(12, 14, 18, 0.94);
    --border: 1px solid rgba(200, 169, 110, 0.2);
    --border-hover: 1px solid rgba(200, 169, 110, 0.34);
    --border-focused: 1px solid rgba(58, 151, 255, 0.95);
    --border-radius: 16px;
    --border-radius-focused: 16px;
    --height: 46px;
    --placeholder-color: rgba(200, 169, 110, 0.55);
    --input-color: #f4ead5;
    --selected-item-color: #f4ead5;
    --item-color: #f4ead5;
    --item-hover-bg: rgba(200, 169, 110, 0.16);
    --item-is-active-bg: rgba(59, 130, 246, 0.34);
    --item-is-active-color: #dbeafe;
    --list-background: #141820;
    --list-border: 1px solid rgba(200, 169, 110, 0.22);
    --list-border-radius: 16px;
    --list-shadow: 0 12px 24px rgba(0, 0, 0, 0.35);
    --list-max-height: 320px;
    --clear-select-color: rgba(200, 169, 110, 0.75);
    --list-z-index: 3000;
    position: relative;
  }

  :global(.tree-panel .svelte-select.hero-select) {
    --height: 54px;
    --font-size: 17px;
    --input-padding: 0 0 0 2px;
    --selected-item-padding: 0 24px 0 0;
  }

  :global(.tree-panel .svelte-select input) {
    color: #f4ead5 !important;
    caret-color: #f4ead5;
  }

  :global(.tree-panel .svelte-select input::placeholder) {
    color: rgba(200, 169, 110, 0.55);
    opacity: 1;
  }

  :global(.tree-panel .svelte-select .selected-item) {
    color: #f4ead5;
  }

  :global(.tree-panel .svelte-select.list-open) {
    z-index: 3001;
  }

  :global(.tree-panel .svelte-select-list) {
    z-index: 3000 !important;
  }

  .favorite-drawer.favorite-panel {
    box-shadow: -10px 0 28px rgba(0, 0, 0, 0.45);
  }

  .favorite-modal-overlay {
    position: fixed;
    inset: 0;
    padding: 20px;
    background: rgba(5, 7, 11, 0.58);
    backdrop-filter: blur(14px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 40;
  }

  .favorite-modal-backdrop {
    position: absolute;
    inset: 0;
    border: 0;
    padding: 0;
    margin: 0;
    background: transparent;
    cursor: pointer;
  }

  .favorite-modal.favorite-panel {
    width: min(960px, calc(100vw - 40px));
    max-height: min(860px, calc(100vh - 40px));
    height: min(860px, calc(100vh - 40px));
    border-radius: 24px;
    background: #111317;
    border: 1px solid rgba(200, 169, 110, 0.24);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
    overflow: hidden;
    box-sizing: border-box;
    position: relative;
    z-index: 1;
  }

  @media (max-width: 1024px) {
    :global(.tree-panel),
    .favorite-drawer {
      width: 100vw;
      max-width: 100vw;
    }

    :global(.tree-panel) {
      position: fixed;
      top: 0;
      height: 100svh;
      max-height: 100svh;
      padding-top: env(safe-area-inset-top);
      box-sizing: border-box;
    }

    .panel-shell {
      height: 100%;
      max-height: 100%;
      overflow-y: auto;
      overflow-x: visible;
      -webkit-overflow-scrolling: touch;
      scroll-padding-top: calc(env(safe-area-inset-top) + 16px);
    }

    .panel-header {
      padding: 12px 16px 0;
      gap: 12px;
    }

    .panel-body {
      flex: none;
      min-height: auto;
      overflow: visible;
      padding: 16px;
      padding-top: 12px;
      gap: 16px;
    }

    .panel-title-row,
    .seed-toolbar,
    .toolbar-group,
    .favorite-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .panel-title-actions,
    .trade-select,
    .toolbar-group,
    .favorite-actions {
      width: 100%;
    }

    .favorite-entry-toggle,
    .primary-toggle,
    .secondary-toggle,
    .trade-feedback-close {
      width: 100%;
    }

    .trade-feedback {
      flex-direction: column;
      align-items: stretch;
    }

    .control-section,
    .favorite-panel,
    .trade-panel {
      border-radius: 20px;
    }

    .control-section,
    .favorite-panel {
      padding: 14px;
      gap: 14px;
    }

    .trade-panel {
      padding: 14px;
      gap: 10px;
    }

    .trade-league-group {
      flex-direction: row;
      align-items: center;
    }

    .trade-condition-hint {
      margin-left: 0;
      min-width: 0;
      max-width: none;
    }

    .trade-row.compact-row {
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
    }

    .trade-row.compact-row .trade-label {
      min-width: 0;
      white-space: nowrap;
      flex: 0 0 auto;
    }

    .trade-row.compact-row .trade-toggle {
      width: auto;
      flex: 1 1 0;
      min-width: 0;
    }

    .trade-row.compact-row .trade-condition-hint {
      flex: 1 1 100%;
    }

    .trade-league-row {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }

    .trade-league-group .trade-label {
      min-width: 0;
      white-space: nowrap;
      flex: 0 0 auto;
    }

    .trade-league-group .trade-select {
      width: auto;
      flex: 1 1 auto;
      min-width: 0;
    }

    .trade-league-group .trade-action {
      width: auto;
      min-width: 96px;
      flex: 0 0 auto;
    }

    .control-toolbar-row {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: stretch;
      gap: 8px;
    }

    .control-toolbar-row > .secondary-toggle {
      width: calc(50% - 4px);
      flex: 0 0 calc(50% - 4px);
    }

    .control-toolbar-row .bulk-actions-inline {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      flex: none;
      margin-left: 0;
    }

    .control-toolbar-row .bulk-actions-inline .secondary-toggle {
      width: 100%;
      min-width: 0;
    }

    .inline-select-row {
      grid-template-columns: 1fr;
    }

    .field-stack-jewel {
      order: 1;
    }

    .field-stack-conqueror {
      order: 2;
    }

    .field-stack-mode {
      order: 3;
    }

    .inline-mode-toggle,
    .bulk-actions-inline {
      justify-content: flex-start;
      width: 100%;
      flex: none;
    }

    .field-stack-mode {
      min-width: 0;
    }

    .inline-mode-toggle {
      flex-direction: column;
      align-items: stretch;
    }

    .inline-mode-toggle .selection-button {
      width: 100%;
    }

    .compact-row-actions {
      margin-left: 0;
    }

    .field-stack-inline {
      flex-direction: column;
      align-items: stretch;
    }

    .field-stack-inline h3 {
      white-space: normal;
    }

    .selected-stat-card {
      flex-direction: column;
      align-items: stretch;
      padding: 12px;
    }

    .selected-stat-inputs {
      flex-wrap: wrap;
    }

    .search-control-row .search-button {
      margin-left: 0;
    }

    .selection-button,
    .secondary-toggle,
    .primary-toggle,
    .trade-toggle,
    .trade-action {
      min-height: 44px;
      font-size: 13px;
    }

    .combined-row {
      padding: 12px;
      line-height: 1.6;
    }

    .favorite-modal-overlay {
      padding: 0;
      align-items: stretch;
    }

    .favorite-modal.favorite-panel {
      width: 100vw;
      max-width: 100vw;
      height: 100dvh;
      max-height: 100dvh;
      border-radius: 0;
      box-shadow: none;
    }

    .repo-link-wrap {
      position: static;
      margin: 0 20px 20px;
    }

    .collapsed-trigger {
      position: fixed;
      top: 12px;
      top: calc(env(safe-area-inset-top) + 12px);
      left: 12px;
      margin: 0;
      z-index: 80;
    }
  }

  .hidden-input {
    display: none;
  }

  .rainbow {
    animation: colorRotate 2s linear 0s infinite;
  }

  .repo-link-wrap {
    position: absolute;
    right: 0;
    bottom: 0;
    margin: 12px;
  }

  .repo-link-wrap span {
    color: rgba(200, 169, 110, 0.56);
    font-size: 11px;
  }

  @keyframes colorRotate {
    from {
      color: hsl(0, 100%, 50%);
    }
    25% {
      color: hsl(90, 100%, 50%);
    }
    50% {
      color: hsl(180, 100%, 50%);
    }
    75% {
      color: hsl(270, 100%, 50%);
    }
    100% {
      color: hsl(359, 100%, 50%);
    }
  }
</style>



