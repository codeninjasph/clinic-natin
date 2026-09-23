import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get('profileId') || '971463e5-9348-42c0-b759-5b56f9df9e99';

    const supabase = await createServerClient();
    const { data: dependents, error } = await supabase
      .from('patient_dependents')
      .select('*')
      .eq('primary_profile_id', profileId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ dependents: dependents || [] });
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
      primaryProfileId,
      fullName,
      relationship,
      dateOfBirth,
      gender,
      bloodType,
      weightKg,
      heightCm,
      allergies = [],
      comorbidities = [],
      maintenanceMeds = [],
      priorityCategory = 'NONE',
      priorityIdNumber,
      hmoProvider,
      hmoCardNumber,
      philhealthNumber,
    } = body;

    if (!primaryProfileId || !fullName || !relationship) {
      return NextResponse.json(
        { error: 'primaryProfileId, fullName, and relationship are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const { data: newDep, error } = await supabase
      .from('patient_dependents')
      .insert({
        primary_profile_id: primaryProfileId,
        full_name: fullName.trim(),
        relationship,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        blood_type: bloodType || null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        allergies,
        comorbidities,
        maintenance_meds: maintenanceMeds,
        priority_category: priorityCategory,
        priority_id_number: priorityIdNumber || null,
        hmo_provider: hmoProvider || null,
        hmo_card_number: hmoCardNumber || null,
        philhealth_number: philhealthNumber || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, dependent: newDep });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { error } = await supabase
      .from('patient_dependents')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
