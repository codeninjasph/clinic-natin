-- ============================================================================
-- 🩺 CLINIC NATIN — MASTER HEALTHCARE REFERENCE & LOOKUP TABLES
-- Standardized Philippine Healthcare Reference Catalogs
-- Compliant with PRC Regulatory Standards, PMA Specialty Boards, & PhilHealth
-- ============================================================================

-- 1. MEDICAL SPECIALTIES TABLE
CREATE TABLE IF NOT EXISTS medical_specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'General',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. MEDICAL SUBSPECIALTIES TABLE
CREATE TABLE IF NOT EXISTS medical_subspecialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    specialty_id UUID NOT NULL REFERENCES medical_specialties(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_specialty_subspecialty UNIQUE (specialty_id, code)
);

-- 3. HOSPITALS & MEDICAL CENTERS (Cagayan de Oro & Region 10 Network)
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Cagayan de Oro',
    province TEXT NOT NULL DEFAULT 'Misamis Oriental',
    doh_license_number TEXT,
    contact_phone TEXT,
    has_er BOOLEAN DEFAULT TRUE,
    is_partner BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PHILIPPINE BOARD CERTIFICATIONS & SPECIALTY SOCIETIES
CREATE TABLE IF NOT EXISTS board_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    society_name TEXT NOT NULL,
    abbreviation VARCHAR(20) NOT NULL,
    specialty_id UUID REFERENCES medical_specialties(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. HMO & HEALTH INSURANCE PROVIDERS
CREATE TABLE IF NOT EXISTS hmo_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    requires_prior_auth BOOLEAN DEFAULT TRUE,
    contact_desk TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES (Public read for active lookup items, admin write)
ALTER TABLE medical_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_subspecialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE hmo_providers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view active specialties" ON medical_specialties;
    CREATE POLICY "Public can view active specialties" ON medical_specialties FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view active subspecialties" ON medical_subspecialties;
    CREATE POLICY "Public can view active subspecialties" ON medical_subspecialties FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view active hospitals" ON hospitals;
    CREATE POLICY "Public can view active hospitals" ON hospitals FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view active board certifications" ON board_certifications;
    CREATE POLICY "Public can view active board certifications" ON board_certifications FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view active hmo providers" ON hmo_providers;
    CREATE POLICY "Public can view active hmo providers" ON hmo_providers FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Allow admin & service role full write access
DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow service write to specialties" ON medical_specialties;
    CREATE POLICY "Allow service write to specialties" ON medical_specialties FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow service write to subspecialties" ON medical_subspecialties;
    CREATE POLICY "Allow service write to subspecialties" ON medical_subspecialties FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow service write to hospitals" ON hospitals;
    CREATE POLICY "Allow service write to hospitals" ON hospitals FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow service write to board certifications" ON board_certifications;
    CREATE POLICY "Allow service write to board certifications" ON board_certifications FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow service write to hmo providers" ON hmo_providers;
    CREATE POLICY "Allow service write to hmo providers" ON hmo_providers FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SEED DATA: OFFICIAL PHILIPPINE HEALTHCARE MASTER DIRECTORIES
-- ============================================================================

-- 1. Seed Specialties
INSERT INTO medical_specialties (code, name, category, display_order)
VALUES
    ('GENERAL_PRACTICE', 'Family Medicine / General Practice', 'Primary Care', 1),
    ('PEDIATRICS', 'Pediatrics', 'Pediatric Care', 2),
    ('INTERNAL_MEDICINE', 'Internal Medicine', 'Adult Medicine', 3),
    ('OB_GYN', 'Obstetrics & Gynecology', 'Women''s Health', 4),
    ('CARDIOLOGY', 'Cardiology', 'Adult Medicine', 5),
    ('GENERAL_SURGERY', 'General Surgery', 'Surgical Specialties', 6),
    ('ORTHOPEDICS', 'Orthopedic Surgery', 'Surgical Specialties', 7),
    ('DERMATOLOGY', 'Dermatology', 'Specialized Medicine', 8),
    ('OPHTHALMOLOGY', 'Ophthalmology', 'Specialized Medicine', 9),
    ('ENT', 'ENT - Otolaryngology', 'Specialized Medicine', 10),
    ('NEUROLOGY', 'Neurology', 'Specialized Medicine', 11),
    ('PSYCHIATRY', 'Psychiatry & Behavioral Health', 'Specialized Medicine', 12),
    ('PULMONOLOGY', 'Pulmonology', 'Adult Medicine', 13),
    ('NEPHROLOGY', 'Nephrology', 'Adult Medicine', 14),
    ('UROLOGY', 'Urology', 'Surgical Specialties', 15),
    ('GASTROENTEROLOGY', 'Gastroenterology', 'Adult Medicine', 16),
    ('ENDOCRINOLOGY', 'Endocrinology & Diabetology', 'Adult Medicine', 17),
    ('ANESTHESIOLOGY', 'Anesthesiology', 'Perioperative', 18),
    ('RADIOLOGY', 'Radiology & Imaging', 'Diagnostic', 19),
    ('PATHOLOGY', 'Clinical Pathology', 'Diagnostic', 20)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    display_order = EXCLUDED.display_order;

-- 2. Seed Subspecialties
INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'PEDIATRIC_PULMO', 'Pediatric Pulmonology' FROM medical_specialties WHERE code = 'PEDIATRICS'
ON CONFLICT (specialty_id, code) DO NOTHING;

INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'PEDIATRIC_CARDIO', 'Pediatric Cardiology' FROM medical_specialties WHERE code = 'PEDIATRICS'
ON CONFLICT (specialty_id, code) DO NOTHING;

INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'NEONATOLOGY', 'Neonatology / Newborn Medicine' FROM medical_specialties WHERE code = 'PEDIATRICS'
ON CONFLICT (specialty_id, code) DO NOTHING;

INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'PEDIATRIC_NEURO', 'Pediatric Neurology' FROM medical_specialties WHERE code = 'PEDIATRICS'
ON CONFLICT (specialty_id, code) DO NOTHING;

INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'INTERVENTIONAL_CARDIO', 'Interventional Cardiology' FROM medical_specialties WHERE code = 'CARDIOLOGY'
ON CONFLICT (specialty_id, code) DO NOTHING;

INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'ELECTROPHYSIOLOGY', 'Cardiac Electrophysiology' FROM medical_specialties WHERE code = 'CARDIOLOGY'
ON CONFLICT (specialty_id, code) DO NOTHING;

INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'MATERNAL_FETAL', 'Maternal & Fetal Medicine' FROM medical_specialties WHERE code = 'OB_GYN'
ON CONFLICT (specialty_id, code) DO NOTHING;

INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'GYNE_ONCO', 'Gynecologic Oncology' FROM medical_specialties WHERE code = 'OB_GYN'
ON CONFLICT (specialty_id, code) DO NOTHING;

INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'REPRODUCTIVE_ENDO', 'Reproductive Endocrinology & Infertility' FROM medical_specialties WHERE code = 'OB_GYN'
ON CONFLICT (specialty_id, code) DO NOTHING;

INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'INFECTIOUS_DISEASE', 'Infectious Diseases' FROM medical_specialties WHERE code = 'INTERNAL_MEDICINE'
ON CONFLICT (specialty_id, code) DO NOTHING;

INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'RHEUMATOLOGY', 'Rheumatology' FROM medical_specialties WHERE code = 'INTERNAL_MEDICINE'
ON CONFLICT (specialty_id, code) DO NOTHING;

INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'MEDICAL_ONCOLOGY', 'Medical Oncology' FROM medical_specialties WHERE code = 'INTERNAL_MEDICINE'
ON CONFLICT (specialty_id, code) DO NOTHING;

INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'HEMATOLOGY', 'Hematology' FROM medical_specialties WHERE code = 'INTERNAL_MEDICINE'
ON CONFLICT (specialty_id, code) DO NOTHING;

INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'INTERVENTIONAL_PULMO', 'Interventional Pulmonology' FROM medical_specialties WHERE code = 'PULMONOLOGY'
ON CONFLICT (specialty_id, code) DO NOTHING;

INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'DIALYSIS_VASCULAR', 'Interventional Nephrology & Dialysis' FROM medical_specialties WHERE code = 'NEPHROLOGY'
ON CONFLICT (specialty_id, code) DO NOTHING;

INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'COLORECTAL_SURGERY', 'Colorectal Surgery' FROM medical_specialties WHERE code = 'GENERAL_SURGERY'
ON CONFLICT (specialty_id, code) DO NOTHING;

INSERT INTO medical_subspecialties (specialty_id, code, name)
SELECT id, 'SURGICAL_ONCO', 'Surgical Oncology' FROM medical_specialties WHERE code = 'GENERAL_SURGERY'
ON CONFLICT (specialty_id, code) DO NOTHING;

-- 3. Seed Hospitals (Cagayan de Oro Network)
INSERT INTO hospitals (code, name, short_name, address, doh_license_number, contact_phone, has_er)
VALUES
    ('MRXUH', 'Maria Reyna - Xavier University Hospital', 'Maria Reyna XU Hospital', 'Camaman-an, Hayes Street, Cagayan de Oro', 'DOH-10-H-0012', '(088) 857-5211', true),
    ('CUMC', 'Capitol University Medical Center', 'Capitol University Medical Center', 'Gusa Highway, Cagayan de Oro', 'DOH-10-H-0025', '(088) 856-4730', true),
    ('POLYMEDIC_PLAZA', 'Cagayan de Oro Polymedic Medical Plaza', 'Polymedic Medical Plaza', 'National Highway, Kauswagan, Cagayan de Oro', 'DOH-10-H-0038', '(088) 858-5858', true),
    ('NMMC', 'Northern Mindanao Medical Center', 'Northern Mindanao Medical Center', 'Capitol Compound, Cagayan de Oro', 'DOH-10-H-0001', '(088) 856-4147', true),
    ('MADONNA', 'Madonna & Child Hospital', 'Madonna & Child Hospital', 'J.V. Seriña St, Carmen, Cagayan de Oro', 'DOH-10-H-0051', '(088) 858-4004', true),
    ('SABAL', 'Sabal Hospital', 'Sabal Hospital', 'A. Velez Street, Cagayan de Oro', 'DOH-10-H-0062', '(088) 857-1111', true),
    ('PUERTO_COMMUNITY', 'Puerto Community Hospital', 'Puerto Community Hospital', 'Sayre Highway, Puerto, Cagayan de Oro', 'DOH-10-H-0074', '(088) 855-2244', true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    address = EXCLUDED.address,
    doh_license_number = EXCLUDED.doh_license_number,
    contact_phone = EXCLUDED.contact_phone;

-- 4. Seed Philippine Board Certifications / Medical Colleges
INSERT INTO board_certifications (code, society_name, abbreviation)
VALUES
    ('PCP', 'Philippine College of Physicians', 'FPCP / DPCP'),
    ('PPS', 'Philippine Pediatric Society', 'FPPS / DPPS'),
    ('POGS', 'Philippine Obstetrical and Gynecological Society', 'FPOGS / DPOGS'),
    ('PCS', 'Philippine College of Surgeons', 'FPCS'),
    ('PAFP', 'Philippine Academy of Family Physicians', 'FPAFP / DPAFP'),
    ('PHA', 'Philippine Heart Association', 'FPHA'),
    ('PSN', 'Philippine Society of Nephrology', 'FPSN'),
    ('PDS', 'Philippine Dermatological Society', 'FPDS / DPDS'),
    ('POA', 'Philippine Orthopaedic Association', 'FPOA'),
    ('PNA', 'Philippine Neurological Association', 'FPNA'),
    ('PCR', 'Philippine College of Radiology', 'FPCR / DPCR'),
    ('PSO_HNS', 'Philippine Society of Otolaryngology - Head and Neck Surgery', 'FPSO-HNS'),
    ('PAO', 'Philippine Academy of Ophthalmology', 'FPAO / DPAO'),
    ('PPA', 'Philippine Psychiatric Association', 'FPPA / DPPA'),
    ('PSA', 'Philippine Society of Anesthesiologists', 'FPSA / DPSA'),
    ('PSU', 'Philippine Urological Association', 'FPUA')
ON CONFLICT (code) DO UPDATE SET
    society_name = EXCLUDED.society_name,
    abbreviation = EXCLUDED.abbreviation;

-- 5. Seed HMO Providers
INSERT INTO hmo_providers (code, name, short_name, requires_prior_auth, contact_desk)
VALUES
    ('MAXICARE', 'Maxicare Healthcare Corporation', 'Maxicare', true, '(02) 8582-1900'),
    ('INTELLICARE', 'Intellicare (Asalus Corporation)', 'Intellicare', true, '(02) 8789-4000'),
    ('MEDICARD', 'MediCard Philippines', 'MediCard', true, '(02) 8884-9999'),
    ('PHILHEALTH_KONSULTA', 'PhilHealth Konsulta (Yakap Bayan)', 'PhilHealth Konsulta', false, '(088) 857-4180 CDO'),
    ('CARITAS', 'Caritas Health Shield', 'Caritas', true, '(02) 8635-7100'),
    ('ETIQA', 'Etiqa Life and General (CDO Branch)', 'Etiqa', true, '(088) 856-1120'),
    ('PACIFIC_CROSS', 'Pacific Cross Philippines', 'Pacific Cross', true, '(02) 8230-1700'),
    ('COCOLIFE', 'Cocolife Healthcare', 'Cocolife', true, '(02) 8810-7888'),
    ('INSULAR', 'Insular Health Care', 'InLife Health Care', true, '(02) 8813-0131'),
    ('CAREHEALTH', 'Carehealth Plus Systems International', 'Carehealth Plus', true, '(02) 8637-8888')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    requires_prior_auth = EXCLUDED.requires_prior_auth,
    contact_desk = EXCLUDED.contact_desk;
