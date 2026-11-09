"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/format";
import { shortenDay } from "@/lib/shorter-day";
import type { Destination, PlanInput, PlanResult } from "@/lib/types";

export function ShorterDay({ input, plan, place, index, apply }: {
  input: PlanInput; plan: PlanResult; place: Destination; index: number; apply: (value: PlanInput) => void;
}) {
  const day = plan.days[index];
  const [choice, setChoice] = useState("");
  const [hours, setHours] = useState(3);
  const anchor = day.activities.find((a) => a.activity.id === choice) ?? day.activities[0];
  if (day.activities.length < 2 || !anchor) return null;
  const preview = shortenDay(input, plan, place, index, hours, anchor.activity.id);
  return <details className="tile no-print mt-4 p-3">
    <summary className="font-semibold">Short on time? Rework this day</summary>
    <div className="mt-3 grid gap-3">
      <label>Stop to keep<select className="field mt-1" value={anchor.activity.id} onChange={(e) => setChoice(e.target.value)}>
        {day.activities.map(({ activity }) => <option key={activity.id} value={activity.id}>{activity.name}</option>)}</select></label>
      <label>Hours for activities<input className="field mt-1" type="number" min="1" max="24" value={hours || ""} onChange={(e) => setHours(Number(e.target.value))} /></label>
      <p className="label">Uses typical visit lengths. Allow extra time for transit and queues.</p>
      <div aria-live="polite">{preview ? preview.removed.length ? <>
        <p>Keep {preview.kept.map((a) => a.activity.name).join(", ")}.</p>
        <p className="mt-2 text-muted">Skip {preview.removed.map((a) => a.activity.name).join(", ")}. Free up {preview.hoursFreed} hours and {formatUsd(preview.saved)} for your group.</p>
      </> : "All of your stops fit." : `Allow at least ${anchor.activity.hours} hours for this stop and at most 24 hours for the day.`}</div>
      {preview && preview.removed.length > 0 && <button type="button" className="btn btn-quiet" onClick={() => apply(preview.input)}>Use shorter day</button>}
    </div>
  </details>;
}
