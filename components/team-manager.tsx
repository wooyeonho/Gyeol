"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getTeam,
  removeTeamMember,
  setMemberRole,
  getTeamPower,
  MAX_TEAM_SIZE,
  type Team,
  type TeamMember,
} from "@/lib/game/team-system";
import { haptic } from "@/lib/micro-interactions";

const ROLE_COLORS: Record<string, string> = {
  leader: "#fbbf24",
  support: "#60a5fa",
  specialist: "#c084fc",
};

const ROLE_LABELS: Record<string, { ko: string; en: string }> = {
  leader: { ko: "리더", en: "Leader" },
  support: { ko: "서포터", en: "Support" },
  specialist: { ko: "스페셜리스트", en: "Specialist" },
};

const ELEMENT_ICONS: Record<string, string> = {
  fire: "🔥",
  water: "💧",
  earth: "🌿",
  wind: "💨",
  light: "✨",
  dark: "🌑",
  electric: "⚡",
  ice: "❄️",
};

export function TeamManager({ locale = "ko" }: { locale?: string }) {
  const [team, setTeam] = useState<Team | null>(getTeam);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const isKo = locale === "ko";

  const refreshTeam = useCallback(() => setTeam(getTeam()), []);

  const handleRemove = useCallback((agentId: string) => {
    removeTeamMember(agentId);
    refreshTeam();
    haptic("tap");
  }, [refreshTeam]);

  const handleRoleChange = useCallback((agentId: string, role: TeamMember["role"]) => {
    setMemberRole(agentId, role);
    refreshTeam();
    haptic("tap");
  }, [refreshTeam]);

  if (!team) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <span className="text-3xl" aria-hidden="true">👥</span>
        <p className="mt-3 text-sm text-white/50">
          {isKo ? "아직 팀이 없어요. 크리처를 더 모아서 팀을 만들어 보세요!" : "No team yet. Collect more creatures to build a team!"}
        </p>
      </div>
    );
  }

  const power = getTeamPower(team.members);

  return (
    <div className="space-y-4">
      {/* Team Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{team.name}</h3>
          <p className="text-[10px] text-white/40">
            {team.members.length}/{MAX_TEAM_SIZE} {isKo ? "멤버" : "members"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-white/40">
            {isKo ? "전투력" : "Power"}
          </span>
          <span className="text-sm font-bold text-amber-400">{power}</span>
        </div>
      </div>

      {/* Synergy Badge */}
      {team.synergy && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm" aria-hidden="true">⚡</span>
            <div>
              <p className="text-xs font-medium text-amber-300">
                {isKo ? team.synergy.name.ko : team.synergy.name.en}
              </p>
              <p className="text-[10px] text-amber-300/60">
                {isKo ? team.synergy.description.ko : team.synergy.description.en}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Team Members */}
      <div className="space-y-2">
        {team.members.map((member, i) => (
          <motion.div
            key={member.agentId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpandedMember(
                expandedMember === member.agentId ? null : member.agentId
              )}
              className="w-full flex items-center gap-3 p-3"
            >
              {/* Slot number */}
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
                style={{ backgroundColor: `${ROLE_COLORS[member.role]}20`, color: ROLE_COLORS[member.role] }}
              >
                {member.slot + 1}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-white">{member.selfName}</span>
                  {member.element && (
                    <span className="text-sm" aria-hidden="true">
                      {ELEMENT_ICONS[member.element] ?? "⭕"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: ROLE_COLORS[member.role] }}
                  >
                    {isKo ? ROLE_LABELS[member.role].ko : ROLE_LABELS[member.role].en}
                  </span>
                  <span className="text-[10px] text-white/30">Lv.{member.level}</span>
                  {member.species && (
                    <span className="text-[10px] text-white/30">{member.species}</span>
                  )}
                </div>
              </div>

              {/* Expand indicator */}
              <span className={`text-white/30 transition-transform ${expandedMember === member.agentId ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>

            {/* Expanded actions */}
            <AnimatePresence>
              {expandedMember === member.agentId && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/5 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40">
                      {isKo ? "역할:" : "Role:"}
                    </span>
                    {(["leader", "support", "specialist"] as const).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleRoleChange(member.agentId, role)}
                        className={`rounded-md px-2 py-1 text-[10px] transition-all ${
                          member.role === role
                            ? "bg-white/15 text-white"
                            : "bg-white/5 text-white/40 hover:text-white/60"
                        }`}
                      >
                        {isKo ? ROLE_LABELS[role].ko : ROLE_LABELS[role].en}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleRemove(member.agentId)}
                      className="ml-auto rounded-md bg-red-500/15 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/25"
                    >
                      {isKo ? "제거" : "Remove"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: MAX_TEAM_SIZE - team.members.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-4"
          >
            <span className="text-xs text-white/20">
              {isKo ? "빈 슬롯" : "Empty Slot"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
