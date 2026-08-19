# GYEOL AUTOMATION STATE

## Canonical lane
- Portfolio axis: Portfolio A
- Canonical registry: For-Ai; Yeogie; 한끼안부; 계절·24절기(+사주); GYEOL. No retirement or omission.
- Repository: `wooyeonho/Gyeol`
- Automation branch: `automation/hourly-operator`
- Production/main write policy: NEVER write or merge to `main` automatically.
- Owner definition lock: GYEOL is a genuinely self-growing AI companion/pet with persistent memories, traits/personality parameters, skills/capabilities, relationship state, learned preferences/routines and versioned development history. Old local fact-registry identity is superseded/non-canonical. Growth must remain explicit, bounded, observable, explainable, correctable, forgettable/resettable/exportable; no deceptive sentience, emotional blackmail, coercive dependency or unauthorized personal-data learning.

## RUN
- RUN_TS: 2026-08-19 14:47 KST
- RUN_ID: PA-20260819-1447-KST-01
- Selected project: GYEOL
- Rotation: next project `For-Ai`.
- Registry status: ACTIVE; five-project round-robin reconciled and preserved.
- Status: ARTIFACT CREATED / VERIFICATION-PENDING — bounded owner-facing memory metadata/reset/fresh-generation contracts and a deterministic regression are durably committed; exact-head CI execution is triggered/configured but its conclusion/artifact is not observable through the connected GitHub surface in this run, so no SUCCESS or stale PASS is claimed.

## Current Gate
Provide a bounded owner correction/reset/export contract that exposes generation/revision/history metadata without exporting deleted/private memory contents, while preserving explicit consent for fresh-generation restart.

## Personas / strongest counter-case
- Companion Product Lead: owners need understandable reset/export controls before deeper autonomous growth features are credible.
- Distributed Memory Engineer: reset and restart must remain generation/revision-bound so stale writers cannot regain authority.
- Safety/Privacy Lead: export should default to metadata-only; deleted/private memory content must not leak through owner-control telemetry or proof artifacts.
- Strongest counter-case: a metadata-only export is intentionally conservative and not yet a full user data portability export; exposing raw memory contents would require a separate consent/privacy design and should not be smuggled into this gate.

## Actual work
- Read all five latest Portfolio A project states and reconciled canonical order. Latest pointer from 계절·24절기 selects GYEOL, so no project was skipped.
- Added `lib/identity/memory-owner-controls.mjs` with bounded metadata summary/export, revision+generation-bound reset delegation, and consent-required fresh-generation delegation.
- Added `scripts/test-memory-owner-controls.mjs` proving exported metadata excludes private memory IDs/text, reset carries exact revision/generation, and fresh-generation restart requires explicit consent.
- Updated `.github/workflows/ci.yml` to execute the owner-controls regression, retain `artifacts/memory-owner-controls.txt`, require PASS/privacy/consent markers, and co-retain it with PostgreSQL CAS output and real desktop/mobile Chromium screenshots.

## Durable artifacts
- Owner-controls module commit: `4eb796000ec7364f77377a0fe8b8adc4b7486841`.
- Regression commit: `76c25a1e311183d85093fd6f4c75fd9178deaded`.
- CI exact-head proof wiring commit: `92063b6475bc25b1159063c09bbfde7a1540c702`.
- Branch: `automation/hourly-operator`.

## Verification
- GitHub durable write/read contract: PASS for the new module, regression, and CI configuration.
- Static contract review: PASS — metadata export contains only AI identity, generation, revision, consent, revoked, memoryCount; raw memory array/content is excluded.
- Reset delegation is explicitly revision+generation-bound; fresh generation requires `consent === true`.
- Fresh exact-head executable/CI result for `92063b64`: VERIFICATION-PENDING. The connected GitHub fetch surface rejects Actions-runs/check-runs retrieval for this repository, so no older PASS is reused.

## Screen evidence
- CI remains configured to capture real `artifacts/gyeol-desktop.png` and `artifacts/gyeol-mobile.png` and now co-retains owner-controls + PostgreSQL proof text.
- `ACTUAL SCREEN CAPTURE PENDING`: fresh artifact tied to exact head `92063b64` is not observable through the connected surface. No generated or stale screenshot is substituted.

## QA / security / privacy / legal / IP / accessibility
- QA: deterministic regression plus fail-closed CI marker checks added.
- Security/privacy: metadata-only export intentionally excludes private/deleted memory contents; synthetic fixtures only; reset/restart preserve generation/revision and explicit consent boundaries.
- Legal/IP: project-owned code/fixtures only; no external copying, public posting, outreach, spending, account creation, production/main write or production auth/security mutation.
- Accessibility: no rendered UI semantics changed in this backend owner-control contract step; existing mobile/desktop capture remains required for exact-head proof.

## Blocker
`BLOCKED_SOURCE_ACCESS`: fresh exact-head Actions conclusion/artifact for `92063b6475bc25b1159063c09bbfde7a1540c702` is not observable through the connected GitHub surface during this run.

## Owner approval needed
None for branch-only owner-control/test/CI work. Production persistence/schema/auth changes and any raw-memory export UX remain separately owner-gated/reviewed.

## Exact Next Gate
Next project is `For-Ai` by canonical rotation. On the next GYEOL turn, obtain exact-head CI/artifact for `92063b64`; require owner-controls PASS + PostgreSQL CAS PASS + real desktop/mobile screenshots. If PASS, bind the bounded metadata/reset contract to a branch-only owner UI/API surface with accessibility and authorization regression, without exposing deleted/private memory contents.
