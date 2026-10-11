"use client";

import { useEffect, useLayoutEffect, type RefObject } from "react";

/**
 * Publishes the *visual* viewport geometry as CSS custom properties:
 * `--app-h` (height) and `--app-top` (offset from the layout viewport).
 *
 * Why not `100dvh`: on iOS Safari the dynamic viewport does NOT shrink when the
 * software keyboard opens — the keyboard is composited over the layout viewport.
 * A bottom-anchored input inside a `100dvh` column therefore ends up underneath
 * the keyboard. `visualViewport.height` is the only measurement that reflects
 * the actually-visible region on every iOS version.
 *
 * Updates are written straight to the document element as a CSS variable rather
 * than stored in React state. The keyboard open/close animation fires a burst of
 * resize events; routing those through a re-render is what produces visible
 * jitter. A style-property write only invalidates layout.
 */
/** Session-remembered software keyboard height, px. */
const KB_KEY = "claudia:kb-h";
function readLastKeyboardH(): number | null {
  try {
    const v = Number(sessionStorage.getItem(KB_KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function useAppHeight() {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    let lastKeyboardH = readLastKeyboardH();
    let preShrinkTimer: ReturnType<typeof setTimeout> | undefined;

    let frame = 0;
    const apply = () => {
      frame = 0;
      const h = vv ? vv.height : window.innerHeight;
      root.style.setProperty("--app-h", `${h}px`);
      // When iOS opens the keyboard it can pan the visual viewport down to
      // "reveal" the focused field even though the body is fixed. That pan
      // shows up as offsetTop, not scrollY, so the column follows it with a
      // translate — otherwise the header slides off the top of the screen
      // and the composer floats mid-page. Zero everywhere else.
      const top = vv ? Math.max(0, vv.offsetTop) : 0;
      root.style.setProperty("--app-top", `${top}px`);
      // Remember how tall the keyboard is (layout viewport minus visual
      // viewport, at scale 1; under 80px is toolbar noise) so the next focus
      // can make room for it before it appears — see onFocusIn.
      const kb =
        vv && vv.scale === 1 ? Math.round(window.innerHeight - vv.height) : 0;
      if (kb > 80) {
        lastKeyboardH = kb;
        try {
          sessionStorage.setItem(KB_KEY, String(kb));
        } catch {
          /* private mode */
        }
      }
      // A real measurement arrived; the pre-shrink fallback is moot.
      clearTimeout(preShrinkTimer);
      preShrinkTimer = undefined;
      // iOS can leave the layout viewport scrolled after the keyboard closes,
      // which shifts the fixed body out of view. Pin it back.
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };

    // Coalesce the resize burst into one write per frame.
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    /**
     * Make room for the keyboard *before* it opens.
     *
     * iOS Safari decides at focus time whether the focused field will be
     * covered by the keyboard, and if so pans the visual viewport up to
     * reveal it while the keyboard animates in. Only once the animation ends
     * does a visualViewport resize arrive; apply() then shrinks the column
     * and the pan snaps back. On screen that is the whole page sliding up
     * and then dropping back — the "refresh" jolt on every tap into the
     * composer.
     *
     * So on focus, on touch devices, the column is shrunk immediately by the
     * keyboard height measured last time (or a 40% estimate the first time).
     * The composer is then already above where the keyboard will land, Safari
     * has nothing to reveal and does not pan, and the resize that follows
     * confirms a height the layout already has. If no resize arrives within
     * a second (hardware keyboard, or the estimate was moot) apply() restores
     * the measured height.
     */
    const coarse = () =>
      window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || (t.tagName !== "TEXTAREA" && t.tagName !== "INPUT")) return;
      if (!coarse()) return;
      const layoutH = window.innerHeight;
      const visibleH = vv ? vv.height : layoutH;
      // Keyboard already up (focus moved between fields): nothing to do.
      if (layoutH - visibleH > 80) return;
      const kb = lastKeyboardH ?? Math.round(layoutH * 0.4);
      root.style.setProperty("--app-h", `${layoutH - kb}px`);
      clearTimeout(preShrinkTimer);
      preShrinkTimer = setTimeout(apply, 1000);
    };
    const onFocusOut = () => {
      // The keyboard's closing resize normally handles this; the schedule
      // covers the case where it never opened.
      schedule();
    };

    apply();

    if (vv) {
      vv.addEventListener("resize", schedule);
      vv.addEventListener("scroll", schedule);
    }
    window.addEventListener("orientationchange", schedule);
    // bfcache restore on iOS returns with a stale viewport
    window.addEventListener("pageshow", schedule);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(preShrinkTimer);
      if (vv) {
        vv.removeEventListener("resize", schedule);
        vv.removeEventListener("scroll", schedule);
      }
      window.removeEventListener("orientationchange", schedule);
      window.removeEventListener("pageshow", schedule);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);
}

/**
 * Mirrors an element's measured height into a CSS custom property on that
 * element's nearest common ancestor (the document element).
 *
 * Used for `--list-h` and `--header-h`, which together let the scroll anchor
 * size itself declaratively in CSS. Measuring into a variable instead of state
 * keeps the resize path off React's render path — the previous implementation
 * wrote spacer heights imperatively *and* re-rendered, so a resize during an
 * animation could interleave with a phase change and produce a visible jump.
 */
export function useHeightVar(
  ref: RefObject<HTMLElement | null>,
  varName: string,
  /**
   * Extra deps that signal the observed element was remounted. Required for
   * conditionally-rendered targets: the effect reads `ref.current` once, so
   * without this it would keep observing a detached node from a previous
   * render and silently stop updating.
   */
  deps: unknown[] = [],
  /**
   * Runs after each write, with the observed element. MessageList uses it to
   * re-anchor the scroll position from the bottom after a resize (see there).
   */
  onResize?: (el: HTMLElement) => void,
) {
  // Layout effect so the variable exists before the first paint. The scroll
  // anchor's min-height depends on `--list-h`; with a plain effect the first
  // message's scroll target was computed against the fallback height, then
  // the real value landed a frame later and shortened the scroll range.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;

    const write = () => {
      root.style.setProperty(varName, `${el.getBoundingClientRect().height}px`);
    };
    write();

    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      write();
      onResize?.(el);
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, varName, onResize, ...deps]);
}
