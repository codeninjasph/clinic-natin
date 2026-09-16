/**
 * 📱 Clinic Natin — Semaphore SMS Gateway Integration
 * High-priority transactional SMS dispatch for queue progression, delay alerts,
 * emergency hospital broadcasts, and buffer lane notifications across Cagayan de Oro.
 */

import { createServerClient } from '@/lib/supabase/server';

const SEMAPHORE_API_URL = 'https://api.semaphore.co/api/v4/messages';
const SEMAPHORE_ACCOUNT_URL = 'https://api.semaphore.co/api/v4/account';

export type NotificationType =
  | 'SLOT_CONFIRMED'
  | 'ADVANCE_WARNING_2_AHEAD'
  | 'NOW_SERVING'
  | 'DOCTOR_DELAY_ANNOUNCEMENT'
  | 'PATIENT_SKIPPED_NOTICE'
  | 'EMERGENCY_BROADCAST'
  | 'HOSPITAL_ANNOUNCEMENT'
  | 'ADMIN_DIRECT_SMS'
  | 'CLINIC_CANCELLED';

export type TelcoCarrier = 'GLOBE' | 'SMART' | 'DITO' | 'OTHER';

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  isMock: boolean;
  carrier?: TelcoCarrier;
  latencyMs?: number;
  error?: string;
}

export interface SendSMSOptions {
  phoneNumber: string;
  message: string;
  appointmentId?: string | null;
  recipientName?: string;
  hospitalName?: string;
  notificationType?: NotificationType;
}

export class SemaphoreService {
  private static getApiKey(): string | undefined {
    if (process.env.SEMAPHORE_API_KEY) return process.env.SEMAPHORE_API_KEY;
    if (process.env.NODE_ENV !== 'production') {
      try {
        const fs = require('fs');
        const path = require('path');
        const candidates = [
          path.resolve(process.cwd(), '.env.local'),
          path.resolve(process.cwd(), 'app/clinic-natin/.env.local'),
        ];
        for (const envPath of candidates) {
          if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const match = content.match(/SEMAPHORE_API_KEY=([^\r\n]+)/);
            if (match && match[1]) return match[1].trim();
          }
        }
      } catch {
        // ignore
      }
    }
    return undefined;
  }

  private static getSenderName(): string {
    if (process.env.SEMAPHORE_SENDER_NAME) return process.env.SEMAPHORE_SENDER_NAME;
    if (process.env.NODE_ENV !== 'production') {
      try {
        const fs = require('fs');
        const path = require('path');
        const candidates = [
          path.resolve(process.cwd(), '.env.local'),
          path.resolve(process.cwd(), 'app/clinic-natin/.env.local'),
        ];
        for (const envPath of candidates) {
          if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const match = content.match(/SEMAPHORE_SENDER_NAME=([^\r\n]+)/);
            if (match && match[1]) return match[1].trim();
          }
        }
      } catch {
        // ignore
      }
    }
    return 'CLINICNATIN';
  }

  /**
   * Detects Philippine mobile network carrier from phone prefix
   */
  static detectTelcoCarrier(phoneNumber: string): TelcoCarrier {
    const clean = phoneNumber.replace(/^\+63/, '0').replace(/[\s-]/g, '');
    const prefix = clean.substring(0, 4);

    // Globe Telecom & TM
    const globePrefixes = [
      '0905', '0906', '0915', '0916', '0917', '0926', '0927',
      '0935', '0936', '0945', '0955', '0956', '0965', '0966',
      '0967', '0975', '0977', '0995', '0997',
    ];

    // Smart Communications, TNT & Sun
    const smartPrefixes = [
      '0908', '0918', '0919', '0920', '0921', '0928', '0929',
      '0938', '0939', '0946', '0947', '0948', '0949', '0950',
      '0951', '0961', '0963', '0968', '0969', '0970', '0981',
      '0998', '0999', '0922', '0923', '0925', '0932', '0933',
      '0934', '0942', '0943',
    ];

    // DITO Telecommunity
    const ditoPrefixes = [
      '0991', '0992', '0993', '0994', '0895', '0896', '0897', '0898',
    ];

    if (globePrefixes.includes(prefix)) return 'GLOBE';
    if (smartPrefixes.includes(prefix)) return 'SMART';
    if (ditoPrefixes.includes(prefix)) return 'DITO';
    return 'OTHER';
  }

  /**
   * Fetches account balance and status from Semaphore.
   * If SEMAPHORE_API_KEY is not configured, returns realistic sandbox telemetry.
   */
  static async getAccountInfo(): Promise<{
    accountId: string;
    accountName: string;
    status: string;
    creditBalance: number;
    isSandbox: boolean;
    pingMs: number;
  }> {
    const apiKey = this.getApiKey();
    const startTime = Date.now();

    if (!apiKey) {
      return {
        accountId: 'cn-cdo-8821',
        accountName: 'Clinic Natin Cagayan de Oro (Sandbox Gateway)',
        status: 'Online',
        creditBalance: 4820,
        isSandbox: true,
        pingMs: 42,
      };
    }

    try {
      const res = await fetch(`${SEMAPHORE_ACCOUNT_URL}?apikey=${apiKey}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const pingMs = Date.now() - startTime;
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to fetch Semaphore account details');
      }

      return {
        accountId: String(data.account_id || 'cn-cdo'),
        accountName: data.account_name || 'Clinic Natin',
        status: data.status || 'Active',
        creditBalance: Number(data.credit_balance ?? 0),
        isSandbox: false,
        pingMs,
      };
    } catch (err: unknown) {
      console.warn('[SemaphoreService] Account info fallback:', err);
      return {
        accountId: 'cn-cdo-fallback',
        accountName: 'Clinic Natin CDO',
        status: 'Degraded',
        creditBalance: 0,
        isSandbox: false,
        pingMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Dispatches a single SMS message via Semaphore.
   * Logs telemetry and delivery record to notification_logs.
   */
  static async sendSMS(
    phoneNumberOrOptions: string | SendSMSOptions,
    message?: string,
    appointmentId?: string,
    notificationType: NotificationType = 'SLOT_CONFIRMED'
  ): Promise<SMSResponse> {
    let phone: string;
    let text: string;
    let apptId: string | null = null;
    let recipientName: string | undefined;
    let hospitalName: string | undefined;
    let notifType: NotificationType = notificationType;

    if (typeof phoneNumberOrOptions === 'object') {
      phone = phoneNumberOrOptions.phoneNumber;
      text = phoneNumberOrOptions.message;
      apptId = phoneNumberOrOptions.appointmentId || null;
      recipientName = phoneNumberOrOptions.recipientName;
      hospitalName = phoneNumberOrOptions.hospitalName;
      notifType = phoneNumberOrOptions.notificationType || 'SLOT_CONFIRMED';
    } else {
      phone = phoneNumberOrOptions;
      text = message || '';
      apptId = appointmentId || null;
    }

    const apiKey = this.getApiKey();
    const senderName = this.getSenderName();
    const formattedPhone = phone.replace(/^\+63/, '0').replace(/[\s-]/g, '');
    const carrier = this.detectTelcoCarrier(formattedPhone);

    const startTime = Date.now();

    // 1. Sandbox Mock Mode if no API key is provided
    if (!apiKey) {
      // Simulate realistic telco carrier transit time: 900ms - 1350ms
      const simulatedLatency = Math.floor(Math.random() * 450) + 900;

      const mockResponse = {
        mock: true,
        network: carrier === 'GLOBE' ? 'Globe Telecom' : carrier === 'SMART' ? 'Smart Communications' : 'DITO Telecommunity',
        timestamp: new Date().toISOString(),
      };

      try {
        const supabase = await createServerClient();
        await supabase.from('notification_logs').insert({
          appointment_id: apptId,
          recipient_phone: formattedPhone,
          recipient_name: recipientName || 'Queued Patient',
          hospital_name: hospitalName || 'CDO Outpatient Clinic',
          notification_type: notifType,
          message_body: text,
          gateway_provider: 'SEMAPHORE',
          gateway_response: mockResponse,
          status: 'DELIVERED',
          latency_ms: simulatedLatency,
          telco_carrier: carrier,
          sent_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('[Semaphore SMS] DB log warning:', dbErr);
      }

      return {
        success: true,
        messageId: `mock_sms_${Date.now()}`,
        isMock: true,
        carrier,
        latencyMs: simulatedLatency,
      };
    }

    // 2. Live Semaphore API Dispatch
    try {
      const res = await fetch(SEMAPHORE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          apikey: apiKey,
          number: formattedPhone,
          message: text,
          sendername: senderName,
        }),
      });

      const latencyMs = Date.now() - startTime;
      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData?.message || 'Semaphore dispatch failed');
      }

      const supabase = await createServerClient();
      await supabase.from('notification_logs').insert({
        appointment_id: apptId,
        recipient_phone: formattedPhone,
        recipient_name: recipientName,
        hospital_name: hospitalName,
        notification_type: notifType,
        message_body: text,
        gateway_provider: 'SEMAPHORE',
        gateway_response: resData,
        status: 'SENT',
        latency_ms: latencyMs,
        telco_carrier: carrier,
        sent_at: new Date().toISOString(),
      });

      return {
        success: true,
        messageId: resData[0]?.message_id ? String(resData[0].message_id) : undefined,
        isMock: false,
        carrier,
        latencyMs,
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const errMsg = err instanceof Error ? err.message : 'Unknown SMS error';
      console.error('[SemaphoreService] Send failed:', err);

      try {
        const supabase = await createServerClient();
        await supabase.from('notification_logs').insert({
          appointment_id: apptId,
          recipient_phone: formattedPhone,
          recipient_name: recipientName,
          hospital_name: hospitalName,
          notification_type: notifType,
          message_body: text,
          gateway_provider: 'SEMAPHORE',
          gateway_response: { error: errMsg },
          status: 'FAILED',
          latency_ms: latencyMs,
          telco_carrier: carrier,
          sent_at: new Date().toISOString(),
        });
      } catch (logErr) {
        console.warn('[SemaphoreService] Failed to record error log:', logErr);
      }

      return {
        success: false,
        isMock: false,
        carrier,
        latencyMs,
        error: errMsg,
      };
    }
  }

  /**
   * Batch Broadcast Dispatcher:
   * Sends notifications to multiple active patients and records individual delivery logs.
   */
  static async sendBroadcastSMS(
    recipients: {
      phone: string;
      name?: string;
      hospital?: string;
      appointmentId?: string;
    }[],
    message: string,
    notificationType: NotificationType = 'EMERGENCY_BROADCAST'
  ): Promise<{
    totalRecipients: number;
    deliveredCount: number;
    failedCount: number;
    avgLatencyMs: number;
  }> {
    let delivered = 0;
    let failed = 0;
    let totalLatency = 0;

    for (const recipient of recipients) {
      if (!recipient.phone) continue;
      const res = await this.sendSMS({
        phoneNumber: recipient.phone,
        message,
        appointmentId: recipient.appointmentId,
        recipientName: recipient.name,
        hospitalName: recipient.hospital,
        notificationType,
      });

      totalLatency += res.latencyMs || 1100;
      if (res.success) {
        delivered++;
      } else {
        failed++;
      }
    }

    const total = delivered + failed;
    return {
      totalRecipients: recipients.length,
      deliveredCount: delivered,
      failedCount: failed,
      avgLatencyMs: total > 0 ? Math.round(totalLatency / total) : 0,
    };
  }

  /**
   * Retries a previously failed notification log entry
   */
  static async retrySMS(notificationLogId: string): Promise<SMSResponse> {
    const supabase = await createServerClient();
    const { data: log, error } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('id', notificationLogId)
      .single();

    if (error || !log) {
      throw new Error('Notification log record not found');
    }

    const res = await this.sendSMS({
      phoneNumber: log.recipient_phone,
      message: log.message_body,
      appointmentId: log.appointment_id,
      recipientName: log.recipient_name,
      hospitalName: log.hospital_name,
      notificationType: log.notification_type,
    });

    if (res.success) {
      await supabase
        .from('notification_logs')
        .update({
          status: 'DELIVERED',
          retry_count: (log.retry_count || 0) + 1,
          latency_ms: res.latencyMs,
          gateway_response: { retried: true, at: new Date().toISOString() },
        })
        .eq('id', notificationLogId);
    }

    return res;
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
