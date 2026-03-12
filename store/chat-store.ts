import { create } from "zustand";
import { useAgentStore } from "@/store/agent-store";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { detectPrimaryUsageModeFromText } from "@/lib/identity/usage-profile";

interface Message { role: "user" | "assistant"; content: string }
type MessageMeta = {
  experiment_key?: string;
  experiment_variant?: string;
  source?: "input" | "prompt" | "cta";
};
interface ChatStore {
  messages: Message[];
  isStreaming: boolean;
  pendingUsageMode: string | null;
  sendMessage: (message: string, meta?: MessageMeta) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [], isStreaming: false, pendingUsageMode: null,
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

    set((s) => ({
      messages: [...s.messages, { role: "user", content: message }],
      isStreaming: true,
      pendingUsageMode: detectPrimaryUsageModeFromText(message),
    }));
    set((s) => ({ messages: [...s.messages, { role: "assistant", content: "" }] }));

    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      if (!res.ok) throw new Error(`${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Missing response stream");
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        for (const line of text.split("\n")) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const content = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || "";
              if (content) {
                set((s) => {
                  const msgs = [...s.messages];
                  msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: msgs[msgs.length - 1].content + content };
                  return { messages: msgs };
                });
              }
            } catch {}
          }
        }
      }
    } catch (e) {
      console.error("[Chat]", e);
      set((s) => {
        const msgs = [...s.messages];
        msgs[msgs.length - 1] = { role: "assistant", content: "지금은 잠시 쉬고 있어요..." };
        return { messages: msgs };
      });
    } finally {
      try {
        await useAgentStore.getState().fetchAgentState({ silent: true });
      } catch (e) {
        console.error("[Chat] agent refresh failed", e);
      }
      set({ isStreaming: false, pendingUsageMode: null });
    }
  },
}));
