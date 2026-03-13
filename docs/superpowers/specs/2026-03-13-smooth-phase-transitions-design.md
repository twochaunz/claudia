# Smooth Phase Transitions Design

## Overview

Replace the current jittery phase transitions in the chat animation system with a smooth, sequenced flow. The core changes: a single persistent AnimatedLogo that never unmounts between phases, a phase sequencer that choreographs scroll → thinking → response transitions, and CSS opacity transitions instead of conditional mount/unmount for content swaps.

## Out of Scope

- Voice button / VoiceButton component — not included in this work
- Landing-to-chat transition (first message) — separate concern
- Word-by-word typing jitter — the TypedResponse component is unchanged

## Phase State Machine

Replace the current `isThinking` + `isTyping` + `pendingResponse` control spread across page.tsx and MessageList with a consolidated phase model.

**page.tsx** owns the external signals:
- `isThinking: boolean` — set true when user sends, false when response arrives
- `pendingResponse: string | null` — set when response arrives
- `onTypingComplete()` — callback to commit message to `messages[]`

**MessageList** owns the internal visual sequencer:

```
idle → scrolling → thinking → transitioning → typing → settled → idle
```

| Phase | Trigger | Logo | Content Above Logo |
|-------|---------|------|--------------------|
| `idle` | No active cycle | Not rendered | Nothing |
| `scrolling` | `isThinking` becomes true | Appears, morphing | Nothing (scroll in progress) |
| `thinking` | Scroll completes | Morphing | ThinkingIndicator text fades in |
| `transitioning` | `pendingResponse` arrives | Morphing → rotating | ThinkingIndicator text fades out |
| `typing` | Thinking text fade-out completes | Rotating | Response text fades in, words reveal |
| `settled` | `onComplete` from TypedResponse | Stops rotating, eases to rest | Response text fully visible |

| `idle` (from settled) | Next user sends a message | Instantly removed | Nothing — the committed message renders via ChatMessage without a logo |

The `settled → idle` transition is instant (no fade-out) because the user's new message send naturally pushes the settled logo into the committed message history, where ChatMessage renders without logos. The sequencer then immediately advances to `scrolling` for the new cycle.

## Persistent Logo

One `AnimatedLogo` instance rendered in the "active response area" of MessageList. It stays mounted from `scrolling` through `settled`:

```
┌─────────────────────────┐
│  [past messages]        │
│                         │
│  [user bubble]          │  ← scroll anchor
│                         │
│  [content area]         │  ← thinking text OR response text (opacity swap)
│                         │
│  ★ logo                 │  ← single persistent instance
│                         │
│  [spacer]               │
└─────────────────────────┘
```

The logo's `phase` prop updates as the sequencer advances: `"thinking"` during scrolling/thinking/transitioning, `"typing"` during typing, `"settled"` during settled. Since it's the same DOM element, there's no unmount/remount jump — just a CSS class change.

As words appear during typing, the text grows and pushes the logo down naturally. The logo "shifting down" is handled by normal document flow, not manual positioning.

## Transition Mechanics

### Scroll Sequencing (idle → scrolling → thinking)

When `isThinking` becomes true:
1. Logo appears immediately with morphing animation (GPU-accelerated SVG filter, no layout cost)
2. `scrollIntoView({ behavior: "smooth", block: "start" })` fires on the latest user message anchor
3. Listen for `scrollend` event on the scroll container, with a 1000ms `setTimeout` fallback (Safari lacks `scrollend` support, and smooth scrolls over long distances can exceed 500ms)
4. Once scroll completes → advance to `thinking`, thinking content fades in

This ensures nothing pops in while the viewport is still moving.

### Content Area (thinking → transitioning → typing)

The thinking text and response text occupy the **same container** using a stacked layout. Both layers are always in the DOM during an active cycle — the thinking content is positioned absolutely so it doesn't affect flow, while the response content occupies the normal flow position:

```
<div className="relative">
  {/* Thinking content — absolutely positioned, doesn't affect container height */}
  <div
    className="absolute inset-x-0 top-0"
    style={{ opacity: thinkingOpacity, transition: "opacity 200ms ease-out" }}
  >
    <ThinkingIndicator ... />
  </div>

  {/* Response content — in normal flow, controls container height */}
  <div style={{ opacity: responseOpacity, transition: "opacity 200ms ease-in" }}>
    <TypedResponse ... />
  </div>
</div>
```

During thinking, the container has minimal height (response content is empty/invisible). The ThinkingIndicator floats above via `position: absolute`. When the response arrives:

1. `transitioning` phase: thinking content opacity `1 → 0` over 200ms
2. On `transitionend` (with 250ms `setTimeout` fallback): advance to `typing`
3. `typing` phase: TypedResponse is mounted and begins its word reveal interval. Response content fades `0 → 1` over 200ms. TypedResponse is only mounted when `phase === "typing" || phase === "settled"` — it does not exist during thinking/transitioning, so there's no invisible word accumulation. The absolutely-positioned thinking content remains at opacity 0 (no layout cost) until the cycle ends.
4. Logo prop changes from `"thinking"` to `"typing"` — CSS class swap from morphing to rotating

The thinking content uses `position: absolute` so its removal has zero layout impact. The response content uses normal flow so it naturally pushes the logo down as words appear. No height jumps during the crossover.

Total crossover duration: ~400ms. The logo anchors the user's eye throughout.

### Settling (typing → settled)

When TypedResponse fires `onComplete`:
1. Logo phase changes from `"typing"` to `"settled"`
2. AnimatedLogo's existing settling logic captures the current rotation angle and applies `transition: transform 0.5s ease-out`
3. No content changes — response text stays fully visible

## Component Changes

### MessageList.tsx — Major Rewrite

- Add internal phase state: `useState<Phase>` where `Phase = "idle" | "scrolling" | "thinking" | "transitioning" | "typing" | "settled"`
- Add sequencer logic via `useEffect` chain reacting to phase + external props
- Render one persistent `AnimatedLogo` during active phases
- Render thinking/response content in a shared area with opacity control
- Handle scroll completion detection (`scrollend` event + timeout fallback)
- Remove the three separate conditional blocks for thinking/typing/settled logo

### ThinkingIndicator.tsx — Minor Change

- Remove logo rendering (the `<div className="flex-shrink-0 w-7 h-7 mt-1">` block with AnimatedLogo)
- Component just renders the text content: thinking label, dots animation, timer, expandable panel
- Remove `logoSrc` prop since it no longer renders a logo
- Keep `isVisible` prop — when it goes false, the component resets its internal `elapsed` timer and `expanded` state as it does today. The parent controls visibility via opacity, but `isVisible` still governs the timer lifecycle.
- Remove the `if (!isVisible) return null` early-return. The component must always render its DOM nodes (the parent handles visibility via opacity on a wrapper). `isVisible` only controls the timer interval start/stop and state resets — not conditional rendering.

### page.tsx — Minor Simplification

- Remove `isTyping` state — MessageList manages this internally
- Keep `isThinking`, `pendingResponse`, `handleTypingComplete`
- `hasMessages` check simplifies to `messages.length > 0 || isThinking || pendingResponse !== null`
- `ChatInput` disabled check becomes `disabled={isThinking || pendingResponse !== null}` — this covers all active phases since `pendingResponse` is non-null from the moment the response arrives until typing completes and the message is committed
- Note: `setIsThinking(false)` and `setPendingResponse(...)` are called in the same `setTimeout` callback, so React 18 automatic batching ensures they update in a single render — no flash back to landing page.

### AnimatedLogo.tsx — Minor Change

Already accepts `phase` prop and handles all three animation styles. The only behavioral difference is it won't unmount between phases anymore. One adjustment: keep the SVG `<defs>` filter block always rendered (not conditionally via `{showFilter && ...}`), and toggle the `filter` CSS property on/off instead. This avoids a visual flash when the filter DOM nodes are removed and re-added during phase transitions.

### TypedResponse.tsx — No Changes

Still reveals words progressively, fires `onComplete` when done.

### ChatMessage.tsx — No Changes

Past messages render without logos, as before.

### globals.css — No Changes

Fade transitions are applied via inline styles on the content containers (transition duration is phase-dependent). No new CSS classes needed.

## Scroll Completion Detection

```typescript
const handleScrollComplete = useCallback(() => {
  // Advance from scrolling → thinking
  setPhase("thinking");
}, []);

useEffect(() => {
  if (phase !== "scrolling" || !scrollContainerRef.current) return;

  const container = scrollContainerRef.current;
  const fallbackTimer = setTimeout(handleScrollComplete, 1000);

  const onScrollEnd = () => {
    clearTimeout(fallbackTimer);
    handleScrollComplete();
  };

  container.addEventListener("scrollend", onScrollEnd, { once: true });
  return () => {
    clearTimeout(fallbackTimer);
    container.removeEventListener("scrollend", onScrollEnd);
  };
}, [phase, handleScrollComplete]);
```

## Affected Tests

- Tests that check for ThinkingIndicator rendering a logo will need updating (logo is now rendered by MessageList)
- Tests that assert immediate content appearance after `isThinking` changes will need to account for the sequencing delay
- Tests should use `jest.useFakeTimers()` + `act()` to advance through phase transitions
