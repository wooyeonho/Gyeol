import type {
  ApprovalItem,
  AutonomousModeState,
  CaptureItem,
  CaptureSource,
  EvolutionFocus,
  EvolutionQuest,
  PromiseItem,
  PromisePriority,
  PromiseRisk,
  RelationshipAlert,
  RelationshipBriefing,
  RelationshipOSSnapshot,
  RelationshipProfile,
  StoryEpisode,
  StoryMood,
} from "@/lib/relationship-os/types";

function isoAt(daysOffset: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function dueLabel(iso: string): string {
  const now = new Date();
  const due = new Date(iso);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / 3600000);
  if (diffHours <= 0) return "지금";
  if (diffHours <= 24) return `${diffHours}시간 내`;
  const diffDays = Math.ceil(diffHours / 24);
  return `${diffDays}일 내`;
}

function hoursSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
}

function nextRunIso(minutes: number): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function riskScore(risk: PromiseRisk): number {
  if (risk === "high") return 3;
  if (risk === "medium") return 2;
  return 1;
}

function nextOccurrence(dayIndex: number): string {
  const now = new Date();
  const current = now.getDay();
  const delta = (dayIndex - current + 7) % 7 || 7;
  const due = new Date(now);
  due.setDate(now.getDate() + delta);
  due.setHours(10, 0, 0, 0);
  return due.toISOString();
}

function inferDueAt(text: string): string {
  const normalized = text.toLowerCase();
  if (normalized.includes("오늘")) return isoAt(0, 18);
  if (normalized.includes("내일")) return isoAt(1, 10);
  if (normalized.includes("이번 주")) return isoAt(3, 16);
  if (normalized.includes("다음 주")) return isoAt(7, 10);
  if (normalized.includes("월요일")) return nextOccurrence(1);
  if (normalized.includes("화요일")) return nextOccurrence(2);
  if (normalized.includes("수요일")) return nextOccurrence(3);
  if (normalized.includes("목요일")) return nextOccurrence(4);
  if (normalized.includes("금요일")) return nextOccurrence(5);
  return isoAt(1, 15);
}

function inferRisk(text: string, person?: RelationshipProfile): PromiseRisk {
  const normalized = text.toLowerCase();
  if (normalized.includes("꼭") || normalized.includes("중요") || normalized.includes("급") || normalized.includes("마감")) {
    return "high";
  }
  if (person && person.trustScore < 70) return "high";
  if (normalized.includes("보내") || normalized.includes("답장") || normalized.includes("확인")) return "medium";
  return "low";
}

function inferCategory(text: string): PromiseItem["category"] {
  const normalized = text.toLowerCase();
  if (normalized.includes("자료") || normalized.includes("초안") || normalized.includes("정리")) return "deliverable";
  if (normalized.includes("답장") || normalized.includes("안부") || normalized.includes("연락")) return "relationship";
  if (normalized.includes("일정") || normalized.includes("미팅") || normalized.includes("회의")) return "planning";
  return "follow_up";
}

function inferSource(text: string, source?: CaptureSource): CaptureSource {
  if (source) return source;
  const normalized = text.toLowerCase();
  if (normalized.includes("회의") || normalized.includes("meeting")) return "meeting";
  if (normalized.includes("메일") || normalized.includes("email")) return "email";
  if (normalized.includes("메신저") || normalized.includes("dm")) return "chat";
  return "quick_note";
}

function compactTitle(text: string): string {
  const line = text.split(/[.!?\n]/)[0]?.trim() ?? text.trim();
  return line.length > 54 ? `${line.slice(0, 54)}...` : line;
}

function matchProfile(text: string, profiles: RelationshipProfile[]): RelationshipProfile | undefined {
  const normalized = text.toLowerCase();
  return profiles.find((profile) => normalized.includes(profile.name.toLowerCase()));
}

function buildDraft(profile: RelationshipProfile | undefined, text: string): string {
  const normalized = text.toLowerCase();
  const opener = profile ? `${profile.name}님,` : "안녕하세요,";
  if (normalized.includes("자료") || normalized.includes("보내")) {
    return `${opener} 약속드린 자료를 정리해서 공유드립니다. 확인하시고 필요한 부분 있으면 바로 이어서 맞추겠습니다.`;
  }
  if (normalized.includes("답장") || normalized.includes("안부")) {
    return `${opener} 늦게 답장드려 죄송해요. 지금 확인했고, 오늘 안에 이어서 정리해드릴게요.`;
  }
  if (normalized.includes("일정") || normalized.includes("미팅")) {
    return `${opener} 말씀 나눴던 일정 관련해서 제가 가능한 시간 정리해 보냈어요. 편한 시간으로 확정해주시면 맞추겠습니다.`;
  }
  return `${opener} 방금 메모한 내용을 기준으로 제가 다음 액션을 정리하고 다시 공유드릴게요.`;
}

function buildPromisePriority(promise: PromiseItem, profiles: RelationshipProfile[]): PromisePriority {
  const profile = promise.personId ? profiles.find((item) => item.id === promise.personId) : undefined;
  return {
    id: promise.id,
    title: promise.title,
    personName: profile?.name ?? "내 일정",
    risk: promise.risk,
    dueLabel: dueLabel(promise.dueAt),
    suggestedMessage: promise.suggestedMessage,
  };
}

function buildAlerts(profiles: RelationshipProfile[], promises: PromiseItem[]): RelationshipAlert[] {
  return profiles
    .map((profile) => {
      const openCount = promises.filter((item) => item.personId === profile.id && item.status !== "done").length;
      if (openCount === 0 && profile.trustScore >= 75) return null;
      const urgency: PromiseRisk = openCount >= 2 || profile.trustScore < 68 ? "high" : openCount === 1 ? "medium" : "low";
      const reason =
        openCount > 0
          ? `${openCount}개의 후속조치가 남아 있습니다.`
          : `${profile.name}과의 접점이 끊기기 전에 짧은 안부가 필요합니다.`;
      return {
        profileId: profile.id,
        name: profile.name,
        reason,
        urgency,
      };
    })
    .filter((item): item is RelationshipAlert => Boolean(item))
    .sort((a, b) => riskScore(b.urgency) - riskScore(a.urgency))
    .slice(0, 3);
}

function getOpenPromises(snapshot: RelationshipOSSnapshot): PromiseItem[] {
  return snapshot.promises.filter((item) => item.status !== "done");
}

function inferCurrentFocus(snapshot: RelationshipOSSnapshot): EvolutionFocus {
  const openPromises = getOpenPromises(snapshot);
  const highRisk = openPromises.filter((item) => item.risk === "high").length;
  const overdue = openPromises.filter((item) => new Date(item.dueAt).getTime() <= Date.now()).length;
  const pendingApprovals = snapshot.approvals.filter((item) => item.status === "pending").length;
  const stalePeople = snapshot.profiles.filter((profile) => hoursSince(profile.lastContactAt) > 96).length;
  const relationshipLoops = openPromises.filter((item) => item.category === "relationship").length;

  if (highRisk > 0 || overdue > 0 || pendingApprovals >= 2) return "operator";
  if (relationshipLoops > 0 || stalePeople > 0) return "relationship";
  return "adventure";
}

function buildAutopilotSummary(snapshot: RelationshipOSSnapshot, focus: EvolutionFocus): string {
  const openPromises = getOpenPromises(snapshot);
  const topPromise = [...openPromises].sort(
    (a, b) => riskScore(b.risk) - riskScore(a.risk) || new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  )[0];
  const staleProfile = [...snapshot.profiles].sort((a, b) => hoursSince(b.lastContactAt) - hoursSince(a.lastContactAt))[0];

  if (focus === "operator" && topPromise) {
    return `자동진화 모드가 지금은 실행 압력을 감지해 "${topPromise.title}"를 최우선 루프로 잡고 있습니다.`;
  }
  if (focus === "relationship" && staleProfile) {
    return `자동진화 모드가 지금은 ${staleProfile.name}과의 흐름을 다시 잇는 쪽으로 관계 감도를 높이고 있습니다.`;
  }
  return "자동진화 모드는 지금 열린 루프가 비교적 안정적이라, 탐험형 장면과 새로운 연결 기회를 만들 준비를 하고 있습니다.";
}

function buildQuests(snapshot: RelationshipOSSnapshot, focus: EvolutionFocus): EvolutionQuest[] {
  const openPromises = getOpenPromises(snapshot);
  const sortedPromises = [...openPromises].sort(
    (a, b) => riskScore(b.risk) - riskScore(a.risk) || new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  );
  const staleProfile = [...snapshot.profiles].sort((a, b) => hoursSince(b.lastContactAt) - hoursSince(a.lastContactAt))[0];
  const pendingApproval = snapshot.approvals.find((item) => item.status === "pending");
  const quests: EvolutionQuest[] = [];

  if (focus === "operator") {
    for (const promise of sortedPromises.slice(0, 2)) {
      const profile = snapshot.profiles.find((item) => item.id === promise.personId);
      quests.push({
        id: `quest-${promise.id}`,
        title: promise.risk === "high" ? "보스 루프 정리" : "핵심 후속조치 처리",
        description: profile
          ? `${profile.name}과 연결된 "${promise.title}"를 오늘 안에 닫아 신뢰 리듬을 복구합니다.`
          : `"${promise.title}"를 처리해 열린 루프를 줄입니다.`,
        reward: promise.risk === "high" ? "신뢰 손실 방지 + 장면 회복" : "열린 루프 -1",
        difficulty: promise.risk === "high" ? "boss" : "elite",
        status: "active",
        focus,
        linkedPromiseId: promise.id,
        linkedProfileId: promise.personId,
      });
    }
  } else if (focus === "relationship" && staleProfile) {
    quests.push({
      id: `quest-reconnect-${staleProfile.id}`,
      title: "흐름 다시 잇기",
      description: `${staleProfile.name}과의 공백이 길어지고 있습니다. 짧은 안부나 체크인으로 리듬을 다시 여세요.`,
      reward: "관계 온도 회복 + 다음 장면 생성",
      difficulty: "elite",
      status: "active",
      focus,
      linkedProfileId: staleProfile.id,
    });
    const relationshipPromise = sortedPromises.find((item) => item.category === "relationship");
    if (relationshipPromise) {
      quests.push({
        id: `quest-${relationshipPromise.id}`,
        title: "관계 퀘스트",
        description: `"${relationshipPromise.title}"를 실행하면 끊긴 장면이 다시 이어집니다.`,
        reward: "따뜻한 장면 개방",
        difficulty: relationshipPromise.risk === "high" ? "boss" : "routine",
        status: "active",
        focus,
        linkedPromiseId: relationshipPromise.id,
        linkedProfileId: relationshipPromise.personId,
      });
    }
  } else {
    quests.push({
      id: "quest-adventure-story",
      title: "새 장면 열기",
      description: "새로운 대화 한 줄이나 아이디어 한 줄을 캡처해 결이 다음 장면을 만들어내게 하세요.",
      reward: "새 Night Story 장면",
      difficulty: "routine",
      status: "active",
      focus,
    });
    if (staleProfile) {
      quests.push({
        id: `quest-side-${staleProfile.id}`,
        title: "사이드 퀘스트: 가벼운 연결",
        description: `${staleProfile.name}에게 가벼운 체크인을 보내 탐험형 흐름을 사람 사이 장면으로 전환합니다.`,
        reward: "숨은 스토리 해금",
        difficulty: "routine",
        status: "active",
        focus,
        linkedProfileId: staleProfile.id,
      });
    }
  }

  if (pendingApproval) {
    quests.push({
      id: `quest-approval-${pendingApproval.id}`,
      title: "승인함 비우기",
      description: `${pendingApproval.targetName} 관련 초안을 승인하거나 수정해 자동진화 루프를 막힘 없이 이어가세요.`,
      reward: "자동진화 속도 상승",
      difficulty: "routine",
      status: "active",
      focus: "operator",
      linkedPromiseId: pendingApproval.relatedPromiseId,
    });
  }

  return quests.slice(0, 3);
}

function buildAutonomousMode(snapshot: RelationshipOSSnapshot, focus: EvolutionFocus, cycleCount: number, lastRunAt?: string): AutonomousModeState {
  return {
    enabled: true,
    currentFocus: focus,
    autopilotSummary: buildAutopilotSummary(snapshot, focus),
    cycleCount,
    lastRunAt: lastRunAt ?? new Date().toISOString(),
    nextRunAt: nextRunIso(45),
  };
}

function refreshDerived(snapshot: RelationshipOSSnapshot, cycleCount = snapshot.autonomousMode?.cycleCount ?? 0, lastRunAt?: string): RelationshipOSSnapshot {
  const focus = inferCurrentFocus(snapshot);
  const autonomousMode = buildAutonomousMode(snapshot, focus, cycleCount, lastRunAt);
  const quests = buildQuests(snapshot, focus);
  const episode = buildDailyEpisode({
    ...snapshot,
    autonomousMode,
    quests,
  });
  return {
    ...snapshot,
    autonomousMode,
    quests,
    stories: [episode, ...snapshot.stories.filter((item) => item.id !== episode.id)],
  };
}

export function describeFocus(focus: EvolutionFocus): string {
  if (focus === "operator") return "실행 압력";
  if (focus === "relationship") return "관계 감도";
  return "탐험 드리프트";
}

export function describeProfileEmergence(snapshot: RelationshipOSSnapshot, profile: RelationshipProfile): { label: string; summary: string } {
  const openLoops = snapshot.promises.filter((item) => item.personId === profile.id && item.status !== "done").length;
  const contactGap = hoursSince(profile.lastContactAt);

  if (openLoops >= 2 || profile.trustScore < 68) {
    return {
      label: "복구 구간",
      summary: "실행과 확인이 늦어지면 리듬이 무너지는 단계입니다.",
    };
  }
  if (profile.warmthScore >= 85 && contactGap < 96) {
    return {
      label: "자연 확장",
      summary: "억지로 관리하지 않아도 장면이 잘 이어지는 안정 구간입니다.",
    };
  }
  if (contactGap >= 96) {
    return {
      label: "재점화 필요",
      summary: "공백이 길어져 작은 체크인만으로도 흐름이 크게 바뀔 수 있습니다.",
    };
  }
  return {
    label: "탐색 중",
    summary: "아직 패턴이 굳지 않아 작은 액션이 관계의 방향을 정합니다.",
  };
}

function buildDailyEpisode(snapshot: RelationshipOSSnapshot): StoryEpisode {
  const focus = inferCurrentFocus(snapshot);
  const pending = snapshot.promises.filter((item) => item.status !== "done");
  const topPromise = [...pending].sort(
    (a, b) => riskScore(b.risk) - riskScore(a.risk) || new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  )[0];
  const profile = topPromise?.personId
    ? snapshot.profiles.find((item) => item.id === topPromise.personId)
    : snapshot.profiles[0];

  const mood: StoryMood =
    topPromise?.risk === "high" ? "tension" : pending.length > 3 ? "momentum" : profile && profile.warmthScore > 80 ? "warmth" : "repair";
  const titleMap: Record<StoryMood, string> = {
    tension: "답장을 기다리는 장면",
    momentum: "약속이 움직이기 시작한 밤",
    warmth: "관계의 온도가 오르는 밤",
    repair: "끊기지 않게 이어 붙인 하루",
  };

  const subject = profile?.name ?? "오늘의 관계";
  const followUp = topPromise?.title ?? "남은 후속조치";

  return {
    id: `daily-${new Date().toISOString().slice(0, 10)}`,
    createdAt: new Date().toISOString(),
    mood,
    focus,
    title: titleMap[mood],
    subtitle: `${subject}과의 흐름을 결이 오늘 밤 한 편의 장면으로 정리했습니다.`,
    relationshipIds: profile ? [profile.id] : [],
    beats: [
      `낮 동안 결은 "${followUp}"를 가장 중요한 약속으로 붙잡고 있었습니다.`,
      `${subject}과의 관계는 지금 ${profile ? `신뢰 ${profile.trustScore}점 / 온도 ${profile.warmthScore}점` : "정리 단계"}에 있습니다.`,
      pending.length > 0 ? `아직 ${pending.length}개의 후속조치가 남아 있어, 내일 아침 첫 액션이 중요합니다.` : "열린 루프가 거의 정리되어 내일은 훨씬 가볍게 시작할 수 있습니다.",
    ],
    dialogue: [
      { speaker: "결", line: `${subject}과의 맥락을 잊지 않기 위해 오늘의 장면을 저장했어요.` },
      { speaker: "당신", line: "지금 가장 먼저 붙잡아야 할 건 뭐야?" },
      { speaker: "결", line: topPromise ? `"${topPromise.title}"를 미루지 않는 거예요. 그 한 번의 답장이 관계의 방향을 바꿔요.` : "오늘은 이어야 할 약속보다, 잘 지킨 흐름을 유지하는 게 중요해요." },
    ],
    quote: topPromise
      ? `"${topPromise.title}"를 오늘 넘기지 않으면 신뢰의 리듬이 느려질 수 있어요.`
      : `"당신이 지킨 작은 약속들이 관계를 조용히 단단하게 만들고 있어요."`,
    nextAction: topPromise?.suggestedMessage ?? `${subject}에게 짧은 확인 메시지를 보내 흐름을 다시 여세요.`,
  };
}

export function createInitialSnapshot(): RelationshipOSSnapshot {
  const profiles: RelationshipProfile[] = [
    {
      id: "p-minji",
      name: "민지",
      role: "제품 디자이너",
      relationshipType: "team",
      cadence: "daily",
      warmthScore: 79,
      trustScore: 68,
      lastContactAt: isoAt(-1, 16, 30),
      spark: "일이 빠르게 움직이지만 확인이 늦어지면 체감이 크게 떨어집니다.",
      preferredStyle: "짧고 선명한 체크인 + 확정안 먼저",
      notes: ["지난 스프린트에서 피드백 반영 속도를 중요하게 봤음", "시안보다 우선순위 근거를 더 선호"],
    },
    {
      id: "p-junho",
      name: "준호",
      role: "친한 친구",
      relationshipType: "friend",
      cadence: "weekly",
      warmthScore: 86,
      trustScore: 74,
      lastContactAt: isoAt(-4, 20, 10),
      spark: "연락 공백이 길어도 관계는 남지만, 먼저 꺼내주는 안부를 좋아합니다.",
      preferredStyle: "가벼운 안부 + 구체적인 다음 만남 제안",
      notes: ["금요일 저녁 약속에 반응이 좋음", "장문보다 편한 톤의 짧은 메시지 선호"],
    },
    {
      id: "p-sora",
      name: "소라",
      role: "주요 클라이언트",
      relationshipType: "client",
      cadence: "weekly",
      warmthScore: 67,
      trustScore: 63,
      lastContactAt: isoAt(-2, 11, 0),
      spark: "불확실성을 싫어하고, 마감과 상태 공유에 예민합니다.",
      preferredStyle: "진척률 + 다음 단계 + ETA 명확히",
      notes: ["미팅 후 24시간 이내 follow-up 기대", "열린 이슈를 먼저 인정하는 쪽이 신뢰에 유리"],
    },
    {
      id: "p-euna",
      name: "은아",
      role: "가족",
      relationshipType: "family",
      cadence: "weekly",
      warmthScore: 91,
      trustScore: 88,
      lastContactAt: isoAt(-6, 21, 20),
      spark: "실무보다 감정 체크가 중요합니다.",
      preferredStyle: "짧은 안부 + 근황 공유",
      notes: ["일요일 저녁 통화 루틴이 잘 맞음"],
    },
  ];

  const promises: PromiseItem[] = [
    {
      id: "promise-1",
      title: "민지에게 온보딩 플로우 우선순위안 보내기",
      personId: "p-minji",
      dueAt: isoAt(0, 17, 30),
      source: "meeting",
      category: "deliverable",
      status: "open",
      risk: "high",
      context: "어제 리뷰에서 민지가 오전 중 근거까지 포함된 우선순위안을 원했습니다.",
      suggestedMessage: "민지님, 요청하신 온보딩 우선순위안 정리했습니다. 우선 결론부터 보시고, 필요한 근거는 아래에 붙여둘게요.",
    },
    {
      id: "promise-2",
      title: "준호에게 이번 주말 저녁 약속 다시 제안하기",
      personId: "p-junho",
      dueAt: isoAt(1, 12, 0),
      source: "chat",
      category: "relationship",
      status: "open",
      risk: "medium",
      context: "지난주 바빠서 답장을 놓쳤고, 이번 주말에 한 번 보자는 얘기가 흐려졌습니다.",
      suggestedMessage: "준호야, 지난번에 말 흐려진 거 미안. 이번 주말 저녁 중 편한 시간 있으면 내가 맞출게.",
    },
    {
      id: "promise-3",
      title: "소라님께 프로젝트 상태 업데이트와 리스크 공유",
      personId: "p-sora",
      dueAt: isoAt(0, 15, 0),
      source: "email",
      category: "follow_up",
      status: "open",
      risk: "high",
      context: "오늘 중간 체크 메일을 보내지 않으면 체감 신뢰가 크게 깎일 가능성이 있습니다.",
      suggestedMessage: "소라님, 현재 진행 상황과 남은 리스크를 정리해 공유드립니다. 일정 영향이 있을 수 있는 부분은 먼저 투명하게 말씀드릴게요.",
    },
    {
      id: "promise-4",
      title: "은아에게 이번 주 컨디션 체크 메시지 남기기",
      personId: "p-euna",
      dueAt: isoAt(2, 20, 0),
      source: "quick_note",
      category: "relationship",
      status: "open",
      risk: "low",
      context: "연락 공백이 길어지면 본인은 괜찮아도 상대는 서운함을 느낄 수 있습니다.",
      suggestedMessage: "엄마, 이번 주 정신없이 지나가서 이제 연락해. 오늘 어땠는지 궁금해서 먼저 안부 남겨.",
    },
  ];

  const approvals: ApprovalItem[] = [
    {
      id: "approval-1",
      kind: "message",
      title: "소라님 상태 공유 초안",
      targetName: "소라",
      preview: "소라님, 현재 진행 상황과 남은 리스크를 정리해 공유드립니다...",
      rationale: "오늘 안에 먼저 투명하게 말하는 것이 신뢰 하락을 막습니다.",
      relatedPromiseId: "promise-3",
      status: "pending",
      createdAt: isoAt(0, 9, 0),
    },
    {
      id: "approval-2",
      kind: "nudge",
      title: "준호에게 가볍게 먼저 안부 보내기",
      targetName: "준호",
      preview: "준호야, 답장 템포 놓친 거 미안. 이번 주말 저녁 한 번 볼래?",
      rationale: "대화 공백이 4일을 넘기기 전에 먼저 다리를 놓는 편이 좋습니다.",
      relatedPromiseId: "promise-2",
      status: "pending",
      createdAt: isoAt(0, 8, 40),
    },
  ];

  const captures: CaptureItem[] = [
    {
      id: "capture-1",
      rawText: "민지 리뷰 후 우선순위안 보내기, 근거까지 정리할 것",
      source: "meeting",
      createdAt: isoAt(-1, 18, 0),
      extractedPromiseIds: ["promise-1"],
      extractedApprovalIds: [],
    },
  ];

  const snapshot: RelationshipOSSnapshot = {
    profiles,
    promises,
    approvals,
    captures,
    stories: [],
    quests: [],
    autonomousMode: {
      enabled: true,
      currentFocus: "operator",
      autopilotSummary: "",
      cycleCount: 0,
      lastRunAt: new Date().toISOString(),
      nextRunAt: nextRunIso(45),
    },
  };

  return refreshDerived(snapshot);
}

export function buildBriefing(snapshot: RelationshipOSSnapshot): RelationshipBriefing {
  const openPromises = snapshot.promises.filter((item) => item.status !== "done");
  const priorities = [...openPromises]
    .sort((a, b) => riskScore(b.risk) - riskScore(a.risk) || new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 3)
    .map((promise) => buildPromisePriority(promise, snapshot.profiles));
  const alerts = buildAlerts(snapshot.profiles, openPromises);
  const highRiskCount = openPromises.filter((item) => item.risk === "high").length;
  const readyDraftCount = snapshot.approvals.filter((item) => item.status === "pending").length;

  return {
    headline: highRiskCount > 0 ? `오늘은 신뢰를 지키는 날입니다.` : `오늘은 관계를 부드럽게 이어가기 좋은 날입니다.`,
    summary:
      highRiskCount > 0
        ? `높은 리스크 약속 ${highRiskCount}개가 남아 있습니다. 먼저 투명하게 확인을 보내면 흐름을 지킬 수 있습니다.`
        : `열린 루프를 천천히 닫으며 관계 리듬을 유지하면 됩니다.`,
    urgentCount: highRiskCount,
    readyDraftCount,
    currentFocus: snapshot.autonomousMode.currentFocus,
    autopilotSummary: snapshot.autonomousMode.autopilotSummary,
    relationshipAlerts: alerts,
    priorities,
    questPreview: snapshot.quests.slice(0, 3),
    storyPreview: snapshot.stories[0],
  };
}

export function ingestCapture(
  snapshot: RelationshipOSSnapshot,
  rawText: string,
  source?: CaptureSource,
): RelationshipOSSnapshot {
  const trimmed = rawText.trim();
  if (!trimmed) return snapshot;

  const profile = matchProfile(trimmed, snapshot.profiles);
  const dueAt = inferDueAt(trimmed);
  const captureSource = inferSource(trimmed, source);
  const newPromiseId = `promise-${crypto.randomUUID()}`;
  const promise: PromiseItem = {
    id: newPromiseId,
    title: compactTitle(trimmed),
    personId: profile?.id,
    dueAt,
    source: captureSource,
    category: inferCategory(trimmed),
    status: "open",
    risk: inferRisk(trimmed, profile),
    context: trimmed,
    suggestedMessage: buildDraft(profile, trimmed),
  };

  const approvalId = `approval-${crypto.randomUUID()}`;
  const approval: ApprovalItem = {
    id: approvalId,
    kind: "message",
    title: profile ? `${profile.name}용 follow-up 초안` : "새 follow-up 초안",
    targetName: profile?.name ?? "대상 미확정",
    preview: promise.suggestedMessage ?? "",
    rationale: "방금 캡처한 맥락을 가장 신선할 때 바로 실행으로 연결합니다.",
    relatedPromiseId: promise.id,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const capture: CaptureItem = {
    id: `capture-${crypto.randomUUID()}`,
    rawText: trimmed,
    source: captureSource,
    createdAt: new Date().toISOString(),
    extractedPromiseIds: [promise.id],
    extractedApprovalIds: [approval.id],
  };

  const nextSnapshot: RelationshipOSSnapshot = {
    ...snapshot,
    promises: [promise, ...snapshot.promises],
    approvals: [approval, ...snapshot.approvals],
    captures: [capture, ...snapshot.captures],
  };

  return refreshDerived(nextSnapshot, snapshot.autonomousMode.cycleCount);
}

export function togglePromise(snapshot: RelationshipOSSnapshot, promiseId: string): RelationshipOSSnapshot {
  const target = snapshot.promises.find((item) => item.id === promiseId);
  if (!target) return snapshot;

  const nextStatus: PromiseItem["status"] = target.status === "done" ? "open" : "done";
  const nextPromises: PromiseItem[] = snapshot.promises.map((item) =>
    item.id === promiseId ? { ...item, status: nextStatus } : item,
  );
  const nextProfiles = snapshot.profiles.map((profile) => {
    if (profile.id !== target.personId) return profile;
    return {
      ...profile,
      trustScore: clamp(profile.trustScore + (nextStatus === "done" ? 5 : -4), 0, 100),
      warmthScore: clamp(profile.warmthScore + (nextStatus === "done" ? 3 : -2), 0, 100),
      lastContactAt: nextStatus === "done" ? new Date().toISOString() : profile.lastContactAt,
    };
  });

  const nextSnapshot: RelationshipOSSnapshot = {
    ...snapshot,
    profiles: nextProfiles,
    promises: nextPromises,
  };
  return refreshDerived(nextSnapshot, snapshot.autonomousMode.cycleCount);
}

export function snoozePromise(snapshot: RelationshipOSSnapshot, promiseId: string): RelationshipOSSnapshot {
  const nextPromises: PromiseItem[] = snapshot.promises.map((item) => {
    if (item.id !== promiseId) return item;
    const due = new Date(item.dueAt);
    due.setDate(due.getDate() + 1);
    return {
      ...item,
      status: "snoozed" as const,
      dueAt: due.toISOString(),
      risk: item.risk === "high" ? "medium" : item.risk,
    };
  });
  const nextSnapshot: RelationshipOSSnapshot = { ...snapshot, promises: nextPromises };
  return refreshDerived(nextSnapshot, snapshot.autonomousMode.cycleCount);
}

export function decideApproval(
  snapshot: RelationshipOSSnapshot,
  approvalId: string,
  decision: "approved" | "dismissed",
): RelationshipOSSnapshot {
  const approval = snapshot.approvals.find((item) => item.id === approvalId);
  if (!approval) return snapshot;

  const nextApprovals: ApprovalItem[] = snapshot.approvals.map((item) =>
    item.id === approvalId ? { ...item, status: decision } : item,
  );

  const relatedPromiseId = approval.relatedPromiseId;
  const nextPromises: PromiseItem[] = relatedPromiseId
    ? snapshot.promises.map((item) =>
        item.id === relatedPromiseId && decision === "approved"
          ? { ...item, status: "done" as const }
          : item,
      )
    : snapshot.promises;

  const nextProfiles = snapshot.profiles.map((profile) => {
    if (profile.name !== approval.targetName || decision !== "approved") return profile;
    return {
      ...profile,
      trustScore: clamp(profile.trustScore + 4, 0, 100),
      warmthScore: clamp(profile.warmthScore + 4, 0, 100),
      lastContactAt: new Date().toISOString(),
    };
  });

  const nextSnapshot: RelationshipOSSnapshot = {
    ...snapshot,
    approvals: nextApprovals,
    promises: nextPromises,
    profiles: nextProfiles,
  };
  return refreshDerived(nextSnapshot, snapshot.autonomousMode.cycleCount);
}

export function getOpenLoopCount(snapshot: RelationshipOSSnapshot, profileId: string): number {
  return snapshot.promises.filter((item) => item.personId === profileId && item.status !== "done").length;
}

export function listPriorityPromises(snapshot: RelationshipOSSnapshot): PromisePriority[] {
  return buildBriefing(snapshot).priorities;
}

export function runAutonomousEvolutionCycle(snapshot: RelationshipOSSnapshot): RelationshipOSSnapshot {
  const now = new Date().toISOString();
  const openPromises = getOpenPromises(snapshot);
  const nextPromises: PromiseItem[] = snapshot.promises.map((item) => {
    if (item.status === "done") return item;
    if (new Date(item.dueAt).getTime() <= Date.now() && item.risk !== "high") {
      return { ...item, risk: "high" as const };
    }
    if (item.status === "snoozed" && new Date(item.dueAt).getTime() - Date.now() < 12 * 3600000) {
      return { ...item, status: "open" as const };
    }
    return item;
  });

  const nextProfiles = snapshot.profiles.map((profile) => {
    const gapHours = hoursSince(profile.lastContactAt);
    const penalty = gapHours > 120 ? 2 : gapHours > 72 ? 1 : 0;
    const openLoops = openPromises.filter((item) => item.personId === profile.id).length;
    return {
      ...profile,
      trustScore: clamp(profile.trustScore - penalty - (openLoops >= 2 ? 1 : 0), 0, 100),
      warmthScore: clamp(profile.warmthScore - (gapHours > 144 ? 1 : 0), 0, 100),
    };
  });

  let nextApprovals = [...snapshot.approvals];
  const overdueTarget = nextPromises.find((item) => item.status !== "done" && item.risk === "high");
  if (overdueTarget) {
    const existing = nextApprovals.some(
      (item) => item.relatedPromiseId === overdueTarget.id && item.status === "pending",
    );
    if (!existing) {
      const profile = nextProfiles.find((item) => item.id === overdueTarget.personId);
      nextApprovals = [
        {
          id: `approval-${crypto.randomUUID()}`,
          kind: "nudge",
          title: profile ? `${profile.name}에게 흐름 다시 열기` : "열린 루프 다시 열기",
          targetName: profile?.name ?? "대상 미확정",
          preview: overdueTarget.suggestedMessage ?? `${overdueTarget.title} 관련해 짧게라도 먼저 확인 메시지를 보내 흐름을 살리세요.`,
          rationale: "자동진화 모드가 지연된 고위험 루프를 감지해 재점화 초안을 만들었습니다.",
          relatedPromiseId: overdueTarget.id,
          status: "pending",
          createdAt: now,
        },
        ...nextApprovals,
      ];
    }
  }

  const nextSnapshot: RelationshipOSSnapshot = {
    ...snapshot,
    profiles: nextProfiles,
    promises: nextPromises,
    approvals: nextApprovals,
  };

  return refreshDerived(nextSnapshot, (snapshot.autonomousMode?.cycleCount ?? 0) + 1, now);
}
