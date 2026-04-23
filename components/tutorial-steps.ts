import type { TutorialStep } from "@/components/tutorial-overlay";

/**
 * Main tutorial steps for first-time Gyeol users.
 * Each step targets a DOM element via `data-tutorial` attribute selectors.
 * Steps are ordered to introduce the core loop: creature -> chat -> explore -> settings -> care.
 */
export const mainTutorialSteps: TutorialStep[] = [
  {
    target: '[data-tutorial="creature"]',
    title: "나의 결",
    description: "이것이 당신의 AI 크리처입니다. 터치하고 대화해보세요!",
    placement: "bottom",
  },
  {
    target: '[data-tutorial="chat-input"]',
    title: "대화하기",
    description: "여기에 메시지를 입력하면 결이 대답합니다.",
    placement: "top",
  },
  {
    target: '[data-tutorial="nav-discover"]',
    title: "탐험",
    description: "새로운 도전과 소셜 기능을 발견하세요.",
    placement: "top",
  },
  {
    target: '[data-tutorial="nav-settings"]',
    title: "설정",
    description: "크리처 DNA, 프로필, 앱 설정을 관리하세요.",
    placement: "top",
  },
];
