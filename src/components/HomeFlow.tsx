"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Bell, CalendarDays, Check, Compass, SlidersHorizontal } from "lucide-react";
import { getDestination } from "@/data/destinations";
import { inr } from "@/lib/format";
import { PlaceImage } from "@/components/PlaceImage";

const steps = [
  { id: "understand", label: "Understand", icon: Compass, title: "Start with the way you want to feel.", body: "Give TripMancer a mood, a meal, a walk, or a weekend. It searches the places and activities that fit the idea.", cta: "Find an experience" },
  { id: "shape", label: "Shape", icon: SlidersHorizontal, title: "See the tradeoffs while you decide.", body: "Move between a longer stay, a better room, or more of the things you care about. The total and the day plan move together.", cta: "Shape a trip" },
  { id: "ready", label: "Stay ready", icon: Bell, title: "Keep the details somewhere calm.", body: "Save the plan with its cost, packing list, entry reminder, and booking links. Come back when you are ready to act.", cta: "Open your plans" },
] as const;

export function HomeFlow() {
  const [activeId, setActiveId] = useState<(typeof steps)[number]["id"]>("understand");
  const active = steps.find((step) => step.id === activeId) ?? steps[0];
  const place = getDestination(activeId === "understand" ? "bali" : activeId === "shape" ? "lisbon" : "mexico-city")!;
  const Icon = active.icon;

  return (
    <section className="home-flow" aria-labelledby="home-flow-title">
      <div className="home-flow-intro">
        <p className="eyebrow">The TripMancer flow</p>
        <h2 id="home-flow-title" className="display home-flow-title">From a feeling to a trip you can take.</h2>
        <p className="lede mt-5">The app stays useful after the first idea. It helps you choose, shows the cost of each decision, and keeps the plan ready when the dates become real.</p>
        <div className="home-flow-tabs" role="tablist" aria-label="How TripMancer works">
          {steps.map((step) => {
            const StepIcon = step.icon;
            return <button key={step.id} type="button" role="tab" aria-selected={activeId === step.id} className={`home-flow-tab ${activeId === step.id ? "is-active" : ""}`} onClick={() => setActiveId(step.id)}>
              <StepIcon size={17} strokeWidth={1.8} /> <span>{step.label}</span>
            </button>;
          })}
        </div>
      </div>
      <div className="home-flow-stage" role="tabpanel">
        <div className="home-flow-visual media">
          <PlaceImage src={place.photo} alt={place.photoAlt} position={place.photoPosition} sizes="(min-width: 900px) 42vw, 100vw" />
          <div className="home-flow-photo-caption"><span>{place.name}</span><span>{place.country}</span></div>
        </div>
        <div className="home-flow-panel">
          <div className="home-flow-icon"><Icon size={19} /></div>
          <p className="eyebrow mt-5">{active.label}</p>
          <h3 className="title mt-2">{active.title}</h3>
          <p className="mt-4 leading-7 text-muted">{active.body}</p>
          <div className="home-flow-proof">
            {activeId === "understand" && <><span className="figure">{inr(2300)}</span><span>typical total for four nights from London</span></>}
            {activeId === "shape" && <><Check size={17} /><span>Keep the stay. Make room for the experience.</span></>}
            {activeId === "ready" && <><CalendarDays size={17} /><span>Dates, costs, and before-you-go details in one place.</span></>}
          </div>
          <Link href={activeId === "understand" ? "/" : activeId === "shape" ? "/plan" : "/trips"} className="btn btn-primary mt-7">{active.cta}<ArrowRight size={16} /></Link>
        </div>
      </div>
    </section>
  );
}
