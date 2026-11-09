import type { Destination, PlanInput, PlanResult } from "@/lib/types";

// Keep a traveler's chosen stop, then fit other stops into the remaining activity
// time. Whole stops only. Prefer expressed interests, then stop count, then cost.
export function shortenDay(input: PlanInput, plan: PlanResult, place: Destination, index: number, hours: number, keep: string) {
  const day = plan.days[index];
  const anchor = day?.activities.find((item) => item.activity.id === keep);
  if (!day || !anchor || !Number.isFinite(hours) || hours < anchor.activity.hours || hours > 24) return null;
  const available = Math.floor((hours - anchor.activity.hours) * 60);
  type Choice = { ids: string[]; score: number; cost: number };
  const best: (Choice | undefined)[] = Array(available + 1);
  best[0] = { ids: [], score: 0, cost: 0 };
  const better = (a: Choice, b?: Choice) => !b || a.score > b.score ||
    (a.score === b.score && (a.ids.length > b.ids.length || (a.ids.length === b.ids.length && a.cost < b.cost)));
  for (const { activity, cost } of day.activities) {
    if (activity.id === keep) continue;
    const minutes = Math.ceil(activity.hours * 60);
    for (let t = available; t >= minutes; t--) {
      const previous = best[t - minutes];
      if (!previous) continue;
      const candidate = {
        ids: [...previous.ids, activity.id], cost: previous.cost + cost,
        score: previous.score + activity.interests.filter((tag) => input.interests.includes(tag)).length,
      };
      if (better(candidate, best[t])) best[t] = candidate;
    }
  }
  let winner = best[0]!;
  for (const choice of best) if (choice && better(choice, winner)) winner = choice;
  const kept = new Set([keep, ...winner.ids]);
  const removed = day.activities.filter(({ activity }) => !kept.has(activity.id));
  const layout = plan.days.flatMap((entry, dayIndex) => entry.activities
    .filter(({ activity }) => index !== dayIndex || kept.has(activity.id))
    .map(({ activity }) => ({ dayIndex, activityId: activity.id })));
  const included = new Set(layout.map((item) => item.activityId));
  const next: PlanInput = {
    ...input, tier: plan.tier, dayPlan: layout,
    pinnedActivityIds: [...new Set([...input.pinnedActivityIds.filter((id) => included.has(id)), keep])],
    // Freeze the visible itinerary so the planner cannot refill the time just freed.
    excludedActivityIds: place.activities.filter((activity) => !included.has(activity.id)).map((activity) => activity.id),
  };
  return { input: next, removed, kept: day.activities.filter((item) => kept.has(item.activity.id)),
    hoursFreed: removed.reduce((n, item) => n + item.activity.hours, 0),
    saved: removed.reduce((n, item) => n + item.cost, 0) };
}
