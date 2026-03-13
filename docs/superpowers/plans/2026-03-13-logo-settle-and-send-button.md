# Logo Settle Animation & Send Button Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Smooth the logo settle animation with a sliding spacer transition and replace the voice button with an always-visible send button.

**Architecture:** Add a `settling` phase to MessageList's state machine that animates the bottom spacer to zero height before committing. Add a static logo to ChatMessage for assistant messages so the swap is seamless. Replace VoiceButton with a single send button that toggles between gray (empty) and orange (has text).

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Next.js 16, Jest + React Testing Library

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `components/MessageList.tsx` | Modify | Add `settling` phase, spacer ref + transition, derived state updates, edge case guards |
| `components/ChatMessage.tsx` | Modify | Add `logoSrc` prop, render AnimatedLogo for assistant messages |
| `components/ChatInput.tsx` | Modify | Remove VoiceButton, always-visible send button |
| `components/VoiceButton.tsx` | Delete | No longer used |
| `app/globals.css` | Modify | Remove voice-pulse animation |
| `__tests__/MessageList.test.tsx` | Modify | Add settling phase tests |
| `__tests__/ChatMessage.test.tsx` | Modify | Add logo rendering test |
| `__tests__/ChatInput.test.tsx` | Modify | Add send button visibility tests |
| `__tests__/page.test.tsx` | Modify | Update timing for settling phase |

---

## Chunk 1: ChatMessage Logo & Send Button

### Task 1: Add logo to ChatMessage for assistant messages

**Files:**
- Modify: `components/ChatMessage.tsx`
- Modify: `__tests__/ChatMessage.test.tsx`

- [ ] **Step 1: Update the ChatMessage test for assistant logo**

In `__tests__/ChatMessage.test.tsx`, replace the entire file with:

```tsx
import { render, screen } from "@testing-library/react";
import { ChatMessage } from "@/components/ChatMessage";

describe("ChatMessage", () => {
  it("renders user message with correct text", () => {
    render(<ChatMessage role="user" content="hello" />);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("renders assistant message with correct text", () => {
    render(<ChatMessage role="assistant" content="si papi" logoSrc="/claude-logo.svg" />);
    expect(screen.getByText("si papi")).toBeInTheDocument();
  });

  it("renders a logo for assistant messages", () => {
    render(<ChatMessage role="assistant" content="si papi" logoSrc="/claude-logo.svg" />);
    const svg = document.querySelector("svg[aria-hidden='true']");
    expect(svg).toBeInTheDocument();
  });

  it("does not render a logo for user messages", () => {
    render(<ChatMessage role="user" content="hello" logoSrc="/claude-logo.svg" />);
    const svg = document.querySelector("svg[aria-hidden='true']");
    expect(svg).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/ChatMessage.test.tsx --no-cache`
Expected: 2 tests fail — "renders a logo for assistant messages" (no SVG found) and "renders assistant message" (logoSrc prop not accepted yet but test still passes since it's just a prop). The "does not render a logo" test may need the old assertion removed.

- [ ] **Step 3: Implement ChatMessage with logo**

Replace the entire `components/ChatMessage.tsx` with:

```tsx
import { AnimatedLogo } from "./AnimatedLogo";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  logoSrc?: string;
}

export function ChatMessage({ role, content, logoSrc = "/claude-logo.svg" }: ChatMessageProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end mb-4 animate-fade-in">
        <div
          className="max-w-[85%] rounded-3xl px-5 py-3 text-[15px] leading-relaxed"
          style={{ backgroundColor: "var(--bg-user-bubble)", color: "var(--text-primary)" }}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div
        className="text-[15px] leading-relaxed"
        style={{ color: "var(--text-primary)" }}
      >
        {content}
      </div>
      <div className="flex justify-start mt-3">
        <AnimatedLogo logoSrc={logoSrc} phase="settled" size={28} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Pass logoSrc through MessageList to ChatMessage**

In `components/MessageList.tsx`, update the ChatMessage rendering at line 130 from:

```tsx
<ChatMessage role={msg.role} content={msg.content} />
```

to:

```tsx
<ChatMessage role={msg.role} content={msg.content} logoSrc={logoSrc} />
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/ChatMessage.test.tsx --no-cache`
Expected: All 4 tests PASS

- [ ] **Step 6: Run full test suite**

Run: `npx jest --no-cache`
Expected: All tests PASS. The page.test.tsx tests should still pass since `logoSrc` has a default value.

- [ ] **Step 7: Commit**

```bash
git add components/ChatMessage.tsx components/MessageList.tsx __tests__/ChatMessage.test.tsx
git commit -m "feat: add AnimatedLogo to assistant messages in ChatMessage"
```

---

### Task 2: Replace VoiceButton with always-visible send button

**Files:**
- Modify: `components/ChatInput.tsx`
- Delete: `components/VoiceButton.tsx`
- Modify: `app/globals.css`
- Modify: `__tests__/ChatInput.test.tsx`

- [ ] **Step 1: Update ChatInput tests**

In `__tests__/ChatInput.test.tsx`, add these tests at the end of the `describe` block (before the closing `});`):

```tsx
  it("shows send button when textarea is empty (gray/disabled)", () => {
    render(<ChatInput {...defaultProps} />);
    const sendBtn = screen.getByRole("button", { name: /send/i });
    expect(sendBtn).toBeInTheDocument();
    expect(sendBtn).toBeDisabled();
  });

  it("shows send button with orange background when text is entered", async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Reply...");
    await user.type(textarea, "hello");

    const sendBtn = screen.getByRole("button", { name: /send/i });
    expect(sendBtn).not.toBeDisabled();
    expect(sendBtn).toHaveStyle({ backgroundColor: "var(--accent-orange)" });
  });

  it("does not render a voice button", () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.queryByRole("button", { name: /voice/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /listening/i })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify failures**

Run: `npx jest __tests__/ChatInput.test.tsx --no-cache`
Expected: "shows send button when textarea is empty" fails (currently VoiceButton renders instead of send button).

- [ ] **Step 3: Implement ChatInput changes**

Replace the entire `components/ChatInput.tsx` with:

```tsx
"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { ModelSelector } from "./ModelSelector";

type Persona = "claudia" | "consuela";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  persona: Persona;
  onPersonaChange: (persona: Persona) => void;
  isLanding?: boolean;
}

export function ChatInput({ onSend, disabled, persona, onPersonaChange, isLanding }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (!isLanding) {
      const el = e.target;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  };

  const hasText = value.trim().length > 0;
  const placeholder = isLanding ? "How are you doing today?" : "Reply...";

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-2 pt-2">
      <div
        className="flex flex-col rounded-2xl border px-4 py-3"
        style={{
          backgroundColor: "var(--input-bg)",
          borderColor: "var(--input-border)",
          boxShadow: "0 0.25rem 1.25rem rgba(0,0,0,0.035)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={isLanding ? 4 : 1}
          className={`w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none font-sans-input placeholder:text-[var(--text-secondary)] ${isLanding ? "" : "flex-1"}`}
          style={{
            color: "var(--text-primary)",
            maxHeight: isLanding ? "none" : "200px",
            minHeight: isLanding ? "100px" : "auto",
          }}
        />
        <div className="flex items-center justify-between mt-2">
          <div />
          <div className="flex items-center gap-2">
            <ModelSelector persona={persona} onPersonaChange={onPersonaChange} />
            <button
              onClick={handleSend}
              disabled={disabled || !hasText}
              aria-label="Send"
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer border-none"
              style={{
                backgroundColor: hasText ? "var(--accent-orange)" : "var(--text-secondary)",
                opacity: hasText ? 1 : 0.4,
                transition: "background-color 150ms ease, opacity 150ms ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 14V2M8 2L3 7M8 2L13 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Delete VoiceButton component**

```bash
rm components/VoiceButton.tsx
```

- [ ] **Step 5: Remove voice-pulse from globals.css**

In `app/globals.css`, remove the voice-pulse keyframe block (lines 89-96):

```css
@keyframes voice-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.15); }
}

.voice-pulse {
  animation: voice-pulse 1.2s ease-in-out infinite;
}
```

Also in the `@media (prefers-reduced-motion: reduce)` block (line 125), remove `.voice-pulse,` from the animation reset selector, changing:

```css
  .logo-rotating,
  .voice-pulse,
  .animate-fade-in,
  .word-reveal {
```

to:

```css
  .logo-rotating,
  .animate-fade-in,
  .word-reveal {
```

- [ ] **Step 6: Run ChatInput tests**

Run: `npx jest __tests__/ChatInput.test.tsx --no-cache`
Expected: All 9 tests PASS

- [ ] **Step 7: Run full test suite**

Run: `npx jest --no-cache`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add components/ChatInput.tsx app/globals.css __tests__/ChatInput.test.tsx
git rm components/VoiceButton.tsx
git commit -m "feat: replace VoiceButton with always-visible send button"
```

---

## Chunk 2: Settling Phase Animation

### Task 3: Add settling phase to MessageList

**Files:**
- Modify: `components/MessageList.tsx`
- Modify: `__tests__/MessageList.test.tsx`

- [ ] **Step 1: Add settling phase test — response stays visible**

In `__tests__/MessageList.test.tsx`, add this test at the end of the `describe` block:

```tsx
  it("keeps response visible during settling phase", () => {
    const { rerender } = render(
      <MessageList {...defaultProps} isThinking={true} />
    );

    // scrolling → thinking
    act(() => { jest.advanceTimersByTime(1000); });

    // Response arrives → transitioning
    rerender(
      <MessageList
        {...defaultProps}
        isThinking={false}
        pendingResponse="si papi"
      />
    );

    // transitioning → typing
    act(() => { jest.advanceTimersByTime(250); });

    // Typing completes → settled
    act(() => { jest.advanceTimersByTime(2000); });

    // settled → settling (500ms for rotation ease-out)
    act(() => { jest.advanceTimersByTime(500); });

    // During settling, response text should still be visible
    expect(screen.getByText("si papi")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Add settling phase test — onTypingComplete fires after settling**

Add another test:

```tsx
  it("calls onTypingComplete after settling animation", () => {
    const onTypingComplete = jest.fn();
    const { rerender } = render(
      <MessageList {...defaultProps} isThinking={true} onTypingComplete={onTypingComplete} />
    );

    // scrolling → thinking
    act(() => { jest.advanceTimersByTime(1000); });

    // Response arrives → transitioning
    rerender(
      <MessageList
        {...defaultProps}
        isThinking={false}
        pendingResponse="si papi"
        onTypingComplete={onTypingComplete}
      />
    );

    // transitioning → typing
    act(() => { jest.advanceTimersByTime(250); });

    // Typing completes → settled
    act(() => { jest.advanceTimersByTime(2000); });

    // Not yet called — still in settled/settling
    expect(onTypingComplete).not.toHaveBeenCalled();

    // settled → settling (500ms) + spacer fallback (450ms)
    act(() => { jest.advanceTimersByTime(500 + 450); });

    // Now onTypingComplete should have been called
    expect(onTypingComplete).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 3: Add edge case test — new message during settling commits immediately**

Add another test:

```tsx
  it("commits response immediately when new message arrives during settling", () => {
    const onTypingComplete = jest.fn();
    const { rerender } = render(
      <MessageList {...defaultProps} isThinking={true} onTypingComplete={onTypingComplete} />
    );

    // scrolling → thinking
    act(() => { jest.advanceTimersByTime(1000); });

    // Response arrives → transitioning
    rerender(
      <MessageList
        {...defaultProps}
        isThinking={false}
        pendingResponse="si papi"
        onTypingComplete={onTypingComplete}
      />
    );

    // transitioning → typing
    act(() => { jest.advanceTimersByTime(250); });

    // Typing completes → settled
    act(() => { jest.advanceTimersByTime(2000); });

    // settled → settling
    act(() => { jest.advanceTimersByTime(500); });

    expect(onTypingComplete).not.toHaveBeenCalled();

    // New message arrives during settling
    rerender(
      <MessageList
        {...defaultProps}
        isThinking={true}
        pendingResponse="si papi"
        onTypingComplete={onTypingComplete}
      />
    );

    // onTypingComplete should be called immediately to commit the response
    expect(onTypingComplete).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx jest __tests__/MessageList.test.tsx --no-cache`
Expected: All 3 new tests fail — `onTypingComplete` is called immediately in the current code (no settling phase), and the response text may not survive.

- [ ] **Step 5: Implement settling phase in MessageList**

Replace the entire `components/MessageList.tsx` with:

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
```

Key changes from the current code:
- `Phase` type adds `"settling"`
- Removed old `settled → scrolling` effect (lines 85-90). Replaced with combined `settled/settling → scrolling` effect that always calls `onTypingComplete()` (since `handleTypingDone` no longer does) and also resets spacer styles when interrupting from `settling`
- Edge-case reset guard now excludes `"settling"`
- New effect: `settled → settling` after 500ms
- New `handleSettlingComplete` callback: clears spacer inline styles, calls `onTypingComplete()`, sets idle
- New effect: `settling` phase animates spacer via ref + rAF
- `handleTypingDone` no longer calls `onTypingComplete()` — just sets phase to `settled`
- `responseOpacity` includes `settling`
- `logoPhase` maps `settling` to `"settled"`
- Response rendering condition includes `settling`
- Min-height spacer condition excludes `settling`
- Spacer `<div>` gets `ref={spacerRef}`
- ChatMessage receives `logoSrc` prop

- [ ] **Step 6: Run MessageList tests**

Run: `npx jest __tests__/MessageList.test.tsx --no-cache`
Expected: All 8 tests PASS (5 existing + 3 new)

- [ ] **Step 7: Run full test suite**

Run: `npx jest --no-cache`
Expected: Some page.test.tsx tests may fail due to timing changes (settling adds 500ms + 450ms before `onTypingComplete` fires). We'll fix these in Task 4.

- [ ] **Step 8: Commit**

```bash
git add components/MessageList.tsx __tests__/MessageList.test.tsx
git commit -m "feat: add settling phase with spacer slide animation"
```

---

### Task 4: Update page.test.tsx for settling timing

**Files:**
- Modify: `__tests__/page.test.tsx`

The settling phase adds 500ms (rotation ease-out) + 450ms (spacer fallback) = 950ms after typing completes before `onTypingComplete` fires. The existing page tests need this extra time.

- [ ] **Step 1: Update the "responds with si papi" test**

In `__tests__/page.test.tsx`, in the test `"responds with 'si papi' after thinking and typing"`, after the typing animation advance (line 76: `jest.advanceTimersByTime(3000)`), add the settling phase delays:

```tsx
    // Advance past settled → settling (500ms) + spacer fallback (450ms)
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    await act(async () => {
      jest.advanceTimersByTime(450);
    });
```

- [ ] **Step 2: Update the "disables input" test**

In the test `"disables input during all active phases and re-enables after cycle"`, after the typing animation advance (line 109: `jest.advanceTimersByTime(3000)`), add:

```tsx
    // Advance past settled → settling (500ms) + spacer fallback (450ms)
    await act(async () => { jest.advanceTimersByTime(500); });
    await act(async () => { jest.advanceTimersByTime(450); });
```

- [ ] **Step 3: Run page tests**

Run: `npx jest __tests__/page.test.tsx --no-cache`
Expected: All 5 tests PASS

- [ ] **Step 4: Run full test suite**

Run: `npx jest --no-cache`
Expected: All tests PASS

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Verify build succeeds**

Run: `npm run build`
Expected: Build completes successfully

- [ ] **Step 7: Commit**

```bash
git add __tests__/page.test.tsx
git commit -m "test: update page tests for settling phase timing"
```

- [ ] **Step 8: Manual verification**

Run: `npm run dev -- -p 3000`

Verify in browser at http://localhost:3000:
1. Send a message — logo appears during thinking with morphing animation
2. Response types out with logo rotating below
3. When typing completes, logo rotation eases to rest
4. After 0.5s, spacer smoothly slides up (logo moves up with it)
5. Logo persists below the committed message
6. Send another message — scroll works, new cycle starts
7. Verify the send button is always visible: gray when empty, orange when text entered
8. No voice/microphone button anywhere
