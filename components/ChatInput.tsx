"use client";

import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  type KeyboardEvent,
} from "react";
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
/** One 16px line at leading-relaxed (1.625) is 26px. */
const REPLY_MIN_HEIGHT = 26;
/** Landing composer shows two empty lines, like claude.ai's. */
const LANDING_MIN_HEIGHT = 52;
/** Past this the composer scrolls internally instead of growing further. */
const MAX_HEIGHT = 208;

export function ChatInput({
  onSend,
  persona,
  onPersonaChange,
  isLanding,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Claude's composer grows with its content instead of scrolling a single
  // line, up to a cap, then scrolls internally. The height is measured from
  // scrollHeight in a layout effect so the frame that commits the new value
  // already has the right height — doing it in a plain effect paints one
  // frame at the old height first, which reads as a flicker on every newline.
  const minHeight = isLanding ? LANDING_MIN_HEIGHT : REPLY_MIN_HEIGHT;
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(Math.max(el.scrollHeight, minHeight), MAX_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, [value, minHeight]);

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
        className="flex flex-col rounded-2xl border px-4 pt-3 pb-2.5"
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
          placeholder={
            isLanding
              ? "How can I help you today?"
              : `Reply to ${persona === "consuela" ? "Consuela" : "Claudia"}...`
          }
          enterKeyHint="send"
          rows={1}
          className="w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none font-sans-input placeholder:text-[var(--text-secondary)]"
          style={{
            color: "var(--text-primary)",
            // 16px font size is load-bearing: anything smaller makes iOS Safari
            // zoom the viewport on focus, which desyncs the visual viewport.
            minHeight: `${minHeight}px`,
            maxHeight: `${MAX_HEIGHT}px`,
            // Only the landing → chat shrink is animated; content-driven
            // growth is applied synchronously by the layout effect above.
            transition: "min-height 260ms cubic-bezier(0.4, 0, 0.2, 1)",
            padding: 0,
            margin: 0,
            border: "none",
            display: "block",
            touchAction: "manipulation",
            WebkitAppearance: "none",
            appearance: "none",
            backgroundColor: "transparent",
            cursor: "text",
          }}
        />
        <div className="flex items-center justify-end mt-2">
          <div
            className="flex items-center gap-1.5"
            // The wrapper is a <label>, so a click anywhere inside it ends
            // with the browser focusing the textarea. For the controls that
            // is wrong: picking a model from the menu popped the keyboard on
            // the landing view. The menu item unmounts synchronously on
            // click, so the browser no longer sees an interactive target
            // inside the label and runs the label's default action.
            // Cancelling the click's default here stops exactly that; the
            // buttons' own onClick handlers have already run by then. Only
            // the controls are wrapped, so the empty part of this row still
            // focuses the textarea on tap like the rest of the box.
            onClick={(e) => e.preventDefault()}
          >
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
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer border-none active:opacity-80"
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
