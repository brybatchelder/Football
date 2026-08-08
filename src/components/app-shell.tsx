"use client";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const nav = [
  {
    label: "My Team",
    href: "/my-team/overview",
    items: [
      ["Overview", "/my-team/overview"],
      ["Roster", "/franchises/canton-legends"],
      ["Lineup", "/my-team/lineup"],
      ["Contracts", "/my-team/contracts"],
      ["Draft Picks", "/my-team/draft-picks"],
      ["History", "/my-team/history"],
    ],
  },
  {
    label: "Game Day",
    href: "/gameday/my-matchup",
    items: [
      ["My Matchup", "/gameday/my-matchup"],
      ["Scoreboard", "/gameday/scoreboard"],
      ["Fantasy RedZone", "/gameday/live"],
      ["Schedule", "/gameday/schedule"],
      ["Playoffs", "/gameday/playoffs"],
    ],
  },
  {
    label: "Players",
    href: "/players/search",
    items: [
      ["Search", "/players/search"],
      ["Free Agents", "/players/free-agents"],
      ["Stats", "/players/stats"],
      ["Rankings", "/players/rankings"],
      ["Watchlist", "/players/watchlist"],
      ["Projections", "/players/projections"],
    ],
  },
  {
    label: "Transactions",
    href: "/transactions/trade-center",
    items: [
      ["Trade Room", "/transactions/trade-center"],
      ["Waivers", "/transactions/waivers"],
      ["Add / Drop", "/transactions/add-drop"],
      ["Trade Block", "/transactions/trade-block"],
      ["Activity", "/transactions/activity"],
      ["Trade Analyzer", "/transactions/trade-analyzer"],
    ],
  },
  {
    label: "Draft & Auction",
    href: "/draft-auction/draft-room",
    items: [
      ["Draft Room", "/draft-auction/draft-room"],
      ["Auction House", "/draft-auction/auction-house"],
      ["RFA", "/draft-auction/rfa"],
      ["Franchise / Transition Tags", "/draft-auction/tags"],
      ["Draft Board", "/draft-auction/draft-board"],
      ["Pick Ownership", "/draft-auction/pick-ownership"],
    ],
  },
  {
    label: "League",
    href: "/league",
    items: [
      ["League HQ", "/league"],
      ["Standings", "/standings"],
      ["Teams", "/league/teams"],
      ["Power Rankings", "/league/power-rankings"],
      ["Records", "/league/records"],
      ["History & Memory", "/league/history"],
      ["Rules", "/league/rules"],
      ["Commissioner", "/commissioner"],
    ],
  },
] as const;
export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("football-theme") === "dark";
    document.documentElement.classList.toggle("dark", saved);
  }, []);
  function theme() {
    const next = !document.documentElement.classList.contains("dark");
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("football-theme", next ? "dark" : "light");
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href="/league">
            <span className="brand-mark">F</span>
            <span>
              <strong>Football</strong>
              <span>League Operations</span>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Primary">
            {nav.map((group) => (
              <div className="nav-group" key={group.label}>
                <Link className="nav-group-link" href={group.href}>
                  {group.label} <ChevronDown size={13} />
                </Link>
                <div className="nav-menu">
                  {group.items.map(([label, href]) => (
                    <Link key={href} href={href}>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="nav-tools">
            <button
              className="icon-button"
              aria-label="Toggle color theme"
              onClick={theme}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={16} />
            </button>
            <button
              className="icon-button mobile-toggle"
              aria-label="Toggle menu"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        <nav className={`mobile-nav ${open ? "open" : ""}`}>
          {nav.map((group) => (
            <details key={group.label}>
              <summary>{group.label}</summary>
              {group.items.map(([label, href]) => (
                <Link onClick={() => setOpen(false)} key={href} href={href}>
                  {label}
                </Link>
              ))}
            </details>
          ))}
        </nav>
        <div className="league-strip">
          <div className="league-strip-inner">
            <ShieldCheck size={14} />
            <strong>Front Office Football League</strong>
            <span className="subtle">· Demo environment</span>
            <span className="season-pill">
              <span className="status-dot" />
              2026 Preseason
            </span>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <span>Football · Private league operations</span>
        <span>
          2026 source of truth: MyFantasyLeague · Times shown in America/Chicago
        </span>
      </footer>
    </div>
  );
}
