import { ImageResponse } from "next/og";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveLocale } from "@/lib/i18n/config";
import { loadShareCardData } from "@/lib/share/card";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) return new Response("Not found", { status: 404 });

    const locale = resolveLocale({
      acceptLanguage: request.headers.get("accept-language"),
      cookieHeader: null,
      explicitLocale: new URL(request.url).searchParams.get("locale"),
    });

    const service = createServiceClient();
    const data = await loadShareCardData(service, slug, locale);
    if (!data) return new Response("Not found", { status: 404 });

    const color = data.visual?.color ?? "rgb(34, 211, 238)";
    const name = data.self_name || (locale === "ko" ? "결" : "Gyeol");
    const tagline = locale === "ko" ? "결의 · 관계를 쌓는 AI" : "Gyeol · an AI that builds relationships";
    const msgsLabel = locale === "ko" ? "총 대화" : "Messages";
    const weekLabel = locale === "ko" ? "이번 주" : "This week";
    const genLabel = `Gen ${data.gen_level}`;
    const vitalityPct = `${Math.round((data.vitality ?? 1) * 100)}%`;

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200",
            height: "630",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(135deg, #000000 0%, #0a0a1a 50%, #000000 100%)",
            color: "white",
            fontFamily: "sans-serif",
            padding: "60px",
            position: "relative",
          }}
        >
          {/* Top accent glow */}
          <div
            style={{
              position: "absolute",
              top: "0",
              left: "0",
              right: "0",
              height: "200px",
              background: `linear-gradient(180deg, ${color}25 0%, transparent 100%)`,
              display: "flex",
            }}
          />

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px", position: "relative" }}>
            {/* Gen level badge */}
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "20px",
                background: `${color}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "36px",
                fontWeight: "bold",
                color: color,
              }}
            >
              {data.gen_level}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "42px", fontWeight: "bold", lineHeight: "1.2" }}>{name}</div>
              <div style={{ fontSize: "18px", color: "rgba(255,255,255,0.55)", marginTop: "4px", display: "flex", gap: "12px" }}>
                <span>{genLabel}</span>
                <span>·</span>
                <span style={{ color: color }}>Vitality {vitalityPct}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: "24px", marginTop: "40px", position: "relative" }}>
            <div
              style={{
                flex: "1",
                background: "rgba(255,255,255,0.06)",
                borderRadius: "20px",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "48px", fontWeight: "bold", color: color }}>{data.total_messages}</div>
              <div style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>{msgsLabel}</div>
            </div>
            <div
              style={{
                flex: "1",
                background: "rgba(255,255,255,0.06)",
                borderRadius: "20px",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "48px", fontWeight: "bold", color: color }}>{data.week_messages}</div>
              <div style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>{weekLabel}</div>
            </div>
          </div>

          {/* Milestones */}
          {data.milestones.length > 0 && (
            <div style={{ display: "flex", gap: "12px", marginTop: "32px", flexWrap: "wrap" }}>
              {data.milestones.slice(0, 4).map((m, i) => (
                <div
                  key={i}
                  style={{
                    background: `${color}18`,
                    border: `1px solid ${color}35`,
                    borderRadius: "12px",
                    padding: "10px 18px",
                    fontSize: "15px",
                    color: "rgba(255,255,255,0.8)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ color: color, fontWeight: "bold" }}>{i + 1}</span>
                  <span>{m.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              position: "relative",
            }}
          >
            <div style={{ fontSize: "16px", color: "rgba(255,255,255,0.4)" }}>{tagline}</div>
            <div
              style={{
                background: `${color}25`,
                borderRadius: "999px",
                padding: "10px 24px",
                fontSize: "16px",
                fontWeight: "600",
                color: color,
              }}
            >
              gyeol.ai
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (e) {
    console.error("OG image error", e);
    return new Response("Error generating image", { status: 500 });
  }
}
