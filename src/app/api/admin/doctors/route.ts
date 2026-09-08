import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// 1. GET: Fetch all doctors (or single doctor by ?id=...) from Supabase
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const selectQuery = `
      id,
      profile_id,
      title,
      specialty,
      subspecialty,
      prc_license,
      prc_expiry,
      ptr_number,
      s2_license,
      board_certification,
      bio,
      consultation_fee_default,
      hmo_accreditations,
      is_verified,
      verification_status,
      subscription_tier,
      pro_tier_active,
      hospital_affiliation,
      room_assignment,
      created_at,
      profiles (
        id,
        full_name,
        email,
        phone_number,
        avatar_url
      )
    `;

    if (id) {
      const { data, error } = await supabase
        .from('doctors')
        .select(selectQuery)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase single fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json({ doctor: data });
    }

    const { data, error } = await supabase
      .from('doctors')
      .select(selectQuery)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ doctors: data || [] });
  } catch (err: any) {
    console.error('GET doctors error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// 2. POST: Create a new doctor in Supabase
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      email,
      phone,
      title = 'Dr.',
      specialty,
      subspecialty,
      prcLicense,
      prcExpiry,
      ptrNumber,
      s2License,
      boardCertification,
      hospitalAffiliation,
      roomAssignment,
      hmoAccreditations,
      consultationFee = 600,
      subscriptionTier = 'pro',
      verificationStatus = 'PENDING',
      isVerified = false,
    } = body;

    if (!fullName || !specialty || !prcLicense) {
      return NextResponse.json(
        { error: 'Physician Full Name, Specialty, and PRC License # are required.' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Step A: Insert Profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .insert({
        full_name: fullName,
        email: email || null,
        phone_number: phone || null,
        role: 'DOCTOR',
      })
      .select('id')
      .single();

    if (profileErr || !profile) {
      console.error('Error inserting doctor profile:', profileErr);
      return NextResponse.json({ error: profileErr?.message || 'Failed to create doctor profile' }, { status: 500 });
    }

    // Step B: Insert Doctor record
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
        hospital_affiliation: hospitalAffiliation || 'Maria Reyna XU Hospital',
        room_assignment: roomAssignment || 'Room 304',
        hmo_accreditations: hmoAccreditations || ['Maxicare', 'Intellicare', 'Medicard', 'PhilHealth Konsulta'],
        consultation_fee_default: consultationFee,
        subscription_tier: subscriptionTier,
        pro_tier_active: subscriptionTier === 'pro',
        verification_status: verificationStatus,
        is_verified: isVerified,
      })
      .select('*')
      .single();

    if (doctorErr || !doctor) {
      console.error('Error inserting doctor record:', doctorErr);
      return NextResponse.json({ error: doctorErr?.message || 'Failed to create doctor record' }, { status: 500 });
    }

    // Step C: Audit log
    await supabase.from('audit_logs').insert({
      table_affected: 'doctors',
      record_id: doctor.id,
      action: 'INSERT',
      old_data: null,
      new_data: { fullName, specialty, prcLicense, verificationStatus },
      ip_address: '124.106.129.5 (Admin Ops)',
    });

    return NextResponse.json({ success: true, doctor });
  } catch (err: any) {
    console.error('POST doctor error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// 3. PUT: Update an existing doctor & profile
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      profileId,
      fullName,
      email,
      phone,
      title,
      specialty,
      subspecialty,
      prcLicense,
      prcExpiry,
      ptrNumber,
      s2License,
      boardCertification,
      hospitalAffiliation,
      roomAssignment,
      hmoAccreditations,
      consultationFee,
      subscriptionTier,
      verificationStatus,
      isVerified,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Doctor ID is required for update' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Fetch old doctor record for audit log
    const { data: oldDoctor } = await supabase.from('doctors').select('*').eq('id', id).single();

    // Update Doctor record
    const updatePayload: Record<string, any> = {};
    if (title !== undefined) updatePayload.title = title;
    if (specialty !== undefined) updatePayload.specialty = specialty;
    if (subspecialty !== undefined) updatePayload.subspecialty = subspecialty;
    if (prcLicense !== undefined) updatePayload.prc_license = prcLicense;
    if (prcExpiry !== undefined) updatePayload.prc_expiry = prcExpiry;
    if (ptrNumber !== undefined) updatePayload.ptr_number = ptrNumber;
    if (s2License !== undefined) updatePayload.s2_license = s2License;
    if (boardCertification !== undefined) updatePayload.board_certification = boardCertification;
    if (hospitalAffiliation !== undefined) updatePayload.hospital_affiliation = hospitalAffiliation;
    if (roomAssignment !== undefined) updatePayload.room_assignment = roomAssignment;
    if (hmoAccreditations !== undefined) updatePayload.hmo_accreditations = hmoAccreditations;
    if (consultationFee !== undefined) updatePayload.consultation_fee_default = consultationFee;
    if (subscriptionTier !== undefined) {
      updatePayload.subscription_tier = subscriptionTier;
      updatePayload.pro_tier_active = subscriptionTier === 'pro';
    }
    if (verificationStatus !== undefined) {
      updatePayload.verification_status = verificationStatus;
      updatePayload.is_verified = verificationStatus === 'VERIFIED';
    }
    if (isVerified !== undefined) {
      updatePayload.is_verified = isVerified;
      if (isVerified) updatePayload.verification_status = 'VERIFIED';
    }

    const { error: docUpdateErr } = await supabase
      .from('doctors')
      .update(updatePayload)
      .eq('id', id);

    if (docUpdateErr) {
      console.error('Error updating doctor:', docUpdateErr);
      return NextResponse.json({ error: docUpdateErr.message }, { status: 500 });
    }

    // Update Profile if provided
    if (profileId) {
      const profileUpdate: Record<string, any> = {};
      if (fullName !== undefined) profileUpdate.full_name = fullName;
      if (email !== undefined) profileUpdate.email = email;
      if (phone !== undefined) profileUpdate.phone_number = phone;

      if (Object.keys(profileUpdate).length > 0) {
        await supabase.from('profiles').update(profileUpdate).eq('id', profileId);
      }
    }

    // Write audit log
    await supabase.from('audit_logs').insert({
      table_affected: 'doctors',
      record_id: id,
      action: 'UPDATE',
      old_data: oldDoctor,
      new_data: updatePayload,
      ip_address: '124.106.129.5 (Admin Ops)',
    });

    return NextResponse.json({ success: true, message: 'Doctor updated successfully' });
  } catch (err: any) {
    console.error('PUT doctor error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// 4. DELETE: Remove / Deactivate a doctor
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Doctor ID is required for deletion' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Get doctor record first to find profile_id
    const { data: doc } = await supabase.from('doctors').select('id, profile_id').eq('id', id).single();

    if (doc) {
      // Delete doctor row
      await supabase.from('doctors').delete().eq('id', id);

      // Delete associated profile if exists
      if (doc.profile_id) {
        await supabase.from('profiles').delete().eq('id', doc.profile_id);
      }

      // Write audit log
      await supabase.from('audit_logs').insert({
        table_affected: 'doctors',
        record_id: id,
        action: 'DELETE',
        old_data: doc,
        new_data: null,
        ip_address: '124.106.129.5 (Admin Ops)',
      });
    }

    return NextResponse.json({ success: true, message: 'Doctor removed successfully' });
  } catch (err: any) {
    console.error('DELETE doctor error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
