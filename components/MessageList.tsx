"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { TypedResponse } from "./TypedResponse";
import { AnimatedLogo } from "./AnimatedLogo";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type Phase = "idle" | "scrolling" | "thinking" | "transitioning" | "typing" | "settled";

interface MessageListProps {
  messages: Message[];
  isThinking: boolean;
  pendingResponse: string | null;
  logoSrc?: string;
  onTypingComplete: () => void;
}

export function MessageList({
  messages,
  isThinking,
  pendingResponse,
  logoSrc = "/claude-logo.svg",
  onTypingComplete,
}: MessageListProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const latestUserRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- Phase sequencer: react to external prop changes ---

  // idle → scrolling: when isThinking becomes true
  useEffect(() => {
    if (isThinking && phase === "idle") {
      setPhase("scrolling");
    }
  }, [isThinking, phase]);

  // scrolling: trigger scroll and wait for completion
  useEffect(() => {
    if (phase !== "scrolling") return;

    // Scroll the latest user message to top
    if (latestUserRef.current) {
      latestUserRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const container = scrollContainerRef.current;
    const fallbackTimer = setTimeout(() => setPhase("thinking"), 1000);

    if (container) {
      const onScrollEnd = () => {
        clearTimeout(fallbackTimer);
        setPhase("thinking");
      };
      container.addEventListener("scrollend", onScrollEnd, { once: true });
      return () => {
        clearTimeout(fallbackTimer);
        container.removeEventListener("scrollend", onScrollEnd);
      };
    }

    return () => clearTimeout(fallbackTimer);
  }, [phase]);

  // thinking → transitioning: when pendingResponse arrives
  useEffect(() => {
    if (pendingResponse !== null && (phase === "thinking" || phase === "scrolling")) {
      setPhase("transitioning");
    }
  }, [pendingResponse, phase]);

  // transitioning → typing: after thinking fade-out (250ms fallback)
  useEffect(() => {
    if (phase !== "transitioning") return;
    const timer = setTimeout(() => setPhase("typing"), 250);
    return () => clearTimeout(timer);
  }, [phase]);

  // settled → scrolling: when a new message cycle starts
  useEffect(() => {
    if (isThinking && phase === "settled") {
      setPhase("scrolling");
    }
  }, [isThinking, phase]);

  // Edge case: props reset without completing cycle — return to idle
  useEffect(() => {
    if (!isThinking && pendingResponse === null && phase !== "idle" && phase !== "settled") {
      setPhase("idle");
    }
  }, [isThinking, pendingResponse, phase]);

  // --- Typing complete handler ---
  const handleTypingDone = useCallback(() => {
    setPhase("settled");
    onTypingComplete();
  }, [onTypingComplete]);

  // --- Derived state ---
  const lastUserIndex = messages.reduce(
    (acc, msg, i) => (msg.role === "user" ? i : acc),
    -1,
  );

  const isActive = phase !== "idle";
  const thinkingVisible = phase === "thinking";
  const thinkingOpacity = phase === "thinking" ? 1 : 0;
  const responseOpacity = phase === "typing" || phase === "settled" ? 1 : 0;
  const logoPhase = phase === "typing" ? "typing" : phase === "settled" ? "settled" : "thinking";

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto chat-scroll relative">
      {/* Gradient fade at top */}
      <div
        className="sticky top-0 left-0 right-0 h-12 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, var(--bg-primary) 0%, transparent 100%)",
        }}
      />
      <div className="max-w-3xl mx-auto px-4 pb-6 -mt-6">
        {messages.map((msg, i) => (
          <div key={i}>
            {i === lastUserIndex && <div ref={latestUserRef} />}
            <ChatMessage role={msg.role} content={msg.content} />
          </div>
        ))}

        {/* Active response area */}
        {isActive && (
          <div>
            {/* Content area: stacked thinking + response */}
            <div className="relative">
              {/* Thinking content — absolutely positioned, no layout impact */}
              <div
                data-testid="thinking-wrapper"
                className="absolute inset-x-0 top-0"
                style={{ opacity: thinkingOpacity, transition: "opacity 200ms ease-out" }}
              >
                <ThinkingIndicator isVisible={thinkingVisible} />
              </div>

              {/* Response content — in normal flow, controls container height */}
              {(phase === "typing" || phase === "settled") && pendingResponse !== null && (
                <div style={{ opacity: responseOpacity, transition: "opacity 200ms ease-in", minHeight: "60px" }}>
                  <TypedResponse
                    text={pendingResponse}
                    onComplete={handleTypingDone}
                  />
                </div>
              )}

              {/* Min-height during thinking so the absolute content has space */}
              {phase !== "typing" && phase !== "settled" && (
                <div style={{ minHeight: "60px" }} />
              )}
            </div>

            {/* Persistent logo */}
            <div className="flex justify-start mt-3">
              <AnimatedLogo logoSrc={logoSrc} phase={logoPhase} size={28} />
            </div>
          </div>
        )}

        {/* Spacer — enough so the latest user message can scroll to top */}
        <div className="h-[60dvh]" />
      </div>
    </div>
  );
}
