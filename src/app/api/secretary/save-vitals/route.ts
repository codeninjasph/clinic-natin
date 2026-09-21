import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, vitals, chiefComplaint, doctorId, patientId } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // 1. Fetch appointment info to resolve doctor and patient
    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .select('id, patient_id, queue_session_id, queue_sessions:queue_session_id(doctor_id)')
      .eq('id', appointmentId)
      .maybeSingle();

    if (apptErr) {
      console.error('[save-vitals] Error fetching appointment:', apptErr);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionDocId = (appt as any)?.queue_sessions?.doctor_id;
    let resolvedDoctorId = doctorId || sessionDocId;

    if (!resolvedDoctorId) {
      const { data: firstDoc } = await supabase.from('doctors').select('id').limit(1).maybeSingle();
      resolvedDoctorId = firstDoc?.id;
    }

    let resolvedPatientId = patientId || appt?.patient_id;
    if (!resolvedPatientId) {
      const { data: firstProfile } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
      resolvedPatientId = firstProfile?.id || null;
    }

    if (!resolvedDoctorId) {
      return NextResponse.json({ error: 'Missing physician reference for medical record.' }, { status: 400 });
    }

    // 2. Check if medical record already exists
    const { data: existingRec } = await supabase
      .from('medical_records')
      .select('id')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    let recordId = existingRec?.id;

    if (existingRec) {
      const { data: updated, error: updateErr } = await supabase
        .from('medical_records')
        .update({
          vitals: vitals || {},
          chief_complaint: chiefComplaint || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRec.id)
        .select('id')
        .single();

      if (updateErr) {
        console.error('[save-vitals] Update error:', updateErr);
        return NextResponse.json({ error: 'Failed to update vitals', detail: updateErr.message }, { status: 500 });
      }
      recordId = updated.id;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('medical_records')
        .insert({
          appointment_id: appointmentId,
          doctor_id: resolvedDoctorId,
          patient_id: resolvedPatientId,
          vitals: vitals || {},
          chief_complaint: chiefComplaint || null,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('[save-vitals] Insert error:', insertErr);
        return NextResponse.json({ error: 'Failed to insert vitals', detail: insertErr.message }, { status: 500 });
      }
      recordId = inserted.id;
    }

    return NextResponse.json({
      ok: true,
      medicalRecordId: recordId,
      message: 'Vitals and pre-triage recorded successfully.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[save-vitals] Unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
