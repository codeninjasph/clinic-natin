-- ============================================================================
-- 🏥 CLINIC NATIN — GEOGRAPHIC HIERARCHY (PROVINCE TO BARANGAY)
-- Enables scalable location filtering: Province -> City/Municipality -> Barangay -> Street -> Facility
-- ============================================================================

-- 1. Add discrete street and barangay columns to hospitals
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS barangay TEXT;

-- 2. Add discrete street and barangay columns to clinics
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS barangay TEXT;

-- 3. Composite geographic indexes for fast hierarchical queries
CREATE INDEX IF NOT EXISTS idx_hospitals_geo ON hospitals (province, city, barangay);
CREATE INDEX IF NOT EXISTS idx_clinics_geo ON clinics (province, city, barangay);

-- 4. Update existing Cagayan de Oro pilot hospitals with exact Street & Barangay data
UPDATE hospitals
SET 
    street = 'Hayes Street',
    barangay = 'Camaman-an',
    city = 'Cagayan de Oro',
    province = 'Misamis Oriental',
    address = 'Camaman-an, Hayes Street, Cagayan de Oro'
WHERE code = 'MRXUH';

UPDATE hospitals
SET 
    street = 'Gusa Highway',
    barangay = 'Gusa',
    city = 'Cagayan de Oro',
    province = 'Misamis Oriental',
    address = 'Gusa Highway, Cagayan de Oro'
WHERE code = 'CUMC';

UPDATE hospitals
SET 
    street = 'National Highway',
    barangay = 'Kauswagan',
    city = 'Cagayan de Oro',
    province = 'Misamis Oriental',
    address = 'National Highway, Kauswagan, Cagayan de Oro'
WHERE code = 'POLYMEDIC_PLAZA';

UPDATE hospitals
SET 
    street = 'Capitol Compound',
    barangay = 'Barangay 27',
    city = 'Cagayan de Oro',
    province = 'Misamis Oriental',
    address = 'Capitol Compound, Cagayan de Oro'
WHERE code = 'NMMC';

UPDATE hospitals
SET 
    street = 'J.V. Seriña St',
    barangay = 'Carmen',
    city = 'Cagayan de Oro',
    province = 'Misamis Oriental',
    address = 'J.V. Seriña St, Carmen, Cagayan de Oro'
WHERE code = 'MADONNA';

UPDATE hospitals
SET 
    street = 'A. Velez Street',
    barangay = 'Barangay 29',
    city = 'Cagayan de Oro',
    province = 'Misamis Oriental',
    address = 'A. Velez Street, Cagayan de Oro'
WHERE code = 'SABAL';

UPDATE hospitals
SET 
    street = 'Sayre Highway',
    barangay = 'Puerto',
    city = 'Cagayan de Oro',
    province = 'Misamis Oriental',
    address = 'Sayre Highway, Puerto, Cagayan de Oro'
WHERE code = 'PUERTO_COMMUNITY';

-- 5. Backfill existing clinics with the street and barangay of their associated hospital
UPDATE clinics
SET 
    street = COALESCE(clinics.street, h.street),
    barangay = COALESCE(clinics.barangay, h.barangay),
    city = COALESCE(clinics.city, h.city),
    province = COALESCE(clinics.province, h.province)
FROM hospitals h
WHERE clinics.hospital_id = h.id;
