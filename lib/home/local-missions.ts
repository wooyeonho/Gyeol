export type LocalMission = {
  id: string;
  title: string;
  done: boolean;
};

export const LOCAL_MISSION_STORAGE_KEY = "gyeol-worldclass-missions-v1";

export function readLocalMissions(): LocalMission[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_MISSION_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as LocalMission[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is LocalMission =>
        Boolean(item && typeof item.id === "string" && typeof item.title === "string" && typeof item.done === "boolean"),
    );
  } catch {
    return [];
  }
}

export function writeLocalMissions(missions: LocalMission[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LOCAL_MISSION_STORAGE_KEY, JSON.stringify(missions));
  } catch {
    // Ignore storage write failures in restricted environments.
  }
}
