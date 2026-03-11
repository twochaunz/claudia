# Model Selector + Voice Input — Design Spec

## Overview

Add a Claude.ai-style model selector dropdown and voice input button to the chat input area. Update the landing page input to be a taller text box.

## Changes

### 1. Model Selector Dropdown

**Location**: Bottom-right of the input container, below the textarea row.

**Appearance**: Pill/button showing "Claudia v" or "Consuela v" with a chevron. Clicking opens a dropdown above it.

**Dropdown contents**:
- "Claudia" with a checkmark if active
- "Consuela" with a checkmark if active

**Behavior**:
- Selecting an option switches the persona
- Does NOT clear the chat history
- The logo in the header/landing updates automatically based on selection
- The logo is NOT clickable — remove the existing click-to-toggle behavior

### 2. Voice Button

**Location**: Replaces the send button when the textarea is empty.

**Icon**: Waveform/voice bars icon (matching Claude.ai's equalizer-style icon).

**Behavior**:
- Tap to start listening — uses Web Speech API (`webkitSpeechRecognition`)
- Icon pulses orange while actively listening
- After a speech pause, auto-sends the transcribed text and gets the persona's response
- Stays in continuous listening mode — each pause triggers another send→response cycle
- Tap again to stop listening
- If the browser doesn't support Speech API, hide the voice icon and show the send button as fallback

### 3. Landing Page Input

**When there are no messages** (landing/empty state):
- The input is a taller text box (~3-4 lines height, same border-radius as current)
- Placeholder: "How are you doing today?" — positioned at top-left (default textarea alignment)
- Model selector and voice/send button sit at the bottom-right of this taller box

**Disclaimer text**: Below the input box, centered, plain text (no border, no button styling):
"Claudia and Consuela can make mistakes. Please double-check responses."
Uses the same `--text-secondary` color and small font size as the current toggle button text.

### 4. Chat View Input

**When conversation is active**:
- Input shrinks to compact single-line style at the bottom
- Placeholder: "Reply..." (capital R)
- Model selector at bottom-right, voice/send button at right
- Same layout as landing but compact height

## New Components

- **`VoiceButton.tsx`** — Manages speech recognition state, pulsing animation, auto-send on pause
- **`ModelSelector.tsx`** — Dropdown for switching between Claudia and Consuela

## Modified Components

- **`ChatInput.tsx`** — Compose VoiceButton and ModelSelector; accept `isLanding` prop for height/placeholder variants
- **`page.tsx`** — Remove logo click-to-toggle; pass persona + onPersonaChange to ChatInput; use ChatInput for landing page too (remove duplicate input); remove "Switch to Consuela" button; add disclaimer text

## Out of Scope

- Actual AI model calls
- Persisting conversation history
- Dark mode toggle (auto dark mode via CSS media query remains)
