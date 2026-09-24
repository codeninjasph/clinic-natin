'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { playHospitalChime, announcePatientCall } from '@/lib/audio/queue-chime';
import Link from 'next/link';
import {
  Search,
  UserPlus,
  QrCode,
  Stethoscope,
  Check,
  CheckCircle2,
  X,
  Hourglass,
  RotateCcw,
  Receipt,
  LayoutGrid,
  Table as TableIcon,
  Activity,
  AlertCircle,
  Loader2,
  Clock3,
  Users,
  Timer,
  PhoneCall,
  BadgeCheck,
  Bell,
  Phone,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSecretary, type Appointment, type PriorityCategory } from '../secretary-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { VitalSignsTriageModal } from '@/components/secretary/vital-signs-triage-modal';
import { QRScannerModal } from '@/components/secretary/qr-scanner-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { BufferModal } from '@/components/secretary/buffer-modal';

// ── Priority Badge ──────────────────────────────────────────────────────────
function PriorityBadge({ category }: { category: PriorityCategory }) {
  if (category === 'NONE') return null;
  const config = {
    SENIOR: {
      label: 'Senior • 20% Off',
      className: 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-200/50',
    },
    PWD: {
      label: 'PWD • 20% Off',
      className: 'bg-sky-100 text-sky-900 border-sky-300 ring-1 ring-sky-200/50',
    },
    PREGNANT: {
      label: 'Pregnant • Express',
      className: 'bg-rose-100 text-rose-900 border-rose-300 ring-1 ring-rose-200/50',
    },
  }[category];

  if (!config) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// ── Status Pill ────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    WAITING: {
      label: 'Waiting',
      className: 'bg-sky-100 text-sky-900 border-sky-300 font-bold',
    },
    BOOKED: {
      label: 'Reserved',
      className: 'bg-slate-100 text-slate-800 border-slate-300 font-medium',
    },
    SERVING: {
      label: '▶ In Room',
      className: 'bg-emerald-600 text-white border-emerald-700 shadow-sm animate-pulse font-bold',
    },
    BUFFERED: {
      label: '⏳ Buffer Lane',
      className: 'bg-amber-100 text-amber-950 border-amber-300 font-bold',
    },
    SKIPPED: {
      label: 'Skipped',
      className: 'bg-amber-100 text-amber-950 border-amber-300 font-medium',
    },
    COMPLETED: {
      label: '✓ Completed',
      className: 'bg-slate-100 text-slate-700 border-slate-300 font-medium',
    },
    CANCELLED_NO_SHOW: {
      label: '✗ No-Show',
      className: 'bg-red-100 text-red-900 border-red-300 font-medium',
    },
  };
  const cfg = map[status] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

// ── Channel Badge ──────────────────────────────────────────────────────────
function ChannelBadge({ channel }: { channel: string }) {
  if (channel === 'ONLINE') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-800 border border-violet-200 px-2 py-0.5 text-[10px] font-bold">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-600 inline-block" />
        Online Booking
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 text-[10px] font-bold">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 inline-block" />
      Walk-In
    </span>
  );
}

export default function SecretaryDashboardPage() {
  const supabase = createClient();
  const {
    activeSession,
    appointments,
    doctor,
    loading,
    refreshData,
    doctorCallAlert,
    dismissDoctorCallAlert,
  } = useSecretary();

  const [viewMode, setViewMode] = useState<'cards' | 'logbook'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('WAITING');
  const [selectedApptForVitals, setSelectedApptForVitals] = useState<Appointment | null>(null);
  const [selectedApptForBuffer, setSelectedApptForBuffer] = useState<Appointment | null>(null);
  const [confirmCallInsideAppt, setConfirmCallInsideAppt] = useState<Appointment | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (doctorCallAlert) {
      playHospitalChime().catch(() => {});
      const timer = setTimeout(() => {
        dismissDoctorCallAlert();
      }, 14000);
      return () => clearTimeout(timer);
    }
  }, [doctorCallAlert, dismissDoctorCallAlert]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const term = searchTerm.trim().toUpperCase();
      const matchesSearch =
        !term ||
        appt.display_name.toUpperCase().includes(term) ||
        appt.token_code.toUpperCase().includes(term) ||
        (appt.phone_number && appt.phone_number.includes(term)) ||
        String(appt.queue_number) === term;

      if (!matchesSearch) return false;

      if (statusFilter === 'WAITING')
        return appt.status === 'WAITING' || appt.status === 'BOOKED';
      if (statusFilter === 'SERVING') return appt.status === 'SERVING';
      if (statusFilter === 'BUFFERED')
        return appt.status === 'BUFFERED' || appt.status === 'SKIPPED';
      if (statusFilter === 'COMPLETED')
        return appt.status === 'COMPLETED' || appt.status === 'CANCELLED_NO_SHOW';
      return true; // 'ALL'
    });
  }, [appointments, searchTerm, statusFilter]);

  const waitingPatients = useMemo(
    () => appointments.filter((a) => a.status === 'WAITING' || a.status === 'BOOKED'),
    [appointments]
  );
  const bufferedPatients = useMemo(
    () => appointments.filter((a) => a.status === 'BUFFERED' || a.status === 'SKIPPED'),
    [appointments]
  );
  const servingPatients = useMemo(
    () => appointments.filter((a) => a.status === 'SERVING'),
    [appointments]
  );
  const completedPatients = useMemo(
    () =>
      appointments.filter(
        (a) => a.status === 'COMPLETED' || a.status === 'CANCELLED_NO_SHOW'
      ),
    [appointments]
  );

  const handleOpenBufferModal = async (appt: Appointment) => {
    const newCount = (appt.skip_count || 0) + 1;
    if (newCount >= 3) {
      try {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'CANCELLED_NO_SHOW', skip_count: newCount })
          .eq('id', appt.id);
        if (error) throw error;
        showToast(
          `Patient #${appt.queue_number} exceeded 3 missed calls — marked as No-Show.`,
          'error'
        );
        await refreshData();
      } catch {
        showToast('Failed to update patient status.', 'error');
      }
    } else {
      setSelectedApptForBuffer(appt);
    }
  };

  const handleConfirmBuffer = async (
    apptId: string,
    graceMinutes: number,
    reason: string
  ) => {
    setActionLoadingId(apptId);
    try {
      const res = await fetch('/api/queue/buffer-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: apptId,
          reason,
          graceMinutes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place patient in buffer lane.');

      showToast(
        data.message || `Patient moved to Buffer Lane (${graceMinutes}m grace period).`
      );
      setSelectedApptForBuffer(null);
      await refreshData();
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Could not place patient in buffer lane.',
        'error'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestoreFromBuffer = async (apptId: string) => {
    setActionLoadingId(apptId);
    try {
      const res = await fetch('/api/queue/restore-buffered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: apptId,
          queueSessionId: activeSession?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore patient.');
      showToast('Patient restored to the active line (+2 slots ahead).');
      await refreshData();
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Could not restore patient.',
        'error'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReturnToWaiting = async (appt: Appointment) => {
    setActionLoadingId(appt.id);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'WAITING', served_at: null })
        .eq('id', appt.id);
      if (error) throw error;

      if (activeSession && activeSession.current_serving_number === appt.queue_number) {
        await supabase
          .from('queue_sessions')
          .update({ current_serving_number: 0 })
          .eq('id', activeSession.id);
      }

      showToast(`Token ${appt.token_code} (${appt.display_name}) returned back to Waiting.`);
      await refreshData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not return patient to waiting.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCallInside = useCallback(
    async (appt: Appointment) => {
      if (!activeSession) {
        showToast('No active session started by doctor yet.', 'error');
        return;
      }
      setActionLoadingId(appt.id);
      try {
        const currentServing = appointments.find((a) => a.status === 'SERVING');

        const res = await fetch('/api/queue/call-next', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queueSessionId: activeSession.id,
            currentAppointmentId: currentServing?.id ?? null,
            nextAppointmentId: appt.id,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not advance patient turn.');

        playHospitalChime().catch(() => {});
        announcePatientCall({
          tokenCode: appt.token_code,
          displayName: appt.display_name,
          roomNumber: undefined,
        });

        showToast(
          `Admitted ${appt.display_name} (#${appt.queue_number}) into consultation room!`
        );

        if (data.advanceWarningSent && data.recipientToken) {
          setTimeout(() => {
            showToast(`📱 2-ahead SMS alert sent to ticket ${data.recipientToken}.`);
          }, 1800);
        }

        await refreshData();
      } catch (err: unknown) {
        showToast(
          err instanceof Error ? err.message : 'Could not call patient inside.',
          'error'
        );
      } finally {
        setActionLoadingId(null);
      }
    },
    [activeSession, appointments, refreshData]
  );

  const handleInitiateCallInside = (appt: Appointment) => {
    const currentServing = appointments.find((a) => a.status === 'SERVING');
    if (currentServing && currentServing.id !== appt.id) {
      setConfirmCallInsideAppt(appt);
    } else {
      handleCallInside(appt);
    }
  };

  // ── Stats Config ─────────────────────────────────────────────────────────
  const stats = [
    {
      id: 'WAITING',
      label: 'Waiting in Lobby',
      sublabel: 'Active queue line',
      value: waitingPatients.length,
      icon: Users,
      color: 'text-sky-700',
      activeColor: 'bg-sky-600 text-white border-sky-600',
      bg: 'bg-sky-50/80 border-sky-200 text-sky-950',
    },
    {
      id: 'SERVING',
      label: 'In Room',
      sublabel: 'Currently with doctor',
      value: servingPatients.length,
      icon: Activity,
      color: 'text-emerald-700',
      activeColor: 'bg-emerald-600 text-white border-emerald-600',
      bg: 'bg-emerald-50/80 border-emerald-200 text-emerald-950',
    },
    {
      id: 'BUFFERED',
      label: 'Buffer Lane',
      sublabel: 'Grace period holds',
      value: bufferedPatients.length,
      icon: Timer,
      color: 'text-amber-700',
      activeColor: 'bg-amber-600 text-white border-amber-600',
      bg: 'bg-amber-50/80 border-amber-200 text-amber-950',
    },
    {
      id: 'COMPLETED',
      label: 'Completed Today',
      sublabel: 'Consultation finished',
      value: completedPatients.length,
      icon: BadgeCheck,
      color: 'text-slate-700',
      activeColor: 'bg-slate-700 text-white border-slate-700',
      bg: 'bg-slate-100/80 border-slate-200 text-slate-800',
    },
  ];

  return (
    <div className="space-y-4 w-full">
      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-2xl p-4 shadow-2xl text-sm font-bold flex items-center gap-3 border backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-200 max-w-[90vw] sm:max-w-md ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/20'
              : 'bg-red-600 text-white border-red-500 shadow-red-900/20'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span className="flex-1 leading-snug">{toastMessage.text}</span>
        </div>
      )}

      {/* ── DOCTOR CALL ALERT BANNER ── */}
      {doctorCallAlert && (
        <div className="rounded-3xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3 duration-300 ring-4 ring-emerald-200/50">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md ring-4 ring-emerald-200 animate-bounce">
              <Bell className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 text-white px-3 py-0.5 text-xs font-black uppercase tracking-wider shadow-xs">
                  DOCTOR CALLED NEXT PATIENT
                </span>
                <span className="text-xs sm:text-sm font-black text-emerald-900">
                  Ticket #{doctorCallAlert.queueNumber}
                </span>
              </div>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-1 leading-tight">
                Admit{' '}
                <span className="text-emerald-700 underline decoration-2">
                  {doctorCallAlert.displayName}
                </span>{' '}
                (Token:{' '}
                <span className="font-mono text-emerald-800">{doctorCallAlert.tokenCode}</span>) into room!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              onClick={dismissDoctorCallAlert}
              className="flex-1 sm:flex-initial h-11 px-5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-sm"
            >
              Patient Admitted / Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* ── SESSION STATUS HELPER BANNER ── */}
      {(!activeSession || activeSession.status !== 'ACTIVE') && (
        <div
          className={`rounded-2xl border p-3.5 sm:p-4 shadow-xs flex items-start gap-3.5 ${
            activeSession?.status === 'PAUSED'
              ? 'border-amber-300 bg-amber-50/90 text-amber-950'
              : 'border-blue-200 bg-blue-50/90 text-blue-950'
          }`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              activeSession?.status === 'PAUSED'
                ? 'bg-amber-200 text-amber-900'
                : 'bg-blue-200 text-blue-900'
            }`}
          >
            <Clock3 className="h-5 w-5" />
          </div>
          <div className="flex-1 text-xs sm:text-sm">
            <p className="font-bold">
              {activeSession?.status === 'PAUSED'
                ? 'Doctor is On Hospital Rounds or Surgical Procedure'
                : 'Clinic Session Awaiting Doctor to Start'}
            </p>
            <p className="mt-0.5 leading-relaxed text-slate-600 text-xs">
              {activeSession?.status === 'PAUSED'
                ? activeSession.announcement_notice ||
                  'Consultation calls are paused temporarily. You may still register walk-in patients.'
                : `Dr. ${doctor?.name || 'the doctor'} has not yet opened today's queue session. You can continue registering walk-in patients and recording triage vitals in the meantime.`}
            </p>
          </div>
        </div>
      )}

      {/* ── TOP ACTION BAR (WIDESCREEN FLUID) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-700" />
            Queue &amp; Triage Logbook
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Active patient registry for today&apos;s clinic session &bull;{' '}
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <Link href="/secretary/walk-in" className="flex-1 sm:flex-initial">
            <Button
              size="default"
              className="w-full sm:w-auto h-11 px-4 text-xs sm:text-sm font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-2xl shadow-sm gap-2"
            >
              <UserPlus className="h-4.5 w-4.5" />
              <span>+ Register Walk-In</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="default"
            onClick={() => setIsQRScannerOpen(true)}
            className="h-11 px-3 sm:px-4 text-xs sm:text-sm font-bold border-slate-300 hover:bg-white text-slate-700 rounded-2xl shadow-xs gap-1.5"
            title="Scan QR Ticket Pass"
          >
            <QrCode className="h-4 w-4 text-brand-700" />
            <span className="hidden xs:inline">Scan QR</span>
          </Button>

          {/* Desktop View Switcher (Cards vs Table) */}
          <div className="hidden md:flex bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden p-1">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              title="Card View (Responsive)"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                viewMode === 'cards'
                  ? 'bg-brand-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('logbook')}
              title="Table View (Spreadsheet)"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                viewMode === 'logbook'
                  ? 'bg-brand-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Logbook</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── QUICK STATS & TAP-TO-FILTER ROW ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        {stats.map((s) => {
          const isSelected = statusFilter === s.id;
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              className={`rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98] ${
                isSelected
                  ? `${s.activeColor} shadow-md ring-2 ring-offset-2 ring-brand-500`
                  : `${s.bg} hover:border-slate-300`
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-tight">
                  {s.label}
                </span>
                <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : s.color}`} />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono leading-none">
                  {s.value}
                </span>
                <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-500'} font-medium`}>
                  patients
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── SEARCH & FILTER ROW ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by patient name, 09XX mobile number, or ticket #..."
            className="h-12 pl-11 pr-10 text-sm font-semibold border-slate-200 focus:border-brand-700 bg-slate-50/70 rounded-2xl placeholder:text-slate-400 placeholder:font-normal"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter status pill selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'WAITING', label: `Waiting (${waitingPatients.length})` },
            { id: 'SERVING', label: `In Room (${servingPatients.length})` },
            { id: 'BUFFERED', label: `Buffer Lane (${bufferedPatients.length})` },
            { id: 'COMPLETED', label: `Completed (${completedPatients.length})` },
            { id: 'ALL', label: `All Records (${appointments.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-xl px-3 py-1.5 font-bold transition-all border whitespace-nowrap text-xs ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── LOADING STATE ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="h-7 w-7 animate-spin text-brand-700 mb-2" />
          <span className="text-sm font-bold text-slate-600">Loading patient registry...</span>
        </div>
      )}

      {/* ── VIEW 1: PATIENT CARDS (WIDESCREEN FLUID GRID) ── */}
      {!loading && (viewMode === 'cards' || typeof window !== 'undefined' && window.innerWidth < 768) && (
        <div className="space-y-3 w-full">
          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-800">No Patients in this Category</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchTerm
                    ? `No matches found for "${searchTerm}". Try clearing your search.`
                    : statusFilter === 'WAITING'
                    ? 'All waiting patients have been called, or no new patients have arrived yet.'
                    : 'Choose another status filter above.'}
                </p>
              </div>
              <Link href="/secretary/walk-in">
                <Button className="h-10 text-xs font-bold rounded-xl bg-brand-700 text-white gap-2">
                  <UserPlus className="h-4 w-4" />
                  Register New Walk-In
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 w-full">
              {filteredAppointments.map((appt) => {
                const isServing = appt.status === 'SERVING';
                const isBuffered = appt.status === 'BUFFERED' || appt.status === 'SKIPPED';
                const isDone = appt.status === 'COMPLETED';
                const isNoShow = appt.status === 'CANCELLED_NO_SHOW';
                const isWaiting = appt.status === 'WAITING' || appt.status === 'BOOKED';
                const isLoading = actionLoadingId === appt.id;

                return (
                  <Card
                    key={appt.id}
                    className={`rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
                      isServing
                        ? 'border-2 border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-400/30'
                        : isBuffered
                        ? 'border-amber-300 bg-amber-50/40'
                        : isDone || isNoShow
                        ? 'border-slate-200 bg-slate-50/60 opacity-80'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <CardContent className="p-4 space-y-3.5">
                      {/* Top Header: Queue Number + Token + Priority */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl text-base font-black font-mono shadow-xs ${
                              isServing
                                ? 'bg-emerald-600 text-white'
                                : isBuffered
                                ? 'bg-amber-500 text-white'
                                : isDone
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-brand-700 text-white'
                            }`}
                          >
                            #{appt.queue_number}
                          </span>
                          <div>
                            <span className="font-mono text-xs font-bold tracking-wide text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg inline-block">
                              {appt.token_code}
                            </span>
                            <div className="mt-0.5">
                              <ChannelBadge channel={appt.booking_channel} />
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          <StatusPill status={appt.status} />
                          <PriorityBadge category={appt.priority_category} />
                        </div>
                      </div>

                      {/* Middle: Patient Name & Contact */}
                      <div className="pt-0.5">
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {appt.display_name}
                        </h3>
                        {appt.phone_number && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 font-mono">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{appt.phone_number}</span>
                          </div>
                        )}
                      </div>

                      {/* Badges Bar: Vitals & Payment Status */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 flex-wrap">
                        {/* Vitals Indicator */}
                        {appt.has_vitals ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold">
                            <Check className="h-3 w-3" />
                            Vitals Recorded
                          </span>
                        ) : isWaiting || isBuffered ? (
                          <button
                            type="button"
                            onClick={() => setSelectedApptForVitals(appt)}
                            className="inline-flex items-center gap-1 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-900 border border-orange-300 px-2.5 py-0.5 text-[11px] font-semibold transition-colors"
                          >
                            <Stethoscope className="h-3 w-3 text-orange-700" />
                            + Record Vitals
                          </button>
                        ) : null}

                        {/* Payment Indicator */}
                        {appt.is_paid_to_clinic ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold">
                            <Receipt className="h-3 w-3" />
                            Paid ({appt.clinic_payment_method || 'Cash'})
                          </span>
                        ) : (
                          <Link href={`/secretary/cashier?appointmentId=${appt.id}`}>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-2.5 py-0.5 text-[11px] font-semibold transition-colors">
                              ₱ Settle Fee (₱{appt.consultation_fee || doctor?.consultation_fee || 600})
                            </span>
                          </Link>
                        )}
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        {isWaiting && (
                          <>
                            {/* Primary: Call Inside */}
                            <Button
                              size="default"
                              onClick={() => handleInitiateCallInside(appt)}
                              disabled={isLoading}
                              className="flex-1 h-11 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs gap-1.5"
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <PhoneCall className="h-4 w-4" />
                              )}
                              <span>Call Inside</span>
                            </Button>

                            {/* Secondary: Vitals */}
                            <Button
                              variant="outline"
                              size="default"
                              onClick={() => setSelectedApptForVitals(appt)}
                              className="h-11 w-11 p-0 rounded-2xl border-slate-300 text-slate-700 hover:bg-slate-100 shrink-0"
                              title="Record Vitals / Triage"
                            >
                              <Stethoscope className="h-4.5 w-4.5 text-brand-700" />
                            </Button>

                            {/* Tertiary: Buffer */}
                            <Button
                              variant="outline"
                              size="default"
                              onClick={() => handleOpenBufferModal(appt)}
                              disabled={isLoading}
                              className="h-11 w-11 p-0 rounded-2xl border-slate-300 text-slate-500 hover:text-amber-700 hover:bg-amber-50 shrink-0"
                              title="Move to Buffer Lane"
                            >
                              <Hourglass className="h-4.5 w-4.5" />
                            </Button>
                          </>
                        )}

                        {isBuffered && (
                          <>
                            <Button
                              size="default"
                              onClick={() => handleRestoreFromBuffer(appt.id)}
                              disabled={isLoading}
                              className="flex-1 h-11 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs gap-1.5"
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              )}
                              <span>Restore (+2 Ahead)</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="default"
                              onClick={() => handleInitiateCallInside(appt)}
                              disabled={isLoading}
                              className="h-11 px-3 rounded-2xl border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold text-xs"
                            >
                              Admit
                            </Button>
                          </>
                        )}

                        {isServing && (
                          <div className="w-full space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                              <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping inline-block" />
                                In Room / Called
                              </span>
                              <span className="text-[11px] text-slate-500 font-normal">Slot #{appt.queue_number}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link href={`/secretary/cashier?appointmentId=${appt.id}`} className="flex-1">
                                <Button
                                  size="default"
                                  className="w-full h-10 rounded-2xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold gap-1.5 shadow-xs"
                                >
                                  <Receipt className="h-4 w-4" />
                                  <span>Prepare Receipt</span>
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="default"
                                onClick={() => handleOpenBufferModal(appt)}
                                disabled={isLoading}
                                className="h-10 px-3 rounded-2xl border-amber-300 bg-amber-50/70 hover:bg-amber-100 text-amber-900 font-bold text-xs gap-1.5 shrink-0"
                                title="Patient not in room? Move to Buffer Lane"
                              >
                                <Hourglass className="h-4 w-4 text-amber-700" />
                                <span>Buffer</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="default"
                                onClick={() => handleReturnToWaiting(appt)}
                                disabled={isLoading}
                                className="h-10 px-2.5 rounded-2xl border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs shrink-0"
                                title="Return patient back to Waiting"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {(isDone || isNoShow) && (
                          <div className="w-full flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span>Status: {isNoShow ? 'No-Show' : 'Completed'}</span>
                            <Link href={`/secretary/cashier?appointmentId=${appt.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl border-slate-300 text-xs font-bold"
                              >
                                View in Cashier
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 2: LOGBOOK TABLE (FULL WIDESCREEN TABLE) ── */}
      {!loading && viewMode === 'logbook' && (
        <div className="hidden md:block bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden w-full">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="w-12 text-center text-[11px] font-bold uppercase text-slate-500">
                    #
                  </TableHead>
                  <TableHead className="w-28 text-[11px] font-bold uppercase text-slate-500">
                    Ticket
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase text-slate-500">
                    Patient Name
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase text-slate-500">
                    Channel
                  </TableHead>
                  <TableHead className="text-center text-[11px] font-bold uppercase text-slate-500">
                    Vitals
                  </TableHead>
                  <TableHead className="text-center text-[11px] font-bold uppercase text-slate-500">
                    Fee Status
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase text-slate-500">
                    Status
                  </TableHead>
                  <TableHead className="text-right pr-4 text-[11px] font-bold uppercase text-slate-500">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-44 text-center text-slate-400 font-medium">
                      No patients found in this category.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((appt) => {
                    const isServing = appt.status === 'SERVING';
                    const isBuffered = appt.status === 'BUFFERED' || appt.status === 'SKIPPED';
                    const isLoading = actionLoadingId === appt.id;

                    return (
                      <TableRow
                        key={appt.id}
                        className={`transition-colors border-b border-slate-100 ${
                          isServing
                            ? 'bg-emerald-50/60 font-medium'
                            : isBuffered
                            ? 'bg-amber-50/50'
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <TableCell className="text-center font-mono font-bold text-slate-700">
                          {appt.queue_number}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                            {appt.token_code}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-900 leading-tight">
                            {appt.display_name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {appt.phone_number && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {appt.phone_number}
                              </span>
                            )}
                            <PriorityBadge category={appt.priority_category} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <ChannelBadge channel={appt.booking_channel} />
                        </TableCell>
                        <TableCell className="text-center">
                          {appt.has_vitals ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                              Done
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedApptForVitals(appt)}
                              className="h-7 text-[11px] font-bold text-orange-700 hover:bg-orange-50 px-2"
                            >
                              + Record
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {appt.is_paid_to_clinic ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                              Paid
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-500">
                              ₱{appt.consultation_fee || doctor?.consultation_fee || 600}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusPill status={appt.status} />
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {(appt.status === 'WAITING' || appt.status === 'BOOKED') && (
                              <Button
                                size="sm"
                                onClick={() => handleInitiateCallInside(appt)}
                                disabled={isLoading}
                                className="h-8 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl gap-1 px-3 shadow-xs"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <PhoneCall className="h-3 w-3" />
                                )}
                                <span>Call In</span>
                              </Button>
                            )}

                            {isBuffered && (
                              <Button
                                size="sm"
                                onClick={() => handleRestoreFromBuffer(appt.id)}
                                disabled={isLoading}
                                className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl gap-1 px-2.5 shadow-xs"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Restore</span>
                              </Button>
                            )}

                            {appt.status === 'SERVING' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenBufferModal(appt)}
                                  disabled={isLoading}
                                  className="h-8 text-xs font-bold border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 rounded-xl gap-1 px-2.5 shadow-xs"
                                  title="Patient not in room? Move to Buffer Lane"
                                >
                                  <Hourglass className="h-3 w-3 text-amber-700" />
                                  <span>Buffer</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReturnToWaiting(appt)}
                                  disabled={isLoading}
                                  className="h-8 text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl px-2"
                                  title="Return back to Waiting"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              </>
                            )}

                            <Link href={`/secretary/cashier?appointmentId=${appt.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-bold rounded-xl border-slate-200"
                              >
                                Settle Fee
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {selectedApptForVitals && (
        <VitalSignsTriageModal
          isOpen={!!selectedApptForVitals}
          onClose={() => setSelectedApptForVitals(null)}
          appointment={selectedApptForVitals}
          doctorId={doctor?.id}
          onSaveSuccess={() => {
            showToast('Vital signs recorded and updated in doctor cockpit!');
            refreshData();
          }}
        />
      )}

      {isQRScannerOpen && (
        <QRScannerModal
          isOpen={isQRScannerOpen}
          onClose={() => setIsQRScannerOpen(false)}
          appointments={appointments}
          onCheckInSuccess={() => {
            showToast('Patient checked in and marked as waiting.');
            refreshData();
          }}
        />
      )}

      {/* Safe Call Inside Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmCallInsideAppt}
        onOpenChange={(open) => !open && setConfirmCallInsideAppt(null)}
        title={`Admit Patient #${confirmCallInsideAppt?.queue_number} (${confirmCallInsideAppt?.display_name})?`}
        description={`Patient #${appointments.find((a) => a.status === 'SERVING')?.queue_number} (${appointments.find((a) => a.status === 'SERVING')?.display_name}) is currently in the room. Admitting #${confirmCallInsideAppt?.queue_number} will conclude the current consultation as Completed.`}
        confirmLabel={`Yes, Admit #${confirmCallInsideAppt?.queue_number}`}
        cancelLabel="Cancel"
        variant="brand"
        isLoading={actionLoadingId === confirmCallInsideAppt?.id}
        onConfirm={async () => {
          if (confirmCallInsideAppt) {
            const target = confirmCallInsideAppt;
            setConfirmCallInsideAppt(null);
            await handleCallInside(target);
          }
        }}
      />

      {/* Buffer Lane Configurable Modal */}
      {selectedApptForBuffer && (
        <BufferModal
          isOpen={!!selectedApptForBuffer}
          onClose={() => setSelectedApptForBuffer(null)}
          appointment={selectedApptForBuffer}
          isLoading={actionLoadingId === selectedApptForBuffer.id}
          onConfirm={handleConfirmBuffer}
        />
      )}
    </div>
  );
}
