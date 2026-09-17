import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { SemaphoreService } from '@/lib/sms/semaphore';

export async function POST(req: NextRequest) {
  try {
    const {
      sessionId,
      action,
      reason,
      notifyRemaining = true,
    } = await req.json();

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: 'sessionId and action are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // 1. Fetch current session & doctor
    const { data: session, error: sErr } = await supabase
      .from('queue_sessions')
      .select('*, clinics(name, room_number, hospital_name), doctors(title, profiles(full_name))')
      .eq('id', sessionId)
      .single();

    if (sErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doctorName = (session as any).doctors?.profiles?.full_name || 'Dr. Santos';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clinicRoom = (session as any).clinics?.room_number || 'Room 210';

    // 2. Handle Actions
    if (action === 'PAUSE') {
      const notice =
        reason ||
        `Doctor is temporarily on urgent hospital rounds / checking on a confined patient. Queue is paused.`;

      const { error: uErr } = await supabase
        .from('queue_sessions')
        .update({
          status: 'PAUSED',
          announcement_notice: notice,
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (uErr) throw uErr;

      // Notify queued waiting patients via Semaphore SMS
      if (notifyRemaining) {
        const { data: waitingAppts } = await supabase
          .from('appointments')
          .select('id, token_code, walk_in_phone, profiles(phone_number)')
          .eq('queue_session_id', sessionId)
          .in('status', ['WAITING', 'BOOKED']);

        if (waitingAppts && waitingAppts.length > 0) {
          for (const appt of waitingAppts) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const phone = (appt as any).profiles?.phone_number || appt.walk_in_phone;
            if (phone) {
              await SemaphoreService.sendSMS(
                phone,
                `[CLINIC NATIN] Notice: ${doctorName} is temporarily stepping out for urgent hospital rounds / patient care. Your queue slot is held. Thank you for your patience.`,
                appt.id,
                'DOCTOR_DELAY_ANNOUNCEMENT'
              );
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        status: 'PAUSED',
        message: 'Session paused for hospital rounds.',
      });
    }

    if (action === 'RESUME') {
      const { error: uErr } = await supabase
        .from('queue_sessions')
        .update({
          status: 'ACTIVE',
          announcement_notice: null,
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (uErr) throw uErr;

      return NextResponse.json({
        success: true,
        status: 'ACTIVE',
        message: 'Session resumed. Ready to call patients.',
      });
    }

    if (action === 'END_COMPLETED' || action === 'END_EMERGENCY') {
      const isEmergency = action === 'END_EMERGENCY';

      // Mark session COMPLETED
      const { error: uErr } = await supabase
        .from('queue_sessions')
        .update({
          status: 'COMPLETED',
          announcement_notice: isEmergency
            ? `Clinic concluded early due to medical emergency.`
            : `Clinic session concluded for today.`,
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (uErr) throw uErr;

      // If emergency closure, notify any remaining waiting patients
      if (isEmergency && notifyRemaining) {
        const { data: waitingAppts } = await supabase
          .from('appointments')
          .select('id, token_code, walk_in_phone, profiles(phone_number)')
          .eq('queue_session_id', sessionId)
          .in('status', ['WAITING', 'BOOKED', 'BUFFERED']);

        if (waitingAppts && waitingAppts.length > 0) {
          // Update their status
          await supabase
            .from('appointments')
            .update({
              status: 'SKIPPED',
              priority_notes: 'Clinic concluded early due to doctor emergency rounds/surgery',
            })
            .eq('queue_session_id', sessionId)
            .in('status', ['WAITING', 'BOOKED', 'BUFFERED']);

          for (const appt of waitingAppts) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const phone = (appt as any).profiles?.phone_number || appt.walk_in_phone;
            if (phone) {
              await SemaphoreService.sendSMS(
                phone,
                `[CLINIC NATIN] Notice: ${doctorName} had to attend to an urgent hospital emergency. Clinic in ${clinicRoom} is concluded for today. Please approach reception for priority rescheduling.`,
                appt.id,
                'DOCTOR_DELAY_ANNOUNCEMENT'
              );
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        status: 'COMPLETED',
        message: isEmergency
          ? 'Clinic session closed due to emergency. Patients alerted via SMS.'
          : 'Clinic session successfully concluded for today.',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('[End Session API] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process session action' },
      { status: 500 }
    );
  }
}
