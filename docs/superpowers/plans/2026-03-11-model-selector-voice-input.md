# Model Selector + Voice Input Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Claude.ai-style model selector dropdown and continuous voice input to the chat interface.

**Architecture:** Two new components (ModelSelector, VoiceButton) composed into an updated ChatInput. The landing page uses the same ChatInput with an `isLanding` prop for the taller variant. Page-level state for persona is passed down; voice uses the Web Speech API in continuous mode.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Web Speech API

---

## Chunk 1: ModelSelector Component

### Task 1: Create ModelSelector component

**Files:**
- Create: `components/ModelSelector.tsx`

- [ ] **Step 1: Create ModelSelector component**

```tsx
"use client";

import { useState, useRef, useEffect } from "react";

type Persona = "claudia" | "consuela";

interface ModelSelectorProps {
  persona: Persona;
  onPersonaChange: (persona: Persona) => void;
}

export function ModelSelector({ persona, onPersonaChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = persona === "claudia" ? "Claudia" : "Consuela";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[13px] font-medium px-2 py-1 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
        style={{ color: "var(--text-secondary)" }}
      >
        {displayName}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M3 5L6 8L9 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-2 right-0 w-56 rounded-xl border py-1 shadow-lg z-50"
          style={{
            backgroundColor: "var(--input-bg)",
            borderColor: "var(--input-border)",
          }}
        >
          <button
            onClick={() => { onPersonaChange("claudia"); setOpen(false); }}
            className="w-full flex items-center justify-between px-4 py-3 text-[14px] text-left bg-transparent border-none cursor-pointer transition-colors hover:opacity-80"
            style={{ color: "var(--text-primary)" }}
          >
            <div>
              <div className="font-medium">Claudia</div>
              <div className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                Most agreeable for everyday tasks
              </div>
            </div>
            {persona === "claudia" && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8L6.5 11.5L13 5" stroke="var(--accent-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <button
            onClick={() => { onPersonaChange("consuela"); setOpen(false); }}
            className="w-full flex items-center justify-between px-4 py-3 text-[14px] text-left bg-transparent border-none cursor-pointer transition-colors hover:opacity-80"
            style={{ color: "var(--text-primary)" }}
          >
            <div>
              <div className="font-medium">Consuela</div>
              <div className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                Think longer for complex tasks
              </div>
            </div>
            {persona === "consuela" && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8L6.5 11.5L13 5" stroke="var(--accent-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders**

Run: `cd /Users/wonchankim/Projects/claudia && npm run build`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
cd /Users/wonchankim/Projects/claudia
git add components/ModelSelector.tsx
git commit -m "feat: add ModelSelector dropdown component"
```

---

## Chunk 2: VoiceButton Component

### Task 2: Create VoiceButton component

**Files:**
- Create: `components/VoiceButton.tsx`
- Modify: `app/globals.css` (add pulse animation)

- [ ] **Step 1: Add pulse animation to globals.css**

Append to `app/globals.css` after the existing `.thinking-dot` rules:

```css
@keyframes voice-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.15); }
}

.voice-pulse {
  animation: voice-pulse 1.2s ease-in-out infinite;
}
```

- [ ] **Step 2: Create VoiceButton component**

```tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

// Extend Window for webkitSpeechRecognition
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const supported = typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!supported) return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const transcript = last[0].transcript.trim();
        if (transcript) {
          onTranscript(transcript);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "aborted") {
        console.error("Speech recognition error:", event.error);
        stop();
      }
    };

    recognition.onend = () => {
      // Restart if we're still supposed to be listening (continuous mode)
      if (recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          stop();
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [supported, onTranscript, stop]);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
    } else {
      start();
    }
  }, [listening, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  if (!supported) return null;

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      aria-label={listening ? "Stop listening" : "Start voice input"}
      className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 cursor-pointer bg-transparent border-none ${listening ? "voice-pulse" : ""}`}
      style={{
        color: listening ? "var(--accent-orange)" : "var(--text-secondary)",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Voice bars / equalizer icon matching Claude.ai */}
        <rect x="4" y="10" width="2" height="4" rx="1" fill="currentColor" />
        <rect x="8" y="7" width="2" height="10" rx="1" fill="currentColor" />
        <rect x="12" y="4" width="2" height="16" rx="1" fill="currentColor" />
        <rect x="16" y="7" width="2" height="10" rx="1" fill="currentColor" />
        <rect x="20" y="10" width="2" height="4" rx="1" fill="currentColor" />
      </svg>
    </button>
  );
}
```

- [ ] **Step 3: Verify it renders**

Run: `cd /Users/wonchankim/Projects/claudia && npm run build`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
cd /Users/wonchankim/Projects/claudia
git add components/VoiceButton.tsx app/globals.css
git commit -m "feat: add VoiceButton component with Web Speech API"
```

---

## Chunk 3: Update ChatInput to compose new components

### Task 3: Rewrite ChatInput

**Files:**
- Modify: `components/ChatInput.tsx`

The ChatInput now accepts persona props and an `isLanding` flag. It composes ModelSelector and VoiceButton. When `isLanding` is true, the textarea is taller (~3-4 lines) with placeholder "How are you doing today?". When false, it's compact with placeholder "Reply...".

- [ ] **Step 1: Rewrite ChatInput**

Replace the entire contents of `components/ChatInput.tsx` with:

```tsx
"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { ModelSelector } from "./ModelSelector";
import { VoiceButton } from "./VoiceButton";

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

  const handleVoiceTranscript = (text: string) => {
    onSend(text);
  };

  const hasText = value.trim().length > 0;
  const placeholder = isLanding ? "How are you doing today?" : "Reply...";

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 pt-2">
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
            {hasText ? (
              <button
                onClick={handleSend}
                disabled={disabled || !hasText}
                aria-label="Send"
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 cursor-pointer border-none"
                style={{
                  backgroundColor: "var(--accent-orange)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 14V2M8 2L3 7M8 2L13 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : (
              <VoiceButton onTranscript={handleVoiceTranscript} disabled={disabled} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/wonchankim/Projects/claudia && npm run build`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
cd /Users/wonchankim/Projects/claudia
git add components/ChatInput.tsx
git commit -m "feat: update ChatInput with ModelSelector, VoiceButton, and landing variant"
```

---

## Chunk 4: Update page.tsx

### Task 4: Rewrite page.tsx to use new ChatInput

**Files:**
- Modify: `app/page.tsx`

Changes:
- Remove the inline landing input and replace with `<ChatInput isLanding />`
- Remove logo click-to-toggle (`handleToggle` on logo)
- Remove the "Switch to Consuela" button
- Add disclaimer text: "Claudia and Consuela can make mistakes. Please double-check responses."
- Pass `persona` and `onPersonaChange` to ChatInput
- Persona change no longer clears chat
- Logo still updates based on persona but is not clickable

- [ ] **Step 1: Rewrite page.tsx**

Replace the entire contents of `app/page.tsx` with:

```tsx
"use client";

import { useState, useCallback } from "react";
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
  const [persona, setPersona] = useState<Persona>("claudia");

  const handleSend = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsThinking(true);

    const baseDelay = 1500;
    const perChar = 30 * text.length;
    const jitter = Math.random() * 2000 - 1000;
    const delay = Math.min(baseDelay + perChar + jitter, 12000);
    setTimeout(() => {
      setIsThinking(false);
      setMessages((prev) => [...prev, { role: "assistant", content: getResponse(persona) }]);
    }, delay);
  }, [persona]);

  const handlePersonaChange = (newPersona: Persona) => {
    setPersona(newPersona);
  };

  const displayName = persona === "claudia" ? "Claudia" : "Consuela";
  const logoSrc = persona === "claudia" ? "/claude-logo.svg" : "/consuela-logo.svg";
  const hasMessages = messages.length > 0 || isThinking;

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
            disabled={isThinking}
            persona={persona}
            onPersonaChange={handlePersonaChange}
            isLanding
          />

          <p
            className="text-center text-[13px] mt-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Claudia and Consuela can make mistakes. Please double-check responses.
          </p>
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
          <span className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>
            {displayName}
          </span>
        </div>
      </header>

      <MessageList messages={messages} isThinking={isThinking} logoSrc={logoSrc} />

      <ChatInput
        onSend={handleSend}
        disabled={isThinking}
        persona={persona}
        onPersonaChange={handlePersonaChange}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/wonchankim/Projects/claudia && npm run build`
Expected: Build succeeds, no errors

- [ ] **Step 3: Manual smoke test**

Run: `cd /Users/wonchankim/Projects/claudia && npm run dev`

Verify:
1. Landing page shows taller input with "How are you doing today?" placeholder
2. Model selector dropdown shows at bottom-right, switches between Claudia/Consuela
3. Logo updates when persona changes but is not clickable
4. Voice icon shows when input is empty; send arrow shows when text is entered
5. Disclaimer text appears below input
6. After sending a message, input shrinks to compact with "Reply..." placeholder
7. Header shows persona name and logo centered (no toggle button)
8. Switching persona mid-conversation does NOT clear chat

- [ ] **Step 4: Commit**

```bash
cd /Users/wonchankim/Projects/claudia
git add app/page.tsx
git commit -m "feat: integrate model selector, voice input, and updated landing page"
```
