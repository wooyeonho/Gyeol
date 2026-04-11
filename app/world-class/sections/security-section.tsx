"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SectionShell, Card } from "./section-shell";
import {
  auditAccount,
  computeRiskScore,
  decideStepUp,
  securityScore,
  type AuditSeverity,
  type RiskSignal,
} from "@/lib/security/world-class-defense";

const SECURITY_APPS = [
  "Signal", "1Password", "Bitwarden", "ProtonMail", "iCloud Keychain",
  "Cloudflare", "Okta", "Keeper", "Tor/Tails", "NordVPN", "Google APP", "Apple ATT",
];

const ALL_SIGNALS: RiskSignal[] = [
  "new_device", "new_country", "tor_exit", "datacenter_ip", "impossible_travel",
  "credential_reuse", "rapid_password_reset", "unknown_user_agent", "failed_mfa_recently",
  "new_refresh_grant", "privileged_action",
];

const SEVERITY_STYLE: Record<AuditSeverity, { bg: string; label: string }> = {
  critical: { bg: "bg-red-500/15 border-red-500/40 text-red-200", label: "CRITICAL" },
  high: { bg: "bg-orange-500/15 border-orange-500/40 text-orange-200", label: "HIGH" },
  warn: { bg: "bg-amber-500/15 border-amber-500/40 text-amber-200", label: "WARN" },
  info: { bg: "bg-sky-500/15 border-sky-500/40 text-sky-200", label: "INFO" },
};

export function SecuritySection() {
  const [signals, setSignals] = useState<Set<RiskSignal>>(new Set(["new_device"]));
  const [mfa, setMfa] = useState(false);
  const [sensitivity, setSensitivity] = useState<"low" | "medium" | "high">("medium");

  const score = useMemo(
    () =>
      computeRiskScore({
        signals: Array.from(signals),
        mfaSatisfied: mfa,
      }),
    [signals, mfa],
  );

  const decision = useMemo(() => decideStepUp(score, sensitivity), [score, sensitivity]);

  // Account audit toy state
  const [snap, setSnap] = useState({
    hasPasskey: false,
    hasTotp: true,
    passwordAgeDays: 420,
    uniquePassword: false,
    emailVerified: true,
    recentFailedLogins: 2,
    exposedInBreach: false,
    sessionsActive: 3,
  });

  const findings = useMemo(() => auditAccount(snap), [snap]);
  const sec = securityScore(findings);

  function toggleSignal(s: RiskSignal) {
    setSignals((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  return (
    <SectionShell
      id="security"
      tag="보안 Pillar"
      title="신호 → 점수 → 결정 — 어댑티브 방어의 해부도"
      subtitle="Okta의 어댑티브 리스크 스코어링, Bitwarden 스타일 계정 감사, Apple ATT의 최소 권한, NordVPN 식 fail-closed — 토글을 눌러 결정이 실시간으로 바뀌는 걸 확인하세요."
      apps={SECURITY_APPS}
      gradient="from-emerald-500/10 to-teal-500/10"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {/* Risk scoring */}
        <Card title="Okta · Adaptive Risk Scoring">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-4xl font-bold tabular-nums">{score}</div>
              <div className="text-xs text-white/50">/ 100 risk score</div>
            </div>
            <RiskGauge score={score} />
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-4">
            <motion.div
              animate={{ width: `${score}%` }}
              className={`h-full ${
                score < 30 ? "bg-emerald-400" : score < 60 ? "bg-amber-400" : "bg-red-400"
              }`}
            />
          </div>

          <div className="text-xs text-white/60 mb-2">신호 토글:</div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_SIGNALS.map((s) => (
              <button
                key={s}
                onClick={() => toggleSignal(s)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                  signals.has(s)
                    ? "bg-red-500/20 border-red-400/50 text-red-200"
                    : "bg-white/5 border-white/10 text-white/60"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <label className="mt-3 flex items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              checked={mfa}
              onChange={(e) => setMfa(e.target.checked)}
              className="h-4 w-4 rounded border-white/20"
            />
            MFA 이미 완료 (−20점)
          </label>
        </Card>

        {/* Step-up decision */}
        <Card title="Adaptive Step-up Decision">
          <div className="mb-3">
            <div className="text-xs text-white/60 mb-1">작업 민감도:</div>
            <div className="flex gap-1.5">
              {(["low", "medium", "high"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSensitivity(s)}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    sensitivity === s ? "bg-white text-black" : "bg-white/10 text-white/70"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <motion.div
            key={JSON.stringify(decision)}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`rounded-xl border-2 p-5 text-center ${
              decision.action === "allow"
                ? "border-emerald-400/50 bg-emerald-500/10"
                : decision.action === "step_up"
                  ? "border-amber-400/50 bg-amber-500/10"
                  : "border-red-400/50 bg-red-500/10"
            }`}
          >
            <div className="text-3xl font-bold">
              {decision.action === "allow" && "✅ ALLOW"}
              {decision.action === "step_up" && "🔐 STEP UP"}
              {decision.action === "deny" && "🚫 DENY"}
            </div>
            {decision.action === "step_up" && (
              <div className="mt-2 text-sm text-white/80">
                요구 수단: <b className="uppercase">{decision.method}</b>
              </div>
            )}
            {decision.action === "deny" && (
              <div className="mt-2 text-sm text-white/80">{decision.reason}</div>
            )}
          </motion.div>
          <div className="mt-3 text-[11px] text-white/50 leading-relaxed">
            low/medium/high 민감도 × risk score 매트릭스. 고민감도 작업은 리스크가
            낮아도 Passkey 스텝업이 필수.
          </div>
        </Card>

        {/* Account audit */}
        <Card title="Bitwarden · Account Health Audit" className="md:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex items-baseline gap-3 mb-3">
                <div
                  className={`text-5xl font-bold tabular-nums ${
                    sec >= 80
                      ? "text-emerald-300"
                      : sec >= 50
                        ? "text-amber-300"
                        : "text-red-300"
                  }`}
                >
                  {sec}
                </div>
                <div className="text-xs text-white/50">/ 100 security score</div>
              </div>
              <div className="space-y-2 text-xs">
                <Toggle label="Passkey 등록" value={snap.hasPasskey} onChange={(v) => setSnap({ ...snap, hasPasskey: v })} />
                <Toggle label="TOTP 등록" value={snap.hasTotp} onChange={(v) => setSnap({ ...snap, hasTotp: v })} />
                <Toggle label="비밀번호 고유함" value={snap.uniquePassword} onChange={(v) => setSnap({ ...snap, uniquePassword: v })} />
                <Toggle label="이메일 인증" value={snap.emailVerified} onChange={(v) => setSnap({ ...snap, emailVerified: v })} />
                <Toggle label="유출 목록 노출" value={snap.exposedInBreach} onChange={(v) => setSnap({ ...snap, exposedInBreach: v })} danger />
              </div>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {findings.length === 0 && (
                <div className="text-center text-sm text-emerald-300 py-8">
                  ✨ 모든 검사 통과!
                </div>
              )}
              {findings.map((f) => {
                const style = SEVERITY_STYLE[f.severity];
                return (
                  <div key={f.id} className={`rounded-lg border p-3 ${style.bg}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold">{style.label}</span>
                    </div>
                    <div className="mt-1 text-sm text-white">{f.title}</div>
                    <div className="text-[11px] text-white/60 mt-0.5">→ {f.remedy}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </SectionShell>
  );
}

function RiskGauge({ score }: { score: number }) {
  const angle = (score / 100) * 180 - 90;
  return (
    <svg viewBox="0 0 100 60" className="h-16 w-24">
      <path d="M10,55 A40,40 0 0,1 90,55" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
      <motion.line
        x1="50"
        y1="55"
        x2="50"
        y2="18"
        stroke={score < 30 ? "#4ade80" : score < 60 ? "#fbbf24" : "#f87171"}
        strokeWidth="3"
        strokeLinecap="round"
        initial={false}
        animate={{ rotate: angle }}
        style={{ transformOrigin: "50px 55px" }}
      />
      <circle cx="50" cy="55" r="3" fill="white" />
    </svg>
  );
}

function Toggle({
  label,
  value,
  onChange,
  danger = false,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}) {
  return (
    <label className="flex items-center justify-between border-b border-white/5 py-1.5 last:border-0 cursor-pointer">
      <span className="text-white/80">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className={`h-4 w-4 rounded ${danger ? "accent-red-400" : "accent-emerald-400"}`}
      />
    </label>
  );
}
