import { describe, expect, it } from "vitest";
import { buildPlan } from "@/lib/planner";
import { emptyInput } from "@/lib/defaults";
import type { Activity, Destination, OriginId, PlanInput } from "@/lib/types";

function flightMap(amount: number): Record<OriginId, number> {
  return { nyc: amount, lon: amount, par: amount, tyo: amount, sin: amount, dxb: amount, syd: amount, mex: amount };
}

function activity(partial: Pick<Activity, "id" | "area" | "interests" | "cost"> & Partial<Activity>): Activity {
  return {
    name: partial.id,
    time: "morning",
    hours: 2,
    blurb: partial.id,
    ...partial,
  };
}

function place(activities: Activity[], stay = { budget: 2000, comfort: 5000, premium: 9000 }): Destination {
  return {
    slug: "fixture",
    name: "Fixture",
    region: "europe",
    country: "Portugal",
    vibe: "Test",
    summary: "Test",
    photo: "",
    photoAlt: "",
    photoPosition: "center",
    goodMonths: [12],
    poorMonths: [7],
    poorReason: "Rain.",
    suggestedMonths: [11, 2],
    visa: null,
    areas: ["North", "South"],
    activities,
    go: "Go.",
    skip: "Skip.",
    eat: "Eat.",
    packing: [],
    stay,
    foodPerDay: 1000,
    localPerDay: 500,
    flights: flightMap(5000),
    airport: "FIX",
    rail: [],
  };
}

function input(partial: Partial<PlanInput>): PlanInput {
  return {
    ...emptyInput(),
    originId: "lon",
    destinationSlug: "fixture",
    start: "2026-12-01",
    end: "2026-12-05",
    party: "couple",
    travelers: 2,
    budget: 50000,
    pace: "balanced",
    strategy: "keep-stay",
    ...partial,
  };
}

describe("buildPlan", () => {
  const foodA = activity({ id: "food-a", area: "North", interests: ["food"], cost: 2000 });
  const foodB = activity({ id: "food-b", area: "North", interests: ["food"], cost: 2000 });
  const hike = activity({ id: "hike", area: "South", interests: ["adventure"], cost: 1500 });
  const night = activity({ id: "night-out", area: "South", interests: ["nightlife"], cost: 1000, nightlife: true });

  it("stays inside the budget and flags a shortfall instead of going over", () => {
    const destination = place([foodA, foodB, hike]);
    const fit = buildPlan(input({ interests: ["food"] }), destination);
    expect(fit.ok).toBe(true);
    expect(fit.total).toBeLessThanOrEqual(50000);
    expect(fit.shortfall).toBe(0);

    const tight = buildPlan(input({ budget: 20000, interests: ["food"] }), destination);
    expect(tight.ok).toBe(false);
    expect(tight.shortfall).toBeGreaterThan(0);
  });

  it("changes different line items for keep the stay and keep the days", () => {
    const destination = place([foodA, foodB, hike]);
    const stayFirst = buildPlan(input({ strategy: "keep-stay", interests: ["food"] }), destination);
    const daysFirst = buildPlan(input({ strategy: "keep-days", interests: ["food"] }), destination);
    const stayOf = (result: typeof stayFirst) => result.lines.find((line) => line.id === "stay")?.amount;
    const count = (result: typeof stayFirst) => result.days.flatMap((day) => day.activities).length;
    expect(stayOf(stayFirst)).toBe(20000);
    expect(count(stayFirst)).toBe(1);
    expect(stayOf(daysFirst)).toBe(8000);
    expect(count(daysFirst)).toBe(3);
  });

  it("recomputes when the hotel tier changes", () => {
    const destination = place([foodA]);
    const comfort = buildPlan(input({ tier: "comfort", interests: ["food"] }), destination);
    const budget = buildPlan(input({ tier: "budget", interests: ["food"] }), destination);
    expect(comfort.lines.find((line) => line.id === "stay")?.amount).toBeGreaterThan(
      budget.lines.find((line) => line.id === "stay")?.amount ?? 0,
    );
    expect(comfort.total).not.toBe(budget.total);
  });

  it("drops nightlife for a family", () => {
    const destination = place([foodA, night]);
    const result = buildPlan(
      input({ party: "family", travelers: 4, budget: 80000, interests: ["nightlife", "food"] }),
      destination,
    );
    const ids = result.days.flatMap((day) => day.activities.map((item) => item.activity.id));
    expect(ids).not.toContain("night-out");
    expect(result.cut.map((item) => item.id)).not.toContain("night-out");
  });

  it("keeps a day to one area when another activity in that area still fits", () => {
    const northA = activity({ id: "north-a", area: "North", interests: ["food"], cost: 0 });
    const northB = activity({ id: "north-b", area: "North", interests: ["food"], cost: 0 });
    const south = activity({ id: "south-a", area: "South", interests: ["culture"], cost: 0 });
    const destination = place([northA, northB, south], { budget: 1000, comfort: 2000, premium: 3000 });
    const result = buildPlan(
      input({
        start: "2026-12-01",
        end: "2026-12-03",
        pace: "relaxed",
        interests: ["food"],
        budget: 80000,
      }),
      destination,
    );
    const full = result.days.find((day) => day.label === "full");
    expect(full?.activities.map((item) => item.activity.area)).toEqual(["North", "North"]);
    for (const day of result.days) {
      const areas = new Set(day.activities.map((item) => item.activity.area));
      expect(areas.size).toBeLessThanOrEqual(1);
    }
  });

  it("keeps each day to one area across a full long weekend", () => {
    const north = ["n1", "n2", "n3", "n4"].map((id) => activity({ id, area: "North", interests: ["culture"], cost: 0 }));
    const south = ["s1", "s2", "s3", "s4"].map((id) => activity({ id, area: "South", interests: ["food"], cost: 0 }));
    const destination = place([...north, ...south], { budget: 1000, comfort: 2000, premium: 3000 });
    const result = buildPlan(
      input({
        start: "2026-11-01",
        end: "2026-11-04",
        pace: "balanced",
        budget: 80000,
      }),
      destination,
    );
    for (const day of result.days) {
      const areas = new Set(day.activities.map((item) => item.activity.area));
      expect(areas.size).toBeLessThanOrEqual(1);
    }
  });

  it("prefers an interest match when only one slot is open", () => {
    const food = activity({ id: "food", area: "North", interests: ["food"], cost: 0 });
    const hikeOnly = activity({ id: "hike", area: "South", interests: ["adventure"], cost: 0 });
    const destination = place([hikeOnly, food], { budget: 0, comfort: 0, premium: 0 });
    destination.foodPerDay = 0;
    destination.localPerDay = 0;
    destination.flights = flightMap(0);
    const result = buildPlan(
      input({ start: "2026-12-01", end: "2026-12-01", interests: ["food"], budget: 5000 }),
      destination,
    );
    expect(result.days.flatMap((day) => day.activities.map((item) => item.activity.id))).toEqual(["food"]);
  });

  it("keeps pinned and manually placed activities within day capacity", () => {
    const activities = ["a", "b", "c"].map((id) => activity({ id, area: "North", interests: ["food"], cost: 0 }));
    const destination = place(activities, { budget: 0, comfort: 0, premium: 0 });
    destination.foodPerDay = 0;
    destination.localPerDay = 0;
    destination.flights = flightMap(0);
    const result = buildPlan(input({
      start: "2026-12-01",
      end: "2026-12-01",
      budget: 100,
      pinnedActivityIds: activities.map((item) => item.id),
      dayPlan: activities.map((item) => ({ activityId: item.id, dayIndex: 0 })),
    }), destination);
    expect(result.days[0].activities).toHaveLength(1);
    expect(result.days[0].activities.length).toBeLessThanOrEqual(result.days[0].capacity);
    expect(result.cut).toHaveLength(2);
  });
});
