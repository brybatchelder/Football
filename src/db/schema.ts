import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};
export const roleEnum = pgEnum("app_role", [
  "visitor",
  "owner",
  "assistant_commissioner",
  "commissioner",
  "system_administrator",
]);
export const rosterStatusEnum = pgEnum("roster_status", [
  "active",
  "injured_reserve",
  "taxi",
]);
export const runStatusEnum = pgEnum("run_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  platformRole: roleEnum("platform_role").default("visitor").notNull(),
  ...timestamps,
});
export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  password: text("password"),
  ...timestamps,
});
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  ...timestamps,
});
export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id),
  displayName: text("display_name"),
  timezone: text("timezone").default("America/Chicago").notNull(),
  preferences: jsonb("preferences").default({}).notNull(),
  ...timestamps,
});
export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: roleEnum("key").notNull(),
  name: text("name").notNull(),
});
export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").unique().notNull(),
  description: text("description").notNull(),
});
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .references(() => roles.id)
      .notNull(),
    permissionId: uuid("permission_id")
      .references(() => permissions.id)
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const leagues = pgTable("leagues", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  timezone: text("timezone").default("America/Chicago").notNull(),
  isDemo: boolean("is_demo").default(false).notNull(),
  ...timestamps,
});
export const leagueSeasons = pgTable(
  "league_seasons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leagueId: uuid("league_id")
      .references(() => leagues.id)
      .notNull(),
    year: integer("year").notNull(),
    status: text("status").default("preseason").notNull(),
    salaryCap: numeric("salary_cap", { precision: 12, scale: 2 }).notNull(),
    scoringPrecision: integer("scoring_precision").default(2).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("league_season_year").on(t.leagueId, t.year)],
);
export const divisions = pgTable("divisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueSeasonId: uuid("league_season_id")
    .references(() => leagueSeasons.id)
    .notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  ...timestamps,
});
export const franchises = pgTable("franchises", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueId: uuid("league_id")
    .references(() => leagues.id)
    .notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  abbreviation: text("abbreviation").notNull(),
  ...timestamps,
});
/** Historical names are attributes of one continuing franchise, never a new identity. */
export const franchiseAliases = pgTable("franchise_aliases", {
  id: uuid("id").defaultRandom().primaryKey(),
  franchiseId: uuid("franchise_id").references(() => franchises.id).notNull(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation"),
  effectiveFromSeason: integer("effective_from_season"),
  effectiveToSeason: integer("effective_to_season"),
  source: text("source").notNull(),
  ...timestamps,
});
export const franchiseSeasons = pgTable("franchise_seasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  franchiseId: uuid("franchise_id")
    .references(() => franchises.id)
    .notNull(),
  leagueSeasonId: uuid("league_season_id")
    .references(() => leagueSeasons.id)
    .notNull(),
  divisionId: uuid("division_id").references(() => divisions.id),
  active: boolean("active").default(true).notNull(),
  ...timestamps,
});
export const franchiseMemberships = pgTable("franchise_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  franchiseId: uuid("franchise_id")
    .references(() => franchises.id)
    .notNull(),
  leagueSeasonId: uuid("league_season_id")
    .references(() => leagueSeasons.id)
    .notNull(),
  role: roleEnum("role").default("owner").notNull(),
  ...timestamps,
});
export const franchiseBranding = pgTable("franchise_branding", {
  franchiseId: uuid("franchise_id")
    .primaryKey()
    .references(() => franchises.id),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  logoUrl: text("logo_url"),
  ...timestamps,
});

export const nflTeams = pgTable("nfl_teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  abbreviation: text("abbreviation").unique().notNull(),
  city: text("city").notNull(),
  name: text("name").notNull(),
  byeWeek: integer("bye_week"),
});
export const players = pgTable("players", {
  id: uuid("id").defaultRandom().primaryKey(),
  displayName: text("display_name"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  birthDate: date("birth_date"),
  college: text("college"),
  rookieYear: integer("rookie_year"),
  draftYear: integer("draft_year"),
  draftRound: integer("draft_round"),
  draftPick: integer("draft_pick"),
  active: boolean("active").default(true).notNull(),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
  ...timestamps,
});
export const playerSeasons = pgTable(
  "player_seasons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id")
      .references(() => players.id)
      .notNull(),
    nflTeamId: uuid("nfl_team_id").references(() => nflTeams.id),
    year: integer("year").notNull(),
    yearsExperience: integer("years_experience"),
    nflStatus: text("nfl_status"),
    priorPoints: numeric("prior_points", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("player_season_player_year").on(t.playerId, t.year)],
);
export const playerPositionEligibility = pgTable(
  "player_position_eligibility",
  {
    playerSeasonId: uuid("player_season_id")
      .references(() => playerSeasons.id)
      .notNull(),
    position: text("position").notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerSeasonId, t.position] })],
);
export const providerPlayerIds = pgTable(
  "provider_player_ids",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id")
      .references(() => players.id)
      .notNull(),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
  },
  (t) => [uniqueIndex("provider_player_external").on(t.provider, t.externalId)],
);

export const rosterEntries = pgTable("roster_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  franchiseSeasonId: uuid("franchise_season_id")
    .references(() => franchiseSeasons.id)
    .notNull(),
  playerSeasonId: uuid("player_season_id")
    .references(() => playerSeasons.id)
    .notNull(),
  status: rosterStatusEnum("status").default("active").notNull(),
  acquiredAt: timestamp("acquired_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  ...timestamps,
});
export const rosterStatusHistory = pgTable("roster_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  rosterEntryId: uuid("roster_entry_id")
    .references(() => rosterEntries.id)
    .notNull(),
  fromStatus: rosterStatusEnum("from_status"),
  toStatus: rosterStatusEnum("to_status").notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  actorId: uuid("actor_id").references(() => users.id),
});
export const salaries = pgTable("salaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  rosterEntryId: uuid("roster_entry_id")
    .references(() => rosterEntries.id)
    .notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
});
export const contracts = pgTable("contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  rosterEntryId: uuid("roster_entry_id")
    .references(() => rosterEntries.id)
    .notNull(),
  startYear: integer("start_year").notNull(),
  endYear: integer("end_year").notNull(),
  totalYears: integer("total_years").notNull(),
  status: text("status").default("active").notNull(),
  ...timestamps,
});
export const contractYearHistory = pgTable("contract_year_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  contractId: uuid("contract_id")
    .references(() => contracts.id)
    .notNull(),
  season: integer("season").notNull(),
  yearsRemaining: integer("years_remaining").notNull(),
  reason: text("reason").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const playerTags = pgTable("player_tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  rosterEntryId: uuid("roster_entry_id")
    .references(() => rosterEntries.id)
    .notNull(),
  type: text("type").notNull(),
  season: integer("season").notNull(),
  ...timestamps,
});
export const injuredReserveAssignments = pgTable(
  "injured_reserve_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rosterEntryId: uuid("roster_entry_id")
      .references(() => rosterEntries.id)
      .notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    salaryPercentage: numeric("salary_percentage", { precision: 5, scale: 2 })
      .default("100")
      .notNull(),
  },
);
export const taxiSquadAssignments = pgTable("taxi_squad_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  rosterEntryId: uuid("roster_entry_id")
    .references(() => rosterEntries.id)
    .notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  salaryCounts: boolean("salary_counts").default(true).notNull(),
});
export const salaryCapAdjustments = pgTable("salary_cap_adjustments", {
  id: uuid("id").defaultRandom().primaryKey(),
  franchiseSeasonId: uuid("franchise_season_id")
    .references(() => franchiseSeasons.id)
    .notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  ...timestamps,
});
export const deadCapPenalties = pgTable("dead_cap_penalties", {
  id: uuid("id").defaultRandom().primaryKey(),
  franchiseSeasonId: uuid("franchise_season_id")
    .references(() => franchiseSeasons.id)
    .notNull(),
  playerId: uuid("player_id").references(() => players.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  ...timestamps,
});

export const fantasyWeeks = pgTable("fantasy_weeks", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueSeasonId: uuid("league_season_id")
    .references(() => leagueSeasons.id)
    .notNull(),
  week: integer("week").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
});
export const nflGames = pgTable("nfl_games", {
  id: uuid("id").defaultRandom().primaryKey(),
  fantasyWeekId: uuid("fantasy_week_id")
    .references(() => fantasyWeeks.id)
    .notNull(),
  homeTeamId: uuid("home_team_id")
    .references(() => nflTeams.id)
    .notNull(),
  awayTeamId: uuid("away_team_id")
    .references(() => nflTeams.id)
    .notNull(),
  kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
  status: text("status").default("scheduled").notNull(),
});
export const fantasyMatchups = pgTable("fantasy_matchups", {
  id: uuid("id").defaultRandom().primaryKey(),
  fantasyWeekId: uuid("fantasy_week_id")
    .references(() => fantasyWeeks.id)
    .notNull(),
  homeFranchiseSeasonId: uuid("home_franchise_season_id")
    .references(() => franchiseSeasons.id)
    .notNull(),
  awayFranchiseSeasonId: uuid("away_franchise_season_id")
    .references(() => franchiseSeasons.id)
    .notNull(),
  matchupType: text("matchup_type").default("regular_season").notNull(),
  status: text("status").default("scheduled").notNull(),
});
export const seasonResults = pgTable("season_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  franchiseSeasonId: uuid("franchise_season_id").references(() => franchiseSeasons.id).notNull(),
  wins: integer("wins").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  ties: integer("ties").default(0).notNull(),
  pointsFor: numeric("points_for", { precision: 12, scale: 2 }).default("0").notNull(),
  pointsAgainst: numeric("points_against", { precision: 12, scale: 2 }).default("0").notNull(),
  playoffFinish: text("playoff_finish"),
  finalRank: integer("final_rank"),
  ...timestamps,
});
export const championships = pgTable("championships", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueSeasonId: uuid("league_season_id").references(() => leagueSeasons.id).notNull(),
  championFranchiseSeasonId: uuid("champion_franchise_season_id").references(() => franchiseSeasons.id).notNull(),
  runnerUpFranchiseSeasonId: uuid("runner_up_franchise_season_id").references(() => franchiseSeasons.id),
  championshipMatchupId: uuid("championship_matchup_id").references(() => fantasyMatchups.id),
  ...timestamps,
});
export const lineupSubmissions = pgTable("lineup_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  franchiseSeasonId: uuid("franchise_season_id")
    .references(() => franchiseSeasons.id)
    .notNull(),
  fantasyWeekId: uuid("fantasy_week_id")
    .references(() => fantasyWeeks.id)
    .notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  /** Snapshot of derived personnel/formations at submission for historical analysis. */
  formation: jsonb("formation").default({}).notNull(),
});
export const lineupSlots = pgTable("lineup_slots", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueSeasonId: uuid("league_season_id")
    .references(() => leagueSeasons.id)
    .notNull(),
  name: text("name").notNull(),
  eligiblePositions: text("eligible_positions").array().notNull(),
  sortOrder: integer("sort_order").notNull(),
});
export const lineupAssignments = pgTable("lineup_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id")
    .references(() => lineupSubmissions.id)
    .notNull(),
  slotId: uuid("slot_id")
    .references(() => lineupSlots.id)
    .notNull(),
  rosterEntryId: uuid("roster_entry_id")
    .references(() => rosterEntries.id)
    .notNull(),
});
export const playerWeekStats = pgTable("player_week_stats", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerSeasonId: uuid("player_season_id")
    .references(() => playerSeasons.id)
    .notNull(),
  fantasyWeekId: uuid("fantasy_week_id")
    .references(() => fantasyWeeks.id)
    .notNull(),
  stats: jsonb("stats").default({}).notNull(),
  source: text("source").notNull(),
});
export const playerWeekScores = pgTable("player_week_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerWeekStatsId: uuid("player_week_stats_id")
    .references(() => playerWeekStats.id)
    .notNull(),
  points: numeric("points", { precision: 12, scale: 2 }).notNull(),
  ruleVersion: text("rule_version").notNull(),
});
/** Immutable observation log: corrections create a new snapshot instead of overwriting history. */
export const liveStatSnapshots = pgTable("live_stat_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerId: uuid("player_id").references(() => players.id).notNull(),
  nflGameId: uuid("nfl_game_id").references(() => nflGames.id).notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  source: text("source").notNull(),
  sourceVersion: text("source_version"),
  stats: jsonb("stats").notNull(),
  payloadHash: text("payload_hash").notNull(),
  ...timestamps,
});
export const liveEvents = pgTable("live_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  nflGameId: uuid("nfl_game_id").references(() => nflGames.id).notNull(),
  playerId: uuid("player_id").references(() => players.id),
  snapshotId: uuid("snapshot_id").references(() => liveStatSnapshots.id),
  eventType: text("event_type").notNull(),
  confidence: text("confidence").notNull(),
  statDelta: jsonb("stat_delta").default({}).notNull(),
  fantasyPointDelta: numeric("fantasy_point_delta", { precision: 12, scale: 2 }).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  source: text("source").notNull(),
  enrichment: jsonb("enrichment").default({}).notNull(),
  ...timestamps,
});
export const franchiseWeekScores = pgTable("franchise_week_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  franchiseSeasonId: uuid("franchise_season_id")
    .references(() => franchiseSeasons.id)
    .notNull(),
  fantasyWeekId: uuid("fantasy_week_id")
    .references(() => fantasyWeeks.id)
    .notNull(),
  points: numeric("points", { precision: 12, scale: 2 }).notNull(),
});
export const standingsSnapshots = pgTable("standings_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueSeasonId: uuid("league_season_id")
    .references(() => leagueSeasons.id)
    .notNull(),
  throughWeek: integer("through_week").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const victoryPointResults = pgTable("victory_point_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  franchiseWeekScoreId: uuid("franchise_week_score_id")
    .references(() => franchiseWeekScores.id)
    .notNull(),
  headToHead: numeric("head_to_head", { precision: 4, scale: 2 }).notNull(),
  scoringRank: numeric("scoring_rank", { precision: 4, scale: 2 }).notNull(),
  total: numeric("total", { precision: 4, scale: 2 }).notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueSeasonId: uuid("league_season_id")
    .references(() => leagueSeasons.id)
    .notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
  source: text("source").notNull(),
  ...timestamps,
});
export const transactionItems = pgTable("transaction_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id")
    .references(() => transactions.id)
    .notNull(),
  franchiseSeasonId: uuid("franchise_season_id").references(
    () => franchiseSeasons.id,
  ),
  playerSeasonId: uuid("player_season_id").references(() => playerSeasons.id),
  action: text("action").notNull(),
  details: jsonb("details").default({}).notNull(),
});
export const trades = pgTable("trades", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id")
    .references(() => transactions.id)
    .notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});
export const tradeAssets = pgTable("trade_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  tradeId: uuid("trade_id")
    .references(() => trades.id)
    .notNull(),
  fromFranchiseSeasonId: uuid("from_franchise_season_id")
    .references(() => franchiseSeasons.id)
    .notNull(),
  toFranchiseSeasonId: uuid("to_franchise_season_id")
    .references(() => franchiseSeasons.id)
    .notNull(),
  assetType: text("asset_type").notNull(),
  assetId: uuid("asset_id"),
  description: text("description").notNull(),
});
export const draftPicks = pgTable("draft_picks", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueId: uuid("league_id")
    .references(() => leagues.id)
    .notNull(),
  season: integer("season").notNull(),
  round: integer("round").notNull(),
  pick: integer("pick"),
  originalFranchiseId: uuid("original_franchise_id")
    .references(() => franchises.id)
    .notNull(),
  currentFranchiseId: uuid("current_franchise_id")
    .references(() => franchises.id)
    .notNull(),
});
export const auctions = pgTable("auctions", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueSeasonId: uuid("league_season_id")
    .references(() => leagueSeasons.id)
    .notNull(),
  playerSeasonId: uuid("player_season_id")
    .references(() => playerSeasons.id)
    .notNull(),
  status: text("status").notNull(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
});
export const auctionBids = pgTable("auction_bids", {
  id: uuid("id").defaultRandom().primaryKey(),
  auctionId: uuid("auction_id")
    .references(() => auctions.id)
    .notNull(),
  franchiseSeasonId: uuid("franchise_season_id")
    .references(() => franchiseSeasons.id)
    .notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  placedAt: timestamp("placed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

const configColumns = {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueSeasonId: uuid("league_season_id")
    .references(() => leagueSeasons.id)
    .notNull(),
  version: integer("version").default(1).notNull(),
  ...timestamps,
};
export const leagueSettings = pgTable("league_settings", {
  ...configColumns,
  displayName: text("display_name").notNull(),
  timezone: text("timezone").notNull(),
  playerLockPolicy: text("player_lock_policy").notNull(),
});
export const rosterRules = pgTable("roster_rules", {
  ...configColumns,
  activeLimit: integer("active_limit"),
  offseasonActiveLimit: integer("offseason_active_limit"),
  irLimit: integer("ir_limit"),
  taxiLimit: integer("taxi_limit"),
  positionLimits: jsonb("position_limits").default({}).notNull(),
});
export const lineupRules = pgTable("lineup_rules", {
  ...configColumns,
  slotConfiguration: jsonb("slot_configuration").default([]).notNull(),
});
export const salaryCapRules = pgTable("salary_cap_rules", {
  ...configColumns,
  capAmount: numeric("cap_amount", { precision: 12, scale: 2 }).notNull(),
  irSalaryPercentage: numeric("ir_salary_percentage", {
    precision: 5,
    scale: 2,
  })
    .default("100")
    .notNull(),
  taxiSalaryPercentage: numeric("taxi_salary_percentage", {
    precision: 5,
    scale: 2,
  })
    .default("100")
    .notNull(),
  contractYearCap: integer("contract_year_cap"),
});
export const scoringRules = pgTable("scoring_rules", {
  ...configColumns,
  category: text("category").notNull(),
  statKey: text("stat_key").notNull(),
  points: numeric("points", { precision: 12, scale: 4 }).notNull(),
  threshold: numeric("threshold", { precision: 12, scale: 4 }),
});
export const waiverRules = pgTable("waiver_rules", {
  ...configColumns,
  system: text("system").notNull(),
  processingDays: text("processing_days").array().notNull(),
});
export const auctionRules = pgTable("auction_rules", {
  ...configColumns,
  minimumBid: numeric("minimum_bid", { precision: 12, scale: 2 }).notNull(),
  bidIncrement: numeric("bid_increment", { precision: 12, scale: 2 }).notNull(),
});
export const playoffRules = pgTable("playoff_rules", {
  ...configColumns,
  teamCount: integer("team_count").notNull(),
  startsWeek: integer("starts_week").notNull(),
  reseed: boolean("reseed").default(false).notNull(),
});

export const providerConnections = pgTable("provider_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueId: uuid("league_id")
    .references(() => leagues.id)
    .notNull(),
  provider: text("provider").notNull(),
  externalLeagueId: text("external_league_id").notNull(),
  settings: jsonb("settings").default({}).notNull(),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  ...timestamps,
});
export const importRuns = pgTable("import_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  connectionId: uuid("connection_id")
    .references(() => providerConnections.id)
    .notNull(),
  status: runStatusEnum("status").default("pending").notNull(),
  dryRun: boolean("dry_run").default(true).notNull(),
  correlationId: uuid("correlation_id").defaultRandom().notNull(),
  counts: jsonb("counts").default({}).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  error: text("error"),
});
export const importRecords = pgTable("import_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  importRunId: uuid("import_run_id")
    .references(() => importRuns.id)
    .notNull(),
  entityType: text("entity_type").notNull(),
  externalId: text("external_id").notNull(),
  action: text("action").notNull(),
  rawPayload: jsonb("raw_payload"),
  message: text("message"),
});
export const playerSyncRuns = pgTable("player_sync_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: runStatusEnum("status").default("pending").notNull(),
  dryRun: boolean("dry_run").default(true).notNull(),
  source: text("source").default("nflverse").notNull(),
  sourceSeason: integer("source_season").notNull(),
  playersSeen: integer("players_seen").default(0).notNull(),
  playersCreated: integer("players_created").default(0).notNull(),
  playersUpdated: integer("players_updated").default(0).notNull(),
  rosterAttributesUpdated: integer("roster_attributes_updated").default(0).notNull(),
  matchedAutomatically: integer("matched_automatically").default(0).notNull(),
  unmatchedCount: integer("unmatched_count").default(0).notNull(),
  reviewCount: integer("review_count").default(0).notNull(),
  ownershipRecordsModified: integer("ownership_records_modified").default(0).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
});
export const playerSyncIssues = pgTable("player_sync_issues", {
  id: uuid("id").defaultRandom().primaryKey(),
  playerSyncRunId: uuid("player_sync_run_id").references(() => playerSyncRuns.id).notNull(),
  gsisId: text("gsis_id"),
  displayName: text("display_name"),
  code: text("code").notNull(),
  message: text("message").notNull(),
  candidatePlayerIds: uuid("candidate_player_ids").array().default([]).notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});
export const reconciliationIssues = pgTable("reconciliation_issues", {
  id: uuid("id").defaultRandom().primaryKey(),
  importRunId: uuid("import_run_id")
    .references(() => importRuns.id)
    .notNull(),
  severity: text("severity").notNull(),
  entityType: text("entity_type").notNull(),
  externalId: text("external_id"),
  code: text("code").notNull(),
  message: text("message").notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});
export const scheduledJobs = pgTable("scheduled_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").unique().notNull(),
  schedule: text("schedule").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  ...timestamps,
});
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  ...timestamps,
});
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueId: uuid("league_id").references(() => leagues.id),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  entityName: text("entity_name"),
  before: jsonb("before"),
  after: jsonb("after"),
  source: text("source").notNull(),
  correlationId: uuid("correlation_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const leagueRelations = relations(leagues, ({ many }) => ({
  seasons: many(leagueSeasons),
  franchises: many(franchises),
}));
export const seasonRelations = relations(leagueSeasons, ({ one, many }) => ({
  league: one(leagues, {
    fields: [leagueSeasons.leagueId],
    references: [leagues.id],
  }),
  divisions: many(divisions),
}));
export const schemaHealth = sql`select 1`;
