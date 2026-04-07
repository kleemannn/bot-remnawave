CREATE TABLE "telegram_sessions" (
  "key" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "telegram_sessions_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "telegram_sessions_updated_at_idx" ON "telegram_sessions"("updated_at");
