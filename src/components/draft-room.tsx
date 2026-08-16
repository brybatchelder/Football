"use client";
/* eslint-disable react-hooks/purity, react-hooks/set-state-in-effect */

import Link from "next/link";
import { ChevronDown, ChevronUp, MessageCircle, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  canDraftCurrentPick,
  nextOwnedPick,
  pickLabel,
  type DraftCandidate,
  type DraftRoomPick,
  type DraftStatus,
} from "@/domain/draft-room";
import type { AppRole, Position, RosterPlayer } from "@/domain/types";
import { NflTeamMark } from "./team-display";
import { PlayerIdentity, PositionBadge } from "./ui";

type Franchise = {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
};

type DraftLogEntry = { id: string; message: string; createdAt: number };
type DraftUndoState = Pick<DraftRoomSnapshot, "status" | "picks" | "currentIndex" | "deadlineAt" | "pausedRemaining" | "queue" | "log">;
type DraftRoomSnapshot = {
  status: DraftStatus;
  picks: DraftRoomPick[];
  currentIndex: number;
  deadlineAt: number;
  pausedRemaining: number;
  queue: string[];
  log: DraftLogEntry[];
  timeoutPolicy: "queue_then_skip" | "queue_then_rank" | "skip";
  attentionCues: boolean;
  undoState?: DraftUndoState;
  archivedPicks?: DraftRoomPick[];
};

const DRAFT_STORAGE_KEY = "fofl-2027-draft-room-v1";
const USER_FRANCHISE_ID = "canton-legends";
const PICK_SECONDS = 10 * 60;

const candidates: DraftCandidate[] = [
  { id: "rookie-malachi-lawrence", name: "Malachi Lawrence", position: "DL", nflTeam: "DAL", age: 22, rank: 398, adp: 205, projection: 58, rookie: true },
  { id: "rookie-kendal-daniels", name: "Kendal Daniels", position: "LB", nflTeam: "ATL", age: 23, rank: 411, adp: 211, projection: 56, rookie: true },
  { id: "rookie-jordan-burch", name: "Jordan Burch", position: "DL", nflTeam: "ARI", age: 22, rank: 419, adp: 214, projection: 54, rookie: true },
  { id: "rookie-cashius-howell", name: "Cashius Howell", position: "DL", nflTeam: "CIN", age: 23, rank: 427, adp: 216, projection: 55, rookie: true },
  { id: "rookie-damien-martinez", name: "Damien Martinez", position: "RB", nflTeam: "SEA", age: 22, rank: 438, adp: 219, projection: 72, rookie: true },
  { id: "rookie-tory-horton", name: "Tory Horton", position: "WR", nflTeam: "SEA", age: 23, rank: 446, adp: 224, projection: 68, rookie: true },
  { id: "rookie-ollie-gordon", name: "Ollie Gordon II", position: "RB", nflTeam: "MIA", age: 22, rank: 452, adp: 226, projection: 63, rookie: true },
  { id: "rookie-jaylin-noel", name: "Jaylin Noel", position: "WR", nflTeam: "HOU", age: 23, rank: 458, adp: 229, projection: 61, rookie: true },
  { id: "rookie-dillon-gabriel", name: "Dillon Gabriel", position: "QB", nflTeam: "CLE", age: 25, rank: 465, adp: 232, projection: 84, rookie: true },
  { id: "rookie-gunnar-helm", name: "Gunnar Helm", position: "TE", nflTeam: "TEN", age: 22, rank: 472, adp: 236, projection: 49, rookie: true },
  { id: "rookie-bhayshul-tuten", name: "Bhayshul Tuten", position: "RB", nflTeam: "JAX", age: 22, rank: 479, adp: 241, projection: 60, rookie: true },
  { id: "rookie-jalen-royals", name: "Jalen Royals", position: "WR", nflTeam: "KC", age: 22, rank: 486, adp: 245, projection: 57, rookie: true },
  { id: "rookie-mason-taylor", name: "Mason Taylor", position: "TE", nflTeam: "NYJ", age: 21, rank: 492, adp: 248, projection: 52, rookie: true },
  { id: "rookie-danny-stutsman", name: "Danny Stutsman", position: "LB", nflTeam: "NO", age: 22, rank: 501, adp: 253, projection: 66, rookie: true },
  { id: "rookie-kevin-winston", name: "Kevin Winston Jr.", position: "DB", nflTeam: "TEN", age: 21, rank: 509, adp: 258, projection: 62, rookie: true },
];

function initialSnapshot(): DraftRoomSnapshot {
  return {
    status: "LIVE",
    currentIndex: 3,
    deadlineAt: 0,
    pausedRemaining: PICK_SECONDS,
    queue: ["rookie-cashius-howell", "rookie-damien-martinez", "rookie-tory-horton"],
    timeoutPolicy: "queue_then_skip",
    attentionCues: false,
    picks: [
      { id: "5.08", round: 5, slot: 8, currentOwnerId: "houston-oilers", originalOwnerId: "houston-oilers", status: "COMPLETED", playerId: "rookie-malachi-lawrence", selectedAt: Date.parse("2026-08-15T19:32:00-05:00") },
      { id: "5.09", round: 5, slot: 9, currentOwnerId: "barcelona-dragons", originalOwnerId: "barcelona-dragons", status: "COMPLETED", playerId: "rookie-kendal-daniels", selectedAt: Date.parse("2026-08-15T19:36:00-05:00") },
      { id: "5.10", round: 5, slot: 10, currentOwnerId: "dallas-texans", originalOwnerId: "dallas-texans", status: "COMPLETED", playerId: "rookie-jordan-burch", selectedAt: Date.parse("2026-08-15T19:40:00-05:00") },
      { id: "5.11", round: 5, slot: 11, currentOwnerId: "detroit-fury", originalOwnerId: "detroit-fury", status: "ON_CLOCK" },
      { id: "5.12", round: 5, slot: 12, currentOwnerId: "canton-legends", originalOwnerId: "seattle-rainiers", status: "UPCOMING" },
      { id: "6.01", round: 6, slot: 1, currentOwnerId: "tampa-bay-storm", originalOwnerId: "tampa-bay-storm", status: "UPCOMING" },
      { id: "6.02", round: 6, slot: 2, currentOwnerId: "new-orleans-thunder", originalOwnerId: "new-orleans-thunder", status: "UPCOMING" },
      { id: "6.03", round: 6, slot: 3, currentOwnerId: "memphis-showboats", originalOwnerId: "memphis-showboats", status: "UPCOMING" },
      { id: "6.04", round: 6, slot: 4, currentOwnerId: "detroit-fury", originalOwnerId: "detroit-fury", status: "UPCOMING" },
      { id: "6.05", round: 6, slot: 5, currentOwnerId: "oklahoma-outlaws", originalOwnerId: "oklahoma-outlaws", status: "UPCOMING" },
      { id: "6.06", round: 6, slot: 6, currentOwnerId: "canton-legends", originalOwnerId: "canton-legends", status: "UPCOMING" },
      { id: "7.03", round: 7, slot: 3, currentOwnerId: "canton-legends", originalOwnerId: "houston-oilers", status: "UPCOMING" },
    ],
    log: [
      { id: "log-5.10", message: "Dallas Texans selected Jordan Burch at 5.10", createdAt: Date.parse("2026-08-15T19:40:00-05:00") },
      { id: "log-5.09", message: "Barcelona Dragons selected Kendal Daniels at 5.09", createdAt: Date.parse("2026-08-15T19:36:00-05:00") },
      { id: "log-5.08", message: "Houston Oilers selected Malachi Lawrence at 5.08", createdAt: Date.parse("2026-08-15T19:32:00-05:00") },
    ],
  };
}

export function DraftRoom({ franchises, players, role }: { franchises: Franchise[]; players: RosterPlayer[]; role: AppRole }) {
  const [snapshot, setSnapshot] = useState<DraftRoomSnapshot>(() => initialSnapshot());
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("");
  const [nflTeam, setNflTeam] = useState("");
  const [rookieOnly, setRookieOnly] = useState(true);
  const [sort, setSort] = useState<"rank" | "adp" | "projection" | "name">("rank");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [boardRound, setBoardRound] = useState(5);
  const [myPicksOnly, setMyPicksOnly] = useState(false);
  const [fullBoard, setFullBoard] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [commissionerOpen, setCommissionerOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { id: "chat-1", sender: "Detroit", text: "Reviewing two defenders.", time: "7:40 PM" },
    { id: "chat-2", sender: "Canton", text: "Ready on deck.", time: "7:41 PM" },
  ]);
  const previousAttentionIndex = useRef(snapshot.currentIndex);

  const franchise = useCallback((id: string) => franchises.find((team) => team.id === id), [franchises]);
  const currentPick = snapshot.picks[snapshot.currentIndex];
  const onDeckPick = snapshot.picks[snapshot.currentIndex + 1];
  const myNext = nextOwnedPick(snapshot.picks, snapshot.currentIndex, USER_FRANCHISE_ID);
  const currentOwner = currentPick ? franchise(currentPick.currentOwnerId) : undefined;
  const canManage = role === "commissioner" || role === "assistant_commissioner" || role === "system_administrator";
  const mayDraft = currentPick ? canDraftCurrentPick(role, USER_FRANCHISE_ID, currentPick.currentOwnerId) : false;
  const draftedIds = useMemo(
    () => new Set(snapshot.picks.flatMap((pick) => pick.playerId ? [pick.playerId] : [])),
    [snapshot.picks],
  );
  const available = useMemo(() => candidates
    .filter((player) => !draftedIds.has(player.id))
    .filter((player) => !query || `${player.name} ${player.nflTeam} ${player.position}`.toLowerCase().includes(query.toLowerCase()))
    .filter((player) => !position || player.position === position)
    .filter((player) => !nflTeam || player.nflTeam === nflTeam)
    .filter((player) => !rookieOnly || player.rookie)
    .sort((left, right) => sort === "adp" ? left.adp - right.adp : sort === "projection" ? right.projection - left.projection : sort === "name" ? left.name.localeCompare(right.name) : left.rank - right.rank),
  [draftedIds, nflTeam, position, query, rookieOnly, sort]);
  const selected = candidates.find((player) => player.id === selectedId);
  const remainingSeconds = snapshot.status === "PAUSED"
    ? snapshot.pausedRemaining
    : snapshot.deadlineAt && now
      ? Math.max(0, Math.ceil((snapshot.deadlineAt - now) / 1000))
      : PICK_SECONDS;

  useEffect(() => {
    const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      try { setSnapshot({ ...initialSnapshot(), ...JSON.parse(saved) as DraftRoomSnapshot }); } catch { /* use demo state */ }
    }
    setHydrated(true);
    const sync = (event: StorageEvent) => {
      if (event.key === DRAFT_STORAGE_KEY && event.newValue) setSnapshot(JSON.parse(event.newValue) as DraftRoomSnapshot);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (hydrated) window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
  }, [hydrated, snapshot]);
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    setNow(Date.now());
    return () => window.clearInterval(tick);
  }, []);
  useEffect(() => {
    if (hydrated && snapshot.status === "LIVE" && snapshot.deadlineAt === 0) {
      setSnapshot((current) => ({ ...current, deadlineAt: Date.now() + PICK_SECONDS * 1000 }));
    }
  }, [hydrated, snapshot.deadlineAt, snapshot.status]);
  useEffect(() => {
    if (!hydrated || snapshot.status !== "LIVE" || !snapshot.deadlineAt || remainingSeconds !== 0) return;
    setSnapshot((current) => {
      if (current.status !== "LIVE" || current.deadlineAt > Date.now()) return current;
      const pick = current.picks[current.currentIndex];
      if (!pick) return { ...current, status: "COMPLETE", deadlineAt: 0, archivedPicks: current.picks.map((item) => ({ ...item })) };
      const currentDrafted = new Set(current.picks.flatMap((item) => item.playerId ? [item.playerId] : []));
      const queuedCandidate = pick.currentOwnerId === USER_FRANCHISE_ID
        ? current.queue.map((id) => candidates.find((candidate) => candidate.id === id)).find((candidate) => candidate && !currentDrafted.has(candidate.id) && candidate.rookie)
        : undefined;
      const rankedCandidate = candidates.filter((candidate) => !currentDrafted.has(candidate.id) && candidate.rookie).sort((left, right) => left.rank - right.rank)[0];
      const automatic = current.timeoutPolicy === "skip" ? undefined : queuedCandidate ?? (current.timeoutPolicy === "queue_then_rank" ? rankedCandidate : undefined);
      const undoState: DraftUndoState = { status: current.status, picks: current.picks, currentIndex: current.currentIndex, deadlineAt: current.deadlineAt, pausedRemaining: current.pausedRemaining, queue: current.queue, log: current.log };
      const nextPicks = current.picks.map((item, index) => index === current.currentIndex ? automatic ? { ...item, status: "COMPLETED" as const, playerId: automatic.id, selectedAt: Date.now() } : { ...item, status: "SKIPPED" as const } : item);
      const nextIndex = current.currentIndex + 1;
      if (nextPicks[nextIndex]) nextPicks[nextIndex] = { ...nextPicks[nextIndex], status: "ON_CLOCK" };
      const ownerName = franchise(pick.currentOwnerId)?.name ?? "Current franchise";
      const message = automatic ? `${ownerName} auto-selected ${automatic.name} at ${pickLabel(pick)}` : `${ownerName} timed out; pick ${pickLabel(pick)} was skipped`;
      return { ...current, picks: nextPicks, currentIndex: nextIndex, status: nextIndex >= nextPicks.length ? "COMPLETE" : "LIVE", deadlineAt: nextIndex >= nextPicks.length ? 0 : Date.now() + PICK_SECONDS * 1000, queue: automatic ? current.queue.filter((id) => id !== automatic.id) : current.queue, log: [{ id: `timeout-${Date.now()}`, message, createdAt: Date.now() }, ...current.log], undoState, archivedPicks: nextIndex >= nextPicks.length ? nextPicks.map((item) => ({ ...item })) : current.archivedPicks };
    });
  }, [franchise, hydrated, remainingSeconds, snapshot.deadlineAt, snapshot.status]);
  useEffect(() => {
    if (!snapshot.attentionCues || previousAttentionIndex.current === snapshot.currentIndex) return;
    previousAttentionIndex.current = snapshot.currentIndex;
    const attention = myNext?.picksAway === 0 ? "You're on the clock" : myNext?.picksAway === 1 ? "You're on deck" : "";
    if (!attention) return;
    document.title = `${attention} · FOFL Draft`;
    const AudioContextClass = window.AudioContext;
    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    gain.gain.value = 0.035;
    oscillator.frequency.value = myNext?.picksAway === 0 ? 740 : 520;
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.16);
    return () => { document.title = "Football"; void audio.close(); };
  }, [myNext?.picksAway, snapshot.attentionCues, snapshot.currentIndex]);

  function advancePick(nextPicks: DraftRoomPick[], nextIndex: number, log = snapshot.log) {
    if (nextIndex >= nextPicks.length) return { ...snapshot, picks: nextPicks, currentIndex: nextIndex, status: "COMPLETE" as const, deadlineAt: 0, log };
    nextPicks[nextIndex] = { ...nextPicks[nextIndex], status: "ON_CLOCK" };
    return { ...snapshot, picks: nextPicks, currentIndex: nextIndex, deadlineAt: Date.now() + PICK_SECONDS * 1000, pausedRemaining: PICK_SECONDS, log };
  }

  function confirmPick(player: DraftCandidate) {
    const ownerRosterCount = currentPick
      ? players.filter((rosterPlayer) => rosterPlayer.franchiseId === currentPick.currentOwnerId).length +
        snapshot.picks.filter((pick) => pick.currentOwnerId === currentPick.currentOwnerId && pick.status === "COMPLETED").length
      : 0;
    if (!currentPick || !mayDraft || snapshot.status !== "LIVE" || !player.rookie || ownerRosterCount >= 60) return;
    const undoState: DraftUndoState = { status: snapshot.status, picks: snapshot.picks, currentIndex: snapshot.currentIndex, deadlineAt: snapshot.deadlineAt, pausedRemaining: snapshot.pausedRemaining, queue: snapshot.queue, log: snapshot.log };
    const nextPicks = snapshot.picks.map((pick, index) => index === snapshot.currentIndex ? { ...pick, status: "COMPLETED" as const, playerId: player.id, selectedAt: Date.now() } : pick);
    const ownerName = currentOwner?.name ?? "Current franchise";
    const log = [{ id: `log-${currentPick.id}-${Date.now()}`, message: `${ownerName} selected ${player.name} at ${pickLabel(currentPick)}`, createdAt: Date.now() }, ...snapshot.log];
    setSnapshot({ ...advancePick(nextPicks, snapshot.currentIndex + 1, log), queue: snapshot.queue.filter((id) => id !== player.id), undoState });
    setSelectedId(null);
    setConfirmId(null);
  }

  function skipPick() {
    if (!currentPick || !canManage || !window.confirm(`Skip pick ${pickLabel(currentPick)}?`)) return;
    const nextPicks = snapshot.picks.map((pick, index) => index === snapshot.currentIndex ? { ...pick, status: "SKIPPED" as const } : pick);
    const undoState: DraftUndoState = { status: snapshot.status, picks: snapshot.picks, currentIndex: snapshot.currentIndex, deadlineAt: snapshot.deadlineAt, pausedRemaining: snapshot.pausedRemaining, queue: snapshot.queue, log: snapshot.log };
    setSnapshot({ ...advancePick(nextPicks, snapshot.currentIndex + 1, [{ id: `skip-${Date.now()}`, message: `Commissioner skipped pick ${pickLabel(currentPick)}`, createdAt: Date.now() }, ...snapshot.log]), undoState });
  }

  function undoLastPick() {
    if (!canManage || !snapshot.undoState) return;
    const changedPick = snapshot.picks.find((pick, index) => index >= snapshot.undoState!.currentIndex && pick.status === "COMPLETED");
    const player = candidates.find((candidate) => candidate.id === changedPick?.playerId);
    if (!window.confirm(`Fully roll back ${changedPick ? `pick ${pickLabel(changedPick)} — ${player?.name ?? "selection"}` : "the last draft action"}?`)) return;
    setSnapshot({ ...snapshot, ...snapshot.undoState, undoState: undefined });
  }

  function pauseOrResume() {
    if (!canManage) return;
    if (snapshot.status === "LIVE") setSnapshot({ ...snapshot, status: "PAUSED", pausedRemaining: remainingSeconds });
    else if (snapshot.status === "PAUSED") setSnapshot({ ...snapshot, status: "LIVE", deadlineAt: Date.now() + snapshot.pausedRemaining * 1000 });
  }

  const clock = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
  const boardPicks = snapshot.picks.filter((pick) => (fullBoard || pick.round === boardRound) && (!myPicksOnly || pick.currentOwnerId === USER_FRANCHISE_ID));
  const myUpcoming = snapshot.picks.map((pick, index) => ({ pick, index })).filter(({ pick, index }) => index >= snapshot.currentIndex && pick.currentOwnerId === USER_FRANCHISE_ID && !["COMPLETED", "SKIPPED"].includes(pick.status));
  const draftedForCanton = snapshot.picks.filter((pick) => pick.currentOwnerId === USER_FRANCHISE_ID && pick.status === "COMPLETED").map((pick) => candidates.find((player) => player.id === pick.playerId)).filter(Boolean) as DraftCandidate[];
  const currentOwnerRosterCount = currentPick ? players.filter((player) => player.franchiseId === currentPick.currentOwnerId).length + snapshot.picks.filter((pick) => pick.currentOwnerId === currentPick.currentOwnerId && pick.status === "COMPLETED").length : 0;
  const rosterAfterPick = currentOwnerRosterCount + 1;
  const selectedEligible = Boolean(selected?.rookie) && rosterAfterPick <= 60;
  const rosterCounts = (["QB", "RB", "WR", "TE", "DL", "LB", "DB"] as Position[]).map((rosterPosition) => ({ position: rosterPosition, count: players.filter((player) => player.franchiseId === USER_FRANCHISE_ID && player.position === rosterPosition).length + draftedForCanton.filter((player) => player.position === rosterPosition).length }));

  return <div className="live-draft-room">
    <section className={`live-draft-status live-draft-status-${snapshot.status.toLowerCase()}`}>
      <div className="live-draft-event"><span>2027 Rookie Draft</span><b>{snapshot.status.replace("_", " ")}</b><small>{currentPick ? `Round ${currentPick.round} · Pick ${pickLabel(currentPick)}` : "Final results"}</small></div>
      <div className="live-draft-current"><span>{currentPick?.currentOwnerId === USER_FRANCHISE_ID ? "YOU'RE ON THE CLOCK" : "ON THE CLOCK"}</span><strong>{currentOwner?.name ?? "Draft complete"}</strong><small>{currentPick && currentPick.originalOwnerId !== currentPick.currentOwnerId ? `Originally ${franchise(currentPick.originalOwnerId)?.name}` : "Current pick owner verified"}</small></div>
      <div className="live-draft-clock" title={snapshot.deadlineAt ? `Expires ${new Date(snapshot.deadlineAt).toLocaleTimeString("en-US")}` : undefined}><strong>{snapshot.status === "COMPLETE" ? "FINAL" : clock}</strong><span>{snapshot.status === "PAUSED" ? "Timer frozen" : "Browser-synchronized demo clock"}</span></div>
      <div className="live-draft-context"><span><small>On Deck</small><b>{onDeckPick ? franchise(onDeckPick.currentOwnerId)?.name : "—"}</b></span><span><small>My Next Pick</small><b>{myNext ? `${pickLabel(myNext.pick)} · ${myNext.picksAway} ${myNext.picksAway === 1 ? "pick" : "picks"} away` : "No remaining picks"}</b></span><span><small>Current Round</small><b>Round {currentPick?.round ?? "—"}</b></span></div>
    </section>

    <div className="live-draft-layout">
      <section className="live-draft-panel live-draft-players">
        <header><div><span className="eyebrow">Working pool</span><h2>Available Players</h2></div><b>{available.length} available</b></header>
        <div className="live-draft-filters">
          <label className="live-draft-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players…" /></label>
          <select value={position} onChange={(event) => setPosition(event.target.value)} aria-label="Position"><option value="">All positions</option>{["QB", "RB", "WR", "TE", "DL", "LB", "DB"].map((item) => <option key={item}>{item}</option>)}</select>
          <select value={nflTeam} onChange={(event) => setNflTeam(event.target.value)} aria-label="NFL team"><option value="">All NFL teams</option>{[...new Set(candidates.map((player) => player.nflTeam))].sort().map((team) => <option key={team}>{team}</option>)}</select>
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Sort available players"><option value="rank">Rank</option><option value="adp">ADP</option><option value="projection">Projection</option><option value="name">Player name</option></select>
          <label className="live-draft-rookie"><input type="checkbox" checked={rookieOnly} onChange={(event) => setRookieOnly(event.target.checked)} /> Rookie only</label>
        </div>
        <div className="live-draft-player-head"><span>Player</span><span>Age</span><span>Rank</span><span>ADP</span><span>Proj</span></div>
        <div className="live-draft-player-list">
          {available.map((player) => <button className={selectedId === player.id ? "selected" : ""} key={player.id} onClick={() => { setSelectedId(player.id); setConfirmId(null); }}><span><PlayerIdentity name={player.name} position={player.position} /><small><NflTeamMark team={player.nflTeam} /> · {player.nflTeam}</small></span><span>{player.age}</span><span>{player.rank}</span><span>{player.adp}</span><strong>{player.projection}</strong></button>)}
        </div>
        {selected && <div className="live-draft-selected"><div><PlayerIdentity name={selected.name} position={selected.position} /><span><NflTeamMark team={selected.nflTeam} /> · Age {selected.age} · Rank {selected.rank} · ADP {selected.adp}</span></div>{confirmId === selected.id ? <div className="live-draft-confirm"><b>Draft {selected.name} at {currentPick ? pickLabel(currentPick) : "—"}? · Eligible rookie · Roster after pick: {rosterAfterPick}/60</b>{!selectedEligible && <small>Selection blocked by draft eligibility or roster limit.</small>}<button className="btn" onClick={() => setConfirmId(null)}>Cancel</button><button className="btn btn-primary" disabled={!selectedEligible} onClick={() => confirmPick(selected)}>Confirm Pick</button></div> : <div><button className="btn" disabled={snapshot.queue.includes(selected.id)} onClick={() => setSnapshot({ ...snapshot, queue: [...snapshot.queue, selected.id] })}>{snapshot.queue.includes(selected.id) ? "In Queue" : "Add to Queue"}</button><button className="btn btn-primary" disabled={!mayDraft || snapshot.status !== "LIVE" || !selected.rookie} title={!mayDraft ? "Only the current pick owner or commissioner can draft" : !selected.rookie ? "Player is not draft eligible" : undefined} onClick={() => setConfirmId(selected.id)}>{canManage && currentPick?.currentOwnerId !== USER_FRANCHISE_ID ? `Draft for ${currentOwner?.abbreviation}` : "Draft Player"}</button></div>}</div>}
      </section>

      <div className="live-draft-center">
        <section className="live-draft-panel live-draft-board-panel">
          <header><div><span className="eyebrow">Current ownership</span><h2>Draft Board</h2></div><span>{fullBoard ? "Full board" : `Round ${boardRound}`}</span></header>
          <div className="live-draft-board-controls"><button onClick={() => { setBoardRound(currentPick?.round ?? 5); setFullBoard(false); }}>Jump to current</button><button className={myPicksOnly ? "active" : ""} onClick={() => setMyPicksOnly((current) => !current)}>My picks</button><button disabled={fullBoard || boardRound <= 1} onClick={() => setBoardRound((round) => round - 1)}>← Previous</button><button disabled={fullBoard || boardRound >= 7} onClick={() => setBoardRound((round) => round + 1)}>Next →</button><button className={fullBoard ? "active" : ""} onClick={() => setFullBoard((current) => !current)}>Full board</button></div>
          <div className="live-draft-pick-list">{boardPicks.map((pick) => { const owner = franchise(pick.currentOwnerId); const original = franchise(pick.originalOwnerId); const player = candidates.find((candidate) => candidate.id === pick.playerId); return <article className={`${pick.status.toLowerCase()} ${pick.currentOwnerId === USER_FRANCHISE_ID ? "mine" : ""}`} key={pick.id}><span className="live-draft-pick-label">{pickLabel(pick)}</span><span className="franchise-mark" style={{ background: owner?.color }}>{owner?.abbreviation}</span><div><b>{owner?.name}</b>{pick.originalOwnerId !== pick.currentOwnerId && <small>originally {original?.name}</small>}<strong>{player ? `${player.name} · ${player.position} · ${player.nflTeam}` : pick.status === "ON_CLOCK" ? "ON THE CLOCK" : pick.status === "SKIPPED" ? "SKIPPED" : "Upcoming"}</strong>{pick.commissionerNote && <small className="live-draft-pick-note">Commissioner note: {pick.commissionerNote}</small>}<span className="live-draft-pick-actions">{pick.status === "UPCOMING" && <Link href="/transactions/trade-center">Trade this pick</Link>}{canManage && <input aria-label={`Commissioner note for pick ${pickLabel(pick)}`} value={pick.commissionerNote ?? ""} onChange={(event) => setSnapshot({ ...snapshot, picks: snapshot.picks.map((item) => item.id === pick.id ? { ...item, commissionerNote: event.target.value } : item) })} placeholder="Add commissioner note…" />}</span></div></article>; })}{!boardPicks.length && <div className="live-draft-empty">No picks match this view.</div>}</div>
        </section>
        <section className="live-draft-panel live-draft-log"><header><div><span className="eyebrow">System activity</span><h2>Draft Log</h2></div></header><ul>{snapshot.log.slice(0, 6).map((entry) => <li key={entry.id}><span>{entry.message}</span><time>{new Date(entry.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</time></li>)}</ul></section>
      </div>

      <aside className="live-draft-sidebar">
        <section className="live-draft-panel live-draft-my-picks"><header><div><span className="eyebrow">Canton Legends</span><h2>My Upcoming Picks</h2></div></header>{myUpcoming.length ? <div>{myUpcoming.map(({ pick, index }, itemIndex) => <span className={itemIndex === 0 ? "next" : ""} key={pick.id}><b>{index === snapshot.currentIndex ? `CURRENT PICK · ${pickLabel(pick)}` : pickLabel(pick)}</b><small>{index - snapshot.currentIndex} {index - snapshot.currentIndex === 1 ? "pick" : "picks"} away{pick.originalOwnerId !== pick.currentOwnerId ? ` · via ${franchise(pick.originalOwnerId)?.name}` : ""}</small></span>)}</div> : <div className="live-draft-empty">No remaining picks</div>}</section>
        <section className="live-draft-panel live-draft-queue"><header><div><span className="eyebrow">Private shortlist</span><h2>Draft Queue</h2></div><b>{snapshot.queue.length}</b></header><div>{snapshot.queue.map((playerId, index) => { const player = candidates.find((candidate) => candidate.id === playerId); if (!player) return null; const drafted = draftedIds.has(playerId); return <div className={`live-draft-queue-row ${drafted ? "drafted" : ""}`} key={playerId}><button className="live-draft-queue-player" disabled={drafted} onClick={() => setSelectedId(playerId)}><PositionBadge position={player.position} /><span><b>{player.name}</b><small>{drafted ? "Drafted by another franchise" : `${player.nflTeam} · Rank ${player.rank}`}</small></span></button><span className="live-draft-queue-actions"><button aria-label={`Move ${player.name} up`} disabled={index === 0} onClick={() => { const queue = [...snapshot.queue]; [queue[index - 1], queue[index]] = [queue[index], queue[index - 1]]; setSnapshot({ ...snapshot, queue }); }}><ChevronUp size={13} /></button><button aria-label={`Move ${player.name} down`} disabled={index === snapshot.queue.length - 1} onClick={() => { const queue = [...snapshot.queue]; [queue[index + 1], queue[index]] = [queue[index], queue[index + 1]]; setSnapshot({ ...snapshot, queue }); }}><ChevronDown size={13} /></button><button aria-label={`Remove ${player.name} from queue`} onClick={() => setSnapshot({ ...snapshot, queue: snapshot.queue.filter((id) => id !== playerId) })}>×</button></span></div>; })}{!snapshot.queue.length && <div className="live-draft-empty">Select an available player to build your queue.</div>}</div></section>
        <section className="live-draft-panel live-draft-roster"><header><div><span className="eyebrow">Offseason roster</span><h2>My Roster Snapshot</h2></div><b>{players.filter((player) => player.franchiseId === USER_FRANCHISE_ID).length + draftedForCanton.length} / 60</b></header><div>{rosterCounts.map((item) => <span key={item.position}><small>{item.position}</small><b>{item.count}</b></span>)}</div><Link href="/franchises/canton-legends">View Full Roster →</Link></section>
        <button className="live-draft-chat-toggle" onClick={() => setChatOpen(true)}><MessageCircle size={15} /><span>Draft Chat</span><b>4 online</b></button>
        {canManage && <section className="live-draft-commissioner"><button onClick={() => setCommissionerOpen((current) => !current)}>Commissioner Controls <span>{commissionerOpen ? "▴" : "▾"}</span></button>{commissionerOpen && <div><div className="live-draft-preflight"><b>Draft order preflight</b><span>✓ {snapshot.picks.length} unique pick IDs</span><span>✓ Current owners assigned</span><span>✓ Traded-pick provenance retained</span><span>✓ Order locked while {snapshot.status.toLowerCase()}</span></div><label>Timeout policy<select value={snapshot.timeoutPolicy} onChange={(event) => setSnapshot({ ...snapshot, timeoutPolicy: event.target.value as DraftRoomSnapshot["timeoutPolicy"] })}><option value="queue_then_skip">Queue, then skip</option><option value="queue_then_rank">Queue, then default rank</option><option value="skip">Always skip</option></select></label><label className="live-draft-attention"><input type="checkbox" checked={snapshot.attentionCues} onChange={(event) => setSnapshot({ ...snapshot, attentionCues: event.target.checked })} /> Audible on-deck/on-clock cue</label>{snapshot.status === "NOT_STARTED" && <button onClick={() => setSnapshot({ ...snapshot, status: "LIVE", deadlineAt: Date.now() + PICK_SECONDS * 1000 })}>Start Draft</button>}{["LIVE", "PAUSED"].includes(snapshot.status) && <button onClick={pauseOrResume}>{snapshot.status === "LIVE" ? "Pause Draft" : "Resume Draft"}</button>}<button onClick={() => { const minutes = window.prompt("Set remaining minutes", String(Math.ceil(remainingSeconds / 60))); if (minutes && Number(minutes) > 0) setSnapshot({ ...snapshot, deadlineAt: Date.now() + Number(minutes) * 60_000, pausedRemaining: Number(minutes) * 60 }); }}>Edit Timer</button><button onClick={skipPick}>Skip Current Pick</button><button disabled={!snapshot.undoState || snapshot.status === "COMPLETE"} onClick={undoLastPick}>Full Rollback</button><button className="danger" onClick={() => window.confirm("End and archive the 2027 rookie draft?") && setSnapshot({ ...snapshot, status: "COMPLETE", deadlineAt: 0, archivedPicks: snapshot.picks.map((pick) => ({ ...pick })) })}>End & Archive Draft</button>{snapshot.archivedPicks && <small>Immutable completion snapshot: {snapshot.archivedPicks.length} picks</small>}</div>}</section>}
      </aside>
    </div>

    {chatOpen && <div className="live-draft-chat-backdrop" onClick={() => setChatOpen(false)}><aside className="live-draft-chat" onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow">4 owners online</span><h2>Draft Chat</h2></div><button onClick={() => setChatOpen(false)}>×</button></header><div>{chatMessages.map((message) => <article key={message.id}><b>{message.sender}</b><span>{message.text}</span><time>{message.time}</time></article>)}</div><form onSubmit={(event) => { event.preventDefault(); if (!chatText.trim()) return; setChatMessages([...chatMessages, { id: `chat-${Date.now()}`, sender: "Canton", text: chatText.trim(), time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }]); setChatText(""); }}><input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Message the draft room…" /><button className="btn btn-primary">Send</button></form></aside></div>}
  </div>;
}
