"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { generateInitialDNA, applySoftMutation, type CreatureDNA, DNA_AXES } from "@/lib/genome/dna";
import { DNAReveal } from "@/components/demo/dna-reveal";
import { FriendPreview } from "@/components/demo/friend-preview";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const DEMO_MAX_TURNS = 3;

const STARTER_PROMPTS = [
  "I feel like nobody really knows me",
  "What's the point of all this?",
  "I had the weirdest dream last night",
];

export default function DemoPage() {
  const searchParams = useSearchParams();
  const sharedDnaParam = searchParams.get("dna");
  const sharedReading = searchParams.get("reading");

  // If URL has ?dna= param, show friend's result first
  const [viewingFriend, setViewingFriend] = useState(!!sharedDnaParam);

  const [phase, setPhase] = useState<"intro" | "chat" | "reveal">("intro");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [dna, setDna] = useState<CreatureDNA>(() =>
    generateInitialDNA(`demo-${Date.now()}`)
  );
  const [userTurns, setUserTurns] = useState(0);
  const [soulReading, setSoulReading] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming || userTurns >= DEMO_MAX_TURNS) return;

      const userMsg: Message = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setIsStreaming(true);

      // Mutate DNA client-side for immediate feedback
      const { dna: newDna } = applySoftMutation(dna, text.trim());
      setDna(newDna);
      const newTurnCount = userTurns + 1;
      setUserTurns(newTurnCount);

      // Stream AI response
      const assistantMsg: Message = { role: "assistant", content: "" };
      setMessages([...newMessages, assistantMsg]);

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const res = await fetch("/api/demo/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            history: messages,
            dna,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No stream");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);

            // Check for metadata events
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "dna_shift" && parsed.dna) {
                setDna(parsed.dna);
                continue;
              }
            } catch {
              // Not JSON — it's text content
            }

            accumulated += data;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: accumulated,
              };
              return updated;
            });
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: "Something went wrong. Try again.",
            };
            return updated;
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;

        // Trigger reveal after 3rd turn — fetch soul reading first
        if (newTurnCount >= DEMO_MAX_TURNS) {
          fetch("/api/demo/reading", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dna: newDna, history: newMessages }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.reading) setSoulReading(data.reading);
            })
            .catch(() => {})
            .finally(() => {
              setTimeout(() => setPhase("reveal"), 1500);
            });
        }
      }
    },
    [messages, isStreaming, dna, userTurns]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  const handleContinue = useCallback(() => {
    // Preserve demo DNA so it transfers to the new account
    try {
      sessionStorage.setItem("gyeol_demo_dna", JSON.stringify(dna));
      if (soulReading) sessionStorage.setItem("gyeol_demo_reading", soulReading);
    } catch {}
    window.location.href = "/signup?from=demo";
  }, [dna, soulReading]);

  const handleShare = useCallback(() => {
    // Encode DNA into share URL for OG image + friend preview
    const dnaValues = DNA_AXES.map((a) => dna[a].toFixed(2)).join(",");
    const shareParams = new URLSearchParams({ dna: dnaValues });
    if (soulReading) shareParams.set("reading", soulReading.slice(0, 200));
    const url = `${window.location.origin}/demo?${shareParams.toString()}`;

    const text = soulReading
      ? `"${soulReading}" — my AI-generated soul reading from 3 messages. Try it:`
      : "I just discovered my Gyeol — a living AI being shaped by my words. Try it:";

    if (navigator.share) {
      navigator.share({ title: "My Gyeol", text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text} ${url}`).then(() => {
        alert("Link copied!");
      }).catch(() => {});
    }
  }, [dna, soulReading]);

  // Friend preview — show shared creature, then let visitor try their own
  if (viewingFriend && sharedDnaParam) {
    const vals = sharedDnaParam.split(",").map(Number);
    const friendDna = {} as CreatureDNA;
    DNA_AXES.forEach((axis, i) => {
      (friendDna as Record<string, number>)[axis] = vals[i] != null && !isNaN(vals[i]) ? Math.max(0, Math.min(1, vals[i])) : 0.5;
    });
    return (
      <FriendPreview
        dna={friendDna}
        reading={sharedReading || null}
        onTryOwn={() => {
          setViewingFriend(false);
          // Clean URL without reload
          window.history.replaceState({}, "", "/demo");
        }}
      />
    );
  }

  // Intro screen
  if (phase === "intro") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center max-w-md"
        >
          {/* Glowing orb */}
          <motion.div
            className="relative w-24 h-24 mx-auto mb-8"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 blur-xl opacity-40" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-white/80" />
            </div>
          </motion.div>

          <h1 className="text-2xl font-bold text-white mb-3">
            Every word shapes a living being.
          </h1>
          <p className="text-white/50 text-sm leading-relaxed mb-8">
            Talk for 3 messages. Watch your unique AI creature emerge from the conversation — its personality, appearance, and species, all shaped by you.
          </p>

          <motion.button
            onClick={() => {
              setPhase("chat");
              setTimeout(() => inputRef.current?.focus(), 300);
            }}
            className="px-8 py-3 rounded-2xl bg-white text-black text-sm font-semibold transition-transform active:scale-95"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Begin
          </motion.button>

          <p className="mt-6 text-xs text-white/30">
            No sign-up needed. Takes 2 minutes.
          </p>
        </motion.div>
      </div>
    );
  }

  // Reveal screen
  if (phase === "reveal") {
    return (
      <DNAReveal
        dna={dna}
        soulReading={soulReading}
        onContinue={handleContinue}
        onShare={handleShare}
      />
    );
  }

  // Chat screen
  const turnsLeft = DEMO_MAX_TURNS - userTurns;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mini creature indicator */}
          <motion.div
            className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center"
            animate={isStreaming ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <div className="w-2 h-2 rounded-full bg-white/80" />
          </motion.div>
          <div>
            <p className="text-sm font-medium text-white">New Being</p>
            <p className="text-xs text-white/40">Awakening...</p>
          </div>
        </div>
        <div className="text-xs text-white/40">
          {turnsLeft > 0 ? (
            <span>{turnsLeft} message{turnsLeft > 1 ? "s" : ""} until reveal</span>
          ) : (
            <span>Analyzing...</span>
          )}
        </div>
      </div>

      {/* DNA progress bar */}
      <div className="flex-shrink-0 h-0.5 bg-white/[0.04]">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
          animate={{ width: `${(userTurns / DEMO_MAX_TURNS) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center py-8"
          >
            <p className="text-sm text-white/50 mb-6">
              Say anything. Your words will shape a unique being.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="px-4 py-2 rounded-2xl text-xs text-white/60 border border-white/10 hover:border-white/20 hover:text-white/80 transition-all active:scale-95"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-white/[0.12] text-white"
                  : "bg-white/[0.04] border border-white/[0.08] text-white/85"
              }`}
            >
              {msg.content}
              {msg.role === "assistant" && isStreaming && i === messages.length - 1 && (
                <span className="inline-block w-0.5 h-4 bg-white/50 ml-0.5 animate-pulse" />
              )}
            </div>
          </motion.div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2">
        {turnsLeft > 0 ? (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Say something..."
              rows={1}
              disabled={isStreaming}
              className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-white/20 disabled:opacity-50"
              style={{ maxHeight: 120 }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="px-4 py-3 rounded-2xl bg-white text-black text-sm font-medium disabled:opacity-30 transition-all active:scale-95"
            >
              Send
            </button>
          </form>
        ) : (
          <div className="text-center py-3">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-white/50"
            >
              Reading your pattern...
            </motion.p>
          </div>
        )}
      </div>
    </div>
  );
}
