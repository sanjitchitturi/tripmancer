import type { Activity, Destination, Readiness } from "@/lib/types";

export function packingList(
  destination: Destination,
  month: number | null,
  activities: Activity[],
  border = false,
): string[] {
  const items = [...destination.packing];
  const blob = activities.map((activity) => `${activity.name} ${activity.interests.join(" ")}`).join(" ").toLowerCase();
  const wet = /rain|monsoon|flood|wet|rough/i.test(destination.poorReason);
  if (month && destination.poorMonths.includes(month) && wet && !items.some((item) => /rain/i.test(item))) {
    items.push("A light rain jacket");
  }
  if (/adventure|hike|raft|trek|surf|waterfall/.test(blob) && !items.some((item) => /shoes/i.test(item))) {
    items.push("Shoes with a grip");
  }
  if (/swim|beach|surf/.test(blob) && !items.some((item) => /swim/i.test(item))) {
    items.push("Swim clothes");
  }
  if (border) {
    items.push("Passport");
    items.push("The entry rule for your passport, saved offline");
  }
  return items;
}

export function readinessSummary(
  requiredPacking: string[],
  readiness: Readiness,
  border = false,
): { done: number; total: number } {
  const keys = ["flights", "stay", "packing"] as const;
  let done = 0;
  if (readiness.flights) done += 1;
  if (readiness.stay) done += 1;
  const packingDone = requiredPacking.length > 0 && requiredPacking.every((item) => readiness.packing[item]);
  if (packingDone) done += 1;
  let total = keys.length;
  if (border) {
    total += 1;
    if (readiness.visa) done += 1;
  }
  return { done, total };
}
