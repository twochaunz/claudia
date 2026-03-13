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

### Logo Spacing During Active Phases

Add `mb-6` to the logo container during active phases to give breathing room from the bottom of the viewport during thinking/typing.

### Spacer Transition

The `h-[60dvh]` spacer at the bottom of MessageList needs to transition its height during the `settling` phase:

```tsx
<div
  className={phase === "settling" ? "" : "h-[60dvh]"}
  style={phase === "settling" ? {
    height: 0,
    transition: "height 400ms ease-in",
  } : undefined}
/>
```

The spacer starts at `60dvh` during all active phases. When phase enters `settling`, it switches to `height: 0` with the CSS transition, causing the smooth slide-up.

### MessageList Changes

- Add `settling` to the `Phase` type
- Add effect: `settled` → `settling` after 500ms (waiting for rotation ease-out)
- Add effect: `settling` spacer `transitionend` → call `onTypingComplete()`, set phase `idle`
- Move `onTypingComplete()` call from `handleTypingDone` to the settling-complete handler
- `handleTypingDone` now only sets phase to `settled` (no longer calls `onTypingComplete`)
- Add `mb-6` to the logo container div
- Keep `isActive` check as `phase !== "idle"` — `settling` is still active

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

- MessageList tests: add `settling` phase assertions, verify spacer transition
- ChatMessage tests: verify logo renders for assistant messages
- ChatInput tests: verify send button always visible, no voice button
- page.tsx tests: timing changes (extra 500ms settle + 400ms spacer transition before `onTypingComplete`)
