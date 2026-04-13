-- Driver emergency contacts (riders use `emergency_contacts.user_id` → users)
CREATE TABLE IF NOT EXISTS driver_emergency_contacts (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id  uuid NOT NULL REFERENCES drivers (id) ON DELETE CASCADE,
    name       text NOT NULL,
    phone      text NOT NULL,
    relation   text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE driver_emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_driver_emergency_contacts_driver ON driver_emergency_contacts (driver_id);
