import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { DNA_AXES, type CreatureDNA } from "@/lib/genome/dna";
import { deriveSpecies } from "@/lib/genome/species";
import { deriveDNAAppearance } from "@/lib/genome/appearance";
import { getDominantTraits } from "@/lib/genome/dna";

export const runtime = "edge";

/**
 * GET /api/og/demo?dna=0.5,0.6,...(16 values)
 *
 * Generates a shareable DNA profile card for the demo experience.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const dnaParam = searchParams.get("dna") || "";

  // Parse DNA from comma-separated values
  const values = dnaParam.split(",").map(Number);
  const dna: CreatureDNA = {} as CreatureDNA;
  DNA_AXES.forEach((axis, i) => {
    dna[axis] = (values[i] >= 0 && values[i] <= 1) ? values[i] : 0.5;
  });

  const species = deriveSpecies(dna);
  const appearance = deriveDNAAppearance(dna, species);
  const dominant = getDominantTraits(dna, 3);

  const h = Math.round(appearance.primaryHue);
  const s = Math.round(appearance.primarySaturation);
  const l = Math.round(appearance.primaryLightness);
  const primaryColor = `hsl(${h}, ${s}%, ${l}%)`;

  const AXIS_LABELS: Record<string, string> = {
    analytical: "Analytical", intuitive: "Intuitive", verbal: "Verbal", spatial: "Spatial",
    warmth: "Warmth", intensity: "Intensity", stability: "Stability", openness: "Openness",
    assertiveness: "Assertiveness", empathy: "Empathy", playfulness: "Playfulness",
    independence: "Independence", curiosity: "Curiosity", persistence: "Persistence",
    adaptability: "Adaptability", creativity: "Creativity",
  };

  const rarityLabel = species.rarity > 0.7 ? "Rare" : species.rarity > 0.5 ? "Uncommon" : "Common";

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
          padding: "60px",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            top: "-50px",
            right: "100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: primaryColor,
            opacity: 0.12,
            filter: "blur(120px)",
          }}
        />

        {/* Creature orb */}
        <div
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${primaryColor}, hsl(${(h + 40) % 360}, ${s}%, ${l}%))`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "30px",
            boxShadow: `0 0 60px ${primaryColor}40`,
          }}
        >
          <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(255,255,255,0.7)" }} />
        </div>

        {/* Species name */}
        <div
          style={{
            fontSize: "42px",
            fontWeight: 700,
            color: primaryColor,
            letterSpacing: "2px",
            marginBottom: "8px",
          }}
        >
          {species.name}
        </div>

        {/* Archetype & Element */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            fontSize: "16px",
            color: "rgba(255,255,255,0.45)",
            marginBottom: "24px",
            textTransform: "capitalize",
          }}
        >
          <span>{species.archetype}</span>
          <span>·</span>
          <span>{species.element}</span>
          <span>·</span>
          <span>{rarityLabel}</span>
        </div>

        {/* Dominant traits */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "30px" }}>
          {dominant.map((axis) => (
            <div
              key={axis}
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.15)",
                fontSize: "14px",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {AXIS_LABELS[axis]} {Math.round(dna[axis] * 100)}%
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)", marginTop: "auto" }}>
          gyeol.app — shaped by conversation
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
