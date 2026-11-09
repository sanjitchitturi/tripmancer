"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { destinations, getOrigin, origins } from "@/data/destinations";
import { addDays, formatDay, inr, toIso } from "@/lib/format";
import { discover, type DiscoveryBrief } from "@/lib/discovery";
import { emptyInput } from "@/lib/defaults";
import { buildPlan } from "@/lib/planner";
import { encodePlan } from "@/lib/share";
import type { OriginId, PlanInput } from "@/lib/types";
import { PlaceImage } from "./PlaceImage";
import { ShortlistButton } from "./ShortlistButton";
import { useShortlist } from "./useShortlist";

export function ExploreBrowser() {
  const [brief, setBrief] = useState<DiscoveryBrief | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const { slugs, toggle } = useShortlist();
  const [savedOnly, setSavedOnly] = useState(false);
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBrief({ query: String(data.get("query")).trim(), originId: String(data.get("origin")) as OriginId,
      start: String(data.get("start")) || addDays(toIso(new Date()), 14), nights: Number(data.get("nights")),
      travelers: Number(data.get("travelers")), budget: Number(data.get("budget")) });
    setCompare([]);
  }
  const matches = brief?.query ? discover(brief).matches : [];
  const results = destinations.flatMap(place => {
    if (savedOnly && !slugs.includes(place.slug)) return [];
    const match = matches.find(item => item.place.slug === place.slug);
    if (brief?.query && !match) return [];
    const input: PlanInput = match?.input ?? { ...emptyInput(), destinationSlug: place.slug,
      ...(brief && { originId: brief.originId, start: brief.start, end: addDays(brief.start, brief.nights),
        travelers: brief.travelers, party: brief.travelers === 1 ? "solo" : brief.travelers === 2 ? "couple" : "friends", budget: brief.budget, strategy: "keep-days" }) };
    const plan = brief ? buildPlan(input, place) : null;
    if (brief && (!plan?.ok || place.name === getOrigin(brief.originId).name)) return [];
    return [{ place, match, input, plan }];
  });
  const selection = results.filter(row => compare.includes(row.place.slug));
  return <div className="wrap page"><h1 className="display">Destinations</h1>
    <p className="lede mt-4">Browse the city guides, or find a trip around something you want to do.</p>
    <form id="experiences" className="card mt-8 scroll-mt-24 p-5" onSubmit={apply} onReset={() => { setBrief(null); setCompare([]); setSavedOnly(false); }}>
      <label>Experience<input className="field mt-1" name="query" maxLength={200} placeholder="Cooking class, bookshops, river by bike…" /></label>
      <div className="moment-fields">
        <label>Departing from<select className="field" name="origin" defaultValue="lon">{origins.map(origin => <option key={origin.id} value={origin.id}>{origin.name}</option>)}</select></label>
        <label>Departure date<input className="field" type="date" name="start" /></label>
        <label>Nights<input className="field" type="number" name="nights" min="1" max="30" defaultValue="3" required /></label>
        <label>Travelers<input className="field" type="number" name="travelers" min="1" max="9" defaultValue="2" required /></label>
        <label>Total budget (USD)<input className="field" type="number" name="budget" min="80" max="50000" defaultValue="2200" required /></label>
      </div>
      <p className="mt-4 text-muted">Leave departure blank to plan for two weeks from today.</p>
      <div className="mt-4 flex flex-wrap items-center gap-4"><button className="btn btn-primary">Find trips</button><button type="reset" className="editorial-link">Reset filters</button><label><input type="checkbox" checked={savedOnly} onChange={e => { setSavedOnly(e.target.checked); setCompare([]); }} /> Saved places only</label></div>
    </form>
    <p role="status" className="mt-8">{results.length} {results.length === 1 ? "city" : "cities"}{brief && ` · ${brief.query || "Any experience"} · from ${getOrigin(brief.originId).name} · ${formatDay(brief.start)} · ${brief.nights} nights · ${brief.travelers} travelers · up to ${inr(brief.budget)} USD`}</p>
    {!results.length && <p className="mt-3">Try a broader experience, raise the budget, or reset the filters to see every city.</p>}
    {selection.length > 0 && <section className="card mt-6 p-5"><h2 className="title-sm">Compare your cities</h2>{selection.map(({place,plan}) => <p key={place.slug}>{place.name} · {plan && inr(plan.total)} total · {plan && inr(plan.stayAmount)} accommodation · {plan && inr(plan.travelAmount)} travel</p>)}{selection.length === 1 && <p>Choose one more city to compare the same dates and party.</p>}</section>}
    <div className="guide-grid mt-6">{results.map(({place,match,input,plan}) => {
      const query = brief ? "?p=" + encodePlan(input) : "";
      return <article key={place.slug}><Link href={"/destinations/" + place.slug + query}><div className="media aspect-[4/3]"><PlaceImage src={place.photo} alt={place.photoAlt} position={place.photoPosition} sizes="(min-width:768px) 32vw, 95vw" /></div><p className="label mt-3">{place.country}</p><h2 className="title-sm">{place.name}</h2></Link>
        <p className="mt-2">{match ? match.activity.name + " · " + match.activity.area : place.summary}</p>
        {plan && <><p className="figure mt-3">{inr(plan.total)} USD estimated group total</p><Link className="editorial-link" href={"/plan" + query}>Open {place.name} plan</Link></>}
        <div className="mt-3 flex flex-wrap gap-3"><ShortlistButton name={place.name} saved={slugs.includes(place.slug)} onToggle={() => toggle(place.slug)} />
        {plan && <button className="btn btn-quiet" aria-pressed={compare.includes(place.slug)} disabled={!compare.includes(place.slug) && compare.length >= 2} onClick={() => setCompare(current => current.includes(place.slug) ? current.filter(s => s !== place.slug) : [...current, place.slug])}>Compare {place.name}</button>}</div>
      </article>;
    })}</div></div>;
}
