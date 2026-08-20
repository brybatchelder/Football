export type LifecycleStage = {
  id: string;
  name: string;
  purpose: string;
  primaryAction: string;
};

export type LifecyclePhase = {
  id: "preseason" | "regular-season" | "postseason" | "celebration";
  name: string;
  description: string;
  stages: LifecycleStage[];
};

export const leagueLifecycle: LifecyclePhase[] = [
  {
    id: "preseason",
    name: "Preseason",
    description:
      "Build rosters, allocate contracts, and prepare every franchise for kickoff.",
    stages: [
      {
        id: "rfa-tags",
        name: "RFA · Assign Tags",
        purpose:
          "Franchises designate eligible restricted free agents and applicable tags.",
        primaryAction: "Assign RFA and franchise tags",
      },
      {
        id: "rfa-bidding",
        name: "RFA · Bidding",
        purpose:
          "Owners submit bids and original franchises make match decisions.",
        primaryAction: "Bid, match, or decline",
      },
      {
        id: "rookie-draft-pre",
        name: "Rookie Draft · Pre",
        purpose:
          "Finalize the draft order, pick ownership, eligibility, and room readiness.",
        primaryAction: "Prepare draft assets",
      },
      {
        id: "rookie-draft",
        name: "Rookie Draft",
        purpose:
          "Franchises select rookies using the official draft order and owned picks.",
        primaryAction: "Make rookie selections",
      },
      {
        id: "rookie-draft-post",
        name: "Rookie Draft · Post / Auctions Open",
        purpose:
          "Reconcile rookie selections and open player auctions for remaining acquisitions.",
        primaryAction: "Reconcile rosters and run auctions",
      },
      {
        id: "final-compliance",
        name: "Roster Cutdown / Contracts / Final Compliance",
        purpose:
          "Reach roster limits, assign contract years, resolve Taxi and IR status, and pass final compliance.",
        primaryAction: "Certify opening-day rosters",
      },
    ],
  },
  {
    id: "regular-season",
    name: "Regular Season",
    description:
      "Weekly lineup competition, live scoring, roster management, and the playoff race.",
    stages: [
      {
        id: "regular-season",
        name: "Regular Season",
        purpose:
          "Run the weekly matchup schedule through the end of league play.",
        primaryAction: "Set lineups and compete",
      },
    ],
  },
  {
    id: "postseason",
    name: "Postseason",
    description:
      "The qualifying field advances through the FOFL championship bracket.",
    stages: [
      {
        id: "quarterfinals",
        name: "Quarterfinals",
        purpose: "Opening playoff round for qualifying franchises.",
        primaryAction: "Advance quarterfinal winners",
      },
      {
        id: "semifinals",
        name: "Semifinals",
        purpose: "Determine the two franchises that will play for the title.",
        primaryAction: "Advance championship finalists",
      },
      {
        id: "championship",
        name: "Championship",
        purpose:
          "Crown the FOFL champion and preserve the final matchup record.",
        primaryAction: "Complete championship scoring",
      },
    ],
  },
  {
    id: "celebration",
    name: "Championship Celebration / Vacation Mode",
    description:
      "Celebrate the champion, freeze the completed season, and transition into the next league year.",
    stages: [
      {
        id: "celebration-offseason",
        name: "Celebrate / Enter Offseason",
        purpose:
          "Publish the champion, archive the season, roll contracts and picks, then open the new offseason.",
        primaryAction: "Close season and initialize next year",
      },
    ],
  },
];

export const currentLifecycleStageId = "final-compliance";

export function lifecycleStages(phases = leagueLifecycle) {
  return phases.flatMap((phase) =>
    phase.stages.map((stage) => ({
      ...stage,
      phaseId: phase.id,
      phaseName: phase.name,
    })),
  );
}

export function nextLifecycleStage(stageId: string, phases = leagueLifecycle) {
  const stages = lifecycleStages(phases);
  const index = stages.findIndex((stage) => stage.id === stageId);
  return index >= 0 ? stages[index + 1] : undefined;
}
