import { NextRequest, NextResponse } from 'next/server';
import { SemaphoreService } from '@/lib/sms/semaphore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      appointmentId,
      phoneNumber,
      patientName,
      tokenCode,
      queueNumber,
      doctorName,
      clinicName,
    } = body as {
      appointmentId?: string;
      phoneNumber: string;
      patientName: string;
      tokenCode: string;
      queueNumber: number;
      doctorName?: string;
      clinicName?: string;
    };

    if (!phoneNumber || !tokenCode) {
      return NextResponse.json(
        { error: 'phoneNumber and tokenCode are required.' },
        { status: 400 }
      );
    }

    const firstName = (patientName || 'Patient').trim().split(' ')[0];
    const docText = doctorName ? ` for ${doctorName}` : '';
    const facilityText = clinicName ? ` at ${clinicName}` : '';

    const message = `[CLINIC NATIN] Welcome ${firstName}! Your Walk-In Token is ${tokenCode} (Queue #${queueNumber})${docText}${facilityText}. Track live turn & activate your Health Passport: https://clinicnatin.ph/my-queue?token=${tokenCode}`;

    const res = await SemaphoreService.sendSMS({
      phoneNumber,
      message,
      appointmentId,
      recipientName: patientName,
      hospitalName: clinicName,
      notificationType: 'SLOT_CONFIRMED',
    });

    return NextResponse.json({
      success: res.success,
      isMock: res.isMock,
      messageId: res.messageId,
      carrier: res.carrier,
    });
  } catch (error) {
    console.error('[send-walkin-sms] Error dispatching SMS:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
