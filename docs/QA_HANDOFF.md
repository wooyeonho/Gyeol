# QA 인수인계서

## 1. 이번 릴리즈 핵심 포인트

- 홈 허브 UI가 제품 톤에 맞게 정리되었습니다.
- 공유/커뮤니티/초대/설정/플랜 표면이 동일한 다크-글로우 계열 톤으로 정리되었습니다.
- 자율 루프가 다음 단계로 강화되었습니다.
  - task 우선순위 재평가
  - task 완료 후 다음 task 자동 생성
  - crawl source task 기반 라우팅
  - self_model role / identity / long-term goal 축적

## 2. QA 우선 확인 시나리오

### A. 첫 진입 / 홈

1. 로그인 후 홈 진입
2. 상단 hero, quick link, goal loop 카드가 깨지지 않는지 확인
3. goal loop 카드에서 아래가 자연스럽게 보이는지 확인
   - 현재 목표
   - 장기 방향
   - 추가 조사 포인트
4. 모바일 폭(390px 전후)에서 줄바꿈/overflow 없는지 확인

### B. 공유 페이지

1. 활동이 있는 에이전트로 공유 링크 생성
2. `/share/[slug]` 진입
3. 아래 항목이 정상 노출되는지 확인
   - 이름 / Gen / vitality
   - 총 메시지 수 / 이번 주 메시지 수
   - milestone 목록
4. 잘못된 slug 접근 시 not found UI와 홈 이동 링크 확인

### C. 커뮤니티 / 초대

1. `/community` 진입 후 카드 hover / spacing / copy 톤 확인
2. `/invite/[code]` 유효한 code 진입
3. signup CTA와 login 링크 흐름 확인
4. 잘못된 code에서 invalid 상태 UI 확인

### D. 설정 / 플랜

1. `/settings` 진입
2. 에이전트 상태 카드가 모두 보이는지 확인
3. autonomous / dream / social / performance / recap email 토글 작동 확인
4. invite 생성 후 copy 동작 확인
5. plans feature flag가 켜진 환경에서:
   - 현재 플랜
   - entitlement
   - billing portal 이동
   - `/plans` 이동
   가 모두 자연스럽게 작동하는지 확인
6. production 성격의 환경에서는 Stripe 미설정 시 mock upgrade가 열리지 않고 안내 문구만 노출되는지 확인

### E. 자율 연구 루프

1. agent_state.config.active_goal / research_focus가 있는 계정 준비
2. pending research task 생성
3. `GET /api/cron/crawl` 또는 `GET /api/cron/learner` 실행
4. 아래 결과 확인
   - 완료된 task가 `completed`로 전환
   - 새로운 pending task가 planner source로 생성
   - `config.active_goal`, `config.long_term_goal`, `config.research_focus` 갱신
   - `self_model.current_role`, `self_model.identity_statement`, `self_model.observations` 축적

## 3. 회귀 테스트 체크리스트

- 채팅 전송 / 스트리밍 응답
- 메모리 저장 및 홈 recent item 반영
- 로그인 / 로그아웃
- Supabase 세션 유지
- `/api/home/summary` 응답 200
- `/api/settings`, `/api/billing/me`, `/api/invite`, `/api/share/[slug]` 응답 200
- Stripe 미설정 환경에서도 settings / plans가 죽지 않는지 확인

## 4. 운영자가 바로 확인할 DB 필드

### `agent_state.config`

- `active_goal`
- `long_term_goal`
- `research_focus`
- `goal_updated_at`

### `agent_state.self_model`

- `current_role`
- `identity_statement`
- `observations`
- `role_history`

### `research_tasks`

- `status`
- `priority`
- `source`
- `result_summary`
- `parent_task_id`

## 5. 장애 시 먼저 볼 곳

1. `/ops`
2. `system_alerts`
3. `autonomous_logs`
4. cron 응답
   - `/api/cron/heartbeat`
   - `/api/cron/crawl`
   - `/api/cron/learner`
   - `/api/cron/lifeline`

## 6. 운영 권한 체크

- `/ops`, `/api/ops/readiness`, `/api/ops/product`는 `OPS_ADMIN_USER_IDS`에 포함된 운영자 계정만 접근 가능합니다.
- 운영 계정이 아니면 403이 정상입니다.

## 7. 릴리즈 후 24시간 관찰 포인트

- research task가 한 방향으로만 쏠리지 않는지
- self_model observation이 중복 문장만 반복하지 않는지
- home summary goal loop가 빈 값으로 오래 남지 않는지
- crawl source routing 이후 외부 fetch 지연이 급증하지 않는지
- settings / plans surface에서 모바일 클릭 오류가 없는지
