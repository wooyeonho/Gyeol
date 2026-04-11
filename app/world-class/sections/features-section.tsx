"use client";

import { useMemo, useState } from "react";
import { SectionShell, Card } from "./section-shell";
import {
  DEFAULT_SNIPPETS,
  expandSnippet,
  formatShortcut,
  parseQuickEntry,
  searchSlashCommands,
  SHORTCUTS,
  type SlashCommand,
} from "@/lib/features/world-class-patterns";

const FEATURE_APPS = [
  "Notion", "Linear", "Figma", "Slack", "VS Code", "Raycast",
  "Arc", "Superhuman", "Things", "Fantastical", "ChatGPT", "Midjourney",
];

export function FeaturesSection() {
  const [slashQ, setSlashQ] = useState("");
  const [entryRaw, setEntryRaw] = useState("내일 !high 명상 25분 #focus #health");
  const [snippetIdx, setSnippetIdx] = useState(0);
  const [snippetVar, setSnippetVar] = useState("좋");

  const slashResults: SlashCommand[] = useMemo(
    () => searchSlashCommands(slashQ).slice(0, 6),
    [slashQ],
  );

  const parsedEntry = useMemo(() => parseQuickEntry(entryRaw), [entryRaw]);

  const snippet = DEFAULT_SNIPPETS[snippetIdx];
  const expanded = useMemo(() => {
    const allVars: Record<string, string> = {
      feeling: snippetVar,
      moment: snippetVar,
      one: snippetVar,
      two: "두번째",
      three: "세번째",
      place: snippetVar,
      goal: snippetVar,
    };
    return expandSnippet(snippet.body, allVars);
  }, [snippet, snippetVar]);

  return (
    <SectionShell
      id="features"
      tag="기능 Pillar"
      title="생산성 거인들의 인터랙션 문법 — 모두 눌러볼 수 있습니다"
      subtitle="Notion의 슬래시, Linear의 단축키, Things의 자연어 입력, Raycast의 스니펫, ChatGPT의 분기 대화 — 아래 박스는 전부 실제로 동작합니다."
      apps={FEATURE_APPS}
      gradient="from-sky-500/10 to-blue-500/10"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {/* Slash commands */}
        <Card title="Notion · Slash command palette">
          <div className="relative">
            <input
              value={slashQ}
              onChange={(e) => setSlashQ(e.target.value)}
              placeholder="/ 를 입력하거나 한글로도 검색 (예: 기억)"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-400/50"
            />
          </div>
          <div className="mt-3 space-y-1">
            {slashResults.map((cmd) => (
              <div
                key={cmd.id}
                className="flex items-center gap-3 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2"
              >
                <div className="text-xs text-sky-300 font-mono shrink-0">/{cmd.trigger}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{cmd.label}</div>
                  <div className="text-[11px] text-white/50 truncate">{cmd.description}</div>
                </div>
                <div className="text-[10px] text-white/40 uppercase">{cmd.kind}</div>
              </div>
            ))}
            {slashResults.length === 0 && (
              <div className="text-xs text-white/40 text-center py-4">매치 없음</div>
            )}
          </div>
        </Card>

        {/* Quick entry — Things / Fantastical */}
        <Card title="Things / Fantastical · 자연어 입력 파서">
          <input
            value={entryRaw}
            onChange={(e) => setEntryRaw(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm font-mono outline-none focus:border-sky-400/50"
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Field k="텍스트" v={parsedEntry.text} />
            <Field
              k="우선순위"
              v={parsedEntry.priority}
              color={
                parsedEntry.priority === "high"
                  ? "text-red-300"
                  : parsedEntry.priority === "low"
                    ? "text-white/50"
                    : "text-white"
              }
            />
            <Field
              k="태그"
              v={parsedEntry.tags.length ? parsedEntry.tags.map((t) => `#${t}`).join(" ") : "—"}
            />
            <Field
              k="마감"
              v={parsedEntry.dueAt ? new Date(parsedEntry.dueAt).toLocaleString("ko-KR") : "—"}
            />
          </div>
          <div className="mt-3 text-[11px] text-white/50">
            지원 키워드: 오늘 / 내일 / 모레 / 다음주 / today / tomorrow · #태그 · !low|normal|high
          </div>
        </Card>

        {/* Keyboard shortcuts — Linear / Superhuman */}
        <Card title="Linear / Superhuman · 전역 단축키 레지스트리">
          <div className="space-y-2">
            {(["global", "chat", "navigation"] as const).map((group) => (
              <div key={group}>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mt-2 mb-1">
                  {group}
                </div>
                {SHORTCUTS.filter((s) => s.group === group).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
                  >
                    <span className="text-xs text-white/80">{s.label}</span>
                    <kbd className="rounded bg-white/10 border border-white/15 px-2 py-0.5 text-[11px] font-mono text-white">
                      {formatShortcut(s.keys, false)}
                    </kbd>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>

        {/* Snippet expander — Raycast / VS Code */}
        <Card title="Raycast / VS Code · Snippet expander">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {DEFAULT_SNIPPETS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSnippetIdx(i)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  snippetIdx === i ? "bg-white text-black" : "bg-white/10 text-white/70"
                }`}
              >
                {s.trigger}
              </button>
            ))}
          </div>
          <div className="text-xs text-white/60 mb-1">변수 치환 ({"{{feeling}}"} 등):</div>
          <input
            value={snippetVar}
            onChange={(e) => setSnippetVar(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm outline-none focus:border-sky-400/50 mb-2"
          />
          <div className="rounded-lg border border-white/5 bg-black/30 p-3 text-xs text-white/80 font-mono whitespace-pre-wrap">
            {expanded}
          </div>
        </Card>
      </div>
    </SectionShell>
  );
}

function Field({ k, v, color = "text-white" }: { k: string; v: string; color?: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{k}</div>
      <div className={`mt-0.5 font-medium text-xs ${color}`}>{v || "—"}</div>
    </div>
  );
}
