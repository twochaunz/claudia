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
