# Chat Animation System Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Claudia starburst logo with a hand-drawn eyelash, and replace the JS feTurbulence thinking animation with CSS-only persona-specific animations (sporadic blink for Claudia, stop-motion for Consuela).

**Architecture:** CSS-only animation approach. Remove all JS animation code (rAF loop, SVG filters). Each persona gets distinct thinking animations via CSS classes applied conditionally in the React component. Typing/settling behavior unchanged.

**Tech Stack:** React, CSS keyframes, SVG inline paths, Jest + React Testing Library

**Spec:** `docs/superpowers/specs/2026-03-17-chat-animation-system-design.md`

---

## Chunk 1: CSS Keyframes + New Animation Classes

### Task 1: Add Claudia sporadic blink keyframe and class to globals.css

**Files:**
- Modify: `app/globals.css:96` (after `.logo-rotating`)

- [ ] **Step 1: Add the `lash-sporadic-blink` keyframe and `.claudia-thinking` class**

Insert after the `.logo-rotating` block (line 96) and before `.logo-settling` (line 98):

```css
@keyframes lash-sporadic-blink {
  0%     { transform: scaleY(1); }
  8.1%   { transform: scaleY(1); }
  8.75%  { transform: scaleY(0.05); }
  10.6%  { transform: scaleY(1); }
  13.8%  { transform: scaleY(1); }
  14.4%  { transform: scaleY(0.05); }
  16.25% { transform: scaleY(1); }
  29.4%  { transform: scaleY(1); }
  30%    { transform: scaleY(0.05); }
  31.9%  { transform: scaleY(1); }
  35%    { transform: scaleY(1); }
  35.6%  { transform: scaleY(0.05); }
  37.5%  { transform: scaleY(1); }
  43.1%  { transform: scaleY(1); }
  43.75% { transform: scaleY(0.05); }
  45.6%  { transform: scaleY(1); }
  61.3%  { transform: scaleY(1); }
  61.9%  { transform: scaleY(0.05); }
  63.75% { transform: scaleY(1); }
  66.9%  { transform: scaleY(1); }
  67.5%  { transform: scaleY(0.05); }
  69.4%  { transform: scaleY(1); }
  78.8%  { transform: scaleY(1); }
  79.4%  { transform: scaleY(0.05); }
  81.25% { transform: scaleY(1); }
  85.6%  { transform: scaleY(1); }
  86.25% { transform: scaleY(0.05); }
  88.1%  { transform: scaleY(1); }
  100%   { transform: scaleY(1); }
}

.claudia-thinking {
  transform-origin: 12px 17.5px;
  animation: lash-sporadic-blink 8s ease-in-out infinite;
}
```

- [ ] **Step 2: Verify the CSS parses correctly**

Run: `npx next lint`
Expected: No errors related to globals.css

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add sporadic blink keyframe for Claudia thinking animation"
```

---

### Task 2: Add Consuela stop-motion keyframes and classes to globals.css

**Files:**
- Modify: `app/globals.css` (after the `.claudia-thinking` block added in Task 1)

- [ ] **Step 1: Add stop-motion keyframes and classes**

Insert after `.claudia-thinking`:

```css
@keyframes consuela-body-think {
  0%     { transform: scale(1); }
  16.6%  { transform: scale(1.017); }
  33.3%  { transform: scale(0.983); }
  50%    { transform: scale(1.008); }
  66.6%  { transform: scale(0.988); }
  83.3%  { transform: scale(1.004); }
  100%   { transform: scale(1); }
}

@keyframes consuela-glasses-think {
  0%     { transform: rotate(0deg); }
  16.6%  { transform: rotate(4.5deg); }
  33.3%  { transform: rotate(-3deg); }
  50%    { transform: rotate(5deg); }
  66.6%  { transform: rotate(-4deg); }
  83.3%  { transform: rotate(2deg); }
  100%   { transform: rotate(0deg); }
}

.consuela-body-thinking {
  transform-origin: 12px 12px;
  animation: consuela-body-think 0.8s steps(6) infinite;
}

.consuela-glasses-thinking {
  transform-origin: 16px 12px;
  animation: consuela-glasses-think 0.8s steps(6) infinite;
}
```

- [ ] **Step 2: Add new classes to the `prefers-reduced-motion` media query**

In the existing `@media (prefers-reduced-motion: reduce)` block (currently at line 114), add the three new animation classes to the **first rule only**. Keep the existing `.word-reveal` and `.logo-settling` rules in this media query unchanged. The first rule should become:

```css
  .logo-rotating,
  .animate-fade-in,
  .word-reveal,
  .claudia-thinking,
  .consuela-body-thinking,
  .consuela-glasses-thinking {
    animation: none !important;
  }
```

The rest of the `@media (prefers-reduced-motion: reduce)` block (`.word-reveal { opacity... }` and `.logo-settling { transition... }`) stays as-is.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add Consuela stop-motion keyframes and reduced-motion support"
```

---

## Chunk 2: Component Rewrite

### Task 3: Rewrite AnimatedLogo.tsx

**Files:**
- Modify: `components/AnimatedLogo.tsx` (full rewrite)

- [ ] **Step 1: Write the new AnimatedLogo component**

Replace the entire file contents with:

```tsx
"use client";

import { useEffect, useRef, useCallback } from "react";

type AnimationPhase = "thinking" | "typing" | "settled";

interface AnimatedLogoProps {
  logoSrc: string;
  phase: AnimationPhase;
  size?: number;
}

// Claudia hand-drawn eyelash SVG (6 lashes, no eye)
function ClaudiaSvg({ thinkingClass }: { thinkingClass: string }) {
  return (
    <g className={thinkingClass}>
      <path
        d="M5 17.5 C7.5 16 10 15.5 12 15.5 C14.5 15.5 17 16 19.5 17.5"
        fill="none"
        stroke="#D97757"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M6.2 17 C5.5 14 4.5 11.5 3.8 9.5"
        fill="none"
        stroke="#D97757"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M8.3 16.2 C7.8 13 6.8 9.8 6.2 7"
        fill="none"
        stroke="#D97757"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M10.5 15.7 C10.2 12.5 9.8 9 10 5.5"
        fill="none"
        stroke="#D97757"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M13 15.6 C13.3 12.5 13.8 9 14.2 5.8"
        fill="none"
        stroke="#D97757"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M15.5 16 C16.2 13 17 9.8 17.8 7.2"
        fill="none"
        stroke="#D97757"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M18 17 C18.8 14 19.8 11.5 20.5 9.5"
        fill="none"
        stroke="#D97757"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </g>
  );
}

// Consuela SVG (body silhouette + glasses)
function ConsuelaSvg({
  bodyClass,
  glassesClass,
}: {
  bodyClass: string;
  glassesClass: string;
}) {
  return (
    <>
      <g className={bodyClass}>
        <g
          transform="translate(0,24) scale(0.024,-0.024)"
          fill="#D97757"
          stroke="none"
        >
          <path d="M520 990 c-8 -5 -36 -10 -61 -10 -67 0 -133 -26 -186 -75 -27 -23 -59 -46 -73 -50 -69 -22 -114 -86 -125 -178 -6 -57 -24 -87 -51 -87 -22 0 -17 -26 9 -44 l22 -16 -25 2 c-58 6 -19 -102 51 -141 22 -12 39 -28 39 -36 0 -7 11 -27 25 -43 26 -31 33 -66 15 -77 -15 -9 -12 -35 4 -35 9 0 12 -7 9 -21 -5 -19 -3 -21 28 -14 19 4 51 18 71 31 l37 23 7 -21 c12 -37 103 -126 143 -138 20 -7 64 -23 99 -37 58 -24 66 -25 117 -14 42 9 61 20 77 42 13 18 31 29 45 29 29 0 73 42 73 68 0 30 50 219 66 249 7 16 14 50 14 77 0 33 9 67 26 103 20 41 25 63 21 94 -6 48 -14 59 -27 39 -8 -12 -10 -9 -10 10 0 42 -11 69 -30 75 -9 3 -22 23 -29 44 -20 68 -80 108 -150 102 -13 -1 -33 7 -45 17 -11 11 -31 25 -43 31 -27 13 -122 14 -143 1z" />
        </g>
      </g>
      <g className={glassesClass}>
        <path
          d="M9.85 9.15 C11.55 8.55 13.75 8.55 15.35 9.15 C16.45 10.75 16.45 13.45 15.35 14.95 C13.75 15.55 11.55 15.55 9.85 14.95 C8.85 13.45 8.85 10.75 9.85 9.15Z"
          fill="none"
          stroke="#F5F5F0"
          strokeWidth="0.8"
        />
        <path
          d="M17.35 8.95 C19.05 8.35 21.25 8.35 22.85 8.95 C23.95 10.55 23.95 13.25 22.85 14.75 C21.25 15.35 19.05 15.35 17.35 14.75 C16.35 13.25 16.35 10.55 17.35 8.95Z"
          fill="none"
          stroke="#F5F5F0"
          strokeWidth="0.8"
        />
        <path
          d="M15.35 12.15 Q16.35 10.7 17.35 11.95"
          fill="none"
          stroke="#F5F5F0"
          strokeWidth="0.8"
        />
      </g>
    </>
  );
}

export function AnimatedLogo({ logoSrc, phase, size = 28 }: AnimatedLogoProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const isConsuela = logoSrc.includes("consuela");

  // Typing -> Settled: capture rotation angle and decelerate
  const handleSettling = useCallback(() => {
    if (!svgRef.current) return;
    const computed = getComputedStyle(svgRef.current);
    const matrix = computed.transform;
    if (matrix && matrix !== "none") {
      const values = matrix.match(/matrix\((.+)\)/)?.[1]?.split(",").map(Number);
      if (values) {
        const angle = Math.atan2(values[1], values[0]) * (180 / Math.PI);
        svgRef.current.style.transform = `rotate(${angle}deg)`;
      }
    }
  }, []);

  useEffect(() => {
    if (phase === "settled") {
      handleSettling();
    } else {
      if (svgRef.current) {
        svgRef.current.style.transform = "";
      }
    }
  }, [phase, handleSettling]);

  const svgClassName = [
    phase === "typing" ? "logo-rotating" : "",
    phase === "settled" ? "logo-settling" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Thinking classes per persona
  const claudiaThinkingClass = !isConsuela && phase === "thinking" ? "claudia-thinking" : "";
  const consuelaBodyClass = isConsuela && phase === "thinking" ? "consuela-body-thinking" : "";
  const consuelaGlassesClass = isConsuela && phase === "thinking" ? "consuela-glasses-thinking" : "";

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={svgClassName}
      aria-hidden="true"
    >
      {isConsuela ? (
        <ConsuelaSvg bodyClass={consuelaBodyClass} glassesClass={consuelaGlassesClass} />
      ) : (
        <ClaudiaSvg thinkingClass={claudiaThinkingClass} />
      )}
    </svg>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: No type errors in AnimatedLogo.tsx

- [ ] **Step 3: Commit**

```bash
git add components/AnimatedLogo.tsx
git commit -m "feat: rewrite AnimatedLogo with CSS-only persona animations"
```

---

## Chunk 3: Static Assets + Tests

### Task 4: Update public/claude-logo.svg

**Files:**
- Modify: `public/claude-logo.svg`

- [ ] **Step 1: Replace the starburst SVG with the lash design**

Replace the entire file contents with:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M5 17.5 C7.5 16 10 15.5 12 15.5 C14.5 15.5 17 16 19.5 17.5" fill="none" stroke="#D97757" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M6.2 17 C5.5 14 4.5 11.5 3.8 9.5" fill="none" stroke="#D97757" stroke-width="1.1" stroke-linecap="round"/>
  <path d="M8.3 16.2 C7.8 13 6.8 9.8 6.2 7" fill="none" stroke="#D97757" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M10.5 15.7 C10.2 12.5 9.8 9 10 5.5" fill="none" stroke="#D97757" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M13 15.6 C13.3 12.5 13.8 9 14.2 5.8" fill="none" stroke="#D97757" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M15.5 16 C16.2 13 17 9.8 17.8 7.2" fill="none" stroke="#D97757" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M18 17 C18.8 14 19.8 11.5 20.5 9.5" fill="none" stroke="#D97757" stroke-width="1.1" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 2: Commit**

```bash
git add public/claude-logo.svg
git commit -m "feat: replace Claudia starburst logo with hand-drawn eyelash"
```

---

### Task 5: Rewrite AnimatedLogo tests

**Files:**
- Modify: `__tests__/AnimatedLogo.test.tsx` (full rewrite)

- [ ] **Step 1: Write the new tests**

Replace the entire file contents with:

```tsx
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
```

- [ ] **Step 2: Run the tests**

Run: `npx jest __tests__/AnimatedLogo.test.tsx --verbose`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add __tests__/AnimatedLogo.test.tsx
git commit -m "test: rewrite AnimatedLogo tests for CSS-only persona animations"
```

---

### Task 6: Run full test suite and verify

- [ ] **Step 1: Run all tests**

Run: `npx jest --verbose`
Expected: All tests pass. If `MessageList` tests fail, check that `AnimatedLogo` export name/props haven't changed (they haven't — same export, same props).

- [ ] **Step 2: Manual verification**

Run: `npx next dev`
Verify in browser:
1. Select Claudia → send a message → watch thinking phase: lashes should blink sporadically
2. Watch typing phase: logo should rotate 360°
3. Switch to Consuela → send a message → watch thinking phase: body breathes + glasses rock in stop-motion
4. Watch typing phase: logo should rotate 360°

- [ ] **Step 3: Final commit if any fixes needed**

Only if manual testing revealed issues that needed fixing.
