"use client";

import { SpringCard } from "@/components/ui/spring-card";

interface QuoteCardProps {
  author: { name: string; avatarEmoji?: string };
  content: string;
  timestamp: string;
  className?: string;
}

export function QuoteCard({ author, content, timestamp, className = "" }: QuoteCardProps) {
  return (
    <SpringCard className={`border-l-2 border-cyan-500/30 bg-white/[0.03] ${className}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm">{author.avatarEmoji ?? "🐣"}</span>
        <span className="text-xs font-medium text-white/70">{author.name}</span>
        <span className="text-[10px] text-white/30">{timestamp}</span>
      </div>
      <p className="text-xs text-white/50 line-clamp-3">{content}</p>
    </SpringCard>
  );
}
