CREATE TABLE "player_sync_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_sync_run_id" uuid NOT NULL,
	"gsis_id" text,
	"display_name" text,
	"code" text NOT NULL,
	"message" text NOT NULL,
	"candidate_player_ids" uuid[] DEFAULT '{}' NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "player_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "run_status" DEFAULT 'pending' NOT NULL,
	"dry_run" boolean DEFAULT true NOT NULL,
	"source" text DEFAULT 'nflverse' NOT NULL,
	"source_season" integer NOT NULL,
	"players_seen" integer DEFAULT 0 NOT NULL,
	"players_created" integer DEFAULT 0 NOT NULL,
	"players_updated" integer DEFAULT 0 NOT NULL,
	"roster_attributes_updated" integer DEFAULT 0 NOT NULL,
	"matched_automatically" integer DEFAULT 0 NOT NULL,
	"unmatched_count" integer DEFAULT 0 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"ownership_records_modified" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"error_message" text
);
--> statement-breakpoint
ALTER TABLE "player_seasons" ADD COLUMN "years_experience" integer;--> statement-breakpoint
ALTER TABLE "player_seasons" ADD COLUMN "nfl_status" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "college" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "rookie_year" integer;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "draft_year" integer;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "draft_round" integer;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "draft_pick" integer;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "source_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "player_sync_issues" ADD CONSTRAINT "player_sync_issues_player_sync_run_id_player_sync_runs_id_fk" FOREIGN KEY ("player_sync_run_id") REFERENCES "public"."player_sync_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "player_season_player_year" ON "player_seasons" USING btree ("player_id","year");