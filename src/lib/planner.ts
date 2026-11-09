import { getOrigin } from "@/data/destinations";
import { dropLine, surplusLine, switchLine, tierLine } from "@/content/copy";
import { eachDate, formatUsd, roomsFor, TIER_LABEL } from "@/lib/format";
import type {
  Activity,
  CoachMove,
  CostLine,
  Destination,
  HotelTier,
  Interest,
  PlanDay,
  PlanInput,
  PlanResult,
  TimeOfDay,
} from "@/lib/types";

const TIER_ORDER: HotelTier[] = ["premium", "comfort", "budget"];
const TIME_ORDER: Record<TimeOfDay, number> = { morning: 0, afternoon: 1, evening: 2 };

function interestScore(activity: Activity, interests: Interest[]): number {
  if (interests.length === 0) return 1;
  return activity.interests.filter((interest) => interests.includes(interest)).length * 3;
}

function byScore(interests: Interest[]) {
  return (a: Activity, b: Activity) => {
    const score = interestScore(b, interests) - interestScore(a, interests);
    if (score !== 0) return score;
    if (a.cost !== b.cost) return a.cost - b.cost;
    return a.id.localeCompare(b.id);
  };
}

function partyCost(activity: Activity, travelers: number): number {
  return activity.cost * travelers;
}

function eligible(activity: Activity, input: PlanInput): boolean {
  if (input.excludedActivityIds.includes(activity.id)) return false;
  if (input.party === "family" && activity.nightlife) return false;
  return true;
}

function dayLabel(index: number, count: number): PlanDay["label"] {
  if (count === 1) return "single";
  if (index === 0) return "arrival";
  if (index === count - 1) return "departure";
  return "full";
}

function capacityFor(label: PlanDay["label"], pace: PlanInput["pace"]): number {
  if (label !== "full") return 1;
  if (pace === "relaxed") return 2;
  if (pace === "balanced") return 3;
  return 4;
}

function stayCost(destination: Destination, tier: HotelTier, nights: number, rooms: number): number {
  return destination.stay[tier] * nights * rooms;
}

function sumActivities(activities: Activity[], travelers: number): number {
  return activities.reduce((total, activity) => total + partyCost(activity, travelers), 0);
}

function lowestPaid(activities: Activity[], interests: Interest[]): Activity | undefined {
  return [...activities]
    .filter((activity) => activity.cost > 0)
    .sort((a, b) => {
      const score = interestScore(a, interests) - interestScore(b, interests);
      if (score !== 0) return score;
      return b.cost - a.cost;
    })[0];
}

interface PickResult {
  picked: Activity[];
  cut: Activity[];
}

function pickActivities(input: PlanInput, pool: Activity[], slots: number, money: number): PickResult {
  const picked: Activity[] = [];
  const cut: Activity[] = [];
  let spent = 0;
  const pins = new Set(input.pinnedActivityIds);
  const score = byScore(input.interests);
  const ordered = [...pool].sort((a, b) => Number(pins.has(b.id)) - Number(pins.has(a.id)) || score(a, b));
  for (const activity of ordered) {
    const cost = partyCost(activity, input.travelers);
    const pinned = pins.has(activity.id);
    if (picked.length >= slots) {
      if (pinned) cut.push(activity);
      continue;
    }
    if (spent + cost > money && cost > 0) {
      cut.push(activity);
      continue;
    }
    picked.push(activity);
    spent += cost;
  }
  return { picked, cut };
}

interface DraftDay {
  date: string;
  label: PlanDay["label"];
  area: string | null;
  activities: Activity[];
  capacity: number;
}

function blankDays(dates: string[], pace: PlanInput["pace"]): DraftDay[] {
  return dates.map((date, index) => {
    const label = dayLabel(index, dates.length);
    return { date, label, area: null, activities: [], capacity: capacityFor(label, pace) };
  });
}

function pushActivity(day: DraftDay, activity: Activity) {
  day.activities.push(activity);
  if (!day.area) day.area = activity.area;
}

function placeAuto(days: DraftDay[], activities: Activity[], interests: Interest[]) {
  const groups = new Map<string, Activity[]>();
  for (const activity of [...activities].sort(byScore(interests))) {
    const list = groups.get(activity.area) ?? [];
    list.push(activity);
    groups.set(activity.area, list);
  }
  const areas = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  for (const [, list] of areas) {
    const queue = [...list];
    while (queue.length) {
      const activity = queue[0];
      const same = days
        .filter((day) => day.area === activity.area && day.activities.length < day.capacity)
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      if (same) {
        pushActivity(same, queue.shift()!);
        continue;
      }
      const empty = days
        .filter((day) => day.activities.length === 0)
        .sort((a, b) => {
          const gap = Math.abs(a.capacity - queue.length) - Math.abs(b.capacity - queue.length);
          if (gap !== 0) return gap;
          return a.date.localeCompare(b.date);
        })[0];
      if (empty) {
        pushActivity(empty, queue.shift()!);
        continue;
      }
      const room = days
        .filter((day) => day.activities.length < day.capacity)
        .sort((a, b) => b.capacity - b.activities.length - (a.capacity - a.activities.length) || a.date.localeCompare(b.date))[0];
      if (!room) throw new Error("No activity slot remains for the selected plan.");
      pushActivity(room, queue.shift()!);
    }
  }
}

function assignDays(input: PlanInput, selected: Activity[], dates: string[]): DraftDay[] {
  const days = blankDays(dates, input.pace);
  const byId = new Map(selected.map((activity) => [activity.id, activity]));
  if (input.dayPlan.length === 0) {
    placeAuto(days, selected, input.interests);
  } else {
    const placed = new Set<string>();
    for (const item of input.dayPlan) {
      const activity = byId.get(item.activityId);
      const day = days[item.dayIndex];
      if (!activity || !day || day.activities.length >= day.capacity || placed.has(activity.id)) continue;
      pushActivity(day, activity);
      placed.add(activity.id);
    }
    placeAuto(
      days,
      selected.filter((activity) => !placed.has(activity.id)),
      input.interests,
    );
  }
  if (input.dayPlan.length === 0) {
    for (const day of days) {
      day.activities.sort(
        (a, b) => TIME_ORDER[a.time] - TIME_ORDER[b.time] || a.id.localeCompare(b.id),
      );
    }
  }
  return days;
}

function toPlanDays(days: DraftDay[], travelers: number): PlanDay[] {
  return days.map((day) => ({
    date: day.date,
    label: day.label,
    area: day.activities.length ? (day.area ?? day.activities[0]?.area ?? null) : null,
    capacity: day.capacity,
    activities: day.activities.map((activity) => ({
      activity,
      cost: partyCost(activity, travelers),
    })),
  }));
}

function findCheaper(
  catalog: Destination[],
  input: PlanInput,
  nights: number,
  dayCount: number,
  rooms: number,
): string | null {
  let best: { slug: string; cost: number } | null = null;
  for (const place of catalog) {
    if (place.slug === input.destinationSlug) continue;
    const cost =
      place.flights[input.originId] * input.travelers +
      place.foodPerDay * input.travelers * dayCount +
      place.localPerDay * input.travelers * dayCount +
      place.stay.budget * nights * rooms;
    if (cost <= input.budget && (!best || cost < best.cost)) best = { slug: place.slug, cost };
  }
  return best?.slug ?? null;
}

function emptyResult(input: PlanInput): PlanResult {
  return {
    ok: false,
    shortfall: 0,
    cheaperSlug: null,
    nights: 0,
    days: [],
    lines: [],
    total: 0,
    perPerson: 0,
    remaining: input.budget,
    tier: "budget",
    transport: input.transport,
    rooms: roomsFor(input.party, input.travelers),
    travelAmount: 0,
    stayAmount: 0,
    cut: [],
    coach: null,
  };
}

export function buildPlan(
  input: PlanInput,
  destination: Destination,
  catalog: Destination[] = [],
): PlanResult {
  if (!input.start || !input.end) return emptyResult(input);
  const start = input.start <= input.end ? input.start : input.end;
  const end = input.start <= input.end ? input.end : input.start;
  const dates = eachDate(start, end);
  if (!dates.length) return emptyResult(input);

  const nights = Math.max(0, dates.length - 1);
  const rooms = roomsFor(input.party, input.travelers);
  const origin = getOrigin(input.originId);
  const rail = destination.rail.find((option) => option.originId === input.originId);
  const transport = input.transport === "rail" && rail ? "rail" : "flight";
  const travelAmount = (transport === "rail" && rail ? rail.cost : destination.flights[input.originId]) * input.travelers;
  const travelLabel =
    transport === "rail" ? "Train" : origin.airport === destination.airport ? "Travel" : "Flights";
  const food = destination.foodPerDay * input.travelers * dates.length;
  const local = destination.localPerDay * input.travelers * dates.length;
  const fixed = travelAmount + food + local;
  const pool = destination.activities.filter((activity) => eligible(activity, input));
  const slots = dates.reduce((total, _date, index) => total + capacityFor(dayLabel(index, dates.length), input.pace), 0);
  const cheaperSlug = findCheaper(catalog, input, nights, dates.length, rooms);
  const originName = origin.name;

  const shortfallResult = (tier: HotelTier, detail: string, coach: CoachMove | null): PlanResult => {
    const stayAmount = stayCost(destination, tier, nights, rooms);
    const total = fixed + stayAmount;
    const lines: CostLine[] = [
      { id: "travel", label: travelLabel, amount: travelAmount },
      { id: "stay", label: `Stay, ${TIER_LABEL[tier]}`, amount: stayAmount },
      { id: "food", label: "Food", amount: food },
      { id: "local", label: "Local transport", amount: local },
    ];
    return {
      ok: false,
      shortfall: Math.max(0, total - input.budget),
      cheaperSlug,
      nights,
      days: [],
      lines,
      total,
      perPerson: Math.round(total / Math.max(1, input.travelers)),
      remaining: input.budget - total,
      tier,
      transport,
      rooms,
      travelAmount,
      stayAmount,
      cut: [],
      coach: coach ?? {
        id: "gap",
        kind: "shorten",
        label: "Budget is short",
        detail,
        actionable: false,
      },
    };
  };

  const gapDetail = () => {
    const needed = fixed + stayCost(destination, "budget", nights, rooms);
    if (cheaperSlug) {
      const place = catalog.find((item) => item.slug === cheaperSlug);
      if (place) return switchLine(originName, formatUsd(travelAmount), place.name);
    }
    return `${travelLabel}, food, and a simple room come to ${formatUsd(needed)}. The budget is ${formatUsd(input.budget)}.`;
  };

  const shortfallCoach = (): CoachMove | null => {
    if (input.tier !== "auto") {
      const startAt = TIER_ORDER.indexOf(input.tier);
      for (const candidate of TIER_ORDER.slice(startAt + 1)) {
        if (fixed + stayCost(destination, candidate, nights, rooms) <= input.budget) {
          const freed = stayCost(destination, input.tier, nights, rooms) - stayCost(destination, candidate, nights, rooms);
          return {
            id: "tier",
            kind: "tier",
            tier: candidate,
            label: TIER_LABEL[candidate],
            detail: tierLine(TIER_LABEL[candidate], formatUsd(freed)),
            actionable: true,
          };
        }
      }
    }
    if (cheaperSlug) {
      const place = catalog.find((item) => item.slug === cheaperSlug);
      if (place) {
        return {
          id: "switch",
          kind: "switch",
          destinationSlug: cheaperSlug,
          label: place.name,
          detail: switchLine(originName, formatUsd(travelAmount), place.name),
          actionable: true,
        };
      }
    }
    if (nights > 2) {
      const saved =
        destination.stay.budget * rooms +
        destination.foodPerDay * input.travelers +
        destination.localPerDay * input.travelers;
      if (fixed + stayCost(destination, "budget", nights, rooms) - saved <= input.budget) {
        return {
          id: "shorten",
          kind: "shorten",
          label: "Drop one night",
          detail: `Drop one night. That frees ${formatUsd(saved)}.`,
          actionable: true,
        };
      }
    }
    return null;
  };

  let tier: HotelTier = "budget";
  let picked: Activity[] = [];
  let cut: Activity[] = [];

  if (input.strategy === "keep-stay" || input.tier !== "auto") {
    if (input.tier === "auto") {
      const fit = TIER_ORDER.find(
        (candidate) => fixed + stayCost(destination, candidate, nights, rooms) <= input.budget,
      );
      if (!fit) return shortfallResult("budget", gapDetail(), shortfallCoach());
      tier = fit;
    } else {
      tier = input.tier;
      if (fixed + stayCost(destination, tier, nights, rooms) > input.budget) {
        return shortfallResult(tier, gapDetail(), shortfallCoach());
      }
    }
    const selected = pickActivities(
      input,
      pool,
      slots,
      input.budget - fixed - stayCost(destination, tier, nights, rooms),
    );
    picked = selected.picked;
    cut = selected.cut;
  } else {
    const minStay = stayCost(destination, "budget", nights, rooms);
    if (fixed + minStay > input.budget) return shortfallResult("budget", gapDetail(), shortfallCoach());
    const selected = pickActivities(input, pool, slots, input.budget - fixed - minStay);
    picked = selected.picked;
    cut = selected.cut;
    let spent = sumActivities(picked, input.travelers);
    const choose = (): HotelTier | null =>
      TIER_ORDER.find(
        (candidate) => stayCost(destination, candidate, nights, rooms) <= input.budget - fixed - spent,
      ) ?? null;
    let chosen = choose();
    while (!chosen) {
      const drop = lowestPaid(picked, input.interests);
      if (!drop) break;
      picked = picked.filter((activity) => activity.id !== drop.id);
      cut = [...cut, drop];
      spent = sumActivities(picked, input.travelers);
      chosen = choose();
    }
    if (!chosen) return shortfallResult("budget", gapDetail(), shortfallCoach());
    tier = chosen;
  }

  const stayAmount = stayCost(destination, tier, nights, rooms);
  const activityTotal = sumActivities(picked, input.travelers);
  const total = fixed + stayAmount + activityTotal;
  if (total > input.budget) return shortfallResult(tier, gapDetail(), shortfallCoach());

  const days = toPlanDays(assignDays(input, picked, dates), input.travelers);
  const lines: CostLine[] = [
    { id: "travel", label: travelLabel, amount: travelAmount },
    { id: "stay", label: `Stay, ${TIER_LABEL[tier]}`, amount: stayAmount },
    { id: "food", label: "Food", amount: food },
    { id: "local", label: "Local transport", amount: local },
    ...picked.map((activity) => ({
      id: activity.id,
      label: activity.name,
      amount: partyCost(activity, input.travelers),
    })),
  ];

  const coach = successCoach({
    input,
    destination,
    pool,
    picked,
    cut,
    tier,
    nights,
    rooms,
    total,
  });

  return {
    ok: true,
    shortfall: 0,
    cheaperSlug,
    nights,
    days,
    lines,
    total,
    perPerson: Math.round(total / Math.max(1, input.travelers)),
    remaining: input.budget - total,
    tier,
    transport,
    rooms,
    travelAmount,
    stayAmount,
    cut,
    coach,
  };
}

function successCoach(args: {
  input: PlanInput;
  destination: Destination;
  pool: Activity[];
  picked: Activity[];
  cut: Activity[];
  tier: HotelTier;
  nights: number;
  rooms: number;
  total: number;
}): CoachMove | null {
  const { input, destination, pool, picked, cut, tier, nights, rooms, total } = args;
  const paidCuts = cut.filter((activity) => activity.cost > 0);
  if (paidCuts.length && input.strategy === "keep-days" && input.tier === "auto" && tier !== "budget") {
    const lower: HotelTier = tier === "premium" ? "comfort" : "budget";
    const freed =
      stayCost(destination, tier, nights, rooms) - stayCost(destination, lower, nights, rooms);
    if (freed > 0) {
      return {
        id: "tier",
        kind: "tier",
        tier: lower,
        label: TIER_LABEL[lower],
        detail: tierLine(TIER_LABEL[lower], formatUsd(freed)),
        actionable: true,
      };
    }
  }
  if (paidCuts.length) {
    const drop = lowestPaid(picked, input.interests);
    if (drop) {
      return {
        id: "drop",
        kind: "drop",
        activityId: drop.id,
        label: drop.name,
        detail: dropLine(drop.name, formatUsd(partyCost(drop, input.travelers))),
        actionable: true,
      };
    }
  }
  const room = input.budget - total;
  const pickedIds = new Set(picked.map((activity) => activity.id));
  const extra = [...pool]
    .filter((activity) => !pickedIds.has(activity.id) && partyCost(activity, input.travelers) <= room)
    .sort(byScore(input.interests))[0];
  if (extra && room >= 500) {
    return {
      id: "add",
      kind: "add",
      activityId: extra.id,
      label: extra.name,
      detail: surplusLine(formatUsd(room), extra.name, formatUsd(partyCost(extra, input.travelers))),
      actionable: true,
    };
  }
  return null;
}

export function swapOptions(
  input: PlanInput,
  destination: Destination,
  plan: PlanResult,
  activityId: string,
): Activity[] {
  const current = destination.activities.find((activity) => activity.id === activityId);
  if (!current || !plan.ok) return [];
  const inPlan = new Set(plan.days.flatMap((day) => day.activities.map((item) => item.activity.id)));
  const room = input.budget - (plan.total - current.cost * input.travelers);
  return destination.activities
    .filter((activity) => eligible(activity, input) && !inPlan.has(activity.id))
    .filter((activity) => partyCost(activity, input.travelers) <= room)
    .sort((a, b) => {
      const area = Number(a.area !== current.area) - Number(b.area !== current.area);
      if (area !== 0) return area;
      return byScore(input.interests)(a, b);
    });
}

export function layoutFrom(plan: PlanResult) {
  return plan.days.flatMap((day, dayIndex) =>
    day.activities.map((item) => ({ dayIndex, activityId: item.activity.id })),
  );
}
