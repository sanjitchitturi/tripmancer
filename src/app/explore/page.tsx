import type { Metadata } from "next";
import { ExploreBrowser } from "@/components/ExploreBrowser";

export const metadata: Metadata = {
  title: "Explore",
  description: "Browse city guides or find destinations that match the activities you want to try.",
};

export default function ExplorePage() {
  return <ExploreBrowser />;
}
