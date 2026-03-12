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
    <div className="mb-4">
      <div
        className="text-[15px] leading-relaxed"
        style={{ color: "var(--text-primary)" }}
      >
        {content}
      </div>
    </div>
  );
}
