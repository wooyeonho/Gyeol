/**
 * AI Hyper-Personalization Engine — Spotify Wrapped + Duolingo adaptive difficulty.
 *
 * Analyzes user behavior patterns to personalize AI responses,
 * quest difficulty, and content recommendations.
 */

export interface UserBehaviorProfile {
  /** Average messages per day */
  avgMessagesPerDay: number;
  /** Most active time of day */
  peakHour: number;
  /** Dominant interaction style */
  interactionStyle: "casual" | "deep" | "playful" | "goal_oriented";
  /** Topics the user discusses most */
  topTopics: string[];
  /** Current engagement level (0-1) */
  engagementScore: number;
  /** Days since first interaction */
  daysSinceJoined: number;
  /** Current streak */
  currentStreak: number;
  /** Preferred response length */
  preferredResponseLength: "short" | "medium" | "long";
}

export interface PersonalizationConfig {
  /** AI response temperature adjustment (-0.3 to +0.3) */
  temperatureAdjust: number;
  /** Quest difficulty multiplier (0.5 to 2.0) */
  questDifficultyMultiplier: number;
  /** Recommended content types */
  contentRecommendations: string[];
  /** Optimal notification time */
  bestNotificationHour: number;
  /** Adaptive prompt adjustments */
  promptHints: string[];
}

/**
 * Analyze behavior patterns from message history to build a profile.
 */
export function buildBehaviorProfile(data: {
  totalMessages: number;
  daysSinceJoined: number;
  messagesByHour: number[];
  recentTopics: string[];
  currentStreak: number;
  avgMessageLength: number;
}): UserBehaviorProfile {
  const avgMessagesPerDay = data.daysSinceJoined > 0
    ? data.totalMessages / data.daysSinceJoined
    : data.totalMessages;

  // Find peak hour
  let peakHour = 0;
  let maxMessages = 0;
  for (let i = 0; i < data.messagesByHour.length; i++) {
    if (data.messagesByHour[i] > maxMessages) {
      maxMessages = data.messagesByHour[i];
      peakHour = i;
    }
  }

  // Determine interaction style
  let interactionStyle: UserBehaviorProfile["interactionStyle"];
  if (data.avgMessageLength > 200) interactionStyle = "deep";
  else if (data.avgMessageLength < 50) interactionStyle = "casual";
  else if (avgMessagesPerDay > 15) interactionStyle = "playful";
  else interactionStyle = "goal_oriented";

  // Engagement score based on recency + frequency + streak
  const freqScore = Math.min(1, avgMessagesPerDay / 20);
  const streakScore = Math.min(1, data.currentStreak / 30);
  const engagementScore = Math.round((freqScore * 0.6 + streakScore * 0.4) * 100) / 100;

  // Preferred response length
  let preferredResponseLength: UserBehaviorProfile["preferredResponseLength"];
  if (data.avgMessageLength < 30) preferredResponseLength = "short";
  else if (data.avgMessageLength > 150) preferredResponseLength = "long";
  else preferredResponseLength = "medium";

  // Top topics (deduplicate, take top 5)
  const topicCounts = new Map<string, number>();
  for (const topic of data.recentTopics) {
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
  }
  const topTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  return {
    avgMessagesPerDay: Math.round(avgMessagesPerDay * 10) / 10,
    peakHour,
    interactionStyle,
    topTopics,
    engagementScore,
    daysSinceJoined: data.daysSinceJoined,
    currentStreak: data.currentStreak,
    preferredResponseLength,
  };
}

/**
 * Generate personalization config from user behavior profile.
 */
export function generatePersonalizationConfig(
  profile: UserBehaviorProfile,
): PersonalizationConfig {
  // Temperature: playful users get higher creativity, deep users get more focused
  let temperatureAdjust = 0;
  if (profile.interactionStyle === "playful") temperatureAdjust = 0.15;
  else if (profile.interactionStyle === "deep") temperatureAdjust = -0.1;
  else if (profile.interactionStyle === "casual") temperatureAdjust = 0.05;

  // Quest difficulty: scale with engagement
  const questDifficultyMultiplier = Math.round(
    (0.5 + profile.engagementScore * 1.5) * 100
  ) / 100;

  // Content recommendations based on style
  const contentRecommendations: string[] = [];
  if (profile.interactionStyle === "deep") {
    contentRecommendations.push("philosophical_prompts", "deep_conversations", "story_arcs");
  } else if (profile.interactionStyle === "playful") {
    contentRecommendations.push("mini_games", "challenges", "social_features");
  } else if (profile.interactionStyle === "goal_oriented") {
    contentRecommendations.push("quests", "achievements", "skill_tree");
  } else {
    contentRecommendations.push("daily_check_in", "mood_tracking", "simple_games");
  }

  // Add topic-based recommendations
  if (profile.topTopics.length > 0) {
    contentRecommendations.push(`topic:${profile.topTopics[0]}`);
  }

  // Prompt hints for AI
  const promptHints: string[] = [];
  if (profile.preferredResponseLength === "short") {
    promptHints.push("Keep responses concise, 1-2 sentences max.");
  } else if (profile.preferredResponseLength === "long") {
    promptHints.push("User enjoys detailed, thoughtful responses.");
  }

  if (profile.currentStreak > 7) {
    promptHints.push(`User has a ${profile.currentStreak}-day streak — acknowledge dedication.`);
  }

  if (profile.engagementScore < 0.3) {
    promptHints.push("User engagement is low — be extra warm and encouraging.");
  }

  return {
    temperatureAdjust,
    questDifficultyMultiplier,
    contentRecommendations,
    bestNotificationHour: profile.peakHour,
    promptHints,
  };
}

/**
 * Calculate adaptive difficulty for a specific activity.
 */
export function adaptiveDifficulty(
  baseDifficulty: number,
  profile: UserBehaviorProfile,
  recentSuccessRate: number,
): number {
  // Duolingo-style: if success rate is too high, increase difficulty
  // if too low, decrease to prevent frustration
  let adjustment = 0;
  if (recentSuccessRate > 0.8) adjustment = 0.2;
  else if (recentSuccessRate > 0.6) adjustment = 0.1;
  else if (recentSuccessRate < 0.3) adjustment = -0.3;
  else if (recentSuccessRate < 0.5) adjustment = -0.15;

  const scaled = baseDifficulty * (1 + adjustment) * (0.5 + profile.engagementScore * 0.5);
  return Math.round(Math.max(0.1, Math.min(3.0, scaled)) * 100) / 100;
}
