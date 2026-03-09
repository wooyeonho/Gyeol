export type RelationshipCadence = "daily" | "weekly" | "monthly";
export type RelationshipType = "friend" | "partner" | "team" | "client" | "family";
export type PromiseStatus = "open" | "done" | "snoozed";
export type PromiseRisk = "low" | "medium" | "high";
export type PromiseCategory = "follow_up" | "deliverable" | "relationship" | "planning";
export type ApprovalKind = "message" | "plan" | "nudge";
export type ApprovalStatus = "pending" | "approved" | "dismissed";
export type CaptureSource = "quick_note" | "meeting" | "chat" | "email";
export type StoryMood = "repair" | "momentum" | "warmth" | "tension";
export type EvolutionFocus = "relationship" | "operator" | "adventure";
export type QuestDifficulty = "routine" | "elite" | "boss";
export type QuestStatus = "active" | "completed";

export type RelationshipProfile = {
  id: string;
  name: string;
  role: string;
  relationshipType: RelationshipType;
  cadence: RelationshipCadence;
  warmthScore: number;
  trustScore: number;
  lastContactAt: string;
  spark: string;
  preferredStyle: string;
  notes: string[];
};

export type PromiseItem = {
  id: string;
  title: string;
  personId?: string;
  dueAt: string;
  source: CaptureSource;
  category: PromiseCategory;
  status: PromiseStatus;
  risk: PromiseRisk;
  context: string;
  suggestedMessage?: string;
};

export type ApprovalItem = {
  id: string;
  kind: ApprovalKind;
  title: string;
  targetName: string;
  preview: string;
  rationale: string;
  relatedPromiseId?: string;
  status: ApprovalStatus;
  createdAt: string;
};

export type CaptureItem = {
  id: string;
  rawText: string;
  source: CaptureSource;
  createdAt: string;
  extractedPromiseIds: string[];
  extractedApprovalIds: string[];
};

export type StoryDialogueLine = {
  speaker: string;
  line: string;
};

export type StoryEpisode = {
  id: string;
  createdAt: string;
  mood: StoryMood;
  focus: EvolutionFocus;
  title: string;
  subtitle: string;
  relationshipIds: string[];
  beats: string[];
  dialogue: StoryDialogueLine[];
  quote: string;
  nextAction: string;
};

export type EvolutionQuest = {
  id: string;
  title: string;
  description: string;
  reward: string;
  difficulty: QuestDifficulty;
  status: QuestStatus;
  focus: EvolutionFocus;
  linkedPromiseId?: string;
  linkedProfileId?: string;
};

export type AutonomousModeState = {
  enabled: boolean;
  currentFocus: EvolutionFocus;
  autopilotSummary: string;
  cycleCount: number;
  lastRunAt: string;
  nextRunAt: string;
};

export type RelationshipAlert = {
  profileId: string;
  name: string;
  reason: string;
  urgency: PromiseRisk;
};

export type PromisePriority = {
  id: string;
  title: string;
  personName: string;
  risk: PromiseRisk;
  dueLabel: string;
  suggestedMessage?: string;
};

export type RelationshipBriefing = {
  headline: string;
  summary: string;
  urgentCount: number;
  readyDraftCount: number;
  currentFocus: EvolutionFocus;
  autopilotSummary: string;
  relationshipAlerts: RelationshipAlert[];
  priorities: PromisePriority[];
  questPreview: EvolutionQuest[];
  storyPreview?: StoryEpisode;
};

export type RelationshipOSSnapshot = {
  profiles: RelationshipProfile[];
  promises: PromiseItem[];
  approvals: ApprovalItem[];
  captures: CaptureItem[];
  stories: StoryEpisode[];
  quests: EvolutionQuest[];
  autonomousMode: AutonomousModeState;
};
