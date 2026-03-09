"use client";

import { BottomNav } from "@/components/bottom-nav";
import { useRelationshipOsStore } from "@/store/relationship-os-store";

export default function ApprovalsPage() {
  const hasHydrated = useRelationshipOsStore((state) => state.hasHydrated);
  const approvals = useRelationshipOsStore((state) => state.approvals);
  const approveItem = useRelationshipOsStore((state) => state.approveItem);
  const dismissItem = useRelationshipOsStore((state) => state.dismissItem);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 pt-16 pb-28">
      <div className="mx-auto max-w-4xl">
        <header className="mb-5">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/65">Approval Inbox</p>
          <h1 className="mt-2 text-3xl font-semibold">승인함</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/62">
            결이 자동으로 준비한 메시지, 계획, 리마인드를 바로 승인하거나 거절할 수 있습니다.
          </p>
        </header>

        <div className="space-y-4">
          {approvals.map((approval) => (
            <article key={approval.id} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{approval.kind}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{approval.status}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{approval.targetName}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-medium">{approval.title}</h2>
                  <p className="mt-2 text-sm text-white/65">{approval.rationale}</p>
                </div>
                <span className="text-xs text-white/45">{new Date(approval.createdAt).toLocaleString("ko-KR")}</span>
              </div>

              <div className="mt-4 rounded-3xl border border-cyan-300/15 bg-cyan-400/[0.05] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/70">준비된 초안</p>
                <p className="mt-2 text-sm leading-6 text-white/86">{approval.preview}</p>
              </div>

              {approval.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => approveItem(approval.id)}
                    className="rounded-full bg-cyan-300 px-3 py-1.5 text-xs font-medium text-black"
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    onClick={() => dismissItem(approval.id)}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/76"
                  >
                    거절
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
