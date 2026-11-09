import { describe, expect, it } from "vitest";
import { safeReturnPath } from "@/lib/identity";
import { normalizePhone } from "@/lib/account";

describe("normalizePhone", () => {
  it("keeps a full international number", () => {
    expect(normalizePhone("+1 (415) 555-2671")).toBe("+14155552671");
  });

  it("rejects numbers that are too short", () => {
    expect(normalizePhone("12345")).toBeNull();
  });
});

describe("sign-in return path", () => {
  it("allows local planner links and rejects outside and script targets", () => {
    expect(safeReturnPath("/plan?d=lisbon")).toBe("/plan?d=lisbon");
    for (const value of ["//outside.example", "javascript:alert(1)", "/api/trips", "https://outside.example/plan"]) {
      expect(safeReturnPath(value)).toBe("/plan");
    }
  });
});
