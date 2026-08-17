# GYEOL AUTOMATION STATE

## Canonical lane
- Portfolio axis: Portfolio A
- Repository: `wooyeonho/Gyeol`
- Automation branch: `automation/hourly-operator`
- Production/main write policy: NEVER write or merge to `main` automatically.

## RUN
- RUN_TS: 2026-08-17 22:38:33 KST
- RUN_ID: PA-20260817-223833-KST-01
- Status: PARTIAL — security/runtime remediation candidate now passes audit/lint/typecheck/test/build, and the verified lockfile was persisted; one exact-head baseline rerun is required after persistence before G0 is VERIFIED.

## Product spine
GYEOL is a relationship-based AI companion in which conversation becomes memory, memory changes state/personality/identity, and that identity is expressed through behavior, growth, manifestation, sound/voice, autonomous activity, and long-term continuity. Prioritize trustworthy relationship continuity over generic chatbot feature count.

## Current Gate — G0 Baseline Stabilization & Canonicalization
Establish one trustworthy current baseline before feature expansion.

## Current-cycle actual work
- Read canonical state and inspected the active automation branch, recent open PR evidence and Vercel Preview deployment records. Draft PR #334 remains architecture-report-only and was not merged or credited as implementation.
- Aligned CI runtime from Node 20 to Node 22 because `camera-controls` required Node >=22 in the observed dependency tree.
- Added a reviewed dependency-remediation candidate job rather than weakening the security gate.
- `npm audit fix --package-lock-only` reduced the original 19 findings to the final `brace-expansion` high-severity advisory. Primary-source review of GHSA-rgw5-rvv9-x895 confirmed 2.1.4 is the patched 2.x version; package override was corrected from 2.1.3 to `2.1.4`.
- Removed the unstable `experimental.viewTransition` config after candidate typecheck exposed that the installed Next.js type surface rejected it. This removes a non-essential experimental baseline dependency rather than suppressing TypeScript.
- Added branch-only CI logic that persists the remediated `package-lock.json` only after audit/lint/typecheck/test/build all pass.
- Verified dependency-remediation job in Actions run `32037058122`: security audit PASS with 0 vulnerabilities; lint PASS with one pre-existing unused-function warning; typecheck PASS; tests PASS; build PASS; verified lockfile persistence PASS.
- Persisted lockfile commit produced by the verified job: `1d6104f03946dd4bfae48f68ce0a15a18f6369a1`.

## Implementation commits this run
- `82ea37ee1aa228fce8ff3d09c246176e89caaa28` — Node 22 CI alignment.
- `b01001e2ae17aa381698c497a702bc29855b737f` / later workflow refinements — dependency remediation candidate path.
- `93b70957d95c5bd88370b5c6d412246f7d517730` — patched `brace-expansion` 2.1.4 override.
- `714d27d3571e5d7ccac38c9bf9050dbfe069e8b8` — remove unstable viewTransition baseline config.
- `0b787d8a92a5bb111a1133e9d1db216dce7e9e2c` — persist verified dependency lock remediation workflow.
- `1d6104f03946dd4bfae48f68ce0a15a18f6369a1` — generated verified remediated lockfile.

## Recovery performed
1. Original baseline: 19 dependency vulnerabilities + Node 20 engine mismatch.
2. First auto-fix candidate: reduced to one vulnerable brace-expansion path, then identified the attempted 2.1.3 override was itself affected by the July 30, 2026 advisory.
3. Corrected to patched 2.1.4 using the maintainer advisory.
4. Candidate then reached 0 vulnerabilities but typecheck exposed `experimental.viewTransition` incompatibility.
5. Removed the non-essential experimental flag; reran audit/lint/typecheck/test/build; all candidate gates passed.
6. Persisted the verified generated lockfile on the automation branch.

## Personas/counter-case
- Companion product lead: wanted to move directly into memory/identity continuity.
- Full-stack/reliability lead: required a reproducible canonical dependency/runtime baseline first.
- Security/privacy lead: rejected ignoring audit failures or suppressing TypeScript errors; required patched-version evidence and complete regression checks.
- Counter-case: dependency automation can create a superficially green lockfile while changing transitive behavior. Decision: constrain the known advisory, run full regression gates, persist only after all candidate checks pass, then rerun exact committed head.

## Safety / legal / privacy
- No production deployment change, secret/auth/security-policy change, billing, user-data mutation, public post or main merge occurred.
- No attachment/retention manipulation, deceptive sentience, minor-targeted dependency mechanic or emotional-loss monetization was added.

## Actual screen evidence
- ACTUAL SCREEN CAPTURE BLOCKED: this cycle's G0 work is dependency/runtime/security baseline and the current CI workflow does not yet contain a verified app start + browser capture stage. Existing Vercel Preview deployment records were inspected as baseline only and are not reused as this run's screen proof.

## Blocker
- One exact committed-head baseline CI rerun is required now that the verified lockfile is actually committed. The current state write intentionally triggers that rerun. Do not mark G0 VERIFIED until committed-head `npm ci`, audit, lint, typecheck, tests and build all pass.

## Owner approval needed
- None for this non-production baseline repair. Production deployment, live secrets/auth/billing or main merge remain owner-gated.

## Exact Next Gate
1. Confirm the exact committed head containing `1d6104f...` passes `npm ci`, `npm audit --audit-level=high`, lint, typecheck, tests and build.
2. Add an exact-branch app start + real browser screenshot artifact stage and capture the canonical companion surface without production writes.
3. Only then close G0 and select G1 based on observed product/runtime evidence, prioritizing memory-state continuity and clear AI identity.

## Operating rules
- Success requires real durable implementation plus same-cycle verification, not architecture reports.
- Never weaken audit/typecheck/build gates for status cosmetics.
- Preserve privacy, consent, minor safety, emotional-dependency safeguards, anti-manipulation constraints and clear AI identity.
