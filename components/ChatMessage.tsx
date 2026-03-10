import Image from "next/image";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
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
    <div className="flex gap-3 mb-4 animate-fade-in">
      <div className="flex-shrink-0 w-7 h-7 mt-1">
        <Image
          src="/claude-logo.svg"
          alt="Claudia"
          width={28}
          height={28}
          className="rounded-full"
        />
      </div>
      <div
        className="text-[15px] leading-relaxed flex-1"
        style={{ color: "var(--text-primary)" }}
      >
        {content}
      </div>
    </div>
  );
}
