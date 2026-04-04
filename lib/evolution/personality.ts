import { generateJSON } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";
import { getLanguageName } from "@/lib/i18n/config";
import { resolveGenerationLocale } from "@/lib/i18n/generation";

/** All moods the creature can express — must match procedural-creature.tsx moodMod switch */
export const CREATURE_MOODS = [
  // positive
  "joyful", "playful", "excited", "proud", "inspired", "loving", "grateful", "mischievous",
  // calm
  "curious", "thoughtful", "dreamy", "focused", "peaceful", "tender",
  // negative
  "melancholy", "sad", "lonely", "angry", "frustrated", "scared", "shy", "jealous",
  // reactive
  "surprised", "confused", "bored", "energetic", "sleepy",
  // fallback
  "neutral",
] as const;
export type CreatureMood = (typeof CREATURE_MOODS)[number];

type PersonalityResult = {
  tone_suggestion?: "casual" | "formal" | "playful" | "serious";
  new_fragment?: string | null;
  mood?: string;
  visual_suggestion?: { color?: string; animation?: "float" | "pulse-fast" | "breathe-slow" } | null;
};

const MOOD_SET = new Set<string>(CREATURE_MOODS);

/** Validate a mood string — returns the mood if valid, "neutral" otherwise */
export function validateMood(raw: string | null | undefined): CreatureMood {
  if (!raw) return "neutral";
  const lower = raw.toLowerCase().trim();
  // Map legacy values from old 5-mood system
  if (lower === "happy") return "joyful";
  if (lower === "calm") return "peaceful";
  if (MOOD_SET.has(lower)) return lower as CreatureMood;
  return "neutral";
}

/**
 * Detect mood from a single message+reply pair (runs every chat turn).
 * Uses DL emotion classifier with keyword-based fallback.
 */
export async function detectTurnMoodAsync(message: string, locale: string = "en"): Promise<CreatureMood | null> {
  try {
    const { classifyEmotion } = await import("@/lib/dl/emotion-classifier");
    const result = await classifyEmotion(message, locale);
    if (result.detailed && MOOD_SET.has(result.detailed)) {
      return result.detailed as CreatureMood;
    }
  } catch {
    // DL failed — fall through to keyword detection
  }
  return null;
}

/**
 * Detect mood from a single message+reply pair (runs every chat turn).
 * Lightweight keyword-based detection — no AI call needed.
 * Used as synchronous fallback when DL classifier is unavailable.
 */
export function detectTurnMood(message: string, reply: string): CreatureMood | null {
  const text = `${message} ${reply}`.toLowerCase();

  // Use (?<!\w) instead of \b so Korean (Hangul) keywords match correctly.
  // JS \b only works with ASCII word chars, silently failing on Korean text.

  // Positive moods
  if (/(?<!\w)(haha|lol|ㅋㅋ|ㅎㅎ|재밌|funny|hilarious|장난)/.test(text)) return "playful";
  if (/(?<!\w)(wow|놀|surprise|unexpected|대박|헐|omg)/.test(text)) return "surprised";
  if (/(?<!\w)(proud|자랑|뿌듯|성취|accomplish|achieve)/.test(text)) return "proud";
  if (/(?<!\w)(영감|inspir|creative|아이디어|idea|motivated)/.test(text)) return "inspired";
  if (/(?:(?<!\w)(?:사랑|love|좋아해|like you|adore|heart)|💕|❤|🥰)/.test(text)) return "loving";
  if (/(?<!\w)(감사|thank|고마|appreciate|grateful)/.test(text)) return "grateful";
  if (/(?<!\w)(신나|excit|thrilled|설레|기대|can't wait)/.test(text)) return "excited";
  if (/(?<!\w)(기쁘|happy|행복|joy|즐|cheerful|좋[다아]|great)/.test(text)) return "joyful";
  if (/(?<!\w)(장난|naughty|tease|mischiev|심술|까불)/.test(text)) return "mischievous";

  // Calm moods
  if (/(?<!\w)(궁금|curious|wonder|what if|왜|how come|흥미)/.test(text)) return "curious";
  if (/(?<!\w)(생각|think|ponder|reflect|고민|음\.\.\.)/.test(text)) return "thoughtful";
  if (/(?<!\w)(꿈|dream|상상|imagine|fantasy|몽환)/.test(text)) return "dreamy";
  if (/(?<!\w)(집중|focus|concentrate|열중|몰두)/.test(text)) return "focused";
  if (/(?<!\w)(평화|peace|calm|편안|relax|안정)/.test(text)) return "peaceful";
  if (/(?<!\w)(따뜻|warm|tender|gentle|부드|다정)/.test(text)) return "tender";

  // Negative moods
  if (/(?<!\w)(외로|lonely|alone|혼자|miss you|보고싶)/.test(text)) return "lonely";
  if (/(?<!\w)(슬프|sad|울|cry|눈물|tear|속상)/.test(text)) return "sad";
  if (/(?<!\w)(우울|melanchol|depress|침울|gloomy)/.test(text)) return "melancholy";
  if (/(?<!\w)(화[나났]|angry|mad|짜증|annoy|frustrat|열받)/.test(text)) return "frustrated";
  if (/(?<!\w)(무서|scar|afraid|fear|겁|terrif|공포)/.test(text)) return "scared";
  if (/(?<!\w)(부끄|shy|embarrass|창피|쑥스)/.test(text)) return "shy";
  if (/(?<!\w)(질투|jealous|envy|부러|시기)/.test(text)) return "jealous";
  if (/(?<!\w)(혼란|confus|모르겠|don't understand|뭐지|what\?)/.test(text)) return "confused";
  if (/(?<!\w)(심심|bored|boring|지루|할 게 없)/.test(text)) return "bored";
  if (/(?<!\w)(졸|sleepy|tired|피곤|지침|exhausted)/.test(text)) return "sleepy";

  // High energy
  if (/(?:(?<!\w)(?:에너지|energy|활발|active|go go|화이팅|fighting)|!{2,})/.test(text)) return "energetic";

  return null; // no strong signal — keep current mood
}

export async function analyzePersonality(agentId: string) {
  const db = createServiceClient();
  const { data: chats } = await db.from("chats").select("content").eq("agent_id", agentId).eq("role", "user").order("created_at", { ascending: false }).limit(10);
  if (!chats || chats.length < 5) return;
  const { data: state } = await db.from("agent_state").select("*").eq("agent_id", agentId).single();
  if (!state) return;
  const locale = resolveGenerationLocale({ config: state.config });
  const language = getLanguageName(locale);

  const moodList = CREATURE_MOODS.join("|");
  const convos = chats.map((c) => c.content).join("\n");
  const result = await generateJSON<PersonalityResult>(
    "Analyze conversations. Respond ONLY with valid JSON. No explanation.",
    `Conversations:\n${convos}\n\nJSON: {"tone_suggestion":"casual|formal|playful|serious","new_fragment":"one ${language} sentence insight or null","mood":"${moodList}","visual_suggestion":{"color":"#hex","animation":"float|pulse-fast|breathe-slow"}|null}`
  );
  if (!result) return;

  const updates: Record<string, unknown> = {};
  if (result.tone_suggestion) updates.config = { ...state.config, tone: result.tone_suggestion };
  if (result.mood) updates.mood = validateMood(result.mood);
  if (result.new_fragment && result.new_fragment !== "null") {
    const fragments = [...(state.fragments || []), result.new_fragment].slice(-20);
    updates.fragments = fragments;
  }
  if (result.visual_suggestion) updates.visual = { ...state.visual, ...result.visual_suggestion };

  await db.from("agent_state").update(updates).eq("agent_id", agentId);
  await db.from("autonomous_logs").insert({ agent_id: agentId, action_type: "personality_evolution", summary: JSON.stringify(result) });
}
