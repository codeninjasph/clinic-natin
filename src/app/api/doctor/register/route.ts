import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      email,
      password,
      phone,
      title = 'Dr.',
      specialty,
      subspecialty,
      prcLicense,
      prcExpiry,
      ptrNumber,
      s2License,
      boardCertification,
      hospitalAffiliation = 'Maria Reyna - Xavier University Hospital',
      roomAssignment = 'Room 304',
      hmoAccreditations = ['Maxicare', 'Intellicare', 'PhilHealth Konsulta'],
      consultationFee = 600,
    } = body;

    if (!fullName || !specialty || !prcLicense || !email) {
      return NextResponse.json(
        { error: 'Full Name, Email, Primary Specialty, and PRC License # are required.' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // 1. Supabase Auth Sign Up (if password provided)
    let authUserId: string | null = null;
    if (password) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: 'DOCTOR',
              prc_license: prcLicense,
              specialty,
            },
          },
        });

        if (!authError && authData.user) {
          authUserId = authData.user.id;
        }
      } catch (authErr) {
        console.warn('Supabase auth sign up note:', authErr);
      }
    }

    // 2. Insert into profiles table
    const profilePayload: Record<string, any> = {
      full_name: fullName,
      email,
      phone_number: phone || null,
      role: 'DOCTOR',
    };
    if (authUserId) {
      profilePayload.auth_id = authUserId;
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .insert(profilePayload)
      .select('id')
      .single();

    if (profileErr || !profile) {
      console.error('Error creating doctor profile:', profileErr);
      return NextResponse.json(
        { error: profileErr?.message || 'Failed to create doctor profile record' },
        { status: 500 }
      );
    }

    // 3. Insert into doctors table with PENDING verification
    const { data: doctor, error: doctorErr } = await supabase
      .from('doctors')
      .insert({
        profile_id: profile.id,
        title,
        specialty,
        subspecialty: subspecialty || null,
        prc_license: prcLicense,
        prc_expiry: prcExpiry || null,
        ptr_number: ptrNumber || null,
        s2_license: s2License || null,
        board_certification: boardCertification || null,
        hospital_affiliation: hospitalAffiliation,
        room_assignment: roomAssignment,
        hmo_accreditations: hmoAccreditations,
        consultation_fee_default: consultationFee,
        subscription_tier: 'pro', // Give pro tier trial by default
        pro_tier_active: true,
        verification_status: 'PENDING',
        is_verified: false,
      })
      .select('*')
      .single();

    if (doctorErr || !doctor) {
      console.error('Error creating doctor record:', doctorErr);
      return NextResponse.json(
        { error: doctorErr?.message || 'Failed to create physician record' },
        { status: 500 }
      );
    }

    // 4. Check for or associate with a clinic and create initial schedule
    try {
      const { data: existingClinic } = await supabase
        .from('clinics')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existingClinic) {
        await supabase.from('doctor_clinic_schedules').insert({
          doctor_id: doctor.id,
          clinic_id: existingClinic.id,
          day_of_week: 1, // Monday
          start_time: '08:30:00',
          end_time: '13:30:00',
          max_patients: 30,
          is_active: true,
        });
      }
    } catch (schedErr) {
      console.warn('Initial schedule assignment warning:', schedErr);
    }

    // 5. Audit Log entry for Admin Review
    try {
      await supabase.from('audit_logs').insert({
        table_affected: 'doctors',
        record_id: doctor.id,
        action: 'DOCTOR_SELF_REGISTRATION_PENDING',
        old_data: null,
        new_data: {
          fullName,
          specialty,
          prcLicense,
          verification_status: 'PENDING',
          registered_at: new Date().toISOString(),
        },
        ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1 (Self-Registration)',
      });
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Physician registration submitted successfully. Credentials are now pending administrative verification.',
      doctor,
    });
  } catch (err: any) {
    console.error('Doctor self-registration exception:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error during registration' },
      { status: 500 }
    );
  }
}
