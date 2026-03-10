# API / B2B 전략

## 현재 v1 API

| 엔드포인트 | 메서드 | 설명 | 인증 |
|------------|--------|------|------|
| `/api/v1/agent/create` | POST | 에이전트 생성 | `GYEOL_ENGINE_API_KEY` |
| `/api/v1/agent/chat` | POST | 채팅 (body: `agent_id`, `message`) | Bearer API Key |
| `/api/v1/agent/state` | GET | 상태 조회 (`?agent_id=...`) | Bearer API Key |
| `/api/v1/agent/memory` | POST | 메모리 추가 (body: `agent_id`, `content`, `type`) | Bearer API Key |

인증: `Authorization: Bearer <GYEOL_ENGINE_API_KEY>` 또는 `api_keys` 테이블 기반 키.

## v1.1 (구현됨)

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/v1/agent/list` | GET | `?user_id=...` 사용자별 에이전트 목록 |
| `/api/v1/agent/artifacts` | GET | `?agent_id=...&limit=20` 아티팩트 목록 |

호출 시 `product_events`에 `v1_api_call` 이벤트 기록.

## 확장 방향

1. Webhook: 이벤트 푸시 (evolution, artifact_creation 등)

2. **B2B**
   - 팀/오거나이제이션 단위 플랜
   - API 키별 rate limit, usage 추적
   - 화이트라벨/커스텀 도메인

3. **파트너 연동**
   - Zapier/Make 앱
   - Slack/Notion 봇 SDK
   - 공식 파트너 API 키 발급 프로세스

## 우선순위

1. v1 안정화 및 문서화 (OpenAPI/Swagger)
2. Usage/analytics 훅 (product_events 활용)
3. 팀 플랜 스키마 설계
