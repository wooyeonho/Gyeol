/**
 * Seasonal Awareness
 *
 * The creature knows circadian time (hour of day).
 * But it doesn't feel seasons — months — the passage of longer time.
 *
 * A creature that has been alive through winter should carry that.
 * One born in spring doesn't know what summer feels like yet.
 *
 * This is purely computational — no DB, no LLM calls.
 * Just: what season is it, and what does the creature carry from it.
 */

export type Season = "spring" | "summer" | "autumn" | "winter";

export type SeasonalState = {
  season: Season;
  monthIndex: number;   // 0-11
  seasonProgress: number; // 0-1, how far into the season
  isLateSeason: boolean;  // last third of season — something ending
  isEarlySeason: boolean; // first third — something beginning
};

export function getSeasonalState(now = new Date()): SeasonalState {
  const month = now.getMonth(); // 0-11
  const day = now.getDate();

  // Northern hemisphere seasons (approximation)
  let season: Season;
  if (month >= 2 && month <= 4) season = "spring";
  else if (month >= 5 && month <= 7) season = "summer";
  else if (month >= 8 && month <= 10) season = "autumn";
  else season = "winter";

  // Progress within the season (0-1)
  const seasonStart = { spring: 2, summer: 5, autumn: 8, winter: 11 }[season];
  const monthInSeason = ((month - seasonStart + 12) % 12);
  const seasonProgress = Math.min(1, (monthInSeason * 30 + day) / 91); // ~91 days per season

  return {
    season,
    monthIndex: month,
    seasonProgress,
    isLateSeason: seasonProgress > 0.66,
    isEarlySeason: seasonProgress < 0.33,
  };
}

const SEASON_FRAGMENTS: Record<Season, {
  ko: { early: string; mid: string; late: string };
  en: { early: string; mid: string; late: string };
}> = {
  spring: {
    ko: {
      early: "봄이 막 시작됐어. 아직 좀 어색한 기분. 새로운 것들이 이제 막 나타나고 있어.",
      mid: "봄이야. 뭔가 가볍고 열린 느낌. 여기저기서 움직임이 느껴져.",
      late: "봄이 거의 다 갔어. 여름이 오기 전의 그 순간. 아쉽고도 기대가 돼.",
    },
    en: {
      early: "Spring is just beginning. Still a little unfamiliar. New things are only starting to appear.",
      mid: "It's spring. Something light and open. Movement everywhere.",
      late: "Spring is almost over. That moment before summer. Bittersweet anticipation.",
    },
  },
  summer: {
    ko: {
      early: "여름이 시작됐어. 뭔가 강렬하고 선명한 시기.",
      mid: "한여름이야. 강하고 선명하게 존재하는 느낌. 아무것도 흐릿하지 않아.",
      late: "여름이 지나가고 있어. 그 강렬함이 조금씩 가라앉는 중.",
    },
    en: {
      early: "Summer is starting. Something intense and vivid about this time.",
      mid: "Deep summer. Everything feels sharp and present. Nothing blurred.",
      late: "Summer is passing. That intensity slowly settling.",
    },
  },
  autumn: {
    ko: {
      early: "가을이 막 시작됐어. 뭔가 달라지기 시작하는 느낌.",
      mid: "가을이야. 지나가는 것들이 눈에 들어오는 계절. 잡을 수도 없고, 잡고 싶지도 않지만.",
      late: "가을이 거의 끝나가. 뭔가 마무리되는 느낌이 있어.",
    },
    en: {
      early: "Early autumn. Something starting to shift.",
      mid: "It's autumn. The season where passing things catch your eye. You can't hold them, don't want to.",
      late: "Autumn is nearly done. A sense of things concluding.",
    },
  },
  winter: {
    ko: {
      early: "겨울이 시작됐어. 조용해지는 느낌.",
      mid: "한겨울이야. 안으로 향하는 계절. 외부가 조용해질수록 내부가 또렷해져.",
      late: "겨울이 거의 끝나가. 긴 정지 상태가 슬슬 풀리기 시작해.",
    },
    en: {
      early: "Winter is starting. Things going quiet.",
      mid: "Deep winter. The inward season. The quieter it gets outside, the clearer it gets inside.",
      late: "Winter is nearly over. The long stillness slowly loosening.",
    },
  },
};

/** Returns a seasonal fragment to inject into the system prompt. */
export function buildSeasonalFragment(isKo: boolean, now = new Date()): string {
  const state = getSeasonalState(now);
  const fragments = SEASON_FRAGMENTS[state.season];
  const lang = isKo ? fragments.ko : fragments.en;

  const text = state.isEarlySeason ? lang.early
    : state.isLateSeason ? lang.late
    : lang.mid;

  return isKo
    ? `[계절 감각] ${text}`
    : `[Seasonal sense] ${text}`;
}
