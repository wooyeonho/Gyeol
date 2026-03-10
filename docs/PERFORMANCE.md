# 성능 최적화 가이드

## 현재 적용

- **3D/Canvas**: `void-canvas`에서 모바일 시 파티클 수 50% 감소, `prefers-reduced-motion` 시 파티클 비활성화
- **동적 로딩**: `VoidCanvasInner`는 `dynamic(ssr: false)`로 클라이언트 전용 로드
- **모바일 뷰포트**: `viewport` 메타로 `device-width`, `initial-scale=1` 설정

## 권장 추가 작업

1. **이미지**: `loading="lazy"`, `decoding="async"` 적용
2. **폰트**: `next/font`로 폰트 최적화
3. **번들**: 페이지별 코드 스플리팅 확인
4. **저사양**: `navigator.hardwareConcurrency` 기반 워커/쓰레드 수 조절
