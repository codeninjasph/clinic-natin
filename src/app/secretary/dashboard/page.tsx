'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  UserPlus,
  QrCode,
  Stethoscope,
  Clock,
  Check,
  CheckCircle2,
  X,
  Hourglass,
  RotateCcw,
  Receipt,
  LayoutGrid,
  Table as TableIcon,
  Star,
  Baby,
  Accessibility,
  Activity,
  AlertCircle,
  Loader2,
  ChevronRight,
  Phone,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSecretary, type Appointment, type PriorityCategory } from '../secretary-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

function PriorityBadge({ category }: { category: PriorityCategory }) {
  if (category === 'NONE') return null;
  const config = {
    SENIOR: { label: 'Senior (20% Off)', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    PWD: { label: 'PWD (20% Off)', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    PREGNANT: { label: 'Pregnant (Express)', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  }[category];

  if (!config) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${config.color}`}
    >
      {config.label}
    </span>
  );
}

export default function SecretaryDashboardPage() {
  const supabase = createClient();
  const { activeSession, appointments, doctor, loading, refreshData } = useSecretary();

  // View state: 'logbook' (paper-style table) vs 'cards' (kanban columns)
  const [viewMode, setViewMode] = useState<'logbook' | 'cards'>('logbook');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [selectedApptForVitals, setSelectedApptForVitals] = useState<Appointment | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  // Operation loading state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered appointments
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

  // Derived lists for cards view
  const waitingPatients = appointments.filter((a) => a.status === 'WAITING' || a.status === 'BOOKED');
  const bufferedPatients = appointments.filter((a) => a.status === 'BUFFERED' || a.status === 'SKIPPED');
  const servingPatients = appointments.filter((a) => a.status === 'SERVING');
  const completedPatients = appointments.filter((a) => a.status === 'COMPLETED' || a.status === 'CANCELLED_NO_SHOW');

  // Queue actions
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
      // Complete currently serving if any
      const currentServing = appointments.find((a) => a.status === 'SERVING');
      if (currentServing) {
        await supabase
          .from('appointments')
          .update({ status: 'COMPLETED' })
          .eq('id', currentServing.id);
      }

      // Mark this appt as SERVING
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

  return (
    <div className="space-y-5">
      {/* Toast Notice */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 rounded-2xl p-4 shadow-xl text-sm font-bold flex items-center gap-3 border ${
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

      {/* ── TOP OPERATIONAL BAR ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left: Quick Registration & QR Scan Primary Buttons */}
        <div className="flex items-center gap-2">
          <Link href="/secretary/walk-in">
            <Button
              variant="brand"
              size="lg"
              className="h-12 px-5 text-sm font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl shadow-xs gap-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>Register Walk-In Patient</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsQRScannerOpen(true)}
            className="h-12 px-4 text-sm font-bold border-slate-300 hover:bg-white text-slate-800 rounded-xl shadow-xs gap-2"
            title="Scan patient digital pass QR code or search token"
          >
            <QrCode className="h-4 w-4 text-brand-700" />
            <span className="hidden sm:inline">Scan Patient Pass</span>
          </Button>
        </div>

        {/* Right: View Toggle (Paper Logbook vs Cards) */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center">
            <button
              type="button"
              onClick={() => setViewMode('logbook')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'logbook'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="h-4 w-4 text-brand-700" />
              <span>Logbook View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-4 w-4 text-brand-700" />
              <span>Cards View</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER STRIP ── */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardContent className="p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Big Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, 09XX mobile, or token #..."
              className="h-11 pl-10 text-sm font-semibold border-slate-300 focus:border-brand-700 bg-slate-50/50"
            />
          </div>

          {/* Status Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {[
              { id: 'ALL', label: `All (${appointments.length})` },
              { id: 'WAITING', label: `Waiting (${waitingPatients.length})` },
              { id: 'SERVING', label: `In Room (${servingPatients.length})` },
              { id: 'BUFFERED', label: `Buffer Lane (${bufferedPatients.length})` },
              { id: 'COMPLETED', label: `Done (${completedPatients.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                  statusFilter === tab.id
                    ? 'bg-brand-700 text-white border-brand-700 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── VIEW MODE 1: PAPER-STYLE PATIENT LOGBOOK TABLE ── */}
      {viewMode === 'logbook' && (
        <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Daily Consultation Logbook &amp; Queue Registry</span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Physical lined registry format with direct 1-click vitals intake, cashier settlement, and call controls
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 font-mono">
              Showing {filteredAppointments.length} patient records
            </span>
          </CardHeader>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow>
                  <TableHead className="w-12 text-xs font-bold text-slate-700 text-center">#</TableHead>
                  <TableHead className="w-28 text-xs font-bold text-slate-700">Token Slot</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Patient Full Name</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Channel</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Triage Vitals</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Payment Status</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 text-right pr-4">Desk Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-slate-100">
                {filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center text-slate-400 text-xs">
                      No patients found matching your search or active filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((appt, idx) => {
                    const isServing = appt.status === 'SERVING';
                    const isBuffered = appt.status === 'BUFFERED' || appt.status === 'SKIPPED';
                    const isDone = appt.status === 'COMPLETED';
                    const isNoShow = appt.status === 'CANCELLED_NO_SHOW';

                    return (
                      <TableRow
                        key={appt.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isServing ? 'bg-blue-50/60 font-semibold' : idx % 2 === 1 ? 'bg-slate-50/30' : ''
                        }`}
                      >
                        {/* 1. Queue Order */}
                        <TableCell className="text-center font-bold text-xs text-slate-500">
                          {appt.queue_number}
                        </TableCell>

                        {/* 2. Token Code */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`font-mono text-xs font-black px-2 py-0.5 ${
                              isServing
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                          >
                            {appt.token_code}
                          </Badge>
                        </TableCell>

                        {/* 3. Patient Name & Priority */}
                        <TableCell>
                          <div>
                            <span className="font-extrabold text-sm text-slate-900 block leading-snug">
                              {appt.display_name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {appt.phone_number && (
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {appt.phone_number}
                                </span>
                              )}
                              <PriorityBadge category={appt.priority_category} />
                            </div>
                          </div>
                        </TableCell>

                        {/* 4. Booking Channel */}
                        <TableCell>
                          <span className="text-xs text-slate-600 font-medium">
                            {appt.booking_channel === 'ONLINE' ? 'Online Reserved' : 'Front-Desk Walk-In'}
                          </span>
                        </TableCell>

                        {/* 5. Triage Vitals Status */}
                        <TableCell>
                          {appt.has_vitals ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold gap-1">
                              <Check className="h-3 w-3" />
                              Recorded
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-bold text-amber-700 bg-amber-50 border-amber-200">
                              Needs Vitals
                            </Badge>
                          )}
                        </TableCell>

                        {/* 6. Payment Status */}
                        <TableCell>
                          {appt.is_paid_to_clinic ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold gap-1">
                              <Check className="h-3 w-3" />
                              Paid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-bold text-slate-600 bg-slate-100">
                              Unpaid (₱{doctor?.consultation_fee || 600})
                            </Badge>
                          )}
                        </TableCell>

                        {/* 7. Current Status */}
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isServing
                                ? 'bg-blue-600 text-white animate-pulse'
                                : isBuffered
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : isDone
                                ? 'bg-emerald-100 text-emerald-800'
                                : isNoShow
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {appt.status}
                          </span>
                        </TableCell>

                        {/* 8. Actions (Large, easy-to-click buttons) */}
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Record Vitals Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedApptForVitals(appt)}
                              className="h-8 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100 gap-1 px-2.5 rounded-lg"
                              title="Record or update patient baseline vitals"
                            >
                              <Stethoscope className="h-3.5 w-3.5 text-brand-700" />
                              <span>Vitals</span>
                            </Button>

                            {/* Cashier Payment Link */}
                            <Link href={`/secretary/cashier?appointmentId=${appt.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-bold text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 gap-1 px-2.5 rounded-lg"
                                title="Settle fee & issue receipt"
                              >
                                <Receipt className="h-3.5 w-3.5 text-emerald-700" />
                                <span>Bayad</span>
                              </Button>
                            </Link>

                            {/* If in Buffer: Restore button */}
                            {isBuffered ? (
                              <Button
                                variant="brand"
                                size="sm"
                                onClick={() => handleRestoreFromBuffer(appt.id)}
                                disabled={actionLoadingId === appt.id}
                                className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1 px-2.5 rounded-lg"
                              >
                                {actionLoadingId === appt.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3.5 w-3.5" />
                                )}
                                <span>Restore</span>
                              </Button>
                            ) : (
                              /* If not in buffer and not done: Buffer / Skip button */
                              !isDone && !isNoShow && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSkipToBuffer(appt.id, appt.skip_count)}
                                  disabled={actionLoadingId === appt.id}
                                  className="h-8 text-xs font-semibold text-slate-500 hover:text-amber-700 hover:bg-amber-50 px-2 rounded-lg"
                                  title="Move absent patient to Buffer Lane (45m Grace)"
                                >
                                  <Hourglass className="h-3.5 w-3.5 text-amber-600" />
                                </Button>
                              )
                            )}

                            {/* Call Inside Button (if waiting) */}
                            {(appt.status === 'WAITING' || appt.status === 'BOOKED') && (
                              <Button
                                variant="brand"
                                size="sm"
                                onClick={() => handleCallInside(appt)}
                                disabled={actionLoadingId === appt.id}
                                className="h-8 text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white gap-1 px-3 rounded-lg shadow-2xs"
                                title="Call patient inside doctor consultation room"
                              >
                                {actionLoadingId === appt.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                                <span>Call Inside</span>
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
        </Card>
      )}

      {/* ── VIEW MODE 2: 4-COLUMN CARDS OPERATIONS BOARD ── */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Col 1: Waiting Lineup */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
              <span className="text-xs font-black uppercase text-slate-700">Waiting in Lobby</span>
              <Badge className="bg-slate-800 text-white font-mono">{waitingPatients.length}</Badge>
            </div>

            <div className="space-y-2.5">
              {waitingPatients.map((appt) => (
                <Card key={appt.id} className="border-slate-200 shadow-2xs bg-white p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-xs font-black">
                      {appt.token_code}
                    </Badge>
                    <PriorityBadge category={appt.priority_category} />
                  </div>

                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{appt.display_name}</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {appt.booking_channel === 'ONLINE' ? 'Online Reserved' : 'Walk-In'} &bull; Slot #{appt.queue_number}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedApptForVitals(appt)}
                      className="h-8 text-xs font-bold flex-1"
                    >
                      <Stethoscope className="h-3.5 w-3.5 text-brand-700 mr-1" />
                      Vitals
                    </Button>
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={() => handleCallInside(appt)}
                      className="h-8 text-xs font-bold flex-1 bg-brand-700 hover:bg-brand-800 text-white"
                    >
                      Call Inside →
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Col 2: Buffer Lane */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-xs font-black uppercase text-amber-900">Buffer Lane (45m Grace)</span>
              <Badge className="bg-amber-600 text-white font-mono">{bufferedPatients.length}</Badge>
            </div>

            <div className="space-y-2.5">
              {bufferedPatients.map((appt) => (
                <Card key={appt.id} className="border-amber-300 bg-amber-50/50 p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-xs font-black text-amber-900 border-amber-300">
                      {appt.token_code}
                    </Badge>
                    <span className="text-[10px] font-bold text-amber-800">45-min countdown</span>
                  </div>

                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{appt.display_name}</p>
                    <p className="text-[11px] text-amber-800">Missed turn: Held for arrival</p>
                  </div>

                  <Button
                    variant="brand"
                    size="sm"
                    onClick={() => handleRestoreFromBuffer(appt.id)}
                    className="w-full h-8 text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white gap-1"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore (+2 Slots Ahead)
                  </Button>
                </Card>
              ))}
            </div>
          </div>

          {/* Col 3: In Room */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-xs font-black uppercase text-blue-900">Inside Doctor Room</span>
              <Badge className="bg-blue-600 text-white font-mono">{servingPatients.length}</Badge>
            </div>

            <div className="space-y-2.5">
              {servingPatients.map((appt) => (
                <Card key={appt.id} className="border-2 border-blue-400 bg-white p-4 space-y-3 shadow-md">
                  <Badge className="bg-blue-600 text-white font-mono text-sm px-2.5 py-0.5">
                    NOW SERVING: {appt.token_code}
                  </Badge>
                  <div>
                    <p className="text-base font-extrabold text-slate-900">{appt.display_name}</p>
                    <p className="text-xs text-slate-500">Currently in consultation with physician</p>
                  </div>
                  <Link href={`/secretary/cashier?appointmentId=${appt.id}`} className="block">
                    <Button variant="outline" size="sm" className="w-full h-9 text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50">
                      <Receipt className="h-3.5 w-3.5 mr-1" />
                      Prepare Receipt &amp; Payment
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          </div>

          {/* Col 4: Completed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 border border-slate-200">
              <span className="text-xs font-black uppercase text-slate-700">Completed Today</span>
              <Badge className="bg-emerald-700 text-white font-mono">{completedPatients.length}</Badge>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {completedPatients.map((appt) => (
                <div key={appt.id} className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-slate-500">{appt.token_code}</span>
                    <p className="font-bold text-slate-800 truncate max-w-[130px]">{appt.display_name}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                    Done
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {/* 1. Vital Signs Intake Modal */}
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

      {/* 2. QR Scanner Modal */}
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
