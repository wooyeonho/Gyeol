"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { hapticWithFallback } from "@/lib/micro-interactions";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  locale?: string;
}

type RecordingState = "idle" | "recording" | "processing";

/**
 * Voice input button using Web Speech API.
 * Microphone → STT → fills chat input.
 * Falls back gracefully when API is unavailable.
 */
export function VoiceInput({ onTranscript, disabled = false, locale = "ko" }: VoiceInputProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isKo = locale === "ko";

  const isSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const btnRef = useRef<HTMLButtonElement>(null);

  const startRecording = useCallback(() => {
    if (!isSupported || disabled) return;
    hapticWithFallback("tap", btnRef.current);

    setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    // Auto-detect language from locale
    recognition.lang = locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setState("recording");
    recognition.onend = () => setState("idle");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      setState("processing");
      const transcript = (event.results[0]?.[0]?.transcript ?? "") as string;
      if (transcript) onTranscript(transcript);
      setState("idle");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      setState("idle");
      if (event.error === "not-allowed") {
        setError(isKo ? "마이크 권한을 허용해 주세요" : "Microphone permission denied");
      } else if (event.error !== "no-speech") {
        setError(isKo ? "인식 실패. 다시 시도해 주세요" : "Recognition failed. Try again");
      }
    };

    recognition.start();
  }, [isSupported, disabled, locale, isKo, onTranscript]);

  const stopRecording = useCallback(() => {
    hapticWithFallback("tap", btnRef.current);
    recognitionRef.current?.stop();
    setState("idle");
  }, []);

  if (!isSupported) return null;

  return (
    <div className="relative flex items-center">
      <motion.button
        ref={btnRef}
        type="button"
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          state === "recording"
            ? "bg-red-500/20 text-red-400 border border-red-500/40"
            : state === "processing"
            ? "bg-white/10 text-white/40"
            : "bg-white/[0.06] text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70"
        }`}
        onClick={state === "recording" ? stopRecording : startRecording}
        disabled={disabled || state === "processing"}
        aria-label={
          state === "recording"
            ? (isKo ? "녹음 중단" : "Stop recording")
            : (isKo ? "음성 입력" : "Voice input")
        }
        whileTap={{ scale: 0.92 }}
      >
        {state === "recording" ? (
          // Animated mic — pulsing red circle
          <motion.div
            className="h-3 w-3 rounded-full bg-red-400"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          />
        ) : state === "processing" ? (
          <motion.svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="30 14" />
          </motion.svg>
        ) : (
          // Mic icon
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
          </svg>
        )}
      </motion.button>

      {/* Error tooltip */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="absolute bottom-full right-0 mb-2 w-48 rounded-lg border border-red-500/30 bg-black/90 px-2.5 py-1.5 text-[10px] text-red-400 backdrop-blur-sm"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
