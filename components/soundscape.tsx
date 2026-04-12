"use client";

import { useEffect, useRef, useState } from "react";
import { smartSpeedDuration, waveformPeaks, type StageRole, promoteRole, demoteRole } from "@/lib/audio/world-class-voice";
import { getVoiceLine, deriveSpeechParams, type VoiceLineTrigger } from "@/lib/creature/voice-lines";
import { getMoodFromDNA, generateMusicConfig, generateMelodyPattern, interpolateConfig, type MoodLayer, type MusicConfig } from "@/lib/sound/adaptive-music";
import { getBiomeFromContext, getBiomeSoundLayers, BIOME_SOUNDS, type BiomeType, type SoundLayer } from "@/lib/sound/biome-sounds";

type SoundProfile = { base_note?: string; tempo?: number; instruments?: string[]; scale?: string[] };

type VoiceHint = {
  baseFreq?: number;
  timbre?: "sine" | "triangle" | "fmsine" | "amsine" | "fmtriangle";
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  vibratoRate?: number;
  vibratoDepth?: number;
};

export default function Soundscape({
  enabled,
  soundProfile,
  label,
  accentColor = "#ffffff",
  voiceHint,
  mood,
  dnaModifier,
  creatureDna,
}: {
  enabled: boolean;
  soundProfile?: SoundProfile | null;
  label?: string;
  accentColor?: string;
  voiceHint?: VoiceHint | null;
  /** Current creature mood — triggers emotion sounds on change */
  mood?: string | null;
  /** DNA pitch modifier 0..1 for emotion sounds */
  dnaModifier?: number;
  /** Full creature DNA record for voice synthesis */
  creatureDna?: Record<string, number> | null;
}) {
  const [playing, setPlaying] = useState(false);
  const disposeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !soundProfile) {
      disposeRef.current?.();
      disposeRef.current = null;
      setPlaying(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const Tone = await import("tone");
        if (cancelled) return;
        const tempo = soundProfile.tempo ?? 80;
        const baseNote = soundProfile.base_note ?? "C4";
        const instrumentKey = soundProfile.instruments?.[0] ?? "piano";
        // DNA voice hint overrides synth type when available
        const vh = voiceHint;
        const envelope = vh ? { attack: vh.attack ?? 0.05, decay: vh.decay ?? 0.15, sustain: vh.sustain ?? 0.4, release: vh.release ?? 0.3 } : undefined;
        const synth =
          (vh?.timbre === "fmsine" || vh?.timbre === "fmtriangle" || instrumentKey.includes("bell"))
            ? new Tone.FMSynth({ ...(envelope ? { envelope } : {}) }).toDestination()
            : instrumentKey.includes("pad") || instrumentKey.includes("choir")
              ? new Tone.PolySynth(Tone.Synth).toDestination()
              : new Tone.Synth({
                  oscillator: { type: (vh?.timbre === "amsine" ? "amsine" : vh?.timbre === "triangle" ? "triangle" : "sine") as OscillatorType },
                  ...(envelope ? { envelope } : {}),
                }).toDestination();
        const scale = soundProfile.scale ?? [baseNote, `${baseNote}`, "E4", "G4", "C5", "G4", "E4", baseNote];
        const seq = new Tone.Sequence(
          (time, note) => {
            if (cancelled) return;
            synth.triggerAttackRelease(note, "8n", time);
          },
          scale,
          "4n"
        ).start(0);
        Tone.getTransport().bpm.value = tempo;
        await Tone.start();
        if (cancelled) return;
        Tone.getTransport().start();
        setPlaying(true);
        disposeRef.current = () => {
          seq.dispose();
          synth.dispose();
          Tone.getTransport().stop();
          setPlaying(false);
        };
      } catch {
        setPlaying(false);
      }
    })();
    return () => {
      cancelled = true;
      disposeRef.current?.();
      disposeRef.current = null;
      setPlaying(false);
    };
  }, [enabled, soundProfile]);

  // ── Creature emotion sounds — play on mood change ──
  const lastMoodRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !mood || mood === lastMoodRef.current) return;
    lastMoodRef.current = mood;
    import("@/lib/creature/emotion-sounds").then(({ shouldPlayEmotionSound, playEmotionSound }) => {
      if (shouldPlayEmotionSound(mood)) {
        playEmotionSound(mood, dnaModifier ?? 0.5);
      }
    }).catch(() => {});
  }, [enabled, mood, dnaModifier]);

  // ── Creature voice synthesis — vocalization on emotion change ──
  const lastVoiceMoodRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !mood || mood === lastVoiceMoodRef.current) return;
    lastVoiceMoodRef.current = mood;

    const dna = creatureDna ?? { playfulness: 0.5, intensity: 0.5 };

    // Lazy-load the creature voice module to keep initial bundle small
    import("@/lib/soundscape/creature-voice").then(({ getCreatureVoice, playCreatureVoice }) => {
      const profile = getCreatureVoice(mood, dna);
      // Delay the vocalization slightly so it layers after the emotion sound
      const delayMs = 120;
      setTimeout(() => {
        playCreatureVoice(profile);
      }, delayMs);
    }).catch(() => {});
  }, [enabled, mood, creatureDna]);

  // ── Adaptive music — mood-based soundtrack from DNA ──
  const [activeMood, setActiveMood] = useState<MoodLayer | null>(null);
  const [activeBiome, setActiveBiome] = useState<BiomeType | null>(null);
  const musicConfigRef = useRef<MusicConfig | null>(null);

  useEffect(() => {
    if (!enabled || !creatureDna) return;
    const dna = creatureDna as Record<string, number>;
    const newMood = getMoodFromDNA(dna);
    if (newMood !== activeMood) {
      setActiveMood(newMood);
      const config = generateMusicConfig(newMood);
      musicConfigRef.current = config;
    }
    // Determine biome from DNA + time
    const hour = new Date().getHours();
    const timeOfDay = hour < 6 ? "night" : hour < 9 ? "dawn" : hour < 17 ? "day" : hour < 20 ? "dusk" : "night";
    const biome = getBiomeFromContext(dna, timeOfDay);
    if (biome !== activeBiome) {
      setActiveBiome(biome);
    }
  }, [enabled, creatureDna]);

  // Compute waveform peaks for visual indicator
  const waveformBars = playing
    ? waveformPeaks(Array.from({ length: 64 }, (_, i) => Math.sin(i * 0.3) * (0.3 + Math.random() * 0.7)), 8)
    : [];

  // Smart-speed duration display (if we know raw duration)
  const smartDuration = playing ? smartSpeedDuration(60, 8000) : 0;

  // Biome layers for display
  const biomeLayers = activeBiome ? getBiomeSoundLayers(activeBiome, "day") : [];

  if (!enabled) return null;
  return (
    <div
      className="fixed bottom-16 right-4 z-30 flex items-center gap-2 rounded-full border bg-black/60 px-3 py-1.5 backdrop-blur-md"
      style={{ borderColor: `${accentColor}40` }}
    >
      <span className="text-xs" style={{ color: playing ? accentColor : "rgba(255,255,255,0.45)" }}>
        {playing ? "♪" : "—"}
      </span>
      {playing && waveformBars.length > 0 && (
        <div className="flex items-end gap-px h-3">
          {waveformBars.map((peak, i) => (
            <div
              key={i}
              className="w-[2px] rounded-full bg-white/30"
              style={{ height: `${Math.max(2, peak * 12)}px` }}
            />
          ))}
        </div>
      )}
      {activeMood && (
        <span className="text-[9px] text-white/35 uppercase tracking-wider">{activeMood}</span>
      )}
      {activeBiome && (
        <span className="text-[9px] text-white/25">{activeBiome}</span>
      )}
      {label && <span className="text-[11px] text-white/55">{label}</span>}
    </div>
  );
}
