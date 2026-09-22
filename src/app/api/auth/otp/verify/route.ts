import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerClient } from '@/lib/supabase/server';
import {
  normalizePhilippinePhone,
  verifyOtpHash,
} from '@/lib/crypto/otp-security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone = body?.phoneNumber;
    const rawCode = body?.code;

    if (!rawPhone || !rawCode) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Phone number and verification code are required.' },
        { status: 400 }
      );
    }

    const { e164, local, isValid } = normalizePhilippinePhone(rawPhone);
    if (!isValid) {
      return NextResponse.json(
        { error: 'INVALID_PHONE_NUMBER', message: 'Invalid Philippine phone number.' },
        { status: 400 }
      );
    }

    const code = String(rawCode).trim();
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'INVALID_CODE_FORMAT', message: 'Verification code must be 6 digits.' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const now = new Date();

    // 1. Fetch latest pending OTP record for this phone number
    const { data: records, error: fetchErr } = await supabase
      .from('phone_otp_verifications')
      .select('*')
      .eq('phone_number', e164)
      .eq('is_verified', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchErr) {
      console.error('[OTP Verify] DB error:', fetchErr);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: 'Failed to retrieve OTP session.' },
        { status: 500 }
      );
    }

    if (!records || records.length === 0) {
      return NextResponse.json(
        {
          error: 'NO_ACTIVE_OTP',
          message: 'No active OTP verification found. Please request a new code.',
        },
        { status: 400 }
      );
    }

    const otpRecord = records[0];

    // 2. Check if expired
    const expiresAt = new Date(otpRecord.expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        {
          error: 'OTP_EXPIRED',
          message: 'The verification code has expired. Please request a new code.',
        },
        { status: 400 }
      );
    }

    // 3. Check attempt limit
    if (otpRecord.attempts_count >= otpRecord.max_attempts) {
      return NextResponse.json(
        {
          error: 'MAX_ATTEMPTS_EXCEEDED',
          message: 'Maximum verification attempts exceeded. Please request a new code.',
        },
        { status: 403 }
      );
    }

    // 4. Verify Code Hash
    const isMatch = verifyOtpHash(code, otpRecord.otp_hash);

    if (!isMatch) {
      const newAttempts = otpRecord.attempts_count + 1;
      await supabase
        .from('phone_otp_verifications')
        .update({ attempts_count: newAttempts })
        .eq('id', otpRecord.id);

      const remainingAttempts = Math.max(0, otpRecord.max_attempts - newAttempts);

      return NextResponse.json(
        {
          error: 'INVALID_OTP',
          message: remainingAttempts > 0
            ? `Incorrect verification code. ${remainingAttempts} attempt(s) remaining.`
            : 'Maximum verification attempts exceeded. Please request a new code.',
          remainingAttempts,
        },
        { status: 400 }
      );
    }

    // 5. Code is valid: mark as verified
    await supabase
      .from('phone_otp_verifications')
      .update({
        is_verified: true,
        verified_at: now.toISOString(),
      })
      .eq('id', otpRecord.id);

    // 6. Find or auto-provision patient profile in profiles table
    let { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .or(`phone_number.eq.${e164},phone_number.eq.${local}`)
      .limit(1);

    if (profileErr) {
      console.warn('[OTP Verify] Error finding profile:', profileErr);
    }

    let profile = profiles && profiles.length > 0 ? profiles[0] : null;

    if (!profile) {
      // Auto-provision a new patient profile
      const newPatient = {
        role: 'PATIENT',
        full_name: `Patient ${local.slice(-4)}`,
        phone_number: e164,
        priority_category: 'NONE',
        allergies: [],
        comorbidities: [],
        maintenance_meds: [],
      };

      const { data: created, error: createErr } = await supabase
        .from('profiles')
        .insert(newPatient)
        .select('*')
        .single();

      if (!createErr && created) {
        profile = created;
      } else {
        console.error('[OTP Verify] Error auto-creating profile:', createErr);
        profile = newPatient;
      }
    }

    // 7. Issue session token
    const tokenPayload = {
      sub: profile.id || `temp_${Date.now()}`,
      phone: e164,
      role: profile.role || 'PATIENT',
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(now.getTime() / 1000) + 30 * 24 * 60 * 60, // 30 days
    };
    const sessionToken = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully.',
      token: sessionToken,
      profile: {
        id: profile.id,
        fullName: profile.full_name,
        role: profile.role,
        phoneNumber: profile.phone_number,
        priorityCategory: profile.priority_category || 'NONE',
        priorityIdNumber: profile.priority_id_number || null,
        allergies: profile.allergies || [],
        comorbidities: profile.comorbidities || [],
        maintenanceMeds: profile.maintenance_meds || [],
        bloodType: profile.blood_type || null,
      },
    });
  } catch (err: any) {
    console.error('[OTP Verify] Internal server error:', err);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err?.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
