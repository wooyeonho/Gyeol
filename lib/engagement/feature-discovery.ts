/**
 * P10A: Feature Discovery CTA system.
 *
 * After certain message milestones, shows a subtle CTA to guide users
 * to features they haven't tried yet. This drives feature adoption
 * without interrupting the chat flow.
 *
 * Strategy: check localStorage for visited features, suggest the most
 * relevant unvisited one at natural breakpoints.
 */

const STORAGE_KEY = "gyeol:visited_features";

type Feature = {
  id: string;
  route: string;
  triggerAfterMessages: number;
  label: { ko: string; en: string };
  emoji: string;
};

const FEATURES: Feature[] = [
  { id: "quiz", route: "/quiz", triggerAfterMessages: 3, emoji: "🧬", label: { ko: "성격 퀴즈로 DNA를 정해보세요", en: "Take the personality quiz to shape DNA" } },
  { id: "care", route: "/care", triggerAfterMessages: 8, emoji: "🍎", label: { ko: "생명체에게 밥을 줄 수 있어요", en: "You can feed your creature" } },
  { id: "diary", route: "/diary", triggerAfterMessages: 15, emoji: "📖", label: { ko: "생명체의 일기를 확인해보세요", en: "Check your creature's diary" } },
  { id: "journey", route: "/journey", triggerAfterMessages: 25, emoji: "🗺️", label: { ko: "함께한 여정을 돌아보세요", en: "Look back on your journey together" } },
  { id: "dna-edit", route: "/dna-edit", triggerAfterMessages: 40, emoji: "✏️", label: { ko: "DNA를 직접 편집해보세요", en: "Try editing DNA directly" } },
  { id: "creature-conversation", route: "/creature-conversation", triggerAfterMessages: 50, emoji: "💬", label: { ko: "다른 생명체와 대화시켜보세요", en: "Let creatures talk to each other" } },
];

function getVisitedFeatures(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function markFeatureVisited(featureId: string): void {
  try {
    const visited = getVisitedFeatures();
    visited.add(featureId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]));
  } catch { /* silent */ }
}

/**
 * Returns a feature CTA to show, or null if no CTA is appropriate right now.
 * Call this after a successful assistant response.
 */
export function getFeatureDiscoveryCTA(
  totalMessages: number,
  locale: string = "ko",
): { id: string; route: string; text: string; emoji: string } | null {
  const visited = getVisitedFeatures();
  const lang = locale.startsWith("en") ? "en" : "ko";

  for (const feature of FEATURES) {
    if (visited.has(feature.id)) continue;
    if (totalMessages >= feature.triggerAfterMessages) {
      return {
        id: feature.id,
        route: feature.route,
        text: feature.label[lang],
        emoji: feature.emoji,
      };
    }
  }
  return null;
}
