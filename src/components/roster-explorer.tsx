"use client";

import Link from "next/link";
import { Download, Grid3X3, List, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { rosterSummary } from "@/domain/league-rules";
import { rosterPointsSeason, rosterPointsValue } from "@/domain/roster-points";
import type { Position, RosterPlayer, RosterStatus } from "@/domain/types";
import { Money, PlayerIdentity, StatusBadge } from "./ui";
import { NflTeamMark } from "./team-display";

type Franchise = {
  id: string;
  name: string;
  abbreviation: string;
  division: string;
  owner: string;
  color: string;
  salary: string;
};
type PlayerSort = "alphabetical" | "points" | "salary" | "years";

const positions: Position[] = ["QB", "RB", "WR", "TE", "PK", "DL", "LB", "DB"];
const rosterFranchiseOrder = [
  "canton-legends",
  "tampa-bay-storm",
  "memphis-showboats",
  "new-orleans-thunder",
  "detroit-fury",
  "oklahoma-outlaws",
  "dallas-texans",
  "seattle-rainiers",
  "houston-oilers",
  "quad-city-steamwheelers",
  "new-york-knights",
  "barcelona-dragons",
] as const;
const rosterFranchiseRank = new Map<string, number>(
  rosterFranchiseOrder.map((franchiseId, index) => [franchiseId, index]),
);
const rosterGroups: {
  status: RosterStatus;
  label: string;
  countLabel: string;
}[] = [
  { status: "active", label: "Active Roster", countLabel: "active" },
  {
    status: "injured_reserve",
    label: "Injured Reserve",
    countLabel: "on injured reserve",
  },
  { status: "taxi", label: "Taxi Squad", countLabel: "on taxi squad" },
];

const playerNameCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});
const nameSuffixes = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

function playerLastName(name: string) {
  const parts = name.trim().split(/\s+/);
  const lastPart = parts.at(-1)?.replace(/[.,]/g, "").toLowerCase();
  if (lastPart && nameSuffixes.has(lastPart))
    return parts.at(-2) ?? parts.at(-1) ?? name;
  return parts.at(-1) ?? name;
}

function sortRoster(
  left: RosterPlayer,
  right: RosterPlayer,
  sort: PlayerSort,
  currentWeek: number,
) {
  const positionOrder =
    positions.indexOf(left.position) - positions.indexOf(right.position);
  if (positionOrder !== 0) return positionOrder;
  const alphabetical =
    playerNameCollator.compare(
      playerLastName(left.name),
      playerLastName(right.name),
    ) || playerNameCollator.compare(left.name, right.name);
  if (sort === "points") {
    return (
      Number(rosterPointsValue(right, currentWeek)) -
        Number(rosterPointsValue(left, currentWeek)) || alphabetical
    );
  }
  if (sort === "salary")
    return Number(right.salary) - Number(left.salary) || alphabetical;
  if (sort === "years")
    return right.contractYears - left.contractYears || alphabetical;
  return alphabetical;
}

function TeamRosterSheet({
  franchise,
  players,
  pointsSeason,
  currentWeek,
  playerSort,
}: {
  franchise: Franchise;
  players: RosterPlayer[];
  pointsSeason: number;
  currentWeek: number;
  playerSort: PlayerSort;
}) {
  const summary = rosterSummary(players, {
    cap: "1000",
    irPercent: "100",
    taxiPercent: "100",
  });

  return (
    <article className="league-roster-sheet">
      <header className="league-roster-team-header">
        <span
          className="franchise-mark"
          style={{ background: franchise.color }}
          aria-hidden="true"
        >
          {franchise.abbreviation}
        </span>
        <div>
          <Link href={`/franchises/${franchise.id}`}>{franchise.name}</Link>
          <span>{franchise.owner}</span>
        </div>
      </header>
      <div className="league-roster-table-wrap">
        <table className="league-roster-table">
          <colgroup>
            <col className="league-roster-col-player" />
            <col className="league-roster-col-nfl" />
            <col className="league-roster-col-points" />
            <col className="league-roster-col-bye" />
            <col className="league-roster-col-salary" />
            <col className="league-roster-col-years" />
            <col className="league-roster-col-tags" />
          </colgroup>
          <thead>
            <tr>
              <th>Player</th>
              <th>NFL</th>
              <th>{pointsSeason} Pts</th>
              <th>Bye</th>
              <th>Salary</th>
              <th>Years</th>
              <th>Tags</th>
            </tr>
          </thead>
          {rosterGroups.map((group) => {
            const groupedPlayers = players
              .filter((player) => player.status === group.status)
              .sort((left, right) =>
                sortRoster(left, right, playerSort, currentWeek),
              );
            return (
              <tbody key={group.status}>
                <tr className="league-roster-section-row">
                  <th colSpan={7}>{group.label}</th>
                </tr>
                {groupedPlayers.map((player, index) => (
                  <tr
                    key={player.id}
                    className={
                      index > 0 &&
                      groupedPlayers[index - 1]?.position !== player.position
                        ? "position-divider"
                        : ""
                    }
                  >
                    <td>
                      <PlayerIdentity
                        name={player.name}
                        position={player.position}
                      />
                    </td>
                    <td>
                      <NflTeamMark team={player.team} />
                    </td>
                    <td>{rosterPointsValue(player, currentWeek)}</td>
                    <td>{player.bye || "—"}</td>
                    <td>
                      <Money value={player.salary} />
                    </td>
                    <td>{player.contractYears || "—"}</td>
                    <td>
                      {player.tag ? (
                        <span className="league-roster-tag">{player.tag}</span>
                      ) : (
                        <span className="league-roster-empty">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {groupedPlayers.length === 0 && (
                  <tr className="league-roster-empty-row">
                    <td colSpan={7}>No players in this section</td>
                  </tr>
                )}
                <tr className="league-roster-count-row">
                  <td colSpan={7}>
                    {groupedPlayers.length}{" "}
                    {groupedPlayers.length === 1 ? "player" : "players"}{" "}
                    {group.countLabel}
                  </td>
                </tr>
              </tbody>
            );
          })}
          <tfoot>
            <tr>
              <th colSpan={4}>Roster total</th>
              <td>
                <Money value={summary.salary} />
              </td>
              <td>{summary.contractYears}</td>
              <td>{players.length} players</td>
            </tr>
            <tr>
              <th colSpan={4}>Salary cap room</th>
              <td>
                <Money value={summary.available} />
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </article>
  );
}

export function RosterExplorer({
  players,
  franchises,
  initialFormat,
  season,
  currentWeek,
}: {
  players: RosterPlayer[];
  franchises: Franchise[];
  initialFormat: "full" | "grid";
  season: number;
  currentWeek: number;
}) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState(true);
  const [playerSort, setPlayerSort] = useState<PlayerSort>("alphabetical");
  const pointsSeason = rosterPointsSeason(season, currentWeek);
  const orderedFranchises = [...franchises].sort(
    (left, right) =>
      (rosterFranchiseRank.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (rosterFranchiseRank.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
  const filtered = useMemo(
    () =>
      players.filter(
        (player) =>
          (!position || player.position === position) &&
          `${player.name} ${player.team}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [players, position, query],
  );
  const visibleFranchises = orderedFranchises.filter((team) =>
    filtered.some((player) => player.franchiseId === team.id),
  );

  function csv() {
    const rows = [
      [
        "Franchise",
        "Player",
        "NFL Team",
        "Position",
        `${pointsSeason} Points`,
        "Bye",
        "Salary",
        "Contract Years",
        "Roster Section",
        "Tags",
      ],
      ...filtered.map((player) => [
        player.franchise,
        player.name,
        player.team,
        player.position,
        rosterPointsValue(player, currentWeek),
        player.bye,
        player.salary,
        player.contractYears,
        player.status,
        player.tag ?? "",
      ]),
    ];
    const data = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([data], { type: "text/csv" }));
    anchor.download = `fofl-rosters-${season}.csv`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  return (
    <>
      <div className="filterbar league-roster-controls">
        <Search size={15} />
        <input
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search player or NFL team…"
        />
        <select
          className="select"
          value={playerSort}
          onChange={(event) => setPlayerSort(event.target.value as PlayerSort)}
          aria-label="Sort players"
        >
          <option value="alphabetical">Last name (A–Z)</option>
          <option value="points">Points (high to low)</option>
          <option value="salary">Salary (high to low)</option>
          <option value="years">Years (high to low)</option>
        </select>
        <select
          className="select"
          value={position}
          onChange={(event) => setPosition(event.target.value)}
          aria-label="Position"
        >
          <option value="">All positions</option>
          {positions.map((playerPosition) => (
            <option key={playerPosition}>{playerPosition}</option>
          ))}
        </select>
        <select
          className="select"
          aria-label="Season"
          value={season}
          onChange={() => undefined}
        >
          <option value={season}>{season} season</option>
        </select>
        <div className="format-toggle">
          <Link
            className={initialFormat === "full" ? "active" : ""}
            href="?format=full"
          >
            <List size={14} /> Full
          </Link>
          <Link
            className={initialFormat === "grid" ? "active" : ""}
            href="?format=grid"
          >
            <Grid3X3 size={14} /> Grid
          </Link>
        </div>
        <button className="btn" onClick={csv}>
          <Download size={14} /> CSV
        </button>
      </div>

      {initialFormat === "full" ? (
        visibleFranchises.length ? (
          <div
            className={`league-roster-pair-grid ${visibleFranchises.length === 1 ? "single" : ""}`}
          >
            {visibleFranchises.map((team) => (
              <TeamRosterSheet
                key={team.id}
                franchise={team}
                players={filtered.filter(
                  (player) => player.franchiseId === team.id,
                )}
                pointsSeason={pointsSeason}
                currentWeek={currentWeek}
                playerSort={playerSort}
              />
            ))}
          </div>
        ) : (
          <div className="card league-roster-no-results">
            No roster players match those filters.
          </div>
        )
      ) : (
        <>
          <div className="filterbar">
            <label>
              <input
                type="checkbox"
                checked={salary}
                onChange={(event) => setSalary(event.target.checked)}
              />{" "}
              Show salaries
            </label>
          </div>
          <div className="table-wrap mobile-stack">
            <table>
              <thead>
                <tr>
                  <th>Franchise</th>
                  {positions.map((playerPosition) => (
                    <th key={playerPosition}>{playerPosition}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleFranchises.map((team) => (
                  <tr key={team.id}>
                    <td className="table-franchise">
                      <Link
                        className="player-name"
                        href={`/franchises/${team.id}`}
                      >
                        {team.name}
                      </Link>
                      <div className="subtle">{team.owner}</div>
                    </td>
                    {positions.map((playerPosition) => (
                      <td
                        className="grid-cell"
                        data-label={playerPosition}
                        key={playerPosition}
                      >
                        {filtered
                          .filter(
                            (player) =>
                              player.franchiseId === team.id &&
                              player.position === playerPosition,
                          )
                          .sort((left, right) =>
                            sortRoster(left, right, playerSort, currentWeek),
                          )
                          .map((player) => (
                            <div className="grid-player" key={player.id}>
                              <PlayerIdentity
                                name={player.name}
                                position={player.position}
                              />{" "}
                              {player.status !== "active" && (
                                <StatusBadge status={player.status} />
                              )}
                              <div className="subtle">
                                <NflTeamMark team={player.team} />
                                {salary && (
                                  <>
                                    {" "}
                                    · <Money value={player.salary} />
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
