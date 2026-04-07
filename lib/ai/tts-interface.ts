/**
 * TTS Provider Interface — adapter layer for external TTS services.
 *
 * Connects the DNA-derived VoiceDNAParams (lib/genome/voice-synth.ts) to
 * cloud TTS providers (ElevenLabs, Google Cloud TTS, Azure Speech, etc.).
 *
 * Currently GYEOL uses browser-native SpeechSynthesis (hooks/use-tts.tsx)
 * and Tone.js-based formant synthesis (lib/genome/voice-synth.ts).
 * This interface prepares for future integration with neural TTS services
 * that can produce more expressive, creature-specific vocalizations.
 */

import type { VoiceDNAParams, EmotionModulation } from "@/lib/genome/voice-synth";

/** Supported TTS provider backends */
export type TTSProvider = "native" | "elevenlabs" | "google-cloud" | "azure";

/** Request payload for external TTS generation */
export interface TTSRequest {
  /** Text to synthesize */
  text: string;
  /** DNA-derived voice parameters */
  voiceParams: VoiceDNAParams;
  /** Current emotional state modulation */
  emotion?: EmotionModulation;
  /** Target language (BCP-47 format: "ko-KR", "en-US", etc.) */
  locale: string;
  /** Audio format preference */
  format?: "mp3" | "opus" | "pcm";
  /** Speaking speed multiplier (0.5–2.0) */
  speedMultiplier?: number;
}

/** Response from TTS generation */
export interface TTSResponse {
  /** Audio data as ArrayBuffer or base64 */
  audio: ArrayBuffer;
  /** MIME type of the audio */
  mimeType: string;
  /** Duration in seconds */
  durationSeconds: number;
  /** Provider used */
  provider: TTSProvider;
}

/**
 * Map DNA voice params to provider-specific configuration.
 *
 * Each provider has different parameter ranges and names.
 * This function normalizes VoiceDNAParams into a provider-friendly format.
 */
export function mapVoiceToProviderConfig(
  voiceParams: VoiceDNAParams,
  provider: TTSProvider,
): Record<string, unknown> {
  switch (provider) {
    case "elevenlabs":
      return {
        stability: 0.3 + voiceParams.sustain * 0.5,
        similarity_boost: 0.5 + (1 - voiceParams.breathiness) * 0.4,
        style: voiceParams.vibratoDepth * 2,
        use_speaker_boost: voiceParams.baseFreq > 200,
      };
    case "google-cloud":
      return {
        pitch: ((voiceParams.baseFreq - 200) / 200) * 10, // -10 to +10 semitones
        speakingRate: 0.8 + voiceParams.syllableDuration * 4,
        volumeGainDb: voiceParams.formants[0]?.gain ? (voiceParams.formants[0].gain - 0.5) * 6 : 0,
      };
    case "azure":
      return {
        pitch: `${Math.round(((voiceParams.baseFreq - 200) / 200) * 50)}%`,
        rate: `${Math.round(voiceParams.syllableDuration * 500)}%`,
        volume: `${Math.round(voiceParams.sustain * 100)}%`,
      };
    case "native":
    default:
      return {
        pitch: voiceParams.baseFreq / 200, // Web Speech API: 0-2
        rate: 0.8 + voiceParams.syllableDuration * 4, // 0.1-10
      };
  }
}

/**
 * Estimate audio generation cost for a given text and provider.
 * Useful for budget-aware TTS routing (free tier → native, paid tier → neural).
 */
export function estimateTTSCost(
  textLength: number,
  provider: TTSProvider,
): { characters: number; estimatedUSD: number } {
  const chars = textLength;
  switch (provider) {
    case "elevenlabs":
      return { characters: chars, estimatedUSD: chars * 0.00003 }; // ~$30/1M chars
    case "google-cloud":
      return { characters: chars, estimatedUSD: chars * 0.000016 }; // ~$16/1M chars (Neural2)
    case "azure":
      return { characters: chars, estimatedUSD: chars * 0.000016 }; // ~$16/1M chars (Neural)
    case "native":
    default:
      return { characters: chars, estimatedUSD: 0 }; // Free
  }
}
