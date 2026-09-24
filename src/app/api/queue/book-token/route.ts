import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { PayMongoService } from '@/lib/payments/paymongo';
import { SemaphoreService } from '@/lib/sms/semaphore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      doctorId,
      clinicId,
      scheduleId,
      patientId,
      dependentId,
      priorityCategory = 'NONE',
      priorityIdNumber,
      chiefComplaint,
      paymentChannel = 'QRPH',
    } = body;

    if (!doctorId || !clinicId || !patientId) {
      return NextResponse.json(
        { error: 'doctorId, clinicId, and patientId are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // 1. Fetch patient details
    const { data: patient, error: patientErr } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, email')
      .eq('id', patientId)
      .single();

    if (patientErr || !patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    // 1b. Fetch dependent if specified
    let bookingName = patient.full_name;
    let effectivePriority = priorityCategory;
    let effectivePriorityId = priorityIdNumber;

    if (dependentId) {
      const { data: dep } = await supabase
        .from('patient_dependents')
        .select('*')
        .eq('id', dependentId)
        .maybeSingle();

      if (dep) {
        bookingName = `${dep.full_name} (${dep.relationship})`;
        if (dep.priority_category && dep.priority_category !== 'NONE') {
          effectivePriority = dep.priority_category;
          effectivePriorityId = dep.priority_id_number || effectivePriorityId;
        }
      }
    }

    // 2. Fetch doctor & clinic info
    const { data: doctor } = await supabase
      .from('doctors')
      .select('id, title, specialty, consultation_fee_default, profiles(full_name)')
      .eq('id', doctorId)
      .single();

    // 3. Resolve active or today's queue session with robust clinic UUID resolution
    const todayStr = new Date().toISOString().split('T')[0];

    let effectiveClinicId = clinicId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId);
    if (!isUUID) {
      if (clinicId === 'clinic-mr-304') {
        effectiveClinicId = '0c23448c-8fb1-4d2e-a196-1077018a804d';
      } else if (clinicId === 'clinic-poly-210') {
        effectiveClinicId = '2b4c6d8e-0f2a-4b3c-9d4e-6f8a0b2c4d6e';
      } else if (clinicId === 'clinic-cumc-402') {
        effectiveClinicId = '1a3b5c7d-9e1f-4a2b-8c3d-5e7f9a1b3c5d';
      } else if (clinicId === 'clinic-nmmc-opd1') {
        effectiveClinicId = '3c5d7e9f-1a3b-4c4d-0e5f-7a9b1c3d5e7f';
      } else {
        const { data: docSched } = await supabase
          .from('doctor_clinic_schedules')
          .select('clinic_id')
          .eq('doctor_id', doctorId)
          .limit(1)
          .maybeSingle();
        if (docSched?.clinic_id) {
          effectiveClinicId = docSched.clinic_id;
        }
      }
    }

    // 3b. Verify clinic maintenance/inactive status
    const { data: clinicRecord } = await supabase
      .from('clinics')
      .select('id, name, hospital_name, room_number, status')
      .eq('id', effectiveClinicId)
      .maybeSingle();

    if (clinicRecord) {
      if (clinicRecord.status === 'MAINTENANCE') {
        return NextResponse.json(
          {
            error: `Clinic room ${clinicRecord.room_number || clinicRecord.name} at ${clinicRecord.hospital_name || 'the facility'} is currently under maintenance. Online queue booking is temporarily suspended.`,
          },
          { status: 422 }
        );
      }
      if (clinicRecord.status === 'INACTIVE') {
        return NextResponse.json(
          {
            error: `Clinic room ${clinicRecord.room_number || clinicRecord.name} is currently inactive. Online queue booking is unavailable.`,
          },
          { status: 422 }
        );
      }
    }

    let targetSession: { id: string; current_serving_number: number } | null = null;

    // Try finding existing queue session for today
    const { data: existingSession } = await supabase
      .from('queue_sessions')
      .select('id, current_serving_number, status')
      .eq('doctor_id', doctorId)
      .eq('clinic_id', effectiveClinicId)
      .eq('session_date', todayStr)
      .maybeSingle();

    if (existingSession) {
      targetSession = existingSession;
    } else {
      // Find a matching schedule
      let resolvedSchedId = scheduleId;
      if (!resolvedSchedId) {
        const { data: sched } = await supabase
          .from('doctor_clinic_schedules')
          .select('id, clinic_id')
          .eq('doctor_id', doctorId)
          .eq('clinic_id', effectiveClinicId)
          .limit(1)
          .maybeSingle();
        resolvedSchedId = sched?.id;
      }

      if (!resolvedSchedId) {
        // Fallback: check any schedule for this doctor
        const { data: anySched } = await supabase
          .from('doctor_clinic_schedules')
          .select('id, clinic_id')
          .eq('doctor_id', doctorId)
          .limit(1)
          .maybeSingle();
        resolvedSchedId = anySched?.id;
        if (anySched?.clinic_id) {
          effectiveClinicId = anySched.clinic_id;
        }
      }

      if (resolvedSchedId) {
        const { data: newSession, error: createSessionErr } = await supabase
          .from('queue_sessions')
          .insert({
            schedule_id: resolvedSchedId,
            doctor_id: doctorId,
            clinic_id: effectiveClinicId,
            session_date: todayStr,
            status: 'ACTIVE',
            current_serving_number: 1,
            accepting_online: true,
            accepting_walkins: true,
          })
          .select('id, current_serving_number')
          .single();

        if (!createSessionErr && newSession) {
          targetSession = newSession;
        } else {
          // If already exists under unique constraint
          const { data: retrySession } = await supabase
            .from('queue_sessions')
            .select('id, current_serving_number, status')
            .eq('schedule_id', resolvedSchedId)
            .eq('session_date', todayStr)
            .maybeSingle();
          if (retrySession) {
            targetSession = retrySession;
          }
        }
      }
    }

    if (!targetSession) {
      return NextResponse.json(
        { error: 'Unable to initialize queue session for this clinic room today' },
        { status: 500 }
      );
    }

    // 4. Interleaved Fair Queueing Engine: Online bookings receive strictly ODD numbers (1, 3, 5, 7...)
    const { data: existingOnlineAppts } = await supabase
      .from('appointments')
      .select('queue_number')
      .eq('queue_session_id', targetSession.id)
      .eq('booking_channel', 'ONLINE')
      .order('queue_number', { ascending: false })
      .limit(1);

    let nextOddNumber = 1;
    if (existingOnlineAppts && existingOnlineAppts.length > 0) {
      const highestOdd = existingOnlineAppts[0].queue_number;
      nextOddNumber = highestOdd % 2 === 1 ? highestOdd + 2 : highestOdd + 1;
    }

    const tokenCode = `CN-ON${String(nextOddNumber).padStart(3, '0')}`;

    // 5. Insert Appointment
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .insert({
        queue_session_id: targetSession.id,
        patient_id: patientId,
        dependent_id: dependentId || null,
        walk_in_name: dependentId ? bookingName : null,
        booking_channel: 'ONLINE',
        queue_number: nextOddNumber,
        token_code: tokenCode,
        status: 'BOOKED',
        priority_category: effectivePriority,
        priority_notes: effectivePriorityId
          ? `${effectivePriority}: ID #${effectivePriorityId}`
          : null,
        consultation_fee: doctor?.consultation_fee_default || 600.0,
        platform_fee: 50.0,
        platform_payment_status: 'PENDING',
      })
      .select()
      .single();

    if (apptError || !appointment) {
      console.error('[BookToken] Appointment Insert Error:', apptError);
      return NextResponse.json(
        { error: apptError?.message || 'Failed to create queue appointment' },
        { status: 500 }
      );
    }

    // 6. Generate PayMongo QRPH Payment Intent
    const doctorDisplayName = (doctor as any)?.profiles?.full_name
      ? `${(doctor as any).title || 'Dr.'} ${(doctor as any).profiles.full_name}`
      : 'Clinic Natin Specialist';

    const paymentResult = await PayMongoService.createQRPHPayment({
      appointmentId: appointment.id,
      patientName: bookingName,
      patientEmail: patient.email || undefined,
      patientPhone: patient.phone_number || undefined,
      doctorName: doctorDisplayName,
      amountInPhp: 50.0,
    });

    // Record Transaction in database
    await supabase.from('transactions').insert({
      appointment_id: appointment.id,
      patient_id: patientId,
      amount: 50.0,
      currency: 'PHP',
      payment_channel: paymentChannel === 'GCASH' ? 'GCASH' : paymentChannel === 'MAYA' ? 'MAYA' : 'QRPH',
      paymongo_payment_intent_id: paymentResult.paymentIntentId,
      paymongo_client_key: paymentResult.clientKey,
      status: 'PENDING',
      metadata: {
        is_mock: paymentResult.isMock,
        token_code: tokenCode,
        queue_number: nextOddNumber,
        doctor_name: doctorDisplayName,
        dependent_name: dependentId ? bookingName : null,
        priority: effectivePriority,
      },
    });

    // 7. Dispatch SMS notification via Semaphore if patient phone is available
    if (patient.phone_number) {
      try {
        await SemaphoreService.sendSlotConfirmation(
          patient.phone_number,
          tokenCode,
          nextOddNumber,
          appointment.id
        );
      } catch (smsErr) {
        console.warn('[BookToken] Semaphore SMS notice failed (non-blocking):', smsErr);
      }
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        tokenCode,
        queueNumber: nextOddNumber,
        status: appointment.status,
        servingNumber: targetSession.current_serving_number || 1,
        bookingName,
        doctorName: doctorDisplayName,
      },
      payment: paymentResult,
    });
  } catch (err: unknown) {
    console.error('[BookToken] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
