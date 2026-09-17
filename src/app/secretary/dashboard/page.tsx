'use client';

import React, { useState, useMemo } from 'react';
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
  ChevronRight,
  AlertTriangle,
  Clock3,
  Users,
  Timer,
  PhoneCall,
  BadgeCheck,
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

// ── Priority Badge ──────────────────────────────────────────────────────────
function PriorityBadge({ category }: { category: PriorityCategory }) {
  if (category === 'NONE') return null;
  const config = {
    SENIOR: {
      label: 'Senior • 20% Off',
      className: 'bg-amber-100 text-amber-800 border-amber-300 ring-1 ring-amber-200',
    },
    PWD: {
      label: 'PWD • 20% Off',
      className: 'bg-blue-100 text-blue-800 border-blue-300 ring-1 ring-blue-200',
    },
    PREGNANT: {
      label: 'Pregnant • Express',
      className: 'bg-rose-100 text-rose-800 border-rose-300 ring-1 ring-rose-200',
    },
  }[category];

  if (!config) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// ── Status Pill ────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    WAITING:           { label: 'Waiting',    className: 'bg-sky-100 text-sky-800 border-sky-300' },
    BOOKED:            { label: 'Booked',     className: 'bg-slate-100 text-slate-700 border-slate-300' },
    SERVING:           { label: '▶ In Room',  className: 'bg-blue-600 text-white border-blue-600 animate-pulse' },
    BUFFERED:          { label: '⏳ Buffer',   className: 'bg-amber-100 text-amber-900 border-amber-300' },
    SKIPPED:           { label: 'Skipped',    className: 'bg-amber-100 text-amber-900 border-amber-300' },
    COMPLETED:         { label: '✓ Done',     className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    CANCELLED_NO_SHOW: { label: '✗ No-Show', className: 'bg-red-100 text-red-800 border-red-300' },
  };
  const cfg = map[status] ?? { label: status, className: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ── Channel Badge ──────────────────────────────────────────────────────────
function ChannelBadge({ channel }: { channel: string }) {
  if (channel === 'ONLINE') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 text-[10px] font-bold">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 inline-block" />
        Online
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px] font-bold">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 inline-block" />
      Walk-In
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function SecretaryDashboardPage() {
  const supabase = createClient();
  const { activeSession, appointments, doctor, loading, refreshData } = useSecretary();

  const [viewMode, setViewMode] = useState<'logbook' | 'cards'>('logbook');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedApptForVitals, setSelectedApptForVitals] = useState<Appointment | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

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

      if (statusFilter === 'WAITING') return appt.status === 'WAITING' || appt.status === 'BOOKED';
      if (statusFilter === 'SERVING') return appt.status === 'SERVING';
      if (statusFilter === 'BUFFERED') return appt.status === 'BUFFERED' || appt.status === 'SKIPPED';
      if (statusFilter === 'COMPLETED') return appt.status === 'COMPLETED' || appt.status === 'CANCELLED_NO_SHOW';
      return true;
    });
  }, [appointments, searchTerm, statusFilter]);

  const waitingPatients = appointments.filter((a) => a.status === 'WAITING' || a.status === 'BOOKED');
  const bufferedPatients = appointments.filter((a) => a.status === 'BUFFERED' || a.status === 'SKIPPED');
  const servingPatients = appointments.filter((a) => a.status === 'SERVING');
  const completedPatients = appointments.filter((a) => a.status === 'COMPLETED' || a.status === 'CANCELLED_NO_SHOW');

  // ── Queue Actions ────────────────────────────────────────────────────────
  const handleCheckInArrived = async (apptId: string) => {
    setActionLoadingId(apptId);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'WAITING' })
        .eq('id', apptId);
      if (error) throw error;
      showToast('Patient marked as arrived in clinic waiting lounge.');
      await refreshData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not check in patient.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSkipToBuffer = async (apptId: string, currentSkips: number) => {
    setActionLoadingId(apptId);
    try {
      const newCount = (currentSkips || 0) + 1;
      if (newCount >= 3) {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'CANCELLED_NO_SHOW', skip_count: newCount })
          .eq('id', apptId);
        if (error) throw error;
        showToast('Patient reached 3 missed calls — marked as No-Show.', 'error');
      } else {
        const deadline = new Date(Date.now() + 45 * 60 * 1000).toISOString();
        const { error } = await supabase
          .from('appointments')
          .update({
            status: 'BUFFERED',
            skip_count: newCount,
            buffered_at: new Date().toISOString(),
            grace_period_deadline: deadline,
          })
          .eq('id', apptId);
        if (error) throw error;
        showToast('Patient moved to Buffer Lane with a 45-minute grace period.');
      }
      await refreshData();
    } catch (err: unknown) {
      showToast('Failed to place patient in buffer lane.', 'error');
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
      showToast('Patient checked in and restored +2 slots ahead in the active line.');
      await refreshData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not restore patient.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCallInside = async (appt: Appointment) => {
    if (!activeSession) return;
    setActionLoadingId(appt.id);
    try {
      const currentServing = appointments.find((a) => a.status === 'SERVING');
      if (currentServing) {
        await supabase
          .from('appointments')
          .update({ status: 'COMPLETED' })
          .eq('id', currentServing.id);
      }
      await supabase
        .from('appointments')
        .update({ status: 'SERVING' })
        .eq('id', appt.id);
      await supabase
        .from('queue_sessions')
        .update({
          current_serving_number: appt.queue_number,
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', activeSession.id);
      showToast(`Token ${appt.token_code} (${appt.display_name}) is now inside with the doctor!`);
      await refreshData();
    } catch (err: unknown) {
      showToast('Could not advance patient turn.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Stats Bar ──────────────────────────────────────────────────────────
  const stats = [
    {
      label: 'Waiting',
      value: waitingPatients.length,
      icon: Users,
      color: 'text-sky-700',
      bg: 'bg-sky-50 border-sky-200',
      iconBg: 'bg-sky-100',
    },
    {
      label: 'In Room',
      value: servingPatients.length,
      icon: Activity,
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Buffer Lane',
      value: bufferedPatients.length,
      icon: Timer,
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
      iconBg: 'bg-amber-100',
    },
    {
      label: 'Completed',
      value: completedPatients.length,
      icon: BadgeCheck,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
      iconBg: 'bg-emerald-100',
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Toast Notice ── */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 rounded-2xl p-4 shadow-2xl text-sm font-bold flex items-center gap-3 border backdrop-blur-sm ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-red-600 text-white border-red-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ── PAGE TITLE BAR ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <TableIcon className="h-5 w-5 text-brand-700" />
            Queue & Triage Logbook
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            Real-time patient registry for today&apos;s consultation session
          </p>
        </div>
        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2">
          <Link href="/secretary/walk-in">
            <Button
              size="default"
              className="h-10 px-5 text-sm font-bold bg-brand-700 hover:bg-brand-700/90 text-white rounded-xl shadow-sm gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Register Walk-In
            </Button>
          </Link>
          <Button
            variant="outline"
            size="default"
            onClick={() => setIsQRScannerOpen(true)}
            className="h-10 px-4 text-sm font-bold border-slate-200 hover:bg-white hover:border-slate-300 text-slate-700 rounded-xl shadow-xs gap-2"
          >
            <QrCode className="h-4 w-4 text-brand-700" />
            <span className="hidden sm:inline">Scan Pass</span>
          </Button>
          {/* View Toggle */}
          <div className="hidden sm:flex bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('logbook')}
              title="Logbook Table View"
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all ${
                viewMode === 'logbook'
                  ? 'bg-brand-700 text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Logbook</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              title="Cards Board View"
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all border-l border-slate-200 ${
                viewMode === 'cards'
                  ? 'bg-brand-700 text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => setStatusFilter(s.label === 'Waiting' ? 'WAITING' : s.label === 'In Room' ? 'SERVING' : s.label === 'Buffer Lane' ? 'BUFFERED' : 'COMPLETED')}
              className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all hover:shadow-sm active:scale-[0.98] ${s.bg} ${
                (statusFilter === 'WAITING' && s.label === 'Waiting') ||
                (statusFilter === 'SERVING' && s.label === 'In Room') ||
                (statusFilter === 'BUFFERED' && s.label === 'Buffer Lane') ||
                (statusFilter === 'COMPLETED' && s.label === 'Completed')
                  ? 'ring-2 ring-offset-1 ring-current shadow-sm'
                  : ''
              }`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${s.iconBg}`}>
                <Icon className={`h-4.5 w-4.5 ${s.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-black leading-none ${s.color}`}>{s.value}</p>
                <p className={`text-[10px] font-bold mt-0.5 ${s.color} opacity-70`}>{s.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── SEARCH & FILTER ROW ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, 09XX mobile number, or token..."
            className="h-11 pl-10 text-sm font-semibold border-slate-200 focus:border-brand-700 bg-slate-50/60 rounded-xl placeholder:text-slate-400 placeholder:font-normal"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          {[
            { id: 'ALL', label: `All (${appointments.length})` },
            { id: 'WAITING', label: `Waiting (${waitingPatients.length})` },
            { id: 'SERVING', label: `In Room (${servingPatients.length})` },
            { id: 'BUFFERED', label: `Buffer (${bufferedPatients.length})` },
            { id: 'COMPLETED', label: `Done (${completedPatients.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-brand-700 text-white border-brand-700 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {loading && (
        <div className="flex items-center justify-center h-40 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm font-semibold">Loading patient registry...</span>
        </div>
      )}

      {/* ── VIEW MODE 1: LOGBOOK TABLE ── */}
      {!loading && viewMode === 'logbook' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Table Header Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <div>
              <h3 className="text-sm font-black text-slate-900">Daily Consultation Logbook</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {filteredAppointments.length} patient record{filteredAppointments.length !== 1 ? 's' : ''} shown
              </p>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/60 border-b border-slate-100 hover:bg-slate-50">
                  <TableHead className="w-12 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">#</TableHead>
                  <TableHead className="w-32 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Token</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Patient</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Channel</TableHead>
                  <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vitals</TableHead>
                  <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-right pr-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Search className="h-8 w-8 opacity-30" />
                        <p className="text-sm font-semibold">No patients found</p>
                        <p className="text-xs">Try clearing your search or changing the filter</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((appt, idx) => {
                    const isServing = appt.status === 'SERVING';
                    const isBuffered = appt.status === 'BUFFERED' || appt.status === 'SKIPPED';
                    const isDone = appt.status === 'COMPLETED';
                    const isNoShow = appt.status === 'CANCELLED_NO_SHOW';
                    const isLoading = actionLoadingId === appt.id;

                    return (
                      <TableRow
                        key={appt.id}
                        className={`transition-colors border-b border-slate-50 ${
                          isServing
                            ? 'bg-blue-50/60 hover:bg-blue-50'
                            : isBuffered
                            ? 'bg-amber-50/40 hover:bg-amber-50/60'
                            : isDone || isNoShow
                            ? 'opacity-60 hover:opacity-80 hover:bg-slate-50/40'
                            : idx % 2 === 1
                            ? 'bg-slate-50/30 hover:bg-slate-50'
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        {/* 1. Queue Number */}
                        <TableCell className="text-center">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600">
                            {appt.queue_number}
                          </span>
                        </TableCell>

                        {/* 2. Token Code */}
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-lg px-2.5 py-1 font-mono text-xs font-black tracking-wide border ${
                              isServing
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : isBuffered
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {appt.token_code}
                          </span>
                        </TableCell>

                        {/* 3. Patient */}
                        <TableCell className="max-w-[200px]">
                          <p className="font-extrabold text-sm text-slate-900 leading-snug truncate">
                            {appt.display_name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {appt.phone_number && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {appt.phone_number}
                              </span>
                            )}
                            <PriorityBadge category={appt.priority_category} />
                          </div>
                        </TableCell>

                        {/* 4. Channel */}
                        <TableCell>
                          <ChannelBadge channel={appt.booking_channel} />
                        </TableCell>

                        {/* 5. Vitals */}
                        <TableCell className="text-center">
                          {appt.has_vitals ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                              <Check className="h-3 w-3" />
                              Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 text-[10px] font-bold">
                              <AlertTriangle className="h-3 w-3" />
                              Needed
                            </span>
                          )}
                        </TableCell>

                        {/* 6. Payment */}
                        <TableCell className="text-center">
                          {appt.is_paid_to_clinic ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                              <Check className="h-3 w-3" />
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 text-[10px] font-bold">
                              ₱{doctor?.consultation_fee || 600}
                            </span>
                          )}
                        </TableCell>

                        {/* 7. Status */}
                        <TableCell>
                          <StatusPill status={appt.status} />
                        </TableCell>

                        {/* 8. Actions */}
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Vitals */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedApptForVitals(appt)}
                              className="h-8 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 gap-1.5 px-2.5 rounded-lg"
                              title="Record vital signs"
                            >
                              <Stethoscope className="h-3.5 w-3.5 text-brand-700" />
                              <span>Vitals</span>
                            </Button>

                            {/* Payment */}
                            <Link href={`/secretary/cashier?appointmentId=${appt.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-bold text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 gap-1.5 px-2.5 rounded-lg"
                                title="Settle consultation fee"
                              >
                                <Receipt className="h-3.5 w-3.5" />
                                <span>Pay</span>
                              </Button>
                            </Link>

                            {/* Buffer/Restore/Skip */}
                            {isBuffered ? (
                              <Button
                                size="sm"
                                onClick={() => handleRestoreFromBuffer(appt.id)}
                                disabled={isLoading}
                                className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5 px-2.5 rounded-lg shadow-xs"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3.5 w-3.5" />
                                )}
                                <span>Restore</span>
                              </Button>
                            ) : !isDone && !isNoShow ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSkipToBuffer(appt.id, appt.skip_count)}
                                disabled={isLoading}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                                title="Move to Buffer Lane (45-min grace)"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Hourglass className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            ) : null}

                            {/* Call Inside */}
                            {(appt.status === 'WAITING' || appt.status === 'BOOKED') && (
                              <Button
                                size="sm"
                                onClick={() => handleCallInside(appt)}
                                disabled={isLoading}
                                className="h-8 text-xs font-bold bg-brand-700 hover:bg-brand-700/90 text-white gap-1.5 px-3 rounded-lg shadow-xs"
                                title="Call patient into consultation room"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <PhoneCall className="h-3.5 w-3.5" />
                                )}
                                <span>Call In</span>
                              </Button>
                            )}
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

      {/* ── VIEW MODE 2: 4-COLUMN CARDS BOARD ── */}
      {!loading && viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Col 1: Waiting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-sky-600 px-3.5 py-2.5 text-white shadow-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wide">Waiting in Lobby</span>
              </div>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-black font-mono">
                {waitingPatients.length}
              </span>
            </div>
            <div className="space-y-2">
              {waitingPatients.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-sky-200 bg-sky-50/40 p-6 text-center">
                  <p className="text-xs text-sky-400 font-semibold">Lobby is clear</p>
                </div>
              )}
              {waitingPatients.map((appt) => (
                <Card key={appt.id} className="border-slate-200 bg-white shadow-xs hover:shadow-sm transition-shadow rounded-2xl overflow-hidden">
                  <CardContent className="p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                        {appt.token_code}
                      </span>
                      <PriorityBadge category={appt.priority_category} />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">{appt.display_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <ChannelBadge channel={appt.booking_channel} />
                        <span className="text-[10px] text-slate-400">#{appt.queue_number}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedApptForVitals(appt)}
                        className="h-8 text-xs font-bold flex-1 rounded-xl border-slate-200"
                      >
                        <Stethoscope className="h-3.5 w-3.5 text-brand-700 mr-1" />
                        Vitals
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleCallInside(appt)}
                        disabled={actionLoadingId === appt.id}
                        className="h-8 text-xs font-bold flex-1 bg-brand-700 hover:bg-brand-700/90 text-white rounded-xl"
                      >
                        {actionLoadingId === appt.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 mr-1" />
                        )}
                        Call In
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Col 2: Buffer Lane */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-amber-500 px-3.5 py-2.5 text-white shadow-sm">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wide">Buffer Lane</span>
              </div>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-black font-mono">
                {bufferedPatients.length}
              </span>
            </div>
            <div className="space-y-2">
              {bufferedPatients.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-6 text-center">
                  <p className="text-xs text-amber-500 font-semibold">No patients in buffer</p>
                </div>
              )}
              {bufferedPatients.map((appt) => (
                <Card key={appt.id} className="border-amber-300 bg-amber-50/60 shadow-xs rounded-2xl overflow-hidden">
                  <CardContent className="p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg">
                        {appt.token_code}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 border border-amber-200">
                        45-min grace
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">{appt.display_name}</p>
                      <p className="text-[10px] text-amber-700 font-semibold mt-0.5">Missed turn — waiting for arrival</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleRestoreFromBuffer(appt.id)}
                      disabled={actionLoadingId === appt.id}
                      className="w-full h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl gap-2"
                    >
                      {actionLoadingId === appt.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      Restore (+2 Slots Ahead)
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Col 3: In Room */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-blue-600 px-3.5 py-2.5 text-white shadow-sm">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wide">In Doctor Room</span>
              </div>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-black font-mono">
                {servingPatients.length}
              </span>
            </div>
            <div className="space-y-2">
              {servingPatients.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-6 text-center">
                  <p className="text-xs text-blue-400 font-semibold">No one inside yet</p>
                </div>
              )}
              {servingPatients.map((appt) => (
                <Card key={appt.id} className="border-2 border-blue-300 bg-white shadow-md rounded-2xl overflow-hidden">
                  <div className="bg-blue-600 px-3.5 py-2 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    <span className="font-mono text-sm font-black text-white">NOW SERVING: {appt.token_code}</span>
                  </div>
                  <CardContent className="p-3.5 space-y-3">
                    <div>
                      <p className="text-base font-extrabold text-slate-900">{appt.display_name}</p>
                      <p className="text-xs text-slate-400">Currently in consultation with physician</p>
                    </div>
                    <Link href={`/secretary/cashier?appointmentId=${appt.id}`} className="block">
                      <Button variant="outline" size="sm" className="w-full h-9 text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl gap-2">
                        <Receipt className="h-3.5 w-3.5" />
                        Prepare Receipt & Payment
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Col 4: Completed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-slate-700 px-3.5 py-2.5 text-white shadow-sm">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wide">Completed Today</span>
              </div>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-black font-mono">
                {completedPatients.length}
              </span>
            </div>
            <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-0.5">
              {completedPatients.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 p-6 text-center">
                  <p className="text-xs text-slate-400 font-semibold">No consultations done yet</p>
                </div>
              )}
              {completedPatients.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-xs gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-slate-400 text-[10px] block">{appt.token_code}</span>
                    <p className="font-bold text-slate-700 truncate">{appt.display_name}</p>
                  </div>
                  {appt.status === 'CANCELLED_NO_SHOW' ? (
                    <span className="shrink-0 rounded-full bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5">
                      No-Show
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5">
                      Done
                    </span>
                  )}
                </div>
              ))}
            </div>
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
            showToast('Vital signs recorded and synchronized with doctor cockpit!');
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
    </div>
  );
}
