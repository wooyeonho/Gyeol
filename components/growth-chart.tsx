"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface DataPoint {
  label: string;
  value: number;
}

interface GrowthChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  showLabels?: boolean;
  title?: string;
  suffix?: string;
}

/**
 * Stripe Dashboard-style minimal growth chart.
 * Smooth SVG line with gradient fill and animated draw.
 */
export function GrowthChart({
  data,
  color = "#a78bfa",
  height = 120,
  showLabels = true,
  title,
  suffix = "",
}: GrowthChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return { path: "", areaPath: "", min: 0, max: 100, points: [] };

    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const padding = 16;
    const chartWidth = 100; // percent-based
    const chartHeight = height - (showLabels ? 28 : 8);

    const points = data.map((d, i) => ({
      x: padding + ((chartWidth - padding * 2) * i) / Math.max(data.length - 1, 1),
      y: chartHeight - ((d.value - min) / range) * (chartHeight - 16) - 8,
      ...d,
    }));

    // Smooth bezier path
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    // Area path (fill under the line)
    const areaPath = `${path} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

    return { path, areaPath, min, max, points };
  }, [data, height, showLabels]);

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center text-xs text-white/30" style={{ height }}>
        데이터가 부족해요
      </div>
    );
  }

  const latest = data[data.length - 1];
  const prev = data[data.length - 2];
  const delta = latest.value - prev.value;
  const deltaPercent = prev.value !== 0 ? ((delta / prev.value) * 100).toFixed(1) : "0";

  return (
    <div className="w-full">
      {/* Header */}
      {title && (
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs font-medium text-white/50">{title}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-white tabular-nums">
              {latest.value.toLocaleString()}{suffix}
            </span>
            <span
              className="text-[10px] font-semibold tabular-nums"
              style={{ color: delta >= 0 ? "#4ade80" : "#f87171" }}
            >
              {delta >= 0 ? "+" : ""}{deltaPercent}%
            </span>
          </div>
        </div>
      )}

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 100 ${height}`}
        className="w-full overflow-visible"
        style={{ height }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`growth-grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <motion.path
          d={chartData.areaPath}
          fill={`url(#growth-grad-${color.replace("#", "")})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />

        {/* Line */}
        <motion.path
          d={chartData.path}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Latest point dot */}
        {chartData.points.length > 0 && (
          <motion.circle
            cx={chartData.points[chartData.points.length - 1].x}
            cy={chartData.points[chartData.points.length - 1].y}
            r="2"
            fill={color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1 }}
          >
            <animate
              attributeName="r"
              values="2;3;2"
              dur="2s"
              repeatCount="indefinite"
            />
          </motion.circle>
        )}
      </svg>

      {/* X-axis labels */}
      {showLabels && chartData.points.length > 0 && (
        <div className="flex justify-between mt-1 px-1">
          <span className="text-[9px] text-white/25">{data[0].label}</span>
          <span className="text-[9px] text-white/25">{data[data.length - 1].label}</span>
        </div>
      )}
    </div>
  );
}
