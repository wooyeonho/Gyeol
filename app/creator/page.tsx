"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { DiscoverPageHeader } from "@/components/discover/page-header";
import { PageShell, itemVariants } from "@/components/discover/page-shell";
import { PageSkeleton } from "@/components/discover/skeleton";
import { ErrorBanner } from "@/components/discover/error-banner";
import { haptic } from "@/lib/micro-interactions";
import {
  calculateCreatorTier,
  getRevenueShare,
  validateSubmission,
  CONTENT_TYPE_INFO,
  CREATOR_TIER_INFO,
  type ContentType,
  type CreatorContent,
  type CreatorProfile,
  type CreatorTier,
} from "@/lib/creator/content-studio";

type CreatorTab = "dashboard" | "content" | "submit";

export default function CreatorPage() {
  const { locale, t } = useTranslations();
  const isKo = locale === "ko";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CreatorTab>("dashboard");

  // Profile state
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [contents, setContents] = useState<CreatorContent[]>([]);

  // Submit form state
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitDesc, setSubmitDesc] = useState("");
  const [submitType, setSubmitType] = useState<ContentType>("story");
  const [submitPrice, setSubmitPrice] = useState(10);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/creator");
        if (!res.ok) {
          setError(isKo ? "크리에이터 데이터를 불러올 수 없습니다" : "Failed to load creator data");
          return;
        }
        const json = await res.json().catch(() => ({}));
        if (json.profile) setProfile(json.profile as CreatorProfile);
        if (Array.isArray(json.contents)) setContents(json.contents as CreatorContent[]);
      } catch {
        setError(isKo ? "네트워크 오류" : "Network error");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [isKo]);

  // Derived values
  const tier: CreatorTier = profile
    ? calculateCreatorTier(profile.totalDownloads, profile.contentCount, profile.avgRating)
    : "newcomer";
  const tierInfo = CREATOR_TIER_INFO[tier];
  const revenueShare = getRevenueShare(tier);

  async function handleSubmit() {
    const validation = validateSubmission({ title: submitTitle, description: submitDesc, type: submitType });
    if (!validation.valid) {
      setSubmitErrors(validation.errors);
      return;
    }
    setSubmitErrors([]);
    setSubmitBusy(true);
    haptic("tap");

    try {
      const res = await fetch("/api/creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: submitTitle,
          description: submitDesc,
          type: submitType,
          price: submitPrice,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSubmitErrors([(json.error as string) || (isKo ? "제출 실패" : "Submission failed")]);
        return;
      }
      setSubmitSuccess(true);
      setSubmitTitle("");
      setSubmitDesc("");
      setSubmitPrice(10);
      haptic("success");
      // Refresh contents
      const refreshRes = await fetch("/api/creator");
      if (refreshRes.ok) {
        const refreshJson = await refreshRes.json().catch(() => ({}));
        if (Array.isArray(refreshJson.contents)) setContents(refreshJson.contents as CreatorContent[]);
        if (refreshJson.profile) setProfile(refreshJson.profile as CreatorProfile);
      }
    } catch {
      setSubmitErrors([isKo ? "네트워크 오류" : "Network error"]);
    } finally {
      setSubmitBusy(false);
    }
  }

  if (loading) return <PageSkeleton rows={4} />;

  return (
    <PageShell>
      <motion.div variants={itemVariants}>
        <DiscoverPageHeader
          eyebrow={isKo ? "크리에이터" : "Creator"}
          title={isKo ? "크리에이터 스튜디오" : "Creator Studio"}
          subtitle={isKo ? "콘텐츠를 만들고, 공유하고, 수익을 올리세요" : "Create, share, and earn from your content"}
        />
      </motion.div>

      {error && <ErrorBanner message={error} />}

      {/* Creator Profile Card */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-950/40 to-black/60 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
            style={{ backgroundColor: `${tierInfo.color}20` }}
          >
            {tierInfo.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{profile?.displayName || (isKo ? "크리에이터" : "Creator")}</span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: `${tierInfo.color}20`, color: tierInfo.color }}
              >
                {isKo ? tierInfo.label.ko : tierInfo.label.en}
              </span>
            </div>
            <p className="text-xs text-white/50">
              {isKo ? "수익 분배율" : "Revenue share"}: {Math.round(revenueShare * 100)}%
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: isKo ? "콘텐츠" : "Content", value: profile?.contentCount ?? 0, icon: "📦" },
            { label: isKo ? "다운로드" : "Downloads", value: profile?.totalDownloads ?? 0, icon: "⬇️" },
            { label: isKo ? "수익" : "Earnings", value: profile?.totalEarnings ?? 0, icon: "💰" },
            { label: isKo ? "평점" : "Rating", value: profile?.avgRating?.toFixed(1) ?? "0.0", icon: "⭐" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white/[0.04] p-2 text-center">
              <div className="text-lg">{stat.icon}</div>
              <div className="text-sm font-bold text-white">{stat.value}</div>
              <div className="text-[9px] text-white/40">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-xl bg-white/5 p-1">
        {(
          [
            { key: "dashboard" as const, label: isKo ? "대시보드" : "Dashboard" },
            { key: "content" as const, label: isKo ? "내 콘텐츠" : "My Content" },
            { key: "submit" as const, label: isKo ? "새 제출" : "Submit" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setActiveTab(tab.key); haptic("tap"); }}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.key ? "bg-white/15 text-white" : "text-white/50 hover:text-white/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Dashboard tab */}
        {activeTab === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Tier Progress */}
            <div className="glass-card rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-semibold text-white/70">
                {isKo ? "티어 진행도" : "Tier Progress"}
              </h3>
              <div className="space-y-2">
                {(Object.entries(CREATOR_TIER_INFO) as [CreatorTier, typeof tierInfo][]).map(([t, info]) => (
                  <div key={t} className="flex items-center gap-2">
                    <span className="text-sm">{info.icon}</span>
                    <span className={`text-xs ${tier === t ? "font-bold text-white" : "text-white/40"}`}>
                      {isKo ? info.label.ko : info.label.en}
                    </span>
                    {tier === t && (
                      <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[9px] text-white/60">
                        {isKo ? "현재" : "Current"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Content type breakdown */}
            <div className="glass-card rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-semibold text-white/70">
                {isKo ? "콘텐츠 유형" : "Content Types"}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(CONTENT_TYPE_INFO) as [ContentType, (typeof CONTENT_TYPE_INFO)[ContentType]][]).map(([type, info]) => {
                  const count = contents.filter((c) => c.type === type).length;
                  return (
                    <div key={type} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
                      <span>{info.icon}</span>
                      <span className="text-xs text-white/60">{isKo ? info.label.ko : info.label.en}</span>
                      <span className="ml-auto text-xs font-medium text-white/80">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Content list tab */}
        {activeTab === "content" && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {contents.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <p className="text-2xl">📦</p>
                <p className="mt-2 text-sm text-white/50">
                  {isKo ? "아직 콘텐츠가 없습니다" : "No content yet"}
                </p>
                <button
                  type="button"
                  onClick={() => { setActiveTab("submit"); haptic("tap"); }}
                  className="mt-3 rounded-full border border-purple-400/25 bg-purple-400/10 px-4 py-2 text-xs text-purple-100 hover:bg-purple-400/20 transition-all"
                >
                  {isKo ? "첫 콘텐츠 만들기" : "Create your first content"}
                </button>
              </div>
            ) : (
              contents.map((content) => {
                const typeInfo = CONTENT_TYPE_INFO[content.type];
                const statusColor: Record<string, string> = {
                  draft: "text-white/40 bg-white/5",
                  submitted: "text-amber-300 bg-amber-500/10",
                  reviewing: "text-blue-300 bg-blue-500/10",
                  approved: "text-emerald-300 bg-emerald-500/10",
                  rejected: "text-red-300 bg-red-500/10",
                };
                return (
                  <div key={content.id} className="glass-card rounded-xl p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{typeInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">{content.title}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${statusColor[content.status] ?? ""}`}>
                            {content.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-white/50 line-clamp-1">{content.description}</p>
                        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-white/40">
                          <span>💰 {content.price} {isKo ? "코인" : "coins"}</span>
                          <span>⬇️ {content.downloads}</span>
                          <span>⭐ {content.rating.toFixed(1)} ({content.ratingCount})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}

        {/* Submit tab */}
        {activeTab === "submit" && (
          <motion.div
            key="submit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {submitSuccess && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                {isKo ? "콘텐츠가 제출되었습니다! 검토 후 게시됩니다." : "Content submitted! It will be published after review."}
              </div>
            )}

            {submitErrors.length > 0 && (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 space-y-1">
                {submitErrors.map((err, i) => (
                  <p key={i} className="text-xs text-red-200">{err}</p>
                ))}
              </div>
            )}

            <div className="glass-card rounded-xl p-4 space-y-3">
              {/* Content type selector */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40">
                  {isKo ? "유형" : "Type"}
                </label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(Object.entries(CONTENT_TYPE_INFO) as [ContentType, (typeof CONTENT_TYPE_INFO)[ContentType]][]).map(([type, info]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setSubmitType(type); haptic("tap"); }}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                        submitType === type
                          ? "border-purple-400/40 bg-purple-400/15 text-purple-100"
                          : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
                      }`}
                    >
                      {info.icon} {isKo ? info.label.ko : info.label.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40">
                  {isKo ? "제목" : "Title"}
                </label>
                <input
                  type="text"
                  value={submitTitle}
                  onChange={(e) => setSubmitTitle(e.target.value)}
                  placeholder={isKo ? "콘텐츠 제목 (3-100자)" : "Content title (3-100 chars)"}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40">
                  {isKo ? "설명" : "Description"}
                </label>
                <textarea
                  value={submitDesc}
                  onChange={(e) => setSubmitDesc(e.target.value)}
                  placeholder={isKo ? "콘텐츠 설명 (10-2000자)" : "Content description (10-2000 chars)"}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30"
                />
              </div>

              {/* Price */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40">
                  {isKo ? "가격 (코인)" : "Price (coins)"}
                </label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={submitPrice}
                  onChange={(e) => setSubmitPrice(Number(e.target.value))}
                  className="mt-1 w-32 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                />
                <p className="mt-1 text-[10px] text-white/30">
                  {isKo ? `수익 분배: ${Math.round(revenueShare * 100)}% (${Math.floor(submitPrice * revenueShare)} 코인)` :
                    `Revenue share: ${Math.round(revenueShare * 100)}% (${Math.floor(submitPrice * revenueShare)} coins)`}
                </p>
              </div>

              {/* Submit button */}
              <button
                type="button"
                disabled={submitBusy || !submitTitle.trim() || !submitDesc.trim()}
                onClick={() => void handleSubmit()}
                className="w-full rounded-xl border border-purple-400/25 bg-purple-400/10 px-4 py-3 text-sm font-medium text-purple-100 hover:bg-purple-400/20 disabled:opacity-40 transition-all active:scale-[0.98]"
              >
                {submitBusy
                  ? (isKo ? "제출 중..." : "Submitting...")
                  : (isKo ? "콘텐츠 제출" : "Submit Content")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
