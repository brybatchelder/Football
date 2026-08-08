"use client";
import Link from "next/link";
import { Download, Grid3X3, List, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { rosterSummary } from "@/domain/league-rules";
import type { Position, RosterPlayer } from "@/domain/types";
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
const positions: Position[] = ["QB", "RB", "WR", "TE", "PK", "DL", "LB", "DB"];
export function RosterExplorer({
  players,
  franchises,
  initialFormat,
}: {
  players: RosterPlayer[];
  franchises: Franchise[];
  initialFormat: "full" | "grid";
}) {
  const [query, setQuery] = useState("");
  const [franchise, setFranchise] = useState("");
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "position", desc: false },
  ]);
  const filtered = useMemo(
    () =>
      players.filter(
        (p) =>
          (!franchise || p.franchiseId === franchise) &&
          (!position || p.position === position) &&
          `${p.name} ${p.team}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [players, franchise, position, query],
  );
  const selectedFranchise = franchises.find((team) => team.id === franchise);
  const summary = rosterSummary(filtered, {
    cap: "1000",
    irPercent: "100",
    taxiPercent: "100",
  });
  const columns: ColumnDef<RosterPlayer>[] = [
    { accessorKey: "position", header: "Player" },
    { accessorKey: "team", header: "NFL" },
    { accessorKey: "priorPoints", header: "2025 Pts" },
    { accessorKey: "bye", header: "Bye" },
    { accessorKey: "salary", header: "Salary" },
    { accessorKey: "contractYears", header: "Years" },
    { accessorKey: "status", header: "Status" },
    { accessorKey: "tag", header: "Tag" },
  ];
  // TanStack Table intentionally returns callbacks that React Compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  function csv() {
    const rows = [
      [
        "Franchise",
        "Player",
        "NFL Team",
        "Position",
        "Prior Points",
        "Bye",
        "Salary",
        "Contract Years",
        "Roster Status",
        "Tag",
      ],
      ...filtered.map((p) => [
        p.franchise,
        p.name,
        p.team,
        p.position,
        p.priorPoints,
        p.bye,
        p.salary,
        p.contractYears,
        p.status,
        p.tag ?? "",
      ]),
    ];
    const data = rows
      .map((r) =>
        r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: "text/csv" }));
    a.download = "fofl-rosters-2026.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <>
      <div className="filterbar">
        <Search size={15} />
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player or NFL team…"
        />
        <select
          className="select"
          value={franchise}
          onChange={(e) => setFranchise(e.target.value)}
          aria-label="Franchise"
        >
          <option value="">All franchises</option>
          {franchises.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          aria-label="Position"
        >
          <option value="">All positions</option>
          {positions.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select className="select" aria-label="Season">
          <option>2026 season</option>
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
        <>
          <div className="grid-4" style={{ marginBottom: 14 }}>
            <div className="card metric">
              <div className="metric-label">Active / Taxi / IR</div>
              <div className="metric-value">
                {summary.counts.active} / {summary.counts.taxi} /{" "}
                {summary.counts.injured_reserve}
              </div>
            </div>
            <div className="card metric">
              <div className="metric-label">Total salary</div>
              <div className="metric-value">
                <Money value={selectedFranchise?.salary ?? summary.salary} />
              </div>
            </div>
            <div className="card metric">
              <div className="metric-label">Effective salary</div>
              <div className="metric-value">
                <Money value={summary.effective} />
              </div>
            </div>
            <div className="card metric">
              <div className="metric-label">Contract years</div>
              <div className="metric-value">{summary.contractYears}</div>
            </div>
          </div>
          <div className="table-wrap desktop-table">
            <table>
              <thead>
                {table.getHeaderGroups().map((h) => (
                  <tr key={h.id}>
                    {h.headers.map((header) => (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        style={{ cursor: "pointer" }}
                      >
                        {String(header.column.columnDef.header)}{" "}
                        {header.column.getIsSorted() === "asc"
                          ? "↑"
                          : header.column.getIsSorted() === "desc"
                            ? "↓"
                            : ""}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={
                      i > 0 &&
                      table.getRowModel().rows[i - 1]?.original.position !==
                        row.original.position
                        ? "position-divider"
                        : ""
                    }
                  >
                    <td>
                      <PlayerIdentity
                        name={row.original.name}
                        position={row.original.position}
                      />
                      <div className="subtle">{row.original.franchise}</div>
                    </td>
                    <td><NflTeamMark team={row.original.team} /></td>
                    <td>{row.original.priorPoints}</td>
                    <td>{row.original.bye}</td>
                    <td>
                      <Money value={row.original.salary} />
                    </td>
                    <td>{row.original.contractYears || "—"}</td>
                    <td>
                      <StatusBadge status={row.original.status} />
                    </td>
                    <td>
                      {row.original.tag && (
                        <span className="badge badge-blue">
                          {row.original.tag}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card mobile-roster">
            {filtered.map((p) => (
              <div className="roster-card" key={p.id}>
                <div className="roster-card-head">
                  <div>
                    <PlayerIdentity name={p.name} position={p.position} />
                    <div className="subtle">
                      <NflTeamMark team={p.team} /> · Bye {p.bye}
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="roster-card-meta">
                  <span>
                    2025 points<strong>{p.priorPoints}</strong>
                  </span>
                  <span>
                    Salary
                    <strong>
                      <Money value={p.salary} />
                    </strong>
                  </span>
                  <span>
                    Contract
                    <strong>
                      {p.contractYears ? `${p.contractYears} years` : "—"}
                    </strong>
                  </span>
                  <span>
                    Franchise<strong>{p.franchise}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="filterbar">
            <label>
              <input
                type="checkbox"
                checked={salary}
                onChange={(e) => setSalary(e.target.checked)}
              />{" "}
              Show salaries
            </label>
          </div>
          <div className="table-wrap mobile-stack">
            <table>
              <thead>
                <tr>
                  <th>Franchise</th>
                  {positions.map((p) => (
                    <th key={p}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {franchises
                  .filter((f) => !franchise || f.id === franchise)
                  .map((f) => (
                    <tr key={f.id}>
                      <td className="table-franchise">
                        <Link
                          className="player-name"
                          href={`/franchises/${f.id}`}
                        >
                          {f.name}
                        </Link>
                        <div className="subtle">{f.owner}</div>
                      </td>
                      {positions.map((pos) => (
                        <td className="grid-cell" data-label={pos} key={pos}>
                          {filtered
                            .filter(
                              (p) =>
                                p.franchiseId === f.id && p.position === pos,
                            )
                            .map((p) => (
                              <div className="grid-player" key={p.id}>
                                <PlayerIdentity
                                  name={p.name}
                                  position={p.position}
                                />{" "}
                                {p.status !== "active" && (
                                  <StatusBadge status={p.status} />
                                )}
                                <div className="subtle">
                                  <NflTeamMark team={p.team} />
                                  {salary && (
                                    <>
                                      {" "}
                                      · <Money value={p.salary} />
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
