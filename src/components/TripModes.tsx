"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { getDestination } from "@/data/destinations";
import { inr } from "@/lib/format";
import { PlaceImage } from "@/components/PlaceImage";

const modes = [
  {
    id: "discover",
    label: "Discover",
    eyebrow: "Start with a feeling",
    title: "Find the city behind the idea.",
    body: "Tell us what you want to remember. TripMancer looks across places, seasons, and typical totals to surface a few trips that make sense.",
  },
  {
    id: "shape",
    label: "Shape",
    eyebrow: "See the tradeoff",
    title: "Change the plan without losing the point.",
    body: "Keep the cooking class, make the room cheaper, or protect the quiet day. Every move updates the total and the itinerary together.",
  },
  {
    id: "ready",
    label: "Ready",
    eyebrow: "Leave with clarity",
    title: "Know what is open before you book.",
    body: "Your saved plan keeps the estimate, packing list, entry reminder, and booking links in one calm workspace.",
  },
] as const;

export function TripModes() {
  const [active, setActive] = useState<(typeof modes)[number]["id"]>("discover");
  const mode = modes.find((item) => item.id === active) ?? modes[0];
  const lisbon = getDestination("lisbon")!;
  const bali = getDestination("bali")!;
  const place = active === "discover" ? bali : lisbon;

  return (
    <section className="trip-modes" aria-labelledby="trip-modes-title">
      <div className="trip-modes-copy">
        <p className="eyebrow">A better way to decide</p>
        <h2 id="trip-modes-title" className="title mt-3">A trip should get clearer as you use it.</h2>
        <p className="mt-4 lede">TripMancer keeps the inspiration and the practical details in the same conversation, so a good idea can become a trip you can actually take.</p>
        <div className="trip-mode-tabs" role="tablist" aria-label="TripMancer flow">
          {modes.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={active === item.id} className={`trip-mode-tab ${active === item.id ? "is-active" : ""}`} onClick={() => setActive(item.id)}>
              <span>{item.label}</span>
              <span className="trip-mode-tab-dot" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
      <div className="trip-mode-panel" role="tabpanel">
        <div className="trip-mode-image media">
          <PlaceImage src={place.photo} alt={place.photoAlt} position={place.photoPosition} sizes="(min-width: 900px) 42vw, 100vw" />
          <span className="trip-mode-image-label"><Sparkles size={14} /> {mode.eyebrow}</span>
        </div>
        <div className="trip-mode-card">
          <p className="eyebrow">{mode.eyebrow}</p>
          <h3 className="title-sm mt-2">{mode.title}</h3>
          <p className="mt-3 leading-7 text-muted">{mode.body}</p>
          {active === "discover" && <div className="mode-proof"><span className="figure">{inr(2300)}</span><span>typical Lisbon total from London</span></div>}
          {active === "shape" && <div className="mode-proof"><Check size={16} /><span>Stay protected · activities adjusted · budget visible</span></div>}
          {active === "ready" && <div className="mode-proof"><Check size={16} /><span>Estimate, packing list and entry reminder in one place</span></div>}
          <Link href={active === "discover" ? "/" : "/plan"} className="btn btn-primary mt-6">{active === "discover" ? "Find my trip" : "Open planner"}<ArrowRight size={16} /></Link>
        </div>
      </div>
    </section>
  );
}
