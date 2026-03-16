"use client";

import { useCallback, useRef, useState } from "react";

export type VoiceInputState = "idle" | "recording" | "transcribing";

export function useVoiceInput(opts: { language?: string; onTranscript: (text: string) => void }) {
  const [state, setState] = useState<VoiceInputState>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }, []);

  const transcribe = useCallback(
    async (audioBlob: Blob) => {
      setState("transcribing");
      setError(null);
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        if (opts.language) {
          formData.append("language", opts.language);
        }

        const res = await fetch("/api/stt", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errData.error ?? `STT failed (${res.status})`);
        }

        const data = (await res.json()) as { text?: string };
        const text = (data.text ?? "").trim();
        if (text) {
          opts.onTranscript(text);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Transcription failed";
        setError(message);
        console.error("[VoiceInput]", e);
      } finally {
        setState("idle");
      }
    },
    [opts],
  );

  const startRecording = useCallback(async () => {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone not supported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        if (blob.size > 0) {
          void transcribe(blob);
        } else {
          setState("idle");
        }
      };

      recorder.onerror = () => {
        stopStream();
        setError("Recording failed");
        setState("idle");
      };

      recorder.start(250); // collect in 250ms chunks
      setState("recording");
    } catch (e) {
      stopStream();
      const message =
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone permission denied"
          : "Could not start recording";
      setError(message);
      setState("idle");
    }
  }, [stopStream, transcribe]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      stopStream();
      setState("idle");
    }
  }, [stopStream]);

  const toggle = useCallback(() => {
    if (state === "recording") {
      stopRecording();
    } else if (state === "idle") {
      void startRecording();
    }
    // If transcribing, ignore toggle
  }, [state, startRecording, stopRecording]);

  return { state, error, toggle, startRecording, stopRecording };
}
