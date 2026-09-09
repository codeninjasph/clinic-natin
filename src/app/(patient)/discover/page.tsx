'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Search,
  MapPin,
  Stethoscope,
  Users,
  Clock,
  ChevronRight,
  Ticket,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
    address: string;
  };
}

export interface DoctorCard {
  /** doctors.id */
  doctorId: string;
  /** profiles.full_name */
  name: string;
  /** doctors.specialty */
  specialty: string;
  /** Flattened list of clinic schedules */
  schedules: ClinicSchedule[];
  /** The single ACTIVE queue session for today, if any */
  activeSession: ActiveQueueSession | null;
}

// ---------------------------------------------------------------------------
// Raw Supabase response shapes
// ---------------------------------------------------------------------------

type RawRow = {
  id: string;
  specialty: string;
  profiles: { full_name: string } | null;
  doctor_clinic_schedules: Array<{
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    clinics: { id: string; name: string; address: string } | null;
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
// Helpers & Timezone Utilities
// ---------------------------------------------------------------------------

import {
  getManilaNow,
  getClinicSessionState,
  DAY_NAMES,
  DAY_FULL_NAMES,
  formatTimeDisplay,
  type ManilaTimeInfo,
} from '@/lib/date-utils';

function formatTime(time: string): string {
  return formatTimeDisplay(time);
}

/** Pull the first ACTIVE session across all schedules for a doctor */
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

/** Transform raw Supabase rows into DoctorCard[] */
function transformRows(rows: RawRow[]): DoctorCard[] {
  return rows.map((row) => ({
    doctorId: row.id,
    name: row.profiles?.full_name ?? 'Unknown Doctor',
    specialty: row.specialty,
    schedules: row.doctor_clinic_schedules.map((s) => ({
      id: s.id,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      clinic: {
        id: s.clinics?.id ?? '',
        name: s.clinics?.name ?? 'Unknown Clinic',
        address: s.clinics?.address ?? '',
      },
    })),
    activeSession: extractActiveSession(row.doctor_clinic_schedules),
  }));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 whitespace-nowrap">
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
      Not Yet Started
    </span>
  );
}

function DoctorCardItem({
  doctor,
  manilaNow,
  onJoin,
}: {
  doctor: DoctorCard;
  manilaNow: ManilaTimeInfo;
  onJoin: (doctor: DoctorCard) => void;
}) {
  const initials = doctor.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const todaySchedule = doctor.schedules.find((s) => s.day_of_week === manilaNow.isoDay);
  const session = getClinicSessionState(todaySchedule, manilaNow);
  const primarySchedule = todaySchedule || doctor.schedules[0];

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-inner">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="truncate text-base font-semibold text-slate-800">
                Dr. {doctor.name}
              </h2>
              {session.state === 'IN_SESSION' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  In Clinic Now
                </span>
              ) : session.state === 'BEFORE_SESSION' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-300">
                  <Clock className="h-3 w-3 text-sky-600" />
                  Opens at {session.startTimeDisplay}
                </span>
              ) : session.state === 'AFTER_SESSION' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-300">
                  Session Ended ({session.endTimeDisplay})
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                  Closed Today
                </span>
              )}
            </div>
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
              <Stethoscope className="h-2.5 w-2.5" />
              {doctor.specialty}
            </span>
          </div>
        </div>
        <QueueBadge session={doctor.activeSession} />
      </div>

      {primarySchedule && (
        <div className="mt-4 space-y-1.5">
          <div className="flex items-start gap-2 text-sm text-slate-500">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <div className="min-w-0">
              <p className="font-medium text-slate-700 truncate">
                {primarySchedule.clinic.name}
              </p>
              <p className="truncate text-xs">{primarySchedule.clinic.address}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {doctor.schedules.map((s) => {
              const isToday = s.day_of_week === manilaNow.isoDay;
              return (
                <span
                  key={s.id}
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] transition ${
                    isToday
                      ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300 font-bold'
                      : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200'
                  }`}
                >
                  <span className={isToday ? 'font-black text-emerald-900' : 'font-medium text-slate-600'}>
                    {DAY_NAMES[s.day_of_week]}
                  </span>
                  <span>{formatTime(s.start_time)}&ndash;{formatTime(s.end_time)}</span>
                  {isToday && (
                    <span className="text-[9px] bg-emerald-600 text-white px-1 rounded font-bold">TODAY</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <button
        id={`join-queue-${doctor.doctorId}`}
        onClick={() => onJoin(doctor)}
        className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] ${
          session.state === 'IN_SESSION'
            ? 'bg-brand-700 hover:bg-brand-800 text-white shadow-sm'
            : session.state === 'BEFORE_SESSION'
            ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
        }`}
      >
        {session.state === 'IN_SESSION' ? (
          <>
            <Users className="h-4 w-4" />
            Join Today&apos;s Queue
            <ChevronRight className="h-4 w-4 opacity-70" />
          </>
        ) : session.state === 'BEFORE_SESSION' ? (
          <>
            <Clock className="h-4 w-4 text-sky-600" />
            Opens at {session.startTimeDisplay} &bull; View Schedule
          </>
        ) : session.state === 'AFTER_SESSION' ? (
          <>
            <Clock className="h-4 w-4 text-slate-500" />
            Session Ended &bull; View Schedule
          </>
        ) : (
          <>
            <Clock className="h-4 w-4 text-slate-500" />
            Closed Today &bull; View Schedule
          </>
        )}
      </button>
    </article>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <Search className="h-7 w-7 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-700">No doctors found</h3>
      {query ? (
        <p className="mt-1 text-sm text-slate-500">
          No results for &ldquo;{query}&rdquo;. Try a different name or specialty.
        </p>
      ) : (
        <p className="mt-1 text-sm text-slate-500">
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
  const [loading, setLoading] = useState(true);
  const [isRealtime, setIsRealtime] = useState(false);
  const [selectedDoctorForJoin, setSelectedDoctorForJoin] = useState<DoctorCard | null>(null);

  // ---- Initial fetch -------------------------------------------------------

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('doctors')
      .select(`
        id,
        specialty,
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

  // ---- Realtime subscription -----------------------------------------------

  useEffect(() => {
    const supabase = createClient();

    const channel: RealtimeChannel = supabase
      .channel('public:queue_sessions')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'queue_sessions',
        },
        (payload) => {
          const updated = payload.new as {
            id: string;
            status: string;
            current_serving_number: number;
            session_date: string;
          };

          setDoctors((prev) =>
            prev.map((doc) => {
              if (doc.activeSession?.id === updated.id) {
                if (updated.status === 'ACTIVE') {
                  return {
                    ...doc,
                    activeSession: {
                      ...doc.activeSession,
                      current_serving_number: updated.current_serving_number,
                      status: 'ACTIVE' as const,
                    },
                  };
                }
                return { ...doc, activeSession: null };
              }
              return doc;
            })
          );

          // A new ACTIVE session appeared — re-fetch to link it to the right doctor.
          if (updated.status === 'ACTIVE') {
            fetchDoctors();
          }
        }
      )
      .subscribe((status) => {
        setIsRealtime(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDoctors]);

  // ---- Filtering -----------------------------------------------------------

  const filtered = doctors.filter((doc) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      doc.name.toLowerCase().includes(q) ||
      doc.specialty.toLowerCase().includes(q) ||
      doc.schedules.some(
        (s) =>
          s.clinic.name.toLowerCase().includes(q) ||
          s.clinic.address.toLowerCase().includes(q)
      )
    );
  });

  // ---- Join handler --------------------------------------------------------

  function handleJoin(doctor: DoctorCard) {
    setSelectedDoctorForJoin(doctor);
  }

  // ---- Render --------------------------------------------------------------

  const manilaNow = getManilaNow();

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-900">Find a Doctor</h1>
              <p className="text-xs text-slate-500">
                Live queue status · updated in real time (PHT)
              </p>
            </div>
            <Link
              href="/my-queue"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <Ticket className="h-3.5 w-3.5 text-brand-700" />
              My Queue
            </Link>
          </div>

          {/* Search bar */}
          <div className="mt-3 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="doctor-search"
              type="search"
              placeholder="Search by name, specialty, or clinic…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="mx-auto max-w-2xl px-4 py-5">
        {!loading && doctors.length > 0 && (
          <p className="mb-3 text-xs font-medium text-slate-500">
            {filtered.length === doctors.length
              ? `${doctors.length} doctor${doctors.length !== 1 ? 's' : ''} available`
              : `${filtered.length} of ${doctors.length} doctors`}
          </p>
        )}

        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map((doctor) => (
              <DoctorCardItem
                key={doctor.doctorId}
                doctor={doctor}
                manilaNow={manilaNow}
                onJoin={handleJoin}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && <EmptyState query={query} />}
      </div>

      {/* In-app Join Queue / Schedule Guard Dialog */}
      {selectedDoctorForJoin && (() => {
        const todaySched = selectedDoctorForJoin.schedules.find(
          (s) => s.day_of_week === manilaNow.isoDay
        );
        const session = getClinicSessionState(todaySched, manilaNow);

        const scheduleSummary = selectedDoctorForJoin.schedules
          .map((s) => `${DAY_NAMES[s.day_of_week]} ${formatTime(s.start_time)}–${formatTime(s.end_time)} (${s.clinic.name})`)
          .join(', ');

        let title = '';
        let description = '';
        let confirmLabel = 'Understood';
        let cancelLabel = 'Close';
        let variant: 'brand' | 'default' = 'default';
        let canJoin = false;

        if (session.state === 'IN_SESSION' && todaySched) {
          title = `Join Today's Queue for Dr. ${selectedDoctorForJoin.name}?`;
          description = `You are reserving a queue token for Dr. ${selectedDoctorForJoin.name} (${selectedDoctorForJoin.specialty}) at ${todaySched.clinic.name}. You will receive SMS alerts when 2 patients are ahead of your turn.`;
          confirmLabel = 'Confirm & Join Queue';
          cancelLabel = 'Cancel';
          variant = 'brand';
          canJoin = true;
        } else if (session.state === 'BEFORE_SESSION' && todaySched) {
          title = `Queue Opens at ${session.startTimeDisplay} Today`;
          description = `Dr. ${selectedDoctorForJoin.name} is scheduled today (${DAY_FULL_NAMES[manilaNow.isoDay]}) from ${session.startTimeDisplay} to ${session.endTimeDisplay} at ${todaySched.clinic.name}. The live queue opens 15 minutes before consultations begin.`;
        } else if (session.state === 'AFTER_SESSION' && todaySched) {
          title = `Consultations Ended for Today`;
          description = `Dr. ${selectedDoctorForJoin.name}'s clinic session at ${todaySched.clinic.name} concluded at ${session.endTimeDisplay} today (${DAY_FULL_NAMES[manilaNow.isoDay]}). Live queue tokens can only be issued during active clinic hours.`;
        } else {
          // CLOSED_TODAY
          title = `Dr. ${selectedDoctorForJoin.name} is Closed Today`;
          description = `Dr. ${selectedDoctorForJoin.name} does not hold consultations today (${DAY_FULL_NAMES[manilaNow.isoDay]}). Active consultation schedule: ${scheduleSummary}. Live queue tokens can only be issued during active clinic days.`;
        }

        return (
          <ConfirmDialog
            open={!!selectedDoctorForJoin}
            onOpenChange={(open) => !open && setSelectedDoctorForJoin(null)}
            title={title}
            description={description}
            confirmLabel={confirmLabel}
            cancelLabel={cancelLabel}
            variant={variant}
            onConfirm={() => {
              if (canJoin) {
                setSelectedDoctorForJoin(null);
                router.push('/my-queue');
              } else {
                setSelectedDoctorForJoin(null);
              }
            }}
          />
        );
      })()}
    </main>
  );
}
