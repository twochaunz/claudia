import { act, render } from "@testing-library/react";
import { useAppHeight } from "@/components/useViewport";

function Probe() {
  useAppHeight();
  return <textarea aria-label="field" />;
}

type Listener = (e?: unknown) => void;

describe("useAppHeight keyboard pre-shrink", () => {
  const listeners: Record<string, Listener[]> = {};
  const vv = {
    height: 800,
    width: 400,
    offsetTop: 0,
    scale: 1,
    addEventListener: (type: string, fn: Listener) => {
      (listeners[type] ??= []).push(fn);
    },
    removeEventListener: jest.fn(),
  };
  const fire = (type: string) => listeners[type]?.forEach((fn) => fn());
  const appH = () => document.documentElement.style.getPropertyValue("--app-h");

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(window, "visualViewport", { configurable: true, value: vv });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    window.matchMedia = jest.fn().mockImplementation((q: string) => ({
      matches: q.includes("pointer: coarse"),
      media: q,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia;
    sessionStorage.clear();
    vv.height = 800;
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("shrinks the column on focus before the keyboard reports, then follows the real height", () => {
    const { getByLabelText } = render(<Probe />);
    expect(appH()).toBe("800px");

    // First focus ever: no measurement yet, so a 40% estimate.
    act(() => getByLabelText("field").focus());
    expect(appH()).toBe("480px");

    // The keyboard opens for real at 300px.
    act(() => {
      vv.height = 500;
      fire("resize");
      jest.runOnlyPendingTimers(); // the rAF shim in jsdom
    });
    expect(appH()).toBe("500px");
    expect(sessionStorage.getItem("claudia:kb-h")).toBe("300");

    // Closes.
    act(() => {
      getByLabelText("field").blur();
      vv.height = 800;
      fire("resize");
      jest.runOnlyPendingTimers();
    });
    expect(appH()).toBe("800px");

    // Second focus uses the measured height, so the later resize changes nothing.
    act(() => getByLabelText("field").focus());
    expect(appH()).toBe("500px");
  });

  it("restores the measured height when no keyboard shows up", () => {
    const { getByLabelText } = render(<Probe />);
    act(() => getByLabelText("field").focus());
    expect(appH()).toBe("480px");
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    expect(appH()).toBe("800px");
  });

  it("does nothing on devices with a pointer", () => {
    window.matchMedia = jest.fn().mockImplementation((q: string) => ({
      matches: false,
      media: q,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia;
    const { getByLabelText } = render(<Probe />);
    act(() => getByLabelText("field").focus());
    expect(appH()).toBe("800px");
  });
});
