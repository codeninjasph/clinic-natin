-- ============================================================================
-- 🩺 CLINIC NATIN — BUSINESS MODEL ENHANCEMENTS MIGRATION
-- Migration: 20260907_business_model_enhancements.sql
-- ============================================================================

-- 1. Enum Updates (PostgreSQL safe additions)
DO $$ BEGIN
    ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'BUFFERED';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE payment_channel ADD VALUE IF NOT EXISTS 'QRPH';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles: RA 10173 Consent & Confidentiality
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS confidentiality_agreed_at TIMESTAMP WITH TIME ZONE;

-- 3. Doctors: Subscription Tier & Gating
ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- 4. Appointments: Interleaving & Buffer Lane Grace Period
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS booking_channel VARCHAR(20) NOT NULL DEFAULT 'ONLINE' CHECK (booking_channel IN ('ONLINE', 'WALK_IN')),
ADD COLUMN IF NOT EXISTS buffered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS restored_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS grace_period_deadline TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_appointments_booking_channel ON appointments(booking_channel);

-- 5. Transactions: PayMongo QRPH References
ALTER TABLE transactions 
ALTER COLUMN amount SET DEFAULT 50.00,
ALTER COLUMN payment_channel SET DEFAULT 'QRPH',
ADD COLUMN IF NOT EXISTS paymongo_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS paymongo_client_key TEXT;

-- 6. Interleaved Auto Next Queue Number Trigger (Odd = Online, Even = Walk-In)
CREATE OR REPLACE FUNCTION assign_queue_number()
RETURNS TRIGGER AS $$
DECLARE
    max_num INTEGER;
    is_walkin BOOLEAN;
BEGIN
    -- Determine if walk-in or online booking
    is_walkin := (NEW.walk_in_name IS NOT NULL AND NEW.walk_in_name <> '') OR NEW.booking_channel = 'WALK_IN';

    IF is_walkin THEN
        NEW.booking_channel := 'WALK_IN';
    ELSE
        NEW.booking_channel := 'ONLINE';
    END IF;

    IF NEW.queue_number IS NULL OR NEW.queue_number = 0 THEN
        IF is_walkin THEN
            -- Find max EVEN number in this queue session
            SELECT COALESCE(MAX(queue_number), 0)
            INTO max_num
            FROM appointments
            WHERE queue_session_id = NEW.queue_session_id AND queue_number % 2 = 0;
            
            IF max_num = 0 THEN
                NEW.queue_number := 2;
            ELSE
                NEW.queue_number := max_num + 2;
            END IF;
        ELSE
            -- Find max ODD number in this queue session
            SELECT COALESCE(MAX(queue_number), -1)
            INTO max_num
            FROM appointments
            WHERE queue_session_id = NEW.queue_session_id AND queue_number % 2 = 1;
            
            IF max_num < 0 THEN
                NEW.queue_number := 1;
            ELSE
                NEW.queue_number := max_num + 2;
            END IF;
        END IF;
    END IF;
    
    -- Format Token Code: CN-ON001 for online, CN-WK002 for walk-in
    IF NEW.token_code IS NULL OR NEW.token_code = '' THEN
        IF is_walkin THEN
            NEW.token_code := 'CN-WK' || LPAD(NEW.queue_number::TEXT, 3, '0');
        ELSE
            NEW.token_code := 'CN-ON' || LPAD(NEW.queue_number::TEXT, 3, '0');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_queue_number ON appointments;
CREATE TRIGGER trg_assign_queue_number
BEFORE INSERT ON appointments
FOR EACH ROW EXECUTE FUNCTION assign_queue_number();

-- 7. Medical Records RLS: Restricted Secretary Triage Access
DROP POLICY IF EXISTS "Secretaries can view triage vitals for active queue patients" ON medical_records;
CREATE POLICY "Secretaries can view triage vitals for active queue patients"
ON medical_records FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM appointments a
        JOIN queue_sessions qs ON qs.id = a.queue_session_id
        JOIN doctors d ON d.id = qs.doctor_id
        JOIN secretaries s ON s.doctor_id = d.id
        JOIN profiles sp ON sp.id = s.profile_id
        WHERE a.id = medical_records.appointment_id
          AND qs.session_date = CURRENT_DATE
          AND sp.auth_id = auth.uid()
    )
);
