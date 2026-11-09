"use client";

import { Heart } from "lucide-react";

export function ShortlistButton({
  saved,
  name,
  onToggle,
  overlay = false,
}: {
  saved: boolean;
  name: string;
  onToggle: () => void;
  overlay?: boolean;
}) {
  const label = saved ? `Remove ${name} from shortlist` : `Shortlist ${name}`;
  const heart = <Heart size={overlay ? 18 : 16} strokeWidth={1.8} fill={saved ? "currentColor" : "none"} aria-hidden="true" />;

  if (overlay) {
    return (
      <button
        type="button"
        className="glass-icon grid h-10 w-10 place-items-center rounded-[14px] border border-white/55 bg-white/30 text-white backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/50"
        aria-pressed={saved}
        aria-label={label}
        onClick={onToggle}
      >
        {heart}
      </button>
    );
  }

  return (
    <button type="button" className="btn btn-quiet btn-lg" aria-pressed={saved} aria-label={label} onClick={onToggle}>
      {heart}
      {saved ? "Saved" : "Save"}
    </button>
  );
}
