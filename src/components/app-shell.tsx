"use client";
import Link from "next/link";
import { Bell, Menu, Moon, ShieldCheck, Sun, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ViewerContext } from "@/auth/permissions";
import { mostSpecificNavigationItem } from "@/domain/navigation";

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
    href: "/transactions/activity",
    items: [
      ["Activity", "/transactions/activity"],
      ["Roster Moves", "/transactions/roster-moves"],
      ["Trade Room", "/transactions/trade-center"],
      ["Trade Block", "/transactions/trade-block"],
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
      ["Draft Board", "/draft-auction/draft-board"],
      ["Pick Ownership", "/draft-auction/pick-ownership"],
    ],
  },
  {
    label: "League",
    href: "/league",
    items: [
      ["League HQ", "/league"],
      ["Rosters", "/league/rosters"],
      ["Lifecycle", "/league/lifecycle"],
      ["Standings", "/standings"],
      ["Teams", "/league/teams"],
      ["Power Rankings", "/league/power-rankings"],
      ["Records", "/league/records"],
      ["History & Memory", "/league/history"],
      ["Rules", "/league/rules"],
    ],
  },
] as const;
export function AppShell({
  children,
  viewer,
}: {
  children: React.ReactNode;
  viewer: ViewerContext;
}) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const rosterHref = viewer.activeFranchise
    ? `/franchises/${viewer.activeFranchise.slug}`
    : "/league/rosters";
  const resolvedNav = nav.map((group) => ({
    ...group,
    items: group.items.map(
      ([label, href]) =>
        [label, label === "Roster" ? rosterHref : href] as const,
    ),
  }));
  const navItems: (readonly [string, string])[] = [];
  resolvedNav.forEach((group) => navItems.push(...group.items));
  const activeItem = mostSpecificNavigationItem(pathname, navItems);
  const activeGroup = resolvedNav.find((group) =>
    group.items.some(([, href]) => href === activeItem?.[1]),
  );
  const locationLabel = activeItem?.[0] ?? routeLocation(pathname);
  const lifecycleLabel =
    pathname === "/draft-auction/rfa"
      ? "2027 Preseason · RFA — Assign Tags"
      : "2026 Preseason · Final Roster Compliance";
  const canManageLeague =
    viewer.role === "commissioner" ||
    viewer.role === "assistant_commissioner" ||
    viewer.role === "system_administrator";
  useEffect(() => {
    const saved = localStorage.getItem("football-theme") === "dark";
    document.documentElement.classList.toggle("dark", saved);
  }, []);
  useEffect(() => {
    function closeProfileMenu(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Element && !target.closest("[data-profile-menu]")) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeProfileMenu);
    return () => document.removeEventListener("pointerdown", closeProfileMenu);
  }, []);
  function theme() {
    const next = !document.documentElement.classList.contains("dark");
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("football-theme", next ? "dark" : "light");
  }
  async function switchRole(nextRole: "owner" | "commissioner") {
    setSwitchingRole(true);
    try {
      const response = await fetch("/api/auth/dev-role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!response.ok) throw new Error("Role switch failed");
      setProfileOpen(false);
      router.push(nextRole === "commissioner" ? "/commissioner" : "/league");
      router.refresh();
    } finally {
      setSwitchingRole(false);
    }
  }
  async function switchFranchise(slug: string) {
    const response = await fetch("/api/auth/select-franchise", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (!response.ok) return;
    setProfileOpen(false);
    router.push(`/franchises/${slug}`);
    router.refresh();
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
            {resolvedNav.map((group) => (
              <div className="nav-group" key={group.label}>
                <Link
                  className={`nav-group-link ${activeGroup?.label === group.label ? "active" : ""}`}
                  href={group.href}
                  onClick={(event) => event.currentTarget.blur()}
                >
                  {group.label}
                </Link>
                <div className="nav-menu">
                  {group.items.map(([label, href]) => (
                    <Link
                      className={activeItem?.[1] === href ? "active" : ""}
                      aria-current={
                        activeItem?.[1] === href ? "page" : undefined
                      }
                      key={href}
                      href={href}
                      onClick={(event) => event.currentTarget.blur()}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            {canManageLeague && (
              <Link
                className={`nav-group-link commissioner-link ${pathname.startsWith("/commissioner") ? "active" : ""}`}
                href="/commissioner"
              >
                Commissioner
              </Link>
            )}
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
            <div className="profile-menu" data-profile-menu>
              <button
                className="icon-button"
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((current) => !current)}
              >
                <UserRound size={16} />
              </button>
              {profileOpen && (
                <div className="profile-dropdown">
                  {viewer.user && (
                    <div className="profile-identity">
                      <strong>{viewer.user.name}</strong>
                      <span>{viewer.user.email}</span>
                      <small>{viewer.role.replaceAll("_", " ")}</small>
                    </div>
                  )}
                  {viewer.franchises.length > 1 && (
                    <label className="profile-franchise-select">
                      Active franchise
                      <select
                        className="select"
                        onChange={(event) =>
                          void switchFranchise(event.target.value)
                        }
                        value={viewer.activeFranchise?.slug ?? ""}
                      >
                        {viewer.franchises.map((franchise) => (
                          <option key={franchise.id} value={franchise.slug}>
                            {franchise.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <Link href="/account" onClick={() => setProfileOpen(false)}>
                    Account
                  </Link>
                  <Link
                    href="/preferences"
                    onClick={() => setProfileOpen(false)}
                  >
                    Preferences
                  </Link>
                  {viewer.source === "development" && canManageLeague && (
                    <button
                      disabled={switchingRole}
                      onClick={() => void switchRole("owner")}
                    >
                      {switchingRole ? "Switching…" : "Become Owner"}
                    </button>
                  )}
                  {viewer.source === "development" && !canManageLeague && (
                    <button
                      disabled={switchingRole}
                      onClick={() => void switchRole("commissioner")}
                    >
                      {switchingRole ? "Switching…" : "Become Commissioner"}
                    </button>
                  )}
                  {viewer.authenticated ? (
                    <form action="/api/auth/sign-out" method="post">
                      <button className="profile-logout" type="submit">
                        Sign out
                      </button>
                    </form>
                  ) : (
                    <Link className="profile-logout" href="/sign-in">
                      Sign in
                    </Link>
                  )}
                </div>
              )}
            </div>
            <button
              className="icon-button mobile-toggle"
              aria-label="Toggle menu"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {activeGroup && (
          <nav
            className="section-rail"
            aria-label={`${activeGroup.label} modules`}
          >
            <div className="section-rail-inner">
              <div className="section-rail-heading">
                <span>Modules</span>
                <strong>{activeGroup.label}</strong>
              </div>
              <div className="section-rail-links">
                {activeGroup.items.map(([label, href]) => {
                  const isActive = activeItem?.[1] === href;
                  return (
                    <Link
                      className={isActive ? "active" : ""}
                      aria-current={isActive ? "page" : undefined}
                      key={href}
                      href={href}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        )}
        <nav className={`mobile-nav ${open ? "open" : ""}`}>
          {resolvedNav.map((group) => (
            <details key={group.label}>
              <summary>{group.label}</summary>
              {group.items.map(([label, href]) => (
                <Link
                  className={activeItem?.[1] === href ? "active" : ""}
                  aria-current={activeItem?.[1] === href ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  key={href}
                  href={href}
                >
                  {label}
                </Link>
              ))}
            </details>
          ))}
          {canManageLeague && (
            <Link onClick={() => setOpen(false)} href="/commissioner">
              Commissioner
            </Link>
          )}
        </nav>
        <div className="league-strip">
          <div className="league-strip-inner">
            <ShieldCheck size={14} />
            <strong>Front Office Football League</strong>
            <span className="league-location">· {locationLabel}</span>
            <Link
              className="season-pill"
              href="/league/lifecycle"
              title="View league lifecycle"
            >
              <span className="status-dot" />
              {lifecycleLabel}
            </Link>
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

function routeLocation(pathname: string) {
  if (pathname.startsWith("/franchises/")) return "My Roster";
  if (pathname.startsWith("/commissioner")) return "Commissioner Center";
  if (pathname === "/preferences") return "Preferences";
  const segment = pathname.split("/").filter(Boolean).at(-1) ?? "League HQ";
  return segment
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
