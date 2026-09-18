'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SecretaryProfile {
  id: string;
  profile_id: string;
  doctor_id: string;
  full_name: string;
}

export interface DoctorInfo {
  id: string;
  name: string;
  specialty: string;
  title: string;
  consultation_fee: number;
}

export interface ClinicRoom {
  id: string;
  name: string;
  hospital_name: string;
  room_number: string;
  schedule?: string;
}

export type AppointmentStatus =
  | 'BOOKED'
  | 'WAITING'
  | 'SERVING'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'BUFFERED'
  | 'CANCELLED_NO_SHOW';

export type PriorityCategory = 'NONE' | 'SENIOR' | 'PWD' | 'PREGNANT';

export interface Appointment {
  id: string;
  queue_session_id: string;
  patient_id: string | null;
  walk_in_name: string | null;
  walk_in_phone: string | null;
  booking_channel: 'ONLINE' | 'WALK_IN';
  queue_number: number;
  token_code: string;
  status: AppointmentStatus;
  priority_category: PriorityCategory;
  skip_count: number;
  buffered_at: string | null;
  grace_period_deadline: string | null;
  consultation_fee: number;
  clinic_payment_method?: string | null;
  is_paid_to_clinic: boolean;
  created_at: string;
  display_name: string;
  phone_number?: string;
  has_vitals?: boolean;
  medical_record_id?: string | null;
}

export interface QueueSession {
  id: string;
  schedule_id?: string;
  session_date: string;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  current_serving_number: number;
  announcement_notice: string | null;
  last_updated_at: string;
  clinic_id?: string;
  doctor_id?: string;
}

interface SecretaryContextValue {
  secretary: SecretaryProfile | null;
  doctor: DoctorInfo | null;
  clinic: ClinicRoom | null;
  activeSession: QueueSession | null;
  appointments: Appointment[];
  loading: boolean;
  isRealtime: boolean;
  refreshData: () => Promise<void>;
  updateAppointmentPaid: (
    appointmentId: string,
    method: string,
    amount: number,
    meta?: { hmoProvider?: string; hmoCode?: string; idNumber?: string; gcashRef?: string }
  ) => Promise<boolean>;
}

const SecretaryContext = createContext<SecretaryContextValue | undefined>(undefined);

export function SecretaryProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [secretary, setSecretary] = useState<SecretaryProfile | null>(null);
  const [doctor, setDoctor] = useState<DoctorInfo | null>(null);
  const [clinic, setClinic] = useState<ClinicRoom | null>(null);
  const [activeSession, setActiveSession] = useState<QueueSession | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRealtime, setIsRealtime] = useState(false);

  const activeSessionRef = useRef<QueueSession | null>(null);
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  const fetchAppointments = useCallback(async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          queue_session_id,
          patient_id,
          walk_in_name,
          walk_in_phone,
          booking_channel,
          queue_number,
          token_code,
          status,
          priority_category,
          skip_count,
          buffered_at,
          grace_period_deadline,
          consultation_fee,
          clinic_payment_method,
          is_paid_to_clinic,
          created_at,
          profiles:patient_id ( full_name, phone_number )
        `)
        .eq('queue_session_id', sessionId)
        .order('queue_number', { ascending: true });

      if (error) {
        console.error('[SecretaryContext] Error fetching appts:', error.message || error);
        return;
      }

      // Fetch any existing vitals from medical_records for these appointments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apptIds = (data || []).map((r: any) => r.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let medRecMap: Record<string, any> = {};

      if (apptIds.length > 0) {
        const { data: medRecs, error: medError } = await supabase
          .from('medical_records')
          .select('id, appointment_id, vitals')
          .in('appointment_id', apptIds);

        if (!medError && medRecs) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          medRecs.forEach((m: any) => {
            if (m.appointment_id) {
              medRecMap[m.appointment_id] = m;
            }
          });
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: Appointment[] = (data || []).map((row: any) => {
        const isOnline = row.booking_channel === 'ONLINE';
        const profile = row.profiles;
        const displayName =
          profile?.full_name ||
          row.walk_in_name ||
          (isOnline ? `Online Patient #${row.queue_number}` : `Walk-in Patient #${row.queue_number}`);
        const phone = profile?.phone_number || row.walk_in_phone || '';
        const token =
          row.token_code ||
          (isOnline
            ? `CN-ON${String(row.queue_number).padStart(3, '0')}`
            : `CN-WK${String(row.queue_number).padStart(3, '0')}`);

        const medRec = medRecMap[row.id];
        const hasVitals = !!(medRec?.vitals && (medRec.vitals.blood_pressure || medRec.vitals.temperature_c));

        return {
          id: row.id,
          queue_session_id: row.queue_session_id,
          patient_id: row.patient_id,
          walk_in_name: row.walk_in_name,
          walk_in_phone: row.walk_in_phone,
          booking_channel: row.booking_channel || (row.walk_in_name ? 'WALK_IN' : 'ONLINE'),
          queue_number: row.queue_number,
          token_code: token,
          status: row.status,
          priority_category: row.priority_category || 'NONE',
          skip_count: row.skip_count || 0,
          buffered_at: row.buffered_at,
          grace_period_deadline: row.grace_period_deadline,
          consultation_fee: row.consultation_fee || 0,
          clinic_payment_method: row.clinic_payment_method || null,
          is_paid_to_clinic: !!row.is_paid_to_clinic,
          created_at: row.created_at,
          display_name: displayName,
          phone_number: phone,
          has_vitals: hasVitals,
          medical_record_id: medRec?.id || null,
        };
      });

      setAppointments(mapped);
    } catch (err) {
      console.error('[SecretaryContext] Failed fetching appointments:', err);
    }
  }, [supabase]);

  const refreshData = useCallback(async () => {
    try {
      // 1. Check logged in user profile
      const { data: { user } } = await supabase.auth.getUser();
      let doctorId: string | null = null;
      let secretaryObj: SecretaryProfile | null = null;

      if (user) {
        const { data: secData } = await supabase
          .from('secretaries')
          .select('id, profile_id, doctor_id, is_active, profiles:profile_id ( full_name )')
          .eq('profile_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (secData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = (secData as any).profiles;
          secretaryObj = {
            id: secData.id,
            profile_id: secData.profile_id,
            doctor_id: secData.doctor_id,
            full_name: p?.full_name || 'Clinic Secretary',
          };
          setSecretary(secretaryObj);
          doctorId = secData.doctor_id;
        }
      }

      // If no explicit secretary found, check first active doctor as default practice
      if (!doctorId) {
        const { data: firstDoc } = await supabase
          .from('doctors')
          .select('id, title, specialty, consultation_fee, profiles ( full_name )')
          .limit(1)
          .maybeSingle();

        if (firstDoc) {
          doctorId = firstDoc.id;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const prof = (firstDoc as any).profiles;
          setDoctor({
            id: firstDoc.id,
            name: prof?.full_name || 'Dr. Maria Santos',
            specialty: firstDoc.specialty || 'Internal Medicine / Cardiology',
            title: firstDoc.title || 'MD, FPCP, FPCC',
            consultation_fee: Number(firstDoc.consultation_fee) || 600,
          });
        }
      } else {
        const { data: docData } = await supabase
          .from('doctors')
          .select('id, title, specialty, consultation_fee, profiles ( full_name )')
          .eq('id', doctorId)
          .single();

        if (docData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const prof = (docData as any).profiles;
          setDoctor({
            id: docData.id,
            name: prof?.full_name || 'Attending Physician',
            specialty: docData.specialty || 'Specialist',
            title: docData.title || 'MD',
            consultation_fee: Number(docData.consultation_fee) || 600,
          });
        }
      }

      // 2. Fetch today's session (ACTIVE or PAUSED, or most recent today)
      let sessQuery = supabase
        .from('queue_sessions')
        .select(`
          id,
          schedule_id,
          session_date,
          status,
          current_serving_number,
          announcement_notice,
          last_updated_at,
          clinic_id,
          doctor_id,
          clinics:clinic_id ( id, name, hospital_name, room_number )
        `)
        .in('status', ['ACTIVE', 'PAUSED'])
        .order('last_updated_at', { ascending: false });

      if (doctorId) {
        sessQuery = sessQuery.eq('doctor_id', doctorId);
      }

      const { data: sessionData } = await sessQuery.limit(1).maybeSingle();

      if (sessionData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sd = sessionData as any;
        const currentSession: QueueSession = {
          id: sd.id,
          schedule_id: sd.schedule_id,
          session_date: sd.session_date,
          status: sd.status,
          current_serving_number: sd.current_serving_number || 0,
          announcement_notice: sd.announcement_notice,
          last_updated_at: sd.last_updated_at,
          clinic_id: sd.clinic_id,
          doctor_id: sd.doctor_id,
        };
        setActiveSession(currentSession);

        if (sd.clinics) {
          setClinic({
            id: sd.clinics.id,
            name: sd.clinics.name,
            hospital_name: sd.clinics.hospital_name,
            room_number: sd.clinics.room_number,
          });
        }

        await fetchAppointments(currentSession.id);
      } else {
        // Fallback demo session or query by doctor
        const { data: fallbackSession } = await supabase
          .from('queue_sessions')
          .select(`
            id,
            schedule_id,
            session_date,
            status,
            current_serving_number,
            announcement_notice,
            last_updated_at,
            clinic_id,
            doctor_id,
            clinics:clinic_id ( id, name, hospital_name, room_number )
          `)
          .order('session_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fallbackSession) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fs = fallbackSession as any;
          const currentSession: QueueSession = {
            id: fs.id,
            schedule_id: fs.schedule_id,
            session_date: fs.session_date,
            status: fs.status,
            current_serving_number: fs.current_serving_number || 0,
            announcement_notice: fs.announcement_notice,
            last_updated_at: fs.last_updated_at,
            clinic_id: fs.clinic_id,
            doctor_id: fs.doctor_id,
          };
          setActiveSession(currentSession);
          if (fs.clinics) {
            setClinic({
              id: fs.clinics.id,
              name: fs.clinics.name,
              hospital_name: fs.clinics.hospital_name,
              room_number: fs.clinics.room_number,
            });
          }
          await fetchAppointments(currentSession.id);
        } else {
          setActiveSession(null);
          setAppointments([]);
        }
      }
    } catch (err) {
      console.error('[SecretaryContext] Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchAppointments]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Realtime subscription
  useEffect(() => {
    if (!activeSession?.id) return;

    const channel: RealtimeChannel = supabase
      .channel(`secretary-portal-sync:${activeSession.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `queue_session_id=eq.${activeSession.id}`,
        },
        () => {
          if (activeSessionRef.current) {
            fetchAppointments(activeSessionRef.current.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'queue_sessions',
          filter: `id=eq.${activeSession.id}`,
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updated = payload.new as any;
          setActiveSession((prev) =>
            prev
              ? {
                  ...prev,
                  status: updated.status ?? prev.status,
                  current_serving_number: updated.current_serving_number ?? prev.current_serving_number,
                  announcement_notice: updated.announcement_notice ?? prev.announcement_notice,
                }
              : prev
          );
        }
      )
      .subscribe((status) => {
        setIsRealtime(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSession?.id, supabase, fetchAppointments]);

  const updateAppointmentPaid = async (
    appointmentId: string,
    method: string,
    amount: number,
    meta?: { hmoProvider?: string; hmoCode?: string; idNumber?: string; gcashRef?: string }
  ) => {
    try {
      // Map UI payment method values to DB enum values
      const dbMethodMap: Record<string, string> = {
        CASH: 'CASH',
        GCASH: 'CASH',         // GCash stored as CASH category; reference saved in notes
        HMO: 'HMO',
        FREE: 'FREE_FOLLOWUP', // DB enum uses FREE_FOLLOWUP
        CARD: 'CARD',
        PHILHEALTH: 'PHILHEALTH',
      };
      const dbMethod = dbMethodMap[method.toUpperCase()] ?? 'CASH';

      // Build a metadata notes string to store provenance
      const notesParts: string[] = [];
      if (method === 'GCASH' && meta?.gcashRef) notesParts.push(`GCash Ref: ${meta.gcashRef}`);
      if (method === 'HMO' && meta?.hmoProvider) notesParts.push(`HMO: ${meta.hmoProvider}`);
      if (method === 'HMO' && meta?.hmoCode) notesParts.push(`GL Code: ${meta.hmoCode}`);
      if (meta?.idNumber) notesParts.push(`Discount ID: ${meta.idNumber}`);
      const paymentNotes = notesParts.length > 0 ? notesParts.join(' | ') : null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatePayload: Record<string, any> = {
        is_paid_to_clinic: true,
        clinic_payment_method: dbMethod,
        consultation_fee: amount,
      };
      // Only set notes if the column exists in the live DB (graceful)
      if (paymentNotes) {
        updatePayload.payment_notes = paymentNotes;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', appointmentId);

      if (error) {
        // If payment_notes column doesn't exist, retry without it
        if (error.message?.includes('payment_notes')) {
          delete updatePayload.payment_notes;
          const { error: retryError } = await supabase
            .from('appointments')
            .update(updatePayload)
            .eq('id', appointmentId);
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointmentId
            ? { ...a, is_paid_to_clinic: true, clinic_payment_method: dbMethod, consultation_fee: amount }
            : a
        )
      );
      return true;
    } catch (err) {
      console.error('[SecretaryContext] updateAppointmentPaid failed:', err);
      return false;
    }
  };

  return (
    <SecretaryContext.Provider
      value={{
        secretary,
        doctor,
        clinic,
        activeSession,
        appointments,
        loading,
        isRealtime,
        refreshData,
        updateAppointmentPaid,
      }}
    >
      {children}
    </SecretaryContext.Provider>
  );
}

export function useSecretary() {
  const ctx = useContext(SecretaryContext);
  if (!ctx) {
    throw new Error('useSecretary must be used within a SecretaryProvider');
  }
  return ctx;
}
