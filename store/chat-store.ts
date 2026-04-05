import { create } from "zustand";
import { useAgentStore } from "@/store/agent-store";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { detectPrimaryUsageModeFromText } from "@/lib/identity/usage-profile";
import { logWarn } from "@/lib/ops/logger";
import {
  applyRewardToInventory,
  createDailyLoginReward,
  getRewardProgress,
  hasClaimedDailyLoginBonus,
  markDailyLoginBonusClaimed,
  readMessagesSinceReward,
  readRewardInventory,
  writeRewardInventory,
  type RewardInventory,
  type RewardProgress,
  type RewardResult,
} from "@/lib/rewards/variable-reward";
import {
  getWeeklyEventProgress,
  readWeeklyEventState,
  registerWeeklyEventMessage,
  type WeeklyEventProgress,
  type WeeklyEventState,
  writeWeeklyEventState,
} from "@/lib/engagement/weekly-event";
import { processMessageReward, processWeeklyEventReward } from "@/lib/rewards/reward-middleware";
import { haptic, playSound } from "@/lib/micro-interactions";

interface MemoryMomentData { memory: string; age_days: number; similarity: number }
interface ResonanceData { score: number; delta: number; topOverlap: { axis: string; closeness: number }[] }
interface Message { id?: string; role: "user" | "assistant"; content: string; error?: boolean; dnaShift?: string[]; traitEmerged?: { id: string; name: { ko: string; en: string } }[]; memoryMoment?: MemoryMomentData; resonance?: ResonanceData }
type MessageMeta = {
  experiment_key?: string;
  experiment_variant?: string;
  source?: "input" | "prompt" | "cta" | "voice";
  locale?: string;
  /** Total persisted message count from agent state — avoids cross-store getState() access. */
  totalMessages?: number;
};
type ChatSetter = (
  partial: ChatStore | Partial<ChatStore> | ((state: ChatStore) => ChatStore | Partial<ChatStore>),
  replace?: boolean,
) => void;
interface ChatStore {
  messages: Message[];
  isStreaming: boolean;
  abortController: AbortController | null;
  historyLoaded: boolean;
  pendingUsageMode: string | null;
  lastLocale: string | undefined;
  lastReward: RewardResult | null;
  rewardInventory: RewardInventory;
  rewardProgress: RewardProgress;
  weeklyEvent: WeeklyEventState;
  weeklyEventProgress: WeeklyEventProgress;
  pendingWeeklyEventCompletion: boolean;
  lastResonance: number | null;
  clearReward: () => void;
  claimDailyLoginBonus: (streakDays?: number) => void;
  hydrateRecentMessages: (messages: Message[]) => void;
  injectGreeting: (greeting: Message) => void;
  stopStreaming: () => void;
  sendMessage: (message: string, meta?: MessageMeta) => Promise<void>;
  retryLastMessage: () => Promise<void>;
}

function createMessage(role: "user" | "assistant", content: string, error = false): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    error,
  };
}

function getLocaleText(locale: string | undefined) {
  const normalized = locale?.toLowerCase() ?? "ko";
  if (normalized.startsWith("en")) {
    return {
      parseError: "I couldn't process the response.",
      streamError: "The response stream was interrupted.",
      stopped: "Stopped.",
    };
  }
  if (normalized.startsWith("ja")) {
    return {
      parseError: "応答を処理できませんでした。",
      streamError: "応答ストリームが中断されました。",
      stopped: "停止しました。",
    };
  }
  if (normalized.startsWith("zh")) {
    return {
      parseError: "无法处理响应。",
      streamError: "响应流已中断。",
      stopped: "已停止。",
    };
  }
  if (normalized.startsWith("es")) {
    return {
      parseError: "No pude procesar la respuesta.",
      streamError: "La transmisión de respuesta se interrumpió.",
      stopped: "Detenido.",
    };
  }
  return {
    parseError: "응답을 처리하지 못했어요.",
    streamError: "결과 연결이 끊어졌어요.",
    stopped: "응답을 멈췄어요.",
  };
}

async function handleStreamResponse(
  message: string,
  set: (partial: ChatStore | Partial<ChatStore> | ((state: ChatStore) => ChatStore | Partial<ChatStore>), replace?: boolean) => void,
  get: () => ChatStore,
  locale?: string
) {
  const copy = getLocaleText(locale);
  let aborted = false;

  // P6A: Batched streaming — collect deltas in a buffer, flush to Zustand at ~15fps
  // instead of 60+ state updates/sec. Reduces array copies and re-renders dramatically.
  let contentBuffer = "";
  let metaBuffer: Partial<Pick<Message, "dnaShift" | "traitEmerged" | "memoryMoment" | "resonance">> = {};
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  const FLUSH_INTERVAL = 66; // ~15fps — smooth enough for text, 4x fewer renders

  function flushBuffer() {
    flushTimer = null;
    const text = contentBuffer;
    const meta = { ...metaBuffer };
    contentBuffer = "";
    metaBuffer = {};
    if (!text && !meta.dnaShift && !meta.traitEmerged && !meta.memoryMoment && !meta.resonance) return;
    set((s) => {
      const last = s.messages[s.messages.length - 1];
      if (!last || last.role !== "assistant") return s;
      // Only clone the last element — avoids O(n) full-array copy on each flush
      const updated = {
        ...last,
        content: last.content + text,
        error: false,
        ...(meta.dnaShift ? { dnaShift: meta.dnaShift } : {}),
        ...(meta.traitEmerged ? { traitEmerged: meta.traitEmerged } : {}),
        ...(meta.memoryMoment ? { memoryMoment: meta.memoryMoment } : {}),
        ...(meta.resonance ? { resonance: meta.resonance } : {}),
      };
      const msgs = s.messages.slice();
      msgs[msgs.length - 1] = updated;
      const nextState: Partial<ChatStore> = { messages: msgs };
      if (meta.resonance) nextState.lastResonance = meta.resonance.score;
      return nextState;
    });
  }

  function scheduleFlush() {
    if (!flushTimer) flushTimer = setTimeout(flushBuffer, FLUSH_INTERVAL);
  }

  try {
    const controller = get().abortController;
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, locale }),
      signal: controller?.signal,
    });
    if (!res.ok) throw new Error(`${res.status}`);

    const reader = res.body?.getReader();
    if (!reader) throw new Error("Missing response stream");
    const decoder = new TextDecoder();
    let sseBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split("\n");
      sseBuffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "dna_shift" && Array.isArray(parsed.axes)) {
              metaBuffer.dnaShift = parsed.axes as string[];
              scheduleFlush();
            } else if (parsed.type === "trait_emerged" && Array.isArray(parsed.traits)) {
              metaBuffer.traitEmerged = parsed.traits as { id: string; name: { ko: string; en: string } }[];
              scheduleFlush();
            } else if (parsed.type === "memory_moment" && typeof parsed.memory === "string") {
              metaBuffer.memoryMoment = {
                memory: parsed.memory as string,
                age_days: typeof parsed.age_days === "number" ? parsed.age_days : 0,
                similarity: typeof parsed.similarity === "number" ? parsed.similarity : 0,
              };
              scheduleFlush();
            } else if (parsed.type === "resonance" && typeof parsed.score === "number") {
              metaBuffer.resonance = {
                score: parsed.score as number,
                delta: typeof parsed.delta === "number" ? parsed.delta : 0,
                topOverlap: Array.isArray(parsed.top_overlap)
                  ? (parsed.top_overlap as { axis: string; closeness: number }[])
                  : [],
              };
              scheduleFlush();
            } else {
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) {
                contentBuffer += content;
                scheduleFlush();
              }
            }
          } catch (error) {
            logWarn("Chat store skipped malformed SSE delta", {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    }
    // Flush any remaining buffered content
    if (flushTimer) clearTimeout(flushTimer);
    flushBuffer();
    // After stream ends, check if the assistant message is still empty (all deltas failed to parse)
    const lastMsgCheck = get().messages[get().messages.length - 1];
    if (lastMsgCheck && lastMsgCheck.role === "assistant" && !lastMsgCheck.content) {
      set((s) => {
        const msgs = [...s.messages];
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: copy.parseError, error: true };
        return { messages: msgs };
      });
    }
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      aborted = true;
      set((s) => {
        const msgs = [...s.messages];
        const last = msgs[msgs.length - 1];
        if (!last || last.role !== "assistant") {
          return { isStreaming: false, pendingUsageMode: null, abortController: null };
        }
        if (!last.content.trim()) {
          msgs.pop();
        }
        return {
          messages: msgs,
          isStreaming: false,
          pendingUsageMode: null,
          abortController: null,
        };
      });
      return;
    }
    console.error("[Chat]", e);
    set((s) => {
      const msgs = [...s.messages];
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: copy.streamError, error: true };
      return { messages: msgs };
    });
  } finally {
    try {
      await useAgentStore.getState().fetchAgentState({ silent: true });
    } catch (e) {
      console.error("[Chat] agent refresh failed", e);
    }
    // Roll variable reward on successful completion (delegated to reward-middleware)
    const lastMsg = get().messages[get().messages.length - 1];
    if (!aborted && lastMsg && lastMsg.role === "assistant" && !lastMsg.error && lastMsg.content.length > 0) {
      const msgReward = processMessageReward(get().rewardProgress);
      set({
        lastReward: msgReward.lastReward ?? get().lastReward,
        rewardInventory: msgReward.rewardInventory,
        ...(msgReward.rewardProgress ? { rewardProgress: msgReward.rewardProgress } : {}),
      });

      if (get().pendingWeeklyEventCompletion) {
        const weeklyUpdate = processWeeklyEventReward();
        set({
          lastReward: weeklyUpdate.lastReward,
          rewardInventory: weeklyUpdate.rewardInventory,
          pendingWeeklyEventCompletion: false,
        });
      }
    }
    set({ isStreaming: false, pendingUsageMode: null, abortController: null });
  }
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isStreaming: false,
  abortController: null,
  historyLoaded: false,
  pendingUsageMode: null,
  lastLocale: undefined,
  lastReward: null,
  rewardInventory: readRewardInventory(),
  rewardProgress: getRewardProgress(readMessagesSinceReward(), 0),
  weeklyEvent: readWeeklyEventState(),
  weeklyEventProgress: getWeeklyEventProgress(readWeeklyEventState()),
  pendingWeeklyEventCompletion: false,
  lastResonance: null,
  clearReward: () => set({ lastReward: null }),
  hydrateRecentMessages: (messages) =>
    set((state) => ({
      messages: state.messages.length > 0 ? state.messages : messages,
      historyLoaded: true,
    })),
  injectGreeting: (greeting) =>
    set((state) => ({
      messages:
        state.messages.length === 0 || state.messages[0].role !== "assistant"
          ? [greeting, ...state.messages]
          : state.messages,
    })),
  stopStreaming: () => {
    const controller = get().abortController;
    controller?.abort();
    const locale = get().lastLocale;
    const copy = getLocaleText(locale);
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === "assistant" && !last.content.trim()) {
        msgs[msgs.length - 1] = { ...last, content: copy.stopped, error: false };
      }
      return {
        messages: msgs,
        isStreaming: false,
        pendingUsageMode: null,
        abortController: null,
      };
    });
  },
  claimDailyLoginBonus: (streakDays = 0) => {
    if (hasClaimedDailyLoginBonus()) return;

    const reward = createDailyLoginReward(streakDays);
    const freshInventory = readRewardInventory();
    const nextInventory = applyRewardToInventory(freshInventory, reward);
    writeRewardInventory(nextInventory);
    markDailyLoginBonusClaimed();

    set((state) => ({
      lastReward: state.lastReward ?? reward,
      rewardInventory: nextInventory,
      rewardProgress: getRewardProgress(state.rewardProgress.messagesSinceReward, streakDays),
    }));

    haptic("receive");
    playSound("receive");
  },
  sendMessage: async (message: string, meta?: MessageMeta) => {
    if (get().isStreaming) return;
    const source = meta?.source ?? "input";
    const currentUserMessages = get().messages.filter((item) => item.role === "user").length;
    const persistedMessages = meta?.totalMessages ?? 0;
    const isFirstMessage = persistedMessages === 0 && currentUserMessages === 0;

    trackClientEvent(CLIENT_EVENT.messageSent, {
      experiment_key: meta?.experiment_key ?? null,
      experiment_variant: meta?.experiment_variant ?? null,
      is_first_message: isFirstMessage,
      source,
    });
    if (isFirstMessage) {
      trackClientEvent(CLIENT_EVENT.firstMessageSent, {
        experiment_key: meta?.experiment_key ?? null,
        experiment_variant: meta?.experiment_variant ?? null,
        source,
      });
    }

    const weeklyEventResult = registerWeeklyEventMessage(get().weeklyEvent);
    writeWeeklyEventState(weeklyEventResult.state);
    set({
      weeklyEvent: weeklyEventResult.state,
      weeklyEventProgress: getWeeklyEventProgress(weeklyEventResult.state),
      pendingWeeklyEventCompletion: weeklyEventResult.completedNow,
    });
    haptic("send");
    playSound("send");
    set((s) => {
      // Cap message history at 200 to prevent unbounded memory growth
      const MAX_MESSAGES = 200;
      const trimmed = s.messages.length >= MAX_MESSAGES
        ? s.messages.slice(-MAX_MESSAGES + 2)
        : s.messages;
      const controller = new AbortController();
      return {
        messages: [...trimmed, createMessage("user", message)],
        isStreaming: true,
        abortController: controller,
        pendingUsageMode: detectPrimaryUsageModeFromText(message),
      };
    });
    set((s) => ({ messages: [...s.messages, createMessage("assistant", "")] }));

    set({ lastLocale: meta?.locale });
    await handleStreamResponse(message, set as ChatSetter, get, meta?.locale);
  },
  retryLastMessage: async () => {
    const s = get();
    if (s.isStreaming || s.messages.length < 2) return;
    const lastAsstMsg = s.messages[s.messages.length - 1];
    const lastUserMsg = s.messages[s.messages.length - 2];
    
    if (lastAsstMsg.role === "assistant" && lastAsstMsg.error && lastUserMsg.role === "user") {
      set((state) => {
        const msgs = [...state.messages];
        const controller = new AbortController();
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: "", error: false };
        return { messages: msgs, isStreaming: true, abortController: controller };
      });
      await handleStreamResponse(lastUserMsg.content, set as ChatSetter, get, get().lastLocale);
    }
  }
}));
