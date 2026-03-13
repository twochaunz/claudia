import { render } from "@testing-library/react";
import { AnimatedLogo } from "@/components/AnimatedLogo";

describe("AnimatedLogo", () => {
  it("renders SVG filter defs in all phases", () => {
    const phases = ["thinking", "typing", "settled"] as const;
    for (const phase of phases) {
      const { container, unmount } = render(
        <AnimatedLogo logoSrc="/claude-logo.svg" phase={phase} />
      );
      expect(container.querySelector("feTurbulence")).toBeInTheDocument();
      expect(container.querySelector("feDisplacementMap")).toBeInTheDocument();
      unmount();
    }
  });

  it("only applies filter style during thinking phase", () => {
    const { container, rerender } = render(
      <AnimatedLogo logoSrc="/claude-logo.svg" phase="thinking" />
    );
    const svg = container.querySelector("svg")!;
    expect(svg.style.filter).toContain("url(#");

    rerender(<AnimatedLogo logoSrc="/claude-logo.svg" phase="typing" />);
    expect(svg.style.filter).toBe("");
  });
});
