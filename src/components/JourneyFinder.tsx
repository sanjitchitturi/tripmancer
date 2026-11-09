"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PlaceImage } from "@/components/PlaceImage";
import { destinations, origins } from "@/data/destinations";
import { inr, MONTHS } from "@/lib/format";
import type { OriginId } from "@/lib/types";

function estimate(slug: string, originId: OriginId, nights: number) {
  const place = destinations.find((item) => item.slug === slug);
  if (!place) return 0;
  const travelers = 2;
  const days = nights + 1;
  return (
    place.flights[originId] * travelers +
    place.stay.comfort * nights +
    place.foodPerDay * travelers * days +
    place.localPerDay * travelers * days
  );
}

export function JourneyFinder() {
  const [originId, setOriginId] = useState<OriginId>("lon");
  const [month, setMonth] = useState(10);
  const [nights, setNights] = useState(4);
  const [budget, setBudget] = useState(2200);
  const [selected, setSelected] = useState("lisbon");

  const matches = useMemo(() => {
    return destinations
      .map((place) => ({
        place,
        cost: estimate(place.slug, originId, nights),
        easy: place.goodMonths.includes(month),
        poor: place.poorMonths.includes(month),
      }))
      .filter((item) => item.cost <= budget)
      .sort((a, b) => Number(b.easy) - Number(a.easy) || a.cost - b.cost);
  }, [originId, month, nights, budget]);

  const active = matches.find((item) => item.place.slug === selected) ?? matches[0];
  const origin = origins.find((item) => item.id === originId) ?? origins[0];
  const monthName = MONTHS[month - 1];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
      <div className="card p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="label">Leaving from</span>
            <select
              className="field mt-2"
              value={originId}
              onChange={(event) => setOriginId(event.target.value as OriginId)}
            >
              {origins.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Month</span>
            <select className="field mt-2" value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="flex items-baseline justify-between gap-3">
              <span className="label">Nights, two people</span>
              <span className="figure text-[14px]">{nights}</span>
            </span>
            <input
              className="mt-3 w-full"
              type="range"
              min={2}
              max={12}
              value={nights}
              onChange={(event) => setNights(Number(event.target.value))}
            />
          </label>
          <label className="block">
            <span className="flex items-baseline justify-between gap-3">
              <span className="label">Budget</span>
              <span className="figure text-[14px]">Up to {inr(budget)}</span>
            </span>
            <input
              className="mt-3 w-full"
              type="range"
              min={700}
              max={8000}
              step={50}
              value={budget}
              onChange={(event) => setBudget(Number(event.target.value))}
            />
          </label>
        </div>

        <p className="mt-6 border-t border-line pt-5 text-[14px] text-muted" aria-live="polite">
          {matches.length === 0
            ? `Nothing from ${origin.name} fits ${inr(budget)}. Raise the total or shorten the stay.`
            : `${matches.length} ${matches.length === 1 ? "place fits" : "places fit"} from ${origin.name} in ${monthName}.`}
        </p>

        <ul className="mt-3 grid gap-1">
          {matches.slice(0, 6).map((item) => {
            const on = active?.place.slug === item.place.slug;
            return (
              <li key={item.place.slug}>
                <button
                  type="button"
                  className={`finder-row ${on ? "is-on" : ""}`}
                  aria-pressed={on}
                  onClick={() => setSelected(item.place.slug)}
                >
                  <span className="media h-12 w-16 shrink-0 rounded-[10px]">
                    <PlaceImage src={item.place.photo} alt="" position={item.place.photoPosition} sizes="64px" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.place.name}</span>
                    <span
                      className={`block text-[13px] ${item.easy ? "text-good" : item.poor ? "text-warn" : "text-subtle"}`}
                    >
                      {item.easy ? `Good in ${monthName}` : item.poor ? `Harder in ${monthName}` : item.place.country}
                    </span>
                  </span>
                  <span className="figure shrink-0 text-[15px]">{inr(item.cost)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {active ? (
        <article className="card overflow-hidden">
          <div className="media aspect-[16/10] rounded-none">
            <PlaceImage
              src={active.place.photo}
              alt={active.place.photoAlt}
              position={active.place.photoPosition}
              sizes="(max-width: 1024px) 100vw, 600px"
            />
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="text-[14px] text-muted">{active.place.country}</p>
                <h3 className="mt-1 text-[28px] font-semibold tracking-[-0.03em]">{active.place.name}</h3>
              </div>
              <div className="shrink-0 text-right">
                <p className="figure text-[24px] leading-tight">{inr(active.cost)}</p>
                <p className="text-[13px] text-subtle">{nights} nights for two</p>
              </div>
            </div>
            <p className="mt-4 leading-7 text-muted">{active.place.summary}</p>
            <ol className="mt-6 grid gap-3 border-t border-line pt-6">
              {active.place.activities.slice(0, 4).map((activity, index) => (
                <li key={activity.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-baseline gap-3">
                  <span className="figure text-[13px] text-subtle">{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">
                    <span className="block font-medium">{activity.name}</span>
                    <span className="block text-[13px] text-subtle">
                      {activity.area} · {activity.time}
                    </span>
                  </span>
                  <span className="figure text-[14px] text-muted">{activity.cost ? inr(activity.cost) : "Free"}</span>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/plan?d=${active.place.slug}`} className="btn btn-primary">
                Plan these days
              </Link>
              <Link href={`/destinations/${active.place.slug}`} className="btn btn-quiet">
                About {active.place.name}
              </Link>
            </div>
          </div>
        </article>
      ) : null}
    </div>
  );
}
