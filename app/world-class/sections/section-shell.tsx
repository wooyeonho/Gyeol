"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  apps: readonly string[];
  gradient: string;
  children: ReactNode;
};

export function SectionShell({ id, tag, title, subtitle, apps, gradient, children }: Props) {
  return (
    <section id={id} className="scroll-mt-8">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`rounded-3xl border border-white/10 bg-gradient-to-br ${gradient} p-6 md:p-8 backdrop-blur`}
      >
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span className="uppercase tracking-widest">{tag}</span>
          <span>·</span>
          <span>{apps.length} 앱에서 추출</span>
        </div>
        <h2 className="mt-2 text-2xl md:text-3xl font-bold">{title}</h2>
        <p className="mt-2 text-white/70 max-w-2xl text-sm md:text-base">{subtitle}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {apps.map((a) => (
            <span
              key={a}
              className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-white/80"
            >
              {a}
            </span>
          ))}
        </div>
      </motion.header>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur ${className}`}
    >
      {title && <div className="text-xs uppercase tracking-wider text-white/50 mb-3">{title}</div>}
      {children}
    </div>
  );
}
