# GYEOL Design System

> For import into Google Stitch, Cursor, Claude Code, and other AI design tools.
> Philosophy: Dark Mystical. Glass-morphism. Organic Motion. Continuous, not categorical.

---

## Brand

- **Product**: GYEOL (결) — A living digital creature you raise through conversation
- **Tone**: Warm mystery. Cold technology with warm empathy on top.
- **Language**: Korean-first, 5-language support (ko/en/ja/zh/es)

## Colors

### Core

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#0a0a0f` | Page background |
| `--foreground` | `#f0f0f5` | Primary text |
| `--accent` | `#818cf8` | Indigo accent |
| `--muted` | `#9ca3b0` | Secondary text |
| `--border` | `#1e2030` | Solid borders |
| `--destructive` | `#f43f5e` | Error/danger |
| `--success` | `#4ade80` | Success state |
| `--warning` | `#fbbf24` | Warning state |
| `--info` | `#60a5fa` | Info state |

### Glass Surfaces

| Token | Value | Usage |
|-------|-------|-------|
| `--surface-1` | `rgba(255,255,255,0.03)` | Subtle background |
| `--surface-2` | `rgba(255,255,255,0.06)` | Card background |
| `--surface-3` | `rgba(255,255,255,0.10)` | Elevated surface |
| `--theme-panel` | `rgba(255,255,255,0.035)` | Panel default |
| `--theme-panel-strong` | `rgba(255,255,255,0.07)` | Panel emphasis |
| `--theme-border-soft` | `rgba(255,255,255,0.08)` | Subtle border |
| `--theme-border-strong` | `rgba(255,255,255,0.16)` | Visible border |
| `--theme-nav-bg` | `rgba(10,10,15,0.88)` | Navigation |
| `--theme-overlay` | `rgba(10,10,15,0.4)` | Overlay backdrop |

### Text Opacity

| Token | Value |
|-------|-------|
| `--theme-text-muted` | `rgba(240,240,245,0.88)` |
| `--theme-text-subtle` | `rgba(240,240,245,0.65)` |
| `--theme-text-faint` | `rgba(240,240,245,0.45)` |

## Typography

- **Font**: Pretendard Variable (Korean-optimized), system-ui fallback
- **Sizes**: caption 11px / sm 13px / base 16px / lg 18px / xl 22px / 2xl 28px / heading 36px
- **Line height**: 1.5 default
- **Rendering**: optimizeLegibility

## Spacing

4px base unit: 4 / 8 / 12 / 16 / 24 / 32 / 48px

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Tags, badges |
| `--radius-md` | `8px` | Small cards |
| `--radius-lg` | `12px` | Cards |
| `--radius-xl` | `16px` | Buttons, inputs |
| `--radius-2xl` | `24px` | Large panels |
| `--radius-full` | `9999px` | Circles, pills |

## Component Patterns

### Glass Card
```css
background: rgba(255, 255, 255, 0.03);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 16px;
```

### Glass Card (Elevated)
```css
background: rgba(255, 255, 255, 0.06);
backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.12);
border-radius: 24px;
```

### Button (Primary)
```css
background: white;
color: black;
border-radius: 16px;
min-height: 48px;
padding: 0 24px;
font-weight: 600;
```

### Button (Ghost)
```css
background: transparent;
color: rgba(240, 240, 245, 0.65);
border-radius: 16px;
min-height: 48px;
```

### Input
```css
background: rgba(255, 255, 255, 0.06);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 16px;
min-height: 48px;
padding: 0 16px;
color: #f0f0f5;
```

### Bottom Navigation
```css
position: fixed;
bottom: 0;
background: rgba(10, 10, 15, 0.88);
backdrop-filter: blur(20px);
border-top: 1px solid rgba(255, 255, 255, 0.08);
padding-bottom: env(safe-area-inset-bottom);
```

## Animations

| Name | Duration | Usage |
|------|----------|-------|
| `fadeSlideIn` | 0.4s ease-out-expo | Page transitions |
| `glowPulse` | 2.5s infinite | Highlighted elements |
| `creatureBreathe` | 2-3s infinite | Creature idle |
| `skeletonShimmer` | 1.8s infinite | Loading states |

**Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) for most transitions.

## Rarity System (for achievements, mystery box, badges)

| Rarity | Color | Glow |
|--------|-------|------|
| Common | `text-white/60` | None |
| Rare | `text-blue-400` | `shadow-blue-400/20` |
| Epic | `text-purple-400` | `shadow-purple-400/30` |
| Legendary | `text-amber-400` | `shadow-amber-400/40` |
| Mythic | Rainbow gradient | `shadow-fuchsia-400/50` animated |

## Layout Conventions

- **Mobile-first**: Max width `720px` for content areas
- **Safe areas**: Bottom nav respects `env(safe-area-inset-bottom)`
- **Touch targets**: Min `48px` height for all interactive elements
- **Page structure**: Full viewport height, flex column, creature stage (38vh top) + content (bottom)

## Design Principles

1. **Dark Mystical** — Background `#0a0a0f`, never pure white
2. **Glass-morphism** — 3-10% white opacity + backdrop-blur for depth
3. **Organic Motion** — Slow breathing pulses, not mechanical transitions
4. **Emotional** — Warm gradients over cold dark base
5. **Continuous** — No hard categories. Everything is a gradient (0~1)
6. **Emergent** — UI reacts to creature DNA state, not static layouts
