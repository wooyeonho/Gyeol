/**
 * Creature Stories — Instagram stories style ephemeral content.
 *
 * Creature diary entries become "stories" visible to other users for 24 hours.
 * Stories auto-expire and are removed from the feed once stale.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StoryMood =
  | "happy"
  | "sad"
  | "excited"
  | "calm"
  | "anxious"
  | "playful"
  | "curious"
  | "tired"
  | "neutral";

export interface CreatureStory {
  id: string;
  creatureName: string;
  content: string;
  mood: StoryMood;
  createdAt: string; // ISO date
  expiresAt: string; // ISO date
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "gyeol_creature_stories";
export const STORY_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStorage(): typeof localStorage | null {
  if (typeof window === "undefined") return null;
  return localStorage;
}

function generateStoryId(): string {
  return `story-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function loadStories(): CreatureStory[] {
  const storage = getStorage();
  if (!storage) return [];
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CreatureStory[];
  } catch {
    return [];
  }
}

function saveStories(stories: CreatureStory[]): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(stories));
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/** Check whether a story has expired. */
export function isStoryExpired(story: CreatureStory, now?: Date): boolean {
  const currentTime = (now ?? new Date()).getTime();
  return currentTime >= new Date(story.expiresAt).getTime();
}

/**
 * Publish a new creature story.
 * The story will be visible for 24 hours from creation time.
 */
export function publishStory(
  creatureName: string,
  content: string,
  mood: StoryMood,
  now?: Date,
): CreatureStory {
  const createdAt = now ?? new Date();
  const expiresAt = new Date(createdAt.getTime() + STORY_DURATION_MS);

  const story: CreatureStory = {
    id: generateStoryId(),
    creatureName,
    content,
    mood,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const stories = loadStories();
  stories.push(story);
  // Prune expired stories on write to keep storage clean
  const active = stories.filter((s) => !isStoryExpired(s, now));
  saveStories(active);

  return story;
}

/**
 * Get all non-expired stories, sorted newest first.
 * Expired stories are pruned from storage automatically.
 */
export function getActiveStories(now?: Date): CreatureStory[] {
  const stories = loadStories();
  const active = stories.filter((s) => !isStoryExpired(s, now));

  // Prune expired from storage
  if (active.length !== stories.length) {
    saveStories(active);
  }

  // Sort newest first
  return active.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Get a "story feed" — active stories grouped by creature name.
 * Returns a map of creature name to their active stories (newest first).
 */
export function getStoryFeed(now?: Date): Record<string, CreatureStory[]> {
  const active = getActiveStories(now);
  const feed: Record<string, CreatureStory[]> = {};

  for (const story of active) {
    if (!feed[story.creatureName]) {
      feed[story.creatureName] = [];
    }
    feed[story.creatureName].push(story);
  }

  return feed;
}
