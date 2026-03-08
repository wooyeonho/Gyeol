import { create } from "zustand";

type Message = { role: string; content: string };

type ChatStore = {
  messages: Message[];
  isStreaming: boolean;
  sendMessage: (message: string) => Promise<void>;
};

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isStreaming: false,

  async sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed) return;
    set((s) => ({
      messages: [...s.messages, { role: "user", content: trimmed }],
      isStreaming: true,
    }));
    let streamed = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set((s) => ({
          messages: [...s.messages, { role: "assistant", content: "Something went wrong." }],
          isStreaming: false,
        }));
        return;
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          streamed += decoder.decode(value, { stream: true });
          set((s) => {
            const rest = s.messages.slice(0, -1);
            const last = s.messages[s.messages.length - 1];
            if (last?.role === "user") {
              return {
                messages: [...rest, last, { role: "assistant", content: streamed }],
              };
            }
            return {
              messages: s.messages.map((m, i) =>
                i === s.messages.length - 1 ? { ...m, content: streamed } : m
              ),
            };
          });
        }
      }
    } catch (e) {
      console.error("sendMessage error", e);
      set((s) => ({
        messages: [...s.messages, { role: "assistant", content: "Network error." }],
      }));
    } finally {
      set({ isStreaming: false });
    }
  },
}));
