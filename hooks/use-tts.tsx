"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type TTSVoiceParams = {
  pitch?: number;
  speed?: number;
  tremor?: number; // Tremor is hard to simulate natively, but we can modulate volume slightly or just ignore it for native TTS
  lang?: string;
};

export function useTTS(params: TTSVoiceParams) {
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!synthRef.current) return;
      
      stop();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Attempt to map params
      utterance.pitch = params.pitch ?? 1;
      utterance.rate = params.speed ?? 1;
      // Note: Web Speech API 'pitch' ranges from 0 to 2 (default 1)
      // 'rate' ranges from 0.1 to 10 (default 1)
      
      utterance.lang = params.lang ?? "ko-KR"; // Default to Korean

      // Try to find a suitable voice
      const voices = synthRef.current.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith(utterance.lang.substring(0, 2)));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = (e) => {
        console.error("TTS Error", e);
        setIsPlaying(false);
      };

      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    },
    [params, stop]
  );

  return { speak, stop, isPlaying };
}
