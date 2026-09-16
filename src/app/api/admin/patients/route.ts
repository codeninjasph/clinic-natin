import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// ============================================================
// GET /api/admin/patients
// Paginated list of all profiles + single profile detail.
// Query params:
//   id        – single profile UUID lookup
//   page      – 1-indexed page number (default 1)
//   limit     – records per page (default 50, max 100)
//   role      – ALL | PATIENT | DOCTOR | SECRETARY | ADMIN
//   priority  – ALL | SENIOR | PWD | PREGNANT | NONE
//   search    – name / email / phone substring
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    // ── Single profile detail lookup ─────────────────────────
    if (id) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          id, auth_id, role, full_name, phone_number, email, avatar_url,
          date_of_birth, gender, blood_type, weight_kg, height_cm,
          allergies, comorbidities, maintenance_meds,
          priority_category, priority_id_number,
          hmo_provider, hmo_card_number, philhealth_number,
          emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
          is_onboarding_completed, confidentiality_agreed_at,
          suspended_at, suspension_reason,
          created_at, updated_at
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

      // Last 20 appointments for the drawer
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id, queue_number, token_code, status, priority_category,
          booking_channel, consultation_fee, platform_payment_status,
          created_at, called_at, completed_at,
          queue_sessions (
            session_date, status, clinic_id, doctor_id,
            clinics ( id, name, hospital_name, room_number ),
            doctors ( id, title, specialty, profiles ( full_name ) )
          )
        `)
        .eq('patient_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Doctor metadata
      let doctorMeta = null;
      if (profile.role === 'DOCTOR') {
        const { data } = await supabase
          .from('doctors')
          .select('id, title, specialty, subspecialty, prc_license, ptr_number, s2_license, consultation_fee_default, subscription_tier, pro_tier_active, is_verified, created_at')
          .eq('profile_id', id)
          .maybeSingle();
        doctorMeta = data;
      }

      // Secretary metadata
      let secretaryMeta = null;
      if (profile.role === 'SECRETARY') {
        const { data } = await supabase
          .from('secretaries')
          .select(`
            id, is_active, hired_at, terminated_at,
            doctors ( id, title, specialty, profiles ( full_name ) )
          `)
          .eq('profile_id', id)
          .maybeSingle();
        secretaryMeta = data;
      }

      // Last 15 audit log entries for this profile (Gap #5)
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('id, action, table_affected, old_data, new_data, timestamp, performed_by')
        .eq('record_id', id)
        .order('timestamp', { ascending: false })
        .limit(15);

      return NextResponse.json({
        profile,
        appointments: appointments || [],
        doctorMeta,
        secretaryMeta,
        auditLogs: auditLogs || [],
      });
    }

    // ── Paginated list ────────────────────────────────────────
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
    const offset = (page - 1) * limit;

    const roleFilter = searchParams.get('role') || 'ALL';
    const priorityFilter = searchParams.get('priority') || 'ALL';
    const search = searchParams.get('search')?.trim() || '';

    let query = supabase
      .from('profiles')
      .select(
        `id, role, full_name, phone_number, email, avatar_url,
         priority_category, is_onboarding_completed,
         confidentiality_agreed_at, created_at,
         date_of_birth, gender, blood_type,
         hmo_provider, philhealth_number,
         suspended_at, suspension_reason`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (roleFilter !== 'ALL') query = query.eq('role', roleFilter);
    if (priorityFilter !== 'ALL') query = query.eq('priority_category', priorityFilter);
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`
      );
    }

    const { data: profiles, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Appointment count per patient (batch)
    const profileIds = (profiles || []).map((p: any) => p.id);
    const appointmentCounts: Record<string, number> = {};
    if (profileIds.length > 0) {
      const { data: apptData } = await supabase
        .from('appointments')
        .select('patient_id')
        .in('patient_id', profileIds);
      (apptData || []).forEach((a: any) => {
        appointmentCounts[a.patient_id] = (appointmentCounts[a.patient_id] || 0) + 1;
      });
    }

    // Derive account_status: ANONYMIZED | SUSPENDED | ACTIVE
    const enriched = (profiles || []).map((p: any) => ({
      ...p,
      account_status:
        p.full_name?.startsWith('Anonymized') || p.email?.endsWith('@privacy.gov.ph')
          ? 'ANONYMIZED'
          : p.suspended_at
          ? 'SUSPENDED'
          : 'ACTIVE',
      lifetime_appointments: appointmentCounts[p.id] || 0,
    }));

    // KPIs (parallel counts — each result is safely extracted with fallback)
    const kpiResults = await Promise.allSettled([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'PATIENT'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'PATIENT').eq('priority_category', 'SENIOR'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'PATIENT').eq('priority_category', 'PWD'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'PATIENT').eq('priority_category', 'PREGNANT'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'PATIENT').eq('is_onboarding_completed', false),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).not('suspended_at', 'is', null),
    ]);

    const safeCount = (result: PromiseSettledResult<any>): number =>
      result.status === 'fulfilled' ? (result.value.count ?? 0) : 0;

    const [totalPatients, seniorCount, pwdCount, pregnantCount, incompleteOnboarding, totalAll, suspendedCount] =
      kpiResults.map(safeCount);

    return NextResponse.json({
      profiles: enriched,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      kpis: {
        totalAll,
        totalPatients,
        seniorCount,
        pwdCount,
        pregnantCount,
        priorityTotal: seniorCount + pwdCount + pregnantCount,
        incompleteOnboarding,
        suspendedCount,
      },
    });
  } catch (err: any) {
    console.error('GET /api/admin/patients error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// ============================================================
// PATCH /api/admin/patients
// Dispatches on `action` field. Legacy (no action) = priority update.
//
// Actions:
//   (none)               – { id, priorityCategory }         legacy priority update
//   CHANGE_ROLE          – { id, action, role }             Gap #1
//   SUSPEND              – { id, action, reason }           Gap #2
//   REACTIVATE           – { id, action }                   Gap #2
//   SET_DOCTOR_VERIFIED  – { id, action, doctorId, isVerified } Gap #6
// ============================================================
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action } = body;

    if (!id) return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });

    const supabase = await createServerClient();

    // ── Legacy: priority category update ────────────────────
    if (!action) {
      const { priorityCategory } = body;
      if (!priorityCategory) return NextResponse.json({ error: 'priorityCategory is required' }, { status: 400 });

      const { data: existing } = await supabase
        .from('profiles')
        .select('id, full_name, priority_category')
        .eq('id', id)
        .single();

      if (!existing) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

      const { data: updated, error } = await supabase
        .from('profiles')
        .update({ priority_category: priorityCategory, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await supabase.from('audit_logs').insert({
        table_affected: 'profiles',
        record_id: id,
        action: 'UPDATE',
        old_data: { priority_category: existing.priority_category },
        new_data: { priority_category: priorityCategory },
      });

      return NextResponse.json({ success: true, profile: updated });
    }

    // ── Gap #1: Role Change ──────────────────────────────────
    if (action === 'CHANGE_ROLE') {
      const { role: newRole } = body;
      const VALID_ROLES = ['PATIENT', 'DOCTOR', 'SECRETARY', 'ADMIN'];
      if (!newRole || !VALID_ROLES.includes(newRole)) {
        return NextResponse.json({ error: 'Invalid role value.' }, { status: 400 });
      }

      const { data: existing } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', id)
        .single();

      if (!existing) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

      // Guard: promoting to DOCTOR requires an existing doctors row
      if (newRole === 'DOCTOR') {
        const { data: doctorRow } = await supabase
          .from('doctors')
          .select('id')
          .eq('profile_id', id)
          .maybeSingle();
        if (!doctorRow) {
          return NextResponse.json(
            { error: 'Cannot promote to DOCTOR: no doctors record exists for this profile. Create a doctor record first.' },
            { status: 422 }
          );
        }
      }

      const { data: updated, error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await supabase.from('audit_logs').insert({
        table_affected: 'profiles',
        record_id: id,
        action: 'UPDATE',
        old_data: { role: existing.role },
        new_data: { role: newRole, changed_by: 'admin', reason: 'Admin role change' },
      });

      return NextResponse.json({ success: true, profile: updated });
    }

    // ── Gap #2: Suspend ──────────────────────────────────────
    if (action === 'SUSPEND') {
      const { reason } = body;
      if (!reason?.trim()) {
        return NextResponse.json({ error: 'A suspension reason is required.' }, { status: 400 });
      }

      const { data: existing } = await supabase
        .from('profiles')
        .select('id, full_name, suspended_at, role')
        .eq('id', id)
        .single();

      if (!existing) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      if (existing.full_name?.startsWith('Anonymized')) {
        return NextResponse.json({ error: 'Cannot suspend an anonymized account.' }, { status: 400 });
      }
      if (existing.suspended_at) {
        return NextResponse.json({ error: 'Account is already suspended.' }, { status: 400 });
      }

      const suspendedAt = new Date().toISOString();
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({ suspended_at: suspendedAt, suspension_reason: reason.trim(), updated_at: suspendedAt })
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await supabase.from('audit_logs').insert({
        table_affected: 'profiles',
        record_id: id,
        action: 'UPDATE',
        old_data: { suspended_at: null },
        new_data: { suspended_at: suspendedAt, suspension_reason: reason.trim() },
      });

      return NextResponse.json({ success: true, profile: updated });
    }

    // ── Gap #2: Reactivate ───────────────────────────────────
    if (action === 'REACTIVATE') {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, full_name, suspended_at, suspension_reason')
        .eq('id', id)
        .single();

      if (!existing) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      if (!existing.suspended_at) {
        return NextResponse.json({ error: 'Account is not currently suspended.' }, { status: 400 });
      }

      const { data: updated, error } = await supabase
        .from('profiles')
        .update({ suspended_at: null, suspension_reason: null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await supabase.from('audit_logs').insert({
        table_affected: 'profiles',
        record_id: id,
        action: 'UPDATE',
        old_data: { suspended_at: existing.suspended_at, suspension_reason: existing.suspension_reason },
        new_data: { suspended_at: null, suspension_reason: null, reactivated_at: new Date().toISOString() },
      });

      return NextResponse.json({ success: true, profile: updated });
    }

    // ── Gap #6: Doctor Verification Toggle ───────────────────
    if (action === 'SET_DOCTOR_VERIFIED') {
      const { doctorId, isVerified } = body;
      if (!doctorId) return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
      if (typeof isVerified !== 'boolean') return NextResponse.json({ error: 'isVerified must be a boolean' }, { status: 400 });

      const { data: existing } = await supabase
        .from('doctors')
        .select('id, is_verified, profile_id')
        .eq('id', doctorId)
        .maybeSingle();

      if (!existing) return NextResponse.json({ error: 'Doctor record not found' }, { status: 404 });

      const { data: updated, error } = await supabase
        .from('doctors')
        .update({ is_verified: isVerified })
        .eq('id', doctorId)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await supabase.from('audit_logs').insert({
        table_affected: 'doctors',
        record_id: existing.profile_id,
        action: 'UPDATE',
        old_data: { is_verified: existing.is_verified },
        new_data: {
          is_verified: isVerified,
          changed_by: 'admin',
          reason: isVerified ? 'Admin granted verification' : 'Admin revoked verification',
        },
      });

      return NextResponse.json({ success: true, doctor: updated });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('PATCH /api/admin/patients error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
