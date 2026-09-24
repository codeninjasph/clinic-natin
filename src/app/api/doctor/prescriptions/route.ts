import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { SemaphoreService } from '@/lib/sms/semaphore';

/**
 * POST /api/doctor/prescriptions
 *
 * Saves Rx line items and diagnostic requests into `prescriptions_lab_requests`.
 * Auto-resolves or creates the medical_records row for the appointment.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, patientId, items } = body as {
      appointmentId?: string | null;
      patientId?: string | null;
      items: {
        itemType?: 'MEDICATION' | 'LAB_TEST' | 'IMAGING';
        genericName: string;
        brandName?: string;
        dosage?: string;
        frequency?: string;
        duration?: string;
        quantity?: number;
        instructions?: string;
        details?: string;
        isS2?: boolean;
      }[];
    };

    if ((!appointmentId && !patientId) || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'appointmentId or patientId and at least one item are required.' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    let resolvedAppointmentId: string | null = appointmentId || null;
    let resolvedPatientId: string | null = patientId || null;
    let doctorId: string | null = null;
    let walkInPhone: string | null = null;

    // ── 1. If appointmentId is provided, resolve through appointment ─────────
    if (resolvedAppointmentId) {
      const { data: appt, error: apptErr } = await supabase
        .from('appointments')
        .select('queue_session_id, patient_id, walk_in_phone')
        .eq('id', resolvedAppointmentId)
        .maybeSingle();

      if (appt) {
        walkInPhone = appt.walk_in_phone;
        if (!resolvedPatientId) resolvedPatientId = appt.patient_id;

        if (appt.queue_session_id) {
          const { data: session } = await supabase
            .from('queue_sessions')
            .select('doctor_id')
            .eq('id', appt.queue_session_id)
            .maybeSingle();
          doctorId = session?.doctor_id || null;
        }
      }
    }

    // ── 2. If no appointmentId, check if patient has an active appointment today
    if (!resolvedAppointmentId && resolvedPatientId) {
      const { data: activeAppt } = await supabase
        .from('appointments')
        .select('id, queue_session_id, walk_in_phone')
        .eq('patient_id', resolvedPatientId)
        .in('status', ['SERVING', 'CALLED', 'WAITING', 'BUFFERED', 'BOOKED'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeAppt) {
        resolvedAppointmentId = activeAppt.id;
        walkInPhone = activeAppt.walk_in_phone;
        if (activeAppt.queue_session_id) {
          const { data: session } = await supabase
            .from('queue_sessions')
            .select('doctor_id')
            .eq('id', activeAppt.queue_session_id)
            .maybeSingle();
          doctorId = session?.doctor_id || null;
        }
      }
    }

    // ── 3. Resolve doctorId if not yet resolved ──────────────────────────────
    if (!doctorId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: doc } = await supabase
          .from('doctors')
          .select('id')
          .eq('profile_id', user.id)
          .maybeSingle();
        doctorId = doc?.id || null;
      }
    }

    if (!doctorId) {
      // Fallback to first doctor
      const { data: firstDoc } = await supabase.from('doctors').select('id').limit(1).maybeSingle();
      doctorId = firstDoc?.id || null;
    }

    if (!doctorId) {
      return NextResponse.json(
        { error: 'Cannot create prescriptions: doctor reference could not be determined.' },
        { status: 422 }
      );
    }

    // ── 4. Find or create medical_records row ─────────────────────────────────
    let medRecord: { id: string } | null = null;

    if (resolvedAppointmentId) {
      const { data: existingRecord } = await supabase
        .from('medical_records')
        .select('id')
        .eq('appointment_id', resolvedAppointmentId)
        .maybeSingle();

      if (existingRecord) {
        medRecord = existingRecord;
      } else {
        const { data: newRecord, error: createErr } = await supabase
          .from('medical_records')
          .insert({
            appointment_id: resolvedAppointmentId,
            patient_id: resolvedPatientId,
            doctor_id: doctorId,
            chief_complaint: 'Consultation & Digital Prescription',
            diagnosis: 'Clinical Consultation',
          })
          .select('id')
          .single();

        if (createErr || !newRecord) {
          return NextResponse.json(
            { error: 'Failed to create medical record draft.', detail: createErr?.message },
            { status: 500 }
          );
        }
        medRecord = newRecord;
      }
    } else if (resolvedPatientId) {
      // Standalone prescription directly linked to patient
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: existingStandalone } = await supabase
        .from('medical_records')
        .select('id')
        .eq('patient_id', resolvedPatientId)
        .is('appointment_id', null)
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingStandalone) {
        medRecord = existingStandalone;
      } else {
        const { data: newRecord, error: createErr } = await supabase
          .from('medical_records')
          .insert({
            patient_id: resolvedPatientId,
            doctor_id: doctorId,
            appointment_id: null,
            chief_complaint: 'Prescription Issuance / Refill',
            diagnosis: 'Clinical Prescription Issuance',
          })
          .select('id')
          .single();

        if (createErr || !newRecord) {
          return NextResponse.json(
            { error: 'Failed to create standalone medical record.', detail: createErr?.message },
            { status: 500 }
          );
        }
        medRecord = newRecord;
      }
    }

    if (!medRecord) {
      return NextResponse.json(
        { error: 'Could not associate medical record with appointment or patient.' },
        { status: 400 }
      );
    }

    const medicalRecordId = medRecord.id;

    // ── Delete existing prescriptions for this record (replace strategy) ──────
    await supabase
      .from('prescriptions_lab_requests')
      .delete()
      .eq('medical_record_id', medicalRecordId);

    // ── Insert new prescription items ─────────────────────────────────────────
    const prescriptionRows = items.map((item) => ({
      medical_record_id: medicalRecordId,
      item_type: item.itemType || ('MEDICATION' as const),
      generic_name: item.genericName,
      brand_name: item.brandName || null,
      dosage: item.dosage || null,
      frequency: item.frequency || null,
      duration: item.duration || null,
      details:
        item.details ||
        (item.quantity ? `Qty: #${item.quantity}` : null) ||
        item.instructions ||
        item.dosage ||
        'Take as directed',
      instructions: item.instructions || null,
      is_digital_copy_sent: !!body.pushToPatient,
    }));

    const { data: savedPrescriptions, error: rxErr } = await supabase
      .from('prescriptions_lab_requests')
      .insert(prescriptionRows)
      .select('id, generic_name, item_type');

    if (rxErr) {
      return NextResponse.json(
        { error: 'Failed to save prescriptions.', detail: rxErr.message },
        { status: 500 }
      );
    }

    // ── If pushToPatient requested, dispatch Semaphore SMS to patient ────────
    let smsDispatched = false;
    if (body.pushToPatient && resolvedPatientId) {
      try {
        const { data: patientProfile } = await supabase
          .from('profiles')
          .select('phone_number, full_name')
          .eq('id', resolvedPatientId)
          .maybeSingle();

        const phone = patientProfile?.phone_number || walkInPhone;
        if (phone) {
          await SemaphoreService.sendSMS({
            phoneNumber: phone,
            message: `[Clinic Natin] Your digital consultation orders (Rx / Lab Requests) are ready. Access your official digital passport: https://clinicnatin.ph/passport`,
            notificationType: 'SLOT_CONFIRMED',
            appointmentId: resolvedAppointmentId || undefined,
          });
          smsDispatched = true;
        }
      } catch (smsErr) {
        console.warn('[prescriptions] Failed to dispatch push SMS:', smsErr);
      }
    }

    return NextResponse.json({
      ok: true,
      medicalRecordId,
      prescriptionCount: savedPrescriptions?.length ?? 0,
      smsDispatched,
      message: `${savedPrescriptions?.length ?? 0} item(s) saved to Supabase.${smsDispatched ? ' Digital copy pushed via SMS.' : ''}`,
    });
  } catch (err) {
    console.error('[prescriptions] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * GET /api/doctor/prescriptions?appointmentId=xxx OR ?patientId=yyy
 *
 * Returns existing prescriptions and lab requests for an appointment or patient.
 */
export async function GET(req: NextRequest) {
  const appointmentId = req.nextUrl.searchParams.get('appointmentId');
  const patientId = req.nextUrl.searchParams.get('patientId');

  if (!appointmentId && !patientId) {
    return NextResponse.json(
      { error: 'appointmentId or patientId query param required.' },
      { status: 400 }
    );
  }

  const supabase = await createServerClient();

  let medRecord: { id: string } | null = null;

  if (appointmentId) {
    const { data } = await supabase
      .from('medical_records')
      .select('id')
      .eq('appointment_id', appointmentId)
      .maybeSingle();
    medRecord = data;
  } else if (patientId) {
    const { data } = await supabase
      .from('medical_records')
      .select('id')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    medRecord = data;
  }

  if (!medRecord) {
    return NextResponse.json({ prescriptions: [] });
  }

  const { data: prescriptions, error } = await supabase
    .from('prescriptions_lab_requests')
    .select('id, item_type, generic_name, brand_name, dosage, frequency, duration, details, instructions, created_at')
    .eq('medical_record_id', medRecord.id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prescriptions: prescriptions ?? [] });
}
