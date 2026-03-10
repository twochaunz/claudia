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
      <div className="max-w-3xl mx-auto px-4 py-6">
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
