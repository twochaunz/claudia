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

On next user send, the settled logo disappears (the committed message in `messages[]` renders via ChatMessage without a logo), and the cycle restarts.

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
3. Listen for `scrollend` event on the scroll container, with a 500ms `setTimeout` fallback for Safari compatibility
4. Once scroll completes → advance to `thinking`, thinking content fades in

This ensures nothing pops in while the viewport is still moving.

### Content Area (thinking → transitioning → typing)

The thinking text and response text occupy the **same container**. Instead of conditional rendering (`{isThinking && <ThinkingIndicator />}`), both are always structurally present during a cycle, controlled by CSS opacity:

```
<div className="relative">
  {/* Thinking content — visible during thinking, fades out during transitioning */}
  <div style={{ opacity: thinkingOpacity, transition: "opacity 200ms ease-out" }}>
    <ThinkingIndicator ... />
  </div>

  {/* Response content — fades in during typing */}
  {phase === "typing" || phase === "settled" ? (
    <div style={{ opacity: responseOpacity, transition: "opacity 200ms ease-in" }}>
      <TypedResponse ... />
    </div>
  ) : null}
</div>
```

The thinking → response crossover:
1. `transitioning` phase: thinking content opacity `1 → 0` over 200ms
2. On `transitionend` (or 200ms timeout fallback): advance to `typing`
3. `typing` phase: thinking content unmounts (it's at opacity 0), response content mounts and fades `0 → 1` over 200ms
4. Logo prop changes from `"thinking"` to `"typing"` — CSS class swap from morphing to rotating

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

### page.tsx — Minor Simplification

- Remove `isTyping` state — MessageList manages this internally
- Keep `isThinking`, `pendingResponse`, `handleTypingComplete`
- `hasMessages` check simplifies to `messages.length > 0 || isThinking || pendingResponse !== null`

### AnimatedLogo.tsx — No Changes

Already accepts `phase` prop and handles all three animation styles. The only behavioral difference is it won't unmount between phases anymore.

### TypedResponse.tsx — No Changes

Still reveals words progressively, fires `onComplete` when done.

### ChatMessage.tsx — No Changes

Past messages render without logos, as before.

### globals.css — Minor Addition

Add a utility class for the content area fade transitions:

```css
.phase-fade {
  transition: opacity 200ms ease-out;
}
```

## Scroll Completion Detection

```typescript
const handleScrollComplete = useCallback(() => {
  // Advance from scrolling → thinking
  setPhase("thinking");
}, []);

useEffect(() => {
  if (phase !== "scrolling" || !scrollContainerRef.current) return;

  const container = scrollContainerRef.current;
  const fallbackTimer = setTimeout(handleScrollComplete, 500);

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
