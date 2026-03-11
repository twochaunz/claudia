"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ThinkingIndicator } from "./ThinkingIndicator";

interface Message {
  role: "user" | "assistant";
  content: string;
  logoSrc?: string;
}

interface MessageListProps {
  messages: Message[];
  isThinking: boolean;
  logoSrc?: string;
}

export function MessageList({ messages, isThinking, logoSrc = "/claude-logo.svg" }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto chat-scroll">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} logoSrc={msg.logoSrc || logoSrc} />
        ))}
        <ThinkingIndicator isVisible={isThinking} logoSrc={logoSrc} />
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
