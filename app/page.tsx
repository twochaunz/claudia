"use client";

import { useState, useCallback } from "react";
import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsThinking(true);

    // Scale thinking time with message length: ~1.5s base + 30ms per char, capped at 12s
    const baseDelay = 1500;
    const perChar = 30 * text.length;
    const jitter = Math.random() * 2000 - 1000; // +/- 1s randomness
    const delay = Math.min(baseDelay + perChar + jitter, 12000);
    setTimeout(() => {
      setIsThinking(false);
      setMessages((prev) => [...prev, { role: "assistant", content: "si papi" }]);
    }, delay);
  }, []);

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-center py-3 border-b"
        style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-primary)" }}
      >
        <div className="flex items-center gap-2">
          <img src="/claude-logo.svg" alt="Claude" width={24} height={24} />
          <span className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Claude
          </span>
        </div>
      </header>

      {/* Messages */}
      <MessageList messages={messages} isThinking={isThinking} />

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isThinking} />
    </div>
  );
}
