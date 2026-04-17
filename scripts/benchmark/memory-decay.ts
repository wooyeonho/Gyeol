/**
 * Benchmark: Memory Decay Physics
 *
 * Simulates exponential weight decay for 4 memories with different reference
 * counts across a 1-year time-lapse. No Supabase connection required — pure math.
 *
 * Run:
 *   npx tsx scripts/benchmark/memory-decay.ts
 */

// ── Constants (mirror of lib/memory/physics.ts) ──────────────────────────────
const BASE_DECAY_RATE   = 0.05;   // λ₀ — base daily decay for unreferenced memory
const REF_SLOWDOWN      = 0.3;    // each reference reduces decay rate by 30%
const ARCHIVE_THRESHOLD = 0.10;   // archive when weight drops below 10%

// ── Pure math (no imports) ───────────────────────────────────────────────────
function effectiveDecayRate(referenceCount: number): number {
  return BASE_DECAY_RATE / (1 + referenceCount * REF_SLOWDOWN);
}

function computeWeight(daysSinceCreation: number, referenceCount: number): number {
  const lambda = effectiveDecayRate(referenceCount);
  return Math.exp(-lambda * daysSinceCreation);
}

function isArchived(weight: number): boolean {
  return weight < ARCHIVE_THRESHOLD;
}

// ── Scenario config ───────────────────────────────────────────────────────────
const MEMORIES = [
  { label: "Ephemeral  (ref=0)",  refCount: 0  },
  { label: "Referenced (ref=5)",  refCount: 5  },
  { label: "Core       (ref=20)", refCount: 20 },
  { label: "Anchor     (ref=50)", refCount: 50 },
] as const;

const TIME_POINTS_DAYS = [30, 90, 180, 365];

// ── ANSI helpers ──────────────────────────────────────────────────────────────
const RED    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const GREEN  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const YELLOW = (s: string) => `\x1b[33m${s}\x1b[0m`;
const BOLD   = (s: string) => `\x1b[1m${s}\x1b[0m`;
const DIM    = (s: string) => `\x1b[2m${s}\x1b[0m`;

function weightColor(w: number): string {
  if (isArchived(w)) return RED(`${w.toFixed(4)} [ARCHIVED]`);
  if (w >= 0.5)      return GREEN(w.toFixed(4));
  return YELLOW(w.toFixed(4));
}

// ── Run ───────────────────────────────────────────────────────────────────────
console.log();
console.log(BOLD("═══════════════════════════════════════════════════════════════"));
console.log(BOLD("  GYEOL · Memory Decay Physics Benchmark"));
console.log(BOLD("═══════════════════════════════════════════════════════════════"));
console.log();
console.log(DIM(`  Formula  : w(t) = exp(−λ · t)`));
console.log(DIM(`  λ        : ${BASE_DECAY_RATE} / (1 + ref × ${REF_SLOWDOWN})`));
console.log(DIM(`  Archive  : weight < ${ARCHIVE_THRESHOLD}`));
console.log();

// Header row
const COL_LABEL = 24;
const COL_RATE  = 10;
const COL_DAY   = 22;

const headerParts = [
  "Memory".padEnd(COL_LABEL),
  "λ/day".padStart(COL_RATE),
  ...TIME_POINTS_DAYS.map((d) => `+${d}d`.padStart(COL_DAY)),
];
console.log(BOLD(headerParts.join("  ")));
console.log("─".repeat(COL_LABEL + COL_RATE + TIME_POINTS_DAYS.length * (COL_DAY + 2) + 4));

// Data rows
for (const mem of MEMORIES) {
  const lambda = effectiveDecayRate(mem.refCount);

  const cells = TIME_POINTS_DAYS.map((days) => {
    const w = computeWeight(days, mem.refCount);
    return weightColor(w).padStart(COL_DAY);
  });

  const row = [
    mem.label.padEnd(COL_LABEL),
    lambda.toFixed(5).padStart(COL_RATE),
    ...cells,
  ];
  console.log(row.join("  "));
}

console.log();

// ── Archive timeline per memory ───────────────────────────────────────────────
console.log(BOLD("Archive Crossover Points"));
console.log("─".repeat(50));

for (const mem of MEMORIES) {
  const lambda = effectiveDecayRate(mem.refCount);
  // Solve: exp(-λ·t) = ARCHIVE_THRESHOLD  →  t = -ln(threshold) / λ
  const archiveDays = -Math.log(ARCHIVE_THRESHOLD) / lambda;

  const line = archiveDays > 3650
    ? GREEN(`  ${mem.label.padEnd(COL_LABEL)} → never archived within 10 years`)
    : RED(`  ${mem.label.padEnd(COL_LABEL)} → archived after ~${Math.round(archiveDays)} days`);
  console.log(line);
}

console.log();

// ── Survival probability table (bonus: half-life) ────────────────────────────
console.log(BOLD("Half-Life (weight = 0.5)"));
console.log("─".repeat(50));
for (const mem of MEMORIES) {
  const lambda = effectiveDecayRate(mem.refCount);
  const halfLife = Math.log(2) / lambda;
  console.log(`  ${mem.label.padEnd(COL_LABEL)} → half-life: ${Math.round(halfLife)} days`);
}

console.log();
console.log(DIM("  Tip: run this after tweaking BASE_DECAY_RATE or REF_SLOWDOWN to preview impact."));
console.log();
