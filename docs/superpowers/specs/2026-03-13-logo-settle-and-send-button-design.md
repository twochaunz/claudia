# Logo Settle Animation & Send Button Design

## Overview

Two targeted refinements to the chat UI:
1. Replace the abrupt logo disappearance when typing completes with a smooth ease-in slide to its resting position below the response, where it persists as part of the committed message.
2. Replace the VoiceButton with a permanently visible send button that's gray when disabled and orange when active.

## Out of Scope

- Voice functionality (being removed entirely)
- Animation timing of the thinking/typing phases (unchanged)
- Landing-to-chat transition

## Change 1: Logo Persistence & Smooth Settle

### New Phase: `settling`

Extend the phase state machine with a `settling` phase between `settled` and `idle`:

```
idle → scrolling → thinking → transitioning → typing → settled → settling → idle
```

| Phase | Trigger | What Happens |
|-------|---------|--------------|
| `settled` | `onComplete` from TypedResponse | Logo rotation eases to rest (existing 0.5s ease-out). Response text fully visible. |
| `settling` | 0.5s after entering `settled` | The `h-[60dvh]` spacer transitions from full height to `0` with `ease-in` over 400ms. Logo slides up via document flow. |
| `idle` | `transitionend` on spacer (with 450ms fallback) | `onTypingComplete()` fires, message commits to `messages[]`, active area unmounts. |

### ChatMessage Logo

Assistant messages in ChatMessage render a static AnimatedLogo (phase `"settled"`) below their content. This ensures the logo is in the same visual position when the active area unmounts and the committed message appears — no jump.

```tsx
// In ChatMessage, for assistant messages:
<div className="mb-4">
  <div className="text-[15px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
    {content}
  </div>
  <div className="flex justify-start mt-3">
    <AnimatedLogo logoSrc={logoSrc} phase="settled" size={28} />
  </div>
</div>
```

ChatMessage needs a new `logoSrc` prop to know which logo to render. MessageList already has `logoSrc` and passes it through.

### Logo Spacing

Both the active logo container (in MessageList) and the committed logo (in ChatMessage) use `mt-3` for spacing above the logo. This ensures the logo is in the same position during the settle-to-committed swap. The active logo container already has `mt-3` — no change needed. The spacer below (`h-[60dvh]`) provides the breathing room from the viewport bottom.

### Spacer Transition

The `h-[60dvh]` spacer at the bottom of MessageList needs to animate its height to `0` during the `settling` phase. A CSS transition requires a concrete starting value — switching from a Tailwind class to an inline style in the same render won't animate because the browser sees no "from" value.

Use a ref on the spacer element. When entering `settling`:
1. Read the spacer's current `offsetHeight` in px
2. Set it as an explicit inline `style.height` (e.g., `"384px"`)
3. In a `requestAnimationFrame` callback, set `style.height = "0px"` and `style.transition = "height 400ms ease-in"`
4. Listen for `transitionend` on the spacer (with 450ms `setTimeout` fallback)

```tsx
const spacerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (phase !== "settling" || !spacerRef.current) return;

  const spacer = spacerRef.current;
  // Capture current height as concrete px value
  spacer.style.height = `${spacer.offsetHeight}px`;

  // Next frame: animate to 0
  const raf = requestAnimationFrame(() => {
    spacer.style.transition = "height 400ms ease-in";
    spacer.style.height = "0px";
  });

  const fallback = setTimeout(handleSettlingComplete, 450);
  const onEnd = () => {
    clearTimeout(fallback);
    handleSettlingComplete();
  };
  spacer.addEventListener("transitionend", onEnd, { once: true });

  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(fallback);
    spacer.removeEventListener("transitionend", onEnd);
  };
}, [phase, handleSettlingComplete]);
```

The spacer element always uses the `h-[60dvh]` class. During `settling`, the inline styles override the class-based height and animate it to zero. When settling completes, `handleSettlingComplete` clears the inline styles so the class takes effect again on the next cycle.

### `handleSettlingComplete` Function

```tsx
const handleSettlingComplete = useCallback(() => {
  // Reset spacer inline styles so h-[60dvh] class takes effect on next cycle
  if (spacerRef.current) {
    spacerRef.current.style.height = "";
    spacerRef.current.style.transition = "";
  }
  onTypingComplete();
  setPhase("idle");
}, [onTypingComplete]);
```

This function is called when the spacer transition finishes (or by the 450ms fallback). It clears the inline styles so the spacer reverts to its `h-[60dvh]` class on the next message cycle, then commits the message and resets to idle.

### Spacer JSX

The spacer element needs a ref. It stays outside the `isActive` conditional (always rendered):

```tsx
{/* Spacer — enough so the latest user message can scroll to top */}
<div ref={spacerRef} className="h-[60dvh]" />
```

### MessageList Changes

- Add `settling` to the `Phase` type
- Add `spacerRef` ref for the spacer element
- Add `handleSettlingComplete` callback (defined above)
- Add effect: `settled` → `settling` after 500ms (waiting for rotation ease-out)
- Add effect: `settling` spacer transition (using ref + rAF approach above), calls `handleSettlingComplete` on completion
- Move `onTypingComplete()` call from `handleTypingDone` to `handleSettlingComplete`
- `handleTypingDone` now only sets phase to `settled` (no longer calls `onTypingComplete`)
- Add `mt-3` to the logo container div (matching ChatMessage's `mt-3` for seamless transition)
- Keep `isActive` check as `phase !== "idle"` — `settling` is still active

### Derived State Updates for `settling`

All derived state expressions that switch on `phase` must include `settling`. During `settling`, the response text and logo must remain visible and unchanged:

```tsx
const isActive = phase !== "idle";  // settling is active — no change needed
const thinkingVisible = phase === "thinking";  // no change needed
const thinkingOpacity = phase === "thinking" ? 1 : 0;  // no change needed
const responseOpacity = phase === "typing" || phase === "settled" || phase === "settling" ? 1 : 0;  // ADD settling
const logoPhase = phase === "typing" ? "typing" : (phase === "settled" || phase === "settling") ? "settled" : "thinking";  // ADD settling
```

The response rendering condition must also include `settling`:

```tsx
{(phase === "typing" || phase === "settled" || phase === "settling") && pendingResponse !== null && (
  <div style={{ opacity: responseOpacity, transition: "opacity 200ms ease-in", minHeight: "60px" }}>
    <TypedResponse text={pendingResponse} onComplete={handleTypingDone} />
  </div>
)}
```

### Edge Case: Props Reset Guard

The existing edge-case reset effect must exclude `settling` from being snapped to `idle`:

```tsx
useEffect(() => {
  if (!isThinking && pendingResponse === null && phase !== "idle" && phase !== "settled" && phase !== "settling") {
    setPhase("idle");
  }
}, [isThinking, pendingResponse, phase]);
```

### Edge Case: New Message During `settling`

If `isThinking` becomes true during the `settling` phase (user sends a new message before the spacer animation finishes), cancel the settling animation, immediately call `onTypingComplete()`, and advance to `scrolling`:

```tsx
useEffect(() => {
  if (isThinking && (phase === "settled" || phase === "settling")) {
    if (phase === "settling") {
      onTypingComplete();  // commit current message immediately
    }
    setPhase("scrolling");
  }
}, [isThinking, phase, onTypingComplete]);
```

This effect replaces the existing `settled → scrolling` effect (lines 85-90 of current MessageList.tsx). Do not keep both — this one covers both `settled` and `settling`.

### AnimatedLogo Changes

None. The component already handles `"settled"` phase correctly.

## Change 2: Voice → Gray Send Button

### ChatInput Changes

- Remove `VoiceButton` import
- Remove `handleVoiceTranscript` function
- Replace the conditional `hasText ? sendButton : VoiceButton` with a single always-visible send button:

```tsx
<button
  onClick={handleSend}
  disabled={disabled || !hasText}
  aria-label="Send"
  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer border-none"
  style={{
    backgroundColor: hasText ? "var(--accent-orange)" : "var(--text-secondary)",
    opacity: hasText ? 1 : 0.4,
    transition: "background-color 150ms ease, opacity 150ms ease",
  }}
>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 14V2M8 2L3 7M8 2L13 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
</button>
```

When `hasText` is false: gray background with reduced opacity, `disabled` attribute prevents clicks.
When `hasText` is true: orange background, full opacity.
The `transition` property provides a smooth 150ms crossfade between states.

### File Cleanup

- Delete `components/VoiceButton.tsx`
- Remove `voice-pulse` keyframe and `.voice-pulse` class from `app/globals.css`
- Remove any VoiceButton test files

## Affected Components

| Component | Change |
|-----------|--------|
| `components/MessageList.tsx` | Add `settling` phase, spacer transition, logo margin, move `onTypingComplete` |
| `components/ChatMessage.tsx` | Add `logoSrc` prop, render AnimatedLogo for assistant messages |
| `components/ChatInput.tsx` | Remove VoiceButton, always-visible send button |
| `components/VoiceButton.tsx` | Delete |
| `app/globals.css` | Remove voice-pulse animation |

## Affected Tests

Tests exist in `__tests__/` directory:

- `__tests__/MessageList.test.tsx`: add `settling` phase assertions, verify spacer transition, verify response stays visible during settling
- `__tests__/page.test.tsx`: timing changes (extra 500ms settle + 450ms spacer fallback before `onTypingComplete`)
- New or updated ChatMessage tests: verify logo renders for assistant messages
- New or updated ChatInput tests: verify send button always visible, gray when empty, orange with text, no voice button
