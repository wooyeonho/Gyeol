"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { useAgentStore } from "@/store/agent-store";
import { BottomNav } from "@/components/bottom-nav";
import { PageShell, itemVariants } from "@/components/discover/page-shell";
import { DiscoverPageHeader } from "@/components/discover/page-header";
import { PageSkeleton } from "@/components/discover/skeleton";
import { ErrorBanner } from "@/components/discover/error-banner";

type BreedingRecord = {
  id: string;
  parent_a: string;
  parent_b: string;
  status: "pending" | "accepted" | "rejected";
  child_id?: string | null;
  created_at: string;
  partner_name?: string | null;
};

export default function BreedingPage() {
  const { t } = useTranslations();
  const agentId = useAgentStore((s) => s.agentId);
  const [records, setRecords] = useState<BreedingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetch("/api/breeding/records")
      .then((r) => r.ok ? r.json() : { records: [] })
      .then((json) => setRecords(Array.isArray(json.records) ? json.records : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleAction(recordId: string, action: "accept" | "reject") {
    setSubmitting(recordId);
    setError(null);
    try {
      const res = await fetch("/api/breeding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, record_id: recordId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? t("breeding.acceptFailed"));
        return;
      }
      load();
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) return <PageSkeleton rows={3} />;

  const incoming = records.filter((r) => r.parent_b === agentId && r.status === "pending");
  const outgoing = records.filter((r) => r.parent_a === agentId && r.status === "pending");
  const completed = records.filter((r) => r.status === "accepted" || r.status === "rejected");

  return (
    <PageShell>
      <motion.div variants={itemVariants}>
        <DiscoverPageHeader
          eyebrow={t("breeding.sectionTitle")}
          title={t("breeding.sectionTitle")}
          subtitle={t("breeding.sectionDesc")}
        />
      </motion.div>

      {error && (
        <motion.div variants={itemVariants}>
          <ErrorBanner message={error} onRetry={load} />
        </motion.div>
      )}

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-300/80">
            {t("breeding.requestFrom").replace("{name}", "")}
          </h2>
          {incoming.map((rec) => (
            <div
              key={rec.id}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >
              <p className="text-sm text-white/70">
                {t("breeding.requestFrom").replace("{name}", rec.partner_name || t("breeding.fallbackPartner"))}
              </p>
              <p className="mt-1 text-xs text-white/40">
                {new Date(rec.created_at).toLocaleDateString()}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={submitting === rec.id}
                  onClick={() => void handleAction(rec.id, "accept")}
                  className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-4 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
                >
                  {t("breeding.accept")}
                </button>
                <button
                  type="button"
                  disabled={submitting === rec.id}
                  onClick={() => void handleAction(rec.id, "reject")}
                  className="rounded-full bg-red-500/10 border border-red-400/20 px-4 py-1.5 text-xs font-medium text-red-300/80 hover:bg-red-500/20 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70"
                >
                  {t("breeding.reject")}
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Outgoing requests */}
      {outgoing.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-amber-300/80">
            {t("breeding.sending")}
          </h2>
          {outgoing.map((rec) => (
            <div
              key={rec.id}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >
              <p className="text-sm text-white/70">
                {t("breeding.partner")}: {rec.partner_name || t("breeding.fallbackPartner")}
              </p>
              <p className="mt-1 text-xs text-amber-300/60">
                {t("breeding.sending")}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      {/* History */}
      {completed.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-white/50">
            {t("breeding.memories")}
          </h2>
          {completed.slice(0, 10).map((rec) => (
            <div
              key={rec.id}
              className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 opacity-70"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/60">
                  {rec.partner_name || t("breeding.fallbackPartner")}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  rec.status === "accepted"
                    ? "bg-emerald-500/15 text-emerald-300/70"
                    : "bg-red-500/10 text-red-300/50"
                }`}>
                  {rec.status}
                </span>
              </div>
              {rec.child_id && (
                <p className="mt-1 text-xs text-cyan-300/50">
                  {t("breeding.child")} ID: {rec.child_id.slice(0, 8)}...
                </p>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {records.length === 0 && !error && (
        <motion.div variants={itemVariants}>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center">
            <span className="text-4xl">🧬</span>
            <p className="mt-3 text-sm text-white/50">{t("breeding.sectionDesc")}</p>
          </div>
        </motion.div>
      )}

      <BottomNav />
    </PageShell>
  );
}
