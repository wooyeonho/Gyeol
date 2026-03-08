import { createServiceClient } from "@/lib/supabase/service";

type SoundProfile = {
  base_note?: string;
  tempo?: number;
  instruments?: string[];
};

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const OCTAVE = 4;

function noteAt(index: number): string {
  const n = NOTES[index % NOTES.length];
  const o = OCTAVE + Math.floor(index / NOTES.length);
  return `${n}${o}`;
}

export type MusicParams = {
  base_note: string;
  tempo: number;
  instruments: string[];
  sequence: { note: string; duration: string; time: number }[];
  mood?: string;
};

export async function generateMusicParams(agentId: string, mood?: string): Promise<MusicParams | null> {
  const service = createServiceClient();
  const { data: stateRow } = await service
    .from("agent_state")
    .select("sound_profile, mood")
    .eq("agent_id", agentId)
    .single();
  const state = (stateRow ?? {}) as { sound_profile?: SoundProfile; mood?: string };
  const profile = state.sound_profile ?? { base_note: "C4", tempo: 80, instruments: ["piano"] };
  const m = mood ?? state.mood ?? "neutral";

  const tempoMap: Record<string, number> = {
    sad: 60,
    happy: 120,
    curious: 95,
    angry: 110,
    neutral: 80,
  };
  const tempo = profile.tempo ?? tempoMap[m] ?? 80;
  const baseNote = profile.base_note ?? "C4";
  const instruments = profile.instruments ?? ["piano"];
  const baseIndex = NOTES.indexOf(baseNote.slice(0, -1)) + (parseInt(baseNote.slice(-1), 10) - OCTAVE) * NOTES.length;

  const sequence: { note: string; duration: string; time: number }[] = [];
  const steps = m === "sad" ? 8 : m === "happy" ? 16 : 12;
  let time = 0;
  const dur = m === "sad" ? "4n" : m === "happy" ? "8n" : "4n";
  for (let i = 0; i < steps; i++) {
    const offset = Math.floor(Math.sin(i * 0.7) * 3) + Math.floor(Math.cos(i * 0.5) * 2);
    sequence.push({
      note: noteAt(baseIndex + offset),
      duration: dur,
      time,
    });
    time += m === "sad" ? 0.6 : m === "happy" ? 0.25 : 0.4;
  }

  return {
    base_note: baseNote,
    tempo,
    instruments,
    sequence,
    mood: m,
  };
}
