-- 005_consecutive_fails.sql
-- Tracks consecutive failed bookings per rider (cancelled + no-driver-found)
-- and activates a free ride after 3 consecutive failures.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS consecutive_fail_count  INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_ride_eligible      BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.consecutive_fail_count IS
  'Incremented on every ride cancelled by rider OR ride that ends in no_drivers_available. Reset to 0 on any successful ride completion.';
COMMENT ON COLUMN users.free_ride_eligible IS
  'Set TRUE when consecutive_fail_count reaches 3. Next fare estimate returns ₹0. Reset to FALSE once the free ride is created.';
