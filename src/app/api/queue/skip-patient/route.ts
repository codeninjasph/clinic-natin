import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { SemaphoreService } from '@/lib/sms/semaphore';

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, markNoShow } = await req.json();

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .select('id, queue_number, token_code, status, skip_count, walk_in_phone, profiles(phone_number, full_name)')
      .eq('id', appointmentId)
      .single();

    if (apptErr || !appt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const nextStatus = markNoShow ? 'CANCELLED_NO_SHOW' : 'SKIPPED';
    const currentSkipCount = (appt.skip_count || 0) + 1;

    const { error: updateErr } = await supabase
      .from('appointments')
      .update({
        status: nextStatus,
        skip_count: currentSkipCount,
      })
      .eq('id', appointmentId);

    if (updateErr) throw updateErr;

    // Send SMS notice to skipped patient
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patientPhone = (appt as any).profiles?.phone_number || appt.walk_in_phone;
    if (patientPhone) {
      const msg = markNoShow
        ? `[CLINIC NATIN] Token ${appt.token_code} marked as No-Show. Your consultation slot has been forfeited.`
        : `[CLINIC NATIN] Token ${appt.token_code} was called but you were not present. Please approach the clinic reception desk if you have arrived.`;

      await SemaphoreService.sendSMS(
        patientPhone,
        msg,
        appointmentId,
        'PATIENT_SKIPPED_NOTICE'
      );
    }

    return NextResponse.json({
      success: true,
      tokenCode: appt.token_code,
      status: nextStatus,
      skipCount: currentSkipCount,
      message: `Token ${appt.token_code} updated to ${nextStatus}.`,
    });
  } catch (err: unknown) {
    console.error('[Skip Patient API] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to skip patient' },
      { status: 500 }
    );
  }
}
