import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { SemaphoreService } from '@/lib/sms/semaphore';

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, reason, graceMinutes } = await req.json();

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // 1. Fetch appointment
    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .select('id, queue_number, token_code, status, walk_in_phone, profiles(phone_number, full_name)')
      .eq('id', appointmentId)
      .single();

    if (apptErr || !appt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // 2. Set status to BUFFERED with configurable grace period (default 45 min)
    const minutes = Number(graceMinutes) > 0 ? Math.min(Math.max(Number(graceMinutes), 10), 240) : 45;
    const bufferedAt = new Date();
    const graceDeadline = new Date(bufferedAt.getTime() + minutes * 60 * 1000);

    const { error: updateErr } = await supabase
      .from('appointments')
      .update({
        status: 'BUFFERED',
        buffered_at: bufferedAt.toISOString(),
        grace_period_deadline: graceDeadline.toISOString(),
        priority_notes: reason || `Buffered for Laboratory/Diagnostic tests (${minutes}m Grace Period)`,
      })
      .eq('id', appointmentId);

    if (updateErr) throw updateErr;

    // 3. Notify patient via SMS (non-blocking)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patientPhone = (appt as any).profiles?.phone_number || appt.walk_in_phone;
    if (patientPhone) {
      try {
        await SemaphoreService.sendSMS(
          patientPhone,
          `[CLINIC NATIN] Token ${appt.token_code} placed in Buffer Lane. You have a ${minutes}-minute grace period to return with your laboratory/imaging results without losing your priority.`,
          appointmentId,
          'DOCTOR_DELAY_ANNOUNCEMENT'
        );
      } catch (smsErr) {
        console.error('[Buffer Patient API] SMS dispatch failed:', smsErr);
      }
    }

    return NextResponse.json({
      success: true,
      tokenCode: appt.token_code,
      graceMinutes: minutes,
      bufferedAt: bufferedAt.toISOString(),
      gracePeriodDeadline: graceDeadline.toISOString(),
      message: `Token ${appt.token_code} moved to Buffer Lane (${minutes} min grace period).`,
    });
  } catch (err: unknown) {
    console.error('[Buffer Patient API] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to buffer patient' },
      { status: 500 }
    );
  }
}
