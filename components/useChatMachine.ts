"use client";

import { useReducer, useEffect, useCallback } from "react";

export type Persona = "claudia" | "consuela";

export interface Message {
  role: "user" | "assistant";
  content: string;
  logoSrc?: string;
}

/**
 * One linear cycle per user message:
 *
 *   idle → scrolling → thinking → transitioning → typing → settled → idle
 *          ╰ 300ms    ╰ 2–5s     ╰ 220ms         ╰ words  ╰ 500ms
 *
 * `scrolling`     — new user message animates to the top of the viewport
 * `thinking`      — thinking indicator; waiting on the (simulated) response
 * `transitioning` — thinking indicator fades out before the response fades in
 * `typing`        — word-by-word reveal, logo rotating
 * `settled`       — logo eases to rest, response fully visible
 *
 * Leaving `settled` commits the response into `messages` in the *same*
 * reducer step that changes the phase, so the active area unmounts and the
 * committed message mounts in a single React commit. The previous version
 * called `onTypingComplete()` from three separate effects — including a
 * `useLayoutEffect` — which is why a message could be dropped or double-committed.
 */
export type Phase =
  | "idle"
  | "scrolling"
  | "thinking"
  | "transitioning"
  | "typing"
  | "settled";

export interface State {
  messages: Message[];
  phase: Phase;
  /** Response text once it is ready to be revealed; null while thinking. */
  pending: string | null;
  /** Response text + logo captured at send time, delivered when the timer fires. */
  queued: { text: string; logoSrc: string } | null;
  /** Logo for the response currently being revealed. */
  pendingLogo: string;
  persona: Persona;
  /**
   * Increments on every send. Two jobs: it invalidates in-flight timers from a
   * superseded cycle, and it keys <TypedResponse> so an identical response
   * string twice in a row (Claudia always says "si papi") still remounts and
   * replays. Without the key the reveal effect never re-runs on repeat text.
   */
  cycleId: number;
}

type Action =
  | { type: "send"; text: string; response: string; logoSrc: string }
  | { type: "advance"; from: Phase; to: Phase; cycleId: number }
  | { type: "responseReady"; cycleId: number }
  | { type: "typingDone" }
  | { type: "setPersona"; persona: Persona }
  | { type: "reset" };

/** Phases that leave on their own after a fixed duration. */
const TIMED: Partial<Record<Phase, { ms: number; to: Phase }>> = {
  scrolling: { ms: 300, to: "thinking" },
  transitioning: { ms: 220, to: "typing" },
  settled: { ms: 500, to: "idle" },
};

const CONSUELA_QUOTES = [
  "No, no, no",
  "No... no... no... I stay",
  "Oh, no... no",
  "No... no... Mr. Superman no home",
  "No... no... no is... no",
  "No... no... afuera",
  "I... nooo... no",
  "No... I keep job",
];

export function getResponse(persona: Persona): string {
  if (persona === "consuela") {
    return CONSUELA_QUOTES[Math.floor(Math.random() * CONSUELA_QUOTES.length)];
  }
  return "si papi";
}

export function logoFor(persona: Persona): string {
  return persona === "claudia" ? "/claude-logo.svg" : "/consuela-logo.svg";
}

export const INITIAL: State = {
  messages: [],
  phase: "idle",
  pending: null,
  queued: null,
  pendingLogo: "/claude-logo.svg",
  persona: "claudia",
  cycleId: 0,
};

/** Appends the in-flight response to the transcript, if there is one. */
function commitPending(state: State): Message[] {
  if (state.pending === null) return state.messages;
  return [
    ...state.messages,
    { role: "assistant", content: state.pending, logoSrc: state.pendingLogo },
  ];
}

/** Exported for direct unit testing — it is a pure function of (state, action). */
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "send": {
      // A send is always accepted, from any phase. If a response is mid-reveal
      // it is committed as-is rather than discarded, so nothing is ever lost
      // and the transcript stays consistent. This replaces the old
      // `disabled={isThinking || pendingResponse !== null}` lockout.
      return {
        ...state,
        messages: [
          ...commitPending(state),
          { role: "user", content: action.text },
        ],
        phase: "scrolling",
        pending: null,
        queued: { text: action.response, logoSrc: action.logoSrc },
        pendingLogo: action.logoSrc,
        cycleId: state.cycleId + 1,
      };
    }

    case "advance": {
      // Stale-timer guard: a timer from a superseded cycle, or one that fired
      // after the phase already moved on, is a no-op. Every timed transition
      // goes through here, so there is exactly one place this can go wrong.
      if (state.phase !== action.from || state.cycleId !== action.cycleId) {
        return state;
      }
      // settled → idle is also the commit point.
      if (action.from === "settled" && action.to === "idle") {
        return {
          ...state,
          messages: commitPending(state),
          pending: null,
          phase: "idle",
        };
      }
      return { ...state, phase: action.to };
    }

    case "responseReady": {
      if (state.cycleId !== action.cycleId) return state;
      if (state.phase !== "thinking" && state.phase !== "scrolling") {
        return state;
      }
      if (!state.queued) return state;
      return {
        ...state,
        pending: state.queued.text,
        pendingLogo: state.queued.logoSrc,
        queued: null,
        phase: "transitioning",
      };
    }

    case "typingDone": {
      if (state.phase !== "typing") return state;
      return { ...state, phase: "settled" };
    }

    case "setPersona":
      return { ...state, persona: action.persona };

    case "reset":
      return { ...INITIAL, persona: state.persona, cycleId: state.cycleId + 1 };

    default:
      return state;
  }
}

export function useChatMachine() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const { phase, cycleId } = state;

  // Every fixed-duration transition, in one effect. Re-keyed on cycleId so a
  // new send cancels the previous cycle's pending timer via cleanup.
  useEffect(() => {
    const step = TIMED[phase];
    if (!step) return;
    const id = setTimeout(() => {
      dispatch({ type: "advance", from: phase, to: step.to, cycleId });
    }, step.ms);
    return () => clearTimeout(id);
  }, [phase, cycleId]);

  // The simulated "model latency". One timer per cycle, started when the cycle
  // begins. Left-skewed 2s–5s, favouring shorter delays.
  useEffect(() => {
    if (cycleId === 0) return;
    const delay = 2000 + Math.pow(Math.random(), 2) * 3000;
    const id = setTimeout(() => {
      dispatch({ type: "responseReady", cycleId });
    }, delay);
    return () => clearTimeout(id);
  }, [cycleId]);

  // Persona is resolved at send time, so the response text and its logo are
  // fixed for the whole cycle — switching persona mid-response cannot retarget
  // a reply that is already in flight.
  const persona = state.persona;
  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      dispatch({
        type: "send",
        text: trimmed,
        response: getResponse(persona),
        logoSrc: logoFor(persona),
      });
    },
    [persona],
  );

  const setPersona = useCallback((persona: Persona) => {
    dispatch({ type: "setPersona", persona });
  }, []);

  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  const typingDone = useCallback(() => dispatch({ type: "typingDone" }), []);

  return { state, send, setPersona, reset, typingDone };
}
