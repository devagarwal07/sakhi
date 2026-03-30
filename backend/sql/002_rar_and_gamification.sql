-- ============================================================
-- Sakhi Platform · Migration 002
-- RAR (Ride Acceptance Rate) tracking + Gamification
-- ============================================================

-- ── 1. Add RAR columns to drivers ──────────────────────────
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS total_requests    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_accepts     integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acceptance_rate   numeric  GENERATED ALWAYS AS (
    CASE WHEN total_requests = 0 THEN 1.0
         ELSE ROUND(total_accepts::numeric / total_requests, 4)
    END
  ) STORED,
  ADD COLUMN IF NOT EXISTS avg_rating        numeric  DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS total_rides       integer  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_tier      text     DEFAULT 'standard'
    CHECK (loyalty_tier IN ('standard', 'silver', 'gold', 'elite'));

-- ── 2. Driver badges ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_badges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  badge_type  text NOT NULL
    CHECK (badge_type IN (
      'weekly_top1', 'weekly_top2', 'weekly_top3',
      'consistency_hero', 'silver_unlock', 'gold_unlock', 'elite_unlock',
      'perfect_week', 'sos_hero'
    )),
  awarded_at  timestamptz DEFAULT now(),
  week_label  text,          -- e.g. '2026-W13' for weekly badges
  description text
);

ALTER TABLE driver_badges ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_driver_badges_driver_id ON driver_badges(driver_id);

-- ── 3. Weekly leaderboard snapshots ──────────────────────────
CREATE TABLE IF NOT EXISTS weekly_leaderboard (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_label      text NOT NULL,      -- format: 'YYYY-WNN'
  driver_id       uuid NOT NULL REFERENCES drivers(id),
  rank            smallint,
  rides_count     integer DEFAULT 0,
  avg_rating_snap numeric,
  acceptance_rate_snap numeric,
  composite_score numeric,
  payout_amount   numeric DEFAULT 0,
  payout_done     boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE weekly_leaderboard ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_lb_week_driver ON weekly_leaderboard(week_label, driver_id);
CREATE INDEX IF NOT EXISTS idx_weekly_lb_week ON weekly_leaderboard(week_label);

-- ── 4. Helper: increment driver request/accept counters ─────
CREATE OR REPLACE FUNCTION increment_driver_rar(
  p_driver_id uuid,
  p_accepted  boolean
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE drivers
  SET
    total_requests = total_requests + 1,
    total_accepts  = total_accepts  + CASE WHEN p_accepted THEN 1 ELSE 0 END
  WHERE id = p_driver_id;
END;
$$;

-- ── 5. Helper: update driver total_rides + avg_rating after completion ──
CREATE OR REPLACE FUNCTION update_driver_stats_on_completion(
  p_driver_id uuid
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_count  integer;
  v_avg    numeric;
BEGIN
  SELECT COUNT(*), COALESCE(AVG(rider_rating), 5.0)
    INTO v_count, v_avg
    FROM rides
   WHERE driver_id = p_driver_id
     AND status = 'completed';

  UPDATE drivers
  SET total_rides = v_count,
      avg_rating  = ROUND(v_avg, 2)
  WHERE id = p_driver_id;
END;
$$;

-- ── 6. Loyalty tier weekly check helper ────────────────────
-- Checks rolling 4-week active days; returns tier label
CREATE OR REPLACE FUNCTION compute_loyalty_tier(p_driver_id uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_current_month  text := to_char(now(), 'YYYY-MM');
  v_prev_month     text := to_char(now() - INTERVAL '1 month', 'YYYY-MM');
  v_active_days    integer;
  v_tier           text;
BEGIN
  -- Sum active days over current + previous month (approx 8-week window)
  SELECT COALESCE(SUM(active_days), 0)
    INTO v_active_days
    FROM loyalty_milestones
   WHERE driver_id = p_driver_id
     AND month IN (v_current_month, v_prev_month);

  IF v_active_days >= 40 THEN
    v_tier := 'elite';
  ELSIF v_active_days >= 26 THEN
    v_tier := 'gold';
  ELSIF v_active_days >= 13 THEN
    v_tier := 'silver';
  ELSE
    v_tier := 'standard';
  END IF;

  RETURN v_tier;
END;
$$;
