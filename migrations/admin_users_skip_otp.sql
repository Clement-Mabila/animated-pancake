-- Add skip_otp flag to admin_users
-- When true, password login bypasses the email OTP step entirely.
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS skip_otp boolean NOT NULL DEFAULT false;
