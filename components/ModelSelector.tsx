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
    const handleClickOutside = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const displayName = persona === "claudia" ? "Claudia" : "Consuela";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[14px] font-medium px-3 py-2 rounded-lg transition-colors cursor-pointer bg-transparent border-none active:opacity-70"
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
          className="absolute bottom-full mb-2 right-0 w-56 max-w-[calc(100vw-2rem)] rounded-xl border py-1 shadow-lg z-50"
          style={{
            backgroundColor: "var(--input-bg)",
            borderColor: "var(--input-border)",
          }}
        >
          <button
            onClick={() => { onPersonaChange("claudia"); setOpen(false); }}
            className="w-full flex items-center justify-between px-4 py-3 text-[15px] text-left bg-transparent border-none cursor-pointer transition-colors active:opacity-80"
            style={{ color: "var(--text-primary)" }}
          >
            <div>
              <div className="font-medium">Claudia</div>
              <div className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
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
            className="w-full flex items-center justify-between px-4 py-3 text-[15px] text-left bg-transparent border-none cursor-pointer transition-colors active:opacity-80"
            style={{ color: "var(--text-primary)" }}
          >
            <div>
              <div className="font-medium">Consuela</div>
              <div className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
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
