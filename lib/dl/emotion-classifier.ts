/**
 * DL-based Emotion Classifier
 *
 * Replaces keyword-based mood detection with API-based classification.
 * Uses Cloudflare Workers AI or Gemini as the inference backend.
 * Falls back to keyword-based detection if API fails.
 */

export type EmotionResult = {
  /** Primary emotion (maps to 7 basic categories) */
  primary: "joy" | "sadness" | "anger" | "fear" | "surprise" | "disgust" | "neutral";
  /** Detailed mood (maps to Gyeol's 28 moods) */
  detailed: string;
  /** Confidence score 0..1 */
  confidence: number;
  /** Secondary emotion if detected */
  secondary?: string;
  /** Whether this came from DL model or keyword fallback */
  source: "dl" | "keyword";
};

// Maps 7 basic emotions to Gyeol's 28 mood system
const EMOTION_TO_MOOD: Record<string, string[]> = {
  joy: ["joyful", "playful", "excited", "proud", "inspired", "loving", "grateful", "mischievous", "energetic"],
  sadness: ["melancholy", "sad", "lonely"],
  anger: ["angry", "frustrated", "jealous"],
  fear: ["scared", "shy"],
  surprise: ["surprised", "confused"],
  disgust: ["frustrated", "bored"],
  neutral: ["peaceful", "thoughtful", "focused", "curious", "dreamy", "tender", "sleepy"],
};

/**
 * Classify emotion from text using Gemini API.
 * This is a lightweight call — just emotion classification, not full generation.
 */
export async function classifyEmotion(
  text: string,
  locale: string = "en",
): Promise<EmotionResult> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return fallbackClassify(text);

    const prompt = `Classify the emotion in this ${locale} text into exactly one category.
Categories: joy, sadness, anger, fear, surprise, disgust, neutral
Also pick the most specific mood from: joyful, playful, excited, proud, inspired, loving, grateful, mischievous, curious, thoughtful, dreamy, focused, peaceful, tender, melancholy, sad, lonely, angry, frustrated, scared, shy, jealous, surprised, confused, bored, energetic, sleepy

Text: "${text.slice(0, 300)}"

Respond in JSON: {"primary":"...","detailed":"...","confidence":0.0-1.0}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 100, temperature: 0.1 },
        }),
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!res.ok) return fallbackClassify(text);

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[^}]+\}/);
    if (!jsonMatch) return fallbackClassify(text);

    const parsed = JSON.parse(jsonMatch[0]);
    const primary = parsed.primary as EmotionResult["primary"];
    const detailed = parsed.detailed as string;
    const confidence = Math.min(1, Math.max(0, parsed.confidence ?? 0.5));

    // Validate primary is in our set
    if (!EMOTION_TO_MOOD[primary]) return fallbackClassify(text);

    // Validate detailed is in our mood list
    const allMoods = Object.values(EMOTION_TO_MOOD).flat();
    const validDetailed = allMoods.includes(detailed) ? detailed : EMOTION_TO_MOOD[primary][0];

    return {
      primary,
      detailed: validDetailed,
      confidence,
      source: "dl",
    };
  } catch {
    return fallbackClassify(text);
  }
}

/**
 * Keyword-based fallback classification.
 * Used when API is unavailable.
 */
function fallbackClassify(text: string): EmotionResult {
  const lower = text.toLowerCase();

  // Simple keyword matching
  const patterns: Array<{ pattern: RegExp; primary: EmotionResult["primary"]; detailed: string }> = [
    { pattern: /\b(happy|glad|great|awesome|love|yay|haha|lol)\b/i, primary: "joy", detailed: "joyful" },
    { pattern: /\b(sad|cry|miss|lonely|hurt)\b/i, primary: "sadness", detailed: "sad" },
    { pattern: /\b(angry|mad|hate|furious|annoyed)\b/i, primary: "anger", detailed: "angry" },
    { pattern: /\b(scared|afraid|worry|anxious|nervous)\b/i, primary: "fear", detailed: "scared" },
    { pattern: /\b(wow|omg|what|really|no way)\b/i, primary: "surprise", detailed: "surprised" },
    { pattern: /\b(curious|wonder|interesting|hmm)\b/i, primary: "neutral", detailed: "curious" },
    { pattern: /\b(tired|sleepy|exhausted|boring)\b/i, primary: "neutral", detailed: "sleepy" },
    // Korean
    { pattern: /(기뻐|행복|좋아|사랑|ㅋㅋ|ㅎㅎ)/u, primary: "joy", detailed: "joyful" },
    { pattern: /(슬퍼|울|보고싶|외로)/u, primary: "sadness", detailed: "sad" },
    { pattern: /(화나|짜증|싫어|열받)/u, primary: "anger", detailed: "angry" },
    { pattern: /(무서|걱정|불안)/u, primary: "fear", detailed: "scared" },
    { pattern: /(궁금|신기|흥미)/u, primary: "neutral", detailed: "curious" },
  ];

  for (const { pattern, primary, detailed } of patterns) {
    if (pattern.test(lower)) {
      return { primary, detailed, confidence: 0.5, source: "keyword" };
    }
  }

  return { primary: "neutral", detailed: "peaceful", confidence: 0.3, source: "keyword" };
}
