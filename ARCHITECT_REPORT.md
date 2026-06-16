## GYEOL 시스템 아키텍처 및 무한 확장 진단 리포트

> 자동 매뉴얼 시스템, 작업 기억 시스템, 자동 품질 검사, 전문 에이전트 배치의 4대 시스템 가동 결과

### 1. [Security & Cost Efficiency]
**[Current Architecture]**
- Vercel 기반 Next.js App Router와 Supabase (Auth, PostgreSQL, Edge Functions) Serverless 구조로 설계됨.
- `middleware.ts`에서 CSP, CSRF, 세션 인증을 중앙 통제하며, `lib/economy/coins.ts`에서 `spendCoinsAtomic`, `addCoinsAtomic` RPC를 통한 원자적(Atomic) 트랜잭션으로 경제 모델의 무결성을 보장.
- API 라우트 전반에 Zod를 통한 입력 검증 및 IP/유저 단위 Rate Limiting이 적용되어 있음.

**[Vulnerabilities/Cost Waste]**
- **N+1 쿼리 및 DB I/O 병목**: 사용자 증가 시 프로필 로딩, 업적 확인 등에서 발생하는 다중 조인/N+1 쿼리는 Supabase Compute 비용의 주요 원인.
- **실시간 소켓 유지비용**: 과도한 Realtime 구독(Subscription) 채널이 켜져 있을 시 접속자 증가에 비례하여 동시 연결(Concurrency) 비용 폭증 위험.
- **불필요한 Edge/Serverless 호출**: 정적 렌더링이 가능한 데이터까지 매번 SSR/Edge에서 처리할 경우 월 10만 원 비용 제한을 초과할 수 있음.

**[Improvement Checklist]**
- [ ] 홈, 디스커버리 탭의 초기 페이로드를 Redis/Edge Cache 또는 ISR(Incremental Static Regeneration)로 극단적 캐싱.
- [ ] DB 쿼리를 단일 RPC 콜(Batched Query)로 묶어 IO 최소화.
- [ ] Realtime 채널을 필수적인 알림(결제, 생명체 진화 완료 등)으로 제한하고 일반 피드는 주기적 폴링(SWR/React Query 캐싱 활용)으로 전환.

---

### 2. [Functional Integrity]
**[Current Architecture]**
- `[Chat -> Memory Extraction -> Trait/DNA Evolution]`로 이어지는 코어 루프.
- 무중단 상태 관리(Zero-downtime State Management)를 위해 Supabase RPC `merge_agent_config`를 사용하여 병렬 요청에 의한 Read-Modify-Write Race Condition을 차단.
- OpenClaw 스케줄러(또는 Cron) 기반의 생명체 자율 활동(Background Task) 처리.

**[Vulnerabilities/Cost Waste]**
- **스케줄러 락(Lock) 경합**: 동시다발적인 Cron 트리거 시, 중복 처리로 인한 AI API 비용(LLM 토큰) 중복 지출 위험.
- **에지 케이스 롤백 부재**: 결제와 연동된 진화 과정에서 에러 발생 시 부분 상태 업데이트(Partial State)로 생명체가 영구적 결함 상태에 빠질 우려.

**[Improvement Checklist]**
- [ ] Cron Job에 분산 락(Distributed Lock, `cron-lock.ts`)이 완벽히 동작하는지 검증하고 실패 시 Fail-closed 정책 강제.
- [ ] 진화 관련 로직 전체에 트랜잭션 단위 롤백(Rollback on Error) 매커니즘 보장.
- [ ] `merge_agent_config` 활용 범위를 모든 State Mutation API로 강제 확대.

---

### 3. [Global UI/UX & Graphic State]
**[Current Architecture]**
- `React Three Fiber / WebGL`과 `Framer Motion`을 결합한 하이엔드 미니멀리즘 다크 톤(Dark Mystical) 디자인.
- `void-canvas.tsx` 및 `components/evolution-progress-bar.tsx` 등에서 입자 모션, 형태 변화(Morphing) 구현.
- `useDevicePerformance` 훅을 통해 저사양 기기에서 2D Fallback 제공.

**[Vulnerabilities/Cost Waste]**
- **WebGL/Framer Motion 오버헤드**: 리스트나 백그라운드에서 불필요한 레이아웃 애니메이션 연산으로 모바일 배터리 광탈 및 발열 발생.
- **DOM 노드 과다**: 렌더링에 관여하지 않는 숨겨진 DOM 요소들로 인한 메모리 누수.
- **초기 로딩 버벅임(Jank)**: 3D 모델(GLTF) 및 텍스처 프리로드 지연으로 초기 진입 프레임 드랍 발생.

**[Improvement Checklist]**
- [ ] 60fps 보장을 위해 Three.js 리소스 엄격한 Preload 및 캐싱(InstancedMesh 활용).
- [ ] 화면 밖(Off-screen) 컴포넌트의 WebGL 렌더링 정지(useFrame 내부 최적화) 및 DOM 가상화(Virtualization) 적용.
- [ ] 불필요한 DOM 래퍼 제거 및 CSS Transform/Opacity 외의 애니메이션 속성 금지.

---

### 4. [Monetization & Retention Hook]
**[Current Architecture]**
- **Retention**: Duolingo 스타일의 스트릭 시스템(Flame, Shield), XP/Gen Level 진행 바, 주간 리더보드, 생명체 스토리(24시간 만료).
- **Monetization**: Gyeol 코인 기반의 프리미엄 액션, 유료 아이템 구매(방향성).

**[Vulnerabilities/Cost Waste]**
- **리텐션 트리거의 파편화**: 사용자가 앱을 떠나는 순간 개입할 Push Notification 도달률 부족.
- **결제 허들(Friction)**: 무료 코인 지급과 유료 결제의 경계가 모호하여 유료 결제로의 전환율(Conversion) 하락.

**[Improvement Checklist]**
- [ ] 생명체 위기 상태(우울함, 에너지 고갈 등)를 활용한 감성적 푸시/이메일 알림 도입.
- [ ] 프리미엄(Pro/Premium) 구독에 따른 생명체 고유 스킨, 진화 희귀 옵션 락 해제 등 강력한 Paywall 배치.
- [ ] 소셜 공유(Share Cards)에 레퍼럴 코드를 강제 주입하여 바이럴 루프(Viral Loop)와 보상을 자동화.

---

### 5. [Architect's Action Plan]
**1순위 크리티컬 이슈 해결:**
1. **DB/API 비용 방어선 구축:** `rate_limits` 테이블 정리 주기 및 Edge/Redis Cache 히트율 분석. N+1 쿼리를 발생시키는 진화 프로필 로드 부분 RPC 배치화.
2. **WebGL 최적화:** 모바일 디바이스에서 발열을 유발하는 `void-canvas.tsx`의 비활성 상태 리소스 해제(Dispose) 로직 점검.
3. **결제/코인 트랜잭션 검증:** 원자적 RPC(`spendCoinsAtomic`)가 모든 아이템/행동 소비에 100% 적용되어 있는지 감사(Audit).

**글로벌 생태계 장악을 위한 제안:**
- **"진화의 증명" (NFT 없는 소유권 증명):** 사용자 데이터의 해시값을 깃허브나 퍼블릭 스토리지에 아카이빙하여, 생명체 진화 이력의 위변조 불가성을 보장. 이는 글로벌 팬덤에 강한 신뢰를 줌.
- **초개인화된 다국어 보이스(TTS):** 글로벌 시장 확장을 위해 코어 대화 로직에 Web Speech API 또는 Edge-based TTS를 결합하여 감정이 실린 보이스 인터페이스 지원.
- **무한 확장 가능한 OpenClaw 엔진 개방:** Gyeol 엔진 API를 통해 다른 서비스(예: Discord 봇, 타사 게임)에 사용자의 결(Gyeol) 생명체가 연동되도록 하여, 플랫폼 종속성을 극대화.
