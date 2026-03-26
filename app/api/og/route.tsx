import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export const runtime = "edge";

/**
 * GET /api/og?title=...&subtitle=...&color=...
 * 
 * Generates dynamic OG images (1200x630) for social sharing.
 * Used by landing page, evolution cards, and profile shares.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") || "GYEOL";
  const subtitle = searchParams.get("subtitle") || "Your AI creature grows through conversation";
  const primaryColor = searchParams.get("color") || "#818cf8";

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
          background: `linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)`,
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Aurora glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "200px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: primaryColor,
            opacity: 0.15,
            filter: "blur(100px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            right: "150px",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background: "#a78bfa",
            opacity: 0.1,
            filter: "blur(80px)",
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
            padding: "60px",
          }}
        >
          {/* Logo badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              letterSpacing: "0.3em",
              textTransform: "uppercase" as const,
              color: primaryColor,
              marginBottom: "24px",
            }}
          >
            GYEOL
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: "52px",
              fontWeight: 700,
              color: "#f0f0f5",
              lineHeight: 1.2,
              maxWidth: "900px",
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
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
              marginTop: "32px",
            }}
          />

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              marginTop: "32px",
              fontSize: "15px",
              color: "rgba(240,240,245,0.4)",
            }}
          >
            <span>AI Companion</span>
            <span style={{ color: primaryColor }}>&#x25CF;</span>
            <span>16 DNA Axes</span>
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
