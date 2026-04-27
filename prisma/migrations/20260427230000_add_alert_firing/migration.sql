-- Append-only audit trail for AlertRule firings. AlertRule.lastFiredAt and
-- firedCount remain as aggregates; this table is the navigable history.
CREATE TABLE "AlertFiring" (
  "id"          TEXT      NOT NULL,
  "ruleId"      TEXT      NOT NULL,
  "firedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "level"       TEXT      NOT NULL,
  "channel"     TEXT      NOT NULL,
  "title"       TEXT      NOT NULL,
  "message"     TEXT      NOT NULL,
  "tag"         TEXT,
  "delivered"   BOOLEAN   NOT NULL DEFAULT true,
  "errorReason" TEXT,

  CONSTRAINT "AlertFiring_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AlertFiring_firedAt_idx"        ON "AlertFiring"("firedAt");
CREATE INDEX "AlertFiring_ruleId_firedAt_idx" ON "AlertFiring"("ruleId", "firedAt");
CREATE INDEX "AlertFiring_level_firedAt_idx"  ON "AlertFiring"("level", "firedAt");

ALTER TABLE "AlertFiring"
  ADD CONSTRAINT "AlertFiring_ruleId_fkey"
  FOREIGN KEY ("ruleId") REFERENCES "AlertRule"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
