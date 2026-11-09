import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanScreen } from "@/components/plan/PlanScreen";

export const metadata: Metadata = {
  title: "Plan",
  description: "Build a day-by-day trip in US dollars and keep it inside the budget.",
};

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <PlanScreen />
    </Suspense>
  );
}
