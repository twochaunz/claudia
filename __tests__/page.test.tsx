import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

describe("Home (Chat Page)", () => {
  it("renders the initial empty state", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Claudia" })).toBeInTheDocument();
  });

  it("shows user message after sending", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const textarea = screen.getByPlaceholderText("How are you doing today?");
    await user.type(textarea, "what is 2+2?");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByText("what is 2+2?")).toBeInTheDocument();
  });

  it("shows thinking indicator after scroll completes", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Home />);

    const textarea = screen.getByPlaceholderText("How are you doing today?");
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    // Advance past scroll fallback (1000ms) to reach thinking phase
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText("Thinking")).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("responds with 'si papi' after thinking and typing", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Home />);

    const textarea = screen.getByPlaceholderText("How are you doing today?");
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    // Advance past scroll fallback (1000ms)
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Advance past max thinking time (capped at 12s)
    await act(async () => {
      jest.advanceTimersByTime(13000);
    });

    // Advance past transitioning phase (250ms)
    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    // Advance past typing animation (~1200ms for 2 words + buffer)
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    // Advance past settled → settling (500ms, then immediate commit)
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText("si papi")).toBeInTheDocument();

    jest.useRealTimers();
  });

  it("keeps input focusable but read-only during all active phases and writable after cycle", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Home />);

    const textarea = screen.getByPlaceholderText("How are you doing today?");
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    // Chat view textarea (compact input)
    const chatTextarea = screen.getByPlaceholderText("Reply...");
    expect(chatTextarea).not.toBeDisabled();
    expect(chatTextarea).toHaveAttribute("readonly");
    expect(chatTextarea).toHaveAttribute("aria-disabled", "true");

    // Advance past scroll fallback (1000ms)
    await act(async () => { jest.advanceTimersByTime(1000); });

    // Advance past max thinking time (capped at 12s)
    await act(async () => { jest.advanceTimersByTime(13000); });

    // Still read-only — thinking just ended, transitioning phase starting
    expect(chatTextarea).not.toBeDisabled();
    expect(chatTextarea).toHaveAttribute("readonly");
    expect(chatTextarea).toHaveAttribute("aria-disabled", "true");

    // Advance past transitioning phase (250ms)
    await act(async () => { jest.advanceTimersByTime(250); });

    // Advance past typing animation (~1200ms for 2 words + buffer)
    await act(async () => { jest.advanceTimersByTime(3000); });

    // Advance past settled → settling (500ms, then immediate commit)
    await act(async () => { jest.advanceTimersByTime(500); });

    // After cycle completes, input should be writable again
    expect(chatTextarea).not.toBeDisabled();
    expect(chatTextarea).not.toHaveAttribute("readonly");
    expect(chatTextarea).toHaveAttribute("aria-disabled", "false");

    jest.useRealTimers();
  });
});
