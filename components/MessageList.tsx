"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
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
}

export function MessageList({
  messages,
  isThinking,
  pendingResponse,
  logoSrc = "/claude-logo.svg",
  displayName = "Claudia",
  onTypingComplete,
}: MessageListProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [debugInfo, setDebugInfo] = useState("");
  const latestUserRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const activeAreaRef = useRef<HTMLDivElement>(null);
  const thinkingContentRef = useRef<HTMLDivElement>(null);
  const wasSettlingRef = useRef(false);
  const [thinkingH, setThinkingH] = useState(0);

  // --- Debug instrumentation ---
  const measure = useCallback(() => {
    const c = scrollContainerRef.current;
    const h = headerRef.current;
    const u = latestUserRef.current;
    const a = activeAreaRef.current;
    return {
      scrollTop: c?.scrollTop ?? 0,
      scrollH: c?.scrollHeight ?? 0,
      clientH: c?.clientHeight ?? 0,
      headerH: h?.offsetHeight ?? 0,
      scrollPadding: c?.style.scrollPaddingTop ?? "unset",
      userMsgTop: u ? Math.round(u.getBoundingClientRect().top) : null,
      activeH: a?.offsetHeight ?? 0,
      maxScroll: c ? c.scrollHeight - c.clientHeight : 0,
    };
  }, []);

  // Log every phase transition
  useEffect(() => {
    const m = measure();
    const line = `[${phase}] sT=${m.scrollTop.toFixed(1)} sH=${m.scrollH} cH=${m.clientH} maxS=${m.maxScroll} hdrH=${m.headerH} sPad=${m.scrollPadding} userTop=${m.userMsgTop} activeH=${m.activeH}`;
    console.log(line);
    setDebugInfo(line);
  }, [phase, measure]);

  // Log scroll events
  useEffect(() => {
    const c = scrollContainerRef.current;
    if (!c) return;
    let last = c.scrollTop;
    const onScroll = () => {
      const delta = c.scrollTop - last;
      if (Math.abs(delta) > 0.5) {
        const m = measure();
        console.log(`[SCROLL] Δ=${delta.toFixed(1)} now=${c.scrollTop.toFixed(1)} sH=${m.scrollH} cH=${m.clientH} userTop=${m.userMsgTop}`);
      }
      last = c.scrollTop;
    };
    c.addEventListener("scroll", onScroll, { passive: true });
    return () => c.removeEventListener("scroll", onScroll);
  }, [measure]);

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
    const pre = measure();
    console.log(`[SETTLE-PRE] sT=${pre.scrollTop.toFixed(1)} sH=${pre.scrollH} cH=${pre.clientH} userTop=${pre.userMsgTop} activeH=${pre.activeH}`);
    wasSettlingRef.current = true;
    onTypingComplete();
    setPhase("idle");
  }, [phase, onTypingComplete, measure]);

  // After settling→idle DOM commit: re-anchor the latest user message
  // to the top of the viewport before the browser paints.
  useLayoutEffect(() => {
    if (!wasSettlingRef.current || phase !== "idle") return;
    const pre = measure();
    console.log(`[SETTLE-POST-BEFORE-SCROLL] sT=${pre.scrollTop.toFixed(1)} sH=${pre.scrollH} cH=${pre.clientH} userTop=${pre.userMsgTop} activeH=${pre.activeH}`);
    wasSettlingRef.current = false;
    latestUserRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
    const post = measure();
    console.log(`[SETTLE-POST-AFTER-SCROLL] sT=${post.scrollTop.toFixed(1)} sH=${post.scrollH} cH=${post.clientH} userTop=${post.userMsgTop}`);
  }, [phase, measure]);

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
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto chat-scroll relative">
      {/* Sticky header with gradient — content scrolls behind it and fades */}
      <div
        ref={headerRef}
        className="sticky top-0 z-20 flex items-center justify-center px-4 pt-3 pb-5"
        style={{
          background: "linear-gradient(to bottom, var(--bg-primary) 55%, transparent 100%)",
        }}
      >
        <div className="flex items-center gap-2">
          <img src={logoSrc} alt={displayName} width={24} height={24} />
          <span className="text-[24px] font-normal" style={{ color: "var(--text-primary)" }}>
            {displayName}
          </span>
        </div>
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
        <div className="h-[80dvh]" />
      </div>
      {/* Debug overlay — remove after fixing */}
      <div
        style={{
          position: "fixed",
          bottom: 80,
          right: 8,
          backgroundColor: "rgba(0,0,0,0.85)",
          color: "#0f0",
          fontFamily: "monospace",
          fontSize: "11px",
          padding: "6px 10px",
          borderRadius: 6,
          zIndex: 9999,
          maxWidth: 420,
          wordBreak: "break-all",
          pointerEvents: "none",
        }}
      >
        {debugInfo}
      </div>
    </div>
  );
}
