"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const BACKGROUND_THEMES = [
  { id: "default", label: "기본", preview: "from-[#0a0a0f] to-[#0f0f14]" },
  { id: "aurora", label: "오로라", preview: "from-indigo-900/80 to-violet-900/80" },
  { id: "ocean", label: "바다", preview: "from-blue-900/80 to-cyan-900/80" },
  { id: "forest", label: "숲", preview: "from-green-900/80 to-emerald-900/80" },
  { id: "sunset", label: "노을", preview: "from-orange-900/80 to-rose-900/80" },
];

const PINNED_MEMORY_SLOTS = [0, 1, 2];

export default function ProfileCustomizePage() {
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_theme: selectedTheme, bio }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 pt-8 pb-24">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">프로필 꾸미기</h1>
          <p className="mt-1 text-sm text-white/40">나만의 프로필을 만들어보세요</p>
        </div>

        {/* Background theme */}
        <div className="glass-card rounded-2xl border border-white/10 p-4">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
            배경 테마
          </p>
          <div className="grid grid-cols-5 gap-2">
            {BACKGROUND_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all ${
                  selectedTheme === theme.id
                    ? "ring-2 ring-indigo-400 ring-offset-1 ring-offset-[#0a0a0f]"
                    : "hover:bg-white/[0.04]"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${theme.preview}`} />
                <span className="text-[9px] text-white/40">{theme.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="glass-card rounded-2xl border border-white/10 p-4">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
            소개글
          </p>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={120}
            rows={3}
            placeholder="크리처와의 관계를 소개해보세요..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/20 resize-none"
          />
          <p className="text-[10px] text-white/25 mt-1 text-right">{bio.length}/120</p>
        </div>

        {/* Pinned memories */}
        <div className="glass-card rounded-2xl border border-white/10 p-4">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1">
            대표 기억 (최대 3개)
          </p>
          <p className="text-[10px] text-white/25 mb-3">프로필에 고정할 소중한 기억을 선택해요</p>
          <div className="space-y-2">
            {PINNED_MEMORY_SLOTS.map((slot) => (
              <div
                key={slot}
                className="flex items-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-3"
              >
                <span className="text-white/20 text-xs">💭</span>
                <span className="text-xs text-white/25">기억 선택하기...</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/20 mt-2">
            메모리 타임라인에서 선택 기능이 곧 추가될 예정이에요
          </p>
        </div>

        {/* Save */}
        <motion.button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl py-3 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
          whileTap={{ scale: 0.98 }}
        >
          {saving ? "저장 중..." : saved ? "저장됨 ✓" : "프로필 저장"}
        </motion.button>
      </div>
    </main>
  );
}
