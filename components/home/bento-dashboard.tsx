"use client";

import { type ReactNode } from "react";
import { SpringCard } from "@/components/ui/spring-card";

interface BentoItem {
  key: string;
  span?: "1x1" | "2x1" | "1x2" | "2x2";
  content: ReactNode;
}

interface BentoDashboardProps {
  items: BentoItem[];
  className?: string;
}

const SPAN_CLASS: Record<string, string> = {
  "1x1": "col-span-1 row-span-1",
  "2x1": "col-span-2 row-span-1",
  "1x2": "col-span-1 row-span-2",
  "2x2": "col-span-2 row-span-2",
};

export function BentoDashboard({ items, className = "" }: BentoDashboardProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {items.map((item) => (
        <SpringCard
          key={item.key}
          className={`${SPAN_CLASS[item.span ?? "1x1"]} min-h-[120px] flex flex-col glass-card rounded-2xl`}
        >
          {item.content}
        </SpringCard>
      ))}
    </div>
  );
}
