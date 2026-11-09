import { destinations as catalog, getDestination, getOrigin, origins as originList, typicalTripCost } from "@/data/destinations";
import { addDays, toIso, formatRange, inr, monthList, nightsBetween } from "@/lib/format";
import { parseBrief } from "@/lib/brief";
import { packingList } from "@/lib/prep";
import type { BriefPatch, Destination, Origin, PlanInput, Strategy } from "@/lib/types";

export interface ChatReply {
  text: string;
  patch?: BriefPatch;
  strategy?: Strategy;
}

function placeList(places: Destination[]): string {
  return places.map((place) => place.name).join(", ");
}

function namedPlace(text: string, places: Destination[]): Destination | undefined {
  const ordered = [...places].sort((a, b) => b.name.length - a.name.length);
  return ordered.find((place) => new RegExp(`\\b${place.name}\\b`, "i").test(text));
}

function isPlanRequest(text: string, patch: BriefPatch): boolean {
  if (!patch.destinationSlug) return false;
  return Boolean(patch.start || patch.budget || patch.originId || /\b(day|days|night|nights|weekend|people|couple|solo|family)\b/i.test(text));
}

export function answerMessage(
  text: string,
  input: PlanInput,
  places: Destination[] = catalog,
  origins: Origin[] = originList,
): ChatReply {
  const trimmed = text.trim();
  if (!trimmed) {
    return { text: "Name a place, a departure city, and a dollar budget. Example: 5 nights in Lisbon from London under 1800." };
  }

  const patch = parseBrief(trimmed, places, origins);
  const asked = places.find((item) => item.slug === patch.destinationSlug) ?? namedPlace(trimmed, places);
  const current = places.find((place) => place.slug === input.destinationSlug);
  const place = asked ?? current;
  const origin = getOrigin(patch.originId ?? input.originId);

  const compared = places.filter((item) => new RegExp(`\\b${item.name}\\b`, "i").test(trimmed));
  if (compared.length >= 2 && /\b(compare|versus|vs\.?|or)\b/i.test(trimmed)) {
    const [first, second] = compared;
    return {
      text: `From ${origin.name}, about ${inr(typicalTripCost(first, origin.id))} for four nights and two people in ${first.name}, and ${inr(typicalTripCost(second, origin.id))} in ${second.name}. ${first.name}: ${first.summary} ${second.name}: ${second.summary}`,
    };
  }

  if (/\b(cheaper|spend less|cut the cost|lower the cost|too expensive)\b/i.test(trimmed)) {
    const where = place ? ` in ${place.name}` : "";
    return {
      text: `I'll keep the days${where} and step the hotel down before I drop activities. A budget room is ${place ? inr(place.stay.budget) : "the lowest tier"} a night.`,
      strategy: "keep-days",
    };
  }

  if (/\b(nicer hotel|better hotel|keep the stay|upgrade the room)\b/i.test(trimmed)) {
    return {
      text: place
        ? `I'll protect the room in ${place.name}. Comfort is ${inr(place.stay.comfort)} a night. Premium is ${inr(place.stay.premium)}. Paid activities get cut first.`
        : "Tell me the place, then I can hold the hotel and cut activities first.",
      strategy: "keep-stay",
    };
  }

  if (/\b(you choose|surprise me|pick for me|plan(?: a trip)? for me)\b/i.test(trimmed)) {
    const today = new Date();
    const start = addDays(toIso(today), (5 - today.getDay() + 7) % 7 || 7);
    const end = addDays(start, 3);
    const originId = patch.originId ?? "lon";
    const budget = patch.budget ?? 1800;
    const from = getOrigin(originId);
    const chosen = getDestination("lisbon");
    const flight = chosen ? chosen.flights[originId] * 2 : 0;
    return {
      text: `Lisbon from ${from.name}, 3 nights, ${formatRange(start, end)}, two people, cap ${inr(budget)}. Round-trip flights are about ${inr(flight)}. One tram hill, then dinner off the river.`,
      patch: {
        originId,
        destinationSlug: "lisbon",
        start,
        end,
        party: "couple",
        travelers: 2,
        budget,
        interests: ["culture"],
      },
    };
  }

  if (isPlanRequest(trimmed, patch) && patch.destinationSlug) {
    const chosen = places.find((item) => item.slug === patch.destinationSlug)!;
    const from = getOrigin(patch.originId ?? input.originId);
    const travelers = patch.travelers ?? input.travelers;
    const nights = patch.start && patch.end ? nightsBetween(patch.start, patch.end) : 4;
    const flights = chosen.flights[from.id] * travelers;
    const when = patch.start && patch.end ? ` ${formatRange(patch.start, patch.end)}.` : "";
    const budget = patch.budget ? ` Your cap is ${inr(patch.budget)}.` : "";
    return {
      text: `${chosen.name} from ${from.name}, ${nights} ${nights === 1 ? "night" : "nights"}, ${travelers} ${travelers === 1 ? "traveler" : "travelers"}.${when} Round-trip flights are about ${inr(flights)}. A comfort room is ${inr(chosen.stay.comfort)} a night.${budget} ${chosen.go}`,
      patch,
    };
  }

  if (place && /\bpack/.test(trimmed.toLowerCase())) {
    const month = patch.start ? Number(patch.start.slice(5, 7)) : input.start ? Number(input.start.slice(5, 7)) : null;
    const items = packingList(place, month, place.activities.slice(0, 4), origin.country !== place.country);
    return { text: `Pack for ${place.name}: ${items.join(". ")}.` };
  }

  if (place && /\bvisa\b/i.test(trimmed)) {
    const detail = place.visa ?? "Check the entry rule for your passport before you book.";
    return { text: `${place.name}: ${detail}` };
  }

  if (place && /\b(when|which month|months|season|monsoon|weather)\b/i.test(trimmed)) {
    return {
      text: `${place.poorReason} ${monthList(place.suggestedMonths)} are the easier months for ${place.name}.`,
    };
  }

  if (place && /\b(eat|food|restaurant|thali)\b/i.test(trimmed)) {
    return { text: `${place.name}: ${place.eat}` };
  }

  if (place && /\b(skip|avoid|don't|do not)\b/i.test(trimmed)) {
    return { text: `${place.name}: ${place.skip}` };
  }

  if (place && /\b(cost|price|how much|budget)\b/i.test(trimmed)) {
    return {
      text: `From ${origin.name}, about ${inr(typicalTripCost(place, origin.id))} for four nights and two people in ${place.name}. That covers flights, a comfort room, food, and local transport. It is a typical estimate, not a live fare.`,
    };
  }

  if (/\b(help|what can you|how do you)\b/i.test(trimmed)) {
    return {
      text: `I plan trips in US dollars from New York, London, Paris, Tokyo, Singapore, Dubai, Sydney, and Mexico City. Places: ${placeList(places)}. Give me a departure city, a place, dates, and a budget. You can also ask about visa, months, food, or what to skip.`,
    };
  }

  return {
    text: `I need a place from this list: ${placeList(places)}. Try: 5 nights in Lisbon from London under 1800.`,
  };
}
