import { PageHeader } from "@/components/ui";
import { franchises, leagueClock } from "@/data/demo";
import { loadPlayerPool } from "@/data/player-pool";
import { RosterExplorer } from "@/components/roster-explorer";
export default async function RostersPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string }>;
}) {
  const format = (await searchParams).format === "grid" ? "grid" : "full";
  const playerPool = await loadPlayerPool(leagueClock.season);
  return (
    <div className="page">
      <PageHeader
        title="League Rosters"
        description="Contract-aware Week 1 roster reporting across all twelve franchises from the supplied 2026 league report."
      />
      <RosterExplorer
        initialFormat={format}
        players={playerPool.players.filter((player) => player.isRostered)}
        franchises={franchises}
        season={leagueClock.season}
        currentWeek={leagueClock.currentWeek}
      />
    </div>
  );
}
