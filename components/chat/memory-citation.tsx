"use client";

/**
 * MemoryCitationBadge — an inline, tappable badge that reveals the source
 * memory behind a citation. Mirrors the footnote chips in Perplexity and the
 * citation popovers in Claude's canvas/artifacts.
 */

import { useState } from "react";
import { BookOpen } from "lucide-react";
import type { MemoryCitation } from "@/lib/memory/citations";

export function MemoryCitationBadge({
  number,
  citation,
}: {
  number: number;
  citation: MemoryCitation;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block align-baseline">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-label={`Memory citation ${number}: ${citation.label}`}
        className="ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border border-indigo-400/40 bg-indigo-500/15 px-1.5 align-baseline text-[10px] font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/25"
      >
        {number}
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-xl border border-white/10 bg-neutral-900/95 p-3 text-left text-xs text-neutral-200 shadow-2xl backdrop-blur"
        >
          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
            <BookOpen className="h-3 w-3" />
            {citation.label}
            {citation.similarity !== undefined && (
              <span className="text-neutral-500">
                · {Math.round(citation.similarity * 100)}% match
              </span>
            )}
          </span>
          {citation.snippet ? (
            <span className="block italic text-neutral-300">
              &ldquo;{citation.snippet}&rdquo;
            </span>
          ) : (
            <span className="block text-neutral-500">
              의미적으로 연결된 기억 — 직접 인용은 없음
            </span>
          )}
          <span className="mt-2 block text-[10px] text-neutral-500">
            {citation.mode === "verbatim"
              ? "직접 인용"
              : citation.mode === "paraphrased"
                ? "의역"
                : "의미 매칭"}
          </span>
        </span>
      )}
    </span>
  );
}

/**
 * Render a reply with inline citation numbers replaced by interactive chips.
 * Expects the reply to have footnote-style `[1]`, `[2]` markers inserted by
 * `injectCitationMarkers`.
 */
export function CitedReply({
  reply,
  citations,
}: {
  reply: string;
  citations: MemoryCitation[];
}) {
  if (citations.length === 0) {
    return <span>{reply}</span>;
  }
  // Split by [n] markers, preserving them.
  const parts = reply.split(/(\[\d+\])/g);
  return (
    <span>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (!match) return <span key={i}>{part}</span>;
        const num = parseInt(match[1], 10);
        const citation = citations[num - 1];
        if (!citation) return <span key={i}>{part}</span>;
        return (
          <MemoryCitationBadge key={i} number={num} citation={citation} />
        );
      })}
    </span>
  );
}
