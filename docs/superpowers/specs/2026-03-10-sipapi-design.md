# Si Papi — Design Spec

## Overview

A web app that looks exactly like Claude's chat interface but every response is just "si papi". It fakes a thinking/reasoning animation before revealing the answer.

## Core Behavior

1. User types a message and hits send
2. A "Thinking..." indicator appears (mimicking Claude's extended thinking UI)
3. A fake elapsed timer ticks up during "thinking"
4. After a randomized delay (2-8 seconds), thinking collapses
5. The response appears: **si papi**
6. This happens for every message, forever

## Tech Stack

- Next.js (App Router)
- Tailwind CSS
- No backend API calls — entirely client-side logic

## UI Requirements

Pixel-perfect recreation of Claude's chat interface (chat area only, no sidebar):

- Centered chat column (~680px max-width)
- User messages: right-aligned, light background bubble
- Assistant messages: left-aligned, clean typography
- Input bar at bottom: rounded textarea with send button
- Claude's color palette (light mode as default)
- Thinking indicator: expandable block with pulsing animation and elapsed timer
- Claude logo/branding in header area

## Architecture

### Files

- `app/page.tsx` — Main chat page
- `app/layout.tsx` — Global layout, fonts, metadata
- `components/ChatMessage.tsx` — Renders a single message (user or assistant)
- `components/ChatInput.tsx` — Input bar with textarea and send button
- `components/ThinkingIndicator.tsx` — Fake thinking animation with timer
- `components/MessageList.tsx` — Scrollable message list

### Thinking Simulation

- Random delay: `Math.random() * 6000 + 2000` (2-8 seconds)
- Shows expandable "Thinking..." block with elapsed seconds ticking
- After delay, collapse thinking block and display "si papi"

### State

- `messages: Array<{role: 'user' | 'assistant', content: string}>` — conversation history
- `isThinking: boolean` — whether the fake thinking is active
- All state lives in the page component via `useState`

## Out of Scope (v1)

- Sidebar / conversation history
- Model selector
- File uploads
- Dark mode
- Actual API calls to Claude
- Authentication
