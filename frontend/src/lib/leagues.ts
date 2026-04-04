type LeagueRuleLike = {
  id?: string;
  name?: string;
};

export type LeagueLike = {
  id?: string;
  name?: string;
  current?: boolean;
  category?: {
    current?: boolean;
    id?: string;
  };
  rules?: LeagueRuleLike[];
};

const getLeagueName = (league: LeagueLike): string =>
  (league.id || league.name || '').trim();

const hasRule = (league: LeagueLike, pattern: RegExp): boolean =>
  (league.rules || []).some((rule) => pattern.test(`${rule.id || ''} ${rule.name || ''}`));

const isHardcoreLeague = (league: LeagueLike): boolean => {
  const name = getLeagueName(league);
  return /hardcore/i.test(name) || hasRule(league, /hardcore/i);
};

export const isSoloSelfFoundLeague = (league: LeagueLike): boolean => {
  const name = getLeagueName(league);
  return /solo self-found|\bssf\b/i.test(name) || hasRule(league, /solo self-found|noparties|\bssf\b/i);
};

const isRuthlessLeague = (league: LeagueLike): boolean => {
  const name = getLeagueName(league);
  return /ruthless/i.test(name) || hasRule(league, /ruthless/i);
};

const isPermanentLeague = (league: LeagueLike): boolean => {
  const name = getLeagueName(league);
  return /^(standard|hardcore)$/i.test(name);
};

const isCurrentLeague = (league: LeagueLike): boolean =>
  league.current === true || league.category?.current === true;

const isSoftcoreTradeLeague = (league: LeagueLike): boolean =>
  !!getLeagueName(league) &&
  !isHardcoreLeague(league) &&
  !isSoloSelfFoundLeague(league) &&
  !isRuthlessLeague(league);

export const pickCurrentLeagueValue = (leagues: LeagueLike[], fallback = 'Standard'): string => {
  const namedLeagues = leagues.filter((league) => !!getLeagueName(league));

  const currentLeague = namedLeagues.find((league) => isCurrentLeague(league) && isSoftcoreTradeLeague(league));
  if (currentLeague) {
    return getLeagueName(currentLeague);
  }

  const nonPermanentTradeLeague = namedLeagues.find(
    (league) => isSoftcoreTradeLeague(league) && !isPermanentLeague(league)
  );
  if (nonPermanentTradeLeague) {
    return getLeagueName(nonPermanentTradeLeague);
  }

  const softcoreTradeLeague = namedLeagues.find((league) => isSoftcoreTradeLeague(league));
  if (softcoreTradeLeague) {
    return getLeagueName(softcoreTradeLeague);
  }

  return fallback;
};
