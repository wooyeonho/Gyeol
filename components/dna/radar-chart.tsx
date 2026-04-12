"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { CreatureDNA } from "@/lib/genome/dna";
import { DNA_AXES } from "@/lib/genome/dna";

interface DnaRadarChartProps {
  dna: CreatureDNA;
  previousDna?: CreatureDNA | null;
  accentColor?: string;
  size?: number;
}

/**
 * DNA Radar Chart — 16-axis spider/radar visualization.
 * Inspired by Spotify Wrapped's data visualization and Pokemon stat charts.
 * Shows all 16 DNA axes in a circular layout with animated fill.
 */
export function DnaRadarChart({
  dna,
  previousDna,
  accentColor = "#818cf8",
  size = 240,
}: DnaRadarChartProps) {
  const center = size / 2;
  const radius = (size / 2) - 30;
  const axes = DNA_AXES;
  const angleStep = (2 * Math.PI) / axes.length;

  const currentPoints = useMemo(() => {
    return axes.map((axis, i) => {
      const rec = dna as unknown as Record<string, number>;
      const value = rec[axis] ?? 0.5;
      const angle = angleStep * i - Math.PI / 2;
      return {
        x: center + Math.cos(angle) * radius * value,
        y: center + Math.sin(angle) * radius * value,
      };
    });
  }, [dna, axes, angleStep, center, radius]);

  const previousPoints = useMemo(() => {
    if (!previousDna) return null;
    return axes.map((axis, i) => {
      const rec = previousDna as unknown as Record<string, number>;
      const value = rec[axis] ?? 0.5;
      const angle = angleStep * i - Math.PI / 2;
      return {
        x: center + Math.cos(angle) * radius * value,
        y: center + Math.sin(angle) * radius * value,
      };
    });
  }, [previousDna, axes, angleStep, center, radius]);

  const currentPath = currentPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
  const prevPath = previousPoints ? previousPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z" : null;

  // Grid circles
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid circles */}
        {gridLevels.map((level) => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={radius * level}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.5"
          />
        ))}

        {/* Axis lines */}
        {axes.map((axis, i) => {
          const angle = angleStep * i - Math.PI / 2;
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;
          return (
            <line
              key={axis}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Previous DNA fill (ghost) */}
        {prevPath && (
          <path
            d={prevPath}
            fill="rgba(255,255,255,0.04)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {/* Current DNA fill */}
        <motion.path
          d={currentPath}
          fill={`${accentColor}18`}
          stroke={accentColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />

        {/* Axis dots */}
        {currentPoints.map((p, i) => (
          <motion.circle
            key={axes[i]}
            cx={p.x}
            cy={p.y}
            r={2.5}
            fill={accentColor}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
          />
        ))}

        {/* Axis labels */}
        {axes.map((axis, i) => {
          const angle = angleStep * i - Math.PI / 2;
          const labelR = radius + 16;
          const x = center + Math.cos(angle) * labelR;
          const y = center + Math.sin(angle) * labelR;
          const short = axis.slice(0, 3).toUpperCase();
          return (
            <text
              key={axis}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-white/30 text-[7px] font-mono"
            >
              {short}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
