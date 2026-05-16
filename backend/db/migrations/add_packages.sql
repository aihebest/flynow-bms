-- FlyNow BMS — Holiday Packages Table
-- Run once against the live database

CREATE TABLE IF NOT EXISTS packages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  destination   TEXT        NOT NULL,
  origin        TEXT,
  duration_days INTEGER     NOT NULL DEFAULT 1,
  price         NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency      TEXT        NOT NULL DEFAULT 'NGN',
  inclusions    TEXT[]      NOT NULL DEFAULT '{}',
  highlights    TEXT[]      NOT NULL DEFAULT '{}',
  description   TEXT,
  status        TEXT        NOT NULL DEFAULT 'Active'
                            CHECK (status IN ('Active', 'Draft', 'Archived')),
  max_pax       INTEGER,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_by    UUID        REFERENCES staff(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_destination ON packages(destination);
