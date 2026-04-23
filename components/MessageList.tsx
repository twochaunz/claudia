"use client";

import { useEffect, useLayoutEffect, useRef, useCallback, useState } from "react";
import { ChatMessage } from "./ChatMessage";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { TypedResponse } from "./TypedResponse";
import { AnimatedLogo } from "./AnimatedLogo";

interface Message {
  role: "user" | "assistant";
  content: string;
  logoSrc?: string;
}

type Phase = "idle" | "scrolling" | "thinking" | "transitioning" | "typing" | "settled" | "settling";

interface MessageListProps {
  messages: Message[];
  isThinking: boolean;
  pendingResponse: string | null;
  logoSrc?: string;
  displayName?: string;
  onTypingComplete: () => void;
  onReset?: () => void;
}

export function MessageList({
  messages,
  isThinking,
  pendingResponse,
  logoSrc = "/claude-logo.svg",
  displayName = "Claudia",
  onTypingComplete,
  onReset,
}: MessageListProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const latestUserRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const activeAreaRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const thinkingContentRef = useRef<HTMLDivElement>(null);
  const wasSettlingRef = useRef(false);
  const [thinkingH, setThinkingH] = useState(0);

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

    const container = scrollContainerRef.current;

    // Scroll to the very bottom of the chat
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }

    // Detect scroll idle via debounced scroll events.
    // scrollend is not supported on iOS Safari, so we use a universal approach.
    if (container) {
      let scrollTimer: ReturnType<typeof setTimeout>;
      const onScroll = () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          container.removeEventListener("scroll", onScroll);
          setPhase("thinking");
        }, 150);
      };
      container.addEventListener("scroll", onScroll, { passive: true });

      // Fallback if no scroll event fires (content already in view)
      const fallbackTimer = setTimeout(() => {
        container.removeEventListener("scroll", onScroll);
        setPhase("thinking");
      }, 300);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(fallbackTimer);
        container.removeEventListener("scroll", onScroll);
      };
    }

    // No container — advance immediately
    const fallbackTimer = setTimeout(() => setPhase("thinking"), 100);
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
  useEffect(() => {
    if (isThinking && (phase === "settled" || phase === "settling")) {
      onTypingComplete();
      setPhase("scrolling");
    }
  }, [isThinking, phase, onTypingComplete]);

  // Edge case: props reset without completing cycle — return to idle.
  // Excludes "thinking" because there's a brief window between
  // setIsThinking(false) and setPendingResponse(response) where both
  // are falsy. If batching fails (iOS WebKit), this guard would
  // kill the phase before the response arrives.
  useEffect(() => {
    if (!isThinking && pendingResponse === null && phase !== "idle" && phase !== "settled" && phase !== "settling" && phase !== "thinking") {
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

  // settling: commit message and go idle.
  // useLayoutEffect so React flushes the state updates synchronously
  // before the browser paints (no intermediate frame).
  useLayoutEffect(() => {
    if (phase !== "settling") return;
    wasSettlingRef.current = true;
    onTypingComplete();
    setPhase("idle");
  }, [phase, onTypingComplete]);

  // After settling→idle DOM commit: scroll to bottom after layout settles.
  // Deferred with rAF so the DOM has fully committed before scrolling.
  useLayoutEffect(() => {
    if (!wasSettlingRef.current || phase !== "idle") return;
    wasSettlingRef.current = false;
    requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    });
  }, [phase]);

  // --- Sync scroll-padding-top with actual header height ---
  useEffect(() => {
    const container = scrollContainerRef.current;
    const header = headerRef.current;
    if (container && header) {
      container.style.scrollPaddingTop = `${header.offsetHeight}px`;
    }
  }, []);

  // --- Typing complete handler ---
  const handleTypingDone = useCallback(() => {
    setPhase("settled");
  }, []);

  // --- Measure thinking indicator height (useLayoutEffect to capture before paint) ---
  useLayoutEffect(() => {
    if ((phase === "scrolling" || phase === "thinking") && thinkingContentRef.current) {
      setThinkingH(thinkingContentRef.current.offsetHeight);
    }
  }, [phase]);

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
  // Hold space for thinking indicator through transitioning; collapse only
  // once typing starts (response is visible) so the logo doesn't overshoot.
  const holdThinkingSpace = phase === "scrolling" || phase === "thinking" || phase === "transitioning";

  return (
    <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto chat-scroll">
      {/* Sticky header with gradient — content scrolls behind it and fades */}
      <div
        ref={headerRef}
        className="sticky top-0 z-20 flex items-center justify-center px-4 pt-3 pb-5"
        style={{
          background: "linear-gradient(to bottom, var(--bg-primary) 55%, transparent 100%)",
        }}
      >
        <button
          className="flex items-center gap-2 cursor-pointer"
          onClick={onReset}
          style={{ background: "none", border: "none", padding: 0, margin: 0, WebkitTapHighlightColor: "transparent" }}
        >
          <AnimatedLogo logoSrc={logoSrc} phase="settled" size={logoSrc.includes("consuela") ? 26 : 32} />
          <span className="text-[24px] font-normal" style={{ color: "var(--text-primary)" }}>
            {displayName}
          </span>
        </button>
      </div>
      <div className="max-w-3xl mx-auto px-4 pb-6 min-h-full flex flex-col justify-end">
        {messages.map((msg, i) => (
          <div key={i}>
            {i === lastUserIndex && <div ref={latestUserRef} />}
            <ChatMessage role={msg.role} content={msg.content} logoSrc={msg.logoSrc || logoSrc} />
          </div>
        ))}

        {/* Active response area — matches ChatMessage assistant layout (mb-4, mt-3 logo) */}
        {isActive && (
          <div ref={activeAreaRef} className="mb-4">
            {/* Content area: thinking is absolutely positioned (no layout contribution).
                Response wrapper uses animated min-height to hold space during thinking,
                then collapses smoothly so the logo slides up to sit below the text. */}
            <div style={{ position: "relative" }}>
              {/* Thinking — absolutely positioned overlay, fades out */}
              <div
                ref={thinkingContentRef}
                data-testid="thinking-wrapper"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  opacity: thinkingOpacity,
                  transition: "opacity 200ms ease-out",
                  pointerEvents: thinkingVisible ? "auto" : "none",
                }}
              >
                <ThinkingIndicator isVisible={thinkingVisible} />
              </div>

              {/* Response — in normal flow; min-height matches thinking during
                  scrolling/thinking phases, then collapses to let logo slide up */}
              <div style={{
                opacity: responseOpacity,
                transition: "opacity 200ms ease-in, min-height 400ms ease-out",
                minHeight: holdThinkingSpace ? thinkingH : 0,
              }}>
                {pendingResponse !== null && (
                  <TypedResponse
                    text={pendingResponse}
                    onComplete={handleTypingDone}
                  />
                )}
              </div>
            </div>

            {/* Persistent logo — mt-3 matches ChatMessage assistant layout */}
            <div className="flex justify-start mt-3">
              <AnimatedLogo logoSrc={logoSrc} phase={logoPhase} size={28} />
            </div>
          </div>
        )}

        {/* Bottom anchor for scroll-to-bottom */}
        <div ref={bottomAnchorRef} aria-hidden="true" />
      </div>
    </div>
  );
}
