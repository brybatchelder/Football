CREATE INDEX "auth_rate_limits_last_request" ON "auth_rate_limits" USING btree ("last_request");--> statement-breakpoint
CREATE INDEX "auth_verifications_expires_at" ON "auth_verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_expires_at" ON "sessions" USING btree ("expires_at");