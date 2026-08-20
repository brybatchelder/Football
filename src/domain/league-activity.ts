export type ActivityType =
  "trade" | "auction" | "rfa" | "rookie-draft" | "roster-move";
export type LeagueActivity = {
  id: string;
  type: ActivityType;
  occurredAt: string;
  phase: "offseason" | "preseason" | "regular" | "playoffs";
  franchises: string[];
  title: string;
  summary: string;
  assets: string[];
  details: string[];
};

/** Seed data for the UI until the transaction ledger is imported. */
export const leagueActivity: LeagueActivity[] = [
  {
    id: "move-canton-taxi",
    type: "roster-move",
    occurredAt: "Aug 8, 2026 · 10:24 AM",
    phase: "preseason",
    franchises: ["canton-legends"],
    title: "Canton Legends promoted Dillon Gabriel to Taxi",
    summary: "Roster status movement",
    assets: ["Dillon Gabriel · QB", "Taxi eligibility retained"],
    details: [
      "Moved from reserve status to Taxi squad",
      "No cap charge change",
    ],
  },
  {
    id: "auction-dallas",
    type: "auction",
    occurredAt: "Aug 7, 2026 · 8:14 PM",
    phase: "preseason",
    franchises: ["dallas-texans"],
    title: "Dallas Texans won an auction",
    summary: "Winning bid posted",
    assets: ["Player and final bid pending ledger import"],
    details: ["Auction winner is ready to reconcile from the league ledger"],
  },
  {
    id: "trade-canton-detroit",
    type: "trade",
    occurredAt: "Aug 5, 2026 · 6:31 PM",
    phase: "offseason",
    franchises: ["canton-legends", "detroit-fury"],
    title: "Canton Legends and Detroit Fury completed a trade",
    summary: "Multi-asset deal",
    assets: ["2027 Canton Round 2", "Detroit roster asset"],
    details: [
      "Canton sent: 2027 Round 2",
      "Detroit sent: roster asset",
      "Contract and cap reconciliation pending",
    ],
  },
  {
    id: "draft-memphis",
    type: "rookie-draft",
    occurredAt: "May 3, 2026 · 2:07 PM",
    phase: "offseason",
    franchises: ["memphis-showboats"],
    title: "Memphis Showboats made a rookie selection",
    summary: "Rookie Draft · pick detail pending",
    assets: ["Draft selection ledger pending import"],
    details: [
      "Pick ownership and player selection will be rendered from the draft ledger",
    ],
  },
  {
    id: "rfa-new-york",
    type: "rfa",
    occurredAt: "Apr 29, 2026 · 5:41 PM",
    phase: "offseason",
    franchises: ["new-york-knights"],
    title: "New York Knights resolved an RFA action",
    summary: "Match decision pending",
    assets: ["RFA award details pending import"],
    details: ["Original club, bid, and match result await the RFA ledger"],
  },
];

export function filterLeagueActivity(
  events: LeagueActivity[],
  filters: {
    type?: ActivityType | "all";
    franchiseId?: string;
    query?: string;
    phase?: LeagueActivity["phase"] | "all";
  },
) {
  const query = filters.query?.trim().toLowerCase();
  return events.filter(
    (event) =>
      (filters.type === undefined ||
        filters.type === "all" ||
        event.type === filters.type) &&
      (filters.franchiseId === undefined ||
        filters.franchiseId === "all" ||
        event.franchises.includes(filters.franchiseId)) &&
      (filters.phase === undefined ||
        filters.phase === "all" ||
        event.phase === filters.phase) &&
      (!query ||
        [event.title, event.summary, ...event.assets]
          .join(" ")
          .toLowerCase()
          .includes(query)),
  );
}
