"use client";

import { useEffect, useRef, useState } from "react";

type SoundProfile = { base_note?: string; tempo?: number; instruments?: string[] };

export default function Soundscape({
  enabled,
  soundProfile,
  label,
  accentColor = "#ffffff",
}: {
  enabled: boolean;
  soundProfile?: SoundProfile | null;
  label?: string;
  accentColor?: string;
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
        const synth =
          instrumentKey.includes("bell")
            ? new Tone.FMSynth().toDestination()
            : instrumentKey.includes("pad") || instrumentKey.includes("choir")
              ? new Tone.PolySynth(Tone.Synth).toDestination()
              : new Tone.Synth().toDestination();
        const seq = new Tone.Sequence(
          (time, note) => {
            if (cancelled) return;
            synth.triggerAttackRelease(note, "8n", time);
          },
          [baseNote, `${baseNote}`, "E4", "G4", "C5", "G4", "E4", baseNote],
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
