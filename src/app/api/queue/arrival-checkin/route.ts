import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tokenCode, appointmentId, clinicId } = body;

    if (!tokenCode && !appointmentId) {
      return NextResponse.json(
        { error: 'tokenCode or appointmentId is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    let query = supabase.from('appointments').select(`
      id,
      token_code,
      queue_number,
      status,
      booking_channel,
      priority_category,
      walk_in_name,
      patient_id,
      queue_session_id,
      profiles!patient_id (
        full_name,
        phone_number
      ),
      queue_sessions!queue_session_id (
        id,
        current_serving_number,
        status,
        clinics!clinic_id (
          id,
          name,
          hospital_name,
          room_number
        ),
        doctors!doctor_id (
          title,
          specialty,
          profiles!profile_id (
            full_name
          )
        )
      )
    `);

    if (appointmentId) {
      query = query.eq('id', appointmentId);
    } else if (tokenCode) {
      query = query.ilike('token_code', tokenCode.trim());
    }

    const { data: appointment, error: findError } = await query.maybeSingle();

    if (findError || !appointment) {
      return NextResponse.json(
        { error: 'Appointment token not found or invalid' },
        { status: 404 }
      );
    }

    // If already waiting or serving or completed
    if (appointment.status === 'WAITING') {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        message: 'Patient is already checked in and waiting in the queue.',
        appointment,
      });
    }

    if (appointment.status === 'SERVING') {
      return NextResponse.json({
        success: true,
        alreadyServing: true,
        message: 'Patient is currently being served by the physician.',
        appointment,
      });
    }

    if (appointment.status === 'COMPLETED') {
      return NextResponse.json({
        success: false,
        error: 'This consultation token has already been completed.',
        appointment,
      }, { status: 400 });
    }

    // Update status to WAITING (Arrival Check-in completed)
    const { data: updatedAppt, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'WAITING',
      })
      .eq('id', appointment.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update arrival status: ' + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Arrival confirmed! You are officially checked in.',
      appointment: {
        ...appointment,
        status: 'WAITING',
      },
    });
  } catch (err: unknown) {
    console.error('[Arrival Check-in] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
