import type { CreatureDNA } from "@/lib/genome/dna";

/**
 * Derive a dynamic UI theme from creature DNA.
 * The accent hue shifts toward warm colors for warmth/empathy-dominant creatures,
 * and toward cool colors for analytical/stability-dominant creatures.
 */
export function deriveDNATheme(dna: CreatureDNA) {
  const warmAxis = (dna.warmth + dna.empathy) / 2;
  const coolAxis = (dna.analytical + dna.stability) / 2;
  const accentHue = warmAxis > coolAxis ? 20 + warmAxis * 40 : 180 + coolAxis * 60;
  return {
    accentHue,
    accentSaturation: 40 + dna.intensity * 40,
    glowOpacity: 0.05 + dna.creativity * 0.15,
  };
}

/**
 * Apply the DNA-derived theme as CSS custom properties on the document root.
 * Call this from a client-side useEffect when the creature's DNA changes.
 */
export function applyDNAThemeToRoot(theme: ReturnType<typeof deriveDNATheme>) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--dna-accent-hue", String(Math.round(theme.accentHue)));
  root.style.setProperty("--dna-accent-sat", `${Math.round(theme.accentSaturation)}%`);
  root.style.setProperty("--dna-glow-opacity", String(theme.glowOpacity));
}
