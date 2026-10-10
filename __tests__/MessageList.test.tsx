import { render, screen, act } from "@testing-library/react";
import { MessageList } from "@/components/MessageList";
import type { Message, Phase } from "@/components/useChatMachine";

const mockScrollTo = jest.fn();
Element.prototype.scrollTo = mockScrollTo;

function props(
  overrides: {
    messages?: Message[];
    phase?: Phase;
    pending?: string | null;
    cycleId?: number;
  } = {},
) {
  return {
    messages: [] as Message[],
    phase: "idle" as Phase,
    pending: null as string | null,
    cycleId: 0,
    logoSrc: "/claude-logo.svg",
    pendingLogo: "/claude-logo.svg",
    displayName: "Claudia",
    onTypingDone: jest.fn(),
    onReset: jest.fn(),
    ...overrides,
  };
}

const userMsg: Message = { role: "user", content: "hello" };

describe("MessageList", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockScrollTo.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders committed messages", () => {
    render(
      <MessageList
        {...props({
          messages: [userMsg, { role: "assistant", content: "si papi" }],
        })}
      />,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText("si papi")).toBeInTheDocument();
  });

  it("renders the header with the display name", () => {
    render(<MessageList {...props({ messages: [userMsg] })} />);
    expect(screen.getByText("Claudia")).toBeInTheDocument();
  });

  it("shows nothing active while idle", () => {
    render(<MessageList {...props({ messages: [userMsg] })} />);
    expect(screen.queryByTestId("thinking-wrapper")).not.toBeInTheDocument();
  });

  it("shows the thinking indicator during the thinking phase", () => {
    render(
      <MessageList {...props({ messages: [userMsg], phase: "thinking" })} />,
    );
    expect(screen.getByText("Thinking")).toBeInTheDocument();
    expect(screen.getByTestId("thinking-wrapper")).toHaveStyle({ opacity: 1 });
  });

  it("hides the thinking indicator during transitioning", () => {
    render(
      <MessageList
        {...props({
          messages: [userMsg],
          phase: "transitioning",
          pending: "si papi",
        })}
      />,
    );
    expect(screen.getByTestId("thinking-wrapper")).toHaveStyle({ opacity: 0 });
  });

  it("reveals the response during the typing phase", () => {
    render(
      <MessageList
        {...props({
          messages: [userMsg],
          phase: "typing",
          pending: "si papi",
          cycleId: 1,
        })}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByLabelText("si papi")).toBeInTheDocument();
  });

  it("calls onTypingDone once the reveal finishes", () => {
    const p = props({
      messages: [userMsg],
      phase: "typing",
      pending: "si papi",
      cycleId: 1,
    });
    render(<MessageList {...p} />);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(p.onTypingDone).toHaveBeenCalled();
  });

  it("keeps the response visible through the settled phase", () => {
    render(
      <MessageList
        {...props({
          messages: [userMsg],
          phase: "settled",
          pending: "si papi",
          cycleId: 1,
        })}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByLabelText("si papi")).toBeInTheDocument();
  });

  it("scrolls the anchor into view when a new cycle starts", () => {
    const { rerender } = render(
      <MessageList {...props({ messages: [userMsg], cycleId: 1 })} />,
    );
    mockScrollTo.mockClear();

    rerender(
      <MessageList
        {...props({
          messages: [userMsg, { role: "user", content: "again" }],
          cycleId: 2,
          phase: "scrolling",
        })}
      />,
    );

    expect(mockScrollTo).toHaveBeenCalled();
  });

  it("does not re-scroll on phase changes within the same cycle", () => {
    const { rerender } = render(
      <MessageList
        {...props({ messages: [userMsg], cycleId: 1, phase: "scrolling" })}
      />,
    );
    mockScrollTo.mockClear();

    rerender(
      <MessageList
        {...props({ messages: [userMsg], cycleId: 1, phase: "thinking" })}
      />,
    );
    rerender(
      <MessageList
        {...props({
          messages: [userMsg],
          cycleId: 1,
          phase: "typing",
          pending: "si papi",
        })}
      />,
    );

    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it("calls onReset when the header logo is clicked", () => {
    const p = props({ messages: [userMsg] });
    render(<MessageList {...p} />);

    screen.getByText("Claudia").closest("button")!.click();

    expect(p.onReset).toHaveBeenCalled();
  });

  it("replays the reveal when the same response text repeats in a new cycle", () => {
    const first = props({
      messages: [userMsg],
      phase: "typing",
      pending: "si papi",
      cycleId: 1,
    });
    const { rerender } = render(<MessageList {...first} />);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(first.onTypingDone).toHaveBeenCalled();

    // Same text, new cycle — the cycleId key must force a remount so the
    // reveal effect runs again. Claudia always answers "si papi", so without
    // the key the second message would never complete.
    const second = props({
      messages: [userMsg, { role: "user", content: "again" }],
      phase: "typing",
      pending: "si papi",
      cycleId: 2,
    });
    rerender(<MessageList {...second} />);
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(second.onTypingDone).toHaveBeenCalled();
  });
});
