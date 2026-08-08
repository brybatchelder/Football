CREATE TABLE "championships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_season_id" uuid NOT NULL,
	"champion_franchise_season_id" uuid NOT NULL,
	"runner_up_franchise_season_id" uuid,
	"championship_matchup_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "franchise_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"franchise_id" uuid NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text,
	"effective_from_season" integer,
	"effective_to_season" integer,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfl_game_id" uuid NOT NULL,
	"player_id" uuid,
	"snapshot_id" uuid,
	"event_type" text NOT NULL,
	"confidence" text NOT NULL,
	"stat_delta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fantasy_point_delta" numeric(12, 2) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"enrichment" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_stat_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"nfl_game_id" uuid NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"source_version" text,
	"stats" jsonb NOT NULL,
	"payload_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "season_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"franchise_season_id" uuid NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"ties" integer DEFAULT 0 NOT NULL,
	"points_for" numeric(12, 2) DEFAULT '0' NOT NULL,
	"points_against" numeric(12, 2) DEFAULT '0' NOT NULL,
	"playoff_finish" text,
	"final_rank" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fantasy_matchups" ADD COLUMN "matchup_type" text DEFAULT 'regular_season' NOT NULL;--> statement-breakpoint
ALTER TABLE "fantasy_matchups" ADD COLUMN "status" text DEFAULT 'scheduled' NOT NULL;--> statement-breakpoint
ALTER TABLE "lineup_submissions" ADD COLUMN "formation" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "championships" ADD CONSTRAINT "championships_league_season_id_league_seasons_id_fk" FOREIGN KEY ("league_season_id") REFERENCES "public"."league_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "championships" ADD CONSTRAINT "championships_champion_franchise_season_id_franchise_seasons_id_fk" FOREIGN KEY ("champion_franchise_season_id") REFERENCES "public"."franchise_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "championships" ADD CONSTRAINT "championships_runner_up_franchise_season_id_franchise_seasons_id_fk" FOREIGN KEY ("runner_up_franchise_season_id") REFERENCES "public"."franchise_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "championships" ADD CONSTRAINT "championships_championship_matchup_id_fantasy_matchups_id_fk" FOREIGN KEY ("championship_matchup_id") REFERENCES "public"."fantasy_matchups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_aliases" ADD CONSTRAINT "franchise_aliases_franchise_id_franchises_id_fk" FOREIGN KEY ("franchise_id") REFERENCES "public"."franchises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_events" ADD CONSTRAINT "live_events_nfl_game_id_nfl_games_id_fk" FOREIGN KEY ("nfl_game_id") REFERENCES "public"."nfl_games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_events" ADD CONSTRAINT "live_events_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_events" ADD CONSTRAINT "live_events_snapshot_id_live_stat_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."live_stat_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_stat_snapshots" ADD CONSTRAINT "live_stat_snapshots_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_stat_snapshots" ADD CONSTRAINT "live_stat_snapshots_nfl_game_id_nfl_games_id_fk" FOREIGN KEY ("nfl_game_id") REFERENCES "public"."nfl_games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_results" ADD CONSTRAINT "season_results_franchise_season_id_franchise_seasons_id_fk" FOREIGN KEY ("franchise_season_id") REFERENCES "public"."franchise_seasons"("id") ON DELETE no action ON UPDATE no action;