import { render, screen, act } from "@testing-library/react";
import { MessageList } from "@/components/MessageList";

// Mock scrollIntoView
const mockScrollIntoView = jest.fn();
Element.prototype.scrollIntoView = mockScrollIntoView;

const defaultProps = {
  messages: [] as { role: "user" | "assistant"; content: string }[],
  isThinking: false,
  pendingResponse: null as string | null,
  logoSrc: "/claude-logo.svg",
  onTypingComplete: jest.fn(),
};

describe("MessageList", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockScrollIntoView.mockClear();
    defaultProps.onTypingComplete.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders messages", () => {
    render(
      <MessageList
        {...defaultProps}
        messages={[{ role: "user", content: "hello" }]}
      />
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("shows logo when isThinking becomes true", () => {
    render(<MessageList {...defaultProps} isThinking={true} />);
    // AnimatedLogo renders an SVG with aria-hidden="true"
    const svg = document.querySelector("svg[aria-hidden='true']");
    expect(svg).toBeInTheDocument();
  });

  it("does not show thinking text immediately (scrolling phase)", () => {
    render(<MessageList {...defaultProps} isThinking={true} />);
    // During scrolling phase, thinking text should not be visible yet
    // ThinkingIndicator renders but its wrapper has opacity 0
    const wrapper = document.querySelector("[data-testid='thinking-wrapper']");
    expect(wrapper).toHaveStyle({ opacity: "0" });
  });

  it("shows thinking text after scroll completes", () => {
    render(<MessageList {...defaultProps} isThinking={true} />);

    // Advance past scroll fallback timer (1000ms)
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const wrapper = document.querySelector("[data-testid='thinking-wrapper']");
    expect(wrapper).toHaveStyle({ opacity: "1" });
  });

  it("renders persistent logo across phase changes", () => {
    const { rerender } = render(
      <MessageList {...defaultProps} isThinking={true} />
    );

    const logoBeforeTransition = document.querySelector("svg[aria-hidden='true']");
    expect(logoBeforeTransition).toBeInTheDocument();

    // Advance to thinking phase
    act(() => { jest.advanceTimersByTime(1000); });

    // Simulate response arrival
    rerender(
      <MessageList
        {...defaultProps}
        isThinking={false}
        pendingResponse="si papi"
      />
    );

    // Logo should still be the same DOM element (persistent)
    const logoAfterTransition = document.querySelector("svg[aria-hidden='true']");
    expect(logoAfterTransition).toBeInTheDocument();
  });

  it("shows settled logo after typing completes", () => {
    const { rerender } = render(
      <MessageList {...defaultProps} isThinking={true} />
    );

    // Advance through scrolling -> thinking
    act(() => { jest.advanceTimersByTime(1000); });

    // Response arrives -> transitioning
    rerender(
      <MessageList
        {...defaultProps}
        isThinking={false}
        pendingResponse="si papi"
      />
    );

    // Advance past transitioning fade-out (250ms fallback)
    act(() => { jest.advanceTimersByTime(250); });

    // Advance past TypedResponse duration (1200ms default + buffer)
    act(() => { jest.advanceTimersByTime(2000); });

    // After typing completes, logo should still be present (settled phase)
    const logo = document.querySelector("svg[aria-hidden='true']");
    expect(logo).toBeInTheDocument();
  });

  it("commits message after settling delay", () => {
    const onTypingComplete = jest.fn();
    const { rerender } = render(
      <MessageList {...defaultProps} isThinking={true} onTypingComplete={onTypingComplete} />
    );

    // scrolling → thinking
    act(() => { jest.advanceTimersByTime(1000); });

    // Response arrives → transitioning
    rerender(
      <MessageList
        {...defaultProps}
        isThinking={false}
        pendingResponse="si papi"
        onTypingComplete={onTypingComplete}
      />
    );

    // transitioning → typing
    act(() => { jest.advanceTimersByTime(250); });

    // Typing completes → settled
    act(() => { jest.advanceTimersByTime(2000); });

    // Not yet committed — still in settled phase
    expect(onTypingComplete).not.toHaveBeenCalled();

    // settled → settling → idle (500ms for rotation ease-out, then immediate commit)
    act(() => { jest.advanceTimersByTime(500); });

    // onTypingComplete should have been called during settling
    expect(onTypingComplete).toHaveBeenCalledTimes(1);
  });

  it("commits response immediately when new message arrives during settled phase", () => {
    const onTypingComplete = jest.fn();
    const { rerender } = render(
      <MessageList {...defaultProps} isThinking={true} onTypingComplete={onTypingComplete} />
    );

    // scrolling → thinking
    act(() => { jest.advanceTimersByTime(1000); });

    // Response arrives → transitioning
    rerender(
      <MessageList
        {...defaultProps}
        isThinking={false}
        pendingResponse="si papi"
        onTypingComplete={onTypingComplete}
      />
    );

    // transitioning → typing
    act(() => { jest.advanceTimersByTime(250); });

    // Typing completes → settled
    act(() => { jest.advanceTimersByTime(2000); });

    expect(onTypingComplete).not.toHaveBeenCalled();

    // New message arrives during settled phase (before 500ms settling timer)
    rerender(
      <MessageList
        {...defaultProps}
        isThinking={true}
        pendingResponse="si papi"
        onTypingComplete={onTypingComplete}
      />
    );

    // onTypingComplete should be called immediately to commit the response
    expect(onTypingComplete).toHaveBeenCalledTimes(1);
  });
});
