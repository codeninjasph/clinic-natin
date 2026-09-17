'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  RefreshCw,
  Play,
  Activity,
  CheckCircle2,
  X,
  Stethoscope,
  Clock,
  Phone,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useDoctor } from '../doctor-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface QueueSession {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  current_serving_number: number;
  session_date: string;
}

interface AppointmentItem {
  id: string;
  queue_number: number;
  token_code: string;
  status: 'BOOKED' | 'WAITING' | 'SERVING' | 'BUFFERED' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED_NO_SHOW';
  priority_category: string;
  walk_in_name?: string | null;
  walk_in_phone?: string | null;
  booking_channel: 'ONLINE' | 'WALK_IN';
  buffered_at?: string | null;
  grace_period_deadline?: string | null;
  created_at: string;
  served_at?: string | null;
  completed_at?: string | null;
  patient?: {
    full_name: string;
    phone_number: string | null;
    allergies: string[];
    date_of_birth: string | null;
  } | null;
}

export default function DoctorQueuePage() {
  const supabase = createClient();
  const { doctor, selectedRoom, refreshDoctorData } = useDoctor();

  const [session, setSession] = useState<QueueSession | null>(null);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WAITING' | 'SERVING' | 'BUFFERED' | 'COMPLETED' | 'SKIPPED'>('ALL');
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'ONLINE' | 'WALK_IN'>('ALL');

  // Toast
  const [toastNotice, setToastNotice] = useState<{
    type: 'success' | 'destructive' | 'brand';
    title: string;
    message: string;
  } | null>(null);

  // ── Fetch Queue Session & Appointments ────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    try {
      let sessionQuery = supabase
        .from('queue_sessions')
        .select('id, status, current_serving_number, session_date')
        .in('status', ['ACTIVE', 'PAUSED'])
        .order('session_date', { ascending: false });

      if (selectedRoom?.clinicId) {
        sessionQuery = sessionQuery.eq('clinic_id', selectedRoom.clinicId);
      }
      if (doctor?.id) {
        sessionQuery = sessionQuery.eq('doctor_id', doctor.id);
      }

      const { data: sessionData } = await sessionQuery.limit(1).maybeSingle();

      if (sessionData) {
        setSession(sessionData);

        const { data: apptsData } = await supabase
          .from('appointments')
          .select(
            'id, queue_number, token_code, status, priority_category, walk_in_name, walk_in_phone, booking_channel, buffered_at, grace_period_deadline, created_at, served_at, completed_at, profiles:patient_id (full_name, phone_number, allergies, date_of_birth)'
          )
          .eq('queue_session_id', sessionData.id)
          .order('queue_number', { ascending: true });

        if (apptsData) {
          const items: AppointmentItem[] = apptsData.map((a) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const profile = (a as any).profiles;
            const isOnline = a.queue_number % 2 === 1;
            return {
              id: a.id,
              queue_number: a.queue_number,
              token_code:
                a.token_code ||
                (isOnline
                  ? `CN-ON${String(a.queue_number).padStart(3, '0')}`
                  : `CN-WK${String(a.queue_number).padStart(3, '0')}`),
              status: a.status,
              priority_category: a.priority_category || 'NONE',
              walk_in_name: a.walk_in_name,
              walk_in_phone: a.walk_in_phone,
              booking_channel: (a.booking_channel as 'ONLINE' | 'WALK_IN') || (isOnline ? 'ONLINE' : 'WALK_IN'),
              buffered_at: a.buffered_at,
              grace_period_deadline: a.grace_period_deadline,
              created_at: a.created_at,
              served_at: a.served_at,
              completed_at: a.completed_at,
              patient: profile || null,
            };
          });
          setAppointments(items);
        }
      } else {
        setSession(null);
        setAppointments([]);
      }
    } catch (err) {
      console.error('Error loading queue:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedRoom?.clinicId, doctor?.id]);

  useEffect(() => {
    fetchQueue();
    const channel: RealtimeChannel = supabase
      .channel('doctor-queue-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_sessions' }, fetchQueue)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchQueue)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchQueue, supabase]);

  // ── Launch Queue Session ──────────────────────────────────────────────────
  const handleStartSession = async () => {
    if (!selectedRoom?.clinicId || !doctor?.id) return;
    setIsStartingSession(true);
    try {
      const res = await fetch('/api/queue/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId: selectedRoom.clinicId,
          doctorId: doctor.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to launch session');
      setToastNotice({
        type: 'success',
        title: 'Session Started',
        message: `Queue session opened at ${selectedRoom.clinicName} (${selectedRoom.room}).`,
      });
      await fetchQueue();
      await refreshDoctorData();
    } catch (err: unknown) {
      setToastNotice({
        type: 'destructive',
        title: 'Launch Failed',
        message: err instanceof Error ? err.message : 'Could not launch session.',
      });
    } finally {
      setIsStartingSession(false);
    }
  };

  // ── Call specific patient now ─────────────────────────────────────────────
  const handleCallPatient = async (appt: AppointmentItem) => {
    if (!session) return;
    setActionLoadingId(appt.id);
    try {
      // 1. Complete currently serving if any
      const currentServing = appointments.find((a) => a.status === 'SERVING');
      if (currentServing) {
        await supabase
          .from('appointments')
          .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
          .eq('id', currentServing.id);
      }

      // 2. Mark this patient as SERVING
      await supabase
        .from('appointments')
        .update({ status: 'SERVING', served_at: new Date().toISOString() })
        .eq('id', appt.id);

      // 3. Update session's current serving number
      await supabase
        .from('queue_sessions')
        .update({ current_serving_number: appt.queue_number })
        .eq('id', session.id);

      setToastNotice({
        type: 'success',
        title: 'Patient Called',
        message: `Called ${appt.patient?.full_name || appt.walk_in_name || appt.token_code} (#${appt.queue_number}) into Cockpit.`,
      });
      await fetchQueue();
    } catch (err: unknown) {
      setToastNotice({
        type: 'destructive',
        title: 'Error Calling Patient',
        message: err instanceof Error ? err.message : 'Could not call patient.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Buffer Patient (45m Grace Period) ─────────────────────────────────────
  const handleBufferPatient = async (appointmentId: string) => {
    setActionLoadingId(appointmentId);
    try {
      const res = await fetch('/api/queue/buffer-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, reason: 'Sent for diagnostic labs/imaging' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to buffer patient');
      setToastNotice({
        type: 'brand',
        title: 'Patient Buffered',
        message: data.message || 'Patient moved to Buffer Lane (45m Grace Period).',
      });
      await fetchQueue();
    } catch (err: unknown) {
      setToastNotice({
        type: 'destructive',
        title: 'Buffer Error',
        message: err instanceof Error ? err.message : 'Could not buffer patient.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Restore Buffered Patient ──────────────────────────────────────────────
  const handleRestoreBuffered = async (appointmentId: string) => {
    if (!session) return;
    setActionLoadingId(appointmentId);
    try {
      const res = await fetch('/api/queue/restore-buffered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, queueSessionId: session.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore patient');
      setToastNotice({
        type: 'success',
        title: 'Patient Restored',
        message: data.message || 'Patient restored to active lineup.',
      });
      await fetchQueue();
    } catch (err: unknown) {
      setToastNotice({
        type: 'destructive',
        title: 'Restore Error',
        message: err instanceof Error ? err.message : 'Could not restore patient.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Skip Patient ──────────────────────────────────────────────────────────
  const handleSkipPatient = async (appointmentId: string) => {
    setActionLoadingId(appointmentId);
    try {
      const res = await fetch('/api/queue/skip-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, markNoShow: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to skip patient');
      setToastNotice({
        type: 'brand',
        title: 'Patient Skipped',
        message: data.message || 'Patient marked as skipped.',
      });
      await fetchQueue();
    } catch (err: unknown) {
      setToastNotice({
        type: 'destructive',
        title: 'Skip Error',
        message: err instanceof Error ? err.message : 'Could not skip patient.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Filtered Appointments ─────────────────────────────────────────────────
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      // Search
      const name = (appt.patient?.full_name || appt.walk_in_name || '').toLowerCase();
      const token = appt.token_code.toLowerCase();
      const matchesSearch = !searchQuery || name.includes(searchQuery.toLowerCase()) || token.includes(searchQuery.toLowerCase());

      // Channel
      const matchesChannel = channelFilter === 'ALL' || appt.booking_channel === channelFilter;

      // Status
      let matchesStatus = true;
      if (statusFilter === 'WAITING') matchesStatus = appt.status === 'WAITING' || appt.status === 'BOOKED';
      else if (statusFilter === 'SERVING') matchesStatus = appt.status === 'SERVING';
      else if (statusFilter === 'BUFFERED') matchesStatus = appt.status === 'BUFFERED';
      else if (statusFilter === 'COMPLETED') matchesStatus = appt.status === 'COMPLETED';
      else if (statusFilter === 'SKIPPED') matchesStatus = appt.status === 'SKIPPED' || appt.status === 'CANCELLED_NO_SHOW';

      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [appointments, searchQuery, channelFilter, statusFilter]);

  // Counts
  const totalCount = appointments.length;
  const servingCount = appointments.filter((a) => a.status === 'SERVING').length;
  const waitingCount = appointments.filter((a) => a.status === 'WAITING' || a.status === 'BOOKED').length;
  const bufferedCount = appointments.filter((a) => a.status === 'BUFFERED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
  const skippedCount = appointments.filter((a) => a.status === 'SKIPPED' || a.status === 'CANCELLED_NO_SHOW').length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastNotice && (
        <Alert variant={toastNotice.type === 'destructive' ? 'destructive' : toastNotice.type === 'brand' ? 'brand' : 'success'}>
          <div className="flex items-start justify-between w-full">
            <div>
              <AlertTitle>{toastNotice.title}</AlertTitle>
              <AlertDescription>{toastNotice.message}</AlertDescription>
            </div>
            <button
              onClick={() => setToastNotice(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 ml-4 shrink-0"
            >
              Dismiss
            </button>
          </div>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-600" />
            Today&apos;s Queue Manager
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Interleaved Lineup (Alternating Online 🌐 &amp; Walk-in 🚶) · Realtime Room Sync
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQueue}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Link href="/doctor/dashboard">
            <Button variant="brand" size="sm" className="text-xs">
              <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
              Open Cockpit
            </Button>
          </Link>
        </div>
      </div>

      {/* Session Launcher Card if no session today */}
      {!session && !loading && (
        <Card className="border-brand-200 bg-brand-50/50">
          <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
                <Play className="h-5 w-5 fill-current" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">No Active Queue Session for Today</h3>
                <p className="text-xs text-slate-500">
                  {selectedRoom
                    ? `Launch queue session for ${selectedRoom.clinicName} (${selectedRoom.room})`
                    : 'Select a clinic room from the top bar to open today\'s queue session.'}
                </p>
              </div>
            </div>
            <Button
              variant="brand"
              onClick={handleStartSession}
              disabled={isStartingSession || !selectedRoom}
              className="shrink-0"
            >
              {isStartingSession ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Play className="h-4 w-4 fill-current mr-1.5" />
              )}
              Start Today&apos;s Session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Registered</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
        </Card>
        <Card className="p-3.5 border-emerald-200 bg-emerald-50/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Now Serving</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">#{session?.current_serving_number || '—'}</p>
        </Card>
        <Card className="p-3.5 border-brand-200 bg-brand-50/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">Waiting in Line</p>
          <p className="text-2xl font-black text-brand-800 mt-1">{waitingCount}</p>
        </Card>
        <Card className="p-3.5 border-amber-200 bg-amber-50/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Buffer Lane (Labs)</p>
          <p className="text-2xl font-black text-amber-800 mt-1">{bufferedCount}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed</p>
          <p className="text-2xl font-black text-slate-700 mt-1">{completedCount}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Skipped / No-Show</p>
          <p className="text-2xl font-black text-slate-500 mt-1">{skippedCount}</p>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Lineup Queue Table</CardTitle>
              <CardDescription>
                Odd slots = Online reservation (GCash verified) · Even slots = Walk-in patient
              </CardDescription>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search token or patient..."
                  className="pl-8 text-xs h-9"
                />
              </div>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100 mt-3">
            {[
              { id: 'ALL', label: `All (${totalCount})` },
              { id: 'SERVING', label: `Serving (${servingCount})` },
              { id: 'WAITING', label: `Waiting (${waitingCount})` },
              { id: 'BUFFERED', label: `Buffer Lane (${bufferedCount})` },
              { id: 'COMPLETED', label: `Completed (${completedCount})` },
              { id: 'SKIPPED', label: `Skipped (${skippedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-brand-50 text-brand-900 border border-brand-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-1 text-xs">
              <span className="text-slate-400 font-medium">Channel:</span>
              <button
                type="button"
                onClick={() => setChannelFilter('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  channelFilter === 'ALL' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('ONLINE')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  channelFilter === 'ONLINE' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Online
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('WALK_IN')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  channelFilter === 'WALK_IN' ? 'bg-blue-100 text-blue-800' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Walk-in
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-100 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Queue #</th>
                  <th className="py-3 px-4">Token</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Priority / Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Users className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                      <p className="font-semibold">No appointments found</p>
                      <p className="text-[11px] mt-0.5">Adjust your filters or register patients at the desk.</p>
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((appt) => {
                    const patientName = appt.patient?.full_name || appt.walk_in_name || 'Registered Patient';
                    const phone = appt.patient?.phone_number || appt.walk_in_phone || '—';
                    const isServing = appt.status === 'SERVING';
                    const isBuffered = appt.status === 'BUFFERED';
                    const isWaiting = appt.status === 'WAITING' || appt.status === 'BOOKED';

                    return (
                      <tr
                        key={appt.id}
                        className={`transition-colors ${
                          isServing
                            ? 'bg-emerald-50/50 hover:bg-emerald-50'
                            : isBuffered
                            ? 'bg-amber-50/40 hover:bg-amber-50/60'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Queue # & Channel */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-7 w-7 rounded-lg flex items-center justify-center font-black text-xs ${
                                isServing
                                  ? 'bg-emerald-600 text-white'
                                  : isBuffered
                                  ? 'bg-amber-500 text-white'
                                  : appt.status === 'COMPLETED'
                                  ? 'bg-slate-100 text-slate-400'
                                  : 'bg-brand-50 text-brand-700'
                              }`}
                            >
                              #{appt.queue_number}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                appt.booking_channel === 'ONLINE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {appt.booking_channel === 'ONLINE' ? 'Online' : 'Walk-in'}
                            </span>
                          </div>
                        </td>

                        {/* Token Code */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          {appt.token_code}
                        </td>

                        {/* Patient Name */}
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{patientName}</p>
                          {appt.patient?.allergies && appt.patient.allergies.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-red-600 font-semibold mt-0.5">
                              ⚠️ Allergies: {appt.patient.allergies.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4 text-slate-500">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{phone}</span>
                          </div>
                        </td>

                        {/* Priority / Type */}
                        <td className="py-3.5 px-4">
                          {appt.priority_category !== 'NONE' ? (
                            <Badge variant="warning" className="text-[10px]">
                              {appt.priority_category} (20% Off)
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Regular</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              isServing
                                ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                                : isBuffered
                                ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                                : isWaiting
                                ? 'bg-blue-100 text-blue-800'
                                : appt.status === 'COMPLETED'
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {appt.status}
                          </span>
                          {isBuffered && appt.buffered_at && (
                            <p className="text-[9px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
                              <Clock className="h-2.5 w-2.5" />
                              Grace: 45m window
                            </p>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isWaiting && (
                              <>
                                <Button
                                  size="sm"
                                  variant="brand"
                                  onClick={() => handleCallPatient(appt)}
                                  disabled={actionLoadingId === appt.id}
                                  className="h-7 text-xs px-2.5"
                                >
                                  <Play className="h-3 w-3 mr-1 fill-current" />
                                  Call
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleBufferPatient(appt.id)}
                                  disabled={actionLoadingId === appt.id}
                                  className="h-7 text-xs px-2 text-amber-700 border-amber-200 hover:bg-amber-50"
                                  title="Buffer for lab tests"
                                >
                                  <Activity className="h-3 w-3 mr-1" />
                                  Buffer
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSkipPatient(appt.id)}
                                  disabled={actionLoadingId === appt.id}
                                  className="h-7 text-xs px-2 text-slate-400 hover:text-red-600"
                                  title="Skip patient"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            )}

                            {isBuffered && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestoreBuffered(appt.id)}
                                disabled={actionLoadingId === appt.id}
                                className="h-7 text-xs px-2.5 border-amber-300 text-amber-800 hover:bg-amber-50"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Recall to Lineup
                              </Button>
                            )}

                            {isServing && (
                              <Link href="/doctor/dashboard">
                                <Button size="sm" variant="brand" className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700">
                                  <Stethoscope className="h-3 w-3 mr-1" />
                                  Active in Cockpit
                                </Button>
                              </Link>
                            )}

                            {appt.status === 'COMPLETED' && (
                              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Done
                              </span>
                            )}

                            {(appt.status === 'SKIPPED' || appt.status === 'CANCELLED_NO_SHOW') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestoreBuffered(appt.id)}
                                disabled={actionLoadingId === appt.id}
                                className="h-7 text-xs px-2 text-slate-600"
                                title="Restore to waiting queue"
                              >
                                Re-queue
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
