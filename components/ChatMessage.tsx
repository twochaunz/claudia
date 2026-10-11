import { AnimatedLogo } from "./AnimatedLogo";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  logoSrc?: string;
}

export function ChatMessage({ role, content, logoSrc = "/claude-logo.svg" }: ChatMessageProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end mb-4 animate-fade-in">
        <div
          className="max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words font-sans-input"
          style={{ backgroundColor: "var(--bg-user-bubble)", color: "var(--text-primary)" }}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div
        className="text-[16px] leading-relaxed whitespace-pre-wrap break-words"
        style={{ color: "var(--text-primary)" }}
      >
        {content}
      </div>
      <div className="flex justify-start mt-3">
        <AnimatedLogo logoSrc={logoSrc} phase="settled" size={28} />
      </div>
    </div>
  );
}
