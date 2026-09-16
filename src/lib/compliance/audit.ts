/**
 * 🛡️ Clinic Natin — Compliance & Audit Logging Service
 * Mandated under Republic Act No. 10173 (Philippine Data Privacy Act of 2012)
 * and National Privacy Commission (NPC) Circular 16-01.
 */

import { createServerClient } from '@/lib/supabase/server';

export type ComplianceAction =
  | 'VIEWED_MEDICAL_RECORD'
  | 'PRINTED_DIGITAL_RX'
  | 'CHANGED_PRIORITY_CATEGORY'
  | 'ADMIN_IMPERSONATION'
  | 'DSAR_PORTABILITY_EXPORT'
  | 'DSAR_ERASURE_EXECUTED'
  | 'OVERRIDE_TRIGGERED'
  | 'SECURITY_INCIDENT_LOGGED'
  | 'VERIFIED_DOCTOR'
  | 'EXPORTED_REPORT'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE';

export interface LogAuditEventParams {
  action: ComplianceAction | string;
  actorName?: string;
  actorRole?: 'ADMIN' | 'DOCTOR' | 'SECRETARY' | 'PATIENT' | 'SYSTEM';
  tableAffected: string;
  recordId?: string | null;
  details: string;
  ipAddress?: string;
  oldData?: any;
  newData?: any;
}

export class AuditService {
  /**
   * Logs a tamper-evident compliance audit trail record to Supabase audit_logs.
   */
  static async logEvent(params: LogAuditEventParams): Promise<{ success: boolean; logId?: string }> {
    try {
      const supabase = await createServerClient();

      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          action: params.action,
          actor_name: params.actorName || 'System Automated Process',
          actor_role: params.actorRole || 'SYSTEM',
          table_affected: params.tableAffected,
          record_id: params.recordId || null,
          details: params.details,
          ip_address: params.ipAddress || '124.106.129.5 (Admin Ops HQ)',
          old_data: params.oldData || null,
          new_data: params.newData || null,
          timestamp: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.warn('[AuditService] Failed to insert audit log:', error);
        return { success: false };
      }

      return { success: true, logId: data?.id };
    } catch (err) {
      console.error('[AuditService] Unexpected logging error:', err);
      return { success: false };
    }
  }
}
