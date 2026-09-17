'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface DoctorData {
  id: string; // doctor uuid
  profileId: string;
  name: string;
  title: string;
  specialty: string;
  subspecialty: string | null;
  prcLicense: string;
  ptrNumber: string | null;
  s2License: string | null;
  consultationFeeDefault: number;
  hmoAccreditations: string[];
  subscriptionTier: 'free' | 'pro';
  hospitalAffiliation: string | null;
  roomAssignment: string | null;
  email: string;
  isVerified: boolean;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'RE_UPLOAD_REQUESTED' | 'REVOKED';
}

export interface ClinicRoom {
  id: string; // schedule id or clinic id
  clinicId: string;
  hospital: string;
  clinicName: string;
  room: string;
  schedule: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  maxPatients?: number;
  isPrimary: boolean;
}

export interface ActiveSession {
  id: string;
  doctor_id: string;
  clinic_id: string;
  session_date: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  current_serving_number: number;
  announcement_notice: string | null;
}

interface DoctorContextValue {
  doctor: DoctorData | null;
  clinicRooms: ClinicRoom[];
  selectedRoom: ClinicRoom | null;
  setSelectedRoom: (room: ClinicRoom) => void;
  activeSession: ActiveSession | null;
  refreshDoctorData: () => Promise<void>;
  pauseSession: (reason?: string, notifyRemaining?: boolean) => Promise<boolean>;
  resumeSession: () => Promise<boolean>;
  endSession: (isEmergency?: boolean, notifyRemaining?: boolean) => Promise<boolean>;
  loading: boolean;
}

const DEFAULT_DOCTOR: DoctorData = {
  id: 'a4e0ccd5-4d44-4bd8-93bc-e2a4eb9d5f2e',
  profileId: '246b2fff-c51d-4019-8332-cb27ab9ec643',
  name: 'Dr. Maria Santos, MD, FPCP',
  title: 'Dr.',
  specialty: 'Internal Medicine',
  subspecialty: 'Adult Cardiology',
  prcLicense: '0108742',
  ptrNumber: '8892145A',
  s2License: 'S2-984210',
  consultationFeeDefault: 600,
  hmoAccreditations: ['Maxicare', 'Intellicare', 'Medicard', 'PhilHealth'],
  subscriptionTier: 'pro',
  hospitalAffiliation: 'Maria Reyna XU Hospital',
  roomAssignment: 'Room 304',
  email: 'maria.santos@clinicnatin.ph',
  isVerified: true,
  verificationStatus: 'VERIFIED',
};

const DEFAULT_ROOMS: ClinicRoom[] = [
  {
    id: 'room-1',
    clinicId: 'maria-reyna',
    hospital: 'Maria Reyna - Xavier University Hospital',
    clinicName: 'Medical Arts Building',
    room: 'Room 304',
    schedule: 'Mon, Wed, Fri · 08:30 - 13:30',
    isPrimary: true,
  },
  {
    id: 'room-2',
    clinicId: 'polymedic-plaza',
    hospital: 'Cagayan de Oro Polymedic Medical Plaza',
    clinicName: 'Specialist Clinic Wing',
    room: 'Room 210',
    schedule: 'Tue, Thu, Sat · 13:00 - 17:30',
    isPrimary: false,
  },
];

const DoctorContext = createContext<DoctorContextValue>({
  doctor: DEFAULT_DOCTOR,
  clinicRooms: DEFAULT_ROOMS,
  selectedRoom: DEFAULT_ROOMS[0],
  setSelectedRoom: () => {},
  activeSession: null,
  refreshDoctorData: async () => {},
  pauseSession: async () => false,
  resumeSession: async () => false,
  endSession: async () => false,
  loading: true,
});

export function DoctorProvider({ children }: { children: React.ReactNode }) {
  const [doctor, setDoctor] = useState<DoctorData | null>(null);
  const [clinicRooms, setClinicRooms] = useState<ClinicRoom[]>(DEFAULT_ROOMS);
  const [selectedRoom, setSelectedRoomState] = useState<ClinicRoom | null>(DEFAULT_ROOMS[0]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchDoctorData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let matchedDoctorRow: any = null;
      let matchedProfileRow: any = null;

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();

        matchedProfileRow = profile;

        if (profile) {
          const { data: doc } = await supabase
            .from('doctors')
            .select('*')
            .eq('profile_id', profile.id)
            .maybeSingle();
          matchedDoctorRow = doc;
        }
      }

      // If no live doctor row by auth_id, check default doctor Maria Santos or first doctor in table
      if (!matchedDoctorRow) {
        const { data: firstDoc } = await supabase
          .from('doctors')
          .select('*, profiles:profile_id(*)')
          .limit(1)
          .maybeSingle();

        if (firstDoc) {
          matchedDoctorRow = firstDoc;
          matchedProfileRow = firstDoc.profiles;
        }
      }

      if (matchedDoctorRow) {
        const docData: DoctorData = {
          id: matchedDoctorRow.id,
          profileId: matchedDoctorRow.profile_id,
          name: matchedProfileRow?.full_name || 'Dr. Maria Santos, MD',
          title: matchedDoctorRow.title || 'Dr.',
          specialty: matchedDoctorRow.specialty || 'General Practice',
          subspecialty: matchedDoctorRow.subspecialty || null,
          prcLicense: matchedDoctorRow.prc_license || '0123456',
          ptrNumber: matchedDoctorRow.ptr_number || 'PTR-CDO-2026-00189',
          s2License: matchedDoctorRow.s2_license || 'PDEA-S2-2026-99120',
          consultationFeeDefault: Number(matchedDoctorRow.consultation_fee_default || 600),
          hmoAccreditations: matchedDoctorRow.hmo_accreditations || ['Maxicare', 'Intellicare'],
          subscriptionTier: (matchedDoctorRow.subscription_tier as 'free' | 'pro') || 'pro',
          hospitalAffiliation: matchedDoctorRow.hospital_affiliation || 'Maria Reyna XU Hospital',
          roomAssignment: matchedDoctorRow.room_assignment || 'Room 304',
          email: matchedProfileRow?.phone_number || 'doctor@clinicnatin.ph',
          isVerified:
            matchedDoctorRow.is_verified ??
            (matchedDoctorRow.verification_status === 'VERIFIED'),
          verificationStatus:
            (matchedDoctorRow.verification_status as any) || 'VERIFIED',
        };
        setDoctor(docData);

        // Fetch clinic rooms from doctor_clinic_schedules JOIN clinics
        const { data: schedules } = await supabase
          .from('doctor_clinic_schedules')
          .select('id, clinic_id, day_of_week, start_time, end_time, max_patients, is_active, clinics:clinic_id(*)')
          .eq('doctor_id', matchedDoctorRow.id)
          .eq('is_active', true);

        if (schedules && schedules.length > 0) {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          // Deduplicate by clinic_id so multiple days of week don't repeat the same room
          const clinicGroups = new Map<string, { clinic: any; schedules: any[] }>();

          for (const s of schedules) {
            const cId = s.clinic_id;
            const existing = clinicGroups.get(cId) || { clinic: s.clinics, schedules: [] };
            existing.schedules.push(s);
            clinicGroups.set(cId, existing);
          }

          const mappedRooms: ClinicRoom[] = Array.from(clinicGroups.entries()).map(([clinicId, group], idx) => {
            const clinic = group.clinic;
            const sorted = group.schedules.sort((a, b) => a.day_of_week - b.day_of_week);
            const distinctDays = Array.from(new Set(sorted.map((s) => days[s.day_of_week] || 'Daily'))).join(', ');
            const firstSched = sorted[0];
            const timeSpan = `${firstSched?.start_time?.slice(0, 5)} - ${firstSched?.end_time?.slice(0, 5)}`;

            return {
              id: clinicId,
              clinicId: clinicId,
              hospital: clinic?.hospital_name || clinic?.name || 'CDO Hospital',
              clinicName: clinic?.name || 'Outpatient Suite',
              room: clinic?.room_number || `Room ${idx + 101}`,
              schedule: `${distinctDays} · ${timeSpan}`,
              dayOfWeek: firstSched?.day_of_week,
              startTime: firstSched?.start_time,
              endTime: firstSched?.end_time,
              maxPatients: firstSched?.max_patients || 50,
              isPrimary: idx === 0,
            };
          });

          setClinicRooms(mappedRooms);

          // Restore saved room from localStorage if available
          const savedClinicId =
            typeof window !== 'undefined'
              ? localStorage.getItem('doctor_selected_clinic_id') || localStorage.getItem('doctor_selected_room_id')
              : null;
          const found = mappedRooms.find((r) => r.clinicId === savedClinicId || r.id === savedClinicId);
          setSelectedRoomState(found || mappedRooms[0]);
        } else {
          setClinicRooms(DEFAULT_ROOMS);
          setSelectedRoomState(DEFAULT_ROOMS[0]);
        }

        // Fetch active queue session for this doctor (ACTIVE or PAUSED)
        const { data: session } = await supabase
          .from('queue_sessions')
          .select('*')
          .eq('doctor_id', matchedDoctorRow.id)
          .in('status', ['ACTIVE', 'PAUSED'])
          .order('session_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        setActiveSession(session as ActiveSession | null);
      } else {
        setDoctor(DEFAULT_DOCTOR);
        setClinicRooms(DEFAULT_ROOMS);
        setSelectedRoomState(DEFAULT_ROOMS[0]);
      }
    } catch (err) {
      console.error('Error fetching doctor context:', err);
      setDoctor(DEFAULT_DOCTOR);
      setClinicRooms(DEFAULT_ROOMS);
      setSelectedRoomState(DEFAULT_ROOMS[0]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDoctorData();
  }, [fetchDoctorData]);

  const setSelectedRoom = (room: ClinicRoom) => {
    setSelectedRoomState(room);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doctor_selected_room_id', room.id);
      localStorage.setItem('doctor_selected_clinic_id', room.clinicId);
    }
  };

  const pauseSession = async (reason?: string, notifyRemaining = true): Promise<boolean> => {
    if (!activeSession) return false;
    try {
      const res = await fetch('/api/queue/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          action: 'PAUSE',
          reason: reason || 'Doctor on urgent hospital rounds / checking on confined patient',
          notifyRemaining,
        }),
      });
      if (!res.ok) throw new Error('Pause failed');
      await fetchDoctorData();
      return true;
    } catch (e) {
      console.error('Error pausing session:', e);
      return false;
    }
  };

  const resumeSession = async (): Promise<boolean> => {
    if (!activeSession) return false;
    try {
      const res = await fetch('/api/queue/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          action: 'RESUME',
        }),
      });
      if (!res.ok) throw new Error('Resume failed');
      await fetchDoctorData();
      return true;
    } catch (e) {
      console.error('Error resuming session:', e);
      return false;
    }
  };

  const endSession = async (isEmergency = false, notifyRemaining = true): Promise<boolean> => {
    if (!activeSession) return false;
    try {
      const res = await fetch('/api/queue/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          action: isEmergency ? 'END_EMERGENCY' : 'END_COMPLETED',
          notifyRemaining,
        }),
      });
      if (!res.ok) throw new Error('End session failed');
      setActiveSession(null);
      await fetchDoctorData();
      return true;
    } catch (e) {
      console.error('Error ending session:', e);
      return false;
    }
  };

  return (
    <DoctorContext.Provider
      value={{
        doctor,
        clinicRooms,
        selectedRoom,
        setSelectedRoom,
        activeSession,
        refreshDoctorData: fetchDoctorData,
        pauseSession,
        resumeSession,
        endSession,
        loading,
      }}
    >
      {children}
    </DoctorContext.Provider>
  );
}

export function useDoctor() {
  return useContext(DoctorContext);
}
