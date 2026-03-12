"use client";

import { useState, useEffect } from "react";
import { AnimatedLogo } from "./AnimatedLogo";

interface ThinkingIndicatorProps {
  isVisible: boolean;
  logoSrc?: string;
}

export function ThinkingIndicator({ isVisible, logoSrc = "/claude-logo.svg" }: ThinkingIndicatorProps) {
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
        <AnimatedLogo logoSrc={logoSrc} phase="thinking" size={28} />
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
