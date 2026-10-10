"use client";

import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { useChatMachine, logoFor } from "@/components/useChatMachine";
import { useAppHeight } from "@/components/useViewport";

export default function Home() {
  useAppHeight();

  const { state, send, setPersona, reset, typingDone } = useChatMachine();
  const { messages, phase, pending, cycleId, persona, pendingLogo } = state;

  const displayName = persona === "claudia" ? "Claudia" : "Consuela";
  const logoSrc = logoFor(persona);
  const isLanding = messages.length === 0 && phase === "idle";

  /*
    ONE tree for both views.

    The previous version had an `if (!hasMessages) return (...)` early return,
    so sending the first message swapped in a completely different JSX tree.
    React tore down the landing <textarea> and built a new one — and on iOS,
    destroying the focused element dismisses the keyboard permanently, since
    focus() outside a user gesture is ignored. Roughly half the fix commits in
    this repo's history were attempts to work around that one structural choice.

    Here the child list is positionally stable: slot 0 swaps between the hero
    and the message list, but <ChatInput> is always slot 1, so React reuses the
    same DOM node and focus survives the transition untouched.
  */
  return (
    <div
      className="flex flex-col"
      style={{
        // --app-h tracks visualViewport.height, so this column ends exactly at
        // the top of the software keyboard instead of running underneath it.
        height: "var(--app-h, 100dvh)",
        backgroundColor: "var(--bg-primary)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {isLanding ? (
        <div
          key="hero"
          className="flex-1 min-h-0 flex flex-col items-center justify-end overflow-hidden"
        >
          <div className="w-full max-w-3xl mx-auto px-4">
            <div className="flex items-center justify-center gap-3 mb-6">
              <AnimatedLogo
                logoSrc={logoSrc}
                phase={persona === "consuela" ? "thinking" : "settled"}
                size={persona === "consuela" ? 44 : 56}
                onClick={() => {}}
              />
              <h1
                className="text-[40px] font-normal"
                style={{ color: "var(--text-primary)" }}
              >
                {displayName}
              </h1>
            </div>
          </div>
        </div>
      ) : (
        <MessageList
          key="list"
          messages={messages}
          phase={phase}
          pending={pending}
          cycleId={cycleId}
          logoSrc={logoSrc}
          pendingLogo={pendingLogo}
          displayName={displayName}
          onTypingDone={typingDone}
          onReset={reset}
        />
      )}

      <ChatInput
        key="input"
        onSend={send}
        persona={persona}
        onPersonaChange={setPersona}
        isLanding={isLanding}
      />

      <p
        key="disclaimer"
        className="text-center text-[13px] pb-2 flex-shrink-0"
        style={{ color: "var(--text-secondary)" }}
      >
        Claudia and Consuela can make mistakes.
        <br className="sm:hidden" /> Please double-check responses.
      </p>

      {/* Balances the flex-1 above it so the hero + input sit optically centred
          on the landing view. Rendered after the input, so toggling it cannot
          disturb the input's position in the child list. */}
      {isLanding && <div key="balance" className="flex-1 min-h-0" />}
    </div>
  );
}
