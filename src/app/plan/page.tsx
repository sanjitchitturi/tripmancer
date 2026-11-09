import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanScreen } from "@/components/plan/PlanScreen";

export const metadata: Metadata = {
  title: "Plan",
  description: "Build a day-by-day itinerary, compare stays, and plan around your budget.",
};

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <PlanScreen />
    </Suspense>
  );
}
