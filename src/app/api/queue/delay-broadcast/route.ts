import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { SemaphoreService } from '@/lib/sms/semaphore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, delayMinutes, reason } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const delay = Number(delayMinutes) || 30;
    const announcement = reason || `Doctor is delayed by ~${delay} mins due to hospital rounds/emergency surgery.`;

    const supabase = await createServerClient();

    // 1. Fetch queue session and doctor info
    const { data: session, error: sessErr } = await supabase
      .from('queue_sessions')
      .select('id, doctor_id, session_date, doctors(title, profiles(full_name))')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = session.doctors as any;
    const doctorName = `${doc?.title || 'Dr.'} ${doc?.profiles?.full_name || 'Specialist'}`;

    // 2. Update Queue Session announcement
    await supabase
      .from('queue_sessions')
      .update({
        announcement_notice: announcement,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    // 3. Insert schedule override log
    await supabase.from('schedule_overrides').insert({
      doctor_id: session.doctor_id,
      target_date: session.session_date,
      override_type: 'DOCTOR_EMERGENCY_DELAY',
      delay_minutes: delay,
      announcement_message: announcement,
    });

    // 4. Fetch waiting/booked patients with phone numbers
    const { data: waitingAppts } = await supabase
      .from('appointments')
      .select('id, walk_in_phone, profiles(phone_number)')
      .eq('queue_session_id', sessionId)
      .in('status', ['BOOKED', 'WAITING', 'BUFFERED']);

    const phoneNumbers: string[] = [];
    (waitingAppts ?? []).forEach((row: any) => {
      const p = row.profiles?.phone_number || row.walk_in_phone;
      if (p) phoneNumbers.push(p);
    });

    // 5. Dispatch SMS broadcast via Semaphore
    const smsCount = await SemaphoreService.sendDelayBroadcast(phoneNumbers, doctorName, delay, reason);

    return NextResponse.json({
      success: true,
      announcement,
      smsSent: smsCount,
      totalWaiting: phoneNumbers.length,
    });
  } catch (err: unknown) {
    console.error('[Delay Broadcast API] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to broadcast delay' },
      { status: 500 }
    );
  }
}
