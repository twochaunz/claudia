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

  it("keeps the same reserve under the newest message through the whole cycle", () => {
    // The reserve is what makes "scrolled to the bottom" and "newest message
    // pinned under the header" the same scroll position. It must be identical
    // while the reply is in flight and after it commits — if it shrank on
    // commit, a short conversation would lose its overflow and the browser
    // would clamp scrollTop back to 0 (the "jumps to the first message" bug);
    // if it were taller than the pinned view, scrolling back down would tuck
    // the bubble under the header.
    const anchor = () => screen.getByTestId("scroll-anchor").style.minHeight;
    const { rerender } = render(
      <MessageList {...props({ messages: [userMsg], phase: "scrolling", cycleId: 1 })} />,
    );
    const pinned = anchor();
    expect(pinned).toBe(
      "calc(var(--list-h, 100dvh) - var(--header-h, 60px) - 32px)",
    );

    rerender(
      <MessageList {...props({ messages: [userMsg], phase: "typing", pending: "si papi", cycleId: 1 })} />,
    );
    expect(anchor()).toBe(pinned);

    const committed: Message[] = [userMsg, { role: "assistant", content: "si papi" }];
    rerender(<MessageList {...props({ messages: committed, phase: "idle", cycleId: 1 })} />);
    expect(anchor()).toBe(pinned);
    expect(screen.getByTestId("scroll-anchor").style.transition).toBe("");

    // A long conversation: the reserve moves to the newest user message and
    // the earlier turns sit above it with no reserve of their own.
    const long: Message[] = [
      ...committed,
      { role: "user", content: "line\n".repeat(40) },
      { role: "assistant", content: "si papi" },
      { role: "user", content: "again" },
    ];
    rerender(<MessageList {...props({ messages: long, phase: "scrolling", cycleId: 3 })} />);
    expect(anchor()).toBe(pinned);
    expect(screen.getByTestId("scroll-anchor")).toHaveTextContent("again");
    expect(screen.getByTestId("scroll-anchor")).not.toHaveTextContent("hello");
    expect(mockScrollTo).toHaveBeenCalledTimes(2);
  });

  it("sets the header wordmark in the serif and never sizes it from the keyboard", () => {
    render(<MessageList {...props({ messages: [userMsg], phase: "idle", cycleId: 1 })} />);
    const title = screen.getByText("Claudia");
    expect(title.className).toContain("font-serif-response");
    const header = screen.getByRole("button", { name: /new chat/ }).parentElement!;
    expect(header.style.height).toBe("");
    expect(header.style.transition).toBe("");
  });

  it("does not mount the reveal before the typing phase", () => {
    render(
      <MessageList
        {...props({
          messages: [userMsg],
          phase: "transitioning",
          pending: "si papi",
          cycleId: 1,
        })}
      />,
    );
    expect(screen.queryByLabelText("si papi")).not.toBeInTheDocument();
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
