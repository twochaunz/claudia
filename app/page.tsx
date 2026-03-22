"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";
import { AnimatedLogo } from "@/components/AnimatedLogo";

interface Message {
  role: "user" | "assistant";
  content: string;
  logoSrc?: string;
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
  const [pendingResponse, setPendingResponse] = useState<string | null>(null);
  const [persona, setPersona] = useState<Persona>("claudia");

  // Refs to avoid stale closures in handleTypingComplete
  const pendingResponseRef = useRef<string | null>(null);
  const pendingLogoRef = useRef<string>("/claude-logo.svg");
  useEffect(() => { pendingResponseRef.current = pendingResponse; }, [pendingResponse]);

  const handleSend = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsThinking(true);
    pendingLogoRef.current = persona === "claudia" ? "/claude-logo.svg" : "/consuela-logo.svg";

    // Left-skewed distribution: 2s–5s, favoring shorter delays
    const delay = 2000 + Math.pow(Math.random(), 2) * 3000;
    setTimeout(() => {
      setIsThinking(false);
      setPendingResponse(getResponse(persona));
    }, delay);
  }, [persona]);

  // Stable callback identity — reads pendingResponse from ref, not closure
  const handleTypingComplete = useCallback(() => {
    const response = pendingResponseRef.current;
    if (response !== null) {
      setMessages((prev) => [...prev, { role: "assistant", content: response, logoSrc: pendingLogoRef.current }]);
    }
    setPendingResponse(null);
  }, []);

  const handlePersonaChange = (newPersona: Persona) => {
    setPersona(newPersona);
  };

  const handleReset = useCallback(() => {
    setMessages([]);
    setIsThinking(false);
    setPendingResponse(null);
  }, []);

  const displayName = persona === "claudia" ? "Claudia" : "Consuela";
  const logoSrc = persona === "claudia" ? "/claude-logo.svg" : "/consuela-logo.svg";
  const hasMessages = messages.length > 0 || isThinking || pendingResponse !== null;

  if (!hasMessages) {
    return (
      <div
        className="grid place-items-center h-dvh overflow-hidden"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <div className="w-full max-w-3xl px-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <AnimatedLogo logoSrc={logoSrc} phase="settled" size={logoSrc.includes("consuela") ? 44 : 56} onClick={() => {}} />
            <h1
              className="text-[40px] font-normal"
              style={{ color: "var(--text-primary)" }}
            >
              {displayName}
            </h1>
          </div>

          <ChatInput
            onSend={handleSend}
            disabled={isThinking || pendingResponse !== null}
            persona={persona}
            onPersonaChange={handlePersonaChange}
            isLanding
          />

        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh" style={{ backgroundColor: "var(--bg-primary)" }}>
      <MessageList
        messages={messages}
        isThinking={isThinking}
        pendingResponse={pendingResponse}
        logoSrc={logoSrc}
        displayName={displayName}
        onTypingComplete={handleTypingComplete}
        onReset={handleReset}
      />

      <ChatInput
        onSend={handleSend}
        disabled={isThinking || pendingResponse !== null}
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
