import { NextRequest, NextResponse } from 'next/server';
import { PayMongoService } from '@/lib/payments/paymongo';
import { createServerClient } from '@/lib/supabase/server';
import { SemaphoreService } from '@/lib/sms/semaphore';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('paymongo-signature');

    const { isValid, eventType, paymentData, appointmentId } = PayMongoService.parseWebhook(rawBody, signature);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (eventType === 'payment.paid' || eventType === 'payment_intent.succeeded') {
      const supabase = await createServerClient();
      const apptId = appointmentId || paymentData?.attributes?.metadata?.appointment_id;

      if (apptId) {
        // 1. Update Transaction
        await supabase
          .from('transactions')
          .update({
            status: 'SUCCESS',
            updated_at: new Date().toISOString(),
          })
          .eq('appointment_id', apptId);

        // 2. Update Appointment platform payment status
        const { data: updatedAppt } = await supabase
          .from('appointments')
          .update({
            platform_payment_status: 'PAID',
          })
          .eq('id', apptId)
          .select('id, token_code, queue_number, patient_id, profiles(phone_number, full_name)')
          .maybeSingle();

        // 3. Dispatch automated SMS Confirmation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const patientPhone = (updatedAppt as any)?.profiles?.phone_number;
        if (patientPhone && updatedAppt) {
          await SemaphoreService.sendSlotConfirmation(
            patientPhone,
            updatedAppt.token_code,
            updatedAppt.queue_number,
            apptId
          );
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error('[PayMongo Webhook] Error:', err);
    return NextResponse.json({ error: 'Webhook handling error' }, { status: 500 });
  }
}
