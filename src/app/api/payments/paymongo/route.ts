import { NextRequest, NextResponse } from 'next/server';
import { PayMongoService } from '@/lib/payments/paymongo';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, patientName, patientEmail, patientPhone, doctorName, amountInPhp } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 });
    }

    const result = await PayMongoService.createQRPHPayment({
      appointmentId,
      patientName: patientName || 'Patient',
      patientEmail,
      patientPhone,
      doctorName,
      amountInPhp: amountInPhp || 50.0,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message || 'Failed to initialize payment' }, { status: 500 });
    }

    // Record in database if appointment exists
    const supabase = await createServerClient();
    await supabase.from('transactions').insert({
      appointment_id: appointmentId,
      amount: amountInPhp || 50.0,
      currency: 'PHP',
      payment_channel: 'QRPH',
      paymongo_payment_intent_id: result.paymentIntentId,
      paymongo_client_key: result.clientKey,
      status: 'PENDING',
      metadata: {
        is_mock: result.isMock,
        created_via: 'web_booking',
      },
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[PayMongo Route] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
