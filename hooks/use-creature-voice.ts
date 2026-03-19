"use client";

import { useCallback, useRef, useEffect } from "react";
import type { VoiceDNAParams, EmotionModulation } from "@/lib/genome/voice-synth";

type ToneLib = typeof import("tone");

/**
 * Hook for playing DNA-derived creature vocalizations using Tone.js.
 *
 * Usage:
 *   const { speak, chirp, hum } = useCreatureVoice(voiceParams);
 *   // On message received: speak()
 *   // On tap: chirp()
 *   // Idle ambient: hum()
 */
export function useCreatureVoice(params: VoiceDNAParams | null) {
  const toneRef = useRef<ToneLib | null>(null);
  const synthRef = useRef<{ synth: InstanceType<ToneLib["Synth"]> | InstanceType<ToneLib["FMSynth"]>; noise: InstanceType<ToneLib["Noise"]> | null; dispose: () => void } | null>(null);
  const isPlayingRef = useRef(false);

  // Lazy-load Tone.js
  const ensureTone = useCallback(async () => {
    if (toneRef.current) return toneRef.current;
    const Tone = await import("tone");
    toneRef.current = Tone;
    return Tone;
  }, []);

  // Build synth from params
  const ensureSynth = useCallback(async () => {
    if (!params) return null;
    if (synthRef.current) return synthRef.current;

    const Tone = await ensureTone();
    await Tone.start();

    // Create main oscillator based on timbre
    let synth: InstanceType<ToneLib["Synth"]> | InstanceType<ToneLib["FMSynth"]>;

    if (params.timbre === "fmsine" || params.timbre === "fmtriangle") {
      synth = new Tone.FMSynth({
        harmonicity: 2.5,
        modulationIndex: 3,
        envelope: {
          attack: params.attack,
          decay: params.decay,
          sustain: params.sustain,
          release: params.release,
        },
      }).toDestination();
    } else {
      synth = new Tone.Synth({
        oscillator: {
          type: params.timbre === "amsine" ? "amsine2" as const : params.timbre === "triangle" ? "triangle" as const : "sine" as const,
        },
        envelope: {
          attack: params.attack,
          decay: params.decay,
          sustain: params.sustain,
          release: params.release,
        },
      }).toDestination();
    }

    // Breathiness noise
    let noise: InstanceType<ToneLib["Noise"]> | null = null;
    if (params.breathiness > 0.05) {
      const noiseGain = new Tone.Gain(params.breathiness * 0.15).toDestination();
      noise = new Tone.Noise("pink").connect(noiseGain);
    }

    // Vibrato LFO
    if (params.vibratoDepth > 0.02) {
      const vibrato = new Tone.Vibrato(params.vibratoRate, params.vibratoDepth);
      synth.connect(vibrato);
      vibrato.toDestination();
    }

    // Volume control
    synth.volume.value = -12;

    const handle = {
      synth,
      noise,
      dispose: () => {
        synth.dispose();
        noise?.dispose();
      },
    };
    synthRef.current = handle;
    return handle;
  }, [params, ensureTone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      synthRef.current?.dispose();
      synthRef.current = null;
    };
  }, []);

  /**
   * Play a multi-syllable vocalization (creature "speaking").
   * Uses the syllable pattern from DNA to generate a unique utterance.
   */
  const speak = useCallback(async (emotion?: EmotionModulation) => {
    if (!params || isPlayingRef.current) return;
    const handle = await ensureSynth();
    if (!handle) return;

    isPlayingRef.current = true;
    handle.noise?.start();

    const { modulateVoice } = await import("@/lib/genome/voice-synth");
    const p = emotion ? modulateVoice(params, emotion) : params;

    const Tone = toneRef.current!;
    const now = Tone.now();

    for (let i = 0; i < p.syllablePattern.length; i++) {
      const semitones = p.syllablePattern[i];
      const freq = p.baseFreq * Math.pow(2, semitones / 12);
      const time = now + i * p.syllableDuration * 1.2;
      handle.synth.triggerAttackRelease(freq, p.syllableDuration, time);
    }

    // Stop noise after all syllables
    const totalDuration = p.syllablePattern.length * p.syllableDuration * 1.2 + p.release;
    setTimeout(() => {
      handle.noise?.stop();
      isPlayingRef.current = false;
    }, totalDuration * 1000);
  }, [params, ensureSynth]);

  /**
   * Play a short chirp (tap response, greeting).
   * 2-3 quick syllables ascending.
   */
  const chirp = useCallback(async () => {
    if (!params || isPlayingRef.current) return;
    const handle = await ensureSynth();
    if (!handle) return;

    isPlayingRef.current = true;
    const Tone = toneRef.current!;
    const now = Tone.now();
    const notes = [0, 4, 7]; // ascending major triad in semitones

    for (let i = 0; i < notes.length; i++) {
      const freq = params.baseFreq * Math.pow(2, notes[i] / 12);
      handle.synth.triggerAttackRelease(freq, 0.06, now + i * 0.08);
    }

    setTimeout(() => { isPlayingRef.current = false; }, 400);
  }, [params, ensureSynth]);

  /**
   * Play a continuous ambient hum (idle state).
   * A single sustained note with slow vibrato.
   */
  const hum = useCallback(async (durationMs = 2000) => {
    if (!params || isPlayingRef.current) return;
    const handle = await ensureSynth();
    if (!handle) return;

    isPlayingRef.current = true;
    handle.noise?.start();
    handle.synth.triggerAttackRelease(params.baseFreq, durationMs / 1000);

    setTimeout(() => {
      handle.noise?.stop();
      isPlayingRef.current = false;
    }, durationMs + params.release * 1000);
  }, [params, ensureSynth]);

  return { speak, chirp, hum };
}
