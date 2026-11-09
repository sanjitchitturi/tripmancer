import type { HotelTier, Party, Pace, Strategy } from "@/lib/types";

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function inr(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? "";
}

export function monthList(months: number[]): string {
  return months.map((month) => monthName(month)).join(", ");
}

export function shortMonthList(months: number[]): string {
  return months.map((month) => monthName(month).slice(0, 3)).join(", ");
}

export function parseIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const date = parseIso(iso);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

export function eachDate(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
    if (dates.length > 40) break;
  }
  return dates;
}

export function formatDay(iso: string): string {
  return parseIso(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatRange(start: string, end: string): string {
  const from = parseIso(start).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const to = parseIso(end).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${from} to ${to}`;
}

export function daysUntil(start: string, today = new Date()): number {
  const target = parseIso(start);
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - current.getTime()) / 86400000);
}

export function monthAnchor(month: number, today = new Date()): string {
  const monthIndex = month - 1;
  const todayIso = toIso(today);
  const firstThisYear = toIso(new Date(today.getFullYear(), monthIndex, 1));
  if (firstThisYear >= todayIso) return firstThisYear;
  const lastThisYear = toIso(new Date(today.getFullYear(), monthIndex + 1, 0));
  if (todayIso <= lastThisYear) return todayIso;
  return toIso(new Date(today.getFullYear() + 1, monthIndex, 1));
}

export function nightsBetween(start: string, end: string): number {
  return Math.max(0, eachDate(start, end).length - 1);
}

export function roomsFor(party: Party, travelers: number): number {
  const count = Math.max(1, travelers);
  if (party === "solo" || party === "couple") return 1;
  if (party === "family") return Math.ceil(count / 3);
  return Math.ceil(count / 2);
}

export function partyTravelers(party: Party, current: number): number {
  if (party === "solo") return 1;
  if (party === "couple") return 2;
  if (party === "family") return Math.max(current, 3);
  return Math.max(current, 3);
}

export const TIER_LABEL: Record<HotelTier, string> = {
  budget: "Budget",
  comfort: "Comfort",
  premium: "Premium",
};

export const TIER_NOTE: Record<HotelTier, string> = {
  budget: "A simple room",
  comfort: "A better bed and a quieter street",
  premium: "The expensive room",
};

export const PACE_LABEL: Record<Pace, string> = {
  relaxed: "Relaxed",
  balanced: "Balanced",
  packed: "Packed",
};

export const PARTY_LABEL: Record<Party, string> = {
  solo: "Solo",
  couple: "Couple",
  family: "Family",
  friends: "Friends",
};

export const STRATEGY_LABEL: Record<Strategy, string> = {
  "keep-stay": "Keep the stay",
  "keep-days": "Keep the days",
};

export const STRATEGY_NOTE: Record<Strategy, string> = {
  "keep-stay": "Cuts paid activities first",
  "keep-days": "Steps the hotel down first",
};

export const INTEREST_LABEL: Record<string, string> = {
  food: "Food",
  culture: "Culture",
  adventure: "Adventure",
  nature: "Nature",
  relax: "Quiet time",
  nightlife: "Nightlife",
  family: "Family",
};
