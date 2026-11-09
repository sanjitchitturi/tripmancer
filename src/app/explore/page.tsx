import type { Metadata } from "next";
import { ExploreBrowser } from "@/components/ExploreBrowser";

export const metadata: Metadata = {
  title: "Explore",
  description: "Places you can plan from major cities, with typical costs in US dollars.",
};

export default function ExplorePage() {
  return <ExploreBrowser />;
}
