export const copy = {
  name: "TripMancer",
  estimateNote: "Estimates are in USD. Check live prices before booking.",
  pickDates: "Add dates and the days fall into place.",
  noTrips: "Your saved trips will live here.",
  tripMissing: "That trip is not on this account.",
  linkCopied: "Link copied.",
  shortlistEmpty: "Save a place. Signed in, it stays on your account.",
  compareNeed: "Choose two places to see them side by side.",
  printTitle: "Trip",
  domesticVisa: "Check the entry rule for your passport before you book.",
  beforeYouGo: "Before you go",
  readiness: "Before you go",
  bookFlight: "Book flight",
  bookStay: "Booking.com",
  bookAgoda: "Agoda",
  seeTrains: "See trains",
  bookActivity: "Find on Klook",
  insurance: "Travel insurance",
  esim: "eSIM",
  forex: "Travel money",
  save: "Save trip",
  update: "Update saved trip",
  share: "Copy link",
  print: "Print",
  duplicate: "Duplicate",
  remove: "Remove",
  planCta: "Plan this trip",
  explore: "Explore",
  trips: "Trips",
  plan: "Plan",
  compare: "Compare",
  shortlist: "Shortlist",
  placesNext: "Places to open next",
  from: "From",
  nights: "nights",
  each: "each",
  stillOpen: "still open",
  gap: "over the budget",
  addToPlan: "Plan it",
  costDetails: "Cost details",
  swapTitle: "Other options for this slot",
  noSwaps: "Nothing else in the budget fits this slot.",
  seasonKeep: "The plan still builds if you keep these dates.",
  railFallback: "No train on this route. Showing the flight.",
  markVisa: "Entry rules checked",
  packingDone: "Packing checked",
};

export function surplusLine(open: string, name: string, price: string): string {
  return `${open} still open. Add ${name}, ${price}.`;
}

export function dropLine(name: string, freed: string): string {
  return `Drop ${name}. That frees ${freed}.`;
}

export function tierLine(tier: string, freed: string): string {
  return `Step the stay down to ${tier}. That frees ${freed}.`;
}

export function switchLine(origin: string, flight: string, place: string): string {
  return `Flights from ${origin} already use ${flight}. Look at ${place}.`;
}

export function seasonWarning(reason: string, months: string): string {
  return `${reason} ${months} are easier.`;
}

export function dateNudge(months: string): string {
  return `Pick dates. ${months} are the easier months.`;
}

export function countdownLabel(days: number): string {
  if (days > 1) return `${days} days to go`;
  if (days === 1) return "Tomorrow";
  if (days === 0) return "Starts today";
  return "Already started";
}
