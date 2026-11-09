import { describe, expect, it } from "vitest";
import { destinations, origins } from "@/data/destinations";
import { emptyInput } from "@/lib/defaults";
import { mergeBrief, parseBrief } from "@/lib/brief";

const today = new Date(2026, 9, 12);

describe("parseBrief", () => {
  it("reads destination, budget, and party from a clear sentence", () => {
    const patch = parseBrief(
      "5 days in Goa from London in December, two people, under 2200, food and beaches",
      destinations,
      origins,
      today,
    );
    expect(patch.destinationSlug).toBe("goa");
    expect(patch.originId).toBe("lon");
    expect(patch.budget).toBe(2200);
    expect(patch.travelers).toBe(2);
    expect(patch.party).toBe("couple");
    expect(patch.interests).toEqual(expect.arrayContaining(["food", "relax"]));
    expect(patch.interests).not.toContain("nightlife");
    expect(patch.start).toBe("2026-12-01");
    expect(patch.end).toBe("2026-12-05");
  });

  it("does not treat the word nights as nightlife", () => {
    const patch = parseBrief("3 nights in Jaipur from London in November, culture", destinations, origins, today);
    expect(patch.interests).toEqual(["culture"]);
  });

  it("does not wipe the form when the sentence is vague", () => {
    const current = { ...emptyInput(), destinationSlug: "jaipur", budget: 90000 };
    const patch = parseBrief("somewhere nice", destinations, origins, today);
    const next = mergeBrief(current, patch);
    expect(patch.destinationSlug).toBeUndefined();
    expect(next.destinationSlug).toBe("jaipur");
    expect(next.budget).toBe(90000);
  });

  it("keeps the departure city out of the destination", () => {
    const patch = parseBrief("4 nights in Tokyo from Singapore under 3000", destinations, origins, today);
    expect(patch.destinationSlug).toBe("tokyo");
    expect(patch.originId).toBe("sin");
    expect(patch.budget).toBe(3000);
  });
});
