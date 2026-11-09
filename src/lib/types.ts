export const ORIGIN_IDS = ["nyc", "lon", "par", "tyo", "sin", "dxb", "syd", "mex"] as const;

export type OriginId = (typeof ORIGIN_IDS)[number];

export const REGIONS = ["europe", "asia", "americas", "africa", "middle-east"] as const;

export type Region = (typeof REGIONS)[number];

export const INTERESTS = [
  "food",
  "culture",
  "adventure",
  "nature",
  "relax",
  "nightlife",
  "family",
] as const;

export type Interest = (typeof INTERESTS)[number];

export type Pace = "relaxed" | "balanced" | "packed";
export type Party = "solo" | "couple" | "family" | "friends";
export type HotelTier = "budget" | "comfort" | "premium";
export type Strategy = "keep-stay" | "keep-days";
export type TimeOfDay = "morning" | "afternoon" | "evening";
export type Transport = "flight" | "rail";

export interface Origin {
  id: OriginId;
  name: string;
  airport: string;
  country: string;
}

export interface Activity {
  id: string;
  name: string;
  area: string;
  time: TimeOfDay;
  interests: Interest[];
  cost: number;
  hours: number;
  nightlife?: boolean;
  blurb: string;
}

export interface RailOption {
  originId: OriginId;
  cost: number;
  fromCode: string;
  toCode: string;
  note: string;
}

export interface Destination {
  slug: string;
  name: string;
  region: Region;
  country: string;
  vibe: string;
  summary: string;
  photo: string;
  photoAlt: string;
  photoPosition: string;
  goodMonths: number[];
  poorMonths: number[];
  poorReason: string;
  suggestedMonths: number[];
  visa: string | null;
  areas: string[];
  activities: Activity[];
  go: string;
  skip: string;
  eat: string;
  packing: string[];
  stay: Record<HotelTier, number>;
  foodPerDay: number;
  localPerDay: number;
  flights: Record<OriginId, number>;
  airport: string;
  rail: RailOption[];
}

export interface DayPlacement {
  dayIndex: number;
  activityId: string;
}

export interface PlanInput {
  originId: OriginId;
  destinationSlug: string;
  start: string | null;
  end: string | null;
  party: Party;
  travelers: number;
  budget: number;
  interests: Interest[];
  pace: Pace;
  strategy: Strategy;
  transport: Transport;
  tier: HotelTier | "auto";
  excludedActivityIds: string[];
  pinnedActivityIds: string[];
  dayPlan: DayPlacement[];
}

export interface PlannedActivity {
  activity: Activity;
  cost: number;
}

export interface PlanDay {
  date: string;
  label: "arrival" | "full" | "departure" | "single";
  area: string | null;
  activities: PlannedActivity[];
  capacity: number;
}

export interface CostLine {
  id: string;
  label: string;
  amount: number;
}

export interface CoachMove {
  id: string;
  kind: "drop" | "tier" | "add" | "switch" | "shorten";
  label: string;
  detail: string;
  actionable: boolean;
  activityId?: string;
  tier?: HotelTier;
  destinationSlug?: string;
}

export interface PlanResult {
  ok: boolean;
  shortfall: number;
  cheaperSlug: string | null;
  nights: number;
  days: PlanDay[];
  lines: CostLine[];
  total: number;
  perPerson: number;
  remaining: number;
  tier: HotelTier;
  transport: Transport;
  rooms: number;
  travelAmount: number;
  stayAmount: number;
  cut: Activity[];
  coach: CoachMove | null;
}

export interface BriefPatch {
  originId?: OriginId;
  destinationSlug?: string;
  start?: string;
  end?: string;
  party?: Party;
  travelers?: number;
  budget?: number;
  interests?: Interest[];
}

export interface Readiness {
  flights: boolean;
  stay: boolean;
  visa: boolean;
  packing: Record<string, boolean>;
}

export interface SavedTrip {
  id: string;
  savedAt: string;
  input: PlanInput;
  readiness: Readiness;
}
