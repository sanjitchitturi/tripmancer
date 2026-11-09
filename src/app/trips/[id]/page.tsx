import type { Metadata } from "next";
import { Suspense } from "react";
import { TripEditor } from "@/components/TripEditor";

export const metadata: Metadata = {
  title: "Trip",
};

export default function TripPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <TripEditor />
    </Suspense>
  );
}
