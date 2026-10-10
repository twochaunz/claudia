import { render, screen } from "@testing-library/react";
import { ChatMessage } from "@/components/ChatMessage";

describe("ChatMessage", () => {
  it("renders user message with correct text", () => {
    render(<ChatMessage role="user" content="hello" />);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("renders assistant message with correct text", () => {
    render(<ChatMessage role="assistant" content="si papi" logoSrc="/claude-logo.svg" />);
    expect(screen.getByText("si papi")).toBeInTheDocument();
  });

  it("renders a logo for assistant messages", () => {
    render(<ChatMessage role="assistant" content="si papi" logoSrc="/claude-logo.svg" />);
    const svg = document.querySelector("svg[aria-hidden='true']");
    expect(svg).toBeInTheDocument();
  });

  it("does not render a logo for user messages", () => {
    render(<ChatMessage role="user" content="hello" logoSrc="/claude-logo.svg" />);
    const svg = document.querySelector("svg[aria-hidden='true']");
    expect(svg).not.toBeInTheDocument();
  });
});

describe("ChatMessage line breaks", () => {
  it("preserves newlines typed with Shift+Enter in user messages", () => {
    render(<ChatMessage role="user" content={"line one\nline two"} />);
    const bubble = screen.getByText(/line one/);
    expect(bubble).toHaveClass("whitespace-pre-wrap");
    expect(bubble.textContent).toBe("line one\nline two");
  });
});
