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
