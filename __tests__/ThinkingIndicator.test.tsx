import { render, screen } from "@testing-library/react";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";

describe("ThinkingIndicator", () => {
  it("renders content when isVisible is true", () => {
    render(<ThinkingIndicator isVisible={true} />);
    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });

  it("renders DOM nodes when isVisible is false (no early return)", () => {
    render(<ThinkingIndicator isVisible={false} />);
    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });

  it("does not render a logo", () => {
    render(<ThinkingIndicator isVisible={true} />);
    expect(screen.queryByRole("img", { hidden: true })).not.toBeInTheDocument();
    const svgs = document.querySelectorAll("svg[aria-hidden='true']");
    expect(svgs.length).toBe(0);
  });
});
