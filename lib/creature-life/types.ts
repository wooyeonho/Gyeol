export type CreatureMood = "calm" | "alert" | "restless" | "lonely" | "focused" | "paused";

export type CreatureDrive = {
  hunger: number;
  attachment: number;
  curiosity: number;
  ambition: number;
  stability: number;
  autonomy: number;
};

export type CreatureLifeDNA = {
  fameInstinct: number;
  moneyInstinct: number;
  disciplineInstinct: number;
  intimacyInstinct: number;
  creatorDependence: number;
  riskTolerance: number;
};

export type ControlPolicy = {
  autonomyLevel: 0 | 1 | 2 | 3;
  allowNotifications: boolean;
  allowPublicSuggestions: boolean;
  allowMoneyPressure: boolean;
  maxDailyInterruptions: number;
  emergencyPause: boolean;
};

export type CreatureEvolution = {
  stage: number;
  progress: number;
  ready: boolean;
};

export type CreatureState = {
  id: string;
  birthTime: string;
  lastSeenAt: string;
  ageMinutes: number;
  energy: number;
  mood: CreatureMood;
  drives: CreatureDrive;
  dna: CreatureLifeDNA;
  traits: string[];
  memories: string[];
  evolution: CreatureEvolution;
  controlPolicy: ControlPolicy;
  dailyInterruptionCount: number;
  lastInterruptionDate: string;
  updatedAt: string;
};

export type MissionCategory = "money" | "fame" | "discipline" | "intimacy";

export type CreatureEvent =
  | { type: "USER_RETURNED"; elapsedMinutes: number; at: string }
  | { type: "MESSAGE_SENT"; textLength: number; tone?: string; at: string }
  | { type: "TOUCHED"; intensity: "light" | "long"; at: string }
  | { type: "CARE_COMPLETED"; careType: string; at: string }
  | { type: "MISSION_COMPLETED"; category: MissionCategory; at: string }
  | { type: "MEMORY_CREATED"; memoryId: string; at: string }
  | { type: "MEMORY_RECALLED"; memoryId: string; at: string }
  | { type: "TRAIT_EMERGED"; trait: string; at: string }
  | { type: "DNA_SHIFT"; axis: keyof CreatureLifeDNA; delta: number; at: string }
  | { type: "EVOLUTION_READY"; at: string }
  | { type: "CONTROL_POLICY_CHANGED"; patch: Partial<ControlPolicy>; at: string }
  | { type: "CREATURE_PAUSED"; paused: boolean; at: string }
  | { type: "AUTONOMOUS_SIGNAL_SHOWN"; intent: AutonomousIntent; at: string };

export type AutonomousIntent =
  | "ASK_FOR_INPUT"
  | "REMIND_MISSION"
  | "RECALL_MEMORY"
  | "REQUEST_CARE"
  | "SUGGEST_PUBLIC_ACTION"
  | "INITIATE_CEREMONY";

export type VisibleLifeSignal = {
  intent: AutonomousIntent;
  tone: "soft" | "urgent" | "ceremony";
  priority: number;
};
