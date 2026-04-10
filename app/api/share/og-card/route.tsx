import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "edge";

/**
 * GET /api/share/og-card?agentId=xxx&locale=ko
 * Generates a dynamic OG image for sharing a creature on SNS.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");
  const locale = searchParams.get("locale") ?? "ko";
  const isKo = locale === "ko";

  // Fetch creature info
  let name = "GYEOL";
  let level = 1;
  let streakDays = 0;
  let species = "creature";
  let emoji = "🐣";

  if (agentId) {
    try {
      const service = createServiceClient();
      const { data: agent } = await service
        .from("agents")
        .select("custom_name, streak_days, level, species")
        .eq("id", agentId)
        .maybeSingle();

      if (agent) {
        name = (agent.custom_name as string) || "GYEOL";
        level = (agent.level as number) || 1;
        streakDays = (agent.streak_days as number) || 0;
        species = (agent.species as string) || "creature";
        // Pick emoji by species
        const SPECIES_EMOJI: Record<string, string> = {
          fluff: "🐣", ember: "🔥", aqua: "💧", terra: "🌿",
          spark: "⚡", void: "🌑", prism: "🌈", default: "✨",
        };
        emoji = SPECIES_EMOJI[species] ?? "✨";
      }
    } catch {
      // Use defaults if DB unavailable
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0a0a0f 0%, #0f0a1a 40%, #0a0f1a 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Aurora glow */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(129,140,248,0.3) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            left: "-60px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(96,165,250,0.2) 0%, transparent 70%)",
          }}
        />

        {/* GYEOL brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "40px" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "8px",
              padding: "4px 12px",
              color: "rgba(255,255,255,0.5)",
              fontSize: "13px",
              letterSpacing: "0.15em",
              fontWeight: 600,
            }}
          >
            GYEOL
          </div>
        </div>

        {/* Creature emoji */}
        <div style={{ fontSize: "96px", marginBottom: "24px", lineHeight: 1 }}>
          {emoji}
        </div>

        {/* Creature name */}
        <div
          style={{
            fontSize: "52px",
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            marginBottom: "8px",
          }}
        >
          {name}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginTop: "16px",
          }}
        >
          {/* Level */}
          <div
            style={{
              background: "rgba(129,140,248,0.15)",
              border: "1px solid rgba(129,140,248,0.3)",
              borderRadius: "12px",
              padding: "10px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ color: "#818cf8", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em" }}>
              {isKo ? "레벨" : "LEVEL"}
            </div>
            <div style={{ color: "#ffffff", fontSize: "28px", fontWeight: 800 }}>
              {level}
            </div>
          </div>

          {/* Streak */}
          <div
            style={{
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: "12px",
              padding: "10px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ color: "#f59e0b", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em" }}>
              {isKo ? "스트릭" : "STREAK"}
            </div>
            <div style={{ color: "#ffffff", fontSize: "28px", fontWeight: 800, display: "flex", alignItems: "center", gap: "4px" }}>
              🔥 {streakDays}
            </div>
          </div>

          {/* Species */}
          <div
            style={{
              background: "rgba(74,222,128,0.1)",
              border: "1px solid rgba(74,222,128,0.25)",
              borderRadius: "12px",
              padding: "10px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ color: "#4ade80", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em" }}>
              {isKo ? "종류" : "SPECIES"}
            </div>
            <div style={{ color: "#ffffff", fontSize: "18px", fontWeight: 700, marginTop: "4px" }}>
              {species.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            right: "48px",
            color: "rgba(255,255,255,0.2)",
            fontSize: "12px",
            letterSpacing: "0.08em",
          }}
        >
          gyeol.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
