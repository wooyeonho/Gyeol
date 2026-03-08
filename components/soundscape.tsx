"use client";

import { useEffect, useRef, useState } from "react";

type SoundProfile = { base_note?: string; tempo?: number; instruments?: string[] };

export default function Soundscape({ enabled, soundProfile }: { enabled: boolean; soundProfile?: SoundProfile | null }) {
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
      const Tone = await import("tone");
      if (cancelled) return;
      const tempo = soundProfile.tempo ?? 80;
      const baseNote = soundProfile.base_note ?? "C4";
      const synth = new Tone.Synth().toDestination();
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
    })();
    return () => {
      cancelled = true;
      disposeRef.current?.();
      disposeRef.current = null;
      setPlaying(false);
    };
  }, [enabled, soundProfile?.tempo, soundProfile?.base_note]);

  if (!enabled) return null;
  return (
    <div className="fixed bottom-16 right-4 z-30 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-white/10">
      <span className="text-white/60 text-xs">{playing ? "♪" : "—"}</span>
    </div>
  );
}
