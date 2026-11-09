import { destinations, getOrigin } from "@/data/destinations";
import { emptyInput } from "@/lib/defaults";
import { addDays } from "@/lib/format";
import { buildPlan } from "@/lib/planner";
import type { Activity, Destination, OriginId, PlanInput } from "@/lib/types";

const stopWords = new Set("and the with for from like want trip where would could can some that this near around before after one just day about have take there what find".split(" "));

function terms(text: string) {
  return (text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().match(/[a-z]+/g) ?? [])
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .map((word) => word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word);
}

// Field-weighted TF-IDF. Fit the document frequencies once on the bundled catalog.
const documents = destinations.flatMap((place) => place.activities.map((activity) => {
  const weights = new Map<string, number>();
  for (const [field, weight] of [
    [activity.name, 4], [activity.interests.join(" "), 2], [activity.area, 2], [activity.blurb, 1],
  ] as const) {
    for (const term of new Set(terms(field))) weights.set(term, (weights.get(term) ?? 0) + weight);
  }
  return { activity, place, weights };
}));
const frequency = new Map<string, number>();
for (const { weights } of documents) {
  for (const term of weights.keys()) frequency.set(term, (frequency.get(term) ?? 0) + 1);
}

export interface DiscoveryBrief {
  query: string;
  originId: OriginId;
  start: string;
  nights: number;
  travelers: number;
  budget: number;
}

export interface DiscoveryMatch {
  place: Destination;
  activity: Activity;
  input: PlanInput;
  total: number;
  date: string;
}

export function discover(brief: DiscoveryBrief) {
  const query = [...new Set(terms(brief.query.slice(0, 200)))];
  const departure = getOrigin(brief.originId);
  const ranked = documents.map((doc) => {
    const score = query.reduce((sum, term) => {
      const weight = doc.weights.get(term) ?? 0;
      return sum + weight * Math.log(1 + documents.length / (frequency.get(term) ?? 1));
    }, 0);
    return { ...doc, score };
  }).filter((doc) => doc.score > 0 && doc.place.name !== departure.name)
    .sort((a, b) => b.score - a.score || a.activity.cost - b.activity.cost);
  const matches: DiscoveryMatch[] = [];
  for (const { place, activity } of ranked) {
    if (matches.some((match) => match.place === place)) continue;
    const input: PlanInput = {
      ...emptyInput(), originId: brief.originId, destinationSlug: place.slug, start: brief.start,
      end: addDays(brief.start, brief.nights), travelers: brief.travelers,
      party: brief.travelers === 1 ? "solo" : brief.travelers === 2 ? "couple" : "friends",
      budget: brief.budget, interests: activity.interests, strategy: "keep-days", pinnedActivityIds: [activity.id],
    };
    const plan = buildPlan(input, place);
    const day = plan.days.find((entry) => entry.activities.some((item) => item.activity.id === activity.id));
    if (plan.ok && day) matches.push({ place, activity, input, total: plan.total, date: day.date });
  }
  return { matches, hasActivity: ranked.length > 0 };
}
