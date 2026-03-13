import type { Locale } from "@/lib/i18n/config";

type Section = {
  title: string;
  body: string[];
};

type LegalDocument = {
  title: string;
  subtitle: string;
  updatedAtLabel: string;
  updatedAtValue: string;
  sections: Section[];
};

const UPDATED_AT = "2026-03-13";

export function getPrivacyPolicy(locale: Locale): LegalDocument {
  if (locale === "ko") {
    return {
      title: "개인정보처리방침",
      subtitle:
        "GYEOL은 대화, 계정, 결제, 운영 안정성에 필요한 최소한의 데이터를 수집하고, 사용자의 관계형 AI 경험을 제공하는 목적 안에서만 사용합니다.",
      updatedAtLabel: "최종 업데이트",
      updatedAtValue: UPDATED_AT,
      sections: [
        {
          title: "1. 수집하는 정보",
          body: [
            "회원가입 및 로그인 시 이메일 주소, 인증 토큰, 로그인 메타데이터를 처리할 수 있습니다.",
            "대화 기능 사용 시 사용자가 입력한 메시지, 모델 응답, 기억 임베딩, 활동 로그가 저장될 수 있습니다.",
            "결제 기능 사용 시 Stripe 등 외부 결제 제공자가 처리하는 결제 식별자와 구독 상태가 저장될 수 있습니다.",
            "운영 안정성과 보안을 위해 접속 기록, 제품 이벤트, 오류 로그, rate limit 관련 데이터가 처리될 수 있습니다.",
          ],
        },
        {
          title: "2. 이용 목적",
          body: [
            "AI 대화, 기억 회수, 성장/진화, 앨범/소셜/탐험 등 핵심 제품 경험 제공",
            "계정 인증, 보안 점검, abuse 방지, 장애 대응 및 서비스 품질 유지",
            "결제 상태 확인, 구독 권한 부여, 운영 지표 분석 및 제품 개선",
          ],
        },
        {
          title: "3. 보관 및 삭제",
          body: [
            "대화, 기억, 활동 로그는 제품 기능 제공 범위 내에서 보관됩니다.",
            "법령상 보존 의무가 있거나 보안 대응이 필요한 경우를 제외하고, 사용자의 삭제 요청 또는 계정 삭제에 따라 관련 데이터는 삭제 또는 비식별화될 수 있습니다.",
            "일부 집계형 제품 이벤트는 서비스 품질 분석을 위해 제한된 기간 동안 별도로 보관될 수 있습니다.",
          ],
        },
        {
          title: "4. 제3자 제공 및 처리 위탁",
          body: [
            "GYEOL은 서비스 제공을 위해 Supabase, Vercel, Stripe, Groq, Google Gemini, Cloudflare 등 외부 인프라/AI/결제 제공자를 사용할 수 있습니다.",
            "이들 제공자는 각자의 약관과 개인정보처리방침에 따라 데이터를 처리할 수 있습니다.",
          ],
        },
        {
          title: "5. 이용자 권리",
          body: [
            "이용자는 자신의 개인정보에 대한 열람, 정정, 삭제, 처리 제한을 요청할 수 있습니다.",
            "계정 삭제 또는 데이터 삭제 요청은 운영 연락 수단이 마련된 경우 이를 통해 접수할 수 있습니다.",
          ],
        },
        {
          title: "6. 보안",
          body: [
            "GYEOL은 인증, rate limit, 입력 검증, 비밀정보 암호화, 운영 경보 체계를 통해 서비스 보안을 유지하려고 노력합니다.",
            "다만 인터넷 기반 서비스의 특성상 완전한 보안을 절대적으로 보장할 수는 없습니다.",
          ],
        },
      ],
    };
  }

  return {
    title: "Privacy Policy",
    subtitle:
      "GYEOL processes the minimum data needed to provide conversation, memory, billing, and operational reliability for the relationship-based AI experience.",
    updatedAtLabel: "Last updated",
    updatedAtValue: UPDATED_AT,
    sections: [
      {
        title: "1. Information we process",
        body: [
          "When you sign up or log in, we may process your email address, authentication tokens, and login metadata.",
          "When you use chat features, your messages, model responses, memory embeddings, and activity logs may be stored.",
          "When you use billing features, payment identifiers and subscription state handled by providers such as Stripe may be stored.",
          "For operational reliability and security, access logs, product events, error logs, and rate-limit data may be processed.",
        ],
      },
      {
        title: "2. Why we use it",
        body: [
          "To provide core product experiences such as AI conversation, memory recall, growth/evolution, album, social, and exploration flows.",
          "To support authentication, security checks, abuse prevention, incident response, and service quality.",
          "To verify billing state, grant subscription entitlements, measure product health, and improve the service.",
        ],
      },
      {
        title: "3. Retention and deletion",
        body: [
          "Conversation, memory, and activity data are retained as needed to provide product functionality.",
          "Except where legal retention or security obligations apply, related data may be deleted or anonymized after account deletion or a valid deletion request.",
          "Some aggregated product events may be retained for a limited period for service quality analysis.",
        ],
      },
      {
        title: "4. Third-party processors",
        body: [
          "GYEOL may rely on providers such as Supabase, Vercel, Stripe, Groq, Google Gemini, and Cloudflare for infrastructure, billing, and AI functionality.",
          "Those providers may process data under their own terms and privacy policies.",
        ],
      },
      {
        title: "5. Your rights",
        body: [
          "You may request access, correction, deletion, or restriction of your personal data where applicable.",
          "Account deletion or data deletion requests can be handled through the service's support or operator contact channel when available.",
        ],
      },
      {
        title: "6. Security",
        body: [
          "GYEOL uses authentication, rate limiting, input validation, secret encryption, and operational alerts to protect the service.",
          "However, no internet-based service can guarantee absolute security in all circumstances.",
        ],
      },
    ],
  };
}

export function getTermsOfService(locale: Locale): LegalDocument {
  if (locale === "ko") {
    return {
      title: "이용약관",
      subtitle:
        "이 약관은 GYEOL 서비스 이용과 관련하여 서비스 운영자와 이용자 사이의 권리, 의무 및 책임사항을 정합니다.",
      updatedAtLabel: "최종 업데이트",
      updatedAtValue: UPDATED_AT,
      sections: [
        {
          title: "1. 서비스 목적",
          body: [
            "GYEOL은 관계형 AI 동반자 경험을 제공하는 웹 서비스입니다.",
            "서비스는 대화, 기억, 성장, 자율 활동, 시각화, 결제 및 운영 기능을 포함할 수 있습니다.",
          ],
        },
        {
          title: "2. 계정과 접근",
          body: [
            "이용자는 이메일/비밀번호, 게스트, 또는 제공되는 소셜 로그인 수단으로 서비스에 접근할 수 있습니다.",
            "운영자는 보안, abuse 방지, 법령 준수를 위해 특정 계정의 접근을 제한할 수 있습니다.",
          ],
        },
        {
          title: "3. 이용자 책임",
          body: [
            "이용자는 법령 및 사회질서에 반하는 방식으로 서비스를 사용해서는 안 됩니다.",
            "타인의 권리를 침해하거나, 시스템을 공격하거나, 비정상 트래픽을 유도하는 행위는 금지됩니다.",
          ],
        },
        {
          title: "4. AI 응답과 제한",
          body: [
            "AI 응답은 자동 생성되며 항상 정확하거나 적절함을 보장하지 않습니다.",
            "의료, 법률, 투자 등 중요한 의사결정에는 전문가 판단을 우선해야 합니다.",
          ],
        },
        {
          title: "5. 결제와 유료 기능",
          body: [
            "일부 기능은 유료 플랜 또는 외부 결제 제공자 연동을 전제로 제공될 수 있습니다.",
            "환불, 구독 해지, 청구 주기 등은 연결된 결제 제공자의 정책과 서비스 설정에 따를 수 있습니다.",
          ],
        },
        {
          title: "6. 서비스 변경 및 중단",
          body: [
            "운영자는 기능 개선, 보안 대응, 법적 요구, 인프라 사정에 따라 서비스 일부를 수정하거나 중단할 수 있습니다.",
            "베타/실험 기능은 예고 없이 변경되거나 종료될 수 있습니다.",
          ],
        },
        {
          title: "7. 면책",
          body: [
            "운영자는 천재지변, 외부 서비스 장애, 통신 장애, 이용자 귀책 등 통제 불가능한 사유로 발생한 손해에 대해 책임을 제한할 수 있습니다.",
            "서비스는 '있는 그대로' 제공되며 특정 목적 적합성이나 무오류를 보장하지 않습니다.",
          ],
        },
      ],
    };
  }

  return {
    title: "Terms of Service",
    subtitle:
      "These terms describe the rights, responsibilities, and expectations between the operator of GYEOL and its users.",
    updatedAtLabel: "Last updated",
    updatedAtValue: UPDATED_AT,
    sections: [
      {
        title: "1. Service purpose",
        body: [
          "GYEOL is a web service for relationship-based AI companion experiences.",
          "The service may include conversation, memory, growth, autonomy, visualization, billing, and operational features.",
        ],
      },
      {
        title: "2. Accounts and access",
        body: [
          "Users may access the service through email/password, guest mode, or any available social login methods.",
          "The operator may restrict access when necessary for security, abuse prevention, or legal compliance.",
        ],
      },
      {
        title: "3. User responsibilities",
        body: [
          "Users must not use the service in ways that violate law or public order.",
          "Actions that infringe the rights of others, attack the system, or generate abusive traffic are prohibited.",
        ],
      },
      {
        title: "4. AI responses and limitations",
        body: [
          "AI responses are automatically generated and are not guaranteed to always be correct, safe, or appropriate.",
          "For medical, legal, investment, or other high-stakes decisions, professional judgment should take priority.",
        ],
      },
      {
        title: "5. Billing and paid features",
        body: [
          "Some capabilities may depend on paid plans or external payment-provider integrations.",
          "Refunds, cancellations, and billing cycles may follow both product settings and the connected payment provider's policies.",
        ],
      },
      {
        title: "6. Service changes and interruption",
        body: [
          "The operator may modify, suspend, or discontinue parts of the service for improvement, security response, legal obligations, or infrastructure reasons.",
          "Beta and experimental features may change or be removed without prior notice.",
        ],
      },
      {
        title: "7. Limitation of liability",
        body: [
          "Liability may be limited where damage results from force majeure, third-party outages, connectivity failures, or user fault outside the operator's reasonable control.",
          "The service is provided on an 'as is' basis without guarantees of uninterrupted availability or fitness for a particular purpose.",
        ],
      },
    ],
  };
}
