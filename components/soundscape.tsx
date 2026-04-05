"use client";

import { useEffect, useRef, useState } from "react";

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
}: {
  enabled: boolean;
  soundProfile?: SoundProfile | null;
  label?: string;
  accentColor?: string;
  voiceHint?: VoiceHint | null;
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
  }, [enabled, soundProfile, voiceHint]);

  if (!enabled) return null;
  return (
    <div
      className="fixed bottom-16 right-4 z-30 flex items-center gap-2 rounded-full border bg-black/60 px-3 py-1.5 backdrop-blur-md"
      style={{ borderColor: `${accentColor}40` }}
    >
      <span className="text-xs" style={{ color: playing ? accentColor : "rgba(255,255,255,0.45)" }}>
        {playing ? "♪" : "—"}
      </span>
      {label && <span className="text-[11px] text-white/55">{label}</span>}
    </div>
  );
}
