"use client";

import Link from "next/link";
import { PlaceImage } from "@/components/PlaceImage";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bed,
  Calendar,
  CloudSun,
  Plane,
  Ticket,
  TrainFront,
  Utensils,
} from "lucide-react";
import { copy, dateNudge, seasonWarning } from "@/content/copy";
import { destinations, getDestination, getOrigin, origins } from "@/data/destinations";
import { applyCoach, moveActivity, moveToDay, removeActivity, swapInPlan } from "@/lib/edits";
import {
  INTEREST_LABEL,
  PARTY_LABEL,
  PACE_LABEL,
  STRATEGY_LABEL,
  STRATEGY_NOTE,
  TIER_LABEL,
  TIER_NOTE,
  addDays,
  formatDay,
  formatRange,
  inr,
  monthAnchor,
  monthName,
  nightsBetween,
  partyTravelers,
} from "@/lib/format";
import { mergeBrief } from "@/lib/brief";
import { packingList, readinessSummary } from "@/lib/prep";
import { buildPlan, swapOptions } from "@/lib/planner";
import { seasonFit } from "@/lib/season";
import { activityLink, affiliateIds, agodaLink, bookingLink, flightLink, railLink } from "@/lib/affiliates";
import { getAccountSnapshot, saveTrialInput } from "@/lib/account";
import { answerMessage } from "@/lib/chat";
import { ShorterDay } from "@/components/plan/ShorterDay";
import { TripChat, type ChatTurn } from "@/components/TripChat";
import { encodePlan } from "@/lib/share";
import { upsertTrip } from "@/lib/storage";
import { getWorkspace } from "@/lib/workspace";
import type { HotelTier, Interest, Pace, Party, PlanInput, Readiness, Strategy, Transport } from "@/lib/types";

const interestOrder: Interest[] = ["food", "culture", "adventure", "nature", "relax", "nightlife", "family"];
const parties: Party[] = ["solo", "couple", "family", "friends"];
const paces: Pace[] = ["relaxed", "balanced", "packed"];
const tiers: (HotelTier | "auto")[] = ["auto", "budget", "comfort", "premium"];

export function PlanWorkspace({
  initial,
  initialReadiness,
  savedId: startingId,
  initialQuery,
}: {
  initial: PlanInput;
  initialReadiness: Readiness;
  savedId: string | null;
  initialQuery: string;
}) {
  const [input, setInput] = useState(initial);
  const [previousDay, setPreviousDay] = useState<{ before: PlanInput; after: PlanInput } | null>(null);
  const [readiness, setReadiness] = useState(initialReadiness);
  const [savedId, setSavedId] = useState(startingId);
  const [selected, setSelected] = useState<string | null>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const [sheetKind, setSheetKind] = useState<"edit" | "cost">("cost");
  function openSheet(kind: "edit" | "cost") { setSheetKind(kind); sheet.current?.showModal(); }
  const [notice, setNotice] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: "assistant",
      text: "Ask for a trip with a city, a place, dates, and a dollar budget. I can also answer visa, months, food, and cost for the 12 places on TripMancer.",
    },
  ]);
  const asked = useRef(false);
  const ids = affiliateIds();

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!savedId) return;
    const timer = window.setTimeout(() => {
      void upsertTrip({ id: savedId, savedAt: new Date().toISOString(), input, readiness })
        .then((error) => { if (error) setNotice(error); })
        .catch(() => setNotice("Changes could not be saved. Try saving again."));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [savedId, input, readiness]);

  useEffect(() => {
    if (input.destinationSlug) saveTrialInput(input);
  }, [input]);

  const destination = getDestination(input.destinationSlug);
  const origin = getOrigin(input.originId);
  const plan = useMemo(
    () => (destination && input.start && input.end ? buildPlan(input, destination, destinations) : null),
    [destination, input],
  );
  const season = destination ? seasonFit(destination, input.start) : null;
  const rail = destination?.rail.find((option) => option.originId === input.originId) ?? null;
  const flags = getWorkspace({
    destination: Boolean(destination),
    dates: Boolean(input.start && input.end),
    season: season?.status ?? "unknown",
    outbound: Boolean(destination && origin.country !== destination.country),
    rail: Boolean(rail),
    saved: Boolean(savedId),
    planOk: Boolean(plan?.ok),
    coach: Boolean(plan?.coach),
  });
  const swaps = destination && plan && selected ? swapOptions(input, destination, plan, selected) : [];
  const eatLine = destination?.eat.toLowerCase() ?? "";
  const foodDay =
    plan?.days.findIndex((day) =>
      day.activities.some((item) => {
        const word = item.activity.name.split(" ")[0]?.toLowerCase() ?? "";
        return word.length > 3 && eatLine.includes(word);
      }),
    ) ?? -1;
  const plannedActivities = plan?.days.flatMap((day) => day.activities.map((item) => item.activity)) ?? [];
  const month = input.start ? Number(input.start.slice(5, 7)) : null;
  const border = Boolean(destination && origin.country !== destination.country);
  const packing = destination ? packingList(destination, month, plannedActivities, border) : [];
  const summary = readinessSummary(packing, readiness, border);

  function choosePlace(slug: string) {
    const place = getDestination(slug);
    setSelected(null);
    setInput((current) => ({
      ...current,
      destinationSlug: slug,
      dayPlan: [],
      excludedActivityIds: [],
      pinnedActivityIds: [],
      tier: "auto",
      transport: place?.rail.some((option) => option.originId === current.originId) ? current.transport : "flight",
    }));
  }

  function handleChat(text: string) {
    const clean = text.trim();
    if (!clean) return;
    const reply = answerMessage(clean, input);
    const message = reply.text;
    if (reply.patch) setInput((current) => mergeBrief(current, reply.patch!));
    if (reply.strategy) setInput((current) => ({ ...current, strategy: reply.strategy! }));
    setTurns((current) => [...current, { role: "user", text: clean }, { role: "assistant", text: message }]);
  }

  useEffect(() => {
    if (!initialQuery || asked.current) return;
    asked.current = true;
    handleChat(initialQuery);
    // Answer the landing query once when the planner opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  function jumpMonth(monthNumber: number) {
    const start = monthAnchor(monthNumber);
    const nights = input.start && input.end ? Math.max(1, nightsBetween(input.start, input.end)) : 4;
    setInput((current) => ({ ...current, start, end: addDays(start, nights) }));
  }

  function setDate(key: "start" | "end", value: string) {
    setInput((current) => {
      const next = { ...current, [key]: value || null };
      if (next.start && next.end && next.end < next.start) {
        return { ...next, start: next.end, end: next.start };
      }
      return next;
    });
  }

  async function share() {
    if (!window.confirm(`Share your ${destination?.name} itinerary for ${input.travelers} traveler(s)? Anyone with the link can see travel dates, departure city, budget, preferences and stops. Account details and private checklists stay out of the link.`)) return;
    const url = `${window.location.origin}/plan?p=${encodePlan(input)}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice(copy.linkCopied);
    } catch {
      setNotice(url);
    }
  }

  async function save() {
    const id = savedId ?? crypto.randomUUID();
    try {
      const error = await upsertTrip({ id, savedAt: new Date().toISOString(), input, readiness });
      if (error) { setNotice(error); return; }
      setSavedId(id);
      setNotice(getAccountSnapshot().session ? "Saved to your account." : "Saved on this device.");
    } catch {
      setNotice("Could not save this trip. Try again.");
    }
  }

  function open(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!destination) {
    return (
      <div className="wrap page">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-2xl">
            <p className="eyebrow">Plan</p>
            <h1 className="display mt-3">Plan your trip</h1>
            <p className="lede mt-5">
              Enter a city, dates and budget, or choose a destination below.
            </p>
          </div>
          <TripChat turns={turns} onSend={handleChat} />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((place) => (
              <button
                key={place.slug}
                type="button"
                className="group overflow-hidden text-left"
                onClick={() => choosePlace(place.slug)}
              >
                <span className="media relative block aspect-[4/3]">
                  <PlaceImage src={place.photo} alt={place.photoAlt} position={place.photoPosition} sizes="(max-width: 640px) 100vw, 33vw" />
                </span>
                <span className="mt-4 block">
                  <span className="label">
                    {place.country} · {place.vibe}
                  </span>
                  <span className="mt-1 block text-[22px] font-semibold tracking-[-0.02em]">{place.name}</span>
                  <span className="mt-2 block text-[15px] leading-6 text-muted">{place.summary}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stayArgs = {
    name: destination.name,
    start: input.start ?? "",
    end: input.end ?? "",
    travelers: input.travelers,
    rooms: plan?.rooms ?? 1,
  };

  const settings = <>
          <label className="block">
            <span className="label">Leaving from</span>
            <select
              className="field mt-2"
              value={input.originId}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  originId: event.target.value as PlanInput["originId"],
                  transport: destination.rail.some((option) => option.originId === event.target.value)
                    ? current.transport
                    : "flight",
                }))
              }
            >
              {origins.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4 grid gap-3">
            <label>
              <span className="label inline-flex items-center gap-1">
                <Calendar size={18} strokeWidth={1.5} aria-hidden="true" />
                Depart
              </span>
              <input className="field mt-2" type="date" value={input.start ?? ""} onChange={(event) => setDate("start", event.target.value)} />
            </label>
            <label>
              <span className="label">Return</span>
              <input className="field mt-2" type="date" value={input.end ?? ""} onChange={(event) => setDate("end", event.target.value)} />
            </label>
          </div>

          <p className="label mt-4">Party</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {parties.map((party) => (
              <button
                key={party}
                type="button"
                className={`chip ${input.party === party ? "is-on" : ""}`}
                aria-pressed={input.party === party}
                onClick={() =>
                  setInput((current) => ({
                    ...current,
                    party,
                    travelers: partyTravelers(party, current.travelers),
                  }))
                }
              >
                {PARTY_LABEL[party]}
              </button>
            ))}
          </div>
          <label className="mt-4 block">
            <span className="label">Travelers</span>
            <input
              className="field mt-2"
              type="number"
              min={1}
              max={9}
              value={input.travelers}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  travelers: Math.min(9, Math.max(1, Number(event.target.value) || 1)),
                }))
              }
            />
          </label>

          <label className="mt-4 block">
            <span className="label">Budget {inr(input.budget)}</span>
            <input
              className="mt-3 w-full"
              type="range"
              min={400}
              max={12000}
              step={50}
              value={input.budget}
              onChange={(event) => setInput((current) => ({ ...current, budget: Number(event.target.value) }))}
            />
          </label>

          <p className="label mt-4">Interests</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {interestOrder.map((interest) => (
              <button
                key={interest}
                type="button"
                className={`chip ${input.interests.includes(interest) ? "is-on" : ""}`}
                aria-pressed={input.interests.includes(interest)}
                onClick={() =>
                  setInput((current) => ({
                    ...current,
                    interests: current.interests.includes(interest)
                      ? current.interests.filter((item) => item !== interest)
                      : [...current.interests, interest],
                  }))
                }
              >
                {INTEREST_LABEL[interest]}
              </button>
            ))}
          </div>

          <p className="label mt-4">Pace</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {paces.map((pace) => (
              <button
                key={pace}
                type="button"
                className={`chip ${input.pace === pace ? "is-on" : ""}`}
                aria-pressed={input.pace === pace}
                onClick={() => setInput((current) => ({ ...current, pace }))}
              >
                {PACE_LABEL[pace]}
              </button>
            ))}
          </div>

          <p className="label mt-6">If money gets tight</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(["keep-stay", "keep-days"] as Strategy[]).map((strategy) => (
              <button
                key={strategy}
                type="button"
                className={`chip ${input.strategy === strategy ? "is-on" : ""}`}
                aria-pressed={input.strategy === strategy}
                onClick={() => setInput((current) => ({ ...current, strategy }))}
              >
                {STRATEGY_LABEL[strategy]}
              </button>
            ))}
          </div>
          <p className="mt-3 leading-6">{STRATEGY_NOTE[input.strategy]}</p>

          {flags.showRail && rail ? (
            <div className="mt-4">
              <p className="label">Getting there</p>
              <div className="mt-2 flex gap-2">
                {(["flight", "rail"] as Transport[]).map((transport) => (
                  <button
                    key={transport}
                    type="button"
                    className={`chip ${input.transport === transport ? "is-on" : ""}`}
                    aria-pressed={input.transport === transport}
                    onClick={() => setInput((current) => ({ ...current, transport }))}
                  >
                    {transport === "flight" ? "Flight" : "Train"}
                  </button>
                ))}
              </div>
              {input.transport === "rail" ? <p className="mt-2">{rail.note}</p> : null}
            </div>
          ) : null}
          {input.transport === "rail" && !rail ? <p className="mt-4">{copy.railFallback}</p> : null}
  </>;

  return (
    <div className="pb-28 lg:pb-16">
      <div className="relative">
        <div className="media relative h-[26vh] min-h-[180px] max-h-[280px] rounded-none">
          <PlaceImage
            src={destination.photo}
            alt={destination.photoAlt}
            position={destination.photoPosition}
            sizes="100vw"
            eager
          />
          <div className="scrim absolute inset-0" />
        </div>
        <div className="wrap">
          <div className="card relative z-10 -mt-16 max-w-xl px-5 py-5 sm:-mt-20 sm:px-6">
            <p className="label">{destination.country} · Itinerary</p>
            <h1 className="title mt-2">{destination.name}</h1>
            {input.start && input.end ? <p className="mt-3">{formatRange(input.start, input.end)}</p> : null}
            <p className="mt-3 max-w-[46ch] leading-7">{plan ? `Estimated total for ${input.travelers} · ${inr(plan.total)} USD · from ${origin.name}` : destination.go}</p>
          </div>
        </div>
      </div>

      <div className="wrap pt-6">
        <details className="card no-print p-4" open={initialQuery ? true : undefined}>
          <summary className="font-semibold">Ask about this trip or change the plan</summary>
          <TripChat turns={turns} onSend={handleChat} suggestions={false} />
        </details>
      </div>
      <div className="wrap grid gap-8 py-10 lg:grid-cols-[280px_minmax(0,1fr)_300px] lg:gap-10">
        <details className={plan ? "card no-print hidden h-fit p-5 lg:block" : "card no-print h-fit p-5"} open={!input.start || !input.end ? true : undefined}>
          <summary className="mb-4 font-semibold">Trip settings</summary>
          {settings}
        </details>

        <section className="space-y-4">
          <h2 className="title-sm">Your itinerary</h2>
          {plan && input.pinnedActivityIds.some(id => !plannedActivities.some(activity => activity.id === id)) && <p className="tile p-4" role="status">A selected experience does not fit the current budget or day capacity. Add days, adjust the budget, or remove another experience.</p>}
          {flags.showSeasonNudge && season ? (
            <div className="tile p-4">
              <p className="inline-flex items-start gap-2">
                <CloudSun size={18} strokeWidth={1.5} aria-hidden="true" className="mt-1 shrink-0" />
                <span>{dateNudge(season.suggestedLabel)}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {season.suggestedMonths.map((item) => (
                  <button key={item} type="button" className="chip" onClick={() => jumpMonth(item)}>
                    Try {monthName(item)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {flags.showSeasonWarning && season ? (
            <div className="card p-4">
              <p>{seasonWarning(season.reason, season.suggestedLabel)}</p>
              <p className="label mt-2">{copy.seasonKeep}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {season.suggestedMonths.map((item) => (
                  <button key={item} type="button" className="chip" onClick={() => jumpMonth(item)}>
                    Try {monthName(item)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {flags.showCoach && plan?.coach ? (
            <div className="card p-4">
              <p>{plan.coach.detail}</p>
              {plan.coach.actionable ? (
                <button type="button" className="btn btn-primary mt-3" onClick={() => setInput((current) => applyCoach(current, plan.coach!))}>
                  Apply
                </button>
              ) : null}
            </div>
          ) : null}

          {flags.showShortfall && plan ? (
            <div className="tile p-4">
              <p className="title-sm">
                {inr(plan.shortfall)} {copy.gap}
              </p>
              <p className="mt-2">{destination.skip}</p>
            </div>
          ) : null}

          {previousDay?.after === input && <button type="button" className="chip" onClick={() => {
            setInput(previousDay.before);
            setPreviousDay(null);
          }}>Undo shorter day</button>}
          {flags.showDays && plan
            ? plan.days.map((day, dayIndex) => {
                const fill = Math.min(100, Math.round((day.activities.length / Math.max(1, day.capacity)) * 100));
                return (
                  <article
                    key={day.date}
                    className="day-card card print-sheet p-4"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const activityId = event.dataTransfer.getData("text/plain");
                      if (activityId) setInput((current) => moveToDay(current, plan, activityId, dayIndex));
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="font-[560]">{formatDay(day.date)}</h2>
                      <p className="label">{day.area ?? "Open"}</p>
                    </div>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                      <div className="h-full bg-fg" style={{ width: `${fill}%` }} />
                    </div>
                    <div className="mt-3 space-y-2">
                      {day.activities.length === 0 ? <p className="label">Nothing on this day.</p> : null}
                      {day.activities.map((item) => (
                        <div
                          key={item.activity.id}
                          className="tile p-3"
                          draggable
                          onDragStart={(event) => event.dataTransfer.setData("text/plain", item.activity.id)}
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="font-[560]">{item.activity.name}</p>
                            <p className="figure">{item.cost === 0 ? "Free" : inr(item.cost)}</p>
                          </div>
                          <p className="label mt-1">
                            {input.pinnedActivityIds.includes(item.activity.id) ? "Your pick · " : ""}{item.activity.time} · {item.activity.area}
                          </p>
                          <p className="mt-2">{item.activity.blurb}</p>
                          <div className="day-actions mt-3 flex flex-wrap gap-2">
                            <button type="button" className="chip" onClick={() => setInput((current) => moveActivity(current, plan, item.activity.id, -1))}>
                              Move earlier
                            </button>
                            <button type="button" className="chip" onClick={() => setInput((current) => moveActivity(current, plan, item.activity.id, 1))}>
                              Move later
                            </button>
                            <button
                              type="button"
                              className={`chip ${selected === item.activity.id ? "is-on" : ""}`}
                              aria-pressed={selected === item.activity.id}
                              onClick={() => setSelected((current) => (current === item.activity.id ? null : item.activity.id))}
                            >
                              Swap
                            </button>
                            <button type="button" className="chip" onClick={() => {
                              setInput((current) => removeActivity(current, item.activity.id));
                              setSelected((current) => (current === item.activity.id ? null : current));
                            }}>
                              {copy.remove}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <ShorterDay input={input} plan={plan} place={destination} index={dayIndex} apply={(after) => {
                      setPreviousDay({ before: input, after });
                      setInput(after);
                    }} />
                    {dayIndex === foodDay ? <p className="mt-3">{destination.eat}</p> : null}
                  </article>
                );
              })
            : null}

          {selected && flags.showDays ? (
            <div className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="title-sm">{copy.swapTitle}</h2>
                <button type="button" className="chip" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
              {swaps.length === 0 ? <p className="mt-3">{copy.noSwaps}</p> : null}
              <div className="mt-3 space-y-2">
                {swaps.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    className="tile block w-full p-3 text-left"
                    onClick={() => {
                      setInput((current) => swapInPlan(current, plan!, selected, activity.id));
                      setSelected(activity.id);
                    }}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-[560]">{activity.name}</span>
                      <span className="figure">{activity.cost === 0 ? "Free" : inr(activity.cost * input.travelers)}</span>
                    </span>
                    <span className="label mt-1 block">{activity.area}</span>
                    <span className="mt-2 block">{activity.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {flags.showReadiness ? (
            <p className="badge h-auto px-4 py-2 text-[14px]">
              {summary.total - summary.done === 0
                ? "Ready to go"
                : `${summary.total - summary.done} of ${summary.total} still open`}
            </p>
          ) : null}

          {flags.showVisa ? (
            <p className="tile p-4">{destination.visa}</p>
          ) : null}

          {flags.showPacking ? (
            <section className="card p-4">
              <h2 className="title-sm">{copy.beforeYouGo}</h2>
              <p className="mt-2 max-w-[62ch]">{destination.skip}</p>
              {foodDay < 0 ? <p className="mt-2 max-w-[62ch]">{destination.eat}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {(["flights", "stay"] as const).map((key) => (
                  <label key={key} className="chip">
                    <input type="checkbox" checked={readiness[key]} onChange={() => setReadiness((current) => ({ ...current, [key]: !current[key] }))} />
                    {key === "flights" ? "Transport booked" : "Stay booked"}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-sm text-muted">Mark these only after you receive confirmation from the provider. Opening a booking link does not reserve anything.</p>
              <ul className="mt-4 space-y-2">
                {packing.map((item) => (
                  <li key={item}>
                    <label className="tile flex items-start gap-3 px-3 py-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={Boolean(readiness.packing[item])}
                        onChange={() =>
                          setReadiness((current) => ({
                            ...current,
                            packing: { ...current.packing, [item]: !current.packing[item] },
                          }))
                        }
                      />
                      <span>{item}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {flags.showOutboundPrep ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-quiet" onClick={() => open(ids.insurance)}>
                    {copy.insurance}
                  </button>
                  <button type="button" className="btn btn-quiet" onClick={() => open(ids.esim)}>
                    {copy.esim}
                  </button>
                  <button type="button" className="btn btn-quiet" onClick={() => open(ids.forex)}>
                    {copy.forex}
                  </button>
                  <label className="chip">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={readiness.visa}
                      onChange={() => setReadiness((current) => ({ ...current, visa: !current.visa }))}
                    />
                    {copy.markVisa}
                  </label>
                </div>
              ) : null}
            </section>
          ) : null}

          <div className="no-print flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={save}>
              {savedId ? copy.update : copy.save}
            </button>
            <button type="button" className="btn btn-quiet" onClick={share}>
              {copy.share}
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => window.print()}>
              {copy.print}
            </button>
            <Link href="/explore" className="btn btn-quiet">
              {copy.explore}
            </Link>
          </div>
          {notice ? (
            <p className="label" role="status">
              {notice}
            </p>
          ) : null}
        </section>

        <aside className="hidden lg:block">
          <CostPanel
            input={input}
            plan={plan}
            destinationName={destination.name}
            originName={origin.name}
            originAirport={origin.airport}
            destinationAirport={destination.airport}
            flagsShowBook={flags.showBook}
            onTier={(tier) => setInput((current) => ({ ...current, tier }))}
            onOpen={open}
            stayArgs={stayArgs}
            rail={rail}
            ids={ids}
          />
        </aside>
      </div>

      {plan ? (
        <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-white/50 lg:hidden">
          <div className="card flex items-center justify-between gap-4 rounded-none border-x-0 border-b-0 px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-8">
            <div>
              <p className="figure text-[16px]">{inr(plan.total)}</p>
              <p className="label">
                {inr(plan.perPerson)} {copy.each}
              </p>
            </div>
            <button type="button" className="editorial-link" onClick={() => openSheet("edit")}>Edit trip</button>
            <button type="button" className="btn btn-primary" onClick={() => openSheet("cost")}>
              {copy.costDetails}
            </button>
          </div>
        </div>
      ) : null}

      {plan && <dialog ref={sheet} className="trip-sheet no-print" aria-label={sheetKind === "cost" ? "Estimated costs" : "Edit trip"}>
        <button type="button" className="btn btn-quiet mb-4" onClick={() => sheet.current?.close()}>Close</button>
        {sheetKind === "edit" ? settings : (
            <CostPanel
              plain
              input={input}
              plan={plan}
              destinationName={destination.name}
              originName={origin.name}
              originAirport={origin.airport}
              destinationAirport={destination.airport}
              flagsShowBook={flags.showBook}
              onTier={(tier) => setInput((current) => ({ ...current, tier }))}
              onOpen={open}
              stayArgs={stayArgs}
              rail={rail}
              ids={ids}
            />
        )}
      </dialog>}
    </div>
  );
}

function LineIcon({ id, label }: { id: string; label: string }) {
  const common = { size: 18, strokeWidth: 1.5, "aria-hidden": true as const };
  if (id === "travel" && label === "Train") return <TrainFront {...common} />;
  if (id === "travel") return <Plane {...common} />;
  if (id === "stay") return <Bed {...common} />;
  if (id === "food") return <Utensils {...common} />;
  if (id === "local") return null;
  return <Ticket {...common} />;
}

function CostPanel({
  plain = false,
  input,
  plan,
  destinationName,
  originName,
  originAirport,
  destinationAirport,
  flagsShowBook,
  onTier,
  onOpen,
  stayArgs,
  rail,
  ids,
}: {
  plain?: boolean;
  input: PlanInput;
  plan: ReturnType<typeof buildPlan> | null;
  destinationName: string;
  originName: string;
  originAirport: string;
  destinationAirport: string;
  flagsShowBook: boolean;
  onTier: (tier: HotelTier | "auto") => void;
  onOpen: (url: string) => void;
  stayArgs: { name: string; start: string; end: string; travelers: number; rooms: number };
  rail: { note: string; fromCode: string; toCode: string; originId: PlanInput["originId"]; cost: number } | null;
  ids: ReturnType<typeof affiliateIds>;
}) {
  return (
    <div className={plain ? "" : "card sticky top-[calc(var(--header-h)+16px)] p-4"}>
      <h2 className="title-sm">Cost</h2>
      {plan ? (
        <>
          <ul className="mt-4 space-y-2">
            {plan.lines.map((line) => (
              <li key={line.id} className="tile flex items-center justify-between gap-3 px-3 py-2">
                <span className="inline-flex items-center gap-2">
                  <LineIcon id={line.id} label={line.label} />
                  <span>{line.label}</span>
                </span>
                <span className="figure">{inr(line.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="figure mt-4 text-[20px]">{inr(plan.total)}</p>
          <p className="label">
            {inr(plan.perPerson)} {copy.each} · {plan.nights} {copy.nights} · {plan.rooms} {plan.rooms === 1 ? "room" : "rooms"}
          </p>
          <p className="mt-2">
            {plan.remaining >= 0 ? `${inr(plan.remaining)} ${copy.stillOpen}` : `${inr(Math.abs(plan.remaining))} ${copy.gap}`}
          </p>
        </>
      ) : (
        <p className="mt-3">{copy.pickDates}</p>
      )}

      <p className="label mt-4">Stay</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {tiers.map((tier) => (
          <button
            key={tier}
            type="button"
            className={`chip ${input.tier === tier ? "is-on" : ""}`}
            aria-pressed={input.tier === tier}
            onClick={() => onTier(tier)}
          >
            {tier === "auto" ? "Auto" : TIER_LABEL[tier]}
          </button>
        ))}
      </div>
      {input.tier !== "auto" ? <p className="label mt-2">{TIER_NOTE[input.tier]}</p> : null}

      {flagsShowBook && input.start && input.end ? (
        <div className="stack-actions no-print mt-4 grid gap-2">
          {originAirport !== destinationAirport ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                onOpen(
                  flightLink(
                    {
                      originAirport,
                      destinationAirport,
                      originName,
                      destinationName,
                      start: input.start,
                      end: input.end,
                      travelers: input.travelers,
                    },
                    ids,
                  ),
                )
              }
            >
              {copy.bookFlight}
            </button>
          ) : null}
          {rail ? (
            <button type="button" className="btn btn-quiet" onClick={() => onOpen(railLink(rail, ids.rail))}>
              {copy.seeTrains}
            </button>
          ) : null}
          <button type="button" className="btn btn-quiet" onClick={() => onOpen(bookingLink(stayArgs, ids.booking))}>
            {copy.bookStay}
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => onOpen(agodaLink(stayArgs, ids.agoda))}>
            {copy.bookAgoda}
          </button>
          {plan?.days
            .flatMap((day) => day.activities)
            .filter((item) => item.activity.cost > 0)
            .slice(0, 3)
            .map((item) => (
              <button
                key={item.activity.id}
                type="button"
                className="btn btn-quiet"
                onClick={() => onOpen(activityLink(item.activity.name, destinationName, ids.klook))}
              >
                {item.activity.name}
              </button>
            ))}
        </div>
      ) : null}
      <p className="label mt-4">{copy.estimateNote}</p>
    </div>
  );
}
