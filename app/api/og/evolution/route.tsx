import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export const runtime = "edge";

/**
 * P5B: Evolution Milestone OG Image
 *
 * GET /api/og/evolution?species=...&trait=...&gen=...&color=...
 *
 * Generates a 1200×630 social share image when a creature reaches
 * a new evolution milestone (species change, trait expression, gen level-up).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const species = searchParams.get("species") || "Unknown";
  const trait = searchParams.get("trait") || "";
  const gen = searchParams.get("gen") || "1";
  const primaryColor = searchParams.get("color") || "#818cf8";
  const creatureName = searchParams.get("name") || "";

  const subtitle = trait
    ? `New trait expressed: ${trait}`
    : `Evolved to Gen ${gen}`;

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
          background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: primaryColor,
            opacity: 0.12,
            filter: "blur(120px)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            zIndex: 1,
            padding: "40px 60px",
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "13px",
              letterSpacing: "0.25em",
              textTransform: "uppercase" as const,
              color: primaryColor,
              marginBottom: "16px",
              padding: "6px 16px",
              border: `1px solid ${primaryColor}40`,
              borderRadius: "20px",
            }}
          >
            EVOLUTION MILESTONE
          </div>

          {/* Creature name (if provided) */}
          {creatureName && (
            <div
              style={{
                fontSize: "20px",
                color: "rgba(240,240,245,0.5)",
                marginBottom: "8px",
              }}
            >
              {creatureName}
            </div>
          )}

          {/* Species title */}
          <div
            style={{
              fontSize: "56px",
              fontWeight: 700,
              color: "#f0f0f5",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            {species}
          </div>

          {/* Gen level */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "12px",
              fontSize: "18px",
              color: primaryColor,
              fontWeight: 600,
            }}
          >
            Gen {gen}
          </div>

          {/* Subtitle (trait or evolution info) */}
          <div
            style={{
              fontSize: "22px",
              color: "rgba(240,240,245,0.6)",
              marginTop: "20px",
              maxWidth: "700px",
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </div>

          {/* Divider */}
          <div
            style={{
              width: "80px",
              height: "2px",
              background: `linear-gradient(to right, transparent, ${primaryColor}, transparent)`,
              marginTop: "28px",
            }}
          />

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              marginTop: "28px",
              fontSize: "14px",
              color: "rgba(240,240,245,0.35)",
            }}
          >
            <span>GYEOL</span>
            <span style={{ color: primaryColor }}>&#x25CF;</span>
            <span>AI Companion</span>
            <span style={{ color: primaryColor }}>&#x25CF;</span>
            <span>Living Creature</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
