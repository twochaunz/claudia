"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type Persona = "claudia" | "consuela";

const CONSUELA_QUOTES = [
  "No, no, no",
  "No... no... no... I stay",
  "Oh, no... no",
  "No... no... Mr. Superman no home",
  "No... no... no is... no",
  "No... no... afuera",
  "I... nooo... no",
  "No... I keep job",
];

function getResponse(persona: Persona): string {
  if (persona === "consuela") {
    return CONSUELA_QUOTES[Math.floor(Math.random() * CONSUELA_QUOTES.length)];
  }
  return "si papi";
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingResponse, setPendingResponse] = useState<string | null>(null);
  const [persona, setPersona] = useState<Persona>("claudia");

  // Ref to avoid stale closure in handleTypingComplete
  const pendingResponseRef = useRef<string | null>(null);
  useEffect(() => { pendingResponseRef.current = pendingResponse; }, [pendingResponse]);

  const handleSend = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsThinking(true);

    const baseDelay = 1500;
    const perChar = 30 * text.length;
    const jitter = Math.random() * 2000 - 1000;
    const delay = Math.min(baseDelay + perChar + jitter, 12000);
    setTimeout(() => {
      setIsThinking(false);
      setIsTyping(true);
      setPendingResponse(getResponse(persona));
    }, delay);
  }, [persona]);

  // Stable callback identity — reads pendingResponse from ref, not closure
  const handleTypingComplete = useCallback(() => {
    const response = pendingResponseRef.current;
    if (response !== null) {
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    }
    setIsTyping(false);
    setPendingResponse(null);
  }, []);

  const handlePersonaChange = (newPersona: Persona) => {
    setPersona(newPersona);
  };

  const displayName = persona === "claudia" ? "Claudia" : "Consuela";
  const logoSrc = persona === "claudia" ? "/claude-logo.svg" : "/consuela-logo.svg";
  const hasMessages = messages.length > 0 || isThinking || isTyping;

  if (!hasMessages) {
    return (
      <div
        className="grid place-items-center h-dvh overflow-hidden"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <div className="w-full max-w-3xl px-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Image
              src={logoSrc}
              alt={displayName}
              width={32}
              height={32}
            />
            <h1
              className="text-[32px] font-normal"
              style={{ color: "var(--text-primary)" }}
            >
              {displayName}
            </h1>
          </div>

          <ChatInput
            onSend={handleSend}
            disabled={isThinking || isTyping}
            persona={persona}
            onPersonaChange={handlePersonaChange}
            isLanding
          />

        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <header
        className="flex items-center justify-center px-4 py-3 border-b"
        style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-primary)" }}
      >
        <div className="flex items-center gap-2">
          <img src={logoSrc} alt={displayName} width={24} height={24} />
          <span className="text-[24px] font-normal" style={{ color: "var(--text-primary)" }}>
            {displayName}
          </span>
        </div>
      </header>

      <MessageList
        messages={messages}
        isThinking={isThinking}
        isTyping={isTyping}
        pendingResponse={pendingResponse}
        logoSrc={logoSrc}
        onTypingComplete={handleTypingComplete}
      />

      <ChatInput
        onSend={handleSend}
        disabled={isThinking || isTyping}
        persona={persona}
        onPersonaChange={handlePersonaChange}
      />
      <p
        className="text-center text-[13px] pb-2"
        style={{ color: "var(--text-secondary)" }}
      >
        Claudia and Consuela can make mistakes. Please double-check responses.
      </p>
    </div>
  );
}
