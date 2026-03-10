import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

describe("Home (Chat Page)", () => {
  it("renders the initial empty state", () => {
    render(<Home />);
    expect(screen.getByText("How can I help you today?")).toBeInTheDocument();
  });

  it("shows user message after sending", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const textarea = screen.getByPlaceholderText("Reply to Claude...");
    await user.type(textarea, "what is 2+2?");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByText("what is 2+2?")).toBeInTheDocument();
  });

  it("shows thinking indicator after sending", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const textarea = screen.getByPlaceholderText("Reply to Claude...");
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });

  it("responds with 'si papi' after thinking", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Home />);

    const textarea = screen.getByPlaceholderText("Reply to Claude...");
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    // Advance past max thinking time
    jest.advanceTimersByTime(9000);

    await waitFor(() => {
      expect(screen.getByText("si papi")).toBeInTheDocument();
    });

    jest.useRealTimers();
  });
});
