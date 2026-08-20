"use client";

import Link from "next/link";
import { MoreHorizontal, Newspaper } from "lucide-react";
import { useMemo, useState } from "react";
import type { Position, RosterPlayer, RosterStatus } from "@/domain/types";
import { Money, PositionBadge } from "@/components/ui";
import { NflTeamMark } from "@/components/team-display";

const positions: Position[] = ["QB", "RB", "WR", "TE", "PK", "DL", "LB", "DB"];
const groups: { status: RosterStatus; label: string }[] = [
  { status: "active", label: "Active" },
  { status: "taxi", label: "Taxi" },
  { status: "injured_reserve", label: "IR" },
];
type SortKey =
  "name" | "priorPoints" | "projection" | "bye" | "salary" | "contractYears";

const insightOverrides: Record<
  string,
  { projection?: number; news?: string; nflStatus?: string }
> = {
  "Jalen Hurts": { projection: 331.4, news: "2h" },
  "De'Von Achane": { projection: 319.6, news: "1d", nflStatus: "Q" },
  "Brandon Aiyuk": { projection: 100.3, news: "18m", nflStatus: "H" },
  "Justin Jefferson": { projection: 292.8, news: "14m" },
};

function insight(player: RosterPlayer) {
  const override = insightOverrides[player.name];
  return {
    projection:
      override?.projection ??
      Math.round(Number(player.priorPoints) * 1.06 * 10) / 10,
    news: override?.news ?? "2d",
    nflStatus: override?.nflStatus,
  };
}

export function FranchiseRoster({ players }: { players: RosterPlayer[] }) {
  const [position, setPosition] = useState<Position | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("projection");
  const [descending, setDescending] = useState(true);

  const filtered = useMemo(
    () =>
      players.filter(
        (player) => position === "ALL" || player.position === position,
      ),
    [players, position],
  );

  function sortBy(next: SortKey) {
    if (next === sortKey) setDescending((current) => !current);
    else {
      setSortKey(next);
      setDescending(
        next === "priorPoints" || next === "projection" || next === "salary",
      );
    }
  }

  function sorted(playersInGroup: RosterPlayer[]) {
    return [...playersInGroup].sort((left, right) => {
      const positionDifference =
        positions.indexOf(left.position) - positions.indexOf(right.position);
      if (positionDifference) return positionDifference;

      const leftValue =
        sortKey === "projection" ? insight(left).projection : left[sortKey];
      const rightValue =
        sortKey === "projection" ? insight(right).projection : right[sortKey];
      const result =
        typeof leftValue === "string"
          ? leftValue.localeCompare(String(rightValue), undefined, {
              numeric: true,
            })
          : Number(leftValue) - Number(rightValue);
      return (
        (descending ? -1 : 1) * (result || left.name.localeCompare(right.name))
      );
    });
  }

  return (
    <div className="roster-workspace">
      <div className="position-filter" aria-label="Filter roster by position">
        {(["ALL", ...positions] as const).map((item) => (
          <button
            className={position === item ? "active" : ""}
            key={item}
            type="button"
            onClick={() => setPosition(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {groups.map((group) => {
        const groupPlayers = sorted(
          filtered.filter((player) => player.status === group.status),
        );
        const total = players.filter(
          (player) => player.status === group.status,
        ).length;
        return (
          <section
            className="roster-group"
            id={`roster-${group.status}`}
            key={group.status}
          >
            <div className="roster-group-title">
              <h2>{group.label}</h2>
              <span>{position === "ALL" ? total : groupPlayers.length}</span>
            </div>
            {groupPlayers.length ? (
              <div className="table-wrap">
                <table className="roster-table">
                  <colgroup>
                    <col className="roster-col-player" />
                    <col className="roster-col-pos" />
                    <col className="roster-col-nfl" />
                    <col className="roster-col-points" />
                    <col className="roster-col-projection" />
                    <col className="roster-col-bye" />
                    <col className="roster-col-salary" />
                    <col className="roster-col-years" />
                    <col className="roster-col-status" />
                    <col className="roster-col-news" />
                    <col className="roster-col-actions" />
                  </colgroup>
                  <thead>
                    <tr>
                      <Sortable
                        label="Player"
                        column="name"
                        active={sortKey}
                        descending={descending}
                        onSort={sortBy}
                      />
                      <th>Pos</th>
                      <th>NFL</th>
                      <Sortable
                        label="2025 Pts"
                        column="priorPoints"
                        active={sortKey}
                        descending={descending}
                        onSort={sortBy}
                      />
                      <Sortable
                        label="2026 Proj"
                        column="projection"
                        active={sortKey}
                        descending={descending}
                        onSort={sortBy}
                      />
                      <Sortable
                        label="Bye"
                        column="bye"
                        active={sortKey}
                        descending={descending}
                        onSort={sortBy}
                      />
                      <Sortable
                        label="Salary"
                        column="salary"
                        active={sortKey}
                        descending={descending}
                        onSort={sortBy}
                      />
                      <Sortable
                        label="Years"
                        column="contractYears"
                        active={sortKey}
                        descending={descending}
                        onSort={sortBy}
                      />
                      <th>Status</th>
                      <th>News</th>
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupPlayers.map((player) => {
                      const details = insight(player);
                      return (
                        <tr key={player.id}>
                          <td>
                            <strong className="roster-player-name">
                              {player.name}
                            </strong>
                            <div className="roster-player-flags">
                              {details.nflStatus && (
                                <span
                                  className={`nfl-status nfl-${details.nflStatus.toLowerCase()}`}
                                  title={
                                    details.nflStatus === "H"
                                      ? "Holdout"
                                      : "Questionable"
                                  }
                                >
                                  {details.nflStatus}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <PositionBadge position={player.position} />
                          </td>
                          <td>
                            <b>
                              <NflTeamMark team={player.team} />
                            </b>
                          </td>
                          <td>{player.priorPoints}</td>
                          <td className="projection-cell">
                            {details.projection.toFixed(1)}
                          </td>
                          <td>{player.bye || "—"}</td>
                          <td className="contract-value">
                            <Money value={player.salary} />
                          </td>
                          <td className="contract-value">
                            {player.contractYears || "—"}
                          </td>
                          <td>
                            {player.tag ? (
                              <span className="contract-chip tagged">
                                {player.tag}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <span
                              className={
                                details.news.endsWith("m")
                                  ? "news-fresh"
                                  : "news-age"
                              }
                            >
                              <Newspaper size={13} /> {details.news}
                            </span>
                          </td>
                          <td>
                            <details className="roster-actions">
                              <summary
                                aria-label={`Actions for ${player.name}`}
                              >
                                <MoreHorizontal size={17} />
                              </summary>
                              <div>
                                <Link href="/players/search">View player</Link>
                                {player.status === "active" && (
                                  <Link href="/my-team/lineup">Set lineup</Link>
                                )}
                                <Link href="/transactions/trade-center">
                                  Offer trade
                                </Link>
                              </div>
                            </details>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="roster-empty">
                No {group.label.toLowerCase()} players match this filter.
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Sortable({
  label,
  column,
  active,
  descending,
  onSort,
}: {
  label: string;
  column: SortKey;
  active: SortKey;
  descending: boolean;
  onSort: (key: SortKey) => void;
}) {
  return (
    <th>
      <button
        className="table-sort"
        type="button"
        onClick={() => onSort(column)}
      >
        <span>{label}</span>
        <span className="table-sort-direction" aria-hidden="true">
          {active === column ? (descending ? "↓" : "↑") : ""}
        </span>
      </button>
    </th>
  );
}
