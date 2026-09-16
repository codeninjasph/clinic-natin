-- ============================================================================
-- 🩺 CLINIC NATIN — COMMUNICATIONS & SEMAPHORE SMS GATEWAY OVERHAUL
-- Migration: 20260916_communications_overhaul.sql
-- ============================================================================

-- 1. Expand Enums
DO $$ BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'EMERGENCY_BROADCAST';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'HOSPITAL_ANNOUNCEMENT';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ADMIN_DIRECT_SMS';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'CLINIC_CANCELLED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'BUFFERED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Alter notification_logs
ALTER TABLE notification_logs ALTER COLUMN appointment_id DROP NOT NULL;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS latency_ms INT DEFAULT 0;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS telco_carrier TEXT DEFAULT 'GLOBE';
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS hospital_name TEXT;

-- 3. Create broadcast_announcements table
CREATE TABLE IF NOT EXISTS broadcast_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    hospital_name TEXT NOT NULL,
    title TEXT NOT NULL,
    message_body TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'INFO',
    target_filter TEXT NOT NULL DEFAULT 'ALL',
    recipient_count INT NOT NULL DEFAULT 0,
    delivered_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    dispatched_by TEXT DEFAULT 'Admin Operations',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    template_body TEXT NOT NULL,
    description TEXT,
    available_variables TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Row Level Security Policies
ALTER TABLE broadcast_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read broadcast_announcements" ON broadcast_announcements;
CREATE POLICY "Allow read broadcast_announcements" ON broadcast_announcements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert broadcast_announcements" ON broadcast_announcements;
CREATE POLICY "Allow insert broadcast_announcements" ON broadcast_announcements FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update broadcast_announcements" ON broadcast_announcements;
CREATE POLICY "Allow update broadcast_announcements" ON broadcast_announcements FOR UPDATE USING (true);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read notification_templates" ON notification_templates;
CREATE POLICY "Allow read notification_templates" ON notification_templates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert notification_templates" ON notification_templates;
CREATE POLICY "Allow insert notification_templates" ON notification_templates FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update notification_templates" ON notification_templates;
CREATE POLICY "Allow update notification_templates" ON notification_templates FOR UPDATE USING (true);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all notification_logs" ON notification_logs;
CREATE POLICY "Allow all notification_logs" ON notification_logs FOR ALL USING (true);
