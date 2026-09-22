import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { SemaphoreService } from '@/lib/sms/semaphore';
import {
  normalizePhilippinePhone,
  generateNumericOtp,
  hashOtp,
} from '@/lib/crypto/otp-security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone = body?.phoneNumber;

    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Phone number is required.' },
        { status: 400 }
      );
    }

    const { e164, local, isValid } = normalizePhilippinePhone(rawPhone);
    if (!isValid) {
      return NextResponse.json(
        {
          error: 'INVALID_PHONE_NUMBER',
          message:
            'Please provide a valid Philippine mobile number (e.g. 09171234567 or +639171234567).',
        },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const now = new Date();

    // 1. Rate Limit Check: Cooldown (60 seconds)
    const { data: latestRecords, error: latestErr } = await supabase
      .from('phone_otp_verifications')
      .select('*')
      .eq('phone_number', e164)
      .order('created_at', { ascending: false })
      .limit(1);

    if (latestErr) {
      console.warn('[OTP Send] Error checking latest OTP:', latestErr);
    }

    if (latestRecords && latestRecords.length > 0) {
      const latest = latestRecords[0];
      const lastSentTime = new Date(latest.last_sent_at || latest.created_at).getTime();
      const elapsedSeconds = Math.floor((now.getTime() - lastSentTime) / 1000);

      if (elapsedSeconds < 60) {
        const remainingCooldown = 60 - elapsedSeconds;
        return NextResponse.json(
          {
            error: 'COOLDOWN_ACTIVE',
            message: `Please wait ${remainingCooldown}s before requesting a new OTP.`,
            retryAfter: remainingCooldown,
          },
          { status: 429 }
        );
      }
    }

    // 2. Rate Limit Check: Rolling window (max 5 requests per 15 minutes)
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const { count: windowCount, error: countErr } = await supabase
      .from('phone_otp_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('phone_number', e164)
      .gte('created_at', fifteenMinutesAgo);

    if (!countErr && windowCount !== null && windowCount >= 5) {
      return NextResponse.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many OTP requests. Please wait 15 minutes before trying again.',
        },
        { status: 429 }
      );
    }

    // 3. Generate 6-Digit OTP and Expiry (5 minutes)
    const otpCode = generateNumericOtp();
    const otpHash = hashOtp(otpCode);
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    // 4. Record OTP in Supabase
    const { error: insertErr } = await supabase
      .from('phone_otp_verifications')
      .insert({
        phone_number: e164,
        otp_hash: otpHash,
        attempts_count: 0,
        max_attempts: 3,
        expires_at: expiresAt.toISOString(),
        is_verified: false,
        last_sent_at: now.toISOString(),
      });

    if (insertErr) {
      console.error('[OTP Send] DB insertion failure:', insertErr);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: 'Failed to record OTP verification session.' },
        { status: 500 }
      );
    }

    // 5. Send SMS via Semaphore
    const messageBody = `Clinic Natin: Your verification code is ${otpCode}. Valid for 5 minutes. Do not share this code with anyone.`;
    const smsResult = await SemaphoreService.sendSMS({
      phoneNumber: local,
      message: messageBody,
      notificationType: 'SLOT_CONFIRMED',
    });

    return NextResponse.json({
      success: true,
      message: 'OTP verification code sent via SMS.',
      phoneNumber: e164,
      carrier: smsResult.carrier,
      expiresInSeconds: 300,
      cooldownSeconds: 60,
      // Provide sandbox debug code in non-production environments
      debugCode: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
    });
  } catch (err: any) {
    console.error('[OTP Send] Internal server error:', err);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err?.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
