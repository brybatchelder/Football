import { PageHeader } from "@/components/ui";
import { franchises, leagueClock, roster } from "@/data/demo";
import { RosterExplorer } from "@/components/roster-explorer";
export default async function RostersPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string }>;
}) {
  const format = (await searchParams).format === "grid" ? "grid" : "full";
  return (
    <div className="page">
      <PageHeader
        title="League Rosters"
        description="Contract-aware Week 1 roster reporting across all twelve franchises from the supplied 2026 league report."
      />
      <RosterExplorer
        initialFormat={format}
        players={roster}
        franchises={franchises}
        season={leagueClock.season}
        currentWeek={leagueClock.currentWeek}
      />
    </div>
  );
}
