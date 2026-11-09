export interface AgentOption {
  label: string;
  text: string;
}

export interface Agent {
  id: "planner" | "budget" | "guide";
  name: string;
  line: string;
  options: AgentOption[];
}

export const agents: Agent[] = [
  {
    id: "planner",
    name: "Planner",
    line: "Builds the days, the room, and the flight estimate.",
    options: [
      { label: "Long weekend", text: "3 nights in Lisbon from London in November, culture" },
      { label: "Beach under $1,800", text: "5 nights in Bali from Singapore under 1800, beaches" },
      { label: "You choose", text: "Plan a trip for me from London under 1800" },
    ],
  },
  {
    id: "budget",
    name: "Budget",
    line: "Keeps the total inside the cap you set.",
    options: [
      { label: "Make it cheaper", text: "make this cheaper" },
      { label: "Keep the hotel", text: "keep the stay and cut activities" },
    ],
  },
  {
    id: "guide",
    name: "Guide",
    line: "Visa, packing, and what to skip for the open place.",
    options: [
      { label: "Visa check", text: "do I need a visa" },
      { label: "What to pack", text: "what should I pack" },
      { label: "What to skip", text: "what should I skip" },
    ],
  },
];
