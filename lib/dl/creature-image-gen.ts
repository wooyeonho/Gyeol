/**
 * Creature Image Generation
 *
 * Generates unique creature portrait images from DNA vectors.
 * Uses Cloudflare Workers AI SDXL with DNA-derived prompts.
 * Enhanced version of the existing portrait-prompt system.
 */

import type { CreatureDNA } from "@/lib/genome/dna";
import type { SpeciesProfile } from "@/lib/genome/species";

export type ImageGenResult = {
  /** Base64 image data or URL */
  imageData: string;
  /** Prompt used for generation */
  prompt: string;
  /** Style applied */
  style: string;
  /** Whether generation succeeded */
  success: boolean;
  error?: string;
};

export type ImageStyle = "portrait" | "chibi" | "pixel" | "watercolor" | "abstract";

/**
 * Build a detailed image generation prompt from DNA.
 * More precise than basic portrait-prompt.ts — uses continuous DNA values.
 */
export function buildCreatureImagePrompt(
  dna: CreatureDNA,
  species: SpeciesProfile,
  style: ImageStyle = "portrait",
): string {
  const parts: string[] = [];

  // Style prefix
  const stylePrefix: Record<ImageStyle, string> = {
    portrait: "digital art portrait, detailed creature design",
    chibi: "cute chibi style, kawaii creature",
    pixel: "pixel art sprite, retro game style creature",
    watercolor: "watercolor painting, ethereal creature",
    abstract: "abstract digital art, cosmic being",
  };
  parts.push(stylePrefix[style]);

  // Body shape from DNA
  if (dna.warmth > 0.7) parts.push("round soft body");
  else if (dna.analytical > 0.7) parts.push("angular geometric body");
  else if (dna.persistence > 0.7) parts.push("elongated sleek body");
  else parts.push("organic flowing body");

  // Size impression
  if (dna.assertiveness > 0.7) parts.push("imposing presence");
  else if (dna.playfulness > 0.7) parts.push("small bouncy");
  else parts.push("medium sized");

  // Surface texture
  if (dna.creativity > 0.7) parts.push("iridescent surface");
  else if (dna.stability > 0.7) parts.push("smooth matte surface");
  else if (dna.intensity > 0.7) parts.push("glowing veins on surface");
  else parts.push("soft textured surface");

  // Eye description
  const eyeCount = Math.max(2, Math.round(1 + dna.intuitive * 3));
  if (eyeCount > 2) parts.push(`${eyeCount} eyes`);
  else parts.push("large expressive eyes");

  if (dna.empathy > 0.7) parts.push("warm gentle eyes");
  else if (dna.curiosity > 0.7) parts.push("bright curious eyes");
  else if (dna.intensity > 0.7) parts.push("piercing glowing eyes");

  // Appendages
  if (dna.openness > 0.6) parts.push("ethereal wing-like extensions");
  if (dna.creativity > 0.6) parts.push("crystalline crown growths");
  if (dna.adaptability > 0.6) parts.push("flexible tendrils");
  if (dna.assertiveness > 0.6) parts.push("strong limbs");

  // Color from archetype
  const colorMap: Record<string, string> = {
    organic: "warm earth tones, green and amber",
    crystalline: "cool blue and white, translucent",
    ethereal: "purple and silver, luminous",
    volcanic: "red and orange, inner fire glow",
    verdant: "deep green, nature colors",
    fluid: "aqua and teal, water-like",
    mechanical: "steel grey and copper",
    spectral: "pale ghostly white and violet",
  };
  parts.push(colorMap[species.archetype] ?? "mystical colors");

  // Element
  if (species.element) {
    parts.push(`${species.element} elemental essence`);
  }

  // Mood/atmosphere
  parts.push("dark mystical background");
  parts.push("high quality");
  parts.push("no text");

  return parts.join(", ");
}

/**
 * Generate a creature image using Cloudflare Workers AI SDXL.
 */
export async function generateCreatureImage(
  dna: CreatureDNA,
  species: SpeciesProfile,
  style: ImageStyle = "portrait",
): Promise<ImageGenResult> {
  const prompt = buildCreatureImagePrompt(dna, species, style);

  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;

  if (!accountId || !apiToken) {
    return {
      imageData: "",
      prompt,
      style,
      success: false,
      error: "CF_ACCOUNT_ID or CF_API_TOKEN not configured",
    };
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: "text, watermark, signature, blurry, low quality, human face",
          width: 512,
          height: 512,
          num_steps: 20,
        }),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!res.ok) {
      return {
        imageData: "",
        prompt,
        style,
        success: false,
        error: `CF API error: ${res.status}`,
      };
    }

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return {
      imageData: `data:image/png;base64,${base64}`,
      prompt,
      style,
      success: true,
    };
  } catch (err) {
    return {
      imageData: "",
      prompt,
      style,
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
