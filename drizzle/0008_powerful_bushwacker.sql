CREATE TABLE "provider_franchise_ids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"franchise_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_franchise_ids" ADD CONSTRAINT "provider_franchise_ids_franchise_id_franchises_id_fk" FOREIGN KEY ("franchise_id") REFERENCES "public"."franchises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_franchise_external" ON "provider_franchise_ids" USING btree ("provider","external_id");