"use client";

import { useEffect, type RefObject } from "react";

/**
 * Publishes the *visual* viewport height as the `--app-h` CSS custom property.
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
export function useAppHeight() {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;

    let frame = 0;
    const apply = () => {
      frame = 0;
      const h = vv ? vv.height : window.innerHeight;
      root.style.setProperty("--app-h", `${h}px`);
      // iOS can leave the layout viewport scrolled after the keyboard closes,
      // which shifts the fixed body out of view. Pin it back.
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };

    // Coalesce the resize burst into one write per frame.
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    apply();

    if (vv) {
      vv.addEventListener("resize", schedule);
      vv.addEventListener("scroll", schedule);
    }
    window.addEventListener("orientationchange", schedule);
    // bfcache restore on iOS returns with a stale viewport
    window.addEventListener("pageshow", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (vv) {
        vv.removeEventListener("resize", schedule);
        vv.removeEventListener("scroll", schedule);
      }
      window.removeEventListener("orientationchange", schedule);
      window.removeEventListener("pageshow", schedule);
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
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;

    const write = () => {
      root.style.setProperty(varName, `${el.getBoundingClientRect().height}px`);
    };
    write();

    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(write);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, varName, ...deps]);
}
