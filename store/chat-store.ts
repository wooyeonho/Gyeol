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
  rollReward,
  type RewardInventory,
  type RewardProgress,
  type RewardResult,
  writeMessagesSinceReward,
  writeRewardInventory,
} from "@/lib/rewards/variable-reward";
import { haptic, playSound } from "@/lib/micro-interactions";

interface Message { role: "user" | "assistant"; content: string; error?: boolean }
type MessageMeta = {
  experiment_key?: string;
  experiment_variant?: string;
  source?: "input" | "prompt" | "cta";
};
type ChatSetter = (
  partial: ChatStore | Partial<ChatStore> | ((state: ChatStore) => ChatStore | Partial<ChatStore>),
  replace?: boolean,
) => void;
interface ChatStore {
  messages: Message[];
  isStreaming: boolean;
  pendingUsageMode: string | null;
  lastReward: RewardResult | null;
  rewardInventory: RewardInventory;
  rewardProgress: RewardProgress;
  clearReward: () => void;
  claimDailyLoginBonus: (streakDays?: number) => void;
  sendMessage: (message: string, meta?: MessageMeta) => Promise<void>;
  retryLastMessage: () => Promise<void>;
}

function persistRewardState(inventory: RewardInventory, messagesSinceReward: number) {
  writeRewardInventory(inventory);
  writeMessagesSinceReward(messagesSinceReward);
}

async function handleStreamResponse(
  message: string,
  set: (partial: ChatStore | Partial<ChatStore> | ((state: ChatStore) => ChatStore | Partial<ChatStore>), replace?: boolean) => void,
  get: () => ChatStore
) {
  try {
    const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
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
      // Keep the last element — it may be an incomplete line from a TCP chunk boundary.
      sseBuffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          try {
            const content = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || "";
            if (content) {
              set((s) => {
                const msgs = [...s.messages];
                msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: msgs[msgs.length - 1].content + content, error: false };
                return { messages: msgs };
              });
            }
          } catch (error) {
            logWarn("Chat store skipped malformed SSE delta", {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("[Chat]", e);
    set((s) => {
      const msgs = [...s.messages];
      msgs[msgs.length - 1] = { role: "assistant", content: "결과 연결이 끊어졌어요.", error: true };
      return { messages: msgs };
    });
  } finally {
    try {
      await useAgentStore.getState().fetchAgentState({ silent: true });
    } catch (e) {
      console.error("[Chat] agent refresh failed", e);
    }
    // Roll variable reward on successful completion
    const lastMsg = get().messages[get().messages.length - 1];
    if (lastMsg && lastMsg.role === "assistant" && !lastMsg.error && lastMsg.content.length > 0) {
      const agentState = useAgentStore.getState().agentState;
      const streakDays = typeof agentState?.streak_days === "number" ? agentState.streak_days : 0;
      const previousMessagesSinceReward = get().rewardProgress.messagesSinceReward;
      const nextMessagesSinceReward = previousMessagesSinceReward + 1;
      const guaranteedProgress = getRewardProgress(nextMessagesSinceReward, streakDays);
      const reward = rollReward(streakDays, {
        forceReward: guaranteedProgress.messagesUntilGuaranteed === 0,
        source: "message",
      });

      if (reward.tier !== "none") {
        const nextInventory = applyRewardToInventory(get().rewardInventory, reward);
        persistRewardState(nextInventory, 0);
        set({
          lastReward: reward,
          rewardInventory: nextInventory,
          rewardProgress: getRewardProgress(0, streakDays),
        });
        if (reward.tier === "jackpot") {
          haptic("jackpot");
          playSound("jackpot");
        } else if (reward.tier === "large") {
          haptic("success");
          playSound("streak");
        } else {
          haptic("receive");
          playSound("receive");
        }
      } else {
        persistRewardState(get().rewardInventory, nextMessagesSinceReward);
        set({ rewardProgress: guaranteedProgress });
        haptic("receive");
        playSound("receive");
      }
    }
    set({ isStreaming: false, pendingUsageMode: null });
  }
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isStreaming: false,
  pendingUsageMode: null,
  lastReward: null,
  rewardInventory: readRewardInventory(),
  rewardProgress: getRewardProgress(readMessagesSinceReward(), 0),
  clearReward: () => set({ lastReward: null }),
  claimDailyLoginBonus: (streakDays = 0) => {
    if (hasClaimedDailyLoginBonus()) return;

    const reward = createDailyLoginReward(streakDays);
    const nextInventory = applyRewardToInventory(get().rewardInventory, reward);
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
  sendMessage: async (message: string, meta) => {
    const source = meta?.source ?? "input";
    const currentUserMessages = get().messages.filter((item) => item.role === "user").length;
    const persistedMessages =
      typeof useAgentStore.getState().agentState?.total_messages === "number"
        ? useAgentStore.getState().agentState!.total_messages as number
        : 0;
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

    set((s) => {
      // Cap message history at 200 to prevent unbounded memory growth
      const MAX_MESSAGES = 200;
      const trimmed = s.messages.length >= MAX_MESSAGES
        ? s.messages.slice(-MAX_MESSAGES + 2)
        : s.messages;
      return {
        messages: [...trimmed, { role: "user" as const, content: message }],
        isStreaming: true,
        pendingUsageMode: detectPrimaryUsageModeFromText(message),
      };
    });
    set((s) => ({ messages: [...s.messages, { role: "assistant" as const, content: "" }] }));

    await handleStreamResponse(message, set as ChatSetter, get);
  },
  retryLastMessage: async () => {
    const s = get();
    if (s.isStreaming || s.messages.length < 2) return;
    const lastAsstMsg = s.messages[s.messages.length - 1];
    const lastUserMsg = s.messages[s.messages.length - 2];
    
    if (lastAsstMsg.role === "assistant" && lastAsstMsg.error && lastUserMsg.role === "user") {
      set((state) => {
        const msgs = [...state.messages];
        msgs[msgs.length - 1] = { role: "assistant", content: "" };
        return { messages: msgs, isStreaming: true };
      });
      await handleStreamResponse(lastUserMsg.content, set as ChatSetter, get);
    }
  }
}));
