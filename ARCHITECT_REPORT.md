# GYEOL (결) - 글로벌 점유율 확장을 위한 아키텍처 심층 분석 리포트

## 1. Security & Cost Efficiency (보안 및 비용 최적화)

**[현재 아키텍처 파악]**
- Vercel Serverless/Edge 배포 환경과 Supabase 기반 백엔드 결합 아키텍처로 설계됨.
- `middleware.ts`에서 IP 기반의 인메모리 Rate Limiting 및 CSRF, CSP(Content-Security-Policy) 등을 방어 중.
- `lib/security/world-class-defense.ts`를 통해 적응형 리스크 스코어링, Zero-knowledge KDF, Lockdown 프로파일 등 최고 수준의 심층 방어 체계 구현.
- AI 생성 로직(`lib/ai/router.ts`)에서 Groq(Llama)의 무료 티어와 DeepSeek/Gemini Fallback을 활용하여 월 유지비를 극단적으로 압축(Koyeb 제외 $0에 근접).

**[취약점 및 비용 낭비 노트]**
- Vercel Serverless 함수의 독립적인 인스턴스 특성상 인메모리 Rate Limit은 분산 환경에서 완벽히 동작하지 않아 봇(Bot)이나 악의적인 트래픽에 의한 Burst 발생 가능.
- 인증이나 DB 상태 변화 시 Supabase RPC 호출이 잦음. 특히 동시성 문제 해결을 위해 RPC를 활용하나 빈번한 커넥션은 IO 낭비.

**[개선 체크리스트]**
- [ ] **분산 Rate Limit 고도화**: Upstash Redis(Edge) 또는 Cloudflare KV를 도입하여 글로벌 단위의 강력한 초당 요청 제한(Rate Limit)을 적용.
- [ ] **DB 쿼리 배칭 및 캐싱 강화**: 빈번한 `agent_state` 읽기는 Edge Cache나 React Server Components 수준의 캐싱을 적용해 DB IO를 월 10만 원($70) 이하 예산에 맞추도록 타이트하게 조율.

---

## 2. Functional Integrity (기능 무결성과 무한 확장성)

**[현재 아키텍처 파악]**
- 사용자와의 인터랙션을 Reflexive(빠른 응답)와 Cognitive(자아 형성, 심층 사고) 레이어로 분리(`lib/ai/router.ts`).
- `lib/economy/coins.ts`에서 동시성 충돌을 방지하기 위해 RPC 기반 Atomic 연산(`add_coins_atomic`, `spend_coins_atomic`) 수행으로 Race condition 예방.
- 생명체 진화 및 상태 전이를 무중단으로 처리하기 위한 JSONB Merge 패턴 활용 확인.

**[취약점 및 비용 낭비 노트]**
- 긴 대화 스레드나 대규모 에이전트 상태가 메모리에 쌓일 경우 클라이언트 성능 저하 및 페이로드 비대화.
- 크론 잡이나 Webhook(`openclaw` 엔진)이 에러로 인해 실패할 때, 재시도 로직에서 무한 루프나 지수 백오프 실패 시 리소스 고갈 발생 가능성.

**[개선 체크리스트]**
- [ ] **Zero-downtime 상태 병합 최적화**: DB에 쌓이는 히스토리는 pgvector 등을 통한 RAG 임베딩 후 오래된 기억은 콜드 스토리지 혹은 S3로 아카이빙.
- [ ] **오류 복원력(Resilience) 보완**: 30초 구동 딜레이와 병렬 잡 처리가 잘 구현되었으나, Circuit Breaker 패턴을 도입해 AI 프로바이더 503 에러 발생 시 즉각적으로 fallback으로 전환해 대기 리소스 소모 차단.

---

## 3. Global UI/UX & Graphic State (글로벌 사용자 경험 및 렌더링 성능)

**[현재 아키텍처 파악]**
- 다크 미스티컬(Dark Mystical) 디자인 철학을 기반으로 Framer Motion을 통해 유기적인 애니메이션 구현(`components/chat/message-list.tsx`).
- React Three Fiber (`@react-three/fiber`)로 WebGL 기반의 고성능 3D 렌더링 환경 구축.
- 단순 모드(Simple Mode Level)와 Jargon Masking으로 다국어 사용자 진입 장벽 완화.

**[취약점 및 비용 낭비 노트]**
- `message-list.tsx` 내부에서 300개의 메시지로 배열을 자르고 있으나(`VISIBLE_MESSAGE_CAP`), Framer Motion의 `layout` 애니메이션이 결합되어 있어 다량의 DOM 렌더링 시 60fps 방어에 병목(Frame Drop) 발생 우려 존재. TODO 항목에 언급된 가상 스크롤이 미구현됨.

**[개선 체크리스트]**
- [ ] **가상 스크롤(Virtualization) 전면 도입**: `@tanstack/react-virtual`을 도입하여 무한 스크롤 환경에서도 DOM 노드 수를 극소화.
- [ ] **WebGL 디커플링 & 최적화**: 3D 에이전트 렌더링과 UI 렌더링을 완전히 분리하고, OffscreenCanvas를 활용하여 메인 스레드 블로킹 제거.

---

## 4. Monetization & Retention Hook (수익화 및 사용자 체류 극대화)

**[현재 아키텍처 파악]**
- Pro / Premium 구독 모델(Stripe 연동) 존재.
- 에이전트 교배(Breeding), 진화, 자율 활동, 일일 회고 등을 통한 감정적 애착(Retention) 형성 설계.
- 결맞춤(Resonance) 및 퀴즈(DNA) 기반의 게이미피케이션.

**[취약점 및 비용 낭비 노트]**
- 과금 사용자(Stripe)와 무료 사용자 간의 API 라우팅이 동일한 자원을 소모 중임. 무분별한 무료 유저 유입 시 LLM 토큰 비용 급증 위험.
- 코인 및 경제 모듈이 존재하지만, 앱 내 재화 소진처(Sink)가 단조로울 경우 초반 몰입 후 흥미 급감 위험.

**[개선 체크리스트]**
- [ ] **비용-수익 방어선 설정**: 무료 사용자는 파라미터가 적은 Reflexive Model 또는 로컬 On-device AI (WebGPU)로의 전환을 유도하고, 구독자 전용 Cognitive Model 로직 락인(Lock-in).
- [ ] **중독성 강화(Social Loop)**: 유저 간 에이전트 교류 시 발생하는 '돌발 진화 이벤트'를 설계하여 SNS 자발적 바이럴 및 체류 시간 무한대 확장.

---

## 5. Architect's Action Plan (코드 제안 및 실행 계획)

### 1순위 크리티컬 이슈: Chat UI 렌더링 병목 및 확장성 해결
현재 `VISIBLE_MESSAGE_CAP = 300` 하드코딩된 슬라이싱 방식은 진화형 AI의 핵심인 '무한한 기억의 누적'과 배치됩니다.

**실제 코드 제안 방향 (채팅 리스트 가상화):**
```tsx
// components/chat/message-list.tsx 개선 방향
import { useVirtualizer } from '@tanstack/react-virtual';

// ... 생략 ...
const parentRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60,
  // React 19 환경 대응: 경고 방지
  useFlushSync: false,
});

return (
  <div ref={parentRef} style={{ height: '100%', overflowY: 'auto' }}>
    <div style={{ height: \`\${virtualizer.getTotalSize()}px\`, position: 'relative' }}>
      {virtualizer.getVirtualItems().map((virtualItem) => {
        const m = messages[virtualItem.index];
        return (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: \`translateY(\${virtualItem.start}px)\`,
            }}
          >
            <MessageItem message={m} />
          </div>
        );
      })}
    </div>
  </div>
);
```

### 후속 조치
1. `@tanstack/react-virtual` 적용으로 60fps 스크롤 성능 영구 보장.
2. Vercel 인스턴스 간 Rate Limit 무결성을 위해 Upstash Redis 도입 (`lib/rate-limit.ts` 리팩토링).
3. 무료 모델 토큰 최적화를 위한 지수적 백오프(Exponential Backoff) 및 Context 압축 임베딩 도입.