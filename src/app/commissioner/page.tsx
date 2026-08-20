import Link from "next/link";
import {
  Banknote,
  CalendarDays,
  ChartNoAxesCombined,
  Database,
  DraftingCompass,
  Gavel,
  History,
  Image,
  Landmark,
  MessageSquare,
  Settings,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui";
import { requirePermission } from "@/auth/permissions";
import { hasPermission } from "@/domain/league-rules";

const areas = [
  [
    "League and season",
    "Identity, calendar, timezone, and season lifecycle.",
    "general",
    "Ready",
    Settings,
  ],
  [
    "Franchises and owners",
    "Teams, branding, divisions, and memberships.",
    "franchises",
    "Ready",
    Users,
  ],
  [
    "Rosters and players",
    "Limits, starter counts, flex eligibility, statuses, and assignments.",
    "roster-limits",
    "Ready",
    Shield,
  ],
  [
    "Scoring and standings",
    "Scoring rules, precision, and victory points.",
    "scoring",
    "Coming later",
    ChartNoAxesCombined,
  ],
  [
    "Salary cap and contracts",
    "Cap treatment, contract years, tags, and dead money.",
    "salary-cap",
    "Needs review",
    Banknote,
  ],
  [
    "Transactions and waivers",
    "Trades, claims, add/drops, and approvals.",
    "transactions",
    "Coming later",
    Gavel,
  ],
  [
    "Schedule and matchups",
    "Weeks, games, lineup locks, and matchups.",
    "schedule",
    "Coming later",
    CalendarDays,
  ],
  [
    "Draft",
    "Rookie draft order, picks, and clock.",
    "draft",
    "Coming later",
    DraftingCompass,
  ],
  [
    "Auctions",
    "Nominations, bids, budgets, and close rules.",
    "auctions",
    "Coming later",
    Landmark,
  ],
  [
    "Playoffs",
    "Qualification, brackets, and reseeding.",
    "playoffs",
    "Not configured",
    Trophy,
  ],
  [
    "Community and messages",
    "Announcements, chat, polls, and moderation.",
    "community",
    "Coming later",
    MessageSquare,
  ],
  [
    "History and imports",
    "MFL connection, import runs, reconciliation, and archive.",
    "imports",
    "Ready",
    Database,
  ],
  [
    "Appearance",
    "League identity and franchise asset policies.",
    "appearance",
    "Coming later",
    Image,
  ],
  [
    "Platform operations",
    "Health, jobs, notifications, and system audit.",
    "operations",
    "System admin",
    History,
  ],
] as const;
export default async function CommissionerPage() {
  const viewer = await requirePermission("manage_league");
  const visibleAreas = areas.filter(([, , slug]) => {
    if (slug === "franchises")
      return hasPermission(viewer.role, "manage_owners");
    if (slug === "operations")
      return hasPermission(viewer.role, "manage_platform");
    return true;
  });
  return (
    <div className="page">
      <PageHeader
        eyebrow="Commissioner"
        title="Setup Center"
        description="League configuration is grouped by responsibility, with unresolved rules surfaced instead of hidden in defaults."
        actions={
          <Link className="btn btn-primary" href="/commissioner/imports">
            Open MFL imports
          </Link>
        }
      />
      <div className="notice" style={{ marginBottom: 14 }}>
        Signed in with {viewer.role.replaceAll("_", " ")} access. Every route
        enforces its own permission, and durable changes are audited when
        PostgreSQL is connected.
      </div>
      <div className="setup-grid">
        {visibleAreas.map(([title, description, slug, status, Icon]) => (
          <section className="card setup-card" key={slug}>
            <div className="setup-card-top">
              <span className="setup-icon">
                <Icon size={17} />
              </span>
              <span
                className={`badge ${status === "Ready" ? "badge-active" : status === "Needs review" ? "badge-taxi" : ""}`}
              >
                {status}
              </span>
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
            <Link
              className="setup-link"
              href={
                slug === "imports"
                  ? "/commissioner/imports"
                  : slug === "franchises"
                    ? "/commissioner/owners"
                    : `/commissioner/settings/${slug}`
              }
            >
              Configure →
            </Link>
          </section>
        ))}
      </div>
    </div>
  );
}
