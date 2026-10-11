import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "@/components/ChatInput";

const defaultProps = {
  onSend: () => {},
  persona: "claudia" as const,
  onPersonaChange: () => {},
};

describe("ChatInput", () => {
  it("names the persona in the reply placeholder, like claude.ai's 'Reply to Claude...'", () => {
    const { rerender } = render(<ChatInput {...defaultProps} />);
    expect(screen.getByPlaceholderText("Reply to Claudia...")).toBeInTheDocument();
    rerender(<ChatInput {...defaultProps} persona="consuela" />);
    expect(screen.getByPlaceholderText("Reply to Consuela...")).toBeInTheDocument();
  });

  it("renders textarea with landing placeholder when isLanding", () => {
    render(<ChatInput {...defaultProps} isLanding />);
    expect(
      screen.getByPlaceholderText("How can I help you today?"),
    ).toBeInTheDocument();
  });

  it("calls onSend with message when send button clicked", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} onSend={onSend} />);

    await user.type(screen.getByPlaceholderText(/^Reply to /), "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("clears textarea after sending", async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/^Reply to /);
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(textarea).toHaveValue("");
  });

  it("sends on Enter key press", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} onSend={onSend} />);

    await user.type(screen.getByPlaceholderText(/^Reply to /), "hello{Enter}");

    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("inserts a newline on Shift+Enter instead of sending", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByPlaceholderText(/^Reply to /);
    await user.type(textarea, "a{Shift>}{Enter}{/Shift}b");

    expect(onSend).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("a\nb");
  });

  it("does not send while an IME composition is active", () => {
    const onSend = jest.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByPlaceholderText(/^Reply to /);
    fireEvent.change(textarea, { target: { value: "にほんご" } });
    fireEvent.keyDown(textarea, { key: "Enter", isComposing: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it("does not send whitespace-only input", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} onSend={onSend} />);

    await user.type(screen.getByPlaceholderText(/^Reply to /), "   {Enter}");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("keeps focus in the textarea after sending, so the keyboard stays up", async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/^Reply to /);
    await user.type(textarea, "hello{Enter}");

    expect(textarea).toHaveFocus();
  });

  it("never marks the textarea as disabled or readonly", () => {
    render(<ChatInput {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/^Reply to /);
    expect(textarea).not.toBeDisabled();
    expect(textarea).not.toHaveAttribute("readonly");
    expect(textarea).not.toHaveAttribute("aria-disabled");
  });

  it("keeps the send button enabled so Enter and click are never blocked", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} onSend={onSend} />);

    // Empty: enabled but visually muted.
    const sendBtn = screen.getByRole("button", { name: /send/i });
    expect(sendBtn).not.toBeDisabled();
    expect(sendBtn).toHaveStyle({ backgroundColor: "var(--text-secondary)" });

    await user.type(screen.getByPlaceholderText(/^Reply to /), "hello");
    expect(sendBtn).toHaveStyle({ backgroundColor: "var(--accent-orange)" });
  });

  it("wraps the textarea in a label so taps focus it natively", () => {
    render(<ChatInput {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/^Reply to /);
    expect(textarea.closest("label")).not.toBeNull();
  });

  it("does not blur the textarea on pointer down", () => {
    const blurSpy = jest.spyOn(HTMLTextAreaElement.prototype, "blur");
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/^Reply to /);
    textarea.focus();
    blurSpy.mockClear();

    fireEvent.pointerDown(textarea);

    // The old implementation blurred then refocused, firing twice per tap and
    // flickering the iOS keyboard.
    expect(blurSpy).not.toHaveBeenCalled();
    blurSpy.mockRestore();
  });

  it("does not focus the textarea when a model is picked", async () => {
    const user = userEvent.setup();
    const onPersonaChange = jest.fn();
    render(<ChatInput {...defaultProps} isLanding onPersonaChange={onPersonaChange} />);
    const textarea = screen.getByPlaceholderText("How can I help you today?");
    textarea.blur();
    await user.click(screen.getByRole("button", { name: /^Claudia$/ }));
    // The composer wrapper is a <label>; a click that reaches it with its
    // default intact ends with the browser focusing the textarea (jsdom does
    // not model that step, so the cancelled default is what is asserted).
    const notPrevented = fireEvent.click(screen.getByText("Consuela", { exact: true }));
    expect(notPrevented).toBe(false);
    expect(onPersonaChange).toHaveBeenCalledWith("consuela");
    expect(textarea).not.toHaveFocus();
  });

  it("shows model selector with current persona", () => {
    render(<ChatInput {...defaultProps} persona="claudia" />);
    expect(screen.getByText("Claudia")).toBeInTheDocument();
  });

  it("does not render a voice button", () => {
    render(<ChatInput {...defaultProps} />);
    expect(
      screen.queryByRole("button", { name: /voice/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /listening/i }),
    ).not.toBeInTheDocument();
  });
});
