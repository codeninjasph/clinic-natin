-- ============================================================================
-- 🩺 CLINIC NATIN — COMPREHENSIVE PRODUCTION DATABASE SCHEMA
-- PostgreSQL / Supabase Migration
-- Target: Cagayan de Oro Outpatient Queue Management & EMR Platform
-- Compliant with: RA 10173 (Philippine Data Privacy Act) & PhilHealth/HMO Standards
-- ============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CUSTOM ENUMS
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('PATIENT', 'DOCTOR', 'SECRETARY', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE queue_session_status AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM (
        'BOOKED',              -- Token reserved online or walk-in registered
        'WAITING',             -- Patient has checked in / is in waiting area
        'SERVING',             -- Inside consultation room with doctor
        'COMPLETED',           -- Consultation finished
        'SKIPPED',             -- Patient called but not present (can be recalled)
        'CANCELLED_NO_SHOW'    -- Forfeited or cancelled
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority_category AS ENUM ('NONE', 'SENIOR', 'PWD', 'PREGNANT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE platform_payment_status AS ENUM ('PENDING', 'PAID', 'FORFEITED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_channel AS ENUM ('GCASH', 'MAYA', 'CARD', 'GRABPAY', 'BILLEASE', 'CASH_OVER_COUNTER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE clinic_payment_method AS ENUM ('CASH', 'HMO', 'CARD', 'PHILHEALTH', 'FREE_FOLLOWUP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE override_type AS ENUM (
        'CANCELLED_CLINIC', 
        'TIME_CHANGE', 
        'CLINIC_SWAP', 
        'DOCTOR_EMERGENCY_DELAY',
        'SURGERY_EXTENSION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE item_type AS ENUM ('MEDICATION', 'LAB_TEST', 'IMAGING', 'PROCEDURE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE summary_status AS ENUM ('OPEN', 'CLOSED_AND_VERIFIED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'SLOT_CONFIRMED',
        'ADVANCE_WARNING_2_AHEAD',
        'NOW_SERVING',
        'DOCTOR_DELAY_ANNOUNCEMENT',
        'PATIENT_SKIPPED_NOTICE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. CORE IDENTITY & USER PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE, -- References auth.users(id) in Supabase
    role user_role NOT NULL DEFAULT 'PATIENT',
    full_name TEXT NOT NULL,
    phone_number TEXT, -- Philippine format: +639XXXXXXXXX or 09XXXXXXXXX
    email TEXT,
    avatar_url TEXT,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_id ON profiles(auth_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================================================
-- 3. DOCTORS & CLINIC SECRETARIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Dr.',
    specialty TEXT NOT NULL,
    subspecialty TEXT,
    prc_license TEXT,
    ptr_number TEXT,
    s2_license TEXT,
    bio TEXT,
    consultation_fee_default DECIMAL(10, 2) DEFAULT 600.00,
    hmo_accreditations TEXT[] DEFAULT ARRAY['Maxicare', 'Intellicare', 'Medicard', 'PhilHealth']::TEXT[],
    pro_tier_active BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_doctors_profile_id ON doctors(profile_id);

CREATE TABLE IF NOT EXISTS secretaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    hired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    terminated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_doctor_secretary UNIQUE (profile_id, doctor_id)
);
CREATE INDEX IF NOT EXISTS idx_secretaries_doctor ON secretaries(doctor_id);

-- ============================================================================
-- 4. CLINICS & HOSPITAL BUILDINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    hospital_name TEXT NOT NULL, -- e.g., Maria Reyna XU Hospital, CUMC, Polymedic Plaza, NMMC
    building_name TEXT,
    floor_number TEXT,
    room_number TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Cagayan de Oro',
    province TEXT NOT NULL DEFAULT 'Misamis Oriental',
    contact_phone TEXT,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clinics_hospital ON clinics(hospital_name);
CREATE INDEX IF NOT EXISTS idx_clinics_city ON clinics(city);

-- ============================================================================
-- 5. DOCTOR CLINIC SCHEDULES & OVERRIDES
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_clinic_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1 = Monday, 7 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_patients INTEGER NOT NULL DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT unique_doctor_clinic_day UNIQUE (doctor_id, clinic_id, day_of_week, start_time)
);
CREATE INDEX IF NOT EXISTS idx_schedules_doctor ON doctor_clinic_schedules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_schedules_clinic ON doctor_clinic_schedules(clinic_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day ON doctor_clinic_schedules(day_of_week);

CREATE TABLE IF NOT EXISTS schedule_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    override_type override_type NOT NULL,
    delay_minutes INTEGER DEFAULT 0,
    announcement_message TEXT,
    new_start_time TIME,
    new_end_time TIME,
    new_clinic_id UUID REFERENCES clinics(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_overrides_doctor_date ON schedule_overrides(doctor_id, target_date);

-- ============================================================================
-- 6. REAL-TIME QUEUE ENGINE & SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS queue_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES doctor_clinic_schedules(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    status queue_session_status NOT NULL DEFAULT 'PENDING',
    current_serving_number INTEGER DEFAULT 0,
    accepting_walkins BOOLEAN DEFAULT TRUE,
    accepting_online BOOLEAN DEFAULT TRUE,
    announcement_notice TEXT,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_schedule_session_date UNIQUE (schedule_id, session_date)
);
CREATE INDEX IF NOT EXISTS idx_queue_sessions_status ON queue_sessions(status);
CREATE INDEX IF NOT EXISTS idx_queue_sessions_date ON queue_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_queue_sessions_doctor ON queue_sessions(doctor_id);

-- ============================================================================
-- 7. APPOINTMENTS & QUEUE ENTRIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_session_id UUID NOT NULL REFERENCES queue_sessions(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Null if walk-in
    walk_in_name TEXT,
    walk_in_phone TEXT,
    queue_number INTEGER NOT NULL,
    token_code TEXT NOT NULL, -- e.g., 'CN-A101' for quick verification
    status appointment_status NOT NULL DEFAULT 'BOOKED',
    priority_category priority_category NOT NULL DEFAULT 'NONE',
    priority_notes TEXT,
    skip_count INTEGER DEFAULT 0,
    
    -- Consultation details
    consultation_fee DECIMAL(10, 2) DEFAULT 0.00,
    clinic_payment_method clinic_payment_method DEFAULT 'CASH',
    hmo_name TEXT,
    hmo_approval_code TEXT,
    is_paid_to_clinic BOOLEAN DEFAULT FALSE,
    
    -- Platform reservation (₱40 fee)
    platform_fee DECIMAL(10, 2) DEFAULT 40.00,
    platform_payment_status platform_payment_status NOT NULL DEFAULT 'PENDING',
    
    -- Timestamps & progression
    estimated_call_time TIMESTAMP WITH TIME ZONE,
    called_at TIMESTAMP WITH TIME ZONE,
    served_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_session_queue_number UNIQUE (queue_session_id, queue_number)
);
CREATE INDEX IF NOT EXISTS idx_appointments_queue_status ON appointments(queue_session_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_created ON appointments(created_at);

-- ============================================================================
-- 8. PLATFORM CONVENIENCE FEE TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES profiles(id),
    amount DECIMAL(10, 2) NOT NULL DEFAULT 40.00,
    currency TEXT NOT NULL DEFAULT 'PHP',
    payment_channel payment_channel NOT NULL DEFAULT 'GCASH',
    gateway_reference TEXT, -- e.g., PayMongo / GCash checkout ID
    status transaction_status NOT NULL DEFAULT 'PENDING',
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_appointment ON transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- ============================================================================
-- 9. NOTIFICATION LOGS (SMS / WHATSAPP / VIBER)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    recipient_phone TEXT NOT NULL,
    notification_type notification_type NOT NULL,
    message_body TEXT NOT NULL,
    gateway_provider TEXT DEFAULT 'SEMAPHORE', -- Semaphore / PhilSMS
    gateway_response JSONB,
    status notification_status NOT NULL DEFAULT 'QUEUED',
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_appointment ON notification_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notification_logs(status);

-- ============================================================================
-- 10. EMR & MEDICAL RECORDS (PRO TIER)
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    
    -- Clinical Vitals
    vitals JSONB DEFAULT '{
        "blood_pressure": "",
        "heart_rate": null,
        "temperature_c": null,
        "weight_kg": null,
        "height_cm": null,
        "bmi": null,
        "oxygen_saturation": null
    }'::JSONB,
    
    chief_complaint TEXT,
    history_of_present_illness TEXT,
    physical_examination TEXT,
    diagnosis TEXT,
    icd10_code TEXT,
    private_notes TEXT, -- Doctor-only confidential notes
    is_followup_recommended BOOLEAN DEFAULT FALSE,
    followup_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor ON medical_records(doctor_id);

CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    item_type item_type NOT NULL DEFAULT 'MEDICATION',
    generic_name TEXT NOT NULL,
    brand_name TEXT,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    quantity INTEGER,
    instructions TEXT,
    is_digital_copy_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_record ON prescriptions(medical_record_id);

-- ============================================================================
-- 11. FINANCIAL ANALYTICS & DAILY CLINIC SUMMARIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_clinic_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_session_id UUID NOT NULL UNIQUE REFERENCES queue_sessions(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    secretary_id UUID REFERENCES secretaries(id),
    session_date DATE NOT NULL,
    total_patients_seen INTEGER DEFAULT 0,
    total_online_bookings INTEGER DEFAULT 0,
    total_walkin_patients INTEGER DEFAULT 0,
    total_priority_patients INTEGER DEFAULT 0,
    total_cash_collected DECIMAL(10, 2) DEFAULT 0.00,
    total_hmo_claims_count INTEGER DEFAULT 0,
    status summary_status NOT NULL DEFAULT 'OPEN',
    closed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_summaries_doctor_date ON daily_clinic_summaries(doctor_id, session_date);

-- ============================================================================
-- 12. COMPLIANCE AUDIT LOGS (RA 10173 AUDIT TRAIL)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_affected TEXT NOT NULL,
    record_id UUID NOT NULL,
    action audit_action NOT NULL,
    performed_by UUID REFERENCES profiles(id),
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_affected, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- ============================================================================
-- 13. AUTOMATED AUDIT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION log_medical_and_queue_audit()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Attempt to get Supabase auth user id if available
    BEGIN
        SELECT id INTO current_user_id FROM profiles WHERE auth_id = auth.uid() LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_affected, record_id, action, performed_by, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', current_user_id, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (table_affected, record_id, action, performed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', current_user_id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_affected, record_id, action, performed_by, old_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', current_user_id, row_to_json(OLD)::jsonb);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers to sensitive health and queue records
DROP TRIGGER IF EXISTS trg_medical_records_audit ON medical_records;
CREATE TRIGGER trg_medical_records_audit
AFTER INSERT OR UPDATE OR DELETE ON medical_records
FOR EACH ROW EXECUTE FUNCTION log_medical_and_queue_audit();

DROP TRIGGER IF EXISTS trg_prescriptions_audit ON prescriptions;
CREATE TRIGGER trg_prescriptions_audit
AFTER INSERT OR UPDATE OR DELETE ON prescriptions
FOR EACH ROW EXECUTE FUNCTION log_medical_and_queue_audit();

DROP TRIGGER IF EXISTS trg_appointments_audit ON appointments;
CREATE TRIGGER trg_appointments_audit
AFTER INSERT OR UPDATE OR DELETE ON appointments
FOR EACH ROW EXECUTE FUNCTION log_medical_and_queue_audit();

-- ============================================================================
-- 14. HELPER TRIGGER: AUTO NEXT QUEUE NUMBER
-- ============================================================================
CREATE OR REPLACE FUNCTION assign_queue_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    IF NEW.queue_number IS NULL OR NEW.queue_number = 0 THEN
        SELECT COALESCE(MAX(queue_number), 0) + 1 
        INTO next_num
        FROM appointments
        WHERE queue_session_id = NEW.queue_session_id;
        
        NEW.queue_number := next_num;
    END IF;
    
    IF NEW.token_code IS NULL OR NEW.token_code = '' THEN
        NEW.token_code := 'CN-' || LPAD(NEW.queue_number::TEXT, 3, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_queue_number ON appointments;
CREATE TRIGGER trg_assign_queue_number
BEFORE INSERT ON appointments
FOR EACH ROW EXECUTE FUNCTION assign_queue_number();

-- ============================================================================
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS across all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_clinic_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_clinic_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 15.1 Public Read for Clinics, Doctors, and Schedules
CREATE POLICY "Public can view verified clinics" 
ON clinics FOR SELECT USING (is_verified = true);

CREATE POLICY "Public can view verified doctors" 
ON doctors FOR SELECT USING (is_verified = true);

CREATE POLICY "Public can view doctor schedules" 
ON doctor_clinic_schedules FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view schedule overrides" 
ON schedule_overrides FOR SELECT USING (true);

CREATE POLICY "Public can view active queue sessions" 
ON queue_sessions FOR SELECT USING (true);

-- 15.2 Profiles Policy
CREATE POLICY "Users can read their own profile"
ON profiles FOR SELECT
USING (auth_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth_id = auth.uid());

-- 15.3 Appointments Policy
CREATE POLICY "Patients can view their own appointments"
ON appointments FOR SELECT
USING (
    patient_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
    OR auth.role() = 'anon' -- Public token verification via token code
);

CREATE POLICY "Secretaries and Doctors can manage clinic appointments"
ON appointments FOR ALL
USING (
    queue_session_id IN (
        SELECT qs.id FROM queue_sessions qs
        JOIN doctors d ON d.id = qs.doctor_id
        LEFT JOIN secretaries s ON s.doctor_id = d.id
        LEFT JOIN profiles dp ON dp.id = d.profile_id
        LEFT JOIN profiles sp ON sp.id = s.profile_id
        WHERE dp.auth_id = auth.uid() OR sp.auth_id = auth.uid()
    )
);

CREATE POLICY "Anyone can create an appointment / token"
ON appointments FOR INSERT
WITH CHECK (true);

-- 15.4 Medical Records (Strict HIPAA / RA 10173 Protection)
CREATE POLICY "Patients can view their own medical records"
ON medical_records FOR SELECT
USING (patient_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()));

CREATE POLICY "Doctors can manage medical records for their patients"
ON medical_records FOR ALL
USING (doctor_id IN (SELECT d.id FROM doctors d JOIN profiles p ON p.id = d.profile_id WHERE p.auth_id = auth.uid()));

CREATE POLICY "Doctors can manage prescriptions"
ON prescriptions FOR ALL
USING (
    medical_record_id IN (
        SELECT mr.id FROM medical_records mr
        JOIN doctors d ON d.id = mr.doctor_id
        JOIN profiles p ON p.id = d.profile_id
        WHERE p.auth_id = auth.uid()
    )
);

CREATE POLICY "Patients can view their prescriptions"
ON prescriptions FOR SELECT
USING (
    medical_record_id IN (
        SELECT mr.id FROM medical_records mr
        JOIN profiles p ON p.id = mr.patient_id
        WHERE p.auth_id = auth.uid()
    )
);

-- ============================================================================
-- 16. SUPABASE REALTIME REPLICATION SETUP
-- ============================================================================
-- Add active tables to Supabase Realtime publication for instant UI syncing
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE queue_sessions;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE schedule_overrides;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 17. AUTOMATED AUTH SIGNUP PROFILE TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (auth_id, full_name, role, email, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(NEW.email, 'patient@clinicnatin.ph'), '@', 1)),
    COALESCE(
      CASE 
        WHEN NEW.raw_user_meta_data->>'role' IN ('PATIENT', 'DOCTOR', 'SECRETARY', 'ADMIN') 
        THEN (NEW.raw_user_meta_data->>'role')::user_role 
        ELSE NULL 
      END,
      'PATIENT'::user_role
    ),
    NEW.email,
    NEW.raw_user_meta_data->>'phone_number'
  )
  ON CONFLICT (auth_id) DO UPDATE SET
    email = EXCLUDED.email,
    phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user warning: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

