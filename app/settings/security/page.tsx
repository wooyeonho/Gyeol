"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Shield,
  Key,
  Lock,
  Smartphone,
  Eye,
  Download,
  History,
  AlertTriangle,
} from "lucide-react";
import { isPasskeySupported } from "@/lib/security/passkey";
import {
  listLocalSecurityEvents,
  describeSecurityEvent,
  type SecurityEvent,
} from "@/lib/security/audit-log";
import { generateRecoveryPhrase } from "@/lib/security/e2e-vault";

type SecurityStatus = {
  passkey: boolean;
  totp: boolean;
  vaultPassphrase: boolean;
  autoLock: number; // minutes
  sessionCount: number;
};

const DEFAULT_STATUS: SecurityStatus = {
  passkey: false,
  totp: false,
  vaultPassphrase: false,
  autoLock: 5,
  sessionCount: 1,
};

export default function SecurityCenterPage() {
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [status, setStatus] = useState<SecurityStatus>(DEFAULT_STATUS);
  // Lazy init reads localStorage once, client-side only.
  const [events] = useState<SecurityEvent[]>(() =>
    typeof window === "undefined" ? [] : listLocalSecurityEvents(20),
  );
  const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);

  useEffect(() => {
    // External async probe — this *is* the right use of useEffect.
    void isPasskeySupported().then(setPasskeyAvailable);
  }, []);

  const score = useMemo(() => computeSecurityScore(status), [status]);
  const scoreLabel =
    score >= 85 ? "Excellent" : score >= 60 ? "Good" : score >= 35 ? "Fair" : "Weak";
  const scoreColor =
    score >= 85
      ? "text-green-300"
      : score >= 60
        ? "text-indigo-300"
        : score >= 35
          ? "text-amber-300"
          : "text-rose-300";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 pb-24">
      <header className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-indigo-300" aria-hidden />
        <div>
          <h1 className="text-2xl font-semibold text-white">Security Center</h1>
          <p className="text-sm text-neutral-400">
            Protect your memories and your AI companion. Inspired by Signal,
            1Password, and Proton — everything here runs end-to-end.
          </p>
        </div>
      </header>

      {/* ── Security score ── */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/15 via-transparent to-fuchsia-500/10 p-5 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-400">
              Security score
            </p>
            <p className={`mt-1 text-4xl font-bold tabular-nums ${scoreColor}`}>
              {score}
              <span className="ml-1 text-base font-normal text-neutral-500">
                / 100
              </span>
            </p>
            <p className={`mt-1 text-sm font-medium ${scoreColor}`}>{scoreLabel}</p>
          </div>
          <div className="relative h-20 w-20">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="currentColor"
                strokeOpacity="0.15"
                strokeWidth="6"
                fill="none"
                className="text-white"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${(score / 100) * 213.6} 213.6`}
                className={scoreColor}
              />
            </svg>
          </div>
        </div>
      </section>

      {/* ── Primary controls ── */}
      <section className="grid gap-3">
        <SecurityRow
          icon={<Key className="h-5 w-5" />}
          title="Passkey (Face ID / Touch ID)"
          description={
            passkeyAvailable
              ? "Phishing-resistant sign-in with your device biometrics."
              : "Your browser doesn't support platform passkeys yet."
          }
          enabled={status.passkey}
          disabled={!passkeyAvailable}
          onToggle={() => setStatus((s) => ({ ...s, passkey: !s.passkey }))}
        />

        <SecurityRow
          icon={<Smartphone className="h-5 w-5" />}
          title="Two-factor authentication"
          description="Use Google Authenticator, 1Password, or any TOTP app."
          enabled={status.totp}
          onToggle={() => setStatus((s) => ({ ...s, totp: !s.totp }))}
        />

        <SecurityRow
          icon={<Lock className="h-5 w-5" />}
          title="Encrypted private vault"
          description="A passphrase you alone hold. Gyeol cannot read these memories."
          enabled={status.vaultPassphrase}
          onToggle={() => {
            setStatus((s) => ({ ...s, vaultPassphrase: !s.vaultPassphrase }));
            if (!status.vaultPassphrase) {
              setRecoveryPhrase(generateRecoveryPhrase(12));
            }
          }}
        />

        <SecurityRow
          icon={<Eye className="h-5 w-5" />}
          title={`Auto-lock after ${status.autoLock} minutes`}
          description="Locks the app when idle. Tap to cycle: 1, 5, 15, 30."
          enabled
          onToggle={() =>
            setStatus((s) => ({
              ...s,
              autoLock: s.autoLock === 1 ? 5 : s.autoLock === 5 ? 15 : s.autoLock === 15 ? 30 : 1,
            }))
          }
        />
      </section>

      {/* ── Recovery phrase ── */}
      {recoveryPhrase && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-100">
                Your recovery phrase — write it down
              </h3>
              <p className="mt-1 text-xs text-amber-200/80">
                If you forget your passphrase, this is the only way back in. Gyeol
                has no copy.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-black/40 p-3 font-mono text-sm text-amber-100">
                {recoveryPhrase.split(" ").map((w, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-amber-400/60">{i + 1}.</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Data rights ── */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start gap-3">
          <Download className="mt-0.5 h-5 w-5 text-neutral-300" />
          <div className="flex-1">
            <h3 className="font-semibold text-white">Your data, your rights</h3>
            <p className="mt-1 text-xs text-neutral-400">
              Export everything as a portable JSON archive, or request permanent
              deletion. GDPR & CCPA compliant.
            </p>
            <div className="mt-3 flex gap-2">
              <button className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white hover:bg-white/10">
                Export my data
              </button>
              <button className="rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20">
                Delete account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Audit log ── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Recent activity
          </h2>
        </div>
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-neutral-500">
            No security events yet. Actions like sign-in, passkey setup, and
            vault unlocks will appear here.
          </p>
        ) : (
          <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-white">
                    {describeSecurityEvent(e.type)}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {new Date(e.at).toLocaleString()}
                    {e.device ? ` · ${e.device}` : ""}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                </div>
                {e.type.startsWith("login.failed") && (
                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-medium text-rose-200">
                    Failed
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SecurityRow({
  icon,
  title,
  description,
  enabled,
  disabled,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
          enabled ? "bg-indigo-500/20 text-indigo-200" : "bg-white/5 text-neutral-400"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        <p className="truncate text-xs text-neutral-400">{description}</p>
      </div>
      <div
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
          enabled ? "bg-indigo-500" : "bg-white/10"
        }`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}

function computeSecurityScore(s: SecurityStatus): number {
  let score = 20; // baseline (has an account)
  if (s.passkey) score += 30;
  if (s.totp) score += 25;
  if (s.vaultPassphrase) score += 20;
  if (s.autoLock <= 5) score += 5;
  return Math.min(100, score);
}
