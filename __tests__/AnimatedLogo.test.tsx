import { render } from "@testing-library/react";
import { AnimatedLogo } from "@/components/AnimatedLogo";

describe("AnimatedLogo", () => {
  describe("Claudia (lash logo)", () => {
    it("renders lash SVG paths", () => {
      const { container } = render(
        <AnimatedLogo logoSrc="/claude-logo.svg" phase="settled" />
      );
      // Lid curve path
      expect(container.querySelector('path[d^="M5 17.5"]')).toBeInTheDocument();
      // Should have 7 paths total (1 lid + 6 lashes)
      expect(container.querySelectorAll("path")).toHaveLength(7);
    });

    it("applies claudia-thinking class during thinking phase", () => {
      const { container } = render(
        <AnimatedLogo logoSrc="/claude-logo.svg" phase="thinking" />
      );
      expect(container.querySelector(".claudia-thinking")).toBeInTheDocument();
    });

    it("does not apply claudia-thinking class during typing phase", () => {
      const { container } = render(
        <AnimatedLogo logoSrc="/claude-logo.svg" phase="typing" />
      );
      expect(container.querySelector(".claudia-thinking")).not.toBeInTheDocument();
    });

    it("applies logo-rotating class during typing phase", () => {
      const { container } = render(
        <AnimatedLogo logoSrc="/claude-logo.svg" phase="typing" />
      );
      expect(container.querySelector("svg")?.classList.contains("logo-rotating")).toBe(true);
    });

    it("applies logo-settling class during settled phase", () => {
      const { container } = render(
        <AnimatedLogo logoSrc="/claude-logo.svg" phase="settled" />
      );
      expect(container.querySelector("svg")?.classList.contains("logo-settling")).toBe(true);
    });
  });

  describe("Consuela (glasses logo)", () => {
    it("renders body and glasses SVG paths", () => {
      const { container } = render(
        <AnimatedLogo logoSrc="/consuela-logo.svg" phase="settled" />
      );
      // Body path (starts with M520)
      expect(container.querySelector('path[d^="M520"]')).toBeInTheDocument();
      // Glasses paths (left lens, right lens, bridge) = 3 plus body = 4
      expect(container.querySelectorAll("path")).toHaveLength(4);
    });

    it("applies stop-motion classes during thinking phase", () => {
      const { container } = render(
        <AnimatedLogo logoSrc="/consuela-logo.svg" phase="thinking" />
      );
      expect(container.querySelector(".consuela-body-thinking")).toBeInTheDocument();
      expect(container.querySelector(".consuela-glasses-thinking")).toBeInTheDocument();
    });

    it("does not apply stop-motion classes during typing phase", () => {
      const { container } = render(
        <AnimatedLogo logoSrc="/consuela-logo.svg" phase="typing" />
      );
      expect(container.querySelector(".consuela-body-thinking")).not.toBeInTheDocument();
      expect(container.querySelector(".consuela-glasses-thinking")).not.toBeInTheDocument();
    });

    it("applies logo-rotating class during typing phase", () => {
      const { container } = render(
        <AnimatedLogo logoSrc="/consuela-logo.svg" phase="typing" />
      );
      expect(container.querySelector("svg")?.classList.contains("logo-rotating")).toBe(true);
    });
  });

  describe("no SVG filters remain", () => {
    it("does not render feTurbulence or feDisplacementMap", () => {
      const phases = ["thinking", "typing", "settled"] as const;
      for (const phase of phases) {
        const { container, unmount } = render(
          <AnimatedLogo logoSrc="/claude-logo.svg" phase={phase} />
        );
        expect(container.querySelector("feTurbulence")).not.toBeInTheDocument();
        expect(container.querySelector("feDisplacementMap")).not.toBeInTheDocument();
        unmount();
      }
    });
  });
});
