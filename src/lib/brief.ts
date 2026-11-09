import type { BriefPatch, Destination, Interest, Origin, PlanInput } from "@/lib/types";
import { addDays, toIso } from "@/lib/format";

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const MONTH_INDEX: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const ORIGIN_ALIASES: Record<string, Origin["id"]> = {
  "new york": "nyc",
  nyc: "nyc",
  "new york city": "nyc",
  london: "lon",
  paris: "par",
  tokyo: "tyo",
  singapore: "sin",
  dubai: "dxb",
  sydney: "syd",
  "mexico city": "mex",
  cdmx: "mex",
};

const INTEREST_RULES: [RegExp, Interest][] = [
  [/food|eat|thali|cafe|restaurant/, "food"],
  [/beach|beaches|swim|relax|quiet|spa/, "relax"],
  [/\bnightlife\b|\bparty\b|\bclub\b/, "nightlife"],
  [/culture|temple|museum|fort|history/, "culture"],
  [/adventure|hike|raft|trek|surf/, "adventure"],
  [/nature|park|mountain|wildlife/, "nature"],
  [/family|kids|children/, "family"],
];

function readCount(raw: string): number | null {
  const word = NUMBER_WORDS[raw.toLowerCase()];
  if (word) return word;
  const value = Number(raw.replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

function monthStart(year: number, monthIndex: number, today: Date): string {
  const todayIso = toIso(today);
  const first = toIso(new Date(year, monthIndex, 1));
  if (first >= todayIso) return first;
  const last = toIso(new Date(year, monthIndex + 1, 0));
  if (todayIso <= last) return todayIso;
  return toIso(new Date(year + 1, monthIndex, 1));
}

export function parseBrief(
  text: string,
  places: Pick<Destination, "slug" | "name">[],
  originList: Origin[],
  today = new Date(),
): BriefPatch {
  const patch: BriefPatch = {};
  const normalized = text.trim().toLowerCase();
  if (!normalized) return patch;

  const originNames = [
    ...originList.map((origin) => origin.name.toLowerCase()),
    ...Object.keys(ORIGIN_ALIASES),
  ].sort((a, b) => b.length - a.length);
  let haystack = text;
  for (const name of originNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\bfrom\\s+${escaped}\\b`, "i");
    if (pattern.test(normalized)) {
      const id = ORIGIN_ALIASES[name] ?? originList.find((origin) => origin.name.toLowerCase() === name)?.id;
      if (id) {
        patch.originId = id;
        haystack = haystack.replace(pattern, " ");
      }
      break;
    }
  }

  const orderedPlaces = [...places].sort((a, b) => b.name.length - a.name.length);
  for (const place of orderedPlaces) {
    const name = place.name.toLowerCase();
    const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(haystack)) {
      patch.destinationSlug = place.slug;
      break;
    }
  }

  const budgetMatch =
    normalized.match(/(?:under|below|within|budget(?:\s+of)?)\s*[$₹]?\s*([\d][\d,]*)/) ??
    normalized.match(/[$₹]\s*([\d][\d,]*)/);
  if (budgetMatch) {
    const budget = Number(budgetMatch[1].replace(/,/g, ""));
    if (budget >= 50 && budget <= 50000) patch.budget = budget;
  }

  const family = normalized.match(/family\s+of\s+(\d+)/);
  const friends = normalized.match(/(\d+)\s+friends/);
  const people = normalized.match(/(\d+|two|three|four|five|six|seven|eight|nine|ten)\s+people/);
  if (/\bsolo\b|\balone\b/.test(normalized)) {
    patch.party = "solo";
    patch.travelers = 1;
  } else if (family) {
    patch.party = "family";
    patch.travelers = Math.min(9, Math.max(2, Number(family[1])));
  } else if (friends) {
    patch.party = "friends";
    patch.travelers = Math.min(9, Math.max(2, Number(friends[1])));
  } else if (/\bcouple\b/.test(normalized)) {
    patch.party = "couple";
    patch.travelers = 2;
  } else if (people) {
    const count = readCount(people[1]);
    if (count) {
      patch.travelers = Math.min(9, Math.max(1, count));
      patch.party = count <= 1 ? "solo" : count === 2 ? "couple" : "friends";
    }
  }

  const duration = normalized.match(
    /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(day|days|night|nights)/,
  );
  let length = 0;
  let unit: "day" | "night" | null = null;
  if (duration) {
    length = readCount(duration[1]) ?? 0;
    unit = duration[2].startsWith("night") ? "night" : "day";
  }

  let monthIndex: number | null = null;
  for (const [name, index] of Object.entries(MONTH_INDEX)) {
    if (new RegExp(`\\b${name}\\b`).test(normalized)) {
      monthIndex = index;
      break;
    }
  }

  if (length > 0) {
    const start =
      monthIndex === null
        ? toIso(today)
        : monthStart(today.getFullYear(), monthIndex, today);
    const span = unit === "night" ? length : Math.max(0, length - 1);
    patch.start = start;
    patch.end = addDays(start, span);
  } else if (monthIndex !== null) {
    patch.start = monthStart(today.getFullYear(), monthIndex, today);
  }

  const interests: Interest[] = [];
  for (const [pattern, interest] of INTEREST_RULES) {
    if (pattern.test(normalized) && !interests.includes(interest)) interests.push(interest);
  }
  if (interests.length) patch.interests = interests;

  return patch;
}

export function mergeBrief(current: PlanInput, patch: BriefPatch): PlanInput {
  const destinationChanged =
    patch.destinationSlug !== undefined && patch.destinationSlug !== current.destinationSlug;
  return {
    ...current,
    originId: patch.originId ?? current.originId,
    destinationSlug: patch.destinationSlug ?? current.destinationSlug,
    start: patch.start ?? current.start,
    end: patch.end ?? current.end,
    party: patch.party ?? current.party,
    travelers: patch.travelers ?? current.travelers,
    budget: patch.budget ?? current.budget,
    interests: patch.interests ?? current.interests,
    excludedActivityIds: destinationChanged ? [] : current.excludedActivityIds,
    pinnedActivityIds: destinationChanged ? [] : current.pinnedActivityIds,
    dayPlan: destinationChanged ? [] : current.dayPlan,
  };
}
