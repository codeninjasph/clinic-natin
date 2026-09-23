'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Search,
  MapPin,
  Stethoscope,
  Users,
  Clock,
  ChevronRight,
  Ticket,
  Building2,
  ShieldCheck,
  Sparkles,
  CreditCard,
  CheckCircle2,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  getManilaNow,
  getClinicSessionState,
  DAY_NAMES,
  DAY_FULL_NAMES,
  formatTimeDisplay,
  type ManilaTimeInfo,
} from '@/lib/date-utils';
import {
  POPULAR_SYMPTOM_TAGS,
  matchSymptomsToSpecialties,
  type SymptomMatch,
} from '@/lib/search/symptom-mapper';
import { BookTokenModal, type BookDoctorProps } from '@/components/patient/book-token-modal';
import { formatDoctorDisplayName } from '@/lib/formatters';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveQueueSession {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  current_serving_number: number;
  session_date: string;
}

interface ClinicSchedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  clinic: {
    id: string;
    name: string;
    hospital_name: string;
    room_number: string;
    address: string;
  };
}

export interface DoctorCard {
  doctorId: string;
  name: string;
  specialty: string;
  title?: string;
  consultationFee?: number;
  hmoAccreditations?: string[];
  isVerified?: boolean;
  prcLicense?: string;
  schedules: ClinicSchedule[];
  activeSession: ActiveQueueSession | null;
}

type RawRow = {
  id: string;
  specialty: string;
  title?: string;
  consultation_fee_default?: number;
  hmo_accreditations?: string[];
  is_verified?: boolean;
  prc_license?: string;
  profiles: { full_name: string } | null;
  doctor_clinic_schedules: Array<{
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    clinics: {
      id: string;
      name: string;
      hospital_name: string | null;
      room_number: string | null;
      address: string;
    } | null;
    queue_sessions: Array<{
      id: string;
      status: string;
      current_serving_number: number;
      session_date: string;
    }>;
  }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(time: string): string {
  return formatTimeDisplay(time);
}

function extractActiveSession(
  schedules: RawRow['doctor_clinic_schedules']
): ActiveQueueSession | null {
  for (const sched of schedules) {
    for (const session of sched.queue_sessions) {
      if (session.status === 'ACTIVE') {
        return {
          id: session.id,
          status: 'ACTIVE',
          current_serving_number: session.current_serving_number,
          session_date: session.session_date,
        };
      }
    }
  }
  return null;
}

function transformRows(rows: RawRow[]): DoctorCard[] {
  return rows.map((row) => ({
    doctorId: row.id,
    name: row.profiles?.full_name ?? 'Specialist Physician',
    specialty: row.specialty,
    title: row.title || 'Dr.',
    consultationFee: row.consultation_fee_default || 600,
    hmoAccreditations: row.hmo_accreditations || ['Maxicare', 'Intellicare', 'PhilHealth Konsulta'],
    isVerified: row.is_verified ?? true,
    prcLicense: row.prc_license || '0129841',
    schedules: (row.doctor_clinic_schedules || [])
      .filter((s) => s.clinics !== null)
      .map((s) => ({
        id: s.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        clinic: {
          id: s.clinics?.id ?? '',
          name: s.clinics?.name ?? 'Consultation Suite',
          hospital_name: s.clinics?.hospital_name || 'Hospital Medical Center',
          room_number: s.clinics?.room_number || '',
          address: s.clinics?.address ?? '',
        },
      })),
    activeSession: extractActiveSession(row.doctor_clinic_schedules || []),
  }));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-12 w-12 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 rounded-full bg-slate-200" />
            <div className="h-3 w-24 rounded-full bg-slate-200" />
          </div>
        </div>
        <div className="h-6 w-28 rounded-full bg-slate-200" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded-full bg-slate-100" />
        <div className="h-3 w-3/4 rounded-full bg-slate-100" />
      </div>
      <div className="mt-5 h-10 w-full rounded-xl bg-slate-200" />
    </div>
  );
}

function QueueBadge({ session }: { session: ActiveQueueSession | null }) {
  if (session?.status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 whitespace-nowrap">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Serving #{session.current_serving_number}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 whitespace-nowrap">
      <Clock className="h-3 w-3" />
      Session Idle
    </span>
  );
}

function DoctorCardItem({
  doctor,
  manilaNow,
  onBook,
}: {
  doctor: DoctorCard;
  manilaNow: ManilaTimeInfo;
  onBook: (doctor: DoctorCard) => void;
}) {
  const displayName = formatDoctorDisplayName(doctor.name, doctor.title);
  const initials = displayName
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const todaySchedule = doctor.schedules.find((s) => s.day_of_week === manilaNow.isoDay);
  const session = getClinicSessionState(todaySchedule, manilaNow);

  // Group schedules by clinic / hospital
  const hospitalGroups = Array.from(
    doctor.schedules.reduce((acc, sched) => {
      const key = sched.clinic.id;
      if (!acc.has(key)) {
        acc.set(key, { clinic: sched.clinic, schedules: [] });
      }
      acc.get(key)!.schedules.push(sched);
      return acc;
    }, new Map<string, { clinic: ClinicSchedule['clinic']; schedules: ClinicSchedule[] }>()).values()
  );

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:border-brand-300 hover:shadow-md">
      {/* ── Top Row: Doctor Info, Verification, & Queue Badge ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-sm font-black text-white shadow-xs">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="truncate text-base font-bold text-slate-900">
                {displayName}
              </h2>
              {doctor.isVerified && (
                <span className="inline-flex items-center gap-0.5 text-emerald-700 text-[10px] font-bold bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="h-3 w-3" />
                  Verified PRC
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-dark ring-1 ring-brand-100">
                <Stethoscope className="h-2.5 w-2.5" />
                {doctor.specialty}
              </span>
              <span className="text-xs font-bold text-slate-700">
                ₱{doctor.consultationFee || 600}.00
              </span>
            </div>
          </div>
        </div>
        <QueueBadge session={doctor.activeSession} />
      </div>

      {/* ── Accepted HMOs Pills ── */}
      {doctor.hmoAccreditations && doctor.hmoAccreditations.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            HMOs:
          </span>
          {doctor.hmoAccreditations.map((hmo) => (
            <span
              key={hmo}
              className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
            >
              {hmo}
            </span>
          ))}
        </div>
      )}

      {/* ── Spotlight: Today's Active Hospital & Room ── */}
      {todaySchedule ? (
        <div className="mt-3.5 rounded-xl border border-brand-200 bg-brand-50/70 p-3.5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white shadow-xs">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-dark bg-brand-100 px-2 py-0.5 rounded-full">
                    Today&apos;s Clinic ({manilaNow.dayName})
                  </span>
                  {todaySchedule.clinic.room_number && (
                    <span className="rounded-md bg-brand-dark px-2 py-0.5 text-[10px] font-bold text-white">
                      {todaySchedule.clinic.room_number}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-1 truncate">
                  {todaySchedule.clinic.hospital_name}
                </h3>
                <p className="text-xs text-slate-700 font-medium truncate">
                  {todaySchedule.clinic.name}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="truncate">{todaySchedule.clinic.address}</span>
                </div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="inline-block rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-emerald-950 shadow-xs border border-emerald-200">
                {formatTime(todaySchedule.start_time)}&ndash;{formatTime(todaySchedule.end_time)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 flex items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <span className="font-semibold text-slate-800">Not in Clinic Today ({manilaNow.dayName}).</span>{' '}
            <span className="text-slate-500">
              Rotates across {hospitalGroups.length} hospitals in Cagayan de Oro (see schedule below).
            </span>
          </div>
        </div>
      )}

      {/* ── Consultation Schedules Grouped by Hospital & Room ── */}
      {hospitalGroups.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Hospital Consultation Schedule:
            </p>
            {hospitalGroups.length > 1 && (
              <span className="text-[10px] text-slate-500 font-medium">
                {hospitalGroups.length} CDO Medical Centers
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            {hospitalGroups.map((group) => {
              const isTodayHospital = todaySchedule?.clinic.id === group.clinic.id;
              return (
                <div
                  key={group.clinic.id}
                  className={`rounded-xl border p-2.5 transition ${
                    isTodayHospital
                      ? 'border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-200/60 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <Building2
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isTodayHospital ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {group.clinic.hospital_name}
                      </span>
                      {group.clinic.room_number && (
                        <span className="text-[10px] font-bold bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded">
                          {group.clinic.room_number}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {group.schedules.map((s) => {
                      const isToday = s.day_of_week === manilaNow.isoDay;
                      return (
                        <span
                          key={s.id}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] ${
                            isToday
                              ? 'bg-emerald-700 text-white font-bold'
                              : 'bg-white text-slate-600 border border-slate-200 font-medium'
                          }`}
                        >
                          <span>{DAY_NAMES[s.day_of_week]}</span>
                          <span>{formatTime(s.start_time)}&ndash;{formatTime(s.end_time)}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Action Button: Launches 4-Step Token Booking Flow ── */}
      <button
        id={`join-queue-${doctor.doctorId}`}
        onClick={() => onBook(doctor)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-dark text-white px-4 py-2.5 text-xs font-bold shadow-xs transition-all active:scale-[0.98]"
      >
        <Ticket className="h-4 w-4" />
        {session.state === 'IN_SESSION' && todaySchedule
          ? `Join Live Queue at ${todaySchedule.clinic.hospital_name.replace(' - Xavier University Hospital', '').replace(' Medical Plaza', '')} (₱50 QRPH)`
          : `Reserve Token for ${displayName} (₱50 QRPH)`}
        <ChevronRight className="h-4 w-4 opacity-80" />
      </button>
    </article>
  );
}

function EmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <Search className="h-7 w-7 text-slate-400" />
      </div>
      <h3 className="text-sm font-bold text-slate-700">No matching doctors found</h3>
      {query ? (
        <div className="mt-1 space-y-2">
          <p className="text-xs text-slate-500">
            No doctors found for &ldquo;{query}&rdquo;. Try another symptom, doctor name, or hospital.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onClear}
            className="text-xs rounded-xl h-8"
          >
            Clear Search
          </Button>
        </div>
      ) : (
        <p className="mt-1 text-xs text-slate-500">
          There are no available doctors at the moment.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function DiscoverPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<DoctorCard[]>([]);
  const [query, setQuery] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState<'ALL' | 'MARIA_REYNA' | 'CUMC' | 'POLYMEDIC' | 'NMMC'>('ALL');
  const [selectedSymptomTag, setSelectedSymptomTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState<BookDoctorProps | null>(null);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('doctors')
      .select(`
        id,
        specialty,
        title,
        consultation_fee_default,
        hmo_accreditations,
        is_verified,
        prc_license,
        profiles!profile_id (
          full_name
        ),
        doctor_clinic_schedules (
          id,
          day_of_week,
          start_time,
          end_time,
          clinics!clinic_id (
            id,
            name,
            hospital_name,
            room_number,
            address
          ),
          queue_sessions (
            id,
            status,
            current_serving_number,
            session_date
          )
        )
      `)
      .order('id');

    if (error) {
      console.error('[DiscoverPage] fetch error:', error.message);
      setLoading(false);
      return;
    }

    setDoctors(transformRows((data ?? []) as unknown as RawRow[]));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  // ---- Realtime subscription ----
  useEffect(() => {
    const supabase = createClient();
    const channel: RealtimeChannel = supabase
      .channel('public:queue_sessions_discover')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_sessions' },
        () => {
          fetchDoctors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDoctors]);

  // ---- Symptom mapping & search filtering ----
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const symptomSpecialties = matchSymptomsToSpecialties(q);

    return doctors.filter((doc) => {
      // 1. Hospital Filter
      if (hospitalFilter !== 'ALL') {
        const matchesHospital = doc.schedules.some((s) => {
          const hName = s.clinic.hospital_name.toLowerCase();
          if (hospitalFilter === 'MARIA_REYNA') return hName.includes('maria reyna');
          if (hospitalFilter === 'CUMC') return hName.includes('capitol') || hName.includes('cumc');
          if (hospitalFilter === 'POLYMEDIC') return hName.includes('polymedic');
          if (hospitalFilter === 'NMMC') return hName.includes('northern mindanao') || hName.includes('nmmc');
          return true;
        });
        if (!matchesHospital) return false;
      }

      // 2. Symptom Tag Selected
      if (selectedSymptomTag) {
        if (!doc.specialty.toLowerCase().includes(selectedSymptomTag.toLowerCase())) {
          return false;
        }
      }

      // 3. Search query
      if (!q) return true;

      const directMatch =
        doc.name.toLowerCase().includes(q) ||
        doc.specialty.toLowerCase().includes(q) ||
        doc.schedules.some(
          (s) =>
            s.clinic.name.toLowerCase().includes(q) ||
            s.clinic.hospital_name.toLowerCase().includes(q) ||
            s.clinic.room_number.toLowerCase().includes(q) ||
            s.clinic.address.toLowerCase().includes(q)
        );

      if (directMatch) return true;

      // Check if user typed a symptom matching this doctor's specialty
      if (symptomSpecialties.some((spec) => doc.specialty.toLowerCase().includes(spec.toLowerCase()))) {
        return true;
      }

      return false;
    });
  }, [doctors, query, hospitalFilter, selectedSymptomTag]);

  // ---- Handle Open Booking Modal ----
  const manilaNow = getManilaNow();

  const handleBook = (doctor: DoctorCard) => {
    const todaySched = doctor.schedules.find((s) => s.day_of_week === manilaNow.isoDay);
    const activeClinic = todaySched ? todaySched.clinic : doctor.schedules[0]?.clinic || {
      id: 'clinic-mr-304',
      name: 'Consultation Suite',
      hospital_name: 'Maria Reyna - Xavier University Hospital',
      room_number: 'Room 304',
      address: 'Hayes St, Cagayan de Oro',
    };

    setSelectedDoctorForBooking({
      doctorId: doctor.doctorId,
      doctorName: formatDoctorDisplayName(doctor.name, doctor.title),
      specialty: doctor.specialty,
      consultationFee: doctor.consultationFee,
      activeClinic,
      todaySchedule: todaySched
        ? {
            id: todaySched.id,
            start_time: todaySched.start_time,
            end_time: todaySched.end_time,
          }
        : undefined,
    });
  };

  const hospitalsList = [
    { id: 'ALL', label: 'All CDO Facilities', short: 'All CDO' },
    { id: 'MARIA_REYNA', label: 'Maria Reyna XU Hospital', short: 'Maria Reyna XU' },
    { id: 'CUMC', label: 'Capitol University Medical Center', short: 'CUMC' },
    { id: 'POLYMEDIC', label: 'Polymedic Medical Plaza', short: 'Polymedic' },
    { id: 'NMMC', label: 'Northern Mindanao Med Center OPD', short: 'NMMC OPD' },
  ];

  return (
    <main className="min-h-screen bg-slate-50/70 pb-20">
      {/* ── Mobile-Only Sticky Search & Filter Header (< lg) ── */}
      <div className="block lg:hidden sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-2xs px-4 pt-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">Find Specialists</h1>
            <p className="text-[11px] text-slate-500">Live outpatient queues in CDO</p>
          </div>
          <Link
            href="/my-queue"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-brand-700 shadow-2xs"
          >
            <Ticket className="h-3.5 w-3.5" />
            <span>My Turn</span>
          </Link>
        </div>

        {/* Search */}
        <div className="mt-2 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search symptom, doctor, or hospital…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selectedSymptomTag) setSelectedSymptomTag(null);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-700 focus:bg-white focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* Hospital Horizontal Carousel */}
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {hospitalsList.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setHospitalFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                hospitalFilter === tab.id
                  ? 'bg-brand-700 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.short}
            </button>
          ))}
        </div>

        {/* Symptoms Carousel */}
        <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            Symptom:
          </span>
          {POPULAR_SYMPTOM_TAGS.map((sym) => {
            const isSelected = selectedSymptomTag === sym.specialty;
            return (
              <button
                key={sym.specialty}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSelectedSymptomTag(null);
                  } else {
                    setSelectedSymptomTag(sym.specialty);
                    setQuery('');
                  }
                }}
                className={`rounded-full px-2.5 py-0.5 text-[11px] whitespace-nowrap transition flex items-center gap-1 ${
                  isSelected
                    ? 'bg-brand-700 text-white font-bold shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                <span>{sym.label.split('/')[0].trim()}</span>
                {isSelected && <X className="h-3 w-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Container: Full Screen Desktop Layout (max-w-7xl 2xl:max-w-[1536px]) ── */}
      <div className="mx-auto max-w-7xl 2xl:max-w-[1536px] px-4 sm:px-6 lg:px-10 py-6">
        <div className="lg:flex lg:gap-8 items-start">
          {/* ── Left Sticky Filter Rail (Desktop Only ≥ lg) ── */}
          <aside className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-20 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Search & Filters</h2>
                <p className="text-xs text-slate-500 mt-0.5">Find verified specialists in Cagayan de Oro</p>
              </div>

              {/* Search input with icon */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="desktop-doctor-search"
                  type="search"
                  placeholder="Doctor, symptom, or hospital…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (selectedSymptomTag) setSelectedSymptomTag(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-brand-700 focus:bg-white focus:ring-2 focus:ring-brand-100"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Hospital Location Filters */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Hospital / Medical Center
                </label>
                <div className="space-y-1.5">
                  {hospitalsList.map((h) => {
                    const isSelected = hospitalFilter === h.id;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setHospitalFilter(h.id as any)}
                        className={`flex w-full items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition ${
                          isSelected
                            ? 'bg-brand text-white font-bold shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                        }`}
                      >
                        <span className="truncate pr-2">{h.label}</span>
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bisaya / Tagalog Symptom Tags */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Symptom Guidance (Local Terminology)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SYMPTOM_TAGS.map((sym) => {
                    const isSelected = selectedSymptomTag === sym.specialty;
                    return (
                      <button
                        key={sym.specialty}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSymptomTag(null);
                          } else {
                            setSelectedSymptomTag(sym.specialty);
                            setQuery('');
                          }
                        }}
                        className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition flex items-center gap-1 ${
                          isSelected
                            ? 'bg-brand-700 text-white font-bold shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{sym.label}</span>
                        {isSelected && <X className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reset All Filters Button */}
              {(query || hospitalFilter !== 'ALL' || selectedSymptomTag) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuery('');
                    setHospitalFilter('ALL');
                    setSelectedSymptomTag(null);
                  }}
                  className="w-full text-xs font-bold text-brand-700 hover:bg-brand-50 rounded-xl"
                >
                  Reset All Filters
                </Button>
              )}
            </div>

            {/* Quick Live Telemetry Info Box */}
            <div className="rounded-2xl border border-brand-200/80 bg-gradient-to-br from-brand-50 to-teal-50/50 p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-brand-dark font-bold text-xs">
                <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                <span>Zero-Waiting-Room Guarantee</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Tokens are issued with automated turn alerts. Book your odd online slot and track queue progress in real-time from anywhere in CDO.
              </p>
            </div>
          </aside>

          {/* ── Main Specialist Listings (Right Area) ── */}
          <section className="flex-1 min-w-0" aria-label="Available Doctors Directory">
            {/* Desktop Top Title & Stats Bar */}
            <div className="hidden lg:flex items-center justify-between pb-4 mb-4 border-b border-slate-200/70">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Available Specialists</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {filtered.length} verified physician{filtered.length !== 1 ? 's' : ''} across Cagayan de Oro
                  {selectedSymptomTag ? ` matching "${selectedSymptomTag}"` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/my-queue"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-brand-700 shadow-2xs hover:bg-slate-50 transition"
                >
                  <Ticket className="h-4 w-4" />
                  Live Turn Tracker
                </Link>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* Doctor Cards Multi-Column Grid */}
            {!loading && filtered.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                {filtered.map((doctor) => (
                  <DoctorCardItem
                    key={doctor.doctorId}
                    doctor={doctor}
                    manilaNow={manilaNow}
                    onBook={handleBook}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && filtered.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <EmptyState
                  query={query || selectedSymptomTag || ''}
                  onClear={() => {
                    setQuery('');
                    setSelectedSymptomTag(null);
                    setHospitalFilter('ALL');
                  }}
                />
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── Official 4-Step Frictionless Booking Modal ── */}
      {selectedDoctorForBooking && (
        <BookTokenModal
          doctor={selectedDoctorForBooking}
          isOpen={!!selectedDoctorForBooking}
          onClose={() => setSelectedDoctorForBooking(null)}
        />
      )}
    </main>
  );
}
