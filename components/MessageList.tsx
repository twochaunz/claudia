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

type Phase = "idle" | "scrolling" | "thinking" | "transitioning" | "typing" | "settled" | "settling";

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
  const spacerRef = useRef<HTMLDivElement>(null);

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

  // settled/settling → scrolling: when a new message cycle starts
  // Commits the current response immediately (since handleTypingDone no longer calls onTypingComplete)
  useEffect(() => {
    if (isThinking && (phase === "settled" || phase === "settling")) {
      if (phase === "settling" && spacerRef.current) {
        // Reset spacer inline styles before committing
        spacerRef.current.style.height = "";
        spacerRef.current.style.transition = "";
      }
      onTypingComplete(); // Always commit, whether settled or settling
      setPhase("scrolling");
    }
  }, [isThinking, phase, onTypingComplete]);

  // Edge case: props reset without completing cycle — return to idle
  useEffect(() => {
    if (!isThinking && pendingResponse === null && phase !== "idle" && phase !== "settled" && phase !== "settling") {
      setPhase("idle");
    }
  }, [isThinking, pendingResponse, phase]);

  // --- Settling phase ---

  // settled → settling: after rotation ease-out (500ms)
  useEffect(() => {
    if (phase !== "settled") return;
    const timer = setTimeout(() => setPhase("settling"), 500);
    return () => clearTimeout(timer);
  }, [phase]);

  // Handle settling complete: clear spacer styles, commit message, go idle
  const handleSettlingComplete = useCallback(() => {
    if (spacerRef.current) {
      spacerRef.current.style.height = "";
      spacerRef.current.style.transition = "";
    }
    onTypingComplete();
    setPhase("idle");
  }, [onTypingComplete]);

  // settling: animate spacer height to 0
  useEffect(() => {
    if (phase !== "settling" || !spacerRef.current) return;

    const spacer = spacerRef.current;
    // Capture current height as concrete px value
    spacer.style.height = `${spacer.offsetHeight}px`;

    // Next frame: animate to 0
    const raf = requestAnimationFrame(() => {
      spacer.style.transition = "height 400ms ease-in";
      spacer.style.height = "0px";
    });

    const fallback = setTimeout(handleSettlingComplete, 450);
    const onEnd = () => {
      clearTimeout(fallback);
      handleSettlingComplete();
    };
    spacer.addEventListener("transitionend", onEnd, { once: true });

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
      spacer.removeEventListener("transitionend", onEnd);
    };
  }, [phase, handleSettlingComplete]);

  // --- Typing complete handler ---
  const handleTypingDone = useCallback(() => {
    setPhase("settled");
  }, []);

  // --- Derived state ---
  const lastUserIndex = messages.reduce(
    (acc, msg, i) => (msg.role === "user" ? i : acc),
    -1,
  );

  const isActive = phase !== "idle";
  const thinkingVisible = phase === "thinking";
  const thinkingOpacity = phase === "thinking" ? 1 : 0;
  const responseOpacity = phase === "typing" || phase === "settled" || phase === "settling" ? 1 : 0;
  const logoPhase = phase === "typing" ? "typing" : (phase === "settled" || phase === "settling") ? "settled" : "thinking";

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
            <ChatMessage role={msg.role} content={msg.content} logoSrc={logoSrc} />
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
              {(phase === "typing" || phase === "settled" || phase === "settling") && pendingResponse !== null && (
                <div style={{ opacity: responseOpacity, transition: "opacity 200ms ease-in", minHeight: "60px" }}>
                  <TypedResponse
                    text={pendingResponse}
                    onComplete={handleTypingDone}
                  />
                </div>
              )}

              {/* Min-height during thinking so the absolute content has space */}
              {phase !== "typing" && phase !== "settled" && phase !== "settling" && (
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
        <div ref={spacerRef} className="h-[60dvh]" />
      </div>
    </div>
  );
}
