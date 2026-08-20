"use client";

import Link from "next/link";
import { useState } from "react";
import { Money, PageHeader } from "@/components/ui";
import { standings } from "@/data/demo";

const divisions = ["Eastern", "Central", "Western"] as const;
const views = ["Standings", "Playoff Picture", "Advanced", "XTRA"] as const;
type View = (typeof views)[number];

export default function StandingsPage() {
  const [view, setView] = useState<View>("Standings");
  const [scope, setScope] = useState<"Divisions" | "League Overall">(
    "Divisions",
  );

  return (
    <div className="page standings-page">
      <PageHeader
        eyebrow="Front Office Football League"
        title="2026 Standings"
        description="Week 0 · Preseason · 17-game regular season begins September 10"
        actions={
          <Link className="btn" href="/league/rosters?format=full">
            View rosters
          </Link>
        }
      />

      <div
        className="standings-tabs"
        role="tablist"
        aria-label="Standings views"
      >
        {views.map((item) => (
          <button
            aria-selected={view === item}
            className={view === item ? "active" : ""}
            key={item}
            onClick={() => setView(item)}
            role="tab"
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      {view === "Standings" && (
        <StandingsView scope={scope} setScope={setScope} />
      )}
      {view === "Playoff Picture" && <PlayoffPicture />}
      {view === "Advanced" && <AdvancedView />}
      {view === "XTRA" && <XtraBoard />}
    </div>
  );
}

function StandingsView({
  scope,
  setScope,
}: {
  scope: "Divisions" | "League Overall";
  setScope: (scope: "Divisions" | "League Overall") => void;
}) {
  return (
    <>
      <section className="standings-summary" aria-label="Season summary">
        <Summary
          label="#1 Overall"
          value="Preseason tie"
          detail="All 12 teams are 0–0"
        />
        <Summary
          label="Best PF"
          value="Season begins Week 1"
          detail="No scores recorded"
        />
        <Summary
          label="Hottest team"
          value="No streak yet"
          detail="First games September 10"
        />
        <Summary
          label="Playoff field"
          value="6 spots"
          detail="3 division winners · 3 wild cards"
        />
      </section>

      <div className="standings-controls">
        <div className="standings-toggle" aria-label="Standings scope">
          {(["Divisions", "League Overall"] as const).map((option) => (
            <button
              className={scope === option ? "active" : ""}
              key={option}
              onClick={() => setScope(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
        <span>Playoff odds and movement populate after Week 1.</span>
      </div>

      <section className="standings-table-card" aria-label={scope}>
        {scope === "Divisions" ? (
          divisions.map((division) => (
            <DivisionTable
              division={division}
              key={division}
              teams={standings.filter((team) => team.division === division)}
            />
          ))
        ) : (
          <DivisionTable division="League overall" teams={standings} />
        )}
      </section>
    </>
  );
}

function DivisionTable({
  division,
  teams,
}: {
  division: string;
  teams: typeof standings;
}) {
  return (
    <section className="standings-table-section">
      <header>
        <div>
          <h2>{division}</h2>
          <span>
            {division === "League overall"
              ? "All franchises ranked together"
              : `${teams[0]?.name ?? ""} holds the preseason tiebreaker`}
          </span>
        </div>
        {division !== "League overall" && (
          <span className="badge badge-blue">{teams.length} teams</span>
        )}
      </header>
      <div className="table-wrap standings-table-wrap">
        <table className="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>Salary</th>
              <th>VP</th>
              <th>W-L-T</th>
              <th>Div W-L-T</th>
              <th>Streak</th>
              <th>PF</th>
              <th>PA</th>
              <th>Diff</th>
              <th>Playoff</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, index) => (
              <tr
                className={
                  index === 0 && division !== "League overall"
                    ? "division-leader"
                    : ""
                }
                key={team.id}
              >
                <td>{index + 1}</td>
                <td>
                  <Link
                    className="standings-team-link"
                    href={`/franchises/${team.id}`}
                  >
                    <span style={{ background: team.color }}>
                      {team.abbreviation}
                    </span>
                    <strong>{team.name}</strong>
                  </Link>
                </td>
                <td>
                  <Money value={team.salary} />
                </td>
                <td>{team.vp}</td>
                <td>{team.record}</td>
                <td>{team.divisionRecord}</td>
                <td>{team.streak}</td>
                <td>{team.points}</td>
                <td>{team.pointsAgainst}</td>
                <td>—</td>
                <td>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PlayoffPicture() {
  return (
    <div className="standings-feature-grid">
      <section className="standings-feature-card">
        <span className="eyebrow">Current playoff field</span>
        <h2>Seeds unlock after Week 1</h2>
        <p>
          Division leaders and wild cards will appear here as soon as the league
          records its first results.
        </p>
        <ol className="playoff-seed-list">
          {[1, 2, 3, 4, 5, 6].map((seed) => (
            <li key={seed}>
              <strong>{seed}</strong>
              <span>Playoff position open</span>
              <em>—</em>
            </li>
          ))}
        </ol>
      </section>
      <section className="standings-feature-card playoff-bracket-placeholder">
        <span className="eyebrow">If the season ended today</span>
        <h2>Bracket pending</h2>
        <p>
          The projected bracket, byes, first out, and clinching scenarios will
          update weekly once records exist.
        </p>
        <div>
          <span>Division leaders</span>
          <b>3</b>
          <span>Wild cards</span>
          <b>3</b>
        </div>
      </section>
    </div>
  );
}

function AdvancedView() {
  return (
    <section className="standings-table-card advanced-empty-state">
      <span className="eyebrow">Strength beyond the record</span>
      <h2>Advanced standings are ready for Week 1</h2>
      <p>
        All-play record, expected wins, schedule luck, remaining strength of
        schedule, and weekly rank movement will populate after game results are
        imported.
      </p>
      <div className="advanced-metric-preview">
        <span>All-play</span>
        <span>Expected wins</span>
        <span>Schedule luck</span>
        <span>ROS SOS</span>
      </div>
    </section>
  );
}

function XtraBoard() {
  return (
    <section className="standings-board" aria-label="XTRA division board">
      <div className="standings-board-header">
        <div>
          <span className="eyebrow">XTRA view</span>
          <h2>Division race</h2>
        </div>
        <span className="standings-board-key">
          VP · W-L-T · Salary · PF / PA
        </span>
      </div>
      <div className="standings-division-grid">
        {divisions.map((division) => {
          const teams = standings.filter((team) => team.division === division);
          return (
            <section className="standings-division" key={division}>
              <header>
                <h3>{division}</h3>
                <span>{teams.length} teams</span>
              </header>
              <div className="standings-column-labels" aria-hidden>
                <span>Team</span>
                <span>Record</span>
                <span>VP</span>
              </div>
              <ol>
                {teams.map((team, index) => (
                  <li key={team.id}>
                    <span className="standings-rank">{index + 1}</span>
                    <div className="standings-team">
                      <Link
                        className="player-name"
                        href={`/franchises/${team.id}`}
                      >
                        {team.name}
                      </Link>
                      <span>{team.owner}</span>
                    </div>
                    <div className="standings-record">
                      <strong>{team.record}</strong>
                      <span>
                        Div {team.divisionRecord} · {team.streak}
                      </span>
                    </div>
                    <div className="standings-vp">
                      <strong>{team.vp}</strong>
                      <span>VP</span>
                    </div>
                    <div className="standings-detail-row">
                      <span>${team.salary}</span>
                      <span>
                        PF {team.points} · PA {team.pointsAgainst}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function Summary({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
