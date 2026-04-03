CREATE INDEX IF NOT EXISTS "subscriptions_dealer_id_status_idx"
ON "subscriptions"("dealer_id", "status");

CREATE INDEX IF NOT EXISTS "subscriptions_remnawave_user_id_idx"
ON "subscriptions"("remnawave_user_id");

CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_idx"
ON "audit_logs"("actor_id");

CREATE INDEX IF NOT EXISTS "audit_logs_entity_entity_id_idx"
ON "audit_logs"("entity", "entity_id");

CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx"
ON "audit_logs"("created_at");
