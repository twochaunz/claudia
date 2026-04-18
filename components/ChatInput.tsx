"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
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

  // Auto-focus only on the landing textarea at mount.
  useEffect(() => {
    if (isLanding && !disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled, isLanding]);

  const handleSend = () => {
    if (disabled) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasText = value.trim().length > 0;
  const placeholder = isLanding ? "How are you doing today?" : "Reply...";

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-2 pt-2 flex-shrink-0">
      <div
        className="flex flex-col rounded-2xl border px-4 py-3"
        onClick={() => textareaRef.current?.focus()}
        style={{
          backgroundColor: "var(--input-bg)",
          borderColor: "var(--input-border)",
          boxShadow: "0 0.25rem 1.25rem rgba(0,0,0,0.035)",
          cursor: "text",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          enterKeyHint="send"
          rows={isLanding ? 4 : 1}
          className="w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none font-sans-input placeholder:text-[var(--text-secondary)]"
          style={{
            color: "var(--text-primary)",
            minHeight: isLanding ? "100px" : "44px",
            touchAction: "manipulation",
          }}
        />
        <div className="flex items-center justify-between mt-2">
          <div />
          <div className="flex items-center gap-2">
            <ModelSelector persona={persona} onPersonaChange={onPersonaChange} />
            <button
              onClick={handleSend}
              aria-label="Send"
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer border-none active:opacity-80"
              style={{
                backgroundColor: hasText && !disabled ? "var(--accent-orange)" : "var(--text-secondary)",
                opacity: hasText && !disabled ? 1 : 0.4,
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
