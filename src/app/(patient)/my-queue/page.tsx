'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Settings, Bell, Ticket, Activity, FileText, Pill,
  ChevronDown, ChevronRight, Calendar, MapPin, Stethoscope,
  RefreshCw, Wifi, WifiOff, Search, AlertCircle, CheckCircle2,
  FlaskConical, Microscope, Zap, Phone, Mail, HeartPulse,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  generic_name: string;
  brand_name: string | null;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
}

interface MedicalRecord {
  id: string;
  created_at: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  followup_date: string | null;
  vitals: {
    blood_pressure?: string;
    heart_rate?: number | null;
    temperature_c?: number | null;
    weight_kg?: number | null;
    oxygen_saturation?: number | null;
  } | null;
  doctor_name: string;
  doctor_title: string;
  doctor_specialty: string;
  consultation_date: string | null;
  prescriptions: Prescription[];
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
  vitals: Record<string, unknown> | null;
  doctors: {
    title: string;
    specialty: string;
    profiles: { full_name: string } | null;
  } | null;
  appointments: { created_at: string } | null;
  prescriptions: {
    id: string;
    item_type: string;
    generic_name: string;
    brand_name: string | null;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string | null;
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

// ============================================================================
// Skeleton loaders
// ============================================================================

function SkeletonTicket() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-32 rounded-full bg-slate-200" />
        <div className="h-6 w-20 rounded-full bg-slate-200" />
      </div>
      <div className="h-28 w-full rounded-xl bg-slate-100 mb-4" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-14 rounded-xl bg-slate-100" />
        <div className="h-14 rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

function SkeletonRecord() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-40 rounded-full bg-slate-200" />
          <div className="h-3 w-24 rounded-full bg-slate-100" />
        </div>
        <div className="h-8 w-8 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

function SkeletonHeader() {
  return (
    <div className="flex items-center gap-4 animate-pulse">
      <div className="h-14 w-14 rounded-full bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-40 rounded-full bg-slate-200" />
        <div className="h-3 w-24 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

// ============================================================================
// No Active Tickets empty state
// ============================================================================

function NoActiveTickets() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="relative mb-5">
        <div className="h-20 w-20 rounded-full bg-brand-50 ring-2 ring-brand-100 flex items-center justify-center">
          <Ticket className="h-9 w-9 text-brand-300" />
        </div>
        <div className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center ring-2 ring-white">
          <Search className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>
      <h3 className="text-base font-bold text-slate-700">No Active Tickets</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-xs">
        {"You don't have any ongoing consultations. Find a doctor and join a queue to get started."}
      </p>
      <a
        id="find-doctor-cta"
        href="/discover"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700/90 active:scale-[0.98] transition-all duration-150"
      >
        <Search className="h-4 w-4" />
        Find a Doctor
        <ChevronRight className="h-4 w-4 opacity-70" />
      </a>
    </div>
  );
}

// ============================================================================
// Active Ticket Card
// ============================================================================

function ActiveTicketCard({ appt }: { appt: ActiveAppointment }) {
  const isServing = appt.status === 'SERVING';
  const isWaiting = appt.status === 'WAITING';
  const serving = appt.queue_session.current_serving_number;
  const mine = appt.queue_number;
  const ahead = Math.max(0, mine - serving);
  const sessionActive = appt.queue_session.status === 'ACTIVE';

  return (
    <article
      className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-500 ${
        isServing ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
      }`}
    >
      <div
        className={`flex items-center justify-between px-5 py-3 ${
          isServing ? 'bg-emerald-600' : sessionActive ? 'bg-brand-700' : 'bg-slate-600'
        }`}
      >
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-white/80" />
          <span className="text-sm font-semibold text-white tracking-wide">{appt.token_code}</span>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
            isServing ? 'bg-white/20 text-white' : isWaiting ? 'bg-yellow-300/30 text-yellow-100' : 'bg-white/20 text-white'
          }`}
        >
          {isServing && (
            <span className="relative flex h-2 w-2 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
          )}
          {appt.status}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-brand-300 to-brand-700 flex items-center justify-center shadow-inner">
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 truncate">{appt.doctor_title} {appt.doctor_name}</p>
            <p className="text-xs text-brand-700 font-medium mt-0.5">{appt.doctor_specialty}</p>
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
              <p className="text-xs text-slate-500 truncate">{appt.hospital_name} &middot; Room {appt.room_number}</p>
            </div>
          </div>
        </div>

        <div
          className={`rounded-2xl p-4 mb-4 text-center transition-all duration-500 ${
            isServing ? 'bg-emerald-100 ring-2 ring-emerald-300' : 'bg-slate-50 ring-1 ring-slate-200'
          }`}
        >
          {isServing ? (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 animate-bounce" />
                <p className="text-2xl font-black text-emerald-700">{"It's Your Turn!"}</p>
              </div>
              <p className="text-sm text-emerald-600 font-semibold">Please enter the clinic now</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Now Serving</p>
                  <div className={`text-5xl font-black tabular-nums transition-all duration-700 ${sessionActive ? 'text-brand-700' : 'text-slate-400'}`}>
                    {sessionActive ? serving : '\u2014'}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="h-12 w-px bg-slate-200" />
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                  <div className="h-12 w-px bg-slate-200" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Your Number</p>
                  <div className="text-5xl font-black tabular-nums text-brand-700">{mine}</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200">
                {sessionActive ? (
                  <p className="text-sm font-semibold text-slate-600">
                    {ahead === 0 ? (
                      <span className="text-amber-600">&#128276; {"You're next! Please be ready."}</span>
                    ) : (
                      <>
                        <span className="text-lg font-black text-brand-700">{ahead}</span>{' '}
                        {ahead === 1 ? 'patient' : 'patients'} ahead of you
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">Queue not started yet &mdash; come back when active.</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold ${isServing ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-100 text-brand-700'}`}>
          <Ticket className="h-3.5 w-3.5" />
          Token: {appt.token_code} &middot; Queue #{mine}
        </div>

        {appt.queue_session.announcement_notice && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">{appt.queue_session.announcement_notice}</p>
          </div>
        )}
      </div>
    </article>
  );
}

// ============================================================================
// Prescription Item
// ============================================================================

function PrescriptionItem({ rx }: { rx: Prescription }) {
  const iconMap: Record<ItemType, React.ReactNode> = {
    MEDICATION: <Pill className="h-3.5 w-3.5" />,
    LAB_TEST: <FlaskConical className="h-3.5 w-3.5" />,
    IMAGING: <Microscope className="h-3.5 w-3.5" />,
    PROCEDURE: <Zap className="h-3.5 w-3.5" />,
  };
  const colorMap: Record<ItemType, string> = {
    MEDICATION: 'text-blue-700 bg-blue-50 ring-blue-200',
    LAB_TEST: 'text-purple-700 bg-purple-50 ring-purple-200',
    IMAGING: 'text-indigo-700 bg-indigo-50 ring-indigo-200',
    PROCEDURE: 'text-orange-700 bg-orange-50 ring-orange-200',
  };
  const colorClass = colorMap[rx.item_type] ?? 'text-slate-600 bg-slate-50 ring-slate-200';

  return (
    <li className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ring-1 ${colorClass}`}>
        {iconMap[rx.item_type]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-1">
          <span className="font-semibold text-sm text-slate-800">{rx.generic_name}</span>
          {rx.brand_name && <span className="text-xs text-slate-400">({rx.brand_name})</span>}
          <span className="text-xs font-medium text-slate-600">&middot; {rx.dosage}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{rx.frequency} &middot; {rx.duration}</p>
        {rx.instructions && <p className="text-xs text-slate-400 mt-0.5 italic">{rx.instructions}</p>}
      </div>
    </li>
  );
}

// ============================================================================
// Medical Record Accordion
// ============================================================================

function MedicalRecordItem({ record }: { record: MedicalRecord }) {
  const [open, setOpen] = useState(false);
  const vitals = record.vitals;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:border-brand-300 transition-colors duration-200">
      <button
        id={`record-toggle-${record.id}`}
        aria-expanded={open}
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-3 hover:bg-slate-50 transition-colors duration-150"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-brand-50 flex items-center justify-center ring-1 ring-brand-100">
            <FileText className="h-4 w-4 text-brand-700" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">{record.diagnosis ?? 'Consultation Record'}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Stethoscope className="h-3 w-3" />{record.doctor_title} {record.doctor_name}
              </span>
              <span className="text-slate-300">&middot;</span>
              <span className="text-[11px] text-slate-400">{formatShortDate(record.consultation_date)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {record.prescriptions.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
              <Pill className="h-2.5 w-2.5" />{record.prescriptions.length} Rx
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[900px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100">
          {record.chief_complaint && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Chief Complaint</p>
              <p className="text-sm text-slate-700">{record.chief_complaint}</p>
            </div>
          )}
          {record.diagnosis && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Diagnosis</p>
              <p className="text-sm text-slate-700 font-medium">{record.diagnosis}</p>
            </div>
          )}
          {vitals && Object.values(vitals).some(Boolean) && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Vitals</p>
              <div className="grid grid-cols-3 gap-2">
                {vitals.blood_pressure && (
                  <div className="rounded-xl bg-slate-50 p-2.5 text-center ring-1 ring-slate-200">
                    <p className="text-[10px] text-slate-400 font-medium">BP</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{vitals.blood_pressure}</p>
                  </div>
                )}
                {vitals.heart_rate != null && (
                  <div className="rounded-xl bg-slate-50 p-2.5 text-center ring-1 ring-slate-200">
                    <p className="text-[10px] text-slate-400 font-medium">HR</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{vitals.heart_rate} bpm</p>
                  </div>
                )}
                {vitals.temperature_c != null && (
                  <div className="rounded-xl bg-slate-50 p-2.5 text-center ring-1 ring-slate-200">
                    <p className="text-[10px] text-slate-400 font-medium">Temp</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{vitals.temperature_c}&deg;C</p>
                  </div>
                )}
                {vitals.weight_kg != null && (
                  <div className="rounded-xl bg-slate-50 p-2.5 text-center ring-1 ring-slate-200">
                    <p className="text-[10px] text-slate-400 font-medium">Weight</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{vitals.weight_kg} kg</p>
                  </div>
                )}
                {vitals.oxygen_saturation != null && (
                  <div className="rounded-xl bg-slate-50 p-2.5 text-center ring-1 ring-slate-200">
                    <p className="text-[10px] text-slate-400 font-medium">SpO&#8322;</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{vitals.oxygen_saturation}%</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {record.prescriptions.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Prescriptions &amp; Orders</p>
              <ul className="rounded-xl border border-slate-100 bg-slate-50/60 px-4">
                {record.prescriptions.map((rx) => <PrescriptionItem key={rx.id} rx={rx} />)}
              </ul>
            </div>
          )}
          {record.followup_date && (
            <div className="flex items-center gap-2 rounded-xl bg-brand-50 border border-brand-100 px-3 py-2.5">
              <Calendar className="h-4 w-4 text-brand-700 shrink-0" />
              <p className="text-sm text-brand-700 font-medium">
                Follow-up scheduled: <span className="font-bold">{formatDate(record.followup_date)}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
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
  const [isRealtime, setIsRealtime] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
      doctor_specialty: qs.doctors?.specialty ?? '',
      doctor_name: qs.doctors?.profiles?.full_name ?? 'Unknown Doctor',
      hospital_name: qs.clinics?.hospital_name ?? 'Unknown Hospital',
      room_number: qs.clinics?.room_number ?? '\u2014',
    };
  }

  function transformRecord(row: RawMedicalRecord): MedicalRecord {
    return {
      id: row.id,
      created_at: row.created_at,
      chief_complaint: row.chief_complaint,
      diagnosis: row.diagnosis,
      followup_date: row.followup_date,
      vitals: row.vitals as MedicalRecord['vitals'],
      doctor_title: row.doctors?.title ?? 'Dr.',
      doctor_name: row.doctors?.profiles?.full_name ?? 'Unknown Doctor',
      doctor_specialty: row.doctors?.specialty ?? '',
      consultation_date: row.appointments?.created_at ?? null,
      prescriptions: (row.prescriptions ?? []).map((rx) => ({
        id: rx.id,
        item_type: rx.item_type as ItemType,
        generic_name: rx.generic_name,
        brand_name: rx.brand_name,
        dosage: rx.dosage,
        frequency: rx.frequency,
        duration: rx.duration,
        instructions: rx.instructions,
      })),
    };
  }

  const fetchMedicalRecords = useCallback(async (profileId: string) => {
    const { data, error } = await supabase
      .from('medical_records')
      .select(`
        id, created_at, chief_complaint, diagnosis, followup_date, vitals,
        doctors!doctor_id ( title, specialty, profiles!profile_id ( full_name ) ),
        appointments!appointment_id ( created_at ),
        prescriptions ( id, item_type, generic_name, brand_name, dosage, frequency, duration, instructions )
      `)
      .eq('patient_id', profileId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setMedicalRecords((data as unknown as RawMedicalRecord[]).map(transformRecord));
    }
    setIsLoadingRecords(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const fetchActiveAppointments = useCallback(async (profileId: string) => {
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
    setIsLoadingActive(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();

      let profileId: string | null = null;

      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, phone_number, email, avatar_url, is_onboarding_completed')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (!profileError && profileData) {
          // If the patient hasn't completed onboarding yet, redirect to /onboarding
          if (profileData.is_onboarding_completed === false || profileData.is_onboarding_completed === null) {
            router.push('/onboarding');
            return;
          }
          setProfile(profileData as UserProfile);
          profileId = profileData.id;
        }
      }

      // Check if demo user is active in localStorage
      if (!profileId && typeof window !== 'undefined') {
        const demoUserJson = localStorage.getItem('clinic_natin_demo_user');
        const demoRole = localStorage.getItem('clinic_natin_demo_role');
        if (demoUserJson || demoRole === 'PATIENT') {
          const demoProfile = {
            id: 'fbd0825e-9298-4eb9-b3b7-eca4ec515f14',
            full_name: 'Andres Bonifacio',
            phone_number: '+639171110001',
            email: 'patient@clinicnatin.ph',
            avatar_url: null,
          };
          setProfile(demoProfile);
          profileId = demoProfile.id;
        }
      }

      if (profileId) {
        await Promise.all([
          fetchActiveAppointments(profileId),
          fetchMedicalRecords(profileId),
        ]);
      } else {
        // Check if there is a token param in the URL e.g. /my-queue?token=CN-A109
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    const profileId = profile.id;

    const queueChannel: RealtimeChannel = supabase
      .channel('patient-queue-sessions')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'queue_sessions' }, (payload) => {
        const updated = payload.new as { id: string; status: string; current_serving_number: number; announcement_notice: string | null };
        setActiveAppointments((prev) =>
          prev.map((appt) =>
            appt.queue_session_id === updated.id
              ? { ...appt, queue_session: { ...appt.queue_session, current_serving_number: updated.current_serving_number, status: updated.status as QueueSessionStatus, announcement_notice: updated.announcement_notice } }
              : appt
          )
        );
        setLastUpdated(new Date());
      })
      .subscribe((s) => setIsRealtime(s === 'SUBSCRIBED'));

    const appointmentChannel: RealtimeChannel = supabase
      .channel('patient-appointments')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointments', filter: `patient_id=eq.${profileId}` },
        (payload) => {
          const updated = payload.new as { id: string; status: string };
          const newStatus = updated.status as AppointmentStatus;
          const activeStatuses: AppointmentStatus[] = ['BOOKED', 'WAITING', 'SERVING'];
          if (activeStatuses.includes(newStatus)) {
            setActiveAppointments((prev) =>
              prev.map((appt) => (appt.id === updated.id ? { ...appt, status: newStatus } : appt))
            );
          } else {
            setActiveAppointments((prev) => prev.filter((appt) => appt.id !== updated.id));
            fetchMedicalRecords(profileId);
          }
          setLastUpdated(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(queueChannel);
      supabase.removeChannel(appointmentChannel);
    };
  }, [profile?.id, supabase, fetchMedicalRecords]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Patient';

  return (
    <main className="min-h-screen bg-brand-50">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-brand-700 flex items-center justify-center shadow-sm">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-brand-700 tracking-tight">Clinic Natin</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              title={isRealtime ? 'Connected to live updates' : 'Connecting\u2026'}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all duration-300 ${isRealtime ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'}`}
            >
              {isRealtime ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isRealtime ? 'Live' : 'Sync'}
            </span>
            <button id="notifications-button" aria-label="Notifications" className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
              <Bell className="h-4 w-4" />
            </button>
            <a id="settings-link" href="/patient/settings" aria-label="Settings" className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
              <Settings className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-8">

        {/* Profile */}
        <section aria-label="Patient profile" className="flex items-center gap-4">
          {isLoadingProfile ? (
            <SkeletonHeader />
          ) : (
            <>
              <div className="relative shrink-0">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt={profile.full_name} className="h-14 w-14 rounded-full object-cover ring-2 ring-brand-300 ring-offset-2" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-brand-300 to-brand-700 flex items-center justify-center text-white font-black text-lg shadow-md ring-2 ring-brand-100 ring-offset-2">
                    {profile ? getInitials(profile.full_name) : <User className="h-6 w-6" />}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-400 ring-2 ring-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-400 mb-0.5">{greeting} &#128075;</p>
                <h1 className="text-xl font-black text-slate-800 truncate leading-tight">{profile?.full_name ?? firstName}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  {profile?.phone_number && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400"><Phone className="h-3 w-3" />{profile.phone_number}</span>
                  )}
                  {profile?.email && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400"><Mail className="h-3 w-3" />{profile.email}</span>
                  )}
                  <Link
                    href="/onboarding"
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-100/70 hover:bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700 transition"
                  >
                    <HeartPulse className="h-3 w-3" />
                    Health Passport / Vitals &rarr;
                  </Link>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Active Tickets */}
        <section aria-label="Active queue tickets">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-brand-100 flex items-center justify-center">
                <Ticket className="h-3.5 w-3.5 text-brand-700" />
              </div>
              <h2 className="text-base font-bold text-slate-800">Active Tickets</h2>
              {activeAppointments.length > 0 && (
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-brand-700 text-white text-[11px] font-bold">
                  {activeAppointments.length}
                </span>
              )}
            </div>
            {lastUpdated && (
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <RefreshCw className="h-2.5 w-2.5" />
                {lastUpdated.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
          {isLoadingActive ? (
            <SkeletonTicket />
          ) : activeAppointments.length > 0 ? (
            <div className="space-y-4">
              {activeAppointments.map((appt) => <ActiveTicketCard key={appt.id} appt={appt} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <NoActiveTickets />
            </div>
          )}
        </section>

        {/* Medical History */}
        <section aria-label="Medical history and prescriptions">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-brand-100 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-brand-700" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Medical History</h2>
            {!isLoadingRecords && medicalRecords.length > 0 && (
              <span className="text-xs text-slate-400 font-medium ml-1">({medicalRecords.length} records)</span>
            )}
          </div>
          {isLoadingRecords ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <SkeletonRecord key={i} />)}
            </div>
          ) : medicalRecords.length > 0 ? (
            <div className="space-y-3">
              {medicalRecords.map((record) => <MedicalRecordItem key={record.id} record={record} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No Medical Records Yet</p>
              <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto px-4">
                Your consultation records and digital prescriptions will appear here after each visit.
              </p>
            </div>
          )}
        </section>

        <div className="pb-8 text-center">
          <p className="text-[11px] text-slate-300">Clinic Natin &middot; Secure &amp; Private Medical Records</p>
        </div>
      </div>
    </main>
  );
}
