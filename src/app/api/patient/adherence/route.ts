import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId') || '971463e5-9348-42c0-b759-5b56f9df9e99';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const supabase = await createServerClient();
    const { data: logs, error } = await supabase
      .from('medication_adherence_logs')
      .select('*')
      .eq('patient_id', patientId)
      .eq('scheduled_date', date);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientId,
      dependentId,
      prescriptionId,
      medicationName,
      dosage,
      scheduledSlot,
      scheduledDate,
      action = 'TOGGLE', // 'TOGGLE' or 'RECORD'
    } = body;

    if (!patientId || !medicationName || !scheduledSlot) {
      return NextResponse.json(
        { error: 'patientId, medicationName, and scheduledSlot are required' },
        { status: 400 }
      );
    }

    const dateStr = scheduledDate || new Date().toISOString().split('T')[0];
    const supabase = await createServerClient();

    // Check if already logged
    const { data: existing } = await supabase
      .from('medication_adherence_logs')
      .select('id')
      .eq('patient_id', patientId)
      .eq('medication_name', medicationName)
      .eq('scheduled_slot', scheduledSlot)
      .eq('scheduled_date', dateStr)
      .maybeSingle();

    if (existing && action === 'TOGGLE') {
      // Unmark / remove
      await supabase
        .from('medication_adherence_logs')
        .delete()
        .eq('id', existing.id);

      return NextResponse.json({ success: true, taken: false });
    } else {
      // Record taken
      const { data: inserted, error } = await supabase
        .from('medication_adherence_logs')
        .insert({
          patient_id: patientId,
          dependent_id: dependentId || null,
          prescription_id: prescriptionId || null,
          medication_name: medicationName,
          dosage: dosage || null,
          scheduled_slot: scheduledSlot,
          scheduled_date: dateStr,
          taken_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, taken: true, log: inserted });
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
