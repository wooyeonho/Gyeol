/**
 * Team/Party system — Pokemon-inspired multi-creature team management.
 * Users can own multiple creatures and form teams with synergy bonuses.
 */

export interface TeamMember {
  agentId: string;
  selfName: string;
  species?: string;
  element?: string;
  level: number;
  role: "leader" | "support" | "specialist";
  slot: number; // 0-5
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  synergy: TeamSynergy | null;
  createdAt: string;
}

export interface TeamSynergy {
  name: { ko: string; en: string };
  description: { ko: string; en: string };
  bonusType: string;
  bonusValue: number;
}

export const MAX_TEAM_SIZE = 6;

const STORAGE_KEY = "gyeol_team";

/** Element synergies — when team has matching elements */
export const ELEMENT_SYNERGIES: Record<string, TeamSynergy> = {
  fire_duo: {
    name: { ko: "불꽃 듀오", en: "Fire Duo" },
    description: { ko: "불 속성 2마리 이상 — ATK +15%", en: "2+ fire types — ATK +15%" },
    bonusType: "atk",
    bonusValue: 0.15,
  },
  water_duo: {
    name: { ko: "물결 듀오", en: "Water Duo" },
    description: { ko: "물 속성 2마리 이상 — DEF +15%", en: "2+ water types — DEF +15%" },
    bonusType: "def",
    bonusValue: 0.15,
  },
  earth_duo: {
    name: { ko: "대지 듀오", en: "Earth Duo" },
    description: { ko: "땅 속성 2마리 이상 — HP +15%", en: "2+ earth types — HP +15%" },
    bonusType: "hp",
    bonusValue: 0.15,
  },
  wind_duo: {
    name: { ko: "바람 듀오", en: "Wind Duo" },
    description: { ko: "바람 속성 2마리 이상 — SPD +15%", en: "2+ wind types — SPD +15%" },
    bonusType: "spd",
    bonusValue: 0.15,
  },
  rainbow: {
    name: { ko: "무지개 시너지", en: "Rainbow Synergy" },
    description: { ko: "4가지 이상 다른 속성 — 전체 +10%", en: "4+ different elements — All +10%" },
    bonusType: "all",
    bonusValue: 0.10,
  },
  harmony: {
    name: { ko: "하모니", en: "Harmony" },
    description: { ko: "리더 + 서포터 2명 이상 — 시너지 부스트", en: "Leader + 2 supports — Synergy boost" },
    bonusType: "synergy",
    bonusValue: 0.20,
  },
};

/** Get current team from localStorage */
export function getTeam(): Team | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Team;
  } catch {
    return null;
  }
}

/** Save team */
export function saveTeam(team: Team): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
}

/** Create a new team */
export function createTeam(name: string, leader: TeamMember): Team {
  const team: Team = {
    id: `team_${Date.now()}`,
    name,
    members: [{ ...leader, role: "leader", slot: 0 }],
    synergy: null,
    createdAt: new Date().toISOString(),
  };
  team.synergy = calculateSynergy(team.members);
  saveTeam(team);
  return team;
}

/** Add member to team */
export function addTeamMember(member: Omit<TeamMember, "slot">): { success: boolean; error?: string } {
  const team = getTeam();
  if (!team) return { success: false, error: "No team exists" };
  if (team.members.length >= MAX_TEAM_SIZE) return { success: false, error: "Team is full" };
  if (team.members.some((m) => m.agentId === member.agentId)) {
    return { success: false, error: "Already in team" };
  }

  const slot = team.members.length;
  team.members.push({ ...member, slot });
  team.synergy = calculateSynergy(team.members);
  saveTeam(team);
  return { success: true };
}

/** Remove member from team */
export function removeTeamMember(agentId: string): { success: boolean } {
  const team = getTeam();
  if (!team) return { success: false };

  team.members = team.members
    .filter((m) => m.agentId !== agentId)
    .map((m, i) => ({ ...m, slot: i }));
  team.synergy = calculateSynergy(team.members);
  saveTeam(team);
  return { success: true };
}

/** Swap member roles */
export function setMemberRole(agentId: string, role: TeamMember["role"]): void {
  const team = getTeam();
  if (!team) return;

  // Only one leader allowed
  if (role === "leader") {
    team.members = team.members.map((m) => ({
      ...m,
      role: m.agentId === agentId ? "leader" : m.role === "leader" ? "support" : m.role,
    }));
  } else {
    const member = team.members.find((m) => m.agentId === agentId);
    if (member) member.role = role;
  }

  team.synergy = calculateSynergy(team.members);
  saveTeam(team);
}

/** Calculate team synergy bonus */
export function calculateSynergy(members: TeamMember[]): TeamSynergy | null {
  if (members.length < 2) return null;

  // Check element synergies
  const elements = members.map((m) => m.element).filter(Boolean);
  const elementCounts: Record<string, number> = {};
  for (const el of elements) {
    if (el) elementCounts[el] = (elementCounts[el] ?? 0) + 1;
  }

  // Rainbow check first (highest priority)
  const uniqueElements = Object.keys(elementCounts).length;
  if (uniqueElements >= 4) return ELEMENT_SYNERGIES.rainbow;

  // Element duo checks
  for (const [element, count] of Object.entries(elementCounts)) {
    if (count >= 2) {
      const key = `${element}_duo`;
      if (ELEMENT_SYNERGIES[key]) return ELEMENT_SYNERGIES[key];
    }
  }

  // Role-based synergy
  const hasLeader = members.some((m) => m.role === "leader");
  const supportCount = members.filter((m) => m.role === "support").length;
  if (hasLeader && supportCount >= 2) return ELEMENT_SYNERGIES.harmony;

  return null;
}

/** Get team power rating */
export function getTeamPower(members: TeamMember[]): number {
  let power = 0;
  for (const m of members) {
    power += m.level * 10;
    if (m.role === "leader") power += 20;
  }
  const synergy = calculateSynergy(members);
  if (synergy) power = Math.round(power * (1 + synergy.bonusValue));
  return power;
}
