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
    // S-5: UUID validation
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(slug)) return new Response("Not found", { status: 404 });

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
    const species = (data as unknown as { genome?: { species?: string } }).genome?.species ?? "";
    const dna = (data as unknown as { genome?: { dna?: Record<string, number> } }).genome?.dna;
    const tagline = locale === "ko" ? "결의 · 관계를 쌓는 AI" : "Gyeol · an AI that builds relationships";
    const msgsLabel = locale === "ko" ? "총 대화" : "Messages";
    const weekLabel = locale === "ko" ? "이번 주" : "This week";
    const genLabel = `Gen ${data.gen_level}`;
    const vitalityPct = `${Math.round((data.vitality ?? 1) * 100)}%`;
    const ctaLabel = locale === "ko" ? "나도 키워보기 →" : "Raise yours →";

    // Rarity from gen_level
    const rarity = data.gen_level >= 10 ? "Mythic" : data.gen_level >= 7 ? "Legendary" : data.gen_level >= 5 ? "Epic" : data.gen_level >= 3 ? "Rare" : "Common";
    const rarityColor = data.gen_level >= 10 ? "#f0abfc" : data.gen_level >= 7 ? "#fbbf24" : data.gen_level >= 5 ? "#a855f7" : data.gen_level >= 3 ? "#3b82f6" : "#94a3b8";

    // DNA axes for visualization (top 8 most expressed)
    const DNA_AXES = ["analytical","intuitive","verbal","spatial","warmth","intensity","playfulness","creativity"] as const;
    const dnaValues = DNA_AXES.map((axis) => (dna?.[axis] ?? 0.5));

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
            padding: "56px 60px",
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
              height: "220px",
              background: `linear-gradient(180deg, ${color}20 0%, transparent 100%)`,
              display: "flex",
            }}
          />

          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px", position: "relative" }}>
            {/* Creature visual orb */}
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "24px",
                background: `${color}25`,
                border: `2px solid ${color}50`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "40px",
                fontWeight: "bold",
                color: color,
                boxShadow: `0 0 30px ${color}40`,
              }}
            >
              {data.gen_level}
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: "1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ fontSize: "44px", fontWeight: "bold", lineHeight: "1.1" }}>{name}</div>
                {/* Rarity badge */}
                <div style={{
                  background: `${rarityColor}25`,
                  border: `1px solid ${rarityColor}60`,
                  borderRadius: "999px",
                  padding: "4px 14px",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: rarityColor,
                  display: "flex",
                  alignItems: "center",
                }}>
                  {rarity}
                </div>
              </div>
              <div style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)", marginTop: "6px", display: "flex", gap: "16px", alignItems: "center" }}>
                <span>{genLabel}</span>
                <span>·</span>
                {species && <span style={{ color: `${color}cc` }}>{species}</span>}
                {species && <span>·</span>}
                <span style={{ color: (data.vitality ?? 1) < 0.2 ? "#fb7185" : color }}>Vitality {vitalityPct}</span>
              </div>
            </div>
          </div>

          {/* Main content: Stats + DNA */}
          <div style={{ display: "flex", gap: "20px", marginTop: "36px", position: "relative", flex: "1" }}>
            {/* Left: Stats */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "200px" }}>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "20px", padding: "22px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: "44px", fontWeight: "bold", color: color }}>{data.total_messages}</div>
                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>{msgsLabel}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "20px", padding: "22px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: "44px", fontWeight: "bold", color: color }}>{data.week_messages}</div>
                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>{weekLabel}</div>
              </div>
            </div>

            {/* Right: DNA visualization */}
            <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px", display: "flex" }}>
                DNA Profile
              </div>
              {DNA_AXES.map((axis, i) => (
                <div key={axis} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "80px", fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "capitalize" }}>{axis}</div>
                  <div style={{ flex: "1", height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.08)", overflow: "hidden", display: "flex" }}>
                    <div style={{
                      height: "100%",
                      borderRadius: "4px",
                      width: `${Math.round(dnaValues[i] * 100)}%`,
                      background: `hsl(${180 + i * 22}, 70%, 60%)`,
                    }} />
                  </div>
                  <div style={{ width: "32px", fontSize: "11px", color: "rgba(255,255,255,0.35)", textAlign: "right" }}>
                    {Math.round(dnaValues[i] * 100)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", marginTop: "24px" }}>
            <div style={{ fontSize: "15px", color: "rgba(255,255,255,0.35)" }}>{tagline}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* CTA */}
              <div style={{
                background: `${color}`,
                borderRadius: "999px",
                padding: "10px 28px",
                fontSize: "15px",
                fontWeight: "700",
                color: "#000",
                display: "flex",
                alignItems: "center",
              }}>
                {ctaLabel}
              </div>
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>gyeol.ai</div>
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
