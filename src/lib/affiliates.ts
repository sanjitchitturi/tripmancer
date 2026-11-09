import type { RailOption } from "@/lib/types";

export interface AffiliateIds {
  skyscanner: string;
  booking: string;
  agoda: string;
  klook: string;
  insurance: string;
  esim: string;
  forex: string;
  rail: string;
}

export function affiliateIds(): AffiliateIds {
  return {
    skyscanner: process.env.NEXT_PUBLIC_SKYSCANNER_ID ?? "",
    booking: process.env.NEXT_PUBLIC_BOOKING_AID ?? "",
    agoda: process.env.NEXT_PUBLIC_AGODA_CID ?? "",
    klook: process.env.NEXT_PUBLIC_KLOOK_AID ?? "",
    insurance: process.env.NEXT_PUBLIC_INSURANCE_URL || "https://safetywing.com/",
    esim: process.env.NEXT_PUBLIC_ESIM_URL || "https://www.airalo.com/",
    forex: process.env.NEXT_PUBLIC_FOREX_URL || "https://wise.com/",
    rail: process.env.NEXT_PUBLIC_RAIL_URL ?? "",
  };
}

function skyDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${year.slice(2)}${month}${day}`;
}

export function flightLink(
  args: {
    originAirport: string;
    destinationAirport: string;
    originName: string;
    destinationName: string;
    start: string | null;
    end: string | null;
    travelers: number;
  },
  ids: Pick<AffiliateIds, "skyscanner">,
): string {
  if (ids.skyscanner && args.start && args.end) {
    const url = new URL(
      `https://www.skyscanner.net/transport/flights/${args.originAirport.toLowerCase()}/${args.destinationAirport.toLowerCase()}/${skyDate(args.start)}/${skyDate(args.end)}/`,
    );
    url.searchParams.set("adultsv2", String(Math.max(1, args.travelers)));
    url.searchParams.set("cabinclass", "economy");
    url.searchParams.set("rtn", "1");
    url.searchParams.set("currency", "USD");
    url.searchParams.set("associateid", ids.skyscanner);
    return url.toString();
  }
  const query =
    args.start && args.end
      ? `Flights from ${args.originName} to ${args.destinationName} on ${args.start} through ${args.end}`
      : `Flights from ${args.originName} to ${args.destinationName}`;
  const url = new URL("https://www.google.com/travel/flights");
  url.searchParams.set("hl", "en");
  url.searchParams.set("curr", "USD");
  url.searchParams.set("q", query);
  return url.toString();
}

export function bookingLink(
  args: { name: string; start: string; end: string; travelers: number; rooms: number },
  aid: string,
): string {
  const url = new URL("https://www.booking.com/searchresults.html");
  url.searchParams.set("ss", args.name);
  url.searchParams.set("checkin", args.start);
  url.searchParams.set("checkout", args.end);
  url.searchParams.set("group_adults", String(args.travelers));
  url.searchParams.set("no_rooms", String(args.rooms));
  if (aid) url.searchParams.set("aid", aid);
  return url.toString();
}

export function agodaLink(
  args: { name: string; start: string; end: string; travelers: number; rooms: number },
  cid: string,
): string {
  const url = new URL("https://www.agoda.com/search");
  url.searchParams.set("city", args.name);
  url.searchParams.set("checkIn", args.start);
  url.searchParams.set("checkOut", args.end);
  url.searchParams.set("rooms", String(args.rooms));
  url.searchParams.set("adults", String(args.travelers));
  url.searchParams.set("currency", "USD");
  if (cid) url.searchParams.set("cid", cid);
  return url.toString();
}

export function activityLink(activityName: string, placeName: string, aid: string): string {
  const url = new URL("https://www.klook.com/en-US/search/result/");
  url.searchParams.set("query", `${activityName} ${placeName}`);
  if (aid) url.searchParams.set("aid", aid);
  return url.toString();
}

export function railLink(option: RailOption, railUrl: string): string {
  if (railUrl) {
    try {
      const url = new URL(railUrl);
      url.searchParams.set("source", option.fromCode);
      url.searchParams.set("destination", option.toCode);
      return url.toString();
    } catch {
      return railUrl;
    }
  }
  const url = new URL("https://www.rome2rio.com/map/");
  url.pathname = `/map/${encodeURIComponent(option.fromCode)}/${encodeURIComponent(option.toCode)}`;
  return url.toString();
}
