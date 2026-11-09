import { describe, expect, it } from "vitest";
import { discover, type DiscoveryBrief } from "./discovery";
import { buildPlan } from "./planner";
import { decodePlan, encodePlan } from "./share";

const brief: DiscoveryBrief = { query: "cooking class", originId: "lon", start: "2027-04-10", travelers: 2, nights: 3, budget: 2200 };

describe("experience discovery", () => {
  it("opens a reproducible trip containing the recommended stop at the quoted total", () => {
    const { matches } = discover(brief);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].activity.name.toLowerCase()).toContain("cook");
    expect(new Set(matches.map((m) => m.place.slug)).size).toBe(matches.length);
    for (const match of matches) {
      const loaded = decodePlan(encodePlan(match.input))!;
      const plan = buildPlan(loaded, match.place);
      expect(plan.total).toBe(match.total);
      expect(plan.total).toBeLessThanOrEqual(brief.budget);
      expect(plan.days.find((day) => day.date === match.date)?.activities.map((a) => a.activity.id)).toContain(match.activity.id);
    }
  });
  it("distinguishes unavailable activities from trips outside the budget", () => {
    expect(discover({ ...brief, query: "zzzzzz" })).toEqual({ hasActivity: false, matches: [] });
    expect(discover({ ...brief, budget: 80 })).toEqual({ hasActivity: true, matches: [] });
  });
});

it("fits a shorter day while preserving other dates, the quoted hotel and the kept stop", async () => {
  const { shortenDay } = await import("./shorter-day");
  const match = discover(brief).matches[0];
  const plan = buildPlan(match.input, match.place);
  const index = plan.days.findIndex((day) => day.activities.length >= 2);
  expect(index).toBeGreaterThanOrEqual(0);
  const anchor = plan.days[index].activities[0].activity;
  expect(shortenDay(match.input, plan, match.place, index, 0, anchor.id)).toBeNull();
  const preview = shortenDay(match.input, plan, match.place, index, anchor.hours, anchor.id)!;
  const edited = buildPlan(decodePlan(encodePlan(preview.input))!, match.place);
  expect(edited.days[index].activities.map((item) => item.activity.id)).toEqual([anchor.id]);
  expect(edited.days.filter((_, i) => i !== index)).toEqual(plan.days.filter((_, i) => i !== index));
  expect(edited.total).toBe(plan.total - preview.saved);
});
