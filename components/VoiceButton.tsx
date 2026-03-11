"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!supported) return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const transcript = last[0].transcript.trim();
        if (transcript) {
          onTranscript(transcript);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "aborted") {
        console.error("Speech recognition error:", event.error);
        stop();
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          stop();
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [supported, onTranscript, stop]);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
    } else {
      start();
    }
  }, [listening, start, stop]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  return (
    <button
      onClick={toggle}
      disabled={disabled || !supported}
      aria-label={listening ? "Stop listening" : "Start voice input"}
      className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 cursor-pointer bg-transparent border-none ${listening ? "voice-pulse" : ""}`}
      style={{
        color: listening ? "var(--accent-orange)" : "var(--text-secondary)",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="4" y="10" width="2" height="4" rx="1" fill="currentColor" />
        <rect x="8" y="7" width="2" height="10" rx="1" fill="currentColor" />
        <rect x="12" y="4" width="2" height="16" rx="1" fill="currentColor" />
        <rect x="16" y="7" width="2" height="10" rx="1" fill="currentColor" />
        <rect x="20" y="10" width="2" height="4" rx="1" fill="currentColor" />
      </svg>
    </button>
  );
}
