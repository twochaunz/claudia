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
  const spacerRef = useRef<HTMLDivElement>(null);
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

    // Reset spacer to full height so scrollIntoView can push content to top
    if (spacerRef.current) spacerRef.current.style.height = "";

    // Scroll the latest user message to top
    if (latestUserRef.current) {
      latestUserRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const container = scrollContainerRef.current;

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

  // settling: commit message and go idle.
  // useLayoutEffect so React flushes the state updates synchronously
  // before the browser paints (no intermediate frame).
  useLayoutEffect(() => {
    if (phase !== "settling") return;
    wasSettlingRef.current = true;
    onTypingComplete();
    setPhase("idle");
  }, [phase, onTypingComplete]);

  // After settling→idle DOM commit: re-anchor the latest user message
  // to the top of the viewport before the browser paints, then trim spacer.
  useLayoutEffect(() => {
    if (!wasSettlingRef.current || phase !== "idle") return;
    wasSettlingRef.current = false;
    latestUserRef.current?.scrollIntoView({ behavior: "instant", block: "start" });

    // Trim spacer via direct DOM manipulation (no state → no re-render → no shift)
    const c = scrollContainerRef.current;
    if (c && spacerRef.current) {
      const excess = c.scrollHeight - c.clientHeight - c.scrollTop;
      if (excess > 0) {
        const currentH = spacerRef.current.getBoundingClientRect().height;
        spacerRef.current.style.height = `${Math.max(0, currentH - excess)}px`;
      }
    }
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

  // --- Measure thinking indicator height ---
  useEffect(() => {
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
    <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-scroll chat-scroll relative">
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
      <div className="max-w-3xl mx-auto px-4 pb-6">
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

        {/* Spacer — enough so the latest user message stays at top even after
            the active area (129px) is replaced by the shorter committed ChatMessage (~65px).
            80dvh provides ≥80px buffer on small viewports, absorbing the ~64px height drop. */}
        <div ref={spacerRef} className="h-[80dvh]" />
      </div>
    </div>
  );
}
