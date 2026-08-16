import { FeatureWorkspace } from "@/components/feature-workspace";
import { PageHeader } from "@/components/ui";
import { franchises, roster } from "@/data/demo";
import { loadPlayerPool } from "@/data/player-pool";
import { currentRole } from "@/auth/permissions";

const descriptions: Record<string, string> = {
  "my-team":
    "Manage Canton like a front office: lineup, contracts, draft capital, competitive window, and franchise history.",
  gameday:
    "Follow every FOFL matchup with live league context, rivalry history, playoff leverage, and record alerts.",
  players:
    "Search and evaluate the player pool with position, contract, salary, projection, and watchlist context.",
  transactions:
    "Find mutually useful deals, manage waivers, and understand every move's roster and cap impact.",
  "draft-auction":
    "Run the rookie draft, auction, RFA, tags, and future-pick ownership from one workspace.",
  league:
    "Understand the league through power rankings, front-office profiles, economics, records, and permanent memory.",
};

const featureNames: Record<string, string> = {
  overview: "Front Office Overview",
  lineup: "Set Lineup",
  contracts: "Contracts & Cap",
  "draft-picks": "Draft Picks",
  history: "History & League Memory",
  "my-matchup": "My Matchup",
  scoreboard: "League Scoreboard",
  live: "Fantasy RedZone",
  playoffs: "Playoff Simulator",
  search: "Player Search",
  "free-agents": "Free Agents",
  rankings: "Player Rankings",
  watchlist: "Watchlist",
  projections: "Projections",
  "trade-center": "Trade Room",
  "add-drop": "Add / Drop",
  "trade-block": "Trade Block",
  "trade-analyzer": "Trade Analyzer",
  "draft-room": "Draft Room",
  "auction-house": "Auction House",
  rfa: "Restricted Free Agency",
  tags: "Franchise & Transition Tags",
  "draft-board": "Draft Board",
  "pick-ownership": "Pick Ownership",
  teams: "League Teams",
  "power-rankings": "Power Rankings",
  records: "League Records",
  rules: "League Rules",
};

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ section: string; slug?: string[] }>;
}) {
  const { section, slug } = await params;
  const role = await currentRole();
  const feature = slug?.[0] ?? defaultFeature(section);
  const playerPool =
    section === "players"
      ? await loadPlayerPool(Number(process.env.MFL_SEASON ?? 2026))
      : { players: roster, source: "fofl-only" as const };
  const description =
    section === "preferences"
      ? "Choose how Football displays league and player information on this device."
      : section === "my-team" && feature === "lineup"
      ? "Set your Week 1 starters. Players lock at their scheduled kickoff."
      : descriptions[section] ?? "FOFL league operations and analysis.";
  const usesContextStripOnly = section === "draft-auction" && feature === "rfa";
  return (
    <div className="page">
      {!usesContextStripOnly && <PageHeader
        eyebrow={section.replaceAll("-", " ")}
        title={section === "preferences" ? "Preferences" : featureNames[feature] ?? titleCase(feature)}
        description={description}
      />}
      <FeatureWorkspace
        section={section}
        feature={feature}
        players={playerPool.players}
        playerPoolSource={playerPool.source}
        franchises={franchises}
        role={role}
      />
    </div>
  );
}

function titleCase(value: string) {
  return value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function defaultFeature(section: string) {
  return (
    {
      "my-team": "overview",
      gameday: "my-matchup",
      players: "search",
      transactions: "trade-center",
      "draft-auction": "draft-room",
      league: "power-rankings",
    }[section] ?? "overview"
  );
}
