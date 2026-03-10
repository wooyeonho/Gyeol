/**
 * Builds weekly recap content for external delivery (email, Telegram).
 * Reuses logic from home/summary for consistency.
 */

function dayKey(value: string) {
  return value.slice(0, 10);
}

function countStreakDays(activityDates: string[]) {
  if (activityDates.length === 0) return { streakDays: 0, todayActive: false };
  const uniqueDays = [...new Set(activityDates.map(dayKey))].sort((a, b) => (a > b ? -1 : 1));
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const latest = uniqueDays[0];
  const latestDate = new Date(`${latest}T00:00:00.000Z`);
  const todayDate = new Date(`${todayKey}T00:00:00.000Z`);
  const diffDays = Math.floor((todayDate.getTime() - latestDate.getTime()) / 86400000);
  if (diffDays > 1) return { streakDays: 0, todayActive: false };
  let streakDays = 0;
  let cursor = latestDate;
  const uniqueSet = new Set(uniqueDays);
  while (uniqueSet.has(cursor.toISOString().slice(0, 10))) {
    streakDays += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return { streakDays, todayActive: uniqueSet.has(todayKey) };
}

function buildWeeklyHighlight(params: {
  artifactCount: number;
  milestoneCount: number;
  userMessageCount: number;
}) {
  if (params.milestoneCount > 0) return "이번 주에는 마일스톤이 생겼습니다. 앨범에서 꼭 다시 확인해보세요.";
  if (params.artifactCount > 0) return "이번 주에는 새로운 생성물이 남았습니다. 활동에서 결과물을 돌아보세요.";
  if (params.userMessageCount >= 7) return "이번 주 대화가 충분히 쌓였습니다. 결의 반응 패턴이 더 선명해지고 있습니다.";
  if (params.userMessageCount > 0) return "이번 주 대화의 흐름이 이어지고 있습니다. 한 번 더 체크인하면 streak가 단단해집니다.";
  return "이번 주 첫 대화를 시작하면 활동과 앨범, 리텐션 루프가 다시 열립니다.";
}

function buildNextAction(params: {
  isFirstSession: boolean;
  streakDays: number;
  todayActive: boolean;
  weeklyMessageCount: number;
}) {
  if (params.isFirstSession) return "첫 메시지 한 번이면 기억, 활동, 앨범이 동시에 열립니다.";
  if (!params.todayActive) return "오늘의 짧은 체크인 한 번으로 streak를 이어가세요.";
  if (params.weeklyMessageCount < 3) return "이번 주 한 번 더 대화하면 결의 변화가 더 분명해집니다.";
  if (params.streakDays >= 3) return "지금은 앨범과 활동에서 이번 주 흐름을 다시 보는 것이 좋습니다.";
  return "최근 변화 카드 중 하나를 열어 오늘의 흐름을 이어가세요.";
}

export type WeeklyRecapInput = {
  agentId: string;
  selfName: string;
  totalMessages: number;
  weekUserMessages: number;
  weekArtifacts: number;
  weekMilestones: number;
  todayUserMessages: number;
  todayActivities: number;
  activityDates: string[];
  hasAdvancedRecaps: boolean;
};

export function buildWeeklyRecapText(input: WeeklyRecapInput): string {
  const { streakDays, todayActive } = countStreakDays(input.activityDates);
  const highlight = input.hasAdvancedRecaps
    ? buildWeeklyHighlight({
        artifactCount: input.weekArtifacts,
        milestoneCount: input.weekMilestones,
        userMessageCount: input.weekUserMessages,
      })
    : "주간 하이라이트는 Pro 이상 플랜에서 확인할 수 있습니다.";
  const nextAction = input.hasAdvancedRecaps
    ? buildNextAction({
        isFirstSession: input.totalMessages === 0,
        streakDays,
        todayActive,
        weeklyMessageCount: input.weekUserMessages,
      })
    : "오늘의 짧은 체크인으로 다시 루프를 시작해보세요.";

  const lines: string[] = [
    `📊 ${input.selfName || "결의"} 주간 리캡`,
    "",
    `🔥 Streak: ${streakDays}일 ${todayActive ? "(오늘 기록됨)" : ""}`,
    `📝 오늘: 메시지 ${input.todayUserMessages} · 활동 ${input.todayActivities}`,
    `📅 이번 주: 대화 ${input.weekUserMessages} · 아티팩트 ${input.weekArtifacts} · 마일스톤 ${input.weekMilestones}`,
    "",
    highlight,
    "",
    `👉 ${nextAction}`,
    "",
    "앱에서 더 보기 →",
  ];
  return lines.join("\n");
}

export function buildDailyRecapText(input: {
  selfName: string;
  streakDays: number;
  todayActive: boolean;
  todayUserMessages: number;
  todayActivities: number;
  nextAction: string;
}): string {
  const lines: string[] = [
    `☀️ ${input.selfName || "결의"} 오늘의 체크인`,
    "",
    `Streak ${input.streakDays}일 ${input.todayActive ? "· 오늘 이미 기록됨 ✓" : ""}`,
    `메시지 ${input.todayUserMessages} · 활동 ${input.todayActivities}`,
    "",
    input.nextAction,
    "",
    "앱에서 대화하기 →",
  ];
  return lines.join("\n");
}
