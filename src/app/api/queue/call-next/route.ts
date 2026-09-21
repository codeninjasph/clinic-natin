import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { SemaphoreService } from '@/lib/sms/semaphore';

/**
 * POST /api/queue/call-next
 *
 * Advances queue session turn, marks previous patient COMPLETED, marks next SERVING.
 * USER DECISION: Only dispatches "Advance Warning (2 Ahead)" SMS to the patient
 * who is 2 positions ahead in queue (no "Now Serving" SMS).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { queueSessionId, currentAppointmentId, nextAppointmentId } = body as {
      queueSessionId: string;
      currentAppointmentId?: string | null;
      nextAppointmentId?: string | null;
    };

    if (!queueSessionId) {
      return NextResponse.json(
        { error: 'queueSessionId is required' },
        { status: 400 }
      );
    }

    if (!currentAppointmentId && !nextAppointmentId) {
      return NextResponse.json(
        { error: 'Either currentAppointmentId or nextAppointmentId is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // 1. Mark previous patient COMPLETED if currently serving, and ensure no other patient remains SERVING
    if (currentAppointmentId) {
      await supabase
        .from('appointments')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
        })
        .eq('id', currentAppointmentId);
    }

    // Atomically complete any other appointment in this queue session currently marked SERVING
    let completeOthersQuery = supabase
      .from('appointments')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      })
      .eq('queue_session_id', queueSessionId)
      .eq('status', 'SERVING');

    if (nextAppointmentId) {
      completeOthersQuery = completeOthersQuery.neq('id', nextAppointmentId);
    }
    await completeOthersQuery;

    // If concluding consultation without calling another patient (queue empty)
    if (!nextAppointmentId) {
      await supabase
        .from('queue_sessions')
        .update({
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', queueSessionId);

      return NextResponse.json({
        success: true,
        completedOnly: true,
        message: 'Consultation concluded successfully.',
      });
    }

    // 2. Fetch incoming appointment to get queue number & clinic room
    const { data: incomingAppt, error: inErr } = await supabase
      .from('appointments')
      .select('id, queue_number, token_code, queue_session_id')
      .eq('id', nextAppointmentId)
      .single();

    if (inErr || !incomingAppt) {
      return NextResponse.json({ error: 'Incoming appointment not found' }, { status: 404 });
    }

    // 3. Mark incoming patient SERVING
    await supabase
      .from('appointments')
      .update({
        status: 'SERVING',
        served_at: new Date().toISOString(),
      })
      .eq('id', nextAppointmentId);

    // 4. Update queue session current serving number
    await supabase
      .from('queue_sessions')
      .update({
        current_serving_number: incomingAppt.queue_number,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', queueSessionId);

    // 5. Fetch clinic & hospital name for notifications
    const { data: sessionData } = await supabase
      .from('queue_sessions')
      .select('clinics:clinic_id(name, hospital_name, room_number)')
      .eq('id', queueSessionId)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clinicInfo = (sessionData as any)?.clinics;
    const roomStr = clinicInfo?.room_number || 'Consultation Room';
    const hospitalStr = clinicInfo?.hospital_name || clinicInfo?.name || 'Clinic Natin';

    // 6. Find patient 2 positions ahead (index 1 of remaining waiting patients)
    const { data: waitingAhead } = await supabase
      .from('appointments')
      .select('id, queue_number, token_code, patient_id, walk_in_phone, profiles:patient_id(phone_number, full_name)')
      .eq('queue_session_id', queueSessionId)
      .in('status', ['WAITING', 'BOOKED'])
      .gt('queue_number', incomingAppt.queue_number)
      .order('queue_number', { ascending: true })
      .limit(2);

    let advanceWarningSent = false;
    let recipientToken = null;

    // The patient 2 slots behind is at index 1 (second patient in line after the one now entering)
    const twoAheadPatient = waitingAhead && waitingAhead.length >= 2 ? waitingAhead[1] : null;

    if (twoAheadPatient) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = (twoAheadPatient as any)?.profiles;
      const phone = profile?.phone_number || twoAheadPatient.walk_in_phone;

      if (phone) {
        recipientToken = twoAheadPatient.token_code;
        try {
          await SemaphoreService.sendSMS({
            phoneNumber: phone,
            message: `[Clinic Natin] Token ${twoAheadPatient.token_code}: You have 2 patients ahead in ${roomStr} (${hospitalStr}). Please proceed towards the waiting lounge.`,
            notificationType: 'ADVANCE_WARNING_2_AHEAD',
            appointmentId: twoAheadPatient.id,
          });
          advanceWarningSent = true;
        } catch (smsErr) {
          console.warn('[call-next] Semaphore advance warning error:', smsErr);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      currentServingNumber: incomingAppt.queue_number,
      tokenCode: incomingAppt.token_code,
      advanceWarningSent,
      recipientToken,
    });
  } catch (err: unknown) {
    console.error('[call-next] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
