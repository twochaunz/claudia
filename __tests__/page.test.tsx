import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

// Phase durations from useChatMachine: scrolling 300ms, response delay 2–5s,
// transitioning 220ms, typing ~1200ms, settled 500ms.
const PAST_SCROLL = 300;
const PAST_RESPONSE = 5100;
const PAST_TRANSITION = 250;
const PAST_TYPING = 2000;
const PAST_SETTLE = 600;

/**
 * Advance through a full send→commit cycle.
 *
 * The four `act` calls are load-bearing, not stylistic. Timers are created by
 * effects, so a timer only exists once React has committed the render that
 * schedules it — but `advanceTimersByTime` fires everything synchronously
 * before that commit happens. Collapsing these into one call therefore leaves
 * the cycle parked in `settled` with the response still uncommitted:
 *
 *   act 1 → scrolling → thinking → transitioning
 *   act 2 → transitioning → typing (TypedResponse mounts here, so its word
 *           interval does not exist until this act returns)
 *   act 3 → word reveal finishes → settled
 *   act 4 → settled → idle, which is where the response is appended to
 *           messages[] and rendered as a plain committed message
 */
async function runCycle() {
  await act(async () => {
    jest.advanceTimersByTime(PAST_SCROLL + PAST_RESPONSE);
  });
  await act(async () => {
    jest.advanceTimersByTime(PAST_TRANSITION);
  });
  await act(async () => {
    jest.advanceTimersByTime(PAST_TYPING);
  });
  await act(async () => {
    jest.advanceTimersByTime(PAST_SETTLE);
  });
}

describe("Home (Chat Page)", () => {
  it("renders the initial empty state", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "Claudia" }),
    ).toBeInTheDocument();
  });

  it("shows user message after sending", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.type(
      screen.getByPlaceholderText("How are you doing today?"),
      "what is 2+2?",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByText("what is 2+2?")).toBeInTheDocument();
  });

  it("reuses the same textarea element across the landing → chat transition", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const landing = screen.getByPlaceholderText("How are you doing today?");
    await user.type(landing, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    const reply = screen.getByPlaceholderText("Reply...");
    // Identity check: if React tore down and rebuilt the input, iOS would drop
    // the keyboard and refuse to reopen it without a new gesture.
    expect(reply).toBe(landing);
  });

  it("shows thinking indicator after the scroll phase", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Home />);

    await user.type(
      screen.getByPlaceholderText("How are you doing today?"),
      "hello",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    await act(async () => {
      jest.advanceTimersByTime(PAST_SCROLL);
    });

    expect(screen.getByText("Thinking")).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("responds with 'si papi' after thinking and typing", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Home />);

    await user.type(
      screen.getByPlaceholderText("How are you doing today?"),
      "hello",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    await runCycle();

    expect(screen.getByText("si papi")).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("commits a second response with identical text", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Home />);

    await user.type(
      screen.getByPlaceholderText("How are you doing today?"),
      "hello",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));
    await runCycle();

    await user.type(screen.getByPlaceholderText("Reply..."), "again");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await runCycle();

    // Both cycles must complete even though Claudia's reply never varies.
    expect(screen.getAllByText("si papi")).toHaveLength(2);
    jest.useRealTimers();
  });

  it("accepts a send while a response is still in flight", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Home />);

    await user.type(
      screen.getByPlaceholderText("How are you doing today?"),
      "first",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    // Interrupt mid-thinking.
    await act(async () => {
      jest.advanceTimersByTime(PAST_SCROLL + 500);
    });

    await user.type(screen.getByPlaceholderText("Reply..."), "second");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByText("second")).toBeInTheDocument();

    await runCycle();
    expect(screen.getByText("si papi")).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("keeps the input editable during every phase", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Home />);

    await user.type(
      screen.getByPlaceholderText("How are you doing today?"),
      "hello",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    const textarea = screen.getByPlaceholderText("Reply...");
    const assertWritable = () => {
      expect(textarea).not.toBeDisabled();
      expect(textarea).not.toHaveAttribute("readonly");
      expect(textarea).not.toHaveAttribute("aria-disabled");
      expect(screen.getByRole("button", { name: /send/i })).not.toBeDisabled();
    };

    assertWritable();
    await act(async () => {
      jest.advanceTimersByTime(PAST_SCROLL + PAST_RESPONSE);
    });
    assertWritable();
    await act(async () => {
      jest.advanceTimersByTime(PAST_TRANSITION + PAST_TYPING);
    });
    assertWritable();
    await act(async () => {
      jest.advanceTimersByTime(PAST_SETTLE);
    });
    assertWritable();

    jest.useRealTimers();
  });

  it("commits the response under prefers-reduced-motion (instant reveal)", async () => {
    // Regression: with reduced motion TypedResponse completes synchronously on
    // mount. It used to mount during `transitioning`, where typingDone is
    // ignored, so the cycle never left `typing` and nothing was committed.
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Home />);

    await user.type(
      screen.getByPlaceholderText("How are you doing today?"),
      "hello",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));
    await runCycle();

    // Committed: the plain ChatMessage renders the text, no reveal wrapper.
    expect(screen.getByText("si papi")).toBeInTheDocument();
    expect(screen.queryByLabelText("si papi")).not.toBeInTheDocument();

    // And the next cycle still works.
    await user.type(screen.getByPlaceholderText("Reply..."), "again");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await runCycle();
    expect(screen.getAllByText("si papi")).toHaveLength(2);

    jest.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it("returns to the landing view when the header logo is clicked", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Home />);

    await user.type(
      screen.getByPlaceholderText("How are you doing today?"),
      "hello",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));
    await runCycle();

    await user.click(screen.getByRole("button", { name: /new chat/i }));

    expect(
      screen.getByRole("heading", { name: "Claudia" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("hello")).not.toBeInTheDocument();
    jest.useRealTimers();
  });
});
