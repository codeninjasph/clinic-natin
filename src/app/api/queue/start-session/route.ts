import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { clinicId, doctorId } = await req.json();

    if (!clinicId || !doctorId) {
      return NextResponse.json({ error: 'clinicId and doctorId are required' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const todayStr = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay(); // 1 = Monday, 7 = Sunday

    // 1. Check if an active or pending session already exists for today
    const { data: existingSession } = await supabase
      .from('queue_sessions')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('clinic_id', clinicId)
      .eq('session_date', todayStr)
      .maybeSingle();

    if (existingSession) {
      // If it was paused or pending, activate it
      if (existingSession.status !== 'ACTIVE') {
        const { data: updated, error: updateErr } = await supabase
          .from('queue_sessions')
          .update({ status: 'ACTIVE', last_updated_at: new Date().toISOString() })
          .eq('id', existingSession.id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        return NextResponse.json({ success: true, session: updated });
      }
      return NextResponse.json({ success: true, session: existingSession });
    }

    // 2. Find or create schedule for doctor & clinic
    let { data: schedule } = await supabase
      .from('doctor_clinic_schedules')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('clinic_id', clinicId)
      .eq('day_of_week', dayOfWeek)
      .maybeSingle();

    if (!schedule) {
      // Find any schedule for this doctor and clinic
      const { data: anySchedule } = await supabase
        .from('doctor_clinic_schedules')
        .select('id')
        .eq('doctor_id', doctorId)
        .eq('clinic_id', clinicId)
        .limit(1)
        .maybeSingle();

      if (anySchedule) {
        schedule = anySchedule;
      } else {
        // Create default schedule for today
        const { data: newSched, error: schedErr } = await supabase
          .from('doctor_clinic_schedules')
          .insert({
            doctor_id: doctorId,
            clinic_id: clinicId,
            day_of_week: dayOfWeek,
            start_time: '08:00:00',
            end_time: '17:00:00',
            max_patients: 50,
            is_active: true,
          })
          .select('id')
          .single();

        if (schedErr) throw schedErr;
        schedule = newSched;
      }
    }

    // 3. Create the queue session
    const { data: newSession, error: sessErr } = await supabase
      .from('queue_sessions')
      .insert({
        schedule_id: schedule.id,
        doctor_id: doctorId,
        clinic_id: clinicId,
        session_date: todayStr,
        status: 'ACTIVE',
        current_serving_number: 0,
        accepting_walkins: true,
        accepting_online: true,
      })
      .select('*')
      .single();

    if (sessErr) throw sessErr;

    return NextResponse.json({ success: true, session: newSession });
  } catch (err: unknown) {
    console.error('[Start Session API] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start queue session' },
      { status: 500 }
    );
  }
}
