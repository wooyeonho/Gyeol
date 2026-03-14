"use client";

import Link from "next/link";

export function WorldClassHubSessionHero({
  ctaLabel,
  description,
  heading,
  isStreaming,
  onPrimaryAction,
  secondaryHref,
  secondaryLabel,
  stepBodies,
  stepLabels,
  title,
}: {
  ctaLabel: string;
  description: string;
  heading: string;
  isStreaming: boolean;
  onPrimaryAction: () => void;
  secondaryHref: string;
  secondaryLabel: string;
  stepBodies: [string, string, string];
  stepLabels: [string, string, string];
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">{title}</p>
          <h2 className="mt-2 text-lg font-semibold">{heading}</h2>
          <p className="mt-2 text-sm leading-6 text-white/68">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={isStreaming}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {ctaLabel}
          </button>
          <Link
            href={secondaryHref}
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {stepLabels.map((label, index) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wider text-white/45">{index + 1}. {label}</p>
            <p className="mt-1 text-sm text-white/85">{stepBodies[index]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
