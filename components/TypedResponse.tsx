"use client";

import { useState, useEffect, useRef } from "react";

interface TypedResponseProps {
  text: string;
  onComplete: () => void;
  /** Total duration for the typing animation in ms. Default 1200. */
  duration?: number;
}

export function TypedResponse({ text, onComplete, duration = 1200 }: TypedResponseProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);
  // Store onComplete in a ref to avoid restarting the interval when the callback identity changes
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Split by whitespace while preserving delimiters (newlines, spaces)
  const tokens = text.split(/(\s+)/);
  // Filter to just the words (non-whitespace tokens) for counting
  const words = tokens.filter((t) => t.trim().length > 0);
  const totalWords = words.length;

  // Check for reduced motion preference
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    // If reduced motion, show everything immediately
    if (reducedMotion) {
      setVisibleCount(totalWords);
      if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
      return;
    }

    if (totalWords === 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
      return;
    }

    const intervalMs = Math.max(duration / totalWords, 30); // min 30ms per word
    let count = 0;

    intervalRef.current = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= totalWords) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current();
        }
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, totalWords, duration, reducedMotion]);

  // Build visible text: walk tokens, count words seen, render up to visibleCount
  let wordsSeen = 0;
  const rendered = tokens.map((token, i) => {
    if (token.trim().length === 0) {
      // Whitespace token — only show if there's a next word that's already visible
      return wordsSeen < visibleCount ? (
        <span key={`ws-${i}`}>{token}</span>
      ) : null;
    }
    wordsSeen++;
    if (wordsSeen > visibleCount) return null;
    return (
      <span key={`w-${i}`} className="word-reveal">
        {token}
      </span>
    );
  });

  return (
    <div
      className="text-[15px] leading-relaxed"
      style={{ color: "var(--text-primary)" }}
      aria-label={text}
    >
      {/* Screen reader gets full text immediately via aria-label */}
      <span aria-hidden="true">{rendered}</span>
    </div>
  );
}
