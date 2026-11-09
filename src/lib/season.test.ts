import { describe, expect, it } from "vitest";
import { getDestination } from "@/data/destinations";
import { seasonFit } from "@/lib/season";

describe("seasonFit", () => {
  it("warns on a monsoon date and names easier months", () => {
    const goa = getDestination("goa");
    expect(goa).toBeDefined();
    const fit = seasonFit(goa!, "2026-07-15");
    expect(fit.status).toBe("poor");
    expect(fit.reason.toLowerCase()).toContain("shack");
    expect(fit.suggestedMonths).toEqual(expect.arrayContaining([11, 2]));
  });
});
