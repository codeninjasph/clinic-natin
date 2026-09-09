-- ============================================================================
-- 🏥 CLINIC NATIN — CLINICS & CONSULTATION SUITES MANAGEMENT ENHANCEMENT
-- Adds operational status, operating hours, hospital FK, and seeds CDO rooms
-- ============================================================================

-- 1. Add operational columns to clinics table if not already present
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS operating_hours TEXT DEFAULT 'Mon–Fri 8:00 AM – 5:00 PM';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'INACTIVE'));

-- 2. Link existing St. Jude / Maria Reyna clinic to MRXUH hospital record
UPDATE clinics
SET hospital_id = h.id,
    hospital_name = 'Maria Reyna XU Hospital',
    operating_hours = 'MWF 8:30 AM – 1:30 PM',
    status = 'ACTIVE'
FROM hospitals h
WHERE (clinics.hospital_name ILIKE '%Maria Reyna%' OR clinics.room_number = '304')
  AND h.code = 'MRXUH';

-- 3. Seed / Ensure Consultation Suites for CDO Hospital Network
-- A. Maria Reyna XU Hospital - Room 304 (Pediatrics & Adolescent Care)
INSERT INTO clinics (id, name, hospital_name, building_name, floor_number, room_number, address, city, province, contact_phone, is_verified, operating_hours, status, hospital_id)
SELECT 
    '0c23448c-8fb1-4d2e-a196-1077018a804d'::UUID,
    'Pediatrics & Adolescent Care Suite',
    h.name,
    'Medical Arts Building',
    '3rd Floor',
    'Room 304',
    h.address,
    h.city,
    h.province,
    '+63 (88) 857-4000 loc. 304',
    true,
    'MWF 8:30 AM – 1:30 PM',
    'ACTIVE',
    h.id
FROM hospitals h WHERE h.code = 'MRXUH'
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hospital_name = EXCLUDED.hospital_name,
    building_name = EXCLUDED.building_name,
    floor_number = EXCLUDED.floor_number,
    room_number = EXCLUDED.room_number,
    address = EXCLUDED.address,
    contact_phone = EXCLUDED.contact_phone,
    operating_hours = EXCLUDED.operating_hours,
    status = EXCLUDED.status,
    hospital_id = EXCLUDED.hospital_id;

-- B. Capitol University Medical Center (CUMC) - Suite 402 (Heart Rhythm & Vascular Clinic)
INSERT INTO clinics (id, name, hospital_name, building_name, floor_number, room_number, address, city, province, contact_phone, is_verified, operating_hours, status, hospital_id)
SELECT 
    '1a3b5c7d-9e1f-4a2b-8c3d-5e7f9a1b3c5d'::UUID,
    'Heart Rhythm & Vascular Clinic',
    h.name,
    'Doctors Clinics Complex',
    '4th Floor',
    'Suite 402',
    h.address,
    h.city,
    h.province,
    '+63 (88) 856-4422 loc. 402',
    true,
    'Mon–Sat 9:00 AM – 3:00 PM',
    'ACTIVE',
    h.id
FROM hospitals h WHERE h.code = 'CUMC'
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hospital_name = EXCLUDED.hospital_name,
    building_name = EXCLUDED.building_name,
    floor_number = EXCLUDED.floor_number,
    room_number = EXCLUDED.room_number,
    address = EXCLUDED.address,
    contact_phone = EXCLUDED.contact_phone,
    operating_hours = EXCLUDED.operating_hours,
    status = EXCLUDED.status,
    hospital_id = EXCLUDED.hospital_id;

-- C. Polymedic Medical Plaza - Room 210 (Women & Maternal Health Center)
INSERT INTO clinics (id, name, hospital_name, building_name, floor_number, room_number, address, city, province, contact_phone, is_verified, operating_hours, status, hospital_id)
SELECT 
    '2b4c6d8e-0f2a-4b3c-9d4e-6f8a0b2c4d6e'::UUID,
    'Women & Maternal Health Center',
    h.name,
    'Plaza Tower B',
    '2nd Floor',
    'Room 210',
    h.address,
    h.city,
    h.province,
    '+63 (88) 858-5858 loc. 210',
    true,
    'TThS 1:00 PM – 5:30 PM',
    'ACTIVE',
    h.id
FROM hospitals h WHERE h.code = 'POLYMEDIC_PLAZA'
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hospital_name = EXCLUDED.hospital_name,
    building_name = EXCLUDED.building_name,
    floor_number = EXCLUDED.floor_number,
    room_number = EXCLUDED.room_number,
    address = EXCLUDED.address,
    contact_phone = EXCLUDED.contact_phone,
    operating_hours = EXCLUDED.operating_hours,
    status = EXCLUDED.status,
    hospital_id = EXCLUDED.hospital_id;

-- D. Northern Mindanao Medical Center (NMMC) - OPD Room 1 (Internal Medicine Outpatient Clinic)
INSERT INTO clinics (id, name, hospital_name, building_name, floor_number, room_number, address, city, province, contact_phone, is_verified, operating_hours, status, hospital_id)
SELECT 
    '3c5d7e9f-1a3b-4c4d-0e5f-7a9b1c3d5e7f'::UUID,
    'Internal Medicine Outpatient Clinic',
    h.name,
    'Outpatient Dept Complex',
    'Ground Floor',
    'OPD Room 1',
    h.address,
    h.city,
    h.province,
    '+63 (88) 72-6362',
    true,
    'Mon–Fri 8:00 AM – 4:00 PM',
    'ACTIVE',
    h.id
FROM hospitals h WHERE h.code = 'NMMC'
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hospital_name = EXCLUDED.hospital_name,
    building_name = EXCLUDED.building_name,
    floor_number = EXCLUDED.floor_number,
    room_number = EXCLUDED.room_number,
    address = EXCLUDED.address,
    contact_phone = EXCLUDED.contact_phone,
    operating_hours = EXCLUDED.operating_hours,
    status = EXCLUDED.status,
    hospital_id = EXCLUDED.hospital_id;

-- 4. Ensure unique schedule constraint exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_doctor_clinic_day'
  ) THEN
    ALTER TABLE doctor_clinic_schedules ADD CONSTRAINT unique_doctor_clinic_day UNIQUE (doctor_id, clinic_id, day_of_week, start_time);
  END IF;
END $$;

-- 5. Ensure doctor schedules are linked to their respective clinics
-- Doctor 1: Dr. Maria Santos (Pediatrics/Cardio) -> Room 304
INSERT INTO doctor_clinic_schedules (doctor_id, clinic_id, day_of_week, start_time, end_time, max_patients, is_active)
SELECT 'a4e0ccd5-4d44-4bd8-93bc-e2a4eb9d5f2e'::UUID, '0c23448c-8fb1-4d2e-a196-1077018a804d'::UUID, 1, '08:30:00', '13:30:00', 35, true
WHERE EXISTS (SELECT 1 FROM doctors WHERE id = 'a4e0ccd5-4d44-4bd8-93bc-e2a4eb9d5f2e')
ON CONFLICT (doctor_id, clinic_id, day_of_week, start_time) DO NOTHING;

-- Doctor 2: Dr. Fatima Al-Hassan (OB-GYN) -> Room 210
INSERT INTO doctor_clinic_schedules (doctor_id, clinic_id, day_of_week, start_time, end_time, max_patients, is_active)
SELECT '362a15bf-f8ca-40a6-b293-055b3f2c9eb7'::UUID, '2b4c6d8e-0f2a-4b3c-9d4e-6f8a0b2c4d6e'::UUID, 2, '13:00:00', '17:30:00', 30, true
WHERE EXISTS (SELECT 1 FROM doctors WHERE id = '362a15bf-f8ca-40a6-b293-055b3f2c9eb7')
ON CONFLICT (doctor_id, clinic_id, day_of_week, start_time) DO NOTHING;

-- Doctor 3: Dr. Kenneth O. Tan (Internal Medicine) -> OPD Room 1
INSERT INTO doctor_clinic_schedules (doctor_id, clinic_id, day_of_week, start_time, end_time, max_patients, is_active)
SELECT 'd3128bef-ac02-4268-8265-5c0eab5405ec'::UUID, '3c5d7e9f-1a3b-4c4d-0e5f-7a9b1c3d5e7f'::UUID, 1, '08:00:00', '16:00:00', 50, true
WHERE EXISTS (SELECT 1 FROM doctors WHERE id = 'd3128bef-ac02-4268-8265-5c0eab5405ec')
ON CONFLICT (doctor_id, clinic_id, day_of_week, start_time) DO NOTHING;

-- Doctor 4: Dr. Juan Carlos Reyes (Cardiology) -> Suite 402
INSERT INTO doctor_clinic_schedules (doctor_id, clinic_id, day_of_week, start_time, end_time, max_patients, is_active)
SELECT 'c9514309-b9b2-499c-9e83-7b7bf877471b'::UUID, '1a3b5c7d-9e1f-4a2b-8c3d-5e7f9a1b3c5d'::UUID, 1, '09:00:00', '15:00:00', 40, true
WHERE EXISTS (SELECT 1 FROM doctors WHERE id = 'c9514309-b9b2-499c-9e83-7b7bf877471b')
ON CONFLICT (doctor_id, clinic_id, day_of_week, start_time) DO NOTHING;
