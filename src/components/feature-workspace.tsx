"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bookmark,
  Check,
  CircleDollarSign,
  Flame,
  GripVertical,
  Newspaper,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppRole, Position, RosterPlayer } from "@/domain/types";
import {
  buildLineupSlots,
  defaultStarterCounts,
  LINEUP_SETTINGS_STORAGE_KEY,
  movePlayerToBench,
  movePlayerToLineupSlot,
  normalizeStarterCounts,
} from "@/domain/lineup-config";
import { lineupFormation } from "@/domain/lineup-formation";
import { contractPortfolio, contractStatus } from "@/domain/contract-portfolio";
import { draftCapital, rookieDraftSalaryRange } from "@/domain/draft-capital";
import { draftPicks, franchises } from "@/data/demo";
import { powerRankings, powerTier } from "@/domain/power-rankings";
import { buildMatchupTeam, matchupWinProbability, scoringSplit } from "@/domain/matchup-model";
import { filterLeagueActivity, leagueActivity, type ActivityType } from "@/domain/league-activity";
import { irEligibility, taxiEligibility } from "@/domain/roster-moves";
import { defensiveRfaPositions, finalizeTagAssignments, franchiseTagOutcomes, franchiseTagValues, offensiveRfaPositions, RFA_MARKET_RULES, rfaAuctionRelationship, rfaResultLabel, rfaRolloverCandidates, validateRfaBid, validateTagAssignments, type RfaResultStatus, type RfaTagChoice, type RfaTagConfirmation } from "@/domain/rfa";
import {
  Card,
  Money,
  PlayerIdentity,
  PositionBadge,
  SlotBadge,
} from "@/components/ui";
import { NflTeamMark, useTeamDisplay } from "@/components/team-display";
import { DraftRoom } from "@/components/draft-room";

type Franchise = {
  id: string;
  name: string;
  abbreviation: string;
  owner: string;
  salary: string;
  division: string;
  color: string;
};

const positionOrder: Position[] = [
  "QB",
  "RB",
  "WR",
  "TE",
  "PK",
  "DL",
  "LB",
  "DB",
];
const featureNames: Record<string, string> = {
  overview: "Front Office Overview",
  lineup: "Set Lineup",
  contracts: "Contracts & Cap",
  "draft-picks": "Draft Picks",
  history: "History & League Memory",
  "my-matchup": "My Matchup",
  scoreboard: "League Scoreboard",
  live: "Fantasy RedZone",
  schedule: "Schedule",
  playoffs: "Playoff Simulator",
  search: "Player Search",
  "free-agents": "Free Agents",
  stats: "Player Stats",
  rankings: "Player Rankings",
  watchlist: "Watchlist",
  projections: "Projections",
  "trade-center": "Trade Room",
  "roster-moves": "Roster Moves",
  "trade-block": "Trade Block",
  activity: "Transaction Activity",
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

export function FeatureWorkspace({
  section,
  feature,
  players,
  franchises,
  role,
}: {
  section: string;
  feature: string;
  players: RosterPlayer[];
  franchises: Franchise[];
  role: AppRole;
}) {
  if (section === "my-team")
    return <MyTeam feature={feature} players={players} />;
  if (section === "gameday") return <GameDay feature={feature} players={players} franchises={franchises} />;
  if (section === "players")
    return <Players feature={feature} players={players} />;
  if (section === "transactions")
    return (
      <Transactions
        feature={feature}
        players={players}
        franchises={franchises}
      />
    );
  if (section === "draft-auction")
    return <DraftAuction feature={feature} franchises={franchises} players={players} role={role} />;
  if (section === "league")
    return <LeagueAnalytics feature={feature} franchises={franchises} players={players} />;
  if (section === "preferences") return <PreferencesWorkspace />;
  return <LeagueAnalytics feature="power-rankings" franchises={franchises} players={players} />;
}

function PreferencesWorkspace() {
  const { mode, setMode } = useTeamDisplay();
  return <div className="preferences-workspace"><Card title="NFL team display"><div className="preference-setting"><div><b>Player team identity</b><p>Use official NFL team logos throughout player tables and cards, or switch back to compact abbreviations.</p></div><div className="preference-options" role="group" aria-label="NFL team display"><button className={mode === "logos" ? "active" : ""} onClick={() => setMode("logos")}><span className="preference-logo-preview"><NflTeamMark team="HOU" modeOverride="logos" /><NflTeamMark team="PHI" modeOverride="logos" /><NflTeamMark team="BAL" modeOverride="logos" /></span><b>Team logos</b><small>Visual identity</small></button><button className={mode === "abbreviations" ? "active" : ""} onClick={() => setMode("abbreviations")}><span className="preference-abbreviation-preview">HOU · PHI · BAL</span><b>Abbreviations</b><small>Most compact</small></button></div><small className="preference-saved">Saved automatically for this browser.</small></div></Card></div>;
}

function MyTeam({
  feature,
  players,
}: {
  feature: string;
  players: RosterPlayer[];
}) {
  const team = players.filter(
    (player) => player.franchiseId === "canton-legends",
  );
  if (feature === "lineup") return <LineupBuilder players={team} />;
  if (feature === "contracts") return <ContractsCap players={team} />;
  if (feature === "draft-picks") return <DraftCapitalInventory />;
  if (feature === "history") return <LeagueMemory />;
  return (
    <div className="stack">
      <div className="grid-4">
        <Metric label="Record" value="7–3" sub="2nd · Central" />
        <Metric label="Power rank" value="#3 ↑2" sub="74.6 power score" />
        <Metric label="Championship odds" value="18%" sub="Playoffs 71%" />
        <Metric
          label="Competitive window"
          value="Contend"
          sub="Strong WR depth"
        />
      </div>
      <div className="dashboard-grid">
        <Card title="Front office assessment">
          <div className="assessment-grid">
            <Assessment label="Strength" value="WR depth" tone="good" />
            <Assessment label="Weakness" value="Aging RB room" tone="warn" />
            <Assessment
              label="Opportunity"
              value="$41 expires after 2026"
              tone="info"
            />
            <Assessment
              label="Risk"
              value="62% of 2027 scoring is age 29+"
              tone="bad"
            />
          </div>
        </Card>
        <Card title="Action center">
          <div className="stack compact">
            <Link className="action-link" href="/my-team/lineup">
              Set Week 1 lineup <ArrowRight size={14} />
            </Link>
            <Link className="action-link" href="/transactions/trade-center">
              Open Trade Room <ArrowRight size={14} />
            </Link>
            <Link className="action-link" href="/my-team/contracts">
              Review expiring contracts <ArrowRight size={14} />
            </Link>
          </div>
        </Card>
      </div>
      <Card title="Roster market value">
        <PlayerTable players={team.slice(0, 10)} salary />
      </Card>
    </div>
  );
}

function ContractsCap({ players }: { players: RosterPlayer[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "expiring" | "multi-year" | "tagged" | "taxi">("all");
  const portfolio = useMemo(() => contractPortfolio(players), [players]);
  const filteredPlayers = useMemo(() => players.filter((player) => {
    const matchesQuery = player.name.toLowerCase().includes(query.toLowerCase()) || player.position.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all" ||
      (filter === "expiring" && player.contractYears === 1) ||
      (filter === "multi-year" && player.contractYears > 1) ||
      (filter === "tagged" && Boolean(player.tag)) ||
      (filter === "taxi" && player.status === "taxi");
    return matchesQuery && matchesFilter;
  }).sort((left, right) => Number(right.salary) - Number(left.salary)), [filter, players, query]);
  const watch = [...players].filter((player) => player.contractYears === 1)
    .sort((left, right) => Number(right.salary) - Number(left.salary)).slice(0, 4);

  return (
    <div className="contracts-workspace">
      <section className="contracts-summary" aria-label="Cap summary">
        <ContractMetric label="Salary cap" value={<Money value={portfolio.cap} />} sub="2026 league cap" />
        <ContractMetric label="Committed" value={<Money value={portfolio.committed} />} sub="Active contracts" />
        <ContractMetric label="Cap space" value={<Money value={portfolio.available} />} sub="Before pending moves" />
        <ContractMetric label="Dead cap" value="$0.00" sub="No imported dead cap" />
        <ContractMetric label="Contract years used" value={portfolio.contractYearsUsed} sub={`of ${portfolio.contractYearsUsed + portfolio.contractYearsAvailable}`} />
        <ContractMetric label="Years available" value={portfolio.contractYearsAvailable} sub="Remaining capacity" />
        <ContractMetric label="Active contracts" value={portfolio.playersUnderContract} sub="Rostered players" />
      </section>

      <section className="contract-outlook" aria-label="Future cap outlook">
        <header><div><span className="eyebrow">Cap outlook</span><h2>Future commitments</h2></div><small>Future cap held flat at the current $1,000 limit</small></header>
        <div>{portfolio.future.map((year) => <article key={year.year}><strong>{year.year}</strong><span>Committed <Money value={year.committed} /></span><span>Space <Money value={year.available} /></span><small>{year.players} players under contract</small><i style={{ width: `${Math.min(100, Number(year.committed) / 10)}%` }} /></article>)}</div>
      </section>

      <div className="contracts-main-grid">
        <section className="contracts-table-card">
          <header><div><span className="eyebrow">Contract portfolio</span><h2>Contracts & cap</h2></div><input aria-label="Search contracts" className="input" onChange={(event) => setQuery(event.target.value)} placeholder="Search player or position" value={query} /></header>
          <div className="contract-filter-row">{(["all", "expiring", "multi-year", "tagged", "taxi"] as const).map((item) => <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)} type="button">{item === "all" ? "All" : item === "multi-year" ? "Multi-year" : item[0].toUpperCase() + item.slice(1)}</button>)}</div>
          <div className="table-wrap contracts-table-wrap"><table className="contracts-table"><thead><tr><th>Player</th><th>Pos</th><th>NFL</th><th>Salary</th><th>Years</th><th>Status</th><th>Expires</th><th>2025 Pts</th><th>2026 Proj</th><th>Value</th><th>Actions</th></tr></thead><tbody>{filteredPlayers.map((player) => { const status = contractStatus(player); return <tr key={player.id}><td><Link className="player-name" href={`/franchises/${player.franchiseId}`}>{player.name}</Link></td><td><PositionBadge position={player.position} /></td><td><NflTeamMark team={player.team} /></td><td><Money value={player.salary} /></td><td>{player.contractYears || "—"}</td><td><span className={`contract-status ${status.toLowerCase().replace("-", "")}`}>{status}</span></td><td>{player.contractYears ? 2025 + player.contractYears : "—"}</td><td>{player.priorPoints}</td><td>{lineupDisplay(player).projection}</td><td>—</td><td><details className="roster-actions"><summary aria-label={`Actions for ${player.name}`}>•••</summary><div><Link href={`/franchises/${player.franchiseId}`}>View player</Link><Link href="/transactions/trade-center">Explore trade</Link></div></details></td></tr>; })}</tbody></table></div>
        </section>
        <aside className="contracts-context">
          <Card title="Contract watch"><ul className="contract-watch-list">{watch.map((player) => <li key={player.id}><div><strong>{player.name}</strong><span><Money value={player.salary} /> · 1 year remaining</span></div><PositionBadge position={player.position} /></li>)}</ul></Card>
          <Card title="Cap alerts"><ul className="contract-alert-list"><li><b>{watch.length}</b><span>contracts expire after 2026</span></li><li><b>✓</b><span><Money value={portfolio.available} /> cap space available</span></li><li><b>{portfolio.contractYearsAvailable}</b><span>contract years remain</span></li></ul></Card>
          <Card title="Expiring contracts"><div className="expiration-chips">{portfolio.expirations.map((expiration) => <button key={expiration.year} onClick={() => { setFilter("expiring"); setQuery(""); }} type="button"><strong>{expiration.year}</strong><span>{expiration.players} players · <Money value={expiration.salary} /></span></button>)}</div></Card>
        </aside>
      </div>

      <div className="contracts-bottom-grid">
        <Card title="Position spend"><div className="position-spend-grid">{portfolio.positionSpend.map((entry) => <div key={entry.position}><PositionBadge position={entry.position} /><strong><Money value={entry.salary} /></strong><span>{entry.percent}% of committed salary</span></div>)}</div></Card>
        <Card title="Tag management"><p className="subtle">No franchise or transition tags are assigned in the imported 2026 roster. Tag eligibility and deadlines will appear here when league-phase data is available.</p></Card>
      </div>
    </div>
  );
}

function ContractMetric({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return <div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>;
}

function LineupBuilder({ players }: { players: RosterPlayer[] }) {
  const [lineupSlots, setLineupSlots] = useState(() =>
    buildLineupSlots(defaultStarterCounts),
  );
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const draggedPlayerIdRef = useRef<string | null>(null);

  useEffect(() => {
    function applySavedRules() {
      try {
        const savedRules = window.localStorage.getItem(
          LINEUP_SETTINGS_STORAGE_KEY,
        );
        const counts = savedRules
          ? normalizeStarterCounts(JSON.parse(savedRules))
          : defaultStarterCounts;
        const slots = buildLineupSlots(counts);
        const used = new Set<string>();
        const nextAssignments = Object.fromEntries(
          slots.map((slot) => {
            const player = players.find(
              (candidate) =>
                candidate.status === "active" &&
                slot.eligible.includes(candidate.position) &&
                !used.has(candidate.id),
            );
            if (player) used.add(player.id);
            return [slot.key, player?.id ?? ""];
          }),
        );
        setLineupSlots(slots);
        setAssignments(nextAssignments);
      } catch {
        setLineupSlots(buildLineupSlots(defaultStarterCounts));
      }
    }

    applySavedRules();
    window.addEventListener("football:lineup-settings-changed", applySavedRules);
    return () =>
      window.removeEventListener(
        "football:lineup-settings-changed",
        applySavedRules,
      );
  }, [players]);

  useEffect(() => {
    if (!selectedPlayerId) return;

    function clearSelectionOnOutsideClick(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Element &&
        !target.closest("[data-lineup-player], [data-lineup-target]")
      ) {
        setSelectedPlayerId(null);
      }
    }

    document.addEventListener("pointerdown", clearSelectionOnOutsideClick, true);
    return () =>
      document.removeEventListener(
        "pointerdown",
        clearSelectionOnOutsideClick,
        true,
      );
  }, [selectedPlayerId]);
  const assigned = new Set(Object.values(assignments).filter(Boolean));
  const bench = players.filter(
    (p) => p.status === "active" && !assigned.has(p.id),
  ).sort(
    (left, right) => {
      const positionDifference =
        positionOrder.indexOf(left.position) - positionOrder.indexOf(right.position);
      return positionDifference ||
        Number(lineupDisplay(right).projection) - Number(lineupDisplay(left).projection);
    },
  );
  const statusGroups = [
    ["BENCH", bench],
    ["IR", players.filter((p) => p.status === "injured_reserve")],
    ["TAXI", players.filter((p) => p.status === "taxi")],
  ] as const;
  const selectedStarterSlot = lineupSlots.find(
    (slot) => assignments[slot.key] === selectedPlayerId,
  );

  function canMovePlayerToSlot(playerId: string | null, slotKey: string) {
    const player = players.find((candidate) => candidate.id === playerId);
    const targetSlot = lineupSlots.find((slot) => slot.key === slotKey);
    return Boolean(
      player &&
        targetSlot &&
        assignments[targetSlot.key] !== player.id &&
        targetSlot.eligible.includes(player.position),
    );
  }
  const aiyukStarting = assigned.has(
    players.find((player) => player.name === "Brandon Aiyuk")?.id ?? "",
  );
  const jeffersonBenched = bench.some(
    (player) => player.name === "Justin Jefferson",
  );

  function placePlayer(playerId: string, slotKey: string) {
    setAssignments((current) =>
      movePlayerToLineupSlot(
        current,
        lineupSlots,
        players,
        playerId,
        slotKey,
      ),
    );
    setSaved(false);
    setSelectedPlayerId(null);
    draggedPlayerIdRef.current = null;
    setDraggedPlayerId(null);
  }

  function benchPlayer(playerId: string) {
    setAssignments((current) => movePlayerToBench(current, playerId));
    setSaved(false);
    setSelectedPlayerId(null);
    draggedPlayerIdRef.current = null;
    setDraggedPlayerId(null);
  }

  function startDrag(event: React.DragEvent, playerId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", playerId);
    draggedPlayerIdRef.current = playerId;
    setDraggedPlayerId(playerId);
  }

  function endDrag() {
    draggedPlayerIdRef.current = null;
    setDraggedPlayerId(null);
  }

  const startersSet = Object.values(assignments).filter(Boolean).length;
  const assignedStarters = lineupSlots.flatMap((slot) => {
      const player = players.find(
        (candidate) => candidate.id === assignments[slot.key],
      );
      return player ? [{ position: player.position, slot: slot.label }] : [];
    });
  const formation = lineupFormation(assignedStarters);

  return (
    <div className="stack lineup-workspace">
      <section className="lineup-matchup-strip" aria-label="Week 1 matchup">
        <div>
          <span>Canton Legends</span>
          <strong>7–3</strong>
          <small>131.8 projected</small>
        </div>
        <div className="lineup-matchup-center">
          <span>Week 1</span>
          <strong>61% win probability</strong>
          <i aria-hidden />
          <small>{startersSet} / {lineupSlots.length} starters set · Locks Thu 7:15 PM</small>
        </div>
        <div className="lineup-matchup-away">
          <span>Detroit Fury</span>
          <strong>6–4</strong>
          <small>126.4 projected</small>
        </div>
      </section>
      <div className="lineup-formation-strip" aria-label="Current lineup formations">
        <div>
          <span>Offense</span>
          <strong>{formation.offense.name}</strong>
          <small>{formation.offense.personnel}</small>
        </div>
        <div>
          <span>Defense</span>
          <strong>{formation.defense.name}</strong>
          <small>{formation.defense.personnel}</small>
        </div>
      </div>
      <div className="dashboard-grid">
      <Card
        title={`Starters · ${startersSet} / ${lineupSlots.length} set`}
        action={<span className="badge badge-active">Locks Thu · 7:15 PM</span>}
      >
        <p className="lineup-instructions">
          Click a player, then click an eligible slot—or drag and drop.
        </p>
        {aiyukStarting && jeffersonBenched && (
          <div className="lineup-warning" role="status">
            <strong>Lineup check</strong>
            Justin Jefferson is projected 8.6 points above Brandon Aiyuk on your bench.
          </div>
        )}
        <div className="lineup-list">
          {lineupSlots.map((slot) => {
            const player = players.find(
              (candidate) => candidate.id === assignments[slot.key],
            );
            const canAcceptDrag = canMovePlayerToSlot(draggedPlayerId, slot.key);
            const canAcceptSelection = canMovePlayerToSlot(selectedPlayerId, slot.key);
            return (
              <div
                className={`lineup-row ${canAcceptDrag || canAcceptSelection ? "can-drop" : ""}`}
                key={slot.key}
                onDragOver={(event) => {
                  const playerId =
                    event.dataTransfer.getData("text/plain") ||
                    draggedPlayerIdRef.current;
                  if (canMovePlayerToSlot(playerId, slot.key)) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const playerId =
                    event.dataTransfer.getData("text/plain") ||
                    draggedPlayerIdRef.current;
                  if (playerId && canMovePlayerToSlot(playerId, slot.key)) {
                    placePlayer(playerId, slot.key);
                  }
                }}
              >
                <SlotBadge slot={slot.label} />
                <button
                  className={`lineup-player-button ${
                    player?.id === selectedPlayerId ? "selected" : ""
                  }`}
                  type="button"
                  data-lineup-player={player ? "true" : undefined}
                  data-lineup-target={canAcceptSelection ? "true" : undefined}
                  draggable={Boolean(player)}
                  onDragStart={(event) => {
                    if (player) startDrag(event, player.id);
                  }}
                  onDragEnd={endDrag}
                  onClick={() => {
                    if (selectedPlayerId && canAcceptSelection) {
                      placePlayer(selectedPlayerId, slot.key);
                    } else if (selectedPlayerId) {
                      setSelectedPlayerId(null);
                    } else if (player) {
                      setSelectedPlayerId((current) =>
                        current === player.id ? null : player.id,
                      );
                    }
                  }}
                  aria-label={`${slot.label} starter: ${player?.name ?? "empty"}`}
                >
                  {player ? <GripVertical size={15} aria-hidden /> : null}
                  {player ? (
                    <PlayerLineupDetails player={player} />
                  ) : (
                    <span className="lineup-empty-slot">
                      <strong>Empty slot</strong>
                      <small>Accepts {slot.eligible.join(" / ")}</small>
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
        <button
          className="btn btn-primary lineup-save"
          onClick={() => setSaved(true)}
        >
          {saved ? <Check size={15} /> : null}
          {saved ? "Lineup saved" : "Save lineup"}
        </button>
      </Card>
      <div className="stack">
        {statusGroups.map(([slot, group]) => (
          <Card title={`${slot} · ${group.length}`} key={slot} className={slot === "BENCH" ? "lineup-bench-card" : "lineup-reserve-card"}>
            <div
              className={`mini-player-list ${slot === "BENCH" ? "bench-drop-zone is-scrollable" : ""}`}
              onDragOver={(event) => {
                if (slot === "BENCH" && (draggedPlayerId || draggedPlayerIdRef.current)) event.preventDefault();
              }}
              onDrop={(event) => {
                if (slot !== "BENCH") return;
                event.preventDefault();
                const playerId =
                  event.dataTransfer.getData("text/plain") ||
                  draggedPlayerIdRef.current;
                if (playerId) benchPlayer(playerId);
              }}
            >
              {slot === "BENCH" && (
                <div className="bench-target-button">Drop a starter here to bench them</div>
              )}
              {group.map((player) =>
                slot === "BENCH" ? (
                  <button
                    className={`bench-player-button ${
                      player.id === selectedPlayerId ? "selected" : ""
                    } ${
                      selectedStarterSlot?.eligible.includes(player.position)
                        ? "eligible-target"
                        : ""
                    }`}
                    type="button"
                    data-lineup-player="true"
                    draggable
                    key={player.id}
                    onDragStart={(event) => startDrag(event, player.id)}
                    onDragEnd={endDrag}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (
                        selectedStarterSlot?.eligible.includes(player.position)
                      ) {
                        placePlayer(player.id, selectedStarterSlot.key);
                        return;
                      }
                      if (selectedStarterSlot) {
                        setSelectedPlayerId(null);
                        return;
                      }
                      setSelectedPlayerId((current) =>
                        current === player.id ? null : player.id,
                      );
                    }}
                    aria-pressed={player.id === selectedPlayerId}
                  >
                    <GripVertical size={14} aria-hidden />
                    <PlayerLineupDetails player={player} />
                  </button>
                ) : (
                  <div className="reserve-player-row" key={player.id}>
                    <SlotBadge slot={slot} />
                    <PlayerLineupDetails player={player} />
                  </div>
                ),
              )}
              {!group.length && (
                <span className="subtle">No players in this group.</span>
              )}
            </div>
          </Card>
        ))}
      </div>
      </div>
    </div>
  );
}

type LineupDisplay = {
  opponent: string;
  kickoff: string;
  projection: string;
  rank: string;
  started: string;
  news: string;
  injury?: "Q" | "D" | "O";
};

const lineupOverrides: Record<string, Partial<LineupDisplay>> = {
  "Jalen Hurts": { opponent: "vs WAS", kickoff: "Sun 3:25", projection: "23.9", rank: "QB8", started: "90%", news: "2d", injury: "Q" },
  "Tyler Shough": { opponent: "@ DET", kickoff: "Sun 12:00", projection: "20.0", rank: "QB19", started: "37%", news: "3d" },
  "Derrick Henry": { projection: "16.8", rank: "RB11", started: "82%", news: "5h" },
  "Justin Jefferson": { projection: "14.5", rank: "WR9", started: "76%", news: "14m" },
  "Brandon Aiyuk": { projection: "5.9", rank: "WR89", started: "0%", news: "18m", injury: "Q" },
};

function lineupDisplay(player: RosterPlayer): LineupDisplay {
  const projected = Math.max(2.1, Number(player.priorPoints) / 17).toFixed(1);
  return {
    opponent: player.team === "PHI" ? "vs WAS" : player.team === "NOS" ? "@ DET" : "vs TBD",
    kickoff: player.team === "PHI" ? "Sun 3:25" : "Sun 12:00",
    projection: projected,
    rank: `${player.position}${Math.max(8, Math.round(100 - Number(projected) * 3))}`,
    started: `${Math.min(91, Math.max(0, Math.round(Number(projected) * 4)))}%`,
    news: "2d",
    ...lineupOverrides[player.name],
  };
}

function PlayerLineupDetails({ player }: { player: RosterPlayer }) {
  const display = lineupDisplay(player);
  const injuryLabels = { Q: "Questionable", D: "Doubtful", O: "Out" };
  const hasFreshNews = display.news === "14m" || display.news === "18m";
  return (
    <span className="lineup-player-details">
      <span className="lineup-player-primary">
        <PositionBadge position={player.position} />
        <strong>{player.name}</strong>
        <small><NflTeamMark team={player.team} /> {display.opponent} · {display.kickoff}</small>
      </span>
      <span className="lineup-player-secondary">
        {display.injury && <span className={`injury-status injury-${display.injury.toLowerCase()}`} title={injuryLabels[display.injury]}>{display.injury}</span>}
        <span className="bye-label">BYE {player.bye}</span>
        <b>{display.projection} <small>proj</small></b>
        <span>{display.rank}</span>
        <span>{display.started} <small>start</small></span>
        <span className={hasFreshNews ? "fresh-news" : ""}><Newspaper size={12} aria-hidden /> {display.news}</span>
      </span>
    </span>
  );
}

function Players({
  feature,
  players,
}: {
  feature: string;
  players: RosterPlayer[];
}) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const shown = useMemo(
    () =>
      players.filter(
        (p) =>
          (!query ||
            `${p.name} ${p.team} ${p.franchise}`
              .toLowerCase()
              .includes(query.toLowerCase())) &&
          (!position || p.position === position) &&
          (feature !== "free-agents" || Number(p.salary) < 20) &&
          (feature !== "watchlist" || watchlist.includes(p.id)),
      ),
    [players, query, position, feature, watchlist],
  );
  return (
    <div className="stack">
      <div className="filterbar">
        <Search size={16} />
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player, NFL team, or franchise…"
        />
        <select
          className="select"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          aria-label="Filter position"
        >
          <option value="">All positions</option>
          {positionOrder.map((pos) => (
            <option key={pos}>{pos}</option>
          ))}
        </select>
        <span className="badge">{shown.length} results</span>
      </div>
      <Card title={featureNames[feature] ?? "Player database"}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th>2025 Pts</th>
                <th>Salary</th>
                <th>Contract</th>
                <th>Watch</th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 40).map((p) => (
                <tr key={p.id}>
                  <td>
                    <PlayerIdentity name={p.name} position={p.position} />
                  </td>
                  <td><NflTeamMark team={p.team} /></td>
                  <td>{p.priorPoints}</td>
                  <td>
                    <Money value={p.salary} />
                  </td>
                  <td>{p.contractYears || "—"}</td>
                  <td>
                    <button
                      className={`icon-button table-action ${watchlist.includes(p.id) ? "selected" : ""}`}
                      aria-label={`Watch ${p.name}`}
                      onClick={() =>
                        setWatchlist((current) =>
                          current.includes(p.id)
                            ? current.filter((id) => id !== p.id)
                            : [...current, p.id],
                        )
                      }
                    >
                      <Bookmark size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Transactions({
  feature,
  players,
  franchises,
}: {
  feature: string;
  players: RosterPlayer[];
  franchises: Franchise[];
}) {
  const myPlayers = players.filter((p) => p.franchiseId === "canton-legends");
  const [need, setNeed] = useState<Position>("RB");
  const candidates = players
    .filter((p) => p.position === need && p.franchiseId !== "canton-legends")
    .sort((a, b) => Number(b.priorPoints) - Number(a.priorPoints));
  const [target, setTarget] = useState("");
  const [offer, setOffer] = useState("");
  const targetPlayer = candidates.find((p) => p.id === target) ?? candidates[0];
  const offerPlayer =
    myPlayers.find((p) => p.id === offer) ??
    myPlayers.find((p) => p.position === "WR") ??
    myPlayers[0];
  if (feature === "activity") return <ActivityWorkspace franchises={franchises} />;
  if (feature === "trade-center") return <TradeRoom players={players} franchises={franchises} />;
  if (feature === "trade-block") return <TradeBlock players={players} franchises={franchises} />;
  if (feature === "roster-moves") return <RosterMoves players={players} />;
  if (feature !== "trade-center" && feature !== "trade-analyzer") {
    return <TransactionQueue feature={feature} players={players} />;
  }
  const partner = franchises.find((f) => f.id === targetPlayer?.franchiseId);
  return (
    <div className="dashboard-grid">
      <div className="stack">
        <Card title="Build a trade framework">
          <div className="form-grid">
            <div className="field">
              <label>I need</label>
              <select
                className="select"
                value={need}
                onChange={(e) => {
                  setNeed(e.target.value as Position);
                  setTarget("");
                }}
              >
                {positionOrder.map((pos) => (
                  <option key={pos}>{pos}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>I can move</label>
              <select
                className="select"
                value={offerPlayer?.id}
                onChange={(e) => setOffer(e.target.value)}
              >
                {myPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.position} · {p.name} · ${p.salary}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Target player</label>
              <select
                className="select"
                value={targetPlayer?.id}
                onChange={(e) => setTarget(e.target.value)}
              >
                {candidates.slice(0, 20).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.franchise}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Pick sweetener</label>
              <select className="select">
                <option>2027 Round 2</option>
                <option>No draft pick</option>
                <option>2028 Round 1</option>
              </select>
            </div>
          </div>
        </Card>
        {targetPlayer && offerPlayer && (
          <Card title="Recommended framework">
            <div className="trade-sides">
              <div>
                <span className="metric-label">You receive</span>
                <PlayerIdentity
                  name={targetPlayer.name}
                  position={targetPlayer.position}
                />
                <span className="subtle">
                  {targetPlayer.franchise} ·{" "}
                  <Money value={targetPlayer.salary} />
                </span>
              </div>
              <ArrowRight size={22} />
              <div>
                <span className="metric-label">They receive</span>
                <PlayerIdentity
                  name={offerPlayer.name}
                  position={offerPlayer.position}
                />
                <span className="subtle">2027 Round 2 included</span>
              </div>
            </div>
            <div className="trade-impact">
              <Assessment
                label="Lineup impact"
                value="+4.7 projected points/week"
                tone="good"
              />
              <Assessment
                label="Cap impact"
                value={`$${(Number(targetPlayer.salary) - Number(offerPlayer.salary)).toFixed(0)} this season`}
                tone="info"
              />
              <Assessment label="Title odds" value="18% → 23%" tone="good" />
            </div>
            <button className="btn btn-primary">
              Start trade conversation
            </button>
          </Card>
        )}
      </div>
      <div className="stack">
        <Card title="Why this partner fits">
          <p className="feature-copy">
            <strong>{partner?.name}</strong> has {need} depth, limited cap
            flexibility, and a need at {offerPlayer?.position}. Their
            replacement loses only 2.1 projected points per week.
          </p>
        </Card>
        <Card title="Owner tendency">
          <p className="feature-copy">
            {partner?.owner} completes 63% of trades within 48 hours of another
            move and has paid above market for veteran receivers.
          </p>
        </Card>
      </div>
    </div>
  );
}

function RosterMoves({ players }: { players: RosterPlayer[] }) {
  const team = players.filter((player) => player.franchiseId === "canton-legends");
  const [view, setView] = useState<"active" | "taxi" | "injured_reserve">("active"); const [selected, setSelected] = useState<RosterPlayer | null>(null); const [staged, setStaged] = useState<string[]>([]);
  const active = team.filter((player) => player.status === "active"); const taxi = team.filter((player) => player.status === "taxi"); const ir = team.filter((player) => player.status === "injured_reserve"); const shown = team.filter((player) => player.status === view);
  const selectedTaxi = selected ? taxiEligibility({ nflExperience: selected.status === "taxi" ? 0 : undefined, contractYears: selected.contractYears, taxiSlotsOpen: Math.max(0, 6 - taxi.length) }) : null;
  const selectedIr = selected ? irEligibility({ nflDesignation: selected.status === "injured_reserve" ? "IR" : undefined, irSlotsOpen: Math.max(0, 4 - ir.length) }) : null;
  return <div className="roster-moves-workspace"><section className="roster-moves-header"><div><span className="eyebrow">Franchise status management</span><h2>Roster Moves</h2><p>Manage Active, Taxi, IR, and player releases.</p></div><div className="roster-move-counts"><span><b>{active.length}</b> / 42<small>Active</small></span><span><b>{taxi.length}</b> / 6<small>Taxi</small></span><span><b>{ir.length}</b> / 4<small>IR</small></span></div></section><section className="roster-move-tabs">{(["active", "taxi", "injured_reserve"] as const).map((status) => <button className={view === status ? "active" : ""} onClick={() => { setView(status); setSelected(null); }} key={status}>{status === "injured_reserve" ? "IR" : status}</button>)}<span>Choose a player to see only legal moves.</span></section><div className="roster-moves-layout"><Card title={`${view === "injured_reserve" ? "Injured Reserve" : view === "taxi" ? "Taxi Squad" : "Active Roster"} · ${shown.length} players`} action={<span className="matchup-view-label">Eligibility-first</span>}><div className="roster-move-table">{shown.map((player) => { const taxiRule = taxiEligibility({ nflExperience: player.status === "taxi" ? 0 : undefined, contractYears: player.contractYears, taxiSlotsOpen: Math.max(0, 6 - taxi.length) }); return <button className={selected?.id === player.id ? "selected" : ""} key={player.id} onClick={() => setSelected(player)}><PlayerIdentity name={player.name} position={player.position} /><span><NflTeamMark team={player.team} /></span><span>{player.status === "taxi" ? "Rookie / experience pending" : "Experience pending"}</span><span>{player.status === "taxi" ? "No contract · Taxi" : `${player.contractYears} yrs · $${player.salary}`}</span><span className={`roster-eligibility ${taxiRule.allowed ? "yes" : ""}`}>{player.status === "taxi" ? "Taxi" : taxiRule.reason.includes("Contracted") ? "Taxi locked" : "Experience pending"}</span><i>Manage</i></button>; })}{shown.length === 0 && <div className="activity-no-results">No players in this roster group. IR moves will appear when an NFL IR designation is imported.</div>}</div></Card><aside className="roster-move-drawer">{selected ? <><Card title="Player move details"><div className="roster-selected"><PlayerIdentity name={selected.name} position={selected.position} /><span><NflTeamMark team={selected.team} /> · {selected.status === "taxi" ? "Taxi" : selected.status === "injured_reserve" ? "IR" : "Active"}</span><span>Contract: <b>{selected.status === "taxi" ? "None — Taxi" : `${selected.contractYears} years`}</b></span><span>Salary: <b><Money value={selected.salary} /></b></span></div><div className="roster-rule-list"><span><b>Assign to Taxi</b><small>{selectedTaxi?.reason}</small></span><span><b>Move to IR</b><small>{selectedIr?.reason}</small></span><span><b>Release</b><small>Available with cap impact calculated at confirmation.</small></span></div><div className="roster-move-actions">{selected.status === "taxi" && <button className="btn btn-primary" onClick={() => setStaged((moves) => [...moves, `Activate ${selected.name} from Taxi · contract required`])}>Stage Taxi activation</button>}<button className="btn" disabled={!selectedIr?.allowed}>Move to IR</button><button className="btn" onClick={() => setStaged((moves) => [...moves, `Release ${selected.name}`])}>Stage release</button></div></Card></> : <Card title="Select a player"><p className="feature-copy">Choose a rostered player to see status, eligibility, and legal actions. Healthy players cannot be placed on IR; contracted players cannot return to Taxi.</p></Card>}<Card title="Roster validation"><div className="roster-validation"><span>✓ Active roster tracked</span><span>✓ Taxi roster tracked</span><span>✓ Salary cap context available</span><span>• NFL injury designations pending feed</span></div></Card>{staged.length > 0 && <Card title={`Staged moves · ${staged.length}`}><div className="staged-moves">{staged.map((move) => <span key={move}>{move}</span>)}</div><button className="btn btn-primary">Review {staged.length} moves</button></Card>}</aside></div></div>;
}

function TradeBlock({ players, franchises }: { players: RosterPlayer[]; franchises: Franchise[] }) {
  const listings = useMemo(() => {
    const named = ["Tony Pollard", "Brandon Aiyuk", "Fred Warner", "Terry McLaurin", "Kayvon Thibodeaux", "George Kittle"];
    return named.map((name, index) => { const player = players.find((item) => item.name === name)!; return { player, availability: index % 2 ? "Listening" : "Available", note: index % 2 ? "Open to offers for an upgrade or future capital." : "Looking for a younger WR, LB, or 2027 draft capital.", wants: index % 2 ? ["Upgrade", "Draft Picks"] : ["WR", "LB", "2027 Picks"], listed: `${index + 1}d ago` }; }).filter((item) => item.player);
  }, [players]);
  const [view, setView] = useState<"all" | "players" | "picks" | "needs" | "mine">("all"); const [query, setQuery] = useState(""); const [position, setPosition] = useState("all");
  const shown = listings.filter((listing) => (view === "all" || view === "players" || view === "mine" && listing.player.franchiseId === "canton-legends") && (position === "all" || listing.player.position === position) && `${listing.player.name} ${listing.player.franchise} ${listing.player.team}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="trade-block-workspace"><section className="trade-block-header"><div><span className="eyebrow">League marketplace</span><h2>Trade Block</h2><p>See who&apos;s available, what franchises need, and where deals might be waiting.</p></div><Link className="btn btn-primary" href="/transactions/trade-center">Manage my trade block</Link></section><div className="trade-block-metrics"><Metric label="Players listed" value={`${listings.length}`} sub="Available or listening" /><Metric label="Picks listed" value="1" sub="2027 Tampa Bay 1st" /><Metric label="Franchises shopping" value={`${new Set(listings.map((listing) => listing.player.franchiseId)).size}`} sub="Published needs" /><Metric label="New this week" value="—" sub="Activity ledger pending" /></div><section className="trade-block-controls"><div className="trade-block-tabs">{(["all", "players", "picks", "needs", "mine"] as const).map((item) => <button className={view === item ? "active" : ""} key={item} onClick={() => setView(item)}>{item === "all" ? "All assets" : item === "mine" ? "My block" : item === "needs" ? "Team needs" : item[0].toUpperCase() + item.slice(1)}</button>)}</div><div><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player, franchise, NFL team" /><select className="select" value={position} onChange={(event) => setPosition(event.target.value)}><option value="all">All positions</option>{positionOrder.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></section><div className="trade-block-layout"><section className="trade-listings">{view !== "needs" && shown.map((listing) => <TradeListing key={listing.player.id} listing={listing} franchises={franchises} />)}{(view === "all" || view === "picks") && <TradePickListing franchises={franchises} />}{view === "needs" && <TeamNeeds franchises={franchises} />}{shown.length === 0 && view !== "picks" && <div className="activity-no-results">No listed assets match those filters.</div>}</section><aside className="trade-block-rail"><Card title="Matches for you"><p className="feature-copy"><strong>{listings.filter((listing) => listing.wants.includes("WR") || listing.wants.includes("LB")).length} listings</strong> are seeking WR, LB, or future draft capital—the needs Canton can explore in Trade Room.</p></Card><Card title="New on the block"><div className="trade-block-new">{listings.slice(0, 3).map((listing) => <span key={listing.player.id}><PositionBadge position={listing.player.position} /><b>{listing.player.name}</b><small>{listing.player.franchise} · {listing.listed}</small></span>)}</div></Card><Card title="Your needs"><div className="trade-block-wants"><span>WR</span><span>LB</span><span>2027 Picks</span></div></Card></aside></div></div>;
}

function TradeListing({ listing, franchises }: { listing: { player: RosterPlayer; availability: string; note: string; wants: string[]; listed: string }; franchises: Franchise[] }) { const franchise = franchises.find((item) => item.id === listing.player.franchiseId)!; return <article className="trade-listing"><div className="trade-listing-player"><PlayerIdentity name={listing.player.name} position={listing.player.position} /><small><NflTeamMark team={listing.player.team} /> · {listing.player.priorPoints} 2025 pts · {listing.player.status === "taxi" ? "Taxi" : "Active"}</small></div><div className="trade-listing-contract"><b><Money value={listing.player.salary} /> / {listing.player.contractYears}y</b><span>{listing.player.contractYears === 1 ? "Expiring" : "Contracted"}</span></div><div className="trade-listing-owner"><span className="franchise-mark" style={{ background: franchise.color }}>{franchise.abbreviation}</span><div><b>{franchise.name}</b><small>{listing.listed}</small></div></div><span className={`trade-availability ${listing.availability.toLowerCase()}`}>{listing.availability}</span><p>{listing.note}</p><div className="trade-listing-foot"><span>{listing.wants.map((want) => <i key={want}>{want}</i>)}</span><Link className="btn btn-primary" href="/transactions/trade-center">Start trade</Link></div></article>; }
function TradePickListing({ franchises }: { franchises: Franchise[] }) { const owner = franchises.find((item) => item.id === "canton-legends")!; return <article className="trade-listing trade-pick-listing"><div className="trade-listing-player"><b>2027 Tampa Bay 1st</b><small>Original owner: Tampa Bay Storm · projected range pending</small></div><div className="trade-listing-contract"><b>Rookie pick</b><span>Draft asset</span></div><div className="trade-listing-owner"><span className="franchise-mark" style={{ background: owner.color }}>{owner.abbreviation}</span><div><b>{owner.name}</b><small>Listed today</small></div></div><span className="trade-availability available">Available</span><p>Looking to consolidate this selection into an impact starter.</p><div className="trade-listing-foot"><span><i>WR</i><i>LB</i><i>Upgrade</i></span><Link className="btn btn-primary" href="/transactions/trade-center">Start trade</Link></div></article>; }
function TeamNeeds({ franchises }: { franchises: Franchise[] }) { return <div className="team-needs-grid">{franchises.slice(0, 8).map((franchise, index) => <article key={franchise.id}><span className="franchise-mark" style={{ background: franchise.color }}>{franchise.abbreviation}</span><b>{franchise.name}</b><small>Buying: {index % 2 ? "LB · 2027 Picks" : "WR · Upgrade"}</small><small>Selling: {index % 2 ? "Veteran DB" : "RB depth"}</small><Link href="/transactions/trade-center">Start trade →</Link></article>)}</div>; }

function TradeRoom({ players, franchises }: { players: RosterPlayer[]; franchises: Franchise[] }) {
  const canton = franchises.find((franchise) => franchise.id === "canton-legends")!;
  const memphis = franchises.find((franchise) => franchise.id === "memphis-showboats")!;
  const cantonAssets = players.filter((player) => player.franchiseId === canton.id && player.status === "active").sort((a, b) => Number(b.priorPoints) - Number(a.priorPoints));
  const memphisAssets = players.filter((player) => player.franchiseId === memphis.id && player.status === "active").sort((a, b) => Number(b.priorPoints) - Number(a.priorPoints));
  const [giving, setGiving] = useState<string[]>([cantonAssets.find((player) => player.name === "Derrick Henry")?.id ?? cantonAssets[0].id]);
  const [receiving, setReceiving] = useState<string[]>([memphisAssets.find((player) => player.name === "Tony Pollard")?.id ?? memphisAssets[0].id]);
  const [note, setNote] = useState(""); const [messages, setMessages] = useState(["Would you consider this with a 2027 pick included?", "I would need more future value, but this is a starting point."]);
  const toggle = (id: string, current: string[], update: (items: string[]) => void) => update(current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const selectedGiving = cantonAssets.filter((player) => giving.includes(player.id)); const selectedReceiving = memphisAssets.filter((player) => receiving.includes(player.id));
  const givingSalary = selectedGiving.reduce((total, player) => total + Number(player.salary), 0); const receivingSalary = selectedReceiving.reduce((total, player) => total + Number(player.salary), 0);
  return <div className="trade-room"><aside className="trade-conversations"><button className="btn btn-primary">+ New trade</button><input className="input" placeholder="Search conversations" aria-label="Search trade conversations" /><div className="trade-conversation-filter"><button className="active">Active</button><button>Awaiting me</button><button>Drafts</button></div><div className="trade-conversation selected"><span className="franchise-mark" style={{ background: memphis.color }}>{memphis.abbreviation}</span><div><b>{memphis.name}</b><small>Draft · 2 assets selected</small><span>Updated just now</span></div></div>{franchises.filter((franchise) => ![canton.id, memphis.id].includes(franchise.id)).slice(0, 4).map((franchise, index) => <div className="trade-conversation" key={franchise.id}><span className="franchise-mark" style={{ background: franchise.color }}>{franchise.abbreviation}</span><div><b>{franchise.name}</b><small>{index === 0 ? "Awaiting your response" : "No active offer"}</small><span>{index + 1}d ago</span></div></div>)}</aside><main className="trade-main"><section className="trade-room-header"><div><span className="eyebrow">Private negotiation</span><h2>{canton.name} <i>↔</i> {memphis.name}</h2><p>Draft · Offer #1 · Autosaved just now</p></div><span className="trade-turn">Your draft · not sent</span></section><div className="trade-asset-columns"><TradeAssetColumn franchise={canton} players={cantonAssets} selected={giving} onToggle={(id) => toggle(id, giving, setGiving)} label="Canton sends" /><TradeAssetColumn franchise={memphis} players={memphisAssets} selected={receiving} onToggle={(id) => toggle(id, receiving, setReceiving)} label="Memphis sends" /></div><div className="trade-summary-strip"><span><b>Canton receives</b>{selectedReceiving.length} players · ${receivingSalary.toFixed(2)} salary</span><span><b>Memphis receives</b>{selectedGiving.length} players · ${givingSalary.toFixed(2)} salary</span><Link href="/transactions/trade-analyzer">Open full Trade Analyzer →</Link></div><div className="trade-finance"><div><b>{canton.name}</b><span>Current cap space <strong>$237.00</strong></span><span>After trade <strong>${(237 + givingSalary - receivingSalary).toFixed(2)}</strong></span></div><div><b>{memphis.name}</b><span>Current cap space <strong>$461.00</strong></span><span>After trade <strong>${(461 + receivingSalary - givingSalary).toFixed(2)}</strong></span></div><p>Estimated value is intentionally deferred to Trade Analyzer. Confirmed salary and roster validation runs before an offer can be accepted.</p></div><Card title="Negotiation"><div className="trade-messages">{messages.map((message, index) => <div className={index % 2 ? "partner" : "mine"} key={message}><b>{index % 2 ? memphis.owner : canton.owner}</b><span>{message}</span></div>)}</div><form className="trade-message-form" onSubmit={(event) => { event.preventDefault(); if (note.trim()) { setMessages((current) => [...current, note.trim()]); setNote(""); } }}><input className="input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Message Memphis Showboats" /><button className="btn">Send</button></form></Card><details className="trade-history"><summary>Offer history · Draft created</summary><p>Offer #1 is your current unsent draft. Previous counters will be preserved here after the trade is sent.</p></details><div className="trade-action-bar"><span>All changes saved locally</span><button className="btn">Save draft</button><button className="btn btn-primary">Send offer</button></div></main><aside className="trade-intelligence"><Card title="Partner context"><div className="trade-context"><span><b>Their needs</b>QB · LB · future picks</span><span><b>Their surplus</b>RB · WR depth</span><span><b>Trade block</b>Not yet imported</span></div></Card><Card title="Offer checks"><div className="trade-context"><span><b>Roster legality</b>Checked on submit</span><span><b>Contract transfer</b>Supported</span><span><b>Cap warning</b>None in this draft</span></div></Card></aside></div>;
}

function TradeAssetColumn({ franchise, players, selected, onToggle, label }: { franchise: Franchise; players: RosterPlayer[]; selected: string[]; onToggle: (id: string) => void; label: string }) { return <section className="trade-assets"><header><span className="franchise-mark" style={{ background: franchise.color }}>{franchise.abbreviation}</span><div><b>{label}</b><small>{franchise.owner}</small></div></header><div className="trade-selected-assets">{selected.length ? players.filter((player) => selected.includes(player.id)).map((player) => <button key={player.id} onClick={() => onToggle(player.id)}><PlayerIdentity name={player.name} position={player.position} /><span><NflTeamMark team={player.team} /> · <Money value={player.salary} /> · {player.contractYears} yrs</span><i>Remove</i></button>) : <p>No assets selected.</p>}</div><details className="trade-asset-picker"><summary>+ Add asset</summary><div><input className="input" placeholder="Search roster" aria-label={`Search ${franchise.name} assets`} />{players.slice(0, 12).map((player) => <button className={selected.includes(player.id) ? "chosen" : ""} key={player.id} onClick={() => onToggle(player.id)}><PositionBadge position={player.position} /> {player.name}<span>${player.salary} · {player.contractYears}y</span></button>)}</div></details></section>; }

function ActivityWorkspace({ franchises }: { franchises: Franchise[] }) {
  const [type, setType] = useState<ActivityType | "all">("all");
  const [franchiseId, setFranchiseId] = useState("all");
  const [phase, setPhase] = useState<"all" | "offseason" | "preseason" | "regular" | "playoffs">("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const events = useMemo(() => filterLeagueActivity(leagueActivity, { type, franchiseId, phase, query }), [type, franchiseId, phase, query]);
  const typeLabels: Record<ActivityType | "all", string> = { all: "All activity", trade: "Trades", auction: "Auctions", rfa: "RFA", "rookie-draft": "Rookie Draft", "roster-move": "Roster Moves" };
  const franchise = (id: string) => franchises.find((item) => item.id === id);
  return <div className="activity-workspace">
    <section className="activity-header"><div><span className="eyebrow">League transaction ledger</span><h2>Activity</h2><p>League-wide trades, auctions, RFA, rookie draft, and roster status movement.</p></div><div className="activity-summary"><span><b>{leagueActivity.length}</b> tracked items</span><span><b>{leagueActivity.filter((event) => event.type === "trade").length}</b> trades</span><span><b>{leagueActivity.filter((event) => event.type === "roster-move").length}</b> roster moves</span></div></section>
    <section className="activity-filters" aria-label="Activity filters"><div className="activity-view-pills">{(["all", "trade", "auction", "rfa", "rookie-draft", "roster-move"] as const).map((item) => <button className={type === item ? "active" : ""} key={item} onClick={() => setType(item)}>{typeLabels[item]}</button>)}</div><div className="activity-filter-fields"><input className="input" aria-label="Search activity" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player, pick, or asset" /><select className="select" aria-label="Filter by franchise" value={franchiseId} onChange={(event) => setFranchiseId(event.target.value)}><option value="all">Any franchise</option>{franchises.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="select" aria-label="Filter by phase" value={phase} onChange={(event) => setPhase(event.target.value as typeof phase)}><option value="all">Any phase</option><option value="offseason">Offseason</option><option value="preseason">Preseason</option><option value="regular">Regular season</option><option value="playoffs">Playoffs</option></select><button className="btn" onClick={() => { setType("all"); setFranchiseId("all"); setPhase("all"); setQuery(""); }}>Clear filters</button></div></section>
    <div className="activity-layout"><Card title={`${events.length} activity ${events.length === 1 ? "item" : "items"}`} action={<span className="matchup-view-label">Newest first</span>}><div className="activity-feed">{events.map((event) => <article className={`activity-row ${expanded === event.id ? "expanded" : ""}`} key={event.id}><button className="activity-row-main" onClick={() => setExpanded((current) => current === event.id ? null : event.id)} aria-expanded={expanded === event.id}><time>{event.occurredAt}</time><span className={`activity-type ${event.type}`}>{typeLabels[event.type]}</span><div className="activity-description"><b>{event.title}</b><span>{event.summary}</span></div><div className="activity-franchises">{event.franchises.map((id) => { const item = franchise(id); return item ? <span key={id} style={{ borderColor: item.color }}>{item.abbreviation}</span> : null; })}</div></button><div className="activity-assets">{event.assets.map((asset) => <span key={asset}>{asset}</span>)}</div>{expanded === event.id && <div className="activity-details"><b>Transaction detail</b>{event.details.map((detail) => <span key={detail}>{detail}</span>)}</div>}</article>)}{events.length === 0 && <div className="activity-no-results">No activity matches these filters.</div>}</div></Card><aside className="activity-insights"><Card title="Ledger status"><p className="feature-copy">The activity workspace is ready for the normalized transaction ledger. Some seeded rows are intentionally labeled pending until official activity is imported.</p></Card><Card title="Most active"><div className="activity-most-active">{franchises.slice(0, 4).map((item, index) => <span key={item.id}><i style={{ background: item.color }} />{item.name}<b>{index === 0 ? 2 : 1}</b></span>)}</div></Card></aside></div>
  </div>;
}

function TransactionQueue({
  feature,
  players,
}: {
  feature: string;
  players: RosterPlayer[];
}) {
  const [message, setMessage] = useState("");
  const actions =
    feature === "roster-moves"
      ? ["Roster status moves", "IR, Taxi & activations", "League rules apply"]
      : feature === "trade-block"
        ? ["4 players listed", "2 teams interested", "Updated today"]
        : ["18 moves", "3 trades", "7 waiver claims"];
  return (
    <div className="stack">
      <div className="grid-3">
        {actions.map((value, index) => (
          <Metric
            key={value}
            label={["Status", "League position", "Timing"][index]}
            value={value}
          />
        ))}
      </div>
      <Card title={featureNames[feature] ?? "Transaction workspace"}>
        <div className="transaction-builder">
          <select className="select">
            <option>Select a player</option>
            {players.slice(0, 30).map((p) => (
              <option key={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            onClick={() =>
              setMessage(
                "Saved as a pending request. Commissioner review rules will apply.",
              )
            }
          >
            Add request
          </button>
        </div>
        {message && <div className="notice notice-info">{message}</div>}
      </Card>
      <Card title="Recent league activity">
        <ActivityFeed />
      </Card>
    </div>
  );
}

function GameDay({ feature, players, franchises }: { feature: string; players: RosterPlayer[]; franchises: Franchise[] }) {
  const [scenario, setScenario] = useState(0);
  if (feature === "playoffs")
    return (
      <div className="dashboard-grid">
        <Card title="Playoff decision simulator">
          <label className="scenario-control">
            Expected wins added <strong>{scenario}</strong>
            <input
              type="range"
              min="-2"
              max="3"
              value={scenario}
              onChange={(e) => setScenario(Number(e.target.value))}
            />
          </label>
          <div className="grid-3">
            <Metric label="Playoffs" value={`${64 + scenario * 7}%`} />
            <Metric label="First-round bye" value={`${17 + scenario * 5}%`} />
            <Metric label="Championship" value={`${8 + scenario * 3}%`} />
          </div>
        </Card>
        <Card title="Scenario notes">
          <p className="feature-copy">
            Move the slider to model a trade, injury, or change in expected
            wins. Odds update instantly from the baseline scenario.
          </p>
        </Card>
      </div>
    );
  if (feature === "scoreboard") return <Scorecard players={players} franchises={franchises} />;
  if (feature !== "my-matchup") return <GameDayPlaceholder feature={feature} />;
  const home = franchises.find((franchise) => franchise.id === "canton-legends")!;
  const away = franchises.find((franchise) => franchise.id === "detroit-fury")!;
  const homeTeam = buildMatchupTeam(home.id, players);
  const awayTeam = buildMatchupTeam(away.id, players);
  return <MyMatchup home={home} away={away} homeTeam={homeTeam} awayTeam={awayTeam} />;

  return (
    <div className="stack">
      <div className="scoreboard">
        <div>
          <span className="metric-label">Canton Legends</span>
          <strong>127.3</strong>
          <span>72% win probability</span>
        </div>
        <div className="matchup-vs">
          VS
          <br />
          <small>4Q</small>
        </div>
        <div>
          <span className="metric-label">Memphis Showboats</span>
          <strong>124.8</strong>
          <span>3 players remaining</span>
        </div>
      </div>
      <div className="dashboard-grid">
        <Card
          title={
            feature === "live" ? "Fantasy RedZone" : "Matchup intelligence"
          }
        >
          <div className="redzone-feed">
            <Feed
              icon={<Flame />}
              tone="red"
              label="Lead change"
              text="Ja'Marr Chase's 34-yard TD moves Canton ahead, 127.3–124.8."
            />
            <Feed
              icon={<ShieldAlert />}
              tone="amber"
              label="Upset watch"
              text="The 11th-place team now has a 72% chance to defeat the #1 seed."
            />
            <Feed
              icon={<Trophy />}
              tone="gold"
              label="Record watch"
              text="Detroit needs 18.7 points to break the FOFL single-week record."
            />
          </div>
        </Card>
        <Card title="Rivalry Week">
          <p className="feature-copy">
            <strong>Bryan has beaten Chris seven straight times.</strong> Chris
            has two playoff eliminations in the series. Their all-time record is
            14–13.
          </p>
          <span className="badge badge-ir">Rivalry</span>
        </Card>
      </div>
    </div>
  );
}

function Scorecard({ players, franchises }: { players: RosterPlayer[]; franchises: Franchise[] }) {
  const [sort, setSort] = useState<"schedule" | "closest" | "highest">("schedule");
  const [franchiseId, setFranchiseId] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const matchups = useMemo(() => Array.from({ length: Math.floor(franchises.length / 2) }, (_, index) => {
    const away = franchises[index * 2]; const home = franchises[index * 2 + 1];
    const awayTeam = buildMatchupTeam(away.id, players); const homeTeam = buildMatchupTeam(home.id, players);
    return { id: `${away.id}-${home.id}`, away, home, awayTeam, homeTeam, probability: matchupWinProbability(awayTeam, homeTeam) };
  }), [franchises, players]);
  const shown = useMemo(() => matchups.filter((matchup) => franchiseId === "all" || matchup.away.id === franchiseId || matchup.home.id === franchiseId).sort((left, right) => sort === "closest" ? Math.abs(left.awayTeam.projection - left.homeTeam.projection) - Math.abs(right.awayTeam.projection - right.homeTeam.projection) : sort === "highest" ? right.awayTeam.projection + right.homeTeam.projection - left.awayTeam.projection - left.homeTeam.projection : 0), [franchiseId, matchups, sort]);
  const highest = Math.max(...matchups.map((matchup) => Math.max(matchup.awayTeam.projection, matchup.homeTeam.projection)));
  const closest = [...matchups].sort((left, right) => Math.abs(left.awayTeam.projection - left.homeTeam.projection) - Math.abs(right.awayTeam.projection - right.homeTeam.projection))[0];
  return <div className="scorecard-workspace"><section className="scorecard-header"><div><span className="eyebrow">FOFL weekly game center</span><h2>Scorecard</h2><p>League-wide matchup scoreboard for Week 1.</p></div><div className="scorecard-week"><b>2026</b><select className="select" aria-label="Select week"><option>Preseason · Week 1</option></select><span>All games upcoming</span></div></section><div className="scorecard-metrics"><Metric label="Games live" value="0" sub="Stat feed pending" /><Metric label="Closest matchup" value={`${Math.abs(closest.awayTeam.projection - closest.homeTeam.projection).toFixed(1)} pts`} sub={`${closest.away.abbreviation} vs ${closest.home.abbreviation}`} /><Metric label="Highest projection" value={highest.toFixed(1)} sub="Single team" /><Metric label="League avg" value={(matchups.reduce((total, matchup) => total + matchup.awayTeam.projection + matchup.homeTeam.projection, 0) / (matchups.length * 2)).toFixed(1)} sub="Projected points" /></div><section className="scorecard-controls"><div><button className={sort === "schedule" ? "active" : ""} onClick={() => setSort("schedule")}>Schedule</button><button className={sort === "closest" ? "active" : ""} onClick={() => setSort("closest")}>Closest</button><button className={sort === "highest" ? "active" : ""} onClick={() => setSort("highest")}>Highest projection</button></div><select className="select" aria-label="Filter scorecard by franchise" value={franchiseId} onChange={(event) => setFranchiseId(event.target.value)}><option value="all">Any franchise</option><option value="canton-legends">My team · Canton</option>{franchises.map((franchise) => <option key={franchise.id} value={franchise.id}>{franchise.name}</option>)}</select></section><div className="scorecard-layout"><section className="scorecard-grid">{shown.map((matchup) => <ScorecardMatchup key={matchup.id} matchup={matchup} expanded={expanded === matchup.id} onToggle={() => setExpanded((current) => current === matchup.id ? null : matchup.id)} />)}</section><aside className="scorecard-insights"><Card title="Week 1 outlook"><div className="scorecard-insight-list"><span><b>Closest game</b>{closest.away.name} vs {closest.home.name}</span><span><b>Highest projection</b>{highest.toFixed(1)} team points</span><span><b>Live scoring</b>Available when NFL stats connect</span></div></Card><Card title="Scoring coverage"><p className="feature-copy">Current schedule data is pregame only. Live scores, events, player status, and final recaps will replace projections automatically after scoring imports begin.</p></Card></aside></div></div>;
}

function ScorecardMatchup({ matchup, expanded, onToggle }: { matchup: { id: string; away: Franchise; home: Franchise; awayTeam: ReturnType<typeof buildMatchupTeam>; homeTeam: ReturnType<typeof buildMatchupTeam>; probability: number }; expanded: boolean; onToggle: () => void }) {
  const top = [...matchup.awayTeam.starters, ...matchup.homeTeam.starters].sort((a, b) => b.projection - a.projection)[0];
  const difference = Math.abs(matchup.awayTeam.projection - matchup.homeTeam.projection);
  const label = difference < 5 ? "Nail-biter projection" : difference > 18 ? "Projection edge" : "Competitive matchup";
  return <article className={`scorecard-matchup ${expanded ? "expanded" : ""}`}><button className="scorecard-matchup-main" onClick={onToggle} aria-expanded={expanded}><div className="scorecard-status"><span>Upcoming</span><time>Sun · Week 1</time></div><ScorecardTeam franchise={matchup.away} team={matchup.awayTeam} probability={matchup.probability} /><div className="scorecard-divider"><b>VS</b><span>{label}</span></div><ScorecardTeam franchise={matchup.home} team={matchup.homeTeam} probability={1 - matchup.probability} right /></button><div className="scorecard-matchup-foot"><span><b>Top projection</b> {top.player.name} · {top.projection.toFixed(1)}</span><span><b>Remaining</b> {matchup.awayTeam.remainingPlayers} · {matchup.homeTeam.remainingPlayers}</span></div>{expanded && <div className="scorecard-expanded"><div><b>{matchup.away.name} starters</b>{matchup.awayTeam.starters.map((starter) => <span key={starter.player.id}><PositionBadge position={starter.player.position} /> {starter.player.name}<strong>{starter.projection.toFixed(1)}</strong></span>)}</div><div><b>{matchup.home.name} starters</b>{matchup.homeTeam.starters.map((starter) => <span key={starter.player.id}><PositionBadge position={starter.player.position} /> {starter.player.name}<strong>{starter.projection.toFixed(1)}</strong></span>)}</div></div>}</article>;
}
function ScorecardTeam({ franchise, team, probability, right = false }: { franchise: Franchise; team: ReturnType<typeof buildMatchupTeam>; probability: number; right?: boolean }) { return <div className={`scorecard-team ${right ? "right" : ""}`}><span className="franchise-mark" style={{ background: franchise.color }}>{franchise.abbreviation}</span><div><b>{franchise.name}</b><small>0–0 · {team.remainingPlayers} remaining</small></div><strong>{team.projection.toFixed(1)}<small>projected</small></strong><em>{Math.round(probability * 100)}% win</em></div>; }

function MyMatchup({ home, away, homeTeam, awayTeam }: { home: Franchise; away: Franchise; homeTeam: ReturnType<typeof buildMatchupTeam>; awayTeam: ReturnType<typeof buildMatchupTeam> }) {
  const homeProbability = matchupWinProbability(homeTeam, awayTeam);
  const homeSplit = scoringSplit(homeTeam);
  const awaySplit = scoringSplit(awayTeam);
  const xFactors = [...homeTeam.starters, ...awayTeam.starters].sort((a, b) => b.projection - a.projection).slice(0, 3);
  return <div className="matchup-workspace">
    <section className="matchup-hero" aria-label="Week 1 upcoming matchup">
      <div className="matchup-week"><span>Week 1</span><b>Upcoming</b><small>Sunday · Week 1</small></div>
      <div className="matchup-teams">
        <MatchupTeamHeading franchise={home} context="0–0 · Central #1 · Power pending" />
        <div className="matchup-center-score"><strong>{homeTeam.projection.toFixed(1)} <small>projected</small></strong><span>VS</span><strong>{awayTeam.projection.toFixed(1)} <small>projected</small></strong></div>
        <MatchupTeamHeading franchise={away} context="0–0 · Western #1 · Power pending" right />
      </div>
      <div className="matchup-probability"><span><b>{Math.round(homeProbability * 100)}%</b> {home.abbreviation} win probability</span><div aria-label={`${home.abbreviation} ${Math.round(homeProbability * 100)} percent win probability`}><i style={{ width: `${homeProbability * 100}%` }} /></div><span>{Math.round((1 - homeProbability) * 100)}% {away.abbreviation}</span></div>
      <div className="matchup-remaining"><span><b>{homeTeam.remainingProjection.toFixed(1)}</b> projected remaining · {homeTeam.remainingPlayers} players</span><span><b>{awayTeam.remainingPlayers}</b> players · {awayTeam.remainingProjection.toFixed(1)} projected remaining</span></div>
    </section>
    <section className="matchup-context"><span><b>Matchup context</b> 2026 schedule and historical series will appear here as they are imported.</span><span><b>Lineups</b> {homeTeam.starters.length} / 17 starters set · {awayTeam.starters.length} / 17 starters set</span></section>
    <Card title="Starting lineups" action={<span className="matchup-view-label">Slot comparison · Scheduled</span>}>
      <div className="matchup-lineup-head"><b>{home.name}</b><span>Slot</span><b>{away.name}</b></div>
      <div className="matchup-lineups">{homeTeam.starters.map((homeStarter, index) => { const awayStarter = awayTeam.starters[index]; return awayStarter ? <MatchupLineupRow key={`${homeStarter.slot}-${homeStarter.player.id}`} home={homeStarter} away={awayStarter} /> : null; })}</div>
    </Card>
    <div className="matchup-detail-grid">
      <Card title="Formations"><div className="matchup-formations"><FormationSummary name={home.name} formation={homeTeam.formation} /><FormationSummary name={away.name} formation={awayTeam.formation} /></div></Card>
      <Card title="Matchup X-factors"><div className="x-factor-list">{xFactors.map((starter, index) => <div key={starter.player.id}><PlayerIdentity name={starter.player.name} position={starter.player.position} /><b>{starter.projection.toFixed(1)} proj</b><span>{index === 0 ? "Highest projected scorer" : "High-leverage projection"}</span></div>)}</div></Card>
    </div>
    <div className="matchup-detail-grid">
      <Card title="Scoring split"><div className="scoring-split"><div><b>{home.abbreviation}</b><span>Offense <strong>{homeSplit.offense.toFixed(1)}</strong></span><span>Defense <strong>{homeSplit.defense.toFixed(1)}</strong></span></div><div><b>{away.abbreviation}</b><span>Offense <strong>{awaySplit.offense.toFixed(1)}</strong></span><span>Defense <strong>{awaySplit.defense.toFixed(1)}</strong></span></div></div></Card>
      <Card title="Fantasy RedZone"><div className="matchup-empty-state"><Activity size={18} /><div><b>Awaiting the live stat feed</b><p>Relevant inferred scoring events and lead changes will populate here once NFL games begin.</p></div></div></Card>
    </div>
  </div>;
}

function MatchupTeamHeading({ franchise, context, right = false }: { franchise: Franchise; context: string; right?: boolean }) { return <div className={`matchup-team-heading ${right ? "right" : ""}`}><span className="franchise-mark" style={{ background: franchise.color }}>{franchise.abbreviation}</span><div><b>{franchise.name}</b><small>{context}</small></div></div>; }
function MatchupLineupRow({ home, away }: { home: ReturnType<typeof buildMatchupTeam>["starters"][number]; away: ReturnType<typeof buildMatchupTeam>["starters"][number] }) { return <article className="matchup-lineup-row"><div className="matchup-player home"><PlayerIdentity name={home.player.name} position={home.player.position} /><small><NflTeamMark team={home.player.team} /> · {home.projection.toFixed(1)} proj · {lineupDisplay(home.player).rank}</small></div><SlotBadge slot={home.slot as never} /><div className="matchup-player away"><PlayerIdentity name={away.player.name} position={away.player.position} /><small><NflTeamMark team={away.player.team} /> · {away.projection.toFixed(1)} proj · {lineupDisplay(away.player).rank}</small></div></article>; }
function FormationSummary({ name, formation }: { name: string; formation: ReturnType<typeof lineupFormation> }) { return <div><b>{name}</b><span><strong>{formation.offense.name}</strong> · {formation.offense.personnel}</span><span><strong>{formation.defense.name}</strong> · {formation.defense.personnel}</span></div>; }
function GameDayPlaceholder({ feature }: { feature: string }) { return <Card title={featureNames[feature] ?? "Game Day"}><p className="feature-copy">This Game Day module is ready for scheduled matchup data. My Matchup is available now.</p></Card>; }

type RfaView = "overview" | "tags" | "market" | "matches" | "results" | "values";
type RfaMarketPhase = "tagging" | "bidding";
type RfaBidRecord = { id: string; amount: number; bidderId: string; bidderName: string; createdAt: number };
type RfaAuction = { state: "live" | "awaiting_match"; history: RfaBidRecord[]; closesAt: number; matchDeadline?: number };
type RfaMarketResult = { playerId: string; originalFranchiseId: string; winnerId: string; winnerName: string; salary: number; status: RfaResultStatus; resolvedAt: number; bidHistory: RfaBidRecord[] };

function RfaWorkspace({ players, franchises, canManageLeague }: { players: RosterPlayer[]; franchises: Franchise[]; canManageLeague: boolean }) {
  const [view, setView] = useState<RfaView>("overview");
  const [assignments, setAssignments] = useState<Record<string, RfaTagChoice>>({});
  const [tagConfirmation, setTagConfirmation] = useState<RfaTagConfirmation>("editing");
  const [finalReviewOpen, setFinalReviewOpen] = useState(false);
  const [marketPhase, setMarketPhase] = useState<RfaMarketPhase>("tagging");
  const [auctions, setAuctions] = useState<Record<string, RfaAuction>>({});
  const [marketResults, setMarketResults] = useState<RfaMarketResult[]>([]);
  const [watchedIds, setWatchedIds] = useState<string[]>([]);
  const candidates = useMemo(() => rfaRolloverCandidates(players, "canton-legends"), [players]);
  const allCandidates = useMemo(() => franchises.flatMap((franchise) => rfaRolloverCandidates(players, franchise.id)), [franchises, players]);
  const tagValues = useMemo(() => franchiseTagValues(players), [players]);
  const assignmentStatus = validateTagAssignments(candidates, assignments);
  const importedMarket = allCandidates.filter((candidate) => candidate.franchiseId !== "canton-legends").slice(0, 10);
  const myTransitionPlayers = tagConfirmation === "final" ? candidates.filter((candidate) => assignments[candidate.id] === "transition") : [];
  const resolvedIds = new Set(marketResults.map((result) => result.playerId));
  const marketCandidates = [...importedMarket, ...myTransitionPlayers].filter((player) => !resolvedIds.has(player.id));
  const franchiseResults = tagConfirmation === "final" ? franchiseTagOutcomes(candidates, assignments, tagValues) : [];
  const liveCount = Object.values(auctions).filter((auction) => auction.state === "live").length;
  const myMatchDecisions = marketCandidates.filter((player) => player.franchiseId === "canton-legends" && auctions[player.id]?.state === "awaiting_match");
  const cantonPlayers = players.filter((player) => player.franchiseId === "canton-legends");
  const originalSalary = cantonPlayers.reduce((total, player) => total + Number(player.salary), 0);
  const taggedSalary = originalSalary - candidates.reduce((total, candidate) => total + candidate.previousSalary, 0) + franchiseResults.reduce((total, outcome) => total + outcome.newSalary, 0) + myTransitionPlayers.length;
  const resultSalaryDelta = marketResults.reduce((total, result) => {
    if (result.originalFranchiseId === "canton-legends" && result.status === "matched") return total + result.salary - 1;
    if (result.originalFranchiseId === "canton-legends" && result.status === "not_matched") return total - 1;
    if (result.winnerId === "canton-legends" && result.status === "not_matched") return total + result.salary;
    return total;
  }, 0);
  const currentSalary = tagConfirmation === "final" ? taggedSalary + resultSalaryDelta : originalSalary;
  const activeCantonBids = Object.entries(auctions).filter(([, auction]) => auction.history.at(-1)?.bidderId === "canton-legends");
  const committedBids = activeCantonBids.reduce((total, [, auction]) => total + (auction.history.at(-1)?.amount ?? 0), 0);
  const availableCap = 1000 - currentSalary - committedBids;
  const assign = (playerId: string, choice: RfaTagChoice) => {
    if (tagConfirmation === "final") return;
    const next = { ...assignments };
    if (next[playerId] === choice) delete next[playerId];
    else next[playerId] = choice;
    if (validateTagAssignments(candidates, next).valid) setAssignments(next);
  };
  const finalConfirmTags = () => {
    const finalized = finalizeTagAssignments(candidates, assignments);
    setAssignments(finalized);
    setTagConfirmation("final");
    setFinalReviewOpen(false);
    setView("results");
  };
  const openRfaBidding = () => {
    if (tagConfirmation === "tentative") {
      setAssignments(finalizeTagAssignments(candidates, assignments));
      setTagConfirmation("final");
    }
    setMarketPhase("bidding");
  };
  const openRfaBiddingForTest = () => {
    setAssignments(finalizeTagAssignments(candidates, assignments));
    setTagConfirmation("final");
    setMarketPhase("bidding");
  };
  const placeBid = (player: (typeof marketCandidates)[number], amount: number) => {
    const current = auctions[player.id];
    const highBid = current?.history.at(-1);
    if (marketPhase !== "bidding" || current?.state === "awaiting_match") return { valid: false, reason: "This player is not accepting bids." };
    const existingReservation = highBid?.bidderId === "canton-legends" ? highBid.amount : 0;
    const result = validateRfaBid({ bidderId: "canton-legends", originalOwnerId: player.franchiseId, previousBidderId: highBid?.bidderId, amount, highBid: highBid?.amount ?? 0, committedCap: committedBids - existingReservation, cap: 1000 - currentSalary, rosterCount: cantonPlayers.length });
    if (!result.valid) return result;
    const createdAt = Date.now();
    const bid: RfaBidRecord = { id: `${player.id}-${current?.history.length ?? 0}-${createdAt}`, amount, bidderId: "canton-legends", bidderName: "Canton Legends", createdAt };
    setAuctions((currentAuctions) => ({ ...currentAuctions, [player.id]: { state: "live", history: [...(currentAuctions[player.id]?.history ?? []), bid], closesAt: createdAt + RFA_MARKET_RULES.auctionHours * 60 * 60 * 1000 } }));
    return result;
  };
  const closeAuction = (playerId: string) => setAuctions((current) => ({ ...current, [playerId]: { ...current[playerId], state: "awaiting_match", matchDeadline: Date.now() + RFA_MARKET_RULES.matchHours * 60 * 60 * 1000 } }));
  const resolveMatch = (playerId: string, status: "matched" | "not_matched") => {
    const player = marketCandidates.find((candidate) => candidate.id === playerId);
    const auction = auctions[playerId];
    const highBid = auction?.history.at(-1);
    if (!player || !highBid) return;
    const original = franchises.find((franchise) => franchise.id === player.franchiseId);
    const matched = status === "matched";
    setMarketResults((results) => [...results, { playerId, originalFranchiseId: player.franchiseId, winnerId: matched ? player.franchiseId : highBid.bidderId, winnerName: matched ? original?.name ?? player.franchise : highBid.bidderName, salary: highBid.amount, status, resolvedAt: Date.now(), bidHistory: auction.history }]);
    setAuctions((current) => { const next = { ...current }; delete next[playerId]; return next; });
  };
  const closeNoBidPlayers = () => {
    const noBidPlayers = marketCandidates.filter((player) => !auctions[player.id]);
    setMarketResults((results) => [...results, ...noBidPlayers.map((player) => ({ playerId: player.id, originalFranchiseId: player.franchiseId, winnerId: player.franchiseId, winnerName: franchises.find((franchise) => franchise.id === player.franchiseId)?.name ?? player.franchise, salary: 1, status: "no_bid" as const, resolvedAt: Date.now(), bidHistory: [] }))]);
  };
  const tabs: Array<[RfaView, string, number?]> = tagConfirmation === "final"
    ? [["overview", "Overview"], ["market", "RFA Market", marketCandidates.length], ["matches", "Match Decisions", myMatchDecisions.length], ["results", "Results", franchiseResults.length + marketResults.length], ["tags", "My Tags"], ["values", "Tag Values"]]
    : [["overview", "Overview"], ["tags", "My Tags", assignmentStatus.undecided], ["market", "RFA Market", marketCandidates.length], ["matches", "Match Decisions", myMatchDecisions.length], ["results", "Results", franchiseResults.length + marketResults.length], ["values", "Tag Values"]];
  return <div className={`rfa-workspace ${tagConfirmation === "final" ? "tags-final" : ""}`}>
    <nav className="rfa-tabs" aria-label="RFA views">{tabs.map(([id, label, count]) => <button className={view === id ? "active" : ""} key={id} onClick={() => setView(id)}>{label}{count !== undefined && count > 0 ? <span>{count}</span> : null}</button>)}</nav>
    {view === "tags" && <RfaTagConfirmationBar confirmation={tagConfirmation} status={assignmentStatus} onTentative={() => setTagConfirmation((current) => current === "tentative" ? "editing" : "tentative")} onFinal={() => setFinalReviewOpen(true)} />}
    <div className="rfa-layout"><main>{view === "overview" && <RfaOverview candidates={candidates} marketCount={marketCandidates.length} liveCount={liveCount} assignments={assignmentStatus} onOpen={setView} />}{view === "tags" && <RfaTags candidates={candidates} assignments={assignments} status={assignmentStatus} tagValues={tagValues} onAssign={assign} />}{view === "market" && <RfaMarket candidates={marketCandidates} franchises={franchises} auctions={auctions} watchedIds={watchedIds} phase={marketPhase} tagsReady={tagConfirmation === "final" || tagConfirmation === "tentative" && assignmentStatus.undecided === 0} tentative={tagConfirmation === "tentative"} canManageLeague={canManageLeague} availableCap={availableCap} resolvedCount={marketResults.length} onOpenBidding={openRfaBidding} onTestOpenBidding={openRfaBiddingForTest} onBid={placeBid} onToggleWatch={(playerId) => setWatchedIds((current) => current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId])} onCloseAuction={closeAuction} onCloseNoBids={closeNoBidPlayers} />}{view === "matches" && <RfaMatchDecisions candidates={myMatchDecisions} auctions={auctions} availableCap={availableCap} onResolve={resolveMatch} />}{view === "results" && <RfaResults franchiseOutcomes={franchiseResults} marketResults={marketResults} players={[...importedMarket, ...myTransitionPlayers]} franchises={franchises} transitionCount={myTransitionPlayers.length} onOpenMarket={() => setView("market")} />}{view === "values" && <RfaTagValues values={tagValues} players={players} />}</main><RfaSidebar view={view} assignments={assignments} confirmation={tagConfirmation} status={assignmentStatus} candidates={candidates} tagValues={tagValues} players={players} auctions={auctions} marketResults={marketResults} marketPhase={marketPhase} franchiseResults={franchiseResults} /></div>
    {finalReviewOpen && <RfaFinalConfirmDialog status={assignmentStatus} released={candidates.filter((player) => assignments[player.id] === "unprotected").length} onCancel={() => setFinalReviewOpen(false)} onConfirm={finalConfirmTags} />}
  </div>;
}

function RfaSidebar({ view, assignments, confirmation, status, candidates, tagValues, players, auctions, marketResults, marketPhase, franchiseResults }: { view: RfaView; assignments: Record<string, RfaTagChoice>; confirmation: RfaTagConfirmation; status: ReturnType<typeof validateTagAssignments>; candidates: ReturnType<typeof rfaRolloverCandidates>; tagValues: ReturnType<typeof franchiseTagValues>; players: RosterPlayer[]; auctions: Record<string, RfaAuction>; marketResults: RfaMarketResult[]; marketPhase: RfaMarketPhase; franchiseResults: ReturnType<typeof franchiseTagOutcomes> }) {
  if (view === "tags") {
    const selected = (choice: RfaTagChoice) => candidates.filter((player) => assignments[player.id] === choice);
    const offense = selected("franchise").find((player) => offensiveRfaPositions.includes(player.position));
    const defense = selected("franchise").find((player) => defensiveRfaPositions.includes(player.position));
    const currentSalary = players.filter((player) => player.franchiseId === "canton-legends").reduce((total, player) => total + Number(player.salary), 0);
    const rolloverSalary = currentSalary - candidates.reduce((total, player) => total + player.previousSalary, 0) + candidates.length;
    const franchiseCommitments = selected("franchise").reduce((total, player) => total + Math.max(0, (tagValues.find((value) => value.position === player.position)?.value ?? 1) - 1), 0);
    const draftReserve = rookieDraftSalaryRange(draftPicks, "canton-legends", 2027);
    const projectedSalaryMin = rolloverSalary + franchiseCommitments + draftReserve.min;
    const projectedSalaryMax = rolloverSalary + franchiseCommitments + draftReserve.max;
    return <aside className="rfa-side"><Card title="Tag deadline"><div className="rfa-tag-deadline"><strong>Not scheduled</strong><span>Commissioner opens the Assign Tags stage.</span><small>A tentative declaration automatically becomes final when this deadline expires.</small></div></Card><Card title="Your declaration"><div className="rfa-declaration"><span><b>OF Franchise</b>{offense?.name ?? "Open"}</span><span><b>DF Franchise</b>{defense?.name ?? "Open"}</span><span><b>Transition</b>{status.transition} / 3 assigned</span><span><b>Unresolved</b>{status.undecided}</span></div></Card><Card title="Projected cap"><div className="rfa-cap"><span>Rollover salary <b><Money value={rolloverSalary} /></b></span><span>Franchise commitments <b>+<Money value={franchiseCommitments} /></b></span><span>2027 draft pick reserve <b>{moneyRange(draftReserve.min, draftReserve.max)}</b></span><small className="rfa-cap-note">{draftReserve.picks} picks · exact after 1st-round slots lock</small><span>Projected salary <b>{moneyRange(projectedSalaryMin, projectedSalaryMax)}</b></span><span>Cap remaining <b>{moneyRange(1000 - projectedSalaryMax, 1000 - projectedSalaryMin)}</b></span></div></Card><Card title="What happens next"><p className="feature-copy"><strong>RFA Market</strong><br />{status.transition} Canton player{status.transition === 1 ? "" : "s"} will move to the market after final confirmation.</p><button className="btn">View tag rules</button></Card></aside>;
  }
  const cantonPlayers = players.filter((player) => player.franchiseId === "canton-legends");
  const originalSalary = cantonPlayers.reduce((total, player) => total + Number(player.salary), 0);
  const finalizedRfaSalary = originalSalary - candidates.reduce((total, player) => total + player.previousSalary, 0) + franchiseResults.reduce((total, result) => total + result.newSalary, 0) + candidates.filter((player) => assignments[player.id] === "transition").length;
  const resultSalaryDelta = marketResults.reduce((total, result) => result.originalFranchiseId === "canton-legends" && result.status === "matched" ? total + result.salary - 1 : result.originalFranchiseId === "canton-legends" && result.status === "not_matched" ? total - 1 : result.winnerId === "canton-legends" && result.status === "not_matched" ? total + result.salary : total, 0);
  const currentSalary = confirmation === "final" ? finalizedRfaSalary + resultSalaryDelta : originalSalary;
  const cantonBids = Object.values(auctions).filter((auction) => auction.history.at(-1)?.bidderId === "canton-legends");
  const committedBids = cantonBids.reduce((total, auction) => total + (auction.history.at(-1)?.amount ?? 0), 0);
  const released = confirmation === "final" ? candidates.filter((player) => assignments[player.id] === "unprotected").length : 0;
  const resolvedRosterDelta = marketResults.reduce((total, result) => result.originalFranchiseId === "canton-legends" && result.status === "not_matched" ? total - 1 : result.winnerId === "canton-legends" && result.status === "not_matched" ? total + 1 : total, 0);
  return <aside className="rfa-side"><Card title="RFA timers"><div className="rfa-timers"><span><b>Tag deadline</b><strong>{confirmation === "final" ? "Complete" : "Not started"}</strong><small>{confirmation === "final" ? "Tag declaration locked" : "Commissioner activates stage"}</small></span><span><b>RFA market</b><strong>{marketPhase === "bidding" ? "Open" : "Locked"}</strong><small>{marketPhase === "bidding" ? "First bids may be placed" : "Waiting for commissioner"}</small></span><span><b>Auction timer</b><strong>24 hours</strong><small>Resets after every valid bid</small></span><span><b>Match timer</b><strong>24 hours</strong><small>Auto-declines when time expires</small></span></div></Card><Card title="Canton cap exposure"><div className="rfa-cap"><span>Current roster salary <b><Money value={currentSalary} /></b></span><span>Committed RFA bids <b><Money value={committedBids} />{cantonBids.length ? ` · ${cantonBids.length} high` : ""}</b></span><span>Available <b><Money value={1000 - currentSalary - committedBids} /></b></span><span>Offseason roster <b>{cantonPlayers.length - released + resolvedRosterDelta + cantonBids.length} / 60</b></span></div></Card></aside>;
}

function moneyRange(min: number, max: number) {
  return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(0)}–$${max.toFixed(0)}`;
}

function RfaTagConfirmationBar({ confirmation, status, onTentative, onFinal }: { confirmation: RfaTagConfirmation; status: ReturnType<typeof validateTagAssignments>; onTentative: () => void; onFinal: () => void }) {
  return <section className={`rfa-tag-confirmation ${confirmation}`}><div><span className="eyebrow">Tag declaration status</span><b>{confirmation === "final" ? "Final confirmed · selections locked" : confirmation === "tentative" ? "Tentative confirmation saved" : "Editing tag selections"}</b><small>{confirmation === "tentative" ? "This slate becomes final automatically at the tag deadline. You may still change it before then." : confirmation === "final" ? "Final confirmation cannot be changed. Players without a selected tag are unprotected." : "Click a selected tag again to remove it. Every player must be resolved before final confirmation."}</small></div><div><span>{status.undecided === 0 ? "✓ Declaration complete" : `${status.undecided} decisions remaining`}</span><button className="btn" disabled={confirmation === "final"} onClick={onTentative}>{confirmation === "tentative" ? "Undo tentative confirm" : "Tentative confirm"}</button><button className="btn btn-primary" disabled={confirmation !== "tentative" || status.undecided > 0} onClick={onFinal}>Review & final confirm</button></div></section>;
}

function RfaFinalConfirmDialog({ status, released, onCancel, onConfirm }: { status: ReturnType<typeof validateTagAssignments>; released: number; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onCancel]);
  return <div className="rfa-confirm-backdrop" role="presentation"><section className="rfa-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="rfa-final-confirm-title"><span className="eyebrow">Final confirmation</span><h2 id="rfa-final-confirm-title">Lock this tag declaration?</h2><p>This action is permanent. Franchise salaries will be applied and sent to Results, Transition players will move to RFA Market, and released players will remain unprotected.</p><div className="rfa-confirm-summary"><span><b>{status.offense}</b>Offensive Franchise</span><span><b>{status.defense}</b>Defensive Franchise</span><span><b>{status.transition}</b>Transition</span><span><b>{released}</b>Released</span></div><strong>Are you sure you want to final confirm?</strong><div className="rfa-confirm-actions"><button className="btn" autoFocus onClick={onCancel}>No, go back</button><button className="btn btn-primary" onClick={onConfirm}>Yes, final confirm</button></div></section></div>;
}

function RfaOverview({ candidates, marketCount, liveCount, assignments, onOpen }: { candidates: ReturnType<typeof rfaRolloverCandidates>; marketCount: number; liveCount: number; assignments: ReturnType<typeof validateTagAssignments>; onOpen: (view: RfaView) => void }) { return <div className="rfa-overview"><div className="rfa-metrics"><button onClick={() => onOpen("tags")}><span>My tags</span><b>{candidates.length - assignments.undecided} / {candidates.length}</b><small>{assignments.undecided} decisions remaining</small></button><button onClick={() => onOpen("market")}><span>RFA market</span><b>{marketCount}</b><small>{marketCount - liveCount} awaiting · {liveCount} live</small></button><button onClick={() => onOpen("market")}><span>Live auctions</span><b>{liveCount}</b><small>{liveCount ? "Timers active now" : "No active timers"}</small></button><button onClick={() => onOpen("matches")}><span>Match decisions</span><b>0</b><small>None awaiting Canton</small></button></div><Card title="Annual RFA pipeline"><div className="rfa-pipeline">{[["1", "Rollover", "Years decrease by one; new 0-year salaries reset to $1."], ["2", "Assign Tags", "One offensive Franchise, one defensive Franchise, and three Transition tags."], ["3", "Market", "Transition players await a first bid, then enter rolling 24-hour auctions."], ["4", "Match", "Original owners receive 24 hours to match or decline the winning bid."], ["5", "Resolve", "Players are retained, transferred, or kept for $1 after no bids."]].map(([number, name, detail]) => <div key={number}><span>{number}</span><b>{name}</b><small>{detail}</small></div>)}</div></Card><Card title="What happens at rollover"><div className="rfa-rollover-explainer"><span><b>Contract years</b>Every active contract decreases by one.</span><span><b>0-year salary</b>Resets to $1 while previous salary remains visible.</span><span><b>Contract assignment</b>Franchise/RFA winners receive years later during final compliance.</span></div></Card></div>; }

function RfaTags({ candidates, assignments, status, tagValues, onAssign }: { candidates: ReturnType<typeof rfaRolloverCandidates>; assignments: Record<string, RfaTagChoice>; status: ReturnType<typeof validateTagAssignments>; tagValues: ReturnType<typeof franchiseTagValues>; onAssign: (id: string, choice: RfaTagChoice) => void }) {
  const [filter, setFilter] = useState<"all" | "unresolved" | "offense" | "defense">("all");
  const resolved = candidates.length - status.undecided;
  const progress = candidates.length ? (resolved / candidates.length) * 100 : 100;
  const shown = candidates.filter((player) => filter === "all" || filter === "unresolved" && !assignments[player.id] || filter === "offense" && offensiveRfaPositions.includes(player.position) || filter === "defense" && defensiveRfaPositions.includes(player.position));
  const decisionLabel = (player: (typeof candidates)[number]) => {
    const choice = assignments[player.id];
    const tagValue = tagValues.find((item) => item.position === player.position)?.value ?? 0;
    return choice === "franchise" ? `Franchise tagged · $${tagValue}` : choice === "transition" ? "Transition tagged" : choice === "unprotected" ? "Unprotected · Release" : "";
  };
  return <div className="rfa-tags-view">
    <div className="rfa-tag-slots"><span><b>{status.offense} / 1</b><small>Offensive Franchise</small></span><span><b>{status.defense} / 1</b><small>Defensive Franchise</small></span><span><b>{status.transition} / 3</b><small>Transition Tags</small></span><span className={status.undecided === 0 ? "complete" : ""}><b>{status.undecided === 0 ? "✓" : status.undecided}</b><small>{status.undecided === 0 ? "All Players Resolved" : "Decisions Remaining"}</small></span></div>
    <section className="rfa-tag-progress"><div><span>Tag Declaration Progress</span><b>{resolved} / {candidates.length} resolved</b></div><div className="progress"><span style={{ width: `${progress}%` }} /></div><small>Franchise Tags: {status.offense + status.defense} / 2 · Transition Tags: {status.transition} / 3 · Owners do not have to use every tag.</small></section>
    <section className="rfa-candidate-card"><header><div><span className="eyebrow">Canton 0-year candidates</span><h2>{candidates.length} player decisions</h2></div><small>Every player must be Franchise, Transition, or Release.</small></header>
      <div className="rfa-candidate-filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All {candidates.length}</button><button className={filter === "unresolved" ? "active" : ""} onClick={() => setFilter("unresolved")}>Unresolved {status.undecided}</button><button className={filter === "offense" ? "active" : ""} onClick={() => setFilter("offense")}>Offense</button><button className={filter === "defense" ? "active" : ""} onClick={() => setFilter("defense")}>Defense</button></div>
      <div className="rfa-candidate-table"><div className="rfa-candidate-head"><span>Player</span><span>Prior Salary</span><span>RFA Rollover</span><span>Decision</span></div>{shown.map((player) => {
        const tag = tagValues.find((item) => item.position === player.position);
        const value = tag?.value ?? 0;
        const sideUsed = offensiveRfaPositions.includes(player.position) ? status.offense >= 1 : defensiveRfaPositions.includes(player.position) ? status.defense >= 1 : true;
        const current = assignments[player.id];
        const calculation = `${player.position} tag: ${tag?.salaries.map((salary) => `$${salary}`).join(" + ") || "No salaries"} · Average $${tag?.average.toFixed(2) ?? "0.00"} · Rounded up $${value}`;
        return <article className={current ? `decision-${current}` : "unresolved"} key={player.id}><div><PlayerIdentity name={player.name} position={player.position} />{current && <em>{decisionLabel(player)}</em>}<small><NflTeamMark team={player.team} /> · 0-year contract · Tag decision required</small></div><span><Money value={player.previousSalary} /><small>0 years</small></span><span><Money value={1} /><small>0 years</small></span><div><button className={current === "franchise" ? "selected" : ""} disabled={current !== "franchise" && sideUsed} onClick={() => onAssign(player.id, "franchise")} title={calculation}>Franchise · $${value}</button><button className={current === "transition" ? "selected" : ""} disabled={current !== "transition" && status.transition >= 3} onClick={() => onAssign(player.id, "transition")}>Transition</button><button className={current === "unprotected" ? "selected danger" : ""} onClick={() => onAssign(player.id, "unprotected")}>Release</button></div>{current === "unprotected" && <p>Will be released when tagging closes and will not enter RFA.</p>}</article>;
      })}{shown.length === 0 && <div className="activity-no-results">No players match this view.</div>}</div>
    </section>
  </div>;
}

type RfaMarketFilter = "all" | "awaiting" | "live" | "match" | "mine" | "bids" | "watching";

function RfaMarket({ candidates, franchises, auctions, watchedIds, phase, tagsReady, tentative, canManageLeague, availableCap, resolvedCount, onOpenBidding, onTestOpenBidding, onBid, onToggleWatch, onCloseAuction, onCloseNoBids }: { candidates: ReturnType<typeof rfaRolloverCandidates>; franchises: Franchise[]; auctions: Record<string, RfaAuction>; watchedIds: string[]; phase: RfaMarketPhase; tagsReady: boolean; tentative: boolean; canManageLeague: boolean; availableCap: number; resolvedCount: number; onOpenBidding: () => void; onTestOpenBidding: () => void; onBid: (player: ReturnType<typeof rfaRolloverCandidates>[number], amount: number) => { valid: boolean; reason: string }; onToggleWatch: (playerId: string) => void; onCloseAuction: (playerId: string) => void; onCloseNoBids: () => void }) {
  const [filter, setFilter] = useState<RfaMarketFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bidDraft, setBidDraft] = useState<{ playerId: string; amount: string } | null>(null);
  const [bidFeedback, setBidFeedback] = useState("");
  const clock = useRfaClock();
  const awaiting = candidates.filter((player) => !auctions[player.id]);
  const live = candidates.filter((player) => auctions[player.id]?.state === "live").sort((left, right) => auctions[left.id].closesAt - auctions[right.id].closesAt);
  const awaitingMatch = candidates.filter((player) => auctions[player.id]?.state === "awaiting_match").sort((left, right) => (auctions[left.id].matchDeadline ?? 0) - (auctions[right.id].matchDeadline ?? 0));
  const myBidIds = new Set(Object.entries(auctions).filter(([, auction]) => auction.history.some((bid) => bid.bidderId === "canton-legends")).map(([playerId]) => playerId));
  const filtered = candidates.filter((player) => filter === "all" || filter === "awaiting" && !auctions[player.id] || filter === "live" && auctions[player.id]?.state === "live" || filter === "match" && auctions[player.id]?.state === "awaiting_match" || filter === "mine" && player.franchiseId === "canton-legends" || filter === "bids" && myBidIds.has(player.id) || filter === "watching" && watchedIds.includes(player.id));
  const ordered = [...filtered].sort((left, right) => stateOrder(auctions[left.id]) - stateOrder(auctions[right.id]) || (auctions[left.id]?.closesAt ?? Number.MAX_SAFE_INTEGER) - (auctions[right.id]?.closesAt ?? Number.MAX_SAFE_INTEGER));
  const submitBid = () => {
    if (!bidDraft) return;
    const player = candidates.find((candidate) => candidate.id === bidDraft.playerId);
    if (!player) return;
    const result = onBid(player, Number(bidDraft.amount));
    if (!result.valid) { setBidFeedback(result.reason); return; }
    setBidFeedback(`${player.name}: bid accepted · Clock reset to 24:00:00`);
    setBidDraft(null);
  };
  return <div className="rfa-market"><section className={`rfa-market-status ${phase}`}><div><span className="eyebrow">2027 RFA Market</span><h2>{candidates.length + resolvedCount} Transition Players</h2><p>{awaiting.length} Awaiting Bid · {live.length} Live · {awaitingMatch.length} Awaiting Match · {resolvedCount} Resolved</p><small>Market close window: 5d 14h</small></div><div><span>{phase === "bidding" ? "Market open" : "Bidding locked"}</span>{phase === "tagging" && <button className="btn rfa-test-open" onClick={onTestOpenBidding}>Temporary test · Open bidding</button>}{canManageLeague && phase === "tagging" && <button className="btn btn-primary" disabled={!tagsReady} onClick={onOpenBidding}>Open RFA bidding</button>}{canManageLeague && phase === "bidding" && awaiting.length > 0 && <button className="btn" onClick={onCloseNoBids}>Close {awaiting.length} no-bid player{awaiting.length === 1 ? "" : "s"}</button>}{canManageLeague && phase === "tagging" && <small>{tentative ? "Opening finalizes tentative tags." : tagsReady ? "Tag declarations are final." : "Tentative or final confirmation required."}</small>}</div></section>{bidFeedback && <button className="rfa-market-feedback" onClick={() => setBidFeedback("")}>{bidFeedback}<span>Dismiss</span></button>}<section className="rfa-market-card"><header><div className="rfa-market-filters" role="group" aria-label="Filter RFA market">{([['all', `All ${candidates.length}`], ['awaiting', `Awaiting Bid ${awaiting.length}`], ['live', `Live ${live.length}`], ['match', `Awaiting Match ${awaitingMatch.length}`], ['mine', 'My RFA'], ['bids', 'My Bids'], ['watching', 'Watching']] as Array<[RfaMarketFilter, string]>).map(([id, label]) => <button className={filter === id ? "active" : ""} key={id} onClick={() => setFilter(id)}>{label}</button>)}</div><small>Live auctions close soonest first.</small></header><div className="rfa-market-table"><div className="rfa-market-table-head"><span>Player / Original</span><span>Status</span><span>High Bid</span><span>Relationship</span><span>Time</span><span>Action</span></div>{ordered.map((player) => { const owner = franchises.find((franchise) => franchise.id === player.franchiseId); const auction = auctions[player.id]; const highBid = auction?.history.at(-1); const userLastBid = auction?.history.filter((bid) => bid.bidderId === "canton-legends").at(-1); const relationship = rfaAuctionRelationship({ currentUserId: "canton-legends", originalOwnerId: player.franchiseId, highBidderId: highBid?.bidderId, userLastBid: userLastBid?.amount, watching: watchedIds.includes(player.id) }); const minimum = Math.max(RFA_MARKET_RULES.minimumBid, (highBid?.amount ?? 0) + RFA_MARKET_RULES.bidIncrement); const deadline = auction?.state === "awaiting_match" ? auction.matchDeadline : auction?.closesAt; const remaining = deadline ? formatRfaTime(deadline, clock) : "—"; const urgency = deadline ? rfaUrgency(deadline, clock) : ""; const state = auction?.state ?? "awaiting_bid"; return <div className={`rfa-market-row ${state} ${urgency}`} key={player.id}><button className="rfa-market-player" onClick={() => setExpanded((current) => current === player.id ? null : player.id)}><PlayerIdentity name={player.name} position={player.position} /><small><NflTeamMark team={player.team} /> <span className="franchise-mark" style={{ background: owner?.color }}>{owner?.abbreviation}</span>{owner?.name}</small></button><span className={`rfa-market-state ${state}`}>{state === "live" ? "LIVE AUCTION" : state === "awaiting_match" ? "AWAITING MATCH" : "AWAITING FIRST BID"}</span><span className="rfa-market-price"><b>${highBid ? highBid.amount : `${RFA_MARKET_RULES.minimumBid}+`}</b><small>{highBid?.bidderName ?? "Opening bid"}{auction ? ` · ${auction.history.length} bid${auction.history.length === 1 ? "" : "s"}` : ""}</small></span><span className={`rfa-relationship ${relationship}`}>{relationship === "your_rfa" ? "YOUR RFA — CANNOT BID" : relationship === "winning" && state === "awaiting_match" ? "PENDING MATCH" : relationship === "winning" ? "YOU'RE WINNING" : relationship === "outbid" ? `OUTBID · your $${userLastBid?.amount}` : relationship === "watching" ? "WATCHING" : "CAN BID"}</span><strong className={`rfa-time ${urgency}`}>{remaining}</strong><div className="rfa-market-actions"><button className={watchedIds.includes(player.id) ? "watching" : ""} onClick={() => onToggleWatch(player.id)} aria-label={`${watchedIds.includes(player.id) ? "Stop watching" : "Watch"} ${player.name}`}>{watchedIds.includes(player.id) ? "★" : "☆"}</button>{state === "awaiting_match" ? <button className="btn" disabled>Bidding closed</button> : relationship === "your_rfa" ? <button className="btn" disabled>Matching rights retained</button> : relationship === "winning" ? <button className="btn" disabled>High bidder</button> : <button className="btn btn-primary" disabled={phase !== "bidding"} onClick={() => setBidDraft({ playerId: player.id, amount: String(minimum) })}>Bid</button>}{canManageLeague && state === "live" && <button className="btn" onClick={() => onCloseAuction(player.id)}>Close bidding</button>}</div>{expanded === player.id && <div className="rfa-market-detail"><div><b>Player context</b><span>Previous salary: <Money value={player.previousSalary} /></span><span>RFA starting salary: $1.00</span><span>Prior contract: 0 years</span><span>Exact close: {deadline ? new Date(deadline).toLocaleString("en-US") : "Starts with first bid"}</span></div><div><b>Bid history</b>{auction?.history.length ? [...auction.history].reverse().map((bid) => <span key={bid.id}>{bid.bidderName} — ${bid.amount} — {new Date(bid.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>) : <span>No bids yet.</span>}</div><div><b>Your auction context</b><span>{userLastBid ? `Last bid: $${userLastBid.amount}` : "You have not bid."}</span><span>Cap impact if high: ${highBid?.bidderId === "canton-legends" ? highBid.amount : 0} reserved</span><span>Notifications: {watchedIds.includes(player.id) ? "Watching price and timer" : "Not watching"}</span></div></div>}</div>; })}{ordered.length === 0 && <div className="activity-no-results">No players match this market view.</div>}</div></section>{bidDraft && (() => { const player = candidates.find((candidate) => candidate.id === bidDraft.playerId); const auction = auctions[bidDraft.playerId]; const minimum = Math.max(RFA_MARKET_RULES.minimumBid, (auction?.history.at(-1)?.amount ?? 0) + RFA_MARKET_RULES.bidIncrement); const amount = Number(bidDraft.amount); const validAmount = Number.isInteger(amount) && amount >= minimum; return <div className="rfa-bid-backdrop"><section className="rfa-bid-drawer" role="dialog" aria-modal="true" aria-labelledby="rfa-bid-title"><span className="eyebrow">Confirm RFA bid</span><h2 id="rfa-bid-title">Bid on {player?.name}?</h2><label>Your bid<input className="input" type="number" min={minimum} step="1" value={bidDraft.amount} onChange={(event) => setBidDraft({ ...bidDraft, amount: event.target.value })} /></label><div><span>Current available cap <b><Money value={availableCap} /></b></span><span>If high bidder <b><Money value={availableCap - (Number.isFinite(amount) ? amount : 0)} /> available</b></span></div><p>Winning RFA bids reserve cap until you are outbid or the player is resolved. Submitted bids cannot be withdrawn.</p>{bidFeedback && <small>{bidFeedback}</small>}<div><button className="btn" onClick={() => { setBidDraft(null); setBidFeedback(""); }}>Cancel</button><button className="btn btn-primary" disabled={!validAmount || amount > availableCap} onClick={submitBid}>Place ${Number.isFinite(amount) ? amount : 0} Bid</button></div></section></div>; })()}</div>;
}

function stateOrder(auction?: RfaAuction) { return auction?.state === "live" ? 0 : auction?.state === "awaiting_match" ? 1 : 2; }
function formatRfaTime(deadline: number, clock: number | null) { if (!clock) return "24:00:00"; const seconds = Math.max(0, Math.floor((deadline - clock) / 1000)); return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
function rfaUrgency(deadline: number, clock: number | null) { if (!clock) return "normal"; const hours = (deadline - clock) / 3_600_000; return hours < 1 ? "urgent" : hours < 6 ? "attention" : "normal"; }
function useRfaClock() { const [clock, setClock] = useState<number | null>(null); useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(timer); }, []); return clock; }

function RfaMatchDecisions({ candidates, auctions, availableCap, onResolve }: { candidates: ReturnType<typeof rfaRolloverCandidates>; auctions: Record<string, RfaAuction>; availableCap: number; onResolve: (playerId: string, status: "matched" | "not_matched") => void }) {
  const [decision, setDecision] = useState<{ playerId: string; status: "matched" | "not_matched" } | null>(null);
  const clock = useRfaClock();
  if (!candidates.length) return <RfaEmptyState title="No decisions required" text="You currently have no RFA matching decisions." details={["League-wide unresolved decisions remain visible in RFA Market", "Winning bidders remain pending until owners decide", "Match windows automatically decline at expiration"]} />;
  const selectedPlayer = decision ? candidates.find((player) => player.id === decision.playerId) : undefined;
  const selectedAuction = selectedPlayer ? auctions[selectedPlayer.id] : undefined;
  const selectedBid = selectedAuction?.history.at(-1);
  return <div className="rfa-match-decisions"><header><div><span className="eyebrow">Action required</span><h2>My Match Decisions</h2><p>Only Canton decisions appear here. Each player has a separate 24-hour response window.</p></div><span>{candidates.length} required</span></header>{candidates.map((player) => { const auction = auctions[player.id]; const bid = auction.history.at(-1)!; return <article key={player.id}><div><PlayerIdentity name={player.name} position={player.position} /><small><NflTeamMark team={player.team} /> · Canton matching rights</small></div><span><small>Winning offer</small><b><Money value={bid.amount} /></b></span><span><small>Winning franchise</small><b>{bid.bidderName}</b></span><span><small>Match deadline</small><b>{formatRfaTime(auction.matchDeadline ?? auction.closesAt, clock)}</b></span><span><small>After matching</small><b><Money value={availableCap - Math.max(0, bid.amount - 1)} /></b></span><div><button className="btn btn-primary" disabled={availableCap < bid.amount - 1} onClick={() => setDecision({ playerId: player.id, status: "matched" })}>Match ${bid.amount}</button><button className="btn" onClick={() => setDecision({ playerId: player.id, status: "not_matched" })}>Decline</button></div></article>; })}{decision && selectedPlayer && selectedBid && <div className="rfa-confirm-backdrop"><section className="rfa-confirm-dialog" role="dialog" aria-modal="true"><span className="eyebrow">{decision.status === "matched" ? "Confirm match" : "Decline matching rights"}</span><h2>{decision.status === "matched" ? `Keep ${selectedPlayer.name}` : `Award ${selectedPlayer.name} to ${selectedBid.bidderName}`}</h2><p>{decision.status === "matched" ? "Canton retains the player at the winning RFA salary." : "The winning bidder acquires the player. This cannot be reversed after confirmation."}</p><div className="rfa-confirm-summary"><span><b><Money value={selectedBid.amount} /></b>Winning salary</span><span><b><Money value={availableCap} /></b>Available now</span><span><b><Money value={availableCap - Math.max(0, selectedBid.amount - 1)} /></b>After match</span><span><b>Later</b>Contract years</span></div><strong>Contract years remain unassigned until final roster compliance.</strong><div className="rfa-confirm-actions"><button className="btn" onClick={() => setDecision(null)}>Go back</button><button className="btn btn-primary" onClick={() => { onResolve(selectedPlayer.id, decision.status); setDecision(null); }}>{decision.status === "matched" ? "Confirm Match" : "Confirm Decline"}</button></div></section></div>}</div>;
}

function RfaResults({ franchiseOutcomes, marketResults, players, franchises, transitionCount, onOpenMarket }: { franchiseOutcomes: ReturnType<typeof franchiseTagOutcomes>; marketResults: RfaMarketResult[]; players: ReturnType<typeof rfaRolloverCandidates>; franchises: Franchise[]; transitionCount: number; onOpenMarket: () => void }) {
  const [filter, setFilter] = useState<"all" | "changed" | "matched" | "no_bids">("all");
  const filtered = marketResults.filter((result) => filter === "all" || filter === "changed" && result.status === "not_matched" || filter === "matched" && result.status === "matched" || filter === "no_bids" && result.status === "no_bid");
  const average = marketResults.length ? marketResults.reduce((total, result) => total + result.salary, 0) / marketResults.length : 0;
  if (!franchiseOutcomes.length && !marketResults.length) return <RfaEmptyState title="No finalized RFA results yet" text="Franchise tags, matched offers, changed teams, and no-bid retentions will form the permanent 2027 RFA ledger." details={["Complete bid history is preserved", "Results use explicit historical terminology", "Resolved players leave RFA Market"]} />;
  return <div className="rfa-results"><section className="rfa-results-header"><div><span className="eyebrow">Permanent 2027 ledger</span><h2>RFA Results</h2><p>Franchise tags and every resolved Transition outcome remain available for league history.</p></div><span>{franchiseOutcomes.length + marketResults.length} results</span></section><div className="rfa-results-metrics"><span><b>{marketResults.length}</b>RFA Players</span><span><b>{marketResults.filter((result) => result.bidHistory.length).length}</b>Bid On</span><span><b><Money value={average} /></b>Avg Final Salary</span><span><b>{marketResults.filter((result) => result.status === "not_matched").length}</b>Changed Teams</span><span><b>{marketResults.filter((result) => result.status === "matched").length}</b>Matched</span><span><b>{marketResults.filter((result) => result.status === "no_bid").length}</b>No Bids</span></div>{franchiseOutcomes.length > 0 && <section className="rfa-results-table"><header><span>Player</span><span>Original</span><span>Final Salary</span><span>Result</span></header>{franchiseOutcomes.map((outcome) => <article key={outcome.player.id}><div><PlayerIdentity name={outcome.player.name} position={outcome.player.position} /><small><NflTeamMark team={outcome.player.team} /> · Canton Legends</small></div><span>Canton</span><strong><Money value={outcome.newSalary} /></strong><span className="rfa-result-badge">Franchise tagged</span></article>)}</section>}<section className="rfa-results-ledger"><div className="rfa-result-filters">{([['all', 'All'], ['changed', 'Changed Teams'], ['matched', 'Matched'], ['no_bids', 'No Bids']] as const).map(([id, label]) => <button className={filter === id ? "active" : ""} key={id} onClick={() => setFilter(id)}>{label}</button>)}</div><div className="rfa-results-table"><header><span>Player</span><span>Original</span><span>Winner</span><span>Final Salary</span><span>Result</span></header>{filtered.map((result) => { const player = players.find((item) => item.id === result.playerId); const original = franchises.find((franchise) => franchise.id === result.originalFranchiseId); return <details key={result.playerId}><summary><span>{player ? <PlayerIdentity name={player.name} position={player.position} /> : result.playerId}</span><span>{original?.name ?? result.originalFranchiseId}</span><span>{result.winnerName}</span><strong><Money value={result.salary} /></strong><span className={`rfa-result-badge ${result.status}`}>{rfaResultLabel(result.status)}</span></summary><div><b>Permanent bid history</b>{result.bidHistory.length ? [...result.bidHistory].reverse().map((bid) => <span key={bid.id}>{bid.bidderName} — ${bid.amount} — {new Date(bid.createdAt).toLocaleString("en-US")}</span>) : <span>No bids · original franchise retained player for $1.</span>}</div></details>; })}{!filtered.length && <div className="activity-no-results">No results match this filter.</div>}</div></section>{transitionCount > marketResults.length && <section className="rfa-results-next"><div><b>{transitionCount - marketResults.filter((result) => result.originalFranchiseId === "canton-legends").length} Canton Transition player{transitionCount === 1 ? "" : "s"} remain unresolved</b><span>Track bidding and matching-right status in RFA Market.</span></div><button className="btn" onClick={onOpenMarket}>View RFA Market</button></section>}</div>;
}

function RfaEmptyState({ title, text, details }: { title: string; text: string; details: string[] }) { return <section className="rfa-empty"><span className="eyebrow">RFA workflow state</span><h2>{title}</h2><p>{text}</p><div>{details.map((detail) => <span key={detail}>✓ {detail}</span>)}</div></section>; }

function RfaTagValues({ values, players }: { values: ReturnType<typeof franchiseTagValues>; players: RosterPlayer[] }) { return <section className="rfa-values-card"><header><div><span className="eyebrow">Transparent top-three calculation</span><h2>2027 Franchise Tag Values</h2></div><small>Uses pre-rollover salaries · average rounded up</small></header><div className="rfa-values-table"><div><b>Position</b><b>Top salaries</b><b>Average</b><b>Tag</b></div>{values.map((value) => <details key={value.position}><summary><PositionBadge position={value.position} /><span>{value.salaries.map((salary) => `$${salary}`).join(" · ")}</span><span>${value.average.toFixed(2)}</span><strong>${value.value}</strong></summary><div>{players.filter((player) => player.position === value.position).sort((a, b) => Number(b.salary) - Number(a.salary)).slice(0, 3).map((player) => <span key={player.id}><b>{player.name}</b><small>{player.franchise}</small><strong><Money value={player.salary} /></strong></span>)}</div></details>)}</div></section>; }

function DraftAuction({
  feature,
  franchises,
  players,
  role,
}: {
  feature: string;
  franchises: Franchise[];
  players: RosterPlayer[];
  role: AppRole;
}) {
  if (feature === "rfa") return <RfaWorkspace players={players} franchises={franchises} canManageLeague={role === "commissioner" || role === "assistant_commissioner"} />;
  if (feature === "draft-room") return <DraftRoom players={players} franchises={franchises} role={role} />;
  return (
    <div className="stack">
      <div className="grid-4">
        <Metric label="On the clock" value="Canton" sub="Pick 1.04" />
        <Metric label="Time remaining" value="08:42" sub="10-minute clock" />
        <Metric label="Auction budget" value="$187" sub="Available" />
        <Metric label="Open RFA bids" value="3" sub="Next close 8:00 PM" />
      </div>
      {feature === "pick-ownership" ? (
        <PickInventory />
      ) : (
        <div className="dashboard-grid">
          <Card title={featureNames[feature] ?? "Draft board"}>
            <div className="draft-board">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i}>
                  <span>{i + 1}</span>
                  <strong>{franchises[i]?.name}</strong>
                  <small>
                    {i < 3
                      ? ["Ashton Jeanty", "Tetairoa McMillan", "Travis Hunter"][
                          i
                        ]
                      : "On the board"}
                  </small>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Front office note">
            <p className="feature-copy">
              Canton ranks fourth in draft capital. The model recommends
              preserving the 2027 first unless a top-18 dynasty asset becomes
              available.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

function PowerRankings({ players, franchises }: { players: RosterPlayer[]; franchises: Franchise[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rankings = useMemo(() => powerRankings(franchises.map((franchise) => {
    const roster = players.filter((player) => player.franchiseId === franchise.id && player.status === "active");
    const values = roster.map((player) => Number(player.priorPoints) / 17).sort((a, b) => b - a);
    const offense = roster.filter((player) => ["QB", "RB", "WR", "TE", "PK"].includes(player.position)).reduce((total, player) => total + Number(player.priorPoints), 0);
    const defense = roster.filter((player) => ["DL", "LB", "DB"].includes(player.position)).reduce((total, player) => total + Number(player.priorPoints), 0);
    return { id: franchise.id, lineupStrength: values.slice(0, 17).reduce((total, value) => total + value, 0), depthStrength: values.slice(17, 30).reduce((total, value) => total + value, 0), offenseStrength: offense, defenseStrength: defense };
  })), [franchises, players]);
  const selected = rankings.find((team) => team.id === selectedId);
  const selectedFranchise = franchises.find((team) => team.id === selectedId);
  return <div className="power-workspace">
    <section className="power-header-strip"><div><span className="eyebrow">FOFL Power Model v1</span><h2>Current strength</h2><small>2025 production-derived roster strength · weekly scoring inputs activate after imports</small></div><div><strong>{rankings[0]?.score ?? "—"}</strong><span>Top power score</span></div></section>
    <section className="power-list-card"><header><div><span className="eyebrow">League hierarchy</span><h2>Power rankings</h2></div><small>Lineup 70% · Depth 30% · Current weekly form unavailable</small></header><div className="power-ranked-list">{rankings.map((team) => { const franchise = franchises.find((candidate) => candidate.id === team.id); return <button className={selectedId === team.id ? "active" : ""} key={team.id} onClick={() => setSelectedId(team.id)} type="button"><span className="power-rank">#{team.rank}</span><span className="power-mark" style={{ background: franchise?.color }}>{franchise?.abbreviation}</span><span className="power-team"><strong>{franchise?.name}</strong><small>{franchise?.division} · {powerTier(team.score)}</small></span><span className="power-component"><b>OFF {team.components.offense.toFixed(0)}</b><b>DEF {team.components.defense.toFixed(0)}</b><b>DEPTH {team.components.depth.toFixed(0)}</b></span><span className="power-score"><strong>{team.score.toFixed(1)}</strong><small>Power score</small></span></button>; })}</div></section>
    {selected && selectedFranchise && <section className="power-detail"><div><span className="eyebrow">Why #{selected.rank}?</span><h2>{selectedFranchise.name}</h2><p>Ranked from the available production-derived lineup and roster-depth inputs. Weekly scoring, all-play, form, and schedule adjustment will join this explanation when imported.</p></div><div className="power-detail-scores"><span>Starting lineup <b>{selected.components.lineup.toFixed(1)}</b></span><span>Roster depth <b>{selected.components.depth.toFixed(1)}</b></span><span>Offense <b>{selected.components.offense.toFixed(1)}</b></span><span>Defense <b>{selected.components.defense.toFixed(1)}</b></span></div></section>}
  </div>;
}

function RecordBook({ players, franchises }: { players: RosterPlayer[]; franchises: Franchise[] }) {
  const leaders = useMemo(() => [...players].sort((left, right) => Number(right.priorPoints) - Number(left.priorPoints)).slice(0, 5), [players]);
  const salaryLeaders = useMemo(() => [...players].sort((left, right) => Number(right.salary) - Number(left.salary)).slice(0, 5), [players]);
  return <div className="records-workspace">
    <section className="records-coverage"><div><span className="eyebrow">FOFL record book</span><h2>Historical records</h2><p>Available coverage: imported 2026 roster and player production only. Matchup, season, playoff, and championship records unlock as historical imports arrive.</p></div><span>Data coverage<br /><strong>2026 roster</strong></span></section>
    <div className="records-featured"><ContractMetric label="Most rostered players" value={players.length} sub="2026 imported roster" /><ContractMetric label="Highest player points" value={leaders[0]?.priorPoints ?? "—"} sub={leaders[0]?.name ?? "No data"} /><ContractMetric label="Highest salary" value={<Money value={salaryLeaders[0]?.salary ?? 0} />} sub={salaryLeaders[0]?.name ?? "No data"} /><ContractMetric label="Franchises tracked" value={franchises.length} sub="Current league map" /></div>
    <div className="records-grid"><Card title="2025 player scoring leaders"><ol className="record-leaderboard">{leaders.map((player, index) => <li key={player.id}><strong>#{index + 1}</strong><span><b>{player.name}</b><small>{player.franchise} · {player.position}</small></span><em>{player.priorPoints}</em></li>)}</ol></Card><Card title="Current salary records"><ol className="record-leaderboard">{salaryLeaders.map((player, index) => <li key={player.id}><strong>#{index + 1}</strong><span><b>{player.name}</b><small>{player.franchise} · {player.position}</small></span><em><Money value={player.salary} /></em></li>)}</ol></Card></div>
    <Card title="Record categories"><div className="record-category-grid">{["Franchise", "Single game", "Season", "Streaks", "Playoffs", "Draft", "Transactions", "Contracts & cap"].map((category) => <div key={category}><strong>{category}</strong><span>{category === "Contracts & cap" ? "Ready from current salary data" : "Awaiting historical imports"}</span></div>)}</div></Card>
  </div>;
}

function LeagueAnalytics({
  feature,
  franchises,
  players,
}: {
  feature: string;
  franchises: Franchise[];
  players: RosterPlayer[];
}) {
  if (feature === "history") return <LeagueMemory />;
  if (feature === "power-rankings") return <PowerRankings players={players} franchises={franchises} />;
  if (feature === "records") return <RecordBook players={players} franchises={franchises} />;
  return (
    <div className="stack">
      <div className="grid-4">
        <Metric label="Top power score" value="84.2" sub="Tampa Bay Storm" />
        <Metric
          label="Biggest riser"
          value="Canton ↑2"
          sub="Acquired WR depth"
        />
        <Metric
          label="Salary inflation"
          value="+14%"
          sub="Wide receivers YoY"
        />
        <Metric label="League cap used" value="76.4%" sub="$2,832 available" />
      </div>
      <Card
        title={feature === "teams" ? "Front offices" : "Real power rankings"}
      >
        <div className="power-list">
          {franchises.slice(0, 8).map((f, i) => (
            <div key={f.id}>
              <strong>#{i + 1}</strong>
              <span>
                <b>{f.name}</b>
                <small>
                  {f.owner} · {f.division}
                </small>
              </span>
              <div className="power-bar">
                <i style={{ width: `${84 - i * 4}%` }} />
              </div>
              <b>{(84.2 - i * 3.7).toFixed(1)}</b>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid-2">
        <Card title="League economy">
          <div className="assessment-grid">
            <Assessment
              label="Position market"
              value="Elite RBs trade at a 22% discount to WR"
              tone="info"
            />
            <Assessment
              label="Best efficiency"
              value="1.42 projected points per salary dollar"
              tone="good"
            />
          </div>
        </Card>
        <Card title="Current storylines">
          <div className="redzone-feed">
            <Feed
              icon={<Sparkles />}
              tone="blue"
              label="Title defense"
              text="The defending champion has opened the season 1–4."
            />
            <Feed
              icon={<Target />}
              tone="green"
              label="Game of the week"
              text="#1 and #2 meet with the top seed at stake."
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function DraftCapitalInventory() {
  const capital = useMemo(() => draftCapital(draftPicks, "canton-legends"), []);
  const franchise = (id: string) => franchises.find((team) => team.id === id);
  return <div className="draft-capital-workspace">
    <section className="draft-summary"><ContractMetric label="Picks owned" value={capital.owned.length} sub="Future assets" /><ContractMetric label="Original picks" value={capital.owned.filter((pick) => pick.originalFranchiseId === "canton-legends").length} sub="Still under control" /><ContractMetric label="Acquired" value={capital.owned.filter((pick) => pick.originalFranchiseId !== "canton-legends").length} sub="From other teams" /><ContractMetric label="Traded away" value={capital.tradedAway.length} sub="Original picks elsewhere" /></section>
    <div className="draft-main-grid"><section className="draft-inventory"><header><div><span className="eyebrow">Draft capital</span><h2>Owned picks by year</h2></div><small>Original-team identity is preserved</small></header>{[2027, 2028, 2029].map((season) => <section className="draft-year" key={season}><h3>{season} Draft <span>{capital.owned.filter((pick) => pick.season === season).length} picks</span></h3><div>{capital.owned.filter((pick) => pick.season === season).map((pick) => { const original = franchise(pick.originalFranchiseId); const acquired = pick.originalFranchiseId !== "canton-legends"; return <article key={pick.id}><span className={`round-badge round-${pick.round}`}>{ordinal(pick.round)}</span><div><strong>{season} {original?.name} {ordinal(pick.round)}</strong><span>{acquired ? `Acquired from ${franchise(pick.acquiredFromFranchiseId ?? "")?.name ?? "another franchise"}` : "Original Canton pick"}{pick.acquiredAt ? ` · ${pick.acquiredAt}` : ""}</span></div><em className={acquired ? "acquired" : "owned"}>{acquired ? "Acquired" : "Own"}</em></article>; })}</div></section>)}</section>
      <aside className="draft-context"><Card title="Traded away"><ul className="traded-picks-list">{capital.tradedAway.map((pick) => <li key={pick.id}><div><strong>{pick.season} {franchise(pick.originalFranchiseId)?.abbreviation} {ordinal(pick.round)}</strong><span>Owned by {franchise(pick.currentFranchiseId)?.name}</span></div><Link href="/transactions/trade-center">View</Link></li>)}</ul></Card><Card title="Capital position"><ul className="capital-surplus">{capital.surplus.map((item) => <li key={item.round}><span>{ordinal(item.round)}</span><strong className={item.delta > 0 ? "positive" : item.delta < 0 ? "negative" : ""}>{item.delta > 0 ? `+${item.delta}` : item.delta}</strong><small>{item.count} owned</small></li>)}</ul></Card></aside></div>
    <Card title="Future capital"><div className="draft-distribution"><div><span>Year / round</span>{[1, 2, 3, 4, 5].map((round) => <b key={round}>{round}</b>)}</div>{capital.distribution.map((item) => <div key={item.season}><strong>{item.season}</strong>{item.rounds.map((count, index) => <span className={count ? "has-pick" : ""} key={index}>{count || "—"}</span>)}</div>)}</div></Card>
  </div>;
}

function ordinal(value: number) { return `${value}${value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th"}`; }

function PickInventory() {
  return (
    <Card title="Canton draft capital">
      <div className="pick-grid">
        {[
          "2027 · Round 1",
          "2027 · Round 2",
          "2027 · Round 4",
          "2028 · Round 1",
          "2028 · Round 2",
          "2029 · Round 1",
        ].map((pick, i) => (
          <div key={pick}>
            <span className="pick-year">{pick.split(" · ")[0]}</span>
            <strong>{pick.split(" · ")[1]}</strong>
            <small>{i === 1 ? "via Detroit" : "Original pick"}</small>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LeagueMemory() {
  const [question, setQuestion] = useState(
    "Who has Bryan traded with the most?",
  );
  const [answer, setAnswer] = useState("");
  return (
    <div className="dashboard-grid">
      <Card title="Ask League Memory">
        <div className="memory-ask">
          <input
            className="input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={() =>
              setAnswer(
                "Chris is Bryan's most frequent trade partner with 17 completed trades. Their largest deal eventually produced four current roster assets across both teams.",
              )
            }
          >
            Ask FOFL
          </button>
        </div>
        {answer && (
          <div className="memory-answer">
            <Sparkles size={18} />
            <p>{answer}</p>
          </div>
        )}
      </Card>
      <Card title="Try asking">
        <button
          className="question-chip"
          onClick={() =>
            setQuestion("What was the biggest upset in league history?")
          }
        >
          Biggest upset?
        </button>
        <button
          className="question-chip"
          onClick={() => setQuestion("Has anyone won after starting 1–5?")}
        >
          Won after 1–5?
        </button>
        <button
          className="question-chip"
          onClick={() => setQuestion("Who owned Justin Jefferson before me?")}
        >
          Player ownership trail?
        </button>
      </Card>
    </div>
  );
}

function PlayerTable({
  players,
  salary = false,
}: {
  players: RosterPlayer[];
  salary?: boolean;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>NFL</th>
            <th>2025 Pts</th>
            {salary && <th>Salary</th>}
            <th>Years</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id}>
              <td>
                <PlayerIdentity name={p.name} position={p.position} />
              </td>
              <td><NflTeamMark team={p.team} /></td>
              <td>{p.priorPoints}</td>
              {salary && (
                <td>
                  <Money value={p.salary} />
                </td>
              )}
              <td>{p.contractYears || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}
function Assessment({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`assessment assessment-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Feed({
  icon,
  tone,
  label,
  text,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  text: string;
}) {
  return (
    <div className={`feed-item feed-${tone}`}>
      <span>{icon}</span>
      <div>
        <strong>{label}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}
function ActivityFeed() {
  return (
    <div className="redzone-feed">
      <Feed
        icon={<Activity />}
        tone="blue"
        label="Trade accepted"
        text="Detroit acquired a 2027 Round 2 pick from Barcelona."
      />
      <Feed
        icon={<CircleDollarSign />}
        tone="green"
        label="Waiver claim"
        text="Canton added a free agent on a one-year contract."
      />
    </div>
  );
}
