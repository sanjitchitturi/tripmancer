"use client";

import { useEffect, useRef } from "react";
import { AgentOptions } from "@/components/AgentOptions";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export function TripChat({
  turns,
  onSend,
  suggestions = true,
}: {
  turns: ChatTurn[];
  onSend: (text: string) => void;
  suggestions?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [turns]);

  return (
    <div className="card px-5 py-5 sm:px-6 sm:py-6">
      <p className="label">Trip chat</p>
      <div ref={scroller} className="mt-5 flex max-h-80 flex-col gap-3 overflow-auto">
        {turns.map((turn, index) => (
          <p
            key={`${turn.role}-${index}`}
            className={
              turn.role === "user"
                ? "max-w-[46ch] self-end rounded-[var(--radius)] bg-fg px-4 py-3 leading-6 text-bg"
                : "max-w-[54ch] self-start rounded-[var(--radius)] bg-surface-2 px-4 py-3 leading-6"
            }
          >
            {turn.text}
          </p>
        ))}
      </div>
      <AgentOptions onPick={onSend} planner={suggestions} />
      <form
        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"
        onSubmit={(event) => {
          event.preventDefault();
          const field = event.currentTarget.elements.namedItem("message");
          if (!(field instanceof HTMLInputElement)) return;
          onSend(field.value);
          field.value = "";
        }}
      >
        <label className="sr-only" htmlFor="trip-chat">
          Message
        </label>
        <input id="trip-chat" name="message" className="field" placeholder="5 nights in Lisbon from London under 1800" />
        <button className="btn btn-primary shrink-0" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
