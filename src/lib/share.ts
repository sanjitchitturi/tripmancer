import { emptyInput } from "@/lib/defaults";
import { ORIGIN_IDS, type HotelTier, type Interest, type Pace, type Party, type PlanInput, type Strategy, type Transport } from "@/lib/types";

const PARTIES = new Set<Party>(["solo", "couple", "family", "friends"]);
const PACES = new Set<Pace>(["relaxed", "balanced", "packed"]);
const STRATEGIES = new Set<Strategy>(["keep-stay", "keep-days"]);
const TRANSPORTS = new Set<Transport>(["flight", "rail"]);
const TIERS = new Set<HotelTier | "auto">(["budget", "comfort", "premium", "auto"]);
const INTEREST_SET = new Set<Interest>(["food", "culture", "adventure", "nature", "relax", "nightlife", "family"]);

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function sanitizeInput(value: unknown): PlanInput | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<PlanInput>;
  const base = emptyInput();
  const knownOrigin = ORIGIN_IDS.includes(raw.originId as (typeof ORIGIN_IDS)[number]);
  const originId = knownOrigin ? raw.originId! : base.originId;
  const party = PARTIES.has(raw.party as Party) ? (raw.party as Party) : base.party;
  const travelers = Math.min(9, Math.max(1, Number(raw.travelers) || base.travelers));
  let budget = Number(raw.budget);
  if (!Number.isFinite(budget) || budget <= 0) budget = base.budget;
  if (!knownOrigin && budget > 12000) budget = Math.round(budget / 80);
  budget = Math.min(50000, Math.max(80, Math.round(budget)));
  const interests = Array.isArray(raw.interests)
    ? raw.interests.filter((item): item is Interest => INTEREST_SET.has(item as Interest))
    : [];
  const dayPlan = Array.isArray(raw.dayPlan)
    ? raw.dayPlan.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const dayIndex = Number((item as { dayIndex?: unknown }).dayIndex);
        const activityId = asString((item as { activityId?: unknown }).activityId);
        if (!activityId || !Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 40) return [];
        return [{ dayIndex, activityId }];
      })
    : [];
  const ids = (list: unknown) =>
    Array.isArray(list) ? list.filter((item): item is string => typeof item === "string").slice(0, 40) : [];

  return {
    originId,
    destinationSlug: asString(raw.destinationSlug) ?? "",
    start: asString(raw.start),
    end: asString(raw.end),
    party,
    travelers,
    budget,
    interests,
    pace: PACES.has(raw.pace as Pace) ? (raw.pace as Pace) : base.pace,
    strategy: STRATEGIES.has(raw.strategy as Strategy) ? (raw.strategy as Strategy) : base.strategy,
    transport: TRANSPORTS.has(raw.transport as Transport) ? (raw.transport as Transport) : base.transport,
    tier: TIERS.has(raw.tier as HotelTier | "auto") ? (raw.tier as HotelTier | "auto") : "auto",
    excludedActivityIds: ids(raw.excludedActivityIds),
    pinnedActivityIds: ids(raw.pinnedActivityIds),
    dayPlan,
  };
}

export function encodePlan(input: PlanInput): string {
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

export function decodePlan(value: string): PlanInput | null {
  try {
    const padded = value.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return sanitizeInput(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}
