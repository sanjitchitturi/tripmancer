"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { suggestionChips } from "@/content/copy";

export function LandingChat() {
  const router = useRouter();
  const [draft, setDraft] = useState("");

  function go(text: string) {
    const clean = text.trim();
    if (!clean) return;
    router.push(`/plan?q=${encodeURIComponent(clean)}`);
  }

  return (
    <div>
      <form
        className="prompt"
        onSubmit={(event) => {
          event.preventDefault();
          go(draft);
        }}
      >
        <label className="sr-only" htmlFor="landing-chat">
          Describe your trip
        </label>
        <input
          id="landing-chat"
          value={draft}
          placeholder="5 nights in Lisbon from London under $1,800"
          autoComplete="off"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button className="btn btn-primary shrink-0" type="submit">
          Plan
        </button>
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[14px] text-subtle">Try</span>
        {suggestionChips.map((chip) => (
          <button key={chip.label} type="button" className="chip" onClick={() => go(chip.text)}>
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
