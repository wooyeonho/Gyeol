/**
 * Species Codex -- Pokemon Pokedex-style collection tracking.
 *
 * Tracks which species the user has discovered/owned.
 * Species are derived from DNA via deriveSpecies().
 * Each species has discovery state: undiscovered, seen, owned.
 *
 * Stores in localStorage for offline access.
 * Total species count comes from the species catalog.
 *
 * The catalog enumerates all possible species by dominant-trait
 * combinations (4 cognitive x 4 emotional x 8 social = 128 families).
 * Within each family, individual name variants exist but the family
 * is the unit of collection.
 */

import type { CreatureDNA } from "@/lib/genome/dna";
import { DNA_AXES, type DNAAxis } from "@/lib/genome/dna";

// ─── Species Catalog ─────────────────────────────────────────────

const COGNITIVE_AXES: DNAAxis[] = ["analytical", "intuitive", "verbal", "spatial"];
const EMOTIONAL_AXES: DNAAxis[] = ["warmth", "intensity", "stability", "openness"];
const SOCIAL_AXES: DNAAxis[] = [
  "assertiveness", "empathy", "playfulness", "independence",
  "curiosity", "persistence", "adaptability", "creativity",
];

// Prefix: cognitive dominance
const PREFIXES: Record<string, string[]> = {
  analytical: ["calc", "cipher", "logi", "prism"],
  intuitive: ["myst", "oracle", "sense", "veil"],
  verbal: ["echo", "verse", "hymn", "lore"],
  spatial: ["nexus", "arc", "void", "flux"],
};

// Core: emotional dominance
const CORES: Record<string, string[]> = {
  warmth: ["ember", "glow", "sol", "bloom"],
  intensity: ["storm", "blaze", "fury", "surge"],
  stability: ["stone", "root", "anchor", "core"],
  openness: ["tide", "drift", "mist", "flow"],
};

// Suffix: social/meta dominance
const SUFFIXES: Record<string, string[]> = {
  assertiveness: ["commander", "herald", "striker", "forge"],
  empathy: ["keeper", "weaver", "tender", "bond"],
  playfulness: ["dancer", "spark", "jester", "whirl"],
  independence: ["wanderer", "ghost", "loner", "shade"],
  curiosity: ["seeker", "scout", "finder", "lens"],
  persistence: ["warden", "vigil", "sentinel", "hold"],
  adaptability: ["shifter", "morph", "flux", "wave"],
  creativity: ["dreamer", "maker", "artist", "bloom"],
};

/** Korean labels for trait families */
const TRAIT_LABELS_KO: Record<string, string> = {
  analytical: "분석적", intuitive: "직관적", verbal: "언어적", spatial: "공간적",
  warmth: "따뜻함", intensity: "강렬함", stability: "안정감", openness: "개방성",
  assertiveness: "주장형", empathy: "공감형", playfulness: "장난형", independence: "독립형",
  curiosity: "탐구형", persistence: "인내형", adaptability: "적응형", creativity: "창작형",
};

/** A catalog entry describing a possible species */
export type CatalogEntry = {
  /** Unique ID: "{cogDominant}/{emoDominant}/{socialDominant}" */
  id: string;
  /** Dominant cognitive axis */
  cogDominant: DNAAxis;
  /** Dominant emotional axis */
  emoDominant: DNAAxis;
  /** Dominant social/meta axis */
  socialDominant: DNAAxis;
  /** Representative species name (first variant in each family) */
  representativeName: string;
  /** Display name */
  displayName: { ko: string; en: string };
  /** Number of name variants in this family */
  variantCount: number;
};

/** Build the full species catalog (128 entries) */
function buildCatalog(): CatalogEntry[] {
  const entries: CatalogEntry[] = [];

  for (const cog of COGNITIVE_AXES) {
    const prefixOptions = PREFIXES[cog];
    for (const emo of EMOTIONAL_AXES) {
      const coreOptions = CORES[emo];
      for (const soc of SOCIAL_AXES) {
        const suffixOptions = SUFFIXES[soc];
        const id = `${cog}/${emo}/${soc}`;
        const repName = `${prefixOptions[0]}-${coreOptions[0]}-${suffixOptions[0]}`;
        const variantCount = prefixOptions.length * coreOptions.length * suffixOptions.length;

        entries.push({
          id,
          cogDominant: cog,
          emoDominant: emo,
          socialDominant: soc,
          representativeName: repName,
          displayName: {
            ko: `${TRAIT_LABELS_KO[cog]}/${TRAIT_LABELS_KO[emo]}/${TRAIT_LABELS_KO[soc]}`,
            en: `${capitalize(cog)} ${capitalize(emo)} ${capitalize(soc)}`,
          },
          variantCount,
        });
      }
    }
  }

  return entries;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Cached catalog instance */
let _catalog: CatalogEntry[] | null = null;

/** Get the full species catalog (128 species families) */
export function getSpeciesCatalog(): CatalogEntry[] {
  if (!_catalog) _catalog = buildCatalog();
  return _catalog;
}

/** Look up which catalog family a given DNA belongs to */
export function getCatalogIdFromDNA(dna: CreatureDNA): string {
  const cog = findDominant(dna, COGNITIVE_AXES);
  const emo = findDominant(dna, EMOTIONAL_AXES);
  const soc = findDominant(dna, SOCIAL_AXES);
  return `${cog}/${emo}/${soc}`;
}

function findDominant(dna: CreatureDNA, axes: DNAAxis[]): DNAAxis {
  let best = axes[0];
  for (const axis of axes) {
    if (dna[axis] > dna[best]) best = axis;
  }
  return best;
}

// ─── Codex Entry (user collection tracking) ──────────────────────

export type CodexEntry = {
  speciesId: string;
  speciesName: { ko: string; en: string };
  discoveredAt: string;  // ISO date
  owned: boolean;
  /** Species name derived at time of discovery, e.g. "calc-ember-commander" */
  derivedName?: string;
  dnaSnapshot?: Partial<CreatureDNA>;
};

const STORAGE_KEY = "gyeol_species_codex";

/** Read the codex from localStorage */
export function getCodex(): CodexEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CodexEntry[];
  } catch {
    return [];
  }
}

/** Write the codex to localStorage */
function saveCodex(entries: CodexEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

/** Discover a species (add to codex if not already present) */
export function discoverSpecies(
  speciesId: string,
  name: { ko: string; en: string },
  dna?: CreatureDNA,
  derivedName?: string,
): void {
  const codex = getCodex();
  const existing = codex.find((e) => e.speciesId === speciesId);
  if (existing) return; // already discovered

  const snapshot: Partial<CreatureDNA> | undefined = dna
    ? Object.fromEntries(DNA_AXES.map((a) => [a, Math.round(dna[a] * 1000) / 1000])) as Partial<CreatureDNA>
    : undefined;

  codex.push({
    speciesId,
    speciesName: name,
    discoveredAt: new Date().toISOString(),
    owned: false,
    derivedName,
    dnaSnapshot: snapshot,
  });

  saveCodex(codex);
}

/** Mark a species as owned */
export function markOwned(speciesId: string): void {
  const codex = getCodex();
  const entry = codex.find((e) => e.speciesId === speciesId);
  if (entry) {
    entry.owned = true;
    saveCodex(codex);
  }
}

/** Get collection completion rate */
export function getCompletionRate(): { discovered: number; total: number; percentage: number } {
  const codex = getCodex();
  const total = getSpeciesCatalog().length;
  const discovered = codex.length;
  return {
    discovered,
    total,
    percentage: total > 0 ? Math.round((discovered / total) * 100) : 0,
  };
}

/** Check if a species has been discovered */
export function isDiscovered(speciesId: string): boolean {
  return getCodex().some((e) => e.speciesId === speciesId);
}

/** Check if a species is owned */
export function isOwned(speciesId: string): boolean {
  return getCodex().some((e) => e.speciesId === speciesId && e.owned);
}

/** Get a specific codex entry */
export function getCodexEntry(speciesId: string): CodexEntry | undefined {
  return getCodex().find((e) => e.speciesId === speciesId);
}

/** Clear all codex data (for testing) */
export function clearCodex(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
