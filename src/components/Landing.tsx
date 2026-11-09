import Link from "next/link";
import { Check } from "lucide-react";
import { MomentFinder } from "@/components/MomentFinder";
import { PlaceImage } from "@/components/PlaceImage";
import { getDestination } from "@/data/destinations";
import { HomeFlow } from "@/components/HomeFlow";

export function Landing() {
  const place = getDestination("lisbon")!;
  const tokyo = getDestination("tokyo")!;
  return (
    <div className="home-shell">
      <section className="home-hero wrap">
        <div className="home-hero-copy">
          <p className="eyebrow">Travel planning with a point of view</p>
          <h1 className="home-hero-title">Travel that fits the way you want to be there.</h1>
          <p className="lede mt-6">TripMancer turns a half-formed idea into a priced, editable trip. Start with what you want to do, then make the dates, distance, and budget work around it.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#find-your-trip" className="btn btn-primary btn-lg">Find your trip <ArrowMark /></Link>
            <Link href="/explore" className="btn btn-quiet btn-lg">Browse places</Link>
          </div>
          <div className="home-hero-notes" aria-label="TripMancer benefits">
            <span><Check size={15} /> Typical costs first</span><span><Check size={15} /> Editable days</span><span><Check size={15} /> No booking pressure</span>
          </div>
        </div>
        <div className="home-hero-collage" aria-label="TripMancer travel preview">
          <div className="home-hero-main media"><PlaceImage src={place.photo} alt={place.photoAlt} position={place.photoPosition} sizes="(min-width: 900px) 42vw, 100vw" eager /><span className="home-hero-location">Lisbon · four nights</span></div>
          <div className="home-hero-float card"><p className="eyebrow">A good first move</p><p className="mt-2 text-[18px] font-semibold">A cooking class in Baixa</p><p className="mt-1 text-[14px] text-muted">Keep the stay. Make the morning count.</p></div>
          <div className="home-hero-small media"><PlaceImage src={tokyo.photo} alt={tokyo.photoAlt} position={tokyo.photoPosition} sizes="180px" /></div>
        </div>
      </section>
      <section id="find-your-trip" className="wrap home-finder-section"><div className="home-section-heading"><p className="eyebrow">Start anywhere</p><h2 className="title mt-2">What would make the trip worth taking?</h2><p className="mt-3 text-muted">A meal, a neighbourhood, a long walk, a season. One sentence is enough.</p></div><MomentFinder /></section>
      <HomeFlow />
      <section className="wrap home-bottom-cta"><div className="home-bottom-cta-inner"><div><p className="eyebrow">When the idea becomes real</p><h2 className="title mt-2">Your next trip should already know what matters.</h2></div><Link href="/plan" className="btn btn-primary btn-lg">Open the planner <ArrowMark /></Link></div></section>
    </div>
  );
}

function ArrowMark() { return <span aria-hidden="true">↗</span>; }
