-- ============================================================
--  SAKHI PLATFORM — COMPLETE FRESH DATABASE SETUP
--  File : sakhi_fresh_setup.sql
--  Date : 2026-04-08
--
--  Run this top-to-bottom in Supabase → Database → SQL Editor
--  All tables have been cleared; this creates everything from scratch.
--  Every statement is idempotent (IF NOT EXISTS) so it is safe to
--  re-run if it fails halfway through.
--
--  ORDER OF EXECUTION
--  ──────────────────
--  1.  Extensions
--  2.  Core identity tables  (users, drivers)
--  3.  Auth / session tables (otp_codes, refresh_tokens)
--  4.  Location & ride engine tables
--  5.  Subscription system
--  6.  Safety & SOS
--  7.  Financials (earnings, commission, payouts, wallets)
--  8.  Gamification (badges, leaderboard, loyalty)
--  9.  Support chat
--  10. Misc (notifications log, promos, referrals, fare config)
--  11. Custom SQL functions (RPCs)
--  12. Indexes
--  13. Seed data
--  14. Verify
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- PostGIS — needed for geo queries in matchingEngine.
-- If this fails, enable it manually: Supabase dashboard → Database → Extensions → postgis
CREATE EXTENSION IF NOT EXISTS postgis;


-- ────────────────────────────────────────────────────────────
-- 2A. USERS  (riders)
--     Referenced by: rideController, users.js route, safetyController,
--                    rideService, subscriptionService, referralService
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    phone                 TEXT        UNIQUE NOT NULL,
    name                  TEXT,
    email                 TEXT,
    profile_photo_url     TEXT,
    avatar_url            TEXT,                        -- Supabase Storage avatar (users.js route)
    gender                TEXT        CHECK (gender IN ('female', 'male', 'other')),
    gender_verified       BOOLEAN     DEFAULT false,
    verification_status   TEXT        DEFAULT 'pending'
                              CHECK (verification_status IN ('pending','approved','rejected')),
    accessibility_notes   TEXT,
    fcm_token             TEXT,
    referral_code         TEXT        UNIQUE,
    referred_by           UUID        REFERENCES users(id),
    wallet_credits        NUMERIC     DEFAULT 0,
    -- Consecutive-fail / free-ride (005_consecutive_fails)
    consecutive_fail_count INT        NOT NULL DEFAULT 0,
    free_ride_eligible    BOOLEAN     NOT NULL DEFAULT false,
    is_active             BOOLEAN     DEFAULT true,
    dob                   DATE,
    preferred_language    TEXT,
    updated_at            TIMESTAMPTZ DEFAULT NOW(),
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 2B. DRIVERS
--     Referenced by: driverController, kycService, rideService,
--                    matchingEngine, referralService, workers/*
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS drivers (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    phone                       TEXT        UNIQUE NOT NULL,
    name                        TEXT,
    email                       TEXT,
    dob                         DATE,
    pan                         TEXT,
    dl_number                   TEXT,
    dl_issue_date               DATE,

    -- Vehicle
    vehicle_type                TEXT        DEFAULT 'auto',
    vehicle_reg_no              TEXT,
    vehicle_color               TEXT,
    vehicle_model               TEXT,

    -- Document upload URLs (S3)
    dl_url                      TEXT,
    rc_url                      TEXT,
    insurance_url               TEXT,
    aadhaar_url                 TEXT,
    profile_photo_url           TEXT,
    selfie_url                  TEXT,           -- used in routes/drivers.js

    -- KYC status
    kyc_status                  TEXT        DEFAULT 'pending'
                                    CHECK (kyc_status IN (
                                        'not_submitted','pending','verified',
                                        'approved','rejected','manual_review'
                                    )),
    kyc_submitted_at            TIMESTAMPTZ,
    verification_status         TEXT        DEFAULT 'pending'
                                    CHECK (verification_status IN ('pending','approved','rejected')),

    -- Document verification statuses & expiry
    driving_licence_status      TEXT        DEFAULT 'pending',
    driving_licence_expiry      DATE,
    driving_licence_issued_at   DATE,           -- from Signzy moreInfo
    driving_licence_verified_at TIMESTAMPTZ,    -- when verifyDrivingLicence last called
    dl_vehicle_class            TEXT,           -- JSON array e.g. '["MCWG","LMV"]'
    vehicle_rc_status           TEXT        DEFAULT 'pending',
    vehicle_rc_expiry           DATE,
    insurance_status            TEXT        DEFAULT 'pending',
    insurance_expiry            DATE,

    -- DigiLocker / Aadhaar (migrations/20260408_driver_aadhaar_digilocker.sql)
    aadhaar_name                TEXT,
    aadhaar_dob                 TEXT,           -- DD/MM/YYYY as returned by Signzy
    aadhaar_gender              TEXT,           -- MALE|FEMALE|TRANSGENDER
    aadhaar_uid                 TEXT,           -- masked e.g. xxxxxxxx0353
    aadhaar_address             TEXT,
    aadhaar_photo_url           TEXT,
    aadhaar_status              TEXT        DEFAULT 'pending',
    digilocker_request_id       TEXT,
    digilocker_consent_at       TIMESTAMPTZ,
    digilocker_doc_inventory    TEXT,           -- JSON array
    dl_number_from_digilocker   TEXT,
    pan_from_digilocker         TEXT,
    has_eaadhaar                BOOLEAN,
    digilocker_name_match_score NUMERIC,        -- 0.0–1.0
    digilocker_dob_match        BOOLEAN,
    digilocker_face_match_score TEXT,
    digilocker_pincode_match    BOOLEAN,
    signzy_request_id           TEXT,

    -- Driver state / stats
    is_active                   BOOLEAN     DEFAULT true,
    is_online                   BOOLEAN     DEFAULT false,
    avg_rating                  NUMERIC(3,2) DEFAULT 5.0,
    total_rides                 INT         DEFAULT 0,
    total_earnings              NUMERIC(12,2) DEFAULT 0,
    -- RAR tracking (002_rar_and_gamification)
    total_requests              INT         DEFAULT 0,
    total_accepts               INT         DEFAULT 0,
    -- Loyalty tier
    loyalty_tier                TEXT        DEFAULT 'standard'
                                    CHECK (loyalty_tier IN ('standard','silver','gold','elite')),

    -- Subscription & preferences
    subscription_opt_in         BOOLEAN     DEFAULT false,
    subscription_expiry         TIMESTAMPTZ,    -- used in driverController.getSubscriptionStatus
    subscription_plan           TEXT,           -- used in driverController.getSubscriptionStatus
    language_pref               TEXT        DEFAULT 'en'
                                    CHECK (language_pref IN ('en', 'kn')),
    accessibility_note          TEXT,
    commission_mode             TEXT        DEFAULT 'daily'
                                    CHECK (commission_mode IN ('daily','weekly')),

    -- Payment details
    upi_id                      TEXT,
    bank_account_no             TEXT,
    bank_ifsc                   TEXT,
    bank_account_name           TEXT,
    fund_account_id             TEXT,           -- RazorpayX fund_account_id
    wallet_credits              NUMERIC     DEFAULT 0,

    -- Firebase push
    fcm_token                   TEXT,
    notify_new_rides            BOOLEAN     DEFAULT true,
    notify_promotions           BOOLEAN     DEFAULT true,
    notify_payments             BOOLEAN     DEFAULT true,

    -- Referral
    referral_code               TEXT        UNIQUE,
    referred_by                 UUID        REFERENCES drivers(id),

    -- Location cache
    last_known_lat              NUMERIC,
    last_known_lng              NUMERIC,

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 3A. OTP_CODES
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS otp_codes (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    phone      TEXT        NOT NULL,
    code       TEXT        NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN     DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 3B. REFRESH_TOKENS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL,
    role       TEXT        NOT NULL CHECK (role IN ('rider', 'driver', 'admin')),
    token_hash TEXT        NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 4A. DRIVER_LOCATIONS  (real-time GPS upsert)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS driver_locations (
    driver_id  UUID        PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
    lat        NUMERIC     NOT NULL,
    lng        NUMERIC     NOT NULL,
    heading    NUMERIC,
    speed      NUMERIC,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 4B. FARE_CONFIG  (must exist before rides; fareService.getFareConfig)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fare_config (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_type    TEXT        DEFAULT 'auto',
    base_fare       NUMERIC     NOT NULL,
    per_km          NUMERIC     NOT NULL,
    per_min_wait    NUMERIC     NOT NULL,
    free_wait_secs  INT         DEFAULT 180,
    commission_rate NUMERIC     DEFAULT 0.15,
    is_active       BOOLEAN     DEFAULT true,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fare_config ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 4C. PROMO_DISCOUNTS  (must exist before rides; fareService.applyPromo)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS promo_discounts (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code         TEXT        UNIQUE NOT NULL,
    discount_pct NUMERIC     NOT NULL,
    valid_from   DATE,
    valid_to     DATE,
    max_uses     INT,
    used_count   INT         DEFAULT 0,
    is_active    BOOLEAN     DEFAULT true,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE promo_discounts ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 5A. SUBSCRIPTIONS  (declared before rides for FK)
--     Referenced by: subscriptionController, subscriptionService,
--                    rideController, rideService
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_id           UUID        REFERENCES drivers(id),
    pickup_lat          NUMERIC,
    pickup_lng          NUMERIC,
    pickup_address      TEXT,
    drop_lat            NUMERIC,
    drop_lng            NUMERIC,
    drop_address        TEXT,
    pickup_time         TIME,
    return_pickup_time  TIME,
    is_two_way          BOOLEAN     DEFAULT false,
    plan_rides          SMALLINT    CHECK (plan_rides IN (7, 14, 21, 30)),
    days_of_week        INT[],
    start_date          DATE,
    end_date            DATE,
    per_ride_fare       NUMERIC,
    total_cost          NUMERIC,
    status              TEXT        DEFAULT 'pending_payment'
                            CHECK (status IN (
                                'pending_payment','active','paused','cancelled','completed'
                            )),
    rides_completed     SMALLINT    DEFAULT 0,
    rides_remaining     SMALLINT,
    payment_id          TEXT,
    payment_order_id    TEXT,       -- for Razorpay order (003_coupon_payout)
    cancelled_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 4D. RIDES  (depends on users, drivers, subscriptions)
--     Referenced by: rideController, rideService, matchingEngine,
--                    sosSocket, chatSocket, workers/*
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rides (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id                UUID        NOT NULL REFERENCES users(id),
    driver_id               UUID        REFERENCES drivers(id),
    subscription_id         UUID        REFERENCES subscriptions(id),

    -- Locations (code uses drop_lat / drop_lng / drop_address)
    pickup_lat              NUMERIC,
    pickup_lng              NUMERIC,
    pickup_address          TEXT,
    drop_lat                NUMERIC,
    drop_lng                NUMERIC,
    drop_address            TEXT,
    final_latitude          NUMERIC,    -- from 004_razorpay_payments
    final_longitude         NUMERIC,

    -- Fare fields
    estimated_fare          NUMERIC,
    final_fare              NUMERIC,
    total_fare              NUMERIC,    -- used in rideController.fareSummary
    base_fare               NUMERIC     DEFAULT 0,
    wait_charge             NUMERIC     DEFAULT 0,
    platform_commission     NUMERIC     DEFAULT 0,
    net_fare                NUMERIC     DEFAULT 0,
    fare_breakdown          JSONB,      -- JSON breakdown object
    distance_km             NUMERIC,
    duration_min            NUMERIC,

    -- Status
    status                  TEXT        DEFAULT 'searching'
                                CHECK (status IN (
                                    'searching','assigned','driver_en_route',
                                    'arrived','in_progress','completed',
                                    'cancelled','no_drivers_available'
                                )),
    -- Waiting
    waiting_start_at        TIMESTAMPTZ,
    waiting_seconds         INT         DEFAULT 0,
    waiting_charge          NUMERIC     DEFAULT 0,

    -- Payment
    payment_method          TEXT        DEFAULT 'cash',
    payment_status          TEXT        DEFAULT 'pending'
                                CHECK (payment_status IN (
                                    'pending','paid','collected','failed'
                                )),
    payment_collected       BOOLEAN     DEFAULT false,
    collected_at            TIMESTAMPTZ,    -- set by cash-collected endpoint
    razorpay_order_id       TEXT,
    razorpay_payment_id     TEXT,
    driver_rating_for_rider SMALLINT    CHECK (driver_rating_for_rider BETWEEN 1 AND 5),

    -- Promo (003_coupon_payout)
    promo_code              TEXT,
    promo_discount_amount   NUMERIC     DEFAULT 0,
    promo_liability_settled BOOLEAN     DEFAULT false,

    -- Rider rating
    rider_rating            SMALLINT    CHECK (rider_rating BETWEEN 1 AND 5),
    rider_comment           TEXT,

    -- Cancellation
    cancellation_reason     TEXT,
    cancelled_by            TEXT        CHECK (cancelled_by IN ('rider','driver','system')),

    -- Safety / routing
    sos_triggered           BOOLEAN     DEFAULT false,
    anomaly_alerts          JSONB       DEFAULT '[]',
    route_polyline          TEXT,
    destination_address     TEXT,       -- used in rideService Safe Drop SMS

    -- Timestamps
    started_at              TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rides ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 4E. RIDE_CHAT_MESSAGES
--     Referenced by: chatSocket.js, rideController.getChatHistory
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ride_chat_messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id     UUID        NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    sender_id   UUID        NOT NULL,
    sender_role TEXT        CHECK (sender_role IN ('rider','driver')),
    message_en  TEXT        NOT NULL,   -- English message
    message_kn  TEXT,                   -- Kannada translation
    sent_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ride_chat_messages ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 5B. SUBSCRIPTION_RIDES
--     Referenced by: SubscriptionRideScheduler, rideController,
--                    rideService, subscriptionService
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_rides (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id     UUID        NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    ride_id             UUID        REFERENCES rides(id),
    scheduled_date      DATE,
    scheduled_time      TIME,
    is_return           BOOLEAN     DEFAULT false,
    status              TEXT        DEFAULT 'scheduled'
                            CHECK (status IN (
                                'scheduled','in_progress','completed',
                                'missed','reassigned','dispatched','cancelled'
                            )),
    assigned_driver_id  UUID        REFERENCES drivers(id),
    reminder_sent_24h   BOOLEAN     DEFAULT false,
    reminder_sent_60m   BOOLEAN     DEFAULT false,
    driver_blocked      BOOLEAN     DEFAULT false,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscription_rides ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 5C. DRIVER_BLOCKS  (privacy + subscription no-show)
--     Referenced by: driverController, SubscriptionRideScheduler
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS driver_blocks (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id            UUID        NOT NULL REFERENCES drivers(id),
    blocked_until        TIMESTAMPTZ,
    subscription_ride_id UUID        REFERENCES subscription_rides(id),
    -- rider → driver block (safety feature from matchingEngine)
    rider_id             UUID        REFERENCES users(id),
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE driver_blocks ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 6A. EMERGENCY_CONTACTS  (riders)
--     Referenced by: safetyController, rideSocket, rideService (Safe Drop)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emergency_contacts (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT        NOT NULL,
    phone      TEXT        NOT NULL,
    relation   TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 6B. DRIVER_EMERGENCY_CONTACTS  (drivers)
--     Referenced by: 005_driver_emergency_contacts.sql
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS driver_emergency_contacts (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id  UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    name       TEXT        NOT NULL,
    phone      TEXT        NOT NULL,
    relation   TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE driver_emergency_contacts ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 6C. SOS_EVENTS
--     Referenced by: sosSocket, sosService, safetyController
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sos_events (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id           UUID        REFERENCES rides(id),
    user_id           UUID        NOT NULL,
    triggered_by      TEXT        CHECK (triggered_by IN ('rider','driver')),
    user_role         TEXT        CHECK (user_role IN ('rider','driver')),
    lat               NUMERIC,
    lng               NUMERIC,
    contacts_notified JSONB       DEFAULT '[]',
    support_chat_id   TEXT,
    resolved          BOOLEAN     DEFAULT false,
    resolved_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sos_events ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 6D. ANOMALY_ALERTS  (speed / route deviation — rideSocket.js)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS anomaly_alerts (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id     UUID        REFERENCES rides(id),
    driver_id   UUID        REFERENCES drivers(id),
    alert_type  TEXT,
    details     JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE anomaly_alerts ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 7A. DRIVER_EARNINGS
--     Referenced by: rideService, driverController (earnings/*)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS driver_earnings (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id      UUID        NOT NULL REFERENCES drivers(id),
    ride_id        UUID        NOT NULL REFERENCES rides(id),
    gross          NUMERIC     NOT NULL,
    commission     NUMERIC     NOT NULL,
    net            NUMERIC     NOT NULL,
    waiting_charge NUMERIC     DEFAULT 0,   -- used in driverController.getDriverTransactions
    paid_at        TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 7B. COMMISSION_LEDGER
--     Referenced by: rideService, driverController, paymentController
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commission_ledger (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id           UUID        NOT NULL REFERENCES drivers(id),
    date                DATE        NOT NULL,
    active_day          BOOLEAN     DEFAULT false,
    amount              NUMERIC     DEFAULT 0,
    type                TEXT        CHECK (type IN ('cash','weekly')),
    paid                BOOLEAN     DEFAULT false,
    razorpay_payment_id TEXT,           -- from 004_razorpay_payments
    payment_source      TEXT        DEFAULT 'razorpay'
                            CHECK (payment_source IN ('razorpay','manual','wallet')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (driver_id, date)
);

ALTER TABLE commission_ledger ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 7C. DRIVER_COMMISSION_PAYMENTS  (004_razorpay_payments)
--     Referenced by: paymentController (~commission_payments),
--                    driverController (~commission_payments)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS driver_commission_payments (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id            UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    period               TEXT        NOT NULL DEFAULT 'daily'
                             CHECK (period IN ('daily','weekly')),
    amount_inr           NUMERIC     NOT NULL,
    razorpay_order_id    TEXT,
    razorpay_payment_id  TEXT,
    status               TEXT        NOT NULL DEFAULT 'paid'
                             CHECK (status IN ('pending','paid','failed')),
    paid_at              TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE driver_commission_payments ENABLE ROW LEVEL SECURITY;

-- NOTE: driverController.getDriverTransactions queries 'commission_payments'
-- (without 'driver_' prefix) — creating a view for backwards-compatibility:
CREATE OR REPLACE VIEW commission_payments AS
    SELECT * FROM driver_commission_payments;


-- ────────────────────────────────────────────────────────────
-- 7D. PAYOUT_TRANSACTIONS  (003_coupon_payout)
--     Referenced by: payoutService
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payout_transactions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id           UUID        NOT NULL REFERENCES drivers(id),
    ride_id             UUID        REFERENCES rides(id),
    amount              NUMERIC     NOT NULL,
    type                TEXT        NOT NULL
                            CHECK (type IN ('coupon_liability','weekly_incentive','loyalty_reward')),
    status              TEXT        DEFAULT 'pending'
                            CHECK (status IN ('pending','processing','success','failed')),
    razorpay_payout_id  TEXT,
    utr                 TEXT,
    failure_reason      TEXT,
    initiated_at        TIMESTAMPTZ DEFAULT NOW(),
    settled_at          TIMESTAMPTZ
);

ALTER TABLE payout_transactions ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 7E. WALLET_TRANSACTIONS  (users.js route — /transactions + /wallet)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT        NOT NULL,   -- 'credit'|'debit'|'refund' etc.
    amount      NUMERIC     NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 7F. USER_ADDRESSES  (users.js route — /addresses)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_addresses (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label      TEXT        NOT NULL CHECK (label IN ('home','work','other')),
    address    TEXT        NOT NULL,
    lat        NUMERIC,
    lng        NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 7G. RIDER_RATINGS  (rideController.rateRider — upsert on ride_id)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rider_ratings (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id    UUID        NOT NULL UNIQUE REFERENCES rides(id) ON DELETE CASCADE,
    rider_id   UUID        NOT NULL REFERENCES users(id),
    driver_id  UUID        NOT NULL REFERENCES drivers(id),
    rating     SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    rated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rider_ratings ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 8A. LOYALTY_MILESTONES  (rideService, LoyaltyMilestoneWorker)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS loyalty_milestones (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id        UUID        NOT NULL REFERENCES drivers(id),
    month            TEXT        NOT NULL,   -- YYYY-MM
    active_days      SMALLINT    DEFAULT 0,
    milestone_reached BOOLEAN    DEFAULT false,
    reward_applied   BOOLEAN     DEFAULT false,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (driver_id, month)
);

ALTER TABLE loyalty_milestones ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 8B. DRIVER_BADGES  (LoyaltyTierWorker, LeaderboardWorker)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS driver_badges (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id   UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    badge_type  TEXT        NOT NULL
                    CHECK (badge_type IN (
                        'weekly_top1','weekly_top2','weekly_top3',
                        'consistency_hero','silver_unlock','gold_unlock','elite_unlock',
                        'perfect_week','sos_hero'
                    )),
    awarded_at  TIMESTAMPTZ DEFAULT NOW(),
    week_label  TEXT,
    description TEXT
);

ALTER TABLE driver_badges ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 8C. WEEKLY_LEADERBOARD  (LeaderboardWorker, admin.js)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS weekly_leaderboard (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    week_label           TEXT        NOT NULL,   -- 'YYYY-WNN'
    driver_id            UUID        NOT NULL REFERENCES drivers(id),
    rank                 SMALLINT,
    rides_count          INT         DEFAULT 0,
    avg_rating_snap      NUMERIC,
    acceptance_rate_snap NUMERIC,
    composite_score      NUMERIC,
    payout_amount        NUMERIC     DEFAULT 0,
    payout_done          BOOLEAN     DEFAULT false,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (week_label, driver_id)
);

ALTER TABLE weekly_leaderboard ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 9. SUPPORT CHAT  (routes/support.js)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS support_sessions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT        NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','escalated','urgent','closed')),
    channel         TEXT        NOT NULL DEFAULT 'in_app'
                        CHECK (channel IN ('in_app','email','phone')),
    last_message_at TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS support_messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID        NOT NULL REFERENCES support_sessions(id) ON DELETE CASCADE,
    sender      TEXT        NOT NULL CHECK (sender IN ('user','bot','agent')),
    message     TEXT        NOT NULL,
    intent      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_support_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS support_sessions_updated_at_trigger ON support_sessions;
CREATE TRIGGER support_sessions_updated_at_trigger
    BEFORE UPDATE ON support_sessions
    FOR EACH ROW EXECUTE FUNCTION update_support_sessions_updated_at();


-- ────────────────────────────────────────────────────────────
-- 9B. SUPPORT_TICKETS  (driverController.submitDriverComplaint)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS support_tickets (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    role        TEXT        CHECK (role IN ('rider','driver')),
    ride_id     UUID        REFERENCES rides(id),
    category    TEXT        CHECK (category IN (
                                'ride_issue','driver_complaint','payment_dispute',
                                'subscription_issue','app_bug','safety_concern','other'
                            )),
    description TEXT        NOT NULL,
    screenshot_url TEXT,
    status      TEXT        DEFAULT 'open'
                    CHECK (status IN ('open','in_review','in_progress','resolved','closed')),
    messages    JSONB       DEFAULT '[]',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 10A. NOTIFICATIONS_LOG
--      Referenced by: fcmService, referralService, LoyaltyTierWorker,
--                     LoyaltyMilestoneWorker, notificationController
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications_log (
    id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id  UUID,
    type     TEXT        NOT NULL,
    title    TEXT,
    body     TEXT,
    read     BOOLEAN     DEFAULT false,
    sent_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 10B. REFERRALS
--      Referenced by: referralService (checkDriverReferral)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referrals (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID        NOT NULL,
    referee_id  UUID        NOT NULL,
    type        TEXT        CHECK (type IN ('rider','driver')),
    rewarded_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 10C. SYNC_META  (Google Sheets sync tracking)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sync_meta (
    tab_name       TEXT        PRIMARY KEY,
    last_synced_at TIMESTAMPTZ
);

ALTER TABLE sync_meta ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 11. CUSTOM SQL FUNCTIONS  (RPCs called by the backend)
-- ────────────────────────────────────────────────────────────

-- 11A. RAR helpers (002_rar_and_gamification)
CREATE OR REPLACE FUNCTION increment_driver_rar(
    p_driver_id UUID,
    p_accepted  BOOLEAN
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    UPDATE drivers
    SET
        total_requests = total_requests + 1,
        total_accepts  = total_accepts  + CASE WHEN p_accepted THEN 1 ELSE 0 END
    WHERE id = p_driver_id;
END;
$$;

-- 11B. Update driver stats after ride completion (called by rideService)
CREATE OR REPLACE FUNCTION update_driver_stats_on_completion(
    p_driver_id UUID
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_count INTEGER;
    v_avg   NUMERIC;
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

-- 11C. Loyalty tier compute helper (002_rar_and_gamification)
CREATE OR REPLACE FUNCTION compute_loyalty_tier(p_driver_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    v_current_month TEXT := to_char(NOW(), 'YYYY-MM');
    v_prev_month    TEXT := to_char(NOW() - INTERVAL '1 month', 'YYYY-MM');
    v_active_days   INTEGER;
    v_tier          TEXT;
BEGIN
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

-- 11D. Increment loyalty active days (called by rideService after ride completion)
CREATE OR REPLACE FUNCTION increment_loyalty_active_days(
    p_driver_id UUID,
    p_month     TEXT
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    UPDATE loyalty_milestones
    SET active_days = active_days + 1
    WHERE driver_id = p_driver_id
      AND month = p_month;
END;
$$;

-- 11E. Upsert commission ledger (called by rideService)
CREATE OR REPLACE FUNCTION upsert_commission_ledger(
    p_driver_id UUID,
    p_date      DATE,
    p_amount    NUMERIC
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO commission_ledger (driver_id, date, active_day, amount, type, paid)
    VALUES (p_driver_id, p_date, true, p_amount, 'cash', false)
    ON CONFLICT (driver_id, date)
    DO UPDATE SET
        active_day = true,
        amount     = commission_ledger.amount + EXCLUDED.amount;
END;
$$;

-- 11F. Increment subscription rides_completed (called by rideService)
CREATE OR REPLACE FUNCTION increment_subscription_rides(
    p_sub_id UUID
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    UPDATE subscriptions
    SET rides_completed = rides_completed + 1,
        rides_remaining = GREATEST(0, rides_remaining - 1)
    WHERE id = p_sub_id;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 12. INDEXES
-- ────────────────────────────────────────────────────────────

-- users
CREATE INDEX IF NOT EXISTS idx_users_phone           ON users (phone);
CREATE INDEX IF NOT EXISTS idx_users_referral_code   ON users (referral_code);

-- drivers
CREATE INDEX IF NOT EXISTS idx_drivers_phone         ON drivers (phone);
CREATE INDEX IF NOT EXISTS idx_drivers_is_online     ON drivers (is_online);
CREATE INDEX IF NOT EXISTS idx_drivers_kyc_status    ON drivers (kyc_status);
CREATE INDEX IF NOT EXISTS idx_drivers_referral_code ON drivers (referral_code);
CREATE INDEX IF NOT EXISTS idx_drivers_signzy        ON drivers (signzy_request_id);
CREATE INDEX IF NOT EXISTS idx_drivers_dl_status     ON drivers (driving_licence_status);

-- driver_locations
CREATE INDEX IF NOT EXISTS idx_driver_locations_updated ON driver_locations (updated_at);

-- rides
CREATE INDEX IF NOT EXISTS idx_rides_rider_id        ON rides (rider_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id       ON rides (driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status          ON rides (status);
CREATE INDEX IF NOT EXISTS idx_rides_created_at      ON rides (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_razorpay_order  ON rides (razorpay_order_id)
    WHERE razorpay_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rides_payment_status  ON rides (payment_status);

-- ride_chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_ride_id          ON ride_chat_messages (ride_id, sent_at ASC);

-- subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_rider   ON subscriptions (rider_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON subscriptions (status);

-- subscription_rides
CREATE INDEX IF NOT EXISTS idx_sub_rides_sub_id      ON subscription_rides (subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_rides_date        ON subscription_rides (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_sub_rides_status      ON subscription_rides (status);

-- driver_blocks
CREATE INDEX IF NOT EXISTS idx_driver_blocks_id      ON driver_blocks (driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_blocks_until   ON driver_blocks (blocked_until);

-- driver_earnings
CREATE INDEX IF NOT EXISTS idx_earnings_driver       ON driver_earnings (driver_id);
CREATE INDEX IF NOT EXISTS idx_earnings_ride         ON driver_earnings (ride_id);

-- commission_ledger
CREATE INDEX IF NOT EXISTS idx_ledger_driver_date    ON commission_ledger (driver_id, date);

-- driver_commission_payments
CREATE INDEX IF NOT EXISTS idx_dcp_driver            ON driver_commission_payments (driver_id);
CREATE INDEX IF NOT EXISTS idx_dcp_paid_at           ON driver_commission_payments (paid_at);

-- payout_transactions
CREATE INDEX IF NOT EXISTS idx_payout_driver         ON payout_transactions (driver_id);
CREATE INDEX IF NOT EXISTS idx_payout_ride           ON payout_transactions (ride_id);
CREATE INDEX IF NOT EXISTS idx_payout_status         ON payout_transactions (status);

-- loyalty_milestones
CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_driver_month ON loyalty_milestones (driver_id, month);

-- driver_badges
CREATE INDEX IF NOT EXISTS idx_driver_badges_driver  ON driver_badges (driver_id);

-- weekly_leaderboard
CREATE UNIQUE INDEX IF NOT EXISTS idx_lb_week_driver ON weekly_leaderboard (week_label, driver_id);
CREATE INDEX IF NOT EXISTS idx_lb_week               ON weekly_leaderboard (week_label);

-- support_sessions
CREATE INDEX IF NOT EXISTS idx_support_sessions_user ON support_sessions (user_id, last_message_at DESC);

-- support_messages
CREATE INDEX IF NOT EXISTS idx_support_messages_sess ON support_messages (session_id, created_at ASC);

-- notifications_log
CREATE INDEX IF NOT EXISTS idx_notif_user            ON notifications_log (user_id, sent_at DESC);

-- wallet_transactions
CREATE INDEX IF NOT EXISTS idx_wallet_user           ON wallet_transactions (user_id, created_at DESC);

-- user_addresses
CREATE INDEX IF NOT EXISTS idx_user_addresses_user   ON user_addresses (user_id);

-- sos_events
CREATE INDEX IF NOT EXISTS idx_sos_ride              ON sos_events (ride_id);
CREATE INDEX IF NOT EXISTS idx_sos_user              ON sos_events (user_id);

-- anomaly_alerts
CREATE INDEX IF NOT EXISTS idx_anomaly_ride          ON anomaly_alerts (ride_id);

-- referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referee     ON referrals (referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer    ON referrals (referrer_id);


-- ────────────────────────────────────────────────────────────
-- 13. SEED DATA
-- ────────────────────────────────────────────────────────────

-- Default fare configuration (auto)
INSERT INTO fare_config (vehicle_type, base_fare, per_km, per_min_wait, free_wait_secs, commission_rate)
VALUES ('auto', 50, 20, 2.0, 180, 0.15)
ON CONFLICT DO NOTHING;

-- sync_meta rows
INSERT INTO sync_meta (tab_name) VALUES
    ('trips'),
    ('riders'),
    ('drivers'),
    ('payments'),
    ('subscriptions'),
    ('sos_events'),
    ('commission')
ON CONFLICT DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 14. VERIFY  — run these SELECT queries to confirm setup
-- ────────────────────────────────────────────────────────────

-- Confirm all tables exist:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users', 'drivers', 'otp_codes', 'refresh_tokens',
    'driver_locations', 'fare_config', 'promo_discounts',
    'subscriptions', 'rides', 'ride_chat_messages',
    'subscription_rides', 'driver_blocks',
    'emergency_contacts', 'driver_emergency_contacts',
    'sos_events', 'anomaly_alerts',
    'driver_earnings', 'commission_ledger',
    'driver_commission_payments', 'payout_transactions',
    'wallet_transactions', 'user_addresses', 'rider_ratings',
    'loyalty_milestones', 'driver_badges', 'weekly_leaderboard',
    'support_sessions', 'support_messages', 'support_tickets',
    'notifications_log', 'referrals', 'sync_meta'
  )
ORDER BY table_name;

-- Confirm drivers columns from DigiLocker migrations:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'drivers'
  AND column_name IN (
    'aadhaar_name', 'digilocker_request_id', 'signzy_request_id',
    'dl_number_from_digilocker', 'driving_licence_issued_at',
    'dl_vehicle_class', 'subscription_expiry', 'selfie_url',
    'notify_new_rides', 'loyalty_tier', 'total_requests'
  )
ORDER BY column_name;

-- Confirm custom RPCs exist:
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'increment_driver_rar',
    'update_driver_stats_on_completion',
    'compute_loyalty_tier',
    'increment_loyalty_active_days',
    'upsert_commission_ledger',
    'increment_subscription_rides'
  )
ORDER BY routine_name;

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2 Subscription Flow Migrations  (run once on existing DB)
-- Adds pending_payment as a valid subscription status (text column — no change needed).
-- Ensures referral_code column exists on users.
-- Adds scheduled_dates JSONB column for subscription rides calendar view.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Referral code on users (auto-generated unique code)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE
    DEFAULT upper(substring(md5(random()::text || id::text) from 1 for 8));

-- 2. Referral tracking
CREATE TABLE IF NOT EXISTS referrals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referrer_type    TEXT NOT NULL DEFAULT 'rider',   -- 'rider' | 'driver'
  reward_amount    NUMERIC(10,2) DEFAULT 0,
  reward_paid      BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  UNIQUE(referred_id)
);

-- 3. scheduled_dates on subscriptions (array of YYYY-MM-DD strings from ride generation)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS scheduled_dates JSONB DEFAULT '[]';

-- 4. Populate scheduled_dates from existing subscription_rides rows
UPDATE subscriptions s
SET scheduled_dates = (
  SELECT jsonb_agg(TO_CHAR(sr.scheduled_date, 'YYYY-MM-DD') ORDER BY sr.scheduled_date)
  FROM subscription_rides sr
  WHERE sr.subscription_id = s.id
    AND sr.scheduled_date >= CURRENT_DATE
    AND sr.status = 'pending'
)
WHERE EXISTS (
  SELECT 1 FROM subscription_rides sr WHERE sr.subscription_id = s.id
);
