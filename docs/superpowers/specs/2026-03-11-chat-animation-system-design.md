# Chat Animation System Design

## Overview

Implement a three-phase animation system for the chat interface that brings the AI logo to life during interactions: organic morphing while thinking, rotation during response typing, and a settled resting state after completion. Responses animate in word-by-word, past messages lose their logos, and each new turn scrolls the user message to the top of the viewport.

## Animation Phases

### Phase 1 — Thinking

- Triggered when user sends a message
- Logo sits **beside** the ThinkingIndicator (current layout preserved)
- SVG displacement filter (`feTurbulence` + `feDisplacementMap`) creates organic breathing/warping on the logo
- Turbulence `baseFrequency` oscillates `0.02 -> 0.06 -> 0.02` via `requestAnimationFrame`
- Displacement scale: 3-5px (subtle breathing, not glitching)
- Cycle duration: ~2-3 seconds per breath
- ThinkingIndicator functionality unchanged (dots, timer, expandable panel)

### Phase 2 — Typing

- Triggered when AI response arrives
- ThinkingIndicator disappears
- Response text appears word-by-word above the logo, pushing it down
- Typing speed: ~1-2 seconds total for a typical 40-50 word response
- Logo switches to smooth CSS rotation (360 degrees every ~3-4 seconds)
- Logo is positioned below the response text

### Phase 3 — Settled

- Triggered when typing animation completes
- Logo stops rotating with a deceleration ease-out (~0.5s transition)
- Logo rests in static original form below the response
- Ready for next user input

## State Transitions

```
IDLE
  -> User sends message
  -> isThinking=true, pendingResponse=null
  -> Scroll user message to top of viewport

THINKING (Phase 1)
  -> setTimeout fires with AI response
  -> isThinking=false, isTyping=true, pendingResponse="si papi"
  -> (Message is NOT yet added to messages[])

TYPING (Phase 2)
  -> TypedResponse reveals words one by one
  -> TypedResponse.onComplete fires
  -> isTyping=false, pendingResponse=null
  -> Append { role: "assistant", content: pendingResponse } to messages[]

SETTLED (Phase 3)
  -> Logo rests static below the last response
  -> When user sends next message:
     -> The settled logo disappears (the committed message in messages[]
        renders without a logo via ChatMessage)
     -> New turn begins at THINKING
```

## Scroll Behavior

- When user sends a message, the view scrolls so the user message anchors to the **top** of the viewport
- A ref is placed immediately before the latest user message in the rendered list
- Scroll uses `scrollIntoView({ behavior: "smooth", block: "start" })`
- A spacer element at the bottom of the message container creates whitespace below, sized dynamically: `min-height: calc(100dvh - var(--header-height) - var(--input-area-height))` where those CSS custom properties are set on the layout. Fallback: `calc(100dvh - 160px)` with a comment explaining the estimate.
- Scroll fires once on send, not continuously during typing — the typing area grows downward naturally
- User can still scroll up to see conversation history

## Component Architecture

### New Components

**`AnimatedLogo.tsx`**
- Renders logo SVG inline (not `<Image>`)
- Accepts `phase` prop: `"thinking"` | `"typing"` | `"settled"`
- Accepts `logoSrc` prop to determine which logo (Claudia/Consuela)
- Contains the SVG `<filter>` definition for displacement morphing
- Manages `requestAnimationFrame` loop for thinking phase
- Applies CSS rotation class for typing phase
- Works universally on both logos via SVG filters

**`TypedResponse.tsx`**
- Accepts full response string and `onComplete` callback
- Splits text by whitespace while preserving newlines (split on `/(\s+)/` to keep delimiters, so paragraph breaks are maintained)
- Reveals words progressively via `setInterval`
- Interval timing: `totalDuration / wordCount` where totalDuration is ~1-2 seconds
- Fires `onComplete` when all words are revealed
- Current responses are short ("si papi", "No, no, no") but the approach handles longer multi-line text

### Modified Components

**`ChatMessage.tsx`**
- Past assistant messages render with **no logo** — just the text content
- Remove the logo/avatar column for assistant messages entirely

**`MessageList.tsx`**
- Manages the "active response" area below the message list
- During Phase 1: renders ThinkingIndicator with AnimatedLogo beside it
- During Phase 2: renders TypedResponse with AnimatedLogo below it
- During Phase 3: renders settled static AnimatedLogo below the last response
- Introduces `isTyping` intermediate state
- Handles scroll-to-top-of-viewport behavior with spacer element

**`ThinkingIndicator.tsx`**
- Swaps `<Image>` for `AnimatedLogo` component in `"thinking"` phase

**`page.tsx`**
- Adds intermediate state between thinking-complete and message-committed
- New state variables: `isTyping: boolean`, `pendingResponse: string | null`
- When setTimeout fires: `setIsThinking(false)`, `setIsTyping(true)`, `setPendingResponse(responseText)`
- On typing complete callback: `setIsTyping(false)`, `setPendingResponse(null)`, append message to `messages[]`
- `ChatInput` disabled during both `isThinking` and `isTyping` phases

## SVG Filter Details

```xml
<filter id="morph-filter">
  <feTurbulence type="turbulence" baseFrequency="0.03" numOctaves="2" result="turbulence" />
  <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="4" />
</filter>
```

The `baseFrequency` attribute is animated via JavaScript (`requestAnimationFrame`) to oscillate smoothly, creating the organic warping effect. This approach works on any SVG shape, so both the Claudia starburst and Consuela character logo get the same breathing treatment.

**Consuela SVG note**: The Consuela logo uses a flipped coordinate system (`translate(0,24) scale(0.024,-0.024)`) and multiple paths (body + glasses). Use `filterUnits="userSpaceOnUse"` and `primitiveUnits="userSpaceOnUse"` on the filter element to ensure consistent displacement behavior regardless of the SVG's internal transform stack. Verify visually during implementation that the breathing effect looks comparable across both logos.

## CSS Rotation & Deceleration

```css
@keyframes logo-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.logo-rotating {
  animation: logo-rotate 3.5s linear infinite;
}
```

To stop smoothly: capture current rotation angle via `getComputedStyle(el).transform`, parse the matrix to extract the angle, apply it as an inline `transform`, remove the animation class, and let `transition: transform 0.5s ease-out` handle the deceleration to the nearest clean resting angle.

## Technical Notes

- No external animation libraries — pure CSS animations + React state + SVG filters
- Inline SVGs required (can't apply filters to `<Image>` or external SVG references)
- Both logo SVGs need to be embedded as React components or loaded as inline markup
- `requestAnimationFrame` cleanup via `useEffect` return to prevent memory leaks
- Word-by-word interval cleanup on unmount
- `prefers-reduced-motion`: when active, skip all animations — show response text immediately (no word-by-word), logo is always static, no morphing or rotation
- Screen readers: the full response text is present in the DOM from the start (via `aria-label` or visually-hidden span), even while the visual word-by-word reveal is in progress
- SVG filter performance: if `requestAnimationFrame` filter animation causes jank on low-end devices, fall back to a simple CSS `transform: scale()` pulse (1.0 -> 1.08 -> 1.0, 2s ease-in-out infinite)

## Affected Tests

- `__tests__/ChatMessage.test.tsx`: "renders Claude logo for assistant messages" will fail — update to assert no logo is present for assistant messages
- `__tests__/page.test.tsx`: tests that check for immediate response appearance after timeout will need to account for the typing animation delay, or use `jest.useFakeTimers()` + `act()` to advance through the typing phase
