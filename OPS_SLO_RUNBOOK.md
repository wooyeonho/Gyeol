# GYEOL 운영 SLO/장애대응 런북 (비개발자용)

## 1) 목표(SLO)

- 자율활동 건강점수(Autonomy Health Score): **85점 이상 유지**
- Stale heartbeat(6h): **전체 에이전트의 20% 미만**
- Stale dream(24h): **전체 에이전트의 30% 미만**
- stale cron jobs(24h): **전체 핵심 크론의 25% 미만**
- Critical 경보: **0건 유지** (최근 24시간)

## 2) 어디서 확인하나요?

- 공개 지표: `/dashboard`
- 운영 상세(로그인 필요): `/ops`

## 3) 경보 등급

- `healthy`: 정상
- `warning`: 관찰 필요 (당장 중단은 아님)
- `critical`: 즉시 조치 필요

## 4) 장애 발생 시 자동 복구 정책

- `lifeline` 크론이 오래 멈춘 잡을 자동으로 재트리거합니다.
- 자동 복구 실패 시 `system_alerts`에 `JOB_TRIGGER_FAILED` 경보가 남습니다.
- 자동 복구 성공 시 `JOB_RECOVERED` 이벤트가 기록됩니다.
- `OPS_ALERT_SLACK_WEBHOOK_URL`가 설정되어 있으면 critical 경보를 Slack으로도 전송합니다.
- `EMAIL_API_URL` + `OPS_ALERT_EMAIL_TO`가 설정되어 있으면 critical 경보를 이메일로도 전송합니다.

## 5) 수동 점검 체크리스트 (결제 제외 상용 점검)

매일 1회:

1. `/ops`에서 Autonomy Health Score 확인 (85 이상)
2. `환경변수 준비 상태`에서 누락 항목 확인
3. `최근 시스템 경보`에 critical 존재 여부 확인
4. `/dashboard`에서 stale heartbeat / stale dream 급증 여부 확인

배포 직후:

1. `/api/cron/health` 수동 호출 응답 확인
2. `/api/cron/lifeline` 수동 호출 응답 확인
3. `/ops`에서 권장 액션(recommendations) 항목이 줄었는지 확인

## 6) Fail-Open / Fail-Closed 정책

| 컴포넌트 | 기본값 | 환경변수 | closed 시 동작 |
|----------|--------|----------|----------------|
| Cron Lock | open | `CRON_LOCK_FAIL_MODE=closed` | DB/RPC 오류 시 잡 실행 차단 |
| Rate Limit | open | `RATE_LIMIT_FAIL_MODE=closed` | DB 오류 시 요청 거부 |

- **open**: 장애 시 서비스 연속성 우선 (락/레이트제한 실패 시 허용)
- **closed**: 장애 시 보수적 차단 (락/레이트제한 실패 시 거부)

프로덕션에서 더 엄격한 운영을 원하면 `closed`로 설정하세요.

## 7) 환경변수는 나중에 입력해도 됩니다

현재 코드는 환경변수 누락을 운영 화면에서 `미설정`으로 보여주고,
설정 전에는 해당 기능을 안전하게 제한(fail-closed)합니다.
