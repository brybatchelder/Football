"use client";

import Image from "next/image";
import { createContext, useContext, useSyncExternalStore } from "react";

export type TeamDisplayMode = "logos" | "abbreviations";

const TEAM_DISPLAY_STORAGE_KEY = "football-nfl-team-display";
const teamDisplayListeners = new Set<() => void>();
const TeamDisplayContext = createContext<{
  mode: TeamDisplayMode;
  setMode: (mode: TeamDisplayMode) => void;
}>({ mode: "logos", setMode: () => undefined });

const logoCodes: Record<string, string> = {
  GBP: "GB",
  JAC: "JAX",
  KCC: "KC",
  LAR: "LA",
  LVR: "LV",
  NEP: "NE",
  NOS: "NO",
  SFO: "SF",
  TBB: "TB",
};

export function TeamDisplayProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const mode = useSyncExternalStore(
    subscribeToTeamDisplay,
    readTeamDisplay,
    (): TeamDisplayMode => "logos",
  );

  const setMode = (nextMode: TeamDisplayMode) => {
    window.localStorage.setItem(TEAM_DISPLAY_STORAGE_KEY, nextMode);
    teamDisplayListeners.forEach((listener) => listener());
  };

  return (
    <TeamDisplayContext value={{ mode, setMode }}>
      {children}
    </TeamDisplayContext>
  );
}

function subscribeToTeamDisplay(listener: () => void) {
  teamDisplayListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    teamDisplayListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readTeamDisplay(): TeamDisplayMode {
  const saved = window.localStorage.getItem(TEAM_DISPLAY_STORAGE_KEY);
  return saved === "abbreviations" ? "abbreviations" : "logos";
}

export function useTeamDisplay() {
  return useContext(TeamDisplayContext);
}

export function NflTeamMark({
  team,
  className = "",
  modeOverride,
}: {
  team: string;
  className?: string;
  modeOverride?: TeamDisplayMode;
}) {
  const { mode } = useTeamDisplay();
  const displayMode = modeOverride ?? mode;
  const logoCode = logoCodes[team] ?? team;
  const hasLogo = team !== "FA";

  if (displayMode === "abbreviations" || !hasLogo) {
    return (
      <span className={`nfl-team-abbreviation ${className}`.trim()}>
        {team}
      </span>
    );
  }

  return (
    <span
      className={`nfl-team-mark ${className}`.trim()}
      title={team}
      aria-label={`${team} NFL team`}
    >
      <Image
        className="nfl-team-logo"
        src={`/images/logos/${logoCode}.png`}
        width={24}
        height={20}
        alt=""
      />
    </span>
  );
}
