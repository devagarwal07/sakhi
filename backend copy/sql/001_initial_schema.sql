-- ============================================================
-- Sakhi Platform · Initial Schema
-- Migration: 001_initial_schema.sql
-- Generated: 2026-03-26
-- Notes:
--   • RLS is ENABLED on every table; no policies are defined
--     because the server uses the service_role key which
--     bypasses RLS entirely.
--   • All UUID PKs default to gen_random_uuid().
-- ============================================================

-- ---------------------
-- 1. users (riders)
-- ---------------------
CREATE TABLE users (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone               text UNIQUE NOT NULL,
    name                text,
    email               text,
    profile_photo_url   text,
    gender_verified     boolean DEFAULT false,
    aadhaar_front_url   text,
    aadhaar_back_url    text,
    verification_method text CHECK (verification_method IN ('aadhaar', 'facial')),
    verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    accessibility_note  text,
    fcm_token           text,
    referral_code       text UNIQUE,
    referred_by         uuid REFERENCES users (id),
    wallet_credits      numeric DEFAULT 0,
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 2. drivers
-- ---------------------
CREATE TABLE drivers (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone               text UNIQUE NOT NULL,
    name                text,
    profile_photo_url   text,
    gender_verified     boolean DEFAULT false,
    verification_status text DEFAULT 'pending'    CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    kyc_status          text DEFAULT 'pending'    CHECK (kyc_status IN ('pending', 'verified', 'manual_review', 'rejected')),
    signzy_request_id   text,
    dl_url              text,
    rc_url              text,
    insurance_url       text,
    aadhaar_url         text,
    vehicle_type        text DEFAULT 'auto',
    vehicle_reg_no      text,
    vehicle_color       text,
    vehicle_model       text,
    language_pref       text DEFAULT 'en'         CHECK (language_pref IN ('en', 'kn')),
    accessibility_note  text,
    commission_mode     text DEFAULT 'daily'      CHECK (commission_mode IN ('daily', 'weekly')),
    subscription_opt_in boolean DEFAULT false,
    is_online           boolean DEFAULT false,
    is_active           boolean DEFAULT true,
    fcm_token           text,
    referral_code       text UNIQUE,
    referred_by         uuid REFERENCES drivers (id),
    wallet_credits      numeric DEFAULT 0,
    last_known_lat      numeric,
    last_known_lng      numeric,
    created_at          timestamptz DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 3. driver_locations
-- ---------------------
CREATE TABLE driver_locations (
    driver_id  uuid PRIMARY KEY REFERENCES drivers (id),
    lat        numeric NOT NULL,
    lng        numeric NOT NULL,
    heading    numeric,
    speed      numeric,
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 4. otp_codes
-- ---------------------
CREATE TABLE otp_codes (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone      text NOT NULL,
    code       text NOT NULL,
    expires_at timestamptz NOT NULL,
    used       boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 5. refresh_tokens
-- ---------------------
CREATE TABLE refresh_tokens (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL,
    role       text NOT NULL CHECK (role IN ('rider', 'driver', 'admin')),
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 6. subscriptions  (declared before rides to satisfy FK)
-- ---------------------
CREATE TABLE subscriptions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id          uuid NOT NULL REFERENCES users (id),
    driver_id         uuid REFERENCES drivers (id),
    pickup_lat        numeric,
    pickup_lng        numeric,
    pickup_address    text,
    drop_lat          numeric,
    drop_lng          numeric,
    drop_address      text,
    pickup_time       time,
    return_pickup_time time,
    is_two_way        boolean DEFAULT false,
    plan_rides        smallint CHECK (plan_rides IN (7, 14, 21, 30)),
    days_of_week      integer[],
    start_date        date,
    end_date          date,
    per_ride_fare     numeric,
    total_cost        numeric,
    status            text DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'active', 'paused', 'cancelled', 'completed')),
    rides_completed   smallint DEFAULT 0,
    rides_remaining   smallint,
    payment_id        text,
    cancelled_at      timestamptz,
    created_at        timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 7. rides
-- ---------------------
CREATE TABLE rides (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id             uuid NOT NULL REFERENCES users (id),
    driver_id            uuid REFERENCES drivers (id),
    subscription_id      uuid REFERENCES subscriptions (id),
    pickup_lat           numeric,
    pickup_lng           numeric,
    pickup_address       text,
    drop_lat             numeric,
    drop_lng             numeric,
    drop_address         text,
    estimated_fare       numeric,
    final_fare           numeric,
    distance_km          numeric,
    duration_min         numeric,
    status               text DEFAULT 'searching' CHECK (status IN ('searching', 'assigned', 'driver_en_route', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_drivers_available')),
    waiting_start_at     timestamptz,
    waiting_seconds      int DEFAULT 0,
    waiting_charge       numeric DEFAULT 0,
    payment_method       text DEFAULT 'cash',
    payment_collected    boolean DEFAULT false,
    rider_rating         smallint CHECK (rider_rating BETWEEN 1 AND 5),
    rider_comment        text,
    cancellation_reason  text,
    cancelled_by         text CHECK (cancelled_by IN ('rider', 'driver', 'system')),
    sos_triggered        boolean DEFAULT false,
    anomaly_alerts       jsonb DEFAULT '[]',
    route_polyline       text,
    created_at           timestamptz DEFAULT now(),
    started_at           timestamptz,
    completed_at         timestamptz
);

ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 8. subscription_rides
-- ---------------------
CREATE TABLE subscription_rides (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id     uuid NOT NULL REFERENCES subscriptions (id),
    ride_id             uuid REFERENCES rides (id),
    scheduled_date      date,
    scheduled_time      time,
    is_return           boolean DEFAULT false,
    status              text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'missed', 'reassigned')),
    assigned_driver_id  uuid REFERENCES drivers (id),
    reminder_sent_24h   boolean DEFAULT false,
    reminder_sent_60m   boolean DEFAULT false,
    driver_blocked      boolean DEFAULT false,
    created_at          timestamptz DEFAULT now()
);

ALTER TABLE subscription_rides ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 9. driver_blocks
-- ---------------------
CREATE TABLE driver_blocks (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id            uuid NOT NULL REFERENCES drivers (id),
    blocked_until        timestamptz,
    subscription_ride_id uuid REFERENCES subscription_rides (id),
    created_at           timestamptz DEFAULT now()
);

ALTER TABLE driver_blocks ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 10. emergency_contacts
-- ---------------------
CREATE TABLE emergency_contacts (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users (id),
    name       text NOT NULL,
    phone      text NOT NULL,
    relation   text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 11. sos_events
-- ---------------------
CREATE TABLE sos_events (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id            uuid REFERENCES rides (id),
    triggered_by       text CHECK (triggered_by IN ('rider', 'driver')),
    user_id            uuid NOT NULL,
    lat                numeric,
    lng                numeric,
    contacts_notified  jsonb DEFAULT '[]',
    support_chat_id    text,
    resolved_at        timestamptz,
    created_at         timestamptz DEFAULT now()
);

ALTER TABLE sos_events ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 12. saved_addresses
-- ---------------------
CREATE TABLE saved_addresses (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users (id),
    label      text NOT NULL,
    lat        numeric NOT NULL,
    lng        numeric NOT NULL,
    address    text NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 13. ride_chat_messages
-- ---------------------
CREATE TABLE ride_chat_messages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id     uuid NOT NULL REFERENCES rides (id),
    sender_id   uuid NOT NULL,
    sender_role text CHECK (sender_role IN ('rider', 'driver')),
    message_en  text NOT NULL,
    message_kn  text,
    sent_at     timestamptz DEFAULT now()
);

ALTER TABLE ride_chat_messages ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 14. support_tickets
-- ---------------------
CREATE TABLE support_tickets (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL,
    role        text CHECK (role IN ('rider', 'driver')),
    ride_id     uuid REFERENCES rides (id),
    category    text CHECK (category IN ('ride_issue', 'driver_complaint', 'payment_dispute', 'subscription_issue', 'app_bug', 'safety_concern', 'other')),
    description text NOT NULL,
    status      text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    messages    jsonb DEFAULT '[]',
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 15. notifications_log
-- ---------------------
CREATE TABLE notifications_log (
    id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id  uuid NOT NULL,
    type     text NOT NULL,
    title    text,
    body     text,
    read     boolean DEFAULT false,
    sent_at  timestamptz DEFAULT now()
);

ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 16. promo_discounts
-- ---------------------
CREATE TABLE promo_discounts (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code         text UNIQUE NOT NULL,
    discount_pct numeric NOT NULL,
    valid_from   date,
    valid_to     date,
    max_uses     integer,
    used_count   integer DEFAULT 0,
    is_active    boolean DEFAULT true,
    created_at   timestamptz DEFAULT now()
);

ALTER TABLE promo_discounts ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 17. referrals
-- ---------------------
CREATE TABLE referrals (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id uuid NOT NULL,
    referee_id  uuid NOT NULL,
    type        text CHECK (type IN ('rider', 'driver')),
    rewarded_at timestamptz,
    created_at  timestamptz DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 18. commission_ledger
-- ---------------------
CREATE TABLE commission_ledger (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id  uuid NOT NULL REFERENCES drivers (id),
    date       date NOT NULL,
    active_day boolean DEFAULT false,
    amount     numeric DEFAULT 0,
    type       text CHECK (type IN ('cash', 'weekly')),
    paid       boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE commission_ledger ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 19. loyalty_milestones
-- ---------------------
CREATE TABLE loyalty_milestones (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id        uuid NOT NULL REFERENCES drivers (id),
    month            text NOT NULL,   -- format: YYYY-MM
    active_days      smallint DEFAULT 0,
    milestone_reached boolean DEFAULT false,
    reward_applied   boolean DEFAULT false,
    created_at       timestamptz DEFAULT now()
);

ALTER TABLE loyalty_milestones ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 20. fare_config
-- ---------------------
CREATE TABLE fare_config (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_type    text DEFAULT 'auto',
    base_fare       numeric NOT NULL,
    per_km          numeric NOT NULL,
    per_min_wait    numeric NOT NULL,
    free_wait_secs  integer DEFAULT 180,
    commission_rate numeric DEFAULT 0.15,
    is_active       boolean DEFAULT true,
    updated_at      timestamptz DEFAULT now()
);

ALTER TABLE fare_config ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 21. driver_earnings
-- ---------------------
CREATE TABLE driver_earnings (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id  uuid NOT NULL REFERENCES drivers (id),
    ride_id    uuid NOT NULL REFERENCES rides (id),
    gross      numeric NOT NULL,
    commission numeric NOT NULL,
    net        numeric NOT NULL,
    paid_at    timestamptz,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- 22. sync_meta
-- ---------------------
CREATE TABLE sync_meta (
    tab_name       text PRIMARY KEY,
    last_synced_at timestamptz
);

ALTER TABLE sync_meta ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INDEXES
-- ============================================================

-- users
CREATE INDEX idx_users_phone          ON users (phone);
CREATE INDEX idx_users_referral_code  ON users (referral_code);

-- drivers
CREATE INDEX idx_drivers_phone          ON drivers (phone);
CREATE INDEX idx_drivers_is_online      ON drivers (is_online);
CREATE INDEX idx_drivers_kyc_status     ON drivers (kyc_status);
CREATE INDEX idx_drivers_referral_code  ON drivers (referral_code);

-- driver_locations
CREATE INDEX idx_driver_locations_driver_id  ON driver_locations (driver_id);
CREATE INDEX idx_driver_locations_updated_at ON driver_locations (updated_at);

-- rides
CREATE INDEX idx_rides_rider_id   ON rides (rider_id);
CREATE INDEX idx_rides_driver_id  ON rides (driver_id);
CREATE INDEX idx_rides_status     ON rides (status);
CREATE INDEX idx_rides_created_at ON rides (created_at);

-- subscription_rides
CREATE INDEX idx_subscription_rides_scheduled_date  ON subscription_rides (scheduled_date);
CREATE INDEX idx_subscription_rides_subscription_id ON subscription_rides (subscription_id);
CREATE INDEX idx_subscription_rides_status          ON subscription_rides (status);

-- driver_blocks
CREATE INDEX idx_driver_blocks_driver_id     ON driver_blocks (driver_id);
CREATE INDEX idx_driver_blocks_blocked_until ON driver_blocks (blocked_until);

-- commission_ledger
CREATE INDEX idx_commission_ledger_driver_date ON commission_ledger (driver_id, date);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default fare configuration (auto)
INSERT INTO fare_config (vehicle_type, base_fare, per_km, per_min_wait, free_wait_secs, commission_rate)
VALUES ('auto', 30, 12, 1.5, 180, 0.15);

-- sync_meta rows for all Google Sheets tabs
INSERT INTO sync_meta (tab_name) VALUES
    ('trips'),
    ('riders'),
    ('drivers'),
    ('payments'),
    ('subscriptions'),
    ('sos_events'),
    ('commission');
