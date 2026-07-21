
# GYEOL System Architect Report

## [Security & Cost Efficiency]
- **Authentication & Authorization**: The application uses robust Next.js middleware with CSRF protection, strict origin validation, and IP-based rate limiting (100 req/min for API, 8 req/min for auth). Supabase handles session verification efficiently, avoiding DB IO for unauthenticated public routes. Content Security Policy (CSP) uses dynamically generated nonces for strict script execution.
- **Data Integrity & Privacy**: A `world-class-defense.ts` playbook implements adaptive risk scoring, step-up decision policies (MFA/Passkey), and session isolation levels (guest, normal, elevated, vault) inspired by top-tier security products. A Privacy Budget controls analytics telemetry limits, and Lockdown Profiles provide strict settings for sensitive scenarios.
- **Cost Optimization**: The platform embraces a Serverless/Edge computing model using Vercel. Database IO is minimized via aggressive caching (stale-while-revalidate for public endpoints) and batch loading techniques (e.g., in `lib/cron-core/heartbeat.ts` where N+1 query problems were specifically eliminated). AI routing prioritizes free/cheap Groq models (70B & 8B Llama 3) with Gemini Flash fallbacks, strictly minimizing LLM costs.

## [Functional Integrity]
- **Core Evolution Logic**: The creature's DNA system (`lib/genome/dna.ts`) uses a multi-dimensional vector (Cognitive, Emotional, Social, Meta) driving organic trait evolution. Heartbeat cron jobs autonomously simulate life (vitality processing, self-model updates, memory physics) without user interaction.
- **Zero-Downtime State Management**: Client state is heavily decoupled using Zustand (`agent-store`, `world-store`, `chat-store`) with real-time Supabase subscriptions, ensuring UI reacts fluidly to background evolution. Error boundaries (`CatchBoundary`, `ThreeErrorBoundary`) prevent component failures from crashing the global app.
- **Resilience**: The AI router implements cognitive-first hedged streaming, racing a high-parameter model against an 8B reflex model (triggered at 2500ms) to guarantee low latency. Fallback in-character responses handle absolute API failures seamlessly.

## [Global UI/UX & Graphic State]
- **High-End Minimalism**: The UI adheres to `world-class-playbook.ts`, borrowing density principles from Linear, motion from Apple HIG (spring physics), and fluid cross-fades from Arc. Unnecessary DOM elements are aggressively pruned (e.g., hiding 3D canvas when static AI portraits are loaded).
- **60fps Rendering**: The `VoidCanvas` conditionally uses React Three Fiber / WebGL based on device performance (`useDevicePerformance`), gracefully degrading to optimized CSS animations. Expensive assets are preloaded, and animations use rAF rather than `setInterval` for smooth transitions (e.g., `vitalPulse`).
- **Interactive Joy**: Interactions feature immediate haptic feedback (`haptic()`) and particle effects, making every touch (petting, feeding) feel tactile and rewarding.

## [Monetization & Retention Hook]
- **Retention Architecture**: Core loops are driven by Tamagotchi-style vitality decay and daily care completion goals. "Personalized push notifications" use emotional variants to prevent alert fatigue. Active user counters add social proof (with organic jitter), while daily login bonuses and streak shields hook users into daily habits.
- **Frictionless Monetization**: A multi-tier subscription (Free, Pro, Premium, Family) restricts advanced features (e.g., unlimited memory, voice mode, proactive AI). In-app currency/coins are earned via battle passes and "pity" drops. Paywall triggers are contextually surfaced rather than globally blocking usage.
- **Social Hooks**: The platform supports sharing ("Share Card"), community spaces (Tribes/Spaces), and leaderboard leagues, amplifying FOMO and social comparison to drive engagement and organic growth.

## [Architect's Action Plan]
1. **Critical Refactor: Extract Heartbeat Processing**: `executeHeartbeat()` handles too many tasks synchronously. Move heavy background processes (MoltBook distillation, AI research generation) to distributed queue workers (e.g., Upstash QStash or PG MQ) to eliminate timeout risks and optimize execution time.
2. **AI Cost Edge-Optimization**: Implement edge caching for highly repetitive autonomous queries (e.g., standard weather observations) to further cut Groq/Gemini API calls.
3. **UX Enhancement: Predictive Preloading**: Preload localized voice synths and 3D textures in the background during the onboarding phase, achieving zero-wait interactions upon initial creature birth.
4. **Retention Upgrade**: Implement a "Relationship Timeline" view to vividly visualize the creature's memory milestones and trait unlocks, directly driving user emotional investment and premium conversion.
