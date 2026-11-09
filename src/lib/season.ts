import type { Destination } from "@/lib/types";
import { monthName, parseIso } from "@/lib/format";

export type SeasonStatus = "unknown" | "good" | "poor" | "ok";

export interface SeasonFit {
  status: SeasonStatus;
  month: number | null;
  reason: string;
  suggestedMonths: number[];
  suggestedLabel: string;
}

export function seasonFit(destination: Destination, start: string | null): SeasonFit {
  const suggestedLabel = destination.suggestedMonths.map((month) => monthName(month)).join(" and ");
  if (!start) {
    return {
      status: "unknown",
      month: null,
      reason: "",
      suggestedMonths: destination.suggestedMonths,
      suggestedLabel,
    };
  }
  const month = parseIso(start).getMonth() + 1;
  if (destination.poorMonths.includes(month)) {
    return {
      status: "poor",
      month,
      reason: destination.poorReason,
      suggestedMonths: destination.suggestedMonths,
      suggestedLabel,
    };
  }
  if (destination.goodMonths.includes(month)) {
    return {
      status: "good",
      month,
      reason: "",
      suggestedMonths: destination.suggestedMonths,
      suggestedLabel,
    };
  }
  return {
    status: "ok",
    month,
    reason: "",
    suggestedMonths: destination.suggestedMonths,
    suggestedLabel,
  };
}
