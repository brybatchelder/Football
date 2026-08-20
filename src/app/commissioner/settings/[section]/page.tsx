import { revalidatePath } from "next/cache";
import { Card, PageHeader } from "@/components/ui";
import { requirePermission } from "@/auth/permissions";
import { leagueSettingsSchema } from "@/auth/schemas";
import { LineupSettingsEditor } from "@/components/lineup-settings-editor";
import { RosterSettingsEditor } from "@/components/roster-settings-editor";

const content: Record<
  string,
  { title: string; description: string; status: string }
> = {
  general: {
    title: "General league settings",
    description: "League identity, season state, timezone, and lock behavior.",
    status: "Configured",
  },
  divisions: {
    title: "Divisions",
    description: "Three 2026 divisions with four franchises each.",
    status: "Configured",
  },
  franchises: {
    title: "Franchises",
    description: "League teams, status, abbreviations, and branding.",
    status: "Configured",
  },
  owners: {
    title: "Owners and memberships",
    description: "Multi-owner franchise access and league-scoped roles.",
    status: "Configured",
  },
  "salary-cap": {
    title: "Salary-cap rules",
    description:
      "Cap, IR and taxi treatment, contract-year constraints, and dead cap.",
    status: "Needs review",
  },
  "roster-limits": {
    title: "Roster limits",
    description: "Active, IR, taxi, per-position, and starting-lineup rules.",
    status: "Configured",
  },
};
async function save(formData: FormData) {
  "use server";
  await requirePermission("manage_league");
  leagueSettingsSchema.parse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
    salaryCap: formData.get("salaryCap"),
  });
  revalidatePath("/commissioner");
}
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  await requirePermission(
    section === "operations"
      ? "manage_platform"
      : section === "franchises" || section === "owners"
        ? "manage_owners"
        : "manage_league",
  );
  const item = content[section];
  if (!item)
    return (
      <div className="page">
        <PageHeader
          eyebrow="Commissioner setup"
          title={section
            .replaceAll("-", " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())}
          description="This settings route is reserved for the next implementation milestone."
        />
        <div className="card empty">
          <h2>Configuration surface prepared</h2>
          <p>
            This module will use versioned, queryable rule records and
            league-scoped authorization. It is not active for the 2026
            MFL-official season.
          </p>
          <a className="btn btn-dark" href="/commissioner">
            Back to setup center
          </a>
        </div>
      </div>
    );
  if (section === "roster-limits") {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Commissioner setup"
          title={item.title}
          description={item.description}
        />
        <div className="stack">
          <Card
            title="Roster size and eligibility"
            action={<span className="badge badge-active">2026 default</span>}
          >
            <RosterSettingsEditor />
          </Card>
          <Card
            title="Starting lineup"
            action={<span className="badge badge-active">2026 default</span>}
          >
            <LineupSettingsEditor />
          </Card>
        </div>
      </div>
    );
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="Commissioner setup"
        title={item.title}
        description={item.description}
      />
      <div className="grid-3">
        <Card className="" title="2026 configuration">
          <form action={save}>
            <div className="field">
              <label>League name</label>
              <input
                className="input"
                name="name"
                defaultValue="Front Office Football League"
              />
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label>League timezone</label>
              <select
                className="select"
                name="timezone"
                defaultValue="America/Chicago"
              >
                <option>America/Chicago</option>
              </select>
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label>Salary cap</label>
              <input
                className="input"
                name="salaryCap"
                type="number"
                defaultValue="1000"
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary">Validate & save</button>
            </div>
          </form>
        </Card>
        <Card title="Rule status">
          <span className="badge badge-taxi">{item.status}</span>
          <ul className="list" style={{ marginTop: 12 }}>
            <li>
              <div>
                <div className="list-title">Contract-year cap</div>
                <div className="list-sub">Unresolved: 120 or 130</div>
              </div>
            </li>
            <li>
              <div>
                <div className="list-title">IR maximum</div>
                <div className="list-sub">Unresolved: 5 or 15</div>
              </div>
            </li>
            <li>
              <div>
                <div className="list-title">Individual locks</div>
                <div className="list-sub">Players lock at NFL kickoff</div>
              </div>
            </li>
          </ul>
        </Card>
        <Card title="Change controls">
          <div className="notice notice-info">
            Validated mutations require league commissioner access and create an
            audit record with a request correlation ID.
          </div>
        </Card>
      </div>
    </div>
  );
}
