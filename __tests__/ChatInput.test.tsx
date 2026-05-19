import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "@/components/ChatInput";

const defaultProps = {
  onSend: () => {},
  disabled: false,
  persona: "claudia" as const,
  onPersonaChange: () => {},
};

describe("ChatInput", () => {
  it("renders textarea with Reply placeholder by default", () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByPlaceholderText("Reply...")).toBeInTheDocument();
  });

  it("renders textarea with landing placeholder when isLanding", () => {
    render(<ChatInput {...defaultProps} isLanding />);
    expect(screen.getByPlaceholderText("How are you doing today?")).toBeInTheDocument();
  });

  it("calls onSend with message when send button clicked", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByPlaceholderText("Reply...");
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("clears textarea after sending", async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Reply...");
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(textarea).toHaveValue("");
  });

  it("disables textarea when disabled prop is true", () => {
    render(<ChatInput {...defaultProps} disabled={true} />);
    expect(screen.getByPlaceholderText("Reply...")).toBeDisabled();
  });

  it("sends on Enter key press", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByPlaceholderText("Reply...");
    await user.type(textarea, "hello{Enter}");

    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("shows model selector with current persona", () => {
    render(<ChatInput {...defaultProps} persona="claudia" />);
    expect(screen.getByText("Claudia")).toBeInTheDocument();
  });

  it("shows send button when textarea is empty (gray/disabled)", () => {
    render(<ChatInput {...defaultProps} />);
    const sendBtn = screen.getByRole("button", { name: /send/i });
    expect(sendBtn).toBeInTheDocument();
    expect(sendBtn).toBeDisabled();
  });

  it("shows send button with orange background when text is entered", async () => {
    const user = userEvent.setup();
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Reply...");
    await user.type(textarea, "hello");

    const sendBtn = screen.getByRole("button", { name: /send/i });
    expect(sendBtn).not.toBeDisabled();
    expect(sendBtn).toHaveStyle({ backgroundColor: "var(--accent-orange)" });
  });

  it("does not render a voice button", () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.queryByRole("button", { name: /voice/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /listening/i })).not.toBeInTheDocument();
  });

  it("focuses the textarea from a pointer tap after being re-enabled", () => {
    const { rerender } = render(<ChatInput {...defaultProps} disabled={true} />);

    rerender(<ChatInput {...defaultProps} disabled={false} />);

    const textarea = screen.getByPlaceholderText("Reply...");
    const inputBox = textarea.closest(".rounded-2xl");
    expect(inputBox).not.toBeNull();

    fireEvent.pointerDown(inputBox as HTMLElement);

    expect(textarea).toHaveFocus();
  });

  it("refocuses the reply textarea from a direct pointer tap", () => {
    const focusSpy = jest.spyOn(HTMLTextAreaElement.prototype, "focus");
    const blurSpy = jest.spyOn(HTMLTextAreaElement.prototype, "blur");
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Reply...");
    textarea.focus();
    focusSpy.mockClear();
    blurSpy.mockClear();

    fireEvent.pointerDown(textarea);

    expect(blurSpy).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalledTimes(1);
    focusSpy.mockRestore();
    blurSpy.mockRestore();
  });

  it("lets the landing textarea handle direct pointer taps natively", () => {
    const focusSpy = jest.spyOn(HTMLTextAreaElement.prototype, "focus");
    render(<ChatInput {...defaultProps} isLanding />);
    focusSpy.mockClear();

    fireEvent.pointerDown(screen.getByPlaceholderText("How are you doing today?"));

    expect(focusSpy).not.toHaveBeenCalled();
    focusSpy.mockRestore();
  });
});
