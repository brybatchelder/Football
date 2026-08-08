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
import { useEffect, useMemo, useState } from "react";
import type { Position, RosterPlayer } from "@/domain/types";
import {
  buildLineupSlots,
  defaultStarterCounts,
  LINEUP_SETTINGS_STORAGE_KEY,
  movePlayerToBench,
  movePlayerToLineupSlot,
  normalizeStarterCounts,
} from "@/domain/lineup-config";
import { lineupFormation } from "@/domain/lineup-formation";
import {
  Card,
  Money,
  PlayerIdentity,
  PositionBadge,
  SlotBadge,
} from "@/components/ui";

type Franchise = {
  id: string;
  name: string;
  owner: string;
  salary: string;
  division: string;
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
  waivers: "Waivers",
  "add-drop": "Add / Drop",
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
}: {
  section: string;
  feature: string;
  players: RosterPlayer[];
  franchises: Franchise[];
}) {
  if (section === "my-team")
    return <MyTeam feature={feature} players={players} />;
  if (section === "gameday") return <GameDay feature={feature} />;
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
    return <DraftAuction feature={feature} franchises={franchises} />;
  if (section === "league")
    return <LeagueAnalytics feature={feature} franchises={franchises} />;
  return <LeagueAnalytics feature="power-rankings" franchises={franchises} />;
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
  if (feature === "contracts") {
    const salary = team.reduce((sum, player) => sum + Number(player.salary), 0);
    return (
      <div className="stack lineup-side-column">
        <div className="grid-4">
          <Metric
            label="Committed salary"
            value={`$${salary.toFixed(0)}`}
            sub="2026 active contracts"
          />
          <Metric
            label="Cap space"
            value={`$${(1000 - salary).toFixed(0)}`}
            sub="Before pending moves"
          />
          <Metric
            label="Expiring"
            value={String(team.filter((p) => p.contractYears === 1).length)}
            sub="Contracts after 2026"
          />
          <Metric
            label="Cap efficiency"
            value="1.42"
            sub="Projected points per $"
          />
        </div>
        <Card title="Contract portfolio">
          <PlayerTable
            players={[...team].sort(
              (a, b) => Number(b.salary) - Number(a.salary),
            )}
            salary
          />
        </Card>
      </div>
    );
  }
  if (feature === "draft-picks") return <PickInventory />;
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

function LineupBuilder({ players }: { players: RosterPlayer[] }) {
  const [lineupSlots, setLineupSlots] = useState(() =>
    buildLineupSlots(defaultStarterCounts),
  );
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);

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
  const activeInteractionPlayerId = draggedPlayerId ?? selectedPlayerId;
  const activeInteractionPlayer = players.find(
    (player) => player.id === activeInteractionPlayerId,
  );
  const selectedStarterSlot = lineupSlots.find(
    (slot) => assignments[slot.key] === selectedPlayerId,
  );
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
    setDraggedPlayerId(null);
  }

  function benchPlayer(playerId: string) {
    setAssignments((current) => movePlayerToBench(current, playerId));
    setSaved(false);
    setSelectedPlayerId(null);
    setDraggedPlayerId(null);
  }

  function startDrag(event: React.DragEvent, playerId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", playerId);
    setDraggedPlayerId(playerId);
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
    <div
      className="stack lineup-workspace"
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest("button")) {
          setSelectedPlayerId(null);
        }
      }}
    >
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
            const canAccept = Boolean(
              activeInteractionPlayer &&
                slot.eligible.includes(activeInteractionPlayer.position),
            );
            return (
              <div
                className={`lineup-row ${canAccept ? "can-drop" : ""}`}
                key={slot.key}
                onDragOver={(event) => {
                  if (canAccept) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const playerId = event.dataTransfer.getData("text/plain");
                  if (playerId) placePlayer(playerId, slot.key);
                }}
              >
                <SlotBadge slot={slot.label} />
                <button
                  className={`lineup-player-button ${
                    player?.id === selectedPlayerId ? "selected" : ""
                  }`}
                  type="button"
                  draggable={Boolean(player)}
                  onDragStart={(event) => {
                    if (player) startDrag(event, player.id);
                  }}
                  onDragEnd={() => setDraggedPlayerId(null)}
                  onClick={() => {
                    if (selectedPlayerId && canAccept) {
                      placePlayer(selectedPlayerId, slot.key);
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
                if (slot === "BENCH" && draggedPlayerId) event.preventDefault();
              }}
              onDrop={(event) => {
                if (slot !== "BENCH") return;
                event.preventDefault();
                const playerId = event.dataTransfer.getData("text/plain");
                if (playerId) benchPlayer(playerId);
              }}
              onClick={() => {
                if (slot === "BENCH" && selectedPlayerId && assigned.has(selectedPlayerId)) {
                  benchPlayer(selectedPlayerId);
                }
              }}
            >
              {slot === "BENCH" && (
                <button
                  className="bench-target-button"
                  type="button"
                  disabled={!selectedPlayerId || !assigned.has(selectedPlayerId)}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (selectedPlayerId) benchPlayer(selectedPlayerId);
                  }}
                >
                  {selectedPlayerId && assigned.has(selectedPlayerId)
                    ? "Move selected starter to bench"
                    : "Drop a starter here to bench them"}
                </button>
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
                    draggable
                    key={player.id}
                    onDragStart={(event) => startDrag(event, player.id)}
                    onDragEnd={() => setDraggedPlayerId(null)}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (
                        selectedStarterSlot?.eligible.includes(player.position)
                      ) {
                        placePlayer(player.id, selectedStarterSlot.key);
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
        <small>{player.team} {display.opponent} · {display.kickoff}</small>
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
                  <td>{p.team}</td>
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

function TransactionQueue({
  feature,
  players,
}: {
  feature: string;
  players: RosterPlayer[];
}) {
  const [message, setMessage] = useState("");
  const actions =
    feature === "waivers"
      ? ["Claim submitted", "Priority #5", "Processes Wednesday"]
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

function GameDay({ feature }: { feature: string }) {
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

function DraftAuction({
  feature,
  franchises,
}: {
  feature: string;
  franchises: Franchise[];
}) {
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

function LeagueAnalytics({
  feature,
  franchises,
}: {
  feature: string;
  franchises: Franchise[];
}) {
  if (feature === "history") return <LeagueMemory />;
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
              <td>{p.team}</td>
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
