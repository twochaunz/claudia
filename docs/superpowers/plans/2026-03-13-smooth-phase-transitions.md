# Smooth Phase Transitions Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace jittery phase transitions with a smooth sequenced flow — persistent logo, opacity-based content swaps, scroll-then-think choreography.

**Architecture:** MessageList gains an internal 6-phase sequencer (`idle → scrolling → thinking → transitioning → typing → settled`) that choreographs all visual transitions. AnimatedLogo stays mounted across phases. ThinkingIndicator becomes content-only (no logo, no conditional unmount). page.tsx drops `isTyping` state since MessageList manages it internally.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, CSS transitions (no animation libraries)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `components/AnimatedLogo.tsx` | Modify | Always render SVG filter defs, toggle `filter` CSS property instead of conditional JSX |
| `components/ThinkingIndicator.tsx` | Modify | Remove logo rendering, remove early-return `null`, keep timer lifecycle via `isVisible` prop |
| `components/MessageList.tsx` | Rewrite | Phase sequencer, persistent logo, stacked content area with opacity transitions, scroll detection |
| `app/page.tsx` | Modify | Remove `isTyping` state, update `disabled`/`hasMessages` checks |
| `__tests__/page.test.tsx` | Modify | Account for phase sequencing delays in timing |

---

## Chunk 1: Prerequisite Component Changes

### Task 1: AnimatedLogo — always render filter defs

**Files:**
- Modify: `components/AnimatedLogo.tsx:124-167`
- Test: `__tests__/AnimatedLogo.test.tsx` (create)

- [ ] **Step 1: Write test for filter defs always present**

Create `__tests__/AnimatedLogo.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { AnimatedLogo } from "@/components/AnimatedLogo";

describe("AnimatedLogo", () => {
  it("renders SVG filter defs in all phases", () => {
    const phases = ["thinking", "typing", "settled"] as const;
    for (const phase of phases) {
      const { container, unmount } = render(
        <AnimatedLogo logoSrc="/claude-logo.svg" phase={phase} />
      );
      expect(container.querySelector("feTurbulence")).toBeInTheDocument();
      expect(container.querySelector("feDisplacementMap")).toBeInTheDocument();
      unmount();
    }
  });

  it("only applies filter style during thinking phase", () => {
    const { container, rerender } = render(
      <AnimatedLogo logoSrc="/claude-logo.svg" phase="thinking" />
    );
    const svg = container.querySelector("svg")!;
    expect(svg.style.filter).toContain("url(#");

    rerender(<AnimatedLogo logoSrc="/claude-logo.svg" phase="typing" />);
    expect(svg.style.filter).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/wonchankim/Projects/claudia && npx jest __tests__/AnimatedLogo.test.tsx --no-coverage 2>&1 | tail -20`
Expected: FAIL — filter defs not found in typing/settled phases.

- [ ] **Step 3: Implement — always render defs, toggle filter CSS property**

In `components/AnimatedLogo.tsx`, replace lines 124-163 (from `const showFilter` through the closing `</svg>`):

```tsx
  const applyFilter = phase === "thinking" && !reducedMotion;

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={applyFilter ? { filter: `url(#${filterId})` } : { filter: "" }}
      aria-hidden="true"
    >
      <defs>
        <filter
          id={filterId}
          filterUnits="userSpaceOnUse"
          primitiveUnits="userSpaceOnUse"
          x="-2"
          y="-2"
          width="28"
          height="28"
        >
          <feTurbulence
            ref={filterRef}
            type="turbulence"
            baseFrequency="0.03"
            numOctaves={2}
            result="turbulence"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale={4}
          />
        </filter>
      </defs>
      {getSvgContent(logoSrc)}
    </svg>
  );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/wonchankim/Projects/claudia && npx jest __tests__/AnimatedLogo.test.tsx --no-coverage 2>&1 | tail -20`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/AnimatedLogo.tsx __tests__/AnimatedLogo.test.tsx
git commit -m "refactor: always render SVG filter defs in AnimatedLogo"
```

---

### Task 2: ThinkingIndicator — remove logo, remove early return

**Files:**
- Modify: `components/ThinkingIndicator.tsx`
- Test: `__tests__/ThinkingIndicator.test.tsx` (create)

- [ ] **Step 1: Write tests for new ThinkingIndicator behavior**

Create `__tests__/ThinkingIndicator.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";

describe("ThinkingIndicator", () => {
  it("renders content when isVisible is true", () => {
    render(<ThinkingIndicator isVisible={true} />);
    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });

  it("renders DOM nodes when isVisible is false (no early return)", () => {
    render(<ThinkingIndicator isVisible={false} />);
    // Component should render its DOM structure even when not visible
    // The parent controls opacity — ThinkingIndicator always renders
    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });

  it("does not render a logo", () => {
    render(<ThinkingIndicator isVisible={true} />);
    expect(screen.queryByRole("img", { hidden: true })).not.toBeInTheDocument();
    // AnimatedLogo uses aria-hidden="true" on an SVG — check there's no SVG with that attribute
    const svgs = document.querySelectorAll("svg[aria-hidden='true']");
    expect(svgs.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/wonchankim/Projects/claudia && npx jest __tests__/ThinkingIndicator.test.tsx --no-coverage 2>&1 | tail -20`
Expected: FAIL — "renders DOM nodes when isVisible is false" fails (returns null), "does not render a logo" fails (AnimatedLogo SVG present).

- [ ] **Step 3: Implement — remove logo, remove early return**

Replace the full content of `components/ThinkingIndicator.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";

interface ThinkingIndicatorProps {
  isVisible: boolean;
}

export function ThinkingIndicator({ isVisible }: ThinkingIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!isVisible) {
      setElapsed(0);
      setExpanded(true);
      return;
    }
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <div className="mb-4">
      <div className="flex-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-[13px] font-medium cursor-pointer bg-transparent border-none p-0"
          style={{ color: "var(--accent-orange)" }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={`transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
          >
            <path
              d="M4 2L8 6L4 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Thinking
          <span className="flex gap-[2px]">
            <span className="thinking-dot w-1 h-1 rounded-full inline-block" style={{ backgroundColor: "var(--accent-orange)" }} />
            <span className="thinking-dot w-1 h-1 rounded-full inline-block" style={{ backgroundColor: "var(--accent-orange)" }} />
            <span className="thinking-dot w-1 h-1 rounded-full inline-block" style={{ backgroundColor: "var(--accent-orange)" }} />
          </span>
          <span style={{ color: "var(--text-secondary)" }} className="font-normal">
            {elapsed}s
          </span>
        </button>
        {expanded && (
          <div
            className="mt-2 rounded-xl px-4 py-3 text-[13px] leading-relaxed border-l-2"
            style={{
              backgroundColor: "var(--thinking-bg)",
              borderLeftColor: "var(--accent-orange)",
              color: "var(--text-secondary)",
            }}
          >
            <div className="flex items-center gap-1">
              <span className="italic">Analyzing your message</span>
              <span className="flex gap-[2px] ml-1">
                <span className="thinking-dot w-1 h-1 rounded-full inline-block" style={{ backgroundColor: "var(--text-secondary)" }} />
                <span className="thinking-dot w-1 h-1 rounded-full inline-block" style={{ backgroundColor: "var(--text-secondary)" }} />
                <span className="thinking-dot w-1 h-1 rounded-full inline-block" style={{ backgroundColor: "var(--text-secondary)" }} />
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

Key changes from original:
- Removed `AnimatedLogo` import and `logoSrc` prop
- Removed `if (!isVisible) return null;` early return (line 27)
- Removed the logo flex container (`<div className="flex gap-3 ...">` wrapper and `<div className="flex-shrink-0 w-7 h-7 mt-1">` block)
- Removed `animate-fade-in` class (parent handles fade via opacity)
- Kept `isVisible` for timer lifecycle: when false, resets `elapsed` and `expanded`, stops interval

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/wonchankim/Projects/claudia && npx jest __tests__/ThinkingIndicator.test.tsx --no-coverage 2>&1 | tail -20`
Expected: PASS

- [ ] **Step 5: Run all existing tests to check for regressions**

Run: `cd /Users/wonchankim/Projects/claudia && npx jest --no-coverage 2>&1 | tail -20`
Expected: TypeScript compilation error — MessageList still passes `logoSrc` to ThinkingIndicator which no longer accepts it. This is expected and will be fixed in Task 3.

- [ ] **Step 6: Commit**

```bash
git add components/ThinkingIndicator.tsx __tests__/ThinkingIndicator.test.tsx
git commit -m "refactor: remove logo and early return from ThinkingIndicator"
```

---

## Chunk 2: MessageList Rewrite

### Task 3: MessageList — phase sequencer with persistent logo and content stacking

**Files:**
- Rewrite: `components/MessageList.tsx`
- Test: `__tests__/MessageList.test.tsx` (create)

- [ ] **Step 1: Write tests for MessageList phase behavior**

Create `__tests__/MessageList.test.tsx`:

```tsx
import { render, screen, act } from "@testing-library/react";
import { MessageList } from "@/components/MessageList";

// Mock scrollIntoView
const mockScrollIntoView = jest.fn();
Element.prototype.scrollIntoView = mockScrollIntoView;

const defaultProps = {
  messages: [] as { role: "user" | "assistant"; content: string }[],
  isThinking: false,
  pendingResponse: null as string | null,
  logoSrc: "/claude-logo.svg",
  onTypingComplete: jest.fn(),
};

describe("MessageList", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockScrollIntoView.mockClear();
    defaultProps.onTypingComplete.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders messages", () => {
    render(
      <MessageList
        {...defaultProps}
        messages={[{ role: "user", content: "hello" }]}
      />
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("shows logo when isThinking becomes true", () => {
    render(<MessageList {...defaultProps} isThinking={true} />);
    // AnimatedLogo renders an SVG with aria-hidden="true"
    const svg = document.querySelector("svg[aria-hidden='true']");
    expect(svg).toBeInTheDocument();
  });

  it("does not show thinking text immediately (scrolling phase)", () => {
    render(<MessageList {...defaultProps} isThinking={true} />);
    // During scrolling phase, thinking text should not be visible yet
    // ThinkingIndicator renders but its wrapper has opacity 0
    const wrapper = document.querySelector("[data-testid='thinking-wrapper']");
    expect(wrapper).toHaveStyle({ opacity: "0" });
  });

  it("shows thinking text after scroll completes", () => {
    render(<MessageList {...defaultProps} isThinking={true} />);

    // Advance past scroll fallback timer (1000ms)
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const wrapper = document.querySelector("[data-testid='thinking-wrapper']");
    expect(wrapper).toHaveStyle({ opacity: "1" });
  });

  it("renders persistent logo across phase changes", () => {
    const { rerender } = render(
      <MessageList {...defaultProps} isThinking={true} />
    );

    const logoBeforeTransition = document.querySelector("svg[aria-hidden='true']");
    expect(logoBeforeTransition).toBeInTheDocument();

    // Advance to thinking phase
    act(() => { jest.advanceTimersByTime(1000); });

    // Simulate response arrival
    rerender(
      <MessageList
        {...defaultProps}
        isThinking={false}
        pendingResponse="si papi"
      />
    );

    // Logo should still be the same DOM element (persistent)
    const logoAfterTransition = document.querySelector("svg[aria-hidden='true']");
    expect(logoAfterTransition).toBeInTheDocument();
  });

  it("shows settled logo after typing completes", () => {
    const { rerender } = render(
      <MessageList {...defaultProps} isThinking={true} />
    );

    // Advance through scrolling → thinking
    act(() => { jest.advanceTimersByTime(1000); });

    // Response arrives → transitioning
    rerender(
      <MessageList
        {...defaultProps}
        isThinking={false}
        pendingResponse="si papi"
      />
    );

    // Advance past transitioning fade-out (250ms fallback)
    act(() => { jest.advanceTimersByTime(250); });

    // Advance past TypedResponse duration (1200ms default + buffer)
    act(() => { jest.advanceTimersByTime(2000); });

    // After typing completes, logo should still be present (settled phase)
    const logo = document.querySelector("svg[aria-hidden='true']");
    expect(logo).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/wonchankim/Projects/claudia && npx jest __tests__/MessageList.test.tsx --no-coverage 2>&1 | tail -20`
Expected: FAIL — current MessageList doesn't have phase sequencer.

- [ ] **Step 3: Implement MessageList with phase sequencer**

Replace the full content of `components/MessageList.tsx`:

```tsx
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
    // When isThinking goes false and we haven't moved past thinking yet,
    // that means response arrived — handled by pendingResponse effect below
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

  // settled → idle: when a new message cycle starts (isThinking goes true while settled)
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
```

Key design decisions:
- Phase state machine via `useState<Phase>` with `useEffect` transitions
- ThinkingIndicator always renders during active phases (opacity controls visibility)
- ThinkingIndicator positioned absolutely — no layout impact during fade-out
- TypedResponse only mounts during `typing`/`settled` phases — no invisible word accumulation
- Min-height placeholder during thinking phases so absolute ThinkingIndicator has space
- Single AnimatedLogo instance below the content area, mounted for entire active cycle
- Scroll detection: `scrollend` event with 1000ms fallback
- `transitioning` phase auto-advances to `typing` after 250ms

- [ ] **Step 4: Run MessageList tests**

Run: `cd /Users/wonchankim/Projects/claudia && npx jest __tests__/MessageList.test.tsx --no-coverage 2>&1 | tail -20`
Expected: PASS

- [ ] **Step 5: Run all tests to check integration**

Run: `cd /Users/wonchankim/Projects/claudia && npx jest --no-coverage 2>&1 | tail -20`
Expected: page.test.tsx may fail due to removed `isTyping` prop — will be fixed in Task 4.

- [ ] **Step 6: Commit**

```bash
git add components/MessageList.tsx __tests__/MessageList.test.tsx
git commit -m "feat: rewrite MessageList with phase sequencer and persistent logo"
```

---

## Chunk 3: page.tsx Integration + Test Updates

### Task 4: page.tsx — remove isTyping, update disabled/hasMessages

**Files:**
- Modify: `app/page.tsx:34-75`

- [ ] **Step 1: Update page.tsx state management**

In `app/page.tsx`, make these changes:

**Remove `isTyping` state (line 36):** Delete `const [isTyping, setIsTyping] = useState(false);`

**Update `handleSend` (lines 52-56):** Change the setTimeout callback to only set `isThinking(false)` and `pendingResponse`:

```tsx
    setTimeout(() => {
      setIsThinking(false);
      setPendingResponse(getResponse(persona));
    }, delay);
```

(Remove the `setIsTyping(true)` call that was there.)

**Update `handleTypingComplete` (lines 60-67):** Remove `setIsTyping(false)`:

```tsx
  const handleTypingComplete = useCallback(() => {
    const response = pendingResponseRef.current;
    if (response !== null) {
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    }
    setPendingResponse(null);
  }, []);
```

**Update `hasMessages` (line 75):** Change to:

```tsx
  const hasMessages = messages.length > 0 || isThinking || pendingResponse !== null;
```

**Update `ChatInput` disabled prop (lines 101, 136):** Change both occurrences:

```tsx
disabled={isThinking || pendingResponse !== null}
```

**Remove `isTyping` from MessageList props (lines 126-133):** Remove the `isTyping={isTyping}` line. The MessageList component no longer accepts this prop.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/wonchankim/Projects/claudia && npx tsc --noEmit 2>&1 | tail -20`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "refactor: remove isTyping from page.tsx, MessageList manages phases internally"
```

---

### Task 5: Update tests for phase sequencing

**Files:**
- Modify: `__tests__/page.test.tsx`

- [ ] **Step 1: Update page test timing**

Replace `__tests__/page.test.tsx` with:

```tsx
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

describe("Home (Chat Page)", () => {
  it("renders the initial empty state", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Claudia" })).toBeInTheDocument();
  });

  it("shows user message after sending", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const textarea = screen.getByPlaceholderText("How are you doing today?");
    await user.type(textarea, "what is 2+2?");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByText("what is 2+2?")).toBeInTheDocument();
  });

  it("shows thinking indicator after scroll completes", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Home />);

    const textarea = screen.getByPlaceholderText("How are you doing today?");
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    // Advance past scroll fallback (1000ms) to reach thinking phase
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText("Thinking")).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("responds with 'si papi' after thinking and typing", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Home />);

    const textarea = screen.getByPlaceholderText("How are you doing today?");
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    // Advance past scroll fallback (1000ms)
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Advance past max thinking time (capped at 12s)
    await act(async () => {
      jest.advanceTimersByTime(13000);
    });

    // Advance past transitioning phase (250ms)
    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    // Advance past typing animation (~1200ms for 2 words + buffer)
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByText("si papi")).toBeInTheDocument();

    jest.useRealTimers();
  });

  it("disables input during all active phases and re-enables after cycle", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Home />);

    const textarea = screen.getByPlaceholderText("How are you doing today?");
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    // Chat view textarea (compact input)
    const chatTextarea = screen.getByPlaceholderText("Reply...");
    expect(chatTextarea).toBeDisabled();

    // Advance past scroll + thinking + response arrival
    await act(async () => { jest.advanceTimersByTime(14000); });

    // Still disabled during transitioning/typing
    expect(chatTextarea).toBeDisabled();

    // Advance past transitioning + typing
    await act(async () => { jest.advanceTimersByTime(4000); });

    // After cycle completes, input should be re-enabled
    expect(chatTextarea).not.toBeDisabled();

    jest.useRealTimers();
  });
});
```

Key changes:
- Added `scrollIntoView` mock
- "shows thinking indicator" now accounts for 1000ms scroll fallback
- "responds with si papi" adds 1000ms scroll + 250ms transitioning delays
- Renamed test to clarify "after thinking and typing"
- Added disabled state test covering full animation cycle

- [ ] **Step 2: Run all tests**

Run: `cd /Users/wonchankim/Projects/claudia && npx jest --no-coverage 2>&1 | tail -20`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add __tests__/page.test.tsx
git commit -m "test: update tests for phase sequencing delays"
```

- [ ] **Step 4: Verify the app builds**

Run: `cd /Users/wonchankim/Projects/claudia && npx next build 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 5: Manual verification**

Run: `cd /Users/wonchankim/Projects/claudia && npm run dev`

Verify this flow:
1. Send a message → user message scrolls to top, logo appears with morphing immediately
2. Scroll finishes → ThinkingIndicator text fades in smoothly (no jump)
3. Response arrives → ThinkingIndicator fades out, response fades in above logo. No layout jump.
4. Logo transitions from morphing to rotating — same DOM element, no pop
5. Typing completes → logo eases to rest
6. Send another message → settled logo disappears, new cycle starts cleanly
