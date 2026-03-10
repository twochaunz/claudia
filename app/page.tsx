"use client";

import { useState, useCallback, useRef, KeyboardEvent } from "react";
import Image from "next/image";
import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [landingValue, setLandingValue] = useState("");
  const landingRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsThinking(true);

    const baseDelay = 1500;
    const perChar = 30 * text.length;
    const jitter = Math.random() * 2000 - 1000;
    const delay = Math.min(baseDelay + perChar + jitter, 12000);
    setTimeout(() => {
      setIsThinking(false);
      setMessages((prev) => [...prev, { role: "assistant", content: "si papi" }]);
    }, delay);
  }, []);

  const handleLandingSend = () => {
    const trimmed = landingValue.trim();
    if (!trimmed) return;
    handleSend(trimmed);
    setLandingValue("");
  };

  const handleLandingKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleLandingSend();
    }
  };

  const hasMessages = messages.length > 0 || isThinking;

  if (!hasMessages) {
    return (
      <div
        className="grid place-items-center h-dvh overflow-hidden"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <div className="w-full max-w-3xl px-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Image
              src="/claude-logo.svg"
              alt="Claudia"
              width={32}
              height={32}
            />
            <h1
              className="text-[32px] font-normal"
              style={{ color: "var(--text-primary)" }}
            >
              Claudia
            </h1>
          </div>
          <div
            className="flex items-center gap-2 rounded-2xl border px-4 py-3"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--input-border)",
              boxShadow: "0 0.25rem 1.25rem rgba(0,0,0,0.035)",
            }}
          >
            <textarea
              ref={landingRef}
              value={landingValue}
              onChange={(e) => setLandingValue(e.target.value)}
              onKeyDown={handleLandingKeyDown}
              autoFocus
              placeholder="How can I help you today?"
              rows={1}
              className="flex-1 resize-none bg-transparent text-[15px] leading-relaxed outline-none font-sans-input placeholder:text-[var(--text-secondary)]"
              style={{ color: "var(--text-primary)" }}
            />
            <button
              onClick={handleLandingSend}
              disabled={!landingValue.trim()}
              aria-label="Send"
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors disabled:opacity-30"
              style={{
                backgroundColor: landingValue.trim() ? "var(--accent-orange)" : "var(--border-color)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 14V2M8 2L3 7M8 2L13 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <header
        className="flex items-center justify-center py-3 border-b"
        style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-primary)" }}
      >
        <div className="flex items-center gap-2">
          <img src="/claude-logo.svg" alt="Claudia" width={24} height={24} />
          <span className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Claudia
          </span>
        </div>
      </header>

      <MessageList messages={messages} isThinking={isThinking} />

      <ChatInput onSend={handleSend} disabled={isThinking} />
    </div>
  );
}
