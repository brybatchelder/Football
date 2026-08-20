import Link from "next/link";
import { Mail, ShieldCheck, UsersRound } from "lucide-react";
import { requireLeagueMember } from "@/auth/permissions";
import { Card, PageHeader } from "@/components/ui";
import { loadLeagueDirectory } from "@/data/league-directory";

export default async function LeagueTeamsPage() {
  const viewer = await requireLeagueMember("/league/teams");
  const directory = await loadLeagueDirectory(viewer);
  const assigned = new Map<
    string,
    {
      franchise: (typeof directory.members)[number]["franchises"][number];
      owners: typeof directory.members;
    }
  >();
  for (const member of directory.members) {
    for (const franchise of member.franchises) {
      const entry = assigned.get(franchise.id) ?? { franchise, owners: [] };
      entry.owners.push(member);
      assigned.set(franchise.id, entry);
    }
  }
  const leagueStaff = directory.members.filter(
    (member) => member.franchises.length === 0,
  );

  return (
    <div className="page league-directory-page">
      <PageHeader
        eyebrow={`${directory.leagueName} · ${directory.seasonYear}`}
        title="Franchises & owners"
        description="The private FOFL member directory. Contact details are visible only to signed-in league members."
        actions={
          <>
            <Link className="btn" href="/league">
              League HQ
            </Link>
            <Link className="btn" href="/league/rosters?format=grid">
              League rosters
            </Link>
          </>
        }
      />

      {directory.source === "development" && (
        <div className="notice notice-info" role="status">
          Development franchise identities are shown. Private contact details
          require the production database.
        </div>
      )}

      {assigned.size ? (
        <section className="league-directory-grid" aria-label="FOFL franchises">
          {[...assigned.values()].map(({ franchise, owners }) => (
            <article className="league-directory-card" key={franchise.id}>
              <header>
                <span className="franchise-mark">{franchise.abbreviation}</span>
                <div>
                  <Link href={`/franchises/${franchise.slug}`}>
                    {franchise.name}
                  </Link>
                  <small>
                    {owners.length} active owner{owners.length === 1 ? "" : "s"}
                  </small>
                </div>
              </header>
              <div className="league-directory-owner-list">
                {owners.map((owner) => {
                  const ownership = owner.franchises.find(
                    (item) => item.id === franchise.id,
                  );
                  return (
                    <div key={owner.userId}>
                      <span className="league-directory-owner">
                        <UsersRound aria-hidden="true" size={15} />
                        <strong>{owner.name}</strong>
                        <small>
                          {ownership?.isPrimary ? "Primary" : "Co-owner"}
                        </small>
                      </span>
                      {owner.email ? (
                        <a
                          className="league-directory-email"
                          href={`mailto:${owner.email}`}
                        >
                          <Mail aria-hidden="true" size={14} />
                          {owner.email}
                        </a>
                      ) : (
                        <span className="subtle">
                          Contact unavailable in preview
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <Card title="Franchise directory">
          <p className="feature-copy">
            No active franchise owners are assigned for this season.
          </p>
        </Card>
      )}

      {leagueStaff.length > 0 && (
        <Card title="League staff" className="league-directory-staff">
          <ul className="list">
            {leagueStaff.map((member) => (
              <li key={member.userId}>
                <span>
                  <ShieldCheck aria-hidden="true" size={15} />
                  <strong>{member.name}</strong>
                  <small>{member.role.replaceAll("_", " ")}</small>
                </span>
                {member.email && (
                  <a href={`mailto:${member.email}`}>{member.email}</a>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
