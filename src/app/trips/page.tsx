import type { Metadata } from "next";
import { TripLibrary } from "@/components/TripLibrary";

export const metadata: Metadata = {
  title: "Trips",
  description: "Trips saved on your account.",
};

export default function TripsPage() {
  return <TripLibrary />;
}
