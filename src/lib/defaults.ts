import type { PlanInput, Readiness } from "@/lib/types";

export function emptyInput(): PlanInput {
  return {
    originId: "lon",
    destinationSlug: "",
    start: null,
    end: null,
    party: "couple",
    travelers: 2,
    budget: 3200,
    interests: [],
    pace: "balanced",
    strategy: "keep-stay",
    transport: "flight",
    tier: "auto",
    excludedActivityIds: [],
    pinnedActivityIds: [],
    dayPlan: [],
  };
}

export function emptyReadiness(): Readiness {
  return {
    flights: false,
    stay: false,
    visa: false,
    packing: {},
  };
}
