import { describe, expect, it } from "vitest";
import { answerMessage } from "@/lib/chat";
import { emptyInput } from "@/lib/defaults";

describe("answerMessage", () => {
  it("turns a full sentence into a Goa plan with a flight figure", () => {
    const reply = answerMessage(
      "5 days in Goa from London in December, two people, under 2200",
      emptyInput(),
    );
    expect(reply.patch?.destinationSlug).toBe("goa");
    expect(reply.patch?.originId).toBe("lon");
    expect(reply.patch?.budget).toBe(2200);
    expect(reply.text).toContain("Goa");
    expect(reply.text).toContain("London");
    expect(reply.text).toMatch(/\$/);
  });

  it("keeps a food interest inside a full trip request", () => {
    const reply = answerMessage("5 nights in Goa from London under 2400, food and beaches", emptyInput());
    expect(reply.patch?.destinationSlug).toBe("goa");
    expect(reply.patch?.budget).toBe(2400);
    expect(reply.patch?.originId).toBe("lon");
    expect(reply.text).toMatch(/\$/);
  });
    it("answers a visa question without inventing a booking", () => {
    const reply = answerMessage("Do I need a visa for Singapore?", emptyInput());
    expect(reply.text.toLowerCase()).toContain("visa");
    expect(reply.text).toContain("Singapore");
    expect(reply.patch).toBeUndefined();
  });

  it("compares two places with dollar totals", () => {
    const reply = answerMessage("Compare Goa and Jaipur from London", emptyInput());
    expect(reply.text).toContain("Goa");
    expect(reply.text).toContain("Jaipur");
    expect(reply.text).toMatch(/\$/);
  });

  it("plans a weekend when the traveler does not want to choose", () => {
    const reply = answerMessage("Plan a trip for me from London under 1800", emptyInput());
    expect(reply.patch?.destinationSlug).toBe("lisbon");
    expect(reply.patch?.originId).toBe("lon");
    expect(reply.patch?.budget).toBe(1800);
    expect(reply.text).toContain("Lisbon");
  });

  it("lists what to pack for a named place", () => {
    const reply = answerMessage("what should I pack for Goa", emptyInput());
    expect(reply.text).toContain("Goa");
    expect(reply.text.toLowerCase()).toContain("swim");
  });
    it("says which places it can plan when the sentence has none", () => {
    const reply = answerMessage("hello there", emptyInput());
    expect(reply.patch).toBeUndefined();
    expect(reply.text).toContain("Goa");
  });
});
