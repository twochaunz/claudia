"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { ModelSelector } from "./ModelSelector";
import type { Persona } from "./useChatMachine";

interface ChatInputProps {
  onSend: (message: string) => void;
  persona: Persona;
  onPersonaChange: (persona: Persona) => void;
  /** Landing presentation: taller textarea, different placeholder. */
  isLanding?: boolean;
}

/**
 * Deliberately has no `disabled` prop.
 *
 * The old version took `disabled={isThinking || pendingResponse !== null}` and
 * early-returned from `handleSend`, so Enter silently did nothing for the 2–5s
 * of every response cycle. The state machine now accepts a send from any phase,
 * so there is nothing to gate on.
 *
 * This component must never unmount between the landing and chat views. On iOS,
 * unmounting a focused <textarea> dismisses the keyboard, and focus() cannot be
 * restored without a fresh user gesture — that is the whole "keyboard dead after
 * first message" class of bug. `page.tsx` keeps it at a stable position in the
 * child list so React reuses the same DOM node.
 */
export function ChatInput({
  onSend,
  persona,
  onPersonaChange,
  isLanding,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Autofocus once, on the landing view only, and only where a keyboard won't
  // be forced open over the content. Touch devices are left alone: iOS ignores
  // programmatic focus without a gesture anyway, and Android would pop the
  // keyboard over the hero on load.
  useEffect(() => {
    if (!isLanding) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    textareaRef.current?.focus();
    // Intentionally mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
    // Keep the caret in the field so the keyboard never drops between sends.
    // Safe here because we are inside a user-gesture call stack.
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Never intercept while an IME composition is open — committing a
    // Japanese/Korean/Chinese candidate also fires Enter.
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasText = value.trim().length > 0;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-2 pt-2 flex-shrink-0">
      {/*
        The wrapper is a <label>, not a div with pointer handlers. Native label
        forwarding focuses the textarea on tap with zero JS, which removes the
        old focusTextareaFromBox() blur-then-focus hack. That hack ran on both
        onPointerDown *and* onClick, so a single tap fired it twice and iOS
        flickered the keyboard.
      */}
      <label
        className="flex flex-col rounded-2xl border px-4 py-3"
        style={{
          backgroundColor: "var(--input-bg)",
          borderColor: "var(--input-border)",
          boxShadow: "0 0.25rem 1.25rem rgba(0,0,0,0.035)",
          cursor: "text",
          touchAction: "manipulation",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLanding ? "How are you doing today?" : "Reply..."}
          enterKeyHint="send"
          rows={1}
          className="w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none font-sans-input placeholder:text-[var(--text-secondary)]"
          style={{
            color: "var(--text-primary)",
            // 16px font size is load-bearing: anything smaller makes iOS Safari
            // zoom the viewport on focus, which desyncs the visual viewport.
            minHeight: isLanding ? "100px" : "44px",
            transition: "min-height 260ms cubic-bezier(0.4, 0, 0.2, 1)",
            touchAction: "manipulation",
            WebkitAppearance: "none",
            appearance: "none",
            backgroundColor: "transparent",
            cursor: "text",
          }}
        />
        <div className="flex items-center justify-between mt-2">
          <div />
          <div className="flex items-center gap-2">
            <ModelSelector persona={persona} onPersonaChange={onPersonaChange} />
            <button
              type="button"
              // Prevents the textarea from blurring when the button takes
              // focus, which on iOS would close and reopen the keyboard.
              // Only mousedown — cancelling pointerdown suppresses the click
              // itself in some browsers, which is how the send button ended up
              // "dead" in earlier attempts at this fix.
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSend}
              aria-label="Send"
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer border-none active:opacity-80"
              style={{
                backgroundColor: hasText
                  ? "var(--accent-orange)"
                  : "var(--text-secondary)",
                opacity: hasText ? 1 : 0.4,
                transition:
                  "background-color 150ms ease, opacity 150ms ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
      </label>
    </div>
  );
}
