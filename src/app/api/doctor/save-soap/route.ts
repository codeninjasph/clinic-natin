import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      appointmentId,
      patientId,
      chiefComplaint,
      hpi,
      physicalExam,
      diagnoses,
      plan,
      nonPharmPlan,
      followupDate,
      icd10Code,
    } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'appointmentId is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // ── Resolve doctor_id from the queue session linked to this appointment ──
    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .select('queue_session_id, patient_id')
      .eq('id', appointmentId)
      .single();

    if (apptErr || !appt) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    let doctorId: string | null = null;
    if (appt.queue_session_id) {
      const { data: queueSession } = await supabase
        .from('queue_sessions')
        .select('doctor_id')
        .eq('id', appt.queue_session_id)
        .maybeSingle();
      doctorId = queueSession?.doctor_id || null;
    }

    if (!doctorId) {
      const { data: firstDoc } = await supabase.from('doctors').select('id').limit(1).maybeSingle();
      doctorId = firstDoc?.id || null;
    }

    const resolvedPatientId = patientId || appt.patient_id;

    // ── Format diagnosis text & structured private_notes ──────────────────────
    const diagnosisText = Array.isArray(diagnoses) && diagnoses.length > 0
      ? diagnoses.map((d: { code: string; label: string }) => `${d.code} — ${d.label}`).join('\n')
      : null;

    const notesParts: string[] = [];
    if (hpi) notesParts.push(`[HPI]\n${hpi}`);
    if (physicalExam) {
      const peEntries = Object.entries(physicalExam)
        .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
        .map(([k, v]) => `${k.toUpperCase()}: ${v}`);
      if (peEntries.length > 0) {
        notesParts.push(`[PHYSICAL EXAM]\n${peEntries.join('\n')}`);
      }
    }
    if (plan) notesParts.push(`[PHARMACOLOGICAL PLAN (Rx)]\n${plan}`);
    if (nonPharmPlan) notesParts.push(`[NON-PHARMACOLOGICAL / DIET ADVICE]\n${nonPharmPlan}`);

    const privateNotes = notesParts.join('\n\n');

    // ── Upsert medical_records (appointment_id UNIQUE constraint) ─────────────
    const { data: record, error: upsertErr } = await supabase
      .from('medical_records')
      .upsert(
        {
          appointment_id: appointmentId,
          patient_id: resolvedPatientId,
          doctor_id: doctorId,
          chief_complaint: chiefComplaint || null,
          diagnosis: diagnosisText,
          icd10_code: icd10Code || (Array.isArray(diagnoses) ? diagnoses[0]?.code : null) || null,
          private_notes: privateNotes || null,
          followup_date: followupDate || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'appointment_id',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (upsertErr) {
      console.error('[save-soap] Upsert error:', upsertErr);
      return NextResponse.json(
        { error: 'Failed to save consultation record', detail: upsertErr.message },
        { status: 500 }
      );
    }

    // ── Auto-generate digital prescriptions from Pharmacological Plan (Rx) ──────
    let prescriptionCount = 0;
    if (record?.id && plan && typeof plan === 'string' && plan.trim()) {
      try {
        const lines = plan
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0);

        const rxRows = lines.map((line: string) => {
          const cleaned = line.replace(/^(\d+[\.\)]|\-|\*|•)\s*/, '').trim();
          let qty: string | null = null;
          const qtyMatch = cleaned.match(/(?:#|qty:?\s*|quantity:?\s*)(\d+)/i);
          if (qtyMatch) qty = qtyMatch[1];

          const parts = cleaned.split(/\s*[-—–]\s*/);
          const medPart = parts[0] || cleaned;
          const sigPart = parts.slice(1).join(' — ') || 'Take as directed';

          const medWords = medPart.split(/\s+/);
          const genericName = medWords[0] || 'Medication';
          const dosage = medWords.slice(1).join(' ') || '';

          return {
            medical_record_id: record.id,
            item_type: 'MEDICATION' as const,
            generic_name: genericName,
            dosage: dosage || null,
            details: qty ? `Qty: #${qty}` : (sigPart || 'Take as directed'),
            instructions: sigPart,
            frequency: sigPart.match(/(OD|BID|TID|QID|Q\d+h|HS|PRN|daily|twice|thrice)/i)?.[0] || 'As directed',
            duration: sigPart.match(/(\d+\s*(days|weeks|months|d|w|m))/i)?.[0] || 'Until finished',
            is_digital_copy_sent: false,
          };
        });

        if (rxRows.length > 0) {
          const { data: existingRx } = await supabase
            .from('prescriptions_lab_requests')
            .select('id')
            .eq('medical_record_id', record.id)
            .limit(1);

          if (!existingRx || existingRx.length === 0) {
            const { data: insertedRx } = await supabase
              .from('prescriptions_lab_requests')
              .insert(rxRows)
              .select('id');
            prescriptionCount = insertedRx?.length || 0;
          }
        }
      } catch (rxErr) {
        console.warn('[save-soap] Could not auto-generate prescriptions from plan:', rxErr);
      }
    }

    return NextResponse.json({
      ok: true,
      medicalRecordId: record?.id,
      prescriptionCount,
      message: 'Consultation SOAP note and digital prescriptions saved successfully.',
    });
  } catch (err) {
    console.error('[save-soap] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
