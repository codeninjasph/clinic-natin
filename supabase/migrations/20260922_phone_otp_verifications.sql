-- ============================================================================
-- 📱 Migration: Custom Phone OTP Verifications via Semaphore
-- Author: Clinic Natin Dev
-- Date: 2026-09-22
-- ============================================================================

CREATE TABLE IF NOT EXISTS phone_otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    attempts_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    expires_at TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_otp_phone ON phone_otp_verifications(phone_number, created_at DESC);

ALTER TABLE phone_otp_verifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Allow public insert for phone_otp_verifications" 
    ON phone_otp_verifications FOR INSERT TO anon, authenticated 
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public select for phone_otp_verifications" 
    ON phone_otp_verifications FOR SELECT TO anon, authenticated 
    USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public update for phone_otp_verifications" 
    ON phone_otp_verifications FOR UPDATE TO anon, authenticated 
    USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
