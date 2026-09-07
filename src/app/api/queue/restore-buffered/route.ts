import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { SemaphoreService } from '@/lib/sms/semaphore';

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, queueSessionId } = await req.json();

    if (!appointmentId || !queueSessionId) {
      return NextResponse.json({ error: 'appointmentId and queueSessionId are required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // 1. Fetch current appointment
    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .select('id, queue_number, token_code, status, walk_in_phone, profiles(phone_number, full_name)')
      .eq('id', appointmentId)
      .single();

    if (apptErr || !appt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // 2. Fetch current waiting appointments to determine insertion
    const { data: activeWaiting } = await supabase
      .from('appointments')
      .select('id, queue_number')
      .eq('queue_session_id', queueSessionId)
      .in('status', ['WAITING', 'BOOKED'])
      .order('queue_number', { ascending: true });

    // Target queue position: slot after 2 active patients if available
    let targetQueueNum = appt.queue_number;
    if (activeWaiting && activeWaiting.length >= 2) {
      targetQueueNum = activeWaiting[1].queue_number + 1;
    } else if (activeWaiting && activeWaiting.length === 1) {
      targetQueueNum = activeWaiting[0].queue_number + 1;
    }

    // 3. Update appointment status to WAITING and set restored timestamp
    const { error: updateErr } = await supabase
      .from('appointments')
      .update({
        status: 'WAITING',
        restored_at: new Date().toISOString(),
        priority_notes: 'Restored from Buffer Lane (Grace Period)',
      })
      .eq('id', appointmentId);

    if (updateErr) throw updateErr;

    // 4. Send SMS alert to patient
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patientPhone = (appt as any).profiles?.phone_number || appt.walk_in_phone;
    if (patientPhone) {
      await SemaphoreService.sendSMS(
        patientPhone,
        `[CLINIC NATIN] Welcome! Token ${appt.token_code} has been restored to the queue. You are scheduled to be called in approximately 2 consultations.`,
        appointmentId,
        'NOW_SERVING'
      );
    }

    return NextResponse.json({
      success: true,
      tokenCode: appt.token_code,
      message: `Token ${appt.token_code} successfully restored to active queue.`,
    });
  } catch (err: unknown) {
    console.error('[Restore Buffered API] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to restore buffered appointment' },
      { status: 500 }
    );
  }
}
