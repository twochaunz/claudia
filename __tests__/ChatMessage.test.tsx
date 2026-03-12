import { render, screen } from "@testing-library/react";
import { ChatMessage } from "@/components/ChatMessage";

describe("ChatMessage", () => {
  it("renders user message with correct text", () => {
    render(<ChatMessage role="user" content="hello" />);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("renders assistant message with correct text", () => {
    render(<ChatMessage role="assistant" content="si papi" />);
    expect(screen.getByText("si papi")).toBeInTheDocument();
  });

  it("does not render a logo for assistant messages", () => {
    render(<ChatMessage role="assistant" content="si papi" />);
    expect(screen.queryByAltText("Assistant")).not.toBeInTheDocument();
  });

  it("does not render Claude logo for user messages", () => {
    render(<ChatMessage role="user" content="hello" />);
    expect(screen.queryByAltText("Assistant")).not.toBeInTheDocument();
  });
});
