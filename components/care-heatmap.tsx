"use client";

import { useCallback, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const CARE_LOG_KEY = "gyeol_care_log_v1";

/** Increment today's care-activity count in localStorage. */
export function logCareActivity(): void {
  const log = getCareLog();
  const today = new Date().toISOString().slice(0, 10);
  log[today] = (log[today] ?? 0) + 1;
  try {
    localStorage.setItem(CARE_LOG_KEY, JSON.stringify(log));
  } catch {
    // quota exceeded — silently ignore
  }
}

/** Return every stored date -> count entry. */
export function getCareLog(): Record<string, number> {
  try {
    const raw = localStorage.getItem(CARE_LOG_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CareHeatmapProps {
  /** Date string (YYYY-MM-DD) -> activity count. Falls back to localStorage when omitted. */
  data?: Record<string, number>;
}

type CellData = {
  date: string;
  count: number;
  /** True when the date is in the future (should not be rendered as active). */
  future: boolean;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""] as const;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

// Green shades matching GitHub dark-theme contribution colours on a black bg.
const COLORS = {
  empty: "#161b22",
  low: "#0e4429",
  medium: "#006d32",
  high: "#26a641",
  bright: "#39d353",
} as const;

function colorForCount(count: number): string {
  if (count === 0) return COLORS.empty;
  if (count <= 2) return COLORS.low;
  if (count <= 5) return COLORS.medium;
  if (count <= 8) return COLORS.high;
  return COLORS.bright;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * GitHub-style 365-day contribution heatmap for creature care activity.
 *
 * Layout: 7 rows (Sun-Sat) x ~52 columns via CSS Grid.
 * Dark theme, green intensity shades, hover tooltips, streak counter.
 */
export function CareHeatmap({ data }: CareHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  // Resolve data source — prop or localStorage.
  const resolvedData = useMemo<Record<string, number>>(() => {
    if (data) return data;
    // SSR-safe guard: localStorage is only available on the client.
    if (typeof window === "undefined") return {};
    return getCareLog();
  }, [data]);

  // Build grid columns (each column = 1 week, 7 cells).
  const { columns, monthLabels, streak } = useMemo(() => {
    const today = new Date();

    // Start 364 days ago, then rewind to the nearest Sunday so column 0
    // always begins on Sunday (row 0 = Sun, row 6 = Sat).
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - start.getDay()); // align to Sunday

    const cols: CellData[][] = [];
    let week: CellData[] = [];
    const months: { label: string; col: number }[] = [];
    let lastMonth = -1;

    const cursor = new Date(start);
    let colIndex = 0;

    while (cursor <= today || week.length > 0) {
      const key = cursor.toISOString().slice(0, 10);
      const isFuture = cursor > today;
      const count = isFuture ? 0 : (resolvedData[key] ?? 0);

      // Track month boundaries for labels.
      const m = cursor.getMonth();
      if (m !== lastMonth) {
        months.push({ label: MONTH_NAMES[m], col: colIndex });
        lastMonth = m;
      }

      week.push({ date: key, count, future: isFuture });

      if (week.length === 7) {
        cols.push(week);
        week = [];
        colIndex++;
      }

      cursor.setDate(cursor.getDate() + 1);
      // Safety: don't go more than 7 days past today.
      if (isFuture && week.length === 0) break;
    }
    if (week.length > 0) cols.push(week);

    // Current streak: count consecutive days with count > 0 ending at today.
    let currentStreak = 0;
    const d = new Date(today);
    while (true) {
      const k = d.toISOString().slice(0, 10);
      if ((resolvedData[k] ?? 0) > 0) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    return { columns: cols, monthLabels: months, streak: currentStreak };
  }, [resolvedData]);

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, cell: CellData) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltip({
        x: rect.left + rect.width / 2,
        y: rect.top - 4,
        text: `${cell.date}: ${cell.count} ${cell.count === 1 ? "activity" : "activities"}`,
      });
    },
    [],
  );

  const handlePointerLeave = useCallback(() => setTooltip(null), []);

  return (
    <div className="relative w-full">
      {/* Month labels */}
      <div
        className="mb-1 ml-[28px] grid gap-[3px] text-[10px] text-white/40"
        style={{
          gridTemplateColumns: `repeat(${columns.length}, 11px)`,
        }}
      >
        {columns.map((_, ci) => {
          const label = monthLabels.find((m) => m.col === ci);
          return (
            <span key={ci} className="overflow-visible whitespace-nowrap">
              {label?.label ?? ""}
            </span>
          );
        })}
      </div>

      <div className="flex">
        {/* Day-of-week labels */}
        <div
          className="mr-1 grid text-[10px] text-white/40"
          style={{
            gridTemplateRows: "repeat(7, 11px)",
            gap: "3px",
            alignItems: "center",
          }}
        >
          {DAY_LABELS.map((label, i) => (
            <span key={i} className="flex h-[11px] w-[24px] items-center justify-end pr-0.5">
              {label}
            </span>
          ))}
        </div>

        {/* Heatmap grid */}
        <div
          className="grid gap-[3px] overflow-x-auto"
          style={{
            gridTemplateColumns: `repeat(${columns.length}, 11px)`,
            gridTemplateRows: "repeat(7, 11px)",
            gridAutoFlow: "column",
          }}
          role="img"
          aria-label={`Care activity heatmap — ${streak}-day streak`}
        >
          {columns.flatMap((week) =>
            week.map((cell) => (
              <div
                key={cell.date}
                className="h-[11px] w-[11px] rounded-[2px]"
                style={{
                  backgroundColor: cell.future ? "transparent" : colorForCount(cell.count),
                }}
                onPointerEnter={(e) => handlePointerEnter(e, cell)}
                onPointerLeave={handlePointerLeave}
              />
            )),
          )}
        </div>
      </div>

      {/* Legend + streak */}
      <div className="mt-3 flex items-center justify-between text-[10px] text-white/40">
        <div className="flex items-center gap-1">
          <span>Less</span>
          {[COLORS.empty, COLORS.low, COLORS.medium, COLORS.high, COLORS.bright].map((c) => (
            <div
              key={c}
              className="h-[10px] w-[10px] rounded-[2px]"
              style={{ backgroundColor: c }}
            />
          ))}
          <span>More</span>
        </div>
        <span className="text-white/60 font-medium">
          {streak > 0 ? `${streak}-day streak` : "No active streak"}
        </span>
      </div>

      {/* Tooltip (portal-free, positioned fixed) */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md border border-white/10 bg-neutral-900 px-2 py-1 text-[11px] text-white shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
