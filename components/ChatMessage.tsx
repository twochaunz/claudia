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
          className="max-w-[85%] rounded-3xl px-5 py-3 text-[15px] leading-relaxed"
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
        className="text-[15px] leading-relaxed"
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
