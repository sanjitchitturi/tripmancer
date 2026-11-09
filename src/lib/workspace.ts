export interface WorkspaceFlags {
  showComposer: boolean;
  showSuggestions: boolean;
  showPlaceRow: boolean;
  showControls: boolean;
  showCost: boolean;
  showDays: boolean;
  showShortfall: boolean;
  showPacking: boolean;
  showBook: boolean;
  showSeasonNudge: boolean;
  showSeasonWarning: boolean;
  showVisa: boolean;
  showOutboundPrep: boolean;
  showRail: boolean;
  showCoach: boolean;
  showReadiness: boolean;
}

export function getWorkspace(input: {
  destination: boolean;
  dates: boolean;
  season: "unknown" | "good" | "poor" | "ok";
  outbound: boolean;
  rail: boolean;
  saved: boolean;
  planOk: boolean;
  coach: boolean;
}): WorkspaceFlags {
  if (!input.destination) {
    return {
      showComposer: true,
      showSuggestions: true,
      showPlaceRow: true,
      showControls: false,
      showCost: false,
      showDays: false,
      showShortfall: false,
      showPacking: false,
      showBook: false,
      showSeasonNudge: false,
      showSeasonWarning: false,
      showVisa: false,
      showOutboundPrep: false,
      showRail: false,
      showCoach: false,
      showReadiness: false,
    };
  }

  const ready = input.dates && input.planOk;
  return {
    showComposer: false,
    showSuggestions: false,
    showPlaceRow: false,
    showControls: true,
    showCost: input.dates,
    showDays: ready,
    showShortfall: input.dates && !input.planOk,
    showPacking: ready,
    showBook: ready,
    showSeasonNudge: !input.dates,
    showSeasonWarning: input.dates && input.season === "poor",
    showVisa: input.outbound,
    showOutboundPrep: ready && input.outbound,
    showRail: input.rail,
    showCoach: input.dates && input.coach,
    showReadiness: input.saved && input.dates,
  };
}
