/**
 * 📱 Clinic Natin — Semaphore SMS Gateway Integration
 * High-priority transactional SMS dispatch for queue progression, delay alerts,
 * and buffer lane notifications across Cagayan de Oro.
 */

import { createServerClient } from '@/lib/supabase/server';

const SEMAPHORE_API_URL = 'https://api.semaphore.co/api/v4/messages';

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  isMock: boolean;
  error?: string;
}

export class SemaphoreService {
  private static getApiKey(): string | undefined {
    return process.env.SEMAPHORE_API_KEY;
  }

  private static getSenderName(): string {
    return process.env.SEMAPHORE_SENDER_NAME || 'CLINICNATIN';
  }

  /**
   * Dispatches a single SMS message via Semaphore.
   * If SEMAPHORE_API_KEY is unset, operates in realistic mock mode and logs to notification_logs.
   */
  static async sendSMS(
    phoneNumber: string,
    message: string,
    appointmentId?: string,
    notificationType: 'SLOT_CONFIRMED' | 'ADVANCE_WARNING_2_AHEAD' | 'NOW_SERVING' | 'DOCTOR_DELAY_ANNOUNCEMENT' | 'PATIENT_SKIPPED_NOTICE' = 'SLOT_CONFIRMED'
  ): Promise<SMSResponse> {
    const apiKey = this.getApiKey();
    const senderName = this.getSenderName();

    // Standardize Philippine phone number to format accepted by Semaphore (e.g., 09XXXXXXXXX)
    const formattedPhone = phoneNumber.replace(/^\+63/, '0').replace(/\s+/g, '');

    if (!apiKey) {
      console.log(`[Semaphore SMS Mock] To: ${formattedPhone} | Text: "${message}"`);

      // Log to database if appointmentId is present
      if (appointmentId) {
        try {
          const supabase = await createServerClient();
          await supabase.from('notification_logs').insert({
            appointment_id: appointmentId,
            recipient_phone: formattedPhone,
            notification_type: notificationType,
            message_body: message,
            gateway_provider: 'SEMAPHORE',
            gateway_response: { mock: true, timestamp: new Date().toISOString() },
            status: 'DELIVERED',
            sent_at: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.warn('[Semaphore SMS] DB log warning:', dbErr);
        }
      }

      return {
        success: true,
        messageId: `mock_sms_${Date.now()}`,
        isMock: true,
      };
    }

    try {
      const res = await fetch(SEMAPHORE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          apikey: apiKey,
          number: formattedPhone,
          message,
          sendername: senderName,
        }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData?.message || 'Semaphore dispatch failed');
      }

      if (appointmentId) {
        const supabase = await createServerClient();
        await supabase.from('notification_logs').insert({
          appointment_id: appointmentId,
          recipient_phone: formattedPhone,
          notification_type: notificationType,
          message_body: message,
          gateway_provider: 'SEMAPHORE',
          gateway_response: resData,
          status: 'SENT',
          sent_at: new Date().toISOString(),
        });
      }

      return {
        success: true,
        messageId: resData[0]?.message_id ? String(resData[0].message_id) : undefined,
        isMock: false,
      };
    } catch (err: unknown) {
      console.error('[SemaphoreService] Send failed:', err);
      return {
        success: false,
        isMock: false,
        error: err instanceof Error ? err.message : 'Unknown SMS error',
      };
    }
  }

  /**
   * 1-Tap Broadcast: Sent to all waiting patients when doctor is held up.
   */
  static async sendDelayBroadcast(
    phoneNumbers: string[],
    doctorName: string,
    delayMinutes: number,
    customReason?: string
  ): Promise<number> {
    const reasonText = customReason ? `due to ${customReason}` : 'due to hospital emergency rounds';
    const message = `[CLINIC NATIN] ${doctorName} is delayed by ~${delayMinutes} mins ${reasonText}. We are adjusting your turn tracker live. Please stay comfortable.`;

    let successCount = 0;
    for (const phone of phoneNumbers) {
      if (!phone) continue;
      const res = await this.sendSMS(phone, message, undefined, 'DOCTOR_DELAY_ANNOUNCEMENT');
      if (res.success) successCount++;
    }
    return successCount;
  }

  /**
   * Advance Warning: Sent when 2 patients remain before their turn.
   */
  static async sendTurnApproachingAlert(
    phoneNumber: string,
    queueNumber: number,
    doctorName: string,
    room: string,
    appointmentId: string
  ): Promise<SMSResponse> {
    const message = `[CLINIC NATIN] Reminder: Token #${queueNumber} is 2 numbers away! Please proceed to ${room} for ${doctorName}. Track live: clinicnatin.ph/my-queue`;
    return this.sendSMS(phoneNumber, message, appointmentId, 'ADVANCE_WARNING_2_AHEAD');
  }

  /**
   * Buffer Lane / Grace Period Alert: Sent when patient was called but away.
   */
  static async sendBufferNotice(
    phoneNumber: string,
    tokenCode: string,
    minutesGrace: number = 45,
    appointmentId: string
  ): Promise<SMSResponse> {
    const message = `[CLINIC NATIN] Notice: Token ${tokenCode} was called while away. You have been placed in the Buffer Lane. Please report to the clinic secretary within ${minutesGrace} mins to be slotted back in!`;
    return this.sendSMS(phoneNumber, message, appointmentId, 'PATIENT_SKIPPED_NOTICE');
  }

  /**
   * Slot Confirmation SMS: Sent immediately after booking.
   */
  static async sendSlotConfirmation(
    phoneNumber: string,
    tokenCode: string,
    queueNumber: number,
    appointmentId: string
  ): Promise<SMSResponse> {
    const message = `[CLINIC NATIN] Confirmed! Your Token is ${tokenCode} (Queue #${queueNumber}). Track your live queue position at clinicnatin.ph/my-queue.`;
    return this.sendSMS(phoneNumber, message, appointmentId, 'SLOT_CONFIRMED');
  }
}
