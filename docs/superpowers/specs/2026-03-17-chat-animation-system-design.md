# Chat Animation System Redesign

## Overview

Redesign the logo animations for both Claudia and Consuela personas during the thinking and typing phases. Replace the current feTurbulence SVG filter with CSS-only animations. Replace the Claudia starburst logo with a hand-drawn eyelash design.

## Current State

- **Claudia logo**: 4-point starburst SVG path, symmetrical
- **Consuela logo**: Character face (body silhouette + glasses with bridge)
- **Thinking animation (both)**: JS `requestAnimationFrame` loop animating `feTurbulence` `baseFrequency` on an SVG `feDisplacementMap` filter. 2.5s sinusoidal breathing cycle. Creates morphing distortion that looks unnatural on Consuela's character shape.
- **Typing animation (both)**: CSS `logo-rotate` 360° rotation at 3.5s linear infinite
- **Settling animation (both)**: CSS transition easing rotation to rest angle over 0.5s

## New Claudia Logo

Replace the 4-point starburst with a hand-drawn 6-lash eyelash (no eye).

### SVG Structure

- **Lid curve**: Wobbly arc at base, `stroke-width="1.3"`, `stroke-linecap="round"`
- **6 lashes**: Fanning upward from the lid, varying thickness:
  - Outer lashes (1, 6): `stroke-width="1.1"` — thinnest, wispy
  - Mid lashes (2, 5): `stroke-width="1.3"`
  - Center lashes (3, 4): `stroke-width="1.4"` — thickest
- **Color**: All strokes `#D97757`
- **ViewBox**: `0 0 24 24` (unchanged)

### SVG Paths

```svg
<!-- Lid curve -->
<path d="M5 17.5 C7.5 16 10 15.5 12 15.5 C14.5 15.5 17 16 19.5 17.5"
  fill="none" stroke="#D97757" stroke-width="1.3" stroke-linecap="round"/>
<!-- Lash 1 (outer left) -->
<path d="M6.2 17 C5.5 14 4.5 11.5 3.8 9.5"
  fill="none" stroke="#D97757" stroke-width="1.1" stroke-linecap="round"/>
<!-- Lash 2 -->
<path d="M8.3 16.2 C7.8 13 6.8 9.8 6.2 7"
  fill="none" stroke="#D97757" stroke-width="1.3" stroke-linecap="round"/>
<!-- Lash 3 (center) -->
<path d="M10.5 15.7 C10.2 12.5 9.8 9 10 5.5"
  fill="none" stroke="#D97757" stroke-width="1.4" stroke-linecap="round"/>
<!-- Lash 4 (center) -->
<path d="M13 15.6 C13.3 12.5 13.8 9 14.2 5.8"
  fill="none" stroke="#D97757" stroke-width="1.4" stroke-linecap="round"/>
<!-- Lash 5 -->
<path d="M15.5 16 C16.2 13 17 9.8 17.8 7.2"
  fill="none" stroke="#D97757" stroke-width="1.3" stroke-linecap="round"/>
<!-- Lash 6 (outer right) -->
<path d="M18 17 C18.8 14 19.8 11.5 20.5 9.5"
  fill="none" stroke="#D97757" stroke-width="1.1" stroke-linecap="round"/>
```

## Consuela Logo

No changes to the existing SVG paths (body silhouette, glasses ovals, bridge arc).

## Animation Design

### Phase Matrix

| Phase | Claudia (lashes) | Consuela (glasses) |
|-------|-------------------|---------------------|
| Thinking | Sporadic blink (`scaleY`) | Stop-motion: body scale-breathe + glasses rotate ~5° |
| Typing | 360° rotation, 3.5s linear | 360° rotation, 3.5s linear (unchanged) |
| Settling | CSS transition ease to rest (unchanged) | CSS transition ease to rest (unchanged) |
| Settled | Static | Static |

### Claudia Thinking: Sporadic Blink

Lashes collapse to the lid line via `scaleY(0.05)` and spring back to `scaleY(1)`. The entire lash group (lid + all 6 lashes) is wrapped in a `<g>` and animated together.

**Timing**: 8s CSS keyframe cycle with irregular blink placement:
- Gaps between blinks range from **0.3s to 1.3s**
- Pattern includes **single blinks** and **double-blinks** (two blinks separated by 0.3s)
- 6 blink events per cycle: 4 singles + 2 doubles
- `transform-origin: 12px 17.5px` (base of lashes / lid line)

**Keyframe**: `lash-sporadic-blink`

```
0.0s  open
0.7s  blink (single)
0.85s open — 0.3s gap
1.15s blink (single)
1.3s  open — 1.1s gap
2.4s  blink (double pt.1)
2.55s open — 0.3s gap
2.85s blink (double pt.2)
3.0s  open — 0.5s gap
3.5s  blink (single)
3.65s open — 1.3s gap
4.95s blink (double pt.1)
5.1s  open — 0.3s gap
5.4s  blink (double pt.2)
5.55s open — 0.8s gap
6.35s blink (single)
6.5s  open — 0.4s gap
6.9s  blink (single)
7.05s open — 0.95s → loop
```

### Consuela Thinking: Stop-Motion

Two independent CSS animations running simultaneously on separate SVG groups:

**Body scale-breathe** (`consuela-body-think`):
- 6 discrete frames via `steps(6)`
- 0.8s cycle (medium speed, ~133ms per frame)
- Subtle scale variation around the base `0.024` factor: `0.0236` to `0.0244`
- Slight Y-translate variation for organic feel

```
Frame 1: scale(0.024, -0.024)     — normal
Frame 2: scale(0.0244, -0.0244)   — slightly bigger
Frame 3: scale(0.0236, -0.0236)   — slightly smaller
Frame 4: scale(0.0242, -0.0242)   — slightly bigger
Frame 5: scale(0.0237, -0.0237)   — slightly smaller
Frame 6: scale(0.0241, -0.0241)   — near normal
```

**Glasses rotation** (`consuela-glasses-think`):
- 6 discrete frames via `steps(6)`
- 0.8s cycle (synced with body)
- ~5° rotation range
- `transform-origin: 16px 12px` (center of glasses)

```
Frame 1: rotate(0°)
Frame 2: rotate(4.5°)
Frame 3: rotate(-3°)
Frame 4: rotate(5°)
Frame 5: rotate(-4°)
Frame 6: rotate(2°)
```

### Typing & Settling

No changes to existing behavior for either persona:
- **Typing**: `logo-rotate` keyframe, 360° rotation, 3.5s linear infinite
- **Settling**: CSS `transition: transform 0.5s ease-out`, JS captures current rotation angle from computed style matrix

## Technical Approach: CSS-Only

### Removed

- JS `requestAnimationFrame` animation loop in `AnimatedLogo.tsx`
- `feTurbulence` and `feDisplacementMap` SVG filter elements
- `filterRef` ref
- `filterId` generation
- `applyFilter` logic and inline `filter` style

### Added

**`app/globals.css`**:
- `@keyframes lash-sporadic-blink` — 8s sporadic blink cycle
- `@keyframes consuela-body-think` — 6-frame body scale, `steps(6)`, 0.8s
- `@keyframes consuela-glasses-think` — 6-frame glasses rotation, `steps(6)`, 0.8s
- `.claudia-thinking` class applying `lash-sporadic-blink`
- `.consuela-body-thinking` class applying `consuela-body-think`
- `.consuela-glasses-thinking` class applying `consuela-glasses-think`
- `prefers-reduced-motion` entries for all new animation classes

**`components/AnimatedLogo.tsx`**:
- Replace `CLAUDIA_SVG` with new lash paths
- Wrap Claudia lash paths in a `<g>` for blink animation target
- Wrap Consuela body and glasses in separate `<g>` elements for independent animation
- Persona-aware CSS class assignment based on `phase` + `logoSrc`:
  - Claudia + thinking → `claudia-thinking` on lash group
  - Consuela + thinking → `consuela-body-thinking` on body group + `consuela-glasses-thinking` on glasses group
  - Both + typing → `logo-rotating` on SVG element (unchanged)
  - Both + settled → `logo-settling` on SVG element (unchanged)
- Remove `useEffect` for thinking phase JS animation
- Remove `filterRef`, `filterId`, `useId` import
- Keep `handleSettling` logic unchanged (reads computed rotation matrix)

**`public/claude-logo.svg`**:
- Update to match new lash SVG paths (for any static/external usage)

## Accessibility

- All new animations gated behind `prefers-reduced-motion: no-preference`
- `prefers-reduced-motion: reduce` disables all keyframe animations and transitions (existing pattern extended)
- `aria-hidden="true"` on SVG elements (unchanged)

## Files Changed

| File | Change |
|------|--------|
| `components/AnimatedLogo.tsx` | New lash SVG, persona-aware CSS classes, remove JS animation + filter |
| `app/globals.css` | New keyframes: sporadic blink, stop-motion body/glasses |
| `public/claude-logo.svg` | Update to lash design |
