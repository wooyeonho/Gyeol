# Testing Gyeol Creature Canvas & Homepage

## Overview
The Gyeol homepage features a Three.js canvas with a "living creature" — organic breathing animation, eye tracking, idle/drowsy/sleeping states, and a circadian time-of-day overlay.

## Devin Secrets Needed
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `DATABASE_URL` — Postgres connection string
- `GROQ_API_KEY` — Groq API key for AI chat

## Local Dev Setup
1. The `.env.local` file may have `${VAR_NAME}` template references instead of actual values. Resolve them using a script:
   ```python
   python3 -c "
   import os, re
   with open('.env.local') as f: content = f.read()
   resolved = re.sub(r'\$\{(\w+)\}', lambda m: os.environ.get(m.group(1), m.group(0)), content)
   with open('.env.local', 'w') as f: f.write(resolved)
   "
   ```
2. Start dev server: `npx next dev -p 3000`
3. Wait for "Ready" message before navigating

## Key Architecture
- **Creature state hook**: `hooks/use-creature-state.ts` — drives breathPhase, activity (awake/drowsy/sleeping), excitePulse, pointerNorm
- **Three.js canvas**: `components/void-canvas-inner.tsx` — CoreShape (breathing scale), CreatureEye (pointer tracking), OrganicParticles (instanced mesh)
- **Status indicator**: `components/creature-status.tsx` — shows drowsy/sleeping pill with AnimatePresence
- **Circadian overlay**: `lib/circadian.ts` — time-of-day gradient tint
- **Homepage wiring**: `app/page.tsx` — integrates all creature components

## Testing the Creature Features

### Three.js Canvas Visibility
The Three.js canvas only renders when `enableThree` is true, which requires:
- `performanceMinimal` is false (default)
- `conversationStarted` is true — at least one user message must exist in chat history

If the canvas shows only a black background with no particles, the user likely has no chat history. Send a message first.

### Creature State Timings
- **Awake → Drowsy**: 30 seconds of no interaction (DROWSY_AFTER_S = 30)
- **Drowsy → Sleeping**: 120 seconds of no interaction (SLEEP_AFTER_S = 120)
- **Wake up**: Any pointer move, key press, touch, or streaming activity

### What to Look For
1. **Breathing**: Core shape gently scales in/out. Rate: ~0.18-0.30 Hz awake, slower when drowsy/sleeping
2. **Organic particles**: Float around core shape, speed varies with activity state
3. **Eye tracking**: Small sphere inside CoreShape follows cursor position (uses lerp for smoothing)
4. **Drowsy indicator**: "😴 Drowsy" pill appears below the WorldClassHub header after 30s idle
5. **Sleeping indicator**: "💤 Sleeping" pill appears after 120s idle
6. **Circadian overlay**: Subtle gradient tint based on local hour (dawn/morning/afternoon/dusk/night/late-night)
7. **Excite pulse**: Tapping the canvas triggers a brief scale spike (creature.excite())

### Performance Note
The creature hook throttles React setState to ~15fps (SET_STATE_INTERVAL = 66ms) to avoid re-rendering the entire component tree at 60fps. Activity changes bypass the throttle. The Three.js useFrame loop still runs at full framerate internally.

### Common Issues
- **Page shows "Awakening Presence..." loading**: Supabase connection needed — check env vars are resolved
- **"While you were away" overlay blocks view**: Close it by clicking the Close button before testing
- **No particles visible**: Check if `conversationStarted` is true (need chat history)
- **Breathing looks steppy at 15fps**: This is the throttle tradeoff. The Three.js lerp in useFrame should smooth it out, but if it looks bad, the SET_STATE_INTERVAL can be lowered
