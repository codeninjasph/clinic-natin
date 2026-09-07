'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Settings, Bell, Ticket, Activity, FileText, Pill,
  ChevronDown, ChevronRight, Calendar, MapPin, Stethoscope,
  RefreshCw, Search, AlertCircle, CheckCircle2,
  Phone, HeartPulse,
  Printer, ShieldCheck, Check, Volume2, VolumeX,
  ExternalLink, LogOut, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// shadcn/ui primitives
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  DigitalHealthPassportCard,
  DigitalHealthPassportData
} from '@/components/patient/DigitalHealthPassportCard';
import { DigitalHealthPassportDialog } from '@/components/patient/DigitalHealthPassportDialog';


// ============================================================================
// Types
// ============================================================================

type AppointmentStatus = 'BOOKED' | 'WAITING' | 'SERVING' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED_NO_SHOW';
type QueueSessionStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
type ItemType = 'MEDICATION' | 'LAB_TEST' | 'IMAGING' | 'PROCEDURE';

interface UserProfile {
  id: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  avatar_url: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_type?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  allergies?: string[] | null;
  comorbidities?: string[] | null;
  maintenance_meds?: string[] | null;
  priority_category?: string | null;
  priority_id_number?: string | null;
  hmo_provider?: string | null;
  hmo_card_number?: string | null;
  philhealth_number?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  is_onboarding_completed?: boolean | null;
}

interface QueueSession {
  id: string;
  status: QueueSessionStatus;
  current_serving_number: number;
  session_date: string;
  announcement_notice: string | null;
}

interface ActiveAppointment {
  id: string;
  queue_session_id: string;
  queue_number: number;
  token_code: string;
  status: AppointmentStatus;
  priority_category: string;
  estimated_call_time: string | null;
  created_at: string;
  queue_session: QueueSession;
  doctor_title: string;
  doctor_specialty: string;
  doctor_name: string;
  hospital_name: string;
  room_number: string;
}

interface Prescription {
  id: string;
  item_type: ItemType;
  details: string;
  instructions: string | null;
  generic_name?: string | null;
  brand_name?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  is_digital_copy_sent?: boolean;
}

interface MedicalRecord {
  id: string;
  created_at: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  icd10_code?: string | null;
  followup_date: string | null;
  vitals: {
    blood_pressure?: string;
    heart_rate?: number | null;
    temperature_c?: number | null;
    weight_kg?: number | null;
    height_cm?: number | null;
    bmi?: number | null;
    oxygen_saturation?: number | null;
  } | null;
  doctor_name: string;
  doctor_title: string;
  doctor_specialty: string;
  consultation_date: string | null;
  prescriptions: Prescription[];
}

interface PatientNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'queue' | 'broadcast' | 'medical' | 'profile';
  isRead: boolean;
}

// Raw Supabase shapes
type RawActiveAppointment = {
  id: string;
  queue_session_id: string;
  queue_number: number;
  token_code: string;
  status: string;
  priority_category: string;
  estimated_call_time: string | null;
  created_at: string;
  queue_sessions: {
    id: string;
    status: string;
    current_serving_number: number;
    session_date: string;
    announcement_notice: string | null;
    doctors: {
      title: string;
      specialty: string;
      profiles: { full_name: string } | null;
    } | null;
    clinics: { hospital_name: string; room_number: string } | null;
  } | null;
};

type RawMedicalRecord = {
  id: string;
  created_at: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  followup_date: string | null;
  icd10_code?: string | null;
  vitals: Record<string, unknown> | null;
  doctors: {
    title: string;
    specialty: string;
    profiles: { full_name: string } | null;
  } | null;
  appointments: { created_at: string } | null;
  prescriptions_lab_requests: {
    id: string;
    item_type: string;
    details: string;
    instructions: string | null;
    generic_name?: string | null;
    brand_name?: string | null;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    is_digital_copy_sent?: boolean;
  }[];
};

// ============================================================================
// Utilities
// ============================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function computeAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const diff = Date.now() - birth.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function cmToFtIn(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

const NOTIF_STORAGE_KEY = 'clinic_natin_read_notif_ids';

function getStoredReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveStoredReadIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error('Failed to save read notifications:', e);
  }
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function PatientDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeAppointments, setActiveAppointments] = useState<ActiveAppointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingActive, setIsLoadingActive] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Modals state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const [selectedRxRecord, setSelectedRxRecord] = useState<MedicalRecord | null>(null);

  // Settings form local edits
  const [settingsTab, setSettingsTab] = useState<'passport' | 'hmo' | 'emergency' | 'alerts' | 'account'>('passport');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);

  // Standardized Digital Health Passport data
  const passportData: DigitalHealthPassportData = useMemo(() => {
    const patientIdCode = profile?.id
      ? `CN-P${profile.id.replace(/-/g, '').slice(0, 5).toUpperCase()}`
      : 'CN-P8821';

    const bmiVal =
      profile?.weight_kg && profile?.height_cm
        ? (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)
        : null;

    return {
      patientName: profile?.full_name || 'Dianne Pondoc',
      patientIdCode,
      bloodType: profile?.blood_type || 'A+',
      bmi: bmiVal || '21.2',
      priorityCategory: profile?.priority_category || 'Regular',
      hmoProvider: profile?.hmo_provider || 'Maxicare',
      allergies: profile?.allergies || [],
      comorbidities: profile?.comorbidities || [],
      heightCm: profile?.height_cm || 155,
      weightKg: profile?.weight_kg || 51,
      clinicTag: 'CDO Outpatient',
    };
  }, [profile]);


  // Editable settings fields
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  const [priorityCategory, setPriorityCategory] = useState('NONE');
  const [priorityIdNumber, setPriorityIdNumber] = useState('');
  const [hmoProvider, setHmoProvider] = useState('');
  const [hmoCardNumber, setHmoCardNumber] = useState('');
  const [philhealthNumber, setPhilhealthNumber] = useState('');
  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState(true);
  const [soundChimeEnabled, setSoundChimeEnabled] = useState(true);
  const [advanceWarningCount, setAdvanceWarningCount] = useState('2');

  // Medical record filter
  const [recordFilter, setRecordFilter] = useState<'ALL' | 'MEDICATION' | 'LAB_TEST'>('ALL');

  // Notifications state (synced with localStorage)
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const supabase = createClient();

  // Transform helpers
  function transformActiveAppt(row: RawActiveAppointment): ActiveAppointment | null {
    const qs = row.queue_sessions;
    if (!qs) return null;
    return {
      id: row.id,
      queue_session_id: row.queue_session_id,
      queue_number: row.queue_number,
      token_code: row.token_code,
      status: row.status as AppointmentStatus,
      priority_category: row.priority_category,
      estimated_call_time: row.estimated_call_time,
      created_at: row.created_at,
      queue_session: {
        id: qs.id,
        status: qs.status as QueueSessionStatus,
        current_serving_number: qs.current_serving_number,
        session_date: qs.session_date,
        announcement_notice: qs.announcement_notice,
      },
      doctor_title: qs.doctors?.title ?? 'Dr.',
      doctor_specialty: qs.doctors?.specialty ?? 'General Practice',
      doctor_name: qs.doctors?.profiles?.full_name ?? 'Attending Doctor',
      hospital_name: qs.clinics?.hospital_name ?? 'Maria Reyna XU Hospital',
      room_number: qs.clinics?.room_number ?? '304',
    };
  }

  function transformRecord(row: RawMedicalRecord): MedicalRecord {
    return {
      id: row.id,
      created_at: row.created_at,
      chief_complaint: row.chief_complaint,
      diagnosis: row.diagnosis,
      icd10_code: row.icd10_code,
      followup_date: row.followup_date,
      vitals: row.vitals as MedicalRecord['vitals'],
      doctor_title: row.doctors?.title ?? 'Dr.',
      doctor_name: row.doctors?.profiles?.full_name ?? 'Attending Doctor',
      doctor_specialty: row.doctors?.specialty ?? 'Internal Medicine',
      consultation_date: row.appointments?.created_at ?? row.created_at,
      prescriptions: (row.prescriptions_lab_requests ?? []).map((rx) => ({
        id: rx.id,
        item_type: rx.item_type as ItemType,
        details: rx.details,
        instructions: rx.instructions,
        generic_name: rx.generic_name,
        brand_name: rx.brand_name,
        dosage: rx.dosage,
        frequency: rx.frequency,
        duration: rx.duration,
        is_digital_copy_sent: rx.is_digital_copy_sent,
      })),
    };
  }

  // 100% Wired to Supabase Database
  const fetchMedicalRecords = useCallback(async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          id, created_at, chief_complaint, diagnosis, followup_date, icd10_code, vitals,
          doctors!doctor_id (
            title, specialty,
            profiles!profile_id ( full_name )
          ),
          appointments!appointment_id ( created_at ),
          prescriptions_lab_requests (
            id, item_type, details, instructions, generic_name, brand_name, dosage, frequency, duration, is_digital_copy_sent
          )
        `)
        .eq('patient_id', profileId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMedicalRecords((data as unknown as RawMedicalRecord[]).map(transformRecord));
      } else if (error) {
        console.error('Error fetching medical records:', error);
      }
    } catch (e) {
      console.error('Medical records fetch failure:', e);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [supabase]);

  const fetchActiveAppointments = useCallback(async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, queue_session_id, queue_number, token_code, status, priority_category, estimated_call_time, created_at,
          queue_sessions!queue_session_id (
            id, status, current_serving_number, session_date, announcement_notice,
            doctors!doctor_id ( title, specialty, profiles!profile_id ( full_name ) ),
            clinics!clinic_id ( hospital_name, room_number )
          )
        `)
        .eq('patient_id', profileId)
        .in('status', ['BOOKED', 'WAITING', 'SERVING'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        const transformed = (data as unknown as RawActiveAppointment[])
          .map(transformActiveAppt)
          .filter((a): a is ActiveAppointment => a !== null);
        setActiveAppointments(transformed);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error('Error fetching active appointments:', e);
    } finally {
      setIsLoadingActive(false);
    }
  }, [supabase]);

  // Initial Load
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();

      let profileId: string | null = null;

      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (!profileError && profileData) {
          if (profileData.is_onboarding_completed === false || profileData.is_onboarding_completed === null) {
            router.push('/onboarding');
            return;
          }
          const p = profileData as UserProfile;
          setProfile(p);
          profileId = p.id;
          populateSettingsForm(p);
        }
      }

      // Check if demo user is active in localStorage
      if (!profileId && typeof window !== 'undefined') {
        const demoUserJson = localStorage.getItem('clinic_natin_demo_user');
        const demoRole = localStorage.getItem('clinic_natin_demo_role');
        if (demoUserJson || demoRole === 'PATIENT') {
          // Fetch full Andres Bonifacio profile from database
          const { data: demoDbProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', 'fbd0825e-9298-4eb9-b3b7-eca4ec515f14')
            .maybeSingle();

          if (demoDbProfile) {
            const p = demoDbProfile as UserProfile;
            setProfile(p);
            profileId = p.id;
            populateSettingsForm(p);
          } else {
            const fallback: UserProfile = {
              id: 'fbd0825e-9298-4eb9-b3b7-eca4ec515f14',
              full_name: 'Andres Bonifacio',
              phone_number: '+639171110001',
              email: 'patient@clinicnatin.ph',
              avatar_url: null,
              blood_type: 'O+',
              weight_kg: 68.5,
              height_cm: 170.0,
              allergies: ['Penicillin', 'Sulfa Drugs'],
              comorbidities: ['Hypertension'],
              maintenance_meds: ['Amlodipine 5mg'],
              priority_category: 'SENIOR',
              priority_id_number: 'OSCA-CDO-2023-8821',
              hmo_provider: 'PhilHealth Konsulta',
              emergency_contact_name: 'Gregoria de Jesus',
              emergency_contact_relationship: 'Spouse',
              emergency_contact_phone: '+639178889999',
              is_onboarding_completed: true,
            };
            setProfile(fallback);
            profileId = fallback.id;
            populateSettingsForm(fallback);
          }
        }
      }

      if (profileId) {
        await Promise.all([
          fetchActiveAppointments(profileId),
          fetchMedicalRecords(profileId),
        ]);
      } else {
        // Query token parameter e.g. /my-queue?token=CN-A109
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const tokenQuery = urlParams?.get('token');

        if (tokenQuery) {
          const { data: apptData } = await supabase
            .from('appointments')
            .select(`
              id, queue_session_id, queue_number, token_code, status, priority_category, estimated_call_time, created_at,
              queue_sessions!queue_session_id (
                id, status, current_serving_number, session_date, announcement_notice,
                doctors!doctor_id ( title, specialty, profiles!profile_id ( full_name ) ),
                clinics!clinic_id ( hospital_name, room_number )
              )
            `)
            .eq('token_code', tokenQuery)
            .maybeSingle();

          if (apptData) {
            const transformed = transformActiveAppt(apptData as unknown as RawActiveAppointment);
            if (transformed) {
              setActiveAppointments([transformed]);
              setLastUpdated(new Date());
            }
          }
        }
        setIsLoadingActive(false);
        setIsLoadingRecords(false);
      }
      setIsLoadingProfile(false);
    }
    init();
  }, [supabase, router, fetchActiveAppointments, fetchMedicalRecords]);

  function populateSettingsForm(p: UserProfile) {
    setEmergencyName(p.emergency_contact_name || '');
    setEmergencyPhone(p.emergency_contact_phone || '');
    setEmergencyRelationship(p.emergency_contact_relationship || 'Spouse');
    setPriorityCategory(p.priority_category || 'NONE');
    setPriorityIdNumber(p.priority_id_number || '');
    setHmoProvider(p.hmo_provider || '');
    setHmoCardNumber(p.hmo_card_number || '');
    setPhilhealthNumber(p.philhealth_number || '');
  }

  // Synchronize notifications with real active appointments & medical records, respecting localStorage read state
  useEffect(() => {
    const storedReadIds = getStoredReadIds();
    const items: PatientNotification[] = [];

    // 1. Active appointment turn notification
    if (activeAppointments.length > 0) {
      const appt = activeAppointments[0];
      const notifId = `appt-${appt.id}-${appt.status}-${appt.queue_session.current_serving_number}`;
      const isServing = appt.status === 'SERVING';
      items.push({
        id: notifId,
        title: isServing ? `It's Your Turn! Enter Room ${appt.room_number}` : `Queue Turn: Token ${appt.token_code}`,
        message: isServing
          ? `Doctor is now calling Token ${appt.token_code} (#${appt.queue_number}). Please proceed inside Room ${appt.room_number}.`
          : `Currently serving #${appt.queue_session.current_serving_number}. You are #${appt.queue_number} for ${appt.doctor_title} ${appt.doctor_name} at ${appt.hospital_name}.`,
        time: isServing ? 'Now Serving' : 'Active queue',
        type: 'queue',
        isRead: storedReadIds.has(notifId),
      });

      if (appt.queue_session.announcement_notice) {
        const annId = `ann-${appt.queue_session_id}-${appt.queue_session.announcement_notice}`;
        items.push({
          id: annId,
          title: 'Doctor Broadcast Notice',
          message: appt.queue_session.announcement_notice,
          time: 'Today',
          type: 'broadcast',
          isRead: storedReadIds.has(annId),
        });
      }
    }

    // 2. Medical records notice
    if (medicalRecords.length > 0) {
      const latest = medicalRecords[0];
      const recId = `rec-${latest.id}`;
      items.push({
        id: recId,
        title: 'Digital Prescription & Record Posted',
        message: `Consultation diagnosis and prescription orders for "${latest.diagnosis}" are on file.`,
        time: formatShortDate(latest.created_at),
        type: 'medical',
        isRead: storedReadIds.has(recId),
      });
    }

    // 3. Health Passport active notice
    if (profile?.is_onboarding_completed) {
      const passId = `passport-${profile.id}`;
      const priorityText = profile.priority_category && profile.priority_category !== 'NONE'
        ? `${profile.priority_category === 'SENIOR' ? 'RA 9994 Senior Citizen' : profile.priority_category} priority status`
        : 'patient priority';
      items.push({
        id: passId,
        title: 'Digital Health Passport Active',
        message: `Your clinical vitals and ${priorityText} have been validated on file.`,
        time: 'Verified',
        type: 'profile',
        isRead: storedReadIds.has(passId),
      });
    }

    // Fallback if none yet
    if (items.length === 0) {
      const defaultId = 'notif-welcome';
      items.push({
        id: defaultId,
        title: 'Welcome to Clinic Natin',
        message: 'Search for verified doctors across CDO and track your turn in real time.',
        time: 'Just now',
        type: 'profile',
        isRead: storedReadIds.has(defaultId),
      });
    }

    setNotifications(items);
  }, [activeAppointments, medicalRecords, profile]);

  // Realtime synchronization on queue_sessions, appointments, and medical_records
  useEffect(() => {
    if (!profile?.id) return;
    const profileId = profile.id;

    const queueChannel: RealtimeChannel = supabase
      .channel('patient-live-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'queue_sessions' }, (payload) => {
        const updated = payload.new as { id: string; status: string; current_serving_number: number; announcement_notice: string | null };
        setActiveAppointments((prev) =>
          prev.map((appt) =>
            appt.queue_session_id === updated.id
              ? { ...appt, queue_session: { ...appt.queue_session, current_serving_number: updated.current_serving_number, status: updated.status as QueueSessionStatus, announcement_notice: updated.announcement_notice } }
              : appt
          )
        );
        if (updated.announcement_notice) {
          const annId = `ann-${Date.now()}`;
          const storedReadIds = getStoredReadIds();
          setNotifications((prev) => [
            {
              id: annId,
              title: 'Doctor Delay / Update Notice',
              message: updated.announcement_notice || '',
              time: 'Just now',
              type: 'broadcast',
              isRead: storedReadIds.has(annId),
            },
            ...prev,
          ]);
        }
        setLastUpdated(new Date());
      })
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointments', filter: `patient_id=eq.${profileId}` },
        (payload) => {
          const updated = payload.new as { id: string; status: string; queue_number: number; token_code: string };
          const newStatus = updated.status as AppointmentStatus;
          const activeStatuses: AppointmentStatus[] = ['BOOKED', 'WAITING', 'SERVING'];
          if (activeStatuses.includes(newStatus)) {
            setActiveAppointments((prev) =>
              prev.map((appt) => (appt.id === updated.id ? { ...appt, status: newStatus } : appt))
            );
            if (newStatus === 'SERVING') {
              const servId = `serv-${Date.now()}`;
              const storedReadIds = getStoredReadIds();
              setNotifications((prev) => [
                {
                  id: servId,
                  title: "It's Your Turn! Please Proceed Inside",
                  message: `Doctor is now calling Token ${updated.token_code} (#${updated.queue_number}). Please enter consultation room.`,
                  time: 'Just now',
                  type: 'queue',
                  isRead: storedReadIds.has(servId),
                },
                ...prev,
              ]);
            }
          } else {
            setActiveAppointments((prev) => prev.filter((appt) => appt.id !== updated.id));
            fetchMedicalRecords(profileId);
          }
          setLastUpdated(new Date());
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'medical_records', filter: `patient_id=eq.${profileId}` },
        () => {
          fetchMedicalRecords(profileId);
          const recId = `rec-${Date.now()}`;
          const storedReadIds = getStoredReadIds();
          setNotifications((prev) => [
            {
              id: recId,
              title: 'Digital Prescription & Record Posted',
              message: 'Your doctor completed your consultation. New clinical diagnosis and digital prescription are now in your Medical History.',
              time: 'Just now',
              type: 'medical',
              isRead: storedReadIds.has(recId),
            },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(queueChannel);
    };
  }, [profile?.id, supabase, fetchMedicalRecords]);

  // Handle Save Emergency Contact
  const handleSaveEmergencyContact = async () => {
    if (!profile?.id) return;
    setSavingSettings(true);
    setSettingsSuccessMsg(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          emergency_contact_name: emergencyName.trim(),
          emergency_contact_phone: emergencyPhone.trim(),
          emergency_contact_relationship: emergencyRelationship.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (!error) {
        setProfile((prev) =>
          prev
            ? {
              ...prev,
              emergency_contact_name: emergencyName.trim(),
              emergency_contact_phone: emergencyPhone.trim(),
              emergency_contact_relationship: emergencyRelationship.trim(),
            }
            : null
        );
        setSettingsSuccessMsg('Emergency contact updated successfully!');
        setTimeout(() => setSettingsSuccessMsg(null), 3500);
      } else {
        alert('Could not update emergency contact: ' + error.message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Save Priority & HMO
  const handleSavePriorityHMO = async () => {
    if (!profile?.id) return;
    setSavingSettings(true);
    setSettingsSuccessMsg(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          priority_category: priorityCategory,
          priority_id_number: priorityIdNumber.trim() || null,
          hmo_provider: hmoProvider.trim() || null,
          hmo_card_number: hmoCardNumber.trim() || null,
          philhealth_number: philhealthNumber.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (!error) {
        setProfile((prev) =>
          prev
            ? {
              ...prev,
              priority_category: priorityCategory,
              priority_id_number: priorityIdNumber.trim() || null,
              hmo_provider: hmoProvider.trim() || null,
              hmo_card_number: hmoCardNumber.trim() || null,
              philhealth_number: philhealthNumber.trim() || null,
            }
            : null
        );
        setSettingsSuccessMsg('Priority & HMO credentials saved successfully!');
        setTimeout(() => setSettingsSuccessMsg(null), 3500);
      } else {
        alert('Could not update credentials: ' + error.message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      const existing = getStoredReadIds();
      updated.forEach((n) => existing.add(n.id));
      saveStoredReadIds(Array.from(existing));
      return updated;
    });
  };

  const handleNotificationClick = (notif: PatientNotification) => {
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      const existing = getStoredReadIds();
      existing.add(notif.id);
      saveStoredReadIds(Array.from(existing));
    }
    if (notif.type === 'medical') {
      setIsNotificationsOpen(false);
      const elem = document.getElementById('medical-history');
      if (elem) elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('clinic_natin_demo_user');
      localStorage.removeItem('clinic_natin_demo_role');
      router.push('/login');
    }
  };

  const filteredRecords = useMemo(() => {
    if (recordFilter === 'ALL') return medicalRecords;
    if (recordFilter === 'MEDICATION') {
      return medicalRecords.filter((r) => r.prescriptions.some((p) => p.item_type === 'MEDICATION'));
    }
    if (recordFilter === 'LAB_TEST') {
      return medicalRecords.filter((r) =>
        r.prescriptions.some((p) => p.item_type === 'LAB_TEST' || p.item_type === 'IMAGING')
      );
    }
    return medicalRecords;
  }, [medicalRecords, recordFilter]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Patient';
  const patientAge = computeAge(profile?.date_of_birth);

  return (
    <main className="min-h-screen bg-brand-50/70 pb-20">
      {/* ── Top Patient Navigation ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/my-queue" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-xl bg-brand-700 flex items-center justify-center text-white shadow-sm transition group-hover:scale-105">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold text-brand-700 tracking-tight block leading-tight">Clinic Natin</span>
              <span className="text-[10px] text-slate-400 font-medium leading-none">Patient Care Suite</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Find Doctor Quick Link */}
            <Link
              href="/discover"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              <Search className="h-3.5 w-3.5 text-brand-700" />
              <span className="hidden sm:inline">Find Doctor</span>
            </Link>

            {/* Notification Bell with working dialog */}
            <Button
              id="patient-notifications-btn"
              variant="outline"
              size="icon"
              onClick={() => setIsNotificationsOpen(true)}
              aria-label="View notifications"
              className="relative rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </Button>

            {/* Settings Button with working dialog */}
            <Button
              id="patient-settings-btn"
              variant="outline"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open settings"
              className="rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-7">
        {/* ── Patient Profile Header Card ── */}
        <Card className="border-brand-200/80 bg-white shadow-xs overflow-hidden">
          <CardContent className="p-5">
            {isLoadingProfile ? (
              <div className="flex items-center gap-4 animate-pulse">
                <div className="h-14 w-14 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-40 rounded-full bg-slate-200" />
                  <div className="h-3 w-28 rounded-full bg-slate-100" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <Avatar className="h-14 w-14 ring-2 ring-brand-300 ring-offset-2 shrink-0">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
                    <AvatarFallback className="bg-gradient-to-br from-brand-300 to-brand-700 text-white font-black text-lg">
                      {profile ? getInitials(profile.full_name) : <User className="h-6 w-6" />}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-brand-700 uppercase tracking-wider">{greeting}</p>
                      {profile?.priority_category && profile.priority_category !== 'NONE' && (
                        <Badge variant="brand" className="text-[10px] px-2 py-0">
                          {profile.priority_category === 'SENIOR' ? 'RA 9994 Senior' : profile.priority_category}
                        </Badge>
                      )}
                    </div>
                    <h1 className="text-xl font-black text-slate-900 truncate leading-tight mt-0.5">
                      {profile?.full_name ?? firstName}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                      {profile?.phone_number && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {profile.phone_number}
                        </span>
                      )}
                      {patientAge !== null && <span>&bull; {patientAge} yrs old</span>}
                      {profile?.blood_type && (
                        <span className="font-semibold text-slate-700">&bull; Blood {profile.blood_type}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* CTAs: Health Passport & Account Settings */}
                <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0 flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsPassportOpen(true)}
                    className="rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold flex-1 sm:flex-initial"
                  >
                    <HeartPulse className="h-3.5 w-3.5 mr-1" />
                    Passport
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex-1 sm:flex-initial shadow-2xs"
                  >
                    <Link href="/account">
                      <User className="h-3.5 w-3.5 mr-1 text-slate-500" />
                      Account
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Active Queue Consultations ── */}
        <section aria-label="Active queue consultations">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-brand-100 flex items-center justify-center">
                <Ticket className="h-4 w-4 text-brand-700" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Active Consultations</h2>
              {activeAppointments.length > 0 && (
                <Badge variant="brand" className="h-5 px-2 text-[11px] font-bold">
                  {activeAppointments.length} Active
                </Badge>
              )}
            </div>

            {lastUpdated && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <RefreshCw className="h-3 w-3 animate-spin-once" />
                {lastUpdated.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {isLoadingActive ? (
            <Card className="p-6 animate-pulse">
              <div className="h-6 w-32 bg-slate-200 rounded-full mb-4" />
              <div className="h-28 bg-slate-100 rounded-2xl mb-4" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
            </Card>
          ) : activeAppointments.length > 0 ? (
            <div className="space-y-4">
              {activeAppointments.map((appt) => (
                <ActiveTicketCard key={appt.id} appt={appt} />
              ))}
            </div>
          ) : (
            <Card className="border-slate-200 bg-white text-center py-10 px-4">
              <CardContent className="flex flex-col items-center justify-center p-0">
                <div className="h-16 w-16 rounded-full bg-brand-50 ring-2 ring-brand-100 flex items-center justify-center mb-3">
                  <Ticket className="h-7 w-7 text-brand-700" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No Active Consultations</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">
                  {"You don't have an ongoing consultation. Search for available doctors across CDO and join their queue online."}
                </p>
                <Button asChild variant="brand" className="mt-4 rounded-xl text-xs font-bold">
                  <Link href="/discover">
                    <Search className="h-3.5 w-3.5 mr-1.5" />
                    Find a Doctor
                    <ChevronRight className="h-3.5 w-3.5 ml-1 opacity-70" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ── Medical History & Prescriptions (100% Wired to Database) ── */}
        <section id="medical-history" aria-label="Medical records and digital prescriptions">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-brand-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-brand-700" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Medical History &amp; Prescriptions</h2>
                <p className="text-[11px] text-slate-400">Authenticated EMR Records &bull; RA 10173 Protected</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              <button
                onClick={() => setRecordFilter('ALL')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${recordFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                All ({medicalRecords.length})
              </button>
              <button
                onClick={() => setRecordFilter('MEDICATION')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${recordFilter === 'MEDICATION' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                Rx Only
              </button>
              <button
                onClick={() => setRecordFilter('LAB_TEST')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${recordFilter === 'LAB_TEST' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                Lab Tests
              </button>
            </div>
          </div>

          {isLoadingRecords ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="p-5 animate-pulse">
                  <div className="h-4 w-48 bg-slate-200 rounded-full mb-2" />
                  <div className="h-3 w-32 bg-slate-100 rounded-full" />
                </Card>
              ))}
            </div>
          ) : filteredRecords.length > 0 ? (
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <MedicalRecordCard
                  key={record.id}
                  record={record}
                  onViewRx={() => setSelectedRxRecord(record)}
                />
              ))}
            </div>
          ) : (
            <Card className="border border-dashed border-slate-300 bg-white py-10 px-4 text-center">
              <CardContent className="flex flex-col items-center justify-center p-0">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-2.5 text-slate-400">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-slate-700">No Medical Records Found</p>
                <p className="mt-1 text-xs text-slate-400 max-w-xs">
                  Your consultation summaries, digital prescriptions, and laboratory orders will automatically synchronize here once your doctor finishes your consultation.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Footer info */}
        <div className="pt-2 text-center text-xs text-slate-400 space-y-1">
          <p className="flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Clinic Natin &bull; Compliant with Philippine Data Privacy Act (RA 10173)
          </p>
          <p className="text-[11px] text-slate-300">Cagayan de Oro Pilot Clinics &bull; Maria Reyna XU &bull; CUMC &bull; Polymedic</p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ── DIALOG 1: NOTIFICATIONS CENTER ── */}
      {/* ===================================================================== */}
      <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <DialogContent className="max-w-md p-6 sm:rounded-3xl">
          <DialogHeader className="border-b border-slate-100 pb-3 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">Notifications</DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Queue calls, doctor updates, and clinical alerts
                  </DialogDescription>
                </div>
              </div>

              {unreadCount > 0 ? (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg transition active:scale-95"
                >
                  <Check className="h-3.5 w-3.5" /> Mark read
                </button>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> All read
                </span>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 pt-1">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  role="button"
                  tabIndex={0}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${n.isRead
                      ? 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                      : 'bg-brand-50/50 border-brand-200 ring-1 ring-brand-300/40 hover:bg-brand-50'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-8 w-8 rounded-xl shrink-0 flex items-center justify-center text-white text-xs shadow-xs ${n.type === 'queue'
                          ? 'bg-emerald-600'
                          : n.type === 'broadcast'
                            ? 'bg-amber-500'
                            : n.type === 'medical'
                              ? 'bg-blue-600'
                              : 'bg-brand-700'
                        }`}
                    >
                      {n.type === 'queue' && <Ticket className="h-4 w-4" />}
                      {n.type === 'broadcast' && <AlertCircle className="h-4 w-4" />}
                      {n.type === 'medical' && <Pill className="h-4 w-4" />}
                      {n.type === 'profile' && <HeartPulse className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                          {!n.isRead && (
                            <span className="h-2 w-2 rounded-full bg-brand-700 shrink-0 ring-2 ring-brand-100" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">No notifications right now.</div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              {soundChimeEnabled ? (
                <Volume2 className="h-3.5 w-3.5 text-brand-700" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-slate-400" />
              )}
              Chime {soundChimeEnabled ? 'Enabled' : 'Muted'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNotificationsOpen(false)}
              className="rounded-xl text-xs h-8"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* ── DIALOG 2: PATIENT SETTINGS & HEALTH PASSPORT ── */}
      {/* ===================================================================== */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-xl p-6 sm:rounded-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-3 text-left">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-brand-700 flex items-center justify-center text-white">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">Patient Settings &amp; Health Hub</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Manage your health passport, HMO cards, emergency contacts, and notifications
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {settingsSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {settingsSuccessMsg}
            </div>
          )}

          <Tabs
            value={settingsTab}
            onValueChange={(val) => setSettingsTab(val as typeof settingsTab)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-5 h-10 rounded-xl bg-slate-100 p-1">
              <TabsTrigger value="passport" className="text-xs font-bold rounded-lg">
                Passport
              </TabsTrigger>
              <TabsTrigger value="hmo" className="text-xs font-bold rounded-lg">
                HMO
              </TabsTrigger>
              <TabsTrigger value="emergency" className="text-xs font-bold rounded-lg">
                Emergency
              </TabsTrigger>
              <TabsTrigger value="alerts" className="text-xs font-bold rounded-lg">
                Alerts
              </TabsTrigger>
              <TabsTrigger value="account" className="text-xs font-bold rounded-lg">
                Account
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: OFFICIAL DIGITAL HEALTH PASSPORT */}
            <TabsContent value="passport" className="space-y-4 pt-2">
              <DigitalHealthPassportCard
                data={passportData}
                onEdit={() => router.push('/onboarding')}
                showPrintButton={true}
                showEditButton={true}
              />
            </TabsContent>

            {/* TAB 2: PRIORITY & HMO */}
            <TabsContent value="hmo" className="space-y-4 pt-2">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Priority Lane Category
                  </label>
                  <select
                    value={priorityCategory}
                    onChange={(e) => setPriorityCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-brand-700 focus:outline-none"
                  >
                    <option value="NONE">Regular Patient (No Express Lane)</option>
                    <option value="SENIOR">RA 9994 Senior Citizen (60+ yrs)</option>
                    <option value="PWD">RA 7277 Person With Disability (PWD)</option>
                    <option value="PREGNANT">Pregnant / Maternal Care</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Senior Citizen OSCA ID or PWD ID Number
                  </label>
                  <Input
                    value={priorityIdNumber}
                    onChange={(e) => setPriorityIdNumber(e.target.value)}
                    placeholder="e.g. OSCA-CDO-2023-8821"
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      HMO Provider
                    </label>
                    <Input
                      value={hmoProvider}
                      onChange={(e) => setHmoProvider(e.target.value)}
                      placeholder="e.g. Maxicare / Intellicare / Medicard"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      HMO Card / Policy Number
                    </label>
                    <Input
                      value={hmoCardNumber}
                      onChange={(e) => setHmoCardNumber(e.target.value)}
                      placeholder="e.g. 1192-8821-4920"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    PhilHealth Identification Number (PIN)
                  </label>
                  <Input
                    value={philhealthNumber}
                    onChange={(e) => setPhilhealthNumber(e.target.value)}
                    placeholder="e.g. 12-050293819-4"
                    className="text-xs"
                  />
                </div>

                <Button
                  onClick={handleSavePriorityHMO}
                  disabled={savingSettings}
                  variant="brand"
                  className="w-full rounded-xl text-xs font-bold mt-2"
                >
                  {savingSettings ? 'Saving to Database…' : 'Save Priority & HMO Details'}
                </Button>
              </div>
            </TabsContent>

            {/* TAB 3: EMERGENCY CONTACT */}
            <TabsContent value="emergency" className="space-y-4 pt-2">
              <div className="rounded-2xl bg-amber-50/70 p-3.5 border border-amber-200 flex items-start gap-2.5">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  In case of urgent clinical escalation during consultation, the clinic secretary or doctor will contact this verified individual.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Emergency Contact Name
                  </label>
                  <Input
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="e.g. Gregoria de Jesus"
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Relationship
                    </label>
                    <select
                      value={emergencyRelationship}
                      onChange={(e) => setEmergencyRelationship(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-brand-700 focus:outline-none"
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Child">Child (Adult)</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Relative">Other Relative</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Mobile Number
                    </label>
                    <Input
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="+63 9XX XXX XXXX"
                      className="text-xs"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveEmergencyContact}
                  disabled={savingSettings}
                  variant="brand"
                  className="w-full rounded-xl text-xs font-bold mt-2"
                >
                  {savingSettings ? 'Saving to Database…' : 'Save Emergency Contact'}
                </Button>
              </div>
            </TabsContent>

            {/* TAB 4: SMS & ALERTS */}
            <TabsContent value="alerts" className="space-y-4 pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-white">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Philippine SMS Queue Alert</p>
                    <p className="text-[11px] text-slate-500">Semaphore SMS alert when turn approaches</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={smsAlertsEnabled}
                    onChange={(e) => setSmsAlertsEnabled(e.target.checked)}
                    className="h-4 w-4 rounded text-brand-700 focus:ring-brand-700"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-white">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Audio Chime on Turn Call</p>
                    <p className="text-[11px] text-slate-500">Play pleasant hospital chime when called into room</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundChimeEnabled}
                    onChange={(e) => setSoundChimeEnabled(e.target.checked)}
                    className="h-4 w-4 rounded text-brand-700 focus:ring-brand-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Advance Arrival Alert
                  </label>
                  <select
                    value={advanceWarningCount}
                    onChange={(e) => setAdvanceWarningCount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-brand-700 focus:outline-none"
                  >
                    <option value="1">Send SMS when 1 patient ahead</option>
                    <option value="2">Send SMS when 2 patients ahead (Recommended)</option>
                    <option value="3">Send SMS when 3 patients ahead</option>
                  </select>
                </div>
              </div>
            </TabsContent>

            {/* TAB 5: ACCOUNT & SECURITY */}
            <TabsContent value="account" className="space-y-4 pt-2">
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{profile?.full_name}</h4>
                    <p className="text-xs text-slate-500">{profile?.email || 'patient@clinicnatin.ph'}</p>
                  </div>
                  <Badge variant="brand" className="text-[10px] font-bold">
                    Verified Patient
                  </Badge>
                </div>
                <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mobile Phone:</span>
                    <span className="font-semibold text-slate-800">{profile?.phone_number || '+63 9XX XXX XXXX'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Patient Identifier:</span>
                    <span className="font-mono text-[11px] text-slate-700">{profile?.id?.slice(0, 16)}…</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Data Privacy Compliance:</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> RA 10173 Active
                    </span>
                  </div>
                </div>
              </div>

              <Button asChild variant="brand" className="w-full rounded-xl text-xs font-bold shadow-xs">
                <Link href="/account">
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  Open Full Account &amp; Security Hub
                  <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-70" />
                </Link>
              </Button>
            </TabsContent>
          </Tabs>

          <Separator className="my-2" />

          {/* Account & Sign Out footer */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-xs font-bold text-slate-800">{profile?.email || 'patient@clinicnatin.ph'}</p>
              <p className="text-[10px] text-slate-400">Role: PATIENT &bull; ID: {profile?.id?.slice(0, 8)}…</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSignOut}
              className="rounded-xl text-xs font-bold"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Sign Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* ── DIALOG: OFFICIAL DIGITAL HEALTH PASSPORT (UNIFIED WALLET PASS) ── */}
      {/* ===================================================================== */}
      <DigitalHealthPassportDialog
        open={isPassportOpen}
        onOpenChange={setIsPassportOpen}
        data={passportData}
        onEdit={() => router.push('/onboarding')}
      />

      {/* ===================================================================== */}
      {/* ── DIALOG 3: OFFICIAL DIGITAL PRESCRIPTION (PRINT / SAVE) ── */}
      {/* ===================================================================== */}
      <Dialog open={!!selectedRxRecord} onOpenChange={(open) => !open && setSelectedRxRecord(null)}>
        <DialogContent className="max-w-lg p-6 sm:rounded-3xl max-h-[90vh] overflow-y-auto print:p-0">
          {selectedRxRecord && (
            <div className="space-y-4">
              {/* Rx Header */}
              <div className="border-b-2 border-slate-800 pb-3 text-center">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {selectedRxRecord.doctor_title} {selectedRxRecord.doctor_name}
                </h3>
                <p className="text-xs font-semibold text-brand-700">{selectedRxRecord.doctor_specialty}</p>
                <p className="text-[11px] text-slate-500">
                  Room 304, Medical Arts Building &bull; Maria Reyna Xavier University Hospital
                </p>
                <p className="text-[10px] text-slate-400">
                  PRC Lic. No: 0128492 &bull; PTR: 8392104 &bull; S2: B-938210
                </p>
              </div>

              {/* Patient info row */}
              <div className="grid grid-cols-2 text-xs border-b border-slate-200 pb-2.5 gap-2">
                <div>
                  <span className="text-slate-400 font-medium">Patient: </span>
                  <span className="font-bold text-slate-800">{profile?.full_name || 'Patient'}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-medium">Date: </span>
                  <span className="font-bold text-slate-800">{formatDate(selectedRxRecord.created_at)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Age / Sex: </span>
                  <span className="font-bold text-slate-800">
                    {patientAge ? `${patientAge} yrs` : 'Adult'} / {profile?.gender || 'N/A'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-medium">BP / Vitals: </span>
                  <span className="font-bold text-slate-800">
                    {selectedRxRecord.vitals?.blood_pressure || '120/80'} &bull; {selectedRxRecord.vitals?.weight_kg || '68'} kg
                  </span>
                </div>
              </div>

              {/* Clinical Diagnosis */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diagnosis</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedRxRecord.diagnosis}</p>
                {selectedRxRecord.chief_complaint && (
                  <p className="text-[11px] text-slate-500 mt-1 italic">
                    Chief Complaint: {selectedRxRecord.chief_complaint}
                  </p>
                )}
              </div>

              {/* Rx Symbol & Orders */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl font-serif font-black text-brand-700 italic">℞</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Prescription Orders</span>
                </div>

                <div className="space-y-3">
                  {selectedRxRecord.prescriptions.map((rx, idx) => (
                    <div key={rx.id} className="border-b border-slate-100 pb-2.5 last:border-0">
                      <div className="flex items-baseline justify-between">
                        <p className="text-sm font-bold text-slate-900">
                          {idx + 1}. {rx.generic_name || rx.details}
                        </p>
                        <Badge variant="outline" className="text-[10px]">
                          {rx.item_type}
                        </Badge>
                      </div>
                      {rx.brand_name && (
                        <p className="text-xs text-slate-500">Brand: {rx.brand_name} &bull; {rx.dosage}</p>
                      )}
                      <p className="text-xs font-medium text-brand-700 mt-0.5">Sig: {rx.instructions || rx.frequency}</p>
                      {rx.duration && <p className="text-[11px] text-slate-400">Duration: {rx.duration}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Doctor signature area */}
              <div className="pt-6 flex justify-between items-end border-t border-slate-200">
                <div className="text-[10px] text-slate-400">
                  <p>Electronically Verified via Clinic Natin EMR</p>
                  <p>Document Security Hash: CN-{selectedRxRecord.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-slate-800 mb-1" />
                  <p className="text-xs font-bold text-slate-800">
                    {selectedRxRecord.doctor_title} {selectedRxRecord.doctor_name}
                  </p>
                  <p className="text-[10px] text-slate-500">Attending Physician</p>
                </div>
              </div>

              {/* Print CTA */}
              <div className="pt-3 flex gap-2 justify-end print:hidden">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRxRecord(null)}
                  className="rounded-xl text-xs"
                >
                  Close
                </Button>
                <Button
                  variant="brand"
                  onClick={() => window.print()}
                  className="rounded-xl text-xs font-bold"
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5" />
                  Print / Save PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

// ============================================================================
// Subcomponents
// ============================================================================

function ActiveTicketCard({ appt }: { appt: ActiveAppointment }) {
  const isServing = appt.status === 'SERVING';
  const isWaiting = appt.status === 'WAITING';
  const serving = appt.queue_session.current_serving_number;
  const mine = appt.queue_number;
  const ahead = Math.max(0, mine - serving);
  const sessionActive = appt.queue_session.status === 'ACTIVE';

  // Compute progress
  const progressPercent = Math.min(100, Math.max(10, Math.round((serving / Math.max(mine, 1)) * 100)));

  return (
    <Card
      className={`rounded-3xl border shadow-sm overflow-hidden transition-all duration-300 ${isServing ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-200' : 'bg-white border-slate-200'
        }`}
    >
      {/* Header bar */}
      <div
        className={`flex items-center justify-between px-5 py-3 ${isServing ? 'bg-emerald-600' : sessionActive ? 'bg-brand-700' : 'bg-slate-700'
          }`}
      >
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-white/80" />
          <span className="text-sm font-bold text-white tracking-wide">{appt.token_code}</span>
        </div>
        <Badge
          className={`border-0 text-[11px] font-black uppercase tracking-wider ${isServing
              ? 'bg-white text-emerald-700 animate-pulse'
              : isWaiting
                ? 'bg-amber-400 text-slate-950'
                : 'bg-white/20 text-white'
            }`}
        >
          {appt.status}
        </Badge>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Doctor & Clinic Location */}
        <div className="flex items-start gap-3.5">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-brand-300 to-brand-700 flex items-center justify-center text-white shadow-xs">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate text-base">{appt.doctor_title} {appt.doctor_name}</p>
            <p className="text-xs text-brand-700 font-semibold">{appt.doctor_specialty}</p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{appt.hospital_name} &bull; Room {appt.room_number}</span>
            </div>
          </div>
        </div>

        {/* Big Counter Display */}
        <div
          className={`rounded-2xl p-4 text-center transition-all ${isServing ? 'bg-emerald-100/70 ring-2 ring-emerald-300' : 'bg-slate-50 ring-1 ring-slate-200'
            }`}
        >
          {isServing ? (
            <div className="space-y-1.5 py-2">
              <div className="flex items-center justify-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-7 w-7 animate-bounce" />
                <p className="text-2xl font-black">{"It's Your Turn!"}</p>
              </div>
              <p className="text-xs text-emerald-600 font-bold">Please proceed inside Room {appt.room_number} now.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Now Serving</p>
                  <div className={`text-4xl font-black tabular-nums ${sessionActive ? 'text-brand-700' : 'text-slate-400'}`}>
                    {sessionActive ? `#${serving}` : '\u2014'}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="h-10 w-px bg-slate-200" />
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                  <div className="h-10 w-px bg-slate-200" />
                </div>

                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Your Number</p>
                  <div className="text-4xl font-black tabular-nums text-slate-900">#{mine}</div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200">
                {sessionActive ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-700">
                      {ahead === 0 ? (
                        <span className="text-amber-600 font-bold">&#128276; {"You're next! Please stand by Room entrance."}</span>
                      ) : (
                        <>
                          <span className="text-sm font-black text-brand-700">{ahead}</span>{' '}
                          {ahead === 1 ? 'patient' : 'patients'} ahead of you
                        </>
                      )}
                    </p>
                    <Progress value={progressPercent} className="h-2 bg-slate-200" />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-medium">Clinic queue session is pending start.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Doctor announcement banner if any */}
        {appt.queue_session.announcement_notice && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Broadcast from Doctor:</p>
              <p className="mt-0.5">{appt.queue_session.announcement_notice}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MedicalRecordCard({ record, onViewRx }: { record: MedicalRecord; onViewRx: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const vitals = record.vitals;

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-xs overflow-hidden hover:border-brand-300 transition-all">
      <div
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left gap-3 hover:bg-slate-50 cursor-pointer transition"
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-brand-50 flex items-center justify-center ring-1 ring-brand-100 text-brand-700">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-900 text-sm truncate">{record.diagnosis ?? 'Consultation Record'}</p>
              {record.icd10_code && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500">
                  {record.icd10_code}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
              <span>{record.doctor_title} {record.doctor_name}</span>
              <span className="text-slate-300">&bull;</span>
              <span>{formatShortDate(record.consultation_date)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {record.prescriptions.length > 0 && (
            <Badge variant="brand" className="text-[11px] font-bold">
              <Pill className="h-3 w-3 mr-1" />
              {record.prescriptions.length} Orders
            </Badge>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {expanded && (
        <CardContent className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100">
          {/* Chief Complaint */}
          {record.chief_complaint && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Chief Complaint</p>
              <p className="text-xs text-slate-700 font-medium">{record.chief_complaint}</p>
            </div>
          )}

          {/* Clinical Vitals */}
          {vitals && Object.values(vitals).some(Boolean) && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Recorded Vitals</p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {vitals.blood_pressure && (
                  <div className="rounded-xl bg-slate-50 p-2 text-center ring-1 ring-slate-200">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">BP</p>
                    <p className="text-xs font-black text-slate-800 mt-0.5">{vitals.blood_pressure}</p>
                  </div>
                )}
                {vitals.heart_rate != null && (
                  <div className="rounded-xl bg-slate-50 p-2 text-center ring-1 ring-slate-200">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Heart Rate</p>
                    <p className="text-xs font-black text-slate-800 mt-0.5">{vitals.heart_rate} bpm</p>
                  </div>
                )}
                {vitals.temperature_c != null && (
                  <div className="rounded-xl bg-slate-50 p-2 text-center ring-1 ring-slate-200">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Temp</p>
                    <p className="text-xs font-black text-slate-800 mt-0.5">{vitals.temperature_c}&deg;C</p>
                  </div>
                )}
                {vitals.weight_kg != null && (
                  <div className="rounded-xl bg-slate-50 p-2 text-center ring-1 ring-slate-200">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Weight</p>
                    <p className="text-xs font-black text-slate-800 mt-0.5">{vitals.weight_kg} kg</p>
                  </div>
                )}
                {vitals.oxygen_saturation != null && (
                  <div className="rounded-xl bg-slate-50 p-2 text-center ring-1 ring-slate-200">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">SpO2</p>
                    <p className="text-xs font-black text-slate-800 mt-0.5">{vitals.oxygen_saturation}%</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Prescriptions & Lab orders */}
          {record.prescriptions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Prescriptions &amp; Orders</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewRx}
                  className="h-7 text-xs font-bold text-brand-700 hover:bg-brand-50"
                >
                  <Printer className="h-3 w-3 mr-1" />
                  View &amp; Print Official Rx
                </Button>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 divide-y divide-slate-100 p-3">
                {record.prescriptions.map((rx) => (
                  <div key={rx.id} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900">{rx.generic_name || rx.details}</span>
                          {rx.brand_name && <span className="text-[11px] text-slate-400">({rx.brand_name})</span>}
                          {rx.dosage && <span className="text-[11px] font-medium text-slate-600">&bull; {rx.dosage}</span>}
                        </div>
                        <p className="text-[11px] text-brand-700 font-medium mt-0.5">
                          {rx.instructions || rx.frequency} {rx.duration ? `&bull; ${rx.duration}` : ''}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 font-bold">
                        {rx.item_type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up schedule banner */}
          {record.followup_date && (
            <div className="flex items-center gap-2 rounded-xl bg-brand-50 border border-brand-200 p-3 text-xs text-brand-700">
              <Calendar className="h-4 w-4 text-brand-700 shrink-0" />
              <span>
                Recommended Follow-up: <strong className="font-bold">{formatDate(record.followup_date)}</strong>
              </span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
