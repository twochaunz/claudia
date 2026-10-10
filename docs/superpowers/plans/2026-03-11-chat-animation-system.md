# Chat Animation System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a three-phase animation system — SVG morphing while thinking, rotation during typing, settled at rest — with word-by-word response reveal, scroll-to-top behavior, and logo-free past messages.

**Architecture:** Two new components (`AnimatedLogo`, `TypedResponse`) handle rendering inline SVGs with phase-based animations and progressive word reveal. The existing `MessageList` orchestrates the active response area (thinking → typing → settled). `page.tsx` adds `isTyping` and `pendingResponse` state to bridge thinking and committed messages. CSS additions provide rotation keyframes and layout spacing variables.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, SVG filters (no external animation libraries)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `components/AnimatedLogo.tsx` | Create | Inline SVG logos with displacement filter (thinking), CSS rotation (typing), static (settled) |
| `components/TypedResponse.tsx` | Create | Word-by-word text reveal with `onComplete` callback |
| `app/globals.css` | Modify | Add `logo-rotate` keyframes, `--header-height`/`--input-area-height` CSS vars, `prefers-reduced-motion` rules |
| `components/ChatMessage.tsx` | Modify | Remove logo/avatar from assistant messages |
| `components/ThinkingIndicator.tsx` | Modify | Replace `<Image>` with `AnimatedLogo` in thinking phase |
| `components/MessageList.tsx` | Modify | Manage active response area (3 phases), scroll-to-top, spacer |
| `app/page.tsx` | Modify | Add `isTyping`/`pendingResponse` state, update `handleSend`, disable input during typing |

---

## Chunk 1: AnimatedLogo Component + CSS

### Task 1: Add CSS keyframes and custom properties

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add CSS custom properties for layout spacing**

In `app/globals.css`, add to the `:root` block (after line 15):

```css
  --header-height: 52px;
  --input-area-height: 108px;
```

And to the `@media (prefers-color-scheme: dark)` `:root` block (after line 31):

```css
  --header-height: 52px;
  --input-area-height: 108px;
```

- [ ] **Step 2: Add logo rotation keyframes and reduced-motion rules**

Append to the end of `app/globals.css` (after the `.voice-pulse` block, line 92):

```css
@keyframes logo-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.logo-rotating {
  animation: logo-rotate 3.5s linear infinite;
}

.logo-settling {
  transition: transform 0.5s ease-out;
}

/* Word reveal animation */
.word-reveal {
  opacity: 0;
  transform: translateY(2px);
  animation: word-appear 0.15s ease-out forwards;
}

@keyframes word-appear {
  to { opacity: 1; transform: translateY(0); }
}

/* Accessibility: respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .logo-rotating,
  .voice-pulse,
  .animate-fade-in,
  .word-reveal {
    animation: none !important;
  }
  .word-reveal {
    opacity: 1 !important;
    transform: none !important;
  }
  .logo-settling {
    transition: none !important;
  }
}
```

- [ ] **Step 3: Verify CSS compiles**

Run: `cd /Users/wonchankim/Projects/claudia && npx next build 2>&1 | head -20`
Expected: No CSS compilation errors.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: add CSS keyframes for logo rotation and word reveal animations"
```

---

### Task 2: Create AnimatedLogo component

**Files:**
- Create: `components/AnimatedLogo.tsx`

- [ ] **Step 1: Create AnimatedLogo component**

```tsx
"use client";

import { useEffect, useRef, useCallback, useId } from "react";

type AnimationPhase = "thinking" | "typing" | "settled";

interface AnimatedLogoProps {
  logoSrc: string;
  phase: AnimationPhase;
  size?: number;
}

// Claudia starburst SVG path
const CLAUDIA_SVG = (
  <path
    d="M12 2C12 2 13.5 8.5 15.5 10.5C17.5 12.5 24 12 24 12C24 12 17.5 13.5 15.5 15.5C13.5 17.5 12 24 12 24C12 24 10.5 17.5 8.5 15.5C6.5 13.5 0 12 0 12C0 12 6.5 10.5 8.5 8.5C10.5 6.5 12 2 12 2Z"
    fill="#da7756"
  />
);

// Consuela SVG paths (body + glasses)
const CONSUELA_SVG = (
  <>
    <g transform="translate(0,24) scale(0.024,-0.024)" fill="#da7756" stroke="none">
      <path d="M520 990 c-8 -5 -36 -10 -61 -10 -67 0 -133 -26 -186 -75 -27 -23 -59 -46 -73 -50 -69 -22 -114 -86 -125 -178 -6 -57 -24 -87 -51 -87 -22 0 -17 -26 9 -44 l22 -16 -25 2 c-58 6 -19 -102 51 -141 22 -12 39 -28 39 -36 0 -7 11 -27 25 -43 26 -31 33 -66 15 -77 -15 -9 -12 -35 4 -35 9 0 12 -7 9 -21 -5 -19 -3 -21 28 -14 19 4 51 18 71 31 l37 23 7 -21 c12 -37 103 -126 143 -138 20 -7 64 -23 99 -37 58 -24 66 -25 117 -14 42 9 61 20 77 42 13 18 31 29 45 29 29 0 73 42 73 68 0 30 50 219 66 249 7 16 14 50 14 77 0 33 9 67 26 103 20 41 25 63 21 94 -6 48 -14 59 -27 39 -8 -12 -10 -9 -10 10 0 42 -11 69 -30 75 -9 3 -22 23 -29 44 -20 68 -80 108 -150 102 -13 -1 -33 7 -45 17 -11 11 -31 25 -43 31 -27 13 -122 14 -143 1z" />
    </g>
    <path
      d="M9.85 9.15 C11.55 8.55 13.75 8.55 15.35 9.15 C16.45 10.75 16.45 13.45 15.35 14.95 C13.75 15.55 11.55 15.55 9.85 14.95 C8.85 13.45 8.85 10.75 9.85 9.15Z"
      fill="none"
      stroke="#F5F5F0"
      strokeWidth="0.8"
    />
    <path
      d="M17.35 8.95 C19.05 8.35 21.25 8.35 22.85 8.95 C23.95 10.55 23.95 13.25 22.85 14.75 C21.25 15.35 19.05 15.35 17.35 14.75 C16.35 13.25 16.35 10.55 17.35 8.95Z"
      fill="none"
      stroke="#F5F5F0"
      strokeWidth="0.8"
    />
    <path
      d="M15.35 12.15 Q16.35 10.7 17.35 11.95"
      fill="none"
      stroke="#F5F5F0"
      strokeWidth="0.8"
    />
  </>
);

function getSvgContent(logoSrc: string) {
  if (logoSrc.includes("consuela")) return CONSUELA_SVG;
  return CLAUDIA_SVG;
}

export function AnimatedLogo({ logoSrc, phase, size = 28 }: AnimatedLogoProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number | null>(null);
  const filterRef = useRef<SVGFETurbulenceElement | null>(null);
  const filterId = `morph-filter-${useId()}`;

  // Thinking phase: animate feTurbulence baseFrequency
  useEffect(() => {
    if (phase !== "thinking" || !filterRef.current) return;

    let startTime: number | null = null;
    const cycleDuration = 2500; // ms per breath cycle
    const minFreq = 0.02;
    const maxFreq = 0.06;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % cycleDuration) / cycleDuration;
      // Sinusoidal oscillation: 0 -> 1 -> 0
      const t = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5;
      const freq = minFreq + t * (maxFreq - minFreq);

      if (filterRef.current) {
        filterRef.current.setAttribute("baseFrequency", `${freq}`);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase]);

  // Typing -> Settled: capture rotation angle and decelerate
  const handleSettling = useCallback(() => {
    if (!svgRef.current) return;
    const computed = getComputedStyle(svgRef.current);
    const matrix = computed.transform;
    if (matrix && matrix !== "none") {
      // Parse rotation from matrix(a, b, c, d, tx, ty)
      const values = matrix.match(/matrix\((.+)\)/)?.[1]?.split(",").map(Number);
      if (values) {
        const angle = Math.atan2(values[1], values[0]) * (180 / Math.PI);
        svgRef.current.style.transform = `rotate(${angle}deg)`;
      }
    }
  }, []);

  useEffect(() => {
    if (phase === "settled") {
      handleSettling();
    } else {
      // Clear inline transform when not settled
      if (svgRef.current) {
        svgRef.current.style.transform = "";
      }
    }
  }, [phase, handleSettling]);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const className = [
    phase === "typing" && !reducedMotion ? "logo-rotating" : "",
    phase === "settled" ? "logo-settling" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showFilter = phase === "thinking" && !reducedMotion;

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={showFilter ? { filter: `url(#${filterId})` } : undefined}
      aria-hidden="true"
    >
      {showFilter && (
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
      )}
      {getSvgContent(logoSrc)}
    </svg>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/wonchankim/Projects/claudia && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to `AnimatedLogo.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/AnimatedLogo.tsx
git commit -m "feat: create AnimatedLogo with SVG displacement morphing and rotation phases"
```

---

## Chunk 2: TypedResponse Component

### Task 3: Create TypedResponse component

**Files:**
- Create: `components/TypedResponse.tsx`

- [ ] **Step 1: Create TypedResponse component**

```tsx
"use client";

import { useState, useEffect, useRef } from "react";

interface TypedResponseProps {
  text: string;
  onComplete: () => void;
  /** Total duration for the typing animation in ms. Default 1200. */
  duration?: number;
}

export function TypedResponse({ text, onComplete, duration = 1200 }: TypedResponseProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);
  // Store onComplete in a ref to avoid restarting the interval when the callback identity changes
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Split by whitespace while preserving delimiters (newlines, spaces)
  const tokens = text.split(/(\s+)/);
  // Filter to just the words (non-whitespace tokens) for counting
  const words = tokens.filter((t) => t.trim().length > 0);
  const totalWords = words.length;

  // Check for reduced motion preference
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    // If reduced motion, show everything immediately
    if (reducedMotion) {
      setVisibleCount(totalWords);
      if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
      return;
    }

    if (totalWords === 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
      return;
    }

    const intervalMs = Math.max(duration / totalWords, 30); // min 30ms per word
    let count = 0;

    intervalRef.current = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= totalWords) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current();
        }
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, totalWords, duration, reducedMotion]);

  // Build visible text: walk tokens, count words seen, render up to visibleCount
  let wordsSeen = 0;
  const rendered = tokens.map((token, i) => {
    if (token.trim().length === 0) {
      // Whitespace token — only show if there's a next word that's already visible
      return wordsSeen < visibleCount ? (
        <span key={`ws-${i}`}>{token}</span>
      ) : null;
    }
    wordsSeen++;
    if (wordsSeen > visibleCount) return null;
    return (
      <span key={`w-${i}`} className="word-reveal">
        {token}
      </span>
    );
  });

  return (
    <div
      className="text-[15px] leading-relaxed"
      style={{ color: "var(--text-primary)" }}
      aria-label={text}
    >
      {/* Screen reader gets full text immediately via aria-label */}
      <span aria-hidden="true">{rendered}</span>
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/wonchankim/Projects/claudia && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to `TypedResponse.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/TypedResponse.tsx
git commit -m "feat: create TypedResponse with word-by-word reveal animation"
```

---

## Chunk 3: Integration — Modify Existing Components

### Task 4: Simplify ChatMessage (remove logo from assistant messages)

**Files:**
- Modify: `components/ChatMessage.tsx`

- [ ] **Step 1: Remove logo/avatar from assistant messages**

Replace the entire assistant message return block (lines 23-41) in `ChatMessage.tsx` with:

```tsx
  return (
    <div className="mb-4">
      <div
        className="text-[15px] leading-relaxed"
        style={{ color: "var(--text-primary)" }}
      >
        {content}
      </div>
    </div>
  );
```

Also remove the unused `Image` import (line 1) and the `logoSrc` prop from the interface and destructuring. The full file becomes:

```tsx
interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
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
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ChatMessage.tsx
git commit -m "feat: remove logo from assistant messages in ChatMessage"
```

---

### Task 5: Update ThinkingIndicator to use AnimatedLogo

**Files:**
- Modify: `components/ThinkingIndicator.tsx`

- [ ] **Step 1: Replace Image with AnimatedLogo**

Replace the `Image` import (line 4) with:

```tsx
import { AnimatedLogo } from "./AnimatedLogo";
```

Replace the logo rendering block (lines 31-38):

```tsx
      <div className="flex-shrink-0 w-7 h-7 mt-1">
        <Image
          src={logoSrc}
          alt="Assistant"
          width={28}
          height={28}
          className="rounded-full"
        />
      </div>
```

With:

```tsx
      <div className="flex-shrink-0 w-7 h-7 mt-1">
        <AnimatedLogo logoSrc={logoSrc} phase="thinking" size={28} />
      </div>
```

- [ ] **Step 2: Verify the component renders correctly**

Run: `cd /Users/wonchankim/Projects/claudia && npm run dev`
Manual check: Send a message, confirm the logo beside the thinking indicator has the organic warping/breathing effect.

- [ ] **Step 3: Commit**

```bash
git add components/ThinkingIndicator.tsx
git commit -m "feat: use AnimatedLogo with displacement morphing in ThinkingIndicator"
```

---

### Task 6: Update MessageList for active response area and scroll behavior

**Files:**
- Modify: `components/MessageList.tsx`

- [ ] **Step 1: Rewrite MessageList with phases, spacer, and scroll-to-top**

Replace the entire contents of `components/MessageList.tsx` with:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { TypedResponse } from "./TypedResponse";
import { AnimatedLogo } from "./AnimatedLogo";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface MessageListProps {
  messages: Message[];
  isThinking: boolean;
  isTyping: boolean;
  pendingResponse: string | null;
  logoSrc?: string;
  onTypingComplete: () => void;
}

export function MessageList({
  messages,
  isThinking,
  isTyping,
  pendingResponse,
  logoSrc = "/claude-logo.svg",
  onTypingComplete,
}: MessageListProps) {
  const latestUserRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll latest user message to top of viewport once when user sends a message
  useEffect(() => {
    if (!latestUserRef.current || !isThinking) return;
    latestUserRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isThinking]);

  // Find the index of the last user message (for placing the scroll ref)
  const lastUserIndex = messages.reduce(
    (acc, msg, i) => (msg.role === "user" ? i : acc),
    -1,
  );

  // Determine logo phase for the active response area
  const logoPhase = isThinking ? "thinking" : isTyping ? "typing" : "settled";

  // Should we show the settled logo? Only after the most recent assistant message
  // and when we're not thinking or typing
  const showSettledLogo =
    !isThinking &&
    !isTyping &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant";

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto chat-scroll">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {messages.map((msg, i) => (
          <div key={i}>
            {/* Place scroll anchor ref before the latest user message */}
            {i === lastUserIndex && <div ref={latestUserRef} />}
            <ChatMessage role={msg.role} content={msg.content} />
          </div>
        ))}

        {/* Active response area: Thinking phase */}
        <ThinkingIndicator isVisible={isThinking} logoSrc={logoSrc} />

        {/* Active response area: Typing phase */}
        {isTyping && pendingResponse && (
          <div className="mb-4">
            <TypedResponse text={pendingResponse} onComplete={onTypingComplete} />
            <div className="flex justify-start mt-3">
              <AnimatedLogo logoSrc={logoSrc} phase="typing" size={28} />
            </div>
          </div>
        )}

        {/* Active response area: Settled phase */}
        {showSettledLogo && (
          <div className="flex justify-start">
            <AnimatedLogo logoSrc={logoSrc} phase="settled" size={28} />
          </div>
        )}

        {/* Spacer to push user messages to top of viewport */}
        <div
          style={{
            minHeight: "calc(100dvh - var(--header-height, 52px) - var(--input-area-height, 108px))",
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/MessageList.tsx
git commit -m "feat: add active response area with phases, scroll-to-top, and spacer"
```

---

### Task 7: Update page.tsx with new state management

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add isTyping and pendingResponse state**

Replace the state declarations and handleSend in `app/page.tsx`. The full updated file:

```tsx
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
```

Key changes from the original:
- Added `isTyping`, `pendingResponse` state, and `pendingResponseRef` ref
- `handleSend` now transitions to typing phase instead of directly adding assistant message
- New `handleTypingComplete` callback uses ref to avoid stale closure — stable identity (empty deps)
- `ChatInput` disabled during both `isThinking` and `isTyping`
- `hasMessages` check includes `isTyping`
- `MessageList` receives new props: `isTyping`, `pendingResponse`, `onTypingComplete`
- Removed `logoSrc` from individual message objects (no longer needed)

**Note on task ordering:** Tasks 4-7 modify interdependent components. After Task 4 (ChatMessage removes `logoSrc` prop), the existing `MessageList` will have a TypeScript error until Task 6 updates it. Implement Tasks 4-7 before running type checks, or run all tasks in Chunk 3 as a single batch and commit together.

- [ ] **Step 2: Verify the app builds**

Run: `cd /Users/wonchankim/Projects/claudia && npx next build 2>&1 | tail -10`
Expected: Build succeeds.

- [ ] **Step 3: Manual verification**

Run: `cd /Users/wonchankim/Projects/claudia && npm run dev`

Verify the following flow:
1. Send a message → user message scrolls to top of viewport with whitespace below
2. Thinking phase → logo beside ThinkingIndicator has organic breathing/warping
3. Response arrives → ThinkingIndicator disappears, words appear one by one, logo rotates below
4. Typing completes → logo settles to static, rests below the response
5. Send another message → previous messages have no logos, new user message scrolls to top
6. Switch to Consuela → same animation behavior with Consuela logo

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add isTyping/pendingResponse state for three-phase animation flow"
```
