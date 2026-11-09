"use client";

import { agents } from "@/lib/agents";

export function AgentOptions({
  onPick,
  planner = true,
}: {
  onPick: (text: string) => void;
  planner?: boolean;
  plain?: boolean;
}) {
  const shown = planner ? agents : agents.filter((agent) => agent.id !== "planner");
  return (
    <div className="mt-6 grid gap-6">
      {shown.map((agent) => (
        <section key={agent.id}>
          <h2 className="text-[15px] font-semibold">{agent.name}</h2>
          <p className="mt-1 max-w-[46ch] text-[14px] leading-6 text-muted">{agent.line}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {agent.options.map((option) => (
              <button key={option.label} type="button" className="chip" onClick={() => onPick(option.text)}>
                {option.label}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
