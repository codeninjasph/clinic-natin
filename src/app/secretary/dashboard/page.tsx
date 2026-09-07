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
  Megaphone,
  RotateCcw,
  Hourglass,
  Phone,
  Radio,
  Calendar,
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
  | 'BUFFERED'
  | 'CANCELLED_NO_SHOW';

type PriorityCategory = 'NONE' | 'SENIOR' | 'PWD' | 'PREGNANT';

interface Appointment {
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
  announcement_notice: string | null;
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
    label: 'Senior (20% Off)',
    color: 'bg-amber-50 text-amber-700 ring-amber-200',
    icon: <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />,
  },
  PWD: {
    label: 'PWD (20% Off)',
    color: 'bg-blue-50 text-blue-700 ring-blue-200',
    icon: <Accessibility className="h-2.5 w-2.5" />,
  },
  PREGNANT: {
    label: 'Maternal Priority',
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

function DelayBroadcastBar({
  announcement,
  onBroadcast,
  onClear,
  isSending,
}: {
  announcement: string | null;
  onBroadcast: (mins: number, reason: string) => Promise<void>;
  onClear: () => Promise<void>;
  isSending: boolean;
}) {
  const [customMsg, setCustomMsg] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Megaphone className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Doctor Delay & Queue SMS Broadcast
            </h3>
            <p className="text-xs text-slate-500">
              Instantly push delay notices to patients via live screen & Semaphore SMS
            </p>
          </div>
        </div>

        {announcement && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-1.5 border border-amber-200 text-xs text-amber-800">
            <span>Active: <strong>{announcement}</strong></span>
            <button
              onClick={onClear}
              className="text-amber-600 hover:text-amber-900 font-bold ml-1 text-sm"
              title="Clear notice"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 mr-1">1-Tap Delay Broadcast:</span>
        <button
          onClick={() => onBroadcast(15, 'Doctor is on urgent hospital rounds')}
          disabled={isSending}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 active:scale-95 transition disabled:opacity-50"
        >
          ⏱️ +15m Rounds
        </button>
        <button
          onClick={() => onBroadcast(30, 'Doctor is in emergency surgery')}
          disabled={isSending}
          className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 active:scale-95 transition disabled:opacity-50"
        >
          🚨 +30m Surgery
        </button>
        <button
          onClick={() => onBroadcast(45, 'Doctor delayed by heavy CDO traffic')}
          disabled={isSending}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 active:scale-95 transition disabled:opacity-50"
        >
          🚗 +45m Traffic
        </button>
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="rounded-xl border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:border-slate-400 transition"
        >
          {showCustom ? 'Cancel' : '✏️ Custom Notice…'}
        </button>
      </div>

      {showCustom && (
        <div className="mt-3 flex gap-2 pt-2 border-t border-slate-100">
          <input
            type="text"
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            placeholder="e.g. Doctor is attending to ICU patient. Queue will resume at 10:30 AM."
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs outline-none focus:border-blue-500"
          />
          <button
            onClick={async () => {
              if (customMsg.trim()) {
                await onBroadcast(30, customMsg.trim());
                setCustomMsg('');
                setShowCustom(false);
              }
            }}
            disabled={isSending || !customMsg.trim()}
            className="rounded-xl bg-slate-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-700 transition disabled:opacity-50"
          >
            {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Send Broadcast'}
          </button>
        </div>
      )}
    </div>
  );
}

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
  const isOnline = appointment.queue_number % 2 === 1;

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 rounded-2xl border bg-white p-3.5 shadow-sm',
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-xs font-bold text-white shadow-inner">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">
          {appointment.display_name}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono font-bold text-slate-700">
            {appointment.token_code || `#${appointment.queue_number}`}
          </span>
          {isOnline ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 border border-emerald-200">
              Online • Odd #{appointment.queue_number}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.2 text-[9px] font-bold text-blue-700 border border-blue-200">
              Walk-in • Even #{appointment.queue_number}
            </span>
          )}
          <PriorityBadge category={appointment.priority_category} />
        </div>
      </div>

      {/* Skip button (Grace Period Buffer) */}
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
          title="Patient away — Move to Buffer Lane (45m Grace Period)"
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full transition-all',
            'opacity-60 group-hover:opacity-100',
            isNearLimit
              ? 'bg-red-50 text-red-500 hover:bg-red-100 ring-1 ring-red-200'
              : 'bg-amber-50 text-amber-600 hover:bg-amber-100 ring-1 ring-amber-200',
            isSkipping && 'cursor-not-allowed opacity-50'
          )}
        >
          {isSkipping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Hourglass className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

function BufferLaneCard({
  appointment,
  onRestore,
  onForfeit,
  isRestoring,
}: {
  appointment: Appointment;
  onRestore: (id: string) => void;
  onForfeit: (id: string) => void;
  isRestoring: boolean;
}) {
  const initials = getInitials(appointment.display_name);

  return (
    <div className="relative flex flex-col gap-2.5 rounded-2xl border border-amber-300/80 bg-amber-50/50 p-3.5 shadow-sm ring-1 ring-amber-200">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white shadow-inner">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">
            {appointment.display_name}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-amber-900">
              {appointment.token_code || `#${appointment.queue_number}`}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 border border-amber-300">
              <Hourglass className="h-2.5 w-2.5 animate-spin" />
              45m Grace
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60">
        <button
          onClick={() => onRestore(appointment.id)}
          disabled={isRestoring}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50"
        >
          {isRestoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Check In (+2 Slots)
        </button>
        <button
          onClick={() => onForfeit(appointment.id)}
          title="Forfeit slot as No-Show"
          className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
        >
          <X className="h-3.5 w-3.5" />
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

      <div className="flex items-center gap-3.5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-lg font-black text-white shadow-md">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-black text-blue-600">{appointment.token_code || `#${appointment.queue_number}`}</span>
            <PriorityBadge category={appointment.priority_category} />
          </div>
          <p className="truncate text-base font-bold text-slate-800">{appointment.display_name}</p>
          <p className="text-xs text-slate-400">
            {appointment.booking_channel === 'ONLINE' ? 'Online Reservation (₱50 GCash)' : 'Front-Desk Walk-In'}
          </p>
        </div>
      </div>

      <button
        id="call-next-btn"
        onClick={onNext}
        disabled={isLoading}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white',
          'shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-lg active:scale-[0.99]',
          isLoading && 'cursor-not-allowed opacity-60'
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <span>Complete & Call Next</span>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Stethoscope className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-700">No Active Consultation</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {waitingCount > 0 ? `${waitingCount} patient${waitingCount !== 1 ? 's' : ''} in queue` : 'No patients waiting'}
        </p>
      </div>
      {waitingCount > 0 && (
        <button
          id="call-first-btn"
          onClick={onCallFirst}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Call First Patient
        </button>
      )}
    </div>
  );
}

function HistoryCard({ appointment }: { appointment: Appointment }) {
  const isNoShow = appointment.status === 'CANCELLED_NO_SHOW';
  return (
    <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-200 text-xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="font-mono font-bold text-slate-500">{appointment.token_code || `#${appointment.queue_number}`}</span>
        <span className="truncate font-semibold text-slate-700">{appointment.display_name}</span>
      </div>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
          isNoShow ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
        )}
      >
        {isNoShow ? 'No-Show' : 'Completed'}
      </span>
    </div>
  );
}

function AddWalkInModal({
  isOpen,
  onClose,
  onSubmit,
  nextEvenNumber,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, phone?: string) => void;
  nextEvenNumber: number;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), phone.trim() || undefined);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
            <UserPlus className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Add Walk-in Patient</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Fair Queue Assignment: Assigning next Even slot{' '}
            <span className="font-bold text-blue-700">Even #{nextEvenNumber}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Patient Full Name *
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Juan dela Cruz"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Mobile Phone Number (For Semaphore SMS Alerts)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09XXXXXXXXX"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
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
  title, count, color, icon, badge,
}: { title: string; count: number; color: string; icon: React.ReactNode; badge?: string }) {
  return (
    <div className="mb-3.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', color)}>{icon}</div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700">{title}</h2>
          {badge && <span className="text-[10px] text-slate-400 font-medium block">{badge}</span>}
        </div>
      </div>
      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-slate-200/80 px-1.5 text-xs font-bold text-slate-600">
        {count}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function SecretaryDashboardPage() {
  const supabase = createClient();

  const [session, setSession] = useState<QueueSession | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRealtime, setIsRealtime] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [isNextLoading, setIsNextLoading] = useState(false);
  const [skippingId, setSkippingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [isWalkInLoading, setIsWalkInLoading] = useState(false);
  const [isBroadcastLoading, setIsBroadcastLoading] = useState(false);
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
        'id, queue_session_id, patient_id, walk_in_name, walk_in_phone, booking_channel, token_code, queue_number, status, priority_category, skip_count, buffered_at, grace_period_deadline, consultation_fee, is_paid_to_clinic, created_at, profiles ( full_name )'
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
      walk_in_phone: row.walk_in_phone ?? null,
      booking_channel: (row.booking_channel as 'ONLINE' | 'WALK_IN') || (row.walk_in_name ? 'WALK_IN' : 'ONLINE'),
      queue_number: row.queue_number,
      token_code: row.token_code || (row.queue_number % 2 === 1 ? `CN-ON${String(row.queue_number).padStart(3, '0')}` : `CN-WK${String(row.queue_number).padStart(3, '0')}`),
      status: row.status as AppointmentStatus,
      priority_category: row.priority_category as PriorityCategory,
      skip_count: row.skip_count || 0,
      buffered_at: row.buffered_at || null,
      grace_period_deadline: row.grace_period_deadline || null,
      consultation_fee: row.consultation_fee || 0,
      is_paid_to_clinic: row.is_paid_to_clinic || false,
      created_at: row.created_at,
      display_name: row.profiles?.full_name ?? row.walk_in_name ?? 'Walk-in Patient',
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
          .select('id, schedule_id, session_date, status, current_serving_number, announcement_notice, last_updated_at, doctor_clinic_schedules!inner ( doctor_id )')
          .eq('session_date', today)
          .eq('status', 'ACTIVE')
          .eq('doctor_clinic_schedules.doctor_id', secretary.doctor_id)
          .maybeSingle();
        sessionData = userSession;
      }
    }

    // Fallback for preview / demo mode
    if (!sessionData) {
      const { data: activeSession } = await sb
        .from('queue_sessions')
        .select('id, schedule_id, session_date, status, current_serving_number, announcement_notice, last_updated_at')
        .eq('session_date', today)
        .eq('status', 'ACTIVE')
        .order('last_updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

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
      announcement_notice: sd.announcement_notice,
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
          prev ? {
            ...prev,
            current_serving_number: updated.current_serving_number ?? prev.current_serving_number,
            announcement_notice: updated.announcement_notice ?? prev.announcement_notice,
          } : prev
        );
      })
      .subscribe((status) => { setIsRealtime(status === 'SUBSCRIBED'); });

    return () => { sb.removeChannel(channel); };
  }, [session?.id, fetchAppointments]);

  // ── Derived Queue Lists ────────────────────────────────────────────────────
  const waiting = sortWaiting(appointments.filter((a) => a.status === 'WAITING' || a.status === 'BOOKED'));
  const buffered = appointments.filter((a) => a.status === 'BUFFERED' || (a.status === 'SKIPPED' && a.skip_count < 3));
  const serving = appointments.filter((a) => a.status === 'SERVING');
  const history = appointments.filter((a) => a.status === 'COMPLETED' || a.status === 'CANCELLED_NO_SHOW');
  const currentlyServing = serving[0] ?? null;

  // Next EVEN number for walk-ins
  const evenNumbers = appointments.filter((a) => a.queue_number % 2 === 0).map((a) => a.queue_number);
  const nextEvenQueueNumber = evenNumbers.length > 0 ? Math.max(...evenNumbers) + 2 : 2;

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
        if (currentlyServing) addToast('Queue complete — no more waiting patients.', 'info');
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

  // Grace Period / Buffer Lane Skip Logic
  const handleSkip = useCallback(async (appointmentId: string) => {
    if (!session) return;
    setSkippingId(appointmentId);
    const sb = sbRef.current;
    try {
      const appt = appointments.find((a) => a.id === appointmentId);
      if (!appt) return;
      const newSkipCount = appt.skip_count + 1;

      if (newSkipCount >= 3) {
        const { error } = await sb.from('appointments')
          .update({ status: 'CANCELLED_NO_SHOW', skip_count: newSkipCount })
          .eq('id', appointmentId);
        if (error) throw error;
        addToast(`${appt.display_name} reached 3 skips — marked as No-Show.`, 'error');
      } else {
        const deadline = new Date(Date.now() + 45 * 60 * 1000).toISOString();
        const { error } = await sb.from('appointments')
          .update({
            status: 'BUFFERED',
            skip_count: newSkipCount,
            buffered_at: new Date().toISOString(),
            grace_period_deadline: deadline,
          })
          .eq('id', appointmentId);
        if (error) throw error;
        addToast(`${appt.display_name} placed in Buffer Lane (45m Grace Period).`, 'info');
      }
      await fetchAppointments(session.id);
    } catch (err: unknown) {
      console.error('[handleSkip]', err);
      addToast('Could not buffer patient.', 'error');
    } finally {
      setSkippingId(null);
    }
  }, [session, appointments, fetchAppointments, addToast]);

  // Restore Patient from Buffer Lane
  const handleRestoreFromBuffer = useCallback(async (appointmentId: string) => {
    if (!session) return;
    setRestoringId(appointmentId);
    try {
      const res = await fetch('/api/queue/restore-buffered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          queueSessionId: session.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore');
      addToast(data.message || 'Patient restored to active queue!', 'success');
      await fetchAppointments(session.id);
    } catch (err: unknown) {
      console.error('[handleRestoreFromBuffer]', err);
      addToast('Could not restore patient from buffer.', 'error');
    } finally {
      setRestoringId(null);
    }
  }, [session, fetchAppointments, addToast]);

  // Forfeit from buffer directly
  const handleForfeitBuffer = useCallback(async (appointmentId: string) => {
    const sb = sbRef.current;
    await sb.from('appointments').update({ status: 'CANCELLED_NO_SHOW' }).eq('id', appointmentId);
    addToast('Slot forfeited as No-Show.', 'info');
    if (session) fetchAppointments(session.id);
  }, [session, fetchAppointments, addToast]);

  // 1-Tap Delay Broadcast via Semaphore SMS
  const handleDelayBroadcast = useCallback(async (delayMinutes: number, reason: string) => {
    if (!session) return;
    setIsBroadcastLoading(true);
    try {
      const res = await fetch('/api/queue/delay-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          delayMinutes,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to broadcast');
      addToast(`Delay notice sent! Dispatched ${data.smsSent} SMS alerts.`, 'success');
      setSession((prev) => prev ? { ...prev, announcement_notice: data.announcement } : prev);
    } catch (err: unknown) {
      console.error('[handleDelayBroadcast]', err);
      addToast('Failed to broadcast delay notice.', 'error');
    } finally {
      setIsBroadcastLoading(false);
    }
  }, [session, addToast]);

  const handleClearAnnouncement = useCallback(async () => {
    if (!session) return;
    const sb = sbRef.current;
    await sb.from('queue_sessions').update({ announcement_notice: null }).eq('id', session.id);
    setSession((prev) => prev ? { ...prev, announcement_notice: null } : prev);
    addToast('Broadcast banner cleared.', 'info');
  }, [session, addToast]);

  // Interleaved Walk-In Insertion (Even numbers)
  const handleAddWalkIn = useCallback(async (name: string, phone?: string) => {
    if (!session) return;
    setIsWalkInLoading(true);
    const sb = sbRef.current;
    try {
      const tokenCode = `CN-WK${String(nextEvenQueueNumber).padStart(3, '0')}`;
      const { error } = await sb.from('appointments').insert({
        queue_session_id: session.id,
        walk_in_name: name,
        walk_in_phone: phone || null,
        booking_channel: 'WALK_IN',
        queue_number: nextEvenQueueNumber,
        token_code: tokenCode,
        status: 'WAITING',
        priority_category: 'NONE',
        skip_count: 0,
        consultation_fee: 0,
        is_paid_to_clinic: false,
      });
      if (error) throw error;
      addToast(`Walk-in registered: Even #${nextEvenQueueNumber} (${tokenCode})`, 'success');
      setShowWalkIn(false);
      await fetchAppointments(session.id);
    } catch (err: unknown) {
      console.error('[handleAddWalkIn]', err);
      addToast('Could not add walk-in.', 'error');
    } finally {
      setIsWalkInLoading(false);
    }
  }, [session, nextEvenQueueNumber, fetchAppointments, addToast]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 h-8 w-64 animate-pulse rounded-full bg-slate-200" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <SkeletonColumn /><SkeletonColumn /><SkeletonColumn /><SkeletonColumn />
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
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 sm:text-lg">Secretary Desk & Queue Controller</h1>
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 ring-1 ring-blue-200">
                  Interleaved Fair Engine
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-PH', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })} &bull; Maria Reyna XU Hospital Room 304
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Now Serving</span>
                <span className="text-xl font-black text-blue-600">#{session.current_serving_number || '—'}</span>
              </div>
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />
              <button
                id="open-walkin-btn"
                onClick={() => setShowWalkIn(true)}
                className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 shadow-sm transition hover:bg-blue-100 active:scale-[0.98]"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add Walk-in (Even #{nextEvenQueueNumber})
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

        {/* Main Content Area */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5">
          {/* 1-Tap Doctor Delay & SMS Broadcast Bar */}
          <DelayBroadcastBar
            announcement={session.announcement_notice}
            onBroadcast={handleDelayBroadcast}
            onClear={handleClearAnnouncement}
            isSending={isBroadcastLoading}
          />

          {/* 4-Column Operations Board */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">

            {/* Col 1 — Active Lineup (Interleaved Waiting) */}
            <section aria-label="Waiting patients">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm min-h-[500px]">
                <ColumnHeader
                  title="Active Lineup"
                  badge="Alternating Online & Walk-in"
                  count={waiting.length}
                  color="bg-amber-100"
                  icon={<Clock className="h-3.5 w-3.5 text-amber-700" />}
                />

                <button
                  id="quick-walkin-btn"
                  onClick={() => setShowWalkIn(true)}
                  className="mb-3.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-blue-300 hover:text-blue-600 active:scale-[0.99]"
                >
                  <UserPlus className="h-3.5 w-3.5 text-blue-600" />
                  Issue Walk-in (Even #{nextEvenQueueNumber})
                </button>

                {waiting.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl py-12 text-center">
                    <Users className="h-8 w-8 text-slate-200" />
                    <p className="text-xs text-slate-400">No patients waiting in line</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
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

            {/* Col 2 — Buffer Lane (Grace Period for Skipped Patients) */}
            <section aria-label="Buffer lane patients">
              <div className="rounded-2xl border border-amber-200/90 bg-amber-50/30 p-4 shadow-sm min-h-[500px]">
                <ColumnHeader
                  title="Buffer Lane"
                  badge="45-Min Arrival Grace"
                  count={buffered.length}
                  color="bg-amber-200"
                  icon={<Hourglass className="h-3.5 w-3.5 text-amber-800" />}
                />

                {buffered.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl py-12 text-center">
                    <Hourglass className="h-8 w-8 text-slate-200" />
                    <p className="text-xs text-slate-400">Buffer lane is empty</p>
                    <p className="text-[11px] text-slate-400 max-w-[180px]">
                      Patients called while away are held here for 45 minutes
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {buffered.map((appt) => (
                      <BufferLaneCard
                        key={appt.id}
                        appointment={appt}
                        onRestore={handleRestoreFromBuffer}
                        onForfeit={handleForfeitBuffer}
                        isRestoring={restoringId === appt.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Col 3 — Currently Serving */}
            <section aria-label="Currently serving">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 shadow-sm min-h-[500px]">
                <ColumnHeader
                  title="Consultation"
                  badge="Inside Doctor's Suite"
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

            {/* Col 4 — History */}
            <section aria-label="Completed and no-show patients">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm min-h-[500px]">
                <ColumnHeader
                  title="Completed Today"
                  count={history.length}
                  color="bg-emerald-100"
                  icon={<Check className="h-3.5 w-3.5 text-emerald-700" />}
                />
                {history.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl py-12 text-center">
                    <ClipboardList className="h-8 w-8 text-slate-200" />
                    <p className="text-xs text-slate-400">No completed consultations yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
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

      {/* Add Walk-in Modal */}
      <AddWalkInModal
        isOpen={showWalkIn}
        onClose={() => setShowWalkIn(false)}
        onSubmit={handleAddWalkIn}
        nextEvenNumber={nextEvenQueueNumber}
        isLoading={isWalkInLoading}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} />
    </>
  );
}
