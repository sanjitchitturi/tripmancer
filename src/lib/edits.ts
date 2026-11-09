import { addDays } from "@/lib/format";
import { layoutFrom } from "@/lib/planner";
import type { CoachMove, PlanInput, PlanResult } from "@/lib/types";

export function applyCoach(input: PlanInput, move: CoachMove): PlanInput {
  if (!move.actionable) return input;
  if (move.kind === "drop" && move.activityId) {
    return {
      ...input,
      excludedActivityIds: [...new Set([...input.excludedActivityIds, move.activityId])],
      pinnedActivityIds: input.pinnedActivityIds.filter((id) => id !== move.activityId),
      dayPlan: input.dayPlan.filter((item) => item.activityId !== move.activityId),
    };
  }
  if (move.kind === "add" && move.activityId) {
    return {
      ...input,
      pinnedActivityIds: [...new Set([...input.pinnedActivityIds, move.activityId])],
      excludedActivityIds: input.excludedActivityIds.filter((id) => id !== move.activityId),
    };
  }
  if (move.kind === "tier" && move.tier) return { ...input, tier: move.tier };
  if (move.kind === "switch" && move.destinationSlug) {
    return {
      ...input,
      destinationSlug: move.destinationSlug,
      excludedActivityIds: [],
      pinnedActivityIds: [],
      dayPlan: [],
      tier: "auto",
    };
  }
  if (move.kind === "shorten" && input.end && input.start && input.end > input.start) {
    return { ...input, end: addDays(input.end, -1) };
  }
  return input;
}

export function moveActivity(input: PlanInput, plan: PlanResult, activityId: string, direction: -1 | 1): PlanInput {
  const days = plan.days.map((day) => day.activities.map((item) => item.activity.id));
  const dayIndex = days.findIndex((list) => list.includes(activityId));
  if (dayIndex < 0) return input;
  const index = days[dayIndex].indexOf(activityId);
  const next = index + direction;
  if (next >= 0 && next < days[dayIndex].length) {
    const copy = [...days[dayIndex]];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    days[dayIndex] = copy;
  } else {
    const target = dayIndex + direction;
    if (target < 0 || target >= days.length) return input;
    days[dayIndex] = days[dayIndex].filter((id) => id !== activityId);
    const insertAt = direction < 0 ? days[target].length : 0;
    const row = [...days[target]];
    row.splice(insertAt, 0, activityId);
    days[target] = row;
  }
  return {
    ...input,
    dayPlan: days.flatMap((list, index) => list.map((id) => ({ dayIndex: index, activityId: id }))),
  };
}

export function swapInPlan(input: PlanInput, plan: PlanResult, fromId: string, toId: string): PlanInput {
  const dayPlan = layoutFrom(plan).map((item) =>
    item.activityId === fromId ? { ...item, activityId: toId } : item,
  );
  return {
    ...input,
    dayPlan,
    excludedActivityIds: [...new Set([...input.excludedActivityIds, fromId])].filter((id) => id !== toId),
    pinnedActivityIds: [...new Set([...input.pinnedActivityIds.filter((id) => id !== fromId), toId])],
  };
}

export function moveToDay(input: PlanInput, plan: PlanResult, activityId: string, dayIndex: number): PlanInput {
  if (dayIndex < 0 || dayIndex >= plan.days.length) return input;
  const days = plan.days.map((day) => day.activities.map((item) => item.activity.id).filter((id) => id !== activityId));
  days[dayIndex] = [...days[dayIndex], activityId];
  return {
    ...input,
    dayPlan: days.flatMap((list, index) => list.map((id) => ({ dayIndex: index, activityId: id }))),
  };
}

export function removeActivity(input: PlanInput, activityId: string): PlanInput {
  return {
    ...input,
    excludedActivityIds: [...new Set([...input.excludedActivityIds, activityId])],
    pinnedActivityIds: input.pinnedActivityIds.filter((id) => id !== activityId),
    dayPlan: input.dayPlan.filter((item) => item.activityId !== activityId),
  };
}
