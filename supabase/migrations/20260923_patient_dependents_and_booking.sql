-- ============================================================================
-- 👨‍👩‍👧‍👦 Migration: Patient Dependents & Family Hub + Medication Adherence
-- Target: Supabase PostgreSQL
-- Date: 2026-09-23
-- ============================================================================

-- 1. Family Dependents Table
CREATE TABLE IF NOT EXISTS patient_dependents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    relationship TEXT NOT NULL CHECK (relationship IN ('PARENT', 'CHILD', 'SPOUSE', 'SIBLING', 'OTHER')),
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    blood_type TEXT,
    weight_kg NUMERIC,
    height_cm NUMERIC,
    allergies TEXT[] DEFAULT '{}'::TEXT[],
    comorbidities TEXT[] DEFAULT '{}'::TEXT[],
    maintenance_meds TEXT[] DEFAULT '{}'::TEXT[],
    priority_category TEXT DEFAULT 'NONE',
    priority_id_number TEXT,
    hmo_provider TEXT,
    hmo_card_number TEXT,
    philhealth_number TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dependents_primary_profile ON patient_dependents(primary_profile_id);

-- Enable RLS
ALTER TABLE patient_dependents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Allow public select for patient_dependents" 
    ON patient_dependents FOR SELECT TO anon, authenticated 
    USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public insert for patient_dependents" 
    ON patient_dependents FOR INSERT TO anon, authenticated 
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public update for patient_dependents" 
    ON patient_dependents FOR UPDATE TO anon, authenticated 
    USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public delete for patient_dependents" 
    ON patient_dependents FOR DELETE TO anon, authenticated 
    USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Medication Adherence Tracker Logs
CREATE TABLE IF NOT EXISTS medication_adherence_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    dependent_id UUID REFERENCES patient_dependents(id) ON DELETE CASCADE,
    prescription_id UUID REFERENCES prescriptions_lab_requests(id) ON DELETE SET NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT,
    scheduled_slot TEXT NOT NULL CHECK (scheduled_slot IN ('MORNING', 'AFTERNOON', 'EVENING', 'BEDTIME', 'PRN')),
    scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
    taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_patient_med_slot_date UNIQUE (patient_id, medication_name, scheduled_slot, scheduled_date)
);

CREATE INDEX IF NOT EXISTS idx_adherence_patient_date ON medication_adherence_logs(patient_id, scheduled_date);

-- Enable RLS
ALTER TABLE medication_adherence_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Allow public all for medication_adherence_logs" 
    ON medication_adherence_logs FOR ALL TO anon, authenticated 
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Ensure appointments table has dependent_id column
DO $$ BEGIN
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS dependent_id UUID REFERENCES patient_dependents(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
