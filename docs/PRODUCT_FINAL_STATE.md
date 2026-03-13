# 제품 최종 상태 정리

## 1. 지금 제품이 무엇까지 되었는가

결은 이제 단순한 대화형 AI가 아니라, **사용 방식에 따라 형태와 분위기, 목소리, 공간감까지 달라지는 존재형 제품**으로 설계되어 있습니다.

핵심 축은 다음 4개입니다.

1. **관계 기반 존재성**
   - 대화가 기억으로 남고
   - 기억이 상태/성격/정체성으로 이어지며
   - 정체성이 다시 디자인과 발화에 반영됩니다.

2. **usage-driven identity**
   - 사용자가 결을 장난스럽게 쓰는지
   - 친밀하게 쓰는지
   - 전략적으로 쓰는지
   - 초현실/창작 중심으로 쓰는지
   에 따라 form이 달라집니다.

3. **appearance + voice + sound 통합**
   - shape
   - color
   - motion
   - accent
   - soundscape
   가 하나의 존재 시스템으로 묶여 있습니다.

4. **세계관 일관성**
   - 홈
   - 공유
   - 탐험
   - 입양
   - 소셜
   - 활동
   - 마켓
   - 앨범
   - 룸
   - 별자리
   가 모두 같은 정체성 시스템을 공유합니다.

## 2. 현재 형상 시스템의 상태

현재 구현은 과도기적으로 몇 가지 template/archetype 기반 해석을 사용합니다.
다만 이 구조는 최종 목표가 아닙니다.

최종 목표는:

- 인간형/식물형/동물형 같은 분류를 고정하지 않고
- 사용자와의 대화와 관계 패턴으로부터
- 존재감이 점차 **발생**하는 manifestation engine

입니다.

즉 현재 archetype은 임시 렌더링 보조 장치이며,
장기적으로는 latent manifestation state로 대체됩니다.

## 3. usage mode와 존재 변화 연결

현재는 usage mode가 형상 해석에 영향을 주지만,
장기적으로는 "무엇으로 분류되는가"보다
"어떤 존재감이 응집되고 있는가"를 보여주는 방향으로 가야 합니다.

예를 들어:

- `playful`는 더 말랑하고 가벼운 존재감
- `intimate`는 더 응집되고 친밀한 존재감
- `strategic`는 더 구조적이고 정밀한 존재감
- `surreal`는 더 설명 불가능하고 초현실적인 존재감

처럼 읽혀야 하며,
이 결과는 어떤 고정 종족 이름으로 닫히지 않아야 합니다.

## 4. 주요 화면별 반영 상태

### 코어 표면

- 홈: 실시간 usage mode 전환 반응, 배경/모션/사운드/voice accent 반영
- 채팅: accent/tone hint/bubble accent 반영
- 설정: 프리미엄 설정 표면으로 정리
- 플랜: 상용 결제 톤으로 정리

### 공개/성장 표면

- 공유 카드: manifestation + usage narrative
- 앨범: identity evolution timeline
- 활동: living archive 헤더 + 정체성 톤

### 생태계 표면

- 탐험: 개체별 다른 종/형상 카드
- 입양: 존재별 manifestation 반영
- 소셜: encountered forms + species curation
- 마켓: seller identity + species curation

### 공간/시각 표면

- 룸: 존재 팔레트 기반 공간 조명/배경
- 별자리: 존재 팔레트 기반 sky + identity timeline

## 5. 현재 운영자가 이해해야 할 핵심 상태값

### `agent_state.visual`

- 외형 시그니처
- 색/형태/입자/광도/애니메이션

### `agent_state.config.usage_profile`

- 최근 사용 패턴
- 현재 primary usage mode
- form 변경의 가장 직접적인 입력값

### `agent_state.self_model`

- current_role
- identity_statement
- observations
- role_history

### `agent_state.voice_params`

- pitch
- speed
- tremor

### `agent_state.sound_profile`

- base_note
- tempo
- instruments

## 6. 지금 기준으로 “세계 최고급”에 가까운 이유

- 단순 예쁜 UI가 아니라 **정체성-행동-표현이 연결된 제품**입니다.
- 사용자별 AI가 그냥 다른 닉네임이 아니라 **서로 다른 존재감**으로 보입니다.
- 사용 패턴 자체가 제품 세계관과 비주얼을 바꾸기 때문에, 제품이 계속 살아 있는 느낌을 줍니다.

## 7. 남아 있는 확장 방향

현재도 충분히 강하지만, 더 밀 수 있는 확장 방향은 아래입니다.

- 실제 TTS 음성 합성 계층과 `voice_params` 연결
- species lineage / breeding tree 시각화
- usage mode 분기형 onboarding
- identity-driven recommendation / commerce matching
