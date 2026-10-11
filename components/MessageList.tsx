"use client";

import { useLayoutEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { TypedResponse } from "./TypedResponse";
import { AnimatedLogo } from "./AnimatedLogo";
import { useHeightVar } from "./useViewport";
import type { Message, Phase } from "./useChatMachine";

/**
 * Air between the header's bottom edge and the pinned user bubble, and the
 * padding under the last message. The anchor's reserve is sized from these so
 * that "scrolled to the very bottom" and "newest message pinned under the
 * header" are the *same* scroll position — see the anchor block below.
 */
const ANCHOR_GAP = 8;
const LIST_BOTTOM_PAD = 24;

interface MessageListProps {
  messages: Message[];
  phase: Phase;
  pending: string | null;
  cycleId: number;
  /** Logo of the currently selected persona — used in the header. */
  logoSrc: string;
  /** Logo bound to the in-flight response. */
  pendingLogo: string;
  displayName: string;
  onTypingDone: () => void;
  onReset: () => void;
}

export function MessageList({
  messages,
  phase,
  pending,
  cycleId,
  logoSrc,
  pendingLogo,
  displayName,
  onTypingDone,
  onReset,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);

  // Measured into CSS variables rather than React state. The anchor block sizes
  // itself from these in plain CSS, so a resize never triggers a render — and
  // therefore can never interleave with a phase change mid-animation.
  useHeightVar(scrollRef, "--list-h");
  useHeightVar(headerRef, "--header-h");
  // The thinking indicator only exists while a cycle is active, so this one
  // has to re-attach whenever the active area remounts.
  useHeightVar(thinkingRef, "--thinking-h", [phase !== "idle"]);

  /**
   * Pin the newest user message to the top of the viewport.
   *
   * The old implementation fired a smooth `scrollIntoView`, then tried to detect
   * when it finished using a 150ms scroll-event debounce racing a 300ms fallback
   * timer, and only then advanced the phase. Both could fire; iOS momentum
   * scrolling and keyboard-driven viewport resizes made the timing arbitrary.
   *
   * Nothing waits on the scroll now. It is fired once per cycle from a layout
   * effect and the state machine advances on its own fixed 300ms schedule, so
   * the scroll can take as long as it likes without desynchronising anything.
   */
  useLayoutEffect(() => {
    if (cycleId === 0) return;
    const container = scrollRef.current;
    const anchor = anchorRef.current;
    if (!container || !anchor) return;

    const headerH = headerRef.current?.getBoundingClientRect().height ?? 0;
    const delta =
      anchor.getBoundingClientRect().top -
      container.getBoundingClientRect().top;
    // Leave a little air under the header so the bubble's top edge reads
    // as its own, not as touching the chrome.
    const target = Math.max(
      0,
      container.scrollTop + delta - headerH - ANCHOR_GAP,
    );

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    container.scrollTo({ top: target, behavior: reduced ? "auto" : "smooth" });
  }, [cycleId]);

  const lastUserIndex = messages.reduce(
    (acc, msg, i) => (msg.role === "user" ? i : acc),
    -1,
  );
  const before = lastUserIndex >= 0 ? messages.slice(0, lastUserIndex) : messages;
  const after = lastUserIndex >= 0 ? messages.slice(lastUserIndex) : [];

  const isActive = phase !== "idle";
  const thinkingVisible = phase === "thinking";
  const responseVisible = phase === "typing" || phase === "settled";
  const logoPhase =
    phase === "typing" ? "typing" : phase === "settled" ? "settled" : "thinking";
  // Hold the thinking indicator's space through the fade-out so the logo does
  // not overshoot upward, then release it once the response is on screen.
  const holdSpace =
    phase === "scrolling" || phase === "thinking" || phase === "transitioning";

  return (
    <div
      ref={scrollRef}
      className="flex-1 min-h-0 overflow-y-auto chat-scroll"
      style={{
        // Stops iOS rubber-banding from propagating to the document, which
        // would drag the fixed body out from under the visual viewport.
        overscrollBehavior: "contain",
      }}
    >
      <div
        ref={headerRef}
        className="sticky top-0 z-20 flex items-center justify-center px-4 py-3"
        style={{
          // Solid, with no fade below it. A fade (gradient header earlier,
          // then a gradient strip under it) softened the top edge of the
          // user bubble pinned beneath the header — that is the "blended in"
          // border. claude.ai's header is a hard edge; so is this one.
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <button
          type="button"
          className="flex items-center gap-2 cursor-pointer"
          onClick={onReset}
          // Without this the accessible name is just the persona name, which is
          // identical to the ModelSelector trigger's — two buttons, same name,
          // no hint that this one clears the conversation. The visible text is
          // kept as the prefix so voice control ("click Claudia") still works.
          aria-label={`${displayName} — new chat`}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            margin: 0,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <AnimatedLogo
            logoSrc={logoSrc}
            phase="settled"
            size={logoSrc.includes("consuela") ? 22 : 26}
          />
          <span
            className="text-[18px] font-normal"
            style={{ color: "var(--text-primary)" }}
          >
            {displayName}
          </span>
        </button>
      </div>

      <div
        className="max-w-3xl mx-auto px-4 pt-2"
        style={{ paddingBottom: LIST_BOTTOM_PAD }}
      >
        {before.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            logoSrc={msg.logoSrc || logoSrc}
          />
        ))}

        {/*
          Scroll anchor. Everything from the newest user message downward lives
          in here. The block reserves exactly enough height that, when the list
          is scrolled all the way to the bottom, the newest user message sits
          ANCHOR_GAP below the header — which is the same position the send
          scroll pins it to. That identity is what makes the whole sequence
          behave like claude.ai:

            • on send, the new message scrolls up under the header;
            • when the reply commits nothing moves, because the reserve is
              the same size before and after;
            • scrolling up and back down lands on that identical view, so the
              bubble is never clipped under the header and there is never a
              gap below the reply.

          Two earlier versions got this wrong. A full-viewport reserve left
          the bottom (ANCHOR_GAP + LIST_BOTTOM_PAD) px past the pinned view,
          so scrolling back down tucked the bubble under the header. Dropping
          the reserve to 0 on commit removed all overflow from a short
          conversation, so the browser clamped scrollTop to 0 and the view
          snapped back to the first message after every reply.

          Replies taller than the reserve simply grow past it; then the end
          of the conversation is the bottom of the list, as usual.
        */}
        <div
          ref={anchorRef}
          data-testid="scroll-anchor"
          style={{
            minHeight:
              after.length > 0
                ? `calc(var(--list-h, 100dvh) - var(--header-h, 60px) - ${ANCHOR_GAP + LIST_BOTTOM_PAD}px)`
                : 0,
          }}
        >
          {after.map((msg, i) => (
            <ChatMessage
              key={lastUserIndex + i}
              role={msg.role}
              content={msg.content}
              logoSrc={msg.logoSrc || logoSrc}
            />
          ))}

          {isActive && (
            <div className="mb-4">
              <div style={{ position: "relative" }}>
                {/* Thinking indicator is absolutely positioned so it never
                    contributes layout — only the reserved min-height below
                    does, and that is animated. */}
                <div
                  ref={thinkingRef}
                  data-testid="thinking-wrapper"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    opacity: thinkingVisible ? 1 : 0,
                    transition: "opacity 200ms ease-out",
                    pointerEvents: thinkingVisible ? "auto" : "none",
                  }}
                >
                  <ThinkingIndicator
                    key={cycleId}
                    isVisible={thinkingVisible}
                  />
                </div>

                <div
                  style={{
                    opacity: responseVisible ? 1 : 0,
                    transition:
                      "opacity 200ms ease-in, min-height 400ms ease-out",
                    minHeight: holdSpace ? "var(--thinking-h, 0px)" : 0,
                  }}
                >
                  {responseVisible && pending !== null && (
                    /* Mounted only once the phase reaches `typing`. `pending`
                       is set a phase earlier, during `transitioning`, and a
                       reveal that finishes instantly (reduced motion, or a
                       one-word reply) would fire onTypingDone while the
                       machine still ignores it — leaving the cycle parked in
                       `typing` forever.

                       Keyed by cycle: Claudia's response is always the same
                       string, and without a key an identical text prop would
                       not restart the reveal effect on the next message. */
                    <TypedResponse
                      key={cycleId}
                      text={pending}
                      onComplete={onTypingDone}
                    />
                  )}
                </div>
              </div>

              {/* mt-3 matches ChatMessage's assistant layout exactly, so the
                  handoff from active area to committed message is invisible. */}
              <div className="flex justify-start mt-3">
                <AnimatedLogo
                  logoSrc={pendingLogo}
                  phase={logoPhase}
                  size={28}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
