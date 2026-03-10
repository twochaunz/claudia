# Si Papi Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pixel-perfect Claude chat UI clone where every response is "si papi" after a fake thinking animation.

**Architecture:** Single-page Next.js app (App Router) with Tailwind CSS. Entirely client-side — no API calls. State managed via `useState` in the page component. Components: ChatMessage, ChatInput, ThinkingIndicator, MessageList.

**Tech Stack:** Next.js 15, Tailwind CSS 4, TypeScript, React 19

---

## File Structure

```
sipapi/
├── app/
│   ├── layout.tsx          — Root layout, fonts (Inter), metadata
│   ├── page.tsx            — Main chat page, state management, thinking logic
│   └── globals.css         — Global styles, Tailwind imports, custom animations
├── components/
│   ├── ChatMessage.tsx     — Single message bubble (user or assistant)
│   ├── ChatInput.tsx       — Bottom input bar with textarea + send button
│   ├── ThinkingIndicator.tsx — Fake thinking animation with elapsed timer
│   └── MessageList.tsx     — Scrollable message container with auto-scroll
├── public/
│   └── claude-logo.svg     — Claude sparkle icon
├── __tests__/
│   ├── ChatMessage.test.tsx
│   ├── ChatInput.test.tsx
│   └── page.test.tsx
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .gitignore
```

---

## Chunk 1: Project Scaffolding & Global Styles

### Task 1: Scaffold Next.js project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`, `.gitignore`

- [ ] **Step 1: Create Next.js app with Tailwind**

```bash
cd /Users/wonchankim/Projects/sipapi
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack --yes
```

- [ ] **Step 2: Verify it runs**

```bash
cd /Users/wonchankim/Projects/sipapi
npm run dev &
sleep 3
curl -s http://localhost:3000 | head -20
kill %1
```

Expected: HTML output from the Next.js default page.

- [ ] **Step 3: Install test dependencies**

```bash
npm install -D jest @testing-library/react @testing-library/jest-dom @types/jest jest-environment-jsdom ts-jest @testing-library/user-event
```

- [ ] **Step 4: Create jest.config.ts**

Create `jest.config.ts`:

```typescript
import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

export default createJestConfig(config);
```

Create `jest.setup.ts`:

```typescript
import "@testing-library/jest-dom";
```

- [ ] **Step 5: Commit scaffold**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind and Jest"
```

---

### Task 2: Global styles and layout

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Create: `public/claude-logo.svg`

- [ ] **Step 1: Create Claude sparkle logo SVG**

Create `public/claude-logo.svg` — a simplified version of Claude's sparkle/asterisk icon:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2C12 2 13.5 8.5 15.5 10.5C17.5 12.5 24 12 24 12C24 12 17.5 13.5 15.5 15.5C13.5 17.5 12 24 12 24C12 24 10.5 17.5 8.5 15.5C6.5 13.5 0 12 0 12C0 12 6.5 10.5 8.5 8.5C10.5 6.5 12 2 12 2Z" fill="#D97757"/>
</svg>
```

- [ ] **Step 2: Replace globals.css with Claude-matching styles**

Replace `app/globals.css` with:

```css
@import "tailwindcss";

:root {
  --bg-primary: #F5F4EF;
  --bg-chat: #FFFFFF;
  --bg-user-bubble: #F0EDE8;
  --text-primary: #1A1A1A;
  --text-secondary: #6B6560;
  --border-color: #E5E1DB;
  --accent-orange: #D97757;
  --accent-orange-light: #F5E6DE;
  --input-bg: #FFFFFF;
  --input-border: #D9D5CF;
  --thinking-bg: #F9F8F5;
}

* {
  box-sizing: border-box;
}

html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@keyframes pulse-dot {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

.thinking-dot:nth-child(1) { animation: pulse-dot 1.4s infinite 0s; }
.thinking-dot:nth-child(2) { animation: pulse-dot 1.4s infinite 0.2s; }
.thinking-dot:nth-child(3) { animation: pulse-dot 1.4s infinite 0.4s; }

/* Scrollbar styling */
.chat-scroll::-webkit-scrollbar {
  width: 6px;
}
.chat-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.chat-scroll::-webkit-scrollbar-thumb {
  background-color: var(--border-color);
  border-radius: 3px;
}
```

- [ ] **Step 3: Update layout.tsx**

Replace `app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Claude",
  description: "Talk to Claude",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx public/claude-logo.svg
git commit -m "feat: add global styles matching Claude UI and sparkle logo"
```

---

## Chunk 2: Components

### Task 3: ChatMessage component

**Files:**
- Create: `components/ChatMessage.tsx`
- Create: `__tests__/ChatMessage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/ChatMessage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { ChatMessage } from "@/components/ChatMessage";

describe("ChatMessage", () => {
  it("renders user message with correct text", () => {
    render(<ChatMessage role="user" content="hello" />);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("renders assistant message with correct text", () => {
    render(<ChatMessage role="assistant" content="si papi" />);
    expect(screen.getByText("si papi")).toBeInTheDocument();
  });

  it("renders Claude logo for assistant messages", () => {
    render(<ChatMessage role="assistant" content="si papi" />);
    expect(screen.getByAltText("Claude")).toBeInTheDocument();
  });

  it("does not render Claude logo for user messages", () => {
    render(<ChatMessage role="user" content="hello" />);
    expect(screen.queryByAltText("Claude")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/ChatMessage.test.tsx --verbose
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ChatMessage**

Create `components/ChatMessage.tsx`:

```tsx
import Image from "next/image";

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
    <div className="flex gap-3 mb-4 animate-fade-in">
      <div className="flex-shrink-0 w-7 h-7 mt-1">
        <Image
          src="/claude-logo.svg"
          alt="Claude"
          width={28}
          height={28}
          className="rounded-full"
        />
      </div>
      <div
        className="text-[15px] leading-relaxed flex-1"
        style={{ color: "var(--text-primary)" }}
      >
        {content}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/ChatMessage.test.tsx --verbose
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ChatMessage.tsx __tests__/ChatMessage.test.tsx
git commit -m "feat: add ChatMessage component with user/assistant styles"
```

---

### Task 4: ChatInput component

**Files:**
- Create: `components/ChatInput.tsx`
- Create: `__tests__/ChatInput.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/ChatInput.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "@/components/ChatInput";

describe("ChatInput", () => {
  it("renders textarea with placeholder", () => {
    render(<ChatInput onSend={() => {}} disabled={false} />);
    expect(screen.getByPlaceholderText("Reply to Claude...")).toBeInTheDocument();
  });

  it("calls onSend with message when send button clicked", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} disabled={false} />);

    const textarea = screen.getByPlaceholderText("Reply to Claude...");
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("clears textarea after sending", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={() => {}} disabled={false} />);

    const textarea = screen.getByPlaceholderText("Reply to Claude...");
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(textarea).toHaveValue("");
  });

  it("disables textarea and button when disabled prop is true", () => {
    render(<ChatInput onSend={() => {}} disabled={true} />);
    expect(screen.getByPlaceholderText("Reply to Claude...")).toBeDisabled();
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("does not send empty messages", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} disabled={false} />);

    await user.click(screen.getByRole("button", { name: /send/i }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("sends on Enter key press", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} disabled={false} />);

    const textarea = screen.getByPlaceholderText("Reply to Claude...");
    await user.type(textarea, "hello{Enter}");

    expect(onSend).toHaveBeenCalledWith("hello");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/ChatInput.test.tsx --verbose
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ChatInput**

Create `components/ChatInput.tsx`:

```tsx
"use client";

import { useState, useRef, KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
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
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  return (
    <div className="w-full max-w-[680px] mx-auto px-4 pb-4 pt-2">
      <div
        className="flex items-end gap-2 rounded-2xl border px-4 py-3"
        style={{
          backgroundColor: "var(--input-bg)",
          borderColor: "var(--input-border)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Reply to Claude..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-[var(--text-secondary)]"
          style={{ color: "var(--text-primary)", maxHeight: "200px" }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          aria-label="Send"
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors disabled:opacity-30"
          style={{
            backgroundColor: value.trim() ? "var(--accent-orange)" : "var(--border-color)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 14V2M8 2L3 7M8 2L13 7"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/ChatInput.test.tsx --verbose
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ChatInput.tsx __tests__/ChatInput.test.tsx
git commit -m "feat: add ChatInput component with send/enter/disable behavior"
```

---

### Task 5: ThinkingIndicator component

**Files:**
- Create: `components/ThinkingIndicator.tsx`

- [ ] **Step 1: Implement ThinkingIndicator**

Create `components/ThinkingIndicator.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

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

  if (!isVisible) return null;

  return (
    <div className="flex gap-3 mb-4 animate-fade-in">
      <div className="flex-shrink-0 w-7 h-7 mt-1">
        <Image
          src="/claude-logo.svg"
          alt="Claude"
          width={28}
          height={28}
          className="rounded-full"
        />
      </div>
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

- [ ] **Step 2: Commit**

```bash
git add components/ThinkingIndicator.tsx
git commit -m "feat: add ThinkingIndicator with animated dots and elapsed timer"
```

---

### Task 6: MessageList component

**Files:**
- Create: `components/MessageList.tsx`

- [ ] **Step 1: Implement MessageList**

Create `components/MessageList.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ChatMessage } from "./ChatMessage";
import { ThinkingIndicator } from "./ThinkingIndicator";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface MessageListProps {
  messages: Message[];
  isThinking: boolean;
}

export function MessageList({ messages, isThinking }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto chat-scroll">
      <div className="max-w-[680px] mx-auto px-4 py-6">
        {messages.length === 0 && !isThinking && (
          <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
            <Image
              src="/claude-logo.svg"
              alt="Claude"
              width={40}
              height={40}
              className="mb-4 opacity-40"
            />
            <p
              className="text-[18px] font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              How can I help you today?
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        <ThinkingIndicator isVisible={isThinking} />
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/MessageList.tsx
git commit -m "feat: add MessageList with auto-scroll and empty state"
```

---

## Chunk 3: Main Page & Integration

### Task 7: Main chat page

**Files:**
- Modify: `app/page.tsx`
- Create: `__tests__/page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/page.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

describe("Home (Chat Page)", () => {
  it("renders the initial empty state", () => {
    render(<Home />);
    expect(screen.getByText("How can I help you today?")).toBeInTheDocument();
  });

  it("shows user message after sending", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const textarea = screen.getByPlaceholderText("Reply to Claude...");
    await user.type(textarea, "what is 2+2?");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByText("what is 2+2?")).toBeInTheDocument();
  });

  it("shows thinking indicator after sending", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const textarea = screen.getByPlaceholderText("Reply to Claude...");
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });

  it("responds with 'si papi' after thinking", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Home />);

    const textarea = screen.getByPlaceholderText("Reply to Claude...");
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    // Advance past max thinking time
    jest.advanceTimersByTime(9000);

    await waitFor(() => {
      expect(screen.getByText("si papi")).toBeInTheDocument();
    });

    jest.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/page.test.tsx --verbose
```

Expected: FAIL — page doesn't have chat functionality yet.

- [ ] **Step 3: Implement the main page**

Replace `app/page.tsx` with:

```tsx
"use client";

import { useState, useCallback } from "react";
import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsThinking(true);

    const delay = Math.random() * 6000 + 2000; // 2-8 seconds
    setTimeout(() => {
      setIsThinking(false);
      setMessages((prev) => [...prev, { role: "assistant", content: "si papi" }]);
    }, delay);
  }, []);

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-center py-3 border-b"
        style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-primary)" }}
      >
        <div className="flex items-center gap-2">
          <img src="/claude-logo.svg" alt="Claude" width={24} height={24} />
          <span className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Claude
          </span>
        </div>
      </header>

      {/* Messages */}
      <MessageList messages={messages} isThinking={isThinking} />

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isThinking} />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest --verbose
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx __tests__/page.test.tsx
git commit -m "feat: wire up main chat page with thinking simulation"
```

---

### Task 8: Visual polish & manual testing

- [ ] **Step 1: Start dev server and visually verify**

```bash
npm run dev
```

Open http://localhost:3000 in a browser. Verify:
- Centered chat column
- "How can I help you today?" empty state with faded Claude logo
- User messages appear right-aligned in beige bubbles
- Thinking indicator appears with animated dots and elapsed timer
- "si papi" response appears after 2-8 seconds with Claude logo
- Input bar at bottom with rounded border and send button
- Send button turns orange when text is present
- Enter key sends, Shift+Enter adds newline

- [ ] **Step 2: Fix any visual issues found during manual testing**

Adjust colors, spacing, or typography as needed to match Claude's UI more closely.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: visual polish for Claude UI match"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run all tests**

```bash
npx jest --verbose
```

Expected: All tests PASS.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: verify build passes"
```
