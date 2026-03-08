import { create } from "zustand";

interface Message { role: "user" | "assistant"; content: string }
interface ChatStore {
  messages: Message[];
  isStreaming: boolean;
  sendMessage: (message: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [], isStreaming: false,
  sendMessage: async (message: string) => {
    set((s) => ({ messages: [...s.messages, { role: "user", content: message }], isStreaming: true }));
    set((s) => ({ messages: [...s.messages, { role: "assistant", content: "" }] }));

    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = res.status === 429 ? (data.error || "잠시 후 다시 시도해 주세요") : (data.error || `오류 (${res.status})`);
        throw new Error(msg);
      }

      const reader = res.body?.getReader();
      if (!reader) return;
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
      const errMsg = e instanceof Error ? e.message : "지금은 잠시 쉬고 있어요...";
      set((s) => {
        const msgs = [...s.messages];
        msgs[msgs.length - 1] = { role: "assistant", content: errMsg };
        return { messages: msgs };
      });
    }
    set({ isStreaming: false });
  },
}));
