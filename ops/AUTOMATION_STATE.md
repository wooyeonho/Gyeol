# GYEOL AUTOMATION STATE

## Canonical lane
- Portfolio axis: Portfolio A
- Repository: `wooyeonho/Gyeol`
- Automation branch: `automation/hourly-operator`
- Production/main write policy: NEVER write or merge to `main` automatically.

## Product spine
GYEOL is a relationship-based AI companion in which conversation becomes memory, memory changes state/personality/identity, and that identity is expressed through behavior, growth, manifestation, sound/voice, autonomous activity, and long-term continuity. The product must optimize for trustworthy continuity and felt relationship rather than generic chatbot feature count.

## Current Gate — G0 Baseline Stabilization & Canonicalization
Establish one trustworthy current baseline before feature expansion.

### Gate acceptance criteria
1. Read current `main`, recent open PRs, README/product-state/runbooks, and deployment evidence.
2. Identify the canonical app/deployment target; do not silently treat duplicate Vercel projects as equivalent.
3. Run or obtain concrete evidence for `npm run typecheck`, `npm run test`, `npm run lint`, and `npm run build` (or exact CI equivalents).
4. Inspect current security/dependency/deployment blockers and separate verified defects from report-only claims.
5. Produce at least one real reversible code/test/config/ops artifact on `automation/hourly-operator` that advances the highest verified blocker.
6. Re-run verification after changes.
7. Capture actual preview/CI/app/deployment screen evidence when technically possible; otherwise persist exact `ACTUAL SCREEN CAPTURE BLOCKED` reason.
8. Update this file with exact commit/artifact, verification result, blocker, and Next Gate.

## Current evidence snapshot
- Default branch: `main`.
- Main baseline observed during onboarding: commit `6d474dd3736da8410b4ef1445b245a7ab488c212`.
- Public product homepage declared in repository metadata: `https://gyeol-ai.vercel.app`.
- README defines Next.js 16 / React 19 / Supabase / Groq+Gemini+Cloudflare AI / Vercel+Koyeb stack and provides explicit quality commands.
- Open Draft PR #334 exists against `main`; its Vercel bot evidence showed one `gyeol` deployment error and one `gyeol-ai` preview deployed on 2026-08-16 UTC. Treat this only as PR-specific evidence until re-verified.
- Repository contains many open issues/PRs and generated architecture reports; report text is NOT implementation evidence.

## Operating rules
- Success requires a real durable artifact + verification PASS, not diagnosis or architecture-report generation.
- Prefer fixing verified P0/P1 reliability, security, privacy, AI continuity/memory correctness, data integrity, accessibility, performance, or onboarding blockers before adding surface-area features.
- Never fabricate users, retention, revenue, model quality, benchmarks, security findings, or deployment state.
- Do not enable live billing, spend money, change production secrets/auth/security policy, publish externally, contact users, or merge to main without owner authorization.
- Use at least 3 relevant expert lenses for substantive changes: AI companion/product, full-stack/reliability, security/privacy; add UX/accessibility, data/ML, growth/economics, or legal/IP as needed.
- Preserve child/minor safety, emotional-dependency safety, privacy, consent, manipulation/dark-pattern safeguards, and clear AI identity. Avoid designing coercive attachment, fear-based paywalls, or deceptive claims of sentience.

## Initial Next Gate
Run G0 against the actual branch/deployment state, fix the smallest highest-confidence blocker, verify it, persist evidence, then decide whether G1 should be Core Relationship Loop, Memory/Continuity Integrity, Manifestation Performance, or Launch Readiness based on evidence.

## Last onboarding action
- Automation branch created from `main`.
- This canonical automation state was initialized for inclusion in Portfolio A hourly operations.
