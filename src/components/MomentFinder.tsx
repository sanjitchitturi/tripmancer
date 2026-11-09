"use client";

import Link from "next/link";
import { ArrowUpRight, Compass } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { origins } from "@/data/destinations";
import { addDays, formatDay, inr, toIso } from "@/lib/format";
import { discover, type DiscoveryBrief } from "@/lib/discovery";
import { encodePlan } from "@/lib/share";
import type { OriginId } from "@/lib/types";
import { PlaceImage } from "@/components/PlaceImage";

const suggestions = ["Cooking class", "Bookshops", "River by bike"];

export function MomentFinder() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ReturnType<typeof discover> | null>(null);
  const [submitted, setSubmitted] = useState<DiscoveryBrief | null>(null);
  const panel = useRef<HTMLElement>(null);
  const field = useRef<HTMLInputElement>(null);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) { field.current?.focus(); return; }
    const data = new FormData(event.currentTarget);
    const brief = {
      query: query.trim(), originId: String(data.get("origin")) as OriginId,
      start: String(data.get("start")) || addDays(toIso(new Date()), 14),
      nights: Number(data.get("nights")), budget: Number(data.get("budget")), travelers: Number(data.get("travelers")),
    };
    setResult(discover(brief));
    setSubmitted(brief);
    requestAnimationFrame(() => panel.current?.focus());
  }

  return (
    <div className="moment-finder">
      <form onSubmit={search} className="moment-form">
        <label className="label" htmlFor="moment">What would you travel for?</label>
        <input id="moment" className="field mt-2" ref={field} value={query} maxLength={200} required
          placeholder="A market visit and a cooking class" onChange={(event) => setQuery(event.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((idea) => <button key={idea} className="chip" type="button" onClick={() => {
            setQuery(idea); field.current?.focus();
          }}>{idea}</button>)}
        </div>
        <div className="moment-fields">
          <label>Departing from<select className="field" name="origin" defaultValue="lon">{origins.map((origin) =>
            <option key={origin.id} value={origin.id}>{origin.name}</option>)}</select></label>
          <label>Departure date<input className="field" type="date" name="start" aria-describedby="moment-dates" /></label>
          <label>Nights<input className="field" type="number" name="nights" min="1" max="30" defaultValue="3" required /></label>
          <label>Travelers<input className="field" type="number" name="travelers" min="1" max="9" defaultValue="2" required /></label>
          <label>Total budget (USD)<input className="field" type="number" name="budget" min="80" max="50000" defaultValue="2200" required /></label>
        </div>
        <div className="moment-submit">
          <p id="moment-dates" className="label">Flexible dates? Leave departure blank to try two weeks from today.</p>
          <button type="submit" className="btn btn-primary"><Compass size={17} /> Find trips</button>
        </div>
      </form>
      {result && submitted && <section ref={panel} tabIndex={-1} className="moment-results" aria-label="Trip matches">
        <h2 className="title-sm">{result.matches.length ? "Trips for" : "No trips found for"} “{submitted.query}”</h2>
        <p className="mt-2 text-muted">{formatDay(submitted.start)} · {submitted.nights} nights · {submitted.travelers} traveler{submitted.travelers === 1 ? "" : "s"} · {inr(submitted.budget)} total budget</p>
        {result.matches.length ? <ul className="mt-5 grid gap-4 md:grid-cols-3">{result.matches.map(({ place, activity, input, total, date }) =>
          <li key={place.slug} className="moment-card">
            <div className="media relative aspect-[16/9]"><PlaceImage src={place.photo} alt={place.photoAlt} sizes="(min-width: 768px) 33vw, 92vw" /></div>
            <div className="flex flex-1 flex-col p-5">
              <p className="label">{place.country} · {formatDay(date)}</p>
              <h3 className="title-sm mt-2">{activity.name}</h3>
              <p className="mt-2 text-muted">{activity.area}, <Link className="editorial-link" href={'/destinations/' + place.slug + '?p=' + encodePlan(input)}>{place.name} guide</Link></p>
              <p className="mt-3 flex-1">{activity.blurb}</p>
              <p className="figure mt-5">{inr(total)} estimated trip total</p>
              <Link className="btn btn-quiet mt-3" href={`/plan?p=${encodePlan(input)}`}>Open {place.name} plan <ArrowUpRight size={16} /></Link>
            </div>
          </li>)}</ul> : <p className="mt-4">{result.hasActivity ? "The matching activities did not fit this trip. Try fewer nights, a closer departure city or a higher budget." : "Try a specific activity from the catalog, such as a bike ride, a market or a cooking class."}</p>}
      </section>}
    </div>
  );
}
