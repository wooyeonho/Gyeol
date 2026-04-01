import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * P5B: Evolution Milestone OG Image
 *
 * Generates a shareable social card when a creature reaches an evolution milestone
 * (new species, new traits, generation level up).
 *
 * Usage: /api/og/evolution?name=echo-ember-seeker&gen=5&trait=Pattern+Sight&element=fire
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get("name") || "Unknown Species";
  const gen = searchParams.get("gen") || "1";
  const trait = searchParams.get("trait") || "";
  const element = searchParams.get("element") || "void";

  const elementColors: Record<string, { bg: string; accent: string; glow: string }> = {
    fire: { bg: "#1a0505", accent: "#ef4444", glow: "#ff6b35" },
    ice: { bg: "#051a1a", accent: "#06b6d4", glow: "#67e8f9" },
    light: { bg: "#1a1a05", accent: "#eab308", glow: "#fde047" },
    shadow: { bg: "#0a0a14", accent: "#8b5cf6", glow: "#a78bfa" },
    nature: { bg: "#051a0a", accent: "#22c55e", glow: "#4ade80" },
    void: { bg: "#0a0510", accent: "#6366f1", glow: "#818cf8" },
    storm: { bg: "#0a0f1a", accent: "#3b82f6", glow: "#60a5fa" },
    crystal: { bg: "#140a1a", accent: "#d946ef", glow: "#e879f9" },
  };

  const colors = elementColors[element] || elementColors.void;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(ellipse at center, ${colors.bg} 0%, #000000 100%)`,
          fontFamily: "sans-serif",
          color: "#ffffff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow orb */}
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${colors.glow}40 0%, ${colors.accent}20 50%, transparent 100%)`,
            boxShadow: `0 0 80px ${colors.glow}60, 0 0 160px ${colors.accent}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${colors.glow} 0%, ${colors.accent} 100%)`,
              boxShadow: `0 0 40px ${colors.glow}80`,
            }}
          />
        </div>

        {/* Species name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: colors.glow,
            textShadow: `0 0 30px ${colors.glow}60`,
            marginBottom: 8,
          }}
        >
          {name}
        </div>

        {/* Gen level */}
        <div
          style={{
            fontSize: 24,
            opacity: 0.7,
            marginBottom: 16,
          }}
        >
          Generation {gen}
        </div>

        {/* Trait badge */}
        {trait && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              borderRadius: 999,
              border: `1px solid ${colors.accent}40`,
              background: `${colors.accent}15`,
              fontSize: 18,
              color: colors.glow,
            }}
          >
            ✦ {trait}
          </div>
        )}

        {/* Branding */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            fontSize: 16,
            opacity: 0.4,
            letterSpacing: "0.1em",
          }}
        >
          결 GYEOL
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
