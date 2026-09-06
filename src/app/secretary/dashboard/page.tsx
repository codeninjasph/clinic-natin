'use client';

import { useEffect, useState, useCallback, useRef, useTransition } from 'react';
import {
  Check,
  X,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  Clock,
  ChevronRight,
  Loader2,
  AlertCircle,
  Star,
  Baby,
  Accessibility,
  ClipboardList,
  Stethoscope,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AppointmentStatus =
  | 'BOOKED'
  | 'WAITING'
  | 'SERVING'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'CANCELLED_NO_SHOW';

type PriorityCategory = 'NONE' | 'SENIOR' | 'PWD' | 'PREGNANT';

interface Appointment {
  id: string;
  queue_session_id: string;
  patient_id: string | null;
  walk_in_name: string | null;
  queue_number: number;
  status: AppointmentStatus;
  priority_category: PriorityCategory;
  skip_count: number;
  consultation_fee: number;
  is_paid_to_clinic: boolean;
  created_at: string;
  display_name: string;
}

interface QueueSession {
  id: string;
  schedule_id: string;
  session_date: string;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  current_serving_number: number;
  last_updated_at: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

const PRIORITY_CONFIG: Record<
  Exclude<PriorityCategory, 'NONE'>,
  { label: string; color: string; icon: React.ReactNode }
> = {
  SENIOR: {
    label: 'Senior',
    color: 'bg-amber-50 text-amber-700 ring-amber-200',
    icon: <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />,
  },
  PWD: {
    label: 'PWD',
    color: 'bg-blue-50 text-blue-700 ring-blue-200',
    icon: <Accessibility className="h-2.5 w-2.5" />,
  },
  PREGNANT: {
    label: 'Pregnant',
    color: 'bg-rose-50 text-rose-700 ring-rose-200',
    icon: <Baby className="h-2.5 w-2.5" />,
  },
};

function PriorityBadge({ category }: { category: PriorityCategory }) {
  if (category === 'NONE') return null;
  const config = PRIORITY_CONFIG[category as Exclude<PriorityCategory, 'NONE'>];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
        config.color
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

function sortWaiting(appointments: Appointment[]): Appointment[] {
  const priorityOrder: Record<PriorityCategory, number> = {
    SENIOR: 0,
    PWD: 0,
    PREGNANT: 0,
    NONE: 1,
  };
  return [...appointments].sort((a, b) => {
    const pa = priorityOrder[a.priority_category];
    const pb = priorityOrder[b.priority_category];
    if (pa !== pb) return pa - pb;
    return a.queue_number - b.queue_number;
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonColumn() {
  return (
    <div className="space-y-3 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-32 rounded-full bg-slate-200" />
              <div className="h-3 w-20 rounded-full bg-slate-100" />
            </div>
            <div className="h-6 w-6 rounded-full bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function WaitingCard({
  appointment,
  position,
  onSkip,
  isSkipping,
}: {
  appointment: Appointment;
  position: number;
  onSkip: (id: string) => void;
  isSkipping: boolean;
}) {
  const initials = getInitials(appointment.display_name);
  const isNearLimit = appointment.skip_count >= 2;

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm',
        'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        appointment.priority_category !== 'NONE'
          ? 'border-amber-200 ring-1 ring-amber-100'
          : 'border-slate-200'
      )}
    >
      {/* Position badge */}
      <div className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-white shadow">
        {position}
      </div>

      {/* Avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-xs font-bold text-white shadow-inner">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">
          {appointment.display_name}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400">#{appointment.queue_number}</span>
          {appointment.walk_in_name && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              Walk-in
            </span>
          )}
          <PriorityBadge category={appointment.priority_category} />
        </div>
      </div>

      {/* Skip button */}
      <div className="flex items-center gap-2">
        {appointment.skip_count > 0 && (
          <span className={cn('text-[10px] font-bold', isNearLimit ? 'text-red-500' : 'text-slate-400')}>
            {appointment.skip_count}/3
          </span>
        )}
        <button
          id={`skip-btn-${appointment.id}`}
          onClick={() => onSkip(appointment.id)}
          disabled={isSkipping}
          title="Skip / No-Show"
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full transition-all',
            'opacity-0 group-hover:opacity-100',
            isNearLimit
              ? 'bg-red-50 text-red-500 hover:bg-red-100 ring-1 ring-red-200'
              : 'bg-slate-100 text-slate-400 hover:bg-slate-200',
            isSkipping && 'cursor-not-allowed opacity-50'
          )}
        >
          {isSkipping ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

function ServingCard({
  appointment,
  onNext,
  isLoading,
}: {
  appointment: Appointment;
  onNext: () => void;
  isLoading: boolean;
}) {
  const initials = getInitials(appointment.display_name);
  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-blue-300 bg-white p-5 shadow-lg ring-4 ring-blue-50">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">In Consultation</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold text-white shadow-lg">
          {initials}
        </div>
        <div>
          <p className="text-xl font-bold text-slate-900">{appointment.display_name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              Queue #{appointment.queue_number}
            </span>
            {appointment.walk_in_name && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Walk-in</span>
            )}
            <PriorityBadge category={appointment.priority_category} />
          </div>
        </div>
      </div>

      <button
        id="next-patient-btn"
        onClick={onNext}
        disabled={isLoading}
        className={cn(
          'flex w-full items-center justify-center gap-2.5 rounded-xl px-5 py-3.5',
          'bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white',
          'shadow-md shadow-blue-200 transition-all duration-150',
          'hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-300',
          'active:scale-[0.98]',
          isLoading && 'cursor-not-allowed opacity-70'
        )}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Done — Call Next Patient
        {!isLoading && <ChevronRight className="h-4 w-4 opacity-70" />}
      </button>
    </div>
  );
}

function EmptyServingState({
  onCallFirst,
  isLoading,
  waitingCount,
}: {
  onCallFirst: () => void;
  isLoading: boolean;
  waitingCount: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
        <Stethoscope className="h-6 w-6 text-blue-500" />
      </div>
      <div>
        <p className="font-semibold text-slate-700">No one is being served</p>
        <p className="mt-0.5 text-sm text-slate-500">
          {waitingCount > 0 ? `${waitingCount} patient${waitingCount !== 1 ? 's' : ''} waiting` : 'No patients in queue yet'}
        </p>
      </div>
      {waitingCount > 0 && (
        <button
          id="call-first-btn"
          onClick={onCallFirst}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white',
            'shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]',
            isLoading && 'cursor-not-allowed opacity-70'
          )}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
          Call First Patient
        </button>
      )}
    </div>
  );
}

function HistoryCard({ appointment }: { appointment: Appointment }) {
  const initials = getInitials(appointment.display_name);
  const isDone = appointment.status === 'COMPLETED';
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm opacity-70">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-slate-600">{appointment.display_name}</p>
        <span className="text-[10px] text-slate-400">#{appointment.queue_number}</span>
      </div>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
          isDone ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-600 ring-red-200'
        )}
      >
        {isDone ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
        {isDone ? 'Done' : 'No-show'}
      </span>
    </div>
  );
}

function WalkInModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  nextQueueNumber,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  isLoading: boolean;
  nextQueueNumber: number;
}) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed);
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="walkin-modal-title"
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
            <UserPlus className="h-5 w-5 text-blue-600" />
          </div>
          <h2 id="walkin-modal-title" className="text-lg font-bold text-slate-900">Add Walk-in Patient</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Will be assigned queue number{' '}
            <span className="font-semibold text-slate-700">#{nextQueueNumber}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="walkin-name-input" className="mb-1.5 block text-sm font-medium text-slate-700">
              Patient Name
            </label>
            <input
              id="walkin-name-input"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Juan dela Cruz"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              autoComplete="off"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              id="walkin-submit-btn"
              type="submit"
              disabled={isLoading || !name.trim()}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white',
                'shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]',
                (isLoading || !name.trim()) && 'cursor-not-allowed opacity-60'
              )}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add to Queue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg pointer-events-auto',
            toast.type === 'success' && 'bg-emerald-600',
            toast.type === 'error' && 'bg-red-600',
            toast.type === 'info' && 'bg-blue-600'
          )}
        >
          {toast.type === 'success' && <Check className="h-4 w-4 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0" />}
          {toast.type === 'info' && <Clock className="h-4 w-4 shrink-0" />}
          {toast.message}
        </div>
      ))}
    </div>
  );
}

function ColumnHeader({
  title, count, color, icon,
}: { title: string; count: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', color)}>{icon}</div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">{title}</h2>
      </div>
      <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-bold text-slate-500">
        {count}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function SecretaryDashboardPage() {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const supabase = createClient();

  const [session, setSession] = useState<QueueSession | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRealtime, setIsRealtime] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [isNextLoading, setIsNextLoading] = useState(false);
  const [skippingId, setSkippingId] = useState<string | null>(null);
  const [isWalkInLoading, setIsWalkInLoading] = useState(false);
  const [, startTransition] = useTransition();

  const sbRef = useRef(supabase);

  // ── Toast ────────────────────────────────────────────────────────────────
  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // ── Fetch appointments ────────────────────────────────────────────────────
  const fetchAppointments = useCallback(async (sessionId: string) => {
    const sb = sbRef.current;
    const { data, error } = await sb
      .from('appointments')
      .select(
        'id, queue_session_id, patient_id, walk_in_name, queue_number, status, priority_category, skip_count, consultation_fee, is_paid_to_clinic, created_at, profiles ( full_name )'
      )
      .eq('queue_session_id', sessionId)
      .order('queue_number', { ascending: true });

    if (error) { console.error('[Dashboard] appts fetch:', error.message); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: Appointment[] = (data ?? []).map((row: any) => ({
      id: row.id,
      queue_session_id: row.queue_session_id,
      patient_id: row.patient_id ?? null,
      walk_in_name: row.walk_in_name ?? null,
      queue_number: row.queue_number,
      status: row.status as AppointmentStatus,
      priority_category: row.priority_category as PriorityCategory,
      skip_count: row.skip_count,
      consultation_fee: row.consultation_fee,
      is_paid_to_clinic: row.is_paid_to_clinic,
      created_at: row.created_at,
      display_name: row.profiles?.full_name ?? row.walk_in_name ?? 'Unknown Patient',
    }));

    setAppointments(mapped);
  }, []);

  // ── Fetch session + bootstrap ─────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    const sb = sbRef.current;
    const today = new Date().toISOString().slice(0, 10);

    let sessionData: any = null;

    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      const { data: secretary } = await sb
        .from('secretaries')
        .select('id, doctor_id')
        .eq('profile_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (secretary?.doctor_id) {
        const { data: userSession } = await sb
          .from('queue_sessions')
          .select('id, schedule_id, session_date, status, current_serving_number, last_updated_at, doctor_clinic_schedules!inner ( doctor_id )')
          .eq('session_date', today)
          .eq('status', 'ACTIVE')
          .eq('doctor_clinic_schedules.doctor_id', secretary.doctor_id)
          .maybeSingle();
        sessionData = userSession;
      }
    }

    // Fallback for demo / preview: load any active queue session for today
    if (!sessionData) {
      const { data: activeSession, error: sessionError } = await sb
        .from('queue_sessions')
        .select('id, schedule_id, session_date, status, current_serving_number, last_updated_at')
        .eq('session_date', today)
        .eq('status', 'ACTIVE')
        .order('last_updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) {
        console.error('[Dashboard] Session fetch error:', sessionError.message);
      }
      sessionData = activeSession;
    }

    if (!sessionData) {
      setSession(null);
      setAppointments([]);
      setLoading(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sd = sessionData as any;
    const qs: QueueSession = {
      id: sd.id,
      schedule_id: sd.schedule_id,
      session_date: sd.session_date,
      status: sd.status as QueueSession['status'],
      current_serving_number: sd.current_serving_number,
      last_updated_at: sd.last_updated_at,
    };
    setSession(qs);
    await fetchAppointments(qs.id);
    setLoading(false);
  }, [fetchAppointments]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    const sb = sbRef.current;

    const channel: RealtimeChannel = sb
      .channel(`secretary-dashboard:${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `queue_session_id=eq.${session.id}`,
      }, () => {
        startTransition(() => { fetchAppointments(session.id); });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'queue_sessions',
        filter: `id=eq.${session.id}`,
      }, (payload) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updated = payload.new as any;
        setSession((prev) =>
          prev ? { ...prev, current_serving_number: updated.current_serving_number ?? prev.current_serving_number } : prev
        );
      })
      .subscribe((status) => { setIsRealtime(status === 'SUBSCRIBED'); });

    return () => { sb.removeChannel(channel); };
  }, [session?.id, fetchAppointments]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const waiting = sortWaiting(appointments.filter((a) => a.status === 'WAITING' || a.status === 'BOOKED'));
  const serving = appointments.filter((a) => a.status === 'SERVING');
  const history = appointments.filter((a) => a.status === 'COMPLETED' || a.status === 'CANCELLED_NO_SHOW');
  const currentlyServing = serving[0] ?? null;
  const nextQueueNumber = (appointments.length > 0 ? Math.max(...appointments.map((a) => a.queue_number)) : 0) + 1;

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleNext = useCallback(async () => {
    if (!session) return;
    setIsNextLoading(true);
    const sb = sbRef.current;
    try {
      if (currentlyServing) {
        const { error } = await sb.from('appointments').update({ status: 'COMPLETED' }).eq('id', currentlyServing.id);
        if (error) throw error;
      }
      const nextPatient = waiting[0];
      if (nextPatient) {
        const { error: e1 } = await sb.from('appointments').update({ status: 'SERVING' }).eq('id', nextPatient.id);
        if (e1) throw e1;
        const { error: e2 } = await sb.from('queue_sessions')
          .update({ current_serving_number: nextPatient.queue_number, last_updated_at: new Date().toISOString() })
          .eq('id', session.id);
        if (e2) throw e2;
        setSession((prev) => prev ? { ...prev, current_serving_number: nextPatient.queue_number } : prev);
        addToast(`Now serving: ${nextPatient.display_name}`, 'success');
      } else {
        if (currentlyServing) addToast('Queue complete — no more patients.', 'info');
      }
      await fetchAppointments(session.id);
    } catch (err: unknown) {
      console.error('[handleNext]', err);
      addToast('Something went wrong. Please try again.', 'error');
    } finally {
      setIsNextLoading(false);
    }
  }, [session, currentlyServing, waiting, fetchAppointments, addToast]);

  const handleCallFirst = useCallback(async () => {
    if (!session || waiting.length === 0) return;
    setIsNextLoading(true);
    const sb = sbRef.current;
    try {
      const first = waiting[0];
      const { error: e1 } = await sb.from('appointments').update({ status: 'SERVING' }).eq('id', first.id);
      if (e1) throw e1;
      const { error: e2 } = await sb.from('queue_sessions')
        .update({ current_serving_number: first.queue_number, last_updated_at: new Date().toISOString() })
        .eq('id', session.id);
      if (e2) throw e2;
      setSession((prev) => prev ? { ...prev, current_serving_number: first.queue_number } : prev);
      addToast(`Now serving: ${first.display_name}`, 'success');
      await fetchAppointments(session.id);
    } catch (err: unknown) {
      console.error('[handleCallFirst]', err);
      addToast('Something went wrong. Please try again.', 'error');
    } finally {
      setIsNextLoading(false);
    }
  }, [session, waiting, fetchAppointments, addToast]);

  const handleSkip = useCallback(async (appointmentId: string) => {
    if (!session) return;
    setSkippingId(appointmentId);
    const sb = sbRef.current;
    try {
      const appt = appointments.find((a) => a.id === appointmentId);
      if (!appt) return;
      const newSkipCount = appt.skip_count + 1;
      const maxQNum = Math.max(...appointments.map((a) => a.queue_number));
      if (newSkipCount >= 3) {
        const { error } = await sb.from('appointments')
          .update({ status: 'CANCELLED_NO_SHOW', skip_count: newSkipCount })
          .eq('id', appointmentId);
        if (error) throw error;
        addToast(`${appt.display_name} marked as No-Show.`, 'error');
      } else {
        const { error } = await sb.from('appointments')
          .update({ skip_count: newSkipCount, queue_number: maxQNum + 1 })
          .eq('id', appointmentId);
        if (error) throw error;
        addToast(`Skipped ${appt.display_name} (${newSkipCount}/3 warnings).`, 'info');
      }
      await fetchAppointments(session.id);
    } catch (err: unknown) {
      console.error('[handleSkip]', err);
      addToast('Could not skip patient.', 'error');
    } finally {
      setSkippingId(null);
    }
  }, [session, appointments, fetchAppointments, addToast]);

  const handleAddWalkIn = useCallback(async (name: string) => {
    if (!session) return;
    setIsWalkInLoading(true);
    const sb = sbRef.current;
    try {
      const { error } = await sb.from('appointments').insert({
        queue_session_id: session.id,
        walk_in_name: name,
        queue_number: nextQueueNumber,
        status: 'WAITING',
        priority_category: 'NONE',
        skip_count: 0,
        consultation_fee: 0,
        is_paid_to_clinic: false,
      });
      if (error) throw error;
      addToast(`Walk-in "${name}" added as #${nextQueueNumber}.`, 'success');
      setShowWalkIn(false);
      await fetchAppointments(session.id);
    } catch (err: unknown) {
      console.error('[handleAddWalkIn]', err);
      addToast('Could not add walk-in.', 'error');
    } finally {
      setIsWalkInLoading(false);
    }
  }, [session, nextQueueNumber, fetchAppointments, addToast]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 h-8 w-64 animate-pulse rounded-full bg-slate-200" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SkeletonColumn /><SkeletonColumn /><SkeletonColumn />
          </div>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <ClipboardList className="h-7 w-7 text-slate-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">No Active Queue Today</h2>
            <p className="mt-1 text-sm text-slate-500">
              There is no active queue session for your assigned doctor today. A session must be started first.
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <div>
              <h1 className="text-base font-bold text-slate-900 sm:text-lg">Queue Dashboard</h1>
              <p className="text-xs text-slate-500">
                {new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-PH', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Now Serving</span>
                <span className="text-xl font-black text-blue-600">#{session.current_serving_number}</span>
              </div>
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />
              <button
                id="open-walkin-btn"
                onClick={() => setShowWalkIn(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Walk-in
              </button>
              <span
                title={isRealtime ? 'Live sync active' : 'Connecting…'}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                  isRealtime
                    ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
                    : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                )}
              >
                {isRealtime ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isRealtime ? 'Live' : 'Connecting'}
              </span>
            </div>
          </div>
        </header>

        {/* Kanban Board */}
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* Col 1 — Waiting */}
            <section aria-label="Waiting patients">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <ColumnHeader
                  title="Waiting"
                  count={waiting.length}
                  color="bg-amber-100"
                  icon={<Clock className="h-3.5 w-3.5 text-amber-600" />}
                />
                <button
                  id="quick-walkin-btn"
                  onClick={() => setShowWalkIn(true)}
                  className="mb-4 flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-400 transition hover:border-blue-300 hover:text-blue-500 active:scale-[0.99]"
                >
                  <UserPlus className="h-4 w-4" />
                  Add walk-in patient…
                </button>

                {waiting.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl py-10 text-center">
                    <Users className="h-8 w-8 text-slate-200" />
                    <p className="text-sm text-slate-400">No patients waiting</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {waiting.map((appt, idx) => (
                      <WaitingCard
                        key={appt.id}
                        appointment={appt}
                        position={idx + 1}
                        onSkip={handleSkip}
                        isSkipping={skippingId === appt.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Col 2 — Currently Serving */}
            <section aria-label="Currently serving">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
                <ColumnHeader
                  title="Currently Serving"
                  count={serving.length}
                  color="bg-blue-200"
                  icon={<Stethoscope className="h-3.5 w-3.5 text-blue-700" />}
                />
                {currentlyServing ? (
                  <ServingCard appointment={currentlyServing} onNext={handleNext} isLoading={isNextLoading} />
                ) : (
                  <EmptyServingState onCallFirst={handleCallFirst} isLoading={isNextLoading} waitingCount={waiting.length} />
                )}
              </div>
            </section>

            {/* Col 3 — History */}
            <section aria-label="Completed and no-show patients">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <ColumnHeader
                  title="History"
                  count={history.length}
                  color="bg-emerald-100"
                  icon={<Check className="h-3.5 w-3.5 text-emerald-700" />}
                />
                {history.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl py-10 text-center">
                    <ClipboardList className="h-8 w-8 text-slate-200" />
                    <p className="text-sm text-slate-400">No completed patients yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...history].reverse().map((appt) => (
                      <HistoryCard key={appt.id} appointment={appt} />
                    ))}
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>
      </main>

      <WalkInModal
        isOpen={showWalkIn}
        onClose={() => setShowWalkIn(false)}
        onSubmit={handleAddWalkIn}
        isLoading={isWalkInLoading}
        nextQueueNumber={nextQueueNumber}
      />
      <ToastContainer toasts={toasts} />
    </>
  );
}
