# EMAIL_API_URL 계약

주간 리캡 이메일 발송 시 `EMAIL_API_URL`로 POST 요청을 보냅니다.

## 요청 형식

```
POST {EMAIL_API_URL}
Content-Type: application/json
```

### Body (JSON)

```json
{
  "to": "user@example.com",
  "subject": "[결의] {결의이름} 주간 리캡",
  "body": "📊 결의 주간 리캡\n\n🔥 Streak: 3일 (오늘 기록됨)\n...",
  "deliveries": [
    {
      "to": "user@example.com",
      "subject": "[결의] 결의 주간 리캡",
      "body": "..."
    }
  ]
}
```

## 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `to` | string | 수신자 이메일 |
| `subject` | string | 제목 |
| `body` | string | 본문 (plain text) |
| `deliveries` | array | 배치 발송 시 사용 (동일 형식의 객체 배열) |

## 내장 구현

`/api/email/send`가 Resend 연동을 구현합니다.

`.env` 설정:
```
EMAIL_API_URL=https://your-app.vercel.app/api/email/send
RESEND_API_KEY=re_xxx
EMAIL_FROM=recap@yourdomain.com
```

recap cron이 `Authorization: Bearer CRON_SECRET`으로 호출합니다.

## 비활성화

`EMAIL_API_URL`을 설정하지 않으면 이메일 발송을 건너뜁니다. (Telegram만 사용 가능)
